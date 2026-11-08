"""Independent 9709 P1 differentiation teaching and complete-answer practice."""
import sympy as s
x,y,h=s.symbols('x y h',real=True);u=s.Symbol('u',positive=True)
lessons,questions,models=[],[],[]
def tex(v):return s.latex(s.sympify(str(v),locals={'x':x,'y':y,'h':h,'u':u}))
def math(v):return r'\('+tex(v)+r'\)'
def image(name,alt):return '<p><img src="/assets/original/differentiation/'+name+'.svg" alt="'+alt+'"></p>'
def ex(title,question,solution,key):return dict(title=title,question=question,solution=solution,verification=key)
def lesson(key,suffix,title,summary,objective,before,ideas,method,mistakes,examples):
 lessons.append(dict(key=key,id='orig_differentiation_'+suffix,title=title,summary=summary,objective=objective,before=before,ideas=ideas,method=method,mistakes=mistakes,examples=examples))

lesson('derivatives','derivatives','Derivatives, rational powers and the chain rule',
 'Connect limiting chord gradients to a derivative and differentiate complete power expressions on their valid domains.',
 'Use first and second derivatives of powers and composite powers, retaining inner derivatives and original domain restrictions.',
 '<p>Recall index laws, exact fractions, expanding brackets and gradients of straight lines.</p>',
 r'''<h3>A tangent gradient is a limit of chord gradients</h3><p>For a point with x-coordinate a and a nearby point a+h, where h≠0, the chord gradient is</p>\[\frac{f(a+h)-f(a)}h.\]<p>Simplify before allowing h to approach zero. When this limit is finite it is f′(a), the tangent gradient. The chord at a nonzero separation is usually a different line.</p>'''+image('secant-to-tangent','A secant and tangent on a quadratic curve have different gradients')+r'''
 <h3>Rewrite roots and reciprocals as powers</h3>\[\frac{d}{dx}x^n=nx^{n-1}.\]<p>Use this for rational n wherever the function and derivative are defined. Differentiate a sum term by term; constants have derivative zero. For example, √x=x¹ᐟ² and 1/x=x⁻¹. The function’s real domain and its finite-derivative domain need not have the same boundary.</p>
 <h3>A composite power needs the inner derivative</h3>\[\frac{d}{dx}(ax+b)^n=an(ax+b)^{n-1}.\]<p>More generally, if y=g(v) and v=f(x), multiply dy/dv by dv/dx. Simplifying a product or quotient into powers first often avoids any need for extra rules. This chapter does not introduce P3 differentiation of logarithmic or trigonometric functions.</p>
 <h3>Differentiate again for the second derivative</h3>\[f^{\prime\prime}(x)=\frac{d^2y}{dx^2}.\]<p>It describes the rate of change of the first derivative, not its square. Keep domains and chain factors in both differentiations.</p>''',
 '<ol><li>Record the original real domain and rewrite powers clearly.</li><li>Apply the power rule to every term.</li><li>For a composite, multiply by the derivative of the whole inner expression.</li><li>Simplify, check the finite-derivative domain and evaluate only after differentiating.</li></ol><p>The written questions combine these methods with geometry, stationary conditions and rates later in the chapter.</p>',
 ['Lower the power by one as well as multiplying by the old power.', 'A constant differentiates to zero.', 'The second derivative is not (f′)².', 'Do not omit the inner derivative or evaluate at an excluded input.'],[
 ex('Simplify the chord before taking a limit',r'<p>For \(f(x)=2x^2-x+3\), find the chord gradient between x=1 and x=1+h, then the tangent gradient at x=1.</p>',r'\[\frac{f(1+h)-f(1)}h=\frac{3h+2h^2}{h}=3+2h\quad(h\ne0).\]<p>The limiting gradient is 3 as h→0. The cancellation uses h≠0; the limit is taken afterwards.</p>','DF-CHORD'),
 ex('Use rational powers with the correct signs',r'<p>Differentiate \(f(x)=3x^{3/2}-\frac4x+5\), for x&gt;0.</p>',r'\[f(x)=3x^{3/2}-4x^{-1}+5,\]\[f^{\prime}(x)=\frac92\sqrt{x}+\frac4{x^2}.\]<p>The reciprocal term has a positive derivative here because its negative coefficient multiplies the negative exponent. The constant contributes zero.</p>','DF-RATIONAL-POWERS'),
 ex('Keep the inner factor',r'<p>Differentiate \(y=(3x-1)^5\).</p>',r'<p>Let v=3x−1. Then dy/dv=5v⁴ and dv/dx=3, so</p>\[\frac{dy}{dx}=15(3x-1)^4.\]<p>The coefficient 15 includes both the outer power and the inner gradient.</p>','DF-CHAIN'),
 ex('A real endpoint need not have a finite gradient',r'<p>For \(y=\sqrt{4x+5}\), give its real domain, derivative and finite-derivative domain.</p>',r'<p>The function is real for x≥−5/4. Differentiating gives</p>\[\frac{dy}{dx}=\frac{2}{\sqrt{4x+5}}.\]<p>This derivative is finite for x&gt;−5/4. At the endpoint the function exists, but the displayed derivative cannot be evaluated by substitution.</p>','DF-DOMAIN')])

lesson('tangents','tangents_normals','Tangents, normals and prescribed gradients',
 'Use the point on the curve and its derivative to form a complete line equation, including horizontal and vertical cases.',
 'Find tangent and normal equations, solve prescribed-gradient conditions and recover parameters from geometric information.',
 '<p>Recall point-gradient equations, perpendicular lines and complete root sets.</p>',
 r'''<h3>Find both the point and the gradient</h3><p>At x=a, the point is (a,f(a)) and the finite tangent gradient is m=f′(a).</p>\[y-f(a)=m(x-a).\]<p>Do not use the derivative value as the ordinate. Equivalent complete line equations are acceptable.</p>'''+image('tangent-normal','The tangent and normal pass through the same point and are perpendicular')+r'''
 <h3>A normal is perpendicular to the tangent</h3><p>If m≠0 is finite, its normal has gradient −1/m. If m=0, the tangent is horizontal y=f(a) and the normal is vertical x=a. The expression −1/0 is not a gradient.</p>
 <h3>A prescribed gradient can occur at several points</h3><p>Solve f′(x)=m for every input in the original curve domain, then recover each ordinate. Equal tangent gradients mean parallel tangents, not necessarily the same line.</p>
 <h3>Parameter conditions use two different facts</h3><p>A point lying on the curve gives an equation in f. A tangent or normal direction gives an equation in f′. Use both when recovering missing constants, and verify both original conditions.</p>''',
 '<ol><li>Find or verify the actual point on the original curve.</li><li>Differentiate and evaluate the tangent gradient there.</li><li>For a normal, handle m=0 before taking a negative reciprocal.</li><li>Give the full line equation and retain every valid point or parameter case.</li></ol>',
 ['The derivative is a gradient, not a coordinate.', 'The normal uses a negative reciprocal when that reciprocal is defined.', 'A zero tangent gradient gives a vertical normal.', 'A gradient equation may have two valid points.'],[
 ex('Two different lines through one curve point',r'<p>Find the tangent and normal to \(y=x^2\) at (1,1).</p>',r'<p>The derivative is 2x, giving tangent gradient 2.</p>\[y=2x-1,\qquad y=-\frac12x+\frac32.\]<p>Both lines pass through (1,1), and their finite gradients multiply to −1.</p>','DF-TANGENT-NORMAL'),
 ex('Recover the ordinate before writing a line',r'<p>Find the tangent and normal to \(y=x^3-x\) at x=2.</p>',r'<p>The point is (2,6); the tangent gradient is 3(2)²−1=11.</p>\[y-6=11(x-2),\]\[y-6=-\frac1{11}(x-2).\]<p>Using 11 as the ordinate would give a line through the wrong point.</p>','DF-LINE-POINT'),
 ex('A horizontal tangent has a vertical normal',r'<p>Find the tangent and normal to \(y=(x-2)^2+3\) at its stationary point.</p>',r'<p>The derivative 2(x−2) vanishes at x=2, where y=3. Therefore</p>\[\text{tangent: }y=3,\qquad\text{normal: }x=2.\]<p>No reciprocal of zero is taken.</p>','DF-VERTICAL-NORMAL'),
 ex('One gradient, two complete answers',r'<p>Find the points on \(y=x^3-3x\) where the tangent gradient is 9, and give both tangent equations.</p>',r'\[3x^2-3=9\quad\Rightarrow\quad x=\pm2.\]<p>The points are (−2,−2) and (2,2). Their tangents are</p>\[y=9x+16,\qquad y=9x-16.\]<p>The slopes agree but the lines have different intercepts.</p>','DF-PRESCRIBED-GRADIENT')])

lesson('behaviour','curve_behaviour','Derivative signs, stationary points and ranges',
 'Separate a stationary point from a turning point and distinguish local classification from the range on the full domain.',
 'Find complete stationary-point sets, classify them and solve derivative-sign and restricted-range questions.',
 '<p>Recall exact inequalities, curve domains, second derivatives and open or closed interval notation.</p>',
 r'''<h3>Derivative signs describe local change</h3><p>Where f′(x)&gt;0 throughout an interval, f increases; where f′(x)&lt;0, it decreases. An isolated zero derivative need not interrupt strict increase: x³ increases through x=0. Read whether a question asks for a derivative-sign set or a monotonic interval.</p>
 <h3>A stationary point has a finite zero derivative</h3><p>Solve f′(x)=0 in the original domain, then give both coordinates. A pole or other undefined input is not a stationary point.</p>'''+image('stationary-sign-chart','Derivative signs distinguish a local maximum from a local minimum')+r'''
 <h3>Classify using a justified test</h3><p>A change + to − in f′ gives a local maximum; − to + gives a local minimum. At a stationary input a, f″(a)&gt;0 gives a local minimum and f″(a)&lt;0 a local maximum. If f″(a)=0, the test is inconclusive: examine the signs or the curve further.</p>'''+image('stationary-inflection','A stationary point can have no change in derivative sign')+r'''
 <h3>Ranges also need endpoints, limits and excluded inputs</h3><p>A local extremum need not be a global one. On a closed interval compare all valid interior stationary values with both endpoint values. On an open or unbounded domain consider limits and whether a bound is attained. Keep separate components around a pole separate.</p>''',
 '<ol><li>Record the domain before solving f′=0 or a sign inequality.</li><li>Recover every stationary point’s ordinate.</li><li>Classify with f″ when decisive, otherwise use derivative signs.</li><li>For a range or global bound, also inspect endpoints and limiting behaviour.</li></ol>',
 ['A zero second derivative is inconclusive.', 'Stationary does not automatically mean a maximum or minimum.', 'An excluded pole is not a candidate.', 'An endpoint can give a global bound without zero derivative.'],[
 ex('A full sign chart gives two different extrema',r'<p>Find and classify every stationary point of \(f(x)=x^3-3x\).</p>',r'\[f^{\prime}(x)=3(x-1)(x+1).\]<p>The signs are +, −, + on the intervals cut by −1 and 1. Therefore (−1,2) is a local maximum and (1,−2) is a local minimum. The second derivative 6x confirms these classifications.</p>','DF-SIGN-CLASSIFICATION'),
 ex('The second-derivative test can be inconclusive',r'<p>Classify the stationary point of \(y=x^3\).</p>',r'<p>The derivative 3x² vanishes only at (0,0), and the second derivative 6x is also zero there. The first derivative is positive on both sides, so there is no turning extremum. The curve has a stationary point of inflection.</p>','DF-INCONCLUSIVE'),
 ex('A pole separates two components',r'<p>For \(f(x)=x+\frac4x\), x≠0, find the stationary points and the full range.</p>',r'\[f^{\prime}(x)=1-\frac4{x^2}=0\quad\Rightarrow\quad x=\pm2.\]<p>The points are (−2,−4), a local maximum on the negative branch, and (2,4), a local minimum on the positive branch. Each branch tends away from its bound towards an infinite magnitude.</p>\[\text{range}=(-\infty,-4]\cup[4,\infty).\]<p>The excluded input zero does not join the two branches.</p>','DF-RECIPROCAL-RANGE'),
 ex('An endpoint can determine the minimum',r'<p>Find the range of \(f(x)=-x^2+4x+1\) on 0≤x≤5.</p>',r'<p>The stationary input is x=2, giving f(2)=5. The endpoint values are f(0)=1 and f(5)=−4.</p>\[\text{range}=[-4,5].\]<p>The maximum is interior, while the minimum is at the right endpoint.</p>','DF-ENDPOINT-RANGE')])

lesson('rates','rates','Connected rates, units and small-change estimates',
 'Link rates through the correct variable, retain their signs and distinguish an exact rate from a local estimate.',
 'Use the chain rule for connected time rates and estimate small changes with clearly stated units and approximation status.',
 '<p>Recall geometry formulas, signed rates, unit conversion and the chain rule.</p>',
 r'''<h3>Connect the variables before inserting numbers</h3><p>If y=f(x) and x varies with time,</p>\[\frac{dy}{dt}=\frac{dy}{dx}\frac{dx}{dt}.\]<p>A gradient dy/dx is not a time rate until it is multiplied by dx/dt. For an inverse question, divide by dy/dx only where it is nonzero.</p>
 <h3>Use the geometry variable consistently</h3><p>For a sphere V=4πr³/3,</p>\[\frac{dV}{dt}=4\pi r^2\frac{dr}{dt}.\]<p>Radius, diameter and depth are different variables. Convert units before substituting, and check that the final units match the requested rate.</p>'''+image('related-rates','A geometric derivative is multiplied by the radius time rate')+r'''
 <h3>A negative rate is meaningful</h3><p>A decreasing area or shrinking radius has a negative signed rate. Do not replace a rate by its magnitude unless the question asks for speed or a positive rate of decrease.</p>
 <h3>A small increment gives an estimate</h3>\[\Delta y\approx f^{\prime}(a)\,\Delta x,\]\[f(a+\Delta x)\approx f(a)+f^{\prime}(a)\Delta x.\]<p>This local linear estimate uses the derivative at the starting input. It is not an exact finite change for a nonlinear function. State the approximation and keep the input inside the original domain.</p>''',
 '<ol><li>Define the variables, units and which rate is known.</li><li>Differentiate the relationship symbolically.</li><li>Connect rates with the chain rule and then substitute the current state.</li><li>Retain the sign and units; label a finite small-change calculation as an estimate.</li></ol>',
 ['dy/dx and dy/dt have different units.', 'A diameter rate is twice the corresponding radius rate.', 'A shrinking quantity has a negative signed rate.', 'A derivative-based small change is generally approximate.'],[
 ex('A radius rate gives a volume rate',r'<p>A spherical model has radius 2 cm increasing at 0.1 cm/s. Find dV/dt.</p>',r'\[\frac{dV}{dt}=4\pi(2)^2(0.1)=\frac{8\pi}{5}\text{ cm}^3\text{/s}.\]<p>The geometric derivative has units cm² and the radius rate cm/s, giving the required volume rate.</p>','DF-SPHERE-RATE'),
 ex('A negative area rate means a shrinking radius',r'<p>A circle has radius 5 cm and its area changes at −10π cm²/s. Find the signed radius rate.</p>',r'\[\frac{dA}{dt}=2\pi r\frac{dr}{dt}.\]\[\frac{dr}{dt}=\frac{-10\pi}{10\pi}=-1\text{ cm/s}.\]<p>The negative sign is part of the answer. Its positive rate of decrease has magnitude 1 cm/s.</p>','DF-INVERSE-RATE'),
 ex('A coordinate gradient must be connected to time',r'<p>A point moves on \(y=x^3-x\). At x=2, dx/dt=−1/5. Find dy/dt.</p>',r'<p>The curve gradient is 3(2)²−1=11, so</p>\[\frac{dy}{dt}=11\left(-\frac15\right)=-\frac{11}{5}.\]<p>Although the curve gradient is positive here, y decreases because x is moving in the negative direction.</p>','DF-COORDINATE-RATE'),
 ex('An estimated increment is not an exact difference',r'<p>Use \(y=\sqrt{x+5}\) at x=4 to estimate \(\sqrt{9.06}\).</p>',r'<p>Here Δx=0.06 and y′=1/(2√(x+5)), so y′(4)=1/6.</p>\[\Delta y\approx\frac16(0.06)=0.01.\]<p>The estimate is 3+0.01=3.01. The exact value is √9.06, so the linear estimate must not be presented as an exact equality.</p>','DF-SMALL-CHANGE')])

lesson('optimisation','optimisation','Optimisation, transformations and linked conditions',
 'Build a model on its feasible domain, compare global candidates and carry the chain rule into transformed curves.',
 'Solve constrained maximum/minimum and linked-curve problems, verifying feasibility, boundaries and all original conditions.',
 '<p>Recall stationary-point classification, geometry, eliminating a variable and function transformations.</p>',
 r'''<h3>A model needs a feasible interval</h3><p>Define the independent variable and eliminate other quantities using the constraint. Require positive lengths and respect any open endpoints. Differentiate the objective, not the constraint by itself.</p>'''+image('optimisation-interval','An objective on an open feasible interval has a genuine interior maximum')+r'''
 <h3>A stationary candidate still needs a global argument</h3><p>Classify valid interior candidates and examine endpoints or limits. A limiting value at an excluded endpoint is not an attained maximum or minimum. On a closed interval, compare endpoint values too.</p>
 <h3>Transformations change gradients and locations</h3><p>If g(x)=A f(Bx)+C, then</p>\[g^{\prime}(x)=ABf^{\prime}(Bx).\]<p>For nonzero A,B, stationary inputs satisfy f′(Bx)=0. A vertical shift changes ordinates, a horizontal scale changes input locations, and a negative vertical factor reverses maximum/minimum classifications.</p>
 <h3>Linked conditions use both f and f′</h3><p>A point condition, a shared term, a prescribed gradient or a stationary input gives a different equation. Solve the actual system and restore each candidate, including sign, domain and nonzero conditions.</p>
 <p>The written bank combines transformations and parameter/stationary conditions with a practical cylinder model. Short practice separately develops feasible domains, endpoint comparison and constrained optimisation.</p>''',
 '<ol><li>Define variables and the full feasible domain.</li><li>Write one objective or a linked system using the original constraints.</li><li>Differentiate, solve all candidates and reject infeasible ones.</li><li>Compare relevant values or limits and restore every requested quantity and unit.</li></ol>',
 ['An algebraic stationary root may lie outside the feasible domain.', 'A global bound can occur at an endpoint.', 'An excluded limiting value is not attained.', 'A transformed derivative needs both outside and inside factors.'],[
 ex('A fixed perimeter gives one area variable',r'<p>A rectangle has perimeter 24 cm. Find its greatest possible area.</p>',r'<p>Let its sides be x and 12−x, with 0&lt;x&lt;12.</p>\[A=x(12-x),\qquad A^{\prime}=12-2x.\]<p>The only stationary input is x=6. A″=−2, and the limiting area is zero at both excluded endpoints. The global maximum is 36 cm² at a 6 cm by 6 cm square.</p>','DF-RECTANGLE'),
 ex('An open cylinder must satisfy its material constraint',r'<p>An open-top cylinder has total material area 54π. Find the radius and height giving greatest volume.</p>',r'\[\pi r^2+2\pi rh=54\pi,\qquad h=\frac{54-r^2}{2r}.\]<p>Feasibility gives 0&lt;r&lt;√54. Then</p>\[V=\frac\pi2(54r-r^3),\qquad V^{\prime}=\frac\pi2(54-3r^2).\]<p>The valid stationary radius is r=3√2, giving h=3√2. V″=−3πr&lt;0, and the boundary limits of V are zero. The greatest volume is 54√2π.</p>','DF-CYLINDER'),
 ex('Eliminate a linked positive variable',r'<p>Positive x and y satisfy xy=18. Find the minimum of z=2x+y and the pair where it occurs.</p>',r'\[z=2x+\frac{18}{x},\qquad z^{\prime}=2-\frac{18}{x^2}.\]<p>The valid stationary input is x=3, giving y=6 and z=12. The second derivative is positive, while z tends to infinity at both ends of x&gt;0. Thus this is the global minimum.</p>','DF-FIXED-PRODUCT'),
 ex('Carry both scale factors into the derivative',r'<p>Let \(f(x)=x^3-3x\) and \(g(x)=2f(\frac x2)+1\). Find g′ and all stationary points of g.</p>',r'\[g^{\prime}(x)=2\left(\frac12\right)f^{\prime}(x/2)=\frac34x^2-3.\]<p>The stationary inputs are x=±2. They give (−2,5), a local maximum, and (2,−3), a local minimum. The positive vertical factor preserves nature; the horizontal stretch doubles the original stationary inputs.</p>','DF-TRANSFORMATION')])

def field(key,label,kind,expected,**extra):return dict(key=key,label=label,type=kind,expected=list(map(str,expected)) if isinstance(expected,list) else str(expected),**extra)
def pairs(*ps):return ';'.join('('+','.join(str(s.simplify(v)) for v in a)+')' for a in ps)
def values(*vs):return '{'+','.join(str(s.simplify(v)) for v in vs)+'}'
def show(f):
 v=f['expected']
 if f['type']=='choice':return f['options'][v]
 if f['type']=='ratio':return r'\(\frac{'+tex(v[0])+'}{'+tex(v[1])+r'}\)'
 if f['type']=='pairs':return r'\(\{'+r',\ '.join('('+r',\ '.join(tex(z) for z in a[1:-1].split(','))+')' for a in v.split(';'))+r'\}\)'
 if f['type']=='set':
  if v.startswith('{'):return r'\(\{'+r',\ '.join(tex(a) for a in v[1:-1].split(','))+r'\}\)'
  return r'\('+v.replace('inf',r'\infty').replace('pi',r'\pi').replace(' U ',r'\cup ')+r'\)'
 return math(v)
def quick(topic,family,v,title,prompt,fields,solution,model):
 uid=f'M4U-9709-P1-DF-CHECK-{topic.upper()}-{family}-{v}'
 answer=''.join('<p>'+f['label']+': '+show(f)+'</p>' for f in fields)
 hint={'derivatives':'Rewrite powers, differentiate with respect to the stated variable and retain the inner factor and domain.',
 'tangents':'Find the curve point and tangent gradient, then use the correct perpendicular line, including vertical normals.',
 'behaviour':'Use the original domain, all derivative roots and a justified classification or boundary check.',
 'rates':'Connect the given rate through the correct derivative, then retain units, signs and approximation status.',
 'optimisation':'Define the feasible domain, restore every candidate and compare endpoint values or limits.'}[topic]
 questions.append(dict(id=uid,family_uid=f'M4U-9709-P1-DF-CHECK-{topic.upper()}-{family}',lesson=topic,title=title,collection='short' if v==0 else 'variant',prompt_html=prompt,answer_html=answer,solution_html=solution+'<h4>Complete answers</h4>'+answer,hint_html='<p>'+hint+'</p>',marks=len(fields),difficulty=2,fields=fields,parts=[dict(label='',marking_criteria=[dict(code='B1',marks=1,description_html='Complete correct answer for '+f['label']+'.') for f in fields])],verification=uid))
 models.append(dict(uid=uid,**model))

for v in range(2):
 F,a=(2*x*x-3*x+1,1) if v==0 else (3*x*x+x-4,-1);chord=s.expand(s.cancel((F.subs(x,a+h)-F.subs(x,a))/h))
 quick('derivatives',1,v,'A chord and its limiting gradient','<p>For f(x)='+math(F)+', points have x-coordinates '+math(a)+' and '+math(a+h)+', with h≠0. Give the complete chord gradient as a polynomial in h and its limit as h→0.</p>',
  [field('chord','Chord gradient in h','polynomial',chord,variables=['h']),field('limit','Limiting tangent gradient','number',s.diff(F,x).subs(x,a))],'<p>Use the difference in function values divided by h. Cancel only for nonzero h, then let the separation approach zero.</p>',dict(kind='chord',F=str(F),a=a))
 F=2*x**4-3*x*x+5*x-7 if v==0 else 3*x**5-2*x**3+4*x-6
 quick('derivatives',2,v,'Two complete derivative functions','<p>For f(x)='+math(F)+', give f′(x) and f″(x).</p>',
  [field('first','First derivative f′(x)','polynomial',s.diff(F,x),variables=['x']),field('second','Second derivative f″(x)','polynomial',s.diff(F,x,2),variables=['x'])],'<p>Differentiate every term with the power rule, including the linear term. Differentiate the resulting function again for f″.</p>',dict(kind='polynomial_derivatives',F=str(F)))
 a,b,at=(3,-2,4) if v==0 else (4,3,9);F=a*s.sqrt(x)+s.Rational(b,1)/s.sqrt(x);D=s.diff(F,x);N,Q=s.fraction(s.together(D.subs(x,u*u)))
 quick('derivatives',3,v,'A complete derivative with fractional and negative powers','<p>For f(x)='+math(F)+r', x&gt;0, first differentiate with respect to x. Express the complete derivative as one reduced fraction N(u)/D(u), where \(u=\sqrt{x}\). Enter numerator;denominator as polynomials in u. Also find f′('+str(at)+') and the finite-derivative x-domain.</p>',
  [field('derivative','Full derivative in u: numerator;denominator','ratio',[s.expand(N),s.expand(Q)],variables=['u']),field('gradient',f'Gradient f′({at})','number',s.simplify(D.subs(x,at))),field('domain','Finite-derivative x-domain','set','(0,inf)')],r'<p>Use √x=x¹ᐟ² and 1/√x=x⁻¹ᐟ². Differentiate in x before using u²=x to present one reduced fraction. The u-substitution is only an answer representation, not a change in the differentiation variable.</p>',dict(kind='rational_powers',a=a,b=b,at=at))
 a,b,N,c,at=(2,-1,4,3,1) if v==0 else (3,2,3,-1,0);F=(a*x+b)**N+c*x;D=s.diff(F,x)
 quick('derivatives',4,v,'A linear inner function still contributes a factor','<p>For f(x)='+math(F)+', give the complete derivative and the gradient at x='+str(at)+'. A factored or expanded correct derivative is acceptable.</p>',
  [field('derivative','Complete derivative f′(x)','polynomial',s.expand(D),variables=['x']),field('gradient',f'Gradient at x={at}','number',D.subs(x,at))],'<p>Differentiate the outer power, multiply by the inner derivative, and include the derivative of the separate linear term.</p>',dict(kind='chain',a=a,b=b,N=N,c=c,at=at))

 F,at=(x*x+x-1,1) if v==0 else (x*x-2*x+4,3);yy=F.subs(x,at);slope=s.diff(F,x).subs(x,at)
 quick('tangents',1,v,'Two full perpendicular line equations','<p>Find the tangent and normal to y='+math(F)+' at x='+str(at)+'. Give complete equations in x and y.</p>',
  [field('tangent','Tangent equation','equation',y-yy-slope*(x-at),variables=['x','y']),field('normal','Normal equation','equation',y-yy+(x-at)/slope,variables=['x','y'])],'<p>Recover the ordinate from the original curve. Evaluate its derivative for the tangent slope, take the negative reciprocal for the normal and use the same point in both equations.</p>',dict(kind='tangent_normal',F=str(F),at=at))
 a,b=(2,3) if v==0 else (-1,4);F=(x-a)**2+b
 quick('tangents',2,v,'A zero gradient needs a vertical normal','<p>Find the tangent and normal to y='+math(F)+' at its stationary point. Give both complete line equations.</p>',
  [field('tangent','Tangent equation','equation',y-b,variables=['x','y']),field('normal','Normal equation','equation',x-a,variables=['x','y'])],'<p>The derivative vanishes at x=a. The tangent is horizontal y=b; its perpendicular normal is the vertical line x=a.</p>',dict(kind='zero_normal',a=a,b=b))
 c,m=(3,9) if v==0 else (12,0);F=x**3-c*x;points=[(-2,F.subs(x,-2)),(2,F.subs(x,2))];intercepts=[Y-m*X for X,Y in points]
 quick('tangents',3,v,'Every point with a prescribed gradient','<p>On y='+math(F)+', find all points with tangent gradient '+str(m)+', then all y-intercepts of those tangents.</p>',
  [field('points','All curve points (x,y)','pairs',pairs(*points)),field('intercepts','All tangent y-intercepts','set',values(*intercepts))],'<p>Solve the gradient equation for every allowed x. Restore each ordinate, then use b=y−mx for each corresponding tangent intercept.</p>',dict(kind='prescribed_gradient',c=c,m=m))
 X,Y,normal=(1,8,-s.Rational(1,6)) if v==0 else (2,5,s.Rational(1,2));K=-1/normal-2*X;C=Y-X*X-K*X;slope=-1/normal
 quick('tangents',4,v,'Two linked conditions determine two constants',r'<p>The curve y=x²+kx+c passes through '+math((X,Y))+'. Its normal there has gradient '+math(normal)+'. Find (k,c) and the tangent equation.</p>',
  [field('parameters','Parameter pair (k,c)','pairs',pairs((K,C))),field('tangent','Tangent equation','equation',y-Y-slope*(x-X),variables=['x','y'])],'<p>The normal direction fixes the negative-reciprocal tangent slope, hence k. The point-on-curve condition then fixes c. Restore both conditions before writing the tangent.</p>',dict(kind='line_parameters',X=X,Y=Y,normal=str(normal)))

 a=1+v;F=x**3-3*a*a*x;points=[(-a,F.subs(x,-a)),(a,F.subs(x,a))];choice='B' if v==0 else 'C';options={'A':'Both are local minima','B':'Left maximum, right minimum','C':'Left minimum, right maximum'} if v==0 else {'A':'Both are local maxima','B':'Left minimum, right maximum','C':'Left maximum, right minimum'}
 quick('behaviour',1,v,'Every stationary point and its nature','<p>Find all stationary points of f(x)='+math(F)+' and select their nature from left to right.</p>',
  [field('points','All stationary points (x,y)','pairs',pairs(*points)),field('nature','Nature from left to right','choice',choice,options=options)],'<p>Solve f′=0, recover both ordinates and use the second derivative or a full derivative sign chart.</p>',dict(kind='stationary_cubic',a=a,choice=choice))
 F=x**3-3*x if v==0 else -x**3+12*x;positive='(-inf,-1) U (1,inf)' if v==0 else '(-2,2)';negative='(-1,1)' if v==0 else '(-inf,-2) U (2,inf)'
 quick('behaviour',2,v,'Strict derivative-sign sets','<p>For f(x)='+math(F)+', find the full sets where f′(x)&gt;0 and f′(x)&lt;0. The inequalities are strict.</p>',
  [field('positive','Set where f′>0','set',positive),field('negative','Set where f′<0','set',negative)],'<p>Factor the derivative and test each interval separated by its real roots. Exclude roots from both strict sign sets.</p>',dict(kind='sign_sets',F=str(F)))
 a,b=(0,0) if v==0 else (2,1);F=(x-a)**3+b;choice='C' if v==0 else 'B';options={'A':'Local maximum','B':'Local minimum','C':'Stationary point without a turning extremum'} if v==0 else {'A':'Local minimum','B':'Stationary point without a turning extremum','C':'Local maximum'}
 quick('behaviour',3,v,'An inconclusive second derivative','<p>For f(x)='+math(F)+', give its stationary point, the second derivative there and the correct classification.</p>',
  [field('point','Stationary point (x,y)','pairs',pairs((a,b))),field('second','Second derivative there','number',0),field('nature','Classification','choice',choice,options=options)],'<p>The second derivative is zero at the stationary input. The first derivative is positive on both sides, so there is no turning extremum.</p>',dict(kind='stationary_nonturning',a=a,b=b,choice=choice))
 A,sign=(4,1) if v==0 else (9,-1);X=sign*s.sqrt(A);Y=X+A/X;domain='x>0' if sign>0 else 'x<0';range_text='['+str(Y)+',inf)' if sign>0 else '(-inf,'+str(Y)+']';choice='A' if sign>0 else 'B'
 quick('behaviour',4,v,'A restricted reciprocal branch has one bound','<p>For f(x)='+math(x+A/x)+', '+domain+', find the stationary point, full range and its global nature on this branch.</p>',
  [field('point','Stationary point (x,y)','pairs',pairs((X,Y))),field('range','Full range','set',range_text),field('nature','Global nature','choice',choice,options={'A':'Attained minimum','B':'Attained maximum','C':'No attained bound'})],'<p>Filter the two algebraic stationary inputs by the stated domain. Use the second derivative and branch limits, or an exact square identity, to justify the full range.</p>',dict(kind='reciprocal_branch',A=A,sign=sign))

 R,speed=(2,s.Rational(1,10)) if v==0 else (3,s.Rational(1,6))
 quick('rates',1,v,'A radius rate gives a volume rate',f'<p>A spherical model has radius {R} cm increasing at '+math(speed)+' cm/s. Find dV/dr at this radius and dV/dt.</p>',
  [field('geometry','dV/dr (cm²)','number',4*s.pi*R*R),field('rate','dV/dt (cm³/s)','number',4*s.pi*R*R*speed)],'<p>Differentiate V=4πr³/3 in r, then multiply by the radius time rate. Substitute the current radius after differentiation.</p>',dict(kind='sphere',R=R,speed=str(speed)))
 R,area_rate=(5,-10*s.pi) if v==0 else (4,24*s.pi);radius_rate=area_rate/(2*s.pi*R)
 quick('rates',2,v,'Recover a signed radius rate',f'<p>A circle has radius {R} cm and signed area rate '+math(area_rate)+' cm²/s. Find dr/dt and the signed circumference rate dC/dt.</p>',
  [field('radius','dr/dt (cm/s)','number',radius_rate),field('circumference','dC/dt (cm/s)','number',2*s.pi*radius_rate)],'<p>Use dA/dt=2πr·dr/dt to recover the radius rate. Then differentiate C=2πr with respect to time. Keep a negative sign when the circle is shrinking.</p>',dict(kind='circle_inverse',R=R,area_rate=str(area_rate)))
 b,at,speed=(-3,2,-s.Rational(1,5)) if v==0 else (2,1,s.Rational(2,5));F=x**3+b*x;gradient=s.diff(F,x).subs(x,at)
 quick('rates',3,v,'A coordinate gradient is not yet a time rate','<p>A point moves on y='+math(F)+'. At x='+str(at)+', dx/dt='+math(speed)+'. Find dy/dx there and dy/dt.</p>',
  [field('gradient','Curve gradient dy/dx','number',gradient),field('rate','Coordinate time rate dy/dt','number',gradient*speed)],'<p>Differentiate the curve in x, evaluate that gradient at the current point and multiply by dx/dt.</p>',dict(kind='coordinate_rate',F=str(F),at=at,speed=str(speed)))
 at,delta=(9,s.Rational(3,50)) if v==0 else (16,-s.Rational(2,25));change=delta/(2*s.sqrt(at));estimate=s.sqrt(at)+change;choice='B' if v==0 else 'C';options={'A':'Both finite changes are exact','B':'They are local linear estimates','C':'A derivative cannot estimate a change'} if v==0 else {'A':'A derivative cannot estimate a change','B':'Both finite changes are exact','C':'They are local linear estimates'}
 quick('rates',4,v,'A small finite change is an estimate','<p>Use y=√x at x='+str(at)+' with Δx='+math(delta)+'. Estimate Δy and the new y-value, then identify what those results mean.</p>',
  [field('change','Estimated Δy','number',change),field('value','Estimated new y','number',estimate),field('meaning','Meaning of the finite-change results','choice',choice,options=options)],r'<p>Use \(\Delta y\approx f^{\prime}(a)\Delta x\) at the original input, then add that increment to f(a). These are estimates for the nonlinear square-root function.</p>',dict(kind='increment',at=at,delta=str(delta),choice=choice))

 P=24+4*v;a=s.Rational(P,4)
 quick('optimisation',1,v,'A feasible rectangle and a global maximum',f'<p>A non-degenerate rectangle has perimeter {P} cm. One side is x. Give its feasible x-interval, the x giving greatest area and that area.</p>',
  [field('domain','Feasible x-interval (cm)','set','(0,'+str(P//2)+')'),field('side','Maximising side x (cm)','number',a),field('area','Greatest area (cm²)','number',a*a)],'<p>The other side is P/2−x. Both lengths must be positive. Maximise x(P/2−x), then compare its boundary limits with the interior stationary value.</p>',dict(kind='rectangle',P=P))
 B,C,L=(4,1,5) if v==0 else (6,2,2);F=-x*x+B*x+C;candidates=[s.Integer(0),s.Integer(L)];stationary=s.Rational(B,2)
 if 0<stationary<L:candidates.append(stationary)
 lo=min(F.subs(x,t) for t in candidates);hi=max(F.subs(x,t) for t in candidates);minimum=[(t,lo) for t in candidates if F.subs(x,t)==lo];maximum=[(t,hi) for t in candidates if F.subs(x,t)==hi]
 quick('optimisation',2,v,'Endpoints compete with a stationary point','<p>For f(x)='+math(F)+f' on 0≤x≤{L}, give every global maximum point and every global minimum point.</p>',
  [field('maximum','All global maximum points (x,y)','pairs',pairs(*maximum)),field('minimum','All global minimum points (x,y)','pairs',pairs(*minimum))],'<p>Check the stationary input only if it belongs to the interval. Compare the valid stationary values and both endpoints, retaining complete coordinates.</p>',dict(kind='closed_bounds',B=B,C=C,L=L))
 K,A,B=(18,2,1) if v==0 else (32,1,2);X=s.sqrt(s.Rational(B*K,A));Y=K/X;Z=A*X+B*Y
 quick('optimisation',3,v,'Eliminate a linked positive variable',f'<p>Positive x,y satisfy xy={K}. Find the pair minimising z={A}x+{B}y and the minimum z.</p>',
  [field('pair','Minimising pair (x,y)','pairs',pairs((X,Y))),field('value','Minimum z','number',Z)],'<p>Eliminate y=K/x on x>0, differentiate the resulting objective and restore y. Verify a minimum globally by the positive second derivative and endpoint limits, or an exact nonnegative-square identity.</p>',dict(kind='fixed_product',K=K,A=A,B=B))
 A,B,C=(s.Integer(2),s.Rational(1,2),s.Integer(1)) if v==0 else (-s.Integer(1),s.Integer(2),s.Integer(3));F=x**3-3*x;G=A*F.subs(x,B*x)+C;D=s.diff(G,x);points=[(-1/B,G.subs(x,-1/B)),(1/B,G.subs(x,1/B))]
 quick('optimisation',4,v,'A transformed curve changes gradients and points',r'<p>Let \(f(x)=x^3-3x\) and \(g(x)='+tex(A)+r' f\left('+tex(B*x)+r'\right)+'+tex(C)+r'\). Give the complete g′(x) and all stationary points of g.</p>',
  [field('derivative','Complete derivative g′(x)','polynomial',s.expand(D),variables=['x']),field('points','All stationary points (x,y)','pairs',pairs(*points))],'<p>Use g′(x)=AB f′(Bx), keeping both factors. Solve for the transformed inputs and recover ordinates using the entire g, including its vertical shift.</p>',dict(kind='transformation',A=str(A),B=str(B),C=str(C)))


# Typeset inline mathematics in independently authored prose as well as displays.
# Existing TeX and HTML attributes are left intact; no owner-bank fields pass here.
def professional_html(html):
    import re
    fragments={
      'x≥−5/4':r'x\ge-\frac54','x&gt;−5/4':r'x>-\frac54',
      'y′=1/(2√(x+5))':r'y^{\prime}=\frac1{2\sqrt{x+5}}',
      'y′(4)=1/6':r'y^{\prime}(4)=\frac16',
      '√x=x¹ᐟ²':r'\sqrt{x}=x^{1/2}', '1/√x=x⁻¹ᐟ²':r'\frac1{\sqrt{x}}=x^{-1/2}',
      '1/x=x⁻¹':r'\frac1x=x^{-1}',
      'g′(x)=AB f′(Bx)':r'g^{\prime}(x)=ABf^{\prime}(Bx)',
      'g(x)=A f(Bx)+C':r'g(x)=Af(Bx)+C',
      'f′(x)=m':r'f^{\prime}(x)=m','f′(x)=0':r'f^{\prime}(x)=0',
      'm=f′(a)':r'm=f^{\prime}(a)',
      'f′(x)&gt;0':r'f^{\prime}(x)>0','f′(x)&lt;0':r'f^{\prime}(x)<0',
      'f″(a)&gt;0':r'f^{\prime\prime}(a)>0','f″(a)&lt;0':r'f^{\prime\prime}(a)<0',
      'f″(a)=0':r'f^{\prime\prime}(a)=0','f″=0':r'f^{\prime\prime}=0','f′=0':r'f^{\prime}=0',
      'N(u)/D(u)':r'\frac{N(u)}{D(u)}',
      'V=4πr³/3':r'V=\frac43\pi r^3','dA/dt=2πr·dr/dt':r'\frac{dA}{dt}=2\pi r\frac{dr}{dt}',
      '3(2)²−1=11':r'3(2)^2-1=11','A″=−2':r'A^{\prime\prime}=-2',
      'V″=−3πr&lt;0':r'V^{\prime\prime}=-3\pi r<0',
      '0&lt;r&lt;√54':r'0<r<\sqrt{54}','r=3√2':r'r=3\sqrt2','h=3√2':r'h=3\sqrt2',
      '54√2π':r'54\sqrt2\pi','−10π cm²/s':r'-10\pi\text{ cm}^2/\text{s}',
      'dx/dt=−1/5':r'\frac{dx}{dt}=-\frac15','√9.06':r'\sqrt{9.06}',
      '3+0.01=3.01':r'3+0.01=3.01','Δx=0.06':r'\Delta x=0.06',
      'dy/dv=5v⁴':r'\frac{dy}{dv}=5v^4','dv/dx=3':r'\frac{dv}{dx}=3',
      'v=3x−1':r'v=3x-1','y=x²+kx+c':r'y=x^2+kx+c','y=√x':r'y=\sqrt{x}',
      '2(x−2)':r'2(x-2)','3x²':r'3x^2','6x':r'6x','2x':r'2x',
      'x³':r'x^3','3x²':r'3x^2',
      '0≤x≤5':r'0\le x\le5','0≤x≤2':r'0\le x\le2',
      '0&lt;x&lt;12':r'0<x<12','x&gt;0':r'x>0','x≠0':r'x\ne0',
      'x>0':r'x>0','x<0':r'x<0','h≠0':r'h\ne0','h→0':r'h\to0',
      'x=1+h':r'x=1+h','x=a':r'x=a','x=1':r'x=1','x=2':r'x=2','x=4':r'x=4',
      'x=±2':r'x=\pm2','x=3':r'x=3','x=6':r'x=6',
      'y=f(a)':r'y=f(a)','y=3':r'y=3','y=6':r'y=6','z=12':r'z=12',
      'f(0)=1':r'f(0)=1','f(2)=5':r'f(2)=5','f(5)=−4':r'f(5)=-4',
      '(−2,−4)':r'(-2,-4)','(−2,−2)':r'(-2,-2)','(−2,5)':r'(-2,5)',
      '(−1,2)':r'(-1,2)','(1,−2)':r'(1,-2)','(2,−3)':r'(2,-3)',
      '(0,0)':r'(0,0)','(1,1)':r'(1,1)','(2,2)':r'(2,2)','(2,4)':r'(2,4)','(2,6)':r'(2,6)',
      'b=y−mx':r'b=y-mx','u²=x':r'u^2=x','xy=18':r'xy=18','z=2x+y':r'z=2x+y',
      'P/2−x':r'\frac P2-x','x(P/2−x)':r'x\left(\frac P2-x\right)',
      'y=K/x':r'y=\frac Kx',
      'f″(x)':r'f^{\prime\prime}(x)','f′(x)':r'f^{\prime}(x)','g′(x)':r'g^{\prime}(x)',
      'dy/dx':r'\frac{dy}{dx}','dy/dt':r'\frac{dy}{dt}','dx/dt':r'\frac{dx}{dt}',
      'dy/dv':r'\frac{dy}{dv}','dv/dx':r'\frac{dv}{dx}',
      'dV/dr':r'\frac{dV}{dr}','dV/dt':r'\frac{dV}{dt}',
      'dr/dt':r'\frac{dr}{dt}','dC/dt':r'\frac{dC}{dt}',
      'C=2πr':r'C=2\pi r','−1/m':r'-\frac1m','−1/0':r'-\frac10',
      'm≠0':r'm\ne0','m=0':r'm=0','f′(a)':r'f^{\prime}(a)',
      '(f′)²':r'(f^{\prime})^2',
    }
    rx=re.compile(r'(?<![A-Za-z0-9])(?:'+'|'.join(re.escape(k) for k in sorted(fragments,key=len,reverse=True))+r')(?![A-Za-z0-9])')
    chunks=re.split(r'(\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|<[^>]*>)',html)
    return ''.join(part if part.startswith(('<',r'\(',r'\[')) else rx.sub(lambda m:r'\('+fragments[m.group()]+r'\)',part) for part in chunks)

for l in lessons:
    for e in l['examples']:
        e['solution']=e['solution'].replace('The curve has a stationary point of inflection.', 'The required conclusion is that a stationary point need not be a turning point.')
    for key in ('before','ideas','method'):
        l[key]=professional_html(l[key])
    for e in l['examples']:
        for key in ('question','solution'):
            e[key]=professional_html(e[key])
for q in questions:
    for key in ('prompt_html','answer_html','solution_html','hint_html'):
        q[key]=professional_html(q[key])
