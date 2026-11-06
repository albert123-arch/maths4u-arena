"""Read geometry from owner statement fixtures, without trusting their answers."""
import re,html
from functools import lru_cache
import sympy as s
from sympy.parsing.latex import parse_latex
M=s.Matrix
x,y,z,t,k,p,q,a,b,lam,mu=s.symbols('x y z t k p q a b lambda mu',real=True)
symbols={str(v):v for v in [x,y,z,t,k,p,q,a,b,lam,mu]};symbols['pi']=s.pi
mat_pattern=r'\\begin\{pmatrix\}(.*?)\\end\{pmatrix\}'
def blocks(raw):return [a or b for a,b in re.findall(r'\\\[(.*?)\\\]|\\\((.*?)\\\)',html.unescape(raw),re.S)]
@lru_cache(None)
def expr(raw):
    raw=html.unescape(raw).replace(r'\left','').replace(r'\right','').replace(r'\dfrac',r'\frac').replace(r'\,','').replace(r'\!','').replace('−','-').strip().strip('.,;')
    raw=re.sub(r'\\frac\\pi([0-9])',r'\\frac{\\pi}{\1}',raw)
    raw=re.sub(r'\\frac([^{}\s\\])',r'\\frac{\1}',raw);raw=re.sub(r'(\\frac\{[^{}]*\})([A-Za-z0-9])',r'\1{\2}',raw);raw=re.sub(r'\\sqrt([0-9])',r'\\sqrt{\1}',raw)
    parsed=parse_latex(raw,strict=True)
    return parsed.xreplace({v:symbols.get(str(v),v) for v in parsed.atoms(s.Symbol)})
def vectors(raw):return [M([expr(v) for v in val.split(r'\\')]) for val in re.findall(mat_pattern,raw,re.S)]
def plane(n,point):return M(n),s.expand(M(n).dot(M(point)))
def through(A,B,C):return plane((B-A).cross(C-A),A)
def foot_line(P,A,u):return s.simplify(A+(P-A).dot(u)/u.dot(u)*u)
def foot_plane(P,n,d):return s.simplify(P-(n.dot(P)-d)/n.dot(n)*n)
def closest(A,u,B,v):
    P=A+lam*u;Q=B+mu*v;sol=s.solve([(Q-P).dot(u),(Q-P).dot(v)],[lam,mu])
    return s.simplify(P.subs(sol)),s.simplify(Q.subs(sol))
def line_meeting(A,u,B,v):
    sol=s.solve(list(A+lam*u-B-mu*v),[lam,mu],dict=True)
    if len(sol)!=1:return None
    return s.simplify(A+sol[0][lam]*u)
def intersection(N,D,n,d):
    direction=N.cross(n);sol=s.linsolve([N.dot(M([x,y,z]))-D,n.dot(M([x,y,z]))-d],[x,y,z])
    value=list(sol)[0];free=set().union(*(v.free_symbols for v in value));anchor=M(value).subs({v:0 for v in free})
    return anchor,direction
def cartesian(raw):
    raw=raw.split(':')[-1].strip()
    if '=' not in raw or not re.search(r'[xyz]',raw) or r'\mathbf' in raw:return None
    left,right=raw.split('=',1)
    try:
        poly=s.expand(expr(left)-expr(right))
        if not poly.free_symbols <= {x,y,z,k,t} or s.Poly(poly,x,y,z).total_degree()!=1:return None
        return M([poly.coeff(v) for v in [x,y,z]]),-poly.subs({x:0,y:0,z:0})
    except Exception:return None
def eq_planes(raw):return [plane for text in blocks(raw) if (plane:=cartesian(text)) is not None]
def scalar_answers(raw,key='d'):
    out=[]
    for text in blocks(raw):
        match=re.search(r'(?:^|[,\s])'+re.escape(key)+r'(?:\(t\))?\s*=\s*(.*)',text)
        if match:
            value=re.split(r'\\qquad|\\quad|\\approx|,',match[1])[0].strip()
            if r'\pm' in value:
                value=value.replace(r'\pm','').strip();out.extend([expr(value),-expr(value)]);continue
            try:out.append(expr(value))
            except Exception:pass
    return out
def roots_answer(raw,variable='t'):
    out=[]
    for text in blocks(raw):
        following=False
        for part in re.split(r'\\quad\\text\{or\}\\quad|\\quad\\text\{ or \}\\quad|\\quad|\\qquad|,',text):
            part=part.strip()
            if not part:continue
            if '=' in part:
                left,value=part.split('=',1)
                if left.strip()!=variable:following=False;continue
                following=True
            elif following:value=part
            else:continue
            try:
                values=[expr(value.replace(r'\pm','')),-expr(value.replace(r'\pm',''))] if r'\pm' in value else [expr(value)]
                out.extend(v for v in values if not v.free_symbols)
            except Exception:pass
    return out
def target_distance(raw):
    for text in blocks(raw):
        if r'\sqrt' in text or re.fullmatch(r'\d+',text.strip()):
            try:return expr(text)
            except Exception:pass
    return None
def substitute(v,values):
    if isinstance(v,tuple):return tuple(substitute(a,values) for a in v)
    return s.simplify(v.subs(values))

def model(row):
    uid=row['id'];raw=row['stem_html'];mats=vectors(raw);P={'O':M([0,0,0])};lines=[];vector_planes=[]
    for match in re.finditer(r'\\overrightarrow\{O([A-Z])\}\s*=\s*('+mat_pattern+')',raw,re.S):P[match[1]]=vectors(match[2])[0]
    for match in re.finditer(r'([A-Z])=\\left\((.*?)\\right\)',raw,re.S):
        vals=match[2].split(',')
        if len(vals)==3:P[match[1]]=M([expr(v) for v in vals])
    for letter in ['A','B','P','Q','D','C','R']:
        pattern=r'(?:[Pp]oint\s*\\\('+letter+r'\\\).*?(?:position vector|position vector of)|position vector of\s*\\\('+letter+r'\\\)\s*is)\s*\\\(\s*('+mat_pattern+')'
        match=re.search(pattern,raw,re.S)
        if match:P[letter]=vectors(match[1])[0]
    for text in blocks(raw):
        if re.search(r'\\mathbf\s*r\s*=',text):
            vs=vectors(text)
            if len(vs)==2:lines.append(tuple(vs))
            elif len(vs)==3:vector_planes.append(vs)
    if not lines and all(letter in P for letter in ['A','B','C']) and ('l_1=AB' in raw or 'l_1=AB' in raw.replace(' ','') or 'l_1=AB' in raw.replace(r'\(','')):
        lines=[(P['A'],P['B']-P['A']),(P['C'],P['D']-P['C']) if 'D' in P else (P['O'],P['C'])]
    if not lines and uid in ['4161','4168','4218','4287','5893','6277','6508']:
        lines=[(P['A'],P['B']-P['A']),(P['C'],P['D']-P['C']) if 'D' in P else (P['O'],P['C'])]
    planes={}
    for name in ['ABC','ABD','ACD','OAB','OBC']:
        if all(letter in P for letter in name):planes[name]=through(*(P[c] for c in name))
    raw_planes=eq_planes(raw)
    if vector_planes:
        for i,(anchor,u,v) in enumerate(vector_planes):planes['Pi1' if len(vector_planes)>1 or r'\Pi_1' in raw else 'Pi']=plane(u.cross(v),anchor)
        if raw_planes:planes['Pi2']=raw_planes[0]
    elif len(raw_planes)==1:planes['Pi']=raw_planes[0]
    else:
        for i,value in enumerate(raw_planes[:2]):planes['Pi'+str(i+1)]=value
        if uid=='4255':planes['Pi']=raw_planes[2]
    if len(lines)>=2:
        A,u=lines[0];B,v=lines[1];P.setdefault('A',A);P.setdefault('B',B)
        if s.simplify(u.cross(v).dot(u.cross(v)))!=0:
            P['F'],P['G']=closest(A,u,B,v)
        normal=u.cross(v)
        if uid in ['4133','4196']:planes['Pi']=plane(P['G']-P['F'],(P['G']+P['F'])/2)
        if uid in ['4142','4175','4258','4265']:planes['Pi1']=plane(normal,A)
        if uid=='4142':planes['Pi2']=plane(v.cross(P['C']-B),B)
        if uid=='4175':planes['Pi2']=plane(lines[2][1].cross(P['R']-lines[2][0]),lines[2][0])
        if uid in ['4156','4258']:planes.update(Pi1=plane(u.cross(normal),A),Pi2=plane(v.cross(normal),B))
        if uid in ['4181','4195']:planes['Pi']=plane(u.cross(P['C']-A),A)
        if uid in ['5842','6373','6384']:planes['Pi']=plane(v.cross(normal),B)
        if uid in ['4249','5865','6528','6542','6563']:planes['Pi']=plane(normal,A)
        if uid=='4272':planes.update(Pi1=plane(u.cross(P['C']-A),A),Pi2=plane(v.cross(u),B))
        if uid=='6326':planes['Pi']=plane(u,P['F'])
        if uid=='5812':planes['Pi']=plane(u.cross(mats[-1]),A)
        if uid=='4265':planes['Pi2']=(mats[-1],s.Integer(0))
    if uid=='4144':planes['Pi']=plane(lines[0][1].cross(mats[2]),lines[0][0]);lines.append((M([0,0,0]),mats[-1]))
    if uid=='4126':lines=[(M([0,0,0]),mats[-1])]
    if uid=='4150':planes['Pi']=plane(lines[0][1].cross(mats[2]),lines[0][0])
    if uid=='4122':planes['Sigma']=(mats[0],s.Integer(0))
    if uid in ['4122','4167']:
        N,D=planes['Pi1'];n,d=planes['Pi2']
        if uid=='4122':kv=s.solve((N+k*n).dot(planes['Sigma'][0]),k)[0]
        else:kv=[v for v in s.solve((N+k*n).dot(N)**2/N.dot(N)-(N+k*n).dot(n)**2/n.dot(n),k) if v>0][0]
        planes['PiK']=(N+kv*n,D+kv*d)
    if uid=='4173':
        anchor,u=intersection(*planes['Pi1'],*planes['Pi2']);lines=[(anchor,u)];P['H']=foot_line(P['O'],anchor,u);planes['Pi']=plane(u,P['H'])
    if uid=='4182':planes['Pi']=planes['ABC']
    if uid=='4187':P['A']=mats[-1];planes['Pi']=plane(mats[0].cross(mats[1]),P['A'])
    if uid=='4250':planes['Pi']=plane(P['P']-P['R'],(P['P']+P['R'])/2)
    if uid=='4255':
        u=mats[1];sol=s.solve([planes['Pi1'][0].dot(u),planes['Pi2'][0].dot(u)],[p,q]);lines=[(mats[0],u.subs(sol))]
    if uid in ['4205','4212']:P['P']=mats[-2]
    if uid=='4263':
        u=mats[0];rhs=mats[1];X,Y,Z=s.symbols('X Y Z');w=M([X,Y,Z]);sol=s.solve(list(w.cross(u)-rhs)+[w.dot(u)-33],[X,Y,Z]);P['W']=w.subs(sol);planes['Pi']=plane(P['W'],P['A'])
    if uid=='4270':planes['Pi']=plane(P['B']-P['A'],(P['A']+P['B'])/2)
    if uid=='6251':
        planes['Pi1']=plane((P['B']-P['A']).cross(mats[2]),P['A']);planes['Pi2']=plane(lines[0][1].cross(lines[1][1]),lines[0][0])
    if uid=='6266':
        anchor,u,v=vector_planes[0];P['A']=anchor;P['L']=4*anchor;P['M']=3*anchor;N,D=plane(u.cross(v),anchor);planes['Pi2']=(N,4*D);P['N']=foot_plane(P['O'],*planes['Pi2'])
    if uid=='6290':
        P['N']=foot_plane(P['O'],*planes['ABC']);P['P']=s.Rational(2,3)*P['N'];N,D=planes['OBC'];u=P['P']-P['A'];scale=s.solve(N.dot(P['A']+lam*u)-D,lam)[0];P['Q']=P['A']+scale*u;planes['ABQ']=through(P['A'],P['B'],P['Q'])
    if uid=='6474':planes['Sigma']=plane(lines[0][1].cross(vector_planes[0][0]-lines[0][0]),lines[0][0])
    if uid=='6326':planes['Sigma']=raw_planes[0]
    if uid=='4133':
        n,d=planes['Pi'];planes.update(Pi1=plane(n,lines[0][0]),Pi2=plane(n,lines[1][0]))
    if uid=='6266':planes['Pi']=planes['Pi2']
    if 'ABC' in planes and 'Pi' not in planes:planes['Pi']=planes['ABC']
    if uid in ['4120','4245','6339']:
        for part in row['parts']:
            if 'Let' in part['prompt_html'] and 'ABD' in part['prompt_html']:
                vals=[expr(v) for v in re.findall(r'\\\(t=(.*?)\\\)',part['prompt_html'])]
                for i,value in enumerate(vals):planes['Pi'+str(i+1)]=through(P['A'],P['B'],P['D'].subs(t,value))
    return dict(points=P,lines=lines,planes=planes,mats=mats,raw=raw)
