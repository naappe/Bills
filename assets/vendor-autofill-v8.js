(()=>{
  const originalRenderNewBill=window.renderNewBill;
  if(typeof originalRenderNewBill!=='function')return;

  function latestVendorRecord(name){
    const wanted=String(name||'').trim().toLowerCase();
    if(!wanted)return null;
    return [...(window.state?.rows||[])]
      .filter(r=>String(window.vendorVal?.(r)||r.vendor||r.Vendor||'').trim().toLowerCase()===wanted)
      .sort((a,b)=>new Date(window.dateVal?.(b)||b.bill_date||0)-new Date(window.dateVal?.(a)||a.bill_date||0))[0]||null;
  }

  function pick(obj,...keys){
    for(const key of keys){
      if(obj && obj[key]!==undefined && obj[key]!==null && String(obj[key]).trim()!=='')return obj[key];
    }
    return '';
  }

  function ensureDetails(vendorLabel){
    let box=document.getElementById('vendorDetails');
    if(!box){
      box=document.createElement('div');
      box.id='vendorDetails';
      box.className='vendor-details';
      box.hidden=true;
      vendorLabel.appendChild(box);
    }
    return box;
  }

  function bindVendorAutofill(){
    const input=document.getElementById('vendorInput');
    if(!input)return;
    const form=document.getElementById('billForm');
    const vendorLabel=input.closest('label');
    const tin=form?.elements?.namedItem('tin');
    const location=form?.elements?.namedItem('location');
    const details=vendorLabel?ensureDetails(vendorLabel):null;

    const apply=()=>{
      const record=latestVendorRecord(input.value);
      if(!record){
        if(details){details.hidden=true;details.innerHTML='';}
        return;
      }
      const tinValue=pick(record,'tin','TIN','vendor_tin','Vendor TIN');
      const locationValue=pick(record,'location','Location','address','Address','vendor_address','Vendor Address');
      const phoneValue=pick(record,'phone','Phone','mobile','Mobile','contact','Contact');
      if(tin && tinValue)tin.value=tinValue;
      if(location && locationValue)location.value=locationValue;
      if(details){
        const parts=[];
        if(tinValue)parts.push(`<span><strong>TIN:</strong> ${window.esc?window.esc(tinValue):tinValue}</span>`);
        if(phoneValue)parts.push(`<span><strong>Phone:</strong> ${window.esc?window.esc(phoneValue):phoneValue}</span>`);
        if(locationValue)parts.push(`<span><strong>Location:</strong> ${window.esc?window.esc(locationValue):locationValue}</span>`);
        details.innerHTML=parts.join('');
        details.hidden=!parts.length;
      }
    };

    input.addEventListener('change',apply);
    input.addEventListener('input',()=>{
      const exact=latestVendorRecord(input.value);
      if(exact)apply();
      else if(details){details.hidden=true;details.innerHTML='';}
    });
    input.addEventListener('blur',apply);
    apply();
  }

  window.renderNewBill=function(){
    originalRenderNewBill();
    bindVendorAutofill();
  };
})();
