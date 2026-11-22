"""Generate the independently authored C1.3/E1.3 package for Maths4U."""

from fractions import Fraction
from html import escape
from pathlib import Path
import hashlib
import json
import runpy

ROOT = Path(__file__).resolve().parents[2]
base = runpy.run_path(str(Path(__file__).with_name("prepare-0580-number-types.py")))
p, m, frac, task = (base[key] for key in ("p", "m", "fraction", "task"))
check, short, exam, question = (base[key] for key in ("check", "short", "exam", "question_text"))
table, label, line, tiles = (base[key] for key in ("table", "label", "line", "tiles"))
PATH = "/assets/study/0580/powers-roots"
COURSE = "maths4u-0580"


def square(i):
    side = 6+i%10
    return task("Find a square from its side", f"A square banner is {side} cm wide. Work out its area in square centimetres.",
        "Area in square centimetres", side**2,
        [f"The height and width both equal {side} cm.",
         m(fr"{side}^2={side}\times{side}={side**2}") + ".",
         f"The completed square covers {side**2} square centimetres."],
        "A square has equal sides. Multiply the side length by itself.",
        (2*side,"That doubles the side length. The area uses two factors of the side length."))


def square_root(i):
    root = 4+i%12
    number=m(fr"\sqrt{{{root**2}}}")
    return task("Read the positive square root",f"Evaluate {number}.","Square root",root,
        [f"Find the non-negative number whose square is {root**2}.",
         f"{m(fr'{root}\times{root}={root**2}')} shows that {root} works.",
         f"Write {root}. The square-root sign names the non-negative value."],
        "Find the matching square fact.",
        (-root,"The negative value also squares to the number. The root sign asks for the non-negative one."))


def square_bracket(i):
    a = 3+i%12
    if i%2:
        text, result, why = fr"(-{a})^2", a*a, "The brackets make the negative number the base. Both factors are negative."
        work=fr"(-{a})\times(-{a})={a*a}"
    else:
        text, result, why = fr"-{a}^2", -(a*a), "The exponent belongs to the positive number. Apply the minus sign after squaring."
        work=fr"-({a}\times {a})=-{a*a}"
    return task("Read the base before squaring", f"Evaluate {m(text)}.", "Value",result,
        [why, f"{m(work)}.", f"The signed value is {m(result)}."],
        "Check whether the minus sign is inside or outside brackets.",
        (-result,"Include the minus sign in the base only if it is grouped in brackets."))


def cube_volume(i):
    side = [1,2,3,4,5,10,6,7,8,9][i%10]
    return task("Find the volume of a cube",f"A cube has edge length {side} cm. Find its volume in cubic centimetres.","Volume in cubic centimetres",side**3,
        [f"One layer has {m(fr'{side}\times{side}={side**2}')} unit cubes.",
         f"There are {side} layers. Multiply by {side} again.",
         f"The volume is {m(fr'{side}^3={side**3}')} cubic centimetres."],
        "Multiply three copies of the edge length.",
        (side**2,"This is one layer. Multiply by the number of layers.") if side>1 else None)


def cubed_edge(i):
    side=3+i%10
    vol=side**3
    return task("Recover an edge from the volume",f"A model cube has volume {vol} cubic centimetres. Find its edge length in centimetres.","Edge length in centimetres",side,
        [f"The edge appears three times in the volume calculation.",
         f"{m(fr'{side}\times{side}\times{side}={vol}')} proves that {side} works.",
         f"The cube root is {m(fr'\sqrt[3]{{{vol}}}={side}')}. The edge is {side} cm."],
        "Use a cube root because you are reversing three equal factors.")


def signed_cube(i):
    root=2+i%10
    return task("Read a negative cube root",f"Evaluate {m(fr'\sqrt[3]{{-{root**3}}}')} exactly.","Cube root",-root,
        ["A positive base cubed is positive. A negative base cubed is negative.",
         f"{m(fr'(-{root})\times(-{root})\times(-{root})=-{root**3}')} .",
         f"The only real cube root is {m(-root)}."],
        "Choose the sign first. Then match the size using a cube fact.",
        (root,"The positive base produces a positive cube. Keep the negative sign."))


def high_power(i):
    a, n = 2+i%6, 4+(i//4)%3
    product=r"\times ".join([str(a)]*n)
    return task("Evaluate a higher power",f"Work out {m(fr'{a}^{{{n}}}')} without a calculator.","Value",a**n,
        [f"The base is {a}. The exponent {n} counts copies of the base.",
         f"Write {m(product)}. Multiply from left to right, one pair at a time.",
         m(fr"{a}^{{{n}}}={a**n}") + "."],
        "Write the repeated multiplication before evaluating.",
        (a*n,"That multiplies the base by the exponent. The power calls for repeated copies of the base."))


def high_root(i):
    r,n = 2+i%7,4+i%3
    if n%2 and i%2:
        r=-r
    target=r**n
    base_expr=f"({r})" if r<0 else str(r)
    return task("Undo a higher power",f"Evaluate {m(fr'\sqrt[{n}]{{{target}}}')} exactly.","Root",r,
        [f"The small {n} tells you to reverse the {n}th power.",
         f"Check {m(fr'{base_expr}^{{{n}}}={target}')}.",
         f"The value of the named root is {m(r)}."],
        "Decide which power you are reversing. Test a base by raising it to that power.")


def two_roots(i):
    r=2+i%9
    n=4 if i%2 else 6
    return task("Give both solutions",f"Find all real numbers {m('x')} satisfying {m(fr'x^{{{n}}}={r**n}')}.",
        "Set of solutions",f"{{-{r},{r}}}",
        [f"{m(fr'{r}^{{{n}}}={r**n}')} gives one solution.",
         f"{n} is even. Replacing the base by its negative leaves the same positive power.",
         f"The full answer is {m(fr'\{{-{r},{r}\}}')}. The root sign alone would give just {r}."],
        "Check both the positive and negative base for an even power.",
        (f"{{{r}}}","That is one solution. Its negative raised to the same even power gives the same result."),
        kind="set")


def mixed_product(i):
    a,b = 5+i%10, 2+(i//3)%7
    left=fr"{a}^2\times\sqrt[3]{{{b**3}}}"
    return task("Combine a power and a root",f"Work out {m(left)} without a calculator.","Value",a*a*b,
        [f"Calculate each power or root first.",
         f"The square is {a*a}. The cube root is {b} because {m(fr'{b}^3={b**3}')}.",
         f"Multiply to give {m(fr'{a*a}\times{b}={a*a*b}')}."],
        "Treat each power or root as one number, then multiply.")


def root_sum(i):
    a,b=3+i%12,2+(i//2)%8
    expr=m(fr"\sqrt{{{a*a}}}+{b}^2")
    return task("Check the reach of the root bar",f"Work out {expr}.","Value",a+b*b,
        ["Work out what the root sign covers. It stops before the plus sign.",
         f"The term under the root gives {a}. The other term gives {b*b}.",
         f"Add to get {m(f'{a}+{b*b}={a+b*b}')}."],
        "Read where the root bar ends, then evaluate each term.")


def fraction_power(i):
    a,b=2+i%6,3+i%5
    raw=Fraction(a,b)
    n=3 if i%2 else 2
    if raw==1:
        raw=Fraction(a,b+1)
    numerator,denominator=raw.numerator,raw.denominator
    tex=frac(numerator,denominator)
    result=raw**n
    return task("Raise a fraction to a power",f"Work out {m(fr'\left({tex}\right)^{{{n}}}')} exactly.","Exact value",result,
        [f"The whole fraction is inside brackets. Use {n} copies.",
         f"Multiply the top numbers together, and the bottom numbers together.",
         f"The result is {m(frac(result.numerator,result.denominator))}."],
        "The brackets make the numerator and denominator part of the same base.",
        (Fraction(numerator**n,denominator),"Apply the power to both the numerator and denominator.") if denominator>1 else None,
        kind="number")


LESSONS = [
    ("squares","Squares and square roots","Use square facts and read exactly what the square-root sign and brackets mean.", [
      ("build-it","How do square areas help?", "Arrange unit squares in equal rows and columns. A square with side 7 has seven rows of seven tiles.", "Find the two equal sides and multiply them. Area is measured in square units.", "Doubling the side only finds two side lengths.", square, "square-array"),
      ("undo-it","How do I reverse a square?", "Read the root sign as a request for the non-negative side length. Link it to a square fact you know.", "Know the squares from 1 through 15 and recognise the same facts in reverse.", "The standalone square-root sign does not ask for both signs.", square_root, None),
      ("brackets","What happens to a minus sign?", "Put a finger under the base. A bracketed negative base is repeatedly multiplied with its sign. A minus outside the power is applied after the power.", "Read the grouping before you calculate.", "A calculator must be told which terms the brackets contain.", square_bracket, None)]),
    ("cubes","Cubes and cube roots","Build a cube in layers and reverse its volume calculation.", [
      ("layers","Why multiply three times?", "Choose an edge length. Each flat square layer has that many rows and columns. Stack the same number of layers.", "The volume in cubic units is the edge length cubed.", "The square of the edge only counts one layer.", cube_volume, "cube-stack"),
      ("edges","How do I recover an edge?", "Look for the number that multiplies by itself twice to give a cube volume. The small 3 at the root sign means cube root.", "Remember the cubes of 1, 2, 3, 4, 5 and 10 alongside their roots.", "A square root would reverse two factors. Here there are three.", cubed_edge, None),
      ("negative","Can a cube root be negative?", "Two negative factors give a positive product. The third negative factor makes the product negative again.", "A negative number has exactly one real cube root.", "The small 3 belongs to the root sign. It does not multiply the root.", signed_cube, None)]),
    ("higher","Other powers and roots","Count copies of a base, then undo a fourth, fifth or sixth power.", [
      ("copies","What do the small and large numbers mean?", "The large number is the base. The small exponent tells you how many copies of the base to multiply.", "Say the repeated multiplication before using a calculator key.", "Swapping the base and exponent usually changes the result.", high_power, "power-machine"),
      ("reverse","What does the index on a root do?", "Work backwards from the result. A fourth root asks for a base whose fourth power gives the number under the root sign. Similarly for other roots.", "Check your root by raising it to the power shown by the small index.", "An even root of a positive number is written as the positive root. An odd root can be negative.", high_root, None),
      ("solutions","Does the equation ask for more than one number?", "Compare the root symbol with an equation in an even power. Two opposite bases give the same positive even power.", "When the question says solve, check both signs and give all solutions.", "One correct value is incomplete if there is a second real solution.", two_roots, None)]),
    ("mixed","Calculations with powers and roots","Break a mixed calculation into smaller steps and check the grouping.", [
      ("multiply","Which pieces should I work out first?", "Mark each complete power and each complete root before multiplying. Replace each piece by its value.", "Work out the powers and roots, then finish the multiplication.", "A power or root can change the size by much more than its index suggests.", mixed_product, "two-path"),
      ("bar","Where does the root bar end?", "Read the whole expression before you calculate. A term to the right of the end of the bar belongs outside the root.", "Treat a root's bar as grouping, like brackets around the quantity under it.", "Do not include the next plus term unless the bar includes it.", root_sum, None),
      ("fractions","What if the base is a fraction?", "Write the bracketed fraction twice for a square or three times for a cube. Then use ordinary fraction multiplication.", "Raise both the numerator and the denominator to the stated power.", "If only the top changes, repeat the denominator too.", fraction_power, None)]),
]


def figures():
    navy,green="#2457a8","#087568"
    def diagram(name, alt, body, summary):
        dest=ROOT/"public"/PATH.removeprefix("/")
        dest.mkdir(parents=True,exist_ok=True)
        markup=('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 152" role="img" aria-labelledby="title">'
            f'<title id="title">{escape(alt)}</title><rect width="400" height="152" fill="#fff" rx="12"/>{body}</svg>\n')
        (dest/(name+".svg")).write_text(markup,encoding="utf8")
        return dict(src=PATH+"/"+name+".svg",alt=alt,caption=p(summary),width=400,height=152)
    arrow=lambda x,y,xx,yy:line(x,y,xx,yy)+line(xx-8,yy-6,xx,yy)+line(xx-8,yy+6,xx,yy)
    squares=tiles(3,3,62,27,navy,16)+tiles(5,5,236,19,green,14)+label(83,132,"3 rows of 3")+label(279,132,"5 rows of 5")
    stack="".join(tiles(4,4,x,27,navy if i%2==0 else green,13)+label(x+32,121,f"Layer {i+1}") for i,x in enumerate((16,115,214,313)))
    machine=label(67,74,"Base 2")+arrow(110,69,146,69)+label(215,74,"fourth power")+arrow(270,69,314,69)+label(349,74,"16")+label(205,125,"Reverse with the fourth root")
    paths=label(83,36,"Find the power")+label(83,117,"Find the root")+arrow(155,31,253,66)+arrow(155,112,253,76)+label(323,76,"Multiply")
    return {
        "square-array":diagram("square-array","A three-by-three array beside a five-by-five array",squares,"Count rows and columns separately, then multiply."),
        "cube-stack":diagram("cube-stack","Four separate layers, each containing four rows of four tiles",stack,"Stacking the four square layers builds a cube."),
        "power-machine":diagram("power-machine","Two passes through a fourth power machine and becomes sixteen",machine,"The fourth root reverses the same process."),
        "two-path":diagram("two-path","One path evaluates a power and another evaluates a root. Their results go to a multiplication step.",paths,"Finish the two calculations before joining their results."),
    }


def build():
    images=figures()
    lessons,bank,study=[],[],{}
    for key,title,summary,methods in LESSONS:
        id="igcse-0580-powers-"+key
        examples,sections,extras=[],[],[]
        for j,(anchor,heading,intro,idea,mistake,factory,fig) in enumerate(methods):
            used=set()

            def fresh(seed):
                for candidate in range(seed,seed+72):
                    item=factory(candidate)
                    if item["prompt"] not in used:
                        used.add(item["prompt"])
                        return item
                raise ValueError(f"Not enough distinct checks for {id}/{anchor}")

            index=len(examples)
            for example in [fresh(j),fresh(j+4)]:
                examples.append(dict(title=example["title"],question=question(example),solution=example["steps"]))
            blocks=[dict(kind="key",html=p(idea),**({"figure":images[fig]} if fig else {}))]
            if key=="squares" and j==1:
                groups=[[str(i),str(i**2)] for i in range(1,16)]
                rows=[groups[i]+groups[i+5]+groups[i+10] for i in range(5)]
                blocks.append(dict(kind="tip",html=table(["Base","Square"]*3,rows)))
            if key=="cubes" and j==1:
                blocks.append(dict(kind="tip",html=table(["Base","Cube"],[[str(i),str(i**3)] for i in [1,2,3,4,5,10]])))
            blocks.extend([dict(kind="example",index=index),check(f"{id}-{anchor}-one",fresh(j+6)),
                dict(kind="mistake",html=p(mistake)),dict(kind="example",index=index+1,tryFirst=True),
                check(f"{id}-{anchor}-two",fresh(j+9))])
            sections.append(dict(id=anchor,title=heading,label=anchor.replace("-"," ").capitalize(),minutes=6,
                level="core",intro=p(intro),blocks=blocks))
            extras.extend(check(f"{id}-{anchor}-extra-{i}",fresh(i*3+13+j)) for i in [1,2])
        figure=images[methods[0][-1]]
        revision_body="".join(f"<h2>{heading}</h2>"+p(idea) for _id,heading,_intro,idea,*_rest in methods)
        revision_body+=f'<p><img width="280" src="{figure["src"]}" alt="{escape(figure["alt"])}"></p>'
        study[id]=dict(updatedOn="2026-11-22",description=summary,sections=sections,examples=examples,extraPractice=extras,
            glossary=[dict(term=label["label"],definition=p(row[3])) for label,row in zip(sections,methods)],
            revision=dict(body=revision_body,checks="<ul>"+"".join(f"<li>{row[1]}</li>" for row in methods)+"</ul>",examTip=p(methods[-1][4])))
        if lessons:
            prev=lessons[-1]
            study[id]["related"]=[dict(title=prev["title"],href="/courses/"+COURSE+"/topics/"+prev["id"])]
        lessons.append(dict(key=key,id=id,title=title,summary=summary,objective=summary,
            before=p("Try the first small calculation without a calculator. Check it with the worked steps."),
            ideas="".join(p(row[3]) for row in methods),method="".join(f"<h4>{row[1]}</h4>"+p(row[2]) for row in methods),
            mistakes=[row[4] for row in methods],examples=[dict(title=e["title"],question=e["question"],solution="".join(e["solution"]),
                verification=f"{id}-ex-{i+1}") for i,e in enumerate(examples[::2])]))
        factories=[row[5] for row in methods]
        for j,(i,seed) in enumerate([(0,4),(1,2),(2,4),(0,6),(2,8)]):
            family=f"{id}-P{j+1}"
            bank.extend(short(f"{family}-{v}",family,key,factories[i](seed+v),v>0) for v in range(2))
        for j,indices in enumerate([(0,1),(1,2),(2,0),(0,2),(2,1)]):
            family=f"{id}-E{j+1}"
            for v in range(4):
                items=[factories[i](12+4*j+v+part*3) for part,i in enumerate(indices)]
                bank.append(exam(f"{family}-{v}",family,key,"Calculations with "+title.lower(),items,v,1+min(j,3)))
    pack=dict(schema_version=1,key="0580-number-powers",version="1.0.1",
        course=dict(slug=COURSE,title="Cambridge IGCSE Mathematics (0580)",code="0580",direction="igcse"),
        chapter=dict(id="igcse_0580_number_powers",slug="powers-and-roots",title="Powers and roots",position=2),
        source=dict(sha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),supplied=0,held=[]),
        lessons=lessons,questions=bank,marking_status="DRAFT")
    for filename,data in [("powers-roots-v1.json",pack),("powers-roots-study.json",study)]:
        (ROOT/"content/original/0580"/filename).write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
    print(f"{len(lessons)} lessons, {len(bank)} bank questions, {len(images)} diagrams")


if __name__=="__main__":
    build()
