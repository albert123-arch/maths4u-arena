"""Author the 0606 straight-line kinematics chapter and its worked bank."""

import sympy as s

from addmaths_calculus import Q, T, Lesson, Scenario, answer, build, eq, explain, field, m, math, plot, rng, table, tex


V_UNIT = r"\mathrm{m\,s^{-1}}"
A_UNIT = r"\mathrm{m\,s^{-2}}"
S_UNIT = r"\mathrm{s}"
M_UNIT = r"\mathrm{m}"


def quantity(value, unit):
    return m(tex(value) + r"\," + unit)


def span(left, right):
    return m(tex(left) + r"\le t\le " + tex(right))


def coeff_answer(func, label, ask, step, method):
    polynomial = s.expand(func)
    return answer(ask, polynomial, step, eq(label, polynomial), method=method,
                  grader=field(label, f"Expression for {label}", polynomial, "polynomial", ("t",)))


def numeric(ask,value,unit,*working,method,name="answer"):
    return answer(ask,value,*working,method=method,
                  grader=field(name,"Numerical value",value),displayed=quantity(value,unit))


def motion_functions(seed,style):
    random=rng(seed)
    k=random.randrange(1,13)
    r=random.randrange(1,8)
    q=r+random.randrange(2,8)
    start=random.randrange(-12,13)
    end=q+random.randrange(1,6)
    if style==0:
        v=k*(T-r)
    elif style==1:
        v=k*(T-r)*(T-q)
    else:
        v=k*(r-T)
    primitive=s.integrate(s.expand(v),T)
    displacement=s.expand(primitive+start)
    a=s.diff(v,T)
    zeroes=[r,q] if style==1 else [r]
    assert s.expand(s.diff(displacement,T)-v)==0
    assert s.expand(s.diff(displacement,T,2)-a)==0
    assert sorted(s.solve(v,T))==zeroes
    assert displacement.subs(T,0)==start
    return random,v,a,displacement,start,end,zeroes


def at_rest(v,zeroes):
    shown=m(r"t="+r"\text{ or }t=".join(map(tex,zeroes)))
    grading=(field("times","All times in seconds",", ".join(map(str,zeroes)),"set",("t",))
             if len(zeroes)>1 else field("time","Time in seconds",zeroes[0]))
    return answer("Find all the times at which the particle is at rest.",None,
                  f"Set the signed velocity {math(v)} equal to zero. Give all roots in the stated time interval.",
                  method="Find every root of the velocity equation in the stated time interval.",
                  displayed=shown,grader=grading)


def differentiation(seed,style):
    random,v,a,d,initial,end,zeroes=motion_functions(seed,style)
    if style==2:
        # In this version a negative acceleration acts after the initial push.
        at=zeroes[0]+random.randrange(1,4)
        end=max(end,at)
        dpart=coeff_answer(v,"v","Find the velocity v in terms of t.",
              "Differentiate the displacement expression once with respect to time.","Differentiate displacement to obtain signed velocity.")
        ap=numeric(f"Find the acceleration at {m('t='+str(at))} and include its sign.",a.subs(T,at),A_UNIT,
              f"Differentiate velocity to obtain {eq('a',a)}. The acceleration is constant for this model.",
              method="Differentiate velocity to find acceleration.")
        vnow=v.subs(T,at)
        assert vnow<0
        direction=explain(f"State the particle's direction of motion at {m('t='+str(at))} and explain your answer.",
            "The negative direction along the line.",f"The signed velocity is {quantity(vnow,V_UNIT)}. Its sign gives the direction.",
            marks=(("B1",f"Give the negative direction and use the sign of {math(vnow)} to justify it."),))
        return Scenario("Read direction from a displacement model",f"A trolley moves on a straight horizontal rail. Its displacement from the marker is {eq('s',d)}, in metres, for {span(0,end)}, where t is measured in seconds. Take right as positive.",
            (dpart,ap,direction),"Use the rate of change of displacement to determine motion. Then compare the signed velocity and acceleration.",
            "Direction comes from the sign of velocity. A negative displacement gives a position relative to the origin.")
    vpart=coeff_answer(v,"v","Find the velocity v in terms of t.","Differentiate each term of the position formula. A constant term has derivative zero.","Apply the power rule to the displacement.")
    at=zeroes[0]+1
    ap=numeric(f"Find the acceleration at {m('t='+str(at))}.",a.subs(T,at),A_UNIT,
        f"Differentiate velocity to get {eq('a',a)}, then substitute the time.",method="Find the derivative of the velocity and evaluate it.")
    depart="A battery-powered inspection device moves along a straight track. Its position in metres, measured from a fixed reference, is" if style else "A toy train on a straight track has displacement"
    return Scenario("Find motion from a position function",f"{depart} {eq('s',d)} for {span(0,end)}, where t is measured in seconds.",
        (vpart,at_rest(v,zeroes),ap),"Take the derivatives in order. The particle is at rest where the first derivative is zero.",
        "Differentiate displacement once for velocity and twice for acceleration. Keep signs throughout.")


def integrate(seed,style):
    random,v,a,d,initial,end,zeroes=motion_functions(seed,style)
    offset=random.randrange(-11,12)
    v=s.expand(v+offset)
    a=s.diff(v,T)
    d=s.expand(d+offset*T)
    when=zeroes[0]+1
    end=max(end,when+2)
    initial_velocity=v.subs(T,0)
    recovery=coeff_answer(v,"v","Find an expression for the velocity v at time t.",
        f"An antiderivative of the acceleration is {math(s.integrate(a,T))}. Use {eq('v(0)',initial_velocity)} to fix the constant.",
        "Integrate acceleration and use the given initial velocity.")
    position=coeff_answer(d,"s","Find an expression for the displacement s from the origin at time t.",
        f"Integrate {math(v)} to obtain the variable part. At time zero the displacement is {quantity(initial,M_UNIT)}.",
        "Integrate velocity and use the given initial displacement.")
    assert s.expand(s.diff(v,T)-a)==0 and s.expand(s.diff(d,T)-v)==0 and d.subs(T,0)==initial
    delta=s.expand(d.subs(T,end)-d.subs(T,when))
    assert s.integrate(v,(T,when,end))==delta
    relative=numeric(f"Find the displacement during the interval from {quantity(when,S_UNIT)} to {quantity(end,S_UNIT)}.",delta,M_UNIT,
        f"Use final position {quantity(d.subs(T,end),M_UNIT)} minus the position {quantity(d.subs(T,when),M_UNIT)} at the start of the interval.",
        method="Subtract the two positions or use the definite integral of velocity.")
    if style==0:
        where=numeric(f"Find the displacement from the origin when {m('t='+str(when))}.",d.subs(T,when),M_UNIT,
             f"Evaluate {eq('s',d)} at {quantity(when,S_UNIT)}. It is measured from the origin.",method="Evaluate the displacement function at the specified time.")
        scenario=f"A small robot moves on a straight line. For {span(0,end)} it has constant acceleration {quantity(a,A_UNIT)}. It starts at displacement {quantity(initial,M_UNIT)} with velocity {quantity(initial_velocity,V_UNIT)}."
        parts=(recovery,position,where)
    elif style==1:
        scenario=f"A motor drives a carriage in a straight line. Its acceleration is {eq('a',a)} in metres per second squared for {span(0,end)}. At time zero its velocity is {quantity(initial_velocity,V_UNIT)} and its displacement is {quantity(initial,M_UNIT)}."
        parts=(recovery,position,relative)
    else:
        scenario=f"An automated gate moves in a straight line with velocity {eq('v',v)} in metres per second for {span(0,end)}. At time zero the gate is {quantity(abs(initial),M_UNIT)} {'behind' if initial<0 else 'ahead of' if initial>0 else 'from'} its reference marker. The positive direction is forwards."
        parts=(position,relative,numeric("Find its signed acceleration.",a,A_UNIT,
            f"The coefficient of t in {math(v)} is constant. This is the velocity gradient.",method="Differentiate velocity."))
    return Scenario("Recover initial conditions in a motion model",scenario,parts,
         "Integrate in the order indicated by the information. Use the initial data after each integration.",
         "Velocity and displacement can require different constants. The position at one time and a change of position are distinct quantities.")


def signed_pieces(v,disp,l,u):
    times=[l,*(r for r in sorted(s.solve(v,T)) if l<r<u),u]
    results=[disp.subs(T,b)-disp.subs(T,a) for a,b in zip(times,times[1:])]
    assert all(s.integrate(v,(T,a,b))==value and v.subs(T,Q(a+b,2))*value>0
               for a,b,value in zip(times,times[1:],results))
    return times,results


def distance(seed,style):
    random,v,a,d,initial,end,zeroes=motion_functions(seed,style)
    if style==2:
        v*=T+random.randrange(1,8)
        d=s.integrate(s.expand(v),T)+initial
        assert s.expand(s.diff(d,T)-v)==0
    start=random.randrange(0,zeroes[0])
    times,results=signed_pieces(v,d,start,end)
    total=sum(abs(term) for term in results)
    change=sum(results)
    assert total>abs(change) and change==d.subs(T,end)-d.subs(T,start)
    cpart=numeric(f"Find the displacement during {span(start,end)}.",change,M_UNIT,
        f"Evaluate the definite integral of velocity from {quantity(start,S_UNIT)} to {quantity(end,S_UNIT)}. Keep the signs of the contributions.",
        method="Integrate signed velocity through the entire interval.")
    subtotal="; ".join(f"from {quantity(a,S_UNIT)} to {quantity(b,S_UNIT)}, {quantity(term,M_UNIT)}" for a,b,term in zip(times,times[1:],results))
    tpart=numeric(f"Find the total distance travelled during {span(start,end)}.",total,M_UNIT,
         "Split the time interval at every point where the direction changes.",f"The signed displacements are {subtotal}.",
         "Add the sizes of these displacements to find the total distance travelled.",
         method="Calculate and sum the absolute displacements on the intervals of fixed direction.")
    if style==1:
        stem=f"A sensor travels backwards and forwards along a straight beam. Its velocity in metres per second is {eq('v',v)} for {span(0,end)}."
    elif style==2:
        stem=f"A model lift has velocity {eq('v',s.factor(v))} in metres per second for {span(0,end)}. Downwards is the positive direction."
    else:
        stem=f"A rail shuttle has velocity {eq('v',v)} in metres per second for {span(0,end)}."
    return Scenario("Separate total distance and signed displacement",stem,(at_rest(v,zeroes),cpart,tpart),
       "Find every change of direction first. Integrate separately between those times.",
       "Displacements with opposite signs may cancel. Add the sizes of the separate contributions to get distance.")


def graph(seed,style):
    random,v,a,d,initial,end,zeroes=motion_functions(seed,style)
    times,results=signed_pieces(v,d,0,end)
    end_disp=d.subs(T,end)
    end_velocity=v.subs(T,end)
    end_length=sum(abs(z) for z in results)
    beginning=quantity(v.subs(T,0),V_UNIT)
    ending=quantity(end_velocity,V_UNIT)
    zero_labels=" and ".join(quantity(z,S_UNIT) for z in zeroes)
    behaviour="rising, then falling, then rising" if style==1 else "falling, then rising" if style==0 else "rising, then falling"
    vgraph=explain("Sketch the velocity–time graph. Label both end values and every zero of velocity.",
        f"Velocity starts at {beginning}, crosses its axis at {zero_labels}, and ends at {ending}.",
        f"Set {eq('v',v)} equal to zero to locate the intercepts. {'The graph is an upward-opening parabola.' if style==1 else 'The graph is a straight line.'}",
        marks=(("M1","Calculate initial and final velocities and find the zeros of the velocity."),
              ("A1",f"Draw the correct shape passing through the labelled end values and through zero at {zero_labels}.")))
    if style==0:
        middle=numeric("Find the net displacement using the areas above and below the time axis.",end_disp-initial,M_UNIT,
            f"The sections give signed triangular areas {quantity(results[0],M_UNIT)} and {quantity(results[1],M_UNIT)}. Add these signed terms.",
            method="Find both signed triangular areas and add them.")
        last=explain("Sketch the speed–time graph over this interval.",
            f"Two line segments meet at zero speed at {zero_labels}. The initial and final speeds are {quantity(abs(v.subs(T,0)),V_UNIT)} and {quantity(abs(end_velocity),V_UNIT)}.",
            "Reflect the negative part of the velocity graph about the time axis. Keep the positive part as drawn.",
            marks=(("M1","Use the magnitudes of the velocities at the given times."),("A1","Draw the two straight branches above the time axis with the common zero correctly located.")))
    elif style==1:
        middle=explain("Describe the displacement–time graph on each interval of motion. Give the displacement at both stationary points.",
           f"The graph is {behaviour}. The two stationary displacements are {quantity(d.subs(T,zeroes[0]),M_UNIT)} and {quantity(d.subs(T,zeroes[1]),M_UNIT)}, in time order.",
           f"The velocity is the gradient of the displacement graph. Integrating and applying the initial position gives {eq('s',d)}.",
           marks=(("M1","Use the sign of the velocity on every interval."),("A1",f"Give the correct order {behaviour}."),
                  ("A1",f"Give both stationary displacement values in time order.")))
        last=explain("Sketch the acceleration–time graph and label the time at which the acceleration is zero.",
           f"The acceleration is {math(a)} and crosses zero at {quantity(Q(sum(zeroes),2),S_UNIT)}.",
           "Differentiate the velocity to get a linear function. Label its zero and use the sign of its slope.",
           marks=(("M1","Differentiate velocity and find the zero of acceleration."),
                  ("A1",f"Draw an increasing straight line with zero at {quantity(Q(sum(zeroes),2),S_UNIT)}.")))
    else:
        middle=numeric("Find the distance travelled over the whole interval.",end_length,M_UNIT,
             f"The velocity graph gives signed triangular areas {quantity(results[0],M_UNIT)} and {quantity(results[1],M_UNIT)}. Add their magnitudes.",
             method="Use both areas and take their magnitudes before adding.")
        last=explain("Sketch the graph of accumulated distance against time. Label the distances when the particle first comes to rest and at the end of the interval.",
             f"The graph increases to {quantity(abs(results[0]),M_UNIT)} at {zero_labels}, with a horizontal tangent there, then continues increasing.",
             "Use the slope of the distance graph to represent the speed. The slope decreases to zero and then increases again.",
             marks=(("M1","Use speed as the gradient and zero initial distance."),
                    ("A1",f"Show increasing branches on both sides of {zero_labels} with the correct distance there."),
                    ("A1",f"Show the horizontal tangent at the change of direction and reach {quantity(end_length,M_UNIT)} at the final time.")))
    value=numeric(f"Calculate the velocity when {m('t='+str(end))}.",end_velocity,V_UNIT,
         f"Substitute the final time into {math(v)}. A graph of velocity keeps the sign.",method="Evaluate the given velocity at the final time.")
    start=f"A parcel on a testing rail has velocity {eq('v',v)} in metres per second over {span(0,end)}. Its initial displacement from the origin is {quantity(initial,M_UNIT)}."
    stem=f"A calibration probe moves along a straight rail with velocity {eq('v',v)} in metres per second over {span(0,end)}. Its initial displacement is {quantity(initial,M_UNIT)}." if style==1 else start
    if style==2:
        parts=(value,vgraph,middle,last)
    else:
        parts=(vgraph,value,middle,last)
    return Scenario("Link scale sketches of the motion",stem,parts,
        "Velocity supplies the signed rate of change of position. Absolute velocity supplies speed.",
        "Reflect a velocity graph to obtain speed only where velocity is negative. The distance graph keeps increasing as long as the particle moves.")


def model_set(model):
    return tuple(lambda seed,style=style:model(seed,style) for style in range(3))


def main():
    key="kinematics"
    blue,green,purple="#2470b6","#16816c","#7a459f"
    pos_fig=plot(key,"displacement-turn","The displacement rises, has a horizontal tangent at 2 seconds, then falls. The origin of displacement is 3 m below its maximum.",
        ((lambda t:3-(t-2)**2,blue),),(0,4),(-1.6,4.1),((0,-1,"−1",7,18),(2,3,"(2, 3)",8,-8),(4,-1,"(4, −1)",-72,16)),xname="t",yname="s")
    vel_fig=plot(key,"signed-velocity-area","Signed area under the velocity line gives displacement. The first triangle contributes negatively and the second positively.",
        ((lambda t:2*t-4,purple),),(0,5),(-4.5,6.4),((0,-4,"−4",9,16),(2,0,"2",7,19),(5,6,"(5, 6)",-72,20)),
        (lambda t:2*t-4,lambda t:0,0,5),xname="t",yname="v")
    travel_fig=plot(key,"distance-always-increases","Accumulated distance keeps increasing. It has a horizontal tangent at 2 seconds, when the particle changes direction.",
        ((lambda t:4*t-t*t if t<=2 else 4+(t-2)**2,green),),(0,5),(-1,14.5),
        ((0,0,"0",7,16),(2,4,"(2, 4)",10,-10),(5,13,"(5, 13)",-82,-9)),xname="t",yname="d")
    graph_fig=plot(key,"velocity-versus-speed","Velocity starts below the axis. Speed reflects this initial segment above the axis. The two graphs coincide after 2 seconds.",
        ((lambda t:2*t-4,blue),(lambda t:abs(2*t-4),green)),(0,5),(-4.8,6.8),
        ((0,4,"Speed",10,-7),(0,-4,"Velocity",10,-7),(2,0,"2",8,19)),xname="t",yname="v")
    lessons=(
        Lesson("kinematic-derivatives","Displacement, velocity and acceleration",
            "Use derivatives to calculate velocity and acceleration, find when a particle stops and explain its motion along a straight line.",model_set(differentiation),(
            ("velocity","How fast is the position changing?",f"A displacement measures position from an origin along the chosen positive direction. Its derivative is the signed velocity {m(r'v=\frac{\mathrm ds}{\mathrm dt}')}.",
             "Start by drawing the origin and the positive direction. Differentiate the formula for displacement term by term. A stationary value of the position has velocity zero. The sign of the displacement alone gives a position.",
             "A negative displacement puts the particle on the negative side of the origin. Its velocity may still be positive."),
            ("at-rest","How do I find the times at rest?",f"Use {m('v=0')} to find a time with no instantaneous motion. Check the permitted time interval and give every valid time.",
             "Write the velocity equation, factor it where possible and solve each factor. To confirm a reversal, check the sign of velocity before and after the instant.",
             "An acceleration of zero means the velocity is momentarily unchanged. The velocity may be positive, negative or zero at that time."),
            ("acceleration","What does acceleration measure?",f"Differentiate again to obtain {m(r'a=\frac{\mathrm dv}{\mathrm dt}=\frac{\mathrm d^2s}{\mathrm dt^2}')}. It measures the change in signed velocity each second.",
             "Find the velocity expression first. Differentiate it to obtain acceleration and evaluate it at the requested time. Retain a negative result as a signed physical quantity. Compare the signs of velocity and acceleration if asked whether speed increases.",
             "When velocity and acceleration are both negative, speed is increasing.")),
            (("Displacement","A signed position measured relative to a fixed origin."),("Velocity","The signed gradient of the displacement–time graph."),("Acceleration","The signed gradient of the velocity–time graph.")),
            f"Use {quantity(1,V_UNIT)} as the unit pattern for velocity and {quantity(1,A_UNIT)} as the pattern for acceleration. Show the derivative before substituting.",19,pos_fig,
            table(("Quantity","Read it from a graph"),(("Displacement","Height on the displacement graph"),("Velocity","Gradient on the displacement graph"),("Acceleration","Gradient on the velocity graph")),"Position and rates")),
        Lesson("kinematic-integration","Use integration to recover motion",
            "Integrate acceleration or velocity, use initial conditions to fix constants and calculate changes of position on a specified interval.",model_set(integrate),(
            ("initial-velocity","How can I recover velocity from acceleration?",f"Integrate acceleration with respect to time. Determine the constant of integration from a known velocity, such as {m('v(0)')}.",
             "Integrate every term of the acceleration and append a constant. Substitute the time and corresponding velocity to determine it. Differentiate your final velocity expression to check that it gives the original acceleration.",
             "An initial velocity can be negative. Keep the sign when substituting the condition."),
            ("initial-position","What fixes the displacement formula?",f"Integrating a known velocity gives an expression for position with its own constant. Use a stated position such as {m('s(0)')} to fix that constant.",
             "First determine the full velocity formula. Integrate that formula, including its constant term. Then substitute the given position and time. If the particle starts at the origin, use zero as its initial position.",
             "The constant in the velocity formula gets multiplied by t when you integrate. There is a new constant for displacement."),
            ("change-in-position","How can I find displacement over one interval?",f"Integrate signed velocity from the earlier time to the later time. By {m(r'\int_a^b v\,\mathrm dt=s(b)-s(a)')}, a fixed origin cancels out.",
             "Check whether the question asks for the position at a time or the change between two times. For a change, evaluate the displacement function at both times and subtract in chronological order. A velocity graph gives the same result after adding its areas with signs.",
             "A question about the displacement from the origin at a given time needs the initial position. The change over an interval does not need it.")),
            (("Initial condition","A velocity or position fact given at the start of a model."),("Motion model","Functions and a time interval that describe a movement."),("Signed area","Area above the time axis is positive and area below it is negative.")),
            "Calculate a definite integral using the later time minus the earlier time. Include the initial value when the task gives a position to recover.",21,vel_fig),
        Lesson("kinematic-distance","Total distance and changes of direction",
            "Find times of reversal and use integral intervals to calculate total distance, signed displacement and speed.",model_set(distance),(
            ("zeroes","Where should I split the time interval?",f"Solve {m('v=0')} within the model's time range. Check where the sign of v actually changes. Each change separates two directions of motion.",
             "Factor the velocity to find its zeros. Mark them on a time line with the interval endpoints. Use a single test time in each part to establish the sign of velocity there.",
             "An endpoint or a repeated root can give zero velocity. Check whether the motion reverses within the interval."),
            ("signed-difference","What does the signed integral measure?",f"The integral {m(r'\int_a^b v\,\mathrm dt')} measures the net change in position. Parts of the journey in opposite directions can cancel.",
             "Copy the lower and upper limits from the question. Integrate velocity across the entire interval, or sum the signed changes for its separate pieces. Use a graph to check the sign.",
             "The net displacement can be zero after a completed out-and-back journey. The particle still has a positive total distance."),
            ("total-travel","How do I calculate total distance?",f"Total distance is the area under the speed graph. Compute {m(r'\int_a^b |v|\,\mathrm dt')} by splitting at changes of direction, then adding the magnitudes of the separate displacements.",
             "Use your turning times to create an integral for each time interval. Evaluate each one with its sign, then take its magnitude and add all of them. Equivalently, subtract the smaller position from the larger on every monotone part of the journey.",
             "Taking the magnitude of the final net displacement still allows cancellation from earlier stages.")),
             (("Total distance","The lengths of all parts of a journey added together."),("Speed","The magnitude of velocity."),("Change of direction","An instant when the sign of velocity changes.")),
             "Show all the direction-change times and the separate distance contributions. Label the final answer in metres.",19,travel_fig),
        Lesson("kinematic-graphs","Read and sketch graphs of motion",
            "Connect and sketch displacement, distance, velocity, speed and acceleration graphs through gradients, signs and areas.",model_set(graph),(
            ("signed-sketch","How do the signed graphs fit together?",f"A displacement graph with gradient {m('v=0')} has a horizontal tangent. An increasing velocity graph has positive acceleration, including where its velocity is negative.",
             "Calculate the endpoint values and all relevant zero crossings. Plot velocity before drawing a displacement or acceleration sketch. Use the velocity signs to find increasing and decreasing sections of displacement and use its gradient for acceleration.",
             "A zero on the acceleration graph marks zero velocity gradient. It can occur when the particle has non-zero signed velocity."),
            ("speed","How do I draw the speed graph?",f"Speed is {m('|v|')}. Reflect each section of the velocity graph below the time axis to the same height above it. Leave the other parts of the graph in place.",
             "Use the velocity graph's times and velocity zeros. Keep those times fixed and reflect only the signs of the negative values. To find distance, add all the areas between the resulting speed graph and the time axis.",
             "A negative area under velocity contributes a positive area under speed after the reflection."),
            ("distance-graph","What does the distance graph look like?",f"The gradient of the distance graph is {m('|v|')}. The graph of accumulated distance begins at zero and increases while the particle moves in either direction.",
             "Plot the initial distance and the distance at each change in direction. The tangent is horizontal when the particle stops. Compare the speed on either side to decide where the distance graph becomes steeper or flatter.",
             "When a particle moves towards the origin, displacement may decrease while total distance continues increasing.")),
             (("Motion sketch","A labelled graph showing the relevant values, intercepts and behaviour."),("Speed–time area","The distance travelled between the given times."),("Gradient of distance","Instantaneous speed, so the gradient is non-negative.")),
             "Label both axes and units. For a velocity graph, show any sections below the time axis before converting to speed.",17,graph_fig,
             table(("Graph","Use this relationship"),(("Displacement against time","Gradient is velocity"),("Distance against time","Gradient is speed"),("Velocity against time","Gradient is acceleration and signed area is displacement"),("Speed against time","Area is total distance"),("Acceleration against time","Signed area is change in velocity")),"Five graphs for one-dimensional motion")))
    build(key,"Kinematics",15,lessons,__file__)


if __name__=="__main__":
    main()
