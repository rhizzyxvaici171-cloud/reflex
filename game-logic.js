/**
 * Reflex: core game logic, kept pure and DOM-free so it can be tested
 * identically in a browser or in plain Node, the same pattern used
 * throughout this portfolio (see PhishLens's analyzer.js, Warden's
 * csp.js).
 */

// ---------- Reaction Time ----------

/**
 * Classifies a single reaction-time round.
 * @param {number|null} reactionMs - milliseconds between "go" and click,
 *   or null if the round was a false start (clicked before "go").
 */
function classifyReaction(reactionMs) {
  if (reactionMs === null) return { valid: false, rating: "false-start" };
  if (reactionMs < 150) return { valid: false, rating: "too-fast" }; // faster than humanly possible off a visual cue, likely a mistimed click
  if (reactionMs < 220) return { valid: true, rating: "elite" };
  if (reactionMs < 280) return { valid: true, rating: "fast" };
  if (reactionMs < 350) return { valid: true, rating: "solid" };
  if (reactionMs < 450) return { valid: true, rating: "average" };
  return { valid: true, rating: "slow" };
}

/**
 * Summarizes a completed set of rounds (array of ms values, only the
 * valid ones, false starts already filtered out by the caller).
 */
function summarizeRounds(validTimes) {
  if (validTimes.length === 0) {
    return { average: null, best: null, worst: null, consistency: null };
  }
  const average = validTimes.reduce((a, b) => a + b, 0) / validTimes.length;
  const best = Math.min(...validTimes);
  const worst = Math.max(...validTimes);
  // Consistency: standard deviation. Lower is more consistent. Only
  // meaningful with 2+ rounds.
  let consistency = null;
  if (validTimes.length >= 2) {
    const variance = validTimes.reduce((sum, t) => sum + (t - average) ** 2, 0) / validTimes.length;
    consistency = Math.sqrt(variance);
  }
  return { average, best, worst, consistency };
}

// ---------- Sequence Memory ----------

/**
 * Extends a sequence by one random step, avoiding a config-driven tile
 * count so the same logic works for a 4-tile or 9-tile board.
 */
function extendSequence(currentSequence, tileCount, rng = Math.random) {
  const nextTile = Math.floor(rng() * tileCount);
  return [...currentSequence, nextTile];
}

/**
 * Compares the player's input so far against the target sequence.
 * Returns "correct-so-far", "complete", or "wrong" (with the index of
 * the first mistake).
 */
function checkSequenceProgress(target, playerInput) {
  for (let i = 0; i < playerInput.length; i++) {
    if (i >= target.length || playerInput[i] !== target[i]) {
      return { status: "wrong", failedAt: i };
    }
  }
  if (playerInput.length === target.length) {
    return { status: "complete" };
  }
  return { status: "correct-so-far" };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    classifyReaction, summarizeRounds, extendSequence, checkSequenceProgress,
  };
}
