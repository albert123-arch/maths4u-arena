"""Generate the independently authored 0580 C1.1/E1.1 teaching package."""

from fractions import Fraction
from html import escape
from math import gcd, isqrt, lcm
from pathlib import Path
import hashlib
import json

ROOT = Path(__file__).resolve().parents[2]
COURSE = "maths4u-0580"
DATE = "2026-11-22"


def p(text):
    return f"<p>{text}</p>"


def m(text):
    return r"\(" + escape(str(text), quote=False) + r"\)"


def fraction(a, b):
    ratio = Fraction(a, b)
    if ratio.denominator == 1:
        return str(ratio.numerator)
    sign = "-" if ratio < 0 else ""
    return sign + fr"\frac{{{abs(ratio.numerator)}}}{{{ratio.denominator}}}"


def prime_factors(n):
    factors = []
    for divisor in range(2, isqrt(n) + 1):
        while n % divisor == 0:
            factors.append(divisor)
            n //= divisor
    return factors + ([n] if n > 1 else [])


def index_form(n):
    factors = prime_factors(n)
    return r"\times ".join(
        f"{q}^{{{factors.count(q)}}}" if factors.count(q) > 1 else str(q)
        for q in sorted(set(factors))
    ) or "1"


def task(title, prompt, label, expected, steps, hint, wrong=None, kind="number", options=None):
    field = dict(key="answer", label=label, type=kind, expected=str(expected))
    if options:
        field["options"] = options
    retry = [{"answer": str(wrong[0]), "feedback": p(wrong[1])}] if wrong else []
    return dict(title=title, prompt=p(prompt), field=field, steps=list(map(p, steps)), hint=p(hint), retry=retry)


def integers(i):
    n = i + 5
    f = m(fr"\frac{{{3*n+1}}}{{3}}")
    choices = m(fr"-{n},\quad 0,\quad \frac{{{3*n+1}}}{{3}},\quad {n+2}")
    return task("Find all the integers", f"Find all the integers in this list: {choices}.",
        "Set of integers", f"{{-{n},0,{n+2}}}",
        [f"The whole-number ticks include {m(-n)}, {m(0)} and {m(n+2)}.",
         f"{f} lies just above {n}; there is a fractional part of {m(fraction(1,3))}.",
         f"Use all three integers: {m(fr'\{{-{n},0,{n+2}\}}')}."],
        "Include negative whole numbers and zero.",
        (f"{{-{n},{n+2}}}", "Zero is an integer, even though it is neither positive nor negative."), kind="set")


def rational(i):
    n = 3 + i
    radicand = n*n+2
    root = m(fr"\sqrt{{{radicand}}}")
    integer_root = m(fr"\sqrt{{{n*n}}}")
    options = {"A": integer_root, "B": m(f"0.{i+17}"), "C": root}
    return task("Spot an irrational number", "Choose the irrational number.", "Irrational number", "C",
        [f"{integer_root} equals the integer {n}. It is rational.",
         f"{options['B']} ends, so it can be written as an exact fraction over 100.",
         f"{radicand} lies strictly between consecutive perfect squares. Its square root {root} is irrational."],
        "Check the number under each root. Some square roots are integers.",
        ("A", "A root sign does not make a number irrational. Calculate the exact root of this perfect square."),
        kind="choice", options=options)


def place_value(i):
    a, b, c = 2 + i % 7, 101 + 13*i, 37 + 3*i
    value = m(fr"{a}\,{b:03d}\,{c:03d}")
    return task("Read the thousands", f"How many whole thousands are in {value}?", "Whole thousands", a*1000+b,
        [f"The first group contributes {a} million, or {a*1000} thousand.",
         f"The middle group adds {b} thousand. The final {c} ones do not make another thousand.",
         f"The total is {m(f'{a*1000}+{b}={a*1000+b}')} whole thousands."],
        "Each million contains one thousand thousands.",
        (b,"The middle group counts some of the thousands. Include the thousands that make up the millions."))


def small_words(n):
    ones = ("zero","one","two","three","four","five","six","seven","eight","nine","ten",
        "eleven","twelve","thirteen","fourteen","fifteen","sixteen","seventeen","eighteen","nineteen")
    tens = ("","","twenty","thirty","forty","fifty","sixty","seventy","eighty","ninety")
    if n < 20:
        return ones[n]
    if n < 100:
        q,r = divmod(n,10)
        return tens[q]+("-"+ones[r] if r else "")
    q,r = divmod(n,100)
    return ones[q]+" hundred"+(" and "+small_words(r) if r else "")


def words_to_digits(i):
    a,b,c = 1+i%8,5+i, 7+3*i
    words=f"{small_words(a)} million, {small_words(b)} thousand and {small_words(c)}"
    number=a*10**6+b*1000+c
    grouped = m(fr"{a}\,{b:03d}\,{c:03d}")
    q = task("Write a number from words",f"Write <strong>{words}</strong> in figures.","Number in figures",number,
        [f"Place {a} in the millions group.",
         f"The groups to its right must each have three digits. Write {b:03d} for the thousands and {c:03d} for the final group.",
         f"Read the groups together: {grouped}."],
        "When a middle or final group has fewer than three digits, put zeros at the front of that group.")
    return dict(q, exam_answer=grouped)


def grouped_words(groups):
    names = ("billion", "million", "thousand", "")
    parts = []
    for value, name in zip(groups, names):
        if value and name:
            parts.append(f"{small_words(value)} {name}")
    last = groups[-1]
    prefix = ", ".join(parts)
    if not last:
        return prefix or "zero"
    if not prefix:
        return small_words(last)
    separator = " and " if last < 100 else ", "
    return prefix + separator + small_words(last)


def digits_to_words(i):
    first = 2 + i % 7
    middle = 13 + 7 * i
    last = 5 + 3 * i
    if i % 3 == 0:
        groups = (first, middle, 0, last)
        shifted = (0, first, middle, last)
    elif i % 3 == 1:
        groups = (0, first, middle, 100 + last)
        shifted = (first, middle, 0, 100 + last)
    else:
        groups = (first, 0, middle, last)
        shifted = (0, first, middle, last)
    n = sum(value * 1000 ** exponent for exponent, value in enumerate(reversed(groups)))
    digits = m(fr"{n:,}".replace(",", r"\,"))
    correct = grouped_words(groups)
    incorrect = grouped_words(shifted)
    wrong_last = groups[:-1] + (groups[-1] + 10,)
    options = {"A": correct, "B": incorrect, "C": grouped_words(wrong_last)}
    shown = (("billions", groups[0]), ("millions", groups[1]), ("thousands", groups[2]), ("ones", groups[3]))
    pattern = ", ".join(f"{digit} in the {name} group" for name, digit in shown if digit)
    q = task("Write a number in words", f"Which words represent {digits}?", "Number in words", "A",
        ["Split the digits from the right into groups of three.",
         f"Read the non-zero groups in order. The entries are {pattern}.",
         f"Write <strong>{correct}</strong>."],
        "Label the groups from the right: ones, thousands, millions, billions.",
        ("B", "A group of zeros adds nothing to say. It still occupies a position, so check the name of the group to its left."),
        kind="choice", options=options)
    return dict(q, exam_prompt=p(f"Write {digits} in words."), exam_answer=correct,
        exam_marking=f"Give the words for the whole number: {correct}. Accept wording with the same place values, with or without optional punctuation or 'and'.")


def factor_pairs(i):
    n = 4*(i+3)
    factors = [q for q in range(1,n+1) if n % q == 0]
    pairs = [m(fr"{q}\times{n//q}") for q in factors if q <= n//q]
    return task("List every positive factor", f"List all the positive factors of {n}.", "Set of factors",
        "{" + ",".join(map(str,factors)) + "}",
        [f"Start with {pairs[0]}. Try the next possible small divisors in order.",
         "The full list of pairs is " + ", ".join(pairs) + ". Stop when the next pair would reverse one you already have.",
         f"Collect both numbers from each pair: {m(','.join(map(str,factors)))}."],
        "Work in pairs and include 1 and the number itself.",
        ("{"+",".join(map(str,factors[1:-1]))+"}", "Remember the pair made by 1 and the number itself."), kind="set")


def multiples(i):
    n, k = 7+i, 3+i%5
    a,b = n*k-2,n*k+3
    return task("Find a multiple inside a range", f"Find the multiple of {n} that is greater than {a} and less than {b}.",
        "Multiple", n*k,
        [f"The multiples of {n} are its times-table values.",
         f"The value {m(fr'{n}\times{k-1}={n*(k-1)}')} is too small.",
         f"The next value is {m(fr'{n}\times{k}={n*k}')} and it lies inside the range. The following value is too large."],
        "Find consecutive times-table values near the lower bound.")


def prime(i):
    start = 21 + 3*i
    while len(prime_factors(start)) > 1:
        start += 1
    multiple = 3*(i+7)
    return task("Identify a prime", "Which number is prime?", "Prime number", "B",
        [f"{multiple} is composite because {m(fr'{multiple}=3\times{i+7}')}.",
         "One has only one positive factor, so it is neither prime nor composite.",
         f"No prime up to {isqrt(start)} divides {start}, so {start} has exactly two positive factors."],
        "A prime must have exactly two positive factors.",
        ("C","One has just one positive factor. A prime has two."), kind="choice",
        options={"A":m(multiple),"B":m(start),"C":m(1)})


def decomposition(i):
    a, b = 2+i%4,1+i%3
    r = [7, 11, 13, 17, 19, 23][(i//3)%6]
    n = 2**a*3**b*r
    factors = prime_factors(n)
    q=task("Use prime factorisation", f"Use prime factorisation to find the exponent on 2 in {n}.",
        "Exponent on 2", a,
        [f"Split off 2 while the remaining number is even.",
         f"The prime factors in order are {m(r'\times '.join(map(str,factors)))}.",
         f"The compact form is {m(f'{n}={index_form(n)}')}. The exponent on 2 is {a}."],
        "Count the prime 2 each time it appears at the end of a branch.")
    q["exam_prompt"]=p(f"Write {n} as a product of prime factors in index form.")
    q["exam_answer"]=m(index_form(n))
    return q


def combine(i):
    a, b = 2+i%5,1+i%4
    pair = m(fr"A=2^{{{a}}}\times 5,\quad B=2^{{{b}}}\times 7")
    return task("Combine repeated prime factors", f"{pair}. What is the exponent of 2 in the prime factorisation of {m('AB')}?",
        "Exponent on 2", a+b,
        [f"The factor list for A has {a} copies of 2. The list for B has {b}.",
         f"Putting the lists together makes {m(f'{a}+{b}={a+b}')} copies of 2.",
         f"The result is {m(fr'AB=2^{{{a+b}}}\times 5\times 7')}."],
        "Add the counts of the same prime.",
        (a*b,"The exponents are counts of copies. When you join two lists, add their lengths.") if a*b!=a+b else None)


def make_square(i):
    primes = (2,3,5,7)
    a = [2+i%4, 2+(i//2)%3, 1+i%3, 2+(i//3)%3]
    if all(power%2==0 for power in a):
        a[-1] += 1
    n = 1
    need = []
    for base,power in zip(primes,a):
        n *= base**power
        if power%2:
            need.append(base)
    answer=1
    for base in need:
        answer*=base
    return task("Complete pairs to make a square", f"Let {m(f'N={index_form(n)}')}. Find the smallest positive integer that makes a square when multiplied by {m('N')}.",
        "Smallest multiplier", answer,
        ["A square repeats the same list of factors twice. Every prime exponent must be even.",
         f"These primes have odd exponents: {', '.join(map(str,need))}. Each needs one more copy.",
         f"Multiply the needed primes. The smallest multiplier is {answer}."],
        "Find the primes with odd exponents and give each one more copy.")


def packs(i):
    a_factor,b_factor=((3,5),(4,7),(5,8),(5,7))[i%4]
    a,b = a_factor*(i+9),b_factor*(i+9)
    g = gcd(a,b)
    return task("Make the most identical packs", f"A workshop has {a} brass clips and {b} steel clips. It makes identical packs and uses every clip. What is the greatest possible number of packs?",
        "Number of packs", g,
        [f"The number of packs must divide both {a} and {b} exactly.",
         f"Write {m(f'{a}={index_form(a)}')} and {m(f'{b}={index_form(b)}')}. Keep only the shared copies of primes.",
         f"The HCF is {g}. Each pack uses {a//g} brass and {b//g} steel clips."],
        "Think about a number that divides both totals.",
        (lcm(a,b),"This is a multiple of the totals. The number of packs needs to divide both totals exactly."))


def early_match(i):
    a_factor,b_factor=((2,3),(3,4),(3,5),(4,5))[i%4]
    a,b = a_factor*(i+2),b_factor*(i+2)
    value=lcm(a,b)
    return task("Find the next shared finish", f"Two machines finish jobs together. One finishes every {a} seconds and the other every {b} seconds. After how many seconds do they next finish together?",
        "Elapsed time in seconds", value,
        [f"The first machine finishes after {a}, {2*a}, {3*a}, and so on.",
         f"The other finishes after {b}, {2*b}, {3*b}, and so on.",
         f"The first positive time in both lists is {value} seconds."],
        "List multiples of each interval from the same starting time.",
        (gcd(a,b),"That divides both periods. A time at which both finish must be a multiple of both periods."))


def hcf_lcm_from_factors(i):
    a, b=18+3*i,30+5*i
    want="highest common factor" if i%2 else "lowest common multiple"
    value=gcd(a,b) if i%2 else lcm(a,b)
    method="Keep the smaller count of each shared prime." if i%2 else "Keep the greater count of every prime that appears."
    return task("Choose the correct prime copies", f"Find the {want} of {a} and {b}.",
        "Value",value,
        [f"The two prime products are {m(f'{a}={index_form(a)}')} and {m(f'{b}={index_form(b)}')}.",
         method,
         f"Multiplying the selected copies gives {m(f'{index_form(value)}={value}')}."],
        "Decide first whether the result should divide both given numbers or be divisible by both.")


def square(i):
    n=4+i
    return task("Read a square root",f"Evaluate {m(fr'\sqrt{{{n*n}}}')}.","Square root",n,
        [f"Look for an equal-side square with {n*n} tiles.",
         f"{m(fr'{n}\times{n}={n*n}')} gives the side length.",
         f"The symbol asks for the non-negative root, so use {n}."],
        "Find the number that makes the stated square.",
        (-n,"The negative value does square to the number, but the square-root symbol asks for the non-negative root."))


def cube(i):
    n=2+i
    return task("Undo a negative cube",f"Evaluate {m(fr'\sqrt[3]{{-{n**3}}}')}.","Cube root",-n,
        [f"Three negative factors multiply to a negative number.",
         f"{m(fr'(-{n})^3=-{n**3}')} gives the required cube.",
         f"The cube root is {m(-n)}."],
        "The sign of a cube root is the sign of the number inside it.",
        (n,"The cube of a positive number is positive. Keep the minus sign."))


def reciprocal(i):
    a,b=2*i+5,3*i+7
    return task("Find the reciprocal", f"Find the exact reciprocal of {m(fraction(a,b))}.","Reciprocal",Fraction(b,a),
        ["The reciprocal is the factor that makes the product equal to 1.",
         f"Swap the numerator and denominator to get {m(fraction(b,a))}.",
         f"Check {m(fraction(a,b)+r'\times '+fraction(b,a)+'=1')}."],
        "Swap the top and bottom, then check the product.",
        (Fraction(a,b),"That is the original number. Find the number you would multiply it by to get 1."))


LESSONS = [
    ("classify", "Integers, rational numbers and place value", "Sort numbers and convert between the figures and words for large whole numbers.", [
        ("integers", "Which numbers are integers?", "Integers occupy the whole-number marks on a number line. Fractions can sit between the marks.", "Start counting natural numbers at 1. Integers include zero and the negative whole numbers.", "A number can have more than one label. For example, 5 is both natural and an integer.", integers, "number-line"),
        ("rational", "Can I write the number as a fraction?", "A rational number is a fraction of two integers with a non-zero denominator. A terminating decimal or a decimal with a repeating pattern is rational.", "Calculate a square root when you can. The root of a perfect square is rational.", "An irrational number can have a rounded calculator display. The rounded decimal is a different number.", rational, None),
        ("place-value", "What does each group of digits count?", "Read from the right in groups of three. The groups count ones, thousands, millions and billions. A zero keeps the digits in their correct columns.", "One million contains 1000 whole thousands. Include those when finding the total number of thousands.", "The middle group on its own does not give the total number of whole thousands.", place_value, "place-table"),
        ("figures-and-words", "How do I write a large number in words?", "Start by splitting the digits into groups of three from the right. Label those groups ones, thousands, millions and billions.", "Read each non-zero group and add its place name. In words, skip a zero group. In figures, keep all three digits for every group after the first.", "A group of three zeros still holds a place. Without it, a billion can become a million.", digits_to_words, "words-table"),
    ]),
    ("factors", "Factors, multiples and prime numbers", "Use factor pairs and multiplication lists to decide what kind of whole number you have.", [
        ("factor-pairs", "How do I find every factor?", "Arrange objects in equal rows with none left over. A possible row count and its column count give a factor pair.", "Start at 1 and work upwards. Stop just before your next pair would reverse an earlier pair.", "If both members of a pair are equal, list that factor once.", factor_pairs, "factor-arrays"),
        ("multiples", "How can I find a multiple inside a range?", "A multiple is made by multiplying. Step along a times table and choose the values inside the bounds given in the question.", "Look at the neighbouring multiples to show which one falls in the interval.", "Greater than and less than both exclude equality. Check the endpoints.", multiples, None),
        ("two-factors", "How can I tell whether a number is prime?", "A prime is a positive integer with exactly two positive factors. A composite has an extra factor pair. If a larger factor exists beyond the square root, it has a smaller partner you have already tested.", "The number 2 is the only even prime. Odd numbers can be composite.", "The number 1 has one positive factor. It is neither prime nor composite.", prime, None),
    ]),
    ("prime-products", "Prime factor trees and prime powers", "Find the prime building blocks of a number and record them with powers.", [
        ("grow-tree", "What belongs at the tips of a factor tree?", "Split a number into two factors greater than 1. Split any composite factor again. Mark the prime tips and read those tips together.", "Different first branches give the same prime factors when the tree is finished.", "A branch ending in 4 or 9 is unfinished. Every final factor must be prime.", decomposition, "prime-tree"),
        ("combine-copies", "Why do the exponents add?", "An exponent counts repeated factors. When you multiply two products, the prime copies from both go into the same list.", "Count each prime separately. The exponent of 2 records only copies of 2.", "Do not multiply the exponents when forming a product of powers with the same base.", combine, None),
        ("complete-pairs", "How can I make the product a square?", "A square uses the same factor list twice. So every prime copy must have a matching partner. Add one copy wherever the exponent is odd.", "Check whether each exponent is odd or even. Multiply the primes that need a partner.", "A prime with no printed exponent has exponent 1.", make_square, None),
    ]),
    ("hcf-lcm", "Highest common factor and lowest common multiple", "Choose the right operation for equal groups and repeating cycles.", [
        ("equal-shares", "What is the largest number of identical groups?", "The number of groups divides each of the supplies. The highest common factor gives the greatest possible number of identical groups.", "For the HCF keep only the prime copies found in both factor lists.", "Read whether the question wants the number of groups or the number in each group.", packs, "prime-table"),
        ("repeating-cycles", "When do the two events next meet?", "Start both timelines at zero. Mark the times of each repeating event on its own line. The first positive time marked on both lines is the lowest common multiple.", "The common start at zero has already happened. Find the next shared time.", "The product of the periods is a common multiple. A smaller common multiple may come first.", early_match, "timelines"),
        ("choose-and-check", "How do I choose between HCF and LCM?", "Ask which way the division goes. A group count divides both totals. A shared elapsed time can be divided by both periods.", "HCF: take the smaller power of every shared prime. LCM: take the larger power of every prime used.", "Convert to the same units before comparing times. Keep the answer in the units requested.", hcf_lcm_from_factors, None),
    ]),
    ("powers-and-reciprocals", "Squares, cubes and reciprocals", "Recognise squares and cubes, then use multiplication to check a reciprocal.", [
        ("square-array", "Why is a square number called a square?", "A square grid has the same number of rows and columns. The total number of tiles is the square of the side length. The square root returns the side length.", "The square-root symbol gives the non-negative root.", "A power of 2 tells you to multiply the number by itself. For example, doubling 5 gives 10, while squaring it gives 25.", square, "square-tiles"),
        ("cube-layers", "What does a third factor do?", "A cube has the same number of rows, columns and layers. The cube of any number multiplies three copies. The cube root undoes this.", "Cubing a negative number gives a negative cube. Its real cube root is negative.", "A negative value has a real cube root. It has no real square root.", cube, "cube-layers"),
        ("product-one", "Which number will multiply to make one?", "A reciprocal undoes multiplication. Multiply the starting number by its reciprocal and the result is 1.", "To find the reciprocal of a non-zero fraction, interchange the numerator and denominator.", "Zero has no reciprocal because multiplying by zero always gives zero.", reciprocal, None),
    ]),
]


FIGURES = ROOT / "public/assets/study/0580/number-types"


def label(x, y, text):
    return f'<text x="{x}" y="{y}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="17" fill="#153356">{escape(text)}</text>'


def line(x, y, xx, yy, color="#315481"):
    return f'<path d="M{x} {y}L{xx} {yy}" stroke="{color}" stroke-width="2" stroke-linecap="round" fill="none"/>'


def dot(x, y, color):
    return f'<circle cx="{x}" cy="{y}" r="5" fill="{color}"/>'


def tiles(rows, columns, x, y, color, size=14):
    return "".join(
        f'<rect x="{x+j*(size+4)}" y="{y+i*(size+4)}" width="{size}" height="{size}" rx="2" fill="{color}"/>'
        for i in range(rows) for j in range(columns)
    )


def write_figure(name, alt, body, caption):
    FIGURES.mkdir(parents=True, exist_ok=True)
    markup = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 380 152" role="img" aria-labelledby="title">'
        f'<title id="title">{escape(alt)}</title><rect width="380" height="152" rx="14" fill="#fff"/>'
        f'{body}</svg>\n'
    )
    (FIGURES / (name+".svg")).write_text(markup, encoding="utf8")
    return dict(src=f"/assets/study/0580/number-types/{name}.svg",alt=alt,caption=p(caption),width=380,height=152)


def figures():
    navy, green = "#2457a8", "#087568"
    number_line = line(27,68,353,68)
    for i,n in enumerate(range(-3,4)):
        x=55+45*i
        number_line+=line(x,60,x,76)+label(x,100,str(n).replace("-", "−"))
    number_line+=label(96,38,"negative")+label(286,38,"positive")
    tree=line(190,40,96,63)+line(190,40,281,63)+line(96,86,49,114)+line(96,86,143,114)
    for x,y,name in [(190,32,"84"),(96,79,"12"),(281,79,"⑦"),(49,133,"③"),(143,133,"4")]:
        tree+=label(x,y,name)
    tree+=label(269,130,"Split 4 next")
    timelines = line(40,55,340,55)+line(40,101,340,101)
    for i in range(7):
        x=40+50*i
        timelines+=line(x,39,x,119,"#d9e4f2")+label(x,29,str(i*2))
    for y,positions,color in [(55,[0,2,4,6],navy),(101,[0,3,6],green)]:
        timelines+="".join(dot(40+50*i,y,color) for i in positions)
    timelines+=label(190,140,"First match after zero: 12 s")
    layers = "".join(tiles(3,3,x,42,green,15)+label(x+19,123,f"Layer {i+1}") for i,x in enumerate((52,164,277)))
    return {
        "number-line": write_figure("number-line","Number line from negative three to positive three",number_line,"The whole-number ticks are integers. Counting numbers start at 1."),
        "factor-arrays": write_figure("factor-arrays","Two arrays of twelve objects. One has two rows of six and the other has three rows of four.",
            tiles(2,6,46,33,navy)+tiles(3,4,238,33,green)+label(96,122,"2 rows of 6")+label(263,122,"3 rows of 4"),"Each array contains twelve objects. Each arrangement gives a different pair of factors."),
        "prime-tree": write_figure("prime-tree","84 splits into 12 and 7. The branch 12 splits into 3 and 4.",tree,"The tips 3 and 7 are prime. Split 4 into two more prime tips."),
        "timelines": write_figure("timelines","Two timelines with markers every four and six seconds. Their first common positive marker is twelve seconds.",timelines,"The two repeating events next meet 12 seconds after they start."),
        "square-tiles": write_figure("square-tiles","Four rows and four columns of square tiles.",tiles(4,4,150,20,navy,18)+label(191,138,"4 rows of 4"),"There are sixteen tiles. The side is four tiles long."),
        "cube-layers": write_figure("cube-layers","Three layers, each divided into three rows and three columns.",layers,"Stack the three layers. Each contains nine little cubes, so the total is twenty-seven."),
    }


def table(head, rows):
    headings = "".join(f'<th scope="col">{cell}</th>' for cell in head)
    body = "".join("<tr>"+"".join(f"<td>{cell}</td>" for cell in row)+"</tr>" for row in rows)
    return f'<div class="table-scroll"><table><thead><tr>{headings}</tr></thead><tbody>{body}</tbody></table></div>'


def check(identity, q):
    return dict(kind="check", id=identity,prompt=q["prompt"],field=q["field"], hint=q["hint"],
        solution="".join(q["steps"]), **({"retry":q["retry"]} if q["retry"] else {}))


def question_text(q):
    field=q["field"]
    return q["prompt"]+(p(" &nbsp; ".join(f"{key}. {value}" for key,value in field["options"].items())) if "options" in field else "")


def answer(q):
    f=q["field"]
    v=f["expected"]
    if f["type"]=="choice":
        return f["options"][v]
    if f["type"]=="set":
        return m(r"\{"+v[1:-1]+r"\}")
    n=Fraction(v)
    return m(fraction(n.numerator,n.denominator))


def rotate_choices(q):
    field = q["field"]
    if field["type"] != "choice":
        return q
    options = field["options"]
    letters = list(options)
    rotated = dict(zip(letters, [options[k] for k in letters[1:] + letters[:1]]))
    expected = letters[(letters.index(field["expected"]) - 1) % len(letters)]
    return dict(q, field=dict(field, options=rotated, expected=expected))


def short(identity, family, key, q, variant):
    result=p(answer(q))
    return dict(id=identity,family_uid=family,lesson=key,title=q["title"],collection="variant" if variant else "short",
        prompt_html=q["prompt"],answer_html=result,solution_html="".join(q["steps"]),hint_html=q["hint"],
        marks=1,difficulty=1+int(variant),fields=[q["field"]],
        parts=[dict(label="a",marking_criteria=[dict(code="B1",marks=1,description_html=result)])],verification=identity)


def exam(identity,family,key,title,items,variant,level):
    prompts, answers, solutions, hints, parts = [], [], [], [], []
    show_work = level > 1
    for i,q in enumerate(items):
        letter=chr(97+i)
        result=q.get("exam_answer",answer(q))
        marks=1+int(show_work)
        instruction=p("Show the method you used.") if show_work else ""
        prompts.append(f'<li>{q.get("exam_prompt",question_text(q))}{instruction}<span class="marks">[{marks}]</span></li>')
        answers.append(p(f"({letter}) {result}"))
        solutions.append(f'<section class="solution-part"><h4>({letter})</h4>{"".join(q["steps"])}</section>')
        hints.append(p(f"({letter})")+q["hint"])
        scheme=[dict(code="M1",marks=1,description_html=q["steps"][1])] if show_work else []
        scheme.append(dict(code="A1" if show_work else "B1",marks=1,description_html=p(q.get("exam_marking", result))))
        parts.append(dict(label=letter,marking_criteria=scheme))
    return dict(id=identity,family_uid=family,lesson=key,title=title,collection="exam",
        prompt_html='<ol class="parts" type="a">'+"".join(prompts)+"</ol>",answer_html="".join(answers),
        solution_html="".join(solutions),hint_html="".join(hints),marks=len(items)*(1+int(show_work)),
        difficulty=level,fields=[],parts=parts,verification=identity,variant_index=variant)


def build():
    diagrams=figures()
    lessons, questions, study = [], [], {}
    for key,title,summary,methods in LESSONS:
        id="igcse-0580-number-"+key
        sections,examples,extras=[],[],[]
        for j,(anchor,heading,intro,idea,mistake,factory,figure) in enumerate(methods):
            first=len(examples)
            second=words_to_digits(j+3) if figure=="place-table" else factory(j+3)
            if figure=="words-table":
                second=factory(j+4)
            for sample in (factory(j),second):
                prompt = sample["exam_prompt"] if figure=="words-table" else question_text(sample)
                examples.append(dict(title=sample["title"],question=prompt,solution=sample["steps"]))
            blocks=[dict(kind="key",html=p(idea),**({"figure":diagrams[figure]} if figure in diagrams else {}))]
            if figure=="place-table":
                blocks.append(dict(kind="tip",html=table(["Millions","Thousands","Ones"],[["3","027","418"]])+p(
                    "Read this as three million, twenty-seven thousand, four hundred and eighteen.")))
            if figure=="words-table":
                blocks.append(dict(kind="tip",html=table(["Billions","Millions","Thousands","Ones"],[["5","000","032","009"]])+p(
                    "Read this as five billion, thirty-two thousand and nine. The millions group still takes three digits.")))
            if figure=="prime-table":
                blocks.append(dict(kind="tip",html=table(["Number","Prime factors"],[
                    ["66",m(r"2\times3\times11")],["110",m(r"2\times5\times11")],
                    ["Shared",m(r"2\times11")]])+p("Only the prime copies in both rows contribute to the HCF.")))
            blocks.extend([dict(kind="example",index=first),check(f"{id}-{anchor}-a",factory(j+7)),
                dict(kind="mistake",html=p(mistake)),dict(kind="example",index=first+1,tryFirst=True),
                check(f"{id}-{anchor}-b",factory(j+10))])
            sections.append(dict(id=anchor,title=heading,label=anchor.replace("-"," ").capitalize(),minutes=6,
                level="core",intro=p(intro),blocks=blocks))
            for k in range(2):
                extra_factory=words_to_digits if figure=="place-table" and k==1 else factory
                extras.append(check(f"{id}-{anchor}-extra-{k+1}",extra_factory(14+j*2+k)))
        revision_body = "".join(f"<h2>{heading}</h2>"+p(idea)+p("Check: "+mistake) for _a,heading,_i,idea,mistake,_f,_d in methods)
        figure = next((diagrams[row[-1]] for row in methods if row[-1] in diagrams), None)
        if figure:
            revision_body+=f'<p><img width="290" src="{figure["src"]}" alt="{escape(figure["alt"],quote=True)}"></p>'
        revision_items = [heading for _a,heading,*_rest in methods]
        if key=="classify":
            revision_items[-1] = f"Write {m(r'7\,006\,000\,012')} in words. Answer: seven billion, six million and twelve."
        revision_checks = "<ul>"+"".join(f"<li>{item}</li>" for item in revision_items)+"</ul>"
        study[id]=dict(updatedOn=DATE,description=summary,sections=sections,examples=examples,extraPractice=extras,
            glossary=[dict(term=section["label"],definition=p(row[3])) for section,row in zip(sections,methods)],
            revision=dict(body=revision_body,checks=revision_checks,examTip=p(methods[-1][4])))
        if lessons:
            prev=lessons[-1]
            study[id]["related"]=[dict(title=prev["title"], href=f"/courses/{COURSE}/topics/{prev['id']}")]
        lessons.append(dict(key=key,id=id,title=title,summary=summary,objective=summary,
            before=p("Read one worked example. Cover the next step, try it, then compare your method."),
            ideas="".join(p(row[3]) for row in methods),method="".join(f"<h4>{row[1]}</h4>"+p(row[2]) for row in methods),
            mistakes=[row[4] for row in methods],examples=[
                dict(title=e["title"],question=e["question"],solution="".join(e["solution"]),verification=f"{id}-worked-{i+1}")
                for i,e in enumerate(examples[::2])]))
        factories=[row[5] for row in methods]
        for j,(index,seed) in enumerate([(0,6),(1,7),(2,8),(0,14),(2,16)]):
            family=f"{id}-P{j+1}"
            questions.extend([
                short(f"{family}-0", family, key, factories[index](seed), False),
                short(f"{family}-1", family, key, rotate_choices(factories[index](seed + 1)), True),
            ])
        for j,indices in enumerate([(0,1),(1,2),(2,0),(0,2),(2,1)]):
            family=f"{id}-E{j+1}"
            level=1+min(j,3)
            name=["First exam questions","Show your method","Work through two skills","Find both answers","Mixed questions"][j]
            for k in range(4):
                items=[factories[mi](22+4*j+k+3*part) for part,mi in enumerate(indices)]
                questions.append(exam(f"{family}-{k}",family,key,f"{name}: {title.lower()}",items,k,level))
        if key=="classify":
            written_family = f"{id}-E6"
            for i in range(4):
                questions.append(exam(f"{written_family}-{i}", written_family, key, "Read and write large whole numbers",
                    [digits_to_words(30 + i), words_to_digits(23 + i)], i, 1))
    manifest=dict(schema_version=1,key="0580-number-types",version="1.1.0",
        course=dict(slug=COURSE,title="Cambridge IGCSE Mathematics (0580)",code="0580",direction="igcse"),
        chapter=dict(id="igcse_0580_number_types",slug="types-of-number",title="Types of number",position=0),
        source=dict(sha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),supplied=0,held=[]),
        lessons=lessons,questions=questions,marking_status="DRAFT")
    content=ROOT/"content/original/0580"
    content.mkdir(parents=True,exist_ok=True)
    for filename,data in [("number-types-v1.json",manifest),("number-types-study.json",study)]:
        (content/filename).write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
    print(f"{len(lessons)} lessons, {len(questions)} bank problems, {len(diagrams)} diagrams")


if __name__=="__main__":
    build()
