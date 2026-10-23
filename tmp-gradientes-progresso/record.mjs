import { chromium } from '@playwright/test';
import fs from 'node:fs';
const b=await chromium.launch(); const c=await b.newContext({storageState:'e2e/.auth/user.json',viewport:{width:1440,height:900}});
await c.addInitScript(()=>{localStorage.setItem('dp-tour-completed','true');localStorage.setItem('ui-theme','dark');localStorage.setItem('dp-force-motion','on');});
const p=await c.newPage(); await p.goto('http://localhost:8080/treinamentos',{waitUntil:'domcontentloaded'}); await p.waitForTimeout(2200);
const t0=Date.now(); await p.getByRole('tab',{name:'Inscrições'}).click(); const amostras=[];
for(let i=0;i<22;i++){await p.waitForTimeout(100);amostras.push(await p.evaluate(()=>({t:Math.round(performance.now()),w:[...document.querySelectorAll('[data-inscricao-row]')].map(row=>{const t=row.querySelector('[role=progressbar]');const f=t?.firstElementChild;return t&&f?+(100*f.getBoundingClientRect().width/t.getBoundingClientRect().width).toFixed(1):null;})})));}
const data={url:'/treinamentos#inscricoes',click_to_first_sample_ms:Date.now()-t0,amostras};
fs.writeFileSync('tmp-gradientes-progresso/animacao-tempos.json',JSON.stringify(data,null,2));
console.log('samples',amostras.length,'final',amostras.at(-1).w); await b.close();
