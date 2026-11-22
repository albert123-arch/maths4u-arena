"""Generate authored 0606 modulus, graphical inequalities and substitution tasks."""

from pathlib import Path

from prepare_0606_algebra_support import case, choice, export_chapter, graph, lesson, m, p, part, roots, section, sy, table, tex, x


S = "equations-inequalities-graphs"


def linear_equation(i,mode):
    h=2+i//5
    a=2+i%4
    b=2+i%7
    inner=a*(x-h)
    if mode==0:
        level=a*b
        equation=r"|"+tex(inner)+"|="+str(level)
        candidates=[h-b,h+b]
        solutions=candidates
        explanation=f"Use {m(tex(inner)+r'=\pm '+str(level))} and solve both linear equations."
    elif mode in (1,2):
        c=a-1 if mode==1 else a+1
        rhs=c*(x-h)+b
        equation="|"+tex(inner)+"|="+tex(rhs)
        candidates=[h+sy.Rational(b,a-c),h-sy.Rational(b,a+c)]
        solutions=[t for t in candidates if abs(inner.subs(x,t))==rhs.subs(x,t)]
        rejected=[t for t in candidates if t not in solutions]
        explanation=f"Solve {m(tex(inner)+'='+tex(rhs))} and {m(tex(-inner)+'='+tex(rhs))}. "
        if rejected:
            explanation+=f"The candidate {m(rejected[0])} gives a negative right-hand side and is invalid."
        else:
            explanation+="Both candidates have non-negative right-hand sides and satisfy the original equation."
    else:
        c=a+1
        outer=c*(x-(h+b))
        equation="|"+tex(inner)+"|=|"+tex(outer)+"|"
        candidates=[sy.Rational(a*h-c*(h+b),a-c),sy.Rational(a*h+c*(h+b),a+c)]
        solutions=candidates
        assert all(abs(inner.subs(x,t))==abs(outer.subs(x,t)) for t in solutions)
        explanation=f"Either {m(tex(inner)+'='+tex(outer))} or {m(tex(inner)+'='+tex(-outer))}."
    expected,shown=roots(solutions)
    df,_=roots(candidates)
    retry=(df,"A candidate fails when the right side of the original equation is negative.") if len(candidates)>len(solutions) else None
    return case("Solve a modulus equation and check its candidates",p(f"Consider {m(equation)}."),
        part("Find the input that makes the expression inside the first modulus zero.","Input at the corner",h,"Set the expression inside the modulus equal to zero.",f"Solve {m(tex(inner)+'=0')}.") ,
        part("Find every real solution, giving your answers exactly.","Complete solution set",expected,"Resolve the two possible signs. Check the candidates in the original equation.",explanation,shown,kind="set",retry=retry))


def linear_inequality(i,mode):
    h=2+i//5
    a=2+i%4
    b=1+i%5
    k=2+i%3
    inner=a*(x-h)
    if mode<2:
        left=f"{k}|{tex(inner)}|"
        d=a*b*k
        op=r"\le" if mode==0 else ">"
        eq="|"+tex(inner)+"|="+str(a*b)
        z1,z2=h-b,h+b
        wanted=f"[{z1},{z2}]" if mode==0 else f"(-inf,{z1})U({z2},inf)"
        state=(m(f"{z1}\\le x\\le {z2}") if mode==0 else m(f"x<{z1}")+" or "+m(f"x>{z2}"))
        boundary="Scale the level by dividing by the positive multiplier. Solve at equality."
        work="The modulus gets larger as the input moves farther away from the centre."
        inequality=left+op+str(d)
    elif mode==2:
        rhs=(a-1)*(x-h)+b
        z1=h-sy.Rational(b,2*a-1);z2=h+b
        wanted=f"[{z1},{z2}]"
        state=m(tex(z1)+r"\le x\le "+tex(z2))
        eq="|"+tex(inner)+"|="+tex(rhs)
        inequality="|"+tex(inner)+r"|\le "+tex(rhs)
        boundary="Use both signs at equality, and check that the right-hand side is non-negative."
        work="The left-hand graph is below the right-hand line between the two crossings. At each crossing equality is included."
        assert abs(inner.subs(x,z1))==rhs.subs(x,z1) and abs(inner.subs(x,z2))==rhs.subs(x,z2)
    else:
        c=a*k+1
        right=c*(x-(h+b))
        target=k*inner
        test_points=sorted([sy.Rational(a*k*h-c*(h+b),a*k-c),sy.Rational(a*k*h+c*(h+b),a*k+c)])
        z1,z2=test_points
        wanted=f"(-inf,{z1}]U[{z2},inf)"
        state=m(r"x\le "+tex(z1))+" or "+m(r"x\ge "+tex(z2))
        inequality=f"{k}|{tex(inner)}|\\le |{tex(right)}|"
        eq="|"+tex(target)+"|=|"+tex(right)+"|"
        boundary="At equality, the two linear expressions agree or are negatives of each other."
        work="Both sides of the inequality are non-negative. Squaring gives a quadratic sign comparison. The right-hand side wins in the two outer regions."
        assert all(abs(target.subs(x,t))==abs(right.subs(x,t)) for t in test_points)
        assert abs(target.subs(x,(z1+z2)/2))>abs(right.subs(x,(z1+z2)/2))
    values,shown=roots([z1,z2])
    return case("Read the crossings and choose the inequality regions",p(f"Consider {m(inequality)}."),
        part("Find the inputs where the two sides are equal.","Set of boundary inputs",values,boundary,f"Solve {m(eq)}.",shown,kind="set"),
        part("Find the complete solution set of the inequality.","Solution set",wanted,"Use the boundary values and decide which regions satisfy the comparison.",work,state,kind="set"))


def quadratic_modulus(i,mode):
    h=2+i//5
    a=2+2*(i%3)
    r=1+i%4
    s=2+r+i%5
    average=sy.Rational(r*r+s*s,2)
    d=a*sy.Rational(s*s-r*r,2)
    f=a*((x-h)**2-average)
    A,B,C,D=h-s,h-r,h+r,h+s
    boundary,pretty=roots([A,B,C,D])
    assert all(abs(f.subs(x,t))==d for t in (A,B,C,D))
    equation="|"+tex(f)+"|="+tex(d)
    eq=part(f"Find all solutions of {m(equation)}.","Complete set of roots",boundary,"Split a modulus equality into two signed levels.",f"The two levels give {m(f'(x-{h})^2={r*r}')} and {m(f'(x-{h})^2={s*s}')}.",pretty,kind="set")
    q=f"|{tex(f)}|"
    if mode==0:
        typ=r"\le"
        expected=f"[{A},{B}]U[{C},{D}]"
        answer=m(f"{A}\\le x\\le {B}")+" or "+m(f"{C}\\le x\\le {D}")
        hint="Keep the graph between the two signed levels, including the endpoints."
    else:
        typ=">"
        expected=f"(-inf,{A})U({B},{C})U({D},inf)"
        answer=m(f"x<{A}")+", "+m(f"{B}<x<{C}")+" or "+m(f"x>{D}")
        hint="The absolute value is large both outside the wider boundaries and in the middle where the original quadratic falls below the negative level."
    check=part(f"Solve {m(q+typ+tex(d))}.","Complete solution set",expected,"Compare the signed quadratic with both a positive level and its negative.",hint,answer,kind="set")
    return case("Use both signed levels of a quadratic modulus",p(f"Let {m('f(x)='+tex(f))}."),eq,check)


def cubic_graph(i,mode):
    h=1+i//5
    v=2+i%5
    a=(1+i%3)*(-1 if mode==1 else 1)
    r,s,t=h-v,h,h+v
    factored=a*(x-r)*(x-s)*(x-t)
    F=sy.Poly(sy.expand(factored),x)
    wanted,shown=roots([r,s,t])
    hit=F.eval(0)
    zeros=part("Write down all the x-coordinate intercepts.","Set of x-intercepts",wanted,"Set each linear factor equal to zero.","All real zeros are obtained from the three different factors.",shown,kind="set")
    level=part("Find the y-intercept.","y-intercept",hit,"Evaluate the polynomial at zero.",f"Use all three factors when calculating {m('f(0)')}.")
    kind=f"{m('y=|f(x)|')}" if mode==1 else m('y=f(x)')
    yval=abs(hit) if mode==1 else hit
    sign="The positive parts are retained. Reflect the negative sections in the x-axis." if mode==1 else "From left to right the cubic is negative, then positive, then negative, then positive."
    sketch=choice(f"Are all outputs of {kind} non-negative?",{"A":"Yes","B":"No"},"A" if mode==1 else "B",
        "Use each distinct factor to establish where the sign changes.",sign,
        written=dict(prompt=f"Sketch {kind}, labelling all axis intercepts.",answer=f"The zeros are {shown} and the y-intercept is {m(f'(0,{yval})')}. {sign}",
             marks=(("B1",f"Label every zero in {shown}."),("B1",f"Mark the y-intercept at {m(f'(0,{yval})')} ."),("B1",sign))))
    return case("Sketch a factored cubic and its key features",p(f"The cubic polynomial is {m('f(x)='+tex(factored))}."),zeros,level,sketch)


def cubic_level(i,mode):
    h=1+i//5
    s=1+i%4
    a=(1+i%3)*(-1 if mode==1 else 1)
    u=x-h
    fn=a*u*(u-7*s)*(u+7*s)
    d=-120*a*s**3
    r1,r2,r3=h-8*s,h+3*s,h+5*s
    assert all(fn.subs(x,t)==d for t in (r1,r2,r3))
    boundaries,shown=roots([r1,r2,r3])
    op=r"\ge" if mode==0 else ">" if mode==1 else "<"
    relation=m('f(x)'+op+tex(d))
    if mode==0:
        ans=f"[{r1},{r2}]U[{r3},inf)"
        ans_m=m(f"{r1}\\le x\\le {r2}")+" or "+m(f"x\\ge {r3}")
        detail="Read the part between the first two crossings and the part after the third. Equality includes all three endpoints."
    else:
        ans=f"(-inf,{r1})U({r2},{r3})"
        ans_m=m(f"x<{r1}")+" or "+m(f"{r2}<x<{r3}")
        detail="Read the interval before the first crossing and the gap between the second and third. Exclude all three crossings themselves."
    values=[r1-1,r1,r2,r3,r3+1]
    samples=table([m('x'),m('f(x)')],[[m(t),m(fn.subs(x,t))] for t in values])
    return case("Read a cubic inequality at a nonzero level",p(f"Let {m('f(x)='+tex(fn))}. The table gives points for a sketch.")+samples,
        part(f"Read the set of x-coordinates where the graph meets {m('y='+tex(d))}.","Set of crossings",boundaries,"A horizontal level meets the cubic at inputs giving the same output as the level.","The three table entries at the required level are the three crossings.",shown,kind="set"),
        part(f"Make a sketch showing the crossings and use it to solve {relation}.","Complete solution set",ans,"Use the crossings as the boundaries of regions. Compare the graph with the horizontal line within each region.",detail,ans_m,kind="set",
            written=dict(prompt=f"Sketch the curve and the horizontal line. Use the sketch to solve {relation}.",answer=ans_m+". "+detail,marks=(("M1","Draw the level and locate the three correct crossings."),("A1",ans_m)))))


def substitution(i,mode):
    a=2+i%4
    b=1+i//4
    u=sy.Symbol('u')
    if mode in (0,1):
        factor=(u-a)*(u+b)
        eq=sy.expand(factor)
        if mode==0:
            expr=tex(eq).replace("u^{2}","x").replace("u",r"\sqrt{x}")
            declared="for non-negative x"
            expression=m(r"u=\sqrt{x}")
            vset, vshow=roots([a*a])
            notes=f"{m(-b)} cannot be a square root. Square {m(a)} to recover the input."
        else:
            expr=tex(eq).replace("u^{2}",r"x^{\frac23}").replace("u",r"\sqrt[3]{x}")
            declared="for real x"
            expression=m(r"u=\sqrt[3]{x}")
            vset,vshow=roots([a**3,-b**3])
            notes=f"A real cube root can be negative. Cube {m(a)} and {m(-b)} to get both original inputs."
        opts={"A":m('u=x'),"B":expression,"C":m('u=x^2')}
        answer="B"
        terminal=part("Solve the original equation, giving the complete set of real solutions.","Complete solution set",vset,"Back-substitute each valid value into the original unknown.",notes,vshow,kind="set")
    elif mode==2:
        factor=(u-a)*(u+b)
        eq=sy.expand(factor)
        expr=tex(eq).replace("u^{2}",r"e^{2x}").replace("u",r"e^x")
        declared="for real x"
        expression=m('u=e^x')
        opts={"A":m('u=e^{2x}'),"B":m('u=x^2'),"C":expression}
        answer="C"
        result=m(r"x=\ln "+str(a))
        terminal=choice("Which is the complete solution?",{"A":m(f"x={a}"),"B":result,"C":"No real solutions"},"B",
            "Only a positive substituted value can equal an exponential.",f"Keep {m(f'e^x={a}')} and take natural logarithms.",
            written=dict(prompt="Solve the original equation exactly.",answer=result,marks=(("M1","Reject the negative value of the exponential and invert the positive one."),("A1",result))))
    else:
        factor=(u-a)*(u+b)
        eq=sy.expand(factor)
        code=r"\ln("+str(a)+"x)"
        expr=tex(eq).replace("u^{2}","("+code+r")^2").replace("u",code)
        declared="for positive x"
        expression=m('u='+code)
        opts={"A":expression,"B":m('u='+str(a)+'x'),"C":m('u=e^x')}
        answer="A"
        result=m(r"x=\frac{e^{"+str(a)+r"}}{"+str(a)+r"}\quad\text{or}\quad x=\frac{e^{"+str(-b)+r"}}{"+str(a)+"}")
        terminal=choice("Which is the complete solution?",{"A":result,"B":m(r"x=\frac{e^{"+str(a)+r"}}{"+str(a)+"}"),"C":"No real solutions"},"A",
            "A logarithm can be positive or negative even though its input is positive.","Exponentiate both accepted values and divide each result by the multiplier of x.",
            written=dict(prompt="Find both exact solutions of the original equation.",answer=result,marks=(("M1","Exponentiate both substituted values and divide by the multiplier of x."),("A1",result))))
    intercepts,display=roots([-b,a])
    return case("Identify and reverse a quadratic substitution",p(f"Consider the equation {m(expr+'=0')} {declared}."),
        choice("Which substitution turns it into a quadratic?",opts,answer,"Identify a repeated expression and its square.",f"Using {expression} gives {m(tex(eq)+'=0')}.",
             written=dict(prompt="State a suitable substitution and form the resulting equation.",answer=f"Use {expression}. The new equation is {m(tex(eq)+'=0')}.",marks=(("M1",f"Choose {expression}."),("A1",m(tex(eq)+'=0'))))),
        part("Solve for the substituted variable before considering restrictions.","Set of substituted roots",intercepts,"Factor the quadratic and solve both factors.",f"Use {m(tex(factor)+'=0')}.",display,kind="set"),terminal)


def figures():
    blue,green="#245794","#16795c"
    return {
      "linear":graph(S,"modulus-and-line","A horizontal level crosses both sides of an absolute-value graph.",(-4,6,-2,8),[(lambda u:abs(u-1),-4,6,blue),(lambda u:3,-4,6,green)],[(-2,3,"A"),(4,3,"B")]),
      "ineq":graph(S,"absolute-inequality-regions","Both ends of a V lie above the level. The central part is below it.",(-5,6,-2,8),[(lambda u:2*abs(u),-5,6,blue)], [(-2,4,"A"),(2,4,"B")],[(-5,4,6,4)]),
      "quadratic":graph(S,"modulus-two-levels","A parabola meets two signed levels at four inputs.",(-5,5,-7,11),[(lambda u:u*u-5,-5,5,blue)], [(-3,4,"A"),(-1,-4,"B"),(1,-4,"C"),(3,4,"D")],[(-5,4,5,4),(-5,-4,5,-4)]),
      "cubic":graph(S,"cubic-and-reflection","A cubic and its modulus agree on positive arcs. Negative arcs are reflected.",(-5,5,-10,12),[(lambda u:u*(u-3)*(u+2),-5,5,blue),(lambda u:abs(u*(u-3)*(u+2)),-5,5,green)],[(-2,0,"A"),(0,0,"O"),(3,0,"B")]),
      "level":graph(S,"cubic-crossings","A horizontal line meets a cubic three times.",(-10,9,-150,150),[(lambda u:u**3-49*u,-10,9,blue)],[(-8,-120,"A"),(3,-120,"B"),(5,-120,"C")],[(-10,-120,9,-120)]),
    }


def build():
    pics=figures()
    terms=[("Modulus","The non-negative distance of a value from zero."),("Boundary","A value where the equality or comparison changes."),("Substitution","Using a new variable for a recurring expression."),("Crossing","A point where two graphs have the same coordinates.")]
    def wrapper(fn,mode):return lambda i:fn(i,mode)
    def sec(key,title,intro,idea,mistake,fn,mode,index,fig=None):return section(key,title,intro,idea,mistake,wrapper(fn,mode),index,pics.get(fig))
    def l(key,title,desc,body,counts):return lesson(key,title,desc,body,terms,[(wrapper(fn,mode),count) for fn,mode,count in counts])
    lib=[
      l("linear-modulus-equations","Linear modulus equations","Split a modulus into its signed cases and keep precisely the admissible roots.",[
          sec("constant-level","What does a constant modulus level mean?","A number at a fixed distance from zero can sit on either side of zero.",f"For positive {m('c')}, {m('|A|=c')} means {m('A=c')} or {m('A=-c')}.","Check both signs. The level itself remains non-negative.",linear_equation,0,1,"linear"),
          sec("varying-level","Why can a candidate fail when the right side varies?","The right-hand expression must itself be non-negative at an answer. Solve the two signed equations, then substitute back.","A candidate with a negative value on the right of the original equation is inadmissible.","Solving both branches is only the first step.",linear_equation,2,1),
          sec("both-moduli","How do I compare two moduli?","Two inputs have equal magnitudes when they are equal or when they are negatives of one another.",f"{m('|A|=|B|')} gives {m('A=B')} or {m('A=-B')}.","Write both signed equations before solving.",linear_equation,3,1),
      ],[(linear_equation,0,3),(linear_equation,1,3),(linear_equation,2,4),(linear_equation,3,4)]),
      l("linear-modulus-inequalities","Linear modulus inequalities","Use equality to mark boundaries and compare whole regions with the correct endpoints.",[
          sec("scale-level","How does a positive multiplier affect the level?","Divide by the positive multiplier first. Compare the distance from the corner with the new level.","A small enough absolute value gives a central interval. A larger one gives two outer intervals.","Check the inequality sign and whether the boundary is included.",linear_inequality,0,1,"ineq"),
          sec("compare-line","What if the level depends on x?","First find the crossings. Use the picture to determine which line or ray is higher in each region.","Where the right side is negative, the non-negative modulus cannot lie below it.","Retain only regions that satisfy the original comparison.",linear_inequality,2,1),
          sec("both-sides","Can I square a comparison with two moduli?","Both sides are non-negative. Squaring preserves their order and gives an ordinary quadratic comparison.","The crossings come from equating the signed expressions either way.","Squaring a comparison with a potentially negative side needs a separate sign check.",linear_inequality,3,1),
      ],[(linear_inequality,0,3),(linear_inequality,1,3),(linear_inequality,2,3),(linear_inequality,3,4)]),
      l("quadratic-modulus","Quadratic modulus equations and inequalities","Use two signed levels to recover every equality and inequality region.",[
          sec("two-levels","Why do two horizontal levels appear?","The original output can be either of the two signed values at a given positive distance from zero.","Solve two ordinary quadratics for a positive modulus level.","A modulus of a quadratic can have four different roots at one level.",quadratic_modulus,0,0,"quadratic"),
          sec("between-levels","Which values stay within the band?","Mark the region between the positive and negative levels. Read the horizontal inputs where the graph runs through it.","Meeting the band boundary is allowed when the comparison includes equality.","The central interval can be outside the band if the graph drops below the negative level.",quadratic_modulus,0,1),
          sec("outside-levels","Which values lie outside that band?","Check both tails beyond the top level and the middle portion below the bottom level.","A strict inequality excludes each point where the original modulus equals the level.","List all disjoint intervals explicitly.",quadratic_modulus,1,1),
      ],[(quadratic_modulus,0,6),(quadratic_modulus,1,6)]),
      l("cubic-sketches","Sketching a factored cubic and its modulus","Use roots, the vertical intercept and sign changes to sketch both curves.",[
          sec("intercepts","How can I label all the intercepts?","Set each linear factor equal to zero for x-intercepts. Put zero into every factor for the y-intercept.","Three distinct real factors give three distinct intercepts on the horizontal axis.","Read the zero of a factor rather than its visible constant.",cubic_graph,0,0,"cubic"),
          sec("end-behaviour","What tells me where the ends go?","Compare the leading term at large negative and positive inputs. A cubic with positive leading coefficient rises to the right.","At a simple root the sign changes.","Check all three signs from the factors before drawing.",cubic_graph,0,1),
          sec("reflection","Which arcs change when I take the modulus?","Look at the parts below the horizontal axis. Copy those above the axis at the same distances.","The x-intercepts stay at their original locations. The remaining graph lies on or above the axis.","A modulus of the output does not reflect the curve across the vertical axis.",cubic_graph,1,2),
      ],[(cubic_graph,0,6),(cubic_graph,1,6)]),
      l("cubic-inequalities","Cubic inequalities from a graph","Find crossings at a nonzero level and read every required interval.",[
          sec("mark-crossings","Where are the boundaries at a nonzero level?","Draw a horizontal line at the stated output. Read the inputs where this line crosses the curve.","The boundary points solve the equality with the given level, which need not intercept either axis.","Use crossings with the level rather than the zeros of the polynomial.",cubic_level,0,0,"level"),
          sec("read-above","How do I read the parts above the level?","Trace the curve between successive crossings. Mark precisely the stretches where it is above the line.","A non-strict inequality includes the inputs at equality.","A disjoint solution needs every qualifying interval.",cubic_level,0,1),
          sec("read-below","How do I read the parts below the level?","Compare each region's graph with the level. If the leading coefficient is negative the outer directions reverse.","Exclude crossings when the inequality is strict.","Do not interchange the roles of the x-axis and the horizontal level.",cubic_level,2,1),
      ],[(cubic_level,0,3),(cubic_level,1,3),(cubic_level,2,3)]),
      l("quadratic-substitution","Equations that become quadratic after substitution","Identify a square and its underlying expression. Restore the original variable and check restrictions.",[
          sec("roots-as-variables","Which square root or cube root should become the new variable?","Look for terms that are powers of the same expression. Introduce one symbol for that expression.","A square root gives a non-negative value, while a real cube root can be negative.","Do not give the substituted roots as answers for the original input.",substitution,0,2),
          sec("exponentials","How do I solve an equation in an exponential?","An exponential term and its square can form a quadratic in the exponential. Solve for that positive quantity first.",f"{m('e^x>0')} for every real x. Reject a negative value proposed for it.","Take the natural logarithm only after identifying the positive value.",substitution,2,0),
          sec("logarithms","How do I return from a substituted logarithm?","A logarithm may be negative even when the expression inside it is positive. Solve the quadratic and reverse the log of each valid result.","Exponentiating gives the value inside the log. Divide or rearrange to recover x.","Check the original logarithm's input before accepting a solution.",substitution,3,1),
      ],[(substitution,0,3),(substitution,1,3),(substitution,2,3),(substitution,3,3)]),
    ]
    export_chapter(S,"Equations, inequalities and graphs",3,lib,[__file__,Path(__file__).with_name("prepare_0606_algebra_support.py")])


if __name__=="__main__":
    build()
