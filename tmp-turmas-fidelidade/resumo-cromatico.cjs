const fs=require('fs');
const read=p=>{let t=fs.readFileSync(p,'utf16le'); if(t.charCodeAt(0)===0xFEFF)t=t.slice(1); return JSON.parse(t);};
const d=read('tmp-turmas-fidelidade/cromatico-responsive.json');
for(const w of d){const c=w.cards; const u=a=>[...new Set(a)].join('/'); const trunc=c.flatMap(x=>x.labels).filter(x=>x&&x.truncado).length; console.log(w.width, 'doc='+w.docOverflow, 'h='+u(c.map(x=>x.h)), 'funilTop='+u(c.map(x=>x.funilTop)), 'foot='+u(c.map(x=>x.botaoBottomInset)), 'labelsTrunc='+trunc, 'cardOverflow='+c.map(x=>x.overflow).join(','));}
const f=read('tmp-turmas-fidelidade/cromatico-final.json');
console.log(JSON.stringify(f,null,2));
