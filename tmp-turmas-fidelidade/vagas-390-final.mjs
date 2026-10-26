import { chromium } from '@playwright/test';
const b=await chromium.launch();
const c=await b.newContext({storageState:'e2e/.auth/user.json',viewport:{width:390,height:844}});
await c.addInitScript(()=>{localStorage.setItem('dp-tour-completed','true');localStorage.setItem('ui-theme','dark');localStorage.setItem('dp-force-motion','on')});
const p=await c.newPage();
await p.goto('http://localhost:8080/recrutamento',{waitUntil:'domcontentloaded'});await p.waitForTimeout(1800);await p.getByRole('tab',{name:'Vagas',exact:true}).click();await p.waitForTimeout(4000);
await p.locator('[data-vaga-card]').first().screenshot({path:'tmp-turmas-fidelidade/vaga-refino-390.png'});
console.log(await p.locator('[data-vagas-grid]').evaluate(el=>({cards:el.children.length,gridOverflow:el.scrollWidth-el.clientWidth,mainOverflow:(()=>{const m=document.querySelector('main');return m?m.scrollWidth-m.clientWidth:null})()})));
await c.close();await b.close();
