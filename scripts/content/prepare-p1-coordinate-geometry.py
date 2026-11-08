"""Build an immutable site projection. Never edit the owner's offline bank/book."""
import argparse, hashlib, json, re, xml.etree.ElementTree as ET
from pathlib import Path
from p1_coordinate_geometry_teaching import lessons, questions, models

ap=argparse.ArgumentParser()
ap.add_argument('--source', default=r'E:\my folder\questions_data\original\Pure1 9709\03_Coordinate_Geometry\bank_9709_p1_coordinate_geometry.json')
ap.add_argument('--book', default=r'D:\new_books\9709 cambridge\pure1.pdf')
args=ap.parse_args()
source=Path(args.source); bank=json.loads(source.read_text('utf-8-sig'))
sha=hashlib.sha256(source.read_bytes()).hexdigest()
assert len(bank['questions'])==200 and sum(q['variant_index']==0 for q in bank['questions'])==50
assert len(questions)==40 and len(lessons)==5
target=Path('content/original/9709-p1'); target.mkdir(parents=True,exist_ok=True)
media=target/'coordinate-geometry';media.mkdir(exist_ok=True)
assets=[]; mapping=[]
# Primary method of each complete written question; other chapter skills also occur.
groups={'distance':{5,7,9,10,11,12,20,42,43,46},'directions':{1,2,3,8,15,21,22,26,28,34},'lines':{24,25,27,29,30,31,35,38,39,45},'circles':{4,6,16,23,32,36,41,44,47,48},'intersections':{13,14,17,18,19,33,37,40,49,50}}
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
        a=dict(question_uid=uid,file_id='pkg_cg_'+h,path=path.as_posix(),sha256=h,size=len(data),width=width,height=height,mime='image/svg+xml',role='STATEMENT' if image['role']=='question' else 'SOLUTION',caption=image['alt'])
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

pack=dict(schema_version=1,key='9709-p1-coordinate-geometry',version='1.0.0',course=dict(slug='maths4u-9709-p1',title='Pure Mathematics 1 (9709)',code='9709',direction='a-level'),chapter=dict(id='orig_9709_p1_coordinate_geometry',slug='coordinate-geometry',title='Coordinate Geometry',position=2),source=dict(sha256=sha,supplied=200,held=[]),lessons=lessons,questions=questions,marking_status='DRAFT',assets=assets)
def write(path,data):Path(path).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
write(target/'coordinate-geometry-v1.json',pack)
write(target/'coordinate-geometry-math-models.json',models)
write('docs/ARENA-9709-P1-COORDINATE-GEOMETRY-SOURCE-AUDIT-20261108.json',dict(source=str(source),sha256=sha,book=dict(path=args.book,sha256=hashlib.sha256(Path(args.book).read_bytes()).hexdigest(),title='Cambridge International AS & A Level Mathematics: Pure Mathematics 1',author='Sue Pemberton',publisher='Cambridge University Press',year=2018,printed_pages='70–94',pdf_pages='82–106',sections=[dict(section='3.1',lesson='distance'),dict(section='3.2',lesson='directions'),dict(section='3.3',lesson='lines'),dict(section='3.4',lesson='circles'),dict(section='3.5',lesson='intersections')],policy='Book informs the topic sequence and methods. Teaching prose, numerical examples and quick checks are independently written; no book images or exercise text are reproduced.'),syllabus=bank['syllabus_check'],mapping=mapping,assets=len(assets)))
print(json.dumps(dict(lessons=5,examples=20,quick=40,exam=200,main=50,analogues=150,svg=len(assets))))
