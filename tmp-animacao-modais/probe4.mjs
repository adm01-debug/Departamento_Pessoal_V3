import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
const state = JSON.parse(readFileSync("e2e/.auth/user.json","utf8"));
const b = await chromium.launch();
const c = await b.newContext({ storageState: state, viewport:{width:1440,height:900} });
const p = await c.newPage();
await p.goto("http://localhost:8080/colaboradores", { waitUntil:"domcontentloaded" });
await p.waitForTimeout(3500);
await p.getByText("Ana Beatriz Souza", { exact:true }).first().click();
await p.waitForTimeout(2500);
const info = await p.evaluate(() => ({
  url: location.pathname,
  pendencias: [...document.querySelectorAll("button")].filter(b => (b.textContent||"").toLowerCase().includes("pend") || (b.getAttribute("aria-label")||"").toLowerCase().includes("pend")).map(b => ({t:b.textContent?.trim(), a:b.getAttribute("aria-label")})).slice(0,10),
  verTodas: [...document.querySelectorAll("button")].filter(b => (b.textContent||"").includes("Ver todas")).map(b => b.textContent?.trim()).slice(0,10),
  texto: document.body.innerText.includes("Pendências"),
}));
console.log(JSON.stringify(info, null, 2));
await p.screenshot({path:"tmp-animacao-modais/colaborador-detalhe.png", fullPage:false});
await c.close(); await b.close();
