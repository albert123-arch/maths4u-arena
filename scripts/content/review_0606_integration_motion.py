"""Draw the exact models used in Arena's 0606 area and motion study checks."""

import json
import math
import re
from html import escape

import sympy
from sympy.parsing.sympy_parser import implicit_multiplication_application, parse_expr, standard_transformations

from addmaths_calculus import ROOT, T, X, m, p

STUDY = ROOT / "content/original/0606"
SVG = ROOT / "public/assets/study/0606"
TRANSFORM = standard_transformations + (implicit_multiplication_application,)


def read(name):
    return json.loads((STUDY / (name + "-study.json")).read_text(encoding="utf-8"))


def write(name, data):
    (STUDY / (name + "-study.json")).write_text(
        json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )


def graph(folder, name, expression, variable, a, b, labels, shade=True, compared=None):
    """Use the stated interval, with identical axes for the curve and every region."""
    f = sympy.lambdify(variable, expression, "math")
    other = sympy.lambdify(variable, compared if compared is not None else 0, "math")
    difference = expression if compared is None else expression - compared
    crossings = sorted(set(float(r) for r in sympy.solve(difference, variable)
                           if r.is_real and a < r < b))
    def levels(fn, expr):
        critical = [float(r) for r in sympy.solve(sympy.diff(expr, variable), variable)
                    if r.is_real and a < r < b]
        return [fn(x) for x in [a, b, *critical]]
    values = levels(f, expression) + (levels(other, compared) if compared is not None else []) + [0]
    lo, hi = min(values), max(values)
    span = max(1, hi - lo)
    pad = (b - a) / 15
    left, right, top, bottom = 62, 510, 45, 244
    def x_pixel(x):
        return left + (x - a + pad) / (b - a + 2 * pad) * (right - left)
    def y_pixel(y):
        return bottom - (y - lo + span * .12) / (span * 1.24) * (bottom - top)
    def points(fn, first, last):
        return " ".join(f"{x_pixel(x):.2f},{y_pixel(fn(x)):.2f}"
                        for x in (first + (last-first) * i / 40 for i in range(41)))
    def line(x1, y1, x2, y2, color, dashed=False):
        dash = ' stroke-dasharray="4 4"' if dashed else ""
        return f'<line x1="{x1:.2f}" y1="{y1:.2f}" x2="{x2:.2f}" y2="{y2:.2f}" stroke="{color}" stroke-width="1.5"{dash}/>'
    def text(x, y, string, anchor="middle"):
        return f'<text x="{x:.2f}" y="{y:.2f}" text-anchor="{anchor}">{escape(string)}</text>'
    def fmt(value):
        return f"{value:.4g}".replace("-", "−")

    axis = y_pixel(0)
    vertical = x_pixel(0) if a <= 0 <= b else left
    xlabel, ylabel = labels
    alt = f"{ylabel} plotted against {xlabel} from {fmt(a)} to {fmt(b)}."
    if compared is not None:
        alt = f"Two curves plotted from x = {fmt(a)} to x = {fmt(b)}. The first equation is blue and the second is purple."
        if crossings:
            alt += " The curves cross within the interval."
    elif crossings:
        alt += " The graph crosses the horizontal axis within the interval."
    doc = [f'<svg xmlns="http://www.w3.org/2000/svg" width="560" height="290" viewBox="0 0 560 290" role="img" aria-labelledby="title"><title id="title">{escape(alt)}</title>',
           '<rect width="560" height="290" rx="14" fill="#f4f7fc"/>',
           '<g font-family="Inter,Arial,sans-serif" font-size="18" fill="#1f3555">',
           text(left, 33, ylabel, "start"), text(right, 274, xlabel, "end"),
           line(left, axis, right, axis, "#4d6384"), line(vertical, top, vertical, bottom, "#4d6384")]
    magnitude = 10**math.floor(math.log10(span/4))
    step = next(multiplier*magnitude for multiplier in (1, 2, 2.5, 5, 10)
                if multiplier*magnitude >= span/4)
    for tick in range(math.ceil(lo/step), math.floor(hi/step)+1):
        level = tick * step
        ordinate = y_pixel(level)
        if tick:
            doc.append(line(left, ordinate, right, ordinate, "#becce0", True))
        doc.append(text(left-8, ordinate+5, fmt(level), "end"))
    if shade:
        bounds = [a, *crossings, b]
        for first, last in zip(bounds, bounds[1:]):
            mid = (first + last) / 2
            fill = "#c5eadd" if f(mid) >= other(mid) else "#f5d8b9"
            doc.append(f'<polygon points="{points(f, first,last)} {points(other,last,first)}" fill="{fill}"/>')
    doc.append(f'<polyline points="{points(f,a,b)}" fill="none" stroke="#175b98" stroke-width="3"/>')
    if compared is not None:
        doc.append(f'<polyline points="{points(other,a,b)}" fill="none" stroke="#805576" stroke-width="3"/>')
    for value in (a, b):
        pos = x_pixel(value)
        doc.append(line(pos, axis, pos, y_pixel(f(value)), "#788ba6", True))
        doc.append(line(pos, axis-4, pos, axis+4, "#4d6384"))
        doc.append(text(pos, axis+24, fmt(value)))
    doc.append("</g></svg>\n")
    file = SVG / folder / (name + ".svg")
    file.write_text("".join(doc), encoding="utf-8")
    return f'<p><img src="/assets/study/0606/{folder}/{file.name}" alt="{escape(alt, quote=True)}" width="560" height="290"></p>'


def append_image(html, image):
    src = re.search(r'src="([^"]+)"', image)[1]
    return re.sub(r'<p><img src="' + re.escape(src) + r'"[^>]*></p>', "", html) + image


def curve_interval(html, roots):
    between = re.search(r"between \\\(x=(-?\d+)\\\) and \\\(x=(-?\d+)\\\)", html)
    return tuple(map(int, between.groups())) if between else (float(roots[0]), float(roots[-1]))


def section_checks(lesson):
    return [block for section in lesson["sections"] for block in section["blocks"]
            if block["kind"] == "check"] + lesson["extraPractice"]


def parse_equations(html, variable):
    tail = str(variable)
    expressions = []
    for expression in re.findall(r"\\\([vy]=(.+?)\\\)", html):
        expression = re.sub(r"\\(?:left|right)", "", expression).replace("−", "-")
        expression = re.sub(r"\^\{([23])\}", r"**\1", expression)
        if not re.fullmatch(rf"[{tail}0-9 +*()\-]+", expression):
            raise ValueError(f"Unsupported expression {expression!r}")
        expressions.append(parse_expr(expression, local_dict={tail: variable}, transformations=TRANSFORM))
    return expressions


def explicit_range(html, variable, fallback, last=False):
    matches = re.findall(rf"(-?\d+)\\le\s*{variable}\s*\\le\s*(-?\d+)", html)
    return tuple(map(int, matches[-1 if last else 0])) if matches else fallback


def add_intro(section, introduction):
    section["intro"] = p(introduction)


def revision_example(lesson, index):
    example = lesson["examples"][index]
    before, heading, _ = lesson["revision"]["body"].partition("<h2>Quick worked example</h2>")
    if not heading:
        raise ValueError("The revision example heading has changed")
    question = example["question"].replace('width="560" height="290"', 'width="285" height="148"')
    lesson["revision"]["body"] = before + heading + question + "".join(example["solution"])


def area_checks(data):
    lesson = data["addmaths-0606-int-area-axis"]
    instructions = {
        "above-axis": "Find the limits and decide the sign of the graph between them. The definite integral gives the area when the curve lies above the horizontal axis.",
        "below-axis": "The integral gives a negative value when the curve stays below the axis. Change its sign to obtain the positive geometric area.",
        "sum-of-regions": "Split at each crossing inside the limits. Calculate each signed integral and add their magnitudes to find the total area."
    }
    for section in lesson["sections"]:
        add_intro(section, instructions[section["id"]])

    def plot_area(html, name, field=None):
        y, = parse_equations(html, X)
        roots = sorted(sympy.solve(y, X))
        a, b = explicit_range(html, X, tuple(map(float, roots)))
        if field and field["key"] == "area":
            bounds = [a, *(r for r in roots if a < r < b), b]
            area = sum(abs(sympy.integrate(y, (X, start, end))) for start, end in zip(bounds, bounds[1:]))
            assert area == sympy.Rational(field["expected"]), name
        if field and field["key"] == "roots":
            assert set(roots) == {sympy.Rational(x) for x in field["expected"].strip("{}").split(",")}, name
        return graph("integration", name, y, X, a, b, ("x", "y"), shade="total area" in html)

    for check in section_checks(lesson):
        name = "audit-" + check["id"].split("int-area-axis-")[1]
        image = plot_area(check["prompt"], name, check["field"])
        if "total area" in check["prompt"]:
            check["prompt"] = append_image(check["prompt"], image)
        else:
            check["solution"] = append_image(check["solution"], image)
        check["hint"] = p(instructions[next(key for key in instructions if name.startswith("audit-" + key))])
    for i, example in enumerate(lesson["examples"]):
        image = plot_area(example["question"], f"audit-area-model-{i+1}")
        if "total area" in example["question"]:
            example["question"] = append_image(example["question"], image)
        elif image not in example["solution"]:
            example["solution"].append(image)
    for i in [1, 3, 5]:
        example = lesson["examples"][i]
        expression, = parse_equations(example["question"], X)
        a, b = explicit_range(example["question"], X, None)
        antiderivative = sympy.integrate(expression, X)
        bounds = [a, *(r for r in sorted(sympy.solve(expression, X)) if a < r < b), b]
        terms = [antiderivative.subs(X, end)-antiderivative.subs(X, start)
                 for start, end in zip(bounds, bounds[1:])]
        expression_latex = sympy.latex(sympy.expand(expression))
        anti_latex = sympy.latex(antiderivative)
        values = ", ".join(sympy.latex(value) for value in terms)
        area = sympy.latex(sum(map(abs, terms)))
        example["solution"] = [
            p("Expand the curve equation to " + m("y=" + expression_latex) + ". One antiderivative is " + m("F(x)=" + anti_latex) + "."),
            p("Use " + m("F(b)-F(a)") + " on each part of the shaded interval. From left to right, the signed results are " + m(values) + "."),
            p("Add the magnitudes. The total area is " + m(area) + " square units."),
        ]
    revision_example(lesson, 5)


def between_curves(lesson):
    intros = [
        "At an intersection two values of y match. Subtract one equation from the other, then solve the resulting equation for x.",
        "Think of the area as many thin vertical strips. Their height at each x is the upper function minus the lower function.",
        "The upper curve can change at a crossing. Split the interval there and test which function is larger on each piece."
    ]
    for section, intro in zip(lesson["sections"], intros):
        add_intro(section, intro)

    def attach(row, field, name, prompt_key):
        prompt = row[prompt_key]
        first, second = parse_equations(prompt, X)
        roots = sorted(sympy.solve(first-second, X))
        between = re.search(r"between \\\(x=(-?\d+)\\\) and \\\(x=(-?\d+)\\\)", prompt)
        a, b = curve_interval(prompt, roots)
        image = graph("integration", name, first, X, a, b, ("x", "y"), shade=bool(between), compared=second)
        if field and field["key"] == "intersections":
            assert set(roots) == {sympy.Rational(x) for x in field["expected"].strip("{}").split(",")}, name
        if between:
            limits = [a, *(r for r in roots if a < r < b), b]
            delta = sympy.integrate(first-second, X)
            results = [delta.subs(X,end)-delta.subs(X,start) for start,end in zip(limits, limits[1:])]
            if field:
                assert sum(map(abs, results)) == sympy.Rational(field["expected"]), name
            row[prompt_key] = append_image(prompt, image)
            if not field:
                row["solution"] = [
                    p("Subtract the second equation from the first. The difference is " + m(sympy.latex(sympy.expand(first-second))) + "."),
                    p("Split at the intersections inside the stated limits. An antiderivative of the difference is " + m(sympy.latex(delta)) + "."),
                    p("Evaluate upper endpoint minus lower endpoint on each part. The signed results are " + m(", ".join(map(sympy.latex, results))) + "."),
                    p("Add their magnitudes to get " + m(sympy.latex(sum(map(abs, results)))) + " square units.")
                ]
        elif isinstance(row["solution"], list):
            if image not in row["solution"]:
                row["solution"].append(image)
        else:
            row["solution"] = append_image(row["solution"], image)

    for row in section_checks(lesson):
        name = "audit-between-" + row["id"].split("int-between-curves-")[1]
        attach(row, row["field"], name, "prompt")
        if row["field"]["key"] == "intersections":
            row["hint"] = p(intros[0])
        elif "multiple-regions" in name:
            row["hint"] = p(intros[2])
        else:
            row["hint"] = p(intros[1])
    for i, row in enumerate(lesson["examples"], start=1):
        attach(row, None, f"audit-between-model-{i}", "question")
    revision_example(lesson, 1)


def motion(data):
    lesson = data["addmaths-0606-kinematic-distance"]
    instructions = {
        "zeroes": "Set velocity to zero and retain the times in the stated interval. Test its sign on both sides before deciding that the particle turns.",
        "signed-difference": "Velocity has a sign. The integral gives the final position minus the initial position along the chosen direction.",
        "total-travel": "Distance is the sum of the lengths travelled in each direction. Split at every turning time and add the absolute value of each integral."
    }
    for section in lesson["sections"]:
        add_intro(section, instructions[section["id"]])
    for check in section_checks(lesson):
        if "audit-" in check["id"]:
            continue
        check["prompt"] = check["prompt"].replace("A model lift has velocity", "A particle has modelled velocity")
        y, = parse_equations(check["prompt"], T)
        a, b = explicit_range(check["prompt"], T, None, last="displacement during" in check["prompt"])
        name = "audit-motion-" + check["id"].split("kinematic-distance-")[1]
        image = graph("kinematics", name, y, T, a, b, ("Time (s)", "Velocity (m/s)"))
        if "Find all the times" in check["prompt"]:
            check["solution"] = append_image(check["solution"], image)
            check["hint"] = p(instructions["zeroes"])
        else:
            check["prompt"] = append_image(check["prompt"], image)
            check["hint"] = p(instructions["signed-difference"])
    worked = graph("kinematics", "audit-motion-distance-model", 2*T-4, T, 0, 5, ("Time (s)", "Velocity (m/s)"))
    lesson["examples"][5] = {
        "title": "Find total distance after a reversal",
        "question": p("A robot moves along a straight rail. Its velocity in metres per second is " +
                      m(r"v=2t-4,\quad 0\le t\le5") +
                      ". Find the signed displacement and the total distance travelled.") + worked,
        "solution": [
            p("Solve " + m("2t-4=0") + " to get " + m("t=2") + ". The robot moves in the negative direction before 2 s, then in the positive direction."),
            p("Integrate " + m("2t-4") + " to obtain " + m("t^2-4t") + ". From 0 to 2 s the signed displacement is " + m(r"[t^2-4t]_0^2=-4") + " m. From 2 to 5 s it is " + m(r"[t^2-4t]_2^5=9") + " m."),
            p("The signed displacement is " + m("-4+9=5") + " m. The total distance is " + m("|-4|+|9|=13") + " m.")
        ]
    }
    question_graph = graph("kinematics", "audit-motion-distance-check", 6-2*T, T, 0, 4, ("Time (s)", "Velocity (m/s)"))
    check = {
        "id": "addmaths-0606-kinematic-distance-audit-total-travel",
        "kind": "check",
        "title": "Displacement and total distance",
        "prompt": p("A cart moves with velocity " + m(r"v=6-2t,\quad 0\le t\le4") + " metres per second. Find its signed displacement and its total distance.") + question_graph,
        "fields": [
            {"key": "displacement", "label": "Signed displacement in metres", "type": "number", "expected": "8"},
            {"key": "distance", "label": "Total distance in metres", "type": "number", "expected": "10",
             "retry": [{"answer": "8", "feedback": p("8 m is the net displacement. For distance, add the length of the return leg to the length of the outward leg.")}]}
        ],
        "hint": p("Set velocity to zero. The turning time divides the graph into two triangles. Decide how each area contributes to each answer."),
        "solution": p("The cart changes direction at " + m("t=3") + ". The first part gives " + m(r"\frac12(3)(6)=9") + " m. The final part gives a signed change of " + m(r"-\frac12(1)(2)=-1") + " m.") + p("The signed displacement is " + m("9-1=8") + " m. The total distance is " + m("9+1=10") + " m.")
    }
    blocks = lesson["sections"][-1]["blocks"]
    if not any(b.get("id") == check["id"] for b in blocks):
        blocks.insert(next(i for i, block in enumerate(blocks) if block.get("index") == 5)+1, check)
    revision_example(lesson, 5)
    lesson["revision"]["checks"] = p("At a zero of velocity, check whether the sign changes. Add signed areas for displacement and their magnitudes for distance.")


def motion_graphs(lesson):
    intros = (
        "A velocity graph keeps its sign. Above the time axis the particle travels in the positive direction, and below the axis it travels in the negative direction.",
        "Speed is the magnitude of velocity. Reflect each negative part of a velocity graph above the time axis to sketch speed.",
        "On a distance–time graph the gradient is speed. The graph is flat at an instant when speed is zero and rises again as the particle moves."
    )
    for section, introduction in zip(lesson["sections"], intros):
        add_intro(section, introduction)

    def velocity_plot(html, name):
        velocity, = parse_equations(html,T)
        a,b = explicit_range(html,T,None)
        return graph("kinematics",name,velocity,T,a,b,("Time (s)","Velocity (m/s)"),
                     shade=bool(re.search(r"displacement using|distance travelled",html)))

    for row in section_checks(lesson):
        if "-audit-" in row["id"]:
            continue
        name = "audit-sketch-" + row["id"].split("kinematic-graphs-")[1]
        row["prompt"] = append_image(row["prompt"], velocity_plot(row["prompt"], name))
        if "Find the net displacement" in row["prompt"]:
            hint = "Add signed areas. On a velocity graph a region below the time axis counts negatively."
        elif "distance travelled" in row["prompt"]:
            hint = "Use the zero of velocity to split the graph, then add both triangle areas as positive distances."
        else:
            hint = "Use the stated time in the velocity expression. Compare the sign of the result with the height on the velocity graph."
        row["hint"] = p(hint)
    for i,row in enumerate(lesson["examples"],start=1):
        row["question"] = append_image(row["question"], velocity_plot(row["question"], f"audit-sketch-model-{i}"))
    check = {
        "id": "addmaths-0606-kinematic-graphs-audit-speed-and-direction",
        "kind": "check",
        "title": "Speed and direction from signed velocity",
        "prompt": p("A robot moves with velocity " + m("v=t-4") + " in metres per second. Find its speed at " +
                    m("t=1") + " and state its direction of motion."),
        "fields": [
            {"key":"speed","label":"Speed in metres per second","type":"number","expected":"3",
             "retry":[{"answer":"-3","feedback":p("−3 is the signed velocity. Speed is its magnitude, so enter a positive value.")}]},
            {"key":"direction","label":"Direction","type":"choice","expected":"negative",
             "options":{"positive":"Positive direction","negative":"Negative direction","stationary":"Stationary"}}
        ],
        "hint": p("First substitute the given time. Its sign gives the direction and its magnitude gives the speed."),
        "solution": p("The velocity is " + m("1-4=-3") + " m/s. The speed is 3 m/s and the direction is negative.")
    }
    blocks = lesson["sections"][1]["blocks"]
    if not any(row.get("id") == check["id"] for row in blocks):
        blocks.append(check)


def trigonometric_steps(lesson):
    lesson["examples"][0] = {
        "title": "Integrate sine using negative cosine",
        "question": p("Find " + m(r"\int(8\sin(4x)-3)\,\mathrm dx") + ". Use radians."),
        "solution": [
            p("Differentiate " + m(r"-\cos(4x)") + " to get " + m(r"4\sin(4x)") + ". The minus sign gives a positive sine."),
            p("The coefficient needed is " + m(r"\frac84=2") + ". The constant term gives " + m("-3x") + "."),
            p("The result is " + m(r"-2\cos(4x)-3x+C") + ". Differentiating gives " + m(r"8\sin(4x)-3") + ".")
        ]
    }
    check = next(b for b in lesson["sections"][0]["blocks"] if b["kind"] == "check")
    check["hint"] = p("Differentiate negative cosine to check the sign. The inner angle has gradient 2, so the antiderivative needs a factor of one half.")


def integration_introductions(lessons):
    pairs = {
        "reverse": [
            "Start with a derivative and ask which original function would give it. For a term such as " + m("6x") + ", test " + m("3x^2") + " by differentiating.",
            "Every vertical shift of a curve gives the same gradient. Write one arbitrary constant to represent all those shifts.",
            "A given coordinate fixes the vertical shift. Substitute both coordinates after integrating, and then solve for the constant."
        ],
        "indefinite": [
            "For a power of x, add one to the exponent and divide by the new exponent. Differentiate your result to check both the exponent and the coefficient.",
            "Rewrite roots and reciprocal powers before using the rule. For example, " + m(r"\sqrt{x}=x^{1/2}") + " integrates to " + m(r"\frac23 x^{3/2}+C") + ".",
            "First cancel common factors or distribute division so each term has a recognizable form. Watch for a reciprocal term, which uses a logarithm."
        ],
        "linear-power": [
            "Keep the inner expression in brackets. The reverse chain rule divides by its constant derivative, as well as the new power.",
            "Rewrite a square root of a linear expression as a half power. After integration the exponent is three halves, so divide by both three halves and the bracket's gradient.",
            "A negative power can stay negative after integration. Check the excluded value of the bracket and handle exponent minus one with a logarithm."
        ],
        "exponential": [
            "Look inside the exponential. Its exponent stays the same in the integral, while division by the exponent's derivative cancels the chain-rule factor.",
            "A negative coefficient in the exponent produces a negative factor in the antiderivative. When evaluating a definite integral, keep that sign in both endpoint substitutions.",
            "Apply the exponential rule separately to each term, including its own inner derivative. Round only after combining the endpoint values."
        ],
        "trigonometric": [
            "Choose an antiderivative by differentiating back. Negative cosine gives positive sine, and a linear angle introduces an extra derivative factor.",
            "Sine gives cosine when differentiated in radians. Keep the angle exactly as written and divide by its derivative when it is linear.",
            "Tangent gives secant squared. For definite integration check that tangent is continuous between the two endpoints before subtracting."
        ],
        "logarithmic": [
            "An exponent of minus one would give zero in the denominator of the power rule. The derivative of a natural logarithm gives the required reciprocal instead.",
            "Write the reciprocal as a constant times one over a linear expression. The inner derivative supplies the additional factor you must divide by.",
            "An antiderivative involving a logarithm can be used on either side of a pole, separately. The endpoint rule requires a continuous integrand between the limits."
        ],
        "mixed": [
            "Read an expression one term at a time. Decide which rule belongs to each term before finding an antiderivative.",
            "Include every term and then add one constant for the whole expression. Differentiating at the end quickly catches a missing term.",
            "For an exponential, trigonometric or power term with a linear argument, check that you cancelled its inner derivative."
        ],
        "definite": [
            "A definite integral is a number. Evaluate the same antiderivative at both endpoints and subtract the lower evaluation from the upper one.",
            "If the displayed limits run backwards, keep their order when substituting. Swapping the two limits reverses the sign of the result.",
            "Check the whole interval for a missing input, not only the endpoints. The usual endpoint calculation applies to a continuous integrand."
        ],
        "reverse-chain": [
            "Look for an inner expression and a matching derivative factor. Differentiate your proposed antiderivative before trusting the pattern.",
            "The derivative of a square root has a square root in its denominator. Match the numerator to the derivative of the radicand as well.",
            "Once the reverse chain rule gives an antiderivative, use the original x-limits to evaluate it. Show both substitutions."
        ]
    }
    for tail, intros in pairs.items():
        for section, intro in zip(lessons["addmaths-0606-int-" + tail]["sections"], intros):
            add_intro(section, intro)


def practice_graphs():
    """Project figures into practice and worked solutions without rewriting bank versions."""
    diagrams = {}
    for chapter, lessons in {
        "integration": {"int-area-axis", "int-between-curves"},
        "kinematics": {"kinematic-distance", "kinematic-graphs"}
    }.items():
        source = json.loads((STUDY / (chapter + "-v1.json")).read_text(encoding="utf-8"))
        for q in source["questions"]:
            if q["lesson"] not in lessons:
                continue
            prompt = q["prompt_html"]
            stem = prompt.split("</p>", 1)[0]
            key = "practice-" + q["id"].lower()
            solving = q["collection"] == "exam" or bool(re.search(r"Find all the times|x-values where|x-coordinates of all intersections|[Ss]ketch", prompt))
            if chapter == "kinematics":
                velocity, = parse_equations(stem, T)
                signed_region = q["collection"] != "exam" and bool(re.search(r"displacement during|distance travelled|using the areas", prompt))
                a, b = explicit_range(prompt, T, None, last=signed_region)
                image = graph(chapter, key, velocity, T, a, b, ("Time (s)", "Velocity (m/s)"),
                              shade=signed_region)
            elif q["lesson"] == "int-area-axis":
                y, = parse_equations(stem, X)
                roots = sorted(sympy.solve(y, X))
                a, b = explicit_range(prompt, X, tuple(map(float,roots)))
                image = graph(chapter, key, y, X, a, b, ("x", "y"), shade="total area" in prompt)
            else:
                y, second = parse_equations(stem, X)
                roots = sorted(sympy.solve(y - second, X))
                a, b = curve_interval(prompt, roots)
                image = graph(chapter, key, y, X, a, b, ("x", "y"), shade="total area" in prompt, compared=second)
            diagrams[q["id"]] = {"solution" if solving else "prompt": image}
    (STUDY / "practice-diagrams.json").write_text(
        json.dumps(diagrams, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    print(f"{len(diagrams)} existing 0606 practice questions and worked solutions receive an equation-matched graph.")


def main():
    integration = read("integration")
    integration_introductions(integration)
    area_checks(integration)
    between_curves(integration["addmaths-0606-int-between-curves"])
    trigonometric_steps(integration["addmaths-0606-int-trigonometric"])
    write("integration", integration)
    kinematics = read("kinematics")
    motion(kinematics)
    motion_graphs(kinematics["addmaths-0606-kinematic-graphs"])
    write("kinematics", kinematics)
    practice_graphs()


if __name__ == "__main__":
    main()
