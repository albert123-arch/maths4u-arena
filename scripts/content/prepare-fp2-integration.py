"""Normalise the read-only owner chapter; add independently authored whole-answer practice."""
import argparse,hashlib,html,json
from pathlib import Path
import sympy as s
from fp2_integration_teaching import lessons,models as example_models,T,D,fmt
ap=argparse.ArgumentParser();ap.add_argument('--source',required=True);ap.add_argument('--mapping',required=True);ap.add_argument('--assets',required=True);args=ap.parse_args()
source=Path(args.source);owner=json.loads(source.read_text(encoding='utf-8-sig'));mapping=json.loads(Path(args.mapping).read_text(encoding='utf8'));media=json.loads(Path(args.assets).read_text(encoding='utf8'));sha=hashlib.sha256(source.read_bytes()).hexdigest();assert sha==mapping['sourceSha256']
media=media.get('assets',media)
x,t,n=s.symbols('x t n');questions=[];quick_models=[]
def digest(z):return hashlib.sha256(json.dumps(z,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()
def f(key,label,value,kind='number',variables=None):return dict(key=key,label=label,type=kind,expected=[str(z) for z in value] if isinstance(value,list) else str(value),**({'variables':variables} if variables else {}))
def ratio(key,label,value):
 a,b=s.fraction(s.cancel(value));return f(key,label,[a,b],'ratio',['n'])
def add(lesson,code,family,v,title,prompt,fields,solution,model):
 uid=f'M4U-9231-FINT-{code}{family}{v}'
 def value(z):
  if z['type']=='choice':return html.escape(z['options'][z['expected']])
  if z['type']=='ratio':return r'\(\frac{'+T(z['expected'][0])+'}{'+T(z['expected'][1])+r'}\)'
  return r'\('+T(z['expected'])+r'\)'
 q=dict(id=uid,family_uid=f'M4U-9231-FINT-{code}{family}',lesson=lesson,title=title,collection='short' if v==1 else 'variant',prompt_html=fmt(prompt),answer_html='<p>'+'; '.join(html.escape(z['label'])+': '+value(z) for z in fields)+'</p>',solution_html=fmt(solution),hint_html='<p>Write the full integral or identity first. Check the differential, both endpoints and all sign restrictions. Give every requested coefficient or value; these together specify the complete answer.</p>',marks=len(fields),difficulty=2 if family<3 else 3,fields=fields,parts=[dict(label='',marking_criteria=[dict(code='A1',marks=1,description_html='<p>Give the complete correct '+html.escape(z['label'].lower())+'.</p>') for z in fields])],verification=uid)
 questions.append(q);quick_models.append(dict(uid=uid,model=model))
for v,(a,k,q) in enumerate([(3,2,3),(2,3,2)],1):
 end=s.Rational(a*(q*q-1),2*q*k)
 add('techniques','T',1,v,'A complete hyperbolic integral',r'<p>Evaluate \(\int_0^{'+T(end)+r'}\frac{dx}{\sqrt{'+str(a*a)+'+'+str(k*k)+r'x^2}}\). Write the answer as A ln q, where q='+str(q)+'. Give A and the exact upper limit in u when x=(a/k)sinh u, written as u=ln q by giving q.</p>',[f('coefficient','Coefficient A',s.Rational(1,k)),f('endpoint','Upper exponential q',q)],D(r'x=\frac{'+str(a)+'}{'+str(k)+r'}\sinh u,\qquad\frac{dx}{\sqrt{'+str(a*a)+'+'+str(k*k)+r'x^2}}=\frac{du}{'+str(k)+'}')+'<p>The limits become 0 and ln q; integrating the constant gives the complete logarithmic result.</p>',dict(kind='inverse_integral',a=a,k=k,q=q,end=str(end)))
for v,(a,k) in enumerate([(4,2),(6,3)],1):
 end=s.Rational(a,2*k)
 add('techniques','T',2,v,'A circular root with its scale',r'<p>Evaluate \(\int_0^{'+T(end)+r'}\frac{dx}{\sqrt{'+str(a*a)+'-'+str(k*k)+r'x^2}}\), exactly.</p>',[f('value','Complete exact integral',s.pi/(6*k))],D(r'\int\frac{dx}{\sqrt{a^2-k^2x^2}}=\frac1k\sin^{-1}\frac{kx}{a}+C')+'<p>The upper inverse-sine argument is 1/2 and the lower is zero. Include the factor 1/k.</p>',dict(kind='circular_integral',a=a,k=k,end=str(end)))
for v,(a,q) in enumerate([(3,2),(2,3)],1):
 end=s.Rational(a*(q*q-1),2*q);A=s.Rational(a*a,2);B=s.Rational(a*a*(q**4-1),8*q*q)
 add('techniques','T',3,v,'The whole root integral',r'<p>Evaluate \(\int_0^{'+T(end)+r'}\sqrt{x^2+'+str(a*a)+r'}\,dx\). Write the complete result as A ln('+str(q)+')+B, and give both A and B exactly.</p>',[f('log','Logarithm coefficient A',A),f('constant','Constant B',B)],D(r'x=a\sinh u,\qquad\sqrt{x^2+a^2}\,dx=a^2\cosh^2u\,du',r'\int\cosh^2u\,du=\frac u2+\frac{\sinh2u}{4}')+'<p>The upper limit is ln q. Substitute it into both terms of the primitive.</p>',dict(kind='root_integral',a=a,q=q,end=str(end)))
for v,k in enumerate([2,3],1):
 add('reduction','R',1,v,'A complete exponential recurrence and value',r'<p>Let \(I_n=\int_0^1x^ne^{-'+str(k)+r'x}\,dx\). For n≥1 write \(A(n)I_n+B(n)I_{n-1}=e^{-'+str(k)+r'}\). Give both full polynomials A,B in n, then the full coefficients C,D in \(I_1=C+De^{-'+str(k)+r'}\).</p>',[f('a','Whole polynomial A',-k,'polynomial',['n']),f('b','Whole polynomial B',n,'polynomial',['n']),f('c','Constant coefficient C',s.Rational(1,k*k)),f('d','Exponential coefficient D',-s.Rational(k+1,k*k))],D(r'\frac d{dx}(x^ne^{-kx})=nx^{n-1}e^{-kx}-kx^ne^{-kx}',r'I_0=\frac{1-e^{-k}}k,\qquad I_1=\frac{1-(k+1)e^{-k}}{k^2}')+'<p>Evaluate the product at both endpoints for n≥1, then use n=1. The base integral is computed directly.</p>',dict(kind='exp_recurrence',k=k))
for v,a in enumerate([2,4],1):
 val=s.integrate((1+a*x)**2,(x,0,1))
 add('reduction','R',2,v,'A complete polynomial-family recurrence',r'<p>Let \(I_n=\int_0^1(1+'+str(a)+r'x)^n\,dx\). For n≥1 write \(A(n)I_n+B(n)I_{n-1}=('+str(a+1)+r')^n\). Give both full polynomials A,B and the exact value of I₂.</p>',[f('a','Whole polynomial A',n+1,'polynomial',['n']),f('b','Whole polynomial B',-n,'polynomial',['n']),f('value','Exact integral I2',val)],D(r'\frac d{dx}\{x(1+ax)^n\}',r'=(n+1)(1+ax)^n-n(1+ax)^{n-1}')+'<p>Integrate the derivative from 0 to 1. Directly integrate the expanded square to check the recurrence result.</p>',dict(kind='power_recurrence',a=a))
for v,a in enumerate([2,3],1):
 add('reduction','R',3,v,'A rational recurrence with its complete next value',r'<p>Let \(J_n=\int_0^1(1+'+str(a)+r'x^2)^{-n}\,dx\). Write \(A(n)J_n+B(n)J_{n+1}=('+str(a+1)+r')^{-n}\). Give both polynomials A,B in n and the coefficients C,D in J₂=C+DJ₁.</p>',[f('a','Whole polynomial A',1-2*n,'polynomial',['n']),f('b','Whole polynomial B',2*n,'polynomial',['n']),f('c','Constant coefficient C',s.Rational(1,2*(a+1))),f('d','Base coefficient D',s.Rational(1,2))],D(r'\frac d{dx}\{x(1+ax^2)^{-n}\}',r'=(1-2n)(1+ax^2)^{-n}+2n(1+ax^2)^{-n-1}')+'<p>The product is zero at the lower endpoint. Substitute n=1 and solve for J₂.</p>',dict(kind='rational_recurrence',a=a))
for v,k in enumerate([2,3],1):
 add('trigonometric','H',1,v,'A full scaled sine-power result',r'<p>For \(I_n=\int_0^{\pi/'+str(2*k)+r'}\sin^n('+str(k)+r'x)\,dx\), give the exact values of I₀, I₂ and I₄.</p>',[f('base','Exact I0',s.pi/(2*k)),f('middle','Exact I2',s.pi/(4*k)),f('target','Exact I4',3*s.pi/(16*k))],D(r'nI_n=(n-1)I_{n-2}\quad(n\ge2)',r'I_0=\frac\pi{2k},\quad I_2=\frac\pi{4k},\quad I_4=\frac{3\pi}{16k}')+'<p>The substitution u=kx changes the endpoint to π/2 and contributes 1/k.</p>',dict(kind='sine_values',k=k))
for v,(k,q) in enumerate([(2,2),(3,3)],1):
 A=s.Rational(1,2*k);B=s.Rational(q**4-1,8*k*q*q)
 add('trigonometric','H',2,v,'Both terms of a hyperbolic square integral',r'<p>Evaluate \(\int_0^{\ln('+str(q)+')/'+str(k)+r'}\cosh^2('+str(k)+r'x)\,dx\). Give both exact coefficients in A ln('+str(q)+')+B.</p>',[f('log','Logarithm coefficient A',A),f('constant','Constant B',B)],D(r'\cosh^2(kx)=\frac{1+\cosh(2kx)}2',r'\int\cosh^2(kx)\,dx=\frac x2+\frac{\sinh(2kx)}{4k}+C')+'<p>Evaluate both terms at the stated endpoints using exponential definitions.</p>',dict(kind='cosh_square',k=k,q=q))
for v,q in enumerate([2,3],1):
 val=s.Rational((q*q-1)**3,3*(q*q+1)**3)
 add('trigonometric','H',3,v,'A complete weighted hyperbolic integral',r'<p>Evaluate \(\int_0^{\ln'+str(q)+r'}\tanh^2x\operatorname{sech}^2x\,dx\), exactly.</p>',[f('value','Whole exact integral',val)],D(r'u=\tanh x,\qquad du=\operatorname{sech}^2x\,dx',r'\int\tanh^2x\operatorname{sech}^2x\,dx=\frac13\tanh^3x+C')+'<p>Use tanh(ln q)=(q²−1)/(q²+1) at the upper endpoint.</p>',dict(kind='weighted_hyperbolic',q=q))
for v,b in enumerate([1,3],1):
 X=t*t;Y=b*t-t**3/(3*b);speed=b+t*t/b;val=s.integrate(speed,(t,0,b))
 add('arcs','A',1,v,'The whole parametric length',r'<p>Find the exact arc length for \(x=t^2\), \(y='+T(Y)+r'\), 0≤t≤'+str(b)+'.</p>',[f('length','Complete exact length',val)],D(r'(X^{\prime})^2+(Y^{\prime})^2=(b+t^2/b)^2')+'<p>Here b='+str(b)+'. The square-root expression is positive throughout, so integrate b+t²/b.</p>',dict(kind='arc',X=str(X),Y=str(Y),lo='0',hi=str(b),speed=str(speed)))
for v,(a,q) in enumerate([(3,3),(5,2)],1):
 val=s.Rational(a*(q*q-1),2*q)
 add('arcs','A',2,v,'An entire catenary arc',r'<p>Find the exact length of \(y='+str(a)+r'\cosh(x/'+str(a)+r')\), 0≤x≤'+str(a)+'ln'+str(q)+'.</p>',[f('length','Complete exact length',val)],D(r'\sqrt{1+(y^{\prime})^2}=\cosh(x/a)',r'L=a\sinh(\ln q)')+'<p>Use the positive cosh branch and both endpoints.</p>',dict(kind='arc',X='t',Y=str(a)+'*cosh(t/'+str(a)+')',lo='0',hi=str(a)+'*log('+str(q)+')',speed='cosh(t/'+str(a)+')'))
for v,(a,b) in enumerate([(3,2),(4,3)],1):
 val=a*s.sqrt(1+b*b)/b
 add('arcs','A',3,v,'A polar length rather than an area',r'<p>Find the length of \(r='+str(a)+'e^{'+str(b)+r'\theta}\), 0≤θ≤ln2/'+str(b)+'.</p>',[f('length','Complete exact polar length',val)],D(r'\frac{ds}{d\theta}=a\sqrt{1+b^2}e^{b\theta}',r'L=\frac{a\sqrt{1+b^2}}b(2-1)')+'<p>The upper exponential equals 2. The speed uses r²+(dr/dθ)².</p>',dict(kind='polar_arc',r=str(a)+'*exp('+str(b)+'*t)',lo='0',hi='log(2)/'+str(b),speed=str(a)+'*sqrt('+str(1+b*b)+')*exp('+str(b)+'*t)'))
for v,k in enumerate([3,2],1):
 val=s.pi*k*s.sqrt(1+k*k)*4
 add('surfaces','S',1,v,'The whole curved area',r'<p>Rotate \(y='+str(k)+r'x\), 0≤x≤2, about the x-axis. Find only the curved surface area.</p>',[f('area','Complete curved area',val)],D(r'S=2\pi\int_0^2kx\sqrt{1+k^2}\,dx',r'=4\pi k\sqrt{1+k^2}')+'<p>The radius is kx≥0; do not add the end disc.</p>',dict(kind='surface',X='t',Y=str(k)+'*t',lo='0',hi='2',axis='x',speed='sqrt('+str(1+k*k)+')'))
for v,b in enumerate([2,3],1):
 X=t*t;Y=b*t-t**3/(3*b);speed=b+t*t/b;val=2*s.pi*s.integrate(X*speed,(t,0,1))
 add('surfaces','S',2,v,'Use the vertical-axis radius',r'<p>Rotate \(x=t^2\), \(y='+T(Y)+r'\), 0≤t≤1, about the y-axis. Find the curved area.</p>',[f('area','Complete vertical-axis surface',val)],D(r'\rho=t^2,\qquad\frac{ds}{dt}=b+t^2/b',r'S=2\pi\int_0^1t^2(b+t^2/b)\,dt')+'<p>Here b='+str(b)+'. Use the x-coordinate as the radius for this axis.</p>',dict(kind='surface',X=str(X),Y=str(Y),lo='0',hi='1',axis='y',speed=str(speed)))
for v,(c,end) in enumerate([(2,5),(3,7)],1):
 val=s.pi*s.sqrt(2)*(c*c+(end-c)**2)
 add('surfaces','S',3,v,'Both positive areas across an axis',r'<p>Rotate \(x=t\), \(y=t-'+str(c)+r'\), 0≤t≤'+str(end)+', about the x-axis. Find the whole curved area, accounting for the axis crossing.</p>',[f('split','Axis-crossing parameter',c),f('area','Complete area of both parts',val)],D(r'S=2\pi\sqrt2\int_0^b|t-c|\,dt',r'=\pi\sqrt2\{c^2+(b-c)^2\}')+'<p>Split at t=c. Both radius integrals are positive.</p>',dict(kind='surface',X='t',Y='t-'+str(c),lo='0',hi=str(end),axis='x',speed='sqrt(2)',split=str(c)))
for v,a in enumerate([2,3],1):
 U=s.cancel((n+1)*(2*n+1)/(6*n*n)+a*(n+1)/(2*n));L=s.cancel(U-(1+a)/n)
 add('limits','L',1,v,'Both complete rectangle formulae and their limit',r'<p>For \(f(x)=x^2+'+str(a)+r'x\) on [0,1], find the full upper and lower rectangle sums using N=n equal intervals. Give each as numerator; denominator in n, followed by their common limit.</p>',[ratio('upper','Whole upper sum',U),ratio('lower','Whole lower sum',L),f('limit','Common limit',s.Rational(1,3)+s.Rational(a,2))],D(r'U_n=\frac{(n+1)(2n+1)}{6n^2}+\frac{a(n+1)}{2n}',r'L_n=U_n-\frac{a+1}{n}')+'<p>The function increases on [0,1]. Right endpoints give the upper sum; the endpoint gap tends to zero.</p>',dict(kind='rectangles',f='x**2+'+str(a)+'*x'))
for v,(a,den) in enumerate([(3,1000),(6,400)],1):
 val=(a-1)*den+1
 add('limits','L',2,v,'A strict rectangle accuracy threshold',r'<p>For \(f(x)='+str(a)+r'^x\) on [0,1], find the least integer n for which the upper-minus-lower gap is strictly less than 1/'+str(den)+'.</p>',[f('least','Least valid integer n',val)],D(r'U_n-L_n=\frac{f(1)-f(0)}n=\frac{a-1}n')+'<p>Solve the strict inequality n&gt;(a−1)D. The boundary integer is excluded.</p>',dict(kind='threshold',f=str(a)+'**x',target='1/'+str(den),strict=True))
for v,p in enumerate([3,2],1):
 lower=s.Rational(1,p-1)-n**(1-p)/s.Integer(p-1)+n**(-p);upper=s.Rational(p,p-1)-n**(1-p)/s.Integer(p-1)
 add('limits','L',3,v,'Both finite-sum endpoint corrections',r'<p>Let \(S_n=\sum_{r=1}^nr^{-'+str(p)+r'}\), n≥2. Using the integral from 1 to n, give full rational functions of n for the strict lower and upper bounds, each as numerator; denominator.</p>',[ratio('lower','Whole lower bound',lower),ratio('upper','Whole upper bound',upper)],D(r'J_n=\frac{1-n^{1-p}}{p-1}',r'J_n+\frac1{n^p}<S_n<J_n+1')+'<p>The function is positive and strictly decreasing. Include f(n) on the lower side and f(1)=1 on the upper side.</p>',dict(kind='series_bounds',f='x**(-'+str(p)+')',start=1))
choices={
 'techniques':[('A root substitution branch','When x=a cosh u with a>0 and u≥0, what is sqrt(x²−a²)?',{'A':'a cosh u','B':'a sinh u','C':'−a sinh u','D':'a tanh u'},'B','The non-negative branch makes sqrt(sinh²u)=sinh u.'),('An improper endpoint','An integrand is unbounded at a lower endpoint. What is the correct next step?',{'A':'Declare divergence immediately.','B':'Replace the endpoint value by zero.','C':'Take the one-sided limit of the truncated integral.','D':'Delete the endpoint contribution.'},'C','Convergence is determined by the integral limit, not the endpoint value of the integrand.')],
 'reduction':[('Which base is needed?','A recurrence relates Iₙ to Iₙ₋₂. Which base is needed to calculate I₇?',{'A':'I₀ alone','B':'I₂ alone','C':'No base integral','D':'An odd base such as I₁'},'D','Successive reductions preserve parity: 7,5,3,1.'),('Input rounding','If J₃=C+(5/8)J₁, and J₁ has error at most ε, what bounds the induced error in J₃?',{'A':'5ε/8','B':'8ε/5','C':'ε+5/8','D':'Exactly zero'},'A','The exact constant has no input error; multiply ε by the absolute coefficient.')],
 'trigonometric':[('The hyperbolic identity','Which identity correctly simplifies a hyperbolic reduction?',{'A':'cosh²x=1−sinh²x','B':'sech²x=1+tanh²x','C':'cosh²x=1+sinh²x','D':'sinh²x+cosh²x=1'},'C','The exponential definitions give cosh²x−sinh²x=1.'),('A scaled integration variable','Under u=4x, what happens to dx?',{'A':'dx=4du','B':'dx=du/4','C':'dx=du','D':'dx=u du'},'B','Differentiate u=4x, giving du=4dx.')],
 'arcs':[('A perfect square','If the squared speed equals g(t)², which expression is the speed?',{'A':'g(t) for all t','B':'−g(t) for all t','C':'g(t)²','D':'|g(t)|'},'D','Length uses the non-negative principal square root.'),('A polar arc','Which integrand gives polar arc length?',{'A':'r²/2','B':'sqrt(r²+(dr/dθ)²)','C':'r alone','D':'dr/dθ alone'},'B','The Cartesian derivative squares simplify to r²+(dr/dθ)².')],
 'surfaces':[('Choose the axis','For rotation about the y-axis, what is the radius?',{'A':'|y|','B':'x²','C':'|x|','D':'The arc length'},'C','Radius is the perpendicular distance from the y-axis.'),('An axis crossing','If y changes sign during rotation about the x-axis, what should you do?',{'A':'Use |y| and split where needed.','B':'Use signed y so areas cancel.','C':'Square the surface integral.','D':'Drop the negative interval.'},'A','Both sides generate non-negative curved areas.')],
 'limits':[('Which endpoints?','For a strictly decreasing function, which heights give the lower sum?',{'A':'Left endpoints','B':'Right endpoints','C':'The maximum on each interval','D':'Either endpoint always'},'B','The right endpoint is the minimum on each interval.'),('Strictness at infinity','Aₙ<Bₙ for all n, and both have finite limits. What follows without further evidence?',{'A':'lim Aₙ<lim Bₙ always','B':'The limits cannot be equal.','C':'Both limits are zero.','D':'lim Aₙ≤lim Bₙ'},'D','Strict finite inequalities may close to equality at the limit.')]
}
codes=dict(techniques='T',reduction='R',trigonometric='H',arcs='A',surfaces='S',limits='L')
for key,items in choices.items():
 for v,(title,prompt,options,answer,why) in enumerate(items,1):add(key,codes[key],4,v,title,'<p>'+prompt+'</p>',[dict(key='reason',label='Reason',type='choice',expected=answer,options=options)],'<p>'+why+'</p>',dict(kind='logic',answer=answer))
trig={1,3,9,11,12,14,17,21,25,26,28,32,33,42,45}
topic_keys={'Integration techniques':'techniques','Arc length':'arcs','Polar arc length':'arcs','Surface areas of revolution':'surfaces','Rectangle estimates and limits':'limits'}
archive={r['id']:r for r in mapping['rows']};rows=[];fixtures=[]
assets=[{k:v for k,v in im.items() if k not in ['source_name','source_sha256','bank_number']} for im in media['images']]
def rewrite(text,q):
 for im in media['images']:
  if im['question_uid']==q['content_uid']:text=text.replace(im['source_name'],'/api/files/'+im['file_id'])
 return text
for original in [q for l in owner['lessons'] for q in l['questions']]:
 key=('trigonometric' if original['bank_number'] in trig else 'reduction') if original['topic']=='Reduction formulae' else topic_keys[original['topic']];row=archive[original['id']]
 parts=[dict(label=chr(97+i),marking_criteria=[dict(code=c['code'],marks=c['marks'],description_html=c['criterion_html']) for c in z['marking_points']]) for i,z in enumerate(original['parts'])]
 prompt=original['stem_html']+'<ol class="parts" type="a">'+''.join('<li>'+z['prompt_html']+'<span class="marks">['+str(z['marks'])+']</span></li>' for z in original['parts'])+'</ol>'
 q=dict(id=original['content_uid'],family_uid=original['content_uid'],lesson=key,title=original['title'],collection='exam',prompt_html=rewrite(prompt,original),answer_html=rewrite(original['answer_html'],original),solution_html=rewrite(original['solution_html'],original),hint_html=rewrite(original['hint_html'],original),marks=original['marks'],difficulty=original['difficulty'],fields=[],parts=parts,verification='OWNER-'+str(original['bank_number']),provenance=dict(original_id=row['original_id'],original_uid=row['original_uid'],archiveTaskId=row['archiveTaskId'],sourceSha256=sha,ownerProvenance=original['provenance']))
 questions.append(q);rows.append({**row,'lesson':key,'marks':q['marks'],'contentSha256':digest(q)});fixtures.append(dict(uid=q['id'],bank_number=original['bank_number'],original=original,contentSha256=digest(q)))
for model in quick_models:model['contentSha256']=digest(next(q for q in questions if q['id']==model['uid']))
for model in example_models:model['contentSha256']=digest(next(e for l in lessons for e in l['examples'] if e['verification']==model['id']))
pack=dict(schema_version=1,key='9231-fp2-integration',version='1.0.0',course=dict(slug='maths4u-9231-fp2',title='Further Pure Mathematics 2 (9231)',code='9231',direction='further'),chapter=dict(id='fp2_integration',slug='integration',title='Integration',position=3),source=dict(sha256=sha,supplied=109,held=[]),lessons=lessons,questions=questions,marking_status='DRAFT',assets=assets)
assert len(questions)==157 and len(quick_models)==48 and len(example_models)==24 and len(assets)==23
def write(path,value):Path(path).write_text(json.dumps(value,ensure_ascii=False,indent=2,default=str)+'\n',encoding='utf8')
write('content/original/9231-fp2/integration-v1.json',pack)
write('content/original/9231-fp2/integration-verification-v1.json',dict(owner=fixtures,quick=quick_models,examples=example_models,teachingDigests={l['id']:digest(l) for l in lessons}))
write('docs/ARENA-C5-FP2-INTEGRATION-SOURCE-AUDIT-20261107.json',dict(sourceSha256=sha,rows=rows,supplied=109,held=[],assets=media,book=dict(path='D:/new_books/cambridge_international_as_a_level_full_book_for_further_pure_mathematics.pdf',pdfPages=[509,535],printedPages=[497,523],sections=['22.1','22.2','22.3','22.4'],use='Mathematical sequence only; independently authored explanations and examples; no book texts, exercises or diagrams reproduced.'),sourceAlreadyRevisedTotals={k:owner[k] for k in ['question_count','part_count','total_marks','revision']},archiveImagesNotReused=11,editorialRepairs=[]))
print(json.dumps(dict(owner=109,quick=48,examples=24,lessons=6,assets=23)))
