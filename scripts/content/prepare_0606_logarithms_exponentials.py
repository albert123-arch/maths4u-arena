"""Build the 0606 logarithms and exponentials chapter from exact skill models."""

from fractions import Fraction as Q
from math import exp, log

from prepare_0606_geometry_and_logs_support import (
    Lesson, Section, build, choose, field, grid, line, m, minus, numbers, part,
    point, poly, problem, table, tex,
)


SLUG = "logarithms-exponentials"


def slog(b, a):
    return rf"\log_{{{b}}}\left({a}\right)"


def ln(a):
    return rf"\ln\left({a}\right)"


def exponential(base, power):
    return rf"{base}^{{{power}}}"


def base_parameters(i):
    return 2 + i % 7, 2+i//7%4, (i//28 % 7)-3


def evaluate_power_log(i):
    base,k,t=base_parameters(i)
    if t==0:
        t=4
    argument=Q(base)**t
    target=Q(t,k)
    comparison=Q(base)**(t+1)
    return problem("Read a logarithm as a power",f"A scale uses the base {m(base**k)}.",
        part(f"Give the exact value of {m(slog(base**k,tex(argument)))}.",m(target if target.denominator==1 else tex(target)),
             [f"Write the base and argument as powers of {m(base)}.",
              f"If the logarithm is {m('x')}, then {m(exponential(base,'('+str(k)+')x')+'='+exponential(base,t))}. Match exponents."],
             "Express the base and the argument as powers of the same number.",field(target),
             (str(t),"The exponent of the displayed argument is relative to the smaller base. Divide by the exponent used to form the stated base.")),
        part(f"Find the exact increase in the logarithm when the argument changes to {m(tex(comparison))}.",m(tex(Q(1,k))),
             [f"The new exponent in base {m(base)} is {m(t+1)}.",f"The change in base {m(base**k)} is {m(tex(Q(t+1,k))+'-'+tex(target))}."],
             "Evaluate the two logarithms in the same base and subtract the old value."))


def infer_base(i):
    a=2+i%13
    n=2+i//13%3
    power=Q(n,2)
    value=a**n
    return problem("Find an unknown logarithm base",f"The base {m('b')} is a positive real number other than 1. The reading is {m(slog('b',value)+'='+tex(power))}.",
        part(f"Find {m('b')}.",m(a*a),
             [f"Translate the logarithm to {m(exponential('b',tex(power))+'='+str(value))}.",
              f"Raise each side to the reciprocal power {m(tex(1/power))}. The right side is the square of {m(a)}."],
             "Rewrite the logarithm as an exponential equation and invert the exponent.",field(a*a),
             (str(a),"The n-th root is an intermediate value. The original exponent has denominator 2, so square that root.")),
        part(f"Hence find {m(slog('b',tex(Q(1,a))))}.",m(r'-\tfrac12'),
             [f"The argument is {m(exponential(a,-1))}, while the base is {m(exponential(a,2))}.",f"To make the power {m(-1)}, multiply {m(2)} by {m(r'-\tfrac12')}."],
             "Express the argument and the recovered base as powers of the same number."))


def inverse_steps(i):
    b=2+i%10
    k=2+i//10%3
    d=2+i//30%8
    a=1+i//240%4
    x=poly({1:a,0:d})
    rule=slog(b,x)
    return problem("Unwrap a logarithmic expression",f"Let {m('g(x)='+rule)} on its natural domain.",
        part(f"State the domain of {m('g')}, in interval notation or as an inequality.",m(f'x>{tex(Q(-d,a))}'),
             [f"The argument must be strictly positive: {m(x+'>0')}.",f"The coefficient of {m('x')} is positive. Divide without reversing the inequality."],
             "Solve the inequality that requires the logarithm argument to be positive.",field(f'({Q(-d,a)},inf)',"set",label="Domain",variables=("x",)),
             (f'[{Q(-d,a)},inf)',"The argument would be zero at the lower endpoint. A logarithm of zero is undefined.")),
        part(f"Find the unique solution of {m('g(x)='+str(k))}.",m(f'x={tex(Q(b**k-d,a))}'),
             [f"Use the definition of the logarithm, so that {m(x+'='+exponential(b,k))}.",f"Subtract {m(d)} and divide by {m(a)}."],
             "Convert the logarithm equality to the equivalent exponential equality."))


def log_product(i):
    b=2+i%7
    n=2+i//7%4
    t=2+i//28%12
    product=b**n
    expr=slog(b,f'{product*t}')+'-'+slog(b,t)
    return problem("Use the quotient law before evaluating",f"Consider {m('L='+expr)}.",
        part("Evaluate L exactly.",m(n),[f"The difference of logs has argument {m(rf'\frac{{{product*t}}}{{{t}}}={product}')}.",f"Since {m(exponential(b,n)+'='+str(product))}, the logarithm is {m(n)}."],
             "Divide the two positive arguments before evaluating the logarithm.",field(n)),
        part(f"Find the value of {m(slog(b,t)+'+L')} as a single logarithm to base {m(b)}.",m(slog(b, product*t)),
             [f"Rewrite {m('L')} as {m(slog(b,product))}.","Adding logarithms with the same base multiplies their arguments."],
             "Apply the product law in the opposite direction."))


def combine_logs(i):
    b=3+i%6
    n=2+i//6%3
    a=2+i//18%12
    r=2+i//216%4
    raw=f'{n}'+slog(b,'x')+'+'+slog(b,a)+'-'+slog(b,r)
    multiplier=Q(a,r)
    term=("" if multiplier==1 else tex(multiplier))+f'x^{n}'
    right=slog(b,term)
    choices=[m(right),m(slog(b,rf'\frac{{{n*a}x}}{{{r}}}')),m(slog(b,tex(a*r)+f'x^{n}')),m(slog(b,rf'\frac{{{a}x}}{{{r}^{n}}}'))]
    # The final option never has the same x-power as the correct option.
    assert len(set(choices))==4
    return problem("Combine three logarithms into one",f"For {m('x>0')}, consider {m(raw)}.",
        part(f"Write this expression as a single logarithm to base {m(b)}.",m(right),
             [f"Move {m(n)} into the exponent of {m('x')}, giving {m(slog(b,f'x^{n}'))}.",f"Multiply the first two arguments and divide by {m(r)}."],
             "Use the power law, then combine the arguments with the product and quotient laws.",choose(choices,i)),
        part(f"Solve the equation obtained by setting the original expression equal to {m(slog(b,tex(multiplier*2**n)))}.",m('x=2'),
             ["Logarithms with the same legal base are one-to-one.",f"Equate the arguments, cancel their common coefficient and solve {m(f'x^{n}={2**n}')}. Keep the positive value."],
             "Equalise the arguments of the combined logs and use the stated domain."))


def log_monomial(i):
    b,k,_=base_parameters(i)
    n=2+i//7%3
    j=1+i//21%4
    a=b**j
    c=b**n
    raw=f'{k}'+slog(b,a)+'-'+slog(b,c)
    final=k*j-n
    value=Q(b)**final
    return problem("Use a power before subtracting logarithms",f"The value {m('D')} is defined by {m('D='+raw)}.",
        part("Evaluate D exactly.",m(final),
             [f"The individual logarithms are {m(j)} and {m(n)}.",f"Substitute into the expression to get {m(f'{k}\\times{j}-{n}={final}')}."],
             "Evaluate each logarithm as an exponent before applying the outside coefficient.",field(final),
             (str(j-n),"The coefficient multiplies the entire first logarithm.")),
        part(f"Write {m(exponential(b,'D'))} as a rational number.",m(tex(value)),
             [f"Substitute the value of {m('D')} into the exponent.","A negative exponent means a reciprocal."],
             "Apply the integer-index laws to the power obtained in part (a)."))


def base_change_pair(i):
    b=2+i%8
    u=2+i//8%5
    v=1+i//40%6
    k=Q(v,u)
    return problem("Choose a shared base to compare two logarithms",f"The two numbers used in a scaling rule are {m(f'A={b**u}')} and {m(f'B={b**v}')}.",
        part(f"Find {m(slog('A','B'))} exactly.",m(tex(k)),
             [f"Changing to base {m(b)} gives {m(rf'\frac{{{slog(b,"B")}}}{{{slog(b,"A")}}}')}.",f"The numerator is {m(v)} and the denominator is {m(u)}."],
             "Use the same new base above and below the fraction.",field(k),
             (str(1/k),"You calculated the logarithm in reverse order. The denominator is the log of the original base.") if k!=1 else None),
        part(f"Find the exact value of {m(slog('B','A')+'+'+slog('A','B'))}.",m(tex(k+1/k)),
             ["Reversing the base and argument inverts the ratio of the two logarithms.",f"Add {m(tex(k))} to {m(tex(1/k))}."],
             "Find the reciprocal ratio before adding."))


def given_log(i):
    p0,q0=2+i%10,2+i//10%6
    n=2+i//60%5
    answer=Q(n*p0,q0)
    display=rf"\lg a={p0},\quad \lg b={q0}"
    return problem("Use known logarithms as data",f"Positive constants {m('a')} and {m('b')} satisfy {m(display)}.",
        part(f"Find {m(slog('b',f'a^{n}'))} without evaluating {m('a')} or {m('b')}.",m(tex(answer)),
             [f"Change to base 10. The numerator becomes {m(f'{n}\\lg a')} using the power law.",f"Divide {m(n*p0)} by {m(q0)}."],
             "Write one ratio in base 10 and apply the power law to the numerator.",field(answer),
             (str(Q(p0,q0)),"The argument is a power of a. Its logarithm contains the extra exponent as a multiplier.")),
        part(f"Evaluate {m(slog('a', f'b^{n}'))} exactly.",m(tex(Q(n*q0,p0))),
             [f"Change to base 10 again, but now the numerator is {m(f'{n}\\lg b')}.",f"The denominator is {m(r'\lg a')}."],
             "Change base and put the logarithm of the new argument in the numerator."))


def reciprocal_log(i):
    g=2+i%10
    t=2+i//10%5
    h=2+i//50%5
    a=g**t
    b=g**h
    expr=rf'\frac{{1}}{{{slog(a,b)}}}'
    return problem("Simplify a reciprocal of a logarithm",f"Here a reciprocal means the number 1 divided by the logarithm. Let {m('R='+expr)}.",
        part("Find R exactly.",m(tex(Q(t,h))),
             [f"The inner log is {m(tex(Q(h,t)))} because {m(a)} and {m(b)} are powers of {m(g)}.","Invert this value, or interchange the base and the argument using change of base."],
             "Find the base-change ratio, then invert the fraction.",field(Q(t,h)),
             (str(Q(h,t)),"This is the logarithm itself. The displayed expression is its reciprocal.") if h!=t else None),
        part(f"Verify that {m(slog(b,a))} equals R using a common base.",m(slog(b,a)+'='+tex(Q(t,h))),
             [f"Write the new base as {m(exponential(g,h))} and the argument as {m(exponential(g,t))}.",f"The exponent must be {m(tex(Q(t,h)))}."],
             "Use exponent comparison to verify that the base and argument have exchanged roles."))


def log_linear_equation(i):
    b=2+i%6
    n=2+i//6%3
    a=2+i//18%6
    d=2+i//108%18
    c=b**n
    rule=poly({1:a,0:-d})
    root=Q(c+d,a)
    return problem("Solve an equation with one logarithm",f"Consider {m(slog(b,rule)+'='+str(n))}.",
        part("Find the exact solution.",m('x='+tex(root)),
             [f"Rewrite the equation as {m(rule+'='+str(c))}.",f"Add {m(d)} and divide by {m(a)}. The argument is {m(c)}, so it is positive."],
             "Rewrite in exponential form and solve the resulting linear equation.",field(root,label="x"),
             (str(Q(c-d,a)),"The linear expression subtracts the constant. Add that constant to both sides before dividing.")),
        part("State the domain of the logarithm in the original equation.",m('x>'+tex(Q(d,a))),
             [f"Set {m(rule+'>0')}. Divide by the positive coefficient."],"Require the argument to be strictly positive."))


def log_sum_equation(i):
    b=2+i%6
    n=1+i//6%4
    u=2+i//24%14
    v=b**n
    left=poly({1:1,0:-u}); right=poly({1:1,0:(v-u-1)})
    root=u+1; reject=u-v
    return problem("Solve a product of positive log arguments",f"Solve {m(slog(b,left)+'+'+slog(b,right)+'='+str(n))} over the reals.",
        part("Give the valid solution.",m('x='+str(root)),
             [f"Both arguments must be positive. The stronger restriction is {m('x>'+str(u))}.",f"Combine the logs and solve {m(f'({left})({right})={v}')}.",
              f"The candidates are {m(root)} and {m(reject)}. Only {m(root)} satisfies the restriction."],
             "Combine the logarithms as a product and solve the quadratic.",field(root,label="x"),
             (str(reject),"That root solves the product equation, but the individual log arguments are not positive."),
             intermediate=("Check both candidate roots against the positivity conditions for each argument.",)),
        part("Show why the rejected quadratic root cannot solve the original equation.","Its first argument is negative.",
             [f"At {m('x='+str(reject))}, the first argument equals {m(-v)}. A real logarithm of that value does not exist."],
             "Substitute the rejected value into either original argument.",fact=True))


def log_difference_equation(i):
    b=2+i%6
    u=2+i//6%13
    n=1+i//78%3
    k=b**n
    a=k+2+i//234%5
    d=(a-k)*u+k
    first=poly({1:a,0:-d}); second=minus('x',u-1)
    return problem("Solve a quotient equation and keep the domain",f"Consider {m(slog(b,first)+'-'+slog(b,second)+'='+str(n))}.",
        part("Find the exact value of x.",m(u),
             [f"The original arguments require {m('x>'+tex(Q(d,a)))} and {m('x>'+str(u-1))}.",
              f"Combine to a quotient and rearrange to {m(first+'='+str(k)+f'({second})')}.",
              f"Collect like terms. At {m(u)}, the arguments are {m(k)} and {m(1)}, so the value is valid."],
             "Use the quotient law and solve the resulting linear equation.",field(u,label="x")),
        part("Evaluate the first logarithm at the solution.",m(n),
             [f"The first argument evaluates to {m(k)}.",f"This is {m(exponential(b,n))}."],
             "Substitute the solution into the first logarithm.",fact=True))


def mixed_base_equation(i):
    b=2+i%8
    k=2+i//8%3
    shift=1+i//24%19
    rate=2+i//456%4
    expression=poly({1:rate,0:-shift})
    rhs=k+1
    exponent=k
    argument=b**exponent
    answer=Q(argument+shift,rate)
    eq=slog(b,expression)+'+'+slog(b**k,expression)+'='+str(rhs)
    return problem("Solve a logarithm equation with two bases",f"The equation is {m(eq)}.",
        part("Give the exact solution for x.",m(tex(answer)),
             [f"The two arguments are identical. Change the second logarithm to base {m(b)}, introducing a factor of {m(tex(Q(1,k)))}.",
              f"The sum becomes {m(tex(1+Q(1,k))+slog(b,expression)+'='+str(rhs))}, so {m(slog(b,expression)+'='+str(exponent))}.",
              f"Convert to exponential form. The original argument is {m(argument)}, which is positive."],
             "Express the two logarithms in one base, then solve the resulting equation.",field(answer,label="x"),
             intermediate=("Combine coefficients of the common logarithm.",)),
        part("State the set of allowable x-values for the original logarithms.",m('x>'+tex(Q(shift,rate))),
             [f"The same argument occurs in both terms. Require {m(expression+'>0')}."],
             "Apply the strict positivity condition to the shared argument."))


def same_exponential_base(i):
    b=2+i%5
    u=2+i//5%3
    v=2+i//15%3
    c=2+i//45%8
    a=2+i//360%6
    k=Q(v*c-u,a*u)
    first=exponential(b**u,poly({1:a,0:1})); last=exponential(b**v,c)
    return problem("Solve by rewriting two powers in one base",f"The equation is {m(first+'='+last)}.",
        part("Find x exactly.",m(tex(k)),
             [f"Write the two bases as powers of {m(b)}.",f"Equate the exponents to get {m(f'{u}({a}x+1)={v*c}')}. Solve for {m('x')}."],
             "Use a shared base and equate the two exponents.",field(k,label="x"),
             (str(Q(v*c-u,a)),"The outside power multiplies both terms of the inner exponent.")),
        part(f"Hence solve {m(exponential(b**u,poly({1:a,0:1}))+'='+exponential(b**v,c+1))} exactly.",m(tex(k+Q(v,a*u))),
             [f"The exponent on the right increases by {m(v)} in base {m(b)}.",f"The exponent on the left grows by {m(a*u)} per unit of {m('x')}."],
             "Match the change in exponents or repeat the common-base method."))


def unequal_exponential_bases(i):
    a=2+i%9
    b=15+i//9%18
    c=2+i//162%4
    d=1+i//648%5
    t=(log(b)/log(a)-d)/c
    rhs=rf'\frac{{\ln {b}-{d}\ln {a}}}{{{c}\ln {a}}}'
    eq=exponential(a,poly({1:c,0:d}))+'='+str(b)
    return problem("Solve an exponential equation with logarithms",f"Consider the equation {m(eq)}.",
        part("Give the value of x correct to 3 decimal places.",m(f'x\\approx {t:.3f}'),
             [f"Take natural logarithms of both sides, giving {m(f'({c}x+{d})\\ln {a}=\\ln {b}')}.",f"Collect the terms to get {m('x='+rhs)}. Round at the end."],
             "Take logs of both sides and bring the exponent down.", field(f'{t:.10f}',"approximate",label="x to 3 decimal places",tolerance=0.00050001),
             intermediate=("Isolate x using the coefficient of the linear exponent.",)),
        part(f"If the right-hand side is multiplied by {m(a)}, by how much does the solution increase? Give an exact value.",m(tex(Q(1,c))),
             [f"Multiplying the output by the base {m(a)} increases the exponent by 1.",f"Since the exponent has gradient {m(c)}, x increases by {m(tex(Q(1,c)))}."],
             "Translate multiplication by the base to an increase of one in the exponent."))


def exponential_substitution(i):
    b=2+i%5
    r=i//5%3
    t=1+i//15%3+r
    roots=(b**r,b**t)
    u,v=roots
    middle=u+v; constant=u*v
    h=i//45%4
    seed=poly({1:1,0:h})
    double=poly({1:2,0:2*h})
    roots_x=(r-h,t-h)
    equation=exponential(b,double)+rf'-{middle}\cdot '+exponential(b,seed)+'+'+str(constant)+'=0'
    return problem("Reduce two exponential terms to a quadratic",f"Consider {m(equation)}.",
        part("Find both exact x-values.",m(f'x={roots_x[0]}\\text{{ or }}x={roots_x[1]}'),
             [f"Set {m('u='+exponential(b,seed))}. The first term becomes {m('u^2')}.",
              f"The quadratic factors as {m(f'(u-{u})(u-{v})=0')}.",f"Both u-values are positive. Match the exponent {m(seed)} to {m(r)} and {m(t)} in turn."],
             "Substitute a single positive variable for the basic exponential.",field(numbers(roots_x),"set",label="All values of x",variables=("x",)),
             (numbers([u,v]),"These are the values of the substituted variable. Convert them back to powers to find x."),
             intermediate=("Solve the quadratic in the substituted variable and check it is positive.",)),
        part(f"Explain what happens if one root of the substituted quadratic is negative.","It cannot give a real solution for x.",
             [f"For real x, the value of {m(exponential(b,seed))} is positive."],"Use the positivity of the exponential function.",fact=True))


def natural_backsolve(i):
    n=2+i%8
    b=2+i//8%10
    c=1+i//80%6
    x=Q(n-c,b)
    expr=poly({1:b,0:c})
    return problem("Undo a natural exponential without approximating e",f"A reading satisfies {m(exponential('e',expr)+'='+exponential('e',n))}.",
        part("Find x exactly.",m(tex(x)),
             ["The natural logarithm reverses an exponential to base e.",f"Taking natural logs gives {m(expr+'='+str(n))}. Rearrange to isolate x."],
             "Take natural logarithms and simplify ln of e to the given power.",field(x,label="x")),
        part(f"Find the exact value of {m(ln(exponential('e','x'))+'+1')} at this reading.",m(tex(x+1)),
             [f"The natural log cancels the exponential, leaving {m('x+1')}.",f"Substitute {m(tex(x))}."],
             "Cancel the inverse operations before substituting the exact value."))


def ln_intersection(i):
    a=2+i%6
    b=a+1+i//6%5
    c=1+i//30%6
    yline=rf'y={c}\ln x'
    middle=c-a-b
    term=poly({1:middle,0:a*b},r'\ln x')
    quad=rf'y=(\ln x)^2' + ('+' if middle>=0 else '')+term
    return problem("Find intersections using a log substitution",f"For {m('x>0')}, the two curves are {m(yline)} and {m(quad)}.",
        part("At the intersections, find both values of ln x.",m(fr'\ln x={a}\text{{ or }}\ln x={b}'),
             [f"Set {m(r't=\ln x')} and equate the two y-expressions.",f"After subtraction the equation is {m(f'(t-{a})(t-{b})=0')}."],
             "Equate the curves and factor the resulting quadratic in ln x.",field(numbers([a,b]),"set",label="Values of ln x")),
        part("State the exact coordinates of both intersections.",m(point((exponential('e',a),c*a))+'\\text{ and }'+point((exponential('e',b),c*b))),
             ["Exponentiate both t-values to get the original x-values.",f"Compute y from {m(yline)} at each solution."],
             "Recover x from t and use either curve to determine y.",
             intermediate=("Recover both x-values by applying the exponential function.",)))


def natural_product(i):
    a=2+i%9
    c=2+i//9%6
    u=2+i//54%6
    v=1+i//324%6
    raw=ln(f'{a}'+exponential('e',f'{c}x'))+'-'+ln(a)
    return problem("Cancel a product inside a natural logarithm",f"For real x, define {m('F(x)='+raw)}.",
        part(f"Find the exact solution to {m(f'F(x)={u}')}.",m(tex(Q(u,c))),
             [f"By the quotient law, the logarithm argument simplifies to {m(exponential('e',f'{c}x'))}.",f"The left-hand side becomes {m(f'{c}x')}."],
             "Combine the logarithms and use ln of an exponential.",field(Q(u,c),label="x")),
        part(f"Find the exact value of {m(f'F(-{v})')}.",m(-c*v),
             [f"Use the simplified form {m(f'F(x)={c}x')}."],"Use the simplified form in the second evaluation.",fact=True))


def scale_model(i):
    x=2+i%12
    b=Q(6+i//12%7,5)
    t=2+i//84%5
    p0=x*b
    p1=x*b**(t+1)
    forecast=x*b**(t+2)
    return problem("Recover the scale and growth multiplier",f"A controlled simulation reports {m('G=Ab^t')} with positive constants. The readings are {m('G(1)='+tex(p0))} and {m(f'G({t+1})='+tex(p1))}.",
        part(f"Find the growth multiplier {m('b')} exactly.",m(tex(b)),
             [f"Divide the second reading by the first. There are {m(t)} time steps between them.",f"The ratio is {m(tex(p1/p0))}, so take its positive {m(t)}th root."],
             "Divide the readings and use the time difference as the exponent of b.",field(b,label="b"),
             (str(p1/p0),"This is growth across all the time steps. Take the positive root to get single-step growth.")),
        part(f"Find {m('A')} and then the exact next reading {m(f'G({t+2})')}.",m(f'A={x}\\text{{ and }}G({t+2})={tex(forecast)}'),
             [f"Divide the first reading by b to find A.",f"The next value is the most recent reading multiplied by {m(tex(b))}."],
             "Recover the initial scale and multiply the last reading by one-step growth.",
             intermediate=("Recover A by substituting either observed reading into the model.",)),
        figure_html=table(["Time", "Reading"],[[m(1),m(tex(p0))],[m(t+1),m(tex(p1))]]))


def threshold(i):
    a=20+i%23
    b=1+i//23%6
    k=Q(b,10)
    level=Q(a,2+i//138%4)
    time=log(float(Q(a,1)/level))/float(k)
    return problem("Find when an exponential decay model reaches a threshold",f"A sensor records {m('R='+str(a)+exponential('e','-'+tex(k)+'t'))} for time t in hours. The alert level is {m(tex(level))}.",
        part("Find the time at which the reading reaches the alert level. Give your answer to 3 decimal places.",m(f'{time:.3f}\\text{{ h}}'),
             [f"Divide by {m(a)}. This gives {m(exponential('e','-'+tex(k)+'t')+'='+tex(level/a))}.",
              f"Take logs and divide by the negative coefficient of t, obtaining {m(rf't=\frac{{-\ln({tex(level/a)})}}{{{tex(k)}}}')}."],
             "Isolate the exponential factor and use the natural logarithm.",field(f'{time:.10f}',"approximate",label="Hours to 3 decimal places",tolerance=.00050001)),
        part("Explain why this is the only non-negative time when the alert level is met.","The exponential factor is strictly decreasing, so it passes through that level once.",
             [f"The exponent has a strictly negative coefficient and the positive scale is {m(a)}. The reading starts above the threshold and tends to 0."],
             "Use monotonicity and the limiting value to explain uniqueness."))


def calibrated_model(i):
    x=10+i%19
    t=2+i//19%7
    growth=Q(3+i//133%7,5)
    a=x*growth**t
    before=x/growth
    raw=rf'R(t)=A\,b^t'
    return problem("Interpret a measured multiplicative change",f"A reading obeys {m(raw)}. At the reference time {m('t=0')}, it is {m(x)}. Over the next {m(t)} intervals it becomes {m(tex(a))}.",
        part(f"Find the exact value of {m('b')}.",m(tex(growth)),
             [f"The reference reading gives {m('A='+str(x))}.",f"Divide the later reading by the reference reading and take the positive {m(t)}th root."],
             "Use the ratio of the later and initial readings to find b.",field(growth,label="b")),
        part("Find the value predicted one interval before the reference time. Explain the interpretation of this calculation.",m('R(-1)='+tex(before)),
             ["Divide rather than multiply to move back one time interval.","This is a backward extrapolation of the model. Its accuracy depends on whether that model was valid before the reference time."],
             "Use the reciprocal multiplier for a previous interval."))


def exp_graph_features(i):
    k=(2+i%7)*(-1 if i//7%2 else 1)
    n=(1+i//14%3)*(-1 if i//42%2 else 1)
    a=2+i//84%16
    expr=poly({1:k,0:a},exponential('e',poly({1:n},'x')))
    return problem("Read the asymptote and intercepts of an exponential graph",f"The curve has equation {m('y='+expr)}.",
        part("State the equation of its horizontal asymptote.",m('y='+str(a)),
             [f"The exponential term tends to zero as x tends to {'negative' if n>0 else 'positive'} infinity.",f"The remaining vertical shift is {m(a)}."],
             "Find the limiting y-value when the exponential term tends to zero.",field(a,label="Asymptote y-value"),
             (str(a+k),"That is the y-intercept. The asymptote is the limit when the exponential term tends to zero.")),
        part("State the y-intercept and range, and sketch the graph.",
             m(point((0,a+k)))+" and "+m('y'+('>' if k>0 else '<')+str(a))+". The graph is "+("increasing." if k*n>0 else "decreasing."),
             ["At x = 0, the exponential term is one.",f"The curve lies {'above' if k>0 else 'below'} its asymptote because the exponential factor stays positive.",
              f"The sign of the coefficient product {m(k*n)} gives the direction of movement as x increases."],
             "Substitute x = 0 and use the sign of the exponential multiplier.",
             intermediate=("Draw the curve on the correct side of its horizontal asymptote.",)))


def exp_axis_crossing(i):
    k=2+i%7
    a=3+i//7%12
    n=1+i//84%5
    power=poly({1:n})
    expr=poly({1:k,0:-a},exponential('e',power))
    cross=log(a/k)/n
    exact=rf'\frac{{\ln({tex(Q(a,k))})}}{{{n}}}' if n!=1 else ln(tex(Q(a,k)))
    return problem("Locate an exponential graph's x-axis intercept",f"Consider {m('y='+expr)}.",
        part("Find the x-coordinate of the intercept. Give your answer to 3 decimal places.",m(f'x\\approx {cross:.3f}'),
             [f"On the x-axis, y is zero. Isolate the exponential to get {m(exponential('e',power)+'='+tex(Q(a,k)))}.",
              f"The exact coordinate is {m(exact)}. Round only at the end."],
             "Set y to zero and isolate the exponential before taking logs.",field(f'{cross:.10f}',"approximate",label="x to 3 decimal places",tolerance=.00050001)),
        part(f"For a line {m('y=c')}, state the condition on c for one intersection with this curve.",m('c>-'+str(a)),
             [f"The exponential term is always positive, and can take every positive value. The entire range lies above {m(-a)}."],
             "Use the range of the exponential curve to decide which horizontal lines reach it."))


def recover_graph_scale(i):
    k=2+i%13
    c=2+i//13%20
    n=1+i//260%4
    return problem("Recover parameters of a shifted exponential",f"The graph of {m('y=k'+exponential('e',poly({1:n}))+'+a')} passes through {m(point((0,k+c)))}. Its horizontal asymptote is {m('y='+str(c))}.",
        part("Find the value of k.",m(k),
             [f"The asymptote gives {m('a='+str(c))}.",f"At the y-intercept the exponential is 1. Subtract {m(c)} from the intercept."],
             "Read the translation from the asymptote, then substitute x = 0.",field(k,label="k")),
        part(f"Find the exact height of the graph when {m('x='+tex(Q(1,n)))}.",m(poly({1:k,0:c},'e')),
             [f"At this x, the exponent is 1. Multiply e by {m(k)} and add {m(c)}."],
             "Substitute the recovered parameters and simplify the exponent."))


def log_graph_features(i):
    a=(2+i%6)*(-1 if i//6%2 else 1)
    b=2+i//12%12
    k=(2+i//144%6)*(-1 if i//864%2 else 1)
    inner=poly({1:a,0:b})
    slope=k*a
    x_boundary=Q(-b,a)
    x_cross=Q(1-b,a)
    domain=f'({x_boundary},inf)' if a>0 else f'(-inf,{x_boundary})'
    domain_tex=f'x{"<" if a<0 else ">"}{tex(x_boundary)}'
    return problem("Locate the boundary and intercept of a logarithmic curve",f"A curve has equation {m('y='+str(k)+ln(inner))}.",
        part("State the natural domain.",m(domain_tex),
             [f"Solve {m(inner+'>0')}." + (" Dividing by the negative coefficient reverses the inequality." if a<0 else " Divide by the positive coefficient." )],
             "Require the entire expression inside the logarithm to be positive.",field(domain,"set",label="Domain",variables=("x",)),
             ((f'(-inf,{x_boundary})' if a>0 else f'({x_boundary},inf)'),"Check the sign of the coefficient of x before dividing the domain inequality.")),
        part("Find the x-intercept and the equation of the vertical asymptote. Sketch the curve.",
             m(point((x_cross,0)))+" and "+m('x='+tex(x_boundary))+". The curve is "+("increasing." if slope>0 else "decreasing."),
             [f"A logarithm is zero when its argument reaches 1. Solve {m(inner+'=1')}.",
              f"The domain boundary occurs at argument 0. The graph never reaches that vertical line.",
              "The sign of the inner coefficient and the sign of the multiplier determine the graph's direction."],
             "Equate the argument to 1 for the crossing and 0 for the boundary.",
             intermediate=("Sketch the curve on the correct side of the vertical asymptote.",)))


def log_recover(i):
    a=2+i%13
    h=1+i//13%18
    k=2+i//234%5
    b=a*h
    answer=Q(1-b,a)
    return problem("Recover the log argument from its vertical asymptote",f"The graph of {m(f'y={k}'+ln(f'{a}x+b'))} has vertical asymptote {m('x=-'+str(h))}.",
        part("Find the value of b.",m(b),
             [f"At the asymptote the argument tends to 0. Set {m(f'{a}(-{h})+b=0')}."],
             "Use zero argument at the vertical asymptote.",field(b,label="b")),
        part("Find the exact x-intercept and y-intercept.",m(point((answer,0)))+" and "+m(point((0,str(k)+ln(b)))),
             [f"Solve {m(f'{a}x+{b}=1')} at the x-intercept.",f"At x = 0, the argument is {m(b)} and the outside multiplier is {m(k)}."],
             "Set y = 0 and x = 0 in turn. Use ln 1 = 0 for the first crossing.",
             intermediate=("Set the argument to 1 to find the x-intercept.",)))


def inverse_exp(i):
    k=2+i%7
    n=1+i//7%7
    a=2+i//49%18
    y=poly({1:k,0:a},exponential('e',poly({1:n})))
    assume=ln(rf'\frac{{{minus("x",a)}}}{{{k}}}')
    response=(assume if n==1 else rf'\frac{{1}}{{{n}}}'+assume)
    options=[m(response),m(("" if n==1 else rf'\frac{{1}}{{{n}}}')+ln(rf'\frac{{x+{a}}}{{{k}}}')),
          m(("" if n==1 else rf'\frac{{1}}{{{n}}}')+ln(rf'\frac{{{minus("x",a)}}}{{{k+1}}}')),
          m(("" if n==1 else rf'\frac{{1}}{{{n}}}')+ln(rf'\frac{{{k}}}{{{minus("x",a)}}}'))]
    return problem("Invert a translated exponential",f"The function {m('f(x)='+y)} is defined for all real x.",
        part(f"Find {m('f^{-1}(x)')}.",m('f^{-1}(x)='+response),
             [f"Let y be the original output. Isolate the exponential as {m(exponential('e',poly({1:n}))+'='+rf'\frac{{y-{a}}}{{{k}}}')}.",
              f"Take natural logs and divide by {m(n)}. Write the original output as the variable of the inverse."],
             "Isolate the original exponential before taking logs.",choose(options,i)),
        part("State the domain of the inverse and explain why it has this domain.",m('x>'+str(a)),
             [f"The original outputs are strictly above {m(a)}. These become the allowed inputs of the inverse.",
              "The positivity condition on the argument of the inverse logarithm gives the same result."],
             "Use the range of the original function or solve the argument positivity condition."))


def inverse_ln(i):
    a=2+i%8
    b=2+i//8%13
    k=2+i//104%5
    rule=str(k)+ln(poly({1:a,0:-b}))
    inverse=rf'\frac{{{exponential("e",tex(Q(1,k))+"x")}+{b}}}{{{a}}}'
    distractors=[rf'\frac{{{exponential("e",tex(Q(1,k))+"x")}-{b}}}{{{a}}}',rf'\frac{{{exponential("e",str(k)+"x")}+{b}}}{{{a}}}',
                 rf'\frac{{{exponential("e",tex(Q(1,k))+"x")}+{b}}}{{{a+1}}}']
    return problem("Invert a logarithmic rule",f"Let {m('h(x)='+rule)} on its natural domain.",
        part(f"Find {m('h^{-1}(x)')}.",m('h^{-1}(x)='+inverse),
             [f"Divide the original equation by {m(k)}, then exponentiate to obtain the original argument.",f"Add {m(b)} and divide by {m(a)} to isolate the original input."],
             "Divide by the outside multiplier first, then undo ln with e to a power.",choose([m(inverse),*map(m,distractors)],i)),
        part("State the exact range and domain of the inverse.",m('y>'+tex(Q(b,a)))+". The inverse is defined for every real x.",
             [f"The original allowed inputs are {m('x>'+tex(Q(b,a)))}. Those become inverse outputs.","A natural logarithm covers every real output. All real x therefore work in the inverse."],
             "Use the original domain and range in the opposite order."))


def linked_inverse_value(i):
    b=2+i%7
    a=2+i//7%8
    k=2+i//56%8
    t=1+i//448%4
    root=Q(b**t+a,k)
    rule=slog(b,poly({1:k,0:-a}))
    return problem("Evaluate an inverse via the original rule",f"The function is {m('f(x)='+rule)} on its natural domain.",
        part(f"Find the exact value of {m(f'f^{{-1}}({t})')}.",m(tex(root)),
             [f"If {m('x')} is the inverse value, the original output at x must be {m(t)}.",f"Solve {m(poly({1:k,0:-a})+'='+str(b**t))}."],
             "Convert the inverse evaluation to an equation in the original function.",field(root)),
        part(f"State the value of {m('f(f^{-1}('+str(t)+'))')} and explain the result.",m(t),
             ["The inverse starts from the target output and recovers the input that produced it. Applying the original function returns that output."],
             "Use the composition of a one-to-one function with its inverse.",fact=True))


def figures():
    eparts=[(i/30, exp(i/30)) for i in range(-75,61)]
    inv=[(y,x) for x,y in eparts]
    basic=grid(SLUG,"inverse-powers","Increasing exponential and logarithmic curves reflected about the diagonal.",
               f"The two shapes exchange input and output across {m('y=x')}. The marked points are exchanged too.",
               xrange=(-3,4),yrange=(-3,4),equal=True,curves=((eparts,"#235d97"),(inv,"#148064")),
               dots=((0,1,"A"),(1,0,"B")),guides=((((-3,-3),(4,4)),"#9c4c13"),))
    eprofile=grid(SLUG,"shifted-exponential","An increasing exponential curve lying above a horizontal dashed line.",
                  f"The horizontal asymptote is {m('y=2')}. The point at {m('x=0')} is one unit higher.",
                  xrange=(-4,4),yrange=(0,7),curves=(([(x/20,2+exp(x/20)) for x in range(-80,81)],"#235d97"),),
                  dots=((0,3,"y-intercept"),),guides=((((-4,2),(4,2)),"#b35a19"),))
    lprofile=grid(SLUG,"bounded-logarithm","A logarithmic curve in the region to the right of a vertical dashed line.",
                  f"The curve {m(r'y=2\ln(x+1)')} has its boundary at {m('x=-1')} and its intercept at the origin.",
                  xrange=(-4,5),yrange=(-4,4),curves=(([(x/30,2*log(x/30+1)) for x in range(-29,151)],"#147456"),),
                  dots=((0,0,"O"),),guides=((((-1,-4),(-1,4)),"#b35a19"),))
    model=grid(SLUG,"decay-threshold","Decreasing exponential model crossing a horizontal alert line once.",
               "Read from the threshold to the curve, then down to time. The logarithm gives the crossing without measuring the sketch.",
               xrange=(0,8),yrange=(0,8),curves=(([(x/20,7*exp(-x/60)) for x in range(161)],"#235d97"),),
               guides=((((0,3),(8,3)),"#b35a19"),(((3*log(7/3),0),(3*log(7/3),3)),"#148064")),axes=("t","R"))
    return basic,eprofile,lprofile,model


def units():
    basic,eprofile,lprofile,model=figures()
    base_terms=(("Base","The fixed positive number that is raised to a power. A log base cannot equal 1."),
                ("Argument","The expression inside a logarithm. It has to be positive."),
                ("Exponent","The power to which the base is raised."))
    curve_terms=(("Asymptote","A line approached by part of a graph."),
                 ("Intercept","A point where a graph crosses or touches an axis."),
                 ("Range","The set of all outputs a function can take."),
                 ("Natural domain","All real inputs for which the stated function rule makes sense."))
    return [
       Lesson("bases-and-powers","Read logarithms as powers","Convert between powers and logarithms. Use positive arguments, including fractional and negative powers.",(
           Section("inverse-powers","What does a logarithm return?","Read a log statement as a question about an exponent. For a legal base, each positive argument has one corresponding power.",
                   f"The statements {m('b^u=v')} and {m(slog('b','v')+'=u')} have the same meaning when {m(r'b>0,\ b\ne1,\ v>0')}.",
                   "The logarithm is the exponent. Keep the base and the argument in their own roles.","Try to rewrite the base and argument as powers of one smaller base.",evaluate_power_log,basic),
           Section("unknown-base","Can the base be the unknown?","Turn a logarithmic equation into an exponential equation. Undo the stated exponent to recover the base.",
                   f"For unknown positive {m('b')}, {m(slog('b','v')+'=u')} gives {m('b=v^{1/u}')} if {m(r'u\ne0')} and the answer is a legal base.",
                   "Multiplying by a fractional exponent is different from raising to that exponent.","Check the recovered base is positive and different from one.",infer_base),
           Section("domain","Which arguments are allowed?","A positive real base raised to any real power always gives a positive result. The inverse logarithm therefore needs its argument to be positive.",
                   f"For a logarithm of a whole expression, require that whole expression to be greater than zero, for example {m(r'\lg(5x-1)')} needs {m(r'x>\tfrac15')}.",
                   "The boundary itself is excluded because the argument is zero there.","Solve the argument inequality before solving the log equation.",inverse_steps),
       ),base_terms,9),
       Lesson("log-laws","Laws of logarithms","Use the product, quotient and power laws to combine and evaluate logarithms.",(
           Section("quotient-law","Why does subtraction divide the arguments?","Dividing powers of the same number subtracts their exponents. Logarithms return those exponents.",
                   f"With positive arguments {m('A,B')}, {m(slog('b','A')+'-'+slog('b','B')+'='+slog('b',r'\tfrac{A}{B}'))}.",
                   "Subtracting the arguments gives a different number. Form the quotient first.","Keep the order of arguments: the subtracted log supplies the denominator.",log_product),
           Section("power-product","How can I write several terms as one log?","First move an outside coefficient to a power of the argument. Then join same-base logs by multiplying or dividing arguments.",
                   f"Use {m('n'+slog('b','x')+'='+slog('b','x^n'))} before applying the product and quotient laws. Each original argument must be positive.",
                   "No log law replaces a logarithm of a sum by a sum of logarithms.","For symbolic arguments, write the combined argument clearly before simplifying it.",combine_logs),
           Section("integer-powers","Can I evaluate the logs before using a law?","When an argument is a familiar power of the base, you can evaluate the log directly and then do the arithmetic.",
                   f"If {m('A=b^u')} and {m('B=b^v')}, then {m('k'+slog('b','A')+'-'+slog('b','B')+'=ku-v')}.",
                   "The coefficient multiplies the value of its own logarithm. It does not multiply the log base.","Check your evaluation by combining the logs and simplifying the powers inside.",log_monomial),
       ),base_terms,11),
       Lesson("change-of-base","Change the base of a logarithm","Use a common base, work with given log values and interpret reciprocals.",(
           Section("same-base","How do I choose a better base?","Turn the log into an exponential equation, take logs in a new base, then solve for the original exponent. A base shared by both numbers can give an exact rational result.",
                   f"For any legal new base {m('c')}, {m(slog('a','b')+r'=\frac{\log_c b}{\log_c a}')}.",
                   "Apply the same new base to numerator and denominator. The original base is in the denominator.","Choose a common small base if both numbers are powers of it.",base_change_pair),
           Section("given-log-values","How can I use given logs without evaluating the numbers?","A problem might give the logarithms of two variables. Use these values directly in the change-of-base ratio.",
                   f"The numerator of {m(slog('b','a^n'))} after changing to base 10 is {m(r'\lg(a^n)=n\lg a')}.",
                   "Include the power as a multiplier after changing the base.","Keep the ratio exact until the required answer is obtained.",given_log),
           Section("reciprocal","What does the reciprocal of a logarithm mean?","If you swap which value is the log base and which is the argument, all the terms in the base-change ratio swap.",
                   f"When {m('a,b>0')} and both differ from 1, {m(rf'\frac{{1}}{{{slog("a","b")}}}='+slog('b','a'))}.",
                   "A reciprocal is a fraction with numerator 1. It is different from an inverse function.","Check that the original logarithm is nonzero before taking its reciprocal.",reciprocal_log),
       ),(base_terms[0],("Common logarithm","A logarithm to base 10, written lg."),base_terms[1]),10),
       Lesson("log-equations","Solve logarithmic equations","Check domains first, solve a combined equation and test every candidate in the original logarithms.",(
           Section("single-log","How do I start with one logarithm?","State the restriction first. Convert the log equality into exponential form. Then solve the simpler algebraic equation and check the original argument.",
                   f"Use {m(slog('a','U')+'=r')} to obtain {m('U=a^r')}. The function requires {m('U>0')}.",
                   "The right-hand side of the new equation is a power of the log base.","Show the original domain even when you expect only one candidate.",log_linear_equation),
           Section("products-roots","Which root of the product equation is valid?","Combine same-base logarithms into one. The resulting product can be positive even when both individual arguments are negative.",
                   f"A solution must make each original argument positive. The condition {m('UV>0')} alone is weaker than {m('U>0')} and {m('V>0')} together.",
                   "Do not accept a quadratic root without testing the original arguments.","Write a rejection reason beside any candidate you exclude.",log_sum_equation),
           Section("quotients-bases","How can I handle subtraction or different bases?","A difference of same-base logs gives a quotient. If the bases differ, change to a common base before combining any terms.",
                   f"Set the quotient of the original arguments to {m('a^r')} when their log difference in base {m('a')} equals {m('r')}. Check that the denominator is positive.",
                   "Cross-multiplying before noting the domain can introduce candidates excluded by an original argument.","At the end, substitute to confirm that both log arguments are positive.",log_difference_equation),
       ),(base_terms[1],("Candidate root","A solution of an intermediate equation which still needs checking."),base_terms[0]),18,
              (log_linear_equation,log_sum_equation,log_difference_equation,mixed_base_equation,log_sum_equation)),
       Lesson("exp-equations","Solve exponential equations","Use a common base, logarithms or a positive substitution depending on the equation.",(
           Section("matching-bases","When can I match the exponents?","Look for a small common base before taking any logarithms. Since legal exponential functions pass each positive value once, equal outputs give equal exponents.",
                   f"If {m('b>0')} and {m(r'b\ne1')}, then {m('b^u=b^v')} implies {m('u=v')}.",
                   "When changing the base of a power, multiply the entire exponent by the extra power.","State the common base in your working, then solve a linear equation if possible.",same_exponential_base),
           Section("unmatched-bases","What if the bases do not match?","Isolate the term with the unknown exponent. Take logarithms of both sides so the power law makes that exponent a multiplier.",
                   f"For {m('a>0')}, {m(r'a\ne1')} and {m('b>0')}, the solution of {m('a^x=b')} is {m(r'x=\frac{\ln b}{\ln a}')}.",
                   "If a constant has been added outside the exponential, move it before taking logs.","Keep the exact ratio during working and round only if the question asks for it.",unequal_exponential_bases),
           Section("substitute","When is an expression a disguised quadratic?","When one exponential term is the square of another, replace the smaller one with a positive variable. Solve the quadratic, then convert back.",
                   f"With {m('u=a^x')}, the expression {m('a^{2x}')} becomes {m('u^2')} and {m('u>0')}.",
                   "A negative or zero value of the substituted variable cannot be an exponential value.","For each positive solution in u, solve a separate exponential equation for x.",exponential_substitution),
       ),(base_terms[2],("Exponential equation","An equation with an unknown in an exponent."),("Positive substitution","A variable replacing an expression known to be strictly positive.")),19),
       Lesson("natural-log","Natural logarithms and substitutions","Simplify inverse operations to base e and find intersections by replacing ln x with a new variable.",(
           Section("ln-e","How do e and ln undo each other?","The natural logarithm is the logarithm to base e. It takes a positive value back to its exponent.",
                   f"For real {m('t')}, {m(r'\ln(e^t)=t')}. For {m('x>0')}, {m(r'e^{\ln x}=x')}.",
                   "The second identity only works when the original log argument is positive.","Cancel inverse operations symbolically instead of approximating e.",natural_backsolve,basic),
           Section("products","What happens to a constant multiplying an exponential?","The product of a positive constant and an exponential becomes a sum after taking logarithms.",
                   f"When {m('A>0')}, {m(r'\ln(Ae^u)=\ln A+u')}.",
                   "A constant inside a product becomes a logarithmic term, not the constant itself.","Use the product law before finding the final numerical value.",natural_product),
           Section("intersections","Can I find an intersection with a log substitution?","At an intersection the y-values agree. If the algebra uses repeated powers of ln x, work with a single new variable.",
                   f"Take {m(r't=\ln x')}, solve for t, then recover {m('x=e^t')}. The variable t can take any real value.",
                   "The substituted t-values are not the x-coordinates.","Find the matching y-value for each recovered x-coordinate.",ln_intersection),
       ),(("Natural logarithm","The base-e logarithm, written ln."),("Intersection","A point satisfying the equations of both curves."),base_terms[1]),8),
       Lesson("growth-decay","Exponential growth and decay models","Use a multiplicative model to recover constants, predict readings and solve threshold questions.",(
           Section("recover-model","How can I find a multiplier from two observations?","In a multiplicative model the same positive factor applies over equal time intervals. Divide the later observation by the earlier one to cancel the scale.",
                   f"For {m('P(t)=Ab^t')}, the ratio over {m(r'\Delta t')} time units is {m(r'b^{\Delta t}')}. The positive root recovers b.",
                   "The ratio of observations may describe several intervals. It is not automatically the one-step factor.","Record the elapsed time between observations, not the final time label.",scale_model,model),
           Section("threshold","When does a decaying measurement reach a known level?","Set the model equal to the threshold. Taking logs gives the elapsed time after you isolate the exponential factor.",
                   f"For positive {m('A,k,L')}, {m('Ae^{-kt}=L')} gives {m(r't=\frac{\ln(A/L)}{k}')} and represents non-negative time when {m(r'L\le A')}.",
                   "The minus sign belongs to the rate in the exponent. Check that a decay time is non-negative.","Interpret the final value in the units given for time.",threshold),
           Section("interpret","What does the model say before the reference reading?","A negative time means earlier than the chosen reference. It does not mean a negative measurement.",
                   f"For {m('P(t)=Ab^t')}, the reference reading is {m('P(0)=A')} and the reading one interval earlier is {m(r'P(-1)=\frac{A}{b}')}.",
                   "A model prediction outside the measured interval is an extrapolation.","Distinguish the reference time from the first time the process really existed.",calibrated_model),
       ),(("Growth multiplier","The factor applied for each unit increase of time."),("Threshold","A stated level whose crossing time is needed."),("Extrapolation","A prediction outside the measured range.")),8),
       Lesson("exp-graphs","Graphs of shifted exponentials","Find intercepts, asymptotes, range and direction for y = k eⁿˣ + a.",(
           Section("asymptote","Where does a shifted exponential level out?","Follow the direction in which the exponential term tends to zero. That is where the graph approaches its asymptote.",
                   f"For {m('y=ke^{nx}+a')} with {m(r'kn\ne0')}, the asymptote is {m('y=a')}. The y-intercept is {m('(0,k+a)')}.",
                   "The graph generally crosses the vertical axis at a different height from its horizontal asymptote.","Mark the asymptote with a dashed line and draw the curve on the correct side.",exp_graph_features,eprofile),
           Section("axis-crossing","Can a shifted exponential cross the x-axis?","Set the whole curve equal to zero. A crossing only exists when isolating the exponential term gives a strictly positive number.",
                   f"For {m('y=ke^{nx}+a')}, a crossing requires {m(r'-a/k>0')}. Taking logs then gives its exact x-coordinate.",
                   "The exponent at a crossing need not be zero. First move the vertical translation.","Check the side of the asymptote before searching for a crossing.",exp_axis_crossing),
           Section("parameters","How do the graph features recover the parameters?","Read the vertical shift from the horizontal asymptote. Subtract the shift from the y-intercept to recover the scale.",
                   f"At {m('x=0')}, the exponential is {m('e^0=1')}. The intercept is the sum of the scale and the shift.",
                   "The intercept and asymptote alone give no information about the rate in the exponent.","Keep inferred parameters separate from supplied graph features.",recover_graph_scale),
       ),curve_terms,6),
       Lesson("log-graphs","Graphs of transformed logarithms","Use argument positivity, the boundary and both intercepts to sketch y = k ln(ax + b).",(
           Section("vertical-boundary","What fixes the position of a log graph?","First find the input where the argument would be zero. The graph is on the side where the argument is positive, even if that is to the left.",
                   f"For {m(r'y=k\ln(ax+b)')}, find the domain from {m('ax+b>0')}. The equality gives the vertical asymptote.",
                   "With a negative inner coefficient the domain inequality reverses when you divide.","State the asymptote as an equation of a vertical line.",log_graph_features,lprofile),
           Section("log-intercepts","Why is the x-intercept found at argument 1?","A logarithm returns zero when the argument is the base raised to the power zero. That argument is one for every legal base.",
                   f"At the x-intercept solve {m('ax+b=1')}. For a y-intercept, check {m('x=0')} lies in the domain, then evaluate.",
                   "Setting the argument equal to zero gives the asymptote only.","Label both the crossing and the asymptote if they are visible.",log_recover),
           Section("log-direction","How do the signs change the shape?","A positive inner slope makes the argument grow as x increases. The logarithm grows with its argument, so the sign of the outside multiplier decides whether that direction is retained.",
                   f"The sign of {m('ka')} gives the direction of {m(r'y=k\ln(ax+b)')} on its domain. A positive sign gives an increasing curve.",
                   "Check both signs. Reflecting inputs and reflecting outputs have different geometric effects.","A sketch requires the valid side of the asymptote as well as the direction of the graph.",log_graph_features,extension=True),
       ),curve_terms,6,(log_graph_features,log_recover)),
       Lesson("inverse-log-exp","Inverse logarithmic and exponential functions","Find inverse rules and exchange domain with range.",(
           Section("undo-exponential","How do I invert a shifted exponential?","Name the output y, remove any translation and scale, take the logarithm and divide by the coefficient of x. Then use x as the inverse input.",
                   f"Inverting {m('y=ke^{nx}+a')} uses {m(r'x=\frac1n\ln\left(\frac{y-a}{k}\right)')}. The quotient inside ln must be positive.",
                   "Subtract the shift and divide by the scale before applying the logarithm.","Recover the inverse domain from the original range.",inverse_exp,basic),
           Section("undo-log","How do I invert a transformed logarithm?","Undo the outside scale first and apply the exponential. Solve the resulting linear equation for the original input.",
                   f"If {m(r'y=k\ln(ax+b)')}, then {m('ax+b=e^{y/k}')}. Preserve the original input restriction when giving the inverse range.",
                   "Dividing by the multiplier outside the log is different from dividing its argument.","Check the inverse outputs stay on the valid side of the original asymptote.",inverse_ln),
           Section("inverse-value","Can I evaluate the inverse without finding its whole rule?","An inverse value is the input that gave a specified output. Plug that output into the equation and solve for the input.",
                   f"To find {m('f^{-1}(c)')}, solve {m('f(x)=c')}. Where f is one-to-one, the equation has at most one solution.",
                   "The notation for an inverse function does not mean a reciprocal.","Use the original definition to check any numerical inverse value.",linked_inverse_value),
       ),(("Inverse function","The function that reverses another one-to-one function."),curve_terms[2],curve_terms[3]),8),
    ]


if __name__ == "__main__":
    build(SLUG,"Logarithmic and exponential functions",4,"logs",units(),__file__,version="1.0.1")
