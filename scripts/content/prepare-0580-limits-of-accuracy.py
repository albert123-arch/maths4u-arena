"""Generate the independently authored 0580 C1.10/E1.10 limits of accuracy package."""
from decimal import Decimal
from fractions import Fraction
from hashlib import sha256
from html import escape
import json
from pathlib import Path
from runpy import run_path

ROOT = Path(__file__).resolve().parents[2]
course = "maths4u-0580"
prefix = "igcse-0580-bounds"
previous = run_path(str(Path(__file__).with_name("prepare-0580-number-types.py")))
p, m, frac, task, check, line, label, table = (
    previous[k] for k in ("p", "m", "fraction", "task", "check", "line", "label", "table")
)


def decimal(n):
    n = Fraction(n)
    return format((Decimal(n.numerator) / Decimal(n.denominator)).normalize(), "f")


def exact(q):
    q = Fraction(q)
    return m(frac(q.numerator, q.denominator))


def scalar(title, prompt, name, amount, steps, hint, method, wrong=None, as_fraction=False):
    formatted = exact(amount) if as_fraction else m(decimal(amount))
    q = task(title, prompt, name, str(Fraction(amount)), [*steps, f"The answer is {formatted}."], hint, wrong)
    q.update(result=formatted, criterion=method)
    return q


def interval(title, prompt, lo, hi, steps, hint, method):
    low, high = decimal(lo), decimal(hi)
    notation = m(fr"{low}\le x<{high}")
    q = task(title, prompt, "Error interval for x", f"[{low},{high})", [*steps, f"Write {notation}."],
        hint, (f"[{low},{high}]", "Check the top end. At the upper bound the value rounds to the next reading."), kind="set")
    q["field"]["variables"] = ["x"]
    q.update(result=notation, criterion=method)
    return q


def metre_limit(seed, want_lower=False):
    reported = 23 + 3 * seed
    sign = -1 if want_lower else 1
    word = "lower" if want_lower else "upper"
    op = "-" if want_lower else "+"
    return scalar(f"Find the {word} end of a rounded length",
        f"A roll of fabric measures {reported} m to the nearest metre. Give the {word} bound in metres.",
        f"{word.capitalize()} bound in metres", reported + sign * Fraction(1, 2),
        ["The spacing between readings is 1 m. Half that spacing is 0.5 m.",
         f"Start at the recorded length and move {'down' if want_lower else 'up'} by 0.5 m: {m(f'{reported}{op}0.5')}."],
        "Find the midpoint between the given reading and its neighbour.",
        "Subtract or add half a metre as required.", (reported + sign, "The cut-off is halfway to the next reading, not a full metre away."))


def decimal_limit(seed):
    reading = Fraction(256 + 7 * seed, 100)
    gap = Fraction(1, 100)
    result = reading - gap / 2
    shown = f"{float(reading):.2f}"
    return scalar("Read the scale before halving",
        f"A scale shows {shown} kg, rounded to 2 decimal places. Give the lower bound in kilograms.",
        "Lower bound in kg", result,
        ["Two decimal places means the spacing is 0.01 kg.", "Half the spacing is 0.005 kg.",
         f"Subtract from the reading: {m(f'{shown}-0.005')}."],
        "Two decimal places gives a step of one hundredth, not one tenth.",
        "Subtract half a hundredth from the given reading.",
        (reading - Fraction(5, 100), "This subtracts half a tenth. Here the last recorded place is hundredths."))


def tens_interval(seed, increment=10):
    reading = (26 + seed * 3) * increment
    half = Fraction(increment, 2)
    return interval("Give the complete error interval",
        f"A measurement of {m('x')} m is recorded as {reading} m to the nearest {increment} m. Give the error interval for {m('x')}.",
        reading - half, reading + half,
        [f"Two successive readings are {increment} m apart, so the half step is {decimal(half)} m.",
         f"Subtract and add {decimal(half)} to find the two cut-off points.",
         "The lower cut-off rounds to the given reading. The upper cut-off rounds to the next reading."],
        "Show the two cut-offs and decide which one belongs in the interval.",
        "Find both midpoints by subtracting and adding half the given rounding unit.")


def significant_interval(seed):
    reading = (31 + seed % 60) * 10
    return interval("Use the place of the last significant digit",
        f"A mass {m('x')} g is recorded as {reading} g correct to 2 significant figures. Give the error interval for {m('x')}.",
        reading - 5, reading + 5,
        [f"The second significant digit in {reading} is the tens digit.",
         f"The nearest-ten step is 10 g. Subtract and add 5 g from {reading} g.",
         "Include the lower end. Exclude the upper end because it rounds up."],
        "Count the significant digits from the first non-zero digit. Find the place of the second digit.",
        "Identify the rounding unit from 2 significant figures and move half that unit on either side.")


def allowed_cutoff(seed):
    reading = Fraction(74 + seed, 10)
    upper = reading + Fraction(1, 20)
    lower = reading - Fraction(1, 20)
    return interval("Show which cut-off is included",
        f"A machine displays a width {m('x')} cm as {decimal(reading)} cm to the nearest 0.1 cm. Write the error interval for {m('x')}.",
        lower, upper,
        [f"The cut-offs are halfway to the next readings: {m(decimal(lower))} and {m(decimal(upper))}.",
         f"{m(decimal(lower))} rounds up to the displayed width. The other cut-off rounds up to the next tenth."],
        "Use a closed point at the lower end and an open point at the upper end.",
        "Find the two cut-offs using half a tenth.")


def total_length(seed):
    left, right = 25 + 2 * seed, 13 + seed
    return scalar("Find an upper bound for a total",
        f"Two strips measure {left} cm and {right} cm, each to the nearest centimetre. Find the upper bound for their combined length in centimetres.",
        "Upper bound in cm", left + right + 1,
        [f"The upper bounds are {m(f'{left}+0.5={left}.5')} and {m(f'{right}+0.5={right}.5')}.",
         "Making either strip longer raises the total. Add these two upper bounds."],
        "Find the longest allowed value at each end of the join.",
        "Use the upper bound for each strip and add.",
        (left + right, "That sum uses the rounded lengths. Start with their upper bounds."))


def difference(seed):
    longer, shorter = 29 + 2 * seed, 11 + seed
    return scalar("Find a lower bound for a gap",
        f"A shelf opening measures {longer} cm and a case measures {shorter} cm, both to the nearest centimetre. Find the lower bound for the unused width in centimetres.",
        "Lower bound of the gap in cm", longer - shorter - 1,
        [f"The smallest opening is {longer-1}.5 cm. The case can approach {shorter}.5 cm.",
         f"Use the smallest opening and the upper cut-off for the case: {m(f'{longer-1}.5-{shorter}.5')}."],
        "A smaller opening and a larger case leave a smaller gap.",
        "Subtract the upper bound of the case width from the lower bound of the opening.",
        (longer - shorter, "Subtracting both lower bounds keeps the rounded gap. Use the opposite ends."))


def area(seed):
    length, width = 19 + seed, 6 + seed % 6
    low_a, low_b = Fraction(2 * length - 1, 2), Fraction(2 * width - 1, 2)
    return scalar("Use the shortest sides for the least area",
        f"A rectangular sign measures {length} cm by {width} cm, both to the nearest centimetre. Find the lower bound for the area in square centimetres.",
        "Lower bound in square centimetres", low_a * low_b,
        [f"The smallest side lengths are {m(decimal(low_a))} cm and {m(decimal(low_b))} cm.",
         f"Both are positive. Multiply the lower bounds: {m(decimal(low_a)+r'\times'+decimal(low_b))}."],
        "A smaller positive length and a smaller positive width give a smaller area.",
        "Find both lower side bounds and multiply them.",
        (length * width, "The product of the readings is an estimate of the area, not its lower bound."))


def speed(seed, want_upper=False):
    distance, time = 48 + 5 * seed, 9 + seed % 6
    sign = 1 if want_upper else -1
    d, t = distance + sign * Fraction(1, 2), time - sign * Fraction(1, 2)
    word = "upper" if want_upper else "lower"
    return scalar(f"Find the {word} bound of a speed",
        f"A robot travels {distance} m to the nearest metre in {time} s to the nearest second. Find the {word} bound of average speed in metres per second. Give your answer exactly.",
        f"{word.capitalize()} bound in m/s", d / t,
        [f"The speed is distance divided by time. Use distance {m(decimal(d))} m and time {m(decimal(t))} s.",
         f"Divide {m(fr'\frac{{{decimal(d)}}}{{{decimal(t)}}}')}, then give the exact result."],
        f"For the {word} speed, use a {'longer journey in less' if want_upper else 'shorter journey in more'} time.",
        "Divide the upper distance by the lower time." if want_upper else "Divide the lower distance by the upper time.",
        (Fraction(distance, time), "This uses the displayed readings. Choose the appropriate bounds first."), as_fraction=True)


def guaranteed_fit(seed):
    left, right = 18 + 2 * seed, 12 + seed
    capacity = left + right + (seed % 2)
    ub = left + right + 1
    yes = ub <= capacity
    result = "A" if yes else "B"
    opts = {"A": "Yes", "B": "No"}
    q = task("Make a guaranteed fit decision",
        f"A tray is exactly {capacity} cm long. Two bars measured to the nearest centimetre are {left} cm and {right} cm long. Are they guaranteed to fit end to end?",
        "Guaranteed to fit", result,
        [f"The total bar length is less than {m(ub)} cm, because each bar is below its own upper bound.",
         (f"The total is always less than {capacity} cm, so both bars fit." if yes else
          f"Some allowed totals are above {capacity} cm, so the fit is uncertain.")],
        "Compare the upper bound of the total length with the exact tray length.",
        ("B" if yes else "A", "Base a guarantee on every allowed total, including those near its upper cut-off."),
        kind="choice", options=opts)
    q.update(result=opts[result], criterion="Find the sum of the upper bounds and compare it with the exact length.")
    q["exam_prompt"] = p("Give Yes or No and justify your decision. " + q["prompt"][3:-4])
    return q


LOWER = lambda seed: metre_limit(seed, True)
UPPER = metre_limit
SLOW = speed
FAST = lambda seed: speed(seed, True)
HUNDREDS = lambda seed: tens_interval(seed, 100)

LESSONS = [
    ("single-measurements", "Upper and lower bounds of a measurement", "Find lower and upper bounds by halving the spacing between rounded readings.", False, [
        ("start", "How low could the reading have been?", "First imagine the previous reading on a number line. The point halfway between it and the given reading is the lower cut-off.", "Move down by half one rounding step to find the lower bound.", "Use half the spacing between readings. A full step lands on a different rounded value.", LOWER, "half-step"),
        ("end", "Where does the next reading begin?", "The midpoint above the recorded value is where the next rounding band begins. The measurement can approach this cutoff from below.", "The upper bound is halfway from the given reading to the next reading.", "Keep the exact cut-off. There is no need to write a string of 9s just below it.", UPPER, None),
        ("scale", "What changes with decimal places?", "Find the last place recorded on the scale. A measurement to two decimal places has one hundredth between possible readings.", "To 2 decimal places the step is 0.01, so halve it to get 0.005.", "For two decimal places, subtracting 0.05 uses the wrong scale.", decimal_limit, None),
    ]),
    ("error-intervals", "Writing and reading error intervals", "Write a complete error interval and explain its open and closed ends.", False, [
        ("nearest", "How do I show both cut-offs together?", "Once you have the two bounds, write the unknown quantity between them. The exact value may be anywhere inside that region.", f"Write {m(r'L\le x<U')} when a positive value is rounded to a fixed step. The inequality includes the lower bound.", "Use a less-than sign at the upper end. Beyond that cut-off, the value rounds to a different reading.", tens_interval, "interval"),
        ("digits", "What if the accuracy uses significant figures?", "Underline the last significant digit and name its place. For example, 460 g to two significant figures has its last significant digit in the tens column.", "Find the neighbouring rounded readings, then take a midpoint on each side. In these examples the neighbours are one ten apart.", "At a place-value boundary the two neighbours can have different spacings. Look at both neighbours.", significant_interval, None),
        ("endpoints", "Which dot should be filled?", "A filled dot shows an included end. An open dot shows a value that the interval approaches but never reaches.", "At a fixed rounding step, the lower midpoint rounds up to the recorded value and the upper midpoint rounds up to the next one.", "Checking how each midpoint itself rounds is a quick way to choose the inequality signs.", allowed_cutoff, None),
    ]),
    ("sums-products", "Bounds of sums, differences and products", "Choose the right ends of measurement intervals for totals, differences and areas.", True, [
        ("total", "Which ends make a total largest?", "Length added to length gives a longer total. Make both measurements as large as allowed when finding the upper bound.", "For a sum, combine upper with upper, or lower with lower.", "Round only if the question requests it. Keep the exact bounds while combining them.", total_length, None),
        ("gap", "Which ends make a gap smallest?", "If the opening shrinks, the gap shrinks. If the object inside grows, the gap also shrinks. These changes point to opposite ends of the intervals.", "For the lower bound of a difference, subtract the upper bound of the second measurement from the lower bound of the first.", "Subtracting lower from lower does not give the smallest possible gap.", difference, "gap"),
        ("area", "Which rectangle has the least area?", "With positive sides, making either side shorter makes the area smaller. Find both lower side limits before multiplying.", "For the least area, use the two lower bounds. For the upper bound, use the two upper bounds.", "Use square units for area. Keep any decimal parts in the lengths.", area, "sign"),
    ]),
    ("quotients-decisions", "Bounds of rates and guaranteed decisions", "Use the bounds of distance and time to find a speed limit, then apply bounds to a fit decision.", True, [
        ("slow", "How can a journey be as slow as possible?", "For the slowest journey, pick a distance near the smallest allowed value and a time near the largest. The denominator works in the opposite direction to the numerator.", "For positive quantities, the lower bound of a quotient is the lower numerator divided by the upper denominator.", "Using two lower limits can make the answer too high because it also makes the time too short.", SLOW, "speed"),
        ("fast", "How can a journey be as fast as possible?", "For the highest speed, combine a long distance with a short time. Check both pieces of rounding information before dividing.", "Find the upper numerator and the lower denominator. The lower denominator must be positive.", "A bound can be approached without being attained. Write the upper bound as the limiting value.", FAST, None),
        ("fit", "Can I promise that it will fit?", "Test the situation that puts the most demand on the space. A rounded total below the space limit alone cannot justify a guarantee.", "Compare the upper bound of the total with the exact capacity. If the total is always below or equal to the capacity, it fits.", "If some allowed lengths exceed the available space, the fit is uncertain. It may still fit for shorter lengths.", guaranteed_fit, None),
    ]),
]


def pictures():
    folder = ROOT / "public/assets/study/0580/limits-of-accuracy"
    folder.mkdir(parents=True, exist_ok=True)
    deep, muted, green, orange = "#1d3657", "#6380a2", "#126758", "#9d491f"

    def svg(name, description, body, caption):
        tag = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 120" role="img" aria-labelledby="title">'
               f'<title id="title">{escape(description)}</title><rect width="400" height="120" rx="12" fill="#fff"/>{body}</svg>\n')
        (folder / f"{name}.svg").write_text(tag, encoding="utf-8")
        return dict(src=f"/assets/study/0580/limits-of-accuracy/{name}.svg", alt=description, caption=p(caption),
                    width=400, height=120)

    def dot(x, y, solid):
        fill = green if solid else "white"
        return f'<circle cx="{x}" cy="{y}" r="6" fill="{fill}" stroke="{green}" stroke-width="3"/>'

    def bar(x,y,w,h,fill):
        return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="5" fill="{fill}"/>'

    ticks = line(27, 65, 373, 65, muted)
    for x, n in [(60, "38"), (130, "38.5"), (200, "39"), (270, "39.5"), (340, "40")]:
        ticks += line(x, 59, x, 72, deep) + label(x, 98, n)
    interval_drawing = line(40, 68, 360, 68, muted) + line(107, 68, 293, 68, green)
    interval_drawing += dot(107, 68, True) + dot(293, 68, False)
    interval_drawing += label(107, 100, "215") + label(293, 100, "225") + label(200, 39, "Rounds to 220")
    gap_drawing = bar(37, 46, 325, 38, "#dce7f7") + bar(42, 51, 245, 28, "#c5e8de")
    gap_drawing += label(162, 71, "Case") + label(324, 71, "Gap") + label(200, 31, "Inside of opening")
    sign_drawing = '<rect x="108" y="24" width="185" height="68" fill="#dce7f7" stroke="#1d3657" stroke-width="2"/>'
    sign_drawing += '<rect x="108" y="43" width="144" height="49" fill="#a5d4c5" stroke="#126758" stroke-width="2"/>'
    sign_drawing += label(180, 70, "Lower area") + label(200, 113, "Both sides are shorter")
    speed_drawing = bar(120, 24, 158, 12, "#c5e8de") + bar(120, 74, 216, 12, "#f1d9c6")
    speed_drawing += label(66, 35, "Distance") + label(66, 86, "Time")
    speed_drawing += line(119, 43, 279, 43, green) + line(119, 95, 336, 95, orange)
    return {
        "half-step": svg("half-step", "Number line from 38 to 40, with half steps at 38.5 and 39.5.",
            ticks + line(130, 48, 270, 48, green) + label(200, 32, "Round to 39"), "The two midpoints mark the edges of the band."),
        "interval": svg("interval", "Number line with a filled dot at 215 and an open dot at 225.",
            interval_drawing, f"The filled dot includes {m(215)}. The open dot excludes {m(225)}."),
        "gap": svg("gap", "A case leaves a narrow gap inside the opening.",
            gap_drawing, "A longer case or a shorter opening makes the gap smaller."),
        "sign": svg("sign", "A smaller rectangle shares one corner with a larger rectangle.",
            sign_drawing, "Reducing either side reduces the rectangle's area."),
        "speed": svg("speed", "The distance and time bars show the short distance and long time used for a low speed.",
            speed_drawing, "Use the lower distance and the upper time to get a lower bound for speed."),
    }


def short(id, family, key, q, variant, extended):
    return dict(id=id, family_uid=family, lesson=key, title=q["title"],
        collection="variant" if variant else "short", prompt_html=q["prompt"], answer_html=p(q["result"]),
        hint_html=q["hint"], solution_html="".join(q["steps"]), marks=1, difficulty=2 if extended else 1,
        fields=[q["field"]], parts=[dict(label="a", marking_criteria=[
            dict(code="B1", marks=1, description_html=p(q["result"]))])], verification=id)


def exam(id, family, key, title, parts, variant, extended):
    prompts, answers, solutions, hints, criteria = [], [], [], [], []
    for index, q in enumerate(parts):
        letter = chr(97 + index)
        prompts.append(f'<li>{q.get("exam_prompt", q["prompt"])}<p>Show your working.</p><span class="marks">[2]</span></li>')
        answers.append(p(f"({letter}) {q['result']}"))
        solutions.append(f'<section class="solution-part"><h4>({letter})</h4>{"".join(q["steps"])}</section>')
        hints.append(p(f"({letter})") + q["hint"])
        criteria.append(dict(label=letter, marking_criteria=[dict(code="M1", marks=1, description_html=p(q["criterion"])),
            dict(code="A1", marks=1, description_html=p(q["result"]))]))
    return dict(id=id, family_uid=family, lesson=key, title=title, collection="exam", fields=[],
        prompt_html='<ol class="parts" type="a">' + "".join(prompts) + "</ol>", answer_html="".join(answers),
        solution_html="".join(solutions), hint_html="".join(hints), marks=len(parts) * 2,
        parts=criteria, difficulty=3 if extended else 2, verification=id, variant_index=variant)


def build():
    figs = pictures()
    lessons, study, questions = [], {}, []
    for key, title, summary, extended, strategies in LESSONS:
        id = f"{prefix}-{key}"
        examples, sections, extras = [], [], []
        for j, (anchor, heading, intro, idea, mistake, gen, figure) in enumerate(strategies):
            start = len(examples)
            for seed in (j + 2, j + 5):
                q = gen(seed)
                question = q["prompt"]
                if "options" in q["field"]:
                    question += p("Give Yes or No and explain your answer.")
                examples.append(dict(title=q["title"], question=question, solution=q["steps"]))
            blocks = [dict(kind="key", html=p(idea), **({"figure": figs[figure]} if figure else {})),
                dict(kind="example", index=start), check(f"{id}-{anchor}-1", gen(8+j)),
                dict(kind="mistake", html=p(mistake)), dict(kind="example", index=start+1, tryFirst=True),
                check(f"{id}-{anchor}-2", gen(11+j))]
            sections.append(dict(id=anchor, title=heading, label=anchor.replace("-", " ").capitalize(),
                minutes=7, level="core", intro=p(intro), blocks=blocks))
            extras.extend(check(f"{id}-{anchor}-extra-{n+1}", gen(15 + 2*j + n)) for n in range(2))

        scope = "Extended (E1.10). " if extended else "Core and Extended. "
        revision = "".join(f"<h2>{row[1]}</h2>" + p(row[3]) for row in strategies)
        figure = next((figs[s[-1]] for s in strategies if s[-1]), None)
        if figure:
            revision += f'<p><img width="270" src="{figure["src"]}" alt="{escape(figure["alt"],quote=True)}"></p>'
        quizzes = [item[5](4+j) for j, item in enumerate(strategies[:2])]
        check_html = "<ol>" + "".join(f"<li>{q['prompt']}<p><strong>Answer.</strong> {q['result']}</p></li>" for q in quizzes) + "</ol>"
        study[id] = dict(updatedOn="2026-11-22", description=scope+summary, sections=sections, examples=examples,
            glossary=[dict(term="Rounding step",definition=p("The spacing between two adjacent readings at the same fixed accuracy.")),
                dict(term="Lower bound",definition=p("The bottom cut-off for the possible actual values.")),
                dict(term="Upper bound",definition=p("The top cut-off for the possible actual values.")),
                dict(term="Error interval",definition=p("The range of all possible values behind the recorded one."))],
            extraPractice=extras, revision=dict(body=revision, checks=check_html, examTip=p(strategies[-1][4])))
        if lessons:
            prior = lessons[-1]
            study[id]["related"] = [dict(title=prior["title"], href=f"/courses/{course}/topics/{prior['id']}")]
        lessons.append(dict(key=key, id=id, title=title + (" (Extended)" if extended else ""), summary=scope+summary,
            objective=summary, before=p("Identify the last recorded place in two measurements before you start."),
            ideas="".join(p(row[3]) for row in strategies),
            method="".join(f"<h4>{row[1]}</h4>" + p(row[2]) for row in strategies),
            mistakes=[row[4] for row in strategies], examples=[dict(title=e["title"], question=e["question"],
              solution="".join(e["solution"]), verification=f"{id}-example-{j+1}") for j,e in enumerate(examples[::2])]))
        gens = [item[5] for item in strategies]
        group_title = [[("Between two readings",0,1),("A scale on two settings",1,2),("Lower cut-offs",0,2),
                        ("Round a pair of lengths",0,1),("Whole and decimal scale",2,1)],
                       [("Read a rounding band",0,1),("Keep or exclude the cut-off",1,2),("Compare rounding scales",0,2),
                        ("Report two intervals",2,1),("Rounding bands at different scales",1,0)],
                       [("Compare a total and an area",0,2),("A gap and a total",1,0),("Lower limits from measures",1,2),
                        ("Cut pieces and signs",0,2),("Measurements in a workshop",2,1)],
                       [("Slowest and fastest journeys",0,1),("Check two guarantees",1,2),("Bound a speed and a fit",2,0),
                        ("Limits of two quotients",1,0),("Plan lengths and times",2,1)]][len(lessons)-1]
        for j, (name, a, b) in enumerate(group_title):
            family = f"{id}-P{j+1}"
            for v in range(2):
                questions.append(short(f"{family}-{v}", family, key, gens[a](24+4*j+v), v, extended))
            family = f"{id}-E{j+1}"
            for v in range(4):
                seed = 60 + 12*j + v
                questions.append(exam(f"{family}-{v}", family, key, name,
                    [gens[a](seed), gens[b](seed+3)], v, extended))
    pack = dict(schema_version=1, key="0580-number-limits-of-accuracy", version="1.0.1",
        course=dict(slug=course, title="Cambridge IGCSE Mathematics (0580)", code="0580", direction="igcse"),
        chapter=dict(id="igcse_0580_number_limits_of_accuracy", slug="limits-of-accuracy", title="Limits of accuracy", position=9),
        source=dict(sha256=sha256(Path(__file__).read_bytes()).hexdigest(), supplied=0, held=[]),
        lessons=lessons, questions=questions, marking_status="DRAFT")
    for name, content in [("limits-of-accuracy-study.json", study), ("limits-of-accuracy-v1.json", pack)]:
        (ROOT / "content/original/0580" / name).write_text(json.dumps(content, ensure_ascii=False, indent=2)+"\n",encoding="utf-8")
    print(f"{len(lessons)} lessons, {len(questions)} bank questions and {len(figs)} diagrams")


if __name__ == "__main__":
    build()
