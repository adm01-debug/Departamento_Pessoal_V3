import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
const state = JSON.parse(readFileSync("e2e/.auth/user.json","utf8"));
const b = await chromium.launch();
const c = await b.newContext({ storageState: state, viewport:{width:1440,height:900} });
const p = await c.newPage();
await p.goto("http://localhost:8080/colaboradores", { waitUntil:"domcontentloaded" });
await p.waitForTimeout(4500);
const info = await p.evaluate(() => ({
  texto: document.body.innerText.slice(0, 1200),
  botoes: [...document.querySelectorAll("button")].map(b => ({ t: b.textContent?.trim(), a: b.getAttribute("aria-label") })).filter(x => x.t || x.a).slice(0,30),
  linhas: [...document.querySelectorAll("tr")].slice(0,5).map(r => r.innerText.slice(0,150)),
}));
console.log(JSON.stringify(info, null, 2));
await c.close(); await b.close();
