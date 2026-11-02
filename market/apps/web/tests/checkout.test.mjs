import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as shared from "@aba-mart/shared";
import { ApiClientError } from "../src/lib/api.ts";

// Exercise the real component handlers without creating customer sessions, orders or messages.
const source = ts.transpileModule(readFileSync(new URL("../../../components/cart/WhatsAppCheckout.tsx", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

function mount({ blockedReason = null, checking = false, empty = false, post } = {}) {
  let cursor = 0;
  let serial = 0;
  const hooks = [];
  const calls = { posts: [], busy: [], changed: [], saved: [], handoffs: [], reserved: 0, closed: 0 };
  const component = () => null;
  const jsx = (type, props) => ({ type, props: props || {} });
  const context = { exports: {}, requestAnimationFrame: callback => { callback(); return 1; }, crypto: { randomUUID: () => `key-${++serial}` }, require(name) {
    if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
    if (name === "react") return {
      useRef(initial) { const i = cursor++; if (!(i in hooks)) hooks[i] = { current: initial }; return hooks[i]; },
      useState(initial) { const i = cursor++; if (!(i in hooks)) hooks[i] = typeof initial === "function" ? initial() : initial; return [hooks[i], value => { hooks[i] = typeof value === "function" ? value(hooks[i]) : value; }]; },
    };
    if (name === "@aba-mart/shared") return shared;
    if (name === "@/hooks/useCart") return { useCart: () => ({ lines: empty ? [] : [{ productId: "soap-id", variantId: null, quantity: 2 }] }) };
    if (name === "@/lib/api") return { ApiClientError };
    if (name === "@/lib/guest-api") return { guestApi: { post: async (path, body) => {
      calls.posts.push({ path, body });
      if (post) return post(path, body);
      return { order: { id: "order-id", orderReference: "ABA-1", total: 3000, items: [{ quantity: 2 }] }, whatsappUrl: "https://wa.me/example", message: "Prepared order", previewUrl: "/order-preview/example" };
    } } };
    if (name === "@/lib/whatsapp") return { reserveWhatsAppWindow: () => { calls.reserved++; return { close: () => calls.closed++ }; } };
    if (name === "@/lib/order-handoff") return { initiateOrderHandoff: async (...args) => { calls.handoffs.push(args); return true; } };
    if (name === "./lastOrderStore") return { saveLastOrder: value => calls.saved.push(value) };
    if (name === "react-icons/fa" || name === "react-icons/fi") return new Proxy({}, { get: () => component });
    if (name === "@/components/ui/Button") return { Button: component };
    if (name === "@/components/ui/Input") return { Input: component, Textarea: component };
    throw new Error(`Unexpected import: ${name}`);
  } };
  runInNewContext(source, context);
  function render() { cursor = 0; return context.exports.WhatsAppCheckout({ expectedTotal: 3000, checking, blockedReason, onSubmittingChange: value => calls.busy.push(value), onCartChanged: (...args) => calls.changed.push(args) }); }
  function find(predicate, root) {
    if (arguments.length === 1) root = render();
    if (!root || typeof root !== "object") return null;
    if (Array.isArray(root)) { for (const child of root) { const found = find(predicate, child); if (found) return found; } return null; }
    if (predicate(root)) return root;
    return find(predicate, root.props?.children);
  }
  function field(label, value) { const element = find(node => node.props?.label === label); assert.ok(element, `Missing field ${label}`); element.props.onChange({ target: { value } }); }
  function ready() {
    field("Full Name", "Ama Mensah"); field("Phone Number", "0241234567"); field("Delivery area or town", "East Legon, Accra");
    find(node => node.type === "input" && node.props.type === "checkbox").props.onChange({ target: { checked: true } });
  }
  async function submit() { await find(node => node.type === "form").props.onSubmit({ preventDefault() {} }); }
  return { calls, find, field, ready, submit };
}

test("inline checkout exposes invalid delivery details before creating an order", async () => {
  const form = mount(); form.field("Full Name", "Ama Mensah"); form.field("Phone Number", "0241234567"); await form.submit();
  // Delivery fields are always on screen, so the error is visible without expanding anything.
  assert.equal(form.find(node => node.type === "details"), null);
  assert.match(form.find(node => node.props.label === "Delivery area or town").props.error, /delivery area/i);
  assert.equal(form.calls.reserved, 0); assert.equal(form.calls.posts.length, 0);
});

test("WhatsApp contact confirmation is required before the order API is called", async () => {
  const form = mount(); form.field("Full Name", "Ama Mensah"); form.field("Phone Number", "0241234567"); form.field("Delivery area or town", "East Legon, Accra"); await form.submit();
  assert.equal(form.calls.posts.length, 0); assert.equal(form.calls.reserved, 0);
  assert.ok(form.find(node => node.props?.role === "alert"));
});

test("empty, blocked and updating carts reject direct form submissions", async () => {
  for (const options of [{ empty: true }, { blockedReason: "Stock changed" }, { checking: true }]) {
    const form = mount(options); form.ready(); await form.submit();
    assert.equal(form.calls.posts.length, 0); assert.equal(form.calls.reserved, 0);
  }
});

test("valid checkout uses live cart IDs, customer details and the existing handoff", async () => {
  const form = mount(); form.ready(); await form.submit();
  const [{ path, body }] = form.calls.posts;
  assert.equal(path, "/orders/whatsapp"); assert.equal(body.expectedTotal, 3000);
  assert.deepEqual(JSON.parse(JSON.stringify(body.items)), [{ productId: "soap-id", variantId: null, quantity: 2 }]);
  assert.equal(body.customer.name, "Ama Mensah"); assert.equal(body.customer.deliveryLocation, "East Legon, Accra");
  assert.equal(form.calls.saved[0].orderReference, "ABA-1"); assert.equal(form.calls.handoffs[0][0], "order-id");
  assert.deepEqual(form.calls.busy, [true, false]);
});

test("a changed server quote returns to review without handing off an outdated order", async () => {
  const quote = { subtotal: 3500, hasIssues: true, lines: [] };
  const form = mount({ post: async () => { throw new ApiClientError(409, "PRICE_CHANGED", "Price changed", { quote }); } });
  form.ready(); await form.submit();
  assert.equal(form.calls.changed[0][0], quote); assert.equal(form.calls.closed, 1);
  assert.equal(form.calls.handoffs.length, 0); assert.equal(form.calls.saved.length, 0);
  assert.deepEqual(form.calls.busy, [true, false]);
});

test("network retries retain the idempotency key to avoid duplicate orders", async () => {
  const form = mount({ post: async () => { throw new Error("Offline"); } }); form.ready(); await form.submit(); await form.submit();
  assert.equal(form.calls.posts.length, 2);
  assert.equal(form.calls.posts[0].body.idempotencyKey, form.calls.posts[1].body.idempotencyKey);
  assert.equal(form.calls.closed, 2); assert.equal(form.calls.handoffs.length, 0);
});
