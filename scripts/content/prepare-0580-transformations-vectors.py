"""Build independently authored C/E7 transformations and vector materials."""

from fractions import Fraction as Q
from hashlib import sha256
from html import escape
import json
from math import ceil, floor, hypot
from pathlib import Path


ROOT=Path(__file__).resolve().parents[2]
COURSE="maths4u-0580"
PREFIX="igcse-0580-tv-"
DATE="2026-11-22"
W,H=420,296
BLUE,GREEN,PURPLE="#1d6590","#16775f","#805294"


def p(text):
    return f"<p>{text}</p>"


def m(value):
    return r"\("+escape(str(value),quote=False)+r"\)"


def fraction(value,latex=True):
    value=Q(value)
    if value.denominator==1 or not latex:
        return str(value)
    sign="-" if value<0 else ""
    return sign+fr"\frac{{{abs(value.numerator)}}}{{{value.denominator}}}"


def point(v,latex=True):
    return "("+",".join(fraction(x,latex) for x in v)+")"


def vector(v):
    return r"\begin{pmatrix}"+r"\\".join(fraction(x) for x in v)+r"\end{pmatrix}"


def add(a,b):
    return tuple(x+y for x,y in zip(a,b))


def times(k,v):
    return tuple(k*x for x in v)


def subtract(a,b):
    return add(a,times(-1,b))


def dot(a,b):
    return sum(x*y for x,y in zip(a,b))


def combination(v,latex=True):
    result=""
    for scalar,name in zip(v,"ab"):
        if not scalar:
            continue
        coefficient="" if abs(scalar)==1 else fraction(abs(scalar),latex)
        if not latex and "/" in coefficient:
            coefficient="("+coefficient+")"
        result+=("-" if scalar<0 else "+")+coefficient+(fr"\mathbf{{{name}}}" if latex else name)
    return result.lstrip("+") or "0"


def square_root(value):
    value=int(value)
    outside=1
    remaining=value
    factor=2
    while factor*factor<=remaining:
        while remaining%(factor*factor)==0:
            remaining//=factor*factor
            outside*=factor
        factor+=1
    if remaining==1 or value==0:
        return str(outside if value else 0),str(outside if value else 0)
    coeff=str(outside) if outside!=1 else ""
    return coeff+fr"\sqrt{{{remaining}}}",coeff+f"sqrt({remaining})"


def task(title,stem,field,answer,steps,criteria,hint,wrong=(),art=None,write=None):
    retry={str(value):p(feedback) for value,feedback in wrong if str(value)!=str(field["expected"] if field else "")}
    return dict(title=title,prompt=p(stem),field=field,answer=answer,solution=[p(text) for text in steps],
        criteria=[dict(code=code,marks=1,description_html=p(text)) for code,text in criteria],hint=p(hint),
        retry=[dict(answer=value,feedback=feedback) for value,feedback in retry.items()],art=art,write=p(write) if write else None)


def criteria(method,answer):
    return [("M1",method),("A1",answer)]


def coords(title,stem,values,steps,method,hint,wrong=(),art=None,as_vector=False,manual=False):
    values=list(values)
    solution=m(vector(values[0])) if as_vector else m(r",\;".join(point(x) for x in values))
    expected=", ".join(point(x,False) for x in values)
    field=dict(key="answer",label="Components (x, y)" if as_vector else "Coordinates (x, y)",type="pairs",expected=expected)
    ending=f"The {'column vector' if as_vector else 'coordinates'} {'is' if as_vector else 'are'} {solution}."
    marks=criteria(method,solution)
    if manual:
        marks=[("M1",method),("A1",f"Plot at least two correct image vertices from {solution}."),("B1","Join all correct vertices to show the complete image. Use a ruler on straight edges.")]
    return task(title,stem,field,solution,steps+[ending],marks,hint,wrong,art=art)


def scalar(title,stem,response,steps,method,hint,wrong=(),art=None,latex=None):
    value=str(response)
    answer=m(latex if latex is not None else fraction(response))
    field=dict(key="answer",label="Value",type="number",expected=value)
    return task(title,stem,field,answer,steps+[f"The result is {answer}."],criteria(method,answer),hint,wrong,art=art)


def symbolic(title,stem,result,steps,method,hint,wrong=(),art=None):
    answer=m(combination(result))
    field=dict(key="answer",label="Expression in a and b",type="polynomial",variables=["a","b"],expected=combination(result,False))
    return task(title,stem,field,answer,steps+[f"The vector is {answer}."],criteria(method,answer),hint,
        [(combination(value,False),feedback) for value,feedback in wrong],art=art)


def choice(seed,title,stem,correct,alternatives,steps,method,hint,write,art=None):
    letters="ABCD"
    i=seed%4
    ordered=letters[i:]+letters[:i]
    choices=dict(sorted(zip(ordered,[correct,*[d for d,_ in alternatives]])))
    assert len(set(choices.values()))==4,title
    field=dict(key="answer",label="Choose one answer",type="choice",expected=ordered[0],options=choices)
    return task(title,stem,field,correct,steps,criteria(method,correct),hint,list(zip(ordered[1:],[feedback for _,feedback in alternatives])),art=art,write=write)


def base_triangle(seed,anchor=None,d=1):
    x,y=anchor or (seed%7-3,seed%11-5)
    return ((x,y),(x+d*(2+seed%2),y),(x+d,y+d*(2+seed%3)))


def names(points,labels=("A","B","C")):
    return m(r",\quad ".join(name+point(v) for name,v in zip(labels,points)))


def rotate(point0,centre,n):
    u,v=subtract(point0,centre)
    if n%4==1:
        u,v=-v,u
    elif n%4==2:
        u,v=-u,-v
    elif n%4==3:
        u,v=v,-u
    return add(centre,(u,v))


def reflect(point0,normal,rhs):
    t=Q(dot(point0,normal)-rhs,dot(normal,normal))
    return subtract(point0,times(2*t,normal))


def enlarge(point0,centre,k):
    return add(centre,times(k,subtract(point0,centre)))


def direction(quarter_turns):
    return {1:m(r'90^\circ')+" anticlockwise",2:m(r'180^\circ'),3:m(r'90^\circ')+" clockwise"}[quarter_turns]


def shapes(original,image,centre=None,guides=(),stage=None):
    source=[("A",original[0]),("B",original[1]),("C",original[2])]
    final=[("A′",image[0]),("B′",image[1]),("C′",image[2])]
    marker=[("O",centre)] if centre is not None else []
    intermediate=[] if stage is None else [("A₁",stage[0]),("B₁",stage[1]),("C₁",stage[2])]
    return (dict(polygons=[(source,BLUE)],markers=marker,guides=list(guides)),
            dict(polygons=[(source,BLUE),*([(intermediate,PURPLE)] if intermediate else []),(final,GREEN)],markers=marker,guides=list(guides)))


def translate(seed,manual=False):
    original=base_triangle(seed)
    step=(2+seed%5,(-1 if seed%2 else 1)*(2+seed%7))
    final=tuple(add(v,step) for v in original)
    wording=f"Triangle ABC has vertices {names(original)}. Translate it by {m(vector(step))}."
    ending=" Draw the image on the grid." if manual else " Give all three image vertices."
    return coords("Translate a triangle",wording+ending,final,
        [f"The horizontal move is {m(step[0])} and the vertical move is {m(step[1])}.","Make this same move from each vertex, then join the corresponding vertices in the original order."],
        "Add the same horizontal and vertical components to each original vertex.","Read the top component as the horizontal move and the bottom as the vertical one.",
        [(point(final[0],False),"This is one translated vertex. Apply the same move to the other two vertices.")],shapes(original,final),manual=manual)


def draw_translation(seed):
    return translate(seed+501,True)


def read_translation(seed):
    a=(seed%17-8,seed%13-6)
    displacement=(-2-seed%7,3+seed%5)
    image=add(a,displacement)
    return coords("Read the translation from corresponding points",f"A translation takes {m('P'+point(a))} to {m('P\''+point(image))}. Find its column vector. Enter the components as an ordered pair.",
        [displacement],["Subtract the original coordinates from the image coordinates. Use x first and y second."],
        "Calculate image minus object for each coordinate.","Measure the directed move from the original point to its image.",
        [(point(times(-1,displacement),False),"That moves backwards from the image to the original. Reverse the direction.")],as_vector=True)


def undo_translation(seed):
    image=(seed%19-9,seed%23-10)
    step=(3+seed%3,-2-seed%7)
    result=subtract(image,step)
    return coords("Find the point before a translation",f"A translation by {m(vector(step))} takes a point to {m(point(image))}. Find the original point.",
        [result],[f"Reverse both components of the movement. The reverse vector is {m(vector(times(-1,step)))}.","Apply that reverse movement to the image."],
        "Subtract the vector from the known image point.","Undo the movement by changing both signs.",[(point(add(image,step),False),"You moved forward from the image. Use the reverse vector.")])


def describe_translation(seed):
    original=base_triangle(seed)
    move=(3+seed%7,-2-seed%9)
    final=tuple(add(v,move) for v in original)
    stem=f"A single transformation takes triangle {names(original)} to {names(final,('A′','B′','C′'))}."
    description=lambda step:f"Translation by {m(vector(step))}."
    both=shapes(original,final)[1]
    return choice(seed,"Give a complete translation description",stem+" Which description is correct?",description(move),
        [(description(times(-1,move)),"This takes the image back to the object. Compare object to image."),
         (description(tuple(reversed(move))),"Keep horizontal movement on top and vertical movement below it."),
         ("Reflection in the x-axis.","A reflection in the x-axis does not change horizontal positions. Check how all the vertices move here.")],
        ["The same directed move takes each original vertex to its image. That identifies a translation.",
         f"Each horizontal change is {m(move[0])} and each vertical change is {m(move[1])}."],
        "Recognise the move as a translation and give the vector from object to image.","Compare all corresponding pairs to check that their directed movements match.",
        stem+" Describe the transformation fully.",art=(both,both))


def axis_reflection(seed,manual=False):
    axis=seed%2
    normal=(1,0) if axis==0 else (0,1)
    c=seed%9-4
    start=(c+2,seed%7-3) if axis==0 else (seed%7-3,c+2)
    original=base_triangle(seed,start)
    final=tuple(reflect(v,normal,c) for v in original)
    line=m(f'{"x" if axis==0 else "y"}={c}')
    guides=[((c,-40),(c,40))] if axis==0 else [((-40,c),(40,c))]
    return coords("Reflect a triangle in an axis-parallel line",f"Reflect triangle ABC with vertices {names(original)} in the line {line}."+
        (" Draw its image." if manual else " Enter the three image vertices."),final,
        [f"Measure the distance to the mirror line {line} along the perpendicular grid direction.",
         "Place each corresponding image point the same distance from the line on the opposite side."],
        "Keep the coordinate parallel to the mirror line and reflect the other one about the line.",
        "The mirror line is halfway between each vertex and its image.",[(point(final[0],False),"That is one reflected vertex. Give the full set of image points.")],
        shapes(original,final,guides=guides),manual=manual)


def draw_axis_reflection(seed):
    return axis_reflection(seed+601,True)


def infer_mirror(seed):
    vertical=seed%2==0
    k=seed%19-9
    original=(k+2+seed%5,seed%11-4) if vertical else (seed%11-4,k+2+seed%5)
    image=reflect(original,(int(vertical),int(not vertical)),k)
    xory="x" if vertical else "y"
    other="y" if vertical else "x"
    stem=f"A reflection in a {'vertical' if vertical else 'horizontal'} line maps {m(point(original))} to {m(point(image))}."
    result=f"Reflection in {m(f'{xory}={k}')}"
    return choice(seed,"Find the position of the mirror line",stem+" Give the full description.",result,
        [(f"Reflection in {m(f'{other}={k}')}","Check which coordinate changes under this reflection."),
        (f"Reflection in {m(f'{xory}={k+1}')}","The line must be halfway between the two points."),
        (f"Reflection in {m(f'{xory}={k-1}')}","Use the midpoint of the changing coordinates.")],
        [f"Only the {'x' if vertical else 'y'}-coordinate changes. The mirror is perpendicular to the segment joining the points.",
         f"The changing coordinate is halfway between its original and image values, giving {m(f'{xory}={k}')}."] ,
        "Find the perpendicular bisector by taking the midpoint of the changed coordinate.","The fixed coordinate tells you whether the movement was horizontal or vertical.",
        stem+" Give the equation of the mirror line and explain how you found it.")


def mirror_fixed(seed):
    vertical=seed%2==0
    k=seed%17-8
    other=seed%23-10
    original=(k,other) if vertical else (other,k)
    line=m(f'{"x" if vertical else "y"}={k}')
    return coords("Recognise a point that stays fixed",f"What is the image of {m(point(original))} under reflection in {line}?",[original],
        ["The point lies on the mirror line, so its perpendicular distance from the line is zero. It stays fixed."],
        "Recognise that a point on the mirror line maps to itself.","Check whether the point lies on the given mirror line.")


def rotation(seed,manual=False,extended=False):
    original=base_triangle(seed,d=2 if seed%3==2 else 1)
    turns=1+(seed//3)%3
    if extended:
        c=(seed%7-7,seed%9-8)
        centre_desc=m(point(c))
    elif seed%3==0:
        c=(0,0)
        centre_desc="the origin "+m(point(c))
    elif seed%3==1:
        c=original[0]
        centre_desc="vertex A "+m(point(c))
    else:
        c=times(Q(1,2),add(original[0],original[1]))
        centre_desc="the midpoint of AB "+m(point(c))
    final=tuple(rotate(v,c,turns) for v in original)
    wording=f"Triangle ABC has vertices {names(original)}. Rotate it through {direction(turns)} about {centre_desc}."
    return coords("Rotate a shape about a stated centre",wording+(" Draw the image on the grid." if manual else " Give the three image vertices."),final,
        ["For each vertex, count its horizontal and vertical steps from the centre of rotation.",f"Turn that relative movement through {direction(turns)} and add the centre back. Join the rotated vertices."],
        "Keep the centre fixed and use the correct angle and direction for each vertex.","Measure relative to the given centre before turning. The distance from the centre stays the same.",
        [(point(final[0],False),"This is one rotated vertex. Give all three image points.")],shapes(original,final,centre=c),manual=manual)


def draw_rotation(seed):
    return rotation(seed+602,True)


def off_origin_rotation(seed):
    return rotation(seed+69,extended=True)


def describe_rotation(seed):
    original=base_triangle(seed)
    center=original[0]
    quarter=1+seed%3
    final=tuple(rotate(v,center,quarter) for v in original)
    detail=lambda q,c: f"Rotation through {direction(q)} about {m(point(c))}."
    stem=f"Triangle {names(original)} maps to {names(final,('A′','B′','C′'))} by a rotation."
    return choice(seed,"Describe the centre, angle and direction",stem+" Which description is complete and correct?",detail(quarter,center),
        [(detail(quarter%3+1,center),"The centre is correct. Check the angle and sense of the turn."),(detail(quarter,original[1]),"Vertex A is fixed and the shape turns around it."),
         (detail(quarter,add(center,(1,1))),"The fixed vertex A identifies the centre in this case.")],
        [f"A and A′ are at the same point {m(point(center))}. This point stays fixed.",f"The line from A to B turns through {direction(quarter)} to reach the line from A′ to B′."],
        "Identify the fixed centre and work out the angle and sense from a corresponding ray.","Compare two rays from the fixed vertex.",
        stem+" Describe the rotation fully.",art=(shapes(original,final)[1],shapes(original,final,centre=center)[1]))


def enlargement(seed,manual=False,negative=False):
    k=(Q(-1,2),Q(-2),Q(-3,2))[seed%3] if negative else (Q(2),Q(1,2),Q(3,2))[seed%3]
    center=(seed%7-3,seed%9-5)
    anchor=add(center,(2*k.denominator,k.denominator))
    original=base_triangle(seed,anchor,k.denominator)
    final=tuple(enlarge(v,center,k) for v in original)
    stem=f"Enlarge triangle ABC with vertices {names(original)} by scale factor {m(fraction(k))} from centre {m(point(center))}."
    side="the opposite side of" if k<0 else "the same ray from"
    return coords("Construct an enlargement",stem+(" Draw the image on the grid." if manual else " Give the image vertices."),final,
        ["Draw or imagine a line through the centre and each original point.",f"Multiply each displacement from the centre by {m(fraction(k))}. The image is on {side} the centre."],
        "Scale each displacement from the given centre, keeping track of which side of the centre the image lies on.",
        "Scale the displacement from the centre. Add the centre back after scaling.",
        [(point(final[0],False),"That is one image vertex. Find the other two using the same centre and factor.")],shapes(original,final,centre=center),manual=manual)


def draw_enlargement(seed):
    return enlargement(seed+603,True)


def negative_enlargement(seed):
    return enlargement(seed+617,negative=True)


def scale_factor(seed):
    centre=(seed%13-6,seed%17-8)
    scale=(Q(2),Q(1,2),Q(3,2),Q(2,3))[seed%4]
    a=add(centre,(scale.denominator*(2+seed%5),scale.denominator*(1+seed%3)))
    b=enlarge(a,centre,scale)
    return scalar("Find an enlargement factor",f"An enlargement with centre {m(point(centre))} maps {m('A'+point(a))} to {m('A\''+point(b))}. Find the scale factor.",scale,
        ["Find the horizontal moves from the centre to the object and from the centre to the image. The directions match.","Divide the image displacement by the object displacement."],
        "Compare the image distance from the centre with the corresponding object distance.","The scale factor is the image distance divided by the original distance.",[(1/scale,"You divided in reverse order. Divide image by original.")])


def enlargement_centre(seed):
    k=(Q(3),Q(2),Q(1,2))[seed%3]
    center=(seed%13-6,seed%19-9)
    original=base_triangle(seed,add(center,(2*k.denominator,3*k.denominator)),k.denominator)
    image=tuple(enlarge(v,center,k) for v in original)
    stem=f"One enlargement of scale factor {m(fraction(k))} takes {names(original)} to {names(image,('A′','B′','C′'))}. Find its centre."
    return coords("Locate the centre of an enlargement",stem,[center],
        ["Join corresponding vertices, for example A to A′ and B to B′. The centre lies on both extended lines.",
         f"The lines meet at {m(point(center))}. Check that each image distance from this point has the stated scale factor."],
        "Use two pairs of corresponding vertices and recover the common centre.","Extend the joins between corresponding vertices until they meet.",art=None)


def describe_enlargement(seed):
    centre=(seed%7-3,seed%11-5)
    k=(Q(2),Q(1,2),Q(3,2),Q(3))[seed%4]
    original=base_triangle(seed,add(centre,(3*k.denominator,2*k.denominator)),k.denominator)
    final=tuple(enlarge(v,centre,k) for v in original)
    full=lambda c,s:f"Enlargement with centre {m(point(c))} and scale factor {m(fraction(s))}."
    stem=f"A single transformation maps {names(original)} to {names(final,('A′','B′','C′'))}."
    art=(shapes(original,final)[1],shapes(original,final,centre=centre)[1])
    return choice(seed,"Describe a scale change with its centre and factor",stem+" Which description is correct?",full(centre,k),
        [(full(centre,1/k),"This factor would take the image back to the object."),
         (full(add(centre,(1,-1)),k),"Check where the lines through corresponding vertices meet."),
         (full(centre,k+1),"Compare matching lengths, using image divided by object.")],
        ["The shape keeps its angles but the side lengths change in a common ratio. The transformation is an enlargement.",
         f"The ratio of matching side lengths is {m(fraction(k))}. The extended joins of corresponding vertices meet at {m(point(centre))}."],
        "Use a common side-length ratio and the intersection of the vertex joins to describe the transformation.","Find the scale from related sides and the centre from lines through two corresponding pairs.",
        stem+" Describe the transformation fully.",art=art)


def diagonal_reflection(seed):
    sense=1 if seed%2 else -1
    c=seed%13-6
    normal=(-sense,1)
    original=base_triangle(seed)
    image=tuple(reflect(v,normal,c) for v in original)
    line=r"y="+("x" if sense>0 else "-x")+(f"{c:+}" if c else "")
    guides=[((-35,-35*sense+c),(35,35*sense+c))]
    return coords("Reflect in a diagonal mirror",f"Reflect triangle ABC with vertices {names(original)} in {m(line)}. Give its image vertices.", image,
        [f"For each vertex, follow a perpendicular to {m(line)}. For this diagonal, the perpendicular uses a slope of {m(-sense)}.",
         "Carry that same perpendicular distance beyond the mirror to mark the new point. Repeat for all three vertices."],
        "Reflect every vertex by equal perpendicular distances to the mirror line.","Count along diagonals perpendicular to the mirror, not along horizontal rows.",
        [(point(image[-1],False),"Give all three reflected image points.")],art=shapes(original,image,guides=guides))


def general_mirror(seed):
    normal=(2,1+seed%2*2)
    k=seed%11-5
    foot=(seed%7-3,k)
    rhs=dot(normal,foot)
    scale=1+seed%5
    original=add(foot,times(scale,normal))
    answer=reflect(original,normal,rhs)
    line=f"{normal[0]}x+"+("y" if normal[1]==1 else f"{normal[1]}y")+f"={rhs}"
    stem=f"The perpendicular from {m('P'+point(original))} to the mirror line {m(line)} meets the line at {m('M'+point(foot))}. Find the reflection of P."
    return coords("Use the perpendicular foot to reflect across a line",stem,[answer],
        ["The mirror passes through the midpoint of the segment joining P to its image.",f"Repeat the directed movement from P to M once from M. This puts the image the same distance beyond {m('M')} along the perpendicular."],
        "Take the midpoint as the perpendicular foot and continue the displacement to the image.","The foot M is halfway along the segment from P to its reflection.",
        [(point(foot,False),"The foot is only halfway to the image. Continue the same distance beyond it.")])


def negative_factor(seed):
    centre=(seed%9-4,seed%17-8)
    k=(Q(-3,2),Q(-2),Q(-1,2))[seed%3]
    point0=add(centre,(k.denominator*(2+seed%5),k.denominator*(1+seed%7)))
    image=enlarge(point0,centre,k)
    return scalar("Read the sign and size of an enlargement factor",
        f"An enlargement centred at {m(point(centre))} maps {m('P'+point(point0))} to {m('P\''+point(image))}. Find its scale factor.",k,
        ["The object and image are on opposite sides of the centre, so the factor is negative.","Divide corresponding signed displacements from the centre, using the same axis, to get the factor."],
        "Use signed image displacement divided by original displacement from the centre.","The image is on the opposite side of the centre. Include the correct sign.",
        [(abs(k),"The size is right. The opposite direction gives a negative factor."),(1/k,"Divide image by original, not original by image.")])


def combined(seed,manual=False):
    original=base_triangle(seed)
    line=seed%9-4
    step=(2+seed%6,seed%7-3)
    middle=tuple(reflect(v,(1,0),line) for v in original)
    final=tuple(add(v,step) for v in middle)
    reverse=tuple(reflect(add(v,step),(1,0),line) for v in original)
    start=f"Triangle ABC has vertices {names(original)}. Reflect in {m(f'x={line}')}, then translate by {m(vector(step))}."
    alt=", ".join(point(t,False) for t in reverse)
    guide=[((line,-40),(line,40))]
    return coords("Apply a reflection and translation in order",start+(" Draw the final image." if manual else " Give the final image vertices."),final,
        ["Reflect the triangle in the stated line and label the intermediate vertices.","Translate that intermediate triangle. The order matters because the horizontal move appears in a different place relative to the reflection."],
        "Reflect the object first and translate the resulting intermediate figure.","Apply the second instruction to the image of the first transformation.",
        [(alt,"You applied the transformations in reverse order. Reflect first, then translate.")],
        art=shapes(original,final,guides=guide,stage=middle),manual=manual)


def draw_combined(seed):
    return combined(seed+800,True)


def combine_mirrors(seed):
    a=seed%11-8
    b=a+2+seed%7
    block=f"Reflect a shape in {m(f'x={a}')}, then reflect its image in {m(f'x={b}')}."
    shift=(2*(b-a),0)
    return coords("Find the single movement from two parallel reflections",block+" The two steps give one translation. Find its column vector.",
        [shift],[f"A point with x-coordinate {m('x')} first changes to {m(f'2({a})-x')}.",
         f"The second reflection changes this to {m(f'2({b})-[2({a})-x]=x+{shift[0]}')}. Its y-coordinate has not changed."],
        "Track the x-coordinate through both mirrors or use the doubled directed separation of the two lines.",
        "The change equals twice the directed distance from the first parallel mirror to the second.",
        [(point(times(-1,shift),False),"This is the translation in the reverse order."), (point((b-a,0),False),"Two reflections move a point by twice the distance between the mirrors.")],as_vector=True)


def describe_composed(seed):
    a=seed%9-4
    t=2*(1+seed%7)
    line=a+t//2
    stem=f"A shape is reflected in {m(f'x={a}')} and then translated by {m(vector((t,0)))}."
    result=f"Reflection in {m(f'x={line}')}"
    return choice(seed,"Recognise a single equivalent transformation",stem+" Which single transformation has the same effect?",result,
        [(f"Reflection in {m(f'x={a-t//2}')}","This is the line for the operations applied in the reverse order."),
         (f"Reflection in {m(f'x={a+t}')}","The shift of the equivalent mirror is half the translation distance."),
         (f"Translation by {m(vector((t,0)))}","The reflection reverses the orientation. A translation alone cannot do that.")],
        [f"The x-coordinate changes from {m('x')} to {m(f'2({a})-x+{t}')} and y stays unchanged.",
         f"Rewrite the x rule as {m(f'2({line})-x')}. Its fixed x-value is {m(line)}, the new mirror line."],
        "Compare the composed coordinate rule with the coordinate rule for reflection.","Track what happens to an x-coordinate and look for the fixed line.",
        stem+" Describe the single equivalent transformation fully.")


def displacement(seed):
    a=(seed%13-6,seed%19-9)
    b=add(a,(-2-seed%7,1+seed%11))
    out=subtract(b,a)
    o=(0,0)
    scene=dict(polygons=[],markers=[("O",o),("A",a),("B",b)],guides=[],arrows=[(a,b,GREEN),*[(s,t,col) for s,t,col in ((o,a,BLUE),(o,b,PURPLE)) if s!=t]])
    return coords("Read a directed line as a column vector",f"Given {m('A'+point(a))} and {m('B'+point(b))}, find {m(r'\overrightarrow{AB}')} as a column vector.",
        [out],["Start at A and travel to B. Subtract the coordinates of A from those of B."],
        "Use end minus start in both components.","The first letter is the starting point of the arrow.",
        [(point(times(-1,out),False),"That vector goes from B to A. Reverse both signs for AB.")],art=(scene,scene),as_vector=True)


def components(seed):
    a=(3+seed%7,2-seed%11)
    b=(-2-seed%9,2+seed%7)
    return a,b


def component_sum(seed):
    a,b=components(seed)
    sign=-1 if seed%2 else 1
    out=add(a,times(sign,b))
    expr=r"\mathbf a"+("+" if sign>0 else "-")+r"\mathbf b"
    return coords("Add or subtract matching components",f"Given {m(r'\mathbf a='+vector(a))} and {m(r'\mathbf b='+vector(b))}, calculate {m(expr)}.",
        [out],["Work with the two horizontal components together. Then work with the two vertical components.","When subtracting, reverse both components of the second vector before adding."],
        "Apply the indicated operation component by component.","Horizontal entries combine only with horizontal entries.",
        [(point(add(a,times(-sign,b)),False),"Check the operation between the two vectors.")],as_vector=True)


def scale_vector(seed):
    a,b=components(seed)
    k=(Q(-2),Q(3),Q(-1,2),Q(2,3))[seed%4]
    out=times(k,a)
    return coords("Multiply both components by a scalar",f"Given {m(r'\mathbf a='+vector(a))}, find {m(fraction(k)+r'\mathbf a')}.",
        [out],["Multiply the horizontal and vertical components by the same scalar.","A negative scalar reverses the vector and also changes its length when its magnitude is not one."],
        "Multiply both components by the stated scalar.","The scalar applies to the entire vector, so scale both entries.",
        [(point((out[0],a[1]),False),"Scale the vertical component too."),(point(times(abs(k),a),False),"The negative scalar reverses both signs.")],as_vector=True)


def vector_expression(seed):
    a,b=components(seed)
    k=2+seed%7
    l=1+seed%5
    out=subtract(times(k,a),times(l,b))
    expr=fr'{k}\mathbf a-'+(fr'{l}\mathbf b' if l!=1 else r'\mathbf b')
    return coords("Scale both vectors before combining",f"Given {m(r'\mathbf a='+vector(a))} and {m(r'\mathbf b='+vector(b))}, calculate {m(expr)}.",
        [out],["Multiply each vector by its own scalar. Then subtract the second scaled vector component by component."],
        "Find both scaled vectors before subtracting their components.","The scalar in front of b applies to both components before subtraction.",
        [(point(add(times(k,a),times(l,b)),False),"The last operation is subtraction. Reverse both terms of the scaled second vector.")],as_vector=True)


def magnitude_values(seed):
    a=(-1 if seed%2 else 1)*(2+seed%17)
    b=(-1 if seed%3 else 1)*(1+seed%13)
    return a,b


def magnitude(seed):
    a,b=magnitude_values(seed)
    total=a*a+b*b
    rad,typed=square_root(total)
    stem=f"A vector has column form {m(vector((a,b)))}. Find its exact magnitude."
    return scalar("Use Pythagoras for the magnitude",stem,typed,
        [f"The horizontal and vertical components form perpendicular legs. Square both signed components and add the squares to get {m(total)}.", "Take the non-negative square root of the sum."],
        "Use Pythagoras with the two perpendicular components and take the square root.","A length is non-negative. Square each component before adding.",
        [(total,"This is the squared magnitude. Take the square root."),(abs(a)+abs(b),"That adds the two legs. The magnitude is the straight-line distance.")],latex=rad)


def segment_magnitude(seed):
    a=(seed%13-6,seed%19-9)
    v=magnitude_values(seed+14)
    b=add(a,v)
    total=dot(v,v)
    rad,typed=square_root(total)
    return scalar("Find the length of a directed line segment",f"Given {m('P'+point(a))} and {m('Q'+point(b))}, work out {m(r'|\overrightarrow{PQ}|')} exactly.",typed,
        [f"Subtract the coordinates of P from those of Q to get {m(vector(v))}.","Square the two components, add, then take the positive square root."],
        "Form the displacement between the two points, then apply Pythagoras.","Find the displacement first. The quantity inside the modulus signs is a vector, the output is a length.",
        [(total,"You found the square of the distance. Take the square root."),(abs(v[0])+abs(v[1]),"The vector length is the diagonal, not the total distance along the two axes.")],latex=rad)


def scaled_magnitude(seed):
    v=magnitude_values(seed+17)
    k=2+seed%7
    sq=dot(v,v)
    rad,typed=square_root(k*k*sq)
    return scalar("Scale a magnitude with a negative scalar",f"The column vector {m(r'\mathbf u='+vector(v))} is multiplied by {m(-k)}. Find {m(fr'|-{k}\mathbf u|')} exactly.",typed,
        [f"Multiplying by {m(-k)} reverses direction and multiplies length by {m(k)}.",f"The squared length is {m(k*k*sq)}. Take its non-negative square root."],
        "Use the absolute value of the scalar to scale the original magnitude, or calculate the magnitude of the scaled vector.",
        "Changing direction does not make a magnitude negative.",[("-"+typed,"The scalar reverses the direction, but the length stays non-negative.")],latex=rad)


def unknown_component(seed):
    a=(-1 if seed%2 else 1)*(2+seed%17)
    b=2+seed%19
    total=a*a+b*b
    length,_=square_root(total)
    stem=f"The vector {m(r'\begin{pmatrix}'+str(a)+r'\\t\end{pmatrix}')} has magnitude {m(length)}. Given {m('t>0')}, find {m('t')}."
    return scalar("Find a missing component from the magnitude",stem,b,
        [f"Square the stated magnitude to get {m(total)}. The first component contributes {m(a*a)}.",
         f"So {m(f't^2={total}-{a*a}={b*b}')}. The positive value is required."],
        "Square the length, remove the square of the known component and take the allowed root.","Square the magnitude before subtracting the contribution of the known component.",
        [(-b,"The question states that t is positive."),(b*b,"This is the square of t. Find the positive square root.")])


def basis_stem():
    return f"In triangle OAB, {m(r'\overrightarrow{OA}=\mathbf a')} and {m(r'\overrightarrow{OB}=\mathbf b')}."


def route_ab(seed):
    left,right=("A","B") if seed%2 else ("B","A")
    factor=2+seed%13
    stem=f"{basis_stem()} Start at {left}, go to O, then to {right}. Express {m(fr'{factor}\overrightarrow{{{left}{right}}}')} in terms of {m(r'\mathbf a')} and {m(r'\mathbf b')}."
    coeffs=(-factor,factor) if left=="A" else (factor,-factor)
    return symbolic("Use a route through the origin",stem,coeffs,
        [f"The journey to O is the reverse of the position vector of {left}.",f"Add the position vector of {right} and scale the whole displacement by {factor}."],
        "Subtract the starting position vector from the finishing position vector and apply the scalar.","Travel backwards from the starting point to O before moving out to the finishing point.",
        [(times(-1,coeffs),"You reversed the route. Read its first letter as the starting point."),((factor,factor),"The first leg goes towards O. Its arrow reverses the starting position vector.")])


def position_difference(seed):
    a=(seed%13-6,seed%19-9)
    b=add(a,(2+seed%11,1+seed%7))
    c=subtract(a,(-2-seed%5,2+seed%9))
    start,middle,end=(a,b,c) if seed%2 else (c,a,b)
    out=subtract(end,start)
    wording=(f"Points S, T and U have position vectors {m(vector(start))}, {m(vector(middle))} and {m(vector(end))} respectively. "
             f"Find the directed displacement {m(r'\overrightarrow{SU}')}.")
    o=(0,0)
    points=[("O",o),("S",start),("T",middle),("U",end)]
    arrows=[(a,b,colour) for a,b,colour in ((o,start,BLUE),(o,end,PURPLE),(start,end,GREEN)) if a!=b]
    figure=dict(polygons=[],markers=points,guides=[],arrows=arrows)
    return coords("Distinguish a position from a displacement",wording,[out],
        ["A position vector starts at the origin. The displacement starts at S, so subtract the position of S from the position of U."],
        "Use end position minus starting position.","Join S to O and O to U mentally, then add the resulting movements.",
        [(point(times(-1,out),False),"That is the displacement from U to S."),(point(end,False),"This position starts at the origin rather than S.")],art=(figure,figure),as_vector=True)


def ratio_point(seed,midpoint=False):
    left,right=(1,1) if midpoint else (1+seed%5,2+(seed//5)%7)
    t=Q(left,left+right)
    walk=times(t,(-1,1))
    target=add((1,0),walk)
    if midpoint:
        start=(seed%13-6,seed%19-9)
        end=add(start,(2+seed%8,3+seed%8))
        middle=times(Q(1,2),add(start,end))
        stem=f"M is the midpoint of {m('AB')}, where {m('A'+point(start))} and {m('B'+point(end))}. Find its position vector."
        return coords("Find a midpoint position vector",stem,[middle],
            ["Find the average of the two horizontal positions and the average of the two vertical positions.","The position vector of M starts at the origin and ends at this midpoint."],
            "Take the average of the two position vectors.","The midpoint is halfway from A to B. Its vector starts at the origin.",
            [(point(times(Q(1,2),subtract(end,start)),False),"That is the movement from A to M. Add A's position to reach M from the origin.")],as_vector=True)
    name=f"M divides AB internally with {m(f'AM:MB={left}:{right}')}."
    return symbolic("Write the position vector of an internal point",f"{basis_stem()} {name} Find {m(r'\overrightarrow{OM}')} in terms of {m(r'\mathbf a,\mathbf b')}.",target,
        [f"The full segment has {left+right} equal ratio parts. So {m(r'\overrightarrow{AM}='+fraction(t)+r'\overrightarrow{AB}')}.",
         f"Start at O, travel to A, then add {m(fraction(t))} of {m(r'\mathbf b-\mathbf a')}. Collect the coefficients."],
        "Use AM as the corresponding fraction of AB and add A's position vector.","The denominator is the total number of parts in the whole segment.",
        [(walk,"That is the displacement from A to M. Include the initial leg from O to A."),((t,1-t),"The part measured from A controls the coefficient of b.")],
        art=ratio_art(t))


def midpoint(seed):
    return ratio_point(seed,True)


def proportional_vectors(seed):
    a=(2+seed%7,-1-seed%11)
    factor=(Q(-3),Q(2),Q(-1,2),Q(3,2))[seed%4]
    b=times(factor,a)
    stem=f"Given {m(r'\mathbf u='+vector(a))} and {m(r'\mathbf v='+vector(b))}, find the scalar {m('k')} for which {m(r'\mathbf v=k\mathbf u')}."
    candidates=((1/factor,"You inverted the ratio. Divide the components of v by those of u."),(abs(factor),"A negative multiple points in the opposite direction."))
    return scalar("Show how two vectors are parallel",stem,factor,
        ["Divide the horizontal component of v by the horizontal component of u.","Check the vertical components give the same multiplier. The two vectors are parallel because both components scale by that number."],
        "Compare the component ratios and use their common scalar.","Both components must scale by the same number, including its sign.",candidates)


def collinearity(seed):
    a=(seed%13-7,seed%23-12)
    v=(2*(1+seed%7),2*(1-seed%7))
    b=add(a,v)
    k=(Q(3,2),Q(-2),Q(5,2))[seed%3]
    c=add(a,times(k,v))
    stem=f"Let {names((a,b,c))}. The vectors {m(r'\overrightarrow{AB}')} and {m(r'\overrightarrow{AC}')} share the starting point A."
    result=f"The points are collinear because {m(r'\overrightarrow{AC}='+fraction(k)+r'\overrightarrow{AB}')} and both start at A."
    return choice(seed,"Check the scalar multiple and the common point",stem+" Which reason shows that A, B and C lie on one line?",result,
        [(f"The points are collinear because {m(r'\overrightarrow{AB}=\overrightarrow{AC}')}.","The vectors have different lengths. Check the multiplier."),
         ("The points are collinear because two of them have the same x-coordinate.","Check both components of the vectors from the shared point."),
         ("The points cannot be collinear because the two displacements differ in length.","Parallel displacements from the same point can have different lengths.")],
        [f"End minus start gives {m(r'\overrightarrow{AB}='+vector(v))} and {m(r'\overrightarrow{AC}='+vector(times(k,v)))}.",
         f"The second vector is {m(fraction(k))} times the first. They share A, so A, B and C are on one straight line."],
        "Show a common scalar in both components and use the shared starting point in the conclusion.","Show parallel directions and identify a point on both lines.",
        stem+" Show that A, B and C are collinear.")


def similar_triangles(seed):
    denominator=5+seed%19
    parts=Q(1+seed%(denominator-1),denominator)
    out=times(parts,(-1,1))
    marker=f"P lies on OA and Q lies on OB, with {m(r'\frac{OP}{OA}=\frac{OQ}{OB}='+fraction(parts))}."
    return symbolic("Relate corresponding sides of similar triangles",f"{basis_stem()} {marker} Express {m(r'\overrightarrow{PQ}')} in terms of {m(r'\mathbf a,\mathbf b')}.",out,
        [f"The two position vectors are {m(fraction(parts)+r'\mathbf a')} and {m(fraction(parts)+r'\mathbf b')}. Use end minus start.",
         f"The result is {m(fraction(parts))} times {m(r'\overrightarrow{AB}')}. The corresponding sides are parallel and the triangles are similar."],
        "Use the given common fraction on both position vectors, then subtract the first position from the second.","Find OP and OQ first. The vector PQ is OQ minus OP.",
        [(times(-1,out),"That gives the reverse displacement from Q to P."),((-1,1),"That is the displacement along the larger triangle. Include the stated scale factor.")],
        art=similarity_art(parts))


def prove_a_ratio(seed):
    left,right=2+seed%7,2+(seed//7)%5
    t=Q(left,left+right)
    expr=combination((1-t,t))
    length=f"Point M has position vector {m(r'\overrightarrow{OM}='+expr)}."
    ratio=f"{t.numerator}:{t.denominator-t.numerator}"
    stem=f"{basis_stem()} {length}"
    return choice(seed,"Recover a line ratio from a position vector",stem+" What is the simplified ratio AM : MB?",m(ratio),
        [(m(f"{t.denominator}:{t.numerator}"),"Compare the parts of AB on each side of M, rather than the whole length with one part."),
         (m(f"{t.numerator}:{t.denominator}"),"That compares AM with the whole length AB. Subtract to find the remaining part."),
         (m(f"1:{t.denominator+1}"),"Read the coefficient of b as the fraction of the whole line measured from A.")],
        [f"Subtract the position vector of A. Then {m(r'\overrightarrow{AM}='+fraction(t)+r'(\mathbf b-\mathbf a)')}.",
         "This is a positive fraction of AB less than one, so M lies between A and B. Compare that starting fraction with the rest of the segment."],
        "Use AM as a scalar multiple of AB and compare the travelled fraction with what remains.","Find AM first by subtracting the position of A.",
        stem+" Find the simplified ratio AM : MB and show why M lies between A and B.")


def ratio_art(t):
    o,a,b=(0,0),(8,2),(3,8)
    mid=add(a,times(t,subtract(b,a)))
    scene=dict(polygons=[([("O",o),("A",a),("B",b)],BLUE)],markers=[("M",mid)],guides=[])
    return scene,dict(scene,arrows=[(o,a,BLUE),(a,mid,PURPLE),(o,mid,GREEN)])


def similarity_art(k):
    o,a,b=(0,0),(9,2),(2,8)
    left,right=times(k,a),times(k,b)
    scene=dict(polygons=[([("O",o),("A",a),("B",b)],BLUE),([("O",o),("P",left),("Q",right)],GREEN)],markers=[],guides=[])
    return scene,dict(scene,arrows=[(a,b,BLUE),(left,right,GREEN)])


def arrow_scene(start,end):
    leg=(end[0],start[1])
    scene=dict(polygons=[],markers=[("P",start),("Q",end)],guides=[(start,leg),(leg,end)],arrows=[(start,end,BLUE)])
    return scene,scene


def collect_points(scene):
    return [v for vertices,_ in scene.get("polygons",[]) for _,v in vertices]+[v for _,v in scene.get("markers",[])]+[
        v for a,b,_ in scene.get("arrows",[]) for v in (a,b)]


def display_point(v):
    return point(v,False)


def diagram_text(x,y,content,colour="#163953",size=14,anchor="middle"):
    return (f'<text x="{x:.2f}" y="{y:.2f}" fill="{colour}" font-family="Arial,sans-serif" '
            f'font-size="{size}" text-anchor="{anchor}">{escape(str(content))}</text>')


def drawn_line(a,b,colour,width=1,dash=False,clip=False):
    style=(' stroke-dasharray="5 4"' if dash else "")+(' clip-path="url(#coordinate-plot)"' if clip else "")
    return f'<line x1="{a[0]:.2f}" y1="{a[1]:.2f}" x2="{b[0]:.2f}" y2="{b[1]:.2f}" stroke="{colour}" stroke-width="{width}"{style}/>'


def dot_mark(x,y,colour):
    return f'<circle cx="{x:.2f}" cy="{y:.2f}" r="3.3" fill="{colour}" stroke="white" stroke-width="1.1"/>'


def mapped_vector(a,b,colour):
    a,b=tuple(map(float,a)),tuple(map(float,b))
    dx,dy=subtract(b,a)
    length=hypot(dx,dy)
    ux,uy=dx/length,dy/length
    head=(b,(b[0]-9*ux+4*uy,b[1]-9*uy-4*ux),(b[0]-9*ux-4*uy,b[1]-9*uy+4*ux))
    points=" ".join(f"{x:.2f},{y:.2f}" for x,y in head)
    return drawn_line(a,b,colour,2.4)+f'<polygon points="{points}" fill="{colour}"/>'


def view(scene,bounds):
    xmin,xmax,ymin,ymax=bounds
    span_x,span_y=xmax-xmin,ymax-ymin
    step=min(340/span_x,230/span_y)
    left=52+(340-step*span_x)/2
    bottom=260-(230-step*span_y)/2
    right,top=left+step*span_x,bottom-step*span_y
    def plot(v):
        return (left+float(v[0]-xmin)*step,bottom-float(v[1]-ymin)*step)
    frame=f'<defs><clipPath id="coordinate-plot"><rect x="{left:.2f}" y="{top:.2f}" width="{right-left:.2f}" height="{bottom-top:.2f}"/></clipPath></defs>'
    art=[frame]
    visible_step=max(1,ceil(22/step))
    def labelled(low,high):
        ticks={v for v in range(low,high+1) if v%visible_step==0}
        return ticks if len(ticks)>1 else {low,high}
    x_ticks,y_ticks=labelled(xmin,xmax),labelled(ymin,ymax)
    for x in range(xmin,xmax+1):
        art.append(drawn_line(plot((x,ymin)),plot((x,ymax)),"#dce7ef" if x else "#8197a8",1 if x else 1.3))
        if x in x_ticks:
            art.append(diagram_text(plot((x,ymin))[0],bottom+17,x,size=12))
    for y in range(ymin,ymax+1):
        art.append(drawn_line(plot((xmin,y)),plot((xmax,y)),"#dce7ef" if y else "#8197a8",1 if y else 1.3))
        if y in y_ticks:
            art.append(diagram_text(left-8,plot((xmin,y))[1]+4,y,size=12,anchor="end"))
    art.append(diagram_text(right+21,bottom+17,"x",size=13))
    art.append(diagram_text(left-20,top-8,"y",size=13))
    for a,b in scene.get("guides",[]):
        art.append(drawn_line(plot(a),plot(b),"#81518f",1.6,True,True))
    labels={}
    for vertices,colour in scene.get("polygons",[]):
        svg_points=" ".join(f"{x:.2f},{y:.2f}" for x,y in [plot(v) for _,v in vertices])
        art.append(f'<polygon points="{svg_points}" fill="{colour}" fill-opacity="0.10" stroke="{colour}" stroke-width="2.2" stroke-linejoin="round"/>')
        for name,vertex in vertices:
            if vertex in labels:
                labels[vertex][0].add(name)
            else:
                labels[vertex]=({name},colour)
    for a,b,colour in scene.get("arrows",[]):
        art.append(mapped_vector(plot(a),plot(b),colour))
    for name,vertex in scene.get("markers",[]):
        if vertex in labels:
            labels[vertex][0].add(name)
        else:
            labels[vertex]=({name},PURPLE)
    coords=[]
    for vertex,(letters,colour) in labels.items():
        x,y=plot(vertex)
        art.append(dot_mark(x,y,colour))
        name="/".join(sorted(letters))
        candidates=((x+7,y-7),(x-14,y-8),(x+7,y+15),(x-14,y+15),(x+12,y-17))
        local=next(((ax,ay) for ax,ay in candidates if all(hypot(ax-bx,ay-by)>17 for bx,by in coords)),candidates[-1])
        coords.append(local)
        art.append(diagram_text(*local,name,colour,size=13,anchor="start"))
    alt="Coordinate grid. "+" ".join(f"{' and '.join(sorted(labels_at_point))} at {display_point(v)}." for v,(labels_at_point,_) in labels.items())
    if scene.get("guides"):
        alt+=" Dashed lines show the guide construction."
    if scene.get("arrows"):
        alt+=" Arrowheads mark the directed movements."
    svg=(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" role="img" aria-label="{escape(alt,quote=True)}">'
         f'<rect width="{W}" height="{H}" rx="10" fill="#fbfdff"/>{"".join(art)}</svg>\n')
    return svg,alt


def graph(art,index):
    all_vertices=[*collect_points(art[0]),*collect_points(art[1])]
    xx,yy=zip(*all_vertices)
    bounds=(floor(min(min(xx),0))-1,ceil(max(max(xx),0))+1,floor(min(min(yy),0))-1,ceil(max(max(yy),0))+1)
    return view(art[index],bounds)


def study_art(key,figure,caption):
    svg,alt=graph(figure,1)
    folder=ROOT/"public/assets/study/0580/transformations-vectors"
    folder.mkdir(parents=True,exist_ok=True)
    (folder/f"{key}.svg").write_bytes(svg.encode("utf-8"))
    return dict(src=f"/assets/study/0580/transformations-vectors/{key}.svg",alt=alt,caption=p(caption),width=W,height=H)


def attach(uid,graphic,index,assets):
    svg,description=graph(graphic,index)
    data=svg.encode("utf-8")
    digest=sha256(data).hexdigest()
    path=Path("content/original/0580/transformations-vectors-assets")/f"{digest}.svg"
    (ROOT/path).parent.mkdir(parents=True,exist_ok=True)
    (ROOT/path).write_bytes(data)
    file=f"pkg_igtransvec_{digest}"
    role=("STATEMENT","SOLUTION")[index]
    if not any(a["question_uid"]==uid and a["file_id"]==file and a["role"]==role for a in assets):
        assets.append(dict(question_uid=uid,file_id=file,path=path.as_posix(),sha256=digest,size=len(data),width=W,height=H,
            mime="image/svg+xml",role=role,caption=description))
    return f'<p><img src="/api/files/{file}" width="{W}" height="{H}" alt="{escape(description,quote=True)}"></p>'


LESSONS=(
    ("translations","Translate shapes on a grid","Move every vertex by the same column vector, then describe or reverse the movement.","translation-on-grid",
     "The same move takes each original vertex to its corresponding image vertex.",
     (("read-the-column","How do the two entries tell me where to go?",8,
       "The top entry of a column vector is the horizontal movement. The lower entry is the vertical movement. Positive means right or up, and negative means left or down.",
       "Move one vertex at a time, then join corresponding image vertices in the same order. A translation preserves the shape, size and orientation.",
       "Read across first, then up or down. Swapping the two entries gives a different move.",translate,read_translation),
      ("describe-the-move","How do I find the vector from two corresponding points?",8,
       "Choose matched points and compare their x-coordinates and y-coordinates from object to image.",
       "Subtract the old coordinate from the new coordinate in each direction. Check a second corresponding pair if both shapes are shown.",
       "Give the name of the transformation as well as the vector when asked to describe a translation fully.",describe_translation,read_translation),
      ("reverse-the-move","How can I undo a translation?",7,
       "To return to the original point, reverse the horizontal and the vertical movements.",
       "Subtract the original translation vector from the image coordinates. You can also translate by the vector with both signs changed.",
       "Subtract a negative component carefully. It moves the point in the opposite direction.",undo_translation,read_translation)),
       (("Object","The original shape."),("Image","The shape after the transformation."),("Translation","A movement that applies the same displacement to every point.")),
       "Work from the object to the image when describing a translation. Draw straight edges with a ruler."),
    ("reflections","Reflect in horizontal and vertical lines","Reflect points and shapes in axis-parallel mirrors and give the equation of the mirror line.","axis-mirror",
     "Each pair of corresponding vertices is the same perpendicular distance from the mirror.",
     (("perpendicular-distance","How do I use a mirror line on the grid?",8,
       "The mirror line lies halfway along the perpendicular segment from a point to its reflection.",
       "For a vertical line, count horizontally to the mirror and continue the same number of units on the other side. For a horizontal line, count vertically.",
       "Do not count along the mirror itself. Move at right angles to it.",axis_reflection,mirror_fixed),
      ("recognise-the-mirror","How can I find the mirror line from an object and image?",8,
       "Join a point to its image. The mirror passes through the midpoint of this segment and is perpendicular to it.",
       "When only x changes, the mirror is vertical and its equation starts with x. When only y changes, it is horizontal and its equation starts with y.",
       "Write a line such as x = 3 as an equation, using the coordinate that is fixed along the entire line.",infer_mirror,axis_reflection),
      ("test-a-fixed-point","What if the vertex already lies on the mirror?",7,
       "A point on the mirror has zero perpendicular distance from it. The point remains in exactly the same place after reflection.",
       "After reflecting each vertex, check lengths and orientation. The reflected image is the same size with its orientation reversed.",
       "A repeated vertex label can mark a point shared by object and image. Keep it in both shapes.",mirror_fixed,infer_mirror)),
       (("Mirror line","The line halfway between a point and its reflection."),("Perpendicular","Meeting at a right angle."),("Fixed point","A point that maps to itself.")),
       "For a full description, give reflection and the equation of the mirror line."),
    ("rotations","Rotate about the origin, a vertex or a midpoint","Use quarter-turns and half-turns about Core centres and fully describe a rotation.","rotation-centre",
     "The centre stays fixed, and every vertex keeps its distance from it.",
     (("quarter-turn","How do I make a quarter-turn on a grid?",8,
       "Find the centre and imagine an arm from it to a vertex. The arm changes direction by a quarter-turn and keeps the same length.",
       "Use tracing paper or count the relative steps from the centre. For an anticlockwise quarter-turn, an arm pointing right turns up. Check the sense before marking the image.",
       "Read the centre from the question. Turning round the origin gives a different image when the centre is elsewhere.",rotation,describe_rotation),
      ("hold-the-centre","How do I rotate about a vertex or midpoint?",8,
       "Locate the centre first. If it is a midpoint, mark it halfway between the two given vertices. Leave the centre in place.",
       "Rotate each relative movement from this centre. For a half-turn, the image lies the same distance on the opposite side of the centre.",
       "A centre can lie on an edge. It only stays in the same place itself, not the entire edge.",rotation,describe_rotation),
      ("describe-the-turn","What do I include in a full description?",8,
       "A full description uses the name rotation, the centre, the angle and the direction when the directions differ.",
       f"Use a corresponding ray from the centre to compare its before and after directions. A {m(r'180^\circ')} turn has the same result in either sense.",
       "An angle without a centre does not specify one rotation.",describe_rotation,rotation)),
       (("Centre of rotation","The point that stays fixed when the shape turns."),("Quarter-turn","A turn through 90 degrees."),("Clockwise","The direction followed by the hands of a clock.")),
       "State the centre and angle. Add clockwise or anticlockwise for a quarter-turn."),
    ("positive-enlargements","Enlarge from a centre with a positive factor","Draw larger and reduced images from a centre, and recover a positive scale factor or centre.","positive-scale",
     "The image stays on the same ray from the centre when the scale factor is positive.",
     (("scale-along-a-ray","How do I measure from the centre?",8,
       "The centre and each pair of corresponding vertices lie on one ray for a positive factor.",
       f"For example, a factor of {m(2)} puts an image vertex twice as far from the centre. A factor of {m(r'\frac12')} puts it halfway along the same ray.",
       "Scale a vertex's displacement from the centre. Multiplying its absolute coordinates works only when the centre is the origin.",enlargement,scale_factor),
      ("compare-distances","How can I recover the scale factor?",8,
       "Compare two matching lengths, or compare the distances from the centre to an original point and its image.",
       "Divide image length by object length. If the image is smaller, the positive factor is between zero and one.",
       "Dividing in the opposite order gives the factor for going back to the object.",scale_factor,enlargement),
      ("find-the-meeting-point","How can I find a missing centre?",8,
       "Draw straight lines joining matched vertices, then extend them. The common meeting point is the centre of enlargement.",
       "Use two non-parallel joins. Verify the same factor at a second vertex after locating the centre.",
       "The meeting point may be outside both shapes, so extend the joins far enough.",enlargement_centre,describe_enlargement)),
       (("Enlargement","A change of scale from a fixed centre."),("Scale factor","The ratio of a signed image displacement to the matching original displacement."),("Ray","A straight half-line beginning at a given point.")),
       "Describe an enlargement with the transformation name, the scale factor and the centre."),
    ("extended-constructions","Use diagonal mirrors, other centres and negative factors","Extended: reflect in any straight mirror, rotate round a specified centre and interpret a negative scale factor.","diagonal-mirror",
     "The joins from the original points to their images meet the diagonal mirror at right angles.",
     (("reflect-across-a-diagonal","How do I reflect across a diagonal or oblique line?",9,
       "Use the perpendicular to the mirror through the vertex. Find the perpendicular foot, then continue the same distance beyond it.",
       "For a diagonal on a square grid, the perpendicular is the other diagonal direction. For a general straight line, use a constructed right angle or a known perpendicular foot.",
       "The horizontal distance is not the perpendicular distance for an oblique mirror.",diagonal_reflection,general_mirror),
      ("turn-about-other-centres","What if the rotation centre is outside the object?",8,
       "Translate your thinking to the centre: compare each vertex with that centre, rather than with the origin of the whole grid.",
       "Turn the relative movement by the stated angle, then start from the centre and make the new movement.",
       "The distance from the centre must be unchanged after any rotation.",off_origin_rotation,diagonal_reflection),
      ("interpret-a-negative-scale","What changes when the scale factor is negative?",9,
       "The image moves to the opposite ray from the centre. The magnitude of the factor controls the size of the image.",
       f"A factor of {m(r'-\frac12')} means half the original distance away, on the opposite side. A factor of {m(-2)} doubles the distance on that opposite ray.",
       "Keep the sign in the description. The size alone cannot tell you which side of the centre the image is on.",negative_enlargement,negative_factor)),
       (("Perpendicular foot","The point where a perpendicular meets the mirror line."),("Centre","The point from which a transformation is measured."),("Negative scale factor","A factor that places the image on the opposite ray from the centre.")),
       "Use the mirror's perpendicular direction and the correct signed factor. Label the centre on the diagram."),
    ("combined-transformations","Apply and describe combined transformations","Extended: keep track of the order of two steps and identify a single equivalent transformation where it exists.","intermediate-and-image",
     "Blue is the object, purple the intermediate shape and green the final image.",
     (("show-the-intermediate","Which shape goes into the second transformation?",9,
       "The object for the second step is the image from the first step. A labelled intermediate figure makes it clear which points to move next.",
       "Complete the stated first transformation and label its vertices. Apply the second one to those vertices, then give the final image.",
       "Swapping the steps can move the final image to a different position.",combined,describe_composed),
      ("compose-parallel-mirrors","What do two parallel reflections do?",9,
       "Each reflection reverses the orientation. Two such reflections restore it. With parallel mirrors, the final movement is a translation.",
       "Its component perpendicular to the mirrors is twice the signed separation from the first mirror to the second. Its parallel component is zero.",
       "Use the difference between the mirror positions, with its sign. Reversing the reflections reverses the translation.",combine_mirrors,combined),
      ("name-the-single-map","How can I check whether one step has the same effect?",8,
       "Follow a point through the two steps and express the final coordinates in terms of the original ones. Compare that rule with a known transformation.",
       "Confirm that the same single rule works for the whole shape. Give the line, centre, factor, angle or vector required by that transformation.",
       "A single description has to be true for every vertex, not just the first one you checked.",describe_composed,combine_mirrors)),
       (("Composition","A sequence of transformations applied in a specified order."),("Intermediate image","The result after one step and before the next."),("Equivalent transformation","A transformation that gives the same result on every point.")),
       "Label the intermediate and final figures separately. A single equivalent description still needs all its defining details."),
    ("vector-arithmetic","Add, subtract and scale vectors","Extended: read directed displacements, combine column vectors and multiply every component by a scalar.","route-and-resultant",
     "Travelling from O to A and then to B gives the same displacement as going directly from O to B.",
     (("read-a-directed-segment","What changes if I reverse the arrow?",8,
       f"The first letter of {m(r'\overrightarrow{AB}')} is the start and the second is the end. Its components are obtained from end minus start.",
       "Reversing the arrow changes the signs of both components and keeps the length.",
       "A vector describes a movement, so it can be drawn from a different starting point without changing its components.",displacement,component_sum),
      ("combine-two-arrows","How do I add or subtract two vectors?",8,
       "To add, put the tail of the next arrow at the head of the first. The resultant goes directly from the original start to the final end.",
       "Add matching components. To subtract a vector, reverse both of its signs and add the reversed vector.",
       "Do not cross the components or reverse only one sign when subtracting.",component_sum,vector_expression),
      ("scale-a-vector","What does a scalar do to a vector?",8,
       "A scalar multiplies both components. A positive scalar keeps the direction. A negative scalar points in the opposite direction.",
       "Apply any scalars first, then add or subtract the resulting components. State the complete column vector.",
       "A negative scalar does not change just the vertical direction. It reverses the whole vector.",scale_vector,vector_expression)),
       (("Vector","A quantity with size and direction."),("Component","The horizontal or vertical part of a vector."),("Scalar","An ordinary number multiplying a vector.")),
       "Use the same order for horizontal and vertical components throughout your calculation."),
    ("vector-magnitude","Find vector magnitudes","Extended: use perpendicular components to find a vector length, including exact roots and a missing component.","magnitude-triangle",
     "The directed vector is the diagonal of the right triangle whose legs are the horizontal and vertical movements.",
     (("take-the-diagonal","Why do I square the components?",8,
       f"The horizontal and vertical components are perpendicular. Pythagoras gives {m(r'\sqrt{x^2+y^2}')} for the magnitude.",
       "Square each signed component with brackets, add the squares, then take the non-negative square root.",
       "Adding component lengths gives an L-shaped route. The magnitude is the length of the direct movement.",magnitude,segment_magnitude),
      ("form-the-vector-first","How do I find the magnitude between two points?",8,
       "First find the directed displacement by subtracting the starting position from the final position. Then apply Pythagoras to the two resulting components.",
       "Replacing a vector by a negative multiple can reverse its direction. Its length scales by the absolute value of that multiple.",
       "A vector can have negative components. A magnitude cannot be negative.",segment_magnitude,scaled_magnitude),
      ("undo-a-magnitude","How can I recover a missing component?",8,
       "Square the given length and take away the square of the known component. The result is the square of the unknown component.",
       "Use the required sign to choose a square root when the question states a direction or sign.",
       "The given magnitude is already a length. Square it before using it in the inverse calculation.",unknown_component,magnitude)),
       (("Magnitude","The non-negative length of a vector."),("Modulus signs","The vertical bars around a vector that indicate its magnitude."),("Hypotenuse","The side opposite the right angle in a right triangle.")),
       "Keep an exact square root if requested. Put negative components in brackets before squaring."),
    ("vector-routes","Use position vectors, routes and ratios","Extended: use arrows through the origin and express midpoints and internal divisions in terms of two vector directions.","position-and-displacement",
     "Position vectors start at O. The directed displacement from S to U starts at S.",
     (("separate-starts-and-ends","Which arrows start at the origin?",8,
       "A position vector always starts at the origin. A displacement between two points starts at the named first point and may not touch the origin.",
       "Use end position minus start position. This combines the backwards journey to the origin with the forward journey to the end point.",
       "The named endpoint and the displacement can have different components even though they finish at the same point.",position_difference,route_ab),
      ("follow-a-route","How do I write a route using two directions?",8,
       "Follow a known route and add its movements. Reverse the sign of any vector used in the opposite direction.",
       f"If {m(r'\overrightarrow{OA}=\mathbf a')} and {m(r'\overrightarrow{OB}=\mathbf b')}, then {m(r'\overrightarrow{AB}=\mathbf b-\mathbf a')}.",
       "Changing the order of the letters changes the sign of the displacement.",route_ab,midpoint),
      ("divide-a-segment","What part of the full segment do I travel?",9,
       "An internal ratio counts parts on both sides of the point. Add the two numbers to find the total parts.",
       "To get a position vector, reach the first endpoint from the origin and then travel the required fraction of the full segment.",
       "A ratio such as 2 : 3 gives two fifths from the first end. It does not give two thirds of the full segment.",ratio_point,midpoint)),
       (("Position vector","The arrow from the origin to a point."),("Displacement","A directed change of position."),("Internal division","Splitting a segment with a point between its endpoints.")),
       "Name the starting point of each arrow. Use the total ratio parts as the denominator for a fraction of the whole segment."),
    ("vector-proofs","Prove parallel, collinear and similar relationships","Extended: use a scalar multiple and a shared point, recover ratios and compare the corresponding sides of similar triangles.","common-scale-triangles",
     "Both points on the smaller triangle have the same scale from O, so its opposite side is parallel to the larger side.",
     (("common-scalar","How can I show that two vectors are parallel?",8,
       "Two nonzero vectors are parallel when one is a scalar multiple of the other. The scalar may be positive or negative.",
       "Find a multiplier from one nonzero component, then check it scales the other component too. For an expression in two independent vectors, compare both coefficients.",
       "Matching a single component is insufficient. Check the entire vector relationship.",proportional_vectors,collinearity),
      ("share-the-line","What extra step proves that points are collinear?",9,
       "Parallel directions can belong to different lines. To show that three points lie on one line, use two displacements with a common endpoint.",
       "For example, show that AC is a scalar multiple of AB and note that the two segments meet at A. The scalar can also locate C along that line.",
       "When using a ratio, check where the point lies. A fraction between zero and one puts it between the endpoints.",collinearity,prove_a_ratio),
      ("show-the-similarity","How do I link a scalar and triangle similarity?",9,
       "When two rays from a common vertex are scaled by the same positive factor, the new triangle is an enlargement of the old one.",
       "Subtract the two new position vectors to find the third side. Its scalar relationship to the old side gives the direction and the length ratio.",
       "Use corresponding sides in the same order. Reversing one arrow introduces a minus sign.",similar_triangles,prove_a_ratio)),
       (("Parallel vectors","Nonzero vectors whose directions differ only by a scalar, including a negative scalar."),("Collinear points","Points that lie on one straight line."),("Similar triangles","Triangles with equal corresponding angles and a common scale factor for their sides.")),
       "A proof of collinearity needs both a scalar multiple and a common point. State the scale used when proving a ratio."),
)


BANK=(
    ((translate,read_translation,undo_translation,translate,describe_translation),
     (("Move vertices and describe the move",(translate,read_translation)),("Draw the translated image",(draw_translation,undo_translation)),
      ("Read a move and undo it",(read_translation,undo_translation)),("Connect a grid move and its reverse",(draw_translation,read_translation,undo_translation)),
      ("Use translations in both directions",(undo_translation,translate,describe_translation)))),
    ((axis_reflection,infer_mirror,mirror_fixed,axis_reflection,infer_mirror),
     (("Reflect points and name the mirror",(axis_reflection,infer_mirror)),("Draw a reflected triangle",(draw_axis_reflection,mirror_fixed)),
      ("Recover an axis-parallel mirror",(infer_mirror,axis_reflection)),("Construct and describe a reflection",(draw_axis_reflection,infer_mirror,mirror_fixed)),
      ("Use fixed and reflected points",(mirror_fixed,axis_reflection,infer_mirror)))),
    ((rotation,describe_rotation,rotation,describe_rotation,rotation),
     (("Rotate and give a complete description",(rotation,describe_rotation)),("Draw a rotation about a stated centre",(draw_rotation,describe_rotation)),
      ("Track two rotations",(describe_rotation,rotation)),("Draw and check Core rotation centres",(draw_rotation,rotation,describe_rotation)),
      ("Check the angle, centre and direction",(describe_rotation,rotation,describe_rotation)))),
    ((enlargement,scale_factor,enlargement_centre,enlargement,describe_enlargement),
     (("Construct and read a positive enlargement",(enlargement,scale_factor)),("Draw the scaled triangle",(draw_enlargement,enlargement_centre)),
      ("Find a positive factor and recover a centre",(scale_factor,enlargement_centre)),("Construct and verify the scale",(draw_enlargement,scale_factor,enlargement_centre)),
      ("Check rays, centre and factor",(enlargement,scale_factor,describe_enlargement)))),
    ((diagonal_reflection,general_mirror,off_origin_rotation,negative_enlargement,negative_factor),
     (("Reflect in lines at an angle",(diagonal_reflection,general_mirror)),("Rotate about an external centre",(off_origin_rotation,diagonal_reflection)),
      ("Interpret negative scale factors",(negative_enlargement,negative_factor)),("Handle three Extended constructions",(diagonal_reflection,off_origin_rotation,negative_enlargement)),
      ("Use an oblique line and a signed factor",(general_mirror,negative_factor,negative_enlargement)))),
    ((combined,combine_mirrors,describe_composed,combined,combine_mirrors),
     (("Keep the intermediate image",(combined,describe_composed)),("Draw two transformations in order",(draw_combined,combine_mirrors)),
      ("Recognise the single equivalent transformation",(combine_mirrors,describe_composed)),("Track the intermediate, final and equivalent movements",(draw_combined,combine_mirrors,describe_composed)),
      ("Check composition order",(combined,describe_composed,combine_mirrors)))),
    ((displacement,component_sum,scale_vector,vector_expression,component_sum),
     (("Calculate a directed movement and sum",(displacement,component_sum)),("Scale and combine column vectors",(scale_vector,vector_expression)),
      ("Reverse arrows and subtract components",(displacement,vector_expression)),("Use two components consistently",(component_sum,scale_vector,vector_expression)),
      ("Follow the direction and signs",(displacement,component_sum,scale_vector)))),
    ((magnitude,segment_magnitude,scaled_magnitude,unknown_component,magnitude),
     (("Compare vector and segment lengths",(magnitude,segment_magnitude)),("Scale the magnitude and find a missing component",(scaled_magnitude,unknown_component)),
      ("Calculate two exact lengths",(segment_magnitude,magnitude)),("Use both forward and inverse magnitude calculations",(magnitude,unknown_component,scaled_magnitude)),
      ("Find lengths after changing direction and scale",(scaled_magnitude,segment_magnitude,unknown_component)))),
    ((position_difference,route_ab,ratio_point,midpoint,ratio_point),
     (("Use the origin and identify the displacement",(position_difference,route_ab)),("Find a midpoint and an internal division",(midpoint,ratio_point)),
      ("Follow a route in two directions",(route_ab,position_difference)),("Use positions and ratio lengths",(position_difference,midpoint,ratio_point)),
      ("Find displacements and internal positions",(ratio_point,route_ab,midpoint)))),
    ((proportional_vectors,collinearity,similar_triangles,prove_a_ratio,collinearity),
     (("Prove parallel and collinear relationships",(proportional_vectors,collinearity)),("Compare two similar triangles",(similar_triangles,prove_a_ratio)),
      ("Connect the shared point to a ratio",(collinearity,prove_a_ratio)),("Use scalar relationships in three ways",(similar_triangles,proportional_vectors,collinearity)),
      ("Prove a ratio and compare side lengths",(prove_a_ratio,similar_triangles,collinearity)))),
)

EXTRA_DIAGRAMS={
    (4,1):("off-centre-turn","Measure each turn from the marked centre, which is outside the original shape."),
    (4,2):("negative-scale","With a negative factor the image is on the opposite side of the centre."),
    (8,2):("line-division","Travel from O to A, then the stated fraction of the way from A to M."),
}


def distinct(make,seed,used):
    for extra in range(350):
        q=make(seed+extra)
        sentences={q["prompt"]}
        if q["write"]:
            sentences.add(q["write"])
        if used.isdisjoint(sentences):
            used.update(sentences)
            return q,seed+extra
    raise ValueError(f"No distinct question available for {make.__name__}")


def choices(q):
    if not q["field"].get("options"):
        return q["prompt"]
    return q["prompt"]+'<ol type="A">'+"".join(f"<li>{v}</li>" for v in q["field"]["options"].values())+"</ol>"


def check(uid,q):
    return dict(id=uid,kind="check",title=q["title"],prompt=q["prompt"],field=q["field"],hint=q["hint"],
                solution="".join(q["solution"]),retry=q["retry"])


def short_q(uid,family,key,q,difficulty,variant,assets):
    prompt=q["prompt"]+ (attach(uid,q["art"],0,assets) if q["art"] else "")
    return dict(id=uid,family_uid=family,title=q["title"],lesson=key,collection="variant" if variant else "short",difficulty=difficulty,
        marks=1,prompt_html=prompt,answer_html=p(q["answer"]),solution_html="".join(q["solution"]),hint_html=q["hint"],fields=[q["field"]],
        parts=[dict(label="a",marking_criteria=[dict(code="B1",marks=1,description_html=p(q["answer"]))])],verification=uid)


def written_q(uid,family,key,title,data,difficulty,variant,assets):
    prompts,answers,solutions,hints,parts=[],[],[],[],[]
    for j,q in enumerate(data):
        label=chr(97+j)
        trace=q["art"]
        picture=attach(uid,trace,0,assets) if trace else ""
        answer_picture=attach(uid,trace,1,assets) if trace and trace[0]!=trace[1] else ""
        rewards=q["criteria"]
        if q["title"]=="Describe the centre, angle and direction":
            rewards[-1]["guidance_html"]=p("Accept the opposite sense with the equivalent angle for a quarter-turn.")
        prompts.append(f'<li>{q["write"] or choices(q)}{picture}<span class="marks">[{len(rewards)}]</span></li>')
        answers.append(p(f"({label}) {q['answer']}"))
        solutions.append(f"<h4>({label})</h4>"+"".join(q["solution"])+answer_picture)
        hints.append(p(f"({label})")+q["hint"])
        parts.append(dict(label=label,marking_criteria=rewards))
    return dict(id=uid,family_uid=family,title=title,lesson=key,collection="exam",variant_index=variant,difficulty=difficulty,
        marks=sum(len(v["marking_criteria"]) for v in parts),prompt_html='<ol class="parts" type="a">'+"".join(prompts)+"</ol>",
        answer_html="".join(answers),solution_html="".join(solutions),hint_html="".join(hints),fields=[],parts=parts,verification=uid)


def build():
    metadata,study,questions,assets=[],{},[],[]
    used=set()
    for i,(key,title,summary,art_name,caption,rows,terms,tip) in enumerate(LESSONS):
        uid=PREFIX+key
        sections,examples,extra=[],[],[]
        figure=None
        representative=2 if key=="vector-proofs" else 0
        for j,(anchor,heading,minutes,idea,method,mistake,first,second) in enumerate(rows):
            seed=4+37*i+11*j+(1 if i==9 and j==2 else 0)
            e1,e1_seed=distinct(first,seed,used)
            e2,_=distinct(second,seed+2,used)
            offset=len(examples)
            for q in (e1,e2):
                examples.append(dict(title=q["title"],question=choices(q),solution=q["solution"]))
            drawing=None
            if j==representative:
                source=e1["art"] if e1["art"] else arrow_scene((0,0),magnitude_values(e1_seed))
                figure=study_art(art_name,source,caption)
                drawing=figure
            if (i,j) in EXTRA_DIAGRAMS:
                name,label=EXTRA_DIAGRAMS[(i,j)]
                drawing=study_art(name,e1["art"],label)
            first_check=distinct(first,seed+1,used)[0]
            second_check=distinct(second,seed+3,used)[0]
            blocks=[dict(kind="key",html=p(idea),**({"figure":drawing} if drawing else {})),dict(kind="text",title="Practise the method",html=p(method)),
                dict(kind="example",index=offset),check(f"{uid}-{anchor}-a",first_check),dict(kind="mistake",html=p(mistake)),
                dict(kind="example",index=offset+1,tryFirst=True),check(f"{uid}-{anchor}-b",second_check)]
            if j==len(rows)-1:
                blocks.append(dict(kind="tip",html=p(tip)))
            sections.append(dict(id=anchor,title=heading,label=anchor.replace("-"," ").capitalize(),minutes=minutes,level="core" if i<4 else "extension",blocks=blocks))
            extra.extend([check(f"{uid}-{anchor}-extra-a",distinct(first,seed+5,used)[0]),check(f"{uid}-{anchor}-extra-b",distinct(second,seed+8,used)[0])])
        reference=examples[2*representative]
        revision="".join(f"<h2>{row[1]}</h2>"+p(row[3])+p(row[4]) for row in rows)
        revision+="<h2>Quick worked example</h2>"+reference["question"]+"".join(reference["solution"])
        revision+=f'<p><img src="{figure["src"]}" width="310" alt="{escape(figure["alt"],quote=True)}"></p>'
        related=[dict(title=LESSONS[i-1][1],href=f"/courses/{COURSE}/topics/{PREFIX}{LESSONS[i-1][0]}")] if i else []
        study[uid]=dict(updatedOn=DATE,description=summary,sections=sections,examples=examples,extraPractice=extra,related=related,
            glossary=[dict(term=term,definition=p(comment)) for term,comment in terms],
            revision=dict(body=revision,checks="<ul><li>Read each point in x, y order.</li><li>Check the direction of the movement.</li><li>Give all details required in your description.</li></ul>",examTip=p(tip)))
        metadata.append(dict(key=key,id=uid,title=title,summary=summary,objective=summary,
            before=p("For Core and Extended. Be able to plot and read points on a coordinate grid." if i<4 else "For Extended. Recall how to read coordinates and directed movements on a grid."),
            ideas="".join(p(row[3]) for row in rows),method="".join(f"<h4>{row[1]}</h4>"+p(row[4]) for row in rows),mistakes=[row[5] for row in rows],
            examples=[dict(question=e["question"],title=e["title"],solution="".join(e["solution"]),verification=f"{uid}-example-{j}") for j,e in enumerate(examples[::2],1)]))
        short,written=BANK[i]
        for j,make in enumerate(short,1):
            family=f"M4U-0580-TV-{key}-P{j}"
            for version in range(2):
                q=distinct(make,91+i*59+j*17+version,used)[0]
                questions.append(short_q(f"{family}-{version}",family,key,q,1+(j-1)//2,version,assets))
        for j,(name,methods) in enumerate(written,1):
            family=f"M4U-0580-TV-{key}-W{j}"
            for version in range(4):
                data=[distinct(make,179+i*101+j*13+version+k*9,used)[0] for k,make in enumerate(methods)]
                questions.append(written_q(f"{family}-{version}",family,key,name,data,min(4,j),version,assets))
    manifest=dict(schema_version=1,key="0580-transformations-vectors",version="1.0.0",marking_status="DRAFT",
        course=dict(slug=COURSE,title="Cambridge IGCSE Mathematics (0580)",code="0580",direction="igcse"),
        chapter=dict(id="igcse_0580_transformations_vectors",slug="transformations-and-vectors",title="Transformations and vectors",position=35),
        source=dict(sha256=sha256(Path(__file__).read_bytes()).hexdigest(),supplied=0,held=[]),lessons=metadata,questions=questions,assets=assets)
    output=ROOT/"content/original/0580"
    for name,data in (("transformations-vectors-v1.json",manifest),("transformations-vectors-study.json",study)):
        (output/name).write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(f"{len(metadata)} lessons, {len(questions)} questions, {len(assets)} graphical placements")


if __name__=="__main__":
    build()
