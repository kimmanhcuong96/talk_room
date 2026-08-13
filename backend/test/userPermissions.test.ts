import assert from "node:assert/strict";
import test from "node:test";
import { hasPermission } from "../src/users/userPermissions.js";

test("only verified users and supporters can favorite other users", () => {
  assert.equal(hasPermission("unverified", "favorite_user"), false);
  assert.equal(hasPermission("verified", "favorite_user"), true);
  assert.equal(hasPermission("supporter", "favorite_user"), true);
});
