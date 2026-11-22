"""Generate 0606 quadratic and simultaneous-equation lessons and practice."""

from pathlib import Path

from prepare_0606_algebra_support import case, choice, export_chapter, graph, lesson, m, p, pairs, part, roots, section, sy, tex, x


S="quadratics-simultaneous"


def select(factory,variant):
    return lambda i:factory(i,variant)


def solve_quadratic(i,mode):
    h=1+i//4
    a=2+i%4
    if mode==0:
        solutions=[sy.Rational(2*h+1,a),-h]
        expr=sy.expand((a*x-2*h-1)*(x+h))
        method=f"Rewrite as {m(tex((a*x-2*h-1)*(x+h))+'=0')} and apply the zero-product rule."
        work="Solve both linear factors to obtain the complete root set."
    elif mode==1:
        d=(2,3,5,6)[i%4]
        expr=sy.expand(a*((x-h)**2-d))
        solutions=[h-sy.sqrt(d),h+sy.sqrt(d)]
        method="Divide by the leading coefficient and complete the square."
        work=f"The equation becomes {m(f'(x-{h})^2={d}')}. Taking square roots gives both signs."
    else:
        expr=sy.expand(a*x*(x-h))
        solutions=[sy.Integer(0),sy.Integer(h)]
        method="Take out the common factor x and use the zero-product rule."
        work=f"The factors are {m(tex(a*x*(x-h)))}. The root at zero must be retained."
    assert all(sy.simplify(expr.subs(x,r))==0 for r in solutions)
    expected,shown=roots(solutions)
    wrong,_=roots([solutions[-1]])
    A,B,C=sy.Poly(expr,x).all_coeffs()
    discr=B*B-4*A*C
    result=part("Find all the real roots exactly.","Set of exact roots",expected,method,work,shown,kind="set",retry=(wrong,"The other factor or square-root sign gives a second solution."))
    return case("Use a suitable method to solve a quadratic",p(f"The quadratic expression is {m('F(x)='+tex(expr))}."),
        result,part("Find the discriminant of the given quadratic.","Discriminant",discr,"Read the coefficients from the expanded expression and use the discriminant.",f"Calculate {m('('+tex(B)+r')^2-4\times ('+tex(A)+r')\times ('+tex(C)+')')} using brackets for signed coefficients."),
        part("Find the x-coordinate of the line of symmetry.","Axis of symmetry",-B/(2*A),"The axis lies halfway between the two roots.",f"The average of the roots is {m(-B/(2*A))}."))


def complete(i,mode):
    a=(1+i%4)*(1 if mode!=1 else -1)
    h=2+i//6
    v=i%11-5
    expr=sy.expand(a*(x-h)**2+v)
    c=a*(x-h)**2+v
    name="minimum" if a>0 else "maximum"
    ans,shown=pairs([(h,v)])
    rng=f"[{v},inf)" if a>0 else f"(-inf,{v}]"
    assert sy.diff(expr,x).subs(x,h)==0
    return case("Complete the square and interpret the turning point",p(f"Let {m('f(x)='+tex(expr))}."),
        part("Write an equivalent expression in completed-square form.","Completed-square expression",c,"Factor the leading coefficient from the quadratic and linear terms. Complete the square inside the bracket.",f"The horizontal offset is {m(h)}, yielding {m(c)}.",kind="polynomial",variables=["x"],
             written=dict(prompt="Write the expression in completed-square form.",answer=m(c),marks=(("M1","Correctly complete the square in the variable terms."),("A1",m(c))))),
        part("Give the coordinates of the turning point.","Turning point",ans,"The square is zero at the horizontal coordinate of the turning point.",f"At {m(f'x={h}')}, the {name} output is {m(v)}.",shown,kind="pairs",retry=(f"({-h},{v})","Set the bracket equal to zero to find the input at the turning point.")),
        part("State the range for the domain of all real numbers.","Range",rng,"The sign of the leading coefficient determines which side of the vertex is reached.",f"The vertex gives the {name} value {m(v)} and is attained.",m((r"y\ge " if a>0 else r"y\le ")+str(v)),kind="set"))


def bounded(i,mode):
    h=2+i//5
    a=(1+i%4)*(1 if mode==0 else -1)
    k=i%11-5
    lo=h-(1+i%3);hi=h+(4+i%6)
    expr=a*(x-h)**2+k
    y0=a*(lo-h)**2+k; y1=a*(hi-h)**2+k
    upper=max(y0,y1,k);lower=min(y0,y1,k)
    x_ext=hi
    extremum="maximum" if a>0 else "minimum"
    rng=f"[{lower},{upper}]"
    y_lo,y_hi=m(lower),m(upper)
    return case("Compare the vertex and endpoints on a closed interval",p(f"The function {m('f(x)='+tex(expr))} has domain {m(f'{lo}\\le x\\le {hi}')} ."),
        part(f"Find the value of {m('x')} where the {extremum} occurs.","Extremising input",x_ext,"Evaluate the two endpoints and the turning point, then compare outputs.",f"The three candidate values are {m(y0)}, {m(y1)} and {m(k)}. The right endpoint is farther from the vertex.",retry=(h,"The vertex supplies one extreme. The question asks for the opposite extreme on this closed interval.")),
        part("State the full range.","Range on the interval",rng,"Use the smallest and the largest attained outputs.",f"The graph is continuous and takes every value from {y_lo} to {y_hi}.",m(f"{lower}\\le y\\le {upper}"),kind="set"))


def parameter(i,mode):
    h=2+i//5
    a=1+i%5
    r=(i%7)-3
    # k shifts the constant. Reversing the sign of the leading coefficient reverses the inequality on k.
    if mode==0:
        expr=f"{a}x^2-{2*a*h}x+k"+ (f"{r:+d}" if r else "")
        threshold=a*h*h-r
        sign="<"
        step=f"The discriminant is {m(f'{4*a}({threshold}-k)')} ."
    else:
        expr=f"-{a}x^2+{2*a*h}x+k"+(f"{r:+d}" if r else "")
        threshold=-a*h*h-r
        sign=">"
        step=f"The discriminant is {m(f'{4*a}(k-({threshold}))')} ."
    two=f"(-inf,{threshold})" if mode==0 else f"({threshold},inf)"
    none=f"({threshold},inf)" if mode==0 else f"(-inf,{threshold})"
    other=">" if mode==0 else "<"
    return case("Use the discriminant to distinguish root cases",p(f"Consider {m(expr+'=0')}, where {m('k')} is a real constant."),
        part(f"Find {m('k')} if the roots are equal.","Repeated-root value of k",threshold,"Equal roots occur when the discriminant is zero.",step),
        part(f"Find the values of {m('k')} for which there are two distinct real roots.","Range of k",two,"Use a strictly positive discriminant.",step,m(f"k{sign}{threshold}"),kind="set",retry=(none,"A negative discriminant gives no real roots. Choose the positive side of the threshold.")),
        part(f"Find the values of {m('k')} for which there are no real roots.","Range of k",none,"Use a negative discriminant.",step,m(f"k{other}{threshold}"),kind="set"))


def inequality(i,mode):
    a=(1+i%4)*(1 if mode in (0,1) else -1)
    r=-1-(i%6)
    s=2+i//5
    expr=sy.expand(a*(x-r)*(x-s))
    inside=mode in (0,3)
    inclusive=mode in (1,2)
    op=(r"\le" if inside==(a>0) else r"\ge") if inclusive else ("<" if inside==(a>0) else ">")
    if inside:
        ans=(f"[{r},{s}]" if inclusive else f"({r},{s})")
        display=m(f"{r}{op}x{op}{s}") if a>0 else m((f"{r}\\le x\\le {s}" if inclusive else f"{r}<x<{s}"))
    else:
        ans=(f"(-inf,{r}]U[{s},inf)" if inclusive else f"(-inf,{r})U({s},inf)")
        display=m(f"x\\le {r}")+" or "+m(f"x\\ge {s}") if inclusive else m(f"x<{r}")+" or "+m(f"x>{s}")
    sym=sy.Poly(expr,x)
    assert sym.eval(r)==sym.eval(s)==0
    expected,pretty=roots([r,s])
    return case("Use two zeros to solve a quadratic inequality",p(f"The quadratic expression is {m('g(x)='+tex(expr))}."),
        part("Find the two zeros of the quadratic.","Set of zeros",expected,"Factor the expression and solve both factors.",f"Use {m(tex(a*(x-r)*(x-s))+'=0')}.",pretty,kind="set"),
        part(f"Solve {m('g(x)'+op+'0')}.","Complete solution set",ans,"Mark the roots and check the sign in each region.",f"The solution lies {'between' if inside else 'outside'} the roots. {'Include' if inclusive else 'Exclude'} equality at either root.",display,kind="set"),
        part("Find the value of the quadratic at the midpoint of its two zeros.","Midpoint output",expr.subs(x,sy.Rational(r+s,2)),"Average the roots first and substitute into the expression.",f"The midpoint input is {m(sy.Rational(r+s,2))}."))


def repeated_sign(i,mode):
    h=2+i//4
    a=2+i%4
    q=sy.expand(a*(x-h)**2)
    wanted=f"(-inf,{h})U({h},inf)" if mode==0 else "empty"
    display=(m(f"x\\ne {h}") if mode==0 else "No real solutions")
    op=">" if mode==0 else "<"
    return case("Handle a repeated root in an inequality",p(f"Let {m('q(x)='+tex(q))}."),
        part("Give the only root.","Root",h,"Complete the square or recognise a double factor.",f"The repeated factor is {m(x-h)}."),
        part(f"Find the solution set of {m('q(x)'+op+'0')}.","Complete solution set",wanted,"Use the fact that a perfect square is non-negative.","A repeated root touches the horizontal axis. The sign elsewhere does not change.",display,kind="set"))


def simultaneous(i,mode):
    r=-2-i%4;s=2+i//5
    a=1+i%3
    m_slope=(1+i%5)*(1 if mode!=1 else -1)
    b=2-i%7
    line=m_slope*x+b
    curve=sy.expand(line+a*(x-r)*(x-s))
    intersections=[(r,line.subs(x,r)),(s,line.subs(x,s))]
    assert all(y==curve.subs(x,z) for z,y in intersections)
    xt,xd=roots([r,s]);pt,pd=pairs(intersections)
    return case("Find both intersections and verify the ordered pairs",p(f"Solve the simultaneous equations {m('y='+tex(line))} and {m('y='+tex(curve))}."),
        part("Find the set of possible x-coordinates.","Set of x-coordinates",xt,"Both equations describe the same y-value at an intersection. Set their right sides equal.",f"The difference factorises as {m(tex(a*(x-r)*(x-s)))}.",xd,kind="set"),
        part("Give all solutions as ordered pairs.","All ordered pairs",pt,"Substitute each root in the linear equation.",f"The two y-values are {m(intersections[0][1])} and {m(intersections[1][1])}. Check either original equation.",pd,kind="pairs"),
        part("Find the vertical separation at the average of the two x-coordinates.","Positive separation",abs((curve-line).subs(x,sy.Rational(r+s,2))),"Subtract the two outputs at the same input. Take the absolute value for the separation.",f"Evaluate the difference at {m(sy.Rational(r+s,2))}."))


def nonlinear(i,mode):
    r=2+i%5;s=r+1+i//5
    if mode==0:
        a=r+s;b=r*s
        txt=p(f"Solve the system {m(f'x+y={a}')}, {m(f'xy={b}')} .")
        result=[(r,s),(s,r)]
        rd,show=roots([r,s]); root_work=f"Use {m(f'y={a}-x')} in the product. The resulting quadratic is {m(tex((x-r)*(x-s))+'=0')} ."
    elif mode==1:
        a=r*s;b=a*s
        txt=p(f"Solve the system {m(f'xy={a}')}, {m(f'xy^2={b}')} .")
        result=[(r,s)]
        rd,show=roots([r]);root_work=f"Since {m(f'xy={a}\\ne0')}, division gives {m(f'y={b}/{a}={s}')} . Then use the first equation."
    else:
        s=r+1
        gap=2+i//4
        k=sy.Rational(r,s)+sy.Rational(s,r)
        def solve_ratio(t):
            a=gap/(t-1)
            return a,a+gap
        result=[solve_ratio(t) for t in (sy.Rational(r,s),sy.Rational(s,r))]
        txt=p(f"The non-zero variables satisfy {m(f'y=x+{gap}')} and {m(r'\frac{y}{x}+\frac{x}{y}='+tex(k))}. Find the solutions.")
        rd,show=roots([a for a,b in result]); root_work=f"Write {m('u=y/x')}. Multiplying by u gives a quadratic whose roots are {m(sy.Rational(r,s))} and {m(sy.Rational(s,r))}. For each one use {m(f'ux=x+{gap}')} to recover x."
        assert all(sy.simplify(b/a+a/b-k)==0 for a,b in result)
    pt,pd=pairs(result)
    return case("Choose a substitution or division for a nonlinear system",txt,
        part("Find every possible x-coordinate.","Set of x-coordinates",rd,"Reduce the system to one unknown before solving.",root_work,show,kind="set"),
        part("Give the complete set of ordered pairs.","All solutions",pt,"Use each result to find its corresponding y-value, then check both original equations.",f"The admissible pairs are {pd}. Any forbidden zero in a denominator is excluded.",pd,kind="pairs"))


def tangent(i,mode):
    a=(1+i%4)*(1 if mode==0 else -1)
    h=2+i//4
    v=i%9-4
    d=1+i%5
    slope=2*a*d
    curve=a*(x-h)**2+v
    meet=h+d
    k=v-slope*h-a*d*d
    point=curve.subs(x,meet)
    assert sy.expand(curve-(slope*x+k))==sy.expand(a*(x-meet)**2)
    t,shown=pairs([(meet,point)])
    sign=">" if a>0 else "<"
    ranges=f"({k},inf)" if a>0 else f"(-inf,{k})"
    return case("Find a tangent in a family of parallel lines",p(f"The curve is {m('y='+tex(curve))}. The line has equation {m('y='+tex(slope*x)+'+k')} for constant {m('k')}."),
        part(f"Find {m('k')} when the line is tangent.","Tangent intercept",k,"Equate the curve to the line. At tangency the resulting quadratic has a repeated root.",f"The square term is centred at {m(meet)}. Requiring its remaining constant to vanish gives {m(k)}."),
        part("Find the point of tangency.","Tangent point",t,"The repeated root gives the x-coordinate. Substitute it into either equation.",f"At {m(meet)}, the curve has output {m(point)}.",shown,kind="pairs"),
        part("Find the intercepts k for which there are two distinct intersections.","Values of k",ranges,"The horizontal shift in the level must give a strictly positive squared offset.",f"The equation rearranges to {m(tex(a*(x-meet)**2)+'=k-('+str(k)+')')} . Divide by the signed leading coefficient.",m(f"k{sign}{k}"),kind="set"))


def diagrams():
    from prepare_0606_algebra_support import graph
    b,g="#25578f","#207759"
    return {
        "square":graph(S,"vertex-and-axis","A parabola has a minimum at its vertex and rises on either side.",(-3,7,-4,10),[(lambda u:(u-2)**2-2,-3,7,b)],[(2,-2,"V")],[(2,-4,2,10)]),
        "bounded":graph(S,"closed-domain-outputs","A finite parabola arc includes both endpoints and a lower internal vertex.",(-2,8,-3,14),[(lambda u:(u-2)**2-1,-1,5,b)],[(-1,8,"A"),(2,-1,"V"),(5,8,"B")]),
        "roots":graph(S,"distinct-tangent-or-miss","A parabola with levels crossing it twice, touching once and missing it.",(-4,5,-4,8),[(lambda t:(t-1)**2-1,-4,5,b) ],[(1,-1,"V")],[(-4,-3,5,-3),(-4,-1,5,-1),(-4,3,5,3)]),
        "signs":graph(S,"quadratic-sign-regions","The quadratic is below the horizontal axis between its two intercepts.",(-4,6,-8,14),[(lambda t:(t+1)*(t-4),-4,6,b)],[(-1,0,"A"),(4,0,"B")]),
        "intersect":graph(S,"line-intersections","A rising line crosses a parabola in two marked points.",(-4,6,-5,16),[(lambda t:t*t-2*t-2,-4,6,b),(lambda t:t-2,-4,6,g)],[(0,-2,"A"),(3,1,"B")]),
        "tangent":graph(S,"tangent-and-parallel","A tangent touches the upward parabola, while a parallel line crosses it twice.",(-2,7,-5,20),[(lambda t:t*t,-2,7,b),(lambda t:4*t-4,-2,7,g)],[(2,4,"T")],[(-2,-9,7,27)]),
    }


def build():
    pics=diagrams()
    glossary=[("Root","An input for which the expression is zero."),("Discriminant",f"The value {m('b^2-4ac')} that determines how many real roots there are."),("Tangent","A line that meets a parabola in exactly one point."),("Eliminate","Combine equations to remove one of the unknowns.")]
    def l(key,title,desc,body,counts):return lesson(key,title,desc,body,glossary,[(select(fun,mode),count) for fun,mode,count in counts])
    def sec(key,title,intro,idea,err,fun,mode,focus,diagram=None):return section(key,title,intro,idea,err,select(fun,mode),focus,pics.get(diagram))
    lessons=[
        l("quadratic-roots","Solving quadratic equations exactly","Choose factorisation, the quadratic formula or completing the square. Give every admissible root.",[
          sec("factors","Can I spot two linear factors?","Move all terms to one side. Look for a common factor or simple factors before using the formula.","If a product is zero, at least one factor equals zero.","Both factors can give roots. Keep a possible zero root.",solve_quadratic,0,0),
          sec("square-roots","What if the roots contain a square root?","Complete the square or use the quadratic formula. Preserve the exact radical.",f"The formula is {m(r'x=\frac{-b\pm\sqrt{b^2-4ac}}{2a}')} for a non-zero leading coefficient.","Keep both signs and group the whole numerator over the denominator.",solve_quadratic,1,0),
          sec("zero","Do I lose anything by dividing by x?","A common factor of x can equal zero. Set both factors equal to zero separately.","Factor an expression first and preserve all admissible inputs.","Dividing by x before considering x = 0 can discard a solution.",solve_quadratic,2,0),
        ],[(solve_quadratic,0,6),(solve_quadratic,1,7),(solve_quadratic,2,4)]),
        l("turning-point","Completing the square and turning points","Read a vertex, sketch the graph and give its range from completed-square form.",[
          sec("rewrite","How do I complete the square with a leading coefficient?","Take the leading coefficient out of the variable terms. Halve the new coefficient of x and square it.","Restore the constant so the new expression expands to the starting one.","Keep the outer coefficient when correcting the constant.",complete,0,0,"square"),
          sec("vertex","How do the brackets identify the turning point?","Find the input where the square is zero. Take the output at that input as the second coordinate.",f"For {m('a(x-h)^2+k')}, the turning point is {m('(h,k)')}.","The horizontal coordinate is opposite to the sign shown in the bracket.",complete,0,1),
          sec("range","Does the vertex give a minimum or maximum?","The square is non-negative. Multiplying by a negative coefficient reflects the opening direction.","An upward curve has a minimum. A downward curve has a maximum.","Give a range of outputs, with the turning-point value included.",complete,1,2),
        ],[(complete,0,7),(complete,1,6)]),
        l("bounded-range","Quadratic range on a restricted domain","Compare endpoints with any included turning point before writing a range.",[
          sec("candidates","Which inputs can give the extremes?","List the two included endpoints. Add the vertex if its input lies in the interval.","The graph's extremes on a closed interval occur at the candidates listed.","A turning point may lie outside the domain.",bounded,0,0,"bounded"),
          sec("close-range","How can I write the full range?","Calculate the smallest and largest outputs at the candidates.","A continuous curve on this closed interval takes every value between the two attained extremes.","The upper output need not come from the input endpoint furthest to the right.",bounded,0,1),
          sec("reverse-opening","How does a negative coefficient change the comparison?","The highest point may be inside the interval when the opening is downward. Compare both endpoints to find the lowest.","Use the direction of opening as a check on your calculation.","Replacing x bounds by y bounds without evaluating them confuses domain with range.",bounded,1,1),
        ],[(bounded,0,5),(bounded,1,4)]),
        l("discriminant","Discriminants and parameters","Find when a parameter changes the number of real roots.",[
          sec("threshold","When are the roots equal?","Read the three coefficients after putting zero on one side. Calculate the discriminant in terms of the parameter.","Zero discriminant gives one repeated real root.","Use the coefficient of x including its sign, and square that entire coefficient.",parameter,0,0,"roots"),
          sec("two-roots","When are there two distinct roots?","Solve the inequality that makes the expression below the square root positive.","Use a strict inequality for two distinct roots.","The repeated-root parameter belongs to a different case.",parameter,0,1),
          sec("no-roots","When does a real root fail to exist?","A negative discriminant cannot have a real square root. Solve the inequality with the correct sign.","No real roots means the discriminant is strictly negative.","Reverse the inequality if dividing by a negative expression known to be constant.",parameter,1,2),
        ],[(parameter,0,8),(parameter,1,7)]),
        l("signs-and-inequalities","Quadratic inequalities and sign diagrams","Find all intervals, including the correct endpoint choices and repeated-root cases.",[
          sec("regions","Which parts of the graph satisfy an inequality?","Find the roots and mark them on the axis. Check whether each region lies above or below.","A quadratic with positive leading coefficient is negative between its distinct roots and positive outside.","Check the leading sign before choosing the central interval.",inequality,0,1,"signs"),
          sec("endpoints","When do I include a root?","Evaluate the original statement at equality. Include a root when equality satisfies the inequality.","A non-strict sign includes the two boundary points. A strict sign excludes them.","For separate intervals, use or to join them.",inequality,1,1),
          sec("double-zero","What if the graph only touches the axis?","A repeated root touches the axis and does not change the sign of the quadratic.","A non-negative perfect square has one zero and is positive elsewhere.","Do not introduce a sign change at a double root.",repeated_sign,0,1),
        ],[(inequality,0,4),(inequality,1,4),(inequality,2,4),(inequality,3,3),(repeated_sign,0,2),(repeated_sign,1,1)]),
        l("line-curve","Simultaneous linear and quadratic equations","Substitute one equation into the other and recover all matching coordinates.",[
          sec("eliminate","How can I remove the y-variable?","Both equations specify the same output at an intersection. Substitute using the simpler equation.","An equal-output equation reduces the problem to one variable.","Write which two expressions are equal before expanding.",simultaneous,0,0,"intersect"),
          sec("pairs","How do I keep the coordinates paired correctly?","Work with one root at a time. Use the line to find the matching y-coordinate and check the curve.","Report both ordered pairs when there are two intersections.","Two lists of coordinates are ambiguous unless the matching pairs are clear.",simultaneous,1,1),
          sec("compare","Can I measure how far apart the graphs are?","Use one x-coordinate for both outputs. A vertical separation is the positive difference between outputs.","Take the absolute value of the difference to express a distance.","A horizontal separation measures a different quantity.",simultaneous,0,2),
        ],[(simultaneous,0,7),(simultaneous,1,7)]),
        l("nonlinear-systems","Simultaneous nonlinear systems","Choose a substitution or divide safely when two nonlinear equations share a factor.",[
          sec("product","How can a sum and product give two variables?","Use the sum to express one variable in terms of the other. Substitute in the product equation.","The two roots may give two ordered pairs with the coordinates exchanged.","Record each valid pair even when both pairs contain the same numbers.",nonlinear,0,1),
          sec("divide","When is it safe to divide two equations?","Check whether the common expression is non-zero from the stated data.","A known non-zero product can be used as a divisor.","Before dividing by an expression, explain how zero is ruled out.",nonlinear,1,0),
          sec("ratio","Which substitution works for ratios?","Spot ratios that are reciprocals. Take one ratio as a new unknown and express all other ratios using it.","After solving the substituted equation, recover both original variables subject to all denominator restrictions.","A root of the substituted equation is not yet the requested ordered pair.",nonlinear,2,1),
        ],[(nonlinear,0,4),(nonlinear,1,3),(nonlinear,2,3)]),
        l("tangency","Tangents and families of parallel lines","Connect a repeated root with tangency and use the discriminant to classify intersections.",[
          sec("condition","How do I recognise tangency algebraically?","Set the line and curve outputs equal. Use the fact that the resulting quadratic has a repeated root.","A repeated root corresponds to a single common point for these line–parabola problems.","Use the discriminant of the intersection equation.",tangent,0,0,"tangent"),
          sec("contact","What are the tangent point's coordinates?","Use the repeated intersection input to find its output from either equation.","A tangent condition and a point of contact are different results.","Give both x and y when the question asks for a point.",tangent,1,1),
          sec("two-crossings","How does shifting the line change the number of intersections?","Compare the line intercept with its value at tangency. A small sketch can confirm which direction produces two crossings.","A strictly positive discriminant gives two distinct intersection points.","The boundary value is excluded when there must be two crossings.",tangent,0,2),
        ],[(tangent,0,5),(tangent,1,5)]),
    ]
    export_chapter(S,"Quadratics and simultaneous equations",1,lessons,[__file__,Path(__file__).with_name("prepare_0606_algebra_support.py")])


if __name__=="__main__":
    build()
