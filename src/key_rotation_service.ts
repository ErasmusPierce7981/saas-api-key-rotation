import { z } from "zod";
import { InfraiClient } from "./infra_client.js";

export const rotationRequest = z.object({ project_id: z.string().min(1), old_key_id: z.string().min(1), grace_hours: z.number().int().min(1).max(168) });
export async function rotateTenantKey(input: unknown, client = new InfraiClient()) {
  const request = rotationRequest.parse(input);
  const created = await client.createKey({ project_id: request.project_id, name: "rotation-check", scopes: ["logs.search"], idempotency_key: `create-${request.project_id}-${request.old_key_id}` });
  await client.rotateKey(created.id, { grace_hours: request.grace_hours, idempotency_key: `rotate-${created.id}` });
  const logs = await client.searchLogs({ q: request.old_key_id });
  await client.revokeKey(created.id);
  return { replacementKey: created.key, oldKeyReferences: logs };
}
