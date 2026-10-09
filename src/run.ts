import { rotateTenantKey } from "./key_rotation_service.js";

const input = { project_id: process.env.PROJECT_ID ?? "tenant-demo", old_key_id: process.env.OLD_KEY_ID ?? "key-to-rotate", grace_hours: Number(process.env.GRACE_HOURS ?? "2") };
rotateTenantKey(input).then(result => { console.log(JSON.stringify({ rotated: true, oldKeyReferences: result.oldKeyReferences })); }).catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
