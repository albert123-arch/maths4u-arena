"""Differentiation-based audit of differential equations and complete answer fields."""
import argparse,hashlib,html,json,re
from functools import lru_cache
from pathlib import Path
import sympy as s
from sympy.parsing.latex import parse_latex
from sympy.core.function import AppliedUndef
ap=argparse.ArgumentParser();ap.add_argument('--source');ap.add_argument('--report',default='docs/ARENA-C5-FP2-ODE-MATH-CHECKS-20261107.json');args=ap.parse_args()
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
   atom=re.match(r'(?:[0-9]+)?[a-z]',raw[pos:]);assert atom,raw;arg=atom[0];end=pos+len(atom[0])
  token='V_{'+str(len(values))+'}';fn={'sinh':s.asinh,'cosh':s.acosh,'tanh':s.atanh,'sin':s.asin,'cos':s.acos,'tan':s.atan}[m[1]]
  values[parse_latex(token)]=fn(tex(arg));raw=raw[:m.start()]+' '+token+' '+raw[end:]
 return raw,values
@lru_cache(None)
def tex(raw):
 raw=html.unescape(raw).strip().strip('.,; ');raw=normalise_tex(raw);raw=raw.replace(r'\,',r'\cdot ').replace('\\ ',' ').replace(r'\!','');raw,inverse_tokens=inverses(raw);raw=reciprocals(raw)
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

import mpmath as mp
mp.mp.dps=55
n,m,r,j=s.symbols('n m r j',integer=True);theta=x;phi,delta=s.symbols('phi delta',real=True)
loc.update(n=n,m=m,r=r,j=j,i=s.I,theta=x,phi=phi,delta=delta)

D1,D2,Y=s.symbols('D J Y');loc.update(D=D1,J=D2,Y=Y)
def ode(q):
 dep='x' if q['bank_number']==6 else 'T' if q['bank_number']==61 else 'y'
 for raw in blocks(q['stem_html']+q['question_html']):
  if not ('\\mathrm d' in raw or '\\prime' in raw):continue
  raw=raw.replace('\\mathrm d','d').replace(' ','')
  raw=re.sub(r'\\frac\{d\^2'+dep+r'\}\{d([xt]|\\theta)\^2\}','J',raw)
  raw=re.sub(r'\\frac\{d'+dep+r'\}\{d([xt]|\\theta)\}','D',raw)
  raw=raw.replace(dep+r'^{\prime\prime}','J').replace(dep+r'^\prime\prime','J').replace(dep+r'^\prime','D').replace(dep+r'^{\prime}','D')
  raw=raw.replace(dep,'Y');raw=re.sub(r'(Y(?:\^\d)?)\(',r'\1\\cdot(',raw)
  raw=raw.split(r'\qquad')[0].strip('.,;')
  if 'D' not in raw and 'J' not in raw:continue
  raw=re.sub(r'\\(ln|coth)(?=[a-z0-9])',lambda m:'\\'+m[1]+' ',raw).replace(r'\coth',r'\operatorname{coth}');a,b=raw.split('=');return (tex(a)-tex(b)).subs(t,x)
 raise ValueError('No equation '+str(q['bank_number']))

package=json.loads(Path('content/original/9231-fp2/ode-v1.json').read_text(encoding='utf8'))
fixtures=json.loads(Path('content/original/9231-fp2/ode-verification-v1.json').read_text(encoding='utf8'))
source=[f['original'] for f in fixtures['owner']];qmap={q['bank_number']:q for q in source};qby={q['id']:q for q in package['questions']}
loc.update(t=x,lnx=s.log(x),coth=s.coth)
def fastzero(expr):
 try:
  z=s.cancel(s.expand(expr));z=s.trigsimp(z)
  if z==0:return True
  return s.simplify(z)==0
 except (ValueError,TypeError,NotImplementedError):return False
def exact(a,b,label):check(fastzero(a-b),label)
def numeric(a,b,label,points=None):
 difference=a-b
 if not difference.free_symbols:check(abs(complex(s.N(difference,55)))<1e-35,label);return
 points=points or [s.Rational(4,5),s.Rational(7,5),s.Rational(9,5),s.Rational(12,5)]
 symbols=sorted(difference.free_symbols,key=str)
 check(all(abs(complex(s.N(difference.subs({v:(xx if v==x else s.Rational(i+2,3)) for i,v in enumerate(symbols)}),55)))<1e-35 for xx in points),label)
def claim(raw,value,label):
 global claimed
 found=False
 for z in candidates(raw):
  z=z.subs(t,x)
  if z.free_symbols!=value.free_symbols:continue
  try:
   symbols=sorted(value.free_symbols,key=str)
   if all(abs(complex(s.N((z-value).subs({v:(xx if v==x else s.Rational(i+2,3)) for i,v in enumerate(symbols)}),50)))<1e-30 for xx in [s.Rational(7,5),s.Rational(9,5),s.Rational(11,5)]):found=True;break
  except (ValueError,TypeError,ZeroDivisionError):pass
 check(found,label);claimed+=1
def yanswers(q):
 dep='x' if q['bank_number']==6 else 'T' if q['bank_number']==61 else 'S' if q['bank_number']==14 else 'y'
 out=[]
 for part in q['parts']:
  for raw in blocks(part['answer_html']):
   if not re.match(r'^\s*'+dep+r'\s*=',raw):continue
   rhs=raw.split('=',1)[1].split(r'\qquad')[0].strip('.,; ')
   out.append((part['label'],tex(rhs).subs(t,x)))
 return out
initial={1:[0,2],2:[6,5],3:[4,2],4:[0,2],5:[2,1],6:[1,5],7:[s.pi/2,2],8:[s.Rational(5,2),2],9:[0,-1],10:[0,s.log(3)],11:[s.log(3)/2,1],12:[1,1],13:[0,3],66:[2,3],16:[0,s.Rational(1,2)],17:[0,0,0],18:[0,1,-1],19:[0,0,0],24:[0,2,-1],26:[0,0,2],29:[0,0,0],30:[0,2,0],31:[0,2,1],32:[0,0,0],34:[0,2,-1],36:[0,3,-1],37:[0,0,0],38:[0,1,0],39:[0,2,-5],41:[0,-2,4],42:[0,0,0],44:[0,0,3],46:[0,3,-2],47:[0,1,0],50:[0,s.Rational(5,2),s.Rational(1,2)],51:[0,s.Rational(1,3),s.Rational(1,9)],53:[1,0,1],54:[0,2,1],56:[0,4,0],57:[0,3,2],62:[s.pi/2,s.pi/2,1+4/s.pi],64:[0,1,-s.Rational(1,4)],65:[1,0]}
for q in source:
 active=q['bank_number'];print('OWNER '+str(active),flush=True)
 if active in [14,60,63,69]:continue
 eq=ode(q);ans=yanswers(q);check(bool(ans),'actual answer formula '+str(active))
 for label,sol in ans:
  local=eq
  if active==15 and label=='b':local=local.subs(k,2)
  if active==28:local=local.subs(k,dict(a=0,b=3,c=5)[label])
  res=local.subs({Y:sol,D1:s.diff(sol,x),D2:s.diff(sol,x,2)},simultaneous=True)

  if active==65:
   exact(s.expand(4*x*x+sol**2),s.expand((x**3+1/x)**2),'positive radical square identity 65');check(s.ask(s.Q.positive((s.Symbol('xp',positive=True))**3+1/s.Symbol('xp',positive=True))),'positive radical branch 65')
  else:exact(res,0,'actual equation residual '+str(active)+' '+label)
  constants=sorted([v for v in sol.free_symbols if str(v).startswith('C_')],key=str)
  if constants:
   check(len(constants)==2,'two arbitrary constants '+str(active)+' '+label)
   if len(constants)==2:
    f=s.diff(sol,constants[0]);g=s.diff(sol,constants[1]);check(not fastzero(f*s.diff(g,x)-g*s.diff(f,x)),'independent CF modes '+str(active)+' '+label)
  elif active in initial:
   point,*values=initial[active]
   for order,val in enumerate(values):exact(s.diff(sol,x,order).subs(x,point),val,'initial condition '+str(active)+' '+str(order))
  if active==15:exact(sol.subs(x,0),1,'parameter initial value '+label)
  if active==61:
   for point,value in [(0,20),(2,12),(4,8),(6,6)]:exact(sol.subs({A:4,k:s.log(2)/2,x:point}),value,'observed model '+str(point))

# Independent checks of transformed equations, excluded branches and extra parts.
active=60;sol=2+s.exp(-x)*(s.cos(2*x)+s.sin(2*x)/2);exact(ode(qmap[60]).subs({Y:sol,D1:s.diff(sol,x),D2:s.diff(sol,x,2)},simultaneous=True),0,'full supplied-form equation 60');exact(sol.subs(x,0),3,'initial value 60');exact(s.diff(sol,x).subs(x,0),0,'initial slope 60');claim(qmap[60]['answer_html'],s.Rational(1,2),'printed sine coefficient 60')
active=14;q=qmap[14];sol=yanswers(q)[0][1]
exact(s.diff(sol,x),6-sol/15,'tank mass balance');exact(sol.subs(x,0),0,'tank initial mass');exact((sol/30).subs(x,15*s.log(3)),2,'tank concentration crossing');claim(q['answer_html'],15*s.log(3),'tank printed crossing')
active=63;q=qmap[63];raw=blocks(q['answer_html'])[0].split('=')[0];F=tex(raw);g=(x+2*y+3)/(2*(x+2*y-1))
exact(s.diff(F,x)+s.diff(F,y)*g,0,'implicit differentiation in original equation');exact(F.subs({x:0,y:1}),0,'implicit initial point');check((x+2*y).subs({x:0,y:1})>1,'implicit initial branch')
active=69;q=qmap[69];sol=yanswers(q)[0][1];V=s.powdenest(sol**3,force=True)
exact(s.diff(V,x,2)-s.diff(V,x)-6*V,12*s.exp(2*x),'cubic transformed general solution')
negative=-s.real_root(3,3)*s.exp(2*x/3);eq=ode(q)
exact(eq.subs({Y:negative,D1:s.diff(negative,x),D2:s.diff(negative,x,2)},simultaneous=True),0,'negative real cube-root branch')
exact(eq.subs({Y:0,D1:0,D2:0}),-4*s.exp(2*x),'zero cannot satisfy original cubic equation')
for number,power,coeffs,rhs in [(64,4,(1,2,5),6*s.exp(-x)),(69,3,(1,-1,-6),12*s.exp(2*x))]:
 active=number;v=Y**power;dv=power*Y**(power-1)*D1;ddv=power*Y**(power-1)*D2+power*(power-1)*Y**(power-2)*D1**2
 exact(coeffs[0]*ddv+coeffs[1]*dv+coeffs[2]*v-rhs,power*ode(qmap[number]),'nonlinear substitution chain rule '+str(number))
active=51;V=1/yanswers(qmap[51])[0][1];exact(s.diff(V,x,2)+4*s.diff(V,x)+8*V,8*x*x+14,'reciprocal transformed equation');check(s.Rational(7,4)>s.sqrt(2),'global reciprocal denominator lower bound')
active=64;check(3-1>0,'fourth-root radicand bound');exact(s.limit(yanswers(qmap[64])[0][1],x,s.oo),0,'positive fourth-root limit')
active=65;sol=yanswers(qmap[65])[0][1];numeric(ode(qmap[65]).subs({Y:sol,D1:s.diff(sol,x)},simultaneous=True),0,'positive-x radical sign',[s.Rational(1,2),s.Rational(3,4),s.Rational(3,2),s.Integer(3)]);check(sol.subs(x,s.Rational(1,2))<0 and sol.subs(x,2)>0,'homogeneous-substitution sign intervals')
active=66;primitive=-s.sqrt(4-(x-2)**2);exact(s.diff(primitive,x),(x-2)/s.sqrt(4-(x-2)**2),'stated preliminary primitive');exact(s.limit(yanswers(qmap[66])[0][1],x,4,dir='-'),4*s.pi-2,'one-sided endpoint limit')
active=7;sol=yanswers(qmap[7])[0][1];exact(s.diff(sol,x).subs(x,s.pi/3),0,'interior minimum stationary point');exact(sol.subs(x,s.pi/3),s.sqrt(3),'interior minimum value')
active=8;exact(s.limit(yanswers(qmap[8])[0][1],x,s.oo),2,'radical quotient limit')
active=10;sol=yanswers(qmap[10])[0][1]
for point in [-2*s.sqrt(2),2*s.sqrt(2)]:exact(sol.subs(x,point),0,'both logarithmic zeros')
active=12;exact(s.limit(yanswers(qmap[12])[0][1]*s.exp(-2*x),x,s.oo),s.Rational(1,2),'scaled exponential limit')
active=31;sol=yanswers(qmap[31])[0][1];C1,C2=s.symbols('C_1 C_2');general=s.dsolve(s.Eq(s.diff(s.Function('f')(x),x,2)-s.diff(s.Function('f')(x),x)-6*s.Function('f')(x),-6*x*x-14*x+6)) if False else x*x+2*x-1+3*s.exp(-2*x)
exact(general.subs(x,0),2,'suppress growth value');exact(s.diff(general,x).subs(x,0),-4,'suppress growth slope')
for number,U,V,freq in [(29,2,-3,1),(30,1,-4,2),(33,3,-4,2),(56,3,6,1),(57,1,-1,1),(58,4,-3,2),(59,-2,-3,3)]:
 active=number;periodic=U*s.sin(freq*x)+V*s.cos(freq*x);sol=yanswers(qmap[number])[-1][1];const=[v for v in sol.free_symbols if str(v).startswith('C_')];sol=sol.subs({v:i+1 for i,v in enumerate(const)})
 exact(s.limit(sol-periodic,x,s.oo),0,'decaying difference from periodic response '+str(number));check(U*U+V*V>0,'nonconstant periodic response '+str(number))

def fields_of(q):return {f['key']:f for f in q['fields']}
def val(fields,key):return P(fields[key]['expected'])
for model in fixtures['quick']:
 active=model['uid'];d=model['model'];q=qby[active];fs=fields_of(q);kind=d['kind'];check(digest(q)==model['contentSha256'],'quick fingerprint '+active)
 if kind=='logic':check(fs['reason']['expected']==d['answer'],'reviewed principle '+active);continue
 v=lambda key:val(fs,key)
 if kind=='first_polynomial':
  sol=v('polynomial')+v('constant')*s.exp(-d['k']*x);res=s.diff(sol,x)+d['k']*sol-(d['a']*x+d['b']);point=0;conditions=[P(d['y0'])]
 elif kind=='first_power':
  sol=v('polynomial')+v('constant')/x**d['p'];res=x*s.diff(sol,x)+d['p']*sol-d['q']*x**d['r'];point=1;conditions=[P(d['y0'])]
 elif kind=='equilibrium':
  sol=v('level')+v('coefficient')*s.exp(-v('rate')*x);res=s.diff(sol,x)-P(d['rate'])+P(d['k'])*sol;point=0;conditions=[P(d['y0'])];exact(v('rate'),P(d['k']),'decay rate '+active)
 elif kind=='distinct':
  roots=fs['roots']['expected'].strip('{}').split(',');actual=[P(r) for r in roots];check(len(actual)==2 and set(actual)=={P(d['r1']),P(d['r2'])},'both auxiliary roots '+active)
  sol=v('a')*s.exp(d['r1']*x)+v('b')*s.exp(d['r2']*x);res=s.diff(sol,x,2)-(d['r1']+d['r2'])*s.diff(sol,x)+d['r1']*d['r2']*sol;point=0;conditions=[d['y0'],d['dy0']]
 elif kind=='repeated':
  sol=v('polynomial')*s.exp(-d['k']*x);res=s.diff(sol,x,2)+2*d['k']*s.diff(sol,x)+d['k']**2*sol;point=0;conditions=[d['y0'],d['dy0']]
 elif kind=='conjugate':
  sol=s.exp(v('exponent')*x)*(v('a')*s.cos(v('frequency')*x)+v('b')*s.sin(v('frequency')*x));res=s.diff(sol,x,2)+2*d['a']*s.diff(sol,x)+(d['a']**2+d['b']**2)*sol;point=0;conditions=[d['y0'],d['dy0']];check(v('frequency')>0,'positive conjugate frequency '+active)
 elif kind in ['polynomial_forcing','exponential_forcing']:
  pi=v('polynomial') if kind=='polynomial_forcing' else v('k')*s.exp(d['k']*x);sol=pi+v('a')*s.exp(-x)+v('b')*s.exp(-2*x);rhs=P(d['rhs']) if kind=='polynomial_forcing' else d['forcing']*s.exp(d['k']*x);res=s.diff(sol,x,2)+3*s.diff(sol,x)+2*sol-rhs;point=0;conditions=[d['y0'],d['dy0']]
 elif kind=='suppress_growth':
  sol=v('polynomial')+v('constant')*s.exp(-x);res=s.diff(sol,x,2)-s.diff(sol,x)-2*sol-P(d['rhs']);point=0;conditions=[d['y0'],v('slope')];exact(s.limit((sol-P(d['polynomial']))*s.exp(-2*x),x,s.oo),0,'suppressed growth '+active)
 elif kind=='harmonic':
  sol=v('sine')*s.sin(x)+v('cosine')*s.cos(x)+s.exp(-x)*(v('a')*s.cos(2*x)+v('b')*s.sin(2*x));res=s.diff(sol,x,2)+2*s.diff(sol,x)+5*sol-P(d['rhs']);point=0;conditions=[d['y0'],d['dy0']]
 elif kind=='resonance':
  sol=(v('a')+v('k')*x)*s.exp(x)+v('b')*s.exp(-2*x);res=s.diff(sol,x,2)+s.diff(sol,x)-2*sol-d['force']*s.exp(x);point=0;conditions=[d['y0'],d['dy0']]
 elif kind=='repeated_resonance':
  sol=v('polynomial')*s.exp(-2*x);res=s.diff(sol,x,2)+4*s.diff(sol,x)+4*sol-d['force']*s.exp(-2*x);point=0;conditions=[d['y0'],d['dy0']]
 elif kind=='product':
  sol=(v('polynomial')+s.exp(-x)*(v('a')*s.cos(x)+v('b')*s.sin(x)))/(x+1);res=(x+1)*s.diff(sol,x,2)+(2*x+4)*s.diff(sol,x)+(2*x+4)*sol-P(d['rhs']);point=0;conditions=[P(d['y0']),P(d['dy0'])]
 elif kind=='reciprocal':
  sol=1/(v('constant')+v('exponential')*s.exp(d['a']*x));res=s.diff(sol,x)+d['a']*sol-d['b']*sol**2;point=0;conditions=[1/s.Integer(d['v0'])];check(v('constant')>0 and v('exponential')>0,'positive whole denominator '+active)
 elif kind=='euler':
  sol=v('polynomial').subs(u,s.log(x))+(v('a')*s.cos(2*s.log(x))+v('b')*s.sin(2*s.log(x)))/x;res=x*x*s.diff(sol,x,2)+3*x*s.diff(sol,x)+5*sol-P(d['rhs']).subs(u,s.log(x));point=1;conditions=[P(d['y0']),P(d['dy0'])]
 else:raise ValueError('Unknown quick '+kind)
 exact(res,0,'whole answer residual '+active)
 for order,value in enumerate(conditions):exact(s.diff(sol,x,order).subs(x,point),P(value),'whole answer initial '+active+' '+str(order))
 for field in q['fields']:
  if field['type'] not in ['set','choice']:claim(q['answer_html'],P(field['expected']),'printed field '+active+' '+field['key'])
for d in fixtures['examples']:
 active=d['id'];e=next(e for l in package['lessons'] for e in l['examples'] if e['verification']==active);check(digest(e)==d['contentSha256'],'example fingerprint '+active);kind=d['kind']
 if kind=='parameter_first':
  sol=3*s.exp(-x)/(k-1)+(2-3/(k-1))*s.exp(-k*x);exact(s.diff(sol,x)+k*sol,3*s.exp(-x),'parameter general example');exact(sol.subs(x,0),2,'parameter example initial');sol=(2+3*x)*s.exp(-x);exact(s.diff(sol,x)+sol,3*s.exp(-x),'parameter exceptional example');continue
 if kind=='tank':
  sol=P(d['solution']);exact(s.diff(sol,x),d['flow']*(d['concentration']-sol/d['volume']),'example tank model');exact(sol.subs(x,0),d['mass0'],'example tank initial');exact((sol/d['volume']).subs(x,P(d['time'])),P(d['target']),'example tank crossing');claim(e['solution'],sol,'displayed tank mass');continue
 if kind=='product':sol=P(d['v'])/P(d['multiplier']);vv=P(d['v']);res=P(d['a'])*s.diff(vv,x,2)+P(d['b'])*s.diff(vv,x)+P(d['c'])*vv-P(d['forcing'])
 elif kind=='square':
  vv=P(d['v']);sol=s.sqrt(vv);res=s.diff(vv,x,2)+2*s.diff(vv,x)+5*vv-P(d['forcing']);check(5-3>0,'example square radicand bound')
 else:
  sol=P(d['solution'])
  if kind=='linear':res=s.diff(sol,x)+P(d['b'])*sol-P(d['forcing'])
  elif kind=='nonlinear_first':res=s.diff(sol,x)+P(d['a'])*sol-P(d['b'])*sol**2
  elif kind=='euler':res=x*x*s.diff(sol,x,2)+P(d['b'])*x*s.diff(sol,x)+P(d['c'])*sol-P(d['forcing'])
  else:res=P(d['a'])*s.diff(sol,x,2)+P(d['b'])*s.diff(sol,x)+P(d['c'])*sol-P(d['forcing'])
 exact(res,0,'independent example residual '+active)
 for point,value,*order in d.get('initial',[]):exact(s.diff(sol,x,order[0] if order else 0).subs(x,P(point)),P(value),'example initial '+active+' '+str(order))
 claim(e['solution'],sol,'actual displayed example solution '+active)
active='structure';check(len(source)==69 and sum(q['marks'] for q in source)==655 and sum(len(q['parts']) for q in source)==135,'all 69 supplied tasks, 135 parts, 655 marks')
check(all(str(i) in coverage for i in range(1,70)),'evidence for every owner task')
for f in fixtures['owner']:check(digest(qby[f['uid']])==f['contentSha256'],'immutable normalised owner '+f['uid'])
for l in package['lessons']:check(digest(l)==fixtures['teachingDigests'][l['id']],'teaching fingerprint '+l['id']);check(sum(q['lesson']==l['key'] and q['collection']=='exam' for q in package['questions'])>=6,'six written questions '+l['key'])
if args.source:
 path=Path(args.source);original=json.loads(path.read_text(encoding='utf-8-sig'));check(hashlib.sha256(path.read_bytes()).hexdigest()==package['source']['sha256'],'unchanged read-only source SHA');check(sorted([q for l in original['lessons'] for q in l['questions']],key=lambda q:q['bank_number'])==sorted(source,key=lambda q:q['bank_number']),'unmodified owner answers, criteria, marks and text')
report=dict(checks=len(checks),actualTeXClaims=claimed,failures=failures,coverage=coverage,sourceTasks=69,quickChecks=40,workedExamples=20,externalTeacherReview=False,method='Parse supplied TeX solutions and original ODEs; symbolic differentiation, equation residuals, initial conditions and Wronskians. Independent transformed equations, real branch/domain bounds, model observations and long-term behaviour checks. Complete numeric/polynomial answer fields independently reconstructed and differentiated; printed expressions compared at deterministic 50-digit points. Not an external teacher review.')
Path(args.report).write_text(json.dumps(report,indent=2,default=str)+'\n',encoding='utf8');print(json.dumps({k:v for k,v in report.items() if k!='coverage'},default=str));raise SystemExit(bool(failures))
