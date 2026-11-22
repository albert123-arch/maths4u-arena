"""Generate a complete Cambridge 0580 Coordinate geometry unit (C/E3)."""
from fractions import Fraction
from hashlib import sha256
from html import escape
import json
from math import isqrt
from pathlib import Path
from runpy import run_path

ROOT=Path(__file__).resolve().parents[2]
shared=run_path(str(Path(__file__).with_name("prepare-0580-number-types.py")))
p,m,f,task,check,line,label,table=(shared[k] for k in ("p","m","fraction","task","check","line","label","table"))
helpers=run_path(str(Path(__file__).with_name("prepare-0580-ratio-proportion.py")))
number,bank_item=helpers["number"],helpers["bank_item"]
assets=ROOT/"public/assets/study/0580/coordinate-geometry"
prefix="/assets/study/0580/coordinate-geometry/"


def exact(v):
    v=Fraction(v)
    return f(v.numerator,v.denominator)


def slope_term(v):
    if v in (-1,1):
        return "x" if v==1 else "-x"
    return exact(v)+"x" if v else ""


def line_rule(m_slope,intercept):
    if not m_slope:return f"y={intercept}"
    return f"y={slope_term(m_slope)}"+(f"{intercept:+d}" if intercept else "")


def svg(name,alt,pts=(),curves=(),limit=5,triangle=()):
    assets.mkdir(parents=True,exist_ok=True)
    x0,y0,size=92,14,198
    def X(x):return x0+(x+limit)*size/(2*limit)
    def Y(y):return y0+(limit-y)*size/(2*limit)
    graph=""
    for i in range(-limit,limit+1):
        graph+=line(X(i),y0,X(i),y0+size,"#e0eaf3")+line(x0,Y(i),x0+size,Y(i),"#e0eaf3")
    graph+=line(x0,Y(0),x0+size+7,Y(0))+line(X(0),y0-6,X(0),y0+size)+label(x0+size+18,Y(0)+5,"x")+label(X(0)+13,13,"y")
    for n in range(-limit+1,limit):
        if n and (limit<7 or n%2==0):
            graph+=label(X(n),Y(0)+14,str(n))+label(X(0)-13,Y(n)+4,str(n))
    graph+=f'<defs><clipPath id="plot"><rect x="{x0}" y="{y0}" width="{size}" height="{size}"/></clipPath></defs><g clip-path="url(#plot)">'
    for (ax,ay),(bx,by) in curves:
        graph+=f'<line x1="{X(ax):.2f}" y1="{Y(ay):.2f}" x2="{X(bx):.2f}" y2="{Y(by):.2f}" stroke="#214f8e" stroke-width="2.8"/>'
    if triangle:
        (a,b),(c,d)=triangle
        graph+=f'<path d="M {X(a)} {Y(b)} H {X(c)} V {Y(d)}" fill="none" stroke="#13715a" stroke-width="2.5" stroke-dasharray="5 3"/>'
    for key,x,y in pts:
        graph+=f'<circle cx="{X(x):.2f}" cy="{Y(y):.2f}" r="4.2" fill="#1d715c"/>'
        dx=-12 if x>=limit-1 else 11
        graph+=label(X(x)+dx,Y(y)-7,key)
    graph+="</g>"
    drawing=('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 380 225" role="img" aria-labelledby="title">'
             f'<title id="title">{escape(alt)}</title><rect width="380" height="225" rx="12" fill="white"/>{graph}</svg>\n')
    (assets/(name+".svg")).write_text(drawing,encoding="utf-8")
    return dict(src=prefix+name+".svg",alt=alt,width=380,height=225)


def pair(title,prompt,x,y,method,step,tip):
    value=m(f"({exact(x)},{exact(y)})")
    expected=f"({x},{y})"
    q=task(title,prompt,"Coordinates (x, y)",expected,[method,step,f"The coordinates are {value}."],
        tip,kind="pairs")
    return dict(q,method=method,result=value)


def equation(title,prompt,expected,math,method,work,tip):
    q=task(title,prompt,"Equation of the line",expected,[method,work,f"The equation is {m(math)}."],tip,kind="equation")
    q["field"]["variables"]=["x","y"]
    return dict(q,method=method,result=m(math))


def coord(i,mode=0):
    x=i%9-4
    y=(i//9)%9-4
    b=i%9-4
    if mode==0:
        drawing=svg(f"question-coordinates-{x+5}-{y+5}", "A point P on a numbered Cartesian grid.",[("P",x,y)])
        q=pair("Read the coordinates of a marked point","Write down the coordinates of P on the grid.",x,y,
            "Read the horizontal value first.",f"The point is at x = {m(x)} and y = {m(y)}.",
            "Read x first, then y. Check the signs.")
        q["prompt"]=f'<p><img src="{drawing["src"]}" alt="{escape(drawing["alt"])}" width="340"></p>'+q["prompt"]
        return q
    if mode==1:
        x=(i%4+1)*(-1 if i%2 else 1)
        y=i+4
        return pair("Translate movements from the origin into coordinates",
            f"Start at the origin, move {abs(x)} units {'left' if x<0 else 'right'} and {y} units down. State the new coordinates.",
            x,-y, "Read the horizontal move as the x-coordinate.",
            "A downward move from the origin gives a negative y-coordinate.",
            "Use signed moves starting at zero.")
    return pair("Place a point on a named axis",
        f"Q lies on the y-axis and has a y-coordinate of {b}. Give its coordinates.",0,b,
        "Every point on the vertical axis has x-coordinate zero.",
        f"Keep the stated y-coordinate {m(b)}.",
        "A point on the vertical axis has x = 0.")


def plotline(i,mode=0):
    m_slope=(2+i%7)*(-1 if i%2 else 1)
    intercept=3+i
    visible=m(line_rule(m_slope,intercept))
    x=2+i%6
    value=m_slope*x+intercept
    if mode==0:
        q=number("Complete a table value before drawing a line",
            f"Find the y-value for x = {x} on the graph of {visible}.",
            "y-value",value,
            f"Replace x by {m(x)} in the rule.",
            f"Evaluate {m(f'{m_slope}\\times{x}+{intercept}')}.",
            "Use the same rule for every row of a table.")
        rows=table(["x","y"],[["0",str(intercept)],["1",str(m_slope+intercept)],[str(x),""]])
        q["written_prompt"]=rows+p(f"Complete the table for {visible}. Draw the line through the three plotted points.")
        q["method"]="Use the formula to complete the table, then choose scales and plot at least two correct points."
        q["written_answer"]=q["result"]+" for the missing y-value, with the correct straight line through all three points."
        return q
    if mode==1:
        return pair("Find a point that belongs to the line",
            f"On {visible}, give the point with x-coordinate {x}.",x,value,
            f"Use the given x-coordinate to find y from the line's equation.",
            "Write the two coordinates in the order (x, y).",
            "The given coordinate is first in the ordered pair.")
    return number("Read a horizontal line",
        f"For the line {m(f'y={intercept}')}, find the y-coordinate at x = {x}.",
         "y-value",intercept,"The equation gives the same y for every horizontal position.",
         "A horizontal line holds its y-coordinate constant.","Do not replace the stated constant y by the given x.")


def gradient(i,mode=0):
    if mode==4:
        t=-4+i%9
        horizontal=i%2==0
        a,b=((1,t),(3+i%7,t)) if horizontal else ((t,-2-i%7),(t,3))
        options={"A":"Zero","B":"Undefined"}
        answer="A" if horizontal else "B"
        method="The y-coordinates match, giving no vertical change." if horizontal else "The x-coordinates match, giving no horizontal change."
        q=task("Identify the gradient of an axis-aligned line",
            f"Is the gradient of the line through {m(str(a))} and {m(str(b))} zero or undefined?",
            "Gradient",answer,[method,
                "A zero vertical change gives zero gradient; a zero horizontal change makes the gradient undefined."],
            "Check which coordinate stays the same.",kind="choice",options=options)
        return dict(q,method=method,result=options[answer])
    # Keep the entire rise/run triangle inside the numbered grid.
    a=(-4+(i//27)%3,-4+(i//9)%3)
    b=(1+(i//3)%3,1+i%3)
    if mode==1:
        a=(a[0],-a[1]); b=(b[0],-b[1])
    dx,dy=b[0]-a[0],b[1]-a[1]
    if mode<2:
        description="The straight line through points A and B, with a dashed gradient triangle."
        drawing=svg("question-gradient-"+"-".join(str(v+5) for v in (*a,*b)),description,[("A",*a),("B",*b)],[(a,b)],triangle=(a,b))
        prompt="Find the exact gradient of the line through A and B on the grid."
    else:
        a=(-3-i%6,1+i//5)
        b=(1+i%8,-2-i%7)
        if mode==3:
            a=(a[0],-a[1]); b=(b[0],-b[1])
        dx,dy=b[0]-a[0],b[1]-a[1]
        drawing=None
        prompt=f"Find the exact gradient of the line through {m(str(a))} and {m(str(b))}."
    q=number("Use the change in y over the change in x",prompt,"Gradient",Fraction(dy,dx),
        f"Moving from A to B changes x by {m(dx)} and y by {m(dy)}.",
        f"Divide the vertical change by the horizontal change: {m(f(dy,dx))}.",
        "Use the same order for both subtractions.")
    if drawing:
        q["prompt"]=f'<p><img src="{drawing["src"]}" alt="{escape(drawing["alt"])}" width="340"></p>'+q["prompt"]
    return q


def endpoints(i,mode=0):
    x0,y0=-2-i%6,3+i%7
    dx,dy=3+i%8,2+i%9
    x1,y1=x0+dx,y0-dy
    A=m(f"({x0},{y0})")
    B=m(f"({x1},{y1})")
    if mode==0:
        return pair("Find the midpoint of a segment",
            f"Find the midpoint of the segment from {A} to {B}.",
            Fraction(x0+x1,2),Fraction(y0+y1,2),
            "Take the mean of the two x-coordinates and the mean of the two y-coordinates.",
            f"The means are {m(f(x0+x1,2))} and {m(f(y0+y1,2))}.",
            "Average matching coordinates separately.")
    if mode==1:
        length2=dx**2+dy**2
        root=isqrt(length2)
        expected=str(root) if root*root==length2 else f"sqrt({length2})"
        answer=m(root if root*root==length2 else fr"\sqrt{{{length2}}}")
        method=f"The horizontal and vertical changes have lengths {dx} and {dy}."
        q=task("Find the exact length using a coordinate triangle",
            f"Find the exact length of the segment from {A} to {B}.",
            "Length",expected,[method,f"Pythagoras gives squared length {m(f'{dx}^2+{dy}^2={length2}')}.",f"The length is {answer}."],
            "Square both changes, add and take the positive square root.")
        return dict(q,method=method+" Apply Pythagoras to the two legs.",result=answer)
    centre=m(f"({exact(Fraction(x0+x1,2))},{exact(Fraction(y0+y1,2))})")
    return pair("Find the missing endpoint from the midpoint",
        f"One endpoint of a segment is {A} and its midpoint is {centre}. Give the other endpoint.",
        x1,y1,"The step from the first endpoint to the midpoint is the same as the step from the midpoint to the second endpoint.",
        "Double each midpoint coordinate, then subtract the corresponding given endpoint coordinate.",
        "Double the midpoint coordinates and subtract the coordinates of the known end.")



def from_point(i,mode=0):
    slope=(2+i%7)*(-1 if i%2 else 1)
    c=3+i
    x=-2-i%6
    y=slope*x+c
    expected=line_rule(slope,c)
    if mode==0:
        return equation("Find a line from its gradient and intercept",
            f"Write the equation of the line with gradient {m(slope)} and y-intercept {m(c)}.",
            expected,expected,"Use the form y = mx + c.",
            f"The gradient gives the coefficient of x. The y-intercept gives the constant {m(c)}.",
            "Put the gradient next to x and add the intercept.")
    if mode==1:
        return equation("Use a gradient and a point",f"Find the equation of the line with gradient {m(slope)} through {m(f'({x},{y})')}.",
            expected,expected,f"Use the given gradient. The unknown intercept c is the remaining number.",
            f"Put the point into the equation: {m(f'{y}={slope}\\times({x})+c')}. Solve for c.",
            "Use both coordinates of the known point with the stated gradient.")
    ratio=2+i%6
    display=f"{ratio}y-{ratio*slope}x={ratio*c}" if slope>0 else f"{ratio}y+{abs(ratio*slope)}x={ratio*c}"
    return number("Read the intercept after putting y on its own",
        f"Find the y-intercept of {m(display)}.","y-intercept",c,
        f"At the y-axis the value of x is zero.",f"Solve {m(f'{ratio}y={ratio*c}')} by dividing by {ratio}.",
        "Set x equal to zero on the original equation or rearrange it first.")


def equation_from_grid(i,vertical=False):
    if vertical:
        x=i%9-4
        drawing=svg(f"question-vertical-{x+5}","A vertical straight line crossing the horizontal axis.",
            curves=[((x,-5),(x,5))])
        q=equation("Read the equation of a vertical line",
            "Write the equation of the vertical line on the grid.",
            f"x={x}",f"x={x}",
            "A vertical line has the same x-coordinate everywhere.",
            f"It meets the x-axis at {m(x)}, so that x-coordinate is constant.",
            "Read where it crosses the horizontal axis.")
    else:
        g=[-2,-1,1,2][i%4]
        c=i%7-3
        A=(0,c)
        B=(1,g+c)
        drawing=svg(f"question-equation-{g+2}-{c+3}",
            "A straight line with two points marked.",[("A",*A),("B",*B)],[((-5,c-5*g),(5,c+5*g))])
        rule=line_rule(g,c)
        q=equation("Read the gradient and intercept from a grid",
            "Write the equation of the straight line on the grid.",
            rule,rule,
            f"The line crosses the y-axis at {m(c)}.",
            f"From A to B, x increases by one and the change in y is {m(g)}.",
            "Find both the vertical-axis crossing and the signed rise per unit run.")
    q["prompt"]=f'<p><img src="{drawing["src"]}" alt="{escape(drawing["alt"])}" width="340"></p>'+q["prompt"]
    return q


def parallel(i,mode=0):
    raw=(2+i%7)*(-1 if i%2 else 1)
    c=3+i
    b=5+i
    if mode==0:
        source=line_rule(raw,c)
        return number("Use the gradient of a parallel line",
            f"A line is parallel to {m(source)}. What is its gradient?","Gradient",raw,
            f"The given line has gradient {m(raw)}.","A parallel line has the same gradient.",
            "Keep the gradient. Its intercept may be different.")
    if mode==1:
        display=line_rule(raw,-c)
        target=line_rule(raw,b)
        return equation("Write a parallel line with a given intercept",
            f"Find the equation of the line parallel to {m(display)} with y-intercept {m(b)}.",
            target,target,"Parallel lines have the same gradient.",
            f"Keep the coefficient of x, then use the new y-intercept {m(b)}.",
            "Use the original gradient and the new intercept.")
    a=-2-i%7
    y=raw*a+b
    target=line_rule(raw,b)
    return equation("Write a parallel line through a given point",
        f"Find the equation of the line parallel to {m(line_rule(raw,-c))} which passes through {m(f'({a},{y})')}.",
        target,target,"Keep the same gradient and write an unknown constant.",
        f"Substitute the coordinates {m(f'({a},{y})')} and solve for the constant.",
        "Changing the point changes the intercept. The gradient stays the same.")


def perpendicular(i,mode=0):
    # A rational slope times its perpendicular slope equals -1.
    p_slope=(2+i%7)*(-1 if i%2 else 1)
    den=2+i%5
    given=Fraction(p_slope,den)
    normal=-1/given
    old=6+i
    if mode==0:
        return number("Find the negative reciprocal gradient",
            f"Find the gradient of a line perpendicular to {m(line_rule(given,old))}. Give the exact value.",
            "Perpendicular gradient",normal,
            f"The stated gradient is {m(exact(given))}.",
            f"Its negative reciprocal makes the product equal to {m(-1)}.",
            "Swap numerator and denominator and change the sign.")
    if mode==1:
        x=normal.denominator*(3+i%8)
        c=2+i
        y=int(normal*x)+c
        target=line_rule(normal,c)
        return equation("Write the perpendicular line through a point",
            f"Find the equation of the line perpendicular to {m(line_rule(given,old))} which passes through {m(f'({x},{y})')}.",
            target,target,
            f"The new gradient is the negative reciprocal, {m(exact(normal))}.",
            f"Use the known point to locate the intercept. Substitute x and y into the new line equation.",
            "Find the perpendicular gradient before working out the intercept.")
    x=i+1
    y=-(i+2)
    return equation("Handle horizontal and vertical perpendicular lines",
        f"A line perpendicular to {m(f'y={old}')} passes through {m(f'({x},{y})')}. Give its equation.",
        f"x={x}",f"x={x}",
        f"The given line is horizontal. Its perpendicular is vertical.",
        f"All points on the new line have x-coordinate {m(x)}.",
        "A vertical line has constant x-coordinate. Do not try to calculate a reciprocal of zero.")


def pick(factory,mode):
    return lambda i:factory(i,mode)


def standard_form(i, mode):
    a,b,c=2+i%5,3+i%7,4+i
    expr=f"{a}x+{b}y={b*c}"
    slope=Fraction(-a,b)
    if mode==0:
        return number("Read the gradient from a general-form line",
            f"Find the gradient of {m(expr)}.","Gradient",slope,
            "Move the x-term to the right, then divide every term by the coefficient of y.",
            f"In {m(line_rule(slope,c))}, the coefficient of x is the gradient.",
            "Divide the x-term as well as the constant term.",(-a,"You moved the x-term. Now divide every term by the coefficient of y."))
    if mode==1:
        x_cross=Fraction(b*c,a)
        q=number("Find where a standard-form line meets the axes",
            f"Find the x-coordinate where {m(expr)} crosses the x-axis.","x-intercept",x_cross,
            "At the x-axis, y is zero. At the y-axis, x is zero.",
            f"Substitute zero for y and solve {m(f'{a}x={b*c}')}.",
            "Make a small sketch and identify which coordinate is zero.",
            (c,"This is the y-intercept. Set y to zero to find the x-intercept.") if x_cross != c else None)
        q["written_prompt"]=p(f"Sketch {m(expr)} on labelled axes. Mark the coordinates of both intercepts.")
        q["method"]="Substitute zero for one coordinate at a time to find the two intercepts. Draw a line through them."
        q["written_answer"]=m(f"({exact(x_cross)},0)")+" and "+m(f"(0,{c})")+", with a straight line through those points."
        q["steps"].insert(2,p("At the y-axis the crossing is "+m(f"(0,{c})")+". Plot both points and draw the line."))
        return q
    original=line_rule(slope,c)
    q=equation("Rewrite a line in general form",
        f"Give an equivalent equation to {m(original)}. You can clear the denominator to write it in general form.",
        expr,expr,f"Multiply the entire equation by {m(b)} to remove the denominator.",
        f"This gives {m(f'{b}y=-{a}x+{b*c}')}. Move the x-term to the left and simplify common factors if desired.",
        "The new equation describes the same line. Multiply both sides by the same number.")
    q["written_prompt"] = p(f"Rearrange {m(original)} into the form {m('Ax+By=C')} with integer coefficients and a positive coefficient of y.")
    q["written_answer"] = m(expr) + " or the same equation with its common factors divided out."
    return q


def bisector(i, mode):
    x,y=i+2,3-i%7
    dx,dy=1+i%8,2+i%5
    if mode==2:
        ax,ay,bx,by=x-dx,y,x+dx,y
    else:
        ax,ay,bx,by=x-dx,y-dy,x+dx,y+dy
    pair_text=m(f"A({ax},{ay})")+" and "+m(f"B({bx},{by})")
    if mode==0:
        return pair("Locate the midpoint of the given segment",f"Find the midpoint of the segment joining {pair_text}.",x,y,
            "Find the mean of the two horizontal coordinates, and then of the two vertical coordinates.",
            f"The two averages are {m(exact(x))} and {m(exact(y))}.","Average matching coordinates separately.")
    if mode==2:
        target=f"x={x}"
        return equation("Find the perpendicular bisector of a horizontal segment",
            f"Find the equation of the perpendicular bisector of the segment joining {pair_text}.",target,target,
            f"The segment is horizontal, so its bisector must be vertical. Its midpoint is {m(f'({x},{y})')}.",
            f"Every point on this vertical line has x-coordinate {m(x)}.","Find the midpoint first. The vertical line keeps x fixed.")
    gradient=Fraction(dy,dx)
    normal=-1/gradient
    intercept=y-normal*x
    n,d=normal.numerator,normal.denominator
    total=d*y-n*x
    general=f"{d}y{(-n):+d}x={total}"
    format_y=f"y={slope_term(normal)}"+("+"+exact(intercept) if intercept>0 else exact(intercept) if intercept<0 else "")
    return equation("Use a midpoint and negative reciprocal together",
        f"Find the equation of the perpendicular bisector of the segment joining {pair_text}.",
        general,format_y,f"The midpoint is {m(f'({x},{y})')}. The segment gradient is {m(exact(gradient))}, so the bisector has gradient {m(exact(normal))}.",
        f"The point-gradient equation is {m(f'y-({y})={exact(normal)}(x-{x})')}. Expand or rearrange to an equivalent line equation.",
        "The bisector must pass through the midpoint and meet the segment at a right angle.")


LESSONS=[
 ("coordinates","Coordinates on a grid","Read and plot signed coordinates in the four quadrants and on the axes.",False,[
  ("read","Which coordinate should I read first?","Start at the vertical axis and count horizontal units. Then measure the vertical position from the horizontal axis.",
   "Read coordinates in the order horizontal, then vertical.",
   "The label beside a point belongs to the dot. Read the dot rather than the text label.",pick(coord,0),"coordinates"),
  ("signs","How can I decide the signs?","Right and up are positive. Left and down are negative. Start counting both directions from the origin.",
   "Read each signed distance from its own axis.",
   "The two coordinates can have different signs.",pick(coord,1),None),
  ("axis","How do I describe a point on an axis?","On the y-axis there is no horizontal change. On the x-axis there is no vertical change.",
   "On the vertical axis the x-coordinate is zero. On the horizontal axis the y-coordinate is zero.",
   "Keep the zero in the correct position in the ordered pair.",pick(coord,2),None)]),
 ("drawing-lines","Drawing straight-line graphs","Use an equation or a table of values to plot and draw a straight line.",False,[
  ("table","How do I build the table?","Pick horizontal values and substitute each into the equation. Record the matching vertical results in the same row.",
   "Two points fix a straight line. Use a third location as a check.",
   "The two axes can use different units. Label their scales before plotting.",pick(plotline,0),"plot"),
  ("point","What does it mean that a point lies on a line?","A point belongs on the line if its two coordinates make the equation true.",
   "Find the missing coordinate by substituting the known one.",
   "Preserve the order of the coordinates when writing the point.",pick(plotline,1),None),
  ("horizontal","How can I draw a line with constant y?","All points share the same vertical position. Their horizontal coordinates can change.",
   "A line with constant y is horizontal.",
   "The equation of a vertical line keeps x constant instead.",pick(plotline,2),None)]),
 ("grid-gradients","Finding gradient from a grid","Use a right-angled change triangle to find positive and negative gradients from a grid.",False,[
  ("rise","Which way should I measure the changes?","Pick two points on the line. Move from the left point to the right point to give a positive horizontal run.",
   "Divide the signed vertical change by the horizontal change.",
   "The grid scale tells you how many units each square represents.",pick(gradient,0),"slope"),
  ("fall","How do I mark a falling line's gradient?","Moving left to right on a falling line gives a negative vertical change.",
   "Use the negative sign when the vertical value falls.",
   "A gradient measures steepness and direction.",pick(gradient,1),None),
  ("same","Does the triangle have to start at the origin?","On a straight line every pair of points gives the same ratio of vertical to horizontal change.",
   "Choose grid crossings spaced well apart to make the changes easy to read.",
   "A height on the vertical axis is different from a change in height.",pick(gradient,0),None)]),
 ("coordinate-gradients","Finding gradient from coordinates","Use differences between two given points to calculate a gradient without drawing the line.",True,[
  ("differences","Which differences form the fraction?","Subtract the starting x from the ending x. In the same order subtract the starting y from the ending y.",
   f"Gradient is {m(r'\frac{y_2-y_1}{x_2-x_1}')} when the x-coordinates differ.",
   "Subtract both differences in the same order.",pick(gradient,2),"slope"),
  ("link","Can I check against a sketch?","Look at the two points. If y decreases while x increases, the gradient is negative.",
   "Check the sign against the movement from the left point to the right point.",
   "Reverse both subtractions together if you change the order.",pick(gradient,3),None),
  ("direction","How do I reason about a vertical line?","Equal x-coordinates give no horizontal change, so the gradient fraction has a zero denominator.",
   "Horizontal lines have gradient zero. Vertical lines have an undefined gradient.",
   "An undefined gradient is not zero.",pick(gradient,4),None)]),
 ("midpoint-length","Midpoint and length of a segment","Average matched coordinates for midpoint and use a right triangle for length.",True,[
  ("midpoint","Which coordinates do I average?","The midpoint is halfway across both horizontally and vertically. The two coordinate averages separate these steps.",
   "Take the mean of the two x-values and the mean of the two y-values.",
   "Do not average all four coordinates together.",pick(endpoints,0),"segment"),
  ("length","How can I find the straight-line distance?","The horizontal and vertical changes make the legs of a right triangle. The segment is the hypotenuse.",
   "Square the two lengths, add the squares and take the positive square root.",
   "Take absolute changes for lengths. Their squares remove the signs anyway.",pick(endpoints,1),None),
  ("other","Can the midpoint give me a missing endpoint?","The displacement from the first endpoint to the midpoint repeats from the midpoint to the far endpoint.",
   "Double the midpoint, then subtract the matching coordinate of the known endpoint.",
   "Use separate x and y calculations.",pick(endpoints,2),None)]),
 ("equations","Finding equations of straight lines","Use the given gradient and intercept or a known point to write a line equation.",False,[
  ("intercept","What do m and c represent?","A non-vertical line can be written with y as the subject. Its x coefficient gives slope and the constant gives the vertical-axis crossing.",
   f"In {m('y=mx+c')}, {m('m')} is the gradient and {m('c')} is the y-intercept.",
   "The y-intercept is a position. The gradient describes a change.",pick(from_point,0),"plot"),
  ("point","How does one point locate a line with known gradient?","Use the known gradient and write a placeholder for the intercept. The coordinates of the point make this equation true.",
   "Substitute both coordinates and solve for the intercept.",
   "A point off the vertical axis does not directly give the intercept.",pick(from_point,1),None),
  ("read","How can I read a line equation from a grid?","Mark the intercept and find a second point on the line. Read the rise per unit run.",
   "Use the gradient and vertical intercept read from the grid.",
   "A horizontal-axis crossing is different from the y-intercept.",equation_from_grid,None),
  ("vertical","What is the equation of a vertical line?","Every point on the line uses the same horizontal coordinate. This line is specified by x alone.",
   "Read the point where the line meets the horizontal axis and set x equal to that value.",
   "A vertical line keeps x constant. A horizontal line keeps y constant.",pick(equation_from_grid,True),None)]),
 ("parallel","Parallel lines","Identify the same gradient and use the requested intercept or point to write a different line.",False,[
  ("same","Which part of a line stays the same?","Parallel lines have the same direction. The vertical change per horizontal unit stays the same.",
   "Use the same gradient for a non-vertical parallel line.",
   "Two equations with the same gradient and intercept describe one line.",pick(parallel,0),"parallel"),
  ("intercept","How do I use a new intercept?","Keep the gradient you already found. Use the new intercept for the constant term.",
   "Write a new equation using the old slope and the given intercept.",
   "Compare the intercepts to check that the lines are distinct.",pick(parallel,1),None),
  ("through","How can a known point fix the parallel line?","A different point may require a different intercept. Substitute the point with the same gradient.",
   "Solve for the new intercept after substituting the point.",
   "Do not keep the old intercept unless the point lies on the old line.",pick(parallel,2),None)]),
 ("perpendicular","Perpendicular lines","Find a perpendicular gradient and handle vertical and horizontal cases.",True,[
  ("reciprocal","What happens to the gradient at a right angle?","If both lines have non-zero finite gradients, turn the change triangle by a quarter turn. Its rise and run swap roles and change sign.",
   f"Multiply the two gradients to get {m(-1)}.",
   "Changing the sign alone works only when the first gradient has magnitude one.",pick(perpendicular,0),"perpendicular"),
  ("point","How do I locate the perpendicular through a point?","First calculate the new gradient. Then use the point given for the new line, which need not lie on the original.",
   "Solve for the new intercept using the point and its perpendicular gradient.",
   "The point is on the new line. Use it with the new gradient.",pick(perpendicular,1),None),
  ("axis","What if one line is horizontal or vertical?","A horizontal line and a vertical line meet at a right angle. A reciprocal calculation is unnecessary in this case.",
   "A horizontal line has a constant y-coordinate. A vertical line has a constant x-coordinate.",
   "Do not divide by zero when finding a perpendicular to a horizontal line.",pick(perpendicular,2),None)]),
 ("general-form-lines","Straight lines in general form","Rearrange a line equation, identify its gradient and draw it from its intercepts.",True,[
  ("rearrange","How do I find the gradient when y is not alone?","Move the x-term across the equals sign. Then divide every term by the coefficient of y.",
   f"In {m(r'Ax+By=C')}, divide by {m('B')} to get {m(r'y=-\frac{A}{B}x+\frac{C}{B}')} when {m(r'B\ne 0')}.",
   "The negative sign appears because the x-term changes side.",pick(standard_form,0),"general-form"),
  ("intercepts","How can I draw the line from its intercepts?","At each crossing, one coordinate is zero. Find both intercepts, place them on labelled axes and join them.",
   "Set y equal to zero for the x-intercept. Set x equal to zero for the y-intercept.",
   "If both crossings are the origin, use a different point to draw the line.",pick(standard_form,1),None),
  ("integers","How do I clear the denominator when rewriting a line?","Choose a common multiple of the denominators. Multiply each term by it, then collect the variables on the left.",
   f"Moving from {m('y=mx+c')} to {m('Ax+By=C')} leaves the same set of points.",
   "Use the same multiplier for every term and for both sides.",pick(standard_form,2),None)]),
 ("perpendicular-bisectors","Equations of perpendicular bisectors","Find a line that passes through the midpoint of a segment and meets it at a right angle.",True,[
  ("midpoint","Which point must the bisector pass through?","A perpendicular bisector cuts one segment into two equal lengths. The cut is therefore at the midpoint.",
   "Average the x-coordinates and the y-coordinates to get the midpoint.",
   "Use the midpoint rather than either endpoint in the new line equation.",pick(bisector,0),"bisector"),
  ("gradient","How do I find the new line's gradient?","First find the gradient of the segment. To turn the direction through a right angle, use its negative reciprocal.",
   f"For a non-zero finite gradient {m('m')}, the bisector gradient is {m(r'-\frac1m')}. Substitute the midpoint to find the intercept.",
   "Changing the sign alone does not normally give the gradient at a right angle.",pick(bisector,1),None),
  ("axes","What if the segment is horizontal?","Its perpendicular is vertical. A vertical line is described by its fixed x-coordinate.",
   "If the segment is horizontal, use the x-coordinate of the midpoint. If it is vertical, use the midpoint's y-coordinate for a horizontal bisector.",
   "Do not divide by zero to find a perpendicular to a horizontal line.",pick(bisector,2),None)]),
]



def figures():
    a=(-3,-2)
    b=(3,2)
    charts={
     "coordinates":(svg("coordinates","A and B in different quadrants.",[("A",3,2),("B",-2,3)]),
        "Read the horizontal value first, then the vertical value."),
     "plot":(svg("plot","A straight line through the origin-offset points.",[("A",0,1),("B",2,3)],
          [((-3,-2),(4,5))]),"Plot the points that fit the equation, then draw one straight line through them."),
     "slope":(svg("slope","A gradient triangle through A and B.",[("A",*a),("B",*b)],[(a,b)],triangle=(a,b)),
        "The dashed line shows a rise of 4 and a run of 6."),
     "segment":(svg("segment","A and B with midpoint M halfway between them.",[("A",*a),("M",0,0),("B",*b)],[(a,b)],triangle=(a,b)),
        "The point halfway along the segment is halfway across and halfway up."),
     "parallel":(svg("parallel","Two lines with the same upward slope at different intercepts.",curves=[
        ((-4,-1),(4,3)),((-4,-3),(4,1))]),"Both lines rise at the same rate. Their intercepts are different."),
     "perpendicular":(svg("perpendicular","Two lines intersect at 90 degrees.",curves=[
        ((-4,-2),(4,2)),((-2,4),(2,-4))]),"The slopes are negative reciprocals. Equal scales on both axes show the right angle."),
     "general-form":(svg("general-form","A line crosses the axes at A and B.",[("A",4,0),("B",0,2)],
         [((-5,4.5),(5,-.5))]),f"The equation {m('x+2y=4')} gives the two intercepts shown. Plot both points and extend the line."),
     "bisector":(svg("bisector","Segment AB and its bisector cross at the midpoint M.",[("A",*a),("M",0,0),("B",*b)],
         [(a,b),((-2,3),(2,-3))]),"The bisector passes through the midpoint M of segment AB at a right angle."),
    }
    return {name:dict(figure,caption=p(caption)) for name,(figure,caption) in charts.items()}


def build():
    charts=figures()
    lessons,study,questions=[],{},[]
    for key,title,description,extended,methods in LESSONS:
        id=f"igcse-0580-coordinate-{key}"
        examples,sections,extra=[],[],[]
        for j,(anchor,heading,intro,idea,mistake,gen,figure) in enumerate(methods):
            first=len(examples)
            for seed in (j+3,j+7):
                q=gen(seed)
                examples.append(dict(title=q["title"],question=q["prompt"],solution=q["steps"]))
            blocks=[dict(kind="key",html=p(idea),**({"figure":charts[figure]} if figure else {})),
                dict(kind="example",index=first),check(f"{id}-{anchor}-one",gen(11+j)),
                dict(kind="mistake",html=p(mistake)),dict(kind="example",index=first+1,tryFirst=True),
                check(f"{id}-{anchor}-two",gen(16+j))]
            sections.append(dict(id=anchor,title=heading,label=anchor.capitalize(),minutes=7,level="core",intro=p(intro),blocks=blocks))
            for n in range(2):
                extra.append(check(f"{id}-{anchor}-extra-{n+1}",gen(23+3*j+n)))
        figure=charts[methods[0][-1]]
        revision="".join(f"<h2>{row[1]}</h2>"+p(row[3]) for row in methods)
        revision+=f'<p><img width="240" src="{figure["src"]}" alt="{escape(figure["alt"],quote=True)}"></p>'
        summaries={
            "coordinates":"What are the coordinates of A in the diagram? <strong>Answer.</strong> "+m("(3,2)")+".",
            "grid-gradients":"Find the slope of the marked segment. <strong>Answer.</strong> "+m(f(2,3))+".",
        }
        if key in summaries:
            q=p(summaries[key])
        else:
            sample=methods[0][5](6)
            q=sample["prompt"]+p("<strong>Answer.</strong> "+sample["result"])
        study[id]=dict(updatedOn="2026-11-22",description=description,examples=examples,sections=sections,extraPractice=extra,
            glossary=[dict(term=k,definition=p(v)) for k,v in [
              ("Origin","The point where the axes meet."),("Gradient","Vertical change divided by horizontal change."),
              ("Intercept","A point where a graph meets an axis."),("Midpoint","A point halfway between the ends of a segment.")]],
            revision=dict(body=revision,checks=q,examTip=p(methods[-1][4])))
        if lessons:
            prior=lessons[-1]
            study[id]["related"]=[dict(title=prior["title"],href=f"/courses/maths4u-0580/topics/{prior['id']}")]
        if extended:title+=" (Extended)"
        lessons.append(dict(id=id,key=key,title=title,summary=description,objective=description,
            before=p("Read the two coordinate scales from the origin."),
            ideas="".join(p(r[3]) for r in methods),method="".join(f"<h4>{r[1]}</h4>"+p(r[2]) for r in methods),
            mistakes=[r[4] for r in methods],examples=[dict(title=e["title"],question=e["question"],solution="".join(e["solution"]),
                verification=f"{id}-example-{i+1}") for i,e in enumerate(examples[::2])]))
        gens=[r[5] for r in methods]
        pairs=((0,1),(1,2),(2,0),(0,2),(2,1)) if len(gens)==3 else ((0,1),(1,2),(2,3),(3,1),(3,0))
        for j,(a,b) in enumerate(pairs):
            family=f"{id}-P{j+1}"
            questions.extend(bank_item(f"{family}-{v}",family,key,[gens[a](34+7*j+v)]) for v in range(2))
            family=f"{id}-E{j+1}"
            for v in range(4):
                seed=79+32*j+v
                questions.append(bank_item(f"{family}-{v}",family,key,[gens[a](seed),gens[b](seed+12)],v))
    pack=dict(schema_version=1,key="0580-coordinate-geometry",version="1.1.0",
        course=dict(slug="maths4u-0580",title="Cambridge IGCSE Mathematics (0580)",code="0580",direction="igcse"),
        chapter=dict(id="igcse_0580_coordinate_geometry",slug="coordinate-geometry",title="Coordinate geometry",position=31),
        source=dict(sha256=sha256(Path(__file__).read_bytes()).hexdigest(),supplied=0,held=[]),lessons=lessons,
        questions=questions,marking_status="DRAFT")
    for suffix,manifest in [("v1",pack),("study",study)]:
        (ROOT/"content/original/0580"/f"coordinate-geometry-{suffix}.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(f"{len(lessons)} lessons, {len(questions)} bank tasks")


if __name__=="__main__":
    build()
