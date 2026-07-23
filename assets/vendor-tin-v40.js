(()=>{
'use strict';
let queued=false;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

async function readVendor(id){
  if(!id||typeof db==='undefined')return null;
  const {data,error}=await db.from('vendors').select('id,name,tin').eq('id',id).maybeSingle();
  if(error){console.warn('Could not load vendor TIN.',error.message);return null}
  return data||null;
}

function ensureStyles(){
  if(document.getElementById('vendorTinStyles'))return;
  const style=document.createElement('style');
  style.id='vendorTinStyles';
  style.textContent=`
    #phaseBillForm .vendor-tin-field{position:relative}
    #phaseBillForm .vendor-tin-field small{font-weight:500;color:var(--muted);line-height:1.35}
    #phaseBillForm .vendor-tin-status{display:inline-flex;align-items:center;gap:6px;margin-top:1px;font-size:11px;font-weight:700}
    #phaseBillForm .vendor-tin-status.saved{color:var(--brand-2)}
    #phaseBillForm .vendor-tin-status.missing{color:var(--muted)}
  `;
  document.head.appendChild(style);
}

async function enhance(){
  const form=document.getElementById('phaseBillForm');
  if(!form||form.dataset.vendorTinReady==='1')return;
  const vendorSelect=form.querySelector('select[name="vendor_id"]');
  const grid=form.querySelector('.entry-grid');
  if(!vendorSelect||!grid)return;
  ensureStyles();

  const label=document.createElement('label');
  label.className='vendor-tin-field';
  label.innerHTML=`Vendor TIN <input class="field" name="vendor_tin" inputmode="numeric" autocomplete="off" placeholder="Optional TIN number"><span class="vendor-tin-status missing">Select a vendor to check TIN</span><small>TIN is optional. Existing vendor TIN fills automatically; a new TIN is saved to the vendor record.</small>`;
  const category=grid.querySelector('select[name="category"]')?.closest('label');
  if(category)category.insertAdjacentElement('afterend',label);else grid.appendChild(label);

  const input=label.querySelector('input');
  const status=label.querySelector('.vendor-tin-status');
  let loadedVendor=null;

  async function syncVendor(){
    input.value='';loadedVendor=null;
    const id=vendorSelect.value;
    if(!id){input.disabled=true;status.className='vendor-tin-status missing';status.textContent='Select a vendor to check TIN';return}
    input.disabled=true;status.className='vendor-tin-status missing';status.textContent='Checking vendor TIN…';
    loadedVendor=await readVendor(id);
    input.disabled=false;
    const tin=String(loadedVendor?.tin||'').trim();
    input.value=tin;
    if(tin){status.className='vendor-tin-status saved';status.textContent='TIN loaded from vendor';}
    else{status.className='vendor-tin-status missing';status.textContent='No TIN saved — add one if available';}
  }

  vendorSelect.addEventListener('change',syncVendor);
  await syncVendor();

  const original=form.onsubmit;
  if(typeof original==='function'){
    form.onsubmit=async function(event){
      const vendorId=vendorSelect.value;
      const tin=String(input.value||'').trim();
      if(vendorId&&tin&&tin!==String(loadedVendor?.tin||'').trim()){
        const {error}=await db.from('vendors').update({tin}).eq('id',vendorId);
        if(error){
          event.preventDefault();
          alert(`TIN could not be saved: ${error.message}`);
          return;
        }
        loadedVendor={...(loadedVendor||{}),id:vendorId,tin};
        status.className='vendor-tin-status saved';status.textContent='TIN saved to vendor';
      }
      const result=await original.call(this,event);
      if(vendorId&&tin){
        try{
          const {data}=await db.from('bills').select('id,tin').eq('vendor_id',vendorId).order('id',{ascending:false}).limit(1).maybeSingle();
          if(data?.id&&String(data.tin||'').trim()!==tin)await db.from('bills').update({tin}).eq('id',data.id);
        }catch(error){console.warn('Bill TIN sync skipped.',error?.message||error)}
      }
      return result;
    };
  }
  form.dataset.vendorTinReady='1';
}

function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;enhance()})}
const observer=new MutationObserver(queue);
observer.observe(document.documentElement,{subtree:true,childList:true});
window.addEventListener('hashchange',queue);
queue();
})();
