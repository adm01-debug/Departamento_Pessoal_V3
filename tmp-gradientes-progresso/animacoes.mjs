import { chromium } from '@playwright/test';
const BASE='http://localhost:8080';
const b=await chromium.launch();

async function novaPagina(){const c=await b.newContext({storageState:'e2e/.auth/user.json',viewport:{width:1440,height:950}});await c.addInitScript(()=>{localStorage.setItem('dp-tour-completed','true');localStorage.setItem('ui-theme','dark');localStorage.setItem('dp-force-motion','on');});return {c,p:await c.newPage()};}

// ── Funil ──
{
 const {c,p}=await novaPagina();
 await c.addInitScript(()=>{
  window.__rec={t0:null,d:[]};
  const id=setInterval(()=>{
   const tracks=[...document.querySelectorAll('div')].filter(el=>el.classList.contains('h-2')&&el.classList.contains('bg-muted/40'));
   if(!tracks.length) return;
   if(window.__rec.t0===null) window.__rec.t0=performance.now();
   const t=+(performance.now()-window.__rec.t0).toFixed(1);
   const last=window.__rec.d[window.__rec.d.length-1];
   if(last&&t-last.t<10) return;
   window.__rec.d.push({t,w:tracks.map(tr=>{const f=tr.firstElementChild;const a=tr.getBoundingClientRect().width;return f&&a?+(100*f.getBoundingClientRect().width/a).toFixed(1):0;})});
  },16);
  window.__stopRec=()=>clearInterval(id);
 });
 await p.goto(BASE+'/admissoes',{waitUntil:'domcontentloaded'}); await p.waitForTimeout(3500);
 const rec=await p.evaluate(()=>{window.__stopRec();return window.__rec;});
 const final=rec.d.at(-1).w;
 const res=final.map((alvo,i)=>{
  const inicio=rec.d.find(s=>s.w[i]>0.2);
  const fim=rec.d.find(s=>Math.abs(s.w[i]-alvo)<0.6&&s.t>(inicio?.t??0));
  return {i,alvo,delay:inicio?.t??null,dur:inicio&&fim?+(fim.t-inicio.t).toFixed(0):null};
 });
 console.log('FUNIL',JSON.stringify({amostras:rec.d.length,res},null,2));
 await c.close();
}

// ── Inscrições ──
{
 const {c,p}=await novaPagina();
 await p.goto(BASE+'/treinamentos',{waitUntil:'domcontentloaded'}); await p.waitForTimeout(2500);
 await p.evaluate(()=>{
  window.__rec={t0:null,d:[]};
  const id=setInterval(()=>{
   const rows=[...document.querySelectorAll('[data-inscricao-row]')];
   if(!rows.length) return;
   if(window.__rec.t0===null) window.__rec.t0=performance.now();
   const t=+(performance.now()-window.__rec.t0).toFixed(1);
   const last=window.__rec.d[window.__rec.d.length-1];
   if(last&&t-last.t<10) return;
   window.__rec.d.push({t,w:rows.map(r=>{const tr=r.querySelector('[role=progressbar]');const f=tr?.firstElementChild;const a=tr?.getBoundingClientRect().width;return f&&a?+(100*f.getBoundingClientRect().width/a).toFixed(1):0;}),o:rows.map(r=>+getComputedStyle(r).opacity)});
  },16);
  window.__stopRec=()=>clearInterval(id);
 });
 await p.getByRole('tab',{name:'Inscrições'}).click(); await p.waitForTimeout(2400);
 const rec=await p.evaluate(()=>{window.__stopRec();return window.__rec;});
 const final=rec.d.at(-1).w;
 const res=final.map((alvo,i)=>{
  const inicio=rec.d.find(s=>s.w[i]>0.2);
  const fim=rec.d.find(s=>Math.abs(s.w[i]-alvo)<0.6&&s.t>(inicio?.t??0));
  return {i,alvo,delay:inicio?.t??null,dur:inicio&&fim?+(fim.t-inicio.t).toFixed(0):null,opacidadeNoInicio:inicio?rec.d.find(s=>s.t===inicio.t)?.o[i]:null};
 });
 console.log('INSCRICOES',JSON.stringify({amostras:rec.d.length,res},null,2));
 await p.screenshot({path:'tmp-gradientes-progresso/tabela-1440-final.png'});
 await c.close();
}
await b.close();
