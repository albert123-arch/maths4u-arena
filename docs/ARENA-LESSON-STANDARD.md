# Arena lesson standard

Applies to new and revised Arena teaching pages. The five 9709 Pure Mathematics 1 Quadratics lessons are the reference implementation. Use the same Arena type, spacing, controls and theme tokens in every course.

## Page and navigation

- Keep one indexable page per topic. Use stable section anchors for direct links, including the key steps of longer methods. Preserve the canonical topic URL, task links and the Notes, Examples, Practice, Exam-style and Review entry points.
- Put a short outcome under the lesson title. Use question or action headings that say what the student will learn. The contents list shows section title, Core or Further applications, and approximate study time. Include a short glossary for unfamiliar terms.
- On desktop, place the contents and glossary beside the reading column. On mobile, use a disclosure for the contents and stack diagrams and controls. Render exactly the same text, examples, diagrams, checks and mathematical steps at both widths.
- Place previous and next section links at the end of each section. Use a verified link to a related topic when the same technique will be used again.

## Sequence within a section

1. Start with the idea and the conditions under which it applies. Give the learner enough context to act, then describe the method in numbered steps where order matters.
2. Put the first worked example next to the method. The prompt and at least the first step with its explanation are visible on arrival. Reveal the rest a step at a time or together. A second example may invite the learner to try it first.
3. Place a short **Your turn** check immediately after the corresponding method and example. Check the skill just taught, with different numbers. Include checks with one unfinished step and checks that require the complete answer. In factorisation, check the common factor, the monic quadratic and the ac method separately.
4. Put **Common mistake** beside the action that causes it. Name the error and its mathematical consequence. Use **Key idea** for an essential rule and **Exam tip** for what the student should show. Use a label, border and tint, with blue, amber and violet respectively in both themes.
5. Put harder applications after core teaching and checks. Retain the full method in the reading sequence when the syllabus requires it. For 9709, repeated roots, the difference of squares and recognising a quadratic in another expression are core. `Further applications` describes the difficulty of a worked application.
6. Add a small bridge when a later lesson supplies a prerequisite. For example, demonstrate a sign test in the discriminant lesson before asking for a parameter interval.

## Mathematics and language

- Write in concise British exam English. Use the same notation in explanations, examples, feedback and the revision sheet. Define each variable and restriction before using it.
- Put each illustration next to the exact equation or inequality it illustrates. Label axes, key coordinates and included/excluded endpoints. State that roots are x-values where the curve **meets** the x-axis. In a zero product, set each factor containing the unknown equal to zero.
- Verify the algebra, exact values, exceptional cases, units and boundary inclusion separately. Read the topic from top to bottom and resolve references such as “this substitution” and “the earlier result” within their section.
- Use [Cambridge 9709 syllabus, section 1.1](https://www.cambridgeinternational.org/Images/697427-2026-2027-syllabus.pdf) to check exam scope. Advise students to use the calculator to check the result, show all necessary working and follow any method specified in the question. When a numerical approximation is required, keep full precision in working and apply the exam’s accuracy rule to the final value. In 9709 this is three significant figures or one decimal place for angles, unless the question specifies a different accuracy.
- Use Arena's KaTeX renderer and reviewed, labelled SVGs for diagrams. A long expression may scroll inside its own region. Break important lines of working at mathematical steps so they fit on a 390 px screen.

## Feedback and revision

- Accept mathematically equivalent complete answers. For discrete roots accept `x = -5 or x = 3`, `-5, 3` and `{-5, 3}`. Reject a missing root and give specific feedback for identifiable errors. Use concise hints and placeholders that match the actual answer type. Distinguish a format problem from a mathematical error.
- Keep checks inside the notes formative. The existing Practice and Review flows record attempts and select fresh variants. Maintain task IDs, answer keys, criteria, marks, drafts and learning history.
- Provide a separate **Quick revision sheet (A4)** for each lesson. Include the method, useful conditions, a diagram or compact table where it clarifies the material, and common mistakes. Include a print or save as PDF control. Use a clean light print layout with no site navigation or interactive fields.

## Acceptance before publication

- Read each Core section in order. Check that the first example, the nearby exercise and all diagrams agree with the stated method. Confirm the answer, hint and worked step independently.
- Test at 1280 px and 390 px in light and dark themes. Compare the headings and examples across widths. Check keyboard navigation, section targets, visible focus, button touch sizes, equations, diagrams and page overflow.
- Test an equivalent answer, a wrong answer, a partial answer and a format error. Open a hint, reveal one step and all steps, use back/forward and follow a direct link. Check that the usual Practice, fresh variant, draft restore and teacher preview still work.
- Print each revision sheet on one A4 page. Inspect the printed formulae and diagrams, page count and margins.
- Use the topic name and syllabus code in the page title. Write an individual description matching the lesson. Give the chapter and each published lesson a stable canonical URL linked from the course. Point practice variants back to their lesson and mark the A4 print view `noindex`.
- Serve headings, diagrams and every worked step in the initial HTML. With JavaScript off, the solutions must be readable. Check that the visible breadcrumb and learning resource match the structured data, and that the sitemap lists only the canonical chapter and lesson URLs for this material. Update each lesson’s `updatedOn` only for a substantive editorial change.
- Test the existing chapter, lesson and Practice URLs and record the reviewed commit or local diff before publication.
