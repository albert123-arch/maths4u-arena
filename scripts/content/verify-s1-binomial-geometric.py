"""Independent DP, exact inverse reconstruction and terminal-history checks; no author imports."""
from pathlib import Path
from fractions import Fraction as F
from collections import defaultdict, Counter
from itertools import product, permutations
from math import isqrt
import json

pack=json.loads(Path('content/original/9709-s1/binomial-geometric-v1.json').read_text('utf-8'))
models=json.loads(Path('content/original/9709-s1/binomial-geometric-math-models.json').read_text('utf-8'));checks=0

def same(a,b):
 global checks
 assert a==b,(a,b)
 checks+=1

def dp(n,p):
 result={0:F(1)}
 for _ in range(n):
  nxt=defaultdict(F)
  for k,w in result.items():nxt[k]+=w*(1-p);nxt[k+1]+=w*p
  result=dict(nxt)
 same(sum(result.values()),1)
 return result

def mean(d):return sum(k*w for k,w in d.items())

def variance(d):
 mu=mean(d);return sum((k-mu)**2*w for k,w in d.items())

def prob(d,condition):return sum(w for k,w in d.items() if condition(k))

def survival(p,n):
 value=F(1)
 for _ in range(n):value*=1-p
 return value

def first(p,k):return survival(p,k-1)*p

def limit(p,alpha,strict):
 n=0
 while True:
  value=1-dp(n,p)[0]
  if (value>alpha if strict else value>=alpha):return n
  n+=1

def histories(p,horizon,target_s=1,target_f=None):
 out=[]
 def walk(history,w):
  done=history.count('S')==target_s or (target_f is not None and history.count('F')==target_f)
  if done or len(history)==horizon:out.append((history,w,done));return
  walk(history+'S',w*p);walk(history+'F',w*(1-p))
 walk('',F(1));same(sum(w for h,w,done in out),1)
 return out

for model in models:
 kind,r=model['kind'],model['params'];result={}
 if kind=='binomial':
  n,p=r['n'],F(r['p']);d=dp(n,p);result=dict(n=n,p=p,exact=d[r['r']],tail=prob(d,lambda x:x<=r['k']))
 elif kind=='categories':
  p=F(r['a'])+F(r['b']);n=r['n'];d=dp(n,p);result=dict(p=p,mean=mean(d),variance=variance(d),any=prob(d,lambda x:x>=1))
 elif kind=='interval':
  d=dp(r['n'],F(r['p']));L,U,rr=r['L'],r['U'],r['r'];inside=prob(d,lambda x:L<x<U);result=dict(interval=inside,upper=prob(d,lambda x:x>=U),conditional=d[rr]/inside);same(L<rr<U,True)
 elif kind=='order':
  n,p=r['n'],F(r['p']);d=dp(n,p);only_last=survival(p,n-1)*p;result=dict(one=d[1],last=only_last,any=1-d[0],choice='B');same(d[1],n*only_last)
 elif kind=='moments':
  mu,v=F(r['mean']),F(r['variance']);p=(mu-v)/mu;n=mu/p;same(n.denominator,1);d=dp(int(n),p);same(mean(d),mu);same(variance(d),v);result=dict(n=n,p=p,exact=d[r['r']])
 elif kind=='known_n':
  p=F(r['mean'])/r['n'];d=dp(r['n'],p);result=dict(p=p,variance=variance(d),conditional=d[r['r']]/prob(d,lambda x:x<=r['U']));same(mean(d),F(r['mean']))
 elif kind in ['threshold','ratio']:
  if kind=='ratio':
   q=F(r['ratio']);p=1-q;result.update(p=p,mean=1/p);same(first(p,3)/first(p,2),q)
  else:p=F(r['p'])
  alpha=F(r['alpha']);lo,hi=limit(p,alpha,False),limit(p,alpha,True);result.update(inclusive=lo,strict=hi)
  if kind=='threshold':result['boundary']=1-survival(p,lo)
  same(1-survival(p,lo)>=alpha,True);same(1-survival(p,lo-1)<alpha,True);same(1-survival(p,hi)>alpha,True);same(1-survival(p,hi-1)<=alpha,True)
 elif kind=='two_roots':
  n,v=r['n'],F(r['variance']);disc=1-4*v/n;num,den=isqrt(disc.numerator),isqrt(disc.denominator);same(num*num,disc.numerator);same(den*den,disc.denominator);low=(1-F(num,den))/2;high=(1+F(num,den))/2
  same(0<low<high<1,True);same(low+high,1);same(variance(dp(n,low)),v);same(variance(dp(n,high)),v);result=dict(low=low,high=high,mean_low=n*low,mean_high=n*high)
 elif kind=='groups':
  na,nb,pa,pb=r['na'],r['nb'],F(r['pa']),F(r['pb']);total=defaultdict(F);from_a=F(0)
  for bits in product([0,1],repeat=na+nb):
   w=F(1)
   for i,bit in enumerate(bits):
    p=pa if i<na else pb;w*=p if bit else 1-p
   score=sum(bits);total[score]+=w
   if sum(bits[:na])==1 and score==1:from_a+=w
  same(sum(total.values()),1);result=dict(zero=total[0],one=total[1],posterior=from_a/total[1])
 elif kind=='latent':
  w,pa,pb=map(F,[r['w'],r['pa'],r['pb']]);d=defaultdict(F);marginal=F(0)
  for p,weight in [(pa,w),(pb,1-w)]:
   for first_result,second_result in product([0,1],repeat=2):
    path=weight*(p if first_result else 1-p)*(p if second_result else 1-p);d[first_result+second_result]+=path
    if first_result:marginal+=path
  same(sum(d.values()),1);same(d[2]!=marginal*marginal,True);result=dict(marginal=marginal,two=d[2],variance=variance(d),choice='B')
 elif kind=='batches':
  inner=dp(r['n'],F(r['p']));q=prob(inner,lambda x:x>=r['r']);outer=dp(r['d'],q);result=dict(q=q,mean=mean(outer),exact=outer[r['k']])
 elif kind=='condition':
  original=dp(r['n'],F(r['p']));h=prob(original,lambda x:x>=1);d={k:w/h for k,w in original.items() if k>=1};same(sum(d.values()),1);result=dict(point=d[r['r']],lower=prob(d,lambda x:x<=r['r']),mean=mean(d))
 elif kind=='geo':
  p,t,m=F(r['p']),r['t'],r['m'];result=dict(point=first(p,t),tail=survival(p,m),by=1-survival(p,m),mean=1/p);same(result['mean'],1+(1-p)*result['mean']);same(first(p,1),p);same(result['tail']+result['by'],1)
 elif kind=='memory':
  p,a,b=F(r['p']),r['a'],r['b'];den=survival(p,a);further=1/p;result=dict(tail=survival(p,a+b)/den,point=first(p,a+b)/den,further=further,total=a+further);same(result['tail'],survival(p,b));same(result['point'],first(p,b));same(further,1+(1-p)*further)
 elif kind=='cap':
  p,c=F(r['p']),r['c'];paths=histories(p,c);last=sum(w for h,w,done in paths if len(h)==c);mu=sum(len(h)*w for h,w,done in paths);success=sum(w for h,w,done in paths if 'S' in h);result=dict(last=last,capped_mean=mu,success=success,unrestricted=1/p)
  same(last,survival(p,c-1));same(success,1-survival(p,c));same(mu<1/p,True);same(all('S' not in h[:-1] for h,w,done in paths),True)
 elif kind=='second':
  p,t,m=F(r['p']),r['t'],r['m'];paths=histories(p,max(t,m),target_s=2);point=sum(w for h,w,done in paths if done and len(h)==t);by=sum(w for h,w,done in paths if done and len(h)<=m);joint=sum(w for h,w,done in paths if done and len(h)==t and h[0]=='S');result=dict(point=point,by=by,joint=joint);same(all(h[:-1].count('S')<2 for h,w,done in paths),True)
 elif kind=='two_clocks':
  pa,pb,c=F(r['pa']),F(r['pb']),r['c'];A=histories(pa,c);B=histories(pb,c);both=one=equal=F(0)
  for ha,wa,da in A:
   for hb,wb,db in B:
    w=wa*wb
    if da and db:both+=w
    if da!=db:one+=w
    if da and db and len(ha)==len(hb):equal+=w
  result=dict(both=both,one=one,same=equal/both);same(0<=equal/both<=1,True)
 elif kind=='finite_bag':
  R,Bc=r['r'],r['b'];positions=[]
  for ordering in permutations(range(R+Bc)):positions.append(next(i+1 for i,obj in enumerate(ordering) if obj<R))
  counts=Counter(positions);d={k:F(v,len(positions)) for k,v in counts.items()};result=dict(third=d[3],mean=mean(d),choice='C');same(sum(d.values()),1);same(max(d),Bc+1);same(result['mean']!=F(R+Bc,R),True)
 elif kind=='race':
  p=F(r['p']);paths=histories(p,3,target_s=2,target_f=2);win=sum(w for h,w,done in paths if h.count('S')==2);third=sum(w for h,w,done in paths if len(h)==3);mu=sum(len(h)*w for h,w,done in paths);joint=sum(w for h,w,done in paths if len(h)==3 and h.count('S')==2);result=dict(win=win,third=third,mean=mu,conditional=joint/third)
  same(len(paths),6);same(all(done for h,w,done in paths),True);same(all(h[:-1].count('S')<2 and h[:-1].count('F')<2 for h,w,done in paths),True)
 else:raise ValueError(kind)
 if model.get('example'):
  expected=model['expected'];example=next(e for l in pack['lessons'] for e in l['examples'] if e['verification']==model['example']);same(bool(example['question'] and example['solution']),True)
 else:
  question=next(q for q in pack['questions'] if q['id']==model['uid']);expected={f['key']:f['expected'] for f in question['fields']}
 same(set(result),set(expected))
 for key,value in result.items():
  if key=='choice':same(value,expected[key])
  else:same(value,F(expected[key]))

same(len(models),60);same(sum(bool(m.get('example')) for m in models),20);same(len([q for q in pack['questions'] if q['collection']!='exam']),40)
print(json.dumps(dict(quick_questions=40,worked_examples=20,exact_model_structure_and_boundary_checks=checks,failed=0)))
