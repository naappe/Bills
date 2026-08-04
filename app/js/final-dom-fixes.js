const content=document.querySelector('#content');
if(content){
  const normalize=()=>{const tbody=content.querySelector('tbody');if(tbody)tbody.id='dataRows';};
  new MutationObserver(normalize).observe(content,{childList:true,subtree:true});
  normalize();
}
