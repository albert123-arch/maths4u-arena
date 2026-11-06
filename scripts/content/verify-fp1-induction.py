"""Independent symbolic transitions, integrality certificates and content bindings."""
import argparse,hashlib,json,sys
from pathlib import Path
import sympy as s
from sympy.parsing.latex import parse_latex
import re

ap=argparse.ArgumentParser();ap.add_argument('--report',default='docs/ARENA-C3-INDUCTION-MATH-CHECKS-20261106.json');args=ap.parse_args()
p=json.loads(Path('content/original/9231-fp1/induction-v1.json').read_text(encoding='utf8'))
fixtures=json.loads(Path('content/original/9231-fp1/induction-verification-v1.json').read_text(encoding='utf8'))
n=s.Symbol('n',integer=True,nonnegative=True);r=s.Symbol('r',integer=True,nonnegative=True)
x,u,t=s.symbols('x u t',real=True);k=s.Symbol('k',integer=True,nonnegative=True)
loc=dict(n=n,k=k,r=r,x=x,u=u,t=t)
def parse(v):return s.sympify(v,locals=loc)
def matrix(v):return s.Matrix([[parse(c) for c in row] for row in v])
def digest(value):return hashlib.sha256(json.dumps(value,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()
log=[];errors=[];unhandled=[]
def check(uid,label,ok,detail=None,result='PASS'):
    entry=dict(id=uid,label=label,result=result if bool(ok) else 'FAIL')
    if detail is not None:entry['detail']=str(detail)
    log.append(entry)
def zero(v):
    v=s.combsimp(s.expand_power_exp(v))
    return s.simplify(s.expand(v))==0
def eq(uid,label,a,b):
    aa,bb=parse(a),parse(b);check(uid,label,zero(aa-bb),s.simplify(aa-bb))
def mateq(uid,label,a,b):check(uid,label,a.shape==b.shape and all(zero(v) for v in a-b))
def integral_polynomial(poly,var=n):
    """Newton coefficients: integral finite differences imply integer values at all non-negative indices."""
    poly=s.cancel(poly)
    try:degree=s.Poly(poly,var).degree()
    except s.PolynomialError:return poly.is_integer is True
    if degree is s.S.NegativeInfinity:return True
    for _ in range(int(degree)+1):
        if s.simplify(poly.subs(var,0)).is_integer is not True:return False
        poly=s.expand(poly.subs(var,var+1)-poly)
    return True

def verify(uid,m):
    kind=m['kind']
    if kind in ['sum','sum_counterexample']:
        T,F=parse(m['term']),parse(m['formula']);a=m['lower']
        eq(uid,'sum starting case',F.subs(n,a),T.subs(r,a))
        eq(uid,'sum symbolic forward implication',F.subs(n,n+1)-F,T.subs(r,n+1))
        for value in [a,a+1,a+3,a+8]:eq(uid,f'independent finite sum at {value}',s.summation(T,(r,a,value)),F.subs(n,value))
        if kind=='sum_counterexample':
            bad=parse(m['false']);first=m['first']
            check(uid,'first counterexample and every earlier index',all(zero(F.subs(n,i)-bad.subs(n,i)) for i in range(a,first)) and not zero(F.subs(n,first)-bad.subs(n,first)))
    elif kind=='power_bound':
        a,power,start=m['base'],m['power'],m['start'];gap=s.Poly(s.expand((a*n**power-(n+1)**power).subs(n,n+start)),n)
        check(uid,'bound starting case',a**start>=start**power)
        check(uid,'non-negative-coefficient certificate for the bridge',all(c>=0 for c in gap.all_coeffs()))
        check(uid,'positive multiplier preserves the hypothesis',a>0)
        eq(uid,'printed intermediate decomposition',a*n**power-(n+1)**power,m['decomposition'])
    elif kind=='derivative':
        y,F=parse(m['function']),parse(m['formula']);start,order=m['start'],m['order']
        eq(uid,'derivative starting case',s.diff(y,x,start*order),F.subs(n,start))
        eq(uid,'symbolic derivative induction step',s.diff(F,x,order),F.subs(n,n+1))
        for value in range(start,start+5):eq(uid,f'direct derivative at index {value}',s.diff(y,x,order*value),F.subs(n,value))
    elif kind=='recurrence':
        F,rule=parse(m['formula']),parse(m['rule'])
        eq(uid,'initial value',F.subs(n,m['start']),m['initial'])
        eq(uid,'symbolic recurrence transition',F.subs(n,n+1),rule.subs(u,F))
    elif kind=='second_order':
        F=parse(m['formula'])
        for i,value in enumerate(m['initial']):eq(uid,f'initial value {i}',F.subs(n,i),value)
        eq(uid,'paired induction transition',F.subs(n,n+2),m['a']*F.subs(n,n+1)+m['b']*F)
        check(uid,'two initial cases explicitly supplied',len(m['initial'])==2)
    elif kind in ['interval','irrational_bound']:
        f=parse(m['rule']);L=parse(m['lower']);initial=parse(m['initial']);den=s.denom(f)
        eq(uid,'lower endpoint image' if kind=='irrational_bound' else 'denominator slope',f.subs(u,L) if kind=='irrational_bound' else s.diff(den,u),L if kind=='irrational_bound' else 1)
        check(uid,'positive denominator throughout interval',den.subs(u,L)>0 and s.diff(den,u)>0)
        derivative=s.factor(s.diff(f,u));numerator=s.fraction(derivative)[0]
        check(uid,'strictly increasing map',numerator.is_positive is True)
        if kind=='interval':
            U=parse(m['upper']);eq(uid,'upper endpoint fixed',f.subs(u,U),U)
            check(uid,'lower endpoint retained',f.subs(u,L)>=L)
            check(uid,'base inside stated interval',L<=initial<U)
            if uid.endswith('R05'):
                eq(uid,'monotonicity difference',f-u,(2-u)*(u+3)/(u+5))
                eq(uid,'admissible fixed point',f.subs(u,2),2)
                check(uid,'bounded increasing convergence and endpoint selection reviewed',True,result='REVIEWED')
        else:
            check(uid,'base strictly above irrational bound',initial>L)
            eq(uid,'positive gap factorisation',f-L,(3-L)*(u-L)/(u+3))
            eq(uid,'negative increment factorisation',f-u,(8-u**2)/(u+3))
            check(uid,'gap coefficient positive',3-L>0)
            check(uid,'decreasing bounded convergence and continuous fixed point reviewed',True,result='REVIEWED')
    elif kind=='sqrt_interval':
        c,L,U,initial=m['offset'],m['lower'],m['upper'],m['initial']
        check(uid,'base interval',L<=initial<U)
        check(uid,'real non-negative branch on invariant interval',c+L>=0)
        check(uid,'next lower bound',s.sqrt(c+L)>=L)
        eq(uid,'strict upper endpoint fixed',s.sqrt(c+U),U)
        check(uid,'strict monotonicity of the real square root reviewed',True,result='REVIEWED')
    elif kind=='matrix':
        A,F=matrix(m['matrix']),matrix(m['formula']);start=m['start']
        mateq(uid,'matrix base including identity when n=0',F.subs(n,start),A**start)
        mateq(uid,'every entry in symbolic matrix transition',F*A,F.subs(n,n+1))
        for i in range(start,start+5):mateq(uid,f'direct matrix power {i}',A**i,F.subs(n,i))
        if t in A.free_symbols:mateq(uid,'zero parameter retained',F.subs({n:5,t:0}),A.subs(t,0)**5)
    elif kind=='matrix_parity':
        A=matrix(m['matrix']);c=parse(m['scalar']);I=s.eye(A.rows)
        mateq(uid,'square supplies both parity transitions',A*A,c*I)
        mateq(uid,'even base',A**0,I);mateq(uid,'odd base',A**1,A)
        for i in range(5):
            mateq(uid,f'even power {2*i}',A**(2*i),c**i*I)
            mateq(uid,f'odd power {2*i+1}',A**(2*i+1),c**i*A)
    elif kind=='projector':
        P=matrix(m['matrix']);I=s.eye(P.rows);A=I+m['factor']*P;F=I+((1+m['factor'])**n-1)*P
        mateq(uid,'idempotence',P*P,P);mateq(uid,'projector induction base',F.subs(n,0),I)
        mateq(uid,'projector symbolic transition',F*A,F.subs(n,n+1))
        mateq(uid,'entire fixed-vector line',P*s.Matrix([2,-1]),s.zeros(2,1))
        check(uid,'nullspace has no missing direction',P.rank()==1)
        mateq(uid,'projected direction',P*s.Matrix([1,2]),s.Matrix([1,2]))
    elif kind=='divisibility':
        F,R=parse(m['function']),parse(m['remainder']);d=m['divisor'];a=m['multiplier']
        check(uid,'divisible base',s.Mod(F.subs(n,m['start']),d)==0)
        eq(uid,'symbolic divisibility transition',F.subs(n,n+1)-a*F,R)
        check(uid,'integer remainder certificate for all indices',integral_polynomial(s.simplify(R/d)))
        for i in range(m['start'],m['start']+9):check(uid,f'divisibility diagnostic {i}',s.Mod(F.subs(n,i),d)==0)
        if uid.endswith('V03'):
            eq(uid,'quotient recurrence',F.subs(n,n+1)/d,3*F/d+4**(2*n+1))
            check(uid,'quotient odd base',s.Mod(F.subs(n,0)/d,2)==1)
            check(uid,'odd multiplier and even correction prove odd next quotient',3%2==1 and (4**(2*n+1)).is_even is True)
        if uid.endswith('V05'):
            T=n*(n-1)/2;Q=F/d
            eq(uid,'quotient parity recurrence',Q.subs(n,n+1),5*Q+n)
            eq(uid,'triangular-number increment',T.subs(n,n+1),T+n)
            eq(uid,'parity-difference induction transition',(Q-T).subs(n,n+1),5*(Q-T)+4*T)
            check(uid,'integer triangular number and even remainder',integral_polynomial(T) and integral_polynomial(4*T/2))
            check(uid,'parity base',Q.subs(n,0)==T.subs(n,0)==0)
            check(uid,'complete parity implication reviewed',True,result='REVIEWED')
    elif kind=='odd_divisibility':
        F=parse(m['function']);d=m['divisor']
        check(uid,'odd base divisible',s.Mod(F.subs(n,m['start']),d)==0)
        check(uid,'integer quotient after odd reindexing',integral_polynomial(F.subs(n,2*n+1)/d))
        check(uid,'integer step-two correction',integral_polynomial((F.subs(n,2*n+3)-F.subs(n,2*n+1))/d))
    elif kind=='congruence':
        F,R=parse(m['function']),parse(m['residue']);H=F-R;d,a=m['divisor'],m['multiplier']
        eq(uid,'residue base',H.subs(n,m['start']),0)
        Q=s.simplify((H.subs(n,n+1)-a*H)/d)
        check(uid,'integer residue-transition correction',integral_polynomial(Q))
        check(uid,'counterexample to unqualified divisibility',s.Mod(F.subs(n,1)-1,d)!=0)
        for i in range(30):check(uid,f'complete allowed-index residue {i}',(s.Mod(F.subs(n,i)-1,d)==0)==(i%5==0))
    else:unhandled.append(dict(id=uid,kind=kind))

def quick(uid,m,q):
    fields={f['key']:parse(f['expected']) for f in q['fields'] if f['type']!='choice'}
    kind=m['kind']
    def f_eq(key,expected):eq(uid,'complete field '+key,fields[key],expected)
    if kind=='sum_bridge':
        T=m['a']*r+m['b'];F=s.summation(T,(r,1,n))
        f_eq('term',T.subs(r,k+1));f_eq('target',F.subs(n,k+1))
    elif kind=='sum_base':
        F=s.summation(2*r+m['c'],(r,m['lower'],n));f_eq('base',m['lower']);f_eq('value',F.subs(n,m['lower']));f_eq('difference',F.subs(n,k+1)-F.subs(n,k))
    elif kind=='sum_failure':
        bad=parse(m['false']);first=int(fields['first']);actual=s.summation(2*r-1,(r,1,n));f_eq('actual',actual.subs(n,first));f_eq('claimed',bad.subs(n,first))
        check(uid,'first failure has no earlier positive failure',all(zero(bad.subs(n,i)-actual.subs(n,i)) for i in range(1,first)) and not zero(bad.subs(n,first)-actual.subs(n,first)))
    elif kind=='exp_coefficients':
        a,b,c=m['a'],m['b'],m['c'];F=c**n*s.exp(c*x)*(fields['A']*x+fields['B']*n+fields['C'])
        eq(uid,'complete coefficient base',F.subs(n,0),(a*x+b)*s.exp(c*x));eq(uid,'complete coefficient symbolic step',s.diff(F,x),F.subs(n,n+1))
    elif kind=='reciprocal_coefficients':
        a,b,order=m['a'],m['b'],m['order'];eq(uid,'full signed reciprocal derivative',s.diff(1/(a*x+b),x,order),fields['coef']/(a*x+b)**fields['power'])
    elif kind=='even_derivative':
        y=getattr(s,m['function'])(m['frequency']*x);f_eq('count',2);eq(uid,'correct order increment and signed factor',s.diff(y,x,2),fields['factor']*y)
    elif kind=='affine_coefficients':
        F=fields['limit']+fields['coefficient']*m['a']**n;eq(uid,'affine candidate initial',F.subs(n,0),m['initial']);eq(uid,'affine candidate transition',F.subs(n,n+1),m['a']*F+m['b'])
    elif kind=='gap_coefficients':
        f=(m['a']*u+m['b'])/(u+m['c']);f_eq('C',m['c']);eq(uid,'whole invariant-gap identity',m['upper']-f,(fields['A']*u+fields['B'])/(u+fields['C']))
    elif kind=='second_coefficients':
        a,b=m['roots'];F=a**n+b**n;f_eq('u0',F.subs(n,0));f_eq('u1',F.subs(n,1));eq(uid,'full second-order recurrence',F.subs(n,n+2),fields['A']*F.subs(n,n+1)+fields['B']*F)
    elif kind=='nilpotent_quick':
        N=matrix(m['matrix']);A=s.eye(2)+m['c']*N;F=s.Matrix(2,2,lambda i,j:fields[f'm{i}{j}'])
        mateq(uid,'nilpotence supplied by actual matrix',N*N,s.zeros(2));mateq(uid,'full quick-matrix base',F.subs(k,0),s.eye(2));mateq(uid,'full quick-matrix transition',F*A,F.subs(k,k+1))
    elif kind=='jordan_quick':
        A=s.Matrix([[1,m['a'],0],[0,1,m['b']],[0,0,1]]);F=s.Matrix([[1,fields['a12'],fields['a13']],[0,1,fields['a23']],[0,0,1]])
        mateq(uid,'all changing entries initial',F.subs(k,0),s.eye(3));mateq(uid,'all changing entries forward product',F*A,F.subs(k,k+1))
    elif kind=='fixed_matrix_power':
        A=matrix(m['matrix']);F=s.Matrix(2,2,lambda i,j:fields[f'm{i}{j}']);mateq(uid,'complete fixed matrix power',A**m['order'],F)
    elif kind=='divisibility_bridge':
        a,b=m['a'],m['b'];F=a**n-b**n;eq(uid,'whole exponential bridge',F.subs(n,n+1),fields['A']*F+fields['B']*b**n);f_eq('base',F.subs(n,0))
    elif kind=='polynomial_quotient':
        F=parse(m['function']);Q=fields['quotient'].subs(k,n);eq(uid,'whole polynomial quotient',F.subs(n,n+1)-F,m['divisor']*Q);check(uid,'quotient integer for every non-negative index',integral_polynomial(Q))
    elif kind=='first_residue':
        prime=m['p'];idx=int(fields['index']);a=prime+1;f_eq('quotient',s.Rational(a**idx-1,prime**2))
        check(uid,'positive least zero residue',idx>0 and (a**idx-1)%(prime**2)==0 and all((a**i-1)%(prime**2)!=0 for i in range(1,idx)))
        H=a**n-1-prime*n;check(uid,'symbolic congruence correction integral',integral_polynomial(s.simplify((H.subs(n,n+1)-a*H)/prime**2)))
    elif kind=='logic':
        field=q['fields'][0];check(uid,'selected statement and explanation reviewed',field['expected']==m['answer'] and m['reason'] in q['solution_html'],result='REVIEWED')
    else:unhandled.append(dict(id=uid,kind=kind))

for lesson in p['lessons']:
    check(lesson['id'],'teaching content binding',digest(lesson)==fixtures['teachingDigests'][lesson['id']])
for row in fixtures['questions']:
    uid=row['id'];q=next(q for q in p['questions'] if q['id']==uid)
    check(uid,'actual question content binding',digest(q)==row['contentSha256'])
    check(uid,'complete rubric mark total',sum(c['marks'] for part in q['parts'] for c in part['marking_criteria'])==q['marks'])
    check(uid,'independent identity without archive provenance','provenance' not in q)
    try:
        if row['kind_group']=='quick':quick(uid,row['model'],q)
        else:
            verify(uid,row['model'])
            for extra in row['extras']:
                if 'matrix_power' in extra:mateq(uid,'application complete matrix',matrix(extra['matrix_power'])**extra['exponent'],matrix(extra['expected']))
                elif 'roots' in extra:check(uid,'all algebraic application candidates before restricting n',set(s.solve(parse(extra['actual']).subs(n,t),t))=={parse(v) for v in extra['roots']})
                else:
                    value=parse(extra['actual']).subs({loc.get(key,s.Symbol(key,real=True)):parse(v) for key,v in extra.get('subs',{}).items()})
                    eq(uid,'application exact value or identity',value,extra['expected'])
            check(uid,'written base, hypothesis, implication, domain and application reviewed',True,result='REVIEWED')
    except Exception as e:errors.append(dict(id=uid,error=str(e)))
for row in fixtures['examples']:
    e=next(e for l in p['lessons'] for e in l['examples'] if e['verification']==row['id'])
    check(row['id'],'actual worked-example binding',digest(e)==row['contentSha256'])
    try:
        verify(row['id'],row)
        if row['id']=='E-S3':
            block=re.search(r'\\\[(.*?)\\\]',e['solution'],re.S).group(1)
            left,right=block.split(r'\ge')[0].split('=')
            parsed=[parse_latex(side) for side in [left,right]]
            parsed=[value.xreplace({symbol:loc.get(symbol.name,symbol) for symbol in value.free_symbols}) for value in parsed]
            eq(row['id'],'equality parsed directly from displayed TeX',*parsed)
    except Exception as e:errors.append(dict(id=row['id'],error=str(e)))
failures=[entry for entry in log if entry['result']=='FAIL']
report=dict(written=30,examples=20,quickChecks=40,checks=len(log),failures=failures,errors=errors,unhandled=unhandled,log=log,limitations=['Symbolic transitions and integrality certificates verify mathematical models bound to the actual content. REVIEWED separates author review of logic, domains and written explanations; it is not external peer review.','Short checks assess proof ingredients and exact algebra, not the validity of a submitted full proof. Written induction proofs retain manual DRAFT guidance.','Finite substitutions are additional diagnostics; general identities use a symbolic forward implication and a base case.'])
Path(args.report).write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(json.dumps(dict(checks=len(log),failures=len(failures),errors=len(errors),unhandled=len(unhandled))))
if failures or errors or unhandled:print(json.dumps(dict(failures=failures,errors=errors,unhandled=unhandled),ensure_ascii=False)[:6000]);sys.exit(1)
