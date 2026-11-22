"""Generate independently authored C1.6/E1.6 calculations for Maths4U."""

from decimal import Decimal
from fractions import Fraction
from html import escape
from math import lcm
from pathlib import Path
import hashlib
import json
import runpy

ROOT = Path(__file__).resolve().parents[2]
base = runpy.run_path(str(Path(__file__).with_name("prepare-0580-number-types.py")))
p, m, f, task, table = (base[k] for k in ("p", "m", "fraction", "task", "table"))
check, short, exam, question = (base[k] for k in ("check", "short", "exam", "question_text"))
line, label = (base[k] for k in ("line", "label"))
COURSE = "maths4u-0580"
PATH = "/assets/study/0580/four-operations"


def tex(q):
    q=Fraction(q)
    return f(q.numerator,q.denominator)


def decimal(q, places=None):
    q=Fraction(q)
    value=Decimal(q.numerator)/Decimal(q.denominator)
    return format(value.normalize(),"f") if places is None else format(value,f".{places}f")


def calculation(title, expression, result, steps, hint, wrong=None):
    return task(title, f"Work out {m(expression)} without a calculator.", "Value", result, steps, hint, wrong)


def signed_temperature(i):
    a,b=3+i,7+2*i
    return task("Calculate a signed temperature change",
        f"A store room starts at {m(-a)} °C. Its temperature rises by {b} °C. What is its new temperature?",
        "Temperature in degrees Celsius",b-a,
        [f"Start at {m(-a)} and move right by {b} because the temperature rises.",
         f"Use {a} of those steps to reach zero. There are {b-a} steps left.",
         f"The calculation is {m(f'-{a}+{b}={b-a}')}. The new temperature is {b-a} °C."],
        "Start below zero and take the rise to the right.",
        (a+b,"The starting temperature is negative. First count the steps needed to reach zero."))


def subtract_negative(i):
    a,b = 2+i,5+2*i
    return calculation("Subtract a negative number", f"-{a}-(-{b})", b-a,
        [f"Subtracting {m(-b)} reverses the effect of adding {m(-b)}.",
         f"Replace the subtraction of a negative by addition: {m(f'-{a}+{b}')}." ,
         f"The value is {m(b-a)}."],
        "Subtracting a negative moves right on the number line.",
        (-a-b,"This is the result of adding a negative number. The question subtracts it."))


def signed_products(i):
    a,b = 3+i%10,4+(i//2)%8
    if i%2:
        expr, magnitude, operator = fr"(-{a*b})\div(-{a})", b, "divide"
        detail = m(fr"{a*b}\div {a}={b}")
        sign = "Both numbers are negative, so the quotient is positive."
        result = magnitude
    else:
        expr, magnitude, operator = fr"(-{a})\times {b}", a*b, "multiply"
        detail = m(fr"{a}\times {b}={a*b}")
        sign = "Only one factor is negative, so the product is negative."
        result = -magnitude
    return calculation("Decide the sign of a product or quotient",expr,result,
        [sign, f"On the magnitudes, {operator}: {detail}.", f"Put the sign back to obtain {m(result)}."],
        "Same signs give a positive result. Different signs give a negative result.",
        (-result,"The magnitude is right. Check how many of the two numbers are negative."))


def decimals_add(i):
    a,b=Fraction(32+5*i,10),Fraction(143+8*i,100)
    whole=a+b
    return calculation("Align decimal places",f"{decimal(a)}+{decimal(b)}",whole,
        ["Line up the decimal points. Put tenths below tenths and hundredths below hundredths.",
         f"Write both numbers as hundredths: {int(100*a)} and {int(100*b)}. Add these as whole numbers.",
         f"The sum is {int(100*whole)} hundredths, or {m(decimal(whole))}."],
        "Use a zero in a missing hundredths place before adding.")


def decimals_subtract(i):
    a,b=Fraction(48+6*i,10),Fraction(157+7*i,100)
    total=a-b
    return calculation("Subtract decimals with a missing place",f"{decimal(a)}-{decimal(b)}",total,
        [f"Write {m(decimal(a,2))} so the hundredths are visible.",
         f"Subtract {int(100*b)} hundredths from {int(100*a)} hundredths.",
         f"{int(100*total)} hundredths is {m(decimal(total))}."],
        "You can subtract using hundredths as the unit. Write a zero in a blank place.")


def change(i):
    paid=10+5*(i//3)
    a,b=Fraction(243+5*i,100),Fraction(141+3*i,100)
    result=paid-a-b
    return task("Work out change for two items",
        f"A customer pays £{paid} for a sketchpad costing £{decimal(a,2)} and a pen costing £{decimal(b,2)}. Find the change in pounds.",
        "Change in pounds",result,
        [f"Add the two prices in pence: {int(a*100)} p and {int(b*100)} p.",
         f"The total cost is £{decimal(a+b,2)}. Subtract it from £{paid}.",
         f"The change is £{decimal(result,2)}."],
        "Combine the prices before subtracting from the amount paid.",
        (a+b,"That is the total cost. Subtract it from the amount handed over."))


def decimals_multiply(i):
    a,b=14+i,6+i%13
    result=Fraction(a*b,1000)
    return calculation("Multiply decimals with different lengths",
        fr"{decimal(Fraction(a,10))}\times{decimal(Fraction(b,100))}",result,
        [f"The first factor has {a} tenths. The second has {b} hundredths.",
         f"Multiply the integer counts: {m(fr'{a}\times{b}={a*b}')}. Tenths times hundredths give thousandths.",
         f"The product is {m(decimal(result))}."],
        "Multiply as integers. Then divide by the scale factors for both numbers.")


def decimals_divide(i):
    d,q=3+i%9,4+i
    a,b=Fraction(d*q,100),Fraction(d,100)
    return calculation("Make the divisor a whole number",fr"{decimal(a)}\div{decimal(b)}",q,
        [f"Think of the division as {m(fr'\frac{{{decimal(a)}}}{{{decimal(b)}}}')}.",
         f"Multiply both numbers by 100, so the calculation becomes {m(fr'{d*q}\div {d}')}.",
         f"The answer is {q}. Check that {q} copies of {m(decimal(b))} make {m(decimal(a))}."],
        "Scale both numbers by the same power of ten.")


def decimals_leftover(i):
    length=Fraction(25+i,10)
    count=3+i%6
    piece=Fraction(15+i%12,100)
    remainder=length-count*piece
    return task("Find the length left over",
        f"{count} pieces, each {decimal(piece)} m long, are cut from a {decimal(length)} m ribbon. Find the length of ribbon left.",
        "Leftover length in metres",remainder,
        [f"Find the total removed length by multiplying {count} by {m(decimal(piece))}.",
         f"The pieces use {m(decimal(count*piece))} m. Subtract from the original {m(decimal(length))} m.",
         f"The remaining length is {m(decimal(remainder))} m."],
        "Multiply the piece length by the number of pieces, then subtract.")


def fraction_sum(i,negative=False,mixed=False):
    a,b = (i%3)+1,4+i%4
    c,d = (i%4)+1,6+i%5
    sign=-1 if negative else 1
    whole=1+i%3 if mixed else 0
    first,second=whole+Fraction(a,b),Fraction(c,d)
    target=first+sign*second
    op="-" if negative else "+"
    start=(str(whole)+r"\," if mixed else "")+f(a,b)
    denominator=lcm(first.denominator,second.denominator)
    aa,bb=int(first*denominator),int(second*denominator)
    result=calculation("Use equal-sized parts",start+op+f(c,d),target,
        [f"The parts must be the same size. A common denominator is {denominator}.",
         f"Write {m(fr'\frac{{{aa}}}{{{denominator}}}{op}\frac{{{bb}}}{{{denominator}}}')}. Only change the count on top when combining.",
         f"The result simplifies to {m(tex(target))}."],
        "Rewrite both numbers with the same denominator first.")
    wrong=Fraction(a+sign*c,b+d)+whole
    if wrong!=target:
        result["retry"]=[dict(answer=str(wrong),feedback=p("Adding denominators changes the size of a piece. First represent both values in equal-sized parts."))]
    return result


def fraction_add(i):
    return fraction_sum(i)


def fraction_subtract(i):
    return fraction_sum(i,negative=True)


def mixed_subtract(i):
    return fraction_sum(i,negative=True,mixed=True)


def fraction_product(i):
    a,b=Fraction(i%5+2,i%4+8),Fraction(i%7+3,i%5+9)
    result=a*b
    return calculation("Multiply fractions in exact form",tex(a)+r"\times "+tex(b),result,
        ["Multiply the numerators and multiply the denominators.",
         f"Before simplifying, the product is {m(fr'\frac{{{a.numerator*b.numerator}}}{{{a.denominator*b.denominator}}}')}.",
         f"If the numerator and denominator share a factor greater than 1, cancel it. The result is {m(tex(result))}."],
        "Simplify a factor common to a numerator and a denominator if you see one.")


def fraction_quotient(i):
    a,b=Fraction(i%4+2,i%5+7),Fraction(i%3+4,i%4+8)
    result=a/b
    return calculation("Divide by a fraction",tex(a)+r"\div "+tex(b),result,
        [f"Dividing by the second number is equivalent to multiplying by its reciprocal {m(tex(1/b))}.",
         f"Use {m(tex(a)+r'\times '+tex(1/b))}. Keep the first fraction in its original order.",
         f"The result in simplest form is {m(tex(result))}."],
        "Invert only the divisor, then multiply.",
        (a*b,"That multiplies by the divisor. Use its reciprocal instead."))


def mixed_divide(i):
    n=2+i%4
    a=Fraction(i%3+1,i%4+6)
    divisor=Fraction(i%3+3,i%4+7)
    value=(n+a)/divisor
    return calculation("Divide a mixed number",f"{n}"+r"\,"+tex(a)+r"\div "+tex(divisor),value,
        [f"Rewrite the whole number and fraction together as {m(tex(n+a))}.",
         f"Multiply by the reciprocal of the divisor: {m(tex(n+a)+r'\times '+tex(1/divisor))}.",
         f"The result is {m(tex(value))}. Convert to a mixed number if the question asks for one."],
        "Turn the mixed number into an improper fraction, then invert the divisor.")


def order_brackets(i):
    a,b,c=4+i,3+i%6,2+i%4
    total=a+c*(b+2)
    return calculation("Use the brackets first",fr"{a}+{c}\times({b}+2)",total,
        [f"Calculate the bracket first: {b} plus 2 is {b+2}.",
         f"Then multiply {c} by {b+2} to get {c*(b+2)}.",
         f"Add {a}, giving {total}."],
        "Finish brackets then multiplication before the outer addition.",
        ((a+c)*(b+2),"That adds first. The multiplication sits between the bracket and the addition."))


def order_level(i):
    a,b,c=i%4+2,i%5+3,i%6+2
    return calculation("Work across equal-priority operations",fr"{a*b}\div {b}\times {c}",a*c,
        ["Division and multiplication have equal priority. Read this line from left to right.",
         f"Start with {m(fr'{a*b}\div {b}={a}')}.",
         f"Then {m(fr'{a}\times {c}={a*c}')}."],
        "On the same level, move left to right.",
        (Fraction(a,c),"This treats the last two numbers as a group. There are no brackets around them."))


def order_bar(i):
    a,b,c=i+5,i%6+3,i%4+4
    d=c-2
    result=Fraction(a+b*b,d)
    return calculation("Treat a fraction bar as grouping",fr"\frac{{{a}+{b}^2}}{{{c}-2}}",result,
        [f"The numerator and denominator are separate calculations.",
         f"The numerator is {a+b*b}; the denominator is {d}.",
         f"Divide to find {m(tex(result))}."],
        "Finish the calculation above and below the fraction bar before dividing.")


LESSONS = [
    ("signed","Calculating with signed integers","Follow changes across zero and determine the sign of a product or quotient.",[
        ("directions","Which way should I move?","A positive change moves to the right on a horizontal number line. A negative change moves to the left. Start at the first number and count the change from there.","Draw a short number line for temperatures or levels crossing zero.","A rise changes the temperature by the given amount. It does not give the final temperature directly.",signed_temperature,"signed-jump"),
        ("subtracting","What does subtracting a negative do?","A negative number tells you a direction. Subtracting that number reverses that direction.","Subtract a negative by adding its positive opposite.","Keep the sign on the starting value. Only the operation with the second value changes.",subtract_negative,None),
        ("products","How can I tell the sign before calculating?","For a product or a quotient, deal with the two signs first. Then calculate using the positive magnitudes.","Same signs give positive. Different signs give negative.","The rule about matching signs is for multiplication and division. Addition and subtraction use the size and direction of changes.",signed_products,None),
    ]),
    ("decimal-add-subtract","Adding and subtracting decimals","Align place values before adding or subtracting amounts, lengths and prices.",[
        ("align","Why should the decimal points line up?","Temporarily give the numbers the same smallest place value. This lets you add equal-sized units, such as hundredths.","Line up the units columns, then the tenths and hundredths. Append zeros where needed.","Adding a zero at the end of the fractional part keeps the value unchanged. Moving the decimal point changes it.",decimals_add,"decimal-columns"),
        ("exchange","What if a column is empty?","Write a zero so you can see where the missing digit would sit. If needed, exchange one tenth for ten hundredths before subtracting.","Subtraction keeps the same place values in both rows.","Start at the smallest place. Regroup from the next place to the left if needed.",decimals_subtract,None),
        ("change","How do I check my change?","Prices may have different numbers of displayed digits. Compare and combine them in the same unit before subtracting from the amount paid.","Use pence as whole numbers or keep the decimal points aligned in pounds.","Add the total and your change. The result should be the amount paid.",change,None),
    ]),
    ("decimal-multiply-divide","Multiplying and dividing decimals","Scale decimals to whole counts and check the size of the result.",[
        ("multiply","Where does the decimal point go?","Represent each factor as an integer count of tenths or hundredths. Multiply those counts and put back the place value of their product.","Tenths times hundredths give thousandths. Powers of ten used in both factors affect the product.","The product of two positive decimals below 1 is smaller than either one.",decimals_multiply,"decimal-area"),
        ("divide","How can I make the divisor easier?","A quotient compares two numbers. Multiplying both by an equal non-zero scale leaves the quotient unchanged.","Choose a power of ten that makes the divisor whole.","Scaling only the divisor changes the answer.",decimals_divide,None),
        ("measure","How do I use a repeated decimal length?","Write the measurements in the same unit. Multiply to find the full amount used, then subtract if the question asks what remains.","Check whether the story asks for one piece, all pieces or the remainder.","Keep enough precision to finish the exact decimal calculation.",decimals_leftover,None),
    ]),
    ("fraction-add-subtract","Adding and subtracting fractions","Use equal-sized parts before combining fractions and mixed numbers.",[
        ("equal-parts","Why do the denominators have to match?","A denominator tells you the size of the pieces. If two fractions use different sizes, split their bars into equal-size pieces before adding.","Rewrite both fractions with a common denominator. Then add only the counts on top.","The denominator stays as the common size. Adding the denominators changes the size of every piece.",fraction_add,"equal-parts"),
        ("difference","How do I subtract parts of the same whole?","Draw equal bars to compare what remains. Once the parts match in size, subtract the number of those parts.","Subtract the numerators in the order given. Simplify at the end.","Check the sign. The result can be negative if you subtract a larger value.",fraction_subtract,None),
        ("mixed","What if there is a whole part as well?","A mixed number has a whole part and a fractional part. Rename each whole in the same-sized pieces before subtracting.","Use one common denominator for both complete numbers.","Keep the value of the whole part when converting to an improper fraction.",mixed_subtract,None),
    ]),
    ("fraction-multiply-divide","Multiplying and dividing fractions","Find a fraction of a fraction and use the reciprocal when dividing.",[
        ("overlap","What is a part of a part?","Shade some columns of a grid for one fraction and some rows for another. The overlap shows the product as part of the whole.","Multiply the counts on top and the sizes on bottom, then simplify the result.","A product of proper positive fractions should be smaller than its factors.",fraction_product,"fraction-overlap"),
        ("reciprocal","Why does division use the reciprocal?","Dividing asks how many copies of one number fit into another. If the divisor is a fraction, its reciprocal tells you how many of those pieces make one whole.","Multiply by the reciprocal of the divisor. Keep the first fraction the same.","Only invert the second fraction, the number you are dividing by.",fraction_quotient,None),
        ("mixed","How do I divide when a number is mixed?","Rename the whole part and fraction as one improper fraction. Then use the usual division steps.","Convert any mixed number before applying the reciprocal rule.","For written work, use the final fraction or mixed form requested in the question.",mixed_divide,None),
    ]),
    ("operation-order","Order of operations and brackets","Identify each group and work in the order shown by the notation.",[
        ("groups","What should I work out first?","Brackets group a small calculation inside a bigger one. Finish the inner group before applying the operation outside it.","Start inside brackets. Then do powers and roots, products and quotients, and finally sums and differences.","Writing the next line one step at a time makes it easier to spot which operation is next.",order_brackets,"steps"),
        ("equal-rank","What if the two operations have equal priority?","Multiplication and division share one level. Addition and subtraction share another. Within one level, go from left to right.","Treat division and multiplication as equal priority. Start with whichever is earlier in the line.","The order of letters in a mnemonic does not make division always come first.",order_level,None),
        ("fraction-bar","Where are the hidden brackets?","A fraction bar groups everything written above it and everything below it. A root bar also shows exactly what goes inside its own operation.","Find the value on top and the value below before dividing.","On a calculator, put brackets around an entire numerator or denominator when using the division key.",order_bar,None),
    ]),
]


def diagram(name, alt, markup, caption):
    folder=ROOT/"public"/PATH.lstrip("/")
    folder.mkdir(parents=True,exist_ok=True)
    content=('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 150" role="img" aria-labelledby="title">'
        f'<title id="title">{escape(alt)}</title><rect width="400" height="150" rx="12" fill="#fff"/>{markup}</svg>\n')
    (folder/(name+".svg")).write_text(content,encoding="utf8")
    return dict(src=PATH+"/"+name+".svg",alt=alt,caption=p(caption),width=400,height=150)


def figures():
    blue,green,grey="#2457a8","#087568","#e4edf9"
    axis=line(30,85,370,85)+line(55,50,325,50,green)+line(316,44,325,50,green)+line(316,56,325,50,green)
    for i,num in enumerate(range(-4,4)):
        x=55+round(270*i/7)
        axis+=line(x,78,x,93)+label(x,116,str(num).replace("-","−"))
    axis+=label(195,36,"Move 7 steps right")
    def grid(columns,rows,marked):
        step=min(65,110//rows)
        start=(400-step*columns)//2
        return "".join(f'<rect x="{start+col*step}" y="{15+row*step}" width="{step-3}" height="{step-3}" fill="{marked(col,row)}" rx="2"/>'
            for row in range(rows) for col in range(columns))
    scale=grid(10,10,lambda col,row: green if col<3 and row<4 else "#b1c9e3" if col<3 or row<4 else grey)
    unequal=grid(6,2,lambda col,row:blue if row==0 and col<3 else green if row==1 and col<2 else grey)
    overlap=grid(5,4,lambda col,row:green if row<2 and col<3 else "#b1c9e3" if row<2 or col<3 else grey)
    stages="".join(f'<rect x="63" y="{9+34*i}" width="274" height="27" rx="5" fill="{grey}"/>'+label(200,28+34*i,v)
        for i,v in enumerate(["Bracket groups","Powers and roots","Multiply or divide","Add or subtract"]))
    return {
        "signed-jump":diagram("signed-jump","Number line from minus four to plus three, with a right arrow between them.",axis,"A rise of 7 moves from minus 4 through zero to 3."),
        "decimal-area":diagram("decimal-area","Ten-by-ten grid. Three columns and four rows overlap in twelve squares.",scale,"Three tenths of four tenths occupy twelve hundredths of the grid."),
        "equal-parts":diagram("equal-parts","Two bars split into six pieces each. Three pieces are marked in one bar and two in the other.",unequal,"One half is three sixths and one third is two sixths. In sixths the pieces can be combined."),
        "fraction-overlap":diagram("fraction-overlap","Twenty cells. Three of five columns and two of four rows overlap in six cells.",overlap,"The common part covers six of the twenty equal cells."),
        "steps":diagram("steps","Four levels in order: bracket groups, powers and roots, multiplication or division, then addition or subtraction.",stages,"Do each level before moving to the next. Within an equal-priority level, work left to right."),
    }


MARKED_METHOD = {
    "Calculate a signed temperature change": "Add the rise to the signed starting temperature, or count correctly from the starting point.",
    "Subtract a negative number": "Replace subtraction of the negative number with addition of its positive opposite.",
    "Decide the sign of a product or quotient": "Determine the sign and multiply or divide the magnitudes as stated.",
    "Align decimal places": "Align corresponding place values or express both values as counts of hundredths before adding.",
    "Subtract decimals with a missing place": "Align corresponding place values or express both values as counts of hundredths before subtracting.",
    "Work out change for two items": "Find the total cost and subtract it from the amount paid, or subtract each cost in turn.",
    "Multiply decimals with different lengths": "Multiply the integer counts and account for the decimal places in both factors.",
    "Make the divisor a whole number": "Multiply both dividend and divisor by the same power of ten before dividing.",
    "Find the length left over": "Multiply the length of one piece by the number of pieces and subtract that total from the starting length.",
    "Use equal-sized parts": "Rewrite the values using a common denominator, including any whole part, then combine the numerators.",
    "Multiply fractions in exact form": "Multiply the numerators and denominators, allowing valid cancellation before multiplication.",
    "Divide by a fraction": "Keep the dividend and multiply by the reciprocal of the divisor.",
    "Divide a mixed number": "Convert the mixed number to an improper fraction and multiply by the reciprocal of the divisor.",
    "Use the brackets first": "Evaluate the bracket, then multiply before adding the remaining term.",
    "Work across equal-priority operations": "Apply division and multiplication from left to right.",
    "Treat a fraction bar as grouping": "Evaluate the complete numerator and denominator before dividing.",
}


def build():
    pictures=figures()
    columns=table(["Units","Decimal point","Tenths","Hundredths"],[["6",".","8","0"],["2",".","0","7"]])
    lessons,study,bank=[],{},[]
    for key,title,summary,methods in LESSONS:
        id="igcse-0580-operations-"+key
        sections,examples,extras=[],[],[]
        for j,(anchor,heading,intro,idea,mistake,factory,fig) in enumerate(methods):
            index=len(examples)
            for example in (factory(1+j),factory(4+j)):
                examples.append(dict(title=example["title"],question=question(example),solution=example["steps"]))
            addition=columns+p("The missing hundredths digit in the first row is zero.") if fig=="decimal-columns" else ""
            blocks=[dict(kind="key",html=p(idea)+addition,**({"figure":pictures[fig]} if fig in pictures else {})),
                dict(kind="example",index=index),check(f"{id}-{anchor}-one",factory(j+8)),
                dict(kind="mistake",html=p(mistake)),dict(kind="example",index=index+1,tryFirst=True),
                check(f"{id}-{anchor}-two",factory(j+11))]
            sections.append(dict(id=anchor,title=heading,label=anchor.replace("-"," ").capitalize(),minutes=6,
                level="core",intro=p(intro),blocks=blocks))
            for k in range(2):
                extras.append(check(f"{id}-{anchor}-extra-{k+1}",factory(15+j*2+k)))
        figure=pictures.get(methods[0][-1])
        revision="".join(f"<h2>{row[1]}</h2>"+p(row[3]) for row in methods)
        revision+=f'<p><img width="285" src="{figure["src"]}" alt="{escape(figure["alt"])}"></p>' if figure else columns
        study[id]=dict(updatedOn="2026-11-22",description=summary,sections=sections,examples=examples,extraPractice=extras,
            glossary=[dict(term=s["label"],definition=p(row[3])) for s,row in zip(sections,methods)],
            revision=dict(body=revision,checks="<ul>"+"".join(f"<li>{row[1]}</li>" for row in methods)+"</ul>",examTip=p(methods[-1][4])))
        if lessons:
            prev=lessons[-1]
            study[id]["related"]=[dict(title=prev["title"],href="/courses/"+COURSE+"/topics/"+prev["id"])]
        lessons.append(dict(key=key,id=id,title=title,summary=summary,objective=summary,
            before=p("Make a rough estimate, then test the method in the first example."),
            ideas="".join(p(row[3]) for row in methods),method="".join(f"<h4>{row[1]}</h4>"+p(row[2]) for row in methods),
            mistakes=[row[4] for row in methods],examples=[dict(title=e["title"],question=e["question"],solution="".join(e["solution"]),
                verification=f"{id}-ex-{i+1}") for i,e in enumerate(examples[::2])]))
        methods_only=[row[5] for row in methods]
        for j,(i,seed) in enumerate([(0,6),(1,7),(2,8),(0,13),(2,17)]):
            family=f"{id}-P{j+1}"
            bank.extend(short(f"{family}-{v}",family,key,methods_only[i](seed+v),v>0) for v in range(2))
        for j,(a,b) in enumerate([(0,1),(1,2),(2,0),(0,2),(2,1)]):
            family=f"{id}-E{j+1}"
            for v in range(4):
                i=22+4*j+v
                parts=[methods_only[a](i),methods_only[b](i+3)]
                written=exam(f"{family}-{v}",family,key,title,parts,v,1+min(j,3))
                for part,source in zip(written["parts"],parts):
                    for criterion in part["marking_criteria"]:
                        if criterion["code"]=="M1":
                            criterion["description_html"]=p(MARKED_METHOD[source["title"]])
                bank.append(written)
    pack=dict(schema_version=1,key="0580-number-four-operations",version="1.0.2",
        course=dict(slug=COURSE,title="Cambridge IGCSE Mathematics (0580)",code="0580",direction="igcse"),
        chapter=dict(id="igcse_0580_number_four_operations",slug="four-operations",title="The four operations",position=5),
        source=dict(sha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),supplied=0,held=[]),lessons=lessons,questions=bank,marking_status="DRAFT")
    for filename,o in [("four-operations-study.json",study),("four-operations-v1.json",pack)]:
        (ROOT/"content/original/0580"/filename).write_text(json.dumps(o,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
    print(f"{len(lessons)} lessons, {len(bank)} bank questions, {len(pictures)} diagrams")


if __name__=="__main__":
    build()
