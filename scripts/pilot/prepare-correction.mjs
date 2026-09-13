import fs from 'node:fs/promises';
import path from 'node:path';
import { mathsRecords, parse, all, hasClass, inner, hash } from './prepare.mjs';

const root = path.resolve('.local/content-pilot');
const baseline = JSON.parse(await fs.readFile(path.join(root, 'bundle.json'), 'utf8'));
if (hash(JSON.stringify(baseline)) !== "9bb8f7ce308223af6e3a7a7a92d0032c78a572d01926fcd3a1b2c19ece156db5") throw new Error('PILOT_BASELINE_CHANGED');
async function source(name) {
  const html = await fs.readFile(path.join(root, 'source', name + '.html'), 'utf8');
  if (hash(html) !== baseline.sources.find(s => s.name === name)?.sha256) throw new Error('PILOT_SOURCE_CHANGED');
  return html;
}
const metadata = await fs.readFile('D:/www/AS&A level maths/club-import-work/existing-problems.json');
if (hash(metadata) !== baseline.localMetadataSha256) throw new Error('PILOT_METADATA_CHANGED');
const extracted = mathsRecords(await source('maths4u-problems'), JSON.parse(metadata.toString('utf8').replace(/^\uFEFF/, '')));
const maths = baseline.sections.find(s => s.project === 'maths4u');
const tasks = extracted.map(row => {
  const original = maths.records.find(r => r.id === row.id);
  if (!original || original.position !== row.position) throw new Error('PILOT_SOURCE_LINK_CHANGED');
  const text = row.material.texts[0];
  // Bind each mk-* image to the already published file by source URL + SHA256.
  const images = all(parse(text.markScheme), n => n.name === 'img');
  const files = images.map(n => {
    const url = new URL(n.attribs.src, row.sourceUrl).href;
    const a = baseline.assets.find(a => a.project === 'maths4u' && a.legacyId === row.id && a.sourceUrl === url && a.role === 'SOLUTION');
    if (!a) throw new Error('PILOT_MS_ASSET_LINK_CHANGED');
    return { id: 'pilot_' + a.key, sha256: a.sha256, size: a.size };
  });
  let markScheme = text.markScheme;
  for (const n of images.reverse()) {
    const a = baseline.assets.find(a => a.sourceUrl === new URL(n.attribs.src, row.sourceUrl).href && a.legacyId === row.id);
    const replacement = '<img src="/api/files/pilot_' + a.key + '" alt="' + (n.attribs.alt || '').replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;') + '">';
    markScheme = markScheme.slice(0, n.startIndex) + replacement + markScheme.slice(n.endIndex + 1);
  }
  return { project: 'maths4u', legacyId: row.id, lessonKey: maths.lesson.key, position: row.position, locale: 'en',
    beforeSolutionHash: hash(original.material.texts[0].solution), solution: text.solution, markScheme, markSchemeSource: text.markSchemeSource, files };
});
const olymp = baseline.sections.find(s => s.project === 'olymp');
const lessonTexts = [];
for (const locale of ['en', 'ru']) {
  const html = await source(locale === 'en' ? 'olymp-chapter' : 'olymp-chapter-ru'), doc = parse(html);
  const section = id => all(doc, n => n.attribs?.id === id)[0];
  const body = all(section('theory'), n => hasClass(n, 'content-html')).map(n => inner(n, html)).join('\n');
  const examples = all(section('examples'), n => hasClass(n, 'content-html')).map(n => inner(n, html)).join('\n');
  const previous = olymp.lesson.texts.find(t => t.locale === locale);
  if (previous.body !== body + '\n' + examples) throw new Error('PILOT_THEORY_BOUNDARY_CHANGED');
  lessonTexts.push({ locale, beforeBodyHash: hash(previous.body), body, examples });
}
const correction = { format: 'maths4u-pilot-correction-v1', baselineHash: hash(JSON.stringify(baseline)), tasks,
  lesson: { project: 'olymp', key: olymp.lesson.key, texts: lessonTexts } };
const output = path.resolve('.local/content-pilot-correction');
await fs.mkdir(output, { recursive: true });
await fs.writeFile(path.join(output, 'correction.json'), JSON.stringify(correction, null, 2) + '\n');
console.log(JSON.stringify({ tasks: tasks.length, msImages: tasks.reduce((n, t) => n + t.files.length, 0), lessonTranslations: lessonTexts.length, sha256: hash(JSON.stringify(correction)) }));
