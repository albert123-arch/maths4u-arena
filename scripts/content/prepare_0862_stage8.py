"""Stage 8 Cambridge Lower Secondary Mathematics lesson and question sources."""
from decimal import Decimal
from fractions import Fraction as F
from math import gcd, lcm, pi

from prepare_0862_support import (
    Lesson, Section, build_stage, choose, field, figure, label, m, p, part, path, problem, table, tex,
)


def number(prompt, result, steps, method, *, units="", display=None, wrong=None, tolerance=None, answer_label=None):
    if isinstance(result, Decimal):
        result = format(result, "f")
    value = tex(result) if display is None else display
    answer = m(value) + (f" {units}" if units else "")
    return part(prompt, answer, steps, method,
                field(result, "number" if tolerance is None else "approximate", label=answer_label or units or "Your answer", tolerance=tolerance), wrong)


def selection(prompt, correct, others, steps, method, s, *, wrong=None):
    return part(prompt, correct, steps, method, choose((correct, *others), s), wrong)


def reasoning(prompt, answer, steps, method):
    return part(prompt, answer, steps, method)


def form(prompt, result, pretty, steps, method, *, variable="x"):
    return part(prompt, m(pretty), steps, method, field(result, "polynomial", label="Expression", variables=(variable,)))


def ordered_pair(prompt, x, y, steps, method):
    return part(prompt, m(f"({x},{y})"), steps, method, field(f"({x},{y})", "pairs", label="Coordinates"))


def ratio(prompt, a, b, steps, method):
    return part(prompt, m(f"{a}:{b}"), steps, method, field(f"{a};{b}", "ratio", label="Ratio"))


def rectangle(x, y, w, h, fill="#e0effc", stroke="#43729d", radius=0):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{radius}" fill="{fill}" stroke="{stroke}"/>'


def dot(x, y, fill="#145f93", r=4):
    return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}"/>'


def circle(x, y, r, fill="none", stroke="#246393", width=2):
    return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}" stroke="{stroke}" stroke-width="{width}"/>'


def diagram(key, title, parts, caption, h=170):
    return figure("stage-8", key, title, "".join(parts), caption, h=h)


def number_line(key, lo, hi, marked, title, caption, *, open_ends=()):
    px = lambda n: 33 + (n - lo)*284/(hi-lo)
    parts = [path([(23, 71), (334, 71)])]
    if len(marked) > 1:
        parts.append(path([(px(marked[0]), 71), (px(marked[-1]), 71)], "#d26211", width=4))
    for n in range(lo, hi+1):
        parts.extend((path([(px(n), 66), (px(n), 77)], "#56718b", width=1.1), label(px(n), 97, str(n), size=12)))
    for n in marked:
        parts.append(circle(px(n),71,5,"#fbfdff" if n in open_ends else "#d26211","#d26211"))
    return diagram(key, title, parts, caption, h=115)


def strips(key, rows, title, caption):
    # Width is the same whole on every row. Each triple gives parts, shaded parts and label.
    parts = []
    for row, (n, shaded, name) in enumerate(rows):
        y = 25+39*row
        for col in range(n):
            parts.append(rectangle(round(22+250*col/n, 2), y, round(250/n,2), 23, "#5faddd" if col < shaded else "#edf3f9"))
        parts.append(label(307,y+17,name,size=13))
    return diagram(key,title,parts,caption,h=31+39*len(rows))


def values(a):
    return m(r",\;".join(tex(x) for x in a))


def tenth(s):
    a = 22+s%113
    shift = 1 + s%2
    factor = Decimal(10)**-shift
    original = Decimal(a)/10
    result = original/factor
    return problem("Dividing by a small decimal", f"A label shows a length of {m(original)} m.",
        number(f"Calculate {m(original)} ÷ {m(factor)}.",result,
               [f"{m(factor)} is one of {10**shift} equal parts of 1. Dividing counts how many of these parts fit.",
                f"Multiply both numbers in the division by {10**shift}. The divisor becomes 1."],
               "Make the divisor 1 by scaling both numbers.",wrong=(str(original*factor),"The result must grow. Dividing by a number between zero and one counts smaller groups.")),
        number(f"Calculate {m(original)} × {m(factor)}.", original*factor,
               ["Multiplying by one tenth or one hundredth makes the value smaller. Move the digits to lower place values."],
               "Use the correct place-value shift."))


def significant(s):
    a = 31+s%56
    b = 30+9*(s//56%8)
    n = Decimal(a)/10+Decimal(b)/1000
    expected = n.quantize(Decimal("0.1"), rounding="ROUND_HALF_UP")
    integer = Decimal(a)*100+Decimal(b)
    nearest = integer.quantize(Decimal("1E+2"), rounding="ROUND_HALF_UP")
    return problem("Significant figures on a length label",f"A printed label records {m(n)} cm.",
        number("Write the length to two significant figures.",expected,
               [f"Start at the first non-zero digit. Keep the units and tenths digits. Look at the hundredths digit of {m(n)} before rounding.",
                f"The rounded length is {m(expected)} cm."],
               "Keep two significant digits and use the next digit to round.",units="cm",wrong=(str(n),"The measurement is still unrounded. Keep two significant figures.")),
        number(f"A separate measurement is {m(integer)} mm. Round it to two significant figures.",int(nearest),
               ["For this four-digit measurement keep the thousands and hundreds digits. Replace dropped places by zero."],
               "Keep the place value when dropping digits.",units="mm"))


def decimal_order(s):
    a = 10+s%18
    b = 2+s//18%7
    low, high = Decimal(f"-{a}.{b}8"), Decimal(f"-{a}.{b}")
    return problem("Comparing decimal readings", f"Two screen readings are {m(high)} and {m(low)}.",
        number("Write the lower reading.",low,
               [f"Extra zeroes do not change a decimal. Compare {m(f'-{a}.{b}0')} with {m(low)} on a number line.",
                "Farther left means smaller. For negative readings, the greater distance from zero gives the smaller reading."],
                "Compare negative decimals using place values and position.",wrong=(str(high),"The smaller negative number is farther from zero.")),
        number("Give the positive difference between the two readings.", high-low,
               ["A difference is a distance. Subtract the lower reading from the higher one."],"Subtract the values in the correct order."))


def signed_product(s):
    a, b = 4+s%19, 3+s//19%10
    return problem("Signed movements",f"Each move lowers a marker by {a} points. A game counts {b} moves.",
        number("Calculate the overall change.",-a*b,
               [f"Each move is {m(-a)}. The magnitude of the change is {m(f'{a}\\times {b}={a*b}')}. One negative factor gives a negative result."],
               "Multiply the magnitudes and apply the sign.",wrong=(str(a*b),"Falling describes a negative change.")),
        number(f"In a different rule, an adjustment of {m(a*b)} is divided by {m(-b)}. Find the new adjustment.",-a,
               ["A positive number divided by a negative number has a negative result. Use multiplication to check."],
               "Divide the magnitudes and apply the sign."))


def operation_order(s):
    a, b = 3+s%23, 2+s//23%5
    shown = f"{a}+2\\times({b}^2-3)"
    expected = a+2*(b*b-3)
    return problem("Calculate in the right order",f"An activity card shows {m(shown)}.",
        number("Calculate its value.",expected,
               [f"Inside the bracket, calculate {m(f'{b}^2={b*b}')} first. The bracket becomes {m(b*b-3)}.",
                f"Next multiply {m(b*b-3)} by 2. Then add {a}."],
               "Work through brackets, powers, multiplication and addition.",
               wrong=(str((a+2)*(b*b-3)),"Finish the multiplication before adding the first number.")),
        number(f"Now calculate {m(f'({a}+2)\\times({b}^2-3)')}.",(a+2)*(b*b-3),
               ["The first bracket changes the order. Complete both brackets before multiplying."],"Use brackets to identify the two factors."))


def index_rules(s):
    base, a, b = 2+s%3, 2+s//3%7, 2+s//21%5
    total = a+b
    return problem("Combining powers",f"An expression contains {m(f'{base}^{a}\\times {base}^{b}')} and {m(f'{base}^{a}\\div {base}^{a}')}.",
        number(f"Write the product as a power of {base}. Give the power.",total,
               [f"The first power contains {a} copies of {base} multiplied together. The second contains {b}.",
                f"The product therefore has {m(f'{a}+{b}={total}')} copies."],
               "Add exponents on powers that share a base.",
               wrong=((str(a*b),"Count all the copies of the base. Add the exponents.") if a*b!=total else None)),
        number("Find the value of the division expression.",1,
               [f"Dividing a non-zero number by itself gives 1. Subtracting equal exponents also gives {m(f'{base}^0=1')}."],
               "Link the index law to an equal non-zero quotient."))


def roots_signed(s):
    a,b=3+s%14, 2+s//14%12
    return problem("Square and cube roots", f"One card shows {m(a*a)}. A second card shows {m(-(b**3))}.",
        number(f"Find {m(rf'\sqrt[3]{{-{b**3}}}')}.",-b,
            [f"Check by cubing. There are three negative factors in {m(f'(-{b})^3=-{b**3}')}, so the result is negative."],
            "Find the signed number whose cube is the negative card.",wrong=(str(b),"The cube of a positive number is positive.")),
        reasoning(f"Give the two solutions of {m(f'x^2={a*a}')}.",f"{m(-a)} and {m(a)}",
            [f"Both {m(f'{a}^2={a*a}')} and {m(f'(-{a})^2={a*a}')} have a positive product."],
            "Check the square of each sign."))


def factors(s):
    a,b=2+s%19, 3+s//19%11
    n,k=6*a, 10*b
    d = gcd(n,k)
    common = ", ".join(str(i) for i in range(1,d+1) if n%i==k%i==0)
    return problem("Making identical activity packs", f"A class has {n} wooden counters and {k} card squares. All objects must be used.",
        number("What is the greatest number of identical packs they can make?",d,
               [f"A possible pack count divides both {n} and {k} exactly.",
                f"The common factors are {common}. The greatest is {m(d)}."],
               "Find the highest common factor of the two counts."),
        number("How many objects are in each pack?", (n+k)//d,
               [f"Each pack gets {n//d} counters and {k//d} squares.", "Add the two parts of one pack."],
               "Divide both counts by the greatest number of packs."))


def repeating(s):
    a=3+s%23
    b=4+s//23%18
    end=lcm(a,b)
    return problem("Two repeating bells",f"A workshop has bells that ring every {a} minutes and every {b} minutes. They ring together at opening.",
        number("How many minutes later will they ring together again?",end,
               [f"Write multiples of {a} and {b}. The first positive number on both lists is {end}."],
               "Find the lowest common multiple.",units="minutes"),
        number(f"How many times does the {a}-minute bell ring in that time, excluding the opening ring?",end//a,
               ["Divide the elapsed time by the interval for this bell."],"Count equal time intervals."))


def rational_family(s):
    a,b=2+s%22, 3+s//22%12
    numerator=a*b+1
    shown=m(rf"-\frac{{{numerator}}}{{{b}}}")
    return problem("Sorting number families", f"One tile shows {shown}. Another tile shows {m(-a)}.",
        selection(f"Which is the smallest family containing {shown}?", "Rational numbers",
                  ("Natural numbers","Integers","Positive whole numbers"),
                  [f"{shown} is a ratio of integers with a non-zero denominator. The division has a remainder, so the value is not an integer."],
                  "Check whether the fraction is an integer.",s),
        reasoning(f"Give the smallest number family containing {m(-a)}.", "Integers",
                  ["A negative whole-number value is an integer. Every integer is also rational."],"Use the most specific family."))


def make_number_unit():
    place = strips("place-value",[(10,1,"0.1"),(10,10,"1 whole")],
                  "One tenth and a whole", "Ten pieces of size one tenth make one whole. Count tenths when you divide by 0.1.")
    rounding = number_line("nearest-tenth", 23, 28, (24,25), "Number line enlarged by a factor of ten",
                         "The same comparison for 2.44 uses 24.4 on this scaled line. It is nearer to 24 than 25.")
    order = number_line("negative-order", -6, 0, (-5,-3), "Two negative values on a number line", "Negative five is to the left of negative three, so it is smaller.")
    factor = diagram("factor-tree", "Factor tree for 36", [path([(180,29),(110,64)]),path([(180,29),(250,64)]),
        path([(110,82),(70,117)]),path([(110,82),(147,117)]),path([(250,82),(214,117)]),path([(250,82),(288,117)]),
        label(180,26,"36"),label(110,78,"4"),label(250,78,"9"),label(70,136,"2"),label(147,136,"2"),label(214,136,"3"),label(288,136,"3")],
        "The branches give 36 as 2 × 2 × 3 × 3. Different trees give the same prime factors.")
    return (
        Lesson("place-value-rounding","Place value, ordering and rounding","Use tenths and hundredths, order negative decimals and round to significant figures.",(
            Section("tenths","How does dividing by 0.1 change a number?","Imagine cutting a length into tenths. A whole metre contains ten tenths.","Multiplying by 0.1 divides by 10. Dividing by 0.1 multiplies by 10. Use 100 for hundredths.","A division does not always make a number smaller. Ask how many parts fit.","Use an inverse calculation to check the result.",tenth,place),
            Section("rounding","Where do significant figures start?","Significant figures tell us how much detail to keep.","Start at the first non-zero digit. Keep the required number of digits. Use the next digit to round and leave zeroes where they hold place value.","Ignore leading zeroes when counting significant digits. Keep place-holding zeroes such as in 3400.","Read the rounding instruction before you calculate.",significant,rounding),
            Section("order","Which negative number is smaller?","Write both decimals to the same number of places.","Compare the position on the number line. Moving left makes the value smaller even when its distance from zero grows.","A minus sign changes which size comparison gives the greater value.","Use a common decimal length when comparing close readings.",decimal_order,order)),
            (("Place value","The value given to a digit by its position."),("Significant figures","Digits counted from the first non-zero digit."),("Negative","Less than zero.")),5),
        Lesson("integer-calculations","Signed calculations, powers and roots","Apply the calculation order and explain sign rules for integers and powers.",(
            Section("signed","What happens to the sign?","Use gains and losses to picture the operation.","Estimate with nearby friendly numbers to check the size. Then multiply or divide the magnitudes. Matching signs give a positive result. Different signs give a negative result.","Adding negatives has a different sign rule from multiplying negatives.","Use the inverse operation to check the sign of a quotient.",signed_product,order),
            Section("order","What must I calculate first?","Work from the structure of the expression, rather than simply left to right.","Evaluate brackets first, then powers and roots. Multiply and divide, then add and subtract. Read equal-priority operations left to right.","Addition does not come before multiplication unless brackets say so.","Write one line for the bracket and a second line for the product.",operation_order),
            Section("indices","When can I combine powers?","An index tells you how many times to use a base as a factor.","For a common non-zero base, add exponents to multiply and subtract to divide. Dividing a power by itself gives a zero exponent and value 1.","Do not add the exponents when adding the powers.","Keep the base unchanged when giving the combined power.",index_rules),
            Section("roots","Can a root be negative?","A square repeats a factor twice. A cube repeats it three times.","The square of a negative number is positive. The square root symbol gives the non-negative root of a non-negative number. A negative number can have a negative cube root.","Solving an equation such as x² = 49 is different from finding the value of the square root symbol.","Check a proposed root by raising it to the given power.",roots_signed)),
            (("Magnitude","Distance from zero."),("Index","The small raised number that shows a power."),("Cube root","A number which gives the original number when cubed.")),6),
        Lesson("factors-multiples","Factors, multiples and number families","Use common factors and multiples and classify whole and rational numbers.",(
            Section("factors","Which group size divides both totals?","If every item must be used, each total must divide exactly by the number of groups.","A factor divides a number exactly. To find the highest common factor, compare factor lists or use the common prime factors.","The highest common factor cannot be more than the smaller total.","Check both divisions leave no remainder.",factors,factor),
            Section("multiples","When will two patterns meet again?","A repeated interval generates a list of multiples.","The lowest common multiple is the first positive number that is a multiple of both inputs.","The product is a common multiple but a smaller one may exist.","In a repeating event question, do not count the first meeting as the next one.",repeating),
            Section("families","Where does a number belong?","A number may belong to more than one family.","The natural numbers are counting numbers. The integers include positive whole numbers, negative whole numbers and zero. A rational number can be written as a fraction of integers with non-zero denominator.","A written fraction can simplify to an integer. Check the value before classifying.","Use the smallest family that contains the number when asked.",rational_family)),
            (("Factor","A whole number that divides another whole number exactly."),("Multiple","A product of a number and an integer."),("Rational number","A quotient of two integers with a non-zero denominator.")),5),
    )

def algebra_terms(s):
    a,b,c=2+s%17, 1+s//17%8, 3+s//136%7
    last = "x" if b == 1 else f"{b}x"
    expr=f"{a}x+{c}x^2-{last}"
    coefficient = a-b
    linear = ("+" if coefficient>0 else "-") + (str(abs(coefficient)) if abs(coefficient)>1 else "") + "x" if coefficient else ""
    simplified=f"{c}x^2{linear}"
    return problem("Collecting terms with matching powers",f"A learner writes {m(expr)}.",
        form("Collect the terms and simplify.",simplified,simplified,
             [f"The terms {m(f'{a}x')} and {m('-'+last)} use the same power of x. Combine their coefficients.",
              "The squared term has a different power and stays separate."],"Combine only like terms."),
        number(f"Evaluate the expression when {m('x=2')}.",4*c+2*(a-b),
             ["Substitute 2 for x. Square 2 before multiplying by the coefficient."],"Apply the order of operations."))


def expression_words(s):
    a,b=2+s%18, 3+s//18%11
    charge=F(b,2) if s//198%2 else F(b)
    shown=tex(charge)
    return problem("Writing a club cost as an expression",f"A coding club charges {a} credits for entry and {m(shown)} credits for each activity. A learner tries n activities.",
        form("Write an expression for the total charge.",f"{a}+({charge})*n",f"{a}+{shown}n",
             [f"The activities cost {m(shown)} credits each, so they cost {m(f'{shown}n')} altogether.",
              f"Add the one fixed entry charge of {a} credits."],"Pick out the fixed and changing parts.",variable="n"),
        reasoning(f"Explain why {m(f'({a}+{shown})n')} does not describe this cost.",
                  "It would charge the entry fee for every activity.",
                  ["A bracket multiplied by n means both charges repeat n times."],"Check what the repeated charge represents."))


def brackets(s):
    a,b,c=2+s%11, 2+s//11%8, 1+s//88%9
    return problem("Expanding terms with powers",f"The expression is {m(f'{a}x({b}x^2-{c})')}.",
        form("Expand the brackets.",f"{a*b}x^3-{a*c}x",f"{a*b}x^3-{a*c}x",
        [f"Apply the outside factor to both terms. The first multiplication combines {m('x')} and {m('x^2')} to make {m('x^3')}.",
         "The second product keeps the minus sign."],"Multiply every term by the outside factor."),
        number("Check your result when x = 1.",a*(b-c),["Set x to 1. Each positive power of 1 still equals 1."],"Check the original and expanded forms at the same value."))


def factorise(s):
    a=3+s%14
    b=3+s//14%14
    c=b+1
    return problem("Finding the greatest common algebraic factor", f"Consider {m(f'{a*b}x^2+{a*c}x')}.",
        selection("What is the highest common factor of both terms?",m(f'{a}x'),
            (m(f'{a}x^2'),m(f'{a*b}x'),m('x')),
            [f"The integers {a*b} and {a*c} have highest common factor {a} because {b} and {c} are consecutive.",
             "Both terms contain x, while only the first includes a second x factor."],"Find the numerical factor and the lowest shared power.",s),
        reasoning("Factorise the expression fully.",m(f'{a}x({b}x+{c})'),
            ["Divide each term by the common factor to obtain the two terms inside the bracket. Multiply back to check."],"Take the common factor outside the bracket."))


def equations_balance(s):
    a,b,c=2+s%12, 2+s//12%10, 7+s//120%8
    d=a+b
    e=b*c+4
    return problem("Two plans cost the same",f"Plan P costs {m(f'{a}x+{e}')} credits. Plan Q costs {m(f'{d}x+4')} credits. The number of uses is x.",
        number("Find the number of uses for which the plans cost the same.",c,
              [f"Set the expressions equal. Subtract {m(f'{a}x')} from both sides to leave {m(f'{e}={b}x+4')}.",
               f"Subtract 4 from both sides and divide by {b}."],"Balance the two expressions.",wrong=(str(c+1),"Keep the same operations on both sides. Check the number of uses in both plans.")),
        number("Give the cost of either plan at that number of uses.",a*c+e,
              [f"Put {c} in place of x in either plan."],"Substitute back to verify both costs."))


def fractional_equation(s):
    a,b,c=3+s%12, 2+s//12%7, 2+s//84%7
    solution=b*(a+c)
    return problem("Equation containing a fraction",f"A mystery number t is shared into {b} equal amounts. After giving away {c}, one share has {a} left.",
        number("Find t.", solution,
              [f"The equation is {m(rf'\frac{{t}}{{{b}}}-{c}={a}')}. Add {c} to both sides.",
               f"Multiply both sides by {b} to find the original amount."],"Undo subtraction, then undo division.",
               wrong=(str(b*a+c),"Add the amount back to the share before multiplying by the number of shares.")),
        reasoning("Write the original equation and check the solution.",m(rf"\frac{{t}}{{{b}}}-{c}={a}"),
                  [f"For t = {solution}, one share is {a+c}. Removing {c} leaves {a}."],"Use the stated equality."))


def formula_subject(s):
    a,b,t=4+s%14, 5+s//14%7, 2+s//98%9
    y=a*t-b
    return problem("Using a formula in reverse",f"A score is given by {m(f'P={a}t-{b}')}, with t the number of sessions.",
        number(f"The score is {y}. Find the session count.",t,
              [f"Use {m(f'{y}={a}t-{b}')}. Add {b}, then divide by {a}."],"Undo the outer subtraction first."),
        reasoning("Rearrange the formula to make t the subject.",m(rf"t=\frac{{P+{b}}}{{{a}}}"),
                  [f"Add {b} to both sides, then divide both sides by {a}. The left side is now t."],"Isolate one copy of t."))


def interval_model(s):
    lo, hi=1+s%26, 6+s%26+s//26%6
    last_open=s//156%2
    right=r"\lt" if last_open else r"\le"
    accepted=hi-1 if last_open else hi
    return problem("Choosing a whole-number value within two bounds",
        f"A club rule requires a whole-number age a. It says {m(rf'{lo}\lt a{right} {hi}')}.",
        number("Write the largest allowed age.",accepted,
             [f"The right-hand end is {m(hi)}.",
              "The sign is strict, so the end value itself is excluded." if last_open else "The sign includes equality, so the end value is allowed."],
             "Check whether the upper endpoint is included.",
             wrong=((str(hi),"The strict inequality does not include the upper endpoint.") if last_open else (str(hi-1),"The upper endpoint is allowed because the sign includes equality."))),
        reasoning("Draw a number line for this interval and explain whether the lower endpoint is included.",
                  f"Open circle at {lo}, {'open' if last_open else 'filled'} circle at {hi}, and a line joining them.",
                  ["A strict inequality gives an open circle. A sign with equality gives a filled circle."],"Distinguish the two endpoint symbols."))


def make_algebra_unit():
    areas=diagram("area-model", "Area model for expanding a bracket",
        [rectangle(55,48,172,52,"#b3d9f1"),rectangle(227,48,62,52,"#f8d2a6"),
         label(141,37,"4x"),label(257,37,"3"),label(39,81,"2x"),label(140,81,"8x²"),label(258,81,"6x")],
        "The rectangle has area 2x(4x + 3). Adding the smaller areas gives 8x² + 6x.",h=126)
    interval=number_line("mixed-endpoints",1,6,(2,5),"Number line with an open and a filled endpoint",
        "The open circle excludes 2. The filled circle includes 5. The interval is greater than 2 and at most 5.",open_ends=(2,))
    return (
        Lesson("expressions","Expressions and factorising","Translate situations into expressions, collect like terms, expand and factorise.",(
            Section("meaning","Which terms can I collect?","A letter can name a changing quantity in an expression. A formula links quantities. An equation asks where two expressions are equal.","Terms are like terms only if they have the same variable part, including the powers. Combine their coefficients and keep the variable part.","x and x² are different terms.","When substituting, put negative numbers in brackets before applying a power.",algebra_terms),
            Section("words","What changes in this situation?","Underline any one-off amount and circle the rate for each item.","An expression records a calculation. Use a variable for a quantity that can change. Multiply the rate by the variable and add any fixed amount.","A one-off charge is not multiplied by the number of items.","Check your expression with a value of zero or one.",expression_words),
            Section("expand","How do I remove brackets?","An area model splits a product across both parts of a bracket.","Multiply the outside factor by each inside term. Multiply coefficients and add exponents for matching bases.","Remember the sign of each term and multiply the last term too.","Check whether the degree of each term makes sense.",brackets,areas),
            Section("factorise","How do I put brackets back?","Take out the factor shared by every term.","Find the highest common factor of the coefficients and the lowest power of each shared letter. Divide every term by this factor to find what remains in the bracket.","A term might contain x without containing x².","Expand your answer to check that it matches the original.",factorise)),
            (("Term","One part of an expression separated by addition or subtraction."),("Coefficient","The numerical factor multiplying a variable."),("Factorise","Rewrite as a product of factors.")),6),
        Lesson("equations-intervals","Equations, formulae and intervals","Use inverse operations to solve equations, rearrange formulae and interpret interval boundaries.",(
            Section("balance","How do I balance an equation?","Read the equals sign as a balance. Both sides have the same value.","Collect the variable terms on one side. Reverse the remaining operations one at a time. Do the same on both sides.","Moving a term is shorthand for adding or subtracting on both sides.","Always check your solution in the original equation.",equations_balance),
            Section("fraction","What if an equation contains a fraction?","The fraction bar groups its top and bottom parts.","Undo any addition or subtraction outside the fraction. Then multiply by the denominator to undo the division.","Undo operations in reverse order. Multiplying first is valid only if every term is multiplied.","Record the operation on each line so a reader can follow.",fractional_equation),
            Section("subject","How can I make another letter the subject?","A formula describes a relationship and can be used in either direction.","To make a letter the subject, isolate it on one side. Use inverse operations on both sides even when the other side contains letters.","Rearranging a formula does not require numerical values.","Check a rearranged formula using a simple original value.",formula_subject),
            Section("interval","Does the boundary count?","Two inequalities can describe a region on a number line.","A strict inequality excludes its endpoint. A sign including equality includes its endpoint. On a number line use an open circle for excluded and a filled circle for included.","Read the upper and lower signs individually.","If the variable stands for a whole number, list only whole numbers inside the interval.",interval_model,interval)),
            (("Equation","A statement that two expressions have equal values."),("Subject","The variable standing alone on one side of a formula."),("Interval","A set of values between specified boundaries.")),6),
    )

def classify_quad(s):
    a=3+s%15
    case=s//15%4
    if case==0:
        given=f"All four sides are {a} cm. All four angles are right angles."
        correct="Square"
        others=("Rectangle with unequal sides","Rhombus with non-right angles","Kite with unequal pairs of sides")
        explanation="All sides equal and four right angles together define a square."
    elif case==1:
        given=f"The two longer sides are {a+2} cm. The two shorter sides are {a} cm. All four angles are right angles."
        correct="Rectangle"
        others=("Square","Rhombus","Trapezium with exactly one pair of parallel sides")
        explanation="Four right angles define a rectangle. The different side lengths rule out a square."
    elif case==2:
        given=f"Each side measures {a} cm. One interior angle is {55+s//60%29}°."
        correct="Rhombus"
        others=("Square","Rectangle","Trapezium with exactly one pair of parallel sides")
        explanation="All four sides are equal. A non-right angle rules out a square."
    else:
        given=f"The shape has exactly one pair of parallel sides, measuring {a} cm and {a+3} cm."
        correct="Trapezium"
        others=("Parallelogram","Square","Rhombus")
        explanation="It has one pair of parallel sides. A parallelogram has two pairs."
    return problem("Identify a quadrilateral",given,
        selection("Give the most specific name for the quadrilateral.",correct,others,[explanation],"Use all the stated sides and angles.",s),
        reasoning("Explain which property is decisive.",explanation,[explanation],"Justify the choice using a defining property."))


def symmetry(s):
    n=5+s%26
    turn=F(360,n)
    return problem("A design made from a regular polygon",f"A regular {n}-sided sign turns about its centre.",
        number("Give its order of rotational symmetry.",n,[f"Each of the {n} sides can move to the position of the first side and the polygon still matches."],"Match side positions during one complete turn."),
        number("Find the smallest positive angle of rotation that leaves the sign unchanged.",turn,
               [f"One full turn is {m('360^\\circ')}. Split it into {n} equal moves."],"Divide the full turn by the order.",units="degrees"),
        reasoning("How many lines of symmetry does this sign have? Explain.",m(n),
                  ["Each vertex is equally spaced around the centre. A regular polygon has one symmetry axis for each of its sides in total."],
                  "Connect the number of lines of symmetry to the number of sides."))


def circumference(s):
    r=F(12+s%91,2)
    estimate=(Decimal(str(float(r*2)*pi))).quantize(Decimal("0.01"), rounding="ROUND_HALF_UP")
    return problem("Measuring around a circular cover",f"A circular pond cover has radius {m(tex(r))} m.",
        number("Give the circumference to two decimal places.",estimate,
               [f"The diameter is twice the radius, so it is {m(tex(2*r))} m. Multiply the diameter by π.",
                "Use the calculator π key and round just the final result."],"Use C = πd with the diameter.",units="m"),
        reasoning("Write the circumference exactly in terms of π.",m(rf"{tex(r*2)}\pi")+" m",
                  ["Circumference divided by diameter is π for every circle. Multiply the diameter by π."],"Keep π in the exact answer."))


def parallelogram(s):
    b,h,e=5+s%13, 3+s//13%8, 2+s//104%4
    side=h+e
    return problem("Finding the area of a sloping panel",f"A parallelogram has a {b} cm base and a {side} cm sloping side. The perpendicular height above its base is {h} cm.",
        number("Find the area of the panel.", b*h,
               ["Slide a right triangle from one end to the other to make a rectangle. The base and perpendicular height are unchanged.",
                f"The rectangle has dimensions {b} cm by {h} cm."],"Use base times perpendicular height.",units="cm²",
               wrong=(str(b*side),"Use the height measured at right angles to the base, rather than the sloping side.")),
        number("Find the perimeter of the panel.",2*(b+side),
               ["Opposite sides are equal. For perimeter use the actual side lengths."],"Add all four actual sides.",units="cm"))


def trapezium(s):
    short, tall=3+s%12, 4+s//12%9
    long=short+2+s//108%9
    expected=F((short+long)*tall,2)
    return problem("Area of a trapezium",f"A flower bed forms a trapezium with parallel sides {short} m and {long} m. They are {tall} m apart at right angles.",
        number("Find the area of the flower bed.",expected,
               ["Two identical copies form a parallelogram whose base is the sum of the parallel sides. Take half of its area.",
                f"Multiply {short+long} by {tall}, then halve the result."],"Use half the sum of the parallel sides times the perpendicular height.",units="m²",wrong=(str((short+long)*tall),"That is the area of two trapezia. Halve it.")),
        reasoning("Explain what the height in the area formula means.","The shortest distance between the parallel sides.",
                  ["This distance makes a right angle with both parallel sides."],"Describe perpendicular distance."))


def miles(s):
    n=10+5*(s%49)
    km=F(8,5)*n
    return problem("Miles and kilometres",f"An outdoor route is {n} miles long. Use 1 mile ≈ 1.6 km.",
        number("Give the approximate length in kilometres.",km,
               [f"One mile corresponds to 1.6 kilometres, so multiply the count of miles by 1.6."],"Use the stated approximate conversion.",units="km",
               wrong=(str(F(n)*F(5,8)),"A length expressed in kilometres has a larger number than the same length expressed in miles.")),
        number(f"Convert a different route of {m(km+8)} km to miles using the same conversion.",n+5,
               ["To reverse the conversion, divide the kilometres by 1.6."],"Use the inverse mapping.",units="miles"))


def euler(s):
    n=3+s%19
    v=2*n
    f=n+2
    e=3*n
    return problem("Count a prism’s faces, edges and vertices",f"A prism has two identical {n}-sided ends and one rectangular face for each side of an end.",
        number("Work out the number of vertices.",v,
               [f"There are {n} vertices at each of the two ends."],"Count vertices on the two ends."),
        number("Use Euler’s relation to find the number of edges.",e,
               [f"Count the two ends and the {n} rectangular faces to get {f} faces.",
                f"For this solid, vertices minus edges plus faces equals 2. Use {v} plus {f} minus 2."],"Rearrange V − E + F = 2."))


def prism(s):
    k=1+s%8
    length=6+s//8%11
    tri=6*k*k
    return problem("Volume of a triangular prism",f"A prism has length {length} cm. Its identical triangular ends are right-angled, with the two perpendicular sides {3*k} cm and {4*k} cm.",
        number("Work out the volume.",tri*length,
               [f"The area of an end is one half of {3*k} × {4*k}, which is {tri} cm².",
                f"Repeat this cross-section along the {length} cm length."],"Multiply the triangular cross-sectional area by the prism length.",units="cm³",
               wrong=(str(2*tri*length),"The triangular area is half the area of the matching rectangle.")),
        number(f"Work out the surface area. The third side of each triangle is {5*k} cm.",2*tri+12*k*length,
               [f"The two triangles total {2*tri} cm². The three rectangular faces have widths {3*k}, {4*k} and {5*k} cm.",
                f"Multiply the widths by {length} cm and add the triangular area."],"Find every external face and add its area.",units="cm²"))


def surface_area(s):
    a,h=4+s%12,10+s//12%12
    if s%3 != 1:
        b,c=3+s//288%7,2+s//2016%8
        if s%3 == 0:
            b=c=a
        side=f"with all sides {a} cm" if a==b==c else f"of dimensions {a} cm, {b} cm and {c} cm"
        name="cube" if a==b==c else "cuboid"
        total=2*(a*b+a*c+b*c)
        return problem("Finding the outside area of a box",f"A closed {name} {side} needs wrapping.",
            number("Find the total area of its six faces.",total,
                   [f"The front and back each have area {a*b} cm². The top and bottom each have area {a*c} cm². The two side faces each have area {b*c} cm²."],
                   "Find one area from each opposite pair and count both faces.",units="cm²",
                   wrong=(str(total//2),"Each face has an opposite face of the same size. Count every face.")),
            reasoning("How could you label a net to show what you counted?",
                      f"Label two rectangles with each matching pair of dimensions, {a} × {b}, {a} × {c} and {b} × {c}.",
                      ["A net shows all outer faces, including those hidden in a perspective drawing."],"Use the face dimensions in pairs."))
    total=a*a+2*a*h
    return problem("Finding the outside area of a square pyramid",f"A square pyramid has base side {a} cm. Each triangular side face has perpendicular height {h} cm measured on the face.",
        number("Work out the surface area.",total,
               [f"The base area is {a*a} cm². Four triangular faces each have area half of {a} × {h}."],"Add the areas of the square and all four triangular faces.",units="cm²",
               wrong=(str(2*a*h),"Remember to include the square base.")),
        reasoning("Explain why a vertical height from the tip to the base centre would be a different measurement.",
                  "The vertical height is inside the pyramid. The triangle area uses the height along its face.",
                  ["A triangular face area needs a line in the plane of that triangle."],"Point out which line lies on the face."))


def views(s):
    w,h,d=3+s%13,5+s//13%9,2+s//117%9
    return problem("Drawing views of a storage box",f"A cuboid is {w} cm wide, {h} cm high and {d} cm deep.",
        number("Find the height on its front view when the drawing uses 2 mm for each centimetre.",2*h,
               ["A straight-on front view keeps width and height. Multiply the real height in centimetres by 2 to get the drawing height in millimetres."],"Use the drawing scale.",units="mm"),
        reasoning("Give the dimensions of the top and side views at the same scale.",
                  f"Top: {2*w} mm by {2*d} mm. Side: {2*d} mm by {2*h} mm.",
                  ["The top view keeps width and depth. The side view keeps depth and height."],"Identify the two dimensions visible from each direction."))


def make_shape_unit():
    hierarchy=diagram("quadrilateral-family","Quadrilateral hierarchy",
        [rectangle(103,21,154,32,"#dce9fa",radius=7),label(180,42,"Parallelograms"),
         path([(153,54),(94,76)]),path([(207,54),(268,76)]),rectangle(25,76,138,32,"#caf0e0",radius=7),rectangle(197,76,138,32,"#fae1c7",radius=7),
         label(94,98,"Rectangles"),label(266,98,"Rhombuses"),path([(94,110),(151,134)]),path([(266,110),(209,134)]),
         rectangle(121,134,118,29,"#e0d8fb",radius=7),label(180,154,"Squares")],
        "A square belongs in both the rectangle and rhombus groups because of its angles and sides.",h=178)
    rim=diagram("circle-diameter","A circle with its centre and diameter",
        [circle(180,85,57,"#e1f0fc"),path([(123,85),(237,85)],"#b45812",width=3),dot(180,85),label(180,111,"diameter"),label(180,164,"circumference is the curved edge",size=12)],
        "The diameter passes through the centre. The circumference is the distance around the edge.", h=179)
    trapezia=diagram("area-from-pair","Two matching trapezia form a parallelogram",
        [path([(46,114),(238,114),(297,48),(105,48)],"#24577f",fill="#badbf3",closed=True),
         path([(164,114),(179,48),(297,48),(238,114)],"#a0530d",fill="#fbe0bc",closed=True),
         path([(144,48),(144,114)],"#436267",dash="4 4"),label(133,84,"h",size=15),label(214,139,"a + b",size=15)],
        "The perpendicular height stays h. Halve the parallelogram area to get one trapezium.",h=151)
    beforeafter=diagram("orthographic","Front, side and top views of a cuboid",
        [rectangle(28,52,96,60,"#d9ebfa"),rectangle(144,52,54,60,"#d3eedf"),rectangle(220,52,96,54,"#fbe0bc"),
         label(76,40,"Front"),label(173,40,"Side"),label(269,40,"Top"),
         label(76,135,"width × height",size=11),label(173,135,"depth × height",size=11),label(269,135,"width × depth",size=11)],
        "Look straight along each direction. Every view shows the two dimensions perpendicular to the line of sight.", h=148)
    prism_fig=diagram("prism-faces","Triangular prism and matching cross-section",
        [path([(50,120),(50,48),(137,120)],"#34618b",fill="#cce6f7",closed=True),
         path([(50,48),(169,24),(256,96),(137,120)],"#1c6b82",fill="#d4f4ed",closed=True),
         path([(50,120),(137,120),(256,96),(169,96)],"#34618b",fill="#edf7fc",closed=True),
         path([(169,24),(169,96)],"#476f8e",dash="5 5"),label(194,139,"length",size=13),label(96,149,"end area",size=13)],
        "The triangle keeps the same area along the prism length. That is why volume equals end area multiplied by length.",h=164)
    return (
        Lesson("polygons-circles","Quadrilaterals, regular polygons and circles","Classify quadrilaterals, use regular symmetry and connect the circumference to the diameter.",(
            Section("families","How are the quadrilaterals related?","Use properties to sort shapes, rather than judging how a drawing looks.","A parallelogram has two pairs of parallel sides. Rectangles add four right angles. Rhombuses add four equal sides. A square has both extra properties.","A tilted square is still a square.","If two family names work, give the most specific one when asked.",classify_quad,hierarchy),
            Section("symmetry","What repeats in a regular polygon?","A regular polygon has equal sides and equal angles.","For n sides there are n lines of symmetry and n matching positions during a full turn. The smallest positive turn angle is 360° divided by n.","The order counts positions, not degrees.","Give a numerical angle only when the question asks for an angle.",symmetry),
            Section("circumference","How far is it around a circle?","Try comparing the rim to the distance across the centre.","The ratio of circumference to diameter is constant. It is π. Use C = πd or C = 2πr.","Check whether the given length is a radius or a diameter.","Write the exact π form before rounding an approximate value.",circumference,rim)),
            (("Regular polygon","A polygon with all sides and all angles equal."),("Rotational order","Number of matching positions in one full turn."),("Circumference","Distance around a circle.")),6),
        Lesson("area-distance","Areas and distance conversions","Calculate areas of parallelograms and trapezia, and convert between miles and kilometres.",(
            Section("parallelogram","Which height measures the area?","Cut a right triangle from one end of a parallelogram and move it to the other end.","The cut makes a rectangle with the original base and perpendicular height. Its area is their product.","A sloping side is not the height unless it meets the base at a right angle.","Use square units for area.",parallelogram),
            Section("trapezium","Why is there a half in this formula?","Two identical trapezia fit together to make a parallelogram.","The new base is the sum of the two parallel sides. Multiply that sum by the perpendicular height, then halve.","Only add the parallel side lengths in the trapezium area formula.","Show the formula with the values substituted.",trapezium,trapezia),
            Section("units","Why are there more kilometres than miles?","One mile is approximately 1.6 kilometres.","Multiply miles by 1.6 for kilometres. Divide kilometres by 1.6, or multiply by 5/8, for miles.","Changing units leaves the actual distance unchanged.","Check whether the number should grow or shrink.",miles)),
            (("Perpendicular height","Distance from a base measured at a right angle."),("Parallel sides","Sides that remain the same distance apart."),("Conversion factor","Multiplier linking two units.")),5),
        Lesson("solids","3D views, area and volume","Read orthographic views and work with the faces, surface area and volume of solids.",(
            Section("face-edge","What do we count on a solid?","A face is a flat surface. An edge joins two faces. A vertex is a corner.","For a convex polyhedron, vertices minus edges plus faces equals 2. Count each shared edge only once.","A hidden edge is still an edge of the solid.","Write V − E + F = 2 before substituting.",euler),
            Section("prism","How does the cross-section give volume?","Picture identical triangular slices stacked along a prism.","Calculate half the triangle’s base times its perpendicular height. Multiply the end area by the length of the prism. For surface area add all five face areas.","The prism length and the triangle height are different lengths.","Write cm³ for volume and cm² for surface area.",prism,prism_fig),
            Section("surface","How do I add all the outside faces?","Imagine folding the faces out into a net. A cuboid has three pairs of matching rectangles and a cube has six identical squares.","Add the areas of all outside faces. A pyramid has a base and a triangle for each base edge. Use the height measured on the triangular face.","A hidden face still contributes to the total. The vertical height inside a pyramid is different from its face height.","Check the count of outer faces before adding their areas.",surface_area),
            Section("views","What does each straight-on view show?","Look straight at the front, side or top, as if viewing the solid from far away.","Front shows width and height. Side shows depth and height. Top shows width and depth. Use the same scale throughout.","A 3D perspective drawing is different from a straight-on view.","Name the direction and label the scale for each view.",views,beforeafter)),
            (("Prism","A solid whose cross-section is constant along its length."),("Polyhedron","A solid made from polygon faces."),("Orthographic view","A scaled drawing from one straight-on direction.")),6),
    )

def mixed(value):
    assert value>=0
    integer, remainder=divmod(value.numerator,value.denominator)
    if not remainder:
        return str(integer)
    return (str(integer)+r"\," if integer else "") + rf"\frac{{{remainder}}}{{{value.denominator}}}"


def recurring(s):
    integer,digit=s%5,1+s//5%8
    recurring_decimal=m(rf"{integer}.\overline{{{digit}}}")
    exact=integer+F(digit,9)
    return problem("An exact fraction for a repeating decimal",f"A display uses a bar to show a repeated digit. It shows {recurring_decimal}.",
        number("Write the decimal as an exact fraction.",exact,
               [f"Multiplying by 10 shifts one repeated digit before the decimal point. Subtract one copy of the original number, so the repeated parts cancel.",
                f"The result is {m(f'9x={9*integer+digit}')} where x is the original number. Divide both sides by 9."],"Use the same repeating part to make a cancellation.",
               wrong=(str(Decimal(integer)+Decimal(digit)/10),"The bar means the digit repeats forever. One digit after the point does not include the later repetitions.")),
        reasoning("Explain what the overline means.",f"The digit {digit} repeats forever after the point.",
                  ["The overline is a compact way to mark the repeated block."],"Distinguish an exact repeating decimal from an approximation."))


def fraction_order(s):
    a,b=1+s%13,3+s//13%6
    if s//78%2:
        x=F(a,8)
        y=x-F(1,20)
        decimal=format(Decimal(y.numerator)/Decimal(y.denominator),"f")
        return problem("Compare a fraction and a decimal",f"Two markers have values {m(tex(x))} and {m(decimal)}.",
            number("Which value is greater? Give it exactly.",x,
                   [f"Write the fraction as a decimal by dividing its numerator by its denominator. This gives {m(format(Decimal(x.numerator)/Decimal(x.denominator),'f'))}.",
                    "Line up the decimal points and compare digit by digit."],"Convert to the same representation."),
            reasoning(f"Is {m(tex(-x))} less than or greater than {m('-'+decimal)}? Explain.","It is less.",
                      ["The larger positive value has the negative partner farther to the left of zero."],"Reverse the order when negating both values."))
    value=F(a,b)
    lower=value-F(1,b*5)
    return problem("Comparing two fractions",f"Two markers have values {m(tex(value))} and {m(tex(lower))}.",
        number("Which value is greater? Give it exactly.",value,
               [f"A common denominator is {b*5}. Rewrite the first fraction as {m(rf'\frac{{{a*5}}}{{{b*5}}}')} and the second as {m(rf'\frac{{{5*a-1}}}{{{5*b}}}')}.",
                "For the same denominator, the larger numerator gives the larger value."],"Compare at a common scale."),
        reasoning(f"Is {m(tex(-value))} less than or greater than {m(tex(-lower))}? Explain.","It is less.",
                  ["Reflecting two positions across zero reverses their order."],"Use the position of negative values."))


def mixeddifference(s):
    a,b,c=4+s%12, 3+s//12%9, 2+s//108%7
    x,y=a+F(1,b),c+F(2,b)
    if x<=y:
        y=1+F(2,b)
    result=x-y
    return problem("Subtracting mixed amounts",f"A bag contains {m(mixed(x))} kg of potting mix. A planter needs {m(mixed(y))} kg.",
        number("How much remains? Give a mixed number in its simplest form.",result,
            [f"Estimate with whole numbers first. The remainder is close to {x.numerator//x.denominator-y.numerator//y.denominator} kg.",
             "Trade 1 whole for a full set of fractional parts, or convert both values into improper fractions before subtracting.",
             f"The exact difference is {m(tex(result))}, which has mixed form {m(mixed(result))}."],
            "Write fractions with the same denominator and subtract.",units="kg",display=mixed(result)),
        reasoning("Explain why the fractional part must be smaller than one whole in a mixed-number answer.",
             "A whole group must be moved into the whole-number part.",
             ["Collect each full denominator’s worth of parts into one whole."],"Use a fully regrouped mixed number."))


def fraction_operations(s):
    a,b,d=2+s%13,1+s//13%5,3+s//65%7
    n=b+1
    if n>=d:
        n=1
    amount=b+F(n,d)
    portion=F(n,d)
    return problem("Whole batches and fractional cups",f"A batch needs {m(mixed(amount))} cups of oats. A smaller measuring cup holds {m(tex(portion))} of a whole cup.",
        number(f"Find the amount for {a} batches.",a*amount,
            [f"Multiply the whole and fractional parts separately. The result is {m(f'{a*b}+{tex(a*portion)}')} cups."],
            "Multiply each part of the mixed number.",units="cups"),
        number(f"How many of the smaller measuring cups fit exactly into {a*n} whole cups?",a*d,
            [f"There are {d} of the unit parts in a whole cup. Group them into sets of {n}."],"Divide the whole number by the fractional cup size.",
            units="measuring cups"))


def product_decimal(s):
    a,b=11+s%59,11+s//59%29
    x,y=Decimal(a)/10,Decimal(b)/100
    exact=x*y
    return problem("Find a decimal product",f"A small rectangle measures {m(x)} m by {m(y)} m.",
        number("Work out its area.",exact,
               [f"To estimate, note that the second factor {m(y)} is less than one. The product must be smaller than {m(x)}.",
                f"Multiply {a} by {b}. The original factors were divided by 10 and 100, so divide that product by 1000."],
               "Estimate, then count the total decimal places in the factors.",units="m²"),
        reasoning("Explain how an estimate can spot a misplaced decimal point.","The area must be below the value of the longer side when the other side is below 1 m.",
              ["Compare with multiplying by 1. This gives a simple upper bound."],"Use multiplication by one as a comparison."))


def divide_decimal(s):
    a,b=3+s%32,13+s//32%18
    share=Decimal(a)/10
    used=share*b
    return problem("Sharing a decimal measurement",f"A tube contains {m(used)} litres of water. Each full test container takes {m(share)} litres.",
        number("How many full containers can be filled?",b,
               [f"Scale both amounts by 10. Dividing {m(used)} by {m(share)} becomes {m(Decimal(b*a))} divided by {a}.",
                "Scaling numerator and divisor by the same factor preserves the quotient."],
               "Make the divisor a whole number first."),
        reasoning("Explain why converting both amounts to tenths changes the numbers and keeps the same number of containers.",
                  "Both measurements are scaled by the same factor, leaving the ratio unchanged.",
                  ["The number of groups is independent of the common measurement unit."],"Keep the scale factor the same for both amounts."))


def regroup(s):
    a,b=17+s%53, 4+s//53%14
    x=Decimal(a)/10
    y=Decimal(b)/100
    z=Decimal(4)-x
    expression=rf"{y}\times({x}+({z}))"
    return problem("Choose a simpler calculation order",f"A tablet shows {m(expression)}.",
        number("Calculate the value efficiently.",4*y,
               [f"First combine the two values in brackets. They make 4. Next multiply {m(y)} by 4."],
               "Look for a helpful whole number inside the brackets."),
        reasoning("Explain the distributive-law way to calculate the same value.",
                  f"Calculate {m(rf'{y}\times {x}')} and {m(rf'{y}\times({z})')}. Add the two products.",
                  ["Distributing means multiplying each addend by the outside factor."],"Use equivalent calculations to check your result."))


def percentage(s):
    a,r=20+5*(s%31),5*(1+s//31%10)
    up=s//310%2==0
    sign=1 if up else -1
    change=F(a*r,100)
    end=a+sign*change
    move="increases" if up else "decreases"
    return problem("A price changes by a percentage",f"A screen price of {a} credits {move} by {r}%.",
        number("Work out the new price.",end,
            [f"The change is {r}% of {a}, which is {m(tex(change))} credits.",
             f"{'Add' if up else 'Subtract'} the change. The new price is {m(tex(end))} credits."],
            "Calculate a percentage of the original amount.",units="credits",wrong=(str(change),"That is the size of the change. Apply it to the original price.")),
        number("How large is the change as a number of credits?",change,
            ["Absolute change is the size of the difference, so give a non-negative amount."],"Compare the old and new prices.",units="credits"))


def ratio_units(s):
    a,b=4+s%25, 5+s//25%16
    red,blue=F(a,10),10*b
    d=gcd(a,b)
    return problem("Comparing lengths in different units",f"A red cord is {m(tex(red))} m long. A blue cord is {blue} cm long.",
        ratio("Give the ratio red : blue in its simplest whole-number form.",a//d,b//d,
              [f"Convert the red cord to {a*10} cm so both lengths use centimetres. Then cancel the common factors of {a*10} and {blue}.",
               "First cancel 10 and then reduce the remaining ratio."],
              "Use the same units before simplifying the ratio."),
        reasoning("Explain why comparing the two original numbers directly is misleading.","They represent lengths in different-sized units.",
                  ["A metre and a centimetre do not describe equal lengths."],"Convert to like units first."))


def divide_ratio(s):
    a,b,c,k=2+s%7,3+s//7%8, 2+s//56%4, 4+s//224%5
    total=k*(a+b+c)
    return problem("Share between three teams",f"Three teams share {total} tokens in the ratio {m(f'{a}:{b}:{c}')}.",
        number("Find the first team’s share.",a*k,
              [f"The ratio has {a+b+c} parts. Divide {total} by {a+b+c} to find {k} tokens for one part.",
               f"The first team has {a} of these parts."],"Find the common value of one part."),
        reasoning("Check that the three shares add back to the total.",m(f"{a*k}+{b*k}+{c*k}={total}"),
                  ["The other teams receive the same value per part."],"Use all three shares in the check."))


def proportion(s):
    a,b,k=3+s%9, 5+s//9%15, 2+s//135%5
    earlier=a*b
    next_count=a*k+1
    return problem("Directly proportional market costs",
        f"The total cost of {a} identical notebooks is {earlier} credits. Each one costs the same and there is no starting fee.",
        number(f"Find the cost of {next_count} notebooks.",next_count*b,
            [f"Divide {earlier} by {a} for the cost of one notebook, {b} credits. Then multiply by {next_count}."],
            "Find the cost of one unit.",units="credits"),
        reasoning("Describe how a graph of total cost against number of notebooks should look.",
              "A straight-line pattern starting at the origin.",
              ["Every extra notebook adds the same amount. With zero notebooks the cost is zero."],"Check the rate per notebook and the starting cost."))


def make_fraction_unit():
    mixed_strip=strips("mixed-number-units",[(6,6,"1"),(6,5,"5/6"),(6,2,"2/6")],
                       "Whole and sixths on equal length bars","The whole has six sixths. Subtracting 2 sixths from 5 sixths leaves 3 sixths.")
    product_fig=diagram("decimal-grid","One hundredth grid showing 0.3 by 0.4",
        [rectangle(34+11*c,25+11*r,11,11,"#78bfdf" if c<3 and r<4 else "#edf3f9") for r in range(10) for c in range(10)]+
        [label(231,54,"3 tenths wide"),label(231,85,"4 tenths high"),label(231,115,"12 hundredths")],
        "In a one-unit square, 0.3 by 0.4 shades twelve hundredths. The product is 0.12.",h=150)
    percent_fig=strips("percent-change",[(10,10,"100%"),(10,2,"20%")],"The original amount and a twenty per cent addition",
        "The whole is the original amount. A 20% increase adds two tenths of that whole.")
    ratio_fig=diagram("sharing-ratio","Three groups shown as equal-sized parts in a strip",
        [rectangle(25+31*c,43,31,32,("#b1d8f2" if c<2 else "#c4edd7" if c<5 else "#fbd6aa")) for c in range(9)]+
        [label(55,103,"2 parts",size=12),label(135,103,"3 parts",size=12),label(246,103,"4 parts",size=12)],
        "There are nine equal parts in total. Share the total among these parts before grouping them.",h=121)
    return (
        Lesson("fraction-calculations","Fractions and mixed numbers","Connect recurring decimals to fractions, order values and calculate with mixed numbers.",(
            Section("repeat","How can a decimal be exact and keep going?","A bar above a digit or group of digits means it repeats indefinitely.","To compare with a fraction, notice that a pattern such as 0.777… comes from dividing 7 by 9. Multiplying a one-digit repeating decimal by 10 and subtracting one copy cancels the repeating tail.","Ending a repeating decimal after a few digits gives an approximation.","Use an exact fraction when the question asks for an exact value.",recurring),
            Section("compare","How do I compare unequal pieces?","Choose a shared fraction denominator or convert to decimals when it helps.","Use the same denominator for two fractions or convert to decimals where helpful. Use &lt; and &gt; for a strict comparison, ≤ and ≥ to allow equality, and ≠ when the values differ. Negating both quantities reverses their order.","A larger denominator makes smaller unit fractions. For general fractions, compare numerator and denominator together.","Label the direction of your inequality and keep the negative signs.",fraction_order),
            Section("subtract","What if the top mixed number has fewer parts?","Picture a whole and the leftover pieces separately.","Use a common denominator. Trade one whole for a full set of fractional pieces if needed. You can also subtract improper fractions and convert back at the end.","Subtract the entire second mixed number. Do not subtract its whole number and then add its fractional part.","Convert any final improper fraction back to a simplified mixed number.",mixeddifference,mixed_strip),
            Section("multiply-divide","How do whole groups and fractions work together?","A mixed number combines whole units with fractional units.","Multiply the whole and fractional parts to find several equal groups. To divide a whole number by a proper fraction, count the unit fractional pieces and group them into the given size.","Dividing by a proper fraction can give a number larger than the original whole-number amount.","Make the unit size clear at every step.",fraction_operations)),
            (("Recurring decimal","A decimal with a repeating block of digits."),("Mixed number","A whole number and a proper fraction written together."),("Proper fraction","A positive fraction with numerator smaller than denominator.")),6),
        Lesson("decimals-percentages","Decimal calculations and percentage change","Estimate before calculating and find the size and direction of a percentage change.",(
            Section("product","How small should a decimal product be?","Estimate by replacing factors with friendly numbers near their original values.","Multiply the digits as whole numbers, then restore the total number of decimal places. For example, tenths multiplied by hundredths give thousandths.","The number of decimal places comes from both factors.","A positive factor below 1 makes the other positive factor smaller.",product_decimal,product_fig),
            Section("quotient","What can I do with a decimal divisor?","A quotient counts how many groups of the divisor fit inside the other number.","Multiply both numbers by 10 if the divisor has one decimal place. Divide using the new whole-number divisor.","Scale the dividend as well as the divisor.","Use multiplication to check the result.",divide_decimal),
            Section("regroup","Can I make the numbers easier first?","Look for values that add to a whole number inside the brackets.","The associative law lets you group additions differently. The distributive law allows a factor to multiply all parts of a bracket. Choose the form with easier smaller steps.","These laws do not let us swap subtraction or division freely.","Keep brackets round any group that needs to stay together.",regroup),
            Section("percentage","Which amount is 100%?","The reference for a percentage change is the original amount.","Find the change using the original amount. Add it for an increase and subtract it for a decrease. A 20% increase can also use a multiplier of 1.20, and a 20% decrease uses 0.80.","The percentage or the absolute change alone is not the new total.","Write whether the value goes up or down before calculating.",percentage,percent_fig)),
            (("Dividend","The quantity being divided."),("Absolute change","The size of the difference between the new and old values."),("Multiplier","A factor used to scale an amount.")),6),
        Lesson("ratio-proportion","Ratio, sharing and direct proportion","Compare like units, share among several parts and find a constant unit rate.",(
            Section("units","What needs to match before I write a ratio?","A ratio describes how two quantities compare.","Convert same-kind measurements to the same unit first. Then divide both parts by a common factor until no common factor greater than 1 remains.","Do not cancel unlike units as though they were equal.","Keep the order of the colours or objects when writing a ratio.",ratio_units),
            Section("sharing","How much is one part of a share?","Draw the ratio with equal pieces and group them by person or team.","Add all the ratio parts. Divide the total by that count to find one part. Multiply to give each share.","Dividing by the number of groups would make equal shares rather than the stated ratio.","Check the shares add back to the total.",divide_ratio,ratio_fig),
            Section("proportion","When is a relationship directly proportional?","Think about a price that scales with the number of items at a fixed unit rate.","Two quantities are in direct proportion when their ratio is constant. Doubling one doubles the other. A graph through the origin has a constant unit rate when it is a straight line.","A straight line with a fixed fee does not represent direct proportion because it misses the origin.","Find one unit or use a clear scale factor for both quantities.",proportion)),
            (("Ratio","A comparison showing how quantities are scaled."),("Unit rate","Amount corresponding to one unit."),("Direct proportion","A relationship in which one quantity is always the same multiple of the other.")),6),
    )

def complement(s):
    b=7+s%31
    a=1+s//31%(b-1)
    q=F(a,b)
    return problem("Find a complementary probability",
        f"Each segment on a spinner is equally likely. The spinner has {b} segments, with {a} painted green and the others painted purple.",
        number("What is the probability of not landing on green?",1-q,
               [f"The probability of green is {m(tex(q))}. Green and not green include every result, so their probabilities add to 1.",
                f"Subtract {m(tex(q))} from 1."],"Subtract the known probability from 1.",
               wrong=((str(q),"That is the probability of green. Find the probability of the other outcome.") if q!=1-q else None)),
        reasoning("Why can green and not green not happen together on one spin?",
                  "Each landing is on one segment with just one colour.",
                  ["The two events are mutually exclusive and they cover all outcomes."],"Use both features of complementary events."))


def combined(s):
    a,b=2+s%8,2+s//8%8
    return problem("An outcome from each of two independent spinners",
        f"One fair spinner is numbered 1 to {a}. A separate fair spinner is numbered 1 to {b}. Spin each once.",
        number("How many ordered pairs of outcomes are possible?",a*b,
             [f"Each of the {a} first outcomes can be combined with any of the {b} second outcomes.","This makes a rectangular sample space."],
             "Multiply the two counts of possible outcomes.",wrong=(str(a+b),"Each first value pairs with every second value. Use multiplication.")),
        number("Find the probability that both results are 2.",F(1,a*b),
             [f"The one favourable pair is (2, 2). The {a*b} ordered pairs are equally likely."],"Divide the count of favourable pairs by the total."))


def equally_likely(s):
    a,b=3+s%10,2+s//10%11
    target=a+2
    outcomes=[(x,y) for x in range(1,a+1) for y in range(1,b+1) if x+y==target]
    return problem("Find a sum from two independent spinners",
        f"A fair spinner shows an integer from 1 to {a}. Another fair spinner shows an integer from 1 to {b}. Spin both and add the results.",
        number(f"Find the chance that the sum is {target}.",F(len(outcomes),a*b),
            [f"There are {a*b} equally likely pairs. The pairs giving the target are {', '.join(f'({x}, {y})' for x,y in outcomes)}.",
             "Count the favourable pairs and divide by the total."],"Use the ordered pairs, not the number of different sums."),
        reasoning("Explain why the smallest sum and a sum near the middle may have different probabilities.",
            "Several ordered pairs can give a middle sum, whereas 2 comes only from (1, 1).",
            ["Find a pair that gives the smallest sum and try to make the same sum another way."],"Compare the number of possible pairs."))


def experimental(s):
    count=40+10*(s%14)
    totals=[count,count*4]
    successes=[count//2+(2+s//14%9),2*count+(1+s//126%7)]
    q1,q2=(F(a,b) for a,b in zip(successes,totals))
    assert abs(q2-F(1,2))<abs(q1-F(1,2))
    chart=table(("Trial set","Spins","Landed on blue"),(("A",count,successes[0]),("B",count*4,successes[1])))
    return problem("Compare experimental results with a model",
        "A fair spinner is half blue. Two groups make separate sets of spins."+chart,
        number("Find the experimental probability of blue in set A.",q1,
              [f"In set A there are {successes[0]} blue outcomes out of {count} spins."],"Divide observed successes by the number of trials."),
        reasoning("Which set gives a result closer to the theoretical probability? Show how you decided.",
                  f"Set B. Its estimate is {m(tex(q2))}, closer to one half than {m(tex(q1))}.",
                  ["Use proportions rather than comparing the raw counts. A larger trial set often gives a closer result, though it is not guaranteed."],
                  "Compare each relative frequency with the same theoretical value."),
        reasoning("Design one more fair simulation to compare a small trial and a large trial.",
                  "Toss a fair coin. Mark heads as success. Use the same coin for both trials. Choose two group sizes before starting and record every result.",
                  ["Find the two success fractions and compare both with one half. A larger experiment does not guarantee a closer result every time."],
                  "Describe a fair device, a success rule and two trial sizes."))


def make_probability_unit():
    arr=[rectangle(89+44*c,37+26*r,44,26,"#7bc5c5" if c==2 and r==1 else "#e7effa") for c in range(4) for r in range(3)]
    space=diagram("outcome-grid","Sample space grid of two independent spinners",
        arr+[label(175,24,"First spinner",size=13),label(49,84,"Second",size=12),label(49,103,"spinner",size=12),
             *[label(111+44*c,134,str(c+1),size=13) for c in range(4)],
             *[label(77,55+26*r,str(r+1),size=13) for r in range(3)]],
        "There are twelve equally likely pairs when both spinners are fair. The highlighted cell is first spinner 3 and second spinner 2.",h=151)
    return (
        Lesson("probability-models","Complementary and independent events","Use complements and sample spaces and compare observed and predicted chances.",(
            Section("complement","What remains when an event does not happen?","Start with all possible results. Separate those in the event from the rest.","A probability and its complement add to 1. Subtract a known probability from 1 to find the other.","A complementary event includes every outcome outside the first event.","State the outcome you are finding before you calculate.",complement),
            Section("sample-space","How can I list every pair once?","Draw one row or column for each possible result on a separate device.","A sample-space table contains each ordered pair exactly once. For independent devices with equally likely results, all the cells are equally likely.","The first spinner’s 2 and then the second spinner’s 3 differ from the first spinner’s 3 and the second spinner’s 2.","Check that both device results are represented in every cell.",combined,space),
            Section("sum","Do different totals have equal chances?","Count pairs that give the target result rather than listing just the different totals.","Divide the count of target pairs by the total number of equally likely pairs. Two totals may come from different numbers of pairs.","Different possible sums are not automatically equally likely.","Draw a short table and mark the whole diagonal of target pairs.",equally_likely),
            Section("experiment","How close is a trial to a prediction?","A model describes a chance in theory. A trial gives observed results.","Choose a device and fix an event before recording. Run a small set of trials and then a larger set. Compare the fraction of successes in each with the theoretical probability.","More trials often produce a more stable estimate. They do not guarantee an exact match in every run.","Compare relative frequencies when trial sets have different sizes.",experimental)),
            (("Complement","All outcomes that are outside an event."),("Independent","The outcome of one event does not change the chances for the other."),("Relative frequency","Observed successes divided by the number of trials.")),6),
    )


def parallel_angles(s):
    a=34+s%45
    pair=s//45%2==0
    description="alternate interior angle" if pair else "corresponding angle"
    return problem("Follow a transversal across parallel lines",
        f"Two marked parallel lines are cut by a transversal. An acute angle at the first intersection is {a}°.",
        number(f"Find the size of its {description}.",a,
               [f"With parallel lines, {description}s are equal. Locate the matching corner relative to the transversal."],
               "Use the marked parallel lines.",units="degrees",wrong=(str(180-a),"That is an adjacent supplementary angle. A matching alternate or corresponding angle is equal.")),
        number("A second angle shares a straight edge with the original angle. Find this adjacent angle.",180-a,
               ["Angles on the same straight line add to 180°. Subtract the given angle."],"Use the straight-line sum.",units="degrees"))


def triangle_ext(s):
    a,b=32+s%45, 37+s//45%48
    return problem("Find an exterior angle of a triangle",
        f"In a triangle the angles at A and B are {a}° and {b}°. Extend the side from B through C beyond C.",
        number("Find the exterior angle at C next to the interior angle of the triangle.",a+b,
               [f"The interior angles add to 180°, so the interior angle at C is {180-a-b}°.",
                f"The inside and outside angles at C form a straight angle. The exterior angle equals {a}° + {b}°."],
               "Add the two interior angles at the distant vertices.",units="degrees",
               wrong=((str(180-a-b),"That is the interior angle at C. Find the angle outside the triangle.") if 180-a-b!=a+b else None)),
        reasoning("Explain the exterior angle rule for any triangle.",
             "The interior angle at C has the same supplement whether using the triangle sum or the straight line.",
             ["Subtract the angle at C from 180° in both relationships to get the same expression."],
             "Link the triangle sum to the straight-line sum."))


def bearing(s):
    a=16+s%71
    quadrant=s//71%2==0
    name="east" if quadrant else "west"
    expected=a if quadrant else 360-a
    back=(expected+180)%360
    return problem("Navigation at an outdoor centre",
         f"A gate lies {a}° {name} of north from a meeting point.",
         number("Write the three-figure bearing of the gate from the meeting point.",expected,
              [f"Find north at the meeting point first. Measure clockwise to the gate.",
               f"The bearing is {'the small angle clockwise from north' if quadrant else f'360° minus {a}°'}."],
              "Start from north, measure clockwise and write three digits.",units="degrees",display=f"{expected:03}",
              wrong=((str(a),"West of north is anticlockwise. Measure clockwise around from north.") if not quadrant else None)),
         reasoning("Write the three-figure bearing of the meeting point from the gate.",f"{m(str(back).zfill(3))}°",
                   ["The return direction is opposite. Turn through another 180° and subtract 360° if needed."],
                   "Take the bearing from the named starting point."))


def midpoint(s):
    a,b=2+s%13, 2+s//13%10
    c,d=-a+2*(1+s//130%5), -b+2*(2+s//650%8)
    u,v=(a+c)//2,(b+d)//2
    return problem("Find the midpoint of a segment",f"Points P and Q are {m(f'({-a},{-b})')} and {m(f'({c+2*a},{d+2*b})')}.",
        ordered_pair("Find the coordinates of the midpoint M.",u,v,
                [f"The x coordinates are {m(-a)} and {m(c+2*a)}. Add them and halve the sum.",
                 "Do the same with the two y coordinates."],"Average the two coordinates separately."),
        reasoning("Describe a way to check the midpoint by looking at movements.",
                  "The horizontal move P to M should equal M to Q, and the vertical moves should also be equal.",
                  ["A midpoint divides the segment into two equal halves in the same direction."],"Compare signed coordinate changes."))


def construction_triangle(s):
    a,b,c=3+s%11, 4+s//11%9, 2+s//99%8
    # Define viable side lengths and ensure the three marks refer to different compass settings.
    long=a+b
    mid=b+c
    short=a+c
    return problem("Construct a triangle from three lengths",
        f"Design triangle ABC with AB = {long} cm, AC = {mid} cm and BC = {short} cm.",
        number("If you draw AB first, set the compass at A. What radius will trace the possible positions of C?",mid,
              ["All points at the correct distance from A sit on its compass arc. Use AC as the radius."],"Choose the length measured from the compass centre.",units="cm"),
        reasoning("Describe the straightedge-and-compass construction.",
              f"Draw AB of length {long} cm. From A draw an arc with radius {mid} cm. From B draw an arc with radius {short} cm. Label an arc intersection C, then join A and B to C.",
              ["The arc intersection lies at both of the required distances. Either side of AB gives a mirror-image construction."],
              "Use one arc for each given side length."))


def construction_bisectors(s):
    a=48+2*(s%49)
    b=8+2*(s//49%9)
    return problem("Find angle and segment bisectors",
        f"An angle is {a}°. A separate segment XY is {b} cm long.",
        number("How many degrees are between the angle bisector and either arm?",a//2,
               ["A bisector makes two equal angles. Halve the given angle."],"Split the angle into two equal angles.",units="degrees"),
        reasoning("Describe how to construct the perpendicular bisector of XY.",
               "Make two matching arcs from X and Y, with the same compass opening greater than half XY. Join the intersections of the arcs.",
               ["Both arc crossings are the same distance from X and Y. The line through them meets XY at its midpoint and at a right angle."],
               "Use points equidistant from the endpoints."),
        reasoning("Describe how to construct the angle bisector.",
                  "From the vertex, draw one arc cutting both arms. Use each crossing as a centre for a pair of arcs of equal radius. Join the vertex to the interior crossing of these new arcs.",
                  ["The first two cuts are equally far from the vertex, and the new crossing is equally far from both cuts."],
                  "Use symmetry to create two equal angles."))


def make_angle_unit():
    parallel=diagram("parallel-lines","Parallel lines crossed by a transversal",[
        path([(38,49),(322,49)]),path([(38,104),(322,104)]),path([(68,137),(271,17)],"#a05213"),
        label(245,42,"a",size=16),label(153,95,"a",size=16),path([(291,43),(300,49),(291,55)]),path([(291,98),(300,104),(291,110)])],
        "The two marked angles are in matching positions. Corresponding angles on parallel lines are equal.",h=147)
    compass=diagram("bisector-arcs","Matching compass circles for a perpendicular bisector",[
        circle(129,81,55,"none","#4681a9",1.5),circle(215,81,55,"none","#b45f1c",1.5),
        path([(129,81),(215,81)],"#213c58"),path([(172,38),(172,123)],"#366967",dash="5 4"),
        dot(129,81),dot(215,81),dot(172,81),dot(172,46),dot(172,116),label(129,100,"X"),label(215,100,"Y"),label(190,78,"M",size=13)],
        "The two crossing points are equally far from X and Y. Joining the crossings creates the perpendicular bisector.",h=149)
    return (
        Lesson("angles-bearings","Angles on lines, triangles and bearings","Follow a transversal, explain the exterior-angle rule and read three-figure bearings.",(
            Section("parallel","Which angles are equal?","Mark the parallel lines before using a property that depends on them.","Corresponding and alternate angles are equal on parallel lines. Vertically opposite angles are equal even when there are no parallel lines.","Angles side by side on a straight line add to 180°. They are not normally equal.","Name the property when explaining a calculated angle.",parallel_angles,parallel),
            Section("exterior","Why do the two far angles determine the exterior angle?","Extend one side of a triangle through a vertex.","The outside angle is supplementary to the inside angle at that vertex. Since the triangle angles total 180°, the exterior angle equals the sum of the two other inside angles.","Use the two interior angles that are not at the outside angle’s vertex.","Show which two interior angles you have added.",triangle_ext),
            Section("bearing","Where do I start measuring a bearing?","Draw a north arrow from the place you are leaving.","Measure clockwise from north and write a three-figure angle. For the reverse bearing turn through 180°, then bring the result into a full turn if necessary.","The starting place comes after the word ‘from’. Do not measure from a different point.","Add a leading zero to bearings below 100°.",bearing)),
            (("Transversal","A line crossing two or more lines."),("Exterior angle","The outside angle formed by extending a side."),("Bearing","Clockwise angle measured from north.")),6),
        Lesson("constructions-midpoints","Constructions and midpoints","Use arcs to construct triangles and bisectors and calculate the midpoint on a coordinate grid.",(
            Section("midpoint","How can I find the centre of a segment on a grid?","A midpoint is the place halfway between the endpoints.","Average the x values to find the midpoint’s horizontal coordinate. Average the y values to find the vertical coordinate.","Do not pair an x value with a y value when averaging.","Keep a bracket and comma around your two coordinates.",midpoint),
            Section("triangle","Which compass arcs locate the third corner?","Draw the given base side first.","Open the compass to the length from each endpoint to the missing corner. Draw the arcs from the corresponding endpoints. Their crossing gives the corner.","Keep the compass at the named endpoint and measure using the correct given side.","Leave light construction arcs so your method is visible.",construction_triangle),
            Section("bisect","How do equal distances help me bisect?","Compass arcs can locate a point which is equally far from two endpoints.","Make two arcs with identical openings from the segment endpoints and join the two crossings. To bisect an angle, first mark matching distances along its two arms. Draw two equal arcs from those marks and connect their interior crossing to the vertex.","An opening smaller than half the segment will not give two crossings.","Use the same compass opening for each pair of equal arcs.",construction_bisectors,compass)),
            (("Arc","A part of a circle."),("Midpoint","The point halfway between two endpoints."),("Bisector","A line that divides a segment or angle into two equal parts.")),6),
    )

def sequence_next(s):
    a,b=2+s%23,2+s//23%8
    start=F(a,3)
    step=F(b,3)
    four=[start+step*i for i in range(4)]
    return problem("Continue an increasing fractional sequence",f"A sequence begins {values(four)}.",
        number("Work out the next term.",start+4*step,
               [f"Subtract consecutive terms to find the repeated change {m(tex(step))}. Add that change to the fourth term."],
               "Use the same term-to-term rule at the next position."),
        reasoning("Describe the term-to-term rule.",f"Add {m(tex(step))}.",
                  ["The difference between consecutive terms stays the same."],"Describe the move between adjacent terms."))


def nth_term(s):
    a,b=2+s%15,-9+s//15%19
    step=F(-a if s//285%2 else a,2)
    shift=F(b,2)
    first=[step*n+shift for n in range(1,5)]
    # The input and display forms both preserve exact half units.
    expr=f"({step})*n+({shift})"
    coefficient = "" if step == 1 else "-" if step == -1 else tex(step)
    shown=coefficient+"n"+(f"+{tex(shift)}" if shift>0 else tex(shift) if shift<0 else "")
    return problem("Find the position-to-term rule",f"An arithmetic sequence starts {values(first)}.",
        form("Write the rule for the term in position n, with n starting at 1.",expr,shown,
             [f"The difference is {m(tex(step))}, so compare with multiples of that value.",
              f"At n = 1 the rule must give {m(tex(first[0]))}. The required adjustment is {m(tex(shift))}."],
             "Start with n times the common difference and adjust to match the first term.",variable="n"),
        number("Find the term in position 9.",step*9+shift,
               ["Put 9 into the position-to-term rule."],"Substitute the position, not the previous term."))


def spatial(s):
    first=4+s%23
    gap=3+s//23%6
    n=6+s//138%8
    return problem("Continue a border made of tiles",
        f"The first pattern has {first} tiles. Each new pattern has {gap} extra tiles along one edge.",
        number(f"How many tiles are in pattern {n}?",first+(n-1)*gap,
              [f"There are {n-1} increases after pattern 1. Multiply that count by {gap}, then add {first}."],
              "Count the changes after the first diagram.",wrong=(str(first+n*gap),"There is no increase before pattern 1. Count one fewer change.")),
        reasoning("How would you work out the number of tiles at any position n?",
                  m(f"{first}+{gap}(n-1)"),
                  ["The first pattern gives the starting amount. There are n − 1 changes."],"Use the first term and repeated change."))


def function_machine(s):
    a,b,c=2+s%13,3+s//13%8,2+s//104%10
    start=F(c,2)
    output=a*start+b
    return problem("Find the input of a function",
        f"A machine multiplies the input by {a} and then adds {b}. One output is {m(tex(output))}.",
        number("Work out the corresponding input.",start,
               [f"Undo the last operation first. Subtract {b} from the output. Then divide the result by {a}."],
               "Use the inverse operations in reverse order.",wrong=((str(output/a-b),"Subtract before dividing because the addition was last.") if output/a-b!=start else None)),
        reasoning("Explain why this machine gives just one output for each input.","For each input, multiplying by a fixed number and adding a fixed number produces a single result.",
                  ["Every input goes through the same fixed steps."],"Describe the single-output rule."))


def line_from_words(s):
    rate,fee=2+s%16,4+s//16%21
    return problem("Translate a rate into a two-variable rule",
        f"A transport card costs {fee} credits to activate. Each trip costs {rate} credits. Let x be trips and y be the total cost.",
        form("Write an expression for y in terms of x.",f"{rate}x+{fee}",f"{rate}x+{fee}",
             [f"The x trips cost {m(f'{rate}x')}. Add the single starting charge of {fee}."],
             "Identify the starting amount and the constant change."),
        reasoning("Explain what it means that the intercept is not zero.",f"Even before taking a trip, the cost is {fee} credits.",
             ["At x = 0 the trip part is zero but the fixed activation cost remains."],"Read the starting value in context."))


def coordinates_table(s):
    a,b,t=2+s%9,-7+s//9%15,-3+s//135%8
    a=(-a if s//1080%2 else a)
    y=a*t+b
    rule=f"{a}x{b:+}" if b else f"{a}x"
    tv=table(("x","y"),((m(t-1),m(a*(t-1)+b)),(m(t),"?"),(m(t+1),m(a*(t+1)+b))))
    return problem("Complete a table for a straight line",f"The rule is {m(f'y={rule}')}.{tv}",
        number(f"Find y when x = {t}.",y,
               ["Put the given x in the rule. Multiply first and add the constant after that."],"Use the same rule to find the missing output."),
        reasoning("Explain how to turn the completed table into a graph.",
                  "Plot each row as a coordinate pair (x, y). Use a ruler to join the points with a straight line.",
                  ["Read the coordinate order from the table headings."],"Match each pair to the axes."))


def line_gradient(s):
    x0=1+s%7
    y0=3+s//7%16
    a=2+s//112%8
    dx=2+s//896%5
    x1=x0+dx
    y1=y0+a*dx
    c=y0-a*x0
    return problem("Calculate rise per step across",
        f"One straight line passes through {m(f'({x0},{y0})')} and {m(f'({x1},{y1})')}.",
        number("Find the gradient.",a,
               [f"The horizontal change is {dx}. The vertical change is {y1-y0}. Divide rise by run."],
               "Divide the y change by the x change.",wrong=(str(F(1,a)),"Gradient is the change in y divided by the change in x.")),
        reasoning("Find the y-intercept and explain where it is on the graph.",m(f"(0,{c})"),
               [f"Use one point in the form {m(f'y={a}x+c')} and solve for c. This is the y value at x = 0."],"Use a known point to recover the starting value."))


def compare_lines(s):
    a,b,n=3+s%12,2+s//12%9,3+s//108%14
    fee=b*n
    left=f"{a}x+{fee}"
    right=f"{a+b}x"
    return problem("A point where two plans match",
        f"Plan A has total cost {m(f'y={left}')} and Plan B has {m(f'y={right}')}. The number of rides is x and y is in credits.",
        number("How many rides make the two total costs equal?",n,
               [f"At the intersection the two y values are the same. Subtract {m(f'{a}x')} from both sides. Then divide {fee} by {b}."],
               "Find where the two graphs have the same value."),
        reasoning("Which plan is cheaper for a larger number of rides than that? Explain.",
                "Plan A, because from the meeting point it increases by fewer credits per extra ride.",
                ["Compare the two gradients. The plan with the smaller rate rises more slowly."],"Use the rate stated by each gradient."))


def journey_graph(s):
    t=3+s%13
    stay=2+s//13%12
    d=3+s//156%12
    end=t+stay+2+s//1872%6
    tv=table(("Time in minutes","Distance from home in km"),((0,0),(t,d),(t+stay,d),(end,0)))
    return problem("Interpret the sections of a journey",
        "A traveller follows one straight road away from home and back. Four points on her distance-from-home graph are joined by straight lines."+tv,
        number("For how many minutes is the traveller stationary?",stay,
              [f"The distance stays at {d} km between minute {t} and minute {t+stay}. Find the difference in these two times."],
              "Find the horizontal part of the graph.",units="minutes"),
        reasoning("Describe the final straight section of the graph.",
              "The traveller returns towards home, arriving there when the distance reaches zero.",
              ["The final section slopes down because distance from home decreases while time increases."],"Interpret the direction of the slope in context."))


def make_graph_unit():
    pattern=diagram("growing-border","Three steps of a growing tile pattern",
        [rectangle(22+c*17,53+r*17,17,17,"#96c7ed" if c<2 else "#b3e2c9") for c in range(2) for r in range(2)]
        +[rectangle(135+c*17,53+r*17,17,17,"#96c7ed" if c<2 else "#b3e2c9") for c in range(3) for r in range(2)]
        +[rectangle(250+c*17,53+r*17,17,17,"#96c7ed" if c<2 else "#b3e2c9") for c in range(4) for r in range(2)]
        +[label(40,113,"1",size=15),label(160,113,"2",size=15),label(284,113,"3",size=15)],
        "Every new pattern adds a column of two tiles. The rule gives two more tiles at each position.",h=131)
    machine=diagram("function-steps","Input, multiply by three, add two, output",
        [rectangle(12,46,62,40,"#d3ebfa",radius=5),label(43,71,"Input",size=13),
         path([(76,66),(90,66)]),rectangle(92,46,68,40,"#d9f0df",radius=5),label(126,72,"× 3",size=14),
         path([(162,66),(177,66)]),rectangle(179,46,68,40,"#f9dfb8",radius=5),label(213,72,"+ 2",size=14),
         path([(249,66),(264,66)]),rectangle(266,46,80,40,"#e9e3f7",radius=5),label(306,71,"Output",size=13)],
        "To recover the input, start at the output. Subtract 2 first. Then divide by 3.",h=109)
    lines=diagram("line-meeting","Two lines that meet at x equals 3",
        [path([(43,18),(43,147),(326,147)],"#263744"),
         path([(43,111),(317,30)],"#2374a8",width=3),path([(43,147),(317,11)],"#b55710",width=3),
         path([(222,147),(222,58)],"#566a80",dash="4 4"),dot(222,58,"#704731",4),
         label(332,151,"x"),label(38,16,"y"),label(223,166,"3"),label(276,54,"Plan A",size=11),label(270,24,"Plan B",size=11)],
        "At the meeting point both plans have the same value. The steeper plan costs more beyond this point.",h=181)
    return (
        Lesson("sequences","Growing patterns and nth terms","Continue number and tile patterns and use rules that find a term from its position.",(
            Section("continue","What changes from one term to the next?","Compare two adjacent terms at a time.","A term-to-term rule tells you how to move from one term to its neighbour. A constant difference makes an arithmetic sequence.","When fractions have different denominators, use equal-sized pieces before subtracting.","Check the same difference between more than one pair.",sequence_next),
            Section("tiles","How can a picture show the difference?","Compare successive tile patterns and count the pieces added each time.","The first pattern gives a starting amount. At position n, there have been n − 1 changes since pattern 1.","The position number counts patterns, not the number of changes.","Explain where your numbers come from in the picture.",spatial,pattern),
            Section("nth","How does a rule jump to any position?","The nth term rule gives the value straight from n.","Use the common difference as the coefficient of n. To find the adjustment, compare the result at n = 1 with the first term.","The first term is not automatically the constant in the rule.","Check your rule at the first and second positions.",nth_term)),
            (("Term","A value in a sequence."),("Common difference","The repeated change in an arithmetic sequence."),("nth term","A rule that gives the value from its position n.")),6),
        Lesson("linear-functions","Function machines and plotting straight lines","Run a function forwards or backwards, write a two-variable rule and plot a table of values.",(
            Section("machine","Which steps take me from output to input?","A function assigns exactly one output to each allowed input.","To find an output, perform the stated steps in order. To recover the input for these linear functions, undo the steps in reverse order.","Subtracting a fixed amount and dividing by a multiplier are different actions. Reverse their order correctly.","Check a recovered input by running it forwards.",function_machine,machine),
            Section("rules","How do I write a changing total in algebra?","Distinguish the part that is already there from the rate of change.","A linear rule has a constant rate of change. In y = mx + c, m tells you the increase per unit of x and c gives the value at x = 0.","A fixed amount is added once. It does not increase every time x increases.","Explain what one unit of each variable means.",line_from_words),
            Section("plot","How do I use a table to draw a line?","Give each chosen x its matching y value.","Use the formula to complete a table. Plot each row as an (x, y) pair, with x along the horizontal axis and y vertically. Use a third point to check a line through the first two.","Switching x and y moves the point to a different location.","Label the axes and use a consistent scale.",coordinates_table)),
            (("Function","A rule that gives one output for each allowed input."),("Input","The value that goes into a function."),("Coordinate","A number locating a point relative to an axis.")),5),
        Lesson("straight-lines","Gradient, intercepts and graph stories","Use rise over run and read slopes, intersections and sections of real-world graphs.",(
            Section("gradient","What does slope measure?","Move from one point on the line to another and count the two changes.","Divide the change in y by the change in x. A downhill straight line has negative gradient when you read from left to right. The y-intercept has x = 0.","Read the actual numbers on the axes. Grid squares may use different scales.","Use two clearly defined points when calculating the gradient.",line_gradient),
            Section("intersection","What does a meeting point tell me?","At a crossing the two graphs share both coordinates.","Set the output rules equal to find their intersection. Use the shared x value in either rule to find the shared y value.","Intercept and intersection are not the same. An intercept is where a graph meets an axis.","Say what the shared coordinates mean in the question.",compare_lines,lines),
            Section("journeys","How do I read separate parts of one graph?","In a distance-from-home graph, time moves to the right.","A rising section shows moving away from home. A flat section shows no change in distance. A descending section can show a return towards home.","A flat section takes time even though the recorded distance does not change.","Find elapsed time by subtracting the start time from the end time.",journey_graph)),
            (("Gradient","Change in y divided by change in x."),("Intercept","Point at which a graph meets an axis."),("Intersection","Point shared by two graphs.")),6),
    )

def translation(s):
    x,y=-8+s%15,-6+s//15%13
    dx,dy=2+s//195%6,-3-s//1170%5
    return problem("Translate a point and preserve its distances",
        f"Point A is {m(f'({x},{y})')}. Its translation vector is {m(rf'\begin{{pmatrix}}{dx}\\{dy}\end{{pmatrix}}')}.",
        ordered_pair("Give the coordinates of the image of A.",x+dx,y+dy,
            [f"The upper entry moves x right by {dx}. The lower entry moves y down by {-dy}.",
             "Add each signed entry to its own coordinate."],"Read the upper number horizontally and the lower one vertically."),
        reasoning("A whole triangle is moved by this vector. Why is it congruent to its image?",
              "Every vertex moves the same way, so side lengths and angle sizes stay unchanged.",
              ["The whole figure slides. It does not stretch or rotate."],"Compare lengths and angles after a translation."))


def reflection(s):
    x,y=2+s%12,-3-s//12%11
    variant=s//132%4
    k=1+s//528%7
    if variant==0:
        line=f"x={k}"
        u,v=2*k-x,y
        hint=f"Keep the y-coordinate. Go the same horizontal distance to the opposite side of x = {k}."
    elif variant==1:
        line=f"y={-k}"
        u,v=x,-2*k-y
        hint=f"Keep the x-coordinate. The average of the old and new y-values is {-k}."
    elif variant==2:
        line="y=x"
        u,v=y,x
        hint="Reflection in y = x swaps the two coordinates."
    else:
        line="y=-x"
        u,v=-y,-x
        hint="Reflection in y = −x swaps the two coordinates and reverses both signs."
    return problem("Reflect a point in a named line",f"Point A has coordinates {m(f'({x},{y})')}. The mirror line is {m(line)}.",
        ordered_pair("Give the image coordinates.",u,v,[hint],"Use equal perpendicular distances on opposite sides of the mirror line."),
        reasoning("Describe a geometric way to check your image.", "The segment joining the point and its image has the mirror line as its perpendicular bisector, unless the point is on the mirror.",
                  ["A point on the mirror is unchanged. Other points cross to the opposite side at the same perpendicular distance."],"Check location relative to the mirror."))


def mirror_line(s):
    d=2+s%11
    k=1+s//11%13
    z=-6+s//143%15
    x1,x2=k-d,k+d
    return problem("Recover the mirror line",
          f"A point {m(f'({x1},{z})')} has image {m(f'({x2},{z})')} after a reflection in a vertical line.",
          number("The mirror line has equation x = k. Find k.",k,
             [f"The perpendicular segment between the two points is horizontal. Its midpoint has x-coordinate half of {x1} + {x2}."],
             "Find the average of the two x-coordinates."),
          reasoning("Explain why this is a line rather than just a point.",
              "The mirror is the perpendicular bisector of the two points. It is the entire vertical line through the midpoint.",
              ["All points on that vertical line are equidistant from the point and its image."],"Use the mirror-line definition."))


def rotation(s):
    cx,cy=-4+s%8,-3+s//8%7
    dx,dy=1+s//56%10,2+s//560%8
    d=s//4480%3
    turn=("90° clockwise","90° anticlockwise","180°")[d]
    if d==0:
        ux,uy=dy,-dx
    elif d==1:
        ux,uy=-dy,dx
    else:
        ux,uy=-dx,-dy
    x,y=cx+dx,cy+dy
    out=(cx+ux,cy+uy)
    return problem("Turn a point around a fixed centre",
        f"Point P is {m(f'({x},{y})')}. Rotate it {turn} about {m(f'({cx},{cy})')}.",
        ordered_pair("Give the image coordinates.",*out,
             [f"Measure P from the centre first. It is {dx} right and {dy} up.",
              f"Turn that displacement {turn} to get {m(f'({ux},{uy})')}. Then add the centre coordinates."],
             "Rotate the displacement from the stated centre."),
        reasoning("State which point is unchanged by the turn.",m(f"({cx},{cy})"),
             ["A rotation keeps its own centre fixed."],"Identify the point about which the rotation happens."))


def enlargement(s):
    cx,cy=-3+s%8,-4+s//8%9
    dx,dy=1+s//72%7,2+s//504%6
    factor=2+s//3024%4
    x,y=cx+dx,cy+dy
    out=(cx+factor*dx,cy+factor*dy)
    return problem("Scale a point from an enlargement centre",
        f"Enlarge a figure by scale factor {factor} with centre {m(f'({cx},{cy})')}. Its vertex P is {m(f'({x},{y})')}.",
        ordered_pair("Find the image coordinates of P.",*out,
            [f"Start at the centre and move {dx} across and {dy} up to reach P. Make both movements {factor} times as large.",
             "Add the new displacement to the centre."],"Scale distances from the centre, not coordinates from the origin."),
        reasoning("A side is 7 cm long on the original. Find its new length and say what happens to its angles.",
            f"{7*factor} cm. Angle sizes are unchanged.",
            ["Lengths multiply by the scale factor. The shape keeps its angles."],"Use the same scale factor for each length."))


def identify_scale(s):
    a=1+s%11
    b=2+s//11%8
    k=2+s//88%6
    dx,dy=a,b
    cx,cy=-1-s//528%5,2+s//2640%5
    initial=m(f"({cx+dx},{cy+dy})")
    image=m(f"({cx+dx*k},{cy+dy*k})")
    return problem("Identify the integer scale of an enlargement",
        f"An enlargement of centre {m(f'({cx},{cy})')} takes P {initial} to P′ {image}.",
        number("Find the scale factor.",k,
              [f"The old horizontal displacement from the centre is {dx}. The new horizontal displacement is {dx*k}.",
               f"The vertical displacements scale from {dy} to {dy*k}, confirming the same factor."],
              "Divide a non-zero image displacement by the matching original displacement."),
        reasoning("How can you use a straightedge to check the given centre?",
                  "The original point, its image and the centre should lie on the same line.",
                  ["Repeat for another pair of matching points to locate the centre if it is unknown."],"Use the line joining each matching pair."))


def make_transformation_unit():
    def grid_lines():
        return [path([(55+i*26,23),(55+i*26,153)],"#d2e3f0",width=0.8) for i in range(10)]+[path([(55,23+i*26),(289,23+i*26)],"#d2e3f0",width=0.8) for i in range(6)]
    mirrors=diagram("mirror-grid","Matching points across a vertical mirror",
        grid_lines()+[path([(159,23),(159,153)],"#986027",dash="6 4"),path([(107,75),(211,75)],"#467cac"),
                      dot(107,75),dot(211,75,"#a05019"),label(105,61,"P",size=14),label(212,61,"P′",size=14),label(159,175,"Mirror line",size=13)],
        "P and P′ lie on opposite sides. The mirror line crosses the joining segment at 90° and in the middle.",h=189)
    ray=diagram("enlargement-ray","Points on a ray from an enlargement centre",
        grid_lines()+[path([(81,127),(263,36)],"#4580a6",width=3),
                      dot(81,127,"#1b4d73"),dot(133,101,"#2e7f6d"),dot(237,49,"#ca6515"),
                      label(73,147,"C"),label(131,122,"P"),label(253,51,"P′")],
        "From the centre C to P, move two grid squares right and one up. From C to P′ those moves are tripled.",h=176)
    return (
        Lesson("translations-reflections","Translations and mirrors","Find image coordinates and explain how translations and reflections preserve size.",(
            Section("slide","What does a translation vector say?","A translation slides every point the same way.","For a column vector, the top entry gives the signed horizontal move and the bottom entry gives the signed vertical move. Add these entries to the corresponding coordinates.","A negative horizontal number means move left. A negative vertical number means move down.","Check several vertices, using the same vector each time.",translation),
            Section("reflect","How far does a point move across a mirror?","A mirror changes the side of a point and keeps its perpendicular distance to the mirror.","For a vertical or horizontal mirror, change only the coordinate across the line. For y = x, swap coordinates. For y = −x, swap and negate both coordinates.","A point on the mirror stays fixed.","Check the mirror line is halfway between the point and its image.",reflection,mirrors),
            Section("recover","How do I find a hidden mirror line?","Join a point to its matching image.","When the two points differ, their perpendicular bisector is the mirror line. Check a second matching pair if you have one.","A line through both points is not the perpendicular bisector.","Give an equation for the line when using coordinates.",mirror_line)),
            (("Image","The shape or point after a transformation."),("Translation","A slide without turning or stretching."),("Congruent","Matching in shape and size.")),6),
        Lesson("rotations-enlargements","Rotations and enlargements","Use centres, directions and angle sizes for turns, and whole-number scale factors for enlargements.",(
            Section("rotate","What must I know to turn a point?","A rotation needs a centre, a direction and an angle.","Think about the displacement from the centre. For a 90° clockwise turn, right becomes down and up becomes right. For 90° anticlockwise, right becomes up and up becomes left. A 180° turn reverses both moves.","Rotating about the origin only works when that is the stated centre.","Label the centre before making the turn.",rotation),
            Section("enlarge","From where do I measure an enlargement?","The centre may be on the shape or outside it.","Draw a ray from the centre through a vertex. Multiply the distance from the centre by the same positive scale factor along each ray. A point at the centre stays fixed.","Multiplying the coordinates directly only works for an origin centre.","Check the shape remains similar and the matching sides use the same factor.",enlargement,ray),
            Section("recover","How can the image tell me the scale?","A pair of matching points gives useful distances from the centre.","For a pair away from the centre, compare image distance with original distance. If the centre is unknown, draw two non-parallel lines joining two pairs and use their crossing.","Compare both distances from the same centre.","State the centre as well as the scale factor when identifying an enlargement.",identify_scale)),
            (("Rotation","A turn through an angle about a centre."),("Scale factor","The multiplier for matching lengths."),("Similar","Same shape, with matching angles and proportional sides.")),6),
    )

def data_types(s):
    a=5+s%38
    context=s//38%3
    options=("Categorical","Discrete numerical","Continuous numerical")
    details=(
        ("chosen route colour","Colours are categories, even when a spreadsheet replaces each colour name with a code.",0),
        ("number of clubs joined","A count takes separate whole-number values.",1),
        ("time taken to reach school","A time measurement can take any value in a range; rounding the recording does not change its type.",2)
    )
    label_,why,index=details[context]
    example_entry = ("Record the route colour, for example blue.",
                     "Record a whole-number count, for example 3 clubs.",
                     "Measure the travel time and record it in minutes, for example 18.5 minutes.")[index]
    return problem("Decide which type of data to collect",f"A survey team invites {a} learners and records each learner’s {label_}.",
        selection("What type of data will this variable give?",options[index],tuple(x for x in options if x!=options[index]),[why],"Decide whether the value is a category, a count or a measurement.",s),
        reasoning("Give a suitable way to record the variable for one learner.",example_entry,
            ["Record the same sort of value and use the same units for each learner."],"Define a consistent recording method."))


def sampling(s):
    a=21+s%35
    b=2+s//35%9
    return problem("Choose a fairer sample",
        f"A school wants to estimate lunch choices across {a} classes. A team first asks only the {b} learners in a sports club.",
        selection("Which method would give better coverage of the whole school?",
                  "Select a sample at random from each class, allowing for class sizes",
                  ("Ask the same club a second time","Ask only the people nearest the door","Ask only the oldest class"),
                  ["Include every class in the sampling plan, then draw names without preference within each class."],
                  "Match the sample to the population of interest.",s),
        reasoning("Give one benefit of the first sample and explain its limitation.",
            "It is quick to collect, but sports club members alone may have different choices from other learners.",
            ["Convenience makes an easy trial. A wider representative sample is needed for a claim about the whole school."],"Discuss sampling convenience and bias."))


def trial_survey(s):
    n=12+s%47
    t=3+s//47%9
    return problem("Improve a trial survey",f"In a trial with {n} learners, {t} people left the question ‘How long is your trip?’ blank because they were unsure about units.",
        selection("Which revised instruction gives clearer numerical data?",
             "Record your travel time to school today, in minutes",
             ("Say how far you go","Write whether the trip feels long","Give a number for your usual travel"),
             ["The revised question identifies what to measure, the period and the unit."],"Use an observable quantity with a specified unit and time window.",s),
        reasoning("What should you check when you test the revised item with a small group?",
             "Check that people understand the question, use minutes and record the same trip.",
             ["The trial should reveal whether the question produces data suitable for the investigation."],"Test interpretation before collecting the full sample."))


def sets_table(s):
    total=43+s%49
    cycling=13+s//49%10
    art=10+s//490%11
    both=4+s//5390%4
    neither=total-(cycling+art-both)
    assert neither>=0
    return problem("Organise overlapping club choices",
        f"Of {total} learners, {cycling} chose cycling and {art} chose art. Exactly {both} chose both.",
        number("How many learners did not choose either club?",neither,
               [f"Only cycling is {cycling-both}. Only art is {art-both}. Add both of these and the {both} in the overlap.",
                f"Subtract this total from {total}."],"Count the overlap once before finding the outside region.",
                wrong=(str(total-cycling-art),"Adding the club totals counts the learners in both clubs twice.")),
        reasoning("Complete a Carroll diagram with choices Cycling and Art.",
                  f"Both {both}, cycling only {cycling-both}, art only {art-both}, neither {neither}.",
                  ["A Carroll diagram has a box for each combination of yes and no."],"Place the four disjoint groups in separate cells."))


def two_way(s):
    a,b,c,d=5+s%12,6+s//12%10,8+s//120%9,7+s//1080%7
    rows=table(("Group","Library","Music room","Total"),(("Y","?",b,a+b),("Z",c,d,c+d)))
    return problem("Read a two-way table",f"The table counts a first activity choice.{rows}",
        number("How many learners in Group Y chose the library?",a,
               [f"The Group Y row has total {a+b}. Subtract the {b} in its music room cell."],"Subtract the known entry from the correct row total."),
        number("How many learners in the two groups chose the library?",a+c,
               ["Add the two entries in the library column. Do not add the row totals."],"Match the requested group of cells to the column."))


def bar_charts(s):
    a,b,c,d=2+s%14,5+s//14%8,6+s//112%9,3+s//1008%9
    tv=table(("Choice","Tutor A","Tutor B"),(("Drama",a,b),("Art",c,d)))
    return problem("Compare and combine bar chart categories",f"The table gives the number of votes from each tutor group.{tv}",
        number("In a compound bar chart, what is the full height of the Drama bar in votes?",a+b,
              ["A compound bar stacks the two sections. Add the two Drama counts."],"Find the total height of the category bar."),
        reasoning("Which chart arrangement makes it easiest to compare Tutor A and Tutor B for one choice?",
              "Draw two side-by-side bars for that choice, using the same scale and a key.",
              ["In a dual bar chart both bars start at the common baseline, which makes their heights easy to compare."],
              "Describe a dual bar chart and shared scale."))


def pie(s):
    n=4+s%20
    a=1+s//20%7
    b=2+s//140%7
    count=n*a
    total=n*(a+b)
    angle=F(360*a,a+b)
    return problem("Use a pie-chart sector to show a share",
        f"Of {total} votes for a project, {count} choose design A. The other votes choose design B.",
        number("Find the exact angle of the sector for design A.",angle,
             [f"Design A has {m(tex(F(count,total)))} of the votes. Use the same fraction of the full 360° circle."],
             "Multiply the share by 360 degrees.",units="degrees"),
        reasoning("Why would a whole pie chart for each of two classes not show which class cast more votes?",
                  "Each circle is the same size and only shows shares of its own total.",
                  ["Keep the total count with the pie charts if counts will also be compared."],"Distinguish proportion from frequency."))


def grouped(s):
    f=(3+s%12,5+s//12%8,2+s//96%11,6+s//1056%8)
    start=10+5*(s//8448%3)
    width=5
    rows=[(m(rf"{start+i*width}\le t\lt {start+(i+1)*width}"),value) for i,value in enumerate(f)]
    tv=table(("Seconds","Frequency"),rows)
    return problem("Read grouped measurements",
        f"A class groups stopwatch readings into equal-width intervals.{tv}",
        number(f"How many readings are below {start+2*width} seconds?",f[0]+f[1],
               ["Add the first two group frequencies. The boundary value itself belongs in the next interval."],
               "Combine only the complete intervals below the boundary."),
        reasoning("Describe a frequency diagram that represents these data.",
                  f"Draw adjacent bars of width {width} seconds, with heights {', '.join(map(str,f))}.",
                  ["The intervals have the same width. The vertical axis can show frequency for each whole interval."],
                  "Keep gap-free intervals for continuous data."))


def stem_leaf(s):
    t=3+s%6
    a=1+s//6%4
    b=a+3
    c=4+s//24%4
    d=c+2
    e=3+s//96%5
    vals=(10*(t-1)+1,10*(t-1)+e,10*t+a,10*t+b,10*(t+1)+c,10*(t+1)+d)
    tv=table(("Stem","Leaves"),((t-1,f"1 {e}"),(t,f"{a} {b}"),(t+1,f"{c} {d}")))
    mid=F(vals[2]+vals[3],2)
    return problem("Read values from a stem-and-leaf diagram",
        f"These are game scores. The key is {m(f'{t}\\mid {a}')} means {vals[2]}.{tv}",
        number("Find the median score.", mid,
             [f"There are six scores. Use the third and fourth values, {vals[2]} and {vals[3]}. Add and halve."],
             "Read the leaves in order, then average the two middle scores."),
        number("Find the range.", vals[-1]-vals[0],
             ["Use the key to read the greatest and least scores. Subtract the least from the greatest."],
             "Compare the extreme whole scores."))


def graphs_data(s):
    a,d,b=10+s%19,2+s//19%8,1+s//152%7
    seq=[a,a+d,a+d+b,a+2*d+b]
    tv=table(("Week","Visitors"),tuple((i+1,num) for i,num in enumerate(seq)))
    return problem("Read change across weeks",
        f"A centre records its visitors at the same time each week.{tv}",
        number("How much higher is the last total than the first total?",2*d+b,
            ["Compare the final week with the first week. The difference is the last value minus the first."],
            "Measure the change between the same time points."),
        reasoning("Name a suitable display for these readings. Name a different display for paired temperature and visitor counts taken on the same days.",
             "A time series graph for weekly totals, and a scatter graph for paired temperature and visitor count.",
             ["A time series keeps the time order. A scatter graph shows each pair together to reveal a possible relationship."],
             "Choose the graph to match the question and the two variables."))


def infographic(s):
    k=2+s%17
    a=3+s//17%11
    b=1+s//187%(a+2)
    cards=table(("Badge","Number of badges"),(("Reusable bottles",a),("Refill packs",b)))
    return problem("Check a pictogram’s scale",
        f"A designer uses a fixed key. Each complete badge represents {k} items.{cards}",
        number("How many items are shown by the Reusable bottles badges?",a*k,
              [f"Each of the {a} badges represents {k}. Multiply."],"Use the key for the repeated symbols."),
        reasoning("The designer proposes a different-sized badge for Refill packs but no new key. What should you check?",
              "The picture needs a clear, consistent scale so its size does not imply extra or fewer items.",
              ["A larger drawing can exaggerate its value. Keep an unambiguous unit."],"Critique the visual scale and the clarity of the key."))


def mean_table(s):
    centre=12+s%29
    a,b,d=2+s//29%8,1+s//232%5,3+s//1160%7
    tv=table(("Score","Frequency"),((centre-d,a),(centre,b),(centre+d,a)))
    return problem("Find the mean using counts",
        f"A group records the frequency of each score.{tv}",
        number("Work out the mean score.",centre,
               [f"Multiply each score by its frequency to find the total. There are {2*a+b} scores.",
                f"Equal counts are {d} below and {d} above {centre}, so those changes cancel."],"Divide the total of all scores by the count of scores."),
        reasoning("Find the median and explain why.",m(centre),
                  ["The counts on either side match, with at least one score at the centre."],"Read positions rather than distinct values."))


def compare_spread(s):
    c=11+s%28
    r=2+s//28%7
    wide=r+1+s//196%7
    low=[c-r,c,c,c,c+r]
    spread=[c-wide,c,c,c,c+wide]
    tv=table(("Group","Ordered readings"),(("A",values(low)),("B",values(spread))))
    return problem("Compare the centre and spread of two groups",
        f"Two groups measure the same quantity.{tv}",
        number("Give the difference between the two ranges.",2*(wide-r),
            [f"The A range is {2*r}. The B range is {2*wide}. Subtract the ranges."],"Compare the maximum and minimum for each group separately."),
        reasoning("Use a measure of centre and a measure of spread to compare the groups.",
                  f"Both medians are {c} and both modes are {c}. Group B has the greater range.",
                  ["A centre alone cannot show how spread out the values are."],"Refer to both a centre and a spread measure."))


def investigate(s):
    count=20+s%36
    a=9+s//36%10
    b=a+1+s//360%6
    a=min(a,count-2)
    b=min(b,count-1)
    q=F(b-a,count)
    return problem("Test a prediction and discuss variation",
        f"Two groups each test {count} seeds. Group A counts {a} sprouted seeds. Group B counts {b}. The project asks whether two soil types support different sprouting rates.",
        number("What is the difference between the two proportions that sprouted?",q,
               ["Both groups have the same number tested, so subtract the two counts and divide by the number tested in one group."],
               "Compare relative frequencies rather than only their labels."),
        reasoning("Explain one reason to collect more data before drawing a firm conclusion.",
                "Other factors, such as light, water or differences between seeds, can cause variation. Repeat the test with larger, comparable samples.",
                ["A difference for these samples alone does not tell us which factor caused it."],"Discuss a possible source of variation and how to control it."))


def make_statistics_unit():
    sampling_steps=diagram("sampling-cycle","Four steps for a sampling investigation",[
        rectangle(18,37,76,41,"#d2eff8",radius=5),label(56,63,"Ask",size=14),path([(97,58),(107,58)]),
        rectangle(109,37,76,41,"#cce8d7",radius=5),label(147,63,"Sample",size=14),path([(188,58),(198,58)]),
        rectangle(200,37,76,41,"#fce1bc",radius=5),label(238,63,"Record",size=14),path([(278,58),(286,58)]),
        rectangle(288,37,56,41,"#ddd6f5",radius=5),label(317,63,"Test",size=13)],
        "Plan the question and sampling before collecting data. Revise the plan after a small trial if necessary.",h=105)
    bars=diagram("dual-compound","The same totals in dual and compound bar charts",
        [path([(29,32),(29,136),(144,136)],"#234663"),path([(194,32),(194,136),(310,136)],"#234663"),
         rectangle(41,92,19,44,"#77b2db"),rectangle(60,115,19,21,"#efa564"),
         rectangle(95,71,19,65,"#77b2db"),rectangle(114,115,19,21,"#efa564"),
         rectangle(215,92,28,44,"#77b2db"),rectangle(215,71,28,21,"#efa564"),
         rectangle(261,71,28,65,"#77b2db"),rectangle(261,50,28,21,"#efa564"),
         label(84,22,"Side by side",size=13),label(252,22,"Stacked",size=13),label(60,157,"A",size=13),label(114,157,"B",size=13),label(229,157,"A",size=13),label(275,157,"B",size=13)],
        "The left chart puts groups next to each other for each category. The right chart stacks them to show totals.",h=178)
    time_fig=diagram("time-series","Visitors across four weeks",
        [path([(58,18),(58,137),(310,137)],"#244865"),path([(82,114),(149,76),(216,89),(283,40)],"#1f7a92",width=3),
         dot(82,114),dot(149,76),dot(216,89),dot(283,40),label(299,158,"Week",size=12),label(56,16,"Visitors",size=11),
         label(82,155,"1",size=11),label(149,155,"2",size=11),label(216,155,"3",size=11),label(283,155,"4",size=11)],
        "The line goes down from week 2 to week 3. This shows a drop even though the total is higher at the end.",h=169)
    spread=diagram("same-centre","Two dot plots with the same centre and different spread",
        [path([(58,60),(305,60)],"#45698b"),path([(58,124),(305,124)],"#45698b"),
         *[dot(x,y) for x,y in [(147,53),(183,53),(183,42),(183,31),(219,53),(74,117),(183,117),(183,106),(183,95),(293,117)]],
         path([(183,62),(183,128)],"#b86624",dash="5 4"),label(25,57,"A"),label(25,120,"B"),label(183,152,"common centre",size=12)],
        "The middle location is the same for both groups. Set B stretches over a greater distance, so it has the greater range.",h=170)
    return (
        Lesson("sampling","Planning and improving a sample","Identify data types, choose a sampling method and improve a question after a trial.",(
            Section("types","Should I record a category, a count or a measurement?","Start with the question you want your data to answer.","Categorical data give a label. Discrete numerical data can only take separate values, such as counts. Continuous data are measurements that can take any value in an interval.","Writing metres to the nearest centimetre does not turn height into a count.","State what each data row is about and use the same units throughout.",data_types),
            Section("sample","Who should be in my sample?","The population is the group you want to describe. The sample is the part you actually study.","A convenience sample is quick but may miss some groups. Random selection helps avoid preference. A systematic sample takes every kth item after a start and can miss patterns if the list is periodic.","A bigger sample can still be biased if all members come from one group.","Name who may be missing and how that could change the result.",sampling,sampling_steps),
            Section("trial","How can a short trial improve a survey?","Try the question with a few people before using it with the full sample.","Check that the question is clear, is fair and gives the type of data you need. Change unclear instructions or units, then try again.","A question with no time frame can lead to answers about different situations.","Make a prediction and decide what you would measure before collecting data.",trial_survey)),
            (("Population","The full group being investigated."),("Sample","Part of the population selected for study."),("Bias","A systematic unfairness in who is selected or how data are collected.")),6),
        Lesson("tables-charts","Tables, bar charts and pie charts","Use diagrams and tables to organise counts and choose a display that fits the comparison.",(
            Section("overlap","Where do I put people who belong to both groups?","Separate the four possible yes-or-no combinations.","In a Venn diagram, the middle overlap shows both properties. In a Carroll diagram, each cell shows one yes-or-no combination. Tally marks can record counts as data arrive.","A person in the overlap has both properties, but is counted once in a total of people.","Check that all the disjoint parts add to the total.",sets_table),
            Section("two-way","How do I use row and column totals?","A two-way table sorts each item by two properties at once.","Add across rows for one property and down columns for the other. An unknown cell is often a total with the known entries removed.","Read the row and column names before selecting a value.","Check the grand total using the row totals and again using the column totals.",two_way),
            Section("bars","When should I put bars together or stack them?","A bar chart uses a common scale for categories.","Dual bars make same-category comparisons easy. Compound bars show category totals as stacks, with each component coloured or patterned and labelled in a key.","The height of one segment is its top value minus its bottom value.","Give a clear scale and a key for both groups.",bar_charts,bars),
            Section("pie","How does a count become an angle?","In a pie chart the whole circle stands for the full total.","A sector is the same fraction of 360° as the category is of the total count. Divide frequency by the total, then multiply by 360°.","Do not treat a count as an angle unless the totals make that conversion valid.","Check the angles add to one complete turn.",pie)),
            (("Frequency","Number of times a value or category occurs."),("Overlap","Objects belonging to both groups."),("Sector","A region between two radii and part of a circle.")),6),
        Lesson("data-graphs","Grouped data, time series and scatter graphs","Interpret grouped measurements, stem-and-leaf diagrams, graphs and infographics.",(
            Section("grouped","What does an interval tell me?","Group measurements in adjacent intervals and write clearly which end values are included.","In equal-width frequency diagrams, each interval gets one bar. The height shows the count for that interval. Use boundaries rather than labels that leave gaps.","A frequency for an interval does not give the individual measurements inside it.","Check an exact boundary belongs to only one group.",grouped),
            Section("stem","How does a stem-and-leaf diagram keep every value?","Use place value to split a number into a stem and its last-digit leaf.","Write the leaves in order beside their stem. Include a key such as 3 | 7 means 37. The diagram shows individual values and the shape of the data.","A repeated leaf records a repeated value. Keep every one.","Use the key before reading the shortest or longest value.",stem_leaf),
            Section("graphs","Which graph fits which question?","Think about whether time order or a link between variables is more important.","Connect observations over time in a time series. To explore a relationship, plot paired values as scatter points and look for a pattern without joining the dots in time order.","An upward pattern can suggest a relationship. It does not show that one variable causes the other.","Label both axes and give both units.",graphs_data,time_fig),
            Section("story","Can a striking image still mislead?","An infographic uses images and text to explain data.","Look for a consistent key, fair scale, labels and enough context. A picture that changes width and height can greatly exaggerate change.","A bigger-looking symbol alone does not tell you the exact value.","Use the key rather than guessing from the visual size.",infographic)),
            (("Interval","A range between two boundaries."),("Time series","Values recorded at successive times."),("Scatter graph","A graph that shows pairs of values as points.")),6),
        Lesson("compare-data","Comparing data and checking predictions","Compare centres and spread and explain what a sample can tell you.",(
            Section("mean","How do I include every value in a frequency table?","A value with frequency five contributes five copies to the total.","Multiply each value by its frequency. Add the products and divide by the total frequency. For median, use positions in the ordered list. For mode, find a value with highest frequency.","Dividing by the number of distinct values ignores repetition.","Show the sum of the frequencies you used.",mean_table),
            Section("compare","Does the same average mean the same results?","Two sets of data can have the same centre and differ greatly in spread.","Use a measure of centre, such as median or mean, together with the range. The range is the greatest value minus the least value.","An identical median does not guarantee every value is close to that median.","Name both groups and use measurements from both to support each comparison.",compare_spread,spread),
            Section("conclude","How strong is my conclusion?","Look back at the initial prediction and at how the data were collected.","Compare fair measures, such as proportions for different sample sizes. Discuss one plausible source of variation. Recommend a useful change to the method if questions remain.","A pattern in a small sample may not hold for the whole population.","Use cautious language about a sample and avoid claiming a cause from a pattern alone.",investigate)),
            (("Mean","Total of the values divided by their count."),("Median","Middle value of ordered data, averaging the two middle values when needed."),("Range","Greatest value minus the least.")),6),
    )


def chapters():
    return (
        ("number-calculation","Number and calculation",make_number_unit()),
        ("expressions-equations","Algebraic representation and manipulation",make_algebra_unit()),
        ("shape-measure","2D and 3D shape",make_shape_unit()),
        ("fractions-ratio","Fractions, decimals, percentages, ratio and proportion",make_fraction_unit()),
        ("probability","Probability",make_probability_unit()),
        ("angles-construction","Angles and construction",make_angle_unit()),
        ("sequences-graphs","Sequences, functions and graphs",make_graph_unit()),
        ("transformations","Transformations",make_transformation_unit()),
        ("statistics","Statistics",make_statistics_unit()),
    )


if __name__ == "__main__":
    build_stage(8, chapters(), __file__)
