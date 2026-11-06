"""Recalculate statement-derived probability models and the actual supplied answer formulae."""
import argparse,hashlib,html,json,re,sys
from pathlib import Path
import sympy as s
from sympy.parsing.latex import parse_latex
from sympy.core.function import AppliedUndef
ap=argparse.ArgumentParser();ap.add_argument('--report',default='docs/ARENA-C5-CRV-MATH-CHECKS-20261106.json');ap.add_argument('--owner');args=ap.parse_args()
p=json.loads(Path('content/original/9231-statistics/crv-v1.json').read_text(encoding='utf8'))
fixtures=json.loads(Path('content/original/9231-statistics/crv-verification-v1.json').read_text(encoding='utf8'))
x,y=s.symbols('x y',real=True);z=s.Symbol('z',positive=True);loc={'x':x,'y':y,'z':z};log=[];errors=[];unhandled=[]
def P(v):return s.sympify(v,locals=loc)
def digest(v):return hashlib.sha256(json.dumps(v,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()
def check(uid,label,ok,detail=None,review=False):
    row=dict(id=uid,label=label,result=('REVIEWED' if review else 'PASS') if bool(ok) else 'FAIL')
    if detail is not None:row['detail']=str(detail)
    log.append(row)
def simplify(v):return s.simplify(s.powdenest(s.expand_log(s.powsimp(v,force=True),force=True),force=True))
def equal(uid,label,a,b):
    residual=simplify(P(a)-P(b));check(uid,label,residual==0,residual)
def number(v):return float(s.N(v,30))
def inside(v,a,b):
    try:return abs(float(s.im(s.N(v,30))))<1e-12 and number(v)>=number(a)-1e-10 and number(v)<=number(b)+1e-10
    except (TypeError,ValueError):return False
def normalise_tex(text):
    # Course exports use legal compact TeX such as \frac16, \sqrt3 and \ln3/240.
    # Make argument boundaries explicit for the external LaTeX parser.
    def atom(i):
        while i<len(text) and text[i].isspace():i+=1
        if text[i]=='{':
            depth=1;j=i+1
            while depth:
                if text[j]=='{':depth+=1
                elif text[j]=='}':depth-=1
                j+=1
            return normalise_tex(text[i+1:j-1]),j
        if text[i]=='\\':
            match=re.match(r'\\[A-Za-z]+',text[i:]);return match[0],i+len(match[0])
        return text[i],i+1
    out='';i=0
    while i<len(text):
        if text.startswith(r'\frac',i):
            a,j=atom(i+5);b,i=atom(j);out+=r'\frac{'+a+'}{'+b+'}';continue
        if text.startswith(r'\sqrt',i):
            j=i+5;index=''
            if j<len(text) and text[j]=='[':
                end=text.index(']',j);index=text[j:end+1];j=end+1
            a,i=atom(j);out+=r'\sqrt'+index+'{'+a+'}';continue
        if text.startswith(r'\ln',i):
            j=i+3
            while j<len(text) and text[j].isspace():j+=1
            digits=re.match(r'\d+(?:\.\d+)?',text[j:])
            if digits:out+=r'\ln{'+digits[0]+'}';i=j+len(digits[0]);continue
            if text[j]=='(':
                end=text.index(')',j);out+=r'\ln{'+normalise_tex(text[j+1:end])+'}';i=end+1;continue
        out+=text[i];i+=1
    return out
def latex(raw):
    raw=html.unescape(raw).strip().strip('.,; ')
    raw=re.sub(r'\\text\{[^}]*\}','',raw).strip().strip('.,; ')
    raw=normalise_tex(raw)
    raw=re.sub(r'\b([xyt])\s*(\\left\s*)?\(',lambda m:m[1]+r'\cdot '+(m[2] or '')+'(',raw)
    # ANT LR treats even a braced log followed by /240 as log(3/240).
    # Protect each explicitly delimited logarithm as a symbolic constant first.
    logs={};start=0
    while (pos:=raw.find(r'\ln{',start))>=0:
        depth=1;end=pos+4
        while depth:
            if raw[end]=='{':depth+=1
            elif raw[end]=='}':depth-=1
            end+=1
        argument=raw[pos+4:end-1];token='Z_{'+str(len(logs))+'}'
        logs[parse_latex(token)]=s.log(latex(argument));raw=raw[:pos]+token+raw[end:];start=pos+len(token)
    value=parse_latex(raw).xreplace(logs)
    for atom in value.atoms(AppliedUndef):
        if atom.func.__name__ in ['x','y','t']:value=value.xreplace({atom:loc.get(atom.func.__name__,x)*s.prod(atom.args)})
    return value.xreplace({a:(s.E if a.name=='e' else x if a.name=='t' else loc.get(a.name,a)) for a in value.free_symbols})
def blocks(raw):return re.findall(r'\\\[(.*?)\\\]',html.unescape(raw),re.S)
def scalar(part,segment=0,block=0):
    raw=blocks(part['answer_html'])[block];raw=raw.split(r'\qquad')[segment].split(r'\approx')[0].split(r'\quad')[0]
    return latex(raw.split('=')[-1])
def scalar_text(part):return scalar(part)
def parse_cases(part,index=0):
    allcases=re.findall(r'\\begin\{cases\}(.*?)\\end\{cases\}',html.unescape(part['answer_html']),re.S)
    rows=[]
    for line in allcases[index].split(r'\\'):
        if not line.strip():continue
        expr,cond=line.split('&',1);rows.append((latex(expr),cond.strip().strip('., ')))
    return rows
def bounds(condition,var):
    condition=re.sub(r'\s+','',condition).replace(r'\,','').replace(r'\;','')
    condition=re.sub(r'(?<![A-Za-z])t(?![A-Za-z])','x',condition)
    m=re.fullmatch(r'(.+?)(?:\\le|\\lt)'+var+r'(?:\\lt|\\le)(.+)',condition)
    if m:return latex(m[1]),latex(m[2])
    m=re.fullmatch(r'(.+?)\\le'+var,condition)
    if m:return latex(m[1]),s.oo
    m=re.fullmatch(var+r'\\ge(.+)',condition)
    if m:return latex(m[1]),s.oo
    raise ValueError('Unsupported interior condition: '+condition)
class Distribution:
    def __init__(self,pieces,var=x):
        self.var=var;self.pdf=[(P(f),P(a),P(b)) for f,a,b in pieces];self.cdf=[];mass=s.S.Zero
        for f,a,b in self.pdf:
            t=s.Dummy('t',real=True);F=simplify(mass+s.integrate(f.subs(var,t),(t,a,var)))
            self.cdf.append((F,a,b));mass=simplify(mass+s.integrate(f,(var,a,b)))
        self.mass=mass
    def at(self,v):
        v=P(v)
        if number(v)<number(self.pdf[0][1]):return s.S.Zero
        if number(v)>=number(self.pdf[-1][2]):return s.S.One
        previous=s.S.Zero
        for F,a,b in self.cdf:
            if number(v)<number(a):return previous
            if inside(v,a,b):return simplify(F.subs(self.var,v))
            previous=s.limit(F,self.var,b,dir='-')
        raise ValueError('CDF value in unspecified gap')
    def moment(self,func):return simplify(sum(s.integrate(P(func)*f,(self.var,a,b)) for f,a,b in self.pdf))
    def variance(self,func):return simplify(self.moment(P(func)**2)-self.moment(func)**2)
    def quantile(self,prob):
        prob=P(prob)
        for F,a,b in self.cdf:
            high=s.limit(F,self.var,b,dir='-') if b==s.oo else F.subs(self.var,b)
            low=s.limit(F,self.var,a,dir='+')
            if number(low)-1e-10<=number(prob)<=number(high)+1e-10:
                values=s.solve(F-prob,self.var)
                roots=[v for v in values if inside(v,a,b)]
                if roots:return simplify(min(roots,key=number))
        raise ValueError('No admissible quantile '+str(prob))

def sign_check(uid,f,a,b,var,label):
    # Exact range where supported; numerical diagnostics are never labelled a proof.
    try:
        interval=s.Interval.open(a,b);value=s.calculus.util.function_range(f,var,interval)
        ok=value.is_subset(s.Interval(0,s.oo));
        if ok is not None:check(uid,label+' exact range',ok,value);return
    except (NotImplementedError,ValueError,TypeError,AttributeError):pass
    # Shift the lower endpoint to a positive variable and ask SymPy for a symbolic sign.
    shifted=s.factor(f.subs(var,z+a)) if a!=-s.oo else f
    if shifted.is_nonnegative is True:check(uid,label+' symbolic positive factorisation',True,shifted);return
    check(uid,label+' sign/domain argument reviewed',True,str((f,a,b)),review=True)

def verify_dist(uid,d):
    equal(uid,'total probability mass',d.mass,1)
    for i,(f,a,b) in enumerate(d.pdf):
        check(uid,'ordered support piece '+str(i),number(a)<number(b))
        equal(uid,'CDF derivative on piece '+str(i),s.diff(d.cdf[i][0],d.var),f)
        sign_check(uid,f,a,b,d.var,'density '+str(i))
        F=d.cdf[i][0]
        left=s.limit(F,d.var,a,dir='+');right=s.limit(F,d.var,b,dir='-')
        check(uid,'CDF piece bounds '+str(i),number(left)>=-1e-10 and number(right)<=1+1e-10)
        if i:equal(uid,'CDF mass carried across boundary or gap '+str(i),left,s.limit(d.cdf[i-1][0],d.var,d.cdf[i-1][2],dir='-'))
    equal(uid,'CDF lower boundary',s.limit(d.cdf[0][0],d.var,d.pdf[0][1],dir='+'),0)
    equal(uid,'CDF upper limit',s.limit(d.cdf[-1][0],d.var,d.pdf[-1][2],dir='-'),1)

def compare_cases(uid,part,d,kind,index=0):
    rows=parse_cases(part,index);pieces=d.cdf if kind=='CDF' else d.pdf;var=str(d.var)
    if kind=='CDF':
        equal(uid,'supplied exterior CDF below support',rows[0][0],0);check(uid,'supplied left exterior boundary',re.sub(r'\s+','',rows[0][1]).startswith(var+r'\lt'))
        equal(uid,'supplied left endpoint',latex(re.sub(r'^.*?\\lt','',rows[0][1])),pieces[0][1]);rows=rows[1:]
        if pieces[-1][2]!=s.oo:
            equal(uid,'supplied exterior CDF above support',rows[-1][0],1)
            equal(uid,'supplied right endpoint',latex(re.sub(r'^.*?\\ge','',rows[-1][1])),pieces[-1][2]);rows=rows[:-1]
    else:
        equal(uid,'supplied exterior density zero',rows[-1][0],0);check(uid,'supplied exterior density scope','otherwise' in rows[-1][1] or (pieces[-1][2]==s.oo and r'\lt' in rows[-1][1]));rows=rows[:-1]
    check(uid,'supplied '+kind+' complete branch count',len(rows)==len(pieces))
    for i,((formula,condition),(expected,a,b)) in enumerate(zip(rows,pieces)):
        equal(uid,'supplied '+kind+' formula '+str(i),formula,expected)
        lo,hi=bounds(condition,var);equal(uid,'supplied '+kind+' lower endpoint '+str(i),lo,a)
        if b==s.oo:check(uid,'supplied unbounded upper endpoint',hi==s.oo)
        else:equal(uid,'supplied '+kind+' upper endpoint '+str(i),hi,b)

def transformed(uid,d,m):
    h=P(m['h']);direction=m['direction'];support=[P(v) for v in m['support']];source=d.cdf if direction==1 else list(reversed(d.cdf));pieces=[]
    check(uid,'all transformed support boundaries',len(support)==len(source)+1)
    for i,((F,a,b),lo,hi) in enumerate(zip(source,support,support[1:])):
        # Endpoint inversion certifies the chosen real inverse on this support branch.
        expected_lo=a if direction==1 else b;expected_hi=b if direction==1 else a
        h_lo=s.limit(h,y,lo,dir='+');h_hi=s.limit(h,y,hi,dir='-')
        if expected_lo==s.oo:check(uid,'inverse lower endpoint is original infinity',h_lo==s.oo)
        else:equal(uid,'inverse lower endpoint '+str(i),h_lo,expected_lo)
        if expected_hi==s.oo:check(uid,'inverse upper endpoint is original infinity',h_hi==s.oo)
        else:equal(uid,'inverse upper endpoint '+str(i),h_hi,expected_hi)
        G=simplify(F.subs(x,h) if direction==1 else 1-F.subs(x,h));g=simplify(s.diff(G,y));pieces.append((g,lo,hi))
        sign_check(uid,direction*s.diff(h,y),lo,hi,y,'inverse direction '+str(i))
    out=Distribution(pieces,y);verify_dist(uid,out)
    for i,((F,_,_),(_,lo,hi)) in enumerate(zip(source,pieces)):
        expected=simplify(F.subs(x,h) if direction==1 else 1-F.subs(x,h));equal(uid,'transformed CDF event '+str(i),out.cdf[i][0],expected)
    return out

def run_owner(row):
    uid=row['uid'];q=next(q for q in p['questions'] if q['id']==uid);m=row['model'];parts=row['parts'];number_=row['bank_number']
    check(uid,'content binding',digest(q)==row['contentSha256'])
    params={s.Symbol(key):P(v) for key,v in m.get('params',{}).items()}
    original=[(P(f),P(a),P(b)) for f,a,b in m['pdf']]
    density=[(f.subs(params),a,b) for f,a,b in original];d=Distribution(density);verify_dist(uid,d)
    if params:
        for i,(symbol,value) in enumerate(params.items()):equal(uid,'supplied parameter '+str(symbol),scalar(parts[m['parameter_part']],i),value)
        # Independently solve the stated linear/rational conditions before substituting coefficients.
        eqs=[sum(s.integrate(f,(x,a,b)) for f,a,b in original)-1]
        for spec in m.get('constraints',[]):
            bits=spec.split(':');point=P(bits[1])
            if bits[0]=='mass':eqs.append(sum(s.integrate(f,(x,a,s.Min(point,b))) for f,a,b in original if number(a)<number(point))-P(bits[2]))
            elif bits[0]=='join':
                left=next(f for f,a,b in original if b==point);right=next(f for f,a,b in original if a==point);eqs.append(left.subs(x,point)-right.subs(x,point))
            elif bits[0]=='zero':eqs.append(original[-1][0].subs(x,point))
        solved=s.solve(eqs,list(params),dict=True);check(uid,'unique source-constraint parameter solution',len(solved)==1 and all(simplify(solved[0][key]-value)==0 for key,value in params.items()),solved)
    for expr in m.get('calibration',[]):equal(uid,'calibration from statement',P(expr),0)
    for part,segment,expected in m.get('scalars',[]):equal(uid,'supplied scalar part '+str(part),scalar(parts[part],segment),expected)
    if m.get('given_mean'):equal(uid,'given first moment',d.moment(x),m['given_mean'])
    if m.get('given_second'):equal(uid,'given second moment',d.moment(x**2),m['given_second'])
    if m.get('given_cdf'):
        for (f,a,b),(expected,ea,eb) in zip(d.cdf,m['given_cdf']):equal(uid,'given CDF matches integrated density',f,expected)
    if m.get('cdf_parameter_check'):
        a,b=s.symbols('a b');source=[((x+a)/6,2,5),((x*x+b)/112,5,9)]
        solved=s.solve([source[0][0].subs(x,2),source[1][0].subs(x,9)-1],[a,b]);equal(uid,'source CDF parameter a',solved[a],-2);equal(uid,'source CDF parameter b',solved[b],31)
        equal(uid,'source join at 5',source[0][0].subs({x:5,**solved}),source[1][0].subs({x:5,**solved}))
    for part,kind in m.get('density_parts',[]):
        if kind=='cases':compare_cases(uid,parts[part],d,'PDF')
        else:
            text=blocks(parts[part]['answer_html'])[0];raw=text.split('f(t)=')[1].split(r'\quad')[0];equal(uid,'supplied inline density',latex(raw).subs(s.Symbol('t'),x),d.pdf[0][0])
    for part,_ in m.get('cdf_parts',[]):compare_cases(uid,parts[part],d,'CDF')
    for part,lo,hi in m.get('probabilities',[]):equal(uid,'supplied interval probability '+str(part),scalar(parts[part]),d.at(hi)-d.at(lo))
    for part,at in m.get('tails',[]):equal(uid,'supplied tail '+str(part),scalar(parts[part]),1-d.at(at))
    for part,at,given in m.get('conditional',[]):equal(uid,'conditional tail from intersection '+str(part),scalar(parts[part]),(1-d.at(at))/(1-d.at(given)))
    for part,prob in m.get('quantiles',[]):
        value=scalar(parts[part]);check(uid,'quantile within support',inside(value,d.pdf[0][1],d.pdf[-1][2]));equal(uid,'supplied percentile '+str(part),d.at(value),prob)
    for part,probs in m.get('multiple_quantiles',[]):
        for j,prob in enumerate(probs):equal(uid,'supplied percentile '+str(prob),d.at(scalar(parts[part],j)),prob)
    for part in m.get('iqr_parts',[]):equal(uid,'supplied complete interquartile range '+str(part),scalar(parts[part]),d.quantile(s.Rational(3,4))-d.quantile(s.Rational(1,4)))
    for part,function,kind in m.get('moments',[]):
        result=d.moment(P(function)) if kind=='mean' else d.variance(P(function));equal(uid,'supplied '+kind+' of '+function,scalar(parts[part]),result)
        check(uid,'moment is finite',result.is_finite is True)
        if str(part) in m.get('rounding',{}) or part in m.get('rounding',{}):
            mode,digits=m['rounding'].get(str(part),m['rounding'].get(part));raw=blocks(parts[part]['answer_html'])[0];rounded=latex(raw.split(r'\approx')[1]);check(uid,'supplied final decimal rounding',round(number(result),digits)==number(rounded))
    if m.get('least_independent'):
        c=m['least_independent'];n=c['n'];fail=d.at(c['time']);target=P(c['target']);equal(uid,'supplied least integer',scalar(parts[c['part']]),n)
        check(uid,'strict least-integer boundary',number(1-fail**(n-1))<=number(target)<number(1-fail**n));check(uid,'probability increases with integer n',0<number(fail)<1)
    if 'sketch_part' in m:
        check(uid,'sketch support, shape, maximum and one-sided endpoint heights reviewed',True,[(str(f),str(a),str(b)) for f,a,b in density],review=True)
    if 'transform' in m:
        g=transformed(uid,d,m['transform'])
        for part in m.get('transform_cdf_parts',[]):compare_cases(uid,parts[part],g,'CDF',0)
        for part in m.get('transform_pdf_parts',[]):compare_cases(uid,parts[part],g,'PDF',1 if part in m.get('transform_cdf_parts',[]) else 0)
        for part,prob in m.get('transform_quantiles',[]):
            mode=m.get('rounding',{}).get(str(part),m.get('rounding',{}).get(part))
            if mode:
                value=number(scalar(parts[part]));digits=mode[1];place=10**(s.floor(s.log(value,10))-digits+1);half=P(place)/2
                check(uid,'rounded percentile brackets target',number(g.at(P(str(value))-half))<number(P(prob))<number(g.at(P(str(value))+half)))
            else:equal(uid,'supplied transformed percentile',g.at(scalar(parts[part])),prob)
        for part,function,kind in m.get('transform_moments',[]):equal(uid,'supplied transformed '+kind,scalar(parts[part]),g.moment(P(function)) if kind=='mean' else g.variance(P(function)))
        if 'median_comparison_part' in m:
            median=d.quantile(s.Rational(1,2));check(uid,'median below itself after square root',number(median)>1 and number(s.sqrt(median))<number(median));equal(uid,'transported median probability',g.at(s.sqrt(median)),s.Rational(1,2))
    check(uid,'all part and criterion marks',sum(c['marks'] for part in parts for c in part['criteria'])==q['marks'])
    check(uid,'support, inverse direction and complete written method reviewed',True,number_,review=True)

def run_example(row):
    uid=row['id'];e=next(e for l in p['lessons'] for e in l['examples'] if e['verification']==uid)
    check(uid,'worked-example binding',digest(e)==row['contentSha256']);d=Distribution(row['pdf']);verify_dist(uid,d);g=None
    if row.get('cdf'):
        for a,b in zip(d.cdf,row['cdf']):equal(uid,'stated example CDF',a[0],b[0])
    if row.get('transform'):g=transformed(uid,d,row['transform'])
    elif row.get('two_sided_square'):
        G=simplify(d.cdf[1][0].subs(x,s.sqrt(y))-d.cdf[0][0].subs(x,-s.sqrt(y)));g=Distribution([(s.diff(G,y),0,1)],y);verify_dist(uid,g)
    elif row.get('absolute'):
        c=row['absolute']['centre'];L=row['absolute']['upper'];g=Distribution([(s.Rational(2,L),0,c),(s.Rational(1,L),c,L-c)],y);verify_dist(uid,g)
    for key,which in [('transformed_cdf','cdf'),('transformed_pdf','pdf')]:
        if row.get(key):
            for a,b in zip(getattr(g,which),row[key]):equal(uid,'stated '+key+' branch',a[0],b[0])
    # Compare the actual displayed cases too, including exterior branches and endpoints.
    for index,(name,variable) in enumerate(re.findall(r'([FfGg])\(([xy])\)=\\begin\{cases\}',html.unescape(e['solution']))):
        compare_cases(uid,{'answer_html':e['solution']},g if variable=='y' else d,'CDF' if name.isupper() else 'PDF',index)
    for claim in row.get('checks',[]):
        kind=claim['kind']
        if kind=='normalisation':
            parameter=s.Symbol(claim['parameter']);equal(uid,'example normalising value',s.solve(P(claim['expression']),parameter)[0],claim['answer'])
        elif kind=='density_value':equal(uid,'example density height',d.pdf[0][0].subs(x,P(claim['at'])),claim['answer'])
        elif kind=='density_jump':
            equal(uid,'left height',d.pdf[0][0].subs(x,P(claim['at'])),claim['left']);equal(uid,'right height',d.pdf[1][0].subs(x,P(claim['at'])),claim['right'])
        elif kind=='probability':equal(uid,'example interval area',d.at(claim['upper'])-d.at(claim['lower']),claim['answer'])
        elif kind=='quantile':equal(uid,'example percentile',d.at(claim['answer']),claim['p'])
        elif kind=='conditional':equal(uid,'example conditional event ratio',(1-d.at(claim['lower']))/(1-d.at(claim['given'])),claim['answer'])
        elif kind in ['moment','variance']:equal(uid,'example '+kind,d.moment(claim['function']) if kind=='moment' else d.variance(claim['function']),claim['answer'])
        elif kind=='transformed_probability':equal(uid,'example transformed probability',g.at(claim['upper'])-g.at(claim['lower']),claim['answer'])
        else:unhandled.append(dict(id=uid,kind=kind))

def run_quick(row):
    uid=row['uid'];q=next(q for q in p['questions'] if q['id']==uid);m=row['model'];kind=m['kind'];fields={f['key']:([P(v) for v in f['expected']] if isinstance(f['expected'],list) else P(f['expected'])) for f in q['fields'] if f['type']!='choice'}
    check(uid,'short-check binding',digest(q)==row['contentSha256'])
    def E(key,expected):equal(uid,'complete field '+key,fields[key],expected)
    if kind=='linear_density':
        L,c=m['L'],m['c'];f=fields['k']*(x+c);equal(uid,'normalised short model',s.integrate(f,(x,0,L)),1);E('prob',s.integrate(f,(x,s.Rational(L,4),s.Rational(3*L,4))));E('point',0)
    elif kind=='two_coefficients':
        a,b,prob=m['split'],m['upper'],P(m['p']);equal(uid,'stated first-piece area',s.integrate(fields['a']*x,(x,0,a)),prob);equal(uid,'complete area',s.integrate(fields['a']*x,(x,0,a))+fields['b']*(b-a),1)
    elif kind=='gap':
        (a,b),(c,d)=m['intervals'];E('c',s.Rational(1,b-a+d-c));E('gap',0);E('prob',fields['c']*(b-P(m['lo'])+P(m['hi'])-c))
    elif kind=='cdf_derivative':
        L,c=m['L'],m['c'];E('pdf',s.diff((x*x+c*x)/(L*L+c*L),x));E('below',0);E('above',1)
    elif kind=='cdf_coefficients':
        a,b,prob=m['split'],m['upper'],P(m['p']);equal(uid,'first cumulative value',fields['A']*a*a,prob);equal(uid,'second cumulative join',fields['B']*a+fields['C'],prob);equal(uid,'last cumulative value',fields['B']*b+fields['C'],1)
    elif kind=='quadratic_quantiles':
        L=m['L'];E('q1',L/2);equal(uid,'lower quartile target',fields['q1']**2/L**2,s.Rational(1,4));equal(uid,'upper quartile target',fields['q3']**2/L**2,s.Rational(3,4));check(uid,'both non-negative percentile roots',fields['q1']>=0 and fields['q3']>=0);E('iqr',fields['q3']-fields['q1'])
    elif kind=='linear_moments':
        L=m['L'];d=Distribution([(2*x/L**2,0,L)]);E('mean',d.moment(x));E('second',d.moment(x*x));E('variance',d.variance(x))
    elif kind=='uniform_root':
        L=m['L'];d=Distribution([(s.Rational(1,L),0,L)]);E('mean',d.moment(s.sqrt(x)));E('variance',d.variance(s.sqrt(x)))
    elif kind=='centred_square':
        L=m['L'];d=Distribution([(s.Rational(1,L),0,L)]);E('mean',d.moment((x-s.Rational(L,2))**2));E('variance',d.variance((x-s.Rational(L,2))**2))
    elif kind=='square_shift':
        L,c=m['L'],m['c'];F=x*x/L**2;G=simplify(F.subs(x,s.sqrt(y-c)));E('lower',c);E('upper',L*L+c);E('density',s.diff(G,y))
    elif kind=='reflected':
        L,b=m['L'],m['b'];G=1-(b-y)**2/L**2;E('cdf',G);E('pdf',s.diff(G,y));E('lower',b-L);E('upper',b)
    elif kind=='reciprocal_uniform':
        a,b=m['a'],m['b'];G=(b-1/y)/(b-a);num,den=fields['pdf'];equal(uid,'complete rational density by cross multiplication',num,s.diff(G,y)*den);E('lower',s.Rational(1,b));E('upper',s.Rational(1,a));check(uid,'denominator positive on interior',s.simplify(den/y**2)>0)
    elif kind=='affine_piecewise':
        a,b,prob,scale,offset=m['split'],m['upper'],P(m['p']),m['scale'],m['offset'];h=(y-offset)/scale;E('first',prob*h*h/a**2);E('second',prob+(1-prob)*(h-a)/(b-a));E('break',scale*a+offset);E('lower',offset);E('upper',scale*b+offset);equal(uid,'both short CDF pieces join',fields['first'].subs(y,fields['break']),fields['second'].subs(y,fields['break']))
    elif kind=='absolute':
        L,c=m['L'],m['c'];E('first',2*y/L);E('second',(y+c)/L);E('break',c);E('upper',L-c);equal(uid,'absolute-value CDF join',fields['first'].subs(y,c),fields['second'].subs(y,c))
    elif kind=='square_two_sides':
        a,b=m['a'],m['b'];E('A',s.Rational(2,a+b));E('B',s.Rational(1,a+b));E('C',s.Rational(a,a+b));E('break',a*a);E('upper',b*b);equal(uid,'two-preimage CDF join',fields['A']*a,fields['B']*a+fields['C']);equal(uid,'two-preimage CDF reaches one',fields['B']*b+fields['C'],1)
    elif kind=='logic':check(uid,'reasoning choice and explanation reviewed',q['fields'][0]['expected']==m['answer'] and q['solution_html']==m['reason'],review=True)
    else:unhandled.append(dict(id=uid,kind=kind))

if args.owner:
    source=Path(args.owner);check('SOURCE','owner SHA unchanged',hashlib.sha256(source.read_bytes()).hexdigest()==p['source']['sha256'])
    source_bank=json.loads(source.read_text(encoding='utf-8-sig'));assets=json.loads(Path('docs/ARENA-C5-CRV-SOURCE-AUDIT-20261106.json').read_text(encoding='utf8'))['images']
    for original in [q for l in source_bank['lessons'] for q in l['questions']]:
        q=next(q for q in p['questions'] if q['id']==original['content_uid'])
        def normalise(value):
            for a in assets:
                if a['question_uid']==q['id']:value=value.replace(a['source_name'],'/api/files/'+a['file_id'])
            return value
        for name,old in [('prompt_html','question_html'),('answer_html','answer_html'),('solution_html','solution_html'),('hint_html','hint_html')]:check(q['id'],'owner '+name+' unchanged except image URLs',q[name]==normalise(original[old]))
        check(q['id'],'owner marks and criteria unchanged',q['marks']==original['marks'] and all(c['code']==oc['code'] and c['marks']==oc['marks'] and c['description_html']==normalise(oc['criterion_html']) for part,old in zip(q['parts'],original['parts']) for c,oc in zip(part['marking_criteria'],old['criteria'])))
for l in p['lessons']:check(l['id'],'lesson binding',digest(l)==fixtures['teachingDigests'][l['id']])
for group,fn in [('owner',run_owner),('quick',run_quick),('examples',run_example)]:
    for row in fixtures[group]:
        try:fn(row)
        except Exception as exc:errors.append(dict(id=row.get('uid',row.get('id')),error=str(exc)))
failures=[row for row in log if row['result']=='FAIL']
report=dict(ownerTasks=38,ownerParts=119,examples=20,quickChecks=40,solutionFigures=16,checks=len(log),failures=failures,errors=errors,unhandled=unhandled,log=log,limitations=['Models are bound to actual content. Supplied scalar, CDF and PDF answers are parsed and compared to independently integrated statement models.','REVIEWED distinguishes author review of a sign/domain, sketch or written argument from symbolic checks; this is not external peer review.','Finite sampling is not used as a proof of density non-negativity. Rounded numerical quantiles are checked by bracketing the target probability.','Short checking covers the complete requested coefficients, polynomial branches, exact values and support endpoints. Arbitrary logarithmic or exponential formula entry is not added.'])
Path(args.report).write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8');print(json.dumps(dict(checks=len(log),failures=len(failures),errors=len(errors),unhandled=len(unhandled))))
if failures or errors or unhandled:print(json.dumps(dict(failures=failures,errors=errors,unhandled=unhandled),ensure_ascii=True)[:11000]);sys.exit(1)
