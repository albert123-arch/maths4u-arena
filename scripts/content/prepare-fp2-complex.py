"""Normalise the owner's unmodified complex chapter and add complete-answer practice."""
import argparse,hashlib,html,json
from pathlib import Path
import sympy as s
from fp2_complex_teaching import lessons,models as example_models,T,D,fmt
ap=argparse.ArgumentParser();ap.add_argument('--source',required=True);ap.add_argument('--mapping',required=True);ap.add_argument('--assets',required=True);args=ap.parse_args()
source=Path(args.source);owner=json.loads(source.read_text(encoding='utf-8-sig'));mapping=json.loads(Path(args.mapping).read_text(encoding='utf8'));media=json.loads(Path(args.assets).read_text(encoding='utf8'));media=media.get('assets',media);sha=hashlib.sha256(source.read_bytes()).hexdigest();assert sha==mapping['sourceSha256']
questions=[];quick_models=[];c,t,z=s.symbols('c t z',real=True)
def digest(v):return hashlib.sha256(json.dumps(v,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()
def f(key,label,value,kind='number',variables=None):return dict(key=key,label=label,type=kind,expected=[str(z) for z in value] if isinstance(value,list) else str(value),**({'variables':variables} if variables else {}))
def ratio(key,label,value):
 num,den=s.fraction(s.cancel(value));return f(key,label,[num,den],'ratio',['t'])
def add(lesson,code,family,v,title,prompt,fields,solution,model):
 uid=f'M4U-9231-FCOM-{code}{family}{v}'
 def value(field):
  if field['type']=='choice':return html.escape(field['options'][field['expected']])
  if field['type']=='ratio':return r'\(\frac{'+T(field['expected'][0])+'}{'+T(field['expected'][1])+r'}\)'
  if field['type'] in ['set','pairs']:return html.escape(field['expected'])
  return r'\('+T(field['expected'])+r'\)'
 q=dict(id=uid,family_uid=f'M4U-9231-FCOM-{code}{family}',lesson=lesson,title=title,collection='short' if v==1 else 'variant',prompt_html=fmt(prompt),answer_html='<p>'+'; '.join(html.escape(field['label'])+': '+value(field) for field in fields)+'</p>',solution_html=fmt(solution),hint_html='<p>Choose the requested complete form. Keep every root, all coefficients and both real and imaginary components. Check the argument interval, denominator restrictions and any exceptional ratio before giving the final answer.</p>',marks=len(fields),difficulty=2 if family<3 else 3,fields=fields,parts=[dict(label='',marking_criteria=[dict(code='A1',marks=1,description_html='<p>Give the complete correct '+html.escape(field['label'].lower())+'.</p>') for field in fields])],verification=uid)
 questions.append(q);quick_models.append(dict(uid=uid,model=model))
for v,power in enumerate([5,7],1):
 val=s.expand((1+s.I)**power)
 add('powers','P',1,v,'The whole positive power',r'<p>Evaluate \((1+i)^{'+str(power)+r'}\), giving both components in a+bi.</p>',[f('real','Real component a',s.re(val)),f('imaginary','Imaginary component b',s.im(val))],D(r'1+i=\sqrt2e^{i\pi/4}')+'<p>Raise the modulus to the power and multiply the argument. Convert the final result to Cartesian form.</p>',dict(kind='power',base='1+I',power=power))
for v,power in enumerate([-2,-3],1):
 val=s.expand_complex((1-s.I)**power)
 add('powers','P',2,v,'Both components of a negative power',r'<p>Evaluate \((1-i)^{'+str(power)+r'}\), giving a and b exactly in a+bi.</p>',[f('real','Real component a',s.re(val)),f('imaginary','Imaginary component b',s.im(val))],D(r'1-i=\sqrt2e^{-i\pi/4}')+'<p>Invert the modulus when the exponent is negative. Both components must be given.</p>',dict(kind='power',base='1-I',power=power))
for v,(degree,radius,phase) in enumerate([(4,2,s.Rational(1,2)),(3,3,s.S.One)],1):
 angles=[phase/degree+s.Rational(2*k,degree) for k in range(degree)];angles=[s.simplify(a-2 if a>=1 else a) for a in angles];rhs=s.expand_complex(radius**degree*s.exp(s.I*s.pi*phase))
 add('powers','P',3,v,'Every root and the correct argument interval',r'<p>Find all roots of \(z^{'+str(degree)+'}='+T(rhs)+r'\). Give their common positive modulus, then the complete set of q-values in \(z=Re^{iq\pi}\), with −1≤q&lt;1.</p>',[f('radius','Common modulus R',radius),f('angles','Complete set of angle coefficients q','{'+','.join(map(str,angles))+'}','set')],D(r'\arg z_k=\frac{\phi+2k\pi}{m},\quad k=0,\ldots,m-1')+'<p>List all m directions before reducing to the half-open principal interval. Include −π when needed, and exclude π.</p>',dict(kind='roots',degree=degree,radius=radius,phase=str(phase)))
for v,power in enumerate([4,6],1):
 poly=s.chebyshevt(power,c)
 add('angles','A',1,v,'The complete multiple-angle polynomial',r'<p>Express \(\cos('+str(power)+r'\theta)\) as the full polynomial in c=cos θ.</p>',[f('polynomial','Whole polynomial in c',poly,'polynomial',['c'])],'<p>Take the real part of the complex power, then replace every even power of sin θ using sin²θ=1−c². Keep every coefficient.</p>',dict(kind='chebyshev',power=power))
for v,power in enumerate([2,3],1):
 val=s.expand((1+s.I*t)**power);val=s.im(val)/s.re(val)
 add('angles','A',2,v,'The whole tangent quotient',r'<p>For t=tan θ, find the complete rational function equal to \(\tan('+str(power)+r'\theta)\), where the original tangent and the quotient are defined. Enter numerator; denominator in t.</p>',[ratio('quotient','Full tangent quotient',val)],'<p>Expand (1+it) to the specified power. Divide its imaginary part by its real part and retain the non-zero-real-part restriction.</p>',dict(kind='tan_multiple',power=power))
for v,(sign,angles) in enumerate([(1,['1/9','5/9','7/9']),(-1,['2/9','4/9','8/9'])],1):
 poly=8*z**3-6*z-sign
 add('angles','A',3,v,'All polynomial roots in a one-to-one interval',r'<p>Solve \('+T(poly).replace('z','x')+r'=0\) in the form \(x=\cos(q\pi)\), 0≤q≤1. Give every q-value as a set and the exact product of all three x-roots.</p>',[f('angles','Complete set of angle coefficients q','{'+','.join(angles)+'}','set'),f('product','Product of all x-roots',s.Rational(sign,8))],D(r'8x^3-6x=2\cos3\theta\quad(x=\cos\theta)')+'<p>Select all three angles on [0,π]. Cosine is one-to-one there; the constant coefficient gives the product by Viète’s formula.</p>',dict(kind='cubic_roots',sign=sign))
for v,sign in enumerate([1,-1],1):
 coeffs=[s.Rational(10,32),sign*s.Rational(15,32),s.Rational(6,32),sign*s.Rational(1,32)]
 name='cos' if sign==1 else 'sin'
 add('harmonics','H',1,v,'Every harmonic coefficient',r'<p>Write \('+'\\'+name+r'^6\theta=A+B\cos2\theta+C\cos4\theta+D\cos6\theta\). Give all four exact coefficients in this order.</p>',[f(k,label,val) for k,label,val in zip(['a','b','c','d'],['Constant A','Second-harmonic B','Fourth-harmonic C','Sixth-harmonic D'],coeffs)],'<p>Expand the sixth power of z+z⁻¹ or z−z⁻¹ and pair reciprocal powers. Include i⁶ in the sine case.</p>',dict(kind='harmonics',function=name,power=6))
for v,k in enumerate([2,3],1):
 add('harmonics','H',2,v,'An entire scaled integral',r'<p>Evaluate \(\int_0^{\pi/'+str(4*k)+r'}\sin^2('+str(k)+r'x)\cos^2('+str(k)+r'x)\,dx\), exactly.</p>',[f('value','Complete exact integral',s.pi/(32*k))],D(r'\sin^2u\cos^2u=\frac{1-\cos4u}{8}')+'<p>Use u=kx, including dx=du/k and the upper limit π/4. Integrate both harmonic terms.</p>',dict(kind='integral',k=k))
for v,power in enumerate([2,4],1):
 degree=power//2;val=(1-t)**degree/(1+t)**degree
 add('harmonics','H',3,v,'A complete harmonic quotient',r'<p>Express \(\tan^{'+str(power)+r'}\theta\) as a complete rational function in t=cos2θ, where cos θ≠0. Enter numerator; denominator. Do not remove the original excluded t=−1.</p>',[ratio('quotient','Whole quotient in t',val)],D(r'\tan^2\theta=\frac{1-\cos2\theta}{1+\cos2\theta}')+'<p>Use this identity and, when required, square both numerator and denominator.</p>',dict(kind='tan_power',power=power))
for v,a in enumerate([1,2],1):
 points=[(aa*a,bb*a) for aa,bb in [(1,1),(-1,1),(-1,-1),(1,-1)]]
 add('unity','U',1,v,'Every complex root in Cartesian form',r'<p>Find all roots of \(z^4=-'+str(4*a**4)+r'\). Give the complete set of coordinate pairs (Re z, Im z), separated by semicolons.</p>',[f('points','Complete Cartesian root set',';'.join('('+str(aa)+','+str(bb)+')' for aa,bb in points),'pairs')],'<p>The four arguments are the odd multiples of π/4 in a full turn. Convert every root to Cartesian coordinates.</p>',dict(kind='cartesian_roots',scale=a))
for v,(degree,excluded,indices) in enumerate([(6,2,[1,2,4,5]),(8,4,[1,3,5,7])],1):
 poly=s.cancel((z**degree-1)/(z**excluded-1));poly=s.div(z**degree-1,z**excluded-1,z)[0]
 add('unity','U',2,v,'The complete surviving root indices',r'<p>For \('+T(poly)+r'=0\), write roots as \(z=e^{2k\pi i/'+str(degree)+r'}\), 0≤k&lt;'+str(degree)+'. Give the complete set of surviving integer indices k.</p>',[f('indices','All surviving indices k','{'+','.join(map(str,indices))+'}','set')],'<p>Start with the roots of unity of the larger degree, then exclude exactly the roots of the factor used to multiply the equation.</p>',dict(kind='root_subset',degree=degree,excluded=excluded))
for v,m in enumerate([2,3],1):
 add('unity','U',3,v,'The full parameter regime and multiplicity cases',r'<p>For real a, consider \(z^{'+str(2*m)+r'}-2az^{'+str(m)+r'}+1=0\). Give the complete a-interval for all roots to have modulus 1, the interval for all '+str(2*m)+' roots to be distinct on that circle, and the number of distinct roots at each endpoint a=−1 and a=1.</p>',[f('circle','Whole modulus-one a-interval','[-1,1]','set'),f('distinct','Whole distinct-root a-interval','(-1,1)','set'),f('negative','Distinct roots at a=-1',m),f('positive','Distinct roots at a=1',m)],D(r'u=z^m,\qquad u^2-2au+1=0')+'<p>The two u-values are conjugate unit numbers precisely for |a|≤1. They coincide at each endpoint, where each recovered z-root is double.</p>',dict(kind='parameter',degree=m))
for v,(power,imag) in enumerate([(5,1),(6,-1)],1):
 ratio0=1+imag*s.I;val=sum(ratio0**k for k in range(power));val=s.expand(val)
 add('sums','S',1,v,'Both components of a finite complex sum',r'<p>Find \(\sum_{k=0}^{'+str(power-1)+r'}('+T(ratio0)+r')^k\), giving a and b in a+bi.</p>',[f('real','Real sum a',s.re(val)),f('imaginary','Imaginary sum b',s.im(val))],'<p>Use the actual term count in (1−qⁿ)/(1−q). No convergence condition is required for this finite sum.</p>',dict(kind='finite',ratio=str(ratio0),terms=power))
for v,n in enumerate([4,5],1):
 val=s.expand(n*s.I*(1+s.I)**(n-1))
 add('sums','S',2,v,'Both weighted binomial sums',r'<p>Find \(C=\sum_{r=0}^{'+str(n)+r'}r\binom{'+str(n)+r'}r\cos(r\pi/2)\) and the corresponding sine sum S. Give both exactly.</p>',[f('real','Complete cosine sum C',s.re(val)),f('imaginary','Complete sine sum S',s.im(val))],D(r'\sum_{r=0}^nr\binom nr z^r=nz(1+z)^{n-1}')+'<p>Insert z=i and take both components. The zero-index term is zero.</p>',dict(kind='binomial',degree=n))
for v,den in enumerate([2,3],1):
 rho=s.Rational(1,den);real=s.simplify((rho/2-rho*rho)/(1-rho+rho*rho));imag=s.simplify(rho*s.sqrt(3)/2/(1-rho+rho*rho))
 add('sums','S',3,v,'Both convergent infinite sums',r'<p>Find \(C=\sum_{r=1}^{\infty}'+str(den)+r'^{-r}\cos(r\pi/3)\) and the corresponding sine sum S. Give both exactly.</p>',[f('real','Complete cosine sum C',real),f('imaginary','Complete sine sum S',imag)],D(r'C+iS=\frac q{1-q},\qquad q=\frac1d e^{i\pi/3}')+'<p>The ratio has modulus 1/d&lt;1. Multiply by the conjugate denominator to obtain the two components.</p>',dict(kind='infinite',denominator=den))
choices={
 'powers':[('The missing argument','Which statement about zero is correct?',{'A':'It has argument zero only.','B':'It has modulus zero and no argument.','C':'Its negative powers are zero.','D':'Its modulus is one.'},'B','Argument describes a direction; zero has none.'),('An argument interval','For −π≤arg z<π, how should an argument π be represented?',{'A':'Keep π.','B':'Use zero.','C':'Use −π.','D':'Discard the root.'},'C','Subtract a full turn, retaining the root and the half-open convention.')],
 'angles':[('After clearing a denominator','What must be checked after a trigonometric quotient is turned into a polynomial?',{'A':'Only the leading coefficient.','B':'Only the first positive root.','C':'That the sketch looks right.','D':'Original denominator restrictions and divided zero factors.'},'D','Multiplication can introduce excluded candidates; division can lose zero-factor cases.'),('A complete root list','Five distinct verified roots have been found for a polynomial of degree five. What follows?',{'A':'They account for every root.','B':'There must be five more roots.','C':'Only positive roots count.','D':'The polynomial is quadratic.'},'A','A non-zero degree-five polynomial has five roots counted with multiplicity.')],
 'harmonics':[('The sine denominator',r'Which denominator converts (z−z⁻¹)⁶ into sin⁶θ for \(z=e^{i\theta}\)?',{'A':'64','B':'−64','C':'6i','D':'32'},'B','The denominator is (2i)⁶=−64.'),('The frequency factor','Under u=3x, how does the differential change?',{'A':'dx=3du','B':'dx=du','C':'dx=du/3','D':'dx=u du'},'C','Differentiate u=3x to get du=3dx.')],
 'unity':[('An introduced subset','Solving (z³−1)P(z)=0 gives candidates for P(z)=0. Which must be checked separately?',{'A':'The roots of z³=1.','B':'Only roots with negative real part.','C':'Only roots off the unit circle.','D':'No roots need checking.'},'A','The multiplying factor may introduce roots that are not roots of P.'),('A translated polygon','For (z−c)ᵐ=A, what is the centre of the root polygon?',{'A':'Always zero.','B':'Always A.','C':'−c.','D':'c.'},'D','The equally spaced vectors are z−c, so the polygon is centred at c.')],
 'sums':[('The exceptional ratio','What is ∑ from r=0 to n−1 of qʳ when q=1?',{'A':'Zero.','B':'n.','C':'The quotient 0/0.','D':'Always divergent.'},'B','There are n terms, each equal to 1.'),('Finite versus infinite','Which condition makes a non-zero-ratio infinite geometric sum converge?',{'A':'q≠1 alone.','B':'q is a root of unity.','C':'|q|<1.','D':'q is not real.'},'C','The tail qⁿ tends to zero precisely when the modulus of q is less than 1.')]
}
codes=dict(powers='P',angles='A',harmonics='H',unity='U',sums='S')
for key,items in choices.items():
 for v,(title,prompt,options,answer,why) in enumerate(items,1):add(key,codes[key],4,v,title,'<p>'+prompt+'</p>',[dict(key='reason',label='Reason',type='choice',expected=answer,options=options)],'<p>'+why+'</p>',dict(kind='logic',answer=answer))
archive={r['id']:r for r in mapping['rows']};rows=[];fixtures=[]
basic_roots={2,4,9,38}
def lesson(q):
 if q['topic']=='Theorem and geometrical meaning' or q['bank_number'] in basic_roots:return 'powers'
 if q['topic'] in ['Complex roots and geometry','Roots of unity and algebra']:return 'unity'
 if q['topic']=='Multiple angles and polynomial roots':return 'angles'
 if q['topic']=='Powers of sine and cosine':return 'harmonics'
 return 'sums'
assets=[{k:v for k,v in im.items() if k not in ['source_name','source_sha256','bank_number']} for im in media['images']]
def rewrite(text,q):
 for im in media['images']:
  if im['question_uid']==q['content_uid']:text=text.replace(im['source_name'],'/api/files/'+im['file_id'])
 return text
for original in [q for l in owner['lessons'] for q in l['questions']]:
 key=lesson(original);row=archive[original['id']];parts=[dict(label=chr(97+i),marking_criteria=[dict(code=c['code'],marks=c['marks'],description_html=c['criterion_html']) for c in z['marking_points']]) for i,z in enumerate(original['parts'])]
 prompt=original['stem_html']+'<ol class="parts" type="a">'+''.join('<li>'+z['prompt_html']+'<span class="marks">['+str(z['marks'])+']</span></li>' for z in original['parts'])+'</ol>';assert '<img' not in prompt
 q=dict(id=original['content_uid'],family_uid=original['content_uid'],lesson=key,title=original['title'],collection='exam',prompt_html=fmt(prompt),answer_html=rewrite(original['answer_html'],original),solution_html=rewrite(original['solution_html'],original),hint_html=rewrite(original['hint_html'],original),marks=original['marks'],difficulty=original['difficulty'],fields=[],parts=parts,verification='OWNER-'+str(original['bank_number']),provenance=dict(original_id=row['original_id'],original_uid=row['original_uid'],archiveTaskId=row['archiveTaskId'],sourceSha256=sha,ownerProvenance=original['provenance']))
 questions.append(q);rows.append({**row,'lesson':key,'marks':q['marks'],'contentSha256':digest(q)});fixtures.append(dict(uid=q['id'],bank_number=original['bank_number'],original=original,contentSha256=digest(q)))
for model in quick_models:model['contentSha256']=digest(next(q for q in questions if q['id']==model['uid']))
for model in example_models:model['contentSha256']=digest(next(e for l in lessons for e in l['examples'] if e['verification']==model['id']))
pack=dict(schema_version=1,key='9231-fp2-complex',version='1.0.0',course=dict(slug='maths4u-9231-fp2',title='Further Pure Mathematics 2 (9231)',code='9231',direction='further'),chapter=dict(id='fp2_complex',slug='complex-numbers',title='Complex numbers',position=4),source=dict(sha256=sha,supplied=59,held=[]),lessons=lessons,questions=questions,marking_status='DRAFT',assets=assets)
assert len(questions)==99 and len(quick_models)==40 and len(example_models)==20 and len(assets)==9
def write(path,value):Path(path).write_text(json.dumps(value,ensure_ascii=False,indent=2,default=str)+'\n',encoding='utf8')
write('content/original/9231-fp2/complex-v1.json',pack)
write('content/original/9231-fp2/complex-verification-v1.json',dict(owner=fixtures,quick=quick_models,examples=example_models,teachingDigests={l['id']:digest(l) for l in lessons}))
write('docs/ARENA-C5-FP2-COMPLEX-SOURCE-AUDIT-20261107.json',dict(sourceSha256=sha,rows=rows,supplied=59,held=[],assets=media,book=dict(path='D:/new_books/cambridge_international_as_a_level_full_book_for_further_pure_mathematics.pdf',pdfPages=[536,555],printedPages=[524,543],sections=['23.1','23.2','23.3','23.4'],use='Mathematical sequence only; independently authored explanations and examples; no book wording, worked examples, exercises or diagrams reproduced.'),sourceAlreadyRevisedSummary=owner['editorial_summary'],crossTopic=owner['syllabus_review']['scope_counts'],editorialRepairs=[]))
print(json.dumps(dict(owner=59,quick=40,examples=20,lessons=5,solutionImages=9)))
