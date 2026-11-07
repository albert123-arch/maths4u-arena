"""Independent differentiation, branch, parameter, series and differential-equation audit."""
import argparse,hashlib,html,json,re
from functools import lru_cache
from pathlib import Path
import sympy as s
from sympy.parsing.latex import parse_latex
from sympy.core.function import AppliedUndef
ap=argparse.ArgumentParser();ap.add_argument('--source');ap.add_argument('--report',default='docs/ARENA-C5-FP2-DIFFERENTIATION-MATH-CHECKS-20261107.json');args=ap.parse_args()
x,y,z,a,b,k,c,p,h=s.symbols('x y z a b k c p h',real=True);t=s.Symbol('t',positive=True);u=s.Symbol('u',real=True);A,B=s.symbols('A B',real=True);loc={v.name:v for v in [x,y,z,a,b,k,c,p,h,t,u,A,B]};checks=[];failures=[];parsing=[];claimed=0;coverage={};active='structure'
def P(v):return s.sympify(v,locals=loc)
def digest(v):return hashlib.sha256(json.dumps(v,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()
def check(ok,label):
 checks.append(label);coverage[str(active)]=coverage.get(str(active),0)+1
 if not bool(ok):failures.append(label)
def equal(left,right):
 try:
  if left==right:return True
  residual=s.simplify(s.expand_trig(s.expand_func(s.trigsimp(left-right))))
  if residual==0:return True
  if not residual.free_symbols:return abs(complex(s.N(residual,55)))<1e-40
  return s.simplify(s.expand(residual.rewrite(s.exp)))==0 or s.simplify(s.expand_trig(left)-s.expand_trig(right))==0
 except (ValueError,TypeError,NotImplementedError):return False
def proof(expr,label):check(equal(expr,s.S.Zero),label)
def normalise_tex(text):
 text=text.replace(r'\tfrac',r'\frac').replace(r'\dfrac',r'\frac').replace(r'\left','').replace(r'\right','')
 def atom(i):
  while i<len(text) and text[i].isspace():i+=1
  if text[i]=='{':
   depth=1;j=i+1
   while depth:
    depth+=(text[j]=='{')-(text[j]=='}');j+=1
   return normalise_tex(text[i+1:j-1]),j
  if text[i]=='\\':
   m=re.match(r'\\[A-Za-z]+',text[i:]);return m[0],i+len(m[0])
  return text[i],i+1
 out='';i=0
 while i<len(text):
  if text.startswith(r'\frac',i):
   aa,j=atom(i+5);bb,i=atom(j);out+=r'\frac{'+aa+'}{'+bb+'}';continue
  if text.startswith(r'\sqrt',i):
   aa,i=atom(i+5);out+=r'\sqrt{'+aa+'}';continue
  if text.startswith(r'\ln',i):
   j=i+3
   while j<len(text) and text[j].isspace():j+=1
   digits=re.match(r'\d+(?:\.\d+)?',text[j:])
   if digits:out+=r'\ln{'+digits[0]+'}';i=j+len(digits[0]);continue
   if j<len(text) and text[j]=='(':
    depth=1;end=j+1
    while depth:
     depth+=(text[end]=='(')-(text[end]==')');end+=1
    out+=r'\ln{'+normalise_tex(text[j+1:end-1])+'}';i=end;continue
  out+=text[i];i+=1
 return out
def reciprocals(raw):
 pattern=r'\\operatorname\{(sech|cosech|coth)\}'
 while (m:=re.search(pattern,raw)):
  pos=m.end();power=''
  mm=re.match(r'\s*(\^\{?\d+\}?)',raw[pos:])
  if mm:power=mm[1];pos+=len(mm[0])
  while pos<len(raw) and raw[pos].isspace():pos+=1
  if raw[pos]=='(':
   depth=1;end=pos+1
   while depth:
    depth+=(raw[end]=='(')-(raw[end]==')');end+=1
   arg=raw[pos+1:end-1]
  else:
   mm=re.match(r'(?:\d+)?[xuzat]',raw[pos:])
   if not mm:raise ValueError('reciprocal argument')
   arg=mm[0];end=pos+len(arg)
  den={'sech':r'\cosh','cosech':r'\sinh','coth':r'\tanh'}[m[1]]
  raw=raw[:m.start()]+'('+r'\frac{1}{'+den+'('+arg+')}'+')'+power+raw[end:]
 return raw

def inverses(raw):
 values={};pattern=r'\\(sinh|cosh|tanh|sin|cos|tan)\s*\^\{-1\}'
 while (m:=re.search(pattern,raw)):
  pos=m.end()
  while pos<len(raw) and raw[pos].isspace():pos+=1
  if raw[pos] in '({':
   opening=raw[pos];closing=')' if opening=='(' else '}';depth=1;end=pos+1
   while depth:
    depth+=(raw[end]==opening)-(raw[end]==closing);end+=1
   arg=raw[pos+1:end-1]
  elif raw.startswith(r'\frac',pos) or raw.startswith(r'\sqrt',pos):
   raise ValueError('An inverse argument must be bracketed here')
  else:
   atom=re.match(r'(?:[0-9]+)?[a-z]',raw[pos:]);assert atom,raw;arg=atom[0];end=pos+len(atom[0])
  token='V_{'+str(len(values))+'}';fn={'sinh':s.asinh,'cosh':s.acosh,'tanh':s.atanh,'sin':s.asin,'cos':s.acos,'tan':s.atan}[m[1]]
  values[parse_latex(token)]=fn(tex(arg));raw=raw[:m.start()]+token+raw[end:]
 return raw,values
@lru_cache(None)
def tex(raw):
 raw=html.unescape(raw).strip().strip('.,; ');raw=normalise_tex(raw);raw=raw.replace(r'\,',r'\cdot ').replace('\\ ',' ').replace(r'\!','');raw,inverse_tokens=inverses(raw);raw=reciprocals(raw)
 raw=re.sub(r'(\^\{[^{}]+\}|\^\d)\s+(\d)',lambda m:m[1]+r'\cdot '+m[2],raw)
 raw=re.sub(r'(\\(?:sinh|cosh|tanh)(?:\^(?:\{[^}]+\}|\d+))?)\s*((?:\d+)?[xuzat])\b',lambda m:m[1]+'('+m[2]+')',raw)
 raw=re.sub(r'\\text\{[^}]*\}','',raw).strip().strip('.,; ')
 raw=raw.replace('[','(').replace(']',')')
 logs={};start=0
 while (pos:=raw.find(r'\ln{',start))>=0:
  depth=1;end=pos+4
  while depth:
   depth+=(raw[end]=='{')-(raw[end]=='}');end+=1
  token='Z_{'+str(len(logs))+'}';logs[parse_latex(token)]=s.log(tex(raw[pos+4:end-1]));raw=raw[:pos]+token+raw[end:];start=pos+len(token)
 raw=re.sub(r'\b([xuzat])\s*\(',lambda m:m[1]+r'\cdot (',raw)
 value=parse_latex(raw,strict=True).xreplace(logs).xreplace(inverse_tokens)
 for atom in value.atoms(AppliedUndef):
  if atom.func.__name__ in loc:value=value.xreplace({atom:loc[atom.func.__name__]*s.prod(atom.args)})
 return value.xreplace({v:s.E if v.name=='e' else s.pi if v.name=='pi' else loc.get(v.name,v) for v in value.free_symbols})
def blocks(raw):return [aa or bb for aa,bb in re.findall(r'\\\[(.*?)\\\]|\\\((.*?)\\\)',html.unescape(raw),re.S)]
def candidates(raw):
 result=[]
 for block in blocks(raw):
  block=re.sub(r'\\(?:begin|end)\{gathered\}','',block)
  block=re.sub(r'\\(?:begin|end)\{cases\}','',block)
  block=re.sub(r'\+?\s*O\([^)]*\)','',block)
  block=re.sub(r'\\\\\s*\\quad\s*(?=[+-])','',block)
  block=block.replace(r'\left','').replace(r'\right','')
  outer=block.strip()
  if outer.startswith('(') and outer.endswith(')'):outer=outer[1:-1]
  depth=0;start=0;pieces=[]
  for j,ch in enumerate(outer):
   if ch in '({[':depth+=1
   elif ch in ')}]':depth-=1
   elif ch==',' and depth==0 and (j==0 or outer[j-1]!='\\'):pieces.append(outer[start:j]);start=j+1
  if pieces:
   pieces.append(outer[start:])
   for piece in pieces:
    try:result.append(tex(piece.strip()))
    except Exception:pass
  for segment in re.split(r'\\\\|[,;]?\s*\\q(?:q)?uad\s*|[,;]\s*\\\s+|\s+\\text\{or\}\s*',block):
   segment=segment.split('&')[0]
   forbidden=[r'\begin{cases}',r'\mathbb',r'\infty',r'\cup',r'\setminus']
   if any(v in segment for v in forbidden):
    if '=' in segment:segment=segment.split('=')[-1]
    if any(v in segment for v in forbidden):continue
   # Both sides of a numeric/formula equality may contain a checked result.
   for piece in re.split(r'=|\\(?:le|ge|ne)(?![A-Za-z])|<|>',segment):
    piece=piece.strip().strip('.,; ')
    if not piece or piece in ['x','y','z','a','k','c','u','t']:continue
    plain=piece.replace(r'\left','').replace(r'\right','')
    if plain.startswith('(') and plain.endswith(')'):
     depth=0;start=1;parts=[]
     for j,ch in enumerate(plain):
      if ch in '({[':depth+=1
      elif ch in ')}]':depth-=1
      elif ch==',' and depth==1 and (j==0 or plain[j-1]!='\\'):parts.append(plain[start:j]);start=j+1
     if parts:parts.append(plain[start:-1])
    else:parts=[]
    variants=[piece.replace(r'\pm','+'),piece.replace(r'\pm','-')] if r'\pm' in piece else [piece]
    variants+=parts
    for v in variants:
     try:result.append(tex(v))
     except Exception:pass
 return result
def claim(raw,value,label):
 global claimed
 check(any(equal(z,value) for z in candidates(raw)),label);claimed+=1

def point_in_text(raw,xx,yy,label):
 text=html.unescape(raw).replace(r'\left','').replace(r'\right','');pairs=[]
 for aa,bb in re.findall(r'\(([^(),]+),([^(),]+)\)',text):
  try:pairs.append((tex(aa),tex(bb)))
  except Exception:pass
 check(any(equal(a,xx) and equal(b,yy) for a,b in pairs),label)
def root(expr,values,label):
 for index,value in enumerate(values):proof(expr.subs(x,value),label+' root '+str(index+1))
def identity(expr,label):check(equal(s.expand_trig(s.expand_func(expr)),s.S.Zero),label)

package=json.loads(Path('content/original/9231-fp2/differentiation-v1.json').read_text(encoding='utf8'));fixtures=json.loads(Path('content/original/9231-fp2/differentiation-verification-v1.json').read_text(encoding='utf8'))
source=[z['original'] for z in fixtures['owner']];qmap={z['bank_number']:z for z in source};qby={z['id']:z for z in package['questions']}
if args.source:
 data=Path(args.source);owner=json.loads(data.read_text(encoding='utf-8-sig'));check(hashlib.sha256(data.read_bytes()).hexdigest()==package['source']['sha256'],'read-only owner SHA');check(source==[q for l in owner['lessons'] for q in l['questions']],'every source field unchanged')
def set_active(i):
 global active
 active=i
def C(i,part,*values):
 set_active(i)
 for index,value in enumerate(values):claim(qmap[i]['parts'][part]['answer_html']+qmap[i]['parts'][part]['solution_html'],s.sympify(value),'owner '+str(i)+' part '+str(part+1)+' actual TeX claim '+str(index+1))
def eq(actual,expected,label):proof(actual-expected,label)
def implicit(F):
 first=s.cancel(-s.diff(F,x)/s.diff(F,y));second=s.cancel(-(s.diff(F,x,2)+2*s.diff(F,x,y)*first+s.diff(F,y,2)*first**2)/s.diff(F,y));return first,second
def parametric(X,Y):
 first=s.simplify(s.diff(Y,t)/s.diff(X,t));second=s.simplify(s.diff(first,t)/s.diff(X,t));return first,second
def first_block(i):return next(b for b in blocks(qmap[i]['stem_html']) if '=0' in b).split(',')[0]
def point_claims(i,F,point,parts=(0,1)):
 set_active(i);at={x:P(point[0]),y:P(point[1])};eq(F.subs(at),0,'owner '+str(i)+' point on actual branch');check(s.diff(F,y).subs(at)!=0,'owner '+str(i)+' regular branch denominator')
 first,second=implicit(F);C(i,parts[0],first.subs(at));C(i,parts[1],second.subs(at))
def series_poly(f,degree):return s.simplify(s.expand(s.series(f,x,0,degree+1).removeO()))
def polynomial_claim(i,part,polynomial):
 set_active(i);raw=qmap[i]['parts'][part]['answer_html'];found=[]
 for block in blocks(raw):
  clean=re.split(r'\+?\s*O\s*\(',block)[0].strip();clean=clean.split('=')[-1]
  try:found.append(tex(clean))
  except Exception:pass
 check(any(equal(z,polynomial) for z in found),'owner '+str(i)+' full supplied polynomial through requested order')

# Exact implicit branch models, independently reconstructed from the statements.
implicit_models={5:('x**3+3*x*y+2*y**3-9',[-1,2]),6:('3*y**3+(2*x+y)**4-4',[-1,1]),7:('2*y**2+3*log(x*y)-8',['1/2',2]),8:('3*y**2+y*(2*x-1)-10',[0,2]),9:('-3*x**3*y+2*x*y**3-1',[-1,1]),10:('2*y**2+(x*y-1)**3-9',[1,2]),14:('x**3+4*x*y+2*y**2-2',[0,-1]),20:('-2*x**2*y+y**3-1',[1,-1]),27:('x**2+2*x*y-3*y**2-9',[3,0]),28:('x*y+(x+2*y)**3-8',[2,0]),35:('2*x**2*y+3*x*y**2+8',[-1,2]),37:('x**3-2*x*y-4*y**3',[2,1]),42:('(x+2*y)*(x**2+y**2)-2',[0,1]),58:('4*y**2-5*asinh(x*y)-1+5*log(2)',['3/2','1/2'])}
for i,(raw,point) in implicit_models.items():
 set_active(i);F=P(raw);actual=tex(first_block(i).split('=')[0]);eq(actual,F,'owner '+str(i)+' actual statement model');point_claims(i,F,point)
for i,raw,point,p0 in [(4,'-3*x-4*y**2+(p+2*x)**3-4',[0,1],2),(33,'p**3+x**2+2*y**2-36',[1,-2],3)]:
 set_active(i);F=P(raw);eq(tex(first_block(i).split('=')[0]),F,'owner '+str(i)+' derivative-relation statement');at={x:point[0],y:point[1],p:p0};eq(F.subs(at),0,'owner '+str(i)+' initial derivative relation');q=-(s.diff(F,x)+s.diff(F,y)*p)/s.diff(F,p);C(i,0,p0);C(i,1,q.subs(at))
set_active(1);first=3/(2*s.cos(2*y));second=s.diff(first,y)*first;eq(second,2*first**2*s.tan(2*y),'owner 1 entire implicit derivative identity');C(1,0,2*p*p*s.tan(2*y));C(1,1,second.subs(y,s.pi/12))
set_active(11);first=s.cos(2*y)**2/2;second=s.diff(first,y)*first;eq(second,first**2*(-4*s.tan(2*y)),'owner 11 derivative identity');C(11,0,p*p*(4-4*x));C(11,1,second.subs(y,s.pi/8))

# Complete regular stationary sets of implicit curves, with all stated restrictions.
for i,raw in [(16,'(x+2*y)**2-9*y**2+36'),(18,'(2*x+y)**2-5*y**2+80'),(19,'x**3+3*x**2*y-2*y**3+2'),(32,'x**3-6*x*y+2*y**3')]:
 set_active(i);F=P(raw);solutions=s.solve([F,s.diff(F,x)],[x,y],dict=True);solutions=[r for r in solutions if all(z.is_real is not False for z in r.values())]
 if i==19:solutions=[r for r in solutions if r[x]!=0]
 if i==32:solutions=[r for r in solutions if r[x]>0 and r[y]>0]
 first,second=implicit(F);C(i,0,s.diff(F,x))
 for at in solutions:
  check(s.diff(F,y).subs(at)!=0,'owner '+str(i)+' regular stationary branch');C(i,1,at[x],at[y]);C(i,2,second.subs(at));check(second.subs(at)!=0,'owner '+str(i)+' decisive second derivative')
 check(len(solutions)==(1 if i in [19,32] else 2),'owner '+str(i)+' complete stationary count')
point_claims(17,(x-2*y)**2+9*y*y-36,[4,2]);C(17,2,2,4)

# Parametric derivatives are independently differentiated twice, never Y''/X''.
param_models={15:('3*cos(t)**3','5*sin(t)**3'),24:('6*t-3*sin(2*t)','2-2*cos(2*t)'),25:('-t**2+6*t','2-2*exp(-t)'),40:('4*sin(3*t)','2*cos(3*t)'),45:('tanh(t)**2+2*log(sech(t))','3+3*tanh(t)**4'),46:('t+exp(-t)','t-exp(-t)'),47:('2+3/t','asin(t)'),48:('2-2/t','t*exp(2*t)'),49:('t**(3/2)/3-3*sqrt(t)','2*t-1'),50:('-2*t+2*atan(t)','3*t+3*asinh(t)'),51:('cosh(t)','t+sinh(t)'),52:('t**2-2*log(t)','3*t+1'),53:('t+t**3/3','a*t**2+b*log(t)'),54:('2*sin(t)','3*sin(2*t)'),59:('2*atanh(t)','t*acosh(1/t)')}
for i,(xr,yr) in param_models.items():
 set_active(i);X,Y=P(xr),P(yr);first,second=parametric(X,Y)
 if i==15:C(i,0,first);C(i,1,second)
 if i==24:
  C(i,0,first,-s.pi,0,s.pi);C(i,1,second.subs(t,s.pi/6));eq(s.diff(X,t),12*s.sin(t)**2,'owner 24 all excluded parameters from X prime')
 if i==25:C(i,0,first,second);C(i,1,X.subs(t,2),Y.subs(t,2));eq(s.diff(first,t).subs(t,2),0,'owner 25 inflection candidate');check(second.subs(t,1)<0 and second.subs(t,s.Rational(5,2))>0,'owner 25 change of concavity')
 if i in [40,46,50]:
  at={40:s.pi/4,46:s.log(3),50:s.Rational(4,3)}[i];C(i,0,first.subs(t,at));C(i,1,second.subs(t,at))
 if i==45:
  C(i,1,first);at=s.log(2);eq(second.subs(t,at),-s.Rational(32,3),'owner 45 second-derivative condition');C(i,2,X.subs(t,at),Y.subs(t,at));
  vv=s.symbols('v',positive=True);eq(second,-6/s.sinh(t)**2,'owner 45 exact simplified curvature');check(s.solve(-6/vv-s.Rational(-32,3),vv)==[s.Rational(9,16)],'owner 45 unique positive sinh-squared value')
 if i in [47,48,51]:C(i,0,first);C(i,1,second)
 if i in [49,52]:
  critical=s.Integer(3) if i==49 else s.Integer(1);C(i,0,first,X.subs(t,critical),Y.subs(t,critical));C(i,1,second);eq(s.diff(X,t).subs(t,critical),0,'owner '+str(i)+' vertical tangent');check(s.diff(Y,t).subs(t,critical)!=0,'owner '+str(i)+' regular vertical tangent');check(second.subs(t,critical/2)>0 and second.subs(t,critical+s.Rational(1,2))<0,'owner '+str(i)+' exact concavity intervals')
 if i==53:
  eqs=[first.subs(t,1)-3,second.subs(t,1)+1];solution=s.solve(eqs,[a,b]);eq(solution[a],2,'owner 53 recovered a');eq(solution[b],2,'owner 53 recovered b');C(i,0,2);C(i,1,second.subs(solution));check(second.subs(solution).subs(t,1)<0,'owner 53 negative sample');num,den=s.fraction(s.factor(second.subs(solution)));check(all(co<0 for co in s.Poly(num,t).all_coeffs() if co!=0) and all(co>0 for co in s.Poly(den,t).all_coeffs() if co!=0),'owner 53 no inflection for every positive t')
 if i==54:
  C(i,0,first,second,s.pi/2)
  for at in [s.pi/4,3*s.pi/4]:C(i,1,X.subs(t,at),Y.subs(t,at));C(i,2,second.subs(t,at));check(s.diff(X,t).subs(t,at)!=0,'owner 54 regular stationary tangent')
 if i==59:C(i,1,-1/(t*s.sqrt(1-t*t)));C(i,2,first);C(i,3,second)

# Hyperbolic/inverse-function models, endpoint signs and parameter regimes.
set_active(3);f=s.sech(x)*s.tanh(x);C(3,0,s.diff(f,x));alpha=s.log(1+s.sqrt(2));
for at in [-alpha,alpha]:eq(s.diff(f,x).subs(x,at),0,'owner 3 stationary derivative');C(3,1,at,f.subs(x,at));check(s.sign(s.N(s.diff(f,x,2).subs(x,at),40))==(-1 if at>0 else 1),'owner 3 nature')
eq((u*(1-u))-s.Rational(1,4),-(u-s.Rational(1,2))**2,'owner 3 squared global bound with u=tanh squared')
set_active(12);f=s.asinh(2*x)-s.atan(2*x);C(12,0,s.diff(f,x));polynomial_claim(12,1,4*x**3/3);check(s.diff(f,x).subs(x,1)>0 and s.diff(f,x).subs(x,-1)>0,'owner 12 no extremum');eq(s.limit(s.diff(f,x,2)/x,x,0),8,'owner 12 change of concavity near zero')
set_active(21);f=x*s.acosh(x)-s.sqrt(x*x-1);C(21,0,s.acosh(x),1/s.sqrt(x*x-1));C(21,1,x*s.log(3)-s.Rational(4,3));eq(s.diff(f,x).subs(x,s.Rational(5,3)),s.log(3),'owner 21 tangent slope');eq((f-x*s.log(3)+s.Rational(4,3)).subs(x,s.Rational(5,3)),0,'owner 21 tangent passes through point');check(s.limit(f,x,1,dir='+')==0 and s.limit(s.diff(f,x),x,1,dir='+')==0 and s.limit(s.diff(f,x,2),x,1,dir='+')==s.oo,'owner 21 all right-hand limits')
set_active(22);f=s.cosh(2*x)-k*s.sinh(x);identity(f-(2*(s.sinh(x)-k/4)**2+1-k*k/8),'owner 22 exact global completed square');C(22,0,s.asinh(k/4));C(22,1,1-k*k/8)
for kval,count in [(0,0),(2*s.sqrt(2),1),(-2*s.sqrt(2),1),(3,2),(-3,2)]:
 roots=s.solve(2*u*u-kval*u+1,u);check(len(set(roots))==count if kval**2>=8 else all(r.is_real is False for r in roots),'owner 22 root regimes '+str(kval))
set_active(23);f=s.log(s.cosh(x))-k*x;C(23,0,s.tanh(x)-k,s.sech(x)**2);C(23,2,s.log(2),s.log(s.Rational(5,4))-3*s.log(2)/5);check(s.tanh(100)<1 and s.tanh(-100)>-1,'owner 23 unattained boundary');eq(s.tanh(s.log(2)),s.Rational(3,5),'owner 23 exact stationary value')
set_active(29);f=s.coth(x)-2*s.csch(x);C(29,0,s.diff(f,x));C(29,2,s.log(2+s.sqrt(3)));check(s.limit(f,x,0,dir='+')==-s.oo and s.limit(f,x,s.oo)==1,'owner 29 open monotone range');eq(f.subs(x,s.log(2+s.sqrt(3))),0,'owner 29 zero');identity(2*s.cosh(x)-1-(1+4*s.sinh(x/2)**2),'owner 29 positive derivative numerator as one plus a square')
set_active(30);F=x*x+2*x*y+4*y*y-4;point_claims(30,F,[0,1],(0,0));polynomial_claim(30,1,1-x/4-3*x*x/32)
for xx,yy in [(-2/s.sqrt(3),2/s.sqrt(3)),(2/s.sqrt(3),-2/s.sqrt(3))]:eq(F.subs({x:xx,y:yy}),0,'owner 30 horizontal point on curve');eq(s.diff(F,x).subs({x:xx,y:yy}),0,'owner 30 horizontal tangent');C(30,2,xx,yy)
for xx,yy in [(-4/s.sqrt(3),1/s.sqrt(3)),(4/s.sqrt(3),-1/s.sqrt(3))]:eq(F.subs({x:xx,y:yy}),0,'owner 30 vertical point on curve');eq(s.diff(F,y).subs({x:xx,y:yy}),0,'owner 30 vertical tangent');C(30,3,xx,yy)
set_active(31);kk=s.Symbol('K',positive=True);f=s.asinh(kk*x)-x;C(31,0,s.diff(f,x).subs(kk,k),s.diff(f,x,2).subs(kk,k));eq(s.limit((s.asinh(x)-x)/x**3,x,0),-s.Rational(1,6),'owner 31 boundary leading term');
for kval in [s.Rational(1,2),1,2]:
 check((kval<1 and kval-1<0) or kval>=1,'owner 31 separate k regimes');
 if kval>1:
  for at in [-s.sqrt(kval*kval-1)/kval,s.sqrt(kval*kval-1)/kval]:eq(s.diff(f,x).subs({kk:kval,x:at}),0,'owner 31 every stationary branch')
set_active(36);f=4*s.asin(x/2)+1;C(36,0,4,2,1);C(36,1,s.diff(f,x,2));C(36,2,1+2*s.pi/3+4/s.sqrt(3)*(x-1));eq(s.diff(f,x).subs(x,0),2,'owner 36 first derivative data');eq(s.diff(f,x,3).subs(x,0),s.Rational(1,2),'owner 36 third derivative data')
set_active(38);aa=s.Symbol('a',positive=True);f=s.log(1+aa*s.exp(x))-2*x/3;C(38,0,s.diff(f,x).subs(aa,a),s.diff(f,x,2).subs(aa,a));point=s.log(2/aa);eq(s.diff(f,x).subs(x,point),0,'owner 38 stationary equation');C(38,1,s.log(2/a),s.log(3)-2*s.log(2/a)/3);C(38,2,2/(3*s.sqrt(3)));eq((s.log(3)-2*s.log(2/aa)/3).subs(aa,2/(3*s.sqrt(3))),0,'owner 38 tangency parameter')
set_active(41);gplus=2*s.asinh(x/s.sqrt(2));gminus=-gplus;C(41,1,s.diff(gplus,x),s.diff(gminus,x),-2*s.Abs(x)/(x*x+2)**s.Rational(3,2));C(41,2,-s.sqrt(2),s.sqrt(2));eq(s.limit(gplus/x,x,0,dir='+'),s.sqrt(2),'owner 41 right derivative');eq(s.limit(gminus/x,x,0,dir='-'),-s.sqrt(2),'owner 41 left derivative');identity(s.cosh(gplus)-(1+x*x),'owner 41 principal inverse identity')
set_active(43);f=x*s.sech(k*x);C(43,0,s.diff(f,x));check(s.Rational(119,100)*s.tanh(s.Rational(119,100))<1 and s.Rational(6,5)*s.tanh(s.Rational(6,5))>1,'owner 43 certified root bracket');check(s.diff(u*s.tanh(u),u).subs(u,1)>0,'owner 43 positive derivative sample');check(s.diff(u*s.tanh(u),u)==u*(1-s.tanh(u)**2)+s.tanh(u),'owner 43 strictly positive summands for u>0')
set_active(55);f=-s.log(1-x*x)/2;C(55,0,f);C(55,1,s.diff(f,x),s.diff(f,x,2));polynomial_claim(55,2,series_poly(f,4));C(55,3,0);check(s.diff(f,x,2).subs(x,0)>0,'owner 55 convex origin')
set_active(56);X=t+s.log(t);Y=t*t-a*t+b*s.log(t);first,second=parametric(X,Y);sol=s.solve([first.subs(t,1),second.subs(t,1)],[a,b]);eq(sol[a],4,'owner 56 a');eq(sol[b],2,'owner 56 b');C(56,0,4,2);C(56,1,first.subs(sol),second.subs(sol));C(56,2,1,-3);check(second.subs(sol).subs(t,s.Rational(1,2))<0 and second.subs(sol).subs(t,2)>0,'owner 56 concavity change')
set_active(57);f=s.asin(s.tanh(2*x));identity(1-s.tanh(u)**2-s.sech(u)**2,'owner 57 identity from exponentials');eq(s.diff(f,x).subs(x,1),2*s.sech(2),'owner 57 positive-root derivative sample');C(57,1,2*s.sech(2*x));C(57,2,-s.Rational(48,25));eq(s.diff(2*s.sech(2*x),x).subs(x,s.log(2)/2),-s.Rational(48,25),'owner 57 exact second derivative')
set_active(61);f=s.exp(-a*x)*s.cosh(2*x);C(61,0,s.diff(f,x));C(61,2,s.log(2)/2,s.Rational(5,4)*2**(-s.Rational(3,5)),s.Rational(1,2));eq(s.diff(f,x).subs({a:s.Rational(6,5),x:s.log(2)/2}),0,'owner 61 minimum point');eq(s.limit(f.subs(a,2),x,s.oo),s.Rational(1,2),'owner 61 non-attained threshold limit')

# All Maclaurin polynomials are recalculated from the actual mathematical function.
series_models={63:(s.exp(2/(3-x)),2),64:(2*s.exp(2-x)+s.exp(3*x*x+2),2),66:(s.log(3-2*x)+s.log(x*x+4),2),67:(s.atanh(s.exp(2*x)/3),2),69:(-2*s.log(s.cos(x/2)),4),70:(s.log(s.exp(3*x)+2),2),71:(s.acosh(1/(x+s.Rational(3,5))),2),72:(s.exp(-2*x)*s.tan(3*x),2),73:(3**(2*x),2),74:(s.atanh(s.cos(2*x+s.pi/3)),2),75:(s.log(s.cosh(3*x)),4),76:(-s.cot(2*x+s.pi/3),2)}
for i,(f,degree) in series_models.items():
 set_active(i);part=1 if i in [69,71] else 2 if i in [73,74] else 0;polynomial=series_poly(f,degree);polynomial_claim(i,part,polynomial)
 # Compare every derivative-at-zero coefficient through the requested degree.
 for j in range(degree+1):eq(s.diff(f,x,j).subs(x,0),s.expand(polynomial).coeff(x,j)*s.factorial(j),'owner '+str(i)+' derivative/factorial coefficient '+str(j))
 if i==69:C(i,0,s.diff(f,x),s.diff(f,x,2));C(i,2,s.Rational(1,4))
 if i==71:C(i,0,-1/((x+s.Rational(3,5))*s.sqrt(1-(x+s.Rational(3,5))**2)))
 if i==73:C(i,0,s.diff(f,x));C(i,1,s.diff(f,x,2))
 if i==74:C(i,1,-2/s.sin(2*x+s.pi/3))
set_active(68);F=(2+x)*y+(1+2*x+y)**3-1;point_claims(68,F,[0,0]);polynomial=-6*x/5-18*x*x/125;polynomial_claim(68,2,polynomial);check(s.series(F.subs(y,polynomial),x,0,3).removeO()==0,'owner 68 polynomial substituted into original equation')
set_active(60);integrand=s.sqrt(s.cosh(2*t));polynomial=s.series(integrand,t,0,5).removeO();polynomial_claim(60,1,polynomial.subs(t,x).subs(x,t));C(60,2,s.integrate(2*polynomial,(t,0,s.Rational(1,4))));eq(4*s.sinh(t)**2+4*s.cosh(t)**2,4*s.cosh(2*t),'owner 60 speed squared')
set_active(65);f=s.asin(2*x);polynomial_claim(65,0,series_poly(f,3));C(65,1,series_poly(f,3).subs(x,s.Rational(1,10)));eq(s.diff(f,x),2/s.sqrt(1-4*x*x),'owner 65 integral is inverse-sine change')
set_active(77);f=s.sinh(2*x*x)+s.cosh(2*x*x);polynomial=series_poly(f,4);polynomial_claim(77,0,polynomial);C(77,1,s.diff(f,x,4).subs(x,0));C(77,2,s.integrate(polynomial,(x,0,s.Rational(1,4))))

# Seven later-topic ODE links: residuals, substitutions, initial conditions and branch choices.
ode_models={13:(A*s.exp(x**3)+B*s.exp(2*x**3)+s.exp(-x**3)/6,lambda z:s.diff(z,x,2)-(2/x+9*x*x)*s.diff(z,x)+18*x**4*z-9*x**4*s.exp(-x**3)),26:((A*s.exp(x)+B*s.exp(-2*x)-2*s.sin(x))/(x+1)**2,lambda z:(x+1)**2*s.diff(z,x,2)+((x+1)**2+4*(x+1))*s.diff(z,x)+(2+2*(x+1)-2*(x+1)**2)*z-6*s.sin(x)+2*s.cos(x)),39:(s.Rational(3,2)*(x+2)**3+1/(6*(x+2))-5*(x+2)**2/3,lambda z:(x+2)**2*s.diff(z,x,2)-(x+2)*s.diff(z,x)-3*z-5*(x+2)**2),44:(A*x*x+B*x**-3+2*x*x*s.log(x),lambda z:x*x*s.diff(z,x,2)+2*x*s.diff(z,x)-6*z-10*x*x)}
for i,(solution,residual) in ode_models.items():
 set_active(i);eq(residual(solution),0,'owner '+str(i)+' original ODE residual');C(i,2 if i in [13,39,44] else 1,solution)
 if i==39:eq(solution.subs(x,-1),0,'owner 39 first initial data');eq(s.diff(solution,x).subs(x,-1),1,'owner 39 derivative data');eq(s.limit(solution/x**3,x,s.oo),s.Rational(3,2),'owner 39 limiting ratio')
for i,w,coeff,rhs,at,w0,w1 in [(2,s.exp(-x)+(x-1)*s.exp(-2*x)/2,[4,4],s.exp(-x),0,s.Rational(1,2),s.Rational(1,2)),(34,x+6*s.exp(-x)-2*s.exp(-2*x),[3,2],2*x+3,0,4,-1),(62,s.exp(x)-s.exp(-x)+s.exp(-2*x),[3,2],6*s.exp(x),0,1,0)]:
 set_active(i);eq(s.diff(w,x,2)+coeff[0]*s.diff(w,x)+coeff[1]*w-rhs,0,'owner '+str(i)+' transformed linear residual');eq(w.subs(x,at),w0,'owner '+str(i)+' transformed initial value');eq(s.diff(w,x).subs(x,at),w1,'owner '+str(i)+' transformed initial derivative')
 if i==2:solution=s.asin(w);C(i,1,solution);C(i,2,-17*s.sqrt(3)/9);eq((s.diff(w,x,2)+w*s.diff(solution,x)**2).subs(x,0)/s.sqrt(3)*2,-17*s.sqrt(3)/9,'owner 2 second derivative recovered from sine chain')
 if i==34:solution=s.sqrt(w);C(i,1,solution);eq(solution.subs(x,0),2,'owner 34 positive initial branch');eq(s.diff(solution,x).subs(x,0),-s.Rational(1,4),'owner 34 initial gradient');eq(s.limit(w/x,x,s.oo),1,'owner 34 positive square-root asymptotic ratio');check(6-2*s.exp(-1)>0,'owner 34 positive exponential factor for x>=0')
 if i==62:solution=s.asinh(w);C(i,1,solution);C(i,2,2*s.sqrt(2));eq(s.diff(solution,x,2).subs(x,0),2*s.sqrt(2),'owner 62 recovered second derivative')

def quick_checks():
 for item in fixtures['quick']:
  set_active(item['uid']);q=qby[item['uid']];m=item['model'];kind=m['kind'];expected={};check(digest(q)==item['contentSha256'],'quick actual content hash '+item['uid'])
  if kind=='implicit_ratio':F=P(m['F']);expected=dict(gradient=implicit(F)[0])
  elif kind=='implicit_point':F=P(m['F']);at=dict(zip([x,y],map(P,m['point'])));pp,qq=implicit(F);expected=dict(first=pp.subs(at),second=qq.subs(at),tangent=at[y]+pp.subs(at)*(x-at[x]))
  elif kind=='derivative_relation':xx,yy=m['point'];pp=s.real_root(m['constant']-xx*xx-yy*yy,3);expected=dict(first=pp,second=-(2*xx+2*yy*pp)/(3*pp*pp))
  elif kind in ['parametric_ratio','parametric_point']:
   X,Y=P(m['X']),P(m['Y']);pp,qq=parametric(X,Y)
   if kind=='parametric_ratio':expected=dict(gradient=pp,second=qq)
   else:at=P(m['at']);expected=dict(x=X.subs(t,at),y=Y.subs(t,at),gradient=pp.subs(t,at),second=qq.subs(t,at))
  elif kind=='trig_point':X=m['a']*s.sin(t);Y=m['b']*s.cos(t);pp,qq=parametric(X,Y);expected=dict(gradient=pp.subs(t,s.pi/6),second=qq.subs(t,s.pi/6),normal=-1/pp.subs(t,s.pi/6))
  elif kind=='hyperbolic_power':power=m['power'];f=s.cosh(x)**power;first=s.diff(f,x);second=s.diff(f,x,2);expected=dict(first=power*c**(power-1)*h,second=power*power*c**power-power*(power-1)*c**(power-2));eq(first,expected['first'].subs({c:s.cosh(x),h:s.sinh(x)}),'quick first hyperbolic polynomial');eq(second,expected['second'].subs(c,s.cosh(x)),'quick second hyperbolic polynomial')
  elif kind=='inverse_sinh':aa,bb=m['a'],m['b'];f=s.asinh(aa*x+bb);R=1+(aa*x+bb)**2;expected=dict(numerator=aa,radicand=R,second=s.simplify(s.diff(f,x,2)*R**s.Rational(3,2)))
  elif kind=='inverse_tanh':aa,bb=m['a'],m['b'];f=s.atanh(aa*x+bb);expected=dict(gradient=s.diff(f,x),second=s.diff(f,x,2),domain=s.Interval.open(s.Rational(-1-bb,aa),s.Rational(1-bb,aa)))
  elif kind=='ellipse_stationary':aa,bb=m['a'],m['b'];F=(x-aa*y)**2+4*y*y-4*bb*bb;sol=s.solve([F,s.diff(F,x)],[x,y]);expected=dict(points=s.FiniteSet(*(s.Tuple(*v) for v in sol)),upper=-s.Rational(1,4*bb),lower=s.Rational(1,4*bb))
  elif kind=='convex_minimum':kk=P(m['k']);expected=dict(regime=s.Interval.open(-1,1),u=(1+kk)/(1-kk),second=1-kk*kk)
  elif kind=='cubic_stationary':aa=m['a'];f=x**3-3*aa*aa*x;roots=s.solve(s.diff(f,x),x);expected=dict(points=s.FiniteSet(*(s.Tuple(z,f.subs(x,z)) for z in roots)),second=6*aa)
  elif kind=='explicit_series':expected=dict(polynomial=series_poly(P(m['function']),m['degree']))
  elif kind=='even_series':f=s.log(s.cosh(m['a']*x));expected=dict(polynomial=series_poly(f,4),fourth=s.diff(f,x,4).subs(x,0))
  elif kind=='implicit_series':cc=m['constant'];F=(cc+x)*y+y*y-x;poly=sum(s.Symbol('d'+str(i))*x**i for i in range(1,4));sol=s.solve([s.expand(F.subs(y,poly)).coeff(x,i) for i in range(1,4)],sorted(poly.free_symbols-{x},key=str),dict=True)[0];expected=dict(polynomial=s.expand(poly.subs(sol)))
  elif kind=='log_substitution':f=s.log(1+m['a']*x+m['b']*x*x);expected=dict(first=s.diff(f,x).subs(x,0),second=s.diff(f,x,2).subs(x,0),polynomial=series_poly(f,2))
  elif kind=='log_independent':f=m['a']*s.log(x)**2+m['b']*s.log(x)+m['c'];expected=dict(gradient=s.diff(f,x).subs(s.log(x),u),second=s.diff(f,x,2).subs(s.log(x),u))
  elif kind=='integral_series':poly=series_poly(s.exp(m['a']*x*x),4);expected=dict(polynomial=poly,estimate=s.integrate(poly,(x,0,s.Rational(1,m['den']))))
  elif kind=='logic':expected=dict(reason=m['answer'])
  else:raise ValueError(kind)
  check(set(expected)=={f['key'] for f in q['fields']},'all quick fields '+q['id'])
  for field in q['fields']:
   raw=field['expected'];wanted=expected[field['key']]
   if field['type']=='choice':check(raw==wanted,'choice '+q['id'])
   elif field['type']=='ratio':eq(P(raw[0])/P(raw[1]),wanted,'whole ratio '+q['id']+' '+field['key'])
   elif field['type']=='set':ends=raw[1:-1].split(',');check(s.Interval(P(ends[0]),P(ends[1]),left_open=raw[0]=='(',right_open=raw[-1]==')')==wanted,'whole interval '+q['id'])
   elif field['type']=='pairs':actual=s.FiniteSet(*(s.Tuple(*(P(v) for v in row.strip('()').split(','))) for row in raw.split(';')));check(actual==wanted,'all coordinate pairs '+q['id'])
   else:eq(P(raw),wanted,'complete quick field '+q['id']+' '+field['key'])

def example_checks():
 for m in fixtures['examples']:
  set_active(m['id']);e=next(e for l in package['lessons'] for e in l['examples'] if e['verification']==m['id']);check(digest(e)==m['contentSha256'],'actual example hash '+m['id']);kind=m['kind']
  if kind=='implicit':F=P(m['F']);point=dict(zip([x,y],map(P,m['point'])));first,second=implicit(F);eq(F.subs(point),0,'example point');eq(first.subs(point),P(m['first']),'example first derivative');eq(second.subs(point),P(m['second']),'example second derivative');claim(e['solution'],P(m['first']),'actual first-derivative TeX');claim(e['solution'],P(m['second']),'actual second-derivative TeX')
  elif kind=='derivative_relation':F=P(m['F']);point=dict(zip([x,y],map(P,m['point'])));point[p]=P(m['first']);eq(F.subs(point),0,'example original p relation');eq((-(s.diff(F,x)+s.diff(F,y)*p)/s.diff(F,p)).subs(point),P(m['second']),'example second derivative')
  elif kind in ['parametric','parametric_point']:
   first,second=parametric(P(m['X']),P(m['Y']))
   if kind=='parametric_point':first=first.subs(t,P(m['at']));second=second.subs(t,P(m['at']))
   eq(first,P(m['first']),'example first parametric derivative');eq(second,P(m['second']),'example second parametric derivative');claim(e['solution'],P(m['first']),'actual parametric first TeX');claim(e['solution'],P(m['second']),'actual parametric second TeX')
   if m.get('at_second'):eq(second.subs(t,P(m['at'])),P(m['at_second']),'example specified second derivative')
  elif kind=='parametric_tangents':
   X,Y=P(m['X']),P(m['Y']);roots=s.Poly(s.diff(Y,t),t).real_roots();check(s.FiniteSet(*roots)==s.FiniteSet(*(P(z) for z in m['horizontal'])),'every horizontal parameter');first,second=parametric(X,Y)
   for at in roots:
    check(s.diff(X,t).subs(t,at)!=0,'example regular horizontal point');point_in_text(e['solution'],X.subs(t,at),Y.subs(t,at),'actual complete stationary coordinate pair')
    if m['id']=='FDIFF-E-G4':claim(e['solution'],second.subs(t,at),'actual curvature at each stationary point')
   for at in map(P,m['vertical']):eq(s.diff(X,t).subs(t,at),0,'example vertical parameter');check(s.diff(Y,t).subs(t,at)!=0,'example regular vertical tangent');point_in_text(e['solution'],X.subs(t,at),Y.subs(t,at),'actual complete vertical-tangent coordinate pair')
  elif kind=='function':f=P(m['f']);eq(s.diff(f,x),P(m['first']),'example entire first derivative');eq(s.diff(f,x,2),P(m['second']),'example entire second derivative');claim(e['solution'],P(m['first']),'actual function first TeX');claim(e['solution'],P(m['second']),'actual function second TeX '+m['id'])
  elif kind=='corner':identity(s.cosh(2*s.asinh(x))-(1+2*x*x),'example principal inverse identity');eq(s.diff(2*s.asinh(x),x).subs(x,0),2,'example right derivative');eq(s.diff(-2*s.asinh(x),x).subs(x,0),-2,'example left derivative')
  elif kind=='stationary_implicit':
   F=P(m['F']);sol=s.solve([F,s.diff(F,x)],[x,y]);check(s.FiniteSet(*(s.Tuple(*p) for p in sol))==s.FiniteSet(*(s.Tuple(*p) for p in m['points'])),'example all stationary pairs');second=implicit(F)[1]
   for point,value in zip(m['points'],m['seconds']):at=dict(zip([x,y],map(P,point)));eq(second.subs(at),P(value),'example exact stationary curvature');claim(e['solution'],P(value),'actual stationary curvature TeX')
  elif kind=='minimum':f=P(m['f']);at=P(m['at']);eq(s.diff(f,x).subs(x,at),0,'example stationary location');eq(f.subs(x,at),P(m['value']),'example exact minimum');check(s.diff(f,x,2).subs(x,at)>0,'example positive curvature');claim(e['solution'],at,'actual minimum location TeX');claim(e['solution'],P(m['value']),'actual minimum value TeX')
  elif kind=='inflection':f=P(m['f']);eq(s.diff(f,x).subs(x,0),0,'example stationary origin');check(s.diff(f,x,2).subs(x,-1)>0 and s.diff(f,x,2).subs(x,1)<0,'example concavity change');check(s.diff(f,x).subs(x,-1)<0 and s.diff(f,x).subs(x,1)<0,'example no extremum')
  elif kind=='series':f=P(m['f']);polynomial=series_poly(f,m['degree']);eq(polynomial,P(m['polynomial']),'example entire Maclaurin polynomial');claim(e['solution'],P(m['polynomial']),'actual example polynomial TeX')
  elif kind=='implicit_series':F=P(m['F']);polynomial=P(m['polynomial']);check(s.series(F.subs(y,polynomial),x,0,m['degree']+1).removeO()==0,'example whole branch series in original relation');check(s.diff(F,y).subs({x:0,y:0})!=0,'example smooth branch condition');claim(e['solution'],polynomial,'actual implicit series TeX')
  elif kind=='ode_exp':w=2*x+s.Rational(3,2)+s.exp(-2*x)/2;f=s.log(w);eq(s.diff(w,x,2)+2*s.diff(w,x),4,'example transformed ODE');eq((s.diff(f,x,2)+s.diff(f,x)**2+2*s.diff(f,x)-4*s.exp(-f)),0,'example original ODE');eq(f.subs(x,0),s.log(2),'example initial value');eq(s.diff(f,x).subs(x,0),s.Rational(1,2),'example initial derivative');claim(e['solution'],f,'actual recovered logarithm solution')
  elif kind=='ode_euler':f=2*x*x+x**-2;eq(x*x*s.diff(f,x,2)+x*s.diff(f,x)-4*f,0,'example original Euler residual');eq(f.subs(x,1),3,'example initial value');eq(s.diff(f,x).subs(x,1),2,'example initial derivative');claim(e['solution'],f,'actual Euler solution TeX')
  elif kind=='integral':polynomial=P(m['polynomial']);eq(series_poly(P(m['f']),4),polynomial,'example truncated integrand');eq(s.integrate(polynomial,(x,0,P(m['endpoint']))),P(m['answer']),'example exact polynomial integral');claim(e['solution'],P(m['answer']),'actual integral estimate TeX')
  else:raise ValueError(kind)

for fixture in fixtures['owner']:
 set_active(fixture['bank_number']);original=fixture['original'];q=qby[fixture['uid']];check(digest(q)==fixture['contentSha256'],'owner immutable content hash '+str(active));check(all(q[k]==original[k] for k in ['answer_html','solution_html','hint_html']),'owner help unchanged '+str(active));check(q['marks']==original['marks'],'owner marks unchanged '+str(active));check(all(part['prompt_html'] in q['prompt_html'] for part in original['parts']),'all owner prompts '+str(active));check([[c['description_html'] for c in p['marking_criteria']] for p in q['parts']]==[[c['criterion_html'] for c in p['marking_points']] for p in original['parts']],'owner criteria unchanged '+str(active));check(sum(c['marks'] for p in q['parts'] for c in p['marking_criteria'])==q['marks'],'rubric totals '+str(active))
set_active('structure');check(len(source)==77 and sum(len(q['parts']) for q in source)==189 and sum(q['marks'] for q in source)==684,'all owner counts');check(not package.get('assets'),'no archived old illustrations attached')
for lesson in package['lessons']:check(digest(lesson)==fixtures['teachingDigests'][lesson['id']],'actual teaching hash '+lesson['id'])
quick_checks();example_checks()
result=dict(checks=len(checks),failures=failures,owner=77,quick=48,examples=24,parsedClaims=claimed,ownerCoverage={str(i):coverage.get(str(i),0) for i in range(1,78)},checksLog=checks)
Path(args.report).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf8');print(json.dumps({k:v for k,v in result.items() if k not in ['checksLog','ownerCoverage']}));raise SystemExit(1 if failures else 0)
