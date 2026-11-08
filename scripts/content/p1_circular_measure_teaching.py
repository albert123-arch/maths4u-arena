"""9709 P1 Circular Measure: own explanations, examples and exact-answer practice."""
import sympy as s
r=s.Symbol('r',real=True)
lessons,questions,models=[],[],[]
asset='/assets/original/circular-measure/'
def image(name,alt):return '<p><img src="'+asset+name+'.svg" alt="'+alt+'"></p>'
def example(title,question,solution,verification):return dict(title=title,question=question,solution=solution,verification=verification)
def lesson(key,suffix,title,summary,objective,before,ideas,method,mistakes,examples):
    lessons.append(dict(key=key,id='orig_circular_measure_'+suffix,title=title,summary=summary,objective=objective,
        before=before,ideas=ideas,method=method,mistakes=mistakes,examples=examples))

lesson('radians','radians','Radians, degrees and complete rotations',
       'Connect an angle to an arc-to-radius ratio and keep its units throughout the calculation.',
       'Use radian measure, convert exactly between degrees and radians and identify the required angle in a diagram.',
       '<p>Recall angles in triangles and around a point, exact fractions of a turn and basic trigonometry.</p>',
       r'''<h3>One radian is defined by an arc</h3><p>An angle of one radian subtends an arc equal in length to the radius. More generally, \(\theta=s/r\), when s and r use the same length unit. Radian measure is a ratio; it does not depend on the size of the circle.</p>'''+image('radian','An arc whose length equals the radius subtends one radian')+r'''
       <h3>Convert through a half-turn</h3>\[\pi\text{ radians}=180^\circ,\qquad \theta_{\rm rad}=\theta_{\rm deg}\frac{\pi}{180}.\]<p>To convert radians to degrees, multiply by \(180/\pi\). Keep exact multiples of π where possible. A full turn is 2π radians and a right angle is π/2 radians.</p>
       <h3>Identify the intended angle</h3><p>Angles in a triangle sum to π; angles around a point sum to 2π. If the minor central angle is θ, its reflex partner is 2π−θ. The angle at the centre is not generally the angle at the circumference.</p>
       <h3>Use radians in trigonometric calculations</h3><p>Set the calculator to RAD before evaluating sine, cosine or an inverse trigonometric ratio for a radian question. Keep unrounded intermediate values. An inverse ratio needs the branch allowed by the geometry.</p>''',
       r'''<ol><li>Mark the angle and decide whether it is minor, reflex or part of a triangle.</li><li>Convert all angle measures to a consistent unit.</li><li>Use θ=s/r or an angle sum; retain exact fractions of π.</li><li>Check the size against the diagram without treating the sketch as a scale drawing.</li></ol><p>The written questions combine these angle skills with the later arc, area and boundary methods in this chapter.</p>''',
       ['Do not put a degree value directly into a radian formula.', 'Use π, not 2π, as the angle sum of a triangle.',
        'Check whether the required angle is the reflex partner.', 'Calculator mode matters even when the final answer is in centimetres.'],[
       example('Use the definition before a formula',r'<p>An arc of length 10.5 m lies on a circle of radius 7 m. Find its central angle.</p>',
               r'\[\theta=\frac{10.5}{7}=\frac32\text{ radians}.\]<p>The ratio uses two lengths in the same unit. It is not 1.5 degrees.</p>','CM-RADIAN'),
       example('Exact conversion in both directions',r'<p>Convert 150° to radians and \(7\pi/4\) radians to degrees.</p>',
               r'\[150\frac{\pi}{180}=\frac{5\pi}{6},\qquad \frac{7\pi}{4}\frac{180}{\pi}=315^\circ.\]<p>Work with the exact fraction before using decimals.</p>','CM-CONVERSION'),
       example('Keep minor and reflex angles separate',r'<p>A minor central angle is \(2\pi/5\). Find the reflex angle between the same radii.</p>',
               r'\[2\pi-\frac{2\pi}{5}=\frac{8\pi}{5}.\]<p>The result is greater than π and less than 2π, as a reflex angle should be.</p>','CM-REFLEX'),
       example('An inverse ratio with the correct mode',r'<p>An acute angle in a right-angled triangle has opposite side 4 cm and adjacent side 3 cm. Find the angle in radians to 3 significant figures.</p>',
               r'\[\theta=\tan^{-1}\!\left(\frac43\right)=0.927295\ldots\text{ radians}.\]<p>Thus θ=0.927 radians to 3 significant figures. The acute condition selects the angle between 0 and π/2.</p>','CM-INVERSE-RATIO')])

lesson('arcs','arc_length','Arc length, sector perimeter and rolling distance',
       'Choose the correct arc and include only the actual straight edges of the boundary.',
       'Use s = rθ for minor or major arcs, reconstruct missing data and distinguish arc length from sector perimeter.',
       '<p>Recall radian conversion and the distinction between a radius, diameter, chord and arc.</p>',
       r'''<h3>An arc scales with its radius and angle</h3>\[s=r\theta\qquad(\theta\text{ in radians}).\]<p>For the same radius, a major arc uses the reflex angle, not the smaller angle drawn between the radii.</p>
       <h3>A sector includes two radial edges</h3><p>For a sector with \(0&lt;\theta&lt;2\pi\),</p>\[P=2r+r\theta.\]<p>The arc alone is not the sector perimeter. A segment has a chord instead of those two radii; its boundary is treated in the segments lesson.</p>
       <h3>Reverse the calculation</h3><p>Use r=s/θ or θ=s/r, retaining consistent units. When the perimeter and arc length are given, the two straight radii together have length P−s.</p>
       <h3>Several rotations describe travel</h3><p>N full turns give a total angle of 2πN and an arc-travel distance of 2πrN. For a wheel rolling without slipping this equals the ground distance. Cumulative travel can involve more than one turn; it is not the area of a sector covering the same region repeatedly.</p>''',
       r'''<ol><li>Identify the centre and radius of the required arc.</li><li>Find its angle in radians, using the reflex angle if needed.</li><li>Calculate the arc with s=rθ.</li><li>For a perimeter, trace the complete boundary and add each exposed straight edge once.</li></ol>''',
       ['An arc is not the straight chord between its endpoints.', 'A sector perimeter normally needs two radii.',
        'Use the major angle for a major arc.', 'For rolling distance, use the radius rather than the diameter in rθ.'],[
       example('An arc and a complete sector boundary',r'<p>A sector has radius 6 cm and angle 0.8 radians. Find its arc length and perimeter.</p>'+image('arc-length','Radius 6, angle 0.8 radians and the two radial boundary edges'),
               r'\[s=6(0.8)=4.8\text{ cm},\qquad P=12+4.8=16.8\text{ cm}.\]<p>The two radial edges account for the difference.</p>','CM-ARC-PERIMETER'),
       example('Recover a radius exactly',r'<p>An arc has length \(5\pi\) cm and central angle \(5\pi/6\). Find the radius and sector perimeter.</p>',
               r'\[r=\frac{5\pi}{5\pi/6}=6,\qquad P=12+5\pi\text{ cm}.\]<p>The angle is already in radians, and π cancels in the radius calculation.</p>','CM-ARC-RADIUS'),
       example('Use the reflex angle for the major arc',r'<p>A circle has radius 4 cm and minor central angle \(\pi/3\). Find the major arc length and major-sector perimeter.</p>',
               r'\[\theta_{\rm major}=2\pi-\frac\pi3=\frac{5\pi}3,\qquad s=\frac{20\pi}3.\]<p>The major-sector perimeter is \(8+20\pi/3\) cm. Its two radial edges remain part of the boundary.</p>','CM-MAJOR-ARC'),
       example('Count all the turns',r'<p>A wheel of radius 0.35 m rolls without slipping through 12.5 turns. Find the exact distance travelled.</p>',
               r'\[\theta=12.5(2\pi)=25\pi,\qquad d=\frac7{20}(25\pi)=\frac{35\pi}{4}\text{ m}.\]<p>The angle measures accumulated rotation, so it can exceed 2π.</p>','CM-ROLLING')])

lesson('sectors','sector_area','Sector area and reconstruction',
       'Use the sector fraction of a circle, combine area and arc data, and check geometric restrictions.',
       'Find sector areas, reconstruct radius and angle and model a fixed sector perimeter using a quadratic.',
       '<p>Recall the area of a circle, radian measure, algebraic rearrangement and completing the square.</p>',
       r'''<h3>A sector is a fraction of a circle</h3><p>Its angle is θ out of a complete 2π turn, so</p>\[A=\frac{\theta}{2\pi}\,\pi r^2=\frac12r^2\theta.\]<p>This formula uses radians. Combining it with s=rθ gives \(A=\tfrac12rs\), which can simplify reconstruction.</p>
       <h3>Reverse two measurements</h3><p>From A and θ, find r²=2A/θ and take the positive radius. From area and arc length, use r=2A/s, then θ=s/r. From area and perimeter, solve both conditions and reject roots violating r&gt;0 or the stated angle range.</p>
       <h3>A fixed perimeter gives a quadratic</h3><p>For a sector of perimeter P, with 0&lt;θ&lt;2π,</p>\[\theta=\frac{P-2r}{r},\qquad A=\frac P2r-r^2.\]<p>Completing the square finds an area bound without calculus. Check that the radius attaining it gives an angle in the allowed range.</p>''',
       r'''<ol><li>Record which angle belongs to the sector, in radians.</li><li>Use A=½r²θ or A=½rs to match the available data.</li><li>If reconstructing, solve for the positive radius and then the angle.</li><li>Check both original measurements and any minor/reflex restriction.</li></ol>''',
       ['Sector area uses r²; arc length uses r.', 'Do not omit the factor ½.',
        'A negative algebraic radius is not a geometric solution.', 'Area and perimeter have different units.'],[
       example('Area with a non-special radian angle',r'<p>Find the area of a sector with radius 5 cm and angle 1.2 radians.</p>'+image('sector-area','Radius 5, angle 1.2 radians and area 15'),
               r'\[A=\frac12(5^2)(1.2)=15\text{ cm}^2.\]<p>No conversion is needed: 1.2 is already a radian measure.</p>','CM-SECTOR-AREA'),
       example('A radius from an exact area',r'<p>A sector has area \(18\pi\) cm² and angle \(\pi/4\). Find its radius and perimeter.</p>',
               r'\[r^2=\frac{2(18\pi)}{\pi/4}=144,\qquad r=12.\]<p>The arc length is 3π cm, so the perimeter is \(24+3\pi\) cm.</p>','CM-AREA-RADIUS'),
       example('Area and arc length work together',r'<p>A sector has area 40 cm² and arc length 10 cm. Find its radius, angle and perimeter.</p>',
               r'\[r=\frac{2A}{s}=8,\qquad\theta=\frac{10}8=\frac54.\]<p>The perimeter is 2(8)+10=26 cm. Substituting into ½r²θ gives the original area.</p>','CM-RECONSTRUCTION'),
       example('An area maximum without differentiating',r'<p>A sector has perimeter 20 cm and angle between 0 and 2π. Find its greatest possible area.</p>',
               r'\[\theta=\frac{20-2r}{r},\qquad A=10r-r^2=25-(r-5)^2.\]<p>Thus A≤25 cm². Equality occurs at r=5, giving θ=2 radians, which satisfies the stated restriction. The maximum is therefore attained.</p>','CM-MAXIMUM')])

lesson('segments','segments','Chords, triangles and circular segments',
       'Separate a sector from its triangle and decide whether the requested region is minor or major.',
       'Find chord lengths and minor or major segment areas and perimeters using the correct radian angle.',
       '<p>Recall sine, cosine, isosceles triangles, sector formulas and exact special-angle values.</p>',
       r'''<h3>A chord comes from two right triangles</h3><p>Bisect the isosceles central triangle. For a minor central angle θ,</p>\[c=2r\sin\frac\theta2,\qquad d=r\cos\frac\theta2,\]<p>where c is the chord length and d the perpendicular distance from the centre to the chord.</p>
       <h3>A minor segment is sector minus triangle</h3><p>For 0&lt;θ&lt;π,</p>\[A_{\rm triangle}=\frac12r^2\sin\theta,\qquad A_{\rm minor}=\frac12r^2(\theta-\sin\theta).\]<p>Use radians both in θ and in the trigonometric calculation. At θ=π the segment is a semicircle.</p>
       <h3>Its perimeter is arc plus chord</h3>\[P_{\rm minor}=r\theta+c.\]<p>The two radii inside the construction are not on the segment boundary.</p>
       <h3>A major segment is the complementary region</h3>\[A_{\rm major}=\pi r^2-A_{\rm minor},\qquad P_{\rm major}=r(2\pi-\theta)+c.\]<p>Using the complement avoids subtracting an unsigned triangle from a reflex sector incorrectly.</p>''',
       r'''<ol><li>Mark the chord and the relevant central angle.</li><li>Find the central triangle area or chord length using radians.</li><li>For a minor segment, subtract the triangle from its sector.</li><li>For a major segment, use the circle complement and the major arc; include the chord once.</li></ol>''',
       ['A segment is bounded by an arc and a chord, not two radii.', 'The half-angle belongs in the chord formula.',
        'Use the complementary area for a major segment.', 'Keep full calculator precision until the final rounding.'],[
       example('See the triangle being removed',r'<p>Find the minor segment area for radius 4 cm and angle π/2.</p>'+image('segment','The quarter-sector with its central triangle removed'),
               r'\[A_{\rm sector}=4\pi,\qquad A_{\rm triangle}=8,\qquad A_{\rm segment}=4\pi-8\text{ cm}^2.\]<p>The unshaded central triangle is not part of the segment.</p>','CM-MINOR-SEGMENT'),
       example('A chord equal to the radius',r'<p>A circle has radius 6 cm and chord length 6 cm. Find the minor angle and the minor segment area and perimeter.</p>',
               r'<p>The central triangle is equilateral, so θ=π/3.</p>\[A=6\pi-9\sqrt3\text{ cm}^2,\qquad P=6+2\pi\text{ cm}.\]<p>The perimeter uses the chord 6 and arc 2π, without adding either radius.</p>','CM-CHORD-RADIUS'),
       example('Choose the major region',r'<p>A circle has radius 3 cm and chord length \(3\sqrt3\) cm. Find the major segment area and perimeter.</p>',
               r'<p>Since \(\sin(\theta/2)=\sqrt3/2\), the minor angle is 2π/3. Hence</p>\[A_{\rm minor}=3\pi-\frac{9\sqrt3}{4},\]\[A_{\rm major}=6\pi+\frac{9\sqrt3}{4},\qquad P_{\rm major}=4\pi+3\sqrt3.\]<p>The two segment areas sum to 9π.</p>','CM-MAJOR-SEGMENT'),
       example('Round the area, not the intermediate sine',r'<p>Find the minor segment area for radius 8 cm and angle 0.9 radians, to 3 significant figures.</p>',
               r'\[A=32\left(0.9-\sin0.9\right)=3.733538\ldots\text{ cm}^2.\]<p>Therefore A=3.73 cm². Using degree mode or rounding sin(0.9) too early gives a different result.</p>','CM-DECIMAL-SEGMENT')])

lesson('composites','composite_sectors','Composite boundaries, overlaps and modelling',
       'Combine sector and triangle pieces, trace the exposed boundary and check the geometry of a model.',
       'Find composite areas and perimeters, handle annular sectors and overlaps and form consistent geometric models.',
       '<p>Recall sector, triangle and segment formulas, tangency and the distinction between a union and an overlap.</p>',
       r'''<h3>Trace the boundary before adding lengths</h3><p>Identify every arc's own centre, radius and angle. Add only exposed boundary pieces; shared joins and construction lines are internal. A circular cut-out removes area but adds an inner boundary to the perimeter when that boundary is included in the question.</p>
       <h3>An annular sector</h3><p>For outer radius R, inner radius r and angle θ with 0&lt;θ&lt;2π,</p>\[A=\frac12(R^2-r^2)\theta,\qquad P=(R+r)\theta+2(R-r).\]<p>There are two arcs and two radial gaps; the gaps are not full radii.</p>
       <h3>Overlap and union are different areas</h3><p>Two intersecting circles can be split along their common chord. Calculate each contributing segment with its own radius and central angle. The overlap is counted once; for a union use</p>\[A_{\rm union}=A_1+A_2-A_{\rm overlap}.\]
       <h3>Check a model against the diagram</h3><p>Use tangency to obtain right angles, positive lengths and permitted angle ranges. Similar figures scale lengths by k and areas by k². A taut rope around a convex bundle has exposed straight tangent pieces and curved contact pieces; interior joins do not count.</p>''',
       r'''<ol><li>Label radii, angles and the actual boundary.</li><li>Break the area into non-overlapping pieces, or subtract an explicitly identified overlap.</li><li>Sum each exposed straight or curved length once.</li><li>Check units, positivity, angle restrictions and all original measurements after solving.</li></ol>''',
       ['Do not count an internal diameter in the outside perimeter.', 'Subtract an overlap once when finding a union.',
        'Different arcs may have different centres and radii.', 'A length scale factor is not the corresponding area scale factor.'],[
       example('Two radii, two arcs and two gaps',r'<p>An annular sector has outer radius 6 cm, inner radius 2 cm and angle 0.7 radians. Find its area and perimeter.</p>'+image('annular-sector','An annular sector with R=6, r=2 and angle 0.7 radians'),
               r'\[A=\frac12(36-4)(0.7)=11.2\text{ cm}^2,\]\[P=(6+2)(0.7)+2(6-2)=13.6\text{ cm}.\]<p>The two straight gaps each have length 4.</p>','CM-ANNULAR'),
       example('A shared edge is not an outside edge',r'<p>A semicircle of radius 3 cm is attached along the 6 cm top edge of a 6 cm by 4 cm rectangle. Find the total area and outside perimeter.</p>'+image('composite-boundary','A semicircle attached to a rectangle, with an internal diameter'),
               r'\[A=24+\frac{9\pi}{2}\text{ cm}^2,\qquad P=6+4+4+3\pi=14+3\pi\text{ cm}.\]<p>The shared diameter is inside the figure and is excluded from the outside perimeter.</p>','CM-SHARED-EDGE'),
       example('An overlap consists of two segments',r'<p>Two circles have radius 4 cm and centres 4 cm apart. Find their overlap area, union area and the external perimeter of the union.</p>'+image('overlapping-circles','Equal circles: the overlap is two minor segments'),
               r'<p>Joining either intersection to both centres gives an equilateral triangle. Each minor central angle is 2π/3. Thus</p>\[A_{\rm overlap}=2\left(\frac{16\pi}{3}-4\sqrt3\right)=\frac{32\pi}{3}-8\sqrt3,\]\[A_{\rm union}=\frac{64\pi}{3}+8\sqrt3.\]<p>The exposed boundary consists of two major arcs, each of angle 4π/3, so \(P_{\rm union}=32\pi/3\) cm.</p>','CM-OVERLAP'),
       example('A rope counts exposed contact arcs',r'<p>Three equal pipes of radius 3 cm touch pairwise. A taut rope of negligible thickness surrounds them. Find its length, then the radius of seven equal pipes held by the same rope in a one-plus-six bundle.</p>',
               r'<p>For three pipes the straight portions total 6r, and the contact arcs together subtend a complete turn. Therefore</p>\[L=6r+2\pi r=18+6\pi.\]<p>For seven pipes, the outer-centre hexagon has perimeter 12ρ and the exposed contact arcs still total 2πρ. Reusing the rope gives</p>\[\rho=\frac{18+6\pi}{12+2\pi}=\frac{3(3+\pi)}{6+\pi}\text{ cm}.\]<p>The centre pipe contributes no exposed boundary.</p>','CM-ROPE')])

def tex(t):return s.latex(s.sympify(str(t),locals={'r':r,'inf':s.oo}))
def field(key,label,kind,expected,**extra):return dict(key=key,label=label,type=kind,expected=str(expected),**extra)
def answers(fields):
    return ''.join('<p>'+f['label']+': '+(f['options'][f['expected']] if f['type']=='choice' else r'\('+tex(f['expected'])+r'\)')+'</p>' for f in fields)
def quick(topic,family,v,title,prompt,fields,solution,model):
    uid=f'M4U-9709-P1-CM-CHECK-{topic.upper()}-{family}-{v}'
    hint={'radians':'Use π radians = 180 degrees; distinguish a triangle angle sum from a complete turn.',
        'arcs':'Use the angle of the required arc in s=rθ, then add only the stated straight boundary.',
        'sectors':'Use A=½r²θ or A=½rs; retain the geometric restrictions when reconstructing.',
        'segments':'Separate the sector and central triangle; a segment perimeter is arc plus chord.',
        'composites':'Trace the external boundary and label each non-overlapping area piece before calculating.'}[topic]
    questions.append(dict(id=uid,family_uid=f'M4U-9709-P1-CM-CHECK-{topic.upper()}-{family}',lesson=topic,title=title,
        collection='short' if v==0 else 'variant',prompt_html=prompt,answer_html=answers(fields),solution_html=solution,
        hint_html='<p>'+hint+'</p>',marks=len(fields),difficulty=2,fields=fields,
        parts=[dict(label='',marking_criteria=[dict(code='B1',marks=1,description_html='Complete correct answer for '+f['label']+'.') for f in fields])],verification=uid))
    models.append(dict(uid=uid,**model))

for v in range(2):
    degree,angle=(150,7*s.pi/4) if v==0 else (210,5*s.pi/3)
    quick('radians',1,v,'Exact conversion in both directions',fr'<p>Convert {degree}° to radians and \({tex(angle)}\) radians to degrees. Give exact answers.</p>',
        [field('radians','First angle in radians','number',degree*s.pi/180),field('degrees','Second angle in degrees','number',angle*180/s.pi)],
        '<p>Multiply degrees by π/180 and radians by 180/π. Keep the exact multiples of π until cancelling.</p>',dict(kind='conversion',degree=degree,angle=str(angle)))
    radius,arc=(8,12) if v==0 else (10,8);theta=s.Rational(arc,radius)
    quick('radians',2,v,'Arc ratio and reflex partner',fr'<p>A minor arc has length {arc} cm on a circle of radius {radius} cm. Find its central angle and the reflex angle between the same radii.</p>',
        [field('minor','Minor angle in radians','number',theta),field('reflex','Reflex angle in radians','number',2*s.pi-theta)],
        fr'<p>The definition gives θ=s/r=\({tex(theta)}\). Subtract it from a complete 2π turn for the reflex partner.</p>',dict(kind='arc_ratio',radius=radius,arc=arc))
    a,b=(s.pi/6,s.pi/4) if v==0 else (s.pi/3,s.pi/5);theta=s.pi-a-b
    quick('radians',3,v,'Complete a triangle angle sum',fr'<p>Two angles of a triangle are \({tex(a)}\) and \({tex(b)}\) radians. Find its third angle, in radians and in degrees.</p>',
        [field('radians','Third angle in radians','number',theta),field('degrees','Third angle in degrees','number',theta*180/s.pi)],
        '<p>Subtract the two angles from π, then convert the remainder to degrees. Do not use a 2π triangle angle sum.</p>',dict(kind='triangle',a=str(a),b=str(b)))
    radius,n=(5,3) if v==0 else (7,4);options={'A':'1°','B':'1 radian','C':r'\(\pi\) radians'} if v==0 else {'A':'1 radian','B':r'\(\pi\) radians','C':'1°'}
    quick('radians',4,v,'Recognise one radian',fr'<p>A circle has radius {radius} cm. An arc of length {radius} cm subtends which angle? What angle is subtended by an arc {n} times as long on this circle?</p>',
        [field('definition','Angle of the first arc','choice','B' if v==0 else 'A',options=options),field('multiple','Angle of the longer arc in radians','number',n)],
        '<p>An arc equal to the radius defines one radian. At fixed radius, multiplying the arc length multiplies its angle by the same factor.</p>',dict(kind='definition',radius=radius,n=n,answer='B' if v==0 else 'A'))

    radius,theta=(7,s.Rational(4,5)) if v==0 else (9,s.Rational(5,6));arc=radius*theta
    quick('arcs',1,v,'Arc length and complete sector perimeter',fr'<p>A sector has radius {radius} cm and angle \({tex(theta)}\) radians. Find its arc length and perimeter exactly.</p>',
        [field('arc','Arc length (cm)','number',arc),field('perimeter','Sector perimeter (cm)','number',2*radius+arc)],
        '<p>Use s=rθ for the curved edge and add both radii for the complete sector perimeter.</p>',dict(kind='arc_perimeter',radius=radius,theta=str(theta)))
    arc,theta=(7*s.pi,7*s.pi/4) if v==0 else (4*s.pi,2*s.pi/3);radius=s.simplify(arc/theta)
    quick('arcs',2,v,'Reverse an exact arc calculation',fr'<p>A sector arc is \({tex(arc)}\) cm long and its angle is \({tex(theta)}\) radians. Find the radius and sector perimeter.</p>',
        [field('radius','Radius (cm)','number',radius),field('perimeter','Sector perimeter (cm)','number',2*radius+arc)],
        '<p>Divide the arc length by its radian angle, then add twice that radius to the arc length.</p>',dict(kind='arc_reconstruct',arc=str(arc),theta=str(theta)))
    radius,theta=(3,s.pi/3) if v==0 else (4,s.pi/2)
    quick('arcs',3,v,'Both arcs between the same endpoints',fr'<p>A circle has radius {radius} cm and minor central angle \({tex(theta)}\). Find the minor and major arc lengths.</p>',
        [field('minor','Minor arc length (cm)','number',radius*theta),field('major','Major arc length (cm)','number',radius*(2*s.pi-theta))],
        '<p>The minor and major angles sum to 2π. The two arc lengths should add to the full circumference.</p>',dict(kind='both_arcs',radius=radius,theta=str(theta)))
    radius,turns=(s.Rational(2,5),s.Rational(15,4)) if v==0 else (s.Rational(3,10),s.Rational(7,3));theta=2*s.pi*turns
    quick('arcs',4,v,'Rolling without slipping',fr'<p>A wheel of radius \({tex(radius)}\) m rolls without slipping through \({tex(turns)}\) turns. Find its accumulated angle in radians and its distance travelled.</p>',
        [field('angle','Accumulated angle in radians','number',theta),field('distance','Distance travelled (m)','number',radius*theta)],
        '<p>Multiply the number of turns by 2π, then multiply that accumulated radian angle by the radius.</p>',dict(kind='rolling',radius=str(radius),turns=str(turns)))

    radius,theta=(6,s.pi/3) if v==0 else (5,4*s.pi/5)
    quick('sectors',1,v,'Sector area and arc length',fr'<p>A sector has radius {radius} cm and angle \({tex(theta)}\). Find its area and arc length exactly.</p>',
        [field('area','Sector area (cm²)','number',s.Rational(radius**2,2)*theta),field('arc','Arc length (cm)','number',radius*theta)],
        '<p>The area is ½r²θ, whereas the arc length is rθ. Keep the squared and unsquared lengths distinct.</p>',dict(kind='sector_area',radius=radius,theta=str(theta)))
    area,theta=(16*s.pi,s.pi/2) if v==0 else (15*s.pi,5*s.pi/6);radius=s.sqrt(2*area/theta)
    quick('sectors',2,v,'An exact radius from area and angle',fr'<p>A sector has area \({tex(area)}\) cm² and angle \({tex(theta)}\). Find its radius and perimeter exactly.</p>',
        [field('radius','Radius (cm)','number',radius),field('perimeter','Sector perimeter (cm)','number',2*radius+radius*theta)],
        '<p>Find r²=2A/θ and choose the positive radius. Then use 2r+rθ for the perimeter.</p>',dict(kind='area_reconstruct',area=str(area),theta=str(theta)))
    arc,area=(12,30) if v==0 else (9,27);radius=s.Rational(2*area,arc);theta=arc/radius
    quick('sectors',3,v,'Reconstruct from two measurements',fr'<p>A sector has arc length {arc} cm and area {area} cm². Find its radius, angle and perimeter.</p>',
        [field('radius','Radius (cm)','number',radius),field('angle','Angle in radians','number',theta),field('perimeter','Sector perimeter (cm)','number',2*radius+arc)],
        '<p>Combine A=½rs with s=rθ. Recover the radius first, then the angle and the complete boundary.</p>',dict(kind='two_measurements',arc=arc,area=area))
    P=24+4*v;radius=s.Rational(P,4);area=s.Rational(P**2,16);poly=P*r/2-r*r
    quick('sectors',4,v,'A fixed-perimeter area model',fr'<p>A sector has perimeter {P} cm and 0&lt;θ&lt;2π. Give its area as a polynomial in radius r, then find the radius, angle and area at its maximum.</p>',
        [field('model','Area expression in r','polynomial',s.expand(poly),variables=['r']),field('radius','Radius at the maximum (cm)','number',radius),field('angle','Angle at the maximum in radians','number',2),field('area','Maximum area (cm²)','number',area)],
        fr'\[A={P//2}r-r^2={tex(area)}-(r-{tex(radius)})^2.\]<p>The maximum is attained at the stated radius; its angle is 2 radians, within the allowed range.</p>',dict(kind='maximum',P=P))

    radius,theta=(4,s.pi/3) if v==0 else (6,s.pi/2);chord=2*radius*s.sin(theta/2);area=s.Rational(radius**2,2)*(theta-s.sin(theta))
    quick('segments',1,v,'A minor segment has an arc and a chord',fr'<p>A circle has radius {radius} cm and minor central angle \({tex(theta)}\). Find the exact area and perimeter of the minor segment.</p>',
        [field('area','Minor segment area (cm²)','number',area),field('perimeter','Minor segment perimeter (cm)','number',radius*theta+chord)],
        '<p>Subtract the central triangle from the sector for area. For perimeter add the chord, not the two radii, to the minor arc.</p>',dict(kind='minor_segment',radius=radius,theta=str(theta)))
    radius=7+2*v;theta=s.pi/3;area=s.Rational(radius**2,2)*(theta-s.sqrt(3)/2)
    quick('segments',2,v,'A chord equal to the radius',fr'<p>A circle has radius {radius} cm and chord length {radius} cm. Find the minor central angle and exact minor segment area.</p>',
        [field('angle','Minor central angle in radians','number',theta),field('area','Minor segment area (cm²)','number',area)],
        '<p>The central triangle is equilateral, giving θ=π/3. Its area must be subtracted from the sector.</p>',dict(kind='equal_chord',radius=radius))
    radius,theta=(3,s.pi/2) if v==0 else (4,2*s.pi/3);area=s.pi*radius**2-s.Rational(radius**2,2)*(theta-s.sin(theta));chord=2*radius*s.sin(theta/2)
    quick('segments',3,v,'Choose the major segment',fr'<p>A circle has radius {radius} cm and minor central angle \({tex(theta)}\). Find the exact major segment area and perimeter.</p>',
        [field('area','Major segment area (cm²)','number',area),field('perimeter','Major segment perimeter (cm)','number',radius*(2*s.pi-theta)+chord)],
        '<p>Subtract the minor segment from the circle area. Use the major arc and the same chord for the major segment perimeter.</p>',dict(kind='major_segment',radius=radius,theta=str(theta)))
    radius,theta=(8,s.pi/3) if v==0 else (5,s.pi/2);chord=2*radius*s.sin(theta/2);arc=radius*theta
    quick('segments',4,v,'Identify all boundary pieces',fr'<p>For radius {radius} cm and minor angle \({tex(theta)}\), give the chord length, minor arc length and minor segment perimeter.</p>',
        [field('chord','Chord length (cm)','number',chord),field('arc','Minor arc length (cm)','number',arc),field('perimeter','Minor segment perimeter (cm)','number',arc+chord)],
        '<p>Use c=2r sin(θ/2) and s=rθ; the two resulting lengths together form the segment boundary.</p>',dict(kind='segment_boundary',radius=radius,theta=str(theta)))

    R,inner,theta=(7,3,s.pi/3) if v==0 else (8,2,s.pi/2)
    quick('composites',1,v,'Both arcs of an annular sector',fr'<p>An annular sector has outer radius {R} cm, inner radius {inner} cm and angle \({tex(theta)}\). Find its exact area and total perimeter.</p>',
        [field('area','Annular sector area (cm²)','number',s.Rational(R*R-inner*inner,2)*theta),field('perimeter','Annular sector perimeter (cm)','number',(R+inner)*theta+2*(R-inner))],
        '<p>Subtract the sector areas. Its boundary has an outer arc, an inner arc and two radial gaps of length R−r.</p>',dict(kind='annulus',R=R,inner=inner,theta=str(theta)))
    radius,h=(3,5) if v==0 else (4,3)
    quick('composites',2,v,'Exclude a shared diameter',fr'<p>A semicircle of radius {radius} cm is attached along the full top edge of a rectangle of width {2*radius} cm and height {h} cm. Find the total area and outside perimeter.</p>',
        [field('area','Total area (cm²)','number',2*radius*h+s.pi*radius**2/2),field('perimeter','Outside perimeter (cm)','number',2*radius+2*h+s.pi*radius)],
        '<p>Add the two areas. The outside boundary has the bottom edge, two vertical edges and a semicircular arc; the common diameter is internal.</p>',dict(kind='rectangle_semicircle',radius=radius,h=h))
    radius=3+2*v;lens=radius**2*(2*s.pi/3-s.sqrt(3)/2);union=2*s.pi*radius**2-lens
    quick('composites',3,v,'Overlap, union and external boundary',fr'<p>Two circles have radius {radius} cm and centres {radius} cm apart. Find their exact overlap area, union area and external union perimeter.</p>',
        [field('overlap','Overlap area (cm²)','number',lens),field('union','Union area (cm²)','number',union),field('perimeter','External union perimeter (cm)','number',8*s.pi*radius/3)],
        '<p>The overlap consists of two minor segments of angle 2π/3. Subtract it once from the sum of the circle areas. Two exposed major arcs give the external boundary.</p>',dict(kind='overlap',radius=radius))
    radius=2+v
    quick('composites',4,v,'A rope follows the outside only',fr'<p>Equal pipes each have radius {radius} cm. Find the exact taut-rope lengths around a touching three-pipe triangular bundle and a touching seven-pipe bundle with one pipe at the centre. Rope thickness is negligible; the same pipe radius is used in both bundles.</p>',
        [field('three','Three-pipe rope length (cm)','number',6*radius+2*s.pi*radius),field('seven','Seven-pipe rope length (cm)','number',12*radius+2*s.pi*radius)],
        '<p>The straight parts total 6r or 12r respectively; in each case the exposed curved contacts together have length 2πr. Interior pipes add no exposed boundary.</p>',dict(kind='rope',radius=radius))
