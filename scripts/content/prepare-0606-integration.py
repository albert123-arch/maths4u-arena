"""Author the Cambridge 0606 Integration lesson and question package."""

import sympy as s

from addmaths_calculus import C, DY, Q, X, Lesson, Scenario, answer, build, choices, eq, explain, field, m, math, pair, plot, rng, round3, table, tex


def same(f,g):
    delta=f-g
    if delta.has(s.sin,s.cos,s.tan,s.sec):
        delta=s.trigsimp(delta,method="fu")
    return s.simplify(delta)==0


def anti(f, F, seed, rule, display=None):
    assert same(s.diff(F,X),f), (f,F)
    target=display or math(F+C)
    grading=choices(target,[math(F),math(F+X+C),math(F-X+C)],seed)
    return answer("Find the indefinite integral. Give the full family of antiderivatives.",None,
        rule,f"Differentiating the variable part gives back {math(f)}. Every constant has derivative zero.",
        method="Apply the relevant reverse derivative rule and include an arbitrary constant.",
        displayed=target,grader=grading)


def bounds_tex(f,left,right):
    return m(fr"\int_{{{tex(left)}}}^{{{tex(right)}}}{tex(f)}\,\mathrm dx")


def integral_part(f,F,left,right,grade=True):
    value=s.simplify(F.subs(X,right)-F.subs(X,left))
    assert same(s.diff(F,X),f)
    return answer(f"Evaluate {bounds_tex(f,left,right)} exactly.",value,
        f"The variable part of an antiderivative is {math(F)}.",
        f"Subtract its value at {math(left)} from its value at {math(right)}.",
        method="Substitute upper and lower bounds into the same antiderivative and subtract in order.",
        grader=field("integral","Exact definite integral",value) if grade else None)


def rounded_part(value, ask):
    desired=round3(value)
    magnitude=abs(float(value))
    # For rounded entries, accept the displayed three-significant-figure result and
    # retain nearby precision from a calculator. Keep full precision in the model.
    threshold=max(0.0000005,abs(float(desired)-float(value))+0.0000001)
    assert magnitude>0 and threshold<=1
    f=field("rounded","Value to 3 significant figures",desired,"approximate")
    f["absolute_tolerance"]=threshold
    return answer(ask,value,"Use the exact expression or full calculator precision until the final step.",
        method="Evaluate the exact expression and round once at the end.",displayed=m(desired),grader=f)


def reverse(seed,style):
    r=rng(seed)
    a,b,c,d=r.randrange(1,10),r.randrange(-8,9),r.randrange(-9,10),r.randrange(1,12)
    if style==0:
        n=r.choice((2,3,4))
        f=n*a*X**(n-1)+b
        F=a*X**n+b*X
        x=r.randrange(-3,4)
        restriction=""
    elif style==1:
        f=a/(2*s.sqrt(X))+b
        F=a*s.sqrt(X)+b*X
        x=r.choice((1,4,9,16))
        restriction=f" Use {m('x>0')}."
    else:
        f=-a/X**2+b
        F=a/X+b*X
        x=r.randrange(1,8)
        restriction=f" Use {m('x>0')}."
    old=F.subs(X,x)+c
    new=x+d
    if style==1:
        new=(s.sqrt(x)+d%3+1)**2
    value=s.simplify(F.subs(X,new)+c)
    assert same(s.diff(F,X),f) and (F+c).subs(X,x)==old
    cpart=answer(f"Find the constant of integration for the curve through {m(pair(x,old))}.",c,
                 f"Write the curve as {eq('y',F+C)}. Substituting the coordinates gives {m(tex(old)+'='+tex(F.subs(X,x))+'+C')}.",
                 method="Use the given point in the general equation of the curve.",
                 grader=field("constant","Constant of integration",c))
    ypart=answer(f"The curve passes through {m(pair(x,old))}. Find its y-coordinate when {eq('x',new)}.",value,
                 f"Substitute into the particular curve {eq('y',F+c)}.",
                 method="Use the curve with its known constant.",grader=field("ordinate","Value of y",value))
    topic="Recover a particular curve from its gradient"
    return Scenario(topic,f"A curve has gradient function {eq(DY,f)}.{restriction}",
        (anti(f,F,seed,"Find a function whose derivative is the stated gradient. Add the unknown constant."),cpart,ypart),
        "An antiderivative gives a family. Use the point only after writing the family.", "Substitute the given coordinates after integrating. They determine C.")


def power(seed,style):
    r=rng(seed)
    a,b,c=r.randrange(1,14),r.randrange(1,12),r.randrange(-9,10)
    if style==0:
        n=r.choice((2,3,4))
        f=a*X**n-b*X+c
        F=Q(a,n+1)*X**(n+1)-Q(b,2)*X**2+c*X
        x=r.randrange(-3,4)
        restriction=""
    elif style==1:
        f=a*s.sqrt(X)+b/X**2+c
        F=Q(2*a,3)*X**Q(3,2)-b/X+c*X
        x=r.choice((1,4,9,16))
        restriction=f" Work on {m('x>0')}."
    else:
        f=(a*X+b)**2/X**2
        F=a*a*X+2*a*b*s.log(X)-b*b/X
        x=1
        restriction=f" Work on {m('x>0')}."
    reference=F.subs(X,x)
    assert same(s.diff(F,X),f)
    rpart=answer(f"For a particular antiderivative, the value at {m('x='+tex(x))} is {math(reference+c)}. Find the constant in the form shown by your antiderivative.",
          None,
          f"Use the particular form {m('F(x)='+tex(F)+'+C')}. Its non-constant part has value {math(reference)} at this input.",
          method="Use the required input and output to solve for C in the displayed form.",
          displayed=eq("C",c),grader=field("constant","Value of C",c))
    rule="Integrate each power after simplifying."
    if style==2:
        rule=f"Expand and divide each term by {m('x^2')} to write the integrand as {math(s.expand(f))}. The {math(1/X)} term integrates to a logarithm on the positive domain."
    return Scenario("Integrate powers and use a point to fix the constant",f"The integrand is {math(f)}.{restriction}",
        (anti(f,F,seed,rule),rpart),"Add one to each exponent, divide by the new exponent and handle an exponent of −1 separately.",
        "The integral of a constant is a linear term. The arbitrary constant is in addition to that term.")


def linear_power(seed,style):
    r=rng(seed)
    a,b,c=r.randrange(2,9),r.randrange(-9,10),r.randrange(1,13)
    if style==0:
        n=r.choice((2,3,4))
        low,high=r.randrange(1,6),r.randrange(7,13)
    elif style==1:
        n=r.choice((Q(1,2),Q(3,2),Q(-1,2)))
        low,high=r.choice((1,4,9)),r.choice((16,25,36))
    else:
        n=r.choice((-2,-3,-4))
        low,high=r.randrange(1,6),r.randrange(7,13)
    u=a*X+b
    f=c*u**n
    F=c*u**(n+1)/(a*(n+1))
    left,right=Q(low-b,a),Q(high-b,a)
    assert u.subs(X,left)==low and u.subs(X,right)==high
    return Scenario("Integrate a power of a linear expression",f"The integrand is {math(f)} on the interval where {m(tex(u)+'>0')}.",
        (anti(f,F,seed,f"Raise the bracket power by one and divide by that new power and by the inner coefficient {math(a)}."),
         integral_part(f,F,left,right)),
        "Check which constant appears when differentiating the bracket.",
        "The integrated power needs the reciprocal of the inner derivative as well as division by the new exponent.")


def exponential(seed,style):
    r=rng(seed)
    a,b,c=r.randrange(2,11),r.randrange(-12,13),r.randrange(1,13)
    a=-a if style==1 else a
    u=a*X+b
    damping=(r.randrange(1,8)*X if style==2 else 0)
    f=c*s.exp(u)+damping
    F=c*s.exp(u)/a+s.integrate(damping,X)
    first,second=Q(-b,a),Q(r.choice((1,2,3))-b,a)
    left,right=sorted((first,second))
    result=s.simplify(F.subs(X,right)-F.subs(X,left))
    # Avoid overly large three-significant-figure cells: assess the exact expression
    # by selection when the calculator result is large.
    close_for_check=abs(float(result))<990
    if close_for_check:
        extension=rounded_part(result,f"Evaluate {bounds_tex(f,left,right)} to 3 significant figures.")
    else:
        extension=answer("State the value if the order of the two limits is reversed.",-result,
            "Reversing the limits reverses the sign of the definite integral.",
            method="Use the definite integral with its signed bounds.")
    return Scenario("Integrate an exponential expression and evaluate its net change",f"Take the integrand {math(f)}.",
        (anti(f,F,seed,f"Keep the exponential and divide by the coefficient {math(a)} of x in its exponent."),
         integral_part(f,F,left,right,grade=False),extension),
        "Differentiate your proposed antiderivative to check the multiplier.",
        "Integration divides by the derivative of the linear exponent rather than multiplying by it.")


def trig(seed,style):
    r=rng(seed)
    k,c,d=r.randrange(2,9),r.randrange(1,12),r.randrange(-6,7)
    offset=s.pi*r.choice((Q(-1,3),Q(-1,7),Q(1,6),Q(1,5),Q(1,3)))
    u=k*X+offset
    if style==0:
        f=c*s.sin(u)+d
        F=-c*s.cos(u)/k+d*X
        rule="The antiderivative of sine is negative cosine. Then divide by the inner derivative."
        b=s.pi*r.choice((Q(1,3),Q(1,2),Q(3,4)))
    elif style==1:
        f=c*s.cos(u)+d
        F=c*s.sin(u)/k+d*X
        rule="Cosine integrates to sine. Divide the sine coefficient by the inner derivative."
        b=s.pi*r.choice((Q(1,6),Q(1,3),Q(1,2)))
    else:
        f=c*s.sec(u)**2+d
        F=c*s.tan(u)/k+d*X
        rule="The derivative of tangent is secant squared. Divide by the factor from the bracket."
        b=s.pi*r.choice((Q(1,6),Q(1,4),Q(1,3)))
    left,right=-offset/k,(b-offset)/k
    assert 0<b and (style!=2 or b<s.pi/2)
    return Scenario("Integrate a trigonometric function in radians",f"The integrand is {math(f)}. Angles are in radians.",
        (anti(f,F,seed,rule),integral_part(f,F,left,right)),
        "Use standard sine, cosine or secant-squared antiderivatives and divide by the inner slope.",
        "A derivative check catches the sign of the cosine antiderivative and the chain factor.")


def reciprocal(seed,style):
    r=rng(seed)
    a,b,c,d=r.randrange(2,10),r.randrange(-9,10),r.randrange(1,12),r.randrange(-6,7)
    if style==0:
        u=X
        low,high=r.randrange(2,10),r.randrange(11,20)
        b=0
        a=1
        d=0
    elif style==1:
        u=a*X+b
        low,high=r.randrange(2,10),r.randrange(11,20)
        d=0
    else:
        u=a*X+b
        low,high=-r.randrange(10,19),-r.randrange(2,9)
    left,right=Q(low-b,a),Q(high-b,a)
    f=c/u+d
    log_sign=1 if low>0 else -1
    F=Q(c,a)*s.log(log_sign*u)+d*X
    multiplier=tex(Q(c,a)) if c!=a else ""
    display=m(multiplier+r"\ln\left|"+tex(u)+r"\right|"+("+"+tex(d*X) if d>0 else tex(d*X) if d<0 else "")+"+C")
    restriction=f" Work on {m(tex(u)+('>0' if low>0 else '<0'))}."
    I=s.simplify(F.subs(X,right)-F.subs(X,left))
    options=choices(math(I),[math(-I),math(I+1),math(I-2)],seed+3)
    assert I != 0
    eval=integral_part(f,F,left,right,grade=False)
    eval.field=options
    return Scenario("Integrate a reciprocal and stay on one side of its pole",f"The integrand is {math(f)}.{restriction}",
        (anti(f,F,seed,"The integral power rule excludes exponent −1. Use a logarithm and keep the reciprocal of the linear gradient.",display=display),eval),
        "Confirm the denominator never reaches zero between the limits.",
        "The ordinary integration power rule fails when the new exponent would be zero. A logarithm handles that case.")


def mixed(seed,style):
    r=rng(seed)
    a,b,c=r.randrange(2,11),r.randrange(1,12),r.randrange(-7,8)
    n=r.choice((2,3,4))
    if style==0:
        f=b*s.exp(a*X+c)+X**n
        F=Q(b,a)*s.exp(a*X+c)+X**(n+1)/(n+1)
        left,right=Q(-c,a),Q(2-c,a)
    elif style==1:
        f=b*s.sin(a*X)+c*X
        F=-Q(b,a)*s.cos(a*X)+Q(c,2)*X**2
        left,right=s.Integer(0),s.pi/(3*a)
    else:
        f=b*(a*X+b)**n+c*X
        F=Q(b,a*(n+1))*(a*X+b)**(n+1)+Q(c,2)*X**2
        left,right=s.Integer(0),r.randrange(1,5)
    evaluate=integral_part(f,F,left,right,grade=style!=0)
    return Scenario("Select the correct antiderivative for each term",f"Integrate the expression {math(f)}. Any angles are in radians.",
        (anti(f,F,seed,"Integrate the terms separately, keeping each numerical coefficient with its term."),evaluate),
        "Choose the derivative in reverse for each term. Check your full expression by differentiation.",
        "Keep one final arbitrary constant after summing the antiderivatives.")


def definite(seed,style):
    r=rng(seed)
    a,b,c=r.randrange(1,11),r.randrange(-9,10),r.randrange(-11,12)
    if style==0:
        f=a*X**3+b*X+c
        F=Q(a,4)*X**4+Q(b,2)*X**2+c*X
        left,right=r.randrange(-4,0),r.randrange(1,7)
    elif style==1:
        f=a*X**2+b*X-c
        F=Q(a,3)*X**3+Q(b,2)*X**2-c*X
        left,right=r.randrange(1,7),r.randrange(-4,1)
    else:
        f=a/(X**2)+b*X+c
        F=-a/X+Q(b,2)*X**2+c*X
        left,right=r.randrange(1,5),r.randrange(5,9)
    value=s.simplify(F.subs(X,right)-F.subs(X,left))
    reversal=answer(f"Evaluate {bounds_tex(f,right,left)}, with the limits in the opposite order.",-value,
        "The same two endpoint values are subtracted in the opposite order.",
        method="Apply the sign change from reversing limits.",grader=field("reversal","Integral with reversed limits",-value))
    return Scenario("Use signed limits in a definite integral",f"The integrand is {math(f)} on the interval whose endpoints are {math(left)} and {math(right)}.",
        (integral_part(f,F,left,right),reversal),"Evaluate the antiderivative at both endpoints, even when the lower endpoint is zero.",
        "Do not take the absolute value of a definite integral unless the question asks for a geometric area.")


def known_derivative(seed,style):
    r=rng(seed)
    a,b,c=r.randrange(2,11),r.randrange(1,9),r.randrange(1,10)
    u=1+a*X**2+b*X
    left,right=s.Integer(0),s.Integer(r.randrange(1,5))
    if style==0:
        F=c*u**3
        f=3*c*(2*a*X+b)*u**2
        reason=f"The bracket derivative is {math(2*a*X+b)}, so the factor before the bracket in the integrand allows the chain rule in reverse."
    elif style==1:
        F=c*s.sqrt(u)
        f=c*(2*a*X+b)/(2*s.sqrt(u))
        reason="Differentiating the square root supplies the denominator and differentiating the argument supplies the numerator."
    else:
        F=c*(a*X+b)**3
        f=3*c*a*(a*X+b)**2
        reason=f"Differentiating the proposed power also multiplies its result by the inner derivative {math(a)}."
    assert same(s.diff(F,X),f)
    dpart=explain(f"Show that the derivative of {math(F)} equals the integrand.",math(f),
       reason,eq(DY,f),marks=(("M1","Apply the outer rule and multiply by the inner derivative."),("A1",f"Obtain {math(f)}.")))
    primitive=answer("Find the full indefinite integral of the given integrand.",None,
         f"Differentiate {math(F)} to obtain {math(f)}. All antiderivatives differ by a constant.",
         method="Reverse the stated derivative.",displayed=math(F+C),
         grader=choices(math(F+C),[math(F),math(F+X+C),math(f+C)],seed))
    return Scenario("Use a derivative to recognise an antiderivative",f"The integrand is {math(f)} on {m(r'x\ge0')}.",
         (dpart,primitive,integral_part(f,F,left,right)),"Differentiate the proposed function before using it in the definite integral.",
         "The result of an indefinite integral is not a unique curve unless a condition determines the constant.")


def area(seed,style):
    r=rng(seed)
    a=r.randrange(1,12)*(-1 if style==1 else 1)
    u=r.randrange(-7,2)
    v=u+r.randrange(2,8)
    if style==0:
        f=a*(X-u)*(v-X)
        cuts=[u,v]
    elif style==1:
        f=a*(X-u)*(v-X)
        cuts=[u,v]
    else:
        f=a*(X-u)*(v-X)
        cuts=[u-r.randrange(1,4),u,v]
    F=s.integrate(f,X)
    intervals=list(zip(cuts,cuts[1:]))
    signs=[s.sign(f.subs(X,Q(x+y,2))) for x,y in intervals]
    totals=[s.simplify(F.subs(X,y)-F.subs(X,x)) for x,y in intervals]
    result=sum(abs(t) for t in totals)
    points=s.solve(f,X)
    assert points==[u,v] and all(t!=0 for t in totals) and result>0
    assert same(s.diff(F,X),f) and all(s.sign(t)==sign for t,sign in zip(totals,signs))
    roots=answer("Find the x-values where the curve meets the x-axis.",None,
       f"Set {math(f)} equal to zero and use the two linear factors.",
       method="Solve both factors of the equation for the x-intercepts.",
       displayed=m(tex(u)+", "+tex(v)),
       grader=field("roots","Both x-intercepts as x-values",f"{{{u},{v}}}","set",("x",)))
    areapart=answer(f"Calculate the total area between the curve and the x-axis for {m(str(cuts[0])+r'\le x\le '+str(cuts[-1]))}.",result,
       f"Use {math(F)} to evaluate the signed integral separately on each of the following bounds.",
       *[f"From {math(x)} to {math(y)}, the signed integral is {math(t)} and the area is {math(abs(t))}." for (x,y),t in zip(intervals,totals)],
       "Add the positive region areas.",method="Split where the sign changes and add the unsigned areas.",
       grader=field("area","Total area",result))
    return Scenario("Separate geometric area from a signed integral",f"A curve has equation {eq('y',f)}.",
        (roots,areapart),"Find crossings first and inspect the sign on every subinterval.",
        "A region below the axis gives a negative signed integral, but its geometric area is positive.")


def curves(seed,style):
    r=rng(seed)
    a,b,c=r.randrange(1,13),r.randrange(-6,7),r.randrange(-9,10)
    u=r.randrange(-6,1)
    v=u+r.randrange(2,7)
    f=b*X+c
    if style==0:
        diff=a*(X-u)*(v-X)
        cuts=[u,v]
    elif style==1:
        f=X**2+b*X+c
        diff=-a*(X-u)*(v-X)
        cuts=[u,v]
    else:
        w=v+r.randrange(2,6)
        diff=a*(X-u)*(X-v)*(X-w)
        cuts=[u,v,w]
    g=s.expand(f+diff)
    assert same(g-f,diff)
    assert s.solve(g-f,X)==cuts
    F=s.integrate(diff,X)
    assert same(s.diff(F,X),diff)
    contributions=[s.simplify(F.subs(X,y)-F.subs(X,x)) for x,y in zip(cuts,cuts[1:])]
    result=sum(abs(c) for c in contributions)
    start,end=cuts[0],cuts[-1]
    common=answer("Find the x-coordinates of all intersections.",None,
         f"Equate the two equations and solve {eq(tex(s.factor(diff)),0)}.",
         method="Set the difference of the two curves equal to zero and solve all factors.",
         displayed=m(", ".join(map(str,cuts))),
         grader=field("intersections","All intersection x-coordinates","{"+",".join(map(str,cuts))+"}","set",("x",)))
    what="a line and a curve" if style in (0,2) else "two curves"
    apart=answer(f"Find the total area enclosed by the graphs between {m('x='+str(start))} and {m('x='+str(end))}.",result,
         "Choose the upper curve separately on each interval between intersections.",
         *[f"From {math(x)} to {math(y)}, the signed integral of the second curve minus the first is {math(z)}, so the area is {math(abs(z))}." for x,y,z in zip(cuts,cuts[1:],contributions)],
         method="Integrate upper minus lower on each interval and add the positive areas.",
         grader=field("area","Total area between both graphs",result))
    return Scenario(f"Find the region enclosed by {what}",f"The two graphs have equations {eq('y',f)} and {eq('y',g)}.",
        (common,apart),"Solve the intersection equation and identify the upper graph on every interval.",
        "Always subtract the lower curve from the upper curve for geometric area. The upper curve can change at an intersection.")


def variants(model):
    return tuple(lambda seed,style=style:model(seed,style) for style in range(3))


def main():
    key="integration"
    signed=plot(key,"signed-parts","A curve crosses the axis between the vertical limits. The two geometric regions have positive areas.",
       ((lambda x:x*(2-x),"#12547d"),),(-1,2.55),(-3.1,1.6),
       ((0,0,"Crossing",4,18),(2,0,"Crossing",-22,24)),
       (lambda x:x*(2-x),lambda x:0,-1,2))
    between=plot(key,"upper-minus-lower","The area is obtained from vertical differences between the upper curve and the lower line.",
       ((lambda x:x,"#b85f14"),(lambda x:4*x-x*x,"#12547d")),(-.22,3.75),(-1,4.8),
       ((0,0,"(0, 0)",-9,20),(3,3,"(3, 3)",10,5)),
       (lambda x:4*x-x*x,lambda x:x,0,3))
    definit=plot(key,"definite-bounds","The vertical boundaries at x = 1 and x = 2 enclose part of the area below y = x².",
       ((lambda x:x*x,"#12547d"),),(0,2.5),(-.5,5),
       ((1,0,"1",-6,21),(2,0,"2",-6,21)),(lambda x:x*x,lambda x:0,1,2))
    terms=(
        ("Antiderivative","A function whose derivative is the given integrand."),
        ("Integrand","The function inside the integral sign."),
        ("Limit of integration","An endpoint of the interval used for a definite integral."))
    lessons=[
        Lesson("int-reverse","Reverse differentiation and recover a curve","Find a family of curves from a gradient function and select the one that passes through a stated point.",variants(reverse),(
            ("inverse-process","What is being reversed?","Integration reverses differentiation by finding functions with the specified derivative.",
             "Check the antiderivative by differentiating back to the integrand.","A derivative alone does not determine the constant value."),
            ("arbitrary-constant","Why is there an arbitrary constant?","Adding any constant makes a vertical translation whose derivative is unchanged.",
             "Write the general antiderivative with the arbitrary constant before substituting a condition.","Omitting the constant loses all but one of the possible curves."),
            ("particular-curve","How does a point select one curve?","A point gives an input and output for the antiderivative.",
             "Substitute both coordinates, solve for the constant and then evaluate the particular function.","The gradient at a point is different from the point's y-coordinate.")),terms,
             "Differentiate your answer to check every variable term. Include the constant for an indefinite integral.",12),
        Lesson("int-indefinite","Indefinite integrals of powers","Integrate sums of powers, simplifiable quotients and rational powers with the correct restrictions.",variants(power),(
            ("raise-power","What happens to an exponent when integrating?",f"For {m(r'n\ne-1')}, add one to the exponent n and then divide by the new exponent.",
             "Integrate term by term. Add a single arbitrary constant at the end.","Dividing by the old exponent does not reverse the power rule."),
            ("fractional-powers","How do you integrate roots and negative powers?","Rewrite a root or reciprocal as a rational power. Keep the original domain.",
             "Increase the exponent by one, then divide by that new value, provided it is non-zero.","For a reciprocal squared, the new exponent is negative one rather than zero."),
            ("simplify-first","When is it helpful to divide a quotient term by term?","Expanding a short square and dividing each term by the denominator can reveal standard integrands.",
             "Simplify the integrand. Integrate a reciprocal x term as a natural logarithm on the appropriate domain.","Do not integrate the numerator and denominator separately.")),terms,
             "The power rule has an exception at exponent −1. Check the simplified integrand before using it.",10),
        Lesson("int-linear-power","Powers of a linear expression","Integrate positive, negative and fractional powers of a linear bracket using the reverse chain factor.",variants(linear_power),(
            ("linear-factor","Why divide by the inner slope?","Differentiating a power of a linear bracket multiplies by the derivative of the bracket.",
             "Use the ordinary integration power rule on the bracket and divide by the inner slope.","The inner slope is a constant, but it still affects the factor."),
            ("roots","How do you handle a fractional bracket power?","The new power can still be fractional. Work on the interval where the expression is real.",
             "Leave the bracket intact. Use exact values for convenient bracket inputs.","Do not take a root of a negative argument in a real-valued question."),
            ("negative-powers","How does a negative bracket power integrate?","Add one to the exponent and check the result is non-zero.",
             "Choose an antiderivative on the stated domain and check by differentiating.","If the old exponent is −1, use a logarithm rather than dividing by zero.")),terms,
             "State a domain whenever a root, negative power or logarithm requires one.",13),
        Lesson("int-exponential","Integration of exponential functions","Reverse the exponential derivative and evaluate exact exponential bounds.",variants(exponential),(
            ("keep-exponential","What stays when an exponential integrates?","An exponential with a linear exponent stays exponential.",
             "Keep the exponent unchanged and divide by its x-coefficient.","Changing the exponent itself gives a different derivative."),
            ("negative-exponent","What if the exponent's slope is negative?","Dividing by the negative inner slope creates a negative coefficient.",
             "Evaluate both endpoints using the same correctly signed antiderivative.","The integral of a positive function over forward limits is positive."),
            ("exponential-sums","How do you integrate an exponential with other terms?","Use the appropriate antiderivative term by term.",
             "Keep exact exponentials until a decimal answer is requested. Include the arbitrary constant for an indefinite integral.","Round once at the end rather than rounding each exponential separately.")),terms,
             "Differentiate to verify the final sign and coefficient of an exponential.",11),
        Lesson("int-trigonometric","Integrals of sine, cosine and secant squared","Use radian antiderivatives, exact special-angle values and the reverse chain factor.",variants(trig),(
            ("sine-minus-cosine","Which antiderivative gives sine?",f"The derivative of {m(r'-\cos x')} is {m(r'\sin x')}.",
             "Use negative cosine, then divide by the inner slope for a linear angle.","Cosine without the negative sign differentiates to negative sine."),
            ("cosine-to-sine","Which antiderivative gives cosine?","Sine differentiates to cosine in radian measure.",
             "Use the same angle inside sine and divide by the inner derivative. Combine with the integral of any constant term.","A constant term integrates to a multiple of x."),
            ("secant-squared","How does tangent appear when integrating?","Tangent differentiates to secant squared when the angle is measured in radians.",
             "Use a tangent antiderivative and choose bounds on one continuous branch.","An interval crossing a point where cosine is zero cannot be evaluated with the ordinary finite-bound formula.")),terms,
             "Use radians throughout and retain exact special-angle values where the question asks for an exact result.",12,
             data_table=table(("Integrand","Antiderivative plus C"),
                ((m(r'\sin x'),m(r'-\cos x+C')),(m(r'\cos x'),m(r'\sin x+C')),(m(r'\sec^2x'),m(r'\tan x+C'))),"Radian antiderivatives")),
        Lesson("int-logarithmic","Reciprocal integrals and natural logarithms","Recognise the power-rule exception and choose a logarithmic form on a valid interval.",variants(reciprocal),(
            ("exception","Why does one over x need a different rule?",f"For {m('x>0')}, differentiating {m(r'\ln x')} gives {m(r'\frac1x')}.",
             "Use a natural logarithm instead of the integration power rule at exponent −1.","Adding one to −1 would give a zero denominator in the power rule."),
            ("linear-denominator","What factor goes before the logarithm?","The derivative of the denominator is part of the chain rule for a logarithm.",
             "For a linear denominator, divide by its x-coefficient and place its absolute value inside the logarithm.","A logarithmic antiderivative of a reciprocal has a factor from the denominator."),
            ("single-branch","Why must both limits stay on the same side of a pole?","A reciprocal is not continuous where its denominator is zero.",
             "Check that the full interval lies in one continuous branch. Use the log form on that branch.","Two finite endpoint logarithms alone cannot justify an integral across a pole.")),terms,
             "Use absolute value for a general reciprocal antiderivative and state restrictions for any chosen interval.",12),
        Lesson("int-mixed","Further indefinite integration","Select antiderivative rules across mixed sums and verify the complete expression.",variants(mixed),(
            ("separate-terms","How do you organise a sum of different function types?","The integral of a sum is the sum of its integrals.",
             "Identify an exponential, power or trigonometric rule for each term before simplifying.","One power rule does not serve a sum containing different function types."),
            ("keep-the-constant","How many arbitrary constants are needed?","All separate additive constants combine into a single constant.",
             "Write all variable terms first, then add one C and check by differentiating.","A missing constant is incomplete for an indefinite integral."),
            ("chain-factors","When do bracketed terms need an extra factor?","A linear argument contributes its derivative on differentiation. Reverse this factor when integrating.",
             "Keep the bracket intact unless expanding makes the integral simpler.","Expanding a term and applying its chain factor as well counts the factor twice.")),terms,
             "Check all terms by differentiation, including any term that should disappear into the constant.",12),
        Lesson("int-definite","Definite integration and signed bounds","Calculate the upper antiderivative value minus the lower one and interpret a reversed interval.",variants(definite),(
            ("upper-minus-lower","Which endpoint is subtracted?","The definite integral over a continuous interval is the antiderivative at the upper limit minus its value at the lower limit.",
             "Write both substitutions explicitly before subtracting. An antiderivative's arbitrary constant cancels.","Do not ignore the lower substitution even if the lower bound is zero."),
            ("reversed-bounds","What happens when limits are reversed?","Exchanging the bounds changes the sign of the integral.",
             "Follow the displayed order. If you choose to rewrite the bounds, carry the negative sign.","The mathematically upper written limit can be numerically smaller than the lower written limit."),
            ("valid-interval","What if the function contains a reciprocal?","The ordinary evaluation uses an antiderivative on an interval where the integrand is continuous.",
             "Check the original integrand for excluded inputs before applying the endpoint formula.","A finite answer from substituting at both ends is insufficient if the interval crosses a pole.")),terms,
             "Write both endpoint evaluations before rounding or simplifying.",10,definit),
        Lesson("int-reverse-chain","Use a known derivative to evaluate an integral","Recognise a supplied antiderivative and apply it to an exact definite integral.",variants(known_derivative),(
            ("recognise-pattern","What evidence proves a proposed antiderivative?","Differentiating it must recover the integrand on the required interval.",
             "Apply the outer derivative and inner factor, then check that the result matches every term.","Matching only the bracket power does not check the whole antiderivative."),
            ("root-derivative","How can a root derivative give a related integral?","A root derivative produces both a square-root denominator and the derivative of its argument.",
             "Spot the full structure, including the numerator, or verify it by differentiating the proposed expression.","A root in the denominator alone is not enough to identify the integral."),
            ("evaluate-from-derivative","How do you use the recognised function at the endpoints?","Once verified, the proposed function can be used directly for the endpoint calculation.",
             "Find the indefinite integral up to a constant, then evaluate the particular definite integral with exact values.","The two sets of limits are still x-values after using a known derivative.")),terms,
             "If a question says ‘hence’, use the relationship established in the preceding part.",9),
        Lesson("int-area-axis","Signed integrals and areas under curves","Find crossings, distinguish signed integral from area and add regions on opposite sides of the axis.",variants(area),(
            ("above-axis","When does the definite integral equal an area?","On an interval where the curve is above or on the x-axis, its integral is the area beneath it.",
             "Find the appropriate endpoints and check the sign of the integrand in the interval.","A graph with an x-intercept can still lie entirely above the axis on the requested interval."),
            ("below-axis","Why can the definite integral be negative?","The integral counts a region below the axis with a negative sign. Its geometric area is positive.",
             "Negate the signed integral for a region that stays below the axis.","State the area as a positive value."),
            ("sum-of-regions","How do you add areas across an axis crossing?","A crossing divides the region into pieces with different signs.",
             "Integrate separately on each side of the crossing, then add the geometric areas.","Taking the absolute value after adding signed parts can cancel area.")),terms,
             "Sketch the crossings and label your split points before integrating.",14,signed),
        Lesson("int-between-curves","Areas between lines and curves","Find intersections, choose the upper curve on each interval and add exact areas.",variants(curves),(
            ("intersections","Which points provide the limits?","At an intersection the two graphs have equal y-values.",
             "Equate the expressions and solve every admissible root. Use the intersection x-values as limits.","Intercepts of one of the curves are not necessarily the intersections."),
            ("upper-lower","What is the height of a thin vertical strip?","The strip height is upper y minus lower y.",
             "Use an interior x-value to identify the upper function, then integrate the difference.","Which curve is upper depends on the interval."),
            ("multiple-regions","How do you add regions if the graphs cross more than twice?","Ordering can change at each intersection.",
             "Split at every relevant crossing and integrate upper minus lower on each interval before summing.","One signed integral over both regions can undercount the area.")),terms,
             "An area may cross the x-axis and still be found from upper minus lower. Use the difference of the two graph values.",20,between),
    ]
    build(key,"Calculus: Integration",14,lessons,__file__)


if __name__=="__main__":
    main()
