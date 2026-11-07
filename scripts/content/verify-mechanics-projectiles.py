"""Independent projectile kinematics, collision, trajectory and printed-answer audit."""
import argparse,hashlib,html,json,re
from functools import lru_cache
from pathlib import Path
import sympy as s
from sympy.parsing.latex import parse_latex
from sympy.core.function import AppliedUndef
ap=argparse.ArgumentParser();ap.add_argument('--source');ap.add_argument('--report',default='docs/ARENA-C5-MECHANICS-PROJECTILES-MATH-CHECKS-20261107.json');args=ap.parse_args()
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
  elif raw.startswith(r'\frac',pos) or raw.startswith(r'\sqrt',pos):
   raise ValueError('An inverse argument must be bracketed here')
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
    if not piece or piece in ['x','y','z','a','k','c','u','t']:continue
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

package=json.loads(Path('content/original/9231-mechanics/projectiles-v1.json').read_text(encoding='utf8'));fixtures=json.loads(Path('content/original/9231-mechanics/projectiles-verification-v1.json').read_text(encoding='utf8'))
source=[f['original'] for f in fixtures['owner']];qmap={q['bank_number']:q for q in source};qby={q['id']:q for q in package['questions']}
U,V,u,g,a,mm=s.symbols('U V u g a m',positive=True);tt=s.Symbol('t',real=True);zz=s.Symbol('z',real=True);alpha,beta,th=s.symbols('alpha beta theta',real=True);ff=s.Symbol('f',positive=True)
loc.update(U=U,V=V,u=u,g=g,a=a,m=mm,t=tt,z=zz,alpha=alpha,beta=beta,theta=th,f=ff,T=s.Symbol('T'))
def clean(raw):
 while (pos:=raw.find(r'\mathrm{'))>=0:
  end=pos+8;depth=1
  while depth:depth+=(raw[end]=='{')-(raw[end]=='}');end+=1
  raw=raw[:pos]+raw[end:]
 raw=re.sub(r'\d+(?:\.\d+)?\^\\circ',lambda m:r'\frac{'+m[0].split('^')[0]+r'\pi}{180}',raw)
 return re.sub(r'\\approx[^<]*?(?=\\\)|\\\])','',raw).replace(r'\,',' ').replace('\\ ',' ')
def same(a,b):
 try:return s.simplify(s.trigsimp(s.expand(a-b)))==0
 except (ValueError,TypeError,NotImplementedError):return False
def exact(a,b,label):check(same(s.sympify(a),s.sympify(b)),label)
def contains(raw,value,label):
 global claimed
 value=s.sympify(value);found=False
 for item in candidates(clean(raw)):
  if item.free_symbols!=value.free_symbols:continue
  try:
   syms=sorted(value.free_symbols,key=str)
   if all(abs(complex(s.N((item-value).subs({v:s.Rational(i+kk+3,kk+2) for i,v in enumerate(syms)}),50)))<1e-32 for kk in range(3)):found=True;break
  except (ValueError,TypeError,ZeroDivisionError):pass
 check(found,label);claimed+=1
def C(number,value,part=None):
 q=qmap[number];raw=q['answer_html'] if part is None else q['parts'][part]['answer_html'];contains(raw,value,'actual printed answer '+str(number)+' '+str(value))
def height(b,t,h=0,gravity=10):return h+b*t-s.Rational(1,2)*gravity*t*t
def path(speed2,z,X,gravity=10,h=0):return h+X*z-gravity*X*X*(1+z*z)/(2*speed2)
def positive_root(expr,var=tt):return next(v for v in s.solve(expr,var) if v.is_positive)
for number in range(1,28):
 active=number;print('OWNER '+str(number),flush=True);q=qmap[number]
 if number==1:
  Tm=4*U/(5*g);v=13*U/15;d=Tm*(3*U/5+5*v/13)
  exact(4*U*Tm/5,12*v*Tm/13,'meeting horizontal equality');exact(3*U/5-g*Tm,-U/5,'specified downward velocity')
  C(number,U*s.Symbol('T')*(s.sin(alpha)+s.cos(alpha)*s.tan(beta)),0);C(number,Tm,1);C(number,v,1);C(number,d,1)
 elif number==2:
  vx=4*U/5;vy=3*U/5;Tm=s.solve(s.Eq(vy-g*tt,-2*vx),tt)[0];drop=-height(vy,Tm,gravity=g);distance=vx*Tm
  C(number,vx,0);C(number,vy-g*tt,0);C(number,Tm,1);check(same(drop/distance,s.Rational(5,8)),'platform drop-to-distance ratio');check('5:8' in q['parts'][2]['answer_html'],'printed ratio 5:8');C(number,s.Rational(1,2),3);C(number,s.sqrt(2)*vx,3)
 elif number==3:
  eq=(u/s.sqrt(5))**2+(2*u/s.sqrt(5)-10)*(2*u/s.sqrt(5)-40);roots=s.solve(eq,u);check(len(roots)==2,'both perpendicular speed roots')
  for root in roots:C(number,root);check(s.simplify(height(2*root/s.sqrt(5),4,50))>0,'observations before landing '+str(root))
 elif number==4:
  sp=360/s.Integer(13);sn=12/s.Integer(13);cs=5/s.Integer(13)
  exact((sp*cs)**2+(sp*sn-30)**2,(5*sp/12)**2,'speed fraction condition');exact(sp**2-30*sp*sn,0,'perpendicular component identity');C(number,s.Rational(119,144)*u*u-60*u*s.sin(th)+900,0);C(number,sp,1);C(number,sn,1);C(number,2*sp*sn/10,2);check(2*sp*sn/10>3,'event before landing')
 elif number==5:
  C(number,3*s.sin(th),0);C(number,45*s.sin(th)**2,0);C(number,s.asin(s.Rational(4,5)),1)
  vx=18;vy=24-40;H=s.Rational(24**2,20);exact(H-height(24,4),4*H/9,'fall measured from highest point');C(number,s.sqrt(vx*vx+vy*vy),2);C(number,s.atan(s.Rational(8,9)),2)
 elif number==6:
  vx=24;vy=18;Tm=2;exact(vx*Tm,56-4*Tm,'powered target horizontal');exact(height(vy,Tm),16,'powered target fixed height');C(number,2,0);C(number,30,0);C(number,s.atan(s.Rational(1,12)),1);check('powered' in q['parts'][2]['answer_html'],'target is not free fall')
 elif number==7:
  Tm=3;exact(15*(Tm+1),20*Tm,'delayed horizontal');exact(height(s.Rational(25,2),Tm+1),height(5,Tm),'delayed vertical');C(number,3,1);C(number,5*s.sqrt(17),1);C(number,60,2);C(number,-30,2);check(45+height(5,Tm)>0,'delayed meeting above ground');check('15' in q['parts'][3]['answer_html'],'printed ground-height check')
 elif number==8:
  vx=16;vy=12;exact(vx*vx+(vy-20)**2,320,'speed reading');C(number,s.Rational(3,5),0);C(number,s.Rational(vx*2*vy,10),1);C(number,16,2);C(number,s.Rational(vy,10),2)
 elif number==9:
  vx=2*U/s.sqrt(13);vy=3*U/s.sqrt(13);tau=2*vy/g;walltime=18/vx;landing=18-vx*(tau-walltime)/2;speed2=s.solve(s.Eq(landing,6),U**2)[0]
  C(number,tau,0);C(number,speed2,2);exact((walltime/tau).subs(U*s.Integer(1),s.sqrt(speed2)),s.Rational(3,7),'wall impact before apex');check('rising' in q['parts'][3]['answer_html'],'printed rising direction')
 elif number==10:
  roots=s.solve(s.Eq((tt-3)**2,4),tt);H=height(30,roots[0]);exact(height(30,roots[1]),H,'equal heights at both times')
  for value in roots:C(number,value,0)
  C(number,H,0);vy=30-10*s.Rational(11,2);C(number,s.sqrt(40**2+vy**2),1);C(number,s.atan(s.Rational(5,8)),1)
 elif number==11:
  eq=(3*u/5)**2+(4*u/5-10)*(4*u/5-90);roots=s.solve(eq,u);valid=[r for r in roots if s.simplify(2*(4*r/5)/10-9)>0];check(len(valid)==1,'one root remains airborne at nine seconds');C(number,valid[0]);check('smaller' in q['answer_html'] and 'before' in q['answer_html'],'inadmissible smaller root explained')
 elif number==12:
  Tm=u/(g*s.sin(alpha));exact(u*u-g*Tm*u*s.sin(alpha),0,'perpendicular time');C(number,Tm,0)
  ratio=s.simplify(Tm/(2*u*s.sin(alpha)/g));exact(ratio.subs(alpha,s.pi/4),1,'boundary occurs at landing');check(ratio.subs(alpha,s.pi/3)<1 and ratio.subs(alpha,s.pi/6)>1,'strict airborne side');check(r'45^\circ\lt \alpha\lt 90^\circ' in q['parts'][1]['answer_html'],'complete strict angle interval')
 elif number==13:
  vx=12*u/13;vy=5*u/13*(1-s.Rational(7,5));C(number,s.sqrt(s.simplify(vx*vx+vy*vy)),0);C(number,s.atan(s.Rational(1,6)),1)
 elif number==14:
  H=u*u*s.sin(th)**2/(2*g);exact(2*g*H*(1-ff)/(u*s.cos(th))**2,(1-ff)*s.tan(th)**2,'squared upward crossing direction with positive upward branch');C(number,s.sqrt(1-ff)*s.tan(th),0)
  delta=2*u*u*(12/s.Integer(13))*(5/s.Integer(13))*s.Rational(4,5)/g;C(number,delta,1);exact(2*s.Rational(1,3)/(1-s.Rational(1,9)),s.Rational(3,4),'angle double-tangent');C(number,s.Rational(3,4),2)
 elif number==15:
  impact=s.solve(s.Eq(height(21,tt),12*tt-18),tt);check([v for v in impact if v>0]==[3],'no earlier positive line contact');C(number,3,0);C(number,36,0);C(number,18,0);C(number,s.sqrt(12**2+9**2),1)
  phi=s.pi/4;p=12*s.cos(phi)-9*s.sin(phi);normal=-12*s.sin(phi)-9*s.cos(phi);outx=s.simplify(p*s.cos(phi)+normal*s.sin(phi)/3);outy=s.simplify(p*s.sin(phi)-normal*s.cos(phi)/3);C(number,outx,2);C(number,outy,2)
  after=positive_root(height(outy,tt,18));C(number,-outx*after,3);second=positive_root(height(outy,tt,18)-(36+outx*tt-18));check(36+outx*second<34,'second line contact outside finite segment');check(second<after,'line extension crossed before landing')
 elif number==16:
  speed2=s.solve(s.Eq(path(u*u,s.Rational(3,2),12),12),u*u)[0];C(number,speed2,0);poly=path(speed2,s.Rational(3,2),x);C(number,poly,0);lo=max(s.solve(poly-6,x));hi=max(s.solve(poly,x));C(number,lo,1);C(number,hi,1);check(r'\le D\lt' in q['parts'][1]['answer_html'],'top included, ground excluded');check(lo>12,'contact after supplied point')
 elif number==17:
  roots=s.solve(path(800,zz,40)-20,zz);check(roots==[1,3],'both wall-top roots');C(number,s.pi/4,0);C(number,s.atan(3),0);R=160*zz/(1+zz*zz);derivative=s.factor(s.diff(R,zz));exact(derivative,160*(1-zz*zz)/(1+zz*zz)**2,'range derivative');check(s.simplify(derivative.subs(zz,2))<0,'range decreases in feasible interior');C(number,R.subs(zz,3),1)
 elif number==18:
  C(number,path(u*u,s.tan(alpha),x,g),0);roots=s.solve(path(750,zz,30)-18,zz)
  for v in roots:C(number,v,1)
  check(roots==[1,4],'all positive target roots');check(s.diff(path(750,1,x),x).subs(x,30)>0 and s.diff(path(750,4,x),x).subs(x,30)<0,'target directions differ')
 elif number==19:
  speed2=s.solve(path(u*u,s.Rational(3,2),50)-s.Rational(5,8)*path(u*u,s.Rational(3,2),20),u*u)[0];H=path(speed2,s.Rational(3,2),20);C(number,s.sqrt(speed2));C(number,H);check(H>0 and path(speed2,s.Rational(3,2),50)>0,'both observations before ground return')
 elif number==20:
  speed2=s.solve(path(u*u,s.Rational(1,2),4*a,g)-3*a/2,u*u)[0];C(number,speed2,0);vx=s.sqrt(speed2/(1+s.Rational(1,4)));vy=vx/2;remaining=s.Rational(2,3)*2*vy/g;range_=vx*2*vy/g;Qa=range_/remaining;Qb=g*remaining/2;C(number,s.simplify(Qa*Qa+Qb*Qb),1);C(number,s.simplify(Qb/Qa),1)
 elif number==21:
  speed2=s.solve(path(u*u,s.Rational(3,2),4*a,g)-11*a/2,u*u)[0];C(number,speed2,0);vx=s.sqrt(speed2/(1+s.Rational(9,4)));vy=3*vx/2;R=s.simplify(vx*2*vy/g);C(number,R,1);Qa=vx;Qb=vy/2;C(number,s.simplify(s.sqrt(Qa*Qa+Qb*Qb)),2);C(number,s.simplify(Qb/Qa),2)
 elif number==22:
  roots=s.solve(s.Rational(2,3)*path(800,zz,16)-path(400,zz,16),zz);check(roots==[s.Rational(1,2),2],'both obstacle settings')
  for v in roots:
   H=path(800,v,16);check(H>0,'positive obstacle height');point_in_text(q['parts'][1]['answer_html'],H,v,'printed height/tangent pair '+str(v));C(number,s.simplify(40*v*v/(1+v*v)),2)
 elif number==23:
  C(number,path(u*u,zz,x,g),0);speed2=s.solve(path(u*u,2,24)-12,u*u)[0];C(number,s.sqrt(speed2),1);roots=s.solve(path(speed2,zz,24)-12,zz);check(roots==[s.Rational(4,3),2],'second launch root');C(number,s.Rational(4,3),1)
  for v in roots:C(number,s.simplify(24*s.sqrt(1+v*v)/s.sqrt(speed2)),2)
 elif number==24:
  C(number,2*u*u*s.sin(th)*s.cos(th)/g,0);C(number,u*u*s.sin(th)**2/(2*g),0);C(number,4*s.cot(th),0);C(number,s.Rational(4,3),1)
  poly=path(625,s.Rational(4,3),x);dy=s.diff(poly,x);lo=s.solve(dy-s.Rational(1,2),x)[0];hi=s.solve(dy+s.Rational(1,2),x)[0];C(number,lo,2);C(number,hi,2);check(r'\lt x\lt' in q['parts'][2]['answer_html'],'strict direction interval');check(lo>0 and hi<max(s.solve(poly,x)),'direction interval before landing')
 elif number==25:
  speed2=s.solve(s.Eq(3*a/5+4*V/5*(4*a/(3*V))-g*(4*a/(3*V))**2/2,a),V*V)[0];C(number,speed2,0);bottom=speed2+16*a*g/5;C(number,s.simplify(mm*(g+bottom/a)),1);C(number,s.simplify(mm*(speed2/a-3*g/5)),1);check(s.simplify(speed2/a-3*g/5)>0,'minimum pre-cut tension positive')
 elif number==26:
  C(number,path(u*u,s.tan(alpha),x,g),0);X=2*u*u/(5*g);Y=u*u/(10*g);C(number,X,1);C(number,Y,1);roots=s.solve(path(u*u,zz,X,g)-Y,zz);check(roots==[s.Rational(1,2),s.Rational(9,2)],'other apex-reaching angle');C(number,s.atan(s.Rational(9,2)),2);gradient=s.diff(path(u*u,s.Rational(9,2),x,g),x).subs(x,X);C(number,s.simplify(gradient),2)
 elif number==27:
  speed2=s.solve(path(u*u,3,12)-24,u*u)[0];C(number,speed2,0);poly=s.factor((30-path(speed2,zz,30))*s.Rational(2,15));exact(poly,zz*zz-4*zz+5,'target angle polynomial');C(number,poly,1);C(number,s.discriminant(poly,zz),1);check(s.discriminant(poly,zz)<0,'no real target launch setting')

def fields(q):return {f['key']:f for f in q['fields']}
def ivp(d):
 A=s.Rational(d['a']);B=s.Rational(d['b']);H=s.Rational(d.get('h',0));G=s.Rational(d['g']);return A,B,H,G
for item in fixtures['quick']:
 active=item['uid'];d=item['model'];q=qby[active];fs=fields(q);check(digest(q)==item['contentSha256'],'immutable quick '+active);v=lambda key:P(fs[key]['expected']);kind=d['kind']
 if kind=='logic':check(fs['reason']['expected']==d['answer'],'independently reviewed modelling principle '+active);continue
 if kind=='state':
  aa,bb,hh,gg=ivp(d);at=s.Rational(d['t']);expected=dict(x=aa*at,y=height(bb,at,hh,gg),vx=aa,vy=bb-gg*at,speed=s.sqrt(aa*aa+(bb-gg*at)**2))
 elif kind=='landing':
  aa,bb,hh,gg=ivp(d);time=positive_root(height(bb,tt,hh,gg));expected=dict(time=time,distance=aa*time,vy=bb-gg*time,speed=s.sqrt(aa*aa+(bb-gg*time)**2))
 elif kind=='crossings':
  aa,bb,hh,gg=ivp(d);roots=s.solve(height(bb,tt,hh,gg)-d['level'],tt);actual=[P(r) for r in fs['times']['expected'].strip('{}').split(',')];check(set(roots)==set(actual),'every crossing root '+active);check(all(r>0 and r<2*bb/gg for r in roots),'all crossings airborne '+active);expected=dict(separation=aa*(roots[-1]-roots[0]),minimum=aa)
 elif kind=='trajectory':
  aa,bb,hh,gg=ivp(d);poly=hh+bb*x/aa-gg*x*x/(2*aa*aa);xx=aa*bb/gg;expected=dict(polynomial=poly,apex_x=xx,apex_y=poly.subs(x,xx));exact(s.diff(poly,x).subs(x,xx),0,'apex derivative '+active)
 elif kind=='target':
  eq=path(d['speed2'],zz,d['X'],d['g'])-d['Y'];roots=s.solve(eq,zz);actual=[P(r) for r in fs['roots']['expected'].strip('{}').split(',')];check(set(actual)==set(roots),'complete launch root set '+active)
  pairs=[tuple(P(c) for c in p[1:-1].split(',')) for p in fs['pairs']['expected'].split(';')];check(len(pairs)==len(roots),'complete matched arrival pairs '+active)
  for tangent,time in pairs:check(tangent in roots,'root in matched pair '+active);exact(d['X']*s.sqrt(1+tangent*tangent)/s.sqrt(d['speed2']),time,'matched flight time '+active);check(time>0,'positive arrival time '+active)
  expected={}
 elif kind=='wall_interval':
  poly=P(d['polynomial']);lo=max(s.solve(poly-d['height'],x));hi=max(s.solve(poly,x));check(fs['interval']['expected']=='['+str(lo)+','+str(hi)+')','whole interval with distinct endpoints '+active);check(lo>d['after'],'later descending branch '+active);expected={}
 elif kind=='delayed':
  aa,bb,hh,gg=ivp(d);age=d['delay']+d['elapsed'];X=aa*age;Y=height(bb,age,0,gg);expected=dict(vx=X/d['elapsed'],vy=(Y+gg*d['elapsed']**2/2)/d['elapsed'],x=X,height=hh+Y);check(hh+Y>0,'meeting above ground '+active)
 elif kind=='rebound':
  aa,bb,hh,gg=ivp(d);time=positive_root(height(bb,tt,hh,gg));out=-P(d['e'])*aa;expected=dict(vx=out,vy=bb,time=time,distance=-out*time)
 elif kind=='tangent':
  X=s.Rational(d['X']);Y=s.Rational(d['Y']);aa=-Y*d['speed']/d['radius'];bb=X*d['speed']/d['radius'];time=positive_root(height(bb,tt,Y,d['g']));expected=dict(vx=aa,vy=bb,time=time,x=X+aa*time);exact(aa*X+bb*Y,0,'velocity perpendicular to radius '+active);exact(aa*aa+bb*bb,d['speed']**2,'tangent speed '+active)
 else:raise ValueError(kind)
 for key,value in expected.items():exact(v(key),value,'complete answer field '+active+' '+key);contains(q['answer_html'],s.sympify(value),'printed short result '+active+' '+key)

for d in fixtures['examples']:
 active=d['id'];e=next(e for l in package['lessons'] for e in l['examples'] if e['verification']==active);check(digest(e)==d['contentSha256'],'immutable example '+active);kind=d['kind']
 if kind in ['state','landing','crossings','trajectory','infer']:
  aa,bb,hh,gg=ivp(d)
  if kind=='state':
   at=d['t'];values=[aa*at,height(bb,at,hh,gg),aa,bb-gg*at,s.sqrt(aa*aa+(bb-gg*at)**2)]
  elif kind=='landing':
   time=positive_root(height(bb,tt,hh,gg));exact(time,P(d['time']),'example landing time');values=[time,aa*time,bb-gg*time,s.sqrt(aa*aa+(bb-gg*time)**2)]
  elif kind=='crossings':
   roots=s.solve(height(bb,tt,hh,gg)-d['level'],tt);check(set(roots)==set(map(P,d['times'])),'both example crossings');values=roots+[aa*(roots[1]-roots[0]),aa]
  elif kind=='trajectory':
   poly=hh+bb*x/aa-gg*x*x/(2*aa*aa);exact(poly,P(d['polynomial']),'example full trajectory');xx=aa*bb/gg;exact(poly.subs(x,xx),P(d['apex'][1]),'example apex height');values=[poly,xx,poly.subs(x,xx)]
  else:
   for at,sp2 in zip(d['times'],d['speeds2']):exact(aa*aa+(bb-gg*at)**2,sp2,'example observed speed');check(height(bb,at,hh,gg)>0,'observed flight valid')
   exact(positive_root(height(bb,tt,hh,gg)),P(d['landing']),'inferred landing time');values=[aa,bb,height(bb,3,hh,gg)]
 elif kind=='target':
  roots=s.solve(path(d['speed2'],zz,d['X'],d['g'])-d['Y'],zz);check(set(roots)==set(map(P,d['roots'])),'example complete target roots');values=[]
  for root,time,gradient in zip(roots,d['times'],d['gradients']):exact(d['X']*s.sqrt(1+root*root)/s.sqrt(d['speed2']),P(time),'example target arrival');exact(s.diff(path(d['speed2'],root,x,d['g']),x).subs(x,d['X']),P(gradient),'example target direction');values.extend([root,P(time)])
 elif kind=='wall_interval':
  poly=P(d['polynomial']);exact(max(s.solve(poly-d['height'],x)),P(d['lower']),'example interval lower');exact(max(s.solve(poly,x)),P(d['upper']),'example interval upper');values=[P(d['lower']),P(d['upper'])]
 elif kind=='unreachable':
  eq=s.factor(d['Y']-path(d['speed2'],zz,d['X'],d['g']));exact(eq,P(d['polynomial']),'example inaccessible polynomial');exact(s.discriminant(eq,zz),d['discriminant'],'example negative discriminant');values=[d['discriminant']]
 elif kind=='delayed':
  aa,bb,hh,gg=ivp(d);age=d['delay']+d['elapsed'];Qa=aa*age/d['elapsed'];Qb=(height(bb,age,0,gg)+gg*d['elapsed']**2/2)/d['elapsed'];exact(Qa,P(d['Qa']),'example delayed horizontal');exact(Qb,P(d['Qb']),'example delayed vertical');values=[Qa,Qb,hh+height(bb,age,0,gg)]
 elif kind=='powered':
  time=P(d['time']);aa=P(d['a']);bb=P(d['b']);exact(aa*time,d['targetX']+d['targetV']*time,'example powered target horizontal');exact(height(bb,time,0,d['g']),d['targetY'],'example powered target height');exact(bb/aa,P(d['slope']),'example launch angle');values=[time,aa,bb,s.sqrt(aa*aa+bb*bb)]
 elif kind=='rebound':
  aa,bb,hh,gg=ivp(d);out=-aa*P(d['e']);time=positive_root(height(bb,tt,hh,gg));exact(time,P(d['time']),'example rebound landing');exact(-out*time,P(d['distance']),'example rebound distance');values=[out,bb,time,-out*time]
 elif kind=='cut':
  X=P(d['X']);Y=P(d['Y']);speed2=P(d['speed2']);exact(X*X+Y*Y,1,'release point on unit-scaled circle');at=X/(Y*s.sqrt(speed2));exact(Y+X*s.sqrt(speed2)*at-at*at/2,d['targetY'],'release target height in scaled units');bottom=speed2+2*(Y+1);exact(bottom,P(d['bottomSpeed2']),'pre-cut energy');exact(bottom+1,P(d['bottomTension']),'bottom tension');exact(speed2-Y,P(d['cutTension']),'cut tension');check(P(d['cutTension'])>0,'string remains taut');values=[speed2*a*g,P(d['bottomSpeed2'])*a*g,P(d['bottomTension'])*mm*g,P(d['cutTension'])*mm*g]
 else:raise ValueError(kind)
 for value in values:contains(e['solution'],s.sympify(value),'actual displayed example '+active+' '+str(value))
active='structure';check(len(source)==27 and sum(q['marks'] for q in source)==219 and sum(len(q['parts']) for q in source)==70,'all 27 tasks, 70 parts and 219 marks');check(all(str(i) in coverage for i in range(1,28)),'evidence for all owner tasks')
for f in fixtures['owner']:
 q=qby[f['uid']];original=f['original'];check(digest(q)==f['contentSha256'],'immutable owner '+f['uid'])
 check([[(c['marks'],c['description_html']) for c in part['marking_criteria']] for part in q['parts']]==[[(c['marks'],c['criterion_html']) for c in part['criteria']] for part in original['parts']],'all owner criteria unchanged '+f['uid'])
for l in package['lessons']:check(digest(l)==fixtures['teachingDigests'][l['id']],'teaching fingerprint '+l['id']);check(sum(q['lesson']==l['key'] and q['collection']=='exam' for q in package['questions'])==9,'nine written tasks '+l['key'])
for im in package['assets']:check(hashlib.sha256(Path(im['path']).read_bytes()).hexdigest()==im['sha256'],'image byte hash '+im['file_id'])
if args.source:
 f=Path(args.source);data=json.loads(f.read_text(encoding='utf-8-sig'));check(hashlib.sha256(f.read_bytes()).hexdigest()==package['source']['sha256'],'read-only owner SHA');check([q for l in data['lessons'] for q in l['questions']]==source,'unchanged owner source, keys and guidance')
report=dict(checks=len(checks),actualTeXClaims=claimed,failures=failures,coverage=coverage,sourceTasks=27,quickChecks=24,workedExamples=12,externalTeacherReview=False,method='Independent exact constant-acceleration derivations; complete angle/time roots, first-impact and strict-interval tests, restitution in normal/tangent components, finite-segment recontact and pre-cut energy/tension. Printed TeX results are parsed and compared at deterministic 50-digit points; these samples are not asserted to be universal symbolic proofs. All quick-answer fields reconstructed from the stated data; immutable owner criteria and image hashes verified.')
Path(args.report).write_text(json.dumps(report,indent=2,default=str)+'\n',encoding='utf8');print(json.dumps({k:v for k,v in report.items() if k!='coverage'},default=str));raise SystemExit(bool(failures))
