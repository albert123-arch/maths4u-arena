# Arena lesson standard

Applies to new and revised Arena teaching pages. The five 9709 Pure Mathematics 1 Quadratics lessons are the reference implementation. Use the same Arena type, spacing, controls and theme tokens in every course.

## Reference for the next chapter

Use the Quadratics edition of 20 November 2026 as the starting point. Open the [chapter](https://arena.maths4u.sbs/courses/maths4u-9709-p1/chapters/quadratics), the [factorisation lesson at the method](https://arena.maths4u.sbs/courses/maths4u-9709-p1/topics/orig_quadratics_factorisation#factorise) and its [one-page revision sheet](https://arena.maths4u.sbs/courses/maths4u-9709-p1/topics/orig_quadratics_factorisation?view=revision).

For Cambridge 9709 chapters, check the current Cambridge syllabus for scope and compare the matching Save My Exams notes for how they introduce a method, explain when to choose it and address common mistakes. Write Maths4U explanations, examples and diagrams independently.

In the reference section a student solves $3x^2=6x$, sees why taking out $3x$ preserves the zero root, then independently solves $2x^2=14x$. The next method has its own example and check. Keep that relationship when writing a different chapter. Choose the number of sections and examples to fit the mathematics.

For each method, draft one row before writing the page. Fill the final column with the mistake the feedback will recognise.

| What can the student now do? | Condition or decision to explain | Worked example and diagram if useful | Fresh independent question | Likely mistake and feedback |
| --- | --- | --- | --- | --- |
| Find both roots after taking out a common factor | Make one side zero before applying the zero-product rule | $3x(x-2)=0$ gives $x=0$ or $x=2$ | Solve $2x^2=14x$ | If only $7$ is entered, direct the student back to the factor $2x$. |

Author desktop, mobile and print from the same reviewed lesson content. The [Quadratics source](../content/original/9709-p1/quadratics-study.json), [study components](../src/components/lesson-study.tsx) and [lesson styles](../src/components/lesson-study.module.css) show how the reference is built.

## Page and navigation

- Keep one indexable page per topic. Use stable section anchors for direct links, including the key steps of longer methods. Preserve the canonical topic URL, task links and the Notes, Examples, Practice, Exam-style and Review entry points.
- Put a short outcome under the lesson title. Use question or action headings that say what the student will learn. The contents list shows section title, Core or Further applications, and approximate study time. Include a short glossary for unfamiliar terms.
- On desktop, place the contents and glossary beside the reading column. On mobile, use a disclosure for the contents and stack diagrams and controls. Render exactly the same text, examples, diagrams, checks and mathematical steps at both widths.
- Place previous and next section links at the end of each section. Use a verified link to a related topic when the same technique will be used again.

## Sequence within a section

1. Start with the idea and the conditions under which it applies. Give the learner enough context to act, then describe the method in numbered steps where order matters.
2. Put the first worked example next to the method. The prompt and at least the first step with its explanation are visible on arrival. Reveal the rest a step at a time or together. A second example may invite the learner to try it first.
3. Place a short **Your turn** check immediately after the corresponding method and example. Check the skill just taught, with different numbers. Include checks with one unfinished step and checks that require the complete answer. In factorisation, check the common factor, the monic quadratic and the ac method separately.
4. Put **Common mistake** beside the action that causes it and explain its consequence. Use **Key idea** for an essential rule and **Exam tip** for what the student should show. The reference uses blue for Key idea, amber for Common mistake and violet for Exam tip. Adjust shades through the shared theme tokens. Keep the written label, visible border and readable contrast in both themes.
5. Put harder applications after core teaching and checks. Retain the full method in the reading sequence when the syllabus requires it. For 9709, repeated roots, the difference of squares and recognising a quadratic in another expression are core. `Further applications` describes the difficulty of a worked application.
6. Add a small bridge when a later lesson supplies a prerequisite. For example, demonstrate a sign test in the discriminant lesson before asking for a parameter interval.

## Mathematics and language

- Write in concise British exam English. Use the same notation in explanations, examples, feedback and the revision sheet. Define each variable and restriction before using it.
- Put each illustration next to the exact equation or inequality it illustrates. Label axes, key coordinates and included/excluded endpoints. State that roots are x-values where the curve **meets** the x-axis. In a zero product, set each factor containing the unknown equal to zero.
- Show the defining diagram on arrival. For completing the square, show which corner completes the area model. In a sketching section, place the finished graph and its equation directly below the section heading so both are visible on a phone. Then explain the construction one step at a time. A graph-reading check can use the labelled sketch. Give a different curve for an independent calculation.
- In Completing the square, keep the closed-interval method in Core. Longer work on open or unbounded domains can have its own **Extension** section with an example and check. The label indicates the reading order. Link directly to Practice at the end of Core.
- In the equations lesson, keep standard substitutions and checking candidates in Core. Put fractional powers and reciprocal sums in Extension. When moving between these two lessons, show exactly what happens to the leading coefficient. Both sides of an equation may be divided by a non-zero number. When rewriting an expression, retain that number as an outside factor.
- Verify the algebra, exact values, exceptional cases, units and boundary inclusion separately. Read the topic from top to bottom and resolve references such as “this substitution” and “the earlier result” within their section.
- Check the topic against the syllabus for its course and examination year. For 9709 Quadratics use section 1.1. Show the working and follow any method specified in the question. A calculator can check the result. For non-exact 9709 answers, round only at the end. The usual precision is three significant figures, with angles in degrees given to one decimal place unless the question specifies otherwise. [9709 syllabus 2026–2027, subject content and degrees of accuracy](https://www.cambridgeinternational.org/Images/697427-2026-2027-syllabus.pdf)
- Use Arena's KaTeX renderer and reviewed, labelled SVGs for diagrams. A long expression may scroll inside its own region. Break important lines of working at mathematical steps so they fit on a 390 px screen.
- Use stacked fractions in questions, worked steps, feedback, diagram labels and printed revision sheets. Use slash notation in keyboard-entry guidance where it helps students type an answer.

## Feedback and revision

- Accept mathematically equivalent complete answers. For discrete roots accept `x = -5 or x = 3`, `-5, 3` and `{-5, 3}`. Reject a missing root and give specific feedback for identifiable errors. Use concise hints and placeholders that match the actual answer type. Distinguish a format problem from a mathematical error.
- Teach both exam and interval notation for a function range. Accept `f(x) ≤ 8`, `y <= 8` and `(−∞, 8]` for the same output set. Test an inclusive boundary, a strict one and a two-sided inequality. When a learner gives a condition on `x`, explain the difference between the input and the output.
- Use the same input conventions for **Your turn**, **Practice** and fresh review variants. Accept chained inequalities, both branches joined by “or”, an interval union, and a labelled scalar such as `b = −4` in the appropriate field. Ask for inequalities in an inequality question, including when the endpoints happen to be roots.
- For coordinate answers, accept `(2, 4), (−1, 1)` or a semicolon between points. Accept a single point as `x = 2, y = 4`. Check the pairing of coordinates, every required point and every included boundary. Test one incomplete answer and one mathematically wrong answer alongside the accepted spellings.
- Keep checks inside the notes formative. The existing Practice and Review flows record attempts and select fresh variants. Maintain task IDs, answer keys, criteria, marks, drafts and learning history.
- Cover each Core practice skill in a Core section or link to the prerequisite that taught it. Place optional extensions after that explanation.
- Start written practice with two or three problems the learner can solve using the lessons studied so far. Put problems requiring later sections under **Mixed chapter practice** and link to the relevant prerequisites. Keep existing question identities and variants.
- Accept ordinary grouped fractions as well as the earlier numerator and denominator entry. Keep the original denominator restrictions. If an exact-answer field receives the rounded value, ask for the exact form in the feedback.
- Provide a separate **Quick revision sheet (A4)** for each lesson. Include the method, useful conditions, a diagram or compact table where it clarifies the material, and common mistakes. Include a print or save as PDF control. Use a clean light print layout with no site navigation or interactive fields.

## Optional lesson videos

- Use video where seeing a change helps the student make a decision, for example as a line moves towards tangency. Use Maths4U's authored examples and artwork. Match the published example, its notation, diagram and restrictions. Pause at a decision, show the reasoning, then send the student to a fresh **Your turn**. Check the independent prompt against the script before recording.
- Place one compact video link under the lesson outcome once the recording is available. Beside a matching example, offer a labelled timestamp such as **Watch the vertex step** in the same recording. Keep the first method visible on a phone. Load the player on selection, reserve its space when opened and include a plain link, English captions and a transcript. Keep the existing Practice and Review rules for mastery.
- The [Quadratics recording plan](ARENA-9709-QUADRATICS-VIDEO-PLAN.md) shows how to match each recording to an example, a section link and the student's next question.

## Acceptance before publication

- Read each Core section in order. Check that the first example, the nearby exercise and all diagrams agree with the stated method. Confirm the answer, hint and worked step independently.
- Test at 1280 px and 390 px in light and dark themes. Compare the headings and examples across widths. On a fresh mobile visit, tap the first visible control once and confirm that it responds. Check keyboard navigation, section targets, visible focus, button touch sizes, equations, diagrams and page overflow.
- Test an equivalent answer, a wrong answer, a partial answer and a format error. Open a hint, reveal one step and all steps, use back/forward and follow a direct link. Check that the usual Practice, fresh variant, draft restore and teacher preview still work.
- Print each revision sheet on one A4 page. Inspect the printed formulae and diagrams, page count and margins.
- Use the topic name and syllabus code in the page title. Write an individual description matching the lesson. Give the chapter and each published lesson a stable canonical URL linked from the course. Point practice variants back to their lesson and mark the A4 print view `noindex`.
- Serve headings, diagrams and every worked step in the initial HTML. With JavaScript off, the solutions must be readable. Check that the visible breadcrumb and learning resource match the structured data, and that the sitemap lists only the canonical chapter and lesson URLs for this material. Update each lesson’s `updatedOn` only for a substantive editorial change.
- Test as a signed-out reader from the course to the chapter, through a lesson section and into Practice. Check the canonical destination of older chapter links. Record the reviewed commit or local diff and the evidence for the mobile, print and answer checks. If reporting Google indexing, use the URL Inspection result for that URL and date.
