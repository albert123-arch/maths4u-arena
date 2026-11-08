"""Independent repeated convolution, full cases, index and remainder checks."""
import json
from pathlib import Path
import sympy as s
x,p,k=s.symbols('x p k',real=True)
pack=json.loads(Path('content/original/9709-p1/binomial-expansion-v1.json').read_text('utf-8'))
models=json.loads(Path('content/original/9709-p1/binomial-expansion-math-models.json').read_text('utf-8'))
checks=0
def expr(t):return t if isinstance(t,s.Basic) else s.sympify(str(t),locals={'x':x,'p':p,'k':k})
def same(a,b):
 global checks
 assert a==b,(a,b)
 checks+=1
def zero(t):same(s.simplify(t),0)
def add(A,B):
 out=A.copy()
 for j,c in B.items():out[j]=s.simplify(out.get(j,0)+c)
 return {j:c for j,c in out.items() if c!=0}
def mul(A,B):
 out={}
 for i,a in A.items():
  for j,b in B.items():out[i+j]=s.simplify(out.get(i+j,0)+a*b)
 return {j:c for j,c in out.items() if c!=0}
def power(base,N):
 out={0:s.Integer(1)}
 for _ in range(N):out=mul(out,base)
 return out
def binomial(A,B,N,a=0,b=1):return power(add({a:expr(A)},{b:expr(B)}),N)
def polynomial(t,variable=x):
 t=expr(t)
 if not t.has(variable):return {0:t} if t!=0 else {}
 if t==variable:return {1:s.Integer(1)}
 if t.is_Add:
  out={}
  for v in t.args:out=add(out,polynomial(v,variable))
  return out
 if t.is_Mul:
  out={0:s.Integer(1)}
  for v in t.args:out=mul(out,polynomial(v,variable))
  return out
 if t.is_Pow and t.exp.is_Integer:
  if t.base==variable:return {int(t.exp):s.Integer(1)}
  assert t.exp>=0
  return power(polynomial(t.base,variable),int(t.exp))
 raise ValueError(t)
def checkpoly(actual,expected,variable=x):
 got=polynomial(actual,variable)
 same(set(got),set(expected))
 for j,c in expected.items():zero(got[j]-c)
def evaluate(P,h):return s.simplify(sum(c*h**j for j,c in P.items()))
def values(t):return s.FiniteSet(*(expr(a) for a in t[1:-1].split(',')))
def pairs(t):return s.FiniteSet(*(s.Tuple(*(expr(v) for v in a[1:-1].split(','))) for a in t.split(';')))
def interval(t):
 a,b=t[1:-1].split(',');return s.Interval(expr(a),expr(b),left_open=t[0]=='(',right_open=t[-1]==')')
def rounded(v,places):return s.floor(10**places*v+s.Rational(1,2))/10**places

for m in models:
 q=next(q for q in pack['questions'] if q['id']==m['uid']);f={a['key']:a['expected'] for a in q['fields']};kind=m['kind']
 def check(key,value):zero(expr(f[key])-value)
 if kind=='complete':
  P=binomial(m['A'],m['B'],m['N']);checkpoly(f['expanded'],P);check('count',len(P))
 elif kind=='truncation':
  P=binomial(m['A'],m['B'],m['N']);checkpoly(f['expanded'],{j:c for j,c in P.items() if j<=2});check('omitted',P[3])
 elif kind=='even_powers':
  P=binomial(1,m['B'],m['N'],0,2);checkpoly(f['expanded'],{j:c for j,c in P.items() if j<=4});check('power',min(j for j in P if j>4))
 elif kind=='substitution':
  P=power({0:s.Integer(1),1:s.Integer(m['a']),2:s.Integer(-1)},m['N']);checkpoly(f['expanded'],{j:c for j,c in P.items() if j<=3});same(f['meaning'],m['choice'])
 elif kind=='ordinary_term':
  P=binomial(m['A'],m['B'],m['N']);check('index',m['K']);check('number',m['K']+1);check('coefficient',P[m['K']]);same(0<=int(f['index'])<=m['N'],True)
 elif kind in ('laurent_constant','missing_power','negative_power'):
  K=0 if kind=='laurent_constant' else m['K'];P=binomial(m['A'],m['B'],m['N'],m['a'],m['b']);r=s.Rational(m['a']*m['N']-K,m['a']-m['b']);check('index',r);check('coefficient',P.get(K,0))
  if kind=='missing_power':same(r.is_Integer,False);same(f['reason'],m['choice'])
  else:
   same(bool(r.is_Integer and 0<=r<=m['N']),True)
   if kind=='laurent_constant':check('number',r+1)
   else:same(f['domain'],m['choice'])
 elif kind in ('product_quadratic','linear_product'):
  F,G=polynomial(m['F']),polynomial(m['G']);P=mul(F,G);target=2 if kind=='product_quadratic' else 3;check('coefficient',P[target])
  if kind=='product_quadratic':check('cross',F.get(1,0)*G.get(1,0))
  else:check('depth',3)
 elif kind=='parity':
  P=add(binomial(1,m['B'],m['N']),{j:m['sign']*c for j,c in binomial(1,-m['B'],m['N']).items()});check('odd',P.get(3,0));check('even',P.get(2,0))
 elif kind=='shifted_product':
  P=binomial(1,m['C'],m['N']);combined=mul({0:expr(m['A']),-1:expr(m['B'])},P);check('coefficient',combined[2]);check('depth',3)
 elif kind=='signed_parameter':
  P=binomial(1,k,m['N']);rr=s.solveset(P[2]-m['target'],k,domain=s.S.Reals);same(values(f['roots']),rr);same(pairs(f['pairs']),s.FiniteSet(*(s.Tuple(r,P[3].subs(k,r)) for r in rr)))
 elif kind=='integer_exponent':
  B=expr(m['B']);target=expr(m['target']);N=int(f['exponent']);same(N>0,True);P=binomial(1,B,N);zero(P.get(2,0)-target);check('linear',P[1]);matches=[j for j in range(1,N+2) if s.simplify(binomial(1,B,j).get(2,0)-target)==0];same(matches,[N]);same(binomial(1,B,N+1)[2]>target,True)
  # C2 increases by n*B² at step n -> n+1 for B!=0, so there is no later root.
  zero(binomial(1,B,N+1)[2]-P[2]-N*B*B)
 elif kind=='zero_parameter':
  P=binomial(1,k,m['N']);rr=s.solveset(P[2]-m['mult']*P[1],k,domain=s.S.Reals);same(values(f['all']),rr);same(values(f['nonzero']),rr-s.FiniteSet(0))
 elif kind=='coupled_positive':
  A,B=s.symbols('A B',positive=True);P=binomial(A,B,m['N']);solution=s.solve([P[0]-m['constant'],P[1]-P[2]],(A,B),dict=True);same(len(solution),1);pair=pairs(f['pair']);same(pair,s.FiniteSet(s.Tuple(solution[0][A],solution[0][B])));check('coefficient',P[1].subs(solution[0]));zero(P[2].subs(solution[0])-expr(f['coefficient']))
 elif kind=='matched_approximation':
  h=expr(m['h']);P=binomial(m['A'],m['B'],m['N']);estimate=evaluate({j:c for j,c in P.items() if j<=2},h);true=evaluate(P,h);check('input',h);check('estimate',rounded(estimate,3));zero(rounded(true,3)-rounded(estimate,3));base=format(float(m['A']+m['B']*h),'.2f');same(base+'^{'+str(m['N'])+'}' in q['prompt_html'],True)
 elif kind=='remainder_sign':
  h=expr(m['h']);P=binomial(1,1,4);estimate=evaluate({j:c for j,c in P.items() if j<=2},h);R=evaluate({j:c for j,c in P.items() if j>2},h);check('estimate',estimate);check('remainder',R);same(f['direction'],'A' if R>0 else 'B');zero(evaluate(P,h)-estimate-R)
 elif kind=='error_bound':
  h=expr(m['h']);R={j:c for j,c in binomial(1,1,m['N']).items() if j>2};same(bool(h>0 and all(c>0 for c in R.values())),True);check('bound',evaluate(R,h));check('input',h);same(f['validity'],'B')
 elif kind=='coefficient_range':
  P=mul(binomial(1,p,m['N']),{0:s.Integer(1),1:s.Integer(-m['c'])});model=P[2];checkpoly(f['expanded'],polynomial(model,p),p);poly=polynomial(model,p);A,B=poly[2],poly[1];minimum=-B*B/(4*A);centre=-B/(2*A);same(bool(A>0 and B<0),True);same(interval(f['levels']),s.Interval.open(minimum,0));check('repeated',centre);zero(model.subs(p,centre)-minimum)
  for level,count in [(minimum-1,0),(minimum,1),(minimum/2,2),(0,1),(1,1)]:same(len(s.solveset(model-level,p,domain=s.Interval.open(0,s.oo))),count)
 else:raise ValueError(kind)

# All twenty worked examples: conclusions independent of the authoring expansion.
same(binomial(1,-2,4),{0:1,1:-8,2:24,3:-32,4:16})
same({j:c for j,c in binomial(2,1,5).items() if j<=2},{0:32,1:80,2:80})
same(binomial(1,-s.Rational(1,2),3),{0:1,1:-s.Rational(3,2),2:s.Rational(3,4),3:-s.Rational(1,8)})
same({j:c for j,c in power({0:1,1:1,2:-1},4).items() if j<=3},{0:1,1:4,2:2,3:-8})
same(binomial(2,-1,6)[4],60);same(4+1,5)
same(binomial(2,-1,6,2,-1)[0],60)
same(binomial(1,2,5,3,-1).get(2,0),0)
same(binomial(3,-2,5,2,-1)[4],1080)
same(mul(binomial(1,1,4),binomial(1,3,2))[2],39)
same(mul(binomial(2,-1,4),{0:1,1:2})[3],40)
F,G=binomial(1,2,5),binomial(1,-2,5);same(add(F,G),{0:2,2:80,4:160});same(add(F,{j:-c for j,c in G.items()})[3],160)
same(mul(binomial(1,1,3,0,2),binomial(1,-1,4))[3],-16)
same(s.solveset(binomial(1,k,6)[2]-60,k,domain=s.S.Reals),s.FiniteSet(-2,2));same(binomial(1,2,6)[3],160);same(binomial(1,-2,6)[3],-160)
same(binomial(1,-s.Rational(1,2),8)[2],7);same(binomial(1,-s.Rational(1,2),8)[1],-4)
P=binomial(1,k,4);same(s.solveset(P[2]-3*P[1],k,domain=s.S.Reals),s.FiniteSet(0,2))
P=binomial(3,2,4);same(P[0],81);same(P[1],216);same(P[2],216)
P=binomial(2,1,5);h=s.Rational(1,100);estimate=evaluate({j:c for j,c in P.items() if j<=2},h);same(estimate,s.Rational(4101,125));same(evaluate(P,h)-estimate,s.Rational(401001,10**10));same(rounded(evaluate(P,h),3),estimate)
P=binomial(1,1,4)
for h,estimate,R in [(s.Rational(1,10),s.Rational(73,50),s.Rational(41,10000)),(-s.Rational(1,10),s.Rational(33,50),-s.Rational(39,10000))]:zero(evaluate(P,h)-estimate-R)
same(mul({0:1,-1:1},binomial(1,2,4))[2],56)
P=mul(binomial(1,p,4),{0:1,1:-2});zero(P[2]-(6*(p-s.Rational(2,3))**2-s.Rational(8,3)));same(s.solveset(P[2],p,domain=s.S.Reals),s.FiniteSet(0,s.Rational(4,3)))
print(json.dumps(dict(quick_questions=len(models),worked_examples=20,exact_and_boundary_assertions=checks,failed=0)))
