(()=>{
'use strict';
const originalNewBill=window.renderNewBill;
window.renderNewBill=async()=>{
  const editing=state.editing||null;
  await originalNewBill?.();
  if(!editing&&Array.isArray(state.items)&&state.items.length>1){
    const removeButtons=[...document.querySelectorAll('#itemRows [data-remove]')];
    for(let index=removeButtons.length-1;index>0;index--){
      removeButtons[index]?.click();
    }
  }
};
if(window.__WS_RENDERERS__)window.__WS_RENDERERS__.new=window.renderNewBill;
window.__WS_VISUAL__={version:1};
})();
