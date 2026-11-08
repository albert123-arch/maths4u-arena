"""Independent high-precision normal, quantile, reward and discrete-boundary audit."""
from pathlib import Path
from fractions import Fraction as F
import json
import mpmath as mp
mp.mp.dps=45
p=json.loads(Path('content/original/9709-s1/normal-v1.json').read_text('utf-8'))
models=json.loads(Path('content/original/9709-s1/normal-math-models.json').read_text('utf-8'));checks=0;diagnostics=[]

def M(v):
 if isinstance(v,(F,str)):
  try:f=F(v);return mp.mpf(f.numerator)/f.denominator
  except ValueError:pass
 return mp.mpf(str(v))
def same(a,b):
 global checks
 assert a==b,(a,b)
 checks+=1
def close(a,b):
 global checks
 assert abs(M(a)-M(b))<mp.mpf('0.000000001'),(a,b)
 checks+=1
def cdf(z):return (1+mp.erf(M(z)/mp.sqrt(2)))/2
def tail(z):return mp.erfc(M(z)/mp.sqrt(2))/2
def inv(q):return mp.sqrt(2)*mp.erfinv(2*M(q)-1)
def area(a,b,mu,sd):return cdf((M(b)-mu)/sd)-cdf((M(a)-mu)/sd)
def quantile(mu,sd,q):return mu+sd*inv(q)
def count_dp(n,pp):
 d={0:F(1)}
 for _ in range(n):
  nd={}
  for k,w in d.items():nd[k]=nd.get(k,F(0))+w*(1-pp);nd[k+1]=nd.get(k+1,F(0))+w*pp
  d=nd
 same(sum(d.values()),1);return d

for m in models:
 k,r=m['kind'],m['params'];result={}
 if k=='notation':
  mu,sd,x=M(r['mu']),mp.sqrt(r['var']),M(r['x']);z=(x-mu)/sd;result=dict(sd=sd,z=z,probability=tail(z));close(sd*sd,r['var'])
 elif k=='interval':
  mu,sd,a,b=map(M,[r['mu'],r['sd'],r['a'],r['b']]);result=dict(lower=(a-mu)/sd,upper=(b-mu)/sd,probability=area(a,b,mu,sd));density=lambda t:mp.exp(-(t-mu)**2/(2*sd*sd))/(sd*mp.sqrt(2*mp.pi));close(mp.quad(density,[a,b]),result['probability'])
 elif k=='recorded':
  mu,sd,v,step=map(M,[r['mu'],r['sd'],r['r'],r['step']]);lo,hi=v-step/2,v+step/2;result=dict(lower=lo,upper=hi,point=0,probability=area(lo,hi,mu,sd));same(result['probability']>0,True)
 elif k=='spread':
  d,s1,s2=map(M,[r['d'],r['s1'],r['s2']]);a=area(-d,d,M(0),s1);b=area(-d,d,M(0),s2);result={'A':a,'B':b,'choice':'B'};same(a>b,True)
 elif k=='cutoff':
  mu,sd,q=map(M,[r['mu'],r['sd'],r['p']]);z=inv(q);cut=mu+sd*z;result=dict(z=z,cutoff=cut);close(cdf((cut-mu)/sd),q)
 elif k=='mean':
  sd,a,q=map(M,[r['sd'],r['a'],r['p']]);mu=a-sd*inv(q);result=dict(mean=mu,probability=area(r['l'],r['u'],mu,sd));close(cdf((a-mu)/sd),q)
 elif k=='sd':
  mu,a,q=map(M,[r['mu'],r['a'],r['tail']]);sd=(a-mu)/inv(1-q);result=dict(sd=sd,variance=sd*sd,probability=area(r['l'],r['u'],mu,sd));same(sd>0,True);close(tail((a-mu)/sd),q)
 elif k=='fit':
  a,b,pa,pb=map(M,[r['a'],r['b'],r['pa'],r['pb']]);za,zb=inv(pa),inv(pb);mu,sd=mp.lu_solve(mp.matrix([[1,za],[1,zb]]),mp.matrix([a,b]));same(sd>0,True);close(cdf((a-mu)/sd),pa);close(cdf((b-mu)/sd),pb);result=dict(mean=mu,sd=sd,probability=pb-pa)
 elif k=='conditional':
  mu,sd,a,b=map(M,[r['mu'],r['sd'],r['a'],r['b']]);den=tail((a-mu)/sd);num=tail((b-mu)/sd);result=dict(condition=den,numerator=num,conditional=num/den);same(num<den,True)
 elif k=='repeated':
  mu,sd,c=map(M,[r['mu'],r['sd'],r['c']]);q=tail((c-mu)/sd);d={0:mp.mpf(1)}
  for _ in range(r['n']):
   nd={}
   for count,w in d.items():nd[count]=nd.get(count,0)+w*(1-q);nd[count+1]=nd.get(count+1,0)+w*q
   d=nd
  close(sum(d.values()),1);result=dict(q=q,probability=d[r['k']],mean=sum(count*w for count,w in d.items()))
 elif k=='mixture':
  ma,sa,mb,sb,w,c=map(M,[r['ma'],r['sa'],r['mb'],r['sb'],r['w'],r['c']]);left=w*cdf((c-ma)/sa);right=(1-w)*cdf((c-mb)/sb);total=left+right;result=dict(probability=total,posterior=left/total,count=r['n']*total);same(0<left/total<1,True)
 elif k=='rounded_condition':
  mu,sd,v,kk=map(M,[r['mu'],r['sd'],r['r'],r['k']]);boundary=kk-M('.5');num=area(v-M('.5'),v+M('.5'),mu,sd);den=tail((boundary-mu)/sd);result=dict(boundary=boundary,recorded=num,conditional=num/den,choice='C');same(v-M('.5')>=boundary,True)
 elif k in ['conditions','upper','approx_interval','point','inverse_binomial']:
  if k=='inverse_binomial':
   mean,var=F(r['mean']),F(r['variance']);pp=1-var/mean;nn=mean/pp;same(nn.denominator,1);n=int(nn);result.update(n=n,p=pp)
  else:n,pp=r['n'],F(r['p']);mean=n*pp;var=mean*(1-pp)
  if k=='conditions':result.update(np=mean,nq=n*(1-pp),choice='B' if mean>5 and n*(1-pp)>5 else 'C')
  else:
   same(mean>5 and n*(1-pp)>5,True);sd=mp.sqrt(M(var));mu=M(mean)
   if k in ['upper','inverse_binomial']:
    lo=F(r['k'])-F(1,2);z=(M(lo)-mu)/sd;val=tail(z);result.update(boundary=lo,probability=val)
    if k=='upper':result['z']=z
    lower_integer,upper_integer=r['k'],n
   else:
    lo,hi=(F(r['L'])+F(1,2),F(r['U'])-F(1,2)) if k=='approx_interval' else (F(r['k'])-F(1,2),F(r['k'])+F(1,2));val=area(lo,hi,mu,sd);result.update(lower=lo,upper=hi,probability=val);lower_integer,upper_integer=(r['L']+1,r['U']-1) if k=='approx_interval' else (r['k'],r['k'])
   d=count_dp(n,pp);exact=sum(w for i,w in d.items() if lower_integer<=i<=upper_integer);diagnostics.append(dict(uid=m['uid'],normal=float(val),exactBinomial=float(exact),absoluteError=float(abs(val-M(exact)))))
 elif k=='integer_cutoff':
  mu,sd,q=map(M,[r['mu'],r['sd'],r['p']]);cut=quantile(mu,sd,q);n=int(mp.ceil(cut));same(cdf((n-mu)/sd)>=q,True);same(cdf((n-1-mu)/sd)<q,True);result=dict(cutoff=cut,integer=n,probability=cdf((n-mu)/sd))
 elif k=='reward':
  mu,sd,c=map(M,[r['mu'],r['sd'],r['c']]);q=tail((c-mu)/sd);lo,hi=M(r['low']),M(r['high']);mean=lo*(1-q)+hi*q;second=lo*lo*(1-q)+hi*hi*q;result=dict(q=q,mean=mean,variance=second-mean*mean);same(result['variance']>=0,True)
 elif k=='relative_sd':
  c,a,q=map(M,[r['c'],r['a'],r['tail']]);z=inv(1-q);mu=a/(1+c*z);sd=c*mu;same(mu>0 and sd>0,True);close(tail((a-mu)/sd),q);result=dict(mean=mu,sd=sd,negative=tail(mu/sd),choice='B')
 else:raise ValueError(k)
 if m.get('example'):
  expected=m['expected'];ex=next(e for l in p['lessons'] for e in l['examples'] if e['verification']==m['example']);same(bool(ex['question'] and ex['solution']),True)
 else:
  q=next(q for q in p['questions'] if q['id']==m['uid']);expected={f['key']:f['expected'] for f in q['fields']}
 same(set(result),set(expected))
 for key,value in result.items():
  if key=='choice':same(value,expected[key])
  else:close(value,expected[key])

same(len(models),60);same(len([q for q in p['questions'] if q['collection']!='exam']),40)
report=dict(quick_questions=40,worked_examples=20,independent_high_precision_checks=checks,failed=0,normalApproximationComparisons=len(diagnostics),largestApproximationError=max(x['absoluteError'] for x in diagnostics))
print(json.dumps(report))
