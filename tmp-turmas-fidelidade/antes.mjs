import { chromium } from '@playwright/test';
const b=await chromium.launch(); const c=await b.newContext({storageState:'e2e/.auth/user.json',viewport:{width:1440,height:900}});
await c.addInitScript(()=>{localStorage.setItem('dp-tour-completed','true');localStorage.setItem('ui-theme','dark');localStorage.setItem('dp-force-motion','on');});
const p=await c.newPage(); await p.goto('http://localhost:8080/treinamentos',{waitUntil:'domcontentloaded'}); await p.waitForTimeout(2200);
await p.getByRole('tab',{name:'Turmas'}).click(); await p.waitForTimeout(2600);
await p.screenshot({path:'tmp-turmas-fidelidade/antes-1440.png',fullPage:true});
const dados=await p.evaluate(()=>({
 cards:[...document.querySelectorAll('[data-turma-card]')].map(c=>({id:c.getAttribute('data-turma-card'),texto:c.innerText,cover:c.querySelector('[data-training-cover]')?.getAttribute('data-training-cover-estado'),headerH:c.querySelector('[data-turma-header]')?.getBoundingClientRect().height,cardH:c.getBoundingClientRect().height,cardW:c.getBoundingClientRect().width})),
 agenda:document.querySelector('[data-turmas-agenda]')?.innerText,
 tabs:[...document.querySelectorAll('[role=tab]')].map(t=>t.textContent.trim())
}));
console.log(JSON.stringify(dados,null,2)); await b.close();
