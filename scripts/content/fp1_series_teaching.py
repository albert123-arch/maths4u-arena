"""New teaching text following the order of coursebook sections 3.1 and 3.2."""
def ex(title,question,solution,verification):return dict(title=title,question=question,solution=solution,verification=verification)
def lesson(key,title,summary,objective,before,ideas,method,mistakes,examples):
    return dict(key=key,id='fp1_series_'+key.replace('-','_'),title=title,summary=summary,objective=objective,before=before,ideas=ideas,method=method,mistakes=mistakes,examples=examples)

lessons=[
lesson('power-sums','Deriving power-sum formulae',
 'Understand the notation and obtain the standard results from finite differences.',
 'Derive and use the sums of first, second and third powers, keeping the index limits explicit.',
 r'<p>You need arithmetic sums, binomial expansions and polynomial algebra. A sum with lower limit \(a\) and upper limit \(b\) contains \(b-a+1\) terms when \(b\ge a\).</p>',
 r'''<h3>Read the summation before manipulating it</h3><p>The index is a placeholder. In \(\sum_{r=1}^n u_r\), the final index is \(n\), not an extra factor. A constant is repeated once per index, so \(\sum_{r=1}^n c=cn\). Summation is linear: split a polynomial into its powers and add the resulting totals.</p>
 <h3>Standard totals</h3>\[\sum_{r=1}^n r=\frac{n(n+1)}2,\qquad \sum_{r=1}^n r^2=\frac{n(n+1)(2n+1)}6.\]\[\sum_{r=1}^n r^3=\frac{n^2(n+1)^2}{4}.\]
 <p>These identities concern the whole block from \(1\) to \(n\). A different lower limit requires a subtraction; a zero-based sum needs its own endpoints.</p>
 <h3>Why a difference gives a total</h3><p>Sum an identity such as \((r+1)^p-r^p\). The interior powers cancel, leaving \((n+1)^p-1\). Expanding the difference links a new power sum to previously known ones. This supplies a derivation, rather than a pattern guessed from a few values.</p>
 <h3>Verify an answer as well as deriving it</h3><p>If \(F(0)=0\) and \(F(n)-F(n-1)=u_n\), then \(F(n)\) is the sum of the first \(n\) terms. The base value is essential. The same argument can be written as an induction proof: establish the first value and then add the next term.</p>
 <p>The difference method also reaches higher powers. That is an extension of the method; there is no need to memorise an extra table of formulae.</p>''',
 r'<ol><li>Name the power sums and expand a suitable difference of consecutive powers.</li><li>Sum both sides over exactly the same index range.</li><li>Cancel the boundary terms and substitute the lower-power results.</li><li>Simplify, then check the first value and the next-term difference.</li></ol>',
 ['A constant contributes n copies, not a single copy.',
  'The last surviving power is evaluated at n+1 when the difference uses r+1.',
  'Checking a few values is not a proof for all positive integers.',
  'When using induction, state the base value before the step.'],
 [
 ex('1 · Derive the first-power total',r'<p>Derive a formula for \(\sum_{r=1}^n r\) from a difference of squares.</p>',
 r'<p>Write \((r+1)^2-r^2=2r+1\) and add for \(r=1,\ldots,n\). The left side reduces to \((n+1)^2-1\), giving</p>\[(n+1)^2-1=2\sum_{r=1}^n r+n.\]<p>Hence \(\sum r=n(n+1)/2\). At \(n=1\) it gives \(1\); the difference between successive totals is exactly \(n\).</p>','E-P1'),
 ex('2 · Derive the square total',r'<p>Use \((r+1)^3-r^3\) to obtain \(\sum_{r=1}^n r^2\).</p>',
 r'\[(r+1)^3-r^3=3r^2+3r+1.\]<p>Summing and using the first-power formula gives</p>\[3\sum_{r=1}^n r^2=(n+1)^3-1-\frac{3n(n+1)}2-n.\]<p>Expanding and factorising yields</p>\[\sum_{r=1}^n r^2=\frac{n(n+1)(2n+1)}6.\]','E-P2'),
 ex('3 · Derive the cube total',r'<p>Derive \(\sum_{r=1}^n r^3\) using a difference of fourth powers.</p>',
 r'\[(r+1)^4-r^4=4r^3+6r^2+4r+1.\]<p>After summing, isolate the unknown cube total:</p>\[4\sum_{r=1}^n r^3=(n+1)^4-1-6\sum r^2-4\sum r-n.\]<p>Substitute the two earlier results and simplify:</p>\[\sum_{r=1}^n r^3=\frac{n^2(n+1)^2}{4}.\]','E-P3'),
 ex('4 · Extend the method to a higher power',r'<p>Find \(\sum_{r=1}^n r^4\) without assuming a formula for it.</p>',
 r'<p>Expand the next difference and sum it:</p>\[(r+1)^5-r^5=5r^4+10r^3+10r^2+5r+1.\]\[5\sum r^4=(n+1)^5-1-10\sum r^3-10\sum r^2-5\sum r-n.\]<p>Substituting the known totals gives</p>\[\sum_{r=1}^n r^4=\frac{n(n+1)(2n+1)(3n^2+3n-1)}{30}.\]<p>The first value is \(1\), and the difference of this expression at \(n\) and \(n-1\) is \(n^4\), checking both the constant and the general term.</p>','E-P4')
 ]),
lesson('finite-sums','Using power sums and finite limits',
 'Apply the standard results to shifted limits, weighted totals and recovered terms.',
 'Build the complete finite sum with the correct number of terms and both endpoints.',
 r'<p>Review <a href="/courses/maths4u-9231-fp1/topics/fp1_series_power_sums">power-sum formulae</a>. For the mixed root questions, use <a href="/courses/maths4u-9231-fp1/topics/fp1_roots_symmetric_sums">symmetric sums of roots</a>.</p>',
 r'''<h3>Expand the summand first</h3><p>Products of linear or quadratic expressions become combinations of standard power sums. Keep constant terms visible until the number of indices is known.</p>
 <h3>Moving limits</h3><p>If \(F(m)=\sum_{r=1}^m u_r\), then</p>\[\sum_{r=a}^b u_r=F(b)-F(a-1).\]<p>The lower subtraction ends at \(a-1\), because the term at \(a\) belongs to the requested sum. This remains true when the limits involve \(n\) or \(n^2\). For a polynomial summand, substitute the complete upper and lower totals before expanding.</p>
 <h3>Weights and alternating signs</h3><p>Group by the index pattern. Pair an odd term with the following even term; or start with all terms and correct the selected group. Reversing the sign of a group means subtracting twice its original contribution.</p>
 <h3>Recovering a sequence</h3>\[u_n=F(n)-F(n-1).\]<p>Check the first term using the actual initial total. A formula valid for later differences can miss the first term if the assumed \(F(0)\) is not the empty sum.</p>
 <h3>Root data can be constants in a sum</h3><p>For \(d\) roots with power totals \(p_1,p_2\), expanding \(\sum_i(r+\alpha_i)^2\) gives \(dr^2+2p_1r+p_2\). Find those root totals first, then apply linearity. Do not assume the roots are real unless that is given.</p>''',
 r'<ol><li>Write the summand or a grouped pair as an explicit polynomial.</li><li>Calculate a prefix total using standard formulae.</li><li>Use the actual endpoint subtraction, or recover each term by a difference.</li><li>Check a small permitted value, counting every index once.</li></ol>',
 ['An inclusive interval from a to b has b-a+1 terms.',
  'Subtracting F(a) loses the first requested term.',
  'Reversing signs requires twice the contribution of the selected group.',
  'A recovered formula must also agree with the first term.'],
 [
 ex('1 · Expand before summing',r'<p>Find \(\sum_{r=1}^n(2r-1)(r+3)\).</p>',
 r'\[(2r-1)(r+3)=2r^2+5r-3.\]<p>Therefore the total is</p>\[\frac{n(n+1)(2n+1)}3+\frac{5n(n+1)}2-3n=\frac{n(4n^2+21n-1)}6.\]<p>For \(n=1\), both the original term and the formula give \(4\).</p>','E-F1'),
 ex('2 · Control both moving endpoints',r'<p>Find \(\sum_{r=n+2}^{3n+1}(2r+1)\).</p>',
 r'<p>A prefix total is \(F(m)=m(m+2)\). The requested sum is</p>\[F(3n+1)-F(n+1)=(3n+1)(3n+3)-(n+1)(n+3)=8n(n+1).\]<p>There are \(2n\) terms. At \(n=1\), the two terms are \(7\) and \(9\), giving \(16\).</p>','E-F2'),
 ex('3 · Pair alternating terms',r'<p>Let \(A_m=\sum_{r=1}^m(-1)^{r-1}(r+1)^2\). Find \(A_{2n}\) and \(A_{2n+1}\).</p>',
 r'<p>The jth pair is</p>\[(2j)^2-(2j+1)^2=-4j-1.\]<p>Thus</p>\[A_{2n}=-4\frac{n(n+1)}2-n=-n(2n+3).\]<p>For an odd total, add the next positive term:</p>\[A_{2n+1}=A_{2n}+(2n+2)^2=2n^2+5n+4.\]<p>The parity of the last index changes the answer; it cannot be ignored.</p>','E-F3'),
 ex('4 · Recover a term and a later block',r'<p>A sequence has partial sums \(S_n=n(n+2)(2n+1)\). Find its general term and the sum from index \(n+1\) to \(2n\).</p>',
 r'\[u_n=S_n-S_{n-1}=6n^2+4n-1.\]<p>At \(n=1\), this gives \(9=S_1\), so the first term is included correctly. The later block is</p>\[S_{2n}-S_n=n(14n^2+15n+2).\]<p>Its lower subtraction is \(S_n\), since the first required index is \(n+1\).</p>','E-F4')
 ]),
lesson('differences','Telescoping sums from differences',
 'Rewrite a summand so that the interior terms cancel and the boundaries remain.',
 'Use partial fractions and exact differences to calculate a finite sum without losing boundary terms.',
 r'<p>You need <a href="/courses/maths4u-9231-fp1/topics/fp1_series_finite_sums">finite limits</a> and algebraic fractions. Review division and excluded inputs in <a href="/courses/maths4u-9231-fp1/topics/fp1_rational_asymptotes">rational functions</a>.</p>',
 r'''<h3>Expose a difference</h3><p>Partial fractions often turn a rational summand into \(F(r)-F(r+1)\). Sum a finite block first:</p>\[\sum_{r=a}^b[F(r)-F(r+1)]=F(a)-F(b+1).\]<p>Write at least the first and last few terms. This makes the direction of the subtraction visible.</p>
 <h3>A larger gap leaves more terms</h3><p>For a positive integer \(h\),</p>\[\sum_{r=a}^b[F(r)-F(r+h)]=\sum_{j=0}^{h-1}F(a+j)-\sum_{j=1}^{h}F(b+j).\]<p>This formula also handles short blocks: overlapping boundary terms cancel again. A gap of three generally leaves three terms at each end, not just one.</p>
 <h3>Find the right decomposition</h3><p>For distinct linear factors, use \(\frac{A}{ar+b}+\frac{B}{ar+c}\) and equate numerators. With three factors, a difference of two two-factor fractions may reveal cancellation faster. Polynomial division may be needed before partial fractions.</p>
 <h3>The method is wider than simple fractions</h3><p>A difference can contain powers, radicals, factorials, logarithms or geometric factors. Verify the proposed identity in the original domain before summing it. If \(F(r)\) tends to a non-zero constant, retain that boundary limit when moving to an infinite series.</p>
 <p>A finite answer is the starting point for convergence. The next lesson explains when its limit exists and how to control the remainder.</p>''',
 r'<ol><li>Factor and check the domain of the original summand.</li><li>Obtain and verify a partial-fraction or difference identity.</li><li>Write enough terms to see the cancellation pattern.</li><li>Keep all surviving endpoints and simplify the finite expression.</li></ol>',
 ['The size of the index gap controls how many endpoints survive.',
  'A reversed difference reverses the sign of the whole sum.',
  'Never subtract two separate divergent infinite sums.',
  'The upper boundary is evaluated beyond the last index when the difference uses r+1.'],
 [
 ex('1 · A scaled partial fraction',r'<p>Find \(\sum_{r=1}^n\frac6{(2r+1)(2r+3)}\).</p>',
 r'\[\frac6{(2r+1)(2r+3)}=3\left(\frac1{2r+1}-\frac1{2r+3}\right).\]<p>After cancellation, the total is</p>\[3\left(\frac13-\frac1{2n+3}\right)=\frac{2n}{2n+3}.\]<p>The coefficient 3 multiplies both surviving terms.</p>','E-D1'),
 ex('2 · Keep three endpoints',r'<p>Find \(\sum_{r=1}^n\frac1{(r+2)(r+5)}\).</p>',
 r'\[\frac1{(r+2)(r+5)}=\frac13\left(\frac1{r+2}-\frac1{r+5}\right).\]<p>The gap is three. Hence</p>\[S_n=\frac13\left(\frac13+\frac14+\frac15-\frac1{n+3}-\frac1{n+4}-\frac1{n+5}\right).\]<p>This also works at \(n=1,2\), because any overlapping endpoints cancel within the displayed expression.</p>','E-D2'),
 ex('3 · A useful two-factor difference',r'<p>Find \(\sum_{r=1}^n\frac5{r(r+1)(r+2)}\).</p>',
 r'\[\frac5{r(r+1)(r+2)}=\frac52\left(\frac1{r(r+1)}-\frac1{(r+1)(r+2)}\right).\]<p>Only the first and last two-factor fractions remain:</p>\[S_n=\frac54-\frac5{2(n+1)(n+2)}.\]','E-D3'),
 ex('4 · A geometric factor in a difference',r'<p>Find \(\sum_{r=1}^n\frac{r+2}{2^r r(r+1)}\).</p>',
 r'<p>Use \(F(r)=2^{1-r}/r\). Combining over a common denominator gives</p>\[F(r)-F(r+1)=\frac{r+2}{2^r r(r+1)}.\]<p>Thus</p>\[S_n=F(1)-F(n+1)=1-\frac1{2^n(n+1)}.\]<p>Checking the first term gives \(3/4\), agreeing with the formula at \(n=1\).</p>','E-D4')
 ]),
lesson('convergence','Convergence, remainders and bounds',
 'Take limits of complete partial sums and justify accuracy and exceptional cases.',
 'Determine whether a series converges, find its sum and prove the required error or boundary condition.',
 r'<p>Review <a href="/courses/maths4u-9231-fp1/topics/fp1_series_differences">telescoping sums</a>, geometric limits and inequalities.</p>',
 r'''<h3>A series is defined by its partial sums</h3><p>Write \(S_n=\sum_{r=a}^n u_r\). The infinite series converges to \(S\) when \(S_n\) has the finite limit \(S\). A necessary condition is \(u_r\to0\), but this condition alone does not prove convergence.</p>
 <h3>Keep the final boundary limit</h3><p>If \(u_r=F(r)-F(r+1)\) and \(F(r)\to L\), then the sum is \(F(a)-L\). It is only \(F(a)\) when \(L=0\). With a gap \(h\), all \(h\) final boundary terms must be included.</p>
 <h3>Remainders and least integers</h3>\[R_n=S-S_n.\]<p>Derive this exactly before estimating it. If the error can have either sign, use \(|R_n|\). For a strict accuracy condition, equality does not count. After solving for a real threshold, test both the claimed least integer and the previous allowed integer.</p>
 <h3>Parameters and divergence</h3><p>Test exceptional parameter values in the original terms. A factor may vanish at an endpoint even when a usual geometric condition fails. Periodic partial sums with two different subsequential values do not converge.</p>
 <h3>Moving blocks and bounds</h3><p>Write a moving block as a difference of prefix sums before taking its limit. A block can tend to zero while a scaled block tends to a non-zero value. To prove an inequality for every positive integer, compare the exact positive denominators rather than just checking the limiting value.</p>''',
 r'<ol><li>Obtain the full finite partial sum.</li><li>Check its limit and any exceptional parameter values.</li><li>Subtract to get the exact remainder, keeping the stated sign or absolute value.</li><li>Prove a bound or least-index claim, including equality and the previous integer.</li></ol>',
 ['Terms tending to zero do not by themselves prove convergence.',
  'A non-zero boundary limit must not be discarded.',
  'Round a strict threshold in the correct direction and test the preceding integer.',
  'A geometric difference can have exceptional convergent endpoints.'],
 [
 ex('1 · An exact remainder and a strict cutoff',r'<p>For \(S_n=\sum_{r=1}^n\frac2{(r+2)(r+3)}\), find the infinite sum and the least \(n\) such that \(S-S_n&lt;1/200\).</p>',
 r'\[S_n=\frac23-\frac2{n+3},\qquad S=\frac23,\qquad R_n=\frac2{n+3}.\]<p>The strict inequality gives \(n+3&gt;400\). Therefore the least integer is \(n=398\). At \(397\) the error is exactly \(1/200\), so it fails; at \(398\) the error is \(2/401&lt;1/200\).</p>','E-C1'),
 ex('2 · A boundary which tends to a non-zero value',r'<p>Let \(F(r)=\frac{2r+5}{r+2}\) and \(u_r=F(r+1)-F(r)\). Find the infinite sum starting at \(r=1\).</p>',
 r'\[F(r)=2+\frac1{r+2},\qquad u_r=-\frac1{(r+2)(r+3)}.\]<p>The finite sum is \(F(n+1)-F(1)=1/(n+3)-1/3\). Since \(F(n+1)\to2\) and \(F(1)=7/3\), the sum is</p>\[S=2-\frac73=-\frac13.\]<p>The negative sign agrees with the sign of every term.</p>','E-C2'),
 ex('3 · Check a geometric endpoint separately',r'<p>For real \(q\), define \(u_r=q^r-q^{r+1}\), \(r\ge1\). Determine all \(q\) for which the series converges and give its sum.</p>',
 r'\[S_n=q-q^{n+1}.\]<p>For \(-1&lt;q&lt;1\), the final power tends to zero, so \(S=q\). At \(q=1\), every original term is zero and the sum is \(0\). At \(q=-1\), the partial sums alternate; for \(|q|&gt;1\), they cannot have a finite limit. Thus the convergence set is \((-1,1]\), with the endpoint sum stated separately.</p>','E-C3'),
 ex('4 · A moving block and a uniform bound',r'<p>For \(u_r=\frac3{(r+2)(r+3)}\), find \(\lim_{n\to\infty}n\sum_{r=2n+1}^{5n}u_r\) and give a strict bound for the unscaled block.</p>',
 r'\[\sum_{r=2n+1}^{5n}u_r=3\left(\frac1{2n+3}-\frac1{5n+3}\right)=\frac{9n}{(2n+3)(5n+3)}.\]<p>Multiplying by \(n\) and taking the limit gives \(9/10\). Since the denominator is greater than \(10n^2\) for \(n&gt;0\),</p>\[0&lt;\sum_{r=2n+1}^{5n}u_r&lt;\frac9{10n}.\]','E-C4')
 ])
]
