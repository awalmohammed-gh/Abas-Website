import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as tokens from "../../../components/animations/tokens.ts";

// Run the real effect with controlled observer reports, including reports queued after cleanup.
const hookSource = ts.transpileModule(readFileSync(new URL("../../../components/animations/useReveal.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function item() {
  return { isConnected: true, style: { removeProperty(name) { delete this[name]; } } };
}

function mount({ children = [], reduced = false, failAnimation = false } = {}) {
  let observer;
  let cleanup;
  const calls = [];
  const root = { ...item(), querySelectorAll: () => children, contains: (element) => element === root || children.includes(element) };
  const context = {
    exports: {},
    window: { innerHeight: 800 },
    IntersectionObserver: class {
      constructor(callback) { this.callback = callback; this.disconnected = false; observer = this; }
      observe() {}
      disconnect() { this.disconnected = true; }
    },
    require(name) {
      if (name === "react") return { useEffect: (effect) => { cleanup = effect(); } };
      if (name === "motion/react-mini") return { useAnimate: () => [{ current: root }, (targets) => {
        assert.ok(targets.length, "Motion must never receive an empty array");
        calls.push(targets);
        if (failAnimation) throw new Error("Animation could not start");
        return Promise.resolve();
      }] };
      if (name === "./tokens") return tokens;
      if (name === "./usePrefersReducedMotion") return { usePrefersReducedMotion: () => reduced };
      throw new Error(`Unexpected import: ${name}`);
    },
  };
  runInNewContext(hookSource, context);
  context.exports.useReveal({ items: ":scope > *" });
  return {
    calls,
    get observer() { return observer; },
    report(isIntersecting) { observer.callback([{ isIntersecting, boundingClientRect: { top: isIntersecting ? 300 : 1200 } }]); },
    cleanup() { cleanup?.(); },
  };
}

test("an empty product grid never calls Motion", () => {
  const reveal = mount();
  reveal.report(false);
  assert.equal(reveal.observer.disconnected, true);
  reveal.report(true);
  assert.equal(reveal.calls.length, 0);
});

test("valid items reveal once and release their inline styles", async () => {
  const child = item();
  const reveal = mount({ children: [child] });
  reveal.report(false);
  assert.equal(child.style.opacity, "0");
  reveal.report(true);
  await Promise.resolve();
  reveal.report(true);
  assert.equal(reveal.calls.length, 1);
  assert.equal(reveal.calls[0][0], child);
  assert.equal(child.style.opacity, undefined);
  assert.equal(child.style.translate, undefined);
});

test("items removed before scrolling into view are not animated", () => {
  const child = item();
  const reveal = mount({ children: [child] });
  reveal.report(false);
  child.isConnected = false;
  reveal.report(true);
  assert.equal(reveal.calls.length, 0);
  assert.equal(child.style.opacity, undefined);
});

test("queued observer reports after unmount do not start animations", () => {
  const child = item();
  const reveal = mount({ children: [child] });
  reveal.report(false);
  reveal.cleanup();
  reveal.report(true);
  assert.equal(reveal.calls.length, 0);
  assert.equal(child.style.opacity, undefined);
});

test("a synchronous animation failure leaves content visible", () => {
  const child = item();
  const reveal = mount({ children: [child], failAnimation: true });
  reveal.report(false);
  assert.doesNotThrow(() => reveal.report(true));
  assert.equal(child.style.opacity, undefined);
  assert.equal(child.style.translate, undefined);
});

test("reduced motion skips observation and animation", () => {
  const reveal = mount({ children: [item()], reduced: true });
  assert.equal(reveal.observer, undefined);
  assert.equal(reveal.calls.length, 0);
});
