"""Create the 0606 circular measure chapter and worked question bank."""

from fractions import Fraction as F
from math import cos, pi, sin
from prepare_0606_geometry_and_logs_support import (
    Lesson, Section, build, coefficient_pi, field, figure, figure_html, label, m, part, path, problem, tex,
)


SLUG="circular-measure"
DEGREES=(24,30,45,60,72,90,108,120,135,144,150,165,210,225,270,315)
DIAGRAMS={}


def data(i):
    return i%17+2,(i//17)%15+2,(i//255)%19+2


def pi_pair(v):
    return coefficient_pi(v),f"({v})*pi"


def surd_pair(v,d):
    expr=tex(v) if d==1 else ("" if v==1 else tex(v))+rf"\sqrt{{{d}}}"
    raw=str(v) if d==1 else f"({v})*sqrt({d})"
    return expr,raw


def mixed(rational,root_factor=0,root=1,pi_factor=0):
    terms=[]
    for c,sym in ((rational,tex),(root_factor,lambda n:surd_pair(n,root)[0]),(pi_factor,coefficient_pi)):
        if c:
            sign="-" if c<0 else "+" if terms else ""
            terms.append(sign+sym(abs(c)))
    expr="".join(terms) or "0"
    raw=f"({rational})+({root_factor})*sqrt({root})+({pi_factor})*pi"
    return expr,raw


def sum_surd_pi(pi_factor,root_factor,root):
    h,r=pi_pair(pi_factor)
    t,s=surd_pair(abs(root_factor),root)
    sign="+" if root_factor>0 else "-"
    return h+sign+t,f"{r}{sign}({s})"


def exact(prompt,pair,units,explain,criterion,name="Exact value",**kwargs):
    tex_,key=pair
    answer=f"{m(tex_)} {units}." if units else m(tex_)
    return part(prompt,answer,explain,criterion,field(key,label=name),**kwargs)


def degrees(i,mode=0):
    p,q,r=data(i)
    # Vary the angle and radius independently across the practice families.
    D=DEGREES[(i % 16 + i//17) % len(DEGREES)]
    radius=p+q+r
    angle=F(D,180)
    other=2-angle
    dtext=m(str(D)+r"^\circ")
    if mode==0:
        statement=f"A scanner arm of length {m(radius)} cm rotates about one end through {dtext}."
        measure=exact("Convert the rotation to radians.",pi_pair(angle),"rad",
            [f"One half-turn is {m(r'180^\circ=\pi\text{ rad}')}. Multiply {dtext} by {m(r'\frac{\pi}{180}')}, then simplify."],
            "Multiply the number of degrees by π divided by 180.","Angle in radians")
    elif mode==1:
        statement=f"A marker on the rim of a disc of radius {m(radius)} cm turns through {m(coefficient_pi(angle))} radians."
        measure=exact("Give the angle in degrees.",(str(D),str(D)),"°",
            [f"Multiply the radian measure by {m(r'\frac{180}{\pi}')}. The factor of {m(r'\pi')} cancels."],
            "Use 180 degrees per π radians.","Angle in degrees")
    else:
        repeats=1+(q%5)
        statement=f"A control knob of radius {m(radius)} cm turns through {dtext} at each of {m(repeats)} identical movements in the same direction."
        measure=exact("Find the total angle turned, in radians.",pi_pair(repeats*angle),"rad",
            [f"The total before any reduction is {m(repeats*D)} degrees. Convert this by multiplying by {m(r'\frac{\pi}{180}')}."],
            "Add the turns before converting the total to radians.","Total angle")
        return problem("Tracking repeated rotations",statement,measure,
            exact("Find the total distance moved by a point on the rim.",pi_pair(radius*repeats*angle),"cm",
                [f"The point travels the arc for each movement, including any complete turns.",
                 f"Multiply the total angle in radians by {m(radius)}."],"Use the total radian rotation in s = rθ.","Distance"),
            exact("Find the least non-negative angle giving the same final direction, in radians.",pi_pair(repeats*angle%2),"rad",
                [f"Each whole turn is {m(r'2\pi')}. Remove {m((repeats*D)//360)} complete turns."],
                "Subtract complete revolutions from the total rotation.","Remaining rotation"))
    return problem("Measuring a turn in two units",statement,measure,
        exact("Find the exact length of the arc traced on the rim.",pi_pair(radius*angle),"cm",
            [f"Use the angle in radians in {m(r's=r\theta')}. The radius is {m(radius)} cm."],
            "Multiply the radius by the radian angle.","Arc length"),
        exact("Find the angle in radians for the rest of the full circle.",pi_pair(other),"rad",
            [f"A complete turn is {m(r'2\pi')}. Subtract the given angle from this total."],
            "Subtract the given angle from 2π.","Remaining angle"))


def arc(i,mode=0):
    p,q,t=data(i)
    R=p+q
    angle=F(DEGREES[(i+t*5)%len(DEGREES)],180)
    s=R*angle
    L=4+q
    if mode==2:
        other=R+t
        theta2=s/other
        return problem("The same arc length on different circles",
            f"A sector of radius {m(R)} cm has angle {m(coefficient_pi(angle))} radians. A second circle of radius {m(other)} cm has an arc of equal length.",
            exact("Find the angle subtended by the arc on the second circle.",pi_pair(theta2),"rad",
                  [f"The common arc length is {m(coefficient_pi(s))} cm.",f"Divide it by the second radius, {m(other)} cm."],
                  "Find the common arc length and divide by the second radius.","Second angle",
                  intermediate=("Use the equality of the two arc lengths.",)),
            exact("Find the perimeter of the sector associated with the second arc.",mixed(2*other,pi_factor=s),"cm",
                  ["The sector edge uses the given arc and the two new radii."],"Add the two radii to the arc length.","Second sector perimeter"),
            part("Explain why the angle is smaller on the second circle.","For a fixed arc length, the angle is inversely proportional to radius.",
                 [f"With {m('s')} fixed, {m(r'\theta=s/r')} decreases as the radius increases."],"Compare the radii using the relationship between s and θ.",fact=True))
    description=f"A curved edge joins the ends of two {m(R)} cm radii. The angle at the centre is {m(coefficient_pi(angle))} radians."
    first=exact("Find the length of the curved edge.",pi_pair(s),"cm",
        [f"Multiply the radius {m(R)} by the given radian angle."],"Use s = rθ.","Arc length")
    if mode==1:
        text_,_=mixed(2*R,pi_factor=s)
        description=f"A complete sector boundary of radius {m(R)} cm has perimeter {m(text_)} cm."
        first=exact("Find the exact angle at the centre, in radians.",pi_pair(angle),"rad",
            [f"The radii contribute {m(2*R)} cm to the perimeter. The arc therefore has length {m(coefficient_pi(s))} cm.",
             f"Divide the arc length by {m(R)}."],"Subtract both radii and then use the arc length formula.","Sector angle")
    return problem("From an arc to the whole sector edge",description,first,
        exact("Find the length of the remaining arc of the same circle.",pi_pair(R*(2-angle)),"cm",
            [f"The remaining sector angle is {m(coefficient_pi(2-angle))} radians.",
             f"Keep the centre and radius fixed as you use {m(r's=r\theta')} again."],
            "Subtract from a full circle and use the same radius.","Remaining arc"),
        exact(f"Find the perimeter of a sector with the original angle and a radius {m(L)} cm longer.",mixed(2*(R+L),pi_factor=(R+L)*angle),"cm",
            [f"The larger sector has radius {m(R+L)} cm and still subtends the original angle.",
             "Add both new radial sides and its longer arc."],"Use the unchanged angle and substitute the new radius into each boundary length.","Larger perimeter"))


def sector_area(i,mode=0):
    p,q,t=data(i)
    R=2*p+t
    angle=F(DEGREES[(i+(q%7))%16],180)
    s=R*angle
    A=F(1,2)*R*s
    if mode==0:
        statement=f"A sector has radius {m(R)} cm and angle {m(coefficient_pi(angle))} radians."
        first=exact("Find the exact area of the sector.",pi_pair(A),"cm²",
            [f"A fraction {m(tex(angle/2))} of the complete circle is used.",
             f"Equivalently, replace the radius and radian angle in {m(r'A=\frac{1}{2}r^2\theta')}."],
            "Use half the radius squared times the radian angle.","Area")
    elif mode==1:
        statement=f"A circular sector has area {m(coefficient_pi(A))} cm² and angle {m(coefficient_pi(angle))} radians."
        first=exact("Find the radius of the circle.",(str(R),str(R)),"cm",
            [f"Rearrange {m(r'A=\frac{1}{2}r^2\theta')} to give {m(r'r^2=\frac{2A}{\theta}')}.",
             f"The factors of pi cancel to give {m('r^2='+str(R*R))}. Choose the positive radius."],
            "Isolate the square of the radius and take the positive square root.","Radius")
    else:
        statement=f"The curved boundary of a sector is {m(coefficient_pi(s))} cm long. Its area is {m(coefficient_pi(A))} cm²."
        first=exact("Find the radius of the sector.",(str(R),str(R)),"cm",
            [f"Replace {m(r'r\theta')} by {m('s')} in {m(r'A=\frac{1}{2}r^2\theta')}. Then {m(r'r=\frac{2A}{s}')}.",
             f"Divide twice the area by the given arc length to obtain {m(R)} cm."],
            "Combine the area and arc formulae to eliminate the angle.","Radius",
            intermediate=("Rearrange the resulting area formula to isolate the radius.",))
    return problem("Using arc, area and radius together",statement,first,
        exact("Find the exact perimeter of the sector.",mixed(2*R,pi_factor=s),"cm",
            [f"The arc is {m(coefficient_pi(s))} cm and the two radial sides total {m(2*R)} cm."],
            "Add the two radii to the arc length.","Sector perimeter"),
        exact(f"Find the exact area of a sector with the same angle and twice the radius.",pi_pair(4*A),"cm²",
            ["The angle stays unchanged. Doubling the radius multiplies its square by four."],
            "Scale the area by the square of the radius factor.","New area"))


def trig_data(i):
    p,q,t=data(i)
    R=p+q+t
    # angle / π, sin(angle), 2 sin(angle / 2) as exact radical multiples.
    cases=((F(1,3),F(1,2),3,1,1),(F(1,2),1,1,1,2),(F(2,3),F(1,2),3,1,3))
    ang,s_a,s_d,c_a,c_d=cases[(i//8)%len(cases)]
    return R,ang,s_a,s_d,c_a,c_d


def segment(i,mode=0):
    R,angle,sin_a,sin_d,chord_a,chord_d=trig_data(i)
    tri=F(1,2)*R*R*sin_a
    sector=F(1,2)*R*R*angle
    c0=chord_a*R
    segment_minor=sum_surd_pi(sector,-tri,sin_d)
    segment_major=sum_surd_pi(R*R-sector,tri,sin_d)
    chord=surd_pair(c0,chord_d)
    t=surd_pair(tri,sin_d)
    side="larger" if mode==2 else "smaller"
    statement=f"A chord {m('AB')} of a circle of radius {m(R)} cm subtends a smaller angle of {m(coefficient_pi(angle))} radians at the centre {m('O')}."
    chord_part=exact(f"Find the exact length of {m('AB')}.",chord,"cm",
        [f"Bisect the isosceles triangle {m('AOB')}. Each half has hypotenuse {m(R)} and opposite angle {m(coefficient_pi(angle/2))}.",
         f"The whole chord length is {m('2r'+r'\sin(\theta/2)')}."],"Find half the chord in the right triangle, then double it.","Chord length")
    area_t=exact(f"Find the exact area of triangle {m('AOB')}.",t,"cm²",
        [f"Both enclosing sides of the triangle have length {m(R)} cm.",
         f"Use {m(r'\frac{1}{2}r^2\sin\theta')} with the included angle."],"Use the area formula with the included angle.","Triangle area")
    area_s=exact(f"Find the area of the {side} circular segment, giving your answer exactly.",
        segment_major if mode==2 else segment_minor,"cm²",
        ([f"Find the smaller segment by subtracting the triangle area {m(t[0])} from the smaller sector area {m(coefficient_pi(sector))}.",
          "Subtract the smaller segment area from the full disc."] if mode==2 else
         [f"The smaller sector has area {m(coefficient_pi(sector))} cm².",
          f"The triangle contributes {m(t[0])} cm². The segment is the sector with that triangle removed."]),
        "Combine the sector and triangle areas in the relevant arrangement.","Segment area",
        intermediate=("Identify the appropriate sector area before subtracting.",))
    arc_coeff=R*((2-angle) if mode==2 else angle)
    perimeter=exact(f"Find the perimeter of the {side} segment, exactly.",sum_surd_pi(arc_coeff,c0,chord_d),"cm",
        [f"The arc has length {m(coefficient_pi(arc_coeff))} cm. The straight edge is the chord of length {m(chord[0])} cm."],
        "Use the appropriate arc, then add the chord once.","Segment perimeter")
    parts=(chord_part,area_t,area_s) if mode==0 else (area_s,chord_part,perimeter)
    # Include a consistent shape with a generic minor central angle. Its labels match A, B and O.
    extras=figure_html(DIAGRAMS["chord"]) if DIAGRAMS else ""
    return problem("The region cut off by a chord",statement,*parts,figure_html=extras)


def ring(i,mode=0):
    p,q,t=data(i)
    r=p+t
    W=q+1
    R=r+W
    angle=F(DEGREES[(i+t)%12],180)
    area=F(1,2)*angle*(R*R-r*r)
    perimeter=mixed(2*W,pi_factor=(R+r)*angle)
    if mode==1:
        statement=f"A ring sector has width {m(W)} cm, central angle {m(coefficient_pi(angle))} radians and area {m(coefficient_pi(area))} cm². Its two arcs have the same centre."
        first=exact("Find the inner radius.",(str(r),str(r)),"cm",
             [f"Write the outer radius as {m('r+'+str(W))}. The difference of the squared radii is {m(str(W)+'(2r+'+str(W)+')')}.",
              f"Divide the given area by half the central angle to get {m(R*R-r*r)}. Solve the resulting linear equation."],
             "Use the difference of the sector areas, with both radii expressed using the same unknown.","Inner radius",
             intermediate=("Factor the difference of the squares to obtain a linear equation in r.",))
    elif mode==2:
        statement=f"A ring sector has inner radius {m(r)} cm and outer radius {m(R)} cm. Its total perimeter is {m(perimeter[0])} cm."
        first=exact("Find its angle at the common centre.",pi_pair(angle),"rad",
            [f"Subtract the two connecting edges, totalling {m(2*W)} cm. The arc sum is {m(coefficient_pi((R+r)*angle))} cm.",
             f"Divide the arc sum by the sum of the radii {m(R+r)} cm."],
            "Remove both straight edges and use the two arc lengths with one common angle.","Central angle")
    else:
        statement=f"A ring sector lies between radii {m(r)} cm and {m(R)} cm, with central angle {m(coefficient_pi(angle))} radians."
        first=exact("Find the exact area of the ring sector.",pi_pair(area),"cm²",
            [f"The sectors have the same angle. Subtract the smaller one, using {m(r'A=\frac{1}{2}\theta(R^2-r^2)')} for their difference."],
            "Subtract the inner sector's area from the outer sector's area.","Ring area")
    second=(exact("Find the exact area of the ring sector.",pi_pair(area),"cm²",
             [f"Use the difference of the two sector areas with angle {m(coefficient_pi(angle))} radians."],
             "Subtract the two sectors' areas.","Ring area") if mode==2 else
            exact("Find the exact perimeter of the ring sector.",perimeter,"cm",
             [f"The outer and inner arcs total {m(coefficient_pi((R+r)*angle))} cm.",
              f"Each straight edge has length {m(W)} cm."],
             "Add two arcs and two straight edges.","Ring perimeter"))
    third=exact("Find the exact difference between the lengths of the two arcs.",pi_pair(W*angle),"cm",
        [f"The shared angle is {m(coefficient_pi(angle))} radians. The two radii differ by {m(W)} cm."],
        "Multiply the common angle by the radial difference.","Arc length difference")
    return problem("A ring sector with concentric arcs",statement,first,second,third,
        figure_html=figure_html(DIAGRAMS["ring"]) if DIAGRAMS else "")


def boundaries(i,mode=0):
    p,q,t=data(i)
    R=p+t
    a,b=R+q,2*R+t
    if mode==0:
        P=mixed(2*a,pi_factor=2*R)
        A=mixed(2*R*a,pi_factor=R*R)
        statement=f"A running track consists of a rectangle of straight length {m(a)} m and width {m(2*R)} m, with a semicircle added to each shorter edge."
        first=exact("Find the exact outer perimeter.",P,"m",
            [f"The two straight parts have total length {m(2*a)} m. Together the two semicircles contribute the circumference of a circle of radius {m(R)} m."],
            "Add the two straight sides and the equivalent complete circumference.","Outer perimeter")
        second=exact("Find the exact area enclosed.",A,"m²",
            [f"The rectangular area is {m(2*R*a)} m². Combine the two semicircular areas into {m(coefficient_pi(R*R))} m²."],
            "Add the area of the rectangle and the equivalent area of the disc.","Enclosed area")
        third=part("Find the exact increase in area if each straight section is lengthened by 4 m with the same width.",
             f"{m(8*R)} m².",["The two semicircles are unchanged. A rectangular strip 4 m long is added."],"Multiply the added length by the width.")
    elif mode==1:
        P=mixed(2*(a+b-R),pi_factor=F(R,2))
        A=mixed(a*b,pi_factor=-F(R*R,4))
        statement=f"A rectangle is {m(a)} cm by {m(b)} cm. A quadrant of radius {m(R)} cm is cut from one corner, with the centre at the corner."
        first=exact("Find the exact area of the remaining shape.",A,"cm²",
            [f"Take a quarter of the disc area {m(coefficient_pi(R*R))} cm² from the original rectangular area {m(a*b)} cm²."],
            "Subtract the quadrant area from the rectangle.","Remaining area")
        second=exact("Find the exact perimeter of the remaining shape.",P,"cm",
            [f"Removing the corner takes {m(R)} cm from each of two adjacent edges.",
             f"The curved edge adds a quarter of the original circle's circumference, {m(coefficient_pi(F(R,2)))} cm."],
            "Subtract the two removed portions and include the new arc.","Remaining perimeter",
            intermediate=("Use the arc formula with a right-angle turn.",))
        third=exact("Find the exact change in perimeter, as a positive decrease.",mixed(2*R,pi_factor=-F(R,2)),"cm",
            ["Subtract the new arc length from the two removed straight portions."],
            "Compare only the changed lengths.","Perimeter decrease")
    else:
        # A half-disc is added on the long side of a rectangle of width 2R.
        A=mixed(2*R*a,pi_factor=F(R*R,2))
        P=mixed(2*a+2*R,pi_factor=R)
        statement=f"A window is a rectangle of width {m(2*R)} cm topped by a semicircle with that same width as its diameter. Its area is {m(A[0])} cm²."
        first=exact("Find the height of the rectangular part.",(str(a),str(a)),"cm",
            [f"Subtract the semicircle area {m(coefficient_pi(F(R*R,2)))} cm².",
             f"The rectangular area is {m(a*2*R)} cm². Divide by width {m(2*R)} cm."],
            "Remove the semicircular area and divide the rectangle area by its width.","Rectangle height")
        second=exact("Find the exact length of the outside edge.",P,"cm",
            [f"Count the lower width, two upright sides and the semicircular arc.",
             "The diameter of the semicircle is shared with the rectangle and lies inside the window."],
            "Use only the edges visible from outside.","Outer perimeter")
        third=exact("Find the overall height.",(str(a+R),str(a+R)),"cm",
            [f"The semicircle rises by one radius, {m(R)} cm, above the rectangular part."],
            "Add the radius to the rectangular height.","Total height")
    return problem("Follow the outer boundary",statement,first,second,third)


def tangent_region(i):
    p,q,t=data(i)
    R=p+q+t
    angle,ta,td=((F(1,3),F(1,3),3),(F(1,2),1,1),(F(2,3),1,3))[(i//14)%3]
    stated=f"A circle has centre {m('O')} and radius {m(R)} cm. The tangents at {m('A')} and {m('B')} meet at {m('T')}. The smaller angle {m('AOB')} is {m(coefficient_pi(angle))} radians."
    length=surd_pair(R*ta,td)
    kite=surd_pair(R*R*ta,td)
    area=F(1,2)*R*R*angle
    pos=surd_pair(R*R*ta,td)
    gap=(pos[0]+"-"+coefficient_pi(area),pos[1]+f"-({area})*pi")
    return problem("The gap between two tangents and an arc",stated,
        exact(f"Find the exact length of {m('AT')}.",length,"cm",
            [f"The radius meets the tangent at a right angle. The line {m('OT')} bisects angle {m('AOB')} because the two right triangles have a common hypotenuse and equal radii.",
             f"Use {m(r'AT=r\tan(\theta/2)')}."],
            "Use the half-angle in the right triangle.","Tangent length",
            intermediate=("Identify which side is opposite the half-angle.",)),
        exact(f"Find the exact area of quadrilateral {m('OATB')}.",kite,"cm²",
            [f"Its two congruent right triangles each have area {m(r'\frac12 r\cdot AT')}. Add them."],
            "Double the right triangle area.","Quadrilateral area"),
        exact(f"Find the exact area bounded by the two tangent segments and the minor arc {m('AB')}.",gap,"cm²",
             [f"The minor sector uses angle {m(coefficient_pi(angle))} and has area {m(coefficient_pi(area))} cm².",
              "Subtract this sector from the full quadrilateral."],
             "Subtract the minor sector from the kite formed by radii and tangents.","Gap area",
             intermediate=("Use the minor angle in the sector area formula.",)),
        figure_html=figure_html(DIAGRAMS["tangents"]) if DIAGRAMS else "")


def overlap(i):
    p,q,t=data(i)
    R=p+q+t
    r2=R*R
    return problem("Two equal circles and their shared region",
        f"Two circles have equal radius {m(R)} cm. Each centre lies on the other circle. The common chord has endpoints {m('A')} and {m('B')}.",
        exact("Find the angle subtended by the shorter arc AB at either centre.",pi_pair(F(2,3)),"rad",
            [f"Join the two centres to {m('A')} and to {m('B')}. This forms an equilateral triangle on each side of the centre line.",
             f"Each gives {m(coefficient_pi(F(1,3)))} radians at a centre. Add the two angles."],
            "Use the two equilateral triangles to get the sector angle.","Angle at either centre"),
        exact("Find the exact perimeter of the region inside both circles.",pi_pair(F(4*R,3)),"cm",
            [f"Each boundary arc has length {m(coefficient_pi(F(2*R,3)))} cm. The complete outline has two such arcs."],
            "Use the two arc lengths.","Overlap perimeter"),
        exact("Find the exact area of the region inside both circles.",sum_surd_pi(F(2*r2,3),-F(r2,2),3),"cm²",
            [f"Each half of the lens is a minor segment with sector area {m(coefficient_pi(F(r2,3)))} cm².",
             f"The triangle for each segment contributes {m(surd_pair(F(r2,4),3)[0])} cm².",
             "Subtract one triangle from each sector and add the two identical segments."],
            "Use two equal circular segments to find the overlap.","Overlap area",
            intermediate=("Find one segment by subtracting the correct triangle.",)),
        figure_html=figure_html(DIAGRAMS["overlap"]) if DIAGRAMS else "")


def reverse_boundary(i):
    p,q,t=data(i)
    R=p+t
    angle=F(DEGREES[(q+i)%16],180)
    arc_boundary=R*angle
    A=F(1,2)*R*R*angle
    P=mixed(2*R,pi_factor=arc_boundary)
    x=F(5*R,4)
    return problem("Change the radius and keep the area fixed",
        f"The perimeter of a sector with radius {m(R)} cm is {m(P[0])} cm. A second sector has the same area but radius {m(tex(x))} cm.",
        exact("Find the exact central angle of the first sector.",pi_pair(angle),"rad",
            [f"The curved edge has length {m(coefficient_pi(arc_boundary))} cm after removing both radial sides.",
             f"Divide this arc length by the original radius {m(R)} cm."],
            "Separate the perimeter into straight and curved lengths.","Original central angle"),
        exact("Find the exact area of either sector.",pi_pair(A),"cm²",
            ["Use the angle and radius of the original sector. The area is preserved by the change."],
            "Use the first sector's radius and angle in the area formula.","Common area"),
        exact("Find the exact angle of the second sector.",pi_pair(angle*F(16,25)),"rad",
            [f"The second squared radius is {m(tex(F(25,16)))} times the first.",
             f"To keep {m(r'r^2\theta')} fixed, multiply the first angle by {m(tex(F(16,25)))}."],
            "Use inverse square scaling for a fixed sector area.","New central angle"))


def arc_points(cx,cy,r,a,b,n=60):
    return [(cx+r*cos(a+(b-a)*k/n),cy-r*sin(a+(b-a)*k/n)) for k in range(n+1)]


def circle_dot(x,y,text,dx=0,dy=-12):
    return f'<circle cx="{x:.2f}" cy="{y:.2f}" r="3.5" fill="#173d59"/>'+label(x+dx,y+dy,text)


def drawings():
    cx,cy=135,181
    a,b=pi/12,5*pi/12
    O=(cx,cy)
    outer=arc_points(cx,cy,135,a,b)
    inner=arc_points(cx,cy,83,a,b)
    ends=(outer[0],outer[-1])
    core=path([O,*outer],"#1a6c55",fill="#e2f4e9",closed=True)+path(arc_points(cx,cy,34,a,b),"#ba6329",width=1.6)
    core+=circle_dot(*O,"O",dx=-10,dy=17)+circle_dot(*ends[0],"A",dx=15,dy=3)+circle_dot(*ends[1],"B",dy=-10)
    core+=label(214,117,"arc",colour="#1a6c55")+label(169,151,"θ",colour="#9b5221")+label(204,173,"r")
    DIAGRAMS["sector"]=figure(SLUG,"sector","Sector AOB with central angle theta, radius r and an arc",core,
        "Only the arc follows the circular boundary. The straight sides are the two radii.")
    shade=path(outer,"#1a6c55",fill="#dcf0e6",closed=True)
    chord=shade+path([O,outer[0],outer[-1],O],"#2b6094",width=1.8)
    chord+=circle_dot(*O,"O",dx=-10,dy=17)+circle_dot(*ends[0],"A",dx=15,dy=3)+circle_dot(*ends[1],"B",dy=-10)
    DIAGRAMS["chord"]=figure(SLUG,"chord-segment","A chord AB and the shaded minor segment between the chord and arc",chord,
        "The segment is the thin region between the arc and the chord. Diagram not to scale.")
    ring=path(outer+list(reversed(inner)),"#167052",fill="#daf1e7",closed=True)
    ring+=path([outer[0],O,outer[-1]],"#526887",width=1.3,dash="5 4")
    ring+=circle_dot(*O,"O",dx=-11,dy=17)+label(239,114,"outer arc",colour="#1a6c55")+label(174,130,"inner arc",colour="#1a6c55")
    DIAGRAMS["ring"]=figure(SLUG,"ring-sector","Two concentric arcs joined by two straight edges",ring,
        "Follow both arcs and both short straight links to trace the entire boundary. Diagram not to scale.")
    O=(108,110);r=73; a0,b0=-pi/4,pi/4
    arc=arc_points(*O,r,a0,b0)
    T=(O[0]+r/cos(pi/4),O[1]); B=arc[0]; A=arc[-1]
    tangent_art=path(arc+[T],"#9b5221",fill="#fde9d8",closed=True)
    tangent_art+=path(arc_points(*O,r,0,2*pi,108),"#1a6c55")+path([A,O,B],"#305c91",width=1.8)
    tangent_art+=path([O,T],"#556b89",width=1.45,dash="5 4")
    tangent_art+=circle_dot(*O,"O",dx=-12,dy=16)+circle_dot(*A,"A",dy=-11)+circle_dot(*B,"B",dy=19)+circle_dot(*T,"T",dx=12,dy=4)
    DIAGRAMS["tangents"]=figure(SLUG,"tangent-gap","Two tangents from T and the shaded gap between them and the minor arc AB",tangent_art,
        "The gap lies outside the circle but inside quadrilateral OATB. Diagram not to scale.")
    C1=(137,110);C2=(221,110);radius=84
    first=arc_points(*C1,radius,-pi/3,pi/3)
    second=arc_points(*C2,radius,2*pi/3,4*pi/3)
    overlap_art=path(first+second,"#167352",fill="#cceadb",closed=True)
    overlap_art+=path(arc_points(*C1,radius,0,2*pi,108),"#17634c")+path(arc_points(*C2,radius,0,2*pi,108),"#285892")
    overlap_art+=path([first[0],first[-1]],"#9b5221",width=1.65,dash="5 4")
    overlap_art+=circle_dot(*C1,"C₁",dx=-6,dy=20)+circle_dot(*C2,"C₂",dx=6,dy=20)
    overlap_art+=circle_dot(*first[-1],"A")+circle_dot(*first[0],"B",dy=21)
    DIAGRAMS["overlap"]=figure(SLUG,"lens","Two equal circles with common chord AB and shaded region inside both circles",overlap_art,
        "The lens is two segments. Their straight chords cancel from the outer boundary.")


def lessons():
    drawings()
    S=DIAGRAMS["sector"]
    C=DIAGRAMS["chord"]
    G=DIAGRAMS["ring"]
    T=DIAGRAMS["tangents"]
    L=DIAGRAMS["overlap"]
    return (
        Lesson("angles-in-radians","Angles in radians","Move between degrees, radians and numbers of turns.",
            (
                Section("units","What does one radian measure?","Measure the short curved distance between the radii. If that distance equals the radius, the central angle is one radian.",
                    f"The fraction of one revolution is {m(r'\frac{\theta}{2\pi}')}. A half-turn is {m(r'\pi\text{ rad}=180^\circ')}.",
                    "Radians measure the central angle. They are not length units.",
                    "Write the units beside each answer when the question switches between degrees and radians.",degrees,S),
                Section("convert","How do I convert without mixing the factors?","Start from the half-turn relation. Split the half-turn into as many equal steps as needed.",
                    f"Degrees to radians uses {m(r'\frac{\pi}{180}')}. Radians to degrees uses {m(r'\frac{180}{\pi}')}.",
                    "Swapping the two factors does not cancel the angle's initial unit.",
                    "Check using 90 degrees. Its radian measure must be half of pi.",lambda i:degrees(i,1)),
                Section("turns","What changes after one complete revolution?","A turning object can rotate more than once. The final pointing direction repeats every revolution, but the distance travelled keeps increasing.",
                    f"Reduce by {m(r'2\pi')} only when the question asks for direction within one full turn.",
                    "Removing whole turns early gives the wrong total distance travelled.",
                    "Give the total angle and the reduced angle separately if both are requested.",lambda i:degrees(i,2),extension=True),
            ),(("Radian","Angle subtended by an arc with length equal to the radius."),
               ("Complete revolution","A turn of "+m(r"2\pi")+" radians."),("Reflex angle","An angle strictly between "+m(r"\pi")+" and "+m(r"2\pi")+" radians.")),8),
        Lesson("arcs-and-perimeters","Arc lengths and sector perimeters","Use radian angles to find curves and count the complete boundary.",
            (
                Section("arc","How does the angle determine the arc length?","The larger the turn, the further a point on the rim travels. For a fixed radius, doubling the angle doubles the arc length.",
                    f"An angle of {m(r'\theta')} radians gives arc length {m(r's=r\theta')}. The result uses the same length unit as the radius.",
                    "An angle in degrees must be converted before using the formula.",
                    "Check a full turn. It gives the familiar circumference "+m(r"2\pi r")+".",arc,S),
                Section("boundary","Which pieces belong to a sector perimeter?","Trace the boundary with your finger. Begin at the centre, move along one radius, trace the arc, and come back along the other radius.",
                    f"The perimeter is {m(r'P=2r+r\theta')}. If perimeter is given, subtract both radii to find the arc.",
                    "The arc formula gives the curved piece only.",
                    "Sketch radii and arc in different colours when the question gives a perimeter.",lambda i:arc(i,1)),
                Section("compare","Can two different sectors have the same arc length?","A larger circle needs a smaller angle to sweep the same distance along its circumference.",
                    f"With the arc length fixed, {m(r'\theta=s/r')}. Both arcs must use the same length unit before their sizes are compared.",
                    "An equal arc length does not imply an equal angle.",
                    "Check that the angle you find is physically possible for the described part of a circle.",lambda i:arc(i,2),extension=True),
            ),(("Arc","A connected portion of a circular boundary."),("Sector","The area between two radii and their connecting arc."),
               ("Perimeter","The total length of the complete boundary.")),10),
        Lesson("areas-of-sectors","Sector areas and inverse problems","Find sector areas and recover missing quantities from an arc or an area.",
            (
                Section("area","Why does the radius appear twice in the area formula?","The whole disc has area πr². A sector occupies the fraction of its turn measured in radians divided by a full turn.",
                    f"This gives {m(r'A=\frac12r^2\theta')}, with the result in square units.",
                    "The radius is squared even if the answer involves a fraction of pi.",
                    "Check that a half-turn gives half the area of a disc.",sector_area,S),
                Section("inverse","How can a known area give a radius?","Rearrange to isolate the square of the radius. The radius itself represents a positive length.",
                    f"Use {m(r'r=\sqrt{\frac{2A}{\theta}}')} when the angle and area are known.",
                    "The radius is not twice the area divided by the angle. That gives the radius squared.",
                    "Keep all factors of pi until they can cancel algebraically.",lambda i:sector_area(i,1)),
                Section("combine","What if I know only the arc length and area?","Compare the arc and area equations. Both contain the radius times the angle, so replace that product by the arc length.",
                    f"Using {m(r's=r\theta')} gives {m(r'A=\frac12rs')}. Recover the radius before using the original formulas.",
                    "The second equation uses the curved arc length, not the sector perimeter.",
                    "One of the two equations should lose its angle when you combine them.",lambda i:sector_area(i,2),extension=True),
            ),(("Area","The size of the enclosed region in square units."),("Square law","For a fixed angle, doubling radius multiplies area by four."),
               ("Eliminate","Combine two equations to remove a shared unknown.")),10),
        Lesson("chords-and-segments","Chords and circular segments","Use triangle geometry to find the straight chord and area between chord and arc.",
            (
                Section("chord","How does the central angle give a chord length?","Join the ends of the chord to the centre to make an isosceles triangle. Its angle bisector meets the chord at a right angle.",
                    f"One half of the chord has length {m(r'r\sin(\theta/2)')}. Double this for the whole length.",
                    "The chord is straight. The arc between the same endpoints is longer.",
                    "Use the half-angle for the right triangle, and the full angle for the arc.",segment,C),
                Section("minor","What should I subtract to get the minor segment?","The minor sector contains the isosceles triangle plus the minor segment.",
                    f"Subtract the triangle area {m(r'\frac12r^2\sin\theta')} from the sector area {m(r'\frac12r^2\theta')}.",
                    "The triangle formula has a sine. The sector formula uses the radian value itself.",
                    "Quote each area before subtracting. This makes the region you are finding clear.",lambda i:segment(i,1)),
                Section("major","How do I work out the larger segment?","A chord divides a whole disc into two segments. Subtract the smaller segment from the area of the disc.",
                    "The larger segment perimeter uses the major arc and the same chord. Neither radius is on the segment boundary.",
                    "Using the minor arc gives the other perimeter.",
                    "Check that the major segment area is at least half the disc.",lambda i:segment(i,2),extension=True),
            ),(("Chord","A straight segment between two points on the circle."),("Segment","Region between a chord and an arc."),
               ("Minor segment","The smaller part cut off by a chord."),("Major arc","The longer arc between the endpoints of a chord.")),12),
        Lesson("compound-circular-shapes","Compound circular areas and boundaries","Separate compound shapes into sectors, parts of circles and straight-edged regions.",
            (
                Section("ring","Where are the two radii used in a ring sector?","Draw the smaller and larger sectors at the same centre. The region between their arcs is the ring sector.",
                    f"Subtract to get {m(r'A=\frac12\theta(R^2-r^2)')}. Its straight edges each have length {m('R-r')}.",
                    "The inner arc is still part of the boundary even though its sector area is removed.",
                    "Use the sum of arc lengths for perimeter and the difference of sector areas for area.",ring,G),
                Section("outside","How can I tell which edges remain outside?","Circle each joined edge. It belongs inside the new shape. For a cut-out, the new cut edge must be traced.",
                    "Use the straight lengths and arcs on the outline for perimeter. Split the interior into non-overlapping shapes for area.",
                    "A diameter shared by a semicircle and a rectangle does not belong to their combined perimeter.",
                    "For a cut-out, record each length removed before adding the new arc.",boundaries),
                Section("tangent","Which areas enclose a gap between tangents?","Join each contact point to the centre. Those two radii meet their respective tangents at right angles.",
                    "Use the area of the right triangles formed by radii and tangents. Subtract the appropriate sector to isolate the gap.",
                    "Applying the tangent ratio to the full central angle uses the wrong triangle.",
                    "Mark the right angles and the half-angle before working with trigonometry.",tangent_region,T,extension=True),
            ),(("Ring sector","Region between arcs at the same centre and their connecting radial pieces."),
               ("Tangent","A line perpendicular to a radius at the point of contact."),("Composite shape","Outline built by joining or removing parts of familiar shapes.")),12,
            (ring,lambda i:ring(i,1),boundaries,lambda i:boundaries(i,1),lambda i:boundaries(i,2),tangent_region)),
        Lesson("multistep-circular-models","Mixed circular measure problems","Decide which lengths or areas to keep as shapes and constraints change.",
            (
                Section("overlap","How can two arcs bound one common area?","Draw the chord joining the intersections. Each side of that chord contributes one segment to the overlap.",
                    "The two segment areas add. Only their curved edges survive on the outside of the lens.",
                    "Adding the two sector areas includes two unwanted triangles.",
                    "Find the angle for each original centre, then calculate each segment.",overlap,L),
                Section("fixed-area","What must change if radius changes but area stays fixed?","The square of the radius and the angle appear as a product. Increasing one factor requires decreasing the other to keep the same area.",
                    f"With area fixed, {m(r'\theta_2=\theta_1\left(\frac{r_1}{r_2}\right)^2')}.",
                    "Using a radius ratio without squaring it preserves arc length instead of area.",
                    "Check the direction of change before simplifying the new angle.",reverse_boundary),
                Section("same-angle","How can a shared angle simplify an unknown radius?","Two arcs of a ring sector turn through the same angle. Their lengths therefore differ by that angle times the radial width.",
                    "If total boundary and radii are known, subtract the straight edges and divide the arc sum by the radius sum.",
                    "Use lengths of both arcs in the perimeter of a ring. Count both short links as well.",
                    "Confirm that the inferred angle is less than a full turn and use it to verify the perimeter.",lambda i:ring(i,2),G,extension=True),
            ),(("Lens","The region lying inside both overlapping discs."),("Constraint","A quantity or relation that must stay fixed."),
               ("Exact form","An answer written using constants such as pi and square roots without numerical rounding.")),12,
            (overlap,reverse_boundary,lambda i:ring(i,2),lambda i:ring(i,1),lambda i:boundaries(i,2),tangent_region)),
    )


if __name__=="__main__":
    build(SLUG,"Circular measure",7,"circular",lessons(),__file__)
