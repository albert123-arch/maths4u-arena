"""Independent exact elementary-outcome/central-moment checks, without author imports."""
from pathlib import Path
from fractions import Fraction as F
from itertools import product, permutations
from collections import defaultdict, Counter
import json, math
import sympy as sp

pack=json.loads(Path('content/original/9709-s1/distributions-v1.json').read_text('utf-8'))
models=json.loads(Path('content/original/9709-s1/distributions-math-models.json').read_text('utf-8'));checks=0

def same(a,b):
 global checks
 assert a==b,(a,b)
 checks+=1

def distribution(paths):
 result=defaultdict(F)
 for score,prob in paths:result[F(score)]+=F(prob)
 return dict(result)

def equiprobable(scores):
 counts=Counter(scores);return {F(x):F(n,len(scores)) for x,n in counts.items()}

def direct(d):
 mu=sum(x*p for x,p in d.items());variance=sum((x-mu)**2*p for x,p in d.items())
 same(sum(d.values()),1);same(all(0<=p<=1 for p in d.values()),True);same(variance>=0,True)
 return mu,variance

def event(d,predicate):return sum(p for x,p in d.items() if predicate(x))

for m in models:
 kind,r=m['kind'],m['params'];result={};d={}
 def moments(d):result.update(mean=direct(d)[0],variance=direct(d)[1])
 if kind=='weights':
  total=sum(r['ws']);d={F(x):F(w,total) for x,w in zip(r['xs'],r['ws'])};result['k']=F(1,total);moments(d);result['above']=event(d,lambda x:x>result['mean'])
 elif kind in ['unknown_mean','unknown_second']:
  xs=r['xs'];ps=list(map(F,r['ps']));power=1 if kind=='unknown_mean' else 2;i,j=(1,2) if power==1 else (0,2);known=0 if power==1 else 1
  p,q=sp.symbols('p q');target=sum(x**power*w for x,w in zip(xs,ps));sol=sp.solve([p+q-(1-ps[known]),xs[i]**power*p+xs[j]**power*q-(target-xs[known]**power*ps[known])],[p,q]);result.update(p=F(str(sol[p])),q=F(str(sol[q])));d={F(xs[known]):ps[known],F(xs[i]):result['p'],F(xs[j]):result['q']};moments(d)
 elif kind=='parameter':
  t=sp.symbols('t');sol=sp.solve(-t+4*t-3*F(r['t']),t);same(len(sol),1);tt=F(str(sol[0]));same(0<=tt<=F(1,3),True);d={F(-1):tt,F(0):1-3*tt,F(2):2*tt};mu,v=direct(d);result.update(t=tt,zero=d[F(0)],second=sum(x*x*p for x,p in d.items()),variance=v,choice='B')
 elif kind in ['sum','difference','minimum']:
  xs=r['labels'];scores=[]
  for a in xs:
   for b in xs:scores.append(a+b if kind=='sum' else abs(a-b) if kind=='difference' else sorted([a,b])[0])
  d=equiprobable(scores);moments(d)
  if kind=='sum':result['event']=d[F(xs[0]+xs[-1])]
  elif kind=='minimum':result['minimum']=d[F(min(xs))]
  else:
   positive=[z for z in scores if z>0];result.update(zero=d[F(0)],conditional=F(sum(z>=xs[1]-xs[0]+1 for z in positive),len(positive)))
 elif kind=='unequal_trials':
  ps=list(map(F,r['ps']));paths=[]
  for path in product([False,True],repeat=3):paths.append((sum(path),math.prod(p if success else 1-p for success,p in zip(path,ps))))
  d=distribution(paths);moments(d);result.update(two=d[F(2)],choice='C');same(sum(d.values()),1)
 elif kind in ['marked','sample_sum']:
  labels=[1]*r['r']+[0]*r['b'] if kind=='marked' else r['labels'];scores=[labels[a]+labels[b] for a,b in permutations(range(len(labels)),2)];d=equiprobable(scores);moments(d)
  if kind=='marked':result.update({'p'+str(x):d.get(F(x),F(0)) for x in range(3)})
  else:result.update(subsets=len(scores)//2,event=d[sorted(d)[1]])
 elif kind in ['first','last']:
  R,B=r['r'],r['b'];scores=[]
  for ordering in permutations(range(R+B)):
   positions=[i+1 for i,obj in enumerate(ordering) if obj<R];scores.append(positions[0] if kind=='first' else positions[-1])
  d=equiprobable(scores);moments(d)
  if kind=='first':result.update(maximum=max(scores),third=d.get(F(3),F(0)));same(min(scores),1);same(max(scores),B+1)
  else:result.update(last=d[F(R+B)],conditional=F(scores.count(R+B),sum(x>=R+B-1 for x in scores)));same(min(scores),R);same(max(scores),R+B)
 elif kind=='mixture':
  paths=[];numerator=F(0)
  for bag,weight in [('a',F(r['w'])),('b',1-F(r['w']))]:
   for score in r[bag]:
    p=weight/len(r[bag]);paths.append((score,p))
    if bag=='a' and score>0:numerator+=p
  d=distribution(paths);moments(d);positive=event(d,lambda x:x>0);result.update(positive=positive,posterior=numerator/positive)
 elif kind=='transfer':
  source=[1]*r['sr']+[0]*r['sb'];base=[1]*r['dr']+[0]*r['db'];paths=[];numerator=F(0)
  for transfer in source:
   final=base+[transfer]
   for a,b in permutations(range(len(final)),2):
    score=final[a]+final[b];p=F(1,len(source)*len(final)*(len(final)-1));paths.append((score,p))
    if transfer and score==1:numerator+=p
  d=distribution(paths);moments(d);result.update(one=d[F(1)],posterior=numerator/d[F(1)])
 elif kind=='truncate':
  pairs=[(F(x),F(w,sum(r['ws']))) for x,w in zip(r['xs'],r['ws'])];condition=sum(p for x,p in pairs if x>0);d={x:p/condition for x,p in pairs if x>0};moments(d);result.update(condition=condition,largest=d[max(d)]);same(sum(d.values()),1)
 elif kind=='retry':
  p,q=map(F,[r['p'],r['q']]);paths=[(2,p),(1,(1-p)*q),(0,(1-p)*(1-q))];d=distribution(paths);moments(d);result.update(one=d[F(1)],conditional=d[F(2)]/(1-d[F(0)]))
 elif kind=='affine':
  pairs=[(F(x),F(p)) for x,p in zip(r['xs'],r['ps'])];d=distribution([(r['a']*x+r['b'],p) for x,p in pairs]);moments(d)
  for i,x in enumerate(r['xs']):result['y'+str(i)]=r['a']*x+r['b']
  original=direct(dict(pairs));same(result['mean'],r['a']*original[0]+r['b']);same(result['variance'],r['a']**2*original[1]);same(r['a']<0,True)
 elif kind=='score':
  xs=r['xs'];ps=list(map(F,r['ps']));mu=sum(x*p for x,p in zip(xs,ps));a=(mu-xs[0]*ps[0]-xs[1]*ps[1])/ps[2];d={F(xs[0]):ps[0],F(xs[1]):ps[1],a:ps[2]};actual_mu,v=direct(d);same(a,xs[2]);same(actual_mu,mu);result.update(score=a,second=sum(x*x*p for x,p in d.items()),variance=v,above=event(d,lambda x:x>mu))
 elif kind=='reward':
  gross=dict(zip(map(F,r['xs']),map(F,r['ps'])));d={x-r['fee']:p for x,p in gross.items()};moments(d);result.update(fair=direct(gross)[0],positive=event(d,lambda x:x>0));same(result['mean'],result['fair']-r['fee']);same(result['variance'],direct(gross)[1])
 elif kind=='compare':
  for name in ['a','b']:
   dd=equiprobable(r[name]);mu,v=direct(dd);result['mean'+name.upper()]=mu;result['variance'+name.upper()]=v
  same(result['meanA'],result['meanB']);same(result['varianceB']<result['varianceA'],True);result['choice']='B'
 else:raise ValueError(kind)
 if m.get('example'):
  expected=m['expected'];ex=next(e for l in pack['lessons'] for e in l['examples'] if e['verification']==m['example']);same(bool(ex['question'] and ex['solution']),True)
 else:
  q=next(q for q in pack['questions'] if q['id']==m['uid']);expected={f['key']:f['expected'] for f in q['fields']}
 same(set(result),set(expected))
 for key,value in result.items():
  if key=='choice':same(value,expected[key])
  else:same(value,F(expected[key]))

same(len(models),60);same(sum(bool(m.get('example')) for m in models),20)
same(len([q for q in pack['questions'] if q['collection']!='exam']),40)
print(json.dumps(dict(quick_questions=40,worked_examples=20,exact_model_structure_and_boundary_checks=checks,failed=0)))
