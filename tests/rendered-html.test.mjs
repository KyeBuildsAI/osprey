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

test("server-renders the Houston–Galveston incident room", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Osprey/);
  assert.match(html, /Houston–Galveston/);
  assert.match(html, /ACTIVE(?:<!-- -->)? INCIDENT/);
  assert.match(html, /SHARED INCIDENT STATE/);
  assert.match(html, /SOURCE HEALTH &amp; PROVENANCE/);
  assert.match(html, /Every operational claim has a visible data state/);
  assert.match(html, /Event time/);
  assert.match(html, /Received/);
  assert.match(html, /Refresh live intelligence/);
  assert.match(html, /OPERATIONAL MAP/);
  assert.match(html, /INFRASTRUCTURE WINDOW/);
  assert.match(html, /LOADING INFRASTRUCTURE MAP/);
  assert.match(html, /EXPOSURE QUERY/);
  assert.match(html, /NWS warning polygons/);
  assert.match(html, /USGS elevations/);
  assert.match(html, /FLOOD &amp; WATER INTELLIGENCE v1/);
  assert.match(html, /Live thresholds, trends and tide anomalies/);
  assert.match(html, /NOAA NWPS · USGS · NOAA CO-OPS · FEMA NFHL/);
  assert.match(html, /EXPECTED METADATA LAG/);
  assert.match(html, /Threshold Metadata pending/);
  assert.match(html, /caches verified values for 24 hours/);
  assert.match(html, /FLOOD-ZONE REFERENCE/);
  assert.match(html, /Loading the verified FEMA NFHL regional snapshot/);
  assert.match(html, /Background refresh every.*7.*days/);
  assert.match(html, /NOAA STAGE LADDER/);
  assert.match(html, /Readiness; flooding not implied/);
  assert.match(html, /Initial limited impacts/);
  assert.match(html, /Significant wider impacts/);
  assert.match(html, /Serious extensive impacts/);
  assert.match(html, /Next: Action at 17 ft/);
  assert.match(html, /INFRASTRUCTURE IDENTIFY/);
  assert.match(html, /Click the map to inspect/);
  assert.match(html, /VISIBLE CONTEXT/);
  assert.match(html, /Terrain/);
  assert.match(html, /Source boundary/);
  assert.match(html, /TIME-BASED FORECAST/);
  assert.match(html, /LIVE HOURLY NWS · issued frame · valid time shown/);
  assert.match(html, /Weather Agent/);
  assert.match(html, /Infrastructure Agent/);
  assert.match(html, /Operations Agent/);
  assert.match(html, /Communications Agent/);
  assert.match(html, /EVIDENCE USED/);
  assert.match(html, /INCIDENT EVIDENCE GRAPH/);
  assert.match(html, /Review decision packet/);
  assert.match(html, /DECISION-TO-OUTCOME CHAIN/);
  assert.match(html, /OPERATIONAL IMPACT/);
  assert.match(html, /INCIDENT TIMELINE/);
  assert.match(html, /DEMONSTRATION DECISIONS/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/);
});
