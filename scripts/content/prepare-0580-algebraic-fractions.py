"""Generate original E2.3 lessons and practice for Cambridge IGCSE 0580 Extended."""

from hashlib import sha256
from html import escape
import json
from math import lcm
from pathlib import Path

import sympy as s


ROOT = Path(__file__).resolve().parents[2]
COURSE = "maths4u-0580"
PREFIX = "igcse-0580-af-"
DATE = "2026-11-22"
x = s.Symbol("x")


def p(text):
    return f"<p>{text}</p>"


def tex(expression):
    return r"\(" + escape(s.latex(expression) if isinstance(expression,s.Basic) else str(expression),quote=False) + r"\)"


def latex(value):
    return s.latex(value)


def written_fraction(numerator, denominator):
    return fr"\frac{{{latex(numerator)}}}{{{latex(denominator)}}}"


def slash(numerator, denominator):
    return f"({numerator})/({denominator})"


def exclusion_math(excluded):
    return r",\quad ".join(fr"x\ne {latex(value)}" for value in excluded)


def canonical(expression):
    return s.fraction(s.together(s.cancel(expression)))


def small_brackets(seed):
    first=2+seed%9
    second=first+1+(seed//9)%7
    last=second+1+(seed//63)%5
    return first,second,last


def formula_answer(title, prompt, expression, method, notes, hint, wrong=(), excluded=()):
    numerator,denominator = canonical(expression)
    if denominator == 1:
        field = dict(key="answer",label="Simplified expression",type="polynomial",expected=str(numerator),variables=["x"])
        output = tex(latex(numerator))
        incorrect = [dict(answer=str(value),feedback=p(feedback)) for value,feedback in wrong
            if canonical(value)[1]==1 and canonical(value)!=(numerator,denominator)]
    else:
        field = dict(key="answer",label="Single fraction",type="ratio",expected=[str(numerator),str(denominator)],variables=["x"])
        output = tex(written_fraction(numerator,s.factor(denominator)))
        incorrect = []
        for value,feedback in wrong:
            a,b = canonical(value)
            if (a,b)!=(numerator,denominator):
                incorrect.append(dict(answer=slash(a,b),feedback=p(feedback)))
    solution = [p(line) for line in notes]+[p(f"The simplified result is {output}.")]
    if excluded:
        solution.append(p(f"The original restrictions remain {tex(exclusion_math(excluded))}."))
    return dict(title=title,prompt=p(prompt),field=field,answer=output,solution=solution,mark=p(method),hint=p(hint),retry=incorrect)


def numeric_denominators(seed, subtract=False, equal=False):
    a,b=(6,10) if seed%2 else (8,12)
    if equal:
        b=a
    left = (3+seed%7)*x + 2+seed%13
    right = (1+seed%5)*x - (3+(2*seed)%17)
    sign="-" if subtract else "+"
    multiplier=-1 if subtract else 1
    original=written_fraction(left,a)+sign+written_fraction(right,b)
    common=lcm(a,b)
    first,second=common//a,common//b
    raw_numerator=fr"{first}\left({latex(left)}\right){sign}{second}\left({latex(right)}\right)"
    expr=left/a+multiplier*right/b
    return formula_answer("Subtract the whole numerator" if subtract else "Use a common numerical denominator",
        f"Write {tex(original)} as a single fraction in simplest form.", expr,
        "Use a common denominator and multiply each whole numerator by the corresponding factor.",
        [f"A common denominator is {tex(common)}. Multiply the first numerator by {first} and the second by {second}.",
         f"The combined fraction is {tex(fr'\frac{{{raw_numerator}}}{{{common}}}')}. Open the brackets, collect terms and reduce any common factor."],
        "Make the bottom numbers the same before combining the two top expressions. Keep the entire second numerator together when subtracting.",
        [((left+multiplier*right)/(a+b),"Adding the denominators does not give equivalent fractions. Find a common denominator first."),
         ((left*first+(1 if subtract else -1)*right*second)/common,"Check the sign between the two scaled numerators.")])


def same_number(seed):
    return numeric_denominators(seed,equal=True)


def add_numbers(seed):
    return numeric_denominators(seed)


def subtract_numbers(seed):
    return numeric_denominators(seed,subtract=True)


def whole_term(seed):
    d=5+seed%4
    left=(1+seed%5)*x + 2+seed%13
    right=(2+seed%3)*x - (1+(2*seed)%17)
    original=latex(left)+"-"+written_fraction(right,d)
    return formula_answer("Write the whole expression over one denominator",
        f"Write {tex(original)} as a single fraction in simplest form.",left-right/d,
        "Multiply the entire first expression by the denominator and subtract the entire second numerator.",
        [f"Write the first expression over {tex(d)} by multiplying its whole numerator by {tex(d)}.",
         f"The new numerator is {tex(fr'{d}\left({latex(left)}\right)-\left({latex(right)}\right)')}. Open the brackets before collecting terms."],
        "Use the first expression over 1. Multiply both of its terms when changing the denominator.",
        [(left/d-right/d,"The first expression is over 1. Its numerator must change when its denominator changes."),
         (left+right/d,"The original operation is subtraction. Subtract the whole second numerator.")])


def multiply_terms(seed):
    a,b,c,d = 3+seed%11,8+seed%9,2+seed%7,5+seed%17
    first=a*x**2
    last=d*x
    expr=first*c/(b*last)
    raw=written_fraction(first,b)+r"\times"+written_fraction(c,last)
    return formula_answer("Multiply and cancel common factors",
        f"Simplify {tex(raw)} fully.", expr,
        "Multiply the two numerators and the two denominators, then cancel factors common to top and bottom.",
        [f"Put {tex(a*c*x**2)} above {tex(b*d*x)}. The original denominator was non-zero, so {tex(r'x\ne 0')}.",
         "Cancel one factor of x and reduce the numerical factors of the top and bottom."],
        "Multiply across. A factor in the top can cancel with a matching factor in the bottom.",
        [(first/(b*last),"Both numerators are used. The second numerator still contributes a factor."),
         (first*c/(b*d),"When cancelling x, divide both top and bottom by it.")],(0,))


def multiply_brackets(seed):
    a,b,_ = small_brackets(seed)
    k,m = 2+seed%7,3+seed%9
    leftden=k*(x+a)
    rightden=x+b
    raw=written_fraction(x,leftden)+r"\times"+written_fraction(m*(x+a),rightden)
    return formula_answer("Cancel a bracket across a product",
        f"Simplify {tex(raw)} fully.",m*x/(k*rightden),
        "Factorise the two expressions containing the shared bracket and cancel that bracket across the product.",
        [f"The first denominator is {tex(fr'{k}\left({latex(x+a)}\right)')}. The second numerator is {tex(fr'{m}\left({latex(x+a)}\right)')}.",
         f"Cancel the common bracket {tex(x+a)} from the combined numerator and denominator. Reduce the remaining numerical factors."],
        "The bracket can cancel when it is a factor of the whole top and the whole bottom.",
        [(m*x/k,"The other original denominator has no matching factor on top. Keep it."),
         (x/(k*rightden),"Cancelling the matching bracket leaves the coefficient of that bracket in the numerator.")],(-a,-b))


def divide_terms(seed):
    a,b,_=small_brackets(seed)
    c,d=2+seed%9,3+seed%7
    left,right=x+a,x+b
    raw=written_fraction(left,c*x)+r"\div"+written_fraction(right,d*x)
    return formula_answer("Multiply by the reciprocal of the divisor",
        f"Simplify {tex(raw)} fully.",d*left/(c*right),
        "Replace the division by multiplication with the reciprocal of the second fraction, then cancel the common x.",
        [f"The second fraction is the divisor. Invert it to write the expression as {tex(written_fraction(left,c*x)+r'\times'+written_fraction(d*x,right))}.",
         f"The top and bottom now have a factor of {tex(x)}. Cancel this factor and preserve the exclusions from the original division."],
        "Keep the first fraction as written. Turn over the second one before multiplying.",
        [(left*right/(c*d*x**2),"The fractions were multiplied without taking a reciprocal. Flip the second fraction first."),
         (c*right/(d*left),"The first fraction needs to stay as written. Only invert the divisor.")],(0,-b))


def division_restrictions(seed):
    a,b,c=small_brackets(seed)
    first=x+a
    numer=x-c
    second=x+b
    raw=written_fraction(1,first)+r"\div"+written_fraction(numer,second)
    values=(-b,-a,c)
    answer=tex(r",\;".join(latex(v) for v in values))
    field=dict(key="excluded",label="Excluded x-values",type="set",expected=",".join(str(v) for v in values))
    return dict(title="Find where a division is undefined",prompt=p(f"Give every excluded value of {tex(x)} in {tex(raw)}. List the values."),field=field,answer=answer,
        solution=[p(f"The original denominators require {tex(exclusion_math((-a,-b)))}."),
                  p(f"The divisor itself must be non-zero. As long as its denominator is non-zero, it is zero at {tex(fr'x={c}')}.") ,
                  p(f"The excluded values are {answer}.")],
        mark=p("Set both original denominators and the divisor numerator equal to zero to locate the exclusions."),
        hint=p("Check both old denominators. Also check where the entire second fraction equals zero."),
        retry=[dict(answer=f"{-a},{-b}",feedback=p("These exclude the original denominator zeros. Division by a fraction also excludes values that make that fraction zero.")),
               dict(answer=str(c),feedback=p("This makes the divisor zero. Also list both values where the original denominators are zero."))])


def linear_denominators(seed, subtract=False):
    a,b,_ = small_brackets(seed)
    n,d = (2+seed%9),(3+seed%7)
    if subtract:
        n=x+n+a
    sign,multiplier=("-",-1) if subtract else ("+",1)
    left,right=x+a,x+b
    raw=written_fraction(n,left)+sign+written_fraction(d,right)
    new_top=fr"\left({latex(n)}\right)\left({latex(right)}\right){sign}{d}\left({latex(left)}\right)"
    common=left*right
    return formula_answer("Subtract over two linear factors" if subtract else "Add over two linear factors",
        f"Write {tex(raw)} as a single fraction in simplest form.",(n*right+multiplier*d*left)/common,
        "Use the product of the two different linear factors as a common denominator and scale both numerators.",
        [f"The two different denominator factors give the common denominator {tex(latex(common))}.",
         f"The new numerator is {tex(new_top)}. Expand it and collect like terms."],
        "Multiply each numerator by the factor missing from its denominator.",
        [((n+multiplier*d)/(left+right),"Adding the denominators does not put both fractions over an equivalent common denominator."),
         ((n*right-multiplier*d*left)/common,"The separate numerators have been scaled. Check whether the second one should be added or subtracted.")],(-a,-b))


def add_linear(seed):
    return linear_denominators(seed)


def subtract_linear(seed):
    return linear_denominators(seed,subtract=True)


def shared_linear(seed):
    a = 2+seed%17
    n,d=3+seed%11,2+seed%9
    left,right = 6*(x+a),8*(x+a)
    raw=written_fraction(n,left)+"+"+written_fraction(d,right)
    common=24*(x+a)
    return formula_answer("Use a shared algebraic factor once",
        f"Write {tex(raw)} as a single fraction in simplest form.",s.Rational(n,6)/(x+a)+s.Rational(d,8)/(x+a),
        "Choose a common denominator containing the lowest common multiple of 6 and 8 and one copy of the bracket.",
        [f"Both denominators have a factor of {tex(x+a)}. A lowest common denominator is {tex(latex(s.factor(common)))}.",
         f"Multiply the first numerator by 4 and the second by 3. The combined numerator is {tex(4*n+3*d)}."],
        "The same bracket appears in both denominators. Keep one copy and find the common multiple of the coefficients.",
        [((n+d)/common,"The denominator is suitable, but scale each numerator to match its new denominator."),
         ((n+d)/(left+right),"Adding denominators changes the value of the fractions. Scale both fractions to a common denominator first.")],(-a,))


def combine_and_cancel(seed):
    a,_,b = small_brackets(seed)
    n=x+a+1+seed%5
    extra=-(n.subs(x,-a))*(b-a)
    left,right=x+a,x+b
    common=left*right
    raw=written_fraction(n,left)+"-"+written_fraction(-extra,common)
    numerator=n*right+extra
    return formula_answer("Check for cancellation after combining",
        f"Write {tex(raw)} as a single fraction in simplest form.",numerator/common,
        "Convert the first fraction to the common denominator, subtract the numerators and factorise the result.",
        [f"Use the denominator {tex(common)}. Multiply the first numerator by {tex(right)}.",
         f"The combined numerator {tex(latex(s.expand(numerator)))} factorises as {tex(latex(s.factor(numerator)))}. Cancel only the matching factor."],
        "One denominator already contains both factors. Use it for both fractions, then check for a common factor.",
        [((n+extra)/common,"The first numerator needs to be multiplied by the missing denominator factor."),
         ((n*right-extra)/common,"Keep the subtraction sign from the original expression.")],(-a,-b))


def cancellation_example(seed, squares=False):
    a,b,c=small_brackets(seed)
    if squares:
        b=a
    numerator,denominator=(x-a)*(x+b),(x-a)*(x+c)
    orig=written_fraction(s.expand(numerator),s.expand(denominator))
    if squares:
        method=f"Factorise the difference of squares in the numerator, factorise the denominator and cancel {tex(x-a)}."
    else:
        method=f"Factorise both quadratics and cancel the shared factor {tex(x-a)}."
    return formula_answer("Use a difference of squares" if squares else "Factorise before cancelling a bracket",
        f"Simplify {tex(orig)} fully.",numerator/denominator,method,
        [f"Factorise the numerator as {tex(numerator)} and the denominator as {tex(denominator)}.",
         f"The common factor is {tex(x-a)}. Cancel it where it is non-zero."],
        "Find factors of both whole polynomials first. Matching terms in a sum cannot cancel by themselves.",
        [((x+c)/(x+b),"This turns the fraction over. Keep the original numerator and denominator in order."),
         ((x+b)/(x-a),"The remaining denominator comes from the factor that did not cancel.")],(a,-c))


def cancel_quadratics(seed):
    return cancellation_example(seed)


def cancel_squares(seed):
    return cancellation_example(seed,squares=True)


def cancel_x(seed):
    b,c,_=small_brackets(seed)
    a=2+seed%13
    num=a*x*(x+b)
    den=x*(x+c)
    raw=written_fraction(s.expand(num),s.expand(den))
    return formula_answer("Take out a common factor x",
        f"Simplify {tex(raw)} fully.",num/den,
        "Factorise the numerator and denominator and cancel the common factor x.",
        [f"The numerator is {tex(num)} and the denominator is {tex(den)}.",
         f"Cancel one common factor of {tex(x)}. Preserve the two exclusions from the original denominator."],
        "Look for a factor of x in every numerator term and every denominator term.",
        [((x+b)/(x+c),"You cancelled x correctly. The leading coefficient still belongs in the numerator."),
         (a*(x+b),"The factor x cancels. The rest of the denominator must remain.")],(0,-c))


def original_domain(seed):
    a,b,c=small_brackets(seed)
    raw=written_fraction(s.expand((x-a)*(x+b)),s.expand((x-a)*(x+c)))
    simpler=written_fraction(x+b,x+c)
    restriction=tex(exclusion_math((-c,a)))
    expected=f"(-inf,{-c}) U ({-c},{a}) U ({a},inf)"
    field=dict(key="domain",label="Allowed x-values",type="set",expected=expected)
    return dict(title="Preserve the original domain after cancelling",
        prompt=p(f"A student rewrites {tex(raw)} as {tex(simpler)}. State the allowed real values of {tex(x)} for the original expression. Give the restrictions as inequalities or intervals."),
        field=field,answer=restriction,
        solution=[p(f"Factorise the original denominator. It is {tex((x-a)*(x+c))}, so it is zero at {tex(-c)} and {tex(a)}."),
                  p(f"Keep both exclusions after cancelling. The allowed values meet {restriction}.")],
        mark=p("Identify zeros of both denominator factors before cancellation, including the cancelled factor."),
        hint=p("Find the zeros of the starting denominator. A cancelled zero is still excluded."),
        retry=[dict(answer=f"x != {-c}",feedback=p("You found the remaining denominator zero. Also exclude the zero of the cancelled bracket.")),
               dict(answer=f"x != {a}",feedback=p("You found the cancelled denominator zero. Also exclude the zero of the remaining bracket."))])


LESSONS = (
    ("numerical-denominators", "Add and subtract with numerical denominators",
     "Find a common denominator, scale whole numerators and subtract brackets in Extended algebraic fractions.",
     (("same-denominator", "What if the denominators are already the same?", 7,
       "The fractions count equal-sized parts when their denominators match. Combine their numerators and keep the denominator once.",
       f"The same rule works with algebra in the numerator. {tex(r'\frac{5x}{9}+\frac{2x}{9}=\frac{7x}{9}')} because both terms count ninths.",
       "Keep the common denominator underneath the whole new numerator.", same_number,add_numbers),
      ("scale-both", "How do I find a useful common denominator?", 8,
       "Use a common multiple of the bottom numbers. The lowest common multiple usually makes the arithmetic shorter.",
       f"For denominators {tex(6)} and {tex(15)}, use {tex(30)}. Multiply the first numerator by 5 and the second by 2. Scale the whole numerator each time.",
       "Changing only the bottom changes the fraction. Multiply both its top and its bottom by the same factor.", add_numbers,subtract_numbers),
      ("subtract-all", "What does a minus sign subtract?", 9,
       "Put the complete second numerator in brackets. The minus sign applies to every term inside those brackets.",
       f"Write an expression without a denominator over {tex(1)}. When changing its denominator, multiply each term of that expression.",
       "If the numerator already contains a minus, subtracting that negative term makes it positive. Open brackets before collecting terms.", subtract_numbers,whole_term)),
     (("Common denominator","A shared bottom expression that can be used to rewrite each fraction."),
      ("Numerator","The whole expression above the fraction bar."),("Equivalent fraction","Another fraction with the same value.")),
     "Write a pair of brackets around a numerator you subtract. Show the scaled numerators above one denominator."),
    ("multiply-and-divide", "Multiply and divide algebraic fractions",
     "Multiply across, use a reciprocal for division and record the original values at which an expression is undefined.",
     (("multiply-top-and-bottom", "What do I multiply first?", 7,
       "Multiply the top expressions to make one numerator. Multiply the bottom expressions to make one denominator.",
       "Cancel any factor that is common to the whole new numerator and denominator. You can also cancel that factor before multiplying when you can see it clearly.",
       "Multiplication lets you cancel common factors across the two fractions. In addition, you must combine over a common denominator first.", multiply_terms,multiply_brackets),
      ("flip-the-divisor", "Which fraction do I turn over?", 8,
       "The second fraction is the amount you divide by. The reciprocal interchanges its top and bottom.",
       f"Keep the first fraction and change division into multiplication by the second fraction's reciprocal. For instance, {tex(r'\frac{2}{7}\div\frac{3}{5}=\frac{2}{7}\times\frac{5}{3}')}.",
       "Only the divisor is inverted. Turning over the first fraction changes the problem.", divide_terms,multiply_terms),
      ("check-the-divisor", "Which values must be excluded before dividing?", 10,
       "The two fractions must both be defined. The second fraction must also be non-zero because it is the divisor.",
       f"Find zeros of both original denominators. Also find the zeros of the divisor's numerator. With {tex(r'\frac{x-4}{x+6}')} as a divisor, exclude {tex(-6)} and {tex(4)}.",
       "Flipping the divisor can hide an old denominator. Record its exclusions before taking the reciprocal.", division_restrictions,divide_terms)),
     (("Reciprocal","A fraction with numerator and denominator exchanged, valid when the original fraction is non-zero."),
      ("Divisor","The quantity by which the first quantity is divided."),("Excluded value","A value of the letter where the original calculation is undefined.")),
     "Record any zeros of the divisor as well as zeros of the original denominators before simplifying."),
    ("algebraic-denominators", "Combine fractions with algebraic denominators",
     "Choose a common denominator with linear factors, combine numerators and simplify if a factor cancels.",
     (("different-factors", "How do I combine two different denominator factors?", 8,
       "Look at the factors underneath the fraction bars. The new denominator needs to contain each factor from both old denominators.",
       f"For {tex('x+2')} and {tex('x-5')}, use {tex('(x+2)(x-5)')}. Multiply each numerator by the factor missing from its denominator.",
       "Write the new numerator with brackets before multiplying or subtracting. A minus applies to the whole second product.", add_linear,subtract_linear),
      ("shared-factors", "When can I reuse a shared factor?", 8,
       "Denominators can share a bracket. Use the largest power of each factor needed by either original denominator.",
       f"For {tex('4(x-3)')} and {tex('6(x-3)')}, use {tex('12(x-3)')}. The numbers 4 and 6 both divide 12, and one copy of the bracket is enough.",
       "Multiplying the denominators always gives a common multiple. A smaller denominator often avoids a factor you would later need to cancel.", shared_linear,add_linear),
      ("reduce-at-the-end", "When can the combined fraction simplify further?", 10,
       "Collect the numerator over the common denominator, then try factorising it. A matching factor may cancel after this step.",
       "Check the original denominator zeros before cancellation. They are still excluded even if the new formula shows fewer denominator factors.",
       "An apparent matching term is not enough. Only a common factor of the two whole expressions can be cancelled.", combine_and_cancel,subtract_linear)),
     (("Linear factor","A factor such as x + 2 that has degree one."),("Common multiple","An expression that contains all factors required by each denominator."),
      ("Single fraction","One entire numerator over one entire denominator.")),
     "After combining over one denominator, factorise the new numerator to check for a possible cancellation."),
    ("factorise-and-restrict", "Simplify rational expressions and keep restrictions",
     "Factorise polynomial numerators and denominators, cancel common factors and state the original restrictions.",
     (("factor-the-whole-part", "Which parts can I cancel?", 8,
       "First turn the whole numerator and denominator into products. A term within a sum is not automatically a factor of the sum.",
       f"If every term contains {tex(x)}, take it out first. For instance, {tex(r'3x^2+21x=3x(x+7)')}. Then look for the same factor below the bar.",
       "If a term does not contain x, you cannot take out x from the whole expression. Test by multiplying your factors back out.", cancel_x,cancel_quadratics),
      ("match-quadratic-factors", "What if the numerator and denominator are quadratics?", 9,
       "Factorise each quadratic separately. A difference of two squares can give two linear factors without trial and error.",
       f"Use {tex(r'A^2-B^2=(A-B)(A+B)')}. Compare complete brackets from the top and bottom before cancelling one.",
       "Brackets such as x + 7 and x − 7 have different zeros. Check the signs as well as the numbers.", cancel_squares,cancel_quadratics),
      ("keep-every-exclusion", "Why do some restrictions survive cancellation?", 10,
       "A zero in the original denominator makes the original fraction undefined. Simplification gives an equivalent value only where the original expression works.",
       f"If a cancelled factor is {tex('x-9')}, the original restriction {tex(r'x\ne 9')} remains even when the new formula has no such factor in its denominator.",
       "When asked for allowed inputs, check every factor of the original denominator. A simplified expression cannot restore an excluded value.", original_domain,cancel_squares)),
     (("Rational expression","A quotient of two polynomials."),("Common factor","A factor of the entire numerator and the entire denominator."),
      ("Domain","The set of inputs for which the original expression has a valid value.")),
     "Keep the original restricted values on a separate line next to the simplified result."),
)


def image(name, labels, caption):
    colours=("#d8eaff","#ccece5","#fff0cc")
    boxes=[]
    for i,label in enumerate(labels):
        start=9+i*126
        boxes.append(f'<rect x="{start}" y="34" width="108" height="52" rx="7" fill="{colours[i]}" stroke="#56718e"/>')
        for row,line in enumerate(label.split("/")):
            boxes.append(f'<text x="{start+54}" y="{54+row*17}" text-anchor="middle" fill="#173554" font-size="13">{escape(line)}</text>')
        if i<2:
            boxes.append(f'<path d="M{start+109} 60h16m-6 -4 6 4 -6 4" fill="none" stroke="#355474" stroke-width="1.7"/>')
    alt=". ".join(label.replace("/"," ") for label in labels)+"."
    svg=(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 380 118" role="img" aria-label="{escape(alt,quote=True)}">'
         f'<rect width="380" height="118" rx="12" fill="#f8fafc"/><g font-family="Arial,sans-serif">{"".join(boxes)}</g></svg>\n')
    folder=ROOT/"public/assets/study/0580/algebraic-fractions"
    folder.mkdir(parents=True,exist_ok=True)
    (folder/f"{name}.svg").write_text(svg,encoding="utf-8")
    return dict(src=f"/assets/study/0580/algebraic-fractions/{name}.svg",alt=alt,caption=p(caption),width=380,height=118)


def figures():
    return (
        image("same-units",("Choose the/common bottom","Scale each/whole top","Combine the/new numerators"),"Make the fractions count equal-sized parts before adding or subtracting."),
        image("division-checks",("Check original/denominators","Check the/divisor","Use its/reciprocal"),"Record the unavailable inputs in the original division before flipping the divisor."),
        image("shared-denominator",("List the/bottom factors","Use each/factor needed","Scale, combine,/then simplify"),"Build the common denominator from the factors already underneath the bars."),
        image("keep-restrictions",("Record the/old restrictions","Factorise and/cancel","Keep the same/allowed inputs"),"Cancellation changes the formula but preserves the original restrictions."),
    )


def check(uid,q):
    return dict(id=uid,kind="check",title=q["title"],prompt=q["prompt"],field=q["field"],hint=q["hint"],solution="".join(q["solution"]),retry=q["retry"])


def award(code,content):
    return dict(code=code,marks=1,description_html=content)


def short_task(uid,family,lesson,q,variant,difficulty):
    return dict(id=uid,family_uid=family,lesson=lesson,title=q["title"],collection="variant" if variant else "short",marks=1,difficulty=difficulty,
        prompt_html=q["prompt"],answer_html=p(q["answer"]),hint_html=q["hint"],solution_html="".join(q["solution"]),fields=[q["field"]],
        parts=[dict(label="a",marking_criteria=[award("B1",p(q["answer"]))])],verification=uid)


def written_task(uid,family,lesson,title,questions,variant,difficulty):
    prompts,answers,hints,solutions,parts=[],[],[],[],[]
    for index,q in enumerate(questions):
        label=chr(index+97)
        criteria=[award("M1",q["mark"]),award("A1",p(q["answer"]))]
        prompts.append(f'<li>{q["prompt"]}<span class="marks">[2]</span></li>')
        answers.append(p(f"({label}) {q['answer']}"))
        hints.append(p(f"({label})")+q["hint"])
        solutions.append(f'<h4>({label})</h4>'+"".join(q["solution"]))
        parts.append(dict(label=label,marking_criteria=criteria))
    return dict(id=uid,family_uid=family,lesson=lesson,title=title,collection="exam",variant_index=variant,
        difficulty=difficulty,marks=sum(len(part["marking_criteria"]) for part in parts),prompt_html='<ol class="parts" type="a">'+"".join(prompts)+"</ol>",
        answer_html="".join(answers),hint_html="".join(hints),solution_html="".join(solutions),fields=[],parts=parts,verification=uid)


BANK = (
    ((same_number,add_numbers,subtract_numbers,whole_term,subtract_numbers),
     (("Put both expressions over one number",(same_number,add_numbers)),("Subtract two scaled numerators",(subtract_numbers,whole_term)),
      ("Choose a common numerical denominator",(add_numbers,subtract_numbers)),("Simplify a sum and a difference",(same_number,whole_term,subtract_numbers)),
      ("Write three expressions as single fractions",(add_numbers,whole_term,subtract_numbers)))),
    ((multiply_terms,divide_terms,multiply_brackets,division_restrictions,divide_terms),
     (("Multiply and cancel",(multiply_terms,multiply_brackets)),("Change division into multiplication",(divide_terms,multiply_terms)),
      ("Identify undefined divisions",(division_restrictions,divide_terms)),("Work with products of fractions",(multiply_brackets,multiply_terms,divide_terms)),
      ("Check the reciprocal and exclusions",(division_restrictions,divide_terms,multiply_brackets)))),
    ((add_linear,subtract_linear,shared_linear,combine_and_cancel,subtract_linear),
     (("Build a common linear denominator",(add_linear,shared_linear)),("Check subtraction and brackets",(subtract_linear,add_linear)),
      ("Compare shared and different factors",(shared_linear,subtract_linear)),("Combine and reduce fractions",(combine_and_cancel,shared_linear,add_linear)),
      ("Choose how to combine three pairs",(subtract_linear,combine_and_cancel,shared_linear)))),
    ((cancel_x,cancel_quadratics,cancel_squares,original_domain,cancel_squares),
     (("Use common polynomial factors",(cancel_x,cancel_quadratics)),("Recognise a difference of squares",(cancel_squares,cancel_x)),
      ("Record all original restrictions",(original_domain,cancel_quadratics)),("Compare three types of factorisation",(cancel_x,cancel_squares,cancel_quadratics)),
      ("Keep restrictions during cancellation",(cancel_squares,original_domain,cancel_x)))),
)


def build():
    drawings=figures()
    lesson_meta,study,bank=[],{},[]
    for index,(key,title,summary,data,terms,tip) in enumerate(LESSONS):
        uid=PREFIX+key
        sections,examples,extra=[],[],[]
        figure=drawings[index]
        for order,(anchor,heading,minutes,idea,method,mistake,first,second) in enumerate(data):
            seed=7+29*index+11*order
            offset=len(examples)
            for q in (first(seed),second(seed+2)):
                examples.append(dict(title=q["title"],question=q["prompt"],solution=q["solution"]))
            featured=(index!=1 and order==0 or index==1 and order==2)
            blocks=[dict(kind="key",html=p(idea),**({"figure":figure} if featured else {})),dict(kind="text",title="Practise the method",html=p(method)),
                dict(kind="example",index=offset),check(f"{uid}-{anchor}-a",first(seed+1)),dict(kind="mistake",html=p(mistake)),
                dict(kind="example",index=offset+1,tryFirst=True),check(f"{uid}-{anchor}-b",second(seed+3))]
            if order==2:
                blocks.append(dict(kind="tip",html=p(tip)))
            sections.append(dict(id=anchor,title=heading,label=anchor.replace("-"," ").capitalize(),minutes=minutes,level="core",blocks=blocks))
            for n,q in enumerate((first(seed+5),second(seed+6)),1):
                extra.append(check(f"{uid}-{anchor}-extra-{n}",q))
        revision="".join(f"<h2>{heading}</h2>"+p(idea)+p(method) for _,heading,_,idea,method,_,_,_ in data)
        example=data[0][-2](5+index)
        revision+='<h2>Quick worked example</h2>'+example["prompt"]+"".join(example["solution"])
        revision+=f'<p><img src="{figure["src"]}" width="295" alt="{escape(figure["alt"],quote=True)}"></p>'
        related=[dict(title=LESSONS[index-1][1],href=f"/courses/{COURSE}/topics/{PREFIX}{LESSONS[index-1][0]}")] if index else []
        glossary=[dict(term=term,definition=p(definition)) for term,definition in terms]
        study[uid]=dict(updatedOn=DATE,description=summary,sections=sections,examples=examples,extraPractice=extra,related=related,glossary=glossary,
            revision=dict(body=revision,checks="<ul><li>Keep whole numerators together.</li><li>Check whether the result reduces further.</li><li>Preserve every original restriction.</li></ul>",examTip=p(tip)))
        lesson_meta.append(dict(key=key,id=uid,title=title,summary=summary,objective=summary,
            before=p("For 0580 Extended. Recall how to multiply, divide, add and subtract ordinary fractions. Use brackets to keep a whole numerator or denominator together."),
            ideas="".join(p(row[3]) for row in data),method="".join(f"<h4>{row[1]}</h4>"+p(row[4]) for row in data),mistakes=[row[5] for row in data],
            examples=[dict(title=q["title"],question=q["question"],solution="".join(q["solution"]),verification=f"{uid}-worked-{i}") for i,q in enumerate(examples[::2],1)]))
        short,written=BANK[index]
        for j,make in enumerate(short,1):
            family=f"M4U-0580-AF-{key}-P{j}"
            for k in range(2):
                q=make(21+23*index+7*j+k)
                bank.append(short_task(f"{family}-{k}",family,key,q,k>0,1+(j-1)//2))
        for j,(name,makes) in enumerate(written,1):
            family=f"M4U-0580-AF-{key}-W{j}"
            for k in range(4):
                questions=[make(52+37*index+11*j+k+5*v) for v,make in enumerate(makes)]
                bank.append(written_task(f"{family}-{k}",family,key,name,questions,k,min(4,j)))
    manifest=dict(schema_version=1,key="0580-algebraic-fractions",version="1.0.0",marking_status="DRAFT",
        course=dict(slug=COURSE,title="Cambridge IGCSE Mathematics (0580)",code="0580",direction="igcse"),
        chapter=dict(id="igcse_0580_algebraic_fractions",slug="algebraic-fractions",title="Algebraic fractions",position=20),
        source=dict(sha256=sha256(Path(__file__).read_bytes()).hexdigest(),supplied=0,held=[]),lessons=lesson_meta,questions=bank)
    for filename,package in (("algebraic-fractions-v1.json",manifest),("algebraic-fractions-study.json",study)):
        (ROOT/"content/original/0580"/filename).write_text(json.dumps(package,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(f"{len(lesson_meta)} lessons, {len(bank)} bank questions, {len(drawings)} diagrams")


if __name__=="__main__":
    build()
