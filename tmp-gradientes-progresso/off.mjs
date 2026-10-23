import { chromium } from '@playwright/test';
const b=await chromium.launch(); const c=await b.newContext({storageState:'e2e/.auth/user.json',viewport:{width:1440,height:900}});
await c.addInitScript(()=>{localStorage.setItem('dp-tour-completed','true');localStorage.setItem('ui-theme','dark');});
const p=await c.newPage(); await p.goto('http://localhost:8080/treinamentos',{waitUntil:'domcontentloaded'}); await p.waitForTimeout(2200);
await p.getByRole('tab',{name:'Inscrições'}).click(); await p.waitForTimeout(1200);
console.log(JSON.stringify(await p.evaluate(()=>({bars:document.querySelectorAll('[data-inscricao-row] [role=progressbar]').length,naoInformado:[...document.querySelectorAll('[data-inscricao-row]')].filter(r=>r.textContent.includes('Não informado')).length,status:[...document.querySelectorAll('[data-inscricao-row]')].map(r=>r.querySelectorAll('[role=cell]')[3]?.textContent.trim())}))));
await p.screenshot({path:'tmp-gradientes-progresso/flag-off-1440.png'}); await b.close();
