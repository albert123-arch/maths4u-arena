"""Shared authoring tools for Arena's 0606 calculus chapters."""

from dataclasses import dataclass
from hashlib import sha256
from html import escape
import json
from pathlib import Path
from random import Random

import sympy as s


ROOT = Path(__file__).resolve().parents[2]
COURSE = "maths4u-0606"
TITLE = "Cambridge IGCSE Additional Mathematics (0606)"
DATE = "2026-11-22"
X, T = s.symbols("x t", real=True)
DY = r"\frac{\mathrm dy}{\mathrm dx}"
D2 = r"\frac{\mathrm d^2y}{\mathrm dx^2}"
C = s.Symbol("C")
Q = s.Rational


def p(x):
    return f"<p>{x}</p>"


def m(value):
    return r"\(" + escape(str(value), quote=False) + r"\)"


def tex(value):
    return s.latex(value, fold_short_frac=False, ln_notation=True)


def math(value):
    return m(tex(value))


def eq(lhs, rhs):
    return m(lhs + "=" + tex(rhs))


def pair(a, b):
    return f"({tex(a)},{tex(b)})"


def field(key, label, expected, kind="number", variables=()):
    result = dict(key=key, label=label, type=kind, expected=str(expected).replace("**", "^"))
    if variables:
        result["variables"] = list(variables)
    return result


def round3(value):
    return format(float(value), ".3g")


def choices(correct, others, index):
    options = [correct, *others]
    assert len(set(options)) == len(options)
    choices = {letter: options[(pos-index) % len(options)] for pos, letter in enumerate("ABCD"[:len(options)])}
    return dict(key="answer", label="Choose the complete result", type="choice",
                expected="ABCD"[index % len(options)], options=choices)


@dataclass
class Part:
    ask: str
    result: str
    working: tuple[str, ...]
    marks: tuple[tuple[str, str], ...]
    field: dict | None = None


@dataclass
class Scenario:
    title: str
    stem: str
    parts: tuple[Part, ...]
    hint: str
    wrong_hint: str

    def check_part(self, index):
        usable = [part for part in self.parts if part.field is not None]
        return usable[index % len(usable)]


def answer(ask, result, *steps, method, mark="A1", grader=None, displayed=None):
    shown = displayed if displayed is not None else math(result)
    return Part(ask, shown, (*steps, f"Answer: {shown}."),
                (("M1", method), (mark, f"Obtain {shown}.")), grader)


def explain(ask, result, *steps, marks):
    return Part(ask, result, steps, tuple(marks))


def check_scenario(item, index, uid):
    part = item.check_part(index)
    key = part.field
    bad = next((k for k in key.get("options", {}) if k != key["expected"]), None)
    if key["type"] in {"number", "polynomial"}:
        bad = "0" if key["expected"] != "0" else "1"
    retries = [dict(answer=bad, feedback=p(item.wrong_hint))] if bad else []
    return dict(id=uid, kind="check", title=item.title, prompt=p(item.stem)+p(part.ask),
                field=key, hint=p(item.hint), solution="".join(map(p, part.working)), retry=retries)


def worked(item, index):
    part = item.check_part(index)
    options = part.field.get("options", {})
    opt = '<ol type="A">'+"".join(f"<li>{x}</li>" for x in options.values())+"</ol>" if options else ""
    return dict(title=item.title, question=p(item.stem)+p(part.ask)+opt, solution=list(map(p, part.working)))


def criterion(code, desc):
    n = int(code[-1])
    return dict(code=code, marks=n, description_html=p(desc))


def bank_short(uid, family, key, item, index, variant):
    part = item.check_part(index)
    return dict(id=uid, family_uid=family, lesson=key, title=item.title, collection="variant" if variant else "short",
                marks=1, difficulty=2 if index > 2 else 1, prompt_html=p(item.stem)+p(part.ask),
                answer_html=p(part.result), solution_html="".join(map(p,part.working)), hint_html=p(item.hint),
                fields=[part.field], parts=[dict(label="a", marking_criteria=[criterion("B1", part.result)])], verification=uid)


def bank_exam(family, key, item, variant, difficulty):
    uid = f"{family}-{variant}"
    prompts, solutions, results, parts = [], [], [], []
    for index, part in enumerate(item.parts):
        label = chr(97+index)
        scheme = [criterion(code, desc) for code, desc in part.marks]
        marks = sum(c["marks"] for c in scheme)
        prompts.append(f'<li>{p(part.ask)}<span class="marks">[{marks}]</span></li>')
        solutions.append(f"<h4>({label})</h4>"+"".join(map(p,part.working)))
        results.append(p(f"({label}) {part.result}"))
        parts.append(dict(label=label,marking_criteria=scheme))
    return dict(id=uid, family_uid=family, lesson=key, title=item.title, collection="exam",
                variant_index=variant, difficulty=difficulty, marks=sum(c["marks"] for part in parts for c in part["marking_criteria"]),
                prompt_html=p(item.stem)+'<ol type="a" class="parts">'+"".join(prompts)+"</ol>",
                answer_html="".join(results),solution_html="".join(solutions),hint_html=p(item.hint),fields=[],parts=parts,verification=uid)


def rng(seed):
    return Random(seed)


def plot(folder, name, desc, curves, xrange, yrange, ticks=(), shade=None, xname="x", yname="y"):
    """Sample deterministic exact models onto a labelled SVG with no browser code."""
    width,height=590,260
    left,right,top,bottom=60,560,24,214
    xl,xr=map(float,xrange)
    yl,yr=map(float,yrange)
    def xx(x):
        return left+(float(x)-xl)/(xr-xl)*(right-left)
    def yy(y):
        return bottom-(float(y)-yl)/(yr-yl)*(bottom-top)
    def samples(f, a, b):
        return [(xx(a+(b-a)*j/96),yy(f(a+(b-a)*j/96))) for j in range(97)]
    def point_list(points):
        return " ".join(f"{x:.2f},{y:.2f}" for x,y in points)
    y0=yy(max(yl,min(yr,0)))
    x0=xx(max(xl,min(xr,0)))
    chart=[f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="{width}" height="{height}" role="img" aria-labelledby="title"><title id="title">{escape(desc)}</title>',
           '<rect width="100%" height="100%" rx="14" fill="#f2f6fb"/>',
           f'<defs><clipPath id="bounds"><rect x="{left}" y="{top}" width="{right-left}" height="{bottom-top}"/></clipPath></defs>',
           f'<path d="M{left} {y0:.2f}H{right}M{x0:.2f} {bottom}V{top}" stroke="#365378" stroke-width="2" fill="none"/>',
           f'<text x="{right+6}" y="{max(top+15,min(bottom+17,y0+18)):.2f}" font-size="18" fill="#162f50">{escape(xname)}</text>',
           f'<text x="{x0+8:.2f}" y="20" font-size="18" fill="#162f50">{escape(yname)}</text>',
           '<g clip-path="url(#bounds)">']
    if shade:
        upper, lower, a, b=shade
        chart.append(f'<polygon points="{point_list(samples(upper,a,b)+samples(lower,a,b)[::-1])}" fill="#91d6c8" fill-opacity=".53"/>')
    for f,colour in curves:
        chart.append(f'<polyline points="{point_list(samples(f,xl,xr))}" fill="none" stroke="{colour}" stroke-width="3"/>')
    chart.append("</g>")
    for x,y,label,dx,dy in ticks:
        chart.append(f'<circle cx="{xx(x):.2f}" cy="{yy(y):.2f}" r="4.5" fill="#162f50"/>')
        chart.append(f'<text x="{xx(x)+dx:.2f}" y="{yy(y)+dy:.2f}" font-size="17" fill="#162f50">{escape(label)}</text>')
    chart.append("</svg>")
    target=ROOT/f"public/assets/study/0606/{folder}/{name}.svg"
    target.parent.mkdir(parents=True,exist_ok=True)
    target.write_text("".join(chart)+"\n",encoding="utf-8")
    return dict(src=f"/assets/study/0606/{folder}/{name}.svg",alt=desc,width=width,height=height,caption=p(desc))


def table(headings, rows, caption):
    headers="".join(f'<th scope="col">{header}</th>' for header in headings)
    body="".join("<tr>"+"".join(f"<td>{col}</td>" for col in row)+"</tr>" for row in rows)
    return f"<table><caption>{caption}</caption><thead><tr>{headers}</tr></thead><tbody>{body}</tbody></table>"


@dataclass
class Lesson:
    key: str
    title: str
    summary: str
    models: tuple
    sections: tuple
    terms: tuple
    tip: str
    families: int
    figure: dict | None = None
    data_table: str = ""


def build(key, title, position, lessons, generator):
    """Create bounded authored notes, distinct exam families and fresh practice pairs."""
    folder=ROOT/"content/original/0606"
    folder.mkdir(parents=True,exist_ok=True)
    prefix="addmaths-0606-"
    chapter_id=f"addmaths_0606_{key.replace('-','_')}"
    metadata,studies,bank=[],{},[]
    seen=set()
    validations=0
    for i, lesson in enumerate(lessons):
        uid=f"{prefix}{lesson.key}"
        def unique(model,seed):
            nonlocal validations
            for offset in range(200):
                candidate=model(seed+offset*7919)
                key=(candidate.stem,tuple(part.ask for part in candidate.parts))
                if key not in seen:
                    seen.add(key)
                    validations+=1
                    return candidate
            raise ValueError(f"Could not build a fresh scenario for {lesson.key} using {model.__name__}")
        sections,worked_examples,extra=[],[],[]
        for j,(anchor,heading,idea,method,mistake) in enumerate(lesson.sections):
            model=lesson.models[j]
            seed=2000*position+40000*i+400*j
            first=len(worked_examples)
            worked_examples.extend([worked(unique(model,seed+2),0),worked(unique(model,seed+4),1)])
            blocks=[dict(kind="key", html=p(idea), **({"figure":lesson.figure} if j==0 and lesson.figure else {})),
                    dict(kind="text",title="Practise the method",html=p(method)+(lesson.data_table if j==0 else "")),
                    dict(kind="example",index=first),
                    check_scenario(unique(model,seed+6),0,f"{uid}-{anchor}-1"),
                    dict(kind="mistake",html=p(mistake)),
                    dict(kind="example",index=first+1,tryFirst=True),
                    check_scenario(unique(model,seed+8),1,f"{uid}-{anchor}-2")]
            if j==2:
                blocks.append(dict(kind="tip",html=p(lesson.tip)))
            sections.append(dict(id=anchor,title=heading, label=anchor.replace("-"," ").capitalize(), minutes=5,level="core",blocks=blocks))
            extra.extend([check_scenario(unique(model,seed+10),0,f"{uid}-{anchor}-extra-a"),
                          check_scenario(unique(model,seed+12),1,f"{uid}-{anchor}-extra-b")])
        revision="".join(f"<h2>{heading}</h2>"+p(idea) for _,heading,idea,_,_ in lesson.sections)
        revision+="<h2>Quick worked example</h2>"+worked_examples[0]["question"]+"".join(worked_examples[0]["solution"][:2])
        if lesson.figure:
            art=lesson.figure
            revision+=f'<p><img src="{art["src"]}" width="260" alt="{escape(art["alt"],quote=True)}"></p>'
        previous=lessons[i-1] if i else None
        related=[dict(title=previous.title,href=f"/courses/{COURSE}/topics/{prefix}{previous.key}")] if previous else []
        studies[uid]=dict(updatedOn=DATE,description=lesson.summary,sections=sections,examples=worked_examples,extraPractice=extra,
            related=related,glossary=[dict(term=t,definition=p(d)) for t,d in lesson.terms],
            revision=dict(body=revision,checks="<ul>"+"".join(f"<li>{step[4]}</li>" for step in lesson.sections[:2])+"</ul>",examTip=p(lesson.tip)))
        metadata.append(dict(id=uid,key=lesson.key,title=lesson.title,summary=lesson.summary,objective=lesson.summary,
            before=p("Work through the examples with exact values and show the mathematical steps."),
            ideas="".join(p(row[2]) for row in lesson.sections),method="".join(f"<h4>{row[1]}</h4>"+p(row[3]) for row in lesson.sections),
            mistakes=[row[4] for row in lesson.sections],
            examples=[dict(title=e["title"],question=e["question"],solution="".join(e["solution"]),
                verification=f"{uid}-worked-{j}") for j,e in enumerate(worked_examples[::2],1)]))
        for index in range(5):
            family=f"0606-{lesson.key}-P{index+1:02d}"
            for variant in range(2):
                model=lesson.models[index%3]
                item=unique(model,900000+30007*position+70001*i+917*index+variant)
                bank.append(bank_short(f"{family}-{variant}",family,lesson.key,item,index,variant))
        for index in range(lesson.families):
            family=f"0606-{lesson.key}-W{index+1:03d}"
            for variant in range(4):
                model=lesson.models[index%3]
                item=unique(model,2700000+40091*position+70001*i+917*index+variant)
                bank.append(bank_exam(family,lesson.key,item,variant,2+int(index>=lesson.families//2)))
    digest=sha256(Path(generator).read_bytes()+Path(__file__).read_bytes()).hexdigest()
    manifest=dict(schema_version=1,key=f"0606-{key}",version="1.0.0",
        course=dict(slug=COURSE,title=TITLE,code="0606",direction="additional"),
        chapter=dict(id=chapter_id,slug=key,title=title,position=position),
        source=dict(sha256=digest,supplied=0,held=[]),lessons=metadata,questions=bank,marking_status="DRAFT")
    for name,data in ((f"{key}-v1.json",manifest),(f"{key}-study.json",studies)):
        (folder/name).write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(f"{key}: {len(lessons)} lessons, {sum(l.families for l in lessons)} written families, {len(bank)} tasks, {validations} distinct checked scenarios")
