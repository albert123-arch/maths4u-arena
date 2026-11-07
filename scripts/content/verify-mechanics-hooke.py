"""Independent hooke dynamics, event-order and actual printed-answer audit."""
import argparse,hashlib,html,json,re
from functools import lru_cache
from pathlib import Path
import sympy as s
from sympy.parsing.latex import parse_latex
from sympy.core.function import AppliedUndef
ap=argparse.ArgumentParser();ap.add_argument('--source');ap.add_argument('--report',default='docs/ARENA-C5-MECHANICS-HOOKE-MATH-CHECKS-20261107.json');args=ap.parse_args()
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

package=json.loads(Path('content/original/9231-mechanics/hooke-v1.json').read_text(encoding='utf8'));fixtures=json.loads(Path('content/original/9231-mechanics/hooke-verification-v1.json').read_text(encoding='utf8'))
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
 part_coverage.add((number,part));contains(qmap[number]['parts'][part]['answer_html'],value,'printed owner '+str(number)+'/'+str(part+1)+' '+str(value))
def verbal(number,part,phrase,label):
 part_coverage.add((number,part));check(phrase.lower() in qmap[number]['parts'][part]['answer_html'].lower(),label)
def energy(extension,modulus=1,natural=1):return S(modulus)*S(extension)**2/(2*S(natural))
def hanging(extension,modulus,weight=1,sine=1):return energy(extension,modulus)-S(weight)*S(sine)*S(extension)
def string_energy(length,modulus=1,natural=1):return energy(s.Max(S(length)-S(natural),0),modulus,natural)
def physical_root(expr,condition):
 roots=s.solve(expr,x);selected=[v for v in roots if condition(v)];check(len(selected)==1,'one admissible next-event root');return selected[0]
for n in range(1,32):
 active=n;print('OWNER '+str(n),flush=True)
 if n==1:
  leftK=lam/R(6,5);rightK=(2*lam/3)/R(4,5);position=s.solve(s.Eq(leftK*(x-R(6,5)),rightK*(3-x-R(4,5))),x)[0];C(n,position);C(n,leftK*(position-R(6,5)));K=s.simplify(leftK+rightK);modulus=s.solve(s.Eq(K*R(1,5)**2/2,R(3,2)*2**2/2),lam)[0];C(n,modulus,1);stiffness=K.subs(lam,modulus);speed=s.sqrt(stiffness/R(3,2)*(R(1,5)**2-R(3,25)**2));C(n,speed,2);C(n,stiffness*R(3,25),2);margin=min(position-R(6,5),3-position-R(4,5));C(n,s.sqrt(stiffness/R(3,2))*margin,3);check(margin>R(1,5),'calibration motion remains uncompressed')
 elif n==2:
  Utaut=energy(x-1)+energy(3-x);equilibrium=s.solve(s.diff(Utaut,x),x)[0];C(n,equilibrium*a);C(n,(equilibrium-1)*mm*g);initial=string_energy(R(1,2))+string_energy(5-R(1,2),2,2);atNatural=string_energy(1)+string_energy(4,2,2);C(n,s.sqrt(2*(initial-atNatural)*a*g),1);v2=s.factor(2*(initial-Utaut));C(n,v2.subs(x,z)*a*g,2);C(n,s.sqrt(v2.subs(x,equilibrium)*a*g),2);turn=physical_root(energy(x-1)-initial,lambda v:v>3);C(n,turn*a,3);verbal(n,3,'right string is slack','right member switched off before final turn');exact(2*(initial-Utaut.subs(x,3)),2*(initial-energy(2)),'speed continuous at right-slack boundary');check(turn<5,'stop before reaching right anchor')
 elif n==3:
  cosine=R(1,2);tension=1/cosine;length=1+tension/4;radius=length*s.sqrt(1-cosine**2);w2=tension/length;C(n,length*a);C(n,radius*a);C(n,s.sqrt(w2*radius**2*a*g));low=4/(4+S(1));high=4*S(3)/(4+3);C(n,low*g/a,1);C(n,high*g/a,1);raw=qmap[n]['parts'][1]['answer_html'];check(r'\lt' in raw and (r'\leq' in raw or r'\le' in raw),'strict nondegenerate lower and included cap upper bounds');newLength=s.solve(s.Eq(4*(x-1),2*w2*x),x)[0];newTension=4*(newLength-1);C(n,newTension*mm*g,2);C(n,s.acos(2/newTension),2);verbal(n,2,'not permitted','mass replacement exceeds force cap');check(newTension>3 and 2/newTension<1,'theoretical conical motion real but over tension cap');exact(s.diff(4*x/(4+x),x),16/(4+x)**2,'angular speed coefficient increases with tension')
 elif n==4:
  ks=S(75);mass=S(3);eq=1+mass*10/ks;C(n,eq);D=s.sqrt((mass*R(4,5)**2+ks*(R(38,25)-eq)**2)/ks);C(n,D,1);C(n,ks*D/10,1);C(n,eq-D,2);C(n,ks*(eq-D-1),2);verbal(n,3,'No','string replacement stays in positive extension');check(eq-D>1,'full vertical interval stays stretched');q=s.Symbol('q');oldPotential=ks*(q+eq-1)**2/2-mass*10*(q+eq);exact(s.expand(oldPotential-oldPotential.subs(q,0)),ks*q*q/2,'energy square about new equilibrium')
 elif n==5:
  sine=R(3,5);modulus=5*sine/R(1,2);eq=sine/modulus;C(n,modulus);C(n,(1+eq)*a);start=R(1,2);D=start-eq;C(n,s.sqrt(modulus*D*D*a*g),1);turn=2*eq-start;C(n,(1+turn)*a,1);C(n,modulus*max(start,-turn)*mm*g,2);C(n,modulus*D*g,2);total=hanging(start,modulus,sine=sine);natural=hanging(0,modulus,sine=sine);vNatural2=2*(total-natural);slackRise=vNatural2/(2*sine);C(n,(1-slackRise)*a,3);check(0<1-slackRise<1,'incline string stops in slack region before anchor')
 elif n==6:
  U=energy(12-x,6,3)+energy(x-5,5,5)+k*x;position=s.solve(s.diff(U,x),x)[0];C(n,position*a);C(n,14);raw=qmap[n]['parts'][0]['answer_html'];check('0' in raw and r'\lt' in raw,'positive mass and strict both-taut boundaries');massratio=s.solve(s.Eq(U.subs(x,12),U.subs(x,5)),k)[0];C(n,massratio,1);check(0<massratio<14,'vertical paired-string mass inside taut domain');check(5<position.subs(k,massratio)<12,'equilibrium within both-taut segment')
 elif n==7:
  tension=s.sqrt(12**2+5**2);length=R(6,5)*(1+tension/52);C(n,tension);C(n,length*12/tension,1)
 elif n==8:
  modulus=S(3);start=R(1,2);lo=energy(start,modulus)/start;hi=modulus*start;C(n,lo);C(n,hi);raw=qmap[n]['parts'][0]['answer_html'];check((r'\leq' in raw or r'\le' in raw) and r'\lt' in raw,'friction interval includes natural-length stop but excludes no-start limit');mu=S(1);turn=physical_root(energy(start,modulus)-energy(x,modulus)-mu*(start-x),lambda v:v<start);C(n,turn*a,1);verbal(n,1,'remains','first stop remains at rest');check(0<turn<start and modulus*turn<=mu,'first stop taut and static friction sufficient')
 elif n==9:
  U=energy(x-1,12)+x;turn=physical_root(U-U.subs(x,R(1,2)),lambda v:v>R(1,2));C(n,(turn-1)*a);C(n,(12*R(1,2)-1)*g,1);check(turn>1,'guided standing spring passes from compression to extension')
 elif n==10:
  eq=R(1,8);turn=2*eq-R(3,8);C(n,(1+turn)*a);C(n,-turn*a);check(0<1+turn<1,'hanging spring positive length but compressed')
 elif n==11:
  U=hanging(x,6);E=U.subs(x,1);roots=s.solve(s.Eq(2*(E-U),4),x);check(roots==[0,R(1,3)],'both equal-speed crossings retained before selecting first');first=max(roots);C(n,(1+first)*a);minimum=s.solve(s.diff(U,x),x)[0];C(n,s.sqrt(2*(E-U.subs(x,minimum))*a*g),1);check(0<minimum<first<1,'greatest speed after first selected passage')
 elif n==12:
  sine=R(3,4);modulus=S(3);initial=string_energy(R(5,4),modulus)+sine*R(5,4);position=1+sine/modulus;minimum=string_energy(position,modulus)-sine*position;C(n,position*a);C(n,s.sqrt(2*(initial-minimum)*a*g),1);check(sine>0 and position>1,'potential decreases across slack region before downhill taut minimum')
 elif n==13:
  sine=R(1,2);friction=R(31,80);turn=physical_root((sine-friction)*x-energy(x-1),lambda v:v>1);C(n,turn*a);required=(turn-1)-sine;C(n,required*mm*g,1);verbal(n,1,'down the plane','static friction reverses relative to earlier sliding');check(0<required<friction,'final rest within static bound')
 elif n==14:
  D=physical_root(energy(1+x,3,3)-(4+x),lambda v:v>0);C(n,D*a);C(n,s.sqrt(6*a*g),1);exact(energy(1+D,3,3),4+D,'energy zero at just-reaching anchor');check(4+D>4,'initial point below energy minimum');exact(energy(0,3,3),0,'natural-length elastic term zero')
 elif n==15:
  span=S(3);depth=S(4);length=s.sqrt(span*span+depth*depth);T=length/(2*depth);modulus=T*span/(length-span);C(n,modulus*mm*g);start=R(36,5);U=lambda Y:2*energy(s.sqrt(span*span+Y*Y)-span,modulus,span)-Y;exact(U(start),U(0),'symmetric suspension reaches support level at zero speed');verbal(n,1,'first stops','source states first stop at support level');# U(Y)<0 for 0<Y<36/5: rationalise L−3=Y²/(L+3).
  Y=s.Symbol('Y',positive=True);ratio=modulus*Y**3/(span*(s.sqrt(span*span+Y*Y)+span)**2);derivative=s.simplify(s.diff(s.log(ratio),Y));exact(derivative,(1+2*span/s.sqrt(span*span+Y*Y))/Y,'symmetric logarithmic energy-ratio derivative');check(((1+2*span/s.sqrt(span*span+Y*Y))/Y).is_positive,'symmetric energy ratio strictly increasing for every positive depth');exact(ratio.subs(Y,start),1,'only nonzero zero-energy endpoint');check(all(U(R(v,10))<0 for v in [1,15,40,60,71]),'sampled cross-check of strictly negative interior potential')
 elif n==16:
  sine=R(4,5);first2=2*(hanging(R(3,4),k,sine=sine)-hanging(R(1,4),k,sine=sine));second2=2*(hanging(R(3,4),k,sine=sine)-hanging(-R(1,2),k,sine=sine));modulus=s.solve(s.Eq(second2,first2/4),k)[0];C(n,modulus);turn=2*sine/modulus-R(3,4);C(n,(1+turn)*a,1);check(0<1+turn<R(1,2),'second speed measured before next turn during compression');check(second2.subs(k,modulus)>0,'second measured speed positive')
 elif n==17:
  U=lambda L:2*energy(L-3,6,3);length=physical_root(U(x)-U(4)-6,lambda v:v>=4);C(n,length*a);depth=s.sqrt(length*length-16);tension=6*(length-3)/3;C(n,2*tension*depth/length*g,1);C(n,6*(4-3)/3*mm*g,2);verbal(n,2,'equal and opposite','nonzero half-string tensions cancel at midpoint')
 elif n==18:
  modulus=s.solve(s.Eq(energy(2,k)-R(12,5),R(8,5)),k)[0];C(n,modulus);tension=2*modulus;rod=tension*R(3,5)/R(4,5);holding=1-tension*R(4,5)-rod*R(3,5);C(n,abs(holding)*mm*g,1);verbal(n,1,'downwards','holding force points down');C(n,rod*mm*g,2);verbal(n,2,'tensile','rod force is a pull');exact(tension*R(3,5)-rod*R(4,5),0,'rod-system horizontal balance');exact(tension*R(4,5)+rod*R(3,5)+holding-1,0,'rod-system vertical balance')
 elif n==19:
  initial=string_energy(R(5,2),4)-R(5,2);target=-R(1,2);C(n,s.sqrt(2*(initial-target)*a*g));C(n,(4*R(3,2)-1)*g,1);check(R(1,2)<1,'target lies in slack branch')
 elif n==20:
  modulus=(5-2)/(R(3,4)**2-R(1,4)**2);C(n,modulus*mm*g);C(n,modulus*R(3,4)*mm*g,1)
 elif n==21:
  turn=physical_root(energy(x,3)+x/4-R(1,2),lambda v:v>0);C(n,turn*a);verbal(n,1,'No','rough launch does not remain at first stop');check(3*turn>R(1,4),'spring overcomes maximum static friction on return')
 elif n==22:
  velocity2=s.solve(s.Eq((1-R(4,9))*x,5*(R(3,5)**2-R(1,5)**2)),x)[0];C(n,s.sqrt(velocity2*a*g));C(n,5*R(3,5)*g,1);verbal(n,1,'towards','elastic acceleration directed towards anchor')
 elif n==23:
  start=R(3,8);eq=R(4,8);U=lambda E:energy(E,8)-4*E;speed2=2*(U(start)-U(start+R(1,8)))/4;C(n,s.sqrt(speed2*a*g));C(n,(2*eq-start)*a,1);check(start>0 and 2*eq-start>0,'held load addition remains taut')
 elif n==24:
  C(n,2*a/(x-a));extension=s.solve(s.Eq(R(5,2)-(2/x)*(x+R(1,4))/2,R(1,2)),x)[0];C(n,(1+extension)*a,1);check(extension>0,'unknown initial string stretched');exact(2/extension,8,'load-change inferred modulus')
 elif n==25:
  mass=R(3,2);natural=R(3,5);modulus=S(30);force=mass*10*R(4,5);turn=physical_root(energy(x,modulus,natural)-force*x-mass*R(12,5)/2,lambda v:v>0);C(n,turn);check(turn>0,'numerical descent positive extension')
 elif n==26:
  extension=s.solve(s.Eq(2*(hanging(x,8)-hanging(x-R(1,4),8)),R(3,2)),x)[0];C(n,extension*a);eq=R(1,8);maximum2=8*(extension-eq)**2;C(n,s.sqrt(maximum2*a*g),1);check(extension-R(1,4)>0,'speed measurement still in taut phase')
 elif n==27:
  ratio=physical_root(2*x*x/(1+x)-energy(R(1,3),6),lambda v:v>0);C(n,ratio);shared=2*ratio/(1+ratio);lost=2*ratio-(1+ratio)*shared**2/2;C(n,lost*mm*g*a,1);check(lost>0,'coalescing collision dissipates energy');exact((1+ratio)*shared**2/2,energy(R(1,3),6),'only post-impact energy becomes spring energy')
 elif n==28:
  start=R(3,4);modulus=S(4);C(n,(modulus*start-1)*g);C(n,s.sqrt(2*(hanging(start,modulus)-hanging(0,modulus))*a*g),1);turn=2/modulus-start;C(n,(1+turn)*a,2);check(0<1+turn<1,'spring remains positive length while compressing')
 elif n==29:
  ratio=physical_root(R(3,8)*(1+x)*(R(3,2)/(1+x)**2)-energy(R(1,4),6),lambda v:v>0);C(n,ratio);smooth=6*R(1,4)/(1+ratio);mu=R(3,4)-smooth;C(n,mu,1);C(n,smooth*g,1);C(n,(smooth+mu)*g,1);verbal(n,1,'continuous','rough-strip speed remains continuous');check(mu>0,'rough strip friction positive');exact(R(3,2)/(1+ratio)**2-R(2)*energy(R(1,4),6)/(1+ratio),R(3,2)/(4*(1+ratio)**2),'speed ratio before non-impulsive strip entry')
 elif n==30:
  sine=energy(R(1,3),4)/R(1,3);C(n,s.asin(sine));check(0<sine<1,'incline angle acute')
 elif n==31:
  modulus=(4-1)/R(1,2);C(n,modulus*mm*g);initial2=R(11,2)+3+2*energy(R(1,2),modulus);C(n,s.sqrt(initial2*a*g),1);top=physical_root(x+energy(x-1,modulus)-initial2/2,lambda v:v>1);C(n,top*a,2);check(top>R(3,2),'observed rising point occurs before upper turn')

def calculated(data):
 d={k:(P(v) if isinstance(v,(str,int)) and k not in ['kind','answer'] else v) for k,v in data.items()};kind=d['kind']
 if kind=='calibration':
  f1,f2=map(P,d['forces']);l1,l2=map(P,d['lengths']);K=(f2-f1)/(l2-l1);natural=l1-f1/K;check(K>0 and natural>0,'positive calibrated stiffness and natural length');return dict(stiffness=K,natural=natural,modulus=K*natural)
 if kind=='holding':
  T0=s.sqrt(d['weight']**2+d['horizontal']**2);e=T0*d['natural']/d['modulus'];depth=(d['natural']+e)*d['weight']/T0;return dict(tension=T0,extension=e,depth=depth)
 if kind=='load_add':
  start=d['old']/d['modulus'];U=lambda E:energy(E,d['modulus'])-d['new']*E;eq=s.solve(s.diff(U(x),x),x)[0];turn=2*eq-start;v2=2*(U(start)-U(eq))/d['new'];check(start>0 and turn>0,'held-load motion stays taut');return dict(initial=start,equilibrium=eq,speed2=v2,maximum=turn)
 if kind=='energy_work':
  K=d['modulus']/d['natural'];E=energy(d['end'],d['modulus'],d['natural']);W=E-energy(d['start'],d['modulus'],d['natural']);exact(s.integrate(K*x,(x,d['start'],d['end'])),W,'integral equals elastic energy difference');return dict(force=-K*d['end'],energy=E,work=W)
 if kind=='vertical_spring':
  U=lambda E:hanging(E,d['modulus']);eq=s.solve(s.diff(U(x),x),x)[0];turn=2*eq-d['start'];check(0<1+turn<1,'guided spring next turn during compression at positive length');return dict(turn=turn,length=1+turn,speed2=2*(U(d['start'])-U(eq)))
 if kind=='incline_launch':
  modulus=d['modulus'];sine=d['sine'];U=lambda E:hanging(E,modulus,sine=sine);extension=physical_root(U(x)-d['initial2']/2,lambda v:v>0);eq=sine/modulus;return dict(extension=extension,speed2=d['initial2']-2*U(eq),tension=modulus*extension)
 if kind=='two_springs':
  D=d['distance'];l1=d['leftNatural'];l2=d['rightNatural'];K1=d['leftModulus']/l1;K2=d['rightModulus']/l2;U=lambda q:energy(q-l1,d['leftModulus'],l1)+energy(D-q-l2,d['rightModulus'],l2);eq=s.solve(s.diff(U(x),x),x)[0];displacement=d['displacement'];check(eq-displacement>l1 and D-(eq+displacement)>l2,'both spring extensions positive along motion');return dict(position=eq,tension=K1*(eq-l1),speed2=s.simplify(2*(U(eq+displacement)-U(eq))))
 if kind=='vertical_pair':
  D=d['distance'];l1=d['upperNatural'];l2=d['lowerNatural'];K1=d['upperModulus']/l1;K2=d['lowerModulus']/l2;U=energy(D-x-l1,d['upperModulus'],l1)+energy(x-l2,d['lowerModulus'],l2)+k*x;eq=s.solve(s.diff(U,x),x)[0];upperBound=s.solve(s.Eq(eq,l2),k)[0];lowerBound=-K2*(D-l1-l2);check(lowerBound<0<upperBound,'intersect taut interval with positive mass');return dict(position=eq,interval='(0,'+str(upperBound)+')',upper=K1*(D-l1-eq.subs(k,1)),lower=K2*(eq.subs(k,1)-l2))
 if kind=='friction_range':
  modulus=d['modulus'];start=d['start'];lo=energy(start,modulus)/start;hi=modulus*start;mu=(lo+hi)/2;turn=physical_root(energy(start,modulus)-energy(x,modulus)-mu*(start-x),lambda v:v<start);check(turn>0 and modulus*turn<mu,'first stop stretched and held by static friction');exact(energy(start,modulus)-lo*start,0,'included lower bound stops exactly at natural length');return dict(minimum=lo,upper=hi,interval='['+str(lo)+','+str(hi)+')',stop=turn)
 if kind=='slack_load':
  start=d['oldMass']/d['modulus'];natural2=2*(hanging(start,d['modulus'])-hanging(0,d['modulus']));minimum=1-natural2/2;check(natural2>0 and 0<minimum<1,'positive natural-length speed then stop below anchor in slack branch');return dict(speed2=natural2,minimum=minimum,acceleration=d['oldMass']-1)
 if kind=='cross_anchor':
  modulus=d['modulus'];sine=d['sine'];up=d['uphill'];initial=string_energy(up,modulus)+sine*up;U=lambda q:energy(q-1,modulus)-sine*q;eq=s.solve(s.diff(U(x),x),x)[0];check(eq>1 and sine>0 and up>1,'potential decreases through initial taut and slack phases');return dict(anchor2=2*initial,position=eq,speed2=2*(initial-U(eq)))
 if kind=='coalesce':
  mi=d['incomingMass'];mt=d['targetMass'];u0=d['incoming'];total=mi+mt;shared=mi*u0/total;KE=total*shared**2/2;compression=physical_root(energy(x,d['modulus'])-KE,lambda v:v>0);lost=mi*u0*u0/2-KE;check(0<compression<1 and lost>0,'coalescence loses energy and stops before zero spring length');return dict(shared=shared,compression=compression,lost=lost)
 raise ValueError(kind)

for item in fixtures['quick']:
 active=item['uid'];question=qby[active];fields={f['key']:f for f in question['fields']};data=item['model'];check(digest(question)==item['contentSha256'],'quick fingerprint '+active)
 if data['kind']=='logic':check(fields['reason']['expected']==data['answer'],'reviewed physical principle '+active);continue
 values=calculated(data);check(set(values)==set(fields),'every field independently recomputed '+active)
 for field,value in values.items():
  if fields[field]['type']=='set':check(fields[field]['expected']==value,'full interval and exact boundaries '+active);continue
  exact(P(fields[field]['expected']),value,'whole answer '+active+' '+field);contains(question['answer_html'],value,'actual printed quick '+active+' '+field)

for data in fixtures['examples']:
 active=data['id'];example=next(e for l in package['lessons'] for e in l['examples'] if e['verification']==active);check(digest(example)==data['contentSha256'],'example fingerprint '+active);kind=data['kind']
 if kind=='calibration':v=calculated({k:data[k] for k in ['kind','forces','lengths']});values=list(v.values())
 elif kind=='holding':v=calculated({k:data[k] for k in ['kind','weight','horizontal','natural','modulus']});values=[v['tension'],v['extension'],v['depth']]
 elif kind=='compression_equilibrium':
  natural=P(data['natural']);modulus=P(data['modulus']);compression=natural/modulus;values=[compression*a,(natural-compression)*a];exact(modulus*compression/natural,1,'standing spring force equals weight')
 elif kind=='load_add':
  v=calculated(dict(kind=kind,old=data['oldMass'],new=data['newMass'],modulus=data['modulus']));values=[v['initial']*a,v['equilibrium']*a,s.sqrt(v['speed2']*a*g),v['maximum']*a]
 elif kind=='energy_work':
  v=calculated({k:data[k] for k in ['kind','natural','modulus','start','end']});values=[abs(v['force']),v['energy'],v['work']]
 elif kind=='vertical_spring':
  v=calculated({k:data[k] for k in ['kind','modulus','start']});values=[v['turn']*a,v['length']*a,v['speed2']*a*g]
 elif kind=='incline_launch':
  v=calculated({k:data[k] for k in ['kind','modulus','sine','initial2']});values=[v['extension']*a];exact(v['extension'],P(data['extension']),'incline root selected from full energy equation')
 elif kind=='speed_measurements':
  modulus=(P(data['first2'])-P(data['second2']))/(P(data['secondExtension'])**2-P(data['firstExtension'])**2);values=[modulus*mm*g,modulus*P(data['secondExtension'])*mm*g]
 elif kind=='two_springs':
  v=calculated({k:data[k] for k in ['kind','distance','leftNatural','rightNatural','leftModulus','rightModulus','displacement']});values=[v['position']*a,v['tension']*mm*g,s.sqrt(v['speed2']*a*g)]
 elif kind=='vertical_pair':
  v=calculated({k:data[k] for k in ['kind','distance','upperNatural','lowerNatural','upperModulus','lowerModulus']});values=[v['position']*a,v['upper']*mm*g,v['lower']*mm*g];check(v['interval']=='(0,10)','complete strict positive-mass range example');contains(example['solution'],10,'actual upper mass-range endpoint example')
 elif kind=='friction_stop':
  modulus=P(data['modulus']);start=P(data['start']);mu=P(data['mu']);turn=physical_root(energy(start,modulus)-energy(x,modulus)-mu*(start-x),lambda v:v<start);values=[turn*a,modulus*turn*mm*g];check(modulus*start>mu and modulus*turn<mu,'motion starts then remains at first stop')
 elif kind=='symmetric_launch':
  l0=P(data['halfNatural']);b0=P(data['halfSpan']);y0=P(data['equilibriumDepth']);L=s.sqrt(b0*b0+y0*y0);tension=L/(2*y0);modulus=tension*l0/(L-l0);initialEnergy=2*energy(L-l0,modulus,l0);finalEnergy=2*energy(b0-l0,modulus,l0);final2=P(data['initial2'])+2*(initialEnergy-y0-finalEnergy);values=[modulus*mm*g,initialEnergy*mm*g*a,finalEnergy*mm*g*a,final2*a*g];check(final2>0,'symmetric launch reaches support level with positive speed');check(all(2*modulus*(s.sqrt(b0*b0+R(i,4)**2)-l0)*R(i,4)/(l0*s.sqrt(b0*b0+R(i,4)**2))<1 for i in range(1,16)),'potential increases towards supports on sampled interval')
 elif kind=='slack_load':
  v=calculated(dict(kind=kind,oldMass=data['oldMass'],modulus=data['modulus']));values=[v['speed2']*a*g,v['minimum']*a,v['acceleration']*g]
 elif kind=='cross_anchor':
  v=calculated({k:data[k] for k in ['kind','modulus','sine','uphill']});values=[v['position'],v['speed2']*a*g]
 elif kind=='coalesce':
  v=calculated({k:data[k] for k in ['kind','incomingMass','targetMass','incoming','modulus']});values=[v['shared']*s.sqrt(a*g),v['compression']*a,v['lost']*mm*g*a]
 elif kind=='rough_entry':
  modulus=P(data['modulus']);entry=P(data['entry']);mu=P(data['mu']);initial2=P(data['initial2']);entry2=initial2-2*energy(entry,modulus);turn=physical_root(energy(x,modulus)+mu*(x-entry)-initial2/2,lambda v:v>entry);values=[entry2*a*g,modulus*entry*g,(modulus*entry+mu)*g,turn*a];check(turn<1,'rough compression stops at positive length');exact(initial2/2,energy(turn,modulus)+mu*(turn-entry),'friction work counted only inside rough strip')
 else:raise ValueError(kind)
 for value in values:contains(example['solution'],s.simplify(value),'actual displayed example '+active+' '+str(value))

active='structure';check(len(source)==31 and sum(q['marks'] for q in source)==230 and sum(len(q['parts']) for q in source)==72,'all owner tasks, parts and marks');check(all(str(i) in coverage for i in range(1,32)),'evidence for all 31 source tasks');check(len(part_coverage)==72,'evidence for every owner part')
for item in fixtures['owner']:
 question=qby[item['uid']];original=item['original'];check(digest(question)==item['contentSha256'],'immutable owner '+item['uid']);check([[(c['marks'],c['description_html']) for c in p['marking_criteria']] for p in question['parts']]==[[(c['marks'],c['criterion_html']) for c in p['criteria']] for p in original['parts']],'unchanged owner criteria '+item['uid'])
for lesson in package['lessons']:check(digest(lesson)==fixtures['teachingDigests'][lesson['id']],'lesson fingerprint '+lesson['id']);check(sum(q['lesson']==lesson['key'] and q['collection']=='exam' for q in package['questions'])>=6,'at least six written '+lesson['key'])
for im in package['assets']:check(hashlib.sha256(Path(im['path']).read_bytes()).hexdigest()==im['sha256'],'image bytes '+im['file_id'])
if args.source:
 f=Path(args.source);original=json.loads(f.read_text(encoding='utf-8-sig'));check(hashlib.sha256(f.read_bytes()).hexdigest()==package['source']['sha256'],'read-only source SHA');check([q for l in original['lessons'] for q in l['questions']]==source,'unchanged source keys, criteria, marks and content')
report=dict(checks=len(checks),actualTeXClaims=claimed,failures=failures,coverage=coverage,sourceTasks=31,sourcePartsChecked=len(part_coverage),quickChecks=32,workedExamples=16,externalTeacherReview=False,method='Independent Hookean force laws, integrated elastic energy and gravitational potentials; separate spring/string branches, active-member geometry, reachable roots, first equal-speed passage, conical force caps, static versus sliding friction, momentum and coalescence loss, and non-impulsive friction boundaries. Every owner part and complete quick-answer field is checked. Symmetric first-event monotonicity is proved symbolically for owner Q15; supplementary sampled checks are distinguished from universal proofs. Actual printed TeX is parsed and compared at deterministic 50-digit points. Criteria, content fingerprints and image bytes are checked.')
Path(args.report).write_text(json.dumps(report,indent=2,default=str)+'\n',encoding='utf8');print(json.dumps({k:v for k,v in report.items() if k!='coverage'},default=str));raise SystemExit(bool(failures))
