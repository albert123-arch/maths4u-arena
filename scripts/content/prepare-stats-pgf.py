"""Read the immutable owner file and produce a versioned, reversible teaching package."""
import argparse,hashlib,html,json,math
from pathlib import Path
import sympy as s
from stats_pgf_teaching import lessons,models as example_models
ap=argparse.ArgumentParser();ap.add_argument('--source',required=True);ap.add_argument('--mapping',required=True);args=ap.parse_args()
source=Path(args.source);owner=json.loads(source.read_text(encoding='utf-8-sig'));mapping=json.loads(Path(args.mapping).read_text(encoding='utf8'));sha=hashlib.sha256(source.read_bytes()).hexdigest();assert sha==mapping['sourceSha256']
t=s.Symbol('t');questions=[];quick_models=[]
def digest(z):return hashlib.sha256(json.dumps(z,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()
def T(z):return s.latex(s.sympify(z))
def f(key,label,value,kind='number'):return dict(key=key,label=label,type=kind,expected=[str(z) for z in value] if isinstance(value,list) else str(value),**({'variables':['t']} if kind in ['polynomial','ratio'] else {}))
def stats(g):
 m=s.simplify(s.diff(g,t).subs(t,1));ff=s.simplify(s.diff(g,t,2).subs(t,1));return m,ff,s.simplify(ff+m-m*m)
def coeff(g,k):return s.expand(s.series(g,t,0,k+1).removeO()).coeff(t,k)
def add(lesson,code,family,v,title,prompt,fields,solution,model):
 uid=f'M4U-9231-PGF-{code}{family}{v}'
 def value(a):
  if a['type']=='choice':return html.escape(a['options'][a['expected']])
  if a['type']=='ratio':return r'\(\frac{'+T(a['expected'][0])+'}{'+T(a['expected'][1])+r'}\)'
  return r'\('+T(a['expected'])+r'\)'
 q=dict(id=uid,family_uid=f'M4U-9231-PGF-{code}{family}',lesson=lesson,title=title,collection='short' if v==1 else 'variant',prompt_html=prompt,answer_html='<p>'+'; '.join(html.escape(a['label'])+': '+value(a) for a in fields)+'</p>',solution_html=solution,hint_html='<p>State the support and identify the experiment first. Distinguish derivatives at 0 from derivatives at 1, and transformations from independent sums. Complete every requested field.</p>',marks=len(fields),difficulty=2 if family<3 else 3,fields=fields,parts=[dict(label='',marking_criteria=[dict(code='A1',marks=1,description_html='<p>Give the complete correct '+html.escape(a['label'].lower())+'.</p>') for a in fields])],verification=uid)
 questions.append(q);quick_models.append(dict(uid=uid,model=model))
for v,(support,weights,missing) in enumerate([([0,1,3],[1,3,2],2),([0,2,4],[2,1,3],3)],1):
 den=sum(weights);g=sum(s.Rational(w,den)*t**r for r,w in zip(support,weights))
 add('construct','B',1,v,'The whole distribution, including a missing count',r'<p>X has supported values \('+','.join(map(str,support))+r'\) with probabilities \('+','.join(str(w)+'k' for w in weights)+r'\), in the same order. Find k, the full PGF as a polynomial in t, and P(X='+str(missing)+').</p>',[f('k','Normalising constant',s.Rational(1,den)),f('pgf','Complete PGF',g,'polynomial'),f('missing','Missing-count probability',0)],r'<p>Normalise all weights, then attach each probability to its supported power of t. A missing count has coefficient zero.</p>',dict(kind='weights',support=support,weights=weights,missing=missing))
for v,p in enumerate([s.Rational(1,3),s.Rational(3,5)],1):
 q=1-p
 add('construct','B',2,v,'Both geometric counting conventions',r'<p>Independent trials succeed with probability \('+T(p)+r'\). T includes the first success; F counts only preceding failures. Enter each full PGF as numerator; denominator in t, and give P(T&gt;3).</p>',[f('trials','Trials PGF numerator; denominator',[p*t,1-q*t],'ratio'),f('failures','Failures PGF numerator; denominator',[p,1-q*t],'ratio'),f('tail','Probability of more than three trials',q**3)],r'<p>Sum the geometric series. The attempt count adds a factor t; the failure count starts at zero. More than three trials requires three failures.</p>',dict(kind='geometric',p=str(p)))
for v,(n,p) in enumerate([(3,s.Rational(1,4)),(4,s.Rational(2,3))],1):
 g=s.expand((1-p+p*t)**n)
 add('construct','B',3,v,'A complete binomial PGF',r'<p>X counts successes in '+str(n)+r' independent trials with common probability \('+T(p)+r'\). Give its full PGF, P(X=0) and P(X='+str(n)+').</p>',[f('pgf','Complete binomial PGF',g,'polynomial'),f('zero','Zero-success probability',(1-p)**n),f('all','All-success probability',p**n)],r'<p>Multiply the Bernoulli PGFs: \(G_X(t)=(1-p+pt)^n\). The constant and highest-degree coefficients give the two extreme outcomes.</p>',dict(kind='binomial',n=n,p=str(p)))
for v,g in enumerate([(2+t+2*t**2)/5,(1+2*t+3*t**3)/6],1):
 m,ff,var=stats(g)
 add('moments','M',1,v,'All moments needed for a variance',r'<p>For \(G_X(t)='+T(g)+r'\), give G′(1), G″(1), E(X²) and Var(X).</p>',[f('mean','First derivative at one',m),f('factorial','Second derivative at one',ff),f('second','Ordinary second moment',ff+m),f('variance','Variance',var)],r'<p>The second derivative gives \(\mathrm E[X(X-1)]\). Add the first derivative to obtain E(X²), then subtract the square of the mean.</p>',dict(kind='moments',pgf=str(g)))
for v,probs in enumerate([['1/5','1/2','3/10'],['1/6','1/3','1/2']],1):
 g=sum(s.Rational(p)*t**j for j,p in enumerate(probs));m,ff,var=stats(g)
 add('moments','M',2,v,'Recover every unknown probability',r'<p>X takes only 0, 1 and 2, with mean \('+T(m)+r'\) and variance \('+T(var)+r'\). Find all three probabilities and the complete PGF.</p>',[f('p0','Probability of zero',probs[0]),f('p1','Probability of one',probs[1]),f('p2','Probability of two',probs[2]),f('pgf','Recovered PGF',g,'polynomial')],r'<p>Use normalisation, the first moment and \(\mathrm E(X^2)=\operatorname{Var}(X)+[\mathrm E(X)]^2\). Check non-negativity after solving.</p>',dict(kind='recover',mean=str(m),variance=str(var)))
for v,g in enumerate([t**2/(4-3*t)**2,t/(3-2*t)**3],1):
 m,ff,var=stats(g)
 add('moments','M',3,v,'Differentiate an infinite-support PGF',r'<p>A count has \(G_X(t)='+T(g)+r'\). Give E(X), E[X(X−1)] and Var(X), exactly.</p>',[f('mean','Mean',m),f('factorial','Second factorial moment',ff),f('variance','Variance',var)],r"<p>Differentiate the full function, including its external power of t. Evaluate at 1, then use \(G''(1)+G'(1)-[G'(1)]^2\) for the variance.</p>",dict(kind='moments',pgf=str(g)))
for v,(x,y) in enumerate([((1+t+2*t**2)/4,(2+t**2)/3),((2+3*t)/5,(t+3*t**2)/4)],1):
 z=s.expand(x*y);m,ff,var=stats(z)
 add('sums','A',1,v,'A full independent-sum distribution',r'<p>Independent X and Y have \(G_X(t)='+T(x)+r'\), \(G_Y(t)='+T(y)+r'\). For Z=X+Y, give the complete PGF, P(Z=3), mean and variance.</p>',[f('pgf','Total PGF',z,'polynomial'),f('prob','Probability of total three',coeff(z,3)),f('mean','Total mean',m),f('variance','Total variance',var)],r'<p>Multiply the PGFs and collect all cross terms. Read the requested coefficient; differentiate for the moments or add the independent component moments.</p>',dict(kind='sum',x=str(x),y=str(y),target=3))
for v,(marked,other,p) in enumerate([(3,5,s.Rational(1,4)),(4,3,s.Rational(2,5))],1):
 x=sum(s.Rational(math.comb(marked,r)*math.comb(other,2-r),math.comb(marked+other,2))*t**r for r in range(3));y=(1-p+p*t)**2;z=s.expand(x*y)
 add('sums','A',2,v,'A selection count plus a separate trial count',r'<p>Two counters are selected without replacement from '+str(marked)+' marked and '+str(other)+r' unmarked counters; X counts marked counters. Independently, Y counts successes in two independent trials with probability \('+T(p)+r'\). Give G(X), G(X+Y) as full polynomials and the total mean.</p>',[f('component','Selection PGF',x,'polynomial'),f('pgf','Combined PGF',z,'polynomial'),f('mean','Combined mean',stats(z)[0])],r'<p>The selection is hypergeometric, with probabilities \(\binom Mr\binom{N-M}{2-r}/\binom N2\). Multiply its PGF by the independent binomial PGF.</p>',dict(kind='hyper_sum',marked=marked,other=other,p=str(p)))
for v,(n,p,lam) in enumerate([(2,s.Rational(1,4),s.Rational(2)),(3,s.Rational(1,3),s.Rational(1,2))],1):
 x=(1-p+p*t)**n;z=x*s.exp(lam*(t-1));m,ff,var=stats(z);scaled=coeff(x*s.exp(lam*t),2)
 add('sums','A',3,v,'Binomial plus Poisson moments and a coefficient',r'<p>Independent counts are X∼Bin('+str(n)+','+T(p)+r') and Y∼Po('+T(lam)+r'). For Z=X+Y give the mean, variance and the exact rational number \(e^{'+T(lam)+r'}\mathrm P(Z=2)\).</p>',[f('mean','Combined mean',m),f('variance','Combined variance',var),f('scaled','Exponential-scaled probability',scaled)],r'<p>Multiply the binomial PGF by \(e^{\lambda(t-1)}\). After removing \(e^{-\lambda}\), the degree-2 coefficient has contributions from count pairs (0,2), (1,1) and (2,0).</p>',dict(kind='bin_poisson',n=n,p=str(p),lam=str(lam)))
for v,(probs,a,b) in enumerate([(['1/3','1/6','1/2'],2,1),(['1/4','1/2','1/4'],2,2)],1):
 x=sum(s.Rational(p)*t**j for j,p in enumerate(probs));y=s.expand(t**b*x.subs(t,t**a))
 add('transform','T',1,v,'The entire transformed distribution',r'<p>X has PGF \('+T(x)+r'\). For Y='+str(a)+'X+'+str(b)+r', give its full PGF, both support endpoints and variance.</p>',[f('pgf','Transformed PGF',y,'polynomial'),f('lower','Minimum supported value',b),f('upper','Maximum supported value',2*a+b),f('variance','Transformed variance',stats(y)[2])],r'<p>Use \(G_Y(t)=t^bG_X(t^a)\), map the supported values and multiply the variance by a².</p>',dict(kind='transform',pgf=str(x),a=a,b=b))
for v,p in enumerate([s.Rational(2,5),s.Rational(1,4)],1):
 x=1-p+p*t;a=x.subs(t,t**2);b=s.expand(x*x)
 add('transform','T',2,v,'Twice one count versus two copies',r'<p>X is a binary indicator with success probability \('+T(p)+r'\). Define A=2X, while B=X₁+X₂ uses independent copies. Give both full PGFs, their common mean and both variances.</p>',[f('scaled','PGF of twice one count',a,'polynomial'),f('copies','PGF of two independent counts',b,'polynomial'),f('mean','Common mean',2*p),f('va','Variance of twice one count',stats(a)[2]),f('vb','Variance of two independent counts',stats(b)[2])],r'<p>Use \(G_X(t^2)\) for A and \([G_X(t)]^2\) for B. A has no odd supported values; equal means do not make these distributions identical.</p>',dict(kind='double',p=str(p)))
for v,(w,p,c) in enumerate([(s.Rational(2,5),s.Rational(1,3),2),(s.Rational(1,4),s.Rational(3,5),3)],1):
 x=s.expand(w*(1-p+p*t)+(1-w)*t**c);m,ff,var=stats(x)
 add('transform','T',3,v,'Mutually exclusive modes',r'<p>Mode A is chosen with probability \('+T(w)+r'\); otherwise mode B is used. Mode A produces a binary count with success probability \('+T(p)+r'\); mode B always produces '+str(c)+r'. Give the overall full PGF, mean and variance.</p>',[f('pgf','Mixture PGF',x,'polynomial'),f('mean','Mixture mean',m),f('variance','Mixture variance',var)],r'<p>Condition on the mode and add the weighted PGFs. Differentiate this mixture; multiplying the conditional PGFs would model a different experiment.</p>',dict(kind='mixture',w=str(w),p=str(p),c=c))
for v,(x,n,target) in enumerate([((3+2*t**2)/5,3,4),((2*t+t**3)/3,2,4)],1):
 z=s.expand(x**n);m,ff,var=stats(z)
 add('copies','C',1,v,'Repeated counts with support gaps',r'<p>X has PGF \('+T(x)+r'\). Add '+str(n)+r' independent identical observations to obtain S. Give the full PGF, P(S='+str(target)+r'), mean and variance.</p>',[f('pgf','Repeated-sum PGF',z,'polynomial'),f('prob','Specified-total probability',coeff(z,target)),f('mean','Repeated-sum mean',m),f('variance','Repeated-sum variance',var)],r'<p>Raise G(t) to the number of independent copies. Collect the target degree with its multiplicity and preserve gaps in the support.</p>',dict(kind='copies',pgf=str(x),n=n,target=target))
for v,(p,n) in enumerate([(s.Rational(1,4),3),(s.Rational(2,3),2)],1):
 x=p*t/(1-(1-p)*t);y=s.factor(x**n);m,ff,var=stats(x)
 add('copies','C',2,v,'Recover a valid independent summand',r'<p>A sum of '+str(n)+r' independent identical non-negative integer-valued counts has PGF \('+T(y)+r'\). Recover the summand PGF as numerator; denominator in t, its mean, variance and P(X=3).</p>',[f('pgf','Summand PGF numerator; denominator',[p*t,1-(1-p)*t],'ratio'),f('mean','Summand mean',m),f('variance','Summand variance',var),f('prob','Summand probability of three',p*(1-p)**2)],r'<p>Take the admissible probability-series root, check G(1)=1, and recognise a positive-integer geometric count. Differentiate or use its coefficients.</p>',dict(kind='root',p=str(p),n=n))
for v,(n,upper,target) in enumerate([(3,2,2),(3,3,3)],1):
 x=sum(t**j for j in range(upper+1))/(upper+1);z=x**n;den=coeff(z,target);joint=coeff(x**(n-1),target)/(upper+1)
 add('copies','C',3,v,'A complete conditional-total calculation',r'<p>'+str(n)+r' independent counts are uniform on {0,…,'+str(upper)+r'}. Their sum is S. Give P(S='+str(target)+r'), P(X₁=0 and S='+str(target)+r'), and P(X₁=0 | S='+str(target)+').</p>',[f('total','Conditioning-total probability',den),f('joint','Joint-event probability',joint),f('conditional','Conditional probability',s.cancel(joint/den))],r'<p>Extract a coefficient from G(t)ⁿ for the total. The joint event fixes the first value at zero and uses G(t)ⁿ⁻¹ for the other observations; divide by the total-event probability.</p>',dict(kind='conditional',n=n,upper=upper,target=target))
choices={
 'construct':[
  ('A validity condition','<p>Which condition can rule out a proposed polynomial PGF even when G(1)=1?</p>',{'A':'A zero coefficient.','B':'A negative coefficient.','C':'A non-zero constant coefficient.','D':'A missing odd power.'},'B','<p>Every coefficient is a probability and must be non-negative.</p>'),
  ('Extracting one probability',r'<p>Which expression gives P(X=4) from a PGF?</p>',{'A':'G′(1)','B':'G⁽⁴⁾(1)/4!','C':'G⁽⁴⁾(0)/4!','D':'G(4)'},'C','<p>A derivative at zero extracts its matching coefficient, after division by the factorial.</p>')],
 'moments':[
  ('Meaning of the second derivative','<p>For a PGF with finite second moment, what does G″(1) represent?</p>',{'A':'E(X²)','B':'Var(X)','C':'[E(X)]²','D':'E[X(X−1)]'},'D','<p>Differentiate each term twice to obtain the factor r(r−1).</p>'),
  ('Reconstructing a distribution','<p>Algebra gives coefficients summing to 1, but one is negative. What follows?</p>',{'A':'It is still a PGF if its mean is positive.','B':'It cannot be a probability distribution as stated.','C':'Take the absolute values without renormalising.','D':'Ignore the negative coefficient.'},'B','<p>All probability coefficients must satisfy non-negativity as well as normalisation.</p>')],
 'sums':[
  ('When a product is justified','<p>When does G(X+Y)=G(X)G(Y) follow from the defining expectation?</p>',{'A':'Whenever X and Y have equal means.','B':'Whenever both PGFs exist, with no further condition.','C':'When X and Y are independent.','D':'Only when both counts are binomial.'},'C','<p>Independence factors E(tˣtʸ) into the product of the expectations.</p>'),
  ('A coefficient of a product','<p>How is the degree-3 coefficient of a product of two PGFs obtained?</p>',{'A':'Multiply their two degree-3 coefficients.','B':'Sum products of coefficients whose degrees add to 3.','C':'Add their degree-3 coefficients.','D':'Evaluate both functions at 3.'},'B','<p>Convolution includes every ordered pair of values with the required sum.</p>')],
 'transform':[
  ('A transformed observation','<p>What is the PGF of 3X, for non-negative integer-valued X?</p>',{'A':'3G(t)','B':'G(t)³','C':'G(t³)','D':'G(3t)'},'C','<p>E(t³ˣ)=E[(t³)ˣ], so the input is replaced by t³.</p>'),
  ('Conditional positive runs','<p>If p₀=P(X=0)&lt;1, which PGF describes X conditional on X&gt;0?</p>',{'A':'G(t)−p₀','B':'G(t)/(1−p₀)','C':'G(t)(1−p₀)','D':'[G(t)−p₀]/(1−p₀)'},'D','<p>Remove the zero mass, then divide by the probability retained.</p>')],
 'copies':[
  ('Variance of repeated copies','<p>For n independent identical copies of a variable with variance v, what is the variance of their sum?</p>',{'A':'n²v','B':'nv','C':'vⁿ','D':'v/n'},'B','<p>Independent variances add; n²v would describe n times the same observation.</p>'),
  ('A summand reconstructed from a total','<p>Which check is essential after taking a root of a total PGF?</p>',{'A':'Only that the algebraic power reproduces the total.','B':'Only that the root is real at t=0.','C':'Non-negative probability coefficients and value 1 at t=1.','D':'The root must be a polynomial.'},'C','<p>The candidate must itself be a valid PGF, with the required support.</p>')]
}
for key,items in choices.items():
 for v,(title,prompt,options,answer,solution) in enumerate(items,1):add(key,dict(construct='B',moments='M',sums='A',transform='T',copies='C')[key],4,v,title,prompt,[dict(key='reason',label='Reason',type='choice',expected=answer,options=options)],solution,dict(kind='logic',answer=answer))
groups={'construct':['Geometric models and PGFs','Named distributions: uniform and Poisson','Infinite PGFs and coefficient extraction'],'moments':['Recovering distributions and parameters'],'sums':['Finite PGFs and independent sums'],'transform':['Sparse supports and transformations','Dependence and model reasoning'],'copies':['Independent copies and repeated sums']}
archive={r['id']:r for r in mapping['rows']};rows=[];fixtures=[]
for original in [q for l in owner['lessons'] for q in l['questions']]:
 key=next(k for k,v in groups.items() if original['topic'] in v);row=archive[str(original['id'])];pv=original['provenance']
 parts=[dict(label=chr(97+i),marking_criteria=[dict(code=c['code'],marks=c['marks'],description_html=c['criterion_html']) for c in part['criteria']]) for i,part in enumerate(original['parts'])]
 prompt=original['stem_html']+'<ol class="parts" type="a">'+''.join('<li>'+part['prompt_html']+'<span class="marks">['+str(part['marks'])+']</span></li>' for part in original['parts'])+'</ol>'
 q=dict(id=original['content_uid'],family_uid=original['content_uid'],lesson=key,title=original['title'],collection='exam',prompt_html=prompt,answer_html=original['answer_html'],solution_html=original['solution_html'],hint_html=original['hint_html'],marks=original['marks'],difficulty=original['difficulty'],fields=[],parts=parts,provenance=dict(original_id=pv['source_id'],original_uid=pv['source_uid'],archiveTaskId=row['archiveTaskId'],sourceSha256=sha,ownerProvenance=pv),verification='OWNER-'+str(original['bank_number']))
 questions.append(q);rows.append({**row,'lesson':key,'bank_number':original['bank_number'],'marks':q['marks'],'contentSha256':digest(q)});fixtures.append(dict(uid=q['id'],bank_number=original['bank_number'],original=original,contentSha256=digest(q)))
for m in quick_models:m['contentSha256']=digest(next(q for q in questions if q['id']==m['uid']))
for m in example_models:m['contentSha256']=digest(next(e for l in lessons for e in l['examples'] if e['verification']==m['id']))
package=dict(schema_version=1,key='9231-stats-pgf',version='1.0.0',course=dict(slug='maths4u-9231-statistics',title='Further Probability & Statistics (9231)',code='9231',direction='further'),chapter=dict(id='stats_pgf',slug='probability-generating-functions',title='Probability generating functions',position=4),source=dict(sha256=sha,supplied=50,held=[]),lessons=lessons,questions=questions,marking_status='DRAFT')
assert len(questions)==90 and len(quick_models)==40 and len(fixtures)==50 and len(example_models)==20
def write(path,z):Path(path).write_text(json.dumps(z,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
write('content/original/9231-statistics/pgf-v1.json',package)
write('content/original/9231-statistics/pgf-verification-v1.json',dict(owner=fixtures,quick=quick_models,examples=example_models,teachingDigests={l['id']:digest(l) for l in lessons}))
write('docs/ARENA-C5-PGF-SOURCE-AUDIT-20261106.json',dict(sourceSha256=sha,rows=rows,supplied=50,held=[],images=[],book=dict(path='D:/new_books/cambridge_international_as_a_level_full_book_for_further_pure_mathematics.pdf',pdfPages=[291,316],printedPages=[279,304],sections=['12.1','12.2','12.3','12.4'],use='Mathematical sequence only; independently authored explanations and examples. No textbook exercises, wording or figures reproduced.'),editorialRepairs=[],layoutNormalisation='ol.parts with letters and right-hand marks; unchanged stems and individual prompts.'))
print(json.dumps(dict(owner=50,quick=40,lessons=len(lessons),examples=len(example_models))))
