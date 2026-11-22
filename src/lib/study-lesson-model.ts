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
  fields: (SquareField & { inverseAngle?: boolean; labelHtml?: string })[];
  hint: string;
};

export type StudyBlock =
  | { kind: "text" | "further"; title?: string; id?: string; html: string }
  | { kind: "key" | "mistake" | "tip"; html: string; figure?: StudyFigure }
  | { kind: "example"; index: number; tryFirst?: boolean }
  | ({ kind: "check" } & StudyCheck);

export type StudySection = {
  id: string;
  previousIds?: string[];
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
  previousChecks?: StudyCheck[];
  sessions?: StudySession[];
};

export type StudySession = {
  id: string;
  title: string;
  goal: string;
  sections: string[];
  exitChecks: string[];
};

export type StudyCheckpoint = {
  id: string;
  eventKey: string;
  correct: boolean;
  helpUsed: boolean;
  checkedAt: number;
};

export type StudyCheckResult = {
  status: "correct" | "retry" | "format";
  feedback: string;
  checkpoint?: StudyCheckpoint;
};
