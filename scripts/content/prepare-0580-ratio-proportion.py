"""Generate the independent Cambridge 0580 C1.11/E1.11 ratio practice."""
from fractions import Fraction
from pathlib import Path
from hashlib import sha256
from html import escape
from runpy import run_path
import json

ROOT = Path(__file__).resolve().parents[2]
common = run_path(str(Path(__file__).with_name("prepare-0580-number-types.py")))
p, m, frac, task, check, line, label, table = (
    common[name] for name in ("p","m","fraction","task","check","line","label","table")
)
course = "maths4u-0580"


def number(title, prompt, label, value, method, step, tip, retry=None):
    number = Fraction(value)
    result = m(frac(number.numerator, number.denominator))
    return dict(task(title, prompt, label, number, [method, step, f"The answer is {result}."], tip, retry),
        method=method, result=result)


def simplest(seed):
    a, b = 2 + seed % 12, 3 + seed % 12
    multiplier = 3 + seed
    q = number("Simplify a ratio in the original order",
        f"Simplify {m(f'{a*multiplier}:{b*multiplier}')}. Give the first term of the simplest ratio.",
        "First term", a, f"Divide both terms by their highest common factor, {multiplier}.",
        f"The numbers stay in their original order to give {m(f'{a}:{b}')}.",
        "Use the same divisor for both terms.", (b, "That is the second term, not the first. Keep the original order."))
    q["written_prompt"] = p(f"Write {m(f'{a*multiplier}:{b*multiplier}')} in its simplest form.")
    q["written_answer"] = m(f"{a}:{b}")
    return q


def mixed_units(seed):
    a, b = 2 + seed % 6, 3 + seed % 6
    factor = 2 + seed // 2
    metres, centimetres = a * factor, 100 * b * factor
    q = number("Use one unit before comparing",
        f"A roll is {metres} m long and a second roll is {centimetres} cm long. Write their lengths, in that order, as a simplest ratio. Give its second term.",
        "Second term", b,
        f"Convert the first roll to {100*metres} cm. Both values now use centimetres.",
        f"Divide both parts by {100*factor} to get {m(f'{a}:{b}')}.",
        "Convert to the same unit before dividing by a common factor.")
    q["written_prompt"] = p(f"Two rolls measure {metres} m and {centimetres} cm. Give the ratio of their lengths in simplest form in that order.")
    q["written_answer"] = m(f"{a}:{b}")
    return q


def three_terms(seed):
    a, b, c = 2 + seed % 8, 3 + seed % 8, 5 + seed % 8
    scale = 5 + seed
    q = number("Simplify three terms together",
        f"Three bins hold {scale*a}, {scale*b} and {scale*c} tiles. Give the middle term when their quantities, in that order, are written as a simplest ratio.",
        "Middle term", b,
        f"The three counts have common factor {scale}.",
        f"Divide every count by that factor: {m(f'{a}:{b}:{c}')}.",
        "Divide all three terms by the same highest common factor.")
    q["written_prompt"] = p(f"Three bins hold {scale*a}, {scale*b} and {scale*c} tiles. Give the ratio of their quantities in simplest form in that order.")
    q["written_answer"] = m(f"{a}:{b}:{c}")
    return q


def share_total(seed):
    a, b, unit = 2+seed%6, 5+seed%6, 7+seed
    total = unit*(a+b)
    return number("Share the whole between two groups",
        f"A workshop shares {total} tiles between Art and Design in the ratio {m(f'{a}:{b}')}. How many tiles does Design receive?",
        "Tiles for Design", b*unit,
        f"There are {a+b} equal parts. Divide the total, {total}, by {a+b} to find {unit} tiles per part.",
        f"Design has {b} parts. Multiply {b} by {unit}.",
        "Add the ratio terms before dividing the total.",
        (unit, "This is the number of tiles for one part. Design has several parts."))


def one_share(seed):
    a, b, unit = 3+seed%7, 4+seed%7, 6+seed
    return number("Use a single known share",
        f"Two teams collect cans in the ratio Red to Blue {m(f'{a}:{b}')}. Red collects {a*unit} cans. How many does Blue collect?",
        "Cans for Blue", b*unit,
        f"The known {a*unit} cans correspond to {a} parts. That makes {unit} cans per part.",
        f"Blue gets {b} of those equal parts.",
        "Here the known amount belongs to one group. Divide by the term for that group.")


def share_gap(seed):
    a, gap, unit = 3+seed%6, 2+seed%4, 5+seed
    b = a+gap
    return number("Use a known difference",
        f"Inez and Lee save money in the ratio {m(f'{a}:{b}')}. Lee has £{gap*unit} more than Inez. How much do they have together, in pounds?",
        "Total in pounds", (a+b)*unit,
        f"The difference in shares is {m(f'{b}-{a}={gap}')} parts. Divide £{gap*unit} by {gap} to get £{unit} for one part.",
        f"Together they have {a+b} parts of £{unit} each.",
        "The difference belongs to the gap between the shares, so use subtraction first.")


def recipe(seed):
    people, target, grams = 4+seed%5, 8+seed%7, 30+5*seed
    if target == people:
        target += 1
    return number("Adapt a recipe to a new serving size",
        f"A recipe for {people} people uses {people*grams} g of rice. How much rice is needed for {target} people at the same serving size?",
        "Rice in grams", target*grams,
        f"Divide the starting amount by {people} to find {grams} g per person.",
        f"For {target} people, use {target} of those servings.",
        "Find the amount per person first.")


def map_distance(seed, backwards=False):
    scale = 10000*(2+seed%7)
    map_cm = 3+seed
    metres = map_cm * scale // 100
    if backwards:
        return number("Work back from a real distance to a map length",
            f"A pathway is {metres} m long. On a plan drawn at {m(f'1:{scale}')}, how many centimetres long is the pathway?",
            "Length in map centimetres", map_cm,
            f"One map centimetre represents {scale} cm on the ground, or {scale//100} m.",
            f"Find how many of those ground-distance units fit in {metres} m.",
            "Convert the ground distance and the scale to matching units before dividing.")
    return number("Turn a map length into a ground distance",
        f"On a map with scale {m(f'1:{scale}')}, a paved route is {map_cm} cm long. What is its real length in metres?",
        "Real length in metres", metres,
        f"{map_cm} map centimetres represent {m(f'{map_cm}\\times {scale}')} real centimetres.",
        f"Divide {map_cm*scale} real centimetres by 100 to turn them into metres.",
        "The scale ratio compares matching units. Convert centimetres into metres afterwards.",
        (metres*100, "That is the number of centimetres. How many centimetres make one metre?"))


def rate_compare(seed, equal=False):
    small, large = 5+seed%6, 12+seed%8
    first = 28 + seed
    second = first if equal else first + (4 if seed%2 else -3)
    cost_a, cost_b = small*first, large*second
    options = {"A":"Pack A", "B":"Pack B", "C":"They give the same value"}
    correct = "C" if equal else "A" if first<second else "B"
    intro=f"Pack A contains {small} metres of cord and costs {cost_a} p. Pack B contains {large} metres and costs {cost_b} p."
    method="Compare the cost of the same amount, for example one metre."
    step=f"Pack A costs {m(f'{cost_a}\\div {small}={first}')} p per metre. Pack B costs {m(f'{cost_b}\\div {large}={second}')} p per metre."
    q=task("Compare prices fairly", intro+" Which gives better value, or are they equally good value?",
        "Best value",correct,[method, step, f"Answer: {options[correct]}."],
        "Compare the same amount in both packs.", kind="choice",options=options)
    return dict(q,method=method,result=options[correct],written_prompt=p(intro+" Decide which pack gives better value, or show that they give the same value."))


def unit_cost(seed):
    size, rate = 6+seed%7, 24+seed
    return number("Find the price for one item",
        f"A bag of {size} seed packets costs {size*rate} p. Find the cost of one seed packet in pence.",
        "Cost per packet in pence", rate,
        f"The total price {size*rate} p buys {size} packets.", f"Divide {size*rate} by {size}.",
        "Divide the full cost by the number of items.")


LESSONS = [
    ("simplifying", "Writing and simplifying ratios", "Write an ordered ratio, use matching units and simplify every term.", [
        ("order","Why does the order matter?", "A ratio says how many parts of one thing correspond to parts of another. Read the names in order before assigning the numbers.",
         "Divide both terms by the same common factor. The first term still refers to the first thing named.",
         "Swapping the terms changes what each number describes.", simplest, "ordered"),
        ("units","What if the units are different?", "First express both measurements in centimetres, or both in metres. This makes one unit on the left represent the same length as one unit on the right.",
         "Match units before simplifying. One metre is 100 centimetres.", "Changing only the unit name does not change the number of units.",mixed_units,None),
        ("three","What if there are three quantities?", "Find a factor that divides all three counts. Draw three rows of part boxes to keep the terms in order.",
         "Apply the same division to every term.", "A factor shared by just two terms is not sufficient.",three_terms,None)]),
    ("sharing", "Sharing in a ratio", "Find one part from the total, from one share or from the difference.", [
        ("total","How can I split a total fairly?", "Draw one box for each part. The whole amount fills all the boxes. The equal boxes represent equal amounts.",
         "Add the terms. Divide the total by that sum. Multiply by the number of parts in the wanted share.",
         "The values in the ratio count parts. They are not the amounts being shared.",share_total,"share"),
        ("known","What if one share is known?", "Circle only the boxes for the person or group whose share is given. Divide that share by the number of boxes you circled.",
         "Use the known person's part count to find the value of one part.", "Adding the two terms would divide by the total part count, which belongs to the whole amount.",one_share,None),
        ("difference","What if the difference is given?", "Draw the two rows from the same starting point. The extra boxes in the longer row show what the difference is worth.",
         "Subtract the terms to find how many parts the difference represents.", "The difference between amounts does not tell you the total share.",share_gap,None)]),
    ("scale", "Recipes and map scales", "Scale quantities using the unitary method and move between map lengths and real distances.", [
        ("recipe","How do I scale an ingredient?", "Divide by the starting number of servings. The amount for one serving is the bridge to any other serving size.",
         "Work down to one, then scale up to the new number of servings.", "Changing the servings by two does not mean adding two grams.",recipe,None),
        ("ground","How do I read a map scale?", "One unit on the map represents several of the same units on the ground. First choose centimetres so that the map and real units match.",
         f"A scale {m('1:40000')} means 1 map centimetre represents 40,000 ground centimetres, or 400 m.",
         "Convert to the requested unit after applying the scale.",map_distance,"map"),
        ("reverse","How do I get back to a length on the map?", "Find the ground distance that corresponds to one map centimetre. Count how many such units the full distance contains.",
         "Divide the real distance by the real length represented by one map centimetre.",
         "Use matching units in the division. Metres and centimetres cannot be divided as if they were the same unit.",
         lambda i:map_distance(i,True),None)]),
    ("best-value", "Unit prices and best value", "Compare prices using the cost per item or per unit and recognise equal value.", [
        ("one","What does per item mean?", "A price per item tells you the cost of one equal item. The same idea works per metre, per kilogram or per litre.",
         "Divide price by quantity. Keep track of the price unit and the quantity unit.", "Use the full number of items even when the pack contains several groups.",unit_cost,None),
        ("unequal","Which pack gives better value?", "Compare packs by pricing the same unit. A large pack can be cheaper per unit even if its total price is higher.",
         "Find the price per unit for both packs and choose the lower one.",
         "Compare pence with pence and metres with metres.",rate_compare,"unit"),
        ("equal","Can two packs offer the same value?", "If the quantities and prices grow by the same factor, the unit price stays the same. Checking the two unit prices makes this visible.",
         "Choose equal value when the two unit costs match exactly.",
         "A higher price for a larger pack does not settle the question on its own.",lambda i:rate_compare(i,True),None)]),
]


def figures():
    folder=ROOT/"public/assets/study/0580/ratio-proportion"
    folder.mkdir(parents=True, exist_ok=True)
    def box(x,y,color,width=30):
        return f'<rect x="{x}" y="{y}" width="{width}" height="24" rx="5" fill="{color}"/>'
    blue, green = "#bad1ed","#acdfd0"
    art={
        "ordered":("Matched blocks in two rows", "".join(box(128+34*j,28,blue) for j in range(2))+
            "".join(box(128+34*j,72,green) for j in range(3))+label(81,44,"Blue")+label(81,88,"Green"),
            "Two blue parts and three green parts give the ratio "+m("2:3")+"."),
        "share":("Two shares represented by five equal boxes", "".join(box(77+45*j,58,blue if j<2 else green,41) for j in range(5))+
            label(118,45,"Art")+label(230,45,"Design"),
            "The five equal boxes cover the whole amount. Each has the same value."),
        "map":("Scale bar with three evenly spaced marks", line(76,72,319,72)+
            "".join(line(x,62,x,82)+label(x,104,v) for x,v in [(76,"0"),(157,"400 m"),(238,"800 m"),(319,"1200 m")]),
            "On the original scale, each one-centimetre step represents 400 metres."),
        "unit":("Two packs of different sizes with the first unit highlighted", "".join(box(112+j*36,31,blue if not j else "#dfe8f1",32) for j in range(4))+
            "".join(box(112+j*36,74,green if not j else "#dfe8f1",32) for j in range(6))+
            label(67,47,"Pack A")+label(67,90,"Pack B"),
            "Compare the cost of one highlighted item from each pack."),
    }
    result = {}
    for name,(alt,body,caption) in art.items():
        (folder/f"{name}.svg").write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 120" role="img" aria-labelledby="title">'
            f'<title id="title">{escape(alt)}</title><rect width="400" height="120" rx="12" fill="white"/>{body}</svg>\n',encoding="utf-8")
        result[name]=dict(src=f"/assets/study/0580/ratio-proportion/{name}.svg",alt=alt,caption=p(caption),width=400,height=120)
    return result


def bank_item(id,family,lesson,items,variant=None):
    if variant is None:
        q=items[0]
        return dict(id=id,family_uid=family,lesson=lesson,title=q["title"],collection="variant" if id.endswith("-1") else "short",
            prompt_html=q["prompt"],answer_html=p(q["result"]),hint_html=q["hint"],solution_html="".join(q["steps"]),marks=1,difficulty=1,
            parts=[dict(label="a",marking_criteria=[dict(code="B1",marks=1,description_html=p(q["result"]))])],fields=[q["field"]],verification=id)
    prompts, answers, solutions, hints, parts=[],[],[],[],[]
    for i,q in enumerate(items):
        letter=chr(97+i)
        answer=q.get("written_answer",q["result"])
        prompts.append(f'<li>{q.get("written_prompt",q["prompt"])}<p>Show your working.</p><span class="marks">[2]</span></li>')
        answers.append(p(f"({letter}) {answer}"))
        steps=q["steps"][:-1] if "written_answer" in q else q["steps"]
        solutions.append(f'<section class="solution-part"><h4>({letter})</h4>{"".join(steps)}</section>')
        hints.append(p(f"({letter})")+q["hint"])
        parts.append(dict(label=letter,marking_criteria=[dict(code="M1",marks=1,description_html=p(q["method"])),
            dict(code="A1",marks=1,description_html=p(answer))]))
    return dict(id=id,family_uid=family,lesson=lesson,title=items[0]["title"]+" and a second application",collection="exam",
        prompt_html='<ol class="parts" type="a">'+"".join(prompts)+"</ol>",answer_html="".join(answers),solution_html="".join(solutions),
        hint_html="".join(hints),marks=2*len(parts),difficulty=2,parts=parts,fields=[],verification=id,variant_index=variant)


def build():
    images=figures()
    lessons, study, questions=[],{},[]
    for key,title,summary,strategies in LESSONS:
        id=f"igcse-0580-ratio-{key}"
        sections,examples,extra=[],[],[]
        for j,(anchor,heading,intro,idea,mistake,gen,figure) in enumerate(strategies):
            index=len(examples)
            for n in (2+j,5+j):
                q=gen(n)
                examples.append(dict(title=q["title"],question=q.get("written_prompt",q["prompt"]),solution=q["steps"][:-1] if "written_answer" in q else q["steps"]))
            blocks=[dict(kind="key",html=p(idea),**({"figure":images[figure]} if figure else {})),
                dict(kind="example",index=index),check(f"{id}-{anchor}-1",gen(j+8)),dict(kind="mistake",html=p(mistake)),
                dict(kind="example",index=index+1,tryFirst=True),check(f"{id}-{anchor}-2",gen(j+11))]
            if key=="scale" and anchor=="recipe":
                blocks.insert(1,dict(kind="tip",html=table(["Servings","Rice"],[["4","120 g"],["1","30 g"],["7","210 g"]])+p("Work down to one serving before scaling up.")))
            sections.append(dict(id=anchor,title=heading,label=anchor.capitalize(),minutes=7,level="core",intro=p(intro),blocks=blocks))
            extra.extend(check(f"{id}-{anchor}-extra-{j+1}",gen(seed)) for j,seed in enumerate((16+2*j,17+2*j)))
        recap="".join(f"<h2>{s[1]}</h2>"+p(s[3]) for s in strategies)
        figure=next(images[row[-1]] for row in strategies if row[-1])
        recap+=f'<p><img width="280" src="{figure["src"]}" alt="{escape(figure["alt"],quote=True)}"></p>'
        samples=[s[5](i+2) for i,s in enumerate(strategies[:2])]
        recap_checks="<ol>"+"".join("<li>"+q.get("written_prompt",q["prompt"])+p("<strong>Answer.</strong> "+q.get("written_answer",q["result"]))+"</li>" for q in samples)+"</ol>"
        study[id]=dict(updatedOn="2026-11-22",description=summary,sections=sections,examples=examples,extraPractice=extra,
            glossary=[dict(term="Ratio",definition=p("An ordered comparison of quantities in equal-sized parts.")),
                      dict(term="Unitary method",definition=p("Find the value of one part first, then use it to find other amounts.")),
                      dict(term="Scale",definition=p("The ratio of a length on a plan or map to the corresponding real length.")),
                      dict(term="Unit price",definition=p("The price of one item or one unit of quantity."))],
            revision=dict(body=recap,checks=recap_checks,examTip=p(strategies[-1][4])))
        if lessons:
            study[id]["related"]=[dict(title=lessons[-1]["title"],href=f"/courses/{course}/topics/{lessons[-1]['id']}")]
        lessons.append(dict(id=id,key=key,title=title,summary=summary,objective=summary,
            before=p("Check that you can multiply and divide whole numbers."),
            ideas="".join(p(s[3]) for s in strategies),method="".join(f"<h4>{s[1]}</h4>"+p(s[2]) for s in strategies),
            mistakes=[s[4] for s in strategies],examples=[dict(title=e["title"],question=e["question"],
               solution="".join(e["solution"]),verification=f"{id}-example-{i+1}") for i,e in enumerate(examples[::2])]))
        gens=[s[5] for s in strategies]
        for n,(a,b) in enumerate(((0,1),(1,2),(2,0),(0,2),(2,1))):
            family=f"{id}-P{n+1}"
            questions.extend(bank_item(f"{family}-{v}",family,key,[gens[a](24+4*n+v)]) for v in range(2))
            family=f"{id}-E{n+1}"
            for v in range(4):
                seed=60+12*n+v
                questions.append(bank_item(f"{family}-{v}",family,key,[gens[a](seed),gens[b](seed+4)],v))
    pack=dict(schema_version=1,key="0580-number-ratio-proportion",version="1.0.1",
        course=dict(slug=course,title="Cambridge IGCSE Mathematics (0580)",code="0580",direction="igcse"),
        chapter=dict(id="igcse_0580_number_ratio_proportion",slug="ratio-proportion",title="Ratio and proportion",position=10),
        source=dict(sha256=sha256(Path(__file__).read_bytes()).hexdigest(),supplied=0,held=[]),lessons=lessons,questions=questions,marking_status="DRAFT")
    for filename,value in [("ratio-proportion-v1.json",pack),("ratio-proportion-study.json",study)]:
        (ROOT/"content/original/0580"/filename).write_text(json.dumps(value,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(f"{len(lessons)} lessons, {len(questions)} questions, {len(images)} figures")


if __name__=="__main__":
    build()
