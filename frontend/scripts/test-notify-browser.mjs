/** Real audio/CSP checks, with no application API calls or production data. */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { chromium } from "playwright";
import ts from "typescript";
import config from "../next.config.mjs";

const source = await readFile(new URL("../src/admin/notify.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ES2020 } }).outputText;
const headers = await config.headers();
const policy = headers[0].headers.find((h) => h.key === "Content-Security-Policy").value;
const html = `<!doctype html><title>Isolated order audio regression</title>
<button id="ring">Prime and ring</button><button id="preview">Preview tone</button><button id="stop">Stop</button>
<script type="module">
  import * as notify from '/notify.js';
  window.notify = notify;
  window.players = [];
  window.violations = [];
  document.addEventListener('securitypolicyviolation', e => violations.push(e.effectiveDirective));
  const NativeAudio = window.Audio;
  window.Audio = function(...args) { const a = new NativeAudio(...args); players.push(a); return a; };
  document.querySelector('#ring').onclick = () => {
    notify.unlockAudio();
    notify.startNewOrderRing(Date.now() + 30_000, window.tone || 'classic');
  };
  document.querySelector('#preview').onclick = () => notify.playTestChime(window.tone || 'classic');
  document.querySelector('#stop').onclick = () => notify.stopNewOrderRing();
</script>`;
const server = createServer((req, res) => {
  if (req.url === "/notify.js") {
    res.writeHead(200, { "Content-Type": "text/javascript" });
    res.end(code);
    return;
  }
  const csp = req.url === "/blocked" ? policy.replace("media-src 'self' blob:", "media-src 'none'") : policy;
  res.writeHead(200, { "Content-Type": "text/html", "Content-Security-Policy": csp });
  res.end(html);
});

let browser;
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const newPage = async (route = "/") => {
  const page = await browser.newPage();
  // The fixture is local. Reject any unexpected non-local request.
  await page.route("**/*", (route) => route.request().url().startsWith(base + "/") ? route.continue() : route.abort());
  await page.goto(base + route);
  await page.waitForFunction(() => !!window.notify);
  return page;
};
const playing = async (page) => {
  await page.waitForFunction(() => {
    const a = window.players[0];
    return a && !a.paused && a.loop && a.volume === 1 && a.currentTime > 0.05 && !a.error && a.readyState >= 2;
  }, undefined, { timeout: 5000 });
  assert.equal(await page.evaluate(() => window.notify.getAudioState()), "ready");
};

try {
  browser = await chromium.launch({
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}),
    headless: true,
    args: ["--autoplay-policy=user-gesture-required"],
  });

  const tones = ["classic", "kitchen", "siren", "buzzer", "doorbell"];
  for (const tone of tones) {
    const page = await newPage();
    await page.evaluate((tone) => { window.tone = tone; }, tone);
    await page.locator("#ring").click();
    await playing(page);
    // Preview while ringing must keep looping, including after the WAV ends.
    await page.locator("#preview").click();
    await page.waitForTimeout(1000);
    await playing(page);
    assert.deepEqual(await page.evaluate(() => violations), []);
    await page.locator("#stop").click();
    assert.equal(await page.evaluate(() => players[0].paused), true);
    await page.close();
    console.log(`PASS: ${tone} plays under application CSP and stops on resolution`);
  }

  const blocked = await newPage("/blocked");
  await blocked.locator("#ring").click();
  await blocked.waitForFunction(() => notify.getAudioState() === "blocked");
  assert.ok((await blocked.evaluate(() => violations)).includes("media-src"));
  assert.equal(await blocked.evaluate(() => notify.isAudioUnlocked()), false);
  await blocked.close();
  console.log("PASS: CSP failure is reported instead of claiming sound is ready");

  const autoplay = await newPage();
  await autoplay.evaluate(() => notify.startNewOrderRing(Date.now() + 30_000));
  await autoplay.waitForFunction(() => notify.getAudioState() === "blocked");
  await autoplay.locator("#ring").click();
  await playing(autoplay);
  await autoplay.close();
  console.log("PASS: blocked autoplay recovers on a trusted click");
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
