import test from "node:test";
import assert from "node:assert/strict";
import {
  addPresenceBotToRoom,
  addUserToRoom,
  addVirtualUserToRoom,
  createRoom,
  getRoomSummary,
  getRoomUsers,
  removePresenceBotFromRoom,
  removeUser,
  removeVirtualUserByBotId
} from "../src/rooms/roomStore.js";
import { presenceBotIdentityPool, presenceBotIllustrationAvatars, presenceBotNames, selectPresenceBotIdentity } from "../src/presenceBots/presenceBotIdentities.js";

test("presence identity pool provides one hundred names, eighty initial avatars, and twenty scene illustrations", () => {
  assert.equal(presenceBotNames.length, 100);
  assert.equal(presenceBotIdentityPool.length, 100);
  assert.equal(new Set(presenceBotNames).size, 100);
  assert.equal(new Set(presenceBotIdentityPool.map((identity) => identity.avatar)).size, 100);
  const initialAvatars = presenceBotIdentityPool.filter((identity) => identity.avatar.startsWith("initials:"));
  const illustrationAvatars = presenceBotIdentityPool.filter((identity) => identity.avatar.startsWith("/avatars/bot-scenes/presence-"));
  assert.equal(initialAvatars.length, 80);
  assert.equal(illustrationAvatars.length, 20);
  assert.equal(new Set(presenceBotIllustrationAvatars).size, 20);
  for (const identity of initialAvatars) {
    const match = identity.avatar.match(/^initials:([^:]+):(\d{1,3})$/);
    assert.ok(match);
    assert.ok(Array.from(decodeURIComponent(match[1] ?? "")).length <= 2);
  }
  for (const identity of illustrationAvatars) {
    assert.match(identity.avatar, /^\/avatars\/bot-scenes\/presence-(?:0[1-9]|1\d|20)\.svg$/);
  }
  assert.equal(selectPresenceBotIdentity(() => 0), presenceBotIdentityPool[0]);
  assert.equal(selectPresenceBotIdentity(() => 0.999), presenceBotIdentityPool[99]);
  assert.equal(
    selectPresenceBotIdentity(() => 0, new Set(presenceBotIdentityPool.map((identity) => identity.avatar))),
    null
  );
});

test("presence identities are random without replacement across rooms and become reusable after leaving", () => {
  const firstRoom = createRoom("Unique identity one", "en", "any", null, "test-owner", 1);
  const secondRoom = createRoom("Unique identity two", "en", "any", null, "test-owner", 1);
  const thirdRoom = createRoom("Reusable identity", "en", "any", null, "test-owner", 1);

  const first = addPresenceBotToRoom(firstRoom.id, "unique-one", () => 0);
  const second = addPresenceBotToRoom(secondRoom.id, "unique-two", () => 0);
  assert.ok(first);
  assert.ok(second);
  assert.notEqual(second.nickname, first.nickname);
  assert.notEqual(second.avatar, first.avatar);

  removePresenceBotFromRoom(firstRoom.id, "unique-one");
  const reused = addPresenceBotToRoom(thirdRoom.id, "unique-three", () => 0);
  assert.ok(reused);
  assert.equal(reused.nickname, first.nickname);
  assert.equal(reused.avatar, first.avatar);

  removePresenceBotFromRoom(secondRoom.id, "unique-two");
  removePresenceBotFromRoom(thirdRoom.id, "unique-three");
});

test("presence bots only enter inactive rooms and re-check capacity on every join", () => {
  const room = createRoom("Presence test", "en", "any", null, "test-owner", 2);
  const first = addPresenceBotToRoom(room.id, "one", () => 0);
  const second = addPresenceBotToRoom(room.id, "two", () => 0.75);

  assert.ok(first);
  assert.ok(second);
  assert.equal(first.senderType, "presence_bot");
  assert.equal(first.role, "verified");
  assert.equal(second.role, "unverified");
  assert.equal(first.micEnabled || first.cameraEnabled || first.screenSharing, false);
  assert.equal(addPresenceBotToRoom(room.id, "three"), null);
  assert.equal(addVirtualUserToRoom(room.id, { id: "blocked-by-capacity", name: "Virtual", avatarUrl: null }), null);
  assert.equal(addUserToRoom(room.id, {
    socketId: "human:blocked-by-capacity", nickname: "Human", avatar: "🐼", role: "unverified",
    micEnabled: false, cameraEnabled: false, screenSharing: false, screenTrackId: null, senderType: "human"
  }).ok, false);
  assert.equal(getRoomSummary(room.id)?.canJoin, false);
  assert.equal(getRoomUsers(room.id).length, 2);
  assert.equal(getRoomUsers(room.id).find((user) => user.socketId === first.socketId)?.nickname, first.nickname);

  removePresenceBotFromRoom(room.id, "one");
  removePresenceBotFromRoom(room.id, "two");
});

test("a capacity-four room can never contain a fifth presence bot", () => {
  const room = createRoom("Four bot limit", "en", "any", null, "test-owner", 4);
  for (let index = 1; index <= 4; index += 1) {
    assert.ok(addPresenceBotToRoom(room.id, `limit-${index}`, () => index / 10));
  }
  assert.equal(addPresenceBotToRoom(room.id, "limit-5"), null);
  assert.equal(getRoomUsers(room.id).filter((user) => user.senderType === "presence_bot").length, 4);
  for (let index = 1; index <= 4; index += 1) removePresenceBotFromRoom(room.id, `limit-${index}`);
});

test("presence bots reject rooms containing a real or conversational virtual user", () => {
  const humanRoom = createRoom("Human test", "en", "any", null, "test-owner", 2);
  addUserToRoom(humanRoom.id, {
    socketId: "human:test", nickname: "Human", avatar: "🐼", role: "unverified",
    micEnabled: false, cameraEnabled: false, screenSharing: false, screenTrackId: null, senderType: "human"
  });
  assert.equal(addPresenceBotToRoom(humanRoom.id, "human-room"), null);
  removeUser("human:test");

  const virtualRoom = createRoom("Virtual test", "en", "any", null, "test-owner", 2);
  addVirtualUserToRoom(virtualRoom.id, { id: "virtual-test", name: "Virtual", avatarUrl: null });
  assert.equal(addPresenceBotToRoom(virtualRoom.id, "virtual-room"), null);
  removeVirtualUserByBotId(virtualRoom.id, "virtual-test");
});

test("a virtual user never joins a room containing presence bots", () => {
  const room = createRoom("Presence only for real users", "en", "any", null, "test-owner", 2);
  addPresenceBotToRoom(room.id, "capacity-one", () => 0);
  assert.equal(addVirtualUserToRoom(room.id, { id: "virtual-blocked", name: "Virtual", avatarUrl: null }), null);
  assert.equal(addUserToRoom(room.id, {
    socketId: "human:partial-capacity", nickname: "Human", avatar: "🐼", role: "unverified",
    micEnabled: false, cameraEnabled: false, screenSharing: false, screenTrackId: null, senderType: "human"
  }).ok, true);
  assert.equal(getRoomUsers(room.id).length, room.capacity);
  removeUser("human:partial-capacity");
  removePresenceBotFromRoom(room.id, "capacity-one");
});
