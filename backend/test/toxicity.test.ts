import assert from "node:assert/strict";
import test from "node:test";
import { classifyHumanMessage, getToxicityDepartureMessage } from "../src/virtualUsers/toxicity.js";

test("classifies direct threats as severe", () => {
  assert.equal(classifyHumanMessage("Kill yourself"), "severe");
  assert.equal(classifyHumanMessage("I will hurt you"), "severe");
  assert.equal(classifyHumanMessage("Tao sẽ giết mày"), "severe");
});

test("classifies direct insults as rude", () => {
  assert.equal(classifyHumanMessage("You are an idiot"), "rude");
  assert.equal(classifyHumanMessage("shut the fuck up"), "rude");
  assert.equal(classifyHumanMessage("Mày ngu quá"), "rude");
});

test("does not punish neutral discussion of sensitive subjects", () => {
  assert.equal(classifyHumanMessage("We discussed Nazi history in class"), "none");
  assert.equal(classifyHumanMessage("This report is about rape prevention"), "none");
  assert.equal(classifyHumanMessage("The movie character is an idiot"), "none");
  assert.equal(classifyHumanMessage("I feel stupid today"), "none");
  assert.equal(classifyHumanMessage("Can I kill you in this game?"), "none");
});

test("normalizes casing, whitespace, and compatible unicode", () => {
  assert.equal(classifyHumanMessage("  YOU   ARE   STUPID  "), "rude");
  assert.equal(classifyHumanMessage("you’re a moron"), "rude");
  assert.equal(classifyHumanMessage(""), "none");
});

test("provides varied English departure notices without an immediate repeat", () => {
  const first = getToxicityDepartureMessage(undefined, () => 0);
  const second = getToxicityDepartureMessage(first, () => 0);
  assert.match(first, /leave|leaving/i);
  assert.match(second, /leave|leaving/i);
  assert.notEqual(second, first);
});
