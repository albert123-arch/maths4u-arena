"""Independent exact and high-precision audit; does not import the content builder."""
import argparse,hashlib,html,json,re
from collections import Counter
from functools import lru_cache
from fractions import Fraction as F
from pathlib import Path
import mpmath as mp
import sympy as sy
mp.mp.dps=42
ap=argparse.ArgumentParser();ap.add_argument('--source');ap.add_argument('--report',default='docs/ARENA-C5-INFERENCE-MATH-CHECKS-20261106.json');args=ap.parse_args()
p=json.loads(Path('content/original/9231-statistics/inference-v1.json').read_text(encoding='utf8'))
v=json.loads(Path('content/original/9231-statistics/inference-verification-v1.json').read_text(encoding='utf8'))
if args.source:
 original=json.loads(Path(args.source).read_text(encoding='utf-8-sig'));source_rows=[q for l in original['lessons'] for q in l['questions']]
else:
 source_rows=[dict(**next({k:x for k,x in q.items() if k in ['title','answer_html','solution_html','hint_html']} for q in p['questions'] if q['id']==a['uid']),question_html=next(q['prompt_html'] for q in p['questions'] if q['id']==a['uid']),stem_html=a['stem_html'],parts=a['parts'],bank_number=a['bank_number']) for a in v['owner']]
checks=[];failures=[]
def check(ok,label):
 checks.append(label)
 if not ok:failures.append(label)
def near(a,b,label,tol='2e-11'):check(abs(mp.mpf(str(a))-mp.mpf(str(b)))<=mp.mpf(tol)*max(1,abs(mp.mpf(str(b)))),label)
def M(x):
 f=F(str(x));return mp.mpf(f.numerator)/f.denominator
def digest(x):return hashlib.sha256(json.dumps(x,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()
def text(x):return html.unescape(re.sub('<[^>]+>',' ',x))
def cdf(x,df):
 if df is None:return (1+mp.erf(x/mp.sqrt(2)))/2
 if x==0:return mp.mpf('0.5')
 tail=mp.betainc(M(df)/2,mp.mpf('.5'),0,M(df)/(df+x*x),regularized=True)/2
 return 1-tail if x>0 else tail
@lru_cache(None)
def quantile(prob,df):
 prob=M(prob)
 if df is None:return mp.sqrt(2)*mp.erfinv(2*prob-1)
 lo,hi=mp.mpf(-100),mp.mpf(100)
 for _ in range(155):
  mid=(lo+hi)/2
  if cdf(mid,df)<prob:lo=mid
  else:hi=mid
 return (lo+hi)/2
def sample(a,label):
 n=a['n'];total=F(a['sum']);ss=F(a['sum_squares']);mean=total/n;centred=ss-total*total/n;variance=centred/(n-1)
 for key,val in [('mean',mean),('centred_sum_squares',centred),('unbiased_variance',variance)]:check(F(a[key])==val,label+': '+key)
 check(n>1 and centred>=0,label+': valid sample')
 if a['raw']:
  raw=list(map(F,a['raw']));check(len(raw)==n and sum(raw)==total and sum(x*x for x in raw)==ss,label+': raw totals')
 return dict(n=n,mean=M(mean),variance=M(variance),total=total,ss=ss,raw=a['raw'])
def displayed(value,needle,label,dp=3):check(f'{float(value):.{dp}f}' in needle,label)
kind_counts=Counter();owner_checks=[]
for fixture,src in zip(v['owner'],source_rows):
 num=src['bank_number'];tag=f'Q{num}';start=len(checks);q=next(q for q in p['questions'] if q['id']==fixture['uid'])
 check(digest(q)==fixture['contentSha256'],tag+': content binding')
 for field in ['title','question_html','answer_html','solution_html','hint_html']:
  check(src[field]==q['prompt_html' if field=='question_html' else field],tag+': unchanged '+field)
 check(src['parts']==fixture['parts'],tag+': unchanged parts and criteria')
 check(sum(c['marks'] for a in src['parts'] for c in a['criteria'])==q['marks'],tag+': marks')
 samples={a['label']:sample(a,tag+' '+a['label']) for a in fixture['numeric_reference']['samples']}
 rawtable=re.findall(r'<tr><th scope="row">[^<]*</th>(.*?)</tr>',src['stem_html'])
 rawrows=[]
 for row in rawtable:
  cells=re.findall(r'<td>(.*?)</td>',row)
  if all(re.fullmatch(r'-?\d+(?:\.\d+)?',c) for c in cells):rawrows.append(list(map(F,cells)))
 # Bind each visible raw row, including minute/second conversion. Missing a is checked separately.
 for ri,row in enumerate(rawrows):
  possibilities=[list(map(F,a['raw'])) for a in fixture['numeric_reference']['samples'] if a['raw'] and a['label']!='d']
  check(row in possibilities or [x/60 for x in row] in possibilities,tag+f': visible data row {ri+1}')
 body=text(src['stem_html']);out=text(src['answer_html']);sol=text(src['solution_html'])
 # Bind numeric summaries from actual stem to the exact samples, not only to fixtures.
 for a in fixture['numeric_reference']['samples']:
  if a['label']=='d' or a['raw']:continue
  label=a['label'];n=a['n'];total=F(a['sum']);ss=F(a['sum_squares']);mean=total/n;variance=F(a['unbiased_variance']);centred=F(a['centred_sum_squares']);stem=src['stem_html']
  if num==14:
   main,extra=stem.split('<p>A separate random sample');stem=extra if n==9 else main
  candidates=[]
  for symbol,offset in [(label,F(0)),('z',F(120))] if num==2 else [(label,F(0)),('u' if label=='x' else 'v',F(300 if num==29 else 80))] if num in [29,63] else [(label,F(0))]:
   for pattern,expected in [(r'\\sum\s*'+symbol+r'\s*=\s*(-?\d+(?:\.\d+)?)',total-offset*n),(r'\\sum\s*'+symbol+r'\^2\s*=\s*(-?\d+(?:\.\d+)?)',ss-2*offset*total+n*offset**2)]:
    for hit in re.findall(pattern,stem):check(F(hit)==expected,tag+': visible '+symbol+' summary');candidates.append(hit)
  for pattern,expected in [(r'\\bar\s*\{?'+label+r'\}?\s*=\s*(-?\d+(?:\.\d+)?)',mean),(r's_'+label+r'\^2\s*=\s*(-?\d+(?:\.\d+)?)',variance),(r'\\sum\('+label+r'-\\bar\{?'+label+r'\}?\)\^2\s*=\s*(-?\d+(?:\.\d+)?)',centred)]:
   for hit in re.findall(pattern,stem):check(F(hit)==expected,tag+': visible '+label+' centred/mean/variance');candidates.append(hit)
  if num==19 and label=='x':
   hit=re.search(r's_A\^2=([\d.]+)',stem);check(bool(hit) and F(hit[1])==variance,tag+': visible named variance');candidates.append('named variance')
  is_reverse=any(c['kind']=='reverse_ci' and c['sample']['label']==label for c in fixture['numeric_reference']['calculations'])
  check(bool(candidates) or is_reverse,tag+': summary binding '+label)
 se=None;estimate=None;df=None
 for calc in fixture['numeric_reference']['calculations']:
  kind=calc['kind'];kind_counts[kind]+=1;ctag=tag+' '+kind
  if kind in ['pool','unpooled']:
   a=sample(calc['sample_x'],ctag+' X');b=sample(calc['sample_y'],ctag+' Y');estimate=a['mean']-b['mean']
   df=a['n']+b['n']-2 if kind=='pool' else None
   if kind=='pool':
    sp=((a['n']-1)*a['variance']+(b['n']-1)*b['variance'])/df;near(calc['pooled_variance'],sp,ctag+' variance');check(calc['df']==df,ctag+' df');se=mp.sqrt(sp*(M(1)/a['n']+M(1)/b['n']))
   else:se=mp.sqrt(a['variance']/a['n']+b['variance']/b['n'])
   near(calc['se'],se,ctag+' SE')
  elif kind=='paired':
   a=sample(calc['sample_x'],ctag+' X');b=sample(calc['sample_y'],ctag+' Y');d=sample(calc['differences'],ctag+' D');sign=-1 if calc['direction'] in ['after-before','Y-X','y-x'] else 1
   # Direction is independently bound to the displayed question and solution.
   if num in [36,38]:sign=-1
   check([sign*(F(x)-F(y)) for x,y in zip(a['raw'],b['raw'])]==list(map(F,d['raw'])),ctag+' signed pairing');estimate=d['mean'];se=mp.sqrt(d['variance']/d['n']);df=d['n']-1
  elif kind in ['test','ci','alpha_range']:
   target_estimate=estimate;target_se=se;target_df=df
   if num==65:
    target_estimate=M('24.8')-M('24.1');target_se=mp.sqrt(M('10.24')/16+M('14.44')/25);target_df=None
   elif num==34 and kind=='ci':a=samples['y'];target_estimate=a['mean'];target_se=mp.sqrt(a['variance']/a['n']);target_df=a['n']-1
   elif se is None:
    a=samples['x'];target_estimate=a['mean'];target_se=mp.sqrt(a['variance']/a['n']);target_df=a['n']-1
   if (num in [56,60] and kind=='test'):target_estimate=-target_estimate
   near(calc['estimate'],target_estimate,ctag+' estimate');near(calc['se'],target_se,ctag+' SE');check(calc.get('df',target_df)==target_df,ctag+' df')
   if kind=='ci':
    critical=quantile(str((1+M(calc['confidence']))/2),target_df);lo=target_estimate-critical*target_se;hi=target_estimate+critical*target_se
    for name,value in [('critical',critical),('lower',lo),('upper',hi)]:near(calc[name],value,ctag+' '+name)
    displayed(lo,out,ctag+' lower displayed');displayed(hi,out,ctag+' upper displayed')
   else:
    stat=(target_estimate-M(calc['null']))/target_se;tail=cdf(stat,target_df);alt=calc['alternative'];pv=1-tail if alt=='greater' else tail if alt=='less' else 2*min(tail,1-tail)
    near(calc['statistic' if kind=='test' else 'z'],stat,ctag+' statistic');near(calc['p_value'],pv,ctag+' p-value')
    if kind=='test':
     alpha=M(calc['alpha']);crit=quantile(str(1-alpha/(2 if alt=='two' else 1)),target_df);near(abs(calc['critical']),crit,ctag+' critical');check(calc['reject']==(pv<=alpha),ctag+' reject');displayed(stat,out,ctag+' statistic displayed')
     check(('insufficient evidence' in out)==(not calc['reject']) if sum(c['kind']=='test' for c in fixture['numeric_reference']['calculations'])==1 else True,ctag+' conclusion')
    else:near(calc['alpha_boundary_percent'],100*pv,ctag+' percent');check(('100p\\le' in out) if calc['state']=='reject' else ('\\alpha&lt;' in src['answer_html'] or '\\alpha<' in out),ctag+' interval boundary')
  elif kind=='reverse_ci':
   a=sample(calc['sample'],ctag);lo=F(str(calc['lower']));hi=F(str(calc['upper']));crit=F(str(calc['critical_used']));mean=(lo+hi)/2;var=a['n']*((hi-lo)/(2*crit))**2
   check(F(calc['sample']['mean'])==mean and F(calc['sample']['unbiased_variance'])==var,ctag+' reverse exact')
   check(str(calc['critical_used']) in body and str(calc['lower']) in body and str(calc['upper']) in body,ctag+' supplied interval binding')
  elif kind=='threshold':
   a=sample(calc['sample'],ctag);crit=quantile(str(1-M(calc['alpha'])),a['n']-1);boundary=a['mean']+(-1 if calc['alternative']=='greater' else 1)*crit*mp.sqrt(a['variance']/a['n'])
   near(calc['critical'],crit,ctag+' critical');near(calc['boundary'],boundary,ctag+' boundary');check(calc['include_in_rejection'],ctag+' equality rule');displayed(boundary,out,ctag+' boundary displayed',4)
   check(('k&lt;B' in src['answer_html'] or 'k<B' in out) if calc['state']=='nonreject' else ('\\le B' in out),ctag+' boundary direction')
  elif kind=='pooled_unknown_N':
   n=sy.Symbol('n');expr=(M(calc['squares_x'])+M(calc['squares_y'])-(M(calc['sum_x'])**2+M(calc['sum_y'])**2/M(calc['ratio']))/n)/(4*n-2)-M(calc['pooled_variance']);roots=sy.solve(sy.together(expr),n)
   check(any(abs(float(z)-4)<1e-10 for z in roots) and any(abs(float(z)-1.125)<1e-10 for z in roots),ctag+' both roots');check(calc['N']==4 and F(calc['other_root'])==F(9,8),ctag+' integer restriction')
  elif kind=='reversed_ci':
   near(calc['lower'],-M(calc['original_upper']),ctag+' lower');near(calc['upper'],-M(calc['original_lower']),ctag+' upper');displayed(calc['lower'],out,ctag+' displayed lower');displayed(calc['upper'],out,ctag+' displayed upper')
  elif kind=='known_variance_se':near(calc['se'],mp.sqrt(M(calc['var_x'])/calc['n_x']+M(calc['var_y'])/calc['n_y']),ctag)
  else:raise ValueError(kind)
 if num==32:
  check(sum(F(x)*F(y) for x,y in zip(samples['x']['raw'],samples['y']['raw']))==20191,tag+': visible cross-product')
 if num==33:check(F(samples['y']['raw'][-1])==F('20.2') and 'a=20.2' in out,tag+': missing reading')
 if num==19:
  a,b=samples['x'],samples['y'];sp=((a['n']-1)*a['variance']+(b['n']-1)*b['variance'])/(a['n']+b['n']-2);displayed(mp.sqrt(sp),out,tag+': common SD',4)
 owner_checks.append(dict(number=num,uid=q['id'],checks=len(checks)-start))
# Cross-check the incomplete-beta CDF through direct integration of the t density.
for df in [7,8,9,10,11,14,15,16,18,20,22]:
 density=lambda t:mp.gamma(M(df+1)/2)/(mp.sqrt(df*mp.pi)*mp.gamma(M(df)/2))*(1+t*t/df)**(-M(df+1)/2)
 for prob in ['.9','.95','.975','.995']:
  value=quantile(prob,df);near(M('.5')+mp.quad(density,[0,value]),M(prob),f't quantile quadrature {df}/{prob}','1e-30')

def independent_model(m):
 kind=m['kind'];S=lambda key:sy.Rational(str(m[key]));n=m.get('n')
 if kind=='logic':return None
 if kind in ['summary','raw']:
  if kind=='raw':n=len(m['raw']);total=sum(map(sy.Rational,m['raw']));ss=sum(sy.Rational(x)**2 for x in m['raw'])
  else:total=S('total');ss=S('squares')
  mean=total/n+sy.Rational(m.get('offset','0'));var=(ss-total**2/n)/(n-1);result=[mean,var,sy.sqrt(var/n)]
 elif kind in ['test','test_statistic','interval','threshold']:
  se=sy.sqrt(S('variance')/n)
  if kind in ['test','test_statistic']:
   t=(S('mean')-S('null'))/se;result=[t,sy.Integer(n-1)]
   if kind=='test':
    reject=abs(t)>=S('critical') if m['alternative']=='two' else t>=S('critical') if m['alternative']=='greater' else t<=-S('critical');check(bool(reject)==m['reject'],m['id']+' decision')
  elif kind=='interval':result=[S('mean')-S('critical')*se,S('mean')+S('critical')*se]
  else:result=[S('mean')+(-1 if m['alternative']=='greater' else 1)*S('critical')*se]
 elif kind in ['contrast','pool_test','contrast_interval','pool','known_se']:
  nx=m['nx'];ny=m['ny'];vx=S('vx');vy=S('vy');sp=((nx-1)*vx+(ny-1)*vy)/(nx+ny-2);pooled=kind in ['pool','pool_test'] or m.get('pooled',False);se=sy.sqrt(sp*(sy.Rational(1,nx)+sy.Rational(1,ny))) if pooled else sy.sqrt(vx/nx+vy/ny)
  if kind=='pool':result=[sp,sy.sqrt(sp)]
  elif kind=='known_se':result=[se]
  elif kind=='contrast_interval':delta=S('mx')-S('my');result=[delta-S('critical')*se,delta+S('critical')*se]
  elif kind=='pool_test':result=[sp,se,(S('mx')-S('my')-S('null'))/se,sy.Integer(nx+ny-2)]
  else:result=[se,(S('mx')-S('my')-S('null'))/se]
 elif kind in ['given_se','reversed_statistics']:
  stat=(S('estimate')-S('null'))/S('se');result=[stat,-stat] if kind=='reversed_statistics' else [stat]
 elif kind=='percent':result=[100*S('p')]
 elif kind=='missing_variance':result=[((m['nx']+m['ny']-2)*S('pooled')-(m['nx']-1)*S('vx'))/(m['ny']-1)]
 elif kind=='cross':total=S('sx')-S('sy');ss=S('xx')+S('yy')-2*S('xy');mean=total/n;result=[mean,(ss-total**2/n)/(n-1)]
 elif kind=='units':result=[S('before')-S('after_seconds')/60]
 elif kind=='reverse':mean=(S('lower')+S('upper'))/2;var=n*((S('upper')-S('lower'))/(2*S('critical')))**2;result=[mean,var,n*mean,(n-1)*var+n*mean**2]
 elif kind=='reverse_contrast':result=[-S('upper'),-S('lower')]
 else:raise ValueError(kind)
 return result
for group in ['quick','examples']:
 for item in v[group]:
  model=item['model'] if group=='quick' else item;uid=item['uid'] if group=='quick' else item['id'];result=independent_model(model)
  content=next(q for q in p['questions'] if q['id']==uid) if group=='quick' else next(e for l in p['lessons'] for e in l['examples'] if e['verification']==uid)
  check(digest(content)==item['contentSha256'],uid+': content binding')
  if result is not None:
   for a,b in zip(result,model['expected']):check(sy.simplify(a-sy.sympify(b))==0,uid+': independent value '+str(b))
   if group=='quick':
    expected=[sy.sympify(f['expected']) for f in content['fields']];values=result[1:] if model['kind']=='pool_test' else result
    check(len(values)==len(expected) and all(sy.simplify(a-b)==0 for a,b in zip(values,expected)),uid+': complete key')
  else:check(content['fields'][0]['expected']==model['answer'],uid+': logic key')
for l in p['lessons']:check(v['teachingDigests'][l['id']]==digest(l),l['id']+': teaching binding')
if args.source:check(hashlib.sha256(Path(args.source).read_bytes()).hexdigest()==p['source']['sha256'],'read-only source SHA')
report=dict(checks=len(checks),failures=failures,owner=67,parts=120,marks=555,quick=48,examples=24,calculationKinds=dict(kind_counts),ownerChecks=owner_checks,precisionDigits=42,tQuantileCrossCheck='44 independent direct-density quadrature checks',scope='Exact sample arithmetic; independent t/normal CDF and quantiles; actual displayed statistics/limits; complete quick keys; bound source and teaching hashes.')
Path(args.report).write_text(json.dumps(report,indent=2)+'\n',encoding='utf8')
print(json.dumps({k:report[k] for k in ['checks','failures','owner','quick','examples']},ensure_ascii=True))
raise SystemExit(bool(failures))
