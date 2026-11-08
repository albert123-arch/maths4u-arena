"""9709 P1 Functions: independent explanations and examples in the book's skill order."""
import sympy as s
x=s.Symbol('x',real=True)
lessons,questions,models=[],[],[]

def example(title,question,solution,verification):
    return dict(title=title,question=question,solution=solution,verification=verification)

def lesson(key,suffix,title,summary,objective,before,ideas,method,mistakes,examples):
    lessons.append(dict(key=key,id='orig_functions_'+suffix,title=title,summary=summary,
                        objective=objective,before=before,ideas=ideas,method=method,
                        mistakes=mistakes,examples=examples))

lesson('inverse','inverse','Functions, domain, range and inverses',
       'Identify allowed inputs and attained outputs, then reverse a one–one mapping.',
       'Distinguish domain and range, recognise one–one functions and find inverses with their domains.',
       '<p>You should be able to rearrange equations, solve inequalities and find the vertex of a quadratic.</p>',
       r'''<h3>A function includes its domain</h3><p>A function assigns exactly one output to each permitted input. The domain is the set of permitted inputs; the range is the set of outputs actually attained. Two functions with the same formula but different domains need not have the same range or inverse. A square root requires a non-negative radicand, and a denominator cannot be zero.</p>
       <h3>One–one or many–one?</h3><p>A function is one–one if different inputs always have different outputs. A horizontal line meets its graph at most once. A many–one function can be a valid function, but it cannot be reversed to a single-valued function without restricting its domain.</p>
       <h3>An inverse reverses the mapping</h3><p>If \(f(a)=b\), then \(f^{-1}(b)=a\). The notation \(f^{-1}\) does not mean \(1/f\). The domain of \(f^{-1}\) is the range of \(f\); its range is the original domain.</p>''',
       r'''<ol><li>Write \(y=f(x)\), retaining the stated domain.</li><li>Rearrange for the original input, making a justified branch choice if needed.</li><li>Exchange the variable names and state the inverse's domain.</li><li>Check \(f^{-1}(f(x))=x\) on the original domain and \(f(f^{-1}(x))=x\) on the inverse domain.</li></ol><p>For a decreasing function on an interval, the images of the endpoints occur in the opposite order. An excluded endpoint stays excluded unless the same output is attained elsewhere in the domain.</p>''',
       ['An inverse is not a reciprocal.', 'The range must use the actual restricted domain.',
        'One output per input does not automatically mean one–one.', 'Keep excluded denominator values when rearranging.'],[
       example('The same formula, a different mapping',r'<p>For \(f(x)=(x-2)^2+1\), compare the domains \(\mathbb R\) and \([2,\infty)\).</p>',
               r'<p>Both domains give range \([1,\infty)\). On \(\mathbb R\), the inputs \(1\) and \(3\) both give \(2\), so the function is many–one. On \([2,\infty)\), each output is attained once, and an inverse function exists.</p>','FN-DEFINITION'),
       example('A decreasing function and its endpoints',r'<p>Find the inverse of \(f(x)=8-3x\), \(-1&lt;x\le2\), and state its domain.</p>',
               r'<p>The attained outputs satisfy \(2\le f(x)&lt;11\). From \(y=8-3x\), obtain \(x=(8-y)/3\). Thus</p>\[f^{-1}(x)=\frac{8-x}{3},\qquad 2\le x&lt;11.\]<p>The included input \(2\) gives the included lower output \(2\); the excluded input \(-1\) gives the excluded upper bound \(11\).</p>','FN-AFFINE-INVERSE'),
       example('A reciprocal relation keeps both exclusions',r'<p>Find the inverse of \(f(x)=\dfrac{2x+5}{x-3}\), with \(x\ne3\).</p>',
               r'\[yx-3y=2x+5,\qquad x(y-2)=3y+5.\]\[f^{-1}(x)=\frac{3x+5}{x-2},\qquad x\ne2.\]<p>Writing \(f(x)=2+11/(x-3)\) shows why \(2\) is missing from the original range. The inverse range excludes \(3\).</p>','FN-RATIONAL-INVERSE'),
       example('Reverse a finite mapping completely',r'<p>A function has domain \(\{-2,1,3\}\), with \(f(-2)=1\), \(f(1)=4\) and \(f(3)=9\). Describe its inverse.</p>',
               r'<p>The outputs are distinct, so the mapping is one–one. Reverse every pair:</p>\[f^{-1}(1)=-2,\qquad f^{-1}(4)=1,\qquad f^{-1}(9)=3.\]<p>The inverse domain is \(\{1,4,9\}\), and its range is \(\{-2,1,3\}\).</p>','FN-FINITE-INVERSE')])

lesson('composite','composite','Composite functions and their domains',
       'Apply the inside function first, and check that its output is allowed by the outside function.',
       'Form composites in both orders, determine their full domains and recover an unknown function.',
       '<p>Recall substitution, domain restrictions, quadratic inequalities and inverse notation.</p>',
       r'''<h3>Order is part of the definition</h3><p>In this course, \(fg(x)=f(g(x))\): apply \(g\) first, then \(f\). It is not the product \(f(x)g(x)\), and generally \(fg\ne gf\).</p>
       <h3>The composite domain</h3>\[D_{fg}=\{x\in D_g:g(x)\in D_f\}.\]<p>Start with inputs allowed by \(g\), then require its output to belong to the stated domain of \(f\). A composite may be defined only on part of the inner function's domain. If it is required on every input of \(g\), the entire range of \(g\) must lie in \(D_f\).</p>
       <h3>Recovering a function</h3><p>If the outer function is known, undo it to recover the inner output. If the inner function is known, write its output as a new variable and express the given composite in that variable. The recovered formula is justified on the part of the domain reached by the composition.</p>''',
       r'''<ol><li>Expand \(fg(x)\) as \(f(g(x))\).</li><li>Replace every occurrence of the input in \(f\) by the entire expression \(g(x)\), using brackets.</li><li>Apply the original inner-domain restriction and the outer-domain condition.</li><li>Simplify the formula, retaining exclusions that may disappear after cancellation.</li></ol>''',
       ['The right-hand function acts first.', 'Composite notation does not mean multiplication.',
        'A simplified expression does not erase an original exclusion.', 'Check stated domains, not just the natural domain of the final formula.'],[
       example('Two orders give two different expressions',r'<p>Let \(f(x)=3x-2\) and \(g(x)=x^2+1\), both with real domain. Find \(fg\) and \(gf\).</p>',
               r'\[fg(x)=3(x^2+1)-2=3x^2+1,\]\[gf(x)=(3x-2)^2+1=9x^2-12x+5.\]<p>Both composites have real domain, but they are different functions.</p>','FC-ORDER'),
       example('An outside square root restricts the inputs',r'<p>Let \(f(x)=\sqrt{x-4}\), \(x\ge4\), and \(g(x)=2x+1\), \(x\ge0\). Find the formula and domain of \(fg\).</p>',
               r'\[fg(x)=\sqrt{2x-3}.\]<p>We need both \(x\ge0\) and \(2x+1\ge4\), so the composite domain is \([\tfrac32,\infty)\). Checking only the inner function would allow invalid inputs.</p>','FC-DOMAIN'),
       example('Recover the inner function',r'<p>Suppose \(g(x)=2x-3\) and \(gf(x)=6x^2+2x-1\) for real \(x\). Find \(f\).</p>',
               r'<p>Since \(gf(x)=g(f(x))\),</p>\[2f(x)-3=6x^2+2x-1,\qquad f(x)=3x^2+x+1.\]<p>Substitute this expression back into \(g\) to verify the complete composite.</p>','FC-RECOVER'),
       example('An identity with a missing input',r'<p>For \(f(x)=1/(x-2)\), \(x\ne2\), find \(ff(x)\) and its domain.</p>',
               r'\[ff(x)=\frac{1}{1/(x-2)-2}=\frac{x-2}{5-2x}.\]<p>The inner function excludes \(x=2\). The outside function additionally requires \(1/(x-2)\ne2\), so \(x\ne\tfrac52\). Both exclusions remain, although the simplified formula alone would allow \(x=2\).</p>','FC-CANCELLATION')])

lesson('restricted','restricted_inverse','Ranges, restrictions and inverse branches',
       'Use the graph and the actual domain to choose the correct inverse branch and interval.',
       'Restrict many–one functions, determine complete ranges and select valid inverse branches including open endpoints.',
       '<p>Recall square form, quadratic ranges and the domain–range interchange for inverses.</p>',
       r'''<h3>A quadratic needs a branch</h3><p>For \(f(x)=a(x-h)^2+k\), inputs equally far from \(h\) have the same output. Restricting to one side of the vertex makes the quadratic one–one. On a domain \(x\ge c\), the smallest allowed cutoff for a complete right-hand branch is \(c=h\); on \(x\le c\), the largest cutoff for a complete left-hand branch is \(c=h\).</p>
       <h3>The branch is determined before swapping names</h3>\[x=h\pm\sqrt{\frac{y-k}{a}}.\]<p>Choose the sign from whether the original inputs lie to the right or left of \(h\), rather than from the sign of \(a\). Then exchange the variable names. The full inverse domain is the actual original range, which can be smaller than the square root's natural domain.</p>
       <h3>Square-root functions reverse to restricted quadratics</h3><p>Squaring \(y-k=\sqrt{x-h}\) gives \(x=(y-k)^2+h\), but the original left-hand side must be non-negative. Thus the inverse is a quadratic with domain \(x\ge k\), or \(x&gt;k\) when the original endpoint is excluded.</p>''',
       r'''<ol><li>Find the vertex and locate the stated domain on the graph.</li><li>Calculate the range using included endpoints, excluded limits and any included vertex.</li><li>Solve for the original input and choose its allowed branch.</li><li>State the inverse domain and range separately; test the branch on an allowed input.</li></ol>''',
       ['The sign of the multiplier does not choose the inverse branch.',
        'The natural square-root domain may be larger than the inverse domain.',
        'Check whether the cutoff is included.', 'Squaring alone does not preserve a principal-root restriction.'],[
       example('The domain starts beyond the vertex',r'<p>Find the inverse of \(f(x)=2(x-1)^2-3\), \(x\ge3\), and give its domain and range.</p>',
               r'<p>The minimum on this domain is \(f(3)=5\); the vertex itself is excluded by the domain. Since the inputs are on the right branch,</p>\[f^{-1}(x)=1+\sqrt{\frac{x+3}{2}},\qquad x\ge5.\]<p>The inverse range is \([3,\infty)\). The natural domain of the formula, \(x\ge-3\), would be too large.</p>','FR-RIGHT-BRANCH'),
       example('A downward quadratic on its left branch',r'<p>Invert \(f(x)=7-2(x+1)^2\), \(x\le-2\).</p>',
               r'<p>The original range is \((-\infty,5]\). The input is left of the vertex \(-1\), so</p>\[f^{-1}(x)=-1-\sqrt{\frac{7-x}{2}},\qquad x\le5.\]<p>The inverse range is \((-\infty,-2]\). A negative leading coefficient has not forced the positive square-root branch.</p>','FR-LEFT-BRANCH'),
       example('Reverse a root without losing its restriction',r'<p>Find the inverse of \(f(x)=\sqrt{x-2}+3\), \(x&gt;2\).</p>',
               r'<p>The range is \((3,\infty)\). Solving \(y-3=\sqrt{x-2}\) gives \(x=(y-3)^2+2\), with \(y&gt;3\). Hence</p>\[f^{-1}(x)=(x-3)^2+2,\qquad x&gt;3.\]<p>The inverse range is \((2,\infty)\). Neither open endpoint becomes included after squaring.</p>','FR-ROOT-INVERSE'),
       example('A bounded branch has a bounded image',r'<p>For \(f(x)=(x-2)^2+1\), \(2&lt;x\le5\), find the inverse and its full domain.</p>',
               r'<p>On the right branch, the outputs satisfy \(1&lt;y\le10\). Therefore</p>\[f^{-1}(x)=2+\sqrt{x-1},\qquad 1&lt;x\le10.\]<p>The inverse range is \((2,5]\). Values above \(10\) are not valid inverse inputs even though the radical could be evaluated there.</p>','FR-BOUNDED')])

lesson('graphs','inverse_graphs','Graphs of functions and inverses',
       'Reflect coordinates, endpoints and asymptotes, and distinguish fixed points from all intersections.',
       'Sketch inverse graphs by reflection in y = x, respecting domains, endpoints and possible common points.',
       '<p>Recall inverse functions, coordinate pairs, line equations and restricted quadratic graphs.</p>',
       r'''<h3>Reflection swaps coordinates</h3><p>A point \((a,b)\) on the graph of \(f\) becomes \((b,a)\) on the graph of \(f^{-1}\). The mirror is \(y=x\). Swap the domain and range, and preserve open or closed endpoint status. A vertical asymptote \(x=c\) reflects to a horizontal asymptote \(y=c\).</p>
       <h3>Which common points lie on the mirror?</h3><p>Every fixed point \(f(t)=t\) gives a shared point \((t,t)\). For a strictly increasing function and its inverse, every shared point lies on \(y=x\): a non-trivial two-step cycle would contradict increasing order. Without that condition, there can be shared points away from the mirror; a self-inverse decreasing function is an important example.</p>
       <h3>A sketch needs the restrictions</h3><p>Show the allowed part of the graph, intercepts that actually belong to its domain, endpoints and any asymptotes. A reflected full parabola is not an inverse function unless the original parabola has been restricted appropriately.</p>''',
       r'''<ol><li>Sketch the original function on its stated domain.</li><li>Mark significant coordinates and whether endpoints are included.</li><li>Reflect those features across \(y=x\), swapping domain and range.</li><li>Check any proposed intersections in both original relations and their domains.</li></ol>''',
       ['Reflect in y = x, not either coordinate axis.', 'A restriction can remove an apparent intercept.',
        'An open endpoint remains open after reflection.', 'Do not assume every function–inverse intersection lies on y = x.'],[
       example('Reflect an interval and its endpoints',r'<p>A continuous, strictly increasing function has domain \((1,3]\). Its graph approaches \((1,4)\), and \(f(3)=8\). Describe its inverse endpoints, domain and range.</p>',
               r'<p>The inverse runs from the excluded endpoint \((4,1)\) to the included endpoint \((8,3)\). Its domain is \((4,8]\) and its range is \((1,3]\). Reflection preserves endpoint inclusion.</p>','FG-ENDPOINTS'),
       example('An increasing function and its inverse intersect twice',r'<p>Find all common points of \(y=f(x)\) and \(y=f^{-1}(x)\) for \(f(x)=(x-1)^2+1\), \(x\ge1\).</p>',
               r'<p>The function is strictly increasing on its domain, so common points must lie on \(y=x\). Solve</p>\[(x-1)^2+1=x,\qquad (x-1)(x-2)=0.\]<p>Both roots belong to the domain and range. The common points are \((1,1)\) and \((2,2)\).</p>','FG-FIXED-POINTS'),
       example('A decreasing self-inverse is different',r'<p>For \(f(x)=6-x\), \(x\in\mathbb R\), describe the common points of the function and inverse graphs.</p>',
               r'<p>Rearranging gives \(f^{-1}(x)=6-x\), so the two graphs coincide. Every point on that line is shared, including \((1,5)\), which is not on \(y=x\). Solving \(f(x)=x\) finds only the fixed point \((3,3)\), not every common point.</p>','FG-SELF-INVERSE'),
       example('Reflect the asymptotes as well as the points',r'<p>Describe the inverse graph of \(f(x)=2+3/(x-1)\), \(x\ne1\).</p>',
               r'<p>The original asymptotes are \(x=1\) and \(y=2\). Reflection gives inverse asymptotes \(x=2\) and \(y=1\). Algebra agrees:</p>\[f^{-1}(x)=1+\frac3{x-2},\qquad x\ne2.\]<p>The point \((2,5)\) reflects to \((5,2)\), which satisfies the inverse formula.</p>','FG-ASYMPTOTES')])

lesson('transformations','transformations','Translations, reflections and ordered stretches',
       'Track coordinates and domains through horizontal and vertical changes in the correct order.',
       'Describe and combine graph transformations, finding new equations, coordinates and domains.',
       '<p>Recall graph coordinates, function substitution and the effect of a negative sign.</p>',
       r'''<h3>Outside changes outputs; inside changes inputs</h3><table><thead><tr><th>New function</th><th>Image of (u,v)</th></tr></thead><tbody><tr><td>\(f(x)+k\)</td><td>\((u,v+k)\)</td></tr><tr><td>\(f(x-h)\)</td><td>\((u+h,v)\)</td></tr><tr><td>\(-f(x)\)</td><td>\((u,-v)\)</td></tr><tr><td>\(f(-x)\)</td><td>\((-u,v)\)</td></tr><tr><td>\(Af(x)\)</td><td>\((u,Av)\)</td></tr><tr><td>\(f(Bx)\)</td><td>\((u/B,v)\)</td></tr></tbody></table><p>For positive stretch factors, state the direction parallel to the appropriate axis. A negative multiplier also produces a reflection.</p>
       <h3>A single coordinate rule for a combination</h3><p>For \(A\ne0\), \(B\ne0\),</p>\[y=A f\big(B(x-h)\big)+k:\qquad (u,v)\longmapsto\left(h+\frac uB,\ Av+k\right).\]<p>Find the new horizontal coordinate by solving \(B(x-h)=u\). This avoids treating \(h\) as the constant term inside an un-factored bracket.</p>
       <h3>Order and endpoints matter</h3><p>Translations and stretches in the same direction generally do not commute. Track the coordinates through each step, or substitute into the current equation after each step. Apply the horizontal coordinate rule to the domain endpoints; reverse their order when \(B&lt;0\), carrying each endpoint's inclusion with it.</p>''',
       r'''<ol><li>State whether each change acts on the input or output.</li><li>Track a general point or substitute into the complete current formula.</li><li>For an inside expression, solve for the new input coordinate.</li><li>Check a known point, the vertex and any domain endpoints against the resulting equation.</li></ol>''',
       ['In f(3x), the horizontal factor is 1/3, not 3.',
        'A horizontal translation has the opposite sign inside f.',
        'Reversing two transformations can change the result.', 'A negative horizontal multiplier reverses the order of interval endpoints.'],[
       example('Translate a complete expression',r'<p>Translate \(y=x^2+2x-1\) by \(\begin{pmatrix}3\\-2\end{pmatrix}\). Give the new equation.</p>',
               r'\[y=f(x-3)-2=(x-3)^2+2(x-3)-3=x^2-4x.\]<p>The original vertex \((-1,-2)\) moves to \((2,-4)\), agreeing with \((x-2)^2-4\).</p>','FT-TRANSLATION'),
       example('Reflection and a vertical stretch',r'<p>If \(f(x)=x^3-2x\), find the equation of \(y=-2f(x/3)\) and describe its transformations.</p>',
               r'\[y=-2\left(\frac{x^3}{27}-\frac{2x}3\right)=-\frac{2x^3}{27}+\frac{4x}3.\]<p>There is a stretch parallel to the x-axis with factor \(3\), a stretch parallel to the y-axis with factor \(2\), and a reflection in the x-axis. Horizontal and vertical changes commute here.</p>','FT-STRETCH'),
       example('Solve the inside expression for the new coordinate',r'<p>The point \((6,-1)\) lies on \(y=f(x)\). Find its image on \(y=2f(3(x-1))-4\).</p>',
               r'<p>Set \(3(x-1)=6\), giving \(x=3\). The new output is \(2(-1)-4=-6\). The image is \((3,-6)\). Multiplying the old x-coordinate by 3 would reverse the horizontal effect.</p>','FT-COORDINATE'),
       example('The two orders are different',r'<p>A graph is translated 2 units right, then stretched parallel to the x-axis by factor 3. Compare with applying these steps in reverse.</p>',
               r'<p>In the first order, \((u,v)\mapsto(u+2,v)\mapsto(3u+6,v)\), and the equation is \(y=f(x/3-2)\). In reverse, \((u,v)\mapsto(3u,v)\mapsto(3u+2,v)\), giving \(y=f((x-2)/3)\). A point initially at \(x=1\) ends at \(9\) in the first order but \(5\) in the second.</p>','FT-ORDER')])

def field(key,label,kind,expected,**extra):
    return dict(key=key,label=label,type=kind,expected=expected,**extra)

def tex(value):
    return s.latex(s.sympify(str(value),locals={'x':x,'inf':s.oo}))

def answers(fields):
    out=[]
    for f in fields:
        val=f['expected']
        if f['type']=='choice':text=f['options'][val]
        elif f['type']=='ratio':text=r'\(\dfrac{'+tex(val[0])+'}{'+tex(val[1])+r'}\)'
        elif f['type']=='set':
            if val.startswith('{'):text=r'\(\{'+','.join(tex(v) for v in val[1:-1].split(','))+r'\}\)'
            else:text=r'\('+r'\cup'.join(part[0]+','.join(tex(v) for v in part[1:-1].split(','))+part[-1] for part in val.split(' U '))+r'\)'
        elif f['type']=='pairs':text=r'\('+r',\quad'.join('('+','.join(tex(v) for v in part[1:-1].split(','))+')' for part in val.split(';'))+r'\)'
        else:text=r'\('+tex(val)+r'\)'
        out.append('<p>'+f['label']+': '+text+'</p>')
    return ''.join(out)

def quick(key,family,variant,title,prompt,fields,solution,model):
    uid=f'M4U-9709-P1-FN-CHECK-{key.upper()}-{family}-{variant}'
    criteria=[dict(code='B1',marks=1,description_html='Complete correct answer for '+f['label']+'.') for f in fields]
    questions.append(dict(id=uid,family_uid=f'M4U-9709-P1-FN-CHECK-{key.upper()}-{family}',lesson=key,
        title=title,collection='short' if variant==0 else 'variant',prompt_html=prompt,
        answer_html=answers(fields),hint_html='<p>'+{'inverse':'Reverse the original relation and interchange its domain and range.',
        'composite':'Apply the inner function first; keep its domain and the outside input restriction.',
        'restricted':'Locate the original branch, then interchange the actual domain and range.',
        'graphs':'Swap each coordinate and retain the domain and endpoint status.',
        'transformations':'Track a general point; solve the new inside expression for its horizontal coordinate.'}[key]+'</p>',
        solution_html=solution,marks=len(fields),difficulty=2,fields=fields,
        parts=[dict(label='',marking_criteria=criteria)],verification=uid))
    models.append(dict(uid=uid,**model))

for v in range(2):
    b,m=(7,2) if v==0 else (10,3);lo,hi=-1,3;expr=(b-x)/m
    quick('inverse',1,v,'Invert a restricted linear function',fr'<p>For \(f(x)={b}-{m}x\), \({lo}\le x&lt;{hi}\), find \(f^{{-1}}(x)\) and its domain.</p>',
          [field('formula','Inverse formula in x','polynomial',str(expr),variables=['x']),field('domain','Inverse domain','set',f'({b-m*hi},{b-m*lo}]')],
          fr'<p>Rearrange \(y={b}-{m}x\). The decreasing mapping takes the included left endpoint to the included upper output, and the excluded right endpoint to the excluded lower output.</p>',dict(kind='affine',b=b,m=m,lo=lo,hi=hi))
    h,k=(2,1) if v==0 else (-1,3)
    quick('inverse',2,v,'Decide whether the inverse is a function',fr'<p>For \(f(x)={s.latex((x-h)**2+k)}\), \(x\in\mathbb R\), choose whether an inverse function exists on the full stated domain, and give the range.</p>',
          [field('one_one','Inverse function on the full domain?','choice','B',options={'A':'Yes: every input has one output.','B':'No: distinct inputs can have the same output.','C':'No: the function has no real outputs.'}),field('range','Range of f','set',f'[{k},inf)')],
          fr'<p>The inputs \({h-1}\) and \({h+1}\) give the same output \({k+1}\). The function is many–one on the full real domain. Its smallest output is \({k}\).</p>',dict(kind='many_one',h=h,k=k))
    a,b,c=(2,5,3) if v==0 else (3,4,2);n=c*x+b;d=x-a
    quick('inverse',3,v,'A fractional inverse with its exclusion',fr'<p>Find the inverse of \(f(x)=\dfrac{{{a}x+{b}}}{{x-{c}}}\), \(x\ne{c}\). Enter its numerator and denominator separately with a semicolon, and state all excluded inverse inputs.</p>',
          [field('inverse','Inverse: numerator ; denominator','ratio',[str(n),str(d)],variables=['x']),field('excluded','Excluded inverse inputs','set','{'+str(a)+'}')],
          fr'<p>From \(y(x-{c})={a}x+{b}\), collect x-terms to get \(x(y-{a})={c}y+{b}\). Thus \(f^{{-1}}(x)=\dfrac{{{s.latex(n)}}}{{{s.latex(d)}}}\), excluding \(x={a}\).</p>',dict(kind='rational',a=a,b=b,c=c))
    inputs=[-2,1,3] if v==0 else [-3,2,4];outputs=[1,4,9] if v==0 else [-1,5,8]
    quick('inverse',4,v,'Reverse every pair',r'<p>A one–one function has exactly these mappings: '+', '.join(fr'\(f({a})={b}\)' for a,b in zip(inputs,outputs))+r'. Give all ordered pairs on the inverse graph.</p>',
          [field('points','All inverse pairs (x,y)','pairs',';'.join(f'({b},{a})' for a,b in zip(inputs,outputs)))],
          '<p>Reverse each original pair; none may be omitted. The old range is the new domain.</p>',dict(kind='finite',inputs=inputs,outputs=outputs))

    a,b=(3,-2) if v==0 else (-2,5);f=a*x+b;g=x*x+1;fg=f.subs(x,g);gf=s.expand(g.subs(x,f))
    quick('composite',1,v,'Compare both composition orders',fr'<p>Let \(f(x)={s.latex(f)}\) and \(g(x)=x^2+1\), both for real x. Find \(fg(x)\) and \(gf(x)\).</p>',
          [field('fg','fg(x)','polynomial',str(fg),variables=['x']),field('gf','gf(x)','polynomial',str(gf),variables=['x'])],
          fr'<p>Apply the right-hand function first:</p>\[fg(x)={s.latex(fg)},\qquad gf(x)={s.latex(gf)}.\]',dict(kind='composition',f=str(f),g=str(g)))
    a=4+2*v;lower=s.Rational(a-1,2)
    quick('composite',2,v,'A composite with an outside root',fr'<p>Let \(f(x)=\sqrt{{x-{a}}}\), \(x\ge{a}\), and \(g(x)=2x+1\), \(x\ge0\). Choose the formula for fg and give its full domain.</p>',
          [field('formula','fg(x)','choice','B',options={'A':fr'\(2\sqrt{{x-{a}}}+1\)','B':fr'\(\sqrt{{2x-{a-1}}}\)','C':fr'\(\sqrt{{2x+{a+1}}}\)'}),field('domain','Composite domain','set',f'[{lower},inf)')],
          fr'<p>Substitute the whole inner output into f. We require \(x\ge0\) and \(2x+1\ge{a}\), giving \(x\ge{s.latex(lower)}\).</p>',dict(kind='root_composite',a=a))
    c=2+v;b=2;a=b+c*c
    quick('composite',3,v,'A composite denominator restriction',fr'<p>Let \(f(x)=1/(x-{a})\), \(x\ne{a}\), and \(g(x)=x^2+{b}\), for real x. Find fg and its complete domain.</p>',
          [field('fg','fg: numerator ; denominator','ratio',['1',str(x*x-c*c)],variables=['x']),field('domain','Complete domain of fg','set',f'(-inf,{-c}) U ({-c},{c}) U ({c},inf)')],
          fr'\[fg(x)=\frac1{{x^2-{c*c}}}.\]<p>The inner output must differ from \({a}\), so exclude both \(x=-{c}\) and \(x={c}\).</p>',dict(kind='reciprocal_composite',a=a,b=b,c=c))
    a,b=(2,-3) if v==0 else (3,4);f=3*x*x+(v+1)*x+1;gf=s.expand(a*f+b)
    quick('composite',4,v,'Recover the missing inner function',fr'<p>Given \(g(x)={s.latex(a*x+b)}\) and \(gf(x)={s.latex(gf)}\) for real x, find f(x).</p>',
          [field('f','f(x)','polynomial',str(f),variables=['x'])],
          fr'<p>Solve \({a}f(x)+({b})={s.latex(gf)}\) for f(x), obtaining \({s.latex(f)}\). Verify by substitution.</p>',dict(kind='recover',a=a,b=b,composite=str(gf)))

    h,k,a=(1,-3,2) if v==0 else (2,1,3);cut=h+2;lower=a*4+k
    quick('restricted',1,v,'A right branch with a later cutoff',fr'<p>For \(f(x)={s.latex(a*(x-h)**2+k)}\), \(x\ge{cut}\), choose the inverse formula and give its domain and range.</p>',
          [field('formula','Inverse formula','choice','A',options={'A':fr'\({h}+\sqrt{{\dfrac{{x-({k})}}{{{a}}}}}\)','B':fr'\({h}-\sqrt{{\dfrac{{x-({k})}}{{{a}}}}}\)','C':fr'\(-{h}+\sqrt{{\dfrac{{x-({k})}}{{{a}}}}}\)'}),field('domain','Inverse domain','set',f'[{lower},inf)'),field('range','Inverse range','set',f'[{cut},inf)')],
          fr'<p>Inputs are right of the vertex, so choose the positive root. The attained minimum is f({cut})={lower}, not the vertex output. Swap this range with the original domain.</p>',dict(kind='right_branch',h=h,k=k,a=a,cut=cut))
    h,k,a=(-1,7,2) if v==0 else (2,10,3);cut=h-1;upper=k-a
    quick('restricted',2,v,'A downward left branch',fr'<p>For \(f(x)={s.latex(k-a*(x-h)**2)}\), \(x\le{cut}\), choose the inverse and state its domain and range.</p>',
          [field('formula','Inverse formula','choice','B',options={'A':fr'\({h}+\sqrt{{\dfrac{{{k}-x}}{{{a}}}}}\)','B':fr'\({h}-\sqrt{{\dfrac{{{k}-x}}{{{a}}}}}\)','C':fr'\({h}-\sqrt{{\dfrac{{x-{k}}}{{{a}}}}}\)'}),field('domain','Inverse domain','set',f'(-inf,{upper}]'),field('range','Inverse range','set',f'(-inf,{cut}]')],
          fr'<p>The original inputs lie left of {h}, so select the negative branch. The greatest attained output is f({cut})={upper}. The inverse domain is that original range.</p>',dict(kind='left_branch',h=h,k=k,a=a,cut=cut))
    h,k=(2,3) if v==0 else (-1,4)
    quick('restricted',3,v,'Choose the smallest one–one cutoff',fr'<p>For \(f(x)=(x-({h}))^2+{k}\), \(x\ge c\), find the smallest c allowing an inverse function. With that cutoff, give the inverse domain and \(f^{{-1}}({k+9})\).</p>',
          [field('cutoff','Smallest cutoff c','number',str(h)),field('domain','Inverse domain','set',f'[{k},inf)'),field('value','Requested inverse value','number',str(h+3))],
          fr'<p>A cutoff below the vertex includes both sides and repeats some outputs. The smallest suitable cutoff is c={h}. The inverse domain is \([{k},\infty)\), and the positive branch gives \({h}+\sqrt9={h+3}\).</p>',dict(kind='cutoff',h=h,k=k))
    h,k=(2,3) if v==0 else (4,1);f=(x-k)**2+h
    quick('restricted',4,v,'Invert a root with an open endpoint',fr'<p>For \(f(x)=\sqrt{{x-{h}}}+{k}\), \(x&gt;{h}\), find the inverse formula, its domain and its range.</p>',
          [field('formula','Inverse formula in x','polynomial',str(s.expand(f)),variables=['x']),field('domain','Inverse domain','set',f'({k},inf)'),field('range','Inverse range','set',f'({h},inf)')],
          fr'<p>Rearrange and square after retaining the condition \(y&gt;{k}\). This gives \(f^{{-1}}(x)={s.latex(f)}\), with the original open range as its domain.</p>',dict(kind='root_inverse',h=h,k=k))

    pairs=[(1,4),(2,6),(3,8)] if v==0 else [(-2,1),(0,3),(4,7)]
    quick('graphs',1,v,'Reflect every marked point',r'<p>The following marked points lie on a one–one function graph: '+', '.join(fr'\(({a},{b})\)' for a,b in pairs)+r'. Give all corresponding points on the inverse graph.</p>',
          [field('points','All reflected points (x,y)','pairs',';'.join(f'({b},{a})' for a,b in pairs))],
          '<p>Reflect in y = x by interchanging the two coordinates in every pair.</p>',dict(kind='reflect_points',points=pairs))
    h=1+v;f=(x-h)**2+h
    quick('graphs',2,v,'All intersections with an inverse',fr'<p>For \(f(x)=(x-{h})^2+{h}\), \(x\ge{h}\), find all common points of y=f(x) and its inverse graph.</p>',
          [field('points','All common points (x,y)','pairs',f'({h},{h});({h+1},{h+1})')],
          fr'<p>The restricted function is strictly increasing. A common point therefore lies on y=x. Solving \((x-{h})^2+{h}=x\) gives x={h} or {h+1}; both satisfy the domains.</p>',dict(kind='inverse_intersections',h=h))
    k=9 if v==0 else 16;c=int(s.sqrt(k))
    quick('graphs',3,v,'A self-inverse reciprocal graph',fr'<p>Let \(f(x)={k}/x\), \(x\ne0\). Give the inverse expression as numerator ; denominator, and all points where the graph crosses y=x.</p>',
          [field('inverse','Inverse: numerator ; denominator','ratio',[str(k),'x'],variables=['x']),field('points','All points on y=x','pairs',f'({-c},{-c});({c},{c})')],
          fr'<p>Rearranging shows the inverse is the same function. The diagonal intersections satisfy \(x^2={k}\), giving both signs. The graphs themselves coincide away from the diagonal too.</p>',dict(kind='reciprocal_graph',k=k))
    m,b=(3,-6) if v==0 else (2,-8);lower=1
    quick('graphs',4,v,'Check an inverse intercept against its domain',fr'<p>Let \(f(x)={m}x{b:+}\), \(x\ge1\). Does the inverse graph have an x-intercept? Give its y-intercept.</p>',
          [field('intercept','Inverse x-intercept','choice','B',options={'A':fr'\(({b},0)\)','B':'There is no x-intercept.','C':fr'\(({-b},0)\)'}),field('point','Inverse y-intercept (x,y)','pairs',f'(0,{s.Rational(-b,m)})')],
          fr'<p>The inverse range is \([1,\infty)\), so its output cannot be zero. Its domain starts at f(1)={m+b}, so zero is an allowed inverse input. The inverse value at zero is \({s.latex(s.Rational(-b,m))}\).</p>',dict(kind='intercepts',m=m,b=b))

    A,B,h,k,u,w=(2,3,1,-4,3,-1) if v==0 else (-3,-2,-1,2,4,3)
    a,b=(2,6);left=h+s.Rational(a,B);right=h+s.Rational(b,B)
    domain=f'[{left},{right})' if B>0 else f'({right},{left}]'
    quick('transformations',1,v,'A point and a domain under a combined change',fr'<p>The point \(({u},{w})\) lies on y=f(x), whose domain is \([{a},{b})\). Find its corresponding point and the domain of \(y={A}f({s.latex(B*(x-h))}){k:+}\).</p>',
          [field('point','Transformed point (x,y)','pairs',f'({h+s.Rational(u,B)},{A*w+k})'),field('domain','Transformed domain','set',domain)],
          fr'<p>Use \((u,v)\mapsto(h+u/B,Av+k)\). Transform each domain endpoint with the same horizontal rule; if B is negative, reverse their order while retaining inclusion.</p>',dict(kind='transform_point',A=A,B=B,h=h,k=k,u=u,v=w,lo=a,hi=b))
    h,k=(3,-2) if v==0 else (-2,5);f=x*x+2*x-1;new=s.expand(f.subs(x,x-h)+k)
    quick('transformations',2,v,'Translate the entire formula',fr'<p>The graph \(y=x^2+2x-1\) is translated by \(\begin{{pmatrix}}{h}\\{k}\end{{pmatrix}}\). Give the new polynomial expression for y.</p>',
          [field('formula','New expression for y','polynomial',str(new),variables=['x'])],
          fr'<p>Replace x by \(x-({h})\) in every occurrence and then add {k}:</p>\[y={s.latex(new)}.\]',dict(kind='translation',h=h,k=k))
    A,B=(-2,s.Rational(1,3)) if v==0 else (3,-2);f=x**3-2*x;new=s.expand(A*f.subs(x,B*x))
    quick('transformations',3,v,'Reflect and stretch in perpendicular directions',fr'<p>Given \(f(x)=x^3-2x\), find the polynomial expression for \(y={A}f({s.latex(B*x)})\).</p>',
          [field('formula','New expression for y','polynomial',str(new),variables=['x'])],
          fr'<p>Substitute the entire new input before applying the outside multiplier:</p>\[y={s.latex(new)}.\]',dict(kind='stretch',A=A,B=str(B)))
    h,scale=(2,3) if v==0 else (3,2);f=(x-1)**2+2;first=s.expand(f.subs(x,x/scale-h));second=s.expand(f.subs(x,(x-h)/scale))
    quick('transformations',4,v,'Compare two orders of horizontal changes',fr'<p>Start with \(y=(x-1)^2+2\). Find the new expression after translation {h} units right followed by a horizontal stretch of factor {scale}; then give the expression for the reverse order.</p>',
          [field('first','Translate, then stretch','polynomial',str(first),variables=['x']),field('second','Stretch, then translate','polynomial',str(second),variables=['x'])],
          fr'<p>The first order gives \(y=f(x/{scale}-{h})\); the reverse gives \(y=f((x-{h})/{scale})\). Expanding:</p>\[y={s.latex(first)},\qquad y={s.latex(second)}.\]',dict(kind='order',h=h,scale=scale))
