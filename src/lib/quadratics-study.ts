import source from "../../content/original/9709-p1/quadratics-study.json";

type StudyLesson = {
  notes: string[];
  examples: { title: string; question: string; solution: string[] }[];
};

const lessons: Partial<Record<string, StudyLesson>> = source;

export function quadraticsStudy(lessonId: string) {
  const lesson = Object.hasOwn(lessons, lessonId) ? lessons[lessonId] : undefined;
  if (!lesson) return undefined;

  return {
    notes: lesson.notes.join("\n"),
    examples: lesson.examples.map(example => ({
      ...example,
      solution: example.solution.join("\n"),
    })),
  };
}
