"""Independent exact moments, rank conventions, branch completeness and examples."""
from pathlib import Path
from fractions import Fraction as F
import json,statistics
import sympy as s
p=json.loads(Path('content/original/9709-s1/variation-v1.json').read_text('utf-8'))
models=json.loads(Path('content/original/9709-s1/variation-math-models.json').read_text('utf-8'));checks=0
def e(v):return s.sympify(str(v))
def same(a,b):
 global checks
 assert a==b,(a,b)
 checks+=1
def zero(v):same(s.simplify(v),0)
def actual(a):return e(statistics.mean(map(F,a))),e(statistics.pvariance(map(F,a)))
def valueset(v):return s.FiniteSet(*(e(x) for x in v.strip('{}').split(',')))
def ordered(v):return tuple(e(x) for x in v.strip('()').split(','))
def positive_sd(value,var):zero(e(value)**2-var);same(bool(e(value)>=0),True)
def moments(n,S,Q):
 mean=e(S)/n;var=e(Q)/n-mean**2;same(bool(var>=0),True);return mean,var

for m in models:
 q=next(q for q in p['questions'] if q['id']==m['uid']);f={a['key']:a['expected'] for a in q['fields']};kind=m['kind']
 def check(key,value):zero(e(f[key])-e(value))
 if kind=='raw':
  mean,var=actual(m['data']);check('mean',mean);check('variance',var);positive_sd(f['sd'],var)
 elif kind=='quartiles':
  a=sorted(m['data']);n=len(a);q1=e(statistics.median(map(F,a[:n//2])));q3=e(statistics.median(map(F,a[(n+1)//2:])));check('range',a[-1]-a[0]);check('q1',q1);check('q3',q3);check('iqr',q3-q1)
 elif kind=='compare':
  ma,va=actual(m['a']);mb,vb=actual(m['b']);zero(ma-mb);check('va',va);check('vb',vb);same(f['choice'],'A' if va<vb else 'B')
 elif kind=='reference':
  a=m['data'];c=s.Symbol('c',real=True);total=sum((e(x)-c)**2 for x in a);where=e(f['origin']);minimum=e(f['minimum']);zero(total-(minimum+len(a)*(c-where)**2));check('variance',minimum/len(a));same(s.diff(total,c).subs(c,where),0)
 elif kind in ['translation','affine','restore']:
  n,D,E=m['n'],m['D'],m['E'];a,b=(m['c'],1) if kind=='translation' else (m['a'],m['b']);S=n*a+b*D;Q=n*a*a+2*a*b*D+b*b*E;mean,var=moments(n,S,Q)
  if 'mean' in f:check('mean',mean)
  check('variance',var)
  if 'sd' in f:positive_sd(f['sd'],var)
  if kind=='restore':check('sum',S);check('squares',Q)
 elif kind=='recode':
  n,D,E,c,d=[m[k] for k in ('n','D','E','c','d')];S=n*c+D;Q=n*c*c+2*c*D+E;check('sum',S-n*d);check('squares',Q-2*d*S+n*d*d);mean,var=moments(n,S,Q);positive_sd(f['sd'],var)
 elif kind=='two_counts':
  S,Q,V=m['S'],m['Q'],m['variance'];counts=[n for n in range(2,int(F(Q,V))+1) if F(Q,n)-F(S,n)**2==V];same(valueset(f['counts']),s.FiniteSet(*counts));selected=[n for n in counts if F(S,n)>m['lower_mean']];same(len(selected),1);check('selected',selected[0]);check('mean',F(S,selected[0]))
 elif kind=='two_means':
  x=s.Symbol('x',real=True);means=s.solveset(e(m['Q'])/m['n']-x*x-m['variance'],x,domain=s.S.Reals);same(valueset(f['means']),means);positive=[a for a in means if a>0];same(len(positive),1);check('positive',positive[0]);check('sum',m['n']*positive[0])
 elif kind=='hidden_origin':
  n=m['n'];origin=e(f['origin']);zero(n*(m['mean']-origin)-m['D']);var=e(m['E'])/n-(e(m['D'])/n)**2;check('variance',var);positive_sd(f['sd'],var)
 elif kind=='feasibility':
  n,S,Q=m['n'],m['S'],m['Q'];minimum=e(S)**2/n;check('minimum',minimum);check('implied',e(Q)/n-(e(S)/n)**2);same(f['choice'],'A' if Q>=minimum else 'B')
 elif kind=='correction':
  n,S,Q,old,new=[m[k] for k in ('n','S','Q','old','new')];same(bool(e(Q-old*old)-e(S-old)**2/(n-1)>=0),True);mean,var=moments(n,S-old+new,Q-old*old+new*new);check('mean',mean);check('variance',var);positive_sd(f['sd'],var)
 elif kind=='removal':
  n,S,Q,x=[m[k] for k in ('n','S','Q','x')];mean,var=moments(n-1,S-x,Q-x*x);check('count',n-1);check('mean',mean);check('variance',var);positive_sd(f['sd'],var)
 elif kind=='pooled':
  na,ma,sa,nb,mb,sb=[m[k] for k in ('na','ma','sa','nb','mb','sb')];N=na+nb;mean=e(na*ma+nb*mb)/N;var=e(na)/N*(sa*sa+(ma-mean)**2)+e(nb)/N*(sb*sb+(mb-mean)**2);check('mean',mean);check('variance',var);positive_sd(f['sd'],var)
 elif kind=='missing_group':
  nb=e(f['count']);mb=e(f['mean']);vb=e(f['variance']);same(nb.is_Integer and nb>0,True);zero(nb+m['na']-m['N']);zero(nb*mb+m['na']*m['ma']-m['N']*m['M']);zero(nb*(vb+mb*mb)+m['na']*(m['sa']**2+m['ma']**2)-m['N']*(m['sd']**2+m['M']**2));same(bool(vb>=0),True)
 elif kind in ['frequency','grouped']:
  xs=m['values'] if kind=='frequency' else [F(a+b,2) for a,b in zip(m['edges'],m['edges'][1:])];raw=[x for x,n in zip(xs,m['freq']) for _ in range(n)];mean,var=actual(raw);check('mean',mean);check('variance',var);positive_sd(f['sd'],var)
  if 'count' in f:check('count',len(raw))
 elif kind=='percentiles':
  edges,cum=m['edges'],m['cum'];N=cum[-1]
  for key,prop in [('q1',F(1,4)),('q3',F(3,4)),('p90',F(9,10))]:
   value=e(f[key]);i=next(i for i in range(len(edges)-1) if edges[i]<=value<=edges[i+1]);zero(cum[i]+(value-edges[i])*(cum[i+1]-cum[i])/(edges[i+1]-edges[i])-e(prop*N))
  check('iqr',e(f['q3'])-e(f['q1']))
 elif kind=='missing_pair':
  a,b=ordered(f['pair']);same(bool(a<b),True);known=m['known'];raw=known+[a,b];mean,var=actual(raw);zero(mean-e(m['mean']));zero(var-e(m['variance']));check('sum',a+b);check('squares',a*a+b*b);x=s.Symbol('x',real=True);same(s.solveset(x*x+(a+b-x)**2-a*a-b*b,x,domain=s.S.Reals),s.FiniteSet(a,b))
 else:raise AssertionError(kind)

# Reconstruct all twenty worked examples separately from the authoring module.
same(actual([4,6,8,10,12]),(s.Integer(8),s.Integer(8)));same(actual([0,4,8,12,16]),(s.Integer(8),s.Integer(32)))
a=[2,3,4,6,6,7,10,30];same(a[-1]-a[0],28);same(statistics.median(a[:4]),3.5);same(statistics.median(a[4:]),8.5)
same(moments(5,40,350),(s.Integer(8),s.Integer(6)));same(sum((x-8)**2 for x in [3,7,9,13]),52)
same(moments(6,609,61839),(s.Rational(203,2),s.Rational(17,4)))
same(30-4*s.Rational(12,8),24);same(16*(s.Rational(30,8)-s.Rational(12,8)**2),24)
same(-10-5*5,-35);same(46-10*(-10)+125,271);same(s.Rational(271,5)-7**2,s.Rational(26,5))
same(moments(4,52,696),(s.Integer(13),s.Integer(5)))
same([n for n in range(2,16) if F(120,n)-F(20,n)**2==8],[5,10]);same(150/6-9,16)
same(5*(12-15),-15);same(s.Rational(80,5)-9,7);same(s.Rational(140,6)-25,-s.Rational(5,3));same(s.Rational(30**2,6),150)
same(moments(5,65,865),(s.Integer(13),s.Integer(4)));same(moments(5,42,384),(s.Rational(42,5),s.Rational(156,25)))
same(moments(10,110,1292),(s.Integer(11),s.Rational(41,5)));same(moments(6,84,1190),(s.Integer(14),s.Rational(7,3)))
same(actual([1,3,3,5,5,5]),(s.Rational(11,3),s.Rational(20,9)))
same(actual([2]*4+[7]*9+[15]*5),(s.Rational(73,9),s.Rational(1790,81)))
same(8+(s.Rational(35,3)-10)*s.Rational(24,20),10);same(8+(s.Rational(85,3)-10)*s.Rational(24,20),30);same(32+(40-30)*s.Rational(8,20),36)
same(actual([2,4,5,7,8,10]),(s.Integer(6),s.Integer(7)))
same(len({ex['verification'] for l in p['lessons'] for ex in l['examples']}),20)
# General identities used in the notes, independently expanded from raw moments.
n=s.Symbol('n',positive=True,integer=True);mu=s.Symbol('mu',real=True);v=s.Symbol('v',positive=True);z=s.Symbol('z',real=True)
new=(n*(v+mu*mu)+z*z)/(n+1)-((n*mu+z)/(n+1))**2
model=n*v/(n+1)+n*(z-mu)**2/(n+1)**2
zero(new-model)
roots=s.solveset(new-v,z,domain=s.S.Reals)
same(len(roots),2)
for root in roots:same(any(s.simplify(root-candidate)==0 for candidate in [mu-s.sqrt((n+1)*v/n),mu+s.sqrt((n+1)*v/n)]),True)
same(s.solveset(new.subs(v,0),z,domain=s.S.Reals),s.FiniteSet(mu))
d,t=s.symbols('d t',nonnegative=True)
change=(mu-d-t)**2+(mu+d+t)**2-(mu-d)**2-(mu+d)**2
zero(change-(4*d*t+2*t*t))
sx,sy=s.symbols('sx sy',positive=True);my=s.Symbol('my',real=True)
for scale in [-sy/sx,sy/sx]:
 offset=my-scale*mu;zero(scale*mu+offset-my);zero(scale**2*sx**2-sy**2)
print(json.dumps(dict(quick_questions=len(models),worked_examples=20,exact_structural_and_boundary_assertions=checks,failed=0)))
