"""Independent exact hyperbolic, branch, graph, parameter and differential-equation audit."""
import argparse,hashlib,html,json,re
from functools import lru_cache
from pathlib import Path
import sympy as s
from sympy.parsing.latex import parse_latex
from sympy.core.function import AppliedUndef
ap=argparse.ArgumentParser();ap.add_argument('--source');ap.add_argument('--report',default='docs/ARENA-C5-FP2-HYPERBOLIC-MATH-CHECKS-20261107.json');args=ap.parse_args()
x,z,a,k,c,t=s.symbols('x z a k c t',real=True);u=s.Symbol('u',positive=True);loc={v.name:v for v in [x,z,a,k,c,t,u]};checks=[];failures=[];parsing=[];claimed=0
def P(v):return s.sympify(v,locals=loc)
def digest(v):return hashlib.sha256(json.dumps(v,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()
def check(ok,label):
 checks.append(label)
 if not bool(ok):failures.append(label)
def equal(left,right):
 try:
  if left==right:return True
  residual=s.simplify(s.expand_func(s.trigsimp(left-right)))
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
@lru_cache(None)
def tex(raw):
 raw=html.unescape(raw).strip().strip('.,; ');raw=normalise_tex(raw);raw=reciprocals(raw)
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
 value=parse_latex(raw,strict=True).xreplace(logs)
 for atom in value.atoms(AppliedUndef):
  if atom.func.__name__ in loc:value=value.xreplace({atom:loc[atom.func.__name__]*s.prod(atom.args)})
 return value.xreplace({v:s.E if v.name=='e' else loc.get(v.name,v) for v in value.free_symbols})
def blocks(raw):return [aa or bb for aa,bb in re.findall(r'\\\[(.*?)\\\]|\\\((.*?)\\\)',html.unescape(raw),re.S)]
def candidates(raw):
 result=[]
 for block in blocks(raw):
  block=re.sub(r'\\(?:begin|end)\{gathered\}','',block)
  block=block.replace(r'\left','').replace(r'\right','')
  for segment in re.split(r'\\\\|[,;]?\s*\\q(?:q)?uad\s*|[,;]\s*\\\s+|\s+\\text\{or\}\s*',block):
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
      elif ch==',' and depth==1:parts.append(plain[start:j]);start=j+1
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
def root(expr,values,label):
 for index,value in enumerate(values):proof(expr.subs(x,value),label+' root '+str(index+1))
def identity(expr,label):proof(expr.rewrite(s.exp),label)
package=json.loads(Path('content/original/9231-fp2/hyperbolic-v1.json').read_text(encoding='utf8'));fixtures=json.loads(Path('content/original/9231-fp2/hyperbolic-verification-v1.json').read_text(encoding='utf8'))
if args.source:
 data=Path(args.source);owner=json.loads(data.read_text(encoding='utf-8-sig'));source=[q for l in owner['lessons'] for q in l['questions']];check(hashlib.sha256(data.read_bytes()).hexdigest()==package['source']['sha256'],'read-only owner SHA')
else:source=[r['original'] for r in fixtures['owner']]
qmap={q['bank_number']:q for q in source};claims={};calculations={};coverage=set()
def C(num,part,*values):claims.setdefault(num,[]).extend((part,s.sympify(v)) for v in values)
def I(num,expr):identity(expr,'owner '+str(num)+' identity');coverage.add(num)
def R(num,expr,values):
 root(expr,values,'owner '+str(num));coverage.add(num)
def G(num,g,points,limits=()):
 for xx,yy in points:proof(g.subs(x,xx)-yy,'owner '+str(num)+' graph point '+str(xx))
 for direction,value in limits:check(equal(s.limit(g,x,direction),value),'owner '+str(num)+' graph limit '+str(direction))
 coverage.add(num)
I(1,(s.cosh(x)+s.sinh(x))*(s.cosh(x)-s.sinh(x))-1);C(1,0,s.sinh(s.log(4)),s.cosh(s.log(4)),s.tanh(-s.log(4)))
vv=s.log(s.Rational(3,2));R(2,s.tanh(x)-s.Rational(5,13),[vv]);C(2,0,*[s.simplify(f(vv)) for f in [s.sinh,s.cosh,s.sech,s.csch,s.coth]]);C(2,1,vv)
R(3,3*s.cosh(x)-2*s.sinh(x)-3,[0,s.log(5)]);C(3,0,0,s.log(5));check((3*s.cosh(s.log(2))-2*s.sinh(s.log(2)))<3,'owner 3 inequality interior');C(3,1,s.log(5))
I(4,s.sinh(2*x)/s.cosh(x)-2*s.sinh(x));rr=s.log((3+s.sqrt(13))/2);R(4,s.sinh(2*x)-3*s.cosh(x),[rr]);C(4,1,rr)
rr=s.log(7)/2;R(5,s.cosh(x)+s.sinh(x)-7*(s.cosh(x)-s.sinh(x)),[rr]);C(5,0,rr);C(5,1,s.Rational(3,4),s.Rational(24,25))
I(6,2*s.exp(x)+8*s.exp(-x)-8*s.cosh(x-s.log(2)));C(6,0,8*s.cosh(x-s.log(2)));C(6,1,8,s.log(2));R(6,2*s.exp(x)+8*s.exp(-x)-10,[0,s.log(4)]);C(6,2,0,s.log(4))
rs=[s.log((7+sign*s.sqrt(34))/5) for sign in [-1,1]];R(7,4*s.cosh(x)+s.sinh(x)-7,rs);C(7,0,*rs);C(7,1,s.log(s.Rational(3,5)));proof(s.simplify(s.exp(rs[0])*s.exp(rs[1]))-s.Rational(3,5),'owner 7 root product')
I(8,s.exp(-x)/s.cosh(x)-(1-s.tanh(x)));formula=s.log((2-k)/k)/2;C(8,1,formula)
for value in [s.Rational(1,10),1,s.Rational(19,10)]:proof((s.exp(-x)/s.cosh(x)).subs(x,formula.subs(k,value))-value,'owner 8 parameter '+str(value))
coverage.add(8)
G(9,s.sinh(2*x)-1,[(0,-1),(s.asinh(1)/2,0)],[(s.oo,s.oo),(-s.oo,-s.oo)]);C(9,0,s.asinh(1)/2)
g=3*s.cosh(x+s.log(2))-4;zs=[-s.log(2)+sgn*s.acosh(s.Rational(4,3)) for sgn in [-1,1]];G(10,g,[(-s.log(2),-1),(0,-s.Rational(1,4)),*[(r,0) for r in zs]]);C(10,0,*zs)
G(11,2*s.tanh(3*x)-1,[(0,-1),(s.log(3)/6,0)],[(s.oo,1),(-s.oo,-3)]);C(11,0,s.log(3)/6)
g=1/s.cosh(x-1);ends=[1-s.acosh(2),1+s.acosh(2)];G(12,g,[(1,1),*[(r,s.Rational(1,2)) for r in ends]],[(s.oo,0),(-s.oo,0)]);C(12,1,*ends)
G(13,1/s.sinh(2*x),[(-s.log(2)/2,-s.Rational(4,3))],[(s.oo,0),(-s.oo,0)]);C(13,1,-s.log(2)/2)
G(14,s.coth(x+s.log(2)),[(0,s.Rational(5,3)),(s.log(3)/2-s.log(2),2)],[(s.oo,1),(-s.oo,-1)]);C(14,1,s.log(3)/2-s.log(2))
R(15,s.sinh(x)**2-1,[-s.asinh(1),s.asinh(1)]);C(15,0,-s.asinh(1),s.asinh(1))
G(16,4*s.tanh(2*(x-1))+2,[(1,2),(1+s.log(3)/2,s.Rational(26,5)),(1-s.log(3)/4,0)],[(s.oo,6),(-s.oo,-2)]);C(16,0,4,2,1);C(16,1,2);C(16,2,1-s.log(3)/4)
I(17,s.cosh(x+z)-s.cosh(x)*s.cosh(z)-s.sinh(x)*s.sinh(z));C(17,1,s.cosh(s.log(6)))
I(18,s.tanh(2*x)-2*s.tanh(x)/(1+s.tanh(x)**2));rs=[0,*[sgn*s.log(2+s.sqrt(3))/2 for sgn in [-1,1]]];R(18,s.tanh(2*x)-s.Rational(3,2)*s.tanh(x),rs);C(18,1,*rs)
I(19,(s.cosh(x)+1)/s.sinh(x)-s.coth(x/2));R(19,(s.cosh(x)+1)/s.sinh(x)-3,[s.log(2)]);C(19,1,s.log(2))
I(20,s.cosh(3*x)-4*s.cosh(x)**3+3*s.cosh(x));rs=[sgn*s.log(1+s.sqrt(2)) for sgn in [-1,1]];R(20,s.cosh(3*x)-5*s.cosh(x),rs);C(20,1,*rs)
I(21,s.cosh(x)**4-s.sinh(x)**4-s.cosh(2*x));rs=[sgn*s.log(2)/2 for sgn in [-1,1]];R(21,s.cosh(2*x)**4-s.sinh(2*x)**4-s.Rational(17,8),rs);C(21,1,*rs)
I(22,s.tanh(x+z)-s.tanh(x)-s.sinh(z)/(s.cosh(x+z)*s.cosh(x)));C(22,1,s.Rational(5,7))
cc=(5+s.sqrt(33))/4;rs=[sgn*s.acosh(cc) for sgn in [-1,1]];R(23,2*s.sinh(x)**2-5*s.cosh(x)+1,rs);C(23,0,*rs);check((5-s.sqrt(33))/4<1,'owner 23 inadmissible c root')
R(24,s.cosh(2*x)-4*s.sinh(x)-1,[0,s.asinh(2)]);C(24,0,0,s.asinh(2))
I(25,s.coth(x)-s.tanh(x)-2/s.sinh(2*x));rs=[sgn*s.atanh(1/s.sqrt(5)) for sgn in [-1,1]];R(25,s.coth(x)-5*s.tanh(x),rs);C(25,1,*rs)
I(26,5*s.cosh(x)-3*s.sinh(x)-4*s.cosh(x-s.log(2)));rs=[s.log(2)+sgn*s.acosh(2) for sgn in [-1,1]];R(26,5*s.cosh(x)-3*s.sinh(x)-8,rs);C(26,0,4*s.cosh(x-s.log(2)));C(26,2,*rs)
C(27,0,s.Rational(1,2));C(27,1,(1+s.acosh(x))/2);C(27,2,(1+s.log(2))/2);coverage.add(27)
C(28,0,1+s.asinh((x-3)/2));C(28,1,s.Rational(9,2));R(28,2*s.sinh(x-1)+3-s.Rational(9,2),[1+s.log(2)])
C(29,0,s.atanh((x-1)/3)/2);coverage.add(29)
C(30,0,3*x-2,s.sqrt(1+x*x));C(30,1,x/s.sqrt(1+x*x),s.Rational(3,4));R(30,x/s.sqrt(1+x*x)-s.Rational(3,5),[s.Rational(3,4)])
C(31,1,-1,4);R(31,(2*x-3)**2-25,[-1,4])
C(32,1,s.Rational(3,10));R(32,s.tanh(s.log(2))-2*x,[s.Rational(3,10)])
G(33,s.asinh(x+1)-s.log(2),[(-1,-s.log(2)),(-s.Rational(1,4),0),(0,s.log((1+s.sqrt(2))/2))]);C(33,0,s.log((1+s.sqrt(2))/2))
G(34,s.acosh(x-2),[(3,0),(s.Rational(11,3),s.log(3))]);C(34,1,s.Rational(11,3),s.log(3))
C(35,0,s.log(x+s.sqrt(x*x+1)));C(35,1,s.Rational(7,6));R(35,s.sinh(s.log(3))-(2*x-1),[s.Rational(7,6)])
C(36,0,s.log(x+s.sqrt(x*x-1)));C(36,1,s.Rational(9,8));R(36,s.cosh(s.log(4))-(x+1),[s.Rational(9,8)])
C(37,0,s.log((1+x)/(1-x))/2);coverage.add(37)
C(38,0,s.Rational(5,12));C(38,1,s.log(s.Rational(3,2)));R(38,s.sinh(s.log(3)-s.log(2))-x,[s.Rational(5,12)])
rr=(21-s.sqrt(241))/20;C(39,0,rr);proof(10*rr*rr-21*rr+5,'owner 39 quadratic');check(0<rr<s.Rational(1,2) and (21+s.sqrt(241))/20>s.Rational(1,2),'owner 39 valid and rejected roots');coverage.add(39)
C(40,1,s.log(5));proof(s.cosh(s.log(5))-s.Rational(13,5),'owner 40 common inverse value');coverage.add(40)
C(41,0,2*c*c-k*c+1);cc=(5+s.sqrt(17))/4;C(41,2,-s.acosh(cc),s.acosh(cc));R(41,s.cosh(2*x)-5*s.cosh(x)+2,[-s.acosh(cc),s.acosh(cc)]);check(s.diff(2*c+1/c,c).subs(c,1)==1,'owner 41 increasing parameter boundary')
C(42,0,2*t/(1-t*t),(1+t*t)/(1-t*t));rs=[s.log(4+sgn*s.sqrt(11)) for sgn in [-1,1]];C(42,1,*rs);R(42,3*s.cosh(x)-2*s.sinh(x)-4,rs)
C(43,0,1);C(43,1,a-1);proof(s.cosh(2*s.asinh(s.sqrt(u)))-(1+2*u),'owner 43 principal radical identity');coverage.add(43)
C(44,0,s.sqrt(1-a*a),s.atanh(a));C(44,2,0,s.log(4));R(44,s.cosh(x)-s.Rational(3,5)*s.sinh(x)-1,[0,s.log(4)])
I(45,s.cosh(2*x)-1-2*s.sinh(x)**2);C(45,1,2*s.sqrt(6));C(45,2,s.asinh(s.sqrt(s.Rational(3,2))));R(45,s.cosh(2*x)+2-2*s.sqrt(6)*s.sinh(x),[s.asinh(s.sqrt(s.Rational(3,2)))])
# Branch and parameter completeness are checked independently of local root substitutions.
for aa in [s.Rational(-5,3),-1,s.Rational(-3,5),0,s.Rational(3,5),1,s.Rational(5,3)]:
 for kk in [-3,0,1,3]:
  poly=(1-aa)*u*u-2*kk*u+1+aa;roots=s.solve(poly,u);actual=len({s.simplify(r) for r in roots if r.is_real and r>0});threshold=s.sqrt(1-aa*aa) if abs(aa)<1 else None
  expected=(0 if kk<threshold else 1 if kk==threshold else 2) if abs(aa)<1 else (1 if kk>0 else 0) if abs(aa)==1 else 1
  check(actual==expected,'owner 44 exact parameter cases '+str(aa)+','+str(kk))
for kk in [-8,-2*s.sqrt(6),0,2*s.sqrt(6),8]:
 roots=s.solve(2*z*z-kk*z+3,z);actual=len({r for r in roots if r.is_real and r>0});check((actual==2)==(kk>2*s.sqrt(6)),'owner 45 positive-root boundary '+str(kk))
# Inverse identities and domains: substitute the appropriate real branch.
for val in [-3,-1,0,1,3]:
 check(equal(s.asinh(s.sinh(val)),s.Integer(val)),'real inverse sinh '+str(val));check(equal(s.acosh(s.cosh(val)),s.Abs(val)),'principal inverse cosh '+str(val))
for val in [s.Rational(-3,4),0,s.Rational(3,4)]:
 check(equal(s.atanh(val),s.log((1+val)/(1-val))/2),'real logarithmic inverse tanh '+str(val))
for val in [1,s.Rational(5,4),s.Rational(13,5)]:
 check(equal(s.acosh(val),s.log(val+s.sqrt(val*val-1))),'real logarithmic inverse cosh '+str(val))
for val in [-3,0,s.Rational(7,12)]:
 check(equal(s.asinh(val),s.log(val+s.sqrt(val*val+1))),'real logarithmic inverse sinh '+str(val))
# Cross-topic owner tasks: actual final formula, antiderivative, original equation and initial value.
F=u*s.sqrt(u*u-16)/2-8*s.acosh(u/4)
y46=(x+1)*((x+1)*s.sqrt((x+1)**2-16)-16*s.acosh((x+1)/4)+16*s.log(2)-13)
y47=(x+2)*((x+2)*s.asinh((x+2)/3)-s.sqrt((x+2)**2+9)+7-4*s.log(3))
y48=s.tanh(x)*(s.log(s.sinh(x))+2-s.log(s.Rational(4,3)))
y49=(s.Rational(3,8)*s.sinh(4*x)+s.Rational(3,2)*x-1)/s.cosh(2*x)**2
anti50=3*s.sinh(x)**3+s.Rational(24,5)*s.sinh(x)**5+s.Rational(16,7)*s.sinh(x)**7
y50=(anti50+2)/s.cosh(x)
ode=[(46,y46,(x+1)*s.diff(y46,x)-y46-2*(x+1)**2*s.sqrt((x+1)**2-16),4,10,[4,5,7]),
 (47,y47,(x+2)*s.diff(y47,x)-y47-(x+2)**2*s.asinh((x+2)/3),2,8,[-1,0,2]),
 (48,y48,s.sinh(2*x)*s.diff(y48,x)-2*y48-s.sinh(2*x),s.log(3),s.Rational(8,5),[s.Rational(1,3),1,2]),
 (49,y49,s.diff(y49,x)+4*y49*s.tanh(2*x)-3,0,-1,[-1,0,2]),
 (50,y50,s.diff(y50,x)+y50*s.tanh(x)-s.sinh(3*x)**2,0,2,[-1,0,1])]
for num,y,residual,at,value,samples in ode:
 C(num,1 if num!=50 else 2,y);proof(y.subs(x,at)-value,'owner '+str(num)+' initial condition')
 for pt in samples:check(abs(complex(s.N(residual.subs(x,pt),55)))<1e-40,'owner '+str(num)+' original ODE residual '+str(pt))
 coverage.add(num)
positive=s.Symbol('v',positive=True)
proof(s.simplify(s.powdenest((s.diff(F,u)-s.sqrt(u*u-16)).subs(u,positive+4),force=True)),'owner 46 contextual exact derivative')
anti47=(x+2)*s.asinh((x+2)/3)-s.sqrt((x+2)**2+9)
proof(s.diff(anti47,x)-s.asinh((x+2)/3),'owner 47 antiderivative')
I(48,s.diff(s.log(s.coth(x)),x)+2/s.sinh(2*x));I(49,2*s.cosh(2*x)**2-s.cosh(4*x)-1);I(50,s.sinh(3*x)-3*s.sinh(x)-4*s.sinh(x)**3)
proof(s.diff(anti50,x)-s.sinh(3*x)**2*s.cosh(x),'owner 50 polynomial antiderivative')
C(48,2,0);C(49,2,s.Rational(3,4));check(s.limit(y48,x,0,dir='+')==0,'owner 48 endpoint limit');check(s.limit(y49,x,s.oo)==s.Rational(3,4),'owner 49 long-run limit')
check(coverage==set(range(1,51)),'all 50 owner models covered')
def rewrite(text,q):
 for asset in package['assets']:
  if asset['question_uid']==q['content_uid']:text=text.replace('images/hyp_'+str(q['bank_number']).zfill(3)+'.svg','/api/files/'+asset['file_id'])
 return text
owner_checks=[]
for q in source:
 num=q['bank_number'];start=len(checks);actual=next(v for v in package['questions'] if v['id']==q['content_uid']);fixture=next(v for v in fixtures['owner'] if v['bank_number']==num)
 check(fixture['original']==q,'owner '+str(num)+' unchanged source fixture');check(digest(actual)==fixture['contentSha256'],'owner '+str(num)+' content binding')
 for key in ['answer_html','solution_html','hint_html']:check(actual[key]==rewrite(q[key],q),'owner '+str(num)+' unchanged '+key+' except image path')
 check(actual['prompt_html']==q['stem_html']+'<ol class="parts" type="a">'+''.join('<li>'+p['prompt_html']+'<span class="marks">['+str(p['marks'])+']</span></li>' for p in q['parts'])+'</ol>','owner '+str(num)+' unchanged prompts')
 check(actual['parts']==[dict(label=chr(97+i),marking_criteria=[dict(code=r['code'],marks=r['marks'],description_html=r['criterion_html']) for r in p['marking_points']]) for i,p in enumerate(q['parts'])],'owner '+str(num)+' every criterion retained')
 check(actual['marks']==q['marks']==sum(p['marks'] for p in q['parts']) and all(sum(c['marks'] for c in p['marking_points'])==p['marks'] for p in q['parts']),'owner '+str(num)+' all marks')
 for part,value in claims.get(num,[]):claim(q['parts'][part]['answer_html'],value,'owner '+str(num)+' actual part '+str(part+1)+' result '+str(value))
 owner_checks.append(dict(number=num,parts=len(q['parts']),checks=len(checks)-start))
def exact_set(values):return '{'+','.join(str(s.simplify(v)) for v in values)+'}'
def evaluate(m):
 kind=m['kind']
 if kind=='logic':return dict(reason=m['answer'])
 if kind=='values':
  r=s.Integer(m['r']);sh=(r-1/r)/2;ch=(r+1/r)/2;return dict(sinh=sh,cosh=ch,negative=-sh/ch,sech=1/ch)
 if kind=='ratios':
  num=m['num'];den=m['den'];gap=s.sqrt(den*den-num*num);return dict(sinh=num/gap,cosh=den/gap,sech=gap/den,cosech=gap/num,coth=s.Rational(den,num))
 if kind=='equation':
  poly=(m['A']+m['B'])*u**2-2*m['C']*u+m['A']-m['B'];return dict(quadratic=poly,roots=exact_set([r for r in s.solve(poly,u) if r>0]))
 if kind=='cosh_graph':return dict(minimum='('+str(m['h'])+','+str(m['A']+m['d'])+')',range='['+str(m['A']+m['d'])+',inf)')
 if kind=='tanh_graph':return dict(lower=m['d']-m['A'],upper=m['d']+m['A'],centre='('+str(m['h'])+','+str(m['d'])+')',range='('+str(m['d']-m['A'])+','+str(m['d']+m['A'])+')')
 if kind=='coth_graph':return dict(domain='(-inf,'+str(m['h'])+')U('+str(m['h'])+',inf)',range='(-inf,-1)U(1,inf)',vertical=m['h'])
 if kind=='double_angle':
  r=P(m['r']);return dict(sinh=2*r/(1-r*r),cosh=(1+r*r)/(1-r*r),tanh=2*r/(1+r*r))
 if kind=='zero_root':
  rr=s.Rational(m['c'],2);return dict(sinhRoots=exact_set([0,rr]),exponentialRoots=exact_set([1,rr+s.sqrt(rr*rr+1)]))
 if kind=='triple':
  ch=s.sqrt(s.Rational(m['c']+3,4));return dict(coshRoots=exact_set([ch]),exponentialRoots=exact_set([ch-s.sqrt(ch*ch-1),ch+s.sqrt(ch*ch-1)]))
 if kind=='inverse_cosh':
  aa=m['A'];bb=m['B'];h=s.Rational(-bb,aa);return dict(alpha=s.Rational(1,aa),beta=h,domain='[1,inf)',range='['+str(h)+',inf)')
 if kind=='inverse_tanh':return dict(alpha=s.Rational(1,m['B']),argument=[x-m['d'],m['A']],domain='('+str(m['d']-m['A'])+','+str(m['d']+m['A'])+')',range='(-inf,inf)')
 if kind=='modulus':
  aa=m['A'];bb=m['B'];cc=m['c'];return dict(breakpoint=s.Rational(-bb,aa),left=-aa*x-bb,right=aa*x+bb,roots=exact_set([s.Rational(-cc-bb,aa),s.Rational(cc-bb,aa)]))
 if kind=='inverse_values':
  r=P(m['r']);cc=P(m['c']);zz=P(m['z']);return dict(sinh=r+s.sqrt(r*r+1),cosh=cc+s.sqrt(cc*cc-1),tanh=(1+zz)/(1-zz))
 if kind=='log_equations':
  aa=m['A'];bb=m['B'];rr=s.Integer(m['r']);return dict(sinhRoots=exact_set([((rr-1/rr)/2-bb)/aa]),coshRoots=exact_set([((rr+1/rr)/2-bb)/aa]),domain='['+str(s.Rational(1-bb,aa))+',inf)')
 if kind=='inverse_sum':
  rr=m['r'];ratio=s.Rational(rr-1,rr+1);sol=s.solve(2*ratio*x*x-3*x+ratio,x);return dict(domain='(-1/2,1/2)',candidates=exact_set(sol),roots=exact_set([r for r in sol if -s.Rational(1,2)<r<s.Rational(1,2)]))
 if kind=='threshold':return dict(threshold=m['A']+m['B'],below=0,at=1,above=2)
 if kind=='positive_roots':
  dd=m['d'];kk=s.sqrt(8*(dd+1));rr=s.sqrt(s.Rational(dd+1,2));return dict(critical=kk,interval='('+str(kk)+',inf)',sinh=rr,exponential=rr+s.sqrt(rr*rr+1))
 if kind=='radical':return dict(formula=(a-1)/(2*m['B']-m['A']),domain='[1,inf)',value=s.Rational(m['given']-1,2*m['B']-m['A']))
 raise ValueError(kind)
def set_values(raw):
 if raw.startswith('{'):return sorted([s.simplify(P(v)) for v in raw[1:-1].split(',')],key=str)
 return raw
for row in fixtures['quick']:
 q=next(q for q in package['questions'] if q['id']==row['uid']);check(digest(q)==row['contentSha256'],q['id']+' content binding');values=evaluate(row['model'])
 for f in q['fields']:
  actual=f['expected'];value=values[f['key']]
  ok=value==actual if f['type'] in ['choice','pairs'] else set_values(value)==set_values(actual) if f['type']=='set' else all(equal(P(v),P(w)) for v,w in zip(value,actual)) if isinstance(actual,list) else equal(P(value),P(actual))
  check(ok,q['id']+' complete key '+f['key'])
# Independently check all new examples, including each later-topic solution.
examples={e['verification']:e for l in package['lessons'] for e in l['examples']}
example_claims={
 'E1':[s.sinh(s.log(6)),s.cosh(s.log(6)),s.tanh(-s.log(6))],'E2':[f(s.asinh(s.Rational(8,15))) for f in [s.cosh,s.tanh,s.sech,s.csch,s.coth]],
 'E3':[s.log((7+s.sqrt(29))/2),s.log((7-s.sqrt(29))/2)],'E4':[20,0,s.log(4)],
 'G1':[s.log((1+s.sqrt(10))/3)-2],'G2':[1+s.acosh(s.Rational(3,2))/2,1-s.acosh(s.Rational(3,2))/2],'G3':[2,6],'G4':[s.Rational(1,2)-s.log(3)/4],
 'H2':[0,s.log(3)/2,-s.log(3)/2],'H3':[s.acosh(2),-s.acosh(2)],'H4':[24,s.log(s.Rational(4,3))],
 'V1':[(s.acosh(x)+3)/4],'V2':[2+s.atanh((x+3)/5)],'V3':[-s.Rational(2,3),-2],'V4':[s.Rational(5,12)],
 'L1':[s.log(x+s.sqrt(x*x+1))],'L2':[s.log(x+s.sqrt(x*x-1))],'L3':[s.log((1+x)/(1-x))/2],'L4':[(8-s.sqrt(37))/9],
 'M2':[1],'M3':[s.Rational(1,2)],'M4':[2*s.sqrt(5)-4*s.asinh(2)]
}
for row in fixtures['examples']:
 uid=row['id'];e=examples[uid];check(digest(e)==row['contentSha256'],uid+' content binding')
 for value in example_claims.get(uid[6:],[]):claim(e['solution'],value,uid+' displayed value '+str(value))
root(6*s.cosh(x)-4*s.sinh(x)-7,[s.log((7+sgn*s.sqrt(29))/2) for sgn in [-1,1]],'example E3')
identity(5*s.exp(x)+20*s.exp(-x)-20*s.cosh(x-s.log(2)),'example E4 shift')
root(1-3*s.sinh(x+2),[s.log((1+s.sqrt(10))/3)-2],'example G1 zero')
root(2*s.cosh(2*x-2)-3,[1+sgn*s.acosh(s.Rational(3,2))/2 for sgn in [-1,1]],'example G2 zeros')
root(s.coth(2*x-1)+2,[s.Rational(1,2)-s.log(3)/4],'example G4 zero')
check(s.limit(4-2*s.tanh(x-3),x,s.oo)==2 and s.limit(4-2*s.tanh(x-3),x,-s.oo)==6,'example G3 both asymptotes')
check((4-2*s.tanh(x-3)).subs(x,3)==4,'example G3 centre')
identity(s.sinh(2*x)-2*s.sinh(x)*s.cosh(x),'example H1 proof')
root(s.tanh(2*x)-s.Rational(8,5)*s.tanh(x),[0,-s.log(3)/2,s.log(3)/2],'example H2 roots')
root(s.cosh(3*x)-13*s.cosh(x),[-s.acosh(2),s.acosh(2)],'example H3 roots')
identity(25*s.cosh(x)-7*s.sinh(x)-24*s.cosh(x-s.log(s.Rational(4,3))),'example H4 shift')
proof(s.cosh(4*((s.acosh(x)+3)/4)-3)-x,'example V1 whole inverse formula')
proof(5*s.tanh((2+s.atanh((x+3)/5))-2)-3-x,'example V2 whole inverse formula')
for pt in [-2,-s.Rational(2,3)]:check(s.Abs(3*pt+4)==2,'example V3 original modulus '+str(pt))
proof(((x+s.sqrt(x*x+1))-1/(x+s.sqrt(x*x+1)))/2-x,'example L1 exponential root')
proof(((x+s.sqrt(x*x-1))+1/(x+s.sqrt(x*x-1)))/2-x,'example L2 exponential root')
proof((((1+x)/(1-x))-1)/(((1+x)/(1-x))+1)-x,'example L3 positive quotient')
rr=(8-s.sqrt(37))/9;proof(9*rr*rr-16*rr+3,'example L4 polynomial');check(0<rr<s.Rational(1,3),'example L4 original inverse domain')
check(abs(complex(s.N(s.atanh(rr)+s.atanh(3*rr)-s.log(7)/2,55)))<1e-40,'example L4 original inverse equation')
for aa in [-3,-2,-1,0,1,2,3]:
 for kk in [-2,0,2,4]:
  roots=s.solve((2-aa)*u*u-2*kk*u+2+aa,u);actual=len({r for r in roots if r.is_real and r>0})
  threshold=s.sqrt(4-aa*aa) if abs(aa)<2 else None
  expected=(0 if kk<threshold else 1 if kk==threshold else 2) if abs(aa)<2 else (1 if kk>0 else 0) if abs(aa)==2 else 1
  check(actual==expected,'example M1 parameter '+str(aa)+','+str(kk))
proof(s.cosh(2*s.asinh(s.sqrt(3)))-7,'example M2 exact root')
ym3=(x/2+s.sinh(2*x)/4+3)/s.cosh(x)**2;identity(s.diff(ym3,x)+2*ym3*s.tanh(x)-1,'example M3 ODE');check(ym3.subs(x,0)==3,'example M3 initial');check(s.limit(ym3,x,s.oo)==s.Rational(1,2),'example M3 limit')
um=x+4;ym4=um*(um*s.asinh(um/2)-s.sqrt(um*um+4)+2*s.sqrt(5)-4*s.asinh(2));proof(um*s.diff(ym4,x)-ym4-um*um*s.asinh(um/2),'example M4 ODE');check(equal(ym4.subs(x,0),s.S.Zero),'example M4 initial')
for l in package['lessons']:check(digest(l)==fixtures['teachingDigests'][l['id']],l['id']+' teaching binding')
for asset in package['assets']:
 data=Path(asset['path']).read_bytes();check(hashlib.sha256(data).hexdigest()==asset['sha256'] and len(data)==asset['size'],'solution image '+asset['file_id']);check(data[:8]==b'\x89PNG\r\n\x1a\n' and int.from_bytes(data[16:20],'big')==asset['width'] and int.from_bytes(data[20:24],'big')==asset['height'],'solution PNG dimensions '+asset['file_id'])
report=dict(checks=len(checks),failures=failures,owner=50,parts=104,marks=337,newlyAuthored=44,archiveMappings=6,quick=48,examples=24,solutionImages=11,parsedResultClaims=claimed,ownerChecks=owner_checks,methods=['exact exponential identities','actual TeX result parsing','positive exponential and hyperbolic substituted roots','real principal inverse branches and domains','graph points and asymptotic limits','exact parameter classification and boundary cases','antiderivative differentiation','original ODE residuals and initial conditions','endpoint and long-run limits'],editorialRepairs=[])
Path(args.report).write_text(json.dumps(report,indent=2)+'\n',encoding='utf8');print(json.dumps({v:report[v] for v in ['checks','failures','owner','quick','examples','parsedResultClaims']},ensure_ascii=True));raise SystemExit(bool(failures))
