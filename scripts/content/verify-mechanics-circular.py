"""Independent circular dynamics, event-order and actual printed-answer audit."""
import argparse,hashlib,html,json,re
from functools import lru_cache
from pathlib import Path
import sympy as s
from sympy.parsing.latex import parse_latex
from sympy.core.function import AppliedUndef
ap=argparse.ArgumentParser();ap.add_argument('--source');ap.add_argument('--report',default='docs/ARENA-C5-MECHANICS-CIRCULAR-MATH-CHECKS-20261107.json');args=ap.parse_args()
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
   for piece in re.split(r'=|\\(?:le|ge|ne|lt|gt)(?![A-Za-z])|<|>',segment):
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

package=json.loads(Path('content/original/9231-mechanics/circular-v1.json').read_text(encoding='utf8'));fixtures=json.loads(Path('content/original/9231-mechanics/circular-verification-v1.json').read_text(encoding='utf8'))
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
part_coverage=set()
def C(number,value,part=0):
 part_coverage.add((number,part));raw=qmap[number]['parts'][part]['answer_html'];contains(raw,value,'printed owner '+str(number)+'/'+str(part+1)+' '+str(value))
def verbal(number,part,phrase,label):
 part_coverage.add((number,part));check(phrase.lower() in qmap[number]['parts'][part]['answer_html'].lower(),label)
def inward(K,z):return s.simplify(K-3*z)
def speed2(K,z):return s.simplify(K-2*z)
def check_loss(K,start,z,exterior=False):
 exact((3*z-K) if exterior else inward(K,z),0,'zero radial contact at release')
 check(speed2(K,z)>0,'positive speed at release');check(-1<z<1,'release lies on circle')
 check((start>z and 3*start-K>0) if exterior else (start<z and inward(K,start)>0),'initial contact and first monotone force zero')
def release(cosine,clockwise=False):
 sine=s.sqrt(1-cosine*cosine);v=s.sqrt(cosine);sgn=-1 if clockwise else 1
 return sine,cosine,-sgn*v*cosine,sgn*v*sine

for n in range(1,64):
 active=n;print('OWNER '+str(n),flush=True)
 if n==1:
  rr=R(12,25-9);C(n,rr);C(n,rr*5*8,1)
 elif n==2:
  accel=R(3,2)*(2*s.pi/s.pi)**2;C(n,accel);C(n,2*s.pi*s.sqrt(6/accel),1)
 elif n==3:
  ww=2*s.pi*(36/s.pi)/60;C(n,s.simplify(R(5,4)*ww**2/10))
 elif n==4:C(n,s.sqrt(R(27,5)*R(5,4)/R(3,5)));verbal(n,0,'towards the centre','radial acceleration direction')
 elif n==5:C(n,s.sqrt((a-a/2)/(a-a/5)))
 elif n==6:
  upper=(mm*ell*omega**2+R(5,3)*mm*g)/2;C(n,upper);lower=upper-R(5,3)*mm*g;exact((upper+lower)*R(4,5),mm*(R(4,5)*ell)*omega**2,'two strings inward sum');exact((upper-lower)*R(3,5),mm*g,'two strings vertical difference')
 elif n==7:
  cosine=R(2,5);length=15*a/(1+cosine);C(n,s.sqrt(g/(length*cosine)));check(length*cosine>0,'linked equal-height geometry')
 elif n==8:
  length=R(8,5)*(1+R(10,40));sine=R(6,5)/length;cosine=s.sqrt(1-sine*sine);N=20-10*cosine;C(n,sine);C(n,N);ww2=(10*sine+N/3)/(2*R(6,5));C(n,30*s.sqrt(ww2)/s.pi,1);check(N>0,'rough table contact positive')
 elif n==9:C(n,s.sqrt(g/(5*a*R(4,5))))
 elif n==10:
  normal=(mm*g+2*mm*g*R(3,5))/R(4,5);inwardF=normal*R(3,5)+2*mm*g*R(4,5);C(n,s.sqrt(inwardF/(mm*R(4,3)*h)));check(normal>0,'inside cone normal positive')
 elif n==11:
  tension=3*mm*g/R(4,5);ww2=tension*R(3,5)/(12*mm*a);C(n,tension);C(n,s.sqrt(ww2),1);C(n,s.atan(ww2*6*a/g),2);exact(tension*R(4,5),3*mm*g,'successive strings support all masses')
 elif n==12:
  extension=s.solve(s.Eq(60*x,18*(1+x)),x)[0];C(n,extension);check(extension>0,'flat elastic string stretched')
 elif n==13:
  tension=mm*g*(R(1,4)-R(1,5));C(n,tension);massratio=s.solve(s.Eq(tension+k*mm*g/4,3*k*mm*g/5),k)[0];C(n,massratio,1);verbal(n,1,'inward','outer friction orientation');check(tension>0 and massratio>0,'rough linked table physical values')
 elif n==14:
  roots=s.solve(s.Eq(3*x*(x+R(1,2)),R(3,2)),x);extension=next(v for v in roots if v>0);C(n,extension*a);C(n,3*extension,1);check(roots==[-1,R(1,2)],'elastic quadratic roots filtered by extension')
 elif n==15:C(n,s.sqrt(g*(R(8,5)*a)**2/(R(6,5)*a)))
 elif n==16:
  radius=s.solve(s.Eq((2*x/3-1)/(x-1),R(1,2)),x)[0];C(n,radius*a);modulus=(18/radius)/(radius-1);C(n,modulus,1);check(2*radius/3>1,'both elastic strings stretched')
 elif n==17:
  depth=8*a;radius2=R(9,2)*a*depth;length=s.sqrt(radius2+depth**2);extension=length-6*a;C(n,extension);C(n,(length/depth)*(6*a/extension),1)
 elif n==18:C(n,30*s.sqrt(12/(R(3,2)*R(4,5)))/s.pi)
 elif n==19:
  roots=s.solve(s.Eq((1-z*z)/z,R(21,10)),z);zz=next(v for v in roots if 0<v<1);C(n,(1-zz)*a);check(len(roots)==2,'bowl height root domain filtered')
 elif n==20:
  cosine=(4-R(14,5))/2;C(n,cosine);radius=(4*R(16,25))/(2*s.sqrt(1-cosine**2))*a;length=radius/s.sqrt(1-cosine**2);hanging=3*a-length;C(n,hanging,1);C(n,length*cosine,1);check(0<hanging<length*cosine,'counterweight clears table')
 elif n==21:
  extension=next(v for v in s.solve(s.Eq(5*x*(1+x),R(15,4)),x) if v>0);C(n,extension*a)
 elif n==22:
  cosine=R(1,4);length=5*a/(1+cosine);radius=length*s.sqrt(1-cosine**2);C(n,cosine);C(n,s.sqrt(g*radius**2/(length*cosine)),1)
 elif n==23:
  length=2*a;cosine=(g/(g/a))/length;C(n,cosine);C(n,length);exact(length+(4*a-length),4*a,'total common string length')
 elif n==24:C(n,2*s.pi/s.sqrt(9*g/(2*a)))
 elif n==25:
  extensionratio=s.solve(s.Eq(6*x,2*(1+x)),x)[0];length=2*a*(1+extensionratio);cosine=a/length;C(n,extensionratio);C(n,cosine,1);C(n,s.simplify(length*s.sqrt(1-cosine**2)),1);check(0<cosine<1,'elastic conical angle valid')
 elif n==26:
  C(n,g/(a-h));height=s.solve(s.Eq(2/(a-h),1/(a-3*h)),h)[0];C(n,height,1);C(n,mm*g*a/(a-3*height),1);check(0<3*height<a,'both bowl heights below centre')
 elif n==27:
  K=R(8,5);zB=s.solve(s.Eq(inward(K,z),K/4),z)[0];C(n,zB);C(n,s.sqrt(3*zB*a*g),1);C(n,(zB+zB*(1-zB*zB)/2)*a,2);check_loss(3*zB,0,zB);check(s.sqrt(zB*(1-zB*zB))>0,'loss velocity is rising')
 elif n==28:
  tangent=2;C(n,tangent);wA2=s.Symbol('T',positive=True)/(5*mm*a);wB2=s.Symbol('T',positive=True)/(2*mm*2*a);C(n,s.sqrt(wB2/wA2),1)
 elif n==29:
  C(n,R(3,2)*s.cos(th));cosine=s.solve(s.Eq(1-R(3,4)*R(3,2)*x,R(3,4)*(1-R(3,4)*x)),x)[0];N=mm*g*(1-R(3,4)*cosine);C(n,N,1);C(n,R(3,2)*cosine,1);hanging1=R(12,5)*h-h/cosine;hanging2=R(12,5)*h-h/(R(3,2)*cosine);C(n,hanging1,2);C(n,hanging2,2);check(0<hanging1<h and 0<hanging2<h,'both hanging weights clear table')
 elif n==30:
  initial=s.solve(s.Eq(x+R(3,5),R(11,15)*(x+R(9,5))),x)[0];K=initial-R(6,5);C(n,initial*a*g);C(n,K*a/3,1);verbal(n,1,'no','target point not reached');check(K/3<R(3,5),'loss before requested upper target');C(n,(K+3)*mm*g,2);C(n,s.sqrt(K*a*g/3),2);check_loss(K,-R(3,5),K/3)
 elif n==31:
  K=R(9,5);cs=K/3;C(n,cs);C(n,(cs+cs*(1-cs*cs)/2)*a,1);check_loss(K,0,cs)
 elif n==32:
  cs=s.solve(s.Eq(3+5*x,2*(3-x)),x)[0];K=3+2*cs;C(n,cs);C(n,(K+3*cs)*mm*g,1);C(n,(K-3)*mm*g,2);check(K>3,'complete string circle positive top force')
 elif n==33:
  U=s.sqrt(R(19,3)+2);VQ=s.sqrt(R(4,3));VP=U-4*VQ;e=s.simplify((VQ-VP)/U);C(n,VP*s.sqrt(a*g));C(n,VQ*s.sqrt(a*g));C(n,e,1);K=s.simplify(VP**2-2);C(n,K/3,2);exact(U**2,VP**2+4*VQ**2,'elastic collision energy');check_loss(K,-1,K/3)
 elif n==34:
  K=3*R(4,5);initial=K-2*R(3,5);C(n,initial*a*g);C(n,(K+3)*mm*g,1);check_loss(K,R(3,5),R(4,5));check(R(4,5)>R(3,5),'clockwise three-quarter turn upper release')
 elif n==35:
  C(n,a*g*(1+2*s.cos(alpha)));cs=s.solve(s.Eq((R(1,10)+2*x)/R(3,4)-R(3,5),1-x),x)[0];C(n,cs,1);loss=(1+2*cs)/(3*R(3,4));C(n,loss,2);check(loss>R(3,5),'peg circle reaches C before slackening');exact(R(3,4)*loss,(1+2*cs)/3,'new peg loss speed equation')
 elif n==36:
  C(n,u**2+R(14,5)*a*g);initial=s.solve(s.Eq(x+R(18,5),3*(x-R(3,5))),x)[0];K=initial+R(6,5);C(n,s.sqrt(initial*a*g),1);C(n,(K-3)*mm*g,2);check(K>3,'full circle positive top tension')
 elif n==37:
  C(n,a*g*(R(1,2)+3*s.cos(beta)));roots=s.solve(4*x*x-2*x-1,x);cs=next(v for v in roots if v>s.sqrt(2)/2);initial=R(1,2)+3*cs;C(n,cs,1);C(n,(initial+R(1,4))*mm*g,2);exact(initial-2,3*(2*cs*cs-1),'second launch loss at double angle');check_loss(initial-R(1,2),-R(1,4),cs)
 elif n==38:
  K=R(1,2);height=(K-2)/3;v2=speed2(K,height);C(n,-height);C(n,s.sqrt(v2*a*g));X=s.sqrt(1-height**2);vx=-s.sqrt(v2)/2;vy=-s.sqrt(v2)*s.sqrt(3)/2;tau=s.simplify(-X/vx);C(n,tau*s.sqrt(a/g),1);Y=s.simplify(height+vy*tau-tau*tau/2);C(n,abs(Y)*a,2);check(Y<0,'axis crossing below centre')
 elif n==39:
  U2=8+2;C(n,s.sqrt(U2*a*g));C(n,(U2+1)*mm*g);masses=s.solve(s.Eq(U2/x+x,7),x);check(masses==[2,5],'both coalesced total mass ratios');C(n,masses[0]-1,1);C(n,masses[1]-1,1);verbal(n,2,'cannot complete','both merged branches cannot loop');check(all(U2/mass**2<5 for mass in masses),'both post-impact speeds below string loop threshold');check(all(U2/mass<U2 for mass in masses),'coalescence dissipates kinetic energy')
 elif n==40:
  U=s.sqrt(43+2);VP=-s.sqrt(5);massratio=s.solve(s.Eq((1-x)/(1+x),VP/U),x)[0];C(n,U*s.sqrt(a*g));C(n,VP*s.sqrt(a*g),1);C(n,massratio,2);exact(VP**2,5,'limiting rebound loop speed')
 elif n==41:
  initial=s.solve(s.Eq(x+4,11*x),x)[0];K=initial+2;cs=K/3;ground2=11*initial;vx2=cs**3;C(n,initial*a*g);C(n,cs,1);C(n,s.acos(s.sqrt(vx2/ground2)),2);check_loss(K,1,cs,True)
 elif n==42:
  start=R(1,6);C(n,s.sqrt((3-2*start)*a*g));C(n,s.sqrt((3-2*start)*a*g),1);C(n,s.sqrt((8-3-2*start)*a*g),1);check(3-2*start<8-3-2*start,'nonempty complete-circle force-cap interval')
 elif n==43:
  K=R(12,5);cs=K/3;X,Y,vx,vy=release(cs);tau=-X/vx;height=s.simplify(Y+vy*tau-tau*tau/2);C(n,cs);C(n,height*a,1);check(vy-tau<0,'inner-cylinder axis crossing descending');verbal(n,1,'falling','axis-crossing velocity description');check_loss(K,0,cs)
 elif n==44:
  K=s.solve(s.Eq((x+3)/(x-3),R(5,2)),x)[0];C(n,(K+3)*mm*g);C(n,(K-3)*mm*g);cs=(8-K)/2;C(n,cs,1);C(n,s.sqrt((K-2)*a*g),2);C(n,(K-3)*mm*g,2);check(K>3,'maximum/minimum tension ratio physical')
 elif n==45:
  K=5-2*R(12,13);C(n,inward(K,R(5,13))*mm*g);check(speed2(K,R(5,13))>0 and inward(K,R(5,13))>0,'quarter arc reached taut')
 elif n==46:
  cs=s.solve(s.Eq(R(7,4)-3*x,x/2),x)[0];bottom=R(11,4)-2*cs;C(n,cs);ratio=s.simplify((bottom+1)/(2*bottom+1));raw=qmap[n]['parts'][1]['answer_html'];verbal(n,1,'11:18','peg tension ratio 11:18');exact(ratio,R(11,18),'independent peg ratio');C(n,s.sqrt(cs*a*g/2),2);check(2*bottom-2<3,'new circle loss before top')
 elif n==47:
  C(n,(u**2+2*a*g)/(3*a*g));cs=R(3,4);X,Y,vx,vy=release(cs,True);impactVy=-s.sqrt(vy*vy+2*(Y+1));tau=s.simplify(vy-impactVy);C(n,impactVy*s.sqrt(a*g),1);C(n,tau*s.sqrt(a/g),2);check(tau>0 and impactVy<0,'exterior sphere positive ground flight time')
 elif n==48:
  T0=s.Symbol('T_0',positive=True);loc['T_0']=T0;loc['T_{0}']=T0;C(n,T0-3*mm*g*(1+s.cos(th)));K=3*R(3,4);bottom=K+2;C(n,s.sqrt(bottom*a*g),1);C(n,(K+3)*mm*g,1);check_loss(K,-1,R(3,4))
 elif n==49:
  C(n,3*x*s.sqrt(a*g/2)/(4*a-x));rp=4*a-x;rq=x;ww2=R(9,2)*a*g/(rp*rp);Tp=mm*ww2*rp-mm*g/2;Tq=mm*ww2*rq+mm*g/2;xx=next(v for v in s.solve(s.Eq(Tp,Tq),x) if 0<v<4*a);C(n,xx,1);check(0<xx<4*a,'rod pivot inside physical rod');check(Tp.subs(x,xx)>0 and Tq.subs(x,xx)>0,'both rod portions tensile at specified angle');I=mm*(rp*rp+rq*rq);potentialDrop=mm*g*(rp-rq)/2;wwInitial2=s.simplify((ww2-2*potentialDrop/I).subs(x,xx));C(n,s.sqrt(wwInitial2*(4*a-xx)**2),2)
 elif n==50:
  initial=s.solve(s.Eq((x-R(17,5)),-(x+R(4,5))/8),x)[0];K=initial-R(8,5);C(n,-inward(K,R(3,5))*mm*g);C(n,initial,1);C(n,speed2(K,R(3,5))*a*g,1);check(speed2(K,R(3,5))>0,'bilateral bead reaches B');check(inward(K,-R(4,5))>0 and inward(K,R(3,5))<0,'wire reaction changes radial direction')
 elif n==51:
  sn=R(5,13);cs=s.sqrt(1-sn*sn);K=3*sn;C(n,sn);C(n,(K+3*cs)*mm*g,1);check_loss(K,-cs,sn)
 elif n==52:
  K=R(16,5)-2*R(3,5);C(n,K/3);check_loss(K,-R(3,5),K/3)
 elif n==53:
  K=R(15,4)-2*R(3,8);exact(K,3,'limiting full circle energy');C(n,s.sqrt((K-2)*a*g));verbal(n,0,'zero tension only at that instant','limiting top is not premature slackening')
 elif n==54:
  cs=s.solve(s.Eq(3+(1-x),5*(1-x)),x)[0];lowerCos=1-cs;K=1+2*cs;C(n,(1-cs)*mm*g);C(n,lowerCos,1);check(inward(K,cs)>0 and inward(K,-lowerCos)>0,'descending arc stays taut')
 elif n==55:
  K=R(3,5);cs=s.solve(s.Eq(K+3*x,R(12,5)),x)[0];vv=K+2*cs;C(n,vv);C(n,cs);C(n,(1-cs+vv*(1-cs*cs)/2)*a,1);check(K+3*cs>0,'deliberate release with positive tension')
 elif n==56:
  cs=R(3,5);K=3*cs;C(n,s.sqrt((K+R(4,5))*a*g));check_loss(K,-R(2,5),cs)
 elif n==57:
  cs=s.solve(s.Eq(2+5*x,4*(2-x)),x)[0];K=2+2*cs;C(n,cs);C(n,s.sqrt((2+4*cs)*a*g));C(n,(K-2)*a*g,1);C(n,(K-3)*mm*g,1);check(K>3,'revised complete-circle problem physically consistent')
 elif n==58:
  # v_B²=u²/6 and v_B²/(ag)=sin(theta); energy gives u²/(ag)=6sin(theta)=3sin(theta)+2cos(theta).
  tangent=R(2,3);cs=1/s.sqrt(1+tangent*tangent);sn=tangent*cs;initial=6*sn;C(n,tangent);C(n,(initial+cs)*mm*g,1);exact(initial-2*(sn+cs),sn,'quarter-turn release energy');check_loss(3*sn,-cs,sn)
 elif n==59:
  cs=s.solve(s.Eq(7+x,3*(7-5*x)),x)[0];K=7-2*cs;C(n,cs);C(n,s.sqrt((K+2)*a*g),1);C(n,(K-3)*mm*g,1);check(K>3,'opposite tension-ratio full circle')
 elif n==60:
  K=R(19,5)-2;cs=K/3;X,Y,vx,vy=release(cs);tau=s.Symbol('tau',real=True);xx=X+vx*tau;yy=Y+vy*tau-tau*tau/2;distance=s.factor(xx*xx+yy*yy-1);roots=s.solve(distance,tau);positive=[v for v in roots if v>0];check(len(positive)==1,'only one positive next cylinder contact time');flight=positive[0];C(n,cs);C(n,s.simplify(xx.subs(tau,flight))*a,1);C(n,s.simplify(yy.subs(tau,flight))*a,1);C(n,flight*s.sqrt(a/g),1);exact(distance,tau**3*(tau/4-vy),'next-contact quartic factor');check(vy>0 and flight==4*vy,'distance negative throughout outgoing free flight before first return');verbal(n,2,'X^2+Y^2','first-contact inequality provided')
 elif n==61:
  cs=R(1,3);K=6-2*cs;ratio=s.simplify((K+3*cs)/(K-3*cs));exact(ratio,R(19,13),'opposite tensions 19:13');verbal(n,0,'19:13','printed opposite tension ratio');C(n,(K-3)*mm*g,1);check(K>3,'complete circle top condition')
 elif n==62:
  cs=(R(9,2)-3)/2;C(n,cs);exact(R(9,2)-2*cs,3,'limiting top energy')
 elif n==63:
  start=R(3,4);K=R(1,4)+2*start;C(n,K/3);C(n,(3*start-K)*mm*g,1);check_loss(K,start,K/3,True)

def calculated(data):
 d={k:(P(v) if isinstance(v,(str,int)) and k not in ['kind','answer'] else v) for k,v in data.items()};kind=d['kind']
 if kind=='rpm':
  radius=d['radius'];ww=2*s.pi*d['rpm']/60;return dict(omega=ww,speed=radius*ww,acceleration=radius*ww**2,period=2*s.pi/ww)
 if kind=='friction':
  N=d['mass']*d['g'];F=d['mass']*d['speed']**2/d['radius'];return dict(normal=N,friction=F,mu=F/N,interval='['+str(F/N)+',inf)')
 if kind=='bowl':
  depth=1-d['height'];check(0<depth<1,'horizontal bowl geometric domain');return dict(radius=s.sqrt(1-depth*depth),omega2=1/depth,normal=1/depth)
 if kind=='conical':
  length=d['length'];cs=d['cosine'];radius=length*s.sqrt(1-cs*cs);check(0<cs<1,'conical angle acute');return dict(radius=radius,tension=1/cs,omega2=1/(length*cs),speed2=radius**2/(length*cs))
 if kind=='two_strings':
  length=d['length'];depth=d['depth'];ww2=d['omega2'];U0,L0=s.symbols('U0 L0');sol=s.solve([depth*(U0-L0)/length-1,(U0+L0)/length-ww2],[U0,L0]);check(sol[L0]>0 and sol[U0]>0,'both linked string tensions positive');return dict(radius=s.sqrt(length*length-depth*depth),upper=sol[U0],lower=sol[L0])
 if kind=='elastic_conical':
  natural=d['natural'];modulus=d['modulus'];ww2=d['omega2'];length=s.solve(s.Eq(modulus*(x-natural)/natural,x*ww2),x)[0];ten=length*ww2;cs=1/ten;check(length>natural and 0<cs<1,'stretched conical solution physically valid');return dict(length=length,extension=length-natural,tension=ten,cosine=cs,radius=length*s.sqrt(1-cs*cs))
 if kind=='vertical':
  K=d['bottom2']-2;check(K>=3,'string completes circle');return dict(top2=K-2,maximum=K+3,minimum=K-3)
 if kind=='cap':
  lo=3-2*d['height'];hi=d['cap']-3-2*d['height'];check(hi>=lo,'force-cap interval nonempty');return dict(minimum=lo,maximum=hi,interval='['+str(lo)+','+str(hi)+']')
 if kind=='wire':
  K=d['bottom2']-2;check(K>2,'bilateral bead has positive top speed');return dict(speed2=speed2(K,d['height']),reaction=inward(K,d['height']),top2=K-2)
 if kind=='slack':
  K=d['bottom2']-2;check_loss(K,-1,K/3);return dict(cosine=K/3,speed2=K/3,initial=K+3)
 if kind=='outside':
  K=d['start2']+2*d['height'];check_loss(K,d['height'],K/3,True);return dict(normal=3*d['height']-K,cosine=K/3,speed2=K/3)
 if kind=='turn':
  K=d['bottom2']-2;check(K<0,'negative K turns in lower half');check(-1<K/2<K/3<0,'turn before formal force zero');return dict(height=K/2,tension=-K/2,formal=K/3)
 if kind=='release_apex':
  cs=d['cosine'];X,Y,vx,vy=release(cs);peak=Y+vy*vy/2;check(vy>0,'upper release rising');# Recontact time is 4uy/g, after apex time uy/g.
  exact(s.factor((X+vx*x)**2+(Y+vy*x-x*x/2)**2-1),x**3*(x/4-vy),'apex before first positive circular recontact');return dict(vx=vx,vy=vy,height=peak)
 if kind=='impact':
  ratio=d['massRatio'];e=d['e'];incoming=d['incoming'];vp,vq=s.symbols('vp vq');sol=s.solve([vp+ratio*vq-incoming,vq-vp-e*incoming],[vp,vq]);initial=incoming**2;final=sol[vp]**2+ratio*sol[vq]**2;check(0<=e<=1,'restitution physical interval');check(equal(final,initial) if e==1 else final<initial,'impact energy consistent with restitution');return dict(first=sol[vp],second=sol[vq],speed2=sol[vp]**2)
 if kind=='peg':
  rr=d['radius'];bottom=d['bottom2'];top=bottom-4*rr;check(0<rr<1 and top/rr-1>0,'shortened string completes its circle');return dict(before=bottom+1,after=bottom/rr+1,top2=top,top=top/rr-1)
 raise ValueError(kind)
for item in fixtures['quick']:
 active=item['uid'];question=qby[active];fields={f['key']:f for f in question['fields']};data=item['model'];check(digest(question)==item['contentSha256'],'quick fingerprint '+active)
 if data['kind']=='logic':check(fields['reason']['expected']==data['answer'],'reviewed physical principle '+active);continue
 values=calculated(data);check(set(values)==set(fields),'every short-answer field independently recomputed '+active)
 for field,value in values.items():
  if fields[field]['type']=='set':check(fields[field]['expected']==value,'full interval and boundaries '+active);continue
  exact(P(fields[field]['expected']),value,'whole answer '+active+' '+field);contains(question['answer_html'],value,'actual printed quick '+active+' '+field)

for data in fixtures['examples']:
 active=data['id'];example=next(e for l in package['lessons'] for e in l['examples'] if e['verification']==active);check(digest(example)==data['contentSha256'],'example fingerprint '+active);kind=data['kind']
 if kind=='rpm':
  d=dict(kind=kind,radius=data['r'],rpm=data['rpm']);v=calculated(d);values=list(v.values())
 elif kind=='friction':
  v=calculated(dict(kind=kind,mass=data['m'],radius=data['r'],speed=data['v'],g=data['g']));values=[v[k] for k in ['normal','friction','mu']]
 elif kind=='bowl':
  v=calculated(dict(kind=kind,height=data['h']));values=[v['radius']*a,v['omega2']*g/a,v['normal']*mm*g]
 elif kind=='counterweight':
  ww2=P(data['M'])*P(data['g'])/(P(data['m'])*P(data['r']));values=[s.sqrt(ww2),30*s.sqrt(ww2)/s.pi];exact(ww2,P(data['omega2']),'counterweight radial solution')
 elif kind=='conical':
  v=calculated(dict(kind=kind,length=data['length'],cosine=data['cosine']));values=[v['radius']*a,v['tension']*mm*g,v['omega2']*g/a,v['speed2']*a*g]
 elif kind=='cone':
  tangent=P(data['tangent']);cs=1/s.sqrt(1+tangent*tangent);sn=tangent*cs;normal=1/sn;ww2=normal*cs/tangent;values=[normal*mm*g,ww2*g/h];exact(ww2,P(data['omega2']),'cone radial and vertical solution')
 elif kind=='elastic_conical':
  v=calculated({k:data[k] for k in ['kind','natural','modulus','omega2']});values=[v['length']*a,v['extension']*a,v['tension']*mm*g,v['cosine'],v['radius']*a]
 elif kind=='two_strings':
  v=calculated({k:data[k] for k in ['kind','length','depth','omega2']});values=[v['radius']*a,v['upper']*mm*g,v['lower']*mm*g]
 elif kind=='vertical':
  v=calculated(dict(kind=kind,bottom2=data['bottom2']));values=[v['top2']*a*g,v['maximum']*mm*g,v['minimum']*mm*g]
 elif kind=='diameter':
  K=P(data['start2'])+2*P(data['startY']);end=-P(data['startY']);values=[speed2(K,end)*a*g,inward(K,-end)*mm*g,inward(K,end)*mm*g,(K-3)*mm*g];exact(inward(K,-end)/inward(K,end),R(11,5),'diameter tension ratio example')
 elif kind=='cap':
  v=calculated({k:data[k] for k in ['kind','height','cap']});values=[v['minimum'],v['maximum']];check([str(v['minimum']),str(v['maximum'])]==data['interval'],'included force-cap example endpoints')
 elif kind=='wire':
  v=calculated({k:data[k] for k in ['kind','bottom2','height']});values=[v['speed2']*a*g,v['reaction']*mm*g,v['top2']*a*g]
 elif kind=='slack':
  v=calculated(dict(kind=kind,bottom2=data['bottom2']));values=[v['cosine'],v['speed2']*a*g,v['initial']*mm*g]
 elif kind=='outside':
  v=calculated(dict(kind=kind,height=data['startY'],start2=data['start2']));values=[v['normal']*mm*g,v['cosine'],v['speed2']*a*g]
 elif kind=='turn':
  v=calculated(dict(kind=kind,bottom2=data['bottom2']));values=[v['height'],v['tension']*mm*g,v['formal']]
 elif kind=='inverse':
  K=3*P(data['cosine']);initial=K-2*P(data['startY']);ten=inward(K,P(data['startY']));values=[initial,ten];exact(initial,P(data['start2']),'inverse release example launch');check_loss(K,P(data['startY']),P(data['cosine']))
 elif kind=='release_apex':
  v=calculated(dict(kind=kind,cosine=data['cosine']));values=[v['vx']*s.sqrt(a*g),v['vy']*s.sqrt(a*g),v['height']*a]
 elif kind=='release_ground':
  X,Y,vx,vy=release(P(data['cosine']),True);tau=s.Symbol('tau',real=True);flight=next(v for v in s.solve(s.Eq(Y+vy*tau-tau*tau/2,-1),tau) if v>0);distance=s.simplify(X+vx*flight);values=[flight*s.sqrt(a/g),distance*a];exact(flight,P(data['time']),'ground flight time example');exact(distance,P(data['distance']),'ground distance example');poly=s.factor((X+vx*tau)**2+(Y+vy*tau-tau*tau/2)**2-1);exact(poly,tau**3*(tau/4-vy),'outward flight remains outside sphere')
 elif kind=='impact':
  v=calculated({k:data[k] for k in ['kind','massRatio','e','incoming']});K=v['speed2']-2;values=[v['first']*s.sqrt(a*g),v['second']*s.sqrt(a*g),K*a/3];check_loss(K,-1,K/3)
 elif kind=='peg':
  v=calculated({k:data[k] for k in ['kind','radius','bottom2']});values=[v['before']*mm*g,v['after']*mm*g,v['top2']*a*g,v['top']*mm*g]
 else:raise ValueError(kind)
 for value in values:contains(example['solution'],s.simplify(value),'actual displayed example '+active+' '+str(value))

active='structure';check(len(source)==63 and sum(q['marks'] for q in source)==444 and sum(len(q['parts']) for q in source)==125,'all owner tasks, parts and marks');check(all(str(i) in coverage for i in range(1,64)),'evidence for all 63 source tasks');check(len(part_coverage)==125,'evidence for every owner part')
for item in fixtures['owner']:
 question=qby[item['uid']];original=item['original'];check(digest(question)==item['contentSha256'],'immutable owner '+item['uid']);check([[(c['marks'],c['description_html']) for c in p['marking_criteria']] for p in question['parts']]==[[(c['marks'],c['criterion_html']) for c in p['criteria']] for p in original['parts']],'unchanged owner criteria '+item['uid'])
for lesson in package['lessons']:check(digest(lesson)==fixtures['teachingDigests'][lesson['id']],'lesson fingerprint '+lesson['id']);check(sum(q['lesson']==lesson['key'] and q['collection']=='exam' for q in package['questions'])>=6,'at least six written '+lesson['key'])
for im in package['assets']:check(hashlib.sha256(Path(im['path']).read_bytes()).hexdigest()==im['sha256'],'image bytes '+im['file_id'])
if args.source:
 f=Path(args.source);original=json.loads(f.read_text(encoding='utf-8-sig'));check(hashlib.sha256(f.read_bytes()).hexdigest()==package['source']['sha256'],'read-only source SHA');check([q for l in original['lessons'] for q in l['questions']]==source,'unchanged source keys, criteria, marks and content')
report=dict(checks=len(checks),actualTeXClaims=claimed,failures=failures,coverage=coverage,sourceTasks=63,sourcePartsChecked=len(part_coverage),quickChecks=40,workedExamples=20,externalTeacherReview=False,method='Independent radial-force and energy equations, conical geometry, friction and Hooke constraints, separate momentum/restitution/energy checks at impact, changed-centre radii, first zero-force/zero-speed ordering, tangent projectile components and next-contact polynomial factorisation. Every owner part, complete short-answer field, criterion and asset is checked. Actual displayed TeX is parsed and compared at deterministic 50-digit points; numerical comparisons are not asserted as universal symbolic proofs. Content fingerprints bind the checked text.')
Path(args.report).write_text(json.dumps(report,indent=2,default=str)+'\n',encoding='utf8');print(json.dumps({k:v for k,v in report.items() if k!='coverage'},default=str));raise SystemExit(bool(failures))
