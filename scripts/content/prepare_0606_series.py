from fractions import Fraction as F
from math import comb
from pathlib import Path

from prepare_0606_discrete import Lesson, Section, build, figure, graded, inline as m, tex


ARCHIVE = Path(r"E:\my folder\questions_data\0606 Additional Mathematics\11 Series.json")
CHAPTER = "series"


def bind(func, mode):
    return lambda seed: func(seed, mode)


def add(expr, coefficient, variable=""):
    if not coefficient:
        return expr
    if variable and abs(coefficient) == 1:
        base = variable
    else:
        base = f"{tex(abs(coefficient))}{variable}"
    return f"{expr}{'+' if expr and coefficient>0 else '-' if coefficient<0 else ''}{base}"


def power(n):
    return "x" if n == 1 else rf"x^{{{n}}}" if n else ""


def expression(cs, latex=True):
    out = ""
    for i, v in enumerate(cs):
        symbol = power(i) if latex else "x" if i == 1 else f"x^{i}" if i else ""
        out = add(out,v,symbol)
    return out or "0"


def binomial(a,b,n):
    return rf"\left({add(tex(a),b,'x')}\right)^{{{n}}}"


def coeff(a, b, n, k):
    return comb(n,k)*a**(n-k)*b**k


def multiplied_coeffs(a,b,n):
    result = [1]
    for index in range(n):
        result = [a*x+b*y for x,y in zip(result+[0],[0]+result)]
    return result


def binomial_model(seed,mode):
    a = 1 + seed%5
    b = 1 + seed//5%5
    if seed % 3 == 1:
        b = -b
    if mode == 0:
        n = 3 + seed//17%4
        cs = [coeff(a,b,n,k) for k in range(n+1)]
        assert cs == multiplied_coeffs(a,b,n)
        source = m(binomial(a,b,n))
        return graded("Expand a positive integer binomial", f"Expand and simplify {source}, in ascending powers of {m('x')}.", expression(cs,False),
                      (f"Use row {n} of Pascal's triangle. The multipliers are {m(',\\ '.join(str(comb(n,r)) for r in range(n+1)))}.",
                       f"The general coefficient is {m(rf'\binom{{{n}}}{{r}}{a}^{{{n}-r}}({b})^r')}. Attach {m('x^r')} to it.",
                       f"Evaluate the coefficients to give {m(expression(cs))}."),
                      "Use one row for the whole expansion and keep the sign of the x-term when taking a power.",
                      "Use the full Pascal row and the matching powers of both terms.",
                      kind="polynomial", variables=["x"], shown=m(expression(cs)), label="Expanded expression", mark=4)
    n = 5 + seed//11%9
    k = 2 + seed//7%(min(n-1,6)-1)
    v = coeff(a,b,n,k)
    assert v == multiplied_coeffs(a,b,n)[k]
    if mode == 1:
        return graded("Select one coefficient without expanding", f"Find the coefficient of {m(power(k))} in {m(binomial(a,b,n))}.", v,
                      (f"To produce exactly {m(power(k))}, take the x-term {k} times.",
                       f"Use {m(rf'\binom{{{n}}}{{{k}}}{a}^{{{n-k}}}({b})^{{{k}}}')}."),
                      "Use the power of x to determine how many times x was selected.",
                      "Select the correct term of the binomial expansion and evaluate its coefficient.",
                      wrong=(abs(v), "An odd number of negative factors produces a negative coefficient.") if v<0 else None,mark=3)
    v1 = coeff(a,b,n,k-1)
    k0 = 2 + seed%6
    vprod = v + k0*v1
    assert vprod == (lambda p: p[k] + k0*p[k-1])(multiplied_coeffs(a,b,n))
    return graded("Combine contributions from a linear factor", f"Find the coefficient of {m(power(k))} in {m(rf'(1+{k0}x)'+binomial(a,b,n))}.", vprod,
                  (f"The constant in the first factor multiplies the coefficient {m(v)} of {m(power(k))} from the binomial.",
                   f"The term {m(f'{k0}x')} multiplies the coefficient {m(v1)} of {m(power(k-1))}. Their contributions add."),
                  "The x-term in the multiplier raises the power of a term by one.",
                  "Identify the two contributing powers, multiply by the corresponding coefficients and add.",
                  wrong=(v, "You have the contribution from the constant multiplier. Include the one from the x multiplier.") if v1 else None,mark=4)


def independent(seed,mode):
    a = 2+seed%5
    b = 1+seed//5%6
    if seed%2:
        b=-b
    p=1+seed%3
    q=1+(seed//3)%3
    n=(p+q)*(2+(seed//9)%3)
    r=n*p//(p+q)
    assert p*(n-r)-q*r==0 and sum(p*(n-j)-q*j==0 for j in range(n+1))==1
    if mode == 1:
        val=2+seed%7
        n=4+seed//7%7
        base=1+seed//49%4
        term=n*base**(n-1)*val
        return graded("Find an unknown linear coefficient", f"The coefficient of {m('x')} in {m(rf'\left({base}+bx\right)^{{{n}}}')} is {m(term)}. Find {m('b')}.", val,
                      (f"Exactly one choice of {m('bx')} is required.",
                       f"Equate {m(f'{n}({base})^{{{n-1}}}b')} to {m(term)} and divide through."),
                      "Only one of the n factors contributes x.",
                      "Set the first-degree coefficient equal to the data and solve for the multiplier.",
                      wrong=(term, "This is the resulting coefficient of x, after multiplying by the other factors."), mark=3)
    if mode == 2:
        degree=4+seed%12
        scale=2+(seed//12)%5
        value=comb(degree,2)*scale**2
        return graded("Recover a positive integer exponent", f"The coefficient of {m('x^2')} in {m(f'(1+{scale}x)^n')} is {m(value)}. Find the positive integer {m('n')}.",degree,
                      (f"Set {m(rf'\frac{{n(n-1)}}{{2}}\cdot {scale}^2={value}')}.",
                       f"After division the product is {m(f'n(n-1)={degree*(degree-1)}')}. Take the positive integer root."),
                      "Selecting x exactly twice contributes both a binomial coefficient and the square of its multiplier.",
                      "Use the general term with two x factors, then solve the quadratic and reject a negative exponent.",
                      wrong=(degree-1,"Take the larger of the two consecutive factors."),mark=4)
    val=comb(n,r)*a**(n-r)*b**r
    base=rf"\left({a}{power(p)}{'+' if b>0 else '-'}\frac{{{abs(b)}}}{{{power(q)}}}\right)^{{{n}}}"
    poly={0:1}
    for i in range(n):
        temp={}
        for e,v in poly.items():
            temp[e+p]=temp.get(e+p,0)+a*v
            temp[e-q]=temp.get(e-q,0)+b*v
        poly=temp
    assert poly[0]==val
    return graded("Find the term independent of x", f"Find the term independent of {m('x')} in {m(base)}.",val,
                  (f"If the reciprocal term is chosen {m('r')} times, the exponent is {m(f'{p}({n}-r)-{q}r')}.",
                   f"Set this equal to zero, giving {m(f'r={r}')}. Evaluate {m(rf'\binom{{{n}}}{{{r}}}{a}^{{{n-r}}}({b})^{{{r}}}')}."),
                  "Find the net power of x before finding its numerical coefficient.",
                  "Solve the index equation, then substitute the integer term index into the general term.",
                  mark=4)


def ap_data(seed):
    first=4 + seed%23
    difference=2 + seed//23%12
    n=6 + seed//8%16
    if seed%7==2:
        difference=-difference
    return first,difference,n


def ap(seed, mode):
    a,d,n=ap_data(seed)
    term=a+(n-1)*d
    val=n*(a+term)//2
    assert val==sum(a+i*d for i in range(n))
    stem=f"An arithmetic progression starts {m(',\\ '.join(str(a+i*d) for i in range(3)))}."
    if mode==1:
        return graded("Find a finite arithmetic sum",f"{stem} Find the sum of its first {n} terms.",val,
                      (f"The {n}th term is {m(f'{a}+({n}-1)({d})={term}')}.",
                       f"Multiply the average of the first and last terms by {n}: {m(rf'\frac{{{n}}}{{2}}({a}+({term}))')}."),
                      "Pair the first term with the last, or use the standard formula.",
                      "Find the final term and use the arithmetic series formula.",mark=3)
    if mode==2:
        u3=a+2*d
        u6=a+5*d
        return graded("Recover an arithmetic first term",f"Term 3 of an arithmetic progression is {m(u3)} and term 6 is {m(u6)}. Find the first term.",a,
                      (f"Term 6 is three steps after term 3, so the common difference is {m(rf'\frac{{{u6}-({u3})}}{{3}}={d}')}.",
                       f"Go back two steps from term 3: {m(f'{u3}-2({d})')}."),
                      "Subtract the known terms and divide by the number of gaps.",
                      "Use two linear equations, or subtract and divide by three to find the common difference.",
                      wrong=(u3-d,"Term 3 is two steps from the first term."),mark=3)
    return graded("Find a specified arithmetic term",f"{stem} Find term {n}.",term,
                  (f"The constant difference is {m(d)}. There are {n-1} steps from term 1 to term {n}.",
                   f"Evaluate {m(f'{a}+({n}-1)({d})')}."),
                  "Count the gaps from term 1 to the requested position.",
                  "Use the arithmetic nth-term formula.",
                  wrong=(a+n*d,"That uses n steps. Term 1 is already given."),mark=2)


def gp_data(seed):
    a=2+seed%28
    n=4+seed//11%8
    r=F(2+seed//28%4)
    if seed%3==1:
        r=F(-2-seed%3)
    if seed%3==2:
        r=F(1,2+seed//5%4)
    return F(a),r,n


def sequence_text(xs):
    return m(",\\ ".join(tex(x) for x in xs))


def gp(seed,mode):
    a,r,n=gp_data(seed)
    term=a*r**(n-1)
    val=a*(1-r**n)/(1-r)
    assert val==sum(a*r**i for i in range(n))
    stem=f"A geometric progression begins {sequence_text((a,a*r,a*r*r))}."
    if mode==1:
        return graded("Find a finite geometric sum",f"{stem} Find the sum of the first {n} terms.",val,
                      (f"The ratio is {m(r)}. The first term is {m(a)}.",
                       f"Substitute into {m(r'S_n=\frac{a(1-r^n)}{1-r}')}, using {m(f'n={n}')}."),
                      "Use the geometric sum even if the ratio is negative.",
                      "Substitute the correct first term, ratio and term count into the finite geometric sum.",
                      wrong=(term, "That is the final term alone. Add all terms."),mark=4)
    if mode==2:
        u4=a*r**3; u7=a*r**6
        return graded("Recover a geometric ratio",f"The fourth and seventh terms of a geometric progression are {m(u4)} and {m(u7)} respectively. Find its common ratio.",r,
                      (f"Divide term 7 by term 4. The three steps give {m(f'r^3={tex(u7/u4)}')}.",
                       "Take the real cube root, keeping the sign."),
                      "A gap of three indices gives the cube of the ratio.",
                      "Divide the given terms and take the real cube root.",
                      wrong=(u7/u4,"This is the cube of the ratio. Take the cube root."),mark=3)
    return graded("Find a specified geometric term",f"{stem} Find term {n}.",term,
                  (f"Divide the second term by the first to get {m(r)}.",
                   f"Multiply the first term by this ratio {n-1} times. Use {m(rf'{tex(a)}\left({tex(r)}\right)^{{{n-1}}}')}."),
                  "The index is the term position, one more than the number of ratio multiplications.",
                  "Use the geometric nth-term formula.",
                  wrong=(a*r**n,"The first term already occupies position one."),mark=3)


def infinite(seed,mode):
    a=F(10+seed%27)
    r=F(1,(2+seed//13%7))*(-1 if seed%2 else 1)
    if mode==1:
        n=2+seed//5%8
        total=a/(1-r)
        tail=a*r**n/(1-r)
        assert total-tail==sum(a*r**j for j in range(n))
        return graded("Find the sum omitted after a finite stopping point",
                      f"The geometric series begins {sequence_text((a,a*r,a*r*r))}. Find the sum of all terms after its first {n} terms.",
                      tail,
                      (f"The first omitted term is {m(rf'{tex(a)}\left({tex(r)}\right)^{{{n}}}')}. The tail has the same ratio.",
                       f"Divide the first omitted term by {m(f'1-({tex(r)})')}."),
                      "Start the infinite sum at the first omitted term.",
                      "Find the first omitted term, then divide by one minus the common ratio.",
                      wrong=(total,"That includes the terms before the stopping point."),mark=4)
    if mode==2:
        total=a/(1-r)
        return graded("Recover the ratio from a finite limiting sum",
                      f"A convergent geometric series has first term {m(a)} and sum to infinity {m(total)}. Find the ratio.",
                      r,
                      (f"Substitute into {m(rf'{tex(total)}=\frac{{{tex(a)}}}{{1-r}}')}.",
                       f"Rearrange to {m(r'r=1-\frac{a}{S_\infty}')}. Check that its magnitude is less than one."),
                      "Find the ratio by clearing the denominator before rearranging.",
                      "Solve the sum-to-infinity equation and verify convergence.",
                      wrong=(-r,"Check which side changes sign when isolating the ratio."),mark=3)
    if mode==3:
        choices=(-2-seed%5,-1,1,F(1,2+seed//3%8))
        rotation=seed%4
        ordered=choices[rotation:]+choices[:rotation]
        options={chr(65+i):m(value) for i,value in enumerate(ordered)}
        good=chr(65+ordered.index(choices[3]))
        wrong=chr(65+ordered.index(choices[0]))
        return graded("Decide which ratio gives convergence",
                      "Which of these common ratios gives a convergent geometric series with non-zero first term?",good,
                      (f"Every term must tend to zero. That happens here when {m(r'|r|<1')}.",
                       f"Only {m(choices[3])} lies strictly between −1 and 1."),
                      "Check the magnitude of the ratio, including when the ratio is negative.",
                      "Use the strict inequality on the magnitude of the ratio.",
                      kind="choice",options=options,shown=options[good],
                      wrong=(wrong,"A negative ratio below −1 still makes term magnitudes grow."),mark=2)
    total=a/(1-r)
    assert total*(1-r)==a
    return graded("Find a sum to infinity",f"The geometric series begins {sequence_text((a,a*r,a*r*r))}. Find its sum to infinity.",total,
                  (f"Check that {m(f'|r|={tex(abs(r))}<1')}, so the terms diminish.",
                   f"Apply {m(r'S_\infty=\frac{a}{1-r}')} with {m(a)} and {m(r)}."),
                  "Check convergence before applying the formula.",
                  "Check the ratio and use the sum-to-infinity formula with its signed value.",mark=3)


CONTEXTS=(
    "batteries tested", "reading pages completed", "tiles painted", "food boxes assembled",
    "trees counted", "flyers delivered", "instruments serviced", "postcards printed",
)


def model(seed,mode):
    a=12+seed%21
    d=3+seed//14%8
    n=5+seed//5%9
    object_phrase=CONTEXTS[seed//13%len(CONTEXTS)]
    if mode==1:
        r=2+seed//14%3
        a=2+seed%13
        term=a*r**(n-1)
        return graded("Find the first index to reach a batch target",f"A laboratory begins with {a} small cultures at time zero. The number is multiplied by {r} at the end of each hour. Find the earliest whole hour when the number is at least {term}.",n-1,
                      (f"At hour {m('h')} there are {m(f'{a}({r})^h')}. Initial values correspond to hour zero.",
                       f"Test powers of {r}: hour {n-2} gives {a*r**(n-2)}, then hour {n-1} gives the required value."),
                      "The number of growth periods is zero at the starting time.",
                      "Model the growth with powers and justify the first whole hour that meets the target.",
                      wrong=(n,"The first term corresponds to hour zero."),mark=4)
    term=a+(n-1)*d
    total=sum(a+i*d for i in range(n))
    if mode==2:
        return graded("Recover a daily increase from a total",
                      f"A table records the number of {object_phrase} each day. The first day had {a}. The count increases by a constant number each day and the total for {n} days is {total}. Find the daily increase.",d,
                      (f"Let the common increase be {m('d')}. Use {m(rf'\frac{{{n}}}{{2}}(2({a})+({n}-1)d)={total}')}.",
                       f"Multiply by two, divide by {n}, subtract the two first-term contributions and divide by {n-1}."),
                      "Use a finite arithmetic sum with the increase as the unknown.",
                      "Translate the stated total into the sum formula and isolate the increase.",
                      mark=4)
    return graded("Use an arithmetic sum in a model",
                  f"A table records the number of {object_phrase}. On day 1 the number is {a}, then it rises by {d} each day. Find the total for the first {n} days.",total,
                  (f"The last daily count is {m(f'{a}+({n}-1)({d})={term}')}.",
                   f"Use {m(rf'\frac{{{n}}}{{2}}({a}+{term})')}."),
                  "Distinguish the count on the final day from the total across all days.",
                  "Use the final daily amount and the arithmetic series formula.",
                  wrong=(term,"That is only the amount on the last day."),mark=3)


def exam_models(title,func,modes,shared=False):
    def make(seed,i,v):
        pair=modes[i%len(modes)]
        return title, tuple(func(seed+2*i+(0 if shared else 13*j),mode) for j,mode in enumerate(pair))
    return make


def series_lessons():
    gloss=(("Term","A single quantity of a sequence."),
           ("Series","The sum of indicated terms of a sequence."),
           ("Coefficient","The numerical factor multiplying a given power."),
           ("Common ratio","The factor multiplying a geometric term to give the next."))
    bin_tip="Identify the power you need before expanding and keep exact coefficients throughout."
    ap_tip="Check whether the question asks for one term or the sum, then count steps from the first term."
    bars = "".join(
        f'<rect x="{34+95*i}" y="{161-h}" width="48" height="{h}" rx="3" fill="#629de0"/>' +
        f'<text x="{58+95*i}" y="187" text-anchor="middle">{label}</text>'
        for i,(h,label) in enumerate(((108,"16"),(54,"8"),(27,"4"),(13.5,"2")))
    )
    shrinking = figure(CHAPTER,"shrinking-geometric-terms",
                       "The first four terms have common ratio one half. Later terms contribute increasingly small amounts.",
                       "Bar diagram for the terms 16, 8, 4 and 2.",
                       '<g font-family="system-ui" font-size="17" fill="#15314a"><path d="M22 161H398" stroke="#365e83" fill="none"/>'+bars+'</g>',
                       420,218)
    return (
        Lesson("pascal-binomial","Pascal’s triangle and binomial expansions","Expand positive integer powers with Pascal coefficients and powers of both terms.",
               (Section("pascal-row","Which row supplies the coefficients?",
                        "Number the rows starting with row 0. The row for the exponent lists one multiplier for each term.",
                        "Add two adjacent numbers in one row to obtain the number between them in the next row. The outer entries are one.",
                        "Row n has n plus one entries, including the initial constant term.",
                        (bind(binomial_model,0),bind(binomial_model,1))),
                Section("both-factors","How do the two powers change?",
                        f"In {m(r'\left(a+b\right)^n')}, a typical term is {m(r'\binom nr a^{n-r}b^r')}.",
                        "Let r count choices of the second term. All n factors contribute, with the other n minus r factors contributing the first term.",
                        "Raise the coefficient of x to the same power as x.",
                        (bind(binomial_model,0),bind(binomial_model,0))),
                Section("negative-term","What happens when the x coefficient is negative?",
                        "The powers of a negative second term give alternating signs.",
                        "Keep brackets around the negative coefficient until the power is evaluated. Check the constant and highest-power terms.",
                        "Only odd powers of a negative coefficient are negative.",
                        (bind(binomial_model,1),bind(binomial_model,0)))),
               gloss,16,(exam_models("Expand the binomial and identify a coefficient",binomial_model,((0,1),(1,0),(0,2))),),bin_tip),
        Lesson("target-coefficients","Individual binomial coefficients","Extract a designated coefficient and combine neighbouring powers.",
               (Section("target-index","Which term gives the requested power?",
                        f"In {m('(a+bx)^n')} the selected index r equals the power of x.",
                        "Write the one term that contributes, including its combinatorial factor.",
                        "The numerical coefficient leaves out the variable and its power.",
                        (bind(binomial_model,1),bind(binomial_model,1))),
                Section("two-contributions","Why do two powers contribute to a product?",
                        "In a product with a linear factor, the constant and the x-term can both contribute to the same final power.",
                        "List which binomial powers are needed before calculating either coefficient.",
                        "The x multiplier increases the degree by one. Its partner’s degree is one less.",
                        (bind(binomial_model,2),bind(binomial_model,1))),
                Section("find-unknown","Can a coefficient reveal a missing multiplier?",
                        "A stated coefficient gives an equation for the unknown coefficient in the bracket.",
                        "For the x coefficient, exactly one choice of the x-term is required. All other choices contribute the constant term.",
                        "The coefficient after expansion has other factors besides the unknown.",
                        (bind(independent,1),bind(binomial_model,2)))),
               gloss,24,(exam_models("Read coefficients without fully expanding",binomial_model,((1,2),(2,1),(2,2))),),bin_tip),
        Lesson("general-term","General terms and missing values","Use the general term to find constant terms, missing coefficients and integer powers.",
               (Section("index-condition","How can a reciprocal power cancel an x power?",
                        "Choose the term whose net power of x is zero. Negative and positive indices add when the factors multiply.",
                        "Use the general term with a variable selection index. Equate the net exponent to zero, then check that the index is a permitted integer.",
                        "A constant term can arise after several non-constant factors are multiplied.",
                        (bind(independent,0),bind(independent,0))),
                Section("match-coefficient","How does matching a coefficient form an equation?",
                        "Use the required power to select a term, then equate its scalar part to the given number.",
                        "Isolate what remains unknown in that coefficient. Only then substitute back or compare a second coefficient.",
                        "Keep the factor from the unchanged terms in the bracket.",
                        (bind(independent,1),bind(independent,1))),
                Section("integer-exponent","How do I solve for a positive integer power?",
                        "Choosing x twice contributes a factor n times one fewer than n, divided by two.",
                        "Set up a quadratic in n. The number of repeated factors in a finite binomial expansion is a positive integer.",
                        "Reject algebraic roots outside that domain.",
                        (bind(independent,2),bind(independent,0)))),
               gloss,22,(exam_models("Use the general term to find two missing quantities",independent,((0,2),(1,0),(2,1),(0,1))),),bin_tip),
        Lesson("arithmetic-progressions","Arithmetic progressions and sums","Find a term, a finite sum and missing values from given arithmetic terms.",
               (Section("difference","How does a constant difference fix the sequence?",
                        f"A constant difference d gives {m('u_n=a+(n-1)d')}.",
                        "Subtract a term from its successor to find the signed difference. Count from position 1.",
                        "An arithmetic progression may decrease as well as increase.",
                        (bind(ap,0),bind(ap,2))),
                Section("finite-sum","Why do I average the first and last terms?",
                        "Pairing terms from opposite ends gives equal totals. Multiply the mean of the extremes by the number of terms.",
                        f"Use {m(r'S_n=\frac n2(a+u_n)')} after finding the final term.",
                        "Do not substitute the final term in place of the sum.",
                        (bind(ap,1),bind(model,0))),
                Section("known-positions","Can two later terms recover the start?",
                        "Subtract the later terms and divide by the number of gaps. Then work back to position 1.",
                        "Write the position numbers in a row before setting up equations. Each forward step adds the signed common difference.",
                        "Subtracting two given terms only gives the common difference when the positions are consecutive.",
                        (bind(ap,2),bind(model,2)))),
               gloss,13,(exam_models("Use terms and sums of an arithmetic progression",ap,((0,1),(2,1),(2,0)),True),),ap_tip),
        Lesson("geometric-progressions","Geometric progressions and finite sums","Use a common ratio to find geometric terms, finite sums and missing data.",
               (Section("ratio","How do I identify a geometric progression?",
                        f"Multiplying by the same ratio r at every step gives {m('u_n=ar^{n-1}')}.",
                        "Divide a term by its non-zero predecessor. A negative ratio changes the sign at each step.",
                        "Subtracting neighbouring terms tests for an arithmetic pattern.",
                        (bind(gp,0),bind(gp,2))),
                Section("geometric-sum","How do I add the first n terms?",
                        f"For {m(r'r\ne1')}, use {m(r'S_n=\frac{a(1-r^n)}{1-r}')}.",
                        "The expansion of the numerator and denominator can be checked by subtracting r times the original finite sum from the sum itself.",
                        "When r is one, sum n copies of a instead.",
                        (bind(gp,1),bind(gp,0))),
                Section("find-ratio","How do I use a gap between two positions?",
                        "Divide the later term by the earlier term. The result is the ratio to the power of the index gap.",
                        "For an odd gap, a real root keeps the sign. For an even gap, check the information about the sign before selecting a root.",
                        "A ratio derived from non-consecutive terms needs a root.",
                        (bind(gp,2),bind(gp,1)))),
               gloss,12,(exam_models("Recover a ratio and use a geometric progression",gp,((2,1),(0,1),(2,0)),True),),ap_tip),
        Lesson("infinite-series","Convergent geometric series","Decide when an infinite geometric sum exists and calculate a limit or tail.",
               (Section("test-convergence","When does the limiting sum exist?",
                        f"For a non-zero first term, a geometric series converges when {m(r'|r|<1')}.",
                        "Check the ratio including its sign. With an allowable negative ratio, the terms alternate and their magnitudes diminish.",
                        "A ratio less than one may still have magnitude greater than one.",
                        (bind(infinite,3),bind(infinite,0)),shrinking),
                Section("limit-sum","How do I use the sum to infinity?",
                        f"Since {m('r^n')} tends to zero, take the limit of the finite formula to get {m(r'S_\infty=\frac{a}{1-r}')}.",
                        "The denominator uses the signed ratio. Rearrange the same formula when the limiting sum is given.",
                        "Keep the negative sign when substituting a negative ratio.",
                        (bind(infinite,0),bind(infinite,2))),
                Section("remaining-tail","How do I find the part after n terms?",
                        "The omitted terms form another geometric series, with the same ratio and a new first term.",
                        "Use the first omitted term in the limiting formula, or subtract the initial finite sum from the full limiting sum.",
                        "After n terms, the first omitted term is term n plus one.",
                        (bind(infinite,1),bind(infinite,0)))),
               gloss,10,(exam_models("Use a convergent series and verify its tail",infinite,((0,1),(2,1),(0,2)),True),),ap_tip),
        Lesson("sequence-models","Choosing a progression in a model","Interpret additive or multiplicative change in a multi-step situation.",
               (Section("add-or-multiply","Is the change additive or multiplicative?",
                        "A fixed increase is arithmetic. A fixed multiplier is geometric.",
                        "Write the first three amounts in a table of positions. Check whether the differences or the successive ratios match.",
                        "An increase by a fixed proportion usually changes by a different amount each period.",
                        (bind(model,0),bind(gp,0))),
                Section("rebuild-model","How can the total give an unknown rate?",
                        "A stated total after a fixed number of terms leads to a finite series equation.",
                        "Substitute the first term and term count, label the unknown and solve. Check the units of the answer.",
                        "The total can include the starting value, depending on what the first counted period means.",
                        (bind(model,2),bind(model,0))),
                Section("first-threshold","How do I justify the first time a target is reached?",
                        "Use the nth-term rule to test the threshold and the immediately previous period.",
                        "Check how the first term is indexed. A value supplied at time zero has experienced zero growth steps.",
                        "Rounding to the nearest time may leave the model below the threshold.",
                        (bind(model,1),bind(model,2)))),
               gloss,17,(exam_models("Compare changes, totals and thresholds",model,((0,1),(2,1),(2,0),(1,0))),),ap_tip),
    )


if __name__=="__main__":
    build(CHAPTER,"Series",10,ARCHIVE,series_lessons())
