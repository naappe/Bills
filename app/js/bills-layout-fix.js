const STYLE_ID='billsAddActionLayoutFix';

function installStyle(){
  if(document.getElementById(STYLE_ID))return;
  const style=document.createElement('style');
  style.id=STYLE_ID;
  style.textContent=`
#content[data-current-route="bills"] .bills-export-actions{
  display:flex;
  align-items:center;
  justify-content:flex-end;
  gap:9px;
  margin:0 0 12px;
}
#content[data-current-route="bills"] .bills-export-actions .btn{min-width:132px}
@media(max-width:600px){
  #content[data-current-route="bills"] .bills-export-actions{
    display:grid;
    grid-template-columns:1fr 1fr;
  }
  #content[data-current-route="bills"] .bills-export-actions [data-route="new"]{
    grid-column:1/-1;
  }
  #content[data-current-route="bills"] .bills-export-actions .btn{
    width:100%;
    min-width:0;
  }
}`;
  document.head.appendChild(style);
}

function normalizeBillsActions(root=document){
  const content=root.querySelector?.('#content')||document.querySelector('#content');
  if(!content||content.dataset.currentRoute!=='bills')return;
  const header=content.querySelector('.bills-page-head');
  const addButton=header?.querySelector('[data-route="new"]');
  const exportActions=content.querySelector('.bills-export-actions');
  if(addButton&&exportActions&&!exportActions.contains(addButton)){
    addButton.innerHTML='<i class="fa-solid fa-plus" aria-hidden="true"></i> Add bill';
    exportActions.prepend(addButton);
  }
  if(header)header.remove();
}

installStyle();
const observer=new MutationObserver(()=>normalizeBillsActions());
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',()=>{
    normalizeBillsActions();
    observer.observe(document.body,{childList:true,subtree:true});
  },{once:true});
}else{
  normalizeBillsActions();
  observer.observe(document.body,{childList:true,subtree:true});
}
