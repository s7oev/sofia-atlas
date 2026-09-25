const format = (value, digits = 0) => new Intl.NumberFormat('bg-BG', {minimumFractionDigits:digits, maximumFractionDigits:digits}).format(value);
const quarter = q => { const [year, n] = q.split('-Q'); return `${['I','II','III','IV'][Number(n)-1]} трим. ${year}`; };
const svg = document.querySelector('#chart');
const ns = 'http://www.w3.org/2000/svg';
function add(tag, attributes, text) {const el=document.createElementNS(ns,tag);for(const [key,value] of Object.entries(attributes))el.setAttribute(key,value);if(text)el.textContent=text;svg.append(el);return el;}
function draw(data){
 const currency=document.querySelector('#currency').value;
 const suffix=currency==='eur'?'€':'лв.';
 const key=`implied_${currency}_per_m2`;
 const last=data.at(-1);
 document.querySelector('#period').textContent=quarter(last.quarter).toUpperCase();
 document.querySelector('#latest').textContent=`${format(last[key])} ${suffix}/м²`;
 svg.replaceChildren();add('title',{id:'chart-title'},`Оценена цена в ${suffix}/м² от ${quarter(data[0].quarter)} до ${quarter(last.quarter)}`);
 const left=65,right=935,top=18,bottom=305;
 const max=Math.ceil(Math.max(...data.map(d=>d[key]))/500)*500;
 const x=i=>left+i/(data.length-1)*(right-left),y=v=>bottom-v/max*(bottom-top);
 for(let i=0;i<=5;i++){const value=max*i/5;add('line',{x1:left,x2:right,y1:y(value),y2:y(value),stroke:'#e8ede7'});add('text',{x:left-12,y:y(value)+4,'text-anchor':'end',fill:'#75877e','font-size':12},format(value));}
 const points=data.map((d,i)=>`${x(i)},${y(d[key])}`);
 add('path',{d:`M ${left},${bottom} L ${points.join(' L ')} L ${right},${bottom} Z`,fill:'#e9f2e9'});
 add('polyline',{points:points.join(' '),fill:'none',stroke:'#278168','stroke-width':3,'stroke-linejoin':'round'});
 data.forEach((d,i)=>{if(d.quarter.endsWith('Q1')&&(Number(d.quarter.slice(0,4))%2===1)){add('text',{x:x(i),y:335,'text-anchor':'middle',fill:'#75877e','font-size':12},d.quarter.slice(0,4));}
 const text=`${quarter(d.quarter)} · ${format(d[key],2)} ${suffix}/м² · ${d.quarterly_change_pct>0?'+':''}${format(d.quarterly_change_pct,1)}% спрямо предходното тримесечие`;
 const p=add('circle',{cx:x(i),cy:y(d[key]),r:5,fill:'#278168',class:'point',tabindex:0,role:'img','aria-label':text});
 const title=document.createElementNS(ns,'title');title.textContent=text;p.append(title);
 for(const event of ['mouseenter','focus','click'])p.addEventListener(event,()=>document.querySelector('#selected').textContent=text);
 });
 document.querySelector('#selected').textContent=`${quarter(last.quarter)} · ${format(last[key],2)} ${suffix}/м²`;
}
fetch('data/prices.csv').then(r=>{if(!r.ok)throw Error(r.status);return r.text();}).then(text=>{
 const [header,...lines]=text.trim().split(/\r?\n/);const keys=header.split(',');
 const data=lines.map(line=>Object.fromEntries(line.split(',').map((v,i)=>[keys[i],i===0?v:Number(v)])));
 if(!data.length||data.some(d=>!Number.isFinite(d.implied_eur_per_m2)||!Number.isFinite(d.implied_bgn_per_m2)))throw Error('Invalid data');
 draw(data);document.querySelector('#currency').addEventListener('change',()=>draw(data));
 for(const d of [...data].reverse()){const tr=document.createElement('tr');for(const v of [quarter(d.quarter),`${format(d.quarterly_change_pct,1)}%`,format(d.implied_eur_per_m2,2),format(d.implied_bgn_per_m2,2)]){const td=document.createElement('td');td.textContent=v;tr.append(td);}document.querySelector('#rows').append(tr);}
}).catch(()=>{document.querySelector('#error').hidden=false;document.querySelector('#period').textContent='Данните не са достъпни';});
