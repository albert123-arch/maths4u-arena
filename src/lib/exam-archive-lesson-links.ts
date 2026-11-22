// Curated aliases for legacy topics whose names changed in the authored course.
export const archiveLegacyLessonIds: Readonly<Record<string, string>> = {
  // 9709 Pure Mathematics 3, Algebra
  "exam_topic_4eb95c1c01dd2861f37417da6f4f64e8": "orig_9709_p3_alg_modulus_inequalities",
  "exam_topic_02bd41ab3443809877a60c009ee44014": "orig_9709_p3_alg_polynomial_division",
  "exam_topic_2d226a8f9ab1e6fe064c02db602ad2b8": "orig_9709_p3_alg_factor_remainder",
  "exam_topic_29107f4809be5262b963e3c73aeb5b17": "orig_9709_p3_alg_factor_remainder",

  // 0580, Statistics
  "exam_topic_87cc161cabfc5ac2013d886bfffd116e": "igcse-0580-statistics-scatter-diagrams",

  // 0606, Functions and simultaneous equations
  "exam_topic_17637208663f5a4a18381b499a92f97c": "addmaths-0606-functions-mappings",
  "exam_topic_ab8b45c6604f3695b5365b947da0eea7": "addmaths-0606-functions-composites",
  "exam_topic_b5378e9b7bdb53dee9806718434c5cda": "addmaths-0606-functions-inverse-rules",
  "exam_topic_f709bddb8943e0b69c549887c5353dbd": "addmaths-0606-functions-inverse-graphs",
  "exam_topic_b602a0830ac98e0d268eb0aec5a33047": "addmaths-0606-quadratics-simultaneous-line-curve",
  "exam_topic_32319e1810df2c1cb40e4d38e5b522f2": "addmaths-0606-quadratics-simultaneous-turning-point",
  "exam_topic_5f55fe88a224a2e80449364340624dee": "addmaths-0606-quadratics-simultaneous-signs-and-inequalities",
  "exam_topic_dbd25792edf6dce56a5352b2d7a62012": "addmaths-0606-quadratics-simultaneous-quadratic-roots",

  // 0606, Polynomials and modulus equations
  "exam_topic_e0ce1a7ab3be28fd3b6d84753b115088": "addmaths-0606-factors-polynomials-operations",
  "exam_topic_f501c8d38a12df40b52e340373a91a55": "addmaths-0606-factors-polynomials-long-division",
  "exam_topic_cb4e34ffcd717897fb9f9e3ec2a74cc5": "addmaths-0606-factors-polynomials-known-factors",
  "exam_topic_3dafe37be0ed7f94d09ceb8e519c3c15": "addmaths-0606-factors-polynomials-cubic-roots",
  "exam_topic_e21684d38090601c8885ebe67641abc3": "addmaths-0606-equations-inequalities-graphs-linear-modulus-equations",
  "exam_topic_eb3a99f93e5124253b7e2ea60239432c": "addmaths-0606-equations-inequalities-graphs-cubic-sketches",
  "exam_topic_25b72ec057d555899cfded286350e693": "addmaths-0606-equations-inequalities-graphs-cubic-inequalities",

  // 0606, Logarithms and coordinate geometry
  "exam_topic_6f60695295497b07b5ff7371f89c3923": "addmaths-0606-logs-log-laws",
  "exam_topic_7029ac827989a392bae881ffa57c0b8e": "addmaths-0606-logs-log-equations",
  "exam_topic_5b3df31666e29dacd33da31582a2daca": "addmaths-0606-logs-exp-equations",
  "exam_topic_e84faf2d99996568e60f6240a652e7cd": "addmaths-0606-logs-change-of-base",
  "exam_topic_424ae34b3e64274e52be22226997b210": "addmaths-0606-logs-natural-log",
  "exam_topic_a9310082f9663cf2c90456fc2399a8ae": "addmaths-0606-logs-growth-decay",
  "exam_topic_9b73d9941fd46bd92ce5a9eb3c357a7e": "addmaths-0606-logs-inverse-log-exp",
  "exam_topic_634c64f8fbcc7da9de3f1c39ecef751e": "addmaths-0606-lines-distance-midpoint-gradient",
  "exam_topic_47adf3fe92e8c0d14faad5969eb2f56e": "addmaths-0606-lines-line-equations-intersection",
  "exam_topic_736476a8b75f9a429c053d83712a4ad1": "addmaths-0606-lines-areas-from-lines",
  "exam_topic_050e5f55154824869608dc3bb4eb18f7": "addmaths-0606-lines-make-model-linear",
  "exam_topic_7ef77d1f211936ed94f5488ebdc34093": "addmaths-0606-lines-recover-original-relation",
  "exam_topic_1dfc87c480798e9e5c7ae6c4b77646fa": "addmaths-0606-lines-data-and-predictions",
  "exam_topic_1dcb6063e518f19211cb51b4055127b5": "addmaths-0606-circles-equations-of-circles",
  "exam_topic_b8fdfc284801573b9a0067b0b81e3df1": "addmaths-0606-circles-intersections-with-a-line",
  "exam_topic_28f74211516c97565291fc07be276b57": "addmaths-0606-circular-areas-of-sectors",

  // 0606, Combinatorics, progressions and calculus
  "exam_topic_767b5fa0b7117368a14a5c1d1ffcf357": "addmaths-0606-count-arrangements",
  "exam_topic_441a098341c9e33181d9785109b67771": "addmaths-0606-count-ordered-selections",
  "exam_topic_3b45cf917d698cc36557a73f3a53ceb6": "addmaths-0606-count-group-choices",
  "exam_topic_867c7bc20e7a4375719a85c6d4d03500": "addmaths-0606-series-arithmetic-progressions",
  "exam_topic_7e8367052fab25f027fe74f415a6d09b": "addmaths-0606-series-geometric-progressions",
  "exam_topic_796904af514ac17a8a2459f1fb3b7216": "addmaths-0606-series-infinite-series",
  "exam_topic_4f3da941f231dfcaaa1c455a49d5df58": "addmaths-0606-d1-product-rule",
  "exam_topic_dccc8aa71516d03b411c06d0e9861339": "addmaths-0606-d1-quotient-rule",
  "exam_topic_b65935a6f4bca5f717758da839196acd": "addmaths-0606-d1-stationary-points",
  "exam_topic_331a3bdafaed240312b1ebf2c66ca606": "addmaths-0606-d1-optimisation",
  "exam_topic_e732dc9611777128df0c4733fb01aa5c": "addmaths-0606-d2-trigonometric",
  "exam_topic_6fc1857435bdba86d0c965fcd5efadda": "addmaths-0606-int-reverse",
  "exam_topic_68c63a9f0d78e160a5d0775b182b4343": "addmaths-0606-int-linear-power",
  "exam_topic_5193ecb7bc766bfec692b9983c7eeee5": "addmaths-0606-int-logarithmic",
  "exam_topic_912846e75c997971e9d17bcf0763a4d6": "addmaths-0606-int-definite",
  "exam_topic_7e8444cbb0d7b76971e21066a569b5f0": "addmaths-0606-int-area-axis",
  "exam_topic_59e38c58897a9fd75287190f7032f681": "addmaths-0606-int-between-curves",
};

// Revised chapter titles that cover the same chapter as the archive version.
export const archiveChapterTitleAliases: Readonly<Record<string, string>> = {
  "maths4u-0606:quadratics-simultaneous": "Simultaneous equations and quadratics",
  "maths4u-9709-p3:logarithmic-and-exponential-functions": "Logarithms",
  "maths4u-9709-p3:numerical-methods": "Numerical solutions of equations",
  "maths4u-9709-p3:further-algebra": "Further algebra",
};

// The old 0580 Number and Algebra and graphs chapters group several skills together.
// Move only whole exam topics that correspond to a specific current chapter.
export const archiveTopicChapterSlugs: Readonly<Record<string, string>> = {
  "exam_topic_ef7047d056d493af25cc3708acd9e67f": "types-of-number",
  "exam_topic_33cb2a066ab59558d169d2301fe4f163": "sets-and-venn-diagrams",
  "exam_topic_f061a2fd8180283d215061f95e7d3b99": "money",
  "exam_topic_d01597c268e7962e7a03613f18d9f4f2": "algebraic-fractions",
  "exam_topic_c424a06c2f6dd123e42181842ba47802": "equations",
  "exam_topic_07b750e88b53ca3ce554a83f0b83fb83": "inequalities",
  "exam_topic_85e789c6fe1d25949620f0661fe4826d": "sequences",
  "exam_topic_67c64a2b67f25876a753910843f98a6f": "direct-and-inverse-proportion",
  "exam_topic_bcbafa98c4b1e6e1ff07e36dc6a73592": "functions",
  "exam_topic_35365c3f4e29672e53883bfd9ce2a3d5": "practical-graphs",
};

// Use the original catalogue title for this authored-only archive entry.
export const archiveAuthoredTopicTitles: Readonly<Record<string, string>> = {
  orig_9709_p3_alg_modulus_graphs: "The modulus function",
};
