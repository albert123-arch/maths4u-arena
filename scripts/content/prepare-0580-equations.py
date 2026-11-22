"""Generate the Cambridge 0580 C2.5/E2.5 equations and formulae lessons."""
from hashlib import sha256
from html import escape
import json
from pathlib import Path
from runpy import run_path

ROOT=Path(__file__).resolve().parents[2]
base=run_path(str(Path(__file__).with_name("prepare-0580-number-types.py")))
p,m,task,check,f,line,label=(base[k] for k in ("p","m","task","check","fraction","line","label"))
utilities=run_path(str(Path(__file__).with_name("prepare-0580-ratio-proportion.py")))
number,bank_item=utilities["number"],utilities["bank_item"]


def model(title,prompt,label,expected,field_type,answer,method,work,tip,variables=None):
    q=task(title,prompt,label,expected,[method,work,f"The answer is {m(answer)}."],tip,kind=field_type)
    if variables:
        q["field"]["variables"]=variables
    return dict(q,method=method,result=m(answer))


def construction(i,case=0):
    unit,start,items=2+i%8,4+i%11,3+i%7
    total=start+unit*items
    lhs=f"{start}+{unit}x"
    equation=f"{lhs}={total}"
    if case==0:
        return model("Write an equation for the total cost",
            f"A craft class charges £{start} to join and £{unit} for each session. Tari pays £{total} for {m('x')} sessions. Write an equation in {m('x')}.",
            "Equation",equation,"equation",equation,
            f"The session charge is {m(f'{unit}x')}. Add the joining charge once.",
            f"The cost {m(lhs)} must equal {m(total)}.",
            "Use an equality between the cost rule and the amount paid.",["x"])
    if case==1:
        return number("Use the equation to find a count",
            f"A robot already has {start} recorded trips. It records {unit} more trips each hour until it has {total}. After how many hours does it reach that total?",
            "Number of hours",items,
            f"Let {m('x')} be the number of hours. The total gives {m(equation)}.",
            f"Subtract {start} and divide by {unit}.",
            "Subtract the starting count before dividing by the hourly increase.")
    a=4+i%9
    return model("Write a formula with a fixed and a changing part",
        f"A rowing club puts {a} rowers in every boat. It also has {start} coaches. Write a formula for the total number {m('t')} of people when it uses {m('n')} boats.",
        "Formula",f"t={a}n+{start}","equation",f"t={a}n+{start}",
        f"The boats hold {m(f'{a}n')} rowers altogether.",
        f"Add {m(start)} coaches to that count.",
        "Use a separate term for the people who are not counted per boat.",["t","n"])


def linear(i,case=0):
    x, a,b,c=3+i%11,3+i%7,2+i%5,4+i%13
    if case==0:
        equation=f"{a}x+{c}={a*x+c}"
        method=f"Subtract {m(c)} from both sides, so {m(f'{a}x={a*x}')}."
        work=f"Divide both sides by {m(a)}."
    elif case==1:
        a+=b
        right=c+(a-b)*x
        equation=f"{a}x+{c}={b}x+{right}"
        method=f"Subtract {m(f'{b}x')} from both sides. This leaves {m(f'{a-b}x+{c}={right}')}."
        work=f"Subtract {c} and divide by {a-b}."
    else:
        target=a*(x+b)-c
        equation=f"{a}(x+{b})-{c}={target}"
        method=f"Add {m(c)} to each side to leave {m(f'{a}(x+{b})={target+c}')}."
        work=f"Divide both sides by {a}. Then take {b} away from each side."
    return number("Solve a linear equation",f"Solve {m(equation)}.","x",x,method,work,
        "Perform the same operation on both sides so the equality stays true.")


def formula(i,case=0):
    c,k=2+i%11,3+i%7
    if case==0:
        source=f"p={k}x+{c}"
        numerator=f"p-{c}"
        variables=["p"]
        method=f"Subtract {m(c)} from both sides, giving {m(f'p-{c}={k}x')}."
    else:
        source=fr"p=\frac{{{k}x}}{{{c}}}"
        numerator=f"{c}p"
        variables=["p"]
        method=f"Multiply both sides by {m(c)} to remove the denominator."
    expected=[numerator,str(k)]
    result=fr"x=\frac{{{numerator}}}{{{k}}}"
    q=model("Make x the subject",f"Make {m('x')} the subject of {m(source)}.","Expression for x",
        "", "ratio",result,method,f"Divide both sides by {m(k)} and write the formula with {m('x')} alone on the left.",
        "Work backwards through the operations that produce p.",variables)
    q["field"]["expected"]=expected
    return q


def simple_letter_formula(i):
    c,d=2+i%11,4+i%7
    expr=f"q={d}+{c}a"
    result=f"a=\\frac{{q-{d}}}{{{c}}}"
    q=model("Rearrange and use a simple formula",
        f"The value of {m('q')} is given by {m(expr)}. Write a formula giving {m('a')} in terms of {m('q')}.",
        "Expression for a","","ratio",result,f"Subtract {m(d)} from each side before dividing.",
        f"Divide the resulting expression by {m(c)}.","First undo the added number.",["q"])
    q["field"]["expected"]=[f"q-{d}",str(c)]
    return q


def simultaneous(i,case=0):
    x,y,a,b=2+i%12,3+i%7,3+i%5,2+i%6
    if case==0:
        one,two=f"{a}x+y={a*x+y}",f"{b}x-y={b*x-y}"
        method="Add the two equations to remove y. The equal and opposite coefficients cancel."
        work=f"The result is {m(f'{a+b}x={(a+b)*x}')}. Solve for x, then use the first equation to find y."
        prompt=f"Solve the simultaneous equations {m(one)} and {m(two)}. Give an ordered pair {m('(x,y)')}."
    elif case==1:
        two=f"{b}x+y={b*x+y}"
        offset=a*x-y
        one=f"y={a}x{'-' if offset>=0 else '+'}{abs(offset)}" if offset else f"y={a}x"
        method=f"Use the expression for {m('y')} from the first equation in the second equation."
        work=f"Collect the terms to get {m(f'{a+b}x={(a+b)*x}')}. After dividing, substitute to find {m('y')}."
        prompt=f"Solve {m(one)} and {m(two)} together. Give an ordered pair {m('(x,y)')}."
    else:
        a+=b
        method=f"Let {m('x')} and {m('y')} be the larger and smaller pack prices, in pounds. The two receipts give {m(f'{a}x+y={a*x+y}')} and {m(f'{b}x+y={b*x+y}')}."
        work=f"Subtract the second equation from the first. This leaves {m(f'{a-b}x={(a-b)*x}')}. Use the first receipt to find the small pack price."
        prompt=f"A receipt shows {a} large craft packs and one small pack cost £{a*x+y}. Another shows {b} large packs and one small pack cost £{b*x+y}. Find both prices. Give (large, small) in pounds."
    return model("Find a pair that fits both equations",prompt,"Ordered pair",f"({x},{y})","pairs",
        f"({x},{y})",method,work,"Find one value first. Put it back in an original equation to find the other.")


def fraction_eq(i,case=0):
    x,d,c,n=3+i%12,2+i%7,4+i%9,2+i%5
    if case==0:
        equation=fr"\frac{{{d}x+{d*c}}}{{{d}}}={x+c}"
        method=f"Multiply both sides by {m(d)} to clear the denominator."
        work=f"Subtract {m(d*c)} and divide by {m(d)}."
    elif case==1:
        equation=fr"\frac{{{n*(x+d)}}}{{x+{d}}}={n}"
        method=f"First record {m(f'x\\ne -{d}')}, so the denominator can be multiplied through."
        work=f"Multiply both sides by {m(f'x+{d}')}. Subtract {m(n*d)} from both sides and divide by {m(n)}."
    else:
        a,b=d,d+2
        # Once multiplied by x+a, only the candidate x remains.
        equation=fr"\frac{{x+{b}}}{{x+{a}}}=\frac{{{x+b}}}{{{x+a}}}"
        method=f"Exclude {m(f'x\\ne -{a}')}. Multiply both denominators through to cross-multiply."
        work=f"Collect terms: {m(f'{a-b}x={(a-b)*x}')}. Divide by {m(a-b)} and check the original denominator."
    return number("Clear denominators to solve an equation",f"Solve {m(equation)}.","x",x,method,work,
        "When a denominator contains x, first record the value that makes it zero.")


def fractional_quadratic(i):
    r=2*(3+i%9)+1
    s=-(2*(2+i%7)+1)
    A=(r+s-r*s-1)//2
    B=(r+s+r*s+1)//2
    stem=fr"\frac{{{A}}}{{x-1}}-\frac{{{-B}}}{{x+1}}=1"
    middle=f"{-(r+s):+d}x" if r+s else ""
    quad=f"x^2{middle}{r*s:+d}=0"
    method=f"Exclude {m(r'x=\pm1')}. Multiply every term by {m('(x-1)(x+1)')}."
    work=f"Expand and rearrange to {m(quad)}. Factorise as {m(f'(x-{r})(x+{-s})=0')}; neither candidate was excluded."
    return model("Clear two algebraic denominators",f"Solve {m(stem)}. Give all roots.",
        "Set of roots",f"{{{s},{r}}}","set",fr"x={s}\ \text{{or}}\ x={r}",method,work,
        "List the two excluded values before solving.",["x"])


def discriminant_roots(i,case=0):
    a=i%8+2
    left=-a
    right=3+i%10
    if right==a: right+=1
    middle=a-right
    constant=-a*right
    term=f"{middle:+d}x"
    text=f"x^2{term}{constant:+d}"
    if case==0:
        return model("Use the zero-product rule",f"Solve {m(text+'=0')}. Give both roots.",
            "Set of roots",f"{{{left},{right}}}","set",fr"x={left}\ \text{{or}}\ x={right}",
            "Factorise using two numbers whose product is the constant and whose sum is the middle coefficient.",
            f"The equation becomes {m(f'(x+{a})(x-{right})=0')}. Set each factor equal to zero.",
            "A product of zero means at least one factor is zero.",["x"])
    c=2+i%9
    a=i%8+2
    if case==1:
        end=(3+i%7)**2
        return model("Solve using a completed square",f"Solve {m(f'x^2-{2*a}x{f"{a*a-end:+d}" if a*a!=end else ""}=0')} by completing the square. Give both roots.",
            "Set of roots",f"{{{a-(3+i%7)},{a+(3+i%7)}}}","set",
            fr"x={a-(3+i%7)}\ \text{{or}}\ x={a+(3+i%7)}",
            f"Complete the square: {m(f'(x-{a})^2={end}')} after moving the constant.",
            f"Take both square roots. Then add {a} to each of the two answers.",
            "Use both the positive and negative square root.",["x"])
    b=2*a+1
    text=f"x^2+{b}x-{c}"
    delta=b*b+4*c
    return model("Use the quadratic formula for exact roots",f"Solve {m(text+'=0')} using the quadratic formula. Give both roots exactly.",
        "Set of roots",fr"{{(-{b}-sqrt({delta}))/2,(-{b}+sqrt({delta}))/2}}","set",
        fr"x=\frac{{-{b}\pm\sqrt{{{delta}}}}}{{2}}",
        f"The coefficients are {m('a=1')}, {m(f'b={b}')} and {m(f'c=-{c}')}, so the discriminant is {m(delta)}.",
        f"Substitute the coefficients into the quadratic formula and keep both signs before the square root.",
        "Use the whole numerator over 2a.",["x"])



def crossed(i,case=0):
    r1=-2-i%7
    r2=3+i%11
    sum_roots=r1+r2
    prod=r1*r2
    quad_term=f"{-sum_roots:+d}x" if sum_roots else ""
    if case==0:
        vertical=4+i%6
        other=f"y=x^2{quad_term}{prod+vertical:+d}" if prod+vertical else f"y=x^2{quad_term}"
        first=f"y={vertical}"
        y1=y2=vertical
        method=f"Replace y in the curve equation by the value {m(vertical)} from the line."
    elif case==1:
        slope=3+i%7
        offset=5+i%11
        first=f"y={slope}x+{offset}"
        term=slope-sum_roots
        other=f"y=x^2{f'{term:+d}x' if term else ''}{f'{prod+offset:+d}' if prod+offset else ''}"
        y1,y2=slope*r1+offset,slope*r2+offset
        method="Set the right-hand sides equal since both give y. Move the linear expression to the other side."
    else:
        first=f"x+y={sum_roots}"
        other=f"xy={prod}"
        y1,y2=r2,r1
        method=f"Replace y in the product equation by {m(f'{sum_roots}-x')}. Expand and rearrange to a quadratic."
    coords=f"({r1},{y1});({r2},{y2})"
    answer=fr"({r1},{y1}),\ ({r2},{y2})"
    work=f"Solve {m(f'x^2{quad_term}{prod:+d}=0')}, for x values {m(r1)} and {m(r2)}. Substitute each x into the line to find its matching y."
    return model("Find all matching pairs",f"Solve {m(first)} and {m(other)} together. Give all ordered pairs {m('(x,y)')}.",
        "Coordinate pairs",coords,"pairs",answer,method,work,
        "The line lets you write the second equation as a quadratic in one letter. Find y separately for each x.")


def advanced_formula(i,case=0):
    factor,offset=2+i%8,3+i%11
    if case==0:
        offset=3+i
        source=f"s=kx-{offset}x"
        answer=fr"x=\frac{{s}}{{k-{offset}}}"
        method=f"Factor out the common x to obtain {m(f's=(k-{offset})x')}."
        work=f"Divide both sides by {m(f'k-{offset}')}, which is non-zero."
        q=model("Collect repeated appearances of the subject",
            f"Make x the subject of {m(source)}, where {m(f'k\\ne {offset}')}.",
            "Expression for x","","ratio",answer,method,work,
            "Keep the terms involving x together, then factor out x.",["s","k"])
        q["field"]["expected"]=["s",f"k-{offset}"]
        return q
    if case==1:
        source=fr"r={factor}\sqrt{{x+{offset}}}"
        denominator=factor**2
        numerator=f"r^2-{denominator*offset}"
        answer=fr"x=\frac{{r^2}}{{{denominator}}}-{offset}"
        method=f"Divide by {m(factor)} and square both sides to undo the square root."
        work=f"Subtract {m(offset)} to leave x by itself."
        q=model("Undo a square root in a formula",
            f"Given {m(source)} with {m(r'r\ge0')}, make x the subject.",
            "Expression for x","","ratio",answer,method,work,
            "Undo the outside multiplication before squaring.",["r"])
        q["field"]["expected"]=[numerator,str(denominator)]
        return q
    # The sign condition selects the nonnegative square root.
    known=3+i%10
    source=f"q={known}x^2+{offset}"
    result=fr"x=\sqrt{{\frac{{q-{offset}}}{{{known}}}}}"
    question=f"Given {m(source)} and {m(r'x\ge0')}, rearrange the formula to give x in terms of q."
    interim=f"Subtract {m(offset)} and divide by {m(known)} to isolate the square."
    final=f"Take the non-negative root because {m(r'x\ge0')}."
    q=model("Rearrange a squared variable with a sign condition",question,
        "Expression for x squared","","ratio",fr"x^2=\frac{{q-{offset}}}{{{known}}}",
        interim,f"The intermediate expression gives x squared. Then {final[0].lower()+final[1:]}",
        "Isolate the square before taking the root.",["q"])
    q["field"]["expected"]=[f"q-{offset}",str(known)]
    q["prompt"]=p(question+" For this check, enter the expression for "+m("x^2")+".")
    q["written_prompt"]=p(question)
    q["written_answer"]=m(result)
    q["steps"].insert(2,p(final+" "+m(result)+"."))
    return q


def select(gen,case):
    return lambda index:gen(index,case)


LESSONS=[
 ("model","Build an equation or formula","Turn a relationship into symbols, use the equality and explain what the answer counts.",False,[
  ("equal","When should I write an equals sign?", "An expression describes an amount. An equation says two amounts have the same value. Find the two amounts in the story.",
   "Name the unknown, write the two amounts, then put an equals sign between them.",
   "Give the fixed charge its own term if it is paid once.",select(construction,0),"balance"),
  ("choose","How can an equation find a count?", "Use one letter for the unknown count and write down what each term measures. Then use inverse operations to isolate the count.",
   "Write the result with the units or a word that tells what the number counts.",
   "Check the answer in the original situation, including its units.",select(construction,1),None),
  ("rule","How can I write a rule for changing totals?", "Use letters for both the input and the total. Work out which terms repeat for each new group.",
   "Write a formula that works for every allowed value of the input.",
   "A fixed part is counted once, however many groups there are.",select(construction,2),None)]),
 ("linear","Solving linear equations","Keep both sides equal when solving for x with brackets or unknown terms on both sides.",False,[
  ("reverse","Which operation should I undo first?","Solve by leaving the x term alone, then finding the value of one x.",
   "Apply each inverse operation to both sides.", "Subtracting on the left requires subtracting the same amount on the right.",select(linear,0),"undo"),
  ("sides","What if x is on both sides?","Remove the smaller x term from each side to keep one positive coefficient. You can also solve with a negative coefficient if you keep its sign.",
   "Combine the x terms on one side and the constants on the other.",
   "The sign changes only because you have added or subtracted a term on both sides.",select(linear,1),None),
  ("brackets","What if x is inside a bracket?","You can treat an intact bracket as a single quantity, or expand it carefully. Look for an inverse operation that keeps the steps short.",
   "When isolating an intact bracket, remove the outside operations before changing what is inside.",
   "When expanding instead, multiply every term inside the bracket.",select(linear,2),None)]),
 ("formulae","Changing the subject of a simple formula","Make one letter the subject using inverse operations where the subject appears once.",False,[
  ("once","What does the subject mean?","The subject is the letter isolated on one side. Changing the subject expresses the same relationship in a different order.",
   "Undo the last operation used on the new subject, then undo earlier operations.",
   "Keep the terms grouped with a bracket or a fraction bar.",select(formula,0),"undo"),
  ("denominator","How can I remove a denominator?","Multiply both sides by the denominator. Then continue to undo operations until the intended letter is alone.",
   "When an entire expression is divided, multiply the entire other side by the denominator.",
   "A division by a constant can be undone by multiplying by that constant.",select(formula,1),None),
  ("check","How can I check the new rule?","Choose simple numbers to check one example in both versions. The formula should reproduce the same relationship.",
   "Read the output as a rule in the remaining letter.",
   "A quick numerical check can reveal a sign error. Keep the rearrangement as your mathematical justification.",simple_letter_formula,None)]),
 ("linear-simultaneous","Simultaneous linear equations","Find an ordered pair by elimination or substitution, then check it in both equations.",False,[
  ("eliminate","Which terms can I cancel?","An ordered pair must satisfy both equations. Adding two equalities can remove a letter when its coefficients are opposites.",
   "Add for opposite coefficients. Subtract for equal coefficients.",
   "After finding one letter, substitute it to find the other.",select(simultaneous,0),"lines"),
  ("substitute","When is substitution shorter?","If a letter is already alone, replace that letter in the other equation with its expression.",
   "Use the whole expression when replacing it. Solve the remaining equation in one letter.",
   "Put the two values back in the same order as the requested pair.",select(simultaneous,1),None),
  ("receipts","How can I form two equations from the facts?","Define both unknowns with a unit. Each total gives a separate equation in the same two unknowns.",
   "Arrange like terms in the same columns so you can see what cancels.",
   "Use asked price order when you give the final pair.",select(simultaneous,2),None)]),
 ("fractional","Solving equations with fractions","Clear numeric or linear denominators and check candidates against the original equation.",True,[
  ("constant","How do I clear a numerical denominator?","Multiply both sides by a common denominator. If either side has several terms, multiply all of them.",
   "Clear numerical denominators using a common multiple.",
   "A fraction bar groups all the terms in the numerator.",select(fraction_eq,0),"group"),
  ("excluded","What if a denominator contains the unknown?","Before clearing the denominator, decide which x would make it zero. That value is outside the original equation.",
   "State the restriction, multiply through, then reject any excluded candidate.",
   "A simplified equation may be defined at a value where the original one is undefined.",select(fraction_eq,1),None),
  ("both","What if there are fractions on both sides?","Record both restrictions and multiply by both denominators. Cross-multiplication gives the same cleared equation in this layout.",
   "Check the answer in the original equation with both denominators.",
   "A cross-product method applies to an equality between fractions.",select(fraction_eq,2),None),
  ("several","How do I combine several fractions in an equation?","Choose a product of denominators so every fraction can be cleared in one line. Simplify the result and solve the new equation.",
   "Multiply each term on both sides by the same product, then check the candidates against the original restrictions.",
   "Include a term with no fraction when multiplying through.",fractional_quadratic,None)]),
 ("quadratic","Solving quadratic equations","Choose factorisation, a completed square or the quadratic formula to find all real roots.",True,[
  ("factors","When can I use two factors?","Make one side zero first. If the quadratic factors, a product of two factors is zero when at least one of them is zero.",
   "Find both root values, then check them against the original equation.",
   "Setting individual factors equal to zero only works when their product is zero.",select(discriminant_roots,0),"quadratic"),
  ("square","What if I can isolate a square?","Complete the square to turn the quadratic equation into a squared bracket equal to a constant. This shows which square roots can occur.",
   "If the constant is positive, take both signs before solving the two linear equations.",
   "A negative value on the right of a real square gives no real root.",select(discriminant_roots,1),None),
  ("formula","Which coefficients enter the formula?","Write the equation with zero on one side. Read the signed coefficients of the square, the first power and the constant.",
   "Use the signed coefficients in the quadratic formula and put the whole numerator above 2a.",
   "Keep exact radical form when the question asks for an exact value.",select(discriminant_roots,2),None)]),
 ("nonlinear","A linear and a nonlinear equation together","Substitute from the line, solve the quadratic and recover all the matching ordered pairs.",True,[
  ("level","How can a horizontal line meet a curve?","The line fixes y at one value. Substitute that value into the curve to find the x coordinates where they meet.",
   "Find every x value, then use the fixed y for both pairs.",
   "List the complete pairs even when they share the same y value.",select(crossed,0),"crossings"),
  ("sloping","What changes when the line slopes?","The line still gives an expression for y. Set that expression equal to the curve's expression and solve for x.",
   "Find the matching y for each x separately.",
   "Putting the same y value into both pairs can lose one of the intersections.",select(crossed,1),None),
  ("product","How can I handle a product of two unknowns?","Use the line to replace one factor of the product. The remaining equation uses just one letter.",
   "After solving the quadratic, substitute in the line and check the product.",
   "Check each pair against both conditions, rather than listing all x and y values separately.",select(crossed,2),None)]),
 ("advanced-formulae","Changing the subject with powers and repeated terms","Collect repeated subject terms or undo roots and powers with the stated sign condition.",True,[
  ("repeated","What if the new subject appears twice?","Bring both terms containing the new subject to the same side. Factor out that letter before dividing.",
   "Write the letter once as a factor outside a bracket.",
   "If dividing by an expression, that expression must be non-zero.",select(advanced_formula,0),"undo"),
  ("root","How do I undo a square root?", "Isolate the root, then square both sides. A principal square root has a non-negative value.",
   "Check the sign condition before squaring. Keep the rest of the radicand grouped.",
   "Do not square only part of a fraction.",select(advanced_formula,1),None),
  ("power","Which square root is allowed after rearranging?", "Once a squared subject is isolated, read the sign restriction. In a length formula the appropriate root is non-negative.",
   "State the sign condition. Without one a real squared equation can have two signs.",
   "If the problem gives a physical length, check that the proposed value fits its domain.",select(advanced_formula,2),None)]),
]



def figures():
    folder=ROOT/"public/assets/study/0580/equations"
    folder.mkdir(parents=True,exist_ok=True)
    ink,blue,green="#243f61","#226778","#287a5f"
    def rect(x,y,w,h,colour="#c9dcf2"):
        return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="6" fill="{colour}"/>'
    axes=line(52,95,360,95)+line(178,15,178,118)
    curves='<path d="M 90 20 Q 200 220 310 20" fill="none" stroke="#226778" stroke-width="3"/>'
    art={
      "balance":("Two level platforms of a balance with equal loads.",
        line(65,76,335,76,ink)+'<path d="M 180 109 L 200 76 L 220 109 Z" fill="#c9dcf2" stroke="#243f61"/>'+
        rect(83,47,61,28)+rect(256,47,61,28,"#addccf")+label(112,65,"Cost")+label(286,65,"Paid"),
        "If the amounts are equal, applying the same change to both sides keeps them equal."),
      "undo":("Two operations shown in reverse order, with arrows from right to left.",
        rect(52,44,90,38)+rect(155,44,90,38)+rect(258,44,90,38)+
        label(96,68,"Unknown")+label(200,68,"Undo first")+label(302,68,"Given")+
        line(279,31,122,31,green)+line(122,31,130,26,green)+line(122,31,130,36,green),
        "Start from the given result and work back through the operations."),
      "lines":("Two distinct straight lines intersect at one marked point.",
        axes+line(78,105,315,20,blue)+line(82,24,329,96,green)+
        '<circle cx="204.38" cy="59.67" r="5" fill="#243f61"/>',
        "The point where the lines meet satisfies both equations."),
      "group":("A bar groups two parts in the numerator over a single denominator.",
        rect(89,14,103,30)+rect(206,14,103,30,"#addccf")+line(80,55,321,55,ink)+
        rect(139,63,123,30)+label(139,36,"First term")+label(257,36,"Second term")+label(200,84,"Denominator"),
        "The denominator divides the whole group above the fraction bar."),
      "quadratic":("A parabola crosses the horizontal axis at two points.",
        axes+curves+'<circle cx="145" cy="95" r="5" fill="#243f61"/><circle cx="255" cy="95" r="5" fill="#243f61"/>',
        "A quadratic can have two real roots, one repeated root or no real root."),
      "crossings":("A horizontal line intersects a parabolic curve twice.",
        axes+curves+line(59,84,350,84,green)+
        '<circle cx="134" cy="84" r="5" fill="#243f61"/><circle cx="266" cy="84" r="5" fill="#243f61"/>',
        "The two intersections share their y-coordinate and have different x-coordinates."),
    }
    result={}
    for name,(alt,drawing,caption) in art.items():
        text=('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 126" role="img" aria-labelledby="title">'
              f'<title id="title">{escape(alt)}</title><rect width="400" height="126" rx="10" fill="white"/>{drawing}</svg>\n')
        (folder/f"{name}.svg").write_text(text,encoding="utf-8")
        result[name]=dict(src=f"/assets/study/0580/equations/{name}.svg",alt=alt,caption=p(caption),width=400,height=126)
    return result


def build():
    pictures=figures()
    lessons,study,questions=[],{},[]
    for key,title,summary,extended,methods in LESSONS:
        id=f"igcse-0580-equations-{key}"
        sections,examples,extra=[],[],[]
        for j,(anchor,heading,intro,idea,mistake,generate,fig) in enumerate(methods):
            first=len(examples)
            for seed in (j+2,j+6):
                q=generate(seed)
                examples.append(dict(title=q["title"],question=q.get("written_prompt",q["prompt"]),
                    solution=q["steps"][:-1] if "written_answer" in q else q["steps"]))
            blocks=[dict(kind="key",html=p(idea),**({"figure":pictures[fig]} if fig else {})),
                dict(kind="example",index=first),check(f"{id}-{anchor}-one",generate(11+j)),
                dict(kind="mistake",html=p(mistake)),dict(kind="example",index=first+1,tryFirst=True),
                check(f"{id}-{anchor}-two",generate(14+j))]
            sections.append(dict(id=anchor,title=heading,label=anchor.capitalize(),minutes=7,level="core",intro=p(intro),blocks=blocks))
            for v in range(2):
                extra.append(check(f"{id}-{anchor}-extra-{v+1}",generate(20+3*j+v)))
        feature=pictures[methods[0][-1]]
        revision="".join(f"<h2>{r[1]}</h2>"+p(r[3]) for r in methods)
        revision+=f'<p><img width="260" src="{feature["src"]}" alt="{escape(feature["alt"],quote=True)}"></p>'
        recaps=[r[5](i+4) for i,r in enumerate(methods[:2])]
        review="<ol>"+"".join("<li>"+q.get("written_prompt",q["prompt"])+p("<strong>Answer.</strong> "+q.get("written_answer",q["result"]))+"</li>" for q in recaps)+"</ol>"
        study[id]=dict(updatedOn="2026-11-22",description=summary,sections=sections,examples=examples,extraPractice=extra,
            glossary=[dict(term=term,definition=p(desc)) for term,desc in [
                ("Equation","An equality between two mathematical expressions."),
                ("Root","A value that makes an equation true."),
                ("Subject","The variable alone on one side of a formula."),
                ("Simultaneous","Two or more conditions which must hold together.")]],
            revision=dict(body=revision,checks=review,examTip=p(methods[-1][4])))
        if lessons:
            prev=lessons[-1]
            study[id]["related"]=[dict(title=prev["title"],href=f"/courses/maths4u-0580/topics/{prev['id']}")]
        title=title+(" (Extended)" if extended else "")
        lessons.append(dict(id=id,key=key,title=title,summary=summary,objective=summary,before=p("Choose an operation that keeps the original relationship true."),
            ideas="".join(p(r[3]) for r in methods),method="".join(f"<h4>{r[1]}</h4>"+p(r[2]) for r in methods),
            mistakes=[r[4] for r in methods],examples=[dict(title=e["title"],question=e["question"],
                solution="".join(e["solution"]),verification=f"{id}-example-{i+1}") for i,e in enumerate(examples[::2])]))
        gens=[r[5] for r in methods]
        families=((0,1),(1,2),(2,0),(0,2),(2,1)) if len(gens)==3 else ((0,1),(1,2),(2,3),(3,0),(3,1))
        for j,(a,b) in enumerate(families):
            family=f"{id}-P{j+1}"
            questions.extend(bank_item(f"{family}-{v}",family,key,[gens[a](30+4*j+v)]) for v in range(2))
            family=f"{id}-E{j+1}"
            for v in range(4):
                seed=71+31*j+v
                questions.append(bank_item(f"{family}-{v}",family,key,[gens[a](seed),gens[b](seed+14)],v))
    pack=dict(schema_version=1,key="0580-algebra-equations",version="1.0.0",
        course=dict(slug="maths4u-0580", title="Cambridge IGCSE Mathematics (0580)", code="0580",direction="igcse"),
        chapter=dict(id="igcse_0580_algebra_equations",slug="equations",title="Equations and formulae",position=22),
        source=dict(sha256=sha256(Path(__file__).read_bytes()).hexdigest(),supplied=0,held=[]),lessons=lessons,questions=questions,marking_status="DRAFT")
    for suffix,content in [("v1",pack),("study",study)]:
        (ROOT/"content/original/0580"/f"equations-{suffix}.json").write_text(json.dumps(content,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(f"{len(lessons)} lessons, {len(questions)} bank questions and {len(pictures)} diagrams")


if __name__=="__main__":
    build()
