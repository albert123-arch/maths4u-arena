"""Generate independent C/E2.7 Sequences lessons and question families."""

from fractions import Fraction
from hashlib import sha256
from html import escape
import json
from math import factorial
from pathlib import Path


ROOT=Path(__file__).resolve().parents[2]
COURSE="maths4u-0580"
PREFIX="igcse-0580-sequences-"
DATE="2026-11-22"


def p(text):
    return f"<p>{text}</p>"


def m(tex):
    return r"\("+escape(str(tex),quote=False)+r"\)"


def fraction(value):
    number=Fraction(value)
    if number.denominator==1:
        return str(number.numerator)
    sign="-" if number<0 else ""
    return sign+fr"\frac{{{abs(number.numerator)}}}{{{number.denominator}}}"


def row(values):
    return m(r",\;".join(fraction(value) for value in values))


def polynomial(coefficients):
    terms=[]
    for power,value in sorted(coefficients.items(),reverse=True):
        if not value:
            continue
        sign="-" if value<0 else "+"
        symbol="" if power==0 else "n" if power==1 else f"n^{power}"
        magnitude="" if abs(value)==1 and symbol else str(abs(value))
        terms.append(sign+magnitude+symbol)
    return "".join(terms).lstrip("+") or "0"


def evaluate(coefficients,n):
    return sum(value*n**power for power,value in coefficients.items())


def numbered_position(seed, start=8):
    return start+seed%15


def differences(terms):
    return [b-a for a,b in zip(terms,terms[1:])]


def task(title,prompt,label,value,steps,criterion,hint,wrong=(),*,kind="number",answer=None,options=None,write=None):
    field=dict(key="answer",label=label,type=kind,expected=value if isinstance(value,list) else str(value))
    if kind in ("ratio","polynomial"):
        field["variables"]=["n"]
    if options:
        field["options"]=options
    retries={str(candidate):p(message) for candidate,message in wrong if candidate!=value}
    return dict(title=title,prompt=p(prompt),field=field,answer=answer or m(fraction(value)),solution=[p(line) for line in steps],criterion=p(criterion),
        hint=p(hint),retry=[dict(answer=entered,feedback=feedback) for entered,feedback in retries.items()],write=p(write) if write else None)


def number(title,prompt,value,steps,criterion,hint,wrong=(),label="Term value"):
    return task(title,prompt,label,value,steps,criterion,hint,wrong)


def formula(title,prompt,coeffs,steps,criterion,hint,wrong=()):
    return task(title,prompt,"Expression in n",polynomial(coeffs),steps,criterion,hint,[(polynomial(c),message) for c,message in wrong],
                kind="polynomial",answer=m(polynomial(coeffs)))


def choice(seed,title,prompt,correct,distractors,steps,criterion,hint,write=None):
    keys="ABCD"
    k=seed%4
    ordered=keys[k:]+keys[:k]
    result={ordered[0]:correct}
    wrong=[]
    for letter,(option,feedback) in zip(ordered[1:],distractors):
        result[letter]=option
        wrong.append((letter,feedback))
    assert len(set(result.values()))==4
    return task(title,prompt,"Choose one answer",ordered[0],steps,criterion,hint,wrong,kind="choice",answer=correct,options=dict(sorted(result.items())),write=write)


def linear(seed):
    d=2+seed%9
    if seed%3==0:
        d=-d
    c=3+seed%23
    if seed%4==0:
        c=-c
    return d,c


def linear_terms(seed):
    d,c=linear(seed)
    return [d*n+c for n in range(1,5)]


def continue_linear(seed):
    d,c=linear(seed)
    terms=linear_terms(seed)
    result=terms[-1]+d
    return number("Continue a constant-step sequence",f"These terms have a constant difference. Write the next term in {row(terms)}.",result,
        [f"Subtract one term from the term that follows it. Each change is {m(d)}.", f"Add that signed change to {m(terms[-1])} to get {m(result)}."],
        "Use the same signed difference again from the last term.","Find the change by subtracting the earlier term from the later term.",
        [(terms[-1]-d,"That goes one step back. Apply the change in the forward direction."), (terms[-1]+abs(d),"When the sequence decreases, the step is negative.")])


def alternating_steps(seed):
    start=10+seed%31
    up=3+seed%9
    down=1+seed%5
    terms=[start,start+up,start+up-down,start+2*up-down]
    result=terms[-1]-down
    return number("Continue an alternating rule",
        f"The sequence starts {row(terms)}. The rule alternates between adding {up} and subtracting {down}, beginning with addition. Write the next term.",result,
        [f"The last step shown adds {up}. The next step subtracts {down}.", f"The next term is {m(f'{terms[-1]}-{down}={result}')}."] ,
        "Identify which step of the alternating rule comes next and apply it.","Look at the action between the last two terms, then swap to the other action.",
        [(terms[-1]+up,"Addition has just been used. The next action is subtraction."),(terms[-1]+down,"Use subtraction for the next step.")])


def changing_steps(seed):
    start=3+seed%19
    first_step=2+seed%7
    rise=1+seed%3
    terms=[start]
    for k in range(3):
        terms.append(terms[-1]+first_step+rise*k)
    step=first_step+3*rise
    answer=terms[-1]+step
    return number("Continue a pattern of changing gaps",
        f"The sequence starts {row(terms)}. Its positive gaps form a linear sequence. Find the next term.",answer,
        [f"The first three gaps are {row(differences(terms))}. They go up by {rise} each time, so the next gap is {step}.",
         f"Add it to the last term, {m(terms[-1])}, to get {m(answer)}."],
        "Continue the sequence of gaps and apply the next gap to the final term.","Write the row of gaps before trying to find the next term.",
        [(step,"That is the next gap. Add it to the last term to find the next value."), (terms[-1]+differences(terms)[-1],"The gaps increase. Extend the gap sequence by one place first.")])


def two_previous(seed):
    terms=[2+seed%13,4+seed%11]
    for _ in range(3):
        terms.append(terms[-1]+terms[-2])
    result=terms[-1]+terms[-2]
    return number("Use the two preceding terms",
        f"The sequence begins {row(terms)}. Each term after the second is the sum of the preceding two. Find the next term.",result,
        [f"Use the final two terms shown, {m(terms[-2])} and {m(terms[-1])}.",f"Their sum is {m(result)}."],
        "Add the last two listed values to apply the given rule.","The rule uses two terms each time. Use the two immediately before the gap.",
        [(2*terms[-1],"Use the last term and the one before it."),(terms[-1]+terms[0],"Only the two immediately preceding terms count.")])


def growing_shape(seed):
    fixed=2+seed%9
    growth=2+seed%6
    at=numbered_position(seed,7)
    terms=[fixed+growth*n for n in range(1,4)]
    result=fixed+growth*at
    return number("Count the fixed and repeated parts of a pattern",
        f"A row of signs has {fixed} end lights altogether. At stage {m('n')} it also has {growth} lights in each of {m('n')} repeated panels. The first three totals are {row(terms)}. How many lights are there at stage {at}?",result,
        [f"The panels give {m(polynomial({1:growth}))} lights at stage {m('n')}. The end lights do not change.",
         f"Use {m(polynomial({1:growth,0:fixed}))}. For stage {at}, the total is {m(result)}."],
        "Multiply the number of panels by the number of lights per panel and add the fixed end lights once.","Separate the lights that are always present from the lights in the repeated panels.",
        [(growth*at,"The panels are correct. Add the fixed end lights once."),(terms[0]*at,"Only the panels repeat. The end lights from stage one should not be repeated.")],label="Total lights")


def paired_stage(seed):
    start=7+seed%27
    step=2+seed%7
    extra=3+seed%8
    first=[start+i*step for i in range(3)]
    second=[2*v+extra for v in first]
    result=2*(start+3*step)+extra
    return number("Use a relationship between two patterns",
        f"Two strips grow in stages. Strip A has {row(first)} tiles at stages 1 to 3 and grows by {step} tiles each stage. At the same stage, strip B has twice as many tiles as A, plus {extra}. Find the number of tiles in strip B at stage 4.",result,
        [f"Strip A has {m(first[-1]+step)} tiles at stage 4.",f"Double that stage's value and add {extra}. Strip B has {m(result)} tiles."],
        "Find the stage-4 number for A and apply the relationship between values at the same stage.","Compare the two strips at stage 4. Find A's value for that stage first.",
        [(second[-1],"That uses A's stage-3 value. Extend strip A to stage 4 first."),(2*(first[-1]+step),"Double the value and include the extra tiles.")],label="Number of tiles")


def find_linear(seed):
    d,c=linear(seed)
    terms=linear_terms(seed)
    eq=polynomial({1:d,0:c})
    return formula("Find the rule for any position",f"Find the {m('n')}-th term of the linear sequence {row(terms)}. Give an expression in {m('n')}.",{1:d,0:c},
        [f"The difference is {m(d)}. Start with {m(polynomial({1:d}))}.",f"When {m('n=1')}, the formula must give {m(terms[0])}. The adjustment is {m(c)}, so the rule is {m(eq)}."],
        "Find the common difference and use the first term to determine the constant adjustment.","The common difference gives the coefficient of the position. Check the expression at position 1.",
        [({1:d,0:terms[0]},"The first term is the value when n = 1. The constant is the amount needed after the n-term has already contributed.")])


def evaluate_linear(seed):
    d,c=linear(seed)
    at=numbered_position(seed,9)
    result=d*at+c
    return number("Use a formula to jump to a later position",f"Sequence {m('A')} has {m(fr'A_n={polynomial({1:d,0:c})}')}. Find {m(fr'A_{{{at}}}')}.",result,
        [f"The subscript tells you which position to use. Substitute {m(f'n={at}')}.",f"The result is {m(result)}."],
        "Substitute the stated position in the whole formula.","The subscript is the position, not a multiplier for the whole formula.",
        [(d*(at-1)+c,"The first term uses n = 1. Substitute the stated position directly."),(d*at,"Include the constant adjustment in the formula.")])


def locate_linear(seed):
    d,c=linear(seed)
    pos=numbered_position(seed,6)
    value=d*pos+c
    expression=polynomial({1:d,0:c})
    return number("Find the position of a given term",f"A sequence has {m(fr'T_n={expression}')}. At which position does the term {m(value)} occur?",pos,
        [f"Set the term formula equal to {m(value)}. Solve {m(f'{expression}={value}')}.",f"After removing the constant, divide by the common difference to get {m(f'n={pos}')}."],
        "Set the expression equal to the given term and solve for the position.","This time the value is known. Use it as the other side of an equation for n.",
        [(value,"That is the term value. The question asks for the position in the sequence."),(pos-1,"Positions start at 1. Your answer is one step too early.")],label="Position number")


def missing_linear(seed):
    d,c=linear(seed)
    pos=numbered_position(seed,6)
    before=d*pos+c
    after=d*(pos+1)+c
    target=before+(1 if d>0 else -1)
    expression=polynomial({1:d,0:c})
    return choice(seed,"Check whether a value belongs to a sequence",
        f"A sequence has {m(fr'T_n={expression}')}. Explain whether {m(target)} is a term. Which statement is correct?",
        f"No. It is strictly between the values at positions {pos} and {pos+1}.",
        [(f"Yes. The term is at position {pos}.",f"At that position the value is {before}."),
         (f"Yes. The term is at position {pos+1}.",f"At that position the value is {after}."),
         ("Yes. Every number between two terms is in the sequence.","Only positive whole-number positions are used.")],
        [f"Solving {m(f'{expression}={target}')} gives {m('n='+fraction(Fraction(target-c,d)))}.","This is between two whole-number positions. The value is not a term."],
        "Solve for the position and explain that it is not a positive integer.","A position number in this sequence must be a positive integer.",
        write=f"A sequence has {m(fr'T_n={expression}')}. Explain whether {m(target)} appears in it.")


def simple_power_coeffs(seed,degree):
    return {degree:2+seed%4,0:3+seed%17}


def simple_polynomial(seed,degree):
    coeffs=simple_power_coeffs(seed,degree)
    a,b=coeffs[degree],coeffs[0]
    terms=[evaluate(coeffs,n) for n in range(1,5)]
    name="quadratic" if degree==2 else "cubic"
    known="squares" if degree==2 else "cubes"
    powers=[n**degree for n in range(1,5)]
    step=terms
    for _ in range(degree):
        step=differences(step)
    difference=step[0]
    return formula(f"Compare a simple {name} sequence with {known}",
        f"The sequence {row(terms)} is obtained by scaling the {known} and then adding a fixed number. Find its {m('n')}-th term.",coeffs,
        [f"The {known} at the same positions are {row(powers)}. The {['','','second','third'][degree]} difference is {m(difference)}, so the scale is {m(fraction(Fraction(difference,factorial(degree))))}.",
         f"Subtract the scaled {known} from the given values. The leftover is always {m(b)}. The rule is {m(polynomial(coeffs))}."],
        f"Use the scale factor of the {known} and the same fixed adjustment for each position.",
        f"Compare with the first few {known} at the same position numbers. Check both scale and shift.",
        [({degree:a},f"The scale is correct. Find the constant difference after comparing the scaled {known}."),
         ({degree:1,0:b},f"Apply the scale as well as the shift. Compare the differences of the two sequences.")])


def core_quadratic(seed):
    return simple_polynomial(seed,2)


def core_cubic(seed):
    return simple_polynomial(seed,3)


def shifted_power(seed):
    degree=2+seed%2
    shift=2+seed%5
    pos=6+seed%17
    known="square" if degree==2 else "cube"
    start=[(n+shift)**degree for n in range(1,5)]
    result=(pos+shift)**degree
    return number("Use a shifted power sequence",f"The first terms are {row(start)}. The rule uses consecutive {known} numbers. Find the term at position {pos}.",result,
        [f"The first term is {m(fr'{shift+1}^{degree}')}. The base is always the position plus {shift}.",
         f"At position {pos} use {m(fr'({pos}+{shift})^{degree}={result}')}."] ,
        "Identify the shift in the base of the power and substitute the requested position.","Find the base of the first power and remember that the first position is 1.",
        [(pos**degree,"These powers start later than the ordinary square or cube sequence. Add the shift to the position first."),
         (pos**degree+shift,"Add the shift to the base before raising it to the power.")])


def power_value(seed):
    degree=2+seed%2
    coeffs=simple_power_coeffs(seed,degree)
    at=numbered_position(seed,6)
    value=evaluate(coeffs,at)
    expression=polynomial(coeffs)
    return number("Evaluate a quadratic or cubic rule",f"A sequence has {m(fr'T_n={expression}')}. Find {m(fr'T_{{{at}}}') }.",value,
        [f"Use {m(f'n={at}')} in the formula. Raise the position to the power first, then apply the scale and adjustment.",f"The value is {m(value)}."],
        "Substitute the required position and evaluate the power before multiplying.","Square or cube the position before multiplying by the coefficient.",
        [((coeffs[degree]*at)**degree+coeffs[0],"The coefficient is outside the power. Raise the position alone to the power.")])


def rich_coeffs(seed,degree):
    result={degree:2+seed%4,1:seed%7-4,0:4+seed%13}
    if degree==3:
        result[2]=1+seed%5
    elif not result[1]:
        result[1]=3
    return result


def richer_formula(seed,degree):
    coeffs=rich_coeffs(seed,degree)
    a=coeffs[degree]
    terms=[evaluate(coeffs,n) for n in range(1,degree+3)]
    levels=[terms]
    for _ in range(degree):
        levels.append(differences(levels[-1]))
    name="quadratic" if degree==2 else "cubic"
    suffix="second" if degree==2 else "third"
    remainder={p:v for p,v in coeffs.items() if p!=degree}
    residual=[evaluate(remainder,n) for n in range(1,degree+3)]
    middle=(f"The remaining linear rule has difference {m(remainder.get(1,0))}. Fit its constant using position 1." if degree==2 else
        f"The residual second difference is {m(2*remainder[2])}. It gives coefficient {m(remainder[2])} of {m('n^2')}. Remove that part and fit the remaining linear rule.")
    return formula(f"Separate the leading power in a {name} sequence",
        f"The sequence {row(terms)} follows a {name} rule. Find its {m('n')}-th term.",coeffs,
        [f"The first differences are {row(levels[1])}. The {suffix} differences are {row(levels[-1])}. Divide the constant difference by {factorial(degree)} to get {m(a)}.",
         f"Subtract {m(polynomial({degree:a}))} at the same positions. The remaining values are {row(residual)}.", middle,
         f"Add back the leading power. The full rule is {m(polynomial(coeffs))}."],
        f"Use the {suffix} differences to find the leading coefficient, then find the remaining expression from residual terms.",
        "Find the highest constant difference first. Subtract the corresponding scaled powers, then identify the simpler sequence that remains.",
        [({degree:a},"The leading power is correct. The difference between these terms and the question's terms is still a sequence."),
         (remainder,"This describes the remaining terms after subtraction. Add back the leading power.")])


def extended_quadratic(seed):
    return richer_formula(seed,2)


def extended_cubic(seed):
    return richer_formula(seed,3)


def highest_difference(seed):
    degree=2+seed%2
    factor=2+seed%13
    constant=factor*factorial(degree)
    suffix="second" if degree==2 else "third"
    name="quadratic" if degree==2 else "cubic"
    return number("Read the leading coefficient from differences",
        f"A {name} sequence has constant {suffix} difference {m(constant)}. Find the coefficient of {m(f'n^{degree}')} in its {m('n')}-th term.",factor,
        [f"The {suffix} difference of {m(f'n^{degree}')} is {m(factorial(degree))}. To find the scale, divide {m(constant)} by {m(factorial(degree))}.",
         f"The coefficient is {m(factor)}."],
        f"Divide the constant {suffix} difference by {factorial(degree)}.",
        f"One copy of {name} powers produces a constant {suffix} difference of {factorial(degree)}.",
        [(constant,"The difference is the leading coefficient times the constant difference of the basic powers.")],label="Leading coefficient")


def use_rich_rule(seed):
    degree=2+seed%2
    coeffs=rich_coeffs(seed,degree)
    at=numbered_position(seed,8)
    value=evaluate(coeffs,at)
    without_linear=value-coeffs[1]*at
    return number("Use every part of a higher-degree rule",
        f"A sequence has {m(fr'T_n={polynomial(coeffs)}')}. Find {m(fr'T_{{{at}}}')}.",value,
        [f"Use {m(f'n={at}')} in every term, including any lower-power terms.",
         f"Find each power and then combine the products and constant. The value is {m(value)}."],
        "Substitute the position in all the powers and collect the numerical values.","The formula includes more than the highest power. Evaluate each part separately.",
        [(without_linear,"Keep the linear part of the formula as well as the powers and constant.")])


def exponential(seed):
    return 5+seed%19,2+seed%4


def exponential_rule(seed):
    a,r=exponential(seed)
    terms=[a*r**i for i in range(4)]
    expected=m(fr'{a}\times {r}^{{n-1}}')
    statement=f"The sequence {row(terms)} has a constant multiplier."
    return choice(seed,"Find the rule for a constant multiplier",statement+f" Which expression gives its {m('n')}-th term?",expected,
        [(m(fr'{a}\times {r}^n'),"At the first position the multiplier has not yet been used. The exponent should be zero there."),
         (m(fr'{a}+{r}(n-1)'),"Adding a fixed amount creates a linear sequence. Here the same multiplier is used."),
         (m(fr'{r}\times {a}^{{n-1}}'),"The first term and the multiplier are different. Identify them from the values at positions 1 and 2.")],
        [f"Divide the second value by the first. The multiplier is {m(r)}, and the first term is {m(a)}.",
         f"There are {m('n-1')} multiplications from the first term to term {m('n')}. The rule is {expected}."],
        "Find the constant ratio and combine it with the first term and the correct exponent.","Check your formula at n = 1 and n = 2.",
        write=statement+f" Find an expression in {m('n')} for the term at position {m('n')}.")


def exponential_value(seed):
    a,r=exponential(seed)
    pos=4+seed%6
    value=a*r**(pos-1)
    expr=fr'{a}\times {r}^{{n-1}}'
    return number("Use the multiplier the correct number of times",
        f"A sequence has {m(fr'T_n={expr}')}. Find {m(fr'T_{{{pos}}}')}.",value,
        [f"At position {pos}, there have been {pos-1} multiplications from the first term.",
         f"The value is {m(fr'{a}\times {r}^{{{pos-1}}}={value}')}."] ,
        "Replace the position in the exponent and evaluate the power before multiplying by the first term.","From position 1 to position n there are n − 1 steps.",
        [(a*r**pos,"This uses one multiplication too many. The exponent is the position minus one."),(a+(pos-1)*r,"Use repeated multiplication by the ratio, rather than repeated addition.")])


def reverse_exponential(seed):
    a,r=exponential(seed)
    pos=4+seed%5
    value=a*r**(pos-1)
    expression=fr'{a}\times {r}^{{n-1}}'
    return number("Find a position in an exponential sequence",
        f"A sequence has {m(fr'T_n={expression}')}. At which position does the term {m(value)} occur?",pos,
        [f"Divide {m(value)} by the first term {m(a)}. The factor is {m(r**(pos-1))}, which equals {m(fr'{r}^{pos-1}')}.",
         f"The exponent is {pos-1}, so {m(f'n-1={pos-1}')} and the position is {m(pos)}."],
        "Divide by the first term, find the exponent of the common multiplier and add one.","Find how many times the multiplier has been used and include the starting position.",
        [(pos-1,"You found the number of multiplications. Add 1 to get the position."),(value,"That is the term value. The answer is its position.")],label="Position number")


def missing_exponential(seed):
    a,r=exponential(seed)
    terms=[a*r**i for i in range(5)]
    target=terms[2]
    display=m(fr'{terms[0]},\;{terms[1]},\;\square,\;{terms[3]},\;{terms[4]}')
    return number("Fill the gap in a constant-ratio sequence",
        f"The terms {display} are consecutive in an exponential sequence. Find the missing term.",target,
        [f"The first two values give the multiplier {m(r)}. Apply it once to {m(terms[1])}.",f"The missing value is {m(target)}. Multiplying this by {m(r)} gives the fourth term."],
        "Find the constant ratio and multiply the term before the gap by it.","Find the factor that takes the first term to the second.",
        [(terms[1]+terms[1]-terms[0],"This sequence multiplies by the same factor. The differences between terms change."),(terms[3],"You gave the term after the gap. Apply the multiplier once from the second term.")])


def halve_exponential(seed):
    first=(5+seed%10)*32
    n=7+seed%4
    value=Fraction(first,2**(n-1))
    terms=[first//2**k for k in range(4)]
    rule=m(fr'{first}\left(\frac12\right)^{{n-1}}')
    return number("Find a term when the multiplier is below one",
        f"The sequence starts {row(terms)} and always uses the same multiplier. Find the exact term value at position {n}.",value,
        [f"Each term is half of the term before it. The nth-term rule is {rule}.",f"At position {n}, halve the first term {n-1} times. The value is {m(fraction(value))}."],
        "Identify the factor of one half and apply it the required number of times.","When every term is half the previous term, the multiplier is one half and the terms get smaller.",
        [(value/2,"This uses one extra halving. Count the steps from position 1."),(value*2,"This stops one step too early. Use n − 1 halving steps.")])


def add_sequences(seed):
    a,b=linear(seed)
    rich=rich_coeffs(seed,2)
    combined={2:rich[2],1:a+rich[1],0:b+rich[0]}
    definitions=m(fr'A_n={polynomial({1:a,0:b})},\quad B_n={polynomial(rich)}')
    return formula("Add expressions at matching positions",
        f"Two sequences have {definitions}. A new sequence has {m('C_n=A_n+B_n')}. Find a simplified expression for {m('C_n')}.",combined,
        [f"Add the two expressions that both use position {m('n')}.",f"Collect like powers of {m('n')}. The new rule is {m(polynomial(combined))}."],
        "Add the formulas at a common index and collect like powers.","Keep the same n in both expressions. Combine like terms after adding.",
        [({2:-rich[2],1:a-rich[1],0:b-rich[0]},"The question asks for a sum. Add the terms from both rules."),
         (rich,"You used only B. Include the expression for A at the same position.")])


def combine_values(seed):
    initial,rate=exponential(seed)
    d=1+seed%7
    c=3+seed%13
    pos=4+seed%6
    exp=initial*rate**(pos-1)
    lin=d*pos+c
    result=exp-2*lin
    return number("Combine a linear and an exponential term",
        f"Let {m(fr'A_n={initial}\times {rate}^{{n-1}}')} and {m(fr'B_n={polynomial({1:d,0:c})}')}. If {m('C_n=A_n-2B_n')}, find {m(fr'C_{{{pos}}}')}.",result,
        [f"At position {pos}, the values are {m(fr'A_{{{pos}}}={exp}')} and {m(fr'B_{{{pos}}}={lin}')}.",
         f"Subtract twice the value of B from the value of A. This gives {m(result)}."],
        "Use the same requested index in each formula, then apply the specified combination.","Work out the two term values at the stated position before combining them.",
        [(exp-lin,"The second term is multiplied by 2 before subtraction."),(exp+2*lin,"The combination asks for subtraction after doubling B.")])


def fraction_sequence(seed):
    d=2+seed%7
    c=4+seed%13
    add=3+seed%9
    numerator=polynomial({1:d,0:c})
    denominator=polynomial({2:1,0:add})
    data=[(d*n+c,n*n+add) for n in range(1,5)]
    terms=m(r",\;".join(fr"\frac{{{n}}}{{{den}}}" for n,den in data))
    value=m(fr'\frac{{{numerator}}}{{{denominator}}}')
    return task("Find a rule for a sequence of fractions",
        f"The first four terms are {terms}. The numerators form a linear sequence. The denominators are shifted square numbers. Find the {m('n')}-th term as a single fraction.",
        "Single fraction in n",[numerator,denominator],
        [f"The numerators {row([n for n,_ in data])} have rule {m(numerator)}.",
         f"The denominators {row([den for _,den in data])} have rule {m(denominator)}. Put the two rules together to get {value}."],
        "Find the rule for the complete numerators and for the complete denominators, then put them over one fraction bar.",
        "Read the top and bottom of each term as separate sequences. Use the given fractions as written.",
        [(f"({denominator})/({numerator})","The two patterns are correct, but the numerator and denominator are reversed."),
         (f"({numerator})/(n^2)","The denominators are shifted square numbers. Compare the actual denominators with the square numbers.")],kind="ratio",answer=value)


def shift_index(seed):
    coeffs={2:2+seed%4,0:3+seed%18}
    n=numbered_position(seed,5)
    offset=1+seed%3
    result=evaluate(coeffs,n+offset)
    return number("Track a change of index between two sequences",
        f"A sequence has {m(fr'A_n={polynomial(coeffs)}')}. A second sequence has {m(fr'B_n=A_{{n+{offset}}}')}. Find {m(fr'B_{{{n}}}')}.",result,
        [f"In B, use the position {n} first. This points to position {n+offset} in A.",f"Evaluate A at that position to get {m(result)}."],
        "Add the index offset to the requested position and evaluate the original rule there.","The shift acts on the position before the formula is used.",
        [(evaluate(coeffs,n)+offset,"Adding the offset to the final term is different. First change which position you use."),
         (evaluate(coeffs,n),"The second rule uses a later term of A. Include the index offset.")])


LESSONS = (
    ("patterns", "Recognise and continue patterns", "Count the fixed and repeated parts of diagrams, follow a term-to-term rule and compare two patterns.",
     (("count-the-parts", "How do I count the part that grows?", 8,
       "A drawing can change in one place and stay the same somewhere else. Count those two parts separately.",
       "In the lights diagram each stage adds one panel containing three lights. The two end lights stay in every stage. The first three totals are 5, 8 and 11.",
       "The end lights appear once at every stage. They do not belong inside the part that repeats.", growing_shape,paired_stage),
      ("move-one-place", "What operation takes me to the next term?", 8,
       "A term-to-term rule tells you what to do to one value to get the next. It needs a starting value before you can use it.",
       "For a constant-step pattern, subtract the earlier term from the later one. Keep the sign. For alternating rules, identify which of the two actions comes next.",
       "Subtracting in reverse order changes the sign. An increasing sequence has a positive difference and a decreasing one has a negative difference.", continue_linear,alternating_steps),
      ("track-changing-gaps", "What if the gaps change or I need two terms?", 9,
       "Some patterns have their own rule for the gaps. For other patterns, add the two terms immediately before the gap.",
       "If the gaps increase by the same amount, extend the row of gaps first. If the rule says to add the two previous terms, use their values directly.",
       "A new gap is a change, not the next term. Add it to the last term to reach the next one.", changing_steps,two_previous),
      ("compare-at-the-same-stage", "How can I compare two patterns?", 9,
       "Place the position numbers above the terms before you compare. A relationship between two patterns usually refers to matching positions.",
       "If pattern B has twice as many pieces as A plus three more, find A at the required stage first. Double its count and add three.",
       "The change from one position to the next and the change from one pattern to another are different comparisons.", paired_stage,growing_shape)),
     (("Term", "A value in a sequence."), ("Stage", "A position in a pattern, counted from stage 1."), ("Term-to-term rule", "The action that takes one term to the next.")),
     "Label the stage and separate the fixed pieces from the repeating ones. When a pattern is drawn, check your rule against two stages."),
    ("linear-nth", "Find and use a linear nth term", "Find the common difference and constant, then evaluate a later term or decide whether a value occurs.",
     (("build-the-rule", "How can I write one rule for every position?", 8,
       f"A linear sequence has a constant difference {m('d')}. Its position-to-term formula has the form {m('dn+c')}.",
       f"Find the common difference first. At position 1, {m('dn')} already gives {m('d')}. Use the gap between that value and the actual first term to find {m('c')}.",
       f"The adjustment {m('c')} need not equal the first term. The expression must give the first term when {m('n=1')}.", find_linear,evaluate_linear),
      ("substitute-the-position", "How do I find a term far down the sequence?", 8,
       f"The subscript in {m('T_n')} labels the position. It tells you which number to substitute.",
       f"Use the nth-term rule directly. For example, if {m('T_n=37-4n')}, substitute {m('n=9')} to give {m('T_9=1')}.",
       "A decreasing sequence can go through zero into negative terms. Its position numbers are still positive integers.", evaluate_linear,locate_linear),
      ("solve-for-the-position", "How can I tell whether a value occurs?", 9,
       "Set the formula equal to the stated value and solve for the position. A valid position is a positive whole number.",
       "If solving gives a fractional or non-positive position, explain what this means for the sequence. Substitute a possible position back into the rule to check it.",
       "Rounding a fractional position changes the term value. State that the target does not occur.", locate_linear,missing_linear)),
     (("Common difference", "The signed change between consecutive terms in a linear sequence."), ("Position-to-term rule", "An expression that turns a position number into its term value."), ("Subscript", "The smaller number or letter that identifies a term's position.")),
     "Check your formula at positions 1 and 2. When you solve for the position, check that it is a positive integer."),
    ("simple-powers", "Find simple quadratic and cubic rules", "Match simple quadratic and cubic patterns to squares and cubes and check the resulting formulas.",
     (("recognise-squares", "How can square numbers help me find the rule?", 9,
       f"Write the square numbers {row([1,4,9,16,25])} underneath the given values at positions 1 to 5.",
       f"For a rule of the form {m('an^2+b')}, the second difference equals {m('2a')}. Divide by 2 to find the scale. Subtract the scaled squares to find the same leftover in each position.",
       "The first difference of a quadratic is not constant. Compare the differences between those first differences.", core_quadratic,shifted_power),
      ("recognise-cubes", "How can cube numbers help me find the rule?", 9,
       f"The first cubes are {row([1,8,27,64,125])}. Compare them with the given terms at the same positions.",
       f"For {m('an^3+b')}, the third difference equals {m('6a')}. Subtract the scaled cubes. If the same value remains each time, that value is the constant adjustment.",
       "A large jump is not enough to show a cubic rule. Compare with the cube numbers or check the third differences.", core_cubic,power_value),
      ("check-the-base", "What if the starting power is not the first square or cube?", 8,
       f"A shifted power sequence can start at a later square or cube. The first position still has {m('n=1')}.",
       f"If the first two values are {m('4^2')} and {m('5^2')}, the base at position 1 is 4 and the base at position 2 is 5. The rule is {m('(n+3)^2')}.",
       "Add the position shift before squaring or cubing. Adding outside the power changes every term in a different way.", shifted_power,power_value)),
     (("Square number", "A value made by multiplying a positive whole number by itself."), ("Cube number", "A positive whole number multiplied by itself three times."), ("Constant difference row", "A row of values obtained by taking differences that are all equal.")),
     "Put position numbers above the rows, include the scale and adjustment, then check at least two terms from your proposed formula."),
    ("higher-differences", "Build richer quadratic and cubic rules", "Extended: use second and third differences, then find the lower-power terms from the residual sequence.",
     (("separate-the-quadratic", "How do I find more than the quadratic part?", 9,
       f"For {m('an^2+bn+c')}, the constant second difference is {m('2a')}. It gives only the leading coefficient.",
       f"Remove {m('an^2')} from the given terms at the same positions. Find the remaining linear rule from its difference and first value. Add the two expressions together.",
       "A correct leading term can still give a wrong first term. Work with the full row of residual values.", extended_quadratic,highest_difference),
      ("separate-the-cubic", "How do I handle a cubic rule with several parts?", 10,
       f"For {m('an^3+bn^2+cn+d')}, the constant third difference equals {m('6a')}.",
       f"Subtract {m('an^3')} from the original values. Use the second differences of the remaining row to find the quadratic part. Repeat for the linear part and constant.",
       "Use the residual row to find the next coefficient. The original second differences of a cubic are not constant.", extended_cubic,extended_quadratic),
      ("verify-the-rule", "How do I check the complete rule?", 8,
       "The completed formula has a contribution from each lower power that was found. Substitute the same position into every part.",
       "Check the first term and another term from the list. If your model misses at a later position, trace which part of the residual row was not accounted for.",
       "Finding a rule that works at only one position does not identify the whole sequence.", use_rich_rule,extended_cubic)),
     (("Leading coefficient", "The coefficient of the highest power in a polynomial rule."), ("Residual", "The values left after a selected part of the rule has been removed."), ("Third difference", "The difference between successive second differences.")),
     "Show the constant difference and how you removed the leading power. Use a second check at an original position."),
    ("exponential", "Find and use exponential rules", "Extended: identify a constant multiplier, write the exponential nth term and interpret the exponent as a number of steps.",
     (("find-the-multiplier", "What operation gives the same multiplier?", 8,
       "An exponential sequence multiplies each term by the same factor. Divide one term by the previous one to find the common ratio.",
       "Compare at least two ratios. Equal differences suggest a linear rule. Equal non-zero ratios in a nonconstant sequence suggest repeated multiplication.",
       "When the differences are getting bigger, check the ratios before choosing a model.", missing_exponential,exponential_rule),
      ("build-the-power", "Why does the exponent start at zero?", 9,
       f"There are no steps before the first term. With first term {m('a')} and ratio {m('r')}, write {m('T_n=ar^{n-1}')}.",
       f"Substitute {m('n=1')} to check that the factor is {m('r^0=1')}. Substitute {m('n=2')} to check that the multiplier is used once.",
       f"Using {m('ar^n')} with {m('a')} as the first term applies one multiplication too early.", exponential_rule,exponential_value),
      ("recover-the-position", "How do I find where a power occurs?", 9,
       "Divide the target term by the starting term. Find how many repeated factors the result contains.",
       "The exponent gives the number of steps from position 1. Add one to reach the position number. For the small integer powers here, a list of powers is enough.",
       "The exponent and the position number differ by one when the rule starts at n = 1.", reverse_exponential,exponential_value),
      ("use-a-small-multiplier", "Can the repeated multiplier make the terms smaller?", 8,
       f"A positive multiplier below 1 makes positive terms smaller. Halving uses the multiplier {m(r'\frac12')}.",
       f"In {m(r'a(\frac12)^{n-1}')}, substitute the position before evaluating the power. Multiplying by one half is the same as dividing by two.",
       "Dividing by a half doubles the term. To halve a value, multiply by a half or divide by two.", halve_exponential,exponential_value)),
     (("Common ratio", "The multiplier from one term to the next."), ("Exponential sequence", "A nonconstant sequence made by repeatedly multiplying by a fixed non-zero factor."), ("Exponent", "The power that counts repeated factors.")),
     "Write the first term and multiplier separately. Use positions 1 and 2 as a quick check of the exponent."),
    ("combined-sequences", "Connect and combine sequences", "Extended: combine terms at a common index, track index changes and find the rule for numerators and denominators.",
     (("match-the-indices", "Which values do I combine?", 8,
       f"If {m('C_n=A_n-2B_n')}, use the same position {m('n')} in both component sequences. Then take twice the B term away from the A term.",
       "Work out the two values first when asked for one position. For a polynomial expression, substitute the two formulas and collect like terms.",
       "A multiplier in front of B changes its whole value. It does not change the index or only one term of its formula.", combine_values,add_sequences),
      ("shift-a-position", "What does a change of subscript do?", 8,
       f"The rule {m('B_n=A_{n+2}')} uses a later term of A. Position 1 of B takes position 3 of A.",
       "Work out the new position before using the first sequence's formula. Write both positions explicitly so you can keep track of them.",
       "Adding two to an index and adding two to a term value are different operations.", shift_index,combine_values),
      ("read-two-rows", "How do I find a rule for a sequence of fractions?", 10,
       "Read all the given numerators as one sequence and all the denominators as another. Use the fractions as displayed so that you can see both patterns.",
       "Find a rule for each row at the same position, then put the numerator rule over the denominator rule. Use brackets around any whole expression you type into an answer field.",
       "Reducing each given fraction first can hide the pattern in its original numerator and denominator.", fraction_sequence,add_sequences)),
     (("Index", "A position number used to select a term."), ("Component sequence", "One of the sequences used to build another sequence."), ("Index shift", "A change of position before the old rule is evaluated.")),
     "Set out the component values at the same position in separate rows. Show how you combined them and check any shifted index."),
)


def vector(name,art,alt,caption,height=136):
    svg=(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 380 {height}" role="img" aria-label="{escape(alt,quote=True)}">'
         f'<rect width="380" height="{height}" rx="12" fill="#f8fafc"/>'
         f'<g fill="#173554" font-family="Arial,sans-serif">{art}</g></svg>\n')
    folder=ROOT/"public/assets/study/0580/sequences"
    folder.mkdir(parents=True,exist_ok=True)
    (folder/f"{name}.svg").write_text(svg,encoding="utf-8")
    return dict(src=f"/assets/study/0580/sequences/{name}.svg",alt=alt,caption=p(caption),width=380,height=height)


def label(x,y,words,size=14):
    return f'<text x="{x}" y="{y}" font-size="{size}" text-anchor="middle">{escape(words)}</text>'


def arrow(x1,y1,x2,y2):
    return f'<path d="M{x1} {y1}L{x2} {y2}" fill="none" stroke="#496681" stroke-width="1.6"/>'


def pattern_drawing():
    art=[]
    for stage in range(1,4):
        centre=63+(stage-1)*127
        art.append(label(centre,24,f"Stage {stage}"))
        art.append(f'<circle cx="{centre-8}" cy="43" r="4" fill="#dda532" stroke="#75520c"/><circle cx="{centre+8}" cy="43" r="4" fill="#dda532" stroke="#75520c"/>')
        for panel in range(stage):
            top=52+23*panel
            art.append(f'<rect x="{centre-29}" y="{top}" width="58" height="19" rx="4" fill="#d8eaff" stroke="#56718e"/>')
            for light in (-15,0,15):
                art.append(f'<circle cx="{centre+light}" cy="{top+9}" r="3.1" fill="#2a709d"/>')
    return vector("growing-light-pattern","".join(art),
        "Stages 1, 2 and 3 use one, two and three panels respectively. Each panel has three lights. Each stage has two gold end lights.",
        "The end lights stay fixed, while each new stage adds another three-light panel.")


def step_strip(name,labels,caption):
    art=[]
    for i,wording in enumerate(labels):
        x=10+i*126
        colour=("#d8eaff","#ccece5","#fff0cc")[i]
        art.append(f'<rect x="{x}" y="32" width="108" height="54" rx="7" fill="{colour}" stroke="#56718e"/>')
        for row_index,word in enumerate(wording.split("/")):
            art.append(label(x+54,54+17*row_index,word,13))
        if i<2:
            art.append(f'<path d="M{x+109} 59h16m-6 -4 6 4 -6 4" fill="none" stroke="#496681" stroke-width="1.6"/>')
    return vector(name,"".join(art),". ".join(s.replace("/"," ") for s in labels)+".",caption,118)


def square_drawing():
    art=[]
    for n in range(1,4):
        centre=64+126*(n-1)
        art.append(label(centre,26,f"Position {n}"))
        for r in range(n):
            for c in range(n):
                art.append(f'<rect x="{centre-9*n+c*18}" y="{56+r*18}" width="16" height="16" rx="2" fill="#d8eaff" stroke="#3e688e"/>')
    return vector("square-arrays","".join(art),"At positions 1, 2 and 3 the tiles make square arrays with side lengths 1, 2 and 3.",
        "At every position the side length is the position number. A cubic pattern uses the same number of layers as rows and columns.",126)


def difference_drawing():
    art=[]
    for row_index,count in enumerate((5,4,3,2)):
        y=17+30*row_index
        start=75+22*row_index
        for i in range(count):
            x=start+i*44
            if row_index<3 and i<count-1:
                art.append(arrow(x,y+6,x+22,y+22))
                art.append(arrow(x+44,y+6,x+22,y+22))
            art.append(f'<circle cx="{x}" cy="{y}" r="5" fill="#d8eaff" stroke="#41678e"/>')
        art.append(label(318,y+5,("Terms","1st differences","2nd differences","3rd differences")[row_index],12))
    return vector("difference-layers","".join(art),"The difference rows are formed from adjacent cells in the row above. The third row after the terms is the third differences.",
        "Take later value minus earlier value in each pair. Fill one complete row before starting the next.",129)


def diagrams():
    return (
        pattern_drawing(),
        step_strip("linear-rule",("Find the/common step","Check/position 1","Write the/rule"),"The step fixes the coefficient. The first term fixes the constant."),
        square_drawing(),
        difference_drawing(),
        step_strip("multiplier-steps",("First term/zero moves","Second term/one move","Third term/two moves"),"The position is one higher than the number of multiplications."),
        step_strip("match-positions",("Choose the/position","Find both/term values","Combine in/order"),"Combine values that use the correct index in each sequence."),
    )


def table(label_text,headers,rows):
    heading="".join(f'<th scope="col">{escape(s)}</th>' for s in headers)
    body="".join(f'<tr><th scope="row">{r[0]}</th>'+"".join(f"<td>{s}</td>" for s in r[1:])+"</tr>" for r in rows)
    return f'<table><caption>{escape(label_text)}</caption><thead><tr>{heading}</tr></thead><tbody>{body}</tbody></table>'


TABLES={
    (1,0):table("Adjusting a linear rule",("Position", "1", "2", "3", "4"),(("Target",7,12,17,22),(m('5n'),5,10,15,20),("Gap",2,2,2,2))),
    (2,0):table("Compare with square numbers",("Position","1","2","3","4"),(("Terms",14,26,46,74),(m('4n^2'),4,16,36,64),("Gap",10,10,10,10))),
    (3,0):table("Finding the second difference",("Row","1st value","2nd value","3rd value","4th value"),(("Terms",8,17,32,53),("First differences",9,15,21,""),("Second differences",6,6,"",""))),
    (4,1):table("First term 7 and multiplier 3",("Position","1","2","3","4"),(("Multiplications",0,1,2,3),("Term",7,21,63,189))),
}


def with_choices(q):
    options=q["field"].get("options")
    if options:
        return q["prompt"]+'<ol type="A">'+"".join(f"<li>{v}</li>" for v in options.values())+"</ol>"
    return q["prompt"]


def check(uid,q):
    return dict(kind="check",id=uid,title=q["title"],prompt=q["prompt"],field=q["field"],solution="".join(q["solution"]),hint=q["hint"],retry=q["retry"])


def award(code,html,guidance=None):
    return dict(code=code,marks=1,description_html=html,**({"guidance_html":guidance} if guidance else {}))


def short_task(uid,family,key,q,variant,difficulty):
    return dict(id=uid,family_uid=family,lesson=key,collection="variant" if variant else "short",title=q["title"],marks=1,difficulty=difficulty,
        prompt_html=q["prompt"],answer_html=p(q["answer"]),hint_html=q["hint"],solution_html="".join(q["solution"]),fields=[q["field"]],
        parts=[dict(label="a",marking_criteria=[award("B1",p(q["answer"]))])],verification=uid)


def written_task(uid,family,key,name,questions,variant,difficulty):
    prompts,answers,hints,solutions,parts=[],[],[],[],[]
    for index,q in enumerate(questions):
        part=chr(index+97)
        accept=p("Accept any equivalent expression with the same position numbering.") if q["field"]["type"] in ("polynomial","ratio") or q["title"]=="Find the rule for a constant multiplier" else None
        criteria=[award("M1",q["criterion"]),award("A1",p(q["answer"]),accept)]
        if key=="higher-differences" and q["field"]["type"]=="polynomial":
            criteria=[award("M1",p("Use the highest constant difference to find the leading coefficient.")),
                      award("M1",p("Remove the corresponding leading powers to identify the residual rule.")),criteria[-1]]
        prompts.append(f'<li>{q["write"] or with_choices(q)}<span class="marks">[{len(criteria)}]</span></li>')
        answers.append(p(f"({part}) {q['answer']}"))
        hints.append(p(f"({part})")+q["hint"])
        solutions.append(f"<h4>({part})</h4>"+"".join(q["solution"]))
        parts.append(dict(label=part,marking_criteria=criteria))
    return dict(id=uid,family_uid=family,lesson=key,title=name,collection="exam",variant_index=variant,difficulty=difficulty,
        marks=sum(len(item["marking_criteria"]) for item in parts),prompt_html='<ol class="parts" type="a">'+"".join(prompts)+"</ol>",
        answer_html="".join(answers),solution_html="".join(solutions),hint_html="".join(hints),fields=[],parts=parts,verification=uid)


BANK=(
    ((continue_linear,alternating_steps,growing_shape,paired_stage,changing_steps),
     (("Read and continue two rules",(continue_linear,alternating_steps)),("Count panels and compare strips",(growing_shape,paired_stage)),
      ("Use a pattern in two ways",(continue_linear,growing_shape)),("Extend and compare stages",(alternating_steps,paired_stage,growing_shape)),
      ("Trace three growing patterns",(growing_shape,changing_steps,two_previous)))),
    ((find_linear,evaluate_linear,locate_linear,missing_linear,find_linear),
     (("Find and substitute into a linear rule",(find_linear,evaluate_linear)),("Work from value to position",(locate_linear,missing_linear)),
      ("Read position and value",(evaluate_linear,locate_linear)),("Find the formula and check membership",(find_linear,locate_linear,missing_linear)),
      ("Work with three linear sequences",(find_linear,evaluate_linear,missing_linear)))),
    ((core_quadratic,core_cubic,shifted_power,power_value,core_cubic),
     (("Compare with the basic powers",(core_quadratic,core_cubic)),("Use a shift and find a later term",(shifted_power,power_value)),
      ("Write rules for scaled powers",(core_cubic,core_quadratic)),("Check square and cube models",(shifted_power,core_quadratic,core_cubic)),
      ("Find and use rules with powers",(core_quadratic,power_value,core_cubic)))),
    ((extended_quadratic,extended_cubic,highest_difference,use_rich_rule,extended_quadratic),
     (("Extract a leading coefficient",(highest_difference,extended_quadratic)),("Find the full cubic rule",(extended_cubic,use_rich_rule)),
      ("Subtract the leading power",(extended_quadratic,extended_cubic)),("Work from differences to a full rule",(highest_difference,extended_cubic,extended_quadratic)),
      ("Find and check higher-degree rules",(extended_cubic,use_rich_rule,extended_quadratic)))),
    ((exponential_rule,exponential_value,reverse_exponential,missing_exponential,halve_exponential),
     (("Find a multiplier and a rule",(missing_exponential,exponential_rule)),("Match an exponent to its position",(exponential_value,reverse_exponential)),
      ("Identify and use exponential rules",(exponential_rule,exponential_value)),("Work with gaps and exponent shifts",(missing_exponential,reverse_exponential,exponential_rule)),
      ("Find terms and positions in three sequences",(exponential_rule,halve_exponential,reverse_exponential)))),
    ((add_sequences,combine_values,fraction_sequence,shift_index,combine_values),
     (("Combine rules at matching positions",(add_sequences,combine_values)),("Use a shifted index and a fraction rule",(shift_index,fraction_sequence)),
      ("Combine a formula and two values",(combine_values,add_sequences)),("Compare three ways to combine sequences",(shift_index,fraction_sequence,add_sequences)),
      ("Choose the matching indices and rules",(combine_values,shift_index,fraction_sequence)))),
)


def distinct(make,seed,used):
    for extra in range(300):
        candidate=make(seed+extra)
        prompts={candidate["prompt"]}
        if candidate["write"]:
            prompts.add(candidate["write"])
        if used.isdisjoint(prompts):
            used.update(prompts)
            return candidate
    raise ValueError(f"No unused prompt for {make.__name__} at seed {seed}")


def build():
    figures=diagrams()
    study,lessons,bank={},[],[]
    used=set()
    for index,(key,title,summary,rows,glossary,tip) in enumerate(LESSONS):
        uid=PREFIX+key
        figure=figures[index]
        sections,examples,extra=[],[],[]
        for step,(anchor,heading,minutes,idea,method,mistake,make,again) in enumerate(rows):
            seed=7+index*47+step*13
            start=len(examples)
            for q in (distinct(make,seed,used),distinct(again,seed+2,used)):
                examples.append(dict(title=q["title"],question=with_choices(q),solution=q["solution"]))
            feature=step==0
            text_block=dict(kind="text",title="Practise the method",html=p(method)+TABLES.get((index,step),""))
            blocks=[dict(kind="key",html=p(idea),**({"figure":figure} if feature else {})),text_block,dict(kind="example",index=start),
                check(f"{uid}-{anchor}-a",distinct(make,seed+1,used)),dict(kind="mistake",html=p(mistake)),dict(kind="example",index=start+1,tryFirst=True),
                check(f"{uid}-{anchor}-b",distinct(again,seed+3,used))]
            if step==len(rows)-1:
                blocks.append(dict(kind="tip",html=p(tip)))
            sections.append(dict(id=anchor,title=heading,label=anchor.replace("-"," ").capitalize(),minutes=minutes,
                level="core" if index<3 else "extension",blocks=blocks))
            extra+= [check(f"{uid}-{anchor}-extra-a",distinct(make,seed+6,used)),check(f"{uid}-{anchor}-extra-b",distinct(again,seed+8,used))]
        quick=distinct(rows[0][-2],6+index,used)
        revision="".join(f"<h2>{heading}</h2>"+p(idea)+p(method) for _,heading,_,idea,method,_,_,_ in rows)
        revision+="<h2>Quick worked example</h2>"+with_choices(quick)+"".join(quick["solution"])
        revision+=f'<p><img src="{figure["src"]}" width="295" alt="{escape(figure["alt"],quote=True)}"></p>'
        related=[dict(title=LESSONS[index-1][1],href=f"/courses/{COURSE}/topics/{PREFIX}{LESSONS[index-1][0]}")] if index else []
        study[uid]=dict(updatedOn=DATE,description=summary,sections=sections,examples=examples,extraPractice=extra,related=related,
            glossary=[dict(term=term,definition=p(desc)) for term,desc in glossary],
            revision=dict(body=revision,checks="<ul><li>Keep the position and the term value separate.</li><li>Check your rule at two positions.</li><li>Use the correct starting position.</li></ul>",examTip=p(tip)))
        lessons.append(dict(id=uid,key=key,title=title,summary=summary,objective=summary,
            before=p("For Core and Extended. Number positions from 1 and distinguish the position from the term value." if index<3 else "For Extended. Check that you can find and use a linear rule and recognise square and cube numbers."),
            ideas="".join(p(row[3]) for row in rows),method="".join(f"<h4>{row[1]}</h4>"+p(row[4]) for row in rows),mistakes=[row[5] for row in rows],
            examples=[dict(title=e["title"],question=e["question"],solution="".join(e["solution"]),verification=f"{uid}-worked-{n}") for n,e in enumerate(examples[::2],1)]))
        quick_families,written_families=BANK[index]
        for n,make in enumerate(quick_families,1):
            family=f"M4U-0580-SEQ-{key}-P{n}"
            for variant in range(2):
                q=distinct(make,63+index*53+n*19+variant,used)
                bank.append(short_task(f"{family}-{variant}",family,key,q,variant,1+(n-1)//2))
        for n,(name,methods) in enumerate(written_families,1):
            family=f"M4U-0580-SEQ-{key}-W{n}"
            for variant in range(4):
                questions=[distinct(make,197+index*71+n*17+variant+part*5,used) for part,make in enumerate(methods)]
                bank.append(written_task(f"{family}-{variant}",family,key,name,questions,variant,min(n,4)))
    manifest=dict(schema_version=1,key="0580-sequences",version="1.0.0",marking_status="DRAFT",
        course=dict(slug=COURSE,title="Cambridge IGCSE Mathematics (0580)",code="0580",direction="igcse"),
        chapter=dict(id="igcse_0580_sequences",slug="sequences",title="Sequences",position=24),
        source=dict(sha256=sha256(Path(__file__).read_bytes()).hexdigest(),supplied=0,held=[]),lessons=lessons,questions=bank)
    folder=ROOT/"content/original/0580"
    for filename,data in (("sequences-v1.json",manifest),("sequences-study.json",study)):
        (folder/filename).write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(f"{len(lessons)} lessons, {len(bank)} bank questions, {len(figures)} diagrams")


if __name__=="__main__":
    build()
