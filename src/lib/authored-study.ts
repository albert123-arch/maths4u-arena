import quadratics from "../../content/original/9709-p1/quadratics-study.json";
import functions from "../../content/original/9709-p1/functions-study.json";
import coordinateGeometry from "../../content/original/9709-p1/coordinate-geometry-study.json";
import circularMeasure from "../../content/original/9709-p1/circular-measure-study.json";
import trigonometry from "../../content/original/9709-p1/trigonometry-study.json";
import series from "../../content/original/9709-p1/series-study.json";
import binomialExpansion from "../../content/original/9709-p1/binomial-expansion-study.json";
import differentiation from "../../content/original/9709-p1/differentiation-study.json";
import integration from "../../content/original/9709-p1/integration-study.json";
import crossTopic from "../../content/original/9709-p1/cross-topic-revision-study.json";
import pure3Algebra from "../../content/original/9709-p3/algebra-study.json";
import pure3FurtherAlgebra from "../../content/original/9709-p3/algebra-extensions-study.json";
import pure3Logarithms from "../../content/original/9709-p3/logarithmic-and-exponential-functions-study.json";
import pure3Trigonometry from "../../content/original/9709-p3/trigonometry-study.json";
import pure3Differentiation from "../../content/original/9709-p3/differentiation-study.json";
import pure3Integration from "../../content/original/9709-p3/integration-study.json";
import pure3NumericalMethods from "../../content/original/9709-p3/numerical-methods-study.json";
import pure3Vectors from "../../content/original/9709-p3/vectors-study.json";
import pure3DifferentialEquations from "../../content/original/9709-p3/differential-equations-study.json";
import pure3ComplexNumbers from "../../content/original/9709-p3/complex-numbers-study.json";
import mechanicsForcesStudy from "../../content/original/9709-m1/forces-and-equilibrium-study.json";
import mechanicsKinematicsStudy from "../../content/original/9709-m1/kinematics-study.json";
import mechanicsMomentumStudy from "../../content/original/9709-m1/momentum-study.json";
import mechanicsNewtonStudy from "../../content/original/9709-m1/newtons-laws-study.json";
import mechanicsEnergyStudy from "../../content/original/9709-m1/energy-work-power-study.json";
import representation from "../../content/original/9709-s1/representation-study.json";
import centralTendency from "../../content/original/9709-s1/central-tendency-study.json";
import variation from "../../content/original/9709-s1/variation-study.json";
import probability from "../../content/original/9709-s1/probability-study.json";
import counting from "../../content/original/9709-s1/counting-study.json";
import distributions from "../../content/original/9709-s1/distributions-study.json";
import binomialGeometric from "../../content/original/9709-s1/binomial-geometric-study.json";
import normal from "../../content/original/9709-s1/normal-study.json";
import study9231Fp1Roots from "../../content/original/9231-fp1/roots-study.json";
import study9231Fp1Rational from "../../content/original/9231-fp1/rational-study.json";
import study9231Fp1Summation from "../../content/original/9231-fp1/summation-study.json";
import study9231Fp1Matrices1 from "../../content/original/9231-fp1/matrices1-study.json";
import study9231Fp1Polar from "../../content/original/9231-fp1/polar-study.json";
import study9231Fp1Vectors from "../../content/original/9231-fp1/vectors-study.json";
import study9231Fp1Induction from "../../content/original/9231-fp1/induction-study.json";
import study9231Fp2Hyperbolic from "../../content/original/9231-fp2/hyperbolic-study.json";
import study9231Fp2Matrices2 from "../../content/original/9231-fp2/matrices2-study.json";
import study9231Fp2Differentiation from "../../content/original/9231-fp2/differentiation-study.json";
import study9231Fp2Integration from "../../content/original/9231-fp2/integration-study.json";
import study9231Fp2Complex from "../../content/original/9231-fp2/complex-study.json";
import study9231Fp2Ode from "../../content/original/9231-fp2/ode-study.json";
import study9231MechanicsProjectiles from "../../content/original/9231-mechanics/projectiles-study.json";
import study9231MechanicsEquilibrium from "../../content/original/9231-mechanics/equilibrium-study.json";
import study9231MechanicsCircular from "../../content/original/9231-mechanics/circular-study.json";
import study9231MechanicsHooke from "../../content/original/9231-mechanics/hooke-study.json";
import study9231MechanicsVariable from "../../content/original/9231-mechanics/variable-study.json";
import study9231MechanicsMomentum from "../../content/original/9231-mechanics/momentum-study.json";
import study9231StatisticsCrv from "../../content/original/9231-statistics/crv-study.json";
import study9231StatisticsInference from "../../content/original/9231-statistics/inference-study.json";
import study9231StatisticsChi2 from "../../content/original/9231-statistics/chi2-study.json";
import study9231StatisticsNonparam from "../../content/original/9231-statistics/nonparam-study.json";
import study9231StatisticsPgf from "../../content/original/9231-statistics/pgf-study.json";
import examPracticePaths from "../../content/original/9709-p1/exam-practice-paths.json";
import { renderContent } from "./content";
import { checkExact, checkExactInverseAngle, checkThreeSignificantFigures, isRoundedNumberAnswer, AnswerVariableError, type ExactField, type InverseAngle } from "./exact-answer";
import { answerFormat, exactValueFeedback } from "./square-presentation";
import { fourPlaceFeedback, needsFourPlaceFeedback, permitsThreeSignificantFigures, s1FourDecimalPlaces, s1StudyRounding } from "./s1-answer-precision";
import type { StudyBlock, StudyCheck, StudyCheckResult, StudyExamPractice, StudyLesson, StudySection } from "./study-lesson-model";

type Retry = { answer: string; feedback: string }[];
type StudyField = ExactField & { inverseAngle?: InverseAngle; retry?: Retry };
type AuthoredCheck = { kind: "check"; solution: string } & Omit<StudyCheck, "fields"> & (
  | { field: ExactField; retry?: Retry }
  | { fields: StudyField[] }
);
type AuthoredBlock = Exclude<StudyBlock, { kind: "check" }> | AuthoredCheck;
type AuthoredLesson = Omit<StudyLesson, "sections" | "extraPractice"> & {
  updatedOn: string;
  description: string;
  sections: (Omit<StudySection, "blocks"> & { blocks: AuthoredBlock[] })[];
  examples: { title: string; question: string; solution: string[] }[];
  revision: { body: string; checks: string; examTip: string };
  extraPractice?: AuthoredCheck[];
};

const lessons = {
  ...quadratics, ...functions, ...coordinateGeometry, ...circularMeasure, ...trigonometry,
  ...series, ...binomialExpansion, ...differentiation, ...integration, ...crossTopic,
  ...pure3Algebra, ...pure3FurtherAlgebra, ...pure3Logarithms, ...pure3Trigonometry, ...pure3Differentiation, ...pure3Integration, ...pure3NumericalMethods, ...pure3Vectors, ...pure3DifferentialEquations, ...pure3ComplexNumbers, ...mechanicsForcesStudy, ...mechanicsKinematicsStudy, ...mechanicsMomentumStudy, ...mechanicsNewtonStudy, ...mechanicsEnergyStudy,
  ...representation, ...centralTendency, ...variation, ...probability,
  ...counting, ...distributions, ...binomialGeometric, ...normal,
  ...study9231Fp1Roots,
  ...study9231Fp1Rational,
  ...study9231Fp1Summation,
  ...study9231Fp1Matrices1,
  ...study9231Fp1Polar,
  ...study9231Fp1Vectors,
  ...study9231Fp1Induction,
  ...study9231Fp2Hyperbolic,
  ...study9231Fp2Matrices2,
  ...study9231Fp2Differentiation,
  ...study9231Fp2Integration,
  ...study9231Fp2Complex,
  ...study9231Fp2Ode,
  ...study9231MechanicsProjectiles,
  ...study9231MechanicsEquilibrium,
  ...study9231MechanicsCircular,
  ...study9231MechanicsHooke,
  ...study9231MechanicsVariable,
  ...study9231MechanicsMomentum,
  ...study9231StatisticsCrv,
  ...study9231StatisticsInference,
  ...study9231StatisticsChi2,
  ...study9231StatisticsNonparam,
  ...study9231StatisticsPgf,
} as Record<string, AuthoredLesson>;
const examPaths = examPracticePaths as Record<string, Omit<StudyExamPractice, "starters"> & { starters?: StudyExamPractice["starters"] }>;

function lessonById(id: string) {
  return Object.hasOwn(lessons, id) ? lessons[id] : undefined;
}

export function hasOriginalRevisionStudy(lessonId: string) {
  return Object.hasOwn(crossTopic, lessonId);
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

function authoredFields(check: AuthoredCheck): StudyField[] {
  return "fields" in check ? check.fields : [{ ...check.field, retry: check.retry }];
}

function publicCheck(check: AuthoredCheck, s1Rounding: boolean): { kind: "check" } & StudyCheck {
  return {
    kind: "check",
    id: check.id,
    title: check.title,
    prompt: renderContent(check.prompt),
    hint: renderContent(check.hint),
    fields: authoredFields(check).map(field => {
      const { key, label, type, variables, dimension, options, inverseAngle } = field;
      const round = s1Rounding && permitsThreeSignificantFigures(check.id, field, check.prompt);
      return {
        key, label, type, variables, dimension,
        ...(/[\\$]/.test(label) && { labelHtml: renderContent(label) }),
        ...(options && { options: Object.fromEntries(Object.entries(options).map(([value, html]) => [value, renderContent(html)])) }),
        ...(inverseAngle && { inverseAngle: true }),
        ...(round && { significantFigures: 3 as const }),
        ...(s1Rounding && s1FourDecimalPlaces(check.id, field, check.prompt) && { decimalPlaces: 4 as const }),
      };
    }),
  };
}

function publicBlock(block: AuthoredBlock, s1Rounding: boolean): StudyBlock {
  if (block.kind === "check") return publicCheck(block, s1Rounding);
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
  const path = examPaths[lessonId] ?? lesson.examPractice;
  const s1Rounding = s1StudyRounding(lessonId);
  const study: StudyLesson = {
    sections: lesson.sections.map(section => ({
      ...section,
      intro: renderContent(section.intro),
      blocks: section.blocks.map(block => publicBlock(block, s1Rounding)),
    })),
    glossary: lesson.glossary.map(word => ({ ...word, definition: renderContent(word.definition) })),
    related: lesson.related,
    ...(lesson.extraPractice && { extraPractice: lesson.extraPractice.map(check => publicCheck(check, s1Rounding)) }),
    ...(path && { examPractice: {
      needs: path.needs,
      starters: (path.starters ?? []).map(q => ({
        ...q, question: renderContent(q.question), solution: renderContent(q.solution),
        ...(q.hint && { hint: renderContent(q.hint) }),
        ...(q.marking && { marking: renderContent(q.marking) }),
      })),
    } }),
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

function studyAnswerMatches(field: StudyField, answer: string, prompt: string) {
  return field.inverseAngle ? checkExactInverseAngle(field, answer, field.inverseAngle) : checkExact(field, answer, prompt);
}

function fieldFeedback(field: StudyField, answer: string, check: AuthoredCheck, s1Rounding: boolean): StudyCheckResult | undefined {
  const round = s1Rounding && permitsThreeSignificantFigures(check.id, field, check.prompt);
  const fourPlaces = s1Rounding && s1FourDecimalPlaces(check.id, field, check.prompt);
  const format = { ...field, ...(round && { significantFigures: 3 as const }), ...(fourPlaces && { decimalPlaces: 4 as const }) };
  try {
    const correct = round ? checkThreeSignificantFigures(field, answer, check.prompt) : studyAnswerMatches(field, answer, check.prompt);
    if (fourPlaces && needsFourPlaceFeedback(field, answer, correct)) {
      return { status: "retry", feedback: renderContent("<p>" + fourPlaceFeedback + "</p>") };
    }
    if (correct) return undefined;
    if (!field.inverseAngle && isRoundedNumberAnswer(field, answer)) {
      return { status: "retry", feedback: renderContent("<p>" + (round ? answerFormat(format).en : exactValueFeedback) + "</p>") };
    }
  } catch (error) {
    if (error instanceof AnswerVariableError) return {
      status: error.formatOnly ? "format" : "retry",
      feedback: renderContent("<p>" + error.message + "</p>"),
    };
    return { status: "format", feedback: renderContent("<p>" + answerFormat(format).en + "</p>") };
  }

  const matching = field.retry?.find(retry => {
    try { return studyAnswerMatches({ ...field, expected: retry.answer }, answer, check.prompt); }
    catch { return false; }
  });
  const exactAngleHint = field.inverseAngle ? "<p>Use exact inverse trigonometric notation where needed.</p>" : "";
  return { status: "retry", feedback: renderContent(matching?.feedback ?? exactAngleHint + check.hint) };
}

export function gradeStudyCheck(lessonId: string, id: string, answers: string | Record<string, string>): StudyCheckResult | undefined {
  const lesson = lessonById(lessonId);
  const block = lesson?.sections.flatMap(section => section.blocks).find(b => b.kind === "check" && b.id === id)
    ?? lesson?.extraPractice?.find(b => b.id === id);
  if (block?.kind !== "check") return undefined;
  const fields = authoredFields(block);
  const values = typeof answers === "string" ? { [fields[0].key]: answers } : answers;
  if (Object.keys(values).length !== fields.length || fields.some(field => !Object.hasOwn(values, field.key) || !values[field.key]?.trim())) {
    return { status: "format", feedback: "<p>Enter an answer in every field.</p>" };
  }
  const s1Rounding = s1StudyRounding(lessonId);
  for (const field of fields) {
    const result = fieldFeedback(field, values[field.key], block, s1Rounding);
    if (result) return fields.length === 1 ? result : {
      ...result, feedback: renderContent("<p><strong>" + field.label + "</strong></p>") + result.feedback,
    };
  }
  return { status: "correct", feedback: renderContent(block.solution) };
}
