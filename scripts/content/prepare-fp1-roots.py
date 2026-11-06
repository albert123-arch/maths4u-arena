"""Normalise the owner's source without writing to its directory."""
import argparse, hashlib, html, json
from pathlib import Path
import sympy as s
from fp1_roots_teaching import lessons
p=argparse.ArgumentParser();p.add_argument('--source',required=True);p.add_argument('--audit',required=True);args=p.parse_args()
source=Path(args.source);owner=json.loads(source.read_text(encoding='utf-8-sig'));audit=json.loads(Path(args.audit).read_text(encoding='utf-8'))
assert hashlib.sha256(source.read_bytes()).hexdigest()==audit['sourceSha256']
x,y=s.symbols('x y')
questions=[];refs=[]
def field(key,label,value,kind='number',variables=None,options=None):
    d=dict(key=key,label=label,type=kind,expected=str(value))
    if variables:d['variables']=variables
    if options:d['options']=options
    return d
def eq(poly):return field('equation','Complete equation in y',str(s.expand(poly)).replace('**','^'),'equation',['y'])
def power(poly,n):return s.RootSum(s.Poly(poly,x),s.Lambda(x,x**n)).doit()
def tex(poly):return s.latex(s.expand(poly))
def quick(key,family,v,title,prompt,fields,explain,reference):
    uid=f'M4U-9231-RPE-{key[:1].upper()}{family}{v}';fam=f'M4U-9231-RPE-S-{key[:1].upper()}{family:02d}'
    # Expected numbers are independently rechecked against numerical polynomial roots.
    answer='<p>'+('; '.join(f['label']+': '+(r'\('+s.latex(s.sympify(f['expected'].replace('^','**')))+r'\)' if f['type']!='choice' else f['expected']) for f in fields))+'</p>'
    marks=len(fields)
    questions.append(dict(id=uid,family_uid=fam,lesson=key,title=title,collection='short' if v==1 else 'variant',prompt_html=prompt,answer_html=answer,solution_html=explain,hint_html='<p>Start from the root–coefficient relations and check the stated conditions.</p>',marks=marks,difficulty=2,fields=fields,parts=[dict(label='',marking_criteria=[dict(code='B'+str(marks),marks=marks,description_html=answer)])],verification=uid))
    refs.append(dict(uid=uid,reference=reference,answers={f['key']:f['expected'] for f in fields}))
for v in [1,2]:
    poly=2*x*x-3*x-2 if v==1 else 3*x*x+5*x-2;a,b,c=s.Poly(poly,x).all_coeffs()
    quick('coefficients',1,v,'Two roots, two sums',rf'<p>For the roots \(u,v\) of \({tex(poly)}=0\), find \(u+v\) and \(uv\).</p>',[field('sum','Sum of the roots',-b/a),field('product','Product of the roots',c/a)],r'<p>Divide by the leading coefficient; the sum uses a minus sign and the product uses a plus sign.</p>',dict(kind='sums',poly=str(poly)))
    poly=x**3-4*x*x+x+6 if v==1 else 2*x**3+3*x*x-5*x+7;a,b,c,d=s.Poly(poly,x).all_coeffs()
    quick('coefficients',2,v,'The three cubic sums',rf'<p>For \({tex(poly)}=0\), find \(e_1,e_2,e_3\).</p>',[field('e1','Sum of the roots',-b/a),field('e2','Pair-product sum',c/a),field('e3','Product of the roots',-d/a)],r'<p>For a cubic the coefficient signs are minus, plus, minus. Divide each coefficient by the leading coefficient.</p>',dict(kind='elementary',poly=str(poly)))
    poly=x**4-3*x**3+2*x*x+5*x-4 if v==1 else 2*x**4+x**3-4*x*x-3*x+5;a,b,c,d,e=s.Poly(poly,x).all_coeffs()
    quick('coefficients',3,v,'Triple products and the product',rf'<p>For the four roots of \({tex(poly)}=0\), find \(e_3,e_4\).</p>',[field('e3','Triple-product sum',-d/a),field('e4','Product of all four roots',e/a)],'<p>The coefficient of x determines the triple products. The constant determines the product of all four roots.</p>',dict(kind='quartic-tail',poly=str(poly)))
    opt={'A':r'\(2u+v,\ u^2+2uv,\ u^2v\)','B':r'\(u+v,\ u^2+uv,\ uv\)','C':r'\(2u+v,\ 2u^2+uv,\ u^2v\)'} if v==1 else {'A':r'\(u+2v,\ 2uv+v^2,\ uv^2\)','B':r'\(u+v,\ uv+v^2,\ uv\)','C':r'\(u+2v,\ u^2+2uv,\ u^2v\)'}
    pattern='u,u,v' if v==1 else 'u,v,v'
    quick('coefficients',4,v,'Count repeated root positions',rf'<p>A monic cubic has roots \({pattern}\). Choose \((e_1,e_2,e_3)\).</p>',[field('choice','Choose the complete list','A','choice',options=opt)],'<p>Count every root position in each sum and product, including repetitions.</p>',dict(kind='multiplicity',variant=v))
    poly=x**3-2*x*x-3*x+4 if v==1 else x**3+3*x*x-x-2
    quick('symmetric-sums',1,v,'Sum of the squares',rf'<p>For the roots of \({tex(poly)}=0\), find \(\sum r_i^2\).</p>',[field('square','Sum of the squares',power(poly,2))],r'<p>Use \(S_2=e_1^2-2e_2\); individual roots are unnecessary.</p>',dict(kind='power',poly=str(poly),n=2))
    poly=x**3-x+3 if v==1 else x**3+2*x-1
    quick('symmetric-sums',2,v,'Continue a root recurrence',rf'<p>Use the root equation of \({tex(poly)}=0\) to find \(S_6\).</p>',[field('sixth','Sixth-power sum',power(poly,6))],r'<p>Multiply the root equation by suitable powers and sum. Start with \(S_0=3\).</p>',dict(kind='power',poly=str(poly),n=6))
    poly=x**3-3*x*x+x+2 if v==1 else x**3+x*x-2*x-3
    quick('symmetric-sums',3,v,'A reciprocal square sum',rf'<p>For the roots of \({tex(poly)}=0\), find \(\sum r_i^{{-2}}\).</p>',[field('reciprocal','Reciprocal square sum',power(poly,-2))],r'<p>The constant is non-zero. Find the reciprocal sum and pair-product sum, then use the square identity.</p>',dict(kind='power',poly=str(poly),n=-2))
    degree=3 if v==1 else 4
    quick('symmetric-sums',4,v,'Start the recurrence correctly',rf'<p>For all {degree} roots counted with multiplicity, what is \(S_0\)?</p>',[field('choice','Choose S0',str(degree),'choice',options={str(i):rf'\({i}\)' for i in [1,2,3,4]})],'<p>Sum one constant for each root position.</p>',dict(kind='S0',degree=degree))
    old=x**3-2*x*x+x+3 if v==1 else x**3+x*x-3*x+1;shift=2 if v==1 else -1;new=s.expand(old.subs(x,y-shift))
    phrase='2 more than' if v==1 else '1 less than'
    quick('transformations',1,v,'Translate every root',rf'<p>Find a monic equation in y for roots {phrase} the roots of \({tex(old)}=0\).</p>',[eq(new)],rf'<p>Use \(y=x+({shift})\), hence \(x=y-({shift})\), in the original equation.</p>',dict(kind='transform',poly=str(old),map=str(x+shift),result=str(new)))
    old=2*x**3-x*x+3*x-4 if v==1 else x**3+4*x*x-2*x+3;new=s.expand(y**3*old.subs(x,1/y))
    quick('transformations',2,v,'Reverse the coefficients carefully',rf'<p>Find an equation in y for reciprocal roots of \({tex(old)}=0\).</p>',[eq(new)],r'<p>The constant is non-zero. Substitute \(x=1/y\) and multiply by \(y^3\).</p>',dict(kind='transform',poly=str(old),map=str(1/x),result=str(new)))
    old=x**3-3*x+2 if v==1 else x**3+2*x-2;new=s.Poly(s.resultant(old,y-x*x,x),y).monic().as_expr()
    quick('transformations',3,v,'An equation for squared roots',rf'<p>Find a monic equation in y for the squared roots of \({tex(old)}=0\), retaining multiplicities.</p>',[eq(new)],r'<p>Put \(y=x^2\) and eliminate x with the root equation. Repeated new values still count.</p>',dict(kind='transform',poly=str(old),map=str(x*x),result=str(new)))
    opt={'A':r'\(x=y-3\)','B':r'\(x=y+3\)','C':r'\(x=3-y\)'} if v==1 else {'A':r'\(x=(y+1)/2\)','B':r'\(x=2y-1\)','C':r'\(x=(y-1)/2\)'}
    relation='y=x+3' if v==1 else 'y=2x-1'
    quick('transformations',4,v,'Choose the inverse substitution',rf'<p>The new root is \({relation}\). Which expression for the old root x should be substituted?</p>',[field('choice','Choose the inverse relation','A','choice',options=opt)],'<p>Make x the subject of the definition before substituting.</p>',dict(kind='inverse',variant=v))
    roots=[-2,1,4] if v==1 else [-1,2,5];poly=s.prod(y-r for r in roots)
    quick('mixed',1,v,'Reconstruct a progression',rf'<p>A monic cubic has roots \(a-3,a,a+3\) with sum \({sum(roots)}\). Give its equation in y.</p>',[eq(poly)],'<p>The sum is 3a. Find all three roots and multiply their linear factors.</p>',dict(kind='given-roots',roots=roots))
    coef=4 if v==1 else 5;poly=x**4-coef*x**3+3*x*x-coef*x+1
    quick('mixed',2,v,'Positive and negative powers together',rf'<p>For \({tex(poly)}=0\), find \(\sum(r_i^2+r_i^{{-2}})\).</p>',[field('sum','Combined square sum',power(poly,2)+power(poly,-2))],'<p>The polynomial is reciprocal, so both sets of roots have the same square sum.</p>',dict(kind='combined',poly=str(poly)))
    a=2 if v==1 else 3;poly=(x-a)**2*(x+1)**2
    quick('mixed',3,v,'Keep the double roots in a sum',rf'<p>Find the square sum of all four roots of \((x-{a})^2(x+1)^2=0\), counting multiplicities.</p>',[field('squares','Square sum including repetitions',2*a*a+2)],'<p>Each numerical root occurs twice, so both squares are counted twice.</p>',dict(kind='power',poly=str(s.expand(poly)),n=2))
    t=3 if v==1 else 1;options={'A':'Two distinct real roots','B':'No real roots','C':'One repeated real root'} if v==1 else {'A':'No real roots','B':'Two distinct real roots','C':'One repeated real root'}
    quick('mixed',4,v,'Count real reciprocal solutions',rf'<p>If \(x+1/x={t}\), how many distinct real values of x are possible?</p>',[field('choice','Choose the number of real roots','A','choice',options=options)],rf'<p>Use \(x^2-{t}x+1=0\). Its discriminant is \({t*t-4}\).</p>',dict(kind='real-count',t=t))

coeff={'4246','5871','6267','6284','6498','6535','6292'}
sym={'6236','6317','6355','6409','6420','6516','4145','4180','4274','5889','6218'}
mixed={'5851','6445','6477','6374','6385','6418','6587','5803','5834','6429','6557','6582','4132','4240'}
by_id={r['id']:r for r in audit['rows']};distribution=[]
def content_digest(q):
    return hashlib.sha256('\0'.join([q['title'],q['prompt_html'],q['answer_html'],q['solution_html'],q['hint_html'],str(q['marks'])]).encode()).hexdigest()
for q in [q for l in owner['lessons'] for q in l['questions']]:
    r=by_id[q['id']]
    key='coefficients' if q['id'] in coeff else 'symmetric-sums' if q['id'] in sym else 'mixed' if q['id'] in mixed else 'transformations'
    distribution.append({**r,'lesson':key,'held':False})
    parts=[dict(label=str(p['part']),marking_criteria=[dict(code=str(p['marks']),marks=p['marks'],description_html='<p>'+html.escape(p['criteria'])+'</p>')]) for p in q['mark_scheme']['parts']]
    assert sum(c['marks'] for p in parts for c in p['marking_criteria'])==q['marks']==q['mark_scheme']['total_marks']
    questions.append(dict(id=r['uid'],family_uid=r['uid'],lesson=key,title=q['title'],collection='exam',prompt_html=q['question_html'],answer_html=q['answer_html'],solution_html=q['solution_html'],hint_html=q['hint_html'],marks=q['marks'],difficulty={'standard':3,'advanced':4,'challenge':5}[q['difficulty']],fields=[],parts=parts,provenance=dict(original_id=q['provenance']['original_id'],original_uid=q['provenance']['original_uid'],archiveTaskId=r['archiveTaskId'],similarity=r['similarity'],sourceSha256=audit['sourceSha256'],ownerProvenance=q['provenance']),verification='OWNER-'+q['id']))
pack=dict(schema_version=1,key='9231-fp1-roots',version='1.0.0',course=dict(slug='maths4u-9231-fp1',title='Further Pure Mathematics 1 (9231)',code='9231',direction='further'),chapter=dict(id='fp1_roots',slug='roots-original',title='Roots of polynomial equations',position=0),lessons=lessons,questions=questions,marking_status='DRAFT',source=dict(sha256=audit['sourceSha256'],supplied=62,held=[]))
for row in refs:row['contentSha256']=content_digest(next(q for q in questions if q['id']==row['uid']))
for row in distribution:row['contentSha256']=content_digest(next(q for q in questions if q['id']==row['uid']))
teaching_digests={l['id']:hashlib.sha256(json.dumps(l,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest() for l in lessons}
out=Path('content/original/9231-fp1');out.mkdir(parents=True,exist_ok=True)
(out/'roots-v1.json').write_text(json.dumps(pack,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(out/'roots-quick-verification-v1.json').write_text(json.dumps(refs,indent=2)+'\n',encoding='utf-8')
Path('docs/ARENA-C1-SOURCE-AUDIT-20261106.json').write_text(json.dumps({**audit,'metric':'Reference mappings verified against archived source text; token ratios are diagnostic only, not an authorship determination or a publication threshold.','thresholdRemovedByOwner':True,'rows':distribution,'teachingDigests':teaching_digests},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'lessons':len(lessons),'examples':sum(len(l['examples']) for l in lessons),'quickChecks':len(refs),'ownerTasks':len(questions)-len(refs),'held':0}))
