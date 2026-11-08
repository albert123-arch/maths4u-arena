"""Independent recurrence, complete-case, index, domain and timing checks."""
import json
from pathlib import Path
import sympy as s
n=s.Symbol('n',integer=True,positive=True);x=s.Symbol('x',real=True)
p=json.loads(Path('content/original/9709-p1/series-v1.json').read_text('utf-8'))
models=json.loads(Path('content/original/9709-p1/series-math-models.json').read_text('utf-8'))
checks=0
def expr(t):return s.sympify(str(t),locals={'n':n,'x':x})
def same(a,b):
 global checks
 assert a==b,(a,b)
 checks+=1
def zero(t):same(s.simplify(s.trigsimp(t)),0)
def vals(t):return s.FiniteSet(*(expr(a) for a in t[1:-1].split(',')))
def pairs(t):return s.FiniteSet(*(s.Tuple(*(expr(v) for v in a[1:-1].split(','))) for a in t.split(';')))
def interval(t):
 a,b=t[1:-1].split(',');return s.Interval(expr(a),expr(b),left_open=t[0]=='(',right_open=t[-1]==')')
def terms(a,step,N,gp=False):
 result=[];term=expr(a);step=expr(step)
 for _ in range(N):
  result.append(term);term=term*step if gp else term+step
 return result

for m in models:
 q=next(q for q in p['questions'] if q['id']==m['uid']);f={a['key']:a['expected'] for a in q['fields']};kind=m['kind']
 def check(key,value):zero(expr(f[key])-value)
 if kind=='ap_parameters':
  a,d=expr(f['first']),expr(f['difference']);ts=terms(a,d,max(m['N'],m['j']));same(ts[m['i']-1],m['ui']);same(ts[m['j']-1],m['uj']);check('term',ts[m['N']-1]);same(m['j']>m['i'],True)
 elif kind=='ap_block':
  ts=terms(m['a'],m['d'],m['N']);check('prefix',sum(ts));check('block',sum(ts[m['k']:]))
 elif kind=='prefix_polynomial':
  P=m['A']*n*n+m['B']*n;un=P-P.subs(n,n-1);check('formula',un);check('first',P.subs(n,1));check('difference',un.subs(n,n+1)-un)
 elif kind=='first_index':
  N=int(f['index']);same(bool(expr(f['index'])==N and N>0),True);ts=terms(m['a'],m['d'],N);sums=[sum(ts[:i]) for i in range(N+1)];same(all(v<=m['bound'] for v in sums[1:-1]),True);same(sums[-1]>m['bound'],True);check('previous',sums[-2]);check('current',sums[-1]);same(all(t>0 for t in ts),True)
 elif kind=='gp_finite':
  ts=terms(m['a'],m['r'],m['N'],True);check('term',ts[-1]);check('sum',sum(ts))
 elif kind=='gp_sign_pairs':
  actual=pairs(f['pairs']);rr=s.solveset(m['u2']*x*x-m['u4'],x,domain=s.S.Reals);expected=s.FiniteSet(*(s.Tuple(m['u2']/r,r) for r in rr));same(actual,expected);limits=[]
  for a,r in actual:
   ts=terms(a,r,4,True);zero(ts[1]-m['u2']);zero(ts[3]-m['u4']);same(bool(abs(r)<1),True);limit=s.solve(s.Symbol('S')-a-r*s.Symbol('S'),s.Symbol('S'))[0];limits.append(limit)
  same(vals(f['limits']),s.FiniteSet(*limits))
 elif kind=='boundary_ratio':
  ts=terms(m['a'],m['r'],m['N']+1,True);check('sum',sum(ts[:-1]));same(abs(m['r']),1);same(f['convergence'],m['choice']);same(ts[-1]!=0,True)
 elif kind=='gp_tail':
  a,r=expr(m['a']),expr(m['r']);ts=terms(a,r,m['N'],True);check('finite',sum(ts));zero(expr(f['limit'])-a-r*expr(f['limit']));zero(expr(f['tail'])+expr(f['finite'])-expr(f['limit']));zero(expr(f['tail'])*(1-r)-ts[-1]*r);same(bool(abs(r)<1),True)
 elif kind=='ap_three':
  a,b,c=map(expr,m['terms']);actual=s.solveset(2*b-a-c,x,domain=s.S.Reals);same(s.FiniteSet(expr(f['parameter'])),actual);check('difference',(b-a).subs(x,expr(f['parameter'])))
 elif kind=='trig_ap':
  middle=expr(m['middle']);theta=expr(f['angle']);check('cosine_square',s.cos(theta)**2);zero(2*middle-s.sin(theta)**2-2*s.cos(theta)**2);same(bool(0<theta<s.pi/2),True);zero(theta-s.acos(s.sqrt(2*middle-1)))
 elif kind=='ap_constant_case':
  A,B,C=x*x,x+m['B'],s.Integer(m['L']);candidates=s.solveset(2*B-A-C,x,domain=s.S.Reals);same(vals(f['candidates']),candidates);valid=s.FiniteSet(*(v for v in candidates if s.simplify((B-A).subs(x,v))!=0));same(vals(f['valid']),valid);same(len(valid),1);check('difference',(B-A).subs(x,list(valid)[0]))
 elif kind=='equal_blocks':
  a,d=expr(f['first']),expr(f['difference']);k=m['k'];ts=terms(a,d,2*k);zero(sum(ts[:k])-expr(m['first_sum']));zero(sum(ts[k:])-expr(m['next_sum']));check('term',ts[-1]);zero(expr(m['next_sum'])-expr(m['first_sum'])-k*k*d)
 elif kind=='gp_middle':
  expected=s.FiniteSet(*(s.Tuple(v,v/m['A']) for v in s.solveset(x*x-m['A']*m['C'],x,domain=s.S.Reals)));same(pairs(f['pairs']),expected)
  for k,r in pairs(f['pairs']):zero(r*m['A']-k);zero(r*k-m['C'])
 elif kind=='trig_gp':
  theta,r=expr(f['angle']),expr(f['ratio']);c=expr(m['coefficient']);same(bool(0<theta<s.pi/2),True);zero(s.tan(theta)*c*s.cos(theta)-1);zero(r*s.tan(theta)-1);zero(r-c*s.cos(theta));zero(theta-s.asin(1/c))
 elif kind=='angle_convergence':
  q=expr(m['q']);domain=s.Interval.open(0,s.pi/2);expected=s.solve_univariate_inequality(s.cos(x)>q,x,relational=False,domain=domain);actual=interval(f['interval']);same(actual,expected);zero(q/s.cos(actual.end)-1);same(f['boundary'],'B')
 elif kind=='gp_choice':
  valid=[]
  for key,text in next(a for a in q['fields'] if a['key']=='triple')['options'].items():
   a,b,c=[expr(v.replace('−','-')) for v in text.split(',')]
   if a!=0 and s.simplify(b*b-a*c)==0:valid.append((key,b/a))
  same(len(valid),1);same(f['triple'],valid[0][0]);check('ratio',valid[0][1])
 elif kind=='salary':
  ts=terms(m['a'],m['d'],m['N']);check('salary',ts[-1]);check('total',sum(ts))
 elif kind=='deposits':
  growth=1+expr(m['rate']);balance=s.Integer(0)
  for _ in range(m['N']):
   if m['start']:balance+=m['payment']
   balance*=growth
   if not m['start']:balance+=m['payment']
  ages=list(range(1,m['N']+1)) if m['start'] else list(range(m['N']));zero(balance-sum(m['payment']*growth**age for age in ages));check('periods',max(ages));check('balance',s.floor(balance*100+s.Rational(1,2))/100)
 elif kind=='bounces':
  H,r=expr(m['H']),expr(m['r']);ts=terms(H,r,4,True);check('height',ts[-1]);tail=expr(f['distance'])-H;zero(tail-2*H*r-r*tail);same(bool(0<r<1),True)
 elif kind=='linked_models':
  d=m['d'];same(s.FiniteSet(expr(f['parameter'])),s.solveset((x+d)**2-x*(x+3*d),x,domain=s.S.Reals));a=expr(f['parameter']);r=expr(f['ratio']);zero(a*r-(a+d));zero(a*r*r-(a+3*d));check('ap_sum',sum(terms(a,d,4)));check('gp_sum',sum(terms(a,r,4,True)))
 else:raise ValueError(kind)

# Twenty worked examples, independently checked by recurrence or restoration.
ts=terms(1,4,20);same(ts[3],13);same(ts[8],33);same(ts[-1],77)
ts=terms(6,3,12);same(sum(ts),270);same(sum(ts[5:]),210)
P=3*n*n-2*n;zero(P-P.subs(n,n-1)-(6*n-5));same(P.subs(n,1),1)
ts=terms(5,3,8);same(sum(ts[:7]),98);same(sum(ts),124);same(all(sum(ts[:k])<=100 for k in range(1,8)),True)
ts=terms(6,-s.Rational(1,2),5,True);same(ts[-1],s.Rational(3,8));same(sum(ts),s.Rational(33,8))
for a,r in [(24,s.Rational(1,2)),(-24,-s.Rational(1,2))]:ts=terms(a,r,4,True);same(ts[1],12);same(ts[3],3)
same(sum(terms(9,1,12,True)),108)
ts=terms(10,-s.Rational(1,4),3,True);same(sum(ts),s.Rational(65,8));same(8-sum(ts),-s.Rational(1,8));zero(8-10+s.Rational(1,4)*8)
same(s.solveset(2*(2*x-1)-(x+1)-(5*x+3),x,domain=s.S.Reals),s.FiniteSet(-3));same(terms(-2,-5,3),[-2,-7,-12])
t=s.pi/3;zero(2*s.Rational(5,8)-s.sin(t)**2-2*s.cos(t)**2);zero(s.Rational(5,8)-s.sin(t)**2+s.Rational(1,8))
same(s.solveset(2*(x+2)-x*x-4,x,domain=s.S.Reals),s.FiniteSet(0,2));same(terms(0,2,3),[0,2,4]);same(terms(4,0,3),[4,4,4])
same(s.solveset((2-x)*(2+x)-4,x,domain=s.S.Reals),s.FiniteSet(0))
same(s.solveset(x*x-36,x,domain=s.S.Reals),s.FiniteSet(-6,6));zero(2*3*3-18);zero(2*(-3)*(-3)-18)
t=s.pi/6;zero(s.tan(t)*2*s.cos(t)-1);zero(1/s.tan(t)-s.sqrt(3))
c=s.Symbol('c',real=True);same(s.solveset((1-c)**2-(1-c*c),c,domain=s.Interval(-1,1)),s.FiniteSet(0,1));same(terms(1,1,3,True),[1,1,1])
same(0*0,0*7);same(0*3==7,False)
ts=terms(24000,900,6);same(ts[-1],28500);same(sum(ts),157500)
balance=s.Integer(0)
for _ in range(3):balance=(balance+500)*s.Rational(51,50)
same(balance,s.Rational(390201,250));same(s.floor(100*balance+s.Rational(1,2))/100,s.Rational(7804,5))
zero(9-3-2*3*s.Rational(1,2)/(1-s.Rational(1,2)))
same(s.solveset((x+3)**2-x*(x+9),x,domain=s.S.Reals),s.FiniteSet(3));same(sum(terms(3,3,4)),30);same(sum(terms(3,2,4,True)),45)
print(json.dumps(dict(quick_questions=len(models),worked_examples=20,exact_and_domain_assertions=checks,failed=0)))
