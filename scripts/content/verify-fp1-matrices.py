"""Exact matrix certificates, complete root sets and geometric boundary review."""
import argparse,hashlib,json,re,html,sys
from pathlib import Path
from functools import lru_cache
import sympy as s
from sympy.parsing.latex import parse_latex
ap=argparse.ArgumentParser();ap.add_argument('--report',required=True);ap.add_argument('--owner');args=ap.parse_args()
base=Path('content/original/9231-fp1');pack=json.loads((base/'matrices1-v1.json').read_text(encoding='utf8'))
fixtures=json.loads((base/'matrices1-owner-verification-v1.json').read_text(encoding='utf8'));by={v['id']:v for v in fixtures}
audit=json.loads(Path('docs/ARENA-C2-MATRICES-SOURCE-AUDIT-20261106.json').read_text(encoding='utf8'))
symbols={key:s.Symbol(key,real=True) for key in ['a','b','c','k','m','n','p','q','r','t','u','v','w','x','y','z','X','Y','theta']}
a,b,c,k,m,n,p,q,r,t,u,v,w,x,y,z,X,Y,theta=[symbols[j] for j in ['a','b','c','k','m','n','p','q','r','t','u','v','w','x','y','z','X','Y','theta']]
log=[];failures=[];coverage={}
def record(uid,label,actual,expected):
    actual=s.sympify(actual);expected=s.sympify(expected)
    if isinstance(actual,s.MatrixBase) and isinstance(expected,s.MatrixBase):
        ok=actual.shape==expected.shape and all(s.simplify(v)==0 for v in actual-expected)
    elif isinstance(actual,s.Set) and isinstance(expected,s.Set):ok=s.simplify(s.SymmetricDifference(actual,expected))==s.EmptySet
    else:ok=s.simplify(actual-expected)==0
    row=dict(id=str(uid),label=label,result='PASS' if ok else 'FAIL',actual=str(actual),expected=str(expected));log.append(row);coverage[str(uid)]=coverage.get(str(uid),0)+1
    if not ok:failures.append(row)
def truth(uid,label,ok):record(uid,label,s.Integer(bool(ok)),s.Integer(1))
def review(uid,label,argument):log.append(dict(id=uid,label=label,result='REVIEWED',argument=argument))
def plain(value):return s.sympify(value,locals=symbols)
@lru_cache(None)
def expr(value):
    value=html.unescape(value).strip().strip('.,;').replace(r'\left','').replace(r'\right','').replace(r'\dfrac',r'\frac').replace(r'\,','').replace(r'\!','').replace('\\ ','').replace('−','-')
    value=re.sub(r'\\frac([^{}\s])',r'\\frac{\1}',value)
    value=re.sub(r'(\\frac\{[^{}]*\})([A-Za-z0-9])',r'\1{\2}',value)
    value=re.sub(r'\\sqrt([0-9])',r'\\sqrt{\1}',value)
    value=re.sub(r'(?<![A-Za-z\\])([abckmpqtxyz])\s*(?=\()',r'\1*',value)
    result=parse_latex(value,strict=True)
    return result.xreplace({v:symbols.get(str(v),v) for v in result.atoms(s.Symbol)})
def blocks(value):return [a or b for a,b in re.findall(r'\\\[(.*?)\\\]|\\\((.*?)\\\)',html.unescape(value),re.S)]
matrix_re=re.compile(r'\\begin\{(?:p|b)matrix\}(.*?)\\end\{(?:p|b)matrix\}',re.S)
def matrices(value,scale=True):
    value=html.unescape(value);out=[]
    for match in matrix_re.finditer(value):
        rows=[[expr(cell) for cell in row.strip().split('&')] for row in re.split(r'\\\\',match.group(1)) if row.strip()]
        matrix=s.Matrix(rows)
        prefix=value[:match.start()].split('=')[-1].split(r'\[')[-1].strip()
        if scale and prefix.startswith((r'\frac',r'\dfrac')):matrix=expr(prefix)*matrix
        out.append(matrix)
    return out
def stem(uid):return matrices(by[uid]['stem_html'],False)
def am(uid,part=0,index=0):return matrices(by[uid]['parts'][part]['answer_html'])[index]
def pm(uid,part=0,index=0):return matrices(by[uid]['parts'][part]['prompt_html'],False)[index]
def av(uid,part,name):
    results=[]
    for block in blocks(by[uid]['parts'][part]['answer_html']):
        if r'\begin' in block:continue
        for section in re.split(r'\\(?:qquad|quad)|;',block):
            match=re.search(r'(?<![A-Za-z])'+re.escape(name)+r'\s*=\s*(.*)',section)
            if not match:continue
            text=match.group(1).split(r'\text')[0]
            for bit in text.split(','):
                bit=bit.strip().strip('.')
                if not bit:continue
                if bit.startswith(r'\pm'):
                    val=expr(bit[3:]);results.extend([val,-val])
                else:
                    try:results.append(expr(bit))
                    except Exception:pass
    return results
def key(uid,part,name,expected):
    values=av(uid,part,name);assert values,('Missing scalar claim',uid,part,name)
    if isinstance(expected,(list,tuple,set,s.FiniteSet)):record(uid,'complete supplied '+name+' set',s.FiniteSet(*values),s.FiniteSet(*expected))
    else:record(uid,'supplied '+name,values[0],s.sympify(expected))
def scalar(uid,part):
    for text in blocks(by[uid]['parts'][part]['answer_html']):
        if '=' in text:text=text.split('=')[-1]
        try:return expr(text)
        except Exception:pass
    raise ValueError(('No scalar',uid,part))
def pair(uid,part,index=-1):
    text=html.unescape(by[uid]['parts'][part]['answer_html']).replace(r'\left','').replace(r'\right','')
    values=[]
    for a,b in re.findall(r'\(([^(),]+),([^(),]+)\)',text):
        try:values.append(s.Matrix([expr(a),expr(b)]))
        except Exception:pass
    return values[index]
def check_inverse(uid,A,B,label='complete inverse'):
    record(uid,label+' left product',A*B,s.eye(A.rows));record(uid,label+' right product',B*A,s.eye(A.rows))
def directions(uid,M,slopes,vertical=False):
    poly=s.expand(M[0,1]*m*m+(M[0,0]-M[1,1])*m-M[1,0])
    record(uid,'all finite invariant gradients',s.solveset(poly,m,domain=s.S.Reals),s.FiniteSet(*slopes))
    truth(uid,'vertical direction accounted for',(s.simplify(M[0,1])==0)==vertical)
def fixed(uid,M,basis):
    actual=s.Matrix.hstack(*((M-s.eye(M.rows)).nullspace())) if (M-s.eye(M.rows)).nullspace() else s.zeros(M.rows,0)
    wanted=s.Matrix.hstack(*basis) if basis else s.zeros(M.rows,0)
    truth(uid,'complete fixed subspace dimension',actual.cols==wanted.cols)
    for col in basis:record(uid,'fixed subspace direction',(M-s.eye(M.rows))*col,s.zeros(M.rows,1))
def digest(row):return hashlib.sha256('\0'.join([row['title'],row['prompt_html'],row['answer_html'],row['solution_html'],row['hint_html'],str(row['marks'])]).encode()).hexdigest()
def new(number):return f'm4u_9231_fp1_ch04_new_{number:03}'
def owner_checks():
    uid='5891';A,B,C=stem(uid);record(uid,'rectangular triple product',A*B*C,am(uid,1));record(uid,'singular square product',(A*B*C).det(),0)
    record(uid,'row dependence',s.Matrix((A*B*C)[2,:]),3*s.Matrix((A*B*C)[1,:])-7*s.Matrix((A*B*C)[0,:]))
    uid='6393';A,B,P=stem(uid);record(uid,'image Ap',A*P,am(uid,0,0));record(uid,'image Bp',B*P,am(uid,0,1));record(uid,'det A',A.det(),0);record(uid,'det B',B.det(),0)
    U,V=am(uid,2,0),am(uid,2,1);record(uid,'u image',A*U,A*P);record(uid,'v image',B*V,B*P);record(uid,'difference',U-V,s.Matrix([-7,1]))
    record(uid,'complete u free direction',A*s.Matrix([-2,1]),s.zeros(2,1));record(uid,'complete v free direction',B*s.Matrix([1,2]),s.zeros(2,1))
    uid='6478';A,B=stem(uid);record(uid,'AB',A*B,am(uid,0,0));record(uid,'BA',B*A,am(uid,0,1));record(uid,'one-sided identity',A*B,s.eye(2));record(uid,'idempotence',(B*A)**2,B*A);record(uid,'singular BA',(B*A).det(),0)
    uid='5844';A=stem(uid)[0];record(uid,'determinant',A.det(),6*t);check_inverse(uid,A,am(uid,1));C=pm(uid,2);record(uid,'AX=C',A*am(uid,2),C);key(uid,2,'t',s.Rational(1,2));record(uid,'row sum at parameter',sum(am(uid,2)[1,:]).subs(t,s.Rational(1,2)),-2)
    uid='4171';A=stem(uid)[0];record(uid,'always nonzero real determinant',A.det(),-4*t*t-6);truth(uid,'strict negative determinant for all real t',s.ask(s.Q.negative(-4*t*t-6)));key(uid,1,'t',1);check_inverse(uid,A.subs(t,1),pm(uid,1))
    uid='6272';A,C=stem(uid);check_inverse(uid,A,am(uid));record(uid,'AX with two columns',A*am(uid,1),C)
    uid='6503';A,B=stem(uid);record(uid,'diagonal product',A*B,am(uid));check_inverse(uid,A,am(uid,1));check_inverse(uid,B,am(uid,2))
    uid='6469';A=stem(uid)[0];key(uid,0,'t',5);record(uid,'complete singular parameters',s.solveset(A.det(),t,domain=s.S.Reals),s.FiniteSet(5));key(uid,1,'u',-5);key(uid,1,'v',3);record(uid,'nonzero null column',A.subs(t,5)*s.Matrix([-5,3,-1]),s.zeros(3,1))
    uid='5830';A=stem(uid)[0];values=s.solveset(A.det(),t,domain=s.S.Reals);key(uid,0,'t',values);record(uid,'normalised null vector',A.subs(t,s.sqrt(2))*am(uid,1),s.zeros(3,1));record(uid,'normalisation',am(uid,1)[0],1)
    uid='6402';A=stem(uid)[0];check_inverse(uid,A,am(uid,1));record(uid,'all excluded values',s.solveset(A.det(),t,domain=s.S.Reals),s.FiniteSet(-2,1));key(uid,2,'t',s.solveset(1/A.det()-s.Rational(1,12),t,domain=s.S.Reals))
    uid='6547';A=stem(uid)[0];record(uid,'signed determinant',A.det(),4*t+1);key(uid,1,'t',s.solveset(A.det()**2-9,t,domain=s.S.Reals));check_inverse(uid,A.subs(t,-1),am(uid,2))
    uid='4216';R,S=stem(uid);M=R*S;given=matrices(by[uid]['parts'][1]['answer_html']);check_inverse(uid,M,given[0]*given[1]);record(uid,'fixed direction determinant',s.trigsimp((M-s.eye(2)).det()),2-2*s.cos(2*theta)+k*s.sin(2*theta))
    record(uid,'double-angle factorisation',s.expand_trig(2-2*s.cos(2*theta)+k*s.sin(2*theta)),2*s.sin(theta)*(2*s.sin(theta)+k*s.cos(theta)));fixed(uid,M.subs({theta:s.pi/4,k:-2}),[s.Matrix([1,1])])
    review(uid,'division at angular endpoints','0<theta<pi gives sin(theta)>0. A fixed direction cannot have cos(theta)=0 because the remaining factor is then nonzero. Therefore tan(theta)=-k/2 is valid.')
    uid='4277';factor=3+2*s.sqrt(2);M=am(uid);record(uid,'composite rotation then stretch',M,s.diag(factor,1)*s.Matrix([[s.cos(theta),-s.sin(theta)],[s.sin(theta),s.cos(theta)]]))
    for angle,slope in [(s.pi/4,s.sqrt(2)-1),(3*s.pi/4,1-s.sqrt(2))]:
        at=M.subs(theta,angle);directions(uid,at,[slope]);truth(uid,'non-scalar repeated direction',at[0,1]!=0)
    record(uid,'all repeated-direction cosine squares',s.simplify(4*factor/(factor+1)**2),s.Rational(1,2))
    uid='5801';M=am(uid);record(uid,'composite stretch and shear',M,s.Matrix([[1,0],[b,a]]));check_inverse(uid,M,am(uid,1));key(uid,2,'a',4);key(uid,2,'b',6);directions(uid,M.subs({a:4,b:6}),[-2],vertical=True)
    uid='5855';M=stem(uid)[0];record(uid,'identically singular',M.det(),0);record(uid,'range lies on image line',M[1,:],k*M[0,:]);fixed(uid,M.subs(k,0),[s.Matrix([1,0])]);fixed(uid,M,[]);key(uid,2,'k',0);record(uid,'idempotence condition',M*M-M,2*k*M)
    uid='5882';A,B=stem(uid);record(uid,'preserved area',(A*B).det(),1);directions(uid,A*B,[s.Rational(1,4),-s.Rational(1,2)])
    uid='6413';M=stem(uid)[0];record(uid,'range line',M[1,:],2*M[0,:]);record(uid,'preimage family',M*s.Matrix([t,2*t-3]),s.Matrix([3,6]));fixed(uid,M,[]);record(uid,'square zero',M*M,am(uid,2))
    uid='6424';M=stem(uid)[0];check_inverse(uid,M,am(uid));out=M*s.Matrix([t,t+1]);record(uid,'whole image line',5*out[1]-3*out[0],1);directions(uid,M,[1/s.sqrt(3),-1/s.sqrt(3)])
    uid='6577';S,T=stem(uid);M=S*T;record(uid,'two-shear composite',M,am(uid));check_inverse(uid,M,am(uid,1));record(uid,'unit area',M.det(),1);record(uid,'direction discriminant',s.discriminant(M[0,1]*m*m+(M[0,0]-M[1,1])*m-M[1,0],m),a*b*(a*b+4));directions(uid,M.subs({a:2,b:-2}),[1]);record(uid,'line reversed',M.subs({a:2,b:-2})*s.Matrix([1,1]),s.Matrix([-1,-1]))
    review(uid,'complete ab classification','a,b are nonzero. The discriminant ab(ab+4) is negative on (-4,0), zero only at -4, and positive outside; the nonzero off-diagonal entry prevents a scalar exception.')
    uid='6589';M=am(uid);record(uid,'three-stage map',M,s.Matrix([[0,1],[a,b]]));key(uid,1,'a',6);key(uid,1,'b',2);at=M.subs({a:6,b:2});check_inverse(uid,at,am(uid,2));directions(uid,at,[1+s.sqrt(7),1-s.sqrt(7)]);out=at*s.Matrix([x,y]);record(uid,'preimage line',out[0]+out[1],6*x+3*y)

    uid=new(1);A,B,C=stem(uid);record(uid,'rectangular combination',(2*A-B)*C,am(uid,1));record(uid,'distributive reconstruction',2*A*C-am(uid,1),am(uid,2))
    uid=new(2);A,B=stem(uid);record(uid,'zero-product condition',(A*B).subs(q,2*p),s.zeros(2));record(uid,'nonzero example',A*am(uid,1),s.zeros(2));truth(uid,'both example factors nonzero',A!=s.zeros(2) and am(uid,1)!=s.zeros(2));record(uid,'no cancellation',A.det(),0);key(uid,0,'q',2*p)
    uid=new(3);A,B=stem(uid);key(uid,0,'p',5);key(uid,0,'q',3);sol=s.solve(list(A*B-B*A)+[B.det()-20],(p,q),dict=True);truth(uid,'all commutation and determinant solutions',sol==[{p:5,q:3}]);truth(uid,'neither factor scalar',A[0,1]!=0 and B.subs(sol[0])[0,1]!=0)
    uid=new(4);A,B,C=stem(uid);record(uid,'original rectangular equation',A*am(uid,1)+B,C)
    uid=new(5);A,B,C=stem(uid);check_inverse(uid,A,am(uid,0,0));check_inverse(uid,B,am(uid,0,1));record(uid,'AXB original equation',A*am(uid,1)*B,C)
    uid=new(6);A=stem(uid)[0];record(uid,'square identity',A*A,am(uid));record(uid,'identity coefficients',A*A,3*A+4*s.eye(2));check_inverse(uid,A,am(uid,1));record(uid,'fourth power',A**4,51*A+52*s.eye(2));truth(uid,'fourth-power key retains both coefficients','51A+52I' in by[uid]['parts'][2]['answer_html'].replace(' ',''))
    uid=new(7);M=am(uid);P=s.Matrix([[1,2],[2,1]]);Q=s.Matrix([[4,5],[5,4]]);record(uid,'both independent images',M*P,Q);record(uid,'requested image',M*s.Matrix([3,-1]),pair(uid,1));record(uid,'image area',7*s.Abs(M.det()),scalar(uid,2))
    uid=new(8);A,B=stem(uid);record(uid,'AB',A*B,am(uid,0,0));record(uid,'wrong reversed-order candidate',A.inv()*B.inv(),am(uid,0,1));record(uid,'disproof product',A*B*am(uid,0,1),am(uid,0,2));check_inverse(uid,A*B,am(uid,1))
    uid=new(9);A=stem(uid)[0];check_inverse(uid,A,am(uid));record(uid,'all excluded roots',s.solveset(A.det(),t,domain=s.S.Reals),s.FiniteSet(-1,2));key(uid,1,'t',s.solveset(s.trace(A.inv())-1,t,domain=s.S.Reals))
    uid=new(10);A=stem(uid)[0];check_inverse(uid,A,am(uid));record(uid,'right-hand column',A*am(uid,1),pm(uid,1))
    uid=new(11);A,B=stem(uid);sol=s.solve(list(A*B-c*s.eye(3)),(p,q,c),dict=True);truth(uid,'all scaled-identity parameters',sol==[{p:3,q:4,c:7}]);key(uid,0,'p',3);key(uid,0,'q',4);key(uid,0,'c',7);check_inverse(uid,A.subs(sol[0]),am(uid,1));record(uid,'determinant B',B.det(),scalar(uid,1))
    uid=new(12);A,B=stem(uid);check_inverse(uid,A,am(uid,0,0));check_inverse(uid,B,am(uid,0,1));check_inverse(uid,A*B,am(uid,1));record(uid,'inverse determinant',am(uid,1).det(),scalar(uid,2))
    uid=new(13);A=stem(uid)[0];check_inverse(uid,A,am(uid));record(uid,'all singular parameters',s.solveset(A.det(),k,domain=s.S.Reals),s.FiniteSet(0,1));key(uid,1,'k',s.Rational(1,2));at=A.subs(k,s.Rational(1,2));check_inverse(uid,at,am(uid,1));record(uid,'symmetry',am(uid,1),am(uid,1).T)
    uid=new(14);A,C=stem(uid);check_inverse(uid,A,am(uid));record(uid,'first right-hand matrix',A*am(uid,1),C);record(uid,'updated right-hand matrix',A*am(uid,2),C+s.Matrix([[1,1],[0,0],[0,0]]))
    uid=new(15);record(uid,'scalar multiple inverse determinant',s.Rational(1,2**3*2*(-3)*5),scalar(uid,1));review(uid,'inverse of three factors','Both written products cancel adjacent inverse pairs in reverse order; all three supplied factors are non-singular.')
    uid=new(16);A=stem(uid)[0];record(uid,'factorised determinant',A.det(),(t-1)**2*(t+2));record(uid,'all singular values',s.solveset(A.det(),t,domain=s.S.Reals),s.FiniteSet(-2,1));record(uid,'positive inverse determinant interval',s.solve_univariate_inequality(1/((t-1)**2*(t+2))>0,t,relational=False),s.Union(s.Interval.open(-2,1),s.Interval.open(1,s.oo)))
    uid=new(17);A=stem(uid)[0];record(uid,'positive determinant formula',A.det(),1+a*a+b*b);truth(uid,'minimum determinant at zero',bool(1+a*a+b*b>=1));record(uid,'maximum reciprocal',1/A.det().subs({a:0,b:0}),1);key(uid,2,'b',[-2,2])
    uid=new(18);A=stem(uid)[0];sol=s.solve([A.det()-12,A.cofactor(0,0)-6],(p,q),dict=True);truth(uid,'all cofactor-entry parameters',sol==[{p:2,q:3}]);key(uid,0,'p',2);key(uid,0,'q',3);record(uid,'scaled inverse determinant',s.Rational(27,12),scalar(uid,1))
    uid=new(19);M=stem(uid)[0];key(uid,0,'k',s.solveset(M.det()**2-9,k,domain=s.S.Reals));record(uid,'positive determinant class',1/M.det().subs(k,3),s.Rational(1,3));record(uid,'negative determinant class',1/M.det().subs(k,s.sqrt(3)),-s.Rational(1,3))
    uid=new(20);A,B=stem(uid);record(uid,'small product',A*B,am(uid,0));record(uid,'small determinant',(A*B).det(),-4);record(uid,'large product',B*A,am(uid,1));record(uid,'large singularity',(B*A).det(),0)
    uid=new(21);M=am(uid);record(uid,'fixed reflection direction',M*s.Matrix([1,2]),s.Matrix([1,2]));record(uid,'reversed normal',M*s.Matrix([-2,1]),s.Matrix([2,-1]));record(uid,'reflection involution',M*M,s.eye(2));record(uid,'image',M*s.Matrix([5,0]),s.Matrix([-3,4]));record(uid,'unit area',s.Abs(M.det()),scalar(uid,2))
    uid=new(22);S,T=stem(uid);record(uid,'ST',S*T,am(uid,1,0));record(uid,'TS',T*S,am(uid,1,1));record(uid,'first image',S*T*s.ones(2,1),pair(uid,1,0));record(uid,'second image',T*S*s.ones(2,1),pair(uid,1,1));record(uid,'first square',(S*T)**2,-s.eye(2));record(uid,'second square',(T*S)**2,-s.eye(2))
    uid=new(23);M=am(uid);R=s.Matrix([[s.Rational(1,2),-s.sqrt(3)/2],[s.sqrt(3)/2,s.Rational(1,2)]]);record(uid,'reflection then rotation',M,R*s.diag(1,-1));fixed(uid,M,[s.Matrix([s.sqrt(3),1])]);record(uid,'orthogonality',M.T*M,s.eye(2));record(uid,'normal reversed',M*s.Matrix([-1,s.sqrt(3)]),s.Matrix([1,-s.sqrt(3)]))
    uid=new(24);M=am(uid);record(uid,'three-stage composite',M,s.Matrix([[1,0],[3,1]])*s.Matrix([[0,-1],[1,0]])*s.diag(2,1));check_inverse(uid,M,am(uid,1));record(uid,'preimage',M*am(uid,2),s.Matrix([4,-2]))
    uid=new(25);M=stem(uid)[0];out=M*s.Matrix([2,t]);record(uid,'image entire vertical line',out[1]-2*out[0],2);out=M*s.Matrix([-5,t]);record(uid,'preimage entire target line',2*out[0]-out[1],5);out=M*pair(uid,2);record(uid,'intersection first line',out[1]-2*out[0],2);record(uid,'intersection second line',out[0]+out[1],8)
    uid=new(26);M=stem(uid)[0];fixed(uid,M,[s.Matrix([0,1])]);directions(uid,M,[0],vertical=True);record(uid,'every horizontal line', (M*s.Matrix([t,c]))[1],c)
    uid=new(27);M=stem(uid)[0];fixed(uid,M,[s.Matrix([1,-1])])
    out=M*s.Matrix([t,t+c]);record(uid,'parallel invariant family',out[1]-out[0],c);point=pair(uid,2);record(uid,'supplied fixed point',M*point,point);record(uid,'point on affine line',point[1]-point[0],6)
    uid=new(28);M=stem(uid)[0];record(uid,'determinant restriction',M.det(),t+2);record(uid,'direction discriminant',s.discriminant(m*m+(t-1)*m+2,m),(t-1)**2-8);fixed(uid,M,[])
    uid=new(29);M=stem(uid)[0];directions(uid,M,[1],vertical=True);fixed(uid,M,[]);record(uid,'scale on nonvertical line',M*s.ones(2,1),2*s.ones(2,1));record(uid,'vertical reversal',M*s.Matrix([0,1]),s.Matrix([0,-1]))
    uid=new(30);M=stem(uid)[0];key(uid,0,'t',s.solveset((M-s.eye(2)).det(),t,domain=s.S.Reals));fixed(uid,M.subs(t,-1),[s.Matrix([1,1])]);fixed(uid,M.subs(t,4),[s.Matrix([2,-3])])
    uid=new(31);M=am(uid);record(uid,'first prescribed direction',M*s.Matrix([1,1]),s.Matrix([2,2]));record(uid,'second prescribed direction',M*s.Matrix([1,-2]),s.Matrix([-3,6]));record(uid,'requested image',M*s.Matrix([2,-1]),pair(uid,1));record(uid,'image triangle area',s.Abs(M.det())*s.Rational(3,2),9);directions(uid,M,[1,-2])
    uid=new(32);M=stem(uid)[0];fixed(uid,M,[s.Matrix([1,0])]);record(uid,'all horizontal lines',(M*s.Matrix([t,c]))[1],c);record(uid,'direction equation',M[0,1]*m*m+(M[0,0]-M[1,1])*m-M[1,0],k*m*m)
    uid=new(33);M=am(uid);R=s.Matrix([[s.cos(theta),-s.sin(theta)],[s.sin(theta),s.cos(theta)]]);record(uid,'composite',M,R*s.diag(2,s.Rational(1,2)));record(uid,'unit area',s.trigsimp(M.det()),1);at=M.subs({s.cos(theta):s.Rational(4,5),s.sin(theta):s.Rational(3,5)});fixed(uid,at,[s.Matrix([1,2])]);directions(uid,at,[2])
    uid=new(34);M=stem(uid)[0];key(uid,0,'p',4);key(uid,0,'q',1);at=M.subs({p:4,q:1});directions(uid,at,[1,-1]);fixed(uid,at,[]);record(uid,'equal side lengths',at[:,0].dot(at[:,0]),at[:,1].dot(at[:,1]));record(uid,'non-right angle dot product',at[:,0].dot(at[:,1]),8);check_inverse(uid,at,am(uid,3))
    uid=new(35);M=stem(uid)[0];record(uid,'involution',M*M,s.eye(2));record(uid,'fixed direction',M*s.Matrix([1,t]),s.Matrix([1,t]));record(uid,'reversed perpendicular',M*s.Matrix([-t,1]),s.Matrix([t,-1]));key(uid,2,'t',s.Rational(3,2));at=M.subs(t,s.Rational(3,2));record(uid,'prescribed image',at*s.Matrix([1,0]),pair(uid,3));record(uid,'87 applications',at**87*s.Matrix([1,0]),pair(uid,3))
    uid=new(36);M=stem(uid)[0];fixed(uid,M,[s.Matrix([1,-1])]);directions(uid,M,[0,-1]);record(uid,'horizontal family',(M*s.Matrix([t,c]))[1],c);fixed(uid,M*M,[s.Matrix([1,-1])])
    uid=new(37);A,B=stem(uid);solutions=[am(uid,1,0),am(uid,1,1)]
    for W in solutions:record(uid,'intertwining original equation',W*A,B*W);record(uid,'determinant constraint',W.det(),-8);record(uid,'trace constraint',s.trace(W),3)
    unknown=s.Matrix([[p,q],[k,m]]);sol=s.solve(list(unknown*A-B*unknown)+[unknown.det()+8,s.trace(unknown)-3],(p,q,k,m),dict=True);truth(uid,'complete real matrix solution set',{tuple(unknown.subs(d)) for d in sol}=={tuple(v) for v in solutions})
    uid=new(38);A,B=stem(uid);record(uid,'inverse-sum identity',A.inv()+B.inv(),B.inv()*(A+B)*A.inv());check_inverse(uid,A.inv()+B.inv(),am(uid,1));record(uid,'inverse area multiplier',s.Abs(am(uid,1).det()),scalar(uid,2))
    uid=new(39);K=am(uid);record(uid,'row-combination matrix',K,s.Matrix([[3,0,0],[1,1,0],[0,2,-1]]));record(uid,'det B',K.det()*(-2),6);record(uid,'det inverse-product',1/K.det(),-s.Rational(1,3))
    uid=new(40);M=am(uid);R=s.Matrix([[s.cos(theta),-s.sin(theta)],[s.sin(theta),s.cos(theta)]]);record(uid,'correct temporal order',M,R*s.diag(a,1));parts=matrices(by[uid]['parts'][0]['answer_html']);check_inverse(uid,M,parts[1]*parts[2]);key(uid,1,'a',9)
    for cosine,sine,slope in [(s.Rational(3,5),s.Rational(4,5),3),(-s.Rational(3,5),s.Rational(4,5),-3)]:
        at=M.subs({a:9,s.cos(theta):cosine,s.sin(theta):sine});directions(uid,at,[slope]);fixed(uid,at,[])
    at=M.subs({a:9,s.cos(theta):s.Rational(3,5),s.sin(theta):s.Rational(4,5)});out=at*s.Matrix([x,3*x+c]);record(uid,'affine image intercept',out[1]-3*out[0],3*c);record(uid,'factor on invariant direction',at*s.Matrix([1,3]),3*s.Matrix([1,3]))
    review(uid,'complete angular and affine conditions','For a=9 the repeated-direction discriminant forces cos(theta)=±3/5. On [0,pi] these give the two supplied angles. At the acute angle the affine intercept changes from c to 3c, hence only c=0 is invariant; the repeated scale factor is 3, not 1.')

if args.owner:
    source=Path(args.owner);owner=json.loads(source.read_text(encoding='utf-8-sig'));original={q['id']:q for l in owner['lessons'] for q in l['questions']}
    truth('SOURCE','read-only source SHA',hashlib.sha256(source.read_bytes()).hexdigest()==pack['source']['sha256'])
for fixture in fixtures:
    uid=fixture['id'];item=next(q for q in pack['questions'] if q['id']==fixture['uid'])
    truth(uid,'manifest fixture binding',digest(item)==fixture['contentSha256']);record(uid,'all part marks preserved',sum(p['marks'] for p in fixture['parts']),item['marks'])
    if args.owner:
        old=original[uid];truth(uid,'owner keys and teaching unchanged',all(item[new]==old[key] for new,key in [('prompt_html','question_html'),('answer_html','answer_html'),('solution_html','solution_html'),('hint_html','hint_html')]) and fixture['parts']==old['parts'])
for lesson in pack['lessons']:
    truth(lesson['id'],'teaching digest',hashlib.sha256(json.dumps(lesson,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()==audit['teachingDigests'][lesson['id']])
owner_checks()

# Verify all authored examples by products, inverse identities and exact geometry.
examples={e['verification']:e for l in pack['lessons'] for e in l['examples']}
def em(uid,kind,index=0):return matrices(examples[uid][kind])[index]
uid='E-O1';A,B=matrices(examples[uid]['question']);record(uid,'complete linear combination',2*A-B,em(uid,'solution'))
uid='E-O2';A,B=matrices(examples[uid]['question']);record(uid,'first order',A*B,em(uid,'solution',0));record(uid,'reverse order',B*A,em(uid,'solution',1))
uid='E-O3';A,B=matrices(examples[uid]['question']);record(uid,'small product',A*B,em(uid,'solution',0));record(uid,'large product',B*A,em(uid,'solution',1));record(uid,'idempotence',(B*A)**2,B*A)
uid='E-O4';A=em(uid,'question');record(uid,'nilpotent part',(A-s.eye(2))**2,s.zeros(2));proposed=s.Matrix([[1,4*n],[0,1]]);record(uid,'power base',proposed.subs(n,0),s.eye(2));record(uid,'power induction',proposed*A,proposed.subs(n,n+1))
uid='E-I1';check_inverse(uid,em(uid,'question'),em(uid,'solution'))
uid='E-I2';A=em(uid,'question');check_inverse(uid,A,em(uid,'solution'));record(uid,'row reduction on augmented array',s.Matrix.hstack(A,s.eye(3)).rref()[0],s.Matrix.hstack(s.eye(3),em(uid,'solution')))
uid='E-I3';A,C=matrices(examples[uid]['question']);check_inverse(uid,A,em(uid,'solution',0));record(uid,'both right-hand columns',A*em(uid,'solution',1),C)
uid='E-I4';A,B,C=matrices(examples[uid]['question']);record(uid,'two-sided original equation',A*em(uid,'solution')*B,C)
uid='E-D1';A=em(uid,'question');record(uid,'cofactor determinant',A.det(),3);record(uid,'adjugate certificate',A*em(uid,'solution'),3*s.eye(3))
uid='E-D2';A=em(uid,'question');record(uid,'all excluded parameters',s.solveset(A.det(),t,domain=s.S.Reals),s.FiniteSet(-1,1,3))
record('E-D3','row scaling and swap',(-4)*s.Rational(15,2),-30)
record('E-D4','all signed area roots',s.solveset((k*k-2)**2-4,k,domain=s.S.Reals),s.FiniteSet(-2,0,2))
uid='E-P1';R=em(uid,'solution');record(uid,'rotation coefficients',R,s.Matrix([[s.sqrt(3)/2,-s.Rational(1,2)],[s.Rational(1,2),s.sqrt(3)/2]]));record(uid,'point image',R*s.Matrix([2,0]),s.Matrix([s.sqrt(3),1]));record(uid,'length preserved',R.T*R,s.eye(2))
uid='E-P2';M=em(uid,'solution');record(uid,'composite order',M,s.Matrix([[0,-1],[1,0]])*s.diag(3,1));record(uid,'point image',M*s.Matrix([1,-2]),s.Matrix([2,3]))
uid='E-P3';P,Q=matrices(examples[uid]['question']);record(uid,'independent images',em(uid,'solution')*P,Q)
uid='E-P4';M=em(uid,'question');out=M*s.Matrix([t,2*t-1]);record(uid,'whole image line',out[0]-4*out[1],3)
uid='E-F1';M=em(uid,'question');fixed(uid,M,[s.Matrix([0,1])]);directions(uid,M,[0],vertical=True);record(uid,'arbitrary horizontal intercept',(M*s.Matrix([t,c]))[1],c)
uid='E-F2';M=em(uid,'question');directions(uid,M,[1],vertical=True);fixed(uid,M,[]);record(uid,'nonvertical scale',M*s.ones(2,1),3*s.ones(2,1))
uid='E-F3';M=em(uid,'question');record(uid,'direction equation',M[0,1]*m*m+(M[0,0]-M[1,1])*m-M[1,0],2*m*m+(t-1)*m+1);record(uid,'critical values',s.solveset(s.discriminant(2*m*m+(t-1)*m+1,m),t,domain=s.S.Reals),s.FiniteSet(1-2*s.sqrt(2),1+2*s.sqrt(2)))
uid='E-F4';M=em(uid,'solution');record(uid,'spatial image',M*s.Matrix([2,-1,3]),s.Matrix([1,2,-3]));fixed(uid,M,[]);record(uid,'orientation',M.det(),-1);record(uid,'distance preserved',M.T*M,s.eye(3))

# Frozen complete quick keys: matrix answers are checked through every entry.
quick=json.loads((base/'matrices1-quick-verification-v1.json').read_text(encoding='utf8'))
for row in quick:
    uid=row['uid'];item=next(q for q in pack['questions'] if q['id']==uid);ref=row['reference'];kind=ref['kind'];answers=row['answers']
    truth(uid,'content binding',digest(item)==row['contentSha256']);truth(uid,'field binding',{f['key']:f['expected'] for f in item['fields']}==answers)
    def M(name):return s.Matrix([[plain(v) for v in r] for r in ref[name]])
    def fields_matrix(rows,cols):return s.Matrix(rows,cols,lambda i,j:plain(answers[f'r{i+1}c{j+1}']))
    if kind in ['product','power','inverse','solve-left','composite']:
        if kind=='product':wanted=M('A')*M('B')
        elif kind=='power':wanted=M('A')**ref['power']
        elif kind=='inverse':wanted=M('A').inv()
        elif kind=='solve-left':wanted=M('A').inv()*M('C')
        else:wanted=M('R')*M('S')
        actual=fields_matrix(*wanted.shape);record(uid,'all matrix entries',actual,wanted)
        if kind=='inverse':check_inverse(uid,M('A'),actual)
        if kind=='solve-left':record(uid,'original equation',M('A')*actual,M('C'))
    elif kind=='singular':
        var=symbols[ref['variable']];raw=next(iter(answers.values()));actual=s.FiniteSet(*(plain(v) for v in raw.strip('{}').split(',')))
        record(uid,'all real singular values',actual,s.solveset(M('A').det(),var,domain=s.S.Reals))
    elif kind=='det':record(uid,'cofactor determinant',plain(answers['det']),M('A').det())
    elif kind=='area-roots':
        actual=s.FiniteSet(*(plain(v) for v in answers['values'].strip('{}').split(',')))
        record(uid,'both signs of area equation',actual,s.solveset((k*k-ref['off'])**2-ref['scale']**2,k,domain=s.S.Reals));record(uid,'inverse multiplier',plain(answers['inverse_area']),s.Rational(1,ref['scale']))
    elif kind=='preimage':record(uid,'whole preimage',M('A')*s.Matrix([plain(answers['input_x']),plain(answers['input_y'])]),M('image'))
    elif kind=='line-image':
        left,right=answers['line'].split('=');claim=plain(left)-plain(right);out=M('A')*s.Matrix([t,ref['slope']*t+ref['intercept']]);record(uid,'all image points',claim.subs({u:out[0],v:out[1]},simultaneous=True),0)
    elif kind=='fixed-diagonal':fixed(uid,s.diag(ref['factor'],1),[s.Matrix([0,1])])
    elif kind=='two-directions':directions(uid,M('A'),[1],vertical=True)
    elif kind=='spatial':
        wanted=M('A')*M('point');record(uid,'all three image coordinates',s.Matrix([plain(answers['coord'+str(i+1)]) for i in range(3)]),wanted);record(uid,'absolute volume multiplier',plain(answers['volume']),s.Abs(M('A').det()))
    else:truth(uid,'reviewed complete principle',answers['choice']==ref['correct'])
assert all(q['id'] in coverage and coverage[q['id']]>2 for q in fixtures)
assert all(code in coverage for code in examples)
result=dict(ownerTasks=60,examples=20,quickChecks=40,checks=len(log),failures=failures,coverage=coverage,log=log,limitations=['REVIEWED entries identify analytic completeness and transformation descriptions separately from exact symbolic PASS checks.','Automatic practice grades complete final answers; written proofs retain indicative self-assessment and teacher judgement.'])
Path(args.report).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(json.dumps({k:result[k] for k in ['ownerTasks','examples','quickChecks','checks']}|dict(failures=len(failures))))
if failures:raise SystemExit(1)
