"""Independent raw-data statistics, restored moments and complete solution sets."""
from pathlib import Path
from fractions import Fraction as F
import json,statistics
import sympy as s
p=json.loads(Path('content/original/9709-s1/central-tendency-v1.json').read_text('utf-8'))
models=json.loads(Path('content/original/9709-s1/central-tendency-math-models.json').read_text('utf-8'));checks=0
def e(v):return s.sympify(str(v))
def same(a,b):
 global checks
 assert a==b,(a,b)
 checks+=1
def zero(v):same(s.simplify(v),0)
def med(a):
 a=sorted(map(F,a));n=len(a);return a[n//2] if n%2 else (a[n//2-1]+a[n//2])/2
def modes(a):
 counts={v:a.count(v) for v in set(a)};highest=max(counts.values());return set() if highest==1 else {e(k) for k,v in counts.items() if v==highest}
def aset(v):return set(map(e,v.strip('{}').split(','))) if v!='{}' else set()
def interval(v):
 a,b=map(e,v[1:-1].split(','));return s.Interval(a,b,left_open=v[0]=='(',right_open=v[-1]==')')
def pair(v):return tuple(e(a) for a in v.strip('()').split(','))
def positive_sd(value,variance):zero(e(value)**2-variance);same(bool(e(value)>=0),True)
def moments(n,S,Q):
 mean=e(S)/n;var=e(Q)/n-mean**2;same(bool(var>=0),True);return mean,var

for m in models:
 q=next(q for q in p['questions'] if q['id']==m['uid']);f={a['key']:a['expected'] for a in q['fields']};kind=m['kind']
 def check(k,value):zero(e(f[k])-e(value))
 if kind=='raw':
  a=m['data'];check('mean',statistics.mean(map(F,a)));check('median',med(a));same(aset(f['modes']),modes(a))
 elif kind=='outlier':
  a=m['data'];check('mean',statistics.mean(map(F,a)));check('median',med(a));same(f['choice'],m['choice']);same(statistics.mean(a)>med(a),True)
 elif kind=='modal_class':
  ed,fr=m['edges'],m['freq'];dens=[F(fr[i],ed[i+1]-ed[i]) for i in range(3)]
  for i,v in enumerate(dens,1):check('d'+str(i),v)
  j=dens.index(max(dens));k=fr.index(max(fr));same(interval(f['modal']),s.Interval.Ropen(ed[j],ed[j+1]));same(interval(f['frequency']),s.Interval.Ropen(ed[k],ed[k+1]))
 elif kind=='even_median':
  a=sorted(m['data']);n=len(a);same(n%2,0);check('count',n);same(pair(f['central']),(e(a[n//2-1]),e(a[n//2])));check('median',med(a))
 elif kind=='translation':
  n,C,Q,a=m['n'],m['C'],m['Q'],m['offset'];Sx=n*a+C;Qx=n*a*a+2*a*C+Q;mean,var=moments(n,Sx,Qx);check('mean',mean);check('sum',Sx);positive_sd(f['sd'],var)
 elif kind=='affine':
  n,C,Q,a,b=[m[k] for k in ('n','C','Q','a','b')];Sx=n*a+b*C;Qx=n*a*a+2*a*b*C+b*b*Q;mean,var=moments(n,Sx,Qx);check('mean',mean);check('variance',var);positive_sd(f['sd'],var)
 elif kind=='two_origins':
  n=e(f['count']);same(n.is_Integer and n>0,True);S=n*m['a']+m['Ca'];zero(S-n*m['b']-m['Cb']);check('mean',S/n)
 elif kind=='missing_pair':
  a,b=pair(f['pair']);same(bool(a<b),True);known=m['known'];zero(sum(known)+a+b-m['n']*e(m['mean']));zero(sum(z*z for z in known)+a*a+b*b-m['Q']);check('sum',a+b);check('squares',a*a+b*b)
  z=s.Symbol('z',real=True);same(s.solveset(z*z+(a+b-z)**2-a*a-b*b,z,domain=s.S.Reals),s.FiniteSet(a,b))
 elif kind=='frequency':
  a=[x for x,n in zip(m['values'],m['freq']) for _ in range(n)];check('count',len(a));check('mean',statistics.mean(map(F,a)));check('median',med(a));same(aset(f['modes']),modes(a))
 elif kind=='grouped':
  ed=m['edges'];a=[]
  for i,n in enumerate(m['freq']):a.extend([F(ed[i]+ed[i+1],2)]*n)
  check('mean',statistics.mean(a));variance=e(statistics.pvariance(a));check('variance',variance);positive_sd(f['sd'],variance)
 elif kind=='missing_frequency':
  k=e(f['frequency']);same(k.is_Integer and k>0,True);fr=[m['fixed'][0],int(k),m['fixed'][2]];a=[x for x,n in zip(m['values'],fr) for _ in range(n)];check('count',len(a));zero(e(statistics.mean(map(F,a)))-e(m['target']));same(aset(f['modes']),modes(a));same(e(m['target'])!=m['values'][1],True)
 elif kind=='grouped_median':
  ed,c=m['edges'],m['cum'];target=F(c[-1],2);check('level',target);i=next(i for i in range(len(ed)-1) if c[i]<=target<c[i+1]);same(interval(f['class']),s.Interval.Ropen(ed[i],ed[i+1]));estimate=e(f['median']);same(bool(ed[i]<=estimate<ed[i+1]),True);zero(c[i]+(estimate-ed[i])*(c[i+1]-c[i])/(ed[i+1]-ed[i])-e(target))
 elif kind=='weighted':
  N=m['na']+m['nb'];check('count',N);check('mean',F(m['na']*m['ma']+m['nb']*m['mb'],N));same(f['reason'],m['choice']);same(m['na']!=m['nb'] and m['ma']!=m['mb'],True)
 elif kind=='pooled':
  na,ma,sa,nb,mb,sb=[m[k] for k in ('na','ma','sa','nb','mb','sb')];N=na+nb;mean=F(na*ma+nb*mb,N);variance=F(na,N)*(sa*sa+(F(ma)-mean)**2)+F(nb,N)*(sb*sb+(F(mb)-mean)**2);check('mean',mean);check('variance',variance);positive_sd(f['sd'],e(variance))
 elif kind=='unknown_count':
  nb=e(f['unknown']);N=e(f['total']);same(nb.is_Integer and nb>0,True);zero(N-m['na']-nb);zero(m['na']*m['ma']+nb*m['mb']-N*m['target']);same(m['ma']<m['target']<m['mb'],True)
 elif kind=='two_codes':
  SA,SB=e(f['sa']),e(f['sb']);zero(SA-m['na']*m['a']-m['Ca']);zero(SB-m['nb']*m['b']-m['Cb']);check('mean',(SA+SB)/(m['na']+m['nb']))
 elif kind=='correction':
  n,S,Q,old,new=[m[k] for k in ('n','S','Q','old','new')];same(bool(e(Q-old*old)-(e(S-old))**2/(n-1)>=0),True);mean,var=moments(n,S-old+new,Q-old*old+new*new);check('mean',mean);check('variance',var);positive_sd(f['sd'],var)
 elif kind=='removal':
  n,S,Q,x=[m[k] for k in ('n','S','Q','removed')];N=n-1;mean,var=moments(N,S-x,Q-x*x);check('count',N);check('mean',mean);check('variance',var);positive_sd(f['sd'],var)
 elif kind=='add_pair':
  a,b=pair(f['pair']);same(bool(a<b),True);known=m['known'];N=len(known)+2;S=sum(known)+a+b;Q=sum(x*x for x in known)+a*a+b*b;mean,var=moments(N,S,Q);zero(mean-e(m['mean']));zero(var-e(m['variance']));check('sum',a+b);check('squares',a*a+b*b)
  z=s.Symbol('z',real=True);same(s.solveset(z*z+(a+b-z)**2-a*a-b*b,z,domain=s.S.Reals),s.FiniteSet(a,b))
 elif kind=='variance_constraint':
  known=m['known'];n=len(known)+1;t=s.Symbol('t',real=True);V=(sum(x*x for x in known)+t*t)/n-((sum(known)+t)/n)**2;minimum=e(f['minimum']);where=e(f['argmin']);zero(V.subs(t,where)-minimum);zero(V-(minimum+s.Rational(3,16)*(t-where)**2));same(interval(f['allowed']),s.solve_univariate_inequality(V<=e(m['threshold']),t,relational=False))
 else:raise AssertionError(kind)

# Independently restore numerical conclusions of all twenty worked examples.
same(statistics.mean([3,5,5,7,9,13]),7);same(med([3,5,5,7,9,13]),6);same(modes([3,5,5,7,9,13]),{s.Integer(5)})
same(modes([2,2,4,4,7,9]),{s.Integer(2),s.Integer(4)});same(modes([2,4,7,9]),set())
same(statistics.mean([8,9,10,12,81]),24);same(med([8,9,10,12,81]),10)
same([F(8,5),F(12,10),F(6,5)],[F(8,5),F(6,5),F(6,5)])
same(F(8*40+12,8),F('41.5'));same(F(50,8)-F(12,8)**2,4)
same(20+3*F(10,5),26);same(9*(F(30,5)-F(10,5)**2),18)
same(F(30+10,5),8);same(F(110,8),F(55,4))
same(sum([2,4,7,9,5,9]),36);same(sum(v*v for v in [2,4,7,9,5,9]),256)
same(statistics.mean(map(F,[1,1,2,2,2,5])),F(13,6));same(med([1,1,2,2,2,5]),2)
same(F(3*5+5*15+2*30,10),15);same(F(2+3*2+20,6+2),F(7,2));same(10+F(5-3,5)*10,14)
same(F(4*10+6*20,10),16);same(F(3*8+2*13,5),10);same(F(560,5)-100,12)
same(F(72+18*12,18),16);same(F(48+108,10),F('15.6'))
same(F(60-8+18,5),14);same(F(800-64+324,5)-14**2,16)
same(F(48-8,5),8);same(F(430-64,5)-64,F(46,5))
same(statistics.mean(map(F,[3,4,6,7,6,10])),6);same(statistics.pvariance(map(F,[3,4,6,7,6,10])),5)
t=s.Symbol('t',real=True);V=(56+t*t)/4-((12+t)/4)**2;zero(V-(2+s.Rational(3,16)*(t-4)**2));same(s.solve_univariate_inequality(V<=5,t,relational=False),s.Interval(0,8))
same(len({ex['verification'] for l in p['lessons'] for ex in l['examples']}),20)
print(json.dumps(dict(quick_questions=len(models),worked_examples=20,exact_structural_and_boundary_assertions=checks,failed=0)))
