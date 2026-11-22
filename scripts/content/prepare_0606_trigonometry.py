"""Author Cambridge 0606 trigonometry with exact checks in degrees and radians."""

from fractions import Fraction as F
from functools import lru_cache
from math import cos, pi, sin, tan

from sympy import Rational, cos as s_cos, latex, pi as s_pi, simplify, sin as s_sin, sqrt, tan as s_tan

from prepare_0606_discrete import Lesson, Section, build, figure, graded, inline as m, table, tex, written


CHAPTER = "trigonometry"
ARCHIVE = "E:/my folder/questions_data/0606 Additional Mathematics/09 Trigonometry.json"
B_VALUES = (F(1, 2), F(1, 3), F(3, 4), F(5, 6), F(3, 8), F(1), F(2), F(3), F(4))
NAMES = {"sin": "sine", "cos": "cosine", "tan": "tangent", "sec": "secant", "csc": "cosecant", "cot": "cotangent"}
RECIPROCALS = {"sec": "cos", "csc": "sin", "cot": "tan"}


def s_fraction(value):
    return Rational(value.numerator, value.denominator)


def math_name(name):
    return r"\operatorname{cosec}" if name == "csc" else "\\" + name


def trig(name, argument):
    return rf"{math_name(name)}\left({argument}\right)"


def sym_tex(value):
    return latex(value)


def angle_input(theta, radians):
    if not radians:
        return str(theta)
    return str(s_fraction(F(theta, 180)) * s_pi)


def angle(theta, radians=False, *, unit=True):
    if not radians:
        return tex(theta) + (r"^\circ" if unit and theta else "")
    return sym_tex(s_fraction(F(theta, 180)) * s_pi)


def domain_text(lo, hi, radians, closed=True, variable="x"):
    left = angle(lo, radians, unit=True)
    right = angle(hi, radians, unit=True)
    return m(rf"{left}\le {variable}{r'\le' if closed else '<'} {right}")


def inner(b, shift, radians, letter="x"):
    value = "" if b == 1 else tex(b)
    value += letter
    if shift:
        value += ("+" if shift > 0 else "-") + angle(abs(shift), radians)
    return value


def outer(a, f, c):
    return ("" if a == 1 else str(a)) + f + (f"+{c}" if c > 0 else str(c) if c < 0 else "")


def scaled(a, value):
    return value if a == 1 else "-" + value if a == -1 else str(a) + value


def signed(coefficient, value=""):
    if coefficient == 0:
        return ""
    return ("+" if coefficient > 0 else "-") + (str(abs(coefficient)) if abs(coefficient) != 1 or not value else "") + value


@lru_cache(maxsize=None)
def exact(name, degrees):
    theta = s_pi * s_fraction(F(degrees % 360, 180))
    sine, cosine = s_sin(theta), s_cos(theta)
    if name == "sin":
        return sine
    if name == "cos":
        return cosine
    if name == "tan":
        return None if cosine == 0 else simplify(sine / cosine)
    if name == "sec":
        return None if cosine == 0 else simplify(1 / cosine)
    if name == "csc":
        return None if sine == 0 else simplify(1 / sine)
    return None if sine == 0 else simplify(cosine / sine)


def result(title, question, value, steps, hint, method, *, shown=None, wrong=None, mark=3, label=None):
    return graded(title, question, str(value), steps, hint, method,
                  shown=m(sym_tex(value)) if shown is None else shown, wrong=wrong, mark=mark, label=label)


def roots_problem(title, question, roots, radians, steps, hint, method, *, mark=3):
    if roots:
        shown = m(r"x=" + r",\quad ".join(angle(i, radians) for i in roots))
    else:
        shown = "No solutions"
    expected = ",".join(angle_input(i, radians) for i in roots) if roots else "none"
    return graded(title, question, expected, steps, hint, method, kind="set", shown=shown,
                  label="All values of x (comma separated, in the stated unit)", mark=mark,
                  wrong=(angle_input(roots[0], radians), "You found one solution. Check the other symmetry angle and then sweep the entire interval.")
                  if len(roots) > 1 else None)


def base_roots(name, alpha):
    name = RECIPROCALS.get(name, name)
    if name == "sin":
        return {alpha % 360, (180-alpha) % 360}, 360
    if name == "cos":
        return {alpha % 360, -alpha % 360}, 360
    return {alpha % 180}, 180


def solve_phases(residues, cycle, b, shift, lo, hi, closed):
    lower, upper = b*lo+shift, b*hi+shift
    candidates = set()
    for residue in residues:
        j = (lower-residue)//cycle
        while residue+j*cycle <= upper:
            root = F(residue+j*cycle-shift,b)
            if lo <= root and (root < hi or closed and root == hi):
                candidates.add(root)
            j += 1
    return sorted(candidates)


def repeat_description(residues, cycle, radians):
    if not residues:
        return "There are no base angles that satisfy this equation."
    shown = m(r",\ ".join(angle(i, radians) for i in sorted(residues)))
    return f"Within a full period, the argument is {shown}. Repeat by adding or subtracting {m(angle(cycle,radians))}."


def to_x(b, shift, lo, hi, radians, closed=True):
    lower = angle(b*lo+shift, radians)
    upper = angle(b*hi+shift, radians)
    symbols = lower + r"\le u" + (r"\le" if closed else "<") + upper
    return f"The given interval for the full argument {m('u='+inner(b,shift,radians))} is {m(symbols)}. Solve for {m('x')} after listing the possible arguments."


def exact_angle(n, name):
    options = (0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330)
    valid = tuple(a for a in options if exact(name, a) is not None)
    a = valid[n % len(valid)]
    k = n // len(valid)
    return a + (-1 if k % 2 else 1) * 360 * ((k+1)//2)


def special(n, name="sin", *, radians=False):
    x = exact_angle(n,name)
    value = exact(name,x)
    std = x % 360
    if std % 90 == 0:
        quadrant = "The angle is on one of the axes. Read the coordinates directly from the unit circle."
    else:
        ref = min(std % 180,180-std%180)
        quadrant = f"The reference angle is {m(angle(ref,radians))}. Use the signs of the coordinates in the actual quadrant."
    expr = trig(name,angle(x,radians))
    actual = trig(name,angle(std,radians))
    method = "Reduce to one turn. Read the reference value and preserve the sign from the actual quadrant."
    return result("Read an exact trigonometric value", f"Find the exact value of {m(expr)}.", value,
        [f"After removing whole turns, evaluate {m(actual)}.", quadrant,
         f"{NAMES[name].capitalize()} has exact value {m(sym_tex(value))}."], "Mark the angle on a unit circle before deciding on its sign.", method,
        wrong=(str(-value),"The reference value has the correct magnitude. Check the sign in this quadrant.") if value != 0 else None, mark=2)


def exact_cos(n):
    return special(n+7,"cos",radians=n%2==0)


def exact_tan(n):
    return special(n+17,"tan",radians=n%2==1)


def exact_sin(n):
    return special(n+3,"sin",radians=n%2==0)


def exact_recip(n):
    return special(n+12,("sec","csc","cot")[n%3],radians=n%2==0)


def convert(n):
    theta = 15*(2+n)
    source_radians = n%2 == 1
    given = angle(theta,source_radians)
    desired = "degrees" if source_radians else "radians as a multiple of " + m(r"\pi")
    target = theta if source_radians else s_fraction(F(theta,180))*s_pi
    return result("Switch angle units", f"Convert {m(given)} to {desired}.", target,
        [f"A half-turn is both {m(r'180^\circ')} and {m(r'\pi')} radians.",
         f"Multiply by {m(r'\frac{180}{\pi}' if source_radians else r'\frac{\pi}{180}')} and simplify."],
        "Use the conversion factor that cancels the given unit.", "Use the same angle represented by a half-turn in both units.",
        shown=m(angle(theta,not source_radians)), mark=2)


def sin_from_cos(n):
    triples = ((3,4,5),(5,12,13),(8,15,17),(7,24,25),(9,40,41),(20,21,29))
    x,y,h = triples[n % len(triples)]
    q = 1 + (n//len(triples))%4
    cosine = F(x if q in (1,4) else -x,h)
    sine = F(y if q in (1,2) else -y,h)
    radians = n%2==1
    turn = 360 * (n//24)
    lo, hi = turn+90*(q-1), turn+90*q
    domain = m(angle(lo,radians)+r"<x<"+angle(hi,radians))
    return graded("Recover the other trigonometric coordinate",
        f"Given {m(r'\cos x='+tex(cosine))} and {domain}, find the exact value of {m(r'\sin x')}.",
        sine, [f"Use {m(r'\sin^2x=1-\cos^2x')}. The two square roots have the same positive magnitude.",
               f"The interval places the angle in quadrant {q}, so choose the {'positive' if sine>0 else 'negative'} value."],
        "Use the unit-circle identity to get the square, then decide the sign separately.",
        "Subtract the square of the given cosine from one and choose the sine sign from the domain.",
        wrong=(-sine,"The magnitude is right. Check whether the angle is above or below the horizontal axis."))


def graph_data(n, name="sin", base=False):
    if base:
        return (1, F(1), 0)
    return 2+n%7, B_VALUES[n%len(B_VALUES)], (n//3)%11-5


def graph_function(name,a,b,c):
    return outer(a,trig(name,inner(b,0,False)),c)


def graph_period(n, name=None):
    name = name or ("sin","cos","tan")[n%3]
    a,b,c = graph_data(n,name)
    radians = n % 2 == 1
    base = 180 if name=="tan" else 360
    period = F(base,b)
    shown = m(angle(period,radians))
    expected = angle_input(period,radians)
    return graded("Find the horizontal period",
        f"Find the period of the graph {m('y='+graph_function(name,a,b,c))} in {'radians' if radians else 'degrees'}.",
        expected, [f"One full repeat of {NAMES[name]} takes {m(angle(base,radians))} in the argument.",
                   f"The input multiplier is {m(b)}. Divide the original period by {m(b)}."],
        "Find how much the argument must change for one full repeat. Divide by its input multiplier.",
        "Divide the basic period of the stated trigonometric function by the input scale.",
        shown=shown, label="Period in the requested unit", mark=2,
        wrong=(angle_input(base,radians),"That is the period before changing the horizontal scale.") if b!=1 else None)


def graph_peak(n,name=None):
    name = name or ("sin" if n%2 else "cos")
    a,b,c = graph_data(n,name)
    top = c+a
    return graded("Read a maximum from the midline",
        f"Find the maximum value of {m('y='+graph_function(name,a,b,c))}.",
        top, [f"The midline is {m('y='+str(c))}. The amplitude is {m(a)}.",
              f"The maximum is {m(rf'{c}+{a}={top}')}."],
        "Work upwards from the midline by one amplitude.",
        "Add the amplitude to the vertical shift.",
        wrong=(a,"That is the amplitude. Add it to the value on the midline.") if c!=0 else None, mark=2)


def graph_low(n,name=None):
    name = name or ("cos" if n%2 else "sin")
    a,b,c = graph_data(n,name)
    low = c-a
    return graded("Read a minimum from the midline",
        f"Find the minimum value of {m('y='+graph_function(name,a,b,c))}.",
        low, [f"The function before shifting has minimum {m(-a)}.",
              f"The shifted minimum is {m(rf'{c}-{a}={low}')}."],
        "Work downwards from the midline by one amplitude.",
        "Subtract the amplitude from the midline value.",
        wrong=(-a,"That is the minimum before the graph moves vertically.") if c!=0 else None, mark=2)


def recover_a(n):
    a,b,c = graph_data(n)
    low, high = c-a,c+a
    return graded("Recover amplitude from two extremes",
        f"A cosine curve has minimum {m(low)} and maximum {m(high)}. Find its amplitude.",
        a, [f"The vertical distance between its extrema is {m(high-low)}.",
            f"Only half that distance is above the midline. Divide by {m(2)}."],
        "The full height covers two equal amplitude steps.",
        "Use half the difference between the maximum and minimum.",
        wrong=(2*a,"This is peak-to-trough height, which is twice the amplitude."),mark=2)


def recover_c(n):
    a,b,c = graph_data(n)
    low,high = c-a,c+a
    return graded("Recover the centre line of a wave",
        f"A sine curve has peaks of {m(high)} and troughs of {m(low)}. Find the value of its midline.",
        c, [f"The line lies halfway between {m(low)} and {m(high)}.",
            f"Average the two values to obtain {m(c)}."],
        "To get the level halfway between two values, find their mean.",
        "Average the two extreme y-values.", mark=2)


def basic_arc(n):
    name = ("sin","cos","tan")[n%3]
    radians = n%2==1
    x = exact_angle(n+12,name)
    value = exact(name,x)
    return result("Read a point on a basic graph",
        f"The graph is {m('y='+trig(name,'x'))}. Find its exact ordinate at {m('x='+angle(x,radians))}.",
        value, [f"Move along the horizontal axis to the given angle. The repeat distance is {m(angle(180 if name=='tan' else 360,radians))}.",
                f"Reducing the input to one cycle gives the ordinate {m(sym_tex(value))}."],
        "Start with the angle and read up or down to the curve.", "Use the period and reference angle to find the y-value.", mark=2)


def intercepts(n):
    name = ("sin","cos","tan")[n%3]
    a,b,c = graph_data(n,name)
    radians = n%2==0
    lo = F(-(n//9)*90,b)
    hi = lo+F((2+n%3)*180,b)
    if name=="cos":
        residues,cyc = {90,270},360
    else:
        residues,cyc = {0},180
    roots = solve_phases(residues,cyc,b,0,lo,hi,True)
    return roots_problem("Find the x-intercepts",
        f"Find all x-intercepts of {m('y='+outer(a,trig(name,inner(b,0,False)),0))} for {domain_text(lo,hi,radians)}. Give the x-coordinates.",
        roots,radians,[f"A non-zero scale {m(a)} leaves the zeros unchanged.",
                       repeat_description(residues,cyc,radians),to_x(b,0,lo,hi,radians)],
        "Set the y-value to zero and solve for the angle inside the function.",
        "Find the zeros of the underlying function, repeat across the interval and then undo the angle multiplier.")


def asymptote(n, shared=False):
    a,b,c = graph_data(n,"tan")
    radians = n%2==1 if shared else n%2==0
    lo = F(0) if shared else F(-(n//9)*90,b)
    hi = F(180*(1+n%2),b) if shared else lo + F(360+90*(n%3),b)
    roots = solve_phases({90},180,b,0,lo,hi,True)
    return roots_problem("Label the vertical asymptotes",
        f"Give the x-coordinates of all vertical asymptotes of {m('y='+graph_function('tan',a,b,c))} "
        f"for {domain_text(lo,hi,radians)}.",roots,radians,
        ["The graph is undefined where the cosine of the argument is zero.",
         repeat_description({90},180,radians),to_x(b,0,lo,hi,radians)],
        "Find where the cosine in the denominator vanishes. The vertical shift does not alter these x-coordinates.",
        "Solve for the odd multiples of a quarter-turn in the argument and keep the right interval.")


def modulus_data(n,name):
    a,b,c = graph_data(n,name)
    if name=="tan":
        return a,b,0 if n%3 else -a
    a += a%2
    return a,b,0 if n%3 else -a//2


def modulus_value(n):
    name = ("sin","cos","tan")[n%3]
    a,b,c = modulus_data(n,name)
    radians = n%2==1
    u = exact_angle(n+25,name)
    x = F(u,b)
    f = simplify(a*exact(name,u)+c)
    value = abs(f)
    return result("Reflect a negative ordinate",
        f"Find the exact value of {m(r'\left|'+graph_function(name,a,b,c)+r'\right|')} when {m('x='+angle(x,radians))}.",
        value,[f"The unreflected argument is {m(angle(u,radians))}. This gives an ordinate of {m(sym_tex(f))}.",
               "A modulus keeps a non-negative ordinate and makes a negative ordinate positive."],
        "Apply the modulus after evaluating the scaled and shifted trigonometric expression.",
        "Evaluate the original signed ordinate and take its absolute value.",
        wrong=(str(f),"This is the unreflected value. The modulus moves that point above the axis.") if f<0 else None,
        mark=2)


def sketch(n,name="sin",modulus=False):
    a,b,c = graph_data(n,name)
    if modulus:
        a,b,c = modulus_data(n,name)
    radians = n%2==1
    period = F(180 if name=="tan" else 360,b)
    expr = graph_function(name,a,b,c)
    if modulus:
        expr = r"\left|" + expr + r"\right|"
    lo,hi = F(0),period*(1+n%2)
    if name=="tan":
        inner_landmarks = (0,45,135,180)
    else:
        inner_landmarks = (0,90,180,270,360)
    repeat = int(hi/period)
    phases = {phase+j*(180 if name=="tan" else 360) for phase in inner_landmarks for j in range(repeat)}
    if modulus:
        alpha = {"sin":0,"cos":90,"tan":0}[name] if c==0 else {"sin":30,"cos":60,"tan":45}[name]
        residues,cycle=base_roots(name,alpha)
        zeros=solve_phases(residues,cycle,b,0,lo,hi,True)
        phases.update(x*b for x in zeros)
    raw = sorted(phases)
    labels = []
    for phase in raw:
        val = a*exact(name,phase)+c
        labels.append(r"\left("+angle(F(phase,b),radians)+","+sym_tex(abs(val) if modulus else val)+r"\right)")
    landmarks = m(r",\ ".join(labels))
    poles = solve_phases({90},180,b,0,lo,hi,True) if name=="tan" else []
    extras = f"Draw and label asymptotes at {m('x='+r',\ '.join(angle(x,radians) for x in poles))}. " if poles else ""
    drawn = "Reflect the part below the horizontal axis. The zeros stay on the axis." if modulus else "Join the landmarks with the expected smooth curves."
    if name=="tan":
        drawn += " Draw each branch separately on its own side of an asymptote."
    requirement = " Include all asymptotes." if name=="tan" else " Label the maximum and minimum values."
    if modulus and name!="tan":
        minimum = 0 if abs(c)<=a else abs(c)-a
        range_detail = f"The unreflected range is {m('['+str(c-a)+','+str(c+a)+']')}. After reflection the minimum is {m(minimum)} and the maximum is {m(a+abs(c))}."
    else:
        range_detail = f"The unreflected range is {m('['+str(c-a)+','+str(c+a)+']')}." if name!="tan" else "Tangent is unbounded along its asymptotes."
    return written("Sketch the transformed curve",
        f"Sketch {m('y='+expr)} for {domain_text(lo,hi,radians)}.{requirement}",
        f"Sketch through {landmarks}. {extras}{drawn}",
        [f"The unreflected curve repeats after {m(angle(period,radians))} and its vertical shift is {m(c)}.",
         f"Use the following sketch points: {landmarks}.",
         f"{extras}{range_detail} {drawn}"],
        "Mark the effect of the angle multiplier first. Apply the vertical scale and shift to the basic curve values.",
        "Locate the main points in the correct horizontal positions.", mark=4,
        criterion="Show the correct shape, and label the required extrema or asymptotes.")


def equation_data(n,name):
    angles = {"sin": (30,45,60,120,210,225,240,270,90,0),
              "cos": (30,45,60,120,135,150,90,0,180,270),
              "tan": (0,30,45,60,120,135,150),
              "sec": (30,45,60,120,135,150,0,180),
              "csc": (30,45,60,210,225,240,90,270),
              "cot": (30,45,60,120,135,150,90)}
    a = angles[name][n%len(angles[name])]
    b = B_VALUES[n%len(B_VALUES)]
    shift = 15*(n%7-3)
    lo = -15*(n//9)
    hi = lo + F(360+90*(n%3),b)
    return a,b,shift,lo,hi


def eq_linear(n,name=None):
    name = name or ("sin","cos","tan")[n%3]
    alpha,b,shift,lo,hi = equation_data(n,name)
    radians = n%2==1
    closed = n%3!=0
    base,cycle = base_roots(name,alpha)
    roots = solve_phases(base,cycle,b,shift,lo,hi,closed)
    a,c = 2+n%5,n%5-2
    init = exact(name,alpha)
    target = simplify(a*init+c)
    inp = inner(b,shift,radians)
    first = f"Subtract the constant and divide by the coefficient to obtain {m(trig(name,'u')+'='+sym_tex(init))}."
    if name in RECIPROCALS:
        reciprocal = RECIPROCALS[name]
        if name=="cot" and init==0:
            first += f" Since {m(r'\cot u=\frac{\cos u}{\sin u}')} is zero here, its numerator must vanish."
        else:
            first += f" Use the reciprocal to solve {m(trig(reciprocal,'u')+'='+sym_tex(simplify(1/init)))}."
    return roots_problem("Find every solution in the domain",
        f"Solve {m(outer(a,trig(name,inp),c)+'='+sym_tex(target))} for {domain_text(lo,hi,radians,closed)}. Give exact answers.",
        roots,radians,[first,to_x(b,shift,lo,hi,radians,closed),repeat_description(base,cycle,radians)],
        "Isolate the trigonometric function. Find the base angles before mapping back from the full argument to x.",
        "Isolate the trigonometric function or its reciprocal and identify all its base angles in one period.",mark=4)


def eq_sin(n):
    return eq_linear(n,"sin")


def eq_cos(n):
    return eq_linear(n,"cos")


def eq_tan(n):
    return eq_linear(n,"tan")


def eq_recip(n):
    return eq_linear(n,("sec","csc","cot")[n%3])


def decimal_angle(n):
    from math import atan, degrees
    ratio = F(3*n+2,2*n+5)
    lo = -20*(n%4)
    hi = lo+360
    exact_base = degrees(atan(float(ratio)))
    true = [exact_base+180*k for k in range(-3,5) if lo<=exact_base+180*k<hi]
    roots = [F(str(round(x,1))) for x in true]
    tgt = tex(ratio)
    result_list = r",\ ".join(rf"{float(a):.1f}^\circ" for a in roots)
    q = roots_problem("Use a calculator for a non-special angle",
        f"Solve {m(r'\tan x='+tgt)} for {domain_text(lo,hi,False,False)}. Give answers to one decimal place.",
        roots,False,[f"In degree mode, inverse tangent gives the first argument {m(rf'{exact_base:.4f}^\circ')}.",
                     f"Use the repeat distance {m(angle(180))} to find the other possible arguments before rounding."],
        "Check the calculator is in degree mode. Find the base angle, repeat by half-turns and round at the end.",
        "Find the inverse tangent, list its half-turn repeats in the domain and round to one decimal place.",mark=3)
    q.answer = m("x="+result_list)
    q.field["label"] = "All degree values to one decimal place, separated by commas"
    return q


def missing_square(n):
    name = ("sin","tan","cot")[n%3]
    base = (30,45,60,120,135,150)[n%6] + 180*(n//6)
    value = exact(name,base)
    if name=="sin":
        partner, answer, ident = "cos", simplify(1-value**2), r"\cos^2u=1-\sin^2u"
    elif name=="tan":
        partner, answer, ident = "sec", simplify(1+value**2), r"\sec^2u=1+\tan^2u"
    else:
        partner, answer, ident = "csc", simplify(1+value**2), r"\operatorname{cosec}^2u=1+\cot^2u"
    return result("Use an identity to find a squared value",
        f"It is known that {m('u='+angle(base,n%2==1))} and {m(trig(name,'u')+'='+sym_tex(value))}. "
        f"Find {m(math_name(partner)+r'^2u')}.",
        answer, [f"Use {m(ident)}.",f"Square {m(sym_tex(value))} before substituting it. The square removes any negative sign."],
        "Choose the identity containing the given squared function and the target.",
        "Choose the corresponding squared identity and substitute the given exact value.",mark=2)


def reciprocal_domain(n):
    name = ("sec","csc","cot")[n%3]
    a,b,shift,lo,hi = equation_data(n+4,name)
    radians = n%2==1
    if name=="sec":
        residues,cycle = {90},180
        denominator = r"\cos u"
    else:
        residues,cycle = {0},180
        denominator = r"\sin u"
    roots = solve_phases(residues,cycle,b,shift,lo,hi,False)
    return roots_problem("Find the excluded inputs",
        f"For which values of {m('x')} is {m(trig(name,inner(b,shift,radians)))} undefined on {domain_text(lo,hi,radians,False)}?",
        roots,radians,[f"The denominator of this expression is {m(denominator)}.",
                       to_x(b,shift,lo,hi,radians,False),repeat_description(residues,cycle,radians)],
        "Write the reciprocal or quotient as a fraction. Set the denominator equal to zero.",
        "Identify zeros of the denominator and map them from the argument interval to the x-interval.")


def equation_sq(n):
    name = "sin" if n%2 else "cos"
    alpha = 30 if n%4<2 else 60
    r = exact(name,alpha)
    a,b,shift,lo,hi = equation_data(n+3,name)
    radians = n%2==0
    residues,cycle = base_roots(name,alpha)
    more,_ = base_roots(name,(alpha+180)%360)
    residues.update(more)
    roots = solve_phases(residues,cycle,b,shift,lo,hi,False)
    coeff = 2+n%5
    argument = inner(b,shift,radians)
    expr = rf"{coeff}{math_name(name)}^2\left({argument}\right)"
    target = simplify(coeff*r**2)
    return roots_problem("A squared equation has two signs",
        f"Solve {m(expr+'='+sym_tex(target))} for {domain_text(lo,hi,radians,False)}. Give exact answers.",roots,radians,
        [f"Divide by {m(coeff)} and take both square roots. The function equals {m(r'\pm '+sym_tex(r))}.",
         to_x(b,shift,lo,hi,radians,False),repeat_description(residues,cycle,radians)],
        "Taking the square root creates a positive and negative case. Find the angles for both before testing bounds.",
        "Recover both possible values of the trigonometric function and list their angles.",mark=4)


def equation_factor(n):
    name = "sin" if n%2 else "cos"
    alpha = (30,60,120,150)[n%4]
    r = exact(name,alpha)
    a,b,shift,lo,hi = equation_data(n+6,name)
    radians = n%2==1
    f = trig(name,inner(b,shift,radians))
    if name=="sin":
        zero = {0,180}
    else:
        zero = {90,270}
    residues,cycle = base_roots(name,alpha)
    residues.update(zero)
    roots = solve_phases(residues,cycle,b,shift,lo,hi,True)
    coeff=Rational(2) if r.is_Rational else Rational(4)
    q_expr = scaled(int(coeff),math_name(name)+r"^2\left("+inner(b,shift,radians)+r"\right)")
    r_ = simplify(-coeff*r)
    left = q_expr + ("+" if r_>0 else "-") + (sym_tex(abs(r_)) if abs(r_)!=1 else "") + f
    return roots_problem("Keep the zero factor",
        f"Solve {m(left+'=0')} for {domain_text(lo,hi,radians)}. Give exact answers.",roots,radians,
        [f"Let {m('v='+f)}. The left-hand side is {m(sym_tex(coeff)+r'v\left(v'+('+' if -r>0 else '-')+sym_tex(abs(r))+r'\right)')}.",
         f"Set each factor to zero. The two function values are {m(r'0,\ '+sym_tex(r))}.",
         to_x(b,shift,lo,hi,radians),repeat_description(residues,cycle,radians)],
        "Move all terms to one side and factor. Do not divide by the trigonometric function without testing whether it is zero.",
        "Factor in a single trigonometric function and find angle values for each factor.",mark=4)


def equation_recip_square(n):
    use_sec = n%2==0
    f_name,g_name = ("sec","tan") if use_sec else ("csc","cot")
    alpha = (30,45,60)[n%3]
    r = exact(g_name,alpha)
    a,b,shift,lo,hi = equation_data(n+7,f_name)
    residues,cycle = base_roots(g_name,alpha)
    more,_ = base_roots(g_name,-alpha)
    residues.update(more)
    radians = n%3==0
    arg = inner(b,shift,radians)
    roots = solve_phases(residues,cycle,b,shift,lo,hi,False)
    coeff = 2+n%4
    target = simplify(coeff*(1+r**2))
    first = rf"{math_name(f_name)}^2u=1+{math_name(g_name)}^2u"
    return roots_problem("Change a squared reciprocal into a simpler function",
        f"Solve {m(rf'{coeff}{math_name(f_name)}^2\left({arg}\right)='+sym_tex(target))} for {domain_text(lo,hi,radians,False)}.",
        roots,radians,[f"Use {m(first)}.",
                       f"Rearranging gives {m(math_name(g_name)+r'^2u='+sym_tex(r**2))}. Keep both signs for the function.",
                       to_x(b,shift,lo,hi,radians,False),repeat_description(residues,cycle,radians)],
        "Use the reciprocal Pythagorean identity. Check both signs of the resulting basic trigonometric value.",
        "Use the appropriate squared identity before finding all base angles and periods.",mark=4)


def equation_tan_cot(n):
    r2 = (F(1,3),F(1),F(3))[n%3]
    alpha = (30,45,60)[n%3]
    k = 2+n%7
    a,c = k*r2.numerator, k*r2.denominator
    _,b,shift,lo,hi = equation_data(n+7,"tan")
    radians = n%2==0
    arg=inner(b,shift,radians)
    residues,cycle = {alpha,180-alpha},180
    roots=solve_phases(residues,cycle,b,shift,lo,hi,True)
    return roots_problem("Relate tangent and cotangent before solving",
        f"Solve {m(scaled(a,trig('cot',arg))+'='+scaled(c,trig('tan',arg)))} for {domain_text(lo,hi,radians)}.",
        roots,radians,[f"Both sine and cosine of the argument must be non-zero, so {m(r'\cot u=\frac{1}{\tan u}')} can be used.",
                       f"Multiplying by {m(r'\tan u')} gives {m(r'\tan^2u='+tex(r2))}. Keep both square roots.",
                       repeat_description(residues,cycle,radians),to_x(b,shift,lo,hi,radians)],
        "You can multiply by tangent only on the common domain. Find the angles for both square-root signs.",
        "Rewrite cotangent as the reciprocal of tangent and solve the squared equation on the common domain.",mark=4)


def equation_tan_quadratic(n):
    alpha,b,shift,lo,hi=equation_data(n+7,"tan")
    radians=n%2==1
    arg=inner(b,shift,radians)
    q=2+n%5
    # tan u has the two rational roots 0 and sign(1); use a sec-squared term for a useful first step.
    root=-1 if n%3==0 else 1
    v="u"
    residues,cycle={0,45 if root==1 else 135},180
    roots=solve_phases(residues,cycle,b,shift,lo,hi,False)
    left=rf"{q}\sec^2\left({arg}\right)"+signed(-q*root,trig("tan",arg))
    return roots_problem("Choose one trigonometric unknown",
        f"Solve {m(left+'='+str(q))} for {domain_text(lo,hi,radians,False)}.",
        roots,radians,[f"Replace {m(r'\sec^2u')} with {m(r'1+\tan^2 u')}. The constant terms cancel.",
                       f"Let {m(r'v=\tan u')}. The remaining equation is {m(rf'{q}v(v'+signed(-root)+r')=0')}, so the values are {m('0,'+str(root))}.",
                       to_x(b,shift,lo,hi,radians,False),repeat_description(residues,cycle,radians)],
        "Convert both terms to the same function. Keep the factor that gives a zero tangent.",
        "Use the squared identity, factor the resulting quadratic and map both roots to the angle interval.",mark=4)


def identity_constant(n):
    scale=2+n
    b=B_VALUES[n%len(B_VALUES)]
    u = inner(b,0,False)
    expr = rf"{scale}\left(\sec^2\left({u}\right)-\tan^2\left({u}\right)\right)"
    return graded("Recognise a constant trigonometric expression",
        f"Find the constant value of {m(expr)} throughout its domain.",scale,
        [f"{m(r'1+\tan^2u=\sec^2u')} holds where {m(r'\cos u\ne0')}.",
         "Subtract the squared tangent term. The factor in brackets is one."],
        "Look for the difference between a squared reciprocal and its related squared function.",
        "Rearrange the secant identity and multiply by the outside factor.",mark=2)


def identity_matrix(n):
    k, c=2+n, F(n%5+1,2)
    angle_sym=inner(B_VALUES[n%len(B_VALUES)],0,False)
    sine = r"\sin^2\left("+angle_sym+r"\right)"
    cosine = r"\cos^2\left("+angle_sym+r"\right)"
    tangent = r"\tan^2\left("+angle_sym+r"\right)"
    secant = r"\sec^2\left("+angle_sym+r"\right)"
    expr = rf"\frac{{{secant}-{tangent}}}{{{k}}}+{tex(c)}\left({sine}+{cosine}\right)"
    value=F(1,k)+c
    return graded("Use two identities independently",
        f"Find the constant value of {m(expr)} throughout its domain.",value,
        [f"Use {m(r'\sec^2u-\tan^2u=1')} to simplify the numerator.",
         f"Use {m(r'\sin^2u+\cos^2u=1')} to simplify the product.",
         f"The final value is {m(tex(F(1,k))+'+'+tex(c)+'='+tex(value))}."],
        "Treat the numerator and the second pair as two different Pythagorean identities.",
        "Apply both Pythagorean identities and combine the resulting constants.",mark=3)


def proof_product(n, quick=False):
    k=2+n%9
    arg=inner(B_VALUES[n%len(B_VALUES)],15*(n//9),n%2==1)
    f,g = (trig("sec",arg),trig("tan",arg)) if n%2==0 else (trig("csc",arg),trig("cot",arg))
    restrict = r"\cos" if n%2==0 else r"\sin"
    first=rf"({scaled(k,f)}+{scaled(k,g)})({scaled(k,f)}-{scaled(k,g)})"
    target=str(k*k)
    answer = f"The product equals {m(target)}, provided {m(restrict+r'\left('+arg+r'\right)\ne0')}."
    steps = ["Multiply the conjugate brackets using the difference of two squares.",
         f"Factor out {m(k*k)}. The remaining difference is one by the {'secant and tangent' if n%2==0 else 'cosecant and cotangent'} identity.",
         f"Both terms in the original brackets have denominator {m(restrict+r'\left('+arg+r'\right)')}. Exclude its zeros."]
    hint="Name the repeated argument u. Expand the two conjugate brackets before choosing an identity."
    method="Use the difference of two squares and extract the common squared coefficient."
    if quick:
        return graded("Find the constant in a conjugate identity",
            f"The product {m(first)} is constant throughout its domain. Find that constant.",
            k*k,steps,hint,method,shown=m(target),wrong=(k,"The common coefficient is squared when multiplying the two brackets."))
    return written("Prove a relationship using conjugates",
        f"Prove that {m(first+r'\equiv '+target)} wherever the left-hand side is defined. State the restriction on the argument.",
        answer,steps,hint,method,mark=4,
        criterion="State the exclusion from the denominator of the original expression.")


def proof_fraction(n, quick=False):
    a=2+n%7
    u=inner(B_VALUES[n%len(B_VALUES)],15*(n//8),n%2==1)
    is_sec=n%2==0
    f,g,h,d=(trig("sec",u),trig("cos",u),trig("tan",u),trig("sin",u)) if is_sec else (
        trig("csc",u),trig("sin",u),trig("cot",u),trig("cos",u))
    numerator=rf"{scaled(a,f)}-{scaled(a,g)}"
    # The squared trig term is written with its exponent before the argument.
    gname="cos" if is_sec else "sin"
    dname="sin" if is_sec else "cos"
    square=lambda name: rf"{math_name(name)}^2\left({u}\right)"
    mid=rf"\frac{{{a}(1-{square(gname)})}}{{{g}}}"
    second=rf"\frac{{{a}{square(dname)}}}{{{g}}}"
    target=scaled(a,d)
    left=rf"\frac{{{numerator}}}{{{h}}}"
    answer = f"The expression is {m(target)} when both {m(trig('sin',u))} and {m(trig('cos',u))} are non-zero."
    steps=[f"Write the reciprocal in terms of sine or cosine. The numerator becomes {m(mid)}.",
         f"The Pythagorean identity gives {m(second)}.",
         f"Write {m(h)} as {m(r'\frac{'+d+r'}{'+g+r'}')} and cancel the common factors.",
         "Both the original reciprocal and the divisor must be defined. The divisor also cannot be zero."]
    hint="Begin with the side containing the quotient. Rewrite the numerator and the divisor before cancelling."
    method="Express the numerator as a fraction with one trigonometric denominator."
    if quick:
        return graded("Find the coefficient in a quotient identity",
            f"The expression {m(left)} simplifies to {m('k'+d)} on its domain. Find {m('k')}.",
            a,steps,hint,method,shown=m(a))
    return written("Prove a fractional trigonometric identity",
        f"Prove that {m(left+r'\equiv '+target)}. State any restrictions on the sine and cosine of the argument.",
        answer,steps,hint,method,mark=5,
        criterion="Keep both original denominator restrictions after simplifying.")


def conjugate_value(n):
    return proof_product(n,quick=True)


def quotient_coefficient(n):
    return proof_fraction(n,quick=True)


def pair_exam(title, *functions, linked=False):
    def model(n,index,variant):
        return title, tuple(function(n+j*(0 if linked else index+5)) for j,function in enumerate(functions))
    return model


def sketch_sine(n):
    return sketch(n,"sin")


def sketch_cosine(n):
    return sketch(n,"cos")


def sketch_tangent(n):
    return sketch(n,"tan")


def sketch_mod(n):
    return sketch(n,("sin","cos","tan")[n%3],True)


def sine_extrema_exam(n,index,variant):
    return "Read extrema before drawing the sine graph", (graph_peak(n,"sin"),graph_low(n,"sin"),sketch_sine(n))


def cosine_graph_exam(n,index,variant):
    return "Draw a transformed cosine curve", (graph_period(n,"cos"),sketch_cosine(n))


def tangent_graph_exam(n,index,variant):
    return "Locate and label tangent asymptotes", (asymptote(n,True),sketch_tangent(n))


def trig_figures():
    blue, red, grey, green = "#12729a", "#ba482a", "#536c83", "#278168"
    style = '<g fill="#18324b" font-family="system-ui,sans-serif" font-size="17" font-weight="650">'
    grid = '<path d="M41 142H360M190 30V251" stroke="'+grey+'" stroke-width="2" fill="none"/>'
    unit_circle = figure(CHAPTER,"unit-circle-coordinates",
        "Cosine is the horizontal coordinate and sine is the vertical coordinate. Here cosine is negative and sine is positive.",
        "Unit circle with an arrow in the second quadrant and dotted projections to its negative horizontal and positive vertical components.",
        grid + '<circle cx="190" cy="142" r="98" fill="none" stroke="'+grey+'" stroke-width="2"/>'
        '<path d="M190 142L133 62" stroke="'+blue+'" stroke-width="4"/>'
        '<path d="M133 142V62H190" stroke="'+blue+'" stroke-width="2" fill="none" stroke-dasharray="5 5"/>'
        '<circle cx="133" cy="62" r="6" fill="'+blue+'"/>'
        + style + '<text x="93" y="51">Point P</text><text x="65" y="168">cosine</text>'
        '<text x="200" y="67">sine</text><text x="346" y="166">x</text><text x="200" y="37">y</text></g>',392,270)
    plot_width=415
    px=lambda angle: 39+angle*336/360
    py=lambda y: 137-y*55
    line=lambda values,col,width=3: (
        '<path d="' + " ".join(f"{'M' if i==0 else 'L'}{px(x):.2f} {py(y):.2f}" for i,(x,y) in enumerate(values))
        + f'" fill="none" stroke="{col}" stroke-width="{width}" stroke-linecap="round"/>')
    chart = '<path d="M36 17V240M22 137H393" stroke="'+grey+'" stroke-width="1.8" fill="none"/>'
    for x in range(0,361,90):
        chart += f'<path d="M{px(x)} 137v5" stroke="{grey}" stroke-width="2"/>'
    ticks = style + "".join(f'<text x="{px(x)-15:.1f}" y="259">{x}°</text>' for x in (0,90,180,270,360)) + "</g>"
    basic = figure(CHAPTER,"sine-cosine-landmarks","Sine (blue) starts at zero. Cosine (orange) starts at its maximum.",
        "Sine and cosine graphs across one turn, with ticks every quarter turn.",
        chart + line([(x,sin(x*pi/180)) for x in range(361)],blue)
        + line([(x,cos(x*pi/180)) for x in range(361)],red) + ticks
        + style + f'<text x="47" y="42" fill="{red}">cosine</text><text x="135" y="74" fill="{blue}">sine</text></g>',
        plot_width,275)
    waves = figure(CHAPTER,"two-cycles-midline","Doubling the angle creates two cycles. The shifted blue curve oscillates either side of its dotted midline.",
        "Comparison of basic sine and a sine wave with twice the frequency, a larger amplitude and a shifted midline.",
        chart + f'<path d="M38 {py(.42)}H380" stroke="{blue}" stroke-width="2" stroke-dasharray="6 5"/>'
        + line([(x,.65*sin(x*pi/180)) for x in range(361)],grey,2)
        + line([(x,1.25*sin(2*x*pi/180)+.42) for x in range(361)],blue,3)
        + '<path d="M351 92V108" stroke="#12729a" stroke-width="1.5"/>' + ticks
        + style + f'<text x="286" y="88" fill="{blue}">new midline</text></g>',plot_width,275)
    chart = '<path d="M36 38V231M22 137H393" stroke="'+grey+'" stroke-width="1.8" fill="none"/>'
    poles = "".join(f'<path d="M{px(x)} 25V235" stroke="{grey}" stroke-width="1.7" stroke-dasharray="5 5"/>' for x in (90,270))
    tangent = figure(CHAPTER,"tangent-asymptotes",
        "The tangent curve approaches a vertical asymptote from either side. Leave a gap between branches.",
        "Three tangent branches, separated at the dashed vertical lines at 90 and 270 degrees.",
        chart + poles + "".join(line([(x,tan(x*pi/180)*.5) for x in range(a,b)],blue) for a,b in ((0,73),(106,253),(286,361))) + ticks,
        plot_width,275)
    reflection = figure(CHAPTER,"sine-modulus",
        "The blue graph is the original sine. The orange curve shows only the part reflected above the horizontal axis.",
        "Sine curve with its negative half-cycle reflected upward in orange.",
        chart + line([(x,sin(x*pi/180)) for x in range(361)],blue)
        + line([(x,-sin(x*pi/180)) for x in range(180,361)],red) + ticks,
        plot_width,275)
    level = figure(CHAPTER,"cosine-level-crossings",
        "A horizontal line at the requested level marks every solution in a period of cosine.",
        "One cosine cycle is crossed by a horizontal line at half the amplitude. Both intersections are marked.",
        chart + line([(x,cos(x*pi/180)) for x in range(361)],blue)
        + f'<path d="M39 {py(.5)}H375" stroke="{green}" stroke-width="2" stroke-dasharray="6 5"/>'
        + "".join(f'<circle cx="{px(x)}" cy="{py(.5)}" r="5" fill="{green}"/>' for x in (60,300)) + ticks,
        plot_width,275)
    return unit_circle,basic,waves,tangent,reflection,level


def main():
    unit_circle,basic,waves,tangent,reflection,level = trig_figures()
    descriptions=table(("Function", "Full period in degrees", "Full period in radians"),
        (("Sine or cosine",m(r"360^\circ"),m(r"2\pi")),("Tangent",m(r"180^\circ"),m(r"\pi"))))
    lessons = (
        Lesson("exact-values","Angles and exact trigonometric values",
            "Use the unit circle to find the value and sign of sine, cosine and tangent in degrees or radians.",(
            Section("unit-circle","How does an angle become a point on a circle?",
                f"Start from the positive horizontal axis. The point reached on a unit circle is {m(r'(\cos x,\sin x)')}.",
                "Imagine a stick of length one rotating about the origin. Looking at its tip, read the signed horizontal position first and the signed vertical position second. "
                "The horizontal entry gives cosine and the vertical entry gives sine. Angles drawn anticlockwise are positive. Angles drawn clockwise are negative. "
                f"Add or subtract {m(r'360^\circ')} to bring an angle to a familiar direction without moving its final point.",
                "Both legs of an ordinary triangle have positive lengths. Coordinates in other quadrants can be negative, so the trig values can also be negative.",
                (exact_sin,exact_cos),unit_circle),
            Section("reference","How can special triangles give exact values?",
                f"A reference angle is the small positive angle between the final direction and the horizontal axis. Use the special triangles for {m(r'30^\circ,45^\circ,60^\circ')}.",
                f"For {m(r'45^\circ')}, equal legs and Pythagoras give a hypotenuse {m(r'\sqrt2')} times a leg. "
                f"For {m(r'30^\circ')} and {m(r'60^\circ')}, split an equilateral triangle in half. The short leg, long leg and hypotenuse have ratio {m(r'1:\sqrt3:2')}. "
                "The triangle supplies the size. Read the sign from the actual quadrant. With a point on an axis, read its coordinates from the circle instead of drawing a triangle.",
                f"The tangent is the quotient {m(r'\frac{\sin x}{\cos x}')}. Avoid reversing the ratio.",(exact_tan,exact_cos)),
            Section("radians","Which unit am I working in?",
                f"A half-turn can be named {m(r'180^\circ')} or {m(r'\pi')} radians. The rotation and trig value are unchanged.",
                "Check the unit stated in the question before entering an angle on a calculator. To move from degrees to radians, multiply by pi and divide by 180. "
                "To move back, reverse the conversion. Keep a radian answer in terms of pi when the question asks for exact values. "
                "The same quadrants and signs still apply. A negative angle can also be moved forward by whole turns.",
                "An angle measured in radians does not carry the degree symbol. In a mixed comparison, convert both angles before deciding which is larger.",
                (convert,sin_from_cos)),
        ),(("Unit circle","The circle of radius one centred at the origin."),("Reference angle","The acute angle to the horizontal axis in a quadrant."),("Radian","Angle unit in which one turn is "+m(r"2\pi")+".")),
        17,(pair_exam("Use a unit circle for two exact values",exact_sin,exact_cos,exact_tan),
            pair_exam("Compare radians, reference angles and signs",convert,exact_sin),
            pair_exam("Use an exact trigonometric coordinate",sin_from_cos,exact_tan)),
        "Leave exact values in fractions or surds. Use angle units only on angles."),
        Lesson("periodic-graphs","Basic graphs and periodicity",
            "Draw and read sine, cosine and tangent, including their zeros, repeats and differences.",(
            Section("landmarks","Where should I begin a trig sketch?",
                "Mark the values at quarter turns first. The sine graph starts at zero and the cosine graph starts at its maximum.",
                "Draw a horizontal angle axis and a vertical value axis. Use evenly spaced quarter-turn marks. Follow the unit-circle coordinates through one turn to plot the first curve. "
                "For sine, the coordinate goes up, back to zero, down and back to zero. For cosine, the coordinate starts at the right-hand edge of the circle, which gives its maximum. "
                "Join the plotted points with a smooth curve and use a ruler for the axes.",
                "A sine graph starting at its maximum has the cosine starting point. Read the name before drawing.",
                (basic_arc,exact_sin),basic),
            Section("repeat","What does one period look like?",
                "The period is the smallest positive horizontal distance that gives the same complete shape again.",
                f"Choose matching points facing the same direction. Two successive rising zeros of sine are one whole cycle apart. A rising zero and the next falling zero are separated by only half a cycle. "
                f"In a formula with a scaled angle, start from the basic period and divide by the angle multiplier.</p>{descriptions}<p>",
                "Two identical y-values can lie on different parts of the same cycle. Check the local direction or a matching peak.",
                (graph_period,basic_arc)),
            Section("tangent","Why does tangent leave gaps?",
                f"Tangent is {m(r'\frac{\sin x}{\cos x}')}. The curve is undefined where cosine is zero and repeats every half-turn.",
                "Use the denominator to find an asymptote. Draw a dashed vertical line there before sketching the curve. Between two asymptotes, tangent runs through all real values. "
                "Through its zeros the curve rises, on both sides of a quarter-turn it approaches different ends of the y-axis, and across the asymptote it breaks. "
                "For sine and cosine a scale changes the height, but for tangent there is no greatest or least y-value.",
                "Do not join tangent across an asymptote. The angle there has no value of tangent.",
                (asymptote,intercepts),tangent),
        ),(("Period","Smallest positive horizontal shift through which the graph repeats."),("Tangent","Sine divided by cosine on its domain."),("Vertical asymptote","A vertical line the curve approaches as its values grow without bound.")),
        13,(pair_exam("Read a graph from two different landmarks",basic_arc,intercepts),
            pair_exam("Compare period and vertical asymptotes",graph_period,asymptote),
            pair_exam("Check sine, cosine and tangent values",basic_arc,exact_tan,exact_cos)),
        "Label the angle units on your horizontal axis before adding quarter-turn marks."),
        Lesson("scaled-waves","Transforming sine and cosine graphs",
            "Sketch a scaled and shifted wave, read its range and recover amplitude, midline and period.",(
            Section("height","How do height and midline work together?",
                f"For {m(r'y=a\sin(bx)+c')} with positive {m('a')}, the extrema are {m(r'c-a')} and {m(r'c+a')}. The cosine version follows the same rule.",
                "Put a dotted line at y equal to the vertical shift. This is the centre of the wave. The amplitude is the step from the centre to a peak or a trough. "
                "If the maximum and minimum are given instead, their mean gives the midline and half their difference gives the amplitude. "
                "This also tells you how to find a missing vertical scale from a graph.",
                "The amplitude is half the full vertical height. The highest y-value also includes the midline shift.",
                (graph_peak,recover_a),waves),
            Section("speed","How do I move the quarter-turn landmarks?",
                f"The inside multiplier {m('b')} controls the horizontal scale. A complete sine or cosine cycle takes {m(r'\frac{360^\circ}{b}')} or {m(r'\frac{2\pi}{b}')} for positive {m('b')}.",
                "Use the expression inside the brackets for the angles on the usual wave. Solve a short equation for the x-coordinate of each point. "
                "For a sketch, begin with the ends of one cycle and divide that distance into four equal parts. Scale the ordinate and apply the vertical shift. "
                "If the domain ends in the middle of a cycle, sketch only the part requested.",
                f"An inside multiplier greater than one makes the wave reach the usual argument sooner. Divide the old period by {m('b')}.",
                (graph_period,graph_low)),
            Section("recover","How do I reconstruct a formula from a graph?",
                "Read the height, centre and one full period independently. Check the starting point to choose sine or cosine.",
                f"If the midline is {m('c')} and the amplitude is {m('a')}, then the vertical scale and the shift are already known. Read the horizontal distance between matching peaks. "
                "Divide the standard period by this distance to find the argument multiplier. To choose a starting curve, look at the value at the origin and the direction it is moving. "
                "Check a second landmark after writing the function.",
                "An origin on the midline and heading upwards suggests sine. An origin at the maximum suggests cosine. Moving the graph vertically can hide both clues if you compare with zero instead of the centre.",
                (recover_c,intercepts)),
        ),(("Amplitude","Distance between the midline and either extreme."),("Midline","Horizontal line halfway between the two extremes."),("Horizontal scale","Factor by which the distances between matching angle points change.")),
        25,(sine_extrema_exam,cosine_graph_exam,
            pair_exam("Recover height and centre from extrema",recover_a,recover_c,linked=True),
            pair_exam("Read axis crossings and a full period",intercepts,graph_period)),
        "Show the endpoints and one full repeat clearly. Use enough vertical scale to label the midline and extrema."),
        Lesson("tangent-modulus","Tangent transformations and modulus graphs",
            "Label the asymptotes of a transformed tangent graph and reflect the negative parts of a trig curve.",(
            Section("poles","How do I find asymptotes after scaling?",
                f"The transformed tangent is undefined when the argument has zero cosine. For {m(r'y=a\tan(bx)+c')}, solve {m(r'bx=90^\circ+180^\circ k')} in degrees.",
                "Find the x-positions of the vertical lines before drawing a branch. A vertical shift lifts the zero of the unshifted tangent to the new midline. "
                "Use the centre crossing on either side of the vertical line as a guide. If a branch runs off the given plot, leave it open in the right direction. "
                "In radian work, start the list of arguments at pi over two and repeat by pi.",
                "A vertical shift does not move an asymptote left or right. Only the horizontal scale in this family changes its position.",
                (asymptote,graph_period),tangent),
            Section("reflection","What happens below the horizontal axis?",
                f"For {m(r'y=|f(x)|')}, keep the parts at or above the horizontal axis and reflect the negative parts in that axis.",
                "Draw a light sketch of the underlying signed curve first. Label the zeros, since these are the places where a reflected section joins an unchanged section. "
                "At a negative point, use its original x-coordinate and replace the y-value with the corresponding positive value. "
                "This process also works branch by branch for a tangent curve. An excluded x-value still has no point.",
                "A modulus on the outside treats the whole y-value. Reflect after applying the vertical shift, even if that changes which parts cross the axis.",
                (modulus_value,intercepts),reflection),
            Section("shape","How does reflection change what I can read?",
                "The reflected graph has no negative ordinates. Its minima occur at zero crossings or at whichever reflected part comes closest to the axis.",
                "Compare the absolute values of the original extrema when the function is bounded. If the curve reaches the axis, that gives the minimum of the modulus. "
                "For sine or cosine with a shift, a half-turn does not usually repeat the reflected shape, because the peaks of the original wave were different distances from the axis. "
                "For unshifted sine or cosine it does repeat after half of the original period.",
                "A symmetry of the unshifted modulus graph does not necessarily survive a vertical shift placed inside the modulus.",
                (modulus_value,asymptote)),
        ),(("Modulus","Non-negative distance of a value from zero."),("Asymptote","Line that a branch approaches without a finite crossing here."),("Branch","Connected part of the graph between breaks.")),
        15,(tangent_graph_exam,
            pair_exam("Draw a modulus graph with its key features",modulus_value,sketch_mod,linked=True),
            pair_exam("Read a tangent period and modulus value",graph_period,modulus_value)),
        "Keep every excluded x-coordinate after reflecting the graph."),
        Lesson("interval-solutions","Solving trigonometric equations on an interval",
            "Find all special and non-special angle solutions in written bounds, including transformed arguments.",(
            Section("first","How do I find one angle without losing the others?",
                f"If an equation says {m(r'\cos x=\frac12')}, draw a cosine graph and a horizontal line at that level. Their intersections show all answers in the pictured interval.",
                "Isolate the trig function first. Look up a known exact value or use an inverse function to find one principal value. "
                "The graph and circle give the other crossing in one cycle. For sine, equal ordinates reflect about the vertical diameter. For cosine, equal abscissae reflect about the horizontal diameter. "
                "Tangent needs one base angle and all its half-turn repeats.",
                "The calculator returns one principal angle. A question asking for all solutions needs every compatible crossing in the stated interval.",
                (eq_sin,eq_cos),level),
            Section("interval","Should I solve for the whole argument first?",
                f"In an equation such as {m(r'\tan(2x+30^\circ)=1')}, the expression {m(r'2x+30^\circ')} is the angle the tangent sees.",
                "Name the whole bracket. Multiply the original bounds by the same scale as the variable and then add the shift. Work with this new interval while listing angles. "
                "Only then undo the shift and undo the multiplication. Check an endpoint separately when it makes the equation true. "
                "A strict upper bound omits that angle. An inclusive upper bound keeps it.",
                "When you double the argument, the argument interval also changes. Leaving the old bounds can hide other solutions.",
                (eq_tan,eq_sin)),
            Section("calculator","When do I round calculator angles?",
                "For a non-special angle, keep the calculator value through all changes of period and scale. Round the final angle only when asked.",
                "Check degree or radian mode. Choose the base angle and do the reflection on the unrounded value. "
                "Sweep the full interval before rounding. Round all requested answers to the same precision. If the problem requests an exact value, leave standard angles in degrees or multiples of pi.",
                "Do not round a value near a boundary before testing if it belongs in the interval.",
                (decimal_angle,eq_cos)),
        ),(("Principal value","One angle returned by an inverse trigonometric function."),("Argument","The full angle inside the trig function."),("Domain","The set of x-values in which to look for answers.")),
        20,(pair_exam("Solve two transformed equations in an interval",eq_sin,eq_cos),
            pair_exam("Solve tangent and compare precision",eq_tan,decimal_angle),
            pair_exam("Find every solution in degrees and radians",eq_cos,eq_sin,eq_tan)),
        "Map the endpoints to the full argument domain before you list angle candidates."),
        Lesson("reciprocal-functions","Reciprocal functions and identities",
            "Use secant, cosecant and cotangent with their domains, and select the correct squared identities.",(
            Section("reciprocals","How are the other three functions defined?",
                f"Secant is {m(r'\frac{1}{\cos x}')}. Cosecant is {m(r'\frac{1}{\sin x}')}. Cotangent is {m(r'\frac{\cos x}{\sin x}')}.",
                "Read the familiar sine or cosine coordinate first. Take a reciprocal only after making sure its denominator is not zero. "
                "For cotangent, the quotient of the two coordinates works whenever sine is non-zero. You can also take the reciprocal of tangent on their common domain when tangent is non-zero. "
                "At the top of the unit circle, cosine is zero and sine is one, so cotangent is zero even though tangent is undefined.",
                "A reciprocal function takes one divided by a trig value. An inverse function returns an angle from a trig value.",
                (exact_recip,reciprocal_domain),unit_circle),
            Section("squares","How can I choose between the three identities?",
                f"Start from {m(r'\sin^2x+\cos^2x=1')}. Dividing by cosine squared produces the secant and tangent identity. Dividing by sine squared produces the cosecant and cotangent identity.",
                f"The choice depends on the two squared functions in the question. For a squared secant use {m(r'\sec^2x=1+\tan^2x')}. "
                f"For a squared cosecant use {m(r'\operatorname{{cosec}}^2x=1+\cot^2x')}. "
                "Dividing by a squared factor still requires that factor to be non-zero. If the question asks for a function value and not its square, choose a sign using information about the quadrant.",
                "Match the related pair before rearranging. A tangent term goes with secant, and a cotangent term goes with cosecant.",
                (missing_square,conjugate_value)),
            Section("equations","Can I solve by using the reciprocal?",
                "After isolating a reciprocal trig function, switch to sine or cosine and find its base angles. Treat a zero cotangent separately.",
                "Set the denominator values aside before solving. Take the reciprocal of both sides when the isolated function is non-zero. "
                "If cotangent alone is zero, its numerator cosine must be zero and sine must be non-zero. "
                "Find every possible argument and return to the original angle by checking its bounds.",
                "Do not take the reciprocal of zero. Check the original domain again after replacing the function.",
                (eq_recip,reciprocal_domain)),
        ),(("Secant","The reciprocal of cosine."),("Cosecant","The reciprocal of sine."),("Cotangent","Cosine divided by sine."),("Common domain","Values for which all the expressions used are defined.")),
        18,(pair_exam("Check a reciprocal value, identity and domain",exact_recip,missing_square,reciprocal_domain),
            pair_exam("Use squared identities to solve a reciprocal equation",missing_square,eq_recip),
            pair_exam("Keep the original restrictions on a reciprocal",reciprocal_domain,eq_recip,linked=True)),
        "A reciprocal definition carries its own exclusion even when a simplified expression no longer shows it."),
        Lesson("nonlinear-solutions","Quadratic and mixed trigonometric equations",
            "Rewrite mixed trigonometric equations in one function, factor them and include every permitted solution.",(
            Section("two-signs","Why do squared functions create extra possibilities?",
                f"If {m(r'\sin^2 u=r^2')} for positive {m('r')}, then the sine can be either {m('r')} or {m('-r')}.",
                "Isolate the squared function before taking the roots. On a graph, look for crossings at both the upper and the lower horizontal levels. "
                "Write the allowed argument interval first, then list upper-level crossings and lower-level crossings separately. "
                "Transform every selected angle back to the original variable. If an equation factors, use the zero-product rule and keep the zero value as well.",
                "Squaring removed the sign. A positive square root alone usually leaves missing solutions.",
                (equation_sq,equation_factor),level),
            Section("substitution","Which identity reduces the number of functions?",
                "When a question mixes a reciprocal squared with its partner, replace the squared term to obtain a quadratic in one function.",
                f"With {m(r'\sec^2u')} and {m(r'\tan u')}, replace the squared secant first. Name the remaining trig value as a variable and factor or solve the quadratic. "
                "For each algebraic result, check it lies in the range of that function. For sine or cosine, any algebraic candidate outside minus one to one has no corresponding angle. "
                "Keep the original exclusions when a replacement removed a denominator.",
                "An algebraic root of the substituted equation is a function value. You still need to find every matching angle.",
                (equation_tan_quadratic,equation_recip_square)),
            Section("domain","When can I multiply by a trig expression?",
                "Use the common domain of the original expressions before clearing a trigonometric denominator.",
                f"When an equation includes both tangent and cotangent, neither the sine nor the cosine can be zero. Then rewriting cotangent as {m(r'\frac1{\tan u}')} allows a multiplication by tangent. "
                "After the multiplication, solve the squared equation. Substitute each group into the original expressions to confirm they are defined. "
                "Write final answers in the requested unit and include the stipulated endpoints.",
                "An algebraic operation can remove a visible denominator. Its old excluded values are still excluded.",
                (equation_tan_cot,equation_tan_quadratic)),
        ),(("Squared function","A trigonometric value multiplied by itself."),("Substitution","Naming one expression as a new variable while solving."),("Candidate","A possible answer that still needs to satisfy the original equation and its domain.")),
        28,(pair_exam("Solve a squared equation and a factorable one",equation_sq,equation_factor),
            pair_exam("Use a reciprocal identity to solve a mixed equation",equation_tan_quadratic,equation_recip_square),
            pair_exam("Clear a reciprocal denominator and check the domain",equation_tan_cot,equation_tan_quadratic),
            pair_exam("Compare root branches in two equations",equation_factor,equation_tan_cot)),
        "Write both function values before you derive the angle lists. Test the old denominator at the end."),
        Lesson("identity-proofs","Proving trigonometric relationships",
            "Prove identities by rewriting one side, using exact algebra and stating where the original expression exists.",(
            Section("starting","Which side should I start with?",
                "Choose the side with more terms, more brackets or more fractions. Rewrite that side one step at a time until it matches the other.",
                f"List what the target uses before you start. If it contains sine and cosine, rewrite tangents and reciprocals in terms of those coordinates. "
                f"If there are squares, check whether the identity {m(r'\sin^2u+\cos^2u=1')} can turn a difference into a single term. "
                "Start from an existing side and show equal expressions line by line.",
                "Testing one angle supports a check but cannot prove an identity for all allowed angles.",
                (identity_constant,identity_matrix)),
            Section("factor","When does factorising make a proof shorter?",
                "A sum and a difference of the same terms multiply to a difference of squares. Factor out any common coefficient before using a trig identity.",
                f"If the squared terms are secant and tangent at the same argument, their difference is one. Cosecant and cotangent give the same result. "
                "Use a new letter to name a complicated shared argument. After simplifying, replace the letter with the given argument. "
                "Keep the condition that the denominator of the original terms is non-zero.",
                "The square of a sum is not the sum of squares. Use the difference-of-squares rule only for matching conjugates.",
                (missing_square,identity_constant)),
            Section("fractions","How do I prove an identity with several denominators?",
                "Rewrite in two basic coordinates, combine the numerator first and cancel only a non-zero factor.",
                "Start with the allowed values. Turn reciprocal expressions into fractions with sine or cosine denominators. "
                "Rewrite an expression subtracted from its reciprocal over a single denominator. Often the new numerator is one minus the square of one coordinate, which switches it to the other coordinate squared. "
                "Now write the divisor as a fraction and multiply by its reciprocal. Keep the original restrictions even when all denominators cancel.",
                "Cancelling a factor can hide its zeros. A simpler final formula does not fill those gaps in the original expression.",
                (quotient_coefficient,reciprocal_domain)),
        ),(("Identity","Equality that holds for every allowed input."),("Conjugates","A pair of brackets with the same two terms but opposite middle signs."),("Denominator restriction","An excluded value that would make an original denominator zero.")),
        19,(pair_exam("Prove a conjugate relationship and justify its domain",proof_product,reciprocal_domain),
            pair_exam("Prove a quotient relationship with cancellations",proof_fraction,identity_matrix),
            pair_exam("Prove two relationships with different identities",proof_product,proof_fraction)),
        "Follow one chain of equalities from the complex expression and state the restrictions from the original expression."),
    )
    build(CHAPTER,"Trigonometry",8,ARCHIVE,lessons)


if __name__ == "__main__":
    main()
