"""Revise the 0606 Integration bank without changing its task identities."""
import json

import sympy as s

from addmaths_calculus import C, DY, Q, ROOT, X, Scenario, answer, bank_exam, bank_short, choices, eq, explain, field, m, math, pair, rng, round3, tex
from review_0606_integration_motion import graph

BANK = ROOT / "content/original/0606"
FIGURES = "integration"


def formula(lhs, expression):
    return m(lhs + "=" + tex(expression))


def expression_text(value):
    return m(tex(value).replace(r"\log", r"\ln"))


def plus_constant(primitive):
    return m(tex(primitive) + "+C")


def exact_check(key, label, value):
    return field(key, label, value)


def verify_derivative(f, primitive):
    delta = s.diff(primitive, X) - f
    if delta.has(s.sin, s.cos, s.tan, s.sec):
        delta = s.trigsimp(delta, method="fu")
    assert s.simplify(delta) == 0, (f, primitive, delta)


def evaluate(f, primitive, a, b):
    verify_derivative(f, primitive)
    return s.simplify(primitive.subs(X, b) - primitive.subs(X, a))


def bounds(f, a, b):
    return rf"\int_{{{tex(a)}}}^{{{tex(b)}}}\left({tex(f)}\right)\,\mathrm dx"


def substitution(F, a, b, value):
    top, base = F.subs(X, b), F.subs(X, a)
    return m(rf"\left[{tex(F)}\right]_{{{tex(a)}}}^{{{tex(b)}}}=\left({tex(top)}\right)-\left({tex(base)}\right)={tex(value)}")


def primitive_part(f, F, seed, step, shown=None):
    verify_derivative(f, F)
    shown = shown or plus_constant(F)
    distractors = [math(F), plus_constant(F+X), plus_constant(F-X)]
    return answer(f"Find {m(r'\int\left(' + tex(f) + r'\right)\,\mathrm dx')}.",
                  None, step, f"The derivative of {math(F)} is {math(f)}. Add the arbitrary constant.",
                  displayed=shown, method="Use the antiderivative rule for each term and include the arbitrary constant.",
                  grader=choices(shown, distractors, seed))


def definite_part(f, F, a, b):
    val = evaluate(f, F, a, b)
    return answer(f"Evaluate {m(bounds(f, a, b))} exactly.", val,
                  f"Use {formula('F(x)', F)}. Subtract the value at the lower limit from the value at the upper limit.",
                  substitution(F, a, b, val),
                  method="Substitute both limits into the antiderivative and subtract in the stated order.",
                  grader=exact_check("integral", "Exact definite integral", val))


def constant_part(F, x, y, c):
    base = F.subs(X, x)
    assert base + c == y
    return answer(f"Given that the antiderivative passes through {m(pair(x, y))}, find {m('C')}.",
                  c, f"Put {formula('x', x)} and {formula('y', y)} into {m('y='+tex(F)+'+C')}.",
                  f"{m(tex(y)+'='+tex(base)+'+C')}, so {formula('C', c)}.",
                  method="Use both coordinates in the general antiderivative.",
                  grader=exact_check("constant", "Constant of integration", c))


def recovery(r, style, seed, indefinite):
    a, b, c = r.choice((1, 2, 3)), r.choice((-4, -3, -2, -1, 1, 2, 3, 4)), r.randint(-9, 9)
    if style == 0:
        n = r.choice((2, 3))
        F = a*X**n+b*X
        x, new = r.sample((-2, -1, 0, 1, 2, 3), 2)
        domain = ""
        step = f"Integrate {math(a*n*X**(n-1))} to {math(a*X**n)} and {math(b)} to {math(b*X)}."
    elif style == 1:
        F = a*s.sqrt(X) + b*X if not indefinite else a*X**Q(3,2)-b/X
        x, new = r.sample((1, 4, 9), 2)
        domain = f" Work on {m('x>0')}."
        step = f"Write the terms as powers of {m('x')}. Increase each exponent by one and divide by that new power."
    elif indefinite:
        f = (a*X+b)**2/X**2
        F = a*a*X+2*a*b*s.log(X)-b*b/X
        x, new = 1, 2
        domain = f" Work on {m('x>0')}."
        step = f"Expand and divide first. The result is {math(s.expand(f))}. Integrate the reciprocal term using a natural logarithm."
    else:
        F = a/X+b*X
        x, new = r.sample((1, 2, 3, 4), 2)
        domain = f" Work on {m('x>0')}."
        step = f"The reciprocal-square term has antiderivative {math(a/X)}. The constant term has antiderivative {math(b*X)}."
    f = (a*X+b)**2/X**2 if indefinite and style == 2 else s.diff(F,X)
    y = F.subs(X, x) + c
    first = primitive_part(f, F, seed, step)
    constant = constant_part(F, x, y, c)
    title = "Simplify and integrate powers" if indefinite else "Recover a curve from its gradient"
    stem = f"The integrand is {math(f)}.{domain}" if indefinite else f"A curve has gradient {eq(DY, f)}.{domain}"
    parts = (first, constant)
    if not indefinite:
        value = F.subs(X, new)+c
        last = answer(f"For this same curve, find the ordinate at {formula('x', new)}.", value,
                      f"The particular equation is {formula('y', F+c)}.",
                      f"Substituting {math(new)} gives {m('y='+tex(F.subs(X,new))+r'+\left('+tex(c)+r'\right)='+tex(value))}.",
                      method="Substitute into the particular curve found using the given point.",
                      grader=exact_check("ordinate", "Value of y", value))
        parts += (last,)
    return Scenario(title, stem, parts,
                    "Find the general antiderivative first, then substitute the point to determine the constant.",
                    "An antiderivative and its vertical translations give the same gradient.")


def linear_power(r, style, seed):
    a, b = r.choice((2,3,4,5)), r.randint(-5,5)
    n = r.choice(((2,3), (Q(1,2),Q(-1,2),Q(3,2)), (-2,-3))[style])
    low, high = sorted(r.sample((1,4,9,16) if style==1 else (1,2,3,4,5), 2))
    if n == Q(3,2) and high==16:
        high, low = 9, 1
    coefficient = r.choice((1,2,3))
    u = a*X+b
    f = coefficient*u**n
    F = coefficient*u**(n+1)/Q(a)/(n+1)
    lower, upper = Q(low-b,a), Q(high-b,a)
    return Scenario("Reverse the chain factor in a bracket power",
                    f"Use {m(tex(u)+'>0')} for {math(f)}.",
                    (primitive_part(f,F,seed, f"The bracket has derivative {math(a)} and the new power is {math(n+1)}. Divide by both."), definite_part(f,F,lower,upper)),
                    f"Differentiate the bracket first. Its slope is {math(a)}.",
                    "The antiderivative divides by the inner slope as well as the new power.")


def exponential(r, style, seed):
    a = r.choice((2,3,4)) * (-1 if style==1 else 1)
    b, c = r.randint(-4,4), r.randint(1,5)
    u = a*X+b
    extra = r.choice((-2,-1,1,2))*X if style==2 else 0
    f, F = c*s.exp(u)+extra, Q(c,a)*s.exp(u)+s.integrate(extra,X)
    start, stop = sorted((Q(-b,a), Q((1 if a>0 else -1)-b,a)))
    base = definite_part(f,F,start,stop)
    base.field = None
    end = stop+(stop-start)
    value = evaluate(f,F,stop,end)
    rounded = round3(value)
    sig = format(float(rounded), "#.3g")
    grader = dict(key="rounded",label="Value to 3 significant figures", type="approximate", expected=rounded,
                  absolute_tolerance=0.5 * 10**(s.floor(s.log(abs(float(rounded)),10))-2) * 0.999)
    grader["absolute_tolerance"] = float(grader["absolute_tolerance"])
    return Scenario("Compare consecutive intervals of an exponential model",
                    f"A quantity has rate of change {math(f)} at input {m('x')}.",
                    (primitive_part(f,F,seed,f"Keep {math(s.exp(u))} and divide its coefficient by {math(a)}. Integrate any separate power term on its own."),
                     base,
                     answer(f"Find the change from {formula('x',stop)} to {formula('x',end)} to 3 significant figures.",value,
                            f"The second interval starts at {math(stop)}. Use these new endpoints with the same antiderivative.",
                            substitution(F,stop,end,value),
                            f"Now round the result to 3 significant figures, giving {m(sig)}.",
                            method="Apply the original antiderivative to the new interval before rounding.",
                            displayed=m(sig),grader=grader)),
                    "Use the exponent's slope when integrating and keep full precision at both limits.",
                    "The second interval has the same length but generally gives a different change.")


def trigonometric(r, style, seed):
    a, c, d = r.choice((2,3,4,6)), r.randint(1,6), r.choice((-2,-1,0,1,2))
    phase = r.choice((0,1,2,3))*s.pi/6
    u = a*X+phase
    model, primitive, name = (
        (s.sin(u), -s.cos(u), "negative cosine"),
        (s.cos(u), s.sin(u), "sine"),
        (s.sec(u)**2, s.tan(u), "tangent"),
    )[style]
    f, F = c*model+d, Q(c,a)*primitive+d*X
    top = r.choice((s.pi/6,s.pi/4,s.pi/3) if style==2 else (s.pi/6,s.pi/3,s.pi/2,2*s.pi/3))
    first,last = -phase/a,(top-phase)/a
    return Scenario("Integrate a trigonometric expression in radians",
                    f"The integrand is {math(f)}. All angles are in radians.",
                    (primitive_part(f,F,seed,f"The trigonometric term integrates to {name}. The inner slope is {math(a)}, so include its reciprocal."),
                     definite_part(f,F,first,last)),
                    f"The two angles in the antiderivative are {math(0)} and {math(top)}.",
                    "Substitute into the angle inside the function, then use the exact trigonometric values.")


def logarithmic(r, style, seed):
    a, b, c = (1, 0, r.randint(1,6)) if style==0 else (r.randint(2,5),r.randint(-5,5),r.randint(1,6))
    d = r.choice((-2,-1,0,1,2)) if style==2 else 0
    sign = -1 if style==2 else 1
    lo, hi = sorted(r.sample((1,2,3,4,5,6,8,9),2))
    left, right = sorted((Q(sign*lo-b,a),Q(sign*hi-b,a)))
    u = a*X+b
    f = c/u+d
    F = Q(c,a)*s.log(sign*u)+d*X
    assert s.simplify(s.diff(F,X)-f)==0 and sign*u.subs(X,left)>0 and sign*u.subs(X,right)>0
    k = Q(c,a)
    log_template = (tex(k) if k!=1 else "") + r"\ln\left|" + tex(u) + r"\right|"
    linear = ("+"+tex(d*X)) if d>0 else tex(d*X) if d<0 else ""
    log_ratio = abs(u.subs(X,right))/abs(u.subs(X,left))
    value = k*s.log(log_ratio)+d*(right-left)
    assert s.simplify((F.subs(X,right)-F.subs(X,left)-value).expand(log=True))==0
    steps = (f"The argument {math(u)} does not vanish between the limits. Its endpoint magnitudes are {math(abs(u.subs(X,left)))} and {math(abs(u.subs(X,right)))}.",
             m(tex(k)+r"\left(\ln "+tex(abs(u.subs(X,right)))+r"-\ln "+tex(abs(u.subs(X,left)))+r"\right)+"+r"\left("+tex(d*(right-left))+r"\right)="+tex(value)))
    target = expression_text(value)
    graded = choices(target,[math(-value), math(value+1), math(value-2)],seed+1)
    branch = m(tex(u)+(" > 0" if sign>0 else " < 0"))
    return Scenario("Integrate a reciprocal on a continuous branch",
                    f"Integrate {math(f)} on the branch {branch}.",
                    (primitive_part(f,F,seed,f"The exponent is {math(-1)}, so use a logarithm. Divide by the denominator's slope {math(a)}.",
                                    shown=m(log_template+linear+"+C")),
                     answer(f"Evaluate {m(bounds(f,left,right))} exactly.",None,*steps,displayed=target,grader=graded,
                            method="Check that the interval stays on one side of the pole and subtract the endpoint logarithms.")),
                    "Evaluate the absolute value of the denominator at each endpoint, then subtract the logarithms.",
                    "A logarithm of the absolute value works on each interval where the denominator is nonzero.")


def mixed(r, style, seed):
    a,b,c = r.choice((2,3,4)),r.randint(1,5),r.choice((-3,-2,-1,1,2,3))
    phase = r.randint(-3,3)
    if style==0:
        f,F = b*s.exp(a*X+phase)+c*X, Q(b,a)*s.exp(a*X+phase)+Q(c,2)*X**2
        left,right=Q(-phase,a),Q(1-phase,a)
        rule="Keep the exponential and divide by the exponent's slope. Integrate the linear term using the power rule."
    elif style==1:
        f,F = b*s.sin(a*X)+c*X, -Q(b,a)*s.cos(a*X)+Q(c,2)*X**2
        left,right=0,r.choice((s.pi/6,s.pi/3,s.pi/2))/a
        rule="Integrate the sine as negative cosine with the same angle. The linear term gives a square."
    else:
        shift=r.choice((-1,1,2))
        u=a*X+shift
        n=r.choice((2,3))
        f,F=b*u**n+c*X, Q(b,a*(n+1))*u**(n+1)+Q(c,2)*X**2
        left,right=Q(1-shift,a),Q(r.choice((2,3,4))-shift,a)
        rule="Integrate the bracket and linear term separately. The bracket requires division by its slope as well as by its new power."
    second=definite_part(f,F,left,right)
    if style==0:
        second.field=None
    return Scenario("Combine two reverse derivative rules",
                    f"Use {math(f)} as the integrand." + (" Angles are in radians." if style==1 else ""),
                    (primitive_part(f,F,seed,rule),second),
                    "Identify each term's rule before combining the two antiderivatives.",
                    "Differentiate the entire result term by term as a check.")


def definite(r, style, exam):
    a,b,c=r.randint(1,4),r.choice((-3,-2,-1,1,2,3)),r.randint(-5,5)
    if style==0:
        f,F = 4*a*X**3+2*b*X+c, a*X**4+b*X**2+c*X
        left,right=r.choice((-2,-1)),r.choice((1,2))
    elif style==1:
        f,F = 3*a*X**2+2*b*X-c, a*X**3+b*X**2-c*X
        left,right=r.choice((1,2,3)),r.choice((-2,-1,0))
    else:
        f,F=a/X**2+2*b*X+c,-a/X+b*X**2+c*X
        left,right=sorted(r.sample((1,2,3,4,5),2))
    first=definite_part(f,F,left,right)
    if exam and style==2:
        end=right+1
        extension_value=evaluate(f,F,right,end)
        total=evaluate(f,F,left,end)
        val=total-extension_value
        assert val==evaluate(f,F,left,right)
        ask=f"The integral from {math(left)} to {math(end)} is {math(total)}. Use your answer to find the integral from {math(right)} to {math(end)}."
        last=answer(ask,extension_value,
                    "Split the longer integral at the shared endpoint.",
                    m(rf"\int_{{{tex(right)}}}^{{{tex(end)}}} f(x)\,\mathrm dx={tex(total)}-\left({tex(val)}\right)={tex(extension_value)}"),
                    method="Subtract the integral on the first interval from that on the whole interval.")
    else:
        val=evaluate(f,F,left,right)
        last=answer(f"Use your calculation to evaluate {m(bounds(f,right,left))}.",-val,
                    f"Reversing the limits replaces {m('F(b)-F(a)')} by {m('F(a)-F(b)')}.",
                    substitution(F,right,left,-val),
                    method="Reverse the sign or swap the endpoint substitution order.",
                    grader=exact_check("reversal","Integral with the opposite limits",-val))
    return Scenario("Evaluate and compare definite integrals",
                    f"Let {formula('f(x)',f)}.",
                    (first,last),"Use the upper value minus the lower value in the order printed beside the integral sign.",
                    "Swapping limits changes the sign. A definite integral can be negative.")


def reverse_chain(r, style, seed):
    a,b,c=r.choice((1,2,3)),r.choice((-2,-1,1,2,3)),r.choice((1,2,3))
    if style==0:
        u,n=(X-a)**2+b+4,2
        left,right=a,a+1
    elif style==1:
        u,n=a*X**2+b*X+4,Q(1,2)
        left,right=0,r.choice((1,2,3))
    else:
        u,n=a*X+b,3
        left,right=sorted((Q(1-b,a),Q(r.choice((2,3,4))-b,a)))
    F=c*u**n
    f=s.factor(s.diff(F,X),X) if style!=1 else s.diff(F,X)
    factor=s.diff(u,X)
    branch=f" Work on {m('x\\ge0')}." if style==1 else ""
    # The quadratic under the root has a positive minimum on x >= 0.
    if style==1:
        assert u.subs(X,max(0,Q(-b,2*a)))>0
    derivative=explain(f"Show that the derivative of {math(F)} is the given integrand.",math(f),
                       f"Let {formula('u',u)}. Its derivative is {math(factor)}.",
                       m(DY+"="+tex(c*n)+"u^{"+tex(n-1)+r"}\left("+tex(factor)+r"\right)="+tex(f)),
                       marks=(("M1","Apply the chain rule using the derivative of the bracket."),
                              ("A1",f"Obtain {math(f)}.")))
    return Scenario("Recognise a stated derivative in reverse",f"The integrand is {math(f)}.{branch}",
                    (derivative,primitive_part(f,F,seed,f"The derivative in part (a) verifies the variable part {math(F)}."),
                     definite_part(f,F,left,right)),
                    "Identify the inner derivative inside the integrand and reuse the function found by differentiation.",
                    "Use the whole antiderivative at each endpoint, with its original constant factor.")


def regions(r, style, between):
    first=r.randint(-4,2)
    second=first+r.randint(2,5)
    k=r.choice((1,2,3,4,5))
    if between:
        start=r.choice((-2,-1,0,1,2))*X+r.randint(-3,3)
        if style==0:
            difference=k*(X-first)*(second-X)
            cuts=[first,second]
        elif style==1:
            start+=X**2
            difference=-k*(X-first)*(second-X)
            cuts=[first,second]
        else:
            third=second+r.randint(1,3)
            difference=k*(X-first)*(X-second)*(X-third)
            cuts=[first,second,third]
    else:
        start=s.Integer(0)
        difference=k*(-1 if style==1 else 1)*(X-first)*(second-X)
        cuts=[first-r.randint(1,3),first,second] if style==2 else [first,second]
    other=s.expand(start+difference)
    roots=s.solve(difference,X)
    assert roots==([first,second,third] if between and style==2 else [first,second])
    displayed_roots=m(", ".join(str(x) for x in roots))
    crossing_word="intersection x-coordinates" if between else "x-coordinates of the x-axis crossings"
    root_field="intersections" if between else "roots"
    zero=answer(f"Find the {crossing_word}. Show your algebra.",None,
                ("Subtract the first expression from the second." if between else "Set the curve value equal to zero."),
                f"Solving {formula(tex(difference.factor()),0)} gives {displayed_roots}.",
                method="Factor the difference and set every linear factor equal to zero.",
                displayed=displayed_roots,grader=field(root_field,crossing_word.capitalize(),"{"+",".join(map(str,roots))+"}","set",("x",)))
    F=s.integrate(s.expand(difference),X)
    values=[evaluate(difference,F,left,right) for left,right in zip(cuts,cuts[1:])]
    assert all(value != 0 and s.sign(value)==s.sign(difference.subs(X,Q(left+right,2)))
               for (left,right),value in zip(zip(cuts,cuts[1:]),values))
    total=sum(map(abs,values))
    working=[f"The antiderivative of the signed difference is {formula('F(x)',F)}."]
    for (left,right),value in zip(zip(cuts,cuts[1:]),values):
        sign_word = ("the second graph is the upper curve" if value>0 else "the first graph is the upper curve") if between else ("the curve is above the axis" if value>0 else "the curve is below the axis")
        working += [f"Between {math(left)} and {math(right)}, {sign_word}.",
                    substitution(F,left,right,value)]
    area_sum = '+'.join(tex(abs(value)) for value in values) + '=' if len(values)>1 else ''
    working.append(f"The geometric area is {m(area_sum+tex(total))} square units.")
    message="between the two graphs" if between else "between the curve and the x-axis"
    area=answer(f"Find the exact total area {message} for {m(str(cuts[0])+r'\le x\le'+str(cuts[-1]))}.",
                total,*working,method="Split where the sign changes and add the magnitude of each signed integral.",
                grader=exact_check("area","Exact total area",total))
    stem=(f"The first graph is {formula('y',start)} and the second is {formula('y',other)}." if between else f"The curve is {formula('y',other)}.")
    title=("Find the area between two graphs" if between else "Use a signed integral to find geometric area")
    item=Scenario(title,stem,(zero,area),"Find the intersections and check the sign of the difference between every pair of consecutive boundaries.",
                  "Choose the top expression on each interval, and add geometric areas as positive quantities.")
    return item, (other, cuts[0], cuts[-1], start if between else None)


def author(lesson, rand, style, seed, exam):
    models={
        "int-reverse": lambda: recovery(rand,style,seed,False),
        "int-indefinite": lambda: recovery(rand,style,seed,True),
        "int-linear-power": lambda: linear_power(rand,style,seed),
        "int-exponential": lambda: exponential(rand,style,seed),
        "int-trigonometric": lambda: trigonometric(rand,style,seed),
        "int-logarithmic": lambda: logarithmic(rand,style,seed),
        "int-mixed": lambda: mixed(rand,style,seed),
        "int-definite": lambda: definite(rand,style,exam),
        "int-reverse-chain": lambda: reverse_chain(rand,style,seed),
    }
    if lesson in ("int-area-axis","int-between-curves"):
        return regions(rand,style,lesson=="int-between-curves")
    return models[lesson](), None


def contract(row):
    return ([row.get(key) for key in ("id","family_uid","lesson","collection","marks","difficulty","variant_index","provenance")],
            [(f["key"],f["type"]) for f in row["fields"]],
            [(part["label"],[(c["code"],c["marks"]) for c in part["marking_criteria"]]) for part in row["parts"]])


def main():
    source = json.loads((BANK/"integration-v1.json").read_text(encoding="utf-8"))
    graph_folder=ROOT/"public/assets/study/0606"/FIGURES
    graph_folder.mkdir(parents=True,exist_ok=True)
    revised, seen_prompts, seen_answers = [], set(), set()
    for old in source["questions"]:
        exam=old["collection"]=="exam"
        family=int(old["family_uid"].rsplit("-W" if exam else "-P",1)[1])-1
        variant=int(old["id"].rsplit("-",1)[1])
        style=family%3
        for attempt in range(150):
            seed=12017+sum((i+1)*ord(k) for i,k in enumerate(old["id"])) + 4079*attempt
            item, figure=author(old["lesson"],rng(seed),style,seed,exam)
            # The short/fresh item asks for the same answer field as the earlier release.
            if not exam:
                target=old["fields"][0]
                eligible=[part for part in item.parts if part.field and
                          (part.field["key"],part.field["type"])==(target["key"],target["type"])]
                assert eligible, old["id"]
                desired=item.check_part(family)
                if desired in eligible:
                    selected=desired
                else:
                    selected=eligible[0]
                item=Scenario(item.title,item.stem,(selected,),item.hint,item.wrong_hint)
            row=(bank_exam(old["family_uid"],old["lesson"],item,variant,old["difficulty"]) if exam else
                 bank_short(old["id"],old["family_uid"],old["lesson"],item,family,variant))
            assert contract(row)==contract(old), (old["id"],contract(row),contract(old))
            key=(old["lesson"], exam,row["answer_html"])
            if row["prompt_html"] not in seen_prompts and key not in seen_answers:
                seen_prompts.add(row["prompt_html"])
                seen_answers.add(key)
                break
        else:
            raise AssertionError(f"No distinct prompt and answer for {old['id']}")
        if figure:
            g,left,right,compared=figure
            # Area-only practice can show the region. Where pupils must find the
            # crossings, show the graph in the working after they have found them.
            placement = "prompt_html" if row["fields"] and row["fields"][0]["key"] == "area" else "solution_html"
            row[placement] += graph(FIGURES,"bank-v2-"+old["id"].lower(),g,X,left,right,("x","y"),compared=compared)
        revised.append(row)
    out=BANK/"integration-revision.json"
    out.write_text(json.dumps({"version":"1.0.1","questions":revised},ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(f"{len(revised)} recalculated questions, {len(seen_answers)} distinct answers within each lesson/collection, {len(list(graph_folder.glob('bank-v2-*.svg')))} versioned figures")


if __name__=="__main__":
    main()
