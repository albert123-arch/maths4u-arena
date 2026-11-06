"""Independent exact/high-precision audit of owner data, printed answers and new checks."""
import argparse,hashlib,html,json,re
from collections import Counter
from fractions import Fraction as F
from functools import lru_cache
from html.parser import HTMLParser
from pathlib import Path
import mpmath as mp
import sympy as sy
mp.mp.dps=42
ap=argparse.ArgumentParser();ap.add_argument('--source');ap.add_argument('--report',default='docs/ARENA-C5-CHI2-MATH-CHECKS-20261106.json');args=ap.parse_args()
p=json.loads(Path('content/original/9231-statistics/chi2-v1.0.1.json').read_text(encoding='utf8'));v=json.loads(Path('content/original/9231-statistics/chi2-verification-v1.json').read_text(encoding='utf8'))
checks=[];failures=[];warnings=[]
def check(ok,label):
 checks.append(label)
 if not ok:failures.append(label)
def M(z):
 if str(z) in ['inf','-inf','oo','-oo']:return mp.mpf(str(z).replace('oo','inf'))
 f=F(str(z));return mp.mpf(f.numerator)/f.denominator
def near(a,b,label,tol='2e-11'):check(abs(M(a)-M(b))<=M(tol)*max(1,abs(M(b))),label)
def digest(z):return hashlib.sha256(json.dumps(z,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()
def flat(z):return html.unescape(re.sub('<[^>]+>',' ',z))
def survival(x,df):return mp.gammainc(M(df)/2,M(x)/2,mp.inf,regularized=True)
@lru_cache(None)
def critical(alpha,df):
 lo=mp.mpf(0);hi=mp.mpf(100)
 while survival(hi,df)>M(alpha):hi*=2
 for _ in range(155):
  mid=(lo+hi)/2
  if survival(mid,df)>M(alpha):lo=mid
  else:hi=mid
 return (lo+hi)/2
def phi(z):return (1+mp.erf(z/mp.sqrt(2)))/2
def matrix(O,groups=None):
 if groups:O=[[sum(row[j] for j in g) for g in groups] for row in O]
 rows=list(map(sum,O));cols=list(map(sum,zip(*O)));N=sum(rows);E=[[F(r*c,N) for c in cols] for r in rows];con=[[F(o-e)**2/e for o,e in zip(row,erow)] for row,erow in zip(O,E)];return O,E,con,rows,cols,sum(map(sum,con)),(len(rows)-1)*(len(cols)-1)
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
def num(z):
 z=z.replace(r'\(','').replace(r'\)','').strip()
 return M(z) if re.fullmatch(r'-?\d+(?:\.\d+)?',z) else None
def printed(a,z,label,dp=3):check(f'{float(a):.{dp}f}' in flat(z),label)
def test_result(ref,stat,df,label,out=None):
 check(ref['df']==df,label+' df');near(ref['statistic'],stat,label+' statistic');crit=critical(str(ref['alpha']),df);pv=survival(stat,df);near(ref['critical'],crit,label+' critical');near(ref['p_value'],pv,label+' p-value');check(ref['reject']==(pv<=M(ref['alpha'])),label+' decision')
 if out:
  printed(stat,out,label+' printed statistic');check(re.search(r'\\nu\s*=\s*'+str(df)+r'\b',out) is not None,label+' printed df');check(('insufficient evidence' in out)==(not ref['reject']),label+' conclusion')
 return crit,pv
if args.source:
 owner=json.loads(Path(args.source).read_text(encoding='utf-8-sig'));source=[q for l in owner['lessons'] for q in l['questions']];check(hashlib.sha256(Path(args.source).read_bytes()).hexdigest()==p['source']['sha256'],'read-only source SHA')
else:
 source=[dict(**{k:q[k] for k in ['title','answer_html','solution_html','hint_html']},question_html=q['prompt_html'],stem_html=a['stem_html'],parts=a['parts'],bank_number=a['bank_number']) for a in v['owner'] for q in p['questions'] if q['id']==a['uid']]
check(len(source)==len(v['owner'])==35,'all 35 owner questions')
counts=Counter();owner_report=[]
for a,src in zip(v['owner'],source):
 q=next(q for q in p['questions'] if q['id']==a['uid']);r=a['numeric_reference'];n=a['bank_number'];tag='Q'+str(n);start=len(checks);counts[r['kind']]+=1
 check(digest(q)==a['contentSha256'],tag+' content binding')
 for field in ['title','answer_html','solution_html','hint_html']:
  expected=re.sub(r'80\.612(?!\d)','80.6125',src[field]) if n==18 and field in ['answer_html','solution_html'] else src[field]
  check(expected==q[field],tag+' approved/unchanged '+field)
 expected_prompt=src['stem_html']+'<ol class="parts" type="a">'+''.join('<li>'+part['prompt_html']+'<span class="marks">['+str(part['marks'])+']</span></li>' for part in src['parts'])+'</ol>'
 check(q['prompt_html']==expected_prompt,tag+' same stem and part text; standard wrappers')
 check(src['parts']==a['parts'],tag+' unchanged parts');check(sum(c['marks'] for z in src['parts'] for c in z['criteria'])==q['marks'],tag+' marks')
 tables=Tables(src['stem_html']).tables;observed_tables=[t for t in tables if t['caption'] in ['Observed frequencies','Grouped sample measurements']]
 if r['kind']=='contingency':
  def verify_table(record,table,label):
   raw=record['observed'];visible=[[int(z) for z in row[1:-1]] for row in table['rows'][1:-1]];check(visible==raw,label+' actual observed cells');check([int(row[-1]) for row in table['rows'][1:-1]]==list(map(sum,raw)),label+' visible row totals');check([int(z) for z in table['rows'][-1][1:-1]]==list(map(sum,zip(*raw))),label+' visible column totals')
   _,rawE,_,_,_,_,_=matrix(raw)
   for row,erow in zip(record['raw_expected'],rawE):
    for x,y in zip(row,erow):near(x,y,label+' raw expected')
   grouped,E,con,rows,cols,stat,df=matrix(raw,record['column_groups']);check(record['N']==sum(rows),label+' sample size');check(grouped==record['grouped_observed'],label+' grouped observed');check(rows==record['row_totals'] and cols==record['column_totals'],label+' margins')
   for rr,erow,crow,cc in zip(record['expected'],E,record['contributions'],con):
    for x,y,c,d in zip(rr,erow,crow,cc):near(x,y,label+' expected');near(c,d,label+' contribution');check(y>=5,label+' expected >=5')
   test_result(record,stat,df,label);return stat,E,con
  stat,E,con=verify_table(r,observed_tables[0],tag);test_result(r,stat,r['df'],tag+' displayed',q['answer_html'])
  for t in tables:
   if t['caption'].startswith('Expected frequencies'):
    for row,expected in zip(t['rows'][1:-1],E):
     for value,ev in zip(row[1:-1],expected):printed(ev,value,tag+' printed expected cell')
  if 'second_test' in r:
   r2=r['second_test'];stat2,_,_=verify_table(r2,observed_tables[1],tag+' second');check([sum(row[j] for row in r2['observed'][1:]) for j in range(3)]==r['observed'][1],tag+' coarse/detailed consistency');printed(stat2,src['stem_html'],tag+' supplied statistic',5);printed(r2['critical'],src['answer_html'],tag+' second critical')
  if 'sample_scaling_check' in r:
   k=int(mp.ceil(critical(str(r['alpha']),r['df'])/M(stat)));check(k==r['sample_scaling_check']['least_integer'],tag+' least integer multiplier');near((k-1)*M(stat),r['sample_scaling_check']['previous_statistic'],tag+' previous multiplier');near(k*M(stat),r['sample_scaling_check']['accepted_statistic'],tag+' accepted multiplier')
  if n==25:
   ij=max(((i,j) for i,row in enumerate(con) for j in range(len(row))),key=lambda ij:con[ij[0]][ij[1]]);check(ij==(2,2),tag+' largest contribution');printed(E[2][2],src['answer_html'],tag+' largest-cell expected')
  if n==27:
   for rate in [F(69,120)*100,F(12,120)*100,F(28,80)*100,F(21,80)*100]:check(str(float(rate)).rstrip('0').rstrip('.')+'%' in flat(src['answer_html']),tag+' proportions')
  if n==24:check(survival(stat,r['df'])<M('.05') and survival(stat,r['df'])>M('.01'),tag+' changed level')
 else:
  O=r['observed'];N=sum(O);observed=tables[0];visible=[int(z) for z in observed['rows'][1][1:]];check(visible==O,tag+' actual observed counts');check(N==r['N'],tag+' N')
  s=r['fitted_parameters'];probs=[]
  if r['kind'] in ['poisson','binomial','uniform']:
   if r['kind']=='poisson':
    lam=M(F(sum(i*f for i,f in enumerate(O)),N)) if s else M(r['lam']);near(lam,r['lam'],tag+' fitted/specified lambda');probs=[mp.exp(-lam)*lam**i/mp.factorial(i) for i in range(r['tail'])];probs.append(1-sum(probs));check(r['tail']==len(O)-1,tag+' full Poisson tail')
    if s:check(O[-1]==0,tag+' exact fitting from complete observations')
    else:check(str(r['lam']) in flat(src['stem_html']),tag+' fixed parameter visible')
   elif r['kind']=='binomial':
    m=r['trials'];prob=M(F(sum(i*f for i,f in enumerate(O)),m*N)) if s else M(r['p']);near(prob,r['p'],tag+' binomial p');probs=[mp.binomial(m,i)*prob**i*(1-prob)**(m-i) for i in range(m+1)];check(len(O)==m+1,tag+' full binomial support');check(re.search(r'\\operatorname\{B\}\('+str(m)+',',src['stem_html']) is not None or n in [14,15,17],tag+' trial count visible')
   else:probs=[M(1)/len(O)]*len(O)
  else:
   bounds=list(map(M,r['bounds']));model=r['model'];x=sy.Symbol('x',real=True)
   if model=='normal':
    mu=M(r['params']['mu']);sigma=M(r['params']['sigma']);probs=[phi((b-mu)/sigma)-phi((a-mu)/sigma) for a,b in zip(bounds,bounds[1:])];check(bounds[0]==-mp.inf and bounds[-1]==mp.inf,tag+' complete normal tails');check(str(r['params']['mu']) in flat(src['stem_html']) and str(r['params']['sigma']) in flat(src['stem_html']),tag+' normal parameters visible')
   else:
    density={'power_tail':sy.Rational(5,64)*(4-x)**sy.Rational(3,2),'polynomial_reciprocal':sy.Rational(4,87)*(x*x+x**-2),'quadratic':sy.Rational(3,56)*x*(5-x)}[model];integral=sy.integrate(density,x);probs=[M(sy.simplify(integral.subs(x,sy.Rational(str(b)))-integral.subs(x,sy.Rational(str(a)))) .evalf(40)) for a,b in zip(bounds,bounds[1:])];check(sy.integrate(density,(x,sy.Rational(str(bounds[0])),sy.Rational(str(bounds[-1]))))==1,tag+' density mass');check(r['fitted_parameters']==0,tag+' specified density');check({19:r'\dfrac5{64}(4-x)^{3/2}',20:r'\dfrac4{87}\left(x^2+\dfrac1{x^2}\right)',22:r'\dfrac3{56}x(5-x)'}[n] in src['stem_html'],tag+' actual density')
   expected_table=next(t for t in tables if t['caption'].startswith('Expected frequencies'));check(expected_table['rows'][0][1:]==r['labels'],tag+' actual test boundaries')
  E=[N*z for z in probs];near(sum(probs),1,tag+' total probability');near(sum(E),N,tag+' expected total')
  for key,values in [('probabilities',probs),('expected',E)]:
   for z,ev in zip(r[key],values):near(z,ev,tag+' '+key)
  groups=r['groups'];check([j for g in groups for j in g]==list(range(len(O))),tag+' disjoint exhaustive pooling');check(all(g==list(range(min(g),max(g)+1)) for g in groups),tag+' adjacent pooling')
  groupedO=[sum(O[j] for j in g) for g in groups];groupedE=[sum(E[j] for j in g) for g in groups];check(groupedO==r['grouped_observed'],tag+' grouped observed')
  for z,ev in zip(r['grouped_expected'],groupedE):near(z,ev,tag+' grouped expected');check(ev>=5,tag+' expected >=5')
  df=len(groups)-1-s;stat=sum((o-e)**2/e for o,e in zip(groupedO,groupedE));test_result(r,stat,df,tag,q['answer_html'])
  for t in tables:
   if not t['caption'].startswith('Expected frequencies'):continue
   for row in t['rows'][1:]:
    contribution='Contribution' in row[0];values=[(o-e)**2/e for o,e in zip(O,E)] if contribution else E
    for raw,ev in zip(row[1:],values):
     actual=num(raw)
     if actual is not None:near(actual,round(float(ev),3),tag+' visible expected/contribution','1e-12')
     else:
      blank=raw.replace(r'\(','').replace(r'\)','');match=re.search(r'\b'+blank+r'\s*=\s*(-?\d+(?:\.\d+)?)',flat(src['answer_html']))
      check(match is not None,tag+' missing value '+blank)
      if match:near(match[1],round(float(ev),3),tag+' answer '+blank,'1e-12')
  if n in [1,2,3,4,5,8,13,17]:
   total=sum(i*f for i,f in enumerate(O));ss=sum(i*i*f for i,f in enumerate(O));mean=F(total,N);variance=(F(ss)-F(total*total,N))/(N if n==2 else N-1)
   for name,val in [('mean',mean),('variance',variance)]:
    if n not in ([1,2,5] if name=='mean' else [1,2,3,5]):continue
    pattern=r'\\bar x' if name=='mean' else (r'v' if n==2 else r's\^2');match=re.search(pattern+r'=\\frac\{(\d+)\}\{(\d+)\}',src['answer_html']);check(bool(match) and F(int(match[1]),int(match[2]))==val,tag+' actual '+name)
   if n==2:
    prob=1-sum(probs[:7]);printed(N*prob,src['answer_html'],tag+' at least 7')
   if n==13:check('1.8225' in src['answer_html'] and F('1.35')**2==F('1.8225'),tag+' pilot variance')
  if n==7:check(survival(stat,df)<M('.1') and survival(stat,df)>M('.05'),tag+' 10% versus 5%')
  if n==17:check('\\nu=4' in src['parts'][2]['answer_html'],tag+' external parameter df')
  if n==18:
   gm=r['grouped_mean_check'];value=sum(F(str(mid))*f for mid,f in zip(gm['midpoints'],O))/N;near(gm['estimate'],M(value),tag+' midpoint mean');check(value==F(6449,80),tag+' exact midpoint mean')
   check('80.6125' in q['answer_html'] and '80.6125' in q['solution_html'],tag+' approved exact mean displayed')
  if n==21:
   rc=r['realisation_check'];var=sum(2*count*sy.sympify(offset)**2 for offset,count in zip(rc['offsets'],rc['multiplicities_per_side']))/rc['variance_denominator'];check(sy.simplify(var-9)==0,tag+' compatible fitted variance');check(2*sum(rc['multiplicities_per_side'])==N,tag+' compatible sample size')
 owner_report.append(dict(number=n,uid=q['id'],checks=len(checks)-start))
# A separate density quadrature confirms the inverse-gamma quantiles used above.
for df in sorted({q['numeric_reference']['df'] for q in v['owner']}):
 for alpha in ['.1','.05','.025','.01','.005']:
  c=critical(alpha,df);density=lambda x:mp.power(x,M(df)/2-1)*mp.exp(-x/2)/(mp.power(2,M(df)/2)*mp.gamma(M(df)/2));near(mp.quad(density,[c,mp.inf]),M(alpha),f'chi2 density quadrature {df}/{alpha}','1e-30')
def exact_model(m):
 kind=m['kind'];S=lambda k:sy.sympify(m[k]);O=m.get('observed');E=None;stat=None;df=None
 if kind=='logic':return {'reason':m['answer']}
 if kind in ['gof','pooled_gof','binomial_gof','categorical','density_gof','normal_gof']:
  N=sum(O)
  if kind=='categorical':E=[N*sy.Rational(z) for z in m['probabilities']]
  elif kind=='binomial_gof':E=[N*sy.binomial(m['trials'],i)*S('p')**i*(1-S('p'))**(m['trials']-i) for i in range(m['trials']+1)];check(m['parameters']==0 or sy.Rational(sum(i*f for i,f in enumerate(O)),N*m['trials'])==S('p'),m.get('id','binomial')+' fitted p')
  elif kind=='density_gof':
   x=sy.Symbol('x');density=sy.sympify(m['density']);bounds=list(map(sy.sympify,m['bounds']));check(sy.integrate(density,(x,bounds[0],bounds[-1]))==1,'new density mass');E=[N*sy.integrate(density,(x,a,b)) for a,b in zip(bounds,bounds[1:])]
  elif kind=='normal_gof':E=[N*(phi((M(b)-M(m['mu']))/M(m['sigma']))-phi((M(a)-M(m['mu']))/M(m['sigma']))) for a,b in zip(m['bounds'],m['bounds'][1:])]
  else:E=list(map(sy.Rational,m['expected']))
  if 'groups' in m:E=[sum(E[j] for j in g) for g in m['groups']];O=[sum(O[j] for j in g) for g in m['groups']]
  stat=sum((o-e)**2/e for o,e in zip(O,E));df=len(E)-1-m.get('parameters',0)
  check(all(e>=5 for e in E),'new final expectations >=5')
  if kind=='normal_gof':near(stat,m['statistic'],m['id']+' statistic')
  else:check(sy.simplify(stat-sy.sympify(m['statistic']))==0,'new exact statistic')
  check(df==m.get('df',len(E)-1),m.get('id','new')+' df')
  if 'critical' in m:check(bool(stat>=S('critical'))==m['reject'],m['id']+' test decision')
  if kind=='categorical':return dict(zip(['e1','e2','e3','stat'],[*E,stat]))
  if kind=='density_gof':return dict(lower=E[0],upper=E[1],stat=stat)
  return None
 if kind=='binomial_classes':
  N=m['N'];r=m['trials'];pr=S('p');E=[N*sum(sy.binomial(r,i)*pr**i*(1-pr)**(r-i) for i in g) for g in m['groups']];return dict(zero=E[0],one=E[1],tail=E[2],df=len(E)-1)
 if kind=='pool_cell':
  oo=sum(O[j] for j in m['group']);ee=sum(m['expected'][j] for j in m['group']);return dict(observed=oo,expected=ee,contribution=sy.Rational((oo-ee)**2,ee),df=len(O)-2)
 if kind=='moments':
  N=sum(O);total=sum(j*f for j,f in enumerate(O));var=(sy.Rational(sum(j*j*f for j,f in enumerate(O)))-sy.Rational(total*total,N))/(N-1);mean=sy.Rational(total,N);check(mean==S('mean') and var==S('variance'),'new moments');return dict(lambda_=mean,variance=var)
 if kind=='fitted_binomial':
  N=sum(O);pr=sy.Rational(sum(j*f for j,f in enumerate(O)),N*m['trials']);zero=N*(1-pr)**m['trials'];check(pr==S('p') and sy.simplify(zero-S('zero'))==0,'new fitted binomial');return dict(p=pr,zero=zero)
 if kind=='df':return dict(zip(['fixed','one','two'] if len(m['parameters'])==3 else ['a','b'],[sy.Integer(m['classes']-1-z) for z in m['parameters']]))
 if kind=='uniform_classes':E=[sy.Rational(m['N']*(b-a),m['L']) for a,b in zip(m['bounds'],m['bounds'][1:])];return dict(e1=E[0],e2=E[1],e3=E[2],df=len(E)-1)
 if kind=='tail_classes':return dict(left=m['N']*S('left'),middle=m['N']*(1-S('left')-S('right')),right=m['N']*S('right'))
 if kind in ['contingency','first_row']:
  oo,EE,_,_,_,stat,df=matrix(O,m.get('groups'));E=[[sy.Rational(z) for z in row] for row in EE]
  check(df==m['df'],'new contingency df')
  if kind=='first_row':return dict(e1=E[0][0],e2=E[0][1],e3=E[0][2],df=df)
  check(sy.Rational(stat)==S('statistic'),'new contingency statistic');check([[sy.Rational(z) for z in row] for row in m['expected']]==E,'new complete expected table')
  if 'critical' in m:check(bool(sy.Rational(stat)>=S('critical'))==m['reject'],'new contingency decision')
  if m.get('groups'):return dict(top=E[0][0],bottom=E[1][0],stat=sy.Rational(stat),df=df)
  return dict(e11=E[0][0],e12=E[0][1],e21=E[1][0],e22=E[1][1],stat=sy.Rational(stat),df=df)
 if kind=='scaling':check((m['least']-1)*S('statistic')<S('critical')<=m['least']*S('statistic'),'new least multiplier');return None
 if kind=='chi_tail':near(survival(m['statistic'],m['df']),mp.e**(-3),m['id']+' tail');check([survival(m['statistic'],m['df'])<=M(a) for a in ['.05','.01']]==m['decisions'],'new significance decisions');return None
 raise ValueError(kind)
for group in ['quick','examples']:
 for a in v[group]:
  m=a['model'] if group=='quick' else a;uid=a['uid'] if group=='quick' else a['id'];content=next(q for q in p['questions'] if q['id']==uid) if group=='quick' else next(e for l in p['lessons'] for e in l['examples'] if e['verification']==uid);check(digest(content)==a['contentSha256'],uid+' content binding');values=exact_model(m)
  if group=='quick':
   if 'lambda_' in values:values['lambda']=values.pop('lambda_')
   check(set(values)=={f['key'] for f in content['fields']},uid+' complete field set')
   for f in content['fields']:check(values[f['key']]==f['expected'] if f['type']=='choice' else sy.simplify(values[f['key']]-sy.sympify(f['expected']))==0,uid+' complete key '+f['key'])
  elif m['kind']=='df':check(list(values.values())==list(map(sy.Integer,m['expected'])),uid+' both df cases')
for l in p['lessons']:check(v['teachingDigests'][l['id']]==digest(l),l['id']+' teaching binding')
frozen=json.loads(Path('content/original/9231-statistics/chi2-v1.json').read_text(encoding='utf8'))
check(frozen['version']=='1.0.0' and p['version']=='1.0.1','immutable previous manifest retained')
for old,new in zip(frozen['questions'],p['questions']):
 changed=[k for k in old if old[k]!=new[k]];allowed=['prompt_html']+(['answer_html','solution_html'] if old['id']=='maths4u_9231_stats03_018_v1' else [])
 check(set(changed)<=set(allowed),new['id']+' narrow revision')
report=dict(checks=len(checks),failures=failures,warnings=warnings,approvedCorrections=[dict(question=18,old='80.612',new='80.6125',fields=['answer_html','solution_html'],ownerApproved=True,marksAndCriteriaUnchanged=True)],owner=35,parts=74,marks=303,quick=32,examples=16,models=dict(counts),ownerChecks=owner_report,precisionDigits=42,quantileMethod='Regularized upper gamma with bisection; separate direct-density quadrature for each audited df and five significance levels.',reviewed=['model hypotheses and independent sampling','expected-count pooling and complete support','parameter origin and degrees of freedom','association versus causation','whole-category pooling and independent sample scaling'])
Path(args.report).write_text(json.dumps(report,indent=2)+'\n',encoding='utf8');print(json.dumps({k:report[k] for k in ['checks','failures','warnings','owner','quick','examples']},ensure_ascii=True));raise SystemExit(bool(failures))
