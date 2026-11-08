"""Independently written 9709 P1 teaching; book is an ordering reference only."""
import sympy as s

x = s.Symbol('x', real=True)
lessons, questions, models = [], [], []

def example(title, question, solution, verification):
    return dict(title=title, question=question, solution=solution, verification=verification)

def lesson(key, suffix, title, summary, objective, before, ideas, method, mistakes, examples):
    lessons.append(dict(key=key, id='orig_quadratics_'+suffix, title=title,
                        summary=summary, objective=objective, before=before, ideas=ideas,
                        method=method, mistakes=mistakes, examples=examples))

lesson('equations', 'factorisation', 'Quadratic equations and valid roots',
       'Choose between factors, the formula and a substitution, then check every root.',
       'Solve quadratic equations and equations quadratic in another expression, giving every valid real solution.',
       r'<p>You should be able to expand brackets, factorise simple expressions and simplify square roots.</p>',
       r'''<h3>Start with an equation equal to zero</h3><p>A quadratic equation is \(ax^2+bx+c=0\), where \(a\ne0\). Rearrange before identifying the coefficients. Factorisation is efficient when factors are accessible; completing the square reveals structure; the formula works for every quadratic.</p>
       <h3>Factors give alternatives</h3><p>If \(A(x)B(x)=0\), at least one factor is zero. Solve both. Dividing by a factor involving \(x\) can discard a solution.</p>
       <h3>The quadratic formula</h3>\[x=\frac{-b\pm\sqrt{b^2-4ac}}{2a}.\]<p>The whole numerator is divided by \(2a\). Keep exact fractions and surds unless a decimal approximation is requested.</p>
       <h3>A quadratic in a different expression</h3><p>For powers \(x^4,x^2,1\), set \(u=x^2\). Solve for \(u\), keep \(u\ge0\), then recover all \(x\)-values. For \(u=\sqrt{x}\), impose \(u\ge0\) and recover \(x=u^2\). A reciprocal expression also has a non-zero denominator restriction.</p>''',
       r'''<ol><li>Record restrictions from the original equation.</li><li>Rearrange and choose a method. If substituting, state the new variable and its domain.</li><li>Solve every branch and reverse the substitution.</li><li>Substitute candidates into the original equation; give the complete valid set.</li></ol><p>A root rejected for a negative square-root variable cannot be recovered by squaring it. In a length model, reject values that make a stated length non-positive.</p>''',
       ['Do not cancel a possible zero factor before considering it.',
        'Use the original denominator restriction after cancellation.',
        'Keep both signs when a positive square has two real square roots.',
        'A principal square root cannot be negative.'], [
       example('Factor after rearranging', r'<p>Solve \(2x^2+3=7x\).</p>',
               r'\[2x^2-7x+3=(2x-1)(x-3)=0.\]<p>Thus \(x=\tfrac12\) or \(x=3\). Both satisfy the equation before rearrangement.</p>', 'EQ-FACTORS'),
       example('Exact answers from the formula', r'<p>Solve \(3x^2+2x-4=0\) exactly.</p>',
               r'<p>Here \(a=3,b=2,c=-4\), so the discriminant is \(52\).</p>\[x=\frac{-2\pm\sqrt{52}}6=\frac{-1\pm\sqrt{13}}3.\]<p>Both values are needed. Their sum is \(-\tfrac23\) and their product is \(-\tfrac43\), matching the coefficients.</p>', 'EQ-FORMULA'),
       example('Solve the substituted equation, then return to x', r'<p>Find all real solutions of \(x^4-13x^2+36=0\).</p>',
               r'<p>Put \(u=x^2\ge0\).</p>\[u^2-13u+36=(u-4)(u-9)=0.\]<p>Both values of \(u\) are allowed. From \(x^2=4\) or \(x^2=9\),</p>\[x\in\{-3,-2,2,3\}.\]<p>Each substituted value produces two roots.</p>', 'EQ-SUBSTITUTION'),
       example('Respect a square-root restriction', r'<p>Solve \(x-2\sqrt{x}-8=0\) for real \(x\).</p>',
               r'<p>Set \(u=\sqrt{x}\ge0\). Then</p>\[u^2-2u-8=(u-4)(u+2)=0.\]<p>Reject \(u=-2\). The allowed value \(u=4\) gives \(x=16\). Check: \(16-2(4)-8=0\). Squaring the rejected value would introduce a false answer.</p>', 'EQ-ROOT-DOMAIN')])

lesson('square', 'completing_square', 'Completing the square, graphs and range',
       'Use the square form to find exact roots, the vertex and values on a restricted domain.',
       'Complete the square with any non-zero leading coefficient and interpret the graph, extrema and range.',
       '<p>Recall how to expand a squared bracket and solve an equation with a square on one side.</p>',
       r'''<h3>Build a square without changing the expression</h3>\[x^2+px=\left(x+\frac p2\right)^2-\frac{p^2}4.\]<p>Adding a square inside a bracket requires an equal correction. For a leading coefficient other than one, factor it from the variable terms first.</p>
       \[ax^2+bx+c=a\left(x+\frac{b}{2a}\right)^2+c-\frac{b^2}{4a}.\]
       <h3>Read a quadratic graph</h3><p>In \(y=a(x-h)^2+k\), the vertex is \((h,k)\) and the symmetry line is \(x=h\). Positive \(a\) gives a minimum, negative \(a\) a maximum. Find the \(y\)-intercept with \(x=0\), and real \(x\)-intercepts by solving \(y=0\). These features guide a sketch.</p>
       <h3>Domain changes the conclusion</h3><p>On all real inputs, the range is \([k,\infty)\) for \(a>0\) or \((-\infty,k]\) for \(a<0\). On a closed interval, compare both endpoints and the vertex if it lies inside. An excluded endpoint may give a bound that is not attained.</p>''',
       r'''<ol><li>Factor the leading coefficient from the first two terms.</li><li>Halve the linear coefficient inside the bracket, square it and subtract the correction.</li><li>Apply the outside multiplier to that correction; expand to check.</li><li>For roots or level sets, isolate the square and count only inputs in the stated domain.</li></ol>''',
       ['The centre of (x + 3)² is −3.', 'Multiply the correction by the outside coefficient.',
        'The range contains output values, not input values.', 'A restricted domain can remove one of two algebraic roots.'], [
       example('Keep the outside multiplier', r'<p>Write \(3x^2-18x+32\) in square form and state its minimum.</p>',
               r'\[3(x^2-6x)+32=3\big((x-3)^2-9\big)+32=3(x-3)^2+5.\]<p>The minimum is \(5\), attained at \(x=3\). The vertex is \((3,5)\), so the graph has no real \(x\)-intercepts.</p>', 'CS-POSITIVE'),
       example('A negative multiplier gives a maximum', r'<p>Find the maximum of \(-2x^2+12x-13\) and where it occurs.</p>',
               r'\[-2(x^2-6x)-13=5-2(x-3)^2.\]<p>The subtracted square is non-negative, so the largest value is \(5\), at \(x=3\). The range on real inputs is \((-\infty,5]\).</p>', 'CS-NEGATIVE'),
       example('Use the square to solve exactly', r'<p>Solve \(2x^2-12x+11=0\).</p>',
               r'\[2(x-3)^2-7=0,\qquad (x-3)^2=\frac72.\]\[x=3\pm\frac{\sqrt{14}}2.\]<p>There are two distinct roots, symmetric about \(x=3\). Retaining a single sign would give an incomplete answer.</p>', 'CS-EXACT-ROOTS'),
       example('A restricted graph has unequal branches', r'<p>For \(f(x)=(x-2)^2+1\), \(0\le x\le5\), find the range and all levels \(t\) for which \(f(x)=t\) has two distinct solutions.</p>',
               r'<p>The vertex gives \(f(2)=1\), while \(f(0)=5\) and \(f(5)=10\). Hence the range is \([1,10]\). Both branches meet a horizontal level precisely when</p>\[1<t\le5.\]<p>At \(t=1\) there is just the vertex. At \(t=5\), the inputs \(0\) and \(4\) are both allowed. Above \(5\), only the right-hand branch remains in the domain.</p>', 'CS-RESTRICTED')])

lesson('discriminant', 'roots', 'The discriminant, parameters and tangency',
       'Count roots, find parameter conditions and check when the equation stops being quadratic.',
       'Use the discriminant for real-root conditions and tangency, including exceptional leading coefficients.',
       '<p>Recall the quadratic formula, inequalities and how to equate two expressions for y.</p>',
       r'''<h3>The sign under the square root</h3><p>For \(ax^2+bx+c=0\), \(a\ne0\), write \(\Delta=b^2-4ac\). Its sign determines the real roots:</p><table><thead><tr><th>Discriminant</th><th>Real solutions</th></tr></thead><tbody><tr><td>\(\Delta>0\)</td><td>Two distinct roots</td></tr><tr><td>\(\Delta=0\)</td><td>One repeated root</td></tr><tr><td>\(\Delta<0\)</td><td>No real roots</td></tr></tbody></table>
       <h3>Parameters and a changing degree</h3><p>First identify when \(a=0\). At such a value the equation may be linear, inconsistent or an identity; the quadratic discriminant rule does not decide it. For the other values, form and solve the required inequality in the parameter.</p>
       <h3>Touching and positivity</h3><p>Equate a line and a parabola, rearrange to zero, then use \(\Delta=0\) for tangency. Recover the point of contact from the repeated root. A quadratic is strictly positive for every real input exactly when \(a>0\) and \(\Delta<0\). For non-negative values, allow \(\Delta=0\).</p>''',
       r'''<ol><li>Form the actual equation whose roots or intersections are being counted.</li><li>Separate parameter values making its leading coefficient zero.</li><li>Match the wording to &gt;, =, &lt; or ≥ for the discriminant.</li><li>Solve the parameter condition and check its endpoints and exceptional cases.</li></ol>''',
       ['Real roots means Δ ≥ 0; distinct real roots means Δ > 0.',
        'For tangency, use the discriminant after substitution.',
        'Check a parameter value that makes the leading coefficient zero.',
        'No real roots does not on its own mean the quadratic is positive.'], [
       example('A complete parameter interval', r'<p>Find all \(k\) for which \(x^2-2kx+k+3=0\) has real roots.</p>',
               r'\[\Delta=4(k^2-k-3)\ge0.\]<p>The critical values are \(\tfrac{1-\sqrt{13}}2\) and \(\tfrac{1+\sqrt{13}}2\). The upward quadratic is non-negative outside its roots:</p>\[k\le\frac{1-\sqrt{13}}2\quad\text{or}\quad k\ge\frac{1+\sqrt{13}}2.\]<p>Both endpoints give repeated roots and are included.</p>', 'DR-INTERVAL'),
       example('Tangency uses the intersection equation', r'<p>Find \(c\) for which \(y=2x+c\) touches \(y=x^2-4x+7\), and find the contact point.</p>',
               r'\[x^2-6x+7-c=0,\qquad \Delta=36-4(7-c)=8+4c.\]<p>Tangency requires \(c=-2\). The repeated root is \(x=3\), and the line gives \(y=4\). The point is \((3,4)\).</p>', 'DR-TANGENT'),
       example('A positive discriminant can conceal a linear case', r'<p>Classify the number of real solutions of \((k-1)x^2-2kx+k+1=0\).</p>',
               r'<p>For \(k\ne1\),</p>\[\Delta=4k^2-4(k-1)(k+1)=4>0,\]<p>so there are two distinct real roots. For \(k=1\), the original equation is \(-2x+2=0\), with the single solution \(x=1\). That value must be handled separately.</p>', 'DR-LINEAR'),
       example('Strict positivity for every input', r'<p>Find all \(k\) such that \(2x^2-8x+k>0\) for every real \(x\).</p>',
               r'<p>The leading coefficient is positive. Strict positivity requires</p>\[64-8k<0,\qquad k>8.\]<p>Equivalently, \(2x^2-8x+k=2(x-2)^2+k-8\), whose minimum must be positive. At \(k=8\), the value at \(x=2\) is zero, so the endpoint is excluded.</p>', 'DR-POSITIVITY')])

lesson('inequalities', 'inequalities', 'Quadratic inequalities and constraints',
       'Find whole intervals, decide on endpoints and combine the required restrictions.',
       'Solve quadratic inequalities and parameter constraints using signs, graphs and boundary cases.',
       '<p>Recall factorisation, the direction of a parabola and interval notation.</p>',
       r'''<h3>Boundary roots divide the number line</h3><p>Rearrange the inequality so that zero is on one side. Solve the corresponding equation, then establish the sign on each interval. For an upward quadratic with roots \(r&lt;s\), the expression is negative between the roots and positive outside. A downward quadratic reverses those signs.</p>
       <h3>Strictness and repeated roots</h3><p>Include roots for ≤ or ≥ and exclude them for &lt; or &gt;. A repeated root touches zero without changing sign: \((x-r)^2\ge0\) for every real \(x\), but \((x-r)^2&lt;0\) has no solutions.</p>
       <h3>Combine conditions, do not replace them</h3><p>If another restriction is given, intersect its allowed inputs with the inequality solution. A comparison between a line and a curve is a sign condition on their difference. Parameter inequalities can be treated with the same number-line method after forming a discriminant.</p>''',
       r'''<ol><li>Bring all terms to one side and identify all boundary roots.</li><li>Sketch the parabola or test the sign in each interval.</li><li>Select intervals matching the inequality, then decide whether each root is included.</li><li>Intersect with the stated domain. List integers only if requested.</li></ol><p>Multiplying an inequality by an expression of unknown sign is unsafe without splitting cases. For rational comparisons, keep excluded denominator values.</p>''',
       ['The roots alone are boundaries, not the solution of an inequality.',
        'Multiplying by a negative number reverses the inequality.',
        'A repeated root does not cause a sign change.',
        'An integer list and a real interval answer different questions.'], [
       example('A closed interval between roots', r'<p>Solve \(2x^2-7x+3\le0\).</p>',
               r'\[2x^2-7x+3=(2x-1)(x-3).\]<p>The roots are \(\tfrac12\) and \(3\). The parabola opens upward, so it is non-positive between and at the roots:</p>\[\frac12\le x\le3.\]', 'IN-UPWARD'),
       example('Reverse the sign pattern for a downward parabola', r'<p>Solve \(-x^2+5x-6\ge0\).</p>',
               r'<p>Multiplying by \(-1\) reverses the inequality:</p>\[x^2-5x+6\le0,\qquad (x-2)(x-3)\le0.\]<p>Hence \(2\le x\le3\). Both endpoints make the original expression zero.</p>', 'IN-DOWNWARD'),
       example('A repeated boundary', r'<p>Solve \((x-4)^2&lt;0\), then solve \((x-4)^2\ge0\).</p>',
               r'<p>A real square cannot be negative, so the first inequality has no solutions. It is always non-negative, so the second is true for all real \(x\). The root \(4\) is a point of contact, not a crossing of the axis.</p>', 'IN-REPEATED'),
       example('Intersect a sign condition with a domain', r'<p>Find the real and integer solutions of \((x+2)(x-5)>0\), subject to \(-4\le x&lt;7\).</p>',
               r'<p>The product is positive for \(x&lt;-2\) or \(x>5\). Intersecting with the domain gives</p>\[[-4,-2)\cup(5,7).\]<p>The integer solutions are \(\{-4,-3,6\}\). The domain includes \(-4\) but excludes \(7\); the strict product inequality excludes \(-2\) and \(5\).</p>', 'IN-DOMAIN')])

lesson('simultaneous', 'simultaneous', 'Linear and quadratic simultaneous equations',
       'Use substitution to find matching coordinate pairs, intersections and contact points.',
       'Solve a linear equation with a quadratic relation and interpret complete pairs in graphs or models.',
       '<p>Recall rearranging a linear equation, substitution and quadratic solving.</p>',
       r'''<h3>Reduce two unknowns to one</h3><p>Use the linear equation to express one variable in terms of the other. Substitute into the quadratic relation, then solve the resulting equation. For each root, return to the same linear equation to recover its matching partner.</p>
       <h3>Intersections are pairs</h3><p>A common point satisfies both original equations. Two allowed roots normally give two points; a repeated root gives one point of contact. With parameters, check that the reduced equation is genuinely quadratic before using its discriminant.</p>
       <h3>Models add restrictions</h3><p>For two lengths, use the linear relation (for example, a perimeter) to eliminate a variable from the product relation (for example, an area). Keep both algebraic candidates until checking the original meaning and all dimensions.</p>''',
       r'''<ol><li>Rearrange the linear equation to avoid unnecessary fractions if possible.</li><li>Substitute carefully, retaining brackets around squared or multiplied expressions.</li><li>Solve the reduced equation completely.</li><li>Pair each root with its corresponding second coordinate; verify both equations.</li></ol>''',
       ['Do not combine an x-value from one root with the y-value from another.',
        'Substitute into every occurrence of the eliminated variable.',
        'A tangent gives one matched pair, not two distinct intersections.',
        'A model can exclude negative or zero lengths.'], [
       example('Recover both matched points', r'<p>Find the intersections of \(y=2x+1\) and \(y=x^2-x-3\).</p>',
               r'\[x^2-x-3=2x+1,\qquad (x-4)(x+1)=0.\]<p>At \(x=-1\), \(y=-1\); at \(x=4\), \(y=9\). The intersections are \((-1,-1)\) and \((4,9)\). Each pair satisfies both original equations.</p>', 'SY-PARABOLA'),
       example('A quadratic relation need not be y = f(x)', r'<p>Solve \(3x+y=7\) and \(xy=2\).</p>',
               r'<p>Use \(y=7-3x\):</p>\[x(7-3x)=2,\qquad (3x-1)(x-2)=0.\]<p>The paired solutions are \((\tfrac13,6)\) and \((2,1)\). Their products are both \(2\), as required.</p>', 'SY-PRODUCT'),
       example('Two possible tangents through a fixed point', r'<p>For \(y=kx+1\) tangent to \(y=x^2+2x+5\), find each \(k\) and contact point.</p>',
               r'\[x^2+(2-k)x+4=0.\]<p>Its discriminant must be zero:</p>\[(2-k)^2-16=0,\qquad k=-2\ \text{or}\ 6.\]<p>The repeated root is \(x=\tfrac{k-2}2\). Thus \(k=-2\) touches at \((-2,5)\), and \(k=6\) touches at \((2,13)\).</p>', 'SY-TANGENTS'),
       example('A perimeter and an area', r'<p>A rectangle has perimeter \(26\) cm and area \(40\text{ cm}^2\). Find its side lengths.</p>',
               r'<p>Let the sides be \(w\) and \(l\). Then \(w+l=13\) and \(wl=40\). Substitution gives</p>\[w(13-w)=40,\qquad (w-5)(w-8)=0.\]<p>The dimensions are \(5\) cm by \(8\) cm. Swapping the labels describes the same rectangle. Both dimensions are positive and satisfy the two measurements.</p>', 'SY-MODEL')])

def field(key, label, kind, expected, **extra):
    if kind=='set':
        expected=expected.replace(';',' U ') if ',' in expected else '{'+expected.replace(';',',')+'}'
    return dict(key=key, label=label, type=kind, expected=expected, **extra)

def roots(expr):
    return ';'.join(s.sstr(v) for v in sorted(s.solve(expr, x), key=lambda z:float(z)))

def answer_html(f):
    value=str(f['expected'])
    if f['type']=='choice':return '<p>'+f['options'][value]+'</p>'
    def tex(v):
        if v in ('inf','+inf'):return r'\infty'
        if v=='-inf':return r'-\infty'
        return s.latex(s.sympify(v))
    if f['type']=='pairs':
        out=r',\quad '.join(r'\left('+','.join(tex(c) for c in pair[1:-1].split(','))+r'\right)' for pair in value.split(';'))
    elif f['type']=='set':
        if value.startswith('{'):
            out=r'\{'+r',\,'.join(tex(v) for v in value[1:-1].split(','))+r'\}'
        else:out=r'\cup'.join(part[0]+','.join(tex(v) for v in part[1:-1].split(','))+part[-1] for part in value.split(' U '))
    else:out=tex(value)
    return '<p>'+f['label']+r': \('+out+r'\)</p>'

def check(topic, family, variant, prompt, fields, explanation, model):
    uid=f'M4U-9709-P1-QD-CHECK-{topic.upper()}-{family}-{variant}'
    criteria=[dict(code='B1',marks=1,description_html='Complete correct answer for '+f['label']+'.') for f in fields]
    questions.append(dict(id=uid,family_uid=f'M4U-9709-P1-QD-CHECK-{topic.upper()}-{family}',lesson=topic,
        title={'equations':'Solve and check','square':'Square form and graph','discriminant':'Roots and parameters','inequalities':'Signs and boundaries','simultaneous':'Matching solutions'}[topic]+f' {family}',
        collection='short' if variant==0 else 'variant',prompt_html=prompt,answer_html=''.join(answer_html(f) for f in fields),
        solution_html=explanation,hint_html='<p>'+{'equations':'Choose a substitution or factorisation; keep the restrictions and every root.',
        'square':'Factor the leading coefficient first. Check the domain before deciding the range.',
        'discriminant':'Form the discriminant of the correct equation and separate any linear case.',
        'inequalities':'Find the boundary roots, check the signs and decide which endpoints are allowed.',
        'simultaneous':'Substitute the linear relation, solve, then recover each matching coordinate.'}[topic]+'</p>',
        marks=len(fields),difficulty=2,fields=fields,parts=[dict(label='',marking_criteria=criteria)],verification=uid))
    models.append(dict(uid=uid,**model))

for v in range(2):
    r=5 if v==0 else -3
    check('equations',1,v,fr'<p>Solve \(x^2={r}x\). Give every real root.</p>',
        [field('roots','All real roots','set',f'0;{r}')],fr'<p>Factor \(x(x-({r}))=0\). Hence \(x=0\) or \(x={r}\). Dividing by \(x\) would lose zero.</p>',dict(kind='roots',polynomial=str(x*x-r*x)))
    expr=2*x*x+(4+2*v)*x-(3+v)
    check('equations',2,v,fr'<p>Solve \({s.latex(expr)}=0\) exactly.</p>',
        [field('roots','Both exact real roots','set',roots(expr))],fr'<p>Use the quadratic formula with \(a=2\), \(b={4+2*v}\), \(c={-3-v}\), retaining both signs.</p>\[x\in {s.latex(s.FiniteSet(*s.solve(expr,x)))}.\]',dict(kind='roots',polynomial=str(expr)))
    p,q=(4,9) if v==0 else (1,16);expr=x**4-(p+q)*x*x+p*q
    check('equations',3,v,fr'<p>Find all real roots of \({s.latex(expr)}=0\).</p>',
        [field('roots','All real roots','set',roots(expr))],fr'<p>Set \(u=x^2\ge0\). The equation factors as \((u-{p})(u-{q})=0\). Both values are positive; solve both equations in \(x\), keeping both signs.</p>',dict(kind='roots',polynomial=str(expr)))
    c=3+v;expr=x+s.sqrt(x)-c*(c+1)
    check('equations',4,v,fr'<p>Solve \({s.latex(expr)}=0\) for real \(x\).</p>',
        [field('roots','All valid real roots','set',str(c*c))],fr'<p>Put \(u=\sqrt x\ge0\). Then \((u-{c})(u+{c+1})=0\). Reject the negative substituted root and obtain \(x={c*c}\).</p>',dict(kind='sqrt',constant=c*(c+1)))

    a,h,k=(3,2,-5) if v==0 else (-2,-3,7);expr=s.expand(a*(x-h)**2+k)
    check('square',1,v,fr'<p>Write \({s.latex(expr)}\) as \(A(x-H)^2+K\). Give all three constants.</p>',
        [field('form_a','A','number',str(a)),field('form_h','H','number',str(h)),field('form_k','K','number',str(k))],fr'\[{s.latex(expr)}={a}(x-({h}))^2+({k}).\]<p>Expand to verify every coefficient, including the constant correction.</p>',dict(kind='square',a=a,h=h,k=k,polynomial=str(expr)))
    a,h,k=(2,-1,3) if v==0 else (-3,2,5)
    check('square',2,v,fr'<p>For \(f(x)={a}(x-({h}))^2+{k}\), with real domain, give the vertex and the range.</p>',
        [field('vertex','Vertex (x,y)','pairs',f'({h},{k})'),field('range','Range','set',f'[{k},inf)' if a>0 else f'(-inf,{k}]')],fr'<p>The vertex is \(({h},{k})\). The square is non-negative and its multiplier is {"positive" if a>0 else "negative"}; this decides which side of the vertex level is attained.</p>',dict(kind='range',a=a,h=h,k=k))
    h=2+v;expr=2*(x-h)**2-5
    check('square',3,v,fr'<p>Solve \({s.latex(s.expand(expr))}=0\) using a completed square.</p>',
        [field('roots','Both exact roots','set',roots(expr))],fr'\[2(x-{h})^2=5,\qquad x={h}\pm\frac{{\sqrt{{10}}}}2.\]',dict(kind='roots',polynomial=str(expr)))
    h=2+v;end=2*h+1
    check('square',4,v,fr'<p>For \(f(x)=(x-{h})^2+1\), \(0\le x\le{end}\), give the range and all levels \(t\) producing two distinct allowed inputs.</p>',
        [field('range','Range of f','set',f'[1,{(end-h)**2+1}]'),field('levels','All levels t with two distinct inputs','set',f'(1,{h*h+1}]')],fr'<p>The vertex level is 1. The endpoint levels are \({h*h+1}\) and \({(end-h)**2+1}\). Both branches survive up to and including the smaller endpoint level, excluding the vertex itself.</p>',dict(kind='restricted',h=h,end=end))

    a=2+v
    check('discriminant',1,v,fr'<p>Find all \(k\) for which \(x^2-2kx+{a}=0\) has two distinct real roots.</p>',
        [field('parameters','All parameter k-values','set',f'(-inf,-sqrt({a}));(sqrt({a}),inf)')],fr'\[\Delta=4k^2-{4*a}>0.\]<p>Hence \(k&lt;-\sqrt{{{a}}}\) or \(k&gt;\sqrt{{{a}}}\). Equality would give a repeated root.</p>',dict(kind='distinct',a=a))
    p=1+v
    check('discriminant',2,v,fr'<p>For \((k-{p})x^2-2kx+k+{p}=0\), give the k-value making the equation linear, its x-root, and the number of distinct real roots for all other k.</p>',
        [field('exception','Exceptional k','number',str(p)),field('linear_root','Root in the linear case','number','1'),field('count','Number of distinct roots for k outside that case','number','2')],fr'<p>At \(k={p}\), the equation is \(-{2*p}x+{2*p}=0\), so \(x=1\). Otherwise \(\Delta={4*p*p}>0\) and the equation is genuinely quadratic, giving two distinct roots.</p>',dict(kind='linear',p=p))
    h=2+v
    check('discriminant',3,v,fr'<p>Find all \(k\) such that \(2x^2-{4*h}x+k>0\) for every real \(x\).</p>',
        [field('parameters','All parameter k-values','set',f'({2*h*h},inf)')],fr'\[2x^2-{4*h}x+k=2(x-{h})^2+k-{2*h*h}.\]<p>The minimum must be strictly positive, so \(k&gt;{2*h*h}\).</p>',dict(kind='positive',h=h))
    slope=2+2*v;h=(slope+4)//2;c=7-h*h
    check('discriminant',4,v,fr'<p>The line \(y={slope}x+c\) is tangent to \(y=x^2-4x+7\). Find c and the point of contact.</p>',
        [field('c','Line intercept c','number',str(c)),field('point','Point of contact (x,y)','pairs',f'({h},{slope*h+c})')],fr'<p>The intersection equation is \(x^2-{slope+4}x+7-c=0\). Set its discriminant to zero; this gives \(c={c}\). The repeated root is \(x={h}\); recover y from the line.</p>',dict(kind='tangent',slope=slope,c=c,h=h))

    r,t=(-2,3) if v==0 else (-3,4);expr=s.expand((x-r)*(x-t))
    check('inequalities',1,v,fr'<p>Solve \({s.latex(expr)}\le0\) for real x.</p>',
        [field('allowed','All allowed x-values','set',f'[{r},{t}]')],fr'<p>The roots are \({r}\) and \({t}\). The upward quadratic is non-positive between them; include both boundary roots.</p>',dict(kind='interval',r=r,t=t,strict=False))
    r,t=(-1,4) if v==0 else (-2,5);expr=-s.expand((x-r)*(x-t))
    check('inequalities',2,v,fr'<p>Solve \({s.latex(expr)}&lt;0\).</p>',
        [field('allowed','All allowed x-values','set',f'(-inf,{r});({t},inf)')],fr'<p>The parabola opens downwards and is negative outside its two roots, \({r}\) and \({t}\). The inequality is strict, so exclude both roots.</p>',dict(kind='outside',r=r,t=t))
    r=3+v
    check('inequalities',3,v,fr'<p>Which set solves \((x-{r})^2\le0\)?</p>',
        [field('set','Complete solution set','choice','B',options={'A':r'\(x\in\mathbb R\)','B':fr'\(x={r}\)','C':'No real solutions'})],fr'<p>A square is non-negative. It can be ≤ 0 only when it is exactly zero, so \(x={r}\) alone.</p>',dict(kind='repeated',r=r))
    r,t=(-2,3) if v==0 else (-1,4);lo,hi=r-2,t+2
    check('inequalities',4,v,fr'<p>Solve \((x-({r}))(x-{t})>0\), subject to \({lo}\le x&lt;{hi}\). Give all real solutions.</p>',
        [field('allowed','Combined allowed x-values','set',f'[{lo},{r});({t},{hi})')],fr'<p>The positive intervals lie outside the roots. Intersect them with the domain to obtain \([{lo},{r})\cup({t},{hi})\).</p>',dict(kind='intersection',r=r,t=t,lo=lo,hi=hi))

    m=2+v;expr=x*x-x-3;poly=expr-(m*x+1);rs=s.solve(poly,x)
    pairs=';'.join(f'({s.sstr(z)},{s.sstr(m*z+1)})' for z in rs)
    check('simultaneous',1,v,fr'<p>Find every intersection of \(y={m}x+1\) and \(y=x^2-x-3\).</p>',
        [field('points','All ordered pairs (x,y)','pairs',pairs)],fr'<p>Substitution gives \({s.latex(poly)}=0\). Solve for both x-values, then substitute each into \(y={m}x+1\). Keep the coordinates paired.</p>',dict(kind='pairs',polynomial=str(poly),line=str(m*x+1)))
    a,b=(3,7) if v==0 else (2,9);expr=a*x*x-b*x+2;rs=s.solve(expr,x)
    check('simultaneous',2,v,fr'<p>Solve \({a}x+y={b}\) and \(xy=2\).</p>',
        [field('points','All ordered pairs (x,y)','pairs',';'.join(f'({s.sstr(z)},{s.sstr(b-a*z)})' for z in rs))],fr'<p>Substitute \(y={b}-{a}x\) into \(xy=2\). This gives \({s.latex(expr)}=0\). Recover the corresponding y-value for each root.</p>',dict(kind='pairs',polynomial=str(expr),line=str(b-a*x)))
    p=2+v;k1,k2=p-4,p+4
    check('simultaneous',3,v,fr'<p>The line \(y=kx+1\) touches \(y=x^2+{p}x+5\). Give all possible k-values.</p>',
        [field('slopes','All tangent slopes k','set',f'{k1};{k2}')],fr'\[x^2+({p}-k)x+4=0.\]<p>For a repeated root, \(({p}-k)^2-16=0\), so \(k={k1}\) or \(k={k2}\).</p>',dict(kind='slopes',p=p))
    a,b=(5,8) if v==0 else (6,9)
    check('simultaneous',4,v,fr'<p>A rectangle has perimeter \({2*(a+b)}\) cm and area \({a*b}\text{{ cm}}^2\). Give both side lengths in cm, with no repetition.</p>',
        [field('lengths','Both side lengths','set',f'{a};{b}')],fr'<p>If one side is x, the other is \({a+b}-x\). The area gives \(x^2-{a+b}x+{a*b}=0\), with roots \({a}\) and \({b}\). Both are positive.</p>',dict(kind='rectangle',a=a,b=b))
