"""Independent derivative-tree, endpoint, quadrature and complete-boundary checks."""
import json
from pathlib import Path
import sympy as s
import mpmath as mp
x,y,t=s.symbols('x y t',real=True);u=s.Symbol('u',positive=True)
pack=json.loads(Path('content/original/9709-p1/integration-v1.json').read_text('utf-8'))
models=json.loads(Path('content/original/9709-p1/integration-math-models.json').read_text('utf-8'))
checks=0

def expr(v):return v if isinstance(v,s.Basic) else s.sympify(str(v),locals={'x':x,'y':y,'t':t,'u':u,'inf':s.oo})
def same(a,b):
 global checks
 assert a==b,(a,b)
 checks+=1
def zero(v):same(s.simplify(v),0)
def derivative(v,var=x):
 v=expr(v)
 if not v.has(var):return s.Integer(0)
 if v==var:return s.Integer(1)
 if v.is_Add:return sum(derivative(a,var) for a in v.args)
 if v.is_Mul:return sum(derivative(a,var)*s.Mul(*(b for j,b in enumerate(v.args) if i!=j)) for i,a in enumerate(v.args))
 if v.is_Pow and not v.exp.has(var):return v.exp*v.base**(v.exp-1)*derivative(v.base,var)
 raise ValueError(v)
def endpoint(F,lo,hi,var=x):return s.limit(F,var,hi,dir='-')-s.limit(F,var,lo,dir='+')
def quad(G,lo,hi,want,var=x):
 with mp.workdps(60):
  f=s.lambdify(var,G,'mpmath');a=mp.mpf(str(s.N(lo,65)));b=mp.inf if hi==s.oo else mp.mpf(str(s.N(hi,65)))
  points=[a,a+1,mp.inf] if hi==s.oo else [a,(a+b)/2,b]
  got=mp.quad(f,points);expected=mp.mpf(str(s.N(want,60)))
  same(abs(got-expected)<mp.mpf('1e-24')*max(1,abs(expected)),True)
def pairs(v):return s.FiniteSet(*(s.Tuple(*(expr(a) for a in part[1:-1].split(','))) for part in v.split(';')))
def sets(v):
 if v.startswith('{'):return s.FiniteSet(*(expr(a) for a in v[1:-1].split(',')))
 a,b=v[1:-1].split(',');return s.Interval(expr(a),expr(b),left_open=v[0]=='(',right_open=v[-1]==')')
def line(v,P,m):
 F=expr(v);zero(F.subs({x:P[0],y:P[1]}));p=s.Poly(F,x,y);same(p.total_degree(),1);A,B=p.coeff_monomial(x),p.coeff_monomial(y);same(B!=0,True);zero(A+B*m)
def positive_inside(G,lo,hi,var=x):
 roots=s.solveset(G,var,domain=s.Interval.open(lo,hi));same(roots,s.S.EmptySet);same(bool(G.subs(var,(lo+hi)/2)>0),True)

for m in models:
 q=next(q for q in pack['questions'] if q['id']==m['uid']);f={a['key']:a['expected'] for a in q['fields']};kind=m['kind']
 def check(key,value):zero(expr(f[key])-value)
 if kind=='primitive':
  F=expr(f['primitive']);zero(derivative(F)-expr(m['G']));zero(F.subs(x,m['at'])-m['value']);same(f['constant'],'B' if q['collection']=='short' else 'C')
 elif kind=='linear_power':
  a,b,n=m['a'],m['b'],m['n'];G=(a*x+b)**n;F=expr(f['primitive']);zero(derivative(F)-G);zero(F.subs(x,-s.Rational(b,a)));value=endpoint(F,m['lo'],m['hi']);check('integral',value);quad(G,m['lo'],m['hi'],value)
 elif kind=='reversed':
  a=m['a'];G=x*x-a*a;F=x**3/3-a*a*x;zero(derivative(F)-G);value=endpoint(F,-a,a);check('forward',value);check('reversed',endpoint(F,a,-a));same(bool(value<0),True)
 elif kind=='improper':
  G,F,lo,hi=map(expr,[m['G'],m['F'],m['lo'],m['hi']]);zero(derivative(F)-G);boundary=s.limit(F,x,lo,dir='+') if m['boundary']=='lower' else s.limit(F,x,hi,dir='-');check('boundary',boundary);value=endpoint(F,lo,hi);check('integral',value);same(value.is_finite,True);quad(G,lo,hi,value);same(f['convergence'],'A' if m['boundary']=='lower' else 'C')
 elif kind=='curve_point':
  a,b,X,Y=m['a'],m['b'],m['X'],m['Y'];F=expr(f['curve']);zero(derivative(F)-(2*a*x+b));zero(F.subs(x,X)-Y);check('constant',F.subs(x,0))
 elif kind=='root_curve':
  F=expr(f['curve']).subs(u,s.sqrt(x));G=m['a']*s.sqrt(x)+m['b']/s.sqrt(x);zero(derivative(F)-G);zero(F.subs(x,m['X'])-m['Y']);check('constant',expr(f['curve']).subs(u,0));same(sets(f['domain']),s.Interval.open(0,s.oo));same(bool(m['X']>0),True)
 elif kind=='normal_curve':
  K=expr(f['parameter']);F=expr(f['curve']);G=K*x+m['B'];zero(derivative(F)-G);P=(m['X'],m['Y']);zero(F.subs(x,P[0])-P[1]);M=G.subs(x,P[0]);zero(M*expr(m['normal'])+1);line(f['tangent'],P,M)
 elif kind=='stationary_curve':
  a,H=m['a'],m['H'];F=expr(f['curve']);G=3*x*x-3*a*a;zero(derivative(F)-G);roots=s.solveset(G,x,domain=s.S.Reals);same(pairs(f['points']),s.FiniteSet(*(s.Tuple(X,F.subs(x,X)) for X in roots)));zero(F.subs(x,-a)-H);same(bool(derivative(G).subs(x,-a)<0),True);same(bool(derivative(G).subs(x,a)>0),True)
 elif kind=='signed_area':
  a=m['a'];G=x*x-a*a;F=x**3/3-a*a*x;same(sets(f['zeros']),s.solveset(G,x,domain=s.Interval(-2*a,2*a)));check('signed',endpoint(F,-2*a,2*a));pieces=[(-2*a,-a),(-a,a),(a,2*a)];area=sum(abs(endpoint(F,L,R)) for L,R in pieces);check('area',area)
  for L,R in pieces:quad(G,L,R,endpoint(F,L,R))
 elif kind=='line_area':
  P=m['P'];G=P*x-x*x;F=P*x*x/2-x**3/3;roots=s.solveset(G,x,domain=s.S.Reals);same(pairs(f['points']),s.FiniteSet(*(s.Tuple(X,X*X) for X in roots)));positive_inside(G,0,P);value=endpoint(F,0,P);check('area',value);quad(G,0,P,value)
 elif kind=='lobes':
  a=m['a'];G=x**3-a*a*x;F=x**4/4-a*a*x*x/2;same(sets(f['zeros']),s.solveset(G,x,domain=s.Interval(-a,a)));check('signed',endpoint(F,-a,a));check('area',abs(endpoint(F,-a,0))+abs(endpoint(F,0,a)));positive_inside(G,-a,0);positive_inside(-G,0,a)
 elif kind=='area_boundary':
  A=m['A'];same(sets(f['boundary']),s.solveset(x*x+x-A,x,domain=s.Interval.open(0,s.oo)));same(f['reason'],'C' if q['collection']=='short' else 'A');same(bool(m['b']>0),True);zero(endpoint(x*x+x,0,m['b'])-A)
 elif kind=='disk':
  c,L=m['c'],m['L'];G=(x+c)**2;check('integrand',G);F=x**3/3+c*x*x+c*c*x;zero(derivative(F)-G);value=s.pi*endpoint(F,0,L);check('volume',value);quad(G,0,L,value/s.pi);positive_inside(x+c,0,L)
 elif kind=='washer':
  R=m['R'];G=R*R-x*x;check('integrand',G);F=R*R*x-x**3/3;value=s.pi*endpoint(F,0,R);check('volume',value);quad(G,0,R,value/s.pi);positive_inside(G,0,R)
 elif kind=='vertical_disk':
  L=m['L'];G=y**4;check('integrand',G);F=y**5/5;zero(derivative(F,y)-G);value=s.pi*endpoint(F,0,L,y);check('volume',value);quad(G,0,L,value/s.pi,y)
 elif kind=='two_axes':
  a=m['a'];Gx=a*a*(x*x-x**4);Fx=a*a*(x**3/3-x**5/5);Gy=y/a-y*y/(a*a);Fy=y*y/(2*a)-y**3/(3*a*a);zero(derivative(Fx)-Gx);zero(derivative(Fy,y)-Gy);check('horizontal',s.pi*endpoint(Fx,0,1));check('vertical',s.pi*endpoint(Fy,0,a,y));positive_inside(Gx,0,1);positive_inside(Gy,0,a,y);quad(Gx,0,1,expr(f['horizontal'])/s.pi);quad(Gy,0,a,expr(f['vertical'])/s.pi,y)
 elif kind=='second_derivative':
  Fp=expr(f['first']);F=expr(f['curve']);zero(derivative(Fp)-(m['A']*x+m['B']));zero(derivative(F)-Fp);zero(Fp.subs(x,m['X'])-m['G']);zero(F.subs(x,m['Y'])-m['Z'])
 elif kind=='coefficient':
  A=expr(f['coefficient']);F=expr(f['curve']);G=A*x*x+m['B'];zero(G.subs(x,1)-m['G']);zero(derivative(F)-G);zero(F.subs(x,1)-m['Y'])
 elif kind=='accumulation':
  K,A0,T=m['K'],m['A0'],m['T'];F=expr(f['function']);zero(derivative(F,t)-(K-t));zero(F.subs(t,0)-A0);check('final',F.subs(t,T));roots=s.solveset(derivative(F,t),t,domain=s.Interval(0,T));candidates=list(roots)+[0,T];maximum=max(F.subs(t,a) for a in candidates);same(pairs(f['maximum']),s.FiniteSet(*(s.Tuple(a,maximum) for a in candidates if F.subs(t,a)==maximum)));same(derivative(K-t,t),-1)
 elif kind=='recognition':
  c=m['c'];F=x*x*(x+c)**3;G=x*(x+c)**2*(5*x+2*c);D=derivative(F);check('derivative',D);zero(D-G);value=endpoint(F,0,1);check('integral',value);quad(G,0,1,value)
 else:raise ValueError(kind)

# Restore every worked example independently of the authoring integration routine.
zero(derivative(4*x**s.Rational(3,2)+4/x+3*x)-(6*s.sqrt(x)-4/x**2+3))
zero(derivative((3*x-2)**5/15)-(3*x-2)**4)
same(endpoint(x**3/3-x,1,-1),s.Rational(4,3))
same(endpoint(2*s.sqrt(x),0,4),4);same(endpoint(-2*x**s.Rational(-1,2),0,4),s.oo);same(endpoint(-1/x,2,s.oo),s.Rational(1,2))
F=3*x*x-4*x+1;zero(derivative(F)-(6*x-4));same(F.subs(x,2),5)
F=2*x**s.Rational(3,2)-4*s.sqrt(x)-7;zero(derivative(F)-(3*s.sqrt(x)-2/s.sqrt(x)));same(F.subs(x,4),1)
F=2*x*x-2*x-1;same(F.subs(x,2),3);same(derivative(F).subs(x,2),6);line(y-6*x+9,(2,3),6)
F=x**3-3*x+3;same([F.subs(x,a) for a in [-1,1]],[5,1]);same(s.solveset(derivative(F),x,domain=s.S.Reals),s.FiniteSet(-1,1))
F=x**3/3-x;same(endpoint(F,-2,2),s.Rational(4,3));same(sum(abs(endpoint(F,a,b)) for a,b in [(-2,-1),(-1,1),(1,2)]),4)
same(endpoint(x*x-x**3/3,0,2),s.Rational(4,3));positive_inside(2*x-x*x,0,2)
F=x**4/4-x*x/2;same(endpoint(F,-1,1),0);same(abs(endpoint(F,-1,0))+abs(endpoint(F,0,1)),s.Rational(1,2))
same(s.solveset(x*x+x-6,x,domain=s.Interval.open(0,s.oo)),s.FiniteSet(2))
same(s.pi*endpoint(x+x*x+x**3/3,0,2),26*s.pi/3)
same(s.pi*endpoint(4*x-x**3/3,0,2),16*s.pi/3)
same(s.pi*endpoint(y**5/5,0,2,y),32*s.pi/5)
same(s.pi*endpoint(x**3/3-x**5/5,0,1),2*s.pi/15);same(s.pi*endpoint(y*y/2-y**3/3,0,1,y),s.pi/6)
F=2*x**3-3*x*x+3*x+2;zero(derivative(derivative(F))-(12*x-6));same(derivative(F).subs(x,1),3);same(F.subs(x,0),2)
F=2*x**3-2*x+1;zero(derivative(F)-(6*x*x-2));same(derivative(F).subs(x,1),4);same(F.subs(x,1),1)
F=10+4*t-t*t/2;zero(derivative(F,t)-(4-t));same([F.subs(t,a) for a in [0,4,6]],[10,18,16])
F=x*x*(x+1)**3;zero(derivative(F)-x*(x+1)**2*(5*x+2));same(endpoint(F,0,1),8)
same(len({e['verification'] for l in pack['lessons'] for e in l['examples']}),20)
print(json.dumps(dict(quick_questions=len(models),worked_examples=20,exact_boundary_and_quadrature_assertions=checks,failed=0)))
