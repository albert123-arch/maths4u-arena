// Curated aliases for legacy topics whose names changed in the authored course.
export const archiveLegacyLessonIds: Readonly<Record<string, string>> = {
  // 9709 Pure Mathematics 3, Algebra
  "exam_topic_4eb95c1c01dd2861f37417da6f4f64e8": "orig_9709_p3_alg_modulus_inequalities",
  "exam_topic_02bd41ab3443809877a60c009ee44014": "orig_9709_p3_alg_polynomial_division",
  "exam_topic_2d226a8f9ab1e6fe064c02db602ad2b8": "orig_9709_p3_alg_factor_remainder",
  "exam_topic_29107f4809be5262b963e3c73aeb5b17": "orig_9709_p3_alg_factor_remainder",

  // 0580, Statistics
  "exam_topic_87cc161cabfc5ac2013d886bfffd116e": "igcse-0580-statistics-scatter-diagrams",
};

// Use the original catalogue title for this authored-only archive entry.
export const archiveAuthoredTopicTitles: Readonly<Record<string, string>> = {
  orig_9709_p3_alg_modulus_graphs: "The modulus function",
};
