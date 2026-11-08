"""Independent recursive power differentiation, geometry, domains and boundaries."""
import json
from pathlib import Path
import sympy as s
x,y,h=s.symbols('x y h',real=True);u=s.Symbol('u',positive=True)
pack=json.loads(Path('content/original/9709-p1/differentiation-v1.json').read_text('utf-8'))
models=json.loads(Path('content/original/9709-p1/differentiation-math-models.json').read_text('utf-8'))
checks=0
def expr(t):return t if isinstance(t,s.Basic) else s.sympify(str(t),locals={'x':x,'y':y,'h':h,'u':u,'inf':s.oo})
def same(a,b):
 global checks
 assert a==b,(a,b)
 checks+=1
def zero(t):same(s.simplify(t),0)
def derivative(t,var=x):
 t=expr(t)
 if not t.has(var):return s.Integer(0)
 if t==var:return s.Integer(1)
 if t.is_Add:return sum(derivative(v,var) for v in t.args)
 if t.is_Mul:return sum(derivative(v,var)*s.Mul(*(w for j,w in enumerate(t.args) if j!=i)) for i,v in enumerate(t.args))
 if t.is_Pow and not t.exp.has(var):return t.exp*t.base**(t.exp-1)*derivative(t.base,var)
 raise ValueError(t)
def second(t,var=x):return derivative(derivative(t,var),var)
def pairs(t):return s.FiniteSet(*(s.Tuple(*(expr(v) for v in a[1:-1].split(','))) for a in t.split(';')))
def interval(t):
 a,b=t[1:-1].split(',');return s.Interval(expr(a),expr(b),left_open=t[0]=='(',right_open=t[-1]==')')
def sets(t):
 if t.startswith('{'):return s.FiniteSet(*(expr(a) for a in t[1:-1].split(',')))
 result=s.S.EmptySet
 for part in t.split(' U '):result|=interval(part)
 return result
def line(t,P,m=None,vertical=False):
 F=expr(t);zero(F.subs({x:P[0],y:P[1]}));poly=s.Poly(F,x,y);same(poly.total_degree(),1);A,B=poly.coeff_monomial(x),poly.coeff_monomial(y)
 if vertical:same(B,0);same(A!=0,True)
 else:zero(A+B*m);same(B!=0,True)

for m in models:
 q=next(q for q in pack['questions'] if q['id']==m['uid']);f={a['key']:a['expected'] for a in q['fields']};kind=m['kind']
 def check(key,value):zero(expr(f[key])-value)
 if kind=='chord':
  F=expr(m['F']);a=m['a'];zero(expr(f['chord'])*h-(F.subs(x,a+h)-F.subs(x,a)));check('limit',s.limit(expr(f['chord']),h,0));zero(expr(f['limit'])-derivative(F).subs(x,a))
 elif kind=='polynomial_derivatives':check('first',derivative(m['F']));check('second',second(m['F']))
 elif kind=='rational_powers':
  F=m['a']*s.sqrt(x)+expr(m['b'])/s.sqrt(x);D=derivative(F);N,Q=map(expr,f['derivative']);zero(N/Q-D.subs(x,u*u));same(s.gcd(N,Q).is_number,True);check('gradient',D.subs(x,m['at']));same(sets(f['domain']),s.Interval.open(0,s.oo));same(Q.subs(u,0),0)
 elif kind=='chain':
  F=(m['a']*x+m['b'])**m['N']+m['c']*x;D=derivative(F);check('derivative',D);check('gradient',D.subs(x,m['at']))
 elif kind=='tangent_normal':
  F=expr(m['F']);a=m['at'];P=(a,F.subs(x,a));slope=derivative(F).subs(x,a);line(f['tangent'],P,slope);line(f['normal'],P,-1/slope)
 elif kind=='zero_normal':
  P=(m['a'],m['b']);F=(x-P[0])**2+P[1];zero(derivative(F).subs(x,P[0]));line(f['tangent'],P,0);line(f['normal'],P,vertical=True)
 elif kind=='prescribed_gradient':
  F=x**3-m['c']*x;roots=s.solveset(derivative(F)-m['m'],x,domain=s.S.Reals);expected=s.FiniteSet(*(s.Tuple(a,F.subs(x,a)) for a in roots));same(pairs(f['points']),expected);same(sets(f['intercepts']),s.FiniteSet(*(b-m['m']*a for a,b in expected)))
 elif kind=='line_parameters':
  K,C=next(iter(pairs(f['parameters'])));F=x*x+K*x+C;P=(m['X'],m['Y']);zero(F.subs(x,P[0])-P[1]);slope=derivative(F).subs(x,P[0]);zero(slope*expr(m['normal'])+1);line(f['tangent'],P,slope)
 elif kind=='stationary_cubic':
  a=m['a'];F=x**3-3*a*a*x;roots=s.solveset(derivative(F),x,domain=s.S.Reals);same(pairs(f['points']),s.FiniteSet(*(s.Tuple(t,F.subs(x,t)) for t in roots)));same(bool(second(F).subs(x,-a)<0),True);same(bool(second(F).subs(x,a)>0),True);same(f['nature'],m['choice'])
 elif kind=='sign_sets':
  D=derivative(m['F']);same(sets(f['positive']),s.solve_univariate_inequality(D>0,x,relational=False));same(sets(f['negative']),s.solve_univariate_inequality(D<0,x,relational=False))
 elif kind=='stationary_nonturning':
  a,b=m['a'],m['b'];F=(x-a)**3+b;D=derivative(F);same(pairs(f['point']),s.FiniteSet(s.Tuple(a,b)));check('second',second(F).subs(x,a));same(s.solveset(D,x,domain=s.S.Reals),s.FiniteSet(a));same(s.solve_univariate_inequality(D<0,x,relational=False),s.S.EmptySet);same(f['nature'],m['choice'])
 elif kind=='reciprocal_branch':
  A=m['A'];F=x+A/x;domain=s.Interval.open(0,s.oo) if m['sign']>0 else s.Interval.open(-s.oo,0);root=s.solveset(derivative(F),x,domain=domain);same(len(root),1);X=next(iter(root));Y=F.subs(x,X);same(pairs(f['point']),s.FiniteSet(s.Tuple(X,Y)));same(sets(f['range']),s.Interval(Y,s.oo) if m['sign']>0 else s.Interval(-s.oo,Y));same(f['nature'],'A' if m['sign']>0 else 'B');zero(F-Y-(x-X)**2/x);same(bool(m['sign']*second(F).subs(x,X)>0),True);same(s.limit(F,x,0,dir='+' if m['sign']>0 else '-'),s.oo*m['sign'])
 elif kind=='sphere':
  r=s.Symbol('r',positive=True);V=4*s.pi*r**3/3;D=derivative(V,r);check('geometry',D.subs(r,m['R']));check('rate',D.subs(r,m['R'])*expr(m['speed']))
 elif kind=='circle_inverse':
  r=s.Symbol('r',positive=True);rate=expr(m['area_rate'])/derivative(s.pi*r*r,r).subs(r,m['R']);check('radius',rate);check('circumference',derivative(2*s.pi*r,r)*rate)
 elif kind=='coordinate_rate':
  D=derivative(m['F']).subs(x,m['at']);check('gradient',D);check('rate',D*expr(m['speed']))
 elif kind=='increment':
  a=m['at'];delta=expr(m['delta']);D=derivative(s.sqrt(x)).subs(x,a);check('change',D*delta);check('value',s.sqrt(a)+D*delta);same(a+delta>0,True);same(f['meaning'],m['choice']);same(s.simplify(expr(f['value'])**2-(a+delta))!=0,True)
 elif kind=='rectangle':
  P=m['P'];length=s.Rational(P,2);F=x*(length-x);X=expr(f['side']);check('area',F.subs(x,X));same(sets(f['domain']),s.Interval.open(0,length));zero(derivative(F).subs(x,X));zero(F-(expr(f['area'])-(x-X)**2));same(bool(0<X<length),True)
 elif kind=='closed_bounds':
  F=-x*x+m['B']*x+m['C'];domain=s.Interval(0,m['L']);candidates=s.solveset(derivative(F),x,domain=domain)|s.FiniteSet(0,m['L']);low=min(F.subs(x,a) for a in candidates);high=max(F.subs(x,a) for a in candidates);same(pairs(f['minimum']),s.FiniteSet(*(s.Tuple(a,low) for a in candidates if F.subs(x,a)==low)));same(pairs(f['maximum']),s.FiniteSet(*(s.Tuple(a,high) for a in candidates if F.subs(x,a)==high)))
 elif kind=='fixed_product':
  K,A,B=m['K'],m['A'],m['B'];X,Y=next(iter(pairs(f['pair'])));same(bool(X>0 and Y>0),True);zero(X*Y-K);F=A*x+B*K/x;zero(derivative(F).subs(x,X));check('value',A*X+B*Y);zero(F-expr(f['value'])-A*(x-X)**2/x)
 elif kind=='transformation':
  A,B,C=map(expr,[m['A'],m['B'],m['C']]);F=x**3-3*x;G=A*F.subs(x,B*x)+C;D=derivative(G);zero(D-A*B*derivative(F).subs(x,B*x));check('derivative',D);roots=s.solveset(D,x,domain=s.S.Reals);same(pairs(f['points']),s.FiniteSet(*(s.Tuple(a,G.subs(x,a)) for a in roots)))
 else:raise ValueError(kind)

# All twenty examples: conclusions restored separately.
F=2*x*x-x+3;zero((F.subs(x,1+h)-F.subs(x,1))-(3+2*h)*h);same(derivative(F).subs(x,1),3)
F=3*x**s.Rational(3,2)-4/x+5;zero(derivative(F)-s.Rational(9,2)*s.sqrt(x)-4/x**2)
zero(derivative((3*x-1)**5)-15*(3*x-1)**4)
zero(derivative(s.sqrt(4*x+5))-2/s.sqrt(4*x+5));same(s.solve_univariate_inequality(4*x+5>=0,x,relational=False),s.Interval(-s.Rational(5,4),s.oo))
line(y-2*x+1,(1,1),2);line(y+x/2-s.Rational(3,2),(1,1),-s.Rational(1,2))
line(y-6-11*(x-2),(2,6),11);line(y-6+(x-2)/11,(2,6),-s.Rational(1,11))
line(y-3,(2,3),0);line(x-2,(2,3),vertical=True)
F=x**3-3*x;same(s.solveset(derivative(F)-9,x,domain=s.S.Reals),s.FiniteSet(-2,2));line(y-9*x-16,(-2,-2),9);line(y-9*x+16,(2,2),9)
same(s.solveset(derivative(F),x,domain=s.S.Reals),s.FiniteSet(-1,1));same(F.subs(x,-1),2);same(F.subs(x,1),-2);same(second(F).subs(x,-1),-6);same(second(F).subs(x,1),6)
same(second(x**3).subs(x,0),0);same(s.solve_univariate_inequality(derivative(x**3)<0,x,relational=False),s.S.EmptySet)
F=x+4/x;same(s.solveset(derivative(F),x,domain=s.S.Reals),s.FiniteSet(-2,2));same(F.subs(x,-2),-4);same(F.subs(x,2),4);zero(F-4-(x-2)**2/x)
F=-x*x+4*x+1;same([F.subs(x,a) for a in [0,2,5]],[1,5,-4])
zero(4*s.pi*2**2*s.Rational(1,10)-8*s.pi/5)
same((-10*s.pi)/(2*s.pi*5),-1)
same(derivative(x**3-x).subs(x,2)*(-s.Rational(1,5)),-s.Rational(11,5))
same(derivative(s.sqrt(x+5)).subs(x,4)*s.Rational(6,100),s.Rational(1,100))
F=x*(12-x);same(derivative(F).subs(x,6),0);same(F.subs(x,6),36);same(F.subs(x,0),0);same(F.subs(x,12),0)
r=s.Symbol('r',positive=True);V=s.pi*(54*r-r**3)/2;R=3*s.sqrt(2);H=(54-R*R)/(2*R);zero(derivative(V,r).subs(r,R));same(H,R);zero(V.subs(r,R)-54*s.sqrt(2)*s.pi);same(bool(second(V,r).subs(r,R)<0),True);zero(s.limit(V,r,0));zero(s.limit(V,r,s.sqrt(54)))
F=2*x+18/x;same(derivative(F).subs(x,3),0);same(F.subs(x,3),12);zero(F-12-2*(x-3)**2/x)
G=2*((x/2)**3-3*x/2)+1;zero(derivative(G)-(3*x*x/4-3));same([G.subs(x,a) for a in [-2,2]],[5,-3])
print(json.dumps(dict(quick_questions=len(models),worked_examples=20,exact_and_boundary_assertions=checks,failed=0)))
