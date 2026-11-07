"""Append-only package projection; the E: source and its marking remain unchanged."""
import argparse,hashlib,html,json,re
from pathlib import Path
import sympy as s
from mechanics_equilibrium_teaching import lessons,models as example_models,T,D
ap=argparse.ArgumentParser();ap.add_argument('--source',required=True);ap.add_argument('--mapping',required=True);ap.add_argument('--assets',required=True);args=ap.parse_args()
source=Path(args.source);owner=json.loads(source.read_text(encoding='utf-8-sig'));mapping=json.loads(Path(args.mapping).read_text(encoding='utf8'));media=json.loads(Path(args.assets).read_text(encoding='utf8'));media=media.get('assets',media)
sha=hashlib.sha256(source.read_bytes()).hexdigest();assert sha==mapping['sourceSha256']
x,t,z=s.symbols('x t z');questions=[];quick_models=[]
def digest(v):return hashlib.sha256(json.dumps(v,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()
def f(key,label,value,kind='number',variables=None):return dict(key=key,label=label,type=kind,expected=str(value),**({'variables':variables} if variables else {}))
def add(lesson,code,family,v,title,prompt,fields,solution,model):
 uid=f'M4U-9231-MEQU-{code}{family}{v}'
 hints={
  'moments':'Choose a moment point and keep clockwise and anticlockwise signs consistent. Use actual component masses and their centres. Balance both force components and check that one-sided reactions are non-negative.',
  'laminas':'Use signed areas and first moments, subtracting holes. Compare the suspension-to-centre line with the named side, or project the weight line onto the actual supporting edge. Intersect geometric and friction limits.',
  'solids':'Use volumes for solids or material areas for shells. Measure every centre from the same reference, subtract removed material and check the actual rim or base geometry.',
  'contacts':'Draw every contact normal and friction force. Balance forces and moments before using a limiting-friction equality. For an elastic string, use extension divided by its natural length.'
 }
 def display(field):
  if field['type']=='choice':return field['options'][field['expected']]
  if field['type']=='pairs':
   pairs=[r'\left('+','.join(T(s.sympify(c)) for c in pair[1:-1].split(','))+r'\right)' for pair in field['expected'].split(';')]
   return r'\(\left\{'+','.join(pairs)+r'\right\}\)'
  if field['type']=='set':
   value=field['expected'];left=r'\{' if value[0]=='{' else value[0];right=r'\}' if value[-1]=='}' else value[-1]
   return r'\(\left'+left+','.join(T(s.sympify(c)) for c in value[1:-1].split(','))+r'\right'+right+r'\)'
  return r'\('+T(field['expected'])+r'\)'
 q=dict(id=uid,family_uid=f'M4U-9231-MEQU-{code}{family}',lesson=lesson,title=title,collection='short' if v==1 else 'variant',prompt_html=prompt,answer_html='<p>'+'; '.join(html.escape(a['label'])+': '+display(a) for a in fields)+'</p>',solution_html=solution,hint_html='<p>'+hints[lesson]+'</p>',marks=len(fields),difficulty=2 if family<3 else 3,fields=fields,parts=[dict(label='',marking_criteria=[dict(code='A1',marks=1,description_html='<p>Give the complete correct '+html.escape(a['label'].lower())+'.</p>') for a in fields])],verification=uid)
 questions.append(q);quick_models.append(dict(uid=uid,model=model))

h,a,r=s.symbols('h a r')
for v,(point,force,pivot) in enumerate([((3,2),(4,5),(1,-1)),((2,-1),(-3,4),(-1,1))],1):
 m0=point[0]*force[1]-point[1]*force[0];m1=(point[0]-pivot[0])*force[1]-(point[1]-pivot[1])*force[0]
 add('moments','M',1,v,'Both signed moments',r'<p>A force \('+T(s.Tuple(*force))+r'\) N acts at \('+T(s.Tuple(*point))+r'\) m. Give its signed moment about the origin and about \('+T(s.Tuple(*pivot))+r'\) m. Anticlockwise is positive.</p>',[f('origin','Signed moment about origin',m0),f('pivot','Signed moment about specified point',m1)],D(r'M=(x-x_P)F_y-(y-y_P)F_x')+'<p>Use position relative to each moment point. A negative answer denotes clockwise turning.</p>',dict(kind='moment',point=point,force=force,pivot=pivot))
for v,(L,W,P,c) in enumerate([(5,40,30,4),(6,60,20,5)],1):
 RB=s.Rational(W*L,2*L)+s.Rational(P*c,L);RA=W+P-RB
 add('moments','M',2,v,'Every support reaction',r'<p>A uniform horizontal beam of length \('+str(L)+r'\) m and weight \('+str(W)+r'\) N has smooth supports at both ends. A \('+str(P)+r'\) N load is \('+str(c)+r'\) m from the left end. Give both upward support reactions.</p>',[f('left','Left support reaction in N',RA),f('right','Right support reaction in N',RB)],'<p>Take moments about one end, then balance the total vertical force. Both supports must have non-negative reactions.</p>',dict(kind='beam',L=L,W=W,P=P,c=c))
for v,(L,H,m1,m2) in enumerate([(4,3,2,3),(6,4,3,2)],1):
 gx=(m1*s.Rational(L,2)+m2*L)/(m1+m2);gy=m2*s.Rational(H,2)/(m1+m2)
 add('moments','M',3,v,'The whole wire-bracket centre and hanging angle',r'<p>A horizontal uniform rod from \((0,0)\) to \(('+str(L)+r',0)\) has mass \('+str(m1)+r'\) kg. It joins a vertical uniform rod to \(('+str(L)+','+str(H)+r')\), mass \('+str(m2)+r'\) kg. Find both centre coordinates and the tangent of the acute angle between the first rod and downward vertical when suspended from the origin.</p>',[f('x','Centre x-coordinate',gx),f('y','Centre y-coordinate',gy),f('tangent','Tangent of specified hanging angle',gy/gx)],'<p>Weight the rod midpoint coordinates by mass. The line from the pivot to the combined centre becomes vertically downward.</p>',dict(kind='wire',L=L,H=H,m1=m1,m2=m2))
for v,(w,H,A,cx,cy) in enumerate([(6,4,4,4,2),(8,6,4,6,4)],1):
 gx=(w*H*s.Rational(w,2)-A*cx)/(w*H-A);gy=(w*H*s.Rational(H,2)-A*cy)/(w*H-A)
 add('laminas','L',1,v,'Both coordinates after removing a hole',r'<p>A uniform \('+str(w)+r'\) by \('+str(H)+r'\) rectangular lamina occupies the first quadrant. A square hole of area \('+str(A)+r'\) is centred at \(('+str(cx)+','+str(cy)+r')\). Find both coordinates of the remaining centre of mass.</p>',[f('x','Remaining centre x-coordinate',gx),f('y','Remaining centre y-coordinate',gy)],'<p>Subtract the hole first moments and area. The remaining mass is proportional to the remaining area.</p>',dict(kind='hole',width=w,height=H,area=A,cx=cx,cy=cy))
for v,(gx,gy,py) in enumerate([(4,s.Rational(6,5),3),(3,2,6)],1):
 delta=py-gy
 add('laminas','L',2,v,'The correct suspension reference',r'<p>A rigid lamina has centre \(G=('+T(gx)+','+T(gy)+r')\) and is freely suspended from \(S=(0,'+str(py)+r')\). A named side originally points vertically down from S. Give the tangent of its acute angle to the downward vertical after suspension and the length SG.</p>',[f('tangent','Tangent of specified angle',s.Rational(gx,delta)),f('distance','Distance SG',s.sqrt(gx*gx+delta*delta))],'<p>Use the S-to-G line and its distances from S. Do not replace the vertical separation by the original y-coordinate of G.</p>',dict(kind='suspension',gx=str(gx),gy=str(gy),py=py))
for v,(gx,gy,mu) in enumerate([(s.Rational(8,3),3,s.Rational(1,2)),(2,5,s.Rational(3,5))],1):
 top=s.Rational(gx,gy);limit=min(top,mu)
 add('laminas','L',3,v,'All inclination limits',r'<p>A body rests with its base from \(x=0\) to \(x=4\). Its body-fixed centre is \(('+T(gx)+','+T(gy)+r')\). The base rises to the right at angle \(\alpha\ge0\), with friction coefficient \('+T(mu)+r'\). Weight and the plane contact are its only external forces. Give the toppling value of \(\tan\alpha\), sliding value and complete allowed interval for \(\tan\alpha\), including the limits.</p>',[f('topple','Toppling value of tan(alpha)',top),f('slide','Sliding value of tan(alpha)',mu),f('interval','Full allowed tan(alpha) interval','[0,'+str(limit)+']','set')],'<p>The downhill projection reaches the base endpoint at tan(alpha)=xbar/ybar. Compare this with the separate friction limit mu and retain the smaller bound.</p>',dict(kind='tilt',gx=str(gx),gy=gy,mu=str(mu)))
for v,(R,H,K) in enumerate([(2,6,3),(2,4,3)],1):
 vc=R*R*H;vk=s.Rational(R*R*K,3);gz=s.cancel((s.Rational(vc*H,2)+vk*(H+s.Rational(K,4)))/(vc+vk))
 add('solids','S',1,v,'Composite solid centre and toppling condition',r'<p>A solid cylinder of radius \('+str(R)+r'\) and height \('+str(H)+r'\) carries a coaxial solid cone of the same radius and height \('+str(K)+r'\), all of the same density. Use the cone centre one quarter of its height above its base. Give the cone-to-cylinder mass ratio, combined centre height from the lower face and tan(alpha) at downhill toppling, with sliding prevented.</p>',[f('ratio','Cone to cylinder mass ratio',vk/vc),f('height','Combined centre height',gz),f('topple','Toppling value of tan(alpha)',R/gz)],'<p>Use solid volumes, convert the cone centre to the lower-base reference, and compare the centre height with the base radius.</p>',dict(kind='cylinder_cone',R=R,H=H,K=K))
for v,(R,H,rr,depth) in enumerate([(3,8,1,4),(2,6,1,2)],1):
 volume=R*R*H;hole=rr*rr*depth;gz=s.cancel((s.Rational(volume*H,2)-hole*(H-s.Rational(depth,2)))/(volume-hole))
 add('solids','S',2,v,'Both reference distances after a blind bore',r'<p>A uniform cylinder has radius \('+str(R)+r'\) and height \('+str(H)+r'\). A coaxial blind bore of radius \('+str(rr)+r'\) and depth \('+str(depth)+r'\) opens at the top. Give the remaining centre height above the base and its distance below the top.</p>',[f('height','Centre height above base',gz),f('below','Centre distance below top',H-gz)],'<p>The removed cylinder centre is half the bore depth below the opening. Subtract its volume and first moment, then convert references.</p>',dict(kind='bore',R=R,H=H,r=rr,depth=depth))
for v,(R,rr,H) in enumerate([(3,1,13),(2,1,7)],1):
 large=s.Rational(H*R,R-rr);small=large-H;vl=R*R*large;vs=rr*rr*small;gz=s.cancel((vl*large/4-vs*(H+small/4))/(vl-vs))
 add('solids','S',3,v,'A frustum and its suspension angle',r'<p>A uniform solid frustum has lower radius \('+str(R)+r'\), upper radius \('+str(rr)+r'\) and height \('+str(H)+r'\). Use a solid cone centre one quarter of its height from the base. Give the removed-to-large-cone mass ratio, the frustum centre height above the lower face and the tangent of the angle between a base diameter and downward vertical when suspended from its lower rim.</p>',[f('ratio','Removed to large cone mass ratio',vs/vl),f('height','Frustum centre height',gz),f('tangent','Tangent of specified suspension angle',gz/R)],'<p>Recover both similar-cone heights. Subtract their first moments in the same coordinate. In the rim suspension use a radius as the horizontal offset.</p>',dict(kind='frustum',R=R,r=rr,H=H))
for v,(W,tan) in enumerate([(100,s.Rational(3,4)),(60,s.Rational(4,3))],1):
 wall=W/(2*tan)
 add('contacts','C',1,v,'The full smooth-wall ladder force set',r'<p>A uniform ladder of weight \('+str(W)+r'\) N rests on rough horizontal ground against a smooth vertical wall, with \(\tan\theta='+T(tan)+r'\). Give the ground normal, wall reaction, required ground-friction magnitude and least coefficient of friction.</p>',[f('normal','Ground normal reaction in N',W),f('wall','Wall reaction in N',wall),f('friction','Required friction magnitude in N',wall),f('mu','Least coefficient of friction',wall/W)],'<p>Moments about the ground contact determine the wall force. Vertical and horizontal force balance then give N and F; the least coefficient is F/N.</p>',dict(kind='ladder',W=W,tangent=str(tan)))
for v,(L,c,W,tan) in enumerate([(5,3,100,s.Rational(4,3)),(6,4,80,s.Rational(3,4))],1):
 cs=1/s.sqrt(1+tan*tan);sn=tan*cs;R=W*L*cs/(2*c);F=R*sn;N=W-R*cs
 add('contacts','C',2,v,'The whole smooth-peg contact model',r'<p>A uniform rod of length \('+str(L)+r'\) and weight \('+str(W)+r'\) N rises to the right from rough horizontal ground, with \(\tan\theta='+T(tan)+r'\). A smooth peg \('+str(c)+r'\) along the rod pushes perpendicular to it upwards-left. Give the peg reaction, ground normal, rightward friction magnitude and least coefficient.</p>',[f('peg','Peg reaction in N',R),f('normal','Ground normal reaction in N',N),f('friction','Rightward ground friction in N',F),f('mu','Least coefficient of friction',s.cancel(F/N))],'<p>The peg moment is its magnitude times distance along the rod, because the reaction is perpendicular. Resolve that force before finding the ground components.</p>',dict(kind='peg',L=L,c=c,W=W,tangent=str(tan)))
for v,(L,H,natural,c) in enumerate([(6,8,8,4),(4,3,4,3)],1):
 length=s.sqrt(L*L+H*H);tension=(s.Rational(L,2)+s.Rational(c,2))*length/(L*H);horizontal=tension*L/length;vertical=s.Rational(3,2)-tension*H/length;modulus=tension*natural/(length-natural)
 add('contacts','C',3,v,'All hinge and elastic-string values',r'<p>A horizontal uniform rod of length \('+str(L)+r'a\) and weight W is hinged at its left end. A string joins its right end to a wall point \('+str(H)+r'a\) above the hinge; its natural length is \('+str(natural)+r'a\). A load \(W/2\) acts \('+str(c)+r'a\) from the hinge. Give T/W, rightward hinge H/W, upward hinge V/W and modulus lambda/W.</p>',[f('tension','Cable tension divided by W',tension),f('horizontal','Rightward hinge force divided by W',horizontal),f('vertical','Upward hinge force divided by W',vertical),f('modulus','Modulus divided by W',modulus)],'<p>Use the actual string direction in the moment equation. Resolve all forces, then use extension divided by natural length to recover the modulus.</p>',dict(kind='elastic',L=L,H=H,natural=natural,c=c))
choices={
 'moments':[('What is a moment arm?','Which distance multiplies a force to give its moment magnitude?',{'A':'Any distance to the body','B':'The perpendicular distance to its line of action','C':'The full rod length in every case','D':'The distance to the centre of mass in every case'},'B','The turning effect depends on perpendicular distance to the force line.'),('A unilateral support','An assumed smooth support gives a negative normal reaction. What follows?',{'A':'The support can always pull down','B':'Change the weight sign','C':'The assumed contact configuration is not physically possible','D':'Ignore the negative sign'},'C','An ordinary one-sided contact cannot provide tension.')],
 'laminas':[('A removed region','How does a hole enter the first-moment calculation?',{'A':'Subtract area only','B':'Add its first moment','C':'Keep the original centre unchanged','D':'Subtract both its area and first moment'},'D','The missing material contributes neither mass nor moment to the remaining body.'),('A toppling threshold','When can a calculated toppling angle actually be reached?',{'A':'When friction and all other contact conditions also permit it','B':'Always, regardless of friction','C':'Only if the centre of mass is at the pivot','D':'Only if every reaction is negative'},'A','Sliding or loss of another contact may occur first.')],
 'solids':[('A solid cavity','For equal-density solid components, which weights determine their combined centre?',{'A':'Cross-sectional drawing areas','B':'Volumes, with the cavity subtracted','C':'Only their heights','D':'Only their radii'},'B','The real masses are proportional to volumes, not drawing areas.'),('An absent joining face','A thin cylinder has no top face under its hemispherical cap. Should a joining disc be counted?',{'A':'Yes, every rim has a massive disc','B':'Only for toppling calculations','C':'No, count only the material surfaces present','D':'Replace all surfaces by solid volumes'},'C','A geometric joining circle does not itself add material.')],
 'contacts':[('Friction in ordinary equilibrium','Which is generally valid at a rough contact with normal N?',{'A':r'\(F=\mu N\) in every equilibrium','B':'Friction always acts upwards','C':'Friction has no moment','D':r'\(|F|\le\mu N\), with equality at a specified limiting state'},'D','Equilibrium determines the required friction; the bound determines whether it is available.'),('An elastic string','Which length is in the denominator of the extension ratio in Hooke’s law?',{'A':'Natural length','B':'Current extended length','C':'Rod length','D':'Distance to the centre of mass'},'A','For a stretched light string, T=lambda times extension divided by natural length.')]
}
for key,code in [('moments','M'),('laminas','L'),('solids','S'),('contacts','C')]:
 for v,(title,prompt,options,answer,why) in enumerate(choices[key],1):add(key,code,4,v,title,'<p>'+prompt+'</p>',[dict(key='reason',label='Reason',type='choice',expected=answer,options=options)],'<p>'+why+'</p>',dict(kind='logic',answer=answer))
def lesson(q):
 if q['topic'] in ['Moments and support reactions','Composite rods and frames']:return 'moments'
 if q['topic'].startswith('Laminas:'):return 'laminas'
 if q['topic']=='Composite solids':return 'solids'
 return 'contacts'
archive={r['id']:r for r in mapping['rows']};rows=[];fixtures=[]
assets=[{k:v for k,v in im.items() if k not in ['source_name','source_sha256','bank_number']} for im in media['images']]
def rewrite(value,q):
 for im in media['images']:
  if im['question_uid']==q['content_uid']:value=value.replace(im['source_name'],'/api/files/'+im['file_id'])
 return value.replace('Geometry of the new variant. Diagram not to scale.','Diagram not to scale.')
for original in [q for l in owner['lessons'] for q in l['questions']]:
 key=lesson(original);row=archive[original['id']]
 parts=[dict(label=chr(97+i),marking_criteria=[dict(code='',marks=c['marks'],description_html=c['criterion_html']) for c in p['criteria']]) for i,p in enumerate(original['parts'])]
 figures=''.join(re.findall(r'<figure\b[^>]*>[\s\S]*?</figure>',original['question_html']))
 assert figures.count('<img')==sum(im['question_uid']==original['content_uid'] and im['role']=='STATEMENT' for im in media['images'])
 prompt=original['stem_html']+figures+'<ol class="parts" type="a">'+''.join('<li>'+p['prompt_html']+'<span class="marks">['+str(p['marks'])+']</span></li>' for p in original['parts'])+'</ol>'
 q=dict(id=original['content_uid'],family_uid=original['content_uid'],lesson=key,title=original['title'],collection='exam',prompt_html=rewrite(prompt,original),answer_html=rewrite(original['answer_html'],original),solution_html=rewrite(original['solution_html'],original),hint_html=rewrite(original['hint_html'],original),marks=original['marks'],difficulty=original['difficulty'],fields=[],parts=parts,verification='OWNER-'+str(original['bank_number']),provenance=dict(original_id=row['original_id'],original_uid=row['original_uid'],archiveTaskId=row['archiveTaskId'],sourceSha256=sha,ownerProvenance=original['provenance']))
 questions.append(q);rows.append({**row,'lesson':key,'marks':q['marks'],'contentSha256':digest(q)});fixtures.append(dict(uid=q['id'],bank_number=original['bank_number'],original=original,contentSha256=digest(q)))
for m in quick_models:m['contentSha256']=digest(next(q for q in questions if q['id']==m['uid']))
for m in example_models:m['contentSha256']=digest(next(e for l in lessons for e in l['examples'] if e['verification']==m['id']))
pack=dict(schema_version=1,key='9231-mechanics-equilibrium',version='1.0.1',course=dict(slug='maths4u-9231-mechanics',title='Further Mechanics (9231)',code='9231',direction='further'),chapter=dict(id='fm_equilibrium',slug='equilibrium-of-a-rigid-body',title='Equilibrium of a rigid body',position=1),source=dict(sha256=sha,supplied=48,held=[]),lessons=lessons,questions=questions,marking_status='DRAFT',assets=assets)
assert len(questions)==80 and len(quick_models)==32 and len(example_models)==16 and len(assets)==46
def write(path,value):Path(path).write_text(json.dumps(value,ensure_ascii=False,indent=2,default=str)+'\n',encoding='utf8')
write('content/original/9231-mechanics/equilibrium-v1.json',pack)
write('content/original/9231-mechanics/equilibrium-verification-v1.json',dict(owner=fixtures,quick=quick_models,examples=example_models,teachingDigests={l['id']:digest(l) for l in lessons}))
write('docs/ARENA-C5-MECHANICS-EQUILIBRIUM-SOURCE-AUDIT-20261107.json',dict(sourceSha256=sha,rows=rows,supplied=48,held=[],assets=media,book=dict(path='D:/new_books/cambridge_international_as_a_level_full_book_for_further_pure_mathematics.pdf',pdfPages=[333,364],printedPages=[321,352],sections=['14.1','14.2','14.3','14.4'],use='Mathematical sequence only. Independently authored explanations and examples; no book wording, exercises, examples or figures reproduced.'),sourceAlreadyRevisedSummary=owner['editorial_summary'],crossTopic=owner['syllabus_review']['notes_ru'],presentationNormalisation=['Generic new-variant figure caption shortened to Diagram not to scale.','Criteria have no source M/A codes; codes stay empty.'],editorialRepairs=[]))
print(json.dumps(dict(owner=48,quick=32,examples=16,lessons=4,statementImages=43,solutionImages=3)))
