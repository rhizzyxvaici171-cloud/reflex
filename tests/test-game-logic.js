/**
 * Run with: node tests/test-game-logic.js
 * No test framework dependency, matching this portfolio's zero-dependency
 * projects (LeakHound, Bastion, Vetter).
 */
const assert = require("assert");
const path = require("path");
const { classifyReaction, summarizeRounds, extendSequence, checkSequenceProgress } =
  require(path.join(__dirname, "..", "game-logic.js"));

let passed = 0, failed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`PASS  ${name}`);
  } catch (e) {
    failed++;
    console.log(`FAIL  ${name}: ${e.message}`);
  }
}

test("false start is invalid", () => {
  assert.strictEqual(classifyReaction(null).valid, false);
  assert.strictEqual(classifyReaction(null).rating, "false-start");
});

test("implausibly fast click is flagged, not rewarded", () => {
  const r = classifyReaction(80);
  assert.strictEqual(r.valid, false);
  assert.strictEqual(r.rating, "too-fast");
});

test("reaction time ratings are ordered correctly", () => {
  assert.strictEqual(classifyReaction(200).rating, "elite");
  assert.strictEqual(classifyReaction(260).rating, "fast");
  assert.strictEqual(classifyReaction(320).rating, "solid");
  assert.strictEqual(classifyReaction(400).rating, "average");
  assert.strictEqual(classifyReaction(600).rating, "slow");
});

test("summarizeRounds handles empty input without crashing", () => {
  const s = summarizeRounds([]);
  assert.strictEqual(s.average, null);
  assert.strictEqual(s.best, null);
});

test("summarizeRounds computes correct average and best/worst", () => {
  const s = summarizeRounds([200, 300, 250, 280, 220]);
  assert.strictEqual(s.average, 250);
  assert.strictEqual(s.best, 200);
  assert.strictEqual(s.worst, 300);
});

test("summarizeRounds skips consistency for a single round", () => {
  const s = summarizeRounds([250]);
  assert.strictEqual(s.consistency, null);
});

test("summarizeRounds computes a sane consistency (stddev) for varied rounds", () => {
  const tight = summarizeRounds([250, 251, 249, 250]);
  const loose = summarizeRounds([100, 400, 150, 500]);
  assert.ok(tight.consistency < loose.consistency, "tighter rounds should have lower stddev");
});

test("extendSequence appends exactly one tile within range", () => {
  const rng = () => 0.99;
  const seq = extendSequence([0, 1], 4, rng);
  assert.strictEqual(seq.length, 3);
  assert.ok(seq[2] >= 0 && seq[2] < 4);
});

test("extendSequence never mutates the original array", () => {
  const original = [0, 1];
  extendSequence(original, 4, () => 0.5);
  assert.deepStrictEqual(original, [0, 1]);
});

test("checkSequenceProgress: correct partial input", () => {
  const r = checkSequenceProgress([0, 2, 3, 1], [0, 2]);
  assert.strictEqual(r.status, "correct-so-far");
});

test("checkSequenceProgress: exact completion", () => {
  const r = checkSequenceProgress([0, 2, 3, 1], [0, 2, 3, 1]);
  assert.strictEqual(r.status, "complete");
});

test("checkSequenceProgress: wrong tile reports the correct failure index", () => {
  const r = checkSequenceProgress([0, 2, 3, 1], [0, 9]);
  assert.strictEqual(r.status, "wrong");
  assert.strictEqual(r.failedAt, 1);
});

test("checkSequenceProgress: wrong tile at the very first click", () => {
  const r = checkSequenceProgress([0, 2, 3, 1], [5]);
  assert.strictEqual(r.status, "wrong");
  assert.strictEqual(r.failedAt, 0);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
