"""Independently written teaching text; no textbook examples are reproduced."""
def example(title, question, solution, verification):
    return dict(title=title, question=question, solution=solution, verification=verification)

def lesson(key, title, summary, objective, before, ideas, method, mistakes, examples):
    return dict(key=key, id='fp1_rational_'+key.replace('-','_'), title=title,
                summary=summary, objective=objective, before=before, ideas=ideas,
                method=method, mistakes=mistakes, examples=examples)

lessons=[
lesson('asymptotes','Asymptotes and curve sketching',
 'Build a sketch from the domain, polynomial division and one-sided limits.',
 'Identify genuine asymptotes and combine exact features into a consistent sketch.',
 r'<p>You need polynomial division, factorisation and differentiation. Review <a href="/courses/maths4u-9231-fp1/topics/fp1_roots_coefficients">roots and coefficients</a> when finding intercepts.</p>',
 r'''<p>A rational function is a quotient \(f(x)=P(x)/Q(x)\) of polynomials. Start with \(Q(x)\ne0\). A cancelled factor leaves a missing input in the original domain.</p>
 <h3>Poles and missing points</h3><p>If \(Q(h)=0\) and \(P(h)\ne0\), the graph has a vertical asymptote \(x=h\). Determine the sign of the unbounded value separately on each side. If factors cancel, inspect the remaining expression: cancellation may leave a finite hole instead.</p>
 <h3>What happens far away?</h3><p>Write \(P=QS+R\), with \(\deg R&lt;\deg Q\). Then</p>\[f(x)=S(x)+\frac{R(x)}{Q(x)}.\]<p>The final term tends to zero. A constant \(S\) gives a horizontal asymptote; a linear \(S=mx+c\) gives an oblique asymptote. A higher-degree quotient is not a straight-line asymptote. When \(\deg P&lt;\deg Q\), the horizontal asymptote is \(y=0\).</p>
 <h3>A sketch is a collection of checked facts</h3><p>Find admissible zeros of \(P\), the value at \(x=0\) when defined, and the stationary points. A horizontal asymptote can be crossed: solve \(f(x)=c\) rather than treating the height \(c\) as forbidden. Never join branches across an excluded input.</p>''',
 r'<ol><li>Record the original domain and factor both polynomials.</li><li>Divide to identify the asymptote at infinity.</li><li>Calculate intercepts, stationary points and one-sided limits.</li><li>Draw separate branches, label exact coordinates and check their directions.</li></ol>',
 ['A denominator zero is not automatically a vertical asymptote after cancellation.',
  'An asymptote describes limiting behaviour; it does not forbid a crossing.',
  'An open circle must retain the excluded input even when the simplified expression is a line.',
  'A sketch must show the sign of each approach to a pole, not just a dashed line.'],
 [
 example('1 · Division reveals the branches',r'<p>Find the asymptotes and axis intersections of \(f(x)=\frac{2x^2-3x+4}{x+2}\).</p>',
 r'\[f(x)=2x-7+\frac{18}{x+2}.\]<p>The domain excludes \(-2\); the numerator there is \(18\), so \(x=-2\) is a vertical asymptote. The oblique asymptote is \(y=2x-7\). As \(x\to-2^-\), \(f(x)\to-\infty\); from the right it tends to \(+\infty\). The numerator has discriminant \(9-32=-23\), so there are no real x-intercepts. The y-intercept is \((0,2)\).</p>','E-A1'),
 example('2 · A hole is different from a pole',r'<p>Describe the graph of \(f(x)=\frac{x^2-x-6}{x-3}\).</p>',
 r'\[x^2-x-6=(x-3)(x+2).\]<p>Thus \(f(x)=x+2\) for \(x\ne3\). Draw the line with an open circle at \((3,5)\). There is no vertical asymptote at \(3\): the limit is \(5\), not infinity. The original expression still has no value at that input.</p>','E-A2'),
 example('3 · Crossing a horizontal asymptote',r'<p>Find the horizontal asymptote of \(f(x)=\frac{3x^2+x+5}{x^2+1}\), and determine whether the graph crosses it.</p>',
 r'\[f(x)=3+\frac{x+2}{x^2+1}.\]<p>The denominator is positive for every real input. The remainder tends to zero, so the asymptote is \(y=3\). Setting \(f(x)=3\) gives \(x+2=0\), hence the crossing is \((-2,3)\). The sign of \(x+2\) changes there, so this is a crossing rather than just a contact.</p>','E-A3'),
 example('4 · Complete the branch information',r'<p>Find and classify the stationary points of \(f(x)=\frac{x^2-4x+7}{x-2}\), and state its asymptotes.</p>',
 r'\[f(x)=x-2+\frac3{x-2},\qquad f^\prime(x)=1-\frac3{(x-2)^2}.\]<p>The asymptotes are \(x=2\) and \(y=x-2\). The stationary inputs are \(2\pm\sqrt3\), giving points \((2-\sqrt3,-2\sqrt3)\) and \((2+\sqrt3,2\sqrt3)\). The derivative changes from positive to negative at the left point (maximum), and from negative to positive at the right point (minimum). Each branch stays on its own side of the vertical asymptote.</p>','E-A4')
 ]),
lesson('ranges','Ranges and stationary points',
 'Find attained heights and distinguish an endpoint from an unattained limit.',
 'Use discriminants, derivatives and domain checks to give the complete exact range.',
 r'<p>Review <a href="/courses/maths4u-9231-fp1/topics/fp1_rational_asymptotes">asymptotes</a>, quadratic discriminants and solving inequalities.</p>',
 r'''<p>The range is the set of output values actually attained by an allowed input. A limiting height need not belong to the range, and a horizontal asymptote is not automatically excluded.</p>
 <h3>Turn an output into an existence question</h3><p>Set \(y=P(x)/Q(x)\) and rearrange to \(yQ(x)-P(x)=0\), keeping \(Q(x)\ne0\). If the equation is quadratic in \(x\), real candidates require a non-negative discriminant. Check values of \(y\) for which the quadratic coefficient vanishes separately: the equation may become linear, contradictory or identically true.</p>
 <h3>Stationary points and boundaries</h3><p>A zero of \(f^\prime\) is relevant only within the domain. A sign change from \(+\) to \(-\) gives a local maximum; the reverse gives a local minimum. On a restricted domain, inspect its endpoints and limiting values too. Include an output endpoint only when some permitted input attains it.</p>
 <h3>Check every candidate input</h3><p>A discriminant calculation creates candidates, not permission to use a pole or a cancelled input. Substitute back into the original domain. An excluded input can remove an otherwise attainable-looking height.</p>''',
 r'<ol><li>State the domain and write an equation for a general output \(y\).</li><li>Use its discriminant or an exact inequality to find candidate heights.</li><li>Check degenerate equations, poles and restricted endpoints.</li><li>Give a complete set of heights with correct open or closed boundaries.</li></ol>',
 ['The sign of the derivative alone does not decide whether an endpoint is attained.',
  'Do not divide by the leading coefficient in the output equation before checking when it is zero.',
  'A range contains y-values, not the x-coordinates of stationary points.',
  'The original domain remains in force after clearing denominators.'],
 [
 example('1 · A gap in the range',r'<p>Find the exact range of \(f(x)=x+\frac9x\), for \(x\ne0\).</p>',
 r'\[x^2-yx+9=0,\qquad \Delta=y^2-36.\]<p>A real input exists precisely when \(y\le-6\) or \(y\ge6\). No candidate input can be \(0\), since the constant term is \(9\). The endpoints are attained at \(x=-3\) and \(x=3\). Thus the range is \((-\infty,-6]\cup[6,\infty)\).</p>','E-R1'),
 example('2 · A limit which is never reached',r'<p>Find the range of \(f(x)=\frac{2x^2+7}{x^2+1}\).</p>',
 r'\[f(x)=2+\frac5{x^2+1}.\]<p>Since \(x^2+1\ge1\), the fraction is positive and at most \(5\). Its largest value is attained at \(x=0\), but it is never zero. The range is therefore \((2,7]\). The asymptote \(y=2\) is excluded here because the remainder cannot vanish.</p>','E-R2'),
 example('3 · Do not lose the linear case',r'<p>Find the range of \(f(x)=\frac{x^2+2x+2}{x^2+1}\) using a discriminant.</p>',
 r'\[(y-1)x^2-2x+(y-2)=0.\]<p>For \(y\ne1\), the discriminant condition is</p>\[4-4(y-1)(y-2)\ge0\quad\Longleftrightarrow\quad y^2-3y+1\le0.\]<p>The boundary values are \((3-\sqrt5)/2\) and \((3+\sqrt5)/2\). At \(y=1\), the equation becomes \(-2x-1=0\), which has the allowed input \(-1/2\). The denominator is always positive, and both boundary values are attained. The full range is \(\left[\frac{3-\sqrt5}{2},\frac{3+\sqrt5}{2}\right]\).</p>','E-R3'),
 example('4 · An open input boundary changes the range',r'<p>Find the range of \(f(x)=x+\frac4x\) on \(0&lt;x&lt;2\).</p>',
 r'\[f^\prime(x)=1-\frac4{x^2}&lt;0\qquad(0&lt;x&lt;2).\]<p>The function is continuous and strictly decreasing on this domain. It tends to \(+\infty\) as \(x\to0^+\), and to \(4\) as \(x\to2^-\). The input \(2\) is excluded and there is no other input in this interval giving \(4\). Hence the range is \((4,\infty)\).</p>','E-R4')
 ]),
lesson('parameters','Parameter families and reconstruction',
 'Recover coefficients and identify the exceptional members of a family.',
 'Translate graph features into coefficient equations without losing cancellation cases.',
 r'<p>Use <a href="/courses/maths4u-9231-fp1/topics/fp1_rational_asymptotes">polynomial division and asymptotes</a> and <a href="/courses/maths4u-9231-fp1/topics/fp1_rational_ranges">stationary points</a>.</p>',
 r'''<p>A useful form for a quadratic numerator over a linear denominator is</p>\[f(x)=mx+c+\frac{R}{x-h},\qquad x\ne h.\]<p>Expanding \((mx+c)(x-h)+R\) reconstructs the numerator. A given point supplies another equation; a stationary input supplies \(f^\prime(x)=0\).</p>
 <h3>Parameters can change the graph type</h3><p>If \(R=0\), the apparent pole becomes a missing point on a line. This exceptional case must be considered before claiming a vertical asymptote. If \(m&gt;0\),</p>\[f^\prime(x)=m-\frac{R}{(x-h)^2}.\]<p>There are two stationary inputs when \(R&gt;0\), and none when \(R\le0\). At \(R=0\), the domain still excludes \(h\).</p>
 <h3>Reconstruction and tangency</h3><p>A double numerator root can give tangency to the x-axis only if the denominator is non-zero there. A numerator zero at a cancelled pole does not give a point of contact. Check that reconstructed coefficients satisfy all the original features, including a genuine pole.</p>''',
 r'<ol><li>Write an identity based on the asymptote or factorisation.</li><li>Use points, zeros or stationary inputs to solve for the remaining parameters.</li><li>Separate zero remainders and vanishing coefficients.</li><li>Verify each condition in the original rational function and classify the resulting branches.</li></ol>',
 ['Matching an oblique asymptote gives two coefficient conditions, not the whole numerator.',
  'An excluded input cannot be a stationary point or an intercept.',
  'Include the equality case when a parameter makes the derivative constant.',
  'A positive discriminant is not enough if a candidate lies at a pole.'],
 [
 example('1 · Reconstruct from asymptotes and a point',r'<p>The curve \(f(x)=\frac{ax^2+bx+c}{x-1}\) has oblique asymptote \(y=2x+5\) and passes through \((0,-3)\). Find \(a,b,c\).</p>',
 r'\[ax^2+bx+c=(2x+5)(x-1)+R=2x^2+3x+(R-5).\]<p>Thus \(a=2\), \(b=3\). At \(x=0\), \(f(0)=-c=-3\), so \(c=3\) and \(R=8\). The non-zero remainder confirms the vertical asymptote \(x=1\).</p>','E-P1'),
 example('2 · A family with an exceptional line',r'<p>For \(f_k(x)=\frac{x^2+k}{x-2}\), find all \(k\) for which there are no stationary points. Describe the exceptional graph.</p>',
 r'\[f_k(x)=x+2+\frac{k+4}{x-2},\qquad f_k^\prime(x)=1-\frac{k+4}{(x-2)^2}.\]<p>If \(k+4&gt;0\), there are two stationary inputs. If \(k+4\le0\), the derivative is positive everywhere in the domain, so the answer is \(k\le-4\). At \(k=-4\), the graph is the line \(y=x+2\) with a hole at \((2,4)\); the missing input remains excluded.</p>','E-P2'),
 example('3 · Use a repeated intercept',r'<p>The curve \(f(x)=\frac{x^2+bx+c}{x+1}\) touches the x-axis at \(x=2\). Find \(b,c\) and check that the point is on the curve.</p>',
 r'<p>Touching the x-axis requires a repeated numerator root, so</p>\[x^2+bx+c=(x-2)^2=x^2-4x+4.\]<p>Hence \(b=-4\), \(c=4\). The denominator at \(2\) is \(3\), so \((2,0)\) is permitted. Locally \(f(x)\ge0\), confirming tangency rather than a crossing.</p>','E-P3'),
 example('4 · A stationary input fixes a remainder',r'<p>A curve has form \(f(x)=x+1+\frac{A}{x+2}\) and a stationary point at \(x=1\). Determine \(A\) and both stationary points.</p>',
 r'\[f^\prime(x)=1-\frac{A}{(x+2)^2}.\]<p>At \(1\), the derivative is zero, so \(A=9\). The stationary equation is \((x+2)^2=9\), giving \(x=-5,1\). Substitution gives \((-5,-7)\) and \((1,5)\). The derivative changes \(+\to-\) at the first (maximum) and \(-\to+\) at the second (minimum).</p>','E-P4')
 ]),
lesson('modulus','Modulus and inequalities',
 'Keep poles separate from equality boundaries in a complete sign analysis.',
 'Solve rational and modulus inequalities with every endpoint and domain restriction checked.',
 r'<p>Review <a href="/courses/maths4u-9231-fp1/topics/fp1_rational_asymptotes">domains and branch signs</a> and quadratic inequalities.</p>',
 r'''<p>Multiplying an inequality by an expression of unknown sign can reverse it. Use a sign chart, or multiply by a square known to be positive on the domain, retaining the excluded inputs.</p>
 <h3>Modulus of an output</h3><p>The graph \(y=|f(x)|\) keeps the non-negative portions and reflects negative portions in the x-axis. For \(c&gt;0\),</p>\[|f(x)|&lt;c\iff -c&lt;f(x)&lt;c.\]<p>Equivalently, square both sides when both sides are non-negative. The squared inequality still excludes every original pole. For \(\le\), include valid equality inputs; a pole is never an equality input.</p>
 <h3>Modulus of an input</h3><p>The graph \(y=f(|x|)\) uses the original right-hand half, reflected in the y-axis. Set \(u=|x|\ge0\), solve for \(u\), then reflect the allowed set. This is different from reflecting negative outputs. A cusp at \(0\) is possible; if \(f^\prime(0)=0\), inspect the local expression before calling it a corner.</p>
 <h3>Read the literal inequality</h3><p>An auxiliary rational graph may have poles even when the actual inequality contains no division. Decide its domain from the stated inequality. For example, comparing two absolute polynomial expressions does not introduce excluded inputs.</p>''',
 r'<ol><li>State the domain of the actual expression.</li><li>Find all zero boundaries and poles; order them exactly.</li><li>Test the sign on each interval, or use an equivalent non-negative square comparison.</li><li>Include allowed equality boundaries for non-strict inequalities and give the whole union.</li></ol>',
 ['Do not multiply by a denominator without considering its sign.',
  'An auxiliary pole need not be excluded from an inequality which originally has no denominator.',
  r'Reflecting the right-hand half describes \(f(|x|)\); it does not describe \(|f(x)|\).',
  'Keep strict endpoints open and never include a genuine pole.'],
 [
 example('1 · A sign chart with an included zero',r'<p>Solve \(\frac{x-2}{x+1}\ge0\).</p>',
 r'<p>The critical inputs are \(-1\) (excluded) and \(2\) (a zero). The signs on the three intervals are \(+,-,+\). The zero at \(2\) is allowed because the inequality is non-strict. Thus</p>\[x\in(-\infty,-1)\cup[2,\infty).\]','E-M1'),
 example('2 · Square only after recording the domain',r'<p>Solve \(\left|\frac{x-1}{x+2}\right|&lt;2\).</p>',
 r'<p>First exclude \(x=-2\). Since both sides are non-negative, squaring is equivalent:</p>\[(x-1)^2&lt;4(x+2)^2\iff3(x+1)(x+5)&gt;0.\]<p>The solution is \((-\infty,-5)\cup(-1,\infty)\). The original pole already lies outside this set; it must still be checked explicitly.</p>','E-M2'),
 example('3 · Reflect an input solution set',r'<p>For \(f(u)=\frac{u+1}{u-3}\), solve \(f(|x|)\le-1\).</p>',
 r'<p>Put \(u=|x|\ge0\), with \(u\ne3\). Then</p>\[\frac{u+1}{u-3}+1=\frac{2(u-1)}{u-3}\le0.\]<p>The allowed non-negative inputs are \(1\le u&lt;3\). Reflecting this interval gives</p>\[x\in(-3,-1]\cup[1,3).\]','E-M3'),
 example('4 · Do not invent a domain restriction',r'<p>Solve the literal inequality \(|x+2|\ge|x-1|\).</p>',
 r'<p>Both sides are defined for every real \(x\). Squaring gives</p>\[(x+2)^2-(x-1)^2=6x+3\ge0.\]<p>Thus \(x\ge-1/2\). If a quotient were used to compare the two sides, its extra excluded inputs would have to be checked separately; the original inequality includes \(x=1\).</p>','E-M4')
 ]),
lesson('relationships','Relationships between curves',
 'Compare related curves without discarding inherited holes or sign cases.',
 'Determine domains, real branches and exact comparison sets for related rational curves.',
 r'<p>Use <a href="/courses/maths4u-9231-fp1/topics/fp1_rational_modulus">rational sign charts</a> and <a href="/courses/maths4u-9231-fp1/topics/fp1_rational_ranges">range and endpoint checks</a>.</p>',
 r'''<h3>A reciprocal keeps the original restrictions</h3><p>If \(g=1/f\) is defined from an existing function, its domain is the domain of \(f\) with all zeros of \(f\) removed. Simplifying \(1/f\) does not fill the original holes. Non-zero stationary values map from \(y\) to \(1/y\), since</p>\[g^\prime(x)=-\frac{f^\prime(x)}{f(x)^2}.\]
 <h3>A square-root relation has two branches</h3><p>The relation \(y^2=f(x)\) has real points only where \(f(x)\ge0\). It contains both \(y=\sqrt{f(x)}\) and \(y=-\sqrt{f(x)}\), meeting where \(f=0\). An isolated admissible input can give an isolated real point. This relation is different from \(y=|f(x)|\).</p>
 <h3>Compare by subtracting</h3><p>To decide which curve is higher, study \(g-f\) on their common domain. For a reciprocal comparison,</p>\[\frac1{f(x)}-f(x)=\frac{1-f(x)^2}{f(x)}.\]<p>The sign of \(f\) matters. Multiplying by \(f\) without a sign split loses valid intervals. Locate every zero boundary and pole of the difference before combining the solution set.</p>''',
 r'<ol><li>Find the common domain, including inherited exclusions.</li><li>Translate intercepts and stationary values only at valid inputs.</li><li>Subtract the expressions or determine where the square-root relation is real.</li><li>Check equality and exceptional inputs, then give all branches or intervals.</li></ol>',
 ['A simplified reciprocal may have a zero at an input which was excluded originally.',
  r'The equation \(y^2=f(x)\) has two real branches where \(f(x)&gt;0\).',
  r'An isolated zero of \(f\) can survive as an isolated point of the relation.',
  r'A reciprocal inequality cannot be multiplied by \(f(x)\) without knowing its sign.'],
 [
 example('1 · A reciprocal with an inherited hole',r'<p>Let \(f(x)=\frac{x-1}{x+2}\) on its natural domain and define \(g=1/f\). State the domain and graph features of \(g\).</p>',
 r'\[g(x)=\frac{x+2}{x-1},\qquad x\notin\{-2,1\}.\]<p>The input \(-2\) remains excluded from the definition of \(f\), while \(1\) is excluded because \(f(1)=0\). The graph has a vertical asymptote \(x=1\), horizontal asymptote \(y=1\), and an open circle at \((-2,0)\). That open circle is not an x-intercept.</p>','E-T1'),
 example('2 · A relation is not a single function',r'<p>Find the real x-domain and branches of \(y^2=\frac{x-1}{x+2}\).</p>',
 r'<p>The quotient must be non-negative and its denominator non-zero. Its sign chart gives</p>\[x\in(-\infty,-2)\cup[1,\infty).\]<p>For interior inputs both \(y=\sqrt{(x-1)/(x+2)}\) and its negative occur. They meet at \((1,0)\). No real points exist for \(-2&lt;x&lt;1\), and \(x=-2\) is excluded.</p>','E-T2'),
 example('3 · Compare a function with its reciprocal',r'<p>For \(f(x)=\frac{x-2}{x+1}\), solve \(1/f(x)&gt;f(x)\).</p>',
 r'<p>The common domain excludes \(-1\) and \(2\). Subtract without multiplying by an unknown sign:</p>\[\frac1f-f=\frac{(x+1)^2-(x-2)^2}{(x-2)(x+1)}=\frac{3(2x-1)}{(x-2)(x+1)}.\]<p>The critical inputs are \(-1,1/2,2\). The positive intervals give</p>\[x\in(-1,1/2)\cup(2,\infty).\]<p>The equality input \(1/2\) is excluded because the comparison is strict.</p>','E-T3'),
 example('4 · Shared asymptotes do not force intersections',r'<p>Compare \(f(x)=x+5+\frac4{x-1}\) and \(g(x)=x+5+\frac9{x-1}\).</p>',
 r'\[g(x)-f(x)=\frac5{x-1}.\]<p>The curves share \(x=1\) and \(y=x+5\) as asymptotes. The difference is never zero, so they do not intersect. For \(x&lt;1\), \(g\) is below \(f\); for \(x&gt;1\), \(g\) is above \(f\). The common pole is excluded from both curves.</p>','E-T4')
 ])
]
