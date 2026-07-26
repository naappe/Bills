function cleanBillEntryHeader(){
  if(location.hash!=='#new')return;
  const content=document.querySelector('#content');
  const header=content?.querySelector(':scope > .page-head');
  if(header)header.remove();
}

window.addEventListener('hashchange',()=>queueMicrotask(cleanBillEntryHeader));
new MutationObserver(cleanBillEntryHeader).observe(document.documentElement,{childList:true,subtree:true});
cleanBillEntryHeader();
