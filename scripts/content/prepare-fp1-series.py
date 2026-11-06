"""Prepare one new chapter; the owner's supplied file is read-only."""
import argparse,hashlib,json,html
from pathlib import Path
import sympy as s
from fp1_series_teaching import lessons

ap=argparse.ArgumentParser();ap.add_argument('--source',required=True);ap.add_argument('--mapping',required=True);a=ap.parse_args()
source=Path(a.source);owner=json.loads(source.read_text(encoding='utf-8-sig'));mapping=json.loads(Path(a.mapping).read_text(encoding='utf-8'))
sha=hashlib.sha256(source.read_bytes()).hexdigest();assert sha==mapping['sourceSha256']
questions=[];checks=[];n,r=s.symbols('n r',integer=True,positive=True)
def tex(x):return s.latex(x)
def field(key,label,expected,kind='number',**kw):
    if kind=='ratio':
        num,den=s.fraction(s.cancel(expected));expected=[str(num),str(den)];label='Numerator; denominator of partial sum'
    else:expected=str(expected)
    return dict(key=key,label=label,type=kind,expected=expected,**kw)
def quick(topic,family,v,title,prompt,fields,solution,ref):
    code={'power-sums':'P','finite-sums':'F','differences':'D','convergence':'C'}[topic];uid=f'M4U-9231-SS-{code}{family}{v}'
    values=[]
    for f in fields:
        value=html.escape(f['expected']) if f['type']=='choice' else r'\('+tex(s.sympify(f['expected'][0])/s.sympify(f['expected'][1]) if f['type']=='ratio' else s.sympify(f['expected']))+r'\)'
        values.append(html.escape(f['label'])+': '+value)
    q=dict(id=uid,family_uid=f'M4U-9231-SS-{code}{family}',lesson=topic,title=title,collection='short' if v==1 else 'variant',prompt_html=prompt,answer_html='<p>'+'; '.join(values)+'</p>',solution_html=solution,hint_html='<p>Write the finite sum with its exact endpoints before simplifying. Check the first allowed value.</p>',marks=len(fields),difficulty=2 if family<3 else 3,fields=fields,parts=[dict(label='',marking_criteria=[dict(code='A'+str(i+1),marks=1,description_html='<p>Give the complete correct '+html.escape(f['label'].lower())+'.</p>') for i,f in enumerate(fields)])],verification=uid)
    questions.append(q);checks.append(dict(uid=uid,reference=ref,answers={f['key']:f['expected'] for f in fields}))

for v in [1,2]:
    p=v;u=r**p;total=s.summation(u,(r,1,n))
    quick('power-sums',1,v,'Give the whole power sum',rf'<p>Find a formula in \(n\) for \(\sum_{{r=1}}^n {tex(u)}\), valid for every positive integer \(n\).</p>',[field('total','Complete formula for the sum',total,'polynomial',variables=['n'])],rf'\[S_n={tex(total)}.\]<p>The formula gives the first term at \(n=1\), and \(S_n-S_{{n-1}}\) is the original summand.</p>',dict(kind='sum',term=str(u),lower='1',upper='n'))
    p=v+2;u=(r+1)**p-r**p
    quick('power-sums',2,v,'Expand the entire difference',rf'<p>Expand and simplify \((r+1)^{{{p}}}-r^{{{p}}}\). Give the whole polynomial in \(r\).</p>',[field('difference','Complete polynomial difference',s.expand(u),'polynomial',variables=['r'])],rf'\[(r+1)^{{{p}}}-r^{{{p}}}={tex(s.expand(u))}.\]<p>This difference can be summed to derive the next power-sum formula.</p>',dict(kind='expression',expected=str(u)))
    c=3 if v==1 else 5;u=r*r+c;total=s.summation(u,(r,1,n))
    quick('power-sums',3,v,'Count every constant term',rf'<p>Find \(\sum_{{r=1}}^n(r^2+{c})\) as a polynomial in \(n\).</p>',[field('total','Complete sum',total,'polynomial',variables=['n'])],rf'\[S_n=\frac{{n(n+1)(2n+1)}}6+{c}n={tex(s.expand(total))}.\]<p>The constant occurs \(n\) times.</p>',dict(kind='sum',term=str(u),lower='1',upper='n'))
    opts={'A':'Check only the first value.','B':'Check F(0)=0 and F(n)-F(n-1)=u_n for every n≥1.','C':'Check only the leading power of n.'} if v==1 else {'A':'A constant contributes once regardless of the number of terms.','B':'The index r remains in the final sum from 1 to n.','C':'Summation is linear, with the same limits in every separated sum.'}
    quick('power-sums',4,v,'Choose a valid verification','<p>Which statement is sufficient or valid?</p>',[field('choice','Correct statement','B' if v==1 else 'C','choice',options=opts)],'<p>A base total and the exact next-term difference determine every finite total. Linearity preserves the limits.</p>',dict(kind='principle',correct='B' if v==1 else 'C'))
    lo=n+1 if v==1 else 2*n;hi=3*n if v==1 else 4*n;u=2*r+1;total=s.summation(u,(r,lo,hi))
    quick('finite-sums',1,v,'Keep both moving endpoints',rf'<p>Find \(\sum_{{r={tex(lo)}}}^{{{tex(hi)}}}(2r+1)\) as a polynomial in \(n\).</p>',[field('total','Complete moving-block sum',total,'polynomial',variables=['n'])],rf'<p>Use \(F(m)=m(m+2)\) and subtract \(F({tex(lo-1)})\) from \(F({tex(hi)})\).</p>\[T_n={tex(s.expand(total))}.\]',dict(kind='sum',term=str(u),lower=str(lo),upper=str(hi)))
    Sn=n*(n+1)*(n+v+1);term=s.expand(Sn-Sn.subs(n,n-1))
    quick('finite-sums',2,v,'Recover every term from its total',rf'<p>The partial sums are \(S_n={tex(Sn)}\). Find \(u_r\), valid also at \(r=1\).</p>',[field('term','Complete term formula',term.subs(n,r),'polynomial',variables=['r'])],rf'<p>Subtract consecutive totals. The formula at \(r=1\) gives \(S_1\), since \(S_0=0\).</p>\[u_r={tex(term.subs(n,r))}.\]',dict(kind='recover',total=str(Sn)))
    c=v;paired=(2*r-1+c)**2-(2*r+c)**2;total=s.summation(paired,(r,1,n));odd=s.expand(total+(2*n+1+c)**2)
    quick('finite-sums',3,v,'Give both parity totals',rf'<p>Let \(A_m=\sum_{{r=1}}^m(-1)^{{r-1}}(r+{c})^2\). Give both \(A_{{2n}}\) and \(A_{{2n+1}}\).</p>',[field('even','Even partial sum',total,'polynomial',variables=['n']),field('odd','Odd partial sum',odd,'polynomial',variables=['n'])],rf'<p>Pair consecutive terms, then add the next positive term for the odd total.</p>\[A_{{2n}}={tex(s.expand(total))},\qquad A_{{2n+1}}={tex(odd)}.\]',dict(kind='alternating',shift=c))
    opts={'A':'F(b)-F(a-1)','B':'F(b)-F(a)','C':'F(b-1)-F(a-1)'} if v==1 else {'A':'Subtract the designated squares once from an all-positive total.','B':'Subtract twice the designated squares from an all-positive total.','C':'Reverse the sign of every square.'}
    quick('finite-sums',4,v,'Choose the correct finite-sum step','<p>If \(F(m)\) totals indices 1 to \(m\), which expression totals \(a\) to \(b\)?</p>' if v==1 else '<p>Some designated squares must be negative instead of positive. How do you adjust the all-positive total?</p>',[field('choice','Correct step','A' if v==1 else 'B','choice',options=opts)],'<p>The prefix before the first allowed index is excluded. Reversing a positive contribution to negative changes the total by twice that contribution.</p>',dict(kind='principle',correct='A' if v==1 else 'B'))
    c=v+1;u=s.Rational(c,1)/((r+1)*(r+2));total=s.Rational(c,2)-c/(n+2)
    quick('differences',1,v,'Give the complete telescoping sum',rf'<p>Find \(\sum_{{r=1}}^n\frac{{{c}}}{{(r+1)(r+2)}}\). Give the whole expression in \(n\).</p>',[field('total','Complete partial sum',total,'ratio',variables=['n'])],rf'<p>Each term is \({c}(1/(r+1)-1/(r+2))\).</p>\[S_n={tex(total)}.\]',dict(kind='sum',term=str(u),lower='1',upper='n'))
    c=v;u=1/((r+c)*(r+c+2));total=s.Rational(1,2)*(s.Rational(1,c+1)+s.Rational(1,c+2)-1/(n+c+1)-1/(n+c+2))
    quick('differences',2,v,'Retain two boundary fractions',rf'<p>Find \(\sum_{{r=1}}^n\frac1{{(r+{c})(r+{c+2})}}\), including the case \(n=1\).</p>',[field('total','Complete partial sum',total,'ratio',variables=['n'])],rf'<p>The decomposition has a gap of two, so keep two starting and two ending fractions.</p>\[S_n={tex(total)}.\]<p>The boundary expression also works when the written groups overlap.</p>',dict(kind='sum',term=str(u),lower='1',upper='n'))
    c=2 if v==1 else 3;F=s.Rational(1,1)/(c**r*(r+1));u=s.factor(F-F.subs(r,r+1))
    # This check uses a concrete n to avoid unsupported variable exponents in the answer parser.
    N=4 if v==1 else 3;total=s.simplify(F.subs(r,1)-F.subs(r,N+1))
    quick('differences',3,v,'Preserve the geometric weight',rf'<p>Let \(F(r)=\frac1{{{c}^r(r+1)}}\) and \(u_r=F(r)-F(r+1)\). Find the exact value of \(\sum_{{r=1}}^{{{N}}}u_r\).</p>',[field('total','Exact finite sum',total)],rf'\[S_{{{N}}}=F(1)-F({N+1})={tex(total)}.\]<p>Keep the exponential factor when shifting the index.</p>',dict(kind='sum',term=str(u),lower='1',upper=str(N)))
    opts={'A':'F(1)-F(n+1)','B':'F(1)-F(n)','C':'F(0)-F(n+1)'} if v==1 else {'A':'The boundary F(n+1) can always be discarded.','B':'A convergent boundary must have limit zero.','C':'Subtract the actual limit of F(n+1), even when it is non-zero.'}
    quick('differences',4,v,'Check the surviving boundaries','<p>For \(u_r=F(r)-F(r+1)\), what is \(\sum_{r=1}^n u_r\)?</p>' if v==1 else '<p>How do you pass from a finite telescoping sum to its infinite sum?</p>',[field('choice','Correct boundary rule','A' if v==1 else 'C','choice',options=opts)],'<p>Write every surviving boundary with its actual index and sign. Take the limit only after cancellation.</p>',dict(kind='principle',correct='A' if v==1 else 'C'))
    c=2 if v==1 else 3;u=c/((r+1)*(r+2));total=s.Rational(c,2)
    quick('convergence',1,v,'Find the infinite sum',rf'<p>Find \(\sum_{{r=1}}^\infty\frac{{{c}}}{{(r+1)(r+2)}}\).</p>',[field('sum','Exact infinite sum',total)],rf'\[S_n=\frac{{{c}}}2-\frac{{{c}}}{{n+2}}\longrightarrow {tex(total)}.\]',dict(kind='infinite',term=str(u)))
    M=100 if v==1 else 250;least=M-1
    quick('convergence',2,v,'Respect a strict accuracy bound',rf'<p>A positive remainder is \(R_n=1/(n+2)\). Find the least positive integer \(n\) for which \(R_n&lt;1/{M}\).</p>',[field('n','Least positive integer n',least)],rf'<p>The inequality requires \(n+2&gt;{M}\), hence the least integer is \({least}\). At \({least-1}\), equality holds and the strict condition fails.</p>',dict(kind='least',remainder='1/(n+2)',threshold=str(s.Rational(1,M))))
    u=1/((r+1)*(r+2));lo=n+1 if v==1 else 2*n+1;hi=3*n if v==1 else 5*n
    block=1/(lo+1)-1/(hi+2);limit=s.limit(n*block,n,s.oo)
    quick('convergence',3,v,'Scale a moving tail correctly',rf'<p>Evaluate \(\lim_{{n\to\infty}} n\sum_{{r={tex(lo)}}}^{{{tex(hi)}}}\frac1{{(r+1)(r+2)}}\).</p>',[field('limit','Exact limit',limit)],rf'\[T_n={tex(block)},\qquad nT_n\longrightarrow {tex(limit)}.\]<p>Both moving boundaries contribute.</p>',dict(kind='window-limit',term=str(u),lower=str(lo),upper=str(hi)))
    opts={'A':'Only -1<q<1.','B':'-1<q≤1, with sum q inside and 0 at q=1.','C':'Every real q.'} if v==1 else {'A':'Terms tending to zero alone prove that a series converges.','B':'Every telescoping series converges.','C':'Two distinct recurring partial sums prove divergence.'}
    quick('convergence',4,v,'Check the exceptional endpoint' if v==1 else 'Distinguish a limit from a pattern','<p>For \(u_r=q^r-q^{r+1}\), which statement gives all convergence cases?</p>' if v==1 else '<p>Which argument about convergence is valid?</p>',[field('choice','Correct conclusion','B' if v==1 else 'C','choice',options=opts)],'<p>Use the partial sums. At q=1 the original terms vanish; recurring different partial sums cannot approach one limit.</p>',dict(kind='principle',correct='B' if v==1 else 'C'))

topic_groups={
'power-sums':['Deriving standard formulae','Induction and summation','Higher-power sums from differences'],
'finite-sums':['Roots and summation','Weighted and alternating sums','Standard polynomial sums','Recovering terms from partial sums'],
'differences':['Polynomial sums and telescoping','Method of differences','Parameters and moving limits','Reciprocal-power series','Three-factor partial fractions','Radical and logarithmic series'],
'convergence':['Exponentially weighted series','Moving limits and bounds','Convergence and exceptional endpoints','Remainders and accuracy','Trigonometric sums and divergence']}
topic_map={t:k for k,ts in topic_groups.items() for t in ts};by_id={r['id']:r for r in mapping['rows']};rows=[];fixtures=[]
def digest(q):return hashlib.sha256('\0'.join([q['title'],q['prompt_html'],q['answer_html'],q['solution_html'],q['hint_html'],str(q['marks'])]).encode()).hexdigest()
for q in [q for l in owner['lessons'] for q in l['questions']]:
    m=by_id[q['id']];key=topic_map[q['topic']];assert sum(p['marks'] for p in q['parts'])==q['marks']
    assert not any('<img' in q[k] for k in ['question_html','answer_html','solution_html','hint_html'])
    item=dict(id=q['content_uid'],family_uid=q['content_uid'],lesson=key,title=q['title'],collection='exam',prompt_html=q['question_html'],answer_html=q['answer_html'],solution_html=q['solution_html'],hint_html=q['hint_html'],marks=q['marks'],difficulty=q['difficulty'],fields=[],parts=[dict(label=p['label'],marking_criteria=[dict(code=m['code'],marks=m['marks'],description_html=m['criterion_html']) for m in p['marking_points']]) for p in q['parts']],provenance=dict(original_id=q['provenance']['original_id'],original_uid=q['provenance']['original_uid'],archiveTaskId=m['archiveTaskId'],sourceSha256=sha,ownerProvenance=q['provenance']),verification='OWNER-'+q['id'])
    questions.append(item);rows.append({**m,'lesson':key,'marks':q['marks'],'contentSha256':digest(item)})
    fixtures.append(dict(id=q['id'],uid=q['content_uid'],parts=q['parts'],contentSha256=digest(item)))
for c in checks:c['contentSha256']=digest(next(q for q in questions if q['id']==c['uid']))
package=dict(schema_version=1,key='9231-fp1-summation',version='1.0.0',course=dict(slug='maths4u-9231-fp1',title='Further Pure Mathematics 1 (9231)',code='9231',direction='further'),chapter=dict(id='fp1_summation',slug='summation-of-series',title='Summation of series',position=2),source=dict(sha256=sha,supplied=68,held=[]),lessons=lessons,questions=questions,marking_status='DRAFT')
out=Path('content/original/9231-fp1')
def write(path,value):path.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
write(out/'summation-v1.json',package);write(out/'summation-quick-verification-v1.json',checks);write(out/'summation-owner-verification-v1.json',fixtures)
write(Path('docs/ARENA-C2-SERIES-SOURCE-AUDIT-20261106.json'),dict(sourceSha256=sha,rows=rows,editorialRepairs=[],textbook=dict(path='D:/new_books/furhter_cambridge.pdf',chapter=3,pdfPages=[57,69],printedPages=[45,57],structure=[dict(section='3.1',lessons=['power-sums','finite-sums']),dict(section='3.2',lessons=['differences','convergence'])],use='Sequence and mathematical objectives only; independently written explanations and new worked examples.'),teachingDigests={l['id']:hashlib.sha256(json.dumps(l,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest() for l in lessons}))
print(json.dumps(dict(ownerTasks=68,quickChecks=len(checks),lessons=len(lessons),examples=sum(len(l['examples']) for l in lessons))))
