import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parseDocument } from 'htmlparser2';
import { findAll, textContent } from 'domutils';
import katex from 'katex';

export const sources = {
  'maths4u-576': 'https://maths4u.sbs/subchapter.php?id=576',
  'maths4u-problems': 'https://maths4u.sbs/problems.php?subchapter_id=576&filter=all',
  'maths4u-chapter': 'https://maths4u.sbs/chapter.php?id=117',
  'olymp-gcd': 'https://olymp.maths4u.sbs/courses/number-theory2/chapters/book2-module1-advanced-gcd-problems/practice?lang=en',
  'olymp-gcd-ru': 'https://olymp.maths4u.sbs/courses/number-theory2/chapters/book2-module1-advanced-gcd-problems/practice?lang=ru',
  'olymp-chapter': 'https://olymp.maths4u.sbs/courses/number-theory2/chapters/book2-module1-advanced-gcd-problems?lang=en',
  'olymp-chapter-ru': 'https://olymp.maths4u.sbs/courses/number-theory2/chapters/book2-module1-advanced-gcd-problems?lang=ru',
  'olymp-course': 'https://olymp.maths4u.sbs/courses/number-theory2?lang=en',
  'olymp-course-ru': 'https://olymp.maths4u.sbs/courses/number-theory2?lang=ru',
};
export const hash = value => createHash('sha256').update(value).digest('hex');
export const parse = html => parseDocument(html, { withStartIndices: true, withEndIndices: true });
export const all = (node, predicate) => findAll(predicate, node.children || []);
export const hasClass = (n, name) => (n.attribs?.class || '').split(/\s+/).includes(name);
const one = (node, predicate) => { const found = all(node, predicate); if (found.length !== 1) throw new Error('PILOT_SOURCE_SHAPE_CHANGED'); return found[0]; };
const byId = (node, id) => all(node, n => n.attribs?.id === id)[0];
const cleanText = node => textContent(node).trim().replace(/\s+/g, ' ');
export function inner(node, source) {
  if (!node) return '';
  const start = source.indexOf('>', node.startIndex) + 1;
  const end = source.lastIndexOf('</', node.endIndex);
  if (end < start) throw new Error('PILOT_SOURCE_FRAGMENT_INVALID');
  return source.slice(start, end).trim();
}
const outer = (node, source) => source.slice(node.startIndex, node.endIndex + 1);
const images = node => all(node, n => n.name === 'img');

export function mathsRecords(html, legacyRows) {
  const doc = parse(html), cards = all(doc, n => n.attribs?.['data-problem-card-id']);
  if (cards.length !== 36) throw new Error('PILOT_MATHS_COUNT_CHANGED');
  return cards.map((card, position) => {
    const id = card.attribs['data-problem-card-id'];
    const legacy = legacyRows.find(r => String(r.id) === id && Number(r.subchapter_id) === 576);
    if (!legacy) throw new Error('PILOT_LEGACY_METADATA_MISSING');
    const body = one(card, n => hasClass(n, 'card-body'));
    const marker = body.children.findIndex(n => n.type === 'comment' && n.data.trim() === 'Problem text');
    const statementNode = body.children.slice(marker + 1).find(n => n.type === 'tag');
    if (marker < 0 || !hasClass(statementNode, 'mt-3')) throw new Error('PILOT_STATEMENT_MISSING');
    const solution = byId(card, 'sol-' + id), marks = byId(card, 'mk-' + id);
    const solutionText = solution && all(solution, n => hasClass(n, 'mb-2') && !hasClass(n, 'd-flex'))[0];
    const header = cleanText(one(card, n => n.name === 'h5'));
    const parsedHeader = header.match(/^(\d+) P(\d+) - (\w+) (\d{4}) - Q(.+?) - (\d+) marks$/);
    if (!parsedHeader) throw new Error('PILOT_EXAM_METADATA_CHANGED');
    const nestedImages = new Set([...(solution ? images(solution) : []), ...(marks ? images(marks) : []), ...images(statementNode)]);
    const statement = inner(statementNode, html) + images(card).filter(n => !nestedImages.has(n)).map(n => outer(n, html)).join('');
    const solutionHtml = inner(solutionText, html) + (marks ? '<h3>Mark scheme</h3>' + images(marks).map(n => outer(n, html)).join('') : '');
    return { id, position, sourceUrl: sources['maths4u-problems'] + '#card-' + id,
      metadata: { sourceHeader: header, localStatementMatches: inner(statementNode, html) === legacy.body_html.trim(), localSolutionMatches: inner(solutionText, html) === (legacy.solution_html || '').trim(),
        originalTitle: legacy.title, localMetadataSource: 'club-import-work/existing-problems.json', grading: 'MANUAL', marksSource: 'live page heading' },
      material: { visibility: 'PRIVATE', source: legacy.exam_board || 'Cambridge', syllabus: parsedHeader[1], examBoard: legacy.exam_board || 'Cambridge',
        year: Number(parsedHeader[4]), examSession: parsedHeader[3], paper: parsedHeader[2], questionNumber: parsedHeader[5],
        texts: [{ locale: 'en', title: legacy.title, statement, solution: solutionHtml, hint: '', teacherNote: '' }],
        parts: [{ kind: 'MANUAL', maxPoints: Number(parsedHeader[6]), texts: [{ locale: 'en', answer: '', rubric: '' }] }], assets: [] } };
  });
}

export function olympRecords(english, russian) {
  const docs = [parse(english), parse(russian)], htmls = [english, russian];
  const cards = docs.map(d => all(d, n => n.name === 'article' && n.attribs?.['data-problem-id']));
  if (cards.some(c => c.length !== 20) || cards[0].some((c, i) => c.attribs['data-problem-id'] !== cards[1][i].attribs['data-problem-id'])) throw new Error('PILOT_OLYMP_TRANSLATIONS_MISMATCH');
  return cards[0].map((card, position) => {
    const id = card.attribs['data-problem-id'];
    const href = one(card, n => hasClass(n, 'reader-open-link')).attribs.href;
    const code = new URL(href).pathname.split('/').pop();
    if (!/^NT-B2-M01-P\d{3}$/.test(code)) throw new Error('PILOT_OLYMP_CODE_CHANGED');
    const texts = cards.map((list, i) => {
      const n = list[position], html = htmls[i];
      const part = role => { const section = byId(n, `problem-${id}-${role}`); return section ? inner(one(section, n => hasClass(n, 'content-html')), html) : ''; };
      return { locale: i ? 'ru' : 'en', title: cleanText(one(n, n => n.name === 'h3')), statement: inner(one(n, n => hasClass(n, 'reader-statement')), html),
        hint: part('hint'), solution: part('solution'), teacherNote: '' };
    });
    const level = one(card, n => hasClass(n, 'reader-difficulty')).attribs['aria-label'].match(/Level (\d) of 5/);
    if (!level) throw new Error('PILOT_DIFFICULTY_MISSING');
    return { id, position, sourceUrl: href, metadata: { code, originalDetails: cleanText(one(card, n => hasClass(n, 'reader-details-body'))),
      tags: all(card, n => hasClass(n, 'reader-tag-chip')).map(cleanText), teacherNote: 'not exposed by public source', grading: 'MANUAL', provisionalMaxPoints: 1, marksSource: 'not specified; one provisional manual point, not source scoring' },
      material: { visibility: 'PRIVATE', source: 'Olymp / Book 2. Olympiad Number Theory Methods', difficulty: Number(level[1]), questionNumber: code,
        texts, parts: [{ kind: 'MANUAL', maxPoints: 1, texts: texts.map(t => ({ locale: t.locale, answer: '', rubric: '' })) }], assets: [] } };
  });
}

export function formulaAudit(html) {
  const text = textContent(parse(html));
  const expressions = [...text.matchAll(/\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]|\$\$([\s\S]*?)\$\$|\$([^$\n]+)\$/g)];
  const errors = [];
  for (const [full, inline, display, double, single] of expressions) {
    try { katex.renderToString(inline ?? display ?? double ?? single, { displayMode: display !== undefined || double !== undefined, throwOnError: true, trust: false, strict: 'ignore', maxExpand: 1000, maxSize: 20 }); }
    catch { errors.push(full); }
  }
  const rest = text.replace(/\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]|\$\$([\s\S]*?)\$\$|\$([^$\n]+)\$/g, '');
  return { count: expressions.length, errors, unpairedDelimiter: /\\[()[\]]/.test(rest) };
}

export function assetUrl(raw, page) {
  const url = new URL(raw, page);
  if (url.origin !== 'https://maths4u.sbs' || !url.pathname.startsWith('/uploads/problems/') || url.username || url.password || url.search || url.hash || !/\.png$/i.test(url.pathname)) throw new Error('PILOT_ASSET_URL_NOT_ALLOWED');
  return url;
}

export async function prepare(root = path.resolve('.local/content-pilot')) {
  await fs.mkdir(path.join(root, 'source'), { recursive: true });
  await fs.mkdir(path.join(root, 'assets'), { recursive: true });
  const pages = {};
  for (const [name, url] of Object.entries(sources)) {
    const filename = path.join(root, 'source', name + '.html');
    try { if (!process.argv.includes('--refresh')) pages[name] = await fs.readFile(filename, 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (!pages[name]) {
      const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error('PILOT_SOURCE_DOWNLOAD_FAILED');
      pages[name] = await response.text();
      if (Buffer.byteLength(pages[name]) > 2 * 1024 * 1024) throw new Error('PILOT_SOURCE_TOO_LARGE');
      await fs.writeFile(filename, pages[name]);
    }
  }
  if (cleanText(one(parse(pages['maths4u-chapter']), n => n.name === 'h1')) !== 'Calculus - Differentiation 1'
    || !cleanText(one(parse(pages['maths4u-576']), n => n.name === 'h2')).includes('Tangents and normals')) throw new Error('PILOT_SELECTED_SECTION_CHANGED');
  const legacyFile = 'D:/www/AS&A level maths/club-import-work/existing-problems.json';
  const legacyBytes = await fs.readFile(legacyFile);
  const legacy = JSON.parse(legacyBytes.toString('utf8').replace(/^\uFEFF/, ''));
  const maths = mathsRecords(pages['maths4u-problems'], legacy);
  const olymp = olympRecords(pages['olymp-gcd'], pages['olymp-gcd-ru']);
  const courseTexts = ['en', 'ru'].map((locale, i) => ({ locale, title: cleanText(one(parse(pages[i ? 'olymp-course-ru' : 'olymp-course']), n => n.name === 'h1')), description: '' }));
  const theory = ['en', 'ru'].map((locale, i) => {
    const html = pages[i ? 'olymp-chapter-ru' : 'olymp-chapter'], doc = parse(html);
    const section = byId(doc, 'theory');
    const fragments = all(section, n => hasClass(n, 'content-html'));
    if (!fragments.length) throw new Error('PILOT_THEORY_MISSING');
    const examples = byId(doc, 'examples');
    const extra = examples ? all(examples, n => hasClass(n, 'content-html')) : [];
    return { locale, title: cleanText(one(doc, n => n.name === 'h1')), body: [...fragments, ...extra].map(n => inner(n, html)).join('\n') };
  });
  const sections = [
    { project: 'maths4u', key: 'subchapter-576', sourceUrl: sources['maths4u-576'],
      course: { key: '0606', texts: [{ locale: 'en', title: 'Additional Mathematics', description: 'Cambridge 0606' }] },
      topic: { key: 'chapter-117', position: 12, texts: [{ locale: 'en', title: 'Calculus - Differentiation 1' }] },
      lesson: { key: 'subchapter-576', texts: [{ locale: 'en', title: 'Tangents and normals', body: '' }] }, records: maths },
    { project: 'olymp', key: 'book2-module1-advanced-gcd-problems', sourceUrl: sources['olymp-gcd'],
      course: { key: 'number-theory2', texts: courseTexts }, topic: { key: 'book2-module1-advanced-gcd-problems', position: 1, texts: theory.map(({ locale, title }) => ({ locale, title })) },
      lesson: { key: 'book2-module1-advanced-gcd-problems', texts: theory }, records: olymp },
  ];
  const assets = [], audit = { tasks: 56, taskTranslations: 76, formulas: 0, formulaErrors: [], images: 0, sourceComparisons: maths.map(r => ({ id: r.id, statementMatchesLocal: r.metadata.localStatementMatches, solutionMatchesLocal: r.metadata.localSolutionMatches })) };
  for (const section of sections) {
    for (const record of section.records) {
      for (const text of record.material.texts) for (const [field, role] of Object.entries({ statement: 'STATEMENT', hint: 'HINT', solution: 'SOLUTION', teacherNote: 'TEACHER' })) {
        let html = text[field];
        const doc = parse(html);
        // Replace from right to left so original offsets remain valid.
        for (const img of images(doc).reverse()) {
          const url = assetUrl(img.attribs.src, record.sourceUrl);
          const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(30000) });
          if (!response.ok || Number(response.headers.get('content-length') || 0) > 8 * 1024 * 1024) throw new Error('PILOT_IMAGE_DOWNLOAD_FAILED');
          const bytes = Buffer.from(await response.arrayBuffer());
          if (bytes.length > 8 * 1024 * 1024 || !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) throw new Error('PILOT_IMAGE_NOT_PNG');
          const sha256 = hash(bytes), key = hash(section.project + ':' + record.id + ':' + role + ':' + text.locale + ':' + url.href + ':' + sha256).slice(0, 40);
          const relative = `assets/${sha256}.png`;
          await fs.writeFile(path.join(root, relative), bytes);
          const localPath = path.join('D:/www/AS&A level maths/AS-Alevel', decodeURIComponent(url.pathname));
          let localMatches = null;
          try { localMatches = hash(await fs.readFile(localPath)) === sha256; } catch (error) { if (error.code !== 'ENOENT') throw error; }
          assets.push({ key, project: section.project, legacyId: record.id, role, locale: text.locale, sourceUrl: url.href, file: relative, sha256, size: bytes.length, mimeType: 'image/png', caption: img.attribs.alt || '', localMatches });
          record.material.assets.push({ fileId: 'pilot_' + key, role, locale: text.locale, caption: img.attribs.alt || '' });
          const replacement = '<img src="/api/files/pilot_' + key + '" alt="' + (img.attribs.alt || '').replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;') + '">';
          html = html.slice(0, img.startIndex) + replacement + html.slice(img.endIndex + 1);
        }
        text[field] = html;
        const checked = formulaAudit(html); audit.formulas += checked.count;
        if (checked.errors.length || checked.unpairedDelimiter) audit.formulaErrors.push({ project: section.project, id: record.id, locale: text.locale, field, ...checked });
      }
    }
    for (const text of section.lesson.texts) { const checked = formulaAudit(text.body); audit.formulas += checked.count; if (checked.errors.length || checked.unpairedDelimiter) audit.formulaErrors.push({ project: section.project, field: 'theory', locale: text.locale, ...checked }); }
  }
  audit.images = assets.length;
  const snapshot = await Promise.all(Object.entries(pages).map(async ([name, html]) => ({ name, url: sources[name], sha256: hash(html), savedAt: (await fs.stat(path.join(root, 'source', name + '.html'))).mtime.toISOString() })));
  const bundle = { format: 'maths4u-pilot-v1', selection: 'maths4u-576_olymp-nt-b2-m01', capturedAt: new Date().toISOString(),
    sources: snapshot, localMetadataSha256: hash(legacyBytes), sections, assets, audit };
  await fs.writeFile(path.join(root, 'bundle.json'), JSON.stringify(bundle, null, 2) + '\n');
  await fs.writeFile(path.join(root, 'audit.json'), JSON.stringify(audit, null, 2) + '\n');
  console.log(JSON.stringify({ tasks: audit.tasks, translations: audit.taskTranslations, images: audit.images, formulas: audit.formulas, formulaErrors: audit.formulaErrors.length }));
  if (audit.formulaErrors.length) throw new Error('PILOT_FORMULA_REVIEW_REQUIRED');
  return bundle;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  prepare().catch(error => { console.error(/^PILOT_[A-Z_]+$/.test(error.message) ? error.message : 'PILOT_PREPARATION_FAILED'); process.exitCode = 1; });
}
