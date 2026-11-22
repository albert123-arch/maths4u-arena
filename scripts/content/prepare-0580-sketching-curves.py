"""Generate independently authored 0580 C/E2.11 sketching curves lessons."""
from fractions import Fraction
from hashlib import sha256
from html import escape
import json
from pathlib import Path
from runpy import run_path

ROOT=Path(__file__).resolve().parents[2]
base=run_path(str(Path(__file__).with_name("prepare-0580-number-types.py")))
p,m,f,task,check,line,label,table=(base[k] for k in ("p","m","fraction","task","check","line","label","table"))
maths=run_path(str(Path(__file__).with_name("prepare-0580-ratio-proportion.py")))
number,bank_item=maths["number"],maths["bank_item"]


def left_term(k,text):
    if not k: return ""
    return ("-" if k<0 else "")+(str(abs(k)) if abs(k)!=1 else "")+text


def constant(k):
    return f"{k:+d}" if k else ""


def choice(title,prompt,answers,key,why,calculation,hint):
    q=task(title,prompt,"Choose one",key,[why,calculation,f"Answer: {answers[key]}."],
        hint,kind="choice",options=answers)
    q["written_prompt"]=p(prompt+" Explain your choice.")
    q["method"]=why
    q["result"]=answers[key]
    return q


def line_key(i,mode=0):
    slope=(2+i%7)*(-1 if i%2 else 1)
    y_int=4+i
    rule=f"y={left_term(slope,'x')}+{y_int}"
    if mode==0:
        return number("Find where a line crosses the y-axis",
            f"Find the y-coordinate of the y-intercept of {m(rule)}.","y-intercept",y_int,
            "At the y-axis the x-coordinate is zero.",f"Substitute {m('x=0')} into the line equation.",
            "Use x = 0 to find the y-intercept.")
    if mode==1:
        return number("Find where a line crosses the x-axis",
            f"Find the x-intercept of {m(rule)}. Give its x-coordinate exactly.","x-intercept",Fraction(-y_int,slope),
            "At the x-axis, y is zero.",f"Set {m(left_term(slope,'x')+'+'+str(y_int)+'=0')} and divide by the coefficient of x.",
            "Set y to zero before solving for x.")
    b=3+i%5
    printline=f"{left_term(-b*slope,'x')}+{b}y={b*y_int}"
    return number("Read the gradient after rearranging",
        f"Find the gradient of {m(printline)}.","Gradient",slope,
        f"Move the x term to the right. Then divide all terms by {b}.",
        f"The line takes the form {m(rule)}. The coefficient of x is the gradient.",
        "Make y the subject before reading its gradient.")


def parabola(i,mode=0):
    a=2+i%5
    r=2+i%7
    s=4+i%11
    if r==s:s+=1
    A=a if i%2 else -a
    equation=f"y={left_term(A,'(x+'+str(r)+')(x-'+str(s)+')')}"
    if mode==0:
        q=choice("Choose the correct opening direction",
            f"Does the graph of {m(equation)} open upwards or downwards?",
            {"A":"Upwards","B":"Downwards"},"A" if A>0 else "B",
            f"The coefficient of {m('x^2')} is {m(A)}.",
            "Its sign determines the direction of opening.",
            "Read the multiplier on the product of the two x terms.")
        q["written_prompt"]=p(f"Sketch {m(equation)}, showing the opening direction and both x-intercepts.")
        q["written_answer"]=("Opens upwards" if A>0 else "Opens downwards")+f" through {m(f'(-{r},0)')} and {m(f'({s},0)')}."
        q["steps"].insert(-1,p(f"The factor roots are {m(-r)} and {m(s)}. Mark their x-intercepts before drawing the shape."))
        return q
    if mode==1:
        return number("Use symmetry between two roots",
            f"The graph {m(equation)} is symmetric about a vertical line. Give the x-value of that line exactly.",
            "x-value of the symmetry line",Fraction(s-r,2),
            f"The roots are {m(-r)} and {m(s)}.",
            f"Find their midpoint: {m(f'\\frac{{-{r}+{s}}}{{2}}')}.",
            "The axis of symmetry lies halfway between the two distinct roots.")
    y_int=-A*r*s
    return number("Find where a parabola meets the y-axis",
        f"Find the y-coordinate where {m(equation)} meets the y-axis.","y-intercept",y_int,
        f"Use x = 0 in the factorised form. The two factor values are {m(r)} and {m(-s)}.",
        f"Multiply the two values by {m(A)}.",
        "Set x to zero at the y-axis, even if the graph has two x-intercepts.")


def vertex(i,mode=0):
    a=(2+i%4)*(-1 if i%2 else 1)
    h=2+i%9
    k=3+i
    qrule=f"y={left_term(a,'x^2')}{(-2*a*h):+d}x{constant(a*h*h+k)}"
    completed=f"y={left_term(a,'(x-'+str(h)+')^2')}+{k}"
    if mode==0:
        return number("Find the x-coordinate of the turning point",
            f"Use completing the square to find the x-coordinate of the turning point of {m(qrule)}.",
            "Turning point x-coordinate",h,
            f"Take out the coefficient of {m('x^2')} from the two x terms and complete the square.",
            f"The completed form is {m(completed)}. The square is zero at the stated x-coordinate.",
            "The x-coordinate makes the bracket zero.")
    if mode==1:
        return number("Find a maximum or minimum value",
            f"Use completing the square to find the {'minimum' if a>0 else 'maximum'} y-value of {m(qrule)}.",
            "Turning point y-value",k,
            f"Completing the square gives {m(completed)}.",
            "At the turning point the squared term is zero. The constant outside the square gives the y-value.",
            "Keep the outside coefficient when completing the square.")
    answers={"A":"A minimum","B":"A maximum"}
    return choice("Choose the type of a turning point",
        f"Does {m(completed)} have a minimum or a maximum?",
        answers,"A" if a>0 else "B",
        f"The squared bracket is never negative. The multiplier is {m(a)}.",
        f"The graph's turning value occurs when the square is zero, so the point is {m(f'({h},{k})')}.",
        "With a negative multiplier, the square makes all other y-values smaller.")


def cubic(i,mode=0):
    a=(2+i%5)*(-1 if i%2 else 1)
    t=2+i
    if mode==0:
        name=f"y={left_term(a,'x^3')}+{t}"
        return number("Find the intercept of a translated cubic",
            f"What is the y-intercept value for {m(name)}?","y-intercept",t,
            "At the y-axis the x-value is zero.",f"The cube term vanishes, leaving {m(t)}.",
            "Find where x is zero. A vertical shift changes the y-intercept.")
    r,s=2+i%9,3+i%11
    rule=f"y={left_term(a,'x(x+'+str(r)+')(x-'+str(s)+')')}"
    if mode==1:
        expected=f"{{-{r},0,{s}}}"
        q=task("List every axis crossing of a cubic",
            f"Give the complete set of x-intercepts of {m(rule)}, as a set of x-values.",
            "Set of roots",expected,
            ["At each x-intercept, the product of the three factors is zero.",
             f"Set each factor to zero. The three x-values are {m(f'-{r}, 0, {s}')}."],
             "Check all three factors, including x on its own.",kind="set")
        return dict(q,method="Set each linear factor to zero.",result=m(fr'\{{-{r},0,{s}\}}'))
    return choice("Decide which way the cubic ends point",
        f"As x increases far to the right, does {m(rule)} rise or fall?",
        {"A":"It rises","B":"It falls"},"A" if a>0 else "B",
        f"The highest power is a cube with coefficient {m(a)}.",
        "For large positive x, every x factor is positive, so the sign of the multiplier controls the right end.",
        "Think about the highest power at a large positive input.")


def reciprocal(i,mode=0):
    a=(2+i%17)*(-1 if i%2 else 1)
    b=3+i
    source=fr"y=\frac{{{a}}}{{x}}+{b}"
    if mode==0:
        return number("Find a horizontal asymptote",
            f"Give the y-value of the horizontal asymptote of {m(source)}.","Horizontal asymptote y-value",b,
            "For large positive or negative x, the fraction tends to zero.",
            f"The constant {m(b)} is the value approached.",
            "A vertical shift moves the horizontal asymptote by the same amount.")
    if mode==1:
        return number("Find the zero of a shifted reciprocal",
            f"Give the x-intercept of {m(source)} as an exact x-coordinate.","x-intercept",Fraction(-a,b),
            "At an x-intercept use y = 0 and keep the condition that x is non-zero.",
            f"Multiply by x to obtain {m(f'{a}+{b}x=0')}. Solve and check the denominator.",
            "The line x = 0 is the vertical asymptote. It cannot give an intercept.")
    return choice("Place the right-hand reciprocal branch",
        f"For positive x, is {m(source)} above or below its horizontal asymptote?",
        {"A":"Above","B":"Below"},"A" if a>0 else "B",
        f"The difference from {m(f'y={b}')} is {m(fr'\frac{{{a}}}{{x}}')}.",
        "The denominator is positive on the right. The sign of the numerator tells you which side of the asymptote the branch lies on.",
        "Compare the graph's y-value with its asymptote, not with zero.")


def exponential(i,mode=0):
    r=2+i%4
    a=2+i%6
    b=4+i
    positive=i%2==0
    base=r if positive else fr"\frac{{1}}{{{r}}}"
    source=f"y={a}\\left({base}\\right)^x-{b}"
    if mode==0:
        return number("Find the y-intercept from the zero exponent",
            f"Find the y-intercept value of {m(source)}.","y-intercept",a-b,
            "An exponential at x = 0 has a power equal to 1.",
            f"The y-intercept value is {m(f'{a}-{b}')}.","A non-zero base to power zero is 1.")
    if mode==1:
        return number("Find the shifted exponential asymptote",
            f"Give the y-value of the horizontal asymptote of {m(source)}.",
            "Horizontal asymptote y-value",-b,
            "At one end, the exponential term tends to zero.",
            f"The graph approaches {m(f'y=-{b}')}, the vertical shift from the x-axis.",
            "Read the outside constant. The graph approaches a horizontal line.")
    return choice("Recognise an increasing or decreasing exponential",
        f"Does {m(source)} increase or decrease to the right?",
        {"A":"Increase","B":"Decrease"},"A" if positive else "B",
        f"The base is {m(base)} and the outside multiplier is positive.",
        "A base above one gives growth. A base between zero and one gives decay.",
        "A vertical shift does not change which way the graph goes.")


def choose(factory,mode):
    return lambda i:factory(i,mode)



LESSONS=[
 ("lines","Sketching straight lines","Use intercepts and gradient to sketch any line with a readable axis scale.",False,[
  ("y-axis","Which coordinate is zero at the y-axis?","A line meets the vertical axis when x is zero. Substitute that value to find the crossing.",
   "Mark the y-intercept on the vertical axis.", "A y-intercept is a point with x-coordinate zero.",choose(line_key,0),"line"),
  ("x-axis","Which coordinate is zero at the x-axis?","Set the vertical coordinate to zero. Solve for the horizontal coordinate.",
   "Use both intercepts when they are different. If they coincide at the origin, find a separate point.",
   "A line parallel to the horizontal axis may have no x-intercept.",choose(line_key,1),None),
  ("direction","What does the gradient tell me about the line?","A positive gradient rises to the right and a negative gradient falls to the right. A gradient of zero gives a horizontal line.",
   "Rearrange to y = mx + c when possible to read gradient and intercept.",
   "A vertical line has equation x = a. Its gradient is undefined.",choose(line_key,2),None)]),
 ("parabolas","Sketching quadratics with roots and symmetry","Identify the opening direction, root positions and line of symmetry before drawing the parabola.",False,[
  ("open","Does the parabola open up or down?","Read the sign of the squared term. A positive leading coefficient makes both ends rise.",
   "The sign controls whether the curve cups up or arches down.",
   "The constant term identifies a vertical-axis crossing. It does not decide the opening direction.",choose(parabola,0),"parabola"),
  ("symmetry","Where is the vertical line of symmetry?","The parabola has a vertical mirror line. If it has two roots, they lie at equal horizontal distances from this mirror line.",
   "Find the mean of the two root values to locate the mirror line.",
   "A line of symmetry is a vertical line, not one of the roots.",choose(parabola,1),None),
  ("intercept","Which crossing can I find without solving a quadratic?","At the y-axis, use x equal to zero. In the expanded form this leaves the constant. In the factorised form substitute into both brackets.",
   "Write the y-intercept as a point and keep it separate from the x-intercepts.",
   "Use two roots to mark crossings only when they are real.",choose(parabola,2),None)]),
 ("turning-points","Sketching a quadratic from its turning point","Complete the square to locate a minimum or maximum and use it to guide the sketch.",True,[
  ("x","Which x gives the turning point?","In completed-square form find the value of x where the whole bracket is zero. This is where the square makes no contribution.",
   "Read the turning x-coordinate from the value that makes the bracket zero.",
   "A negative sign inside the bracket can lead to a positive coordinate.",choose(vertex,0),"vertex"),
  ("y","Which y-value goes with that x?","When the squared bracket is zero, the other term gives the y-coordinate. Read the outside constant after completing the square.",
   "Mark the turning point and use the vertical line through it for symmetry.",
   "If a factor multiplies the bracket, keep track of it during every step of rearranging.",choose(vertex,1),None),
  ("kind","Is this point a maximum or a minimum?","The square is non-negative. A positive multiplier raises all other outputs; a negative one lowers them.",
   "A positive leading term gives a minimum, a negative leading term gives a maximum.",
   "A parabola can have its turning point above, below or on the x-axis.",choose(vertex,2),None)]),
 ("cubics","Sketching cubic curves","Look at the cube term, intercepts and the possible changes in direction between roots.",True,[
  ("shift","How does a translated cubic meet the axes?","Start from the basic increasing or decreasing cube curve. A constant added to it shifts every point vertically.",
   "Use x equal to zero for the y-intercept. Use y equal to zero and a cube root to find the x-intercept.",
   "The graph of a positive cube has opposite end directions on the left and right.",choose(cubic,0),"cubic"),
  ("roots","How do three factors give three crossings?","A product of three linear factors is zero when one factor is zero. Locate those x-values before sketching.",
   "For three distinct roots, the graph crosses three times and changes direction between successive crossings.",
   "If a factor occurs twice, the curve may touch the axis there. Mark repeated roots separately.",choose(cubic,1),None),
  ("ends","What decides the far ends of the graph?","Far from the origin, the cube term dominates the lower powers. The sign of its coefficient controls the direction.",
   "A positive leading term rises to the right; a negative leading term falls to the right.",
   "The sketch need not show exact turning point coordinates unless the question asks for them.",choose(cubic,2),None)]),
 ("reciprocals","Sketching reciprocal curves","Locate an excluded x-value, two asymptotes and the correct side for each branch.",True,[
  ("asymptote","What lines does a reciprocal approach?","The graph is undefined at x equal to zero. On both sides, fractions with very large denominators get close to zero in size.",
   "The line x = 0 is vertical. The added constant gives the horizontal line approached.",
   "Draw two separate branches. Do not connect the graph at its excluded input.",choose(reciprocal,0),"reciprocal"),
  ("root","Can the curve cross the horizontal axis?","To locate an x-intercept set y to zero. Keep the condition that the denominator is non-zero while solving.",
   "A crossing of the x-axis is different from crossing the horizontal asymptote.",
   "A line can be approached without being reached.",choose(reciprocal,1),None),
  ("branches","Which side of the asymptote is each branch on?","Compare y with the height of the horizontal asymptote. The sign of the fraction gives the side.",
   "For a positive numerator, the right branch stays above the horizontal asymptote. A negative numerator swaps the branches.",
   "The branches can be both above or below the x-axis over part of a sketch after shifting.",choose(reciprocal,2),None)]),
 ("exponentials","Sketching exponential curves","Use the base, vertical shift and value at x equal to zero to guide an exponential sketch.",True,[
  ("intercept","What happens at x equal to zero?","A positive base raised to zero is one. Multiply it by the outside coefficient, then add the shift.",
   "The y-intercept is the outside coefficient plus the constant shift.",
   "The base to power zero is one, so the exponential term remains.",choose(exponential,0),"exponential"),
  ("approach","Which horizontal line is approached?","At one end the exponential term tends to zero. The rest of the expression is the constant shift.",
   "Draw the shifted horizontal asymptote with a dashed line.",
   "An exponential has no vertical asymptote in these forms.",choose(exponential,1),None),
  ("trend","How can I tell whether it grows to the right?","For a positive multiplier, a base bigger than one increases and a base between zero and one decreases.",
   "Use the base first. A negative outside multiplier reverses the direction, and a vertical shift moves the whole curve.",
   "A vertical shift alone does not change the direction of the curve.",choose(exponential,2),None)]),
]


def figures():
    folder=ROOT/"public/assets/study/0580/sketching-curves"
    folder.mkdir(parents=True,exist_ok=True)
    green,blue="#176c59","#294a77"
    xs=[i/16 for i in range(-80,81)]
    def graph(name,alt,caption,curves,mark=(),vertical=(),horizontal=(),height=7):
        x0,y0,x1,y1=49,19,384,159
        def X(x):return x0+(x+5)*(x1-x0)/10
        def Y(y):return y0+(height-y)*(y1-y0)/(2*height)
        content=f'<defs><clipPath id="grid"><rect x="{x0}" y="{y0}" width="{x1-x0}" height="{y1-y0}"/></clipPath></defs>'
        for u in range(-4,5):
            content+=line(X(u),y0,X(u),y1,"#e4edf5")
        for v in range(-height+1,height):
            content+=line(x0,Y(v),x1,Y(v),"#e4edf5")
        content+=line(x0,Y(0),x1,Y(0))+line(X(0),y1,X(0),y0)+label(x1+13,Y(0)+4,"x")+label(X(0)+15,y0-3,"y")
        content+='<g clip-path="url(#grid)">'
        for pos in vertical:
            content+=f'<line x1="{X(pos):.2f}" x2="{X(pos):.2f}" y1="{y0}" y2="{y1}" stroke="{green}" stroke-width="2" stroke-dasharray="5 4"/>'
        for pos in horizontal:
            content+=f'<line x1="{x0}" x2="{x1}" y1="{Y(pos)}" y2="{Y(pos)}" stroke="{green}" stroke-width="2" stroke-dasharray="5 4"/>'
        for curve in curves:
            points=" ".join(f"{X(x):.2f},{Y(y):.2f}" for x,y in curve)
            content+=f'<polyline points="{points}" fill="none" stroke="{blue}" stroke-width="3"/>'
        for x,y in mark:
            content+=f'<circle cx="{X(x):.2f}" cy="{Y(y):.2f}" r="4.5" fill="{green}"/>'
        content+="</g>"
        text=('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 414 177" role="img" aria-labelledby="title">'
              f'<title id="title">{escape(alt)}</title><rect width="414" height="177" rx="11" fill="white"/>{content}</svg>\n')
        (folder/f"{name}.svg").write_text(text,encoding="utf-8")
        return dict(src=f"/assets/study/0580/sketching-curves/{name}.svg",alt=alt,caption=p(caption),width=414,height=177)
    return {
      "line":graph("line","A rising straight line with both intercepts marked.","The two marked points show where the line meets each axis.",
          [[(-5,-13),(5,7)]],mark=[(1.5,0),(0,-3)]),
      "parabola":graph("parabola","An upward parabola through two roots and a dashed symmetry line.","The vertical mirror line is halfway between the two marked roots.",
          [[(x,(x+2)*(x-3)) for x in xs]],mark=[(-2,0),(3,0)],vertical=[.5],height=9),
      "vertex":graph("vertex","A downward parabola reaches its highest point at the marked vertex.","The turning point gives the maximum. The dashed line is the line of symmetry.",
          [[(x,4-(x-1)**2) for x in xs]],mark=[(1,4)],vertical=[1]),
      "cubic":graph("cubic","A cubic crosses the horizontal axis three times.","Three distinct roots give three crossings.",
          [[(x,x**3-4*x) for x in xs]],mark=[(-2,0),(0,0),(2,0)]),
      "reciprocal":graph("reciprocal","Two reciprocal branches with dashed horizontal and vertical asymptotes.","The curve approaches both dashed lines. The branches remain separate.",
          [[(x,1+4/x) for x in xs if x<0],[(x,1+4/x) for x in xs if x>0]],vertical=[0],horizontal=[1]),
      "exponential":graph("exponential","An increasing exponential rises past the vertical axis with a dashed asymptote below.",
          "The left end approaches the dashed horizontal line. The green point marks the y-intercept.",
          [[(x,2**x-2) for x in xs]],mark=[(0,-1)],horizontal=[-2]),
    }



def build():
    diagrams=figures()
    lessons,study,questions=[],{},[]
    for key,title,summary,extended,methods in LESSONS:
        id=f"igcse-0580-sketch-{key}"
        sections,examples,extra=[],[],[]
        for j,(anchor,heading,intro,idea,mistake,gen,fig) in enumerate(methods):
            first=len(examples)
            for seed in (j+3,j+7):
                q=gen(seed)
                examples.append(dict(title=q["title"],
                    question=q.get("written_prompt",q["prompt"]),
                    solution=q["steps"][:-1] if q["field"]["type"]=="choice" else q["steps"]))
            blocks=[dict(kind="key",html=p(idea),**({"figure":diagrams[fig]} if fig else {})),
                dict(kind="example",index=first),check(f"{id}-{anchor}-1",gen(13+j)),
                dict(kind="mistake",html=p(mistake)),dict(kind="example",index=first+1,tryFirst=True),
                check(f"{id}-{anchor}-2",gen(17+j))]
            sections.append(dict(id=anchor,title=heading,label=anchor.replace("-"," ").capitalize(),
                minutes=7,level="core",intro=p(intro),blocks=blocks))
            extra.extend(check(f"{id}-{anchor}-extra-{n+1}",gen(24+3*j+n)) for n in range(2))
        feature=diagrams[methods[0][-1]]
        body="".join(f"<h2>{item[1]}</h2>"+p(item[3]) for item in methods)
        body+=f'<p><img width="260" src="{feature["src"]}" alt="{escape(feature["alt"],quote=True)}"></p>'
        samples=[item[5](3+i) for i,item in enumerate(methods[:2])]
        checks="<ol>"+"".join("<li>"+q.get("written_prompt",q["prompt"])+p("<strong>Answer.</strong> "+q.get("written_answer",q["result"]))+"</li>" for q in samples)+"</ol>"
        study[id]=dict(updatedOn="2026-11-22",description=summary,sections=sections,examples=examples,extraPractice=extra,
            glossary=[dict(term=k,definition=p(v)) for k,v in [
              ("Intercept","A crossing or meeting with an axis."),
              ("Turning point","A point where the graph changes between increasing and decreasing."),
              ("Asymptote","A line that the graph approaches.")]],
            revision=dict(body=body,checks=checks,examTip=p(methods[-1][4])))
        if lessons:
            last=lessons[-1]
            study[id]["related"]=[dict(title=last["title"],href=f"/courses/maths4u-0580/topics/{last['id']}")]
        if extended:title+=" (Extended)"
        lessons.append(dict(id=id,key=key,title=title,summary=summary,objective=summary,
            before=p("Recall that a crossing point lies on the graph and the axis."),
            ideas="".join(p(item[3]) for item in methods),method="".join(f"<h4>{item[1]}</h4>"+p(item[2]) for item in methods),
            mistakes=[item[4] for item in methods],examples=[dict(title=e["title"],question=e["question"],solution="".join(e["solution"]),
                verification=f"{id}-ex-{i+1}") for i,e in enumerate(examples[::2])]))
        gens=[item[5] for item in methods]
        for j,(a,b) in enumerate(((0,1),(1,2),(2,0),(0,2),(2,1))):
            family=f"{id}-P{j+1}"
            questions.extend(bank_item(f"{family}-{v}",family,key,[gens[a](34+5*j+v)]) for v in range(2))
            family=f"{id}-E{j+1}"
            for v in range(4):
                seed=57+29*j+v
                questions.append(bank_item(f"{family}-{v}",family,key,[gens[a](seed),gens[b](seed+12)],v))
    pack=dict(schema_version=1,key="0580-algebra-sketching-curves",version="1.0.0",
        course=dict(slug="maths4u-0580",title="Cambridge IGCSE Mathematics (0580)",code="0580",direction="igcse"),
        chapter=dict(id="igcse_0580_algebra_sketching_curves",slug="sketching-curves",title="Sketching curves",position=28),
        source=dict(sha256=sha256(Path(__file__).read_bytes()).hexdigest(),supplied=0,held=[]),lessons=lessons,questions=questions,marking_status="DRAFT")
    for suffix,content in [("v1",pack),("study",study)]:
        (ROOT/"content/original/0580"/f"sketching-curves-{suffix}.json").write_text(json.dumps(content,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(f"{len(lessons)} lessons and {len(questions)} practice, review and exam-style tasks")


if __name__=="__main__":
    build()
