"""Independent statics, centroid, contact and printed-answer audit."""
import argparse,hashlib,html,json,re
from functools import lru_cache
from pathlib import Path
import sympy as s
from sympy.parsing.latex import parse_latex
from sympy.core.function import AppliedUndef
ap=argparse.ArgumentParser();ap.add_argument('--source');ap.add_argument('--report',default='docs/ARENA-C5-MECHANICS-EQUILIBRIUM-MATH-CHECKS-20261107.json');args=ap.parse_args()
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

package=json.loads(Path('content/original/9231-mechanics/equilibrium-v1.json').read_text(encoding='utf8'));fixtures=json.loads(Path('content/original/9231-mechanics/equilibrium-verification-v1.json').read_text(encoding='utf8'))
source=[f['original'] for f in fixtures['owner']];qmap={q['bank_number']:q for q in source};qby={q['id']:q for q in package['questions']}
a,h,k,r,W,M,mm,g,lam,mu,q,d=s.symbols('a h k r W M m g lambda mu q d',positive=True);th=s.Symbol('theta',real=True);z=s.Symbol('z',real=True)
loc.update(a=a,h=h,k=k,r=r,W=W,M=M,m=mm,g=g,mu=mu,q=q,d=d,theta=th,z=z);loc['lambda']=lam
S=s.sympify;R=s.Rational
def clean(raw):
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
def C(number,value,part=None):
 raw=qmap[number]['answer_html'] if part is None else qmap[number]['parts'][part]['answer_html'];contains(raw,value,'printed owner '+str(number)+' '+str(value))
def centre(items):
 mass=sum(S(m) for m,pt in items);return tuple(s.factor(sum(S(m)*S(pt[i]) for m,pt in items)/mass) for i in range(len(items[0][1])))
def rect(w,H,origin=(0,0)):return (w*H,(S(origin[0])+w/2,S(origin[1])+H/2))
def polygon(points):
 points=[tuple(map(S,pt)) for pt in points];pairs=list(zip(points,points[1:]+points[:1]));area2=sum(X*Y2-X2*Y for (X,Y),(X2,Y2) in pairs);mass=s.factor(area2/2)
 return mass,tuple(s.factor(sum((pt[i]+pt2[i])*(pt[0]*pt2[1]-pt2[0]*pt[1]) for pt,pt2 in pairs)/(3*area2)) for i in [0,1])
def negative(item):return (-item[0],item[1])
def moment(point,force):return S(point[0])*S(force[1])-S(point[1])*S(force[0])
def directions(tangent):return (s.simplify(1/s.sqrt(1+tangent*tangent)),s.simplify(tangent/s.sqrt(1+tangent*tangent)))
def hinge(L,H,weight,load,pos):
 length=s.sqrt(L*L+H*H);T=s.cancel((weight*L/2+load*pos)*length/(L*H));return T,s.cancel(T*L/length),s.cancel(weight+load-T*H/length)
for n in range(1,49):
 active=n;print('OWNER '+str(n),flush=True)
 if n==1:
  vals=hinge(4*a,3*a,W,W,3*a)
  for value in vals:C(n,value)
 elif n==2:
  C(n,(4*a+2*x)/3,0);position=s.solve(s.Eq((4*a+2*x)/3,3*a),x)[0];C(n,position,1);RB=(4*M*a+2*M*position+M*8*a)*g/(6*a);C(n,RB,2);C(n,4*M*g-RB,2);check(s.simplify(4*M*g-RB)>0,'both beam supports positive')
 elif n==3:
  gx=centre([(k,(2*a,)),(3,(5*a,))])[0];C(n,gx,0);T=g*M*(2*k+15)*R(5,12);V=(k+3)*M*g-3*T/5;C(n,T,1);C(n,V,1)
  for bound in [R(3,2),R(9,2)]:C(n,bound,2)
  exact(V.subs(k,R(3,2)),0,'lower hinge condition');exact(T.subs(k,R(9,2)),10*M*g,'upper cable condition')
 elif n==4:
  gx,gy=centre([(2,(0,0)),(1,(8*a,0)),(3,(0,6*a))]);C(n,gx,0);C(n,gy,0);C(n,s.atan(gy/gx),1);root=s.solve(s.Eq(18/(8*(1+k)),R(3,4)),k)[0];C(n,root,2)
 elif n==5:
  gx,gy=centre([(1,(3*a,2*a)),(R(1,2),(0,0))]);C(n,gx,0);C(n,gy,0);TC=R(3,2)*mm*g*gx/(6*a);C(n,TC,1);C(n,R(3,2)*mm*g-TC,1);C(n,s.atan(gx/(4*a-gy)),2)
 elif n==6:
  height=2*a+3*s.sqrt((3*a)**2-(2*a)**2)/7;C(n,height,0);threshold=s.simplify(2*a/height);C(n,threshold,1);check(threshold>R(1,2),'sliding precedes toppling');C(n,R(1,2),2)
 elif n==7:
  gx,gy=centre([(4,(2*a,2*a)),(k,(a,3*a))]);C(n,gx,0);C(n,gy,0);C(n,s.cancel(gx/gy),1);root=s.solve(s.Eq(gx/gy,R(2,3)),k)[0];C(n,root,2);C(n,R(2,3),3)
 elif n==8:
  tri=polygon([(k*a,0),(k*a+h,h),(k*a,3*a)]);gx,gy=tri[1];C(n,gx,0);C(n,gy,0);combined=centre([rect(k*a,3*a),tri])[0];exact(combined.subs(h,s.sqrt(3)*k*a),k*a,'triangle-extension toppling threshold');C(n,s.sqrt(3)*k*a,1)
  C(n,gx.subs({k:2/s.sqrt(3),h:2*a}),2);C(n,gy.subs(h,2*a),2)
 elif n==9:
  gx,gy=centre([(2*k*a*a,(-k*a/2,a)),(s.pi*a*a,(8*a/(3*s.pi),2*a-8*a/(3*s.pi)))]);C(n,gy,0);root=next(v for v in s.solve(gx,k) if v>0);C(n,root,1)
 elif n==10:
  outer=rect(4*a,4*a);t1=polygon([(0,0),(2*a,0),(0,4*a)]);t2=polygon([(4*a,0),(4*a,4*a),(4*a-h,4*a)]);gx,gy=centre([outer,negative(t1),negative(t2)]);C(n,gx,0);C(n,gy,0);exact(gx.subs(h,2*a),2*a,'cut-square base boundary');C(n,2*a,1);check(s.simplify(gx.subs(h,a)-2*a)>0,'admissible side of toppling boundary')
 elif n==11:
  gx,gy=centre([rect(3*a,2*a),polygon([(3*a,0),(6*a,a),(3*a,2*a)])]);whole=centre([(1,(gx,gy)),(k,(6*a,a))])[0];root=s.solve(s.Eq(whole,3*a),k)[0];C(n,root)
 elif n==12:
  gx,gy=polygon([(0,0),(8*a-h,0),(h,8*a),(0,8*a)])[1];C(n,gx,0);C(n,gy,0);roots=s.solve(s.Eq(gx/(8*a-gy),R(13,28)),h);check(len(roots)==2,'both suspended-trapezium roots')
  for root in roots:C(n,root,1);check(s.simplify(root/a)>0 and s.simplify(root/a)<8,'valid trapezium cut')
 elif n==13:
  gx,gy=polygon([(x,0),(20*a,0),(0,15*a)])[1];C(n,gx,0);root=s.solve(s.Eq((15*a-gy)/gx,R(6,5)),x)[0];C(n,root,1)
 elif n==14:
  full=polygon([(-3*a,0),(3*a,0),(0,3*a)]);hole=polygon([(-3*a/k,3*a-3*a/k),(3*a/k,3*a-3*a/k),(0,3*a)]);gy=centre([full,negative(hole)])[1];C(n,gy,0);roots=s.solve(s.Eq(gy/(3*a),R(2,9)),k);valid=[v for v in roots if v>1];check(valid==[2],'similar-hole root domain');C(n,valid[0],1)
 elif n==15:
  full=polygon([(0,0),(6*a,0),(0,8*a)]);hole=polygon([(0,0),(x,0),(0,4*a)]);gx=centre([full,negative(hole)])[0];C(n,gx,0);root=next(v for v in s.solve(s.Eq(gx,x),x) if s.simplify(v/a)<6);C(n,root,1)
 elif n==16:
  gx,gy=polygon([(0,0),(18,0),(12,6),(4,6)])[1];C(n,gx)
 elif n==17:
  gx=polygon([(x,0),(8*a,0),(0,12*a)])[1][0];exact(gx.subs(x,4*a),4*a,'shortened-base threshold');C(n,4*a);check(r'0\le x\le4a' in qmap[n]['answer_html'],'full shortened-base interval')
 elif n==18:
  gx,gy=polygon([(-4*a,0),(0,-9*a),(10*a,0),(0,9*a)])[1];C(n,gx);exact(gy,0,'kite symmetry');check(gx>0,'kite centre on C side')
 elif n==19:
  outer=rect(4*a,4*a);t1=polygon([(4*a-h,0),(4*a,0),(4*a,4*a)]);t2=polygon([(0,4*a-h),(4*a,4*a),(0,4*a)]);gx,gy=centre([outer,negative(t1),negative(t2)]);C(n,gx,0);C(n,gy,0);root=s.solve(s.Eq(gx,4*a-h),h)[0];C(n,root,1)
 elif n==20:
  gx,gy=centre([rect(S(12),S(12)),negative(polygon([(0,0),(x,0),(0,8)]))]);C(n,gx,0);C(n,gy,0);root=next(v for v in s.solve(s.Eq(gx,x),x) if v<12);C(n,root,1)
 elif n==21:
  total=lam+7;first=2*lam+21;C(n,a*first/total,0);RB=M*g*first/4;RA=total*M*g-RB;C(n,RA,1);C(n,RB,1);val=s.solve(s.Eq(RB,2*RA),lam)[0];C(n,val,2);RAload=(total+q)*M*g-(first+6*q)*M*g/4;C(n,s.solve(RAload.subs(lam,val),q)[0],3)
 elif n==22:
  gx,gy=centre([(3,(3*a,0)),(4,(6*a,4*a))]);C(n,gx,0);C(n,gy,0);C(n,s.atan(gy/gx),1);Cx,Cy=centre([(7,(gx,gy)),(k,(6*a,8*a))]);C(n,s.solve(s.Eq(Cx,Cy),k)[0],2)
 elif n==23:
  C(n,a*(3+4*k)/(1+k),0);C(n,(3+4*k)*W/(6*s.tan(th)),1);C(n,(3+4*k)/(2*(1+k)),1);exact((3+4*k).subs(k,1)/(6*R(7,4)),(1+k).subs(k,1)/3,'ladder parameter limiting endpoint');C(n,1,2)
 elif n==24:
  tension,H,V=hinge(6*a,8*a,2*W,W,x*a);C(n,tension,0);C(n,H,1);C(n,V,1);low=s.solve(s.Eq(V,3*W/2),x)[0];high=s.solve(s.Eq(tension,2*W),x)[0];C(n,low,2);C(n,high,2);check(low<high and high<6,'nonempty arm design interval')
 elif n==25:
  gz=centre([(R(128,3),(2*r,)),(-R(16,3),(3*r/4,))])[0];C(n,gz,0);C(n,s.atan(4*r/gz),1)
 elif n==26:
  below=centre([(4,(h/2,)),(-k,(k*h/2,))])[0];C(n,below,0);roots=s.solve(s.Eq(below.subs(h,3*a)/a,R(8,5)),k);check(len(roots)==2,'both blind-bore depths')
  for root in roots:C(n,root,1);check(root>0 and root<1,'blind bore depth in cylinder')
 elif n==27:
  gx,gy=centre([(18*a,(3*a,-9*a/8)),(d,(a,d/2))]);C(n,gx,0);C(n,gy,0);contactX=3*a-3*a/5;root=s.solve(s.Eq(gx,contactX),d)[0];C(n,root,1)
 elif n==28:
  gz=centre([(2*a*h,(h/2,)),(a*a,(0,)),(a*a,(h,)),(2*a*a,(h+a/2,))])[0];C(n,gz,0);exact(gz.subs(h,s.sqrt(5)*a)*R(2,3),a,'closed-shell toppling boundary');C(n,s.sqrt(5)*a,1)
 elif n==29:
  gz=centre([(1,(h/2,)),(k/3,(h+k*h/4,))])[0];C(n,gz,0);valid=[v for v in s.solve(s.Eq(gz/h,R(9,10)),k) if v>0];check(valid==[2],'positive cone-height ratio');C(n,2,1)
 elif n==30:
  below=centre([(R(16,3),(3*a/4,)),(-k,(k*a/2,))])[0];C(n,below,0);roots=s.solve(s.Eq(below/(2*a),R(21,52)),k);check(len(roots)==2,'both hemisphere bore roots')
  for root in roots:C(n,root,1);check(root>0 and root<=s.sqrt(3),'bore fits inside hemisphere')
 elif n==31:
  gz=centre([(18,(9*r/2,)),(4*k*k,(8*r,))])[0];C(n,gz,0);root=next(v for v in s.solve(s.Eq(gz-6*r,r/2),k) if v>0);C(n,root,1);check(s.simplify(gz.subs(k,root)/r)>6 and root<3,'centre inside cylinder and radius domain')
 elif n==32:
  gz=centre([(64,(h/3,)),(-1,(13*h/12,))])[0];C(n,gz,0);C(n,s.simplify(gz.subs(h,28*r/3)/(4*r)),1)
 elif n==33:
  gz=centre([(1,(9*r/4,)),(3,(9*r/2,))])[0];C(n,6*r-gz,0);projection=gz*R(3,5);C(n,projection,1);check(projection>0 and s.simplify(projection/r)<5,'projection on physical cone generator')
 elif n==34:
  tension=4*W/3;force=(-3*tension/5,4*tension/5);C(n,4*a,0);C(n,tension,0);exact(moment((12*a/5,9*a/5),force),4*a*W,'perpendicular elastic tie moment');H=-force[0];V=3*W/2-force[1];C(n,s.sqrt(H*H+V*V),1);C(n,s.atan(V/H),1);C(n,tension*3,2)
 elif n==35:
  cs,sn=directions(R(1,2));Rx=2*W/(3*s.sqrt(5));N=W-Rx*cs;F=Rx*sn;C(n,Rx,0);C(n,N,0);C(n,F,0);C(n,s.simplify(F/N),1);exact(3*a*Rx,2*a*(cs-sn)*W,'square peg moment')
 elif n==36:
  NA,RB,FB=s.symbols('NA RB FB');sol=s.solve([RB-NA/4,NA+FB-3*W/2,4*RB+3*FB-21*W/10],[NA,RB,FB]);C(n,sol[NA],0);C(n,sol[RB],0);C(n,sol[FB],0);C(n,s.simplify(sol[FB]/sol[RB]),1);C(n,s.sqrt(sol[RB]**2+sol[FB]**2),2);C(n,s.pi/4,2)
 elif n==37:
  cs,sn=directions(R(1,2));tension=3*a*cs*W/(8*a*cs*sn);N=tension*cs;F=W-tension*sn;C(n,tension,0);C(n,s.simplify(F/N),1)
 elif n==38:
  contact=a*(64+48/mu)/25;C(n,contact,0);C(n,R(6,17),1);reaction=16*a*W/(5*contact);N=W-reaction*R(4,5);F=reaction*R(3,5);value=s.solve(s.Eq(contact,4*a),mu)[0];C(n,value,2);C(n,s.simplify(s.sqrt(N*N+F*F).subs(mu,value)),2)
 elif n==39:
  cs=R(4,5);sn=R(3,5);lever=4*a/3;peg=(3*a*cs*W/2+3*a*cs*k*W)/lever;root=s.solve(s.Eq(peg,(1+k)*W),k)[0];C(n,root);check(root>0,'positive tangent-rod load');exact((5*a/3)**2-a*a,(4*a/3)**2,'tangent length geometry')
 elif n==40:
  tension=R(5,16)*W;C(n,tension,0);C(n,4*tension,1);H=-3*tension/5;V=W-4*tension/5;C(n,s.atan(V/(-H)),2);check(H<0 and V>0,'hinge points left and up');exact(moment((3*a,-4*a),(3*tension/5,4*tension/5)),3*a*W/2,'downward arm moment')
 elif n==41:
  tension=4*W/5;C(n,tension,0);N=W+4*tension/5;F=3*tension/5;C(n,s.cancel(F/N),1);H=3*tension/5;V=2*W-4*tension/5;C(n,s.sqrt(H*H+V*V),2);C(n,4*tension,3)
 elif n==42:
  wall=(R(1,2)+x)*W/s.tan(th);C(n,wall,0);root=s.solve(s.Eq(wall.subs(x,x+1),2*wall),x)[0];C(n,root,1);C(n,1,2)
 elif n==43:
  cs,sn=directions(S(2));tension,wall=s.symbols('tension wall');N=W+tension*cs;F=N/4;sol=s.solve([wall+F-tension*sn,tension+5*cs*W/2-5*sn*wall],[tension,wall]);tv=sol[tension];exact(5*a*cs*cs,a,'perpendicular rope foot geometry');check('AC=a' in qmap[n]['parts'][0]['answer_html'],'printed rope foot distance');C(n,tv,1);C(n,N.subs(tension,tv),2);C(n,sol[wall],2);C(n,F.subs(tension,tv),2)
 elif n==44:
  cs,sn=directions(R(1,2));tension=2*W/(sn+cs/4);root=s.solve(s.Eq(8*a*cs*sn*tension,a*cs*(4+k)*W),k)[0];C(n,root,0);C(n,tension*cs/4,1)
 elif n==45:
  cs,sn=directions(R(2,3));T=W*sn/(sn+cs);F=T*sn;N=W*cs+T*sn;C(n,s.simplify(T),0);C(n,s.simplify(F/N),1);exact(T*cs+F,W*sn,'ring tangential force balance')
 elif n==46:
  cs,sn=directions(R(1,2));tension=W*(cs+sn);exact(tension*(cs-sn/3),W,'upward-slip square vertical balance');C(n,R(1,2))
 elif n==47:
  cs,sn=directions(z);RR,NN=s.symbols('RR NN');forces=s.solve([RR*(-sn-mu*cs)+NN*(cs-mu*sn),RR*(cs-mu*sn)+NN*(sn+mu*cs)-2*W],[RR,NN]);balance=s.factor(mu*(forces[RR]+forces[NN])-W*(cs-sn));root=s.solve(balance,z)[0]
  ratio=s.factor((forces[RR]/forces[NN]).subs(z,root));C(n,ratio,0);value=s.simplify(root.subs(mu,R(1,4)));C(n,value,1);check(value>0 and value<1,'clockwise bracket angle domain')
  check(all(s.simplify(forces[v].subs({mu:R(1,4),z:value}))>0 for v in [RR,NN]),'both cylinder normals positive')
 elif n==48:
  cs,sn=directions(R(3,4));peg=cs*(3+6*k)*W/4;C(n,peg,0);N=(1+k)*W-peg*cs;F=peg*sn;root=s.solve(s.Eq(N,F),k)[0];C(n,root,1);check(s.simplify(N.subs(k,root))>0,'loaded tangent-rod floor normal positive')

def get_fields(question):return {f['key']:f for f in question['fields']}
for item in fixtures['quick']:
 active=item['uid'];data=item['model'];question=qby[active];fields=get_fields(question);check(digest(question)==item['contentSha256'],'quick fingerprint '+active);kind=data['kind'];expected={}
 if kind=='logic':check(fields['reason']['expected']==data['answer'],'reviewed principle '+active);continue
 if kind=='moment':
  expected=dict(origin=moment(data['point'],data['force']),pivot=moment([data['point'][i]-data['pivot'][i] for i in [0,1]],data['force']))
 elif kind=='beam':
  RB=(S(data['W'])*data['L']/2+S(data['P'])*data['c'])/data['L'];expected=dict(left=data['W']+data['P']-RB,right=RB)
 elif kind=='wire':
  gx,gy=centre([(data['m1'],(S(data['L'])/2,0)),(data['m2'],(data['L'],S(data['H'])/2))]);expected=dict(x=gx,y=gy,tangent=gy/gx)
 elif kind=='hole':
  gx,gy=centre([rect(S(data['width']),S(data['height'])),(-data['area'],(data['cx'],data['cy']))]);expected=dict(x=gx,y=gy)
 elif kind=='suspension':
  X=P(data['gx']);Y=P(data['gy']);dy=data['py']-Y;expected=dict(tangent=X/dy,distance=s.sqrt(X*X+dy*dy))
 elif kind=='tilt':
  top=P(data['gx'])/data['gy'];limit=min(top,P(data['mu']));expected=dict(topple=top,slide=P(data['mu']));check(fields['interval']['expected']=='[0,'+str(limit)+']','complete friction/toppling interval '+active)
 elif kind=='cylinder_cone':
  R0,H,K=map(S,[data['R'],data['H'],data['K']]);vc=R0*R0*H;vk=R0*R0*K/3;gz=centre([(vc,(H/2,)),(vk,(H+K/4,))])[0];expected=dict(ratio=vk/vc,height=gz,topple=R0/gz)
 elif kind=='bore':
  R0,H,r0,depth=map(S,[data['R'],data['H'],data['r'],data['depth']]);gz=centre([(R0*R0*H,(H/2,)),(-r0*r0*depth,(H-depth/2,))])[0];expected=dict(height=gz,below=H-gz)
 elif kind=='frustum':
  R0,r0,H=map(S,[data['R'],data['r'],data['H']]);large=H*R0/(R0-r0);small=large-H;v0=R0*R0*large;v1=r0*r0*small;gz=centre([(v0,(large/4,)),(-v1,(H+small/4,))])[0];expected=dict(ratio=v1/v0,height=gz,tangent=gz/R0)
 elif kind=='ladder':
  W0=S(data['W']);wall=W0/(2*P(data['tangent']));expected=dict(normal=W0,wall=wall,friction=wall,mu=wall/W0)
 elif kind=='peg':
  cs,sn=directions(P(data['tangent']));R0=S(data['W'])*data['L']*cs/(2*data['c']);N=data['W']-R0*cs;F=R0*sn;expected=dict(peg=R0,normal=N,friction=F,mu=F/N);check(N>0,'positive peg/floor normal '+active)
 elif kind=='elastic':
  tension,H0,V0=hinge(S(data['L']),S(data['H']),S(1),R(1,2),S(data['c']));length=s.sqrt(data['L']**2+data['H']**2);expected=dict(tension=tension,horizontal=H0,vertical=V0,modulus=tension*data['natural']/(length-data['natural']));check(length>data['natural'],'positive string extension '+active)
 else:raise ValueError(kind)
 for field,value in expected.items():exact(P(fields[field]['expected']),value,'whole answer '+active+' '+field);contains(question['answer_html'],value,'printed quick '+active+' '+field)

for data in fixtures['examples']:
 active=data['id'];example=next(e for l in package['lessons'] for e in l['examples'] if e['verification']==active);check(digest(example)==data['contentSha256'],'example fingerprint '+active);kind=data['kind']
 if kind=='moment':
  values=[moment(data['point'],data['force']),moment([data['point'][i]-data['pivot'][i] for i in [0,1]],data['force'])]
 elif kind=='beam':
  RB=(S(data['weight'])*data['length']/2+S(data['load'])*data['position'])/data['length'];values=[RB,data['weight']+data['load']-RB]
 elif kind=='wire':
  gx,gy=centre([(data['m1'],(S(data['L'])/2,0)),(data['m2'],(data['L'],S(data['H'])/2))]);values=[gx,gy,gy/gx]
 elif kind=='hinge':values=list(hinge(S(data['L']),S(data['H']),S(data['weight']),S(data['load']),S(data['position'])))
 elif kind=='hole':
  values=list(centre([rect(S(data['width']),S(data['height'])),(-data['holeArea'],data['holeCentre'])]))
 elif kind=='suspension':
  gx,gy=centre([(P(mass),tuple(map(P,pt))) for mass,pt in zip(data['masses'],data['centres'])]);values=[gx,gy,(gx-P(data['pivot'][0]))/(P(data['pivot'][1])-gy)]
 elif kind=='tilt':
  gx,gy=centre([(P(mass),tuple(map(P,pt))) for mass,pt in zip(data['masses'],data['centres'])]);values=[gx,gy,gx/gy];check(P(data['mu'])<gx/gy,'example slides before toppling')
 elif kind=='cut_range':
  outer=rect(S(6),S(6));hole=polygon([(0,0),(h,0),(0,6)]);gx=centre([outer,negative(hole)])[0];exact(gx,P(data['centroidX']),'example removed triangle centroid');exact(gx.subs(h,P(data['upper'])),P(data['upper']),'example cut threshold');values=[gx,P(data['upper'])];check(P(data['upper'])>0 and P(data['upper'])<6,'example cut domain')
 elif kind=='cylinder_cone':
  rr,H,K=map(S,[data['radius'],data['cylinder'],data['cone']]);gz=centre([(rr*rr*H,(H/2,)),(rr*rr*K/3,(H+K/4,))])[0];values=[gz,rr/gz]
 elif kind=='bore':
  rr,H,r0,depth=map(S,[data['radius'],data['H'],data['holeRadius'],data['depth']]);gz=centre([(rr*rr*H,(H/2,)),(-r0*r0*depth,(H-depth/2,))])[0];values=[gz,H-gz]
 elif kind=='frustum':
  lower=S(data['lower']);upper=S(data['upper']);large=h*lower/(lower-upper);small=large-h;gz=centre([(lower*lower*large,(large/4,)),(-upper*upper*small,(h+small/4,))])[0];exact(gz/h,P(data['heightFactor']),'example frustum factor');values=[gz,s.simplify(gz.subs(h,P(data['aspect'])*r)/(lower*r))]
 elif kind=='shell':
  gz=centre([(2*a*h,(h/2,)),(a*a,(0,)),(2*a*a,(h+a/2,))])[0];exact(gz,P(data['height']),'open-shell centre');upper=P(data['upper'])*a;exact(gz.subs(h,upper),2*a,'open-shell toppling endpoint');values=[gz,upper]
 elif kind=='ladder':
  wall=S(data['weight'])/(2*P(data['tangent']));values=[wall,S(data['weight']),wall/data['weight']]
 elif kind=='peg':
  cs,sn=directions(P(data['tangent']));R0=P(data['weight'])*data['length']*cs/(2*data['contact']);F=R0*sn;N=P(data['weight'])-R0*cs;values=[R0,F,N,s.simplify(F/N)]
 elif kind=='elastic':
  T0,H0,V0=hinge(S(data['L']),S(data['H']),W,W*P(data['loadRatio']),S(data['position']));length=s.sqrt(data['L']**2+data['H']**2);values=[T0,H0,V0,T0*data['natural']/(length-data['natural'])]
 elif kind=='ring':
  cs,sn=directions(P(data['tangent']));T0=W*sn/(cs+sn);F=T0*sn;N=W*cs+T0*sn;values=[s.simplify(T0),s.simplify(F),s.simplify(N),s.simplify(F/N)];exact(T0*cs+F,W*sn,'example ring force balance')
 else:raise ValueError(kind)
 for value in values:contains(example['solution'],s.simplify(value),'actual displayed example '+active+' '+str(value))
active='structure';check(len(source)==48 and sum(q['marks'] for q in source)==407 and sum(len(q['parts']) for q in source)==111,'all owner tasks, parts and marks');check(all(str(i) in coverage for i in range(1,49)),'evidence for all 48 source tasks')
for item in fixtures['owner']:
 question=qby[item['uid']];original=item['original'];check(digest(question)==item['contentSha256'],'immutable owner '+item['uid']);check([[(c['marks'],c['description_html']) for c in p['marking_criteria']] for p in question['parts']]==[[(c['marks'],c['criterion_html']) for c in p['criteria']] for p in original['parts']],'unchanged owner criteria '+item['uid'])
for lesson in package['lessons']:check(digest(lesson)==fixtures['teachingDigests'][lesson['id']],'lesson fingerprint '+lesson['id']);check(sum(q['lesson']==lesson['key'] and q['collection']=='exam' for q in package['questions'])>=6,'at least six written '+lesson['key'])
for im in package['assets']:check(hashlib.sha256(Path(im['path']).read_bytes()).hexdigest()==im['sha256'],'image bytes '+im['file_id'])
if args.source:
 f=Path(args.source);original=json.loads(f.read_text(encoding='utf-8-sig'));check(hashlib.sha256(f.read_bytes()).hexdigest()==package['source']['sha256'],'read-only source SHA');check([q for l in original['lessons'] for q in l['questions']]==source,'unchanged source keys, criteria, marks and content')
report=dict(checks=len(checks),actualTeXClaims=claimed,failures=failures,coverage=coverage,sourceTasks=48,quickChecks=32,workedExamples=16,externalTeacherReview=False,method='Independent signed moments and force equations; polygon shoelace centroids, signed area/volume/surface moments, suspension and geometric root domains, unilateral contact, sliding/toppling and Hooke extension checks. Actual TeX is parsed and compared at deterministic 50-digit points; numerical comparisons are not asserted as universal symbolic proofs. Every short-answer field and owner criterion preserved/checked, with content fingerprints and image hashes.')
Path(args.report).write_text(json.dumps(report,indent=2,default=str)+'\n',encoding='utf8');print(json.dumps({k:v for k,v in report.items() if k!='coverage'},default=str));raise SystemExit(bool(failures))
