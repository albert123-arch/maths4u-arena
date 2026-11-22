"""Produce independently authored 0580 C2.1/E2.1 introduction to algebra."""
from fractions import Fraction
from hashlib import sha256
from html import escape
import json
from pathlib import Path
from runpy import run_path

ROOT = Path(__file__).resolve().parents[2]
common = run_path(str(Path(__file__).with_name("prepare-0580-number-types.py")))
p, m, frac, task, check, line, label = (common[k] for k in ("p","m","fraction","task","check","line","label"))
ratio = run_path(str(Path(__file__).with_name("prepare-0580-ratio-proportion.py")))
number, bank_item = ratio["number"], ratio["bank_item"]


def write_rule(title, prompt, variables, answer, explanation, work, hint, wrong):
    expected = m(answer)
    q = task(title, prompt, "Expression", answer, [explanation,work,f"The expression is {expected}."],
        hint, wrong, kind="polynomial")
    q["field"]["variables"] = variables
    return dict(q, method=explanation, result=expected)


def plus_or_times(i):
    groups, extra=2+i%8,3+i
    return write_rule("Write repeated groups and the extra items",
        f"There are {groups} bags with {m('n')} counters in each bag, plus {extra} loose counters. Write an expression for the total.",
        ["n"],f"{groups}n+{extra}",f"Multiply the number of bags, {groups}, by the number of counters in each bag, {m('n')}.",
        f"The loose counters add {m(extra)} to the product.","Count the complete bags first.",
        (f"{groups}+n+{extra}","The number of bags and the number inside each bag need multiplying."))


def backward_words(i):
    offset=3+i
    return write_rule("Write a difference in the stated order",
        f"Write an expression for {offset} less than a number {m('x')}.",
        ["x"],f"x-{offset}","Start from the named number. 'Less than' tells you how much to take away.",
        f"Subtract {m(offset)} from {m('x')}.","The words describe a change starting from the named number.",
        (f"{offset}-x","Subtracting x from the given amount goes in the opposite order."))


def group_words(i):
    each, per=4+i%7,2+i%6
    return write_rule("Use brackets for the full group",
        f"A print shop makes {each} packs. Each pack contains {m('a')} large cards and {per} small cards. Write an expression for the total number of cards.",
        ["a"],f"{each}(a+{per})","One complete pack contains both sizes of card. Add the part that varies to the fixed number.",
        f"Multiply one full pack, {m(f'a+{per}')}, by {m(each)}. Use brackets to keep the two sizes together.",
        "The number of packs multiplies the complete contents of one pack.",
        (f"{each}a+{per}","This counts the small cards only once. Each pack has both kinds."))


def positive_sub(i):
    t,r,c=2+i%8,4+i,6+i%11
    return number("Evaluate a rule with one input",
        f"Find the value of {m(f'{r}x+{c}')} when {m(f'x={t}')}.",
        "Value of the expression",r*t+c,
        f"Replace {m('x')} with {m(t)} to get {m(f'{r}\\times {t}+{c}')}.",
        f"Multiply first, then add {m(c)}.",
        "Use multiplication where the number is next to the letter.",
        (r+t+c,"The coefficient multiplies the substituted value."))


def negative_sub(i):
    t,c=2+i%12,5+i%10
    return number("Square a substituted negative value",
        f"Find the value of {m(f'x^2-{c}')} when {m(f'x=-{t}')}.",
        "Value of the expression",t*t-c,
        f"Put the entire negative value in brackets: {m(f'(-{t})^2-{c}')}.",
        f"The square is {m(t*t)} because both factors are negative. Subtract {m(c)} after squaring.",
        "Square the whole negative value inside brackets.",
        (-t*t-c,"The square of a negative number is positive. Put the substituted value in brackets."))


def fractional_sub(i):
    n,d,x=3+i%7,2+i%6,2+i%9
    return number("Substitute a fraction and follow the operation order",
        f"Evaluate {m(f'{n}p+{x}')} when {m('p='+frac(1,d))}. Give an exact value.",
        "Exact value",Fraction(n,d)+x,
        f"Replace {m('p')} by {m(frac(1,d))}. Multiply it by {m(n)}.",
        f"Then add {m(x)} to the product {m(frac(n,d))}.",
        "Multiply the fraction by the coefficient before adding the constant.")


def two_inputs(i):
    a,b,r=2+i%7,-(4+i%11),3+i%6
    return number("Keep the values with the right letters",
        f"Evaluate {m(f'{r}a-b')} for {m(f'a={a}')} and {m(f'b={b}')}.",
        "Value",r*a-b,
        f"Replace both letters: {m(f'{r}\\times{a}-({b})')}.",
        f"The product is {m(r*a)}. Subtracting the negative value is addition.",
        "Keep each value with its named letter. Put a negative value in brackets.",
        (r*a+b,"Subtracting the negative b makes the total go up."))


def context(i):
    units, flat, rate=4+i%8,3+i%7,2+i%11
    return number("Use a formula to find a total cost",
        f"A workshop charges {m('C='+str(flat)+'+'+str(rate)+'n')} pounds for {m('n')} tickets. Find the total cost when the group buys {units} tickets.",
        "Cost in pounds",flat+rate*units,
        f"Put {m(units)} in place of {m('n')}. The fixed amount {m(flat)} stays the same.",
        f"The ticket cost is {m(f'{rate}\\times{units}={rate*units}')}. Add the fixed charge.",
        "The fixed charge is paid once. Multiply only the charge per ticket.",
        ((flat+rate)*units,"The workshop adds the fixed charge once for the group."))


def quotient(i):
    mass, box, count=22+3*i,7+i%4,2+i%7
    formula=m(r'w=\frac{M-b}{n}')
    return number("Replace all the letters in a fraction formula",
        f"Each tray has mass {m('w')} kg. Use {formula}, where {m('M')} is the combined mass of the trays and their crate, {m('b')} is the crate mass and {m('n')} is the number of identical trays. Find {m('w')} when {m(f'M={mass}')}, {m(f'b={box}')} and {m(f'n={count}')}. Give an exact value in kilograms.",
        "Mass per tray in kilograms",Fraction(mass-box,count),
        f"Put the combined mass and crate mass above the division bar, and the count below it.",
        f"The tray mass without its crate is {m(f'{mass}-{box}={mass-box}')}. Then divide by {m(count)}.",
        "Finish the full numerator before dividing by the number of trays.")


LESSONS=[
  ("letters","Letters and expressions","Read what a letter stands for and write simple expressions from everyday quantities.",[
      ("groups","What can a letter represent?","A letter can stand for a quantity that changes. If one bag contains n items, another bag with the same contents also has n items.",
       f"Write {m('3n')} for three copies of {m('n')}. The coefficient counts the copies.",
       "An expression gives a rule that works for different values of the letter.",plus_or_times,"groups"),
      ("order","Where do I start with a difference?","Start from the quantity named after 'less than'. Then take away the stated amount.",
       f"Seven less than {m('x')} is {m('x-7')}.", "Read the words back from your expression to check the order.",backward_words,None),
      ("brackets","When does a group need brackets?","Work out what belongs to one group first. When there are several copies, the multiplication must apply to the whole group.",
       f"For four copies of {m('a+3')}, write {m('4(a+3)')}.",
       "Keeping brackets links the fixed and changing parts of the same group.",group_words,None)]),
  ("substitution","Substitution with one letter","Replace one letter with a given value, including negatives and fractions.",[
      ("one","What does substituting a value mean?","Replace the letter everywhere it appears. Keep the operations in the rule unchanged.",
       f"If {m('x=7')}, then {m('2x+5')} becomes {m(r'2\times7+5')}.",
       "Side-by-side coefficient and letter mean multiply.",positive_sub,"change"),
      ("negative","What changes when the number is negative?","Write brackets around the value before raising it to a power or subtracting it.",
       f"The base in {m('(-4)^2')} is the whole number {m(-4)}.",
       "The negative sign is part of the value you substitute.",negative_sub,None),
      ("fractions","How do I substitute a fraction?","Put the fraction where the letter was. Read the operations outside the fraction afterwards.",
       "Multiply or divide before adding or subtracting unless brackets change the order.",
       "A coefficient multiplies the entire substituted fraction.",fractional_sub,None)]),
  ("formulae","Using formulae with several letters","Match each value to its letter, follow the order of operations and include the requested unit.",[
      ("match","Which number belongs in which place?","Read the given values with their letters. Mark each letter before filling in its value.",
       "Substitute the given number for each occurrence of the matching letter.",
       "Two different letters can represent different values.",two_inputs,"matching"),
      ("context","Which value changes and which stays fixed?","Read the sentence that defines each letter. For a cost rule, a fixed fee can appear as a separate term.",
       "Only multiply the part of the formula that contains the variable being replaced.",
       "A fixed part of the rule is counted once.",context,None),
      ("fraction","What happens above and below the fraction bar?","The fraction bar separates two groups. Work out the value of each group before dividing.",
       "Preserve brackets and fraction bars when replacing values.",
       "Dividing one part of the numerator separately changes the formula.",quotient,None)]),
]


def figures():
    folder=ROOT/"public/assets/study/0580/introduction-to-algebra"
    folder.mkdir(parents=True,exist_ok=True)
    blue,green="#c8daf2","#a9dccc"
    def rect(x,y,w,h,colour):
        return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="7" fill="{colour}"/>'
    def arrow(start,end,y):
        return line(start,y,end,y)+line(end-8,y-5,end,y)+line(end-8,y+5,end,y)
    art={
      "groups":("Three equal bags followed by three loose counters.",
        "".join(rect(42+77*i,38,60,52,blue)+label(72+77*i,70,"n") for i in range(3))+
        "".join(f'<circle cx="{281+27*i}" cy="64" r="9" fill="{green}"/>' for i in range(3)),
        f"The three bags each stand for {m('n')} counters. The loose counters add three more."),
      "change":("Two boxes for the two successive steps in a number rule.",
        label(50,64,"Input")+arrow(80,122,58)+rect(126,38,76,42,blue)+label(164,64,"Double")+
        arrow(205,235,58)+rect(240,38,72,42,green)+label(276,64,"Add 5")+arrow(317,348,58),
        f"With input {m(7)}, double it first and then add five."),
      "matching":("Two labelled input cards with separate arrows to the two slots.",
        rect(44,15,82,34,blue)+rect(44,69,82,34,green)+label(85,38,"Value a")+label(85,92,"Value b")+
        arrow(132,214,31)+arrow(132,214,85)+rect(220,15,134,34,blue)+rect(220,69,134,34,green)+
        label(287,38,"Place marked a")+label(287,92,"Place marked b"),
        f"Put the value of {m('a')} wherever you see {m('a')}, and the value of {m('b')} wherever you see {m('b')}."),
    }
    output={}
    for key,(alt,svg,caption) in art.items():
        raw=('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 120" role="img" aria-labelledby="title">'
             f'<title id="title">{escape(alt)}</title><rect width="400" height="120" rx="12" fill="white"/>{svg}</svg>\n')
        (folder/f"{key}.svg").write_text(raw,encoding="utf-8")
        output[key]=dict(src=f"/assets/study/0580/introduction-to-algebra/{key}.svg",alt=alt,caption=p(caption),width=400,height=120)
    return output


def build():
    figures_by_key=figures()
    lessons,study,bank=[],{},[]
    for name,title,summary,methods in LESSONS:
        id=f"igcse-0580-intro-algebra-{name}"
        examples,sections,extra=[],[],[]
        for j,(anchor,heading,intro,idea,mistake,gen,figure) in enumerate(methods):
            index=len(examples)
            for seed in (j+2,j+5):
                q=gen(seed)
                examples.append(dict(title=q["title"],question=q["prompt"],solution=q["steps"]))
            blocks=[dict(kind="key",html=p(idea),**({"figure":figures_by_key[figure]} if figure else {})),
                dict(kind="example",index=index),check(f"{id}-{anchor}-one",gen(j+8)),
                dict(kind="mistake",html=p(mistake)),dict(kind="example",index=index+1,tryFirst=True),
                check(f"{id}-{anchor}-two",gen(j+11))]
            sections.append(dict(id=anchor,title=heading,label=anchor.capitalize(),minutes=7,level="core",intro=p(intro),blocks=blocks))
            extra.extend(check(f"{id}-{anchor}-extra-{k+1}",gen(16+2*j+k)) for k in range(2))
        figure=figures_by_key[methods[0][-1]]
        review="".join(f"<h2>{r[1]}</h2>"+p(r[3]) for r in methods)
        review+=f'<p><img width="260" src="{figure["src"]}" alt="{escape(figure["alt"],quote=True)}"></p>'
        samples=[r[-2](4+j) for j,r in enumerate(methods[:2])]
        recap="<ol>"+"".join(f"<li>{q['prompt']}<p><strong>Answer.</strong> {q['result']}</p></li>" for q in samples)+"</ol>"
        study[id]=dict(updatedOn="2026-11-22",description=summary,sections=sections,examples=examples,extraPractice=extra,
            glossary=[dict(term=k,definition=p(v)) for k,v in (
                ("Variable","A letter that can stand for different numbers."),
                ("Expression","A mathematical phrase made from operations, numbers and letters."),
                ("Coefficient","The number multiplying a letter or group of letters."),
                ("Substitute","Replace a letter with a stated value."))],
            revision=dict(body=review,checks=recap,examTip=p(methods[-1][4])))
        if lessons:
            prev=lessons[-1]
            study[id]["related"]=[dict(title=prev["title"],href=f"/courses/maths4u-0580/topics/{prev['id']}")]
        lessons.append(dict(id=id,key=name,title=title,summary=summary,objective=summary,before=p("Recall the order of operations and how to multiply signed numbers."),
            ideas="".join(p(r[3]) for r in methods),method="".join(f"<h4>{r[1]}</h4>"+p(r[2]) for r in methods),
            mistakes=[r[4] for r in methods],examples=[dict(title=q["title"],question=q["question"],solution="".join(q["solution"]),
                verification=f"{id}-example-{i+1}") for i,q in enumerate(examples[::2])]))
        gens=[r[-2] for r in methods]
        for j,(a,b) in enumerate(((0,1),(1,2),(2,0),(0,2),(2,1))):
            family=f"{id}-P{j+1}"
            bank.extend(bank_item(f"{family}-{variant}",family,name,[gens[a](24+4*j+variant)]) for variant in range(2))
            family=f"{id}-E{j+1}"
            for variant in range(4):
                seed=52+24*j+variant
                bank.append(bank_item(f"{family}-{variant}",family,name,[gens[a](seed),gens[b](seed+10)],variant))
    packet=dict(schema_version=1,key="0580-algebra-introduction",version="1.0.0",
        course=dict(slug="maths4u-0580",title="Cambridge IGCSE Mathematics (0580)",code="0580",direction="igcse"),
        chapter=dict(id="igcse_0580_algebra_introduction",slug="introduction-to-algebra",title="Introduction to algebra",position=18),
        source=dict(sha256=sha256(Path(__file__).read_bytes()).hexdigest(),supplied=0,held=[]),lessons=lessons,questions=bank,marking_status="DRAFT")
    for suffix,content in [("v1",packet),("study",study)]:
        (ROOT/"content/original/0580"/f"introduction-to-algebra-{suffix}.json").write_text(json.dumps(content,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(f"{len(lessons)} lessons, {len(bank)} bank questions and {len(figures_by_key)} diagrams")


if __name__=="__main__":
    build()
