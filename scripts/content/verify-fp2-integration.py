"""Independent quadrature, recurrence, geometry and rectangle-sum audit."""
import argparse,hashlib,html,json,re
from functools import lru_cache
from pathlib import Path
import sympy as s
from sympy.parsing.latex import parse_latex
from sympy.core.function import AppliedUndef
ap=argparse.ArgumentParser();ap.add_argument('--source');ap.add_argument('--report',default='docs/ARENA-C5-FP2-INTEGRATION-MATH-CHECKS-20261107.json');args=ap.parse_args()
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
 raw=re.sub(r'(\\(?:sin|cos|tan|sec|csc|cot|sinh|cosh|tanh)(?:\^(?:\{[^}]+\}|[nm0-9]))?)\s*(\d*[xut]|\\theta)\b',lambda m:m[1]+'('+m[2]+')',raw)
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

# The numeric models below are reconstructed from statements, not from answer keys.
import mpmath as mp
mp.mp.dps=55
n=s.Symbol('n',integer=True);N=s.Symbol('N',positive=True,integer=True);m=s.Symbol('m',integer=True)
loc.update(n=n,N=N,m=m,theta=x)
_candidates=candidates
def candidates(raw):
 raw=raw.replace(r'\lt','<').replace(r'\gt','>')
 raw=re.sub(r'(\\(?:sin|cos|tan|sinh|cosh|tanh)\^\{-1\})\s*(\d+)\b',r'\1(\2)',raw)
 result=_candidates(raw)
 for block in blocks(raw):
  for piece in re.split(r'<|>|\\(?:le|ge|to)(?![A-Za-z])',block):result+=_candidates(r'\['+piece+r'\]')
 return result
package=json.loads(Path('content/original/9231-fp2/integration-v1.json').read_text(encoding='utf8'));fixtures=json.loads(Path('content/original/9231-fp2/integration-verification-v1.json').read_text(encoding='utf8'))
source=[z['original'] for z in fixtures['owner']];qmap={q['bank_number']:q for q in source};qby={q['id']:q for q in package['questions']};numeric_claims=0
if args.source:
 data=Path(args.source);owner=json.loads(data.read_text(encoding='utf-8-sig'));check(hashlib.sha256(data.read_bytes()).hexdigest()==package['source']['sha256'],'read-only owner SHA');check(source==[q for l in owner['lessons'] for q in l['questions']],'every source field unchanged')
def set_active(i):
 global active
 active=i
def integral_tex(raw):
 raw=raw.split(r'\quad')[0].strip().strip('.,; ')
 raw=re.sub(r'\\[,!]\s*d([xut])',r' d\1',raw)
 value=tex(raw)
 check(isinstance(value,s.Integral),'actual definite integral parses: '+raw)
 return value
def number(v):
 if isinstance(v,s.logic.boolalg.Boolean):raise ValueError('Not a numeric expression')
 return mp.mpf(str(s.N(v,53)))
def quad(f,var,lo,hi,subs=None):
 f=f.subs(subs or {});fn=s.lambdify(var,f,'mpmath');aa=number(lo.subs(subs or {}) if hasattr(lo,'subs') else lo);bb=number(hi.subs(subs or {}) if hasattr(hi,'subs') else hi)
 return mp.quad(fn,[aa,(aa+bb)/2,bb])
def numeric_equal(a,b):return abs(a-b)<mp.mpf('1e-30')*max(1,abs(a),abs(b))
def C(i,part,*values):
 global numeric_claims
 set_active(i);raw=qmap[i]['parts'][part]['answer_html'];cs=candidates(raw)
 for value in values:
  value=s.sympify(value);found=False
  for z in cs:
   if equal(z,value):found=True;break
   if z.free_symbols==value.free_symbols:
    try:
     subs={z:2 for z in z.free_symbols};found=numeric_equal(number(z.subs(subs)),number(value.subs(subs)))
     if found:break
    except (ValueError,TypeError):pass
  check(found,'owner '+str(i)+' part '+str(part+1)+' actual supplied answer: '+str(value));numeric_claims+=1
def Q(i,part,fn,var,lo,hi,mult=1,subs=None):
 global numeric_claims
 set_active(i);value=quad(fn,var,s.sympify(lo),s.sympify(hi),subs)*number(mult);raw=qmap[i]['parts'][part]['answer_html'];found=False
 for z in candidates(raw):
  try:
   if numeric_equal(number(z.subs(subs or {})),value):found=True;break
  except (TypeError,ValueError):pass
 check(found,'owner '+str(i)+' part '+str(part+1)+' quadrature matches supplied answer');numeric_claims+=1
families={}
for i,q in qmap.items():
 if q['topic']!='Reduction formulae' or i==17:continue
 set_active(i);raw=next(b for b in blocks(q['stem_html']) if r'\int' in b).split('=')[-1]
 integral=integral_tex(raw);families[i]=integral
 integrand=integral.function;var,lo,hi=integral.limits[0]
 @lru_cache(None)
 def at(index):return quad(integrand,var,lo,hi,{n:index})
 recs=[]
 for block in blocks(q['answer_html']):
  if '=' not in block or r'\int' in block or not re.search(r'I_(?:\{n|n)',block):continue
  # Each I token is replaced by a distinct symbolic placeholder before parsing.
  indexes={}
  def token(mm):
   idx=tex(mm[1] or mm[2]);key='Y_{'+str(len(indexes))+'}';indexes[tex(key)]=idx;return key
  raw=re.sub(r'I_(?:\{([^{}]+)\}|(n|\d+))',token,block)
  try:
   aa,bb=raw.split('=',1);equation=tex(aa)-tex(bb)
   for nv in [4,5,6]:
    bindings={key:at(int(idx.subs(n,nv))) for key,idx in indexes.items()};res=equation.subs(n,nv)
    fn=s.lambdify(list(bindings),res,'mpmath');check(abs(fn(*bindings.values()))<mp.mpf('1e-30'),'owner '+str(i)+' supplied recurrence at n='+str(nv))
   recs.append(block)
  except Exception as e:parsing.append(dict(owner=i,block=block,error=str(e)));check(False,'owner '+str(i)+' recurrence parsed')
 check(bool(recs),'owner '+str(i)+' every recurrence has numeric evidence')
 # Directly integrate every explicitly requested member, in that part's own answer.
 for j,part in enumerate(q['parts']):
  targets=re.findall(r'I_(?:\{(\d+)\}|(\d+))',part['prompt_html'])
  if (i,j) in [(27,2),(15,2),(11,1),(34,2),(35,2),(40,1)]:continue # applications, rounded outputs and symbolic I1 handled separately
  for aa,bb in targets:
   index=int(aa or bb);wanted=at(index)
   found=False
   for z in candidates(part['answer_html']):
    try:found=found or (not z.free_symbols and numeric_equal(number(z),wanted))
    except (TypeError,ValueError):pass
   check(found,'owner '+str(i)+' part '+str(j+1)+' requested I'+str(index)+' direct quadrature');numeric_claims+=1
# Extra applications, proofs and non-family technique problems.
C(2,0,3/(a+1));C(2,1,1)
Q(4,0,1/s.sqrt(12*x-x*x-20),x,6,8)
Q(5,0,1/s.sqrt((x-2)**2-9),x,5,7)
C(6,0,2*(s.exp(-3)-1));C(6,1,2*s.pi*(1-s.exp(-6))/3);C(6,2,-s.log((1+s.exp(-6))/2)/6)
C(7,0,2/s.log(2));C(7,1,(2*s.log(2)-1)/3)
C(8,0,8*s.pi*((a+4)**s.Rational(3,2)-(a+1)**s.Rational(3,2))/3);C(8,1,3)
Q(1,2,4*s.pi*s.cot(x)**4,x,s.pi/6,s.pi/2)
Q(3,2,s.sec(x)**6*s.tan(x)**2,x,0,s.pi/6,mult=6/s.pi)
Q(9,2,9*s.pi*s.sin(2*x)**6,x,0,s.pi/4,subs={k:2})
Q(12,2,s.pi*s.exp(3*x)*s.cos(x)**4,x,-s.pi/2,s.pi/2)
Q(15,2,s.sqrt(1+x*x/9),x,0,4)
Q(17,3,s.sin(x)**4*s.cos(x)**7,x,0,s.pi/2)
C(17,0,-s.cos(x)**(n+1)/(n+1)+s.Symbol('C'))
for mv,nv in [(4,7),(5,3),(2,2)]:
 set_active(17);left=quad(s.sin(x)**mv*s.cos(x)**nv,x,0,s.pi/2);right=mp.mpf(mv-1)/(mv+nv)*quad(s.sin(x)**(mv-2)*s.cos(x)**nv,x,0,s.pi/2);check(numeric_equal(left,right),'owner 17 two-index recurrence '+str((mv,nv)))
identity(64*s.cos(x)**7-(s.cos(7*x)+7*s.cos(5*x)+21*s.cos(3*x)+35*s.cos(x)),'owner 17 multiple-angle identity')
Q(22,2,s.sin(x)**5/s.cos(x)**6,x,0,s.atan(s.Rational(1,2)))
Q(27,2,s.log(x)**3,x,1,s.exp(2),mult=1/(s.exp(2)-1))
Q(30,2,s.asin(x)**3,x,0,1)
set_active(11);first=quad(s.sin(s.pi*x/2)/x,x,1,2);target=quad(s.sin(s.pi*x/2)/x**5,x,1,2);raw=qmap[11]['parts'][1]['answer_html'].replace('I_1','z').replace('I_{1}','z');check(any(numeric_equal(number(v.subs(loc['z'],s.Float(str(first),55))),target) for v in candidates(raw) if v.free_symbols<={loc['z']}),'owner 11 I5 expressed using I1')
Q(33,2,4*s.pi*s.sec(2*x)**4,x,0,s.pi/12)
for i,k0,idx,lower,upper in [(34,2,4,7,s.Rational(67,9)),(35,3,5,s.Rational(92,5),s.Rational(817,40))]:
 set_active(i);check(number(lower)<mp.exp(k0)<number(upper),'owner '+str(i)+' exponential bounds');check(0<quad((1-x)**idx*s.exp(k0*x),x,0,1)<mp.mpf(1)/3,'owner '+str(i)+' positive-integral estimate')
set_active(40);actual=quad((1+2*x**4)**-1,x,0,1);check(abs(actual-mp.mpf('0.79468444'))<=mp.mpf('0.5e-8'),'owner 40 rounded input');C(40,1,s.Rational(21,6400000000));check(abs(quad((1+2*x**4)**-3,x,0,1)-mp.mpf('0.608317'))<mp.mpf('0.5e-6'),'owner 40 rounded output')
set_active(44);A0=s.Rational(1,3);B0=-A0
for nv in range(7):
 if nv:A0=(2**nv-nv*A0)/3;B0=-nv*B0/3
 check(numeric_equal(quad(x*x*s.log(x)**nv,x,1,s.exp(2)),number(A0*s.exp(6)+B0)),'owner 44 rational induction coefficients '+str(nv))
set_active(48)
for nv in range(8):check(0<quad(x**nv*s.exp(-2*x),x,0,2)<number(s.factorial(nv)/2**(nv+1)),'owner 48 factorial bound '+str(nv))
# Geometric models: coordinates and intervals are independently transcribed from prompts.
geometry={
50:('3*sech(2*t)','3*tanh(2*t)','0','log(2)/2','x',{'surface':1}),
51:('-4*t+exp(2*t)/2','4*exp(t)','0','log(2)','x',{'arc':0}),
52:('3*t-3*sin(t)','3-3*cos(t)','0','pi','x',{'surface':1}),
53:('t','exp(2*t)/2','-log(2)+log(3)/2','log(2)-log(3)/2','x',{'surface':1}),
54:('t','t*t/4','0','3/2','x',{'surface':2}),
55:('t','cosh(2*t)/2','0','log(2)/2','x',{'surface':0}),
56:('3*cosh(t)','17*t/8-9*sinh(2*t)/16','0','log(2)','x',{'surface':1}),
57:('4*t+3*cosh(t)','-3*t+4*cosh(t)','-1','1','y',{'surface':2}),
58:('t','2*cosh(t/2)','0','2*log((1+sqrt(10))/3)','x',{'arc':2}),
59:('t','3*cosh(t/3)','0','3*log(2)','x',{'surface':0}),
60:('-t*t+8*t','16*t**(3/2)/3','0','2','x',{'surface':2}),
62:('t','2*cosh(t/2)','0','2*log(3)','x',{'mean':0,'volume':1,'arc':2,'surface':3}),
63:('2*t**(7/2)/7-2*sqrt(t)','t*t','1','4','x',{'arc':0,'surface':1}),
64:('-9*t+exp(t)+8','12*exp(t/2)','0','2*log(2)','x',{'arc':0,'surface':1}),
65:('2*t*t','-2*t**3/3+2*t','0','1/2','x',{'arc':0,'surface':1}),
66:('t*t','sqrt(3-t)','0','3','x',{'mean':1,'volume':2}),
67:('4*t**(3/2)/3+5*t','-4*t**(3/2)/3+5*t','0','4','x',{'arc':0,'mean':1}),
68:('3-9*t*t','3*t*(1-3*t*t)','0','sqrt(3)/3','y',{'arc':0,'surface':1}),
69:('t','-3*log(1-t*t/9)','-1','2','x',{'arc':1}),
70:('exp(t)*cos(2*t)','exp(t)*sin(2*t)','-pi/4','pi/4','x',{'arc':0,'surface':1}),
71:('2*exp(3*t)*cos(t)','2*exp(3*t)*sin(t)','0','pi/3','x',{'arc':0}),
72:('exp(t)*cos(3*t)','exp(t)*sin(3*t)','0','pi/6','x',{'arc':0}),
73:('t','4*sec(t/2)','0','pi/3','x',{'arc':1,'surface':2,'mean':3}),
74:('5*t*t/2','5*t**3/3','0','3','x',{'arc':0,'area':1,'volume':2}),
75:('3*t*t','-t**3+3*t','0','1','x',{'surface':0,'mean':1}),
76:('t*t/2','-t**3/6+t/2','0','sqrt(3)','x',{'surface':0,'volume':1}),
77:('t','-2*log(cos(t/2))','0','2*pi/3','x',{'arc':1}),
78:('t','k*t','0','h','x',{'surface':0}),
80:('t**6-6*log(t)','4*t**3','1','2','x',{'arc':0}),
81:('t','2*t**(3/2)/3','1','4','x',{'area':0,'volume':1}),
82:('2*t*t','-2*t**3/3+2*t+1','0','3/2','x',{'arc':0,'surface':1}),
83:('t**3','t**6/6-9*log(t)/4','1','2','y',{'surface':0}),
85:('3*exp(t/2)*cos(t)','3*exp(t/2)*sin(t)','0','pi','x',{'arc':0,'surface':1}),
86:('t','3*cosh(2*t/3)/2','0','3*log(2)/2','x',{'mean':0,'arc':1,'surface':2}),
88:('2*t*sin(t)+2*cos(t)','-2*t*cos(t)+2*sin(t)','0','pi/3','x',{'surface':0}),
}
for i,(xx,yy,lo,hi,axis,claims) in geometry.items():
 set_active(i);X=P(xx);Y=P(yy);aa=P(lo);bb=P(hi);speed=s.sqrt(s.trigsimp(s.diff(X,t)**2+s.diff(Y,t)**2));subs={k:s.Integer(2),h:s.Integer(3)} if i==78 else {}
 for kind,part in claims.items():
  fn={'arc':speed,'surface':2*s.pi*s.Abs(Y if axis=='x' else X)*speed,'mean':Y*s.diff(X,t)/(X.subs(t,bb)-X.subs(t,aa)),'volume':s.pi*Y*Y*s.diff(X,t),'area':Y*s.diff(X,t)}[kind]
  if i==70 and kind=='surface':
   # Split at the actual radius crossing to avoid a non-smooth quadrature interval.
   got=quad(fn,t,aa,0)+quad(fn,t,0,bb);cs=candidates(qmap[i]['parts'][part]['answer_html']);check(any(not z.free_symbols and numeric_equal(number(z),got) for z in cs),'owner 70 split absolute-radius surface');numeric_claims+=1
  else:Q(i,part,fn,t,aa,bb,subs=subs)
# Extra geometric results not expressible as the table's single measure.
C(55,1,s.Rational(1,2)+x*x)
C(58,0,2*s.log((1+s.sqrt(10))/3));set_active(58);point_in_text(qmap[58]['parts'][1]['answer_html'],a,2*s.sqrt(10)/3,'owner 58 intersection coordinates')
C(60,0,-4*s.sqrt(t)/(t-4),(-t-4)/(s.sqrt(t)*(t-4)**3));C(60,1,s.sqrt(2)/6)
C(61,1,3*s.pi*a*a/2);C(61,2,4*a);C(61,3,s.pi/3)
C(66,0,3*(2-t)/(16*t**3*(3-t)**s.Rational(3,2)))
C(68,2,3*s.sec(x)*(1-3*s.tan(x)**2));C(68,3,4*s.sqrt(3)/5)
Q(77,0,s.sec(x/2),x,s.pi/3,2*s.pi/3,mult=3/s.pi)
Q(79,1,2*t**3*s.sin(2*t),t,0,s.pi/4)
Q(81,2,s.sqrt(1+x),x,3,8)
Q(84,0,t*s.sqrt(18),t,0,3);Q(84,1,2*s.pi*(9-t*t)**s.Rational(3,2)/3*t*s.sqrt(18),t,0,3)
set_active(87);speed=s.sqrt(1+4*x**4);got=quad(2*s.pi*(3+2*x**3/3)*speed,x,0,1);length=quad(speed,x,0,1);check(numeric_equal(got,6*mp.pi*length+mp.pi/18*(5*mp.sqrt(5)-1)),'owner 87 stated area in terms of length')
Q(89,0,s.sec(x/3),x,0,s.pi);Q(89,1,2*s.pi*3*s.sqrt(x+1)*s.sqrt(1+s.Rational(9,4)/(x+1)),x,0,3)
# Rectangle sums: exact endpoint sums, the integral and least-integer tests.
r=s.Symbol('r',integer=True,positive=True)
for i,raw in {93:'-x**2+3*x',94:'(2-x)**2',96:'exp(2-2*x)',97:'3**(-x)',99:'4**x',100:'log(x+2)',103:'x**3+x',105:'x*x+2*x',109:'2-x*x'}.items():
 set_active(i);f=P(raw);increasing=bool(s.diff(f,x).subs(x,s.Rational(1,2))>0)
 right=s.summation(f.subs(x,r/N),(r,1,N))/N;left=s.summation(f.subs(x,r/N),(r,0,N-1))/N;U=right if increasing else left;L=left if increasing else right;gap=s.Abs(f.subs(x,1)-f.subs(x,0))/N;J=s.integrate(f,(x,0,1))
 # Compare the supplied closed formula against direct rectangles at three N.
 for part,expected in [(0,U if i!=97 else L),(1,L if i!=97 else U)]:
  if i==99 or i==100 or i==96 or i==97:
   # Product/log/geometric expressions may not simplify symbolically, so use
   # independent direct sums instead of assuming a symbolic summation succeeded.
   pass
  cs=[z.subs({s.Symbol('U_{N}'):U,s.Symbol('L_{N}'):L}) for z in candidates(qmap[i]['parts'][part]['answer_html'])];found=False
  for z in cs:
   try:
    valid=True
    for nv in [2,5,9]:
     exact=sum((number(f.subs(x,s.Rational(j,nv))) for j in (range(1,nv+1) if (increasing==(expected==U)) else range(nv))),mp.mpf(0))/nv
     if not numeric_equal(number(z.subs(N,nv)),exact):valid=False;break
    if valid:found=True;break
   except (TypeError,ValueError):pass
  check(found,'owner '+str(i)+' actual '+('upper' if expected==U else 'lower')+' rectangle formula')
 for nv in [1,2,7]:
  ll=sum((number(f.subs(x,s.Rational(j,nv))) for j in (range(nv) if increasing else range(1,nv+1))),mp.mpf(0))/nv
  uu=sum((number(f.subs(x,s.Rational(j,nv))) for j in (range(1,nv+1) if increasing else range(nv))),mp.mpf(0))/nv
  check(ll<number(J)<uu,'owner '+str(i)+' strict rectangle comparison N='+str(nv));check(numeric_equal(uu-ll,number(gap.subs(N,nv))),'owner '+str(i)+' endpoint gap N='+str(nv))
 if i in [93,94,100]:C(i,2,J)
 if i==96:C(i,3,J);check(equal(s.series((1-s.exp(-2*x))/x,x,0,3).removeO(),2-2*x+4*x*x/3),'owner 96 reciprocal-variable expansion')
 if i in [97,99,103]:
  threshold={97:s.Rational(1,2000),99:s.Rational(1,10000),103:s.Rational(1,1000)}[i];least={97:1334,99:30001,103:2001}[i];C(i,2,least)
  check(gap.subs(N,least)<=threshold if i==97 else gap.subs(N,least)<threshold,'owner '+str(i)+' least integer accepted')
  check(gap.subs(N,least-1)>threshold if i==97 else gap.subs(N,least-1)>=threshold,'owner '+str(i)+' preceding integer rejected')
C(90,0,s.atan(2)/2);C(90,1,s.atan(2)/2-s.Rational(4,5)/N);C(90,2,s.atan(2)/2)
C(91,0,s.exp(2*s.sqrt(N))-s.exp(2));C(91,2,1)
C(92,0,s.Rational(9,8)-1/(2*N*N)+N**-3);C(92,1,s.Rational(5,4)-1/(2*N*N));C(92,2,s.Rational(9,8),s.Rational(5,4))
C(95,0,x*s.asinh(x/2)-s.sqrt(x*x+4)+s.Symbol('C'));C(95,1,N*s.asinh(N/2)-s.sqrt(N*N+4)+2);C(95,2,(N+1)*s.asinh(N/2)-s.sqrt(N*N+4)+2)
C(98,2,s.log(2)/4-s.tanh(2)/2+s.log(s.cosh(2))/4)
C(101,4,s.pi/4)
C(102,0,s.acosh(x/2+1)+s.Symbol('C'))
C(104,0,(-2*s.log(x)-1)/(4*x*x)+s.Symbol('C'));C(104,2,(2*s.log(2)+1)/16,(4*s.log(2)+1)/16)
C(107,0,s.log(3*N*N-2)/6);C(107,2,s.Rational(1,3))
C(108,0,s.log((N+1+s.sqrt(N*N+2*N+5))/(1+s.sqrt(5))))
series_models={91:('exp(2*sqrt(x))/sqrt(x)',1,'increasing'),92:('x**-3',2,'decreasing'),95:('asinh(x/2)',0,'increasing'),98:('x*sech(2*x)**2',1,'decreasing'),101:('sech(2*x)',0,'decreasing'),102:('1/sqrt(x*x+4*x)',1,'decreasing'),104:('log(x)/x**3',2,'decreasing'),106:('log(2*x+1)',1,'increasing'),107:('x/(3*x*x-2)',1,'decreasing'),108:('1/sqrt(x*x+2*x+5)',0,'decreasing')}
for i,(raw,start,direction) in series_models.items():
 set_active(i);f=P(raw)
 for nv in [max(start+1,2),7,17]:
  # When the comparison starts at zero, the sum starts at one.
  first=max(1,start);S=sum((number(f.subs(x,j)) for j in range(first,nv+1)),mp.mpf(0));J=quad(f,x,start,nv);fm=number(f.subs(x,start));fN=number(f.subs(x,nv))
  if start==0:
   lower=J-fm+fN;upper=J+fN-fm if direction=='increasing' else J
   if direction=='increasing':lower=J;upper=J+fN-fm
  elif direction=='decreasing':lower=J+fN;upper=J+fm
  else:lower=J+fm;upper=J+fN
  check(lower<S<upper,'owner '+str(i)+' independent unit-rectangle bounds N='+str(nv))
 for atx in [start+s.Rational(1,4),start+1,start+5]:check(s.diff(f,x).subs(x,atx)>0 if direction=='increasing' else s.diff(f,x).subs(x,atx)<0,'owner '+str(i)+' monotonicity sample '+str(atx))
set_active(98);g=4*x*s.tanh(2*x)-1;check(g.subs(x,s.Rational(3,10))<0<g.subs(x,s.Rational(2,5)),'owner 98 stationary bracket');check(equal(s.diff(x*s.tanh(2*x)/2-s.log(s.cosh(2*x))/4,x),x*s.sech(2*x)**2),'owner 98 actual primitive')
set_active(101);gap=quad(s.sech(2*x),x,0,1)-number(s.sech(2));check(gap>0,'owner 101 fixed positive gap survives the infinite limit')
set_active(106)
for nv in [2,5,12]:check(s.prod(2*j+1 for j in range(1,nv+1))==s.factorial(2*nv+1)/(2**nv*s.factorial(nv)),'owner 106 factorial product '+str(nv))
# Independently recompute every complete short-answer structure and every example.
def geometry_value(d,kind):
 X=P(d['X']);Y=P(d['Y']);speed=P(d['speed']);aa=P(d['lo']);bb=P(d['hi']);identity(s.diff(X,t)**2+s.diff(Y,t)**2-speed**2,active+' squared speed')
 for pt in [aa+(bb-aa)/4,aa+(bb-aa)*3/4]:check(speed.subs(t,pt)>=0,active+' non-negative speed')
 if kind=='arc':return s.integrate(speed,(t,aa,bb))
 radius=Y if d['axis']=='x' else X
 if 'split' in d:
  split=P(d['split']);return s.simplify(2*s.pi*(-s.integrate(radius*speed,(t,aa,split))+s.integrate(radius*speed,(t,split,bb))))
 return s.simplify(2*s.pi*s.integrate(radius*speed,(t,aa,bb)))
for z in fixtures['quick']:
 q=qby[z['uid']];d=z['model'];kind=d['kind'];set_active(q['id']);check(digest(q)==z['contentSha256'],active+' immutable content fingerprint');fields={f['key']:f for f in q['fields']}
 def F(key,value):
  field=fields[key];actual=P(field['expected'][0])/P(field['expected'][1]) if field['type']=='ratio' else P(field['expected']);check(equal(actual,value),active+' whole field '+key)
 if kind=='inverse_integral':
  aa=d['a'];kk=d['k'];qq=d['q'];F('coefficient',s.Rational(1,kk));F('endpoint',qq);check(equal(s.sinh(s.log(qq)),P(d['end'])*kk/aa),active+' actual transformed endpoint')
 elif kind=='circular_integral':F('value',s.asin(d['k']*P(d['end'])/d['a'])/d['k'])
 elif kind=='root_integral':
  aa=d['a'];qq=d['q'];F('log',s.Rational(aa*aa,2));F('constant',s.Rational(aa*aa,4)*s.sinh(2*s.log(qq)));check(equal(s.sinh(s.log(qq)),P(d['end'])/aa),active+' endpoint')
 elif kind=='exp_recurrence':
  kk=d['k'];F('a',-kk);F('b',n);F('c',s.Rational(1,kk*kk));F('d',-s.Rational(kk+1,kk*kk));identity(s.diff(x**n*s.exp(-kk*x),x)-(-kk*x**n+n*x**(n-1))*s.exp(-kk*x),active+' recurrence derivative')
 elif kind=='power_recurrence':
  aa=d['a'];F('a',n+1);F('b',-n);F('value',s.integrate((1+aa*x)**2,(x,0,1)))
 elif kind=='rational_recurrence':
  aa=d['a'];F('a',1-2*n);F('b',2*n);F('c',s.Rational(1,2*(aa+1)));F('d',s.Rational(1,2))
 elif kind=='sine_values':
  for key,degree in [('base',0),('middle',2),('target',4)]:F(key,s.integrate(s.sin(d['k']*x)**degree,(x,0,s.pi/(2*d['k']))))
 elif kind=='cosh_square':F('log',s.Rational(1,2*d['k']));F('constant',s.sinh(2*s.log(d['q']))/(4*d['k']))
 elif kind=='weighted_hyperbolic':F('value',s.tanh(s.log(d['q']))**3/3)
 elif kind in ['arc','surface']:F('length' if kind=='arc' else 'area',geometry_value(d,kind))
 elif kind=='polar_arc':
  R=P(d['r']);speed=P(d['speed']);identity(R*R+s.diff(R,t)**2-speed**2,active+' polar speed');F('length',s.integrate(speed,(t,P(d['lo']),P(d['hi']))))
 elif kind=='rectangles':
  fn=P(d['f']);U=s.summation(fn.subs(x,r/n),(r,1,n))/n;F('upper',U);F('lower',U-(fn.subs(x,1)-fn.subs(x,0))/n);F('limit',s.integrate(fn,(x,0,1)))
 elif kind=='threshold':
  fn=P(d['f']);gap=fn.subs(x,1)-fn.subs(x,0);target=P(d['target']);least=s.floor(gap/target)+1;F('least',least);check(gap/least<target<=gap/(least-1),active+' strict minimal integer')
 elif kind=='series_bounds':
  fn=P(d['f']);J=s.integrate(fn,(x,1,n));F('lower',J+fn.subs(x,n));F('upper',J+fn.subs(x,1))
 elif kind=='logic':check(fields['reason']['expected']==d['answer'],active+' editorial principle checked')
 else:check(False,active+' supported model')
for z in fixtures['examples']:
 set_active(z['id']);d=z;kind=z['kind'];e=next(e for l in package['lessons'] for e in l['examples'] if e['verification']==z['id']);check(digest(e)==z['contentSha256'],active+' immutable example fingerprint')
 if kind=='primitive':identity(s.diff(P(z['primitive']),x)-P(z['f']),active+' primitive derivative');claim(e['solution'],P(z['primitive'])+s.Symbol('C'),active+' actual primitive displayed')
 elif kind=='integral':
  got=quad(P(z['f']),x,P(z['lo']),P(z['hi']));check(numeric_equal(got,number(P(z['value']))),active+' independent quadrature');claim(e['solution'],P(z['value']),active+' actual value displayed')
 elif kind=='recurrence':
  fn=P(z['f']);H=P(z['H']);coeff=sum(P(c)*fn.subs(n,n+int(offset)) for offset,c in z['coefficients'].items());
  for nv in [3,4,5]:identity((s.diff(H,x)-coeff).subs(n,nv),active+' derived recurrence n='+str(nv))
  got=quad(fn,x,P(z['lo']),P(z['hi']),{n:z['target']});check(numeric_equal(got,number(P(z['value']))),active+' direct target integral');claim(e['solution'],P(z['value']),active+' target displayed')
 elif kind=='difference':
  fn=P(z['f'])
  for nv in [0,1,2]:check(numeric_equal(quad(fn-fn.subs(n,n+1),x,P(z['lo']),P(z['hi']),{n:nv}),number(P(z['delta']).subs(n,nv))),active+' direct difference '+str(nv))
  claim(e['solution'],P(z['value']),active+' actual value displayed')
 elif kind in ['arc','surface']:check(equal(geometry_value(d,kind),P(z['value'])),active+' exact geometric integral');claim(e['solution'],P(z['value']),active+' actual value displayed')
 elif kind=='polar_arc':
  R=P(z['r']);speed=P(z['speed']);identity(R*R+s.diff(R,t)**2-speed**2,active+' polar derivative');check(equal(s.integrate(speed,(t,P(z['lo']),P(z['hi']))),P(z['value'])),active+' exact polar length');claim(e['solution'],P(z['value']),active+' actual value displayed')
 elif kind=='rectangles':
  fn=P(z['f']);U=s.summation(fn.subs(x,r/n),(r,1,n))/n;check(equal(U,P(z['upper'])),active+' direct upper sum');check(equal(U-(fn.subs(x,1)-fn.subs(x,0))/n,P(z['lower'])),active+' direct lower sum');check(equal(s.integrate(fn,(x,0,1)),P(z['limit'])),active+' integral limit');claim(e['solution'],P(z['upper']).subs(n,N),active+' upper sum displayed')
 elif kind=='threshold':
  fn=P(z['f']);gap=fn.subs(x,1)-fn.subs(x,0);least=z['value'];check(gap/least<P(z['target'])<=gap/(least-1),active+' minimal integer');claim(e['solution'],s.Integer(least),active+' integer displayed')
 elif kind=='series_bounds':
  fn=P(z['f']);J=s.integrate(fn,(x,z['start'],n));check(equal(P(z['lower']),J+fn.subs(x,n)),active+' lower endpoint correction');check(equal(P(z['upper']),J+fn.subs(x,z['start'])),active+' upper endpoint correction')
 elif kind=='error':check(equal(P(z['coefficient'])*s.Rational(1,1000000),P(z['bound'])),active+' propagated input error')
 else:check(False,active+' supported example model')
set_active('structure');check(len(source)==109,'all owner tasks included');check(sum(q['marks'] for q in source)==1051,'owner mark total unchanged');check(sum(len(q['parts']) for q in source)==268,'owner part count unchanged');check(all(str(i) in coverage for i in range(1,110)),'independent evidence for every owner task')
for z in fixtures['owner']:check(digest(qby[z['uid']])==z['contentSha256'],'owner immutable normalized fingerprint '+z['uid'])
for l in package['lessons']:
 check(digest(l)==fixtures['teachingDigests'][l['id']],'teaching fingerprint '+l['id']);check(sum(q['collection']=='exam' and q['lesson']==l['key'] for q in package['questions'])>=6,'six or more written tasks '+l['key'])
report=dict(checks=len(checks),numericActualAnswerClaims=numeric_claims,failures=failures,parsing=parsing,coverage=coverage,sourceTasks=109,quickChecks=48,workedExamples=24,method='Independent exact differentiation/summation and 55-digit numerical quadrature of supplied recurrences and answers; sampled recurrence indices are not claimed as a symbolic proof for every n.',externalTeacherReview=False)
Path(args.report).write_text(json.dumps(report,indent=2,default=str)+'\n',encoding='utf8');print(json.dumps({k:v for k,v in report.items() if k not in ['coverage']},default=str));raise SystemExit(bool(failures))
