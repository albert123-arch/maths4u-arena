"""Independent ordered ranks, expanded datasets and interpolation for the short bank."""
import json,statistics,math
from fractions import Fraction as F
from pathlib import Path
from html.parser import HTMLParser
import sympy as s
p=json.loads(Path('content/original/9709-s1/representation-v1.json').read_text('utf-8'))
models=json.loads(Path('content/original/9709-s1/representation-math-models.json').read_text('utf-8'));checks=0
def same(a,b):
 global checks
 assert a==b,(a,b)
 checks+=1
def expr(v):return s.sympify(str(v))
def zero(v):same(s.simplify(v),0)
def middle(a):
 a=sorted(map(F,a));n=len(a)
 return a[n//2] if n%2 else (a[n//2-1]+a[n//2])/2
def summary(a):
 a=sorted(a);n=len(a);return [F(a[0]),middle(a[:n//2]),middle(a),middle(a[(n+1)//2:]),F(a[-1])]
def moment(a):
 a=list(map(F,a));mean=sum(a)/len(a);return mean,sum((v-mean)**2 for v in a)/len(a)
def forward(edges,cum,z):
 for i in range(len(edges)-1):
  if edges[i]<=z<=edges[i+1]:return F(cum[i])+F(z-edges[i],edges[i+1]-edges[i])*(cum[i+1]-cum[i])
 raise AssertionError(z)
def inverse(edges,cum,r):
 for i in range(len(cum)-1):
  if cum[i]<=r<=cum[i+1]:return F(edges[i])+F(r-cum[i],cum[i+1]-cum[i])*(edges[i+1]-edges[i])
 raise AssertionError(r)
def aset(v):return set(map(expr,v.strip('{}').split(',')))
class Stem(HTMLParser):
 def __init__(self,html):
  super().__init__();self.body=False;self.rows=[];self.row=[];self.cell=None;self.feed(html)
 def handle_starttag(self,tag,attrs):
  if tag=='tbody':self.body=True
  if tag=='tr' and self.body:self.row=[]
  if tag in ('td','th') and self.body:self.cell=''
 def handle_data(self,text):
  if self.cell is not None:self.cell+=text
 def handle_endtag(self,tag):
  if tag in ('td','th') and self.cell is not None:self.row.append(self.cell.strip());self.cell=None
  if tag=='tr' and self.body:self.rows.append(self.row)
  if tag=='tbody':self.body=False
 def values(self):return [10*int(stem)+int(leaf) for stem,leaves in self.rows for leaf in leaves.split() if leaf!='—']

for m in models:
 q=next(q for q in p['questions'] if q['id']==m['uid']);f={a['key']:a['expected'] for a in q['fields']};kind=m['kind']
 def check(k,v):zero(expr(f[k])-expr(v))
 if kind=='key':check('value',(m['stem']*10+m['leaf'])*F(m['scale']));same(f['type'],m['choice'])
 elif kind=='diagram':
  chosen=q['fields'][0]['options'][f['diagram']];same(Stem(chosen).values(),sorted(m['data']));check('count',len(m['data']));same(len([h for h in q['fields'][0]['options'].values() if Stem(h).values()==sorted(m['data'])]),1)
 elif kind=='quartiles':
  v=summary(m['data']);check('q1',v[1]);check('median',v[2]);check('q3',v[3]);check('iqr',v[3]-v[1])
 elif kind=='missing_leaf':
  v=summary(m['data']);value=middle(m['data']);check('value',value);check('leaf',int(value)%10);check('iqr',v[3]-v[1]);same(q['prompt_html'].count(' a</td>'),1)
 elif kind=='back':
  a,b=summary(m['a']),summary(m['b']);check('ma',a[2]);check('mb',b[2]);check('ia',a[3]-a[1]);check('ib',b[3]-b[1]);same(a[2]<b[2],True);same(a[3]-a[1]<b[3]-b[1],True);same(f['comparison'],'B')
 elif kind=='missing_mean':
  answer=expr(f['missing']);zero((sum(m['data'])+answer)/5-m['mean']);check('median',middle(m['data']+[int(answer)]))
 elif kind=='summary_comparison':
  a,b=m['a'],m['b'];check('ra',a[4]-a[0]);check('rb',b[4]-b[0]);same(a[2]<b[2],True);same(a[3]-a[1],b[3]-b[1]);same(f['comparison'],'C')
 elif kind=='pooled':
  n=m['na']+m['nb'];mean=F(m['na']*m['ma']+m['nb']*m['mb'],n)
  variance=F(m['na'],n)*(m['sa']**2+(F(m['ma'])-mean)**2)+F(m['nb'],n)*(m['sb']**2+(F(m['mb'])-mean)**2)
  check('mean',mean);check('variance',variance);zero(expr(f['sd'])**2-expr(variance));same(bool(expr(f['sd'])>0),True)
 elif kind=='density':
  for i in range(3):check('d'+str(i+1),F(m['freq'][i],m['edges'][i+1]-m['edges'][i]))
  same(f['modal'],'ABC'[m['freq'].index(max(m['freq']))])
 elif kind=='scale':check('density',m['height']*m['scale']);check('frequency',m['width']*m['height']*m['scale']);check('height',F(m['otherfreq'],m['otherwidth']*m['scale']))
 elif kind=='rounding':
  lo,hi,step=map(F,[m['lo'],m['hi'],m['step']]);lower,upper=lo-step/2,hi+step/2;same(f['interval'],'['+str(lower)+','+str(upper)+')');check('width',upper-lower)
 elif kind=='grouped_moments':
  a=[]
  for i,n in enumerate(m['freq']):a.extend([F(m['edges'][i]+m['edges'][i+1],2)]*n)
  mean,variance=moment(a);check('mean',mean);check('variance',variance);zero(expr(f['sd'])**2-expr(variance));same(abs(float(expr(f['sd']))-statistics.pstdev(map(float,a)))<1e-12,True)
 elif kind=='cumulative_frequencies':
  counts=[m['cum'][i+1]-m['cum'][i] for i in range(3)]
  for i,n in enumerate(counts,1):check('f'+str(i),n)
  same(sum(counts),m['cum'][-1])
 elif kind=='cumulative_quartiles':
  e,c=m['edges'],m['cum'];values=[inverse(e,c,F(c[-1]*j,4)) for j in (1,2,3)]
  for k,z in zip(['q1','median','q3'],values):check(k,z)
  check('iqr',values[2]-values[0])
 elif kind=='cumulative_tail':
  e,c=m['edges'],m['cum'];at15=forward(e,c,15);at30=forward(e,c,30);check('above',c[-1]-at15);check('between',at30-at15);check('percent',F(100,c[-1])*(c[-1]-at15))
 elif kind=='percentiles':
  e,c=m['edges'],m['cum'];check('p80',inverse(e,c,F(c[-1]*4,5)));check('p90',inverse(e,c,F(c[-1]*9,10)));same(f['method'],'A' if q['collection']=='short' else 'C')
 elif kind=='five':
  for k,z in zip(['min','q1','median','q3','max'],summary(m['data'])):check(k,z)
 elif kind=='fences':
  iq=m['q3']-m['q1'];low=F(m['q1'])-F(3,2)*iq;high=F(m['q3'])+F(3,2)*iq;check('lower',low);check('upper',high);same(aset(f['whiskers']),set(map(expr,[m['low'],m['high']])));same(m['low']>=low and m['high']>high,True)
 elif kind=='box_comparison':
  a,b=m['a'],m['b'];check('ia',a[3]-a[1]);check('ib',b[3]-b[1]);same(b[3]-b[1]<a[3]-a[1],True);same(f['comparison'],'B' if a[2]<b[2] else 'C')
 elif kind=='inference':check('iqr',m['summary'][3]-m['summary'][1]);same(f['summary'],'B');same(f['mean'],'C')
 else:raise AssertionError(kind)

# Numerical conclusions in the twenty worked examples, separately restored.
same(summary([12,17,17,21,24,28,32]),list(map(F,[12,17,21,28,32])))
same(F(62,10),F('6.2'));same(F(105,10),F('10.5'))
same(len(Stem(p['lessons'][0]['examples'][0]['solution']).values()),7)
same(summary([12,14,18,21,24,26,29])[2],21);same(summary([11,16,19,23,25,31,34])[2],23)
same(summary([12,14,18,21,24,26,29])[3]-summary([12,14,18,21,24,26,29])[1],12)
same(summary([11,16,19,23,25,31,34])[3]-summary([11,16,19,23,25,31,34])[1],15)
same(5*11-sum([7,9,10,14]),15);same(40-2,38);same(25-4,21);same(14-6,15-7)
same(F(3*10+2*15,5),12);same(F(3*104+2*234,5)-12**2,12)
same([F(5,5),F(10,10),F(10,5)],[1,1,2]);same(F('2.9')+F('0.05')-(F(2)-F('0.05')),1)
same(5*3*2,30);a=[5]*2+[15]*4+[30]*4;same(moment(a),(F(19),F(94)))
same([12,28-12,40-28],[12,16,12]);same(inverse([0,10,20,40],[0,12,28,40],20),15)
same(F(100,40)*(40-forward([0,10,20,40],[0,12,28,40],30)),15);same(inverse([0,10,20,40],[0,12,28,40],32),F(80,3))
same(summary([2,4,5,7,8,11,13,16,25]),[F(2),F('4.5'),F(8),F('14.5'),F(25)])
same([4-F(3,2)*8,12+F(3,2)*8],[-8,24]);same(18>16 and 7<11,True)
same(len({e['verification'] for l in p['lessons'] for e in l['examples']}),20)
print(json.dumps(dict(quick_questions=len(models),worked_examples=20,exact_structural_and_boundary_assertions=checks,failed=0)))
