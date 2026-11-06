"""Author chapter 7 from learning objectives; no examination source is imported."""
import hashlib,html,json,re
from pathlib import Path
import sympy as s
from fp1_induction_teaching import lessons,example_models

n,k,r,x,u=s.symbols('n k r x u',real=True)
N=s.Symbol('n',integer=True,nonnegative=True)
local={'n':n,'k':k,'r':r,'x':x,'u':u}
def expr(t):return s.sympify(t,locals=local)
def tex(t):return s.latex(expr(t) if isinstance(t,str) else t)
def math(t):return r'\('+tex(t)+r'\)'
def display(t):return r'\['+t+r'\]'
def digest(q):return hashlib.sha256(json.dumps(q,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()
questions=[];models=[]
def criterion(code,marks,description):return dict(code=code,marks=marks,description_html=description)
def proof(base,hypothesis,bridge,target,conclusion):
    return [criterion('A1',1,base),criterion('M1',1,hypothesis),criterion('M1',1,bridge),criterion('A1',1,target),criterion('A1',1,conclusion)]
def standard_proof(target,start='0'):
    target=target.replace('<p>','').replace('</p>','').rstrip('.')
    return proof('<p>Check both sides at n='+start+', with the stated domain.</p>',
      '<p>State the formula at an arbitrary admissible k as the induction hypothesis.</p>',
      '<p>Use the hypothesis in the actual next sum, derivative, recurrence or matrix product.</p>',
      '<p>Obtain the complete next expression '+target+'.</p>',
      '<p>Conclude from the verified base and implication for every integer in the stated domain. Accept a valid equivalent induction.</p>')
def written(code,topic,title,stem,parts,answer,hint,model,extras=None,difficulty=3):
    uid='M4U-9231-IN-E-'+code
    prompt=stem+'<ol class="parts" type="a">'+''.join('<li>'+p[0]+'<span class="marks">['+str(sum(c['marks'] for c in p[2]))+']</span></li>' for p in parts)+'</ol>'
    q=dict(id=uid,family_uid=uid,lesson=topic,title=title,collection='exam',prompt_html=prompt,answer_html=answer,solution_html=''.join('<h4>('+chr(97+i)+')</h4>'+p[1] for i,p in enumerate(parts)),hint_html=hint,marks=sum(c['marks'] for p in parts for c in p[2]),difficulty=difficulty,fields=[],parts=[dict(label=chr(97+i),marking_criteria=p[2]) for i,p in enumerate(parts)],verification=uid)
    questions.append(q);models.append(dict(id=uid,kind_group='written',model=model,extras=extras or []))
def application(question,solution,marks=2):
    return question,solution,[criterion('M1',1,'<p>Apply the proved identity to the requested values or range, retaining the stated domain.</p>'),criterion('A'+str(marks-1),marks-1,solution)]
def sum_task(code,title,term,formula,app,extras,difficulty=3):
    T,F=expr(term),expr(formula);Fk=tex(F.subs(n,k));nextterm=tex(T.subs(r,k+1));Fnext=tex(s.factor(F.subs(n,k+1)));base=tex(F.subs(n,1))
    target=display(r'\sum_{r=1}^{n}'+tex(T)+'='+tex(F))
    solution='<p>Let P(n) be the stated identity. At n=1 both sides equal '+base+'. Assume P(k) for an arbitrary integer k≥1. Adding the new term gives</p>'+display(r'S_{k+1}='+Fk+'+'+nextterm+'='+Fnext)+r'<p>The last expression is F(k+1), with F the proposed right side. Thus P(k) implies P(k+1). The base case and implication establish the identity for all integers n≥1.</p>'
    written(code,'sums',title,'<p>Let '+math('S_n')+r' denote the sum below.</p>',[(r'<p>Prove by mathematical induction, for every integer n≥1,</p>'+target,solution,standard_proof('<p>F(k+1) from the stated identity.</p>','1')),app],target,'<p>Add the term with r=k+1 to the assumed kth sum. A tail sum is the difference of two complete sums.</p>',dict(kind='sum',term=term,formula=formula,lower=1),extras,difficulty)

sum_task('S01','An offset quadratic summand','r*(r+2)','n*(n+1)*(2*n+7)/6',
 application(r'<p>Hence evaluate \(\sum_{r=4}^{15}r(r+2)\).</p>',r'<p>Subtract S₃ from S₁₅: 1480−26=1454.</p>'),[dict(actual='n*(n+1)*(2*n+7)/6',subs={'n':15},expected='1480'),dict(actual='n*(n+1)*(2*n+7)/6',subs={'n':3},expected='26')])
sum_task('S02','When a running total first crosses a threshold','4*r-1','n*(2*n+1)',
 application('<p>Find the least positive integer n for which the sum exceeds 400.</p>','<p>S₁₃=351 and S₁₄=406. Every added term 4r−1 is positive, so the least index is 14.</p>'),[dict(actual='n*(2*n+1)',subs={'n':13},expected='351'),dict(actual='n*(2*n+1)',subs={'n':14},expected='406')])
sum_task('S03','A finite reciprocal sum and its remainder','1/((r+1)*(r+2))','n/(2*(n+2))',
 application(r'<p>Find the least n≥1 for which \(1/2-S_n&lt;1/50\).</p>',r'<p>The remainder is 1/(n+2). The strict inequality gives n+2&gt;50, so n≥49 and the least value is 49.</p>'),[dict(actual='1/2-n/(2*(n+2))',expected='1/(n+2)'),dict(actual='1/(n+2)',subs={'n':48},expected='1/50'),dict(actual='1/(n+2)',subs={'n':49},expected='1/51')])
sum_task('S04','Cubes along an odd-index progression','(2*r-1)**3','n**2*(2*n**2-1)',
 application(r'<p>Evaluate \(\sum_{r=6}^{12}(2r-1)^3\).</p>',r'<p>S₁₂=41328 and S₅=1225, so the required total is 40103.</p>'),[dict(actual='n**2*(2*n**2-1)',subs={'n':12},expected='41328'),dict(actual='n**2*(2*n**2-1)',subs={'n':5},expected='1225')],4)
sum_task('S05','A weighted exponential total','(3*r+1)*2**(r-1)','(3*n-2)*2**n+2',
 application('<p>Find n if the total is 418.</p>','<p>At n=5 the total is (15−2)·32+2=418. Every summand is positive, so the totals strictly increase and no other positive integer n works.</p>'),[dict(actual='(3*n-2)*2**n+2',subs={'n':5},expected='418')],4)
written('S06','sums','A convincing pattern with a missing implication',r'<p>A proposed formula is \(\sum_{r=1}^{n}(3r^2-3r+2)=n^3+n+(n-1)(n-2)(n-3)\). A student checks n=1,2,3 and then writes “replace n by n+1, so the formula is true”.</p>',[
 (r'<p>Find the first positive integer where the formula fails and explain the logical error.</p>',r'<p>The correct totals at 1,2,3 are 2,10,30 and the extra factor is zero. At n=4 the total is 68 but the proposed value is 74. The student has not proved a conditional implication; substituting into the desired formula assumes the conclusion.</p>',[criterion('A1',1,'<p>First failure n=4, with actual 68 and proposed 74.</p>'),criterion('B1',1,'<p>Explain that checking examples or assuming the next claim does not prove P(k)⇒P(k+1).</p>')]),
 (r'<p>Prove by induction the correct identity \(\sum_{r=1}^{n}(3r^2-3r+2)=n^3+n\), n≥1.</p>',r'<p>At n=1 both sides equal 2. Assume Sₖ=k³+k for k≥1. The next summand is 3(k+1)²−3(k+1)+2=3k²+3k+2. Hence Sₖ₊₁=k³+3k²+4k+2=(k+1)³+(k+1). This is the next formula, so the base and implication prove the identity for all integers n≥1.</p>',standard_proof('<p>(k+1)³+(k+1).</p>','1'))],r'<p>First failure: n=4 (68≠74). The corrected sum is n³+n.</p>','<p>A product of consecutive shifted factors can vanish at several early indices. Separate rejecting the false formula from proving its replacement.</p>',dict(kind='sum_counterexample',term='3*r**2-3*r+2',formula='n**3+n',false='n**3+n+(n-1)*(n-2)*(n-3)',lower=1,first=4))

def derivative_task(code,title,function,formula,start,order,app,extras,difficulty=3):
    y,F=expr(function),expr(formula);base=s.simplify(s.diff(y,x,order*start));Fk=F.subs(n,k);nextF=F.subs(n,k+1)
    target=display(r'D^{'+('n' if order==1 else str(order)+'n')+'}y='+tex(F))
    solution='<p>Define P(n) as the displayed formula on the given x-domain. At n='+str(start)+' direct differentiation gives '+math(base)+', agreeing with the proposed formula. Assume P(k) for an arbitrary k≥'+str(start)+'. Differentiate the assumed expression '+('once' if order==1 else str(order)+' times')+', keeping k constant:</p>'+display(r'D^{'+('k+1' if order==1 else str(order)+'k+'+str(order))+'}y='+tex(s.diff(Fk,x,order))+'='+tex(nextF))+'<p>This is exactly P(k+1). The base and implication prove the formula for every stated integer n and every x in the given domain.</p>'
    stem='<p>Let '+math(y)+r' be the function y. Work where the displayed original function is defined.</p>'
    written(code,'derivatives',title,stem,[(f'<p>Prove by mathematical induction for integers n≥{start} that</p>'+target,solution,standard_proof('<p>The stated derivative formula with n replaced by k+1.</p>',str(start))),app],target,'<p>Match the derivative order in P(k+1). Retain all chain-rule and product-rule terms before collecting.</p>',dict(kind='derivative',function=function,formula=formula,start=start,order=order),extras,difficulty)

derivative_task('D01','A linear factor carried through every derivative','(2*x+1)*exp(3*x)','exp(3*x)*(3**n*(2*x+1)+2*n*3**(n-1))',1,1,
 application('<p>Evaluate y⁽⁵⁾(0).</p>','<p>The value is 3⁵+10·3⁴=243+810=1053.</p>'),[dict(actual='exp(3*x)*(3**n*(2*x+1)+2*n*3**(n-1))',subs={'n':5,'x':0},expected='1053')])
derivative_task('D02','Logarithmic derivatives and the first valid index','log(2*x+5)','(-1)**(n-1)*factorial(n-1)*2**n/(2*x+5)**n',1,1,
 application('<p>Evaluate y⁽⁴⁾(−2), stating whether −2 lies in the real domain.</p>','<p>The real domain is x&gt;−5/2, which contains −2. The fourth derivative is −3!·2⁴/(2x+5)⁴, giving −96.</p>'),[dict(actual='(-1)**(n-1)*factorial(n-1)*2**n/(2*x+5)**n',subs={'n':4,'x':-2},expected='-96')])
derivative_task('D03','A reciprocal square and its series coefficient','(1-3*x)**(-2)','factorial(n+1)*3**n/(1-3*x)**(n+2)',0,1,
 application('<p>Hence find the coefficient of x⁵ in the Maclaurin expansion.</p>','<p>The coefficient is y⁽⁵⁾(0)/5!=6!·3⁵/5!=1458.</p>'),[dict(actual='factorial(n+1)*3**n/factorial(n)',subs={'n':5},expected='1458')],4)
derivative_task('D04','Even orders and the missing odd derivative','sin(4*x+pi/7)','(-16)**n*sin(4*x+pi/7)',0,2,
 application('<p>Find y⁽⁷⁾(x) exactly.</p>',r'<p>Differentiate the even-order result with n=3 once: \(y^{(7)}=-16384\cos(4x+\pi/7)\).</p>'),[dict(actual='diff(sin(4*x+pi/7),x,7)',expected='-16384*cos(4*x+pi/7)')])
derivative_task('D05','A quadratic factor under the product rule','(x**2+1)*exp(-2*x)','(-2)**n*exp(-2*x)*(x**2-n*x+1+n*(n-1)/4)',0,1,
 application('<p>Evaluate y‴(1).</p>',r'<p>The bracket is 1−3+1+3·2/4=1/2, so \(y^{(3)}(1)=-4e^{-2}\).</p>'),[dict(actual='(-2)**n*exp(-2*x)*(x**2-n*x+1+n*(n-1)/4)',subs={'n':3,'x':1},expected='-4*exp(-2)')],4)
derivative_task('D06','A proved formula applied to a related rational function','1/(x+4)','(-1)**n*factorial(n)/(x+4)**(n+1)',0,1,
 application(r'<p>Let z=x/(x+4). Use the proved result to find z⁽⁴⁾(0).</p>',r'<p>Write z=1−4/(x+4). For n≥1 its nth derivative is −4 times the formula for y. Therefore z⁽⁴⁾(0)=−4·4!/4⁵=−3/32.</p>'),[dict(actual='diff(x/(x+4),x,4)',subs={'x':0},expected='-3/32')])

def recurrence_task(code,title,formula,rule,start,initial,app,extras,difficulty=3):
    F=expr(formula);rhs=expr(rule).subs({u:F.subs(n,k),n:k})
    solution=f'<p>At n={start} the formula gives {tex(F.subs(n,start))}, the specified initial value. Assume it holds at an arbitrary k≥{start}. Substitution into the recurrence gives</p>'+display(r'u_{k+1}='+tex(rhs)+'='+tex(s.factor(F.subs(n,k+1))))+f'<p>This is the proposed formula at k+1. The verified base and implication establish it for all integers n≥{start}.</p>'
    written(code,'recurrences',title,f'<p>A sequence has u{subscript(start)}={initial} and '+display(r'u_{n+1}='+tex(expr(rule)))+f'for n≥{start}.</p>',[(f'<p>Prove by induction that '+math(F)+f' equals uₙ for every integer n≥{start}.</p>',solution,standard_proof('<p>The proposed formula at k+1.</p>',str(start))),app],display('u_n='+tex(F)),'<p>Use the given recurrence after stating the kth formula. Check the least index using monotonicity, not one isolated substitution.</p>',dict(kind='recurrence',formula=formula,rule=rule,start=start,initial=initial),extras,difficulty)
def subscript(i):return str(i).translate(str.maketrans('0123456789','₀₁₂₃₄₅₆₇₈₉'))
recurrence_task('R01','An affine update and its first threshold','2+3**(n+1)','3*u-4',0,5,
 application('<p>Find the first index n for which uₙ&gt;700.</p>','<p>The formula is strictly increasing. u₄=245≤700 and u₅=731&gt;700, so the first index is 5.</p>'),[dict(actual='2+3**(n+1)',subs={'n':4},expected='245'),dict(actual='2+3**(n+1)',subs={'n':5},expected='731')])
written('R02','recurrences','An irrational invariant boundary',r'<p>Let u₁=4 and \(u_{n+1}=(3u_n+8)/(u_n+3)\), n≥1.</p>',[
 (r'<p>Prove by induction that \(u_n&gt;\sqrt8\) for every n≥1.</p>',r'<p>The base 4&gt;√8 is true. Assuming uₖ&gt;√8 gives uₖ+3&gt;0. With L=√8,</p>\[u_{k+1}-L=\frac{(3-L)(u_k-L)}{u_k+3}>0,\]<p>because 3−√8&gt;0. The next term is defined and exceeds L. Induction proves the bound for all n≥1.</p>',standard_proof('<p>uₖ₊₁&gt;√8 with a positive denominator.</p>','1')),
 application('<p>Show that the sequence converges and find its limit.</p>',r'<p>Since \(u_{n+1}-u_n=(8-u_n^2)/(u_n+3)&lt;0\), it decreases and is bounded below. It therefore converges. Continuity gives ℓ²=8; the bound ℓ≥√8 selects ℓ=√8.</p>',3)],r'<p>uₙ&gt;√8 for all n≥1; the sequence decreases to √8.</p>','<p>Subtract √8 from the recurrence and factor. Justify convergence before solving a fixed-point equation.</p>',dict(kind='irrational_bound',rule='(3*u+8)/(u+3)',lower='sqrt(8)',initial=4),difficulty=4)
written('R03','recurrences','Two initial values determine the solution',r'<p>Let u₀=2, u₁=7 and \(u_{n+2}=5u_{n+1}-6u_n\), n≥0.</p>',[
 (r'<p>Prove by induction that \(u_n=3^{n+1}-2^n\) for all n≥0.</p>',r'<p>The formula gives 2 and 7 at n=0 and 1. Assume it at k and k+1. Then</p>\[u_{k+2}=5(3^{k+2}-2^{k+1})-6(3^{k+1}-2^k)=3^{k+3}-2^{k+2}.\]<p>Both consecutive cases propagate, so paired induction proves the result for all n≥0.</p>',[criterion('A2',2,'<p>Verify both n=0 and n=1 against the supplied initial values.</p>'),criterion('M1',1,'<p>Assume the formula at k and k+1.</p>'),criterion('M1',1,'<p>Substitute both formulae into the second-order recurrence.</p>'),criterion('A1',1,'<p>Obtain 3ᵏ⁺³−2ᵏ⁺².</p>'),criterion('A1',1,'<p>Conclude for all n≥0 by paired induction.</p>')]),
 application('<p>Find the least n with uₙ&gt;600.</p>','<p>The difference uₙ₊₁−uₙ=2·3ⁿ⁺¹−2ⁿ is positive. Since u₄=227 and u₅=697, the least index is 5.</p>')],r'<p>uₙ=3ⁿ⁺¹−2ⁿ; the least index is 5.</p>','<p>A second-order recurrence needs two base cases. Treat the consecutive pair as the induction statement.</p>',dict(kind='second_order',formula='3**(n+1)-2**n',a=5,b=-6,initial=[2,7]),[dict(actual='3**(n+1)-2**n',subs={'n':4},expected='227'),dict(actual='3**(n+1)-2**n',subs={'n':5},expected='697')],4)
recurrence_task('R04','A changing increment produces a square','(n+1)**2','u+2*n+3',0,1,
 application('<p>Find the least n for which uₙ&gt;225.</p>','<p>The terms (n+1)² increase for n≥0. u₁₄=225 and u₁₅=256, so the strict inequality first holds at n=15.</p>'),[dict(actual='(n+1)**2',subs={'n':14},expected='225'),dict(actual='(n+1)**2',subs={'n':15},expected='256')])
written('R05','recurrences','A bounded increasing rational sequence',r'<p>Let v₁=1 and \(v_{n+1}=(4v_n+6)/(v_n+5)\), n≥1.</p>',[
 (r'<p>Prove by induction that \(1\le v_n&lt;2\) for every n≥1.</p>',r'<p>The base is 1. Assume 1≤vₖ&lt;2. The denominator is positive, and</p>\[v_{k+1}-1=\frac{3v_k+1}{v_k+5}>0,\qquad 2-v_{k+1}=\frac{2(2-v_k)}{v_k+5}>0.\]<p>The next term is defined and satisfies both bounds. Induction establishes the interval for all n≥1.</p>',standard_proof('<p>Both 1≤vₖ₊₁ and vₖ₊₁&lt;2.</p>','1')),
 application('<p>Prove convergence and find the limit.</p>',r'<p>\(v_{n+1}-v_n=(2-v_n)(v_n+3)/(v_n+5)&gt;0\). The sequence increases and is bounded above, so it converges. Its limit satisfies ℓ²+ℓ−6=0. Since ℓ≥1, the limit is 2 rather than −3.</p>',3)],r'<p>1≤vₙ&lt;2 for all n≥1; vₙ increases to 2.</p>','<p>Prove each side of the interval and the denominator sign. Solve the fixed-point equation only after establishing convergence.</p>',dict(kind='interval',rule='(4*u+6)/(u+5)',lower=1,upper=2,initial=1,start=1),difficulty=4)
recurrence_task('R06','Factorials and a second identity','factorial(n+1)','(n+2)*u',0,1,
 application(r'<p>Prove, also by induction, \(\sum_{r=0}^{n}(r+1)u_r=(n+2)!-1\), n≥0.</p>',r'<p>At n=0 the sum is 1=2!−1. Assume the identity at k. The next added term is (k+2)uₖ₊₁=(k+2)(k+2)!. The new total is (k+2)!−1+(k+2)(k+2)!=(k+3)!−1. The base and implication prove the identity for every n≥0.</p>',5),[dict(actual='factorial(n+2)-1+(n+2)*factorial(n+2)',expected='factorial(n+3)-1')],4)
# Replace the application rubric with the five distinct proof requirements.
questions[-1]['parts'][1]['marking_criteria']=standard_proof('<p>(k+3)!−1 after adding (k+2)uₖ₊₁.</p>','0')

def matrix_task(code,title,A,F,app,extras,difficulty=3):
    A=s.Matrix(A);F=s.Matrix([[expr(e) for e in row] for row in F]);Fk=F.subs(n,k);Fn=F.subs(n,k+1)
    formula=display('A^n='+tex(F))
    solution='<p>At n=0 the proposed matrix is I=A⁰. Assume the complete matrix formula at k≥0. Multiplying on the right by A gives</p>'+display('A^{k+1}='+tex(Fk)+tex(A)+'='+tex(s.simplify(Fn)))+'<p>Entrywise multiplication gives the displayed matrix, which is F(k+1). Therefore the base and implication prove the identity for every integer n≥0. An equivalent left-multiplication proof is accepted.</p>'
    written(code,'matrices',title,display('A='+tex(A)),[('<p>Prove by induction for n≥0 that</p>'+formula,solution,standard_proof('<p>Every entry of the proposed matrix at k+1.</p>')),app],formula,'<p>Check A⁰=I. Multiply the complete kth matrix by A, rather than taking powers of entries.</p>',dict(kind='matrix',matrix=[list(row) for row in A.tolist()],formula=[[str(e) for e in row] for row in F.tolist()],start=0),extras,difficulty)
matrix_task('M01','A shear reaches a specified point',[[1,4],[0,1]],[['1','4*n'],['0','1']],
 application(r'<p>Find the non-negative integer n for which \(A^n(2,-1)^T=(-26,-1)^T\).</p>',r'<p>The image is (2−4n,−1)ᵀ, so 2−4n=−26 gives n=7. The second coordinate agrees.</p>'),[dict(actual='2-4*n',subs={'n':7},expected='-26')])
matrix_task('M02','A three-dimensional power with a quadratic entry',[[1,1,0],[0,1,2],[0,0,1]],[['1','n','n*(n-1)'],['0','1','2*n'],['0','0','1']],
 application('<p>Find all non-negative integers n for which the top-right entry of Aⁿ is 72.</p>','<p>n(n−1)=72 gives n=9 or −8. Only n=9 lies in the stipulated domain.</p>'),[dict(actual='n*(n-1)-72',roots=[9,-8])],4)
matrix_task('M03','A symmetric matrix and a complete image',[[2,1],[1,2]],[['(3**n+1)/2','(3**n-1)/2'],['(3**n-1)/2','(3**n+1)/2']],
 application(r'<p>Evaluate \(A^4(5,1)^T\).</p>','<p>A⁴ has diagonal entries 41 and off-diagonal entries 40. The image is (245,241)ᵀ.</p>'),[dict(actual='5*(3**n+1)/2+(3**n-1)/2',subs={'n':4},expected='245'),dict(actual='5*(3**n-1)/2+(3**n+1)/2',subs={'n':4},expected='241')],4)
written('M04','matrices','Paired powers rather than a missing parity class',r'\[Q=\begin{pmatrix}0&-2\\1&0\end{pmatrix}.\]',[
 (r'<p>Prove by induction that Q²ⁿ=(−2)ⁿI and Q²ⁿ⁺¹=(−2)ⁿQ for n≥0.</p>',r'<p>Direct multiplication gives Q²=−2I. At n=0 the claims are Q⁰=I and Q¹=Q. Assume both claims for k. Multiplication by Q²=−2I gives Q²ᵏ⁺²=(−2)ᵏ⁺¹I and Q²ᵏ⁺³=(−2)ᵏ⁺¹Q, the pair at k+1. Thus both formulae hold for every n≥0 by induction.</p>',standard_proof('<p>Both the even and odd formulae at k+1.</p>')),
 application('<p>Find Q¹³.</p>',r'\[Q^{13}=(-2)^6Q=\begin{pmatrix}0&-128\\64&0\end{pmatrix}.\]')],r'<p>Q²ⁿ=(−2)ⁿI, Q²ⁿ⁺¹=(−2)ⁿQ.</p>','<p>Make the even and odd formulae one paired statement. One increment of n multiplies by Q².</p>',dict(kind='matrix_parity',matrix=[[0,-2],[1,0]],scalar=-2),[dict(matrix_power=[[0,-2],[1,0]],exponent=13,expected=[[0,-128],[64,0]])])
written('M05','matrices','A projector controls every power',r'\[P=\frac15\begin{pmatrix}1&2\\2&4\end{pmatrix},\qquad T=I+2P.\]',[
 (r'<p>Verify P²=P, then prove by induction that Tⁿ=I+(3ⁿ−1)P for n≥0.</p>',r'<p>The square of the integer matrix is five times itself, so P²=P. At n=0 the formula gives I. Assuming Tᵏ=I+(3ᵏ−1)P,</p>\[T^{k+1}=(I+(3^k-1)P)(I+2P)=I+\bigl(2+3(3^k-1)\bigr)P=I+(3^{k+1}-1)P.\]<p>The base and implication prove the formula for all n≥0.</p>',[criterion('A1',1,'<p>Compute P²=P.</p>'),*standard_proof('<p>I+(3ᵏ⁺¹−1)P using P²=P.</p>')]),
 application(r'<p>Describe all vectors fixed by T, and find Tⁿ(1,2)ᵀ.</p>',r'<p>Tv=v means Pv=0, giving x+2y=0, or v=t(2,−1)ᵀ with t real. Since P(1,2)ᵀ=(1,2)ᵀ, its image under Tⁿ is 3ⁿ(1,2)ᵀ.</p>',3)],r'<p>Tⁿ=I+(3ⁿ−1)P; fixed vectors t(2,−1)ᵀ; Tⁿ(1,2)ᵀ=3ⁿ(1,2)ᵀ.</p>','<p>Compute P² first and use it to simplify the product. Fixed vectors and the projected direction behave differently.</p>',dict(kind='projector',matrix=[['1/5','2/5'],['2/5','4/5']],factor=2),difficulty=4)
written('M06','matrices','A parameter that may vanish',r'\[N=\begin{pmatrix}0&t\\0&0\end{pmatrix},\qquad B=2I+N,\qquad t\in\mathbb R.\]',[
 (r'<p>Prove by induction that Bⁿ=2ⁿI+n2ⁿ⁻¹N for every integer n≥1 and every real t. Explain the case t=0.</p>',r'<p>N²=0 for every t. At n=1 the formula is B=2I+N. Assume it for k≥1. Then</p>\[B^{k+1}=(2^kI+k2^{k-1}N)(2I+N)=2^{k+1}I+(k+1)2^kN.\]<p>No division by t was used. At t=0 it gives (2I)ⁿ=2ⁿI, so the exceptional parameter is included. The base and implication prove the identity for all n≥1 and all real t.</p>',standard_proof('<p>2ᵏ⁺¹I+(k+1)2ᵏN, including t=0.</p>','1')),
 application('<p>The top-right entry of B⁵ is 240. Find t.</p>','<p>The entry is 5·2⁴t=80t, so t=3.</p>')],r'<p>Bⁿ=2ⁿI+n2ⁿ⁻¹N for n≥1; t=3.</p>','<p>N² vanishes even when t=0. Do not divide by t in a proof that must cover all real parameters.</p>',dict(kind='matrix',matrix=[['2','t'],['0','2']],formula=[['2**n','n*2**(n-1)*t'],['0','2**n']],start=1),[dict(actual='5*2**4*t',subs={'t':3},expected='240')],4)

def divisibility_task(code,title,f,d,a,R,app,extras,difficulty=3):
    F=expr(f);rem=expr(R);nextF=tex(F.subs(n,k+1));fk=tex(F.subs(n,k));rk=tex(rem.subs(n,k))
    solution=f'<p>Put f(n)={math(F)}. At n=0 its value is {tex(F.subs(n,0))}, a multiple of {d}. Assume f(k)={d}q for an integer q. Then</p>'+display('f(k+1)='+str(a)+'f(k)+'+rk)+f'<p>The remainder {math(rem)} is divisible by {d} for every non-negative integer n. Thus f(k+1) is {d} times an integer. The base and implication establish the claim for every n≥0.</p>'
    written(code,'divisibility',title,'<p>All indices below are non-negative integers.</p>',[(f'<p>Prove by induction that {d} divides '+math(F)+'.</p>',solution,standard_proof('<p>An explicit integer multiple of '+str(d)+'.</p>')),app],f'<p>{d} divides '+math(F)+' for every n≥0.</p>','<p>Express f(k+1) as an integer multiple of f(k), plus a remainder whose divisibility you justify.</p>',dict(kind='divisibility',function=f,divisor=d,multiplier=a,remainder=R,start=0),extras,difficulty)
divisibility_task('V01','An integer quotient has its own recurrence','7**n-2**n',5,7,'5*2**n',
 application(r'<p>Define qₙ=(7ⁿ−2ⁿ)/5. Derive its recurrence and use it to find q₃.</p>',r'<p>q₀=0 and qₙ₊₁=7qₙ+2ⁿ. This gives q₁=1, q₂=9 and q₃=67.</p>',3),[dict(actual='(7**n-2**n)/5',subs={'n':3},expected='67')])
divisibility_task('V02','A consecutive-product factor in a polynomial step','n**3+5*n',6,1,'3*n*(n+1)+6',
 application('<p>Can n³+5n+2 be divisible by 6 for any non-negative integer n? Justify your answer.</p>','<p>No. The proved result shows n³+5n+2 has residue 2 modulo 6 for every n≥0, so it is never divisible by 6.</p>'),[],4)
# Explain the factor of two explicitly rather than merely asserting divisibility.
questions[-1]['solution_html']=questions[-1]['solution_html'].replace('The remainder', 'The product k(k+1) is even because one of two consecutive integers is even. Consequently 3k(k+1) is divisible by 6, as is 6. The remainder')
divisibility_task('V03','An exponential quotient stays odd','4**(2*n+1)+3**(n+2)',13,3,'13*4**(2*n+1)',
 application(r'<p>Show that the integer qₙ=(4²ⁿ⁺¹+3ⁿ⁺²)/13 is odd for every n≥0.</p>',r'<p>q₀=1. The transition gives qₙ₊₁=3qₙ+4²ⁿ⁺¹. If qₖ is odd, 3qₖ is odd and 4²ᵏ⁺¹ is even, so qₖ₊₁ is odd. The base and implication prove the claim for all n≥0.</p>',4),[dict(actual='(4**(2*n+1)+3**(n+2))/13',subs={'n':0},expected='1')],4)
questions[-1]['parts'][1]['marking_criteria']=[criterion('A1',1,'<p>q₀=1 is odd.</p>'),criterion('M1',1,'<p>Use qₖ₊₁=3qₖ+4²ᵏ⁺¹ under the hypothesis that qₖ is odd.</p>'),criterion('A1',1,'<p>Explain odd plus even is odd, including 4²ᵏ⁺¹ even for k≥0.</p>'),criterion('A1',1,'<p>Conclude by induction for every n≥0.</p>')]
divisibility_task('V04','All three prime factors must be justified','n**5-n',30,1,'5*n*(n+1)*(n**2+n+1)',
 application(r'<p>Show that (n⁵+29n)/30 is an integer for every n≥0.</p>',r'<p>(n⁵+29n)/30=(n⁵−n)/30+n. Both summands are integers by the proved result.</p>'),[],5)
questions[-1]['solution_html']=questions[-1]['solution_html'].replace('The remainder', 'The product k(k+1) is even. Modulo 3, if k is 0 or 2 then k(k+1) supplies a factor of 3; if k is 1 then k²+k+1 supplies it. Thus k(k+1)(k²+k+1) is divisible by 6, and five times it is divisible by 30. The remainder')
divisibility_task('V05','An exponential correction follows triangular-number parity','5**n-1-4*n',16,5,'16*n',
 application(r'<p>For qₙ=(5ⁿ−1−4n)/16 prove that qₙ has the same parity as n(n−1)/2.</p>',r'<p>Both are integers: n(n−1) is even. At n=0 both are 0. The quotient recurrence is qₙ₊₁=5qₙ+n. Put Tₙ=n(n−1)/2, so Tₙ₊₁=Tₙ+n. If qₖ−Tₖ is even, then qₖ₊₁−Tₖ₊₁=5(qₖ−Tₖ)+4Tₖ is even. Induction proves equal parity for all n≥0.</p>',4),[],4)
questions[-1]['parts'][1]['marking_criteria']=[criterion('A1',1,'<p>Check q₀=T₀=0 and the integrality of Tₙ=n(n−1)/2.</p>'),criterion('M1',1,'<p>Derive qₖ₊₁=5qₖ+k and Tₖ₊₁=Tₖ+k.</p>'),criterion('A1',1,'<p>Use qₖ₊₁−Tₖ₊₁=5(qₖ−Tₖ)+4Tₖ, which is even under the hypothesis.</p>'),criterion('A1',1,'<p>Conclude by induction for all n≥0.</p>')]
written('V06','divisibility','A residue identifies exactly which indices work',r'<p>Consider the claim that 25 divides 6ⁿ−1 for every positive integer n.</p>',[
 (r'<p>Disprove the claim, then prove by induction that 6ⁿ≡1+5n (mod 25) for all n≥0.</p>',r'<p>At n=1, 6−1=5 is not divisible by 25. The corrected residue statement has base 6⁰=1. Assume 6ᵏ=1+5k+25q for integer q. Then</p>\[6^{k+1}=6+30k+150q=1+5(k+1)+25(k+6q).\]<p>The remainder is an integer multiple of 25, so the next residue holds. Induction establishes the residue for all n≥0.</p>',[criterion('A1',1,'<p>Counterexample n=1 gives 5, not divisible by 25.</p>'),*standard_proof('<p>1+5(k+1)+25 times an integer.</p>')]),
 application('<p>Determine every n≥0 for which 25 divides 6ⁿ−1.</p>','<p>The residue is 5n modulo 25. Thus 25 divides 6ⁿ−1 exactly when 5 divides n, including n=0.</p>')],r'<p>The original claim fails at n=1. Precisely n≡0 (mod 5) works.</p>','<p>Prove a residue statement rather than a false universal divisibility claim. Keep the integer witness in the transition.</p>',dict(kind='congruence',function='6**n',residue='1+5*n',divisor=25,multiplier=6,start=0),difficulty=4)

quick_models=[]
def field(key,label,value,kind='number',**kw):return dict(key=key,label=label,type=kind,expected=str(value),**kw)
def quick(topic,code,family,v,title,prompt,fields,solution,model):
    uid=f'M4U-9231-IN-Q-{code}{family}{v}';family_uid=f'M4U-9231-IN-Q-{code}{family}'
    ans=[]
    for f in fields:
        value=html.escape(f['options'][f['expected']]) if f['type']=='choice' else math(f['expected'])
        ans.append(html.escape(f['label'])+': '+value)
    questions.append(dict(id=uid,family_uid=family_uid,lesson=topic,title=title,collection='short' if v==1 else 'variant',prompt_html=prompt,answer_html='<p>'+'; '.join(ans)+'</p>',solution_html=solution,hint_html='<p>Identify the exact starting case and next index. Work from the assumed case towards the target; include every requested component.</p>',marks=len(fields),difficulty=2 if family<3 else 3,fields=fields,parts=[dict(label='',marking_criteria=[criterion('A1',1,'<p>Give the complete correct '+html.escape(f['label'].lower())+'.</p>') for f in fields])],verification=uid))
    quick_models.append(dict(id=uid,kind_group='quick',model=model))
for v,(a,b) in enumerate([(5,-2),(3,2)],1):
    F=n*(a*n+a+2*b)/2
    quick('sums','S',1,v,'The whole next target',r'<p>For \(S_n=\sum_{r=1}^n('+str(a)+'r'+('+' if b>=0 else '')+str(b)+r')\), the proposed formula is '+math(F)+r'. Enter the new term and the complete right side for P(k+1), as polynomials in k.</p>',[field('term','New term',a*(k+1)+b,'polynomial',variables=['k']),field('target','Next right side',s.expand(F.subs(n,k+1)),'polynomial',variables=['k'])],'<p>Replace r by k+1 only in the added term, and replace every n in F(n) by k+1. Their roles are different.</p>',dict(kind='sum_bridge',a=a,b=b))
for v,(start,c) in enumerate([(2,5),(3,1)],1):
    F=s.expand(s.summation(2*r+c,(r,start,n)));value=2*start+c
    quick('sums','S',2,v,'Start where the sum starts',r'<p>Consider \(\sum_{r='+str(start)+r'}^n(2r+'+str(c)+r')='+tex(F)+r'\), for n≥'+str(start)+r'. Give the base index, the common value of both sides there, and F(k+1)−F(k).</p>',[field('base','Base index',start),field('value','Common base value',value),field('difference','Difference polynomial',2*(k+1)+c,'polynomial',variables=['k'])],'<p>The base sum has one term. Subtract the two right-side formulae to recover the next added term.</p>',dict(kind='sum_base',lower=start,c=c,formula=str(F)))
for v,first in enumerate([3,4],1):
    wrong=n**2+s.prod(n-i for i in range(1,first))
    quick('sums','S',3,v,'A first counterexample',r'<p>A proposed formula for \(\sum_{r=1}^n(2r-1)\) is '+math(wrong)+r'. Give the first failing positive index, the actual sum there, and the proposed value.</p>',[field('first','First failing index',first),field('actual','Actual sum',first**2),field('claimed','Proposed value',wrong.subs(n,first))],'<p>The extra product vanishes at every earlier positive index. At the next index it is non-zero; compare both values.</p>',dict(kind='sum_failure',false=str(wrong),first=first))

for v,(a,b,c) in enumerate([(3,6,2),(2,-3,5)],1):
    quick('derivatives','D',1,v,'All coefficients in a product-rule formula',r'<p>For \(y=('+str(a)+'x'+('+' if b>=0 else '')+str(b)+r')e^{'+str(c)+r'x}\), write \(D^ky='+str(c)+r'^ke^{'+str(c)+r'x}(Ax+Bk+C)\). Give all three constants.</p>',[field('A','Coefficient A',a),field('B','Coefficient B',s.Rational(a,c)),field('C','Constant C',b)],'<p>The product rule adds a/c to the bracket at each derivative. The original polynomial supplies A and C.</p>',dict(kind='exp_coefficients',a=a,b=b,c=c))
for v,(a,b,order) in enumerate([(2,3,3),(3,-1,4)],1):
    coef=(-1)**order*s.factorial(order)*a**order
    quick('derivatives','D',2,v,'A complete reciprocal derivative',r'<p>For \(y=1/('+str(a)+'x'+('+' if b>=0 else '')+str(b)+r')\), write \(D^{'+str(order)+r'}y=C/('+str(a)+'x'+('+' if b>=0 else '')+str(b)+r')^p\). Give the signed coefficient C and the power p.</p>',[field('coef','Signed coefficient C',coef),field('power','Denominator power p',order+1)],'<p>Each differentiation contributes the current negative exponent and the inner coefficient. Retain the full signed numerator.</p>',dict(kind='reciprocal_coefficients',a=a,b=b,order=order))
for v,(freq,function) in enumerate([(3,'cos'),(5,'sin')],1):
    quick('derivatives','D',3,v,'Advance an even-order statement',r'<p>Let \(y='+function+'('+str(freq)+r'x)\). In \(D^{2k}y=A^ky\), give A and the number of differentiations that advances k to k+1.</p>',[field('factor','Multiplier A',-freq**2),field('count','Number of differentiations',2)],'<p>Two derivatives contribute the negative square of the frequency. The next index is order 2k+2.</p>',dict(kind='even_derivative',frequency=freq,function=function))

for v,(initial,a,b) in enumerate([(3,4,6),(2,3,8)],1):
    L=s.Rational(-b,a-1);C=initial-L
    quick('recurrences','R',1,v,'The complete affine closed form',f'<p>Let u₀={initial} and uₙ₊₁={a}uₙ+{b}. In the formula uₙ=L+C·{a}ⁿ, give both constants L and C.</p>',[field('limit','Constant L',L),field('coefficient','Coefficient C',C)],'<p>Match the constant part L=aL+b, then use L+C=u₀. This supplies a candidate for an induction proof.</p>',dict(kind='affine_coefficients',initial=initial,a=a,b=b))
for v,(L,c) in enumerate([(2,4),(3,5)],1):
    a=L+1;b=L*(c-1)
    quick('recurrences','R',2,v,'Expose the invariant gap',r'<p>For \(f(u)=('+str(a)+'u+'+str(b)+r')/(u+'+str(c)+r')\), write \('+str(L)+r'-f(u)=(Au+B)/(u+C)\). Give all constants; these support the upper bound when 0&lt;u&lt;'+str(L)+'.</p>',[field('A','Coefficient A',-1),field('B','Constant B',L),field('C','Denominator shift C',c)],'<p>Use the same denominator and subtract the numerator. On the stated interval the resulting numerator and denominator are positive.</p>',dict(kind='gap_coefficients',upper=L,a=a,b=b,c=c))
for v,(a,b) in enumerate([(2,3),(2,5)],1):
    quick('recurrences','R',3,v,'Supply both initial cases and both recurrence coefficients',r'<p>The candidate \(u_n='+str(a)+'^n+'+str(b)+r'^n\) satisfies \(u_{n+2}=Au_{n+1}+Bu_n\). Give u₀, u₁, A and B.</p>',[field('u0','Initial value u0',2),field('u1','Initial value u1',a+b),field('A','Recurrence coefficient A',a+b),field('B','Recurrence coefficient B',-a*b)],'<p>Check indices 0 and 1. Each exponential base must satisfy z²=Az+B, giving A=a+b and B=−ab.</p>',dict(kind='second_coefficients',roots=[a,b]))

for v,(Nmat,c) in enumerate([([[1,-1],[1,-1]],3),([[2,-4],[1,-2]],2)],1):
    M=s.Matrix(Nmat);F=s.eye(2)+c*k*M
    quick('matrices','M',1,v,'Every entry of a nilpotent power',display('N='+tex(M)+r',\quad A=I+'+str(c)+r'N,\quad N^2=0.')+r'<p>Enter all four entries of Aᵏ as polynomials in k, for k≥0.</p>',[field(f'm{i}{j}',f'Entry {i+1},{j+1}',F[i,j],'polynomial',variables=['k']) for i in range(2) for j in range(2)],'<p>Use Aᵏ=I+ckN. Add the identity only on the diagonal; preserve every sign.</p>',dict(kind='nilpotent_quick',matrix=Nmat,c=c))
for v,(a,b) in enumerate([(2,3),(3,2)],1):
    quick('matrices','M',2,v,'All changing entries of a 3 by 3 power',display(r'A=\begin{pmatrix}1&'+str(a)+r'&0\\0&1&'+str(b)+r'\\0&0&1\end{pmatrix}.')+r'<p>Aᵏ has diagonal entries 1 and entries below the diagonal 0. Give its three entries above the diagonal as polynomials in k.</p>',[field('a12','Entry 1,2',a*k,'polynomial',variables=['k']),field('a13','Entry 1,3',s.Rational(a*b,2)*k*(k-1),'polynomial',variables=['k']),field('a23','Entry 2,3',b*k,'polynomial',variables=['k'])],'<p>The two adjacent entries grow linearly; their interaction contributes ab·k(k−1)/2 to the top-right entry.</p>',dict(kind='jordan_quick',a=a,b=b))
for v,(A,order) in enumerate([([[0,-3],[2,0]],5),([[0,2],[-1,0]],7)],1):
    F=s.Matrix(A)**order
    quick('matrices','M',3,v,'A full odd power from a scalar square',display('A='+tex(s.Matrix(A)))+f'<p>Give all four entries of A<sup>{order}</sup>.</p>',[field(f'm{i}{j}',f'Entry {i+1},{j+1}',F[i,j]) for i in range(2) for j in range(2)],'<p>Calculate A²=cI, then write the odd exponent as 2q+1. The result is cᑫA, not cᑫI.</p>',dict(kind='fixed_matrix_power',matrix=A,order=order))

for v,(a,b) in enumerate([(7,3),(5,2)],1):
    quick('divisibility','V',1,v,'An integer bridge for exponential differences',r'<p>Let \(f(n)='+str(a)+'^n-'+str(b)+r'^n\). Write \(f(k+1)=Af(k)+B\cdot'+str(b)+r'^k\). Give A, B and f(0).</p>',[field('A','Multiplier A',a),field('B','Remainder coefficient B',a-b),field('base','Base value f0',0)],'<p>Multiply f(k) by the first exponential base; subtract to expose the second exponential and its integer coefficient.</p>',dict(kind='divisibility_bridge',a=a,b=b))
for v,(f,d) in enumerate([('(n+1)*(n+2)*(n+3)',6),('2*n**3+n',3)],1):
    Q=s.expand((expr(f).subs(n,k+1)-expr(f).subs(n,k))/d)
    quick('divisibility','V',2,v,'The whole quotient in a polynomial step',r'<p>For \(f(n)='+tex(expr(f))+r'\), find Q(k) in \(f(k+1)-f(k)='+str(d)+r'Q(k)\). Enter the complete polynomial in k.</p>',[field('quotient','Quotient polynomial',Q,'polynomial',variables=['k'])],'<p>Expand the difference before dividing by the stated divisor. A product of consecutive integers supplies the factor 2 when needed.</p>',dict(kind='polynomial_quotient',function=f,divisor=d))
for v,p in enumerate([3,5],1):
    a=p+1
    quick('divisibility','V',3,v,'The first zero residue',r'<p>Induction gives \('+str(a)+r'^n\equiv1+'+str(p)+r'n\pmod{'+str(p*p)+r'}\). Find the least positive n with '+str(p*p)+' dividing '+str(a)+r'ⁿ−1, and the integer quotient at that n.</p>',[field('index','Least positive index',p),field('quotient','Integer quotient',(a**p-1)//(p*p))],f'<p>The residue is {p}n, so n must be a multiple of {p}. Use the first positive such n and evaluate the complete quotient.</p>',dict(kind='first_residue',p=p))

choices={
 'sums':[
  ('A valid forward implication',r'<p>Which completes the step for Sₙ=F(n)?</p>',{'A':'Assume S(k)=F(k), then show F(k)+t(k+1)=F(k+1).','B':'Assume S(k+1)=F(k+1), then rearrange it.','C':'Check another twenty values.','D':'Replace every k in the hypothesis by k+1 and declare it proved.'},'A','<p>Only A derives the next claim from the stated hypothesis and the new term.</p>'),
  ('A base case is still needed','<p>A valid implication P(k)⇒P(k+1) is established for k≥4. Which additional fact proves P(n) for every n≥4?</p>',{'A':'P(3) is false.','B':'P(4) is true.','C':'P(100) is true.','D':'No extra fact is needed.'},'B','<p>P(4) starts the chain at its permitted first transition; a later isolated case does not establish earlier cases.</p>')],
 'derivatives':[
  ('Count the operations','<p>P(k) describes the derivative of order 2k. How is the derivative in P(k+1) reached?</p>',{'A':'Differentiate once.','B':'Integrate once.','C':'Differentiate twice.','D':'Replace x by x+1.'},'C','<p>2(k+1)−2k=2, so two differentiations are required.</p>'),
  ('Choose a defined starting case',r'<p>A proposed nth derivative contains (n−1)!. Which is the earliest usual base index for integer derivative orders?</p>',{'A':'n=−1','B':'n=0 without changing the formula','C':'Any real n','D':'n=1'},'D','<p>(n−1)! is defined in the usual factorial notation at n=1; n=0 would introduce (−1)!.</p>')],
 'recurrences':[
  ('Enough initial information','<p>A general second-order recurrence uses uₙ and uₙ₊₁ to obtain uₙ₊₂. Which proof scheme is sufficient?</p>',{'A':'Check only u0, then assume only the k case.','B':'Check u0 and u1, assume the k and k+1 cases, derive k+2.','C':'Check u20 and make no implication.','D':'Assume the desired formula at k+2.'},'B','<p>Both initial cases and the paired implication carry every later term.</p>'),
  ('Bounds and a rational map',r'<p>To show \(0&lt;u_{k+1}&lt;2\) for a rational recurrence, which step must precede multiplying an inequality by its denominator?</p>',{'A':'Establish the denominator is non-zero and determine its sign from the hypothesis.','B':'Assume all denominators are positive.','C':'Discard the denominator.','D':'Replace the denominator with its limit.'},'A','<p>The sign controls the inequality direction, and a zero denominator would make the next term undefined.</p>')],
 'matrices':[
  ('The next power is a product','<p>Assuming Aᵏ=F(k), which is always valid for a square matrix A?</p>',{'A':'A^(k+1) is the entrywise square of F(k).','B':'A^(k+1)=F(k)+A.','C':'A^(k+1)=F(k)A.','D':'A^(k+1)=F(k)F(k).'},'C','<p>AᵏA=Aᵏ⁺¹. The full matrix product must be calculated.</p>'),
  ('A tempting generalisation','<p>Which statement requires an extra commutativity condition and cannot be assumed for arbitrary square matrices?</p>',{'A':'A^0=I.','B':'A^k A=A^(k+1).','C':'A^2 A^k=A^(k+2).','D':'(AB)^n=A^n B^n for every n.'},'D','<p>General A and B need not commute; a proof cannot move B past A without justification.</p>')],
 'divisibility':[
  ('The integer witness','<p>Assume f(k)=7q with q integer. Which next expression guarantees divisibility by 7 for all integer k?</p>',{'A':'f(k+1)=7q+1.','B':'f(k+1)=3f(k)+7k².','C':'f(k+1)=f(k)/2.','D':'f(k+1)=q+7.'},'B','<p>The expression is 7(3q+k²), and the bracket is an integer.</p>'),
  ('The correct next odd index','<p>A statement is to be proved for every positive odd n, starting at 1. Which transition covers that domain?</p>',{'A':'P(k)⇒P(k+2) for each positive odd k.','B':'P(k)⇒P(k+1) but only when k is even, with no even base.','C':'P(1) only.','D':'P(k+2)⇒P(k) with no later base.'},'A','<p>A step of two from the odd base visits exactly the positive odd indices.</p>')]
}
for topic,items in choices.items():
    for v,(title,prompt,options,correct,solution) in enumerate(items,1):
        quick(topic,{'sums':'S','derivatives':'D','recurrences':'R','matrices':'M','divisibility':'V'}[topic],4,v,title,prompt,[field('reason','Reason',correct,'choice',options=options)],solution,dict(kind='logic',answer=correct,reason=solution))

for q in questions:
    assert sum(c['marks'] for p in q['parts'] for c in p['marking_criteria'])==q['marks'],q['id']
assert len(questions)==70
assert sum(len(l['examples']) for l in lessons)==20
assert len(models)==30 and len(quick_models)==40
# Turn prose shorthand into real formulae; never rewrite existing TeX or HTML attributes.
sup='⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁽⁾ⁿᵏˣ';sub='₀₁₂₃₄₅₆₇₈₉₊₋₍₎ₙₖᵣ'
supmap=str.maketrans(sup,'0123456789+-()nkx');submap=str.maketrans(sub,'0123456789+-()nkr')
token=re.compile(r'[A-Za-z0-9ℓπ√′″‴'+sup+sub+r'()=+−·/!≥≤⇒]+')
def professional(value):
    chunks=re.split(r'(<[^>]*>|\\\(.*?\\\)|\\\[.*?\\\])',value,flags=re.S)
    def convert(match):
        word=match.group()
        if not any(c in word for c in sup+sub+'√′″‴≥≤⇒ℓπ'):return word
        word=re.sub('['+sup+']+',lambda m:'^{'+m.group().translate(supmap)+'}',word)
        word=re.sub('['+sub+']+',lambda m:'_{'+m.group().translate(submap)+'}',word)
        word=re.sub(r'√([A-Za-z0-9]+)',r'\\sqrt{\1}',word)
        for a,b in [('−','-'),('·',r'\cdot '),('≥',r'\ge '),('≤',r'\le '),('⇒',r'\Rightarrow '),('ℓ',r'\ell '),('π',r'\pi '),('′',"'"),('″',"''"),('‴',"'''")]:word=word.replace(a,b)
        return r'\('+word+r'\)'
    return ''.join(c if i%2 else token.sub(convert,c) for i,c in enumerate(chunks))
for l in lessons:
    for name in ['before','ideas','method']:l[name]=professional(l[name])
    l['mistakes']=[professional(m) for m in l['mistakes']]
    for e in l['examples']:
        for name in ['question','solution']:e[name]=professional(e[name])
for q in questions:
    for name in ['prompt_html','answer_html','solution_html','hint_html']:q[name]=professional(q[name])
    for part in q['parts']:
        for c in part['marking_criteria']:c['description_html']=professional(c['description_html'])
for model in quick_models:
    if model['model']['kind']=='logic':model['model']['reason']=professional(model['model']['reason'])
all_models=models+quick_models
for m in all_models:m['contentSha256']=digest(next(q for q in questions if q['id']==m['id']))
example_binding=[]
for lesson_ in lessons:
    for e in lesson_['examples']:
        example_binding.append({**next(m for m in example_models if m['id']==e['verification']),'contentSha256':digest(e)})
brief={'scope':'9231 FP1 chapter 7 only; original authored tasks, no archive or examination question imported.','sequence':['7.1 induction framework and finite sums','7.1 repeated differentiation','7.1 recurrences and bounds','7.1 matrix powers','7.2 divisibility'],'writtenPerLesson':6,'examplesPerLesson':4,'quickPerLesson':8}
source_sha=hashlib.sha256(json.dumps(brief,sort_keys=True).encode()).hexdigest()
package=dict(schema_version=1,key='9231-fp1-induction',version='1.0.2',course=dict(slug='maths4u-9231-fp1',title='Further Pure Mathematics 1 (9231)',code='9231',direction='further'),chapter=dict(id='fp1_induction',slug='proof-by-induction',title='Proof by induction',position=6),source=dict(sha256=source_sha,supplied=0,held=[]),lessons=lessons,questions=questions,marking_status='DRAFT')
def write(path,value):Path(path).write_text(json.dumps(value,ensure_ascii=False,indent=2,default=str)+'\n',encoding='utf8')
write('content/original/9231-fp1/induction-v1.json',package)
write('content/original/9231-fp1/induction-verification-v1.json',dict(brief=brief,questions=all_models,examples=example_binding,teachingDigests={l['id']:digest(l) for l in lessons}))
write('docs/ARENA-C3-INDUCTION-SOURCE-AUDIT-20261106.json',dict(version=package['version'],sourceSha256=source_sha,authoringBrief=brief,book=dict(path='D:/new_books/furhter_cambridge.pdf',pdfPages=[152,160],printedPages=[140,148],sections=['7.1','7.2'],use='Mathematical sequence only; no textbook or examination questions, examples, text or images copied.'),editorialRevisions=[dict(previous='1.0.0',current='1.0.1',reason='Final visual source comparison found coincident standard formulae in the textbook exercises; independently replace those examples and question variants before owner preview. Keep the initial local versions and QA progress.',examples=['E-V2','E-V3'],questions=['M4U-9231-IN-E-V05','M4U-9231-IN-Q-V21','M4U-9231-IN-Q-V22']),dict(previous='1.0.1',current='1.0.2',reason='Correct the intermediate expansion in example E-S3; the final inequality was valid. Add an exact equality check of the printed decomposition. Preserve all earlier local versions.',examples=['E-S3'],questions=[])],rows=[dict(uid=q['id'],lesson=q['lesson'],collection=q['collection'],marks=q['marks'],origin='independently-authored',archiveLink=None,contentSha256=digest(q)) for q in questions],supplied=0,newWritten=30,newQuick=40,held=[]))
print(json.dumps(dict(lessons=len(lessons),examples=20,written=30,quick=40,marks=sum(q['marks'] for q in questions))))
