(()=>{'use strict';
const number=v=>Number(String(v??0).replace(/,/g,'').match(/-?\d+(?:\.\d+)?/)?.[0]||0);
function parsePack(value,unit){
 const s=String(value||'').trim().toLowerCase().replace(/×/g,'x').replace(/\s+/g,'');
 const fallback=String(unit||'PCS').toUpperCase();
 let count=1,size=1,u=fallback;
 const multi=s.match(/^(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)(kg|g|l|ml|pcs?)$/i);
 const single=s.match(/^(\d+(?:\.\d+)?)(kg|g|l|ml|pcs?)$/i);
 if(multi){count=number(multi[1]);size=number(multi[2]);u=multi[3].toUpperCase()}
 else if(single){size=number(single[1]);u=single[2].toUpperCase()}
 if(u==='PC')u='PCS';
 return{count,size,unit:u};
}
function practicalRate(card){
 const qty=number(card.querySelector('[data-k="qty"]')?.value);
 const rate=number(card.querySelector('[data-k="rate"]')?.value);
 const unit=card.querySelector('[data-k="unit"]')?.value||'PCS';
 const pack=parsePack(card.querySelector('[data-k="pack_format"]')?.value,unit);
 const subtotal=qty*rate;
 let practicalQty=qty*pack.count*pack.size;
 let practicalUnit=pack.unit;
 if(pack.unit==='G'){practicalQty/=1000;practicalUnit='KG'}
 else if(pack.unit==='ML'){practicalQty/=1000;practicalUnit='L'}
 else if(pack.unit==='KG'){practicalUnit='KG'}
 else if(pack.unit==='L'){practicalUnit='L'}
 else if(pack.unit==='PCS'){practicalUnit='PCS'}
 if(!(practicalQty>0))return{value:0,unit:practicalUnit};
 return{value:subtotal/practicalQty,unit:practicalUnit};
}
function format(value){
 const digits=value>0&&value<0.01?4:value<1?3:2;
 return `MVR ${value.toLocaleString('en-US',{minimumFractionDigits:digits,maximumFractionDigits:digits})}`;
}
function update(card){
 const output=card.querySelector('[data-out="rate"]');
 if(!output)return;
 const result=practicalRate(card);
 output.textContent=`${format(result.value)} / ${result.unit}`;
}
function updateAll(root=document){root.querySelectorAll?.('.bill-item-card').forEach(update)}
document.addEventListener('input',event=>{const card=event.target.closest?.('.bill-item-card');if(card)requestAnimationFrame(()=>update(card))},true);
document.addEventListener('change',event=>{const card=event.target.closest?.('.bill-item-card');if(card)requestAnimationFrame(()=>update(card))},true);
new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes)if(node.nodeType===1){if(node.matches?.('.bill-item-card'))update(node);updateAll(node)}}).observe(document.documentElement,{childList:true,subtree:true});
updateAll();
window.__WS_BASE_RATE_DISPLAY__={version:43,parsePack,practicalRate};
})();