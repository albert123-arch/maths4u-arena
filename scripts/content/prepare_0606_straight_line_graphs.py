"""Create the 0606 straight-line graphs chapter and its question families."""

from fractions import Fraction as F
from prepare_0606_geometry_and_logs_support import (
    Lesson, Section, build, choose, field, grid, line, m, part, point, poly, problem, radical, table, tex,
)


SLUG = "straight-line-graphs"


def data(i):
    return i % 19 + 1, (i // 19) % 17 + 1, (i // 323) % 11 + 1


def coord(xy, title):
    return field(f"({xy[0]},{xy[1]})", "pairs", label=title)


def eql(value, x="x", y="y"):
    return field(value, "equation", label="Equation of the line", variables=(x, y))


def rational_line(slope, c, x="x", y="y"):
    """Readably present exact lines and give an unambiguous parser key."""
    return m(line(slope, c, x, y)), eql(f"{y}=({slope})*{x}+({c})", x, y)


def point_step(prompt, xy, steps, method, label="Coordinates"):
    return part(prompt,m(point(xy)),steps,method,coord(xy,label))


def components(i, mode=0):
    p,q,r=data(i)
    P=(p-12,q-9)
    dx,dy=2*r+2,(-1 if mode==1 else 1)*(2*q+2)
    Q=P[0]+dx,P[1]+dy
    M=P[0]+dx//2,P[1]+dy//2
    slope=F(dy,dx)
    distance, raw_distance=radical(dx**2+dy**2)
    info=f"The ends of a straight survey baseline are {m('P'+point(P))} and {m('Q'+point(Q))}."
    middle=point_step("Find the midpoint of the baseline.",M,
                      [f"Average matched coordinates: {m('M='+point((F(P[0]+Q[0],2),F(P[1]+Q[1],2))))}."],
                      "Find the mean of the two x-coordinates and the mean of the two y-coordinates.","Midpoint")
    length=part("Find the exact length of the baseline.",m(distance),
                [f"The changes from {m('P')} to {m('Q')} are {m(dx)} horizontally and {m(dy)} vertically.",
                 f"Pythagoras gives {m(r'PQ^2='+str(dx**2+dy**2))}."],"Use the squares of coordinate differences.",field(raw_distance,label="Exact length"))
    gradient=part("Find the gradient of the baseline.",m(tex(slope)),
                  [f"Use vertical change over horizontal change: {m(r'\frac{'+str(dy)+'}{'+str(dx)+'}')}."],
                  "Subtract in the same point order in both differences.",field(slope,label="Gradient"))
    if mode==0:
        return problem("Distance along a survey baseline",info,length,gradient,middle)
    if mode==1:
        return problem("Recover the other end of a segment",
            f"A segment has endpoint {m('P'+point(P))} and midpoint {m('M'+point(M))}.",
            point_step("Find the other endpoint.",Q,[f"Double the midpoint coordinate and subtract the known endpoint: {m('Q='+point(M)+'\\times2-'+point(P))}."],
                       "Use each midpoint equation in reverse.","Other endpoint"),length,gradient)
    return problem("The direction of a ramp",info,gradient,middle,
        part(f"A second ramp begins at {m('Q')}. It has the same gradient. At {m('x='+str(Q[0]+dx//2))}, find its height coordinate.",
             m(tex(Q[1]+dy//2)),[f"The second ramp moves horizontally by {m(dx//2)}. Its vertical change is {m(dy//2)}."],
             "Multiply the slope by the horizontal displacement."))


def parallel(i, mode=0):
    p,q,r=data(i)
    a,b=2+r,1+q
    c=p-13
    slope=F(-a,b)
    P=(b,p-r)
    x0=P[0]+b*r
    equation=m(poly({1:a},"x")+"+"+poly({1:b},"y")+"="+str(c))
    start=f"The line {m('L')} has equation {equation}. A line {m('K')} passes through {m('P'+point(P))} and is parallel to {m('L')}."
    c2=P[1]-slope*P[0]
    formula,checker=rational_line(slope,c2)
    same=part(f"Find the gradient of {m('K')}.",m(tex(slope)),
              [f"Rearrange the given equation to obtain {m(line(slope,F(c,b)))}. Parallel lines have equal gradients."],
              "Divide the x-coefficient of the rearranged equation by the coefficient of y.",field(slope,label="Gradient"))
    find=part(f"Find an equation for {m('K')}.",formula,
              [f"Substitute {m(point(P))} into {m('y=mx+c')} using {m('m='+tex(slope))}. The intercept is {m(c2)}."],
              "Keep the gradient and use the point to determine the intercept.",checker)
    if mode==0:
        return problem("Two parallel route lines",start,same,find,
            part(f"Find the y-coordinate of {m('K')} when {m('x='+str(x0))}.",m(tex(slope*x0+c2)),
                 [f"Substitute the new horizontal coordinate into {formula}."],"Evaluate the equation of K."))
    y2=P[1]-a*r
    return problem("A missing coordinate on a parallel line",
        f"Points {m('P'+point(P))} and {m('Q('+str(x0)+',u)')} lie on a line {m('K')} parallel to {equation}.",
        part(f"Find {m('u')}.",m(y2),[f"The required gradient is {m(tex(slope))} and the horizontal difference is {m(b*r)}.",
             f"The vertical difference is {m(-a*r)}, giving {m('u='+str(y2))}."],"Equate the two gradients.",field(y2,label="u")),
        find,part(f"Explain why the line through the two points does not meet {equation}.",
             "The gradients are equal and the intercepts are different.",
             [f"At {m('P')}, {m('ax+by='+str(a*P[0]+b*P[1]))} for {m('a='+str(a)+r',\ b='+str(b))}.",
              f"This differs from {m(c)}, so the point is not on the given line."],"Compare the gradients and intercepts.",fact=True))


def perpendicular(i, mode=0):
    p,q,r=data(i)
    if mode==1:
        h,k=p-10,q+2
        P=(h,k)
        return problem("A right angle at a vertical line",
            f"The line {m('L')} has equation {m('x='+str(h))}. The point {m('P'+point(P))} lies on {m('L')}.",
            part(f"Find the equation of the line through {m('P')} perpendicular to {m('L')}.",m('y='+str(k)),
                 [f"Every point on {m('L')} has the same x-coordinate. A horizontal line is perpendicular to a vertical line.",
                  f"The line through {m('P')} has constant height {m(k)}."],"Use the horizontal–vertical case.",eql(f"y={k}")),
            point_step("Give the point where the perpendicular meets the y-axis.",(0,k),
                       [f"On the y-axis {m('x=0')}. The height is still {m(k)}."],"Set x equal to zero.","Intersection"),
            part(f"Find the distance from {m('P')} to the y-axis.", m(abs(h)),
                 [f"Take the magnitude of the change along the horizontal line: {m('|'+str(h)+'|='+str(abs(h)))}."],"Find the horizontal change."))
    dx,dy=2*(r+1),2*(q+2)
    A=(p-9,1-q)
    B=(A[0]+dx,A[1]+dy)
    M=(A[0]+dx//2,A[1]+dy//2)
    P=M if mode==2 else (p+q,r-p)
    g=F(dy,dx)
    s=-1/g
    c=P[1]-s*P[0]
    formula,checker=rational_line(s,c)
    giv=f"A segment joins {m('A'+point(A))} to {m('B'+point(B))}."
    giv+=(f" Its midfield boundary is the perpendicular bisector." if mode==2 else f" The line {m('K')} is perpendicular to {m('AB')} and passes through {m('P'+point(P))}.")
    where="the perpendicular bisector" if mode==2 else m("K")
    work=part(f"Find an equation of {where}.",formula,
        [f"{m('AB')} has gradient {m(tex(g))}, so the perpendicular gradient is {m(tex(s))}.",
         (f"The midpoint is {m(point(M))}. " if mode==2 else "")+f"Substitute {m(point(P))} into {m('y=mx+c')} to find {m('c='+tex(c))}."],
        "Use the negative reciprocal gradient and the appropriate point on the required line.",checker,
        intermediate=("Substitute the point into an equation with the perpendicular gradient.",))
    if mode==2:
        return problem("Perpendicular bisector of a baseline",giv,work,
            point_step("Find its intersection with the x-axis.",(-c/s,0),[f"Set {m('y=0')} in {formula} and solve for {m('x')}."],
                       "Solve the line equation for y = 0.","x-axis intersection"),
            part(f"Explain why its midpoint is equidistant from {m('A')} and {m('B')}.",
                 "A midpoint divides a segment into two equal lengths.",
                 ["It lies on the segment and is the same fraction of the original distance from both ends."],"Use the definition of midpoint.",fact=True))
    return problem("A perpendicular through an off-line point",giv,work,
        point_step(f"Find where {m('K')} meets the y-axis.",(0,c),[f"Set {m('x=0')} in {formula}."],"Use x = 0.","y-axis intersection"),
        part(f"State the product of the gradients of {m('K')} and {m('AB')}.",m(-1),[f"Multiply {m(tex(s))} by {m(tex(g))}."],
             "Use the perpendicular gradient condition.",fact=True))


def intersection(i, mode=0):
    p,q,r=data(i)
    a,b= r+1,-q
    x,y=p-13,2*q-r
    c,d=y-a*x,y-b*x
    P=(x,y)
    form,checker=rational_line(a,c)
    A=(x-2,y-2*a); B=(x+r+1,y+(r+1)*a)
    second=m(f"{q}x+y={d}")
    if mode==0:
        giv=f"A path passes through {m('A'+point(A))} and {m('B'+point(B))}. A second path lies on {second}."
    elif mode==1:
        giv=f"A motion sensor gives the position {m('y='+poly({1:a,0:c}))}. A second sensor gives {second}."
    else:
        giv=f"A straight graph has gradient {m(a)} and passes through {m('A'+point(A))}. It intersects the line {second}."
    common=point_step("Find the point where the lines cross.",P,
        [f"The second line is {m(line(b,d))}. Set the two expressions for {m('y')} equal.",
         f"Rearranging gives {m(str(a-b)+'x='+str(d-c))}. Substitute the resulting x-coordinate back to get {m('y='+str(y))}."],
        "Solve the equations simultaneously and then substitute.","Intersection")
    one=part("Find the equation of the first line.",form,
             [f"Use gradient {m(tex(F(B[1]-A[1],B[0]-A[0])))} and substitute {m(point(A))} for a point on the line."],
             "Substitute a known point into the line with the correct gradient.",checker)
    D,raw=radical((x-A[0])**2+(y-A[1])**2)
    extra=part(f"Find the exact distance from {m(point(A))} to the intersection.",m(D),
        [f"The coordinate differences are {m(x-A[0])} and {m(y-A[1])}. Apply Pythagoras."],"Use the length formula.",field(raw,label="Exact distance"))
    if mode==1:
        return problem("When the two readings agree",giv,common,extra,
            part("Which model has the larger y-value one unit to the right of the intersection? Give the difference.",
                 f"The first model, by {m(a-b)}.",[f"One unit to the right, the first output changes by {m(a)} and the second by {m(b)}."],
                 "Compare the gradients over the same horizontal step."))
    return problem("Meet at a point",giv,one,common,extra)


def area(i, mode=0):
    p,q,r=data(i)
    if mode==0:
        a,b=2+p,2*q+r
        form=m(f"{b}x+{a}y={a*b}")
        area_=F(a*b,2)
        return problem("An intercept triangle",
            f"The line {form} and the positive coordinate axes enclose a triangle.",
            point_step("Give the point where the line meets the x-axis.",(a,0),
                       [f"Set {m('y=0')} and divide by {m(b)}."],"Use y = 0.","x-axis intersection"),
            part("Find the area of the triangle.",m(tex(area_))+" square units.",
                 [f"Setting {m('x=0')} gives a height of {m(b)}.",
                  f"The area is {m(r'\frac{1}{2}\times'+str(a)+r'\times'+str(b)+'='+tex(area_))}."],
                 "Multiply the intercept lengths and halve.",field(area_,label="Area")),
            part("The x-intercept doubles and the y-intercept stays fixed. Find the new area.",m(a*b)+" square units.",
                 ["Doubling the base while keeping the height fixed doubles the area."],"Apply the base change to the original area."))
    x0,y0=p-12,q-4
    A=(x0,y0); B=(x0,y0+2*r); C=(x0+q+1,y0-r)
    if mode==1:
        area_=r*(q+1)
        return problem("Triangle with a vertical side",
            f"A site plan forms a triangle with vertices {m('A'+point(A))}, {m('B'+point(B))} and {m('C'+point(C))}.",
            part(f"Find the perpendicular distance from {m('C')} to the line {m('AB')}.",m(q+1),
                 [f"The line {m('AB')} is vertical, so its perpendicular distance is the horizontal difference."],
                 "Use the difference of x-coordinates.",field(q+1,label="Perpendicular height")),
            part("Find the area of the triangle.",m(area_)+" square units.",
                 [f"The base {m('AB')} has length {m(2*r)}, and the perpendicular height is {m(q+1)}."],"Use half the base times the perpendicular height."),
            point_step("Reflect C in the line AB. Give the reflected point.",(x0-q-1,y0-r),
                       [f"The y-coordinate is fixed and the reflected x-coordinate is {m(2*x0-C[0])}."],"Reflect the horizontal displacement.","Reflected point"))
    D=(x0-q-2,y0+4*r)
    total=r*(2*q+3)
    return problem("Split an outline into two triangles",
        f"A quadrilateral has vertices {m('A'+point(A))}, {m('C'+point(C))}, {m('B'+point(B))} and {m('D'+point(D))} in that order.",
        part("Find the area of the quadrilateral.",m(total)+" square units.",
             [f"Draw diagonal {m('AB')}. The horizontal heights on its two sides are {m(q+1)} and {m(q+2)}.",
              f"The total is {m(r'\frac{1}{2}\times'+str(2*r)+r'\times'+str(2*q+3)+'='+str(total))}."],
             "Add the two areas built on AB.",field(total,label="Area"),intermediate=("Use horizontal changes for both perpendicular heights.",)),
        part(f"Find the ratio of the areas of triangles {m('ACB')} and {m('ADB')}.",m(str(q+1)+":"+str(q+2)),
             ["Their bases coincide, so their areas are in the same ratio as their heights."],"Compare the heights."))


def model(i, mode=0, from_data=False):
    s,t,u=data(i)
    a,b=2+s,t+1
    # For each mode use positive data so that reversing the transformation is one-to-one.
    if mode==0:
        power=2+(u%2)
        X=r"\frac{1}{x}"; Y=r"\sqrt{y}" if power==2 else r"\sqrt[3]{y}"
        relation="y="+rf"\left({a}+\frac{{{b}}}{{x}}\right)^{power}"
        recovered=rf"{Y}={a}+{b}X"
        slope,intercept=b,a
        xs=(1,2,3,b)
        rows=((m(tex(F(1,x))),m(tex(a+F(b,x)))) for x in xs[:3])
        Fvalue=(a+1)**power
        newx=b
        story="A reciprocal calibration"
        inverse=f"From {m('y^{1/'+str(power)+'}='+str(a)+r'+\frac{'+str(b)+'}{x}')} recover the original output by raising both sides to power {m(power)}."
        explain=f"Take the positive {'square root' if power==2 else 'cube root'}, then use {m('X='+X)}."
    elif mode==1:
        X=r"\log_2 x"; Y=r"\log_2 y"
        slope,intercept=u+t,a
        relation=f"y=2^{{{a}}}x^{{{slope}}}"
        recovered=f"{Y}={poly({1:slope,0:a},'X')}"
        rows=((m(j),m(a+slope*j)) for j in range(3))
        Fvalue=f"2^{{{a+3*slope}}}";newx=8
        story="Recover the exponent of a power"
        inverse=f"Reverse the logarithms using {m('y=2^Y')} and {m('x=2^X')}."
        explain=f"Use the product and power laws to convert {m(r'\log_2(Ax^n)')} to {m(r'\log_2 A+n\log_2 x')}."
    else:
        X=r"x^2"; Y=r"\ln y"
        a=1+s; b=t+1
        slope,intercept=b,a
        relation=f"y=e^{{{b}x^2+{a}}}"
        recovered=f"{Y}={poly({1:b,0:a},'X')}"
        rows=((m(x*x),m(b*x*x+a)) for x in (1,2,3))
        Fvalue=f"e^{{{b*16+a}}}";newx=4
        story="An exponential calibration"
        inverse=f"Use {m('y=e^Y')} to return from the transformed graph to the original output."
        explain=f"Taking natural logs removes the exponential. Put {m('X='+X)} for its quadratic input."
    ts=table([m("X"),m("Y")],rows)
    if from_data:
        giv=f"The positive variables {m('x')} and {m('y')} satisfy an unknown relation. The table shows points on the straight line obtained using {m('X='+X)} and {m('Y='+Y)}.<br>{ts}"
        first=part("Find the gradient of the straight line.",m(slope),
            [f"Compute the change in {m('Y')} divided by the change in {m('X')} for two rows of the table.",
             f"The pairs lie on {m(line(slope,intercept,'X','Y'))}."],"Find the gradient from two transformed pairs.",field(slope,label="Gradient"))
        second=part("Find an equation relating the original variables.",m(relation),
            [f"Use a table point to find the intercept {m(intercept)}. The transformed equation is {m(recovered)}.",
             inverse],"Find the transformed intercept and undo both substitutions.",intermediate=("Obtain an equation in X and Y from the table.",))
    else:
        giv=f"The positive variables {m('x')} and {m('y')} satisfy {m(relation)}. A straight graph is drawn with {m('X='+X)} on the horizontal axis."
        opts=(m(Y),m('y'),m('1/y'),m('xy'))
        first=part("Which expression should go on the vertical axis?",m("Y="+Y),
            [explain,f"That gives {m('Y='+Y)} and {m(line(slope,intercept,'X','Y'))}."],"Undo the outside operation to get a linear expression in X.",choose(list(opts),i))
        second=part("Give the gradient and vertical intercept of the transformed line.",f"{m(tex(slope))} and {m(tex(intercept))}, respectively.",
            [f"Write the transformed relation as {m(line(slope,intercept,'X','Y'))}."],"Read both constants from the line in gradient–intercept form.")
    third=part(f"Use the relation to find the exact value of {m('y')} at {m('x='+str(newx))}.",m(tex(Fvalue)),
        [f"Substitute the original {m('x')} coordinate into {m(relation)} and simplify."],"Use the original coordinate, then reverse the vertical-axis transformation if needed.")
    return problem(story,giv,first,second,third)


def reverse_transform(i, mode=0):
    p,q,r=data(i)
    a,b=p+2,q+1
    if mode==0:
        X="x^3"; Y="y^2"
        post=rf"y=\sqrt{{{a}x^3+{b}}}"
        x=1+r
        val,_=radical(a*x**3+b)
        note=f"Take the positive square root because {m('y>0')}."
        bad=(rf"y=\sqrt{{{a}x^3}}+{b}",f"y={a}x^3+{b}",rf"y=\left({a}x^3+{b}\right)^2")
    elif mode==1:
        X="x^2"; Y="e^{2y}"
        post=rf"y=\frac{{1}}{{2}}\ln({a}x^2+{b})"
        x=1+r;val=rf"\frac{{1}}{{2}}\ln {a*x*x+b}"
        note=f"Take natural logs and then divide the resulting equation for {m('2y')} by two."
        bad=(rf"y=\ln({a}x^2+{b})",rf"y=\sqrt{{{a}x^2+{b}}}",rf"y=2\ln({a}x^2+{b})")
    else:
        X=r"\ln x"; Y="y^3"
        post=rf"y=\sqrt[3]{{{a}\ln x+{b}}}"
        x="e"
        val=rf"\sqrt[3]{{{a+b}}}"
        note=f"Take the cube root of the entire right side."
        bad=(rf"y=\sqrt[3]{{{a}\ln x}}+{b}",rf"y={a}\ln x+{b}",rf"y=\left({a}\ln x+{b}\right)^3")
    giv=f"For {m('x>0')} and {m('y>0')}, the graph of {m('Y='+Y)} against {m('X='+X)} has equation {m(line(a,b,'X','Y'))}."
    return problem("Read back from transformed axes",giv,
        part(f"Select the resulting equation for {m('y')} in terms of {m('x')}.",m(post),
             [f"Replace the axis names by their definitions to get {m(Y+'='+poly({1:a,0:b},X))}.",note],
             "Replace the transformed variables, then isolate y.",choose([m(post),*map(m,bad)],i)),
        part(f"Find the exact value of {m('y')} at {m('x='+str(x))}.",m(val),
             [f"Evaluate the relation {m(post)} at the original input."],"Use the original x-coordinate."),
        part(f"Give the transformed vertical intercept and say whether {m('x=0')} is allowed.",
             f"The intercept is {m(b)}. The domain requires {m('x>0')}.",
             [f"The graph's vertical intercept uses {m('X=0')}. A graph intercept can lie outside the given domain, so read it as the parameter of the line."],
             "Distinguish a model parameter from an admissible input.",fact=True))


def exponential_data(i, mode=0):
    p,q,r=data(i)
    a,b=2+p,2+r
    # Exact powers of b turn the graph of log_b y against x into a line with integer slope.
    c=1+(q%4)
    original=m(f"y={a}({b**c})^x")
    trans=m(r"\log_{"+str(b)+"}y="+poly({1:c},'x')+r"+\log_{"+str(b)+"}"+str(a))
    if mode==0:
        giv=f"A positive quantity has the form {m('y=Ab_0^x')}. Two exact readings are {m('y='+str(a))} at {m('x=0')} and {m('y='+str(a*b**(3*c)))} at {m('x=3')}."
        first=part(f"Find the value of {m('b_0')}.",m(b**c),
             [f"The zero input gives {m('A='+str(a))}. Divide the second value by {m(a)} and take the positive cube root."],
             "Use the ratio of outputs three steps apart.",field(b**c,label="Multiplying factor"))
    elif mode==1:
        given_table=table([m("x"),m("y")],[(m(j),m(a*b**(j*c))) for j in (0,2,4)])
        giv=f"The measurements in the table are modelled by {m('y=Ab_0^x')} with positive constants.<br>{given_table}"
        first=part("Find the multiplying factor over one unit of x.",m(b**c),
              [f"Two steps multiply the output by {m(b**(2*c))}. Taking the positive square root gives the multiplier per step."],
              "Use a ratio and take its square root.",field(b**c,label="One-step multiplier"))
    else:
        giv=f"Plotting {m(r'\log_{'+str(b)+'}y')} against {m('x')} gives the straight line {trans}."
        first=part(f"Find the initial value of {m('y')}.",m(a),
            [f"At zero input, {m(r'\log_{'+str(b)+r'}y=\log_{'+str(b)+'}'+str(a))}. Undo the logarithm."],
            "Undo the transformed intercept.",field(a,label="Initial output"))
    return problem("Find a constant multiplication factor",giv,first,
        part("Find the equation of the untransformed graph.",original,
             [f"The zero input is {m(a)}. Each one-unit step in {m('x')} multiplies {m('y')} by {m(b**c)}.",
              f"The transformed equation {trans} would use the gradient {m(c)}."],
             "Use the initial value and per-step multiplier."),
        part(f"Find the exact value of the model at {m('x=1')}.",m(a*b**c),
             [f"Multiply the initial value by one power of {m(b**c)}."],"Use the one-step multiplier."))


def lessons():
    distance_plot=grid(SLUG,"gradient-steps","A line segment, its midpoint and a rise–run triangle",
        "The same direction is used for the horizontal and vertical differences.",xrange=(-4,6),yrange=(-3,5),equal=True,
        curves=((([(-3,-2),(5,4)]),"#116850"),),guides=((([(-3,-2),(5,-2),(5,4)]),"#a15821"),),
        dots=((-3,-2,"A"),(1,1,"M"),(5,4,"B")))
    angle_plot=grid(SLUG,"perpendicular-bisector","A segment AB and its perpendicular bisector meeting at M",
        "The lines meet at a right angle at the midpoint M.",xrange=(-5,5),yrange=(-5,5),equal=True,ticks=False,
        curves=((([(-4,-2),(4,2)]),"#176a50"),(([(-2.4,4.8),(2.4,-4.8)]),"#285491")),dots=((-4,-2,"A"),(4,2,"B"),(0,0,"M")),
        guides=((([(0.65,0.325),(0.325,0.975),(-0.325,0.65)]),"#a15821"),))
    intercept_plot=grid(SLUG,"line-intersection","Two straight lines cross at a marked point",
        "The point of intersection satisfies both equations.",xrange=(-3,6),yrange=(-3,6),equal=True,
        curves=((([(-3,-3),(6,6)]),"#116850"),(([(-3,6),(6,-3)]),"#a15821")),dots=((1.5,1.5,"P"),))
    area_plot=grid(SLUG,"axis-triangle","A line and the coordinate axes enclose a right triangle",
        "The intercepts give the base and perpendicular height.",xrange=(-1,7),yrange=(-1,5),equal=True,
        curves=((([(-1,14/3),(7,-2/3)]),"#12624c"),),highlights=(([(0,0),(6,0),(0,4)],"#daf2e9","#167352"),),
        dots=((0,0,"O"),(6,0,"A"),(0,4,"B")))
    transform_plot=grid(SLUG,"transformed-fit","Three points on a straight line in transformed coordinates",
        "The horizontal axis is X, the chosen expression in x. The vertical axis is Y, the chosen expression in y.",
        xrange=(-1,6),yrange=(-1,7),curves=((([(-1,1),(5,7)]),"#176a50"),),dots=((1,3,"A"),(2,4,"B"),(4,6,"C")),axes=("X","Y"))
    return (
        Lesson("distance-midpoint-gradient","Distance, midpoints and gradients",
            "Move between coordinates, lengths, midpoints and gradients without reversing one difference.",
            (
                Section("length","How far apart are the two points?","Draw the right triangle under the segment. The horizontal and vertical displacements give its two shorter sides.",
                    f"Distance is {m(r'\sqrt{(x_2-x_1)^2+(y_2-y_1)^2}')}. A negative displacement still contributes a positive square.",
                    "Add the squared changes before taking a square root.",
                    "Leave a surd in exact form unless the question asks for a rounded distance.",components,distance_plot),
                Section("midpoint","How can I recover a missing endpoint?","Write a separate average for x and for y. Read each equation backwards to recover the unknown coordinate.",
                    f"For a segment with midpoint {m('M')}, its missing end is found by doubling each coordinate of {m('M')} and subtracting the corresponding known coordinate.",
                    "Averaging x with y mixes the directions.",
                    "Substitute the recovered end into the original coordinate averages.",lambda i:components(i,1)),
                Section("gradient","How do I give a signed gradient?","Keep the same point order in both differences. A graph slopes upwards to the right when the gradient is positive.",
                    f"Gradient is {m(r'\frac{\Delta y}{\Delta x}')}. It is undefined when the horizontal change is zero.",
                    "A negative gradient can come from a positive horizontal change and a negative vertical change.",
                    "A negative gradient cannot be a negative length.",lambda i:components(i,2)),
            ),(("Gradient","Vertical change divided by horizontal change."),("Midpoint","The point halfway along a segment."),
               ("Displacement","A signed change in position."),("Surd","An exact irrational root left in root notation.")),9),
        Lesson("parallel-perpendicular","Parallel and perpendicular lines","Use direction conditions to find lines and missing coordinates.",
            (
                Section("parallel","What do parallel lines have in common?","Horizontal progress of one unit produces the same vertical change on parallel lines.",
                        "Parallel non-vertical lines have equal gradients. Distinct intercepts give distinct parallel lines.",
                        "A common gradient and intercept describe the same line.",
                        "Rearrange the given equation for y before reading the gradient.",parallel),
                Section("perpendicular","Which gradient gives a right angle?","Switch rise and run, then change one sign. This makes the gradient the negative reciprocal.",
                        f"Non-vertical perpendicular lines have gradient product {m('-1')}. A horizontal line and a vertical line are perpendicular.",
                        "Negating without taking the reciprocal normally produces the wrong angle.",
                        "Test a horizontal or vertical line separately before using a reciprocal.",perpendicular,angle_plot),
                Section("bisector","Where does a perpendicular bisector pass?","Its name gives two conditions. The required line is perpendicular and passes through the midpoint.",
                        "A point lies on a perpendicular bisector precisely when it is the same distance from the two ends.",
                        "The perpendicular through an endpoint is a different line.",
                        "Find the midpoint and gradient in separate lines of working.",lambda i:perpendicular(i,2),extension=True),
            ),(("Parallel","Two distinct straight lines with the same direction."),("Perpendicular","Meeting at a right angle."),
               ("Negative reciprocal","Reciprocal with the opposite sign."),("Bisector","A line that divides a segment into two equal lengths.")),14,
            (parallel,lambda i:parallel(i,1),perpendicular,lambda i:perpendicular(i,1),lambda i:perpendicular(i,2))),
        Lesson("line-equations-intersection","Line equations and intersections","Write line equations in standard forms and solve for their single shared point.",
            (
                Section("equation","How does a point fix the position of a line?","A gradient fixes the direction. Substituting one point fixes the remaining constant.",
                    f"Either use {m('y=mx+c')} and solve for {m('c')}, or write {m('y-y_1=m(x-x_1)')}.",
                    "The y-coordinate of the given point is its intercept only if its x-coordinate is zero.",
                    "Check the final equation with both given points when possible.",intersection),
                Section("meeting","Where do two lines meet?","At the intersection the same ordered pair satisfies both equations.",
                    f"If both equations give {m('y')}, set their right-hand sides equal, then substitute the resulting x-coordinate back.",
                    "The x-coordinate alone does not describe the intersection.",
                    "Use the simpler equation to find y, then verify the pair in the other equation.",lambda i:intersection(i,1),intercept_plot),
                Section("standard-form","When is standard form useful?","Standard form puts the variable terms together and can help with simultaneous elimination.",
                    f"Forms such as {m('ax+by=c')} and {m('y=mx+c')} describe the same line when one is obtained by valid rearrangement.",
                    "The sign of the x-coefficient changes when you move the x-term to the other side.",
                    "Use exact fractions or clear denominators across the whole equation.",lambda i:intersection(i,2),extension=True),
            ),(("Gradient–intercept form","The form "+m("y=mx+c")+"."),("Standard form","An equation of the form "+m("ax+by=c")+"."),
               ("Elimination","Removing an unknown using two equations."),("Intersection","A point shared by the graphs.")),11),
        Lesson("areas-from-lines","Areas from coordinates and lines","Use intercepts or an appropriate diagonal to identify perpendicular heights.",
            (
                Section("intercepts","How do intercepts give a triangle's area?","The axes meet at right angles. Find their intersections with the third side to identify the base and height.",
                    f"An x-intercept has {m('y=0')} and a y-intercept has {m('x=0')}. Use their positive distances from the origin in the area formula.",
                    "Find the two intercepts by setting a different coordinate to zero each time.",
                    "A negative intercept can still give a positive length.",area,area_plot),
                Section("heights","What is the height when the base is vertical?","Use a horizontal measurement from the opposite vertex to the line through the base.",
                    f"For a vertical base on {m('x=c')}, a point with x-coordinate {m('u')} has perpendicular distance {m('|u-c|')} from that line.",
                    "A sloping side does not normally give the perpendicular height.",
                    "Sketch the base and draw a small perpendicular mark beside the height.",lambda i:area(i,1)),
                Section("split","How can one diagonal simplify an outline?","Choose a diagonal that is horizontal or vertical. It gives both smaller triangles a convenient common base.",
                    f"Each triangle contributes {m(r'\frac{1}{2}bh')}. With a common base, compare their areas by comparing their heights.",
                    "Check whether the two heights run to opposite sides of the line before adding the regions.",
                    "State which base and height you used for each contribution.",lambda i:area(i,2),extension=True),
            ),(("Intercept","Where a graph meets one of the axes."),("Diagonal","A segment connecting non-consecutive vertices."),
               ("Perpendicular height","Distance measured at a right angle to the base."),("Area units","Square units, such as cm².")),8),
        Lesson("make-model-linear","Changing the variables to obtain a straight line",
            "Choose transformed axes and interpret the gradient and intercept.",
            (
                Section("reciprocal","Which operations make a straight-line pattern?","Undo the outer function first. Then look for one expression of x with a constant multiple and a constant term.",
                    f"In {m(r'\sqrt y=a+b/x')}, the two axis variables can be {m(r'Y=\sqrt y')} and {m(r'X=1/x')}. The relation then has the form {m('Y=bX+a')}.",
                    "The heading ‘Y against X’ puts Y on the vertical axis.",
                    "Write the two axis definitions before giving the gradient or intercept.",model),
                Section("power","How can a power model give a straight line?","A logarithm turns powers into multipliers and products into sums.",
                    f"For {m('y=Ax^n')}, plot {m(r'\log y')} against {m(r'\log x')}. The gradient is {m('n')} and the intercept is {m(r'\log A')}.",
                    "The intercept is a logarithm of A. Undo it to find A itself.",
                    "Use the same base for the logarithms on both axes.",lambda i:model(i,1),transform_plot),
                Section("exponential","How does a logarithm undo an exponential model?","An exponential with base e becomes its exponent when you take the natural logarithm.",
                    f"If {m('y=e^{ax^2+b}')}, use {m(r'Y=\ln y')} and {m('X=x^2')}. In {m('Y=aX+b')}, identify the constants by their roles.",
                    "Choose a horizontal variable that accounts for the power of x in the exponent.",
                    "Restore the original x and y after reading the parameters.",lambda i:model(i,2),extension=True),
            ),(("Linearise","Choose variables that give a straight line."),("Transformed variable","An expression plotted in place of an original variable."),
               ("Power model","A relation of the form "+m('y=Ax^n')+"."),("Natural logarithm","The logarithm with base e.")),15,
            (model,lambda i:model(i,1),lambda i:model(i,2),exponential_data)),
        Lesson("recover-original-relation","Recovering relations from transformed graphs",
            "Replace transformed variables and undo the corresponding operations in the right order.",
            (
                Section("powers","How do I undo squares and cubes?","Read the transformed axes literally. A plot of y² against x³ does not give y directly.",
                    f"If {m('Y=y^2')} and {m('X=x^3')}, use {m('y^2=ax^3+b')}. Choose the square-root branch using the domain.",
                    "The root must cover the entire original expression for y².",
                    "If the question gives y positive, explain the branch you use.",reverse_transform),
                Section("logs","What happens when the vertical axis is exponential?","Replace the axis name with the exponential. Then choose the appropriate logarithm.",
                    f"From {m('e^{2y}=ax^2+b')}, take natural logs to get {m(r'2y=\ln(ax^2+b)')} before dividing by two.",
                    "A factor in the exponent is still present after taking logs.",
                    "The argument of any logarithm must be positive.",lambda i:reverse_transform(i,1),transform_plot),
                Section("cube-root","How do I undo mixed transformations?","Replace X and Y first. Focus on recovering the original output in the form requested.",
                    f"If {m(r'X=\ln x')} and {m('Y=y^3')}, then {m(r'y=\sqrt[3]{a\ln x+b}')}.",
                    "A cube root of a sum cannot be split into two cube roots.",
                    "Use the model only on the original domain supplied in the question.",lambda i:reverse_transform(i,2),extension=True),
            ),(("Branch","The output choice when reversing a non-one-to-one operation such as squaring."),
               ("Inverse operation","An operation that reverses another."),("Intercept","The transformed output at zero transformed input.")),11),
        Lesson("data-and-predictions","Finding and using a straight-line model from data",
            "Read transformed tables, recover original parameters and predict outputs.",
            (
                Section("table","Which numbers belong in the gradient formula?","Use two compatible pairs. Every row must refer to the same choices of X and Y.",
                    "Find the gradient in transformed coordinates, substitute one row for the intercept, and test a third row.",
                    "Mixing an original x-value with a transformed Y-value changes the gradient.",
                    "Label your working columns X and Y before fitting the line.",lambda i:model(i,0,True),transform_plot),
                Section("ratio","What can a constant multiplying factor tell me?","For an exponential graph, equal steps in input produce equal ratios of outputs.",
                    f"For {m('y=Ab^x')}, a step of {m('h')} gives an output ratio of {m('b^h')}, so recover {m('b')} by taking a positive root.",
                    "A table step of two units gives the square of the one-unit multiplier.",
                    "Use the exact ratio before taking a root.",lambda i:exponential_data(i,1)),
                Section("prediction","How do I use the original model to predict?","Use the requested original x-value in the recovered model, even when the fitted line used different axis variables.",
                    "A transformed intercept may give a parameter such as a logarithm of the initial value. Apply the inverse operation to interpret it.",
                    "The transformed output is generally not the value requested in the original question.",
                    "Check whether the requested value is within the model domain before evaluating.",lambda i:model(i,2,True),extension=True),
            ),(("Model parameter","A constant that controls a relationship."),("Multiplying factor","The proportional change per selected input step."),
               ("Prediction","An output computed from the fitted relationship."),("Domain","Allowed original inputs.")),12,
            (lambda i:model(i,0,True),lambda i:model(i,1,True),lambda i:model(i,2,True),
             exponential_data,lambda i:exponential_data(i,1),lambda i:exponential_data(i,2))),
    )


if __name__=="__main__":
    build(SLUG,"Straight-line graphs",5,"lines",lessons(),__file__)
