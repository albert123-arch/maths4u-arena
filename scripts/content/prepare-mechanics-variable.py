"""Append-only package projection; the E: source and its marking remain unchanged."""
import argparse,hashlib,html,json,re
from pathlib import Path
import sympy as s
from mechanics_variable_teaching import lessons,models as example_models,T,D
ap=argparse.ArgumentParser();ap.add_argument('--source',required=True);ap.add_argument('--mapping',required=True);ap.add_argument('--assets',required=True);args=ap.parse_args()
source=Path(args.source);owner=json.loads(source.read_text(encoding='utf-8-sig'));mapping=json.loads(Path(args.mapping).read_text(encoding='utf8'));media=json.loads(Path(args.assets).read_text(encoding='utf8'));media=media.get('assets',media)
sha=hashlib.sha256(source.read_bytes()).hexdigest();assert sha==mapping['sourceSha256']
x,t,z=s.symbols('x t z');questions=[];quick_models=[]
def digest(v):return hashlib.sha256(json.dumps(v,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()
def f(key,label,value,kind='number',variables=None):return dict(key=key,label=label,type=kind,expected=[str(c) for c in value] if kind=='ratio' else str(value),**({'variables':variables} if variables else {}))
def add(lesson,code,family,v,title,prompt,fields,solution,model):
 uid=f'M4U-9231-MVAR-{code}{family}{v}'
 hints={
  'time':'Choose a positive direction and divide resultant force by mass. Integrate or separate with both initial conditions; distinguish a turning point, a return and a force switch.',
  'position':'Use a=v dv/dx, integrate with the initial speed, then choose the signed velocity branch. Test reachability and the domain before accepting a zero or singular endpoint.',
  'resistance':'Keep resistance opposite to the actual motion. Separate the correct branch, retain any root restriction and stop the formula at the first event or direction change.',
  'limits':'Solve from the initial state, then check the limit and finite-time reachability. For constant power and quadratic resistance, use w=v³ as a function of displacement.'
 }
 def display(field):
  if field['type']=='choice':return field['options'][field['expected']]
  if field['type']=='ratio':return r'\(\frac{'+T(field['expected'][0])+'}{'+T(field['expected'][1])+r'}\)'
  if field['type']=='pairs':
   pairs=[r'\left('+','.join(T(s.sympify(c)) for c in pair[1:-1].split(','))+r'\right)' for pair in field['expected'].split(';')]
   return r'\(\left\{'+','.join(pairs)+r'\right\}\)'
  if field['type']=='set':
   value=field['expected'];left=r'\{' if value[0]=='{' else value[0];right=r'\}' if value[-1]=='}' else value[-1]
   return r'\(\left'+left+','.join(T(s.oo if c=='inf' else -s.oo if c=='-inf' else s.sympify(c)) for c in value[1:-1].split(','))+r'\right'+right+r'\)'
  return r'\('+T(field['expected'])+r'\)'
 q=dict(id=uid,family_uid=f'M4U-9231-MVAR-{code}{family}',lesson=lesson,title=title,collection='short' if v==1 else 'variant',prompt_html=prompt,answer_html='<p>'+'; '.join(html.escape(a['label'])+': '+display(a) for a in fields)+'</p>',solution_html=solution,hint_html='<p>'+hints[lesson]+'</p>',marks=len(fields),difficulty=2 if family<3 else 3,fields=fields,parts=[dict(label='',marking_criteria=[dict(code='A1',marks=1,description_html='<p>Give the complete correct '+html.escape(a['label'].lower())+'.</p>') for a in fields])],verification=uid)
 questions.append(q);quick_models.append(dict(uid=uid,model=model))

R=s.Rational
for v,(mass,A,B,u0) in enumerate([(R(2),R(3),R(2),R(5)),(R(3),R(2),R(3),R(4))],1):
 velocity=u0+A*t-B*t*t/2;position=u0*t+A*t*t/2-B*t**3/6
 add('time','T',1,v,'Both full trajectories and a signed force',r'<p>A particle of mass \('+T(mass)+r'\) kg has resultant force \(F='+T(mass*(A-B*t))+r'\) N, with positive direction fixed. Initially x=0 and v='+T(u0)+r' m s⁻¹. Give the full polynomials v(t), x(t), and signed force at t=1 s.</p>',[f('velocity','Full velocity polynomial in t',s.expand(velocity),'polynomial',['t']),f('position','Full position polynomial in t',s.expand(position),'polynomial',['t']),f('force','Signed force at t=1 in N',mass*(A-B))],'<p>Divide force by mass, integrate twice, and use both initial conditions. A negative force can occur while velocity is still positive.</p>',dict(kind='time_poly',mass=str(mass),A=str(A),B=str(B),u=str(u0)))
for v,p in enumerate([R(20),R(32)],1):
 coefficient=p/2
 add('time','T',2,v,'Complete rational trajectories and the finite travel limit',r'<p>A particle starts at O with velocity \('+T(coefficient)+r'\) m s⁻¹ and acceleration \(-'+T(p)+r'/(1+t)^3\) m s⁻² for t≥0. Give the complete v(t) and x(t) as ratios (numerator; denominator), the limiting position, and v(1).</p>',[f('velocity','Velocity ratio in t: numerator; denominator',[coefficient,(1+t)**2],'ratio',['t']),f('position','Position ratio in t: numerator; denominator',[coefficient*t,1+t],'ratio',['t']),f('limit','Limiting position in m',coefficient),f('speed','Speed at t=1 in m per s',coefficient/4)],'<p>Integration gives a positive velocity proportional to (1+t)⁻². Integrate again with x(0)=0. The limiting position is approached, not reached at finite time.</p>',dict(kind='time_decay',p=str(p)))
for v,(q,x0,mass) in enumerate([(R(3),R(2),R(2)),(R(4),R(1),R(3))],1):
 position=x0*(1+t)**q;velocity=s.diff(position,t);force=s.diff(velocity,t).subs(t,1)*mass
 add('time','T',3,v,'Reconstruct position, velocity and force',r'<p>A particle of mass \('+T(mass)+r'\) kg satisfies \(v/x='+T(q)+r'/(1+t)\) for t≥0, with x(0)='+T(x0)+r' m. Give the complete position and velocity polynomials and the signed force at t=1 s.</p>',[f('position','Full position polynomial in t',s.expand(position),'polynomial',['t']),f('velocity','Full velocity polynomial in t',s.expand(velocity),'polynomial',['t']),f('force','Signed force at t=1 in N',force)],'<p>Use v=dx/dt to separate the position equation, then apply x(0). Differentiate twice and multiply acceleration by mass for the force.</p>',dict(kind='x_ratio',q=str(q),x0=str(x0),mass=str(mass)))
for v,(c,u2,turn) in enumerate([(R(6),R(32),R(2)),(R(3,2),R(27),R(3))],1):
 velocity2=u2-2*c*x**3/3
 add('position','P',1,v,'The complete squared velocity and first turn',r'<p>A particle starts at x=0 moving forwards with speed squared \('+T(u2)+r'\) m² s⁻². Its acceleration is \(-'+T(c)+r'x^2\) m s⁻² for x≥0. Give the full polynomial v²(x), first turning position and signed acceleration there.</p>',[f('velocity2','Full squared velocity polynomial in x',s.expand(velocity2),'polynomial',['x']),f('turn','First turning position in m',turn),f('acceleration','Signed acceleration at the turn',-c*turn**2)],'<p>Integrate v dv=−c x² dx and apply the initial speed. Use the first non-negative zero of v²; the forward branch ends there.</p>',dict(kind='position_poly',c=str(c),u2=str(u2)))
for v,(start,u2,k0) in enumerate([(R(1),R(4),R(6)),(R(2),R(9),R(12))],1):
 A=u2-2*k0/start;B=2*k0;turn=-B/A
 add('position','P',2,v,'An inverse-square force with every branch quantity',r'<p>A particle starts at x='+T(start)+r' m moving outwards with speed squared '+T(u2)+r' m² s⁻², under acceleration \(-'+T(k0)+r'/x^2\) m s⁻². Write \(v^2=A+B/x\). Give both A and B, the greatest x, and signed acceleration there.</p>',[f('A','Constant A in the full squared-velocity law',A),f('B','Coefficient B in the full squared-velocity law',B),f('turn','Greatest position in m',turn),f('acceleration','Signed acceleration at the turn',-k0/turn**2)],'<p>Use the definite work integral from the initial position. The outward branch has a finite upper turn because its constant term is negative.</p>',dict(kind='inverse_square',start=str(start),u2=str(u2),k=str(k0)))
for v,(b,c,start) in enumerate([(R(3),R(2),R(7)),(R(1),R(3),R(5))],1):
 velocity=-c*(x-b)
 add('position','P',3,v,'Signed velocity and the entire exponential trajectory',r'<p>A particle starts at x='+T(start)+r' m and follows the leftward branch \(v=-'+T(c)+r'(x-'+T(b)+r')\) on \(x\gt'+T(b)+r'\). Write \(x(t)=A+B e^{-Ct}\). Give the full polynomial v(x), A, B, C, and signed acceleration at launch.</p>',[f('velocity','Full signed velocity polynomial in x',s.expand(velocity),'polynomial',['x']),f('A','Constant A in the complete trajectory',b),f('B','Coefficient B in the complete trajectory',start-b),f('C','Rate C in the complete trajectory',c),f('acceleration','Signed acceleration at launch',c*c*(start-b))],'<p>The initial velocity is negative. Separating dx/dt=−c(x−b) gives the full trajectory, which remains above b at every finite time. Use v dv/dx for acceleration.</p>',dict(kind='position_limit',b=str(b),c=str(c),start=str(start)))
for v,(u0,k0) in enumerate([(R(10),R(1,20)),(R(9),R(1,6))],1):
 B=k0*u0
 add('resistance','V',1,v,'Reconstruct both quadratic-drag functions',r'<p>A particle starts at O with speed '+T(u0)+r' m s⁻¹ and obeys \(dv/dt=-'+T(k0)+r'v^2\). Write \(v(t)=A/(1+Bt)\) and \(x(t)=C\ln(1+Bt)\). Give A, B, C and the first time at half the initial speed.</p>',[f('A','A in the full velocity function',u0),f('B','B shared by both full functions',B),f('C','C in the full displacement function',1/k0),f('time','First half-speed time in s',1/B)],'<p>Separate dv/v²=−k dt, then integrate the velocity. The half-speed event has 1+Bt=2; zero speed is approached only as t tends to infinity.</p>',dict(kind='quadratic_drag',u=str(u0),k=str(k0)))
for v,(u0,k0) in enumerate([(R(9),R(2)),(R(16),R(2))],1):
 velocity=(s.sqrt(u0)-k0*t/2)**2;stop=2*s.sqrt(u0)/k0;distance=s.integrate(velocity,(t,0,stop))
 add('resistance','V',2,v,'The full pre-stop function and its validity interval',r'<p>A particle starts at speed '+T(u0)+r' m s⁻¹ with \(dv/dt=-'+T(k0)+r'\sqrt v\) while moving. At rest force is zero and there is no drive. Give the complete pre-stop polynomial v(t), first stopping time, total distance before stopping, full pre-stop time interval and speed at twice the stopping time.</p>',[f('velocity','Full pre-stop speed polynomial in t',s.expand(velocity),'polynomial',['t']),f('stop','First stopping time in s',stop),f('distance','Distance before stopping in m',distance),f('interval','Complete pre-stop time interval','[0,'+str(stop)+']','set'),f('later','Speed at twice the stopping time',0)],'<p>Keep sqrt(v)=sqrt(u)−kt/2 non-negative. Integrate the speed only up to its first zero. The later speed remains zero; the squared expression must not be restarted.</p>',dict(kind='sqrt_stop',u=str(u0),k=str(k0)))
for v,(g0,c) in enumerate([(R(10),R(1,2)),(R(10),R(1,4))],1):
 u0=g0/c;A=2*u0;B=-u0;K=1/c;R0=u0/c;S0=-R0
 add('resistance','V',3,v,'The whole ascent function, turning time and height',r'<p>A particle is projected upwards from O at '+T(u0)+r' m s⁻¹. During ascent, \(dv/dt=-'+T(g0)+r'-'+T(c)+r'v\), with upward positive. Write \(v=A e^{-ct}+B\), \(T=K\ln2\) and \(H=R+S\ln2\), where c is the coefficient in the force law. Give all A, B, K, R and S.</p>',[f('A','A in the full ascent velocity',A),f('B','B in the full ascent velocity',B),f('K','K in the complete turning time',K),f('R','R in the complete maximum height',R0),f('S','S in the complete maximum height',S0)],'<p>Separate using v+g/c, then integrate velocity with x(0)=0. Since the launch speed equals g/c here, the exponential at the top is one half. These formulas describe ascent only.</p>',dict(kind='up_linear',g=str(g0),c=str(c),u=str(u0)))
for v,(A,c) in enumerate([(R(12),R(2)),(R(15),R(3))],1):
 L=A/c;B=-L;D0=-L/c;K=1/c
 add('limits','L',1,v,'Both driven trajectories and a finite target time',r'<p>A particle starts from rest at O under \(dv/dt='+T(A)+r'-'+T(c)+r'v\). Write \(v=L+B e^{-ct}\), \(x=Lt+D(1-e^{-ct})\), and the first half-limit time as \(T=K\ln2\), using the known c from the law. Give L, B, D, K and initial acceleration.</p>',[f('L','L in both full trajectories',L),f('B','B in the full velocity',B),f('D','D in the full displacement',D0),f('K','K in the half-limit time',K),f('acceleration','Initial acceleration',A)],'<p>Use the zero-acceleration speed as a candidate L, then solve with v(0)=0. Integrating gives the full displacement. The target L/2 is finite, whereas L itself is not reached at finite time.</p>',dict(kind='linear_limit',A=str(A),c=str(c)))
for v,(drive,c,u0,target) in enumerate([(R(5),R(1,2),R(18),R(14)),(R(4),R(1,3),R(20),R(16))],1):
 L=drive/c;B=u0-L;K=1/c;R0=L/c;S0=B/(2*c)
 add('limits','L',2,v,'Approach the limit from above',r'<p>A particle starts at O with speed '+T(u0)+r' m s⁻¹ and obeys \(dv/dt='+T(drive)+r'-'+T(c)+r'v\). Write \(v=A+B e^{-ct}\). At speed '+T(target)+r' m s⁻¹, write \(T=K\ln2\) and \(x=R\ln2+S\). Give all A, B, K, R and S, using the known c.</p>',[f('A','A in the full velocity law',L),f('B','B in the full velocity law',B),f('K','K in the full event time',K),f('R','R in the full event displacement',R0),f('S','S in the full event displacement',S0)],'<p>The initial speed is above the limit, so the exponential coefficient is positive and speed decreases. At the specified midpoint speed the exponential equals one half.</p>',dict(kind='above_limit',drive=str(drive),c=str(c),u=str(u0),target=str(target)))
for v,(mass,k0,limit,u0) in enumerate([(R(2),R(1,4),R(5),R(2)),(R(3),R(1,3),R(4),R(3))],1):
 P=k0*limit**3;power=mass*P
 add('limits','L',3,v,'The complete cubic-speed law and driving power',r'<p>A particle of mass '+T(mass)+r' kg starts at O with speed '+T(u0)+r' m s⁻¹. Its forward driving force is \('+T(power)+r'/v\) N and its opposing resistance is \('+T(mass*k0)+r'v^2\) N. Write \(v^3=A+B e^{-Cx}\). Give A, B, C, limiting speed and driving power in W.</p>',[f('A','A in the complete cubic-speed law',limit**3),f('B','B in the complete cubic-speed law',u0**3-limit**3),f('C','C in the complete cubic-speed law',3*k0),f('limit','Limiting speed in m per s',limit),f('power','Driving power in W',power)],'<p>Divide resultant force by mass and use v dv/dx. With w=v³, separate dw/dx=3(P−kw). The driving power is force times speed, not the driving force coefficient divided by speed.</p>',dict(kind='constant_power',mass=str(mass),k=str(k0),limit=str(limit),u=str(u0)))
choices={
 'time':[('Two constants','After integrating an acceleration twice, which information fixes a full trajectory?',{'A':'Only the initial velocity','B':'Initial velocity and initial position','C':'Only the mass','D':'Setting both constants to zero automatically'},'B','The velocity and position integrations each introduce their own constant.'),('Distance across a reversal','A signed velocity changes sign inside a time interval. How is total distance found?',{'A':'Always take the final displacement','B':'Ignore the part after the turn','C':'Integrate |v|, splitting at the velocity zero','D':'Integrate acceleration instead'},'C','Distance counts motion in both directions as positive.')],
 'position':[('The chain-rule link','Which identity connects acceleration to velocity as a function of position on a monotone branch?',{'A':'a=dv/dx','B':'a=x dv/dx','C':'a=dx/dv','D':'a=v dv/dx'},'D','Apply dv/dt=(dv/dx)(dx/dt), with dx/dt=v.'),('A zero of the velocity formula','A trajectory approaches a candidate point with a divergent integral of dx/v. What follows?',{'A':'The point is not reached at finite time on that branch','B':'It must be reached immediately','C':'The negative square root must be chosen','D':'The force is necessarily zero everywhere'},'A','Reachability depends on elapsed time, not only on solving v=0 algebraically.')],
 'resistance':[('A squared stopping formula','After a derived sqrt(v) becomes negative, may its square be used to restart a particle with no drive?',{'A':'Yes, because a square is non-negative','B':'No, the original branch restriction has failed','C':'Yes, if mass is positive','D':'Only by changing the sign of time'},'B','The squared continuation does not satisfy the original resistance law.'),('Drag after a turn','A particle reverses direction. What happens to a true resistance force?',{'A':'It always keeps the same fixed spatial direction','B':'It disappears permanently','C':'It changes direction so that it still opposes motion','D':'It becomes a driving force'},'C','Resistance opposes the instantaneous motion; it is not a fixed-direction forcing law.')],
 'limits':[('An asymptotic speed',r'In \(v=L+(u-L)e^{-ct}\), c&gt;0 and u≠L, when is v exactly L?',{'A':'Whenever acceleration is small','B':'At t=1/c','C':'At every positive time','D':'At no finite time; the value is approached as t tends to infinity'},'D','The nonzero exponential term does not vanish at finite time.'),('Constant power','Which driving law represents a positive constant power P for v>0?',{'A':'F=P/v','B':'F=P','C':'F=Pv','D':'F=Pv²'},'A','Power is Fv, so the driving force is inversely proportional to speed.')]
}
for key,code in [('time','T'),('position','P'),('resistance','V'),('limits','L')]:
 for v,(title,prompt,options,answer,why) in enumerate(choices[key],1):add(key,code,4,v,title,'<p>'+prompt+'</p>',[dict(key='reason',label='Reason',type='choice',expected=answer,options=options)],'<p>'+why+'</p>',dict(kind='logic',answer=answer))
def lesson(q):
 topic=q['topic']
 if topic=='Time-dependent models':return 'time'
 if topic in ['Force depending on position','Position–velocity–time links']:return 'position'
 if topic in ['Resistance and stopping','Reversals and vertical projection']:return 'resistance'
 assert topic in ['Limiting speeds','Constant power and switched forces'];return 'limits'


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
pack=dict(schema_version=1,key='9231-mechanics-variable',version='1.0.0',course=dict(slug='maths4u-9231-mechanics',title='Further Mechanics (9231)',code='9231',direction='further'),chapter=dict(id='fm_variable',slug='linear-motion-variable-force',title='Linear motion under a variable force',position=4),source=dict(sha256=sha,supplied=33,held=[]),lessons=lessons,questions=questions,marking_status='DRAFT',assets=assets)
assert len(questions)==65 and len(quick_models)==32 and len(example_models)==16 and len(assets)==8
def write(path,value):Path(path).write_text(json.dumps(value,ensure_ascii=False,indent=2,default=str)+'\n',encoding='utf8')
write('content/original/9231-mechanics/variable-v1.json',pack)
write('content/original/9231-mechanics/variable-verification-v1.json',dict(owner=fixtures,quick=quick_models,examples=example_models,teachingDigests={l['id']:digest(l) for l in lessons}))
write('docs/ARENA-C5-MECHANICS-VARIABLE-SOURCE-AUDIT-20261107.json',dict(sourceSha256=sha,rows=rows,supplied=33,held=[],assets=media,book=dict(path='D:/new_books/cambridge_international_as_a_level_full_book_for_further_pure_mathematics.pdf',pdfPages=[409,421],printedPages=[397,409],sections=['17.1','17.2'],use='Mathematical sequence only. Independently authored explanations and examples; no book wording, exercises, examples or figures reproduced.'),sourceAlreadyRevisedSummary=owner['editorial_summary'],crossTopic=owner['syllabus_review']['notes_ru'],presentationNormalisation=['Transparent owner SVGs rendered on a white background for legibility; mathematical labels unchanged.','Generic new-variant figure caption shortened to Diagram not to scale.','Criteria have no source M/A codes; codes stay empty.'],editorialRepairs=[]))
print(json.dumps(dict(owner=33,quick=32,examples=16,lessons=4,statementImages=4,solutionImages=4)))
