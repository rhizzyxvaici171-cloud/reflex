# Reflex ⚡

A precision reaction-time and sequence-memory tester. Plain HTML, CSS, and JavaScript, no dependencies, no backend.

**[Live demo](https://reflex-nine-ruddy.vercel.app)**: replace with your GitHub Pages link once deployed (see below).

## Why this exists

This portfolio's [SkillForge](https://github.com/rhizzyxvaici171-cloud) concept describes a competitive skill platform with a reaction-time challenge and a memory-recall game, server-side graded. Reflex is an honest, standalone step toward that: the client-side game mechanics and precision timing, built and actually shipped, rather than only described. It doesn't have SkillForge's server-side grading or anti-cheat architecture, this is the piece that plays.

## The two modes

**Reaction Time**: five rounds, click the instant the stage turns green. Timed with `performance.now()` for sub-millisecond precision, unaffected by system clock adjustments. A click before the color change is scored as a false start, not rewarded as a fast time, and a click under 150ms (faster than a human can physically react to a visual cue) is flagged as mistimed rather than counted as elite, both to keep the numbers honest and, not incidentally, to make the game resistant to a script just spamming clicks.

**Sequence Memory**: watch a pattern, then repeat it. Grows by one tile every successful round; ends on the first wrong tile, with the longest completed sequence recorded.

Personal bests for both are saved locally via `localStorage`. Nothing is sent anywhere, there's no backend at all.

## An honest bug story

While testing the sequence memory game with Playwright, an early test run reported every round as failing in a way that didn't match what the screen actually showed. The cause turned out to be in the *test*, not the game: the script read the current sequence into a Python variable once, then reused that stale value across a later round after the real sequence had already grown, and separately never checked whether a wait-for-state call had actually succeeded before logging success. Once the test was fixed to always re-read state fresh and verify each transition explicitly, every round passed cleanly. Worth including here because it's a real, useful lesson about testing anything stateful and timing-based: the bug can just as easily be in the thing checking the code as the code itself, and a test that logs success without actually verifying the condition it claims to check is worse than no test at all.

## Tech

Vanilla HTML, CSS, and JavaScript. The game logic (`game-logic.js`, reaction classification, round summarizing, sequence generation and validation) is written as pure functions with no DOM dependency, so it's tested directly in Node, the same pattern as this portfolio's other client-side tools (PhishLens's `analyzer.js`, Warden's `csp.js`).

## Running it locally

```bash
git clone https://github.com/YOUR_USERNAME/reflex.git
cd reflex
open index.html
```

## Running the tests

```bash
node tests/test-game-logic.js
```

13 tests covering both game modes, including edge cases: empty round sets, single-round consistency (undefined, not a divide-by-zero), sequence generation never mutating its input, and wrong-tile detection reporting the correct failure index.

## Deploying to GitHub Pages

1. Push this repo to GitHub.
2. Go to **Settings → Pages**.
3. Under **Source**, select the `main` branch and `/ (root)` folder, then Save.
4. Live at `https://YOUR_USERNAME.github.io/reflex/` shortly after.

## Project structure

```
reflex/
├── index.html
├── style.css
├── game-logic.js   # pure game logic, DOM-free and independently testable
├── script.js        # UI wiring and both game state machines
├── tests/
│   └── test-game-logic.js
├── README.md
└── LICENSE
```

## License

MIT, see [LICENSE](LICENSE).
