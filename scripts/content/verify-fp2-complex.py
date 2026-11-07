"""Independent complex algebra, root completeness, harmonic and summation audit."""
import argparse,hashlib,html,json,re
from functools import lru_cache
from pathlib import Path
import sympy as s
from sympy.parsing.latex import parse_latex
from sympy.core.function import AppliedUndef
ap=argparse.ArgumentParser();ap.add_argument('--source');ap.add_argument('--report',default='docs/ARENA-C5-FP2-COMPLEX-MATH-CHECKS-20261107.json');args=ap.parse_args()
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
package=json.loads(Path('content/original/9231-fp2/complex-v1.json').read_text(encoding='utf8'));fixtures=json.loads(Path('content/original/9231-fp2/complex-verification-v1.json').read_text(encoding='utf8'));source=[f['original'] for f in fixtures['owner']];qmap={q['bank_number']:q for q in source};qby={q['id']:q for q in package['questions']};actual_claims=0
if args.source:
 data=Path(args.source);owner=json.loads(data.read_text(encoding='utf-8-sig'));check(hashlib.sha256(data.read_bytes()).hexdigest()==package['source']['sha256'],'unmodified source SHA');check(source==[q for l in owner['lessons'] for q in l['questions']],'all supplied fields unchanged')
_candidates=candidates
def candidates(raw):
 raw=raw.replace(r'\lt','<').replace(r'\gt','>').replace(r'\displaystyle','').replace(r'\operatorname{cosec}',r'\csc')
 raw=re.sub(r'\\text\{ when \}.*?(?=\\\]|$)','',raw,flags=re.S).replace(r'\text{ anticlockwise about }O','')
 raw=re.sub(r'\\(?:begin|end)\{aligned\}','',raw).replace('&','')
 result=_candidates(raw)
 for block in blocks(raw):
  for piece in re.split(r'<|>|\\(?:leq?|geq?|to)(?![A-Za-z])',block):result+=_candidates(r'\['+piece+r'\]')
 return result
def set_active(i):
 global active
 active=i
def close(a,b):return abs(complex(s.N(a-b,50)))<1e-35
def consistent(a,b):
 if not isinstance(a,s.Expr) or not isinstance(b,s.Expr):return False
 if a==b:return True
 if a.free_symbols!=b.free_symbols:return False
 if not a.free_symbols:
  try:return close(a,b)
  except (TypeError,ValueError):return False
 # Actual printed expressions are compared at independent deterministic points;
 # algebraic identities and root models receive separate exact checks below.
 for idx in range(4):
  binding={v:(idx+2 if v in [n,m,r,j,k] else s.Rational(2*idx+3,11) if v==x else s.Rational(idx+2,7)) for v in a.free_symbols}
  try:
   if not close(a.subs(binding),b.subs(binding)):return False
  except (TypeError,ValueError):return False
 return True
def claim(raw,value,label):check(any(consistent(z,s.sympify(value)) for z in candidates(raw)),label)
def C(i,part,*values):
 global actual_claims
 set_active(i);part=qmap[i]['parts'][part];cs=candidates(part['answer_html']+part['solution_html'])
 for value in values:
  value=s.sympify(value);actual=[z.subs(u,x) if isinstance(z,s.Expr) and x in value.free_symbols and u not in value.free_symbols else z for z in cs];check(any(consistent(z,value) for z in actual),'owner '+str(i)+' actual TeX result '+str(value));actual_claims+=1
def exact(a,b,label):check(equal(a,b),label)
def numeric(a,b,label):check(close(a,b),label)
def check_power_identity(i,part,expression):
 C(i,part,expression)
def primitive_value(fn,lo,hi):return s.integrate(fn,(x,lo,hi))
def integral(i,part,fn,lo,hi):
 global actual_claims
 set_active(i);fun=s.lambdify(x,fn,'mpmath');aa=mp.mpf(str(s.N(lo,53)));bb=mp.mpf(str(s.N(hi,53)));value=mp.quad(fun,[aa,(aa+bb)/2,bb]);actual=candidates(qmap[i]['parts'][part]['answer_html'])
 check(any(isinstance(v,s.Expr) and not v.free_symbols and consistent(v,s.Float(str(value),53)) for v in actual),'owner '+str(i)+' independent definite-integral quadrature');actual_claims+=1
def numeric_root(poly,root,label):numeric(poly.subs(x,root),s.S.Zero,label)
def angles_in_text(i,part,angles):
 raw=qmap[i]['parts'][part]['answer_html'];cs=candidates(raw)
 for q in angles:check(any(consistent(z,P(q)*s.pi) for z in cs),'owner '+str(i)+' listed angle '+q)
def polynomial_roots(i,part,polynomial,fn,angles,scale=1,real_count=None):
 set_active(i);poly=P(polynomial);roots=[scale*fn(P(q)*s.pi) for q in angles]
 for index,root in enumerate(roots):numeric_root(poly,root,'owner '+str(i)+' original polynomial at root '+str(index+1))
 vals=[complex(s.N(z,40)) for z in roots];check(all(abs(aa-bb)>1e-12 for a0,aa in enumerate(vals) for bb in vals[a0+1:]),'owner '+str(i)+' distinct full root set')
 if len(roots)==s.degree(poly,x):check(True,'owner '+str(i)+' root count equals degree')
 elif real_count is not None:check(s.Poly(poly,x).count_roots(-s.oo,s.oo)==real_count==len(roots),'owner '+str(i)+' independent real-root count')
 else:check(False,'owner '+str(i)+' completeness argument supplied')
 raw=qmap[i]['parts'][part]['answer_html']
 # A theta-list and an explicit trigonometric root-list are two source formats.
 if r'\theta=' in raw:angles_in_text(i,part,angles)
 else:
  for root in roots:C(i,part,root)

# Multiple-angle identities are independently generated by exact complex expansion.
c0,u0,t0=s.symbols('c0 u0 t0',real=True)
for i,part,power,kind in [(1,0,5,'cos'),(7,0,6,'cot'),(10,1,3,'cos'),(14,0,4,'tan'),(15,0,7,'tan'),(16,0,5,'tan'),(20,0,5,'cot'),(24,0,6,'cos'),(25,0,3,'tan'),(28,0,6,'tan'),(33,0,6,'sec'),(34,0,4,'cos_tan'),(35,0,8,'sin_mixed'),(37,0,7,'cos'),(39,0,7,'csc'),(40,0,5,'sin'),(44,0,7,'sin'),(45,0,5,'cos'),(46,0,6,'cos'),(50,1,5,'cos')]:
 set_active(i)
 if kind in ['tan','cot']:
  expanded=s.expand(((1+s.I*t0) if kind=='tan' else (t0+s.I))**power);formula=s.cancel(s.im(expanded)/s.re(expanded) if kind=='tan' else s.re(expanded)/s.im(expanded));C(i,part,formula.subs(t0,t if kind=='tan' else u))
 elif kind=='sec':C(i,part,s.sec(x)**power/(32-48*s.sec(x)**2+18*s.sec(x)**4-s.sec(x)**6))
 elif kind=='csc':C(i,part,s.csc(x)**7/(7*s.csc(x)**6-56*s.csc(x)**4+112*s.csc(x)**2-64))
 elif kind=='cos_tan':C(i,part,(1-6*t*t+t**4)/(1+t*t)**2)
 elif kind=='sin_mixed':C(i,part,8*s.sin(x)*s.cos(x)*(1-10*s.sin(x)**2+24*s.sin(x)**4-16*s.sin(x)**6))
 else:
  expanded=s.expand((c0+s.I*u0)**power);component=s.re(expanded) if kind=='cos' else s.im(expanded)
  if kind=='cos':poly=s.Poly(component,u0);reduced=sum(coef*(1-c0*c0)**(monom[0]//2) for monom,coef in poly.terms());expected=s.expand(reduced).subs(c0,s.cos(x))
  else:
   poly=s.Poly(component,c0);reduced=sum(coef*(1-u0*u0)**(monom[0]//2) for monom,coef in poly.terms());expected=s.expand(reduced).subs(u0,s.sin(x))
  C(i,part,expected);identity(expected-(s.cos(power*x) if kind=='cos' else s.sin(power*x)),'owner '+str(i)+' exact de Moivre identity')
polynomial_roots(1,1,'x**5+20*x**4-320*x**2+1024',s.sec,['2/15','4/15','8/15','2/3','14/15'],2);C(1,2,-10)
polynomial_roots(7,1,'x**6+6*sqrt(3)*x**5-15*x**4-20*sqrt(3)*x**3+15*x*x+6*sqrt(3)*x-1',s.cot,['5/36','11/36','17/36','23/36','29/36','35/36'])
polynomial_roots(10,2,'64*(4*x**3-3*x)**6-1',s.cos,['1/9','2/9','4/9','5/9','7/9','8/9'],real_count=6);C(10,2,12)
polynomial_roots(14,1,'sqrt(3)*x**4+4*x**3-6*sqrt(3)*x*x-4*x+sqrt(3)',s.tan,['1/12','1/3','7/12','5/6']);C(14,2,s.Rational(52,3))
polynomial_roots(15,1,'x**6-21*x**4+35*x*x-7',s.tan,['1/7','-1/7','2/7','-2/7','3/7','-3/7']);C(15,2,s.sqrt(7))
C(16,1,5*u*u-10*u+1);C(16,2,5*s.Symbol('v')**2-20*s.Symbol('v')+16,s.Rational(48,5))
polynomial_roots(20,1,'x**4-10*x*x+5',s.cot,['1/10','-1/10','3/10','-3/10']);C(20,2,5)
C(24,1,-32*s.sin(x)**6+48*s.sin(x)**4-18*s.sin(x)**2+1);C(24,2,s.Rational(1,4))
polynomial_roots(25,1,'x**3+3*x*x-3*x-1',s.tan,['1/4','7/12','11/12']);C(25,2,1,-2-s.sqrt(3),-2+s.sqrt(3));C(25,3,15)
polynomial_roots(28,1,'3*x**4-10*x*x+3',s.tan,['1/6','1/3','2/3','5/6']);C(28,2,s.Rational(20,3),1)
polynomial_roots(33,1,'(sqrt(2)-1)*x**6-18*sqrt(2)*x**4+48*sqrt(2)*x*x-32*sqrt(2)',s.sec,['1/8','5/24','11/24','13/24','19/24','7/8']);C(33,2,3)
polynomial_roots(34,1,'x**4-14*x*x+1',s.tan,['1/12','5/12','7/12','11/12']);C(34,1,2-s.sqrt(3),2+s.sqrt(3),-2-s.sqrt(3),-2+s.sqrt(3))
polynomial_roots(35,1,'x**6-6*x**4+10*x*x-4',s.sin,['-3/8','-1/4','-1/8','1/8','1/4','3/8'],2)
polynomial_roots(37,1,'128*x**7-224*x**5+112*x**3-14*x+1',s.cos,['2/21','4/21','8/21','10/21','2/3','16/21','20/21'])
polynomial_roots(39,1,'sqrt(3)*x**7+14*x**6-112*x**4+224*x*x-128',s.csc,['-8/21','-1/3','-2/21','-1/21','4/21','5/21','10/21'])
polynomial_roots(40,1,'x**5-20*x**4+320*x*x-1024',s.csc,['-11/30','-7/30','1/30','1/6','13/30'],2)
polynomial_roots(41,2,'32*x**8+32*(1-x*x)**4-17',s.cos,['1/8','3/8','5/8','7/8'],real_count=4)
set_active(44)
for q in ['1/7','2/7','3/7']:numeric(64*s.sin(P(q)*s.pi)**6-112*s.sin(P(q)*s.pi)**4+56*s.sin(P(q)*s.pi)**2-7,0,'owner 44 cubic in squared sines')
C(44,2,s.Rational(7,64),8);C(45,1,s.sqrt((5+s.sqrt(5))/8),s.sqrt((5-s.sqrt(5))/8));C(46,1,s.Rational(3,2),s.Rational(1,32))
polynomial_roots(50,2,'16*x**9-20*x**7+21*x**5-20*x**3+5*x',s.cos,['1/10','3/10','1/2','7/10','9/10'],real_count=5)

# Harmonic expansions: an independent Laurent polynomial is converted to a sum.
Z=s.Symbol('Z',nonzero=True)
def harmonic(ps,pc):
 expr=s.expand((Z-Z**-1)**ps*(Z+Z**-1)**pc/(2**(ps+pc)*s.I**ps));out=0
 for expn in range(-(ps+pc),ps+pc+1):
  coef=expr.coeff(Z,expn)
  if expn==0:out+=coef
  elif expn>0:out+=(coef+expr.coeff(Z,-expn))*s.cos(expn*x)+s.I*(coef-expr.coeff(Z,-expn))*s.sin(expn*x)
 return s.simplify(out)
for i,part,ps,pc,scale in [(6,0,4,0,1),(8,0,7,0,1),(12,0,0,8,128),(18,1,2,4,1),(19,0,0,6,1),(21,0,8,0,128),(26,0,6,2,1),(31,0,0,4,1),(32,0,6,0,1),(41,0,8,0,1),(43,0,5,0,16)]:
 set_active(i);out=harmonic(ps,pc)*scale
 if i==41:out=harmonic(8,0)+harmonic(0,8)
 C(i,part,out);identity(out-scale*s.sin(x)**ps*s.cos(x)**pc if i!=41 else out-s.sin(x)**8-s.cos(x)**8,'owner '+str(i)+' exact Laurent identity')
C(5,0,harmonic(6,0)/harmonic(0,6));C(19,1,harmonic(6,0),s.Rational(5,8)+s.Rational(3,8)*s.cos(4*x));C(36,0,1/harmonic(7,0));C(42,0,harmonic(7,0)/harmonic(0,7))
integral(6,1,x**4/s.sqrt(1-x*x),0,s.sqrt(3)/2);integral(8,2,s.sin(x)**9,0,s.pi/3);integral(12,1,s.cos(x/2)**8,-s.pi/3,s.pi/3)
integral(18,2,s.sin(x)**2*s.cos(x)**4,0,s.pi/6);integral(19,2,s.sin(x)**6+s.cos(x)**6,0,s.pi/12);integral(21,1,s.sin(x)**8,0,s.pi/6)
integral(26,1,x**6*s.sqrt(4-x*x),0,s.sqrt(2));integral(31,1,s.cos(x+s.pi/6)**4,0,s.pi/6);integral(32,1,s.sin(3*x)**6,0,s.pi/9);integral(41,1,s.cos(x/2)**8+s.sin(x/2)**8,0,s.pi/3);integral(43,1,32*s.sin(2*x)**5,0,s.pi/6)
set_active(8)
for nn in [2,3,5,9]:exact(nn*primitive_value(s.sin(x)**nn,0,s.pi/3),(nn-1)*primitive_value(s.sin(x)**(nn-2),0,s.pi/3)-s.Rational(1,2)*(s.sqrt(3)/2)**(nn-1),'owner 8 endpoint recurrence n='+str(nn))

# Complex root equations, exact Cartesian sets and angular conventions.
def roots_model(i,degree,rhs,radius,angles,centre=0,part=0):
 set_active(i);roots=[P(radius)*s.exp(s.I*s.pi*P(q)) for q in angles]
 for index,z0 in enumerate(roots):numeric(z0**degree,P(rhs),'owner '+str(i)+' power equation root '+str(index+1))
 check(len(roots)==degree and all(abs(complex(s.N(a-b,35)))>1e-12 for k0,a in enumerate(roots) for b in roots[k0+1:]),'owner '+str(i)+' degree and distinctness')
 if i in [2,4,38]:angles_in_text(i,part,angles);C(i,part,P(centre)+P(radius)*s.exp(s.I*x))
 else:
  for root in roots:C(i,part,P(centre)+root)
roots_model(2,4,'-8+8*sqrt(3)*I','2',['1/6','2/3','-5/6','-1/3'])
roots_model(4,3,'-32-32*sqrt(3)*I','4',['4/9','10/9','16/9'])
roots_model(9,3,'1/(8*I)','1/2',['-1/6','1/2','-5/6'])
roots_model(38,3,'-4*sqrt(2)+4*sqrt(2)*I','2',['1/4','11/12','19/12'],'1-2*I')
set_active(13)
for nn in [1,2,5,-1,-3]:
 numeric((2*s.exp(s.I*s.Rational(3,7)))**nn,2**nn*s.exp(s.I*nn*s.Rational(3,7)),'owner 13 integer power '+str(nn))
C(13,1,r**(-n)*(s.cos(n*x)-s.I*s.sin(n*x)))
C(29,0,s.Rational(1,16),2*s.pi/3);C(29,1,-1);set_active(29);exact((s.sqrt(3)-s.I)**-4*(8+8*s.sqrt(3)*s.I),-1,'owner 29 complete image')
set_active(30);roots30=[2,-1+s.I*s.sqrt(3),-1-s.I*s.sqrt(3),-1,s.Rational(1,2)+s.I*s.sqrt(3)/2,s.Rational(1,2)-s.I*s.sqrt(3)/2]
for z0 in roots30:exact(z0**6-7*z0**3-8,0,'owner 30 original polynomial');C(30,1,z0)
C(30,2,15);exact(sum(s.expand_complex(z0*s.conjugate(z0)) for z0 in roots30),15,'owner 30 squared moduli')
set_active(48);exact(s.expand((z**4-4)*(z**3-(1+s.I))),z**7-(1+s.I)*z**4-4*z**3+4*(1+s.I),'owner 48 factorisation');C(48,0,4,1+s.I)
for degree,rhs0,rad,phase0 in [(4,4,s.sqrt(2),0),(3,1+s.I,2**s.Rational(1,6),s.pi/4)]:
 for kk in range(degree):numeric((rad*s.exp(s.I*(phase0+2*kk*s.pi)/degree))**degree,rhs0,'owner 48 distinct family root')
check(s.sqrt(2)!=2**s.Rational(1,6),'owner 48 disjoint moduli')
set_active(49);roots49=[2+2*s.I,1+s.I*(2+s.sqrt(3)),-1+s.I*(2+s.sqrt(3)),-2+2*s.I,-1+s.I*(2-s.sqrt(3)),1+s.I*(2-s.sqrt(3))]
for z0 in roots49:exact((z0-2*s.I)**6,64,'owner 49 translated original equation');C(49,0,z0)
set_active(51);roots51=[2*s.exp(s.I*(s.pi/15+2*kk*s.pi/5)) for kk in range(5)]
for z0 in roots51:numeric(z0**5,16+16*s.sqrt(3)*s.I,'owner 51 fifth power')
distances=[abs(complex(s.N(z0,50))-3)**2 for z0 in roots51];check(all(distances[0]<d for d in distances[1:]),'owner 51 unique nearest root');C(51,2,(1-s.I*s.sqrt(3))/(2-s.Symbol('w')));C(51,3,2*s.exp(s.I*s.pi/15),s.sqrt(13-12*s.cos(s.pi/15)))

# Roots of unity: exact quotient-ring products and reciprocal sums.
w=s.Symbol('w');cyclic=lambda degree:s.cyclotomic_poly(degree,w)
def unity_product(degree):
 poly=cyclic(degree);prod=s.S.One;reciprocal=s.S.Zero
 for kk in range(1,degree):prod=s.rem(prod*(1-w**kk),poly,w);reciprocal=s.rem(reciprocal+s.invert(1-w**kk,poly,w),poly,w)
 return s.expand(prod),s.expand(reciprocal)
set_active(11)
for mm in range(1,13):
 roots=[2*s.exp(s.I*(s.pi/6+2*kk*s.pi/3)) for kk in range(3)];value=sum(z0**mm for z0 in roots);numeric(value,3*(8*s.I)**s.Rational(mm,3) if mm%3==0 else 0,'owner 11 power-sum filter m='+str(mm))
set_active(22);om=w;det=s.Matrix([[1,2*om,3*om**2],[3*om**2,1,2*om],[2*om,3*om**2,1]]).det();exact(s.rem(det,cyclic(3),w),18,'owner 22 circulant determinant');C(22,1,18)
omega=-s.Rational(1,2)+s.I*s.sqrt(3)/2;rr=[s.sqrt(3)*s.exp(s.I*s.pi*P(q)) for q in ['-1/6','1/3','5/6','-2/3']]
for z0 in rr:numeric(z0**4,(1-omega)**4,'owner 22 rotated-square root')
angles_in_text(22,2,['-1/6','1/3','5/6','-2/3']);C(22,3,s.Rational(3,2)-s.I*s.sqrt(3)/2,1);check(abs(min(abs(complex(s.N(z0,50))-2) for z0 in rr)-1)<1e-14,'owner 22 nearest distance')
set_active(23);product,reciprocal=unity_product(7);exact(product,7,'owner 23 exact product');exact(reciprocal,3,'owner 23 exact reciprocal sum');C(23,1,7);C(23,2,3);C(23,3,448,s.Rational(3,2))
set_active(27)
for aa in [-2,-1,s.Rational(-1,2),0,s.Rational(1,2),1,2]:
 us=s.solve(w*w+2*aa*w+1,w);unit=all(abs(abs(complex(s.N(v,40)))-1)<1e-14 for v in us);check(unit==(-1<=aa<=1),'owner 27 unit-circle parameter '+str(aa))
exact(s.expand((z*z-1)**2),z**4-2*z*z+1,'owner 27 lower endpoint double roots');exact(s.expand((z*z+1)**2),z**4+2*z*z+1,'owner 27 upper endpoint double roots')
for kk in [1,2,4,5]:numeric(s.exp(s.I*kk*s.pi/3)**4+s.exp(s.I*kk*s.pi/3)**2+1,0,'owner 27 a=1/2 root')
set_active(47);indices=[kk for kk in range(18) if kk%3];check(indices==[1,2,4,5,7,8,10,11,13,14,16,17],'owner 47 excluded sixth-root subset')
for kk in indices:numeric(s.exp(s.I*kk*s.pi/9)**12+s.exp(s.I*kk*s.pi/9)**6+1,0,'owner 47 original polynomial');check(kk not in [0,9],'owner 47 non-real root')
C(47,2,0)

# Finite, binomial and infinite sums: direct sums and exceptional cases.
for i in [3,17,52,53,54,55,56,57,58,59]:
 set_active(i)
 for nn in [2,3,5,8]:
  for angle in [s.Rational(2,7),s.Rational(5,11)]:
   if i==3:
    actual=sum(s.sin((3*rr+1)*angle) for rr in range(nn));expected=s.sin(3*nn*angle/2)*s.sin((3*nn-1)*angle/2)/s.sin(3*angle/2)
   elif i==17:
    actual=sum((-1)**rr*s.binomial(nn,rr)*s.exp(s.I*rr*angle) for rr in range(nn+1));expected=(2*s.sin(angle/2))**nn*s.exp(s.I*nn*(angle/2-s.pi/2))
   elif i==52:
    actual=sum(s.cos(rr*angle) for rr in range(nn));expected=s.sin(nn*angle/2)*s.cos((nn-1)*angle/2)/s.sin(angle/2)
   elif i==53:
    actual=sum(s.sec(angle)**rr*s.exp(s.I*rr*angle) for rr in range(nn));expected=s.cot(angle)*s.sec(angle)**nn*s.sin(nn*angle)+s.I*s.cot(angle)*(1-s.sec(angle)**nn*s.cos(nn*angle))
   elif i==54:
    actual=s.Rational(2,5)*s.exp(s.I*angle)/(1-s.Rational(2,5)*s.exp(s.I*angle));expected=(10*s.cos(angle)-4+s.I*10*s.sin(angle))/(29-20*s.cos(angle))
   elif i==55:
    actual=1+2*sum(s.cos(3*rr*angle) for rr in range(1,nn+1));expected=s.sin((3*nn+s.Rational(3,2))*angle)/s.sin(3*angle/2)
   elif i==56:
    ph=s.Rational(1,5);actual=sum(s.exp(s.I*((2*rr-1)*angle+ph)) for rr in range(1,nn+1));expected=s.exp(s.I*(nn*angle+ph))*s.sin(nn*angle)/s.sin(angle)
   elif i==57:
    actual=sum(2*rr*s.cos(rr*s.pi/nn) for rr in range(1,nn+1));expected=-nn-s.csc(s.pi/(2*nn))**2
   elif i==58:
    actual=sum(2*rr*s.sin(2*rr*s.pi/(nn+1)) for rr in range(1,nn+1));expected=-(nn+1)*s.cot(s.pi/(nn+1))
   else:
    actual=sum(rr*s.binomial(nn,rr)*s.exp(s.I*rr*angle) for rr in range(nn+1));expected=nn*2**(nn-1)*s.cos(angle/2)**(nn-1)*s.exp(s.I*(nn+1)*angle/2)
   numeric(actual,expected,'owner '+str(i)+' independent direct sum n='+str(nn)+' theta='+str(angle))
C(3,0,z*(1-z**(3*n))/(1-z**3));C(3,1,s.sin(3*n*x/2)*s.sin((3*n-1)*x/2)/s.sin(3*x/2));C(3,2,n*s.sin(2*m*s.pi/3))
C(17,0,2*s.sin(x/2)*s.exp(s.I*(x/2-s.pi/2)));C(17,1,(2*s.sin(x/2))**n*s.cos(n*(x/2-s.pi/2)),(2*s.sin(x/2))**n*s.sin(n*(x/2-s.pi/2)));C(17,2,-s.Rational(1,2),-s.sqrt(3)/2)
C(52,0,s.sin(n*delta/2)*s.cos((n-1)*delta/2)/s.sin(delta/2));C(52,3,s.sqrt(3)/4,1001)
set_active(52)
for nn in [1,2,6,25]:
 width=s.pi/(6*nn);U=width*sum(s.cos(2*rr*width) for rr in range(nn));L=width*sum(s.cos(2*rr*width) for rr in range(1,nn+1));numeric(U,s.pi/(12*nn)*s.cos(s.pi/6-s.pi/(6*nn))/s.sin(s.pi/(6*nn)),'owner 52 actual upper expression');exact(s.simplify(U-L),s.pi/(12*nn),'owner 52 exact gap');check(float(s.N(L,30))<float(s.sqrt(3)/4)<float(s.N(U,30)),'owner 52 strict bounds')
check(s.pi/(12*1001)<s.pi/12000==s.pi/(12*1000),'owner 52 strict least integer')
C(53,2,s.cot(x)*s.sec(x)**n*s.sin(n*x),s.cot(x)*(1-s.sec(x)**n*s.cos(n*x)));C(53,3,2**(4*m+1),1)
C(54,1,(10*s.cos(x)-4)/(29-20*s.cos(x)),10*s.sin(x)/(29-20*s.cos(x)));C(54,2,s.Rational(1,19),5*s.sqrt(3)/19)
C(55,0,z**(-3*n)*(1-z**(3*(2*n+1)))/(1-z**3));C(55,1,s.sin((3*n+s.Rational(3,2))*x)/s.sin(3*x/2));C(55,2,2*n+1)
C(56,0,s.exp(s.I*(n*x+phi))*s.sin(n*x)/s.sin(x));C(56,1,s.sin(n*x)*s.cos(n*x+phi)/s.sin(x),n*(-1)**m*s.cos(phi));C(56,2,-s.sqrt(3)/(2*s.sin(s.pi/(2*n))))
C(57,0,s.sin(n*x)*s.sin((n+1)*x)/s.sin(x));C(57,1,-n-s.csc(s.pi/(2*n))**2)
C(58,0,s.sin(n*x)*s.cos((n+1)*x)/s.sin(x));C(58,1,-(n+1)*s.cot(s.pi/(n+1)))
C(59,1,n*2**(n-1)*s.cos(x/2)**(n-1)*s.cos((n+1)*x/2),n*2**(n-1)*s.cos(x/2)**(n-1)*s.sin((n+1)*x/2));C(59,2,-45,0)
set_active(59)
for nn in range(2,7):
 for rr in range(1,nn+1):check(rr*s.binomial(nn,rr)==nn*s.binomial(nn-1,rr-1),'owner 59 exact binomial weighting')

# Every quick answer is recomputed independently of its stored key.
for fixture in fixtures['quick']:
 q=qby[fixture['uid']];d=fixture['model'];kind=d['kind'];set_active(q['id']);check(digest(q)==fixture['contentSha256'],active+' immutable fingerprint');fields={f['key']:f for f in q['fields']}
 def F(key,value):
  field=fields[key];actual=P(field['expected'][0])/P(field['expected'][1]) if field['type']=='ratio' else P(field['expected']);exact(actual,value,active+' complete field '+key)
 def S(key,values):
  actual=fields[key]['expected'].strip('{}').split(',');check(set(map(P,actual))==set(values),active+' complete set '+key)
 if kind=='power':
  val=s.expand_complex(P(d['base'])**d['power']);F('real',s.re(val));F('imaginary',s.im(val))
 elif kind=='roots':
  degree=d['degree'];angles=[s.simplify(P(d['phase'])/degree+s.Rational(2*kk,degree)) for kk in range(degree)];angles=[s.simplify(a-2 if a>=1 else a) for a in angles];F('radius',d['radius']);S('angles',angles)
  for angle in angles:check(-1<=angle<1,active+' half-open principal interval')
 elif kind=='chebyshev':F('polynomial',s.chebyshevt(d['power'],c))
 elif kind=='tan_multiple':
  expanded=s.expand((1+s.I*t)**d['power']);F('quotient',s.im(expanded)/s.re(expanded))
 elif kind=='cubic_roots':
  angles=[s.Rational(v,9) for v in ([1,5,7] if d['sign']==1 else [2,4,8])];S('angles',angles);F('product',s.Rational(d['sign'],8))
  for angle in angles:numeric(8*s.cos(angle*s.pi)**3-6*s.cos(angle*s.pi)-d['sign'],0,active+' original cubic root')
 elif kind=='harmonics':
  expected=harmonic(0,6) if d['function']=='cos' else harmonic(6,0);actual=P(fields['a']['expected'])+P(fields['b']['expected'])*s.cos(2*x)+P(fields['c']['expected'])*s.cos(4*x)+P(fields['d']['expected'])*s.cos(6*x);exact(actual,expected,active+' all harmonic coefficients')
 elif kind=='integral':F('value',primitive_value(s.sin(d['k']*x)**2*s.cos(d['k']*x)**2,0,s.pi/(4*d['k'])))
 elif kind=='tan_power':F('quotient',((1-t)/(1+t))**(d['power']//2))
 elif kind=='cartesian_roots':
  points=[tuple(map(P,p.strip('()').split(','))) for p in fields['points']['expected'].split(';')];check(len(points)==4 and len(set(points))==4,active+' all four roots')
  for aa,bb in points:exact((aa+s.I*bb)**4,-4*d['scale']**4,active+' Cartesian root equation')
 elif kind=='root_subset':S('indices',[s.Integer(kk) for kk in range(d['degree']) if kk%(d['degree']//d['excluded'])])
 elif kind=='parameter':
  check(fields['circle']['expected']=='[-1,1]' and fields['distinct']['expected']=='(-1,1)',active+' both full parameter intervals');F('negative',d['degree']);F('positive',d['degree'])
 elif kind=='finite':
  val=s.expand(sum(P(d['ratio'])**kk for kk in range(d['terms'])));F('real',s.re(val));F('imaginary',s.im(val))
 elif kind=='binomial':
  nn=d['degree'];val=s.expand(sum(rr*s.binomial(nn,rr)*s.I**rr for rr in range(nn+1)));F('real',s.re(val));F('imaginary',s.im(val))
 elif kind=='infinite':
  qq=s.exp(s.I*s.pi/3)/d['denominator'];val=s.expand_complex(qq/(1-qq));F('real',s.simplify(s.re(val)));F('imaginary',s.simplify(s.im(val)));check(s.Abs(qq)<1,active+' convergence')
 elif kind=='logic':check(fields['reason']['expected']==d['answer'],active+' independently reviewed principle')
 else:check(False,active+' known model')
for fixture in fixtures['examples']:
 set_active(fixture['id']);d=fixture;kind=d['kind'];e=next(e for l in package['lessons'] for e in l['examples'] if e['verification']==d['id']);check(digest(e)==d['contentSha256'],active+' immutable example fingerprint')
 if kind=='power':exact(P(d['base'])**d['power'],P(d['value']),active+' exact power');claim(e['solution'],P(d['value']),active+' displayed answer')
 elif kind=='transformation':
  factor=P(d['factor']);numeric(factor,P(d['scale'])*s.exp(s.I*P(d['angle'])),active+' polar factor');exact(factor*P(d['point']),P(d['value']),active+' image');claim(e['solution'],P(d['value']),active+' actual image')
 elif kind=='roots':
  for angle in d['angles']:numeric((P(d['radius'])*s.exp(s.I*P(angle)*s.pi))**d['degree'],P(d['rhs']),active+' root equation')
 elif kind=='identity':
  identity(P(d['expression'])-P(d['value']),active+' exact identity');shown=P(d['value'])
  if d['id']=='FCOM-E-A1':shown=shown.subs(s.cos(x),c)
  elif d['id']=='FCOM-E-A2':shown=shown.subs(s.tan(x),t)
  claim(e['solution'],shown,active+' displayed identity')
 elif kind=='polynomial_roots':
  for angle in d['angles']:numeric(P(d['polynomial']).subs(x,getattr(s,d['function'])(P(angle)*s.pi)),0,active+' original polynomial')
  check(len(d['angles'])==s.degree(P(d['polynomial']),x),active+' complete degree count')
 elif kind=='integral':exact(primitive_value(P(d['f']),P(d['lo']),P(d['hi'])),P(d['value']),active+' exact integral');claim(e['solution'],P(d['value']),active+' displayed integral')
 elif kind=='complex_roots':
  for angle in d['angles']:numeric(P(d['polynomial']).subs(z,P(d['centre'])+P(d['radius'])*s.exp(s.I*s.pi*P(angle))),0,active+' original complex polynomial')
 elif kind=='cartesian_roots':
  for root in d['roots']:exact(P(d['polynomial']).subs(z,P(root)),0,active+' Cartesian original equation');claim(e['solution'],P(root),active+' root displayed')
 elif kind=='unity_product':
  prod,recip=unity_product(d['degree']);exact(prod,P(d['product']),active+' exact product');exact(recip,P(d['reciprocal']),active+' exact reciprocal sum');claim(e['solution'],prod,active+' product displayed');claim(e['solution'],recip,active+' reciprocal displayed')
 elif kind=='parameter':
  mm=d['degree'];exact(s.expand((z**mm-1)**2),z**(2*mm)-2*z**mm+1,active+' endpoint +1');exact(s.expand((z**mm+1)**2),z**(2*mm)+2*z**mm+1,active+' endpoint -1')
 elif kind=='finite':
  val=sum(P(d['ratio'])**kk for kk in range(d.get('start',0),d.get('start',0)+d['terms']));numeric(val,P(d['value']),active+' direct finite sum');claim(e['solution'],P(d['value']),active+' actual finite value')
 elif kind=='binomial':
  val=sum(rr*s.binomial(d['degree'],rr)*P(d['ratio'])**rr for rr in range(d['degree']+1));exact(val,P(d['value']),active+' direct weighted binomial');claim(e['solution'],P(d['value']),active+' actual weighted value')
 elif kind=='infinite':
  qq=P(d['ratio']);check(s.Abs(qq)<1,active+' convergence');numeric(qq/(1-qq),P(d['value']),active+' geometric limit');claim(e['solution'],P(d['value']),active+' actual infinite sum')
 else:check(False,active+' known example model')
set_active('structure');check(len(source)==59,'all 59 source tasks');check(sum(q['marks'] for q in source)==551,'551 owner marks unchanged');check(sum(len(q['parts']) for q in source)==146,'146 owner parts unchanged');check(all(str(i) in coverage for i in range(1,60)),'evidence for every supplied task')
for fixture in fixtures['owner']:check(digest(qby[fixture['uid']])==fixture['contentSha256'],'immutable normalized owner '+fixture['uid'])
for l in package['lessons']:
 check(digest(l)==fixtures['teachingDigests'][l['id']],'teaching fingerprint '+l['id']);check(sum(q['lesson']==l['key'] and q['collection']=='exam' for q in package['questions'])>=6,'six written tasks '+l['key'])
report=dict(checks=len(checks),actualTeXClaims=actual_claims,failures=failures,coverage=coverage,sourceTasks=59,quickChecks=40,workedExamples=20,externalTeacherReview=False,method='Exact complex/Laurent algebra, polynomial degree and real-root counts, quotient-ring unity products, independent direct sums and 50-digit evaluations. Printed general expressions also receive deterministic numerical comparison; this is not claimed as a symbolic proof of every identity for all parameters.')
Path(args.report).write_text(json.dumps(report,indent=2,default=str)+'\n',encoding='utf8');print(json.dumps({k:v for k,v in report.items() if k!='coverage'},default=str));raise SystemExit(bool(failures))
