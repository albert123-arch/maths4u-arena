"""Independent 9709 P1 Series explanations, examples and exact-answer practice."""
import sympy as s
n=s.Symbol('n',integer=True,positive=True)
lessons,questions,models=[],[],[]
def tex(v):return s.latex(s.sympify(str(v),locals={'n':n}))
def math(v):return r'\('+tex(v)+r'\)'
def image(name,alt):return '<p><img src="/assets/original/series/'+name+'.svg" alt="'+alt+'"></p>'
def ex(title,question,solution,key):return dict(title=title,question=question,solution=solution,verification=key)
def lesson(key,suffix,title,summary,objective,before,ideas,method,mistakes,examples):
 lessons.append(dict(key=key,id='orig_series_'+suffix,title=title,summary=summary,objective=objective,before=before,ideas=ideas,method=method,mistakes=mistakes,examples=examples))
def ap(a,d,k):return a+(k-1)*d
def ap_sum(a,d,k):return s.Rational(k,2)*(2*a+(k-1)*d)
def gp_sum(a,r,k):return a*k if r==1 else s.simplify(a*(1-r**k)/(1-r))

lesson('arithmetic','arithmetic','Arithmetic progressions: terms, sums and integer indices',
 'Distinguish a term from a prefix sum, reconstruct an AP and verify the first permitted integer index.',
 'Use arithmetic term and sum formulas, recover parameters and solve finite-index conditions without rounding away a boundary.',
 '<p>Recall linear equations, factorisation, quadratic inequalities and positive integer indices.</p>',
 r'''<h3>Terms have equal differences</h3><p>Write a for the first term and d for the common difference. There are n−1 steps from the first term to the nth:</p>\[u_n=a+(n-1)d.\]<p>The difference can be positive, negative or zero. The sequence is defined at integer indices; the plotted points are not a continuous curve.</p>'''+image('arithmetic-terms','A discrete arithmetic sequence with a constant difference')+r'''
 <h3>A sum is not a term</h3><p>Pair the first and last terms of a finite AP to obtain</p>\[S_n=\frac n2(a+u_n)\]\[=\frac n2\bigl(2a+(n-1)d\bigr).\]<p>Conversely, \(u_n=S_n-S_{n-1}\), taking S₀=0. A block from term p through term q has q−p+1 terms and sum \(S_q-S_{p-1}\).</p>
 <h3>Use index gaps and original conditions</h3>\[u_j-u_i=(j-i)d.\]<p>Use this to recover d and then a. A quadratic equation for a number of terms may have two algebraic roots; retain only positive integers satisfying the original condition.</p>
 <h3>Thresholds need an integer check</h3><p>For a least-index problem, identify the valid integer range, then check the proposed first index and the preceding one. Establish monotonicity where you use it; an AP of terms does not automatically make every prefix sum increasing.</p>''',
 '<ol><li>Separate the term index, number of terms and any prefix or block sum.</li><li>Write equations in a and d before substituting.</li><li>Solve algebraically, retaining positive integer indices.</li><li>Check the original condition, strictness and the neighbouring index when finding a first or last value.</li></ol><p>The written questions combine methods from across this chapter; introductory skills are practised separately below.</p>',
 ['Use n−1 increments for the nth term.', 'The next k terms have sum S₂ₖ−Sₖ, not S₂ₖ.', 'Do not round a quadratic root to an index without checking.', 'Strict inequalities can exclude an exact boundary sum.'],[
 ex('Two observations determine every term',r'<p>An AP has \(u_4=13\) and \(u_9=33\). Find a, d and \(u_{20}\).</p>',r'\[5d=33-13=20,\qquad d=4.\]\[a+3(4)=13\ \Rightarrow\ a=1.\]<p>Therefore \(u_{20}=1+19(4)=77\). Substitution also recovers both supplied terms.</p>','SR-AP-PARAMETERS'),
 ex('A block starts after a prefix',r'<p>An AP has a=6 and d=3. Find S₁₂ and the sum of terms 6 through 12.</p>',r'\[S_{12}=\frac{12}{2}\bigl(12+11(3)\bigr)=270.\]\[S_5=\frac52(12+4(3))=60.\]<p>The requested block has seven terms, and its sum is S₁₂−S₅=210. Its endpoints 21 and 39 give the independent check 7(21+39)/2=210.</p>','SR-AP-BLOCK'),
 ex('Recover terms from a sum formula',r'<p>The prefix sums satisfy \(S_n=3n^2-2n\). Find uₙ, a and d.</p>',r'\[u_n=(3n^2-2n)-\bigl(3(n-1)^2-2(n-1)\bigr)\]\[=6n-5.\]<p>Thus a=u₁=1 and d=6. The formula also gives u₁=S₁−S₀=1, so no first-term exception is introduced.</p>','SR-SUM-TO-TERM'),
 ex('A first index must survive the neighbouring check',r'<p>An AP has a=5 and d=3. Find the least positive n for which Sₙ&gt;100.</p>',r'\[S_n=\frac{n(3n+7)}2.\]<p>The positive root of 3n²+7n−200=0 lies strictly between 7 and 8. Every term is positive, so the prefix sums increase.</p>\[S_7=98\le100,\qquad S_8=124>100.\]<p>The least index is n=8.</p>','SR-INTEGER-THRESHOLD')])

lesson('geometric','geometric','Geometric progressions: finite sums and convergence',
 'Recover a ratio without losing its sign, separate finite sums from limits and interpret a signed remainder.',
 'Use GP terms and finite sums, handle the constant-ratio-one case and decide when an ordinary infinite sum exists.',
 '<p>Recall powers, ratios, exact fractions and equations with two possible signs.</p>',
 r'''<h3>A fixed ratio multiplies successive terms</h3>\[u_n=ar^{n-1}.\]<p>A negative r makes nonzero terms alternate in sign. If an even power of r is known, consider both real signs and pair each ratio with its corresponding first term.</p>'''+image('geometric-terms','An alternating geometric progression with ratio minus one half')+r'''
 <h3>A finite sum has no convergence requirement</h3>\[S_n=\frac{a(1-r^n)}{1-r}\quad(r\ne1).\]<p>This follows by subtracting rSₙ from Sₙ. For r=1 use Sₙ=na directly. A finite sum can exist when |r|≥1; do not use the infinite-sum formula for it.</p>
 <h3>A nonzero GP has an ordinary sum to infinity only when |r|&lt;1</h3>\[S_\infty=\frac a{1-r}.\]<p>The terms must tend to zero, and rⁿ must vanish. In particular, r=1 does not give a finite limit and r=−1 does not acquire a sum just because adjacent terms cancel.</p>'''+image('partial-sums','Positive-ratio partial sums approach their limit from below')+r'''
 <h3>A remainder can be negative</h3>\[R_n=S_\infty-S_n=\frac{ar^n}{1-r}.\]<p>This is the signed sum of the terms after uₙ. If an error magnitude is requested, use |Rₙ|. A negative ratio can make the finite sums overshoot and undershoot the limit alternately.</p>''',
 '<ol><li>State a, r and the first included index.</li><li>For a finite sum, use the r≠1 formula or the separate r=1 case.</li><li>Before using an infinite sum, establish |r|&lt;1 for the actual progression.</li><li>Check signs, paired parameter cases and whether a remainder or its magnitude was requested.</li></ol>',
 ['Do not assume r is positive after solving r².', 'A finite sum does not require |r|<1.', 'The ordinary sum diverges for a nonzero GP with r=−1.', 'The remainder begins with uₙ₊₁, not uₙ.'],[
 ex('An alternating finite sum',r'<p>A GP has a=6 and \(r=-\frac12\). Find u₅ and S₅.</p>',r'\[u_5=6\left(-\frac12\right)^4=\frac38.\]\[S_5=\frac{6\left(1-(-\frac12)^5\right)}{1+\frac12}=\frac{33}{8}.\]<p>Direct addition of \(6,-3,\frac32,-\frac34,\frac38\) gives the same result.</p>','SR-ALTERNATING'),
 ex('Both signs give different progressions',r'<p>A GP has u₂=12 and u₄=3. Find all (a,r) pairs. Which is possible if every term is positive?</p>',r'\[r^2=\frac{u_4}{u_2}=\frac14,\qquad a=\frac{12}{r}.\]<p>The pairs are (24,1/2) and (−24,−1/2). Both recover the supplied terms. Only a=24, r=1/2 makes every term positive.</p>','SR-PAIRED-SIGNS'),
 ex('The ratio-one case is separate',r'<p>A GP has first term 9 and ratio 1. Find S₁₂ and decide whether it has a finite ordinary sum to infinity.</p>',r'<p>Every term is 9, so S₁₂=12×9=108. The formula with denominator 1−r is not defined at r=1. The partial sums 9n grow without bound, so no finite ordinary sum to infinity exists.</p>','SR-RATIO-ONE'),
 ex('A signed tail explains an overshoot',r'<p>A GP has a=10 and \(r=-\frac14\). Find S∞, S₃ and the remainder after the first three terms.</p>',r'\[S_\infty=\frac{10}{1+\frac14}=8,\]\[S_3=10-\frac52+\frac58=\frac{65}{8}.\]\[R_3=8-\frac{65}{8}=-\frac18.\]<p>The finite sum exceeds its limit by \(\frac18\). The signed tail is \(-\frac18\); the error magnitude is \(\frac18\).</p>','SR-SIGNED-TAIL')])

lesson('ap_conditions','trig_arithmetic','Arithmetic conditions, parameters and linked progressions',
 'Translate equal differences into an equation, retain constant cases and check any extra restrictions.',
 'Use the consecutive-AP condition with algebraic or trigonometric terms and distinguish all algebraic cases from the permitted ones.',
 '<p>Recall AP terms, quadratic equations, exact ratios and sin²θ+cos²θ=1.</p>',
 r'''<h3>Three consecutive terms have two equal differences</h3><p>For A, B, C in that order:</p>\[B-A=C-B\quad\Longleftrightarrow\quad2B=A+C.\]<p>This condition includes a zero or negative common difference. Reject a constant AP only if the question says non-constant.</p>'''+image('arithmetic-condition','Twice an AP middle term equals the sum of its neighbours')+r'''
 <h3>Parameters can change the type of progression</h3><p>Substituting expressions for A, B and C may give a quadratic. Keep every real algebraic root, reconstruct the actual terms and check the extra conditions. Dividing by a parameter can lose a valid zero case.</p>
 <h3>Trigonometric terms use the same AP rule</h3><p>For example, if the first and third expressions contain sin²θ and cos²θ, the basic identity can reduce the AP condition to one ratio. Apply the specified angle domain and recover every permitted branch.</p>
 <h3>Related progressions need separate parameter names</h3><p>Sharing one term or one sum does not mean sharing the first term or common difference. Write each progression’s term or sum equation independently before linking the stated observations.</p>''',
 '<ol><li>Write the actual three consecutive terms in their stated order.</li><li>Set twice the middle equal to the sum of the outside terms.</li><li>Solve all cases, then restore terms and differences.</li><li>Apply non-constant, sign, interval or linked-model conditions to the original quantities.</li></ol>',
 ['Order matters when expressions are consecutive terms.', 'A constant AP is valid unless excluded.', 'Do not divide by a parameter before checking zero.', 'A sum relation must use each progression’s own indices.'],[
 ex('A negative parameter can still give a valid AP',r'<p>The consecutive AP terms are x+1, 2x−1 and 5x+3. Find x and d.</p>',r'\[2(2x-1)=(x+1)+(5x+3).\]<p>Thus x=−3. The terms are −2, −7, −12, with common difference d=−5. A negative parameter is not itself a reason to reject a solution.</p>','SR-AP-CONDITION'),
 ex('Reduce a trigonometric condition to one ratio',r'<p>The terms \(\sin^2\theta,\frac58,2\cos^2\theta\) are consecutive in an AP, with \(0<\theta<\frac\pi2\). Find θ and d.</p>',r'\[\frac54=\sin^2\theta+2\cos^2\theta=1+\cos^2\theta.\]<p>Hence cos²θ=1/4. The acute domain gives θ=π/3. The actual terms are 3/4, 5/8 and 1/2, with d=−1/8.</p>','SR-TRIG-AP'),
 ex('Keep zero and reject a forbidden constant case',r'<p>The terms x², x+2 and 4 form a non-constant AP. Find all allowed x.</p>',r'\[2(x+2)=x^2+4\quad\Rightarrow\quad x(x-2)=0.\]<p>At x=0 the terms are 0,2,4, a valid non-constant AP. At x=2 they are 4,4,4, which the question excludes. The complete permitted set is {0}; dividing by x would have lost it.</p>','SR-CONSTANT-CASE'),
 ex('The same three terms cannot be both non-constant types',r'<p>The terms 2−d, 2, 2+d form an AP. Can the same ordered triple be a non-constant GP?</p>',r'<p>The GP middle-square condition would require</p>\[2^2=(2-d)(2+d)=4-d^2.\]<p>Thus d=0, giving 2,2,2 with ratio 1. It is a GP, but it is constant. Therefore no non-constant case satisfies both requirements.</p>','SR-SAME-TRIPLE')])

lesson('gp_conditions','trig_geometric','Geometric conditions, signs and valid domains',
 'Use the middle-square condition carefully, reconstruct the ratio and apply angle and convergence restrictions.',
 'Solve GP parameter and trigonometric conditions without losing signs or accepting a spurious zero-term triple.',
 '<p>Recall GP ratios, quadratic factorisation, exact trigonometric values and denominator restrictions.</p>',
 r'''<h3>The squared-middle condition is only a starting point</h3><p>Consecutive GP terms A,B,C satisfy</p>\[B^2=AC.\]<p>If A and B are nonzero, reconstruct r=B/A and verify C=rB. With zero terms, the squared equation alone can accept a triple with no common finite ratio.</p>'''+image('geometric-condition','A valid GP has one common ratio; a zero-term counterexample needs a recurrence check')+r'''
 <h3>Restore paired signs</h3><p>If B² is known, consider B=±√(AC) when real. The two signs may give different first terms and ratios. Preserve their pairing; do not independently mix the a of one case with the r of another.</p>
 <h3>Trigonometric conditions keep the original domain</h3><p>Use tangent as sine divided by cosine only where cosine is nonzero. Record every denominator restriction before cancellation. A squared equation can add candidates, so check the original terms and their ratio.</p>
 <h3>Convergence is an additional question</h3><p>After finding a valid GP, use its actual ratio in |r|&lt;1. This inequality is strict. A boundary ratio of 1 or −1 does not give an ordinary infinite sum for nonzero terms.</p>''',
 '<ol><li>Record domain restrictions and the actual order of the terms.</li><li>Use B²=AC to obtain algebraic candidates.</li><li>Reconstruct a finite common ratio and verify both recurrence steps.</li><li>Apply positivity, angle and convergence conditions separately.</li></ol>',
 ['B²=AC can be insufficient when terms are zero.', 'An even power can conceal two signs.', 'A valid finite GP need not have a sum to infinity.', 'A cancelled trigonometric denominator remains excluded.'],[
 ex('An unknown middle term has two possible signs',r'<p>The numbers 2, k and 18 are consecutive terms of a GP. Find every (k,r) pair.</p>',r'\[k^2=2(18)=36.\]<p>For k=6, r=3. For k=−6, r=−3. Both recurrence steps hold in each case, giving pairs (6,3) and (−6,−3). Neither nonzero progression converges.</p>','SR-GP-MIDDLE'),
 ex('Cancel only on the stated acute domain',r'<p>The terms \(\tan\theta,1,2\cos\theta\) form a GP, with \(0<\theta<\frac\pi2\). Find θ and r.</p>',r'\[1=2\tan\theta\cos\theta=2\sin\theta.\]<p>Cos θ is nonzero on the domain, so cancellation is valid. Thus θ=π/6. The terms are 1/√3, 1, √3, and the common ratio is √3. This finite GP has no ordinary sum to infinity.</p>','SR-TRIG-GP'),
 ex('An endpoint candidate must not be restored',r'<p>The terms \(1,1-\cos\theta,\sin^2\theta\) form a GP for \(0<\theta<\pi\). Find θ and decide whether the GP converges.</p>',r'\[(1-\cos\theta)^2=\sin^2\theta=1-\cos^2\theta.\]\[2\cos\theta(\cos\theta-1)=0.\]<p>The algebra gives cos θ=0 or 1. The value θ=0 is outside the domain. At θ=π/2 the terms are 1,1,1: ratio 1, so the ordinary infinite sum does not exist.</p>','SR-GP-DOMAIN'),
 ex('A zero triple can pass one test and fail the definition',r'<p>Can 0,0,7 be three consecutive terms of a GP with a finite common ratio?</p>',r'<p>The middle-square equation is 0²=0×7, so it is satisfied. But a common ratio would also require the third term to be r×0=0, not 7. Therefore no finite common ratio exists; the squared-middle test was necessary but insufficient.</p>','SR-ZERO-TRIPLE')])

lesson('applications','applications','Series models: timing, accumulation and linked progressions',
 'Choose an additive or multiplicative model, set the timeline and count the terms actually included.',
 'Model salaries, regular deposits, repeated motion and linked progressions while checking timing, domains and assumptions.',
 '<p>Recall finite AP/GP sums, convergence, percentage multipliers and valid parameter cases.</p>',
 r'''<h3>Choose the model from the rule</h3><p>A fixed addition gives an AP. A fixed percentage multiplier gives a GP. Agreement at one or two observations does not make two models identical; interpret the stated rule rather than selecting a formula by appearance.</p>
 <h3>Draw a timeline for regular payments</h3><p>A payment made at the start of a period earns interest during that period; an end-of-period payment does not. At a fixed valuation date, list the exponents for the first and last payments before summing. Keep exact values until the requested final currency rounding.</p>
 <h3>Repeated motion counts some distances twice</h3><p>If a ball is released from height H and each rebound reaches a fraction r of the preceding height, with 0&lt;r&lt;1, the rebound peaks are Hr,Hr²,… . The initial fall happens once; each subsequent complete rise and fall happens twice.</p>\[D=H+2\frac{Hr}{1-r}.\]'''+image('rebound-heights','Release height and rebound peaks at discrete rebound indices')+r'''
 <h3>Related progressions must satisfy both definitions</h3><p>Write separate term or sum formulas for each proposed model, then connect only the quantities stated as equal. After solving, reconstruct all relevant terms, signs, indices and convergence conditions. A real algebraic root is not automatically a physically or contextually valid model.</p>''',
 '<ol><li>Define the first term, indexing convention, units and time of valuation.</li><li>Identify addition or multiplication and write the actual first few contributions.</li><li>Use the appropriate finite sum or prove convergence before taking a limit.</li><li>Verify timing, all linked equations and the requested rounding or integer constraint.</li></ol>',
 ['A year-one amount has exponent zero before its first increase.', 'Start and end deposits earn different numbers of periods.', 'Count an initial fall once, not twice.', 'Do not accept a squared-equation root without checking the original model.'],[
 ex('A fixed annual increase is arithmetic',r'<p>A salary is £24,000 in year 1 and rises by £900 each year. Find the year-6 salary and total salary over six years.</p>',r'\[u_6=24000+5(900)=28500.\]\[S_6=\frac62(24000+28500)=157500.\]<p>The rule is a fixed addition. A percentage increase would require a multiplicative model instead.</p>','SR-SALARY'),
 ex('Three start-of-year deposits have three different ages',r'<p>£500 is deposited at the start of each of three years. Interest of 2% is added at each year end. Find the balance at the end of year 3, to the nearest penny.</p>',r'<p>The deposits earn interest for 3, 2 and 1 years respectively:</p>\[B=500\bigl(1.02^3+1.02^2+1.02\bigr)\]\[=1560.804.\]<p>The final balance is £1560.80. The last deposit earns one period; it must not be counted as an uninvested £500 at this valuation date.</p>','SR-DEPOSIT-TIMING'),
 ex('The initial fall is counted once',r'<p>A ball is released from 3 m and each rebound reaches half the previous height. In the idealised infinite model, find the total vertical distance travelled.</p>',r'<p>The rebound peaks are \(\frac32,\frac34,\frac38,\ldots\), whose sum is 3.</p>\[D=3+2\left(\frac{\frac32}{1-\frac12}\right)=9\text{ m}.\]<p>The first fall contributes 3 m once; later rebound heights contribute a rise and a fall.</p>','SR-BOUNCE'),
 ex('A changed last term creates a different model',r'<p>Three consecutive AP terms are x,x+3,x+6. Replacing the last by x+9 gives a GP with nonzero terms. Find x and compare the first four-term sums of the two progressions.</p>',r'\[(x+3)^2=x(x+9)\quad\Rightarrow\quad x=3.\]<p>The AP is 3,6,9,… and the GP is 3,6,12,… . Their first four-term sums are respectively 30 and 45. Restoring the terms checks both the ratio and the difference.</p>','SR-LINKED-MODELS')])

def field(key,label,kind,expected,**extra):return dict(key=key,label=label,type=kind,expected=str(expected),**extra)
def values(*xs):return '{'+','.join(str(s.simplify(v)) for v in xs)+'}'
def pairs(*ps):return ';'.join('('+','.join(str(s.simplify(v)) for v in p)+')' for p in ps)
def show(f):
 v=f['expected']
 if f['type']=='choice':return f['options'][v]
 if f['type']=='pairs':return r'\(\{'+r',\ '.join(r'('+r',\ '.join(tex(x) for x in p[1:-1].split(','))+')' for p in v.split(';'))+r'\}\)'
 if f['type']=='set':
  if v.startswith('{'):return r'\(\{'+r',\ '.join(tex(x) for x in v[1:-1].split(','))+r'\}\)'
  a,b=v[1:-1].split(',');return r'\('+v[0]+tex(a)+r',\ '+tex(b)+v[-1]+r'\)'
 return math(v)
def quick(topic,family,v,title,prompt,fields,solution,model):
 uid=f'M4U-9709-P1-SR-CHECK-{topic.upper()}-{family}-{v}'
 answer=''.join('<p>'+f['label']+': '+show(f)+'</p>' for f in fields)
 hint={'arithmetic':'Distinguish terms and sums, use the actual index gap and check the permitted integer boundary.',
 'geometric':'Keep paired ratio signs, separate finite sums from convergence and interpret a tail as S∞−Sₙ.',
 'ap_conditions':'Twice the middle equals the sum of the outside terms; restore candidates before imposing extra conditions.',
 'gp_conditions':'Use the middle-square condition, then verify a finite ratio and the original angle/convergence restrictions.',
 'applications':'Write the first and last contributions on a timeline before choosing an AP or GP sum.'}[topic]
 questions.append(dict(id=uid,family_uid=f'M4U-9709-P1-SR-CHECK-{topic.upper()}-{family}',lesson=topic,title=title,collection='short' if v==0 else 'variant',prompt_html=prompt,answer_html=answer,solution_html=solution+'<h4>Complete answers</h4>'+answer,hint_html='<p>'+hint+'</p>',marks=len(fields),difficulty=2,fields=fields,parts=[dict(label='',marking_criteria=[dict(code='B1',marks=1,description_html='Complete correct answer for '+f['label']+'.') for f in fields])],verification=uid))
 models.append(dict(uid=uid,**model))

for v in range(2):
 a,d,i,j,N=(1,3,3,8,20) if v==0 else (-1,5,4,10,16)
 quick('arithmetic',1,v,'Reconstruct an arithmetic progression',f'<p>An AP has u<sub>{i}</sub>={ap(a,d,i)} and u<sub>{j}</sub>={ap(a,d,j)}. Find a, d and u<sub>{N}</sub>.</p>',
  [field('first','First term a','number',a),field('difference','Common difference d','number',d),field('term',f'Term u{N}','number',ap(a,d,N))],f'<p>The gap between indices is {j-i}. Subtract the two term equations to find d, then substitute for a and evaluate the requested term.</p>',dict(kind='ap_parameters',i=i,j=j,ui=ap(a,d,i),uj=ap(a,d,j),N=N))
 a,d,N,k=(4,2,10,4) if v==0 else (9,-1,8,3)
 quick('arithmetic',2,v,'A block excludes its preceding prefix',f'<p>An AP has a={a} and d={d}. Find S<sub>{N}</sub> and the sum of terms {k+1} through {N}.</p>',
  [field('prefix',f'Prefix sum S{N}','number',ap_sum(a,d,N)),field('block','Requested block sum','number',ap_sum(a,d,N)-ap_sum(a,d,k))],f'<p>Find the prefix S{N}, then subtract S{k}. There are {N-k} terms in the requested block.</p>',dict(kind='ap_block',a=a,d=d,N=N,k=k))
 A,B=(2,3) if v==0 else (3,-4);poly=2*A*n+B-A
 quick('arithmetic',3,v,'Recover the term from prefix sums',r'<p>An AP has \(S_n='+tex(A*n*n+B*n)+r'\). Give uₙ as a polynomial in n, then a and d.</p>',
  [field('formula','Term expression in n','polynomial',poly,variables=['n']),field('first','First term a','number',A+B),field('difference','Common difference d','number',2*A)],r'\[u_n=S_n-S_{n-1}.\]<p>Expand the difference of the two quadratics. The constant first term is found at n=1, not n=0.</p>',dict(kind='prefix_polynomial',A=A,B=B))
 a,d,bound=(5,3,98) if v==0 else (4,2,90);N=next(k for k in range(1,100) if ap_sum(a,d,k)>bound)
 quick('arithmetic',4,v,'Verify a strict first-index boundary',f'<p>An AP has a={a} and d={d}. Find the least positive n for which Sₙ&gt;{bound}. Give Sₙ₋₁ and Sₙ to verify your boundary.</p>',
  [field('index','Least index n','number',N),field('previous','Preceding prefix sum','number',ap_sum(a,d,N-1)),field('current','First qualifying prefix sum','number',ap_sum(a,d,N))],'<p>These terms are positive, so the sums increase. Solve the inequality for integer n and check both adjacent sums. Equality does not satisfy a strict greater-than condition.</p>',dict(kind='first_index',a=a,d=d,bound=bound))

 a,r,N=(s.Integer(6),-s.Rational(1,2),5) if v==0 else (s.Integer(8),-s.Rational(1,2),4)
 quick('geometric',1,v,'Term and finite alternating sum','<p>A GP has a='+math(a)+', r='+math(r)+f'. Find u<sub>{N}</sub> and S<sub>{N}</sub> exactly.</p>',
  [field('term',f'Term u{N}','number',a*r**(N-1)),field('sum',f'Finite sum S{N}','number',gp_sum(a,r,N))],r'<p>Use arⁿ⁻¹ for the term and \(a(1-r^n)/(1-r)\) for the finite sum. Keep the signs of every power.</p>',dict(kind='gp_finite',a=str(a),r=str(r),N=N))
 u2,u4=(12,3) if v==0 else (18,2);ratio=s.sqrt(s.Rational(u4,u2));p1=(u2/ratio,ratio);p2=(-u2/ratio,-ratio)
 quick('geometric',2,v,'Both paired parameter cases',f'<p>A GP has u₂={u2} and u₄={u4}. Give every (a,r) pair and every corresponding sum to infinity.</p>',
  [field('pairs','All (a,r) pairs','pairs',pairs(p1,p2)),field('limits','All sums to infinity','set',values(p1[0]/(1-p1[1]),p2[0]/(1-p2[1])))],r'\[r^2=\frac{u_4}{u_2},\qquad a=\frac{u_2}{r}.\]<p>Retain both signs and keep a paired with its r. Both ratios have magnitude less than one, so compute a separate infinite sum for each.</p>',dict(kind='gp_sign_pairs',u2=u2,u4=u4))
 a,r,N=(7,1,10) if v==0 else (5,-1,9)
 options={'A':'Yes, because |r|≤1','B':'No: the nonzero terms do not tend to zero','C':'The infinite sum equals the first term'} if v==0 else {'A':'Yes, because adjacent terms cancel','B':'The infinite sum is zero','C':'No: partial sums alternate between distinct values'}
 quick('geometric',3,v,'Finite sum versus ordinary convergence',f'<p>A GP has a={a}, r={r}. Find S<sub>{N}</sub>, then select the correct conclusion about its ordinary sum to infinity.</p>',
  [field('sum',f'Finite sum S{N}','number',gp_sum(a,s.Integer(r),N)),field('convergence','Ordinary infinite sum','choice','B' if v==0 else 'C',options=options)],'<p>For r=1 add the equal terms. For r=−1 add the alternating finite list. Neither nonzero progression has a finite ordinary infinite sum.</p>',dict(kind='boundary_ratio',a=a,r=r,N=N,choice='B' if v==0 else 'C'))
 a,r,N=(s.Integer(10),-s.Rational(1,4),3) if v==0 else (s.Integer(9),s.Rational(1,3),3);limit=a/(1-r);finite=gp_sum(a,r,N)
 quick('geometric',4,v,'A signed remainder can be negative','<p>A GP has a='+math(a)+', r='+math(r)+f'. Find S∞, S{N} and the signed remainder after the first {N} terms.</p>',
  [field('limit','Sum to infinity','number',limit),field('finite',f'Finite sum S{N}','number',finite),field('tail','Signed remainder','number',s.simplify(limit-finite))],r'\[R_n=S_\infty-S_n=\frac{ar^n}{1-r}.\]<p>Check |r|&lt;1 first. Give the signed difference, not its absolute value.</p>',dict(kind='gp_tail',a=str(a),r=str(r),N=N))

 triple=[s.Symbol('x')+1,2*s.Symbol('x')-1,5*s.Symbol('x')+3] if v==0 else [s.Symbol('x')+2,3*s.Symbol('x'),7*s.Symbol('x')-2];sol=-3 if v==0 else 0;d=-5 if v==0 else -2
 quick('ap_conditions',1,v,'Equal differences determine a parameter','<p>The expressions '+', '.join(math(t) for t in triple)+' are consecutive AP terms in that order. Find x and d.</p>',
  [field('parameter','Parameter x','number',sol),field('difference','Common difference d','number',d)],'<p>Set twice the middle expression equal to the sum of the outside expressions. Substitute the parameter back into all three terms to obtain d.</p>',dict(kind='ap_three',terms=list(map(str,triple))))
 middle=s.Rational(5,8) if v==0 else s.Rational(7,8);csq=2*middle-1;theta=s.pi/3 if v==0 else s.pi/6
 quick('ap_conditions',2,v,'An acute AP angle','<p>The consecutive AP terms are '+r'\(\sin^2\theta\), '+math(middle)+r', \(2\cos^2\theta\), with \(0<\theta<\frac\pi2\). Find cos²θ and θ.</p>',
  [field('cosine_square','cos²θ','number',csq),field('angle','Acute θ (radians)','number',theta)],r'<p>Twice the middle equals sin²θ+2cos²θ=1+cos²θ. The acute domain selects the positive cosine and one angle.</p>',dict(kind='trig_ap',middle=str(middle)))
 c=2+v;B=c*c-c;L=c*c;algebraic=values(c,2-c);valid=2-c;d=B+valid-valid*valid
 quick('ap_conditions',3,v,'A constant case is forbidden','<p>The terms '+math(s.Symbol('x')**2)+', '+math(s.Symbol('x')+B)+', '+math(L)+' form a non-constant AP. Give all algebraic parameter candidates, all permitted x, and the common difference of the permitted AP.</p>',
  [field('candidates','All algebraic x-candidates','set',algebraic),field('valid','All permitted x-values','set',values(valid)),field('difference','Permitted common difference','number',d)],'<p>Use the AP middle-term condition and factor the quadratic. Rebuild the terms for both roots; the constant triple is excluded, but a zero first term is allowed in an AP.</p>',dict(kind='ap_constant_case',B=B,L=L))
 k,a,d=(3,3,3) if v==0 else (4,2,5);S1=ap_sum(a,d,k);block=ap_sum(a,d,2*k)-S1
 quick('ap_conditions',4,v,'Two equal-length blocks identify an AP',f'<p>The first {k} AP terms sum to {S1}; the next {k} terms sum to {block}. Find a, d and u<sub>{2*k}</sub>.</p>',
  [field('first','First term a','number',a),field('difference','Common difference d','number',d),field('term',f'Term u{2*k}','number',ap(a,d,2*k))],f'<p>Each of the next {k} terms exceeds its partner in the first block by {k}d. The block-sum difference is therefore {k*k}d, not {k}d. Recover a from the first block.</p>',dict(kind='equal_blocks',k=k,first_sum=str(S1),next_sum=str(block)))

 A,C=(2,18) if v==0 else (3,27);k=s.sqrt(A*C);ratio=k/A
 quick('gp_conditions',1,v,'Every middle-term and ratio pair',f'<p>The numbers {A}, k, {C} are consecutive GP terms. Give all (k,r) pairs.</p>',
  [field('pairs','All (k,r) pairs','pairs',pairs((k,ratio),(-k,-ratio)))],r'<p>Use k²=AC and retain both signs. In each case compute r=k/A and check that multiplying k by r gives the last term.</p>',dict(kind='gp_middle',A=A,C=C))
 coefficient=s.Integer(2) if v==0 else s.sqrt(2);theta=s.pi/6 if v==0 else s.pi/4;ratio=1/s.tan(theta)
 quick('gp_conditions',2,v,'A trigonometric GP ratio','<p>The terms '+r'\(\tan\theta,1,'+tex(coefficient)+r'\cos\theta\) form a GP for \(0<\theta<\frac\pi2\). Find θ and r.</p>',
  [field('angle','Acute θ (radians)','number',theta),field('ratio','Common ratio r','number',s.simplify(ratio))],'<p>The squared-middle condition reduces to 1 equal to the coefficient times sin θ. Cos θ is nonzero on the acute domain. Restore the actual terms to find the ratio.</p>',dict(kind='trig_gp',coefficient=str(coefficient)))
 q=s.Rational(1,2) if v==0 else s.sqrt(2)/2;upper=s.acos(q)
 quick('gp_conditions',3,v,'Convergence excludes its boundary',r'<p>A nonzero GP has ratio \(r=\frac{'+tex(q)+r'}{\cos\theta}\), where \(0<\theta<\frac\pi2\). Find the complete θ-interval for convergence, then decide whether the ordinary infinite sum exists at its upper boundary.</p>',
  [field('interval','Convergent θ-interval (radians)','set','(0,'+str(upper)+')'),field('boundary','Infinite sum at the upper boundary','choice','B',options={'A':'It exists','B':'It does not exist','C':'Every nonzero first term gives sum zero'})],r'<p>Cos θ is positive on the acute domain. The condition |r|&lt;1 becomes cos θ greater than the positive numerator. Cosine decreases there. Equality at the upper boundary gives r=1 and must be excluded.</p>',dict(kind='angle_convergence',q=str(q)))
 options={'A':'0, 0, 7','B':'3, −6, 12','C':'2, 3, 4'} if v==0 else {'A':'9, 3, 1','B':'0, 0, 8','C':'2, 4, 7'};choice='B' if v==0 else 'A';ratio=-2 if v==0 else s.Rational(1,3)
 quick('gp_conditions',4,v,'Check the recurrence, including zeros','<p>Which listed triple can be consecutive GP terms with a finite common ratio? Select it and give its ratio.</p>',
  [field('triple','Valid GP triple','choice',choice,options=options),field('ratio','Common ratio r','number',ratio)],'<p>Verify that the same finite multiplier sends the first term to the second and the second to the third. A triple 0,0,c with c≠0 cannot satisfy the second recurrence.</p>',dict(kind='gp_choice',variant=v,choice=choice))

 a,d,N=(24000,900,6) if v==0 else (30000,1200,5)
 quick('applications',1,v,'An additive salary model',f'<p>A salary is £{a:,} in year 1 and rises by £{d:,} each year. Find the year-{N} salary and the total salary over {N} years.</p>',
  [field('salary',f'Year-{N} salary (£)','number',ap(a,d,N)),field('total','Total salary (£)','number',ap_sum(a,d,N))],'<p>Year 1 is the first term. The year-N salary has N−1 increases. Add the annual salaries with the finite AP sum.</p>',dict(kind='salary',a=a,d=d,N=N))
 payment,rate,start=(500,s.Rational(1,50),True) if v==0 else (400,s.Rational(1,20),False);growth=1+rate;periods=3 if start else 2;balance=sum(payment*growth**k for k in range(1,4)) if start else sum(payment*growth**k for k in range(3));rounded=s.floor(balance*100+s.Rational(1,2))/100
 quick('applications',2,v,'Payment timing determines the exponents',f'<p>£{payment} is deposited at the '+('start' if start else 'end')+f' of each of three years. Interest of {int(rate*100)}% is added at each year end, '+('after that year’s start deposit' if start else 'before that year’s end deposit')+'. Find how many periods the first deposit earns and the end-of-year-3 balance to the nearest penny.</p>',
  [field('periods','Periods earned by first deposit','number',periods),field('balance','Final balance (£, nearest penny)','number',rounded)],'<p>List the first and last deposits on the timeline. Each balance contribution is its payment times the multiplier raised to its own number of earned periods. Round only the final total.</p>',dict(kind='deposits',payment=payment,rate=str(rate),start=start,N=3))
 H,r=(s.Integer(3),s.Rational(1,2)) if v==0 else (s.Integer(5),s.Rational(2,5))
 quick('applications',3,v,'One initial fall and paired rebounds','<p>A ball is released from '+math(H)+' m and each rebound reaches '+math(r)+' of its previous height. Find the third rebound height and the idealised total distance after infinitely many complete bounces.</p>',
  [field('height','Third rebound height (m)','number',H*r**3),field('distance','Total vertical distance (m)','number',s.simplify(H+2*H*r/(1-r)))],'<p>The release is index 0, so rebound 3 has height Hr³. The initial fall is counted once; every rebound contributes a rise and a fall. Check 0&lt;r&lt;1 before summing.</p>',dict(kind='bounces',H=str(H),r=str(r)))
 d=3+v;x=d
 quick('applications',4,v,'Restore both linked models','<p>The terms '+math(s.Symbol('x'))+', '+math(s.Symbol('x')+d)+', '+math(s.Symbol('x')+2*d)+' form an AP. Changing the last to '+math(s.Symbol('x')+3*d)+' gives a GP with nonzero terms. Find x, the GP ratio and the first four-term sum of each progression.</p>',
  [field('parameter','Parameter x','number',x),field('ratio','GP common ratio','number',2),field('ap_sum','First four AP terms: sum','number',ap_sum(x,d,4)),field('gp_sum','First four GP terms: sum','number',gp_sum(s.Integer(x),s.Integer(2),4))],'<p>Set the square of the GP middle term equal to the product of its outside terms, solve for x, then restore the original AP and modified GP. Their first four terms and sums differ.</p>',dict(kind='linked_models',d=d))
