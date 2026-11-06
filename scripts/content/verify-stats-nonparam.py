"""Independent exact sign/rank enumeration and numerical audit. Never imports the builder."""
import argparse,hashlib,html,itertools,json,math,re
from collections import Counter
from fractions import Fraction as F
from functools import lru_cache
from html.parser import HTMLParser
from pathlib import Path
import mpmath as mp
mp.mp.dps=42
ap=argparse.ArgumentParser();ap.add_argument('--source');ap.add_argument('--report',default='docs/ARENA-C5-NONPARAM-MATH-CHECKS-20261106.json');args=ap.parse_args()
checks=[];failures=[];kinds=Counter()
def check(ok,label):
 checks.append(label)
 if not ok:failures.append(label)
def M(x):
 a=F(str(x));return mp.mpf(a.numerator)/a.denominator
def near(a,b,label,tol='2e-11'):check(abs(M(a)-M(b))<=M(tol)*max(1,abs(M(b))),label)
def phi(x):return (1+mp.erf(x/mp.sqrt(2)))/2
def zq(p):return mp.sqrt(2)*mp.erfinv(2*M(p)-1)
def digest(z):return hashlib.sha256(json.dumps(z,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()
def rank(values):
 order=sorted(values);return [F(order.index(x)+len(order)+1-order[::-1].index(x),2) for x in values]
@lru_cache(None)
def signed_counts(n):
 counts=[1]
 for r in range(1,n+1):
  new=counts+[0]*r
  for j,c in enumerate(counts):new[j+r]+=c
  counts=new
 return counts
@lru_cache(None)
def rank_counts(m,n):
 d={(0,0):1}
 for r in range(1,m+n+1):
  for (k,total),count in list(d.items()):
   if k<m:d[k+1,total+r]=d.get((k+1,total+r),0)+count
 return {total:count for (k,total),count in d.items() if k==m}
def exact_tail(counts,value,alt):
 rows=enumerate(counts) if isinstance(counts,list) else counts.items();rows=list(rows);N=sum(c for _,c in rows)
 lower=F(sum(c for t,c in rows if t<=value),N);upper=F(sum(c for t,c in rows if t>=value),N)
 return lower if alt=='less' else upper if alt=='greater' else min(F(1),2*min(lower,upper))
def lower_critical(counts,alpha,two=False):
 rows=list(enumerate(counts)) if isinstance(counts,list) else sorted(counts.items());total=sum(c for _,c in rows);running=0;critical=-1
 for value,count in rows:
  running+=count
  if F(running,total)<=F(str(alpha))/(2 if two else 1):critical=value
 return critical
class Tables(HTMLParser):
 def __init__(self,source):super().__init__();self.tables=[];self.table=None;self.row=None;self.cell=None;self.caption=False;self.feed(source)
 def handle_starttag(self,tag,attrs):
  if tag=='table':self.table=dict(caption='',rows=[])
  elif tag=='caption':self.caption=True
  elif tag=='tr':self.row=[]
  elif tag in ['td','th']:self.cell=''
 def handle_data(self,data):
  if self.caption and self.table is not None:self.table['caption']+=data
  if self.cell is not None:self.cell+=data
 def handle_endtag(self,tag):
  if tag=='caption':self.caption=False
  elif tag in ['td','th'] and self.cell is not None:self.row.append(self.cell.strip());self.cell=None
  elif tag=='tr' and self.row is not None:self.table['rows'].append(self.row);self.row=None
  elif tag=='table':self.tables.append(self.table);self.table=None
def visible_numbers(table):return [F(c) for row in table['rows'] for c in row if re.fullmatch(r'-?\d+(?:\.\d+)?',c)]
def normal_tail(stat,mu,var,alt):
 correction=F(-1,2) if alt=='greater' else F(1,2)
 z=(M(stat)+M(correction)-M(mu))/mp.sqrt(M(var));p=1-phi(z) if alt=='greater' else phi(z) if alt=='less' else min(M(1),2*phi(z));return z,p,correction
def audit(record,tag):
 kind=record['kind'];kinds[kind]+=1;alt=record.get('alternative');alpha=record.get('alpha');out={}
 if kind in ['sign','signed']:
  data=list(map(lambda x:F(str(x)),record['data']));diff=[x-F(str(record['reference'])) for x in data];check(diff==list(map(lambda x:F(str(x)),record['differences'])),tag+' exact differences');check(all(diff),tag+' no zero differences');n=len(diff);check(record['n']==n,tag+' n')
  if kind=='sign':
   positive=sum(x>0 for x in diff);negative=n-positive;p=exact_tail([math.comb(n,j) for j in range(n+1)],positive,alt);c=lower_critical([math.comb(n,j) for j in range(n+1)],alpha,alt=='two');check(record['positive']==positive and record['negative']==negative,tag+' signs');check(record['p_fraction']==[p.numerator,p.denominator],tag+' exact p fraction');check(record['critical_lower']==c,tag+' critical');out=dict(positive=positive,negative=negative,n=n,p=p)
  else:
   absolute=list(map(abs,diff));check(len(set(absolute))==n,tag+' no tied magnitudes');ranks=rank(absolute);check(ranks==record['ranks'],tag+' all ranks');wp=sum(r for r,d in zip(ranks,diff) if d>0);wm=sum(r for r,d in zip(ranks,diff) if d<0);T=min(wp,wm);mu=F(n*(n+1),4);var=F(n*(n+1)*(2*n+1),24)
   for key,value in [('W_plus',wp),('W_minus',wm),('T',T),('mean',mu),('variance',var)]:near(record[key],value,tag+' '+key)
   check(wp+wm==F(n*(n+1),2),tag+' full rank total');out=dict(wp=wp,wm=wm,T=T,n=n,ranks=ranks,diff=diff)
   if record['method']=='exact':
    counts=signed_counts(n);p=exact_tail(counts,wp,alt);c=lower_critical(counts,alpha,alt=='two');check(c==record['critical'],tag+' exact critical')
   else:
    stat=T if alt=='two' else wp;z,p,cc=normal_tail(stat,mu,var,alt);near(record['normal_statistic'],stat,tag+' directional statistic');near(record['continuity_adjustment'],cc,tag+' continuity correction');near(record['z'],z,tag+' z');near(record['critical_z'],zq(str(1-M(alpha))) if alt=='greater' else zq(str(M(alpha)/(2 if alt=='two' else 1))),tag+' normal critical');out['z']=z
  near(record['p_value'],p,tag+' p');check(record['reject']==(M(p)<=M(alpha)),tag+' decision');out['p']=p;return out
 if kind in ['rank_sum','rank_sum_summary']:
  m,n=record['m'],record['n'];ra=record['R_A'];total=(m+n)*(m+n+1)//2;reflected=m*(m+n+1)-ra;W=min(ra,reflected);mu=F(m*(m+n+1),2);var=F(m*n*(m+n+1),12)
  if kind=='rank_sum':
   a=list(map(lambda x:F(str(x)),record['a']));b=list(map(lambda x:F(str(x)),record['b']));ranks=rank(a+b);check(len(set(a+b))==m+n,tag+' no tied observations');check(len(a)==m and len(b)==n,tag+' both sample sizes');check(ranks[:m]==record['ranks_a'] and ranks[m:]==record['ranks_b'],tag+' pooled ranks');check(sum(ranks[:m])==ra,tag+' rank sum from data')
  check(record['R_B']==total-ra,tag+' other rank sum');check(record['W']==W,tag+' reflected MF19 statistic');near(record['mean'],mu,tag+' mean');near(record['variance'],var,tag+' variance');check(m<=n,tag+' smaller sample used')
  if record['method']=='exact':
   counts=rank_counts(m,n);p=exact_tail(counts,ra,alt);c=lower_critical(counts,alpha,alt=='two');check(c==record['critical'],tag+' exact critical')
  else:
   stat=W if alt=='two' else ra;z,p,cc=normal_tail(stat,mu,var,alt);near(record['normal_statistic'],stat,tag+' directional rank sum');near(record['continuity_adjustment'],cc,tag+' continuity correction');near(record['z'],z,tag+' z');near(record['critical_z'],zq(str(1-M(alpha))) if alt=='greater' else zq(str(M(alpha)/(2 if alt=='two' else 1))),tag+' normal critical')
  near(record['p_value'],p,tag+' p');check(record['reject']==(M(p)<=M(alpha)),tag+' decision');return dict(ra=ra,rb=total-ra,W=W,p=p)
 if kind in ['signed_boundary','rank_sum_boundary']:
  if kind=='signed_boundary':
   n=record['n'];mu=F(n*(n+1),4);var=F(n*(n+1)*(2*n+1),24);z=zq(str(M(alpha)/2));boundary=M(mu)-M('.5')+z*mp.sqrt(M(var));least=math.floor(boundary)+1;check(record['least_nonrejected_T']==least,tag+' least nonrejected integer');near(record['critical_z'],z,tag+' z');p0=normal_tail(least-1,mu,var,'two')[1];p1=normal_tail(least,mu,var,'two')[1];check(p0<=M(alpha)<p1,tag+' adjacent rejection boundary')
  else:
   m,n=record['m'],record['n'];mu=F(m*(m+n+1),2);var=F(m*n*(m+n+1),12);boundary=M(mu)+M('.5')+zq(str(1-M(alpha)))*mp.sqrt(M(var));least=math.ceil(boundary);check(record['least_rejected_R']==least,tag+' least rejected integer');p0=normal_tail(least-1,mu,var,'greater')[1];p1=normal_tail(least,mu,var,'greater')[1];check(p1<=M(alpha)<p0,tag+' adjacent rejection boundary')
  near(record['mean'],mu,tag+' mean');near(record['variance'],var,tag+' variance');near(record['real_boundary'],boundary,tag+' real boundary');near(record['p_previous'],p0,tag+' previous p');near(record['p_at_boundary'],p1,tag+' boundary p');return dict(least=least)
 if kind=='pooled_t':
  a=list(map(lambda x:F(str(x)),record['a']));b=list(map(lambda x:F(str(x)),record['b']));m,n=len(a),len(b);ma=sum(a)/m;mb=sum(b)/n;sa=sum((x-ma)**2 for x in a);sb=sum((x-mb)**2 for x in b);sp=(sa+sb)/(m+n-2);se=mp.sqrt(M(sp)*(M(1)/m+M(1)/n));t=(M(ma)-M(mb))/se;df=m+n-2;p=mp.betainc(M(df)/2,M('.5'),0,M(df)/(df+t*t),regularized=True)/2;p=p if t<0 else 1-p
  for key,val in [('mean_a',ma),('mean_b',mb),('ss_a',sa),('ss_b',sb),('pooled_variance',sp),('standard_error',se),('t',t),('p_value',p)]:near(record[key],val,tag+' '+key)
  critical=M(record['critical']);critical_tail=mp.betainc(M(df)/2,M('.5'),0,M(df)/(df+critical*critical),regularized=True)/2
  near(critical_tail,alpha,tag+' t critical probability')
  density=lambda x:mp.gamma(M(df+1)/2)/(mp.sqrt(df*mp.pi)*mp.gamma(M(df)/2))*(1+x*x/df)**(-M(df+1)/2)
  near(mp.quad(density,[-mp.inf,critical]),alpha,tag+' t critical by density integration')
  check(record['df']==df and record['reject']==(p<=M(alpha)),tag+' df/decision');return dict(t=t)
 raise ValueError(kind)

package_path=Path('content/original/9231-statistics/nonparam-v1.json');package=json.loads(package_path.read_text(encoding='utf8')) if package_path.exists() else None
fixture_path=Path('content/original/9231-statistics/nonparam-verification-v1.json');fixtures=json.loads(fixture_path.read_text(encoding='utf8')) if fixture_path.exists() else None
if args.source:
 owner=json.loads(Path(args.source).read_text(encoding='utf-8-sig'));source=[q for l in owner['lessons'] for q in l['questions']];source_sha=hashlib.sha256(Path(args.source).read_bytes()).hexdigest()
else:
 assert fixtures and package
 source=[dict(**{k:q[k] for k in ['title','answer_html','solution_html','hint_html']},question_html=q['prompt_html'],stem_html=f['stem_html'],parts=f['parts'],bank_number=f['bank_number'],numeric_reference=f['numeric_reference'],content_uid=q['id']) for f in fixtures['owner'] for q in package['questions'] if q['id']==f['uid']];source_sha=package['source']['sha256']
check(len(source)==27,'all 27 source tasks');owner_checks=[]
for q in source:
 start=len(checks);number=q['bank_number'];tag='Q'+str(number);tables=Tables(q['stem_html']).tables;refs=q['numeric_reference'];outcomes=[]
 if package:
  actual=next(z for z in package['questions'] if z['id']==q['content_uid']);fixture=next(z for z in fixtures['owner'] if z['uid']==actual['id']);check(digest(actual)==fixture['contentSha256'],tag+' content binding')
  for key in ['title','answer_html','solution_html','hint_html']:check(actual[key]==q[key],tag+' unchanged '+key)
  prompt=q['stem_html']+'<ol class="parts" type="a">'+''.join('<li>'+part['prompt_html']+'<span class="marks">['+str(part['marks'])+']</span></li>' for part in q['parts'])+'</ol>';check(actual['prompt_html']==prompt,tag+' exact stem, part text and marks');check(sum(c['marks'] for z in q['parts'] for c in z['criteria'])==actual['marks'],tag+' marks')
  expected_parts=[dict(label=chr(97+i),marking_criteria=[dict(code=c['code'],marks=c['marks'],description_html=c['criterion_html']) for c in z['criteria']]) for i,z in enumerate(q['parts'])]
  check(actual['parts']==expected_parts,tag+' every original criterion unchanged');check(fixture['parts']==q['parts'],tag+' original per-part answers and solutions retained')
 for index,r in enumerate(refs):
  rtag=tag+'/'+str(index+1);out=audit(r,rtag);outcomes.append(out)
  if r['kind'] in ['sign','signed']:
   if 'input_a' in r:
    visibleA=[F(row[1]) for row in tables[0]['rows'][1:]];visibleB=[F(row[2]) for row in tables[0]['rows'][1:]]
    if index>0 and number in [13,18]:
     pos=5 if number==13 else 0;visibleA[pos],visibleB[pos]=visibleB[pos],visibleA[pos]
    if index>0 and number==19:visibleA[2]=F('82.1');check('82.1' in q['parts'][1]['prompt_html'],rtag+' stated correction')
    check(visibleA==list(map(lambda x:F(str(x)),r['input_a'])) and visibleB==list(map(lambda x:F(str(x)),r['input_b'])),rtag+' actual paired readings/correction');paired=[a-b for a,b in zip(visibleA,visibleB)]
    check(r['input_difference']=='a-b' and paired==list(map(lambda x:F(str(x)),r['data'])),rtag+' paired direction')
   elif number not in [12]:check(visible_numbers(tables[0])==list(map(lambda x:F(str(x)),r['data'])),rtag+' actual observations')
   else:check(r['data']==refs[0]['data'],rtag+' comparison uses same differences')
  elif r['kind'] in ['rank_sum','pooled_t']:check(visible_numbers(tables[0])==list(map(lambda x:F(str(x)),r['a'])) and visible_numbers(tables[1])==list(map(lambda x:F(str(x)),r['b'])),rtag+' actual independent samples')
  elif r['kind']=='signed_boundary':check(str(r['n']) in q['stem_html'] and '2%' in q['stem_html'],rtag+' specified n and level')
  elif r['kind']=='rank_sum_summary':check(all(str(r[k]) in q['stem_html'] for k in ['m','n','R_A']),rtag+' specified summary')
  # Bind actually displayed totals, statistics and continuity corrections in solutions.
  solution_tables=Tables(q['solution_html']).tables
  ranking_tables=[t for t in solution_tables if 'rank' in t['caption'].lower()]
  rank_index=sum(z['kind']=='signed' for z in refs[:index])
  if r['kind']=='signed' and rank_index<len(ranking_tables):
   table=ranking_tables[rank_index];rows=table['rows'][1:]
   check(len(rows)==r['n'],rtag+' displayed ranking length')
   if table['caption'].startswith('Reranking'):
    check([F(row[2]) for row in rows]==refs[0]['ranks'],rtag+' displayed original ranks');check([F(row[3]) for row in rows]==out['diff'],rtag+' displayed corrected differences');check([F(row[4]) for row in rows]==out['ranks'],rtag+' displayed corrected ranks')
   else:
    check([F(row[-2]) for row in rows]==out['ranks'],rtag+' displayed ranks');check([F(row[-1].replace('−','-')) for row in rows]==[rank if d>0 else -rank for rank,d in zip(out['ranks'],out['diff'])],rtag+' displayed signed ranks')
  elif r['kind']=='signed' and number in [13,18,19] and index>0:check(r['ranks']==refs[0]['ranks'],rtag+' sign correction does not require reranking')
  if index==0:
   for token,key in [(r'W_\+', 'wp'),(r'W_-','wm'),('R_A','ra')]:
    if key in out:check(bool(re.search(token+'='+str(out[key])+r'\b',q['answer_html'])),rtag+' printed '+key)
   if 'z' in r:check(f"{r['z']:.3f}" in q['answer_html'],rtag+' printed z')
  if index>0 and number in [13,18,19]:check('W_-='+str(out['wm']) in q['parts'][1]['answer_html'],rtag+' printed corrected negative rank sum')
  if 'least' in out:check(str(out['least']) in q['answer_html'],rtag+' printed integer boundary')
  if 'p_value' in r:
   found=re.findall(r'p=(0\.\d+)',q['solution_html'])
   if found:check(any(abs(M(z)-M(r['p_value']))<=M('.00000051') for z in found),rtag+' printed p')
 # Independent exhaustive cross-checks of exact distributions, distinct from recurrence.
 for r in refs:
  if r.get('method')!='exact':continue
  if r['kind']=='signed':
   n=r['n'];enumerated=Counter(sum(j+1 for j in range(n) if mask>>j&1) for mask in range(1<<n));check(dict(enumerate(signed_counts(n)))==dict(sorted(enumerated.items())),tag+' enumerate all sign assignments')
  elif r['kind']=='rank_sum':
   enumerated=Counter(map(sum,itertools.combinations(range(1,r['m']+r['n']+1),r['m'])));check(rank_counts(r['m'],r['n'])==enumerated,tag+' enumerate all group allocations')
 owner_checks.append(dict(number=number,checks=len(checks)-start))
if args.source and package:check(source_sha==package['source']['sha256'],'read-only source SHA')
# Teaching models are checked below after the package exists.
if fixtures and package:
 import sympy as sy
 for group in ['quick','examples']:
  for item in fixtures[group]:
   uid=item['uid'] if group=='quick' else item['id'];model=item['model'] if group=='quick' else item['model'];content=next(q for q in package['questions'] if q['id']==uid) if group=='quick' else next(e for l in package['lessons'] for e in l['examples'] if e['verification']==uid);check(digest(content)==item['contentSha256'],uid+' content binding')
   kind=model['kind'];values={}
   if kind=='logic':values=dict(reason=model['answer'])
   elif kind=='sign_z':
    n=model['n'];mu=F(n,2);var=F(n,4);cc=F(-1,2) if model['alternative']=='greater' else F(1,2);values=dict(mean=mu,variance=var,numerator=F(model['statistic'])+cc-mu,denominator=sy.sqrt(sy.Rational(var)),correction=cc)
   elif kind=='sign':
    data=list(map(lambda x:F(str(x)),model['data']));d=[z-F(str(model.get('reference',0))) for z in data];positive=sum(z>0 for z in d);negative=sum(z<0 for z in d);n=positive+negative;pv=exact_tail([math.comb(n,j) for j in range(n+1)],positive,model['alternative']);values=dict(n=n,positive=positive,negative=negative,p=pv)
   elif kind=='signed':
    d=list(map(lambda x:F(str(x)),model['differences']));ranks=rank(list(map(abs,d)));wp=sum(r for r,x in zip(ranks,d) if x>0);wm=sum(r for r,x in zip(ranks,d) if x<0);n=len(d);pv=exact_tail(signed_counts(n),wp,model.get('alternative','two'));values=dict(wp=wp,wm=wm,T=min(wp,wm),n=n,p=pv,total=wp+wm)
    if 'input_a' in model:
     derived=[F(str(a))-F(str(b))*F(model.get('scale_b','1'))-F(model.get('reference','0')) for a,b in zip(model['input_a'],model['input_b'])];check(derived==d,uid+' paired observations and units')
    values.update({f'r{i+1}':r for i,r in enumerate(ranks)})
    values.update({f'd{i+1}':z for i,z in enumerate(d)})
   elif kind=='signed_moments':
    n=model['n'];values=dict(mean=F(n*(n+1),4),variance=F(n*(n+1)*(2*n+1),24),total=F(n*(n+1),2))
   elif kind=='signed_z':
    n=model['n'];mu=F(n*(n+1),4);var=F(n*(n+1)*(2*n+1),24);stat=F(str(model['statistic']));cc=F(-1,2) if model['alternative']=='greater' else F(1,2);values=dict(numerator=stat+cc-mu,denominator=sy.sqrt(sy.Rational(var)),correction=cc)
   elif kind=='rank_sum':
    a=list(map(lambda x:F(str(x)),model['a']));b=list(map(lambda x:F(str(x)),model['b']));ranks=rank(a+b);m,n=len(a),len(b);ra=sum(ranks[:m]);rb=sum(ranks[m:]);reflected=m*(m+n+1)-ra;pv=exact_tail(rank_counts(m,n),ra,model.get('alternative','two'));values=dict(ra=ra,rb=rb,W=min(ra,reflected),reflected=reflected,p=pv,total=ra+rb)
   elif kind=='rank_moments':
    m,n=model['m'],model['n'];values=dict(mean=F(m*(m+n+1),2),variance=F(m*n*(m+n+1),12),reflection=m*(m+n+1),W=min(model['ra'],m*(m+n+1)-model['ra']))
   elif kind=='rank_z':
    m,n=model['m'],model['n'];mu=F(m*(m+n+1),2);var=F(m*n*(m+n+1),12);cc=F(-1,2) if model['alternative']=='greater' else F(1,2);values=dict(mean=mu,variance=var,numerator=F(model['statistic'])+cc-mu,denominator=sy.sqrt(sy.Rational(var)),correction=cc)
   elif kind=='flip':
    d=list(map(F,model['differences']));ranks=rank(list(map(abs,d)));d[model['index']]*=-1;wp=sum(r for r,x in zip(ranks,d) if x>0);wm=sum(r for r,x in zip(ranks,d) if x<0);values=dict(wp=wp,wm=wm,T=min(wp,wm))
   elif kind in ['boundary_signed','boundary_rank']:
    if kind=='boundary_signed':
     n=model['n'];mu=F(n*(n+1),4);var=F(n*(n+1)*(2*n+1),24);boundary=M(mu)-M('.5')+zq(str(M(model['alpha'])/2))*mp.sqrt(M(var));least=math.floor(boundary)+1;check(normal_tail(least-1,mu,var,'two')[1]<=M(model['alpha'])<normal_tail(least,mu,var,'two')[1],uid+' adjacent integers')
    else:
     m,n=model['m'],model['n'];mu=F(m*(m+n+1),2);var=F(m*n*(m+n+1),12);boundary=M(mu)+M('.5')+zq(str(1-M(model['alpha'])))*mp.sqrt(M(var));least=math.ceil(boundary);check(normal_tail(least,mu,var,'greater')[1]<=M(model['alpha'])<normal_tail(least-1,mu,var,'greater')[1],uid+' adjacent integers')
    values=dict(least=least)
   else:raise ValueError(kind)
   expected=model.get('expected',{})
   for key,value in expected.items():check(sy.simplify(sy.sympify(values[key])-sy.sympify(value))==0,uid+' independent '+key)
   if group=='quick':
    for f in content['fields']:check(values[f['key']]==f['expected'] if f['type']=='choice' else sy.simplify(sy.sympify(values[f['key']])-sy.sympify(f['expected']))==0,uid+' complete key '+f['key'])
 for l in package['lessons']:check(fixtures['teachingDigests'][l['id']]==digest(l),l['id']+' teaching binding')
report=dict(checks=len(checks),failures=failures,owner=27,parts=52,marks=227,quick=32 if package else 0,examples=16 if package else 0,calculationKinds=dict(kinds),ownerChecks=owner_checks,precisionDigits=42,methods=['exact decimal differences and ranks','binomial sign probabilities','signed-rank subset dynamic programming and exhaustive signs','rank-sum allocation recurrence and exhaustive combinations','directional normal tails with continuity correction','adjacent-integer boundaries','pooled t comparison'])
Path(args.report).write_text(json.dumps(report,indent=2)+'\n',encoding='utf8');print(json.dumps({k:report[k] for k in ['checks','failures','owner','quick','examples']}));raise SystemExit(bool(failures))
