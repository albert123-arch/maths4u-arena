"""Immutable projection of the copied 9709 S1 owner package; never modify the source."""
import json,hashlib,re,xml.etree.ElementTree as ET
from pathlib import Path
from html import escape
from s1_counting_teaching import lessons,questions,models
root=Path(r'E:\my folder\questions_data\original\Statistics1 9709\05_Permutations_and_combinations')
source=root/'server/05_Permutations_and_combinations_9709_S1_50x4.json';bank=json.loads(source.read_text('utf-8'))
source_hash=hashlib.sha256(source.read_bytes()).hexdigest();raw_questions=[q for l in bank['lessons'] for q in l['questions']]
assert len(raw_questions)==200 and sum(q['variant_index']==0 for q in raw_questions)==50
assert len(lessons)==5 and len(questions)==40
source_map=json.loads((root/'review/source_skill_map.json').read_text('utf-8'))
target=Path('content/original/9709-s1');media=target/'counting';media.mkdir(parents=True,exist_ok=True)
assets=[];mapping=[]
digest=lambda text:hashlib.sha256(text.encode('utf-8')).hexdigest()

def book_tables(html):return html

def convention(q):
 return '<p><em>Counts are exact integers. Distinguish physical objects, identical patterns and group labels. For probabilities, match the stated equally likely and conditional sample space.</em></p>'

prerequisite_labels={'probability_5.3':'Probability: conditional sample spaces (syllabus 5.3)'}


for raw in raw_questions:
 uid=raw['content_uid'];per=[]
 for item in raw['images']:
  relative=Path(item['path']);assert not relative.is_absolute() and '..' not in relative.parts
  data=(root/relative).read_bytes();h=hashlib.sha256(data).hexdigest();xml=ET.fromstring(data)
  if 'width' in xml.attrib and 'height' in xml.attrib:w,hgt=int(xml.attrib['width']),int(xml.attrib['height'])
  else:
   box=xml.attrib['viewBox'].split();assert box[:2]==['0','0'];w,hgt=int(box[2]),int(box[3])
  dest=media/(h+'.svg')
  if dest.exists():assert dest.read_bytes()==data
  else:dest.write_bytes(data)
  a=dict(question_uid=uid,file_id='pkg_s1count_'+h,path=dest.as_posix(),sha256=h,size=len(data),width=w,height=hgt,mime='image/svg+xml',role='STATEMENT' if item['role']=='question' else 'SOLUTION',caption=item['alt']);assets.append(a);per.append((item['path'],a))
 def project(html,include_figures=False):
  # Typography adapter only: MathJax tolerates these source forms, KaTeX does not.
  # Numerical values and criteria remain unchanged in the owner package.
  html=html.replace(r'\text{ %}',r'\text{ \%}').replace(r'\text{ g²}',r'\text{ g}^2')
  for old,a in per:html=html.replace('src="'+old+'"','src="/api/files/'+a['file_id']+'"')
  if include_figures:
   # The supplied SVGs are separate solution illustrations, not embedded HTML.
   for _,a in per:
    url='/api/files/'+a['file_id']
    if a['role']=='SOLUTION' and url not in html:
     html+='<p><img src="'+url+'" alt="'+escape(a['caption'],quote=True)+'"></p>'
  assert not re.search(r'src=[\"\']assets/',html)
  return book_tables(html)
 prereq='<p><strong>Mixed-topic prerequisite:</strong> '+escape('; '.join(prerequisite_labels.get(k,k) for k in raw['prerequisites']))+'.</p>' if raw['prerequisites'] else ''
 prompt=convention(raw)+prereq+project(raw['question_html'])
 parts=[dict(label=p['label'],marking_criteria=[dict(code=c['code'],marks=c['marks'],description_html=c['description_html'],**({'guidance_html':'Accept correct follow-through where the criterion allows it.'} if c.get('follow_through') else {})) for c in p['criteria']]) for p in raw['parts']]
 ref=next(row for row in source_map if row['family_id']==raw['question_family_id'])
 q=dict(id=uid,family_uid=raw['question_family_id'],lesson=raw['topic_id'],title=raw['title'],collection='exam',variant_index=raw['variant_index'],prompt_html=prompt,answer_html=project(raw['answer_html']),solution_html=project(raw['solution_html'],include_figures=True),hint_html=project(raw['hint_html']),marks=raw['marks'],difficulty={'foundation':1,'standard':2,'demanding':3,'challenge':4}[raw['difficulty']],fields=[],parts=parts,verification='OWNER-BANK-'+uid,provenance=dict(original_id=str(ref.get('source_id') or ''),original_uid=ref.get('source_uid') or '',archiveTaskId='',sourceSha256=source_hash,ownerProvenance=dict(source=ref,review=raw['review'],prerequisites=raw['prerequisites'],conventions=bank['conventions'],checkSpecs=[p['check_spec'] for p in raw['parts']],markingGuidance=raw['marking_guidance'],verificationInputsSha256=digest(json.dumps(raw['verification_inputs'],sort_keys=True)))))
 questions.append(q)
 mapping.append(dict(uid=uid,lesson=q['lesson'],family=raw['family_number'],variant=q['variant_index'],marks=q['marks'],sourceUid=ref.get('source_uid') or '',sourceRelationship='selected_source_skill_redevelopment',originalAnswerSha256=digest(raw['answer_html']),originalSolutionSha256=digest(raw['solution_html']),originalHintSha256=digest(raw['hint_html']),projectedAnswerSha256=digest(q['answer_html']),projectedSolutionSha256=digest(q['solution_html']),projectedHintSha256=digest(q['hint_html']),criteriaSha256=digest(json.dumps([[[c['code'],c['marks'],c['description_html']] for c in p['criteria']] for p in raw['parts']],ensure_ascii=False,separators=(',',':')))))

pack=dict(schema_version=1,key='9709-s1-counting',version='1.0.0',course=dict(slug='maths4u-9709-s1',title='Probability & Statistics 1 (9709)',code='9709',direction='a-level'),chapter=dict(id='orig_9709_s1_counting',slug='permutations-and-combinations',title='Permutations and combinations',position=4),source=dict(sha256=source_hash,supplied=200,held=[]),lessons=lessons,questions=questions,marking_status='DRAFT',assets=assets)
def write(path,data):
 path=Path(path);body=json.dumps(data,ensure_ascii=False,indent=2)+'\n'
 if path.exists() and path.read_text('utf-8')==body:return
 pending=path.with_name(path.name+'.writing');pending.write_text(body,encoding='utf-8');pending.replace(path)
write(target/'counting-v1.json',pack);write(target/'counting-math-models.json',models)
book=Path(r'D:\new_books\9709 cambridge\statistics1.pdf')
write('docs/ARENA-9709-S1-COUNTING-SOURCE-AUDIT-20261108.json',dict(source=str(source),sha256=source_hash,book=dict(path=str(book),sha256=hashlib.sha256(book.read_bytes()).hexdigest(),title='Cambridge International AS & A Level Mathematics: Probability & Statistics 1',author='Dean Chalmers',publisher='Cambridge University Press',year=2018,printed_pages='122–148 (chapter 5)',pdf_pages='134–160',sections=[dict(section='5.1–5.2',lesson='distinct_arrangements'),dict(section='5.2, 5.4',lesson='repeated_objects'),dict(section='5.3–5.4',lesson='selections'),dict(section='5.2–5.4',lesson='allocations'),dict(section='5.4; probability section 4.4',lesson='mixed_counting')],policy='Book informs concepts and teaching structure; notes, numerical examples and short checks are independently written. No textbook exercises or artwork are copied.'),source_scope=bank['source_scope'],syllabus=bank['syllabus_check'],conventions=bank['conventions'],mapping=mapping,assets=len(assets),sourceCheckSpecifications='Retained privately as specifications only; written reasoning, exact probability interpretation and method marks use the existing manual/teacher workflow.'))

public=Path('public/assets/original/s1-counting');public.mkdir(parents=True,exist_ok=True)
def text(x,y,value,size=20):return f'<text x="{x}" y="{y}" text-anchor="middle" font-size="{size}">{value}</text>'
def box(x,y,w,label,colour='#ffffff'):
 return f'<rect x="{x}" y="{y}" width="{w}" height="55" rx="6" fill="{colour}" stroke="#172033" stroke-width="2"/>'+text(x+w/2,y+35,label,24)
def svg(name,description,body):
 value='<svg xmlns="http://www.w3.org/2000/svg" width="640" height="350" viewBox="0 0 640 350" role="img" aria-labelledby="title desc"><title id="title">'+description+'</title><desc id="desc">'+description+'</desc><rect width="640" height="350" fill="white"/><g font-family="Arial, sans-serif" fill="#172033">'+body+'</g></svg>'
 path=public/(name+'.svg')
 if not path.exists() or path.read_text('utf-8')!=value:path.write_text(value,encoding='utf-8')
body=text(320,35,'Five units; two internal pair orders')
for y,pair in [(90,'A B'),(200,'B A')]:
 body+=box(70,y,120,pair,'#dbeafe')
 for i,label in enumerate('CDEF'):body+=box(215+80*i,y,65,label)
body+=text(320,315,'Adjacent A and B: 2 × 5! = 240')
svg('block-orders','A and B make one block with two internal orders. With C,D,E,F there are five units and 240 adjacent-pair arrangements.',body)
body=text(320,35,'Four distinct objects leave five gaps')
for i,label in enumerate(['1','2','3','4']):body+=box(135+110*i,135,65,label,'#dbeafe')
for i,x in enumerate([105,222,332,442,545],1):body+=text(x,95,'Gap '+str(i),16)+f'<circle cx="{x}" cy="165" r="7" fill="#a1540b"/>'
body+=text(320,255,'Choose two different gaps for two identical reds')+text(320,305,'4! × C(5, 2) = 240 separated arrangements')
svg('available-gaps','Four ordered distinct objects create five gaps, including both ends. Two identical reds must choose two distinct gaps to stay separated.',body)
body=text(320,35,'Swapping unnamed teams gives the same division')
for y,left,right in [(90,'A B C','D E F'),(215,'D E F','A B C')]:
 body+=box(95,y,180,left,'#dbeafe' if left=='A B C' else '#ffedd5')+box(365,y,180,right,'#dbeafe' if right=='A B C' else '#ffedd5')
body+=text(320,190,'Same memberships')+text(320,325,'20 named allocations ÷ 2! = 10 unnamed divisions')
svg('group-swap','The two triples ABC and DEF form the same unnamed division when their display order is swapped. Named teams would distinguish the two orders.',body)
print(json.dumps(dict(lessons=5,examples=20,quick=40,exam=200,main=50,analogues=150,svg=len(assets),teachingSvg=3)))
