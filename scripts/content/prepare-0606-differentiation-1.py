"""Author the Cambridge 0606 Differentiation 1 lesson and question package."""

import sympy as s

from addmaths_calculus import C, D2, DY, Q, X, Lesson, Part, Scenario, answer, build, choices, eq, explain, field, m, math, pair, plot, rng, table, tex


def slope_part(F, x, g, ask="Find the gradient at the specified input."):
    value = g.subs(X,x)
    assert s.simplify(value-s.diff(F,X).subs(X,x))==0
    return answer(f"{ask} Use {m(f'x={tex(x)}')}.",value,
                  f"Substitute {math(x)} into {m(DY)} after differentiating.",
                  eq(DY + r'\big|_{x='+tex(x)+'}',value),
                  method="Substitute into the derived function.",
                  grader=field("gradient","Gradient",value))


def derivative_part(f, g, method, step, seed, mistake=None, lhs=DY):
    assert s.simplify(s.diff(f,X)-g)==0, (f,g)
    if g.is_polynomial(X):
        desc=field("derivative","Derivative in x",s.expand(g),"polynomial",("x",))
    else:
        wrong=mistake if mistake is not None and s.simplify(g-mistake)!=0 else g+2
        desc=choices(eq(lhs,g),[eq(lhs,wrong),eq(lhs,g-7),eq(lhs,g+9)],seed)
    return answer(f"Find {m(lhs)}.",g,step,eq(lhs,g),method=method,grader=desc,displayed=eq(lhs,g))


def gradient(seed, style):
    r=rng(seed)
    a,b,c=r.randrange(1,9),r.randrange(-7,8),r.randrange(-9,10)
    d=r.randrange(2,13)
    if style==0:
        f=a*X**3+b*X**2-d*X+c
        g=3*a*X**2+2*b*X-d
        x=r.randrange(-3,4)
        domain=""
    elif style==1:
        f=a*s.sqrt(X)+b*X-c/X+d
        g=a/(2*s.sqrt(X))+b+c/X**2
        x=r.choice((1,4,9,16))
        domain=" The domain is "+m("x>0")+"."
    else:
        n=r.choice((2,3,4))
        f=a*X**n+d*X-n*c
        g=a*n*X**(n-1)+d
        x=r.randrange(1,6)
        domain=""
    part=derivative_part(f,g,"Apply the power rule to each non-constant term.",
        "Write square roots and reciprocals as rational powers before using the power rule.",
        seed,mistake=f)
    gain=g.subs(X,x)
    part3=explain("Explain what the sign of your gradient says about the curve near this point.",
        "The curve is rising." if gain>0 else "The curve is falling." if gain<0 else "The tangent is horizontal.",
        f"The gradient here is {math(gain)}.",
        "A positive gradient rises to the right, a negative gradient falls to the right and zero gives a horizontal tangent.",
        marks=(("B1","Relate the sign at the point to the direction or horizontal tangent."),))
    return Scenario("Find and interpret a gradient function",f"A curve is defined by {eq('y',f)}.{domain}",
        (part,slope_part(f,x,g),part3),"Differentiate before putting in the coordinate.",
        "Multiply a power term by its old exponent, then reduce the exponent by one.")


def chain(seed, style):
    r=rng(seed)
    a,b,c=r.randrange(2,9),r.randrange(1,10),r.randrange(1,12)
    if style==0:
        u=a*X+b
        exponent=r.choice((2,3,4))
        x=r.randrange(0,5)
    elif style==1:
        u=X**2+b
        exponent=Q(1,2)
        x=0
    else:
        u=a*X+b
        exponent=-r.choice((1,2,3))
        x=r.randrange(0,5)
    f=c*u**exponent
    g=c*exponent*u**(exponent-1)*s.diff(u,X)
    part=derivative_part(f,g,"Apply the outer power rule and multiply by the inner derivative.",
          f"Set {eq('u',u)}. The inner derivative is {eq(r'\frac{\mathrm du}{\mathrm dx}',s.diff(u,X))}.",
          seed,c*exponent*u**(exponent-1))
    increment=Q(r.randrange(1,9),100)
    estimate=f.subs(X,x)+g.subs(X,x)*increment
    part3=answer(f"Use the tangent at {m(f'x={x}')} to estimate {m(f'f({tex(x+increment)})')}.",estimate,
          f"The change in {m('x')} is {math(increment)}. Use {m(r'f(x+h)\simeq f(x)+hf^{\prime}(x)')}.",
          method="Use the gradient and the signed small increment.")
    restriction=f" Work where {m(tex(u)+'>0')}." if style==2 else ""
    return Scenario("Differentiate an outer power with an inner function",f"The function is {eq('f(x)',f)}.{restriction}",
        (part,slope_part(f,x,g),part3),"Identify the inner function before differentiating the outer power.",
        "The derivative of the inner function must multiply the outer derivative.")


def product(seed, style):
    r=rng(seed)
    a,b,c,d=(r.randrange(1,13) for _ in range(4))
    if style==0:
        u,v=(X+a)**2,b*X+c
        x=r.randrange(-2,4)
    elif style==1:
        u,v=X**2+a*X+c,s.sqrt(X+b)
        x=16-b
    else:
        u,v=(a*X-b)**2,(c*X+d)**2
        x=r.randrange(0,5)
    f=u*v
    g=s.diff(u,X)*v+u*s.diff(v,X)
    dpart=derivative_part(f,g,
        "Differentiate one factor at a time and add both product terms.",
        f"With {eq('u',u)} and {eq('v',v)}, use {m(r'(uv)^\prime=u^\prime v+uv^\prime')}.",
        seed,s.diff(u,X)*s.diff(v,X))
    fx=f.subs(X,x)
    gx=g.subs(X,x)
    intercept=s.simplify(fx-gx*x)
    line=gx*X+intercept
    assert s.simplify(line.subs(X,x)-fx)==0
    part3=answer(f"Find the equation of the tangent at {m(f'x={x}')} in the form {m('y=mx+c')}.",line,
        f"The tangent passes through {m(pair(x,fx))} with gradient {math(s.simplify(gx))}.",
        f"Substitute these into {m(r'y-y_0=m(x-x_0)')}.",
        method="Use the original curve to find the point and the derivative to find the gradient.",
        displayed=eq("y",s.simplify(line)),grader=field("tangent","Equation of the tangent",f"y={s.simplify(line)}","equation",("x","y")))
    restriction=f" Take {m('x>'+str(-b))}." if style==1 else ""
    return Scenario("Differentiate two changing factors", f"A curve has equation {eq('y',f)}.{restriction}",
        (dpart,slope_part(f,x,g),part3),"Keep one factor unchanged in each of the two derivative terms.",
        "A product of derivatives does not account for the changes in the two original factors.")


def quotient(seed, style):
    r=rng(seed)
    a,b,c,d=(r.randrange(1,13) for _ in range(4))
    if style==0:
        u,v=X**2+a,b*X+c
    elif style==1:
        u,v=a*X+b,X**2+c
    else:
        u,v=(a*X+b)**2,X+d
    x=r.randrange(0,6)
    f=u/v
    du,dv=s.diff(u,X),s.diff(v,X)
    g=(v*du-u*dv)/v**2
    part=derivative_part(f,g,"Use the signed quotient numerator and square the denominator.",
        f"Use {m(r'(u/v)^\prime=\frac{vu^\prime-uv^\prime}{v^2}')} with {eq('u',u)} and {eq('v',v)}.",
        seed,-g)
    if style==1:
        domain=explain("State the domain of the given function and justify your answer.","All real values of x.",
           f"Since {math(c)} is positive, {m(tex(v)+'>0')} for all real {m('x')}.",
           marks=(("B1","State that every real input is allowed because the denominator is positive."),))
    else:
        zero=s.solve(v,X)[0]
        domain=answer("State the excluded input.",zero,
           f"The denominator is zero at {m('x='+tex(zero))}.",
           method="Set the original denominator equal to zero.",
           grader=field("excluded","Excluded x-value",zero))
    formula = m(r"y=\frac{"+tex(u)+"}{"+tex(v)+"}")
    return Scenario("Use the quotient rule and keep its domain",f"A curve has equation {formula}.",
        (part,slope_part(f,x,g),domain),"The numerator starts with denominator times derivative of numerator.",
        "Reversing the subtraction reverses the derivative. Square the entire denominator.")


def tangent(seed, style):
    r=rng(seed)
    a,b,c=r.randrange(1,11),r.randrange(2,11),r.randrange(-11,12)
    z=r.randrange(-4,6)
    if style==0:
        f=a*X**3+b*X+c
        at=z
        restriction=""
    elif style==1:
        f=a*X**2+b*X+c
        at=r.randrange(1,6)
        restriction=""
    else:
        f=a*(X-z)**2+c
        at=z
        restriction=""
    g=s.diff(f,X)
    y=f.subs(X,at)
    t=g.subs(X,at)
    tangent=t*X+y-t*at
    normal=(-X+at)/t+y if t else None
    assert s.simplify(tangent.subs(X,at)-y)==0
    tpart=answer("Find the equation of the tangent.",tangent,f"At the stated input, the point is {m(pair(at,y))}.",
        f"The derivative evaluated at the point is {math(t)}.",method="Find the point and use the tangent gradient in the point–gradient equation.",
        displayed=eq("y",tangent),grader=field("tangent","Equation of tangent",f"y={tangent}","equation",("x","y")))
    desc=eq("y",s.expand(normal)) if normal is not None else eq("x",at)
    expected=f"y={s.expand(normal)}" if normal is not None else f"x={at}"
    if normal is not None:
        assert s.simplify(normal.subs(X,at)-y)==0 and s.diff(normal,X)*t==-1
    npart=answer("Find the equation of the normal at the same point.",None,
        f"The normal gradient is {math(-1/t)} because the lines are perpendicular." if t else "The tangent is horizontal. A vertical line is perpendicular to it.",
        f"The normal passes through {m(pair(at,y))}.", method="Use the negative reciprocal gradient, or a vertical line for a horizontal tangent.",
        displayed=desc,grader=field("normal","Equation of normal",expected,"equation",("x","y")))
    return Scenario("Equations of tangent and normal",f"For the curve {eq('y',f)}, consider the point with {m('x='+str(at))}.{restriction}",
        (slope_part(f,at,g),tpart,npart),"Use the original curve for the coordinate and the derivative for the tangent gradient.",
        "Only the normal uses the negative reciprocal. The tangent uses the derivative itself.")


def increment(seed, style):
    r=rng(seed)
    a,b,d=r.randrange(1,12),r.randrange(2,13),r.randrange(1,12)
    h=Q(r.choice((-9,-7,-5,-3,1,3,5,7,9)),100)
    if style==0:
        x=r.randrange(1,12)
        f=a*X**2+b*X+d
    elif style==1:
        x=r.choice((4,9,16,25))
        f=a*s.sqrt(X)+b*X+d
    else:
        x=r.randrange(2,11)
        f=a/X+b*X+d
    g=s.diff(f,X)
    change=s.simplify(g.subs(X,x)*h)
    result=s.simplify(f.subs(X,x)+change)
    assert s.simplify((result-f.subs(X,x))/h-g.subs(X,x))==0
    part1=answer(f"Estimate {m(r'\delta y')} using a derivative.",change,
                f"At {m('x='+str(x))}, {eq(DY,g.subs(X,x))}. Multiply by {eq(r'\delta x',h)}.",
                method="Use the derivative at the original input and the signed increment.",
                grader=field("change","Estimated change in y",change))
    part2=answer("Use your estimate of the change to estimate the new value of y.",result,
                 f"The original value is {math(f.subs(X,x))}. Add the signed estimate {math(change)}.",
                 method="Add the approximate change to the original value.",
                 grader=field("estimate","New value of y",result))
    return Scenario("Use a tangent to estimate a small change",f"The quantity {m('y')} is given by {eq('y',f)}. The input changes from {math(x)} to {math(x+h)}.",
        (part1,part2),"Find the change in the input, including its sign.",
        "The derivative gives change per unit. Multiply by the input increment, then add that result for a new value.")


def rates(seed, style):
    r=rng(seed)
    radius=r.randrange(2,15)
    k=r.randrange(2,11)
    speed=Q(r.choice((-7,-5,-3,1,2,3,5,7)),5)
    R=s.Symbol("r",positive=True)
    if style==0:
        name,short,unit,power="area","A","cm²",s.pi*R**2
        intro="A circular patch changes size while staying circular."
    elif style==1:
        name,short,unit,power="volume","V","cm³",Q(4,3)*s.pi*R**3
        intro="A spherical balloon changes size while staying spherical."
    else:
        name,short,unit,power="volume","V","cm³",k*s.pi*R**3
        intro=f"A cylinder changes size, preserving a height of {math(k)} times its radius."
    derivative=s.diff(power,R).subs(R,radius)
    variation=s.simplify(derivative*speed)
    slope=answer(f"At {m(f'r={radius}')}, find the rate of change of {name} with respect to radius.",derivative,
                 f"Differentiate {eq(short,power)} with respect to {m('r')}, then substitute {math(radius)}.",
                 method="Differentiate the geometric formula in radius.",
                 grader=field("radial-rate",f"Rate with respect to radius, without units",derivative))
    rate=answer(f"Find the rate of change of {name} with respect to time, in {unit} per second.",variation,
              m(r'\frac{\mathrm d'+short+r'}{\mathrm dt}=\frac{\mathrm d'+short+r'}{\mathrm dr}\frac{\mathrm dr}{\mathrm dt}'),
              f"Use {math(derivative)} multiplied by {math(speed)}.", method="Multiply the two linked rates at the same instant.",
              grader=field("time-rate",f"Rate in {unit} per second",variation))
    sign=explain("Interpret the sign of this rate of change.",f"The {name} is {'increasing' if speed>0 else 'decreasing'}.",
        f"The derivative with respect to radius is positive. The radius is {'increasing' if speed>0 else 'decreasing'} at the stated instant.",
        marks=(("B1","Explain the direction using the sign of the time derivative."),))
    assert s.simplify(variation/speed-derivative)==0
    return Scenario("Connect a geometric measurement to time",f"{intro} The radius {m('r')} in centimetres changes at {math(speed)} cm/s at the instant when {m('r='+str(radius))}. The {name} is {eq(short,power)}.",
        (slope,rate,sign),"Write the chain rule so that the radius is the link between the measurement and time.",
        "The geometric derivative is measured per centimetre of radius. Multiply by the signed rate of radius for a rate per second.")


def second(seed, style):
    r=rng(seed)
    a,b,c,d=(r.randrange(1,12) for _ in range(4))
    if style==0:
        f=a*X**4-b*X**3+c*X-d
        g=4*a*X**3-3*b*X**2+c
        h=12*a*X**2-6*b*X
        x=r.randrange(-3,4)
    elif style==1:
        f=a*(X-b)**3+c*X+d
        g=3*a*(X-b)**2+c
        h=6*a*(X-b)
        x=b+r.choice((-3,-2,-1,1,2,3))
    else:
        f=a/X**2+b*X+c
        g=-2*a/X**3+b
        h=6*a/X**4
        x=r.randrange(1,8)
    first=derivative_part(f,g,"Find the first derivative.","Differentiate each term.",seed)
    second_part=derivative_part(g,h,"Differentiate the first gradient function.","Apply the differentiation rule once more.",seed+1,lhs=D2)
    third=answer(f"Evaluate {m(D2)} at {m(f'x={x}')}.",h.subs(X,x),
          f"Use the expression for the second derivative, {math(h)}.",method="Substitute into the second derivative.",
          grader=field("curvature","Second derivative at the point",h.subs(X,x)))
    restriction=f" Use {m('x>0')}." if style==2 else ""
    return Scenario("Differentiate twice without confusing the two functions",f"A curve is defined by {eq('y',f)}.{restriction}",
        (first,second_part,third),"Find the gradient function first and apply the derivative rule to that function.",
        "The second derivative differentiates the first. It is not the square of the first derivative.")


def stationary(seed, style):
    r=rng(seed)
    a=r.randrange(1,8)*(-1 if style==1 else 1)
    u=r.randrange(-6,3)
    v=u+r.randrange(2,9)
    c=r.randrange(-12,13)
    if style==2:
        f=a*(X-u)**2+c
        g=2*a*(X-u)
        xs=[u]
    else:
        g=6*a*(X-u)*(X-v)
        f=2*a*X**3-3*a*(u+v)*X**2+6*a*u*v*X+c
        xs=[u,v]
    assert s.simplify(s.diff(f,X)-g)==0
    coords=[(x,f.subs(X,x)) for x in xs]
    displayed=", ".join(m(pair(x,y)) for x,y in coords)
    ordered=";".join(f"({x},{y})" for x,y in coords)
    complete=answer("Find the coordinates of every stationary point.",None,
       f"The derivative is {math(g)}. Set it equal to zero and solve for {m('x')}.",
       f"Substitute the stationary input{'s' if len(xs)>1 else ''} into the original function.",
       method="Set the gradient equal to zero and substitute into the original function.",
       displayed=displayed,grader=field("stationary-points","Coordinates of every stationary point",ordered,"pairs"))
    kinds=["minimum" if s.diff(g,X).subs(X,x)>0 else "maximum" for x in xs]
    reason=" and ".join(f"{kind} at {m('x='+str(x))}" for x,kind in zip(xs,kinds))
    second_part=answer(f"Find {m(D2)} at {m(f'x={u}')}.",s.diff(g,X).subs(X,u),
                  f"Differentiate the gradient function {math(g)} and substitute {math(u)}.",
                  method="Differentiate the first derivative once more and evaluate.",
                  grader=field("second","Second derivative at specified x",s.diff(g,X).subs(X,u)))
    class_part=explain("Justify the nature of each stationary point.",reason,
       *[f"At {m('x='+str(x))}, {eq(D2,s.diff(g,X).subs(X,x))}. This is a {kind}." for x,kind in zip(xs,kinds)],
       marks=tuple(("B1",f"Justify the {kind} at {m('x='+str(x))} by curvature or a correct gradient sign change.") for x,kind in zip(xs,kinds)))
    return Scenario("Locate and justify the nature of stationary points",f"Consider the curve {eq('y',f)}.",
        (complete,second_part,class_part),"Find all roots of the derivative, then evaluate y and check the nature of each point.",
        "The derivative is zero at a stationary point. Classify the point by a sign test, not by the sign of its y-coordinate.")


def optimisation(seed, style):
    r=rng(seed)
    a=r.randrange(3,14)
    if style==0:
        ctx=r.choice(("A training enclosure","A display area","A garden patch"))
        intro=f"{ctx} is a rectangle against a wall. Only the three exposed sides are fenced, using {math(4*a)} m of fencing. Let {m('x')} m be the length of each side perpendicular to the wall."
        model=X*(4*a-2*X)
        bound=2*a
        at=a
        units="m²"
        quantity="area"
        constraint=eq("L",4*a-2*X)
    elif style==1:
        ctx=r.choice(("A cardstock square","A piece of thin metal","A square sheet of crafting plastic"))
        intro=f"{ctx} has side {math(6*a)} cm. Four squares of side {m('x')} cm are removed from the corners. The sides fold up into an open tray."
        model=X*(6*a-2*X)**2
        bound=3*a
        at=a
        units="cm³"
        quantity="volume"
        constraint=eq("L",6*a-2*X)
    else:
        ratio=r.randrange(2,7)
        intro=f"An open rectangular tank has a base of width {m('x')} cm and length {math(ratio*X)} cm. Its base and four sides use {math(3*ratio*a*a)} cm² of material."
        model=ratio**2*X*(3*a*a-X**2)/(2*(ratio+1))
        bound=a*s.sqrt(3)
        at=a
        units="cm³"
        quantity="volume"
        constraint=eq("h",ratio*(3*a*a-X**2)/(2*(ratio+1)*X))
    derivative=s.diff(model,X)
    value=model.subs(X,at)
    assert 0<at<bound and s.simplify(derivative.subs(X,at))==0 and s.diff(derivative,X).subs(X,at)<0
    assert s.simplify(model.subs(X,0))==0 and s.simplify(model.subs(X,bound))==0
    assert sum(bool(z.is_real and z>0 and z<bound) for z in s.solve(derivative,X))==1
    label="A" if style==0 else "V"
    mpart=answer(f"Write the {quantity} as a function of {m('x')} and give its physical domain.",None,
        f"The remaining length or height is {constraint}. Substitute it into the {quantity} formula.",
        f"Both dimensions must be positive, so use {m('0<x<'+tex(bound))}.",
        displayed=eq(label,model)+", "+m('0<x<'+tex(bound)),
        method="Express the other dimension in terms of x and require positive dimensions.")
    max_part=answer(f"Find the input {m('x')} at which the {quantity} is greatest. Justify that it gives a maximum.",at,
        f"Set {math(s.factor(derivative))} equal to zero and keep only the root inside the domain.",
        f"The second derivative at this root is {math(s.diff(model,X,2).subs(X,at))} and the {quantity} approaches zero at both ends.",
        method="Find the unique feasible stationary root and use curvature and the behaviour at the edges.",
        grader=field("input","Optimal x",at))
    best=answer(f"Find the greatest {quantity} in {units}.",value,
        f"Evaluate the original {quantity} at {m('x='+str(at))}.",method="Substitute the optimal input into the model.",
        grader=field("value",f"Greatest {quantity} in {units}",value))
    return Scenario("Optimise a geometric model within its physical domain",intro,(mpart,max_part,best),
        "Use the constraint to express the measurement in one variable. Then specify its physical domain.",
        "A root outside the physical domain is not a feasible choice. Check that the stationary point is a maximum.")


def variants(model):
    return tuple(lambda seed,style=style:model(seed,style) for style in range(3))


def rows(*data):
    return data


def main():
    f="differentiation-1"
    parabola=plot(f,"slope-tangent","A tangent to y = x² at (1, 1) has the same gradient as the curve at the point.",
        ((lambda x:x*x,"#12547d"),(lambda x:2*x-1,"#c05a18")),(-1.7,3.0),(-2,6),((1,1,"(1, 1)",10,-8),))
    normal_diagram=plot(f,"tangent-normal","The two straight lines at (1, 1) are perpendicular. The blue curve is y = x².",
        ((lambda x:x*x,"#12547d"),(lambda x:2*x-1,"#c05a18"),(lambda x:(3-x)/2,"#14754f")),
        (-1,3),(-1,3),((1,1,"(1, 1)",10,12),))
    linearisation=plot(f,"small-increment","The tangent estimates the nearby curve value, with a small gap between the two at x = 2.5.",
        ((lambda x:x*x,"#12547d"),(lambda x:4*x-4,"#c05a18")),(1,3),(0.6,9.6),((2,4,"Start (2, 4)",-95,-10),(2.5,6,"Tangent estimate",8,16)))
    extrema=plot(f,"two-stationary-points","A cubic has a local maximum at x = −1 and a local minimum at x = 1.",
        ((lambda x:x*x*x-3*x,"#12547d"),),(-2.4,2.4),(-5,5),((-1,2,"Maximum",-69,-12),(1,-2,"Minimum",6,20)))
    opt=plot(f,"tray-volume","The volume of the open tray rises then falls. The boundary dimensions give zero volume.",
        ((lambda x:4*x*(3-x)*(3-x),"#12547d"),),(0,3),(-1,21),((1,16,"Maximum",10,-10),))
    lessons=[
        Lesson("d1-gradient","Gradient function and the power rule","Read gradient as an instantaneous rate and apply the power rule to sums, roots and reciprocals.",variants(gradient),rows(
            ("derived-function","What does a derivative tell you?",f"{m(DY)} gives the tangent gradient for each admissible input. Imagine the secant moving until its two points meet.",
             "Differentiate each power of x, add the results and substitute a coordinate only after differentiating.",
             "Substituting a point into the original function gives its height, not its gradient."),
            ("rational-powers","How do roots and reciprocals differentiate?",f"Use {m(r'\frac{\mathrm d}{\mathrm dx}x^n=nx^{n-1}')} for a rational power on the domain where the required derivative exists.",
             "Rewrite roots and denominators using exponent notation. Multiply by the old exponent and subtract one from that exponent.",
             "A negative exponent becomes more negative when you subtract one."),
            ("interpret-gradient","How does the sign describe the curve?","A positive gradient means the curve is moving upwards as x increases at the point. A negative gradient means it is falling.",
             "Calculate the derivative, evaluate it and use its sign to describe the tangent.",
             "A positive y-coordinate does not guarantee a positive gradient.")),
            (("Derived function","The function made by differentiating the original one."),("Secant","A line through two points on a curve."),("Tangent","A line with the gradient of the curve at its point of contact.")),
            "Write the gradient function before evaluating it. The calculus formulae are recalled from memory in 0606.",12,parabola),
        Lesson("d1-chain-rule","Chain rule and nested powers","Identify the inner function before differentiating a composite power, root or reciprocal.",variants(chain),rows(
            ("inner-outer","Which function is inside the other?","The outside power acts on the entire expression in brackets.",
             f"Call the bracket u, find {m(r'\frac{\mathrm dy}{\mathrm du}')} and {m(r'\frac{\mathrm du}{\mathrm dx}')}, then multiply and substitute back.",
             "The outer derivative alone omits the rate of the inside function."),
            ("square-root","What if the outer operation is a root?","An outer square root is a power of one half on inputs where the expression is positive.",
             "Treat the expression inside the root as one object. Simplify only after multiplying by its derivative.",
             "Do not differentiate the two terms inside a root as separate roots."),
            ("reciprocal","How does an outer reciprocal change the sign?","A reciprocal can be treated as a negative power, keeping the restriction from its denominator.",
             "Find the derivative where the original function is defined, then use it for gradients or a small-increment estimate.",
             "Check the denominator before evaluating at a stated x-value.")),
            (("Inner function","The function whose output is used by the outer function."),("Composite function","One function applied to the output of another."),("Reciprocal","One divided by a non-zero value.")),
            "Write the two derivative factors clearly before simplifying.",14),
        Lesson("d1-product-rule","Product rule","Differentiate the product of two functions and use the result to find a tangent.",variants(product),rows(
            ("keep-a-factor","Which factor stays unchanged?","Keep one factor in each term, then differentiate the other.",
             f"For {m('y=uv')}, write {m(r'\frac{\mathrm dy}{\mathrm dx}=u^\prime v+uv^\prime')}. Label both factors and their derivatives.",
             "Multiplying the two derivatives alone drops both original factors."),
            ("root-factor","How do you differentiate a root factor?","One factor may itself need the chain rule or a power rule with a fractional exponent.",
             "Find each derivative separately, then return to the product rule and preserve any restriction.",
             "A root in the original model can restrict the domain of the derivative."),
            ("two-chains","What if both factors need the chain rule?","The chain rule can occur inside each product-rule term.",
             "Differentiate the first bracketed power with its inner factor, then the second. Combine the original and derived factors in the product rule.",
             "Do not substitute a coordinate into both factors before differentiating.")),
            (("Factor","An expression multiplied by another expression."),("Product","The result of multiplying factors."),("Chain rule","The derivative rule for a composite function.")),
            "A factored derivative earns credit when it is equivalent. Expand only if the question asks or it helps with a later step.",12),
        Lesson("d1-quotient-rule","Quotient rule and restrictions","Differentiate ratios, retain excluded inputs and evaluate exact gradients.",variants(quotient),rows(
            ("numerator-order","Which product comes first?","Write denominator times derivative of numerator, then subtract numerator times derivative of denominator.",
             f"For {m(r'y=\frac uv')}, use {m(r'\frac{vu^\prime-uv^\prime}{v^2}')}.",
             "Reversing the order changes the sign."),
            ("domain","Where is a quotient defined?","A quotient is defined only where its denominator is non-zero.",
             "Identify excluded values before simplifying any common factors. A sum of a positive constant and a square never vanishes.",
             "Simplifying algebra does not enlarge the domain of the original function."),
            ("powers-in-a-ratio","How can a bracketed numerator stay readable?","The chain rule can give the numerator derivative without first expanding a power.",
             "Keep the original numerator and denominator beside their derivatives. Substitute into the quotient rule and square the entire denominator.",
             "Squaring only one term of the denominator changes the result.")),
            (("Quotient","The result of dividing the numerator by the denominator."),("Excluded input","A value outside the domain of the given expression."),("Squared denominator","The product of the entire denominator with itself.")),
            "Use a complete bracket before squaring a multi-term denominator.",14),
        Lesson("d1-tangents-normals","Tangents and normals","Find a point and a gradient, then write the tangent and the perpendicular normal.",variants(tangent),rows(
            ("tangent","What fixes a tangent line?",f"The curve gives the point and {m(DY)} gives the tangent's gradient at that point.",
             f"Find {m('(x_0,y_0)')} from the original equation. Put the derivative into {m('y-y_0=m(x-x_0)')}.",
             "The value of y is not the gradient."),
            ("normal","How is the normal gradient calculated?","For a non-zero finite tangent gradient m, the perpendicular normal gradient is its negative reciprocal.",
             "Find the tangent gradient first. Reverse numerator and denominator and change the sign for the normal.",
             "Changing only the sign gives the wrong normal unless the gradient has magnitude one."),
            ("vertical-normal","What if the tangent is horizontal?","A horizontal tangent has gradient zero. Its perpendicular normal is vertical.",
             f"Use {m('y=y_0')} for the tangent and {m('x=x_0')} for the normal. Keep the coordinates in the right order.",
             "A vertical line is not a line of zero gradient.")),
            (("Point of contact","The point where the tangent matches the curve's direction."),("Normal","The line perpendicular to the tangent through the point of contact."),("Negative reciprocal","For a non-zero m, the value -1/m.")),
            "Give a line equation rather than just the gradient, and use x = constant if the normal is vertical.",17,normal_diagram),
        Lesson("d1-increments","Small increments and approximations","Use the tangent line for a nearby value and keep the sign of a small change.",variants(increment),rows(
            ("small-change","How does change in x give change in y?",f"At the original input, use {m(r'\delta y\simeq\frac{\mathrm dy}{\mathrm dx}\delta x')} for a sufficiently small change.",
             "Find the signed new-minus-old input, evaluate the gradient at the original input and multiply.",
             "The derivative estimates a rate of change. The increment still needs to multiply that rate."),
            ("new-value","When do you add the change?","A small change tells you the difference. An estimate of the new y-value requires adding that change to the old value.",
             "Compute the exact original y. Add the estimated change, including its sign.",
             "If x decreases, its increment is negative."),
            ("rounded-result","How can you check a reciprocal estimate?","The sign of the derivative and the input increment predicts the sign of the output change.",
             "Keep values exact or at full calculator precision until the final requested rounding. Check that the estimated result is near the original value.",
             "The local linear estimate should not be treated as an exact substitution into the nonlinear function.")),
            (("Increment","A signed change in a variable."),("Linear approximation","Using a tangent to estimate a nearby function value."),("Original input","The x-value where the derivative is evaluated for the estimate.")),
            "Use the approximation symbol and write the sign of the input change in your working.",14,linearisation),
        Lesson("d1-connected-rates","Connected rates of change","Use a geometric formula to link a changing radius to area or volume per second.",variants(rates),rows(
            ("link-rates","Which variable links the two rates?",f"If an area depends on radius and radius depends on time, use {m(r'\frac{\mathrm dA}{\mathrm dt}=\frac{\mathrm dA}{\mathrm dr}\frac{\mathrm dr}{\mathrm dt}')}.",
             "Differentiate the geometric formula in radius and multiply by the given time derivative.",
             "A derivative with respect to radius does not yet measure change per second."),
            ("volume","Why must both rates use the same instant?","Evaluate the geometric derivative at the radius stated for the given rate.",
             "For a sphere, differentiate the volume formula, then substitute the instantaneous radius and the signed radial speed.",
             "Do not substitute the radius before differentiating. It varies with time."),
            ("changing-dimensions","What if two dimensions change together?","Use the fixed relationship between height and radius to make the formula depend on one variable before differentiating.",
             "Substitute the height ratio into the volume, differentiate and interpret the sign with units.",
             "Keeping the height constant would give a different derivative for a cylinder whose height changes.")),
            (("Instantaneous rate","The rate at one instant."),("Linked rates","Derivatives connected by the chain rule."),("Sign convention","Decide which change is positive before interpreting a negative rate.")),
            "Include area per second or volume per second, and use negative for a decrease.",12),
        Lesson("d1-second-derivatives","Second derivatives","Differentiate the gradient function and evaluate the second derivative at a specified input.",variants(second),rows(
            ("differentiate-twice","What does the second derivative measure?",f"{m(D2)} measures how the tangent gradient changes as x changes.",
             "Find the first derivative from y and differentiate that new expression.",
             "A second derivative is not the first derivative squared."),
            ("second-at-point","When should you substitute the coordinate?","Keep x as a variable while finding both derivatives.",
             "Work from the original function to its first and second derivatives. Substitute only into the required expression.",
             "A numerical gradient at one point cannot be differentiated as a function to recover the second derivative."),
            ("negative-powers","What happens to a negative power when it is differentiated twice?","Each derivative reduces the current exponent by one.",
             "Rewrite the reciprocal in power form and apply the rule twice, attending to the two signs.",
             "Multiplying by a negative exponent can reverse a sign. Check each derivative separately.")),
            (("Second derivative","The derivative of the gradient function."),("Curvature sign","The sign of the second derivative, used in the local turning test."),("Order","The number of times differentiation has been applied.")),
            "Write f′ and f″ on different lines so the selected derivative is clear.",8),
        Lesson("d1-stationary-points","Stationary points and classification","Find every stationary point and justify each maximum or minimum with a derivative test.",variants(stationary),rows(
            ("zero-gradient","Why set the gradient equal to zero?","At a stationary point the tangent is horizontal.",
             "Solve the derivative equation for all real inputs, then use the original equation for the corresponding outputs.",
             "The derivative equation is zero. The curve itself need not cross the x-axis."),
            ("sign-test","Which sign change gives a maximum?","A change from positive to negative gradient gives a local maximum. The opposite change gives a local minimum.",
             "Test the derivative on either side of the stationary input when using the first derivative test.",
             "A negative gradient at a single point does not make that point a minimum."),
            ("second-test","When is the second derivative test conclusive?",f"At a stationary point, a positive {m(D2)} gives a local minimum and a negative {m(D2)} gives a local maximum.",
             "Evaluate the second derivative at each stationary input. If it vanishes, use a valid alternative rather than guessing.",
             "The sign of the second derivative away from a stationary point does not classify a stationary point.")),
            (("Stationary point","A point whose tangent gradient is zero."),("Local maximum","A point at least as high as neighbouring points on the curve."),("Local minimum","A point at least as low as neighbouring points on the curve.")),
            "Give coordinates and justify the nature of every point. Points of inflexion are outside the 0606 requirements.",14,extrema,
            table(("Left gradient","Right gradient","Nature"),(("Positive","Negative","Maximum"),("Negative","Positive","Minimum")),"First derivative sign test")),
        Lesson("d1-optimisation","Practical maxima and minima","Construct a one-variable model, restrict feasible dimensions and justify the optimal result.",variants(optimisation),rows(
            ("fencing","How does a constraint remove a variable?","A fixed length or fixed surface area relates the dimensions. Use that relation to leave one independent variable.",
             "Express the other dimension in x, substitute into the target quantity and state the domain.",
             "The longest possible side does not usually give the greatest area."),
            ("open-tray","Which root describes a feasible tray?","The corner cut must leave a positive base length, so the stationary roots must be checked against this restriction.",
             "Differentiate the volume, factor the result and discard roots at or beyond the physical boundary.",
             "An algebraic root with zero base area does not describe the intended container."),
            ("justify-maximum","What makes a stationary value the greatest in the model?","A derivative test gives local behaviour. Use the physical interval and its boundaries to justify a global answer.",
             "Check all admissible candidates. Use the sign change or the second derivative and compare with boundary behaviour.",
             "The best input and the greatest value of the quantity are different answers.")),
            (("Constraint","A fixed relationship between model variables."),("Feasible domain","Inputs that meet the physical restrictions."),("Optimisation","Finding the largest or smallest attainable value.")),
            "Finish with the requested quantity and units after justifying the maximum or minimum.",15,opt),
    ]
    build(f,"Calculus: Differentiation 1",11,lessons,__file__)


if __name__=="__main__":
    main()
