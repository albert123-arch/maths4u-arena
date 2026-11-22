"""Create the 0606 coordinate geometry of the circle lessons and question bank."""

from fractions import Fraction as F
from math import cos, pi, sin
from prepare_0606_geometry_and_logs_support import (
    Lesson, Section, build, choose, field, grid, line, m, minus, part, point, poly, problem, tex,
)


SLUG = "coordinate-circle"


def data(i):
    return (i % 19)-8, ((i // 19) % 17)-6, ((i // 323) % 11)+1


def raw_points(*xy):
    return ";".join(f"({x},{y})" for x,y in xy)


def pair_step(prompt, pts, explain, method, label="Coordinates"):
    ans=m(r",\ ".join(point(xy) for xy in pts))
    return part(prompt,ans,explain,method,field(raw_points(*pts),"pairs",label=label))


def circle(h,k,r2):
    x = f"({minus('x',h)})" if h else "x"
    y = f"({minus('y',k)})" if k else "y"
    return f"{x}^2+{y}^2={tex(r2)}"


def expanded(h,k,r2):
    x_term=poly({1:-2*h},"x")
    y_term=poly({1:-2*k},"y")
    terms=["x^2+y^2"]
    for term in (x_term,y_term,str(h*h+k*k-r2)):
        if term!="0":
            terms.append(term if term.startswith("-") else "+"+term)
    return "".join(terms)+"=0"


def circle_equation(i,mode=0):
    h,k,t=data(i)
    # A 5–12–13 triangle lets both the diameter and off-axis points use integers.
    dx,dy,r=5*t,12*t,13*t
    C=(h,k)
    P=(h+dx,k-dy)
    Q=(h-dx,k+dy)
    f=circle(h,k,r*r)
    e=expanded(h,k,r*r)
    d=part("Write the equation in centre–radius form.",m(f),
        [f"The centre is {m(point(C))} and the squared radius is {m(r*r)}.",
         f"Use {m('(x-h)^2+(y-k)^2=r^2')}."],"Substitute the centre and the square of the radius.",
        field(f,"equation",label="Circle equation",variables=("x","y")))
    ex=part("Write the equation in expanded form.",m(e),
        [f"Expand both squared brackets in {m(f)}, then bring the constant to the left."],
        "Expand each bracket and collect like terms.",field(e,"equation",label="Expanded circle equation",variables=("x","y")))
    radius=part("Find the radius.",m(r),
        [f"Completing the squares gives {m(f)}. The positive square root of {m(r*r)} is {m(r)}."],
        "Take the positive square root of the right-hand side.",field(r,label="Radius"))
    if mode==0:
        return problem("The centre hidden in an expanded circle",f"A circle has the equation {m(e)}.",
            pair_step("Give the coordinates of its centre.",(C,),
                [f"Complete the square separately in x and y to get {m(f)}.",
                 "Read each coordinate with the sign opposite to the constant in its bracket."],
                "Complete both squares and read the centre.","Centre"),radius,d)
    if mode==1:
        return problem("Find a circle from the ends of its diameter",
            f"The points {m('P'+point(P))} and {m('Q'+point(Q))} are the ends of a circle's diameter.",
            pair_step("Find the centre.",(C,),
                [f"Average the x-coordinates of the endpoints and average their y-coordinates."],
                "Use the midpoint of the diameter.","Centre"),
            part("Find the squared radius.",m(r*r),
                 [f"From {m(point(C))} to {m(point(P))}, the coordinate changes are {m(dx)} and {m(-dy)}.",
                  f"Add their squares to get {m(r*r)}."],"Use the distance from the centre to one endpoint."),
            d)
    return problem("From a centre and a boundary point",
        f"A circle with centre {m('C'+point(C))} passes through {m('P'+point(P))}.",
        part("Find its radius.",m(r),
             [f"The displacement from centre to boundary has components {m(dx)} and {m(-dy)}. Use Pythagoras for its length."],
             "Use the centre-to-boundary distance.",field(r,label="Radius")),
        d,ex)


def crossing(i,mode=0):
    h,k,t=data(i)
    if mode==0:
        r=5*t
        level=k+3*t
        P,Q=(h-4*t,level),(h+4*t,level)
        f=circle(h,k,r*r)
        return problem("The two ends of a horizontal chord",f"A circle is given by {m(f)}. A line has equation {m('y='+str(level))}.",
            pair_step("Find both points where the line crosses the circle.",(P,Q),
                [f"Substitute the given y-value. This gives {m('('+minus('x',h)+')^2='+str(16*t*t))}.",
                 f"The signed difference {m(minus('x',h))} can be {m(str(4*t))} or {m(str(-4*t))}."],
                "Substitute the line equation into the circle and solve both branches.","Both points"),
            part("Find the chord length.",m(8*t),[f"The chord is horizontal, so subtract the smaller x-coordinate from the larger one."],
                 "Use the difference in x."),
            part("Find the distance from the centre to the line.",m(3*t),
                 [f"The perpendicular to a horizontal line is vertical. Use the change between {m(k)} and {m(level)}."],
                 "Identify the perpendicular direction."))
    if mode==1:
        r2=2*t*t
        f=circle(h,k,r2)
        line_form=line(1,k-h)
        P,Q=(h-t,k-t),(h+t,k+t)
        return problem("A diagonal through the centre",
            f"The line {m(line_form)} meets the circle {m(f)} in two points.",
            pair_step("Find both points of intersection.",(P,Q),
                [f"From the line equation, {m(minus('y',k)+'='+minus('x',h))}.",
                 f"Substitute to get {m('2('+minus('x',h)+')^2='+str(r2))}. Solve with both signs and recover y from the line."],
                "Substitute the line expression into the two squared distances.","Both intersections"),
            pair_step("Find the midpoint of the chord.",((h,k),),
                ["The two intersections have equal and opposite displacements from the centre."],"Average each pair of coordinates.","Midpoint"),
            part("Explain why the chord is a diameter.", "It passes through the centre of the circle.",
                 ["The circle's centre lies on the line segment between its two boundary points."],"Use the definition of a diameter.",fact=True))
    r=3*t
    f=circle(h,k,r*r)
    vertical=h+[r, r+t, r-t][(i//7)%3]
    remain=r*r-(vertical-h)**2
    count=2 if remain>0 else 1 if remain==0 else 0
    opts=["0 points","1 point","2 points"]
    return problem("Does a vertical line meet the circle?",
        f"Let {m('L')} be the line {m('x='+str(vertical))} and let {m('C')} be the circle {m(f)}.",
        part("How many distinct points do the line and circle share?",opts[count]+".",
             [f"Substitute into the circle to get {m('('+minus('y',k)+')^2='+str(remain))}.",
              "A positive right-hand side gives two roots, zero gives one and a negative value gives none."],
             "Classify the substituted equation by the sign of its right-hand side.",
             choose([opts[count],*(v for v in opts if v!=opts[count])],i)),
        part(f"Give the equations of both vertical lines tangent to {m('C')}.",m('x='+str(h-r))+ " and "+m('x='+str(h+r))+".",
             [f"Each tangent is horizontally {m(r)} units from the centre."],"Use the radius to obtain the extreme x-coordinates."))


def tangent(i,mode=0):
    h,k,t=data(i)
    sign=(-1)**(i//7)
    if mode==1:
        r=1+t
        P=(h,k+sign*r)
        f=circle(h,k,r*r)
        eq=f"y={P[1]}"
        return problem("Tangent at the end of a vertical radius",
            f"A circle has equation {m(f)} and is tangent to a line at {m('P'+point(P))}.",
            part("Find the equation of the tangent.",m(eq),
                 [f"The centre is {m(point((h,k)))}. The radius to {m('P')} is vertical, so the tangent is horizontal."],
                 "Use the perpendicular radius direction.",field(eq,"equation",label="Tangent equation",variables=("x","y"))),
            pair_step("Find the point of contact of the parallel tangent.",((h,k-sign*r),),
                [f"The second point lies the same distance {m(r)} from the centre on the opposite side."],
                "Find the other end of the vertical diameter.","Contact point"),
            part("Give the distance between the parallel tangents.",m(2*r),
                 ["The vertical separation is the diameter of the circle."],"Double the radius."))
    dx,dy=3*t,4*t*sign
    P=(h+dx,k+dy)
    r=5*t
    f=circle(h,k,r*r)
    slope=F(-dx,dy)
    c=P[1]-slope*P[0]
    eq=line(slope,c)
    tangent_step=part(f"Find the equation of the tangent at {m('P')}.",m(eq),
        [f"The radius from {m(point((h,k)))} to {m(point(P))} has gradient {m(tex(F(dy,dx)))}.",
         f"The tangent has gradient {m(tex(slope))}. Substitute the point of contact into {m('y=mx+c')} to get {m('c='+tex(c))}."],
        "Use the negative reciprocal and the point of contact.",field(f"y=({slope})*x+({c})","equation",label="Tangent equation",variables=("x","y")),
        intermediate=("Use the point of contact to find the constant in the tangent equation.",))
    given=f"A circle has equation {m(f)}. The point {m('P'+point(P))} lies on the circle."
    if mode==0:
        return problem("The tangent perpendicular to a sloping radius",given,tangent_step,
            pair_step("Find the y-intercept of the tangent.",((0,c),),
                [f"Use {m('x=0')} in {m(eq)} to obtain {m('y='+tex(c))}."],"Set x equal to zero.","y-intercept"))
    opp=(h-dx,k-dy)
    c2=opp[1]-slope*opp[0]
    return problem("Two parallel tangents to a circle",given,tangent_step,
        pair_step("Find the contact point of the other tangent parallel to it.",(opp,),
            [f"The radius to a parallel tangent is along the same diameter. Reflect {m('P')} in the centre."],
            "Use equal and opposite displacements from the centre.","Second contact point"),
        part("Find the equation of the other tangent.",m(line(slope,c2)),
             [f"The slope stays {m(tex(slope))}. Use the new contact point {m(point(opp))}."],
             "Keep the gradient and recalculate the intercept."))


def circle_pair(i,mode=0):
    h,k,t=data(i)
    if mode==0:
        r=5*t
        centres=6*t
        f1=circle(h,k,r*r)
        f2=circle(h+centres,k,r*r)
        x0=h+3*t
    elif mode==1:
        # The common chord is 5t from the 13t centre and 9t from the 15t centre.
        r,R,centres=13*t,15*t,14*t
        f1=circle(h,k,r*r)
        f2=circle(h+centres,k,R*R)
        x0=h+5*t
    else:
        r,R=3*t,5*t
        gap=[R-r,R+r,R+r+t,R-r-t][(i//7)%4]
        second=h+gap
        f1=circle(h,k,r*r)
        f2=circle(second,k,R*R)
        tags=["Touch internally","Touch externally","Disjoint, neither circle inside the other","One circle lies inside the other, without touching"]
        case=(i//7)%4
        return problem("Using radii and centre distance",
            f"Circle {m('C_1')} has equation {m(f1)} and circle {m('C_2')} has equation {m(f2)}.",
            part("How are the circles positioned?",tags[case]+".",
                 [f"The centre separation is {m(gap)}. The radii are {m(r)} and {m(R)}.",
                  f"The radius difference is {m(R-r)} and the sum is {m(R+r)}. Compare both bounds to classify the circles."],
                 "Compare the centre distance to the sum and difference of the radii.",
                 choose([tags[case],*(tag for tag in tags if tag!=tags[case])],i)),
            part("How many points do their circumferences have in common?",m(1 if case<2 else 0)+".",
                 ["Equality with one of the bounds gives one point. Strict containment or strict separation gives none."],
                 "Relate the type of position to the number of intersection points.",fact=True))
    b=4*t if mode==0 else 12*t
    pts=((x0,k-b),(x0,k+b))
    const=2*centres*x0
    return problem("The line of a common chord",
        f"The circles {m(f1)} and {m(f2)} have two common points.",
        part("Find the equation of the line through the two common points.",m('x='+str(x0)),
             [f"Subtract the circle equations. The squared terms cancel and the difference gives {m(str(2*centres)+'x='+str(const))}.",
              f"The line through both points therefore has constant x-coordinate {m(x0)}."],
             "Subtract the two equations and solve the resulting linear relation.",
             field(f"x={x0}","equation",label="Common chord line",variables=("x","y"))),
        pair_step("Find both common points.",pts,
            [f"Substitute {m('x='+str(x0))} into the first equation to obtain {m('('+minus('y',k)+')^2='+str(b*b))}.",
             "Use both signs, then check the second circle equation."],
            "Substitute the common chord equation into one circle.","Both intersections"),
        part("Find the chord length.",m(2*b),
             [f"The chord is vertical and the y-values are {m(k-b)} and {m(k+b)}."],
             "Use the absolute difference in the y-values."))


def circle_points(h,k,r):
    return [(h+r*cos(pi*j/90),k+r*sin(pi*j/90)) for j in range(181)]


def lessons():
    coordinate_map=grid(SLUG,"centre-radius","Circle with centre C and a radius to P",
        "Every point on the circumference has the same distance from C.",xrange=(-4,9),yrange=(-4,7),equal=True,ticks=False,
        curves=((circle_points(2,1,4),"#12614c"),),dots=((2,1,"C"),(2,5,"P")),guides=(([(2,1),(2,5)],"#9b5221"),))
    crossed=grid(SLUG,"intersect-line","A circle cut by a horizontal line at P and Q",
        "Substitute the same y-value to find both x-values.",xrange=(-7,7),yrange=(-6,6),equal=True,ticks=False,
        curves=((circle_points(0,0,5),"#12614c"),(((-6,3),(6,3)),"#9b5221")),dots=((-4,3,"P"),(4,3,"Q"),(0,0,"C")))
    tangent_plot=grid(SLUG,"radius-tangent","A tangent perpendicular to the radius at P",
        "At P the tangent has a right angle with the radius.",xrange=(-6,8),yrange=(-6,8),equal=True,ticks=False,
        curves=((circle_points(0,0,5),"#12614c"),(((-0.2,6.4),(6.2,1.6)),"#9b5221")),
        dots=((0,0,"C"),(3,4,"P")),
        guides=(([(0,0),(3,4)],"#305fa0"), ([(2.6,4.3),(2.3,3.9),(2.7,3.6)],"#305fa0")))
    common=grid(SLUG,"common-chord","Two intersecting circles with a vertical common chord",
        "The two intersections lie on a single straight line. Subtracting the circle equations gives that line.",
        xrange=(-9,9),yrange=(-6,6),equal=True,ticks=False,
        curves=((circle_points(-3,0,5),"#12614c"),(circle_points(3,0,5),"#2b5999")),
        dots=((-3,0,"C₁"),(3,0,"C₂"),(0,-4,"Q"),(0,4,"P")),guides=(([(0,-4),(0,4)],"#9b5221"),))
    return (
        Lesson("equations-of-circles","Centre, radius and the equation of a circle","Translate between the geometry and both common equation forms.",
            (
                Section("expanded","Where are the centre and radius in the equation?","The distance from a point on the boundary to the centre is fixed. Squaring the distance gives the equation.",
                    f"Centre {m('(a,b)')} and radius {m('r')} give {m('(x-a)^2+(y-b)^2=r^2')}. Complete both squares when the equation has been expanded.",
                    "When a bracket contains a plus sign, its corresponding centre coordinate is negative.",
                    "Add both completing-square corrections to the other side of the original equation as well.",circle_equation,coordinate_map),
                Section("diameter","How can a diameter tell me the centre?","The centre lies halfway between the two ends. Use the midpoint first, then find the distance from there to either end.",
                    "A radius is half the diameter. The squared radius can be obtained from the squared coordinate differences from centre to endpoint.",
                    "The distance between the two given endpoints is the whole diameter.",
                    "Substitute both endpoints into your final equation to check.",lambda i:circle_equation(i,1)),
                Section("boundary","How do I use a point on the circle?","Subtract matched coordinates from centre to point. Pythagoras uses these signed changes after squaring.",
                    "The squared distance from the centre to any boundary point is the constant in centre–radius form.",
                    "Expanding a squared bracket also creates a linear term.",
                    "Keep the radius squared in your calculations if the question only needs an equation.",lambda i:circle_equation(i,2),extension=True),
            ),(("Centre","The point equidistant from every point on the circumference."),("Radius","The distance from the centre to the circumference."),
               ("Diameter","A chord through the centre."),("Circumference","The boundary of the circle.")),4),
        Lesson("intersections-with-a-line","Line and circle intersections","Solve for both coordinates and interpret the number of intersections.",
            (
                Section("horizontal","How does a horizontal line simplify the circle equation?","Every point on a horizontal line has the same y-value. Substituting it leaves an equation in x.",
                    "A positive squared difference gives two x-values. Use the fixed y-coordinate to form both complete coordinate pairs.",
                    "Taking only the positive square root usually loses one intersection.",
                    "Check whether both candidate points also satisfy the given line equation.",crossing,crossed),
                Section("diagonal","How do I substitute a sloping line?","Replace y with its expression from the line. Then solve the resulting quadratic before finding y separately for each root.",
                    "Substitution preserves points shared by both equations. A line through the centre cuts a diameter.",
                    "Two roots for x need two corresponding y-values.",
                    "Rearrange for the variable that makes the substitution shortest.",lambda i:crossing(i,1)),
                Section("count","How can I tell whether a line is a tangent?","Study the number of roots after substitution. A line and circle may share two points, one point or no point.",
                    "A tangent has one distinct point in common with the circle. A non-vertical line can be tested by the discriminant of the substituted quadratic.",
                    "A repeated root counts as one coordinate value.",
                    "For a vertical line, substitute its fixed x-value directly.",lambda i:crossing(i,2),extension=True),
            ),(("Chord","A segment joining two points on the circumference."),("Secant","A line through two distinct points on the circumference."),
               ("Tangent","A line meeting the circle at one point."),("Discriminant","A quadratic expression that determines the number of real roots.")),4),
        Lesson("equations-of-tangents","Equations of circle tangents","Use the radius direction and point of contact to write a tangent equation.",
            (
                Section("negative-reciprocal","Which gradient belongs to the tangent?","Mark the centre and point of contact. The radius between them is perpendicular to the tangent.",
                    f"For finite nonzero radius gradient {m('m_r')}, the tangent gradient is {m(r'-\frac{1}{m_r}')}.",
                    "The radius gradient is the one you need to convert. Using it directly gives a line through the circle.",
                    "Put the point of contact back into your tangent equation.",tangent,tangent_plot),
                Section("axis-tangents","What if a radius is horizontal or vertical?","Use direction rather than a reciprocal when a gradient is zero or undefined.",
                    f"A vertical radius gives a tangent {m('y=k')}. A horizontal radius gives a tangent {m('x=h')}.",
                    "A vertical tangent cannot be written as y = mx + c.",
                    "Read h or k from the point of contact.",lambda i:tangent(i,1)),
                Section("parallel","Where is a second parallel tangent?","All radii to parallel tangents have the same line direction. Their contact points lie at opposite ends of a diameter.",
                    "Reflect the first contact point in the centre. Use the same tangent gradient and the reflected point to find the new intercept.",
                    "The intercept is usually different on the two tangents.",
                    "Find the other contact point before writing the line.",lambda i:tangent(i,2),extension=True),
            ),(("Point of contact","The only point shared by a tangent and its circle."),("Negative reciprocal","The reciprocal with its sign reversed."),
               ("Parallel tangents","Two tangents with the same line direction.")),4),
        Lesson("two-circles","Two circles and their common chord","Classify how two circles meet and calculate the common line and points.",
            (
                Section("centre-distance","What does the distance between the centres tell me?","Find both radii and the distance between the centres. Compare the distance to the radius sum and their positive difference.",
                    f"Two distinct circles meet twice when {m('|r_1-r_2|<d<r_1+r_2')}. For internal touching, {m('d=|r_1-r_2|>0')}. For external touching, {m('d=r_1+r_2')}.",
                    "A centre distance below the radius difference means strict containment. Coincident circles have the same centre and radius.",
                    "Compute both bounds before deciding the type of intersection.",lambda i:circle_pair(i,2)),
                Section("chord","Why does subtracting two circle equations produce a line?","A common point satisfies both circle equations at once. Their expanded squared terms have equal coefficients.",
                    "Subtract to cancel the squares. For intersecting circles the resulting linear equation gives the line containing the chord.",
                    "The linear equation contains points outside the circles too.",
                    "After finding the chord line, substitute it into a circle to find the actual common points.",circle_pair,common),
                Section("unequal","What changes when the radii are different?","For equal radii the common chord is halfway between the centres. With unequal radii its position needs the actual equations.",
                    "Subtract the full equations, including their constants and squared radii. Check the resulting points in both originals.",
                    "The midpoint of the centre segment does not generally lie on the common chord.",
                    "Keep the subtraction in brackets to protect the signs.",lambda i:circle_pair(i,1),extension=True),
            ),(("Centre distance","Distance between the centres of two circles."),("Internal touching","A circle lies inside another and their boundaries share one point."),
               ("External touching","Circles lie on opposite sides of their contact point."),("Common chord","The segment joining the two intersection points.")),5),
    )


if __name__=="__main__":
    build(SLUG,"Coordinate geometry of the circle",6,"circles",lessons(),__file__)
