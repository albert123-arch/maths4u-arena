"""Independent exact checks of chapter claims, examples and complete quick keys."""
import argparse,hashlib,json,re,html
from pathlib import Path
from functools import lru_cache
import sympy as s
from sympy.parsing.latex import parse_latex
from sympy.calculus.util import function_range
x,y=s.symbols('x y',real=True)
symbols={c:s.Symbol(c,real=True) for c in ['a','b','c','d','k','lambda']}
log=[];failures=[];coverage={}
@lru_cache(None)
def expr(value):
    value=html.unescape(value).strip().replace(r'\left','').replace(r'\right','').replace(r'\dfrac',r'\frac').replace(r'\,','').replace(r'\quad','')
    if value in ['inf','infinity',r'\infty']:return s.oo
    if value in ['-inf','-infinity',r'-\infty']:return -s.oo
    value=re.sub(r'\\frac([^{}\s])',r'\\frac{\1}',value)
    value=re.sub(r'(\\frac\{[^{}]*\})([A-Za-z0-9])',r'\1{\2}',value)
    value=re.sub(r'\\sqrt([0-9])',r'\\sqrt{\1}',value)
    a=parse_latex(value)
    return a.xreplace({v:x if str(v)=='x' else y if str(v)=='y' else symbols.get(str(v),v) for v in a.free_symbols})
def plain(v):return s.sympify(v,locals={'x':x,'y':y,**symbols})
def canonical_set(value):
    if isinstance(value,s.Interval):return s.Interval(s.simplify(value.start),s.simplify(value.end),left_open=value.left_open,right_open=value.right_open)
    if isinstance(value,s.FiniteSet):return s.FiniteSet(*(s.simplify(v) for v in value))
    if isinstance(value,s.Union):return s.Union(*(canonical_set(v) for v in value.args))
    return value
def record(uid,label,actual,expected):
    if isinstance(actual,s.Set) and isinstance(expected,s.Set):
        actual,expected=canonical_set(actual),canonical_set(expected)
        ok=s.simplify(s.SymmetricDifference(actual,expected))==s.EmptySet
    else:ok=s.simplify(actual-expected)==0
    row=dict(id=uid,label=label,result='PASS' if ok else 'FAIL',actual=str(actual),expected=str(expected));log.append(row)
    coverage[uid]=coverage.get(uid,0)+1
    if not ok:failures.append(row)
def truth(uid,label,ok):record(uid,label,s.Integer(bool(ok)),s.Integer(1))
def parse_set(value):
    value=value.replace(r'\left','').replace(r'\right','').replace(r'\,','').strip().strip('.')
    value=re.sub(r'^.*?\\in(?![A-Za-z])\s*','',value).replace(r'\{','{').replace(r'\}','}')
    chunks=re.split(r'\\cup|\s+U\s+',value);sets=[]
    for part in chunks:
        part=part.strip()
        if part.startswith('{'):sets.append(s.FiniteSet(*(expr(t) for t in part[1:-1].split(',') if t.strip())))
        else:
            assert part[0] in '([' and part[-1] in ')]',part
            a,b=part[1:-1].split(',')
            sets.append(s.Interval(expr(a),expr(b),left_open=part[0]=='(',right_open=part[-1]==')'))
    return s.Union(*sets)
def tex_blocks(value):return re.findall(r'\\\((.*?)\\\)',value,re.S)
def point_pairs(value):
    pairs=[]
    for t in tex_blocks(value):
        clean=t.replace(r'\left','').replace(r'\right','').replace(r'\quad','')
        level=0;start=0;comma=None
        for i,char in enumerate(clean):
            if char=='(':
                if level==0:start=i+1;comma=None
                level+=1
            elif char==',' and level==1:comma=i
            elif char==')':
                level-=1
                if level==0 and comma is not None:
                    a,b=clean[start:comma],clean[comma+1:i]
                    if r'\pm' not in a:pairs.append((expr(a),expr(b)))
    return pairs
def rational_solution(f,op='>',right=0,excluded=()):
    value=s.factor(f-right)
    relation={'>':s.Gt,'<':s.Lt,'>=':s.Ge,'<=':s.Le}[op](value,0)
    result=s.solve_univariate_inequality(relation,x,relational=False)
    return result-s.FiniteSet(*excluded)
def real_poles(f):return s.solveset(s.denom(s.together(f)),x,domain=s.S.Reals)
def stationary(f):
    roots=s.solveset(s.numer(s.cancel(s.diff(f,x))),x,domain=s.S.Reals)
    return roots-real_poles(f)
def digest(q):return hashlib.sha256('\0'.join([q['title'],q['prompt_html'],q['answer_html'],q['solution_html'],q['hint_html'],str(q['marks'])]).encode()).hexdigest()
root=Path('content/original/9231-fp1')
pack=json.loads((root/'rational-v1.json').read_text(encoding='utf-8'))
audit=json.loads(Path('docs/ARENA-C2-RATIONAL-SOURCE-AUDIT-20261106.json').read_text(encoding='utf-8'))
for row in audit['rows']:assert digest(next(q for q in pack['questions'] if q['id']==row['uid']))==row['contentSha256']
for lesson in pack['lessons']:
    assert hashlib.sha256(json.dumps(lesson,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()==audit['teachingDigests'][lesson['id']]
owner=json.loads((root/'rational-owner-verification-v1.json').read_text(encoding='utf-8'))
functions={}
for q in owner:
    uid='OWNER-'+q['id'];print('Checking '+uid,flush=True);f=expr(q['function']);functions[q['id']]=f
    replacements={'5840':{'a':s.Rational(1,3),'b':s.Rational(2,3)},'6279':{'a':2,'b':7,'c':10,'d':2},'6509':{'a':1,'b':-7,'c':16,'d':-3}}
    if q['id'] in replacements:f=f.subs({symbols[k]:v for k,v in replacements[q['id']].items()})
    for part in q['parts']:
        prompt=part['prompt'];answer=part['answer'];label=part['label']
        active=f
        if q['id']=='6287' and label in ['c','d']:active=f.subs(symbols['k'],10)
        if q['id']=='5824' and label=='d':active=(x*x+(symbols['a']+6)*x+3*symbols['a']+13)/(x+3)
        if 'asymptote' in prompt.lower() and ('state' in prompt.lower() or 'determine every' in prompt.lower() or 'find both' in prompt.lower() or 'find the asymptotes' in prompt.lower()):
            for t in tex_blocks(answer):
                for assignment in re.split(r',(?:\\quad)?|,\\\s*',t):
                    assignment=assignment.strip().replace(r'\quad','')
                    if assignment.startswith('y='):
                        quotient=s.div(*s.fraction(s.cancel(active)),x)[0]
                        record(uid,label+' asymptote at infinity',quotient,expr(assignment[2:]))
                    elif assignment.startswith('x='):
                        pole=expr(assignment[2:]);record(uid,label+' denominator zero',s.denom(s.together(active)).subs(x,pole),0)
        if ('stationary' in prompt.lower() or 'turning points' in prompt.lower()) and 'reciprocal' not in prompt.lower() and not prompt.startswith(('Define','Sketch')) and 'y^2=' not in prompt:
            pairs=point_pairs(answer)
            for a,b in pairs:
                record(uid,label+' stationary derivative',s.diff(active,x).subs(x,a),0)
                record(uid,label+' stationary ordinate',active.subs(x,a),b)
            if pairs and not (active.free_symbols-{x}):
                record(uid,label+' complete stationary inputs',s.FiniteSet(*(a for a,b in pairs)),stationary(active))
                natures=re.findall(r'\\\((.*?)\\\)\s*\((maximum|minimum)\)',answer)
                if len(natures)==len(pairs):
                    for (a,b),(_,nature) in zip(pairs,natures):
                        sign=s.simplify(s.diff(active,x,2).subs(x,a))
                        truth(uid,label+' stationary classification',bool(sign<0) if nature=='maximum' else bool(sign>0))
            if ('no stationary' in answer.lower() or 'no stationary' in prompt.lower() or 'no turning' in answer.lower()) and not (active.free_symbols-{x}):
                record(uid,label+' no stationary inputs',stationary(active),s.EmptySet)
        if ('exact range' in prompt.lower() or 'exact range' in answer.lower()) and not (active.free_symbols-{x}):
            for t in tex_blocks(answer):
                if r'\in' in t:
                    record(uid,label+' complete range',function_range(active,x,s.S.Reals-real_poles(active)),parse_set(t))
        if 'all intersections with the coordinate axes' in prompt.lower() and 'Sketch' not in prompt:
            for a,b in point_pairs(answer):record(uid,label+' axis intersection',active.subs(x,a),b)
        if prompt.startswith('Define') and 'g(x)=1/f(x)' in prompt:
            for a,b in point_pairs(answer):
                record(uid,label+' reciprocal stationary derivative',s.diff(1/active,x).subs(x,a),0)
                record(uid,label+' reciprocal ordinate',1/active.subs(x,a),b)
    # Check the polynomial-division identity for every supplied function.
    n,d=s.fraction(s.cancel(f));quotient,remainder=s.div(n,d,x)
    record(uid,'division identity',f,quotient+remainder/d)

# Explicit special cases, inequalities and parameters. These check the actual
# supplied interval answers rather than a sample of integer inputs.
by_id={q['id']:q for q in owner}
def answer_set(qid,label):
    a=next(p['answer'] for p in by_id[qid]['parts'] if p['label']==label)
    return parse_set(next(t for t in tex_blocks(a) if r'\in' in t))
def interval_check(qid,label,f,op,right,excluded=()):
    record('OWNER-'+qid,label+' complete inequality',rational_solution(f,op,right,excluded),answer_set(qid,label))
for qid,c,op in [('4252',3,'<'),('5887',1,'>'),('4113',s.Rational(1,8),'<'),('4121',s.Rational(1,2),'<='),('4204',4,'<'),('4211',3,'>='),('4259',12,'<'),('4273',2,'<')]:
    f=functions[qid]
    interval_check(qid,'e',f*f,op,c*c,real_poles(f))
f=functions['5808'].subs(symbols['a'],1);interval_check('5808','b',f*f,'>',s.Rational(1,9),real_poles(f))
f=functions['4162'].subs(symbols['a'],8);interval_check('4162','e',f*f,'<',64,real_poles(f));record('OWNER-4162','boundary parameter',functions['4162'].subs({x:2,symbols['a']:8}),8)
for qid,label,target,parameter in [('4169','d',0,2),('4239','b',-3,None),('5894','e',5,None),('4135','f',-2,None)]:
    f=functions[qid]
    if parameter is not None:f=f.subs(symbols['a'],parameter)
    positive=rational_solution(f,'<',target)&s.Interval(0,s.oo)
    mirrored=s.Union(positive,s.imageset(s.Lambda(x,-x),positive))
    record('OWNER-'+qid,label+' reflected input inequality',mirrored,answer_set(qid,label))
literal=4*(3*x+10)**2-25*(4-x*x)**2
interval_check('4280','e',literal,'>',0)
truth('OWNER-4280','literal includes both auxiliary poles',answer_set('4280','e').contains(2) and answer_set('4280','e').contains(-2))
for qid,op in [('4191','>'),('4184','<'),('4198','>')]:
    f=functions[qid];interval_check(qid,'e',1/f-f,op,0,real_poles(f)|s.solveset(s.numer(s.together(f)),x,domain=s.S.Reals))
record('OWNER-6301','lower square identity',functions['6301'],-1+(2*x-1)**2/(x*x+1))
record('OWNER-6301','upper square identity',functions['6301'],4-(x+2)**2/(x*x+1))
record('OWNER-6265','partial fraction identity',functions['6265'],3+4/(x-2)-9/(x+1))
for qid,m in [('6447',3),('6583',2),('4162',1),('4169',1),('5875',1)]:
    f=functions[qid];delta=s.factor(s.diff(f,x)-m)
    # Parameter restrictions in the question make the displayed numerator positive.
    expected={'6447':5/(x-2)**2,'6583':2/(x+3)**2,'4162':(symbols['a']-5)/(x+1)**2,'4169':symbols['a']/(x-1)**2,'5875':3*symbols['a']/(x+3)**2}[qid]
    record('OWNER-'+qid,'positive derivative remainder',delta,expected)
record('OWNER-6460','cancellation parameter',functions['6460'].subs(symbols['lambda'],5),x-5)
record('OWNER-6460','tangent member',functions['6460'].subs(symbols['lambda'],9),(x-3)**2/(x-1))
record('OWNER-6287','boundary cancellation member',functions['6287'].subs(symbols['k'],6),3*x)
a=symbols['a'];f=functions['6475'];disc=s.discriminant(s.numer(s.cancel(s.diff(f,x))),x)
record('OWNER-6475','stationary discriminant',disc,16*(1-a)*(a+3))
for av,expected in [(2,0),(0,2)]:
    record('OWNER-6475','number of stationary inputs at a='+str(av),len(stationary(f.subs(a,av))),expected)
f=functions['4241'];record('OWNER-4241','parameter division',f,a*x+a+2+4*a/(x-3))
record('OWNER-4241','first turning height',f.subs(x,1),2);record('OWNER-4241','second turning height',f.subs(x,5),2+8*a)
f=functions['4127'];record('OWNER-4127','positive level discriminant',s.discriminant(s.numer(s.together(f-a)),x),a*(5*a-12))
record('OWNER-4127','negative level discriminant',s.discriminant(s.numer(s.together(f+a)),x),-3*a*(a+4))
for qid,label,count,critical in [('4141','e',4,[0,s.Rational(4,5),1]),('4155','e',3,[0,s.Rational(3,5),s.Rational(13,5),3]),('4236','e',4,[0,1,2,3]),('4266','e',3,[0,4*s.sqrt(2)-1,1+4*s.sqrt(2)])]:
    f=functions[qid];test_values=set(critical)
    ordered=sorted(critical,key=lambda v:float(v));test_values|={s.simplify((a+b)/2) for a,b in zip(ordered,ordered[1:])};test_values|={ordered[-1]+1,-1}
    supplied=next(p['answer'] for p in by_id[qid]['parts'] if p['label']==label)
    block=tex_blocks(supplied)[0]
    claimed=parse_set(block) if r'\in' in block else s.FiniteSet(expr(block.split('=')[1]))
    for level in sorted(test_values,key=lambda v:float(v)):
        roots=(s.solveset(s.numer(s.together(f-level)),x,domain=s.S.Reals)|s.solveset(s.numer(s.together(f+level)),x,domain=s.S.Reals))-real_poles(f) if level>=0 else s.EmptySet
        actual=isinstance(roots,s.FiniteSet) and len(roots)==count
        truth('OWNER-'+qid,'level count k='+str(level),actual==bool(claimed.contains(level)))
for qid in ['4176','4219']:
    f=functions[qid];domain=rational_solution(f,'>=',0)
    domain_answer=next(p['answer'] for p in by_id[qid]['parts'] if p['label']=='d')
    block=next(t for t in tex_blocks(domain_answer) if '(' in t or '[' in t or r'\{' in t)
    record('OWNER-'+qid,'real square-root domain',domain,parse_set(block))
    points=point_pairs(domain_answer.split('Stationary points',1)[1])
    for x0,y0 in points:
        record('OWNER-'+qid,'square-root ordinate',f.subs(x,x0),y0*y0)
        record('OWNER-'+qid,'square-root horizontal tangent',s.diff(f,x).subs(x,x0),0)
    truth('OWNER-'+qid,'square-root branches include both signs',all((x0,-y0) in points for x0,y0 in points))
f=functions['4148'];record('OWNER-4148','reciprocal range',function_range(1/f,x,s.S.Reals),s.Interval(s.Rational(1,3),s.Rational(1,2),right_open=True))
record('OWNER-4148','reciprocal inequality',rational_solution(1/f,'<',s.Rational(2,5)),s.Interval.open(-s.sqrt(3),s.sqrt(3)))
record('OWNER-4286','left-hand infimum identity',-functions['4286']+x+2,4/(2-x))
record('OWNER-4286','right-hand gap identity',functions['4286']-x,2+4/(x-2))
g=(x*x+(a+6)*x+3*a+13)/(x+3)
record('OWNER-5824','curve difference',g-functions['5824'],((x+3)**2+4+4*a)/(x+3))

# Independently authored examples: exact facts and full intervals.
example_checks=[
('E-A1',(2*x*x-3*x+4)/(x+2),2*x-7+18/(x+2)),
('E-A2',(x*x-x-6)/(x-3),x+2),
('E-A3',(3*x*x+x+5)/(x*x+1),3+(x+2)/(x*x+1)),
('E-A4',s.diff((x*x-4*x+7)/(x-2),x),1-3/(x-2)**2),
('E-R1',function_range(x+9/x,x,s.S.Reals-{0}),s.Union(s.Interval(-s.oo,-6),s.Interval(6,s.oo))),
('E-R2',function_range((2*x*x+7)/(x*x+1),x,s.S.Reals),s.Interval(2,7,left_open=True)),
('E-R3',function_range((x*x+2*x+2)/(x*x+1),x,s.S.Reals),s.Interval((3-s.sqrt(5))/2,(3+s.sqrt(5))/2)),
('E-R4',function_range(x+4/x,x,s.Interval.open(0,2)),s.Interval.open(4,s.oo)),
('E-P1',(2*x*x+3*x+3)/(x-1),2*x+5+8/(x-1)),
('E-P2',s.diff((x*x+symbols['k'])/(x-2),x),1-(symbols['k']+4)/(x-2)**2),
('E-P3',(x-2)**2,x*x-4*x+4),
('E-P4',stationary(x+1+9/(x+2)),s.FiniteSet(-5,1)),
('E-M1',rational_solution((x-2)/(x+1),'>=',0),s.Union(s.Interval.open(-s.oo,-1),s.Interval(2,s.oo))),
('E-M2',rational_solution(((x-1)/(x+2))**2,'<',4),s.Union(s.Interval.open(-s.oo,-5),s.Interval.open(-1,s.oo))),
('E-M3',rational_solution((x+1)/(x-3),'<=',-1)&s.Interval(0,s.oo),s.Interval(1,3,right_open=True)),
('E-M4',rational_solution((x+2)**2-(x-1)**2,'>=',0),s.Interval(-s.Rational(1,2),s.oo)),
('E-T1',1/((x-1)/(x+2)),(x+2)/(x-1)),
('E-T2',rational_solution((x-1)/(x+2),'>=',0),s.Union(s.Interval.open(-s.oo,-2),s.Interval(1,s.oo))),
('E-T3',rational_solution((x+1)/(x-2)-(x-2)/(x+1),'>',0),s.Union(s.Interval.open(-1,s.Rational(1,2)),s.Interval.open(2,s.oo))),
('E-T4',(x+5+9/(x-1))-(x+5+4/(x-1)),5/(x-1))]
for uid,actual,expected in example_checks:record(uid,'worked-example mathematics',actual,expected)
fa=(2*x*x-3*x+4)/(x+2)
record('E-A1','y-intercept',fa.subs(x,0),2)
record('E-A1','non-zero pole numerator',(2*x*x-3*x+4).subs(x,-2),18)
record('E-A1','numerator discriminant',s.discriminant(2*x*x-3*x+4,x),-23)
record('E-A2','missing ordinate',s.limit((x*x-x-6)/(x-3),x,3),5)
fa=(3*x*x+x+5)/(x*x+1)
record('E-A3','horizontal height',s.limit(fa,x,s.oo),3)
record('E-A3','crossing ordinate',fa.subs(x,-2),3)
fa=(x*x-4*x+7)/(x-2)
for sign in [-1,1]:
    at=2+sign*s.sqrt(3)
    record('E-A4','stationary derivative',s.diff(fa,x).subs(x,at),0)
    record('E-A4','stationary ordinate',fa.subs(x,at),sign*2*s.sqrt(3))
    truth('E-A4','stationary nature',bool(sign*s.diff(fa,x,2).subs(x,at)>0))
for at in [-3,3]:record('E-R1','attained range endpoint',(x+9/x).subs(x,at),2*at)
record('E-R2','attained maximum',((2*x*x+7)/(x*x+1)).subs(x,0),7)
record('E-R3','linear output case',((x*x+2*x+2)/(x*x+1)).subs(x,-s.Rational(1,2)),1)
record('E-R3','output discriminant',s.discriminant((y-1)*x*x-2*x+y-2,x),-4*y*y+12*y-4)
record('E-P1','reconstructed given point',((2*x*x+3*x+3)/(x-1)).subs(x,0),-3)
record('E-P2','exceptional member',(x*x-4)/(x-2),x+2)
fa=(x-2)**2/(x+1)
record('E-P3','contact height',fa.subs(x,2),0);record('E-P3','contact derivative',s.diff(fa,x).subs(x,2),0)
record('E-P3','valid contact denominator',(x+1).subs(x,2),3)
fa=x+1+9/(x+2)
for at,height,sign in [(-5,-7,-1),(1,5,1)]:
    record('E-P4','stationary ordinate',fa.subs(x,at),height)
    truth('E-P4','stationary nature',bool(sign*s.diff(fa,x,2).subs(x,at)>0))
positive=rational_solution((x+1)/(x-3),'<=',-1)&s.Interval(0,s.oo)
record('E-M3','complete reflected input set',positive|s.imageset(s.Lambda(x,-x),positive),s.Union(s.Interval(-3,-1,left_open=True),s.Interval(1,3,right_open=True)))
record('E-T1','complete inherited exclusions',real_poles((x-1)/(x+2))|s.FiniteSet(1),s.FiniteSet(-2,1))
record('E-T1','missing reciprocal ordinate',s.limit((x+2)/(x-1),x,-2),0)
record('E-T1','reciprocal horizontal height',s.limit((x+2)/(x-1),x,s.oo),1)
quick=json.loads((root/'rational-quick-verification-v1.json').read_text(encoding='utf-8'))
for row in quick:
    q=next(q for q in pack['questions'] if q['id']==row['uid']);assert digest(q)==row['contentSha256']
    assert {f['key']:f['expected'] for f in q['fields']}==row['answers']
    ref=row['reference'];kind=ref['kind'];ans=row['answers'];uid=row['uid']
    if kind=='division':
        n,d=plain(ref['num']),plain(ref['den']);quot=s.div(n,d,x)[0]
        record(uid,'vertical pole',d.subs(x,plain(ans['h'])),0)
        record(uid,'oblique coefficients',quot,plain(ans['m'])*x+plain(ans['c']))
    elif kind=='hole':
        f=plain(ref['num'])/plain(ref['den']);record(uid,'hole ordinate',s.limit(f,x,plain(ans['x'])),plain(ans['y']))
    elif kind=='horizontal':
        f=plain(ref['num'])/plain(ref['den']);record(uid,'horizontal height',s.limit(f,x,s.oo),plain(ans['height']));record(uid,'crossing height',f.subs(x,plain(ans['x'])),plain(ans['height']))
    elif kind=='range':
        f=plain(ref['function']);record(uid,'complete output range',function_range(f,x,s.S.Reals-real_poles(f)),parse_set(ans['range']))
    elif kind=='stationary':
        f=plain(ref['function']);record(uid,'complete stationary inputs',stationary(f),s.FiniteSet(*(plain(v) for v in re.findall(r'\(([^,]+),',ans['points']))))
        for point in ans['points'].split(';'):
            a,b=point[1:-1].split(',');record(uid,'stationary ordinate',f.subs(x,plain(a)),plain(b))
    elif kind=='reconstruct':
        f=(plain(ans['a'])*x*x+plain(ans['b'])*x+plain(ans['c']))/(x-ref['h'])
        record(uid,'reconstructed asymptote',s.div(*s.fraction(f),x)[0],ref['gradient']*x+ref['intercept']);record(uid,'reconstructed point',f.subs(x,0),ref['y0'])
    elif kind=='parameter-hole':record(uid,'cancellation numerator',ref['h']**2+plain(ans['k']),0)
    elif kind=='parameter-stationary':record(uid,'no-stationary boundary',parse_set(ans['parameters']),s.Interval(-s.oo,-ref['h']**2))
    elif kind in ['inequality','absolute-inequality']:
        f=plain(ref['function']);right=plain(ref['right'])
        if kind=='absolute-inequality':f=f*f;right=right*right
        record(uid,'complete inequality set',rational_solution(f,ref['op'],right),parse_set(next(iter(ans.values()))))
    elif kind=='input-absolute':
        f=plain(ref['function']);positive=rational_solution(f,ref['op'],plain(ref['right']))&s.Interval(0,s.oo)
        record(uid,'reflected solution set',positive|s.imageset(s.Lambda(x,-x),positive),parse_set(ans['inputs']))
    elif kind=='reciprocal':
        f=plain(ref['function']);record(uid,'reciprocal expression',plain(ans['g'][0])/plain(ans['g'][1]),1/f)
        record(uid,'complete reciprocal exclusions',real_poles(f)|s.solveset(s.numer(s.together(f)),x,domain=s.S.Reals),parse_set(ans['excluded']))
    elif kind=='reciprocal-inequality':
        f=plain(ref['function']);record(uid,'complete reciprocal comparison',rational_solution(1/f-f,ref['op']),parse_set(ans['inputs']))
    else:truth(uid,'reviewed principle option',ans['choice']==ref['correct'] and ans['choice'] in q['fields'][0]['options'])
for q in pack['questions']:record(q['id'],'mark total',sum(c['marks'] for p in q['parts'] for c in p['marking_criteria']),q['marks'])
assert all('OWNER-'+q['id'] in coverage for q in owner)
assert all(e['verification'] in coverage for l in pack['lessons'] for e in l['examples'])
assert all(q['id'] in coverage for q in pack['questions'] if q['collection']!='exam')
parser=argparse.ArgumentParser();parser.add_argument('--owner');parser.add_argument('--report',default='.local/c2-rational-20261106/math.json');opts=parser.parse_args()
if opts.owner:assert hashlib.sha256(Path(opts.owner).read_bytes()).hexdigest()==pack['source']['sha256']
report=dict(checks=len(log),ownerQuestions=53,authoredExamples=20,quickChecks=40,failures=failures,coverage=coverage,log=log)
Path(opts.report).parent.mkdir(parents=True,exist_ok=True);Path(opts.report).write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps({k:v for k,v in report.items() if k not in ['log','coverage']}));raise SystemExit(1 if failures else 0)
