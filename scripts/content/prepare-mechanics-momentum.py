"""Project the owner's Momentum bank without changing the source or answer keys."""
import argparse,hashlib,json,re
from pathlib import Path
from mechanics_momentum_teaching import lessons,models as example_models,questions,quick_models

ap=argparse.ArgumentParser()
ap.add_argument('--source',required=True)
ap.add_argument('--mapping',required=True)
ap.add_argument('--assets',required=True)
args=ap.parse_args()
source=Path(args.source)
owner=json.loads(source.read_text(encoding='utf-8-sig'))
mapping=json.loads(Path(args.mapping).read_text(encoding='utf-8'))
media=json.loads(Path(args.assets).read_text(encoding='utf-8'))
media=media.get('assets',media)
source_sha=hashlib.sha256(source.read_bytes()).hexdigest()
assert source_sha==mapping['sourceSha256']==media['sourceSha256']
originals=[q for l in owner['lessons'] for q in l['questions']]
assert len(originals)==39 and sum(len(q['parts']) for q in originals)==91
assert sum(q['marks'] for q in originals)==307
assert len(questions)==32 and len(lessons)==4

def digest(value):
    return hashlib.sha256(json.dumps(value,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()

def lesson_key(q):
    topic=q['topic']
    if topic in ['Direct impact and energy','Impulse and restitution']:return 'direct'
    if topic in ['Impacts with fixed surfaces','Impact and projectile motion','Geometry of successive impacts']:return 'surfaces'
    if topic in ['Chains of direct impacts','Repeated impacts with a wall']:return 'successive'
    assert topic=='Oblique sphere–sphere impacts',repr(topic)
    return 'spheres'

archive={r['id']:r for r in mapping['rows']}
assert len(archive)==39
assets=[{k:v for k,v in a.items() if k not in ['source_name','source_sha256','bank_number']} for a in media['images']]
assert len(assets)==16

def rewrite(value,q):
    for asset in media['images']:
        if asset['question_uid']==q['content_uid']:
            value=value.replace(asset['source_name'],'/api/files/'+asset['file_id'])
    return value

rows=[]
fixtures=[]
for original in originals:
    row=archive[original['id']]
    assert row['uid']==original['content_uid']
    assert str(original['provenance']['source_id'])==row['original_id']
    assert original['provenance']['source_uid']==row['original_uid']
    parts=[dict(label=chr(97+i),marking_criteria=[dict(code='',marks=c['marks'],description_html=c['criterion_html']) for c in part['criteria']]) for i,part in enumerate(original['parts'])]
    figures=''.join(re.findall(r'<figure\b[^>]*>[\s\S]*?</figure>',original['question_html']))
    expected_figures=sum(a['question_uid']==original['content_uid'] and a['role']=='STATEMENT' for a in assets)
    assert figures.count('<img')==expected_figures
    prompt=original['stem_html']+figures+'<ol class="parts" type="a">'+''.join('<li>'+part['prompt_html']+'<span class="marks">['+str(part['marks'])+']</span></li>' for part in original['parts'])+'</ol>'
    q=dict(id=original['content_uid'],family_uid=original['content_uid'],lesson=lesson_key(original),title=original['title'],collection='exam',prompt_html=rewrite(prompt,original),answer_html=rewrite(original['answer_html'],original),solution_html=rewrite(original['solution_html'],original),hint_html=rewrite(original['hint_html'],original),marks=original['marks'],difficulty=original['difficulty'],fields=[],parts=parts,verification='OWNER-'+str(original['bank_number']),provenance=dict(original_id=row['original_id'],original_uid=row['original_uid'],archiveTaskId=row['archiveTaskId'],sourceSha256=source_sha,ownerProvenance=original['provenance']))
    assert not any('\ufffd' in str(q[field]) for field in ['title','prompt_html','answer_html','solution_html','hint_html'])
    questions.append(q)
    rows.append({**row,'lesson':q['lesson'],'marks':q['marks'],'contentSha256':digest(q)})
    fixtures.append(dict(uid=q['id'],bank_number=original['bank_number'],original=original,contentSha256=digest(q)))

for model in quick_models:
    model['contentSha256']=digest(next(q for q in questions if q['id']==model['uid']))
for model in example_models:
    model['contentSha256']=digest(next(e for l in lessons for e in l['examples'] if e['verification']==model['id']))

pack=dict(schema_version=1,key='9231-mechanics-momentum',version='1.0.0',course=dict(slug='maths4u-9231-mechanics',title='Further Mechanics (9231)',code='9231',direction='further'),chapter=dict(id='fm_momentum',slug='momentum-and-impacts',title='Momentum',position=5),source=dict(sha256=source_sha,supplied=39,held=[]),lessons=lessons,questions=questions,marking_status='DRAFT',assets=assets)
assert len(pack['questions'])==71 and len(quick_models)==32 and len(example_models)==16

def write(path,value):
    Path(path).write_text(json.dumps(value,ensure_ascii=False,indent=2,default=str)+'\n',encoding='utf-8')

write('content/original/9231-mechanics/momentum-v1.json',pack)
write('content/original/9231-mechanics/momentum-verification-v1.json',dict(sourceSha256=source_sha,owner=fixtures,quick=quick_models,examples=example_models,teachingDigests={l['id']:digest(l) for l in lessons}))
write('docs/ARENA-C5-MECHANICS-MOMENTUM-SOURCE-AUDIT-20261107.json',dict(sourceSha256=source_sha,supplied=39,held=[],rows=rows,assets=media,book=dict(path='D:/new_books/cambridge_international_as_a_level_full_book_for_further_pure_mathematics.pdf',pdfPages=[422,440],printedPages=[410,428],chapter=18,use='Mathematical progression only: impulse and momentum, signed restitution, smooth-wall components and successive impacts. Oblique-sphere applications extend these methods for the owner bank. Explanations and examples are independently authored; book wording, examples, questions and figures are not reproduced.'),editorialRepairs=[]))
assert hashlib.sha256(source.read_bytes()).hexdigest()==source_sha
print(json.dumps(dict(owner=39,parts=91,marks=307,quick=32,examples=16,lessons=4,statementImages=14,solutionImages=2)))
