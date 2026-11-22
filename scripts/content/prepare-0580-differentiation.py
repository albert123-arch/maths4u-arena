"""Generate original Cambridge 0580 Extended E2.12 notes and practice."""

from fractions import Fraction as F
from hashlib import sha256
from html import escape
import json
from math import ceil, floor
from pathlib import Path


ROOT=Path(__file__).resolve().parents[2]
COURSE="maths4u-0580"
PREFIX="igcse-0580-diff-"
DATE="2026-11-22"
DY=r"\frac{\mathrm{d}y}{\mathrm{d}x}"
D2=r"\frac{\mathrm{d}^{2}y}{\mathrm{d}x^{2}}"
WIDTH,HEIGHT=420,240


def p(text):
    return f"<p>{text}</p>"


def m(tex):
    return r"\("+escape(str(tex),quote=False)+r"\)"


def fraction(value,tex=True):
    value=F(value)
    if value.denominator==1:
        return str(value.numerator)
    sign="-" if value<0 else ""
    if tex:
        return sign+fr"\frac{{{abs(value.numerator)}}}{{{value.denominator}}}"
    return str(value)


def fmt_poly(terms,tex=True):
    result=[]
    for degree,coef in sorted(terms.items(),reverse=True):
        if not coef:
            continue
        sign="-" if coef<0 else "+"
        symbol="" if degree==0 else "x" if degree==1 else f"x^{degree}"
        value="" if abs(coef)==1 and symbol else fraction(abs(coef),tex)
        if not tex and "/" in value and symbol:
            value=f"({value})"
        result.append(sign+value+symbol)
    return "".join(result).lstrip("+") or "0"


def derivative(terms):
    return {d-1:d*coef for d,coef in terms.items() if d>0 and coef}


def evaluate(terms,x):
    return sum(coef*x**d for d,coef in terms.items())


def point(x,y,tex=True):
    return "("+fraction(x,tex)+","+fraction(y,tex)+")"


def task(title,prompt,label,value,answer,steps,method,hint,wrong=(),*,kind="number",options=None,
         asset=None,write=None,manual=None):
    field=dict(key="answer",label=label,type=kind,expected=str(value))
    if kind=="polynomial":
        field["variables"]=["x"]
    if options is not None:
        field["options"]=options
    retry={str(bad):p(feedback) for bad,feedback in wrong if str(bad)!=str(value)}
    return dict(title=title,prompt=p(prompt),field=field,answer=answer,solution=[p(text) for text in steps],mark=p(method),hint=p(hint),
                retry=[dict(answer=bad,feedback=feedback) for bad,feedback in retry.items()],asset=asset,write=p(write) if write else None,manual=manual)


def numeric(title,prompt,label,result,steps,method,hint,wrong=(),asset=None):
    return task(title,prompt,label,result,m(fraction(result)),steps,method,hint,wrong,asset=asset)


def choose(seed,title,prompt,answer,distractors,steps,method,hint,write=None):
    labels="ABCD"
    labels=labels[seed%4:]+labels[:seed%4]
    options=dict(sorted([(labels[0],answer),*zip(labels[1:],[v[0] for v in distractors])]))
    assert len(set(options.values()))==4,title
    return task(title,prompt,"Choose one answer",labels[0],answer,steps,method,hint,
        list(zip(labels[1:],[v[1] for v in distractors])),kind="choice",options=options,write=write)


def tangent_model(seed):
    x=seed%9-4
    y=seed%17-7
    slope=F((3,4,6,7,8,9)[seed%6],2)
    if seed%4<2:
        slope=-slope
    curvature=F(1 if seed%2 else -1,2)
    return x,y,slope,curvature


def read_tangent(seed):
    x,y,slope,bend=tangent_model(seed)
    left=x-2,y-2*slope
    right=x+2,y+2*slope
    rise=right[1]-left[1]
    raw=f"Two measured points on a tangent at {m('P')} are {m('A'+point(*left))} and {m('B'+point(*right))}."
    return numeric("Use two points on the same tangent",raw+" Calculate the gradient of the marked tangent.","Gradient",slope,
        [f"Go from A to B. The signed change in height is {m(fraction(rise))} and the change in x is {m(4)}.",
         f"Divide the change in height by the change in x. The gradient is {m(fraction(slope))}."],
        "Use both points on the tangent and divide signed vertical change by horizontal change.","Subtract the two y-values in the same order as the two x-values.",
        [(abs(slope),"The line slopes down as x increases, so use a negative gradient."), (1/slope,"Gradient is vertical change divided by horizontal change."),
         (rise,"Divide this vertical change by the horizontal change.")],asset=("tangent",(x,y,slope,bend),True))


def tangent_steps(seed):
    run=3+seed%9
    rise=4+seed%11
    if seed%2:
        rise=-rise
    result=F(rise,run)
    return numeric("Read the signed rise and run",f"A pupil moves {run} units right along a tangent. The line goes {'up' if rise>0 else 'down'} {abs(rise)} units. Find the gradient of the tangent exactly.","Gradient",result,
        [f"The run is {m(run)}. The vertical change is {m(rise)} because the line goes {'up' if rise>0 else 'down'}.",
         f"Divide vertical change by horizontal change to get {m(fraction(result))}."],
        "Assign the correct sign to the rise and divide by the run.","Read the line from left to right. A downward change in y is negative.",
        [(F(run,rise),"Use rise over run, not the inverse."),(-result,"Check the sign of the vertical change as you move right.")])


def tangent_measurement(seed):
    x,y,slope,_=tangent_model(seed)
    delta=2+seed%4
    from_x=x-delta
    from_y=F(y)-slope*delta
    to_x=x+delta
    run=2*delta
    rise=2*delta*slope
    return numeric("Measure a longer segment of a tangent",f"For a drawn tangent at {m(f'x={x}')}, a point on the line is {m(point(from_x,from_y))}. Moving along the line to {m(f'x={to_x}')} gives a vertical change of {m(fraction(rise))}. What gradient does this estimate?", "Gradient",slope,
        [f"The horizontal change is {m(fr'{to_x}-({from_x})={run}')}.", f"Divide the signed vertical change {m(fraction(rise))} by the horizontal change. This gives {m(fraction(slope))}."],
        "Subtract the two x-coordinates for the run and divide the stated rise by it.","The horizontal change uses both x-coordinates of the measurement.",
        [(rise/abs(to_x),"Use the difference between the two x-coordinates for the run.")] if to_x else [])


def draw_tangent(seed):
    x,y,slope,bend=tangent_model(seed+1000)
    expected=m(fraction(slope))
    return dict(title="Draw a tangent and estimate its gradient",prompt=p(f"The graph shows a curve and the point {m('P'+point(x,y))}. Use a ruler to draw a tangent to the curve at P and estimate its gradient. Show the coordinates used."),
        field=None,answer=f"A suitable estimate is {expected}.",
        solution=[p("Draw a long straight line through P that follows the local direction of the curve. Read two clear points on that line."),
                  p(f"For the illustrated tangent, the two points are {m(point(x-2,y-2*slope))} and {m(point(x+2,y+2*slope))}. Divide the signed rise by the run to get {expected}." )],
        hint=p("Choose points well apart on your drawn tangent. Points on the curve are used only if they lie on the tangent as well."),
        asset=("tangent",(x,y,slope,bend),False),write=None,
        manual=([("M1",p("Draw a plausible tangent through P with a ruler.")),("M1",p("Use two separated points on that line and calculate signed rise divided by run.")),
                 ("A1",p(f"A defensible estimate within {m('0.3')} of {expected}, supported by the tangent and working."))], ("tangent",(x,y,slope,bend),True)))


def differentiating(seed,mode):
    if mode=="single":
        power=2+seed%5
        terms={power:F(2+seed%13,2+seed%4)*(-1 if seed%2 else 1)}
    elif mode=="constant":
        terms={0:3+seed%101}
    else:
        terms={3+seed%4:F(2+seed%13,1+seed%4),1:-(2+seed%15),0:3+seed%17}
    output=derivative(terms)
    expr=m("y="+fmt_poly(terms))
    result=m(DY+"="+fmt_poly(output))
    if mode=="constant":
        steps=["The graph is a horizontal line. Its y-value stays fixed as x changes.",f"Its gradient is always zero, so {result}."]
        wrong=[(fmt_poly(terms,False),"The y-value is constant. Its change, and therefore the gradient, is zero.")]
    else:
        steps=[f"Multiply the coefficient of each power by its original exponent. Reduce the exponent by one. A term in x becomes its coefficient.",
               f"A constant contributes zero. Combine the remaining terms to obtain {result}."]
        wrong=[(fmt_poly(terms,False),"This is the original curve. The gradient function comes from the power rule."),
               (fmt_poly({d-1:c for d,c in terms.items() if d},False),"Reducing the exponent is one step. Multiply each coefficient by its original exponent first.")]
    value=fmt_poly(output,False)
    return task("Differentiate a constant" if mode=="constant" else "Find the gradient function",
        f"Given {expr}, find {m(DY)}. Give the expression for the derivative.","Expression for dy/dx",value,result,steps,
        "Apply the power rule to each nonconstant term and replace any constant by zero.","Multiply by the old power before taking one off that power.",
        wrong,kind="polynomial")


def power_rule(seed):
    return differentiating(seed,"single")


def const_rule(seed):
    return differentiating(seed,"constant")


def sum_rule(seed):
    return differentiating(seed,"sum")


def gradient_value(seed):
    a=2+seed%9
    b=3+seed%11
    c=2+seed%19
    x=1+seed%5
    if seed%2:
        x=-x
    terms={3:a,1:-b,0:c}
    grad=derivative(terms)
    result=evaluate(grad,x)
    return numeric("Find the exact gradient at a point",f"The curve has equation {m('y='+fmt_poly(terms))}. Find its gradient at {m(f'x={x}')}.","Gradient",result,
        [f"First differentiate to obtain {m(DY+'='+fmt_poly(grad))}.",f"Substitute {m(f'x={x}')} into this derivative. The gradient is {m(fraction(result))}."],
        "Differentiate the curve and substitute the requested x into the derivative.","Use the x-value in the gradient function rather than in the equation for y.",
        [(evaluate(terms,x),"That is a value of y. The gradient comes from differentiating first."),(3*a*x*x,"Include the derivative of the linear term as well.")])


def cubic(seed):
    a=1+seed%4
    if seed%3==0:
        a=-a
    h=1+seed%4
    c=seed%23-9
    return {3:a,1:-3*a*h*h,0:c},h


def quadratic(seed):
    a=1+seed%7
    if seed%2:
        a=-a
    x=(2+seed%13)%9-4
    if not x:
        x=5
    c=seed%17-4
    return {2:a,1:-2*a*x,0:c},x


def point_task(title,prompt,points,steps,method,hint,wrong=()):
    key=", ".join(point(*pair,tex=False) for pair in points)
    answer=m(r",\quad ".join(point(*pair) for pair in points))
    return task(title,prompt,"Coordinates (x, y)",key,answer,steps+[f"The resulting coordinates are {answer}."],method,hint,wrong,kind="pairs")


def stationary_quadratic(seed):
    terms,x=quadratic(seed)
    grad=derivative(terms)
    y=evaluate(terms,x)
    return point_task("Find both coordinates of a stationary point",
        f"Find the coordinates of the stationary point on {m('y='+fmt_poly(terms))}.",[(x,y)],
        [f"Solve {m(DY+'='+fmt_poly(grad)+'=0')}. It gives {m(f'x={x}')}.",f"Substitute {m(x)} into the original equation for y to find {m(f'y={fraction(y)}')}."],
        f"Set {m(DY)} equal to zero to find x, then use the original curve to calculate y.","At a stationary point the gradient is zero, but the y-coordinate need not be zero.",
        [(point(x,0,False),"The derivative is zero here. Find the y-coordinate from the original expression.")])


def stationary_cubic(seed):
    terms,h=cubic(seed)
    grad=derivative(terms)
    points=[(-h,evaluate(terms,-h)),(h,evaluate(terms,h))]
    return point_task("Find the two stationary points of a cubic",
        f"Find all stationary points of {m('y='+fmt_poly(terms))}. Give both coordinate pairs.",points,
        [f"Set {m(DY+'='+fmt_poly(grad))} to zero. The equation reduces to {m(f'x^2={h*h}')}.",
         f"Both {m(f'x=-{h}')} and {m(f'x={h}')} work. Substitute both into the equation for y separately."],
        "Set the derivative equal to zero, retain both roots and substitute each into the original curve.","There are two signs when solving the equation for x squared.",
        [(point(*points[0],tex=False),"This is one correct point. Include the other root and its matching y-value."),
         (point(*points[1],tex=False),"This is one correct point. The negative root gives another stationary point.")])


def stationary_x(seed):
    terms,h=cubic(seed+11)
    grad=derivative(terms)
    return task("Find every x-value where the tangent is horizontal",
        f"At which values of {m('x')} is the tangent to {m('y='+fmt_poly(terms))} horizontal?", "All x-values", f"{-h},{h}",m(fr'x=-{h}\;\mathrm{{or}}\;x={h}'),
        [f"Horizontal means {m(DY+'=0')}. Solve {m(fmt_poly(grad)+'=0')}.",f"Both {m(-h)} and {m(h)} satisfy that equation."],
        "Set the derivative equal to zero and include both solutions.","A horizontal tangent has zero gradient.",[(str(h),"Also include the negative root of the squared equation.")],kind="set")


def specified_gradient(seed):
    a=1+seed%9
    b=2+seed%13
    c=seed%23-11
    x=seed%13-6
    terms={2:a,1:b,0:c}
    grad=derivative(terms)
    value=evaluate(grad,x)
    return numeric("Find a position from a stated gradient",
        f"At what value of {m('x')} does {m('y='+fmt_poly(terms))} have gradient {m(value)}?","Value of x",x,
        [f"Differentiate to obtain {m(DY+'='+fmt_poly(grad))}.",f"Set the gradient function equal to {m(value)} and solve. This gives {m(f'x={x}')}."] ,
        "Set the derivative equal to the stated gradient and solve for x.","The gradient value is the result of the derivative, not its input.",
        [(value,"The question gives that gradient. Solve the derivative equation to find x.")])


def nature(seed,method):
    terms,h=cubic(seed)
    x=h if seed%2 else -h
    grad=derivative(terms)
    second=derivative(grad)
    at=evaluate(second,x)
    left=evaluate(grad,x-F(1,2))
    right=evaluate(grad,x+F(1,2))
    minpoint=at>0
    correct="Local minimum" if minpoint else "Local maximum"
    wrong="Local maximum" if minpoint else "Local minimum"
    label=f"The curve {m('y='+fmt_poly(terms))} has a stationary point at {m(f'x={x}')}."
    if method=="signs":
        rest=" Use the signs of the gradients just to either side."
        steps=[f"Differentiate to find {m(DY+'='+fmt_poly(grad))}.",
               f"At {m(fraction(x-F(1,2)))} the gradient is {m(fraction(left))}. At {m(fraction(x+F(1,2)))} it is {m(fraction(right))}.",
               f"The graph changes from {'decreasing to increasing' if minpoint else 'increasing to decreasing'}. Therefore it is a {correct.lower()}."]
        why="A decreasing curve followed by an increasing curve makes a minimum." if minpoint else "An increasing curve followed by a decreasing curve makes a maximum."
        mark="Use the derivative to identify its signs on both sides of the stationary point."
        key="Test the gradient on both sides"
    else:
        rest=" Use the second derivative."
        steps=[f"The first derivative is {m(fmt_poly(grad))}. Differentiate it again to get {m(D2+'='+fmt_poly(second))}.",
               f"At the stationary x-value this is {m(fraction(at))}. Its sign gives a {correct.lower()}."]
        why="The second derivative is positive at the stationary point, so the graph bends upwards there." if minpoint else "The second derivative is negative at the stationary point, so the graph bends downwards there."
        mark="Differentiate the gradient function and evaluate the second derivative at the stationary x-value."
        key="Use the second derivative at a stationary point"
    return choose(seed,key,label+rest+" What is the nature of this stationary point?",correct,
        [(wrong,why),("The point is an x-intercept because its gradient is zero.","Zero gradient gives a horizontal tangent. It does not give y = 0."),
         ("The information is insufficient to decide.","Apply the indicated test to the given equation and position.")],
        steps,mark,"Identify the requested method, and apply it at or around the stated stationary point as appropriate.",
        write=label+rest+" Determine its nature and show your working.")


def classify_signs(seed):
    return nature(seed,"signs")


def classify_second(seed):
    return nature(seed,"second")


def second_derivative(seed):
    terms,_=cubic(seed+19)
    grad=derivative(terms)
    second=derivative(grad)
    x=(seed%5+1)*(-1 if seed%2 else 1)
    result=evaluate(second,x)
    return numeric("Evaluate the second derivative",f"For {m('y='+fmt_poly(terms))}, find the value of {m(D2)} at {m(f'x={x}')}.","Value of the second derivative",result,
        [f"First obtain {m(DY+'='+fmt_poly(grad))}. Differentiate this to get {m(D2+'='+fmt_poly(second))}.",
         f"Substitute {m(f'x={x}')} into the second derivative. Its value is {m(fraction(result))}."],
        "Differentiate twice and use the given x in the second derivative.","Differentiate the first derivative before substituting the x-value.",
        [(evaluate(grad,x),"That is the first derivative evaluated at the point. Differentiate once more before substituting."),
         (evaluate(terms,x),"This is a y-coordinate. The question asks for the second derivative's value.")])


def sign_from_data(seed):
    negative=seed%2==0
    place=seed%17-7
    a,b=2+seed%5,3+seed%7
    left=-a if negative else a
    right=b if negative else -b
    correct="Local minimum" if negative else "Local maximum"
    wrong="Local maximum" if negative else "Local minimum"
    stem=f"The curve is smooth near {m(f'x={place}')}. At this stationary point its tangent is horizontal. The gradient is {m(left)} just before it and {m(right)} just after it."
    return choose(seed,"Recognise a turn from gradient signs",stem+" What is the nature of the point?",correct,
        [(wrong,"Read the order of the signs from left to right. A minimum goes down and then up. A maximum goes up and then down."),
         ("The y-coordinate is zero.","The gradient is zero at the stationary point. Its height is not given."),
         ("The gradient data cannot distinguish the two cases.","The sign changes show the direction of the curve either side of the point.")],
        [f"The signed gradients go from {'negative to positive' if negative else 'positive to negative'}.",f"That means the curve turns at a {correct.lower()}."],
        "Use the sign change to identify the local shape of the curve.","Picture the direction of motion from left to right on each side of the point.",
        write=stem+" Determine the nature of the stationary point and give a reason.")


def intercept(seed):
    terms,_=cubic(seed+29)
    y=terms[0]
    return point_task("Find the point where the sketch meets the y-axis",f"For a sketch of {m('y='+fmt_poly(terms))}, find the y-intercept. Give its coordinates.",[(0,y)],
        [f"On the y-axis, {m('x=0')}. Substitute into the original equation.",f"Every power of x vanishes. The constant gives {m(f'y={y}')}."],
        "Set x to zero in the original curve equation and give the coordinates.","Use x = 0 in the original curve equation to find the y-intercept.",
        [(point(y,0,False),"The x-coordinate of the y-intercept must be zero.")])


def sketch_description(seed):
    terms,h=cubic(seed+47)
    pos=terms[3]>0
    good="Maximum, then minimum" if pos else "Minimum, then maximum"
    swap="Minimum, then maximum" if pos else "Maximum, then minimum"
    left,right=("up","down") if pos else ("down","up")
    wording=f"The equation is {m('y='+fmt_poly(terms))}. The two turning points occur at {m(fr'x=-{h}')} and {m(fr'x={h}')} from left to right."
    return choose(seed,"Choose an order for the turning points",
        wording+" Which order must the sketch show?",good,
        [(swap,"Check the sign of the derivative outside the two roots. The leading coefficient affects the direction of each branch."),
         ("The graph rises throughout.","A graph with a local maximum and a local minimum changes direction."),
         ("The graph falls throughout.","A graph with two turns does not keep going in one direction.")],
        [f"The derivative has one sign between the two roots and the opposite sign outside. The graph goes {left}, then {right}, then {left}.",
         f"The turn order is {good.lower()}."],
        "Use the sign of the cubic to support the left-to-right order of its two turns.","Follow the curve from left to right through both stationary points.",
        write=wording+" State the order of maximum and minimum, with a reason.")


def sketch_turn_height(seed):
    terms,h=cubic(seed+83)
    considered=(-h if terms[3]>0 else h)
    height=evaluate(terms,considered)
    return numeric("Find the height of the local maximum",
        f"A sketch of {m('y='+fmt_poly(terms))} has turning points at {m(fr'x=\pm {h}')}. Find the y-value of the local maximum.","Maximum point's y-coordinate",height,
        [f"The second derivative is {m(fmt_poly(derivative(derivative(terms))))}. It is negative at {m(f'x={considered}')}, so this x gives the local maximum.",
         f"Substitute that x into the original equation to get {m(f'y={fraction(height)}')}."],
        "Identify which stationary x gives a maximum and substitute that value into the curve equation.","Choose the correct turning point by a sign or second derivative test before finding its height.",
        [(evaluate(terms,-considered),"This is the height of the local minimum. Check which stationary x gives a maximum."),(considered,"This is the x-value. The question asks for the y-coordinate.")])


def draw_sketch(seed):
    terms,h=cubic(seed+160)
    points=((-h,evaluate(terms,-h)),(h,evaluate(terms,h)))
    orders=("local maximum","local minimum") if terms[3]>0 else ("local minimum","local maximum")
    crossing=point(0,terms[0])
    answer=f"{orders[0].capitalize()} at {m(point(*points[0]))}, {orders[1]} at {m(point(*points[1]))}, y-intercept {m(crossing)}."
    return dict(title="Sketch a cubic through its key points",
        prompt=p(f"Sketch {m('y='+fmt_poly(terms))}. Find and label both stationary points and their nature. Mark the y-intercept."),
        answer=answer,field=None,write=None,asset=None,
        solution=[p(f"Differentiate and set the gradient equal to zero. This gives {m(f'x^2={h*h}')} and therefore {m(fr'x=\pm {h}')}."),
            p(answer),p("Draw the branches in the correct directions and use horizontal tangents at the two turns.")],
        hint=p("Calculate the two stationary points, then check the direction between the points and on either side.") ,
        manual=([("M1",p("Find both candidate x-values from the zero derivative equation.")),
                 ("A1",p("Give the correct y-coordinates and nature of both points.")),
                 ("B1",p(f"Label the y-intercept as {m(crossing)}.")),
                 ("B1",p("Show correct branch directions and horizontal turns at the labelled positions."))],("cubic",(terms,h),True)))


def svg_label(x,y,content,fill="#24435e",size=13,align="middle"):
    return f'<text x="{x:.2f}" y="{y:.2f}" font-family="Arial,sans-serif" font-size="{size}" fill="{fill}" text-anchor="{align}">{escape(str(content))}</text>'


def svg_line(x1,y1,x2,y2,colour,width=1):
    return f'<line x1="{x1:.2f}" y1="{y1:.2f}" x2="{x2:.2f}" y2="{y2:.2f}" stroke="{colour}" stroke-width="{width}"/>'


def svg_point(x,y,colour):
    return f'<circle cx="{x:.2f}" cy="{y:.2f}" r="4" fill="{colour}" stroke="white" stroke-width="1.3"/>'


def grid(x_bounds,y_bounds,xstep=1,ystep=1):
    xmin,xmax=x_bounds
    ymin,ymax=y_bounds
    left,right,top,bottom=54,394,21,196
    def X(x):
        return float(left+(x-xmin)*(right-left)/(xmax-xmin))
    def Y(y):
        return float(bottom-(y-ymin)*(bottom-top)/(ymax-ymin))
    art=[]
    for x in range(ceil(xmin/xstep)*xstep,floor(xmax/xstep)*xstep+1,xstep):
        art.append(svg_line(X(x),top,X(x),bottom,"#d9e5ee"))
        art.append(svg_label(X(x),bottom+18,x))
    for y in range(ceil(ymin/ystep)*ystep,floor(ymax/ystep)*ystep+1,ystep):
        art.append(svg_line(left,Y(y),right,Y(y),"#d9e5ee"))
        art.append(svg_label(left-7,Y(y)+4,y,align="end"))
    if xmin<=0<=xmax:
        art.append(svg_line(X(0),top,X(0),bottom,"#8092a3",1.5))
    if ymin<=0<=ymax:
        art.append(svg_line(left,Y(0),right,Y(0),"#8092a3",1.5))
    art.append(svg_label(right-4,bottom+39,"x"))
    art.append(svg_label(left-40,top-7,"y"))
    art.append(f'<defs><clipPath id="plot-area"><rect x="{left}" y="{top}" width="{right-left}" height="{bottom-top}"/></clipPath></defs>')
    return X,Y,"".join(art)


def traced(fn,xmin,xmax,X,Y,colour):
    samples=[xmin+(xmax-xmin)*F(i,160) for i in range(161)]
    xy=" ".join(f"{X(x):.2f},{Y(fn(x)):.2f}" for x in samples)
    return f'<polyline clip-path="url(#plot-area)" points="{xy}" fill="none" stroke="{colour}" stroke-width="2.4" stroke-linejoin="round"/>'


def bounded_ticks(low,high):
    step=next(v for v in (1,2,3,4,5,8,10,15,20,25,30,40,50,75,100,125,150,200,250,500,1000) if (high-low)/v<=8)
    return (floor(low/step)*step,ceil(high/step)*step),step


def wrap_svg(art,alt):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {WIDTH} {HEIGHT}" role="img" aria-label="{escape(alt,quote=True)}">'
            f'<rect width="{WIDTH}" height="{HEIGHT}" rx="10" fill="#fbfdff"/>{art}</svg>\n')


def tangent_plot(data,marked):
    x,y,slope,bend=data
    def curve(v):
        return y+slope*(v-x)+bend*(v-x)**2
    def line(v):
        return y+slope*(v-x)
    xmin,xmax=x-3,x+3
    all_y=[curve(x+F(i,8)) for i in range(-24,25)]+[line(xmin),line(xmax)]
    yrange,ystep=bounded_ticks(min(all_y)-1,max(all_y)+1)
    X,Y,art=grid((xmin,xmax),yrange,ystep=ystep)
    art+=traced(curve,xmin,xmax,X,Y,"#1a658c")
    if marked:
        art+=traced(line,xmin,xmax,X,Y,"#8a3975")
        left,right=x-2,x+2
        lower,upper=line(left),line(right)
        art+=svg_line(X(left),Y(lower),X(right),Y(lower),"#7785a0",1.6)
        art+=svg_line(X(right),Y(lower),X(right),Y(upper),"#7785a0",1.6)
        art+=svg_point(X(left),Y(lower),"#8a3975")+svg_label(X(left)-9,Y(lower)-8,"A")
        art+=svg_point(X(right),Y(upper),"#8a3975")+svg_label(X(right)+9,Y(upper)-8,"B")
    art+=svg_point(X(x),Y(y),"#245991")+svg_label(X(x)+9,Y(y)-9,"P")
    alt=(f"Cartesian graph of a curve through P at {point(x,y,False)}. "+
         (f"A straight tangent through P includes A at {point(x-2,line(x-2),False)} and B at {point(x+2,line(x+2),False)}. A right-angled triangle shows the rise and run."
          if marked else "Only the grid, curve and point P are shown."))
    return wrap_svg(art,alt),alt


def cubic_plot(data,marked):
    terms,h=data
    def curve(t):
        return evaluate(terms,t)
    xmin,xmax=-h-2,h+2
    yvalues=[curve(x) for x in (xmin,-h,0,h,xmax)]
    yrange,ystep=bounded_ticks(min(yvalues)-2,max(yvalues)+2)
    X,Y,art=grid((xmin,xmax),yrange,xstep=1 if h<=3 else 2,ystep=ystep)
    art+=traced(curve,xmin,xmax,X,Y,"#1a658c")
    for x in (-h,h):
        y=curve(x)
        art+=svg_line(X(x-F(2,3)),Y(y),X(x+F(2,3)),Y(y),"#8a3975",2)
        art+=svg_point(X(x),Y(y),"#8a3975")
        dx=-18 if x<0 else 22
        art+=svg_label(X(x)+dx,Y(y)-10,point(x,y,False),"#28435e",12)
    if marked:
        art+=svg_point(X(0),Y(terms[0]),"#245991")+svg_label(X(0)+14,Y(terms[0])+17,point(0,terms[0],False),"#24435e",12,"start")
    alt=f"Cubic curve with horizontal tangents at {point(-h,curve(-h),False)} and {point(h,curve(h),False)}."
    if marked:
        alt+=f" Its marked y-intercept is {point(0,terms[0],False)}."
    return wrap_svg(art,alt),alt


def point_slopes():
    X,Y,art=grid((-3,3),(-1,6))
    art+=traced(lambda x:F(1,2)*x*x,-3,3,X,Y,"#1a658c")
    for point_x in (-2,0,2):
        y=F(point_x*point_x,2)
        art+=traced(lambda x:y+point_x*(x-point_x),point_x-F(3,4),point_x+F(3,4),X,Y,"#8a3975")
        art+=svg_point(X(point_x),Y(y),"#8a3975")
    alt="A parabola with negative, zero and positive tangent slopes at x-values minus 2, 0 and 2."
    return wrap_svg(art,alt),alt


def turn_sign_diagram():
    art=[]
    for x0,up in ((108,True),(316,False)):
        y0=91
        dy=1 if up else -1
        d=f"M{x0-78} {y0-51*dy} C{x0-45} {y0-12*dy},{x0-22} {y0},{x0} {y0} C{x0+22} {y0},{x0+45} {y0-12*dy},{x0+78} {y0-51*dy}"
        art.append(f'<path d="{d}" stroke="#1a658c" stroke-width="3" fill="none"/>')
        art.append(svg_line(x0-24,y0,x0+24,y0,"#8a3975",2))
        art.append(svg_point(x0,y0,"#8a3975"))
        art.append(svg_label(x0,202,"Local minimum" if up else "Local maximum"))
        art.append(svg_label(x0-59,168,"Negative" if up else "Positive"))
        art.append(svg_label(x0+59,168,"Positive" if up else "Negative"))
    alt="The minimum has negative gradient on its left and positive gradient on its right. The maximum has positive gradient on its left and negative gradient on its right. Both have horizontal tangents."
    return wrap_svg("".join(art),alt),alt


def render_plot(model):
    kind,data,marked=model
    return tangent_plot(data,marked) if kind=="tangent" else cubic_plot(data,marked)


def study_figures():
    drawings=(
        ("tangent-and-triangle",tangent_plot(tangent_model(7),True),"Measure the rise and run between points A and B on the tangent."),
        ("slopes-at-points",point_slopes(),"The same curve can have a different gradient at each point."),
        ("horizontal-tangents",cubic_plot(({3:1,1:-3,0:2},1),False),"A zero gradient gives the x-coordinate of a stationary point. Its y-coordinate comes from the curve."),
        ("turning-signs",turn_sign_diagram(),"Read the gradient signs from left to right and use them to identify the turn."),
        ("cubic-key-points",cubic_plot(cubic(165),True),"Plot the two turns and the y-intercept. Join them with a smooth curve in the correct directions."),
    )
    folder=ROOT/"public/assets/study/0580/differentiation"
    folder.mkdir(parents=True,exist_ok=True)
    result=[]
    for name,(svg,alt),caption in drawings:
        (folder/f"{name}.svg").write_text(svg,encoding="utf-8")
        result.append(dict(src=f"/assets/study/0580/differentiation/{name}.svg",alt=alt,caption=p(caption),width=WIDTH,height=HEIGHT))
    return result


def bank_figure(uid,model,role,assets):
    svg,alt=render_plot(model)
    data=svg.encode("utf-8")
    digest=sha256(data).hexdigest()
    relative=Path("content/original/0580/differentiation-assets")/f"{digest}.svg"
    path=ROOT/relative
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_bytes(data)
    file=f"pkg_igdiff_{digest}"
    if not any(a["question_uid"]==uid and a["file_id"]==file and a["role"]==role for a in assets):
        assets.append(dict(question_uid=uid,file_id=file,path=relative.as_posix(),sha256=digest,size=len(data),width=WIDTH,height=HEIGHT,
                           mime="image/svg+xml",role=role,caption=alt))
    return f'<p><img src="/api/files/{file}" width="{WIDTH}" height="{HEIGHT}" alt="{escape(alt,quote=True)}"></p>'


LESSONS=(
    ("tangent-estimates","Estimate the gradient of a curve",
     "Draw a tangent at a specified point, choose two points on that line and use the signed rise and run.",
     (("follow-the-curve","How do I place a ruler to draw the tangent?",8,
       "The tangent is a straight line through the point that matches the local direction of the curve. Look just to the left and right of the point when lining up the ruler.",
       "Mark the point first. Follow the curve for a short distance near it and adjust the ruler until the line has the same direction there. Draw that line long enough to read two separated points.",
       "Joining two distant points on the curve gives a secant and measures the change across an interval.",read_tangent,tangent_steps),
      ("read-rise-and-run","Which two points should I use?",8,
       "Use points on the line you drew. Pick easy-to-read points well apart, preferably at grid intersections. A shallow line might need quite a long run.",
       f"Find {m(r'\dfrac{y_2-y_1}{x_2-x_1}')}. Keep the order of subtraction the same above and below the fraction bar. Count actual axis units rather than squares when the scales differ.",
       "A point on the curve that is off the tangent cannot be used for this calculation.",tangent_measurement,read_tangent),
      ("check-the-estimate","Why is my answer an estimate?",8,
       "A line drawn by eye and coordinates read from a grid have limited precision. Your estimate should have the right sign and be supported by the line and the points you used.",
       "Draw the tangent with a ruler, give the two coordinates and show the gradient calculation. A falling tangent must give a negative gradient when read from left to right.",
       "Larger and smaller triangles drawn along the same tangent give the same gradient when you use the correct axis units and signs.",tangent_steps,tangent_measurement)),
     (("Tangent","A straight line that has the curve's direction at a specified point."), ("Gradient","Signed vertical change per one unit of horizontal change."), ("Secant","A straight line drawn through two points on a curve.")),
     "For a graph estimate, mark the tangent and the two points on it. Show the signed rise and run."),
    ("power-rule","Differentiate powers and sums",
     "Apply the power rule to polynomial terms with rational coefficients, then use the derivative to find a gradient.",
     (("multiply-and-reduce","How do I differentiate one power of x?",8,
       f"For {m('y=ax^n')} with positive whole-number exponent {m('n')}, use {m(DY+'=anx^{n-1}')}.",
       "Multiply the old coefficient by the old exponent. Then reduce the exponent by one. Fractions in the coefficient work in exactly the same way.",
       "Keep the sign of the original coefficient. Reducing the exponent alone misses the factor from the old exponent.",power_rule,sum_rule),
      ("differentiate-each-term","What happens to a term in x or a constant?",9,
       f"A term {m('bx')} has constant gradient {m('b')}. A constant has zero gradient because its graph is horizontal.",
       f"Differentiate each term separately, including its sign, and add the results. For example, {m('y=2x^5-7x+3')} gives {m(DY+'=10x^4-7')}.",
       "The constant in the original formula does not stay in the derivative. A linear term becomes a constant.",const_rule,sum_rule),
      ("evaluate-the-derivative","How do I get the gradient at a specific x?",9,
       "The derivative is a rule for gradient. The original formula is a rule for height on the curve. Use the correct formula for the quantity you want.",
       f"Find {m(DY)} first. Then substitute the x-coordinate. Use brackets around a negative value of x before squaring or cubing it.",
       "Putting the x-value into the original expression gives y, not the gradient.",gradient_value,specified_gradient)),
     (("Derivative","A function giving the gradient at each x-value of the curve."), ("Coefficient","The number multiplying a term."), ("Exponent","The power of the variable in a term.")),
     f"Use {m(DY)} to label the derivative. Keep it separate from the original y equation."),
    ("stationary-coordinates","Find stationary points",
     "Use a zero derivative to find stationary x-values and the original curve to find each matching y-coordinate.",
     (("set-gradient-zero","What does a horizontal tangent tell me?",8,
       f"A horizontal line has gradient zero. At a stationary point, {m(DY+'=0')}.",
       "Differentiate first and set the result equal to zero. Solve that equation for x. This gives where the tangent is horizontal.",
       "Setting y equal to zero finds where the graph meets the x-axis. The question about a horizontal tangent asks for a zero gradient.",stationary_x,stationary_quadratic),
      ("find-the-height","How do I find both coordinates?",9,
       "Use the derivative to find x. Use the curve equation to find y. These two substitutions have different purposes.",
       "After finding a stationary x-value, put that x into the original equation and write the answer as an ordered pair.",
       "The y-coordinate of a stationary point does not have to be zero.",stationary_quadratic,specified_gradient),
      ("keep-all-solutions","What if the derivative has two zeros?",9,
       "A cubic can yield a polynomial of degree two when differentiated. Its zero-gradient equation can have two different solutions.",
       f"Solve the resulting equation. For instance, {m('x^2=16')} gives both {m('x=4')} and {m('x=-4')}. Find a separate y-value for each and keep the pairs matched.",
       "A square root key gives the positive square root. Solving an equation with a squared x can also give a negative solution.",stationary_cubic,stationary_x)),
     (("Stationary point","A point on a curve where the derivative is zero."), ("Horizontal tangent","A tangent whose gradient is zero."), ("Coordinate pair","An ordered pair containing x followed by y.")),
     "When asked for stationary points, give coordinate pairs for all the solutions. Keep both signs when solving a squared equation."),
    ("classify-turns","Classify maxima and minima",
     "Use gradient signs or the second derivative to classify a stationary point as a local maximum or minimum.",
     (("read-the-sign-change","What does the graph do on either side?",8,
       "Read the curve from left to right. An increasing branch has positive gradient and a decreasing branch has negative gradient.",
       "Positive to negative gives a local maximum. Negative to positive gives a local minimum. The horizontal tangent at the point itself has gradient zero in both cases.",
       "The sign of the y-coordinate tells you the height relative to the axis. It cannot tell you the nature of the stationary point.",sign_from_data,classify_signs),
      ("test-left-and-right","How do I use the first derivative to justify a turn?",9,
       "Choose a test x-value in the interval immediately on either side of the proposed stationary point. Avoid crossing a different stationary point.",
       f"Substitute each test value into {m(DY)}. Record the two signs and say whether the curve changes from rising to falling or falling to rising.",
       "Do not test only the stationary x-value. Its gradient is zero whether the point is a maximum or a minimum.",classify_signs,sign_from_data),
      ("differentiate-again","How can the second derivative distinguish the two?",10,
       f"Differentiate {m(DY)} once more to get {m(D2)}. Use this test only after you know the point is stationary.",
       f"At the stationary x-value, a positive {m(D2)} indicates a local minimum and a negative value indicates a local maximum. If it gives zero, check the first derivative on both sides or use a sketch.",
       "A positive second derivative at a stationary point means the slope is increasing through zero. That makes a minimum, even when the point is above the x-axis.",classify_second,second_derivative)),
     (("Local maximum","A point above nearby points on the curve."), ("Local minimum","A point below nearby points on the curve."), ("Second derivative","The derivative of the gradient function.")),
     "Justify the type using either the sign change or the sign of the second derivative at the stationary point."),
    ("sketching-with-turns","Sketch curves using stationary points",
     "Combine the turning points, their types and the y-intercept into a sketch that shows the direction of each branch.",
     (("gather-the-key-points","Which points should I put on the sketch first?",8,
       "Mark the axes, plot the stationary points and identify the y-intercept. Their relative positions make it easier to link the branches.",
       f"Find the stationary x-values from the derivative and their heights from the original formula. Use {m('x=0')} in the original equation for the y-intercept.",
       "A stationary point is not automatically an intercept. Use all the information from your working.",intercept,stationary_cubic),
      ("follow-each-branch","Which way should the curve go between the turns?",9,
       "The derivative tells you where the graph rises or falls. Its sign in each interval fixes the direction of the branch there.",
       "An upward curve that turns down makes a local maximum. The next turn can reverse the direction again. Mark both types before joining the points with a smooth graph.",
       "Do not draw sharp corners at the stationary points. A differentiable graph has a horizontal tangent there.",sketch_description,intercept),
      ("label-and-check","How can I check the completed sketch?",9,
       "Read across the sketch in increasing x. Check that the curve has the calculated y-intercept and goes through each stationary point with the expected direction change.",
       "Label the stationary coordinates and name the types. A sketch does not require a table of many values, but it must show their relative positions and the local shape correctly.",
       "Giving only the x-value of a maximum misses its height. Use the curve equation for the y-coordinate.",sketch_turn_height,sketch_description)),
     (("Sketch","A drawing that shows the essential points and shape of the graph."), ("y-intercept","The point where the curve meets the y-axis."), ("Branch","A connected part of a curve on one of the intervals being compared.")),
     "Label the extrema and the intercept, then show smooth horizontal turns and branches in the correct directions."),
)


def study_table(caption,headers,rows):
    head="".join(f'<th scope="col">{value}</th>' for value in headers)
    body="".join(f'<tr><th scope="row">{row[0]}</th>'+"".join(f"<td>{v}</td>" for v in row[1:])+"</tr>" for row in rows)
    return f'<table><caption>{caption}</caption><thead><tr>{head}</tr></thead><tbody>{body}</tbody></table>'


TABLES={
  (1,0):study_table("Differentiate one term at a time",("Term in y",m(DY)),((m(r'\frac{3}{4}x^4'),m('3x^3')),(m('-9x'),m('-9')),(m('12'),m('0')))),
  (3,0):study_table("Classifying a stationary point by gradient signs",("To the left","To the right","Nature"),
      (("Positive","Negative","Maximum"),("Negative","Positive","Minimum"))),
}


def with_choices(item):
    options=item["field"].get("options") if item["field"] else None
    return item["prompt"]+('<ol type="A">'+"".join(f"<li>{v}</li>" for v in options.values())+"</ol>" if options else "")


def check(uid,item):
    return dict(id=uid,kind="check",title=item["title"],prompt=item["prompt"],field=item["field"],hint=item["hint"],
        solution="".join(item["solution"]),retry=item["retry"])


def award(code,description):
    return dict(code=code,marks=1,description_html=description)


def short_task(uid,family,lesson,item,difficulty,variant,assets):
    statement=bank_figure(uid,item["asset"],"STATEMENT",assets) if item["asset"] else ""
    return dict(id=uid,family_uid=family,lesson=lesson,collection="variant" if variant else "short",title=item["title"],marks=1,difficulty=difficulty,
        prompt_html=item["prompt"]+statement,answer_html=p(item["answer"]),solution_html="".join(item["solution"]),hint_html=item["hint"],fields=[item["field"]],
        parts=[dict(label="a",marking_criteria=[award("B1",p(item["answer"]))])],verification=uid)


def written_task(uid,family,lesson,title,items,difficulty,variant,assets):
    prompts,answers,solutions,hints,parts=[],[],[],[],[]
    for index,item in enumerate(items):
        letter=chr(97+index)
        statement_art=bank_figure(uid,item["asset"],"STATEMENT",assets) if item["asset"] else ""
        solution_art=""
        if item["manual"]:
            mark_sources,graphic=item["manual"]
            grading=[award(code,description) for code,description in mark_sources]
            solution_art=bank_figure(uid,graphic,"SOLUTION",assets)
        else:
            grading=[award("M1",item["mark"]),award("A1",p(item["answer"]))]
            if item["title"]=="Find the two stationary points of a cubic":
                grading[0]=award("M1",p(f"Differentiate and set {m(DY)} to zero."))
                grading.insert(1,award("M1",p("Use both solutions for x in the original equation for y.")))
        prompts.append(f'<li>{item["write"] or with_choices(item)}{statement_art}<span class="marks">[{len(grading)}]</span></li>')
        solutions.append(f"<h4>({letter})</h4>"+"".join(item["solution"])+solution_art)
        answers.append(p(f"({letter}) {item['answer']}"))
        hints.append(p(f"({letter})")+item["hint"])
        parts.append(dict(label=letter,marking_criteria=grading))
    return dict(id=uid,family_uid=family,lesson=lesson,title=title,collection="exam",variant_index=variant,difficulty=difficulty,
        marks=sum(len(part["marking_criteria"]) for part in parts),prompt_html='<ol class="parts" type="a">'+"".join(prompts)+"</ol>",
        answer_html="".join(answers),solution_html="".join(solutions),hint_html="".join(hints),fields=[],parts=parts,verification=uid)


BANK=(
    ((read_tangent,tangent_steps,tangent_measurement,read_tangent,tangent_steps),
     (("Measure a signed gradient",(tangent_steps,read_tangent)),("Draw and measure a tangent",(draw_tangent,tangent_measurement)),
      ("Find gradients from two measurements",(tangent_measurement,tangent_steps)),("Draw a tangent and compare a measurement",(draw_tangent,read_tangent)),
      ("Give a tangent estimate and check its sign",(draw_tangent,tangent_steps,tangent_measurement)))),
    ((power_rule,const_rule,sum_rule,gradient_value,specified_gradient),
     (("Apply the power rule",(power_rule,sum_rule)),("Differentiate constants and polynomials",(const_rule,sum_rule)),
      ("Differentiate and evaluate a gradient",(sum_rule,gradient_value)),("Find a gradient and then a position",(power_rule,gradient_value,specified_gradient)),
      ("Use the gradient function in three settings",(sum_rule,specified_gradient,gradient_value)))),
    ((stationary_quadratic,stationary_x,stationary_cubic,specified_gradient,stationary_cubic),
     (("Find a single stationary point",(stationary_quadratic,stationary_x)),("Give both stationary points",(stationary_x,stationary_cubic)),
      ("Separate the x-value and coordinates",(specified_gradient,stationary_quadratic)),
      ("Use zero and non-zero gradients",(stationary_x,stationary_cubic,specified_gradient)),
      ("Find and check multiple stationary points",(stationary_quadratic,stationary_cubic,stationary_x)))),
    ((sign_from_data,classify_signs,classify_second,second_derivative,classify_signs),
     (("Classify a turn from gradient information",(sign_from_data,classify_signs)),("Differentiate again and classify",(second_derivative,classify_second)),
      ("Choose and justify two types of turn",(classify_signs,classify_second)),("Compare first and second derivative tests",(classify_signs,second_derivative,classify_second)),
      ("Interpret the gradient signs and curvature",(sign_from_data,classify_second,classify_signs)))),
    ((intercept,sketch_description,sketch_turn_height,stationary_cubic,sketch_description),
     (("Read the key points for a sketch",(intercept,sketch_description)),("Draw and label a cubic",(draw_sketch,sketch_turn_height)),
      ("Match a turn to its height",(sketch_turn_height,stationary_cubic)),("Sketch a cubic and explain a turn",(draw_sketch,classify_signs)),
      ("Plot and justify the turns of a curve",(sketch_description,draw_sketch)))),
)


def fresh(factory,seed,seen):
    for offset in range(250):
        item=factory(seed+offset)
        new_prompts={item["prompt"]}
        if item["write"]:
            new_prompts.add(item["write"])
        if seen.isdisjoint(new_prompts):
            seen.update(new_prompts)
            return item
    raise ValueError(f"No new prompt for {factory.__name__}")


def build():
    lesson_meta,study,questions,assets=[],{},[],[]
    figures=study_figures()
    seen=set()
    for index,(key,title,summary,rows,terms,tip) in enumerate(LESSONS):
        uid=PREFIX+key
        diagram=figures[index]
        examples,sections,extra=[],[],[]
        for j,(anchor,heading,mins,idea,method,mistake,first,second) in enumerate(rows):
            seed=(7+index*31 if index<4 else 136)+j*13
            offset=len(examples)
            for q in (fresh(first,seed,seen),fresh(second,seed+2,seen)):
                examples.append(dict(title=q["title"],question=with_choices(q),solution=q["solution"]))
            blocks=[dict(kind="key",html=p(idea),**({"figure":diagram} if j==0 else {})),
                dict(kind="text",title="Practise the method",html=p(method)+TABLES.get((index,j),"")),
                dict(kind="example",index=offset),check(f"{uid}-{anchor}-a",fresh(first,seed+1,seen)),dict(kind="mistake",html=p(mistake)),
                dict(kind="example",index=offset+1,tryFirst=True),check(f"{uid}-{anchor}-b",fresh(second,seed+3,seen))]
            if j==2:
                blocks.append(dict(kind="tip",html=p(tip)))
            sections.append(dict(id=anchor,title=heading,label=anchor.replace("-"," ").capitalize(),minutes=mins,level="core",blocks=blocks))
            extra.extend([check(f"{uid}-{anchor}-extra-a",fresh(first,seed+6,seen)),check(f"{uid}-{anchor}-extra-b",fresh(second,seed+9,seen))])
        revision="".join(f"<h2>{h}</h2>"+p(idea)+p(method) for _,h,_,idea,method,_,_,_ in rows)
        revision+="<h2>Quick worked example</h2>"+examples[0]["question"]+"".join(examples[0]["solution"])
        revision+=f'<p><img src="{diagram["src"]}" width="310" alt="{escape(diagram["alt"],quote=True)}"></p>'
        prev=LESSONS[index-1] if index else None
        related=[dict(title=prev[1],href=f"/courses/{COURSE}/topics/{PREFIX}{prev[0]}")] if prev else []
        study[uid]=dict(updatedOn=DATE,description=summary,sections=sections,examples=examples,extraPractice=extra,related=related,
            glossary=[dict(term=term,definition=p(desc)) for term,desc in terms],
            revision=dict(body=revision,checks="<ul><li>Distinguish the curve and its derivative.</li><li>Check which quantity the question asks for.</li><li>Justify any estimate or classification.</li></ul>",examTip=p(tip)))
        lesson_meta.append(dict(id=uid,key=key,title=title,summary=summary,objective=summary,
            before=p("For 0580 Extended. Recall how to find the gradient of a straight line from two points."),
            ideas="".join(p(row[3]) for row in rows),method="".join(f"<h4>{row[1]}</h4>"+p(row[4]) for row in rows),mistakes=[row[5] for row in rows],
            examples=[dict(title=e["title"],question=e["question"],solution="".join(e["solution"]),verification=f"{uid}-worked-{j}") for j,e in enumerate(examples[::2],1)]))
        shorts,writtens=BANK[index]
        for j,make in enumerate(shorts,1):
            family=f"M4U-0580-DIF-{key}-P{j}"
            for v in range(2):
                q=fresh(make,43+index*43+j*11+v,seen)
                questions.append(short_task(f"{family}-{v}",family,key,q,1+(j-1)//2,v,assets))
        for j,(name,makes) in enumerate(writtens,1):
            family=f"M4U-0580-DIF-{key}-W{j}"
            for v in range(4):
                items=[fresh(make,97+index*73+j*17+v+k*7,seen) for k,make in enumerate(makes)]
                questions.append(written_task(f"{family}-{v}",family,key,name,items,min(4,j),v,assets))
    manifest=dict(schema_version=1,key="0580-differentiation",version="1.0.0",marking_status="DRAFT",
        course=dict(slug=COURSE,title="Cambridge IGCSE Mathematics (0580)",code="0580",direction="igcse"),
        chapter=dict(id="igcse_0580_differentiation",slug="differentiation",title="Differentiation",position=29),
        source=dict(sha256=sha256(Path(__file__).read_bytes()).hexdigest(),supplied=0,held=[]),lessons=lesson_meta,questions=questions,assets=assets)
    folder=ROOT/"content/original/0580"
    for name,data in (("differentiation-v1.json",manifest),("differentiation-study.json",study)):
        (folder/name).write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(f"{len(lesson_meta)} lessons, {len(questions)} bank questions, {len(assets)} graphic placements")


if __name__=="__main__":
    build()
