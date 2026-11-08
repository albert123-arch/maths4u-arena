"""Immutable projection of the copied 9709 S1 owner package; never modify the source."""
import json,hashlib,re,xml.etree.ElementTree as ET
from pathlib import Path
from html import escape
from s1_probability_teaching import lessons,questions,models
root=Path(r'E:\my folder\questions_data\original\Statistics1 9709\04_Probability')
source=root/'server/04_Probability_9709_S1_50x4.json';bank=json.loads(source.read_text('utf-8'))
source_hash=hashlib.sha256(source.read_bytes()).hexdigest();raw_questions=[q for l in bank['lessons'] for q in l['questions']]
assert len(raw_questions)==200 and sum(q['variant_index']==0 for q in raw_questions)==50
assert len(lessons)==5 and len(questions)==40
source_map=json.loads((root/'review/source_skill_map.json').read_text('utf-8'))
target=Path('content/original/9709-s1');media=target/'probability';media.mkdir(parents=True,exist_ok=True)
assets=[];mapping=[]
digest=lambda text:hashlib.sha256(text.encode('utf-8')).hexdigest()

def book_tables(html):return html

def convention(q):
 return '<p><em>Give exact probabilities. Only use independence when stated or established. The condition determines the sample space; changing contents changes branch probabilities.</em></p>'

prerequisite_labels={'counting_selections':'Counting selections: Permutations and combinations'}


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
  a=dict(question_uid=uid,file_id='pkg_s1prob_'+h,path=dest.as_posix(),sha256=h,size=len(data),width=w,height=hgt,mime='image/svg+xml',role='STATEMENT' if item['role']=='question' else 'SOLUTION',caption=item['alt']);assets.append(a);per.append((item['path'],a))
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
 q=dict(id=uid,family_uid=raw['question_family_id'],lesson=raw['topic_id'],title=raw['title'],collection='exam',variant_index=raw['variant_index'],prompt_html=prompt,answer_html=project(raw['answer_html']),solution_html=project(raw['solution_html'],include_figures=True),hint_html=project(raw['hint_html']),marks=raw['marks'],difficulty={'foundation':1,'standard':2,'demanding':3,'challenge':4}[raw['difficulty']],fields=[],parts=parts,verification='OWNER-BANK-'+uid,provenance=dict(original_id=str(ref.get('source_record_id') or ''),original_uid=ref.get('source_uid') or '',archiveTaskId='',sourceSha256=source_hash,ownerProvenance=dict(source=ref,review=raw['review'],prerequisites=raw['prerequisites'],conventions=bank['conventions'],checkSpecs=[p['check_spec'] for p in raw['parts']],markingGuidance=raw['marking_guidance'],verificationInputsSha256=digest(json.dumps(raw['verification_inputs'],sort_keys=True)))))
 questions.append(q)
 mapping.append(dict(uid=uid,lesson=q['lesson'],family=raw['family_number'],variant=q['variant_index'],marks=q['marks'],sourceUid=ref.get('source_uid') or '',sourceRelationship='selected_source_skill_redevelopment',originalAnswerSha256=digest(raw['answer_html']),originalSolutionSha256=digest(raw['solution_html']),originalHintSha256=digest(raw['hint_html']),projectedAnswerSha256=digest(q['answer_html']),projectedSolutionSha256=digest(q['solution_html']),projectedHintSha256=digest(q['hint_html']),criteriaSha256=digest(json.dumps([[[c['code'],c['marks'],c['description_html']] for c in p['criteria']] for p in raw['parts']],ensure_ascii=False,separators=(',',':')))))

pack=dict(schema_version=1,key='9709-s1-probability',version='1.0.0',course=dict(slug='maths4u-9709-s1',title='Probability & Statistics 1 (9709)',code='9709',direction='a-level'),chapter=dict(id='orig_9709_s1_probability',slug='probability',title='Probability',position=3),source=dict(sha256=source_hash,supplied=200,held=[]),lessons=lessons,questions=questions,marking_status='DRAFT',assets=assets)
def write(path,data):
 path=Path(path);body=json.dumps(data,ensure_ascii=False,indent=2)+'\n'
 if path.exists() and path.read_text('utf-8')==body:return
 pending=path.with_name(path.name+'.writing');pending.write_text(body,encoding='utf-8');pending.replace(path)
write(target/'probability-v1.json',pack);write(target/'probability-math-models.json',models)
book=Path(r'D:\new_books\9709 cambridge\statistics1.pdf')
write('docs/ARENA-9709-S1-PROBABILITY-SOURCE-AUDIT-20261108.json',dict(source=str(source),sha256=source_hash,book=dict(path=str(book),sha256=hashlib.sha256(book.read_bytes()).hexdigest(),title='Cambridge International AS & A Level Mathematics: Probability & Statistics 1',author='Dean Chalmers',publisher='Cambridge University Press',year=2018,printed_pages='90–121 (chapter 4)',pdf_pages='102–133',sections=[dict(section='4.1–4.2',lesson='sample_spaces'),dict(section='4.3, 4.5',lesson='finite_sequences'),dict(section='4.2, 4.4',lesson='tables_conditioning'),dict(section='4.3–4.5',lesson='tree_mixtures'),dict(section='4.5; counting primer 5.2',lesson='changing_samples')],policy='Book informs concepts and teaching structure; notes, numerical examples and short checks are independently written. No textbook exercises or artwork are copied.'),source_scope=bank['source_scope'],syllabus=bank['syllabus_check'],conventions=bank['conventions'],mapping=mapping,assets=len(assets),sourceCheckSpecifications='Retained privately as specifications only; written reasoning, exact probability interpretation and method marks use the existing manual/teacher workflow.'))

public=Path('public/assets/original/s1-probability');public.mkdir(parents=True,exist_ok=True)
def line(x1,y1,x2,y2):return f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="#172033" stroke-width="2"/>'
def text(x,y,value,size=18):return f'<text x="{x}" y="{y}" text-anchor="middle" font-size="{size}">{value}</text>'
def svg(name,description,body):
 value='<svg xmlns="http://www.w3.org/2000/svg" width="640" height="380" viewBox="0 0 640 380" role="img" aria-labelledby="title desc"><title id="title">'+description+'</title><desc id="desc">'+description+'</desc><rect width="640" height="380" fill="white"/><g font-family="Arial, sans-serif" fill="#172033">'+body+'</g></svg>'
 path=public/(name+'.svg')
 if not path.exists() or path.read_text('utf-8')!=value:path.write_text(value,encoding='utf-8')
body=text(320,25,'16 equally likely ordered pairs')+text(320,365,'6 shaded pairs: total at least 6')
for a in range(1,5):
 for b in range(1,5):
  x,y=180+60*(a-1),75+60*(4-b);colour='#dbeafe' if a+b>=6 else '#ffffff'
  body+=f'<rect x="{x}" y="{y}" width="60" height="60" fill="{colour}" stroke="#172033"/>'+text(x+30,y+38,str(a+b),22)
for a in range(1,5):body+=text(180+60*(a-1)+30,340,str(a),20)
for b in range(1,5):body+=text(155,75+60*(4-b)+38,str(b),20)
body+=text(315,58,'First score →')+text(92,204,'Second')+text(92,226,'score')
svg('sample-grid','Every ordered pair is equally likely; six pairs from two fair four-sector spinners have total at least six. Horizontal scores run 1 to 4.',body)
body='<rect x="60" y="50" width="520" height="280" fill="white" stroke="#172033"/>'
body+='<circle cx="260" cy="185" r="100" fill="#dbeafe" fill-opacity=".65" stroke="#172033" stroke-width="2"/><circle cx="380" cy="185" r="100" fill="#ffedd5" fill-opacity=".55" stroke="#172033" stroke-width="2"/>'
for x,y,value in [(210,185,'7/20'),(320,185,'1/4'),(430,185,'1/4'),(520,305,'3/20'),(230,70,'A'),(410,70,'B')]:body+=text(x,y,value,22)
body+=text(320,365,'The four disjoint regions sum to 1')
svg('venn-regions','A-only is 7/20, intersection 1/4, B-only 1/4 and neither 3/20.',body)
body=text(320,25,'Multiply along paths; add disjoint paths')
for x1,y1,x2,y2 in [(70,180,245,100),(70,180,245,270),(245,100,450,60),(245,100,450,150),(245,270,450,230),(245,270,450,320)]:body+=line(x1,y1,x2,y2)
for x,y,label in [(145,125,'1/3'),(145,260,'2/3'),(245,85,'A'),(245,260,'B'),(345,70,'3/4'),(345,140,'1/4'),(345,235,'2/5'),(345,315,'3/5'),(475,65,'S'),(475,155,'not S'),(475,235,'S'),(475,325,'not S'),(560,65,'1/4'),(560,155,'1/12'),(560,235,'4/15'),(560,325,'2/5')]:body+=text(x,y,label)
body+=text(320,370,'S = success; right-hand values are joint probabilities')
svg('mixture-tree','Choose A with probability 1/3 or B with probability 2/3. Success chances are 3/4 and 2/5; the four joint probabilities are 1/4, 1/12, 4/15 and 2/5.',body)
print(json.dumps(dict(lessons=5,examples=20,quick=40,exam=200,main=50,analogues=150,svg=len(assets),teachingSvg=3)))
