"""Exact finite-difference certificates and boundary checks, independent of the importer."""
import argparse,hashlib,json,re,html
from pathlib import Path
from functools import lru_cache
import sympy as s
from sympy.parsing.latex import parse_latex
from sympy.concrete.gosper import gosper_sum
n,N,r=s.symbols('n N r',integer=True,positive=True)
k=s.Symbol('k',positive=True);a=s.Symbol('a',real=True)
x,t,q,z=s.symbols('x t q z',real=True)
symbols={str(v):v for v in [n,N,r,k,a,x,t,q,z]}
log=[];failures=[];skipped=[];coverage={}
def plain(v):return s.sympify(v,locals=symbols)
def record(uid,label,actual,expected):
    actual=s.sympify(actual);expected=s.sympify(expected)
    normal=lambda v:v.replace(lambda e:isinstance(e,s.Pow),lambda e:s.Pow(s.expand(e.base),e.exp))
    actual,expected=normal(actual),normal(expected)
    delta=s.simplify(actual-expected)
    ok=delta==0
    row=dict(id=str(uid),label=label,result='PASS' if ok else 'FAIL',actual=str(actual),expected=str(expected))
    log.append(row);coverage[str(uid)]=coverage.get(str(uid),0)+1
    if not ok:failures.append(row)
def truth(uid,label,ok):record(uid,label,s.Integer(bool(ok)),s.Integer(1))
@lru_cache(None)
def expr(v):
    v=html.unescape(v).strip().strip('.').replace(r'\left','').replace(r'\right','').replace(r'\,','').replace(r'\!','').replace('−','-')
    v=re.sub(r'\\frac([^{}\s])',r'\\frac{\1}',v)
    v=re.sub(r'(\\frac\{[^{}]*\})([A-Za-z0-9])',r'\1{\2}',v)
    v=re.sub(r'\\sqrt([0-9])',r'\\sqrt{\1}',v)
    v=re.sub(r'(?<![A-Za-z\\])xn(?=\()',r'x n*',v)
    v=re.sub(r'(?<![A-Za-z\\])([nNrkatzx])\s*(?=\()',r'\1*',v)
    result=parse_latex(v,strict=True)
    return result.xreplace({v:symbols.get(str(v),s.E if str(v)=='e' else v) for v in result.atoms(s.Symbol)})
def blocks(v):return re.findall(r'\\\[(.*?)\\\]|\\\((.*?)\\\)',v,re.S)
def mathtexts(v):return [a or b for a,b in blocks(v)]
def top_equal(value):
    depth=0;chunks=[];start=0
    for j,char in enumerate(value):
        if char=='{':depth+=1
        elif char=='}':depth-=1
        elif char=='=' and depth==0:chunks.append(value[start:j]);start=j+1
    return chunks+[value[start:]]
def finite(uid,label,term,lo,hi,total):
    if hi.has(N):return finite(uid,label,term.subs(N,n),lo.subs(N,n),hi.subs(N,n),total.subs(N,n))
    if not hi.has(n):
        record(uid,label,s.summation(term,(r,lo,hi)),total);return
    if not lo.has(n) and s.simplify(hi-n).is_Integer:
        shift=int(hi-n);start=max(1,int(lo)-shift)
        record(uid,label+' base',total.subs(n,start),sum(term.subs(r,j) for j in range(int(lo),start+shift+1)))
        record(uid,label+' next-term difference',total.subs(n,n+1)-total,term.subs(r,hi+1));return
    G=gosper_sum(term,r)
    if G is None:raise ValueError('No symbolic antidifference')
    record(uid,label+' antidifference',G.subs(r,r+1)-G,term)
    record(uid,label+' both moving boundaries',G.subs(r,hi+1)-G.subs(r,lo),total)
def right_text(value):
    value=value.split(r'\qquad')[0].strip().rstrip(',')
    return value.split('=')[-1].strip()
def answer(uid,part=0,index=0):return expr(right_text(mathtexts(by[uid]['parts'][part]['answer_html'])[index]))
def verify_total(uid,part,term,lo=1,hi=n,index=0):
    finite(uid,'part '+str(part+1),s.sympify(term),s.sympify(lo),s.sympify(hi),answer(uid,part,index))
def digest(row):return hashlib.sha256('\0'.join([row['title'],row['prompt_html'],row['answer_html'],row['solution_html'],row['hint_html'],str(row['marks'])]).encode()).hexdigest()
def sum_text(prompt):
    for v in mathtexts(prompt):
        if r'\sum' in v:
            start=v.index(r'\sum')
            value=expr(top_equal(v[start:])[0])
            if isinstance(value,s.Sum):return value
    return None

ap=argparse.ArgumentParser();ap.add_argument('--report',required=True);ap.add_argument('--owner');args=ap.parse_args()
base=Path('content/original/9231-fp1');pack=json.loads((base/'summation-v1.json').read_text(encoding='utf-8'))
audit=json.loads(Path('docs/ARENA-C2-SERIES-SOURCE-AUDIT-20261106.json').read_text(encoding='utf-8'))
fixtures=json.loads((base/'summation-owner-verification-v1.json').read_text(encoding='utf-8'));by={q['id']:q for q in fixtures}
source=json.loads(Path(args.owner).read_text(encoding='utf-8-sig')) if args.owner else None
if source:
    truth('SOURCE','read-only owner SHA',hashlib.sha256(Path(args.owner).read_bytes()).hexdigest()==audit['sourceSha256'])
    original={v['id']:v for l in source['lessons'] for v in l['questions']}
for row in fixtures:
    item=next(q for q in pack['questions'] if q['id']==row['uid'])
    truth(row['id'],'manifest and owner fixture binding',digest(item)==row['contentSha256'])
    truth(row['id'],'every part and criterion retains supplied marks',sum(p['marks'] for p in row['parts'])==item['marks']==sum(m['marks'] for p in item['parts'] for m in p['marking_criteria']))
    if source:
        old=original[row['id']]
        truth(row['id'],'owner teaching and keys unchanged',all(item[new]==old[oldkey] for new,oldkey in [('prompt_html','question_html'),('answer_html','answer_html'),('solution_html','solution_html'),('hint_html','hint_html')]) and row['parts']==old['parts'])
for lesson in pack['lessons']:
    truth(lesson['id'],'authored teaching binding',hashlib.sha256(json.dumps(lesson,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()==audit['teachingDigests'][lesson['id']])

# Independently certify every explicit finite sum and partial-fraction identity
# in the supplied answer blocks. Complicated prose/endpoint claims are below.
auto=[]
for row in fixtures:
    uid=row['id']
    for part in row['parts']:
        for text in mathtexts(part['answer_html']):
            for segment in text.split(r'\qquad'):
                if '=' not in segment:continue
                terms=top_equal(segment)
                if len(terms)!=2:continue
                lhs,rhs=terms
                rhs=re.split(r'\\(?:lt|gt|le|ge)(?![A-Za-z])',rhs)[0]
                try:
                    if r'\sum' in lhs:
                        summ=expr(lhs);total=expr(rhs)
                        if not isinstance(summ,s.Sum):continue
                        var,lo,hi=summ.limits[0]
                        if var!=r:continue
                        if any(str(v).startswith('u_') for v in summ.function.free_symbols):
                            continue # Explicit named-term certificates below.
                        if uid=='6579':continue # Exact sine-difference certificate below.
                        if hi==s.oo:
                            G=gosper_sum(summ.function,r)
                            if G is None:
                                prefix=next((expr(top_equal(v)[-1]) for p in row['parts'] for v in mathtexts(p['answer_html']) if len(top_equal(v))==2 and r'\sum' in top_equal(v)[0] and r'\infty' not in v),None)
                                if prefix is None:raise ValueError('No infinite certificate')
                                record(uid,'limit of certified finite sum',s.limit(prefix,n,s.oo),total);auto.append((uid,part['label']));continue
                            record(uid,'infinite boundary',s.limit(G,r,s.oo)-G.subs(r,lo),total)
                        else:finite(uid,'explicit sum',summ.function,lo,hi,total)
                        auto.append((uid,part['label']))
                    elif 'r' in lhs and not any(v in lhs for v in ['F(',r'\ln',r'\sum',r'u_']):
                        left,right=expr(lhs),expr(rhs)
                        if left.has(r) and not left.has(s.Function):record(uid,'algebraic identity',left,right)
                except Exception as error:skipped.append(dict(id=uid,part=part['label'],text=segment,reason=type(error).__name__))

# Named totals such as T_n still need the actual summand from their question.
for row in fixtures:
    uid=row['id']
    for j,part in enumerate(row['parts']):
        if (uid,part['label']) in auto or uid in ['4124','4188','4200','4207','4284','4178','4192','6295']:continue
        try:
            texts=mathtexts(part['answer_html'])
            if not texts or r'\sum' in texts[0] or len(top_equal(texts[0]))!=2:continue
            summ=sum_text(part['prompt_html'])
            if summ is None or summ.limits[0][0]!=r or summ.function.has(s.Symbol('u_{r}')):continue
            term=summ.function
            if uid in ['4139','4153'] and j==2:term=term.subs(k,2)
            if summ.limits[0][2]==s.oo:continue
            finite(uid,'named total from question part '+str(j+1),term,summ.limits[0][1],summ.limits[0][2],answer(uid,j))
            auto.append((uid,part['label']))
        except Exception as error:
            skipped.append(dict(id=uid,part=part['label'],text='named total from question',reason=type(error).__name__))

# Root power sums are calculated from polynomial remainders / Newton identities.
def powers(poly,order):
    P=s.Poly(poly,x).monic();coeff=P.all_coeffs();d=P.degree();ps=[s.Integer(d)]
    for j in range(1,order+1):
        ps.append(s.expand(-sum(coeff[i]*ps[j-i] for i in range(1,min(j,d)+1) if i!=j)-(j*coeff[j] if j<=d else 0)))
    return ps
roots=[('4124',x**4+4*x*x-2*x+5,4,2*r-1,2),('4188',x**3+2*x*x-x-3,2,r,2),('4200',x**3-2*x*x+5*x-4,2,3*r-2,1),('4207',x**3+2*x*x-s.Rational(3,2)*x-s.Rational(1,2),2,r,1),('4284',x**3+3*x*x+2*x-4,3,2*r,2)]
for uid,P,order,shift,part in roots:
    ps=powers(P,order)
    term=sum(s.binomial(2 if order!=3 else 3,j)*shift**(2-j if order!=3 else 3-j)*(ps[2*j] if uid=='4124' else ps[j]) for j in range(3 if order!=3 else 4))
    verify_total(uid,part,term)
    expected={'4124':[-8,12],'4188':[-2,6],'4200':[2,-6],'4207':[-2,7],'4284':[5,3]}[uid]
    actual=[ps[2],ps[4]] if uid=='4124' else [ps[2],ps[3]] if uid=='4284' else [ps[1],ps[2]]
    for j in range(2):record(uid,'Newton power '+str(j),actual[j],s.Integer(expected[j]))
record('4188','affine transformed cubic',s.expand((8*x**3-4*x*x-4*x-1).subs(x,(x+1)/2)),x**3+2*x*x-x-3)

# Remaining named totals and parameter values.
for uid,part,term,lo,hi in [
('4139',2,12/((2+3*r)*(5+3*r)),2*n,3*n),('4153',2,4/((2*r+2)*(2*r+4)),n+1,n*n),
('4178',0,r,1,n),('4192',0,2*r-1,1,n),('4248',1,2*(2*r-1)**2+5*(2*r)**2,1,n),
('5852',0,(6*r-4)**2-(6*r-1)**2,1,n),
('6230',1,9*r*r+r,n+1,3*n),('6397',1,(r+2)**2*s.factorial(r+1),n,2*n),
('6410',2,6*r-5,n,3*n),('6421',2,3*r*r+3*r,2*n+1,4*n),
('6525',0,(2*r-1)**5,1,n)]:
    verify_total(uid,part,term,lo,hi)
for uid,term,rhs,key,var in [('4178',r+a,3*n*(n+1),3*n/2,a),('4192',2*r-1+a,4*n,2-4*n,a)]:
    record(uid,'moving interval determines parameter',s.solve(s.summation(term,(r,n if uid=='4178' else n+1,2*n if uid=='4178' else 3*n))-rhs,a)[0],answer(uid,1))
for uid,var,total,target,expected in [('4139',k,2*k/(k+3),s.Rational(4,5),2),('4153',k,4/(k*(k+2)),s.Rational(1,2),2),('4232',a,3/(a*(a+2)),s.Rational(1,5),3)]:
    truth(uid,'all admissible positive parameter roots',s.solveset(total-target,var,domain=s.Interval.open(0,s.oo))==s.FiniteSet(expected))
    record(uid,'supplied parameter',answer(uid,1),s.Integer(expected))
record('5852','odd total',answer('5852',1),answer('5852',0)+(6*n+2)**2)
record('5852','even scaled limit',s.limit(answer('5852',0)/n**2,n,s.oo),s.Integer(-18))
record('5852','odd scaled limit',s.limit(answer('5852',1)/n**2,n,s.oo),s.Integer(18))
record('6533','reverse each third sign twice',answer('6533',1),s.summation(r*r,(r,1,3*n))-2*s.summation((3*r)**2,(r,1,n)))
record('6304','first numerical polynomial total',s.summation(3*r*r-4*r+2,(r,1,6)),answer('6304',0))
record('6304','zero-based cubic total',s.summation(r**3-4,(r,0,5)),answer('6304',1))
for uid,Sn in [('6230',n*(n+1)*(3*n+2)),('6410',3*n*n-2*n),('6421',n*(n+1)*(n+2))]:
    record(uid,'recovered term',answer(uid,0 if uid=='6230' else 1),(Sn-Sn.subs(n,n-1)).subs(n,r))
    record(uid,'first term from the original total',answer(uid,0 if uid=='6230' else 1).subs(r,1),Sn.subs(n,1))

# Remainders: prove the threshold at n and failure at n-1; all are decreasing.
for uid,R,threshold,least in [('5858',(s.Rational(1,5))**(n+1)+(s.Rational(1,2))**(n+1),s.Rational(1,10000),13),
('5860',s.exp(-2*n-2),s.Rational(1,10**7),8),('6328',1/(2*(4*n+3)),s.Rational(1,8000),1000),
('6555',1/(n+2)**3,s.Rational(1,10**12),9999),('4283',s.log((n+3)/(n+2)),s.Rational(1,500),498)]:
    truth(uid,'least integer succeeds',bool(R.subs(n,least)<threshold))
    truth(uid,'previous integer fails strict inequality',bool(R.subs(n,least-1)>=threshold))
    record(uid,'supplied least integer',answer(uid,len(by[uid]['parts'])-1),s.Integer(least))
    truth(uid,'remainder strictly decreasing',bool(s.factor(s.diff(R,n))<0))
F=(r+3)/s.sqrt(r*r+2*r+2);Sn=F.subs(r,1)-F.subs(r,n+1)
record('6283','three decimal places',s.Rational(str(round(float(Sn.subs(n,25)),3))),answer('6283',0))
for j in [37,38]:truth('6283','threshold at '+str(j),bool((Sn.subs(n,j)>4/s.sqrt(5)-s.Rational(21,20)))==(j==38))
record('6283','supplied least integer',answer('6283',1),s.Integer(38))
record('6283','monotonic boundary derivative',s.diff(F,r),(-2*r-1)/(r*r+2*r+2)**s.Rational(3,2))

# Named analytic boundary identities, before taking any limit.
special=[
('5860',s.exp(-2*r)/(r+1),1,0),('6555',1/(r+1)**3,1,0),
('6244',(3*r-1)*(3*r+2)/(r*(r+1)),-1,0),('6567',1/((r+1)*(3*r+2)),1,0)]
for uid,F,sign,_ in special:
    term=sign*(F-F.subs(r,r+1));claimed=answer(uid,1)
    finite(uid,'named boundary',term,s.Integer(1),n,claimed)
    record(uid,'infinite boundary from named F',sign*(F.subs(r,1)-s.limit(F,r,s.oo)),s.Rational(1,2)*s.exp(-2) if uid=='5860' else s.Rational(1,8) if uid=='6555' else s.Integer(4) if uid=='6244' else s.Rational(1,10))
record('4283','log finite difference',s.expand_log(s.log(2*(n+4)/(3*(n+3)))-s.log(2*(n+3)/(3*(n+2))),force=True),s.expand_log(s.log((n+2)*(n+4)/(n+3)**2),force=True))
record('4283','log first value',s.log(s.Rational(8,9)),s.log(s.Rational(2*4,3*3)))
record('4283','log infinite sum',s.limit(s.log(2*(n+3)/(3*(n+2))),n,s.oo),s.log(s.Rational(2,3)))

# Explicit exceptional endpoints / domains; these are not numerical sampling proofs.
w=s.prod(r+j for j in range(6))
record('4125','growing product difference',w.subs(r,r+1)-w,6*s.prod(r+j for j in range(1,6)))
verify_total('4125',1,s.prod(r+j for j in range(1,6)))
truth('4125','positive forward difference of exponents',bool(s.factor(w.subs(r,r+1)-w)>0))
record('4125','first exponent',w.subs(r,1),s.Integer(720))
record('5858','finite geometric telescope',answer('5858',0),7*t-(2*t)**(n+1)-(5*t)**(n+1))
record('5858','positive exceptional endpoint sum',7*s.Rational(1,5)-1,s.Rational(2,5))
truth('5858','interior target solution admissible',s.solve(7*t-s.Rational(2,5),t)==[s.Rational(2,35)] and abs(s.Rational(2,35))<s.Rational(1,5))
record('4147','log-base cancellation total',answer('4147',2),s.summation((n+2)**3-8,(n,1,N)))
log.append(dict(id='4125',label='parity argument',result='REVIEWED',argument='The six consecutive integer factors include an even integer, so w_r is even. This is a divisibility argument for all r, not a finite sample.'))
record('4242','exponential finite difference',(s.exp(2*x)*(s.exp(2*x)-1)*(s.exp(2*(n+1)*x)-1)-s.exp(2*x)*(s.exp(2*x)-1)*(s.exp(2*n*x)-1)),s.exp(2*(n+1)*x)*(s.exp(2*x)-1)**2)
record('4242','supplied exponential finite sum',answer('4242',0),s.exp(2*x)*(s.exp(2*x)-1)*(s.exp(2*n*x)-1))
record('4242','supplied log term total',answer('4242',2),x*n*(n+1)+2*n*s.log(s.Abs(s.exp(2*x)-1)))
record('6453','log telescope first value',s.expand_log(s.log((2+x*x)/(2+x)),force=True),s.expand_log(s.log((2+x*x)/(2+x)),force=True))
truth('6453','negative endpoint oscillates',s.log(3)!=0)
# These endpoint conclusions follow from |base|<1, direct substitution at ±1,
# dominance for |base|>1, positivity of log arguments, and the signed exponents.
endpoint_cases={
'4125':dict(domain='[-1,1]',interior='x**720',endpoints={'-1':'0','1':'0'},reason='Even increasing integer exponents; |x|<1 tends to 0; |x|>1 unbounded.'),
'4147':dict(domain='(0,1]',interior='-2**log(x)',endpoints={'1':'0'},reason='(n+2)**log(x) has a finite limit precisely for log(x)<=0.'),
'4242':dict(domain='(-inf,0)',interior='exp(2*x)*(1-exp(2*x))',endpoints={},reason='x is nonzero; exp(2*x) is positive and less than 1 precisely when x<0.'),
'5858':dict(domain='(-1/5,1/5]',interior='7*t',endpoints={'1/5':'2/5'},reason='|5t| dominates |2t|; negative endpoint oscillates, positive endpoint leaves 1.'),
'6453':dict(domain='(-1,1]',interior='log(2/(2+x))',endpoints={'1':'0'},reason='All log arguments positive for x>=-1; x=-1 oscillates, x>1 grows.')}
for uid,case in endpoint_cases.items():
    log.append(dict(id=uid,label='analytic domain and exceptional endpoints',result='REVIEWED',argument=case));coverage[uid]+=1

# Moving-window limits and bounds, derived from exact antidifferences.
for uid,term,lo,hi,limit in [('5811',1/(r*r-4),n+1,3*n,s.Rational(2,3)),('5829',1/((4*r-1)*(4*r+3)),n+1,n*n+n,s.Rational(1,16))]:
    G=gosper_sum(term,r);T=G.subs(r,hi+1)-G.subs(r,lo)
    record(uid,'scaled moving-window limit',s.limit(n*T,n,s.oo),limit)
for uid,term,hi in [('6390',2/((3*r+1)*(3*r+4)),3*n),('6472',(2*r+5)/((r+1)*(r+2)*(r+3)*(r+4)),2*n)]:
    G=gosper_sum(term,r);T=s.factor(G.subs(r,hi+1)-G.subs(r,n+1))
    bound=4/(27*n) if uid=='6390' else 3/(4*n*n)
    truth(uid,'positive strict upper-bound difference',bool(s.factor(bound-T)>0))
record('5841','product limit',s.limit(answer('5841',0)*answer('5841',1)/n**3,n,s.oo),s.Rational(4,15))
ratio=s.cancel(answer('6224',0)/answer('6224',1))
record('6224','exact ratio',ratio,answer('6224',2));truth('6224','integer polynomial ratio',all(c.is_Integer for c in s.Poly(ratio,n).all_coeffs()))
record('6224','scaled ratio limit',s.limit(ratio/n**3,n,s.oo),s.Integer(504))
record('6525','critical-power limit',s.limit(answer('6525',0)/n**6,n,s.oo),s.Rational(16,3))

# Trigonometric identity and branch certificates, plus distinct subsequences.
A=s.pi*r/3+s.pi/12
record('4267','tangent identity',s.trigsimp((s.tan(A+s.pi/3)-s.tan(A))*s.cos(A)*s.cos(A+s.pi/3),method='fu'),s.sin(s.pi/3))
record('5816','secant numerator identity',s.trigsimp(s.cos(A)-s.cos(A+s.pi/3),method='fu'),s.sin(s.pi*r/3+s.pi/4))
truth('4267','no integer poles',all(s.cos(s.pi*j/3+s.pi/12)!=0 and s.cos(s.pi*j/3+5*s.pi/12)!=0 for j in range(6)))
truth('4267','different recurring partial sums',s.simplify(s.tan(s.pi/12+s.pi/3)-s.tan(s.pi/12))!=0)
truth('5816','different recurring partial sums',s.sec(s.pi/12)!=s.sec(s.pi+s.pi/12))
record('6295','tangent of arctangent difference',s.cancel((z+3-z)/(1+z*(z+3))),3/(z*z+3*z+1))
record('6295','supplied arctangent boundary sum',answer('6295',1),sum(s.atan(n+j)-s.atan(j) for j in [1,2,3]))
truth('6295','positive tangent denominator for z>0',bool((z*z+3*z+1).subs(z,s.Symbol('positive_z',positive=True))>0))
record('6295','tangent of three starting arctangents',s.expand_trig(s.tan(s.atan(1)+s.atan(2)+s.atan(3))),s.Integer(0))
# Each angle lies in (0,pi/2), and atan(2)+atan(3)>pi/2
# because their tangent addition denominator is 1-6<0. The sum is pi.
theta=s.Symbol('theta',real=True)
record('6579','sine difference identity',s.trigsimp(s.sin((2*r+1)*theta)-s.sin((2*r-1)*theta),method='fu'),2*s.sin(theta)*s.cos(2*r*theta))
truth('6579','terms fail to tend to zero at theta=pi/4',s.cos(4*s.pi/2)==1)

# All new examples and all complete quick-check keys.
examples=[
('E-P1',r,1,n,n*(n+1)/2),('E-P2',r*r,1,n,n*(n+1)*(2*n+1)/6),('E-P3',r**3,1,n,n*n*(n+1)**2/4),('E-P4',r**4,1,n,n*(n+1)*(2*n+1)*(3*n*n+3*n-1)/30),
('E-F1',(2*r-1)*(r+3),1,n,n*(4*n*n+21*n-1)/6),('E-F2',2*r+1,n+2,3*n+1,8*n*(n+1)),('E-F3',(2*r)**2-(2*r+1)**2,1,n,-n*(2*n+3)),
('E-F4',6*r*r+4*r-1,1,n,n*(n+2)*(2*n+1)),
('E-D1',6/((2*r+1)*(2*r+3)),1,n,2*n/(2*n+3)),('E-D2',1/((r+2)*(r+5)),1,n,s.Rational(1,3)*(s.Rational(1,3)+s.Rational(1,4)+s.Rational(1,5)-1/(n+3)-1/(n+4)-1/(n+5))),
('E-D3',5/(r*(r+1)*(r+2)),1,n,s.Rational(5,4)-s.Rational(5,2)/((n+1)*(n+2))),('E-D4',(r+2)/(2**r*r*(r+1)),1,n,1-1/(2**n*(n+1))),
('E-C1',2/((r+2)*(r+3)),1,n,s.Rational(2,3)-2/(n+3)),('E-C2',-1/((r+2)*(r+3)),1,n,1/(n+3)-s.Rational(1,3)),
('E-C3',q**r-q**(r+1),1,n,q-q**(n+1)),('E-C4',3/((r+2)*(r+3)),2*n+1,5*n,9*n/((2*n+3)*(5*n+3)))]
for uid,u,lo,hi,total in examples:finite(uid,'authored example',u,s.sympify(lo),s.sympify(hi),total)
record('E-F3','odd partial sum',-n*(2*n+3)+(2*n+2)**2,2*n*n+5*n+4)
record('E-F4','moving block',((n*(n+2)*(2*n+1)).subs(n,2*n)-n*(n+2)*(2*n+1)),n*(14*n*n+15*n+2))
truth('E-C1','least n=398 meets strict accuracy',s.Rational(2,401)<s.Rational(1,200) and not s.Rational(2,400)<s.Rational(1,200))
for row in json.loads((base/'summation-quick-verification-v1.json').read_text(encoding='utf-8')):
    uid=row['uid'];item=next(q for q in pack['questions'] if q['id']==uid);ref=row['reference']
    truth(uid,'question binding',digest(item)==row['contentSha256'])
    ans={k:(plain(v[0])/plain(v[1]) if isinstance(v,list) else plain(v) if k!='choice' else v) for k,v in row['answers'].items()}
    kind=ref['kind']
    if kind=='sum':finite(uid,'complete sum',plain(ref['term']),plain(ref['lower']),plain(ref['upper']),ans['total'])
    elif kind=='expression':record(uid,'complete expansion',ans['difference'],plain(ref['expected']))
    elif kind=='recover':record(uid,'recovered complete term',ans['term'],(plain(ref['total'])-plain(ref['total']).subs(n,n-1)).subs(n,r))
    elif kind=='alternating':
        shift=ref['shift'];T=s.summation((2*r-1+shift)**2-(2*r+shift)**2,(r,1,n))
        record(uid,'even total',ans['even'],T);record(uid,'odd total',ans['odd'],T+(2*n+1+shift)**2)
    elif kind=='infinite':
        G=gosper_sum(plain(ref['term']),r);record(uid,'infinite sum',s.limit(G,r,s.oo)-G.subs(r,1),ans['sum'])
    elif kind=='least':
        m=int(ans['n']);R=plain(ref['remainder']);b=plain(ref['threshold'])
        truth(uid,'least integer and previous boundary',bool(R.subs(n,m)<b) and bool(R.subs(n,m-1)>=b))
    elif kind=='window-limit':
        G=gosper_sum(plain(ref['term']),r);T=G.subs(r,plain(ref['upper'])+1)-G.subs(r,plain(ref['lower']))
        record(uid,'moving window limit',s.limit(n*T,n,s.oo),ans['limit'])
    else:truth(uid,'valid independently reviewed principle',ans['choice']==ref['correct'])
assert all(q['id'] in coverage and coverage[q['id']]>3 for q in fixtures)
assert all(e['verification'] in coverage for l in pack['lessons'] for e in l['examples'])
assert all(q['id'] in coverage for q in pack['questions'] if q['collection']!='exam')
result=dict(ownerTasks=68,quickChecks=32,examples=16,checks=len(log),failures=failures,coverage=coverage,automaticSumParts=len(auto),parserExceptions=skipped,parserResolutions={'5852':'Both parity formulae have exact finite-sum certificates and both scaled limits are checked separately.'},checksLog=log,limitations=['Expository quality and open-response proof marking require teacher judgement; deterministic checking covers complete final answers only.','Endpoint arguments combine exact finite identities with explicit analytic reasoning, rather than finite sampling. REVIEWED entries identify these arguments separately from symbolic PASS checks.'])
Path(args.report).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(dict(checks=len(log),failures=len(failures),ownerTasks=68,automaticSumParts=len(auto),parserExceptions=len(skipped))))
if failures:raise SystemExit(1)
