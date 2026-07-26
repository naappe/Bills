// Global bill-search behavior: searching must cover every loaded bill, not only the active date period.
const bindGlobalBillSearch=()=>{
  const search=document.querySelector('#billSearch');
  const period=document.querySelector('#billPeriod');
  if(!search||!period||search.dataset.globalSearchBound==='true')return;
  search.dataset.globalSearchBound='true';
  search.addEventListener('input',()=>{
    if(search.value.trim()&&period.value!=='all'){
      period.value='all';
      period.dispatchEvent(new Event('change',{bubbles:true}));
    }
  });
};

const observer=new MutationObserver(bindGlobalBillSearch);
observer.observe(document.documentElement,{childList:true,subtree:true});
bindGlobalBillSearch();
