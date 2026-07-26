import {store} from './store.js';
import {generateProductImage} from './product-image-generator.js?v=4.9.41';

const META_KEY='bills.productMetadata.v3';
const readMeta=()=>{try{return JSON.parse(localStorage.getItem(META_KEY)||'{}')}catch{return{}}};
const writeMeta=value=>localStorage.setItem(META_KEY,JSON.stringify(value));
const text=value=>String(value||'').trim();

function productFromCard(card){
  return{
    key:card.dataset.productCard,
    name:text(card.querySelector('.product-heading h3')?.textContent),
    description:text(card.querySelector('.product-heading h3')?.textContent),
    pack:text(card.querySelector('.product-meta-line span')?.textContent),
    unit:''
  };
}
function saveImage(product){
  const meta=readMeta(),current=meta[product.key]||{};
  meta[product.key]={...current,photo:generateProductImage(product),imageFit:'contain',imageSource:'generated'};
  writeMeta(meta);
}
function refresh(){window.router?.renderRoute?.()}

function enhanceProducts(){
  if(store.route!=='products')return;
  const cards=[...document.querySelectorAll('[data-product-card]')];
  if(!cards.length)return;
  cards.forEach(card=>{
    if(card.querySelector('[data-auto-image]'))return;
    const product=productFromCard(card),visual=card.querySelector('.product-visual');
    if(!visual)return;
    const button=document.createElement('button');
    button.type='button';button.className='product-generate-button';button.dataset.autoImage=product.key;
    button.innerHTML='<i class="fa-solid fa-wand-magic-sparkles"></i><span>Generate</span>';
    button.title=`Generate image for ${product.name}`;
    button.onclick=()=>{saveImage(product);refresh()};
    visual.appendChild(button);
  });
  if(store.role==='admin'&&!document.querySelector('#generateMissingProductImages')){
    const actions=document.querySelector('.page-head .actions')||document.querySelector('.page-head');
    const button=document.createElement('button');button.id='generateMissingProductImages';button.type='button';button.className='btn secondary';
    button.innerHTML='<i class="fa-solid fa-wand-magic-sparkles"></i> Generate missing images';
    button.onclick=()=>{cards.filter(card=>!card.querySelector('.product-photo img')).forEach(card=>saveImage(productFromCard(card)));refresh()};
    actions.appendChild(button);
  }
}

const style=document.createElement('style');
style.textContent='.product-generate-button{position:absolute;left:22px;bottom:12px;display:inline-flex;align-items:center;gap:6px;min-height:32px;padding:6px 10px;border:1px solid var(--border);border-radius:999px;background:rgba(255,255,255,.94);color:var(--brand-navy);font-size:10px;font-weight:800;box-shadow:0 6px 18px rgba(13,35,62,.12);cursor:pointer}.product-generate-button:hover{transform:translateY(-1px)}@media(max-width:680px){.product-generate-button span{display:none}.product-generate-button{width:32px;justify-content:center;padding:0}}';
document.head.appendChild(style);
new MutationObserver(enhanceProducts).observe(document.documentElement,{childList:true,subtree:true});
enhanceProducts();