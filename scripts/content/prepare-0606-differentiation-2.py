"""Author the Cambridge 0606 Differentiation 2 lesson and question package."""

import math as numeric_math
import sympy as s

from addmaths_calculus import D2, DY, Q, X, Lesson, Scenario, answer, build, choices, eq, explain, field, m, math, pair, plot, rng, table, tex


def form(f, derivative, mistake, seed, steps, method):
    exact=s.diff(f,X)-derivative
    assert s.simplify(s.trigsimp(exact,method="fu"))==0, (f,derivative)
    if s.simplify(derivative-mistake)==0:
        mistake=derivative+1
    options=choices(eq(DY,derivative),[eq(DY,mistake),eq(DY,derivative-9),eq(DY,derivative+11)],seed)
    return answer(f"Find {m(DY)}.",derivative,steps,eq(DY,derivative),method=method,grader=options,displayed=eq(DY,derivative))


def at_point(f, derivative, x):
    result = s.simplify(derivative.subs(X,x))
    assert s.simplify(s.trigsimp(s.diff(f,X).subs(X,x)-result))==0
    return answer(f"Find the exact gradient when {m('x='+tex(x))}.",result,
        f"Evaluate {math(derivative)} at the stated input.",
        method="Substitute the specified input into the derivative.",
        grader=field("gradient","Exact gradient",result))


def exp_model(seed, style):
    r=rng(seed)
    a,b,c,d=r.randrange(2,10),r.randrange(-9,10),r.randrange(1,13),r.randrange(-10,11)
    u=a*X+b
    x=-Q(b,a)
    if style==0:
        func=c*s.exp(u)+d
        g=c*a*s.exp(u)
        wrong=c*s.exp(u)
        step=f"The derivative of {math(s.exp(u))} is that same exponential multiplied by {math(a)}. The constant term differentiates to zero."
    elif style==1:
        func=c*s.exp(-u)+d*X
        g=-c*a*s.exp(-u)+d
        wrong=c*a*s.exp(-u)+d
        step=f"The inner derivative of {math(-u)} is {math(-a)}. A term linear in x differentiates to its coefficient."
    else:
        v=c*X+d
        func=v*s.exp(u)
        g=(c+a*v)*s.exp(u)
        wrong=c*a*s.exp(u)
        step=f"Use the product rule with factors {math(v)} and {math(s.exp(u))}. Their derivatives are {math(c)} and {math(a*s.exp(u))}."
    dpart=form(func,g,wrong,seed,step,"Apply the exponential derivative and any required chain or product rule.")
    xval=s.simplify(func.subs(X,x))
    assert xval.is_real
    fpart=answer(f"Find the value of y when {m('x='+tex(x))}.",xval,
        f"At this input, the exponent is zero, and {m('e^0=1')}. Substitute into the original function.",
        method="Use the original function with the given input.",
        grader=field("value","Value of y",xval))
    return Scenario("Differentiate an exponential model",f"Consider the curve {eq('y',func)}.",
        (dpart,at_point(func,g,x),fpart),"Keep the exponential and differentiate its exponent first. Use a product rule if an outside factor varies.",
        "The coefficient of x inside the exponent supplies an additional factor, including its sign.")


def log_model(seed, style):
    r=rng(seed)
    a,b,c,d=r.randrange(2,10),r.randrange(-9,10),r.randrange(1,13),r.randrange(-10,11)
    a = -a if style==1 else a
    u=a*X+b
    x=Q(1-b,a)
    if style==2:
        g=c*a/u+d
        func=c*s.log(u)+d*X
        step=f"The derivative of the logarithm uses its input in the denominator, so {math(c*s.log(u))} contributes {math(c*a/u)}. Add the derivative of the linear term."
    else:
        g=c*a/u
        func=c*s.log(u)+d
        step=f"Set {eq('u',u)}. The derivative of {m(r'\ln u')} is {math(1/u)} times the derivative of u."
    wrong=c/u+(d if style==2 else 0)
    edge=-Q(b,a)
    domain=(f"({edge},inf)" if a>0 else f"(-inf,{edge})")
    display=m('x>'+tex(edge) if a>0 else 'x<'+tex(edge))
    restrict=answer("State the domain of y.",None,f"Require the logarithm's input, {math(u)}, to be strictly positive.",
         f"{'Reverse the inequality when dividing by the negative coefficient.' if a<0 else 'Divide by the positive coefficient.'}",
         method="Solve the strict inequality for the argument of the logarithm.",
         displayed=display,grader=field("domain","Domain for x",domain,"set",("x",)))
    assert u.subs(X,x)==1 and u.subs(X,edge)==0
    return Scenario("Differentiate a logarithm on its correct domain",f"A function is given by {eq('y',func)}.",
        (restrict,form(func,g,wrong,seed,step,"Use the chain rule on the logarithm and differentiate any other term."),at_point(func,g,x)),
        "The logarithm's argument must be positive. Differentiate it for the numerator of the chain rule.",
        "Use the derivative of the inner expression as well as the reciprocal of that expression.")


def trig_model(seed, style):
    r=rng(seed)
    a,k,d=r.randrange(2,12),r.randrange(2,10),r.randrange(-10,11)
    phase=s.pi*r.choice([Q(-1,6),Q(1,8),Q(1,5),Q(2,7),Q(1,3)])
    u=k*X+phase
    if style==0:
        f=a*s.sin(u)+d
        g=a*k*s.cos(u)
        x=(s.pi*r.choice([Q(0),Q(1,6),Q(1,4),Q(1,3)])-phase)/k
        wrong=a*s.cos(u)
        step=f"Differentiate sine to cosine and multiply by the inner derivative {math(k)}."
    elif style==1:
        f=a*s.cos(u)+d
        g=-a*k*s.sin(u)
        x=(s.pi*r.choice([Q(1,6),Q(1,4),Q(1,3),Q(1,2)])-phase)/k
        wrong=-g
        step=f"Differentiate cosine to negative sine and multiply by the inner derivative {math(k)}."
    else:
        f=a*s.tan(u)+d
        g=a*k*s.sec(u)**2
        x=(s.pi*r.choice([Q(0),Q(1,6),Q(1,4),Q(1,3)])-phase)/k
        wrong=a*k*s.cos(u)**2
        step=f"Differentiate tangent to secant squared and multiply by the inner derivative {math(k)}."
    second=s.trigsimp(s.diff(g,X).subs(X,x))
    assert s.trigsimp(second-s.diff(f,X,2).subs(X,x))==0
    second_part=answer(f"Evaluate {m(D2)} at {m('x='+tex(x))}.",second,
                      f"Differentiate {math(g)} once more. Use the same inner derivative for each differentiation.",
                      f"Substitute into {math(s.diff(g,X))}.",
                      method="Find the second derivative, then substitute while keeping angles in radians.",
                      grader=field("second","Exact second derivative",second))
    return Scenario("Differentiate a trigonometric function in radians",f"The curve is {eq('y',f)}. Angles are in radians.",
        (form(f,g,wrong,seed,step,"Use the correct radian trigonometric derivative with its inner derivative."),at_point(f,g,x),second_part),
        "Check the standard derivative and its sign before applying the chain rule.",
        "The usual trigonometric derivatives use radians, and both the sign and inner factor matter.")


def exponential_turn(seed):
    r=rng(seed)
    a,k,u,d=r.randrange(1,12),r.randrange(2,9),r.randrange(-6,7),r.randrange(-10,11)
    f=a*(X-u)*s.exp(k*(X-u))+d
    g=a*s.exp(k*(X-u))*(1+k*(X-u))
    root=u-Q(1,k)
    y=s.simplify(f.subs(X,root))
    curvature=s.simplify(s.diff(g,X).subs(X,root))
    assert s.simplify(s.diff(f,X)-g)==0 and g.subs(X,root)==0 and curvature>0
    dpart=form(f,g,a*s.exp(k*(X-u)),seed,
             f"Use the product rule on the linear and exponential factors, then factor out the always-positive {math(s.exp(k*(X-u)))}.",
             "Apply the product rule and factor the derivative.")
    xpart=answer("Find the x-coordinate of the stationary point.",root,
                "An exponential cannot be zero. Set the remaining bracket equal to zero.",
                method="Solve only the linear factor in the factored derivative.",grader=field("stationary","Stationary x-coordinate",root))
    n=explain("Find the y-coordinate and justify the nature of this point.",m(pair(root,y))+", a local minimum.",
        f"At {m('x='+tex(root))}, the original function gives {eq('y',y)}.",
        f"The second derivative at this input is {math(curvature)}, which is positive.",
        marks=(("A1",f"Give {math(y)} as the y-coordinate."),("B1","Use a valid derivative sign test for a minimum.")))
    return Scenario("Find a stationary point in an exponential product",f"The function is {eq('y',f)}.",
        (dpart,xpart,n),"In the derivative, factor out its positive exponential.",
        "The positive exponential is never a root. Solve only the remaining factor.")


def log_tangent(seed):
    r=rng(seed)
    a,b,c,d=r.randrange(2,12),r.randrange(-9,10),r.randrange(1,12),r.randrange(-10,11)
    u=a*X+b
    x=Q(1-b,a)
    f=c*s.log(u)+d
    g=c*a/u
    y=f.subs(X,x)
    slope=g.subs(X,x)
    line=slope*(X-x)+y
    assert line.subs(X,x)==y and s.diff(line,X)==s.diff(f,X).subs(X,x)
    lpart=answer(f"Find the equation of the tangent at {eq('x',x)}.",line,
        f"The point is {m(pair(x,y))}. The gradient is {math(slope)}.",
        f"Use {m('y-y_0=m(x-x_0)')}.",method="Find both the point and the gradient to construct the line.",
        displayed=eq("y",s.expand(line)),
        grader=field("tangent","Equation of tangent",f"y={s.expand(line)}","equation",("x","y")))
    return Scenario("Find a tangent to a logarithmic curve",f"Consider {eq('y',f)}, on the domain {m(tex(u)+'>0')}.",
        (at_point(f,g,x),lpart),"Use the logarithmic derivative for the gradient and the original function for y.",
        "A line needs the gradient and the point. Substituting into the derivative alone does not find the point.")


def trigonometric_turn(seed):
    r=rng(seed)
    a,k,d=r.randrange(2,14),r.randrange(2,13),r.randrange(-10,11)
    f=a*s.sin(k*X)+a*s.cos(k*X)+d
    g=a*k*(s.cos(k*X)-s.sin(k*X))
    at=s.pi/(4*k)
    val=s.simplify(f.subs(X,at))
    curv=s.simplify(s.diff(f,X,2).subs(X,at))
    assert s.trigsimp(s.diff(f,X)-g)==0 and g.subs(X,at)==0 and curv<0
    xpart=answer("Find the exact x-coordinate of the stationary point.",at,
        f"Set {math(g)} to zero to obtain equal sine and cosine. In the stated interval this gives {eq('kx',s.pi/4)}.",
        method="Use the specified angle interval to choose the solution.",
        grader=field("stationary","Exact stationary x-coordinate",at))
    classify=explain("Give the y-coordinate and justify the type of point.",
        m(pair(at,val))+", a local maximum.",
        f"The original function gives {eq('y',val)}.",
        f"The second derivative is {math(curv)} at the stationary input, so the point is a local maximum.",
        marks=(("A1",f"Give the exact ordinate {math(val)}."),("B1","Use a valid sign test for the maximum.")))
    return Scenario("Find a turn of a trigonometric curve on a restricted interval",
        f"The curve is {eq('y',f)} for {m('0<x<'+tex(s.pi/k))}. Angles are in radians.",
        (form(f,g,-g,seed,"Differentiate both trigonometric terms and preserve the inner factor.","Differentiate the two terms with the chain rule."),xpart,classify),
        "First solve the equation in the full angle kx within the allowed interval, then divide by k.",
        "The angle solving the trigonometric equation is kx. Convert it back to an x-coordinate.")


def variants(fn):
    return tuple(lambda seed,style=style:fn(seed,style) for style in range(3))


def main():
    key="differentiation-2"
    exp=plot(key,"exp-tangent","The curve y = eˣ and its tangent at x = 0. The tangent slope there is one.",
        ((numeric_math.exp,"#12547d"),(lambda x:1+x,"#c05a18")),(-2,2),(-1,7),((0,1,"(0, 1)",10,-8),))
    log=plot(key,"log-tangent","The curve y = ln x and its tangent at x = 1. The shown curve stays to the right of the vertical asymptote.",
        ((numeric_math.log,"#12547d"),(lambda x:x-1,"#c05a18")),(.07,4),(-2.8,2.8),((1,0,"(1, 0)",10,-9),))
    trig=plot(key,"sine-turn","The blue sine curve has zero gradient at its maximum. The orange derivative curve crosses the axis there.",
        ((numeric_math.sin,"#12547d"),(numeric_math.cos,"#c05a18")),(0,6.287),(-1.3,1.3),
        ((1.570796,1,"π/2, maximum",8,-8),(1.570796,0,"gradient = 0",8,-8)))
    basics=(
        ("Exponential","The variable appears in the exponent."),
        ("Inner derivative","The derivative of the expression appearing inside an exponential, logarithm or trigonometric function."),
        ("Tangent gradient","The derivative evaluated at the input of the point of contact."))
    lessons=[
      Lesson("d2-exponential","Derivatives of exponential functions","Differentiate e raised to a linear expression and combine the chain and product rules.",variants(exp_model),(
        ("exp-inner","What stays when an exponential differentiates?",f"The derivative of {m('e^x')} is itself. A linear expression inside the power supplies its own derivative as a factor.",
         f"For {m('e^{ax+b}')}, multiply the same exponential by a. A constant added after the exponential has zero derivative.",
         "Do not copy the exponent coefficient without its sign."),
        ("decreasing-exp","What if the exponent decreases with x?","A negative inner derivative can make a positive exponential term fall.",
         "Differentiate the inner expression with its sign, multiply by the original exponential, then differentiate any remaining terms.",
         "The exponential itself is always positive, even when its derivative is negative."),
        ("exp-product","What changes when a linear factor multiplies the exponential?","Both factors then depend on x and the product rule needs both terms.",
         "Keep the original exponential in one term and its derivative in the other. Factor where it makes evaluation clearer.",
         "Do not treat a factor containing x as a constant.")),basics,
         "Keep an exact exponential expression until the final requested approximation.",10,exp),
      Lesson("d2-logarithmic","Derivatives of logarithmic functions","Find the admissible domain, differentiate the argument and evaluate exact gradients.",variants(log_model),(
        ("ln-positive","Why does the logarithmic argument matter?","A real natural logarithm needs a strictly positive argument.",
         "Solve the inequality for the expression in brackets before finding a gradient. The boundary itself is excluded.",
         "A logarithmic domain is stronger than just excluding the denominator's zero."),
        ("negative-coefficient","What if the inner slope is negative?",f"The rule for {m(r'\ln(ax+b)')} is {m(r'\frac{a}{ax+b}')}, and a negative a reverses the domain inequality when dividing.",
         "Write the original argument in the denominator. Put its derivative in the numerator.",
         "The sign of the denominator on the domain does not remove the sign of the numerator."),
        ("log-sums","How do you differentiate a logarithm plus a linear term?","Differentiate each term with the rule for that term.",
         "Use the chain rule on the logarithm, differentiate the linear term and add. For a gradient, substitute into the derivative.",
         "The standard derivative of ln x does not apply unchanged to a general expression inside the logarithm.")),
         (("Argument","The input to the logarithm."),("Natural logarithm","The logarithm to base e."),("Domain","The set of admissible inputs.")),
         "Before using the derivative at a specific point, check that the logarithmic argument there is positive.",10,log),
      Lesson("d2-trigonometric","Derivatives of sine, cosine and tangent","Use radian derivative rules, including the sign of cosine's derivative and the chain factor.",variants(trig_model),(
        ("sine-radians","What changes from sine to cosine?",f"For angles in radians, {m(r'(\sin x)^\prime=\cos x')}. The argument may itself need the chain rule.",
         "Write the derivative of the outer sine and multiply by the derivative of the angle in brackets.",
         "Keep the same angle inside the derived cosine."),
        ("cosine-sign","Where does the minus sign come from?",f"The derivative of {m(r'\cos x')} is {m(r'-\sin x')}. The inner derivative still multiplies it.",
         "Keep the negative sign when differentiating cosine, then use exact radian values where possible.",
         "A negative gradient is consistent with a cosine curve that is falling."),
        ("tangent-sec","How does tangent differentiate?",f"The derivative of {m(r'\tan x')} is {m(r'\sec^2 x')}. Translate to a reciprocal square of cosine when evaluating.",
         "Use the chain factor and avoid inputs where cosine vanishes. Use radians in calculator mode.",
         "Secant squared is one divided by cosine squared, not cosine squared.")),
         (("Radian","Angle unit used in the calculus formulae."),("Secant","The reciprocal of cosine where cosine is non-zero."),("Exact value","A form without premature decimal rounding.")),
         "Write a radian input exactly before substituting. Check the resulting gradient against the graph.",13,trig,
         table((m('y'),m(DY)),((m(r'\sin x'),m(r'\cos x')),(m(r'\cos x'),m(r'-\sin x')),(m(r'\tan x'),m(r'\sec^2 x'))),"Standard radian derivatives")),
      Lesson("d2-applications","Applications of exponential, logarithmic and trigonometric derivatives","Find exact tangents and classify stationary points from non-polynomial models.",
        (exponential_turn,log_tangent,trigonometric_turn),(
        ("positive-factor","How does a positive factor help at a stationary point?","An exponential factor is positive at every real input, so only the other factors can make the derivative zero.",
         "Factor the derivative, solve the remaining equation and test the nature of each root.",
         "Setting an exponential equal to zero gives no finite real input."),
        ("log-tangent","Which expressions give the point and gradient?","The original logarithm gives y and the derivative gives the slope. Use only points in the original domain.",
         "Substitute the input in both functions, then use the point–gradient form.",
         "A tangent answer must be an equation, not only the slope."),
        ("trig-stationary","How do you use the interval when solving a derivative equation?","Translate the x-interval into an angle interval before choosing trigonometric solutions.",
         "Solve for the angle first. Convert back to x, then evaluate y and justify each stationary point.",
         "Reporting the angle kx as the stationary x-coordinate omits division by k.")),basics,
         "For a stationary point state its exact coordinates and justify its nature with a derivative test.",12),
    ]
    build(key,"Calculus: Differentiation 2",13,lessons,__file__)


if __name__=="__main__":
    main()
