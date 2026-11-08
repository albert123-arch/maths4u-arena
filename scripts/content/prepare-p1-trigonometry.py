"""Build an immutable site projection. Never edit the owner's offline bank/book."""
import argparse, hashlib, json, math, re, xml.etree.ElementTree as ET
from pathlib import Path
from p1_trigonometry_teaching import lessons, questions, models

ap=argparse.ArgumentParser()
ap.add_argument('--source', default=r'E:\my folder\questions_data\original\Pure1 9709\05_Trigonometry\bank_9709_p1_trigonometry.json')
ap.add_argument('--book', default=r'D:\new_books\9709 cambridge\pure1.pdf')
args=ap.parse_args()
source=Path(args.source); bank=json.loads(source.read_text('utf-8-sig'))
sha=hashlib.sha256(source.read_bytes()).hexdigest()
assert len(bank['questions'])==200 and sum(q['variant_index']==0 for q in bank['questions'])==50
assert len(questions)==40 and len(lessons)==5

# Independent teaching vector; no book figure or source-question artwork.
xx=lambda t:60+520*t/(2*math.pi)
yy=lambda v:160-90*v
curve=' '.join(('M' if i==0 else 'L')+f'{xx(i*2*math.pi/240):.3f},{yy(math.cos(i*2*math.pi/240)):.3f}' for i in range(241))
alpha=math.acos(1/3)
svg=f'''<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360" role="img" aria-labelledby="title desc">
<title id="title">A quadratic selects two cosine levels</title><desc id="desc">The cosine levels one third and minus one give angles alpha, pi and two pi minus alpha on a full half-open cycle.</desc>
<rect width="640" height="360" fill="white"/>
<text x="320" y="27" text-anchor="middle" font-family="Arial" font-size="19" fill="#172c43">Two ratio roots give three angles</text>
<path d="M60,60 V280 M50,160 H590" stroke="#65768c" stroke-width="1.5" fill="none"/>
<path d="M60,130 H580 M60,250 H580" stroke="#9d3a58" stroke-width="1.3" stroke-dasharray="6 5" fill="none"/>
<path d="{curve}" stroke="#007c78" stroke-width="2.8" fill="none"/>
<g font-family="Arial" font-size="16" fill="#172c43">
<text x="45" y="75" text-anchor="end">1</text><text x="45" y="135" text-anchor="end">1/3</text><text x="45" y="255" text-anchor="end">−1</text>
<text x="60" y="181" text-anchor="middle">0</text><text x="320" y="181" text-anchor="middle">π</text><text x="580" y="181" text-anchor="middle">2π</text>
<text x="{xx(alpha):.3f}" y="112" text-anchor="middle">α</text><text x="{xx(2*math.pi-alpha):.3f}" y="112" text-anchor="middle">2π − α</text>
<text x="565" y="70" text-anchor="end">y = cos x</text><text x="320" y="316" text-anchor="middle">cos x = 1/3 or cos x = −1</text>
<text x="320" y="342" text-anchor="middle">α = cos⁻¹(1/3),  0 ≤ x &lt; 2π</text></g>
<g fill="#174e90"><circle cx="{xx(alpha):.3f}" cy="130" r="4"/><circle cx="320" cy="250" r="4"/><circle cx="{xx(2*math.pi-alpha):.3f}" cy="130" r="4"/></g></svg>'''
figure=Path('public/assets/original/trigonometry/cosine-levels.svg');figure.parent.mkdir(parents=True,exist_ok=True);figure.write_text(svg+'\n',encoding='utf-8')
target=Path('content/original/9709-p1'); target.mkdir(parents=True,exist_ok=True)
media=target/'trigonometry';media.mkdir(exist_ok=True)
assets=[]; mapping=[]
# Primary method of each complete written task; combinations need later chapter skills too.
groups={'graphs':set(range(1,11)),'ratios':set(range(11,21)),'quadratics':set(range(21,31)),'identities':set(range(31,41)),'equations':set(range(41,51))}
assert set.union(*groups.values())==set(range(1,51)) and sum(map(len,groups.values()))==50
for raw in bank['questions']:
    num=raw['number'];key=next(k for k,nums in groups.items() if num in nums)
    uid=raw['content_uid']; per=[]
    for image in raw['images']:
        relative=Path(image['path']);assert not relative.is_absolute() and '..' not in relative.parts
        src=source.parent/('public' if image['role'].lower()=='question' else 'teacher')/relative;data=src.read_bytes()
        # Original vectors are retained; their immutable bytes are checked at apply.
        h=hashlib.sha256(data).hexdigest();root=ET.fromstring(data)
        width,height=int(root.attrib['width']),int(root.attrib['height'])
        path=media/(h+'.svg');path.write_bytes(data)
        a=dict(question_uid=uid,file_id='pkg_tr_'+h,path=path.as_posix(),sha256=h,size=len(data),width=width,height=height,mime='image/svg+xml',role='STATEMENT' if image['role']=='question' else 'SOLUTION',caption=image['alt'])
        assets.append(a);per.append(a)
    figures=lambda role:''.join('<p><img src="/api/files/'+a['file_id']+'" width="'+str(a['width'])+'" height="'+str(a['height'])+'" alt="'+a['caption']+'"></p>' for a in per if a['role']==role)
    # Normalise only layout: one alphabetical list and marks aligned with each part.
    prompt=raw['stem_html']+figures('STATEMENT')+'<ol class="parts" type="a">'+''.join('<li>'+p['question_html']+'<span class="marks">['+str(p['marks'])+']</span></li>' for p in raw['parts'])+'</ol>'
    parts=[dict(label=p['label'],marking_criteria=[dict(code=c['code'],marks=c['marks'],description_html=c['description_html'],**({'guidance_html':'Accept correct follow-through from an earlier part where the stated criterion allows it.'} if c.get('follow_through') else {})) for c in p['criteria']]) for p in raw['parts']]
    q=dict(id=uid,family_uid=raw['question_family_id'],lesson=key,title=raw['title'],collection='exam',variant_index=raw['variant_index'],prompt_html=prompt,answer_html=raw['answer_html'],solution_html=raw['solution_html']+figures('SOLUTION'),hint_html=raw['hint_html'],marks=raw['marks'],difficulty={'foundation':1,'standard':2,'demanding':3,'challenge':4}[raw['difficulty']],fields=[],parts=parts,verification='OWNER-BANK-'+uid,provenance=dict(original_id=str(raw['provenance']['source_problem_id']),original_uid=raw['provenance']['source_uid'],archiveTaskId='',sourceSha256=sha,ownerProvenance=raw['provenance']))
    questions.append(q)
    digest=lambda text:hashlib.sha256(text.encode('utf-8')).hexdigest()
    triples=[[[c['code'],c['marks'],c['description_html']] for c in p['criteria']] for p in raw['parts']]
    mapping.append(dict(uid=uid,number=num,variant=raw['variant_index'],lesson=key,sourceUid=raw['provenance']['source_uid'],marks=raw['marks'],answerSha256=digest(raw['answer_html']),solutionSha256=digest(raw['solution_html']),hintSha256=digest(raw['hint_html']),criteriaSha256=digest(json.dumps(triples,ensure_ascii=False,separators=(',',':')))))

pack=dict(schema_version=1,key='9709-p1-trigonometry',version='1.0.1',course=dict(slug='maths4u-9709-p1',title='Pure Mathematics 1 (9709)',code='9709',direction='a-level'),chapter=dict(id='orig_9709_p1_trigonometry',slug='trigonometry',title='Trigonometry',position=4),source=dict(sha256=sha,supplied=200,held=[]),lessons=lessons,questions=questions,marking_status='DRAFT',assets=assets)
def write(path,data):Path(path).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
write(target/'trigonometry-v1.json',pack)
write(target/'trigonometry-math-models.json',models)
write('docs/ARENA-9709-P1-TRIGONOMETRY-SOURCE-AUDIT-20261108.json',dict(source=str(source),sha256=sha,book=dict(path=args.book,sha256=hashlib.sha256(Path(args.book).read_bytes()).hexdigest(),title='Cambridge International AS & A Level Mathematics: Pure Mathematics 1',author='Sue Pemberton',publisher='Cambridge University Press',year=2018,printed_pages='116–154',pdf_pages='128–166',sections=[dict(section='5.1–5.3 and 5.5',lesson='ratios'),dict(section='5.4',lesson='graphs'),dict(section='5.7',lesson='identities'),dict(section='5.6 and 5.8',lesson='equations'),dict(section='5.8',lesson='quadratics')],policy='Book informs the topic sequence and methods. Teaching prose, numerical examples and quick checks are independently written; no book images or exercise text are reproduced.'),syllabus=bank['syllabus_check'],mapping=mapping,assets=len(assets)))
print(json.dumps(dict(lessons=5,examples=20,quick=40,exam=200,main=50,analogues=150,svg=len(assets))))
