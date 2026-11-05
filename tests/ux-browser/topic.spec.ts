import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs/promises";

const lesson = "/courses/maths4u-9709-p1/topics/orig_quadratics_completing_square", root = process.env.UX_REPORT_ROOT ?? "test-results/topic-20261105";
async function open(page: Page, item = "", hash = "") {
  await page.goto(lesson + (item ? "?item=" + item : "") + hash);
  await expect(page.locator('.square-question').getByRole('button', { name: 'Check answer', exact: true })).toBeEnabled();
  await page.evaluate(() => document.fonts.ready);
}
async function choose(page: Page, title: string) {
  await page.locator('.square-question-list summary').click();
  await page.locator('.square-question-list').getByRole('button', { name: title, exact: true }).click();
  await expect(page.locator('.square-question-list')).not.toHaveAttribute('open');
  await expect(page.locator('.square-question-list summary')).toBeFocused();
}

test('topic: mobile reading, sticky sections, topic dropdown and question navigation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await open(page);
  expect(await page.locator('#notes h2').evaluate(e => e.getBoundingClientRect().top)).toBeLessThan(700);
  await expect(page.locator('.square-topic-mobile summary')).toHaveText('Quadratics · 2 of 5▾');
  await expect(page.locator('.quadratics-topics')).toBeHidden();
  await page.locator('.square-topic-mobile summary').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('.square-topic-mobile nav a')).toHaveCount(5);
  await page.locator('.square-topic-mobile summary').press('Enter');
  const listStyle = await page.locator('#notes ol').evaluate(e => getComputedStyle(e).listStyleType); expect(listStyle).toBe('decimal');
  const formula = page.locator('#notes .katex-display').first();
  await expect(formula).toHaveAttribute('tabindex', '0');
  expect(await formula.evaluate(e => getComputedStyle(e).overflowX)).toBe('auto');
  await formula.focus(); await page.keyboard.press('ArrowRight');
  await expect.poll(() => formula.evaluate(e => e.scrollLeft)).toBeGreaterThan(0);
  await page.evaluate(() => scrollTo(0, 0));
  const reading = await page.locator('#notes .math-content').evaluate(e => ({ width: e.getBoundingClientRect().width, limit: getComputedStyle(e).maxWidth }));
  expect(reading.width).toBeLessThanOrEqual(parseFloat(reading.limit) + 1);
  for (const id of ['examples', 'practice', 'challenge', 'review']) {
    await page.locator('.square-nav a[href="#' + id + '"]').click();
    await expect(page.locator('.square-nav a[aria-current=location]')).toHaveAttribute('href', '#' + id);
    const position = await page.locator('.square-nav').evaluate(e => ({ top: e.getBoundingClientRect().top, header: document.querySelector('.topbar')!.getBoundingClientRect().bottom }));
    expect(Math.abs(position.top - position.header)).toBeLessThan(2);
  }
  await page.locator('.square-nav a[href="#practice"]').click();
  await expect(page.locator('.square-question-position')).toHaveText('Question 1 of 1');
  await page.getByRole('button', { name: 'Next →', exact: true }).click();
  await expect(page.locator('.square-question h3')).toHaveText('Unit coefficient');
  await expect(page.locator('.square-question-position')).toHaveText('Question 1 of 12');
  await page.getByRole('button', { name: 'Next →', exact: true }).click();
  await expect(page.locator('.square-question-position')).toHaveText('Question 2 of 12');
  await page.getByRole('button', { name: '← Previous', exact: true }).click();
  await choose(page, '1. A minimum and its intersections');
  await expect(page.locator('.square-question h3')).toHaveText('A minimum and its intersections');
  await page.locator('.square-question-list summary').click();
  expect(await page.locator('#practice').innerText()).not.toMatch(/M4U-9709|\bD02\b|Diagnostic 2|Question 1\s*$/);
  await page.screenshot({ path: root + '/after/question-list-390.png', fullPage: false });
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(page.locator('.quadratics-topics')).toBeVisible(); await expect(page.locator('.square-topic-mobile')).toBeHidden();
});

test('topic: truthful feedback, retained focus, drafts and solution gate', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page, 'M4U-9709-Q26-S-CS01', '#practice');
  const form = page.locator('.square-question'), check = form.getByRole('button', { name: 'Check answer', exact: true });
  await expect(form.locator('h3')).toHaveText('Unit coefficient');
  await expect(form.getByRole('button', { name: 'Show worked solution', exact: true })).toHaveCount(0);
  await form.locator('input[name=a]').fill('1'); await form.locator('input[name=h]').fill('5'); await form.locator('input[name=k]').fill('2');
  await check.scrollIntoViewIfNeeded();
  const geometry = () => page.evaluate(() => ({ y: scrollY, button: document.querySelector('.square-form-actions')!.getBoundingClientRect().toJSON(), fields: [...document.querySelectorAll('.square-field-status')].map(e => e.getBoundingClientRect().toJSON()) }));
  const beforeGeometry = await geometry(); await check.click();
  await expect(form.locator('#feedback-h')).toContainText('Halve the coefficient');
  await expect(form.locator('#feedback-h')).not.toContainText('opposite centre');
  await expect(form.locator('#feedback-k')).toContainText('Subtract the square');
  await expect(form.locator('input[name=a]')).not.toHaveAttribute('aria-invalid', 'true');
  await expect(form.locator('input[name=h]')).toHaveAttribute('aria-invalid', 'true');
  await fs.writeFile(root + '/feedback-layout.json', JSON.stringify({ before: beforeGeometry, after: await geometry() }, null, 2));
  await expect(check).toBeFocused();
  const hint = form.getByRole('button', { name: 'Hint', exact: true }); await hint.click();
  await expect(form.locator('.feedback--hint')).toBeVisible(); await expect(hint).toBeFocused();
  await expect(form.locator('input[name=h]')).toHaveValue('5');
  await page.screenshot({ path: root + '/after/feedback-and-hint-390.png', fullPage: false });
  await form.locator('input[name=h]').fill('7'); await form.locator('input[name=k]').fill('-9');
  await check.click();
  await expect(form.locator('.square-result')).toContainText('All final answers are correct');
  await expect(check).toBeFocused();
  await expect(form.locator('input[aria-invalid=true]')).toHaveCount(0);
  await expect(page.locator('.square-question-nav progress')).toHaveAttribute('value', '1');
  await page.reload(); await expect(form.locator('input[name=h]')).toHaveValue('7');
  await expect(form.getByRole('button', { name: 'Show worked solution', exact: true })).toBeEnabled();
  await form.getByRole('button', { name: 'Show worked solution', exact: true }).click(); await expect(form.locator('.square-help')).toContainText('Indicative Maths4U marking guidance');
  await choose(page, '2. A fractional shift');
  await expect(form.getByRole('button', { name: 'Show worked solution', exact: true })).toHaveCount(0);
  await form.getByRole('button', { name: 'I’m stuck', exact: true }).click();
  await form.getByRole('button', { name: 'Show worked solution', exact: true }).click(); await expect(form.locator('.square-help')).toBeVisible();
  const draft = await page.evaluate(() => JSON.parse(localStorage.getItem('maths4u.square.draft.guest.2026-11-05.1.M4U-9709-Q26-S-CS02')!)); expect(draft.helpUsed).toBe(true);
  await choose(page, '5. A fractional leading coefficient'); await expect(form.locator('.square-field-format')).toContainText('Enter (x, y)');
  await choose(page, '8. Vertex inside a closed domain'); await expect(form.locator('.square-field-format')).toContainText('Use intervals');
});

test('topic: wrong choice has a visible non-colour status and old routes remain usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await open(page, 'M4U-9709-Q26-D02', '#practice');
  const form = page.locator('.square-question'); await expect(form.locator('.square-format')).toHaveCount(0); await form.locator('input[value=A]').check();
  await form.getByRole('button', { name: 'Check answer', exact: true }).click();
  await expect(form.locator('.square-choice[data-state=again] input')).toHaveAttribute('aria-invalid', 'true');
  await expect(form.locator('.square-choice[data-state=again] .square-choice-status')).toHaveAttribute('aria-label', 'Look again');
  await form.locator('input[value=C]').check(); await form.getByRole('button', { name: 'Check answer', exact: true }).click();
  await expect(form.locator('.square-choice[data-state=correct]')).toBeVisible(); await expect(form.locator('input[aria-invalid=true]')).toHaveCount(0);
  const stored = await page.evaluate(() => localStorage.getItem('maths4u.square.guest.v1'));
  await page.goto(lesson + '?view=legacy'); await expect(page.locator('h1')).toBeVisible(); await expect(page.locator('.square-lesson')).toHaveCount(0);
  await open(page, 'M4U-9709-Q26-S-CS03'); await expect(form.locator('h3')).toHaveText('Keep the outside coefficient');
  expect(await page.evaluate(() => localStorage.getItem('maths4u.square.guest.v1'))).toBe(stored);
  await page.locator('.square-topic-mobile summary').click(); await page.locator('.square-topic-mobile a').first().click();
  await expect(page).toHaveURL(/orig_quadratics_factorisation$/); await expect(page.locator('#notes h2')).toHaveText('Choose a method, then check every root');
  await page.locator('.square-topic-mobile summary').click(); await page.locator('.square-topic-mobile a').nth(1).click();
  await expect(page.locator('.square-question h3')).toHaveText('Keep the outside coefficient');
  await fs.writeFile(root + '/interaction-checks.json', JSON.stringify({ mobileReading: true, stickySections: true, truthfulFeedback: true, drafts: true, legacy: true, reviewEvidenceRetained: true }, null, 2));
});

test('topic: a complete mobile retry keeps the answer and focus', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await open(page, 'M4U-9709-Q26-S-CS05', '#practice');
  const form = page.locator('.square-question'), input = form.locator('input'), check = form.getByRole('button', { name: 'Check answer', exact: true });
  await expect(form.locator('h3')).toHaveText('A fractional leading coefficient');
  await input.fill('(0,0)');
  await input.evaluate(e => { const top = e.getBoundingClientRect().top + scrollY; const header = document.querySelector('.topbar')!.getBoundingClientRect().height + document.querySelector('.square-nav')!.getBoundingClientRect().height; scrollTo(0, top - header - 24); });
  await expect(input).toBeInViewport(); await expect(check).toBeInViewport();
  await check.click(); await expect(form.locator('#feedback-point')).toContainText('Look again');
  await form.getByRole('button', { name: 'Hint', exact: true }).click(); await expect(form.locator('.feedback--hint')).toBeInViewport();
  await expect(form.getByRole('button', { name: 'Hint', exact: true })).toBeFocused(); await expect(input).toHaveValue('(0,0)');
  await input.fill('(3,7/2)'); await check.click(); await expect(form.locator('.square-result')).toContainText('All final answers are correct');
  await expect(check).toBeFocused(); await expect(input).toHaveValue('(3,7/2)');
  await page.screenshot({ path: root + '/after/mobile-complete-retry.png', fullPage: false });
});

test('topic: new and revisited questions have no empty feedback reserve', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await open(page, 'M4U-9709-Q26-V-CS03', '#practice');
  const form = page.locator('.square-question'), check = form.getByRole('button', { name: 'Check answer', exact: true });
  async function capture(name: string) {
    await form.evaluate(e => { const panels = document.querySelector('.topbar')!.getBoundingClientRect().height + document.querySelector('.square-nav')!.getBoundingClientRect().height; scrollTo(0, scrollY + e.getBoundingClientRect().top - panels - 12); });
    await page.screenshot({ path: root + '/after/' + name + '-390.png', fullPage: false });
  }
  async function compact() {
    await expect(form.locator('.feedback')).toHaveCount(0);
    const heights = await form.locator('.square-field-status').evaluateAll(fields => fields.map(e => ({ height: e.getBoundingClientRect().height, min: getComputedStyle(e).minHeight })));
    expect(heights).toHaveLength(3);
    for (const field of heights) { expect(field.min).toBe('0px'); expect(field.height).toBeLessThan(80); }
    return heights;
  }
  await expect(form.locator('h3')).toContainText('Keep the outside coefficient');
  const fresh = await compact(); await capture('compact-new');
  await expect(form.locator('.square-format')).toHaveCount(1);
  for (const input of await form.locator('input').all()) await input.fill('0');
  await check.focus(); await page.keyboard.press('Enter');
  await expect(form.locator('.square-result')).toContainText('Look again'); await expect(check).toBeFocused();
  await expect(form.locator('.square-field-status .feedback')).toHaveCount(3);
  const checked = await form.locator('.square-field-status').evaluateAll(fields => fields.map(e => ({ height: e.getBoundingClientRect().height, min: getComputedStyle(e).minHeight })));
  expect(checked.every(f => f.min === '0px')).toBe(true); expect(checked.every((f, i) => f.height > fresh[i].height)).toBe(true);
  await capture('compact-checked');
  const firstInput = form.locator('input').first(); await firstInput.focus();
  const submitted = page.waitForResponse(r => r.url().endsWith('/api/learning/square/check') && r.request().method() === 'POST');
  await firstInput.press('Enter'); await submitted; await expect(check).toBeEnabled(); await expect(firstInput).toBeFocused();
  await page.getByRole('button', { name: 'Next →', exact: true }).click(); await page.getByRole('button', { name: '← Previous', exact: true }).click();
  await expect(form.locator('h3')).toContainText('Keep the outside coefficient'); await compact();
  for (const input of await form.locator('input').all()) await expect(input).toHaveValue('0');
  await capture('compact-return');
  await open(page, 'M4U-9709-Q26-E-CS03', '#practice');
  await expect(form.locator('input[type=radio]').first()).toBeVisible(); await expect(form.locator('.square-format')).toHaveCount(1);
  await fs.writeFile(root + '/compact-feedback.json', JSON.stringify({ fresh, checked, revisitedCompact: true, focusRetained: true, choiceGuideHidden: true, typedGuidePreserved: true }, null, 2));
});
