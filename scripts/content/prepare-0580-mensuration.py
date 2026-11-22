"""Generate Arena's Core and Extended 0580 mensuration lessons."""

from fractions import Fraction
from hashlib import sha256
from html import escape
import json
from pathlib import Path
from runpy import run_path


ROOT = Path(__file__).resolve().parents[2]
shared = run_path(str(Path(__file__).with_name("prepare-0580-number-types.py")))
p, m, fraction, task, check, table = (shared[key] for key in ("p", "m", "fraction", "task", "check", "table"))
bank_item = run_path(str(Path(__file__).with_name("prepare-0580-ratio-proportion.py")))["bank_item"]
ALTS = ((0, 1), (1, 2), (2, 0), (0, 2), (2, 1))


def tex(value):
    value = Fraction(value)
    return fraction(value.numerator, value.denominator)


def response(title, prompt, unit, value, calculation, method, trap=None, pi=False):
    value = Fraction(value)
    shown = tex(value) + (r"\pi" if pi else "")
    expected = f"({value})*pi" if pi else str(value)
    if pi:
        prompt += " Give your answer in terms of " + m(r"\pi") + "."
    retry = None
    if trap is not None and Fraction(trap[0]) != value:
        retry = (f"({trap[0]})*pi" if pi else str(trap[0]), trap[1])
    result = m(shown) + " " + unit
    q = task(title, prompt, f"Answer in {unit}" if unit else "Answer", expected,
             [method, m(calculation) + ".", f"The result is {result}."], method, retry)
    return dict(q, method=method, result=result)


METRIC = (("mm", "cm", 10, "The length of a label"), ("cm", "m", 100, "The width of a workbench"),
          ("m", "km", 1000, "The length of a trail"), ("g", "kg", 1000, "The mass of a parcel"),
          ("kg", "t", 1000, "The mass of a load of bricks"))


def metric(i, mode):
    small, big, factor, context = METRIC[(i + mode) % len(METRIC)]
    amount = i + 17
    if mode == 0:
        n = Fraction(amount, 10)
        return response("Convert to a smaller metric unit", f"{context} is {m(tex(n))} {big}. Give it in {small}.",
                        small, n * factor, fr"{tex(n)}\times {factor}={tex(n*factor)}",
                        f"There are {factor} {small} in one {big}. Multiply by {factor}.", (n / factor, "Use more of the smaller units to describe the same measurement."))
    n = 10 * amount
    if mode == 1:
        return response("Convert to a larger metric unit", f"{context} is {n} {small}. Give it in {big}.", big, Fraction(n, factor),
                        fr"{n}\div {factor}={tex(Fraction(n,factor))}", f"Group the {small} into sets of {factor} to make one {big}.",
                        (n * factor, "The number should get smaller when the unit gets larger."))
    return response("Add measurements in different units", f"{context} is {amount} {big}. Another {2*amount} {small} is added. Give the total in {small}.",
                    small, amount * (factor + 2), fr"{amount}\times {factor}+{2*amount}={amount*(factor+2)}",
                    "Convert to a common unit before adding.", (3 * amount, "The two numbers cannot be added until they count the same units."))


def units(i, mode):
    amount = 12 + i
    if mode == 0:
        return response("Convert square metres into square centimetres", f"Convert {m(tex(Fraction(amount,10)))} m² into cm².", "cm²",
                        1000 * amount, fr"{tex(Fraction(amount,10))}\times 100^2={1000*amount}",
                        "A square metre is 100 cm wide and 100 cm long. Multiply by 100 twice.",
                        (10 * amount, "That converts a length. The area has two dimensions."))
    if mode == 1:
        return response("Convert between cubic centimetres and cubic metres", f"Convert {1000*amount} cm³ into m³.", "m³", Fraction(amount, 1000),
                        fr"{1000*amount}\div 100^3={tex(Fraction(amount,1000))}",
                        "There are 100 centimetres in a metre along each of the three dimensions.",
                        (10 * amount, "Divide by 100 for each of the three dimensions."))
    if i % 3 == 0:
        return response("Convert a capacity from cubic metres to litres", f"A tank holds {m(tex(Fraction(amount,10)))} m³. How many litres is this?", "L",
                        100 * amount, fr"{tex(Fraction(amount,10))}\times 1000={100*amount}",
                        "A cubic metre holds one thousand litres.", (amount, "One cubic metre is 1000 litres, not 10 litres."))
    return response("Convert between cubic centimetres and litres", f"A container holds {amount*75} cm³. Give its capacity in litres.", "L",
                    Fraction(amount * 75, 1000), fr"{amount*75}\div 1000={tex(Fraction(amount*75,1000))}",
                    "Each cubic centimetre is one millilitre. Divide by 1000 to find litres.",
                    (amount * 75, "That is the number of millilitres. There are 1000 mL in one litre."))


def other_units(i, mode):
    amount = 3 + i
    dimensions = 2 if mode < 2 else 3
    small, big, factor = (("mm²", "cm²", 10), ("m²", "km²", 1000), ("mm³", "cm³", 10))[mode]
    if mode == 1:
        return response("Convert square metres to square kilometres", f"An area is {amount*10000} {small}. Convert it to {big}.", big, Fraction(amount,100),
            fr"{amount*10000}\div 1000^2={tex(Fraction(amount,100))}", "Divide by 1000 for each dimension.",
            (amount*10, "That factor would convert metres into kilometres. Divide by 1000 twice for area."))
    return response("Convert each dimension using the length scale", f"Convert {amount} {big} into {small}.", small, amount*factor**dimensions,
        fr"{amount}\times {factor}^{dimensions}={amount*factor**dimensions}", f"One centimetre is {factor} millimetres. Apply the factor in all {dimensions} dimensions.",
        (amount*factor, "The length conversion alone does not include every dimension."))


def polygon_edges(i, mode):
    base, height = 6+i, 3+i%4
    if mode == 0:
        a, b, c = base, base-2, base-3
        return response("Trace the three sides of a triangle", f"A triangle has sides of length {a} cm, {b} cm and {c} cm. Find its perimeter.", "cm", a+b+c,
            fr"{a}+{b}+{c}={a+b+c}", "Add the three sides once each to get the distance round the triangle.",
            (a+b, "Include the third boundary edge as well."))
    if mode == 1:
        side = height+2
        return response("Distinguish sloping side from perpendicular height", f"A parallelogram has base {base} cm, sloping side {side} cm and perpendicular height {height} cm. Find its perimeter.",
            "cm", 2*(base+side), fr"2({base}+{side})={2*(base+side)}", "Opposite sides match. Add both bases and both sloping sides.",
            (2*(base+height), "The perpendicular height is for area. The boundary follows the sloping side."))
    k = 2+i
    top, bottom, leg, height = 2*k, 8*k, 5*k, 4*k
    return response("Trace both parallel and both sloping sides", f"A trapezium has parallel sides of length {top} cm and {bottom} cm, and equal sloping sides of length {leg} cm. Its perpendicular height is {height} cm. Find its perimeter.",
        "cm", top+bottom+2*leg, fr"{top}+{bottom}+2\times {leg}={top+bottom+2*leg}", "Add both parallel sides, then add both matching sloping edges.",
        (top+bottom+2*height, "The height is not one of the boundary lengths."))


def flat(i, mode):
    a, b, h = 8 + i, 5 + i % 11, 3 + i % 5
    if mode == 0 and i % 2 == 0:
        return response("Find the perimeter of a rectangle", f"A rectangular exercise area is {a} m by {b} m. How long is its boundary?", "m",
                        2 * (a + b), fr"2({a}+{b})={2*(a+b)}", "Trace its four outer edges. Each of the two dimensions appears twice.",
                        (a * b, "This is an area calculation. Add the four lengths for the perimeter."))
    if mode == 0:
        return response("Find the area of a rectangle", f"A rectangle has length {a} m and width {b} m. Find its area.", "m²", a * b,
                        fr"{a}\times {b}={a*b}", "Count the rows of square units by multiplying the two dimensions.",
                        (2 * (a + b), "That measures the boundary. Area measures what is covered inside it."))
    if mode == 1:
        triangle = i % 2 == 0
        shape = "triangle" if triangle else "parallelogram"
        value = Fraction(a * h, 2) if triangle else a * h
        expr = fr"\tfrac12\times {a}\times {h}" if triangle else fr"{a}\times {h}"
        return response(f"Use the perpendicular height of a {shape}",
                        f"A {shape} has base {a} cm and perpendicular height {h} cm. Find its area.", "cm²", value,
                        fr"{expr}={tex(value)}", "Use the height measured at a right angle to the base." + (" Take half the product for a triangle." if triangle else ""),
                        (a * h if triangle else Fraction(a * h, 2), "A triangle occupies half the matching parallelogram. Check which shape is named."))
    value = Fraction((a+b)*h,2)
    return response("Find the area of a trapezium", f"The parallel sides of a trapezium are {a} cm and {b} cm long. They are {h} cm apart. Find the area.", "cm²",
                    value, fr"\frac{{{a}+{b}}}{{2}}\times {h}={tex(value)}",
                    "Average the two parallel lengths. Multiply that average by their perpendicular separation.",
                    ((a + b) * h, "The two parallel lengths must be averaged, so divide their sum by two."))


def circles(i, mode):
    r = 3 + i
    if mode == 0:
        return response("Find circumference from diameter", f"A circular sign has diameter {2*r} cm. Find its circumference.", "cm", 2*r,
                        fr"\pi\times {2*r}={2*r}\pi", "Circumference is the distance around the circle. Use pi times the diameter.",
                        (4*r, "The diameter already spans both radii. Do not double it again."), True)
    if mode == 1:
        return response("Find circle area from diameter", f"A circular opening is {2*r} cm across through its centre. Find its area.", "cm²", r*r,
                        fr"\pi\times {r}^2={r*r}\pi", "Halve the diameter first. Square the radius to find the area.",
                        (4*r*r, "The area formula uses the radius. Halve the given diameter before squaring."), True)
    angle = (45,60,90,120,180)[i%5]
    area = i%2==0
    value = Fraction(angle * (r*r if area else 2*r),360)
    return response("Find the area of a familiar sector" if area else "Find the length of a familiar arc",
                    f"A sector has radius {r} cm and central angle {m(fr'{angle}^\circ')}. Find {'its area' if area else 'the curved arc length'}.",
                    "cm²" if area else "cm", value, fr"\frac{{{angle}}}{{360}}\times {r*r if area else 2*r}\pi={tex(value)}\pi",
                    "Find the fraction of a turn, then use the same fraction of the whole circle's " + ("area." if area else "circumference."),
                    (r*r if area else 2*r, "That gives a full circle. The sector covers only part of one turn."), True)


def sectors(i, mode):
    r, a = 7 + i, 46 + i%39
    if mode != 2:
        angle = 360-a if mode else a
        area = i%2==0
        value = Fraction(angle * (r*r if area else 2*r),360)
        return response("Use the reflex angle for the major sector" if mode else "Use the marked angle for the minor sector",
                        f"Two radii of a circle of radius {r} cm enclose a minor angle of {m(fr'{a}^\circ')}. Find the "
                        f"{'area' if area else 'arc length'} of the {'major' if mode else 'minor'} sector.", "cm²" if area else "cm", value,
                        fr"\frac{{{angle}}}{{360}}\times {r*r if area else 2*r}\pi={tex(value)}\pi",
                        (f"The major angle is 360° minus {a}°. " if mode else "Use the given minor angle. ")+"Multiply the whole-circle measurement by its fraction of a full turn.",
                        (Fraction((360-angle)*(r*r if area else 2*r),360),"You found the other sector. Mark the smaller and larger regions before choosing the angle."), True)
    value = Fraction(2*r*a,360)
    return response("Find the angle from an arc length", f"A minor arc is {m(tex(value)+r'\pi')} cm long on a circle of radius {r} cm. Find its central angle in degrees.",
                    "degrees", a, fr"360\times\frac{{{tex(value)}\pi}}{{{2*r}\pi}}={a}",
                    "Compare the arc length with the full circumference, then multiply the fraction by 360°.",
                    (360-a, "That is the angle for the remaining arc. Use the given arc alone."))


def prisms(i, mode):
    a,b,c=6+i,3+i%7,2+i%5
    if mode==0:
        return response("Find the volume of a triangular prism", f"A prism has a triangular cross-section with base {a} cm and perpendicular height {b} cm. Its length is {c} cm. Find its volume.",
                        "cm³", Fraction(a*b*c,2), fr"\frac{{{a}\times {b}}}{{2}}\times {c}={tex(Fraction(a*b*c,2))}",
                        "Find the area of one triangular end. Multiply it by the constant length of the prism.",
                        (a*b*c,"You used the matching rectangle for the cross-section. Take half for the triangle."))
    if mode==1:
        value=2*(a*b+a*c+b*c)
        return response("Find the surface area of a cuboid", f"A sealed cuboid measures {a} cm by {b} cm by {c} cm. Find its total surface area.", "cm²", value,
                        fr"2({a*b}+{a*c}+{b*c})={value}", "Find the area of one face from each pair of opposites. Double the sum.",
                        (value//2,"The three calculated faces have matching opposite faces."))
    volume=i%2==0
    value=a*a*c if volume else 2*a*c+2*a*a
    return response("Find the volume of a cylinder" if volume else "Find the total surface area of a cylinder",
                    f"A closed cylinder has radius {a} cm and vertical height {c} cm. Find its {'volume' if volume else 'total surface area'}.",
                    "cm³" if volume else "cm²", value,
                    (fr"\pi\times {a}^2\times {c}" if volume else fr"2\pi\times {a}\times {c}+2\pi\times {a}^2")+fr"={value}\pi",
                    "Multiply the area of one circular cross-section by the height." if volume else "Unroll the curved wall into a rectangle. Add the two circular end caps.",
                    (a*a if volume else 2*a*c,"Include the length of the solid when finding volume." if volume else "That is the curved wall alone. The closed cylinder also has two circular faces."),True)


def prism_surface(i, mode):
    k, length = 2+i, 6+i%9
    a, b, c = 3*k, 4*k, 5*k
    ends = a*b
    sides = (a+b+c)*length
    if mode == 0:
        return response("Count the two end faces", f"A closed prism has right-angled triangular ends. The two perpendicular sides of each triangle are {a} cm and {b} cm long. Find the combined area of both ends.",
            "cm²", ends, fr"2\times\frac{{{a}\times {b}}}{{2}}={ends}", "Use the perpendicular dimensions to find one triangle's area. Double that for the pair.",
            (Fraction(ends,2), "That is one triangular end. The other end has the same area."))
    if mode == 1:
        return response("Work out the side panels of a prism", f"The triangular ends of a prism have sides {a} cm, {b} cm and {c} cm long. The prism is {length} cm long. Find the combined area of its three rectangular faces.",
            "cm²", sides, fr"({a}+{b}+{c})\times {length}={sides}", "Add the widths of the three rectangles, then multiply by their common length.",
            ((a+b)*length, "Count the side panel along the hypotenuse too."))
    return response("Combine side panels and triangular ends", f"A closed right prism is {length} cm long. Each triangular end has sides of length {a} cm, {b} cm and {c} cm. The two shorter sides meet at a right angle. Find the total surface area.",
        "cm²", sides+ends, fr"({a}+{b}+{c})\times {length}+2\times\frac{{{a}\times {b}}}{{2}}={sides+ends}",
        "Find the combined area of all three rectangles and add the area of both triangular ends.", (sides, "The three side panels are only part of the outer surface. Add the two ends."))


def cones(i, mode):
    k=2+i
    if mode==0:
        a,b,h=3+i,4+i%7,6+i%11
        return response("Find the volume of a rectangular pyramid", f"A pyramid has a rectangular base {a} cm by {b} cm and perpendicular height {h} cm. Find its volume.",
                        "cm³", Fraction(a*b*h,3),fr"\frac{{{a}\times {b}\times {h}}}{{3}}={tex(Fraction(a*b*h,3))}",
                        "Multiply the base area by the perpendicular height and take one third.", (a*b*h,"That is the volume of the matching prism. Divide it by three for the pyramid."))
    if mode==1 and i%2==0:
        r,h,s=3*k,4*k,5*k
        return response("Find the volume of a cone", f"A cone has radius {r} cm, perpendicular height {h} cm and slant height {s} cm. Find its volume.",
                        "cm³", Fraction(r*r*h,3),fr"\frac{{\pi\times {r}^2\times {h}}}{{3}}={tex(Fraction(r*r*h,3))}\pi",
                        "Use the height from the centre of the base to the tip. Take a third of the matching cylinder's volume.",
                        (Fraction(r*r*s,3),"The slant height is used for curved surface area. Volume uses perpendicular height."),True)
    if mode==1:
        r,s=3*k,5*k
        return response("Find the total surface area of a cone", f"A solid cone has radius {r} cm and slant height {s} cm. Find its total surface area.",
                        "cm²",r*s+r*r,fr"\pi\times {r}\times {s}+\pi\times {r}^2={r*s+r*r}\pi",
                        "Use the slant height for the curved face. Add the circular base area.", (r*s,"That is the area of the curved face only. Include the circular base."), True)
    side,slant,h=6*k,5*k,4*k
    return response("Find surface area from a square-pyramid net", f"A square pyramid has base side {side} cm, face slant height {slant} cm and perpendicular height {h} cm. Find its total surface area.",
                    "cm²",side*side+2*side*slant,fr"{side}^2+4\times\frac{{{side}\times {slant}}}{{2}}={side*side+2*side*slant}",
                    "Add one square base and the four triangular faces. Use the perpendicular height within each triangular face.",
                    (side*side+2*side*h,"The perpendicular height of the whole pyramid is inside it. Find each face area using its slant height."))


def spheres(i, mode):
    r=3+i
    if mode==0:
        return response("Find the volume of a sphere", f"A sphere has diameter {2*r} cm. Find its volume.", "cm³", Fraction(4*r**3,3),
                        fr"\frac43\pi\times {r}^3={tex(Fraction(4*r**3,3))}\pi", "Halve the diameter and use the radius cubed.",
                        (Fraction(32*r**3,3),"Halve the stated diameter before you cube the radius."),True)
    if mode==1:
        return response("Find the surface area of a sphere", f"A ball has radius {r} cm. Find its entire surface area.", "cm²",4*r*r,
                        fr"4\pi\times {r}^2={4*r*r}\pi", "The sphere's outer surface has area four times the area of a great circle.",
                        (r*r,"That is the area of one flat circle through the middle, not the outer surface."),True)
    total=i%2==0
    value=3*r*r if total else 2*r*r
    return response("Find the surface area of a hemisphere", f"A solid hemisphere has radius {r} cm. Find {'the total surface area, including the flat face' if total else 'the curved surface area only'}.",
                    "cm²",value,fr"2\pi\times {r}^2"+(fr"+\pi\times {r}^2" if total else "")+fr"={value}\pi",
                    "Halve the sphere's surface area. " + ("Add one flat circular face because it is included." if total else "Stop there because only the curved part is requested."),
                    ((2 if total else 3)*r*r,"Check the instruction about including the flat circular face."), True)


def compound_planar(i, mode):
    a,b,c=8+i,7+i%6,3+i%5
    if mode==0:
        value=a*b-c*2
        return response("Subtract the area of a rectangular cut-out", f"A {a} cm by {b} cm rectangular card has a {c} cm by 2 cm rectangular corner cut off. Find the area that remains.",
                        "cm²",value,fr"{a}\times {b}-{c}\times 2={value}", "Calculate the whole rectangle, then subtract the area removed.",
                        (a*b,"That is the area before the corner was cut away."))
    if mode==1:
        value=2*(a+b)+2*c
        return response("Trace the perimeter round a notch", f"A rectangle is {a} cm by {b} cm. A 2 cm wide rectangular notch extends {c} cm into the middle of one long edge. Find the new perimeter.",
                        "cm",value,fr"2({a}+{b})+2\times {c}={value}","The back of the notch replaces the missing 2 cm of edge. Its two sides each add the depth of the notch.",
                        (2*(a+b),"The boundary now follows both sides of the notch as well."))
    value=a*a-c*c
    return response("Find the area of a circular ring", f"A circular disc of radius {a} cm has a circular hole of radius {c} cm cut from its centre. Find the area that remains.",
                    "cm²", value,fr"\pi({a}^2-{c}^2)={value}\pi","Subtract the area of the small circle from the area of the large circle.",
                    ((a-c)**2,"Squaring a difference in radii does not subtract two areas."),True)


def compound_solids(i, mode):
    r,h=4+i,5+i%11
    if mode==0:
        value=Fraction(r*r*h)+Fraction(2*r**3,3)
        return response("Add the volumes of a cylinder and hemisphere", f"A solid is made from a cylinder of radius {r} cm and height {h} cm and a hemisphere of the same radius. Find its volume.",
                        "cm³",value,fr"{r}^2\pi\times {h}+\frac23\pi\times {r}^3={tex(value)}\pi",
                        "Split the solid at the join. Add the cylinder volume and half the volume of a sphere.",
                        (r*r*h,"That counts only the cylinder. The solid also contains half a sphere."),True)
    if mode==1:
        value=2*r*h+3*r*r
        return response("Count exposed surfaces of a joined solid", f"A hemisphere sits on and exactly covers a cylinder's top. Both have radius {r} cm. The cylinder is {h} cm tall. Find the total external surface area, including the base.",
                        "cm²", value,fr"2\pi\times {r}\times {h}+2\pi\times {r}^2+\pi\times {r}^2={value}\pi",
                        "Count the curved cylinder wall, the curved hemisphere and the bottom circular face. The two faces at the join are inside.",
                        (value+2*r*r,"The flat top and the flat underside touch. Neither is exposed."),True)
    hole=1+i%3
    value=h*(r*r-hole*hole)
    return response("Remove a cylindrical hole from a solid cylinder", f"A cylinder has radius {r} cm and height {h} cm. A hole of radius {hole} cm is drilled straight through from top to bottom. Find the volume remaining.",
                    "cm³",value,fr"\pi({r}^2-{hole}^2)\times {h}={value}\pi",
                    "Subtract the volume of the full-height cylindrical hole from the original cylinder.",
                    (h*(r-hole)**2,"The hole removes a whole circle from the cross-section. Subtract areas before multiplying by height."),True)


def frustums(i, mode):
    k=2+i
    r,h,s=3*k,4*k,5*k
    small,h_small,s_small=k,Fraction(4*k,3),Fraction(5*k,3)
    desc=f"A cone of base radius {r} cm and vertical height {h} cm is cut parallel to its base. The removed cone has base radius {small} cm."
    if mode==0:
        return response("Find the height of the cone that was removed", desc+" Find the perpendicular height of the removed cone.", "cm",h_small,
                        fr"{h}\times\frac{{{small}}}{{{r}}}={tex(h_small)}",
                        "The two cones are similar. Their radii and their perpendicular heights have the same scale factor.",
                        (h-h_small,"That is the height of the remaining frustum. The question asks for the small cone."))
    if mode==1:
        value=Fraction(r*r*h,3)-Fraction(small*small*h_small,3)
        return response("Find frustum volume by subtraction", desc+" Find the volume of the remaining solid.", "cm³",value,
                        fr"\frac13\pi\left({r}^2\times {h}-{small}^2\times {tex(h_small)}\right)={tex(value)}\pi",
                        "Use similarity to find the small cone's height. Subtract its volume from the whole cone's volume.",
                        (Fraction(r*r*h,3),"The volume of the tip cone still needs to be subtracted."),True)
    value=Fraction(r*s)-small*s_small+r*r+small*small
    return response("Find the surface area of a frustum", desc+f" The whole cone's slant height is {s} cm. Find the total surface area of the remaining frustum.",
                    "cm²",value,fr"\pi\left({r}\times {s}-{small}\times {tex(s_small)}+{r}^2+{small}^2\right)={tex(value)}\pi",
                    "Scale the slant height for the removed cone. Subtract its curved surface from the large cone's curved surface. Add both end discs.",
                    (value-small*small,"The smaller end is now a newly exposed flat circle. Include it."),True)


def diagram(key, alt, body, caption):
    directory = ROOT / "public/assets/study/0580/mensuration"
    directory.mkdir(parents=True, exist_ok=True)
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 180" role="img" aria-labelledby="title">'
           f'<title id="title">{escape(alt)}</title><rect width="360" height="180" rx="12" fill="white"/>'
           '<g fill="#d8eafa" stroke="#215a83" stroke-width="2">'+body+'</g></svg>\n')
    (directory / f"{key}.svg").write_text(svg, encoding="utf-8")
    return dict(src=f"/assets/study/0580/mensuration/{key}.svg", alt=alt, width=360, height=180, caption=p(caption))


def label(x, y, text):
    return f'<text x="{x}" y="{y}" text-anchor="middle" stroke="none" fill="#192e43" font-family="system-ui, sans-serif" font-size="15">{escape(text)}</text>'


def figures():
    return {
        "metric": diagram("metric", "Three neighbouring marks on a metric ruler are ten small divisions apart.",
            '<rect x="31" y="70" width="298" height="48" rx="4"/>' + ''.join(
              f'<path d="M{45+9*i} 70v{28 if not i%10 else 11}"/>' for i in range(31)) +
            ''.join(label(45+90*i,113,str(i)) for i in range(4))+label(182,143,"centimetres"),
            "Count ten millimetre gaps from each numbered centimetre mark to the next."),
        "units": diagram("units", "One square is divided into four equal smaller squares; a cube has three directions.",
            '<path d="M53 33h105v105H53z M105.5 33v105 M53 85.5h105"/>'
            '<path d="M222 69h70v70h-70z M222 69l31-28h70l-31 28 M292 139l31-28V41"/>' +
            label(105,160,"Two directions")+label(274,160,"Three directions"),
            "A change of scale affects every dimension. Area has two directions and volume has three."),
        "flat": diagram("flat", "Trapezium with two parallel sides and dashed perpendicular height.",
            '<path d="M81 126H282L250 51H124Z"/><path d="M170 51v75" fill="none" stroke-dasharray="5 4"/>'
            '<path d="M170 116h10v10 M180 46l7 5-7 5 M180 121l7 5-7 5" fill="none"/>' +
            label(185,31,"Parallel side")+label(185,151,"Parallel side")+label(198,91,"Height"),
            "Mark the height at right angles. The sloping side is a different length."),
        "edges": diagram("edges", "Parallelogram with marked boundary edges and a dashed inside height.",
            '<path d="M50 138h183l77-99H127Z"/><path d="M127 39v99m0-10h10v10" fill="none" stroke-dasharray="5 3"/>'+
            label(210,28,"Base")+label(152,161,"Base")+label(77,84,"Side")+label(304,102,"Side")+label(158,96,"Height"),
            "Trace the four outer edges for the perimeter. The dotted height shows the perpendicular distance between the bases."),
        "circles": diagram("circles", "Circle marked with diameter, radius and a shaded right-angle sector.",
            '<circle cx="179" cy="88" r="64" fill="#eff5fd"/><path d="M179 88h64a64 64 0 0 0-64-64Z" fill="#a8d8c3"/>'
            '<path d="M115 88h128 M179 33v55 M179 77h11v11" fill="none"/>' +
            label(178,174,"Diameter across the centre")+label(262,71,"Arc"),
            "A 90° sector uses one quarter of the whole area and one quarter of the whole circumference."),
        "sectors": diagram("sectors", "Two radii split a circle into a small shaded sector and a larger sector.",
            '<circle cx="180" cy="88" r="65" fill="#e5eefb"/><path d="M180 88h65A65 65 0 0 0 209 30Z" fill="#a8d8c3"/>' +
            label(135,115,"Major")+label(234,59,"Minor"),
            "The angles at the centre add to one full turn. Choose the angle inside the requested region."),
        "prisms": diagram("prisms", "Triangular prism with one triangular end highlighted.",
            '<path d="M59 125L107 43 233 24 286 106 160 125Z" fill="#eff5fd"/>'
            '<path d="M59 125L107 43 160 125Z" fill="#a8d8c3"/><path d="M126 34l92-14" fill="none" stroke="#167859"/>' +
            label(108,151,"Cross-section")+label(175,22,"Length"),
            "The prism keeps the same cross-section throughout its length."),
        "cylinder-net": diagram("cylinder-net", "A cylinder net is a rectangle with a circular end above and below it.",
            '<rect x="65" y="66" width="230" height="48"/><circle cx="178" cy="41" r="25" fill="#a8d8c3"/><circle cx="178" cy="139" r="25" fill="#a8d8c3"/>' +
            label(180,96,"Width: circumference")+label(307,96,"Height"),
            "The rectangle wraps around the circular ends. Its width becomes the circumference, and its height stays the height of the cylinder."),
        "prism-surface": diagram("prism-surface", "Three rectangular panels with two matching right-angled end faces.",
            '<path d="M55 67V7l80 60ZM55 118h80l-80 60Z" fill="#a8d8c3"/>'
            '<path d="M55 67h80v51H55ZM135 67h60v51h-60ZM195 67h100v51H195Z"/>'
            '<path d="M55 58h9v9 M55 127h9v-9" fill="none"/>'+
            label(95,97,"Panel 1")+label(165,97,"Panel 2")+label(244,97,"Panel 3"),
            "Each side of the right triangle matches one rectangle in the net. The two matching triangles close the ends."),
        "cones": diagram("cones", "A cone with a dashed perpendicular height and a marked slant edge.",
            '<path d="M181 24L109 126Q181 179 253 126Z"/><ellipse cx="181" cy="126" rx="72" ry="20" fill="#cce7e1"/>'
            '<path d="M181 24v102h72" fill="none" stroke-dasharray="5 4"/>' +
            label(146,104,"Height")+label(252,70,"Slant")+label(217,148,"Radius"),
            "Volume uses the perpendicular height. The curved surface uses the slant height."),
        "spheres": diagram("spheres", "Hemisphere with a highlighted circular flat face.",
            '<path d="M101 99a79 79 0 0 1 158 0v5H101z" fill="#d1e6fa"/>'
            '<ellipse cx="180" cy="103" rx="79" ry="21" fill="#a8d8c3"/><path d="M180 103h79"/>' +
            label(180,74,"Curved face")+label(180,152,"Flat face"),
            "The flat face is added only when the question asks for the total surface area."),
        "notch": diagram("notch", "A rectangle has a rectangular notch in the middle of its top edge.",
            '<path d="M47 46h104v52h57V46h105v93H47Z"/>'
            '<path d="M151 46v52h57V46" fill="none" stroke="#167859" stroke-width="4"/>' +
            label(181,35,"Notch")+label(183,163,"Trace the full boundary"),
            "The back of the notch replaces the missing outside edge. Both new side lengths add to the perimeter."),
        "solids": diagram("solids", "A curved hemisphere joins the top of a cylinder along a dashed seam.",
            '<path d="M132 76a48 48 0 0 1 96 0v62a48 13 0 0 1-96 0z"/>'
            '<ellipse cx="180" cy="76" rx="48" ry="13" fill="none" stroke-dasharray="5 4"/>'
            '<path d="M132 138a48 13 0 0 1 96 0" fill="none" stroke-dasharray="5 4"/>' +
            label(180,59,"Dome")+label(180,112,"Cylinder")+label(265,82,"Join"),
            "The seam is useful when splitting the volume. A pair of surfaces hidden at the seam does not count in external area."),
        "frustum": diagram("frustum", "A smaller cone is removed above a cut parallel to the base.",
            '<path d="M88 143l52-78h80l52 78q-92 38-184 0z"/>'
            '<path d="M140 65l40-54 40 54 M180 16v134 M88 143h184" fill="none" stroke-dasharray="5 4"/>'
            '<ellipse cx="180" cy="65" rx="40" ry="9" fill="#a8d8c3"/>' +
            label(249,28,"Removed cone")+label(178,120,"Frustum"),
            "The cut is parallel to the base, so the removed cone and the full cone are similar."),
    }


math = m


LESSONS = [
 ("metric", "Metric lengths and masses", "Convert between metric units and check whether the number should get bigger or smaller.", False, metric, [
  ("smaller", "How do I count in a smaller unit?", "The measurement stays the same. Smaller units fit more times along it, so the number increases.", "For length use 10 mm = 1 cm, 100 cm = 1 m and 1000 m = 1 km. For mass use 1000 g = 1 kg and 1000 kg = 1 t.", "Read the units before deciding the multiplier."),
  ("larger", "How do I convert in the opposite direction?", "A bigger unit bundles several smaller units together. Divide by the number in one bundle.", "Draw a conversion arrow and write the operation above it. Reversing the arrow reverses the operation.", "From centimetres to metres divide by 100. Moving the decimal a fixed number of places works only for that factor."),
  ("combine", "What if the two measurements use different units?", "Choose the unit the question asks for. Convert each measurement to that unit before using it.", "Convert first, then add, subtract or compare the numbers.", "On the answer line, write the unit you were asked to use.")]),
 ("units", "Area, volume and capacity units", "Square or cube the length conversion factor and connect capacity to cubic units.", False, units, [
  ("area", "Why does area use a squared factor?", "Picture a square one metre wide. Both edges become 100 centimetres. The same square now has 100 rows of 100 small squares.", "To convert a measurement in m² to cm², multiply by " + math(r"100^2=10000") + ".", "The factor 100 converts only one length."),
  ("volume", "Why does volume use a cubed factor?", "There is a third direction in a cube. Convert the lengths along all three directions.", "One cubic metre contains " + math(r"100^3=1000000") + " cubic centimetres.", "When going back to cubic metres, divide by the same factor."),
  ("litres", "How do litres and cubic centimetres work together?", "A litre describes capacity. A cubic centimetre describes volume. The two measure the same space in different units.", "1 cm³ = 1 mL, 1000 mL = 1 L and 1 m³ = 1000 L.", "First write which pair of units you are connecting.")]),
 ("flat", "Perimeter and area of straight-sided shapes", "Decide whether to trace the boundary or cover the inside, then use perpendicular heights.", False, flat, [
  ("boundary", "When should I add and when should I multiply?", "A border has a length. A covering has an area. Trace the four sides for the first and count square units for the second.", "For a rectangle, " + math(r"P=2(l+w)") + " and " + math(r"A=lw") + ".", "Use length units for perimeter and square units for area."),
  ("height", "Which height belongs in the area calculation?", "Put your base at the bottom of the sketch. Draw the height at right angles to it, even when the line lies outside the shape.", "A parallelogram has area " + math(r"bh") + ". A triangle with the same base and height has area " + math(r"\tfrac12 bh") + ".", "The tilted edge is rarely the perpendicular height."),
  ("parallel", "How do I use the two parallel sides of a trapezium?", "Imagine replacing the two parallel sides by a single average length. The average multiplied by the gap gives the area.", "Use " + math(r"A=\frac{a+b}{2}h") + ", where " + math("a,b") + " are parallel and " + math("h") + " is their perpendicular separation.", "Only the parallel sides go into the average.")]),
 ("edges", "Perimeters of triangles and quadrilaterals", "Trace and add the correct side lengths when a shape also shows an internal height.", False, polygon_edges, [
  ("triangle", "How do I trace a triangle's boundary?", "Start at one corner and trace the outside. Write down each edge length as you go.", "Add the three sides in any order. The result is a length.", "Ignore a line that lies wholly inside the triangle."),
  ("parallelogram", "Which lengths repeat in a parallelogram?", "Mark matching opposite sides. Count the base and the sloping side, two of each.", "For base " + math("b") + " and sloping side " + math("s") + ", the perimeter is " + math("2(b+s)") + ".", "Use the perpendicular height for area. It does not describe the sloping edge."),
  ("trapezium", "How do I trace around an isosceles trapezium?", "The sloping sides have equal length. Its parallel sides may have different lengths.", "Add the two parallel lengths, then both matching sloping lengths.", "The dashed height lies inside this shape.")]),
 ("circles", "Circles and familiar sectors", "Tell circumference from area and work with sectors that divide a full turn exactly.", False, circles, [
  ("edge", "Which measurement goes around the circle?", "Circumference is the full curved distance around the edge. The diameter passes across the circle through its centre.", "Use " + math(r"C=\pi d=2\pi r") + ".", "Double a radius. A given diameter already includes two radii."),
  ("inside", "Which measurement fills the circle?", "Area measures everything inside the boundary. Start by identifying the radius, the distance from the centre to the edge.", "Use " + math(r"A=\pi r^2") + ".", "If the diameter is given, halve it before squaring."),
  ("fraction", "What fraction of the circle belongs to my sector?", "Think of a quarter turn, half turn or other fraction of a full turn. A 60° sector is one of six equal pieces.", "Multiply the whole circumference by the fraction for arc length. Multiply the whole area by the fraction for sector area.", "If the perimeter of a sector is asked for, count its two straight radii too.")]),
 ("sectors", "Major and minor arcs and sectors", "Work with any central angle, either of two sectors and reverse calculations.", True, sectors, [
  ("minor", "How do I use an angle that does not divide 360° exactly?", "The fraction of the full turn is still the angle divided by 360°. Leave the fraction exact until the final step.", "For central angle " + math(r"\theta") + " degrees, arc length is " + math(r"\frac{\theta}{360}\,2\pi r") + " and sector area is " + math(r"\frac{\theta}{360}\,\pi r^2") + ".", "Use degrees with 360 in these formulas."),
  ("major", "Which angle describes the larger sector?", "The radii make two angles around the centre. Shade the sector you want. Subtract the smaller angle from a full turn when you need the larger one.", "The minor angle and the major angle add to 360°.", "A major arc is longer than half the full circumference."),
  ("reverse", "Can I work back from an arc length?", "Divide the arc length by the full circumference. The result is the fraction of the turn, so multiply by 360° to get the angle.", "Use the same idea with area divided by full-circle area when a sector area is given.", "Compare lengths with lengths and areas with areas.")]),
 ("prisms", "Cuboids, prisms and cylinders", "Find volume from cross-sections and surface area by adding exposed faces.", False, prisms, [
  ("layers", "Which cross-section is repeated?", "Imagine moving a flat end face along the solid. Every slice parallel to that end stays the same size.", "Prism volume is cross-sectional area multiplied by the length between the ends.", "Find the end area before using the length of the prism."),
  ("faces", "How can I count all the faces?", "Draw a net or list each pair of opposite faces. In a cuboid the three different pairs use different combinations of side lengths.", "A cuboid with lengths " + math("l,w,h") + " has total area " + math("2(lw+lh+wh)") + ".", "Surface area counts the outer faces. Volume measures space inside."),
  ("unroll", "How can I find the curved surface of a cylinder?", "Unroll the curved wall. One side of the rectangle is the full circumference of the circular end. The other side is the cylinder's height.", "The curved area is " + math(r"2\pi rh") + ". Add one area " + math(r"\pi r^2") + " for each closed end. Its volume is " + math(r"\pi r^2h") + ".", "Read whether a container is open or closed before adding an end.")]),
 ("prism-surface", "Surface area from prism nets", "Use a net to count the end faces and all side panels of a triangular prism.", False, prism_surface, [
  ("ends", "How many end faces do I need?", "Locate the cross-section at both ends of the solid. Here both ends are right-angled triangles.", "Find the area of one triangle, then double it.", "Keep the length that joins the triangles separate from the sides of the triangles."),
  ("sides", "Which edges make the widths of the side panels?", "Unfold the sides. Each rectangle takes its width from one side of the triangular cross-section.", "Side area of a right prism is the perimeter of its cross-section multiplied by the length of the prism.", "The sloping side of the triangle also has a panel along it."),
  ("combined", "How do I total the exposed area?", "Count the two triangles and the three rectangles. Add each face exactly once.", "Add the end-area total to the side-area total.", "Multiplying end area by length gives volume. Surface area adds the areas of the faces.")]),
 ("cones", "Cones and pyramids", "Choose between perpendicular height and slant height and track the outer faces.", False, cones, [
  ("third", "How do I get the volume of a pyramid?", "Compare it to a prism with the same base area and perpendicular height. As the pyramid narrows to the tip, its volume is one third as large.", "Use " + math(r"V=\frac13 A_{\text{base}}h") + ".", "Measure the height at right angles to the base."),
  ("cone", "Which height belongs in each cone formula?", "Measure vertical height to the base centre at a right angle. Follow the slope from the apex to the circle to see the slant height.", "For volume use " + math(r"V=\frac13\pi r^2h") + ". For curved area use " + math(r"A=\pi rs") + ", with slant height " + math("s") + ".", "For total area add the disc at the base."),
  ("net", "How can a net help with a square pyramid?", "The four side faces unfold to triangles. The height of a triangle lies inside that flat face.", "Add the square base to the areas of the four triangles.", "Do not use the pyramid's internal perpendicular height to find the area of a side face.")]),
 ("spheres", "Spheres and hemispheres", "Use the sphere formulas and distinguish curved and total area of a hemisphere.", False, spheres, [
  ("volume", "How do I get the volume from a diameter?", "Draw a centre-to-edge radius across half the diameter. Use the radius for the volume formula.", "The volume of a sphere is " + math(r"\frac43\pi r^3") + ".", "Radius and diameter give very different results when cubed."),
  ("surface", "What is the area of the outer surface?", "Think of the skin of a ball. A great circle is a flat cross-section while the area being measured wraps around the ball.", "Sphere surface area is " + math(r"4\pi r^2") + ".", "Use squared units for the area of a skin."),
  ("half", "When do I add the flat face of a hemisphere?", "Cut a sphere into equal halves. The curved area is halved. The cut creates one new flat circular face on each half.", "Hemisphere volume is " + math(r"\frac23\pi r^3") + ". Its curved area is " + math(r"2\pi r^2") + " and its total area is " + math(r"3\pi r^2") + ".", "Decide whether the cut face is exposed and whether the question asks for it.")]),
 ("notch", "Compound shapes and missing regions", "Split shapes into familiar areas or subtract the part removed, then trace the actual perimeter.", False, compound_planar, [
  ("subtract", "Which simple shape fits around the whole region?", "Sketch the complete shape before a piece was removed. Mark the missing piece in a different colour.", "Area remaining is area of the whole shape minus area of the removed part.", "For a composite shape made by joining two pieces, add their areas if they do not overlap."),
  ("trace", "What changes when a notch is cut into an edge?", "Start at one corner and trace each exposed edge until you return. Trace inward and outwards around the notch.", "An interior cut line counts in the perimeter once it becomes an outer edge.", "A shared edge between two joined shapes lies inside and does not count."),
  ("ring", "How do I find the area of a circular ring?", "Start with the area of the flat disc. Remove the smaller circle from the middle.", "With outer radius " + math("R") + " and inner radius " + math("r") + ", use " + math(r"\pi(R^2-r^2)") + ".", "Square each radius before subtracting.")]),
 ("solids", "Compound solids and exposed surfaces", "Add or subtract volumes and count the faces you can reach from outside a solid.", False, compound_solids, [
  ("add", "Where can I split a joined solid?", "Mark the join between the parts. Label each part with a familiar name, then find the volume of each.", "Add the volumes of solid parts that touch but do not overlap.", "Keep all dimensions in the same unit."),
  ("exposed", "Which faces can I touch from outside?", "Imagine painting the finished solid. Paint reaches the sides and ends that are exposed. It cannot reach a join between two parts.", "Add exposed areas only, including the base if requested.", "Do not add both touching faces. They disappear inside the joined solid."),
  ("hole", "What changes when a hole goes right through?", "Treat the hole as a smaller solid. Its length is the distance from the first opening to the second.", "Subtract the removed volume. For surface area of a drilled solid, ask which faces and inner walls are now exposed.", "A through-hole removes material along the entire height.")]),
 ("frustum", "Frustums by similarity and subtraction", "Use the radius scale factor, then subtract the missing cone and handle both circular ends.", True, frustums, [
  ("scale", "Why can I compare the two cones?", "The cut is parallel to the original base. A side-view sketch shows two similar triangles with a common apex.", "Multiply a full-cone length by the small radius divided by the large radius to find the corresponding small-cone length.", "Separate the height of the missing cone from the height of the remaining frustum."),
  ("volume", "How can I calculate the remaining volume?", "Use the similarity result for the small cone's perpendicular height. Then calculate two volumes using their own radii and heights.", "Frustum volume is full-cone volume minus small-cone volume.", "A length scale factor must be cubed if you use it directly to scale a volume."),
  ("skin", "Which areas form the frustum's skin?", "The original curved surface loses the small curved tip. The cut exposes a new small disc. The original base remains.", "Subtract the two curved cone areas, then add both circular faces.", "Use the slant lengths for the curved areas and the radii for the discs.")]),
]


GLOSSARY = [
    ("Perimeter", "Length of the complete boundary of a flat shape."),
    ("Perpendicular", "Meeting at a right angle."),
    ("Cross-section", "Flat shape revealed by making a straight cut through a solid."),
    ("Slant height", "Distance along the sloping face from the base edge to the tip."),
    ("Sector", "Region bounded by an arc and two radii."),
    ("Capacity", "Amount of space available inside a container."),
]


def build():
    charts = figures()
    study, lessons, questions = {}, [], []
    for key, title, summary, extended, gen, strategies in LESSONS:
        identity = f"igcse-0580-mensuration-{key}"
        figure = charts[key]
        sections, examples, extra = [], [], []
        for mode, (anchor, heading, intro, idea, mistake) in enumerate(strategies):
            first = len(examples)
            for seed in (6 + mode, 11 + mode):
                q = gen(seed, mode)
                examples.append(dict(title=q["title"], question=q["prompt"], solution=q["steps"]))
            idea_html = p(idea)
            if key == "units" and mode == 2:
                idea_html += table(["Capacity", "Same volume"], [["1 mL", "1 cm³"], ["1 L", "1000 cm³"], ["1000 L", "1 m³"]])
            section_figure = figure if mode == 0 else charts["cylinder-net"] if key == "prisms" and mode == 2 else None
            blocks = [dict(kind="key", html=idea_html, **({"figure": section_figure} if section_figure else {})),
                      dict(kind="example", index=first), check(f"{identity}-{anchor}-1", gen(19+mode, mode)),
                      dict(kind="mistake", html=p(mistake)), dict(kind="example", index=first+1, tryFirst=True),
                      check(f"{identity}-{anchor}-2", gen(24+mode, mode))]
            sections.append(dict(id=anchor, title=heading, label=anchor.capitalize(), minutes=8, level="core", intro=p(intro), blocks=blocks))
            extra.extend(check(f"{identity}-{anchor}-extra-{v+1}", gen(31+3*mode+v, mode)) for v in range(2))
        if key == "units":
            extra.extend(check(f"{identity}-scale-extra-{mode+1}", other_units(17+mode, mode)) for mode in range(3))
        use = gen(15, 0)
        previous = lessons[-1] if lessons else None
        study[identity] = dict(updatedOn="2026-11-22", description=summary, examples=examples, sections=sections, extraPractice=extra,
            glossary=[dict(term=term, definition=p(explain)) for term, explain in GLOSSARY],
            related=[dict(title=previous["title"], href=f"/courses/maths4u-0580/topics/{previous['id']}")] if previous else [],
            revision=dict(body="".join(f"<h2>{s[1]}</h2>"+p(s[3]) for s in strategies)+
                f'<p><img width="225" src="{figure["src"]}" alt="{escape(figure["alt"], quote=True)}"></p>',
                checks=use["prompt"]+p("<strong>Answer.</strong> " + use["result"]), examTip=p(strategies[-1][-1])))
        lessons.append(dict(id=identity, key=key, title=title + (" (Extended)" if extended else ""), summary=summary, objective=summary,
            before=p("Identify the quantity and label its units before you choose a calculation."),
            ideas="".join(p(s[3]) for s in strategies), method="".join(f"<h4>{s[1]}</h4>"+p(s[2]) for s in strategies),
            mistakes=[s[-1] for s in strategies], examples=[dict(title=e["title"], question=e["question"], solution="".join(e["solution"]),
                verification=f"{identity}-example-{j+1}") for j, e in enumerate(examples[::2])]))
        for j, (a, b) in enumerate(ALTS):
            family = f"{identity}-P{j+1}"
            questions.extend(bank_item(f"{family}-{v}", family, key, [gen(42+8*j+v,a)]) for v in range(2))
            family = f"{identity}-E{j+1}"
            for v in range(4):
                seed = 101 + 32*j + v
                questions.append(bank_item(f"{family}-{v}", family, key, [gen(seed,a),gen(seed+10,b)], v))
        if key == "units":
            family = f"{identity}-dimensional-conversions"
            for variant in range(4):
                area = other_units(20 + 3*variant, variant % 2)
                volume = other_units(25 + 2*variant, 2)
                questions.append(bank_item(f"{family}-{variant}", family, key, [area, volume], variant))
    package = dict(schema_version=1, key="0580-mensuration", version="1.2.0",
        course=dict(slug="maths4u-0580", title="Cambridge IGCSE Mathematics (0580)", code="0580", direction="igcse"),
        chapter=dict(id="igcse_0580_mensuration", slug="mensuration", title="Mensuration", position=33),
        source=dict(sha256=sha256(Path(__file__).read_bytes()).hexdigest(), supplied=0, held=[]),
        lessons=lessons, questions=questions, marking_status="DRAFT")
    for name, data in (("v1", package), ("study", study)):
        (ROOT / "content/original/0580" / f"mensuration-{name}.json").write_text(json.dumps(data, indent=2, ensure_ascii=False)+"\n", encoding="utf-8")
    print(f"{len(lessons)} lessons, {len(questions)} tasks")


if __name__ == "__main__":
    build()
