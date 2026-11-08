"""Immutable projection of the copied 9709 S1 owner package; never modify the source."""
import json,hashlib,re,xml.etree.ElementTree as ET
from pathlib import Path
from html import escape
from s1_variation_teaching import lessons,questions,models
root=Path(r'E:\my folder\questions_data\original\Statistics1 9709\03_Measures_of_variation')
source=root/'server/03_Measures_of_variation_9709_S1_50x4.json';bank=json.loads(source.read_text('utf-8'))
source_hash=hashlib.sha256(source.read_bytes()).hexdigest();raw_questions=[q for l in bank['lessons'] for q in l['questions']]
assert len(raw_questions)==200 and sum(q['variant_index']==0 for q in raw_questions)==50
assert len(lessons)==5 and len(questions)==40
source_map=json.loads((root/'review/source_skill_map.json').read_text('utf-8'))
target=Path('content/original/9709-s1');media=target/'variation';media.mkdir(parents=True,exist_ok=True)
assets=[];mapping=[]
digest=lambda text:hashlib.sha256(text.encode('utf-8')).hexdigest()

def book_tables(html):
 # Only the actual three-column back-to-back table, never a summary table.
 def change(m):
  body=m.group(1)
  if re.search(r'<th[^>]*>Stem</th>',body) and body.split('</thead>')[0].count('<th ')==3:
   return '<div class="stem-leaf-scroll"><table class="stem-leaf stem-leaf-back">'+body+'</table></div>'
  return m.group(0)
 return re.sub(r'<div class="table-scroll"><table>([\s\S]*?)</table></div>',change,html)

def convention(q):
 rules=['All stated summary values are exact unless described as estimates. Keep unrounded intermediate totals.']
 rules.append('Descriptive variance and SD use divisor n, not n−1.')
 if any('quartile' in k or 'iqr' in k for k in q['skills']):rules.append('Raw-data quartiles use medians of halves, excluding an odd-sample overall median.')
 if any('grouped' in k for k in q['skills']):rules.append('Grouped mean/SD use class midpoints; median interpolation uses the stated within-class assumption.')
 rules.append('Non-exact numerical answers: 3 significant figures; exact equivalent forms are accepted.')
 return '<p><em>'+escape(' '.join(rules))+'</em></p>'

prerequisite_labels={'chapter_01_quartiles':'Representation of data: raw-data quartiles','chapter_01_cumulative_frequency':'Representation of data: cumulative frequencies','chapter_01_stem_and_leaf':'Representation of data: stem-and-leaf diagrams','chapter_01_frequency_tables':'Representation of data: frequency tables','chapter_01_grouped_data':'Representation of data: grouped data'}

for raw in raw_questions:
 uid=raw['content_uid'];per=[]
 for item in raw['images']:
  relative=Path(item['path']);assert not relative.is_absolute() and '..' not in relative.parts
  data=(root/relative).read_bytes();h=hashlib.sha256(data).hexdigest();xml=ET.fromstring(data)
  if 'width' in xml.attrib and 'height' in xml.attrib:w,hgt=int(xml.attrib['width']),int(xml.attrib['height'])
  else:
   box=xml.attrib['viewBox'].split();assert box[:2]==['0','0'];w,hgt=int(box[2]),int(box[3])
  dest=media/(h+'.svg');dest.write_bytes(data)
  a=dict(question_uid=uid,file_id='pkg_s1var_'+h,path=dest.as_posix(),sha256=h,size=len(data),width=w,height=hgt,mime='image/svg+xml',role='STATEMENT' if item['role']=='question' else 'SOLUTION',caption=item['alt']);assets.append(a);per.append((item['path'],a))
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
 mapping.append(dict(uid=uid,lesson=q['lesson'],family=raw['family_number'],variant=q['variant_index'],marks=q['marks'],sourceUid=ref.get('source_uid') or '',sourceRelationship=ref['classification'],originalAnswerSha256=digest(raw['answer_html']),originalSolutionSha256=digest(raw['solution_html']),originalHintSha256=digest(raw['hint_html']),projectedAnswerSha256=digest(q['answer_html']),projectedSolutionSha256=digest(q['solution_html']),projectedHintSha256=digest(q['hint_html']),criteriaSha256=digest(json.dumps([[[c['code'],c['marks'],c['description_html']] for c in p['criteria']] for p in raw['parts']],ensure_ascii=False,separators=(',',':')))))

pack=dict(schema_version=1,key='9709-s1-variation',version='1.0.2',course=dict(slug='maths4u-9709-s1',title='Probability & Statistics 1 (9709)',code='9709',direction='a-level'),chapter=dict(id='orig_9709_s1_variation',slug='measures-of-variation',title='Measures of variation',position=2),source=dict(sha256=source_hash,supplied=200,held=[]),lessons=lessons,questions=questions,marking_status='DRAFT',assets=assets)
def write(path,data):Path(path).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
write(target/'variation-v1.json',pack);write(target/'variation-math-models.json',models)
book=Path(r'D:\new_books\9709 cambridge\statistics1.pdf')
write('docs/ARENA-9709-S1-VARIATION-SOURCE-AUDIT-20261108.json',dict(source=str(source),sha256=source_hash,book=dict(path=str(book),sha256=hashlib.sha256(book.read_bytes()).hexdigest(),title='Cambridge International AS & A Level Mathematics: Probability & Statistics 1',author='Dean Chalmers',publisher='Cambridge University Press',year=2018,printed_pages='54–89 (chapter 3)',pdf_pages='66–101',sections=[dict(section='3.1–3.3',lesson='raw_moments'),dict(section='3.3',lesson='coded_totals'),dict(section='3.3; P1 algebra',lesson='reconstruction'),dict(section='3.3',lesson='changes_combining'),dict(section='3.2–3.3',lesson='frequency_synthesis')],policy='Book informs concepts and teaching structure; notes, numerical examples and short checks are independently written. No textbook exercises or artwork are copied.'),source_scope=bank['source_scope'],syllabus=bank['syllabus_check'],conventions=bank['conventions'],mapping=mapping,assets=len(assets),sourceCheckSpecifications='Retained privately as specifications only; written reasoning, final-answer rounding judgement and method marks use the existing manual/teacher workflow.'))

public=Path('public/assets/original/s1-variation');public.mkdir(parents=True,exist_ok=True)
def line(x1,y1,x2,y2,colour='#172033',dash=''):
 return f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{colour}" stroke-width="2"'+(' stroke-dasharray="'+dash+'"' if dash else '')+'/>'
def text(x,y,label):return f'<text x="{x}" y="{y}" text-anchor="middle">{label}</text>'
def svg(name,description,body):
 (public/(name+'.svg')).write_text('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="350" viewBox="0 0 640 350" role="img" aria-labelledby="title desc"><title id="title">'+description+'</title><desc id="desc">'+description+'</desc><rect width="640" height="350" fill="white"/><g font-family="Arial, sans-serif" font-size="18" fill="#172033">'+body+'</g></svg>',encoding='utf-8')
body=text(320,28,'Same mean, different variation')+text(320,332,'Observed value')
for y,values,label in [(100,[4,6,8,10,12],'A: variance 8'),(225,[0,4,8,12,16],'B: variance 32')]:
 body+=line(60,y,580,y)+text(320,y-35,label)
 for v in values:body+=f'<circle cx="{60+32.5*v}" cy="{y}" r="6" fill="#172033"/>'
 for v in range(0,17,4):body+=text(60+32.5*v,y+28,str(v))
body+=line(320,80,320,130,'#2457d6','5 5')+line(320,205,320,250,'#2457d6','5 5')
svg('equal-centres','Both samples have mean 8. A has variance 8 and B has variance 32.',body)
body=text(320,28,'Pooling includes differences of centres')+line(80,275,580,275)+text(320,334,'Observed-value scale')
for v in range(5,16):
 x=80+50*(v-5);body+=line(x,270,x,280)+text(x,308,str(v))
for mu,y,label,col in [(8,95,'Group A: mean 8, n = 4','#2457d6'),(13,160,'Group B: mean 13, n = 6','#a1540b'),(11,220,'Combined mean 11','#172033')]:
 x=80+50*(mu-5);body+=line(x,y+10,x,270,col)+text(x,y,label)
svg('pooled-spread','Group A has mean 8 and group B mean 13. Their weighted mean is 11, so between-group separation contributes to pooled variance.',body)
body=line(65,275,580,275)+line(65,275,65,40)+text(320,332,'Measurement')+text(200,25,'Cumulative frequency')
points=[(0,0),(10,8),(30,32),(50,40)]
body+='<polyline points="'+' '.join(f'{65+10*x},{275-5*y}' for x,y in points)+'" fill="none" stroke="#2457d6" stroke-width="3"/>'
for v in [0,10,20,30,40,50]:body+=text(65+10*v,305,str(v))
for v in [0,10,20,30,40]:body+=text(40,281-5*v,str(v))
for x,y,label in [(35/3,10,'Q1'),(85/3,30,'Q3')]:body+=line(65,275-5*y,65+10*x,275-5*y,'#a1540b','5 5')+line(65+10*x,275-5*y,65+10*x,275,'#a1540b','5 5')+text(65+10*x,255,label)
svg('percentiles','For 40 observations, cumulative counts 10 and 30 give quartiles 35/3 and 85/3 under linear interpolation.',body)
print(json.dumps(dict(lessons=5,examples=20,quick=40,exam=200,main=50,analogues=150,svg=len(assets),teachingSvg=3)))
