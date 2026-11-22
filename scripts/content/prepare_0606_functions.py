"""Author 0606 Functions from independent function models and task designs."""

from pathlib import Path

from prepare_0606_algebra_support import (
    case, choice, export_chapter, graph, lesson, m, p, pairs, part, roots, section, sy, table, tex, x,
)


S = "functions"


def mapping(i,mode):
    a=2+i//5
    b=2+i%5
    inputs=(a,a+b,a+2*b)
    outputs=(a-b,a+b,a+2*b) if mode==0 else (a-b,a+b,a-b)
    relation=mode==2
    if relation:inputs=(a,a+b,a)
    context=p("The input and output pairs for a rule are shown in the table.")+table(["Input","Output"],[[m(u),m(v)] for u,v in zip(inputs,outputs)])
    image,display=roots(outputs)
    if relation:
        reason=f"The input {m(a)} has the two different outputs {m(outputs[0])} and {m(a+2*b)}."
        outputs=(outputs[0],outputs[1],a+2*b)
        context=p("The table shows a relation from the input values to the output values.")+table(["Input","Output"],[[m(u),m(v)] for u,v in zip(inputs,outputs)])
        image,display=roots(outputs)
    else:
        reason="Every listed input has exactly one output. " + ("The outputs are all different." if mode==0 else f"The first and last inputs both give {m(outputs[0])}.")
    result=["A one-to-one function","A many-to-one function","A relation that is not a function"][mode]
    options={key:text for key,text in zip("ABC",["A one-to-one function","A many-to-one function","A relation that is not a function"])}
    answer="ABC"[mode]
    return case("Read a mapping and explain its type",context,
        part("Write the set of distinct outputs.","Set of outputs",image,"List output values from the second column.","Include a repeated result only once.",display,kind="set"),
        choice("Which description fits this rule?",options,answer,"Check how many outputs belong to each input first, then look for shared outputs.",reason,
            retry=("A" if answer!="A" else "B",reason),written=dict(prompt="Classify the rule as a one-to-one function, a many-to-one function, or a relation that is not a function. Explain your classification.",answer=result+". "+reason,marks=(("B1",result),("B1",reason)))))


def evaluate(i,mode):
    a=2+i%4
    b=1+i//4
    c=(i%7)-3
    z=b+(-1 if mode==0 else a)
    f=a*(x-b)**2+c
    expected=f.subs(x,z)
    left=f.subs(x,b-2)
    assert left==f.subs(x,b+2)
    return case("Use function notation to identify values",p(f"A function is defined by {m('f:x\\mapsto '+tex(f))} for all real {m('x')}.") ,
        part(f"Find {m(f'f({z})')}.","Function value",expected,"Replace every occurrence of the input by the named value.",f"Subtract {m(b)} within the brackets before squaring, then multiply and add."),
        part(f"Find the input to the left of {m(b)} that has the same output as {m(b+2)}.","Input",b-2,"Equal offsets left and right of the centre have the same squared value.",f"The same output is {m(left)} at these two inputs."),
        choice("Is this function one-to-one?",{"A":"Yes","B":"No"},"B","Find two different inputs with the same output.",f"The inputs {m(b-2)} and {m(b+2)} both give {m(left)}.",
            written=dict(prompt="Explain why the function is many-to-one.",answer=f"The distinct inputs {m(b-2)} and {m(b+2)} share the output {m(left)}.",marks=(("B1","Give two distinct inputs."),("B1","Show that their outputs agree.")))))


def domain(i,mode):
    h=1+i//4
    a=1+i%5
    k=i%7-3
    if mode==0:
        f=k+sy.sqrt(a*(x-h))
        d=f"[{h},inf)"; rng=f"[{k},inf)"
        d_label=m(f"x\\ge {h}"); r_label=m(f"y\\ge {k}")
        w="The radicand is zero at the left endpoint, so the endpoint is included."
        method="Make the expression inside the square root non-negative."
        out=f"The square root has minimum zero. The smallest output is {m(k)}."
        wrong=f"({h},inf)"
    elif mode==1:
        f=k+a/(x-h)
        d=f"(-inf,{h})U({h},inf)";rng=f"(-inf,{k})U({k},inf)"
        d_label=m(f"x\\ne {h}");r_label=m(f"y\\ne {k}")
        method="Exclude the value that makes the denominator zero."
        w=f"The denominator is {m(x-h)}, so the function is undefined when {m(f'x={h}')} ."
        out=f"The fraction cannot equal zero. Solving {m('y='+tex(f))} for {m('x')} gives a real input for every {m(f'y\\ne {k}')} ."
        wrong=f"[{h},inf)"
    else:
        f=k-a*sy.sqrt(x-h)
        d=f"[{h},inf)";rng=f"(-inf,{k}]"
        d_label=m(f"x\\ge {h}");r_label=m(f"y\\le {k}")
        method="The square-root input must be non-negative."
        w=f"At {m(f'x={h}')}, the square root is zero, so the endpoint is allowed."
        out=f"Subtracting a non-negative square-root value from {m(k)} gives a maximum of {m(k)}."
        wrong=f"(-inf,{h}]"
    return case("Find all allowed inputs and outputs",p(f"Consider the real-valued function {m('f(x)='+tex(f))} on its largest possible real domain."),
        part("State the domain of the function.","Domain",d,method,w,d_label,kind="set",retry=(wrong,w)),
        part("Find the range of the function.","Range",rng,"Use the limiting or extreme values of the output.",out,r_label,kind="set"))


def composition(i,mode):
    a=2+i%3
    b=1+i//3
    c=1+i%5
    f=a*x+b
    g=(x-c)**2 if mode!=1 else x-c
    fg=sy.expand(f.subs(x,g))
    gf=sy.expand(g.subs(x,f))
    ff=sy.expand(f.subs(x,f))
    z=c+2
    steps=[part(f"Find an expression for {m('fg(x)')}.","Expression for fg(x)",fg,"Apply the right-hand function first.",f"Substitute {m(g)} for the input of {m('f')}, then simplify.",kind="polynomial",variables=["x"],retry=(gf,"This applies the functions in the opposite order.")),
           part(f"Find {m(f'gf({z})')}.","Composite value",gf.subs(x,z),"Evaluate the inner function first, then use its result as the next input.",f"The inner value is {m(f.subs(x,z))}. Put it into {m('g')}.")]
    if mode==2:
        steps.append(part(f"Find {m('f^2(x)')}, where the superscript denotes composition.","Expression for f composed with itself",ff,"Use the output of the first application of f as a new input.",f"Substitute {m(f)} for x in {m('f(x)')}.",kind="polynomial",variables=["x"],retry=(sy.expand(f**2),"Composition applies the function again. Squaring the output gives a different expression.")))
    return case("Choose the correct order of a composition",p(f"Let {m('f(x)='+tex(f))} and {m('g(x)='+tex(g))}."),*steps)


def composition_domain(i,mode):
    a=2+i%4
    h=2+i//4
    k=1+i%7
    outer=sy.sqrt(x-h)
    inner=a*x+k if mode==0 else k-a*x
    edge=sy.Rational(h-k,a if mode==0 else -a)
    expected=f"[{edge},inf)" if mode==0 else f"(-inf,{edge}]"
    wrong=f"(-inf,{edge}]" if mode==0 else f"[{edge},inf)"
    return case("Restrict a composite's domain",p(f"Let {m('f(x)='+tex(outer))} on its natural domain and {m('g(x)='+tex(inner))} for all real {m('x')}."),
        part(f"Find the input at which {m('g(x)')} first reaches the boundary of the domain of {m('f')}.","Boundary input",edge,
             "The boundary occurs when g(x) equals the smallest allowed input of the square root.",f"Solve {m(tex(inner)+f'={h}')}.") ,
        part(f"Find the domain of {m('fg')}.","Domain of fg",expected,"The output of g must be a valid input of f.",f"Solve {m(tex(inner)+r'\ge '+str(h))}. " + ("Retain the inequality direction." if mode==0 else "Reverse the inequality when dividing by a negative number."),
             m((r"x\ge " if mode==0 else r"x\le ")+tex(edge)),kind="set",retry=(wrong,"Solve the condition on g(x), looking at the sign of its coefficient of x.")),
        part(f"Find {m('fg(x)')} at the boundary of its domain.","Composite output",0,"At the boundary, the inner output is the first input allowed by f.","The expression inside the square root equals zero."))


def modulus(i,mode):
    h=1+i//4
    a=1+i%4
    if mode==0:
        f=a*(x-h); point=h-2
        numeric=2*a
        zero,example=roots([h])
        yint=a*h
        sketch=f"The two rays meet at {m(f'({h},0)')}. The left ray is obtained by reflecting the negative part of the line. The y-intercept is {m(f'(0,{yint})')}."
        graph_step=part("Write the set containing every x-intercept.","Set of x-intercepts",zero,"The modulus is zero exactly where its input is zero.",f"Solve {m(tex(f)+'=0')}.",example,kind="set")
    else:
        d=2+i%3
        f=a*((x-h)**2-d*d); point=h
        numeric=a*d*d
        zero,example=roots([h-d,h+d]);yint=abs(int(f.subs(x,0)))
        sketch=f"Plot the zeros {m(h-d)} and {m(h+d)}. Keep the positive outer arcs. Reflect the arc between the zeros, making the central peak {m(f'({h},{numeric})')}. The y-intercept is {m(f'(0,{yint})')}."
        graph_step=part("Give the complete set of x-intercepts.","Set of x-intercepts",zero,"Find the points where the quadratic is zero before taking its modulus.",f"Solve {m(f'(x-{h})^2={d*d}')}. Both signs are needed.",example,kind="set")
    assert abs(f.subs(x,point))==numeric
    step=part(f"Find {m(f'g({point})')}.","Modulus value",numeric,"Evaluate the expression inside the modulus, then take its non-negative magnitude.",f"The value before taking the modulus is {m(f.subs(x,point))}.",retry=(-numeric,"Reflect the negative output across the horizontal axis."))
    graph_step["written"]=dict(prompt=f"Sketch {m('y=g(x)')} and label every point where it meets an axis.",answer=sketch,
        marks=(("B1","Both the shape and reflection are correct."),("B1",f"The complete x-intercept set is {example}."),("B1",f"The vertical intercept is {m(f'(0,{yint})')}.")))
    return case("Sketch the modulus of a graph",p(f"The function {m('g')} is defined by {m('g(x)=|'+tex(f)+'|')}."),step,graph_step)


def inverse(i,mode):
    a=2+i%4
    b=1+i//4
    c=i%9-4
    if mode==0:
        f=a*x+b
        g=(x-b)/a
        t=b+2*a
        input_at=2
        domain_text="for real x"
        method="Swap input and output, then isolate the new output."
        work=f"Undo addition of {m(b)}, then undo multiplication by {m(a)}."
        rule=part(f"Find {m('f^{-1}(x)')}.","Inverse expression",g,method,work,kind="polynomial",variables=["x"])
    else:
        f=c+a/(x-b)
        g=b+a/(x-c)
        t=c+a
        input_at=b+1
        domain_text=m(f"x\\ne {b}")
        method="Isolate the reciprocal term before switching the variable names."
        work=f"From {m('y='+tex(f))}, multiply by {m('x-'+str(b))} and divide by {m('y-('+str(c)+')')}. The inverse excludes the original range gap."
        rule=part("Give the value excluded from the domain of the inverse.","Excluded input",c,method,
            work+f" The inverse is {m('f^{-1}(x)='+tex(g))}.",written=dict(prompt="Find the inverse function and state its domain.",
            answer=m('f^{-1}(x)='+tex(g))+", with "+m(f"x\\ne {c}")+".",
            marks=(("M1","Rearrange to isolate the original input."),("A1",m('f^{-1}(x)='+tex(g))),("B1",m(f"x\\ne {c}")))))
    assert sy.simplify(f.subs(x,g)-x)==0
    return case("Find and use an inverse function",p(f"Let {m('f(x)='+tex(f))}, {domain_text}."),
        rule,
        part(f"Find {m(f'f^{{-1}}({t})')}.","Inverse value",input_at,"Find the input that the original function sends to the given output.",f"Substitution confirms {m(f'f({input_at})={t}')}."))


def branch(i,side):
    a=1+i%4
    h=2+i//4
    k=i%9-4
    f=a*(x-h)**2+k
    inv=h+side*sy.sqrt((x-k)/a)
    bound=f"x\\ge {h}" if side==1 else f"x\\le {h}"
    distance=1+i%3
    t=k+a*distance**2
    expected=h+side*distance
    assert f.subs(x,expected)==t
    wrong=h-side*distance
    expressions=[m(inv),m(h-side*sy.sqrt((x-k)/a)),m(h+side*sy.sqrt((x+k)/a))]
    if expressions[0]==expressions[2]:
        expressions[2]=m(h+1+side*sy.sqrt((x-k)/a))
    position=i%3
    labels="ABC"
    options={letter:expressions[(j-position)%3] for j,letter in enumerate(labels)}
    explanation=f"Choose the {'positive' if side==1 else 'negative'} square-root offset relative to {m(h)}."
    return case("Invert a quadratic on a single branch",p(f"The function {m('f(x)='+tex(f))} has domain {m(bound)}."),
        part("State the domain of the inverse.","Inverse domain",f"[{k},inf)","The range of the original becomes the domain of its inverse.",f"The vertex gives the minimum output {m(k)} and it is included.",m(f"x\\ge {k}"),kind="set"),
        part(f"Find {m(f'f^{{-1}}({t})')}.","Inverse value",expected,"Solve the quadratic for the input and then keep the stated branch.",f"The equation gives {m(h+distance)} and {m(h-distance)}. Keep the one that meets {m(bound)}.",retry=(wrong,"That input is on the other branch.")),
        choice(f"Choose the full expression for {m('f^{-1}(x)')}.",options,labels[position],"Rearrange the completed-square form and use the square-root sign for the stated domain.",explanation,
             retry=(labels[(position+1)%3],"The opposite square-root sign returns values from the wrong branch."),
             written=dict(prompt="Write down the inverse function for the stated restriction.",answer=m('f^{-1}(x)='+tex(inv)),
             marks=(("M1","Isolate the square term and use the stated domain to select the branch."),("A1",m('f^{-1}(x)='+tex(inv)))))))


def reflect(i,mode):
    a=2+i%4
    b=1+i//4
    t=1+i%7
    f=a*x+b
    yv=a*t+b
    hit=sy.Rational(-b,a-1)
    match,display=pairs([(yv,t)])
    common,common_display=pairs([(hit,hit)])
    context=p(f"The graph of {m('f(x)='+tex(f))} contains the point {m(f'({t},{yv})')}. Its inverse is defined for all real inputs.")
    steps=[part("Give the corresponding point on the inverse graph.","Inverse point",match,"Exchange the input and the output.",f"Reflection in {m('y=x')} changes {m(f'({t},{yv})')} into {m(f'({yv},{t})')}",display,kind="pairs",retry=(f"({t},{yv})","Exchange the coordinates to get the point on the reflected graph.")),
           part("Find the intersection of the line and its inverse.","Intersection",common,"Set the two line expressions equal. The common point is on the reflection line.",f"Use {m(tex(f)+'=x')} to find the fixed input {m(hit)} and substitute it back.",common_display,kind="pairs")]
    if mode:
        steps.append(part("Find the y-intercept of the inverse graph.","Inverse y-intercept",sy.Rational(-b,a),"The original x-intercept becomes the inverse y-intercept.",f"Solve {m(tex(f)+'=0')}, then exchange coordinates."))
    return case("Use the diagonal reflection of an inverse",context,*steps)


def select(make,mode):
    return lambda i:make(i,mode)


def figures():
    blue,green="#245794","#16795c"
    return {
        "domain":graph(S,"square-root-domain","The square-root curve starts at one point and goes right and up.",(-2,8,-2,6),[(lambda t:1+(t-2)**.5,2,8,blue)],[(2,1,"Start")]),
        "modulus":graph(S,"reflect-negative-part","A parabola and its modulus agree above the horizontal axis. The negative arc reflects up.",(-4,5,-6,12),[(lambda t:(t-1)**2-4,-4,5,blue),(lambda t:abs((t-1)**2-4),-1,3,green)],[(-1,0,"A"),(3,0,"B")]),
        "branch":graph(S,"restrict-and-invert","A right-hand quadratic branch and its inverse reflected across the diagonal.",(-2,7,-2,7),[(lambda t:t*t,0,3,blue),(lambda t:t**.5,0,7,green)],[(0,0,"O")],[(0,0,7,7)]),
        "reflect":graph(S,"inverse-point-swap","A line and its reflected inverse exchange the point coordinates.",(-4,7,-4,7),[(lambda t:2*t+1,-4,7,blue),(lambda t:(t-1)/2,-4,7,green)],[(2,5,"P"),(5,2,"P′")],[(-4,-4,7,7)]),
    }


def build():
    pic=figures()
    glossary=[("Domain","The allowed set of inputs."),("Range","The set of outputs the function actually reaches."),("One-to-one","Different inputs always give different outputs."),("Composite","A function formed by applying one rule then another."),("Inverse","A function that undoes a one-to-one rule.")]
    mp=lambda mode:select(mapping,mode)
    ev=lambda mode:select(evaluate,mode)
    do=lambda mode:select(domain,mode)
    comp=lambda mode:select(composition,mode)
    cd=lambda mode:select(composition_domain,mode)
    mod=lambda mode:select(modulus,mode)
    inv=lambda mode:select(inverse,mode)
    br=lambda mode:select(branch,mode)
    ref=lambda mode:select(reflect,mode)
    def l(key,title,description,sections,counts):return lesson(key,title,description,sections,glossary,counts)
    lessons=[
      l("mappings","Mappings and function notation","Classify mappings and use the notation of functions with confidence.",[
          section("classify","What makes a rule a function?","Read the inputs first. A function assigns exactly one output to every permitted input.","Two arrows may arrive at one output. Two different outputs from a single input break the function rule.","A repeated output does not on its own make a relation invalid.",mp(2),1),
          section("values","How do I use function notation?","Read the bracket as an instruction about the input. Replace the input wherever it occurs in the rule.",f"{m('f(3)')} means apply the rule at input {m(3)}.","Do not multiply the name of the function by its input.",ev(0),0),
          section("one-to-one","When is a function one-to-one?","Compare outputs for different inputs. If at least two distinct inputs give the same output, it is many-to-one.","A one-to-one function has one input for each output in its range.","Check where arrows end, as well as where they start.",mp(1),1),
      ],[(mp(0),5),(mp(1),5),(mp(2),4),(ev(0),4),(ev(1),2)]),
      l("domain-range","Domain and range","Find the complete set of legal inputs and outputs for square-root and reciprocal functions.",[
          section("radicand","Which inputs make a real square root?","Locate the expression underneath the root sign. Its value must be at least zero.","Include the zero endpoint of a square root when nothing else excludes it.","A square root can equal zero. Use a closed endpoint in this case.",do(0),0,pic["domain"]),
          section("outputs","What changes when a square root is subtracted?","Track how its input changes from zero to large positive values. Multiplying a result by a negative number reverses its order.","A square-root term subtracted from a constant gives a maximum output at the start of the domain.","The minimum input need not give the minimum output.",do(2),1),
          section("fractions","Which input and output are missing from a reciprocal?","Check where the denominator is zero. Then ask which horizontal level the output approaches without reaching.","A non-zero constant divided by a finite non-zero number never equals zero.","Do not put the domain restriction on the output variable or vice versa.",do(1),1),
      ],[(do(0),4),(do(1),4),(do(2),2)]),
      l("composites","Composite functions and their domains","Choose the right order, apply the inner rule and restrict its output when needed.",[
          section("order","Which rule goes first?","Think of two boxes connected in a row. The inner rule sees the original input. Its result is what enters the outer rule.",f"{m('fg(x)=f(g(x))')}. Work from the bracket outwards.","Interchanging the two rules can give a different output.",comp(0),0),
          section("repeat","Does f squared mean the output is squared?","In the Cambridge composition notation the superscript on the function name indicates that the rule is applied twice.",f"{m('f^2(x)=f(f(x))')} in this context.","Applying the same function twice is different from squaring a value.",comp(2),2),
          section("restricted-domain","How can one rule limit the next?","An initial input can be allowed by the inner rule while the first output is refused by the outer rule.","Check both domains. Solve the condition that the first output fits the next rule's domain.","For an inverse inequality, dividing by a negative coefficient reverses the order.",cd(1),1),
      ],[(comp(0),4),(comp(1),2),(comp(2),3),(cd(0),2),(cd(1),2)]),
      l("modulus-graphs","Linear and quadratic modulus graphs","Reflect negative outputs and preserve intercepts when sketching a modulus graph.",[
          section("value","What does the modulus change?","For each input, measure how far the original output lies from zero.","Positive outputs stay where they are. Negative outputs reflect in the horizontal axis.","The input is unchanged, including negative inputs.",mod(0),0,pic["modulus"]),
          section("linear","Where do the rays meet?","Find the zero of the linear expression. That point belongs to both pieces of the absolute-value graph.","The corner of a linear modulus graph is at the zero of the original line.","Reflect only the ray below the axis.",mod(0),1),
          section("quadratic","How can I sketch a quadratic's modulus?","Mark both original roots and the turning point. Identify which section was below the axis.","A negative vertex becomes a positive peak between the same two roots.","Take the modulus of the y-intercept too if it is negative.",mod(1),1),
      ],[(mod(0),6),(mod(1),6)]),
      l("inverse-rules","Inverse functions and exact values","Undo linear and reciprocal rules and verify answers by composing the two functions.",[
          section("linear","How can I reverse a linear rule?","Write the original output as a new variable. Rearrange first, before giving the inverse its usual name.","Undo operations in reverse order.","Dividing each term before moving an addition can give a wrong constant.",inv(0),0),
          section("reciprocal","How can I undo a reciprocal rule?","Move the output shift before multiplying by the denominator. This exposes the only prohibited inverse input.","A restriction on the original range becomes a restriction on the inverse domain.","A reciprocal shift in the output changes the denominator of the inverse.",inv(1),0),
          section("check","How do I verify an inverse value?","Treat the proposed inverse result as an input of the original function. It must reproduce the given output.",f"Look for {m('f(f^{-1}(z))=z')} for a permitted input {m('z')}.","Check the value in the original rule as well as rearranging the symbols.",inv(1),1),
      ],[(inv(0),7),(inv(1),7)]),
      l("restricted-inverses","Inverse branches of quadratic functions","Select the correct branch and track the domain and range after reversal.",[
          section("range-first","Which domain will the inverse have?","A full parabola may return the same output twice. Restrict the original domain to one branch so that reversal is a function.","The range of the restricted original is the inverse domain.","Include the vertex only when it belongs to the named branch.",br(1),0,pic["branch"]),
          section("right-branch","Which square root is valid on the right?","For inputs to the right of the vertex, the horizontal offset from its centre is non-negative.","The inverse formula takes the positive square-root offset on the right-hand branch.","The other algebraic root is outside the original domain.",br(1),2),
          section("left-branch","What changes on the left-hand branch?","The horizontal offset is now non-positive. The output still gives a valid non-negative value under the square root.","Use the negative square-root offset from the vertex on the left branch.","Choose the sign from the original domain, regardless of the sign of the final input.",br(-1),1),
      ],[(br(1),6),(br(-1),6)]),
      l("inverse-graphs","Inverse graphs and fixed points","Swap coordinates, reflect graphs across the diagonal and identify shared points.",[
          section("swap","Where does a point move on an inverse graph?","For each plotted point, the first coordinate becomes the second coordinate and the second becomes the first.",f"A reflection in {m('y=x')} swaps the two coordinates.","The graph is reflected across the diagonal rather than across an axis.",ref(0),0,pic["reflect"]),
          section("fixed-point","Where can these two lines meet?","A line and its distinct inverse are mirror images. Their unique intersection must be on the mirror line.",f"For the non-parallel lines here, solve {m('f(x)=x')} to get the common point.","Do not apply this single-intersection argument to arbitrary curves.",ref(0),1),
          section("intercepts","Which intercepts are exchanged?","An original point on the horizontal axis has output zero. Its inverse has input zero.","The horizontal intercept of the original becomes a vertical intercept of the inverse.","Keep the sign of the coordinate when swapping the axes.",ref(1),2),
      ],[(ref(0),4),(ref(1),5)]),
    ]
    export_chapter(S,"Functions",0,lessons,[__file__,Path(__file__).with_name("prepare_0606_algebra_support.py")])


if __name__=="__main__":
    build()
