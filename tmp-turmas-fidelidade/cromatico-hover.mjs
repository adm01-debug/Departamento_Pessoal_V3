import { chromium } from '@playwright/test';
const b=await chromium.launch();const c=await b.newContext({storageState:'e2e/.auth/user.json',viewport:{width:1600,height:1000}});await c.addInitScript(()=>{localStorage.setItem('dp-tour-completed','true');localStorage.setItem('ui-theme','dark');localStorage.setItem('dp-force-motion','on')});const p=await c.newPage();await p.goto('http://localhost:8080/recrutamento',{waitUntil:'domcontentloaded'});await p.waitForTimeout(1500);await p.getByRole('tab',{name:'Vagas',exact:true}).click();await p.waitForTimeout(3500);
const card=p.locator('[data-vaga-card="mock-vaga-1"]');
const antes=await card.evaluate(el=>({borda:getComputedStyle(el).borderTopColor,sombra:getComputedStyle(el).boxShadow}));
await card.hover();await p.waitForTimeout(250);
const depois=await card.evaluate(el=>({borda:getComputedStyle(el).borderTopColor,sombra:getComputedStyle(el).boxShadow}));
const status=await p.locator('[data-vaga-card="mock-vaga-4"] [data-vaga-status]').evaluate(el=>el.getAttribute('data-vaga-status'));
const badge=await p.locator('[data-vaga-card="mock-vaga-4"] span').filter({hasText:'Fechada'}).first().evaluate(el=>({cor:getComputedStyle(el).color,fundo:getComputedStyle(el).backgroundColor,borda:getComputedStyle(el).borderTopColor}));
console.log(JSON.stringify({antes,depois,status,badge},null,2));await c.close();await b.close();
