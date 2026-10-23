import { chromium } from '@playwright/test';
const BASE='http://localhost:8080'; const b=await chromium.launch();
for(const w of [1024,390]){
 const c=await b.newContext({storageState:'e2e/.auth/user.json',viewport:{width:w,height:844}}); await c.addInitScript(()=>{localStorage.setItem('dp-tour-completed','true');localStorage.setItem('ui-theme','dark');});
 const p=await c.newPage(); await p.goto(BASE+'/treinamentos',{waitUntil:'domcontentloaded'}); await p.waitForTimeout(2200);
 const antes=await p.evaluate(()=>({sw:document.documentElement.scrollWidth,iw:innerWidth,wide:[...document.querySelectorAll('*')].filter(e=>{const r=e.getBoundingClientRect();return r.right>innerWidth+1&&r.width>0}).slice(0,8).map(e=>({tag:e.tagName,cls:typeof e.className==='string'?e.className.slice(0,90):'',right:+e.getBoundingClientRect().right.toFixed(0),w:+e.getBoundingClientRect().width.toFixed(0)}))}));
 await p.getByRole('tab',{name:'Inscrições'}).click(); await p.waitForTimeout(2400);
 const depois=await p.evaluate(()=>({sw:document.documentElement.scrollWidth,iw:innerWidth,wide:[...document.querySelectorAll('*')].filter(e=>{const r=e.getBoundingClientRect();return r.right>innerWidth+1&&r.width>0}).slice(0,8).map(e=>({tag:e.tagName,cls:typeof e.className==='string'?e.className.slice(0,90):'',right:+e.getBoundingClientRect().right.toFixed(0),w:+e.getBoundingClientRect().width.toFixed(0)}))}));
 console.log(w,JSON.stringify({antes,depois},null,2));
 await c.close();
}
await b.close();
