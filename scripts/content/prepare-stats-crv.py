"""Normalise the owner's read-only chapter and author complete short checks."""
import argparse,hashlib,html,json
from pathlib import Path
import sympy as s
from stats_crv_teaching import lessons,models as example_models
from stats_crv_models import models as owner_models,transformed_support
ap=argparse.ArgumentParser();ap.add_argument('--source',required=True);ap.add_argument('--mapping',required=True);ap.add_argument('--assets',required=True);args=ap.parse_args()
source=Path(args.source);owner=json.loads(source.read_text(encoding='utf-8-sig'));mapping=json.loads(Path(args.mapping).read_text(encoding='utf8'));media=json.loads(Path(args.assets).read_text(encoding='utf8'))
sha=hashlib.sha256(source.read_bytes()).hexdigest();assert sha==mapping['sourceSha256']
x,y=s.symbols('x y',real=True);tex=s.latex
def digest(v):return hashlib.sha256(json.dumps(v,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()
questions=[];quick_models=[]
def field(key,label,expected,kind='number',**kwargs):return dict(key=key,label=label,expected=[str(v) for v in expected] if isinstance(expected,list) else str(expected),type=kind,**kwargs)
def quick(topic,code,family,v,title,prompt,fields,solution,model):
    uid=f'M4U-9231-CRV-{code}{family}{v}'
    def value(f):
        if f['type']=='choice':return html.escape(f['options'][f['expected']])
        if f['type']=='ratio':return r'\(\frac{'+tex(s.sympify(f['expected'][0]))+'}{'+tex(s.sympify(f['expected'][1]))+r'}\)'
        return r'\('+tex(s.sympify(f['expected']))+r'\)'
    q=dict(id=uid,family_uid=f'M4U-9231-CRV-{code}{family}',lesson=topic,title=title,collection='short' if v==1 else 'variant',prompt_html=prompt,answer_html='<p>'+'; '.join(html.escape(f['label'])+': '+value(f) for f in fields)+'</p>',solution_html=solution,hint_html='<p>Write the support first. Distinguish a density height from cumulative probability and include every requested branch or coefficient.</p>',marks=len(fields),difficulty=2 if family<3 else 3,fields=fields,parts=[dict(label='',marking_criteria=[dict(code='A1',marks=1,description_html='<p>Give the complete correct '+html.escape(f['label'].lower())+'.</p>') for f in fields])],verification=uid)
    questions.append(q);quick_models.append(dict(uid=uid,model=model))

for v,(L,c) in enumerate([(2,1),(1,2)],1):
    norm=s.Rational(1,s.Rational(L*L,2)+c*L)
    quick('density','D',1,v,'Normalisation, an interval and a point',r'<p>The density is \(k(x+'+str(c)+r')\) on \([0,'+str(L)+r']\), zero elsewhere. Give k, \(\mathrm P('+str(s.Rational(L,4))+r'\lt X\lt'+str(s.Rational(3*L,4))+r')\), and \(\mathrm P(X='+str(s.Rational(L,2))+r')\).</p>',[field('k','Normalising constant k',norm),field('prob','Interval probability','1/2'),field('point','Single-point probability',0)],r'<p>Integrate the density over its whole support to find k. The central half-interval has half the area for this affine density. A single point has zero probability.</p>',dict(kind='linear_density',L=L,c=c))
for v,(a,b,p) in enumerate([(1,3,s.Rational(1,4)),(2,4,s.Rational(2,5))],1):
    A=2*p/a**2;B=(1-p)/(b-a)
    quick('density','D',2,v,'Both coefficients of a piecewise density',r'<p>A density equals ax on \([0,'+str(a)+r')\), b on \(['+str(a)+','+str(b)+r']\), and zero elsewhere. Given \(\mathrm P(X\lt'+str(a)+')='+tex(p)+r'\), find a and b. No density-matching condition is imposed.</p>',[field('a','Coefficient a',A),field('b','Coefficient b',B)],'<p>Use the stated first-piece area to find a, then use total probability 1 to find b.</p>',dict(kind='two_coefficients',split=a,upper=b,p=str(p)))
for v,(a,b,c,d,lo,hi) in enumerate([(0,1,2,4,s.Rational(1,2),3),(1,3,5,6,2,s.Rational(11,2))],1):
    norm=s.Rational(1,(b-a)+(d-c))
    quick('density','D',3,v,'Keep a gap empty',r'<p>A density equals c on \(['+str(a)+','+str(b)+r']\) and \(['+str(c)+','+str(d)+r']\), and is zero elsewhere. Give c, the density in the gap, and \(\mathrm P('+tex(lo)+r'\lt X\lt'+tex(hi)+r')\).</p>',[field('c','Height c',norm),field('gap','Density in the gap',0),field('prob','Cross-gap probability','1/2')],'<p>Normalise using the combined lengths of the two support intervals. The event receives no contribution from the gap.</p>',dict(kind='gap',intervals=[[a,b],[c,d]],lo=str(lo),hi=str(hi)))

for v,(L,c) in enumerate([(2,1),(3,2)],1):
    den=L**2+c*L;pdf=(2*x+c)/den
    quick('cdf','C',1,v,'Recover a density and exterior CDF values',r'<p>The interior CDF is \(F(x)=(x^2+'+str(c)+r'x)/'+str(den)+r'\) on \([0,'+str(L)+r']\). Give its density on that interval, and the CDF values below 0 and above '+str(L)+'.</p>',[field('pdf','Interior density',pdf,'polynomial',variables=['x']),field('below','CDF below the support',0),field('above','CDF above the support',1)],'<p>Differentiate the interior branch. The complete CDF is zero below the support and one above it.</p>',dict(kind='cdf_derivative',L=L,c=c))
for v,(a,b,p) in enumerate([(1,3,s.Rational(1,3)),(2,4,s.Rational(1,2))],1):
    A=p/a**2;B=(1-p)/(b-a);C=p-B*a
    quick('cdf','C',2,v,'Three constants in a continuous CDF',r'<p>A CDF is 0 below 0, \(Ax^2\) for \(0\le x\lt'+str(a)+r'\), \(Bx+C\) for \('+str(a)+r'\le x\lt'+str(b)+r'\), and 1 above '+str(b)+r'. Given \(F('+str(a)+')='+tex(p)+r'\), find A, B and C.</p>',[field('A','Coefficient A',A),field('B','Coefficient B',B),field('C','Constant C',C)],'<p>Match the cumulative value at the breakpoint and the value 1 at the right endpoint. The second branch must retain the first area.</p>',dict(kind='cdf_coefficients',split=a,upper=b,p=str(p)))
for v,L in enumerate([2,4],1):
    quick('cdf','C',3,v,'Both quartiles and their difference',r'<p>The CDF is \(x^2/'+str(L**2)+r'\) on \([0,'+str(L)+r']\), with the usual exterior values. Give the lower quartile, upper quartile and interquartile range exactly.</p>',[field('q1','Lower quartile',s.Rational(L,2)),field('q3','Upper quartile',L*s.sqrt(3)/2),field('iqr','Interquartile range',L*(s.sqrt(3)-1)/2)],'<p>Solve the CDF equations at 1/4 and 3/4, retaining the non-negative roots in the support. Subtract the two values only afterwards.</p>',dict(kind='quadratic_quantiles',L=L))

for v,L in enumerate([1,3],1):
    quick('moments','M',1,v,'Two moments and a variance',r'<p>The density is \(2x/'+str(L**2)+r'\) on \([0,'+str(L)+r']\), zero elsewhere. Give E(X), E(X²) and Var(X).</p>',[field('mean','Mean of X',s.Rational(2*L,3)),field('second','Second moment of X',s.Rational(L**2,2)),field('variance','Variance of X',s.Rational(L**2,18))],r'<p>Integrate xf(x) and x²f(x) separately, then subtract the square of the first moment from the second.</p>',dict(kind='linear_moments',L=L))
for v,L in enumerate([4,9],1):
    quick('moments','M',2,v,'Mean and variance after a square root',r'<p>X is uniform on \([0,'+str(L)+r']\). Give E(√X) and Var(√X), exactly.</p>',[field('mean','Mean of square root',2*s.sqrt(L)/3),field('variance','Variance of square root',s.Rational(L,18))],r'<p>Integrate √x against the constant density. The second moment of √X is E(X), not E(X²).</p>',dict(kind='uniform_root',L=L))
for v,L in enumerate([2,4],1):
    quick('moments','M',3,v,'A nonlinear function of a centred variable',r'<p>X is uniform on \([0,'+str(L)+r']\), and \(Y=(X-'+str(s.Rational(L,2))+r')^2\). Give E(Y) and Var(Y).</p>',[field('mean','Mean of Y',s.Rational(L**2,12)),field('variance','Variance of Y',s.Rational(L**4,180))],r'<p>Integrate (x−L/2)² and (x−L/2)⁴ against the original density. The variance of Y uses both integrals.</p>',dict(kind='centred_square',L=L))

for v,(L,c) in enumerate([(2,3),(3,1)],1):
    quick('monotone','T',1,v,'The density and its complete support',r'<p>X has CDF \(x^2/'+str(L**2)+r'\) on \([0,'+str(L)+r']\). Let \(Y=X^2+'+str(c)+r'\). Give both endpoints of Y’s support and its constant interior density.</p>',[field('lower','Lower support endpoint',c),field('upper','Upper support endpoint',L**2+c),field('density','Interior density',s.Rational(1,L**2))],r'<p>The map is increasing. In G(y)=F(√(y−c)), the square cancels, producing a linear CDF and a constant density on the mapped interval.</p>',dict(kind='square_shift',L=L,c=c))
for v,L in enumerate([2,3],1):
    b=L+1;G=1-(b-y)**2/L**2;g=s.diff(G,y)
    quick('monotone','T',2,v,'Reverse the cumulative event',r'<p>X has CDF \(x^2/'+str(L**2)+r'\) on \([0,'+str(L)+r']\). Let \(Y='+str(b)+r'-X\). Give the interior CDF and PDF as polynomials in y, and both support endpoints.</p>',[field('cdf','Interior CDF',s.expand(G),'polynomial',variables=['y']),field('pdf','Interior PDF',s.expand(g),'polynomial',variables=['y']),field('lower','Lower endpoint',1),field('upper','Upper endpoint',b)],r'<p>The event is X≥b−y, so use 1−F(b−y). Differentiating gives a non-negative density on the reversed range.</p>',dict(kind='reflected',L=L,b=b))
for v,(a,b) in enumerate([(1,2),(2,4)],1):
    quick('monotone','T',3,v,'A reciprocal density with exact endpoints',r'<p>X is uniform on \(['+str(a)+','+str(b)+r']\), and Y=1/X. Give the transformed density as a numerator; denominator pair in y, and both support endpoints.</p>',[field('pdf','PDF numerator; denominator',['1',str(b-a)+'*y^2'],'ratio',variables=['y']),field('lower','Lower endpoint',s.Rational(1,b)),field('upper','Upper endpoint',s.Rational(1,a))],r'<p>For interior y, G(y)=(b−1/y)/(b−a). Differentiate, and reverse the original endpoints to obtain [1/b,1/a].</p>',dict(kind='reciprocal_uniform',a=a,b=b))

for v,(a,b,p,scale,offset) in enumerate([(1,3,s.Rational(1,2),2,1),(2,4,s.Rational(1,3),1,2)],1):
    inv=(y-offset)/scale;G1=p*inv**2/a**2;G2=p+(1-p)*(inv-a)/(b-a)
    quick('piecewise','B',1,v,'Carry two pieces through an affine map',r'<p>X has interior CDF \('+tex(p*x**2/a**2)+r'\) for \(0\le x\lt'+str(a)+r'\), then \('+tex(p+(1-p)*(x-a)/(b-a))+r'\) up to '+str(b)+r'. Let \(Y='+str(scale)+'X'+('+' if offset>=0 else '')+str(offset)+r'\). Give both interior CDF formulae in y, their breakpoint, and the lower and upper endpoints.</p>',[field('first','First CDF branch',s.expand(G1),'polynomial',variables=['y']),field('second','Second CDF branch',s.expand(G2),'polynomial',variables=['y']),field('break','Mapped breakpoint',scale*a+offset),field('lower','Lower endpoint',offset),field('upper','Upper endpoint',scale*b+offset)],'<p>Use the inverse in each original branch, and map every endpoint. Both branches must agree at the new breakpoint.</p>',dict(kind='affine_piecewise',split=a,upper=b,p=str(p),scale=scale,offset=offset))
for v,(L,c) in enumerate([(3,1),(5,2)],1):
    quick('piecewise','B',2,v,'A distance has changing inverse branches',r'<p>X is uniform on \([0,'+str(L)+r']\), and \(Y=|X-'+str(c)+r'|\). Give the first and second interior CDF formulae in y, their positive breakpoint and the upper support endpoint.</p>',[field('first','First CDF branch',s.Rational(2,L)*y,'polynomial',variables=['y']),field('second','Second CDF branch',(y+c)/L,'polynomial',variables=['y']),field('break','Breakpoint',c),field('upper','Upper endpoint',L-c)],'<p>Intersect [c−y,c+y] with [0,L]. Before the breakpoint both sides expand; afterwards the lower side has reached the support boundary.</p>',dict(kind='absolute',L=L,c=c))
for v,(a,b) in enumerate([(1,2),(2,3)],1):
    quick('piecewise','B',3,v,'A square can have two contributing preimages',r'<p>X is uniform on \([-'+str(a)+','+str(b)+r']\), and Y=X². The CDF is \(A\sqrt y\) before the positive breakpoint and \(B\sqrt y+C\) afterwards, with exterior values 0 and 1. Give A, B, C, the breakpoint and upper endpoint.</p>',[field('A','Coefficient A',s.Rational(2,a+b)),field('B','Coefficient B',s.Rational(1,a+b)),field('C','Constant C',s.Rational(a,a+b)),field('break','Breakpoint',a*a),field('upper','Upper endpoint',b*b)],r'<p>Use P(−√y≤X≤√y). Up to a² both boundaries lie inside the support; afterwards the negative boundary is clipped at −a.</p>',dict(kind='square_two_sides',a=a,b=b))

choices={
'density':[
 ('A high density','<p>A valid density takes the value 1.4 on part of its support. Which statement is correct?</p>',{'A':'The model is impossible because a density must be at most 1.','B':'The height is allowed if the density is non-negative and its total area is 1.','C':'The probability at that point is 1.4.','D':'Its CDF must also be 1.4 there.'},'B','<p>Density is probability per unit of x. Its area, not its height, is constrained to total 1.</p>'),
 ('A permitted jump','<p>Does a random variable with a density require that density to be continuous at every breakpoint?</p>',{'A':'Yes, all adjacent density heights must match.','B':'Yes, unless the support is finite.','C':'No; a density may jump while its CDF remains continuous.','D':'No; its CDF may then jump by the same height.'},'C','<p>A density jump changes a derivative, not the cumulative probability at one point.</p>')],
'cdf':[
 ('A point and a cumulative probability','<p>For a variable with a density, which is always true?</p>',{'A':'P(X=a)=f(a).','B':'P(X=a)=F(a).','C':'P(X=a)=0.','D':'F(a)=0 for every a.'},'C','<p>A single point has zero area. F(a) accumulates all values up to a.</p>'),
 ('Choose a quantile branch','<p>A continuous CDF has F(2)=0.4 and F(5)=0.8 and is strictly increasing between these points. Where is its upper quartile?</p>',{'A':'Below 2.','B':'Strictly between 2 and 5.','C':'Exactly 5.','D':'Above 5.'},'B','<p>The cumulative target 0.75 lies strictly between 0.4 and 0.8.</p>')],
'moments':[
 ('The second moment of a transformed variable',r'<p>To find Var(X²), which pair of quantities is needed?</p>',{'A':'E(X) and E(X²).','B':'E(X²) and E(X⁴).','C':'Only Var(X).','D':'Only E(X).'},'B','<p>The variable is Y=X², so E(Y²)=E(X⁴) and E(Y)=E(X²).</p>'),
 ('Use the original density',r'<p>Which is the correct integral for E(h(X)), when it exists?</p>',{'A':'Integrate h(x)f(x) over the support of X.','B':'Integrate f(h(x)) with no other factor.','C':'Calculate h(E(X)) for every h.','D':'Integrate h(x) without a density.'},'A','<p>Each value h(x) is weighted by the probability density of the original X.</p>')],
'monotone':[
 ('A decreasing map',r'<p>For positive X and Y=1/X, which interior event describes Y≤y?</p>',{'A':'X≤1/y.','B':'X≥1/y.','C':'X≤y.','D':'X≥y².'},'B','<p>The reciprocal is decreasing on positive inputs, so the inequality reverses.</p>'),
 ('A missing scale factor',r'<p>When deriving a density for Y=h(X), what should follow the CDF argument?</p>',{'A':'Differentiate the new CDF, including its chain-rule factor.','B':'Use f(h(x)) without any derivative.','C':'Keep the original support unchanged.','D':'Multiply the old CDF by y.'},'A','<p>The derivative of the complete transformed CDF supplies the correct density and scale.</p>')],
'piecewise':[
 ('A mapped breakpoint',r'<p>X changes density formula at x=3. If Y=2X+1, where does the transformed formula change?</p>',{'A':'y=3.','B':'y=6.','C':'y=7.','D':'y=2.'},'C','<p>Map the original breakpoint through the same function: 2·3+1=7.</p>'),
 ('Two signs cannot be discarded',r'<p>If X can be positive or negative and Y=X², how should the interior CDF begin?</p>',{'A':'P(X≤√y), regardless of the support.','B':'P(X≥√y), regardless of the support.','C':'P(X=√y).','D':'P(−√y≤X≤√y), intersected with the support.'},'D','<p>The full event includes both inverse branches; the support decides which parts contribute.</p>')]
}
for key,items in choices.items():
    for v,(title,prompt,options,correct,solution) in enumerate(items,1):
        quick(key,dict(density='D',cdf='C',moments='M',monotone='T',piecewise='B')[key],4,v,title,prompt,[field('reason','Reason',correct,'choice',options=options)],solution,dict(kind='logic',answer=correct,reason=solution))

topic_map={'Piecewise densities and quantiles':'density','CDFs and percentiles':'cdf','Moments and functions of X':'moments','Increasing transformations':'monotone','Decreasing transformations':'monotone','Piecewise transformations':'piecewise','Exponential-form models':'cdf'}
rows=[];fixtures=[];archive={row['id']:row for row in mapping['rows']}
for original in [q for l in owner['lessons'] for q in l['questions']]:
    number=original['bank_number'];key='density' if number==7 else topic_map[original['topic']]
    assets=[a for a in media['images'] if a['question_uid']==original['content_uid']]
    def normalise(text):
        for a in assets:text=text.replace(a['source_name'],'/api/files/'+a['file_id'])
        return text
    parts=[dict(label=chr(97+i),marking_criteria=[dict(code=c['code'],marks=c['marks'],description_html=normalise(c['criterion_html'])) for c in part['criteria']]) for i,part in enumerate(original['parts'])]
    assert sum(c['marks'] for part in parts for c in part['marking_criteria'])==original['marks']
    provenance=original['provenance'];row=archive[str(original['id'])]
    q=dict(id=original['content_uid'],family_uid=original['content_uid'],lesson=key,title=original['title'],collection='exam',prompt_html=normalise(original['question_html']),answer_html=normalise(original['answer_html']),solution_html=normalise(original['solution_html']),hint_html=normalise(original['hint_html']),marks=original['marks'],difficulty=original['difficulty'],fields=[],parts=parts,provenance=dict(original_id=provenance['original_id'],original_uid=provenance['original_uid'],archiveTaskId=row['archiveTaskId'],sourceSha256=sha,ownerProvenance=provenance),verification='OWNER-'+str(number))
    questions.append(q);rows.append({**row,'lesson':key,'bank_number':number,'marks':q['marks'],'contentSha256':digest(q)})
    model=owner_models[number].copy()
    if number in transformed_support:model['transform']['support']=transformed_support[number]
    fixtures.append(dict(uid=q['id'],bank_number=number,stem_html=original['stem_html'],parts=original['parts'],contentSha256=digest(q),model=model))
for m in quick_models:m['contentSha256']=digest(next(q for q in questions if q['id']==m['uid']))
for model in example_models:model['contentSha256']=digest(next(e for l in lessons for e in l['examples'] if e['verification']==model['id']))
package=dict(schema_version=1,key='9231-stats-crv',version='1.0.0',course=dict(slug='maths4u-9231-statistics',title='Further Probability & Statistics (9231)',code='9231',direction='further'),chapter=dict(id='stats_crv',slug='continuous-random-variables',title='Continuous random variables',position=0),source=dict(sha256=sha,supplied=38,held=[]),lessons=lessons,questions=questions,marking_status='DRAFT',assets=[{k:v for k,v in a.items() if k not in ['source_name','source_sha256']} for a in media['images']])
assert len(questions)==78 and len(quick_models)==40 and len(fixtures)==38
def write(path,value):Path(path).write_text(json.dumps(value,ensure_ascii=False,indent=2,default=str)+'\n',encoding='utf8')
write('content/original/9231-statistics/crv-v1.json',package)
write('content/original/9231-statistics/crv-verification-v1.json',dict(owner=fixtures,quick=quick_models,examples=example_models,teachingDigests={l['id']:digest(l) for l in lessons}))
write('docs/ARENA-C5-CRV-SOURCE-AUDIT-20261106.json',dict(sourceSha256=sha,rows=rows,images=media['images'],mediaSource=media['mediaSource'],book=dict(path='D:/new_books/cambridge_international_as_a_level_full_book_for_further_pure_mathematics.pdf',pdfPages=[167,198],printedPages=[155,186],sections=['8.1','8.2','8.3','8.4'],use='Mathematical sequence only; new explanations and examples, no textbook exercises or illustrations copied.'),supplied=38,held=[],editorialRepairs=[]))
print(json.dumps(dict(owner=38,quick=40,lessons=len(lessons),examples=len(example_models),images=len(media['images']))))
