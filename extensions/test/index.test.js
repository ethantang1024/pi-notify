import test from "node:test";
import assert from "node:assert/strict";
import {
  scanFocusInput,
  initialFocusState,
  resolveConfig,
  toastScript,
  detectBackend,
} from "../index.js";

test("resolveConfig applies defaults", () => {
  const cfg = resolveConfig({});
  assert.equal(cfg.focusAware, true);
  assert.equal(cfg.onComplete, true);
  assert.equal(cfg.onError, true);
  assert.equal(cfg.onQuestion, true);
  assert.equal(cfg.sound, false);
  assert.equal(cfg.minWorkMs, 2000);
});

test("resolveConfig overrides defaults", () => {
  const cfg = resolveConfig({ onComplete: false, sound: true, minWorkMs: 5000 });
  assert.equal(cfg.onComplete, false);
  assert.equal(cfg.sound, true);
  assert.equal(cfg.minWorkMs, 5000);
  assert.equal(cfg.onError, true);
});

test("scanFocusInput detects FocusOut (\\x1b[O)", () => {
  const state = initialFocusState();
  assert.equal(state.focused, true);

  const res = scanFocusInput("\x1b[O", state, 12345);
  assert.equal(res, null); // completely consumed
  assert.equal(state.focused, false);
  assert.equal(state.gotFocusEvent, true);
  assert.equal(state.unfocusedAt, 12345);
});

test("scanFocusInput detects FocusIn (\\x1b[I)", () => {
  const state = { focused: false, gotFocusEvent: true, unfocusedAt: 1000 };

  const res = scanFocusInput("\x1b[I", state);
  assert.equal(res, null); // completely consumed
  assert.equal(state.focused, true);
  assert.equal(state.gotFocusEvent, true);
  assert.equal(state.unfocusedAt, undefined);
});

test("scanFocusInput preserves regular user input while stripping focus sequences", () => {
  const state = initialFocusState();
  const input = "hello \x1b[Oworld";
  const res = scanFocusInput(input, state);
  assert.equal(res, "hello world");
  assert.equal(state.focused, false);
});

test("scanFocusInput ignores normal text without focus sequences", () => {
  const state = initialFocusState();
  const res = scanFocusInput("git commit -m 'test'", state);
  assert.equal(res, undefined); // unchanged
  assert.equal(state.gotFocusEvent, false);
});

test("toastScript properly escapes single quotes", () => {
  const script = toastScript("Pi's Alert", "It's done");
  assert.match(script, /'Pi''s Alert'/);
  assert.match(script, /'It''s done'/);
  assert.match(script, /System\.Windows\.Forms\.NotifyIcon/);
});

test("detectBackend identifies windows on win32", () => {
  if (process.platform === "win32") {
    assert.equal(detectBackend(), "windows");
  }
});
