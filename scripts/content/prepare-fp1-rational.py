"""Build the versioned chapter from read-only owner input and verified media."""
import argparse,hashlib,json,re,html
from pathlib import Path
import sympy as s
from fp1_rational_teaching import lessons

parser=argparse.ArgumentParser();parser.add_argument('--source',required=True);parser.add_argument('--audit',required=True);parser.add_argument('--assets',required=True);args=parser.parse_args()
source=Path(args.source);owner=json.loads(source.read_text(encoding='utf-8-sig'))
audit=json.loads(Path(args.audit).read_text(encoding='utf-8'))
assert hashlib.sha256(source.read_bytes()).hexdigest()==audit['sourceSha256']
media=json.loads(Path(args.assets).read_text(encoding='utf-8'))
if isinstance(media,dict):media=media['images']
x=s.Symbol('x');questions=[];checks=[];edits=[]
topic_map={'Asymptotes and curve sketching':'asymptotes','Ranges and stationary points':'ranges','Parameter families and reconstruction':'parameters','Modulus and inequalities':'modulus','Relationships between curves':'relationships'}
def field(key,label,expected,kind='number',**kw):return dict(key=key,label=label,type=kind,expected=expected if isinstance(expected,list) else str(expected),**kw)
def tex(v):return s.latex(v)
def display(f):
    value=f['expected']
    if f['type']=='choice':return html.escape(value)
    if f['type']=='ratio':return r'\(\frac{'+tex(s.sympify(value[0]))+'}{'+tex(s.sympify(value[1]))+r'}\)'
    if f['type']=='pairs':
        return r'\('+r',\quad '.join(r'\left('+','.join(tex(s.sympify(t)) for t in point[1:-1].split(','))+r'\right)' for point in value.split(';'))+r'\)'
    if f['type']=='set':
        chunks=[]
        for part in value.split(' U '):
            if part.startswith('{'):chunks.append(r'\{'+','.join(tex(s.sympify(t)) for t in part[1:-1].split(','))+r'\}')
            else:
                chunks.append(r'\left'+part[0]+','.join(r'-\infty' if t=='-inf' else r'\infty' if t=='inf' else tex(s.sympify(t)) for t in part[1:-1].split(','))+r'\right'+part[-1])
        return r'\('+r'\cup'.join(chunks)+r'\)'
    return r'\('+tex(s.sympify(value.replace('^','**')))+r'\)'
def quick(topic,family,v,title,prompt,fields,explanation,reference):
    code={'asymptotes':'A','ranges':'G','parameters':'P','modulus':'M','relationships':'R'}[topic]
    uid=f'M4U-9231-RF-{code}{family}{v}'
    answer='<p>'+('; '.join(html.escape(f['label'])+': '+display(f) for f in fields))+'</p>'
    q=dict(id=uid,family_uid=f'M4U-9231-RF-{code}{family}',lesson=topic,title=title,collection='short' if v==1 else 'variant',prompt_html=prompt,answer_html=answer,solution_html=explanation,hint_html='<p>Check the original domain before simplifying, and retain every boundary case.</p>',marks=len(fields),difficulty=2 if family<3 else 3,fields=fields,parts=[dict(label='',marking_criteria=[dict(code='A1',marks=1,description_html='<p>Give the complete correct '+html.escape(f['label'].lower())+'.</p>') for f in fields])],verification=uid)
    questions.append(q);checks.append(dict(uid=uid,answers={f['key']:f['expected'] for f in fields},reference=reference))

for v in [1,2]:
    h,d,r=(1,2,3) if v==1 else (-2,3,5)
    f=x+d+s.Rational(r,1)/(x-h);num=s.expand((x-h)*(x+d)+r)
    quick('asymptotes',1,v,'Read the two asymptotes',rf'<p>For \(f(x)=\frac{{{tex(num)}}}{{{tex(x-h)}}}\), give the vertical asymptote \(x=h\) and both coefficients of the oblique asymptote \(y=mx+c\).</p>',[field('h','Excluded input h',h),field('m','Oblique gradient m',1),field('c','Oblique intercept c',d)],rf'\[f(x)=x+({d})+\frac{{{r}}}{{x-({h})}}.\]<p>The remainder is non-zero, so the excluded input is a genuine pole.</p>',dict(kind='division',num=str(num),den=str(x-h),quotient=str(x+d),pole=h))
    h,c=(3,2) if v==1 else (-1,4);num=s.expand((x-h)*(x+c))
    quick('asymptotes',2,v,'Locate the missing point',rf'<p>The original expression is \(f(x)=\frac{{{tex(num)}}}{{{tex(x-h)}}}\). Give both coordinates of the hole.</p>',[field('x','Hole x-coordinate',h),field('y','Hole y-coordinate',h+c)],rf'<p>It simplifies to \(x+({c})\), but \(x={h}\) remains excluded. The missing height is \({h+c}\).</p>',dict(kind='hole',num=str(num),den=str(x-h),hole=[h,h+c]))
    c,t=(2,-3) if v==1 else (4,1);num=s.expand(c*(x*x+1)+x-t)
    quick('asymptotes',3,v,'Find the crossing of a limiting height',rf'<p>For \(f(x)=\frac{{{tex(num)}}}{{x^2+1}}\), give the horizontal asymptote height and the input at which the graph crosses it.</p>',[field('height','Asymptote height',c),field('x','Crossing input',t)],rf'\[f(x)={c}+\frac{{x-({t})}}{{x^2+1}}.\]<p>The denominator is positive; the remainder vanishes and changes sign at the crossing.</p>',dict(kind='horizontal',num=str(num),den='x**2+1',height=c,crossing=t))
    opts={'A':'A cancelled factor always gives a vertical asymptote.','B':'A cancelled factor can leave a finite missing point.','C':'A horizontal asymptote cannot be crossed.'} if v==1 else {'A':'The original excluded input becomes valid after cancellation.','B':'An oblique asymptote must be parallel to the x-axis.','C':'A non-zero numerator at a denominator zero gives a pole.'}
    correct='B' if v==1 else 'C'
    quick('asymptotes',4,v,'Check the graph principle','<p>Which statement is correct for rational functions?</p>',[field('choice','Choose the correct statement',correct,'choice',options=opts)],'<p>Keep the original domain. A finite limit gives a hole; an unbounded one gives a pole. Limiting lines can be crossed.</p>',dict(kind='principle',topic='asymptotes',variant=v,correct=correct))
    p=3 if v==1 else 4
    quick('ranges',1,v,'Give both branches of the range',rf'<p>Give the full range of \(f(x)=x+\frac{{{p*p}}}x\), \(x\ne0\).</p>',[field('range','Complete range',f'(-inf,{-2*p}] U [{2*p},inf)','set')],rf'<p>The equation for an input is \(x^2-yx+{p*p}=0\). Its discriminant is \(y^2-{4*p*p}\), and both boundary heights are attained.</p>',dict(kind='range',function=str(x+p*p/x),domain='natural'))
    a,b=(1,3) if v==1 else (-2,5)
    quick('ranges',2,v,'Distinguish a maximum from a limit',rf'<p>Give the full range of \(f(x)={a}+\frac{{{b}}}{{x^2+1}}\).</p>',[field('range','Complete range',f'({a},{a+b}]','set')],rf'<p>The positive fraction is at most \({b}\), attained at \(0\), and is never zero.</p>',dict(kind='range',function=str(a+b/(x*x+1)),domain='natural'))
    p=2 if v==1 else 3
    quick('ranges',3,v,'Find every stationary point',rf'<p>Give all stationary coordinate pairs of \(f(x)=x+\frac{{{p*p}}}x\).</p>',[field('points','All stationary coordinate pairs',f'(-{p},-{2*p});({p},{2*p})','pairs')],rf'<p>Use \(f^\prime(x)=1-{p*p}/x^2=0\), then calculate both ordinates.</p>',dict(kind='stationary',function=str(x+p*p/x),points=[[-p,-2*p],[p,2*p]]))
    opts={'A':'A limiting height belongs to the range whenever it is an asymptote.','B':'A height belongs to the range only if an allowed input attains it.','C':'Every stationary point is a global minimum.'} if v==1 else {'A':'Check the linear equation separately when its quadratic coefficient vanishes.','B':'A zero quadratic coefficient means no input is possible.','C':'Clearing a denominator removes the original exclusions.'}
    correct='B' if v==1 else 'A'
    quick('ranges',4,v,'Check the endpoint argument','<p>Which step is valid when finding a range?</p>',[field('choice','Choose the valid step',correct,'choice',options=opts)],'<p>Attainment and exceptional leading coefficients need explicit checks in the original domain.</p>',dict(kind='principle',topic='ranges',variant=v,correct=correct))
    h,d,y0=(1,5,-3) if v==1 else (2,3,-1)
    a,b,c=2,d-2*h,-h*y0
    quick('parameters',1,v,'Reconstruct every numerator coefficient',rf'<p>The curve \(f(x)=\frac{{ax^2+bx+c}}{{x-({h})}}\) has oblique asymptote \(y=2x+({d})\) and passes through \((0,{y0})\). Find \(a,b,c\).</p>',[field('a','Coefficient a',a),field('b','Coefficient b',b),field('c','Coefficient c',c)],'<p>Compare coefficients with the quotient times the denominator, then use the given point to find the constant numerator term.</p>',dict(kind='reconstruct',h=h,gradient=2,intercept=d,y0=y0))
    h=2 if v==1 else 3
    quick('parameters',2,v,'Find the cancellation parameter',rf'<p>For \(f_k(x)=\frac{{x^2+k}}{{x-{h}}}\), find the value of \(k\) for which the excluded input is a finite hole.</p>',[field('k','Exceptional parameter k',-h*h)],rf'<p>The numerator must vanish at \(x={h}\), so \(k=-{h*h}\). The cancelled input remains excluded.</p>',dict(kind='parameter-hole',h=h))
    h=2 if v==1 else 3
    quick('parameters',3,v,'Include the boundary parameter',rf'<p>Give all real \(k\) for which \(f_k(x)=\frac{{x^2+k}}{{x-{h}}}\) has no stationary points. Include the cancellation case.</p>',[field('parameters','Complete set of parameter values',f'(-inf,{-h*h}]','set')],rf'<p>The derivative is \(1-(k+{h*h})/(x-{h})^2\). It is positive throughout the domain when \(k+{h*h}\le0\), including equality.</p>',dict(kind='parameter-stationary',h=h))
    opts={'A':'A repeated numerator root is a contact point only if the input is in the domain.','B':'A zero at a cancelled pole is an intercept.','C':'One stationary input determines every coefficient of any rational function.'} if v==1 else {'A':'A zero remainder always makes the function constant.','B':'A zero remainder can leave a line with one missing point.','C':'A moving pole must be a stationary input.'}
    correct='A' if v==1 else 'B'
    quick('parameters',4,v,'Check the exceptional member','<p>Which statement correctly handles a special parameter value?</p>',[field('choice','Choose the correct statement',correct,'choice',options=opts)],'<p>Check the denominator before interpreting a numerator root. Cancellation simplifies the rule but does not enlarge the original domain.</p>',dict(kind='principle',topic='parameters',variant=v,correct=correct))
    a,b=(2,-1) if v==1 else (3,1)
    quick('modulus',1,v,'Keep the pole open',rf'<p>Solve \(\frac{{x-{a}}}{{x-({b})}}\ge0\), giving the complete set.</p>',[field('inputs','All allowed inputs',f'(-inf,{b}) U [{a},inf)','set')],'<p>Use a sign chart at the pole and zero. Include the zero because the inequality is non-strict, but never include the pole.</p>',dict(kind='inequality',function=str((x-a)/(x-b)),op='>=',right='0'))
    a,b=(1,2) if v==1 else (2,3);lo=-a-2*b;hi=s.Rational(a-2*b,3)
    quick('modulus',2,v,'Solve the entire modulus strip',rf'<p>Solve \(\left|\frac{{x-{a}}}{{x+{b}}}\right|&lt;2\).</p>',[field('inputs','All allowed inputs',f'(-inf,{lo}) U ({hi},inf)','set')],'<p>Record the pole, square both non-negative sides, and solve the resulting quadratic sign inequality.</p>',dict(kind='absolute-inequality',function=str((x-a)/(x+b)),op='<',right='2'))
    h,c=(3,1) if v==1 else (5,1);u=s.Rational(h-c,2)
    quick('modulus',3,v,'Reflect the allowed inputs',rf'<p>For \(f(t)=\frac{{t+{c}}}{{t-{h}}}\), solve \(f(|x|)\le-1\).</p>',[field('inputs','All real x-inputs',f'(-{h},-{u}] U [{u},{h})','set')],rf'<p>For \(u=|x|\ge0\), the solution is \({tex(u)}\le u&lt;{h}\). Reflect that interval in the origin.</p>',dict(kind='input-absolute',function=str((x+c)/(x-h)),op='<=',right='-1'))
    opts={'A':'Multiply by the denominator and keep the inequality direction in every interval.','B':'Use a sign chart and retain all original excluded inputs.','C':'Include each pole when the inequality is non-strict.'} if v==1 else {'A':'A literal inequality between polynomial moduli has no denominator exclusions.','B':'Every pole of an auxiliary quotient must be excluded from the literal inequality.','C':'Squaring two absolute values reverses their order.'}
    correct='B' if v==1 else 'A'
    quick('modulus',4,v,'Choose a valid inequality method','<p>Which argument is valid?</p>',[field('choice','Choose the valid argument',correct,'choice',options=opts)],'<p>The actual expression determines the domain. A sign chart preserves the direction correctly on every interval.</p>',dict(kind='principle',topic='modulus',variant=v,correct=correct))
    a,b=(1,2) if v==1 else (2,3)
    quick('relationships',1,v,'Keep both reciprocal exclusions',rf'<p>Let \(f(x)=\frac{{x-{a}}}{{x+{b}}}\) and \(g=1/f\). Give the numerator and denominator of \(g\), separated by a semicolon, and the full set of excluded real inputs.</p>',[field('g','Numerator; denominator of g',[str(x+b),str(x-a)],'ratio',variables=['x']),field('excluded','All excluded inputs',f'{{-{b},{a}}}','set')],'<p>Invert the quotient, but retain the original pole and additionally exclude the zero of f.</p>',dict(kind='reciprocal',function=str((x-a)/(x+b)),excluded=[-b,a]))
    a,b=(1,2) if v==1 else (2,3)
    quick('relationships',2,v,'Find the real domain of the relation',rf'<p>Give the complete real x-domain of \(y^2=\frac{{x-{a}}}{{x+{b}}}\).</p>',[field('domain','Complete real x-domain',f'(-inf,-{b}) U [{a},inf)','set')],'<p>The right-hand side must be non-negative and defined. Both signs of y occur when it is positive.</p>',dict(kind='inequality',function=str((x-a)/(x+b)),op='>=',right='0'))
    a,b=(2,1) if v==1 else (3,1);mid=s.Rational(a-b,2)
    quick('relationships',3,v,'Compare across all signs',rf'<p>For \(f(x)=\frac{{x-{a}}}{{x+{b}}}\), solve \(1/f(x)&gt;f(x)\).</p>',[field('inputs','All allowed inputs',f'(-{b},{mid}) U ({a},inf)','set')],'<p>Subtract the functions and make a sign chart. Keep the original pole and the zero of f excluded.</p>',dict(kind='reciprocal-inequality',function=str((x-a)/(x+b)),op='>',right='0'))
    opts={'A':'The relation y²=f contains only its positive square-root branch.','B':'It is real wherever f is defined, even when f is negative.','C':'It has both signs of y where f is positive.'} if v==1 else {'A':'The simplified reciprocal can fill every original hole.','B':'A zero of the original function is excluded from its reciprocal.','C':'The inequality 1/f > f can be multiplied by f without a sign check.'}
    correct='C' if v==1 else 'B'
    quick('relationships',4,v,'Check the related-curve principle','<p>Which statement is correct?</p>',[field('choice','Choose the correct statement',correct,'choice',options=opts)],'<p>Check the original and transformed domains. A square-root relation has both branches; a reciprocal excludes every original zero.</p>',dict(kind='principle',topic='relationships',variant=v,correct=correct))

mapping={r['id']:r for r in audit['rows']};rows=[]
for q in [q for l in owner['lessons'] for q in l['questions']]:
    r=mapping[q['id']];key=topic_map[q['topic']]
    replacements={a['source_name']:'/api/files/'+a['file_id'] for a in media if a['question_uid']==q['content_uid']}
    def normalise(value):
        for old,new in replacements.items():value=value.replace(old,new)
        # Three unambiguous TeX command separators; no mathematical change.
        for old,new in [(r'\gtf',r'\gt f'),(r'\ltf',r'\lt f')]:
            if old in value:edits.append(dict(id=q['id'],old=old,new=new));value=value.replace(old,new)
        return value
    parts=[dict(label=p['label'],marking_criteria=[dict(code=m['code'],marks=m['marks'],description_html=normalise(m['criterion_html'])) for m in p['marking_points']]) for p in q['parts']]
    assert sum(p['marks'] for p in q['parts'])==q['marks']
    item=dict(id=q['content_uid'],family_uid=q['content_uid'],lesson=key,title=q['title'],collection='exam',prompt_html=normalise(q['question_html']),answer_html=normalise(q['answer_html']),solution_html=normalise(q['solution_html']),hint_html=normalise(q['hint_html']),marks=q['marks'],difficulty=q['difficulty'],fields=[],parts=parts,provenance=dict(original_id=q['provenance']['source_id'],original_uid=q['provenance']['source_uid'],archiveTaskId=r['archiveTaskId'],sourceSha256=audit['sourceSha256'],ownerProvenance=q['provenance']),verification='OWNER-'+q['id'])
    questions.append(item);rows.append({**r,'lesson':key,'marks':q['marks']})
def digest(q):return hashlib.sha256('\0'.join([q['title'],q['prompt_html'],q['answer_html'],q['solution_html'],q['hint_html'],str(q['marks'])]).encode()).hexdigest()
for row in rows:row['contentSha256']=digest(next(q for q in questions if q['id']==row['uid']))
for row in checks:row['contentSha256']=digest(next(q for q in questions if q['id']==row['uid']))
assets=[{k:v for k,v in a.items() if k not in ['source_name','source_sha256']} for a in media]
package=dict(schema_version=1,key='9231-fp1-rational',version='1.0.0',course=dict(slug='maths4u-9231-fp1',title='Further Pure Mathematics 1 (9231)',code='9231',direction='further'),chapter=dict(id='fp1_rational',slug='rational-functions',title='Rational functions',position=1),source=dict(sha256=audit['sourceSha256'],supplied=53,held=[]),lessons=lessons,questions=questions,marking_status='DRAFT',assets=assets)
out=Path('content/original/9231-fp1')
(out/'rational-v1.json').write_text(json.dumps(package,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(out/'rational-quick-verification-v1.json').write_text(json.dumps(checks,indent=2)+'\n',encoding='utf-8')
report=dict(sourceSha256=audit['sourceSha256'],rows=rows,editorialRepairs=edits,teachingDigests={l['id']:hashlib.sha256(json.dumps(l,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest() for l in lessons},images=media)
if 'mediaSource' in audit:report['mediaSource']=audit['mediaSource']
Path('docs/ARENA-C2-RATIONAL-SOURCE-AUDIT-20261106.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(dict(ownerTasks=53,quickChecks=len(checks),lessons=len(lessons),examples=sum(len(l['examples']) for l in lessons),solutionDiagrams=len(assets),editorialRepairs=len(edits))))
