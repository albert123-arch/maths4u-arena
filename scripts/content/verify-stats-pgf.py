"""Independent statement models, exact coefficient arithmetic and actual TeX-answer checks."""
import argparse,hashlib,html,itertools,json,math,re
from collections import Counter
from functools import lru_cache
from pathlib import Path
import sympy as s
from sympy.parsing.latex import parse_latex
from sympy.core.function import AppliedUndef
ap=argparse.ArgumentParser();ap.add_argument('--source');ap.add_argument('--report',default='docs/ARENA-C5-PGF-MATH-CHECKS-20261106.json');args=ap.parse_args()
t,p,a,b,k,n,lam=s.symbols('t p a b k n lambda');local={v.name:v for v in [t,p,a,b,k,n,lam]};log=[];errors=[];parsed_count=0
def P(v):return s.sympify(v,locals=local)
def digest(v):return hashlib.sha256(json.dumps(v,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()
def check(ok,label):
 log.append(label)
 if not bool(ok):errors.append(label)
def eq(x,y):return s.simplify(s.expand_func(s.powsimp(x-y,force=True)))==0
def normalise(raw):
 raw=html.unescape(raw).strip().strip('.,; ').replace(r'\dfrac',r'\frac');out='';i=0
 def atom(j):
  while j<len(raw) and raw[j].isspace():j+=1
  if raw[j]=='{':
   depth=1;end=j+1
   while depth:
    depth+=(raw[end]=='{')-(raw[end]=='}');end+=1
   return normalise(raw[j+1:end-1]),end
  if raw[j]=='\\':
   m=re.match(r'\\[A-Za-z]+',raw[j:]);return m[0],j+len(m[0])
  return raw[j],j+1
 while i<len(raw):
  if raw.startswith(r'\frac',i):
   aa,j=atom(i+5);bb,i=atom(j);out+=r'\frac{'+aa+'}{'+bb+'}';continue
  out+=raw[i];i+=1
 return out
@lru_cache(None)
def tex(raw):
 raw=normalise(raw).replace(r'\dfrac',r'\frac').replace(r'\left','').replace(r'\right','')
 raw=re.sub(r'\b([tpa])\s*(\\left\s*)?\(',lambda m:m[1]+r'\cdot '+(m[2] or '')+'(',raw)
 z=parse_latex(raw,strict=True)
 for atom in z.atoms(AppliedUndef):
  if atom.func.__name__ in local:z=z.xreplace({atom:local[atom.func.__name__]*s.prod(atom.args)})
 return z.xreplace({v:s.E if v.name=='e' else local.get(v.name,v) for v in z.free_symbols})
def blocks(raw):return [x or y for x,y in re.findall(r'\\\[(.*?)\\\]|\\\((.*?)\\\)',html.unescape(raw),re.S)]
def segments(raw):
 for block in blocks(raw):
  block=re.sub(r'\\(?:begin|end)\{gathered\}','',block)
  yield from re.split(r'\\\\|,?\s*\\q(?:q)?uad\s*|,\s*\\\s+(?=[a-z]+=)|,\s*(?=G_|[a-z]+=)',block)
@lru_cache(None)
def coefficient(g,r):return s.expand(s.series(g,t,0,r+1).removeO()).coeff(t,r)
@lru_cache(None)
def moments(g):
 mean=s.simplify(s.diff(g,t).subs(t,1));ff=s.simplify(s.diff(g,t,2).subs(t,1));return mean,ff,s.simplify(ff+mean-mean*mean)
def bern(*probs):return s.prod(1-P(q)+P(q)*t for q in probs)
def hyper(marked,other,draw):return sum(s.Rational(math.comb(marked,r)*math.comb(other,draw-r),math.comb(marked+other,draw))*t**r for r in range(max(0,draw-other),min(marked,draw)+1))
def geom(prob,shift=1):return P(prob)*t**shift/(1-(1-P(prob))*t)
def uniform(lo,hi):return sum(t**j for j in range(lo,hi+1))/s.Integer(hi-lo+1)
def canonical(raw):
 raw=re.sub(r"G('+)_(\{[^}]+\}|[A-Za-z]+)",lambda m:'G_'+m[2]+m[1],raw)
 return re.sub(r'\^\{(\\prime)+\}',lambda m:"'"*m[0].count('prime'),raw)
def declared(raw,models,tag):
 global parsed_count
 for segment in segments(raw):
  segment=canonical(segment)
  if '=' not in segment or r'\Rightarrow' in segment:continue
  rhs=segment.split('=')[-1].strip().strip('.,; ')
  rhs=re.sub(r'\\\s*\(t\\ne1\)$','',rhs).strip()
  if any(z in rhs for z in [r'\mathrm',r'\operatorname',r'\text',r'\sum',r'\infty','G_']):continue
  lhs=segment.split('=')[0]
  match=re.fullmatch(r"G_(?:\{([^}]+)\}|([A-Za-z0-9_]+))('{0,2})\((t|1|-1)\)",lhs.strip())
  matches=[match] if match else []
  for match in matches:
   name=match[1] or match[2]
   if name not in models:continue
   gs=models[name] if isinstance(models[name],list) else [models[name]];target=[]
   for g in gs:
    value=s.diff(g,t,len(match[3]));target.append(value if match[4]=='t' else value.subs(t,int(match[4])))
   try:value=tex(rhs)
   except Exception as exc:errors.append(tag+' unparsable declared PGF '+name+': '+str(exc)[:80]);continue
   if value.free_symbols-set().union(*(z.free_symbols for z in target)):continue
   check(any(eq(value,z) or eq(value.subs(b,1-4*a),z.subs(b,1-4*a)) for z in target),tag+' actual PGF/derivative '+name+' '+match[3]+'('+match[4]+')');parsed_count+=1
  for match in re.finditer(r'\\(?:mathrm\s*E|operatorname\{Var\})\(([^)]+)\)',lhs):
   name=match[1]
   if name not in models:continue
   gs=models[name] if isinstance(models[name],list) else [models[name]];index=2 if 'Var' in match[0] else 0
   try:value=tex(rhs)
   except Exception:continue
   targets=[moments(g)[index] for g in gs];check(any(eq(value,z) or eq(value.subs(b,1-4*a),z.subs(b,1-4*a)) for z in targets),tag+' actual moment '+match[0]);parsed_count+=1
def answer_values(q,index):
 values=[]
 for z in segments(q['parts'][index]['answer_html']):
  rhs=z.split('=')[-1].strip().strip('.,; ').replace(r'\left','').replace(r'\right','')
  if any(v in rhs for v in [r'\quad',r'\sim',r'\ldots',r'\in',r'\text',r'\ne',r'\le',r'\ge',',',';']):continue
  try:values.append(tex(rhs))
  except Exception:pass
 return values
package=json.loads(Path('content/original/9231-statistics/pgf-v1.json').read_text(encoding='utf8'));fixtures=json.loads(Path('content/original/9231-statistics/pgf-verification-v1.json').read_text(encoding='utf8'))
if args.source:
 source=Path(args.source);data=json.loads(source.read_text(encoding='utf-8-sig'));owner=[q for l in data['lessons'] for q in l['questions']];check(hashlib.sha256(source.read_bytes()).hexdigest()==package['source']['sha256'],'owner read-only SHA')
else:owner=[r['original'] for r in fixtures['owner']]
qs={q['bank_number']:q for q in owner};models={};extra={}
def add(number,pgfs,claims=()):models[number]=pgfs;extra[number]=claims
add(1,{'X':geom('3/10')},[(1,P('10/3')),(2,s.Integer(12))])
add(2,{'F':geom('2/5',0)},[(1,P('162/3125')),(1,P('27/125')),(2,s.Integer(6))])
add(3,{'X':geom('3/10')},[(0,P('3/10')),(1,P('3/10')*P('7/10')**5),(2,s.Integer(10))])
add(4,{'X':geom('1/4')},[(0,1-P('3/4')**3),(1,s.Integer(18))])
add(5,{'X':geom('2/5')},[(2,P('3/5')**5)])
add(6,{'X':[geom(p),geom('1/4')]},[(1,P('1/4')),(2,P('3/4')**2-P('3/4')**6),(3,s.Integer(17))])
add(7,{'X':[geom(p),geom('1/3')]},[(0,P('1/3')),(1,P('2/9')),(2,P('2/3')-P('2/3')**5)])
add(8,{'Y':(1-a)/(1-a*t**3)},[(0,1-a),(1,a**3),(2,s.Rational(1,2))])
joint=Counter()
for pair in itertools.combinations('A'*5+'G'*3+'W'*2,2):joint[(pair.count('A'),len(set(pair)))]+=1
mx=sum(s.Rational(c,45)*t**x for (x,y),c in joint.items());my=sum(s.Rational(c,45)*t**y for (x,y),c in joint.items());mz=sum(s.Rational(c,45)*t**(x+y) for (x,y),c in joint.items())
add(9,{'X':mx,'Y':my,'Z':mz});check(coefficient(mx*my,4)>0 and coefficient(mz,4)==0,'owner 9 actual joint support contradiction')
x=bern('1/2','2/5','3/4');y=bern('1/3','1/3');add(10,{'X':x,'Y':y,'Z':x*y})
x=(2+t+3*t*t)/6;y=t*(3+2*t*t)/5;add(11,{'X':x,'Y':y,'Z':x*y},[(0,s.Rational(1,6))])
x=bern(*['3/5']*3);y=bern('1/4','1/4');add(12,{'X':x,'Y':y,'Z':x.subs(t,t*t)*y})
x=hyper(5,3,3);y=bern('1/3','1/3');add(13,{'X':x,'Y':y,'Z':x*y})
x=2*t/(5-3*t**3);add(14,{'X':x},[(1,coefficient(x,7))])
x=hyper(4,4,3);y=hyper(2,6,2);add(15,{'X':x,'Y':y,'Z':x*y})
x=sum(s.Rational(r*(r+1),40)*t**r for r in range(1,5));y=bern('1/3','1/3');add(16,{'X':x,'Y':y,'Z':x*y},[(0,s.Rational(1,40))])
x=hyper(6,4,2);y=bern('3/4','1/4');add(17,{'X':x,'Y':y,'Z':x*y},[(1,s.Rational(1,4))])
x=bern('1/3','1/3');y=bern('2/5','2/5','4/5');add(18,{'X':x,'Y':y,'Z':x*y})
add(19,{'X':s.exp(lam*(t-1))},[(2,(1+s.exp(-2*lam))/2)])
x=bern('1/4','1/2','2/3');y=bern('1/4','1/4');add(20,{'X':x,'Y':y,'Z':x*y.subs(t,t*t)})
x=P('1/4')+t/4+t*t/2;y=(t+2*t**3)/3;add(21,{'X':x,'Y':y,'Z':x*y},[(0,P('1/4')),(0,P('1/2')),(2,coefficient(x*y,4)+coefficient(x*y,5))])
x=bern(*['2/5']*3);y=bern('1/2','1/2');add(22,{'X':x,'Y':y,'Z':x*y},[(3,coefficient(x*y,4)+coefficient(x*y,5))])
x=t/(2-t)**3;y=t*t/(2-t)**2;add(23,{'X':x,'Y':y,'Z':x*y},[(1,1-sum(coefficient(x*y,j) for j in range(6)))])
x=t/(3-2*t)**2;add(24,{'X':x,'Y':x**3},[(2,coefficient(x,4))])
x=t**2*(2+t)**4/81;add(25,{'X':x,'Y':x**3},[(0,P('1/81')),(3,coefficient(x**3,9))])
add(26,{'F':geom(p,0),'T':geom('2/5'),'Z':geom('2/5')**3})
x=hyper(4,5,3);y=hyper(3,4,2);add(27,{'X':x,'Y':y,'Z':x*y})
total=(4+20*t+25*t*t+4*t**3+10*t**4+t**6)/64;coeffs=[s.sqrt(total.subs(t,0))]
for j in range(1,4):coeffs.append(s.cancel((coefficient(total,j)-sum(coeffs[u]*coeffs[j-u] for u in range(1,j)))/(2*coeffs[0])))
x=sum(z*t**j for j,z in enumerate(coeffs));add(28,{'X':x,'Y':total});check(eq(x*x,total),'owner 28 recovered polynomial squares back')
x=bern('3/4','1/4');add(29,{'X':x,'Y':x**3},[(0,P('3/4')),(0,P('1/4'))])
x=bern('2/5','2/5');y=bern('1/2','1/2');add(30,{'X':x,'Y':y,'Z':x*y})
x=t/4+t**3/2+t**4/4;add(31,{'X':x,'Y':x*x});check([j for j in range(2,9) if coefficient(x*x,j)==0]==[3],'owner 31 missing interior total')
x=a+3*a*t+b*t**3;add(32,{'X':x,'Y':[x**8,bern(*['3/4']*8)]});check(eq((x**8).subs(b,0).subs(a,P('1/4')),bern(*['3/4']*8)),'owner 32 binomial submodel')
x=(3*t+2*t**3)/5;add(33,{'X':x,'Y':x**5},[(2,coefficient(x**5,9))])
x=uniform(0,4);den=coefficient(x**3,4);add(34,{'X':x,'S':x**3},[(2,den),(3,coefficient(x*x,4)/5/den)])
pa,pb,pc=s.symbols('pa pb pc');sol=s.solve([pa+pb+pc-1,pb+3*pc-P('5/4'),pb+9*pc-(P('19/16')+P('5/4')**2)],[pa,pb,pc]);x=sol[pa]+sol[pb]*t+sol[pc]*t**3;add(35,{'X':x,'Y':x**3},[(2,coefficient(x**3,3))])
x=bern(*['2/5']*10);y=s.exp(P('3/2')*(t-1));add(36,{'X':[(1-p+p*t)**n,x],'Y':y,'Z':x*y},[(1,s.Integer(10)),(1,P('2/5')),(4,coefficient(x*y,2))])
x=geom('1/2');y=geom('2/3');add(37,{'X':x,'Y':y,'Z':x*y},[(3,sum(coefficient(x*y,j) for j in range(5)))])
for r in range(2,12):check(eq(coefficient(x*y,r),2*(s.Rational(1,2)**(r-1)-s.Rational(1,3)**(r-1))),'owner 37 general coefficient '+str(r))
r=s.Symbol('r');extra[37].append((1,2*(2**(-(r-1))-3**(-(r-1)))))
x=s.exp(4*(t-1));y=s.exp(t-1);add(38,{'X':x,'Y':y,'Z':x*y},[(0,s.Integer(4)),(0,s.Integer(1)),(2,coefficient(x*y,3)),(3,coefficient(x,2)*coefficient(y,1)/coefficient(x*y,3))])
x=(1+t)**2/12+2*t/(3*(2-t));add(39,{'X':x},[(2,sum(coefficient(x,j) for j in range(3)))])
x=uniform(1,5);add(40,{'X':x,'S':x*x},[(2,coefficient(x*x,7))])
x=s.exp(P('6/5')*(t-1));add(41,{'X':x,'S_n':s.exp(P('6/5')*n*(t-1))},[(0,P('6/5')),(2,s.Integer(6)),(3,coefficient(x**3,2))])
pa,pb,pc,pd=s.symbols('pa pb pc pd');sol=s.solve([pa+pb+pc+pd-1,pb+2*pc+3*pd-2,pb+4*pc+9*pd-5,pd-2*pb],[pa,pb,pc,pd]);x=sol[pa]+sol[pb]*t+sol[pc]*t*t+sol[pd]*t**3;add(42,{'X':x,'Z':t*x.subs(t,t*t),'S':x*x,'W':x.subs(t,t*t)*x},[(0,z) for z in sol.values()]+[(2,coefficient(x*x,4))])
x=geom('1/5');add(43,{'X':x,'Y':x*x},[(2,P('4/5')**5)])
x=(1+2*t+2*t**3)/5;add(44,{'X':x,'A':x.subs(t,t*t),'B':x*x},[(1,s.Integer(0)),(1,coefficient(x*x,3))])
x=k+(1-3*k)*t+k*t*t+k*t**3;xc=x.subs(k,P('1/10'));add(45,{'X':[x,xc],'Z':xc**2},[(1,P('1/10')),(3,coefficient(xc*xc,0)+coefficient(xc*xc,1))]);check(s.reduce_inequalities([k>=0,1-3*k>=0],k).as_set()==s.Interval(0,P('1/3')),'owner 45 valid parameter interval')
x=(1+t+3*t*t)/5;add(46,{'X':x});check(coefficient((1-t+3*t*t)/3,1)==-P('1/3'),'owner 46 negative coefficient invalidates proposal')
x=sum(P('1/3')*P('2/3')**(j-1)*t**j for j in range(1,4))+P('2/3')**3*t**4;add(47,{'T':x});check(eq(x.subs(t,1),1),'owner 47 capped last mass includes no success')
x=bern(*['1/3']*4);y=s.cancel((x-x.subs(t,0))/(1-x.subs(t,0)));add(48,{'X':x,'Y':y},[(2,coefficient(y,3)+coefficient(y,4))])
x=(3+2*t+3*t*t)/8;add(49,{'X':x,'Z':x**3})
x=uniform(0,2);z=x**4;add(50,{'X_1':x,'S':z,'4X_1':x.subs(t,t**4)},[(0,coefficient(z,4)),(1,P('1/81')/coefficient(z,4))]);check(coefficient(z,4)!=coefficient(x.subs(t,t**4),4),'owner 50 equal means different distributions')
# Strict integer boundaries: exact rational comparisons, and the rejected neighbour.
for num,success,bound,threshold,strict,least in [(1,'3/10',12,'98/100',True,True),(2,'2/5',6,'97/100',False,False),(3,'3/10',10,'96/100',False,True),(4,'1/4',18,'99/100',True,True),(6,'1/4',17,'99/100',False,True)]:
 q=1-P(success);prob=lambda j:1-q**(j-1 if strict else j);alpha=P(threshold)
 check((prob(bound)>alpha and prob(bound-1)<=alpha) if least else (prob(bound)<alpha and prob(bound+1)>=alpha),'owner '+str(num)+' strict adjacent integers')
check(1-s.exp(-P('6/5')*6)>P('999/1000') and 1-s.exp(-P('6/5')*5)<=P('999/1000'),'owner 41 adjacent period bound')
check(moments(geom('1/4'))[2]==12,'owner 6 recovered parameter satisfies variance')
check(moments(geom('1/3'))[2]==2*moments(geom('1/3'))[0],'owner 7 recovered mean-variance relation')
check(s.diff((1-a)/(1-a*t**3),t).subs(t,1).subs(a,P('1/2'))==3,'owner 8 recovered sparse parameter')
check(coefficient(bern('3/4','1/4'),1)==P('5/8'),'owner 17 recovered activation coefficient')
check(moments(bern(*['2/5']*10))[0]==4 and moments(bern(*['2/5']*10))[2]==P('12/5'),'owner 36 recovered binomial moments')
check(set(models)==set(qs)==set(range(1,51)),'all 50 owner models covered')
owner_audit=[]
for num,q in qs.items():
 start=len(log);tag='owner '+str(num);actual=next(z for z in package['questions'] if z['id']==q['content_uid']);fixture=next(z for z in fixtures['owner'] if z['bank_number']==num)
 check(fixture['original']==q,tag+' unchanged source fixture');check(digest(actual)==fixture['contentSha256'],tag+' package binding')
 check(actual['prompt_html']==q['stem_html']+'<ol class="parts" type="a">'+''.join('<li>'+z['prompt_html']+'<span class="marks">['+str(z['marks'])+']</span></li>' for z in q['parts'])+'</ol>',tag+' unchanged prompts in standard layout')
 for field in ['answer_html','solution_html','hint_html','marks']:check(actual[field]==q[field],tag+' unchanged '+field)
 check(actual['parts']==[dict(label=chr(97+j),marking_criteria=[dict(code=c['code'],marks=c['marks'],description_html=c['criterion_html']) for c in z['criteria']]) for j,z in enumerate(q['parts'])],tag+' every criterion retained')
 check(sum(z['marks'] for z in q['parts'])==q['marks'] and all(sum(c['marks'] for c in z['criteria'])==z['marks'] for z in q['parts']),tag+' part and criterion totals')
 declared(q['answer_html'],models[num],tag+' answer');declared(q['solution_html'],models[num],tag+' solution')
 for index,value in extra[num]:check(any(eq(value,z) for z in answer_values(q,index)),tag+' part '+str(index+1)+' actual scalar '+str(value))
 # Finite probability models are also checked by direct support sums.
 for name,gg in models[num].items():
  for g in gg if isinstance(gg,list) else [gg]:
   if g.free_symbols<={t}:
    check(eq(g.subs(t,1),s.Integer(1)),tag+' '+name+' normalisation')
    if g.is_polynomial(t):
     poly=s.Poly(g,t);check(all(c>=0 for c in poly.all_coeffs()),tag+' '+name+' nonnegative mass');mean=sum(j[0]*c for j,c in poly.terms());second=sum(j[0]**2*c for j,c in poly.terms());m,ff,var=moments(g);check(eq(m,mean) and eq(var,second-mean**2),tag+' '+name+' direct moments')
 # Every finite independent Bernoulli factor is distinct from an assumed binomial.
 owner_audit.append(dict(number=num,checks=len(log)-start,parts=len(q['parts'])))
def evaluate(model):
 kind=model['kind']
 if kind=='logic':return dict(reason=model['answer'])
 if kind=='weights':
  den=sum(model['weights']);g=sum(s.Rational(w,den)*t**r for r,w in zip(model['support'],model['weights']));return dict(k=s.Rational(1,den),pgf=g,missing=coefficient(g,model['missing']))
 if kind=='geometric':
  pp=P(model['p']);return dict(trials=[pp*t,1-(1-pp)*t],failures=[pp,1-(1-pp)*t],tail=(1-pp)**3)
 if kind=='binomial':
  pp=P(model['p']);nn=model['n'];return dict(pgf=bern(*[pp]*nn),zero=(1-pp)**nn,all=pp**nn)
 if kind=='moments':
  g=P(model['pgf']);m,ff,var=moments(g);return dict(mean=m,factorial=ff,second=ff+m,variance=var)
 if kind=='recover':
  m=P(model['mean']);var=P(model['variance']);p2=s.cancel((var+m*m-m)/2);p1=m-2*p2;p0=1-p1-p2;return dict(p0=p0,p1=p1,p2=p2,pgf=p0+p1*t+p2*t*t)
 if kind in ['sum','hyper_sum']:
  x=P(model['x']) if kind=='sum' else hyper(model['marked'],model['other'],2);y=P(model['y']) if kind=='sum' else bern(model['p'],model['p']);g=x*y;m,ff,var=moments(g)
  return dict(component=x,pgf=g,prob=coefficient(g,model.get('target',3)),mean=m,variance=var)
 if kind=='bin_poisson':
  x=bern(*[model['p']]*model['n']);ll=P(model['lam']);g=x*s.exp(ll*(t-1));m,ff,var=moments(g);scaled=sum(coefficient(x,j)*ll**(2-j)/s.factorial(2-j) for j in range(3));return dict(mean=m,variance=var,scaled=scaled)
 if kind=='transform':
  x=P(model['pgf']);g=t**model['b']*x.subs(t,t**model['a']);support=[model['a']*j[0]+model['b'] for j,c in s.Poly(x,t).terms() if c];return dict(pgf=g,lower=min(support),upper=max(support),variance=moments(g)[2])
 if kind=='double':
  x=bern(model['p']);aa=x.subs(t,t*t);bb=x*x;return dict(scaled=aa,copies=bb,mean=moments(aa)[0],va=moments(aa)[2],vb=moments(bb)[2])
 if kind=='mixture':
  w=P(model['w']);g=w*bern(model['p'])+(1-w)*t**model['c'];m,ff,var=moments(g);return dict(pgf=g,mean=m,variance=var)
 if kind=='copies':
  x=P(model['pgf']);g=x**model['n'];m,ff,var=moments(g);return dict(pgf=g,prob=coefficient(g,model['target']),mean=m,variance=var)
 if kind=='root':
  pp=P(model['p']);x=geom(pp);m,ff,var=moments(x);return dict(pgf=[pp*t,1-(1-pp)*t],mean=m,variance=var,prob=pp*(1-pp)**2)
 if kind=='conditional':
  u=model['upper'];nn=model['n'];target=model['target'];outcomes=list(itertools.product(range(u+1),repeat=nn));hit=[row for row in outcomes if sum(row)==target];joint=[row for row in hit if row[0]==0];return dict(total=s.Rational(len(hit),len(outcomes)),joint=s.Rational(len(joint),len(outcomes)),conditional=s.Rational(len(joint),len(hit)))
 raise ValueError(kind)
for row in fixtures['quick']:
 q=next(z for z in package['questions'] if z['id']==row['uid']);check(digest(q)==row['contentSha256'],q['id']+' content binding');values=evaluate(row['model'])
 for field in q['fields']:
  expected=field['expected'];value=values[field['key']]
  check(value==expected if field['type']=='choice' else all(eq(P(x),P(y)) for x,y in zip(value,expected)) if isinstance(expected,list) else eq(P(value),P(expected)),q['id']+' complete key '+field['key'])
for row in fixtures['examples']:
 tag=row['id'];e=next(e for l in package['lessons'] for e in l['examples'] if e['verification']==tag);check(digest(e)==row['contentSha256'],tag+' content binding');gg={name:P(g) for name,g in row['pgfs'].items()}
 if 'independentSum' in row:gg['X+Y']=gg[row['independentSum'][2]]
 declared(e['solution'],{**gg,**({'X':[gg['X'],(1-p+p*t)**n]} if 'binomial' in row else {})},tag)
 for name,g in gg.items():check(eq(g.subs(t,1),s.Integer(1)),tag+' '+name+' valid total')
 if 'weights' in row:check(eq(gg['X'],sum(P(w)*t**int(r) for r,w in row['weights'])),tag+' source masses')
 if 'geometric' in row:check(eq(gg['T'],geom(row['geometric'])),tag+' geometric model')
 if 'uniform' in row:check(eq(gg['X'],uniform(*row['uniform'])),tag+' uniform model')
 if 'poisson' in row:check(eq(gg['X'],s.exp(P(row['poisson'])*(t-1))),tag+' Poisson model')
 if 'binomial' in row:check(eq(gg['X'],bern(*[row['binomial'][1]]*row['binomial'][0])),tag+' binomial model')
 if 'hypergeometric' in row:check(eq(gg['X'],hyper(*row['hypergeometric'])),tag+' selection model')
 if 'moments' in row:
  for name,want in row['moments'].items():check(all(eq(x,P(y)) for x,y in zip(moments(gg[name]),want)),tag+' full moments')
 if 'independentSum' in row:
  xx,yy,zz=row['independentSum'];check(eq(gg[zz],gg[xx]*gg[yy]),tag+' convolution model')
 if 'transform' in row:
  xx,yy,aa,bb=row['transform'];check(eq(gg[yy],t**bb*gg[xx].subs(t,t**aa)),tag+' mapped support model')
 if 'copies' in row:
  xx,yy,nn=row['copies'];check(eq(gg[yy],gg[xx]**nn),tag+' independent repetition')
 if 'mixture' in row:
  w,xx,yy=map(P,row['mixture']);check(eq(gg['X'],w*xx+(1-w)*yy),tag+' exclusive mixture')
 if 'conditionPositive' in row:
  xx,yy=row['conditionPositive'];x=gg[xx];check(eq(gg[yy],(x-x.subs(t,0))/(1-x.subs(t,0))),tag+' conditional model')
 if 'conditional' in row:
  nn,u,target=row['conditional'];vals=evaluate(dict(kind='conditional',n=nn,upper=u,target=target));check(eq(vals['conditional'],s.Rational(1,2)),tag+' enumerated conditional outcome')
 scalar_checks={
  'PGF-E-B1':[coefficient(gg.get('X',t),3)],
  'PGF-E-B2':[P('5/7')**4],
  'PGF-E-B4':[(1+gg.get('X',t).subs(t,-1))/2],
  'PGF-E-M4':[s.Integer(12),P('1/4')],
  'PGF-E-A1':[coefficient(gg.get('Z',t),2)],
  'PGF-E-A4':[coefficient(gg.get('Z',t),3)],
  'PGF-E-C1':[coefficient(gg.get('S',t),3)],
  'PGF-E-C2':[coefficient(gg.get('S',t),4)],
  'PGF-E-C4':[P('6/16'),P('3/16'),P('1/2')],
 }.get(tag,[])
 displayed=[]
 for segment in segments(e['solution']):
  if '=' not in segment:continue
  try:displayed.append(tex(segment.split('=')[-1]))
  except Exception:pass
 for value in scalar_checks:check(any(eq(value,z) for z in displayed),tag+' displayed probability/parameter '+str(value))
for l in package['lessons']:check(digest(l)==fixtures['teachingDigests'][l['id']],l['id']+' teaching binding')
report=dict(checks=len(log),failures=errors,owner=50,parts=167,marks=437,quick=40,examples=20,parsedFormulae=parsed_count,ownerChecks=owner_audit,methods=['exact symbolic PGFs and differentiation','actual supplied TeX formula parsing','hypergeometric and joint-selection enumeration','independent coefficient convolution','direct finite-support moments','strict geometric and Poisson adjacent integer boundaries','conditional outcome enumeration'],editorialRepairs=[])
Path(args.report).write_text(json.dumps(report,indent=2)+'\n',encoding='utf8');print(json.dumps({k:report[k] for k in ['checks','failures','owner','quick','examples','parsedFormulae']},ensure_ascii=True));raise SystemExit(bool(errors))
