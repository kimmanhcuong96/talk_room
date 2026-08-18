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
