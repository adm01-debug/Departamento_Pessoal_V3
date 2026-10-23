import { chromium } from '@playwright/test';
const b=await chromium.launch(); const c=await b.newContext({storageState:'e2e/.auth/user.json',viewport:{width:1440,height:900}});
await c.addInitScript(()=>{localStorage.setItem('dp-tour-completed','true');localStorage.setItem('ui-theme','dark');localStorage.setItem('dp-force-motion','on');});
const p=await c.newPage(); await p.goto('http://localhost:8080/treinamentos',{waitUntil:'domcontentloaded'}); await p.waitForTimeout(2200);
await p.getByRole('tab',{name:'Inscrições'}).click(); await p.waitForTimeout(2300);
await p.locator('[data-segmento="em_andamento"]').click(); await p.waitForTimeout(300);
const r=await p.evaluate(()=>({rows:document.querySelectorAll('[data-inscricao-row]').length,bars:[...document.querySelectorAll('[data-inscricao-row] [role=progressbar]')].map(t=>{const f=t.firstElementChild;return {aria:t.getAttribute('aria-valuenow'),w:+(100*f.getBoundingClientRect().width/t.getBoundingClientRect().width).toFixed(1)}}),status:[...document.querySelectorAll('[data-inscricao-row]')].map(r=>r.querySelectorAll('[role=cell]')[3]?.textContent.trim())}));
console.log(JSON.stringify(r)); await b.close();
