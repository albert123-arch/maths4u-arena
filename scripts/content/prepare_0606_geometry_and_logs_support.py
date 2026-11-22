"""Shared authoring and consistency checks for 0606 chapters 5–8."""

from dataclasses import dataclass
from fractions import Fraction
from hashlib import sha256
from html import escape
from json import dumps
from math import isqrt, sqrt
from pathlib import Path
from typing import Callable


ROOT = Path(__file__).resolve().parents[2]


def m(formula):
    return r"\(" + str(formula) + r"\)"


def p(html):
    return f"<p>{html}</p>"


def tex(value):
    if isinstance(value, (int, Fraction)):
        v = Fraction(value)
        if v.denominator == 1:
            return str(v.numerator)
        sign = "-" if v < 0 else ""
        return sign + rf"\frac{{{abs(v.numerator)}}}{{{v.denominator}}}"
    return str(value)


def poly(coefs, name="x", *, latex=True):
    terms = []
    for degree, co in sorted(coefs.items(), reverse=True):
        if not co:
            continue
        coef = "" if degree and abs(co) == 1 else (tex(abs(co)) if latex else str(abs(co)))
        pow_text = name if degree == 1 else "" if degree == 0 else f"{name}^{degree}"
        sign = "-" if co < 0 else "+" if terms else ""
        terms.append(sign + coef + pow_text)
    return "".join(terms) or "0"


def minus(var, shift):
    return poly({1: 1, 0: -shift}, var)


def coefficient_pi(value):
    return ("" if value == 1 else "-" if value == -1 else tex(value)) + r"\pi" if value else "0"


def line(m_slope, intercept, x="x", y="y", *, latex=True):
    return f"{y}=" + poly({1: m_slope, 0: intercept}, x, latex=latex)


def point(xy):
    return "(" + ",".join(tex(v) for v in xy) + ")"


def radical(square):
    """Return simplified surd in both KaTeX and answer-parser syntax."""
    n = Fraction(square)
    assert n >= 0
    if not n:
        return "0", "0"
    if n.denominator != 1:
        a, b = radical(n.numerator * n.denominator)
        return rf"\frac{{{a}}}{{{n.denominator}}}", f"({b})/{n.denominator}"
    for k in range(isqrt(n.numerator), 0, -1):
        if n.numerator % (k * k) == 0:
            s = n.numerator // (k*k)
            if s == 1:
                return str(k), str(k)
            c = str(k) if k != 1 else ""
            return c + rf"\sqrt{{{s}}}", c + f"sqrt({s})"
    raise ValueError(square)


def table(headers, rows):
    return ('<table><thead><tr>' + ''.join(f'<th scope="col">{cell}</th>' for cell in headers)
            + '</tr></thead><tbody>' + ''.join('<tr>' + ''.join(f'<td>{cell}</td>' for cell in row) + '</tr>' for row in rows)
            + '</tbody></table>')


def interval(lo, hi):
    return f"({lo},{hi})"


def numbers(values):
    return "{" + ",".join(map(str, sorted(set(values)))) + "}"


def field(expected, kind="number", *, label="Your answer", variables=(), tolerance=None):
    result = dict(key="answer", label=label, type=kind, expected=str(expected))
    if variables:
        result["variables"] = list(variables)
    if kind == "approximate":
        assert tolerance is not None and 0 < tolerance <= 1
        result["absolute_tolerance"] = tolerance
    return result


def choose(answers, shift):
    """The first option is correct. Rotate its displayed position in practice."""
    assert len(set(answers)) == len(answers)
    offset = shift % len(answers)
    rotated = answers[-offset:] + answers[:-offset] if offset else answers
    return dict(field("ABCD"[offset], "choice", label="Choose one answer"), options=dict(zip("ABCD", rotated)))


@dataclass(frozen=True)
class Part:
    prompt: str
    answer: str
    explain: tuple[str, ...]
    scheme: tuple[tuple[str, str], ...]
    checker: dict | None = None
    wrong: tuple[str, str] | None = None
    quick_prompt: str | None = None


def part(prompt, answer, explain, method, checker=None, wrong=None, *, fact=False, quick=None, intermediate=()):
    scheme = (("B1", answer),) if fact else (("M1", method),) + tuple(("M1", x) for x in intermediate) + (("A1", answer),)
    return Part(prompt, answer, tuple(explain), scheme, checker, wrong, quick)


@dataclass(frozen=True)
class Problem:
    title: str
    given: str
    parts: tuple[Part, ...]
    figure_html: str = ""


def problem(title, given, *parts, figure_html=""):
    assert given and parts
    return Problem(title, given, parts, figure_html)


@dataclass(frozen=True)
class Section:
    slug: str
    title: str
    intro: str
    idea: str
    mistake: str
    tip: str
    make: Callable[[int], Problem]
    figure: dict | None = None
    extension: bool = False


@dataclass(frozen=True)
class Lesson:
    slug: str
    title: str
    objective: str
    sections: tuple[Section, ...]
    terms: tuple[tuple[str, str], ...]
    exam_families: int
    methods: tuple[Callable[[int], Problem], ...] = ()


def question_html(task):
    return p(task.given) + task.figure_html + '<ol type="a" class="parts">' + ''.join(
        f'<li>{p(row.prompt)}<span class="marks">[{len(row.scheme)}]</span></li>' for row in task.parts
    ) + '</ol>'


def solution_steps(task):
    return [p(f'<strong>({"abcdefghijklmnopqrstuvwxyz"[index]})</strong> {text}' if first == 0 else text)
            for index, part_ in enumerate(task.parts)
            for first, text in enumerate((*part_.explain, part_.answer))]


def quick_part(task):
    quick = next(a for a in task.parts if a.checker is not None)
    return quick, p(task.given) + task.figure_html + p(quick.quick_prompt or quick.prompt)


def check(uid, task):
    quick, prompt = quick_part(task)
    return dict(kind="check", id=uid, prompt=prompt, field=quick.checker, hint=p(quick.scheme[0][1]),
                solution=''.join(p(x) for x in (*quick.explain, quick.answer)),
                **({"retry": [{"answer": quick.wrong[0], "feedback": p(quick.wrong[1])}]} if quick.wrong else {}))


def example(task):
    return dict(title=task.title, question=question_html(task), solution=solution_steps(task))


def short(uid, family, lesson, task, fresh=False):
    quick, prompt = quick_part(task)
    return dict(id=uid, family_uid=family, lesson=lesson, title=task.title, collection="variant" if fresh else "short",
                prompt_html=prompt, answer_html=p(quick.answer), solution_html=''.join(p(step) for step in (*quick.explain, quick.answer)),
                hint_html=p(quick.scheme[0][1]), marks=1, difficulty=2, fields=[quick.checker],
                parts=[dict(label="a", marking_criteria=[dict(code="B1", marks=1, description_html=p(quick.answer))])], verification=uid)


def written(uid, family, lesson, task, variant):
    answer = ''.join(p(f'<strong>({chr(97+i)})</strong> {row.answer}') for i, row in enumerate(task.parts))
    rubric = [dict(label=chr(97+i), marking_criteria=[dict(code=code, marks=1, description_html=p(text)) for code, text in row.scheme])
              for i, row in enumerate(task.parts)]
    return dict(id=uid, family_uid=family, lesson=lesson, title=task.title, collection="exam", prompt_html=question_html(task),
                answer_html=answer, solution_html=''.join(solution_steps(task)), hint_html=p(task.parts[0].scheme[0][1]),
                marks=sum(len(row.scheme) for row in task.parts), difficulty=3 if len(task.parts) < 3 else 4, fields=[], parts=rubric,
                verification=uid, variant_index=variant)


def figure(chapter, key, alt, body, caption, *, h=228):
    target = ROOT / f"public/assets/study/0606/{chapter}"
    target.mkdir(parents=True, exist_ok=True)
    source = f'/assets/study/0606/{chapter}/{key}.svg'
    data = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 {h}" role="img" aria-labelledby="t">'
            f'<title id="t">{escape(alt)}</title><rect width="360" height="{h}" rx="12" fill="#fbfdff"/>'
            '<g stroke-linejoin="round" stroke-linecap="round">'+body+'</g></svg>\n')
    (target/f'{key}.svg').write_text(data,encoding="utf-8")
    return dict(src=source, alt=alt, width=360, height=h, caption=p(caption))


def figure_html(plot):
    return f'<p><img src="{plot["src"]}" alt="{escape(plot["alt"], quote=True)}" width="360" height="{plot["height"]}"></p>'


def label(x, y, text, *, size=14, colour="#233e5c", align="middle"):
    return f'<text x="{x:.2f}" y="{y:.2f}" fill="{colour}" font-family="system-ui, sans-serif" font-size="{size}" text-anchor="{align}">{escape(str(text))}</text>'


def path(points, stroke="#246393", *, fill="none", width=2.55, dash="", closed=False):
    d = " ".join(("M" if i == 0 else "L") + f"{x:.2f} {y:.2f}" for i,(x,y) in enumerate(points))
    if closed:
        d += 'Z'
    return f'<path d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{width}"' + (f' stroke-dasharray="{dash}"' if dash else '') + '/>'


def grid(chapter, key, alt, caption, *, xrange=(-4,4), yrange=(-3,3), curves=(), dots=(), guides=(),
         highlights=(), equal=False, axes=("x","y"), ticks=True):
    """Clipped Cartesian drawing. Curves are sequences of world coordinates."""
    a,b=xrange;c,d=yrange
    dx,dy=300/(b-a),166/(d-c)
    if equal:
        dx=dy=min(dx,dy)
    left, top = 180-dx*(b-a)/2, 110-dy*(d-c)/2
    right,bottom = left+(b-a)*dx,top+(d-c)*dy

    def X(x):
        return left+(x-a)*dx

    def Y(y):
        return top+(d-y)*dy

    shade=[]
    if ticks:
        for x in range(int(a),int(b)+1):
            if a<=x<=b:
                shade.append(path(((X(x),top),(X(x),bottom)),"#d9e4f2",width=0.8))
                if x:
                    shade.append(label(X(x), min(bottom+15,Y(0)+14), str(x),size=11))
        for y in range(int(c),int(d)+1):
            if c<=y<=d:
                shade.append(path(((left,Y(y)),(right,Y(y))),"#d9e4f2",width=0.8))
                if y:
                    shade.append(label(max(left-8,X(0)-7),Y(y)+4,str(y),size=11,align="end"))
    if c <= 0 <= d:
        shade.extend((path(((left,Y(0)),(right+3,Y(0))),"#344d69",width=1.45),label(right+11,Y(0)+4,axes[0],size=14)))
    if a <= 0 <= b:
        shade.extend((path(((X(0),bottom),(X(0),top-2)),"#344d69",width=1.45),label(X(0),top-7,axes[1],size=14)))
    detail=[]
    for points,fill,stroke in highlights:
        detail.append(path(((X(x),Y(y)) for x,y in points),stroke,fill=fill,width=1.75,closed=True))
    for points, colour in guides:
        detail.append(path(((X(x),Y(y)) for x,y in points),colour,dash="5 4",width=1.8))
    for points, colour in curves:
        detail.append(path(((X(x),Y(y)) for x,y in points),colour))
    front=[]
    for x,y,t in dots:
        if a<=x<=b and c<=y<=d:
            front.append(f'<circle cx="{X(x):.2f}" cy="{Y(y):.2f}" r="3.2" fill="#156349"/>')
            front.append(label(X(x)+8,Y(y)-7,t,size=13,align="start"))
    clip = f'<defs><clipPath id="plot"><rect x="{left}" y="{top}" width="{right-left}" height="{bottom-top}"/></clipPath></defs>'
    return figure(chapter,key,alt,''.join(shade)+clip+'<g clip-path="url(#plot)">'+''.join(detail)+'</g>'+''.join(front),caption)


def build(chapter_slug, title, position, code, lessons, filename, *, version="1.0.0"):
    """Write exact local import manifests with stable chapter, lesson and family identities."""
    study = {}
    manifest_lessons, questions = [], []
    for lesson_index, lesson in enumerate(lessons):
        lid = f"addmaths-0606-{code}-{lesson.slug}"
        sections, examples, extra, revision = [], [], [], []
        for idx, section in enumerate(lesson.sections):
            base = 170+13*(lesson_index+4*idx)
            first = len(examples)
            examples.extend(example(section.make(seed)) for seed in (base,base+6))
            item = f"{lid}-{section.slug}"
            blocks = [dict(kind="key",html=p(section.idea),**({"figure":section.figure} if section.figure else {})),
                      dict(kind="example",index=first),check(item+"-a",section.make(base+1)),
                      dict(kind="mistake",html=p(section.mistake)),dict(kind="example",index=first+1,tryFirst=True),
                      check(item+"-b",section.make(base+3)),dict(kind="tip",html=p(section.tip))]
            sections.append(dict(id=section.slug,title=section.title,label=section.slug.replace('-',' ').capitalize(),
                                 minutes=8,level="extension" if section.extension else "core",intro=p(section.intro),blocks=blocks))
            extra.extend(check(item+f"-more-{k}",section.make(base+k+8)) for k in (1,2))
            revision.extend([f"<h2>{section.title}</h2>", p(section.idea)])
        diagram = next((section.figure for section in lesson.sections if section.figure),None)
        if diagram:
            revision.append(figure_html(diagram).replace('width="360"','width="250"'))
        revision_item = lesson.sections[0].make(61 + lesson_index)
        revision_part,_=quick_part(revision_item)
        revision_check = p(revision_item.given + ' ' + (revision_part.quick_prompt or revision_part.prompt)) + p('<strong>Check:</strong> ' + revision_part.answer)

        maybe_links = ([dict(title=lessons[lesson_index-1].title,
                            href=f'/courses/maths4u-0606/topics/addmaths-0606-{code}-{lessons[lesson_index-1].slug}')]
                       if lesson_index else [])
        study[lid]=dict(updatedOn="2026-11-22",description=lesson.objective,sections=sections,examples=examples,extraPractice=extra,
                        related=maybe_links,glossary=[dict(term=term,definition=p(text)) for term,text in lesson.terms],
                        revision=dict(body=''.join(revision),checks=revision_check,examTip=p(lesson.sections[-1].tip)))
        manifest_lessons.append(dict(id=lid,key=lesson.slug,title=lesson.title,summary=lesson.objective,objective=lesson.objective,
                                    before=p(lesson.sections[0].intro),ideas=''.join(p(x.idea) for x in lesson.sections),
                                    method=''.join(p(x.tip) for x in lesson.sections),mistakes=[x.mistake for x in lesson.sections],
                                    examples=[dict(title=e["title"],question=e["question"],solution=''.join(e["solution"]),verification=f'{lid}-example-{j+1}')
                                              for j,e in enumerate(examples[::2])]))
        for index in range(5):
            family=f'{lid}-S{index+1:02}'
            make=lesson.sections[index % len(lesson.sections)].make
            for variant in range(2):
                q=make(600+lesson_index*51+8*index+variant*3)
                questions.append(short(f'{family}-{variant}',family,lesson.slug,q, bool(variant)))
        available = lesson.methods or tuple(section.make for section in lesson.sections)
        for index in range(lesson.exam_families):
            family=f'{lid}-E{index+1:02}'
            make=available[index % len(available)]
            for variant in range(4):
                seed=10000+319*lesson_index+index*4+variant
                q=make(seed)
                questions.append(written(f'{family}-{variant}',family,lesson.slug,q,variant))
    signatures=set()
    for q in questions:
        signature=q['prompt_html'] + dumps([sorted(x.get('options',{}).values()) for x in q['fields']])
        if signature in signatures:
            raise ValueError(f"Repeated prompt: {q['id']}: {q['prompt_html'][:290]}")
        signatures.add(signature)
        assert len(q['id']) <= 80, q['id']
    path_=ROOT/'content/original/0606'
    path_.mkdir(parents=True,exist_ok=True)
    # The archive informs the skill audit. Nothing is copied into the authored bank.
    checksum=sha256(Path(filename).read_bytes()+Path(__file__).read_bytes()).hexdigest()
    package=dict(schema_version=1,key='0606-'+chapter_slug,version=version,
                 course=dict(slug='maths4u-0606',title='Cambridge IGCSE Additional Mathematics (0606)',code='0606',direction='additional'),
                 chapter=dict(id='addmaths_0606_'+chapter_slug.replace('-','_'),slug=chapter_slug,title=title,position=position),
                 source=dict(sha256=checksum,supplied=0,held=[]),lessons=manifest_lessons,questions=questions,marking_status='DRAFT')
    for suffix, item in (("v1",package),("study",study)):
        (path_/f'{chapter_slug}-{suffix}.json').write_text(dumps(item,ensure_ascii=False,indent=2)+'\n',encoding="utf-8")
    print(f'{chapter_slug}: {len(lessons)} lessons, {sum(l.exam_families for l in lessons)} written families, {len(questions)} tasks')
