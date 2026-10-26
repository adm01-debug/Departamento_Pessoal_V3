import { chromium } from '@playwright/test';
const b=await chromium.launch();
const c=await b.newContext({storageState:'e2e/.auth/user.json',viewport:{width:1280,height:900}});
await c.addInitScript(()=>{localStorage.setItem('dp-tour-completed','true');localStorage.setItem('ui-theme','dark');localStorage.setItem('dp-force-motion','on')});
const p=await c.newPage();
await p.goto('http://localhost:8080/recrutamento',{waitUntil:'domcontentloaded'});await p.waitForTimeout(1800);await p.getByRole('tab',{name:'Vagas',exact:true}).click();await p.waitForTimeout(2500);
console.log(JSON.stringify(await p.evaluate(()=>[...document.querySelectorAll('[data-vaga-funil] .grid > div')].slice(0,5).map(d=>{const s=d.querySelector('span');const cs=getComputedStyle(s);const r=s.getBoundingClientRect();const dr=d.getBoundingClientRect();return {texto:s.textContent,whiteSpace:cs.whiteSpace,overflow:cs.overflow,textOverflow:cs.textOverflow,fontSize:cs.fontSize,color:cs.color,scrollWidth:s.scrollWidth,clientWidth:s.clientWidth,rectW:Math.round(r.width),colW:Math.round(dr.width),lines:Math.round(r.height/parseFloat(cs.lineHeight))}})),null,2));
await c.close();await b.close();
