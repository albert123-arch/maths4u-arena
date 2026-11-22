"""Build the numerical indices chapter for Cambridge IGCSE Mathematics 0580."""

from fractions import Fraction as F
from hashlib import sha256
from html import escape
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
COURSE = "maths4u-0580"
PREFIX = "igcse-0580-indices-"
DATE = "2026-11-22"


def p(text):
    return f"<p>{text}</p>"


def m(tex):
    return r"\(" + escape(str(tex), quote=False) + r"\)"


def tex_fraction(value):
    value = F(value)
    if value.denominator == 1:
        return str(value.numerator)
    sign = "-" if value < 0 else ""
    return sign + fr"\frac{{{abs(value.numerator)}}}{{{value.denominator}}}"


def number(value):
    return m(tex_fraction(value))


def power(base, index):
    return f"{base}^{{{index}}}"


def calc(title, expression, expected, steps, hint, retries=(), *, exponent_base=None):
    if exponent_base is None:
        instruction = f"Work out the exact value of {m(expression)}."
        label = "Exact value"
        answer = number(expected)
    else:
        instruction = f"Write {m(expression)} as a single power of {m(exponent_base)}. Enter the index only."
        label = f"Index on {exponent_base}"
        answer = m(power(exponent_base, expected))
    return dict(title=title,prompt=p(instruction),
        field=dict(key="answer",label=label,type="number",expected=str(expected)),answer=answer,
        steps=[p(s) for s in steps],hint=p(hint),retry=[dict(answer=str(v),feedback=p(f)) for v,f in retries if v!=expected])


def count_factors(i):
    a,n=3+i%6,2+i%4
    parts=r"\times ".join([str(a)]*n)
    return calc("Read repeated factors",parts,n,
        [f"The same number, {m(a)}, is a factor {n} times. The base is {m(a)}.",
         f"The index records the number of copies. The expression is {m(power(a,n))}."],
        "Count the copies of the base, including the first one.",
        [(n-1,"You counted the multiplication signs. Count the factors on both sides of those signs.")],exponent_base=a)


def multiply(i):
    a,n,k=3+i%5,2+i%4,3+(2*i)%5
    first=m(power(a,n))
    second=m(power(a,k))
    answer=n+k
    return calc("Multiply powers with the same base",power(a,n)+r"\times "+power(a,k),answer,
        [f"{first} contains {n} copies of the base as factors. {second} adds {k} copies of the same base.",
         f"Join the two groups and keep the base: {m(power(a,f'{n}+{k}')+'='+power(a,answer))}."],
        "The bases are the same. Count the factors in both groups together.",
        [(n*k,"Multiplying indices is for a power raised to a power. Here two separate powers are multiplied.")],exponent_base=a)


def divide(i):
    a,k=3+i%6,2+(i*2)%5
    n=k+2+i%4
    expr=fr"\frac{{{power(a,n)}}}{{{power(a,k)}}}"
    return calc("Cancel equal factors in a quotient",expr,n-k,
        [f"Cancel {k} copies of {m(a)} from the numerator with the {k} copies in the denominator.",
         f"The rest are in the numerator. Use {m(power(a,f'{n}-{k}')+'='+power(a,n-k))}."],
        "Subtract from the numerator index. The denominator index is the number of copies removed.",
        [(n+k,"You added the indices. In a quotient the denominator copies cancel."),
         (k-n,"The numerator is the starting group. Subtract the denominator index from it.")],exponent_base=a)


def nested(i):
    a,n,k=3+i%6,2+i%3,2+(i*2+1)%4
    expr=power(f"({power(a,n)})",k)
    return calc("Raise a power to another power",expr,n*k,
        [f"The outer index creates {k} groups. Each group contains {n} factors of {m(a)}.",
         f"There are {m(f'{n}\\times{k}={n*k}')} factors of the original base. Write {m(power(a,n*k))}."],
        "Count the number of equal groups and the size of each group.",
        [(n+k,"The outer index repeats a whole group. Count all groups by multiplying the two indices.")],exponent_base=a)


def zero_index(i):
    a,n=3+i%10,2+i%4
    expr=power(a,0)
    return calc("Use the zero-index rule",expr,1,
        [f"The fraction {m(fr'\frac{{{power(a,n)}}}{{{power(a,n)}}}')} compares the same non-zero value with itself. Its value is 1.",
         f"The index rule gives {m(power(a,f'{n}-{n}')+'='+expr)}. It follows that {m(expr+'=1')}."],
        "A non-zero number divided by itself is 1.",[(0,"The index is zero. The value of the power is 1 for a non-zero base.")])


def reciprocal_integer(i):
    a,n=3+i%7,2+i%3
    value=F(1,a**n)
    return calc("Evaluate a negative integer index",power(a,-n),value,
        [f"The negative index means take the reciprocal. Write {m(fr'{power(a,-n)}=\frac{{1}}{{{power(a,n)}}}')}.",
         f"Evaluate the positive-index power below the fraction bar. The answer is {number(value)}."],
        "A negative index moves the positive-index power below a fraction bar.",
        [(-a**n,"The minus sign is part of the index. Use the reciprocal, which stays positive for a positive base."),
         (a**n,"You evaluated the positive index. Now take its reciprocal.")])


def reciprocal_fraction(i):
    a,b,n=2+i%5,5+i%7,2+i%2
    if a==b:
        b+=1
    frac=tex_fraction(F(a,b))
    inv=tex_fraction(F(b,a))
    value=F(b,a)**n
    return calc("Use a negative index on a fraction",power(fr"\left({frac}\right)",-n),value,
        [f"Find the reciprocal of the whole fraction, {m(inv)}. The index is now {m(n)}.",
         f"Raise both parts of the reciprocal to that power. The result is {number(value)}."],
        "Turn the whole fraction over first, then apply the positive index to its numerator and denominator.",
        [(F(a,b)**n,"The index is negative. Turn the fraction over before raising it to the positive power."),
         (F(b,a),"You took the reciprocal correctly. Now raise it to the positive power.")])


def signed_base(i):
    a,n=3+i%7,2+2*(i%2)
    inside=i%2==0
    expr=power(f"(-{a})",-n) if inside else "-"+power(a,-n)
    mag=F(1,a**n)
    value=mag if inside else -mag
    steps = ([f"The brackets put the minus sign inside the base. Its positive even power is {m(a**n)}.",
              f"Take the reciprocal because the index is negative. The result is {number(value)}."] if inside else
             [f"The leading minus sign is outside the power. First evaluate the positive-base power: {m(power(a,-n)+'='+tex_fraction(mag))}.",
              f"Now apply the leading minus sign. The result is {number(value)}."])
    return calc("Check where the minus sign belongs",expr,value,steps,
        "Check the brackets first. A minus sign outside the base is applied after the power.",
        [(-value,"Look at the brackets. They tell you whether the first minus sign belongs to the base.")])


def signed_quotient(i):
    a,k=3+i%5,1+i%4
    top=-k
    bottom=(1+(i*3)%5) * (-1 if i%2 else 1)
    n=top-bottom
    return calc("Subtract a signed index",fr"\frac{{{power(a,top)}}}{{{power(a,bottom)}}}",n,
        [f"The powers have the same base. Use numerator index minus denominator index.",
         f"The index is {m(f'({top})-({bottom})={n}')}. The single power is {m(power(a,n))}."],
        "Include the minus sign on the numerator index when you subtract.",
        [(top+bottom,"Division calls for subtraction. Adding would describe multiplication."),
         (-n,"Subtract the denominator index from the numerator index in that order.")],exponent_base=a)


def signed_product_quotient(i):
    a,first,second,bottom=3+i%5,3+i%5,-1-i%3,2+(i*3)%5
    total=first+second-bottom
    expr=fr"\frac{{{power(a,first)}\times {power(a,second)}}}{{{power(a,bottom)}}}"
    return calc("Combine multiplication and division",expr,total,
        [f"The numerator is a product. Its index is {m(f'{first}+({second})={first+second}') }.",
         f"Subtract the denominator index. The result is {m(power(a,total))}."],
        "Combine the numerator first. Then subtract the index of the denominator.",
        [(first-second-bottom,"The second factor is multiplied, so add its signed index rather than taking it away."),
         (first+second+bottom,"The denominator is divided out. Subtract its index.")],exponent_base=a)


def find_common_base(i):
    a=2+i%4
    t=2+i%2
    k=2+(i*2)%3
    n=1+(i*3)%4
    expr=fr"\frac{{{power(a**t,k)}}}{{{power(a,n)}}}"
    return calc("Rewrite one base to match the other",expr,t*k-n,
        [f"Rewrite {m(a**t)} as {m(power(a,t))}. Raising this to index {m(k)} gives {m(power(a,t*k))}.",
         f"Now the bases match. Divide by subtracting {m(n)} from the numerator index, giving {m(power(a,t*k-n))}."],
        "Check whether the larger base is a power of the smaller base.",
        [(k-n,"The indices belong to different bases in the original fraction. Rewrite the numerator base first."),
         (t+k-n,"The outer index multiplies the index of the inner power.")],exponent_base=a)


def difference_not_law(i):
    a,n=3+i%6,2+i%3
    expr=f"{power(a,n)}+{power(a,n-1)}"
    total=a**n+a**(n-1)
    return calc("Recognise when the product rule does not apply",expr,total,
        [f"The two powers are added. The same-base multiplication rule does not apply to this operation.",
         f"Evaluate each power, then add: {m(f'{a**n}+{a**(n-1)}={total}')}."],
        "Identify the operation between the powers before choosing a rule.",
        [(a**(2*n-1),"The add-the-indices rule requires multiplication between the powers. Here you add their values.")])


def distribute_product(i):
    a,b,n=2+i%4,2+(i*2)%5,2+i%3
    value=(a*b)**n
    return calc("Use the same power on each factor",power(fr"({a}\times {b})",n),value,
        [f"The brackets make the product the base. You can write the whole product {n} times, or give each factor index {m(n)}.",
         f"The separate powers are {m(a**n)} and {m(b**n)}. Multiply them to get {m(value)}."],
        "A power of a product applies to both factors inside the brackets.",
        [(a**n*b,"Both factors are within the brackets. Apply the power to the second factor as well."),
         (a**n+b**n,"The factors stay multiplied after taking their powers.")])


def fractional_root(i):
    root=3+i%8
    k=(2,3,4)[i%3]
    base=root**k
    expr=power(base,fr"\frac{{1}}{{{k}}}")
    radical=fr"\sqrt[{k}]{{{base}}}" if k>2 else fr"\sqrt{{{base}}}"
    return calc("Read a unit fractional index as a root",expr,root,
        [f"The denominator {k} names the root. Rewrite the expression as {m(radical)}.",
         f"The positive number {m(root)} gives {m(base)} when raised to the power {m(k)}. So the root is {m(root)}."],
        "Find the positive number whose power gives this base.",
        [(-root,"The requested root is the positive number. A root calculation does not ask for every solution of an equation."),
         (F(base,k),"The denominator of the index gives a root. It does not divide the base.")])


def fractional_power(i):
    root=2+i%8
    n,k=(2,3) if i%2 else (3,2)
    base=root**n
    expr=power(base,fr"\frac{{{k}}}{{{n}}}")
    radical=fr"\sqrt[{n}]{{{base}}}" if n>2 else fr"\sqrt{{{base}}}"
    return calc("Take a root before raising the power",expr,root**k,
        [f"The denominator {n} gives {m(radical+'='+str(root))}. Taking the root first keeps the number small.",
         f"The numerator {k} says to raise that root to the power {m(k)}. This gives {m(power(root,k)+'='+str(root**k))}."],
        "The denominator gives the root. The numerator gives the power on that root.",
        [(root,"This is the root step. Raise its result to the numerator power."),
         (base**k,"Take the root as well. Both parts of the fractional index matter.")])


def negative_fractional(i):
    root=2+i%7
    n,k=(3,2) if i%2 else (2,3)
    base=root**n
    expr=power(base,fr"-\frac{{{k}}}{{{n}}}")
    value=F(1,root**k)
    return calc("Combine a fractional index and a negative sign",expr,value,
        [f"Use the positive index first. The {'square' if n==2 else 'cube'} root of {m(base)} is {m(root)}.",
         f"Raise the root to the power {m(k)} to get {m(root**k)}. The original index was negative, so the answer is the reciprocal {number(value)}."],
        "Root first, then positive power, then reciprocal.",
        [(root**k,"Your root and power give the correct denominator. Take the reciprocal."),
         (-value,"A negative index means reciprocal. The original positive base keeps the value positive.")])


def rational_base(i):
    n,k=(3,2) if i%2 else (2,3)
    a,b=2+i%4,5+i%5
    if a==b:
        b+=1
    base=F(a,b)**n
    negative=i%3!=0
    value=F(a,b)**(-k if negative else k)
    exp=('-' if negative else '')+fr"\frac{{{k}}}{{{n}}}"
    expr=power(fr"\left({tex_fraction(base)}\right)",exp)
    return calc("Evaluate a fractional index of a fraction",expr,value,
        [f"The denominator of the index is {n}. Take that root of both the numerator and denominator of the base. The root is {number(F(a,b))}.",
         f"Raise the root to the power {m(k)}, giving {number(F(a,b)**k)}." + (f" Take its reciprocal to get {number(value)}." if negative else "")],
        "Apply the root to the whole base fraction. Then use the numerator of the index and check its sign.",
        [(F(a,b)**k,"The original index is negative. The final answer is the reciprocal of that power."),
         (F(a,b),"You found the root. Apply the numerator power and check the sign of the index.")])


LESSONS = (
    ("integer-laws", "Multiply, divide and raise powers",
     "Read an index, join or cancel equal factors and recognise when a power repeats a whole group.", (
        ("read-an-index", "What does an index count?", 5,
         "Think of an index as a short way to record repeated factors. Identify the base first. Everything inside a bracket may be the base. In this chapter you work with numbers. Indices II uses these rules to simplify algebra and find unknown indices.",
         r"In \(7^3\), the base is 7 and the index is 3. The value is \(7\times7\times7\). A base written by itself has index 1.",
         "When rewriting a repeated product, count the copies of the number. The multiplication signs separate the copies.",
         r"\(7^3\) asks for three factors of 7. Multiplying \(7\) by \(3\) gives a different value.",count_factors,count_factors,None),
        ("join-equal-factors", "When do I add the indices?", 6,
         "Look for multiplication between powers of the same base. Expanding a few small powers shows why their groups of factors join.",
         r"\(a^m\times a^n=a^{m+n}\) whenever the powers are defined. Keep the common base.",
         "Read the first group and the second group. Add their counts of equal factors. Write the original base with this new index.",
         "Check both the operation and the bases. Adding powers or multiplying powers with different bases does not give this rule.",multiply,multiply,"join"),
        ("cancel-equal-factors", "Which index do I subtract?", 6,
         "A fraction bar means division. In a quotient with the same non-zero base, pair up equal numerator and denominator factors. Each pair cancels to 1.",
         r"\(\dfrac{a^m}{a^n}=a^{m-n}\) when \(a\ne0\). Start with the numerator index.",
         "Count the denominator factors being removed. Subtract this number from the numerator index. Read the result as a power of the original base.",
         "The numerator and denominator are ordered. Reversing the subtraction usually produces the reciprocal of the correct result.",divide,divide,None),
        ("grouped-power", "When do I multiply the indices?", 7,
         "An outer index on a bracket repeats the whole inner group. A power of a power has two levels, rather than two separate factors on the same line.",
         r"\((a^m)^n=a^{mn}\). There are \(n\) groups and each group contains \(m\) equal factors when both indices are positive integers.",
         "Find the size of one group and the number of groups. Their product gives the new index.",
         "Two powers next to a multiplication sign use the product rule. A power outside a bracket uses the power-of-a-power rule.",nested,nested,None),
    )),
    ("zero-negative", "Zero and negative indices",
     "Use cancellation to explain the zero index, take reciprocals for negative indices and read signs with brackets.", (
        ("zero-index", "Why does a zero index give one?", 6,
         "Divide a non-zero power by an identical power. Cancelling every matching factor leaves 1, and subtracting equal indices gives zero.",
         r"\(a^0=1\) for \(a\ne0\). Division by zero would not give the argument, so this rule does not define \(0^0\).",
         "To check the value, write a same-base quotient with equal numerator and denominator indices. Compare the value of the quotient with the result of the index rule.",
         "Zero names the index. It does not describe the value of a non-zero base raised to that index.",zero_index,zero_index,"steps"),
        ("negative-index", "How does a negative index change the value?", 7,
         "Go down one index at a time by dividing by the base. After index zero, the next step gives the reciprocal of the base. Further steps add copies of the base in the denominator.",
         r"\(a^{-n}=\dfrac{1}{a^n}\) for \(a\ne0\). If \(a\) is positive, its reciprocal and its powers stay positive.",
         "Write the reciprocal of the positive-index power. Evaluate that power exactly, then reduce the fraction if you can.",
         "The minus sign on an index asks for a reciprocal. It does not change a positive value into a negative value.",reciprocal_integer,reciprocal_integer,None),
        ("bracketed-base", "What belongs to the base?", 8,
         "A power outside brackets applies to the whole bracket. The group may be a fraction or an integer with a leading minus sign. Without brackets, a leading minus sign stays outside the power.",
         r"For non-zero \(a,b\), \(\left(\dfrac{a}{b}\right)^{-n}=\left(\dfrac{b}{a}\right)^n\). In \((-a)^{-2}\) the negative base is squared before its reciprocal is taken.",
         "Identify the bracketed base before doing the calculation. For a negative index on a fraction, turn over the entire base fraction and then apply the positive index.",
         r"In \(-5^{-2}\), the power applies to 5 first and the leading minus gives \(-\dfrac1{25}\). In \((-5)^{-2}\) the sign is within the base.",reciprocal_fraction,signed_base,None),
    )),
    ("mixed-integer", "Combine integer indices",
     "Put several index rules in order, rewrite a numerical base to match another and keep addition separate from multiplication.", (
        ("signed-subtraction", "How do I subtract a negative index?", 6,
         "Keep each signed index together when copying it out of the expression. Subtraction remains the quotient rule even if a denominator index is negative.",
         r"For example, \(\dfrac{6^2}{6^{-3}}=6^{2-(-3)}=6^5\). Subtracting a negative index increases the resulting index.",
         "Put brackets around signed indices. Subtract the denominator index from the numerator index. Simplify the signed calculation before deciding if a reciprocal is needed.",
         "Changing the index of a denominator power may change the value of a quotient. Keep the denominator’s minus sign until you have written the subtraction.",signed_quotient,signed_quotient,None),
        ("read-the-operations", "Which rule comes first?", 7,
         "In a quotient, simplify the whole numerator and denominator separately. This gives you two powers to compare rather than several competing operations.",
         r"In \(\dfrac{a^p\times a^q}{a^r}\), the numerator helps form \(p+q\). The denominator then changes the index to \(p+q-r\).",
         "Write a line for the numerator operation. Then subtract the denominator index. If you are asked to evaluate, turn a final negative index into a reciprocal.",
         "Add the numerator’s signed indices. Treat a negative numerator index as a signed addend, not as a signal to flip the whole quotient.",signed_product_quotient,signed_product_quotient,None),
        ("same-numerical-base", "Can I rewrite the bases to match?", 7,
         "Read the base numbers before using any rule. If one is a power of the other, rewrite it and use the power-of-a-power rule to reveal a common base.",
         r"For \(36^3\) and \(6^4\), first use \(36=6^2\). The first power becomes \((6^2)^3=6^6\).",
         "Rewrite the larger base inside brackets. Multiply its inner and outer indices. Now compare the two same-base powers and choose the appropriate operation.",
         "Indices refer to their own bases. Do not subtract two indices until you have found equal bases in a quotient.",find_common_base,find_common_base,"choose"),
        ("operation-check", "What if I see addition or a product in brackets?", 7,
         "Check the main operation before deciding how to simplify. A plus sign between two powers tells you to add their values. A power on a product applies to each factor in that product.",
         r"\((ab)^n=a^nb^n\) for the numerical powers used here. By contrast, \(a^m+a^n\) does not combine by adding indices.",
         "If the whole base is a product, give each factor the outer index. If two powers are added, evaluate separately or factorise a common factor.",
         "The power rule for a product does not distribute across addition. Keep the original operation visible at each step.",difference_not_law,distribute_product,None),
    )),
    ("fractional-extended", "Fractional indices (Extended)",
     "Read the root and power in a fractional index and find exact values for positive numerical bases.", (
        ("unit-fraction-index", "What root does the denominator give?", 6,
         "With a positive base, a fractional index whose numerator is 1 asks for a root. Check the small number that tells you which root to take.",
         r"\(a^{\frac{1}{n}}=\sqrt[n]{a}\) for \(a>0\). Squaring the square root or cubing the cube root takes you back to the base.",
         "Read the denominator and write the radical. Find the positive value that gives the original base when raised to that denominator.",
         "The denominator is the root order. It does not tell you to divide the base by that number.",fractional_root,fractional_root,None),
        ("positive-fraction-index", "Which comes first, the root or the power?", 7,
         "The two numbers in a fractional index have different jobs. Taking the root first can keep the arithmetic much smaller.",
         r"\(a^{\frac{m}{n}}=(\sqrt[n]{a})^m\). The denominator gives the root. The numerator gives the power of that root.",
         "Find the root using the denominator. Write that result before raising it to the numerator power. Check that you carried out both steps.",
         "A single root only finishes the calculation when the numerator is 1. If it is larger, you still have a power to apply.",fractional_power,fractional_power,"fraction"),
        ("negative-fraction-index", "Where does the reciprocal belong?", 7,
         "A negative fractional index combines the root-and-power method with the negative-index rule. The sign acts on the whole value found using the positive index.",
         r"\(a^{-\frac{m}{n}}=\dfrac{1}{(\sqrt[n]{a})^m}\) for \(a>0\). Use the reciprocal as the final step.",
         r"Work out the root, apply the numerator power, then put the result under 1. If the bases match, the quotient rule also works with fractional indices. For example, \(\dfrac{125^{\frac23}}{125^{-\frac13}}=125^{\frac23-(-\frac13)}=125\).",
         "Taking the reciprocal of just the numerator of the exponent changes the question. Keep the root and power together before taking a reciprocal of their value.",negative_fractional,negative_fractional,None),
        ("fraction-base", "What if the base is already a fraction?", 7,
         "When a whole fraction is inside brackets, both numerator and denominator are part of the base. A root can act on both if their individual roots can be found.",
         r"For positive \(a,b\), \(\sqrt[n]{\dfrac{a}{b}}=\dfrac{\sqrt[n]{a}}{\sqrt[n]{b}}\). The following power then acts on both parts of that fraction.",
         "Take the appropriate root of the numerator and denominator. Raise this fraction to the numerator power of the index. Only take a reciprocal if the original index was negative.",
         "Check what the brackets contain before taking a root. Applying the root to just the numerator leaves part of the base unchanged.",rational_base,rational_base,None),
    )),
)


def draw_figure(key, height, alt, caption, body):
    path = ROOT / "public/assets/study/0580/indices-i"
    path.mkdir(parents=True,exist_ok=True)
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 380 {height}" role="img" aria-label="{escape(alt,quote=True)}">'
           f'<rect width="380" height="{height}" rx="12" fill="#f8fafc"/>'
           f'<g fill="#173554" font-family="Arial, sans-serif">{body}</g></svg>\n')
    (path/f"{key}.svg").write_text(svg,encoding="utf-8")
    return dict(width=380,height=height,src=f"/assets/study/0580/indices-i/{key}.svg",alt=alt,caption=p(caption))


def text(x,y,string,size=15):
    return f'<text x="{x}" y="{y}" text-anchor="middle" dominant-baseline="central" font-size="{size}" font-weight="600">{escape(string)}</text>'


def rect(x,y,w,h,fill):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="7" fill="{fill}" stroke="#496482" stroke-width="1.4"/>'


def arrow(x1,x2,y):
    return f'<path d="M{x1} {y}H{x2}m-6 -4 6 4 -6 4" fill="none" stroke="#395676" stroke-width="1.7"/>'


def figures():
    repeated=rect(25,26,142,82,"#d8eaff")+rect(214,26,141,82,"#ccece5")
    repeated+=text(96,49,"First power")+text(285,49,"Second power")
    for point,color in [(x,"#2458a0") for x in [57,83,109,135]]+[(x,"#08705e") for x in [259,285,311]]:
        repeated+=f'<circle cx="{point}" cy="79" r="7" fill="{color}"/>'
    repeated+=text(190,68,"×",21)+text(190,133,"One base in both groups",15)
    steps=""
    for pos,color,label in [(24,"#dcecff","One step above"),(144,"#e0efe8","Zero index"),(264,"#fff0cd","One step below")]:
        steps+=rect(pos,53,92,49,color)+text(pos+46,78,label,11)
    steps+=arrow(117,142,78)+arrow(237,262,78)+text(190,25,"Divide by the base at each step",16)
    chooser=rect(112,17,156,38,"#d8eaff")+text(190,36,"Same base?",17)
    chooser+=('<path d="M190 55v20m-91 20V75h181v20" fill="none" stroke="#395676" stroke-width="1.7"/>')
    chooser+=rect(22,95,155,45,"#ccece5")+text(100,117,"Yes · apply the rule",13)
    chooser+=rect(202,95,155,45,"#fff0cd")+text(280,117,"No · rewrite first",13)
    root=rect(17,26,100,57,"#d8eaff")+rect(139,26,100,57,"#ccece5")+rect(261,26,102,57,"#fff0cd")
    root+=text(67,55,"Take the root",13)+text(189,55,"Raise the power",12)+text(312,47,"Reciprocal",13)+text(312,64,"if negative",11)
    root+=arrow(119,137,55)+arrow(241,259,55)
    return {
        "join":draw_figure("join-factors",158,"Four equal factors in the first group and three in the second group, joined by multiplication.",
            "Each dot represents one factor. Joining the groups gives seven factors of the same base.",repeated),
        "steps":draw_figure("index-steps",124,"Three steps from one index above zero to one index below zero, each dividing the value by the base.",
            "Dividing by the base takes the index down by one at each step.",steps),
        "choose":draw_figure("match-bases",157,"A decision diagram. If the bases match, apply the rule. If they do not match, rewrite the base first.",
            "Look for a common base before combining indices in a product or quotient.",chooser),
        "fraction":draw_figure("fractional-index-order",107,"The calculation proceeds from taking a root to raising a power, then taking a reciprocal only if the index is negative.",
            "For a negative fractional index, take the reciprocal after using both parts of the fraction.",root),
    }


def as_question(q):
    return q["prompt"].replace(" Enter the index only.", "")


def check(uid,q):
    return dict(kind="check",id=uid,title=q["title"],prompt=q["prompt"],field=q["field"],solution="".join(q["steps"]),hint=q["hint"],retry=q["retry"])


def intro_table():
    a = 4
    rows="".join(f'<tr><th scope="row">{m(n)}</th><td>{m(power(a,n))}</td><td>{number(F(a)**n)}</td></tr>' for n in (3,2,1,0,-1,-2))
    return '<div class="table-scroll"><table><thead><tr><th scope="col">Index</th><th scope="col">Power</th><th scope="col">Exact value</th></tr></thead><tbody>'+rows+'</tbody></table></div>'


def show_figure(record):
    return f'<p><img src="{record["src"]}" alt="{escape(record["alt"],quote=True)}" width="285"></p>'


def short(uid,family,lesson,q,variant,level):
    return dict(id=uid,family_uid=family,lesson=lesson,title=q["title"],collection="variant" if variant else "short",
        difficulty=level,marks=1,prompt_html=q["prompt"],hint_html=q["hint"],answer_html=p(q["answer"]),solution_html="".join(q["steps"]),fields=[q["field"]],
        parts=[dict(label="a",marking_criteria=[dict(code="B1",marks=1,description_html=p(q["answer"]+" or an equivalent exact value."))])],verification=uid)


def notation_error(i):
    a,n,k=3+(i%6),2+(i%3),3+(i%2)
    q=m(f"{power(a,n)}+{power(a,k)}={power(a,n+k)}")
    return dict(title="Check an index claim",prompt=p(f"Lea writes {q}. Explain her mistake and find the exact value of the expression on the left."),
        answer=m(a**n+a**k), steps=[p(f"The two powers are joined by addition. Adding the indices would work if these same-base powers were multiplied."),
            p(f"Here the two values must be added: {m(f'{a**n}+{a**k}={a**n+a**k}') }.")],
        hint=p("Check which operation is written between the powers."))


def combine_fractional(i):
    a=2+i%7
    n=2+i%2
    k=1+(i%3)
    expr=fr"\frac{{{power(a**n,fr'\frac{{{k}}}{{{n}}}')}}}{{{power(a**n,fr'-\frac{{1}}{{{n}}}')}}}"
    return calc("Put fractional-index rules together",expr,a**(k+1),
        [f"The denominator index is negative. The numerator equals {m(a**k)} and the denominator equals {number(F(1,a))}.",
         f"Divide by the reciprocal. This multiplies by {m(a)}, giving {m(a**(k+1))}."],
        "Find the common root first. The index in the denominator gives a reciprocal.",
        [(a**(k-1),"Subtracting a negative index increases the power. Check the sign of the denominator index.")])


BANK = (
    ((count_factors,multiply,divide,nested,multiply),
      (("Read and multiply powers",(count_factors,multiply)),("Use a quotient and a nested power",(divide,nested)),
       ("Keep the base fixed",(multiply,divide,nested)),("Read grouped factors",(count_factors,nested,divide)),
       ("Choose and justify the law",(multiply,divide,notation_error)))),
    ((zero_index,reciprocal_integer,reciprocal_fraction,signed_base,reciprocal_integer),
      (("Use the zero and negative index rules",(zero_index,reciprocal_integer)),("Take the reciprocal of a fraction",(reciprocal_fraction,reciprocal_integer)),
       ("Place the leading minus sign",(signed_base,zero_index,reciprocal_integer)),("Check the whole base",(reciprocal_fraction,signed_base,zero_index)),
       ("Distinguish the two minus signs",(signed_base,signed_base,reciprocal_fraction)))),
    ((signed_quotient,signed_product_quotient,find_common_base,distribute_product,difference_not_law),
      (("Keep signs in the quotient",(signed_quotient,signed_product_quotient)),("Rewrite before combining",(find_common_base,distribute_product)),
       ("Use the numerator and denominator in order",(signed_product_quotient,find_common_base,signed_quotient)),
       ("Separate a sum from a product",(difference_not_law,distribute_product,notation_error)),
       ("Choose a method for each operation",(find_common_base,signed_product_quotient,notation_error)))),
    ((fractional_root,fractional_power,negative_fractional,rational_base,combine_fractional),
      (("Read two kinds of fractional index",(fractional_root,fractional_power)),("Find a reciprocal after the root",(negative_fractional,fractional_root)),
       ("Apply the root to a bracketed fraction",(rational_base,fractional_power,negative_fractional)),
       ("Check the sign of each fractional index",(fractional_power,negative_fractional,combine_fractional)),
       ("Combine exact roots and reciprocals",(rational_base,combine_fractional,negative_fractional)))),
)


def written(uid,family,lesson,title,rows,level,variant):
    questions,answers,solutions,hints,criteria=[],[],[],[],[]
    for j,q in enumerate(rows):
        letter=chr(97+j)
        first_step=q["steps"][0]
        if level>1:
            award=[dict(code="M1",marks=1,description_html=first_step),dict(code="A1",marks=1,description_html=p(q["answer"]+" or an equivalent exact result."))]
        else:
            award=[dict(code="B1",marks=1,description_html=p(q["answer"]+" or an equivalent exact result."))]
        count=sum(row["marks"] for row in award)
        opening=as_question(q)+(p("Show your working.") if level>1 and len(q["steps"])>1 else "")
        questions.append(f'<li>{opening}<span class="marks">[{count}]</span></li>')
        answers.append(p(f"({letter}) {q['answer']}"))
        solutions.append(f'<h4>({letter})</h4>'+"".join(q["steps"]))
        hints.append(p(f"({letter})")+q["hint"])
        criteria.append(dict(label=letter,marking_criteria=award))
    marks=sum(row["marks"] for part in criteria for row in part["marking_criteria"])
    return dict(id=uid,family_uid=family,lesson=lesson,title=title,collection="exam",variant_index=variant,marks=marks,difficulty=level,fields=[],
        prompt_html='<ol class="parts" type="a">'+"".join(questions)+"</ol>",answer_html="".join(answers),solution_html="".join(solutions),
        hint_html="".join(hints),parts=criteria,verification=uid)


def glossary(index):
    entries = (
        (("Base","The number or grouped expression raised to a power."),("Index","The small raised number telling you which power to use."),("Same base","The two powers use exactly the same base.")),
        (("Zero index",r"The value of \(a^0\) is 1 when \(a\ne0\)."),("Reciprocal","The result of dividing 1 by a non-zero value."),("Bracketed base","The whole expression inside the brackets is the base.")),
        (("Common base","A base you can use to rewrite both powers in an expression."),("Numerator index","The power on the base in the top part of the quotient."),("Signed indices","Indices that may be positive, zero or negative.")),
        (("Unit fraction","A fraction with numerator 1."),("Root order","The power that takes the root back to the original value."),("Exact value","A value written without approximation or rounding.")),
    )[index]
    return [dict(term=term,definition=p(definition)) for term,definition in entries]


def build():
    diagrams = figures()
    lessons,questions,study=[],[],{}
    for index,(key,title,summary,methods) in enumerate(LESSONS):
        uid=PREFIX+key
        examples,sections,extras=[],[],[]
        for j,(anchor,heading,minutes,intro,idea,method,mistake,make,second,diagram) in enumerate(methods):
            seed=13*(index+1)+9*j
            if anchor=="bracketed-base" and (seed+3)%2:
                follow_seed=seed+4
            else:
                follow_seed=seed+3
            n=len(examples)
            for q in [make(seed),second(follow_seed)]:
                examples.append(dict(title=q["title"],question=as_question(q),solution=q["steps"]))
            key_block=dict(kind="key",html=p(idea),**({"figure":diagrams[diagram]} if diagram else {}))
            blocks=[key_block,dict(kind="text",title="Method",html=p(method))]
            if anchor=="zero-index":
                blocks.append(dict(kind="text",title="Follow the steps down",html=intro_table()))
            blocks.extend([dict(kind="example",index=n),check(f"{uid}-{anchor}-a",make(seed+1)),dict(kind="mistake",html=p(mistake)),
                           dict(kind="example",index=n+1,tryFirst=True),check(f"{uid}-{anchor}-b",second(follow_seed+1))])
            if j==len(methods)-1:
                blocks.append(dict(kind="tip",html=p("Underline the main operation before you choose a law. Give the requested form and write an exact value if asked to evaluate.")))
            topic_title="Extended · "+heading if index==3 else heading
            sections.append(dict(id=anchor,title=topic_title,label=anchor.replace("-"," ").capitalize(),minutes=minutes,
                level="extension" if index==3 else "core",intro=p(intro),blocks=blocks))
            extras.extend([check(f"{uid}-{anchor}-extra-1",make(seed+5)),check(f"{uid}-{anchor}-extra-2",second(follow_seed+5))])
        references = [{"title":LESSONS[index-1][1],"href":f"/courses/{COURSE}/topics/{PREFIX}{LESSONS[index-1][0]}"}] if index else [
            {"title":"Squares, cubes and reciprocals","href":f"/courses/{COURSE}/topics/igcse-0580-number-powers-and-reciprocals"}]
        print_body="".join(f"<h2>{row[1]}</h2>"+p(row[4])+p(row[5]) for row in methods)
        print_body+=show_figure(diagrams[("join","steps","choose","fraction")[index]])
        revision=dict(body=print_body,checks="<ul><li>Identify the base.</li><li>Check the operation and the sign of the index.</li><li>Use the answer form requested in the question.</li></ul>",
            examTip=p(methods[-1][6]))
        study[uid]=dict(updatedOn=DATE,description=summary,sections=sections,examples=examples,extraPractice=extras,glossary=glossary(index),revision=revision,related=references)
        lessons.append(dict(key=key,id=uid,title=title,summary=summary,objective=summary,
            before=p("Check that you can recognise the base and the index before applying a rule."),
            ideas="".join(p(row[4]) for row in methods),method="".join(f"<h4>{row[1]}</h4>"+p(row[5]) for row in methods),mistakes=[row[6] for row in methods],
            examples=[dict(title=e["title"],question=e["question"],solution="".join(e["solution"]),verification=f"{uid}-worked-{j}") for j,e in enumerate(examples[::2],1)]))
        short_families,written_families=BANK[index]
        for j, make in enumerate(short_families):
            family=f"M4U-0580-I1-{key}-P{j+1}"
            for k in range(2):
                q=make(233+8*index+11*j+k)
                questions.append(short(f"{family}-{k}",family,key,q,k>0,1+min(2,j//2)))
        for j,(name,factories) in enumerate(written_families):
            family=f"M4U-0580-I1-{key}-W{j+1}"
            for k in range(4):
                rows=[generate(271+19*index+14*j+k+5*part) for part,generate in enumerate(factories)]
                questions.append(written(f"{family}-{k}",family,key,name+(" (Extended)" if index==3 else ""),rows,1+min(3,j),k))
    manifest=dict(schema_version=1,key="0580-number-indices",version="1.0.0",marking_status="DRAFT",
        course=dict(slug=COURSE,title="Cambridge IGCSE Mathematics (0580)",code="0580",direction="igcse"),
        chapter=dict(id="igcse_0580_indices_i",slug="indices-i",title="Indices I",position=6),
        source=dict(sha256=sha256(Path(__file__).read_bytes()).hexdigest(),supplied=0,held=[]),lessons=lessons,questions=questions)
    folder=ROOT/"content/original/0580"
    for filename,data in [("indices-i-v1.json",manifest),("indices-i-study.json",study)]:
        (folder/filename).write_text(json.dumps(data,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
    print(f"{len(lessons)} lessons, {sum(len(s['sections']) for s in study.values())} sections, {len(questions)} tasks and {len(diagrams)} SVGs")


if __name__=="__main__":
    build()
