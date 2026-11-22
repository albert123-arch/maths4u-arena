"""Author the Cambridge 0580 C/E1.14 calculator chapter."""

from decimal import Decimal as D, ROUND_HALF_UP, localcontext
from fractions import Fraction as F
from hashlib import sha256
from html import escape
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
PREFIX = "igcse-0580-calc-"
COURSE = "maths4u-0580"
DATE = "2026-11-22"


def p(text):
    return f"<p>{text}</p>"


def m(tex):
    return r"\(" + escape(str(tex), quote=False) + r"\)"


def frac(value):
    value = F(value)
    if value.denominator == 1:
        return str(value.numerator)
    return ("-" if value < 0 else "") + fr"\frac{{{abs(value.numerator)}}}{{{value.denominator}}}"


def decimal(value,places=None):
    f=F(value)
    with localcontext() as context:
        context.prec=45
        n=D(f.numerator)/D(f.denominator)
        if places is not None:
            return format(n.quantize(D(1).scaleb(-places),rounding=ROUND_HALF_UP),"f")
        return format(n.normalize(),"f")


def question(title,prompt,label,value,steps,hint,wrong=(),*,options=None,result=None):
    field=dict(key="answer",label=label,type="choice" if options else "number",expected=str(value))
    if options:
        field["options"]=options
    return dict(title=title,prompt=p(prompt),field=field,answer=result or (options[value] if options else m(frac(value))),
        solution=[p(s) for s in steps],hint=p(hint),retry=[dict(answer=str(bad),feedback=p(feedback)) for bad,feedback in wrong if bad!=value])


def choice(i,title,prompt,label,answer,steps,hint,distractors):
    labels="ABCD"
    ordered=labels[i%4:]+labels[:i%4]
    correct,*keys=ordered
    options=dict(sorted([(correct,answer),*((key,row[0]) for key,row in zip(keys,distractors))]))
    return question(title,prompt,label,correct,steps,hint,[(key,row[1]) for key,row in zip(keys,distractors)],options=options)


def fraction_entry(i):
    a,b,c,d=6+i%8,3+i%6,6+i%9,2+i%4
    expr=fr"\frac{{{a}+{b}}}{{{c}-{d}}}"
    value=F(a+b,c-d)
    return question("Keep both parts of a fraction together",f"Use your calculator to find {m(expr)}. Give the exact value.",
        "Exact value",value,
        [f"Put {m(f'{a}+{b}')} in the numerator and {m(f'{c}-{d}')} in the denominator. With a division key, enclose both parts in brackets.",
         f"The calculator is dividing {m(a+b)} by {m(c-d)}. The exact answer is {m(frac(value))}."],
        "A fraction bar groups the whole numerator and the whole denominator.",
        [(F(a)+F(b,c)-d,"That result comes from dividing the middle numbers only. Put brackets around both whole parts."),
         (F(a+b,c)-d,"The denominator contains a subtraction. Keep it together before dividing.")])


def root_entry(i):
    a,j=3+i%8,1+i%3
    b=(a+j)**2-a*a
    expr=fr"\sqrt{{{a*a}+{b}}}"
    return question("Check where the square root ends",f"Use your calculator to work out {m(expr)}.","Value of the square root",a+j,
        [f"Enter {m(f'{a*a}+{b}')} inside one root template. In a one-line entry use brackets to put both terms inside the root.",
         f"The whole quantity under the root is {m((a+j)**2)}. Its square root is {m(a+j)}."],
        "Match the horizontal root bar in the question to the part of the screen inside the root.",
        [(a+b,"The addition is under the root bar. Your entry took the root of the first number only.")])


def signed_entry(i):
    a,b=3+i%9,2+i%7
    expr=fr"(-{a})^2+{b}"
    answer=a*a+b
    return question("Enter a negative base with brackets",f"Use your calculator to work out {m(expr)}.","Calculated value",answer,
        [f"Enter the negative sign and {m(a)} within brackets before you press the square key. The base is {m(-a)}.",
         f"The square is {m(a*a)}. Move out of the exponent or close the brackets before adding {m(b)}. This gives {m(answer)}."],
        "Square the bracketed negative number before adding the final term.",
        [(-a*a+b,"A leading minus outside brackets stays outside the square. The negative sign is part of the base here."),
         (a**(2+b),"The final addition is outside the power. Exit the exponent before typing it.")])


def decimal_display(i):
    den=(8,16,20,25,40,50)[i%6]
    n=3+i%17
    value=F(n,den)
    display=decimal(value)
    text=fr"\frac{{{n}}}{{{den}}}"
    return question("Switch a result to decimal form",f"Your calculator shows {m(text)}. Use its answer-format control or divide the numerator by the denominator. Give the exact decimal.",
        "Decimal value",value,
        ["Change the format of the stored fraction to decimal. The answer-format control may have a different name on your model.",
         f"The exact decimal is {m(display)}. Converting the display has kept the same value."],
        "A fraction is numerator divided by denominator. The decimal button changes the way it is shown.",
        [(F(den,n),"Divide the numerator by the denominator in that order.")],result=m(display))


def exact_display(i):
    n=(1+i%6)+7*(i%5)
    value=F(n,7)
    approx=decimal(value,6)
    return choice(i,"Choose the exact calculator result",
        f"The calculator can show {m(frac(value))} or the six-place display {m(approx)}. The question asks for an exact answer. Which result should you write?",
        "Exact result",m(frac(value)),
        ["The decimal form of this fraction continues. The six decimal places on the display omit later digits.",
         f"Use {m(frac(value))}. It records the whole value exactly."],
        "A result can have an exact fraction and a rounded decimal display.",
        [(m(approx),"The decimal is only the number shown to six places. Use the exact fraction."),
         (m(decimal(value,3)),"Rounding again removes more digits. The question asks for the whole value."),
         (m(frac(1/value)),"Turning the fraction over changes the value. Read the exact fraction as shown.")])


def degree_mode(i):
    first=(24,27,32,35,40,47,53,57,62,66,71,76,79,83,86,88,17,19,22)[i%19]
    return choice(i,"Choose a setting for an angle in degrees",
        f"The question includes the angle {m(fr'{first}^\circ')}. Your calculator shows RAD. Which change makes the angle entry match the question?",
        "Calculator setting","Select degrees (DEG or D).",
        [f"The degree sign beside {m(first)} gives the unit. The calculator’s RAD setting expects angles measured in radians.",
         "Change the angle unit to degrees and check the indicator. The keys or menus depend on the model."],
        "Match the angle mode to the unit printed next to the angle.",
        [("Keep RAD and enter the same number.","The calculator would read a value in radians. The degrees symbol in the question matters."),
         ("Switch the answer from a fraction to a decimal.","The answer format and the angle unit are separate settings."),
         ("Turn on a fixed number of decimal places.","A display precision setting does not change the angle unit.")])


def retain_precision(i):
    a,b=5+2*(i%17),3+i%11
    exact=F(a,8)*b
    shown=F(decimal(F(a,8),2))
    return question("Keep the stored value between steps",f"The first step is {m(fr'\frac{{{a}}}{{8}}')}. Write down the result after multiplying that full value by {m(b)}. Give the exact value.",
        "Exact final value",exact,
        [f"The first result is {m(decimal(F(a,8)))}. Carry the full value through by leaving the two steps in one expression or by using the stored last answer.",
         f"Multiply it by {m(b)} to get {m(decimal(exact))}."],
        "Use the value already stored in the calculator. Rounding the first result can change the final answer.",
        [(shown*b,f"Your result matches retyping {m(decimal(shown))}. Keep all digits of the first result until the final calculation.")],result=m(decimal(exact)))


def sensible_size(i):
    a,b=15+i%12,8+i%8
    scale=F(2*b+1,100)
    exact=a*scale
    display=decimal(exact)
    text=fr"{a}\times{decimal(scale)}"
    result=m(display)
    return choice(i,"Use a quick size check",
        f"You want to calculate {m(text)}. The second factor is less than {m('0.5')}. Which displayed result is correct?",
        "Display to keep",result,
        [f"The product must be less than half of {m(a)}, so it must be less than {m(decimal(F(a,2)))}.",
         f"Re-enter the digits carefully. The exact product is {result}."],
        "Multiplying by a positive number less than one half gives less than half of the starting value.",
        [(m(decimal(exact*10)),"This is too large to be less than half the first factor. Check the decimal point you typed."),
         (m(decimal(exact/10)),"This is one tenth of the correct product. Re-enter the second factor as shown."),
         (m(decimal(a+scale)),"The expression asks for multiplication. Check the operation on your display.")])


def inverse_check(i):
    d,q=3+i%11,5+i%17
    n=d*q
    return choice(i,"Check a quotient with the inverse operation",
        f"You calculated {m(fr'{n}\div {d}={q}')}. Which check uses the result to confirm the original division?",
        "Check to use",m(fr"{q}\times {d}={n}"),
        ["Multiplication reverses division. It should return the number you started with.",
         f"Check that {m(fr'{q}\times {d}={n}')}."],
        "Use the opposite operation and check that you return to the original number.",
        [(m(fr"{q}+{d}={n}"),"Adding reverses subtraction. Multiplying reverses division."),
         (m(fr"{q}\div {d}={n}"),"Dividing again applies the original operation a second time."),
         (m(fr"{n}\times {d}={q}"),"Multiply the quotient by the divisor. The result should be the starting number.")])


def final_display(i):
    r=(5+i%15)**2+1+i%4
    with localcontext() as context:
        context.prec=45
        root=D(r).sqrt()
        given=format(root.quantize(D('0.00000001'),rounding=ROUND_HALF_UP),'f')
        answer=format(root.quantize(D('0.001'),rounding=ROUND_HALF_UP),'f')
        early=format(root.quantize(D('0.01'),rounding=ROUND_HALF_UP),'f')
    return question("Use all displayed digits before rounding",f"For {m(fr'\sqrt{{{r}}}')}, the decimal display shows {m(given)}. The question asks for 3 decimal places. What value do you submit?",
        "Value to 3 decimal places",answer,
        [f"Use the full displayed value {m(given)} when deciding the last digit to write.",
         f"The requested final result is {m(answer)}. Keep the full calculator value for any further calculation."],
        "Use the original display to round just once, to the number of places requested.",
        [(early,"The question asks for three decimal places. Return to the full display before rounding.")] if D(early)!=D(answer) else [],result=m(answer))


def money_display(i):
    pounds=3+i%17
    tenths=1+(i*2)%9
    amount=f"{pounds}.{tenths}"
    right=f"£{pounds}.{tenths}0"
    return choice(i,"Write the calculator result as money",
        f"The calculator shows {m(amount)} pounds. Which written amount correctly uses pounds and pence?",
        "Money amount",right,
        [f"The first digit after the point represents tenths of a pound. There are {10*tenths} pence in that part.",
         f"Write two digits for the pence, so {m(amount)} pounds is written {right}."],
        "A tenth of a pound is ten pence. Read both places after the decimal point.",
        [(f"£{pounds}.0{tenths}","This reads the tenths digit as a single penny. Each tenth is ten pence."),
         (f"£{10*pounds+tenths}.00","The digits before the decimal point give the full pounds."),
         (f"£{pounds}.00","The display includes part of a pound. Keep the pence.")])


def time_display(i):
    h=1+i%8
    hundredths=5*(1+(i*7)%19)
    shown=f"{h}.{hundredths:02d}"
    minutes=hundredths*60//100
    return question("Read the minutes in a decimal-hour display",f"The calculator shows a duration of {m(shown)} hours. It contains {h} whole hours and some minutes. How many minutes remain after the {h} whole hours?",
        "Minutes after the whole hours",minutes,
        [f"The decimal part is {m(frac(F(hundredths,100)))} of an hour.",
         f"Multiply that part by {m(60)}. The duration is {h} hours {minutes} minutes."],
        "The numbers after the point represent part of an hour. One hour has 60 minutes.",
        [(hundredths,"The digits after the point count hundredths of an hour. Multiply that fraction by 60 to find minutes.")])


def enter_time(i):
    h=1+i%6
    minutes=3*(1+(i*5)%19)
    value=h+F(minutes,60)
    return question("Enter hours and minutes as a decimal",f"A calculation needs a duration of {h} hours {minutes} minutes in decimal hours. What number should you enter?",
        "Decimal hours",value,
        [f"Write the minutes as {m(fr'\frac{{{minutes}}}{{60}}')} of an hour.",
         f"Add this to {m(h)}. Use {m(decimal(value))} for the decimal-hour entry."],
        "Divide the minutes by 60 before adding them to the whole hours.",
        [(h+F(minutes,100),"Writing the minute digits after the point converts them into hundredths of an hour. Divide by 60 instead.")],result=m(decimal(value)))


def read_dms(i):
    h=1+i%7
    mins=3*(1+(i*4)%19)
    value=h+F(mins,60)
    display=m(fr"{h}^\circ\,{mins}'\,0''")
    return question("Read a time entry from a sexagesimal display",
        f"On a calculator with a sexagesimal time entry, the display for a duration is {display}. Write the duration in decimal hours.",
        "Decimal hours",value,
        [f"For a time calculation, the three groups represent hours, minutes and seconds. The display has {h} hours and {mins} minutes, with no seconds.",
         f"Use {m(fr'{h}+\frac{{{mins}}}{{60}}={decimal(value)}')} decimal hours."],
        "The same display symbols can occur for angles. The question tells you the context is time.",
        [(h+F(mins,100),"These are minutes. Divide them by 60 before including them in a decimal-hour value.")],result=m(decimal(value)))


LESSONS = (
    ("enter-expressions", "Enter calculations accurately", "Copy the grouping of a written calculation into a scientific calculator and check the entry before finding its value.", (
        ("fraction-template", "How do I keep a numerator and denominator together?", 7,
         "Find the main fraction bar in the question. It divides all of the top expression by all of the bottom expression. Decide which numbers belong on each side before you type.",
         r"The fraction \(\dfrac{8+3}{9-4}\) has two grouped expressions. It is one division of the value on top by the value below.",
         "Use a fraction template if your model has one. Enter the top, move to the bottom and enter it. For a one-line entry, put brackets around each whole part and put division between them.",
         "Typing a plus or minus after finishing a fraction changes which part it belongs to. Compare the expression on your screen with the original fraction bar.",fraction_entry,fraction_entry,"entry"),
        ("root-scope", "How far does the root extend?", 6,
         "A written root bar shows which expression the root covers. A calculator may draw a similar bar or put the root expression in brackets on one line.",
         "Include every term beneath the bar in the same root. When you have copied all those terms, move the cursor out of the root or close its brackets.",
         "Point to the first and last term under the written bar. Type those terms with their signs inside one root. Read the grouped entry back before evaluating.",
         "If you leave the root too early, later terms are added or subtracted after the root has been calculated.",root_entry,root_entry,None),
        ("negative-number", "When do I need brackets around a negative number?", 7,
         "A negative sign belongs to a number. Subtraction acts between two expressions. Some calculators use two different keys for those jobs.",
         r"In \((-6)^2\), the whole negative number is the base of the square. In \(-6^2\) the leading minus is outside the power.",
         "Use the sign key or model equivalent to enter the negative number. Put brackets around the negative base before raising it to a power. Exit the power before typing the next operation.",
         "A subtraction sign typed in place of a negative sign can give a syntax error or change the entry. Check both the sign and the brackets.",signed_entry,signed_entry,None),
    )),
    ("read-display", "Read the display and check the mode", "Choose the requested exact or decimal answer and check the angle setting when a question uses degrees.", (
        ("exact-or-decimal", "Which version of the result should I keep?", 7,
         "A calculator can sometimes show one result as a fraction and as a decimal. Read the answer instruction first. It tells you which form to record.",
         "An exact fraction keeps the full value. A decimal display for a recurring fraction has a limited number of places and normally shows an approximation.",
         "Use your model’s answer-format control to view a decimal when the question asks for one. Keep the exact fraction if the question asks for an exact answer. If the task asks for digits displayed, copy the display before rounding.",
         "A decimal approximation can look close to the fraction. If the question asks for the exact value, write the fraction or another exact form.",exact_display,exact_display,"formats"),
        ("convert-the-view", "How do I change the display without changing the result?", 6,
         "The exact-to-decimal control acts on the calculated answer. Its name varies between models. A calculator might label this control as Format or show a symbol for switching between fraction and decimal.",
         "Changing how the answer is displayed keeps the stored value. Some calculators can also limit the number of decimal places they show, so inspect the display before copying it.",
         "If a fraction terminates as a decimal, choose the decimal display and read its digits. You can also divide the numerator by the denominator to find the decimal.",
         "Use the numerator first. Reversing the division gives the reciprocal of the original answer.",decimal_display,decimal_display,None),
        ("degrees-indicator", "What setting matches an angle in degrees?", 6,
         "The unit next to an angle in the question tells you how to enter it for a trigonometric calculation. Check the indicator on your calculator before you type a degree angle.",
         "Use degrees when the question uses degrees. The indicator may say DEG or D. RAD or R indicates radians.",
         "Look up the angle setting on your model. Choose the unit given in the question, then check the indicator on the screen. Angle setting and decimal format are separate controls.",
         "Changing the display to a fraction or decimal leaves the angle unit alone. Check the angle indicator directly.",degree_mode,degree_mode,None),
    )),
    ("precision-and-checking", "Keep precision and check the result", "Use the full stored answer between steps, record the final result as requested, and catch a wrong-looking display.", (
        ("stored-last-answer", "How can I keep all the digits between steps?", 7,
         "If a calculation has two stages, use the full first result in the next stage. Retyping a shortened display can change the final value even when all the operations are correct.",
         "Enter the whole expression with the right grouping, or use the last-answer memory if your model has it. The label ANS is common.",
         "Write the expression you are calculating on paper. Use the exact stored result or the full grouped expression on the calculator. Round only the answer requested at the end.",
         "Copying back a rounded result can spread the error to the next calculation. Use the stored answer before you change it.",retain_precision,retain_precision,"precision"),
        ("final-instruction", "Which digits belong in the final answer?", 6,
         "Look for the answer instruction before writing a number from the display. It may ask for an exact form, all the displayed digits or a stated precision.",
         "Read the original unrounded result for your final rounding decision. If an earlier part asked for a rounded answer, use the full value again when a later part continues the calculation.",
         "Keep your full result on the screen until you have checked how many places the question requests. Apply the stated rounding rule once, at the end.",
         "Two rounds can create a different final digit. Start from the full calculator result for the requested precision.",final_display,final_display,None),
        ("sense-check", "How can I check a result that looks wrong?", 7,
         "Before copying the answer, ask whether its sign and size are plausible. If possible, reverse an operation as a second check.",
         "A positive number multiplied by a factor below one half must give less than half the original value. If you divided, multiply the quotient by the divisor to check that you recover the starting number.",
         "Use a quick size or sign check first. If the result fails, inspect what you typed. Re-enter the calculation with the full brackets and use an inverse check when it is available.",
         "Typing the same mistaken entry twice can repeat the same mistake. Use a different check, such as the inverse operation.",sensible_size,inverse_check,None),
    )),
    ("money-and-time-display", "Read money and time on a calculator", "Interpret decimal money and enter or read durations in decimal hours or a supported hours–minutes–seconds display.", (
        ("money", "How do I write a decimal result as money?", 5,
         "Money in pounds and pence uses two places after the decimal point. A calculator can leave out a trailing zero even when that zero belongs in the written amount.",
         r"\(6.7\) pounds is £6.70. The decimal part is seven tenths of a pound, which is seventy pence.",
         "Read the whole pounds from before the point. Read the pence from the two places after it. Write the unit and use both pence digits.",
         "A tenths digit represents tens of pence. For example, £6.07 names seven pence and gives a different amount from £6.70.",money_display,money_display,"units"),
        ("read-decimal-hours", "How do decimal hours give minutes?", 6,
         "The number before the decimal point is the number of whole hours. The digits after the point describe a fraction of the next hour.",
         r"In \(2.45\) hours, the fractional part is \(0.45\) hour. Multiply by 60 to get \(27\) minutes.",
         "Separate out the whole hours. Multiply the decimal part by 60 to find the remaining minutes. Check that the minutes are fewer than 60.",
         "The digits to the right of the decimal point are parts of one hour. Copying them directly as minutes changes the duration.",time_display,time_display,None),
        ("enter-hours-minutes", "How do I enter hours and minutes correctly?", 8,
         "Check that all parts of the calculation need the same unit. If the entry is in hours, first convert the minutes to a fraction of an hour.",
         r"To enter 4 hours 36 minutes, use \(4+\dfrac{36}{60}=4.6\) hours. Some models also support a sexagesimal entry, shown as \(4^\circ\,36'\,0''\) in a time calculation.",
         "For decimal entry, divide minutes by 60 and add the whole hours. If you use a sexagesimal key, follow your model’s instructions and check whether the display is currently in decimal hours or hours, minutes and seconds.",
         "A sexagesimal display uses symbols that can also appear for angles. Read those three groups as time only when the calculation is about a duration.",enter_time,read_dms,None),
    )),
)


def text(x,y,content,size=14):
    return f'<text x="{x}" y="{y}" text-anchor="middle" dominant-baseline="central" font-size="{size}" font-weight="600">{escape(content)}</text>'


def box(x,y,width,height,colour):
    return f'<rect x="{x}" y="{y}" width="{width}" height="{height}" rx="8" fill="{colour}" stroke="#355474" stroke-width="1.4"/>'


def arrow(start,end,y):
    return f'<path d="M{start},{y}H{end}m-6,-4 6,4 -6,4" stroke="#355474" stroke-width="1.8" fill="none"/>'


def diagram(name,alt,caption,body,height=153):
    folder=ROOT/"public/assets/study/0580/calculator"
    folder.mkdir(parents=True,exist_ok=True)
    svg=(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 380 {height}" role="img" aria-label="{escape(alt,quote=True)}">'
         f'<rect width="380" height="{height}" rx="12" fill="#f8fafc"/>'
         f'<g fill="#173554" font-family="Arial,sans-serif">{body}</g></svg>\n')
    (folder/f"{name}.svg").write_text(svg,encoding="utf-8")
    return dict(src=f"/assets/study/0580/calculator/{name}.svg",alt=alt,caption=p(caption),width=380,height=height)


def diagrams():
    entry=(box(26,18,328,116,"#eaf0f6")+box(69,37,242,32,"#d8eaff")+box(69,83,242,32,"#ccece5")+
        text(190,53,"Whole numerator")+text(190,100,"Whole denominator")+
        '<path d="M78 76h224" stroke="#173554" stroke-width="2.6"/>')
    formats=(box(106,12,168,35,"#d8eaff")+text(190,29,"Stored answer",16)+
        '<path d="M190 47v24m-91 20V71h182v20" fill="none" stroke="#355474" stroke-width="1.7"/>'+
        box(21,91,156,41,"#ccece5")+box(203,91,156,41,"#fff0cc")+text(99,111,"Fraction display")+text(281,111,"Decimal display"))
    precision=(box(16,45,100,49,"#d8eaff")+text(66,62,"First step",13)+text(66,80,"Keep all digits",11)+
        box(140,45,100,49,"#ccece5")+text(190,62,"Next step",13)+text(190,80,"Use stored value",11)+
        box(264,45,100,49,"#fff0cc")+text(314,62,"Final answer",13)+text(314,80,"Round if asked",11)+arrow(118,138,69)+arrow(242,262,69))
    units=(box(27,24,326,40,"#d8eaff")+text(190,43,"Read the unit next to the number",15)+
        box(27,86,148,43,"#ccece5")+text(101,107,"Pounds and pence",13)+box(205,86,148,43,"#fff0cc")+text(279,107,"Hours and minutes",13)+
        '<path d="M190 64v12m-89 10V76h178v10" fill="none" stroke="#355474" stroke-width="1.7"/>')
    return {
        "entry":diagram("fraction-entry","A two-line calculator fraction template. The numerator occupies the whole top line and the denominator occupies the whole lower line.",
            "Keep both whole expressions in the fraction template. The bar separates them.",entry),
        "formats":diagram("answer-formats","One stored calculator answer can be shown as a fraction or as a decimal.",
            "The answer-format control changes the display of the stored value.",formats),
        "precision":diagram("preserve-precision","Three stages. Keep all digits after the first step. Use the stored value in the next step. Round the final answer if requested.",
            "Preserve the stored answer through every intermediate operation.",precision,122),
        "units":diagram("read-the-unit","A unit check branches to pounds and pence for money or hours and minutes for time.",
            "Read the unit before deciding how to interpret the decimal part.",units),
    }


def with_choices(q):
    f=q["field"]
    if "options" not in f:
        return q["prompt"]
    return q["prompt"]+"<ol type=\"A\">"+"".join(f"<li>{text}</li>" for text in f["options"].values())+"</ol>"


def check(uid,q):
    return dict(kind="check",id=uid,title=q["title"],prompt=q["prompt"],field=q["field"],hint=q["hint"],solution="".join(q["solution"]),retry=q["retry"])


def award(code,text):
    return dict(code=code,marks=1,description_html=text)


def small(uid,family,lesson,q,variant,level):
    return dict(id=uid,family_uid=family,lesson=lesson,title=q["title"],collection="variant" if variant else "short",difficulty=level,marks=1,
        prompt_html=q["prompt"],hint_html=q["hint"],answer_html=p(q["answer"]),solution_html="".join(q["solution"]),fields=[q["field"]],
        parts=[dict(label="a",marking_criteria=[award("B1",p(q["answer"]))])],verification=uid)


def written(uid,family,lesson,title,questions,level,variant):
    tasks,answers,solutions,hints,parts=[],[],[],[],[]
    for k,q in enumerate(questions):
        label=chr(97+k)
        criteria=[award("M1",q["solution"][0]),award("A1",p(q["answer"]))] if level>1 else [award("B1",p(q["answer"]))]
        show=""
        if level>1:
            show=p("Explain your choice.") if q["field"]["type"]=="choice" else p("Write down the entry or step that gives this result.")
        tasks.append(f'<li>{with_choices(q)}{show}<span class="marks">[{len(criteria)}]</span></li>')
        answers.append(p(f"({label}) {q['answer']}"))
        solutions.append(f'<h4>({label})</h4>' + "".join(q["solution"]))
        hints.append(p(f"({label})")+q["hint"])
        parts.append(dict(label=label,marking_criteria=criteria))
    return dict(id=uid,family_uid=family,lesson=lesson,title=title,collection="exam",variant_index=variant,marks=sum(len(x["marking_criteria"]) for x in parts),
        difficulty=level,prompt_html='<ol class="parts" type="a">'+"".join(tasks)+"</ol>",answer_html="".join(answers),solution_html="".join(solutions),
        hint_html="".join(hints),fields=[],parts=parts,verification=uid)


BANK = (
    ((fraction_entry,root_entry,signed_entry,fraction_entry,signed_entry),
     (("Group a calculation before entering it",(fraction_entry,root_entry)),("Read brackets and the negative sign",(signed_entry,root_entry)),
      ("Copy the whole expression",(root_entry,fraction_entry,signed_entry)),("Check the scope of each symbol",(signed_entry,root_entry,fraction_entry)),
      ("Enter a root and two different fractions",(fraction_entry,root_entry,fraction_entry)))),
    ((exact_display,decimal_display,degree_mode,decimal_display,degree_mode),
     (("Choose an answer display",(exact_display,decimal_display)),("Match the angle unit",(degree_mode,decimal_display)),
      ("Check the mode before calculation",(degree_mode,exact_display,decimal_display)),("Record the requested result",(decimal_display,exact_display,degree_mode)),
      ("Read two exact calculator results",(exact_display,decimal_display,exact_display)))),
    ((retain_precision,final_display,sensible_size,inverse_check,retain_precision),
     (("Keep the first calculator result",(retain_precision,final_display)),("Check a display by reversing an operation",(inverse_check,sensible_size)),
      ("Check the size and record the final value",(sensible_size,retain_precision,final_display)),("Use precision when continuing a calculation",(retain_precision,final_display,inverse_check)),
      ("Test and verify your calculator results",(inverse_check,sensible_size,retain_precision)))),
    ((money_display,time_display,enter_time,read_dms,time_display),
     (("Read pounds and decimal hours",(money_display,time_display)),("Enter a duration in hours",(enter_time,read_dms)),
      ("Match the unit to the calculator display",(money_display,read_dms,enter_time)),("Read a duration and a money result",(time_display,money_display,enter_time)),
      ("Copy a display into a report",(read_dms,money_display,time_display)))),
)


def glossary(index):
    words=((('Fraction template','A calculator layout that keeps the complete numerator above the denominator.'),('Root template','The part of the display that holds everything under a root.'),('Sign key','A key that makes a number negative on models with a separate sign control.')),
        (('Exact result','A result stated with its full value, such as an exact fraction.'),('Decimal display','A decimal representation of the stored answer.'),('Angle indicator','A small display label showing which angle unit the calculator is using.')),
        (('Stored answer','The full value from the last calculation.'),('Intermediate value','A value used for another step before the final answer.'),('Inverse check','An opposite operation used to recover the input and check a result.')),
        (('Decimal hour','A whole hour with any extra time expressed as a fraction of an hour.'),('Sexagesimal time','A display with separate groups for hours, minutes and seconds.'),('Pence','Hundredths of a pound. Write two digits after the point when showing pounds and pence.')))[index]
    return [dict(term=term,definition=p(desc)) for term,desc in words]


def build():
    visual=diagrams()
    lesson_meta, questions, study=[],[],{}
    for index,(key,title,summary,sections_data) in enumerate(LESSONS):
        uid=PREFIX+key
        sections, examples, extra=[],[],[]
        for j,(anchor,heading,minutes,intro,idea,method,mistake,make,second,svg) in enumerate(sections_data):
            seed=21*(index+1)+9*j
            offset=len(examples)
            for q in (make(seed),second(seed+3)):
                examples.append(dict(title=q["title"],question=with_choices(q),solution=q["solution"]))
            blocks=[dict(kind="key",html=p(idea),**({"figure":visual[svg]} if svg else {})),dict(kind="text",title="Try this method",html=p(method)),
                dict(kind="example",index=offset),check(f"{uid}-{anchor}-a",make(seed+1)),dict(kind="mistake",html=p(mistake)),
                dict(kind="example",index=offset+1,tryFirst=True),check(f"{uid}-{anchor}-b",second(seed+4))]
            if j==len(sections_data)-1:
                blocks.append(dict(kind="tip",html=p("On a calculator paper, show the expression or main mathematical step you used. Check the display and the requested answer format before moving on.")))
            sections.append(dict(id=anchor,title=heading,label=anchor.replace("-"," ").capitalize(),minutes=minutes,level="core",intro=p(intro),blocks=blocks))
            extra.extend([check(f"{uid}-{anchor}-extra-1",make(seed+8)),check(f"{uid}-{anchor}-extra-2",second(seed+11))])
        picture=visual[("entry","formats","precision","units")[index]]
        revision="".join(f"<h2>{data[1]}</h2>"+p(data[4])+p(data[5]) for data in sections_data)
        revision+=f'<p><img src="{picture["src"]}" width="285" alt="{escape(picture["alt"],quote=True)}"></p>'
        related=[dict(title=LESSONS[index-1][1],href=f"/courses/{COURSE}/topics/{PREFIX}{LESSONS[index-1][0]}")] if index else []
        study[uid]=dict(updatedOn=DATE,description=summary,sections=sections,examples=examples,extraPractice=extra,related=related,glossary=glossary(index),
            revision=dict(body=revision,checks="<ul><li>Read back your entry and check the grouping.</li><li>Check that the answer fits the question.</li><li>Write the requested form.</li></ul>",examTip=p(sections_data[-1][6])))
        lesson_meta.append(dict(key=key,id=uid,title=title,summary=summary,objective=summary,before=p("Use the scientific calculator you know. Key names may differ between models."),
            ideas="".join(p(row[4]) for row in sections_data),method="".join(f"<h4>{row[1]}</h4>"+p(row[5]) for row in sections_data),mistakes=[row[6] for row in sections_data],
            examples=[dict(title=e["title"],question=e["question"],solution="".join(e["solution"]),verification=f"{uid}-worked-{i}") for i,e in enumerate(examples[::2],1)]))
        short_families,written_families=BANK[index]
        for j,make in enumerate(short_families):
            family=f"M4U-0580-CALC-{key}-P{j+1}"
            for k in range(2):
                q=make(370+17*index+13*j+k)
                questions.append(small(f"{family}-{k}",family,key,q,k>0,1+min(2,j//2)))
        for j,(name,factories) in enumerate(written_families):
            family=f"M4U-0580-CALC-{key}-W{j+1}"
            for k in range(4):
                prompts=[generate(523+23*index+17*j+k+7*part) for part,generate in enumerate(factories)]
                questions.append(written(f"{family}-{k}",family,key,name,prompts,1+min(3,j),k))
    manifest=dict(schema_version=1,key="0580-number-calculator",version="1.0.0",marking_status="DRAFT",
        course=dict(slug=COURSE,title="Cambridge IGCSE Mathematics (0580)",code="0580",direction="igcse"),
        chapter=dict(id="igcse_0580_calculator",slug="using-a-calculator",title="Using a calculator",position=13),
        source=dict(sha256=sha256(Path(__file__).read_bytes()).hexdigest(),supplied=0,held=[]),lessons=lesson_meta,questions=questions)
    folder=ROOT/"content/original/0580"
    for filename,data in [("using-a-calculator-v1.json",manifest),("using-a-calculator-study.json",study)]:
        (folder/filename).write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(f"{len(lesson_meta)} lessons, {sum(len(s['sections']) for s in study.values())} sections, {len(questions)} bank tasks, {len(visual)} diagrams")


if __name__=="__main__":
    build()
