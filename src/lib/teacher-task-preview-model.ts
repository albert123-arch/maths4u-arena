import type { publicVersion } from "./content";
import type { MarkingRow } from "./question-support-model";

type PublicQuestion = ReturnType<typeof publicVersion>;
export type TeacherPreviewAsset = PublicQuestion["assets"][number] & { accessToken?: string; embedded?: boolean };
export type TeacherPreviewQuestion = Omit<PublicQuestion, "assets"> & { assets: TeacherPreviewAsset[] };
export type TeacherPreviewResource = {
  html: string;
  assets: TeacherPreviewAsset[];
  rows?: MarkingRow[];
  total?: number;
};
// A read-only projection of one exact, currently permitted immutable version.
// The question remains answer-free; teacher-only material has separate panels.
export type TeacherTaskPreviewDto = {
  taskId: string;
  versionId: string;
  question: TeacherPreviewQuestion;
  answers: TeacherPreviewResource;
  solution: TeacherPreviewResource;
  guidance: TeacherPreviewResource;
};
