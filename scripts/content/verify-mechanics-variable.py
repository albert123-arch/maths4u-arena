"""Independent variable dynamics, event-order and actual printed-answer audit."""
import argparse,hashlib,html,json,re
from functools import lru_cache
from pathlib import Path
import sympy as s
from sympy.parsing.latex import parse_latex
from sympy.core.function import AppliedUndef
ap=argparse.ArgumentParser();ap.add_argument('--source');ap.add_argument('--report',default='docs/ARENA-C5-MECHANICS-VARIABLE-MATH-CHECKS-20261107.json');args=ap.parse_args()
x,y,z,a,b,k,c,p,h=s.symbols('x y z a b k c p h',real=True);t=s.Symbol('t',positive=True);u=s.Symbol('u',real=True);A,B=s.symbols('A B',real=True);loc={v.name:v for v in [x,y,z,a,b,k,c,p,h,t,u,A,B]};checks=[];failures=[];parsing=[];claimed=0;coverage={};active='structure'
def P(v):return s.sympify(v,locals=loc)
def digest(v):return hashlib.sha256(json.dumps(v,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()
def check(ok,label):
 checks.append(label);coverage[str(active)]=coverage.get(str(active),0)+1
 if not bool(ok):failures.append(label);print('CHECK_FAILED '+label,flush=True)
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
  if text.startswith(r'\sqrt[',i):
   end=text.index(']',i+6);idx=text[i+6:end];aa,i=atom(end+1);out+='('+aa+')^{1/'+idx+'}';continue
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
  mm=re.match(r'\s*(\^(?:\{[^{}]+\}|[n0-9]))',raw[pos:])
  if mm:power=mm[1];pos+=len(mm[0])
  while pos<len(raw) and raw[pos].isspace():pos+=1
  if raw[pos] in '({':
   opening=raw[pos];closing=')' if opening=='(' else '}'
   depth=1;end=pos+1
   while depth:
    depth+=(raw[end]==opening)-(raw[end]==closing);end+=1
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
  elif raw.startswith(r'\frac',pos):
   end=pos+5
   for _ in range(2):
    while raw[end].isspace():end+=1
    assert raw[end]=='{',raw
    depth=1;end+=1
    while depth:
     depth+=(raw[end]=='{')-(raw[end]=='}');end+=1
   arg=raw[pos:end]
  elif raw.startswith(r'\sqrt',pos):
   end=pos+5
   while raw[end].isspace():end+=1
   assert raw[end]=='{',raw
   depth=1;end+=1
   while depth:
    depth+=(raw[end]=='{')-(raw[end]=='}');end+=1
   arg=raw[pos:end]
  else:
   atom=re.match(r'(?:[0-9]+)?[a-z]|[0-9]+',raw[pos:]);assert atom,raw;arg=atom[0];end=pos+len(atom[0])
  token='V_{'+str(len(values))+'}';fn={'sinh':s.asinh,'cosh':s.acosh,'tanh':s.atanh,'sin':s.asin,'cos':s.acos,'tan':s.atan}[m[1]]
  values[parse_latex(token)]=fn(tex(arg));raw=raw[:m.start()]+' '+token+' '+raw[end:]
 return raw,values
@lru_cache(None)
def tex(raw):
 raw=html.unescape(raw).strip().strip('.,; ');raw=normalise_tex(raw);raw=raw.replace(r'\,',r'\cdot ').replace('\\ ',' ').replace(r'\!','');raw,inverse_tokens=inverses(raw);raw=reciprocals(raw)
 raw=re.sub(r'(\\(?:sin|cos|tan))\s*(\\(?:alpha|beta))',lambda m:m[1]+'('+m[2]+')',raw)
 raw=re.sub(r'(\^\{[^{}]+\}|\^\d)\s+(\d)',lambda m:m[1]+r'\cdot '+m[2],raw)
 raw=re.sub(r'(\\(?:sinh|cosh|tanh)(?:\^(?:\{[^}]+\}|\d+))?)\s*((?:\d+)?[xuzat])\b',lambda m:m[1]+'('+m[2]+')',raw)
 raw=re.sub(r'(\\(?:sin|cos|tan|sec|csc|cot|sinh|cosh|tanh)(?:\^(?:\{[^}]+\}|[nm0-9]))?)\s*((?:(?:\d+|[nmkrj])\s*)?(?:[xut]|\\theta|\\phi))\b',lambda m:m[1]+'('+m[2]+')',raw)
 raw=re.sub(r'(\\(?:sin|cos|tan|sec|csc|cot|sinh|cosh|tanh)(?:\^(?:\{[^}]+\}|[nm0-9]))?)\s*(\{\([^()]*\)\}|\([^()]*\))',lambda m:'{'+m[1]+m[2].strip('{}')+'}',raw)
 raw=re.sub(r'\\text\{[^}]*\}','',raw).strip().strip('.,; ')
 raw=raw.replace('[','(').replace(']',')')
 logs={};start=0
 while (pos:=raw.find(r'\ln{',start))>=0:
  depth=1;end=pos+4
  while depth:
   depth+=(raw[end]=='{')-(raw[end]=='}');end+=1
  token='Z_{'+str(len(logs))+'}';logs[parse_latex(token)]=s.log(tex(raw[pos+4:end-1]));raw=raw[:pos]+' '+token+' '+raw[end:];start=pos+len(token)+2
 raw=re.sub(r'(\\(?:sin|cos|tan|sec|csc|cot|sinh|cosh|tanh)(?:\^(?:\{[^}]+\}|[nm0-9]))?)\s*(\{\([^()]*\)\}|\([^()]*\))',lambda m:'{'+m[1]+m[2].strip('{}')+'}',raw)
 raw=re.sub(r'(?<!\^)\b([xuzatn])\s*\(',lambda m:m[1]+r'\cdot (',raw)
 raw=re.sub(r'(Y_\{\d+\})\s*\(',lambda m:m[1]+r'\cdot (',raw)
 value=parse_latex(raw,strict=True).xreplace(logs).xreplace(inverse_tokens)
 for atom in value.atoms(AppliedUndef):
  if atom.func.__name__=='pi':value=value.xreplace({atom:s.pi*s.prod(atom.args)});continue
  if atom.func.__name__ in loc:value=value.xreplace({atom:loc[atom.func.__name__]*s.prod(atom.args)})
 return value.xreplace({v:s.E if v.name=='e' else s.pi if v.name=='pi' else loc.get(v.name,v) for v in value.free_symbols})
def blocks(raw):return [aa or bb for aa,bb in re.findall(r'\\\[(.*?)\\\]|\\\((.*?)\\\)',html.unescape(raw),re.S)]
def candidates(raw):
 raw=raw.replace(r'\to\infty','').replace(r'\to \infty','').replace(r'\longrightarrow','=').replace(r'\to','=');raw=re.sub(r'(?<=\d)\^(?:\{[+-]\}|[+-])','',raw)
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
   for piece in re.split(r'=|\\(?:leq|geq|le|ge|ne|lt|gt)(?![A-Za-z])|<|>',segment):
    piece=piece.strip().strip('.,; ')
    if not piece or piece in ['x','y','z','k','c','u','t']:continue
    plain=piece.replace(r'\left','').replace(r'\right','')
    if plain.startswith('(') and plain.endswith(')'):
     depth=0;start=1;parts=[]
     for j,ch in enumerate(plain):
      if ch in '({[':depth+=1
      elif ch in ')}]':depth-=1
      elif ch==',' and depth==1 and (j==0 or plain[j-1]!='\\'):parts.append(plain[start:j]);start=j+1
     if parts:parts.append(plain[start:-1])
    else:
     parts=[];depth=0;start=0
     for j,ch in enumerate(plain):
      if ch in '({[':depth+=1
      elif ch in ')}]':depth-=1
      elif ch==',' and depth==0:parts.append(plain[start:j]);start=j+1
     if parts:parts.append(plain[start:])
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

import mpmath as mp
mp.mp.dps=55
n,m,r,j=s.symbols('n m r j',integer=True);theta=x;phi,delta=s.symbols('phi delta',real=True)
loc.update(n=n,m=m,r=r,j=j,i=s.I,theta=x,phi=phi,delta=delta)

package=json.loads(Path('content/original/9231-mechanics/variable-v1.json').read_text(encoding='utf8'));fixtures=json.loads(Path('content/original/9231-mechanics/variable-verification-v1.json').read_text(encoding='utf8'))
source=[f['original'] for f in fixtures['owner']];qmap={q['bank_number']:q for q in source};qby={q['id']:q for q in package['questions']}
a,h,k,r,W,M,mm,g,lam,mu,q,d=s.symbols('a h k r W M m g lambda mu q d',positive=True);th=s.Symbol('theta',real=True);z=s.Symbol('z',real=True)
loc.update(a=a,h=h,k=k,r=r,W=W,M=M,m=mm,g=g,mu=mu,q=q,d=d,theta=th,z=z);loc['lambda']=lam
ell,omega,alpha,beta=s.symbols('l omega alpha beta',real=True);loc.update(l=ell,omega=omega,alpha=alpha,beta=beta)
S=s.sympify;R=s.Rational
def clean(raw):
 raw=raw.replace(r'\displaystyle','').replace(r'\textstyle','');raw=re.sub(r'\\mathrm\s+[A-Za-z]','',raw)
 while (pos:=raw.find(r'\mathrm{'))>=0:
  end=pos+8;depth=1
  while depth:depth+=(raw[end]=='{')-(raw[end]=='}');end+=1
  raw=raw[:pos]+raw[end:]
 raw=re.sub(r'\d+(?:\.\d+)?\^\\circ',lambda m:r'\frac{'+m[0].split('^')[0]+r'\pi}{180}',raw)
 raw=re.sub(r'\\(?:bigl|bigr|Bigl|Bigr|big|Big)\b','',raw)
 return re.sub(r'\\approx.*?(?=\\\)|\\\])','',raw).replace(r'\,',' ').replace('\\ ',' ')
def same(a,b):
 try:return s.simplify(s.trigsimp(s.expand(a-b)))==0
 except (ValueError,TypeError,NotImplementedError):return False
def exact(a,b,label):check(same(S(a),S(b)),label)
def contains(raw,value,label):
 global claimed
 value=s.simplify(S(value));found=False
 for item in candidates(clean(raw)):
  if item.free_symbols!=value.free_symbols:continue
  try:
   symbols=sorted(value.free_symbols,key=str)
   if all(abs(complex(s.N((item-value).subs({v:R(i+kk+3,kk+2) for i,v in enumerate(symbols)}),50)))<1e-32 for kk in range(3)):found=True;break
  except (ValueError,TypeError,ZeroDivisionError):pass
 check(found,label);claimed+=1

U,C0,P0,vv=s.symbols('U C P v',real=True);u=s.Symbol('u',positive=True);loc.update(U=U,C=C0,P=P0,v=vv,u=u)
part_coverage=set()
def C(number,value,part=0):
 part_coverage.add((number,part));contains(qmap[number]['parts'][part]['answer_html'],value,'printed owner '+str(number)+'/'+str(part+1)+' '+str(value))
def verbal(number,part,phrase,label):
 part_coverage.add((number,part));check(phrase.lower() in qmap[number]['parts'][part]['answer_html'].lower(),label)
def ode(V,acc,label='time ODE'):exact(s.diff(V,t),acc,label)
def trajectory(V,X,initialV,initialX=0):
 exact(s.diff(X,t),V,'trajectory derivative');exact(V.subs(t,0),initialV,'initial velocity');exact(X.subs(t,0),initialX,'initial position')
def spatial(V,acc):exact(s.simplify(V*s.diff(V,x)),acc,'signed spatial equation')
def square_spatial(W,acc):exact(s.diff(W,x)/2,acc,'squared-speed spatial equation')
for n in range(1,34):
 active=n;print('OWNER '+str(n),flush=True)
 if n==1:
  V=3*s.tan(s.pi/3-t/2);X=6*s.log(2*s.cos(s.pi/3-t/2));ode(V,-(V*V+9)/6);trajectory(V,X,3*s.sqrt(3));T0=4*s.pi/3;C(n,V);C(n,X);C(n,T0,1);exact(X.subs(t,T0),0,'first return position');exact(V.subs(t,2*s.pi/3),0,'turn before return');check(0<2*s.pi/3<T0,'turn and return distinct and ordered')
 elif n==2:
  V=(U+mu/k)*s.exp(-g*k*t)-mu/k;ode(V,-g*(k*V+mu));exact(V.subs(t,0),U,'general drag initial velocity');C(n,V);Vn=V.subs({U:12,mu:R(3,20),k:R(1,20),g:10});T0=2*s.log(5);Xn=24-6*s.log(5);C(n,T0,1);C(n,Xn,1);C(n,Xn/T0,2);exact(Vn.subs(t,T0),0,'linear drag plus friction first stop');exact(s.integrate(Vn,(t,0,T0)),Xn,'direct stopping-distance integral');check(abs(float(Xn/T0)-4.46)<.005,'average speed rounding to three significant figures')
 elif n==3:
  V=4/s.sqrt(1+4*t);X=2*(s.sqrt(1+4*t)-1);ode(V,-V**3/8);trajectory(V,X,4);C(n,V);C(n,X.subs(t,R(15,4)),1);verbal(n,1,'unbounded','distance grows without bound');exact(s.limit(V,t,s.oo),0,'cubic drag zero speed limit');check(s.limit(X,t,s.oo)==s.oo,'cubic drag divergent travel integral')
 elif n==4:
  X=2*(1+t)**6*s.exp(-2*t);V=s.diff(X,t);exact(V/X,(4-2*t)/(1+t),'displacement velocity quotient');trajectory(V,X,8,2);C(n,X);turn=S(2);force=s.simplify(3*s.diff(V,t).subs(t,turn));C(n,abs(force),1);C(n,turn,1);check(force<0,'turning force points towards O');verbal(n,1,'towards','force direction at rest');check(s.solve(s.factor(V/s.exp(-2*t)),t)==[2],'only nonnegative velocity zero')
 elif n==5:
  V=2+6/(2-s.exp(-t));X=2+2*t+3*s.log(2*s.exp(t)-1);ode(V,-(V-2)**2*s.exp(-t)/6);trajectory(V,X,8,2);C(n,V);C(n,X,1);verbal(n,2,'increases','positive velocity prevents reaching O');exact(s.limit(V,t,s.oo),5,'decaying-force velocity limit');check(V.subs(t,0)>5,'velocity starts above its positive limit');exact(V-5,3*s.exp(-t)/(2-s.exp(-t)),'positive excess over limit for t>=0')
 elif n==6:
  V=20+12*s.exp(-t/2);X=20*t+24*(1-s.exp(-t/2));ode(V,10-V/2);trajectory(V,X,32);C(n,V);C(n,X,1);T0=2*s.log(3);distance=s.simplify(X.subs(t,T0));C(n,distance,2);exact(V.subs(t,T0),24,'target capsule speed');check(0<distance<80,'target before ground contact');check(abs(float(distance)-59.9)<.05,'capsule distance rounding')
 elif n==7:
  V=20*(3*s.exp(t)+1)/(3*s.exp(t)-1);ode(V,10-V**2/40);exact(V.subs(t,0),40,'above-terminal initial speed');C(n,V);C(n,20,1);verbal(n,1,'slows down','above-terminal branch decreases');verbal(n,1,'finite','limit not attained at finite time');exact(V-20,40/(3*s.exp(t)-1),'positive finite-time excess above terminal');exact(s.limit(V,t,s.oo),20,'quadratic above-terminal limit')
 elif n==8:
  V=g/c*(1-s.exp(-c*t));ode(V,g-c*V);exact(V.subs(t,0),0,'linear falling initial rest');C(n,V);cn=R(2,3);C(n,cn,1);T0=s.log(3)/cn;X=15*t-R(45,2)*(1-s.exp(-cn*t));C(n,s.simplify(X.subs(t,T0)),1);exact(V.subs({g:10,c:cn,t:T0}),10,'calibrated drag target');exact(s.diff(X,t),V.subs({g:10,c:cn}),'calibrated falling trajectory')
 elif n==9:
  V=24/(2*t+1)**2;X=12*(1-1/(2*t+1));ode(V,-96/(2*t+1)**3);trajectory(V,X,24);C(n,X);C(n,12,1);verbal(n,1,'finite','limiting position not a finite event');exact(s.limit(X,t,s.oo),12,'finite total distance');exact(12-X,12/(2*t+1),'strict finite-time gap')
 elif n==10:
  V=6*(2*s.exp(12*t)-1)/(2*s.exp(12*t)+1);ode(V,36-V**2);exact(V.subs(t,0),2,'driven quadratic-drag initial velocity');C(n,V);T0=s.log(R(11,2))/12;C(n,T0,1);C(n,6,1);exact(V.subs(t,T0),5,'target below limit');exact(s.limit(V,t,s.oo),6,'driven limiting speed')
 elif n==11:
  W=6/(1+t)-2;V=W*W;exact(s.diff(V,t),-12*W/(1+t)**2,'sqrt resistance on nonnegative root branch');C(n,V);C(n,2,1);C(n,0,1);exact(W.subs(t,2),0,'first root zero');check(W.subs(t,3)<0,'reject squared algebraic restart after branch failure');verbal(n,1,'For','post-stop branch supplied')
 elif n==12:
  V=38*s.exp(-t/2)-20;X=76*(1-s.exp(-t/2))-20*t;ode(V,-10-V/2);trajectory(V,X,18);C(n,V);C(n,X,1);T0=2*s.log(R(19,10));H=s.simplify(X.subs(t,T0));C(n,H,2);exact(V.subs(t,T0),0,'linear-resistance ascent top');check(abs(float(H)-10.3)<.05,'height rounding to three significant figures')
 elif n==13:
  V=C0*t*s.exp(-t**3);ode(V,V*(1/t-3*t*t));C(n,V);F=4*mm*(1-3*t**3)*s.exp(1-t**3);C(n,F,1);exact((F/mm).subs(t,1),-8,'force calibration at t=1');exact(mm*s.diff(V,t).subs(C0,4*s.E),F,'calibrated general solution');exact(V.subs(C0,0),0,'rest solution retained')
 elif n==14:
  V=4*u-3*u*s.exp(-k*t);X=4*u*t-3*u/k*(1-s.exp(-k*t));ode(V,k*(4*u-V));trajectory(V,X,u);T0=s.log(3)/k;C(n,T0);C(n,s.simplify(X.subs(t,T0)),1);C(n,4*u,1);exact(V.subs(t,T0),3*u,'target fraction reached before limit');exact(s.limit(V,t,s.oo),4*u,'target strictly below limit')
 elif n==15:
  V=3*g/(5*k)*(1-s.exp(-k*t));ode(V,3*g/5-k*V);exact(V.subs(t,0),0,'inclined release from rest');C(n,V);C(n,s.limit(V,t,s.oo),1)
 elif n==16:
  W=16-2*x**3;square_spatial(W,-3*x*x);C(n,2);exact(W.subs(x,2),0,'first positive spatial stop');check(W.subs(x,1)>0 and -3*2**2<0,'reachable forward arc and nonzero acceleration at turn')
 elif n==17:
  W=u*u+2*k*(1/x-1/a);square_spatial(W,-k/x**2);exact(W.subs(x,a),u*u,'inverse-square initial speed');C(n,W);turn=2*a*k/(2*k-a*u*u);C(n,2*k/a,1);C(n,turn,1);C(n,s.sqrt(u*u-2*k/a),1);exact(s.factor(W.subs(x,turn)),0,'subcritical turning root');exact(s.limit(W,x,s.oo),u*u-2*k/a,'escape threshold and above-threshold limit');verbal(n,1,'equality','escape equality case retained')
 elif n==18:
  W=4/(x+1)**2;square_spatial(W,-4/(x+1)**3);exact(W.subs(x,0),4,'initial energy');C(n,1);exact(W.subs(x,1),1,'quarter initial kinetic energy');check(s.limit(W,x,s.oo)==0,'speed zero only at infinite position')
 elif n==19:
  W=s.sqrt(u)-k*t/2;V=W*W;exact(s.diff(V,t),-k*W,'square-root resistance valid before first stop');C(n,V);u0=S(9);k0=R(3,2);T0=2*s.sqrt(u0)/k0;C(n,u0,1);C(n,k0,1);exact(T0,4,'calibrated stopping time');exact(s.integrate(V.subs({u:u0,k:k0}),(t,0,T0)),12,'calibrated stopping distance');half=T0*(1-1/s.sqrt(2));C(n,half,2);exact(V.subs({u:u0,k:k0,t:half}),u0/2,'first half-speed event');check(0<half<T0,'half speed before first stop')
 elif n==20:
  b0=s.log(2);A0=8*b0;V=4+8*s.exp(-b0*t);X=4*t+8/b0*(1-s.exp(-b0*t));ode(V,-A0*s.exp(-b0*t));trajectory(V,X,12);C(n,b0);C(n,A0);C(n,s.simplify(X.subs(t,2)),1);exact(V.subs(t,1),8,'first observed speed');exact(V.subs(t,2),6,'second observed speed');check(V.subs(t,2)>0,'distance equals displacement on observation interval')
 elif n==21:
  V=24/(t+2);X=24*s.log((t+2)/2);ode(V,-V*V/24);trajectory(V,X,12);C(n,12);C(n,R(1,24));C(n,X.subs(t,6),1);C(n,V,2);verbal(n,2,'No','quadratic drag has no finite stop');exact(V.subs(t,2),6,'first calibration reading');exact(V.subs(t,6),3,'second reading and quarter initial speed')
 elif n==22:
  V=6+2*t-t*t;X=6*t+t*t-t**3/3;ode(V,2*(1-t));trajectory(V,X,6);C(n,V);C(n,X);turn=1+s.sqrt(7);distance=s.simplify(2*X.subs(t,turn)-X.subs(t,4));C(n,distance,1);returnT=s.simplify(4-X.subs(t,4)/V.subs(t,4));C(n,returnT,2);work=s.integrate(4*(1-t)*V,(t,0,4));C(n,work,3);exact(work,V.subs(t,4)**2-36,'resultant work equals kinetic-energy change');check(0<turn<4<returnT,'turn then cutoff then actual return');exact(X.subs(t,6),0,'old cubic return lies outside active-force interval');check(6>4,'reject extending old law to its algebraic return')
 elif n==23:
  W=225*(2*s.exp(-4*x/45)-1);Vx=s.sqrt(W);square_spatial(W,-10-2*W/45);C(n,Vx);H=R(45,4)*s.log(2);C(n,H);V=15*s.tan(s.pi/4-2*t/3);ode(V,-10-2*V*V/45);exact(V.subs(t,0),15,'quadratic ascent launch speed');C(n,V,1);T0=3*s.pi/8;C(n,T0,1);exact(V.subs(t,T0),0,'ascent time upper endpoint');exact(W.subs(x,H),0,'ascent height upper endpoint');X=R(45,2)*s.log(s.cos(s.pi/4-2*t/3)/s.cos(s.pi/4));exact(s.diff(X,t),V,'consistent ascent time and position models');exact(X.subs(t,T0),H,'time top equals spatial top')
 elif n==24:
  Vx=2*x*x+3;spatial(Vx,8*x**3+12*x);C(n,Vx);X=s.sqrt(R(3,2))*s.tan(s.sqrt(6)*t);exact(s.diff(X,t),Vx.subs(x,X),'outward trajectory derivative');exact(X.subs(t,0),0,'outward initial position');C(n,X,1);bound=s.pi/(2*s.sqrt(6));C(n,bound,1);check(s.limit(X,t,bound,dir='-')==s.oo,'first finite-time pole');check(r'\lt' in qmap[n]['parts'][1]['answer_html'],'pole endpoint excluded')
 elif n==25:
  H=s.log(5)/(2*k);Wup=(5*g/k)*s.exp(-2*k*x)-g/k;square_spatial(Wup,-g-k*Wup);C(n,H);Wdown=g/k*(1-s.exp(-2*k*x));square_spatial(Wdown,g-k*Wdown);return2=s.simplify(Wdown.subs(x,H));C(n,s.sqrt(return2),1);verbal(n,1,'negative work','resistance dissipates on both legs');exact(Wup.subs(x,H),0,'round-trip top reached');check(s.simplify(4*g/k-return2)>0,'return speed smaller than launch')
 elif n==26:
  V=30*(s.exp(2*t/3)-1)/(s.exp(2*t/3)+1);W=900*(1-s.exp(-x/45));ode(V,10-V*V/90);exact(V.subs(t,0),0,'quadratic falling initial rest');square_spatial(W,10-W/90);C(n,V);C(n,W,1);T0=R(3,2)*s.log(3);distance=45*s.log(R(4,3));C(n,T0,2);C(n,distance,2);exact(V.subs(t,T0),15,'half terminal speed by time');exact(W.subs(x,distance),225,'half terminal speed by position')
 elif n==27:
  Vx=3*(4-x)/(x+2);spatial(Vx,54/(x+2)**2-324/(x+2)**3);exact(Vx.subs(x,0),6,'initial forward rational velocity');C(n,Vx);Tx=-x/3-2*s.log((4-x)/4);C(n,Tx,1);exact(s.diff(Tx,x),1/Vx,'inverse trajectory derivative');exact(Tx.subs(x,0),0,'time origin');check(s.limit(Tx,x,4,dir='-')==s.oo,'inaccessible rest point');verbal(n,1,'No','no finite arrival at x=4')
 elif n==28:
  Vx=(x+3)**2-4;exact(s.diff(Vx,x),2*(x+3),'positive sqrt branch of spatial equation');exact(Vx.subs(x,1),12,'mixed law launch');C(n,Vx);X=(5*s.exp(4*t)-3)/(3-s.exp(4*t));exact(s.diff(X,t),Vx.subs(x,X),'mixed law time solution');C(n,X,1);bound=s.log(3)/4;C(n,bound,1);check(s.limit(X,t,bound,dir='-')==s.oo,'mixed law finite-time divergence');check(r'\lt' in qmap[n]['parts'][1]['answer_html'],'mixed law singular endpoint excluded')
 elif n==29:
  Vx=3+2*s.exp(-x);spatial(Vx,-(4*s.exp(-x)+6)*s.exp(-x));C(n,Vx);X=s.log((5*s.exp(3*t)-2)/3);exact(s.diff(X,t),Vx.subs(x,X),'exponential spatial resistance trajectory');exact(X.subs(t,0),0,'initial position in logarithmic trajectory');C(n,X,1);exact(s.limit(Vx,x,s.oo),3,'positive limiting velocity despite resistance')
 elif n==30:
  W=216-189*s.exp(-3*x/4);exact(s.diff(W,x),3*(54-W/4),'constant-power cubic-speed equation');exact(W.subs(x,0),27,'constant-power initial speed cube');C(n,W**R(1,3));C(n,6,1);C(n,108,1);exact(s.limit(W,x,s.oo),216,'constant-power limiting cube');check(W.subs(x,0)>0,'constant-power positive-speed branch')
 elif n==31:
  Vx=-3*(x*x-4)/x;spatial(Vx,9*x-144/x**3);exact(Vx.subs(x,6),-16,'negative initial velocity branch');C(n,Vx);X=s.sqrt(4+32*s.exp(-6*t));exact(s.diff(X,t),Vx.subs(x,X),'leftward time trajectory');C(n,X,1);C(n,2,2);C(n,0,2);verbal(n,2,'no finite','no finite-time reversal');exact(s.limit(X,t,s.oo),2,'position approached from right');exact(X*X-4,32*s.exp(-6*t),'strict positive finite-time position gap')
 elif n==32:
  Vx=12*(2-x)/x;spatial(Vx,288/x**2-576/x**3);exact(Vx.subs(x,4),-6,'implicit trajectory launch');C(n,Vx);Tx=(4-x)/12-s.log((x-2)/2)/6;exact(s.diff(Tx,x),1/Vx,'implicit time derivative');exact(Tx.subs(x,4),0,'implicit time origin');exact(s.exp(-6*Tx),(x-2)/2*s.exp((x-4)/2),'implicit exponential relation');C(n,2,1);C(n,4,1);check(s.limit(Tx,x,2,dir='+')==s.oo,'implicit limiting point not attained');C(n,s.simplify(Tx.subs(x,3)),2)
 elif n==33:
  C(n,s.log(3)/k);C(n,k*u**3,1);verbal(n,1,'never reaches','equality target only approached');X0=s.log(3)/k;W=P0/k+(u**3/27-P0/k)*s.exp(-3*k*(x-X0));exact(s.diff(W,x),3*(P0-k*W),'post-switch constant-power cubic ODE');exact(W.subs(x,X0),u**3/27,'post-switch initial speed cube');total=s.log((27*P0-k*u**3)/(P0-k*u**3))/(3*k);C(n,total,2);C(n,s.log(53)/(3*k),2);exact(27*(P0-k*u**3/27)/(P0-k*u**3),(27*P0-k*u**3)/(P0-k*u**3),'combining pre-switch and post-switch distances');exact(s.simplify(total.subs(P0,2*k*u**3)),s.log(53)/(3*k),'specified power simplification');check(s.simplify(total.subs({P0:2,k:1,u:1}))>X0.subs(k,1),'strictly positive post-switch travel for reachable target')

def calculated(data):
 d={key:(P(value) if isinstance(value,(str,int)) and key not in ['kind','answer'] else value) for key,value in data.items()};kind=d['kind']
 if kind=='time_poly':
  acc=d['A']-d['B']*t;V=d['u']+s.integrate(acc,t)-s.integrate(acc,t).subs(t,0);X=s.integrate(V,t)-s.integrate(V,t).subs(t,0);ode(V,acc);trajectory(V,X,d['u']);return dict(velocity=s.expand(V),position=s.expand(X),force=d['mass']*acc.subs(t,1))
 if kind=='time_decay':
  V=d['p']/(2*(1+t)**2);X=d['p']*t/(2*(1+t));ode(V,-d['p']/(1+t)**3);trajectory(V,X,d['p']/2);return dict(velocity=V,position=X,limit=s.limit(X,t,s.oo),speed=V.subs(t,1))
 if kind=='x_ratio':
  X=d['x0']*(1+t)**d['q'];V=s.diff(X,t);exact(V/X,d['q']/(1+t),'separated displacement equation');exact(X.subs(t,0),d['x0'],'nonzero displacement initial condition');return dict(position=s.expand(X),velocity=s.expand(V),force=d['mass']*s.diff(V,t).subs(t,1))
 if kind=='position_poly':
  W=d['u2']-2*d['c']*x**3/3;turn=s.real_root(3*d['u2']/(2*d['c']),3);square_spatial(W,-d['c']*x*x);exact(W.subs(x,turn),0,'first spatial turning root');return dict(velocity2=s.expand(W),turn=turn,acceleration=-d['c']*turn*turn)
 if kind=='inverse_square':
  A=d['u2']-2*d['k']/d['start'];B=2*d['k'];turn=-B/A;check(A<0 and turn>d['start'],'subcritical finite outward turn');square_spatial(A+B/x,-d['k']/x**2);return dict(A=A,B=B,turn=turn,acceleration=-d['k']/turn**2)
 if kind=='position_limit':
  Vx=-d['c']*(x-d['b']);X=d['b']+(d['start']-d['b'])*s.exp(-d['c']*t);exact(s.diff(X,t),Vx.subs(x,X),'full exponential trajectory from signed velocity');check(Vx.subs(x,d['start'])<0,'initial motion leftwards');exact(X-d['b'],(d['start']-d['b'])*s.exp(-d['c']*t),'strict finite-time gap above limiting point');return dict(velocity=s.expand(Vx),A=d['b'],B=d['start']-d['b'],C=d['c'],acceleration=d['c']**2*(d['start']-d['b']))
 if kind=='quadratic_drag':
  A=d['u'];B=d['k']*A;C=1/d['k'];V=A/(1+B*t);X=C*s.log(1+B*t);ode(V,-d['k']*V*V);trajectory(V,X,A);time=1/B;exact(V.subs(t,time),A/2,'first half-speed time');return dict(A=A,B=B,C=C,time=time)
 if kind=='sqrt_stop':
  root=s.sqrt(d['u'])-d['k']*t/2;V=root**2;stop=2*s.sqrt(d['u'])/d['k'];distance=s.integrate(V,(t,0,stop));exact(s.diff(V,t),-d['k']*root,'original sqrt law on nonnegative-root interval');exact(root.subs(t,stop),0,'first root zero');check(root.subs(t,2*stop)<0,'reject post-stop squared restart');return dict(velocity=s.expand(V),stop=stop,distance=distance,interval='[0,'+str(stop)+']',later=S(0))
 if kind=='up_linear':
  L=d['g']/d['c'];A=d['u']+L;B=-L;V=A*s.exp(-d['c']*t)+B;X=A/d['c']*(1-s.exp(-d['c']*t))+B*t;ode(V,-d['g']-d['c']*V);trajectory(V,X,d['u']);check(d['u']==L,'specified template uses half exponential at top');K=1/d['c'];R0=d['u']/d['c'];S0=-R0;exact(V.subs(t,K*s.log(2)),0,'top event reconstructed');exact(X.subs(t,K*s.log(2)),R0+S0*s.log(2),'full height reconstructed');return dict(A=A,B=B,K=K,R=R0,S=S0)
 if kind=='linear_limit':
  L=d['A']/d['c'];B=-L;D0=-L/d['c'];V=L+B*s.exp(-d['c']*t);X=L*t+D0*(1-s.exp(-d['c']*t));ode(V,d['A']-d['c']*V);trajectory(V,X,0);K=1/d['c'];exact(V.subs(t,K*s.log(2)),L/2,'half-limit event');return dict(L=L,B=B,D=D0,K=K,acceleration=d['A'])
 if kind=='above_limit':
  L=d['drive']/d['c'];B=d['u']-L;V=L+B*s.exp(-d['c']*t);X=L*t+B/d['c']*(1-s.exp(-d['c']*t));ode(V,d['drive']-d['c']*V);trajectory(V,X,d['u']);check(B>0 and d['target']==L+B/2,'above-limit target on decreasing branch');K=1/d['c'];R0=L/d['c'];S0=B/(2*d['c']);exact(V.subs(t,K*s.log(2)),d['target'],'specified above-limit target');exact(X.subs(t,K*s.log(2)),R0*s.log(2)+S0,'complete target displacement');return dict(A=L,B=B,K=K,R=R0,S=S0)
 if kind=='constant_power':
  Pn=d['k']*d['limit']**3;A=Pn/d['k'];B=d['u']**3-A;C=3*d['k'];W=A+B*s.exp(-C*x);exact(s.diff(W,x),3*(Pn-d['k']*W),'complete cubic-speed ODE');exact(W.subs(x,0),d['u']**3,'constant-power launch cube');check(B<0,'target trajectory approaches limit from below');return dict(A=A,B=B,C=C,limit=s.real_root(A,3),power=d['mass']*Pn)
 raise ValueError(kind)
for item in fixtures['quick']:
 active=item['uid'];question=qby[active];fields={f['key']:f for f in question['fields']};data=item['model'];check(digest(question)==item['contentSha256'],'quick fingerprint '+active)
 if data['kind']=='logic':check(fields['reason']['expected']==data['answer'],'reviewed physical principle '+active);continue
 values=calculated(data);check(set(values)==set(fields),'every full-answer field recomputed '+active)
 for field,value in values.items():
  if fields[field]['type']=='set':check(fields[field]['expected']==value,'full validity interval '+active);continue
  expected=fields[field]['expected'];key=P(expected[0])/P(expected[1]) if fields[field]['type']=='ratio' else P(expected)
  exact(key,value,'whole answer '+active+' '+field);contains(question['answer_html'],value,'actual printed quick '+active+' '+field)

for data in fixtures['examples']:
 active=data['id'];example=next(e for l in package['lessons'] for e in l['examples'] if e['verification']==active);check(digest(example)==data['contentSha256'],'example fingerprint '+active);kind=data['kind']
 if kind=='time_poly':
  acc=P(data['force'])/P(data['mass']);V=P(data['u'])+s.integrate(acc,t);X=P(data['x0'])+s.integrate(V,t);ode(V,acc);trajectory(V,X,P(data['u']),P(data['x0']));turn=next(v for v in s.solve(V,t) if v>=0);values=[V,X,turn]
 elif kind=='x_ratio':
  X=P(data['x']);V=s.diff(X,t);exact(V/X,P(data['rate']),'example displacement quotient');exact(X.subs(t,0),P(data['x0']),'example quotient initial state');force=P(data['mass'])*s.diff(V,t);exact(force,P(data['force']),'example recovered force');values=[X,V,force]
 elif kind=='time_decay':
  d=calculated(dict(kind=kind,p=data['p']));values=[d['velocity'],d['position'],d['limit']];exact(d['velocity'].subs(t,0),P(data['u']),'example initial decay speed')
 elif kind=='time_switch':
  mass=P(data['mass']);cut=P(data['cutoff']);V=P(data['u'])+s.integrate(P(data['force'])/mass,t);X=s.integrate(V,t);turn=next(v for v in s.solve(V,t) if 0<v<cut);distance=2*X.subs(t,turn)-X.subs(t,cut);returnTime=cut-X.subs(t,cut)/V.subs(t,cut);work=s.integrate(P(data['force'])*V,(t,0,cut));values=[V,X,turn,distance,returnTime,work];check(V.subs(t,cut)<0 and X.subs(t,cut)>0,'example return occurs after force cutoff');exact(work,mass*(V.subs(t,cut)**2-P(data['u'])**2)/2,'example work direct integral')
 elif kind=='position_poly':
  c0=P(data['coefficient']);W=P(data['u2'])-2*c0*x**3/3;square_spatial(W,-c0*x*x);turn=s.real_root(3*P(data['u2'])/(2*c0),3);values=[s.sqrt(W),turn]
 elif kind=='inverse_square':
  start=P(data['initialX']);k0=P(data['k']);W=P(data['u2'])+2*k0*(1/x-1/start);square_spatial(W,-k0/x**2);turn=s.solve(W,x)[0];values=[W,turn];check(turn>start,'example inverse-square upper turn')
 elif kind=='position_limit':
  Vx=P(data['v']);acc=Vx*s.diff(Vx,x);X=P(data['trajectory']);exact(s.diff(X,t),Vx.subs(x,X),'example asymptotic trajectory');exact(X.subs(t,0),P(data['x0']),'example asymptotic initial position');values=[acc,X];exact(s.limit(X,t,s.oo),P(data['b']),'example limiting position')
 elif kind=='position_blowup':
  Vx=P(data['v']);spatial(Vx,P(data['acceleration']));exact(Vx.subs(x,0)**2,P(data['u2']),'example outward initial speed');X=P(data['trajectory']);exact(s.diff(X,t),Vx.subs(x,X),'example blowup trajectory');bound=P(data['bound']);check(s.limit(X,t,bound,dir='-')==s.oo,'example first finite pole');values=[Vx,X,bound]
 elif kind=='linear_stop':
  A=P(data['A']);B=P(data['B']);V=(P(data['u'])+A)*s.exp(-B*t)-A;X=(P(data['u'])+A)/B*(1-s.exp(-B*t))-A*t;T0=s.log((P(data['u'])+A)/A)/B;ode(V,-B*(V+A));trajectory(V,X,P(data['u']));values=[V,X,T0,s.simplify(X.subs(t,T0))]
 elif kind=='sqrt_stop':
  d=calculated(dict(kind=kind,u=data['u'],k=data['k']));values=[d['velocity'],d['stop'],d['distance']]
 elif kind=='up_linear':
  g0=P(data['g']);c0=P(data['c']);u0=P(data['u']);L=g0/c0;V=(u0+L)*s.exp(-c0*t)-L;X=(u0+L)/c0*(1-s.exp(-c0*t))-L*t;T0=s.log((u0+L)/L)/c0;ode(V,-g0-c0*V);trajectory(V,X,u0);values=[V,X,T0,s.simplify(X.subs(t,T0))]
 elif kind=='quadratic_roundtrip':
  initial=P(data['initial2']);Wup=(initial+g/k)*s.exp(-2*k*x)-g/k;square_spatial(Wup,-g-k*Wup);H=s.log(1+k*initial/g)/(2*k);Wdown=g/k*(1-s.exp(-2*k*x));square_spatial(Wdown,g-k*Wdown);return2=s.simplify(Wdown.subs(x,H));values=[H,s.sqrt(return2)];check(s.simplify(initial-return2)>0,'example resistive return loses mechanical energy')
 elif kind=='linear_limit':
  A=P(data['A']);c0=P(data['c']);u0=P(data['u']);L=A/c0;V=L+(u0-L)*s.exp(-c0*t);X=L*t+(u0-L)/c0*(1-s.exp(-c0*t));T0=s.log((L-u0)/(L-P(data['target'])))/c0;ode(V,A-c0*V);trajectory(V,X,u0);values=[V,X,T0,s.simplify(X.subs(t,T0)),L];check(u0<P(data['target'])<L,'example target strictly below limit')
 elif kind=='quadratic_limit':
  A=P(data['A']);k0=P(data['k']);V=P(data['v']);ode(V,A-k0*V*V);exact(V.subs(t,0),P(data['u']),'example quadratic release');L=s.sqrt(A/k0);T0=s.log((L+P(data['target']))/(L-P(data['target'])))/(2*k0*L);distance=-s.log(1-P(data['target'])**2/L**2)/(2*k0);values=[V,T0,distance];exact(V.subs(t,T0),P(data['target']),'example quadratic target')
 elif kind=='cubic_drag':
  c0=P(data['coefficient']);u0=P(data['u']);V=u0/s.sqrt(1+2*c0*u0*u0*t);X=(s.sqrt(1+2*c0*u0*u0*t)-1)/(c0*u0);ode(V,-c0*V**3);trajectory(V,X,u0);values=[V,X];check(s.limit(X,t,s.oo)==s.oo and s.limit(V,t,s.oo)==0,'example zero speed limit with infinite distance')
 elif kind=='constant_power':
  Pn=P(data['P']);k0=P(data['k']);u0=P(data['u']);W=Pn/k0+(u0**3-Pn/k0)*s.exp(-3*k0*x);exact(s.diff(W,x),3*(Pn-k0*W),'example cubic constant-power ODE');L=s.real_root(Pn/k0,3);distance=s.log((Pn-k0*u0**3)/(Pn-k0*P(data['target'])**3))/(3*k0);values=[W,L,distance];check(u0<P(data['target'])<L,'example constant-power target reachable')
 else:raise ValueError(kind)
 for value in values:contains(example['solution'],s.simplify(value),'actual displayed example '+active+' '+str(value))

active='structure';check(len(source)==33 and sum(q['marks'] for q in source)==258 and sum(len(q['parts']) for q in source)==76,'all owner tasks, parts and marks');check(all(str(i) in coverage for i in range(1,34)),'evidence for all 33 source tasks');check(len(part_coverage)==76,'evidence for every owner part')
for item in fixtures['owner']:
 question=qby[item['uid']];original=item['original'];check(digest(question)==item['contentSha256'],'immutable owner '+item['uid']);check([[(c['marks'],c['description_html']) for c in p['marking_criteria']] for p in question['parts']]==[[(c['marks'],c['criterion_html']) for c in p['criteria']] for p in original['parts']],'unchanged owner criteria '+item['uid'])
for lesson in package['lessons']:check(digest(lesson)==fixtures['teachingDigests'][lesson['id']],'lesson fingerprint '+lesson['id']);check(sum(q['lesson']==lesson['key'] and q['collection']=='exam' for q in package['questions'])>=6,'at least six written '+lesson['key'])
for im in package['assets']:check(hashlib.sha256(Path(im['path']).read_bytes()).hexdigest()==im['sha256'],'image bytes '+im['file_id'])
if args.source:
 f=Path(args.source);original=json.loads(f.read_text(encoding='utf-8-sig'));check(hashlib.sha256(f.read_bytes()).hexdigest()==package['source']['sha256'],'read-only source SHA');check([q for l in original['lessons'] for q in l['questions']]==source,'unchanged source keys, criteria, marks and content')
report=dict(checks=len(checks),actualTeXClaims=claimed,failures=failures,coverage=coverage,sourceTasks=33,sourcePartsChecked=len(part_coverage),quickChecks=32,workedExamples=16,externalTeacherReview=False,method='Independent signed time/spatial ODE residuals, initial conditions, trajectory derivatives and definite integrals. Checks cover velocity signs, first stop/turn/return and force-switch ordering, square-root branches, resistive ascent/descent, finite-time poles, divergent travel/time integrals, terminal speeds, constant power and strict target reachability. Every full short-answer polynomial, rational function or complete set of template coefficients is checked; no universal exponential/logarithmic answer checker is claimed. Actual printed TeX is parsed and compared at deterministic 50-digit points, distinguished from symbolic identities and domain arguments. Source criteria, fingerprints and asset hashes are preserved.')
Path(args.report).write_text(json.dumps(report,indent=2,default=str)+'\n',encoding='utf8');print(json.dumps({key:value for key,value in report.items() if key!='coverage'},default=str));raise SystemExit(bool(failures))
