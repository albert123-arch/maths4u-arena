// Compatibility facade: the existing Quadratics API and identities stay stable.
import {originalBlockSchema, importOriginalBlockLocal} from "./original-blocks";
export {originalTask,originalRubric,originalCourseId} from "./original-blocks";
export const originalQuadraticsSchema=originalBlockSchema.refine(p=>p.key==="maths4u-original-quadratics","Quadratics pack required");
export type {OriginalBlock as OriginalQuadratics} from "./original-blocks";
export const originalChapterId="orig_9709_p1_quadratics";
export const originalLessonId=(key:string)=>"orig_quadratics_"+key.replaceAll("-","_");
export const importOriginalQuadraticsLocal=(actor:Parameters<typeof importOriginalBlockLocal>[0],input:unknown)=>importOriginalBlockLocal(actor,originalQuadraticsSchema.parse(input));
