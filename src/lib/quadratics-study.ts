import source from "../../content/original/9709-p1/quadratics-study.json";
import { renderContent } from "./content";
import { checkExact, type ExactField } from "./exact-answer";
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

const lessons = source as Record<string, AuthoredLesson>;

function lessonById(id: string) {
  return Object.hasOwn(lessons, id) ? lessons[id] : undefined;
}

export function quadraticsStudyMetadata(lessonId: string) {
  const lesson = lessonById(lessonId);
  return lesson && { updatedOn: lesson.updatedOn, description: lesson.description };
}

// The earlier topic view can read the same content as ordinary HTML.
export function quadraticsStudy(lessonId: string) {
  const lesson = lessonById(lessonId);
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
    const field = { key: block.field.key, label: block.field.label, type: block.field.type };
    return { kind: "check", id: block.id, field, prompt: renderContent(block.prompt), hint: renderContent(block.hint) };
  }
  if (block.kind === "example") return block;
  return {
    ...block,
    html: renderContent(block.html),
    ...("figure" in block && block.figure ? { figure: { ...block.figure, caption: renderContent(block.figure.caption) } } : {}),
  };
}

export function quadraticsStudyLayout(lessonId: string) {
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

export function quadraticsRevision(lessonId: string) {
  const lesson = lessonById(lessonId);
  if (!lesson) return undefined;
  const { body, checks, examTip } = lesson.revision;
  return { body: renderContent(body), checks: renderContent(checks), examTip: renderContent(examTip) };
}

export function gradeQuadraticsStudyCheck(lessonId: string, id: string, answer: string): StudyCheckResult | undefined {
  const block = lessonById(lessonId)?.sections.flatMap(section => section.blocks).find(b => b.kind === "check" && b.id === id);
  if (block?.kind !== "check") return undefined;
  const field = block.field;
  try {
    if (checkExact(field, answer)) return { status: "correct", feedback: renderContent(block.solution) };
  } catch {
    return { status: "format", feedback: renderContent("<p>" + answerFormat(field).en + "</p>") };
  }

  const matching = block.retry?.find(retry => checkExact({ ...field, expected: retry.answer }, answer));
  return { status: "retry", feedback: renderContent(matching?.feedback ?? block.hint) };
}
