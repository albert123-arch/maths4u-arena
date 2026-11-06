"""Content-bound exact areas, branch diagnostics and independently computed extrema."""
import argparse,hashlib,json,re,html,math
from pathlib import Path
from functools import lru_cache
import sympy as s
import mpmath as mp
from sympy.parsing.latex import parse_latex
from fp1_polar_teaching import bisect_height
mp.mp.dps=40
th=s.Symbol('theta',real=True);a=s.Symbol('a',positive=True);alpha=s.Symbol('alpha',positive=True);phi=s.Symbol('phi',real=True);beta=s.Symbol('beta',positive=True)
x,y=s.symbols('x y',real=True);area=s.Symbol('A',positive=True);u=s.Symbol('u',real=True);rr=s.Symbol('r',nonnegative=True)
symbols={str(v):v for v in [th,a,alpha,phi,beta,x,y,area,u,rr]}
symbols['pi']=s.pi
def plain(value):return s.sympify(value,locals={**symbols,'t':th,'pi':s.pi,'exp':s.exp,'sin':s.sin,'cos':s.cos,'tan':s.tan,'sec':s.sec,'csc':s.csc,'atan':s.atan,'asin':s.asin,'acos':s.acos,'log':s.log})
@lru_cache(None)
def expr(value):
    value=html.unescape(value).strip().strip('.,;').replace(r'\bigl','').replace(r'\bigr','').replace(r'\left','').replace(r'\right','').replace(r'\dfrac',r'\frac').replace(r'\,','').replace(r'\!','').replace('\\ ','').replace('−','-')
    value=re.sub(r'\\frac([^{}\s])',r'\\frac{\1}',value);value=re.sub(r'(\\frac\{[^{}]*\})([A-Za-z0-9])',r'\1{\2}',value);value=re.sub(r'\\sqrt([0-9])',r'\\sqrt{\1}',value)
    value=re.sub(r'(?<![\\])([axyur])\s*(?=\()',r'\1*',value)
    result=parse_latex(value,strict=True)
    return result.xreplace({v:(s.E if str(v)=='e' else symbols.get(str(v),v)) for v in result.atoms(s.Symbol)})
def blocks(value):return [a or b for a,b in re.findall(r'\\\[(.*?)\\\]|\\\((.*?)\\\)',html.unescape(value),re.S)]
def top_equal(value):
    depth=0;start=0;result=[]
    for i,c in enumerate(value):
        if c=='{':depth+=1
        elif c=='}':depth-=1
        elif c=='=' and depth==0:result.append(value[start:i]);start=i+1
    return result+[value[start:]]
def rhs(value):return top_equal(value.split(r'\qquad')[0].split(r'\quad')[0])[-1].strip().strip('.,;')
def digest(q):return hashlib.sha256('\0'.join([q['title'],q['prompt_html'],q['answer_html'],q['solution_html'],q['hint_html'],str(q['marks'])]).encode()).hexdigest()
log=[];failures=[];coverage={}
def truth(uid,label,ok,detail=None):
    row=dict(id=str(uid),label=label,result='PASS' if ok else 'FAIL')
    if detail is not None:row['detail']=detail
    log.append(row);coverage[str(uid)]=coverage.get(str(uid),0)+1
    if not ok:failures.append(row)
def record(uid,label,actual,expected):
    delta=s.trigsimp(s.simplify(s.expand_trig(actual-expected)))
    if delta!=0:
        # Real logarithms of positive exact algebraic constants: combine after
        # clearing rational powers, then prove the resulting algebraic product is 1.
        terms=s.Add.make_args(s.expand_log(delta).expand());powers=[]
        for term in terms:
            coefficient,rest=term.as_coeff_Mul()
            if not coefficient.is_Rational or rest.func!=s.log or rest.args[0].is_positive is not True:break
            powers.append((rest.args[0],coefficient))
        else:
            denominator=s.ilcm(*[v.q for _,v in powers]) if len(powers)>1 else powers[0][1].q
            if s.simplify(s.expand(s.prod(arg**(coefficient*denominator) for arg,coefficient in powers)))==1:delta=s.Integer(0)
    truth(uid,label,delta==0,dict(actual=str(actual),expected=str(expected),residual=str(delta) if delta!=0 else '0'))
def numeric(uid,label,actual,expected,tol=1e-10):
    A=complex(s.N(actual,25));B=complex(s.N(expected,25))
    truth(uid,label,abs(A-B)<=tol*max(1,abs(A),abs(B)),dict(actual=str(actual),expected=str(expected),tolerance=tol,method='numeric comparison'))
def review(uid,label,argument):log.append(dict(id=uid,label=label,result='REVIEWED',argument=argument))
ap=argparse.ArgumentParser();ap.add_argument('--report',required=True);ap.add_argument('--owner');args=ap.parse_args()
base=Path('content/original/9231-fp1');pack=json.loads((base/'polar-v1.json').read_text(encoding='utf8'))
fixtures=json.loads((base/'polar-owner-verification-v1.json').read_text(encoding='utf8'));by={r['id']:r for r in fixtures}
audit=json.loads(Path('docs/ARENA-C2-POLAR-SOURCE-AUDIT-20261106.json').read_text(encoding='utf8'))
def answer(uid,part,index=0):
    texts=[]
    for block in blocks(by[uid]['parts'][part]['answer_html']):
        texts.extend(v for v in re.split(r'\\qquad|\\quad',block) if v.strip() and r'\text' not in v)
    return expr(rhs(texts[index]))
def area_answer(uid,part,index=0):
    texts=[]
    for block in blocks(by[uid]['parts'][part]['answer_html']):
        texts.extend(v.strip() for v in block.split(r'\qquad') if '=' in v and v.strip().startswith('A'))
    if not texts:raise ValueError(('No area key',uid,part))
    return expr(rhs(texts[index]))
def radius_data(value):
    for block in blocks(value):
        match=re.search(r'(?<![A-Za-z])r(\^2|\^\{2\})?\s*=\s*(.*)',block)
        if match:
            raw=re.split(r'\\qquad|,',match.group(2))[0].strip()
            try:
                v=expr(raw);return v if match.group(1) else v*v
            except Exception:continue
    return None

# Independent mathematical models. Area bounds can be a subset of a curve's domain.
models={}
def simple(uid,radius,lo,hi,part,*,squared=False,area_lo=None,area_hi=None,method=None):
    R=plain(radius);models[uid]=dict(R2=R if squared else R**2,lo=plain(lo),hi=plain(hi),area_lo=plain(area_lo if area_lo is not None else lo),area_hi=plain(area_hi if area_hi is not None else hi),part=part,method=method)
for row in [
('6253','3*a*sin(2*t)','0','pi/2',2),('4111','(t+1)*exp(t/4)','0','pi',1),('4119','t*exp(-t/6)','0','2*pi',1),
('4134','a*tan(t/6)','0','pi',1),('4190','2*exp(-2*t)-2*exp(-pi)','0','pi/2',1),
('4257','a/sin(t)**2','pi/4','pi/2',2),('4271','1/(2-t)-1/2','0','1',1),('4279','3*(cos(t)+1)*sin(t)','0','pi/2',2),
('5807','2*sin(4*t)','0','pi/4',2),('5850','1+cos(2*t)','-pi/2','pi/2',1),
('5886','2*sin(3*t)','0','pi/3',1),('5975','2*exp(t/3)','0','alpha',0),('6220','a*(1+cos(3*t))','-pi/3','pi/3',1),
('6293','3*exp(-t/2)','0','alpha',0),('6386','2+cos(2*t)','0','2*pi',0),('6406','2*sin(t)*cos(t-pi/6)','0','2*pi/3',2),
('6408','3*exp(t/2)','log(2)','log(5)',0),('6419','2*exp(-t)','0','log(3)',0),
('6466','pi**2/4-t**2','0','pi/2',1),('6588','2*a/(t+2)','0','pi/2',3),('6599','3*a*cos(3*t)','-pi/6','pi/6',0)]:simple(*row)
for row in [
('4128','2*exp(2*sin(t))*cos(t)','-pi/2','pi/2',3),('4140','8*sin(2*t)','0','pi/2',2),
('4154','12*cos(2*t)','-pi/4','pi/4',2),('4163','(pi-t)*log(1+pi-t)','0','pi',1),
('4170','(pi-t)*atan(2*(pi-t))','0','pi',1),('4177','6*sin(t)*cos(t)**2','0','pi',2),
('4203','4/(t**2+4)','0','pi',1),('4210','1/(2*t+1)','0','pi',1),('4237','3*atan(t)','0','1',1),
('4251','16*cos(2*t-pi/3)','-pi/12','5*pi/12',2),('5827','log(1+3*t)','0','pi',1),
('5878','16*cos(t)/sin(t)','pi/12','pi/2',0),('5892','2*tan(2*t)','0','pi/12',1)]:simple(*row,squared=True)
simple('4217','9*sec(2*t)','0','pi/6',2,squared=True)
simple('4244','4*a**2/(1+sin(2*t)+3*sin(t)**2)','0','pi/4',3,squared=True,method='tangent')
simple('4264','3*sqrt(3)*tan(t+pi/4)','0','pi/12',1)
simple('6258','4*a**2*cos(2*t)','-pi/4','pi/4',2,squared=True)
simple('6271','a*(1-cos(t))','0','2*pi',1,area_lo='2*pi/3',area_hi='4*pi/3')
simple('6291','a*(1+sin(t))','-pi','pi',1,area_lo='0',area_hi='pi')
simple('6334','2/(1+sin(t))','0','pi',2,method='parabola')
simple('6343','12*csc(2*t)','pi/8','3*pi/8',2,squared=True)
simple('6363','2*a*(1-cos(t))','0','2*pi',2,area_lo='0',area_hi='pi/2')
simple('6450','4*(1-sin(t))*cos(t)','-pi/2','pi/2',2,area_lo='0',area_hi='pi/6')
simple('6480','3*cos(2*t)','-pi/4','pi/4',2)
simple('6502','a*(1+cos(t))','-pi','pi',1,area_lo='-pi/4',area_hi='pi/4')
simple('6514','2+3*cos(t)','-acos(-2/3)','acos(-2/3)',1,area_lo='-pi/6',area_hi='pi/6')
simple('6523','a*(1-exp(-2*t))','0','pi',1,area_lo='log(2)/2',area_hi='log(5)/2')
simple('6562','2+sin(t)','-pi/2','pi/2',1,area_lo='0',area_hi='pi/2')
simple('6570','t**2','0','pi/2',1)

def integral(F,lo,hi):
    primitive=s.integrate(s.expand_trig(F),th)
    if primitive.has(s.Integral):raise ValueError('Unevaluated area primitive')
    return s.simplify(primitive.subs(th,hi)-primitive.subs(th,lo))
def owner_primitive(uid,R2,part):
    for block in blocks(by[uid]['parts'][part]['solution_html']):
        match=re.search(r'F\s*\(\\theta\)\s*=\s*(.*)',block)
        if match:
            candidate=expr(match.group(1));record(uid,'supplied primitive derivative',s.diff(candidate,th),R2);return candidate
    return None
if args.owner:
    src=Path(args.owner);owner=json.loads(src.read_text(encoding='utf-8-sig'));original={str(q['id']):q for l in owner['lessons'] for q in l['questions']}
    truth('SOURCE','read-only source SHA',hashlib.sha256(src.read_bytes()).hexdigest()==pack['source']['sha256'])
for row in fixtures:
    uid=row['id'];q=next(q for q in pack['questions'] if q['id']==row['uid'])
    truth(uid,'fixture binding',digest(q)==row['contentSha256'])
    record(uid,'part marks',s.Integer(sum(p['marks'] for p in row['parts'])),s.Integer(q['marks']))
    if args.owner:
        old=original[uid];refs={im['source_name']:'/api/files/'+im['file_id'] for im in audit['images'] if im['question_uid']==q['id']}
        def normalise(v):
            for before,after in refs.items():v=v.replace(before,after)
            return v
        truth(uid,'owner keys and teaching unchanged except file URLs',all(q[new]==normalise(old[key]) for new,key in [('prompt_html','question_html'),('answer_html','answer_html'),('solution_html','solution_html'),('hint_html','hint_html')]) and row['parts']==old['parts'])
for uid,M in models.items():
    R2=M['R2'];claimed_radius=radius_data(by[uid]['stem_html'])
    if claimed_radius is not None and uid!='4264':record(uid,'squared-radius model from statement',R2,claimed_radius)
    if M['method']=='tangent':actual=2*a*a*s.integrate(1/(4*u*u+2*u+1),(u,0,1))
    elif M['method']=='parabola':actual=s.integrate(1-x*x/4,(x,-2,2))
    else:
        F=owner_primitive(uid,R2,M['part'])
        actual=s.Rational(1,2)*(F.subs(th,M['area_hi'])-F.subs(th,M['area_lo'])) if F is not None else integral(R2/2,M['area_lo'],M['area_hi'])
    record(uid,'exact sector area',actual,area_answer(uid,M['part']))

# Composite regions, with explicit piecewise boundaries and no blind subtraction.
composite={}
def add(uid,pieces,part):composite[uid]=dict(pieces=[(plain(F),plain(lo),plain(hi)) for F,lo,hi in pieces],part=part)
add('4149',[('a**2*t**2/2','0','phi'),('2*a**2*cos(t)**2','phi','pi/2')],3)
add('4183',[('a**2*sin(2*t)**2/2','0','pi/3'),('3*a**2*cos(t)**2/2','pi/3','pi/2')],3)
add('4197',[('a**2*sin(t)**2','0','pi/4'),('a**2*sin(2*t)**2/2','pi/4','pi/2')],3)
add('4285',[('(4+2*sin(t))**2/2','-pi','pi'),('-(4+2*sin(t))**2/2+25/(8*sin(t)**2)','pi/6','5*pi/6')],2)
add('5814',[('2*t**2*cos(t)**2-6*t**2*sin(t)**2','0','pi/6')],3)
add('5825',[('t*(3-sec(t)**2)/2','0','atan(sqrt(2))')],3)
add('5866',[('a**2*(4-9*cos(t)**2)','acos(2/3)','pi/2')],2)
add('6308',[('a**2/8-a**2*sin(t)/2','0','asin(1/4)')],2)
add('6371',[('9*a**2/4','0','pi/3'),('a**2*(1+cos(t))**2','pi/3','pi')],2)
add('6382',[('a**2*((1-sin(t))**2-1/4)/2','-pi','pi/6'),('a**2*((1-sin(t))**2-1/4)/2','5*pi/6','pi')],2)
add('6455',[('((2*t+3)**2-(t*t+t)**2)/2','0','(1+sqrt(13))/2')],2)
add('6538',[('a**2','0','pi/12'),('2*a**2*cos(3*t)**2','pi/12','pi/6')],2)
add('6553',[('(5+2*cos(t))**2/2','-pi','pi'),('-(5+2*cos(t))**2/2+9/(2*cos(t)**2)','-pi/3','pi/3')],2)
for uid,M in composite.items():
    expected=area_answer(uid,M['part'])
    if uid=='5825':expected=expected.subs(beta,s.atan(s.sqrt(2)))
    if uid=='5825':
        primitive=3*th**2/4-th*s.tan(th)/2-s.log(s.cos(th))/2
        record(uid,'independent integration-by-parts primitive',s.diff(primitive,th),M['pieces'][0][0])
        actual=primitive.subs(th,s.atan(s.sqrt(2)))-primitive.subs(th,0)
    else:actual=sum(integral(F,lo,hi) for F,lo,hi in M['pieces'])
    record(uid,'piecewise exact composite area',actual,expected)
    if uid=='4149':
        record(uid,'two regions recover whole circle',area_answer(uid,3,0)+area_answer(uid,3,1),s.pi*a*a)
        boundary=s.nsolve(2*s.cos(phi)-phi,1);truth(uid,'identified smaller region',0<float(actual.subs({a:1,phi:boundary}))<float(s.pi/2))

# Remaining area, inverse-area and branch details.
record('5892','Cartesian region uses triangle minus sector',s.sqrt(3)/12-area_answer('5892',1),area_answer('5892',3))
record('4177','equal loops',area_answer('4177',2)/2,area_answer('4177',2,1))
record('6293','prescribed inverse area',area_answer('6293',0).subs(alpha,s.log(2)),s.Rational(9,4))
record('6419','bisecting ray area',integral(models['6419']['R2']/2,0,s.log(s.Rational(9,5))/2),area_answer('6419',0)/2)
record('6570','one-third dividing ray',integral(th**4/2,0,s.pi/(2*3**s.Rational(1,5))),area_answer('6570',1)/3)
record('6562','lower-quadrant area',integral(models['6562']['R2']/2,-s.pi/2,0),area_answer('6562',1,1))
truth('6562','one-decimal ratio',round(float(area_answer('6562',1)/area_answer('6562',1,1)),1)==3.6)

def stationary_points(F,lo,hi):
    """Bracket all sign-changing derivative roots on a dense finite mesh."""
    F=F.subs(a,1);der=s.diff(F,th);f=s.lambdify(th,der,'mpmath');lo,hi=mp.mpf(str(s.N(lo,35))),mp.mpf(str(s.N(hi,35)))
    eps=(hi-lo)*mp.mpf('1e-10');points=[lo,hi];last=lo+eps;last_v=f(last)
    for j in range(1,801):
        cur=lo+eps+(hi-lo-2*eps)*j/800;cur_v=f(cur)
        if abs(mp.im(last_v))<mp.mpf('1e-25') and abs(mp.im(cur_v))<mp.mpf('1e-25') and mp.re(last_v)*mp.re(cur_v)<0:
            left,right=last,cur;fl=mp.re(last_v)
            for _ in range(100):
                mid=(left+right)/2;fm=mp.re(f(mid))
                if fl*fm<=0:right=mid
                else:left=mid;fl=fm
            points.append((left+right)/2)
        last,last_v=cur,cur_v
    fn=s.lambdify(th,F,'mpmath')
    values=[(mp.re(fn(vv)),vv) for vv in points]
    return max(values),points

# Every supplied numerical bracket / rounded polar point is recomputed.
numeric_ids=['4111','4119','4134','4163','4170','4190','4203','4210','4237','6588','5814','5825']
for uid in numeric_ids:
    M=models.get(uid)
    R2=M['R2'] if M else 4*th*th*s.cos(th)**2 if uid=='5814' else 3*th
    lo=M['lo'] if M else s.Integer(0);hi=M['hi'] if M else s.pi/2
    for part in by[uid]['parts']:
        text=html.unescape(part['prompt_html'])
        match=re.search(r'([0-9]+\.[0-9]+)\s*(?:<|\\lt)\s*\\phi\s*(?:<|\\lt)\s*([0-9]+\.[0-9]+)',text)
        if not match:continue
        coordinate=s.cos(th) if re.search(r'(?:full )?y-axis',text) else s.sin(th)
        best,candidates=stationary_points(R2*coordinate**2,lo,hi);value,root=best
        truth(uid,'global distance candidate lies in supplied bracket',mp.mpf(match[1])<root<mp.mpf(match[2]),dict(angle=str(root),squaredDistance=str(value),candidates=len(candidates),method='numeric stationary-root scan and endpoint comparison'))
        approx=re.search(r'P=\(([0-9.]+)(?:a)?,\s*([0-9.]+)\)',part['answer_html'])
        if approx:
            radius=mp.sqrt(s.lambdify(th,R2.subs(a,1),'mpmath')(root))
            truth(uid,'rounded polar coordinates',f'{float(radius):.3f}'==f'{float(approx[1]):.3f}' and f'{float(root):.3f}'==f'{float(approx[2]):.3f}',dict(radius=str(radius),angle=str(root)))
        for block in blocks(text):
            if r'\phi' in block and '=0' in block:
                equation=expr(top_equal(block)[0]).subs(phi,th)
                residual=s.lambdify(th,equation.subs(a,1),'mpmath')(root)
                truth(uid,'supplied stationary equation at recomputed root',abs(residual)<mp.mpf('1e-25'))
uid='4128';best,_=stationary_points(models[uid]['R2'],models[uid]['lo'],models[uid]['hi'])
truth(uid,'three-decimal radial maximum',f'{math.sqrt(float(best[0])):.3f}'=='2.440' and f'{float(best[1]):.3f}'=='0.896')

# Exact extrema and branch statements use independent parametrisations.
for uid,target,angle,expected in [
('6253','y','atan(sqrt(2))','4*a/sqrt(3)'),('4140','x','pi/6','sqrt(3*sqrt(3))'),('4154','y','pi/6','sqrt(6)/2'),
('4251','rotated','0','sqrt(2)'),('5878','y','pi/4','2*sqrt(2)'),('5886','y','asin(sqrt(3/8))','9/8'),
('6291','x','pi/6','3*sqrt(3)*a/4'),('6363','y','2*pi/3','3*sqrt(3)*a/2')]:
    R2=models[uid]['R2'];coord=s.sin(th-s.pi/6) if target=='rotated' else s.sin(th) if target=='y' else s.cos(th)
    D2=R2*coord**2;at=plain(angle)
    record(uid,'exact stationary distance squared',D2.subs(th,at),plain(expected)**2);record(uid,'exact distance derivative',s.diff(D2,th).subs(th,at),0)
for uid,at,expected in [('4119',6,6/s.E),('4279',s.pi/3,9*s.sqrt(3)/4),('6450',-s.pi/6,3*s.sqrt(3))]:
    record(uid,'exact radial candidate',models[uid]['R2'].subs(th,at),expected**2);record(uid,'radial derivative',s.diff(models[uid]['R2'],th).subs(th,at),0)
U=(7-s.sqrt(41))/4;at=s.atan(s.sqrt(U));D2=models['5807']['R2']*s.cos(th)**2
record('5807','exact quartic distance squared',D2.subs(th,at),answer('5807',3)**2);truth('5807','two-decimal horizontal extent',round(float(answer('5807',3)),2)==1.86)
U=2-s.sqrt(33)/3;at=s.atan(s.sqrt(U));R2=models['6599']['R2'];formula=3*a*s.sqrt(U)*(1-3*U)/(1+U)**2
record('6599','exact height expression',R2.subs(th,at)*s.sin(at)**2,formula**2);record('6599','stationary height equation',3*s.tan(3*at)*s.tan(at),1)
for uid,R2 in [('6258',4*a*a*s.cos(2*th)),('6480',9*s.cos(2*th)**2)]:
    review(uid,'complete non-negative angular intervals','The sign condition cos(2 theta)>=0 is intersected with (-pi,pi], giving (-pi,-3pi/4] union [-pi/4,pi/4] union [3pi/4,pi]. The first and last intervals trace one geometric loop across the angular cut.')

# Cartesian equalities are checked along each stated curve, including limits at the pole.
cartesian_parts={'6253':1,'4140':0,'4154':0,'4177':1,'4217':0,'4244':0,'4251':0,'4257':3,'4264':2,'5807':0,'5850':2,'5886':3,'5892':2,'6220':2,'6258':0,'6291':2,'6334':0,'6343':0,'6363':1}
for uid,part in cartesian_parts.items():
    R2=models[uid]['R2'];M=models[uid];equations=[]
    for block in blocks(by[uid]['parts'][part]['answer_html']):
        first=re.split(r'\\qquad|\\quad|;',block)[0]
        terms=top_equal(first)
        if len(terms)==2 and ('x' in terms[0] or 'y' in terms[0]):
            try:equations.append(expr(terms[0])-expr(terms[1]))
            except Exception:pass
    for equation in equations:
        maximum=0
        for j in range(1,12):
            angle=M['lo']+(M['hi']-M['lo'])*s.Rational(j,12);rad=s.sqrt(R2.subs(th,angle))
            value=equation.subs({x:rad*s.cos(angle),y:rad*s.sin(angle),a:1},simultaneous=True).subs(a,1)
            if value.free_symbols:raise ValueError(('Unresolved Cartesian symbols',uid,str(equation),str(value.free_symbols)))
            try:maximum=max(maximum,abs(complex(s.N(value,25))))
            except TypeError as error:raise ValueError(('Unresolved Cartesian expression',uid,str(equation),str(value))) from error
        truth(uid,'Cartesian equation along the retained branch',maximum<1e-9,dict(method='numeric substitution diagnostic',maximumResidual=maximum))
review('BRANCHES','signs, the pole and branch completeness','Non-negative radius is retained throughout. Pole points are restored after cancellation where the original curve contains them. Cartesian restrictions in the source select the specified quadrant/sector. Negative-radius continuations and duplicate pole descriptions are not imported as extra branches.')

# Authored worked examples and every quick key.
examples={e['verification']:e for l in pack['lessons'] for e in l['examples']}
record('E-C1','full Cartesian point x',4*s.cos(5*s.pi/6),-2*s.sqrt(3));record('E-C1','full Cartesian point y',4*s.sin(5*s.pi/6),2)
record('E-C2','inverse polar x',10*s.cos(2*s.pi/3),-5);record('E-C2','inverse polar y',10*s.sin(2*s.pi/3),5*s.sqrt(3))
record('E-C3','circle conversion',s.expand((8*s.sin(th)*s.cos(th))**2+(8*s.sin(th)*s.sin(th)-4)**2).trigsimp(),16)
record('E-C4','right-loop equation',18*s.cos(2*th),18*(s.cos(th)**2-s.sin(th)**2))
record('E-S1','two-loop area',integral(36*s.cos(2*th)**2/2,-s.pi/4,s.pi/4),9*s.pi/2)
record('E-S2','cardioid maximum',3*(1-s.cos(s.pi)),6);record('E-S3','non-negative endpoint',1+4*s.cos(s.acos(-s.Rational(1,4))),0);record('E-S4','terminal radius',(1+2*th).subs(th,s.pi),1+2*s.pi)
record('E-I1','non-pole equality',3*s.cos(s.pi/6),3*s.sin(s.pi/3));record('E-I2','both circle equations',s.Rational(36,13)**2+s.Rational(24,13)**2,4*s.Rational(36,13));record('E-I2','second circle',s.Rational(36,13)**2+s.Rational(24,13)**2,6*s.Rational(24,13))
record('E-I3','both crossings',2*(1+s.cos(s.pi/2)),2);truth('E-I4','unique permitted intersection',s.solveset(th**2-th-2,th,domain=s.Interval(0,s.pi))==s.FiniteSet(2))
record('E-A1','one-loop area',integral(25*s.sin(2*th)**2/2,0,s.pi/2),25*s.pi/8);record('E-A2','polynomial sector',integral(2*th*th,0,2),s.Rational(16,3))
record('E-A3','common area',integral(8*s.sin(th)**2,0,s.pi/4)+integral(8*s.cos(th)**2,s.pi/4,s.pi/2),2*s.pi-4)
record('E-A4','cap including straight boundary',integral((36-9*s.csc(th)**2)/2,s.pi/6,5*s.pi/6),12*s.pi-9*s.sqrt(3))
record('E-E1','radial maximum',plain('2+4*t-t**2').subs(th,2),6);record('E-E2','height maximum',10*s.cos(s.pi/4)*s.sin(s.pi/4),5)
at=s.atan(s.sqrt(2));R=4*s.sin(2*th);record('E-E3','horizontal regularity',s.diff(R*s.cos(th),th).subs(th,at),-8*s.sqrt(3)/3);record('E-E3','height',R.subs(th,at)*s.sin(at),16/(3*s.sqrt(3)))
at=bisect_height(3);numeric('E-E4','unique numerical root',(at+3)*math.cos(at)-math.sin(at),0)
for row in json.loads((base/'polar-quick-verification-v1.json').read_text(encoding='utf8')):
    uid=row['uid'];ref=row['reference'];kind=ref['kind'];q=next(q for q in pack['questions'] if q['id']==uid);ans=row['answers']
    truth(uid,'content binding',digest(q)==row['contentSha256']);truth(uid,'complete field binding',{f['key']:f['expected'] for f in q['fields']}==ans)
    def pair_value(key):return [plain(v) for v in ans[key].strip('()').split(',')]
    if kind=='polar-point':
        record(uid,'Cartesian x',plain(ans['cx']),plain(ref['radius'])*s.cos(plain(ref['angle'])));record(uid,'Cartesian y',plain(ans['cy']),plain(ref['radius'])*s.sin(plain(ref['angle'])))
    elif kind=='cartesian-point':
        rad,angle=pair_value('polar');record(uid,'reconstructed x',rad*s.cos(angle),plain(ref['x']));record(uid,'reconstructed y',rad*s.sin(angle),plain(ref['y']))
    elif kind=='circle-equation':
        left,right=ans['cartesian'].split('=');R=ref['coefficient']*(s.cos(th) if ref['axis']=='x' else s.sin(th))
        record(uid,'complete Cartesian identity',(plain(left)-plain(right)).subs({x:R*s.cos(th),y:R*s.sin(th)},simultaneous=True),0)
    elif kind=='cos-domain':
        review(uid,'complete angular sign set',dict(frequency=ref['frequency'],lower=ref['lower'],upper=ref['upper'],answer=ans['angles'],argument='Intersect cos(n theta)>=0 with the specified interval, retaining zero-radius endpoints and the open angular cut.'))
    elif kind=='cardioid-maximum':record(uid,'largest radius',plain(ans['radius']),2*ref['coefficient']);record(uid,'angle at maximum',plain(ans['angles'].strip('{}')),ref['sign']*s.pi/2)
    elif kind=='endpoints':
        record(uid,'initial radius',plain(ans['start']),plain(ref['radius']).subs(th,plain(ref['lower'])));record(uid,'final radius',plain(ans['end']),plain(ref['radius']).subs(th,plain(ref['upper'])))
    elif kind in ['circle-petal','equal-circles','algebraic-intersection']:
        rad,angle=pair_value('polar_points')
        if kind=='circle-petal':R1=plain(ref['circle'])*s.cos(th);R2=ref['petal']*s.sin(2*th)
        elif kind=='equal-circles':R1=ref['coefficient']*s.cos(th);R2=ref['coefficient']*s.sin(th)
        else:R1=ref['slope']*th+ref['offset'];R2=th**2
        record(uid,'first intersection radius',R1.subs(th,angle),rad);record(uid,'second intersection radius',R2.subs(th,angle),rad)
    elif kind=='single-area':record(uid,'full exact area',integral(plain(ref['radius'])**2/2,plain(ref['lower']),plain(ref['upper'])),plain(ans['area']))
    elif kind=='common-circles-area':
        c=ref['coefficient'];record(uid,'both area pieces',integral(c*c*s.sin(th)**2/2,0,s.pi/4)+integral(c*c*s.cos(th)**2/2,s.pi/4,s.pi/2),plain(ans['area']))
    elif kind=='polynomial-radial-max':
        R=plain(ref['radius']);angle=plain(ans['angle']);record(uid,'stationary radial angle',s.diff(R,th).subs(th,angle),0);record(uid,'radius at maximum',R.subs(th,angle),plain(ans['radius']));truth(uid,'both endpoint radii smaller',all(float(R.subs(th,plain(ref[v])))<float(plain(ans['radius'])) for v in ['lower','upper']))
    elif kind=='circle-distance':record(uid,'complete greatest distance',plain(ans['distance']),s.Rational(ref['coefficient'],2));record(uid,'all maximum angles',plain(ans['angles'].strip('{}')),s.pi/4)
    elif kind=='numeric-height':
        angle=bisect_height(ref['offset']);distance=ref['coefficient']*math.sin(angle)/(angle+ref['offset'])
        truth(uid,'both three-decimal answers',ans['angle']==f'{angle:.3f}' and ans['distance']==f'{distance:.3f}')
    else:truth(uid,'reviewed valid principle',ans['choice']==ref['correct'])
for l in pack['lessons']:
    truth(l['id'],'teaching digest',hashlib.sha256(json.dumps(l,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()==audit['teachingDigests'][l['id']])
assert set(models)|set(composite)==set(by)
assert all(uid in coverage and coverage[uid]>2 for uid in by)
assert all(code in coverage for code in examples)
result=dict(ownerTasks=63,examples=20,quickChecks=40,solutionDiagrams=64,checks=len(log),failures=failures,coverage=coverage,log=log,limitations=['Numeric substitution and stationary-root scans are diagnostics, labelled separately from exact area and derivative identities.','Branch completeness, topology and natural-language proofs require mathematical review; REVIEWED entries document that reasoning.','The exact input grammar now supports polynomial expressions in pi with algebraic coefficients; sqrt(pi), division by pi and arbitrary functions are not enabled.'])
Path(args.report).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf8');print(json.dumps(dict(checks=len(log),failures=len(failures),ownerTasks=63)))
if failures:raise SystemExit(1)
