
"""Original Cambridge 0862 Stage 7 notes, checks and Progression-style tasks."""

from fractions import Fraction
from math import gcd, lcm
from prepare_0862_support import Lesson, Section, m, tex, table, field, choose, part, problem, figure, label, path, build_stage

STAGE = "stage-7"
BLUE, GOLD, INK, ICE = "#17666c", "#a05d1e", "#233e5c", "#dceff0"


def f(n):
    return m(tex(n))


def n(s, low=1, span=31):
    return low + s % span


def k(s, low=1, span=13):
    return low + (s // 31) % span


def mul(a,b):
    return m(rf"{tex(a)}\times {tex(b)}")


def d(cents):
    places=cents % 100
    return ("-" if cents<0 else "") + str(abs(cents)//100) + "." + f"{abs(cents)%100:02}".rstrip("0") if places else str(cents//100)


def num(prompt, answer, working, method, *, label="Your answer", unit="", wrong=None, display=None, fact=False):
    end = (f(answer) if display is None else m(display)) + ((" " + unit) if unit else "") + "."
    return part(prompt, end, tuple(working), method, field(answer,label=label), wrong, fact=fact)


def opt(prompt, correct, alternatives, s, working, method=None, *, quick=None, fact=False):
    options = (correct,) + tuple(alternatives)
    written = prompt.replace("Choose ", "Write ", 1) if prompt.startswith("Choose ") else prompt
    return part(written, correct, tuple(working), method or working[0], choose(options, s),
                quick=quick or prompt, fact=fact)


def paper(prompt, solution, explain, method):
    return part(prompt, solution, tuple(explain), method)


def svg(key, title, content, caption, *, h=163):
    return figure(STAGE, key, title, content, caption, h=h)


def rect(x,y,w,h,fill=ICE,stroke=BLUE):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="3" fill="{fill}" stroke="{stroke}" stroke-width="1.7"/>'


def dot(x,y,colour=BLUE):
    return f'<circle cx="{x}" cy="{y}" r="4" fill="{colour}"/>'


def boxes(key, names, caption):
    width = min(88, (308-9*(len(names)-1))/len(names))
    left = (360-(len(names)*width+9*(len(names)-1)))/2
    content = "".join(rect(left+i*(width+9),47,width,46) + label(left+i*(width+9)+width/2,75,word,size=13)
                      for i,word in enumerate(names))
    return svg(key, ", ".join(names), content, caption, h=132)


def nline(key, left, right, caption, *, points=(), open_left=None):
    x = lambda i: 26 + (i-left)*308/(right-left)
    body = path([(20,71),(341,71)],INK)
    body += ''.join(path([(x(i),66),(x(i),76)],INK)+label(x(i),94,i,size=12) for i in range(left,right+1))
    body += ''.join(dot(x(i),71,colour)+label(x(i),48,text,colour=colour) for i,text,colour in points)
    if open_left is not None:
        endpoint=x(open_left)
        body += path([(endpoint,71),(28,71)],BLUE,width=4)+path([(37,62),(25,71),(37,80)],BLUE,width=3)
        body += f'<circle cx="{endpoint}" cy="71" r="6" fill="#f8fbff" stroke="{BLUE}" stroke-width="3"/>'
    return svg(key, "Number line from " + str(left) + " to " + str(right), body, caption, h=112)


def grid_image(key, alt, caption, *, lines=(), dots=(), width=22):
    X = lambda a: 180+width*a
    Y = lambda b: 94-width*b
    body = ''.join(path([(X(i),12),(X(i),177)],"#d7e8ee",width=1) for i in range(-7,8))
    body += ''.join(path([(21,Y(j)),(339,Y(j))],"#d7e8ee",width=1) for j in range(-3,4))
    body += path([(21,94),(339,94)],INK)+path([(180,12),(180,177)],INK)
    body += label(344,91,"x",size=12)+label(190,13,"y",size=12)+label(169,110,"0",size=12)
    body += ''.join(label(X(x),108,x,size=10) for x in range(-6,7) if x)
    body += ''.join(label(168,Y(y)+4,y,size=10) for y in range(-3,4) if y)
    body += ''.join(path([(X(a),Y(b)) for a,b in points],colour,closed=closed) for points,colour,closed in lines)
    body += ''.join(dot(X(a),Y(b),colour)+label(X(a)+13,Y(b)-6,text,size=12,colour=colour)
                    for a,b,text,colour in dots)
    return svg(key,alt,body,caption,h=190)


def S(slug,title,intro,idea,mistake,tip,model,diagram=None):
    return Section(slug,title,intro,idea,mistake,tip,model,diagram)


def L(slug,title,goal,sections,terms,exam=5):
    return Lesson(slug,title,goal,tuple(sections),tuple(terms),exam)


def place(s, divide=False):
    a=n(s,13,77)
    power=k(s,1,3)
    original=Fraction(a,10) if not divide else a*10**power+Fraction(a,100)
    answer=original/10**power if divide else original*10**power
    sign=r"\div" if divide else r"\times"
    question=m(rf"{d(int(original*100))}{sign}10^{power}")
    answer_text = (str(int(answer)) if answer.denominator==1 else f"{float(answer):.5f}".rstrip("0"))
    calculated=part(
        "Work out "+question+".",
        m(answer_text)+".",
        (f"{m('10^'+str(power))} equals {f(10**power)}.",
         f"Each digit moves {power} place{'s' if power>1 else ''} to the {'right' if divide else 'left'} in a place-value chart."),
        "Count one place for each factor of 10.",
        field(answer),
        (str(original*10**power if divide else original/10**power),"The digits are moving the opposite way. Check whether the answer should be larger or smaller.")
    )
    compare=paper("Explain how you can tell whether your answer will be larger than the starting number.",
                  f"Dividing a positive number by {10**power} gives a smaller value." if divide else f"Multiplying a positive number by {10**power} gives a larger value.",
                  ("Compare the factor with 1.",),"Use that the factor is greater than 1.")
    return problem("Powers of ten","Look at this calculation "+question+".",calculated,compare)


def rounding(s):
    a=n(s,2,59)
    b=k(s,1,8)
    x=f"{a}.{b}{s%10}{(s//13)%9+1}"
    decimal_places=1+s%2
    factor=10**decimal_places
    rounded=(int(Fraction(x)*factor+Fraction(1,2)))
    answer=Fraction(rounded,factor)
    digits=x.split(".")[1]
    next_digit=int(digits[decimal_places])
    return problem("Choosing a rounded measurement",f"A model train travels {x} m in a test run.",
        num(f"Round the distance to {decimal_places} decimal place{'s' if decimal_places>1 else ''}.",answer,
            (f"Keep {decimal_places} digit{'s' if decimal_places>1 else ''} after the decimal point and look at the next digit, {next_digit}.",
             "It is at least 5, so round up." if next_digit>=5 else "It is below 5, so keep the last digit."),"Look at the digit just to the right of the last place you want.",
            unit="m", display=f"{rounded/factor:.{decimal_places}f}",
            wrong=(str(Fraction(int(Fraction(x)*factor),factor)), "Use the next digit to choose whether to round up.") if next_digit>=5 else None),
        num("Round the original distance to the nearest metre.",a+(b>=5),(f"The tenths digit is {b}.",),"Look at the tenths digit.",unit="m"))


def signed(s, subtract=False):
    a=n(s,2,30)
    b=k(s,2,12)+s%7
    x=-(a if s%3!=1 else -a)
    y=-(b if s%2 else -b)
    sign="-" if subtract else "+"
    result=x-y if subtract else x+y
    q=m(f"{x}{sign}({y})")
    estimate=round(x/10)*10 + (-1 if subtract else 1)*round(y/10)*10
    return problem("Moving along a number line",f"The starting value is {f(x)}. Here is the calculation {q}.",
        num("Find the result.",result,
            (f"Start at {x} on a number line.",f"Move {abs(y)} steps {'right' if (result>x) else 'left'}."),
            "Start on the first number, then work out the direction and number of steps.",
            wrong=(str(x-(-1 if subtract else 1)*y),"Look at the operation sign and the sign of the second number separately.")),
        paper("Explain how to estimate the answer before working it out.",f"Round each input to a multiple of 10. This gives an estimate of {estimate}.",
              ("Keep the signs when you round. An estimate need only be close.",),"Round both original values to a convenient multiple of 10."))


def signed_groups(s):
    a=n(s,3,36)
    b=k(s,2,8)
    negative=-a*b
    return problem("Temperature changes",f"A freezer drops by {a} degrees per hour for {b} hours.",
        num("What is the total signed change?",negative,
            (f"Each hour changes the temperature by {f(-a)} degrees.",f"Use {mul(b,-a)}."),"Multiply the number of hours by the signed change.",
            unit="degrees",wrong=(str(a*b),"A drop is a negative change.")),
        num(f"Divide your total signed change by {b} to check the signed change per hour.",-a,
            (f"Divide the negative total, {negative}, by the positive time, {b}.","The signs differ, so the quotient is negative."),
            "Divide the signed change by the number of hours.",unit="degrees per hour"),
        paper(f"Write a signed division that gives the same answer as dividing {a*b} by {b}.",
              f"{f(negative)} divided by {f(-b)} gives {f(a)}.",
              ("Both numbers can be negative because a negative divided by a negative is positive.",),"Use the division sign rules."))


def order(s):
    a=n(s,2,23)
    b=k(s,2,11)
    c=2+s%4
    first=a+b*c**2
    second=(a+b)*c**2
    return problem("Compare two calculations",f"The same three numbers, {a}, {b} and {c}, appear in two calculations.",
        num("Work out "+m(rf"{a}+{b}\times {c}^2")+".",first,
            (f"Calculate {c} squared first. It is {c*c}.", f"Multiply {b} by {c*c}, then add {a}."),"Do powers, then multiplication, then addition.",
            wrong=(str(second),"There are no brackets around the addition, so multiply before adding.")),
        num("Work out "+m(rf"({a}+{b})\times {c}^2")+".",second,
            (f"Work out the bracket: {a+b}.",f"Multiply that by {c*c}."),"Do the addition inside brackets first."))


def square(s):
    a=n(s,2,18)
    b=k(s,2,8)
    return problem("Square tiles",f"A square sits on a board next to a row of {b} loose tiles. The square has area {a*a} square units.",
        num("What is the side length of the square?",a,
            (f"Find the positive number that gives {a*a} when multiplied by itself.",f"{a} squared is {a*a}."),"Take the square root of the area.",
            wrong=(str(a*a),"A square root reverses squaring. Start with the area and find the side.")),
        num("How many tiles are used, including the loose tiles, if each covers one square unit?",a*a+b,
            (f"The square takes {a*a} tiles.",f"Add the {b} loose tiles."),"Add the separate tile counts."))


def cube(s):
    a=n(s,2,13)
    b=k(s,1,7)
    return problem("A cube made of small blocks",f"A solid cube contains {a**3} small unit cubes. A second cube has an edge {b} units longer.",
        num("How long is each edge of the first cube?",a,
            (f"A cube with edge {a} has {a} lots of {a} by {a}.",
             f"{m(rf'{a}^3')} is {f(a**3)}."),"Take the cube root to undo cubing.",unit="units",
            wrong=(str(a*a),"Count the blocks along one edge, rather than the blocks on a face.")),
        num("How many blocks make the second cube?",(a+b)**3,
            (f"The edge is {a+b} units.",f"Multiply {a+b} by itself three times."),"Add to the side length first, then cube it."))


def common(s, multiple=False):
    a=2+s%6
    n1=n(s//6,2,11)
    n2=k(s,3,9)
    x,y=a*n1,a*n2
    if x==y:
        y+=a
    if multiple:
        start=k(s,1,9)
        return problem("Two flashing lights",f"An amber light flashes every {x} seconds and a blue light every {y} seconds. Both flash at second {start}.",
            num(f"How many seconds after second {start} will both first flash at the same time?",lcm(x,y),
                (f"Look for a positive number in both the {x} and {y} times tables.",f"The first match is {lcm(x,y)}."),"Find the least common multiple.",
                unit="seconds",wrong=(str(x*y),"A product is a common multiple, but check for an earlier shared flash.") if x*y!=lcm(x,y) else None),
            num("At which clock second does this happen?",lcm(x,y)+start,
                (f"Add the interval {lcm(x,y)} to the start time {start}.",),"Add the elapsed time to the start time.",unit="seconds"))
    return problem("Identical activity packs",f"A club has {x} pencils and {y} stickers. It uses all the items to make identical packs.",
        num("Find the greatest possible number of packs.",gcd(x,y),
            (f"The number of packs must divide both {x} and {y} exactly.",f"The greatest shared divisor is {gcd(x,y)}."),"Find the highest common factor.",
            wrong=(str(min(x,y)),"The smaller total divides itself, but it may not divide the other total.") if min(x,y)!=gcd(x,y) else None),
        num("How many stickers go into each of these packs?",y//gcd(x,y),
            (f"Share {y} stickers among {gcd(x,y)} packs.",),"Divide the sticker total by the number of packs."))


def divisibility(s):
    q=n(s,111,151)
    correct=9 if q%2 else 7
    a=q*correct
    alternatives=(10,11,12)
    return problem("Testing factors of a larger number",f"A store has {a} small clips. Different organisers are sold in trays of {correct}, {alternatives[0]}, {alternatives[1]} and {alternatives[2]}.",
        num(f"How many trays of {correct} can be filled exactly using all the clips?",q,
            (f"Divide {a} by {correct}.",f"Check by multiplying {q} by {correct}."),"A factor divides the number exactly."),
        paper(f"Use a divisibility test to decide whether trays of {alternatives[0]} can use all the clips.",
              "Yes, because the ones digit is 0." if a%10==0 else "No. The ones digit is not 0.",
              (f"The ones digit of {a} is {a%10}.","A whole number is divisible by 10 exactly when the ones digit is 0."),"Check the ones digit."),
        paper("Give another factor of the number greater than 1.",f"For example, {q} is also a factor.",
              (f"The multiplication {mul(q,correct)} gives {a}.",),"Use one pair of factors."))


def add_case(s):
    return signed(s)


def sub_case(s):
    return signed(s,True)


def shift_less(s):
    return place(s,True)


def lcm_case(s):
    return common(s,True)


def chapter_number():
    return (
        L("place-value","Place value and rounding","Use powers of ten to change a number and round measurements to a stated precision.",(
          S("multiply","What changes when we multiply by 10?","Put each digit in a place-value column. A digit moves one place for each factor of ten.",
            "One column to the left makes a digit worth ten times as much. Keep a zero in a column if no digit fills it.",
            "Moving the decimal point can hide what changes. Track the value of the digits in their columns.",
            "Use the power of 10 to count the number of moves before writing the answer.",place,
            boxes("place-value",("Tens","Ones","Tenths"),"Each column is ten times the value of the column on its right.")),
          S("divide","How do we divide by a power of 10?","A digit worth 7 ones becomes worth 7 tenths after one division by ten.",
            "Divide by ten by moving each digit one column to the right in a place-value chart.",
            "Two zeros in 100 mean two places, even if the original number already contains zeros.",
            "For a positive starting value, check the quotient is smaller when dividing by a power of ten greater than one.",shift_less),
          S("round","Which digit tells us how to round?","The requested precision tells you which digit to keep. The next digit decides whether it changes.",
            "If the next digit is 0 to 4, keep the last digit. If it is 5 to 9, increase the last digit and carry if needed.",
            "Do the rounding once. Rounding to two places and then to one place can give a different answer.",
            "Keep a final zero if it shows the number of decimal places requested.",rounding)),
          (("Place value","The value of a digit in its column."),("Tenths","The first position to the right of the decimal point."),("Round","Find the nearest number at the requested precision.")),5),
        L("signed-integers","Calculating with signed integers","Estimate and use the four operations with positive and negative whole numbers.",(
          S("addition","Where do we move when we add?","Start at the first number. The sign of the number you add gives the direction.",
            "Add a positive by moving right. Add a negative by moving left.", "The first number sets the start point. Keep its sign.",
            "Estimate with nearby signed multiples of ten.",add_case,nline("signed-integers",-5,5,"Adding a negative moves left. Adding a positive moves right.",points=((-3,"start",BLUE),(2,"finish",GOLD)))),
          S("subtraction","What does it mean to subtract a negative?","Read subtraction as removing a change. Taking away a drop has the same effect as adding a rise.",
            "To subtract an integer, add its opposite. For example, "+m("2-(-3)=2+3=5")+".",
            "Two minus signs only become plus when you actually subtract a negative number.",
            "Rewrite subtraction as addition of the opposite before using a number line.",sub_case),
          S("groups","How do signs work when we multiply or divide?","Multiplication can count repeated equal changes. Division can find the change per group.",
            "For multiplication and division, equal signs give a positive answer and different signs give a negative answer.",
            "A negative answer in a temperature problem often describes a drop. The size of the drop is positive.",
            "Predict the sign before calculating the size.",signed_groups)),
          (("Integer","A whole number, its opposite, or zero."),("Opposite","A number the same distance from zero on the other side."),("Signed change","A change with a sign to show its direction.")),5),
        L("powers-order","Powers, roots and calculation order","Read square and cube notation and work out expressions in the correct order.",(
          S("order","Which part of a calculation comes first?","An expression is a set of instructions. Group with brackets when you want an operation to happen first.",
            "Work inside brackets first. Then work out powers, then multiply or divide from left to right, then add or subtract from left to right.",
            "A multiplication still comes before an addition when you read it second.",
            "Write each line of working with the same value as the previous line.",order,
            boxes("calculation-order",("Brackets","Powers","× or ÷","+ or −"),"Use a fixed order. Tied operations go from left to right.")),
          S("squares","How does a square root undo a square?","A square array has the same number of rows and columns. Its area is its side length squared.",
            m(r"6^2=6\times6=36")+" and "+m(r"\sqrt{36}=6")+". The square root symbol asks for the non-negative root.",
            "Squaring means multiplying a number by itself, not multiplying it by two.",
            "Check a positive square root by squaring it.",square),
          S("cubes","What does a cube root tell us?","Think of a solid block with the same number of unit cubes along its length, width and height.",
            m(r"4^3=4\times4\times4=64")+" and "+m(r"\sqrt[3]{64}=4")+".",
            "Use three equal factors to make a cube. Adding the edges does not count all the blocks.",
            "Cube your answer to check a cube root.",cube)),
          (("Power","A repeated product written with an exponent."),("Square root","The non-negative number whose square is the given number."),("Cube root","A number whose cube is the given number.")),5),
        L("factors-multiples","Factors, multiples and divisibility","Find common factors and multiples and test divisibility of larger whole numbers.",(
          S("factors","What is the biggest group count that works?","Two totals can be split into the same number of equal groups only when that group count divides both totals exactly.",
            "List or pair factors of each number. The highest common factor is the greatest value on both lists.",
            "The smaller total is only the highest common factor if it divides the larger total exactly.",
            "Test a proposed common factor by dividing both numbers.",common,
            boxes("factors-multiples",("Factor","×","Factor","Product"),"A factor is part of a product. The product is a multiple of both factors.")),
          S("multiples","When will two repeating events meet again?","List the times after the shared start for both events. Look for the first matching time.",
            "A least common multiple is the smallest positive value in both lists of multiples.",
            "The product of both periods is a common multiple, but there may be a smaller one.",
            "Check that both periods divide your time gap exactly.",lcm_case),
          S("tests","Can we spot factors without long division?","A quick test rules a factor in or out. A successful test helps you find a partner factor.",
            "Check the ones digit for 2, 5 and 10. Add the digits for divisibility by 3 or 9. Check the last two digits for divisibility by 4.",
            "Adding digits tests 3 and 9. It does not test an arbitrary divisor.",
            "Show the particular fact your test uses.",divisibility)),
          (("Factor","A whole number that divides another whole number equally."),("Multiple","A product of a number and a whole number."),("Common factor","A factor shared by both numbers.")),5)
    )


def letters(s):
    a=n(s,2,41)
    b=k(s,2,7)
    option = m(f"{b}q+{a}")
    return problem("Tickets and a booking charge",f"A club buys {b} tickets at {f('q')} pounds each and pays a fixed booking charge of £{a}.",
        opt("Write an expression for the total cost.",option,(m(f"{b}q-{a}"),m(f"({b}+{a})q"),m(f"{a}q+{b}") if a!=b else m(f"{b}+{a}-q")),s,
            ("Multiply the ticket price by the number of tickets.","Add the fixed charge once.")),
        paper("Explain which value can vary when a different ticket type is chosen.","The price per ticket, q, can vary. The number of tickets and the booking charge are fixed here.",
              ("A letter can stand for a value that changes.",),"Identify the quantity represented by the letter."))


def like_terms(s):
    a,b,c=n(s,2,41),k(s,2,9),2+s%11
    if s%2:
        a+=10
        b=-b
    sign="+" if b>0 else "-"
    form=f"{a}x+{c}{sign}{abs(b)}x"
    correct=f"{a+b}x+{c}"
    test=2+s%7
    return problem("Like terms",f"A group of terms is {m(form)}.",
        part("Simplify the expression.",m(correct)+".",
            (f"Combine the two terms containing x. Their coefficients are {a} and {b}.",f"The constant {c} remains separate."),
            "Collect like terms only.",field(correct,"polynomial",label="Simplified expression",variables=("x",)),
            (f"{a+b+c}x","A plain number cannot be collected with an x term.")),
        num(f"Work out the value of your simplified expression when x is {test}.",(a+b)*test+c,
            (f"Put {test} in place of x.",f"Multiply {a+b} by {test}, then add {c}."),"Substitute into the simplified expression."))


def bracket(s):
    a,b=n(s,2,42),k(s,2,9)
    prompt=m(f"{b}(x+{a})")
    correct=f"{b}x+{a*b}"
    return problem("An area model for a bracket",f"The sides of a rectangle are {f(b)} and {m(f'x+{a}')} units.",
        part(f"Expand {prompt}.",m(correct)+".",
            (f"Split the rectangle into strips of widths x and {a}.",f"Multiply each width by {b}."),
            "Multiply each term in the bracket by the number outside.",field(correct,"polynomial",label="Expanded expression",variables=("x",)),
            (f"{b}x+{a}","The outside factor multiplies both terms, including the constant.")),
        num(f"Find its area when x is {b}.",b*(b+a),
            (f"The longer side becomes {b+a} units.",f"Multiply that by {b}."),"Substitute and then multiply.",unit="square units"))


def expression_words(s):
    a=n(s,3,33)
    b=k(s,2,9)
    correct=m(f"{b}r-{a}")
    return problem("Writing a number instruction",f"A machine multiplies an input r by {b} then subtracts {a}.",
        opt("Write the output as an expression in r.",correct,(m(f"{b}(r-{a})"),m(f"{a}-{b}r"),m(f"{b}r+{a}")),s,
            (f"Multiplying gives {m(f'{b}r')}.",f"Subtract {a} from that result.")),
        num(f"Find the output when r is {a}.",a*(b-1),
            (f"Multiply {a} by {b}, then subtract {a}.",),"Use the same instruction on a number."))


def formula(s):
    a=n(s,5,47)
    b=k(s,2,11)
    return problem("Using a formula for rows",f"A tray has {b} equal rows. The letter r is the number of objects in one row, which can hold up to {a+5} objects.",
        opt("Write a formula for the total number T.",m(f"T={b}r"),(m(f"T=r+{b}"),m(f"T=r/{b}"),m(f"T=r-{b}")),s,
            (f"There are {b} rows, with r objects in each.",),method="Multiply the number of rows by the number per row."),
        num(f"Find T when each row holds {a} objects.",a*b,(f"Put {a} in place of r.",),"Multiply the two counts."))


def substitute(s):
    a=n(s,3,35)
    b=k(s,2,11)
    x=2+s%8
    y=2+s%5
    q=m(rf"{b}x+({a}+y)\div {y}")
    ans=b*x+Fraction(a+y,y)
    return problem("Order of operations with letters",f"Use x = {x} and y = {y} in {q}.",
        num("Work out its value.",ans,(f"Start inside the bracket: {a}+{y} gives {a+y}.",
            f"Divide the bracket result by {y}. Then add the product {b} × {x}."),"Substitute and keep the order of operations."),
        paper("What operation is hidden in the term "+m(f"{b}x")+"?",
              f"Multiplication by {b}.",("A coefficient next to a variable multiplies it.",),"Read the coefficient as a factor."))


def balance(s, one=False):
    a=n(s,3,57)
    b=k(s,2,11)
    root=a+2
    coeff=1 if one else b
    total=coeff*root+a
    xterm="x" if one else f"{coeff}x"
    return problem("Finding a missing length",f"A ribbon is cut into {coeff} {'piece' if one else 'equal pieces'} of length x cm and one extra piece of {a} cm. The entire ribbon is {total} cm long.",
        num("Find x.",root,(f"The equation is {m(f'{xterm}+{a}={total}')}.",
            f"Subtract {a} from both sides to leave {coeff*root} on the right."+(f" Then divide by {coeff}." if not one else "")),
            "Undo the added length, then share the rest equally.",label="Value of x",unit="cm"),
        num("How long are the equal pieces together?",coeff*root,
            (f"Use {coeff} equal pieces of length {root} cm.",),"Multiply length by the number of equal pieces.",unit="cm"))


def inequality(s):
    high=n(s,3,39)
    low=high-k(s,2,11)
    sign="<" if s%2 else ">"
    bound=low if sign==">" else high
    right=bound+1 if sign==">" else bound-1
    wrong=bound-2 if sign==">" else bound+2
    return problem("Read an open inequality",f"The room temperature t is described by {m(f't{sign}{bound}')} degrees.",
        opt("Choose a possible value of t.",f(right),(f(bound),f(wrong),f(bound+(3 if sign=="<" else -3))),s,
            (f"The inequality points towards the allowed side of {bound}.",f"The boundary {bound} itself is excluded."),
            "Match the comparison symbol to a number above or below the boundary."),
        paper("Draw this inequality on a number line. Describe which way your arrow points.",
              f"An open circle at {bound} and an arrow pointing {'right' if sign=='>' else 'left'}.",
              ("An open circle shows that the endpoint does not belong.","The arrow shows all possible values, including non-integers."),"Use an open endpoint and show its allowed side."))


def one_step(s):
    return balance(s,True)


def chapter_algebra():
    return (
      L("algebra-basics","Letters and algebraic expressions","Use letters for changing or unknown values, collect like terms and expand one bracket.",(
        S("letters","What can a letter stand for?","A letter can name a number that is unknown, fixed or allowed to change. Read its meaning in the question.",
          "Write repeated multiplication by the same quantity as a coefficient. If each notebook costs p pounds, three cost "+m("3p")+".",
          "The expression "+m("3p")+" means three times p. It does not mean p plus three.","Say what each letter represents before using it.",letters,
          boxes("like-terms",("x","x","x","1"),"The three x tiles combine into 3x. The unit tile remains a separate term.")),
        S("collect","Which terms can we join?","An x term names one kind of amount. A constant is given as a plain number.",
          "For like terms, add or subtract their coefficients. Keep terms of a different kind separate.",
          "Do not join x with a plain number or with a different letter.","Check the letter and its power before combining terms.",like_terms),
        S("expand","What sits outside the bracket?","Think of a rectangle split into strips. Its height multiplies each strip width.",
          "For a constant a, distribute it across every term. "+m("a(x+b)=ax+ab")+".",
          "The number outside multiplies the whole bracket, including the last term.","Check an expansion by trying a small value of x in both forms.",bracket)),
        (("Variable","A letter used for a value that can change."),("Coefficient","The number multiplying an algebraic term."),("Expand","Write a product as a sum or difference of terms.")),5),
      L("formulas","Expressions, formulae and substitution","Write a short rule in algebra and find values by substituting in the correct order.",(
        S("word-rules","How do words become an expression?","Read each action. Write the variable when the starting number is unknown.",
          "If the rule says multiply then subtract, the subtraction is outside the product.",
          "A bracket changes the order. "+m("4(r-2)")+" subtracts before multiplying.","Work through one value to check your translation.",expression_words,
          boxes("algebra-machine",("Input r","× 4","− 2","Output"),"Read the arrows in order to write 4r − 2.")),
        S("formula","What makes a rule a formula?","A formula links named quantities. Use letters to label the quantities and an equals sign to connect the rule.",
          "If b objects go in each of r rows, use "+m("T=br")+" to find the total T.",
          "The equals sign connects two equal values. Avoid using it as a running list of actions.",
          "Check that the units on each side describe the same quantity.",formula),
        S("substitution","How do we replace a letter with a number?","Write the given value in place of each letter. Keep brackets around a negative value where needed.",
          "After substitution, calculate brackets and powers first, then multiplication and division, then addition and subtraction.",
          "A coefficient beside a letter is a multiplication. Do not join their digits.","Show the substituted calculation before the answer.",substitute)),
        (("Expression","A collection of operations, numbers and letters without an equals sign."),("Formula","An equation connecting named quantities."),("Substitute","Replace a letter with its stated value.")),5),
      L("equations-inequalities","Equations and open inequalities","Set up and solve one- and two-step equations and find values above or below a boundary.",(
        S("one-step","How do we keep an equation balanced?","An equation says that two expressions have the same value. Changes to both sides keep it true.",
          "Undo addition by subtraction. Undo multiplication by division by the same non-zero number.",
          "Changing only one side usually changes the solutions.","Check the value in the original equation.",one_step,
          boxes("equation-balance",("x + 8","=","20"),"The same subtraction on both sides leaves x = 12.")),
        S("two-step","Which operation do we undo first?","Look at the last operation applied to the unknown. Work backwards until the unknown stands alone.",
          "In "+m("3x+4=22")+", subtract four from both sides first, then divide both sides by three.",
          "Dividing only the x term by three leaves the rest of the equation unbalanced.",
          "Check both sides using the solution you found.",balance),
        S("open-interval","Which side of the boundary is allowed?","An inequality describes a collection of values. Locate the boundary first.",
          "For "+m("x<5")+", mark an open circle at five and point left. For "+m("x>5")+", point right.",
          "Strict signs exclude the endpoint. The values include decimals as well as whole numbers.",
          "Use an open circle when the boundary is excluded.",inequality,
          nline("open-boundary",0,8,"The allowed values in x < 5 lie to the left of 5, without including it.",open_left=5))),
        (("Equation","A statement that two expressions are equal."),("Solution","A value for which the statement is true."),("Strict inequality","A comparison that excludes equality.")),5)
    )


def polygon(s):
    count=3+s%10
    length=n(s,2,31)
    names={3:"equilateral triangle",4:"square",5:"regular pentagon",6:"regular hexagon",7:"regular heptagon",
           8:"regular octagon",9:"regular nonagon",10:"regular decagon",11:"regular 11-sided polygon",12:"regular dodecagon"}
    return problem("A fence made to a regular shape",f"A regular polygon has {count} sides. Every side is {length} m long.",
        num("How many lines of symmetry does the polygon have?",count,
            (f"The shape is a {names[count]}.",f"It has the same number of mirror lines as sides, so there are {count}."),"Find the lines that divide the shape into matching halves."),
        num("Find the perimeter.",count*length,(f"Add {count} lengths of {length} m.",),"Multiply one side by the number of sides.",unit="m"),
        paper("Sketch an example and describe what makes it regular.",
              f"Sketch {'an' if count==3 else 'a'} {names[count]}. It has {count} equal sides and {count} equal angles.",
              ("Mark equal sides with matching ticks. Check that each corner is the same size.",),
              "Use both side and angle properties to explain regularity."))


def reflective(s):
    x,y=n(s,3,32),k(s,2,15)
    if x==y:
        y+=1
    oblong=f"{x} cm by {y} cm"
    return problem("Mirror lines of a rectangle",f"A rectangular sign measures {oblong}.",
        num("How many lines of symmetry does the sign have?",2,
            ("One mirror line joins the midpoints of the two short sides.", "The other joins the midpoints of the two long sides."),
            "Find lines that make the two halves match exactly.",
            wrong=("4","The diagonals reflect the shape only when the rectangle is also a square.")),
        paper("Explain whether the number of mirror lines changes if the two lengths become equal.",
              "It increases from 2 to 4. A square has the two midpoint lines and two diagonal lines.",
              ("With equal adjacent sides, each diagonal also reflects the shape onto itself.",),"Compare the mirror lines in a rectangle and a square."))


def rotational(s):
    repeat=2+s%9
    rings=k(s,1,13)
    angle=Fraction(360,repeat)
    return problem("A rotating logo",f"A logo has {rings} concentric rings. On each ring, the same pattern repeats in {repeat} identical equal sectors.",
        num("What is its order of rotation?",repeat,
            (f"The full turn is split into {repeat} equal matching steps.", "The starting orientation at the completed turn counts once."),
            "Count how many times it fits itself in one full turn."),
        num("How many degrees is its smallest non-zero matching turn?",angle,
            (f"Divide {m('360^\\circ')} by {repeat}.",),"Divide one full turn by the order.",unit="degrees"))


def congruence(s):
    a,b=n(s,4,35),k(s,2,12)
    return problem("Congruent warning signs",f"Two triangles ABC and PQR are congruent. A corresponds to P, B to Q and C to R. AB is {a} cm and BC is {b} cm.",
        num("Find the length PQ.",a,
            ("Match A with P and B with Q.", "AB and PQ are the corresponding sides."),"Match both endpoints before copying the length.",unit="cm"),
        num("Find the length QR.",b,
            ("Match B with Q and C with R.",),"Use the correspondence between the vertices.",unit="cm"),
        paper("Which angle matches angle BCA?","Angle QRP.",
              ("C is the middle letter because the angle is at C. Match each letter in order.",),"Use the matching list of vertices."))


def circle(s):
    diameter=2*n(s,3,31)
    chord=k(s,2,min(8,diameter-3))
    return problem("Parts of a circular seal",f"A seal is circular. A straight line through its centre from edge to edge is {diameter} mm long.",
        num("Find the radius.",diameter//2,("The described line is a diameter.", "Two radii make the diameter."),
            "Halve the diameter.",unit="mm",wrong=(str(diameter),"The diameter crosses the whole circle. A radius goes only from the centre to the edge.")),
        paper(f"A second straight segment on this seal is {chord} mm long and joins two points on its edge. Name this kind of segment.",
              "It is a chord.",("Both endpoints are on the circumference.",),"A chord joins two points on the circumference."),
        paper("What is a straight line that touches the circle at just one point called?",
              "A tangent.",("The touch point is on the circumference.",),"Use the name for a line that meets a circle at one point."))


def lines_shapes(s):
    a=n(s,4,26)
    b=k(s,2,10)
    return problem("Planning a small paved rectangle",f"A paving plan is a rectangle {a} m long and {b} m wide. Label its corners in order A, B, C and D, starting along a long edge.",
        opt("Which edge is parallel to AB?", "CD",("BC","DA","AC"),s,
            ("Opposite edges of a rectangle run in the same direction.",),
            quick="Choose the edge that is parallel to AB."),
        paper("Draw the plan on squared paper using 1 square for each metre. Name a pair of perpendicular edges and mark the right angle.",
              "For example, AB and BC meet at a right angle. The diagram must have two sides of each stated length.",
              (f"Start with AB along a grid line, {a} squares long.",f"At B, follow a perpendicular grid line for {b} squares."),
              "Sketch the stated lengths, then use grid lines for the right angles."))


def area_units(s):
    a=n(s,12,40)
    groups=k(s,2,7)
    large=("cm²","m²","ha")[s%3]
    small=("mm²","cm²","m²")[s%3]
    factor=(100,10_000,10_000)[s%3]
    return problem("Converting a measured area",f"A parcel map records a region with area {a*factor} {small}. There are {groups} regions of that size.",
        num(f"Convert the area of one region to {large}.",a,
            (f"One {large} equals {factor} {small}.", f"Divide {a*factor} by {factor}."),"Use the conversion factor for area.",unit=large,
            wrong=(str(a*factor//10),"The conversion is for a square unit. Use the area factor, not one move of ten.")),
        num(f"Find the total area of all {groups} regions, in {large}.",a*groups,
            (f"Each region takes {a} {large}.",),"Multiply that area by the number of regions.",unit=large))


def triangle(s, composite=False):
    base,height=n(s,5,39),k(s,2,15)
    side=2+s%8
    half=Fraction(base*height,2)
    area=half+(base*side if composite else 0)
    given=f"A triangle has base {base} cm and perpendicular height {height} cm."
    if composite:
        given+=f" Its base lies along the top edge of a rectangle that is {base} cm wide and {side} cm high. The shapes do not overlap."
    main=num("Find the area of the whole shape." if composite else "Find the area of the triangle.",area,
        (f"Half of {mul(base,height)} is {f(half)}. That is the triangle area.",)+(
         (f"The rectangle adds {f(base*side)} square centimetres.",) if composite else ()),
        "Use half the base times the perpendicular height, and count each part once.",unit="cm²",
        wrong=(str(base*height+(base*side if composite else 0)),"A triangle has half the area of the matching rectangle."))
    return problem("A shape on a workshop plan",given,main,
        paper("Explain why the triangle area uses a factor of one half.",
              "Two copies of the triangle can make a parallelogram with the same base and height. The parallelogram has twice the triangle area.",
              ("Turn one copy over a shared edge or use the matching enclosing rectangle.",),"Use the base and perpendicular height of the doubled shape."))


def composite_area(s):
    return triangle(s,True)


def solid(s):
    count=(3,4,5,6,7,8)[s%6]
    copies=k(s,2,12)
    names={3:"triangular",4:"quadrilateral",5:"pentagonal",6:"hexagonal",7:"heptagonal",8:"octagonal"}
    return problem("A display of prisms",f"A display has {copies} identical {names[count]} prisms. Each has a {count}-sided polygon at each end.",
        num("How many faces does one prism have?",count+2,
            ("There are two end faces.",f"There are {count} side faces, one for each edge of the end face."),"Count the side faces and both identical ends."),
        num("How many vertices does one prism have?",2*count,
            (f"There are {count} vertices on each end.",),"Count the same number of vertices twice."),
        num("Find the total number of faces, counting each prism separately.",copies*(count+2),
            (f"Each of the {copies} prisms has {count+2} faces.",),"Multiply by the number of separate prisms."))


def volume(s, compound=False):
    a,b,c=n(s,3,21),k(s,2,10),2+s%7
    e=k(s,1,6)
    unit=("cm","mm","m")[s%3]
    main=a*b*c
    extension=e*b*(c-1)
    extra=f" A second block measuring {e} {unit} by {b} {unit} by {c-1} {unit} stands next to it on the same base level and makes a step." if compound else ""
    return problem("Building a stack of cuboids",f"A cuboid measures {a} {unit} by {b} {unit} by {c} {unit}."+extra,
        num("Find the volume of the whole solid.",main+(extension if compound else 0),
            (f"The first base has area {a*b} {unit}².",f"Multiply by the height {c} {unit} to get {main} {unit}³.")+(
             (f"Add the volume of the other block, {extension} {unit}³.",) if compound else ()),
            "Find base area times height for each cuboid, then add their volumes.",unit=f"{unit}³"),
        num(f"How many 1 {unit} cubes cover the base of the first cuboid in a single layer?",a*b,
            (f"The layer has {a} by {b} cubes.",),"Count the unit squares on the base."))


def compound_volume(s):
    return volume(s,True)


def views(s, side=False):
    a,b,c=n(s,3,22),k(s,2,8),2+s%9
    u,v=(b,c) if side else (a,b)
    view="right-side view" if side else "plan view from above"
    return problem("Looking at a box from different directions",f"A cuboid is {a} cm wide across the front, {b} cm deep and {c} cm high.",
        num(f"Find the area of the rectangle in its {view}.",u*v,
            (f"The {view} shows the {'depth and height' if side else 'front width and depth'}.",f"Use {mul(u,v)}."),"Identify the two visible dimensions.",unit="cm²"),
        paper("Sketch the front view and label its dimensions.",f"A rectangle {a} cm wide and {c} cm high.",
              ("The width across the front and the height make the front rectangle.",),"Choose the two edges visible from the front."))


def side_view(s):
    return views(s,True)


def surface(s):
    a,b,c=n(s,2,23),k(s,2,8),2+s%6
    area=2*(a*b+a*c+b*c)
    return problem("Wrapping a cardboard model",f"A closed rectangular box measures {a} cm by {b} cm by {c} cm.",
        num("Find the total surface area of all six faces.",area,
            (f"The three different face areas are {a*b}, {a*c} and {b*c} square centimetres.","Each has one opposite face of equal area."),
            "Double the sum of the three face areas.",unit="cm²",
            wrong=(str(area//2),"There are two of each face. Include both ends of every pair.")),
        num(f"The box is opened by removing one face measuring {a} cm by {b} cm. Find the area of the remaining faces.",
            area-a*b,(f"Remove one face area of {a*b} square centimetres.",),"Subtract the area of one removed face.",unit="cm²"))


def angles_sum(s, quadrilateral=False):
    a=n(s,60,39)
    b=k(s,65,24)
    c=77+s%15
    missing=360-a-b-c
    context="the four interior angles of a quadrilateral" if quadrilateral else "four sectors around a point"
    return problem("A missing angle",f"Three of {context} are {a}°, {b}° and {c}°.",
        num("Find the fourth angle.",missing,(f"The three angles add to {a+b+c}°.",f"Take this from 360°."),
            "Use the total of 360 degrees.",unit="degrees",
            wrong=(str(180-(a+b+c)),"Use a full turn or the total for two triangles. This is not a straight-line angle sum.")),
        paper("Explain where the total of 360° comes from.",
              "A diagonal splits a quadrilateral into two triangles. Each has angle sum 180°." if quadrilateral else "A complete turn is 360°.",
              ("The two triangle angle sums add together at the original corners." if quadrilateral else "The sectors fill the turn without gaps or overlap.",),
              "Explain the total using two triangles or a full turn."))


def quadrilateral_angles(s):
    return angles_sum(s,True)


def angle_lines(s):
    a=n(s,27,57)
    b=180-a
    return problem("A transversal across parallel paths",f"Two parallel horizontal lines are crossed by a third straight line. At the top crossing, the angle above the horizontal line on the right of the transversal is {a}°.",
        num("Find the angle above the lower horizontal line on the right of the transversal.",a,
            ("The two angles are in matching positions at their crossings.", "They are corresponding angles, so they are equal."),
            "Match the positions to find corresponding angles.",unit="degrees",
            wrong=(str(b),"Corresponding angles in this diagram are equal. A straight-line pair adds to 180°.")),
        num("Find the other angle above the lower horizontal line, to the left of the transversal.",b,
            (f"The two angles together make a straight line.",f"Subtract {a}° from 180°."),"Use angles on a straight line.",unit="degrees"),
        paper("At the bottom crossing, explain why the angle below the line on the left of the transversal has the same size as the first angle.",
              f"They are vertically opposite, so both are {a}°.",
              ("Both angles are equal to 180° minus the same neighbouring angle.",),"Use the vertically opposite angle rule."))


def right_angle(s):
    a=n(s,13,62)
    return problem("Splitting a right angle",f"Two lines meet at a right angle. A third line through the meeting point splits this right angle into {a}° and x°.",
        num("Find x.",90-a,(f"Perpendicular lines meet at 90°.",f"Subtract {a} from 90."),"Use the total for a right angle.",unit="degrees",
            wrong=(str(180-a),"The two given parts lie within a right angle. Their sum is 90°, not 180°.")),
        paper("Find the opposite angle of a° in this diagram if the lines are extended. Name the fact you use.",
              f"It is {a}°. Angles opposite each other at an intersection are equal.",
              ("Extending a straight line does not change the size of its existing angle.",),"Use vertically opposite angles."))


def solid_names(s):
    width=n(s,5,37)
    kind=s%4
    values=("a cone","a cylinder","a cuboid","a triangular pyramid")
    clues=("one circular base, one curved surface and one vertex",
           "two parallel circular ends, a curved surface and no vertices",
           "six rectangular faces and eight vertices",
           "four triangular faces and four vertices")
    return problem("Identify a solid by its features",f"A model takes up {width} cm of space from left to right. It has {clues[kind]}.",
       opt("Name the solid.",values[kind].capitalize(),tuple(v.capitalize() for v in values if v!=values[kind]),s,
           ("Match all the given features to one solid.",),fact=True),
       paper("Explain which feature rules out a sphere.",f"A sphere has a continuous curved surface and no flat faces. This model has {clues[kind]}.",
           ("Look at the presence or lack of a flat face.",),"Compare the given properties with a sphere."))


def chapter_shape():
    circle_figure=svg("circle-parts","A circle with radius, chord and tangent",
        '<circle cx="166" cy="78" r="49" fill="#dceff0" stroke="#17666c" stroke-width="2"/>'
        +path([(117,78),(215,78)],INK)+path([(133,114),(199,114)],GOLD)+path([(215,24),(215,139)],GOLD)
        +dot(166,78)+label(173,70,"O",size=11)+label(192,69,"radius",size=12)+label(161,132,"chord",size=12)
        +label(248,96,"tangent",size=13),"The diameter crosses O. The highlighted chord does not cross O. The tangent touches the circle once.")
    area_figure=svg("triangle-area","A triangle is half a rectangle of the same base and perpendicular height",
        rect(93,34,165,88)+path([(93,122),(258,34),(258,122)],BLUE,fill="#a8dcda",closed=True)
        +label(177,144,"base",size=13)+label(277,83,"height",size=13),
        "The diagonal splits this rectangle in two triangles of equal area.")
    net=svg("cuboid-net","A net of six face rectangles",''.join(
        rect(*pos)+(label(pos[0]+pos[2]/2,pos[1]+pos[3]/2+4, name,size=10))
        for pos,name in [((18,67,75,31),"front"),((93,67,45,31),"right"),((138,67,75,31),"back"),
        ((213,67,45,31),"left"),((18,22,75,45),"top"),((18,98,75,45),"bottom")]),
        "Opposite faces form three equal area pairs. Add all six face areas.")
    angle_figure=svg("parallel-angles","Parallel horizontal lines cut by one slanted transversal",
        path([(52,49),(313,49)],BLUE)+path([(52,114),(313,114)],BLUE)+path([(214,18),(117,146)],INK)
        +dot(190,49)+dot(141,114)+label(228,39,"a",size=17,colour=GOLD)+label(179,106,"a",size=17,colour=GOLD),
        "The marked angles share the same position at their crossings, so they are corresponding angles.")
    return (
      L("polygons-symmetry","Regular polygons and symmetry","Use equal sides and corners to identify regular polygons and describe their symmetries.",(
        S("regular","What makes a polygon regular?","A polygon is closed and has straight sides. For a regular polygon all side lengths and all corner sizes match.",
          "Count sides and check angles. A four-sided regular polygon is a square.",
          "Equal sides alone are not enough. A rhombus can have different corner angles.","Explain both conditions when describing a regular shape.",polygon,
          svg("regular-hexagon","A regular hexagon with one mirror line",
              path([(131,81),(153,43),(197,43),(219,81),(197,119),(153,119)],BLUE,fill=ICE,closed=True)
              +path([(175,25),(175,137)],GOLD,dash="4 4"),"One mirror line is shown. A regular hexagon has six in total.")),
        S("mirror","How can a mirror line make the halves match?","Imagine folding on the line. Every corner must land on its matching corner.",
          "A non-square rectangle has two lines of symmetry through opposite side midpoints.",
          "A diagonal of a non-square rectangle does not reflect the whole shape onto itself.",
          "Use a quick sketch and draw each mirror line fully.",reflective),
        S("rotation","How many times does the shape match in one turn?","Rotate about one fixed centre. Count the matches from just after the start up to and including a full turn.",
          "The order of rotational symmetry is the number of matches in 360°. An order of 1 means only the full turn matches.",
          "Do not count the start and finish as two separate matches.","For repeats of equal size, divide 360° by the order to find the smallest matching turn.",rotational)),
        (("Regular polygon","A polygon with equal sides and equal angles."),("Line symmetry","A mirror line leaves the whole shape matching."),("Order","How many orientations match in one full turn."))),
      L("shapes-lines","Matching shapes, circles and drawing lines","Match corresponding parts, name circle features and draw parallel or perpendicular sides.",(
        S("matching","Which sides and angles match?","Congruent shapes have the same shape and size. Turning or reflecting one does not change the side lengths.",
          "Use the named correspondence to match corners and sides. The order of letters matters.",
          "Matching the longest-looking side can be misleading when a diagram is not to scale.","Mark equal sides with matching ticks and give equal angles matching arcs.",congruence),
        S("circle","What are the parts of a circle called?","The circumference is the circular boundary. Every point on it is one radius from the centre.",
          "A chord joins two points on the circumference. A diameter is a chord through the centre. A tangent touches at exactly one point.",
          "Radius and diameter are distances across part or all of the circle. Circumference refers to the boundary.","Mark the centre before identifying a diameter.",circle,circle_figure),
        S("draw","How do we draw parallel and perpendicular edges?","Use a ruler and set square. First draw the given edge. Slide the set square along a ruler to draw a parallel edge.",
          "Parallel lines have a constant gap and never cross. Perpendicular lines meet at 90°. Use the right-angled corner of the set square for a perpendicular edge.",
          "Edges pointing in different directions cannot be parallel, even if they have the same length.","Use a small right-angle square to mark perpendicular sides.",lines_shapes)),
        (("Congruent","The same shape and size."),("Chord","A straight segment joining two points on a circle."),("Perpendicular","Meeting at a right angle."))),
      L("area","Area units, triangles and compound shapes","Convert square units, explain the triangle formula and find the area of a composite shape.",(
        S("units","Why do square units use a different conversion?","A square centimetre is 10 mm long and 10 mm wide. There are 100 square millimetres inside it.",
          "Use the length conversion in both directions across the square. Also, one hectare is 10,000 square metres.",
          "One centimetre is 10 mm, but one square centimetre is 100 square millimetres.","Write the conversion with squared units, then check the direction.",area_units),
        S("triangles","Why is the triangle area half the base times height?","Put the triangle into a rectangle or pair it with a matching copy to form a parallelogram.",
          "The area is "+m(r"\tfrac12\times\text{base}\times\text{perpendicular height}")+". Use the height at 90° to the base.",
          "A sloping side is not usually the perpendicular height.","Mark the right angle and label the height before working out the area.",triangle,area_figure),
        S("combined","How do we split a compound shape?","Draw a line across the shape to make smaller pieces you already know.",
          "Find the areas separately, then add shapes that do not overlap. Subtract a cut-out from a larger shape if that is easier.",
          "Shared edges are not extra regions. Count each inside area once.","Label any missing dimensions you can deduce before finding areas.",composite_area)),
        (("Area","The amount of surface inside a boundary."),("Perpendicular height","The shortest distance from the base line to the opposite point."),("Hectare","An area of 10,000 square metres."))),
      L("solids-volume","Solid shapes and volume","Identify three-dimensional solids and find volume by counting layers or adding cuboids.",(
        S("properties","How do faces, edges and vertices tell solids apart?","Describe both flat and curved surfaces. An edge is where faces or surfaces meet. A vertex is a corner.",
          "A prism has matching polygonal ends and a fixed cross-section. A pyramid has one base and triangular faces meeting at a point.",
          "Count each vertex once, even when it belongs to several faces.","Name the end shape to describe a prism precisely.",solid,
          boxes("solid-features",("Face","Edge","Vertex"),"Use all three properties when describing a polyhedron.")),
        S("names","Which combination of features gives a specific solid?","First decide whether the faces are flat or curved. Then name the base shape and count vertices.",
          "A cylinder has two circular ends. A cone has one circular base and one vertex. A sphere has no flat faces.",
          "A circular base is a flat face. A curved side does not make the base curved.",
          "Choose a precise name and support it with more than one property.",solid_names),
        S("layers","How many unit cubes fit inside?","A layer is a rectangle of unit cubes. Count how many cubes are in a layer and how many layers make the solid.",
          "Volume of a cuboid is length × width × height, in cubic units.","Area counts squares. Volume counts cubes.","Write cubic units after the answer.",volume),
        S("compound","How do we find volume when there is a step?","Imagine slicing the solid across a join, into cuboids with no overlapping parts.",
          "Find each volume using the three dimensions of that cuboid. Add them together.",
          "The length along the whole solid may be different from the length of one part.","Label dimensions for each part before multiplying.",compound_volume)),
        (("Prism","A solid with matching parallel ends and a constant cross-section."),("Cross-section","The shape of a cut made through a solid."),("Volume","The amount of three-dimensional space a solid occupies."))),
      L("views-surface","Views and surface area","Read the front, side and top views of a solid and count every outer face.",(
        S("plan","What can we see from straight above?","A plan is a view straight down. It shows width and depth. A front view shows width and height.",
          "Draw the outline that an observer sees from the stated direction. Equal features must align between views.",
          "Do not draw the depth in a front view.","Label your plan and front elevation to show the viewing direction.",views),
        S("side","How is a side view different?","Looking from the right, the visible lengths are depth and height. The width across the front points towards you.",
          "Use matching heights between a front view and a side view. The horizontal dimension changes.",
          "A taller face stays taller from the side, even if its horizontal dimension is smaller.",
          "Check the two dimensions by tracing arrows on a sketch of the solid.",side_view),
        S("net","How does a net show surface area?","Unfold a closed box and look at each rectangle. The areas add to the surface area.",
          "A cuboid has three pairs of opposite faces. Use "+m("2(lw+lh+wh)")+" for a closed cuboid.",
          "Do not count an inner join or an open face as part of the outer surface.","Square units are needed for surface area.",surface,net)),
        (("Plan","A view from directly above."),("Elevation","A front or side view of a solid."),("Net","An arrangement of joined flat faces that can fold into the solid."))),
      L("angle-reasoning","Angles around points and on lines","Find unknown angles and explain each step using angle facts.",(
        S("point","What is the total around a point?","Imagine a full turn around the corner of a page. Wherever you start, the complete turn is 360°.",
          "When neighbouring angles exactly fill the turn, add known angles and subtract from 360°.",
          "A straight line is half a turn, 180°. Around a point is a full turn.",
          "Name the angle fact you use before doing the subtraction.",angles_sum),
        S("quadrilateral","Why do the four angles make 360°?","A diagonal splits a convex quadrilateral into two triangles.",
          "Each triangle has angle sum 180°. The two sums give 360° for the quadrilateral.",
          "The quadrilateral need not be a rectangle for the sum to hold.","If a diagram is misleading, use the stated sizes and the angle fact.",quadrilateral_angles),
        S("parallel","How can we tell which angles are equal?","When one line crosses two parallel lines, compare positions at both crossings.",
          "Corresponding and alternate angles are equal. Co-interior angles add to 180°. Vertically opposite angles at one crossing are equal.",
          "The parallel-line rules need the two lines to be parallel. A right angle needs lines that are perpendicular.",
          "Write the angle fact next to each step.",angle_lines,angle_figure),
        S("right-angle","How can we recognise a right-angle pair?","Perpendicular lines meet at exactly 90°. If another line divides that angle, the two parts still make 90°.",
          "Use 90° as the total when the question states that the lines are perpendicular or shows a right-angle mark.",
          "A drawing that looks at right angles can be out of scale. Find the mark or the given fact.",
          "Check which total fits the angle fact, 90°, 180° or 360°.",right_angle)),
        (("Transversal","A line that crosses two or more lines."),("Corresponding","In matching positions at two line crossings."),("Vertically opposite","Across from each other at the same crossing.")))
    )


def pct(s):
    percent=Fraction((n(s,1,141) + 100*k(s,0,8)),10)
    if s%4==0:
        percent=Fraction(n(s,1,9),10)
    elif s%4==1:
        percent=100+n(s,1,101)
    groups=2000+k(s,1,8)*1000 if s%4==0 else 1000
    fraction=percent/100
    part_count=groups*fraction
    return problem("What does a percentage measure?",f"A club compares a task target of {groups} points with a score of {f(percent)}% of that target.",
        num("How many points does the club score?",part_count,
            (f"Write the percentage as {f(fraction)} of the target.",f"Multiply by {groups}."),"A percentage is a number per hundred.",unit="points",
            wrong=(str(groups+int(percent)),"The percentage is a part or multiple of the target. Convert it to a multiplier first.")),
        paper("Is the score below, equal to or above the target?",
            "The score is "+("equal to" if percent==100 else "above" if percent>100 else "below")+" the target.",
            ("Compare the percentage with 100%. A full target is 100%.",),"Compare the fraction of the target to one whole."))


def equivalents(s):
    cents=n(s,1,99)
    groups=k(s,2,10)
    frac=Fraction(cents,100)
    return problem("Conversions for a progress display",f"A progress bar shows the fraction {f(frac)} of a route. There are {groups} equal rows of {100} small squares in the display.",
        num("What percentage of the route does the bar show?",cents,
            (f"Scale the fraction to {m(rf'\frac{{{cents}}}{{100}}')}.",f"That is {cents} parts per hundred."),
            "Read the numerator when the denominator is 100.",label="Percentage (number before %)",unit="%",
            wrong=(str(frac),"This is the fraction of one whole. A percentage counts parts in a hundred.")),
        num("Write the same fraction as a decimal.",frac,
            (f"Divide the numerator by the denominator.",f"The decimal form is {d(cents)}."),"Divide numerator by denominator.",display=d(cents)),
        num("How many small squares represent that part of the route?",groups*cents,
            (f"Each row includes {cents} of its 100 squares.",),"Multiply by the number of rows."))


def compare_fdp(s):
    a=n(s,4,90)
    b=a+(-1 if s%2 else 1)*k(s,1,4) if s%5 else a
    base=Fraction(a,100)
    dec=d(b)
    sign=">" if a>b else "<" if a<b else "="
    return problem("Which value is larger?",f"One calculation gives {f(base)}. A different calculation gives {dec}.",
        opt("Choose the correct comparison sign to put between the fraction and the decimal.",m(sign),tuple(m(c) for c in ("<",">","=") if c!=sign),s,
            (f"As a decimal, {f(base)} is {d(a)}.",f"{d(a)} is {'greater than' if a>b else 'less than' if a<b else 'equal to'} {dec}.")),
        paper("Are the values equal or unequal? If unequal, list them from smallest to largest.",f"They are equal." if a==b else f"They are unequal: {d(min(a,b))}, then {d(max(a,b))}.",
              ("Ascending means smallest to largest.",),"Convert to a common form before ordering."))


def decimals(s, op):
    a=n(s,113,617)
    b=k(s,2,8)
    if op=="signed":
        x=a if s%3 else -a
        y=-10*b if s%2 else 10*b+3
        answer=x+y
        sign="+" if y>=0 else "−"
        given=f"A reading is {d(x)} units. It changes by {d(y)} units."
        prompt="Find the new reading."
        steps=(f"Add the signed change. Write the calculation as {d(x)} {sign} {d(abs(y))}.","Line up the decimal points. Add a zero if it helps fill a place.")
        correction=(str(Fraction(x-y,100)),"Keep the sign of the change. A negative change moves the reading down.")
    elif op=="product":
        x=a
        answer=x*b
        given=f"A group has {b} identical lengths of ribbon. Each is {d(x)} m long."
        prompt="Find their total length in metres."
        steps=(f"Multiply {a} hundredths by {b}.",f"The product is {answer} hundredths.")
        correction=(str(Fraction(answer,10)),"The original decimal is measured in hundredths. Divide the whole-number product by 100.")
    else:
        answer=a
        x=a*b
        given=f"A long piece of ribbon is {d(x)} m. It is cut into {b} pieces of equal length with no loss."
        prompt="Find the length of one piece in metres."
        steps=(f"Think of {d(x)} m as {x} hundredths of a metre.",f"Share {x} hundredths into {b} equal groups.")
        correction=None
    return problem("Calculations with decimals",given,
        num(prompt,Fraction(answer,100),steps,
            "Write decimal values in columns or count hundredths.",unit="units" if op=="signed" else "m",wrong=correction,
            display=d(answer)),
        paper("Explain one quick check you could do on the answer.",
              "Check that you can undo the change with the opposite signed change." if op=="signed" else
              f"Round the starting decimal before {'multiplying' if op=='product' else 'dividing'} by {b}. The two answers should be close.",
              ("Estimate or use the inverse operation to check the magnitude.",),"Compare with an estimate."))


def decimal_sum(s):
    return decimals(s,"signed")


def decimal_times(s):
    return decimals(s,"product")


def decimal_share(s):
    return decimals(s,"share")


def mixed_num(s):
    a=n(s,1,13)
    b=k(s,1,9)
    d1=2+s%9
    d2=3+(s//5)%10
    fr1=Fraction(d1-1,d1)
    fr2=Fraction(d2-1,d2)
    total=a+b+fr1+fr2
    w=total.numerator//total.denominator
    rem=total-w
    q1=f"{a}"+tex(fr1)
    q2=f"{b}"+tex(fr2)
    return problem("Combining two mixed lengths",f"Two pieces of rope are {m(q1)} m and {m(q2)} m long.",
        part("Add the lengths. Give a mixed number in its simplest form.",m(f"{w}"+tex(rem))+" m." if rem else f"{w} m.",
            (f"Add the whole parts to get {a+b}.",f"Rewrite the fractions with a common denominator and find their sum, {f(fr1+fr2)}.",
             f"Carry a whole across if the fraction sum is at least 1."),"Use equivalent fractions before adding.",
            field(total,label="Total length in metres"),
            (str(a+b+Fraction((d1-1)+(d2-1),d1+d2)),"The pieces must have the same denominator first. Adding denominators changes their size.")),
        paper("Give a reasonable estimate of the total length.",
              f"Each fraction is near one whole, so their total is about {a+b+2} m.",
              ("Round each length before adding.",),"Estimate with nearby whole numbers."))


def fractions(s, quotient=False):
    a,b=2+s%11,2+(s//3)%12
    numer1=n(s,1,a-1)
    numer2=k(s,1,b-1)
    x,y=Fraction(numer1,a),Fraction(numer2,b)
    answer=x/y if quotient else x*y
    opposite=x*y if quotient else x/y
    context=("The first fraction is a measured ribbon length in metres. The second is the length of one unit on a model plan." if quotient else
             "A pupil reads the first fraction of a whole book and annotates the second fraction of the part read.")
    expression=m(tex(x)+(r"\div " if quotient else r"\times ")+tex(y))
    return problem("Operating on two proper fractions",f"Use the fractions {f(x)} and {f(y)}. {context}",
        num(f"Work out {expression}.",answer,
            ((f"Turn the divisor over: use {f(1/y)} as a multiplier." if quotient else "Multiply the numerators and multiply the denominators."),
             "Use a common factor to simplify the result."),
            "Multiply by the reciprocal of the divisor." if quotient else "Multiply and cancel shared factors.",
            wrong=(str(opposite),"Division uses the reciprocal. Multiplication uses the original second fraction.")),
        paper("Explain whether your answer is greater than the first fraction.",
              "It is greater because the divisor is between 0 and 1." if quotient else
              "It is smaller because the multiplier is between 0 and 1.",
              ("Think about how scaling by a number between zero and one affects the size.",),"Compare the multiplier or divisor with 1."))


def fraction_division(s):
    return fractions(s,True)


def ratio_simplify(s):
    a,b=n(s,2,24),k(s,2,13)
    scale=2+s%7
    x,y=a*scale,b*scale
    g=gcd(x,y)
    return problem("Mixing a paint colour",f"A painter mixes {x} mL of blue with {y} mL of white paint.",
        part("Write the ratio blue to white in its simplest form.",m(f"{x//g}:{y//g}")+".",
            (f"The order is blue then white, so write {m(f'{x}:{y}')}.",f"Divide both terms by their highest common factor, {g}."),
            "Use a common divisor for both quantities.",field(f"{x//g};{y//g}","ratio",label="Blue to white ratio"),
            ((f"{y//g};{x//g}","Keep the order from the question. Blue comes first.") if x!=y else None)),
        num(f"How much white paint gives the same shade with {2*x} mL of blue?",2*y,
            (f"The blue amount was doubled.",),"Double both amounts to keep the shade.",unit="mL"),
        paper(f"Would {2*x+1} mL of blue and {2*y} mL of white give exactly the same shade? Explain.",
              "No. With the same white amount, the new mixture has more blue. The ratio has changed.",
              (f"The original mixture needs exactly {2*x} mL of blue when white is {2*y} mL.",),"Compare the blue amounts at the same white amount."))


def unitary(s):
    items=k(s,2,9)
    each=n(s,2,31)
    target=items+2+s%8
    return problem("Ordering exercise books",f"A school pays £{items*each} for {items} identical packs of exercise books. Prices are directly proportional to the number of packs.",
        num(f"Find the cost of {target} packs.",target*each,
            (f"Divide £{items*each} by {items} to get £{each} for one pack.",f"Multiply that price by {target}."),
            "Find the price for one pack first.",unit="pounds",
            wrong=(str(target*items*each),"You multiplied by the cost of all the original packs. Divide to find the cost per pack first.")),
        num(f"How many packs can the school buy for £{(target+3)*each}?",target+3,
            (f"Divide the budget by the price of one pack, £{each}.",),"Work backwards from the given total price."))


def share_ratio(s):
    a,b=n(s,2,16),k(s,2,14)
    per=2+s%11
    total=(a+b)*per
    return problem("Sharing resources between two clubs",f"Two clubs share {total} gardening gloves in the ratio {m(f'{a}:{b}')}.",
        num("How many gloves does the first club receive?",a*per,
            (f"There are {a+b} equal shares.",f"Each share is {total} ÷ {a+b} = {per} gloves. The first club takes {a} shares."),
            "Find one share by dividing by the sum of the two ratio terms.",wrong=(str(total//a),"The first term counts only the first club's shares. Count all shares before dividing.")),
        num("How many gloves does the second club receive?",b*per,
            (f"It takes {b} shares of {per} gloves.",),"Multiply the second ratio term by the value of one share."))


def efficient_fractions(s):
    a=n(s,2,19)
    b=k(s,2,11)
    if b==a:
        b+=2
    fraction=Fraction(b,a)
    factor=10+s%17
    first=m(rf"{a}\times\left({tex(fraction)}+{tex(Fraction(factor,a))}\right)")
    return problem("Simplifying before calculating",f"The expression is {first}.",
        num("Work out the exact value.",b+factor,
            (f"Distribute {a} to both terms inside the bracket.",f"Each denominator cancels with the outside factor {a}, leaving {b} and {factor}."),
            "Cancel the matching factors after distributing."),
        paper("Show a second method that works inside the bracket first.",
              f"The two fractions add to {f(Fraction(b+factor,a))}. Multiplying by {a} gives {b+factor}.",
              ("Use the common denominator already shown to add the numerator values.",),"Add the two fractions first, then multiply."))


def chapter_fractions():
    strip=svg("fraction-strip","One strip divided into ten equal parts and three parts shaded",
        ''.join(rect(35+29*i,56,28,42,fill="#94cecd" if i<3 else "#ffffff") for i in range(10))
        +label(78,42,"3 of 10",colour=BLUE)+label(180,125,"whole strip",size=14),
        "Three tenths is the same amount as 0.3 or 30%.")
    ratio=svg("ratio-share","Two equal-size blocks for the first group and three for the second",
        ''.join(rect(36+55*i,52,53,48,fill="#a7dedd" if i<2 else "#f4d7a7") for i in range(5))
        +label(90,126,"first group",colour=BLUE)+label(227,126,"second group",colour=GOLD),
        "There are five equal shares altogether. Work out one share before finding either group total.")
    return (
       L("fraction-links","Fractions, decimals and percentages","Convert between forms, compare quantities and calculate percentages below 1% or above 100%.",(
        S("equivalent","How can one amount have three forms?","Imagine a progress strip split into ten equal parts. Three parts show three tenths.",
          "Scale to a denominator of 100 for a percentage. Divide the numerator by the denominator for a decimal.",
          "A decimal and a percentage often look different but can show the same amount.",
          "Check that a fraction smaller than one becomes a percentage under 100%.",equivalents,strip),
        S("compare","How can we compare fractions with decimals?","Choose one form for both numbers. A number line then places the larger value further right.",
          "Compare decimals place by place. Compare fractions with a common denominator.",
          "The number with more decimal digits need not be larger. 0.5 is greater than 0.49.",
          "Write the two values in the same form before using the comparison sign.",compare_fdp),
        S("percentages","Can a percentage be less than 1% or more than 100%?","One percent means one hundredth of a whole. You can take a fraction of this share, or more than a full whole.",
          "Find a percentage of an amount by dividing the percentage number by 100 and multiplying.",
          "150% of an amount is one and a half times the amount. It is not 150 more than the amount.",
          "Compare the result with the original amount using the percentage size.",pct)),
        (("Equivalent","Different forms with the same value."),("Percentage","A number of parts per hundred."),("Terminating decimal","A decimal with a last digit."))),
       L("calculating-decimals","Adding, subtracting, multiplying and dividing decimals","Estimate and calculate with signed decimals using their place value.",(
        S("sum","How do we add or subtract decimal values?","Line up the columns that have the same value. A zero at the end of a decimal may make this alignment easier.",
          "For a negative change, subtract its size. Place decimal points straight underneath each other.",
          "Line up equal place values rather than simply lining up the final digits.","Use an estimate to check the size and direction of the answer.",decimal_sum,
          boxes("decimal-columns",("Ones","Tenths","Hundredths"),"2.5 has 2 ones, 5 tenths and 0 hundredths.")),
        S("multiply","What happens to hundredths when we multiply?","You can turn a decimal into a count of hundredths, multiply the count and then convert it back.",
          "If 3.28 has 328 hundredths, four times 3.28 has "+m(r"4\times328")+" hundredths.",
          "After a whole-number calculation, remember that the answer may be in hundredths.",
          "Check the answer against a rounded decimal multiplied by the same number.",decimal_times),
        S("divide","What is one equal part of a decimal amount?","Imagine sharing a length into equal parts. A place-value grid records how much each part receives.",
          "You can divide a count of hundredths and then express each share as a decimal. Use zeros to show place value where needed.",
          "The quotient of a positive amount divided into two or more equal parts must be smaller than the original.",
          "Multiply one share by the number of shares to check the answer.",decimal_share)),
        (("Hundredth","One of 100 equal parts of a whole."),("Product","The result of multiplying."),("Quotient","The result of dividing."))),
       L("calculating-fractions","Calculating with fractions and mixed numbers","Add mixed numbers and make sense of multiplying and dividing proper fractions.",(
        S("mixed","How do we add mixed numbers?","A mixed number has a whole-number part and a fraction. Add whole parts and then add fractional parts.",
          "Give the fractions a common denominator. Regroup one whole if the fraction sum reaches 1, and simplify.",
          "Do not add the denominators. They name the size of each piece.",
          "Check your mixed number against an estimate with nearby whole numbers.",mixed_num),
        S("multiply","What does a fraction of a fraction look like?","Shade a fraction of the whole rectangle and then shade a fraction of that shaded part.",
          "Multiply the numerators and the denominators. Cancel common factors before or after multiplying.",
          "For two positive proper fractions, the product is smaller than either fraction.",
          "Show which common factor you cancelled if you simplify before multiplying.",fractions,
          svg("fraction-area","A three-by-four grid with two shaded cells in one column",
              ''.join(rect(99+38*i,22+36*j,37,35,fill="#8ad2cb" if i==0 and j<2 else "#fff")
                      for i in range(4) for j in range(3)),
              "Take one quarter of the full grid. Two thirds of that column covers two of the twelve cells.")),
        S("divide","What does division by a fraction count?","Use division to ask how many groups of the divisor fit in the starting quantity. A small divisor can give a bigger quotient.",
          "Divide by a non-zero fraction by multiplying by its reciprocal. As a check, multiply your quotient by the original divisor.",
          "Turn over the divisor, the number you are dividing by. Keep the first number as it is.",
          "Write the reciprocal step before simplifying.",fraction_division),
        S("shortcuts","When is it easier to cancel first?","Look for a factor shared by a numerator and a denominator, or use the distributive law to split a product.",
          "For example, "+m(r"6\left(\tfrac{5}{6}+\tfrac{3}{6}\right)=5+3")+". You could add the fractions first and get the same result.",
          "Cancel factors in a product. Do not cancel across an addition sign.",
          "Try two methods and explain why they lead to the same value.",efficient_fractions)),
        (("Mixed number","A whole number together with one proper fraction."),("Proper fraction","A positive fraction less than one."),("Reciprocal","The number that multiplies with the starting number to make 1."))),
       L("ratio-proportion","Ratio and direct proportion","Compare amounts in a fixed order, find a unit rate and divide a total into two parts.",(
        S("compare","How can we make a ratio easier to read?","A ratio compares two quantities in a chosen order. Use the same units for both.",
          "To simplify, divide both terms by the same factor until there is no common factor greater than one.",
          "The two orders name different amounts. Label which group goes first.",
          "Multiply or divide both parts by the same number when comparing ratios.",ratio_simplify),
        S("unitary","How can finding one unit solve the whole problem?","If the quantities are directly proportional, twice as many items cost twice as much at the same price.",
          "Divide to find the amount for one unit, then multiply by the new number of units.",
          "An unchanged extra charge would break direct proportion. Check the problem states a fixed rate for each unit.",
          "Show the cost per item or amount per person before finding the total.",unitary),
        S("share","How many equal shares are there altogether?","A bar shows that the first group takes a stated number of shares and the second takes the rest.",
          "Add the ratio terms, divide the total by this sum, then multiply one share by each ratio term.",
          "Divide by the total number of shares, rather than by the larger group alone.",
          "Check the two parts add back to the original total.",share_ratio,ratio)),
        (("Ratio","A comparison of amounts in a stated order."),("Unitary method","Find the value for one unit, then scale it."),("Direct proportion","Multiplying one quantity by a factor multiplies the other by the same factor.")))
    )


def likelihood(s):
    a=n(s,2,19)
    b=k(s,2,15)
    if a==b:
        b+=1
    return problem("Comparing chances in one bag",f"A bag has {a} blue, {b} red and 2 gold beads. A bead is drawn at random.",
        opt("Which is more likely, blue or red?", "Blue" if a>b else "Red",
            ("Red" if a>b else "Blue","They are equally likely","It is impossible to draw a bead"),s,
            (f"Each bead has the same chance of being picked.",f"There are {'more blue' if a>b else 'more red'} beads.")),
        paper("Describe the chance of drawing a green bead using probability language.",
              "It is impossible because there are no green beads in the bag.",
              ("A missing colour has zero chance of being drawn.",),"Look at every possible colour."))


def probability_form(s):
    a=n(s,1,99)
    b=k(s,2,12)
    shades=("red","blue","green","gold","orange")[s%5]
    return problem("Putting probability on a scale",f"A bag has {100*b} tokens of the same size, of which {a*b} are {shades}. One token is chosen at random.",
        num(f"Find the probability of choosing a {shades} token as a fraction.",Fraction(a,100),
            (f"The fraction is {m(rf'\frac{{{a*b}}}{{{100*b}}}')}.",f"Divide the top and bottom by {b}, then simplify if possible."),
            "Divide the number of wanted positions by the whole count."),
        num("Give the same probability as a percentage.",a,
            (f"The fraction has a denominator of 100 before simplification.",),"Read the count per hundred.",
            label="Percentage (number before %)",unit="%"),
        paper("Give the probability as a decimal and check where it lies on the scale.",f"{d(a)}. This is strictly between 0 and 1.",
              ("Divide the percentage by 100 to give the decimal.",),"Use the scale from impossible at 0 to certain at 1."))


def outcomes(s):
    sectors=n(s,3,22)
    group=k(s,2,16)
    return problem("Counting the outcomes of a spinner",f"A fair spinner has {sectors} equal-sized sectors numbered 1 to {sectors}. A class of {group} pupils takes turns spinning it once each.",
        num("How many different outcomes are possible on one spin?",sectors,
            ("The possible outcomes are all the sector numbers, one per sector.",),"Count each possible result of one spin once."),
        paper("Explain why 'lands on 1' and 'lands on 2' are mutually exclusive on one spin.",
              "A single spin cannot have both results at the same time.",
              ("Only one numbered sector can be the outcome of a spin. If the pointer stops right on a line, agree in advance to spin again.",),
              "Check whether one trial can give both outcomes together."),
        paper("Explain why each numbered outcome has the same chance.",
              "The fair spinner has equal-sized sectors and each number appears in exactly one sector.",
              ("Fairness and equal sector size both matter.",),"Use the given details of the spinner."))


def theory_chance(s):
    a=n(s,2,23)
    b=k(s,3,19)
    c=3+s%7
    total=a+b+c
    return problem("Picking a coloured token",f"A jar holds {a} purple, {b} orange and {c} white tokens of the same size. One token is chosen at random.",
        num("Find the probability of a purple token.",Fraction(a,total),
            (f"There are {total} tokens in total.",f"{a} of them give the wanted result."),"Count equally likely tokens, then use wanted over total.",
            wrong=(str(Fraction(a,b)),"The denominator counts the whole jar. Include all three colours.")),
        num("Find the probability of a token that is not orange.",Fraction(a+c,total),
            (f"Purple and white are both allowed, so there are {a+c} wanted tokens.",),"Add the counts for allowed colours before dividing."))


def observed(s, compare=False):
    spins=20+5*n(s,1,31)
    wins=k(s,5,15)
    if compare:
        extra=k(s,2,11)
        total=spins+extra*10
        successes=wins+extra*2
        return problem("Combining two sets of trials",f"One class records {wins} purple results in {spins} spins. A second class uses the same spinner and records {2*extra} purple results in {extra*10} spins.",
            num("Find the experimental probability of purple using both classes together.",Fraction(successes,total),
                (f"Combine the successes to get {successes}.",f"Combine the trials to get {total}."),"Divide the combined success count by the combined number of trials."),
            paper("Explain why the combined result can be more useful than an estimate from just one class.",
                  "It uses more trials, so an unusual result from one small set has less effect.",
                  ("The estimate can still vary even when the spinner stays the same.",),"Compare the number of trials."))
    return problem("Running a chance experiment",f"A pupil gets blue {wins} times in {spins} trials of a spinner.",
        num("What is the experimental probability of blue?",Fraction(wins,spins),
            (f"The wanted count is {wins}.", f"The full trial count is {spins}."),"Use observed frequency divided by the number of trials."),
        paper("Describe how to carry out a fair repeat experiment and record results.",
              "Use the same spinner and spin it the same way each time. Give each colour a tally and add a mark after each spin.",
              ("Agree what to do if the arrow stops on a boundary. Keep track of the total number of spins.","Compare your estimate with the first estimate."),
              "Make the repeated spins comparable and record every outcome."))


def combined_chance(s):
    return observed(s,True)


def chapter_probability():
    dark="#1b5865"
    scale=svg("probability-scale","Probability scale from zero to one with a central half",
        path([(28,76),(332,76)],INK)+''.join(path([(a,66),(a,85)],dark)+label(a,105,c,size=12) for a,c in
         ((28,"0"),(104,"0.25"),(180,"0.5"),(256,"0.75"),(332,"1")))+
         label(40,49,"Impossible",size=12)+label(180,49,"Even chance",size=12)+label(319,49,"Certain",size=12),
        "Moving to the right shows a larger probability.")
    spinner=svg("spinner","A spinner with four equal sectors, two of them blue",
        '<circle cx="176" cy="81" r="55" fill="#f3d7a6" stroke="#17666c" stroke-width="2"/>'
        '<path d="M176 26 A55 55 0 0 1 176 136Z" fill="#91ccca" stroke="#17666c" stroke-width="2"/>'
        +path([(121,81),(231,81)],INK)+path([(176,81),(206,58)],INK,width=3)+dot(176,81),
        "The two shaded sectors make half the spinner. Each sector has an equal chance in the theoretical model.")
    return (
      L("probability-language","Chance, probability scales and outcomes","Describe likelihood from impossible to certain and list the outcomes of a single event.",(
        S("chance","What makes one result more likely?","If each object in a bag is equally likely to be picked, a colour with more objects has a larger chance.",
          "For the same trial, compare how many equally likely results give each event.",
          "Unlikely means a low chance. Impossible has chance zero.","Use probability words only after checking the possible results.",likelihood,scale),
        S("scale","What numbers belong on the chance scale?","The scale starts at 0 for impossible and ends at 1 for certain. Exactly one half is an even chance.",
          "A probability can be a fraction, decimal or percentage between 0 and 1, or between 0% and 100% when written as a percentage.",
          "A percentage probability above 100% cannot describe a chance.","Convert to the same form before comparing two probabilities.",probability_form),
        S("outcomes","When can two results not happen together?","List every result of one trial. For a set of mutually exclusive outcomes, this trial gives at most one of them.",
          "An equal-sized sector on a fair spinner has the same chance as any other equal-sized sector.",
          "Equal-looking labels do not make unequal-sized sectors equally likely.","Say what one trial means before listing results.",outcomes)),
        (("Outcome","One possible result of a trial."),("Probability","A number showing how likely an event is."),("Mutually exclusive","Unable to happen together in the same trial."))),
      L("probability-experiments","Theoretical and experimental probability","Find a theoretical probability and use recorded trials to estimate a chance.",(
        S("theory","What should happen when all outcomes are equally likely?","First list or count all the equally likely outcomes. Highlight the ones that give the event.",
          "The theoretical chance is wanted outcomes divided by all equally likely outcomes.",
          "Do not divide by just the unwanted outcomes.","Check that the answer lies on the scale from 0 to 1.",theory_chance,spinner),
        S("experiment","What do trials tell us about a chance?","We can spin or use a simple simulation and tally the results.",
          "The experimental probability is the number of recorded successes divided by the number of trials.",
          "A theoretical chance and an experimental estimate may differ, especially with few trials.",
          "Keep a tally after every trial and check the tallies add to the stated total.",observed),
        S("repeats","Why do we collect more trials?","One unusual spin changes a small sample more than a large one. Compare a small tally with a longer tally.",
          "Use total successes divided by total trials when combining trials under the same conditions.",
          "A simple average of two estimates can give unequal trial groups the same weight.",
          "Repeat using the same rules. Compare the estimates and consider their sample sizes.",combined_chance)),
        (("Trial","One repeat of a chance action."),("Theoretical probability","The probability calculated from a model."),("Experimental probability","A probability estimated from recorded trials.")))
    )


def sequence(s, patterned=False):
    a=n(s,2,43)
    step=k(s,2,8)
    if s%3==0 and not patterned:
        step=-step
    vals=[a+i*step for i in range(4)]
    listed=", ".join(str(t) for t in vals)
    given=(f"A row of seats starts with {a} seats. Each new version of the row has {step} more seats. "
           f"The first four counts are {listed}." if patterned else
           f"The first four terms of a sequence are {listed}. The same change happens each time.")
    return problem("Extending a sequence",given,
        num("Find the fifth term.",a+4*step,
            (f"The change from {vals[0]} to {vals[1]} is {step}.", f"Apply the same change to the fourth term, {vals[3]}."),
            "Find the difference between consecutive terms."),
        paper("Describe the term-to-term rule.",f"{'Add' if step>0 else 'Subtract'} {abs(step)} each time.",
              (f"The difference is {step} at each step.",),"Name the repeated change."))


def spatial_sequence(s):
    return sequence(s,True)


def nth_term(s):
    offset=n(s,2,32)
    mult=k(s,2,11)
    form=s%3
    if form==0:
        rule=f"n+{offset}"
        vals=[i+offset for i in range(1,5)]
        result=mult+offset
        alternatives=(m(f"{offset}n"),m(f"n-{offset}"),m(f"n+{offset+1}"))
        explain=(f"Each term is {offset} more than its position.",)
    elif form==1:
        rule=f"n-{offset}"
        vals=[i-offset for i in range(1,5)]
        result=mult-offset
        alternatives=(m(f"{offset}n"),m(f"n+{offset}"),m(f"n-{offset+1}"))
        explain=(f"Each term is {offset} less than its position.",)
    else:
        rule=f"{offset}n"
        vals=[i*offset for i in range(1,5)]
        result=mult*offset
        alternatives=(m(f"n+{offset}"),m(f"n-{offset}"),m(f"{offset+1}n"))
        explain=(f"Each term is {offset} times its position.",)
    return problem("A rule for any term",f"The first four terms are {', '.join(map(str,vals))}. The first term has position 1. The sequence keeps the same difference between terms.",
        opt("Choose the nth term.",m(rule),alternatives,s,(f"Compare positions 1, 2, 3 and 4 with the listed terms.",)+explain),
        num(f"Find the number in position {mult}.",result,(f"Replace n with {mult} in {m(rule)}.",),
            "Use the position as n."))


def machine(s, reverse=False):
    a=n(s,2,43)
    b=k(s,2,9)
    result=a*b
    if reverse:
        return problem("Working backwards through a function",f"A function machine multiplies its input by {b}. One output is {result}.",
            num("Find its input.",a,(f"Undo multiplication by {b} by dividing {result} by {b}.",),"Use the inverse operation."),
            num(f"Find the output for input {a+1}.",(a+1)*b,
                (f"Apply the forward rule to {a+1}.",),"Multiply the input by the rule's factor."))
    return problem("Using a function",f"A function machine takes an integer input and adds {b}. One input is {a}.",
        num("What is the output for that input?",a+b,(f"Apply the rule by adding {b}.",),"Apply the operation to the given input."),
        num(f"Find the input for output {result}.",result-b,
            (f"Undo adding {b} by subtracting {b}.",),"Work backwards using the inverse operation."))


def inverse_machine(s):
    return machine(s,True)


def model_linear(s):
    factor=n(s,2,27)
    x=k(s,2,10)
    increase=s%2
    rule=f"y=x+{factor}" if increase else f"y={factor}x"
    result=x+factor if increase else factor*x
    given=(f"A bag weighs {factor} g when empty. If the contents weigh x g, the full bag weighs y g." if increase else
           f"Each bundle holds {factor} seeds. For x bundles, y is the total number of seeds.")
    alt=(m(f"y={factor}x"),m(f"y=x-{factor}"),m(f"y=x/{factor}")) if increase else (
         m(f"y=x+{factor}"),m(f"y=x-{factor}"),m(f"y=x/{factor}"))
    return problem("Matching a rule to a situation",given,
        opt("Choose a function that links x and y.",m(rule),alt,s,
            ("Add the bag's fixed weight." if increase else "Multiply the number of bundles by the number in each bundle.",)),
        num(f"Find y when x is {x}.",result,(f"Use {m(rule)} with x = {x}.",),"Put the stated value in for x."))


def plot_line(s):
    a=n(s,2,29)
    x=k(s,2,9)
    kind=s%2
    rule=f"y={a}x" if kind else f"y=x+{a}"
    ans=a*x if kind else x+a
    return problem("Build a table for a line",f"Draw part of the straight line given by {m(rule)}. The table needs x = 0, 1 and {x}.",
        num(f"Find y in the table when x = {x}.",ans,
            (f"Replace x by {x}.",f"{'Multiply by' if kind else 'Add'} {a}."),"Use the given rule for each row."),
        paper("Complete all three rows, plot them on a grid and draw the line through them.",
              f"The coordinate pairs are {m(f'(0,{0 if kind else a}), (1,{a if kind else a+1}), ({x},{ans})')}. The graph is a straight line through all three.",
              ("Use x for the horizontal position and y for the vertical position.",),"Plot three points from the completed table as a check."))


def axes_parallel(s, horizontal):
    c=n(s,-21,43)
    v=k(s,2,11)
    axis="x-axis" if horizontal else "y-axis"
    coordinate="y" if horizontal else "x"
    opposite="x" if horizontal else "y"
    point=m(f"({v},{c})" if horizontal else f"({c},{v})")
    return problem("Lines parallel to an axis",f"A straight line is parallel to the {axis}. It passes through the point {point}.",
        opt("Choose the equation of this line.",m(f"{coordinate}={c}"),(m(f"{opposite}={c}"),m(f"{coordinate}={c+1}"),m(f"{opposite}={c+1}")),s,
            (f"Only the {opposite}-coordinate changes along the line.",f"Every point has {coordinate} = {c}.")),
        paper("Write the coordinates of another point on the line.",
              f"For example, {m(f'(0,{c})' if horizontal else f'({c},0)')}.",
              (f"Keep {coordinate} fixed and choose a different {opposite}-value.",),"Check the fixed value in the equation."))


def horizontal_line(s):
    return axes_parallel(s,True)


def vertical_line(s):
    return axes_parallel(s,False)


def rate_graph(s, movement=False):
    time1=n(s,2,31)
    time2=k(s,3,11)
    dist=3+s%14
    base=(8+time2)*(dist+2)
    start=base if movement else 0
    end=base + (dist if movement else 0)
    rows=[(0,start),(time1,end),(time1+time2,end)]
    data=table(("Time (minutes)","Distance from start (m)"),rows)
    prefix=(f"At the start of a recorded route a walker is already {base} m from a shelter. The walker moves farther away, then stops." if movement else
            "A distance-time graph shows how far a walker has moved away from a shelter, then how long they stop.")
    if movement:
        prefix+=f" The first section is a straight line."
    show=(
        num(f"How far does the distance change during the first {time1} minutes?",end-start,
            (f"Compare the distances at the ends of the first segment.",f"Subtract {start} m from {end} m."),
            "Use the change in distance, rather than the final reading by itself.",unit="m")
        if movement else
        num("How long is the walker stopped?",time2,
            (f"The last two distances are both {end} m.",f"The time from {time1} to {time1+time2} minutes is {time2} minutes."),
            "Find the length of the horizontal interval.",unit="minutes")
    )
    return problem("Reading a journey graph",prefix,show,
        paper("Explain why the final graph segment is horizontal.",
              "Time increases while the distance from the shelter stays constant. In this walk the pupil has stopped.",
              ("The last two readings are at the same height.",),"Describe what happens along each axis."),
        figure_html=data.replace("Distance from start", "Distance from shelter"))


def rate_compare(s):
    a=n(s,1,49)
    time=k(s,2,13)
    fast=4+s%17
    slow=fast-2
    distances=(a,a+slow*time,a+(slow+fast)*time)
    data=table(("Time (minutes)","Water depth (cm)"),[(0,distances[0]),(time,distances[1]),(2*time,distances[2])])
    return problem("Comparing slopes with the same time step","A tank fills in two stages. Its depth-time graph has one straight segment for each interval.",
        opt("Which interval has the greater rate of increase in water depth?",m(f"{time}\\text{{ to }}{2*time}")+" minutes",
            ("0 to "+f(time)+" minutes","Both rates are equal","The depth decreases"),s,
            (f"The rises in the same time are {slow*time} cm and {fast*time} cm.", "The second rise is larger in the same time, so the second segment is steeper.")),
        num("Find the rate of increase over the second interval.",fast,
            (f"Divide the rise of {fast*time} cm by {time} minutes.",),"Use vertical change divided by time change.",unit="cm per minute"),
        figure_html=data)


def rate_move(s):
    return rate_graph(s,True)


def chapter_graphs():
    seq=svg("growing-pattern","Three growing rows made of two, four and six tiles",
        ''.join(rect(48+19*j,28+41*i,18,18) for i in range(3) for j in range(2*(i+1)))+
        ''.join(label(255,43+41*i,f"term {i+1}",size=13) for i in range(3)),
        "The diagram adds two tiles at each step. The tile count is twice the position number.")
    journey=svg("journey-stops","Distance-time graph with a rising segment followed by a horizontal segment",
        path([(40,142),(335,142)],INK)+path([(42,145),(42,22)],INK)+
        path([(42,142),(133,63),(243,63),(292,35)],BLUE,width=3)+path([(133,63),(133,142)],GOLD,dash="3 4")+
        path([(243,63),(243,142)],GOLD,dash="3 4")+label(282,159,"Time",size=11)+label(76,26,"Distance",size=11),
        "The walker stops while the graph is horizontal. Time continues, but the distance stays the same.",h=176)
    return (
      L("sequences","Sequences and simple nth terms","Describe a repeated change, build a pattern and use its position to find a term.",(
        S("terms","How do we get from one term to the next?","A sequence is an ordered list. Compare terms side by side to see the repeated change.",
          "Subtract an earlier number from the next. A negative difference tells you the sequence goes down.",
          "The difference is the change, not a new term by itself.",
          "Check your rule between more than one pair of terms.",sequence),
        S("patterns","How can we grow a pattern?","Count the pieces already there and the pieces added each time.",
          "If the same count of pieces is added, the totals form a linear sequence.",
          "Position 1 belongs to the first whole design. Decide where the count starts.",
          "Mark the added pieces in a different colour to explain the growth.",spatial_sequence,seq),
        S("nth","How can we find one term without listing all the earlier ones?","Write n for the position. Compare each term with its position or a simple multiple of it.",
          "If the first terms are 5, 6, 7, each is four more than its position. The rule is "+m("n+4")+".",
          "The value of a term and its position are different quantities.",
          "Test a suggested rule using both the first and the second positions.",nth_term)),
        (("Term","One number or design in a sequence."),("Term-to-term rule","The instruction for going from one term to the next."),("Nth term","A rule that uses the position to give the term."))),
      L("functions","Function machines and linear rules","Find an output, reverse a rule and use a function to describe a simple situation.",(
        S("forward","How does a function connect an input to an output?","A function always gives one output for each allowed input. An instruction such as adding five is one example.",
          "Apply the same rule to each new input. Label the direction from input to output.",
          "Changing the rule when the input changes makes a different function.",
          "Write the operation before calculating.",machine,
          boxes("function-machine",("Input","× 3","Output"),"The rule takes 2 to 6 and 4 to 12.")),
        S("backwards","How do we find the input when only the output is given?","Use the reverse operation. Subtraction undoes addition, and division by a non-zero number undoes multiplication by it.",
          "Go back through a rule using the inverse operation. Then check using the forward rule.",
          "Running the original operation twice usually does not recover the input.",
          "Check your input by following the machine forwards again.",inverse_machine),
        S("models","When does a word problem become a simple linear rule?","Sometimes a fixed amount is added to each input. Other situations use a fixed amount per item.",
          "Adding a constant gives "+m("y=x+c")+". Multiplying by a fixed factor gives "+m("y=mx")+".",
          "A fixed charge should be added once. A price per item should be multiplied by the number of items.",
          "Name what x and y represent in the situation.",model_linear)),
        (("Function","A rule with one output for every allowed input."),("Input","A value put into a function."),("Inverse operation","An operation that undoes another."))),
      L("straight-line-graphs","Plotting straight lines and parallel lines","Generate coordinates from a rule and recognise horizontal and vertical straight lines.",(
        S("values","How do we turn a rule into a table?","Choose a few x-values. For each one, substitute into the equation to work out y.",
          "Read every row as an ordered pair "+m("(x,y)")+". Plot x along the horizontal axis and y along the vertical axis.",
          "Swapping the coordinates moves the point to a different place in general.",
          "Make a short table that shows where the coordinates came from.",plot_line,
          grid_image("plot-linear","Graph of y = x + 1 with marked points",
                     "The graph of y = x + 1 passes through the marked points (0, 1) and (1, 2).",
                     lines=((((-4,-3),(2,3)),BLUE,False),),dots=((0,1,"A",GOLD),(1,2,"B",GOLD)))),
        S("horizontal","What stays fixed on a horizontal line?","Move left or right along the line. Its height above or below the x-axis stays fixed.",
          "Every point on a horizontal line has the same y-value. Its equation has the form "+m("y=c")+".",
          "A line parallel to the x-axis has fixed y, even though its x-values change.",
          "Think horizontally before naming the fixed coordinate.",horizontal_line),
        S("vertical","What stays fixed on a vertical line?","Move up or down. The line stays the same horizontal distance from the y-axis.",
          "Every point on a vertical line has the same x-value. Its equation has the form "+m("x=c")+".",
          "A vertical line through a point does not take its fixed value from that point's second coordinate.",
          "Name the coordinate that stays fixed before writing an equation.",vertical_line)),
        (("Coordinate pair","An ordered pair giving the horizontal and vertical positions."),("Horizontal","Running from left to right."),("Vertical","Running from bottom to top."))),
      L("rate-graphs","Reading changes on a graph","Interpret a horizontal part, find a change and compare rates from graph segments.",(
        S("stopped","What does a flat line show?","The horizontal axis still moves forward in time. Read how long a segment lasts by subtracting its start time from its end time.",
          "A flat segment shows that the value on the vertical axis stays the same.",
          "A flat segment does not mean that time has stopped. It means the measured value has stopped changing.",
          "Use the axis labels to explain the flat part in words.",rate_graph,journey),
        S("difference","What has changed between two readings?","Read both heights and their times. The difference in heights shows how much the quantity changes.",
          "Use the final reading minus the starting reading. If a graph starts above zero, the final height alone gives the wrong change.",
          "Do not confuse the distance from a place with the distance just travelled.",
          "State the start and end values before finding the change.",rate_move),
        S("steeper","How can we compare two rates?","Watch both the increase in height and the time it takes. Steeper increases show a larger change per unit of time.",
          "Divide the change by the elapsed time. If times match, compare vertical changes directly.",
          "The segment drawn higher up need not have the larger rate.",
          "Keep track of the units, such as centimetres per minute.",rate_compare)),
        (("Rate","A change per unit, such as metres per minute."),("Segment","One part of a line or graph."),("Distance-time graph","A graph showing distance and time together.")))
    )


def map_scale(s):
    cm=n(s,2,27)
    km=k(s,1,12)
    more=2+s%8
    return problem("A map of a cycle route",f"The map uses a scale of 1 cm for every {km} km. The route between a farm and a station is {cm} cm long on the map.",
        num("Find the real length of the route.",cm*km,
            (f"Each one-centimetre part represents {km} km.",f"Multiply {cm} by {km}."),
            "Scale up from one map centimetre.",unit="km"),
        num(f"An extra ride is {more*km} km. How long is that extra ride on the map?",more,
            (f"Divide {more*km} km by {km} km per map centimetre.",),"Scale down to map units.",unit="cm"))


def distance(s):
    fixed=n(s,-15,31)
    left=-n(s,1,24)
    right=k(s,2,18)
    horizontal=s%2
    a,b=(f"({left},{fixed})",f"({right},{fixed})") if horizontal else (f"({fixed},{left})",f"({fixed},{right})")
    change="x" if horizontal else "y"
    return problem("Finding a distance without a grid",f"Points A and B have coordinates {m(a)} and {m(b)}.",
        num("Find the distance from A to B.",right-left,
            (f"The {change}-coordinate changes from {left} to {right}.",f"Subtract {left} from {right} to find the positive distance."),
            "Use the difference in the coordinate that changes.",unit="units",
            wrong=(str(abs(right+left)),"The points are on opposite sides of zero along the changing axis. Include both distances to zero.")),
        paper("Explain whether the segment AB is horizontal or vertical.",
              "Horizontal, because the y-values agree." if horizontal else "Vertical, because the x-values agree.",
              ("One coordinate stays the same along the whole segment.",),"Compare the two unchanged coordinates."))


def translation(s):
    x=n(s,-13,29)
    y=k(s,-12,26)
    dx=3+s%6
    dy=-(2+(s//7)%7)
    x2,y2=x+dx,y+dy
    direction=f"right {dx} units and down {abs(dy)} units"
    return problem("A move on the coordinate plane",f"One vertex of a shape is {m(f'({x},{y})')}. The whole shape moves {direction}.",
        part("Give the coordinates of the new vertex.",m(f"({x2},{y2})")+".",
            (f"Add {dx} to the x-coordinate.",f"Subtract {abs(dy)} from the y-coordinate."),
            "Apply the same horizontal and vertical change to every vertex.",
            field(f"({x2},{y2})","pairs",label="New coordinates (x, y)")),
        paper("Explain what has happened to the side lengths of the shape.","The side lengths stay the same.",
              ("Every point moves by the same amount and in the same direction.",),"Translations do not change size or shape."))


def reflection(s):
    x=n(s,2,32)
    y=k(s,2,17)
    axis="x" if s%2 else "y"
    x2,y2=(x,-y) if axis=="x" else (-x,y)
    altx,alty=(-x,y) if axis=="x" else (x,-y)
    return problem("Reflecting a point across an axis",f"A vertex has coordinates {m(f'({x},{y})')}. Reflect its shape in the {axis}-axis.",
        part("Give the new coordinates of this vertex.",m(f"({x2},{y2})")+".",
             (f"Keep the coordinate measured along the {axis}-axis.",f"Reverse the sign of the other coordinate."),
             "Use the same perpendicular distance on the other side of the mirror line.",
             field(f"({x2},{y2})","pairs",label="Reflected point (x, y)"),
             (f"({altx},{alty})","You have reflected in the other axis. Track which coordinate stays fixed.")),
        paper(f"For two more vertices {m(f'({x+2},{y})')} and {m(f'({x},{y+3})')}, find their images.",
              f"The coordinates are {m(f'({x+2},{-y})')} and {m(f'({x},{-(y+3)})')}." if axis=="x" else
              f"The coordinates are {m(f'({-(x+2)},{y})')} and {m(f'({-x},{y+3})')}.",
              ("Reflect each vertex in the same axis.",),"Keep the coordinate along the mirror line."),
        paper("Would the original shape and its image be congruent?",
              "Yes. Corresponding sides and angles stay the same.",
              ("Each point moves to its mirror position without any stretching.",),"Check whether the mirror changes lengths or angles."))


def rotate(s):
    cx,cy=s%5-2,(s//3)%5-2
    a,b=n(s,2,27),k(s,2,17)
    x,y=cx+a,cy+b
    angle=(90,180)[s%2]
    direction="clockwise" if (s//2)%2 else "anticlockwise"
    turn = (lambda u,v: (-u,-v)) if angle==180 else ((lambda u,v: (v,-u)) if direction=="clockwise" else (lambda u,v: (-v,u)))
    u,v=turn(a,b)
    x2,y2=cx+u,cy+v
    B=turn(a+1,b)
    C=turn(a,b+1)
    suffix=f" {direction}" if angle==90 else ""
    return problem("Turning a shape around a centre",f"A triangle has vertices A {m(f'({x},{y})')}, B {m(f'({x+1},{y})')} and C {m(f'({x},{y+1})')}. Rotate the shape {angle}°{suffix} around {m(f'({cx},{cy})')}.",
        part("Give the image coordinates of A.",m(f"({x2},{y2})")+".",
            (f"The offset of A from the centre is {m(f'({a},{b})')}.",
             f"Turn that offset to {m(f'({u},{v})')}, then add it to the centre's coordinates."),
            "Turn the offsets measured from the centre, then add them back.",
            field(f"({x2},{y2})","pairs",label="New coordinates (x, y)")),
        paper("Give the coordinates of B and C after the turn. Explain what happens to the side lengths.",
              f"B maps to {m(f'({cx+B[0]},{cy+B[1]})')} and C maps to {m(f'({cx+C[0]},{cy+C[1]})')}. All side lengths stay the same.",
              ("Turn each offset through the same angle around the same centre.",),"Rotate both remaining vertices and compare the original and image."))

def enlargement(s):
    x,y=n(s,2,31),k(s,1,16)
    factor=2+s%4
    x2,y2=x*factor,y*factor
    return problem("Enlarging a pattern from the origin",f"A design has a corner at {m(f'({x},{y})')}. Enlarge it about the origin with scale factor {factor}.",
        part("Give the coordinates of the enlarged corner.",m(f"({x2},{y2})")+".",
            (f"Measure the original horizontal and vertical distances from the origin.",f"Multiply both distances by {factor}."),
            "Use a ray from the centre and multiply distance by the scale factor.",field(f"({x2},{y2})","pairs",label="New coordinates (x, y)")),
        paper(f"Give the image positions of two more vertices {m(f'({x+1},{y})')} and {m(f'({x},{y+1})')}. Describe how the side lengths change.",
              f"The images are {m(f'({x2+factor},{y2})')} and {m(f'({x2},{y2+factor})')}. Side lengths are multiplied by {factor}. Corresponding angles stay equal, so the shapes are similar.",
              ("The same factor acts on every direction.",),"Distinguish lengths from angles."))


def chapter_position():
    return (
      L("scales-coordinates","Maps, coordinate distances and translations","Use a scale, measure along one coordinate direction and identify translated points without a grid.",(
        S("scale","How can a small plan show a real distance?","A map scale tells you what one unit on the drawing represents in real life.",
          "Multiply by the amount represented by one map unit to find a real distance. Divide the real distance by that amount to find a map distance.",
          "Check the units on both sides of the scale. Map centimetres and real kilometres are different units.",
          "Label the map and real measurements in your working.",map_scale,
          svg("map-scale","A map scale with one-centimetre intervals",
              path([(44,83),(317,83)],INK)+''.join(path([(x,75),(x,91)],BLUE)+label(x,111,t,size=12)
              for x,t in [(44,"0"),(135,"2 km"),(226,"4 km"),(317,"6 km")]),
              "This map scale shows 2 km in each 1 cm interval.")),
        S("distance","What if only one coordinate changes?","Points on the same horizontal or vertical grid line differ in just one coordinate.",
          "Subtract the smaller changing coordinate from the larger one. The result is a distance, so it cannot be negative.",
          "Include the distance on both sides of zero when a segment crosses zero.",
          "Start by naming the coordinate that changes.",distance),
        S("translate","How do we slide a shape without turning it?","A translation moves each vertex by the same horizontal and vertical amount. You can add these changes directly to the coordinates.",
          "Right increases x and up increases y. Left decreases x and down decreases y.",
          "The vertical move changes only the second coordinate.",
          "Write the two signed moves before applying them to a point.",translation)),
        (("Scale","The link between a drawing size and the real size."),("Translation","A slide that moves every point the same way."),("Vertex","A corner point of a shape."))),
      L("transformations","Reflection, rotation and enlargement","Reflect points across an axis, make quarter and half turns, and enlarge shapes from a centre.",(
        S("reflection","Which coordinate changes after a reflection?","Each point and its image have the same perpendicular distance from the mirror line. For a mirror axis, the coordinate along it stays fixed.",
          "In the x-axis, keep x and reverse y. In the y-axis, keep y and reverse x.",
          "Do not change both signs for one reflection in a coordinate axis.",
          "Use the line named in the question as your mirror.",reflection,
          grid_image("axis-reflection","Two matching triangles on opposite sides of the x-axis",
                     "A point 3 units above the x-axis maps to 3 units below it. The x-value stays the same.",
                     lines=((((1,1),(4,1),(1,3)),BLUE,True),(((1,-1),(4,-1),(1,-3)),GOLD,True)),
                     dots=((1,3,"A",BLUE),(1,-3,"A′",GOLD)))),
        S("rotation","What do we need to describe a turn?","A turn needs a centre and an angle. Give its direction unless it is a half turn. For a centre other than the origin, count the offsets from the stated centre before turning them.",
          "A 90° turn is a quarter turn and a 180° turn is a half turn. A rotation keeps distances and angles unchanged.",
          "Check the direction. Clockwise and anticlockwise quarter turns give different positions.",
          "Use tracing paper or count grid steps from the centre to check.",rotate,
          grid_image("quarter-turn","A point at (2, 1) and its anticlockwise quarter-turn image at (−1, 2)",
                     "Rotate the line from the origin to A anticlockwise through 90°. It now reaches the image A′.",
                     lines=((((0,0),(2,1)),BLUE,False),(((0,0),(-1,2)),GOLD,False)),
                     dots=((2,1,"A",BLUE),(-1,2,"A′",GOLD)))),
        S("enlargement","How can a shape get bigger but stay similar?","Draw a ray from the centre of enlargement through a vertex. Measure the vertex's distance from the centre.",
          "For scale factor 2, place the image vertex twice as far along the ray. Equal angles and the same scale factor give similar shapes.",
          "An enlargement is measured from its centre. Do not simply double coordinates if the centre is somewhere else.",
          "Describe an enlargement using both its centre and scale factor.",enlargement,
          grid_image("enlarge-triangle","A triangle and its two-times enlargement about the origin",
                     "The point A′ is twice as far from the origin along the same ray as A. The whole triangle uses the same scale factor.",
                     lines=((((1,0),(3,0),(1,1)),BLUE,True),(((2,0),(6,0),(2,2)),GOLD,True),(((0,0),(2,2)),INK,False)),
                     dots=((1,1,"A",BLUE),(2,2,"A′",GOLD))))),
        (("Mirror line","The line halfway between a point and its reflection."),("Centre of rotation","The fixed point about which the shape turns."),("Similar","The same shape with corresponding lengths in a fixed ratio.")))
    )


def data_types(s):
    size=n(s,12,52)
    index=s%3
    correct=("Categorical data","Discrete numerical data","Continuous numerical data")
    given=(f"A teacher asks {size} pupils how they travelled to school: by bus, car, bike or on foot.",
           f"A teacher counts the number of pets each of {size} pupils has.",
           f"A teacher measures how far each of {size} pupils travels to school, in kilometres.")[index]
    reasons=("The answer names a category.", "The answer is a whole-number count.", "Distance is measured and can take values between any two readings.")
    return problem("Choosing a type of data",given,
        opt("Classify the data being collected.",correct[index],tuple(c for c in correct if c!=correct[index]),s,(reasons[index],),fact=True),
        paper("Suggest one clear instruction for gathering these data in the same way from everyone.",
              ("Ask each pupil for their main way of travelling on the same day.",
               "Ask everyone the same question about pets currently living at home.",
               "Use the same route-measuring method for each pupil.")[index],
              ("Agree the definition and collect information the same way from everyone.",),"Specify what to record."))


def sampling(s):
    a=n(s,2,37)
    b=k(s,3,19)
    index=s%2
    topic="walking to school" if index else "enjoying board games"
    return problem("Checking who was asked",f"Two groups ask about {topic}. One asks {a} classmates in one room. The other chooses {a+b*5} pupils at random from a full school list.",
        opt("Which sample is more useful for estimating the views of the entire school?", "The random sample across the school",
            ("The one-room sample","Both must give the same result","Take no sample"),s,
            ("A full-school selection can include different groups of pupils.","The larger number also makes one unusual answer less influential.")),
        paper("Explain why asking many pupils from just one room could still give a biased result.",
              "The chosen room may have different pupils or interests from other rooms.",
              ("A larger sample only helps if its selection also suits the question.",),"Comment on where the pupils come from."))


def investigation(s):
    a=n(s,2,37)
    b=k(s,2,19)
    diff=2+s%7
    matrix=table(("Group","Trials","Recorded successes"),(("Group A",a+b,a),("Group B",a+b+diff,a+diff)))
    return problem("Testing a prediction with data",
        "A pupil predicts that group A succeeds more often on a puzzle than group B. Each trial records either success or no success.",
        opt("Which group has the higher proportion of successes?", "Group B",
            ("Group A","Both are equal","There is no result to compare"),s,
            (f"Group A succeeds in {f(Fraction(a,a+b))} of trials.",f"Group B succeeds in {f(Fraction(a+diff,a+b+diff))}.",
             f"Both have {b} unsuccessful trials. Group B has more trials, so the unsuccessful share is smaller.")),
        paper("Does the evidence support the prediction? Suggest one follow-up before drawing a firm conclusion.",
              "The prediction is not supported by these results. Repeat the same puzzle with larger groups selected in the same way.",
              ("Start with a question and a prediction. Collect results, represent the counts, then interpret them.","An increase in sample size may reduce sampling variation."),"Connect the conclusion to the comparison and the method."),
        figure_html=matrix)


def tally(s):
    a,b,c=n(s,3,26),k(s,4,17),2+s%7
    item=("flower","leaf","seed")[s%3]
    stated="A group sorts counters by picture."
    rows=table(("Picture","Frequency"),(("Flower",a),("Leaf",b),("Seed",c)))
    return problem("Using a frequency table",stated,
        num("How many counters are sorted altogether?",a+b+c,
            (f"Add the frequencies {a}, {b} and {c}.",),"Sum each category once."),
        num(f"How many counters do not show a {item}?",a+b+c-{"flower":a,"leaf":b,"seed":c}[item],
            ("Include the two other categories.",),"Subtract the chosen frequency from the total."),
        paper("Explain how tally marks could be used to record the original sort.",
              "Make a row for each picture. Add one tally per counter, with groups of five where possible.",
              ("Tally marks can be counted afterwards to fill the frequency column.",),"Match one record to one counter."),
        figure_html=rows)


def two_way(s):
    a,b,c,d=n(s,3,26),k(s,4,17),2+s%8,2+(s//17)%12
    rows=table(("Class","Printed book","Audio book","Total"),(("M",a,b,a+b),("N",c,"?",c+d),("Total",a+c,b+d,a+b+c+d)))
    return problem("Completing a two-way table","Two classes choose either a printed book or an audio book for a reading activity.",
        num("Complete the missing number.",d,(f"Class N has {c+d} pupils in the table.",f"Subtract its {c} printed books."),"Use the total for the correct row."),
        num("How many pupils choose a printed book altogether?",a+c,(f"Add the printed-book counts from class M and class N.",),"Use the total of the printed-book column."),
        figure_html=rows)


def set_sort(s):
    a,b,total=n(s,3,23),k(s,2,17),50+n(s,4,35)
    both=2+s%7
    just_a=a+both
    just_b=b+both
    outside=total-a-b-both
    return problem("Sorting with two features",f"Among {total} shapes, {just_a} are blue, {just_b} are triangles and {both} are both blue and triangles.",
        num("How many shapes are neither blue nor triangles?",outside,
            (f"Blue only is {just_a} minus {both}, or {a}.",f"Triangle only is {just_b} minus {both}, or {b}.",
             f"Subtract the counts {a}, {b} and {both} from {total}."),"Count the group that has both features only once.",
            wrong=(str(total-(just_a+just_b)),"The overlapping group was counted twice. Subtract it from the total inside the two categories once.")),
        paper("Show the four counts in either a Venn diagram or a Carroll diagram. Explain how both represent the same groups.",
              f"Blue only {a}, triangle only {b}, both {both}, neither {outside}. On a Venn diagram use the overlap for both. In a Carroll table the both count goes in the Blue and Triangle cell.",
              ("Each shape belongs in exactly one region or cell.",),"Label both features and distinguish both from neither."))


def dual_bars(s):
    a,b,c,d=n(s,3,28),k(s,3,17),2+s%9,2+(s//19)%14
    rows=table(("Activity","Tuesday","Friday"),(("Sketching",a,c),("Sewing",b,d)))
    return problem("Comparing two groups on a bar chart",
        "These are the values labelled on a dual bar chart at a club.",
        num("What is the total attendance for both activities on Friday?",c+d,
            (f"The Friday bars show {c} and {d}.",),"Add the Friday values, one from each activity."),
        paper("Explain why a dual bar chart could make the activity counts easier to compare than one separate chart for each day.",
              "It puts the values for the same activity side by side on the same scale.",
              ("A compound or stacked bar makes the combined total easy to see. A dual bar chart shows detailed counts directly beside one another.",),"Relate the chart layout to what the reader needs."),
        figure_html=rows)


def share_chart(s):
    a=n(s,3,25)
    b=k(s,2,16)
    total=50+5*(s%9)
    actual=Fraction(360*a,total)
    return problem("Representing part of a whole",f"Out of {total} visitors to a museum, {a} chose the model room and {b} chose the art room. Each picks one room.",
        num("Find the angle for the model room on a pie chart.",actual,
            (f"The share is {f(Fraction(a,total))}.",f"Multiply this share by 360°."),"Convert a share of visitors to the same share of a full turn.",unit="degrees"),
        paper("Explain how a waffle diagram with 100 squares could represent the same share.",
              f"Shade about {int(Fraction(100*a,total)+Fraction(1,2))} of the 100 squares. Each square represents 1% of the visitors.",
              ("Use the closest whole number of squares if the percentage is not a whole number.",),"Find the percentage share before deciding how many squares to shade."))


def intervals(s):
    low=n(s,3,22)
    mid=k(s,5,20)
    high=2+s%10
    rows=table(("Time t (seconds)","Number of trials"),((m(r"0\leq t<20"),low),(m(r"20\leq t<40"),mid),(m(r"40\leq t<60"),high)))
    return problem("Grouping continuous times","A class groups the time for a short task into three equal-width groups. These would give touching bars on a frequency diagram.",
        num("How many trials took less than 40 seconds?",low+mid,
            (f"The first two groups count {low} and {mid} trials.",),"Add only groups with times below 40 seconds."),
        paper("Where does a measured time of exactly 20 seconds go? Explain your choice.",
              "It belongs in the second group. The first group stops before 20, while the second includes 20.",
              ("Read the inequality on both sides of 20.",),"Check whether a group includes or excludes its endpoint."),
        figure_html=rows)


def trend(s, graph="line"):
    a=n(s,8,39)
    d1=k(s,2,16)
    d2=2+s%9
    if graph=="line":
        data=table(("Time","Water level (cm)"),(("9:00",a),("10:00",a+d1),("11:00",a+d1-d2),("12:00",a+d1-d2*2)))
        intro="These are labelled points from a line graph of a water level."
        main=num("By how much does the level fall from 10:00 to 11:00?",d2,
            (f"The level at 10:00 is {a+d1} cm.",f"Subtract the 11:00 reading, {a+d1-d2} cm."),"Find the difference between the two readings.",unit="cm")
        follow=paper("Describe the change before and after 10:00.","The water level first rises and then falls.",
            ("The directions of the line segments show rise or fall.",),"Compare readings in their time order.")
    else:
        data=table(("Practice time (minutes)","Number of accurate passes"),((8,a),(12,a+d1),(16,a+d1+d2),(20,a+d1+d2*2)))
        intro="These are coordinates from a scatter graph. Each point represents one player."
        main=opt("What is the general pattern?", "Longer practice goes with more accurate passes",
            ("Longer practice goes with fewer accurate passes","All players make the same number of accurate passes","Practice time does not change"),s,
            ("Moving right to larger practice times also moves generally up to larger passing counts.",))
        follow=paper("Does the scatter graph alone prove that more practice causes more accurate passes?",
            "No. Players may differ in experience or other ways. There are also only four players in the data.",
            ("An association describes the data. It does not identify the cause.",),"Think of another reason the variables could change together.")
    return problem("Reading the pattern in a graph",intro,main,follow,figure_html=data)


def scatter(s):
    return trend(s,"scatter")


def infographic(s):
    icons=n(s,2,16)
    scale=k(s,2,13)
    others=2+s%5
    colour=("violet","green","gold")[s%3]
    data=table(("Colour","Number of complete icons"),((colour.capitalize(),icons),("Silver",others)))
    return problem("Checking the key of an infographic",f"A display counts badges. Every full icon shown represents {scale} badges. The display key is the same for all colours.",
        num(f"How many {colour} badges are represented?",icons*scale,
            (f"There are {icons} whole icons for {colour}.",f"Multiply by {scale} badges per icon."),"Read the key before counting."),
        paper(f"Explain one way to make the display fair when comparing {colour} and silver.",
              "Use the same icon size and the same number represented by one icon for both colours.",
              ("Making an icon larger to show a larger count can exaggerate how different the groups are.",),"Keep scales and symbols consistent."),
        figure_html=data)


def avg_data(s, kind):
    a=n(s,4,38)
    b=k(s,2,9)
    values=[a,a+b,a+b,a+2*b,a+7*b+1]
    inside=values[1]
    outlier=values[-1]
    if kind=="mean":
        answer=Fraction(sum(values),len(values))
        q="Find the mean."
        steps=(f"Add all five values. The sum is {sum(values)}.","Divide the sum by the count, 5.")
        reason="Use the sum divided by the number of values."
        prompt=f"Explain how the mean would change if the largest value rose by 5."
        sol="The sum goes up by 5 and there are still 5 values, so the mean goes up by 1."
    elif kind=="median":
        answer=inside
        q="Find the median."
        steps=(f"Put the readings in order: {', '.join(map(str,values))}.",f"Read the third value out of five.")
        reason="Find the central position after ordering the data."
        prompt="Would the median change if the largest value increased? Explain."
        sol="No. The third value stays the same when only the largest value increases."
    else:
        answer=outlier-a
        q="Find the range."
        steps=(f"The greatest value is {outlier} and the smallest is {a}.",f"Subtract {a} from {outlier}.")
        reason="Subtract the smallest value from the largest."
        prompt="Find the mode and explain how the mode and range describe different features of the data."
        sol=f"The mode is {inside}, the most frequent value. The range is {answer}, the gap from the smallest to the largest value."
    return problem("Summarising five measurements",f"Five sensor readings are {outlier}, {inside}, {a}, {a+2*b}, {inside}.",
        num(q,answer,steps,reason),
        paper(prompt,sol,("Think about which positions or counts each summary uses.",),"Choose the summary for the property being studied."))


def mean_item(s):
    return avg_data(s,"mean")


def median_item(s):
    return avg_data(s,"median")


def range_item(s):
    return avg_data(s,"range")


def larger_set(s):
    a=n(s,2,25)
    b=k(s,11,26)
    c=20+s%19
    totals=a+b+c
    upper=3+s%8
    middle=upper-1
    rows=table(("Count per player","Players"),[(middle-1,a),(middle,b),(upper,c)])
    weighted=(middle-1)*a + middle*b + upper*c
    modes=[v for v,count in [(middle-1,a),(middle,b),(upper,c)] if count==max(a,b,c)]
    return problem("Finding an average from a larger set",
        f"A club records completed rounds for {totals} players. Every player belongs in one table row.",
        num("Find the mean number of completed rounds.",Fraction(weighted,totals),
            (f"For each row multiply rounds per player by the number of players.",
             f"Add these results for {weighted} rounds in total. Divide by the {totals} players."),
            "Find the total rounds, not just the sum of the three row labels."),
        paper("Identify the mode or modes. Explain when the mode is helpful.",
            f"The most common round count{'s are' if len(modes)>1 else ' is'} {', '.join(map(str,modes))}. The mode helps when you want to name a usual count that actually occurred.",
            (f"The highest frequency is {max(a,b,c)}.",),"Read the round count beside the highest frequency."),
        figure_html=rows)


def chapter_statistics():
    venn=svg("two-sorting-models","Venn diagram and Carroll table for two features",
        '<circle cx="69" cy="71" r="40" fill="#acd8de" fill-opacity=".8" stroke="#17666c" stroke-width="2"/>'
        '<circle cx="113" cy="71" r="40" fill="#f2d7a6" fill-opacity=".6" stroke="#a05d1e" stroke-width="2"/>'
        +label(48,76,5,size=13)+label(91,76,3,size=13)+label(135,76,4,size=13)+label(32,126,2,size=13)
        +rect(189,44,151,84,"#fff")+path([(264,44),(264,128)],INK)+path([(190,86),(340,86)],INK)+
        label(226,35,"Blue",size=11)+label(300,35,"Not blue",size=11)+
        label(226,71,"△ 3",size=14)+label(300,71,"△ 4",size=14)+
        label(226,111,"Other 5",size=12)+label(300,111,"Other 2",size=12),
        "Both diagrams sort by whether a shape is blue and whether it is a triangle. The overlap and the Blue/Triangle cell both contain 3.")
    bars=svg("two-bar-displays","Grouped bars beside stacked bars for two sets of data",
        path([(24,129),(154,129)],INK)+path([(24,129),(24,31)],INK)+
        ''.join(rect(a,129-h,19,h,c) for a,h,c in ((42,44,"#a5ddda"),(64,64,"#f2d7a6"),(101,35,"#a5ddda"),(123,55,"#f2d7a6")))+
        path([(201,129),(337,129)],INK)+path([(201,129),(201,11)],INK)+
        ''.join(rect(a,y,29,h,c) for a,y,h,c in ((220,85,44,"#a5ddda"),(220,21,64,"#f2d7a6"),(279,94,35,"#a5ddda"),(279,39,55,"#f2d7a6")))+
        label(90,150,"Dual bars",size=12)+label(270,150,"Compound bars",size=12),
        "Use side-by-side bars to compare parts. Use a stacked bar to see a total and its parts.")
    line=svg("scatter-or-line","A line graph with joined readings and a scatter graph with unjoined points",
        path([(28,132),(157,132)],INK)+path([(28,132),(28,26)],INK)+path([(28,107),(62,61),(104,75),(145,37)],BLUE)+
        ''.join(dot(x,y) for x,y in ((28,107),(62,61),(104,75),(145,37)))+
        path([(206,132),(341,132)],INK)+path([(206,132),(206,26)],INK)+
        ''.join(dot(x,y,GOLD) for x,y in ((220,118),(240,97),(260,104),(278,69),(295,79),(316,49),(334,42)))+
        label(94,151,"Changes over time",size=12)+label(273,151,"Paired measurements",size=12),
        "Join readings on a line graph to show change in order. Leave individual points unjoined on a scatter graph.")
    return (
      L("collecting-data","Sampling and collecting data","Choose the data to collect, use a suitable sample, and interpret an investigation.",(
        S("types","Am I naming, counting or measuring?","Some data are labels. Other data are numbers from counts or measurements.",
          "Categorical data name groups. A discrete count takes separate allowed values. A continuous measurement can fall anywhere in an interval.",
          "A house number is a label, even though it is written with digits.",
          "Name the data type and show how the answer will be recorded.",data_types),
        S("sample","How can a sample represent a wider group?","Begin with the whole group you want to learn about. Choose a sample that gives different members a fair chance to take part.",
          "Larger samples can reduce sampling variation. Choice of participants also matters.",
          "Asking many people from the same narrow group can still give a biased sample.",
          "Name both the group you want to describe and the people you actually sampled.",sampling,
          boxes("sampling-cycle",("Ask","Collect","Show","Interpret"),"Start with a clear question. The final conclusion should answer it.")),
        S("cycle","Did the results support the prediction?","Make a prediction, decide what counts as a result, try a small trial and improve the method before a larger study.",
          "Organise results in a table or chart. Compare rates rather than raw counts if the group sizes differ.",
          "An unexpected result may come from sampling variation or a real difference.",
          "Explain what the results suggest and what another sample could check.",investigation)),
        (("Population","The full group you want to learn about."),("Sample","The people or things selected from the population."),("Sampling variation","Differences in results caused by using different samples."))),
      L("sorting-tables","Venn diagrams, Carroll diagrams and tables","Record counts with tallies, complete two-way totals and sort items by two features.",(
        S("frequency","How do we turn tally marks into counts?","Add one mark each time an observation belongs to a category. Count the marks to write a frequency.",
          "A frequency tells how many observations fit a value or category. Add the separate counts to find the total.",
          "Read a group of five tally marks as five, even when the fifth is drawn across the other four.",
          "Check the total against the number of items collected.",tally),
        S("two-way","How do row totals and column totals work?","A two-way table sorts observations by two chosen properties. Each observation belongs in one cell.",
          "Use a row total or column total to find a missing entry. Both sets of totals give the same overall count.",
          "The overall total needs every observation once, rather than all the totals added together.",
          "Put a finger on the row and the column to find the correct cell.",two_way),
        S("sorting","How can two diagrams show the same groups?","In a Venn diagram, an overlap means both. In a Carroll diagram use yes and no for each feature, making four cells.",
          "Count the overlap once. An item outside both circles has neither feature.",
          "An outside region is still part of the whole data set.",
          "Label both features and check all four counts add up.",set_sort,venn)),
        (("Frequency","How many times a value or category occurs."),("Venn diagram","A diagram whose regions show sets and overlaps."),("Carroll diagram","A table that sorts items according to whether two features apply."))),
      L("bars-pies","Bar charts, pie charts and waffle diagrams","Compare and choose displays for category counts, shares and grouped measurements.",(
        S("bars","When should we use side-by-side or stacked bars?","For each category, put the two group bars side by side if you want to compare their individual counts.",
          "A dual bar chart compares parts across groups. A compound bar stacks parts, showing a group total as well as its pieces.",
          "A stacked bar starts the upper piece at the top of the lower piece. Use the thickness of the upper piece for its count.",
          "Use the same scale and a clear key for both sets of bars.",dual_bars,bars),
        S("shares","How can a diagram show a share of one whole?","Make the whole circle or whole waffle grid represent every item.",
          "A pie-chart angle is the category's fraction of 360°. In a 100-square waffle, each square represents 1%.",
          "The number of items is not automatically the angle in degrees.",
          "Check that all slices together make a full turn, or all waffle shares give 100%.",share_chart),
        S("continuous","How can we display groups of measurements?","Put measurements into groups that do not overlap. With equal widths, a frequency diagram uses adjoining bars and represents counts by heights.",
          "Use a time exactly on a boundary in the group that includes that value.",
          "If a group ends before 20, an exact reading of 20 belongs in the next group.",
          "State the units on the horizontal axis and the frequency on the vertical axis.",intervals)),
        (("Compound bar chart","A chart with pieces stacked to show a total."),("Waffle diagram","A grid showing each category as part of the full grid."),("Group boundary","A value marking where one interval ends or begins."))),
      L("interpreting-graphs","Line graphs, scatter graphs and infographics","Describe change, compare paired measurements and read a graphic with a key.",(
        S("line","What direction does a quantity change in?","Read the time and the value at each point. The order of times matters for a line graph.",
          "A rise shows an increase, a fall shows a decrease and a horizontal section shows no change.",
          "A higher line does not always rise if it was even higher a little earlier.",
          "Use two real readings from the graph to support a statement.",trend,line),
        S("scatter","What can a set of paired points suggest?","One point shows two measurements taken on the same person or object. Look at the full cloud of points.",
          "An upward pattern means larger values of one variable tend to go with larger values of the other.",
          "A pattern alone does not tell which measurement, if either, causes the other.",
          "Look at the axis labels and note any point far from the general pattern.",scatter),
        S("picture","What tells us the value of one icon?","In a pictorial display one mark may stand for several observations. Start with the key.",
          "Multiply the number of full icons by the key value. A partial icon shows the same fraction of the key.",
          "If the icons use different scales, counting them without reading the key gives a misleading comparison.",
          "Look for a clear scale, readable labels and a title that says what was counted.",infographic)),
        (("Line graph","A graph with successive points joined to show change."),("Scatter graph","A plot of measurements taken in pairs."),("Infographic","A display that uses words, images and numbers to show information."))),
      L("averages-range","Averages and the range","Calculate the mean, median, mode and range, and choose a summary that fits the question.",(
        S("mean","How can we share a total equally?","Add all observations and imagine redistributing the total equally among them.",
          "The mean is the sum divided by the number of observations. The result need not be one of the original values.",
          "Divide by the number of values, not by the largest number in the list.",
          "Check that the mean lies between the smallest and largest values.",mean_item,
          boxes("mean-method",("Add","Count","Divide"),"The mean is the amount each would get if the total were shared equally.")),
        S("median","Which number is in the middle?","Sort the values first. The median sits in the middle position. For two central values, use their mean.",
          "The median can be more useful than the mean if a very high or low value would pull the mean away from most of the data.",
          "Middle means middle after sorting, rather than the middle of the unsorted list.",
          "Show the ordered list and identify the central position or positions.",median_item),
        S("mode-range","Do we need the most common value or the spread?","Use the mode to name the most frequent value or category. Use the range to say how far apart the extreme values are.",
          "The range is largest minus smallest. A low range shows the whole set is contained within a small interval.",
          "The range is the size of a gap, rather than writing down both endpoint values.",
          "Explain which feature your chosen summary tells the reader about.",range_item),
        S("many-values","How can a frequency table help us summarise many values?","Read a row as the same value repeated for the given number of people or trials.",
          "For each row, multiply value by frequency. Add these totals and divide by the sum of the frequencies.",
          "The number of rows is not the number of observations. Use the total frequency.",
          "Check that your mean fits between the lowest and highest data values.",larger_set)),
        (("Mean","The total divided by the number of values."),("Median","The middle value after ordering, or mean of two middle values."),("Mode","A most frequent value or category."),("Range","Largest value minus smallest value.")))
    )


def chapters():
    return (
        ("number-calculation","Number and calculation",chapter_number()),
        ("algebra","Algebraic representation and manipulation",chapter_algebra()),
        ("shape-measure","Shape and measure",chapter_shape()),
        ("fractions-ratio","Fractions, decimals, percentages, ratio and proportion",chapter_fractions()),
        ("probability","Probability",chapter_probability()),
        ("sequences-graphs","Sequences, functions and graphs",chapter_graphs()),
        ("position-transform","Position and transformation",chapter_position()),
        ("statistics","Statistics",chapter_statistics()),
    )


if __name__ == "__main__":
    build_stage(7,chapters(),__file__)
