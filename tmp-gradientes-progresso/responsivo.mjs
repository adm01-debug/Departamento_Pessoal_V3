import { chromium } from '@playwright/test';
const BASE='http://localhost:8080';
const b=await chromium.launch();
const viewports=[{w:1920,h:1080,n:'1920x1080'},{w:1440,h:900,n:'1440x900'},{w:1366,h:768,n:'1366x768'},{w:1024,h:768,n:'1024x768'},{w:390,h:844,n:'390x844'}];
const out=[];
for(const vp of viewports){
 const c=await b.newContext({storageState:'e2e/.auth/user.json',viewport:{width:vp.w,height:vp.h}});
 await c.addInitScript(()=>{localStorage.setItem('dp-tour-completed','true');localStorage.setItem('ui-theme','dark');localStorage.setItem('dp-force-motion','on');});
 const p=await c.newPage();
 await p.goto(BASE+'/treinamentos',{waitUntil:'domcontentloaded'}); await p.waitForTimeout(2400);
 await p.getByRole('tab',{name:'Inscrições'}).click(); await p.waitForTimeout(2600);
 const info=await p.evaluate(()=>{
  const table=document.querySelector('[role=table]'); const tableVisible=!!table&&getComputedStyle(table).display!=='none';
  const host=tableVisible?table:document.querySelector('[data-inscricao-card]')?.parentElement;
  const bars=[...(host?.querySelectorAll('[role=progressbar]')??[])];
  return {
   tableVisible, docOverflow:document.documentElement.scrollWidth-window.innerWidth,
   bars:bars.map(bar=>{const fill=bar.firstElementChild;const br=bar.getBoundingClientRect();const fr=fill.getBoundingClientRect();const cell=bar.closest('[role=cell],[data-inscricao-card]');const cr=cell.getBoundingClientRect();const txt=[...cell.querySelectorAll('span')].find(s=>/^\d+%$/.test(s.textContent.trim()));const tr=txt?.getBoundingClientRect();return {pct:txt?.textContent.trim(), aria:bar.getAttribute('aria-valuenow'), bh:+br.height.toFixed(1), fh:+fr.height.toFixed(1), ratio:+(100*fr.width/br.width).toFixed(1), within:br.left>=cr.left-0.5&&br.right<=cr.right+0.5, pctWithin:!!tr&&tr.right<=cr.right+0.5&&tr.left>=cr.left-0.5, shadow:getComputedStyle(fill).boxShadow, bg:getComputedStyle(fill).backgroundImage.includes('linear-gradient')};}),
   statuses:[...document.querySelectorAll('[data-inscricao-row]')].map(r=>r.querySelectorAll('[role=cell]')[3]?.textContent.trim()).filter(Boolean)
  };
 });
 out.push({viewport:vp.n,...info});
 if(info.tableVisible) await p.locator('[role=table]').screenshot({path:`tmp-gradientes-progresso/tabela-${vp.n}.png`}); else await p.screenshot({path:`tmp-gradientes-progresso/cards-${vp.n}.png`,fullPage:true});
 await c.close();
}
console.log(JSON.stringify(out,null,2));
await b.close();
