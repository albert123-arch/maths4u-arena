"""Independent 9709 P1 teaching, exact full-answer checks and review variants."""
import sympy as s
u=s.Symbol('u',real=True)
lessons,questions,models=[],[],[]
def tex(v):return s.latex(s.sympify(str(v),locals={'u':u}))
def math(v):return r'\('+tex(v)+r'\)'
def img(name,alt):return '<p><img src="/assets/original/trigonometry/'+name+'.svg" alt="'+alt+'"></p>'
def ex(title,question,solution,key):return dict(title=title,question=question,solution=solution,verification=key)
def lesson(key,suffix,title,summary,objective,before,ideas,method,mistakes,examples):
 lessons.append(dict(key=key,id='orig_trigonometry_'+suffix,title=title,summary=summary,objective=objective,before=before,ideas=ideas,method=method,mistakes=mistakes,examples=examples))

lesson('ratios','ratios','Exact ratios, quadrants and principal inverse values',
 'Use exact values and coordinate signs, then distinguish a principal inverse value from every solution.',
 'Find exact sine, cosine and tangent values for general angles and interpret inverse trigonometric notation correctly.',
 '<p>Recall right-triangle ratios, Pythagoras and conversion between degrees and radians.</p>',
 r'''<h3>Exact values come from two triangles</h3><p>Bisect an equilateral triangle to obtain the 30° and 60° ratios; use an isosceles right triangle for 45°. In radian measure:</p>
 \[\begin{array}{c|ccc}x&\frac\pi6&\frac\pi4&\frac\pi3\\\hline\sin x&\frac12&\frac{\sqrt2}2&\frac{\sqrt3}2\\\cos x&\frac{\sqrt3}2&\frac{\sqrt2}2&\frac12\\\tan x&\frac{\sqrt3}3&1&\sqrt3\end{array}\]
 <h3>General angles use coordinates and signs</h3><p>On the unit circle the point is \((\cos x,\sin x)\). Anticlockwise rotation is positive. Reduce by complete turns, identify the reference angle, then choose the sign from the quadrant. Tangent is \(\sin x/\cos x\), so it is undefined when \(\cos x=0\).</p>'''+img('unit-circle','A unit-circle point in quadrant II has negative cosine and positive sine')+r'''
 <h3>An inverse value uses a specified branch</h3>\[\sin^{-1}t\in\left[-\frac\pi2,\frac\pi2\right],\]\[\cos^{-1}t\in[0,\pi],\qquad\tan^{-1}t\in\left(-\frac\pi2,\frac\pi2\right).\]
 <p>The inputs of inverse sine and cosine must lie in \([-1,1]\). Inverse tangent accepts every real input. The notation \(\sin^{-1}t\) means a principal angle, not \(1/\sin t\). An equation can have other angles outside that principal range.</p>
 <h3>Composition does not erase the branch restriction</h3><p>Although \(\sin(\sin^{-1}t)=t\) for an allowed input, \(\sin^{-1}(\sin x)\) need not equal x outside the principal interval. Check units and calculator mode.</p>''',
 '<ol><li>State the angle unit and reduce complete turns.</li><li>Find the reference angle and the quadrant signs.</li><li>Use exact ratios or Pythagoras, keeping the required signs.</li><li>For an inverse, select its principal branch; for an equation, return to the full stated interval.</li></ol><p>The written questions combine these skills with algebra, identities and transformed-angle equations later in this chapter.</p>',
 ['An inverse function is not a reciprocal.', 'A square root gives a magnitude; the quadrant fixes its sign.', 'An inverse calculator value is not automatically the full solution set.', 'Keep radians and degrees distinct.'],[
 ex('Reference angles and signs',r'<p>Find \(\sin(7\pi/6)\), \(\cos(7\pi/4)\) and \(\tan(2\pi/3)\) exactly.</p>',r'<p>The reference angles are π/6, π/4 and π/3. The signs are respectively negative, positive and negative.</p>\[\sin\frac{7\pi}{6}=-\frac12,\qquad\cos\frac{7\pi}{4}=\frac{\sqrt2}{2},\]\[\tan\frac{2\pi}{3}=-\sqrt3.\]','TR-EXACT'),
 ex('Pythagoras with a quadrant',r'<p>Given \(\cos\theta=-5/13\) and \(\pi<\theta<3\pi/2\), find \(\sin\theta\) and \(\tan\theta\).</p>',r'\[\sin^2\theta=1-\frac{25}{169}=\frac{144}{169}.\]<p>Quadrant III makes sine negative and tangent positive:</p>\[\sin\theta=-\frac{12}{13},\qquad\tan\theta=\frac{12}{5}.\]','TR-QUADRANT'),
 ex('Choose the principal value',r'<p>Find \(\sin^{-1}(-\sqrt3/2)\), \(\cos^{-1}(-1/2)\) and \(\tan^{-1}(-1)\) in radians.</p>',r'<p>Use each inverse relation’s own output interval:</p>\[\sin^{-1}\!\left(-\frac{\sqrt3}{2}\right)=-\frac\pi3,\]\[\cos^{-1}\!\left(-\frac12\right)=\frac{2\pi}{3},\qquad\tan^{-1}(-1)=-\frac\pi4.\]<p>For example, 4π/3 has the required sine but is not the principal inverse-sine value.</p>','TR-PRINCIPAL'),
 ex('An inverse inside a composition',r'<p>Evaluate \(\sin(\cos^{-1}(\frac35))\) and \(\sin^{-1}(\sin(\frac{5\pi}6))\).</p>',r'<p>If \(\alpha=\cos^{-1}(\frac35)\), then α is acute. A right triangle gives \(\sin\alpha=\frac45\). For the other expression \(\sin(\frac{5\pi}6)=\frac12\), whose principal inverse-sine value is \(\frac\pi6\).</p>\[\sin(\cos^{-1}(\tfrac35))=\frac45,\]\[\sin^{-1}(\sin(\tfrac{5\pi}6))=\frac\pi6.\]','TR-COMPOSITION')])

lesson('graphs','graphs','Trigonometric graphs, periods and transformations',
 'Read a full cycle, distinguish inside and outside changes and keep tangent branches separate.',
 'Sketch and interpret sine, cosine and tangent graphs, including scale factors, shifts, ranges and asymptotes.',
 '<p>Recall function transformations, radian measure and exact values.</p>',
 r'''<h3>Start with the three basic shapes</h3><p>Sine starts at zero; cosine starts at one. Both have range \([-1,1]\) and period 2π. Tangent has period π, takes all real values and has separate branches divided by vertical asymptotes.</p>'''+img('wave-graphs','Sine and cosine on one full radian cycle')+r'''
 <h3>Separate the midline, scale and input</h3><p>For \(y=a\sin(bx+c)+d\) or its cosine counterpart, with a and b nonzero, the amplitude is |a|, the midline is y=d and the range is \([d-|a|,d+|a|]\).</p>
 \[T=\frac{2\pi}{|b|},\qquad bx+c=b\left(x+\frac cb\right).\]<p>The horizontal shift to the right is \(-c/b\). A negative value means a shift to the left. Degree-mode periods use 360° in place of 2π.</p>
 <h3>Tangent has no amplitude</h3><p>For \(y=a\tan(bx+c)+d\), the period is \(\pi/|b|\). Find asymptotes by solving \(bx+c=\pi/2+k\pi\). Do not join branches across an asymptote.</p>'''+img('tangent-graph','Basic tangent branches and their vertical asymptotes')+r'''
 <h3>Transform the entire input</h3><p>A horizontal stretch by h&gt;0 maps \((x,y)\) to \((hx,y)\) and changes f(x) to f(x/h). Reflection in the y-axis uses f(−x). Apply the same change to every term, including a linear term outside a trigonometric function.</p>''',
 '<ol><li>Choose a unit and mark one complete cycle.</li><li>Identify midline, amplitude where defined, period and horizontal shift.</li><li>Plot key points or asymptotes, then repeat only within the stated domain.</li><li>Use intersections to count solutions; do not assume a restricted arc repeats beyond its domain.</li></ol>',
 ['The horizontal scale factor is the reciprocal of the input coefficient.', 'The shift in sin(bx+c) is not simply −c.', 'A negative amplitude coefficient reflects the curve; amplitude itself is non-negative.', 'Tangent has no amplitude and no point at an asymptote.'],[
 ex('Read the vertical and horizontal information',r'<p>For \(y=2-3\cos2x\), state the amplitude, period and range. Find its maxima for \(0\le x\le2\pi\).</p>',r'<p>The midline is 2 and the vertical scale has magnitude 3.</p>\[\text{amplitude}=3,\quad T=\pi,\quad -1\le y\le5.\]<p>A maximum occurs when cos 2x=−1, giving x=π/2 and 3π/2. Its value is 5.</p>','TR-GRAPH-RANGE'),
 ex('Factor the input before reading the shift',r'<p>Describe \(y=2\sin(3x-\pi/2)+1\) and locate five key points in a cycle starting at its rising midline crossing.</p>',r'\[3x-\pi/2=3(x-\pi/6).\]<p>The shift is π/6 right, period 2π/3, amplitude 2 and midline 1. Quarter-period spacing is π/6.</p>\[(\pi/6,1),\ (\pi/3,3),\ (\pi/2,1),\]\[(2\pi/3,-1),\ (5\pi/6,1).\]','TR-GRAPH-SHIFT'),
 ex('A tangent branch has endpoints it never reaches',r'<p>For \(y=1-2\tan(x/2)\), give its period, y-intercept and the asymptotes bordering the branch containing x=0.</p>',r'\[T=\frac\pi{1/2}=2\pi,\qquad y(0)=1.\]<p>The neighbouring asymptotes satisfy x/2=±π/2, so x=−π and x=π. The branch decreases and its range is all real numbers. It has no amplitude.</p>','TR-TANGENT'),
 ex('Every term and the point use the same map',r'<p>The curve \(y=f(x)=x+\cos x\) is reflected in the y-axis, then stretched horizontally by factor 2. Find its equation and the image of \((\pi,\pi-1)\).</p>',r'<p>The new input is −x/2, so</p>\[y=f(-x/2)=-\frac x2+\cos\frac x2.\]<p>The point map is (a,b)→(−2a,b), giving (−2π,π−1). Substituting its x-coordinate into the new equation gives the same ordinate.</p>','TR-INPUT-MAP')])

lesson('identities','identities','Identities, algebra and valid domains',
 'Use the two basic identities and retain every restriction from the original expression.',
 'Prove and simplify identities using Pythagoras, factorisation and common denominators without extending the original domain.',
 '<p>Recall factorisation, fractions and the meaning of a denominator restriction.</p>',
 r'''<h3>Two identities do most of the work</h3>\[\sin^2x+\cos^2x=1,\qquad\tan x=\frac{\sin x}{\cos x}.\]<p>The first holds for every real angle; the second requires cos x≠0. For example, dividing the first identity by cos²x gives \(1+\tan^2x=1/\cos^2x\) on that domain.</p>
 <h3>Choose one side and transform it</h3><p>Rewrite tangent as a ratio, factor a difference of squares or combine fractions. Aim for the other side with justified equalities. Checking several numerical angles does not prove an identity.</p>
 <h3>Cancellation preserves exclusions</h3><p>The expression \((1-\cos^2x)/\sin x\) simplifies to sin x where sin x≠0. Its simplified appearance does not supply values at the excluded angles. Likewise, multiplying an equation by a denominator is valid only after recording where it is nonzero.</p>
 <h3>Identity and equation ask different questions</h3><p>An identity is true for every input in its stated common domain. An equation asks for the inputs where equality holds. Prove the identity first; when using it to solve an equation, return to the original restrictions.</p>''',
 '<ol><li>Record the original denominators and excluded inputs.</li><li>Choose the more complicated side and rewrite using sine and cosine.</li><li>Factor or combine fractions, explaining each equality.</li><li>State the domain of the result; check excluded candidates separately when solving.</li></ol>',
 ['Do not give a cancelled denominator a value of zero.', 'An identity needs an algebraic argument, not just examples.', 'sin²x means (sin x)²; it is not sin(x²).', 'You can use sin²x+cos²x=1 without a double-angle formula.'],[
 ex('The simplified value still has a domain',r'<p>Simplify \((1-\cos^2x)/\sin x\) and give its excluded inputs on \([0,2\pi]\).</p>',r'\[\frac{1-\cos^2x}{\sin x}=\frac{\sin^2x}{\sin x}=\sin x\quad(\sin x\ne0).\]<p>The original expression excludes x=0, π and 2π. It is not defined there, even though sin x itself is.</p>','TR-CANCEL-DOMAIN'),
 ex('Multiply by a conjugate',r'<p>Prove \((1-\sin x)/\cos x=\cos x/(1+\sin x)\) on its common domain.</p>',r'<p>Require cos x≠0. This also rules out sin x=−1. Then</p>\[\frac{1-\sin x}{\cos x}=\frac{(1-\sin x)(1+\sin x)}{\cos x(1+\sin x)}\]\[=\frac{\cos^2x}{\cos x(1+\sin x)}=\frac{\cos x}{1+\sin x}.\]<p>The two expressions agree on their common domain; neither equality authorises a cancelled input.</p>','TR-CONJUGATE'),
 ex('Reduce fourth powers without extra identities',r'<p>Express \(\sin^4x-\cos^4x\) as a polynomial in \(u=\sin x\).</p>',r'\[\sin^4x-\cos^4x=(\sin^2x-\cos^2x)(\sin^2x+\cos^2x)\]\[=\sin^2x-\cos^2x=2u^2-1.\]<p>Only factorisation and the basic Pythagorean identity were needed.</p>','TR-FOURTH-POWERS'),
 ex('A tangent identity with its restriction',r'<p>Prove \((1+\tan^2x)\cos^2x=1\) and state where the original left side is defined.</p>',r'\[(1+\tan^2x)\cos^2x=\left(1+\frac{\sin^2x}{\cos^2x}\right)\cos^2x\]\[=\cos^2x+\sin^2x=1.\]<p>The original expression requires cos x≠0. At x=π/2+kπ, tangent is undefined, so the displayed value 1 cannot be assigned to that original expression.</p>','TR-TAN-DOMAIN')])

lesson('equations','equations','All solutions on a stated interval',
 'Find every branch, transform the interval with the angle and keep zero factors.',
 'Solve sine, cosine and tangent equations on open, closed or half-open intervals, including shifted and multiple angles.',
 '<p>Recall exact ratios, inverse branches, graph periods, factorisation and inequalities.</p>',
 r'''<h3>One inverse value is a starting point</h3><p>For sin u=c, solutions come from \(u=\alpha+2k\pi\) or \(u=\pi-\alpha+2k\pi\), where α=sin⁻¹c. For cos u=c, use \(u=\pm\beta+2k\pi\), where β=cos⁻¹c. For tan u=c, use \(u=\gamma+k\pi\), where γ=tan⁻¹c. Here k is an integer.</p>'''+img('sine-solutions','The two sine branches at height one half in one full cycle')+r'''
 <h3>Transform the interval before enumerating angles</h3><p>If u=bx+c, apply the same map to the interval for x, reversing endpoint order if b&lt;0. Find every allowed u, then recover \(x=(u-c)/b\). A doubled input can cross more than one cycle even when x does not.</p>
 <h3>Factor before dividing</h3><p>In sin x(2cos x−1)=0, keep both sin x=0 and 2cos x−1=0. Dividing by sin x would discard valid solutions.</p>
 <h3>Endpoints are part of the question</h3><p>Check each candidate against the original interval and denominators. Angles 0 and 2π are different inputs when both endpoints are included. List each distinct allowed input once, preferably in increasing order.</p>''',
 '<ol><li>Write the interval and angle unit, including endpoint brackets.</li><li>Factor if possible or isolate one trigonometric ratio.</li><li>Transform the interval with the input angle and enumerate all branches.</li><li>Recover x, discard invalid inputs and check the original equation.</li></ol>',
 ['Do not stop after the principal inverse value.', 'Transform the interval as well as the angle.', 'Never divide away a factor which may be zero.', 'Include or exclude 0, π and 2π according to the actual interval.'],[
 ex('Both branches belong in the answer',r'<p>Solve \(\sin x=\sqrt3/2\) for \(0\le x\le2\pi\).</p>',r'<p>The principal angle is π/3. Sine is positive in quadrants I and II, so</p>\[x=\frac\pi3,\quad\frac{2\pi}{3}.\]<p>Neither endpoint satisfies the equation, and the sine graph has no further intersection in the interval.</p>','TR-SINE-BRANCHES'),
 ex('A shifted input includes three branches',r'<p>Solve \(\cos(2x-\pi/3)=1/2\) for \(0\le x\le\pi\).</p>',r'<p>Set u=2x−π/3, so −π/3≤u≤5π/3. Cos u=1/2 gives u=−π/3, π/3 and 5π/3 in that interval.</p>\[x=\frac{u+\pi/3}{2}=0,\quad\frac\pi3,\quad\pi.\]<p>Both endpoints satisfy the original equation and must be retained.</p>','TR-SHIFTED-INTERVAL'),
 ex('Tangent repeats after a half-turn',r'<p>Solve \(\tan(x+\pi/4)=-1\) for \(-\pi\le x<\pi\).</p>',r'\[x+\frac\pi4=-\frac\pi4+k\pi,\qquad x=-\frac\pi2+k\pi.\]<p>The interval selects x=−π/2 and π/2. At both inputs tangent’s argument is defined and its value is −1.</p>','TR-TAN-BRANCHES'),
 ex('Keep the factor that can equal zero',r'<p>Solve \(\sin x(2\cos x-1)=0\) for \(0\le x<2\pi\).</p>',r'<p>The first factor gives x=0 or π. The second gives cos x=1/2, hence x=π/3 or 5π/3.</p>\[x\in\{0,\pi/3,\pi,5\pi/3\}.\]<p>The upper endpoint 2π is excluded. Dividing by sin x would lose the first two solutions.</p>','TR-ZERO-FACTOR')])

lesson('quadratics','quadratic_equations','Trigonometric quadratics and complete angle sets',
 'Solve the algebra, reject impossible ratio values and recover every permitted angle.',
 'Reduce trigonometric equations to polynomials and distinguish algebraic roots, admissible ratios and angle solutions.',
 '<p>Recall quadratic methods, the two Pythagorean identities, graph ranges and interval enumeration.</p>',
 r'''<h3>Name the ratio you are solving for</h3><p>Let u=sin x, cos x or tan x as appropriate. Rewrite the equation as a polynomial in u; use factorisation, completing the square or the quadratic formula. When both sine and cosine occur, try \(\sin^2x=1-\cos^2x\) or its counterpart.</p>
 <h3>Filter algebraic roots before finding angles</h3><p>For u=sin x or cos x retain only −1≤u≤1. Tangent has no such range bound, but its original input must be defined. A repeated algebraic root is not an extra angle; a single admissible ratio can give several angles.</p>
 <h3>Return to the original interval</h3><p>For a multiple or shifted angle, transform the interval before enumerating. Treat a squared ratio as two possible signs when its value is positive. Check denominator restrictions and substitute candidates into the original equation.</p>
 <h3>A graph explains why counts differ</h3><p>For example, the quadratic \(3u^2+2u-1=0\) has roots u=1/3 and −1. If u=cos x on \([0,2\pi)\), the first level gives two angles and the second gives one.</p>'''+img('cosine-levels','Cosine levels one third and minus one give three distinct angles'),
 '<ol><li>Choose one ratio and derive its polynomial equation.</li><li>Solve all algebraic roots, showing the method.</li><li>Apply ratio ranges and original denominator restrictions.</li><li>Enumerate every permitted angle, restore x and verify all candidates.</li></ol>',
 ['A polynomial root outside [−1,1] cannot be a sine or cosine.', 'A squared ratio has two signs unless its value is zero.', 'Two polynomial roots need not give two angle solutions.', 'A multiple input changes the interval and the number of cycles.'],[
 ex('Two algebraic roots give three angles',r'<p>Solve \(3\cos^2x+2\cos x-1=0\) for \(0\le x<2\pi\). Give exact answers.</p>',r'<p>Let u=cos x. Then</p>\[3u^2+2u-1=(3u-1)(u+1)=0.\]<p>Both u=1/3 and −1 are allowed. Put α=cos⁻¹(1/3), with 0&lt;α&lt;π/2. Then</p>\[x=\alpha,\quad\pi,\quad2\pi-\alpha.\]<p>The diagram’s two cosine levels explain the three distinct inputs.</p>','TR-QUADRATIC-LEVELS'),
 ex('An algebraic root outside the ratio range',r'<p>Solve \(2\sin^2x-5\sin x+2=0\) for \(0\le x<2\pi\).</p>',r'\[(2\sin x-1)(\sin x-2)=0.\]<p>Sin x=2 is impossible. Sin x=1/2 gives</p>\[x=\pi/6,\quad5\pi/6.\]<p>Rejecting an impossible ratio is different from forgetting a second trigonometric branch.</p>','TR-IMPOSSIBLE-RATIO'),
 ex('Use the identity to choose one variable',r'<p>Solve \(3\sin^2x+4\cos x-4=0\) for \(0\le x\le2\pi\).</p>',r'<p>Set u=cos x and replace sin²x by 1−u²:</p>\[3(1-u^2)+4u-4=0,\qquad(3u-1)(u-1)=0.\]<p>Thus u=1/3 or 1. With α=cos⁻¹(1/3), the complete answer is</p>\[x=0,\quad\alpha,\quad2\pi-\alpha,\quad2\pi.\]<p>Both endpoints are included and are distinct inputs.</p>','TR-MIXED-QUADRATIC'),
 ex('Restore both signs before halving the input',r'<p>Solve \(4\sin^2(2x)-1=0\) for \(0\le x<\pi\).</p>',r'<p>Put u=2x, so 0≤u&lt;2π. Then sin²u=1/4 gives sin u=±1/2.</p>\[u=\pi/6,\ 5\pi/6,\ 7\pi/6,\ 11\pi/6.\]<p>Halve each input, not just the first:</p>\[x=\pi/12,\ 5\pi/12,\ 7\pi/12,\ 11\pi/12.\]','TR-SQUARED-INPUT')])

def field(key,label,kind,expected,**extra):return dict(key=key,label=label,type=kind,expected=str(expected),**extra)
def roots(*values):return '{'+','.join(str(s.simplify(v)) for v in values)+'}'
def show(f):
 if f['type']=='choice':return f['options'][f['expected']]
 if f['type']=='set':
  value=f['expected']
  if value.startswith('{'):return r'\(\{'+r',\, '.join(tex(v) for v in value[1:-1].split(','))+r'\}\)'
  a,b=value[1:-1].split(',');return r'\('+value[0]+tex(a)+r',\, '+tex(b)+value[-1]+r'\)'
 if f['type']=='pairs':return r'\(\left('+r',\, '.join(tex(v) for v in f['expected'][1:-1].split(','))+r'\right)\)'
 return math(f['expected'])
def quick(topic,family,v,title,prompt,fields,solution,model):
 uid=f'M4U-9709-P1-TR-CHECK-{topic.upper()}-{family}-{v}'
 answer=''.join('<p>'+f['label']+': '+show(f)+'</p>' for f in fields)
 hint={'ratios':'Use an exact reference angle and the required quadrant or principal branch.',
 'graphs':'Separate inside and outside changes; a tangent graph has asymptotes rather than an amplitude.',
 'identities':'Rewrite with the two basic identities and retain original denominator exclusions.',
 'equations':'Transform the interval with the input angle; keep every valid branch and every zero factor.',
 'quadratics':'Solve the ratio polynomial, filter its range, then recover all allowed angles.'}[topic]
 questions.append(dict(id=uid,family_uid=f'M4U-9709-P1-TR-CHECK-{topic.upper()}-{family}',lesson=topic,title=title,collection='short' if v==0 else 'variant',prompt_html=prompt,answer_html=answer,solution_html=solution+'<h4>Complete answers</h4>'+answer,hint_html='<p>'+hint+'</p>',marks=len(fields),difficulty=2,fields=fields,parts=[dict(label='',marking_criteria=[dict(code='B1',marks=1,description_html='Complete correct answer for '+f['label']+'.') for f in fields])],verification=uid))
 models.append(dict(uid=uid,**model))

for v in range(2):
 angles=(7*s.pi/6,5*s.pi/4,2*s.pi/3) if v==0 else (5*s.pi/3,7*s.pi/4,5*s.pi/4)
 quick('ratios',1,v,'Three exact signed ratios','<p>Find '+', '.join(r'\('+f+r'('+tex(a)+r')\)' for f,a in zip([r'\sin',r'\cos',r'\tan'],angles))+' exactly.</p>',
  [field('sine','Sine value','number',s.sin(angles[0])),field('cosine','Cosine value','number',s.cos(angles[1])),field('tangent','Tangent value','number',s.tan(angles[2]))],'<p>Reduce to reference angles π/6, π/4 or π/3, then use the quadrant to set each sign. Keep the values exact.</p>',dict(kind='exact',angles=list(map(str,angles))))
 c,quadrant=(-s.Rational(5,13),3) if v==0 else (s.Rational(8,17),4);sn=-s.sqrt(1-c*c)
 quick('ratios',2,v,'Pythagoras with signed ratios',r'<p>Given \(\cos\theta='+tex(c)+r'\) and θ in quadrant '+str(quadrant)+', find sin θ and tan θ exactly.</p>',
  [field('sine','sin θ','number',sn),field('tangent','tan θ','number',sn/c)],r'\[\sin^2\theta=1-\cos^2\theta.\]<p>Both stated quadrants have negative sine. Select that sign, then divide sine by cosine for tangent.</p>',dict(kind='quadrant',cosine=str(c),quadrant=quadrant))
 args=(-s.sqrt(2)/2,-s.sqrt(3)/2,-s.sqrt(3)) if v==0 else (s.sqrt(3)/2,-s.Rational(1,2),1)
 quick('ratios',3,v,'Principal inverse values','<p>Give the principal radian values of '+', '.join(r'\('+fn+r'^{-1}('+tex(a)+r')\)' for fn,a in zip([r'\sin',r'\cos',r'\tan'],args))+'.</p>',
  [field(key,label,'number',fn(a)) for key,label,fn,a in zip(['asin','acos','atan'],['Inverse sine (radians)','Inverse cosine (radians)','Inverse tangent (radians)'],[s.asin,s.acos,s.atan],args)],r'<p>Use the ranges [−π/2,π/2], [0,π] and (−π/2,π/2), respectively. Choose each branch before simplifying.</p>',dict(kind='principal',arguments=list(map(str,args))))
 angle=5*s.pi/6 if v==0 else 7*s.pi/6;options={'A':'The reciprocal of sine','B':'The principal inverse-sine angle','C':'The square of the angle'} if v==0 else {'A':'The reciprocal of sine','B':'The square of the angle','C':'The principal inverse-sine angle'}
 quick('ratios',4,v,'Inverse is not reciprocal',r'<p>What does the −1 in \(\sin^{-1}t\) mean? Then evaluate \(\sin^{-1}(\sin('+tex(angle)+r'))\) in radians.</p>',
  [field('meaning','Meaning of inverse notation','choice','B' if v==0 else 'C',options=options),field('angle','Principal result (radians)','number',s.asin(s.sin(angle)))],'<p>Inverse sine returns the angle in its principal interval. First evaluate the sine, then find that angle; the starting input may lie outside the principal range.</p>',dict(kind='inverse_composition',angle=str(angle),choice='B' if v==0 else 'C'))

 a,b,d,fn=(-3,2,2,'cos') if v==0 else (4,3,-1,'sin')
 quick('graphs',1,v,'Amplitude, period and full range',r'<p>For \(y='+str(a)+'\\'+fn+'('+str(b)+'x)'+('+' if d>0 else '')+str(d)+r'\), give the amplitude, period in radians, minimum and maximum.</p>',
  [field('amplitude','Amplitude','number',abs(a)),field('period','Period (radians)','number',2*s.pi/abs(b)),field('minimum','Minimum value','number',d-abs(a)),field('maximum','Maximum value','number',d+abs(a))],'<p>The vertical scale magnitude is the amplitude, the midline is the constant term, and the input coefficient divides the basic 2π period. Add and subtract the amplitude from the midline.</p>',dict(kind='wave',a=a,b=b,d=d,function=fn))
 a,b,c,d,fn=(2,3,-s.pi/2,1,'sin') if v==0 else (3,2,s.pi/3,-2,'cos')
 quick('graphs',2,v,'Factor the input to find the shift',r'<p>For \(y='+str(a)+'\\'+fn+'('+str(b)+'x'+('+' if c>0 else '')+tex(c)+')'+('+' if d>0 else '')+str(d)+r'\), give the horizontal shift to the right, period and midline. A negative shift means left.</p>',
  [field('shift','Horizontal shift to the right (radians)','number',-c/b),field('period','Period (radians)','number',2*s.pi/abs(b)),field('midline','Midline y-value','number',d)],r'\[bx+c=b(x+c/b).\]<p>The shift is −c/b, not −c. The period is 2π/|b| and the midline is the outside constant.</p>',dict(kind='phase',a=a,b=b,c=str(c),d=d,function=fn))
 a,b,d=(2,3,-1) if v==0 else (-3,2,1);bound=s.pi/(2*b)
 quick('graphs',3,v,'Tangent has an open central branch',r'<p>For \(y='+str(a)+r'\tan('+str(b)+'x)'+('+' if d>0 else '')+str(d)+r'\), give the domain interval of the branch containing x=0, its period and its y-intercept.</p>',
  [field('branch','Central branch interval','set','('+str(-bound)+','+str(bound)+')'),field('period','Period (radians)','number',s.pi/b),field('intercept','y-intercept','number',d)],r'<p>The neighbouring poles satisfy bx=±π/2 and are excluded. Tangent’s period is π/|b|, and tan 0=0.</p>',dict(kind='tangent_graph',a=a,b=b,d=d))
 h,x0,y0=(s.Integer(2),s.pi/3,2) if v==0 else (s.Rational(1,3),s.pi/2,-3)
 quick('graphs',4,v,'A point and the complete input map',r'<p>A point '+math('('+str(x0)+','+str(y0)+')')+' lies on y=f(x). Reflect the curve in the y-axis, then stretch it horizontally by factor '+math(h)+r'. Give the image point and k in the new equation y=f(kx).</p>',
  [field('point','Image point (x,y)','pairs','('+str(-h*x0)+','+str(y0)+')'),field('input','Input coefficient k','number',-1/h)],'<p>The point map is (a,b)→(−ha,b), whereas the input coefficient is −1/h. The coordinate map and the substitution have reciprocal scale factors.</p>',dict(kind='point_map',h=str(h),x=str(x0),y=y0))

 ratio='sin' if v==0 else 'cos';other='cos' if v==0 else 'sin';excluded=roots(0,s.pi,2*s.pi) if v==0 else roots(s.pi/2,3*s.pi/2)
 quick('identities',1,v,'A simplification keeps its exclusions','<p>Simplify \\(\\frac{1-\\'+other+'^2x}{\\'+ratio+' x}\\) as a polynomial in \\(u=\\'+ratio+r' x\). Give every excluded x in \([0,2\pi]\).</p>',
  [field('expression','Simplified expression in u','polynomial','u',variables=['u']),field('excluded','Excluded x-values (radians)','set',excluded)],'<p>The numerator is the square of the denominator’s trigonometric ratio. Cancel only when that ratio is nonzero, keeping the original excluded angles.</p>',dict(kind='cancel_identity',ratio=ratio))
 expression=2*u*u-1 if v==0 else 1-u*u;zeros=roots(s.pi/4,3*s.pi/4,5*s.pi/4,7*s.pi/4) if v==0 else roots(s.pi/2,3*s.pi/2)
 raw=r'\sin^4x-\cos^4x' if v==0 else r'\cos^4x-\sin^4x+\sin^2x'
 quick('identities',2,v,'Reduce powers before finding zeros',r'<p>Express \('+raw+r'\) as a polynomial in u=sin x. Then give all its zeros in \([0,2\pi)\).</p>',
  [field('expression','Polynomial in u','polynomial',expression,variables=['u']),field('zeros','All zero inputs (radians)','set',zeros)],r'<p>Factor a difference of squares and use sin²x+cos²x=1. Solve the resulting ratio condition, retaining every sign and quadrant.</p>',dict(kind='fourth_powers',variant=v))
 left,right=('sin','cos') if v==0 else ('cos','sin');choice='B' if v==0 else 'C'
 correct='\\(\\'+right+' x/(1+\\'+left+r' x)\)';options={'A':'The original expression is defined for every real x','B':correct if v==0 else r'\(1+\sin x\)','C':correct if v==1 else r'\(1+\cos x\)'}
 excluded=roots(s.pi/2,3*s.pi/2) if v==0 else roots(0,s.pi,2*s.pi)
 quick('identities',3,v,'A rationalised form has a common domain','<p>Select an equivalent form of \\((1-\\'+left+' x)/\\'+right+r' x\) on its original domain. Give all excluded inputs in \([0,2\pi]\).</p>',
  [field('form','Equivalent expression','choice',choice,options=options),field('excluded','Excluded x-values (radians)','set',excluded)],'<p>Multiply the numerator and denominator by the conjugate 1 plus the same ratio, then use the Pythagorean identity. Keep the original denominator restriction.</p>',dict(kind='rationalise',ratio=left,choice=choice))
 c=s.Rational(1,2) if v==0 else -s.Rational(1,2);alpha=s.acos(c);factor=r'\cos x'+('-' if c>0 else '+')+tex(abs(c))
 quick('identities',4,v,'A cancelled factor leaves missing inputs',r'<p>For \(F(x)=\frac{\sin x('+factor+r')}{'+factor+r'}\), give its simplified expression in u=sin x and its excluded x-values on \([0,2\pi)\). What is the original F at a zero of the cancelled factor?</p>',
  [field('expression','Simplified expression in u','polynomial','u',variables=['u']),field('excluded','Excluded x-values (radians)','set',roots(alpha,2*s.pi-alpha)),field('status','Original value at an excluded input','choice','C',options={'A':'0','B':'1','C':'Undefined'})],'<p>Cancel the common factor only on the original domain. The factor’s zero angles remain excluded; the original fraction is not defined there.</p>',dict(kind='cancel_factor',cosine=str(c)))

 value=s.Rational(1,2) if v==0 else -s.sqrt(2)/2;xs=roots(s.pi/6,5*s.pi/6) if v==0 else roots(5*s.pi/4,7*s.pi/4)
 quick('equations',1,v,'All sine branches in one cycle',r'<p>Solve \(\sin x='+tex(value)+r'\) for \(0\le x\le2\pi\). Give the complete exact set.</p>',
  [field('angles','All x-values (radians)','set',xs)],'<p>Use a reference angle and both quadrants with the required sine sign. Check both endpoints against the original equation.</p>',dict(kind='sine_equation',value=str(value)))
 shift=-s.pi/3 if v==0 else s.pi/3;value=s.Rational(1,2) if v==0 else -s.Rational(1,2);xs=roots(0,s.pi/3,s.pi) if v==0 else roots(s.pi/6,s.pi/2)
 quick('equations',2,v,'Map the entire interval',r'<p>Solve \(\cos(2x'+('+' if shift>0 else '')+tex(shift)+')='+tex(value)+r'\) for \(0\le x\le\pi\). Give the interval for \(u=2x'+('+' if shift>0 else '')+tex(shift)+r'\), and all x.</p>',
  [field('interval','Transformed u-interval','set','['+str(shift)+','+str(2*s.pi+shift)+']'),field('angles','All x-values (radians)','set',xs)],'<p>Transform both interval endpoints. Enumerate both cosine branches there, then subtract the shift and divide by 2. Endpoints that satisfy the equation must be retained.</p>',dict(kind='cosine_shift',shift=str(shift),value=str(value)))
 mult,shift,value,lo,hi=(1,s.pi/4,-1,-s.pi,s.pi) if v==0 else (2,-s.pi/4,1,0,s.pi);xs=roots(-s.pi/2,s.pi/2) if v==0 else roots(s.pi/4,3*s.pi/4)
 quick('equations',3,v,'Tangent branches on a half-open interval',r'<p>Solve \(\tan('+str(mult)+'x'+('+' if shift>0 else '')+tex(shift)+')='+str(value)+r'\) for \('+tex(lo)+r'\le x<'+tex(hi)+r'\).</p>',
  [field('angles','All x-values (radians)','set',xs)],r'<p>Use u=tan⁻¹(value)+kπ for integer k, then recover x. Choose all k in the original half-open interval and check the tangent is defined.</p>',dict(kind='tangent_equation',m=mult,shift=str(shift),value=value,lo=str(lo),hi=str(hi)))
 raw=r'\sin x(2\cos x-1)' if v==0 else r'\cos x(2\sin x+1)';xs=roots(0,s.pi/3,s.pi,5*s.pi/3) if v==0 else roots(s.pi/2,7*s.pi/6,3*s.pi/2,11*s.pi/6)
 quick('equations',4,v,'No zero factor may be lost',r'<p>Solve \('+raw+r'=0\) for \(0\le x<2\pi\).</p>',
  [field('angles','All x-values (radians)','set',xs)],'<p>Set each factor equal to zero, find all its branches, then take the union without duplicates. Do not divide by a trigonometric factor which may vanish.</p>',dict(kind='product_equation',variant=v))

 fn='cos' if v==0 else 'sin';coeff=(2,1,-1) if v==0 else (2,-1,-1);uv=roots(-1,s.Rational(1,2)) if v==0 else roots(-s.Rational(1,2),1);xs=roots(s.pi/3,s.pi,5*s.pi/3) if v==0 else roots(s.pi/2,7*s.pi/6,11*s.pi/6)
 polynomial=tex(2*u*u+u-1 if v==0 else 2*u*u-u-1)
 quick('quadratics',1,v,'Polynomial roots and all angles','<p>With \\(u=\\'+fn+r' x\), solve \('+polynomial+r'=0\) and give every x in \([0,2\pi)\).</p>',
  [field('ratios','All u-values','set',uv),field('angles','All x-values (radians)','set',xs)],'<p>Factor the quadratic, retain both ratio values and enumerate every permitted angle for each. Ratio roots and angle solutions are different sets.</p>',dict(kind='ratio_quadratic',function=fn,coefficients=coeff))
 fn='sin' if v==0 else 'cos';coeff=(2,-5,2) if v==0 else (2,5,2);uv=roots(s.Rational(1,2) if v==0 else -s.Rational(1,2));xs=roots(s.pi/6,5*s.pi/6) if v==0 else roots(2*s.pi/3,4*s.pi/3)
 quick('quadratics',2,v,'Reject an impossible ratio first','<p>Solve \\(2\\'+fn+r'^2x'+('-5' if v==0 else '+5')+'\\'+fn+' x+2=0\\) on \\([0,2\\pi)\\). Give the admissible values of \\(u=\\'+fn+r' x\), then all x.</p>',
  [field('ratios','Admissible u-values','set',uv),field('angles','All x-values (radians)','set',xs)],'<p>The polynomial has one root outside [−1,1]. Reject that ratio before finding angles; keep both branches for the remaining ratio.</p>',dict(kind='range_filter',function=fn,coefficients=coeff))
 fn='cos' if v==0 else 'sin';raw=r'2\sin^2x+\cos x-1' if v==0 else r'2\cos^2x+\sin x-1';uv=roots(-s.Rational(1,2),1);xs=roots(0,2*s.pi/3,4*s.pi/3,2*s.pi) if v==0 else roots(s.pi/2,7*s.pi/6,11*s.pi/6)
 quick('quadratics',3,v,'Use one ratio and check closed endpoints',r'<p>Solve \('+raw+'=0\\) for \\(0\\le x\\le2\\pi\\), using \\(u=\\'+fn+r' x\). Give admissible u-values and every x.</p>',
  [field('ratios','Admissible u-values','set',uv),field('angles','All x-values (radians)','set',xs)],'<p>Replace the squared other ratio using the basic identity. The resulting equation is 2u²−u−1=0. Recover the angles, including both endpoints only when they satisfy the original equation.</p>',dict(kind='mixed_quadratic',function=fn))
 fn='sin' if v==0 else 'cos';value=s.Rational(1,4) if v==0 else s.Rational(1,2);xs=roots(s.pi/12,5*s.pi/12,7*s.pi/12,11*s.pi/12) if v==0 else roots(s.pi/8,3*s.pi/8,5*s.pi/8,7*s.pi/8)
 quick('quadratics',4,v,'Both signs and a doubled input','<p>Solve \\(\\'+fn+r'^2(2x)='+tex(value)+r'\) for \(0\le x<\pi\). Give the interval for u=2x and the complete x-set.</p>',
  [field('interval','Transformed u-interval','set','[0,2*pi)'),field('angles','All x-values (radians)','set',xs)],'<p>Transform to 0≤u&lt;2π, take both signs of the square root of the given ratio square, enumerate every angle u, then halve each one.</p>',dict(kind='squared_input',function=fn,value=str(value)))
