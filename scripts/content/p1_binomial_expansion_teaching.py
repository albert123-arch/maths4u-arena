"""Independent finite-binomial teaching and full-answer practice for 9709 P1."""
import sympy as s
x,p,k=s.symbols('x p k',real=True)
lessons,questions,models=[],[],[]
def tex(v):return s.latex(s.sympify(str(v),locals={'x':x,'p':p,'k':k}))
def math(v):return r'\('+tex(v)+r'\)'
def power(A,B,N):
 B=s.sympify(B);negative=B.could_extract_minus_sign()
 return r'\left('+tex(A)+('-' if negative else '+')+tex(-B if negative else B)+r'\right)^{'+str(N)+'}'
def binomial(A,B,N):return r'\('+power(A,B,N)+r'\)'
def image(name,alt):return '<p><img src="/assets/original/binomial-expansion/'+name+'.svg" alt="'+alt+'"></p>'
def ex(title,question,solution,key):return dict(title=title,question=question,solution=solution,verification=key)
def lesson(key,suffix,title,summary,objective,before,ideas,method,mistakes,examples):
 lessons.append(dict(key=key,id='orig_binomial_expansion_'+suffix,title=title,summary=summary,objective=objective,before=before,ideas=ideas,method=method,mistakes=mistakes,examples=examples))
def coeff(F,j):return s.expand(F).coeff(x,j)
def truncate(F,j):return s.Add(*(coeff(F,i)*x**i for i in range(j+1)))

lesson('expansion','expansion','Finite binomial expansions, signs and substitutions',
 'Build a complete finite expansion or a precisely requested truncation, keeping powers and signs attached to both terms.',
 'Expand a binomial with a positive integer exponent and substitute another polynomial without losing needed contributions.',
 '<p>Recall multiplying brackets, index laws, exact fractions and collecting like powers.</p>',
 r'''<h3>A positive integer exponent gives a finite expansion</h3><p>The coefficients in (A+B)ⁿ are the entries of row n of Pascal’s triangle. The first row is n=0. Each interior entry is the sum of the two above it; row n has n+1 entries.</p>'''+image('pascal-triangle','Pascal rows indexed from zero')+r'''
 <h3>The coefficients multiply whole powers</h3>\[(A+B)^n=A^n+nA^{n-1}B\]\[+\frac{n(n-1)}2A^{n-2}B^2+\cdots+B^n.\]<p>Here n is a positive integer. A and B may themselves contain constants, signs, fractions and powers of x. A negative second term is raised to each integer power; its sign must not be dropped.</p>
 <h3>Complete and truncated answers are different</h3><p>A complete ordinary binomial in two nonzero distinct monomials has n+1 terms before any requested truncation. “Through x²” includes every contribution of degree at most two. “First three nonzero terms” can instead involve x⁰, x² and x⁴. Identify which request is being made.</p>
 <h3>A substitution can mix degrees</h3><p>If t=x−x² is substituted into (1+t)⁴, terms from t² and t³ can both contribute to x³. Expand and collect before discarding powers beyond the target. A truncation is an approximation, not an equality to the entire original expression.</p>''',
 '<ol><li>Identify the two complete terms and the positive integer exponent.</li><li>Select the required Pascal row or binomial coefficients.</li><li>Multiply constants, signs and powers before collecting.</li><li>Order the requested powers and state clearly whether higher terms were omitted.</li></ol><p>The written bank combines expansion with products, parameter conditions and Laurent powers from later lessons.</p>',
 ['The first term need not be one.', 'A negative term gives alternating signs only according to its chosen power.', 'Three terms need not mean degree two.', 'Substitute first, then collect every contribution to the requested degree.'],[
 ex('Keep the negative sign inside the power',r'<p>Expand \((1-2x)^4\) completely in ascending powers of x.</p>',r'<p>Use Pascal row 4: 1,4,6,4,1. The successive powers of −2x supply the signs. The complete expansion is</p>\[1-8x+24x^2-32x^3+16x^4.\]<p>The constant term is 1 and the highest-degree term is (−2x)⁴, giving two useful checks.</p>','BE-SIGNED-EXPANSION'),
 ex('A non-unit constant is raised too',r'<p>Find the terms through x² in \((2+x)^5\).</p>',r'\[P_2(x)=2^5+5(2^4)x+10(2^3)x^2\]\[=32+80x+80x^2.\]<p>The complete polynomial also contains 40x³+10x⁴+x⁵. The displayed P₂ is the requested truncation, not the full expansion.</p>','BE-NONUNIT'),
 ex('Fractional coefficients stay exact',r'<p>Expand \((1-\frac{x}{2})^3\) completely.</p>',r'<p>The complete expansion is</p>\[1-\frac32x+\frac34x^2-\frac18x^3.\]<p>Square and cube the whole fraction; do not divide every binomial coefficient by the same denominator.</p>','BE-FRACTION'),
 ex('Collect degrees after a polynomial substitution',r'<p>Use t=x−x² to find the terms through x³ in \((1+x-x^2)^4\).</p>',r'<p>Use 1+4t+6t²+4t³+t⁴. Through degree three, t² contributes x²−2x³ and t³ contributes x³; t⁴ starts at degree four.</p>\[P_3(x)=1+4x+2x^2-8x^3.\]<p>The cubic coefficient includes both −12 from 6t² and +4 from 4t³.</p>','BE-SUBSTITUTION')])

lesson('general_term','general_term','The general term, index bounds and Laurent powers',
 'Solve for the exponent before evaluating the coefficient and distinguish an index from a term number.',
 'Use the finite general term to find requested powers, including constants and negative powers, with an admissible integer index.',
 '<p>Recall factorials, index laws and linear equations in an integer index.</p>',
 r'''<h3>The index starts at zero</h3>\[T_{r+1}=\binom nr A^{n-r}B^r,\qquad 0\le r\le n.\]\[\binom nr=\frac{n!}{r!(n-r)!}.\]<p>The index r is an integer. It is one less than the term number. Powers and coefficient factors must all be evaluated using that same r.</p>'''+image('term-index','Index r=0 corresponds to the first term')+r'''
 <h3>Combine exponents before selecting a term</h3><p>For \((\alpha x^a+\beta x^b)^n\), the exponent of x in the r-indexed term is</p>\[a(n-r)+br=an+(b-a)r.\]<p>Set this equal to the requested exponent. A constant term requires exponent zero. If the candidate r is not an integer in [0,n], that power has coefficient zero.</p>'''+image('laurent-powers','A sequence of powers can cross zero or skip a requested exponent')+r'''
 <h3>A Laurent expansion is still finite</h3><p>Negative powers of x do not change the positive-integer binomial rule. They do impose x≠0 on the original expression. The binomial index order need not be ascending in powers of x; follow the requested ordering.</p>
 <h3>Coefficient and term are different answers</h3><p>The coefficient is the numerical or parameter factor multiplying a power. The term includes that power of x. Keep signs and factors such as αⁿ⁻ʳ as well as the binomial coefficient.</p>''',
 '<ol><li>Write the general term with r starting at zero.</li><li>Combine all powers of x and solve for the requested exponent.</li><li>Check that r is an integer in [0,n].</li><li>Evaluate the coefficient, restore x if a term was requested and retain the original domain.</li></ol>',
 ['Tᵣ₊₁ is not Tᵣ.', 'A non-integer index means the requested power is absent.', 'A constant term has exponent zero, not index zero.', 'Negative powers require x≠0 even when one selected term is constant.'],[
 ex('The fourth-power term is the fifth term',r'<p>Find the coefficient of x⁴ and the corresponding term number in \((2-x)^6\).</p>',r'<p>The x-power is r, so r=4 and the term is T₅.</p>\[T_5=\binom64 2^2(-x)^4=60x^4.\]<p>The coefficient is 60, the index is 4 and the term number is 5.</p>','BE-TERM-NUMBER'),
 ex('Find the exponent-zero term',r'<p>Find the constant term in \((2x^2-\frac1x)^6\), with x≠0.</p>',r'<p>The r-indexed exponent is 2(6−r)−r=12−3r. Zero exponent gives r=4.</p>\[\binom64 2^{6-4}(-1)^4=60.\]<p>This is the fifth term. The original expression is still undefined at x=0.</p>','BE-CONSTANT-TERM'),
 ex('A requested power may not occur',r'<p>Find the coefficient of x² in \((x^3+\frac2x)^5\), with x≠0.</p>',r'\[3(5-r)-r=15-4r.\]<p>Setting this equal to 2 gives r=13/4, which is not an allowed integer index. The coefficient of x² is therefore 0. Rounding r would select a different power.</p>','BE-MISSING-POWER'),
 ex('An interior power with non-unit factors',r'<p>Find the term in x⁴ in \((3x^2-\frac2x)^5\).</p>',r'<p>The exponent is 10−3r. Setting it to 4 gives r=2, which lies in [0,5].</p>\[T_3=\binom52 3^3(-2)^2x^4=1080x^4.\]<p>Both constant factors contribute powers; the binomial coefficient alone is not the answer.</p>','BE-LAURENT-TARGET')])

lesson('products','products','Coefficients in products, missing powers and parity',
 'Collect every pair of powers that contributes to the target and plan the necessary expansion depth.',
 'Find coefficients in finite products, sums and differences, including shifted or missing powers.',
 '<p>Recall finite binomial coefficients, collecting terms and integer exponents.</p>',
 r'''<h3>Target degrees are sums of two degrees</h3><p>For a product F(x)G(x), the coefficient of xᵏ is the sum of every product of coefficients whose powers add to k. For k=2 the ordinary pairs are (0,2), (1,1) and (2,0).</p>'''+image('coefficient-pairs','Three contributions to a product coefficient must all be included')+r'''
 <h3>Keep both constant terms</h3><p>A non-unit constant in either factor multiplies a contribution from the other. A factor with only even powers has zero coefficients at odd degrees; do not insert nonexistent terms.</p>
 <h3>A negative power changes the required depth</h3><p>Multiplication by x⁻¹ turns an x³ term into an x² term. Before truncating a factor, list the exponent pairs that can reach the target. An ordinary quadratic truncation can be insufficient for a Laurent product.</p>
 <h3>Use parity in paired expansions</h3><p>In (1+bx)ⁿ+(1−bx)ⁿ the odd-power terms cancel. In their difference the even-power terms cancel. This follows from the factor (−1)ʳ, not from dropping all negative terms.</p>''',
 '<ol><li>State the requested exponent and list every contributing pair.</li><li>Find only the needed coefficients, including constants.</li><li>Multiply each pair with its correct sign and add all contributions.</li><li>Check parity, missing powers and any shift from a negative-power multiplier.</li></ol>',
 ['One product of coefficients is rarely the entire target coefficient.', 'A constant term need not be one.', 'Multiplying by x⁻¹ can require one extra power beforehand.', 'Parity cancellation depends on adding or subtracting the expansions.'],[
 ex('All three quadratic contributions',r'<p>Find the coefficient of x² in \((1+x)^4(1+3x)^2\).</p>',r'<p>The needed coefficients are (1,4,6) and (1,6,9). Therefore</p>\[[x^2]=1(9)+4(6)+6(1)=39.\]<p>The mixed linear-times-linear contribution is 24; neither factor’s quadratic coefficient alone gives the product coefficient.</p>','BE-PRODUCT-PAIRS'),
 ex('A non-unit constant must be retained',r'<p>Find the coefficient of x³ in \((2-x)^4(1+2x)\).</p>',r'<p>The relevant coefficients of the first factor are [x²]=24 and [x³]=−8. Thus</p>\[[x^3]=(-8)(1)+(24)(2)=40.\]<p>The first factor need not be expanded beyond x³ for this target.</p>','BE-PRODUCT-CUBIC'),
 ex('The sum and difference keep different parities',r'<p>For F=(1+2x)⁵ and G=(1−2x)⁵, find F+G and the x³ coefficient of F−G.</p>',r'<p>The sum keeps only even powers:</p>\[F+G=2+80x^2+160x^4.\]<p>The difference doubles the odd-power coefficients, so</p>\[[x^3](F-G)=2\binom53 2^3=160.\]','BE-PARITY'),
 ex('Missing powers remove some pairs',r'<p>Find the x³ coefficient of \((1+x^2)^3(1-x)^4\).</p>',r'<p>The first factor has no x or x³ term. Only degrees (0,3) and (2,1) contribute:</p>\[[x^3]=1(-4)+3(-4)=-16.\]<p>Use the actual powers, not merely the first, second and third term numbers.</p>','BE-MISSING-PAIRS')])

lesson('parameters','parameters','Unknown constants, exponents and complete cases',
 'Turn coefficient information into algebra, retain every allowed sign and reconstruct the original coefficients.',
 'Recover constants or a positive integer exponent from coefficient conditions without losing zero cases or pairing signs incorrectly.',
 '<p>Recall quadratic equations, complete root sets, ratios and restrictions on denominators or integer exponents.</p>',
 r'''<h3>Write the coefficient before solving</h3><p>In (a+bx)ⁿ the coefficient of xʳ is \(\binom nr a^{n-r}b^r\). If one symbol is unknown, treat the others according to the stated conditions. Equality of two coefficients does not mean equality of two binomial coefficients alone.</p>
 <h3>Even powers leave paired branches</h3><p>A condition involving k² can give both positive and negative k. A later coefficient involving k³ changes sign with the same choice; keep the correspondence.</p>'''+image('parameter-branches','Two parameter signs give two matched cubic coefficients')+r'''
 <h3>An unknown exponent is a positive integer here</h3><p>A coefficient equation can have a negative algebraic root for n. Check n∈{1,2,3,…}, and n≥r when a nonzero xʳ coefficient is required. This lesson does not use the infinite binomial expansion for non-integer powers.</p>
 <h3>Record restrictions before dividing</h3><p>A zero parameter may be allowed in (1+kx)ⁿ, but not in a factor containing 1/k. If a coefficient condition has a factor k, handle k=0 before cancellation. For coupled parameters, solve both original equations and check positivity or nonzero requirements.</p>''',
 '<ol><li>Derive each required coefficient symbolically.</li><li>Write every original parameter and integer restriction.</li><li>Solve all algebraic cases without dividing away a possible zero.</li><li>Reconstruct the original coefficients and retain matched parameter values.</li></ol>',
 ['An even-power equation can give two signs.', 'Keep coefficient values paired with the parameter that produces them.', 'A negative root for n is outside this finite-binomial task.', 'Do not cancel a parameter until its zero case has been checked.'],[
 ex('Both signs and both corresponding coefficients',r'<p>The x² coefficient of (1+kx)⁶ is 60. Find all k and the matching x³ coefficients.</p>',r'\[15k^2=60\quad\Rightarrow\quad k=\pm2.\]\[[x^3]=20k^3.\]<p>The matched pairs (k,[x³]) are (−2,−160) and (2,160). There is no positivity condition that would remove the negative branch.</p>','BE-SIGNED-PARAMETER'),
 ex('A positive integer exponent',r'<p>In \((1-\frac x2)^n\), the x² coefficient is 7. Find the positive integer n and the coefficient of x.</p>',r'\[\frac{n(n-1)}8=7,\qquad(n-8)(n+7)=0.\]<p>The algebraic roots are 8 and −7. Only n=8 is permitted. The coefficient of x is −n/2=−4, providing a second check.</p>','BE-UNKNOWN-EXPONENT'),
 ex('Zero is an admissible parameter unless excluded',r'<p>In (1+kx)⁴ the x² coefficient is three times the coefficient of x. Find all real k, then state what remains if k is additionally required to be nonzero.</p>',r'\[6k^2=3(4k)\quad\Rightarrow\quad6k(k-2)=0.\]<p>Thus k=0 or 2. Both satisfy the original coefficient equality. Under the extra nonzero requirement only k=2 remains.</p>','BE-ZERO-CASE'),
 ex('A coupled condition fixes two constants',r'<p>In (a+bx)⁴, a and b are positive, the constant term is 81 and the x and x² coefficients are equal. Find a and b.</p>',r'<p>The constant term gives a⁴=81, so a=3. The equality gives</p>\[4a^3b=6a^2b^2\quad\Rightarrow\quad2a=3b.\]<p>Division is justified by a,b&gt;0. Hence b=2. Both coefficients are then 216.</p>','BE-COUPLED')])

lesson('approximations','approximations','Approximations, remainders and coupled coefficient models',
 'Match a numerical input, control omitted terms and connect coefficient models to complete parameter ranges.',
 'Use a finite truncation honestly, calculate or bound its remainder and apply combined coefficient conditions with valid endpoints.',
 '<p>Recall finite expansion, coefficient products, exact arithmetic and quadratic ranges.</p>',
 r'''<h3>Match the base before evaluating a truncation</h3><p>To estimate 2.01⁵ using (2+x)⁵, set x=0.01. Evaluate the whole retained polynomial at that input. A small input often helps, but the omitted coefficients and terms determine the actual error.</p>
 <h3>The omitted part is a finite polynomial</h3><p>If P₂ contains terms through x², write F=P₂+R. For example,</p>\[(1+x)^4=(1+4x+6x^2)+(4x^3+x^4).\]<p>The exact remainder can show whether P₂ is above or below the true value. The sign can change with x. Do not promise a rounding accuracy without checking the error.</p>'''+image('approximation-error','The exact finite remainder for a quadratic truncation')+r'''
 <h3>No infinite-series convergence test is needed</h3><p>The full positive-integer expansion is an algebraic identity for every input in its original domain. A condition such as |x|&lt;1 is not its validity range. A truncated estimate still needs an accuracy check. On a stated nonnegative interval, a remainder with nonnegative coefficients increases term by term, which can provide a bound without calculus.</p>
 <h3>Plan truncation for the complete expression</h3><p>A negative-power multiplier can bring higher terms down to the target degree. Likewise, a coupled coefficient condition can produce a quadratic model in a parameter. Recover the coefficient formula first, then apply the complete real-root or positive-root conditions, including strict endpoints.</p>
 <p>The written bank here includes the numerical-estimate tasks and combined coefficient models. Revise the products and parameters lessons before attempting the latter; the short practice below explicitly covers approximation and error.</p>''',
 '<ol><li>Match the requested base to the expansion’s input.</li><li>Choose enough terms for every multiplier or substitution.</li><li>Keep exact intermediate values and calculate or bound the omitted part.</li><li>Round only the requested final result; for parameter models check every boundary in the original conditions.</li></ol>',
 ['A truncation is not the complete original expression.', 'Do not insert the nearby target number itself as the small input.', 'Finite-binomial validity and approximation accuracy are different.', 'A parameter interval can be open even though its minimum value is attained.'],[
 ex('Match a nearby numerical power',r'<p>Use the quadratic truncation of (2+x)⁵ to estimate 2.01⁵ to 3 decimal places. Check the error using the omitted terms.</p>',r'<p>Use x=0.01, not x=2.01. The retained polynomial gives</p>\[P_2=32+80(0.01)+80(0.01)^2=32.808.\]<p>The exact remainder is 40x³+10x⁴+x⁵, giving 0.0000401001. The estimate is below the true value; both round to 32.808 at 3 decimal places.</p>','BE-MATCH-INPUT'),
 ex('The input sign changes the direction of error',r'<p>Use P₂=1+4x+6x² for (1+x)⁴. Compare the estimates at x=0.1 and x=−0.1 with the exact values.</p>',r'\[R=4x^3+x^4.\]<p>At x=0.1, P₂=1.46 and R=0.0041, so the estimate is low. At x=−0.1, P₂=0.66 and R=−0.0039, so it is high. The exact values are respectively 1.4641 and 0.6561.</p>','BE-ERROR-SIGN'),
 ex('A lower target can require a higher preliminary power',r'<p>Find the coefficient of x² in \((1+\frac1x)(1+2x)^4\), with x≠0.</p>',r'<p>The ordinary factor contributes its x² term directly and its x³ term after multiplication by x⁻¹:</p>\[[x^2]=\binom42 2^2+\binom43 2^3=24+32=56.\]<p>Stopping its expansion at x² would miss the second contribution.</p>','BE-TRUNCATION-DEPTH'),
 ex('A coefficient level with two positive parameter roots',r'<p>The x² coefficient in (1+px)⁴(1−2x) is K, with p&gt;0. Find all K giving two distinct allowed p-values.</p>',r'\[K=6p^2-8p,\]\[K=6\left(p-\frac23\right)^2-\frac83.\]<p>Two distinct real roots require K&gt;−8/3. Their sum is 4/3 and product is −K/6, so both are positive precisely when K&lt;0. Therefore</p>\[-\frac83<K<0.\]<p>At K=−8/3 there is one repeated positive root p=2/3. At K=0 the roots are 0 and 4/3, and the zero root is excluded.</p>','BE-COEFFICIENT-RANGE')])

def field(key,label,kind,expected,**extra):return dict(key=key,label=label,type=kind,expected=str(expected),**extra)
def expanded(label,value,variable='x'):return field('expanded',label,'polynomial',s.expand(value),variables=[variable],form='expanded')
def values(*vs):return '{'+','.join(str(s.simplify(v)) for v in vs)+'}'
def pairs(*ps):return ';'.join('('+','.join(str(s.simplify(v)) for v in a)+')' for a in ps)
def show(f):
 v=f['expected']
 if f['type']=='choice':return f['options'][v]
 if f['type']=='pairs':return r'\(\{'+r',\ '.join('('+r',\ '.join(tex(z) for z in a[1:-1].split(','))+')' for a in v.split(';'))+r'\}\)'
 if f['type']=='set':
  if v.startswith('{'):return r'\(\{'+r',\ '.join(tex(a) for a in v[1:-1].split(','))+r'\}\)'
  a,b=v[1:-1].split(',');return r'\('+v[0]+tex(a)+r',\ '+tex(b)+v[-1]+r'\)'
 return math(v)
def quick(topic,family,v,title,prompt,fields,solution,model):
 uid=f'M4U-9709-P1-BE-CHECK-{topic.upper()}-{family}-{v}'
 answer=''.join('<p>'+f['label']+': '+show(f)+'</p>' for f in fields)
 hint={'expansion':'Raise both complete terms to their powers, then collect every required degree.',
 'general_term':'Solve the x-exponent equation, require an integer index from 0 through n and distinguish index from term number.',
 'products':'List all pairs of powers which add to the target, including any negative-power shift.',
 'parameters':'Write the actual coefficient equation and retain every allowed sign, zero case and integer restriction.',
 'approximations':'Match the input, retain enough terms and use the exact finite remainder or coefficient model before rounding.'}[topic]
 questions.append(dict(id=uid,family_uid=f'M4U-9709-P1-BE-CHECK-{topic.upper()}-{family}',lesson=topic,title=title,collection='short' if v==0 else 'variant',prompt_html=prompt,answer_html=answer,solution_html=solution+'<h4>Complete answers</h4>'+answer,hint_html='<p>'+hint+'</p>',marks=len(fields),difficulty=2,fields=fields,parts=[dict(label='',marking_criteria=[dict(code='B1',marks=1,description_html='Complete correct answer for '+f['label']+'.') for f in fields])],verification=uid))
 models.append(dict(uid=uid,**model))

for v in range(2):
 A,B,N=(1,-2,4) if v==0 else (1,3,3);F=(A+B*x)**N
 quick('expansion',1,v,'A complete signed expansion','<p>Expand '+binomial(A,B*x,N)+' completely in ascending powers of x, then give its number of terms.</p>',
  [expanded('Complete expanded polynomial',F),field('count','Number of nonzero terms','number',N+1)],'<p>Use the appropriate Pascal row and raise the entire signed second term to each power. Give the multiplied-out polynomial, not the original bracket.</p>',dict(kind='complete',A=A,B=B,N=N))
 A,B,N=(2,1,5) if v==0 else (3,-1,4);F=(A+B*x)**N
 quick('expansion',2,v,'Non-unit constants and a planned truncation','<p>For '+binomial(A,B*x,N)+', give the polynomial through x² and the coefficient of the first omitted power x³.</p>',
  [expanded('Polynomial through x²',truncate(F,2)),field('omitted','Coefficient of the omitted x³ term','number',coeff(F,3))],'<p>The constant term is Aⁿ. Retain degrees 0,1,2 for the polynomial and compute degree 3 separately to identify the first omitted contribution.</p>',dict(kind='truncation',A=A,B=B,N=N))
 B=2 if v==0 else -3;F=(1+B*x*x)**3
 quick('expansion',3,v,'First nonzero terms can skip powers','<p>For '+binomial(1,B*x*x,3)+', give the first three nonzero terms as one expanded polynomial and the exponent of the first omitted nonzero term.</p>',
  [expanded('First three nonzero terms',truncate(F,4)),field('power','First omitted exponent','number',6)],'<p>The binomial index r contributes power 2r. The first three nonzero terms therefore have degrees 0,2,4, not 0,1,2.</p>',dict(kind='even_powers',B=B,N=3))
 a=1+v;t=a*x-x*x;F=(1+t)**4;choice='B' if v==0 else 'C';options={'A':'It is the entire original expression','B':'Higher powers have been omitted','C':'The positive integer theorem is invalid'} if v==0 else {'A':'It is an infinite series','B':'It is the entire original expression','C':'Higher powers have been omitted'}
 quick('expansion',4,v,'Collect after a substitution','<p>Use t='+math(t)+' in (1+t)⁴. Give the polynomial through x³ and identify what it represents.</p>',
  [expanded('Polynomial through x³',truncate(F,3)),field('meaning','Meaning of this polynomial','choice',choice,options=options)],'<p>Both t² and t³ contribute to the cubic coefficient. Expand these terms far enough, collect degrees and then omit degrees above three.</p>',dict(kind='substitution',a=a,N=4,choice=choice))

 A,B,N,K=(2,-1,6,4) if v==0 else (3,2,5,3);F=(A+B*x)**N
 quick('general_term',1,v,'Index, term number and coefficient','<p>In '+binomial(A,B*x,N)+', use the first displayed summand as A in the general-term formula. Find r, the term number and the coefficient for '+math(x**K)+'.</p>',
  [field('index','Index r','number',K),field('number','Term number','number',K+1),field('coefficient','Requested coefficient','number',coeff(F,K))],'<p>The x-power equals r here. The term number is r+1. Include the powers of A and B as well as the binomial coefficient.</p>',dict(kind='ordinary_term',A=A,B=B,N=N,K=K))
 A,B,a,b,N=(2,-1,2,-1,6) if v==0 else (3,-2,1,-2,6);r=s.Rational(a*N,a-b);F=(A*x**a+B*x**b)**N
 quick('general_term',2,v,'An exponent-zero term','<p>Find r, the term number and constant term in '+binomial(A*x**a,B*x**b,N)+', with x≠0. Use the displayed summand order.</p>',
  [field('index','Index r','number',r),field('number','Term number','number',r+1),field('coefficient','Constant term','number',coeff(F,0))],'<p>The exponent is a(n−r)+br. Set it to zero and check the index bounds before evaluating the coefficient.</p>',dict(kind='laurent_constant',A=A,B=B,a=a,b=b,N=N))
 a,b,N,A,B,K=(3,-1,5,1,2,2) if v==0 else (2,-1,4,1,-1,1);r=s.Rational(a*N-K,a-b);F=(A*x**a+B*x**b)**N;choice='B' if v==0 else 'C';options={'A':'Round r to the nearest integer','B':'No admissible integer index produces the power','C':'Every power between the endpoints must occur'} if v==0 else {'A':'Round r to the nearest integer','B':'Every power between the endpoints must occur','C':'No admissible integer index produces the power'}
 quick('general_term',3,v,'A missing power has coefficient zero','<p>For '+binomial(A*x**a,B*x**b,N)+', use the displayed summand order. Find the candidate r from the exponent equation for '+math(x**K)+', its coefficient, and the correct reason.</p>',
  [field('index','Exponent-equation candidate r','number',r),field('coefficient','Requested coefficient','number',0),field('reason','Reason for the coefficient','choice',choice,options=options)],'<p>Do not round an index. The exponent equation has a non-integer solution, so no actual binomial summand has the requested power.</p>',dict(kind='missing_power',A=A,B=B,a=a,b=b,N=N,K=K,choice=choice))
 A,B,a,b,N,K=(2,-1,1,-1,5,-1) if v==0 else (1,2,2,-1,5,-2);F=(A*x**a+B*x**b)**N;r=s.Rational(a*N-K,a-b);choice='C' if v==0 else 'B';options={'A':'It is defined for every real x','B':'Only x=0 is allowed','C':'x=0 is excluded'} if v==0 else {'A':'It is defined for every real x','B':'x=0 is excluded','C':'Only x=0 is allowed'}
 quick('general_term',4,v,'Negative powers retain their domain','<p>Find r and the coefficient of '+math(x**K)+' in '+binomial(A*x**a,B*x**b,N)+', using the displayed summand order. Select the original domain restriction.</p>',
  [field('index','Index r','number',r),field('coefficient','Requested coefficient','number',coeff(F,K)),field('domain','Original domain','choice',choice,options=options)],'<p>Combine the powers to obtain a single linear expression in r. The original negative-power terms exclude x=0 even when a chosen coefficient is finite.</p>',dict(kind='negative_power',A=A,B=B,a=a,b=b,N=N,K=K,choice=choice))

 F,G=((1+x)**4,(1+3*x)**2) if v==0 else ((1-x)**3,(1+2*x)**2)
 quick('products',1,v,'The cross contribution is not the whole coefficient','<p>For '+math(F*G)+', give the x² contribution from linear times linear and the complete x² coefficient.</p>',
  [field('cross','Linear-times-linear contribution','number',coeff(F,1)*coeff(G,1)),field('coefficient','Complete x² coefficient','number',coeff(F*G,2))],'<p>Add the contributions (0,2), (1,1) and (2,0), keeping both constant terms.</p>',dict(kind='product_quadratic',F=str(F),G=str(G)))
 F,G=((2-x)**4,1+2*x) if v==0 else ((3+x)**4,2-x)
 quick('products',2,v,'A cubic target and a linear multiplier','<p>Find the x³ coefficient in '+math(F*G)+', and the highest power needed in the binomial factor before multiplication.</p>',
  [field('coefficient','Complete x³ coefficient','number',coeff(F*G,3)),field('depth','Highest needed preliminary exponent','number',3)],'<p>The constant multiplier uses the binomial’s cubic term, while its linear term uses the binomial’s quadratic term. Keep both contributions.</p>',dict(kind='linear_product',F=str(F),G=str(G)))
 B,N,sign=(2,5,1) if v==0 else (3,4,-1);F=(1+B*x)**N+sign*(1-B*x)**N
 quick('products',3,v,'Parity decides which powers survive','<p>For '+r'\('+power(1,B*x,N)+('+' if sign>0 else '-')+power(1,-B*x,N)+r'\)'+', find the x³ coefficient and the x² coefficient.</p>',
  [field('odd','Coefficient of x³','number',coeff(F,3)),field('even','Coefficient of x²','number',coeff(F,2))],'<p>The sum of opposite-sign binomials cancels odd powers; their difference cancels even powers. Double the surviving coefficients.</p>',dict(kind='parity',B=B,N=N,sign=sign))
 A,B,C,N=(1,1,2,4) if v==0 else (2,-1,1,5);F=(A+B/x)*(1+C*x)**N
 quick('products',4,v,'A negative-power shift needs one more term','<p>Find the x² coefficient in '+math(F)+', with x≠0, and the highest needed power in its ordinary binomial factor.</p>',
  [field('coefficient','Complete x² coefficient','number',coeff(F,2)),field('depth','Highest needed preliminary exponent','number',3)],'<p>The x⁻¹ multiplier brings the cubic term down to degree two. Combine that with the constant multiplier’s quadratic contribution.</p>',dict(kind='shifted_product',A=A,B=B,C=C,N=N))

 N,target=(6,60) if v==0 else (5,90);root=s.sqrt(s.Rational(target,s.binomial(N,2)));cub=s.binomial(N,3)*root**3
 quick('parameters',1,v,'Keep all signs and their matched coefficients',f'<p>The x² coefficient of (1+kx)<sup>{N}</sup> is {target}. Give all real k and all matched (k, x³ coefficient) pairs.</p>',
  [field('roots','All k-values','set',values(-root,root)),field('pairs','All (k, cubic coefficient) pairs','pairs',pairs((-root,-cub),(root,cub)))],'<p>The quadratic coefficient involves k² and gives both signs. Compute each cubic coefficient with the same signed k.</p>',dict(kind='signed_parameter',N=N,target=target))
 B,N,target=(-s.Rational(1,2),8,s.Integer(7)) if v==0 else (s.Rational(1,3),6,s.Rational(5,3))
 quick('parameters',2,v,'Filter the exponent to positive integers','<p>In '+binomial(1,B*x,'n')+' the x² coefficient is '+math(target)+'. Find the positive integer n and the coefficient of x.</p>',
  [field('exponent','Positive integer exponent n','number',N),field('linear','Coefficient of x','number',N*B)],r'<p>Use \(\binom n2 B^2\) for the quadratic coefficient. Solve the resulting quadratic, discard the negative exponent and verify the linear coefficient nB.</p>',dict(kind='integer_exponent',B=str(B),target=str(target)))
 N,mult=(4,3) if v==0 else (5,2);root=s.Rational(mult*N,s.binomial(N,2))
 quick('parameters',3,v,'Do not cancel a valid zero case',f'<p>In (1+kx)<sup>{N}</sup>, the x² coefficient is {mult} times the coefficient of x. Find all real k, then the set remaining under an additional k≠0 condition.</p>',
  [field('all','All real k-values','set',values(0,root)),field('nonzero','All nonzero k-values','set',values(root))],'<p>Move both coefficient expressions to one side and factor. Check k=0 before dividing; it is valid for the original polynomial but excluded by the additional condition.</p>',dict(kind='zero_parameter',N=N,mult=mult))
 N,a,b=(4,3,2) if v==0 else (5,2,1);C=a**N;common=N*a**(N-1)*b
 quick('parameters',4,v,'Two positive constants from two coefficient conditions',f'<p>In (a+bx)<sup>{N}</sup>, a,b&gt;0, the constant term is {C} and the coefficients of x and x² are equal. Find (a,b) and that common coefficient.</p>',
  [field('pair','Positive pair (a,b)','pairs',pairs((a,b))),field('coefficient','Common coefficient','number',common)],'<p>The constant term fixes the positive a. Divide the coefficient equality only after using a,b>0, then recover b and substitute into both coefficients.</p>',dict(kind='coupled_positive',N=N,constant=C))

 A,B,N,h=(2,1,5,s.Rational(1,100)) if v==0 else (3,-1,4,s.Rational(1,50));F=(A+B*x)**N;P=truncate(F,2);estimate=P.subs(x,h);rounded=s.floor(1000*estimate+s.Rational(1,2))/1000
 target_base=format(float(A+B*h),'.2f')
 quick('approximations',1,v,'Match the base to a small input','<p>Use the quadratic truncation of '+binomial(A,B*x,N)+r' to estimate \('+target_base+'^{'+str(N)+r'}\). Give the matching x and the quadratic estimate rounded to 3 decimal places.</p>',
  [field('input','Matching input x','number',h),field('estimate','Quadratic estimate (3 dp)','number',rounded)],'<p>Solve A+Bx equal to the numerical base, substitute that small x into the whole retained polynomial, then round once. The omitted terms are a separate error check.</p>',dict(kind='matched_approximation',A=A,B=B,N=N,h=str(h)))
 h=s.Rational(1,10) if v==0 else -s.Rational(1,10);F=(1+x)**4;P=truncate(F,2);R=s.expand(F-P);choice='A' if v==0 else 'B'
 quick('approximations',2,v,'The exact remainder determines the direction','<p>For (1+x)⁴ use P₂=1+4x+6x² at x='+math(h)+'. Give P₂, the signed remainder R=F−P₂ and the direction of the estimate.</p>',
  [field('estimate','Value of P₂','number',P.subs(x,h)),field('remainder','Signed remainder R','number',R.subs(x,h)),field('direction','Direction of the estimate','choice',choice,options={'A':'Underestimate','B':'Overestimate','C':'Exact equality'})],r'\[R=4x^3+x^4.\]<p>A positive remainder means the retained polynomial is low; a negative remainder means it is high.</p>',dict(kind='remainder_sign',h=str(h),choice=choice))
 N,h=(5,s.Rational(1,10)) if v==0 else (4,s.Rational(1,5));F=(1+x)**N;R=s.expand(F-truncate(F,2))
 quick('approximations',3,v,'A finite remainder gives an error bound','<p>Use the quadratic truncation of (1+x)<sup>'+str(N)+'</sup> on '+r'\(0\le x\le'+tex(h)+r'\). Find the greatest absolute error, the x where it occurs, and whether the full finite expansion requires |x|&lt;1.</p>',
  [field('bound','Greatest absolute error','number',R.subs(x,h)),field('input','x at the greatest error','number',h),field('validity','Does the full finite identity require |x|<1?','choice','B',options={'A':'Yes','B':'No','C':'Only when x is positive'})],'<p>All remainder coefficients are non-negative. On this nonnegative interval each omitted monomial increases, so the largest error occurs at the upper endpoint. Positive-integer finite expansion is not an infinite-series convergence claim.</p>',dict(kind='error_bound',N=N,h=str(h)))
 N,c=(4,2) if v==0 else (5,3);F=(1+p*x)**N*(1-c*x);model=coeff(F,2);A=s.binomial(N,2);B=-c*N;minimum=-B*B/(4*A);centre=-B/(2*A)
 quick('approximations',4,v,'A coefficient model with two positive roots',f'<p>The x² coefficient of (1+px)<sup>{N}</sup>(1−{c}x) is K, with p&gt;0. Give the expanded expression K(p), the full K-interval giving two distinct positive p-values and the repeated positive root at the minimum level.</p>',
  [expanded('Coefficient expression in p',model,'p'),field('levels','K-interval: two distinct positive roots','set','('+str(minimum)+',0)'),field('repeated','Repeated root p at the minimum','number',centre)],'<p>Complete the square to find the minimum coefficient level. Two real roots require a strictly higher level, and two positive roots also require their positive product. Check both excluded endpoints in the original p>0 condition.</p>',dict(kind='coefficient_range',N=N,c=c))
