"""Normalise the owner's read-only chapter and create complete-answer practice."""
import argparse,hashlib,json,html
from pathlib import Path
import sympy as s
from fp1_matrices_teaching import lessons,tex
ap=argparse.ArgumentParser();ap.add_argument('--source',required=True);ap.add_argument('--mapping',required=True);args=ap.parse_args()
source=Path(args.source);owner=json.loads(source.read_text(encoding='utf-8-sig'));audit=json.loads(Path(args.mapping).read_text(encoding='utf-8'))
sha=hashlib.sha256(source.read_bytes()).hexdigest();assert sha==audit['sourceSha256']
questions=[];checks=[];x,y,k,t=s.symbols('x y k t')
def matrix(rows):return s.Matrix(rows)
def field(key,label,expected,kind='number',**kw):return dict(key=key,label=label,expected=str(expected),type=kind,**kw)
def matrix_fields(value):return [field(f'r{i+1}c{j+1}',f'Entry ({i+1},{j+1})',value[i,j]) for i in range(value.rows) for j in range(value.cols)]
def point_fields(value):return [field('coord'+str(i+1),'Image '+axis+'-coordinate',value[i]) for i,axis in enumerate(['x','y','z'][:len(value)])]
def quick(topic,family,v,title,prompt,fields,solution,ref,answer=None):
    code={'operations':'O','inverses':'I','determinants':'D','plane-maps':'P','invariants':'F'}[topic];uid=f'M4U-9231-M1-{code}{family}{v}'
    if answer is None:
        values=[]
        for f in fields:
            raw=f['expected']
            value=html.escape(raw) if f['type'] in ['choice','set','equation'] else r'\('+tex(s.sympify(raw))+r'\)'
            values.append(html.escape(f['label'])+': '+value)
        answer='<p>'+'; '.join(values)+'</p>'
    questions.append(dict(id=uid,family_uid=f'M4U-9231-M1-{code}{family}',lesson=topic,title=title,collection='short' if v==1 else 'variant',prompt_html=prompt,answer_html=answer,solution_html=solution,hint_html='<p>Check the dimensions and order first. Give every requested entry or allowed value.</p>',marks=len(fields),difficulty=2 if family<3 else 3,fields=fields,parts=[dict(label='',marking_criteria=[dict(code='A'+str(i+1),marks=1,description_html='<p>Give the complete correct '+html.escape(f['label'].lower())+'.</p>') for i,f in enumerate(fields)])],verification=uid))
    checks.append(dict(uid=uid,answers={f['key']:f['expected'] for f in fields},reference=ref))
def data(M):return [[str(v) for v in row] for row in M.tolist()]
for v in [1,2]:
    A=matrix([[v+1,1],[-1,2]]);B=matrix([[1,-v],[2,1]]);out=A*B
    quick('operations',1,v,'Give the complete product',rf'<p>Find \(AB\), where \(A={tex(A)}\), \(B={tex(B)}\). Enter all four entries.</p>',matrix_fields(out),rf'\[AB={tex(out)}.\]<p>Use each row of A with each column of B; reversing the factors gives a different calculation.</p>',dict(kind='product',A=data(A),B=data(B)),rf'\[AB={tex(out)}.\]')
    A=matrix([[1,v,2],[0,1,-1]]);b=matrix([2,-1,v]);out=A*b
    quick('operations',2,v,'Multiply a rectangular matrix by a column',rf'<p>Find \(Ab\), where \(A={tex(A)}\) and \(b={tex(b)}\).</p>',matrix_fields(out),rf'\[Ab={tex(out)}.\]<p>The compatible dimensions are \(2\times3\) and \(3\times1\), giving \(2\times1\).</p>',dict(kind='product',A=data(A),B=data(b)),rf'\[Ab={tex(out)}.\]')
    A=matrix([[1,v+2],[0,1]]);power=v+1;out=A**power
    quick('operations',3,v,'Give the full matrix power',rf'<p>For \(A={tex(A)}\), find \(A^{{{power}}}\).</p>',matrix_fields(out),rf'\[A^{{{power}}}={tex(out)}.\]<p>The off-diagonal part squares to zero, so its coefficient is multiplied by the number of factors.</p>',dict(kind='power',A=data(A),power=power),rf'\[A^{{{power}}}={tex(out)}.\]')
    opts={'A':'3 by 4','B':'2 by 2','C':'3 by 3'} if v==1 else {'A':'Cancellation of a non-zero matrix is always valid.','B':'A zero product always has a zero factor.','C':'Cancellation is valid when the required inverse exists.'}
    quick('operations',4,v,'Check dimensions and cancellation',r'<p>A is \(3\times2\) and B is \(2\times4\). What is the order of AB?</p>' if v==1 else '<p>Which statement about matrix multiplication is correct?</p>',[field('choice','Correct statement','A' if v==1 else 'C','choice',options=opts)],'<p>Inner dimensions agree and outer dimensions give the product size. Cancellation requires an inverse on the correct side.</p>',dict(kind='principle',correct='A' if v==1 else 'C'))
    A=matrix([[v+1,1],[v,1]]);out=A.inv()
    quick('inverses',1,v,'Find every entry of the inverse',rf'<p>Find \(A^{{-1}}\) for \(A={tex(A)}\).</p>',matrix_fields(out),rf'\[A^{{-1}}={tex(out)}.\]<p>The determinant is 1; multiplication by A gives the identity.</p>',dict(kind='inverse',A=data(A)),rf'\[A^{{-1}}={tex(out)}.\]')
    A=matrix([[1,v],[1,v+1]]);C=matrix([[v,2],[1,-1]]);out=A.inv()*C
    quick('inverses',2,v,'Solve the entire matrix equation',rf'<p>Find \(X\) such that \(AX=C\), where \(A={tex(A)}\) and \(C={tex(C)}\).</p>',matrix_fields(out),rf'\[X=A^{{-1}}C={tex(out)}.\]<p>Left multiplication undoes the factor on the left. Check AX against both columns of C.</p>',dict(kind='solve-left',A=data(A),C=data(C)),rf'\[X={tex(out)}.\]')
    A=matrix([[t,v],[v,t]]);values=f'{{-{v},{v}}}'
    quick('inverses',3,v,'Give all forbidden parameter values',rf'<p>For \(A={tex(A)}\), give every real value of \(t\) for which an inverse does not exist.</p>',[field('excluded','All excluded t-values',values,'set')],rf'<p>The determinant is \(t^2-{v*v}\). Both zeros are excluded.</p>',dict(kind='singular',A=data(A),variable='t'),rf'\[t\in\{{-{v},{v}\}}.\]')
    opts={'A':'X = A⁻¹CB⁻¹','B':'X = B⁻¹CA⁻¹','C':'X = (AB)⁻¹C'} if v==1 else {'A':'Every right-hand side gives no solution.','B':'There may be no solution or more than one solution.','C':'Every right-hand side gives exactly one solution.'}
    quick('inverses',4,v,'Choose the valid inverse argument',r'<p>A and B are non-singular and \(AXB=C\). Which expression is correct?</p>' if v==1 else '<p>The coefficient matrix of a system is singular. What can be concluded without examining the right-hand side?</p>',[field('choice','Correct argument','A' if v==1 else 'B','choice',options=opts)],'<p>Undo factors on their own sides. A singular coefficient matrix does not alone decide whether a system is inconsistent.</p>',dict(kind='principle',correct='A' if v==1 else 'B'))
    A=matrix([[v+1,0,1],[1,2,v],[0,1,3]]);out=A.det()
    quick('determinants',1,v,'Calculate the complete determinant',rf'<p>Find \(\det A\), where \(A={tex(A)}\).</p>',[field('det','Determinant',out)],rf'\[\det A={tex(out)}.\]<p>Expand along the first row and retain the alternating cofactor signs.</p>',dict(kind='det',A=data(A)))
    A=matrix([[t,1,0],[1,t,0],[0,0,t-v-2]]);values=f'{{-1,1,{v+2}}}'
    quick('determinants',2,v,'Retain all singular values',rf'<p>Find all real \(t\) making \(A={tex(A)}\) singular.</p>',[field('values','All singular t-values',values,'set')],rf'<p>The determinant is \((t^2-1)(t-{v+2})\). Every factor can vanish.</p>',dict(kind='singular',A=data(A),variable='t'),rf'\[t\in\{{-1,1,{v+2}\}}.\]')
    off,scale=(3,1) if v==1 else (6,3);A=matrix([[k,1],[off,k]]);roots=s.solve((k*k-off)**2-scale**2,k);values='{'+','.join(str(v) for v in roots)+'}'
    quick('determinants',3,v,'Use both signs of an area condition',rf'<p>A region has area multiplier {scale} under \(M={tex(A)}\). Give all real \(k\). Also give the area multiplier of the inverse.</p>',[field('values','All real k-values',values,'set'),field('inverse_area','Inverse area multiplier',s.Rational(1,scale))],rf'<p>Solve \(|k^2-{off}|={scale}\), keeping both signs. None of the resulting determinants is zero. The inverse area multiplier is \({tex(s.Rational(1,scale))}\).</p>',dict(kind='area-roots',off=off,scale=scale),r'\[k\in\{'+','.join(tex(j) for j in roots)+r'\}.\]')
    opts={'A':'6','B':'18','C':'54'} if v==1 else {'A':'A negative determinant gives a negative area.','B':'Area and volume multipliers use the absolute determinant.','C':'Multiplying every entry by k always multiplies the determinant by k.'}
    quick('determinants',4,v,'Keep dimension and sign straight',r'<p>A is \(3\times3\) with \(\det A=2\). Find \(\det(3A)\).</p>' if v==1 else '<p>Which determinant statement is correct?</p>',[field('choice','Correct conclusion','C' if v==1 else 'B','choice',options=opts)],'<p>Scaling an n by n matrix scales its determinant by the nth power. Geometry uses its absolute value.</p>',dict(kind='principle',correct='C' if v==1 else 'B'))
    R=matrix([[0,-1],[1,0]]);S=s.diag(v+1,1);out=R*S
    quick('plane-maps',1,v,'Compose in the stated order',rf'<p>Apply an x-stretch of factor {v+1}, then an anticlockwise quarter-turn about the origin. Give the complete matrix.</p>',matrix_fields(out),rf'\[M=RS={tex(out)}.\]<p>The rightmost factor acts first.</p>',dict(kind='composite',R=data(R),S=data(S)),rf'\[M={tex(out)}.\]')
    A=matrix([[1,v],[0,1]]);image=matrix([v+3,-2]);out=A.inv()*image
    quick('plane-maps',2,v,'Recover the whole preimage',rf'<p>The map has matrix \(M={tex(A)}\). Find the input \((x,y)\) whose image is \(({image[0]},{image[1]})\).</p>',[field('input_x','Input x-coordinate',out[0]),field('input_y','Input y-coordinate',out[1])],rf'\[\begin{{pmatrix}}x\\y\end{{pmatrix}}=M^{{-1}}{tex(image)}={tex(out)}.\]',dict(kind='preimage',A=data(A),image=data(image)),rf'\[(x,y)=({tex(out[0])},{tex(out[1])}).\]')
    A=matrix([[v+1,1],[1,1]]);slope=v+1;intercept=-v;uvx,uvy=s.symbols('u v');old=A.inv()*matrix([uvx,uvy]);eq=s.expand(old[1]-slope*old[0]-intercept)
    quick('plane-maps',3,v,'Give the full image line',rf'<p>\(M={tex(A)}\) maps \((x,y)\) to \((u,v)\). Find the image of \(y={slope}x-{v}\). Use \(u,v\) in your equation.</p>',[field('line','Equation of the image (u,v)',str(eq)+'=0','equation',variables=['u','v'])],rf'<p>Substitute \(M^{{-1}}(u,v)^T\) into the input line.</p>\[{tex(eq)}=0.\]',dict(kind='line-image',A=data(A),slope=slope,intercept=intercept),rf'\[{tex(eq)}=0.\]')
    opts={'A':'It fixes the x-axis and maps (0,1) to (2,1).','B':'It fixes the y-axis and maps (1,0) to (1,2).','C':'It translates every point by two units.'} if v==1 else {'A':'A clockwise quarter-turn.','B':'A reflection in the x-axis.','C':'A shear fixing the x-axis.'}
    prompt=r'<p>Which description matches \(\begin{pmatrix}1&2\\0&1\end{pmatrix}\)?</p>' if v==1 else r'<p>Which description matches \(\begin{pmatrix}0&1\\-1&0\end{pmatrix}\)?</p>'
    quick('plane-maps',4,v,'Describe a matrix without ambiguity',prompt,[field('choice','Correct description','A','choice',options=opts)],'<p>Apply the matrix to both basis columns. Name the fixed axis or the rotation centre and direction.</p>',dict(kind='principle',correct='A'))
    A=matrix([[v+2,0],[0,1]])
    quick('invariants',1,v,'Find the complete line of fixed points',rf'<p>Find all fixed points of \(M={tex(A)}\). Give one Cartesian equation for the complete set.</p>',[field('fixed','Equation of the fixed set','x=0','equation',variables=['x','y'])],rf'<p>The equations are \({v+2}x=x\) and \(y=y\), so \(x=0\) and every y-coordinate is allowed.</p>',dict(kind='fixed-diagonal',factor=v+2),r'\[x=0.\]')
    A=matrix([[v+2,0],[v+3,-1]])
    quick('invariants',2,v,'Include the vertical invariant line',rf'<p>Find both invariant lines through the origin for \(M={tex(A)}\). Enter the vertical line first, then the other line.</p>',[field('vertical','Vertical invariant line','x=0','equation',variables=['x','y']),field('other','Other invariant line','y=x','equation',variables=['x','y'])],'<p>The vertical direction is reversed. For a finite gradient, the collinearity equation gives m=1; every other finite gradient fails.</p>',dict(kind='two-directions',A=data(A)),r'\[x=0,\qquad y=x.\]')
    R=matrix([[0,-1,0],[1,0,0],[0,0,1]]);D=s.diag(1,1,-v);A=D*R;point=matrix([v,2,-1]);out=A*point
    quick('invariants',3,v,'Apply a spatial composite completely',rf'<p>A point first rotates through \(\pi/2\) about the positive z-axis (viewed towards the origin), then has its z-coordinate multiplied by \(-{v}\). Give the image of \(({v},2,-1)\) and the volume multiplier.</p>',point_fields(out)+[field('volume','Volume multiplier',abs(A.det()))],rf'\[M={tex(A)}.\]<p>The image is \(({out[0]},{out[1]},{out[2]})\), and \(|\det M|={abs(A.det())}\).</p>',dict(kind='spatial',A=data(A),point=data(point)),rf'\[({out[0]},{out[1]},{out[2]}),\qquad |\det M|={abs(A.det())}.\]')
    opts={'A':'Only the line x=0.','B':'Every horizontal line y=c, and x=0.','C':'Every straight line.'} if v==1 else {'A':'Every point of an invariant line must be fixed.','B':'Every invariant line passes through the origin.','C':'A setwise invariant line may contain points which move.'}
    quick('invariants',4,v,'Distinguish invariant and fixed',r'<p>For \(M=\operatorname{diag}(4,1)\), which is the complete family of invariant straight lines?</p>' if v==1 else '<p>Which statement about invariant lines is correct?</p>',[field('choice','Correct conclusion','B' if v==1 else 'C','choice',options=opts)],'<p>Invariance is a condition on the image set. For the diagonal example, horizontal lines map onto themselves, but only points on x=0 are fixed.</p>',dict(kind='principle',correct='B' if v==1 else 'C'))

mapping={r['id']:r for r in audit['rows']};rows=[];fixtures=[]
plane_ids={'5801','5882','6424','6589',*(f'm4u_9231_fp1_ch04_new_{j:03}' for j in [21,22,23,24,25,31])}
def digest(q):return hashlib.sha256('\0'.join([q['title'],q['prompt_html'],q['answer_html'],q['solution_html'],q['hint_html'],str(q['marks'])]).encode()).hexdigest()
for q in [q for l in owner['lessons'] for q in l['questions']]:
    m=mapping[q['id']]
    key={'Matrix operations':'operations','The inverse matrix':'inverses','Determinants':'determinants'}.get(q['topic'],'plane-maps' if q['id'] in plane_ids else 'invariants')
    assert sum(p['marks'] for p in q['parts'])==q['marks']
    item=dict(id=q['content_uid'],family_uid=q['content_uid'],lesson=key,title=q['title'],collection='exam',prompt_html=q['question_html'],answer_html=q['answer_html'],solution_html=q['solution_html'],hint_html=q['hint_html'],marks=q['marks'],difficulty=q['difficulty'],fields=[],parts=[dict(label=p['label'],marking_criteria=[dict(code=c['code'],marks=c['marks'],description_html=c['criterion_html']) for c in p['marking_points']]) for p in q['parts']],verification='OWNER-'+q['id'])
    if m['kind']=='OWNER_ADAPTATION':
        item['provenance']=dict(original_id=m['original_id'],original_uid=m['original_uid'],archiveTaskId=m['archiveTaskId'],sourceSha256=sha,ownerProvenance=q['provenance'])
    questions.append(item);rows.append({**m,'lesson':key,'marks':q['marks'],'contentSha256':digest(item)})
    fixtures.append(dict(id=q['id'],uid=q['content_uid'],stem_html=q['stem_html'],parts=q['parts'],contentSha256=digest(item)))
for c in checks:c['contentSha256']=digest(next(q for q in questions if q['id']==c['uid']))
package=dict(schema_version=1,key='9231-fp1-matrices1',version='1.0.0',course=dict(slug='maths4u-9231-fp1',title='Further Pure Mathematics 1 (9231)',code='9231',direction='further'),chapter=dict(id='fp1_matrices1',slug='matrices-1',title='Matrices 1',position=3),source=dict(sha256=sha,supplied=60,held=[]),lessons=lessons,questions=questions,marking_status='DRAFT')
out=Path('content/original/9231-fp1')
def write(path,value):path.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
write(out/'matrices1-v1.json',package);write(out/'matrices1-quick-verification-v1.json',checks);write(out/'matrices1-owner-verification-v1.json',fixtures)
write(Path('docs/ARENA-C2-MATRICES-SOURCE-AUDIT-20261106.json'),dict(sourceSha256=sha,rows=rows,editorialRepairs=[],book=dict(path='D:/new_books/furhter_cambridge.pdf',pdfPages=[70,103],printedPages=[58,91],structure=[dict(section='4.1',lessons=['operations']),dict(section='4.2',lessons=['inverses']),dict(section='4.3',lessons=['determinants']),dict(section='4.4',lessons=['plane-maps','invariants'])],use='Mathematical sequence only; independently written teaching and examples; no book assets.'),teachingDigests={l['id']:hashlib.sha256(json.dumps(l,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest() for l in lessons}))
print(json.dumps(dict(ownerTasks=60,quickChecks=len(checks),lessons=5,examples=20,lessonCounts={l['key']:sum(q['lesson']==l['key'] and q['collection']=='exam' for q in questions) for l in lessons})))
