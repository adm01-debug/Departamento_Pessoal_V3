const base=[18,29,43];
const itens=[['Dados',[20,184,166],.27],['RH',[167,139,250],.28],['Tecnologia',[56,189,248],.25],['Administrativo',[251,191,36],.22],['Comercial',[52,211,153],.24]];
const lin=c=>{c/=255;return c<=.04045?c/12.92:Math.pow((c+.055)/1.055,2.4)};
const L=rgb=>.2126*lin(rgb[0])+.7152*lin(rgb[1])+.0722*lin(rgb[2]);
for(const [nome,cor,a] of itens){const mix=cor.map((v,i)=>Math.round(v*a+base[i]*(1-a))); console.log(nome, mix.join(','), 'luminance', L(mix).toFixed(4));}
