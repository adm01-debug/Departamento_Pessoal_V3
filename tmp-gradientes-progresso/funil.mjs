import { chromium } from '@playwright/test';
const BASE='http://localhost:8080';
const b=await chromium.launch();
const c=await b.newContext({storageState:'e2e/.auth/user.json',viewport:{width:1440,height:950}});
await c.addInitScript(()=>{localStorage.setItem('dp-tour-completed','true');localStorage.setItem('ui-theme','dark');localStorage.setItem('dp-force-motion','on');});
const p=await c.newPage();
await p.goto(BASE+'/admissoes',{waitUntil:'domcontentloaded'}); await p.waitForTimeout(3500);
const data=await p.evaluate(()=>{
 const tracks=[...document.querySelectorAll('div')].filter(el=>el.classList.contains('h-2')&&el.classList.contains('bg-muted/40'));
 return tracks.map(t=>{const li=t.closest('li');const fill=t.firstElementChild;return {label:li?.querySelector('span')?.textContent?.trim(), pct:li?.lastElementChild?.textContent?.trim(), h:t.getBoundingClientRect().height, w:fill?.getBoundingClientRect().width};});
});
console.log(JSON.stringify(data,null,2));
await p.screenshot({path:'tmp-gradientes-progresso/funil-1440.png'});
await b.close();
