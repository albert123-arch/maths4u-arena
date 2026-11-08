"""Independent exact substitutions, domains, inverse branches and full root sets."""
import json
from pathlib import Path
import sympy as s
x,u=s.symbols('x u',real=True)
p=json.loads(Path('content/original/9709-p1/trigonometry-v1.json').read_text('utf-8'))
models=json.loads(Path('content/original/9709-p1/trigonometry-math-models.json').read_text('utf-8'))
checks=0
def expr(t):return s.sympify(str(t),locals={'x':x,'u':u})
def same(a,b):
 global checks
 assert a==b,(a,b)
 checks+=1
def zero(t):same(s.simplify(s.trigsimp(t)),0)
def vals(t):return s.FiniteSet(*(expr(v) for v in t[1:-1].split(',')))
def interval(t):
 a,b=t[1:-1].split(',');return s.Interval(expr(a),expr(b),left_open=t[0]=='(',right_open=t[-1]==')')
def solve(f,domain):
 # Factor before symbolic inversion: direct quadratic trigonometric solving
 # can omit an extremal level (for example cos x=-1) in SymPy.
 f=s.factor(f)
 if f.is_Mul:
  result=s.S.EmptySet
  for factor in f.args:
   if factor.has(x):result|=solve(factor,domain)
 else:result=s.solveset(f,x,domain=domain)
 assert result==s.S.EmptySet or isinstance(result,s.FiniteSet),(f,result)
 return result
full=s.Interval(0,2*s.pi);half=s.Interval.Ropen(0,2*s.pi)

for m in models:
 q=next(q for q in p['questions'] if q['id']==m['uid']);f={a['key']:a['expected'] for a in q['fields']};kind=m['kind']
 def check(key,value):zero(expr(f[key])-value)
 def roots(key,polynomial,domain):same(vals(f[key]),solve(polynomial,domain))
 if kind=='exact':
  for key,fn,a in zip(['sine','cosine','tangent'],[s.sin,s.cos,s.tan],m['angles']):check(key,fn(expr(a)))
 elif kind=='quadrant':
  c=expr(m['cosine']);sn=expr(f['sine']);zero(sn*sn+c*c-1);same(bool(sn<0),True);check('tangent',sn/c);same(bool(expr(f['tangent'])>0),m['quadrant']==3)
 elif kind=='principal':
  for key,fn,a,lo,hi,closed in zip(['asin','acos','atan'],[s.sin,s.cos,s.tan],m['arguments'],[-s.pi/2,0,-s.pi/2],[s.pi/2,s.pi,s.pi/2],[True,True,False]):
   v=expr(f[key]);zero(fn(v)-expr(a));same(bool(lo<=v<=hi) if closed else bool(lo<v<hi),True)
 elif kind=='inverse_composition':
  same(f['meaning'],m['choice']);v=expr(f['angle']);zero(s.sin(v)-s.sin(expr(m['angle'])));same(bool(-s.pi/2<=v<=s.pi/2),True)
 elif kind=='wave':
  a,b,d=m['a'],m['b'],m['d'];check('amplitude',abs(a));check('period',2*s.pi/abs(b));check('minimum',d-abs(a));check('maximum',d+abs(a));fn=s.sin if m['function']=='sin' else s.cos;zero(a*fn(b*(x+expr(f['period'])))-a*fn(b*x))
 elif kind=='phase':
  b,c=expr(m['b']),expr(m['c']);zero(b*expr(f['shift'])+c);check('period',2*s.pi/abs(b));check('midline',m['d'])
 elif kind=='tangent_graph':
  b=m['b'];branch=interval(f['branch']);same(branch,s.Interval.open(-s.pi/(2*b),s.pi/(2*b)));check('period',s.pi/b);check('intercept',m['d']);zero(s.cos(b*branch.start));zero(s.cos(b*branch.end))
 elif kind=='point_map':
  pair=tuple(expr(t) for t in f['point'][1:-1].split(','));h=expr(m['h']);zero(pair[0]+h*expr(m['x']));same(pair[1],expr(m['y']));zero(expr(f['input'])*pair[0]-expr(m['x']))
 elif kind=='cancel_identity':
  fn=s.sin if m['ratio']=='sin' else s.cos;other=s.cos if fn==s.sin else s.sin;check('expression',u);zero((1-other(x)**2)-fn(x)*expr(f['expression']).subs(u,fn(x)));roots('excluded',fn(x),full)
 elif kind=='fourth_powers':
  original=s.sin(x)**4-s.cos(x)**4 if m['variant']==0 else s.cos(x)**4-s.sin(x)**4+s.sin(x)**2
  zero(expr(f['expression']).subs(u,s.sin(x))-original);roots('zeros',expr(f['expression']).subs(u,s.sin(x)),half)
 elif kind=='rationalise':
  same(f['form'],m['choice']);fn=s.sin if m['ratio']=='sin' else s.cos;other=s.cos if fn==s.sin else s.sin;zero((1-fn(x))*(1+fn(x))-other(x)**2);roots('excluded',other(x),full)
 elif kind=='cancel_factor':
  check('expression',u);roots('excluded',s.cos(x)-expr(m['cosine']),half);same(f['status'],'C')
 elif kind=='sine_equation':roots('angles',s.sin(x)-expr(m['value']),full)
 elif kind=='cosine_shift':
  shift=expr(m['shift']);same(interval(f['interval']),s.Interval(shift,2*s.pi+shift));roots('angles',s.cos(2*x+shift)-expr(m['value']),s.Interval(0,s.pi))
 elif kind=='tangent_equation':roots('angles',s.tan(m['m']*x+expr(m['shift']))-m['value'],s.Interval.Ropen(expr(m['lo']),expr(m['hi'])))
 elif kind=='product_equation':roots('angles',s.sin(x)*(2*s.cos(x)-1) if m['variant']==0 else s.cos(x)*(2*s.sin(x)+1),half)
 elif kind in ('ratio_quadratic','range_filter'):
  a,b,c=m['coefficients'];poly=a*u*u+b*u+c;actual=s.solveset(poly,u,domain=s.Interval(-1,1));same(vals(f['ratios']),actual)
  fn=s.sin if m['function']=='sin' else s.cos;roots('angles',poly.subs(u,fn(x)),half)
 elif kind=='mixed_quadratic':
  fn=s.cos if m['function']=='cos' else s.sin;other=s.sin if fn==s.cos else s.cos;original=2*other(x)**2+fn(x)-1;zero(original-(-2*fn(x)**2+fn(x)+1));same(vals(f['ratios']),s.solveset(-2*u*u+u+1,u,domain=s.Interval(-1,1)));roots('angles',original,full)
 elif kind=='squared_input':
  same(interval(f['interval']),half);fn=s.sin if m['function']=='sin' else s.cos;roots('angles',fn(2*x)**2-expr(m['value']),s.Interval.Ropen(0,s.pi))
 else:raise ValueError(kind)

# All twenty worked examples: conclusions checked separately from authoring.
zero(s.sin(7*s.pi/6)+s.Rational(1,2));zero(s.cos(7*s.pi/4)-s.sqrt(2)/2);zero(s.tan(2*s.pi/3)+s.sqrt(3))
zero(s.Rational(12,13)**2+s.Rational(5,13)**2-1);zero((-s.Rational(12,13))/(-s.Rational(5,13))-s.Rational(12,5))
for fn,value,angle in [(s.sin,-s.sqrt(3)/2,-s.pi/3),(s.cos,-s.Rational(1,2),2*s.pi/3),(s.tan,-1,-s.pi/4)]:zero(fn(angle)-value)
zero(s.sin(s.acos(s.Rational(3,5)))-s.Rational(4,5));zero(s.asin(s.sin(5*s.pi/6))-s.pi/6)
same(solve(s.cos(2*x)+1,full),s.FiniteSet(s.pi/2,3*s.pi/2));same(2-3*(-1),5);same(2-3*1,-1)
for xx,yy in [(s.pi/6,1),(s.pi/3,3),(s.pi/2,1),(2*s.pi/3,-1),(5*s.pi/6,1)]:zero(2*s.sin(3*xx-s.pi/2)+1-yy)
zero(1-2*s.tan(0)-1);zero(s.cos((-s.pi)/2));zero(s.cos(s.pi/2))
zero(-(-2*s.pi)/2+s.cos(-s.pi)-(s.pi-1))
zero(1-s.cos(x)**2-s.sin(x)**2);same(solve(s.sin(x),full),s.FiniteSet(0,s.pi,2*s.pi))
zero((1-s.sin(x))*(1+s.sin(x))-s.cos(x)**2)
zero(s.sin(x)**4-s.cos(x)**4-(2*s.sin(x)**2-1))
zero(s.cos(x)**2+s.sin(x)**2-1)
same(solve(s.sin(x)-s.sqrt(3)/2,full),s.FiniteSet(s.pi/3,2*s.pi/3))
same(solve(s.cos(2*x-s.pi/3)-s.Rational(1,2),s.Interval(0,s.pi)),s.FiniteSet(0,s.pi/3,s.pi))
same(solve(s.tan(x+s.pi/4)+1,s.Interval.Ropen(-s.pi,s.pi)),s.FiniteSet(-s.pi/2,s.pi/2))
same(solve(s.sin(x)*(2*s.cos(x)-1),half),s.FiniteSet(0,s.pi/3,s.pi,5*s.pi/3))
alpha=s.acos(s.Rational(1,3));same(s.solve(3*u*u+2*u-1,u),[-1,s.Rational(1,3)])
for xx in [alpha,s.pi,2*s.pi-alpha]:zero(3*s.cos(xx)**2+2*s.cos(xx)-1)
same(solve(2*s.sin(x)**2-5*s.sin(x)+2,half),s.FiniteSet(s.pi/6,5*s.pi/6));same(s.solve(2*u*u-5*u+2,u),[s.Rational(1,2),2])
zero(3*(1-u*u)+4*u-4+(3*u-1)*(u-1))
for xx in [0,alpha,2*s.pi-alpha,2*s.pi]:zero(3*s.sin(xx)**2+4*s.cos(xx)-4)
same(solve(4*s.sin(2*x)**2-1,s.Interval.Ropen(0,s.pi)),s.FiniteSet(s.pi/12,5*s.pi/12,7*s.pi/12,11*s.pi/12))
print(json.dumps(dict(quick_questions=len(models),worked_examples=20,exact_and_domain_assertions=checks,failed=0)))
