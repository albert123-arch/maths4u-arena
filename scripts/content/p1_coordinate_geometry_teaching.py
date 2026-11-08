"""9709 P1 coordinate geometry: independently written teaching and exact checks."""
import sympy as s
x,y=s.symbols('x y',real=True)
lessons,questions,models=[],[],[]

def example(title,question,solution,verification):
    return dict(title=title,question=question,solution=solution,verification=verification)

def lesson(key,suffix,title,summary,objective,before,ideas,method,mistakes,examples):
    lessons.append(dict(key=key,id='orig_coordinate_geometry_'+suffix,title=title,summary=summary,
        objective=objective,before=before,ideas=ideas,method=method,mistakes=mistakes,examples=examples))

lesson('distance','distance_midpoint','Distances, midpoints and diameter geometry',
       'Use exact coordinates to find lengths, missing endpoints and geometric constraints.',
       'Find lengths and midpoints, recover endpoints and translate equidistance or diameter information into algebra.',
       '<p>Recall Pythagoras, exact square roots and solving linear or quadratic equations.</p>',
       r'''<h3>Difference gives a displacement; average gives a midpoint</h3><p>For \(A(x_1,y_1)\) and \(B(x_2,y_2)\),</p>\[AB=\sqrt{(x_2-x_1)^2+(y_2-y_1)^2},\qquad M=\left(\frac{x_1+x_2}2,\frac{y_1+y_2}2\right).\]<p>The length is non-negative. Keep the squared length exact until taking the final root. Reversing A and B changes the displacement signs but not its length.</p>
       <h3>Recover a missing endpoint</h3><p>If M is the midpoint, then \(B=(2M_x-A_x,2M_y-A_y)\). Apply the relation separately to both coordinates.</p>
       <h3>Turn geometry into conditions</h3><p>For an equidistant point P, use \(PA^2=PB^2\); there is no need to introduce two square roots. A stated midpoint or equal-distance condition is an equation, not an estimate from a sketch. If AB is a diameter, its midpoint is the centre and the radius is half AB; the squared radius is \(AB^2/4\), not \(AB^2/2\).</p>''',
       r'''<ol><li>Label the coordinates and write the needed formula before substituting.</li><li>Use coordinate differences for lengths and averages for midpoints.</li><li>For a parameter, form the whole geometric condition and solve it.</li><li>Check both coordinates, any sign restriction and whether a length or squared length was requested.</li></ol><p>The written questions combine these foundations with the line and circle methods developed later in this chapter.</p>''',
       ['Do not use an average to calculate a displacement.', 'A squared distance is not a distance.',
        'For a diameter, quarter its squared length to obtain the squared radius.', 'Retain every parameter value satisfying the stated conditions.'],[
       example('Length and midpoint from the same pair',r'<p>Find the length and midpoint of A(−3,2), B(5,8).</p>',
               r'\[AB=\sqrt{8^2+6^2}=10,\qquad M=\left(\frac{-3+5}2,\frac{2+8}2\right)=(1,5).\]<p>The displacement is (8,6), while the midpoint lies halfway along the segment. They answer different questions.</p>','CG-DISTANCE'),
       example('Work backwards from a midpoint',r'<p>A is (−4,7) and the midpoint of AB is (2,1). Find B.</p>',
               r'\[B=(2(2)-(-4),\ 2(1)-7)=(8,-5).\]<p>Averaging (−4,7) and (8,−5) returns (2,1), confirming both coordinates.</p>','CG-ENDPOINT'),
       example('Equidistance without radicals',r'<p>P has coordinates (t,2t). It is equidistant from A(1,0) and B(5,2). Find t and P.</p>',
               r'\[(t-1)^2+(2t)^2=(t-5)^2+(2t-2)^2.\]<p>After expansion, the quadratic terms cancel, leaving \(16t=28\). Hence</p>\[t=\frac74,\qquad P=\left(\frac74,\frac72\right).\]<p>Substitution into the two squared distances gives the same value.</p>','CG-EQUIDISTANCE'),
       example('A diameter determines a centre and radius',r'<p>A circle has diameter endpoints (−2,1) and (6,5). Find its centre and radius.</p>',
               r'<p>The midpoint gives the centre (2,3). The diameter has length \(\sqrt{8^2+4^2}=4\sqrt5\), so the radius is \(2\sqrt5\) and its square is 20. In the circle lesson this becomes \((x-2)^2+(y-3)^2=20\).</p>','CG-DIAMETER')])

lesson('directions','parallel_perpendicular','Parallel, perpendicular and exceptional lines',
       'Choose a direction from gradients, while treating horizontal and vertical lines correctly.',
       'Use parallel and perpendicular directions, including perpendicular bisectors and undefined gradients.',
       '<p>Recall coordinate differences, fractions, line equations and the midpoint formula.</p>',
       r'''<h3>Gradient measures change in y per change in x</h3>\[m=\frac{y_2-y_1}{x_2-x_1}.\]<p>This formula requires \(x_2\ne x_1\). A horizontal line has gradient zero; a vertical line has undefined gradient.</p>
       <h3>Parallel and perpendicular directions</h3><p>Non-vertical parallel lines have equal gradients. For two perpendicular lines with finite gradients, \(m_1m_2=-1\). Thus a non-zero finite gradient m has perpendicular gradient \(-1/m\). A horizontal line is perpendicular to a vertical line; do not divide by zero.</p>
       <h3>A perpendicular bisector uses two facts</h3><p>It passes through the segment midpoint and is perpendicular to the segment. If \(B-A=(u,v)\) and M is the midpoint, its equation can be written</p>\[u(x-M_x)+v(y-M_y)=0.\]<p>This form follows from equal squared distances to A and B and works for vertical or horizontal segments too. It requires distinct endpoints.</p>''',
       r'''<ol><li>Determine whether the original line is vertical, horizontal or neither.</li><li>Find its gradient when defined, then choose the required direction.</li><li>For a bisector, calculate the midpoint as well as the direction.</li><li>Check the final line contains the required point and satisfies the direction condition.</li></ol>''',
       ['Perpendicular gradients are negative reciprocals, not just negatives.',
        'Zero and undefined gradients are different.', 'A perpendicular line is not necessarily the perpendicular bisector.',
        'Use the actual permitted points when a parameter has more than one algebraic value.'],[
       example('A gradient and its negative reciprocal',r'<p>Find the gradient of AB for A(−2,1), B(4,5), and the gradient of a perpendicular line.</p>',
               r'\[m_{AB}=\frac{5-1}{4-(-2)}=\frac23,\qquad m_{\perp}=-\frac32.\]<p>The product is −1. Merely changing the sign to −2/3 would not give a perpendicular direction.</p>','CG-GRADIENT'),
       example('Compare lines in general form',r'<p>Compare the directions of \(2x-3y+4=0\), \(4x-6y+1=0\) and \(3x+2y-7=0\).</p>',
               r'<p>The first two gradients are both 2/3; their unequal constant ratios show they are distinct parallel lines. The third gradient is −3/2, so it is perpendicular to both. Rearranging for y avoids mistaking a coefficient of x for the gradient.</p>','CG-LINE-DIRECTIONS'),
       example('Use both midpoint and direction',r'<p>Find the perpendicular bisector of the segment joining (−1,2) to (5,6).</p>',
               r'<p>The midpoint is (2,4) and the segment gradient is 2/3. Thus</p>\[y-4=-\frac32(x-2),\qquad 3x+2y-14=0.\]<p>The equation passes through (2,4), and its gradient is the negative reciprocal of the segment gradient.</p>','CG-BISECTOR'),
       example('The vertical case has a simple answer',r'<p>Find the perpendicular bisector of A(4,−2), B(4,6).</p>',
               r'<p>AB is vertical and its midpoint is (4,2). Its perpendicular bisector is therefore the horizontal line \(y=2\). No finite gradient for AB is needed.</p>','CG-EXCEPTIONAL')])

lesson('lines','straight_lines','Straight-line equations, intercepts and intersections',
       'Build a complete line equation from a direction and point, then use it in a geometric problem.',
       'Use point–gradient, slope–intercept and general forms, finding exact intercepts and intersections.',
       '<p>Recall gradients, rearranging linear equations and solving two simultaneous linear equations.</p>',
       r'''<h3>Choose a useful form</h3>\[y-y_1=m(x-x_1),\qquad y=mx+c,\qquad ax+by+c=0.\]<p>The point–gradient form uses a known point and finite gradient directly. The general form also represents vertical lines. In general form, a and b cannot both be zero. Multiplying the whole equation by a non-zero constant represents the same line.</p>
       <h3>Two points determine a line</h3><p>Calculate the gradient from distinct points, then substitute either point. If their x-coordinates are equal, write \(x=c\) instead of dividing by zero.</p>
       <h3>Read intercepts and intersections</h3><p>Set y=0 for an x-intercept and x=0 for a y-intercept, checking exceptional parallel-to-axis cases. To find a shared point of two lines, solve their equations simultaneously and give the matched pair. Parallel distinct lines have no intersection; coincident equations describe the same line.</p>
       <h3>Coordinate geometry needs calculation</h3><p>When both intercepts are finite, the area of the triangle cut off by a line and the axes is \(\tfrac12|pq|\), where p and q are its signed intercepts. An area remains non-negative even if an intercept is negative.</p>''',
       r'''<ol><li>Identify the point(s) and required direction.</li><li>Write an equation before expanding or clearing fractions.</li><li>For intersections, solve both equations and substitute the pair back into each.</li><li>For area, identify the actual vertices and use positive lengths or an absolute value.</li></ol>''',
       ['In y = mx + c, c is not usually the x-intercept.', 'Substitute the point into the entire equation.',
        'Equivalent line equations may have different non-zero overall multipliers.', 'A sketch does not replace exact intercepts or coordinates.'],[
       example('A point and a gradient',r'<p>Find a line through (3,−1) with gradient −2/3.</p>',
               r'\[y+1=-\frac23(x-3),\qquad 2x+3y-3=0.\]<p>Substituting (3,−1) gives zero; rearranging gives gradient −2/3.</p>','CG-POINT-LINE'),
       example('A line through two points',r'<p>Find the line through (−1,3) and (3,−5).</p>',
               r'<p>The gradient is \((-5-3)/(3+1)=-2\). Hence \(y-3=-2(x+1)\), giving \(y=-2x+1\). Both points satisfy the final equation.</p>','CG-TWO-POINTS'),
       example('Use the intercepts to find an area',r'<p>Find the area bounded by \(3x+2y=12\) and the coordinate axes.</p>',
               r'<p>At y=0, x=4; at x=0, y=6. The vertices are (0,0), (4,0), (0,6), so the area is \(\tfrac12(4)(6)=12\) square units.</p>','CG-INTERCEPT-AREA'),
       example('An intersection is a matched pair',r'<p>Find the intersection of \(2x+y=7\) and \(x-2y=1\).</p>',
               r'<p>Substituting \(y=7-2x\) into the second equation gives \(5x=15\). Thus x=3 and y=1. The point (3,1) satisfies both lines; giving only the x-value is incomplete.</p>','CG-LINE-INTERSECTION')])

lesson('circles','circles','Circle equations, centres and tangents',
       'Read a circle from square form, recover it from geometric information and find a tangent.',
       'Find circle centres and radii, construct circle equations and use a radius perpendicular to a tangent.',
       '<p>Recall completing the square, squared distances, midpoints and perpendicular line directions.</p>',
       r'''<h3>A circle is a fixed-distance condition</h3>\[(x-h)^2+(y-k)^2=r^2.\]<p>The centre is (h,k) and the radius is r&gt;0. The right-hand side is the squared radius. A point lies on the circle when substitution gives equality, inside when its squared distance is smaller, and outside when it is greater.</p>
       <h3>Recover square form</h3><p>For \(x^2+y^2+2gx+2fy+c=0\), complete the square in each variable:</p>\[(x+g)^2+(y+f)^2=g^2+f^2-c.\]<p>The centre is (−g,−f). A positive right-hand side gives a real circle; zero gives a single point, and a negative value gives no real points.</p>
       <h3>Information that determines a circle</h3><p>Use a supplied centre and one circumference point to find r². For a diameter, use its midpoint and half its length. Three distinct non-collinear points determine a circle: substitute them into the general form, or intersect two perpendicular bisectors. Three collinear distinct points do not determine a finite circle.</p>
       <h3>The tangent is perpendicular to the radius</h3><p>At a point P=(p,q) on a circle with centre (h,k), the tangent is</p>\[(p-h)(x-p)+(q-k)(y-q)=0.\]<p>This follows from the perpendicular direction and works for horizontal or vertical radii. Check that P really lies on the circle. The normal passes through P and the centre.</p>''',
       r'''<ol><li>Choose square form or general form to match the supplied information.</li><li>Calculate r² exactly and check its sign.</li><li>For a tangent, verify the contact point and find the radius direction.</li><li>Use perpendicularity to write the tangent; substitute the point to check it.</li></ol>''',
       ['Reverse the signs inside squared brackets to read the centre.', 'The constant in the expanded equation is not generally r².',
        'A radius and a diameter have different lengths.', 'The tangent passes through the contact point, not the centre.'],[
       example('A centre and one circumference point',r'<p>Find the circle with centre (−2,3) passing through (1,7).</p>',
               r'\[r^2=(1+2)^2+(7-3)^2=25.\]<p>Its equation is \((x+2)^2+(y-3)^2=25\), with radius 5. The point (1,7) satisfies the equation.</p>','CG-CENTRE-POINT'),
       example('Complete two squares',r'<p>Find the centre and radius of \(x^2+y^2-6x+4y-12=0\).</p>',
               r'\[(x-3)^2-9+(y+2)^2-4-12=0,\]\[(x-3)^2+(y+2)^2=25.\]<p>The centre is (3,−2), and the radius is 5.</p>','CG-SQUARE-FORM'),
       example('A right angle locates a diameter',r'<p>A circle passes through (1,1), (5,1) and (1,7). Find its equation.</p>',
               r'<p>The horizontal and vertical segments meet at a right angle at (1,1). The opposite side is a diameter. Its midpoint is (3,4) and its squared length is 52, so</p>\[(x-3)^2+(y-4)^2=13.\]<p>All three supplied points satisfy the equation. Substituting into the general form provides an alternative algebraic method.</p>','CG-THREE-POINTS'),
       example('A tangent and its normal',r'<p>For the circle with centre (2,−1) through P(5,3), find the tangent and normal at P.</p>',
               r'<p>The radius displacement is (3,4). The tangent therefore satisfies</p>\[3(x-5)+4(y-3)=0,\qquad 3x+4y-27=0.\]<p>The normal has the radius direction and equation \(4x-3y-11=0\). Both lines pass through P; their gradients have product −1.</p>','CG-TANGENT')])

lesson('intersections','line_circle','Line–circle intersections, chords and tangency',
       'Solve for every common point, distinguish a chord from a tangent and find complete parameter conditions.',
       'Solve line–circle and related circle systems, calculate chord geometry and use discriminants for tangency.',
       '<p>Recall quadratic solving, discriminants, exact roots, line equations and circle square form.</p>',
       r'''<h3>Reduce the intersection problem to a quadratic</h3><p>Substitute a line equation into the circle equation. Each valid root gives an input coordinate; recover its matching second coordinate from the line. For a vertical line x=c, substitute directly instead of trying to write y=mx+d.</p>
       <h3>Count the common points</h3><p>The resulting quadratic has two distinct real roots for a secant, a repeated root for a tangent, and no real roots when the line misses the circle. Apply \(\Delta&gt;0\), \(\Delta=0\) or \(\Delta&lt;0\) to the equation after substitution. State all parameter intervals and their endpoints.</p>
       <h3>A chord has two endpoints and a midpoint</h3><p>Once both endpoints are known, use their exact distance for the chord length. The line from the centre perpendicular to a chord passes through the chord midpoint. Alternatively, if the perpendicular centre-to-line distance is d and the radius is r, half the chord has length \(\sqrt{r^2-d^2}\).</p>
       <h3>Two circles can share a chord</h3><p>Subtract their equations to eliminate x² and y². The resulting line contains their common points; it is not a replacement for either circle. Substitute that line into a circle and solve for every common point. Verify candidates in both original equations.</p>''',
       r'''<ol><li>State both original equations and eliminate one variable.</li><li>Solve the complete quadratic or its discriminant condition.</li><li>Recover every paired coordinate and verify it in the originals.</li><li>Use exact lengths or parameter sets; round only if the question asks for an approximation.</li></ol>''',
       ['A repeated root gives one contact point, not two distinct intersections.',
        'Do not pair the x-value of one root with the y-value of the other.',
        'A common-chord line alone is not the complete circle intersection answer.',
        'A strict two-point condition excludes the tangent boundary values.'],[
       example('Both endpoints of a secant',r'<p>Find all intersections of \(x^2+y^2=25\) and \(y=x+1\), and the chord length.</p>',
               r'\[x^2+(x+1)^2=25,\qquad (x+4)(x-3)=0.\]<p>The intersections are (−4,−3) and (3,4). Their difference is (7,7), so the chord length is \(7\sqrt2\).</p>','CG-SECANT'),
       example('A complete family of horizontal lines',r'<p>For the circle \((x-1)^2+(y+2)^2=9\), find all t for which y=t meets it twice, once or not at all.</p>',
               r'\[(x-1)^2=9-(t+2)^2.\]<p>There are two intersections for \(-5&lt;t&lt;1\), one for t=−5 or t=1, and none for t&lt;−5 or t&gt;1. The endpoints are tangent levels and cannot be included in the two-point interval.</p>','CG-PARAMETER'),
       example('Use a chord midpoint to avoid unnecessary algebra',r'<p>Find the endpoints and length of the chord y=4 in \((x-2)^2+(y-1)^2=25\).</p>',
               r'<p>The centre-to-chord perpendicular meets the line at (2,4), a distance 3 from the centre. Half the chord is \(\sqrt{25-9}=4\). The endpoints are (−2,4) and (6,4), and the chord length is 8.</p>','CG-CHORD'),
       example('A line from two circle equations',r'<p>Find the common points of \(x^2+y^2=25\) and \((x-4)^2+y^2=9\).</p>',
               r'<p>Subtracting gives \(-8x+16=-16\), so x=4. Substitution into the first circle gives y²=9. The common points are (4,−3) and (4,3). Both satisfy the second circle too; the entire line x=4 does not.</p>','CG-TWO-CIRCLES')])

def field(key,label,kind,expected,**extra):return dict(key=key,label=label,type=kind,expected=expected,**extra)
def tex(t):return s.latex(s.sympify(str(t),locals={'x':x,'y':y,'inf':s.oo}))
def answers(fields):
    out=[]
    for f in fields:
        t=f['expected'];kind=f['type']
        if kind=='choice':body=f['options'][t]
        elif kind=='pairs':body=r'\('+r',\quad '.join('('+','.join(tex(v) for v in pair[1:-1].split(','))+')' for pair in t.split(';'))+r'\)'
        elif kind=='set':
            if t.startswith('{'):body=r'\(\{'+','.join(tex(v) for v in t[1:-1].split(','))+r'\}\)'
            else:body=r'\('+r'\cup'.join(part[0]+','.join(tex(v) for v in part[1:-1].split(','))+part[-1] for part in t.split(' U '))+r'\)'
        elif kind=='equation':body=r'\('+tex(t)+r'=0\)'
        else:body=r'\('+tex(t)+r'\)'
        out.append('<p>'+f['label']+': '+body+'</p>')
    return ''.join(out)

def point(t):return '('+','.join(str(s.simplify(v)) for v in t)+')'
def pair_tex(t):return r'\('+s.latex(s.Tuple(*t))+r'\)'
def line(A,B):return s.expand((B[1]-A[1])*(x-A[0])-(B[0]-A[0])*(y-A[1]))
def dist2(A,B):return s.simplify(sum((b-a)**2 for a,b in zip(A,B)))
def circle(C,r2):return s.expand((x-C[0])**2+(y-C[1])**2-r2)
def equation(key,label,expr):return field(key,label,'equation',str(s.expand(expr)),variables=['x','y'])
def quick(topic,family,v,title,prompt,fields,solution,model):
    uid=f'M4U-9709-P1-CG-CHECK-{topic.upper()}-{family}-{v}'
    criteria=[dict(code='B1',marks=1,description_html='Complete correct answer for '+f['label']+'.') for f in fields]
    hint={'distance':'Use coordinate differences for squared lengths and averages for midpoints.',
          'directions':'Check for a horizontal or vertical segment before using a reciprocal gradient.',
          'lines':'Use a known point and direction, or solve both linear equations.',
          'circles':'Identify the centre and squared radius; a tangent is perpendicular to the radius.',
          'intersections':'Substitute one equation into the other, solve completely and recover matching pairs.'}[topic]
    questions.append(dict(id=uid,family_uid=f'M4U-9709-P1-CG-CHECK-{topic.upper()}-{family}',lesson=topic,title=title,
        collection='short' if v==0 else 'variant',prompt_html=prompt,answer_html=answers(fields),solution_html=solution,
        hint_html='<p>'+hint+'</p>',marks=len(fields),difficulty=2,fields=fields,
        parts=[dict(label='',marking_criteria=criteria)],verification=uid))
    models.append(dict(uid=uid,**model))

for v in range(2):
    A,B=((-2,1),(4,5)) if v==0 else ((-1,2),(5,7));M=tuple(s.Rational(a+b,2) for a,b in zip(A,B));d=s.sqrt(dist2(A,B))
    quick('distance',1,v,'Exact length and midpoint','<p>Find the length and midpoint of A'+pair_tex(A)+' and B'+pair_tex(B)+'.</p>',
        [field('length','Length AB','number',str(d)),field('midpoint','Midpoint (x,y)','pairs',point(M))],
        fr'<p>The squared coordinate differences add to \({tex(dist2(A,B))}\), so \(AB={tex(d)}\). Average each coordinate to obtain {pair_tex(M)}.</p>',dict(kind='distance',A=A,B=B))
    A,M=((-3,4),(1,-2)) if v==0 else ((2,-5),(-1,3));B=tuple(2*m-a for a,m in zip(A,M))
    quick('distance',2,v,'Recover a missing endpoint','<p>A is '+pair_tex(A)+' and the midpoint of AB is '+pair_tex(M)+'. Find B.</p>',
        [field('point','Endpoint B (x,y)','pairs',point(B))],'<p>Double each midpoint coordinate and subtract the corresponding coordinate of A. Check by averaging the endpoints.</p>',dict(kind='endpoint',A=A,M=M))
    A,B=((0,1),(6,3)) if v==0 else ((-2,1),(4,5));t=s.solve(dist2((x,2*x),A)-dist2((x,2*x),B),x)[0]
    quick('distance',3,v,'An equidistant point with a parameter','<p>P(t,2t) is equidistant from A'+pair_tex(A)+' and B'+pair_tex(B)+'. Find t and P.</p>',
        [field('parameter','Parameter t','number',str(t)),field('point','Point P (x,y)','pairs',point((t,2*t)))],
        fr'<p>Set the two squared distances equal. The squared terms cancel, giving \(t={tex(t)}\) and \(P={tex(s.Tuple(t,2*t))}\).</p>',dict(kind='equidistant',A=A,B=B))
    A,B=((-1,2),(7,6)) if v==0 else ((-4,3),(2,-5));C=tuple(s.Rational(a+b,2) for a,b in zip(A,B));r2=dist2(A,B)/4
    quick('distance',4,v,'Centre and squared radius from a diameter','<p>A circle has diameter endpoints '+pair_tex(A)+' and '+pair_tex(B)+'. Give its centre and squared radius.</p>',
        [field('centre','Centre (x,y)','pairs',point(C)),field('r2','Squared radius','number',str(r2))],
        fr'<p>The centre is the midpoint {pair_tex(C)}. The squared diameter is \({tex(dist2(A,B))}\), so divide by four to obtain \(r^2={tex(r2)}\).</p>',dict(kind='diameter',A=A,B=B))

    A,B=((0,1),(6,5)) if v==0 else ((2,-1),(-2,5));m=s.Rational(B[1]-A[1],B[0]-A[0])
    quick('directions',1,v,'A direction and a perpendicular direction','<p>Find the gradient of AB for A'+pair_tex(A)+' and B'+pair_tex(B)+', and the gradient of a perpendicular line.</p>',
        [field('gradient','Gradient of AB','number',str(m)),field('perpendicular','Perpendicular gradient','number',str(-1/m))],
        fr'<p>Compute change in y divided by change in x: \(m={tex(m)}\). Its negative reciprocal is \({tex(-1/m)}\).</p>',dict(kind='gradients',A=A,B=B))
    a,b,c,P=(2,-3,5,(3,-2)) if v==0 else (3,2,-1,(-2,4));new=a*(x-P[0])+b*(y-P[1])
    quick('directions',2,v,'A parallel line through a given point',fr'<p>Find the line through {pair_tex(P)} parallel to \({tex(a*x+b*y+c)}=0\).</p>',
        [equation('line','Equation of the parallel line',new)],fr'<p>A parallel line keeps the same x- and y-coefficient ratio. Use the point to find its constant:</p>\[{tex(new)}=0.\]',dict(kind='parallel',a=a,b=b,P=P))
    A,B=((-2,0),(4,4)) if v==0 else ((1,-3),(5,3));M=tuple(s.Rational(a+b,2) for a,b in zip(A,B));bis=(B[0]-A[0])*(x-M[0])+(B[1]-A[1])*(y-M[1])
    quick('directions',3,v,'A complete perpendicular bisector','<p>Find the perpendicular bisector of A'+pair_tex(A)+' and B'+pair_tex(B)+'.</p>',
        [equation('line','Perpendicular bisector equation',bis)],fr'<p>It passes through {pair_tex(M)} and is perpendicular to the segment. One equivalent equation is</p>\[{tex(bis)}=0.\]',dict(kind='bisector',A=A,B=B))
    A,B=((3,-1),(3,7)) if v==0 else ((-4,2),(6,2));bis=y-3 if v==0 else x-1
    quick('directions',4,v,'Horizontal and vertical exceptional cases','<p>For A'+pair_tex(A)+' and B'+pair_tex(B)+', choose the gradient of AB and give its perpendicular bisector.</p>',
        [field('gradient','Gradient of AB','choice','A' if v==0 else 'C',options={'A':'Undefined','B':'1','C':'0'}),equation('line','Perpendicular bisector equation',bis)],
        fr'<p>The segment is {"vertical" if v==0 else "horizontal"}, so its perpendicular bisector is {"horizontal" if v==0 else "vertical"}. Its equation is \({tex(bis)}=0\).</p>',dict(kind='exceptional',A=A,B=B))

    m,P=(s.Rational(-2,3),(-3,2)) if v==0 else (s.Rational(3,4),(4,-1));eq=y-P[1]-m*(x-P[0])
    quick('lines',1,v,'A line from point and gradient','<p>Find a line through '+pair_tex(P)+fr' with gradient \({tex(m)}\).</p>',
        [equation('line','Equation of the line',eq)],fr'<p>Use point–gradient form:</p>\[{tex(y-P[1])}={tex(m)}\left({tex(x-P[0])}\right).\]',dict(kind='point_line',m=str(m),P=P))
    A,B=((-2,4),(3,-6)) if v==0 else ((1,2),(5,8));eq=line(A,B)
    quick('lines',2,v,'A line through two points','<p>Find the equation of the line through '+pair_tex(A)+' and '+pair_tex(B)+'.</p>',
        [equation('line','Equation through A and B',eq)],fr'<p>Find the gradient, then substitute either point. An equivalent general form is \({tex(eq)}=0\).</p>',dict(kind='two_point_line',A=A,B=B))
    a,b,c=(2,3,-18) if v==0 else (3,-2,-12);px=s.Rational(-c,a);qy=s.Rational(-c,b);area=abs(px*qy)/2
    quick('lines',3,v,'Both intercepts and the enclosed area',fr'<p>Find both axis intercepts of \({tex(a*x+b*y+c)}=0\), and the area of the triangle bounded by this line and the axes.</p>',
        [field('points','Both intercepts (x,y)','pairs',point((px,0))+';'+point((0,qy))),field('area','Triangle area','number',str(area))],
        fr'<p>Set y=0 and x=0 in turn. The area is \(\tfrac12|({tex(px)})({tex(qy)})|={tex(area)}\).</p>',dict(kind='intercepts',a=a,b=b,c=c))
    f,g=(3*x+y-7,x-2*y) if v==0 else (x+2*y-5,3*x-y-1);P=s.solve([f,g],(x,y));pt=(P[x],P[y])
    quick('lines',4,v,'A complete intersection point',fr'<p>Find the intersection of \({tex(f)}=0\) and \({tex(g)}=0\).</p>',
        [field('point','Intersection (x,y)','pairs',point(pt))],fr'<p>Solve the two equations simultaneously, then substitute the pair into both. The intersection is {pair_tex(pt)}.</p>',dict(kind='line_intersection',f=str(f),g=str(g)))

    C,P=((-1,2),(2,6)) if v==0 else ((3,-2),(5,1));r2=dist2(C,P);eq=circle(C,r2)
    quick('circles',1,v,'A centre and one point determine a circle','<p>Find the equation and radius of the circle with centre '+pair_tex(C)+' passing through '+pair_tex(P)+'.</p>',
        [equation('circle','Circle equation',eq),field('radius','Radius','number',str(s.sqrt(r2)))],fr'<p>The squared radius is the squared distance between the two points: \(r^2={tex(r2)}\). Use square form around the stated centre.</p>',dict(kind='centre_point',C=C,P=P))
    C,r2=((2,-3),25) if v==0 else ((-3,1),5);eq=circle(C,r2)
    quick('circles',2,v,'Read an expanded circle correctly',fr'<p>Find the centre and radius of \({tex(eq)}=0\).</p>',
        [field('centre','Centre (x,y)','pairs',point(C)),field('radius','Radius','number',str(s.sqrt(r2)))],fr'<p>Complete the square in x and y. The result has centre {pair_tex(C)} and squared radius \({tex(r2)}\).</p>',dict(kind='expanded_circle',polynomial=str(eq)))
    A,B=((-2,0),(4,6)) if v==0 else ((0,-1),(6,3));C=tuple(s.Rational(a+b,2) for a,b in zip(A,B));r2=dist2(A,B)/4;eq=circle(C,r2)
    quick('circles',3,v,'Write the circle with a given diameter','<p>Find the circle equation for diameter endpoints '+pair_tex(A)+' and '+pair_tex(B)+'.</p>',
        [equation('circle','Circle equation',eq)],fr'<p>The midpoint is the centre {pair_tex(C)} and \(r^2={tex(r2)}\). Substitute these into the circle equation.</p>',dict(kind='diameter_circle',A=A,B=B))
    C,P=((1,-2),(4,2)) if v==0 else ((-2,1),(-2,6));u,w=P[0]-C[0],P[1]-C[1];tangent=u*(x-P[0])+w*(y-P[1]);normal=w*(x-P[0])-u*(y-P[1])
    quick('circles',4,v,'Both the tangent and normal','<p>A circle has centre '+pair_tex(C)+' and passes through P'+pair_tex(P)+'. Find its tangent and normal at P.</p>',
        [equation('tangent','Tangent equation',tangent),equation('normal','Normal equation',normal)],
        fr'<p>The radius displacement is {pair_tex((u,w))}. A perpendicular line through P gives the tangent; the line through P and the centre gives the normal.</p>',dict(kind='tangent_normal',C=C,P=P))

    r2,intercept=(20,2) if v==0 else (10,0);roots=s.solve(x*x+(x+intercept)**2-r2,x);pts=[(a,a+intercept) for a in roots];length=s.sqrt(dist2(*pts))
    quick('intersections',1,v,'Every intersection and the chord length',fr'<p>Find both common points of \(x^2+y^2={r2}\) and \(y={tex(x+intercept)}\), and their distance apart.</p>',
        [field('points','All intersection points (x,y)','pairs',';'.join(point(P) for P in pts)),field('length','Chord length','number',str(length))],
        fr'<p>Substitute the line into the circle, solve for both x-values, and recover each matching y-value. Apply the distance formula to obtain \({tex(length)}\).</p>',dict(kind='secant',r2=r2,c=intercept))
    C,r=((2,-1),4) if v==0 else ((-1,3),2);lo=C[1]-r;hi=C[1]+r
    quick('intersections',2,v,'Strict secants and boundary tangents',fr'<p>For the circle \({tex((x-C[0])**2+(y-C[1])**2)}={r*r}\), find all t giving two distinct intersections with y=t, and all tangent values of t.</p>',
        [field('parameters','All t for two distinct intersections','set',f'({lo},{hi})'),field('tangents','All tangent t-values','set','{'+str(lo)+','+str(hi)+'}')],
        fr'<p>The squared horizontal offset is \({r*r}-(t-({C[1]}))^2\). It is positive between {lo} and {hi}, and zero at both endpoints.</p>',dict(kind='horizontal_family',C=C,r=r))
    C,r,d=((1,-2),5,3) if v==0 else ((-3,2),13,5);half=s.sqrt(r*r-d*d);pts=[(C[0]-half,C[1]+d),(C[0]+half,C[1]+d)]
    quick('intersections',3,v,'A horizontal chord and its midpoint',fr'<p>For the circle \({tex((x-C[0])**2+(y-C[1])**2)}={r*r}\), find the chord endpoints on \(y={C[1]+d}\), its midpoint and its length.</p>',
        [field('points','Both endpoints (x,y)','pairs',';'.join(point(P) for P in pts)),field('midpoint','Chord midpoint (x,y)','pairs',point((C[0],C[1]+d))),field('length','Chord length','number',str(2*half))],
        fr'<p>The centre-to-chord distance is {d}, so half the chord is \(\sqrt{{{r*r}-{d*d}}}={tex(half)}\). The perpendicular from the centre reaches the midpoint directly above it.</p>',dict(kind='chord',C=C,r=r,d=d))
    R2,a,S2=(13,4,5) if v==0 else (25,6,13);cx=s.Rational(R2+a*a-S2,2*a);cy=s.sqrt(R2-cx*cx)
    quick('intersections',4,v,'Two circles: line and complete point set',fr'<p>Find the common-chord line and all common points of \(x^2+y^2={R2}\) and \((x-{a})^2+y^2={S2}\).</p>',
        [equation('line','Common-chord line',x-cx),field('points','All common points (x,y)','pairs',point((cx,-cy))+';'+point((cx,cy)))],
        fr'<p>Subtract the two circle equations to obtain \(x={tex(cx)}\). Substitute into a circle to find both y-values, \(\pm{tex(cy)}\), and verify both pairs in the other circle.</p>',dict(kind='two_circles',R2=R2,a=a,S2=S2))
