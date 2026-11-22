import { createHash } from "node:crypto";
import type { ContentPackage } from "./content-package-schema";

// Explicitly reviewed notation-only revisions. Matching both complete package
// fingerprints prevents an unrelated edit with the same answer retaining mastery.
export const notationProgressRevisions = [{
  key: "9231-fp1-roots", fromVersion: "1.0.0", toVersion: "1.0.1",
  fromFingerprint: "1d92023eb562cd59b9f69b796fcc5b1399ef5e74dde8807c22ad681bbb20d895",
  toFingerprint: "d4fbdd12e81e9cb8688bd36d30cc0f89b8a1fc4d0794cf8d86d9eda0c9951a09",
}, {
  key: "9709-s1-normal", fromVersion: "1.0.0", toVersion: "1.0.1",
  fromFingerprint: "71a47602c62f7d3be8bcd90dc4e3f6bcec6147f0cf21d76ee7f220ce1be1bf6b",
  toFingerprint: "9d31003972968f90340e97d738adc3622d021e7cc7a0a082ec559e7082ed948e",
}, {
  key: "9709-p3-numerical-methods", fromVersion: "1.0.1", toVersion: "1.0.2",
  fromFingerprint: "256c3e723597f73753631fec4c6285d48de91e46c64e92b5185eabf77f96dd61",
  toFingerprint: "16904a23cf3ebf62ae21b27416d094c5b9d58e30c8e9cb682e1f3377af3e0599",
}, {
  key: "9709-p3-vectors", fromVersion: "1.0.0", toVersion: "1.0.1",
  fromFingerprint: "9a45b48f00dbb581deefd2fd0e66e39645d628bdbbaef35db65a64ae0223d7dd",
  toFingerprint: "f9388a6c512b6557cded6783483a760c219dc2f967aceff90cc21aa4e23a30a9",
}, {
  key: "9709-p3-differential-equations", fromVersion: "1.0.0", toVersion: "1.0.1",
  fromFingerprint: "5b393538354dbd1d5f0b686be82d205d3194a270bec0d44fc12965f5f65e09b0",
  toFingerprint: "fff64573bfdf86bf41421bc61742f7597b5e8d620e9c96bfb024be2d8132873d",
}, {
  key: "9709-p3-complex-numbers", fromVersion: "1.0.0", toVersion: "1.0.1",
  fromFingerprint: "e5edb108cf32fa60ad83eed351cc944cc00887a502c823d0433c9eb4ba8ef9f8",
  toFingerprint: "c5c3ed98f30b93a82e2a0f8a6c0efe352aa9e50d90e96c0bbf87276542bf853c",
}, {
  key: "9709-m1-forces-and-equilibrium", fromVersion: "1.0.0", toVersion: "1.0.1",
  fromFingerprint: "9035dd1bf8dd98be0493171c2ef334176fec9af6eb86acd084f8712bf7e376d4",
  toFingerprint: "62977900677abfeccc6bd2eb2c9d9001cca4f7c6f98f9506c26e1eb3c8c9795f",
}, {
  key: "9709-m1-kinematics", fromVersion: "1.0.0", toVersion: "1.0.1",
  fromFingerprint: "a8855e722775cccfd8f3eeb27378abcb9dfbce17e6ed17b0e01daa77f00005b2",
  toFingerprint: "c5a865acdda2aa5e4e2015d889bd5c2ab86e30ce93e9a243dd7b1481ea2ba653",
}, {
  key: "9709-m1-momentum", fromVersion: "1.0.0", toVersion: "1.0.1",
  fromFingerprint: "e254cd0eadedeba0aa0bc5b699f6c865af3d139c9ecaa9c4e933c941ef221914",
  toFingerprint: "bcc7c1cdc539d95e06e203bb436979e2bd22e1f2efaf67b95cc7fc5fdcced0cb",
}, {
  key: "9709-m1-newtons-laws", fromVersion: "1.0.0", toVersion: "1.0.1",
  fromFingerprint: "7b6e036f3429f5eca7c68d2518fabb377c40c6150644065713df9efe24bd8605",
  toFingerprint: "7f6b425e3c7e26b2668e41e950751f5e822c029e5d9aac0b26237952736bc74e",
}, {
  key: "9709-m1-energy-work-power", fromVersion: "1.0.0", toVersion: "1.0.1",
  fromFingerprint: "021a8bcb9b736af1dc0cbd4aa903b3c258d0c6b8140f74ffaf8e453bab575063",
  toFingerprint: "58f4adbc5cc1981c07b785f3cf9b21e658002fe2adf87fc6deb818470bf0c7e7",
}, {
  key: "9231-fp1-induction",
  fromVersion: "1.0.2",
  toVersion: "1.0.3",
  fromFingerprint: "cfd24319310c2f9da5a384ba9ae6431019ad9194e09a33c9dc88a32821292595",
  toFingerprint: "ed3782d1e3b14833d7c3e3f9ef4e467a395ffb580275a914d417a90d461bb9b6",
}, {
  key: "9231-fp1-matrices1",
  fromVersion: "1.0.0",
  toVersion: "1.0.1",
  fromFingerprint: "e19307fb25a97422a0572ef0015ca0d00866c8472aaaaf802786777142e401c7",
  toFingerprint: "ce899f975bb9b404d6214e057aa41a7bc9f83f3f1d1513f61d28bee85f6baaa0",
}, {
  key: "9231-fp1-polar",
  fromVersion: "1.0.0",
  toVersion: "1.0.1",
  fromFingerprint: "1b015bcc08885654a1bee3308fd501ed8b6ebf45f7642b53f49d1891920a9004",
  toFingerprint: "00480593221955597cc387c9b236ea53a55159432fc3a7979ea72b56cc6053ba",
}, {
  key: "9231-fp1-rational",
  fromVersion: "1.0.0",
  toVersion: "1.0.1",
  fromFingerprint: "505da77b19e14928088be4f4935b7ec16d715fa00b188409e35433253fa38c5a",
  toFingerprint: "9bc34f17f6b366852235f7c7b73ca235522b7961c88df38e3ba2cdd05d16114a",
}, {
  key: "9231-fp1-roots",
  fromVersion: "1.0.1",
  toVersion: "1.0.2",
  fromFingerprint: "d4fbdd12e81e9cb8688bd36d30cc0f89b8a1fc4d0794cf8d86d9eda0c9951a09",
  toFingerprint: "5f3e92736eb90d240facd0eccc7db167a170c4aa0bef2738609d837a6a599a14",
}, {
  key: "9231-fp1-roots",
  fromVersion: "1.0.0",
  toVersion: "1.0.2",
  fromFingerprint: "1d92023eb562cd59b9f69b796fcc5b1399ef5e74dde8807c22ad681bbb20d895",
  toFingerprint: "5f3e92736eb90d240facd0eccc7db167a170c4aa0bef2738609d837a6a599a14",
}, {
  key: "9231-fp2-complex",
  fromVersion: "1.0.0",
  toVersion: "1.0.1",
  fromFingerprint: "ae1d0a2b90b7e41ff2ee93745b4af8409f4b72325e644562161513a6dba6c744",
  toFingerprint: "6e9c6d21c95c70ac9b7cf3657fc89f1f705ea59f0c998cae3b490009abf1c8fd",
}, {
  key: "9231-fp2-differentiation",
  fromVersion: "1.0.0",
  toVersion: "1.0.1",
  fromFingerprint: "278823b91b4f6b3176fb61fe97a35c4c3836534c441c7d577f2f2f6d05cf14c4",
  toFingerprint: "8430491c3ca28ff44d8e48ef17909b19da3ea2f31a222e1cadda460bde456a39",
}, {
  key: "9231-fp2-hyperbolic",
  fromVersion: "1.0.0",
  toVersion: "1.0.1",
  fromFingerprint: "69edaceeff7aac7bbb21842001680f41addc745dae24ea124468c2c9d8c3b58b",
  toFingerprint: "519db0fce8d57a615d3c4140521979ce3e846d09c335e00dcd76ecbbaab1e646",
}, {
  key: "9231-fp2-integration",
  fromVersion: "1.0.0",
  toVersion: "1.0.1",
  fromFingerprint: "9ddbf85da7e78bfd3b058930cf2889b45d05654284f95e94d013e007a65480e3",
  toFingerprint: "92ce892f4fc8d3b28f1985fc0826270b7647d440fa9f8781eb8a54f98f91a31c",
}, {
  key: "9231-fp2-matrices2",
  fromVersion: "1.0.1",
  toVersion: "1.0.2",
  fromFingerprint: "fb37140ae9b5d988a9f9f14d74ace68fb32bce7943a8bd0a1c043baa887bb872",
  toFingerprint: "ae00b1a0014b9a0fdd973fe406b2405bfca2a1e498886e192017def0dd819679",
}, {
  key: "9231-fp2-ode",
  fromVersion: "1.0.0",
  toVersion: "1.0.1",
  fromFingerprint: "0ae6c3cfb4ab63fbc5f0ea5113463ca70c41c202045ef8b22b5f769e2db97c14",
  toFingerprint: "0c4d2f2b96be5ad8e577d81a47fe86f7c587e17d063180483819ef751d986f2b",
}, {
  key: "9231-mechanics-circular",
  fromVersion: "1.0.0",
  toVersion: "1.0.1",
  fromFingerprint: "5d796dec8ab92d98167ac59a0a178517453a254a3d6c8c472d21bdc4e3ee4538",
  toFingerprint: "830b38b381c7fde902426b724fa0770ad01d4d5f17266101ddd045de44f8da92",
}, {
  key: "9231-mechanics-hooke",
  fromVersion: "1.0.0",
  toVersion: "1.0.1",
  fromFingerprint: "b252fdb7d82490b9f7b95de01bb52bc3397d4dbc6dab11370a28f081275f2293",
  toFingerprint: "5b028ae6ffc4617ae6dffb5db849905f56ded6714081ea89d7ef13e4be4c69d2",
}, {
  key: "9231-mechanics-variable",
  fromVersion: "1.0.0",
  toVersion: "1.0.1",
  fromFingerprint: "0d2b3737679a01c4b5d0a2cddb0eae1b61cabc3de1170ff73ecf6a2c8d209db1",
  toFingerprint: "4fc4044f27356468f25392146f35b33fcd0c00ad1d1f35bcc60ef43e86b9918b",
}, {
  key: "9231-stats-crv",
  fromVersion: "1.0.0",
  toVersion: "1.0.1",
  fromFingerprint: "41af397bcfacf88a0a13b6fae97efe3429d72eb7ba30c6e30ab4aba9a6680a5a",
  toFingerprint: "76fe1712b2f48767a9e71a2167912d05c0296995e5b2a3754a071791220f4b55",
}, {
  key: "9231-stats-pgf",
  fromVersion: "1.0.0",
  toVersion: "1.0.1",
  fromFingerprint: "b3b86acaa9aa800891edeea94445dee235475262c408a54365da496546ac80f3",
  toFingerprint: "ea62cc29d475b706d93848af97cde99ffff08535ac715fe2b7d6c96bbca092e3",
}, {
  key: "9709-m1-forces-and-equilibrium",
  fromVersion: "1.0.1",
  toVersion: "1.0.2",
  fromFingerprint: "62977900677abfeccc6bd2eb2c9d9001cca4f7c6f98f9506c26e1eb3c8c9795f",
  toFingerprint: "8344f023dd2f33de5f4ab3fad9bdf247d1877e80cb6febebc43340bc6a78ce48",
}, {
  key: "9709-m1-forces-and-equilibrium",
  fromVersion: "1.0.0",
  toVersion: "1.0.2",
  fromFingerprint: "9035dd1bf8dd98be0493171c2ef334176fec9af6eb86acd084f8712bf7e376d4",
  toFingerprint: "8344f023dd2f33de5f4ab3fad9bdf247d1877e80cb6febebc43340bc6a78ce48",
}, {
  key: "9709-p3-trigonometry",
  fromVersion: "1.0.0",
  toVersion: "1.0.1",
  fromFingerprint: "be603bfd86c1dff3230b4755b8d5afc5fe622c69cffccf7dd37daaeafb9303c1",
  toFingerprint: "d931083f6f100f7276c204abf51cb28fb113d41826c2d0dd14488681e33bf2e5",
}] as const;

export function notationProgressPolicy(p: ContentPackage) {
  const candidates = notationProgressRevisions.filter(r => r.key === p.key && r.toVersion === p.version);
  if (!candidates.length) return [];
  const fingerprint = createHash("sha256").update(JSON.stringify(p)).digest("hex");
  return candidates.filter(r => r.toFingerprint === fingerprint);
}
