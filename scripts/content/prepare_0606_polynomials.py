"""Generate the 0606 Factors and polynomials chapter."""

from pathlib import Path

from prepare_0606_algebra_support import case, export_chapter, lesson, m, p, part, roots, section, sy, tex, x


S="factors-polynomials"


def algebra(i, mode):
    a=1+i%4
    b=2+i//5
    k=i%7-3
    left=a*x**2-b*x+k
    right=(a-1)*x**2+(b+2)*x+2-i%6 if mode!=2 else x-b
    sign=("+","-",r"\times")[mode]
    result=sy.expand((left+right,left-right,left*right)[mode])
    A=sy.Poly(result,x).coeff_monomial(x**2)
    yval=result.subs(x,2)
    operation=f"({tex(left)}){sign}({tex(right)})"
    method=("Group terms with the same power of x.","Distribute the minus sign to every term in the second bracket.","Multiply every term in the first bracket by each term in the second bracket.")[mode]
    return case("Combine polynomial terms accurately",p(f"Let {m('F(x)='+operation)}."),
        part("Expand and simplify the expression.","Simplified polynomial",result,method,"Write the result from the highest power down to the constant.",kind="polynomial",variables=["x"],
            written=dict(prompt="Give the polynomial in expanded and collected form.",answer=m(result),marks=(("M1",method),("A1",m(result))))),
        part(f"State the coefficient of {m('x^2')}.","Coefficient",A,"Use the coefficients after collecting like powers.",f"The squared term is {m(A*x**2)}." if A else "There is no squared term, so its coefficient is zero."),
        part(f"Find {m('F(2)')}.","Value",yval,"Use the expanded polynomial or substitute in the original expression.","Take particular care with signs outside brackets."))


def division(i,mode):
    a=1 if mode==0 else 2+i%4
    b=1+i//5
    r=i%9-4
    q=(2+i%4)*x**2+(i%5-2)*x+b
    divisor=a*x-b
    expr=sy.expand(divisor*q+r)
    Q,R=sy.div(expr,divisor,x)
    at=sy.Rational(b,a)
    assert sy.expand(Q-q)==0 and R==r and expr.subs(x,at)==r
    return case("Divide a cubic by a linear polynomial",p(f"The polynomial {m('P(x)='+tex(expr))} is divided by {m(divisor)}."),
        part("Find the first term of the quotient.","Leading coefficient of the quotient",sy.Poly(q,x).LC(),"Divide the leading term of the dividend by the leading term of the divisor.",f"The quotient starts with {m(sy.Poly(q,x).LC()*x**2)}.",
            written=dict(prompt="Find the first term of the quotient.",answer=m(sy.Poly(q,x).LC()*x**2),marks=(("B1",m(sy.Poly(q,x).LC()*x**2)),))),
        part("Find the complete quotient.","Quotient polynomial",q,"Subtract the product of the divisor and the first quotient term. Repeat for the remaining leading terms.",f"The identity is {m('P(x)=('+tex(divisor)+')('+tex(q)+')'+(str(r) if r<0 else '+'+str(r) if r else ''))}.",kind="polynomial",variables=["x"]),
        part("State the remainder.","Remainder",r,"The remainder is the constant left when division can go no further.",f"The same result follows by evaluating {m('P('+tex(at)+')')} since the divisor is zero there."))


def theorem(i,mode):
    a=1+i%4
    b=2+i//5
    k=1+i%5
    r=(i%6+1)*(-1 if mode==1 else 1)
    q=a*x*x+k*x-b
    assert r!=0
    raw=sy.Poly(sy.expand((x-r)*q),x)
    coeff=raw.all_coeffs()
    unknown=sy.Symbol('k',real=True)
    location=1 if mode!=2 else 2
    expression=raw.as_expr()+(unknown-coeff[location])*x**(3-location)
    answered=coeff[location]
    content=p(f"The polynomial {m('P(x)='+tex(sy.expand(expression)))} has {m(x-r)} as a factor.")
    assert sy.expand(expression.subs(unknown,answered)-raw.as_expr())==0
    assert sy.solve(expression.subs(x,r),unknown)==[answered]
    x0=1-r
    P=raw.as_expr()
    return case("Use a known factor to determine an unknown coefficient",content,
        part(f"Find {m('k')}.","Coefficient k",answered,"If a linear expression is a factor, the polynomial is zero at the root of that expression.",f"Use {m('P('+str(r)+')=0')}. This gives {m(tex(expression.subs(x,r))+'=0')}.") ,
        part(f"After finding {m('k')}, determine the quotient of {m('P(x)')} by {m(x-r)}.","Quotient",q,"Divide the complete polynomial by the stated linear factor.",f"Multiplying {m(x-r)} by the quotient must reproduce the cubic exactly.",kind="polynomial",variables=["x"]),
        part(f"Find the remainder when the completed polynomial is divided by {m(x-x0)}.","Remainder",P.subs(x,x0),"Substitute the value which makes the new divisor zero.",f"Evaluate {m('P('+str(x0)+')')} using the coefficient already found."))


def cubic(i,mode):
    r=-1-i%5
    s=2+i//5
    a=1+i%3
    if mode==0:
        t=s+2+i%4
        factors=a*(x-r)*(x-s)*(x-t)
        solution=[r,s,t]
    elif mode==1:
        factors=a*(x-r)*(x-s)**2
        solution=[r,s]
    else:
        b=(2,3,5,6)[i%4]
        factors=a*(x-r)*((x-s)**2-b)
        solution=[r,s-sy.sqrt(b),s+sy.sqrt(b)]
    exp=sy.expand(factors)
    q,rn=sy.div(exp,x-r,x)
    assert rn==0 and all(sy.simplify(exp.subs(x,u))==0 for u in solution)
    values,display=roots(solution)
    incomplete,_=roots(solution[:-1])
    return case("Reduce a cubic to a linear factor and a quadratic",p(f"The cubic is {m('P(x)='+tex(exp))}. It has a root at {m(r)}."),
        part("State the remainder on division by the linear factor corresponding to this root.","Remainder",0,"Apply the factor theorem at the given root.",f"The root is {m(r)}, so {m(x-r)} leaves no remainder."),
        part("Find the quadratic quotient after dividing out the stated linear factor.","Quotient",q,"Divide the cubic by the linear expression associated with the known root.",f"Use divisor {m(x-r)} and verify the quotient by multiplication.",kind="polynomial",variables=["x"]),
        part(f"Solve {m('P(x)=0')} over the reals. Give distinct roots exactly.","Complete set of roots",values,"Use the known root and solve the remaining quadratic.",f"The quadratic factor is {m(q)}. " + ("A repeated root is listed once." if mode==1 else "Include all real roots from this factor.") ,display,kind="set",retry=(incomplete,"Check both the known factor and all roots of the quadratic quotient.")))


def remainder(i,mode):
    r=-2-i%7
    s=1+i//4
    w=i%5-2
    a=1+i%3
    u=1+i%6
    v=2+i//4
    known=sy.expand((a*x+w)*(x-r)*(x-s))
    poly=known+u*x+v
    R=poly.subs(x,r); S_=poly.subs(x,s)
    # The two constraints determine the missing coefficients independently.
    tk,tm=sy.symbols("k m",real=True)
    statement=tex(known+tk*x+tm)
    assert sy.solve([r*tk+tm-R,s*tk+tm-S_],[tk,tm])=={tk:u,tm:v}
    if mode==0:
        divisor1=x-r;divisor2=x-s
    else:
        divisor1=2*(x-r);divisor2=3*(x-s)
    z=r-1
    return case("Use two remainders to determine two coefficients",p(f"Let {m('P(x)='+statement)}. The remainders on division by {m(divisor1)} and {m(divisor2)} are {m(R)} and {m(S_)} respectively."),
        part(f"Find {m('k')}.","Coefficient k",u,"Apply the remainder theorem to both divisors and subtract the two equations.",f"Use {m(f'{r}k+m={R}')} and {m(f'{s}k+m={S_}')}.") ,
        part(f"Find {m('m')}.","Coefficient m",v,"Substitute k into either of the remainder equations.",f"Use the equation at {m(r)} with {m(f'k={u}')}.") ,
        part(f"Find the remainder when {m('P(x)')} is divided by {m(x-z)}.","New remainder",poly.subs(x,z),"Use the completed coefficients and evaluate the polynomial where the new divisor is zero.",f"Evaluate {m('P('+str(z)+')')}.") )


def build():
    glossary=[("Dividend","The polynomial being divided."),("Quotient","The polynomial result of division before adding the remainder."),("Factor","A divisor whose remainder is zero."),("Coefficient","The signed multiplier of a power of the variable.")]
    def make(fn,mode):return lambda seed:fn(seed,mode)
    def sec(key,title,intro,idea,mistake,fn,mode,focus):return section(key,title,intro,idea,mistake,make(fn,mode),focus)
    def l(key,title,desc,body,counts):return lesson(key,title,desc,body,glossary,[(make(fn,mode),n) for fn,mode,n in counts])
    lessons=[
        l("operations","Combining polynomial expressions","Expand products and collect signed coefficients by their corresponding powers.",[
            sec("collect","Which terms do I combine?","Group terms with matching powers. The coefficient of a missing power is zero.","Add only coefficients of the same power.","For subtraction, change every sign inside the second bracket.",algebra,0,0),
            sec("subtract","How do I subtract a polynomial?","Regard a subtraction as multiplication of the second bracket by negative one.","After distributing the minus sign, collect like powers.","Changing the first sign alone is insufficient.",algebra,1,0),
            sec("multiply","How do I keep track of a product?","Make a list of products before adding the terms. A small multiplication grid can help.","Multiply each term of one bracket by every term of the other.","When multiplying powers of x, add their exponents.",algebra,2,1),
        ],[(algebra,0,5),(algebra,1,5),(algebra,2,5)]),
        l("long-division","Polynomial long division","Use a leading-term division, multiplication and subtraction to find a quotient and remainder.",[
            sec("leading-term","Where does the first quotient term come from?","Compare the highest powers in the dividend and divisor. Divide their terms including their coefficients.","In each step divide, multiply, subtract and repeat.","A non-monic divisor also changes the quotient coefficient.",division,1,0),
            sec("complete","How do I finish the quotient?","Line up terms of the same degree. Keep a zero place for a missing term so terms remain aligned.","Continue until the leftover polynomial has smaller degree than the divisor.","Subtract the whole product at every step.",division,0,1),
            sec("check","How can I check the division?","Multiply the divisor and quotient. Add the remainder to reconstruct the dividend.",f"{m('P(x)=D(x)Q(x)+R')} when the divisor is linear.","A remainder can be a negative number.",division,1,2),
        ],[(division,0,4),(division,1,4)]),
        l("known-factors","The factor theorem and unknown coefficients","Translate a known factor into a substitution equation, then factor further.",[
            sec("use-zero","Which input should I substitute?","Set the stated linear factor equal to zero to find the correct input.",f"{m('x-a')} is a factor if and only if {m('P(a)=0')}.","Use the root of the factor, rather than the constant as it appears in the factor.",theorem,1,0),
            sec("extract","How do I find the remaining factor?","After identifying the parameter, divide by the known factor. Multiply back as a check.","A cubic divided by one of its linear factors has a quadratic quotient.","Use the completed coefficients before dividing.",theorem,2,1),
            sec("cross-check","Does a new divisor always leave zero?","Only factors have zero remainder. Substitute the root of the new divisor before deciding.","A non-zero remainder proves that the new divisor is not a factor.","Do not reuse the zero from a different divisor.",theorem,0,2),
        ],[(theorem,0,6),(theorem,1,6),(theorem,2,6)]),
        l("cubic-roots","Factorising and solving cubic equations","Divide out the known linear factor and solve the entire quadratic factor.",[
            sec("reduce","How does one root help solve the cubic?","Use the root to write down the corresponding linear factor, then divide the cubic.","An exact factor divides out without a remainder.","A root and its corresponding factor use opposite signs in the linear expression.",cubic,0,1),
            sec("repeat","What if the quotient has a repeated root?","Solve the quadratic part and add the root from the linear factor. List distinct values once.","Multiplicity describes how often a factor occurs, rather than how many distinct values it produces.","Do not leave out the root that was supplied in the question.",cubic,1,2),
            sec("radicals","How do I keep irrational roots exact?","Use the quadratic formula or complete the square for the remaining factor.","Include both square-root signs if they give distinct real values.","A completed square may reveal two real solutions even when factorisation over integers fails.",cubic,2,2),
        ],[(cubic,0,6),(cubic,1,5),(cubic,2,5)]),
        l("remainders","The remainder theorem","Use evaluated remainders and two independent equations to recover coefficients.",[
            sec("evaluate","Why does substitution give a remainder?","At the root of the divisor its product with the quotient is zero. The remainder is the only term left.",f"The remainder for division by {m('ax+b')} is {m('P(-b/a)')}.","The input is the zero of the divisor, even if its leading coefficient is not one.",remainder,1,0),
            sec("eliminate","How can two remainders identify two constants?","Write one equation for each substitution. Subtract the equations to eliminate a common term.","Different divisor roots provide independent information about the unknowns.","Set the polynomial equal to the stated remainder, rather than to zero by default.",remainder,0,1),
            sec("new-divisor","How do I predict another remainder?","Use the recovered coefficients in the original polynomial and substitute at the new divisor root.","The same theorem works for each new linear divisor.","Keep the recovered constants fixed for the last part.",remainder,1,2),
        ],[(remainder,0,8),(remainder,1,8)]),
    ]
    export_chapter(S,"Factors and polynomials",2,lessons,[__file__,Path(__file__).with_name("prepare_0606_algebra_support.py")])


if __name__=="__main__":
    build()
