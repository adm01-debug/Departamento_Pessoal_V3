import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
const state=JSON.parse(readFileSync("e2e/.auth/user.json","utf8"));
const b=await chromium.launch();
for (const p of ["dashboard-executivo","treinamentos"]) {
 const c=await b.newContext({storageState:state,viewport:{width:390,height:844}}); const page=await c.newPage();
 await page.goto("http://localhost:8080/"+p,{waitUntil:"domcontentloaded"}); await page.waitForTimeout(2500);
 console.log(p, await page.evaluate(()=>({vw:document.documentElement.clientWidth,doc:document.documentElement.scrollWidth,main:document.querySelector("main")?.scrollWidth, tablist:document.querySelector("[data-treinamentos-tablist]")?.scrollWidth ?? null})));
 await c.close();
}
await b.close();
