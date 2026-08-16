import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the Osprey command room", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Osprey/);
  assert.match(html, /Storm Ember/);
  assert.match(html, /ACTIVE INCIDENT/);
  assert.match(html, /Hazard-specific operational views/i);
  assert.match(html, /LIVE SOURCE MESH/);
  assert.match(html, /EXPOSURE QUERY/);
  assert.match(html, /TIME-BASED FORECAST/);
  assert.match(html, /COLLABORATIVE AGENT TEAM/);
  assert.match(html, /INCIDENT EVIDENCE GRAPH/);
  assert.match(html, /DECISION-TO-OUTCOME CHAIN/);
  assert.match(html, /Review decision packet/);
  assert.match(html, /OPERATIONAL IMPACT/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/);
});
