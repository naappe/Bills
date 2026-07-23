/* White Saffron Procurement - input focus fix v6 */
(function(){
  function bindStableItemInputs(){
    const body=document.querySelector('#itemRows');
    if(!body || body.dataset.stableBound==='1') return;
    body.dataset.stableBound='1';

    body.addEventListener('input',function(e){
      const el=e.target.closest('[data-i][data-k]');
      if(!el) return;
      const i=Number(el.dataset.i);
      const k=el.dataset.k;
      if(!window.state || !state.items || !state.items[i]) return;
      state.items[i][k]=['qty','rate','gst'].includes(k)?num(el.value):el.value;
      const row=el.closest('tr');
      const totalCell=row?.querySelector('[data-line-total]');
      if(totalCell) totalCell.textContent=money(itemTotal(state.items[i]));
      updateSummary();
    });

    body.addEventListener('change',function(e){
      const el=e.target.closest('select[data-i][data-k]');
      if(!el) return;
      const i=Number(el.dataset.i);
      const k=el.dataset.k;
      if(state?.items?.[i]) state.items[i][k]=el.value;
      updateSummary();
    });
  }

  const originalRenderItemRows=window.renderItemRows;
  if(typeof originalRenderItemRows==='function'){
    window.renderItemRows=function(){
      const body=document.querySelector('#itemRows');
      if(!body) return;
      body.innerHTML=state.items.map((it,i)=>`<tr>
        <td><input class="field product" data-i="${i}" data-k="description" value="${esc(it.description)}" placeholder="Product name"></td>
        <td><input class="field" data-i="${i}" data-k="qty" type="number" min="0" step="any" value="${num(it.qty)}"></td>
        <td><select class="field" data-i="${i}" data-k="unit">${['PCS','KG','G','L','ML','PKT','BOX','CTN','DOZ','BAG','BOTTLE','CAN','TIN','ROLL','SET','PAIR'].map(x=>`<option ${it.unit===x?'selected':''}>${x}</option>`).join('')}</select></td>
        <td><input class="field" data-i="${i}" data-k="rate" type="number" min="0" step="any" value="${num(it.rate)}"></td>
        <td><input class="field" data-i="${i}" data-k="gst" type="number" min="0" step="any" value="${num(it.gst)}"></td>
        <td><strong data-line-total>${money(itemTotal(it))}</strong></td>
        <td><button class="btn danger small" type="button" data-remove="${i}">×</button></td>
      </tr>`).join('');
      body.dataset.stableBound='0';
      bindStableItemInputs();
      document.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{
        state.items.splice(Number(b.dataset.remove),1);
        if(!state.items.length) state.items=[freshItem()];
        window.renderItemRows();
      });
      updateSummary();
    };
  }

  const observer=new MutationObserver(bindStableItemInputs);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  bindStableItemInputs();
})();