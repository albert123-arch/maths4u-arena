// Server-only registry: never import package JSON from a client component.
import roots from "../../content/original/9231-fp1/roots-v1.json";
import rational from "../../content/original/9231-fp1/rational-v1.json";
import summation from "../../content/original/9231-fp1/summation-v1.json";
import vectors from "../../content/original/9231-fp1/vectors-v1.json";
import induction from "../../content/original/9231-fp1/induction-v1.json";
import statsCrv from "../../content/original/9231-statistics/crv-v1.json";
import statsInference from "../../content/original/9231-statistics/inference-v1.json";
import statsChi2 from "../../content/original/9231-statistics/chi2-v1.0.1.json";
import statsNonparam from "../../content/original/9231-statistics/nonparam-v1.json";
import statsPgf from "../../content/original/9231-statistics/pgf-v1.json";
import fp2Hyperbolic from "../../content/original/9231-fp2/hyperbolic-v1.json";
import fp2Matrices2 from "../../content/original/9231-fp2/matrices2-v1.0.1.json";
import mechanicsVariable from "../../content/original/9231-mechanics/variable-v1.json";
import mechanicsMomentum from "../../content/original/9231-mechanics/momentum-v1.json";
import mechanicsHooke from "../../content/original/9231-mechanics/hooke-v1.json";
import mechanicsCircular from "../../content/original/9231-mechanics/circular-v1.json";
import mechanicsEquilibrium from "../../content/original/9231-mechanics/equilibrium-v1.json";
import mechanicsProjectiles from "../../content/original/9231-mechanics/projectiles-v1.json";
import fp2Ode from "../../content/original/9231-fp2/ode-v1.json";
import fp2Complex from "../../content/original/9231-fp2/complex-v1.json";
import fp2Integration from "../../content/original/9231-fp2/integration-v1.json";
import fp2Differentiation from "../../content/original/9231-fp2/differentiation-v1.json";
import polar from "../../content/original/9231-fp1/polar-v1.json";
import matrices1 from "../../content/original/9231-fp1/matrices1-v1.json";
import p1Quadratics from "../../content/original/9709-p1/quadratics-v1.json";
import p1Functions from "../../content/original/9709-p1/functions-v1.json";
import p1CoordinateGeometry from "../../content/original/9709-p1/coordinate-geometry-v1.json";
import p1CircularMeasure from "../../content/original/9709-p1/circular-measure-v1.json";
import p1Trigonometry from "../../content/original/9709-p1/trigonometry-v1.json";
import p1Series from "../../content/original/9709-p1/series-v1.json";
import p1BinomialExpansion from "../../content/original/9709-p1/binomial-expansion-v1.json";
import p1Differentiation from "../../content/original/9709-p1/differentiation-v1.json";
import p1Integration from "../../content/original/9709-p1/integration-v1.json";
import p3Algebra from "../../content/original/9709-p3/algebra-v1.json";
import p3FurtherAlgebra from "../../content/original/9709-p3/algebra-extensions-v1.json";
import p3Logarithms from "../../content/original/9709-p3/logarithmic-and-exponential-functions-v1.json";
import p3Trigonometry from "../../content/original/9709-p3/trigonometry-v1.json";
import p3Differentiation from "../../content/original/9709-p3/differentiation-v1.json";
import p3Integration from "../../content/original/9709-p3/integration-v1.json";
import p3NumericalMethods from "../../content/original/9709-p3/numerical-methods-v1.json";
import p3Vectors from "../../content/original/9709-p3/vectors-v1.json";
import p3DifferentialEquations from "../../content/original/9709-p3/differential-equations-v1.json";
import p3ComplexNumbers from "../../content/original/9709-p3/complex-numbers-v1.json";
import m1Forces from "../../content/original/9709-m1/forces-and-equilibrium-v1.json";
import m1Kinematics from "../../content/original/9709-m1/kinematics-v1.json";
import m1Momentum from "../../content/original/9709-m1/momentum-v1.json";
import m1Newton from "../../content/original/9709-m1/newtons-laws-v1.json";
import m1Energy from "../../content/original/9709-m1/energy-work-power-v1.json";
import s1Representation from "../../content/original/9709-s1/representation-v1.json";
import s1CentralTendency from "../../content/original/9709-s1/central-tendency-v1.json";
import s1Variation from "../../content/original/9709-s1/variation-v1.json";
import s1Probability from "../../content/original/9709-s1/probability-v1.json";
import s1Counting from "../../content/original/9709-s1/counting-v1.json";
import s1Distributions from "../../content/original/9709-s1/distributions-v1.json";
import s1BinomialGeometric from "../../content/original/9709-s1/binomial-geometric-v1.json";
import s1Normal from "../../content/original/9709-s1/normal-v1.json";
import { contentPackageSchema, type ContentPackage } from "./content-package-schema";
import igcseNumberTypes from "../../content/original/0580/number-types-v1.json";
import igcsePowersRoots from "../../content/original/0580/powers-roots-v1.json";
import igcseNumberSets from "../../content/original/0580/number-sets-v1.json";
import igcseFourOperations from "../../content/original/0580/four-operations-v1.json";
import igcseEquivalentForms from "../../content/original/0580/fractions-decimals-percentages-v1.json";
import igcseOrdering from "../../content/original/0580/ordering-v1.json";
import igcseIndicesI from "../../content/original/0580/indices-i-v1.json";
import igcseStandardForm from "../../content/original/0580/standard-form-v1.json";
import igcseEstimation from "../../content/original/0580/estimation-v1.json";
import igcseCoordinate from "../../content/original/0580/coordinate-geometry-v1.json";
import igcseGeometry from "../../content/original/0580/geometry-v1.json";
import igcseMensuration from "../../content/original/0580/mensuration-v1.json";
import igcseTrigonometry from "../../content/original/0580/trigonometry-v1.json";
import igcseTransformations from "../../content/original/0580/transformations-vectors-v1.json";
import igcseProbability from "../../content/original/0580/probability-v1.json";
import igcseStatistics from "../../content/original/0580/statistics-v1.json";
import addmathsFunctions from "../../content/original/0606/functions-v1.json";
import addmathsQuadratics from "../../content/original/0606/quadratics-simultaneous-v1.json";
import addmathsPolynomials from "../../content/original/0606/factors-polynomials-v1.json";
import addmathsEquations from "../../content/original/0606/equations-inequalities-graphs-v1.json";
import addmathsLogarithms from "../../content/original/0606/logarithms-exponentials-v1.json";
import addmathsStraightLine from "../../content/original/0606/straight-line-graphs-v1.json";
import logarithmsRevision from "../../content/original/0606/logarithms-exponentials-revision.json";
import straightLineRevision from "../../content/original/0606/straight-line-graphs-revision.json";
import addmathsCircle from "../../content/original/0606/coordinate-circle-v1.json";
import addmathsCircularMeasure from "../../content/original/0606/circular-measure-v1.json";
import addmathsTrigonometry from "../../content/original/0606/trigonometry-v1.json";
import addmathsCounting from "../../content/original/0606/permutations-combinations-v1.json";
import addmathsSeries from "../../content/original/0606/series-v1.json";
import addmathsDifferentiation1 from "../../content/original/0606/differentiation-1-v1.json";
import differentiation1Revision from "../../content/original/0606/differentiation-1-revision.json";
import addmathsVectors from "../../content/original/0606/vectors-v1.json";
import addmathsDifferentiation2 from "../../content/original/0606/differentiation-2-v1.json";
import differentiation2Revision from "../../content/original/0606/differentiation-2-revision.json";
import addmathsIntegration from "../../content/original/0606/integration-v1.json";
import integrationRevision from "../../content/original/0606/integration-revision.json";
import addmathsKinematics from "../../content/original/0606/kinematics-v1.json";
import igcseFunctions from "../../content/original/0580/functions-v1.json";
import igcseDiff from "../../content/original/0580/differentiation-v1.json";
import igcseGraphsFunctions from "../../content/original/0580/graphs-of-functions-v1.json";
import igcseSketching from "../../content/original/0580/sketching-curves-v1.json";
import igcsePracticalGraphs from "../../content/original/0580/practical-graphs-v1.json";
import igcseDirectInverse from "../../content/original/0580/algebra-proportion-v1.json";
import igcseSequences from "../../content/original/0580/sequences-v1.json";
import igcseInequalities from "../../content/original/0580/inequalities-v1.json";
import igcseEquations from "../../content/original/0580/equations-v1.json";
import igcseIndicesII from "../../content/original/0580/indices-ii-v1.json";
import igcseAlgebraicFractions from "../../content/original/0580/algebraic-fractions-v1.json";
import igcseManipulation from "../../content/original/0580/algebraic-manipulation-v1.json";
import igcseIntroAlgebra from "../../content/original/0580/introduction-to-algebra-v1.json";
import igcseSurds from "../../content/original/0580/surds-v1.json";
import igcseGrowthDecay from "../../content/original/0580/exponential-growth-decay-v1.json";
import igcseMoney from "../../content/original/0580/money-v1.json";
import igcseTime from "../../content/original/0580/time-v1.json";
import igcseCalculator from "../../content/original/0580/using-a-calculator-v1.json";
import igcsePercentages from "../../content/original/0580/percentages-v1.json";
import igcseRates from "../../content/original/0580/rates-v1.json";
import igcseRatioProportion from "../../content/original/0580/ratio-proportion-v1.json";
import igcseLimitsOfAccuracy from "../../content/original/0580/limits-of-accuracy-v1.json";
import stage7NumberCalculation from "../../content/original/0862/stage-7-number-calculation-v1.json";
import stage7Algebra from "../../content/original/0862/stage-7-algebra-v1.json";
import stage7ShapeMeasure from "../../content/original/0862/stage-7-shape-measure-v1.json";
import stage7FractionsRatio from "../../content/original/0862/stage-7-fractions-ratio-v1.json";
import stage7Probability from "../../content/original/0862/stage-7-probability-v1.json";
import stage7SequencesGraphs from "../../content/original/0862/stage-7-sequences-graphs-v1.json";
import stage7PositionTransform from "../../content/original/0862/stage-7-position-transform-v1.json";
import stage7Statistics from "../../content/original/0862/stage-7-statistics-v1.json";
import stage7MathematicalThinking from "../../content/original/0862/stage-7-mathematical-thinking-v1.json";
import stage8NumberCalculation from "../../content/original/0862/stage-8-number-calculation-v1.json";
import stage8ExpressionsEquations from "../../content/original/0862/stage-8-expressions-equations-v1.json";
import stage8ShapeMeasure from "../../content/original/0862/stage-8-shape-measure-v1.json";
import stage8FractionsRatio from "../../content/original/0862/stage-8-fractions-ratio-v1.json";
import stage8Probability from "../../content/original/0862/stage-8-probability-v1.json";
import stage8AnglesConstruction from "../../content/original/0862/stage-8-angles-construction-v1.json";
import stage8SequencesGraphs from "../../content/original/0862/stage-8-sequences-graphs-v1.json";
import stage8Transformations from "../../content/original/0862/stage-8-transformations-v1.json";
import stage8Statistics from "../../content/original/0862/stage-8-statistics-v1.json";
import stage8MathematicalThinking from "../../content/original/0862/stage-8-mathematical-thinking-v1.json";
import stage9NumberAndCalculation from "../../content/original/0862/stage-9-number-and-calculation-v1.json";
import stage9AlgebraicRepresentation from "../../content/original/0862/stage-9-algebraic-representation-v1.json";
import stage9ShapeAndMeasure from "../../content/original/0862/stage-9-shape-and-measure-v1.json";
import stage9FractionsRatioProportion from "../../content/original/0862/stage-9-fractions-ratio-proportion-v1.json";
import stage9Probability from "../../content/original/0862/stage-9-probability-v1.json";
import stage9AnglesAndConstructions from "../../content/original/0862/stage-9-angles-and-constructions-v1.json";
import stage9SequencesFunctionsGraphs from "../../content/original/0862/stage-9-sequences-functions-graphs-v1.json";
import stage9Transformations from "../../content/original/0862/stage-9-transformations-v1.json";
import stage9Statistics from "../../content/original/0862/stage-9-statistics-v1.json";
import stage9CheckpointReview from "../../content/original/0862/stage-9-checkpoint-review-v1.json";
import stage9MathematicalThinking from "../../content/original/0862/stage-9-mathematical-thinking-v1.json";
import { notationProgressPolicy } from "./content-progress-policy";
import type { QuadraticTopic } from "./square-model";
import { practicePrecisionPolicy } from "./lesson-answer-precision";
import { reviseQuestionBank } from "./content-package-revision";
export const contentPackages: ContentPackage[] = [contentPackageSchema.parse(roots),contentPackageSchema.parse(rational),contentPackageSchema.parse(summation),contentPackageSchema.parse(matrices1),contentPackageSchema.parse(polar),contentPackageSchema.parse(vectors),contentPackageSchema.parse(induction),contentPackageSchema.parse(statsCrv),contentPackageSchema.parse(statsInference),contentPackageSchema.parse(statsChi2),contentPackageSchema.parse(statsNonparam),contentPackageSchema.parse(statsPgf),contentPackageSchema.parse(fp2Hyperbolic),contentPackageSchema.parse(fp2Matrices2),contentPackageSchema.parse(fp2Differentiation),contentPackageSchema.parse(fp2Integration),contentPackageSchema.parse(fp2Complex),contentPackageSchema.parse(fp2Ode),contentPackageSchema.parse(mechanicsProjectiles),contentPackageSchema.parse(mechanicsEquilibrium),contentPackageSchema.parse(mechanicsCircular),contentPackageSchema.parse(mechanicsHooke),contentPackageSchema.parse(mechanicsVariable),contentPackageSchema.parse(mechanicsMomentum),contentPackageSchema.parse(p1Quadratics),contentPackageSchema.parse(p1Functions),contentPackageSchema.parse(p1CoordinateGeometry),contentPackageSchema.parse(p1CircularMeasure),contentPackageSchema.parse(p1Trigonometry),contentPackageSchema.parse(p1Series),contentPackageSchema.parse(p1BinomialExpansion),contentPackageSchema.parse(p1Differentiation),contentPackageSchema.parse(p1Integration),contentPackageSchema.parse(p3Algebra),contentPackageSchema.parse(p3FurtherAlgebra),contentPackageSchema.parse(p3Logarithms),contentPackageSchema.parse(p3Trigonometry),contentPackageSchema.parse(p3Differentiation),contentPackageSchema.parse(p3Integration),contentPackageSchema.parse(p3NumericalMethods),contentPackageSchema.parse(p3Vectors),contentPackageSchema.parse(p3DifferentialEquations),contentPackageSchema.parse(p3ComplexNumbers),contentPackageSchema.parse(m1Forces),contentPackageSchema.parse(m1Kinematics),contentPackageSchema.parse(m1Momentum),contentPackageSchema.parse(m1Newton),contentPackageSchema.parse(m1Energy),contentPackageSchema.parse(s1Representation),contentPackageSchema.parse(s1CentralTendency),contentPackageSchema.parse(s1Variation),contentPackageSchema.parse(s1Probability),contentPackageSchema.parse(s1Counting),contentPackageSchema.parse(s1Distributions),contentPackageSchema.parse(s1BinomialGeometric),contentPackageSchema.parse(s1Normal)];
export function contentPackage(key: string, version?: string) {
  const latest = contentPackages.find(p => p.key === key);
  const p = !version || latest?.version === version ? latest : bankRevisions.get(key)?.previous;
  if (!p || version && p.version !== version) throw Error("UNKNOWN_CONTENT_PACKAGE");
  return p;
}
const igcsePackages = [igcseNumberTypes, igcseNumberSets, igcsePowersRoots, igcseEquivalentForms, igcseOrdering, igcseFourOperations, igcseIndicesI, igcseStandardForm, igcseEstimation, igcseLimitsOfAccuracy, igcseRatioProportion, igcseRates, igcsePercentages, igcseCalculator, igcseTime, igcseMoney, igcseGrowthDecay, igcseSurds, igcseIntroAlgebra, igcseManipulation, igcseAlgebraicFractions, igcseIndicesII, igcseEquations, igcseInequalities, igcseSequences, igcseDirectInverse, igcsePracticalGraphs, igcseGraphsFunctions, igcseSketching, igcseDiff, igcseFunctions, igcseCoordinate, igcseGeometry, igcseMensuration, igcseTrigonometry, igcseTransformations, igcseProbability, igcseStatistics];
contentPackages.push(...igcsePackages.map(p => contentPackageSchema.parse(p)));
const addmathsPackages = [
  addmathsFunctions,
  addmathsQuadratics,
  addmathsPolynomials,
  addmathsEquations,
  addmathsLogarithms,
  addmathsStraightLine,
  addmathsCircle,
  addmathsCircularMeasure,
  addmathsTrigonometry,
  addmathsCounting,
  addmathsSeries,
  addmathsDifferentiation1,
  addmathsVectors,
  addmathsDifferentiation2,
  addmathsIntegration,
  addmathsKinematics,
];
const bankRevisions = new Map([
  reviseQuestionBank(addmathsLogarithms, logarithmsRevision),
  reviseQuestionBank(addmathsStraightLine, straightLineRevision),
  reviseQuestionBank(addmathsDifferentiation1, differentiation1Revision),
  reviseQuestionBank(addmathsDifferentiation2, differentiation2Revision),
  reviseQuestionBank(addmathsIntegration, integrationRevision),
].map(revision => [revision.current.key, revision]));
export function bankRevision(key: string) { return bankRevisions.get(key); }
export function questionPackageVersion(p: ContentPackage, uid: string) {
  const revision = bankRevision(p.key);
  return revision?.current.version === p.version && !revision.changed.has(uid) ? revision.previous.version : p.version;
}
contentPackages.push(...addmathsPackages.map(p => bankRevision(p.key)?.current ?? contentPackageSchema.parse(p)));
const lowerSecondaryPackages = [
  stage7NumberCalculation,
  stage7Algebra,
  stage7ShapeMeasure,
  stage7FractionsRatio,
  stage7Probability,
  stage7SequencesGraphs,
  stage7PositionTransform,
  stage7Statistics,
  stage7MathematicalThinking,
  stage8NumberCalculation,
  stage8ExpressionsEquations,
  stage8ShapeMeasure,
  stage8FractionsRatio,
  stage8Probability,
  stage8AnglesConstruction,
  stage8SequencesGraphs,
  stage8Transformations,
  stage8Statistics,
  stage8MathematicalThinking,
  stage9NumberAndCalculation,
  stage9AlgebraicRepresentation,
  stage9ShapeAndMeasure,
  stage9FractionsRatioProportion,
  stage9Probability,
  stage9AnglesAndConstructions,
  stage9SequencesFunctionsGraphs,
  stage9Transformations,
  stage9Statistics,
  stage9CheckpointReview,
  stage9MathematicalThinking,
];
contentPackages.push(...lowerSecondaryPackages.map(p => contentPackageSchema.parse(p)));
export function publicChapterPath(p: ContentPackage) {
  if (p.course.direction === "further" || ["9709", "0580", "0606", "0862"].includes(p.course.code)) {
    const slug = p.key === "9231-fp1-roots" ? "roots-of-polynomial-equations" : p.chapter.slug;
    return "/courses/" + p.course.slug + "/chapters/" + slug;
  }
}
export function packageTopic(key: string, version?: string): QuadraticTopic | undefined {
  for (const latest of contentPackages) {
    const revision = bankRevision(latest.key);
    const p = revision && version === revision.previous.version ? revision.previous : latest;
    const l = p?.lessons.find(l => l.id === key);
    if (!p || !l || version && p.version !== version) continue;
    const previous = revision?.current === p ? revision.previous.version : undefined;
    return {key:l.id,code:l.key,lessonId:l.id,
    title:l.title,summary:l.summary,version:p.version,sourceProject:"arena-package-"+p.key,
    storage:"maths4u.package."+l.id,api:"learning/packages/"+l.id,
    path:"/courses/"+p.course.slug+"/topics/"+l.id,packageKey:p.key,
    compatibleVersions: previous ? [previous] : notationProgressPolicy(p).map(r=>r.fromVersion),
    ...(previous && revision && { previousBankVersion: previous, revisedQuestions: p.questions.filter(q => q.lesson === l.key && revision.changed.has(q.id)).map(q => q.id) })};
  }
}
export function packageQuestions(key:string, version?: string) {
  const t=packageTopic(key,version);if(!t)return undefined;
  const p=contentPackage(t.packageKey!,t.version),l=p.lessons.find(l=>l.id===key)!;
  const revisedQuestions = new Set(t.revisedQuestions);
  return p.questions.filter(q=>q.lesson===l.key).map(q=>{
    const precisionPolicy = practicePrecisionPolicy(p.key, q.collection);
    return {id:q.id,family_uid:q.family_uid,title:q.title,collection:q.collection,prompt_html:q.prompt_html,
      ...(revisedQuestions.has(q.id) && { revisedBank: true }),
      answer_html:q.answer_html,solution_html:q.solution_html,hint_html:q.hint_html,marks:q.marks,difficulty:q.difficulty,fields:q.fields,parts:q.parts,
      ...(precisionPolicy && { precisionPolicy }),
      ...(q.variant_index!==undefined?{variant_index:q.variant_index}:{})};
  });
}
export function packageTeaching(topic:QuadraticTopic) {
  if(!topic.packageKey)return undefined;
  const p=contentPackage(topic.packageKey,topic.version),l=p.lessons.find(l=>l.id===topic.lessonId)!;
  return {notes:'<h2>Objective</h2><p>'+l.objective+'</p><h3>Before you start</h3>'+l.before+'<h2>Key ideas</h2>'+l.ideas+'<h2>Method</h2>'+l.method+'<h3>Common mistakes</h3><ul>'+l.mistakes.map(m=>'<li>'+m+'</li>').join('')+'</ul>',
    examples:l.examples,
    navigation:{directionPath:"/learn/"+p.course.direction,directionTitle:p.course.direction==="further"?"Further Mathematics":p.course.code==="0580"?"IGCSE Mathematics":p.course.code==="0606"?"Additional Mathematics":p.course.code==="0862"?"School Mathematics":"AS & A Level",coursePath:"/courses/"+p.course.slug,courseTitle:p.course.title,
      chapterTitle:p.chapter.title,chapterPath:publicChapterPath(p)??"/courses/"+p.course.slug+"?chapter="+p.chapter.id,topics:p.lessons.map(l=>({key:l.id,title:l.title,path:"/courses/"+p.course.slug+"/topics/"+l.id}))}};
}
