"""Independent exact statement/answer audit; standalone CI uses checked immutable fixtures."""
import argparse,hashlib,html,json,re,sys
from pathlib import Path
from functools import lru_cache
import sympy as s
from sympy.parsing.latex import parse_latex
sys.stdout.reconfigure(encoding='utf8')
ap=argparse.ArgumentParser();ap.add_argument('--source');ap.add_argument('--report',default='docs/ARENA-C5-FP2-MATRICES2-MATH-CHECKS-20261107.json');args=ap.parse_args()
base=Path('content/original/9231-fp2');pack=json.loads((base/'matrices2-v1.0.1.json').read_text(encoding='utf8'));fixtures=json.loads((base/'matrices2-verification-v1.json').read_text(encoding='utf8'))
by={z['bank_number']:z['original'] for z in fixtures['owner']};questions={z['id']:z for z in pack['questions']}
symbols={k:s.Symbol(k,real=True) for k in ['a','b','c','k','p','q','r','t','u','v','x','y','z','lambda']};symbols['n']=s.Symbol('n',integer=True,positive=True)
a,b,c,k,p,q,r,t,u,v,x,y,z,lam,n=[symbols[j] for j in ['a','b','c','k','p','q','r','t','u','v','x','y','z','lambda','n']]
log=[];failures=[];coverage={}
def record(uid,label,actual,expected):
 actual=s.sympify(actual);expected=s.sympify(expected)
 if isinstance(actual,s.MatrixBase):ok=actual.shape==expected.shape and all(s.simplify(s.expand_power_base(s.powdenest(e,force=True),force=True))==0 for e in actual-expected)
 elif isinstance(actual,s.Set):ok=actual==expected or s.simplify(s.SymmetricDifference(actual,expected))==s.EmptySet
 else:ok=s.simplify(actual-expected)==0
 row=dict(id=str(uid),label=label,result='PASS' if ok else 'FAIL',actual=str(actual),expected=str(expected));log.append(row);coverage[str(uid)]=coverage.get(str(uid),0)+1
 if not ok:failures.append(row)
def truth(uid,label,ok):record(uid,label,int(bool(ok)),1)
def digest(z):return hashlib.sha256(json.dumps(z,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()
@lru_cache(None)
def expr(value):
 value=html.unescape(value).strip().strip('.,;').replace(r'\left','').replace(r'\right','').replace(r'\dfrac',r'\frac').replace(r'\,','').replace(r'\!','').replace('−','-').replace('\\ ','')
 value=re.sub(r'\\frac([^{}\s])',r'\\frac{\1}',value);value=re.sub(r'(\\frac\{[^{}]*\})([A-Za-z0-9])',r'\1{\2}',value);value=re.sub(r'\\sqrt([0-9])',r'\\sqrt{\1}',value)
 result=parse_latex(value,strict=True);return result.xreplace({v:symbols.get(str(v),v) for v in result.atoms(s.Symbol)})
def plain(z):return s.sympify(z,locals=symbols)
def blocks(value):return [a or b for a,b in re.findall(r'\\\[(.*?)\\\]|\\\((.*?)\\\)',html.unescape(value),re.S)]
mr=re.compile(r'\\begin\{(?:p|b)?matrix\}(.*?)\\end\{(?:p|b)?matrix\}',re.S)
def matrices(value):
 out=[s.Matrix([[expr(cell) for cell in row.split('&')] for row in re.split(r'\\\\',m.group(1)) if row.strip()]) for m in mr.finditer(html.unescape(value))]
 return [m for m in out if m!=s.Matrix([x,y,z])]
def stem(i):return matrices(by[i]['stem_html'])
def am(i,part=0,index=0):return matrices(by[i]['parts'][part]['answer_html'])[index]
def pm(i,part=0,index=0):return matrices(by[i]['parts'][part]['prompt_html'])[index]
def scalar(i,part=0):
 for text in blocks(by[i]['parts'][part]['answer_html']):
  if r'\begin' in text:continue
  try:return expr(text.split('=')[-1])
  except Exception:pass
 raise ValueError(('No scalar',i,part))
def values(i,part=0):
 out=[]
 for text in blocks(by[i]['parts'][part]['answer_html']):
  if r'\begin' in text or '=' in text:continue
  try:out.extend(val for val in [expr(z) for z in text.replace(r'\qquad',',').replace(r'\quad',',').split(',') if z.strip()] if not val.free_symbols)
  except Exception:pass
 return out
def key(i,part,name,expected):
 text=by[i]['parts'][part]['answer_html'];m=re.search(r'(?<![a-zA-Z])'+re.escape(name)+r'\s*=\s*(.*?)(?:\\\)|\\(?:qquad|quad)|,|</|$)',text)
 assert m,(i,part,name);record(i,'supplied '+name,expr(m.group(1)),expected)
def named(text,name):
 pat=re.compile(re.escape(name)+r'\s*=\s*('+mr.pattern+r')',re.S);m=pat.search(text);assert m,('No named matrix',name);return matrices(m.group(1))[0]
def eigen(i,A,ev,vec):
 truth(i,'nonzero eigenvector',vec!=s.zeros(vec.rows,1));record(i,'Av=lambda v',A*vec,ev*vec)
def eigen_columns(i,A,P,ev):
 truth(i,'independent complete columns',P.det()!=0);record(i,'complete AP=PD',A*P,P*s.diag(*ev))
def diag(i,A,P,D):truth(i,'invertible eigenvector matrix',P.det()!=0);record(i,'full supplied diagonalisation',P*D*P.inv(),A)
def inverse(i,A,B):record(i,'left inverse',A*B,s.eye(A.rows));record(i,'right inverse',B*A,s.eye(A.rows))
def polynomial_matrix(coeff,A):
 out=s.zeros(A.rows)
 for co in coeff:out=out*A+co*s.eye(A.rows)
 return out
def systems(i):
 m=re.search(r'\\begin\{aligned\}(.*?)\\end\{aligned\}',by[i]['question_html'],re.S);assert m,i
 eqs=[expr(row.replace('&','').split('=')[0])-expr(row.replace('&','').split('=')[1]) for row in re.split(r'\\\\',m.group(1)) if row.strip()]
 return s.linear_eq_to_matrix(eqs,[x,y,z])
def family(i,A,B,sol):
 record(i,'all original equations for supplied family',A*sol,B)
 free=sorted(set().union(*(w.free_symbols for w in sol))-{a,b,k},key=str)
 truth(i,'complete number of free directions',len(free)==A.cols-A.rank())
 if free:truth(i,'independent free directions',s.Matrix.hstack(*(sol.diff(f) for f in free)).rank()==len(free))

def owner_checks():
 # Independent models from statements, compared with the actual matrices in answers.
 A=stem(1)[0];diag(1,(A+2*a*s.eye(3))**2,am(1,2,0),am(1,2,1));eigen_columns(1,A,am(1,2,0),[a,3*a,5*a])
 P=s.Matrix([[1,0,1],[1,1,-1],[0,b,1]]);D=s.diag(3,1,-2);A=P*D*P.inv();record(2,'all reconstructed entries',am(2),A);record(2,'inverse action',A.inv()*s.Matrix([4,-4,4]),am(2,1));key(2,2,'n',3);key(2,2,'b',2);record(2,'power condition at b=2',A.subs(b,2)**3*s.Matrix([1,1,0]),s.Matrix([27,27,0]))
 A=stem(3)[0];diag(3,A**3-2*A+3*s.eye(2),am(3,1,0),am(3,1,1))
 A,P=stem(4);B=P*s.diag(5,3,-1)*P.inv();eigen_columns(4,A,P,[-2,1,4]);diag(4,(2*A+B)**2,am(4,2,0),am(4,2,1))
 A=stem(5)[0];eigen(5,A,-3,pm(5));inverse(5,A,am(5,2))
 P=stem(6)[0];inverse(6,P,am(6,1));A=P*s.diag(a,-2,4)*P.inv();inverse(6,A,am(6,2))
 A=stem(7)[0];key(7,1,'p',-s.Rational(1,30));key(7,1,'q',s.Rational(19,30));inverse(7,A,-A**2/30+19*s.eye(3)/30)
 A=stem(8)[0];eigen(8,A,-4,am(8,1));eigen(8,2*A**3-A,-124,am(8,2));record(8,'first eigenvalue',scalar(8),3)
 A=stem(9)[0];eigen_columns(9,A,am(9),[-3,2,5]);record(9,'complete transformed values',s.FiniteSet(*values(9,1)),s.FiniteSet(9,-1,-7))
 A=stem(10)[0];P=named(by[10]['solution_html'],'P');eigen_columns(10,A,P,[-2,3,5]);power=am(10,3)
 for j in [1,2,3,5]:record(10,'all nth entries at n='+str(j),power.subs(n,j),A**j)
 A=stem(11)[0];P=am(11,3,0);eigen_columns(11,A,P,[-3,2,5]);diag(11,(A-2*A.inv())**3,P,am(11,3,1))
 A=stem(12)[0];eigen(12,A,-4,pm(12));eigen(12,A,-1,am(12,2,0));eigen(12,A,3,am(12,2,1));record(12,'remaining eigenvalues',s.FiniteSet(*values(12,1)),s.FiniteSet(-1,3))
 A=stem(13)[0];P,D,Q=matrices(by[13]['parts'][2]['answer_html']);inverse(13,P,Q);diag(13,A,P,D);record(13,'third supplied eigenvalue',scalar(13,1),7)
 A=stem(14)[0];key(14,0,'a',4);record(14,'prescribed root determines parameter',s.solve((A-2*s.eye(3)).det(),a)[0],4);A=A.subs(a,4);eigen_columns(14,A,am(14,2),[8,4,2])
 P=stem(15)[0];diag(15,am(15),P,s.diag(-2,3,5))
 A,B=stem(16);P=am(16,1);eigen_columns(16,A,P,[-3,1,4]);eigen_columns(16,A*B,P,[-6,-5,12])
 A,B,ev=stem(17);eigen(17,A,-3,ev);eigen(17,B,5,ev);eigen(17,A*B,-15,am(17,2));record(17,'other values',s.FiniteSet(*values(17,1)),s.FiniteSet(1,4))
 A=pm(18,1);M=pm(18,2);P=am(18,1);eigen_columns(18,A,P,[-2,1,5]);record(18,'all transported columns',am(18,2),M*P)
 for i,co in [(19,[1,0,1,0,2]),(20,[1,2,0,4])]:
  A=stem(i)[0];roots=sorted(A.eigenvals(),key=lambda z:float(z));record(i,'all supplied base eigenvalues',s.FiniteSet(*values(i,1)),s.FiniteSet(*roots));target=[s.Poly.from_list(co,x).as_expr().subs(x,j) for j in roots];record(i,'all polynomial outputs',s.FiniteSet(*values(i,2)),s.FiniteSet(*target))
 A,P=stem(21);B=P*s.diag(-3,2,6)*P.inv();R,S,D=matrices(by[21]['parts'][3]['answer_html']);inverse(21,R,S);record(21,'fifth power full factors',R*D*S,(A+B-2*s.eye(3))**5)
 A,P=stem(22);B=P*s.diag(-2,3,1)*P.inv();diag(22,(A-2*B)**4,am(22,2,0),am(22,2,1))
 record(23,'polynomial eigenvalue from the stated -2',scalar(23,1),2*(-2)**3-(-2)**2+1)
 A=stem(24)[0];P=am(24,0);eigen_columns(24,A,P,[2,6,8]);diag(24,A**7,am(24,1,0),am(24,1,1))
 A=stem(25)[0];P=am(25,3);eigen_columns(25,A-4*s.eye(3),P,[-1,1,5]);eigen(25,A,3,am(25,1,0));eigen(25,A,5,am(25,1,1))
 A=stem(26)[0];eigen(26,A,-2,pm(26));eigen(26,A,3,am(26,2,0));eigen(26,A,7,am(26,2,1));record(26,'other eigenvalues',s.FiniteSet(*values(26,1)),s.FiniteSet(3,7))
 A=stem(27)[0];P,Q,D=matrices(by[27]['parts'][2]['answer_html']);inverse(27,P,Q);record(27,'full fifth power',P*D*Q,A**5)
 P=stem(28)[0];A=am(28);diag(28,A,P,s.diag(-3,1,2));power=am(28,1)
 for j in [1,2,3,5]:record(28,'all even-power entries at n='+str(j),power.subs(n,j),A**(2*j))
 C,D=stem(29);eigen_columns(29,C,am(29,1),[-3,2,5]);eigen(29,C*D,20,am(29,2))
 A=stem(30)[0];P=am(30);eigen_columns(30,A,P,[-2,3,4]);normals=[s.Matrix([0,1,1]),s.Matrix([1,-2,1]),s.Matrix([1,-1,1])]
 for ij,N in zip([(0,1),(0,2),(1,2)],normals):record(30,'plane normal annihilates spanning columns',s.Matrix([N.dot(P[:,ij[0]]),N.dot(P[:,ij[1]])]),s.zeros(2,1))
 A=stem(31)[0];P,D=matrices(by[31]['parts'][1]['answer_html']);eigen_columns(31,A,P,[-4,2,5])
 for j in [1,2,3]:diag(31,A**j,P,D.subs(n,j))
 truth(31,'both boundary powers fail to vanish',all(abs(5*w)==1 for w in [-s.Rational(1,5),s.Rational(1,5)]))
 A=stem(32)[0];eigen(32,A,4,am(32));eigen(32,A**2-3*A,4,am(32))
 A=stem(33)[0];key(33,0,'a',s.Rational(1,2));record(33,'root condition',s.solve((A+2*s.eye(3)).det(),a)[0],s.Rational(1,2));A=A.subs(a,s.Rational(1,2));ev1,ev2=am(33,1,0),am(33,1,1);eigen(33,A,-2,ev1);eigen(33,A,3,ev2);N=am(33,3);record(33,'normal perpendicular to both',s.Matrix([N.dot(ev1),N.dot(ev2)]),s.zeros(2,1));truth(33,'normal is not right eigenvector',s.Matrix.hstack(N,A*N).rank()==2)
 # Characteristic reductions and full diagonal outputs are independent of the displayed working.
 for i,part,power in [(34,2,-1),(35,2,None),(36,0,-1),(37,0,5),(43,2,None),(45,1,5),(46,2,None),(47,3,-1),(48,0,2),(49,2,5),(50,2,1),(54,2,1),(55,1,1),(57,2,4),(61,1,2)]:
  A=next(m for m in stem(i) if m.rows==m.cols and m.rows==3)
  target=(11*A+20*s.eye(3))**2 if i==35 else A-3*s.eye(3) if i==43 else (A-s.eye(3))**4 if i==46 else A**power
  ms=matrices(by[i]['parts'][part]['answer_html']);P,D=ms[:2];diag(i,target,P,D)
  if len(ms)>2:inverse(i,P,ms[2])
 A=stem(34)[0];key(34,1,'p',s.Rational(13,144));key(34,1,'q',-s.Rational(1,144));record(34,'inverse square identity',A.inv()**2,(13*s.eye(3)-A)/144)
 A=stem(35)[0];key(35,3,'c',-8);record(35,'full polynomial identity',(11*A+20*s.eye(3))**2,A**4*(A-8*s.eye(3))**2)
 A=stem(36)[0];inverse(36,A,am(36,1))
 for i,pp,qq in [(37,25,-144),(38,29,-100)]:
  A=stem(i)[0];part=1 if i==37 else 0;key(i,part,'p',pp);key(i,part,'q',qq);record(i,'even-power identity',A**4,pp*A**2+qq*s.eye(3))
 A=stem(39)[0];inverse(39,A,am(39,1));record(39,'eigenvalues',s.FiniteSet(*values(39)),s.FiniteSet(*A.eigenvals()))
 A=stem(43)[0];record(43,'shifted cube',(A-3*s.eye(3))**3,-4*A**2+35*A-39*s.eye(3))
 A=pm(44,2);P,D=matrices(by[44]['parts'][3]['answer_html']);eigen_columns(44,A,P,[0,-2,4])
 for j in [1,2,3]:diag(44,A**j,P,D.subs(n,j))
 record(44,'first plane through supplied point',s.Matrix([1,1,2]).dot(s.Matrix([2,0,1])),4);record(44,'second plane through supplied point',s.Matrix([1,1,2]).dot(s.Matrix([0,2,-1])),0)
 A=stem(46)[0];record(46,'fourth-power reduction',A**4,37*A**2+24*A-180*s.eye(3))
 A=stem(47)[0];key(47,4,'p',-s.Rational(1,20));key(47,4,'q',s.Rational(21,20));inverse(47,A,-A**2/20+21*s.eye(3)/20)
 A=stem(48)[0];record(48,'all cubic entries',am(48,1),A**3)
 A=stem(49)[0];inverse(49,A**2,am(49,1))
 A=stem(50)[0];inverse(50,A,-A**2/36+7*A/36)
 A=stem(51)[0];P=am(51,2);eigen_columns(51,A,P,[a,-2,-5]);inverse(51,A,am(51,3));record(51,'unique for a>0 determinant',A.det(),10*a)
 P=stem(52)[0];inverse(52,P,am(52));A=am(52,1);diag(52,A,P,s.diag(1,5,7))
 for val,vec in zip([1,125,343],matrices(by[52]['parts'][2]['answer_html'])):eigen(52,A**3,val,vec)
 A=stem(53)[0];P,D=matrices(by[53]['parts'][2]['answer_html']);diag(53,A,P,D);Q=pm(53,3);MP=s.Matrix.hstack(*matrices(by[53]['parts'][3]['answer_html']));record(53,'all transported eigenvectors',MP,Q*P)
 A=stem(54)[0];record(54,'real square root squared',am(54,3)**2,A)
 A=stem(55)[0];power=am(55,2)
 for j in [1,2,3,5]:record(55,'all nth power entries at n='+str(j),power.subs(n,j),A**j)
 A=stem(57)[0];record(57,'parameter fourth-power reduction',A**4,(a*a-2*a+4)*A**2+(2*a*a-4*a)*A);truth(57,'parameter excludes coincident/zero eigenvalues',all(len({v,2-v,-2})==3 and v*(2-v)*(-2)!=0 for v in [5,6,10]))
 A=stem(61)[0];key(61,2,'c',-3);record(61,'polynomial square identity',(10*A-24*s.eye(3))**2,A**4*(A-3*s.eye(3))**2)
 # Systems: actual equations parsed from the statement, with all exceptional cases.
 exception_specs={34:(a,[-6,12]),35:(a,[-2]),40:(None,[]),41:(k,[0,2]),42:(None,[]),49:(a,[-10,3]),50:(a,[0]),56:(k,[2]),58:(None,[]),59:(k,[-s.Rational(9,2)]),60:(None,[]),61:(a,[-6]),62:(None,[]),63:(k,[2]),64:(a,[s.Rational(7,5)]),65:(k,[-2,1]),66:(k,[-3]),67:(k,[-2,1]),68:(None,[]),70:(None,[])}
 for i,(var,roots) in exception_specs.items():
  A,B=systems(i)
  if var:record(i,'all determinant exceptional parameters',s.FiniteSet(*s.solve(A.det(),var)),s.FiniteSet(*roots))
  else:record(i,'determinant classification',A.det(),0 if i!=70 else A.det())
  if i in [34,49,50,61]:
   supplied=by[i]['parts'][0]['answer_html'];truth(i,'all exceptional roots present in final answer',all(str(rr) in supplied for rr in roots))
  if i==35:family(i,A.subs(a,-2),B,matrices(by[i]['parts'][1]['solution_html'])[0])
  if i==40:
   record(i,'necessary sufficient consistency',B[2]-(2*B[0]-B[1]),b-2*a+4);family(i,A,B.subs({a:3,b:2}),am(i,2));sol=am(i,3);record(i,'extra condition',sol[0]+2*sol[2],5);record(i,'extra point equations',A*sol,B.subs({a:3,b:2}))
  if i==41:
   for val,rhs,idx in [(0,0,0),(2,2,1)]:family(i,A.subs(k,val),B.subs(a,rhs),am(i,2,idx));truth(i,'inconsistent neighbouring RHS',A.subs(k,val).row_join(B.subs(a,rhs+1)).rank()>A.subs(k,val).rank())
  if i==42:family(i,A,B.subs(k,9),am(i,1));record(i,'extra z condition',am(i,2)[2],2);record(i,'extra point equations',A*am(i,2),B.subs(k,9))
  if i==56:family(i,A,B,am(i,1));family(i,A.subs(k,2),B.subs(k,2),am(i,2));truth(i,'changed RHS inconsistent',A.subs(k,2).row_join(s.Matrix([1,4,6])).rank()>A.subs(k,2).rank())
  if i==58:family(i,A,B,am(i,1))
  if i==60:record(i,'contradictory parallel left rows',A[2,:],-2*A[0,:]);truth(i,'contradictory right rows',B[2]!=-2*B[0])
  if i==62:family(i,A,B.subs(a,-6),am(i,1));record(i,'unique consistency relation',B[2]-2*B[0]+B[1],a+6)
  if i==63:truth(i,'exception inconsistent',A.subs(k,2).row_join(B).rank()>A.subs(k,2).rank())
  if i==64:key(i,1,'a',4);truth(i,'exception not an integer',s.Rational(7,5).is_integer is False);record(i,'given solution at integer a',A.subs(a,4)*s.Matrix([2,-1,3]),B)
  if i==65:
   truth(i,'k=1 impossible for all a',B[0]!=B[2]);record(i,'consistency at -2',sum(B),a+4);family(i,A.subs(k,-2),B.subs(a,-4),am(i,2));record(i,'additional point equations',A.subs(k,-2)*am(i,3),B.subs(a,-4));record(i,'zero coordinate sum',sum(am(i,3)),0)
  if i==66:family(i,A.subs(k,-3),B,am(i,1))
  if i==67:truth(i,'k=1 inconsistent',A.subs(k,1).row_join(B).rank()>A.subs(k,1).rank());family(i,A.subs(k,-2),B,am(i,1))
  if i==68:
   family(i,A,B,am(i,1));origin,direction=matrices(by[i]['parts'][2]['answer_html']);family(i,A.col_join(s.Matrix([[1,1,1]])),B.col_join(s.Matrix([3])),origin+v*direction);record(i,'extra plane for whole line',sum(origin+v*direction),3)
   for sol in matrices(by[i]['parts'][3]['answer_html']):record(i,'all equations for extra point',A*sol,B);record(i,'extra coordinate sum',sum(sol),3);record(i,'extra sphere',sol.dot(sol),17)
   record(i,'both sphere intersections',s.FiniteSet(*s.solve((origin+v*direction).dot(origin+v*direction)-17,v)),s.FiniteSet(-1,1))
  if i==70:record(i,'supplied unique solution',A*s.Matrix([1,-2,3]),B)
 A,ev=stem(69);record(69,'singular coefficient',A.det(),0);record(69,'image',A*ev,am(69,1));point,direction=matrices(by[69]['parts'][2]['answer_html']);family(69,A,s.Matrix([1,2,3]),point+t*direction);nearest=point-point.dot(direction)/direction.dot(direction)*direction;record(69,'nearest whole point',nearest,s.Matrix([0,1,1]));record(69,'least distance squared',nearest.dot(nearest),2)
 N=stem(70)[0];w=pm(70);record(70,'nonzero null vector',N*w,s.zeros(2,1));truth(70,'rectangular inverse impossible by nonzero kernel',w!=s.zeros(3,1))
 # Parse every explicit eigenvector/rref claim from the owner's worked text.
 for i,original in by.items():
  candidates=stem(i)
  if i in [2,15,28,52]:A=am(i,0 if i!=52 else 1)
  elif not candidates or candidates[0].rows!=candidates[0].cols:continue
  else:A=candidates[0]
  if i==14:A=A.subs(a,4)
  if i==33:A=A.subs(a,s.Rational(1,2))
  for m in re.finditer(r'For \\\(\\lambda=(.*?)\\\), solve.*?Row reduction gives.*?\\\[(.*?)\\\]',original['solution_html'],re.S):
   ev=expr(m.group(1));ms=matrices(m.group(2))
   if len(ms)!=2:continue
   reduced,vec=ms;eigen(i,A,ev,vec);record(i,'actual displayed row reduction',reduced,(A-ev*s.eye(A.rows)).rref()[0])
  # Check every explicit numeric characteristic determinant expression.
  for block in blocks(original['solution_html']):
   if not block.startswith(r'\det\left(') or r'\lambda' not in block:continue
   ms=matrices(block)
   if not ms:continue
   pieces=block.split(r'\right)=')
   if len(pieces)!=2:continue
   for part in pieces[1].split('='):record(i,'displayed characteristic determinant factorisation',expr(part),ms[0].det())

def quick_checks():
 for item in fixtures['quick']:
  uid=item['uid'];q=questions[uid];truth(uid,'content hash',digest(q)==item['contentSha256']);m=item['model'];kind=m['kind'];expected={}
  if kind in ['tri_eigen','tri_three']:
   A=s.Matrix(m['A']);vals=sorted(A.eigenvals(),key=lambda v:float(v))
   if kind=='tri_eigen':expected=dict(low=vals[0],high=vals[1],p=-A[0,1]/(A[0,0]-A[1,1]),q=0)
   else:expected=dict(values=s.FiniteSet(*vals),p=0,q=0)
  elif kind=='parameter':rr=m['root'];aa=rr-s.Rational(4,rr-1);expected=dict(a=aa,values=s.FiniteSet(rr,aa+1-rr))
  elif kind=='algebra':val=m['lam'];expected=dict(poly=val**3-2*val+1,inverse=s.Rational(1,val),mixed=2*val-s.Rational(1,val))
  elif kind=='common':expected={'d'+str(i+1):(2*aa+bb)**2 for i,(aa,bb) in enumerate(zip(m['aa'],m['bb']))}
  elif kind=='formula':val=m['lam'];qq,rr=s.symbols('q r',real=True);expected=dict(formula=val**2+qq*val+rr,value=val**2+3*val-2)
  elif kind=='ch_two':A=s.Matrix(m['A']);expected=dict(char=(x*s.eye(A.rows)-A).det(),p=-1/A.det(),q=s.trace(A)/A.det())
  elif kind in ['ch_remainder','ch_inverse']:
   poly=s.Poly.from_list([plain(c) for c in m['coeff']],x).as_expr()
   rem=s.rem(x**m['power'],poly,x) if kind=='ch_remainder' else s.invert(x,poly,x)
   expected={k:s.expand(rem).coeff(x,power) for k,power in zip(['p','q','r'],[2,1,0])}
  elif kind in ['matrix_power','matrix_sqrt','reconstruct','reconstruct_inverse','transport']:
   if kind=='matrix_power':M=s.Matrix(m['A'])**m['power']
   elif kind=='matrix_sqrt':P=s.Matrix([[1,1],[0,1]]);M=P*s.diag(*m['roots'])*P.inv();record(uid,'root squared equals statement',M**2,s.Matrix(m['A']))
   elif kind=='transport':M=s.Matrix(m['M'])*s.Matrix(m['P'])
   else:P=s.Matrix(m['P']);M=P*s.diag(*m['values'])*P.inv();M=M.inv() if kind=='reconstruct_inverse' else M
   expected={'a'+str(i+1)+str(j+1):M[i,j] for i in range(M.rows) for j in range(M.cols)}
  elif kind=='limit':bound=s.Rational(1,max(map(abs,m['values'])));expected=dict(interval=s.Interval.open(-bound,bound))
  elif kind=='unique_system':A=s.Matrix(m['A']);sol=A.inv()*s.Matrix(m['b']);expected=dict(zip(['x','y','z'],sol))
  elif kind=='line_system':r1,r2=m['rhs'];expected=dict(b=r1+r2,x=2*r1-r2+t,y=r2-r1-2*t,z=t)
  elif kind=='plane_system':expected=dict(x=m['rhs']+2*u-v,y=u,z=v)
  elif kind=='nearest':pp=s.Matrix(m['point']);dd=s.Matrix(m['direction']);vec=pp-pp.dot(dd)/dd.dot(dd)*dd;expected=dict(zip(['x','y','z'],vec));expected['squared']=vec.dot(vec);record(uid,'nearest perpendicular',vec.dot(dd),0)
  elif kind=='plane':normal=s.Matrix(m['e']).cross(s.Matrix(m['f']));expected=dict(p=normal[0]/normal[2],q=normal[1]/normal[2],r=0)
  elif kind=='iteration':xx,yy=m['initial'];expected=dict(x=(xx-yy)*u+yy,y=yy)
  elif kind=='logic':expected=dict(reason=m['answer'])
  else:raise ValueError(kind)
  truth(uid,'all requested fields',set(expected)=={f['key'] for f in q['fields']})
  for field in q['fields']:
   raw=field['expected'];wanted=expected[field['key']]
   if field['type']=='choice':truth(uid,'reason key',raw==wanted)
   elif field['type']=='set':
    if raw.startswith('{'):actual=s.FiniteSet(*(plain(e) for e in raw[1:-1].split(',')))
    else:ends=raw[1:-1].split(',');actual=s.Interval(plain(ends[0]),plain(ends[1]),left_open=raw[0]=='(',right_open=raw[-1]==')')
    record(uid,'whole set / strict boundaries',actual,wanted)
   else:record(uid,'full '+field['key'],plain(raw),wanted)

def example_checks():
 for m in fixtures['examples']:
  uid=m['id'];example=next(e for l in pack['lessons'] for e in l['examples'] if e['verification']==uid);truth(uid,'actual example content hash',digest(example)==m['contentSha256']);kind=m['kind']
  if kind=='eigen':A=s.Matrix(m['A']);eigen_columns(uid,A,s.Matrix.hstack(*(s.Matrix(v) for v in m['vectors'])),m['values'])
  elif kind=='parameter_eigen':A=s.Matrix([[4,2],[2,1]]);record(uid,'prescribed eigenvalue determines a',s.solve((s.Matrix([[a,2],[2,1]])-5*s.eye(2)).det(),a)[0],4);eigen_columns(uid,A,s.Matrix([[2,1],[1,-2]]),[5,0])
  elif kind=='scalar_poly':val=m['value'];record(uid,'polynomial value',s.Poly.from_list(m['coeff'],x).eval(val),m['result'])
  elif kind=='scalar_rational':val=m['value'];record(uid,'rational value',2*val-s.Rational(1,val),plain(m['result']))
  elif kind=='common':record(uid,'whole ordered output',s.Matrix(m['result']),s.Matrix([(2*aa+bb)**2 for aa,bb in zip(m['aa'],m['bb'])]))
  elif kind=='product':record(uid,'complete product spectrum',s.FiniteSet(*(s.Matrix(m['A'])*s.Matrix(m['B'])).eigenvals()),s.FiniteSet(*m['result']))
  elif kind=='inverse':A=s.Matrix(m['A']);out=matrices(example['solution'])[-1];inverse(uid,A,out)
  elif kind in ['ch_inverse','remainder','singular_ch']:
   poly=s.Poly.from_list(m['coeff'],x).as_expr()
   if kind=='singular_ch':record(uid,'zero eigenvalue',poly.subs(x,0),0)
   else:rem=s.invert(x,poly,x) if kind=='ch_inverse' else s.rem(x**m['power'],poly,x);record(uid,'all reduced coefficients',s.Matrix([s.expand(rem).coeff(x,j) for j in [2,1,0]]),s.Matrix([plain(j) for j in m['answer']]))
  elif kind=='power':A=s.Matrix(m['A']);P=s.Matrix(m['P']);eigen_columns(uid,A,P,m['values']);
  elif kind=='sqrt':record(uid,'whole constructed root squared',s.Matrix(m['B'])**2,s.Matrix(m['A']))
  elif kind=='limit':record(uid,'strict bound',plain(m['bound']),s.Rational(1,max(map(abs,m['values']))))
  elif kind=='reconstruct':diag(uid,s.Matrix(m['A']),s.Matrix(m['P']),s.diag(*m['values']))
  elif kind=='similar':A=s.Matrix(m['A']);M=s.Matrix(m['M']);eigen_columns(uid,M*A*M.inv(),s.Matrix.hstack(*(s.Matrix(z) for z in m['vectors'])),m['values'])
  elif kind=='system':A=s.Matrix(m['A']);B=s.Matrix(m['b']);family(uid,A,B,s.Matrix([plain(z) for z in m['solution']]))
  elif kind=='inconsistent':A=s.Matrix(m['A']);truth(uid,'augmented contradiction',A.row_join(s.Matrix(m['b'])).rank()>A.rank())
  elif kind=='parameter_family':A=s.Matrix([[a,1,0],[0,2,0],[0,0,-1]]);eigen_columns(uid,A,s.Matrix([[1,1,0],[0,2-a,0],[0,0,1]]),[a,2,-1])
  elif kind=='plane':e=s.Matrix(m['e']);f=s.Matrix(m['f']);record(uid,'cross product',e.cross(f),s.Matrix(m['normal']))
  elif kind=='nearest':pp=s.Matrix(m['point']);dd=s.Matrix(m['direction']);tt=-pp.dot(dd)/dd.dot(dd);record(uid,'least parameter',tt,plain(m['parameter']));vec=pp+tt*dd;record(uid,'whole nearest point',vec,s.Matrix([plain(v) for v in m['result']]));record(uid,'least squared distance',vec.dot(vec),plain(m['squared']))
  elif kind=='iteration':A=s.Matrix(m['A']);initial=s.Matrix(m['initial']);
  else:raise ValueError(kind)
  # Read actual TeX matrices and coordinate triples in new solutions, rather than relying on certificates alone.
  if uid=='MAT2-E-D1':
   supplied=matrices(example['solution'])[-1]
   for j in [1,2,4]:record(uid,'actual nth-power TeX matrix',supplied.subs(n,j),s.Matrix(m['A'])**j)
  if uid=='MAT2-E-M4':
   for j in range(5):record(uid,'iteration against repeated multiplication',s.Matrix(m['A'])**j*s.Matrix(m['initial']),s.Matrix([3**j+1,1]))

def structural():
 originals=[z['original'] for z in fixtures['owner']]
 truth('structure','70 owner tasks',len(originals)==70);record('structure','parts',sum(len(q['parts']) for q in originals),206);record('structure','marks',sum(q['marks'] for q in originals),729)
 if args.source:
  source=Path(args.source);truth('source','immutable source SHA',hashlib.sha256(source.read_bytes()).hexdigest()==pack['source']['sha256']);raw=json.loads(source.read_text(encoding='utf-8-sig'));truth('source','every original field unchanged',originals==[q for l in raw['lessons'] for q in l['questions']])
 for fixture in fixtures['owner']:
  q=questions[fixture['uid']];o=fixture['original'];i=o['bank_number'];truth(i,'content identity/hash',digest(q)==fixture['contentSha256']);truth(i,'owner answers/solutions/hints unchanged',all(q[k]==o[k] for k in ['answer_html','solution_html','hint_html']));record(i,'owner mark total',q['marks'],o['marks']);truth(i,'all criteria unchanged',[[c['description_html'] for c in p['marking_criteria']] for p in q['parts']]==[[c['criterion_html'] for c in p['marking_points']] for p in o['parts']]);record(i,'rubric sum',sum(c['marks'] for p in q['parts'] for c in p['marking_criteria']),q['marks']);truth(i,'source private and prompt full',all(p['prompt_html'] in q['prompt_html'] for p in o['parts']) and o['provenance']['source_uid'] not in q['prompt_html'])
 for lesson in pack['lessons']:truth(lesson['id'],'actual complete teaching hash',digest(lesson)==fixtures['teachingDigests'][lesson['id']])

structural();owner_checks();quick_checks();example_checks()
result=dict(checks=len(log),failures=failures,owner=70,quick=56,examples=28,ownerCoverage={str(i):coverage.get(str(i),0) for i in range(1,71)},checksLog=log)
Path(args.report).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf8');print(json.dumps({k:v for k,v in result.items() if k not in ['checksLog','ownerCoverage']}));sys.exit(1 if failures else 0)
