import quadratics from "../../content/original/9709-p1/quadratics-study.json";
import functions from "../../content/original/9709-p1/functions-study.json";
import coordinateGeometry from "../../content/original/9709-p1/coordinate-geometry-study.json";
import { renderContent } from "./content";
import { checkExact, AnswerVariableError, type ExactField } from "./exact-answer";
import { answerFormat } from "./square-presentation";
import type { StudyBlock, StudyCheck, StudyCheckResult, StudyLesson, StudySection } from "./study-lesson-model";

type AuthoredCheck = { kind: "check" } & Omit<StudyCheck, "field"> & {
  field: ExactField;
  solution: string;
  retry?: { answer: string; feedback: string }[];
};
type AuthoredBlock = Exclude<StudyBlock, { kind: "check" }> | AuthoredCheck;
type AuthoredLesson = Omit<StudyLesson, "sections"> & {
  updatedOn: string;
  description: string;
  sections: (Omit<StudySection, "blocks"> & { blocks: AuthoredBlock[] })[];
  examples: { title: string; question: string; solution: string[] }[];
  revision: { body: string; checks: string; examTip: string };
};

const lessons = { ...quadratics, ...functions, ...coordinateGeometry } as Record<string, AuthoredLesson>;

function lessonById(id: string) {
  return Object.hasOwn(lessons, id) ? lessons[id] : undefined;
}

export function studyMetadata(lessonId: string) {
  const lesson = lessonById(lessonId);
  return lesson && { updatedOn: lesson.updatedOn, description: lesson.description };
}

// The earlier Quadratics topic view already uses these notes as ordinary HTML.
export function legacyQuadraticsStudy(lessonId: string) {
  const lesson = Object.hasOwn(quadratics, lessonId) ? lessonById(lessonId) : undefined;
  if (!lesson) return undefined;
  return {
    notes: lesson.sections.map(section => [
      "<h2>" + section.title + "</h2>",
      section.intro,
      ...section.blocks.flatMap(block => {
        if (block.kind === "check" || block.kind === "example") return [];
        return [
          ...("title" in block && block.title ? ["<h3>" + block.title + "</h3>"] : []),
          block.html,
          ...("figure" in block && block.figure
            ? ['<p><img src="' + block.figure.src + '" alt="' + block.figure.alt + '"></p>']
            : []),
        ];
      }),
    ].join("\n")).join("\n"),
    examples: lesson.examples.map(example => ({ ...example, solution: example.solution.join("\n") })),
  };
}

function publicBlock(block: AuthoredBlock): StudyBlock {
  if (block.kind === "check") {
    const { key, label, type, variables, dimension } = block.field;
    const field = { key, label, type, variables, dimension };
    return { kind: "check", id: block.id, field, prompt: renderContent(block.prompt), hint: renderContent(block.hint) };
  }
  if (block.kind === "example") return block;
  return {
    ...block,
    html: renderContent(block.html),
    ...("figure" in block && block.figure ? { figure: { ...block.figure, caption: renderContent(block.figure.caption) } } : {}),
  };
}

export function studyLayout(lessonId: string) {
  const lesson = lessonById(lessonId);
  if (!lesson) return undefined;
  const study: StudyLesson = {
    sections: lesson.sections.map(section => ({
      ...section,
      intro: renderContent(section.intro),
      blocks: section.blocks.map(publicBlock),
    })),
    glossary: lesson.glossary.map(word => ({ ...word, definition: renderContent(word.definition) })),
    related: lesson.related,
  };
  const examples = lesson.examples.map(example => ({
    title: example.title,
    question: renderContent(example.question),
    solution: "",
    steps: example.solution.map(step => renderContent(step)),
  }));
  return { study, examples };
}

export function studyRevision(lessonId: string) {
  const lesson = lessonById(lessonId);
  if (!lesson) return undefined;
  const { body, checks, examTip } = lesson.revision;
  return { body: renderContent(body), checks: renderContent(checks), examTip: renderContent(examTip) };
}

export function gradeStudyCheck(lessonId: string, id: string, answer: string): StudyCheckResult | undefined {
  const block = lessonById(lessonId)?.sections.flatMap(section => section.blocks).find(b => b.kind === "check" && b.id === id);
  if (block?.kind !== "check") return undefined;
  const field = block.field;
  try {
    if (checkExact(field, answer, block.prompt)) return { status: "correct", feedback: renderContent(block.solution) };
  } catch (error) {
    if (error instanceof AnswerVariableError) return { status: "retry", feedback: renderContent("<p>" + error.message + "</p>") };
    return { status: "format", feedback: renderContent("<p>" + answerFormat(field).en + "</p>") };
  }

  const matching = block.retry?.find(retry => checkExact({ ...field, expected: retry.answer }, answer, block.prompt));
  return { status: "retry", feedback: renderContent(matching?.feedback ?? block.hint) };
}
