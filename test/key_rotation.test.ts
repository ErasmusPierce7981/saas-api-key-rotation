import assert from "node:assert/strict";
import { rotationRequest } from "../src/key_rotation_service.js";

assert.equal(rotationRequest.safeParse({ project_id: "tenant", old_key_id: "old", grace_hours: 4 }).success, true);
assert.equal(rotationRequest.safeParse({ project_id: "tenant", old_key_id: "old", grace_hours: 0 }).success, false);
console.log("rotation boundary test passed");
