const STYLE_ID='billsAddActionLayoutFix';

function installStyle(){
  if(document.getElementById(STYLE_ID))return;
  const style=document.createElement('style');
  style.id=STYLE_ID;
  style.textContent=`
#content[data-current-route="bills"] .bills-page-head{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:16px;
  width:100%;
  min-width:0;
}
#content[data-current-route="bills"] .bills-page-head>div:first-child{min-width:0}
#content[data-current-route="bills"] .bills-page-head .actions{
  flex:0 0 auto;
  margin-left:auto;
}
#content[data-current-route="bills"] .bills-export-actions{
  display:flex;
  align-items:center;
  justify-content:flex-end;
  gap:9px;
  margin:0 0 12px;
}
#content[data-current-route="bills"] .bills-export-actions .btn{min-width:132px}
@media(max-width:600px){
  #content[data-current-route="bills"] .bills-page-head{
    flex-direction:column;
    align-items:stretch;
  }
  #content[data-current-route="bills"] .bills-page-head .actions{
    width:100%;
    margin-left:0;
  }
  #content[data-current-route="bills"] .bills-page-head .actions .btn{
    width:100%;
  }
  #content[data-current-route="bills"] .bills-export-actions{
    display:grid;
    grid-template-columns:1fr 1fr;
  }
  #content[data-current-route="bills"] .bills-export-actions .btn{
    width:100%;
    min-width:0;
  }
}`;
  document.head.appendChild(style);
}

export function normalizeBillsLayout(content=document.querySelector('#content')){
  installStyle();
  if(!content||content.dataset.currentRoute!=='bills')return;
  const header=content.querySelector('.bills-page-head');
  const addButton=header?.querySelector('[data-route="new"]');
  if(addButton){
    addButton.innerHTML='<i class="fa-solid fa-plus" aria-hidden="true"></i> Add bill';
  }
}
