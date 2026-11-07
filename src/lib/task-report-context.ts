import { z } from 'zod';
import { ensure } from './errors';
import type { Actor } from './security';
import { requestView } from './request-view';
import { quadraticTopics } from './square-model';
import { packageTopic } from './content-package-content';
import { visibleSquareMappings } from './square-learning';

// Use the same immutable import mapping as the checker, never guess a latest
// TaskVersion from a visible title or an editorial UID alone.
export async function taskReportContext(actor: Actor, input: unknown) {
  ensure(!requestView()?.lens, 403, 'EXIT_VIEW_FIRST');
  const data = z.object({ topic: z.string().min(1).max(191), uid: z.string().min(1).max(191), version: z.string().min(1).max(100) }).strict().parse(input);
  const topic = packageTopic(data.topic) ?? quadraticTopics.find(t => t.key === data.topic);
  ensure(topic, 404, 'NOT_FOUND');
  ensure(topic.version === data.version, 409, 'QUESTION_CHANGED');
  const mappings = await visibleSquareMappings(actor, topic);
  const taskVersionId = mappings.get(data.uid);
  ensure(taskVersionId, 404, 'NOT_FOUND');
  return { taskVersionId };
}
