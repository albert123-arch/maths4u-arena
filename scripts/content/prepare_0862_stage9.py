"""Maths4U authored Cambridge Lower Secondary 0862 Stage 9 content."""
from fractions import Fraction as F
from math import ceil, gcd, hypot, isqrt, pi, sqrt

from prepare_0862_support import (
    Lesson, Section, build_stage, choose, field, figure, label, m, p, part, path, problem, table, tex,
)


def v(seed, start=2, width=9, shift=0):
    return start + (seed // (9 ** shift)) % width


def mt(value):
    return m(tex(value))


def pair(x, y):
    return f"({x},{y})"


def line(a, b, name="x"):
    coefficient = "" if a == 1 else "-" if a == -1 else tex(a)
    if not a:
        return tex(b)
    return coefficient + name + ((("+" if b > 0 else "-") + tex(abs(b))) if b else "")


def val(prompt, answer, steps, method, *, wrong=None, unit="", kind="number", expected=None, variables=(), tolerance=None, fact=False):
    display = mt(answer) + (" " + unit if unit else "")
    parsed = str(answer) if expected is None else expected
    return part(prompt, display, steps, method, field(parsed, kind, variables=variables, tolerance=tolerance), wrong, fact=fact)


def written(prompt, answer, steps, method, *, fact=False):
    return part(prompt, answer, steps, method, fact=fact)


def multi(seed, prompt, correct, wrongs, steps, method, feedback):
    options = [correct, *wrongs]
    check = choose(options, seed)
    wrong = next(key for key, value in check["options"].items() if value == wrongs[0])
    choices = " ".join(key + ". " + value + "." for key, value in check["options"].items())
    return part(prompt + " Options: " + choices, correct, steps, method, check, (wrong, feedback), quick=prompt, fact=False)


def lessons(*entries):
    return tuple(entries)


def L(slug, title, goal, sections, terms, families=5, methods=()):
    return Lesson(slug, title, goal, tuple(sections), tuple(terms), families, tuple(methods))


def S(slug, title, intro, idea, mistake, make, fig=None, tip="Show the step that explains your answer."):
    return Section(slug, title, intro, idea, mistake, tip, make, fig)


def draw(key, alt, body, caption, *, h=228):
    return figure("stage-9", key, alt, body, caption, h=h)


def bars(key, names, values, caption):
    height = max(values)
    body = path([(40,174),(322,174)],"#314963",width=1.6)
    for index, (name, amount) in enumerate(zip(names,values)):
        x=48+258*(index+0.5)/len(values)
        h=120*amount/height
        body += f'<rect x="{x-19}" y="{174-h}" width="38" height="{h}" rx="2" fill="#3180a8"/>'
        body += label(x,167-h,amount)+label(x,197,name,size=12)
    return draw(key,"Bar chart of "+", ".join(f"{name}: {amount}" for name, amount in zip(names,values)),body,caption)


def indices(s, mode=0):
    base, a, b = v(s,2,6), v(s,2,9,1), v(s,1,8,2)
    if mode == 0:
        prompt=m(f"{base}^{{{a}}} \\times {base}^{{{b}}}")+" is written as "+m(f"{base}^n")+"."
        n=a+b
        rule="Multiplication joins two strings of equal factors. Add their lengths."
        mistake=(str(a*b),"The powers are both on the same base. For multiplication, add the indices.")
        if a*b==n:
            mistake=(str(a+b+1),"Count the factors in each power and add.")
        stem=val("Find "+m("n")+".",n,[rule,m(f"{a}+{b}={n}")+"."],"Add indices on the same base.",wrong=mistake)
        return problem("Count the factors",prompt,stem,written("Explain whether the same shortcut applies to "+m(f"{base}^{{{a}}}\\times {base+1}^{{{b}}}")+".","The bases differ, so a single-base product rule does not apply.",["The factors in the two powers are different."],"Compare the bases.",fact=True))
    if mode == 1:
        prompt=f"Divide {m(f'{base}^{{{a}}}')} by {m(f'{base}^{{{a+b}}}')}."
        n=-b
        stem=val("Write the result as "+m(f"{base}^n")+". Find "+m("n")+".",n,
                 [m(f"{a}-({a+b})={n}")+". There are more base factors in the denominator."],"Subtract the denominator's index.",wrong=(str(b),"Take the top index minus the bottom index in that order."))
        return problem("Cancel matching powers",prompt,stem,written("Give the result as a fraction.",mt(F(1,base**b)),[m(f"{base}^{{-{b}}}=1/{base}^{{{b}}}")+"."],"Interpret the negative index as a reciprocal.",fact=True))
    prompt=f"You compare {m(f'{base}^{{-{b}}}')} and {m(f'{base}^0')}."
    return problem("Zero and negative powers",prompt,
                   val("Evaluate "+m(f"{base}^{{-{b}}}")+".",F(1,base**b),["A negative index means take the reciprocal of the positive power."],"Reverse numerator and denominator.",wrong=(str(-base**b),"A negative index changes where the factor sits. It does not make the answer negative.")),
                   written("Explain why the other value is 1.",m(f"{base}^{{{a}}}/{base}^{{{a}}}={base}^0=1"),["A non-zero number divided by itself is 1."],"Make an equal-power quotient.",fact=True))


def powers_ten(s, mode=0):
    digits=13+7*(s%33)+11*((s//33)%17)
    coefficient=F(digits,100)
    places=v(s,2,6,1)
    if mode==0:
        number=F(digits,1000)
        return problem("Shift the place values",f"The measurement display starts at {m(f'{digits/1000:g}')}.",
                       val("Find the new reading after multiplying by "+m(f"10^{places}")+".",number*10**places,
                           [f"Multiplying by {m(f'10^{places}')} makes every place worth {10**places:,} times as much."],"Count the place-value jumps.",
                           wrong=(str(number/10**places),"Multiplication by a positive power of ten makes a positive number larger.")),
                       written("Describe how to return to the starting value.","Divide by "+m(f"10^{places}")+".",["Use the inverse operation."],"Reverse the multiplication.",fact=True))
    if mode==1:
        exp=places if s%2 else -places
        normalized=F(digits,100 if digits>99 else 10)
        # The coefficient is in [1,10). The extra decimal places stay visible in the prompt.
        value_=normalized*F(10)**exp
        prompt=f"A microscope display gives the number {m(decimal(value_))}. In standard form it is {m('A\\times10^n')}."
        return problem("Use standard form",prompt,
                       val("Find "+m("n")+".",exp,[f"The coefficient is {mt(normalized)}. The original number is {m(f'10^{{{exp}}}')} times as large as this coefficient."],"Write a coefficient from 1 up to but excluding 10.",
                           wrong=(str(-exp),"Use a negative power for a positive number smaller than 1.")),
                       written("State "+m("A")+".",mt(normalized),["Move the decimal point so exactly one non-zero digit lies before it."],"Read the coefficient.",fact=True))
    display_decimal=f"{float(coefficient):g}"
    return problem("Divide by a negative power of ten",f"A counter reads {m(display_decimal)}.",
                   val("Evaluate "+m(f"{display_decimal}\\div10^{{-{places}}}")+".",coefficient*10**places,
                       [m(f"10^{{-{places}}}=1/10^{places}")+". Dividing by that fraction multiplies by its reciprocal."],
                       "Change division by a reciprocal into multiplication.",wrong=(str(coefficient/10**places),"Dividing by a small positive number increases the reading.")),
                   written("Give the equivalent operation using a positive index.",m(f"{display_decimal}\\times10^{places}"),["Take the reciprocal of the divisor."],"Change the sign of the divisor's index.",fact=True))


def root_number(s, mode=0):
    a,b=v(s,3,15),v(s,2,8,1)
    k=a*a+b
    if k >= (a+1)**2:
        k=a*a+1+((b-1)%(2*a))
    if mode==0:
        fraction=F(a,b)
        candidates=[m(rf"sqrt{{{k}}}"),m(rf"sqrt{{{a*a}}}"),mt(fraction),m(f"0.{a:02d}")]
        return problem("Classify the number",f"Compare {m(rf'\sqrt{{{k}}}')}, {m(rf'\sqrt{{{a*a}}}')}, {mt(fraction)} and {m(f'0.{a:02d}')}.",
                       multi(s,"Which one is irrational?",candidates[0],candidates[1:],
                             [f"{k} is not a perfect square. Its square root cannot be written as a ratio of integers."],
                             "Check which square root lies between consecutive integers.","Take the root of a perfect square before classifying it."),
                       written("Explain why the ordinary decimal is rational.",m(rf"0.{a:02d}=\frac{{{a}}}{{100}}"),["A terminating decimal equals an integer divided by a power of ten."],"Use place value to find its denominator.",fact=True))
    if mode==1:
        return problem("Trap a square root",f"A square tile has area {k} square units.",
                       val("Give the whole number just below its side length.",a,
                           [m(f"{a*a}<{k}<{(a+1)**2}")+". Take the square root of all three numbers."],"Compare nearby square numbers.",
                           wrong=(str(a+1),"The larger integer is the upper bound. You need the whole number just below.")),
                       written("State the next whole number above the length.",mt(a+1),["Use the bigger of the two square numbers."],"Read the upper bound.",fact=True))
    a=2+(s%10)
    n=a**3+b
    return problem("Trap a cube root",f"A cube holds {n} cubic units.",
                   val("Give the whole number just below its edge length.",a,[m(f"{a**3}<{n}<{(a+1)**3}")+". Take cube roots."],
                       "Find nearby perfect cubes.",wrong=(str(a+1),"Use the lower of the two neighbouring cube numbers.")),
                   written("Write an inequality for its exact edge length.",m(rf"{a}<sqrt[3]{{{n}}}<{a+1}"),["Neither cube equals the given volume."],"Keep both comparisons strict.",fact=True))


def rounding(s, mode=0):
    unit=[10,100,1][mode]
    rounded=(100+3*v(s,2,21)+v(s,2,13,1))*unit
    half=F(unit,2)
    low,high=rounded-half,rounded+half
    return problem("Find rounding limits",f"The recorded reading is {rounded:,}, rounded to the nearest {unit} unit"+("s" if unit>1 else "")+".",
                   val("Give the lower limit.",low,[f"Half a rounding step is {mt(half)}.",m(f"{rounded}-{tex(half)}={tex(low)}")+"."],
                       "Subtract half of the rounding step.",wrong=(str(rounded-unit),"The full step is too large. Move only halfway to the previous rounded value.")),
                   written("Give the upper limit and say if it is included.",mt(high)+", excluded.",
                           [m(f"{rounded}+{tex(half)}={tex(high)}")+". At this boundary the reading rounds up."],
                           "Add half a step and check what happens exactly at the boundary."))


def algebra(s,mode=0):
    a,b,c=v(s,2,8),v(s,1,11,1),v(s,2,8,2)
    if mode==0:
        return problem("Evaluate in the right order",f"For a lamp circuit, the value of {m('x')} is {a}.",
                       val("Evaluate "+m(f"{b}+{c}x^2")+".",b+c*a*a,[f"Square {a} first to get {a*a}.",
                                                                          f"Multiply by {c}, then add {b}."],"Apply powers before multiplication and addition.",
                           wrong=(str((b+c)*a*a),"Only the term with an x is multiplied by the square.")),
                       written("Explain why adding first gives a different result.","The operation order keeps the constant separate.",
                               [f"The index acts on {m('x')} before the coefficient is used."],"Identify the part raised to a power.",fact=True))
    if mode==1:
        answer=f"x^2+{a+b}x+{a*b}"
        return problem("Expand a double bracket",f"A rectangle has sides {m(f'x+{a}')} and {m(f'x+{b}')} units.",
                       val("Expand the expression for its area.",answer,[f"The four pieces are {m(f'x^2+{b}x+{a}x+{a*b}')}.",
                                                                          "Add the two terms in x."],"Multiply each term in one bracket by both terms in the other.",
                           kind="polynomial",variables=("x",),wrong=(f"x^2+{a*b}","Show all four products, including the two strips with one x.")),
                       written("State the constant term.",mt(a*b),[f"The corner area is {a} multiplied by {b}."],"Multiply the constant terms.",fact=True))
    if mode==2:
        top=a+2
        return problem("Simplify a variable fraction",f"Take a non-zero value of {m('x')}. Consider {m(rf'\frac{{{a*c}x^{{{top}}}}}{{{c}x^{a}}}')}.",
                       val("Simplify the fraction.",f"{a}x^2",["Divide the numerical factors first.",m(f"x^{{{top}}}/x^{{{a}}}=x^2")+"."],
                           "Divide coefficients and subtract the indices.",kind="polynomial",variables=("x",),
                           wrong=(f"{a}x^3","Cancel one x from the top for every x in the denominator. Exactly two factors of x remain.")),
                       written("Explain the restriction on x.","The original denominator would be zero when "+m("x=0")+".",
                               ["Simplification cannot make an undefined division valid."],"Check the original denominator.",fact=True))
    return problem("Translate a verbal rule",f"A display starts at {m('x')}. It cubes the input, multiplies by {a} and adds {b}.",
                   val("Write an expression for the output.",f"{a}x^3+{b}",["The cube is formed before multiplying by the coefficient."],
                       "Build the expression in the stated order.",kind="polynomial",variables=("x",),wrong=(f"{a}x^2+{b}","Cubing uses three equal factors.")),
                   written("Find the output when the input is "+str(c)+".",mt(a*c**3+b),[m(f"{a}\\times{c}^3+{b}={a*c**3+b}")+"."],"Replace x by the input and evaluate."))


def formula(s, mode=0):
    a,b=v(s,2,9),v(s,2,8,1)
    origin=a*b**(mode+1)
    form=["T=kn","A=ks^2","V=kr^3"][mode]
    input_=["n","s","r"][mode]
    output=["T","A","V"][mode]
    undo=["No further operation is needed.","Take the positive square root of both sides.","Take the cube root of both sides."][mode]
    symbolic=[r"n=\frac{T}{k}",r"s=\sqrt{\frac{A}{k}}",r"r=\sqrt[3]{\frac{V}{k}}"][mode]
    return problem("Reverse a formula",f"The rule is {m(form)}. The variables are positive. For this case, {m(f'k={a}')} and {m(f'{output}={origin}')}.",
                   val(f"Find the value of {m(input_)}.",b,[f"Divide by {m('k')} to get {mt(b**(mode+1))}.",undo],
                       "Undo the operations in reverse order.",wrong=(str(origin),"Remove the effect of the multiplier before using a root.")),
                   written(f"Make {m(input_)} the subject of the original formula.",m(symbolic),["First divide both sides by the multiplier.",undo],
                           "Use the inverse operations in the correct order."))


def equations(s, mode=0):
    a,b,c=v(s,2,9),v(s,3,8,1),v(s,2,7,2)
    if mode==0:
        goal=a*b+c
        return problem("Set up a booking equation",f"An art club charges {c} tokens once, then {a} tokens per session. The bill is {goal} tokens.",
                       val("Find how many sessions were booked.",b,[m(f"{a}n+{c}={goal}")+".",f"Subtract {c} from both sides and divide by {a}."],
                           "Separate the fixed charge from the charge per session.",
                           wrong=(str(F(goal,a)),"Remove the fixed charge before dividing.")),
                       written("Write the equation you used, with n for the number of sessions.",m(f"{a}n+{c}={goal}"),
                               ["The total comes from a fixed charge and a repeated charge."],"Represent the repeated charge as a product.",fact=True))
    if mode==1:
        total=a*b
        return problem("Clear a variable denominator",f"Consider the equation {m(rf'\frac{{{total}}}{{x+{c}}}={a}')} for real x.",
                       val("Find "+m("x")+".",b-c,[f"Multiply both sides by the non-zero denominator to get {m(f'{total}={a}(x+{c})')}.",
                                                 f"Divide by {a}, then subtract {c}."],"Undo division first, then isolate x.",
                           wrong=(str(b),"The quotient gives x plus the added constant. Subtract that constant.")),
                       written("State the value excluded before solving.",m(f"x={-c}"),["This value makes the denominator zero."],"Set the original denominator equal to zero.",fact=True))
    limit=a*b+c
    if s%2:
        inequality = rf"{limit}-{a}t\geq {c}"
        return problem("Represent a cooling limit",f"A device starts at {limit} degrees. Its temperature falls by {a} degrees each minute. It works only while the temperature is at least {c} degrees.",
                       val("For how many whole minutes can the device keep working?",b,
                           [m(inequality)+".",f"After subtracting {limit}, divide by {-a}. Reverse the inequality sign."],
                           "Translate ‘at least’ before isolating t.",
                           wrong=(str(b-1),"At the limit the temperature is exactly the minimum, so this minute is allowed.")),
                       written("Write the original comparison and solve it for t.",m(inequality)+", so "+m(rf"t\leq {b}")+".",
                               ["When dividing by a negative number, the direction changes."],
                               "Reverse the sign when dividing by a negative value."),
                )
    inequality=f"{a}x+{c}\\leq {limit}"
    return problem("Interpret a spending limit",f"A machine uses {c} units to start and {a} units per hour. It can use at most {limit} units in total.",
                   val("Find the longest whole number of hours it can run.",b,[m(inequality)+".",
                                                                            f"Subtract {c} and divide by {a}. Equality is allowed."],"Translate ‘at most’ into less than or equal to.",
                       wrong=(str(b-1),"At most includes the case where the full allowance is used.")),
                   written("Write and solve the inequality in x.",m(inequality)+", so "+m(f"x\\leq {b}")+".",["The coefficient of x is positive, so the inequality sign stays the same."],"Isolate x using the same operations on both sides."))


def simultaneous(s,mode=0):
    x,y,a=v(s,2,11),v(s,2,9,1),v(s,2,6,2)
    b=a*x+y
    c=(a+1)*x+y
    if mode==0:
        given=f"Solve {m(f'{a}x+y={b}')} and {m(f'{a+1}x+y={c}')} together."
        steps=["Subtract the first equation from the second. The y terms cancel.",m(f"x={c}-{b}={x}")+".",
               "Put this value back into either equation."]
    elif mode==1:
        a=2+s%8
        b=y-a*x
        c=y+x
        given=f"Two lines have equations {m('y='+line(a,b))} and {m('y='+line(-1,c))}."
        steps=["At an intersection, both equations give the same y-value.",m(line(a,b)+"="+line(-1,c))+".",
               f"Solving gives x = {x}. Then y = {y}."]
    else:
        b=x+y
        c=2*x+3*y
        given=f"At a plant sale, {b} plants are sold. A herb costs 2 credits and a flower costs 3 credits. The total is {c} credits."
        steps=[f"If x is herbs and y is flowers then {m(f'x+y={b}')} and {m(f'2x+3y={c}')}.",
               "Double the first equation and subtract it from the second. That gives y.",f"Put y = {y} into the first equation to find x."]
    question=["Give the solution as an ordered pair (x, y).","Give the intersection as an ordered pair (x, y).","Give an ordered pair (herbs, flowers)."][mode]
    return problem("Match both conditions",given,
                   val(question,pair(x,y),steps,"Eliminate one variable or equate the two expressions.",kind="pairs",
                       wrong=(pair(x,y+1),"Substitute both coordinates into both original conditions.")),
                   written("Check your ordered pair in both conditions.","Both conditions are true.",["Substitute the two values together and check both totals."],
                           "Check each original equation with the same pair.",fact=True))



def scale_places_picture():
    columns = ["Hundreds", "Tens", "Ones", "Tenths", "Hundredths"]
    numbers = ["", "", "3", "4", "8"]
    moved = ["3", "4", "8", "", ""]
    art = ""
    for idx, name in enumerate(columns):
        x = 43 + 68*idx
        art += label(x,44,name,size=10)
        for y, values, colour in [(82,numbers,"#dbedf5"),(151,moved,"#f5dcc2")]:
            art += f'<rect x="{x-25}" y="{y-23}" width="50" height="42" rx="5" fill="{colour}"/>'
            art += label(x,y+5,values[idx],size=18)
    art += label(177,210,"multiply by 100: every digit moves two places",size=12)
    return draw("scale-place-values","Place value rows showing 3.48 and the same digits two columns left as 348",
                art,"Multiplying by 100 makes each digit count 100 times its former value.")


def rounding_picture():
    art=path([(43,127),(312,127)],"#516275",width=1.7)
    art+=path([(80,127),(276,127)],"#17775a",width=4)
    art+='<circle cx="80" cy="127" r="6" fill="#17775a"/><circle cx="276" cy="127" r="6" fill="#f8fbff" stroke="#17775a" stroke-width="2"/>'
    art+=path([(178,117),(178,137)],"#314966",width=1.5)
    art+=label(80,154,"45")+label(178,154,"50")+label(276,154,"55")+label(178,66,"values that round to 50",size=16)
    art+=label(178,208,"nearest 10",size=13)
    return draw("rounding-number-line","A number line has a filled point at 45 and an open point at 55, with 50 in the middle",
                art,"For positive values rounded to 50 to the nearest 10, include 45 and exclude 55.")


def bracket_picture():
    art='<rect x="72" y="43" width="150" height="106" fill="#a6d7eb" stroke="#305774" stroke-width="2"/>'
    art+= '<rect x="222" y="43" width="66" height="106" fill="#f6d7b5" stroke="#305774" stroke-width="2"/>'
    art+= '<rect x="72" y="149" width="150" height="45" fill="#f6d7b5" stroke="#305774" stroke-width="2"/>'
    art+= '<rect x="222" y="149" width="66" height="45" fill="#bee8d9" stroke="#305774" stroke-width="2"/>'
    art += label(147,32,"x")+label(255,32,"3")+label(61,99,"x")+label(61,178,"2")
    art += label(147,100,"x²",size=19)+label(255,100,"3x",size=18)+label(147,178,"2x")+label(255,178,"6")
    return draw("four-products","An area model split into x squared, three x, two x and six",
                art,"Each part of the first side pairs with each part of the second side. This sketch is not drawn to scale.")


def inverse_picture():
    art=path([(69,112),(290,112)],"#214b6c",width=2.5)
    art+=path([(281,105),(290,112),(281,119)],"#214b6c",width=2)
    for x,text in [(67,"input"),(290,"output")]:
        art+=f'<circle cx="{x}" cy="112" r="5" fill="#246393"/>'
        art+=label(x,87,text,size=15)
    art+=label(178,101,"multiply by 3",size=14)+path([(288,148),(69,148)],"#a54522",width=2.5)
    art+=path([(78,141),(69,148),(78,155)],"#a54522",width=2)
    art+=label(178,175,"divide by 3",size=14)
    return draw("inverse-machine","An input leads right to an output by multiplying by three, and left by dividing by three",
                art,"The inverse route retraces the multiplication by dividing by the same non-zero number.")


def intersection_picture():
    art=path([(46,170),(323,170)],"#39536a",width=1.6)+path([(69,188),(69,27)],"#39536a",width=1.6)
    art+=path([(69,153),(265,69)],"#24739e",width=2.7)+path([(69,69),(265,153)],"#a5421e",width=2.7)
    art+='<circle cx="167" cy="111" r="5" fill="#1b5849"/>'
    art+=label(185,102,"same x and y",size=13,align="start")+label(323,186,"x")+label(69,21,"y")
    return draw("common-line-point","One ascending and one descending line crossing at a marked green point",
                art,"The crossing satisfies both equations because it belongs to both graphs.")




NUMBER = (
    "number-and-calculation","Number and calculation",lessons(
        L("indices","Index laws","Use positive, zero and negative indices, including powers with the same base.",[
            S("products","Count factors in a product","Write a small power as repeated multiplication before using the shortcut.",
              "When the bases match, a product joins the factor lists. Add the indices.","Multiplying the indices counts the wrong number of factors.",lambda s:indices(s,0)),
            S("quotients","Cancel factors in a quotient","Look for equal factors above and below the fraction bar.",
              "Subtract the denominator's index from the numerator's index. A negative result leaves factors underneath.","Swapping the order of subtraction reverses the fraction.",lambda s:indices(s,1)),
            S("reciprocal","Read zero and negative indices","Compare the pattern of powers as each step divides by the same base.",
              f"For non-zero {m('a')}, {m('a^0=1')} and {m(r'a^{-n}=\frac{1}{a^n}')}.","A negative index does not make a positive base negative.",lambda s:indices(s,2)),
        ],[("Base","The factor multiplied by itself."),("Index","The exponent written above a base."),("Reciprocal","The result of dividing 1 by a number.")]),
        L("standard-form","Powers of ten and standard form","Scale numbers by powers of ten and describe very large or very small numbers in standard form.",[
            S("place-value","Move across place values","Use the value of each place, rather than imagining a loose decimal point.",
              "Every place to the left is ten times the previous place. Scaling by ten repeatedly follows the index.","Going in the wrong direction makes a number smaller when it should get bigger.",lambda s:powers_ten(s,0),scale_places_picture()),
            S("standard-form","Read a standard-form number","Point to the single non-zero digit before the decimal point.",
              f"Standard form is {m(r'A	imes10^n')} with {m(r'1\leq A<10')} and integer {m('n')}.","A coefficient of 12.3 must be changed along with its power of ten.",lambda s:powers_ten(s,1)),
            S("negative-exponents","Scale by a small power of ten","Write a negative power of ten as a fraction when the direction is hard to see.",
              "Dividing by one hundredth multiplies by 100. Check whether your result should grow or shrink.","Dividing by a number less than 1 can make a positive value larger.",lambda s:powers_ten(s,2)),
        ],[("Standard form","A way to write a number using a coefficient and an integer power of ten."),("Coefficient","The number multiplying a power of ten.")]),
        L("number-types","Number types and estimated roots","Distinguish rational and irrational numbers and estimate square and cube roots.",[
            S("rational","Classify numbers","Try to write the number as one integer divided by another non-zero integer.",
              "A terminating or recurring decimal is rational. A square root of a positive non-square integer is irrational.",
              "A radical written with a root sign can still be rational if it simplifies to an integer.",lambda s:root_number(s,0)),
            S("square-root","Find neighbouring square roots","Place a number between two consecutive perfect squares.",
              "The square root lies between their positive roots. Compare squares before using a calculator.","The side length of a square is the square root of its area.",lambda s:root_number(s,1)),
            S("cube-root","Find neighbouring cube roots","Imagine a cube built from layers of equally sized blocks.",
              "Compare the volume to nearby perfect cubes. Their edges give lower and upper estimates.","A cube has three dimensions. Use cubes rather than squares.",lambda s:root_number(s,2)),
        ],[("Rational","Can be written as a ratio of integers."),("Surd","An irrational root written exactly.")]),
    ))


ALGEBRA = ("algebraic-representation","Algebraic representation and manipulation",lessons(
    L("expressions","Expressions and algebraic fractions","Translate verbal rules, apply the order of operations and simplify products and fractions.",[
        S("order","Read operations in order","Use substitution to see which object each operation acts on.",
          "Evaluate brackets, then indices, then products or divisions, then sums or differences.","Without brackets, an index on x applies to x and not to a coefficient beside it.",lambda s:algebra(s,0)),
        S("expand","Build an area from four pieces","Split each side of a rectangle into two lengths and pair the pieces.",
          "A product of two brackets has four products before collecting like terms.","Multiplying only the first and last terms misses two strips.",lambda s:algebra(s,1),bracket_picture()),
        S("fractions","Cancel factors in algebraic fractions","Rewrite each term as a product of simple factors.",
          "Common non-zero factors may be cancelled. Keep any restriction from the original denominator.","You cannot cancel terms joined by addition.",lambda s:algebra(s,2)),
        S("words","Turn words into a rule","Identify the input and choose a short name for it.",
          "Translate one operation at a time. A square, a cube and a root each describe a different rule.","'Cube and add' is different from 'add and then cube'.",lambda s:algebra(s,3)),
    ],[("Term","Part of an expression separated by addition or subtraction."),("Coefficient","The numerical multiplier of a term.")]),
    L("formulae","Rearrange formulae","Reverse operations to change the subject of a formula with linear, square and cube terms.",[
        S("divide","Undo a multiplier","Read a formula as a machine that turns its input into its output.",
          "If multiplying by k produces the output, dividing by k gets the input back.","A formula is an equality. Apply the same operation to both sides.",lambda s:formula(s,0),inverse_picture()),
        S("square","Undo a square","Separate the factor outside the square before using a square root.",
          "After isolating the square, choose the positive root when the quantity is a positive length.",
          "Taking a root before removing an outside multiplier changes the answer.",lambda s:formula(s,1)),
        S("cube","Undo a cube","Pair cubing with its inverse, taking a cube root.",
          "Divide first when a factor sits outside the cube. Then take the cube root.","A square root reverses squaring, not cubing.",lambda s:formula(s,2)),
    ],[("Subject","The variable that appears alone on one side."),("Inverse operation","An operation that reverses another.")]),
    L("equations-limits","Equations, inequalities and rounding limits","Translate a situation into an equation or inequality and interpret the bounds of a rounded result.",[
        S("charge","Represent a cost","Decide which part is paid once and which part depends on the quantity.",
          "A fixed charge is a constant. A repeated charge is a coefficient times the number of repeats.",
          "The full bill includes both charges, so dividing the whole amount by the rate can overcount.",lambda s:equations(s,0)),
        S("denominator","Solve with an unknown denominator","List the input that would cause division by zero before solving.",
          "Multiply both sides by the denominator, then solve the resulting equation. Check the original restriction.",
          "An answer that makes the original denominator zero is never a solution.",lambda s:equations(s,1)),
        S("at-most","Write an inequality","Decide whether the number at the limit is permitted.",
          "At most means less than or equal to. Divide by a positive coefficient without reversing the sign.",
          "If you divide by a negative coefficient, the direction of the inequality changes.",lambda s:equations(s,2)),
        S("rounding","Find the possible original values","Locate the midpoints between consecutive rounded values.",
          "The lower limit is half a step below the recorded value. The upper limit is half a step above.",
          "For positive values rounded in the usual way, the upper endpoint rounds to the next recorded value.",lambda s:rounding(s,0),rounding_picture()),
    ],[("Inequality","A comparison that may hold for many values."),("Upper limit","The boundary at the high end of a rounding interval.")]),
    L("linear-systems","Simultaneous linear equations","Find a pair of values that satisfies two linear conditions and interpret the intersection of two lines.",[
        S("eliminate","Remove one variable","Look for terms with equal coefficients so they can cancel.",
          "Subtract whole equations to remove matching terms. Use the remaining equation to find one variable.",
          "Subtract each term, including the number on the right.",lambda s:simultaneous(s,0)),
        S("intersect","Find where lines meet","A plotted crossing belongs to both graphs at once.",
          "An intersection has the same x and y in both equations. When both give y, equate their right sides.",
          "A point on only one line does not satisfy the system.",lambda s:simultaneous(s,1),intersection_picture()),
        S("modelling","Make two conditions","Separate a total count from a total value.",
          "Use the same variables in both equations. After solving, check both original totals.",
          "Do not swap the values if the variables refer to different items.",lambda s:simultaneous(s,2)),
    ],[("Eliminate","Combine equations to remove one variable."),("Intersection","The point where two lines cross.")]),
))


def scoped_decimal(value, places=10):
    return f"{float(value):.{places}f}".rstrip("0").rstrip(".") or "0"


decimal = scoped_decimal


def circle_figure():
    return draw("circle-radius","A circle with a diameter through its centre and the right half marked radius",
                '<circle cx="176" cy="111" r="74" fill="#d8edf7" stroke="#246393" stroke-width="3"/>'
                +path([(102,111),(250,111)],"#244e70",width=2)
                +path([(176,111),(250,111)],"#a34316",width=3)
                +'<circle cx="176" cy="111" r="4" fill="#183c59"/>'
                +label(212,98,"radius",size=14)+label(176,207,"diameter = two radii",size=14),
                "The diameter crosses the centre and reaches both sides of the circle.")


def area_figure():
    return draw("compound-area","A rectangular space with a triangle removed at the top right",
                path([(68,51),(242,51),(287,122),(287,179),(68,179)],"#246393",fill="#cce8f1",closed=True)
                +path([(242,51),(287,51),(287,122)],"#9e5331",dash="5 4")
                +label(174,206,"whole width",size=14)+label(254,102,"cut",size=13),
                "Find the full rectangle first, then subtract the area of the missing right triangle.")


def prism_figure():
    return draw("prism-cross-section","A triangular prism with its near triangular face shaded",
                path([(42,166),(126,166),(88,84)],"#246393",fill="#baddf0",closed=True)
                +path([(203,126),(287,126),(249,44)],"#246393",closed=True)
                +path([(42,166),(203,126)],"#246393",dash="5 4")
                +path([(126,166),(287,126)],"#246393")+path([(88,84),(249,44)],"#246393")
                +label(205,177,"length",size=15)+label(95,194,"cross-section",size=14),
                "The same triangular cross-section continues from one end of the prism to the other.")


def cylinder_figure():
    body='<ellipse cx="92" cy="61" rx="46" ry="19" fill="#d2e9f4" stroke="#26719f" stroke-width="2"/>'
    body+= '<ellipse cx="92" cy="148" rx="46" ry="19" fill="#d2e9f4" stroke="#26719f" stroke-width="2"/>'
    body+=path([(46,61),(46,148)],"#26719f")+path([(138,61),(138,148)],"#26719f")
    body+='<rect x="181" y="60" width="128" height="88" rx="3" fill="#d2e9f4" stroke="#26719f" stroke-width="2"/>'
    body+=label(245,46,"circumference",size=13)+label(245,110,"curved face",size=14)+label(73,198,"cylinder")+label(245,198,"unrolled side")
    return draw("cylinder-net","A cylinder and the rectangular piece that fits around the curved face",body,
                "The long edge of the unrolled rectangle fits around a circular end.")


def pythagoras_figure():
    return draw("right-triangle","A right triangle with hypotenuse opposite the marked right angle",
                path([(64,170),(280,170),(64,53)],"#246393",fill="#cfebf3",closed=True)
                + path([(83,170),(83,152),(64,152)],"#173849",width=1.5)
                + label(169,193,"a")+label(48,114,"b")+label(190,103,"c",colour="#ad4216")
                + label(171,211,"legs a and b, hypotenuse c",size=12),
                "The hypotenuse c is across from the right angle. It is the longest side.")


def circle_math(s,mode=0):
    r=v(s,3,27)
    a=v(s,2,8,1)
    if mode==0:
        coefficient=2*r
        return problem("Walk around a circular track",f"A model track is a circle. Its diameter is {coefficient} m.",
                       part("Find its circumference exactly, in terms of π.",m(rf"{coefficient}\pi\text{{ m}}"),
                            [f"Use {m(r'C=\pi d')}. The diameter is already given."],"Multiply the diameter by π.",
                            field(coefficient),(str(2*coefficient),"The measurement is already a diameter. Do not double it again."),
                            quick="The circumference is kπ metres. Find k."),
                       written("Find its area in terms of π.",m(rf"{r*r}\pi\text{{ m}}^2"),[f"The radius is half the diameter, so it is {r} m."],
                               "Square the radius before multiplying by π."))
    if mode==1:
        a=v(s,7,13,1)
        length=2*r+a
        half=F(r*r,2)
        return problem("Find a rounded-end area",f"A path is made from a {length} m by {2*r} m rectangle and a semicircle. The diameter of the semicircle lies along a {2*r} m edge.",
                       part("Find the exact area of the semicircular part.",m(rf"{tex(half)}\pi\text{{ m}}^2"),
                            [f"Use radius {r} m.",f"Halve {m(rf'{r*r}\pi')} to get the semicircle."],
                            "A semicircle is half a circle.",field(half),(str(r*r),"The curved piece is only half a full circle."),
                            quick="The semicircle has area kπ square metres. Find k."),
                       written("Give the exact total area.",m(rf"{length*2*r}+{tex(half)}\pi")+" square metres.",
                               [f"The rectangle has area {length*2*r} square metres. The two areas join along an edge."],
                               "Add the rectangle to the semicircle.",fact=True))
    width=2*r+a
    height=r+v(s,4,8,2)
    cut_base=r
    cut_height=v(s,2,7,1)
    whole=width*height
    missing=F(cut_base*cut_height,2)
    return problem("Take away a triangular corner",f"A {width} cm by {height} cm card has a right triangle cut from a corner. The legs of the cut are {cut_base} cm and {cut_height} cm.",
                   val("Find the area of the card that remains in square centimetres.",whole-missing,
                       [f"The rectangle has area {whole} square centimetres.",f"The triangle has area {mt(missing)} square centimetres."],
                       "Subtract half the product of the two legs.",wrong=(str(whole-2*missing),"The cut is a triangle, so halve base × height.")),
                   written("Give a quick whole-number upper bound for the remaining area.",mt(whole)+" square centimetres.",
                           ["Removing a positive area makes the result smaller than the whole rectangle."],"Compare with the uncut card.",fact=True))


def measures(s,mode=0):
    a,b,c=v(s,3,10),v(s,2,11,1),v(s,3,8,2)
    if mode==0:
        moves=[("km","m",1000),("mg","g",1000),("µm","mm",1000),("mL","L",1000),("t","kg",1000)]
        start,end,factor=moves[(s//9)%len(moves)]
        up=start in {"km","t"}
        num=F(8+7*a+b,10)
        answer=num*factor if up else num/factor
        return problem("Change units before comparing",f"A log records {decimal(num)} {start}.",
                       val(f"Write the quantity in {end}.",answer,
                           [f"{'One '+start+' contains' if up else 'One '+end+' contains'} {factor} {end if up else start}.",
                            f"{'Multiply' if up else 'Divide'} by {factor}."],"Choose the direction of the conversion from the units.",
                           wrong=(str(num/factor if up else num*factor),"Check which is the larger unit. It takes fewer larger units to describe the same quantity.")),
                       written("Explain why the numerical size changes.","A bigger unit needs a smaller count for the same quantity.",
                               ["Table headings or measurement labels tell you which unit is being counted."],"Compare the size of one unit.",fact=True))
    if mode==1:
        area=F(a*b,2)
        return problem("Stack triangular cross-sections",f"A prism has a right-triangle cross-section with legs {a} cm and {b} cm. Its length is {c} cm.",
                       val("Find the volume in cubic centimetres.",area*c,
                           [f"The triangular cross-section has area {mt(area)} square centimetres.",f"Multiply by {c} cm."],
                           "Find the cross-sectional area and multiply by the prism length.",
                           wrong=(str(a*b*c),"The cross-section is triangular. Its area is half the product of the perpendicular legs.")),
                       written("Explain why the formula works.","The same cross-section fills every slice along the length.",
                               ["A layer one centimetre thick contains as many cubic centimetres as the cross-section has square centimetres."],
                               "Describe repeated equal cross-sections.",fact=True))
    return problem("Fill a cylinder",f"A cylinder has radius {a} cm and height {b} cm.",
                   val("The volume is kπ cubic centimetres. Find k.",a*a*b,
                       [m(rf"A=\pi({a})^2={a*a}\pi")+".",f"Multiply the area of the base by the height, {b} cm."],
                       "Use area of the circular base times height.",wrong=(str(2*a*b),"You used a circumference. Volume needs the area of the circular base.")),
                   written("Explain what happens when the height is tripled and the radius stays the same.","The volume triples.",
                           ["The base area is unchanged, but there are three times as many slices."],"Change only the height factor.",fact=True))


def surface(s,mode=0):
    a,b,c=v(s,2,12),v(s,3,11,1),v(s,4,7,2)
    if mode==0:
        comb=(a*b)+(b*c)+(a*c)
        return problem("Count opposing faces",f"A closed cuboid measures {a} cm by {b} cm by {c} cm.",
                       val("Find the surface area in square centimetres.",2*comb,
                           [f"There are two of each of the three face areas {a*b}, {b*c} and {a*c}."],
                           "Find each different face area, then double their sum.",wrong=(str(comb),"You found one of each size. Every face has an opposite face of the same area.")),
                       written("Explain why the answer is measured in square centimetres.","Each face area is a length multiplied by a length.",
                               ["The surface comprises six two-dimensional faces."],"Distinguish area from volume.",fact=True))
    if mode==1:
        area=2*a*(a+b)
        return problem("Unroll the cylinder",f"A closed cylinder has radius {a} cm and height {b} cm.",
                       val("Write its surface area as kπ square centimetres. Find k.",area,
                           [f"The two circular ends give {m(rf'{2*a*a}\pi')}.",f"The rectangle wrapped around them gives {m(rf'{2*a*b}\pi')}."],
                           "Add the two bases and curved face.",wrong=(str(2*a*b),"Also include the two circular ends.")),
                       written("Give the two dimensions of the unrolled curved surface.",m(rf"{2*a}\pi\text{{ cm}}")+" by "+mt(b)+" cm.",
                               ["The long edge wraps around the circle and the other matches the cylinder height."],"Use circumference for the wrap length.",fact=True))
    if mode==2:
        slant=a+b
        floor=a*a
        sides=2*a*slant
        return problem("Cover a square-based pyramid",f"A square-based pyramid has a {a} cm square base. The perpendicular height inside each triangular face is {slant} cm.",
                       val("Find its total surface area in square centimetres.",floor+sides,
                           [f"The base contributes {floor}.",f"Each triangular face contributes {mt(F(a*slant,2))}; count four faces."],
                           "Use the height drawn in the triangular face and count its four copies.",wrong=(str(sides),"The word ‘total’ includes the square base.")),
                       written("Name a plane of symmetry.","A plane through the apex and a diagonal of the square base.",
                               ["The plane cuts the pyramid into mirror halves."],"Reflect the vertices on one side across a diagonal plane.",fact=True))
    legs=(3*a,4*a,5*a)
    end=F(legs[0]*legs[1],2)
    around=sum(legs)
    return problem("Trace a triangular prism net",f"A right-triangle cross-section has sides {legs[0]}, {legs[1]} and {legs[2]} cm. The prism is {b} cm long.",
                   val("Find the total surface area in square centimetres.",2*end+b*around,
                       [f"Two triangular ends contribute {mt(2*end)}.",f"The three rectangles have respective widths {legs[0]}, {legs[1]} and {legs[2]} cm, all with length {b} cm."],
                       "Find the two ends and multiply the triangle perimeter by the prism length.",wrong=(str(b*around),"The three rectangles leave both triangular ends uncovered.")),
                   written("Explain the position of a plane of symmetry.","A plane halfway along the length and parallel to the triangular ends.",
                           ["It swaps the two ends and each side face with its mirror half."],"Locate equal halves across a cross-section.",fact=True))


def pythagoras(s,mode=0):
    factor=v(s,1,13)
    A,B,C=[(3,4,5),(5,12,13),(8,15,17)][(s//9)%3]
    a,b,c=A*factor,B*factor,C*factor
    if mode==0:
        return problem("Find the direct distance",f"On a flat grid, Lia walks {a} m east and {b} m north.",
                       val("Give the direct distance from her start in metres.",c,
                           [m(rf"d^2={a}^2+{b}^2={c*c}")+".",f"Take the positive square root to get {c} m."],
                           "Use the perpendicular journeys as the legs.",wrong=(str(a+b),"That is the route length around the corner. The straight line is the hypotenuse.")),
                       written("Explain why the two walks make a right angle.","East and north are perpendicular directions.",
                               ["The right angle tells us where we can use the theorem."],"Identify the angle between the known lengths.",fact=True))
    if mode==1:
        return problem("Recover the missing leg",f"A right triangle has hypotenuse {c} cm and one leg {a} cm.",
                       val("Find the other leg in centimetres.",b,[m(rf"b^2={c}^2-{a}^2={b*b}")+".",f"Take the square root."],
                           "Subtract the square of the known leg from the square of the hypotenuse.",
                           wrong=(str(c-a),"Subtract the squared lengths, then take the square root.")),
                       written("Check your value using the original lengths.",m(f"{a}^2+{b}^2={c}^2"),
                               ["The known and calculated legs square to the hypotenuse squared."],"Substitute both legs.",fact=True))
    offset=0 if s%2 else 1
    side=c+offset
    return problem("Test a claimed right angle",f"A triangular frame has side lengths {a}, {b} and {side} cm.",
                   val("Find the sum of the squares of the two shorter lengths.",c*c,
                       [m(f"{a}^2+{b}^2={c*c}")+"."],"Square each shorter length before adding.",
                       wrong=(str((a+b)**2),"Square each side separately. The square of their sum includes an extra product.")),
                   written("Is it a right triangle? Explain.","Yes." if not offset else "No.",
                           [f"The square of the longest side is {side*side}. It {'equals' if not offset else 'does not equal'} the sum for the shorter sides."],
                           "Compare the two results rather than assuming the triangle is right-angled."))


SHAPES = ("shape-and-measure","Shape and measure",lessons(
    L("circles-compound","Circles and compound areas","Use radius and diameter, estimate areas, and add or remove simple shapes.",[
        S("radius","Connect radius, diameter and perimeter","Measure from the centre to the edge. Double this length to go all the way across.",
          f"{m(r'C=\pi d=2\pi r')} is a distance around the boundary and {m(r'A=\pi r^2')} describes the area inside.",
          "A given diameter is already twice the radius.",lambda s:circle_math(s,0),circle_figure()),
        S("add","Join areas along a common edge","Mark the straight edge where the two pieces touch.",
          "Write a separate area for each piece. A semicircle contributes half the area of a complete circle.",
          "When adding areas, the shared edge has no area to subtract.",lambda s:circle_math(s,1)),
        S("subtract","Use a rectangle around a cut-out","Draw the original rectangle and shade the part that remains.",
          "Calculate or estimate the whole area, then remove the part outside the shape.",
          "Use the perpendicular height to find the area of a triangle.",lambda s:circle_math(s,2),area_figure()),
    ],[("Circumference","The distance around a circle."),("Compound shape","A shape made from simpler shapes.")]),
    L("units-volume","Small and large units, prisms and cylinders","Choose suitable units and derive volumes by stacking equal cross-sections.",[
        S("conversion","Choose a practical unit","A dust grain, water sample and loaded delivery lorry need different units.",
          "Work with units of the same kind. Common examples include milligrams, micrometres, millilitres and tonnes.",
          "A larger unit changes the number needed, not the measurement itself.",lambda s:measures(s,0)),
        S("prism","Stack equal slices","Imagine looking into the cut end of a prism.",
          "Volume is the area of one cross-section times the distance through which it continues.",
          "A triangular cross-section requires the area of a triangle, not a rectangle.",lambda s:measures(s,1),prism_figure()),
        S("cylinder","Use a circular cross-section","A cylinder stacks identical circles.",
          f"Each layer has area {m(r'\pi r^2')}. Multiplying by the height gives the volume.",
          "The circumference is a length. Volume needs a cross-sectional area.",lambda s:measures(s,2)),
    ],[("Cross-section","The shape you see when slicing across a solid."),("Cubic unit","The volume of a cube one unit along every edge.")]),
    L("surface-symmetry","Surface area and symmetry of solids","Read surfaces as flat shapes and identify planes that split solids into mirror halves.",[
        S("cuboids","Pair the opposite faces","A cube is a cuboid with all three lengths equal. Compare where its face pairs sit.",
          "A cuboid has three pairs of equal rectangles. Sum their areas.",
          "A rectangular face needs two lengths. Multiplying all three lengths gives volume.",lambda s:surface(s,0)),
        S("cylinders","Unroll a circular side","Trace the long edge of a cylinder's wrapping around a base.",
          "The curved area is a rectangle with dimensions circumference by height. Include two circle ends for a closed cylinder.",
          "A closed cylinder needs two ends, each counted once.",lambda s:surface(s,1),cylinder_figure()),
        S("pyramids","Fold faces and locate mirror halves","Compare square-based pyramids and triangular prisms.",
          "Find each face area. To test a plane of symmetry, imagine reflecting each face and vertex into the other half.",
          "The perpendicular height of a triangular face is measured inside that face.",lambda s:surface(s,2)),
        S("tri-prisms","Use two ends and three rectangles","Trace the edges of the triangular cross-section to find the widths of the three rectangles.",
          "Each end is a triangle; each face along the length is a rectangle. A halfway plane can swap the ends.",
          "The longest edge of the triangle is also a rectangle width.",lambda s:surface(s,3)),
    ],[("Net","A flat layout of a solid's faces."),("Plane of symmetry","A flat slice across which both halves are mirror images.")]),
    L("pythagoras","Pythagoras’ theorem","Find missing sides and check if a triangle is right-angled.",[
        S("hypotenuse","Find the longest side","Identify the right angle first. Look directly across from it.",
          "The square on the hypotenuse has the combined area of the squares on the two legs.",
          "The hypotenuse is opposite, never next to, the right angle.",lambda s:pythagoras(s,0),pythagoras_figure()),
        S("leg","Find a shorter side","Decide which squared length is the total and which is one part of it.",
          "To find a leg, subtract the known leg's square from the hypotenuse's square and take a square root.",
          "Subtracting the sides themselves does not subtract the squares.",lambda s:pythagoras(s,1)),
        S("test","Check if squares agree","Test a triangle with three known sides by putting the longest side on its own.",
          "If the longest side squared equals the sum of the shorter squares, the triangle is right-angled.",
          "A drawing alone does not settle whether an angle is 90°.",lambda s:pythagoras(s,2)),
    ],[("Hypotenuse","The side opposite the right angle."),("Leg","One of the two sides that meet at the right angle.")]),
))


def percent_figure():
    return draw("percent-multipliers","A starting bar of 100 percent and an increased bar of 120 percent",
                '<rect x="48" y="47" width="204" height="43" rx="5" fill="#79badd"/>'
                '<rect x="48" y="124" width="204" height="43" rx="5" fill="#79badd"/>'
                '<rect x="252" y="124" width="41" height="43" rx="5" fill="#f3aa76"/>'
                +label(150,74,"start 100%")+label(150,152,"old amount")+label(273,152,"20%",size=12)
                +label(169,197,"new amount = 120% of start"),
                "An increase of 20% means multiply the current amount by 1.20.")


def ratio_figure():
    colours=["#8ec9e1","#8ec9e1","#f7b17d","#f7b17d","#f7b17d"]
    body="".join(f'<rect x="{47+i*53}" y="80" width="48" height="57" rx="4" fill="{colour}"/>' for i,colour in enumerate(colours))
    body+=label(97,62,"two shares")+label(235,62,"three shares")
    body+=label(174,174,"five equal parts make the whole")
    return draw("ratio-bar","Two blue equal parts and three yellow equal parts forming one five-part bar",body,
                "The ratio 2 to 3 makes five parts altogether. Start by finding the value of one part.")


def fraction_calc(s,mode=0):
    a,b=v(s,2,13),v(s,3,11,1)
    if mode==0:
        terminating=s%2==0
        base=2**(1+s%4)*5**(1+(s//9)%2)
        divisor=base if terminating else base*3
        numerator=1+a*divisor
        return problem("Predict a decimal pattern",f"Think about the fraction {m(rf'\frac{{{numerator}}}{{{divisor}}}')}.",
                       multi(s,"Choose what its decimal does.","Terminates" if terminating else "Recurs",
                             ["Recurs" if terminating else "Terminates","Is irrational","Cannot be written as a decimal"],
                             [f"The numerator is one more than a multiple of {divisor}, so the fraction is already in lowest terms.",
                              "The remaining denominator only uses 2 and 5." if terminating else "A factor of 3 remains in the denominator."],
                             "Reduce to lowest terms and check the denominator's prime factors.",
                             "A terminating decimal has a denominator that can divide a power of ten."),
                       written("Give evidence from the prime factors of the reduced denominator.",
                               "Factors 2 and 5 only." if terminating else "It has a factor of 3.",
                               ["A power of ten consists entirely of 2s and 5s."],
                               "Test whether the denominator divides a power of ten."))
    if mode==1:
        f1=F(2*a+1,2)
        f2=F(b,3)
        answer=f1+f2
        return problem("Add two amounts exactly",f"A workshop uses {m(rf'{a}\frac{{1}}{{2}}')} m of ribbon, then {mt(f2)} m.",
                       val("Find the total length in metres.",answer,
                           [f"Use sixths. The terms become {m(rf'\frac{{{f1*6}}}{{6}}')} and {m(rf'\frac{{{f2*6}}}{{6}}')}.",
                            "Add the numerators and keep the denominator 6."],"Use equivalent fractions with denominator 6.",
                           wrong=(str(F(2*a+1+b,5)),"Denominators show the size of the parts. Make them equal before adding.")),
                       written("Say which two consecutive whole metres the total is between, or state the whole number if exact.",
                               f"Exactly {int(answer)} metres." if answer.denominator==1 else f"Between {int(answer)} and {int(answer)+1} metres.",
                               ["Compare the numerator of the total with successive multiples of its denominator."],"Check that the size is reasonable.",fact=True))
    f1,f2=F(a,2),F(b,3)
    difference=f1-f2
    answer=F(5,2)+difference
    return problem("Subtract before adding the next term",f"A calculation is {m(rf'\frac{{5}}{{2}}+({tex(f1)}-{tex(f2)})')}.",
                   val("Give its exact value.",answer,
                       [f"Put the two bracket terms over 6. The difference is {mt(difference)}.",f"Add {mt(F(5,2))} to this difference."],
                       "Do the operation inside brackets first.",wrong=(str(F(5,2)+f1+f2),"The second fraction inside the brackets is subtracted.")),
                   written("Write the fraction in lowest terms.",mt(answer),["Cancel any common factor in numerator and denominator."],"Simplify the final fraction.",fact=True))


def products(s,mode=0):
    a,b,c=v(s,3,13),v(s,2,11,1),v(s,2,9,2)
    if mode==0:
        f1,f2=F(a,b+1),F(b+1,c+3)
        value_=F(a,c+3)
        return problem("Cancel before multiplying",f"Work with {mt(f1)} and {mt(f2)}.",
                       val("Find their product exactly.",value_,
                           [f"The calculation equals {m(rf'\frac{{{a}}}{{{b+1}}}\times\frac{{{b+1}}}{{{c+3}}}')}.",
                            "The equal middle factors cancel."],"Cancel a common factor upstairs and downstairs.",
                           wrong=(str(f1+f2 if f1+f2!=value_ else value_+1),"The question asks for a product. Multiply rather than add.")),
                       written("Show how to check whether the product is less than 1.","Compare its numerator with its denominator.",
                               [f"In the form {m(rf'\frac{{{a}}}{{{c+3}}}')}, the comparison is between {a} and {c+3}."],
                               "Reason about the size of the fraction.",fact=True))
    if mode==1:
        total=F(a,2)
        portion=F(b,4)
        result=total/portion
        return problem("Divide by a fractional portion",f"A measurement is {mt(total)} litres. One unit portion is {mt(portion)} litres.",
                       val("Find how many portions the measurement represents. A fractional answer is allowed.",result,
                           [f"The calculation is {mt(total)} divided by {mt(portion)}.",f"Multiply by the reciprocal {mt(1/portion)}."],
                           "Divide by a fraction by multiplying by its reciprocal.",
                           wrong=(str(result+1) if portion==1 else str(total*portion),"The divisor must be inverted before multiplying.")),
                       written("State what the number means.","It is the number of portions, including any final part of a portion.",
                               ["A ratio of two lengths, masses or volumes in the same units has no unit."],
                               "Interpret division as ‘how many groups of this size’.",fact=True))
    decimal_=F(a,10)
    fraction=F(b,2)
    value_=decimal_+fraction**2
    return problem("Compute a mixed calculation",f"Work with the expression {m(rf'{decimal(decimal_)}+({tex(fraction)})^2')}.",
                   val("Give its exact value.",value_,
                       [f"Rewrite the decimal as {mt(decimal_)} and square the fraction to get {mt(fraction**2)} first.",
                        "Find a common denominator for the two values before adding."],
                       "Apply the index before adding.",wrong=(str((decimal_+fraction)**2),"The exponent is on the fraction alone.")),
                   written("Describe a quick estimate.","Round the two terms after applying the square.",
                           [f"{decimal(decimal_)} is near {round(decimal_)}; the square term is about {round(fraction**2)}."],
                           "Estimate the size of each term separately.",fact=True))


def decimals(s,mode=0):
    a=12+2*(s%31)
    b=21+3*((s//9)%13)
    x,y=F(a,10),F(b,10)
    if mode==0:
        ans=x*y
        return problem("Multiply the decimals",f"A strip is {decimal(x)} m long and {decimal(y)} m wide.",
                       val("Give the area in square metres.",ans,
                           [f"Work out {a} × {b} = {a*b}.",f"Both lengths were multiplied by 10 for that whole-number calculation. Now divide by 100."],
                           "Track the decimal-place change for each factor.",wrong=(str(ans*10),"There are two tenths factors, so the product is in hundredths.")),
                       written("Use rounded lengths to estimate the area.",mt(round(x)*round(y))+" square metres.",
                               [f"{decimal(x)} is close to {round(x)} and {decimal(y)} is close to {round(y)}."],
                               "Round both measurements to nearby whole numbers.",fact=True))
    if mode==1:
        q=F(v(s,12,21,1),10)
        total=x*q
        return problem("Divide by a decimal",f"A roll of tape has length {decimal(total)} m. A standard piece is {decimal(x)} m.",
                       val("Find the length of the roll divided by the standard length.",q,
                           [f"To remove the decimal in the divisor, multiply both values by 10.",
                            m(rf"{decimal(total*10)}\div {a}={decimal(q)}")+"."],
                           "Scale dividend and divisor by the same factor.",wrong=(str(q/10),"Scaling only the divisor changes the quotient.")),
                       written("Check by multiplication.",m(rf"{decimal(x)}\times{decimal(q)}={decimal(total)}"),
                               ["Multiplication reverses the division."],"Multiply the quotient by the original divisor.",fact=True))
    qty=2+(s//9)%8
    total=qty*x+y
    return problem("Calculate a total before dividing",f"A maker uses {qty} lengths of {decimal(x)} m and one length of {decimal(y)} m.",
                   val("Find the total length in metres.",total,
                       [f"Do the repeated multiplication first to get {decimal(qty*x)} m.",f"Add the single length of {decimal(y)} m."],
                       "Multiply the repeated length, then add the extra length.",wrong=(str(qty*(x+y)),"The extra length occurs once only.")),
                   written("Estimate the total using whole metre lengths.",mt(qty*round(x)+round(y))+" m.",
                           [f"The rounded separate lengths are {round(x)} m and {round(y)} m."],"Round the repeated and single lengths separately.",fact=True))


def percentages(s,mode=0):
    original=100+50*v(s,1,17)
    percent=[5,10,15,20,25,30,40,50][(s//9)%8]
    m1=1+F(percent,100) if mode!=1 else 1-F(percent,100)
    amount=original*m1
    if mode==2:
        percent2=10+5*v(s,1,6,2)
        m2=1-F(percent2,100)
        stem=f"An event had {original} points. Its total grows by {percent}%, then falls by {percent2}% of the new amount."
    else:
        percent2=percent
        m2=m1
        stem=f"A club account begins at {original} credits. It {'loses' if mode==1 else 'gains'} {percent}% each round for two rounds."
    answer=amount*m2
    mistaken=original*(m1+m2-1)
    return problem("Use the new amount for the second percentage",stem,
                   val("Find the final total.",answer,
                       [f"The first multiplier is {decimal(m1)}. It gives {decimal(amount)}.",
                        f"Multiply this amount by {decimal(m2)} to get {decimal(answer)}."],
                       "Multiply in order. The second percentage uses the new amount.",
                       wrong=(str(mistaken),"You applied both percentage changes to the original total. Use the first result as the second starting point.")),
                   written("Give the total percentage change. State whether it is an increase or a decrease.",
                           ("No change." if answer==original else f"{decimal(abs((answer/original-1)*100))}% {'increase' if answer>original else 'decrease'}."),
                           ["Divide the final amount by the start. Subtract 1 to get the signed change, then multiply by 100."],
                           "Measure the whole change relative to the original amount."))


def ratios(s,mode=0):
    a,b,c=v(s,2,12),v(s,3,11,1),v(s,3,9,2)
    if mode==0:
        if a==b:
            b+=1
        return problem("Share a total in parts",f"Red and green counters are in the ratio {a} : {b}. There are {(a+b)*c} counters altogether.",
                       val("Find the number of red counters.",a*c,
                           [f"There are {a+b} equal parts. Each part contains {c} counters.",f"Use {a} parts for red."],
                           "Add the parts before finding the value of one part.",wrong=(str(b*c),"You found the green part. Match the first number to red.")),
                       written("State the fraction of counters that are green.",mt(F(b,a+b)),
                               [f"Green uses {b} parts of the {a+b} total parts."],"Compare green parts with all parts.",fact=True))
    if mode==1:
        extra=1+s%6
        rate=F(c,2)
        return problem("Follow a direct proportion",f"{a} metres of cord cost {decimal(a*rate)} credits at a constant price per metre.",
                       val(f"Find the cost of {a+extra} metres in credits.",(a+extra)*rate,
                           [f"One metre costs {decimal(rate)} credits.",f"Multiply this by {a+extra}."],
                           "Divide to find the unit rate, then multiply by the required quantity.",
                           wrong=(str((a+extra)*(a*rate)),"The given price is for several metres. First find the price of one.")),
                       written("Describe what doubling the length does to the cost.","It doubles the cost.",
                               ["The price per metre stays fixed and the length doubles."],"Identify the constant multiplier.",fact=True))
    # Keep a whole-number working time with, for example, 4 teams for 6 hours then 6 for 4 hours.
    first,other=2*a,3*a
    before,after=3*b,2*b
    return problem("Use an inverse proportion",f"{first} identical machines complete a run in {before} minutes. They share the work equally and run at the same rate.",
                   val(f"Find the time in minutes with {other} machines.",after,
                       [f"The fixed amount of work is {first} × {before} machine-minutes.",f"Share these across {other} machines."],
                       "Keep number of machines × time fixed.",wrong=(str(F(before*other,first)),"More machines share the same run, so the time decreases.")),
                   written("Explain how you knew whether the time grows or shrinks.","The total work stays the same. More machines complete it sooner.",
                           ["The relationship is an inverse proportion under the stated assumptions."],"Use the direction of change to check the calculation.",fact=True))


CALC = ("fractions-ratio-proportion","Fractions, decimals, percentages and proportion",lessons(
    L("fraction-sums","Fraction sums and decimal patterns","Predict a recurring decimal, add and subtract fractions and check an estimate.",[
        S("decimal-type","Spot a recurring decimal","Reduce the fraction fully before looking at the denominator.",
          "A fraction in lowest terms terminates in base ten if its denominator has no prime factors except 2 and 5.",
          "Look at the reduced denominator. A factor can disappear during simplification.",lambda s:fraction_calc(s,0)),
        S("adding","Make parts the same size","A half and a third are different sizes. Write them both as a count of equal smaller parts.",
          "Use a common denominator, then add or subtract the numerators. Whole and fractional parts can be written as improper fractions.",
          "Adding the denominators changes the size of the parts.",lambda s:fraction_calc(s,1)),
        S("brackets","Do the bracket first","Use parentheses to show which fraction operation comes first.",
          "Estimate the size and sign before calculating. Perform a bracketed difference before the outside sum.",
          "Subtraction in a bracket is still subtraction. Watch the sign if the second fraction is bigger.",lambda s:fraction_calc(s,2)),
    ],[("Recurring decimal","A decimal with a digit or group of digits that repeats without ending."),("Improper fraction","A fraction whose numerator is at least as big as its denominator for positive values.")]),
    L("products-and-decimals","Fraction and decimal products and quotients","Choose accurate written methods and estimate to catch place-value or inverse errors.",[
        S("fraction-products","Cross-cancel factors","Write the numerator and denominator as products before multiplying.",
          "Cancel common factors before multiplying fractions. A product of two fractions less than 1 is smaller than each positive factor.",
          "Only cancel factors across a numerator and denominator.",lambda s:products(s,0)),
        S("fraction-division","Count fractional groups","Ask how many portions of the given size fit into the total.",
          "Divide by a non-zero fraction by multiplying by its reciprocal.",
          "Invert the divisor only. A smaller portion can produce a larger count.",lambda s:products(s,1)),
        S("decimal-products","Keep track of place value","Estimate first so you know roughly where the decimal point belongs.",
          "If both factors have one decimal place, multiply the tenths as integers and divide the product by 100.",
          "An area cannot be ten times larger just because the digits were multiplied correctly.",lambda s:decimals(s,0)),
        S("decimal-division","Scale both sides of the quotient","Rewrite the divisor as a whole number using a power of ten.",
          "Multiply dividend and divisor by the same power of ten. The quotient stays the same.",
          "Changing only the divisor changes the result.",lambda s:decimals(s,1)),
    ],[("Divisor","The number you divide by."),("Estimate","A value close enough to check the likely size of an answer.")]),
    L("mixed-calculations","Order of operations with fractions and decimals","Combine exact fractions, decimals, brackets and indices in one calculation.",[
        S("power-before-add","Work out the power before adding","Identify the term that carries the index and rewrite any decimal as a fraction.",
          "Square only the term to which the power applies, then use a common denominator for the sum.",
          "A square outside one term cannot spread to the other terms.",lambda s:products(s,2)),
        S("integer-factor","Multiply the repeated measurement","Separate repeated measurements from an extra measurement.",
          "Multiply the repeated decimal by the whole-number count before adding the extra decimal.",
          "An extra measurement included once is not multiplied by the count.",lambda s:decimals(s,2)),
        S("bracket-result","Use parentheses to choose the first step","Estimate each term, then compute the operation inside the bracket.",
          "Decide what happens inside brackets and apply inverse operations in the order shown.",
          "Brackets can change the result by making a difference happen before the sum.",lambda s:fraction_calc(s,2)),
    ],[("Index","A number showing the power of a value."),("Common denominator","A shared size for the fractional parts.")]),
    L("compound-percentages","Compound percentages","Find a repeated change by using the new amount at every step.",[
        S("growth","Use a multiplier for growth","Put the original amount and the increase into a single multiplier.",
          "A 20% increase means 120% of the current value. Use 1.20 as the multiplier.",
          "The second increase is calculated from a different starting value.",lambda s:percentages(s,0),percent_figure()),
        S("decrease","Use the percentage left","Read the amount left as a percentage of the starting amount.",
          "A 15% decrease leaves 85%, so use 0.85 for each separate decrease.",
          "Subtracting 15% twice is a different calculation from subtracting 30% once.",lambda s:percentages(s,1)),
        S("mixed","Compare the final value with the start","A rise and a fall may both be given, each from the current amount.",
          "Multiply the two factors. Compare the result with 1 to find the overall percentage change.",
          "A rise and fall with equal stated percentages do not usually cancel out.",lambda s:percentages(s,2)),
    ],[("Multiplier","A single factor used to scale an amount."),("Compound change","Several changes where every step starts with the preceding result.")]),
    L("ratio-models","Ratio and direct or inverse proportion","Share in a ratio and decide whether a fixed unit rate or a fixed product applies.",[
        S("shares","Build a bar of equal parts","Use one bar which contains all the parts stated in the ratio.",
          "For a ratio of 2 to 3, there are five equal parts. Divide the total by five to find one part.",
          "Use the total number of parts, not just the first part count.",lambda s:ratios(s,0),ratio_figure()),
        S("direct","Look for a fixed price per unit","Make a table of amount and cost to see whether their quotient stays constant.",
          "In direct proportion, multiplying one quantity by a factor multiplies the other by the same factor.",
          "A fixed charge added at the start breaks a simple direct proportion.",lambda s:ratios(s,1)),
        S("inverse","Look for a fixed product","Think about a fixed job shared among equal workers.",
          "In inverse proportion, multiplying one quantity by a factor divides the other by the same factor.",
          "More equal workers take less time for the same job.",lambda s:ratios(s,2)),
    ],[("Unit rate","The amount for one unit."),("Inverse proportion","A relationship whose two quantities have a fixed product.")]),
))


def chance_tree():
    body=path([(33,107),(116,54)],"#246393")+path([(33,107),(116,162)],"#246393")
    body+=path([(130,54),(253,29)],"#246393")+path([(130,54),(253,76)],"#246393")
    body+=path([(130,162),(253,133)],"#246393")+path([(130,162),(253,188)],"#246393")
    body+=label(99,30,"first pick",size=12)+label(256,12,"second pick",size=12)
    body+=label(132,52,"R",size=13)+label(132,158,"B",size=13)
    for text,x,y in [("RR",276,34),("RB",276,81),("BR",276,140),("BB",276,195)]:
        body+=label(x,y,text,size=13)
    return draw("chance-tree","A tree of two red or blue picks with outcomes RR, RB, BR and BB",body,
                "Multiply along a path. Add only the separate paths that match the event.")


def probability(s,mode=0):
    a,b,c=v(s,2,11),v(s,3,13,1),v(s,4,10,2)
    total=a+b+c
    if mode==0:
        return problem("Add mutually exclusive outcomes",f"A bag holds {a} blue, {b} yellow and {c} red counters. Choose one counter at random.",
                       val("Give the probability of blue or yellow.",F(a+b,total),
                           [f"There are {a+b} suitable counters from {total} counters altogether."],
                           "Add the probabilities of the separate outcomes.",wrong=(str(F(a*b,total*total)),"One draw cannot be both colours. Add the probabilities for the two allowed colours.")),
                       written("Explain why the named events are mutually exclusive.","A single counter cannot be both blue and yellow.",
                               ["There is no overlap between the two sets of single-draw outcomes."],"Check whether the events can happen together.",fact=True))
    if mode==1:
        return problem("Use the complementary outcome",f"A spinner has {total} equal sections. Exactly {a} are marked A and {b} are marked B. All other sections are marked C.",
                       val("Find the probability of a C.",F(c,total),
                           [f"The known outcomes make up {a+b} sections.",f"Subtract these from {total}. There are {c} sections for C."],
                           "Use the fact that all outcomes have total probability 1.",
                           wrong=(str(F(a+b,total)) if a+b!=c else "1","The listed A and B sections are the outcomes to leave out.")),
                       written("Explain how you checked the three probabilities.","They add to 1.",
                               ["One of A, B and C happens on each spin."],"Check the sum of all mutually exclusive outcomes.",fact=True))
    replaced=mode==2
    second=F(a,total) if replaced else F(a-1,total-1)
    answer=F(a,total)*second
    start=f"A bag has {a} red and {b+c} blue counters. Choose two at random, one after the other. {'Put the first counter back before the second draw.' if replaced else 'Keep the first counter out for the second draw.'}"
    return problem("Follow two picks through a tree",start,
                   val("Find the probability of two red counters.",answer,
                       [f"The first red probability is {mt(F(a,total))}.",f"After a red, the next red probability is {mt(second)}.",
                        "Multiply along the red–red path."],"Multiply the two conditional branch probabilities.",
                       wrong=(str(F(a,total)*F(a-1,total-1)) if replaced else str(F(a,total)**2),
                              "Replacement resets the contents." if replaced else "Keeping the first red counter out reduces both the red count and the total.")),
                   written("Are the red outcomes on the two draws independent? Explain.",
                           "Yes. The first result does not affect the second probability." if replaced else "No. The first result changes the contents for the second draw.",
                           ["Compare the second red probability after a red with the probability before drawing."],
                           "Check whether the earlier outcome changes the later probability."),
                   written("Find the probability of getting one counter of each colour.",
                           mt(F(2*a*(b+c),total*(total if replaced else total-1))),
                           [f"Red then blue and blue then red are different paths. Each has probability {mt(F(a*(b+c),total*(total if replaced else total-1)))}.",
                            "Add these two probabilities."],"Multiply along each successful path, then add the paths."))



def trial(s,mode=0):
    a=v(s,2,9)
    b=v(s,6,15,1)+a
    mult=v(s,8,19,2)
    if mode==0:
        return problem("Predict the number of successes",f"A simulator gives a success probability of {mt(F(a,b))} in every trial. It runs {b*mult} trials.",
                       val("Find the expected number of successes.",a*mult,
                           [f"Multiply {b*mult} by {mt(F(a,b))}. Divide by {b} to get {mult}, then multiply by {a}."],
                           "Expected frequency is the number of trials times the probability.",
                           wrong=(str(b*mult-a*mult) if b!=2*a else str(b*mult),"Use the success probability, not all outcomes or the probability of failure.")),
                       written("Explain whether every run has exactly this count.","The count can vary from one run to another.",
                               ["The expected frequency is a prediction, not a guarantee."],"Distinguish a typical value from a certain result.",fact=True))
    if mode==1:
        count=a*mult+2+(s%3)
        return problem("Compare observed and expected counts",f"A game has exact win probability {mt(F(a,b))}. In {b*mult} plays, the player wins {count} times.",
                       val("Find the number of extra wins above the expected count.",count-a*mult,
                           [f"The expected count is {b*mult} × {mt(F(a,b))} = {a*mult}.",f"Compare the observed count, {count}, with the expectation."],
                           "Calculate expectation and subtract it from the observed count.",
                           wrong=(str(a*mult),"That is the expectation itself. Compare it with the observed count.")),
                       written("Does this result alone prove the game is biased? Explain.","One result above expectation does not prove that the game is biased.",
                               ["Repeat the experiment more times and compare the rates."],"Consider the effect of ordinary random variation."))
    short,long=b*mult,b*mult*10
    observed=a*mult-1
    return problem("Design and check a simulation",f"A computer chooses integers from 1 to {b} with equal probabilities. A result up to {a} counts as a success. A short run of {short} trials gives {observed} successes.",
                   val("Find the observed proportion of successes in this run.",F(observed,short),
                       ["Use the observed count, then divide by the total trial count."],"Relative frequency is successes divided by all trials.",
                       wrong=(str(F(a,b)),"The theoretical probability comes from the rules. The observed proportion comes from the recorded count.")),
                   written(f"Explain why repeating the process for {long} trials can give a better comparison.",
                           "With many trials the observed proportion is typically more stable.",
                           [f"Keep the same success rule, count all trials and compare the observed proportion with {mt(F(a,b))}."],
                           "Change the run size while keeping the probability rule."))


PROB = ("probability","Probability",lessons(
    L("outcomes","Mutually exclusive and combined events","Add disjoint outcomes, multiply along a path and identify independence.",[
        S("mutually-exclusive","Check whether events can happen together","List outcomes for one turn of a game.",
          "Mutually exclusive events have no shared outcomes. Add their probabilities to find the probability of either.",
          "One counter cannot show both named colours on the same single draw.",lambda s:probability(s,0)),
        S("complement","Use the outcomes left over","List all possible outcomes so that each is counted once.",
          "All mutually exclusive outcomes together have probability 1. Subtract known probabilities to find the rest.",
          "A probability must be between 0 and 1.",lambda s:probability(s,1)),
        S("with-replacement","Follow one tree path","Label stages of the experiment separately even when the probabilities match.",
          "Multiply the branch probabilities on a single path. With replacement, the bag starts the same on the next draw.",
          "For two red draws, multiply the probability of red on each draw.",lambda s:probability(s,2),chance_tree()),
        S("without-replacement","Update a changing experiment","Draw the second stage using the bag that remains after the first draw.",
          "Without replacement, change both the total and the count of the colour that was taken.",
          "Independence means earlier results don't change the probabilities for later results.",lambda s:probability(s,3)),
    ],[("Mutually exclusive","Two events with no shared outcomes in the stated trial."),("Independent","Where knowing one result leaves the other event's probability unchanged.")],6),
    L("expected-frequency","Expected frequency and simulation","Build a simulation and compare theoretical probabilities with observed results.",[
        S("expected","Predict a count","Keep the probability and trial count separate.",
          "Multiply the number of trials by the probability to estimate the number of occurrences.",
          "Expected does not mean exactly what happens in every run.",lambda s:trial(s,0)),
        S("observed","Compare prediction and result","Calculate one expected count before looking at the count recorded.",
          "Compare counts for equal trial totals and proportions for different trial totals.",
          "An observed count can differ from its expected value due to chance.",lambda s:trial(s,1)),
        S("simulation","Set rules for a fair simulation","Choose a random generator, label successes and record the result of each trial.",
          "Keep the same rules for small and large runs. Compare relative frequency with the theoretical probability.",
          "Count failures as trials too. Leaving them out changes the denominator.",lambda s:trial(s,2),
          bars("trial-count",["expected","observed"],[14,16],"Example: 14 successes were predicted and 16 were observed. Compare counts only when the run size is the same.")),
    ],[("Expected frequency","The number of trials multiplied by the event probability."),("Relative frequency","The observed event count divided by the number of trials.")]),
))


def polygon_picture():
    shape=[(81,77),(183,39),(269,92),(238,173),(98,173)]
    body=path(shape,"#246393",fill="#d6eaf3",closed=True,width=2.2)
    for idx,point in enumerate(shape[2:4]):
        body+=path([shape[0],point],["#9a471e","#136947"][idx],width=2.15)
    for name,point in zip("ABCDE",[(68,76),(184,28),(282,92),(248,186),(88,190)]):
        body+=label(*point,name,size=13)
    return draw("polygon-triangles","A pentagon has two diagonals from the same vertex, splitting it into three triangles",body,
                "An n-sided polygon splits into n minus 2 triangles from one vertex.")


def anchors_picture():
    base = [(111,165),(249,165)]
    apex = (180,165-69*sqrt(3))
    body = path([*base,apex,base[0]],"#2a77a5",width=2.5)
    body+= '<path d="M171 40 A138 138 0 0 1 196 56 M164 56 A138 138 0 0 1 189 40" fill="none" stroke="#a44820" stroke-width="2" stroke-dasharray="4 4"/>'
    body+=label(179,210,"equal compass widths",size=13)
    for name,x,y in (("A",109,184),("B",251,184),("C",180,31),("60°",137,153)):
        body+=label(x,y,name,size=13)
    return draw("construct-sixty","A sixty-degree construction using the three equal sides of an equilateral triangle",body,
                "Use the length AB as the compass opening for the two arcs that cross at C.")


def angle_math(s,mode=0):
    n=v(s,5,23)
    g=v(s,3,15,1)
    if mode==0:
        inside=(n-2)*180
        return problem("Find an interior angle sum",f"A community tile design is based on a convex polygon with {n} sides.",
                       val("Find the sum of its interior angles in degrees.",inside,
                           [f"Draw diagonals from one vertex. The number of triangles is {n-2}.",
                            f"Each triangle contributes 180°, making {inside}°."],
                           "Use number of triangles times 180°.",wrong=(str(n*180),"The first and last sides at the chosen vertex do not add a triangle. There are n minus 2 triangles.")),
                       written("Does the sum require a regular polygon? Explain.","No. The number of triangles depends on the sides, not their lengths.",
                               ["A fan of diagonals still gives the same total for any convex polygon of this size."],"Explain what the triangle count depends on.",fact=True))
    if mode==1:
        sides=[5,6,8,9,10,12,15,18,20,24,30,36,40,45,60,72,90,120][s%18]
        turn=360//sides
        return problem("Walk once around a regular polygon",f"A robot walks the sides of a regular {sides}-sided polygon. It turns through the same angle at each vertex.",
                       val("Give the angle of each exterior turn in degrees.",turn,[f"A complete circuit needs 360°. Share it equally among {sides} turns."],
                           "Divide a full turn by the number of vertices.",wrong=(str(180-turn),"This gives the inside angle. The robot turns through the outside angle.")),
                       written("Find a single interior angle.",f"{180-turn}°.",["An exterior and its adjacent interior angle lie on a straight line."],"Subtract the exterior angle from 180°.",fact=True))
    disclosed=32+v(s,2,24)+v(s,2,14,1)
    other=50+g
    missing=180-disclosed-other
    return problem("Trace an angle between parallels",f"A transversal crosses two parallel lines. One acute angle is {disclosed}°. A triangle uses a matching corresponding angle and another interior angle of {other}°.",
                   val("Find the third angle in degrees.",missing,
                       [f"The first interior angle equals {disclosed}° because corresponding angles in parallel lines are equal.",
                        f"Subtract {disclosed}° and {other}° from 180°."],
                       "Use the parallel-line relation first, then the triangle sum.",
                       wrong=(str(360-disclosed-other),"A triangle's angles add to 180°. A quadrilateral uses 360°.")),
                   written("State the relationship used for the first angle.", "Corresponding angles are equal.",
                           ["Both angles are in matching positions relative to a parallel line and the transversal."],
                           "Name an angle rule and its condition.",fact=True))



def bearing_picture():
    art=path([(115,159),(115,45)],"#225a7d",width=2)
    art+=path([(108,55),(115,45),(122,55)],"#225a7d",width=2)
    art+=path([(115,159),(215,59)],"#aa4920",width=2.9)
    art+=path([(202,62),(215,59),(213,72)],"#aa4920",width=2)
    art+='<path d="M115 119 A40 40 0 0 1 143.3 130.7" stroke="#176649" stroke-width="2" fill="none"/>'
    art+=label(115,35,"N")+label(109,184,"P")+label(220,45,"Q")+label(145,113,"045°",size=13)
    return draw("bearing-clockwise","A north arrow at P and a north-east ray to Q, with an angle of forty-five degrees clockwise from north",
                art,"Start at P, face north and turn clockwise. Give 045°, using three digits.")




def compass(s,mode=0):
    step=v(s,3,16)
    delta=v(s,11,16,1)
    if mode==0:
        bearing=(5*step+2*delta)%160+11
        reverse=bearing+180
        return problem("Reverse a bearing",f"On a plan, the bearing of Q from P is {bearing:03d}°.",
                       val("Find the bearing of P from Q in degrees.",reverse,
                           [f"Draw a north line at Q parallel to the one at P. The opposite direction is half a full turn away.",
                            f"Add 180° to {bearing:03d}°."],"Reverse the direction by turning 180°.",
                           wrong=(str(360-bearing if bearing!=90 else bearing),"A reverse bearing is a half turn, not a reflection in the north line.")),
                       written("Give a reminder for writing a bearing.","Use three digits measured clockwise from north.",
                               ["A leading zero marks the position of the hundreds digit."],"State the measurement direction and format.",fact=True))
    if mode==1:
        scale=50+10*delta
        return problem("Use a plan scale",f"On a plan, 1 cm represents {scale} m. A walking route measures {step} cm along a straight segment.",
                       val("Find the actual length in metres.",step*scale,[f"Use {scale} m for each of {step} cm."],
                           "Multiply the scaled amount for one centimetre by the map length.",
                           wrong=(str(F(step,scale)),"Going from a plan measurement to a real length here increases the numerical amount.")),
                       written("If the map were drawn at half its size, what happens to route length on the map?","It is halved.",
                               ["The actual route length stays the same."],"Distinguish drawing length from real length.",fact=True))
    if mode==2:
        construct=["60°","30°","45°"][s%3]
        bigger=60 if construct in {"30°","60°"} else 90
        answer=bigger if construct=="60°" else bigger//2
        sections=[
            "Draw a base segment "+str(step)+" cm long. With a compass opening equal to the segment, draw an arc from each endpoint. Join an arc crossing to each endpoint.",
            "Draw an equilateral-triangle corner on a "+str(step)+" cm base to build a 60° angle. Use equal arcs inside the angle and join their crossing back to the vertex.",
            "Draw a right angle on a "+str(step)+" cm base. Use equal arcs inside the angle and join their crossing back to the vertex.",
        ]
        return problem("Construct an exact angle",sections[s%3],
                       val("Find the size of the constructed angle in degrees.",answer,
                           ["An equilateral triangle has three equal angles of 60°." if s%3==0 else f"The angle bisector splits {bigger}° into two equal angles."],
                           "Build a known angle, then bisect if needed.",
                           wrong=(str(answer+15),"Check whether you need a 60° equilateral angle or half of a 60° or 90° angle.")),
                       written(f"Construct the {construct} angle on paper. Leave the compass arcs visible.",
                               f"A {construct} angle with usable construction marks.",
                               ["Start with the stated base. Use a consistent compass width for each pair of arcs."],
                               "Use compass arcs to construct, rather than measuring a guessed angle."))
    segments=[6,8,9,10,12,15][s%6]
    turn=360//segments
    return problem("Construct a regular polygon",f"You want to draw a regular {segments}-sided polygon around a circle with radius {step} cm.",
                   val("Give the angle at the centre between successive vertices in degrees.",turn,
                       [f"Equal central angles divide the full 360° into {segments} pieces."],"Share a complete turn equally.",
                       wrong=(str(180-turn),"That is an interior angle. Put the protractor centre at the centre of the circle.")),
                   written("Describe how to finish the drawing from one marked vertex.","Mark the central angles consecutively and join neighbouring points on the circle.",
                           ["For a regular hexagon, the compass radius also equals its side length."],
                           "Use evenly spaced points and connect adjacent vertices."))


ANGLES = ("angles-and-constructions","Angles and constructions",lessons(
    L("polygons-angles","Polygon and parallel-line angles","Explain polygon angle sums and use angle relationships to find missing values.",[
        S("angle-sum","Split a polygon into triangles","Draw all possible diagonals from one vertex in a convex polygon.",
          "A polygon with n sides splits into n minus 2 triangles. Each triangle adds 180°.",
          "Do not count a side of the polygon as a diagonal.",lambda s:angle_math(s,0),polygon_picture()),
        S("exterior","Follow the turns around a boundary","Imagine walking one complete lap while facing along the next side.",
          "The exterior turns add to 360°. For a regular polygon, the turns are all the same.",
          "An adjacent interior and exterior angle make 180°, not 360°.",lambda s:angle_math(s,1)),
        S("parallels","Combine one angle rule at a time","Mark parallel lines, then name any right angles, straight lines or triangles you can see.",
          "Use corresponding or alternate angles in parallel lines, vertically opposite angles at a crossing, and triangle or quadrilateral sums as needed.",
          "Corresponding angles need parallel lines. A diagram that only looks parallel does not establish it.",lambda s:angle_math(s,2)),
    ],[("Exterior angle","The turn from one edge to the next."),("Corresponding angles","Angles that occupy matching positions when a line crosses two other lines.")]),
    L("bearings-construction","Bearings, scales and constructions","Read positions on maps and construct exact angles and regular polygons.",[
        S("bearings","Measure clockwise from north","Draw a north line through the point you start from.",
          "A bearing is stated with three digits. Reverse a bearing by adding or subtracting 180°.",
          "North lines stay parallel at both locations on a plan.",lambda s:compass(s,0),bearing_picture()),
        S("scale","Convert plan length to real length","Read both units in the map scale before calculating.",
          "Use a unit rate such as metres per centimetre. Multiply it by the measured map length.",
          "Convert to the requested unit when giving the answer.",lambda s:compass(s,1)),
        S("exact","Build an angle with compass arcs","Make 60° from an equilateral triangle and 90° from a perpendicular construction.",
          "Bisect 60° to get 30° or 90° to get 45°. Use equal compass arcs to find the line through the middle of each angle.",
          "Keep the construction marks so a reader can see how you found the angle.",lambda s:compass(s,2),anchors_picture()),
        S("regular-polygons","Put equally spaced points around a circle","Make each central angle the same so the chords are the same length.",
          "Share 360° equally at the centre to locate the vertices. A regular hexagon can also be stepped round with the radius as compass width.",
          "Use the angle at the centre, not the angle inside the polygon.",lambda s:compass(s,3)),
    ],[("Bearing","An angle measured clockwise from north and written with three digits."),("Angle bisector","A ray that divides an angle into two equal parts.")],6),
))


def difference_picture():
    cells=[("position",["1","2","3","4"]),("value",["2","5","10","17"]),("first gap",["","+3","+5","+7"]),("next gap",["","","+2","+2"])]
    body=""
    for row,(heading,entries) in enumerate(cells):
        y=35+row*41
        body+=label(48,y+12,heading,size=12)+path([(99,y+23),(332,y+23)],"#cadbea",width=1)
        body+="".join(label(122+64*idx,y+12,entry,size=15,colour="#176346" if row==3 else "#243d56") for idx,entry in enumerate(entries))
    return draw("quadratic-differences","A term table for 2, 5, 10, 17 with first differences 3, 5, 7 and constant second differences 2",
                body,"The gaps grow by 2 each time. These are the same gaps as in the square numbers.")


def linear_picture():
    body=path([(37,162),(323,162)],"#314963",width=1.55)+path([(67,190),(67,32)],"#314963",width=1.55)
    body+=path([(67,138),(129,113),(191,88),(253,63)],"#266e9a",width=3)
    body+=path([(129,113),(191,113),(191,88)],"#ad5630",dash="5 4",width=2)
    body+='<circle cx="67" cy="138" r="4" fill="#155576"/>'
    body+=label(25,142,"start",size=13)+label(162,130,"run",size=12)+label(212,103,"rise",size=12)+label(326,167,"x")+label(66,19,"y")
    return draw("line-rate","A rising straight line with its y-intercept and a right-angled rise and run marked",body,
                "The gradient is rise divided by run. The intercept is the value at x = 0.")


def sequence(s,mode=0):
    a,b,n=v(s,2,11),v(s,1,13,1),v(s,5,17,2)
    if mode==0:
        slope=F(a,2) if s%2 else -a
        if (s//9)%2:
            b=-b
        expression=line(slope,b,"n")
        ts=[slope*x+b for x in range(1,5)]
        given=f"Here are the first terms of a linear sequence: {', '.join(mt(x) for x in ts)}."
        return problem("Find the nth term of a linear sequence",given,
                       val("Give the value of term "+str(n)+".",slope*n+b,
                           [f"The common difference is {mt(slope)}.",
                            f"The rule is {m(expression)} because position 1 gives {mt(ts[0])}."],"Find the common difference, then match the first term.",
                           wrong=(str(slope*n),"You have the multiplier. Also match the first term to find the constant.")),
                       written("Write the nth term rule in n.",m(expression),[f"Check that the rule changes by {mt(slope)} per term."],
                               "Use difference × position and fit the constant."))
    if mode==1:
        change=b if s%2 else -b
        terms=[x*x+change for x in range(1,5)]
        expr="n^2"+("+" if change>0 else "-")+str(abs(change))
        return problem("Extend a pattern of square numbers",f"A sequence starts {', '.join(map(str,terms))}. The gaps continue growing by 2.",
                       val(f"Find term {n}.",n*n+change,
                           [f"Compare the terms with 1, 4, 9 and 16. The constant difference is {change}.",
                            f"Use {m(expr)}."],"Compare the pattern with square numbers.",
                           wrong=(str(n*n),"You found the square. Include the constant vertical shift.")),
                       written("Write the nth term rule in n.",m(expr),["Check by substituting n = 1."],"Carry the same addition or subtraction for every n.",fact=True))
    if mode==2:
        rule=rf"\frac{{n}}{{{a}}}"
        ans=F(n,a)
        msg=f"A sequence starts {', '.join(mt(F(x,a)) for x in range(1,5))}. Each step adds the same fraction."
        return problem("Recognise a fraction of the position",msg,
                       val(f"Find term {n}.",ans,[f"The first term and step are both {mt(F(1,a))}.",
                                                f"Multiply this fraction by {n}."],"Use one equal contribution for each position number.",
                           wrong=(str(n*a),"The rule divides the position number by a fixed value.")),
                       written("Write the nth term in n.",m(rule),["The pattern multiplies each position number by the first term."],
                               "Use a fixed denominator.",fact=True))
    rule=[r"n^2",r"n^3"][s%2]
    power=2 if s%2==0 else 3
    here=max(4,n)
    return problem("Generate a square or cube sequence",f"One sequence uses the rule {m(rule)}. Start at position {here-3}.",
                   val(f"Find the value at position {here}.",here**power,[f"Raise {here} to the power {power}."],
                       "Apply the exponent to the position number.",wrong=(str(here*power),"An exponent counts equal factors, not a multiplier in front.")),
                   written(f"Write the terms from position {here-3} to position {here-1}.",
                           ", ".join(mt(x**power) for x in range(here-3,here)),["Substitute each consecutive position into the rule."],
                           "Distinguish a position from the value at that position."))


def functions(s,mode=0):
    a,b,c=v(s,2,11),v(s,2,13,1),v(s,2,9,2)
    if mode==0:
        x=-(a) if s%2 else a
        y=x*x+b
        return problem("Use a rule in the forward direction",f"A function squares its input and adds {b}. Consider the input {x}.",
                       val("Find the output.",y,[f"{x} squared is {x*x}.",f"Add {b}."],
                           "Square the full input, then add the constant.",wrong=(str(-x*x+b) if x<0 else str((x+b)**2),
                                  "Brackets around a negative input keep both factors negative." if x<0 else "The added constant sits outside the square.")),
                       written(f"Does the input {-x} produce the same output? Explain.","Yes. Opposite inputs have equal squares.",
                               ["It is possible for two inputs to have one shared output. Each input still has only one output."],"Compare the squared values.",fact=True))
    if mode==1:
        d=a*a+b
        return problem("Work backwards to an input",f"A function takes a positive input, squares it and adds {b}. The output is {d}.",
                       val("Find the input.",a,[f"Subtract {b} to undo the addition. This gives {a*a}.",
                                                "Take the positive square root."],"Undo operations in reverse order.",
                           wrong=(str(a*a),"The result after subtracting is still the square of the input.")),
                       written("Why is the negative square root not allowed here?","The inputs were restricted to positive numbers.",
                               ["When undoing a square, always check which inputs are allowed."],"Check the restriction in the prompt.",fact=True))
    return problem("Turn a rule into an equation",f"A tank has {b} litres at the start. Each filling cycle adds {a} litres. Let x be the number of cycles and y be the volume.",
                   val(f"Find y when x is {c}.",a*c+b,[f"The repeated addition is {a} × {c}.",f"Add the initial {b} litres."],
                       "Multiply the rate by the cycle count, then add the starting value.",
                       wrong=(str(a*c),"That is the amount added. The tank already contained water.")),
                   written("Give the equation in x and y.",m("y="+line(a,b)),["The coefficient of x gives the change per cycle."],
                           "Include both the rate and the starting value."))


def graphs(s,mode=0):
    a,b,c=v(s,2,9),v(s,1,11,1),v(s,2,11,2)
    if mode==0:
        sign=-1 if s%2 else 1
        x=sign*a
        target=b*a+c
        expr=m(f"{b}x+{a}y={target*a}")
        y=target-b*sign
        points=[0,1,x]
        coordinates=[(point,F(target*a-b*point,a)) for point in points]
        return problem("Build a table for an implicit line",f"The straight line obeys {expr}.",
                       val(f"Give y when x = {x}.",y,[f"Substitute {x} for x, subtract the first term, then divide by {a}."],
                           "Isolate y from the given linear equation.",
                           wrong=(str(a*y),"That is the value of the full y term. Divide by its coefficient.")),
                       written("Use x = 0, x = 1 and your x value to make a small table, then draw the line.",
                               table(["x","y"],[[mt(px),mt(py)] for px,py in coordinates]),
                               ["Plot the points, then connect them with a straight line."],"Find two points and use the third to check the line."))
    if mode==1:
        offset=b if s%2 else -b
        expr=line(1,offset,"x^2")
        y=a*a+offset
        coords=[(-a,y),(-1,1+offset),(0,offset),(1,1+offset),(a,y)]
        return problem("Plot a shifted quadratic",f"Draw the graph of {m('y='+expr)} using a value table.",
                       val(f"Give the y-coordinate at x = {-a}.",y,
                           [f"Square {-a} to get {a*a}, then apply the vertical shift {offset}."],"Square the complete x-coordinate.",
                           wrong=(str(-a*a+offset),"A negative input has a positive square.")),
                       written("Use the points with x = 0, ±1 and the two outer values to draw a smooth curve.",
                               table(["x","y"],[[mt(px),mt(py)] for px,py in coords]),
                               ["Points the same distance from the y-axis have the same height."],"Plot symmetric pairs and join with a smooth curve."))
    sign=1 if s%2 else -1
    rise=sign*a
    run=b+1
    y0=c
    y1=c+rise
    grad=F(rise,run)
    return problem("Find the equation of a drawn line",f"A straight line crosses the vertical axis at (0, {y0}) and passes through ({run}, {y1}).",
                   val("Find the gradient.",grad,[f"From the first point to the second, the change in y is {rise} and the change in x is {run}."],
                       "Use vertical change divided by horizontal change.",
                       wrong=(str(F(run,rise)) if abs(grad)!=1 else str(-grad),"Use rise over run and keep the sign of the change.")),
                   written("Write the equation of the line in y = mx + c form.",m("y="+line(grad,y0)),
                           [f"The y-intercept is {y0}. Keep the sign and value of the gradient."],"Combine gradient and intercept.",fact=True))


def rates_graph(s,mode=0):
    a,b,n=v(s,3,14),v(s,2,11,1),v(s,2,10,2)
    if mode==0:
        t=5*n
        dist=a*t
        return problem("Read a rate from a distance graph",f"A cycle route's distance–time graph is a straight line through the origin. After {t} minutes it reaches {dist} metres.",
                       val("Find the speed in metres per minute.",a,["Calculate change in distance divided by elapsed time."],
                           "Use the axes to choose the units of the gradient.",wrong=(str(F(1,a)),"Divide distance by time. The unit metres per minute confirms the order.")),
                       written("Give the distance after one extra minute if this line continues.",f"{dist+a} metres.",
                               [f"One extra minute adds {a} metres."],"Use the constant speed.",fact=True))
    if mode==1:
        later=2*n
        r1=a
        r2=F(2*a+1,2)
        return problem("Compare two slopes",f"Two straight distance–time lines start at zero. Route A covers {r1*later} m in {later} seconds. Route B covers {r2*later} m in {later} seconds.",
                       val("By how many metres per second is route B faster?",r2-r1,
                           [f"The speeds are {mt(r1)} and {mt(r2)} metres per second.", "Compare the two speeds by subtraction."],
                           "Divide each distance by its time first.",wrong=(str((r2-r1)*later),"That is a difference in distance. Divide by the elapsed time for the difference in speed.")),
                       written("Which line is steeper?","Route B.",
                               ["A bigger distance per second gives a larger gradient."],"Connect the graph steepness to the rate.",fact=True))
    mass=F(10*a*b,100)
    size=b
    density=mass/size
    return problem("Read a mass-per-volume graph",f"A mass–volume graph through the origin includes the point with volume {size} cubic centimetres and mass {decimal(mass)} grams.",
                   val("Give the density in grams per cubic centimetre.",density,["The gradient of a mass versus volume graph gives mass per unit volume."],
                       "Divide the mass change by the volume change.",wrong=(str(size/mass) if size/mass!=density else str(density+1),
                              "Use mass in the numerator and volume in the denominator.")),
                   written("Describe a higher-density substance on the same axes.","It has a steeper straight line through the origin.",
                           ["For a fixed volume, the more dense substance has a larger mass."],"Compare the gradients rather than the axis labels.",fact=True))


SEQUENCES = ("sequences-functions-graphs","Sequences, functions and graphs",lessons(
    L("sequencing","Linear and quadratic sequences","Generate terms, identify equal or growing differences and describe nth term rules.",[
        S("linear","Match a common difference","Compare the difference between every two neighbouring terms.",
          "In a linear sequence, the common difference is the multiplier of n. Use an early term to find the constant.",
          "The first term corresponds to n = 1, not n = 0.",lambda s:sequence(s,0)),
        S("quadratic","Compare patterns with the square numbers","Look for first differences that grow by the same amount.",
          "For a square pattern shifted by a constant, compare each term with its position squared.",
          "A constant second difference does not mean the first difference stays the same.",lambda s:sequence(s,1),difference_picture()),
        S("fraction","Build a fraction of the position","If each position adds a fixed fraction, use its count of equal pieces.",
          "A sequence like one fifth, two fifths, three fifths has nth term n divided by 5.",
          "The numerator counts the position. The denominator gives the same piece size.",lambda s:sequence(s,2)),
        S("powers","Generate square and cube terms","Write down positions before using a term formula.",
          "Squaring or cubing acts on the position number. To generate an unfamiliar term, substitute its position into the rule.",
          "Term 10 does not mean that the term's value is 10.",lambda s:sequence(s,3)),
    ],[("Common difference","A fixed change from each term to the next."),("Second difference","The change from one first difference to the next.")],6),
    L("inputs-and-rules","Functions, inputs and linear models","Find outputs, reverse a function and write equations for simple rate-and-start situations.",[
        S("forward","Follow operations from input to output","Trace each operation in the stated order.",
          "Each allowed input has one output. Different inputs can sometimes share an output.",
          "In a square rule, put a negative input in parentheses before squaring.",lambda s:functions(s,0)),
        S("inverse","Reverse the operations","Write the output first and undo the last operation before the earlier ones.",
          "Undo addition by subtraction. When a square is undone, check the allowed sign of the input.",
          "A squared value can come from a positive or negative input unless the domain restricts it.",lambda s:functions(s,1)),
        S("model","Turn a fixed start and a rate into a line","Choose x for the changing amount and y for the result.",
          "The y-intercept is the starting amount. The coefficient of x shows how much the result changes per input unit.",
          "A fixed starting amount is added once, not once per input unit.",lambda s:functions(s,2),linear_picture()),
    ],[("Function","A rule that assigns just one output to each allowed input."),("Input","A value that goes into the function.")]),
    L("draw-and-read-lines","Plot straight lines and quadratic curves","Prepare coordinate tables, draw graphs and recover a straight-line equation.",[
        S("implicit-lines","Isolate the y term","If x and y both appear on the same side, substitute your chosen x value before collecting numbers.",
          "For an implicit equation, subtract the x term, then divide by the coefficient of y.",
          "A value for 3y is not the value for y.",lambda s:graphs(s,0)),
        S("draw-parabola","Plot symmetric pairs","A positive and negative input of equal size give equal squares.",
          "In y = x² plus or minus a constant, start with a square-number table and shift every y-value.",
          "Connect a quadratic graph with a smooth curve, not a straight line.",lambda s:graphs(s,1)),
        S("recover","Find gradient and intercept","Read a pair of points and count each axis change with its sign.",
          "Gradient is change in y divided by change in x. The vertical intercept is the y-coordinate when x = 0.",
          "A line that falls from left to right has a negative gradient.",lambda s:graphs(s,2),linear_picture()),
    ],[("Implicit equation","An equation where y has not been written alone."),("Gradient","The change in y per unit change in x.")]),
    L("compound-rates","Graphs and compound measures","Read and compare rates such as speed and density from graph gradients.",[
        S("speed","Choose the correct units","Read the labels of both axes before interpreting steepness.",
          "A distance–time graph has gradient equal to speed where distance is measured from zero and motion moves steadily forwards.",
          "Metres per minute means metres divided by minutes.",lambda s:rates_graph(s,0),linear_picture()),
        S("compare-speeds","Compare slopes with a common scale","Different axes scales can make the same rate look steeper or flatter.",
          "Calculate a gradient for each graph in compatible units before comparing.",
          "A larger distance does not necessarily mean a faster speed if the trip took longer.",lambda s:rates_graph(s,1)),
        S("density","Compare masses for equal volumes","A mass–volume graph shows how heavy each given size is.",
          "Mass divided by volume gives density. A larger mass for the same volume means greater density.",
          "Density is mass per unit volume, not volume per unit mass.",lambda s:rates_graph(s,2)),
    ],[("Compound measure","A measure built from two quantities, such as distance per time."),("Density","Mass per unit volume.")]),
))


def transformation_figure():
    body=""
    for i in range(11):
        x=49+26*i
        body+=path([(x,20),(x,202)],"#d4e1f0",width=.8)
    for i in range(8):
        y=20+26*i
        body+=path([(49,y),(309,y)],"#d4e1f0",width=.8)
    body+=path([(49,124),(309,124)],"#344d69",width=1.65)+path([(179,20),(179,202)],"#344d69",width=1.65)
    body+=path([(127,98),(75,98),(127,46)],"#246393",fill="#a6d6eb",closed=True,width=2)
    body+=path([(231,98),(283,98),(231,46)],"#a94721",fill="#f9c7a1",closed=True,width=2)
    body+=label(106,91,"A",size=14)+label(254,91,"B",size=14)+label(321,127,"x")+label(180,15,"y")
    body+=label(180,221,"Reflection in the vertical axis",size=13)
    return draw("reflection-and-congruence","Two same-sized right triangles on opposite sides of a vertical coordinate axis",
                body,"Each image point is the same perpendicular distance from the mirror line as its original point.")


def enlargement_figure():
    centre=(53,178)
    obj=[(118,153),(157,153),(144,101)]
    image=[(2*x-centre[0],2*y-centre[1]) for x,y in obj]
    body=path(obj,"#246393",fill="#ccebf1",closed=True)+path(image,"#a94721",closed=True)
    body+="".join(path([centre,xy],"#4f6070",dash="4 4",width=1.5) for xy in image)
    body+='<circle cx="53" cy="178" r="4" fill="#24435d"/>'
    body+=label(42,195,"C")+label(134,147,"A",size=13)+label(233,69,"A′",size=13)+label(172,216,"each distance from C is doubled",size=13)
    return draw("enlarge-from-centre","A small and a larger triangle along common rays pointing away from centre C",
                body,"The centre stays fixed. The larger triangle is twice as far from it along each ray.")


def transform(s,mode=0):
    x,y,a,b=v(s,2,13),v(s,3,13,1),v(s,2,8,2),v(s,2,9,3)
    if mode==0:
        A=(x,y)
        B=(x+3*a,y-3*b)
        P=(x+a,y-b)
        return problem("Divide a line segment",f"Points A and B are {pair(*A)} and {pair(*B)}. P lies one third of the way from A to B.",
                       val("Give P as an ordered pair.",pair(*P),
                           [f"From A to B, the changes are {3*a} in x and {-3*b} in y.",
                            f"Use one third of each change. Add the resulting vector ({a}, {-b}) to A."],
                           "Scale both changes, then add them to the starting point.",kind="pairs",
                           wrong=(pair(a,-b),"That is the movement from A. Add it to A's coordinates.")),
                       written("Give the ratio AP : PB.","1 : 2.",["The first part is one third, leaving two thirds."],
                               "Compare the two part lengths.",fact=True))
    if mode==1:
        image=(-x+a,y-b)
        return problem("Reflect, then translate",f"Point P starts at {pair(x,y)}. Reflect it in the y-axis. Then move it {a} units right and {b} units down.",
                       val("Give the final ordered pair.",pair(*image),[f"The reflection gives {pair(-x,y)}.",
                                                                           f"Add {a} to x and subtract {b} from y."],
                           "Do the transformations in the stated order.",kind="pairs",wrong=(pair(-x-a,y-b),"You moved right first and then reflected. Follow the stated order.")),
                       written("Would swapping the order give the same point? Explain.","No. Reflecting after translating changes the sign of the rightward movement.",
                               ["Translation and reflection need not commute."],"Compare the effect on x in both orders."))
    if mode==2:
        C=(x,y)
        P=(x+a,y+b)
        image=(x+b,y-a)
        return problem("Rotate about a marked centre",f"Rotate point P {pair(*P)} 90° clockwise about centre C {pair(*C)}.",
                       val("Give the coordinates of the image.",pair(*image),
                           [f"Read the movement from C to P as ({a}, {b}).",f"A clockwise quarter turn sends it to ({b}, {-a}).",
                            "Add the new movement back to C."],
                           "Rotate the displacement from the stated centre.",kind="pairs",
                           wrong=(pair(x-b,y+a),"That is the displacement for an anticlockwise turn.")),
                       written("Explain whether rotating a whole triangle this way would change its side lengths.",
                               "No. The rotation keeps lengths and angles. The two triangles are congruent.",
                               ["A rigid rotation moves each vertex without stretching its distances to the other vertices."],
                               "Use preservation of lengths and angles."))
    image=(x-a,y-b)
    return problem("Describe a change from an object to an image",
                   f"A triangle has vertices {pair(x,y)}, {pair(x+2,y)} and {pair(x,y+1)}. Its corresponding image vertices are {pair(*image)}, {pair(x+2-a,y-b)} and {pair(x-a,y+1-b)}.",
                   val("Give the translation movement as an ordered pair (horizontal change, vertical change).",pair(-a,-b),
                       [f"Subtract the original coordinates from the image coordinates. Each vertex moves ({-a}, {-b})."],
                       "Find and compare matching vertex displacements.",kind="pairs",
                       wrong=(pair(a,b),"That is the movement backwards. Take image minus original.")),
                   written("Describe the transformation fully and compare the two areas.",
                           f"A translation {a} units left and {b} units down. The areas are equal.",
                           ["Translations preserve both side lengths and angles."],"State the direction and the amount in each axis."))


def enlarge(s,mode=0):
    x,y,a,b=v(s,2,11),v(s,3,11,1),v(s,2,9,2),v(s,2,8,3)
    k=2+s%5
    if mode==0:
        P=(x+a,y-b)
        image=(x+k*a,y-k*b)
        return problem("Scale distances from a centre",f"Enlarge a shape by scale factor {k} about {pair(x,y)}. One vertex is {pair(*P)}.",
                       val("Give the corresponding image coordinates.",pair(*image),
                           [f"The vertex displacement from the centre is ({a}, {-b}).",f"Multiply both changes by {k}, then add them to the centre."],
                           "Measure and scale the displacement from the centre.",kind="pairs",
                           wrong=(pair(k*P[0],k*P[1]),"That scales from the origin, not from the centre named in the question.")),
                       written("Explain how to draw the other vertices.","Draw a ray from the centre through each vertex. Multiply the original distance along each ray by the scale factor.",
                               ["The same centre and scale factor apply to every vertex."],"Use enough rays to reconstruct the full shape."))
    if mode==1:
        P=(x+a,y+b)
        I=(x+k*a,y+k*b)
        return problem("Find the scale factor from one ray",f"The centre of an enlargement is {pair(x,y)}. The vertex {pair(*P)} moves to {pair(*I)}.",
                       val("Find the scale factor.",k,
                           [f"The horizontal displacement from the centre changes from {a} to {k*a}. The vertical displacement has the same ratio."],
                           "Compare two matching distances from the centre.",wrong=(str(k*a),"Divide the new distance by the original distance.")),
                       written("Describe how to find an unknown centre with two pairs of corresponding vertices.",
                               "Extend the two lines which each join an original vertex to its image. Find their intersection.",
                               ["Each original vertex, its image and the centre lie on the same straight line."],
                               "Pick two pairs on distinct rays so the lines meet in one place."))
    before=(a*b if mode==2 else 2*(a+b))
    after=before*k*k if mode==2 else before*k
    return problem("Compare scale factors of lengths and areas",f"The rectangle measures {a} cm by {b} cm. It is enlarged by positive scale factor {k}.",
                   val("Find its new area in square centimetres." if mode==2 else "Find its new perimeter in centimetres.",after,
                       [f"The new sides are {k*a} cm and {k*b} cm.",
                        "Multiply the two new side lengths." if mode==2 else "Add the four new side lengths."],
                       "Use the factor in each length before calculating.",wrong=(str(before*k if mode==2 else before*k*k),
                           "Both dimensions increase, so use the square of the length factor for area." if mode==2 else "Perimeter is a length, so use the length factor only.")),
                   written("Give the multiplier for the other measure.",
                           mt(k if mode==2 else k*k)+".",
                           ["Perimeter scales by k. Area scales by k squared."],"Count the dimensions in each measure.",fact=True))


TRANSFORMS = ("transformations","Coordinates and transformations",lessons(
    L("rigid-moves","Coordinates and rigid transformations","Find points on segments and apply and describe reflections, translations and rotations.",[
        S("segment","Use a fraction of the movement","Find the change in x and in y from the first endpoint to the second.",
          "Scale both coordinate changes by the required fraction, then add the changes to the first point.",
          "A movement gives a pair of changes, not the final location.",lambda s:transform(s,0)),
        S("reflect-translate","Follow a pair of instructions in order","Mark one intermediate image so it is clear which transformation happened first.",
          "A reflection across the y-axis changes the sign of x. For translation, add the horizontal and vertical movements separately.",
          "Swapping the order of two transformations can change the final position.",lambda s:transform(s,1),transformation_figure()),
        S("rotate","Use a centre for a quarter turn","Mark the centre. Read each point as a horizontal and vertical displacement from it.",
          "A 90° clockwise turn sends the displacement (a, b) to (b, −a). Add the new displacement to the centre.",
          "A rotation not centred at the origin cannot be read by swapping x and y alone.",lambda s:transform(s,2)),
        S("describe","Compare an object with its image","Match the vertices before comparing their movements.",
          "A translation has the same movement for every vertex. A rigid sequence of reflections, rotations and translations preserves lengths and angles, so the image is congruent.",
          "An image can face a new way and still have exactly the same side lengths and area.",lambda s:transform(s,3)),
    ],[("Congruent","The same shape and the same size."),("Displacement","The horizontal and vertical change between two points.")],6),
    L("scale-and-area","Enlargement and changes in area","Enlarge from a centre, identify a scale factor and compare perimeters and areas.",[
        S("centre","Send a point along its ray","Mark the centre even when it lies inside or on the edge of the original shape.",
          "With a positive scale factor, each image point stays on the same ray from the centre through its original point.",
          "Use distances from the stated centre, not from the origin unless they are the same point.",lambda s:enlarge(s,0),enlargement_figure()),
        S("identify","Recover the centre and factor","Join each vertex to its corresponding image vertex.",
          "Extend two distinct vertex-to-image lines to find their intersection. The ratio of image distance to original distance gives the factor.",
          "The difference between the distances does not give the scale factor.",lambda s:enlarge(s,1)),
        S("area","Scale two lengths to find an area","Picture a square of one unit side becoming a larger square.",
          "Each new length is k times its old length. So area is k² times the old area.",
          "An enlargement of scale factor 3 multiplies a rectangle's area by 9.",lambda s:enlarge(s,2)),
        S("perimeter","Scale a one-dimensional measure","A perimeter is a total length, even when it travels around a whole rectangle.",
          "Every side changes by the same factor. Add them after scaling, or multiply the old perimeter by that factor.",
          "Area and perimeter have different multipliers.",lambda s:enlarge(s,3)),
    ],[("Centre of enlargement","The fixed point from which distances are measured."),("Scale factor","The ratio of a new length to its corresponding original length.")],6),
))


def sampling(s,mode=0):
    a,b,c=v(s,3,16),v(s,4,14,1),v(s,6,12,2)
    if mode==0:
        scenarios=[
            ("height of a sculpture", "Continuous", "Discrete", "Measured height can take any value in a range."),
            ("number of late buses", "Discrete", "Continuous", "A count takes separate whole-number values."),
            ("type of book borrowed", "Categorical", "Continuous", "Types are names, rather than measurements."),
        ]
        quantity,correct,decoy,reason=scenarios[s%3]
        other=next(n for n in ["Continuous","Discrete","Categorical"] if n not in {correct,decoy})
        return problem("Choose the kind of data",f"A student plans a {a}-day investigation. Their first variable is {quantity}.",
                       multi(s,"Choose the type of this variable.",correct,[decoy,other,"None of these"],
                             [reason],"Decide whether the results are measurements, counts or labels.",
                             "Decide whether a value can vary within a continuous range, be counted in steps or be named."),
                       written("Give one useful thing to check in a short trial of the collection method.",
                               "Check that observers record the same variable in the same units.",
                               ["A short trial catches unclear definitions before the full investigation."],
                               "Choose a trial which improves the collection plan."))
    if mode==1:
        pop=(a+b+c)*2
        return problem("Sample a whole group fairly",f"For a school travel study, there are {pop} names in the year. A student asks the first {a} learners to arrive at the bicycle shelter.",
                       multi(s,"Which new plan best reduces selection bias?",
                             "Use a random sample drawn from the full year list.",
                             ["Ask more learners at the bicycle shelter.","Choose only learners who arrive earliest.","Send the question to the cycling club only."],
                             ["A bicycle-shelter sample can over-represent cyclists. Selecting from the full year can include all ways of travelling."],
                             "Match the sample to the population named in the question.",
                             "A bigger sample at the same biased location can still miss people who come by other transport."),
                       written("Suggest a neutral question to ask.","How did you travel to school today?",
                               ["Offer reasonable categories and allow an ‘other’ option if needed."],
                               "Use a question that does not suggest a preferred answer."))
    return problem("Compare proportions from a trial",f"In a trial survey, {a} of {a+b} learners in one class chose music. In another class, {a+c} of {a+b+c} did.",
                   val("Give the proportion choosing music in the first class.",F(a,a+b),
                       ["Divide the count choosing music by all responses from the first class."],
                       "Use the appropriate class total.",wrong=(str(F(a,b)),"The denominator must include the learners who chose music.")),
                   written("Suggest a second useful question about the same learners.",
                           "For example, ask whether music lessons outside school differ between classes.",
                           ["A related question could help explain the first pattern. Try both questions on a small group before a full survey."],
                           "Link the next question to the original finding and test the wording."))


def scatter_picture():
    points=[(77,176),(109,130),(132,145),(151,117),(168,121),(215,96),(248,86),(260,60),(286,73)]
    body=path([(56,184),(319,184)],"#314963",width=1.7)+path([(56,184),(56,28)],"#314963",width=1.7)
    for x,y in points:
        body+=f'<circle cx="{x}" cy="{y}" r="4" fill="#236d95"/>'
    body+=label(201,211,"amount of practice",size=13)+label(50,21,"score",size=13)
    return draw("scatter-points","Nine scattered points broadly rise from left to right without lying exactly on one line",
                body,"The pattern suggests a positive association. A scatter graph alone does not establish what causes it.")



def pie_picture():
    art='<circle cx="178" cy="104" r="75" fill="#a9d8ee" stroke="#25567a" stroke-width="2"/>'
    art+='<path d="M178 104 L178 29 A75 75 0 0 1 253 104 Z" fill="#f2b37e" stroke="#25567a" stroke-width="2"/>'
    art+=label(209,77,"90°",size=15)+label(157,139,"other choices",size=13)
    art+=label(178,207,"one quarter of the data",size=14)
    return draw("pie-sector","A pie chart with one ninety-degree wedge shaded differently",
                art,"A category with one quarter of the observations takes one quarter of the full turn.")




def data_charts(s,mode=0):
    a,b,c=v(s,2,10),v(s,3,11,1),v(s,4,13,2)
    if mode==0:
        n=2*(a+b+c)
        return problem("Count data that belongs to two groups",
                       f"A class of {n} is sorted into groups A and B. Exactly {a} belong to A only, {b} to B only and {c} to both.",
                       val("Find the number in neither group.",a+b+c,[f"The groups cover {a+b+c} different learners. The overlap goes in just one region."],
                           "Add the three disjoint inner regions, then subtract from the whole.",
                           wrong=(str(a+b),"Include the intersection once before subtracting.")),
                       written("Draw a Venn diagram or a two-by-two Carroll diagram showing all four counts.",
                               table(["", "In B", "Not in B"], [["In A",str(c),str(a)],["Not in A",str(b),str(a+b+c)]]),
                               ["Place the overlap in the row for A and the column for B. Place the neither group outside both categories."],
                               "Separate yes/no for each attribute."))
    if mode==1:
        values=[a,b,c]
        cumulative=sum(values)
        return problem("Read tally and two-way data",
                       "A group records the number of tickets bought by each person."+table(["Tickets","Tally / count"],[["1",str(a)],["2",str(b)],["3",str(c)]]),
                       val("Find how many people are recorded.",cumulative,
                           [f"Each count tells you how many people are in one ticket category. Add {a}, {b} and {c}."],
                           "Add the frequencies, not the category labels.",wrong=(str(a+2*b+3*c),"That is the number of tickets bought. Count the people for this question.")),
                       written("Find how many tickets were bought in total.",mt(a+2*b+3*c),
                               [f"One-ticket buyers contribute {a}, two-ticket buyers contribute {2*b} and three-ticket buyers contribute {3*c} tickets."],
                               "Multiply each value by its frequency before adding."))
    if mode==2:
        return problem("Compare two bar series",f"A library compares the number of coding and art club visits in two weeks."+table(
                          ["Week","Coding","Art"],[["1",str(a),str(b)],["2",str(a+c),str(b+c+2)]]),
                       val("Find the total number of visits in week 2.",a+b+2*c+2,[f"Add the coding and art counts for that week."],
                           "Read both series for the same week.",wrong=(str(a+b+c),"The second week has a new value for both series.")),
                       written("Which display makes totals easier to see, a dual bar chart or a compound bar chart?",
                               "A compound (stacked) bar chart.",
                               ["The top of a stacked bar reaches the total. A dual bar chart can make the separate categories easier to compare."],
                               "Match the display to the question being answered.",fact=True))
    slots=[3,4,5,6,8,9,10,12][s%8]
    total=slots*(a+b)
    count=(1+b%(slots-1))*(a+b)
    turn=F(360*count,total)
    return problem("Convert a category count into a pie sector",f"From a group of {total}, {count} learners prefer puzzles. Other learners chose different activities.",
                   val("Give the angle for puzzles in degrees.",turn,
                       [f"The category is {count} out of {total}, which is {mt(F(count,total))}.",f"Multiply this fraction by 360°."],
                       "Multiply the fraction of the group by 360°.",wrong=(str(F(100*count,total)),"That number describes a percentage. Multiply by 360° to get an angle.")),
                   written("Explain what all sector angles must add to.","360°.",
                           ["A complete pie chart is a full circle."],"Check the whole display.",fact=True))


def charts_b(s,mode=0):
    a,b,c=v(s,3,12),v(s,4,13,1),v(s,5,11,2)
    if mode==0:
        vals=[(a,b),(a+5,b+c),(a+10,b+c-2)]
        return problem("Read changes over time","A room-temperature logger gives these readings."+table(["Minute","Temperature in °C"],[[str(x),str(y)] for x,y in vals]),
                       val("Give the rise in temperature between the first two readings, in degrees Celsius.",c,
                           [f"Subtract the first reading, {b}°, from {b+c}°."],"Compare values from the specified times.",
                           wrong=(str(b+c),"You found the new temperature. Subtract the starting temperature to find the rise.")),
                       written("Sketch an appropriate graph and say what happens after the middle reading.",
                               "Use time on the horizontal axis. The temperature falls by 2 degrees.",
                               ["Plot each pair in time order, then connect neighbouring readings."],"Use a time series to show the order.",fact=True))
    if mode==1:
        start=a*10
        intervals=[(start,start+10,b),(start+10,start+20,b+c),(start+20,start+30,c)]
        return problem("Plot a frequency polygon",f"The data are grouped into intervals."+table(["Class interval","Frequency"],
                      [[m(f"{lo}\\leq x<{hi}"),str(f)] for lo,hi,f in intervals]),
                       val("Find the x-coordinate of the point for the middle interval.",start+15,
                           [f"The middle group runs from {start+10} up to {start+20}. Its midpoint is {start+15}."],
                           "Plot the class midpoint against its frequency.",
                           wrong=(str(start+10),"This is an edge of the class. A frequency polygon uses the midpoint.")),
                       written("Give the other two points to plot and describe how the polygon is drawn.",
                               pair(start+5,b)+" and "+pair(start+25,c)+". Join the three points in order.",
                               ["Use the frequency of each interval as the y-coordinate."],"Find each midpoint and pair it with its frequency."))
    if mode==2:
        xs=[a+i for i in range(4)]
        ys=[b+2*i+(1 if i==2 else 0) for i in range(4)]
        return problem("Interpret paired observations","A club measures practice sessions and score for four learners."+table(
                      ["Sessions","Score"],[[str(x),str(y)] for x,y in zip(xs,ys)]),
                       val("Use the data table to find the score of the learner with the largest number of sessions.",ys[-1],
                           [f"The largest session count is {xs[-1]}. Use the score from that same row."],
                           "Keep each observation's two values paired.",wrong=(str(ys[0]),"You read the smallest session count.")),
                       written("Which graph fits these paired data and what association do you expect?",
                               "A scatter graph. The values show a positive association.",
                               ["The scores tend to rise as the number of sessions rises. That does not establish cause."],
                               "Use one point per learner and describe the trend."))
    stems=[a,a+1]
    low=[0,b%6,9]
    high=[1,c%8+1,9]
    high.sort()
    vals=sorted([10*a+x for x in low]+[10*(a+1)+x for x in high])
    answer=F(vals[2]+vals[3],2)
    return problem("Read a stem-and-leaf diagram","One group records these integer scores."+table(["Stem","Leaves"],
                   [[str(stems[0])," ".join(map(str,low))],[str(stems[1])," ".join(map(str,high))]])+
                    p(f"Key: {a} | 9 means {10*a+9}."),
                   val("Find the median score.",answer,
                       [f"The two middle values are {vals[2]} and {vals[3]}.",f"Take their mean."],
                       "Use both central values when the number of observations is even.",
                       wrong=(str(vals[2]),"There are six scores. Use the average of positions 3 and 4.")),
                   written("Explain how to add a second group to make a back-to-back diagram.",
                           "Place its leaves on the other side of the same stems.",
                           ["Use a common key. Arrange the left-hand group's leaves from the stem outwards in increasing order."],
                           "Use shared stems so scores in both groups are directly comparable."))


def data_inference(s,mode=0):
    centre=v(s,20,21)
    a,b=v(s,2,12,1),v(s,3,11,2)
    if mode==0:
        group=[centre-a,centre,centre,centre+b,centre+b+2]
        middle=centre
        result=group[-1]-group[0]
        return problem("Compare representative values",f"Group A records {', '.join(map(str,group))}. A second group has median {centre+1} and range {result+2}.",
                       val("Find the range of group A.",result,[f"Subtract the smallest result, {group[0]}, from the largest result, {group[-1]}."],
                           "Find the spread from maximum minus minimum.",wrong=(str(group[-1]),"Range is a difference, not just the largest value.")),
                       written("Give the mean, median and mode of A. Compare its median and range with B.",
                               f"Mean {mt(F(sum(group),5))}, median {middle}, mode {centre}. Group B has the higher median and larger range.",
                               ["Add the five values and divide by five for the mean. Read the middle value and repeated value separately."],
                               "Compare one measure of centre and one of spread."))
    if mode==1:
        f=[a,a+b,b]
        mids=[centre,centre+10,centre+20]
        ans=F(sum(k*x for k,x in zip(f,mids)),sum(f))
        return problem("Estimate a grouped mean","An experiment records weights in grouped intervals."+table(
                      ["Weight w in grams","Frequency"],[[m(f"{x-5}\\leq w<{x+5}"),str(k)] for k,x in zip(f,mids)]),
                       val("Estimate the mean weight using the class midpoints. Give the exact value of the estimate.",ans,
                           [f"Use midpoints {mids[0]}, {mids[1]} and {mids[2]}. Multiply each by its class frequency.",
                            f"Divide the total of these products by the total frequency {sum(f)}."],
                           "Calculate the frequency-weighted mean of the midpoints.",
                           wrong=(str(centre+10) if ans!=centre+10 else str(centre+20),"Use the number of observations in each interval as a weight.")),
                       written("State the modal class and explain why the mean is only estimated.",
                               m(f"{centre+5}\\leq w<{centre+15}")+". Its frequency is largest. The exact values within classes are unknown.",
                               ["The table gives intervals of all actual values. Midpoints stand in for those unknown values."],
                               "Compare class frequencies and describe the limitation of grouping."),
                       written(f"A second group has frequencies {b}, {a+b} and {a} in those same intervals. Compare the estimated means.",
                               (f"Its estimated mean is {mt(F(sum(k*x for k,x in zip(f[::-1],mids)),sum(f)))} g. "
                                + ("Both estimates are equal." if a==b else "The second group's estimate is lower." if a<b else "The second group's estimate is higher.")),
                               ["Use the same midpoints, and use the second group's frequency in each row.",
                                "The total frequency is the same for both groups, so compare the two weighted totals."],
                               "Calculate and compare estimates using the same grouping."))

    if mode==2:
        n=30+a*3
        old=40+b*2
        new=old+3
        # A truncated vertical scale magnifies the ratio of displayed bar lengths.
        baseline=old-3
        return problem("Critique a chart that makes a change look large",
                       f"A chart shows a score rising from {old} to {new}. The bars start at {baseline}, and a headline says the score doubled. The survey had {n} responses.",
                       val("Find the actual increase in the score.",new-old,
                           [f"Subtract {old} from {new}. The height of the visible bars depends on where the axis starts."],
                           "Compare the labelled scores rather than their visible bar lengths.",
                           wrong=(str(new-baseline),"The lower bar also has height above the displayed baseline.")),
                       written("Explain why the headline is misleading and improve the display.",
                               "Only the visible bar length doubles. The original score does not. For a bar chart, start the numerical axis at zero.",
                               [f"The old visible height is {old-baseline} and the new visible height is {new-baseline}.",
                                "Use a consistent scale and label what the scores represent."],"Separate changes in drawn height from changes in the data."))
    total=a+b+centre
    return problem("Review results and plan another question",
                   f"A student predicts most of {total} library visits will be made by walkers. The tally has {centre} walking, {a} cycling and {b} other visits.",
                   val("Find the fraction of visits made by walkers.",F(centre,total),["Divide the number of walking visits by all the visits."],
                       "Use total visits as the denominator.",wrong=(str(F(centre,a+b)),"Include walkers in the total as well.")),
                   written("Say whether the result supports the prediction and suggest a fairer follow-up if all visits were counted on one sunny day.",
                           ("The result supports the prediction." if centre*2>total else "This result does not show that a majority walked.")
                           +" Repeat on a mixture of days and times.",
                           ["A sample can describe its own results. Its time and conditions limit a broader conclusion."],
                           "Evaluate the finding, then plan a better collection."))


def stats_cycle_picture():
    positions=[(85,60,"Ask"),(259,60,"Collect"),(259,162,"Analyse"),(85,162,"Review")]
    body=""
    for x,y,word in positions:
        body+=f'<rect x="{x-48}" y="{y-18}" width="96" height="36" rx="6" fill="#cde9f3"/>'
        body+=label(x,y+5,word,size=15)
    segments=[[(134,60),(205,60)],[(259,80),(259,140)],[(210,162),(135,162)],[(85,142),(85,82)]]
    for pts in segments:
        body+=path(pts,"#2b5977",width=2)
    arrows=[[(197,55),(205,60),(197,65)],[(254,132),(259,140),(264,132)],[(143,157),(135,162),(143,167)],[(80,90),(85,82),(90,90)]]
    for points in arrows:
        body+=path(points,"#2b5977",width=2)
    body+=label(177,217,"use the result to improve the next question",size=12)
    return draw("statistical-cycle","Four steps connected in a loop: ask, collect, analyse, review",body,
                "Look back at the question and decide what to change or investigate next.")


STATS=("statistics","Statistics",lessons(
    L("data-collection","Plan and trial data collection","Choose data types and a sampling plan, then check for bias before collecting more data.",[
        S("data-types","Choose information that answers the question","List what you will record and what counts as one observation.",
          "Categories are labels. Counts are discrete numbers. Continuous measurements can take any value within a range.",
          "Numbers used as labels, such as route numbers, are categorical.",lambda s:sampling(s,0)),
        S("bias","Match your sample to the population","Identify the whole group you want to learn about.",
          "A sample should give relevant groups a chance to be selected. A bigger sample does not automatically fix selection bias.",
          "Surveying people at a location tied to one possible answer may over-represent that answer.",lambda s:sampling(s,1)),
        S("pilot","Trial questions and follow-up ideas","Test the questions and the recording method with a small group first.",
          "Use the trial to fix unclear categories or wording, then choose a related question that tests your next idea.",
          "Do not compare raw counts when the groups contain different numbers.",lambda s:sampling(s,2),stats_cycle_picture()),
    ],[("Population","The whole group the investigation is about."),("Pilot","A small test of your collection method before using it fully.")]),
    L("categorical-displays","Display categories and frequencies","Organise counts in tables or diagrams and choose how to show groups and proportions.",[
        S("venn-carroll","Separate two yes-or-no attributes","Make four places: both, first only, second only and neither.",
          "A Venn diagram shows the overlap directly. A Carroll diagram uses a row and a column for the two answers.",
          "The intersection is counted once. The neither group is outside both circles.",lambda s:data_charts(s,0)),
        S("frequency","Read tallies and tables","A tally collects marks for each category. A two-way table counts combinations of two variables.",
          "Check row and column totals. A frequency is a count and is different from the data value being counted.",
          "The number of observations is the sum of the frequencies, not the sum of the category labels.",lambda s:data_charts(s,1)),
        S("bar","Compare sets of bars","Look at the question before choosing an arrangement.",
          "Dual bars place groups next to each other. Compound bars stack groups, which makes totals easy to see.",
          "Find both counts for the same category or date before calculating its total.",lambda s:data_charts(s,2),
          bars("separate-bars",["Monday","Tuesday","Wednesday"],[12,18,15],"On this bar chart the heights show counts. Compare the same scale.")),
        S("pie","Turn a fraction into a sector","Treat the whole circle as every observation in the group.",
          "A category's share of 360° is its frequency divided by the total, multiplied by 360°.",
          "A percentage and a sector angle describe the same proportion in different units.",lambda s:data_charts(s,3),pie_picture()),
    ],[("Frequency","The number of times a value or category is recorded."),("Sector","A slice of a circle bordered by two radii.")],6),
    L("chart-choices","Time series, scatter and stem-and-leaf displays","Choose and interpret a display for time, pairs, groups or exact values.",[
        S("time","Connect successive readings in time","Place time on the horizontal axis and use the recorded units.",
          "Join neighbouring time points to see rises and falls. The graph only shows the observations available.",
          "A new reading and a change from the previous reading are different values.",lambda s:charts_b(s,0)),
        S("polygon","Plot grouped data at the midpoints","Find the halfway value of each class interval.",
          "For a frequency polygon, plot class midpoint against frequency and join the points in order.",
          "Plot at the middle of the interval rather than at either boundary.",lambda s:charts_b(s,1)),
        S("scatter","Keep paired data together","Treat each observation as one x-value and one y-value.",
          "A scatter graph can show a positive or negative association. It does not on its own explain the pattern.",
          "Mixing the values from different rows changes the relationship.",lambda s:charts_b(s,2),scatter_picture()),
        S("stem","Order scores around a shared stem","Write a key and sort the leaves before finding an average or comparing groups.",
          "A stem-and-leaf diagram keeps individual data values visible. A back-to-back diagram shares the stems between two groups.",
          "The stem is not a data value by itself. Read it together with one leaf.",lambda s:charts_b(s,3)),
    ],[("Time series","Measurements shown in time order."),("Association","A visible link or trend between two variables.")],6),
    L("compare-and-question","Compare distributions and check conclusions","Compare averages and spread, recognise misleading graphics and improve a statistical study.",[
        S("summaries","Choose a centre and a spread","Read a sorted set before finding its middle or its repeated value.",
          "Mean uses every value, median gives the middle, and mode gives the most frequent. Range is largest minus smallest.",
          "One summary measure may hide differences seen in another measure.",lambda s:data_inference(s,0)),
        S("grouped","Use a midpoint for each group","Keep track of both the midpoint and the number of values it represents.",
          "Frequency times midpoint gives the estimated total for one group. Divide the sum of these products by all observations.",
          "A grouped estimate can give a different result from the exact mean.",lambda s:data_inference(s,1)),
        S("misleading","Inspect an infographic's scale","Find the units, numbers, axes and group size before trusting a caption.",
          "A cut-off bar scale can make a small change look much bigger. A picture's size can also suggest a misleading comparison.",
          "Judge a claim from the underlying data values, rather than just how the picture looks.",lambda s:data_inference(s,2)),
        S("review","Use results to plan the next investigation","Decide which claim your data support and where its limits are.",
          "Ask a statistical question, collect suitable data, analyse it and reconsider both your conclusion and your method.",
          "A pattern on one chosen day need not describe every day.",lambda s:data_inference(s,3),stats_cycle_picture()),
    ],[("Modal class","The class interval with the largest frequency in the given table."),("Range","Largest value minus smallest value.")],6),
))


def timed(s,mode=0):
    a,b,c=v(s,3,11),v(s,4,9,1),v(s,2,12,2)
    if mode==0:
        c = 2+(c%(a+b-1))
        old=2*a+2*b
        total=F(old,2)
        gain=F(c,2)
        return problem("Non-calculator: a craft sale",f"A sale starts with {old} packs in a ratio of {a} red to {b} blue. One half of all packs are sold before lunch. After lunch the organisers sell the equivalent of {mt(gain)} two-pack boxes. One half-box means one pack.",
                       val("Find the number of packs sold before lunch.",total,["The total was even. Divide it by 2."],
                           "Use the fraction of the full quantity.",wrong=(str(a),"The fraction applies to both colours together.")),
                       written("Find how many packs were left after both sales.",mt(total-c),
                               [f"The afternoon sale represents {c} packs. Subtract those from the packs remaining at lunch."],
                               "Translate the fractional number of boxes into packs."),
                       written("Find how many red packs there were before the first sale.",mt(2*a),
                               ["There were twice as many packs as one complete set of ratio parts."],
                               "Find the value of one ratio part.",fact=True))
    if mode==1:
        family=[(3,4,5),(5,12,13),(8,15,17)][b%3]
        a,b,c=(a*side for side in family)
        return problem("Non-calculator: a right-angled court","A right-angled triangular court has legs "+str(a)+" m and "+str(b)+" m.",
                       val("Find the diagonal edge length, in metres.",c,[f"Square the legs and add to get {c*c}. Take the square root."],
                           "Use Pythagoras’ theorem.",wrong=(str(a+b),"Use the direct distance rather than the length along the legs.")),
                       written("The long edge is marked in three equal lengths. Write the length of each part.",
                               mt(F(c,3))+" m.",["Divide the edge length by 3."],"Divide the length into equal parts.",fact=True),
                       written("Find the triangular court area.",mt(F(a*b,2))+" square metres.",
                               ["The two legs are perpendicular, so one can be base and the other height."],
                               "Use one half times base times perpendicular height."))
    if mode==2:
        total=a+b+c
        return problem("Non-calculator: compare game results",f"A class records wins on three days. There are {a}, {b} and {c} wins respectively.",
                       val("Find the mean number of wins per day.",F(total,3),[f"The total is {total}. Divide it by three days."],
                           "Calculate the mean using the number of days.",wrong=(str(total),"The total comes first. A mean needs the count of values as its denominator.")),
                       written("Find the median and range.",
                               f"Median {sorted([a,b,c])[1]}. Range {max(a,b,c)-min(a,b,c)}.",
                               ["Sort the three values. Use the centre value for the median and the extremes for the range."],
                               "Give a measure of centre and a measure of spread."),
                       written("Would three days alone establish a long-term change?","No. More observations can show whether the pattern continues.",
                               ["A short set may be affected by ordinary variation."],"State a limitation of the sample.",fact=True))
    if mode==3:
        initial=250+20*a
        q=F(100+2*b,100)
        final=initial*q*q
        return problem("Calculator: changing sign-up numbers",
                       f"A club starts with {initial} sign-ups. Its total grows by {2*b}% in each of two years.",
                       val("Find the predicted final total to the nearest whole person.",int(final+F(1,2)),
                           [f"Multiply the initial total by {decimal(q)} twice. The unrounded result is {decimal(final)}."],
                           "Apply the change to the new amount each year.",
                           wrong=(str(int(initial*(2*q-1)+F(1,2))),"This applies both increases to the first year's total. Update the total before the second increase.")),
                       written("Explain how rounding during the calculation can affect the answer.","A rounding change in year one is multiplied during year two.",
                               ["Keep the exact or calculator value until the final result."],"Round only when the question requests it.",fact=True))
    if mode==4:
        r=a+F(b,10)
        area=round(float(r*r)*pi,2)
        return problem("Calculator: measure a circular area",f"A circular flower bed has diameter {decimal(2*r)} m.",
                       val("Find its area in square metres, rounded to 2 decimal places.",area,
                           [f"Halve the diameter to get a radius of {decimal(r)} m.",
                            f"Multiply the square of this radius by π."],"Use radius, square it and multiply by π.",
                           wrong=(str(round(float(4*r*r)*pi,2)),"You squared the diameter. First halve it to get the radius."),
                           kind="approximate",tolerance=0.004999),
                       written("Find how many 3-square-metre packs are needed to cover the bed.",
                               f"{ceil(float(r*r)*pi/3)} packs.",
                               ["Divide the exact area by 3, then round up because part of a pack still uses a whole pack."],
                               "Choose a rounding direction that fits the situation."))
    depth=a+2
    volume=(b+c)*depth
    mass=F(volume*(c+4),10)
    return problem("Calculator: compare mass per unit volume",
                   f"A solid block has volume {volume} cubic centimetres and mass {decimal(mass)} grams.",
                   val("Calculate its density in grams per cubic centimetre.",mass/volume,
                       ["Use mass divided by volume."],"Choose the numerator from the required units.",
                       wrong=(str(volume/mass),"These units say grams per cubic centimetre, so put the mass first.")),
                   written(f"A same-material block has volume {2*volume} cubic centimetres. Calculate its mass.",
                           f"{decimal(2*mass)} grams.",["With density fixed, doubling the volume doubles the mass."],
                           "Use density as the mass of one cubic centimetre."))


CHECKPOINT=("checkpoint-review","Mixed Checkpoint practice",lessons(
    L("checkpoint-no-calculator","Mixed practice without a calculator",
      "Practise the written methods and quick checks used in the non-calculator part of Checkpoint.",[
        S("number","Write enough working to show your method","For a mixed revision session, choose a method before carrying out each calculation.",
          "Use equivalent fractions, cancellation and exact integer steps. Leave a line that a reader can follow.",
          "An answer typed into a short check can still benefit from written working.",lambda s:timed(s,0)),
        S("geometry","Draw and label a useful model","Sketch the shape and mark its relevant angles and lengths.",
          "Use the right angle to identify the hypotenuse. Keep any exact fractions until a value must be rounded.",
          "Do not apply the Pythagoras rule before checking the right angle.",lambda s:timed(s,1),pythagoras_figure()),
        S("statistics","Check what each statistic describes","Sort the data when the order matters.",
          "For each answer, say what count, centre or spread you have calculated. Use exact values when a fraction is simpler.",
          "The sum of a set gives only the first step of the mean.",lambda s:timed(s,2)),
    ],[("Non-calculator practice","Working that uses exact arithmetic and written methods."),("Evidence","Numbers, diagrams or rules that support a conclusion.")],6),
    L("checkpoint-calculator","Mixed practice with a calculator",
      "Use a calculator accurately and explain why a method and rounding decision fit each question.",[
        S("round-once","Keep unrounded working down to the final line","Save the full result of one step before using it in the next.",
          "For repeated percentage changes, multiply each current value by its proper factor. Round at the end.",
          "Rounding the intermediate value can shift the final answer.",lambda s:timed(s,3),percent_figure()),
        S("area","Use the right formula and unit","Mark which measurement is given before deciding what to type.",
          "A circle's area uses the radius squared. Keep a full π value when a practical calculation follows.",
          "The full width of a circle is a diameter, not its radius.",lambda s:timed(s,4),circle_figure()),
        S("units","Read a compound unit as a division","Use the word ‘per’ to identify the quantity underneath.",
          "Grams per cubic centimetre means grams divided by cubic centimetres. Multiply density by volume to recover mass.",
          "Use the units to check whether your quotient is the right way round.",lambda s:timed(s,5)),
    ],[("Compound unit","A unit formed from two measures, such as grams per cubic centimetre."),("Premature rounding","Rounding a value before it is used in a later step.")],6),
))


STAGE_9 = (NUMBER, ALGEBRA, SHAPES, CALC, PROB, ANGLES, SEQUENCES, TRANSFORMS, STATS, CHECKPOINT)


if __name__ == "__main__":
    build_stage(9, STAGE_9, __file__, versions={
        "number-and-calculation": "1.0.1",
        "algebraic-representation": "1.0.1",
    })
