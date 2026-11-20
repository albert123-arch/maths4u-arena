import type { SquareField } from "./square-model";

export type StudyFigure = {
  src: string;
  alt: string;
  caption: string;
  width: number;
  height: number;
};

export type StudyCheck = {
  id: string;
  title?: string;
  prompt: string;
  fields: (SquareField & { inverseAngle?: boolean })[];
  hint: string;
};

export type StudyBlock =
  | { kind: "text" | "further"; title?: string; id?: string; html: string }
  | { kind: "key" | "mistake" | "tip"; html: string; figure?: StudyFigure }
  | { kind: "example"; index: number; tryFirst?: boolean }
  | ({ kind: "check" } & StudyCheck);

export type StudySection = {
  id: string;
  title: string;
  label: string;
  minutes: number;
  level: "core" | "further" | "extension";
  intro: string;
  blocks: StudyBlock[];
};

export type StudyPaperQuestion = {
  id: string;
  title: string;
  marks: number;
  question: string;
  solution: string;
  hint?: string;
  marking?: string;
};

export type StudyExamPractice = {
  starters: StudyPaperQuestion[];
  needs: Record<string, string[]>;
};

export type StudyLesson = {
  sections: StudySection[];
  glossary: { term: string; definition: string }[];
  related?: { title: string; href: string }[];
  examPractice?: StudyExamPractice;
  extraPractice?: StudyCheck[];
};

export type StudyCheckResult = {
  status: "correct" | "retry" | "format";
  feedback: string;
};
