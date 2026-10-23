import { chromium } from '@playwright/test';
const BASE='http://localhost:8080';
const b=await chromium.launch();
const c=await b.newContext({storageState:'e2e/.auth/user.json',viewport:{width:1440,height:950}});
await c.addInitScript(()=>{localStorage.setItem('dp-tour-completed','true');localStorage.setItem('ui-theme','dark');});
const p=await c.newPage();
await p.goto(BASE+'/treinamentos',{waitUntil:'domcontentloaded'}); await p.waitForTimeout(2500);
await p.getByRole('tab',{name:'Inscrições'}).click(); await p.waitForTimeout(1400);
const r=await p.evaluate(()=>{
  const rows=[...document.querySelectorAll('[data-inscricao-row]')];
  return rows.map(row=>{
    const bar=row.querySelector('[role=progressbar]'); const fill=bar?.firstElementChild;
    const cs=fill?getComputedStyle(fill):null; const rect=bar?.getBoundingClientRect(); const frect=fill?.getBoundingClientRect();
    return {pct:[...row.querySelectorAll('span')].map(s=>s.textContent.trim()).find(x=>/^\d+%$/.test(x)), aria:bar?.getAttribute('aria-valuenow'), bg:cs?.backgroundImage, w:rect&&frect?+(100*frect.width/rect.width).toFixed(2):null, h:rect?.height, shadow:cs?.boxShadow};
  });
});
console.log(JSON.stringify(r,null,2));
await p.screenshot({path:'tmp-gradientes-progresso/tabela-1440.png',fullPage:false});
await b.close();
