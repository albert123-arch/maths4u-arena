"""Recompute geometry from statements; distinguish exact checks and proof review."""
import argparse,hashlib,json,re,math,html
from pathlib import Path
import sympy as s
from fp1_vectors_geometry import *
ap=argparse.ArgumentParser();ap.add_argument('--report',required=True);ap.add_argument('--owner');args=ap.parse_args()
root=Path('content/original/9231-fp1');pack=json.loads((root/'vectors-v1.json').read_text(encoding='utf8'));fixtures=json.loads((root/'vectors-owner-verification-v1.json').read_text(encoding='utf8'));audit=json.loads(Path('docs/ARENA-C2-VECTORS-SOURCE-AUDIT-20261106.json').read_text(encoding='utf8'))
log=[];failures=[];unhandled=[];errors=[];current='SETUP'
def truth(label,ok,detail=None):
    row=dict(id=current,label=label,result='PASS' if ok else 'FAIL')
    if detail is not None:row['detail']=detail
    log.append(row)
    if not ok:failures.append(row)
def equal(label,actual,expected):
    delta=s.simplify(actual-expected)
    if isinstance(delta,s.MatrixBase):ok=all(s.simplify(s.expand_trig(v))==0 for v in delta)
    else:ok=s.simplify(s.expand_trig(delta))==0
    truth(label,ok,dict(actual=str(actual),expected=str(expected),residual=str(delta)))
def reviewed(label,reason):log.append(dict(id=current,label=label,result='REVIEWED',argument=reason))
def same_plane(label,claimed,expected):
    N,D=claimed;n,d=expected;indices=[i for i,v in enumerate(n) if s.simplify(v)!=0]
    truth(label+' genuine normal',bool(indices) and any(s.simplify(v)!=0 for v in N))
    if not indices:return
    ratio=s.simplify(N[indices[0]]/n[indices[0]])
    equal(label+' proportional normal',N,ratio*n);equal(label+' same constant',D,ratio*d)
def line_equal(label,claimed,expected):
    A,u=claimed;B,v=expected
    truth(label+' nonzero directions',any(c!=0 for c in u) and any(c!=0 for c in v))
    equal(label+' parallel directions',u.cross(v),M([0,0,0]));equal(label+' anchor on locus',(A-B).cross(v),M([0,0,0]))
def distance_value(part,key='d'):
    values=scalar_answers(part['answer_html'],key)
    if values:return values[0]
    for text in blocks(part['answer_html']):
        if r'\begin' not in text and '=' not in text:
            try:
                value=expr(text)
                if not value.free_symbols:return value
            except Exception:pass
    raise ValueError('No scalar answer: '+part['answer_html'][:100])
def all_roots(label,claimed,expected):
    truth(label,len(set(map(str,claimed)))==len(expected) and all(any(s.simplify(v-u)==0 for u in claimed) for v in expected),dict(claimed=list(map(str,claimed)),expected=list(map(str,expected))))
def plane_for(text,C):
    options=[(text.find(name),name) for name in ['ABC','ABD','ACD','OAB','OBC','ABQ'] if name in text]
    if options:return C['planes'][min(options)[1]]
    for token,name in [(r'\Pi_k','PiK'),(r'\Pi_{','PiK'),(r'\Pi_1','Pi1'),(r'\Pi_2','Pi2'),(r'\Sigma','Sigma')]:
        if token in text and name in C['planes']:return C['planes'][name]
    return C['planes'].get('Pi',C['planes'].get('Pi1'))
def point_from(text,C):
    match=re.search(r'from\s*\\\(([A-Z])(?:_[^\\]*)?\\\)',text)
    name=match[1] if match else 'P'
    if name in C['points']:return C['points'][name]
    if C['lines']:return C['lines'][0][0]
    raise ValueError('No source point '+name)
def angle_check(part,C):
    text=part['prompt_html'];planes=C['planes'];P=C['points'];lines=C['lines']
    match=re.search(r'\\(sin|cos)\^\{-1\}\\left\((.*?)\\right\)',part['answer_html'])
    if not match:raise ValueError('No inverse-trig key')
    trig,raw=match.groups();claimed=expr(raw)
    if trig=='cos':
        names=re.findall(r'ABC|ABD|ACD|OAB|OBC|ABQ',text)
        if len(names)>=2:N,D=planes[names[0]];n,d=planes[names[1]]
        elif len(names)==1:N,D=planes[names[0]];n,d=planes['Pi']
        else:N,D=planes.get('Pi1',planes.get('Pi'));n,d=planes['Pi2'] if 'Sigma' not in planes else planes['Sigma']
        ratio2=s.simplify(N.dot(n)**2/(N.dot(N)*n.dot(n)))
    else:
        n,d=plane_for(text,C)
        if 'CD' in text:u=P['D']-P['C']
        elif 'OD' in text:u=P['D']
        elif 'OA' in text:u=P['A']
        elif r'l_2' in text:u=lines[1][1]
        elif current in ['4144','4249','6563']:u=C['mats'][-1]
        else:u=lines[0][1]
        ratio2=s.simplify(u.dot(n)**2/(u.dot(u)*n.dot(n)))
    equal('angle exact trigonometric ratio squared',claimed**2,ratio2)
    truth('angle has valid positive ratio',0<=float(claimed)<=1)
    rounded=re.search(r'=([0-9.]+)\^\\circ',part['answer_html'])
    if rounded:
        actual=math.degrees((math.asin if trig=='sin' else math.acos)(math.sqrt(float(ratio2))))
        truth('one-decimal angle',f'{actual:.1f}'==f'{float(rounded[1]):.1f}',dict(computed=actual))
def context_part(C,uid,index):
    values={}
    if uid=='4112' and index==1:values[t]=0
    if uid=='4110' and index>0:values[t]=6
    if uid=='4238' and index==3:values[t]=4
    if uid=='6227' and index==3:values[t]=2
    if uid=='6242' and index>0:values[t]=s.Rational(1,11)
    if uid=='4265' and index>0:values[t]=3
    if uid in ['4160','5857'] and index==1:
        A,u=C['lines'][0];B,v=C['lines'][1];values[t]=s.solve((B-A).dot(u.cross(v)),t)[0]
    if uid=='5865' and index>0:
        A,u=C['lines'][0];B,v=C['lines'][1];values[t]=s.solve((B-A).dot(u.cross(v)),t)[0]
    if not values:return C
    return dict(points={n:substitute(v,values) for n,v in C['points'].items()},planes={n:substitute(v,values) for n,v in C['planes'].items()},lines=[substitute(v,values) for v in C['lines']],mats=[substitute(v,values) for v in C['mats']],raw=C['raw'])
def distance_roots(part,C,variable=t,positive=False):
    target=target_distance(part['prompt_html']);P=C['points']
    if 'planes' in part['prompt_html'] or 'plane' in part['prompt_html'] or current in ['6255','4205','4212']:
        n,d=plane_for(part['prompt_html'],C);value=(n.dot(P['P'])-d)**2/n.dot(n)
    else:
        A,u=C['lines'][0];B,v=C['lines'][1];normal=u.cross(v);value=(B-A).dot(normal)**2/normal.dot(normal)
    roots=s.solve(s.factor(value-target**2),variable);roots=[r for r in roots if r.is_real is not False and (not positive or r>0)]
    all_roots('all distance parameter values',roots_answer(part['answer_html'],str(variable)),roots)
    for value in roots:equal('candidate satisfies original squared distance',s.simplify((value*0+target)**2),s.simplify((n.dot(P['P'])-d)**2/n.dot(n)).subs(variable,value) if 'n' in locals() else s.simplify((B-A).dot(normal)**2/normal.dot(normal)).subs(variable,value))

def tuples(raw):
    return [M([expr(v) for v in body.split(',')]) for body in re.findall(r'\\left\((.*?)\\right\)',raw) if len(body.split(','))==3]

def special_owner(row,index,part,C):
    uid=current;P=C['points'];lines=C['lines'];planes=C['planes'];text=part['prompt_html'];ans=part['answer_html'];vs=vectors(ans)
    if uid in ['5870','6513','6545'] and index==0 or uid=='4187' and index==0:
        if uid=='6545':u,v=P['A'],P['B']
        elif uid=='4187':u,v=C['mats'][:2]
        else:u,v=P['B']-P['A'],P['C']-P['A']
        equal('oriented vector product',vs[0],u.cross(v));return True
    if uid=='5870' and index==1:
        n=(P['B']-P['A']).cross(P['C']-P['A']);truth('first three points noncollinear',n.dot(n)!=0)
        all_roots('complete coplanarity values',roots_answer(ans),s.solve((P['D']-P['A']).dot(n),t));return True
    if uid in ['4110','4202','4238']:
        A,u=lines[0];n,d=planes['Pi'];coefficient=s.factor(n.dot(u));residual=s.factor(n.dot(A)-d);exceptions=s.solve(coefficient,t)
        contained=[v for v in exceptions if residual.subs(t,v)==0];disjoint=[v for v in exceptions if residual.subs(t,v)!=0]
        if index==0:
            all_roots('both exceptional parameter values',roots_answer(ans),exceptions);truth('one contained and one disjoint case',len(contained)==len(disjoint)==1)
            for v in contained:equal('contained line residual',residual.subs(t,v),0)
            for v in disjoint:truth('parallel disjoint residual',residual.subs(t,v)!=0)
            reviewed('classification completeness','The coefficient polynomial has exactly the listed real zeros. At all other values the scalar intersection equation has one solution. The direction always has a nonzero constant component.');return True
        X=s.simplify(A-residual/coefficient*u)
        if index==1 and uid!='4110':
            equal('complete rational intersection',vs[0],X);equal('intersection parameter',scalar_answers(ans,r'\lambda')[0],s.cancel(-residual/coefficient));return True
        if index==2 and uid!='4110':
            anchor,direction=vs[:2];equal('entire rational locus on claimed line',(X-anchor).cross(direction),M([0,0,0]))
            expected=[M([s.limit(v,t,s.oo) for v in X]),M([s.limit(v,t,contained[0]) for v in X])]
            claimed=tuples(ans);truth('both omitted points',len(claimed)==2 and all(any(s.simplify(v-u)==M([0,0,0]) for u in claimed) for v in expected))
            reviewed('locus converse','A nonconstant coordinate is fractional-linear in the original parameter. Its inverse excludes only the unattained limiting point and the removed contained-line value; the disjoint value is its pole.');return True
    if uid in ['4160','5857','5865','6528']:
        A,u=lines[0];B,v=lines[1]
        if index==0:
            if t in set().union(*(a.free_symbols for a in [A,u,B,v])):
                root=s.solve((B-A).dot(u.cross(v)),t)[0];all_roots('unique intersecting parameter',roots_answer(ans),[root]);A,u,B,v=[z.subs(t,root) for z in [A,u,B,v]]
            H=line_meeting(A,u,B,v);claimed=vs[-1] if vs else tuples(ans)[-1];equal('complete line-line intersection',claimed,H);truth('nonparallel crossing directions',u.cross(v).dot(u.cross(v))!=0);return True
        if uid in ['4160','5857'] and index==1:
            same_plane('plane containing both crossing lines',eq_planes(ans)[0],plane(u.cross(v),A));return True
    if uid=='4122' and index==1:
        n,d=planes['Pi1'];m,e=planes['Pi2'];N,_=planes['Sigma'];root=s.solve((n+k*m).dot(N),k)
        all_roots('unique perpendicular family member',roots_answer(ans,'k'),root);same_plane('selected family plane',eq_planes(ans)[0],planes['PiK'])
        A,u=intersection(n,d,m,e);equal('family contains intersection anchor',planes['PiK'][0].dot(A),planes['PiK'][1]);equal('family contains intersection direction',planes['PiK'][0].dot(u),0);return True
    if uid=='4167' and index==1:
        n,d=planes['Pi1'];m,e=planes['Pi2'];N=n+k*m
        values=s.solve(N.dot(n)**2/n.dot(n)-N.dot(m)**2/m.dot(m),k);claimed=roots_answer(ans,'k')
        all_roots('both equal-angle family values',claimed,values);return True
    if uid=='4182' and index==2:
        n,d=planes['Pi'];R=2*foot_plane(P['P'],n,d)-P['P'];u=P['Q']-R;scale=s.simplify((d-n.dot(R))/n.dot(u));X=R+scale*u
        equal('route point',vs[0],X);target=expr(blocks(ans)[0].split('=')[-1]);equal('global lower bound squared',target**2,u.dot(u));truth('equality point is on required segment',0<scale<1)
        reviewed('global route minimum','Reflection fixes each plane point and preserves its distance to P. The triangle inequality gives RQ as a lower bound; the computed point lies on segment RQ and the plane, so equality is attained.');return True
    if uid=='4187' and index==1:
        u,v=C['mats'][:2];w=vs[0];equal('normal perpendicular to u',w.dot(u),0);equal('normal perpendicular to v',w.dot(v),0);equal('normal magnitude squared',w.dot(w),9);truth('positive required x-component',w[0]>0);return True
    if uid=='4187' and index==2:same_plane('oriented-normal plane',eq_planes(ans)[0],planes['Pi']);return True
    if uid=='4189' and index==1:
        n,d=planes['Pi1'];A,u=lines[0];equal('line direction in plane',n.dot(u),0);truth('line anchor outside plane',n.dot(A)!=d);return True
    if uid=='4196' and index==3:
        n,d=planes['Pi'];A,u=lines[0];B,v=lines[1];anchor=2*foot_plane(A,n,d)-A;direction=u-2*u.dot(n)/n.dot(n)*n
        equal('reflected line crosses at second foot',line_meeting(anchor,direction,B,v),P['G']);equal('claimed crossing point',tuples(ans)[0],P['G']);return True
    if uid in ['4205','4212'] and index==3:
        n,d=planes['Pi1'];w=C['mats'][-1];values=[v for v in s.solve(2*w.dot(n)**2-w.dot(w)*n.dot(n),b) if v>0]
        all_roots('positive 45-degree parameter',roots_answer(ans,'b'),values);return True
    if uid=='4209' and index==2:
        A,u=lines[0];n,d=planes['Pi1'];m,e=planes['Pi2'];X=A+lam*u
        roots=s.solve((n.dot(X)-d)**2/n.dot(n)-(m.dot(X)-e)**2/m.dot(m),lam)
        all_roots('all equidistance parameters',roots_answer(ans,r'\lambda'),roots);return True
    if uid in ['4136','6474'] and 'at most' in text:
        A,u=lines[0];n,d=plane_for(text,C);X=A+lam*u;target=target_distance(text)
        actual=s.solve_univariate_inequality((n.dot(X)-d)**2/n.dot(n)<=target**2,lam,relational=False)
        low,high=re.split(r'\\leq\\lambda\\leq',blocks(ans)[0]);claimed=s.Interval(s.simplify(expr(low)),s.simplify(expr(high)));truth('complete closed distance interval',actual==claimed,dict(actual=str(actual),expected=str(claimed)));return True
    if uid=='4255' and index==0:
        u=C['mats'][1];N,D=planes['Pi1'];n,d=planes['Pi2'];qs=symbols['q'];expected=s.solve([N.dot(u),n.dot(u)],[p,qs])
        equal('direction p',scalar_answers(ans,'p')[0],expected[p]);equal('direction q',scalar_answers(ans,'q')[0],expected[qs]);return True
    if uid=='4263':
        u=C['mats'][0];rhs=C['mats'][1]
        if index==0:equal('cross-product compatibility',rhs.dot(u),0);return True
        if index==1:
            anchor,direction=vs[:2];equal('particular cross-product solution',anchor.cross(u),rhs);equal('kernel direction',direction.cross(u),M([0,0,0]));truth('nonzero kernel generator',direction.dot(direction)!=0)
            reviewed('all cross-product solutions','For nonzero u, the kernel of w -> w cross u is precisely span(u). Subtracting the particular solution and then adding any multiple of the listed generator proves both inclusions.');return True
        if index==2:equal('selected full vector',vs[0],P['W']);equal('additional scalar product',vs[0].dot(u),33);return True
    if uid=='4265' and index==0:
        A,u=lines[0];B,v=lines[1];N=u.cross(v);target=9*s.sqrt(13);values=[v for v in s.solve((B-A).dot(N)**2/N.dot(N)-target**2,t) if v>0]
        all_roots('positive spatial scale',roots_answer(ans),values);return True
    if uid=='4281':
        A,u=lines[0];B,v=lines[1]
        if index==0:
            equal('parallel directions',u.cross(v),M([0,0,0]));truth('distinct parallel lines',(B-A).cross(u).dot((B-A).cross(u))!=0)
            equal('parallel distance squared',distance_value(part)**2,(B-foot_line(B,A,u)).dot(B-foot_line(B,A,u)));return True
        if index==2:
            F,U,G,V=vs;line_equal('first closest family',(F,U),(A,u));line_equal('second closest family',(G,V),(B,v));equal('equal translations',U,V);equal('constant connector perpendicular',(G-F).dot(u),0)
            reviewed('all parallel closest pairs','The perpendicularity equation fixes the difference between the two line parameters, leaving one free common translation. The displayed family has that translation and every shortest connector.');return True
    if uid=='4133' and index==2:
        for actual,expected in zip(eq_planes(ans),[planes['Pi1'],planes['Pi2']]):same_plane('parallel support plane',actual,expected)
        n,d=planes['Pi1'];m,e=planes['Pi2'];equal('support plane separation squared',distance_value(part)**2,(d-e)**2/n.dot(n));return True
    if uid=='6227' and index<3:
        A,u=lines[0];B,v=lines[1];normal=u.cross(v);values=s.solve(list(normal),t);exception=values[t]
        if index==0:
            all_roots('parallel exception',roots_answer(ans),[exception]);truth('not coincident at exception',(B-A).cross(u).subs(t,exception).dot((B-A).cross(u).subs(t,exception))!=0)
        elif index==1:equal('nonparallel distance squared',distance_value(part)**2,s.cancel((B-A).dot(normal)**2/normal.dot(normal)))
        else:
            A,u,B,v=[w.subs(t,exception) for w in [A,u,B,v]];equal('exceptional parallel distance squared',distance_value(part)**2,(B-foot_line(B,A,u)).dot(B-foot_line(B,A,u)))
            reviewed('parallel exception and limit','The nonparallel formula has a zero normal denominator at the exception. A fresh point-to-line calculation gives the distance there; the limiting nonparallel value is a different geometric question.')
        return True
    if uid=='6266' and index==2:
        equal('complete section point',vs[0],P['M']);equal('section ratio',P['M']-P['A'],2*(P['L']-P['M']));return True
    if uid=='6290':
        if index==0:
            n,d=planes['ABC'];equal('claimed normal direction',vs[0].cross(n),M([0,0,0]));equal('normal foot distance squared',distance_value(part,'ON')**2,P['N'].dot(P['N']));return True
        if index==1:equal('complete ray-plane intersection',vs[0],P['Q']);return True
    if uid=='6299' and index==1:
        n,d=planes['Pi'];equal('normal direction',vs[0].cross(n),M([0,0,0]));equal('oriented product with line direction',vs[1],vs[0].cross(lines[0][1]));return True
    if uid=='6542' and index==2:
        A,u=lines[0];B,v=lines[2];N=u.cross(v);equal('separate skew-line distance squared',distance_value(part)**2,(B-A).dot(N)**2/N.dot(N));return True
    if uid=='6576':
        A,u=lines[0];B,v=lines[1];N=u.cross(v)
        if index==1:
            solutions=s.solveset((B-A).dot(N),t,domain=s.Interval.Ropen(0,2*s.pi));all_roots('all trigonometric intersections',roots_answer(ans),list(solutions));return True
        if index==2:
            A,u,B,v=[w.subs(t,s.pi/3) for w in [A,u,B,v]];F,G=closest(A,u,B,v);n,d=through(B,F,G);expected=s.simplify((n.dot(A)-d)**2/n.dot(n))
            equal('special plane distance squared',distance_value(part)**2,expected);rounded=re.search(r'\\approx\s*([0-9.]+)',ans);truth('three-decimal special distance',f'{math.sqrt(float(expected)):.3f}'==rounded[1]);return True
    return False

owner=None
if args.owner:
    source=Path(args.owner);owner=json.loads(source.read_text(encoding='utf-8-sig'))
    truth('owner source hash',hashlib.sha256(source.read_bytes()).hexdigest()==pack['source']['sha256'])
    original={str(q['id']):q for l in owner['lessons'] for q in l['questions']}
def digest(q):return hashlib.sha256('\0'.join([q['title'],q['prompt_html'],q['answer_html'],q['solution_html'],q['hint_html'],str(q['marks'])]).encode()).hexdigest()

for row in fixtures:
    current=row['id'];q=next(q for q in pack['questions'] if q['id']==row['uid'])
    truth('content binding',digest(q)==row['contentSha256'])
    truth('complete part and criterion marks',sum(p['marks'] for p in row['parts'])==q['marks'] and all(sum(c['marks'] for c in p['criteria'])==p['marks'] for p in row['parts']))
    if owner:
        old=original[current];refs={im['source_name']:'/api/files/'+im['file_id'] for im in audit['images'] if im['question_uid']==q['id']}
        def normalise(v):
            for before,after in refs.items():v=v.replace(before,after)
            return v
        truth('source keys and text unchanged except image URLs',all(q[new]==normalise(old[key]) for new,key in [('prompt_html','question_html'),('answer_html','answer_html'),('solution_html','solution_html'),('hint_html','hint_html')]) and row['parts']==old['parts'])
    try:C0=model(row)
    except Exception as error:errors.append(dict(id=current,phase='model',error=str(error)));continue
    for index,part in enumerate(row['parts']):
        try:
            C=context_part(C0,current,index);P=C['points'];planes=C['planes'];lines=C['lines'];text=part['prompt_html'];ans=part['answer_html'];vs=vectors(ans);eqs=eq_planes(ans);done=False
            # Every written plane answer is compared with a plane derived from its statement.
            if special_owner(row,index,part,C):continue
            if eqs and ('equation' in text or 'planes' in text or 'locus' in text or 'Find the plane' in text):
                if len(eqs)==2 and current!='4209' and 'Pi1' in planes and 'Pi2' in planes:
                    for actual,expected in zip(eqs,[planes['Pi1'],planes['Pi2']]):same_plane('Cartesian plane',actual,expected)
                elif current=='4209' and index==1:
                    N,D=planes['Pi1'];n,d=planes['Pi2'];expected=[(N/N.norm()+n/n.norm(),D/N.norm()+d/n.norm()),(N/N.norm()-n/n.norm(),D/N.norm()-d/n.norm())]
                    truth('both equidistance planes',len(eqs)==2)
                    for actual in eqs:
                        candidates=[value for value in expected if s.simplify(actual[0].cross(value[0]))==M([0,0,0])]
                        same_plane('equal-distance plane',actual,candidates[0])
                else:same_plane('Cartesian plane',eqs[0],plane_for(text,C))
                done=True
            if 'angle' in text and ('degrees' in text or 'decimal place' in text):
                angle_check(part,C);done=True
            if 'points' in text and 'perpendicular to both lines' in text:
                F,G=closest(*lines[0],*lines[1]);equal('first complete foot',vs[0],F);equal('second complete foot',vs[1],G)
                if 'vector equation' in text:line_equal('common perpendicular',tuple(vs[-2:]),(F,G-F))
                done=True
            elif ('common perpendicular' in text and 'equation' in text) and vs:
                F,G=closest(*lines[0],*lines[1]);line_equal('common perpendicular',tuple(vs[-2:]),(F,G-F));done=True
            if 'skew' in text and 'distance' in text:
                A,u=lines[0];B,v=lines[1];normal=u.cross(v);truth('nonparallel directions',normal.dot(normal)!=0);truth('noncoplanar connector',(B-A).dot(normal)!=0)
                equal('squared shortest distance',distance_value(part)**2,s.simplify((B-A).dot(normal)**2/normal.dot(normal)));done=True
            if 'distance between' in text and 'function' in text:
                A,u=lines[0];B,v=lines[1];normal=u.cross(v);equal('full distance function squared',distance_value(part)**2,s.simplify((B-A).dot(normal)**2/normal.dot(normal)));done=True
            if 'all real values' in text or ('all values' in text and 'distance' in text) or ('every possible' in text):
                distance_roots(part,C,a if current in ['4205','4212'] else t,current in ['4205','4212']);done=True
            if 'triangle' in text and ('area' in text):
                if current=='6315':A=P['A'];B=P['F'];D=P['G']
                elif 'OAB' in text:A=P['O'];B=P['A'];D=P['B']
                else:A=P['A'];B=P['B'];D=P['C']
                candidates=[expr(v.split('=')[-1]) for v in blocks(ans) if '=' in v and r'\begin' not in v]
                equal('triangle area squared',candidates[0]**2,(B-A).cross(D-A).dot((B-A).cross(D-A))/4);done=True
            if 'volume' in text:
                A=P['A'] if current=='6315' else P['O'];B=P['F'] if current=='6315' else P['A'];D=P['G'] if current=='6315' else P['B'];E=P['B'] if current=='6315' else P['C']
                equal('tetrahedron volume squared',distance_value(part,'V')**2,((B-A).cross(D-A).dot(E-A)/6)**2);done=True
            if ('foot of the perpendicular' in text or 'foot of this perpendicular' in text) and current not in ['6290']:
                point=point_from(text,C)
                if current in ['4173','4281']:
                    H=foot_line(point,*lines[0]) if current!='4281' else foot_line(lines[1][0],*lines[0])
                else:H=foot_plane(point,*plane_for(text,C))
                equal('complete perpendicular foot',vs[0],H)
                if 'reflection' in text:equal('complete reflected point',vs[1],2*H-point)
                if 'distance' in text:equal('squared foot distance',distance_value(part)**2,(point-H).dot(point-H))
                done=True
            if 'reflection of' in text and 'equation' in text:
                n,d=plane_for(text,C);A,u=lines[0];anchor=2*foot_plane(A,n,d)-A;direction=u-2*u.dot(n)/n.dot(n)*n
                line_equal('reflected whole line',tuple(vs[-2:]),(anchor,direction));done=True
            if 'projection of' in text and 'equation' in text:
                n,d=plane_for(text,C);A,u=lines[0];direction=u-u.dot(n)/n.dot(n)*n;truth('projection is a genuine line',direction.dot(direction)!=0)
                line_equal('projected whole line',tuple(vs[-2:]),(foot_plane(A,n,d),direction));done=True
            if 'line of intersection' in text:
                N,D=planes['Pi1'] if 'Pi1' in planes else planes['Pi'];n,d=planes['Pi2'] if 'Pi2' in planes else planes['Sigma']
                A,u=tuple(vs[-2:]);truth('independent plane normals',N.cross(n).dot(N.cross(n))!=0)
                equal('intersection anchor on first plane',N.dot(A),D);equal('intersection anchor on second plane',n.dot(A),d);equal('intersection direction in first plane',N.dot(u),0);equal('intersection direction in second plane',n.dot(u),0);done=True
            if 'two-parameter form' in text:
                n,d=plane_for(text,C);A,u,v=vs[-3:];truth('independent plane directions',u.cross(v).dot(u.cross(v))!=0);equal('plane anchor',n.dot(A),d);equal('first plane direction',n.dot(u),0);equal('second plane direction',n.dot(v),0);done=True
            if ('point where' in text or 'where' in text and 'meets' in text) and vs and not done:
                if 'OD' in text:A,u=P['O'],P['D']
                elif current=='6563':A,u=P['P'],C['mats'][-1]
                else:A,u=lines[0]
                n,d=plane_for(text,C);X=A+(d-n.dot(A))/n.dot(u)*u
                equal('complete line-plane crossing',vs[0],s.simplify(X));truth('unique line-plane crossing',s.simplify(n.dot(u))!=0);done=True
            if ('perpendicular distance' in text or 'shortest distance' in text) and not done:
                point=point_from(text,C)
                target=re.search(r'to\s*\\\((AB|AC|BC|ON|l_1|l)\\\)',text)
                if target:
                    name=target[1]
                    if name.startswith('l'):A,u=lines[0]
                    else:A=P[name[0]];u=P[name[1]]-A
                    value=(point-foot_line(point,A,u));value=value.dot(value)
                else:
                    n,d=plane_for(text,C);value=s.simplify((n.dot(point)-d)**2/n.dot(n))
                equal('exact perpendicular distance squared',distance_value(part)**2,value);done=True
            # Explicit cases below cover parameter branches and whole families.
            if not done:unhandled.append(dict(id=current,part=chr(97+index),prompt=html.unescape(re.sub('<[^>]*>',' ',text)),answer=ans))
        except Exception as error:errors.append(dict(id=current,part=chr(97+index),error=str(error)))

# Complete quick answers, recomputed from their statement-bound input fixtures.
def plain(value):return s.sympify(value,locals=symbols)
def vector(value):return M([plain(v) for v in value])
quick_rows=json.loads((root/'vectors-quick-verification-v1.json').read_text(encoding='utf8'))
for row in quick_rows:
    current=row['uid'];question=next(q for q in pack['questions'] if q['id']==current);ref=row['reference'];ans=row['answers'];kind=ref['kind']
    truth('quick content binding',digest(question)==row['contentSha256'])
    def value(key):return plain(ans[key])
    def coords_key(prefix):return M([value(prefix+str(i)) for i in range(1,4)])
    def set_key(key):return [plain(v) for v in ans[key].strip('{}').split(',')]
    if kind=='cross':
        U=vector(ref['u']);V=vector(ref['v']);expected=M([U[1]*V[2]-U[2]*V[1],U[2]*V[0]-U[0]*V[2],U[0]*V[1]-U[1]*V[0]])
        equal('all oriented components',coords_key('component'),expected)
    elif kind=='triangle':
        A,B,C=[vector(ref[c]) for c in ['A','B','C']];U=B-A;V=C-A;gram=U.dot(U)*V.dot(V)-U.dot(V)**2
        equal('triangle area squared',value('area')**2,gram/4);equal('corresponding altitude squared',value('height')**2,gram/U.dot(U))
    elif kind=='coplanarity-volume':
        A,B,C,D=[vector(ref[c]) for c in ['A','B','C','D']];N=(B-A).cross(C-A)
        all_roots('coplanarity parameter',[value('parameter')],s.solve((D-A).dot(N),k))
        equal('volume at prescribed parameter squared',value('volume')**2,((D.subs(k,ref['volumeK'])-A).dot(N)/6)**2)
    elif kind=='point-line':
        A,U,P=[vector(ref[c]) for c in ['a','u','P']];H=coords_key('foot')
        equal('foot on original line',(H-A).cross(U),M([0,0,0]));equal('perpendicular foot',(P-H).dot(U),0);equal('full distance squared',value('distance')**2,(P-H).dot(P-H))
    elif kind=='skew-distance':
        A,U,B,V=[vector(ref[c]) for c in ['a','u','b','v']];F,G=closest(A,U,B,V)
        equal('independent foot-based distance squared',value('distance')**2,(F-G).dot(F-G))
    elif kind=='closest':
        A,U,B,V=[vector(ref[c]) for c in ['a','u','b','v']];F,G=coords_key('first'),coords_key('second')
        equal('first full point membership',(F-A).cross(U),M([0,0,0]));equal('second full point membership',(G-B).cross(V),M([0,0,0]));equal('first perpendicularity',(G-F).dot(U),0);equal('second perpendicularity',(G-F).dot(V),0);truth('unique closest pair',U.cross(V).dot(U.cross(V))!=0)
    elif kind=='plane':
        N=M([1,value('coef_b'),value('coef_c')]);D=value('constant')
        for name in ['A','B','C']:equal('complete plane contains '+name,N.dot(vector(ref[name])),D)
    elif kind=='line-plane':
        A,U,N=[vector(ref[c]) for c in ['a','u','n']];X=coords_key('point');D=plain(ref['d'])
        equal('crossing point on line',(X-A).cross(U),M([0,0,0]));equal('crossing point on plane',N.dot(X),D);truth('unique crossing',N.dot(U)!=0)
    elif kind=='planes-line':
        A,U=coords_key('anchor'),coords_key('direction')
        for i in [1,2]:
            N=vector(ref['n'+str(i)]);D=plain(ref['d'+str(i)]);equal('anchor on plane '+str(i),N.dot(A),D);equal('direction on plane '+str(i),N.dot(U),0)
        equal('requested anchor normalisation',A[2],0);equal('requested direction normalisation',U[2],1)
    elif kind=='point-plane':
        P,N=vector(ref['P']),vector(ref['n']);H=coords_key('foot');D=plain(ref['d'])
        equal('foot lies on plane',N.dot(H),D);equal('removed normal component',(P-H).cross(N),M([0,0,0]));equal('full plane distance squared',value('distance')**2,(P-H).dot(P-H))
    elif kind=='angles':
        U,N,V=[vector(ref[c]) for c in ['u','n','m']]
        equal('line-plane sine squared',value('sine')**2,U.dot(N)**2/(U.dot(U)*N.dot(N)));equal('plane-plane cosine squared',value('cosine')**2,N.dot(V)**2/(N.dot(N)*V.dot(V)));truth('nonnegative smaller-angle ratios',value('sine')>=0 and value('cosine')>=0)
    elif kind=='reflection-projection':
        P,N,U=[vector(ref[c]) for c in ['P','n','u']];R,W=coords_key('reflection'),coords_key('projected');D=plain(ref['d'])
        equal('reflection midpoint on plane',N.dot((R+P)/2),D);equal('reflection normal displacement',(R-P).cross(N),M([0,0,0]));equal('projected vector in plane',N.dot(W),0);equal('removed vector normal component',(U-W).cross(N),M([0,0,0]))
    elif kind=='line-plane-family':
        A,U,N=[vector(ref[c]) for c in ['a','u','n']];D=plain(ref['d']);coef=s.factor(U.dot(N));residual=s.factor(A.dot(N)-D);exceptions=s.solve(coef,k)
        all_roots('all contained values',set_key('contained'),[v for v in exceptions if residual.subs(k,v)==0]);all_roots('all parallel disjoint values',set_key('parallel'),[v for v in exceptions if residual.subs(k,v)!=0])
    elif kind=='distance-roots':
        P,N=vector(ref['P']),vector(ref['n']);D=plain(ref['d']);target=plain(ref['target'])
        all_roots('both sides of plane',set_key('values'),s.solve((N.dot(P)-D)**2-target**2*N.dot(N),k))
    elif kind=='parallel-exception':
        A,U,B,V=[vector(ref[c]) for c in ['a','u','b','v']];N=U.cross(V);exception=value('parallel')
        equal('parallel at stated value',N.subs(k,exception),M([0,0,0]));equal('nonparallel distance squared',value('otherwise')**2,s.cancel((B-A).dot(N)**2/N.dot(N)))
        equal('parallel distance squared',value('at_parallel')**2,(B-foot_line(B,A,U)).dot(B-foot_line(B,A,U)))
    elif kind=='principle':truth('reviewed geometric choice',ans['choice']==ref['correct'])
    else:errors.append(dict(id=current,phase='quick',error='Unknown quick model '+kind))

# Explicit independently calculated references for all 20 authored examples.
def V(*values):return M(list(values))
current='E-P1';U=V(2,1,-1);W=V(1,-2,3);equal('oriented product',U.cross(W),V(1,-7,-5));equal('magnitude squared',U.cross(W).dot(U.cross(W)),75)
current='E-P2';A=V(1,0,2);B=V(3,1,2);C=V(2,-1,4);cross=(B-A).cross(C-A);equal('area squared',cross.dot(cross)/4,s.Rational(29,4));equal('altitude squared',cross.dot(cross)/(B-A).dot(B-A),s.Rational(29,5))
current='E-P3';A=V(0,1,0);B=V(1,1,1);C=V(0,2,1);D=V(k,0,2);all_roots('coplanarity',[s.Integer(3)],s.solve((D-A).dot((B-A).cross(C-A)),k))
current='E-P4';equal('derived tetrahedron volume',abs(V(2,0,0).cross(V(0,3,0)).dot(V(1,1,4)))/6,4)
current='E-L1';equal('all coordinates at one parameter',V(2,-1,3)+2*V(3,2,-1),V(8,3,1))
current='E-L2';H=foot_line(V(4,1,5),V(1,-1,2),V(1,2,2));equal('complete foot',H,V(s.Rational(22,9),s.Rational(17,9),s.Rational(44,9)));equal('distance squared',(V(4,1,5)-H).dot(V(4,1,5)-H),s.Rational(29,9))
current='E-L3';F,G=closest(V(1,0,0),V(1,1,0),V(0,2,3),V(1,-1,0));equal('first foot',F,V(s.Rational(3,2),s.Rational(1,2),0));equal('second foot',G,V(s.Rational(3,2),s.Rational(1,2),3));equal('distance squared',(F-G).dot(F-G),9)
current='E-L4';F=foot_line(V(1,3,0),V(0,1,0),V(1,0,1));equal('parallel foot',F,V(s.Rational(1,2),1,s.Rational(1,2)));equal('parallel distance squared',(V(1,3,0)-F).dot(V(1,3,0)-F),s.Rational(9,2))
current='E-N1';n=V(1,-1,1)
for point in [V(1,0,2),V(2,1,2),V(1,1,3)]:equal('defining point lies on plane',n.dot(point),3)
current='E-N2';equal('two-parameter normal',V(1,1,0).cross(V(0,1,2)),V(2,-2,1));equal('plane constant',V(2,-2,1).dot(V(0,2,1)),-3)
current='E-N3'
for N,D in [(V(1,1,1),4),(V(1,-1,1),2)]:equal('line anchor in plane',N.dot(V(0,1,3)),D);equal('line direction in plane',N.dot(V(1,0,-1)),0)
current='E-N4';X=V(2,0,1)-V(1,2,-1);equal('crossing point',X,V(1,-2,2));equal('crossing plane membership',V(1,-1,1).dot(X),5)
current='E-D1';H=foot_plane(V(5,1,2),V(2,-1,2),4);equal('foot',H,V(3,2,0));equal('reflection',2*H-V(5,1,2),V(1,3,-2));equal('distance squared',(H-V(5,1,2)).dot(H-V(5,1,2)),9)
current='E-D2';truth('line-plane angle rounding',f'{math.degrees(math.asin(4/9)):.1f}'=='26.4');truth('plane-plane angle rounding',f'{math.degrees(math.acos(1/(3*math.sqrt(2)))):.1f}'=='76.4')
current='E-D3';U=V(1,2,2);N=V(2,-1,2);equal('whole projected direction',U-U.dot(N)/N.dot(N)*N,V(s.Rational(1,9),s.Rational(22,9),s.Rational(10,9)))
current='E-D4';same_plane('point equidistance plane',plane(V(3,2,0)-V(1,0,0),(V(3,2,0)+V(1,0,0))/2),(V(1,1,0),s.Integer(3)));same_plane('first plane bisector',(V(1,1,0)-V(1,-1,0),s.Integer(2)),(V(0,1,0),s.Integer(1)));same_plane('second plane bisector',(V(1,1,0)+V(1,-1,0),s.Integer(4)),(V(1,0,0),s.Integer(2)))
current='E-T1';coef=k*(k-2);res=k;all_roots('both exceptional values',[s.Integer(0),s.Integer(2)],s.solve(coef,k));equal('contained residual',res.subs(k,0),0);truth('parallel disjoint residual',res.subs(k,2)!=0);equal('finite omitted ordinate',(-1/(k-2)).subs(k,0),s.Rational(1,2));equal('limiting omitted ordinate',s.limit(-1/(k-2),k,s.oo),0)
current='E-T2';all_roots('both distance roots',[s.Integer(-4),s.Integer(8)],s.solve((k-2)**2-36,k))
current='E-T3';A=V(0,0,0);U=V(1,0,0);B=V(0,2,1);W=V(1,k,0);N=U.cross(W);equal('nonparallel distance squared',s.cancel(B.dot(N)**2/N.dot(N)),1);equal('parallel distance squared',(B-foot_line(B,A,U)).dot(B-foot_line(B,A,U)),5)
current='E-T4';N=V(k-1,1,1);n=V(1,1,1);equal('shared intersection anchor',N.dot(V(0,2,0)),2);equal('shared intersection direction',N.dot(V(0,-1,1)),0);equal('coincident normals',N.subs(k,2),n);truth('otherwise independent normals',s.solve(list(N.cross(n)),k)=={k:2})
for lesson in pack['lessons']:
    current=lesson['id'];truth('teaching content binding',hashlib.sha256(json.dumps(lesson,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()==audit['teachingDigests'][lesson['id']])
example_codes={e['verification'] for l in pack['lessons'] for e in l['examples']}
truth('all example references checked',example_codes<={r['id'] for r in log})
truth('all owner statements checked',{r['id'] for r in fixtures}<={r['id'] for r in log})
result=dict(ownerTasks=84,examples=20,quickChecks=40,solutionDiagrams=8,checks=len(log),failures=failures,errors=errors,unhandled=unhandled,log=log,limitations=['Exact geometry checks are tied to the actual content by hashes. REVIEWED records identify converse and completeness arguments separately.','These checks do not replace external peer review of the prose. Written solutions remain paper self-study with indicative DRAFT guidance.','Quick checks use complete coordinate fields or explicitly normalised coefficients, not a general parser for arbitrary three-variable vector equations.'])
Path(args.report).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(json.dumps(dict(checks=len(log),failures=len(failures),errors=len(errors),unhandled=len(unhandled))))
if failures or errors or unhandled:raise SystemExit(1)
