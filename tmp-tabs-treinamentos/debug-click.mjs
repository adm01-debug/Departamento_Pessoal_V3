import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
const state=JSON.parse(readFileSync("e2e/.auth/user.json","utf8"));
const b=await chromium.launch(); const c=await b.newContext({storageState:state,viewport:{width:1440,height:900}}); const p=await c.newPage();
await p.goto("http://localhost:8080/treinamentos",{waitUntil:"domcontentloaded"}); await p.getByRole("tab",{name:"Treinamentos"}).waitFor({timeout:30000}); await p.waitForTimeout(2500);
const res=await p.evaluate(async()=>{
 const tabs=[...document.querySelectorAll("[data-treinamentos-tablist] [role=tab]")];
 const alvo=tabs.find(a=>a.textContent.includes("Certificados"));
 const antes=tabs.find(a=>a.getAttribute("aria-selected")==="true")?.textContent;
 alvo.click();
 await new Promise(r=>setTimeout(r,800));
 const depois=[...document.querySelectorAll("[data-treinamentos-tablist] [role=tab]")].find(a=>a.getAttribute("aria-selected")==="true")?.textContent;
 const ind=document.querySelector("[data-aba-indicador]")?.getBoundingClientRect().x;
 return {antes,depois,ind,alvoTag:alvo.outerHTML.slice(0,180)};
});
console.log(res);
const res2=await p.evaluate(async()=>{
 const tabs=[...document.querySelectorAll("[data-treinamentos-tablist] [role=tab]")];
 const alvo=tabs.find(a=>a.textContent.includes("Treinamentos"));
 const antes=tabs.find(a=>a.getAttribute("aria-selected")==="true")?.textContent;
 alvo.dispatchEvent(new MouseEvent("click",{bubbles:true,cancelable:true,view:window}));
 await new Promise(r=>setTimeout(r,800));
 const depois=[...document.querySelectorAll("[data-treinamentos-tablist] [role=tab]")].find(a=>a.getAttribute("aria-selected")==="true")?.textContent;
 return {antes,depois,ind:document.querySelector("[data-aba-indicador]")?.getBoundingClientRect().x};
});
console.log(res2);
await b.close();
