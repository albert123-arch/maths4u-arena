"""Build a content-bound chapter from the read-only owner bank and its diagrams."""
import argparse,hashlib,json,html,re,math
from pathlib import Path
import sympy as s
from fp1_polar_teaching import lessons,bisect_height
ap=argparse.ArgumentParser();ap.add_argument('--source',required=True);ap.add_argument('--mapping',required=True);ap.add_argument('--assets',required=True);args=ap.parse_args()
source=Path(args.source);owner=json.loads(source.read_text(encoding='utf-8-sig'));audit=json.loads(Path(args.mapping).read_text(encoding='utf8'));media=json.loads(Path(args.assets).read_text(encoding='utf8'))
sha=hashlib.sha256(source.read_bytes()).hexdigest();assert sha==audit['sourceSha256']
images=media['images'];questions=[];checks=[];theta=s.Symbol('theta',real=True);x,y=s.symbols('x y',real=True)
def tex(value):return s.latex(value)
def field(key,label,expected,kind='number',**kw):return dict(key=key,label=label,expected=str(expected),type=kind,**kw)
def display(f):
    raw=f['expected']
    if f['type']=='choice':return html.escape(raw)
    if f['type']=='pairs':
        return r'\('+r',\quad '.join(r'\left('+','.join(tex(s.sympify(v)) for v in part.strip()[1:-1].split(','))+r'\right)' for part in raw.split(';'))+r'\)'
    if f['type']=='set':
        parts=[]
        for chunk in raw.split(' U '):
            if chunk.startswith('{'):parts.append(r'\{'+','.join(tex(s.sympify(v)) for v in chunk[1:-1].split(','))+r'\}')
            else:parts.append(chunk[0]+','.join(tex(s.sympify(v)) for v in chunk[1:-1].split(','))+chunk[-1])
        return r'\('+r'\cup'.join(parts)+r'\)'
    if f['type']=='equation':return r'\('+'='.join(tex(s.sympify(v)) for v in raw.split('='))+r'\)'
    return r'\('+tex(s.sympify(raw))+r'\)'
def quick(topic,family,v,title,prompt,fields,solution,ref):
    code={'coordinates':'C','sketches':'S','intersections':'I','areas':'A','extrema':'E'}[topic];uid=f'M4U-9231-PC-{code}{family}{v}'
    questions.append(dict(id=uid,family_uid=f'M4U-9231-PC-{code}{family}',lesson=topic,title=title,collection='short' if v==1 else 'variant',prompt_html=prompt,answer_html='<p>'+'; '.join(html.escape(f['label'])+': '+display(f) for f in fields)+'</p>',solution_html=solution,hint_html='<p>Keep the stated angular interval and non-negative radius. Give every requested value, using pi for exact angles and areas.</p>',marks=len(fields),difficulty=2 if family<3 else 3,fields=fields,parts=[dict(label='',marking_criteria=[dict(code='A'+str(i+1),marks=1,description_html='<p>Give the complete correct '+html.escape(f['label'].lower())+'.</p>') for i,f in enumerate(fields)])],verification=uid))
    checks.append(dict(uid=uid,reference=ref,answers={f['key']:f['expected'] for f in fields}))
for v in [1,2]:
    radius,angle=(6,2*s.pi/3) if v==1 else (4,-s.pi/6);cx=s.simplify(radius*s.cos(angle));cy=s.simplify(radius*s.sin(angle))
    quick('coordinates',1,v,'Convert the whole point',rf'<p>Convert the polar point \(({radius},{tex(angle)})\) into Cartesian coordinates.</p>',[field('cx','Cartesian x-coordinate',cx),field('cy','Cartesian y-coordinate',cy)],rf'\[x={tex(cx)},\qquad y={tex(cy)}.\]<p>Use both coordinate identities and check the signs against the quadrant.</p>',dict(kind='polar-point',radius=str(radius),angle=str(angle)))
    cx,cy=(-3,3*s.sqrt(3)) if v==1 else (-4,-4*s.sqrt(3));radius=s.sqrt(cx*cx+cy*cy);angle=2*s.pi/3 if v==1 else -2*s.pi/3
    quick('coordinates',2,v,'Give the full polar pair',rf'<p>Convert \(({tex(cx)},{tex(cy)})\) into polar form with \(r\ge0\), \(-\pi&lt;\theta\le\pi\). Enter one pair \((r,\theta)\), using pi for \(\pi\).</p>',[field('polar','Polar pair (r, theta)',f'({radius},{angle})','pairs')],rf'<p>The distance is \({tex(radius)}\). The quadrant selects \(\theta={tex(angle)}\).</p>',dict(kind='cartesian-point',x=str(cx),y=str(cy),angle=str(angle)))
    c=6 if v==1 else 10;fn=s.cos if v==1 else s.sin;eq='x**2+y**2='+str(c)+('*x' if v==1 else '*y')
    quick('coordinates',3,v,'Give the complete Cartesian equation',rf'<p>Convert \(r={c}{tex(fn(theta))}\) over its full non-negative-radius circle into Cartesian form. Retain the pole.</p>',[field('cartesian','Complete Cartesian equation',eq,'equation',variables=['x','y'])],rf'<p>Multiply by r, then use the coordinate identities:</p>\[{tex(x*x+y*y)}={tex(c*(x if v==1 else y))}.\]<p>The original circle contains the pole.</p>',dict(kind='circle-equation',coefficient=c,axis='x' if v==1 else 'y'))
    opts={'A':'Use the inverse tangent without checking signs.','B':'Use the signs of both Cartesian coordinates to choose the quadrant.','C':'Replace every negative angle by a positive radius.'} if v==1 else {'A':'The pole always has one unique polar angle.','B':'Squaring never adds a branch.','C':'Check the pole separately before dividing by the radius.'}
    correct='B' if v==1 else 'C'
    quick('coordinates',4,v,'Check the conversion principle','<p>Which statement is valid?</p>',[field('choice','Correct statement',correct,'choice',options=opts)],'<p>The angular interval and the original equation determine the correct branch, including whether the pole belongs.</p>',dict(kind='principle',correct=correct))
    freq,lo,hi=(2,-s.pi,s.pi) if v==1 else (4,-s.pi/4,s.pi/4)
    allowed='(-pi,-3*pi/4] U [-pi/4,pi/4] U [3*pi/4,pi]' if v==1 else '[-pi/8,pi/8]'
    quick('sketches',1,v,'State every admissible angular interval',rf'<p>For \(r={v+2}\cos({freq}\theta)\), use \(r\ge0\) and '+(r'\(-\pi&lt;\theta\le\pi\).' if v==1 else r'\(-\pi/4\le\theta\le\pi/4\).')+r' Give the complete set of allowed angles.</p>',[field('angles','All allowed angles',allowed,'set')],'<p>Solve the cosine sign condition on exactly the supplied interval. Include zeros of the radius and keep the stated endpoint convention.</p>',dict(kind='cos-domain',frequency=freq,lower=str(lo),upper=str(hi),lowerOpen=v==1))
    c=3 if v==1 else 5;sign=1 if v==1 else -1;angle=sign*s.pi/2
    quick('sketches',2,v,'Locate the radial maximum',rf'<p>For \(r={c}(1'+('+' if sign==1 else '-')+r'\sin\theta)\), \(-\pi\le\theta\le\pi\), give the greatest radius and every angle attaining it.</p>',[field('radius','Greatest radius',2*c),field('angles','All angles at the radial maximum','{'+str(angle)+'}','set')],rf'<p>The relevant sine value is {sign}, giving radius \({2*c}\) at \(\theta={tex(angle)}\).</p>',dict(kind='cardioid-maximum',coefficient=c,sign=sign))
    slope,offset,upper=(1,1,s.pi) if v==1 else (2,3,s.pi/2)
    quick('sketches',3,v,'Label both endpoint radii',rf'<p>The spiral is \(r={slope}\theta+{offset}\), \(0\le\theta\le {tex(upper)}\). Give the radius at each endpoint.</p>',[field('start','Initial radius',offset),field('end','Final radius',slope*upper+offset)],rf'<p>Substitute the two permitted angles. The radii are \({offset}\) and \({tex(slope*upper+offset)}\); neither endpoint is the pole.</p>',dict(kind='endpoints',radius=str(slope*theta+offset),lower='0',upper=str(upper)))
    opts={'A':'Draw additional points for every negative radius.','B':'Exclude angles whose radius is negative under the stated convention.','C':'Every trigonometric polar curve has four petals.'} if v==1 else {'A':'A symmetry substitution must preserve the angular domain.','B':'An algebraic identity always gives symmetry, whatever the domain.','C':'A growing radius makes the y-coordinate grow throughout a full turn.'}
    correct='B' if v==1 else 'A'
    quick('sketches',4,v,'Check the sketching rule','<p>Which sketching statement is valid?</p>',[field('choice','Correct statement',correct,'choice',options=opts)],'<p>The equation and its permitted angles jointly define the curve. Symmetry and the number of loops must respect both.</p>',dict(kind='principle',correct=correct))
    b=2 if v==1 else 3;angle=s.pi/6 if v==1 else s.pi/3;c=b if v==1 else s.sqrt(3)*b;radius=s.simplify(c*s.cos(angle))
    quick('intersections',1,v,'Find the whole non-pole intersection',rf'<p>In \(0\le\theta\le\pi/2\), find the non-pole intersection of \(r={tex(c)}\cos\theta\) and \(r={b}\sin2\theta\). Enter \((r,\theta)\).</p>',[field('polar_points','Non-pole intersection (r, theta)',f'({radius},{angle})','pairs')],rf'<p>For a non-pole point, divide by the non-zero cosine and solve for sine. The resulting point is \(({tex(radius)},{tex(angle)})\).</p>',dict(kind='circle-petal',circle=str(c),petal=b))
    c=4 if v==1 else 6;radius=c/s.sqrt(2);angle=s.pi/4
    quick('intersections',2,v,'Check a common non-pole ray',rf'<p>Find the non-pole intersection of \(r={c}\cos\theta\) and \(r={c}\sin\theta\) in the first quadrant. Enter \((r,\theta)\).</p>',[field('polar_points','Non-pole intersection (r, theta)',f'({s.simplify(radius)},{angle})','pairs')],rf'<p>Equal non-zero radii require \(\tan\theta=1\), so \(\theta=\pi/4\) and \(r={tex(s.simplify(radius))}\). The common pole is a separate geometric point.</p>',dict(kind='equal-circles',coefficient=c))
    slope,offset,angle=(1,2,2) if v==1 else (2,3,3);radius=angle*angle
    quick('intersections',3,v,'Reject the inadmissible root',rf'<p>Find the intersection of \(r={slope}\theta+{offset}\) and \(r=\theta^2\), \(0\le\theta\le\pi\). Enter \((r,\theta)\).</p>',[field('polar_points','Intersection (r, theta)',f'({radius},{angle})','pairs')],rf'<p>The two algebraic roots are \(-1\) and \({angle}\). Only the latter is permitted; its radius is \({radius}\).</p>',dict(kind='algebraic-intersection',slope=slope,offset=offset))
    opts={'A':'The larger radius on every ray.','B':'The smaller radius on every ray.','C':'The square of the difference of the radii.'} if v==1 else {'A':'They cannot share the pole unless the zero occurs at the same angle.','B':'Each zero-angle representation counts as another geometric point.','C':'The pole can be shared at different permitted parameter angles.'}
    correct='B' if v==1 else 'C'
    quick('intersections',4,v,'Check the region and the pole','<p>Which radius bounds the common interior of two non-negative polar regions on a ray?</p>' if v==1 else '<p>Which statement about a common pole is correct?</p>',[field('choice','Correct statement',correct,'choice',options=opts)],'<p>Use the minimum for the common interior. A shared pole is one geometric point, even if its parameter angles differ.</p>',dict(kind='principle',correct=correct))
    k,freq=(4,2) if v==1 else (6,3);area=k*k*s.pi/(4*freq)
    quick('areas',1,v,'Find the exact area of one loop',rf'<p>Find the area of \(r={k}\sin({freq}\theta)\), \(0\le\theta\le\pi/{freq}\). Use pi in your exact answer.</p>',[field('area','Exact loop area',area)],rf'\[A=\frac12\int_0^{{\pi/{freq}}}{k*k}\sin^2({freq}\theta)\,d\theta={tex(area)}.\]',dict(kind='single-area',radius=str(k*s.sin(freq*theta)),lower='0',upper=str(s.pi/freq)))
    offset=v;rad=theta+offset;area=s.integrate(rad**2/2,(theta,0,1))
    quick('areas',2,v,'Keep the actual upper angle',rf'<p>Find the area bounded by \(r=\theta+{offset}\), \(0\le\theta\le1\), and the endpoint rays.</p>',[field('area','Exact sector area',area)],rf'\[A=\frac12\int_0^1(\theta+{offset})^2\,d\theta={tex(area)}.\]',dict(kind='single-area',radius=str(rad),lower='0',upper='1'))
    c=2 if v==1 else 4;area=c*c*(s.pi-2)/8
    quick('areas',3,v,'Split the common area',rf'<p>Find the common area of \(r={c}\sin\theta\) and \(r={c}\cos\theta\), each describing its non-negative-radius circle.</p>',[field('area','Exact common area',area)],rf'<p>Split at \(\pi/4\), using sine before it and cosine afterwards.</p>\[A={tex(s.expand(area))}.\]',dict(kind='common-circles-area',coefficient=c))
    opts={'A':'Half the integral of the difference of the squared radii.','B':'Half the integral of the squared difference of the radii.','C':'The integral of the difference of the radii.'} if v==1 else {'A':'Every area integral must run from 0 to pi.','B':'Split the integral when the active boundary changes.','C':'An expression already given for radius squared must be squared again.'}
    correct='A' if v==1 else 'B'
    quick('areas',4,v,'Choose the correct area method','<p>On a fixed angular interval with ordered boundaries, which formula gives the area between them?</p>' if v==1 else '<p>Which statement about polar area is valid?</p>',[field('choice','Correct method',correct,'choice',options=opts)],'<p>Keep the factor one half, square each radius, and use the correct boundary and limits in each piece.</p>',dict(kind='principle',correct=correct))
    base,linear,upper=(2,4,3) if v==1 else (3,6,4);angle=s.Rational(linear,2);radius=base+linear*angle-angle*angle
    quick('extrema',1,v,'Find the full radial maximum',rf'<p>For \(r={base}+{linear}\theta-\theta^2\), \(0\le\theta\le{upper}\), give the greatest radius and its angle.</p>',[field('radius','Greatest radius',radius),field('angle','Angle at the maximum (radians)',angle)],rf'<p>Set \(r^\prime={linear}-2\theta=0\) and compare with both endpoints. The maximum is \(({tex(radius)},{tex(angle)})\) in polar form.</p>',dict(kind='polynomial-radial-max',radius=str(base+linear*theta-theta*theta),lower='0',upper=str(upper)))
    c=6 if v==1 else 10;fn=s.cos if v==1 else s.sin;axis='x' if v==1 else 'y'
    quick('extrema',2,v,'Differentiate the required distance',rf'<p>For \(r={c}{tex(fn(theta))}\), \(0\le\theta\le\pi/2\), find the greatest perpendicular distance from the {axis}-axis and every angle attaining it.</p>',[field('distance','Greatest perpendicular distance',s.Rational(c,2)),field('angles','All angles at this distance','{pi/4}','set')],rf'<p>The relevant coordinate is \({c}/2\) times \(\sin2\theta\). Its maximum is \({tex(s.Rational(c,2))}\) at \(\pi/4\).</p>',dict(kind='circle-distance',coefficient=c,axis=axis))
    c=v+2;k=2*v+2;angle=bisect_height(c);distance=k*math.sin(angle)/(angle+c)
    quick('extrema',3,v,'Complete a numerical maximum',rf'<p>For \(r={k}/({c}+\theta)\), \(0\le\theta\le\pi/2\), give the angle and greatest distance from the x-axis, both correct to three decimal places.</p>',[field('angle','Angle (radians, 3 decimal places)',f'{angle:.3f}'),field('distance','Greatest distance (3 decimal places)',f'{distance:.3f}')],rf'<p>Solve \((\theta+{c})\cos\theta-\sin\theta=0\). Its left side decreases strictly. The maximum occurs at \(\theta\approx{angle:.6f}\); substitute the unrounded root before rounding the distance.</p>',dict(kind='numeric-height',coefficient=k,offset=c,angle=angle,distance=distance))
    opts={'A':'Differentiate only the radius.','B':'Differentiate the Cartesian y-coordinate and check endpoints.','C':'Use the largest polar angle.'} if v==1 else {'A':'dy/dtheta is zero, and dx/dtheta is non-zero.','B':'dy/dtheta is zero, with no further check.','C':'The radius derivative is zero.'}
    correct='B' if v==1 else 'A'
    quick('extrema',4,v,'Check the correct derivative','<p>For a curve entirely above the x-axis, how should its greatest distance from that axis be found?</p>' if v==1 else '<p>At a regular non-pole point, which condition guarantees a horizontal tangent?</p>',[field('choice','Correct condition',correct,'choice',options=opts)],'<p>Differentiate the required Cartesian coordinate, compare all candidates and check regularity before interpreting a tangent.</p>',dict(kind='principle',correct=correct))

topic_map={'Loops and Cartesian conversion':'coordinates','Cartesian conversion and sectors':'coordinates','Squared-radius curves':'sketches','Cardioids and limaçons':'sketches','Domains and multiple loops':'sketches','Intersections and composite regions':'intersections','Lines cutting polar regions':'intersections','Spirals and sector areas':'areas','Inverse sector-area problems':'areas','Spirals and numerical extrema':'extrema','Exact Cartesian extrema':'extrema','Radial extrema and sectors':'extrema'}
mapping={r['id']:r for r in audit['rows']};rows=[];fixtures=[]
def digest(q):return hashlib.sha256('\0'.join([q['title'],q['prompt_html'],q['answer_html'],q['solution_html'],q['hint_html'],str(q['marks'])]).encode()).hexdigest()
for q in [q for l in owner['lessons'] for q in l['questions']]:
    row=mapping[str(q['id'])];key=topic_map[q['topic']];refs={a['source_name']:'/api/files/'+a['file_id'] for a in images if a['question_uid']==q['content_uid']}
    def normalise(value):
        for old,new in refs.items():value=value.replace(old,new)
        return value
    assert sum(p['marks'] for p in q['parts'])==q['marks']==q['mark_scheme']['total_marks']
    parts=[]
    for index,part in enumerate(q['parts']):
        criteria=[]
        for point in part['criteria']:
            assert re.fullmatch(r'(?:A|B|M|FT)\d+',point['code'])
            criteria.append(dict(code=point['code'],marks=int(re.search(r'\d+$',point['code'])[0]),description_html=normalise(point['criterion_html'])))
        assert sum(c['marks'] for c in criteria)==part['marks']
        parts.append(dict(label=chr(97+index),marking_criteria=criteria))
    item=dict(id=q['content_uid'],family_uid=q['content_uid'],lesson=key,title=q['title'],collection='exam',prompt_html=normalise(q['question_html']),answer_html=normalise(q['answer_html']),solution_html=normalise(q['solution_html']),hint_html=normalise(q['hint_html']),marks=q['marks'],difficulty=q['difficulty'],fields=[],parts=parts,provenance=dict(original_id=q['provenance']['original_id'],original_uid=q['provenance']['original_uid'],archiveTaskId=row['archiveTaskId'],sourceSha256=sha,ownerProvenance=q['provenance']),verification='OWNER-'+str(q['id']))
    questions.append(item);rows.append({**row,'lesson':key,'marks':q['marks'],'contentSha256':digest(item)});fixtures.append(dict(id=str(q['id']),uid=q['content_uid'],bank_number=q['bank_number'],stem_html=q['stem_html'],parts=q['parts'],contentSha256=digest(item)))
for row in checks:row['contentSha256']=digest(next(q for q in questions if q['id']==row['uid']))
assets=[{k:v for k,v in a.items() if k not in ['source_name','source_sha256']} for a in images]
package=dict(schema_version=1,key='9231-fp1-polar',version='1.0.0',course=dict(slug='maths4u-9231-fp1',title='Further Pure Mathematics 1 (9231)',code='9231',direction='further'),chapter=dict(id='fp1_polar',slug='polar-coordinates',title='Polar coordinates',position=4),source=dict(sha256=sha,supplied=63,held=[]),lessons=lessons,questions=questions,marking_status='DRAFT',assets=assets)
def write(path,value):path.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
out=Path('content/original/9231-fp1');write(out/'polar-v1.json',package);write(out/'polar-quick-verification-v1.json',checks);write(out/'polar-owner-verification-v1.json',fixtures)
write(Path('docs/ARENA-C2-POLAR-SOURCE-AUDIT-20261106.json'),dict(sourceSha256=sha,rows=rows,editorialRepairs=[],images=images,mediaSource=media['mediaSource'],book=dict(path='D:/new_books/furhter_cambridge.pdf',pdfPages=[105,129],printedPages=[93,117],structure=[dict(section='5.1',lessons=['coordinates','sketches']),dict(section='5.2',lessons=['intersections','areas','extrema'])],use='Mathematical order only; independently authored teaching, no book exercises or illustrations.'),teachingDigests={l['id']:hashlib.sha256(json.dumps(l,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest() for l in lessons}))
print(json.dumps(dict(ownerTasks=63,quickChecks=len(checks),lessons=len(lessons),examples=sum(len(l['examples']) for l in lessons),solutionImages=len(assets))))
