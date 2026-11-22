"""Shared authoring for the algebra chapters of Cambridge Additional Mathematics."""

import hashlib
import html
import json
from pathlib import Path

import sympy as sy


ROOT = Path(__file__).resolve().parents[2]
UPDATED = "2026-11-22"
x, y = sy.symbols("x y", real=True)


def p(text):
    return f"<p>{text}</p>"


def tex(expr):
    return sy.latex(expr, fold_short_frac=False)


def m(expr):
    return r"\(" + (expr if isinstance(expr, str) else tex(expr)) + r"\)"


def input_value(expr):
    return str(expr).replace("**", "^")


def roots(values):
    ordered = sorted(set(values), key=lambda v: float(v))
    text = "{" + ",".join(input_value(v) for v in ordered) + "}"
    pretty = r"\{" + ", ".join(tex(v) for v in ordered) + r"\}"
    return text, m(pretty)


def pairs(values):
    expected = ";".join(f"({input_value(a)},{input_value(b)})" for a,b in values)
    display = r",\quad ".join(f"({tex(a)},{tex(b)})" for a,b in values)
    return expected, m(display)


def table(headers, rows):
    headings = "".join(f'<th scope="col">{h}</th>' for h in headers)
    body = "".join("<tr>" + "".join(f"<td>{v}</td>" for v in row) + "</tr>" for row in rows)
    return f'<table><thead><tr>{headings}</tr></thead><tbody>{body}</tbody></table>'


def part(prompt, label, expected, method, work, answer=None, *, kind="number", variables=None, options=None, retry=None, written=None):
    field = dict(type=kind, key="answer", label=label, expected=input_value(expected))
    if variables:
        field["variables"] = variables
    if options:
        field["options"] = options
    display = answer if answer is not None else m(expected)
    mistakes = ({"answer": input_value(retry[0]), "feedback": p(retry[1])},) if retry is not None and str(retry[0]) != str(expected) else ()
    return dict(prompt=p(prompt), field=field, method=method, solution=[p(method), p(work), p("Final answer: " + display + ".")],
        answer=p(display), retry=list(mistakes), written=written)


def choice(prompt, options, answer, method, work, *, retry=None, written=None):
    return part(prompt, "Choose one answer", answer, method, work, options[answer], kind="choice", options=options, retry=retry, written=written)


def case(title, context, *steps):
    return dict(title=title, context=context, steps=steps)


def check_record(identifier, model, step, show_context=True):
    context = model["context"] if show_context else ""
    return dict(kind="check", id=identifier, prompt=context+step["prompt"], field=step["field"],
        solution="".join(step["solution"]), hint=p(step["method"]), **({"retry":step["retry"]} if step["retry"] else {}))


def solution_choices(step):
    options=step["field"].get("options")
    return p(" ".join(f"{k}. {value}" for k,value in options.items())) if options else ""


def written_record(identity, family, chapter_lesson, model, variant, difficulty):
    questions, answers, solutions, hints, mark_parts = [], [], [], [], []
    for index, step in enumerate(model["steps"]):
        letter=chr(97+index)
        written=step.get("written")
        if written is None:
            question=step["prompt"]+solution_choices(step)
            marks=("M1",step["method"]),("A1",step["answer"])
            answer=step["answer"]
            solution="".join(step["solution"])
        else:
            question=p(written["prompt"])
            marks=written["marks"]
            answer=p(written["answer"])
            solution="".join(step["solution"][:-1])+p(written["answer"])
            if written.get("diagram"):
                solution+=written["diagram"]
        questions.append(f'<li>{question}<span class="marks">[{len(marks)}]</span></li>')
        answers.append(p(f"<strong>({letter})</strong>")+answer)
        solutions.append(f'<section class="solution-part"><h4>({letter})</h4>{solution}</section>')
        hints.append(p(f"<strong>({letter})</strong> " + step["method"]))
        mark_parts.append(dict(label=letter,marking_criteria=[dict(code=code,marks=1,description_html=description if description.startswith("<p>") else p(description)) for code,description in marks]))
    return dict(id=identity,family_uid=family,lesson=chapter_lesson,title=model["title"],collection="exam",
        prompt_html=model["context"]+'<ol class="parts" type="a">'+"".join(questions)+"</ol>",answer_html="".join(answers),solution_html="".join(solutions),
        hint_html="".join(hints),marks=sum(len(a["marking_criteria"]) for a in mark_parts),difficulty=difficulty,parts=mark_parts,
        fields=[],verification=identity,variant_index=variant)


def short_record(identity, family, lesson, model, step, fresh):
    return dict(id=identity,family_uid=family,lesson=lesson,title=model["title"],collection="variant" if fresh else "short",
        prompt_html=model["context"]+step["prompt"],answer_html=step["answer"],solution_html="".join(step["solution"]),hint_html=p(step["method"]),
        marks=1,difficulty=1,parts=[dict(label="a",marking_criteria=[dict(code="B1",marks=1,description_html=step["answer"])])],fields=[step["field"]],verification=identity)


def drawing(chapter, key, alt, svg):
    directory=ROOT/"public/assets/study/0606"/chapter
    directory.mkdir(exist_ok=True, parents=True)
    out=('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 220" role="img" aria-labelledby="title">'
         f'<title id="title">{html.escape(alt)}</title><rect width="360" height="220" rx="12" fill="#fff"/>{svg}</svg>\n')
    (directory/(key+".svg")).write_text(out,encoding="utf-8")
    return dict(src=f"/assets/study/0606/{chapter}/{key}.svg",alt=alt,width=360,height=220,caption=p(alt))


def figure_markup(figure):
    return f'<p><img src="{figure["src"]}" alt="{html.escape(figure["alt"],quote=True)}" width="315" height="193"></p>'


def graph(chapter, key, alt, limits, curves, labels=(), lines=()):
    xlo,xhi,ylo,yhi=limits
    def px(a):return 34+292*(a-xlo)/(xhi-xlo)
    def py(b):return 191-161*(b-ylo)/(yhi-ylo)
    def text(a,b,t):return f'<text x="{a:.2f}" y="{b:.2f}" fill="#152c44" font-size="13" font-family="system-ui,sans-serif">{html.escape(t)}</text>'
    svg='<defs><clipPath id="plot"><rect x="34" y="30" width="292" height="161"/></clipPath></defs>'
    for axis,pixel in (("x",py(0)),("y",px(0))):
        if (ylo<0<yhi and axis=="x"):
            svg+=f'<path d="M34,{pixel:.2f}H340" stroke="#27415a" fill="none"/>'+text(343,pixel+3,"x")
        if (xlo<0<xhi and axis=="y"):
            svg+=f'<path d="M{pixel:.2f},197V20" stroke="#27415a" fill="none"/>'+text(pixel-3,16,"y")
    svg+='<g clip-path="url(#plot)">'
    for f,left,right,color in curves:
        point=[]
        for i in range(161):
            a=left+(right-left)*i/160
            point.append(f"{px(a):.2f},{py(f(a)):.2f}")
        svg+=f'<polyline points="{" ".join(point)}" stroke="{color}" stroke-width="2.5" fill="none"/>'
    for a,b,c,d in lines:
        svg+=f'<path d="M{px(a):.2f},{py(b):.2f}L{px(c):.2f},{py(d):.2f}" stroke="#5c6e83" stroke-dasharray="5 4" fill="none"/>'
    svg+='</g>'
    for a,b,t in labels:
        svg+=f'<circle cx="{px(a):.2f}" cy="{py(b):.2f}" r="3.5" fill="#152c44"/>'+text(px(a)+5,py(b)-6,t)
    return drawing(chapter,key,alt,svg)


def section(anchor, title, introduction, idea, mistake, make, focus, figure=None):
    return dict(id=anchor,title=title,introduction=introduction,idea=idea,mistake=mistake,make=make,focus=focus,figure=figure)


def lesson(key,title,description,sections,glossary,counts):
    return dict(key=key,title=title,description=description,sections=sections,glossary=glossary,counts=counts)


def export_chapter(slug, title, position, lessons, verification_files):
    study, lesson_records, bank = {}, [], []
    outputs=ROOT/"content/original/0606"
    outputs.mkdir(exist_ok=True,parents=True)
    previous=None
    for l in lessons:
        identity=f'addmaths-0606-{slug}-{l["key"]}'
        sections, examples, extra = [], [], []
        for index, s in enumerate(l["sections"]):
            def focus(base):
                model=s["make"](base)
                return model,model["steps"][s["focus"]]
            starts=len(examples)
            for seed in (index*4+1,index*4+2):
                model, item=focus(seed)
                examples.append(dict(title=model["title"], question=model["context"]+item["prompt"]+solution_choices(item),solution=item["solution"]))
            blocks=[dict(kind="key",html=p(s["idea"]),**({"figure":s["figure"]} if s["figure"] else {})),dict(kind="example",index=starts)]
            for count,seed in enumerate((13+index*4,14+index*4)):
                model, item=focus(seed)
                if count:
                    blocks.extend([dict(kind="mistake",html=p(s["mistake"])),dict(kind="example",index=starts+1,tryFirst=True)])
                blocks.append(check_record(f'{identity}-{s["id"]}-check-{count+1}',model,item))
            for count in range(2):
                model,item=focus(27+4*index+count)
                extra.append(check_record(f'{identity}-{s["id"]}-extra-{count+1}',model,item))
            sections.append(dict(id=s["id"],title=s["title"],label=s["id"].replace("-"," ").capitalize(),minutes=8,level="core",intro=p(s["introduction"]),blocks=blocks))
        first=l["sections"][0]
        rev=first["make"](18)
        rev_part=rev["steps"][first["focus"]]
        summary="".join(f'<h2>{s["title"]}</h2>'+p(s["idea"]) for s in l["sections"])
        if first["figure"]:
            summary+=figure_markup(first["figure"])
        study[identity]=dict(updatedOn=UPDATED,description=l["description"],sections=sections,examples=examples,extraPractice=extra,
            glossary=[dict(term=term,definition=p(meaning)) for term,meaning in l["glossary"]],
            related=[previous] if previous else [],revision=dict(body=summary,checks=rev["context"]+rev_part["prompt"]+solution_choices(rev_part)+p("Answer follows.")+rev_part["answer"],examTip=p(l["sections"][-1]["mistake"])))
        lesson_records.append(dict(id=identity,key=l["key"],title=l["title"],summary=l["description"],objective=l["description"],
            before=p(l["sections"][0]["introduction"]),ideas="".join(p(s["idea"]) for s in l["sections"]),
            method="".join(f'<h4>{s["title"]}</h4>'+p(s["introduction"]) for s in l["sections"]),mistakes=[s["mistake"] for s in l["sections"]],
            examples=[dict(title=e["title"],question=e["question"],solution="".join(e["solution"]),verification=f"{identity}-example-{j+1}") for j,e in enumerate(examples[::2])]))
        previous=dict(title=l["title"],href=f"/courses/maths4u-0606/topics/{identity}")
        for n in range(5):
            s=l["sections"][n%len(l["sections"])]
            family=f"{identity}-P{n+1:02}"
            for variant in range(2):
                model=s["make"](42+5*n+variant)
                bank.append(short_record(f"{family}-{variant}",family,l["key"],model,model["steps"][s["focus"]],bool(variant)))
        family_index=0
        for make,count in l["counts"]:
            for n in range(count):
                family_index+=1
                family=f"{identity}-E{family_index:03}"
                for variant in range(4):
                    model=make(77+4*n+variant)
                    bank.append(written_record(f"{family}-{variant}",family,l["key"],model,variant,2+(family_index%4==0)))
    signature=hashlib.sha256(b"\n".join(Path(s).read_bytes() for s in verification_files)).hexdigest()
    manifest=dict(schema_version=1,key="0606-"+slug,version="1.0.0",course=dict(slug="maths4u-0606",title="Cambridge IGCSE Additional Mathematics (0606)",code="0606",direction="additional"),
        chapter=dict(id="addmaths_0606_"+slug.replace("-","_"),slug=slug,title=title,position=position),
        source=dict(sha256=signature,supplied=0,held=[]),lessons=lesson_records,questions=bank,marking_status="DRAFT")
    for suffix, payload in (("v1",manifest),("study",study)):
        (outputs/f"{slug}-{suffix}.json").write_text(json.dumps(payload,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(slug,len(lessons),sum(q["collection"]=="exam" and q["variant_index"]==0 for q in bank),len(bank))
