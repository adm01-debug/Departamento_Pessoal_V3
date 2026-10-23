import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
const state=JSON.parse(readFileSync('e2e/.auth/user.json','utf8'));
const b=await chromium.launch();
for (const path of ['/treinamentos','/dashboard-executivo','/avaliacao']) {
 const c=await b.newContext({storageState:state,viewport:{width:390,height:844}});
 const p=await c.newPage(); await p.goto('http://localhost:8080'+path,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(3000);
 const info=await p.evaluate(()=>{
  const w=document.documentElement.clientWidth;
  const fora=[...document.querySelectorAll('body *')].map(el=>{const r=el.getBoundingClientRect();return {tag:el.tagName,cls:String(el.className).slice(0,90),x:Math.round(r.x),right:Math.round(r.right),w:Math.round(r.width),pos:getComputedStyle(el).position,vis:getComputedStyle(el).visibility,disp:getComputedStyle(el).display}}).filter(e=>e.disp!=='none'&&e.vis!=='hidden'&&(e.right>w+1||e.x<-1)).slice(0,30);
  return {w,doc:document.documentElement.scrollWidth,body:document.body.scrollWidth,fora};
 });
 console.log(path,JSON.stringify(info)); await c.close();
}
await b.close();
