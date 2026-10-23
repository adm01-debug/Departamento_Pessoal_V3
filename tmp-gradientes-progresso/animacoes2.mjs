import { chromium } from '@playwright/test';
const BASE='http://localhost:8080';
const b=await chromium.launch();
const c=await b.newContext({storageState:'e2e/.auth/user.json',viewport:{width:1440,height:950}});
await c.addInitScript(()=>{localStorage.setItem('dp-tour-completed','true');localStorage.setItem('ui-theme','dark');localStorage.setItem('dp-force-motion','on');});
const p=await c.newPage();
await p.goto(BASE+'/treinamentos',{waitUntil:'domcontentloaded'}); await p.waitForTimeout(2500);
await p.evaluate(()=>{
 window.__rec={t0:null,d:[]};
 const id=setInterval(()=>{
  const rows=[...document.querySelectorAll('[data-inscricao-row]')];
  if(!rows.length) return;
  if(window.__rec.t0===null) window.__rec.t0=performance.now();
  const t=+(performance.now()-window.__rec.t0).toFixed(1); const last=window.__rec.d.at(-1); if(last&&t-last.t<10) return;
  window.__rec.d.push({t,w:rows.map(r=>{const tr=r.querySelector('[role=progressbar]');const f=tr?.firstElementChild;const a=tr?.getBoundingClientRect().width;return f&&a?+(100*f.getBoundingClientRect().width/a).toFixed(1):0;}),o:rows.map(r=>+getComputedStyle(r).opacity)});
 },16); window.__stopRec=()=>clearInterval(id);
});
await p.getByRole('tab',{name:'Inscrições'}).click(); await p.waitForTimeout(2500);
const rec=await p.evaluate(()=>{window.__stopRec();return window.__rec;});
const final=rec.d.at(-1).w;
const res=final.map((alvo,i)=>{
 const ini=rec.d.find(s=>s.w[i]>0.2); const fim=rec.d.find(s=>Math.abs(s.w[i]-alvo)<0.6&&s.t>(ini?.t??0));
 return {i,alvo,delay:ini?.t??null,dur:ini&&fim?+(fim.t-ini.t).toFixed(0):null,opacidade:ini?rec.d.find(s=>s.t===ini.t)?.o[i]:null};
});
console.log(JSON.stringify({amostras:rec.d.length,res},null,2));
await p.screenshot({path:'tmp-gradientes-progresso/tabela-1440-final.png'});
await b.close();
