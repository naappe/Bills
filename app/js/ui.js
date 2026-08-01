import {escapeHtml} from './store.js';

let observer=null;

function installStyles(){
  if(document.querySelector('#sharedUiStyles'))return;
  const style=document.createElement('style');
  style.id='sharedUiStyles';
  style.textContent=`
    .searchable-list-wrap{position:relative;display:block}
    .searchable-list-menu{position:absolute;left:0;right:0;top:calc(100% + 6px);z-index:1200;display:none;max-height:280px;overflow:auto;padding:6px;border:1px solid #d7e0e8;border-radius:12px;background:#fff;box-shadow:0 14px 36px rgba(15,35,61,.18)}
    .searchable-list-menu.open{display:block}
    .searchable-list-option{display:block;width:100%;padding:10px 12px;border:0;border-radius:8px;background:transparent;color:#162f52;text-align:left;font:600 13px/1.35 Inter,system-ui,sans-serif;cursor:pointer}
    .searchable-list-option:hover,.searchable-list-option.active{background:#eef4fb;color:#102b4e}
    .searchable-list-empty{padding:12px;color:#6f7f94;font-size:12px;text-align:center}
  `;
  document.head.appendChild(style);
}

function enhanceInput(input){
  if(input.dataset.searchableList)return;
  const list=document.getElementById(input.getAttribute('list'));
  if(!list)return;
  const values=[...list.querySelectorAll('option')]
    .map(option=>(option.value||option.textContent||'').trim())
    .filter(Boolean);
  if(!values.length)return;

  input.dataset.searchableList=list.id;
  input.removeAttribute('list');
  input.setAttribute('autocomplete','off');
  input.setAttribute('aria-autocomplete','list');
  input.setAttribute('aria-expanded','false');

  const wrap=document.createElement('span');
  wrap.className='searchable-list-wrap';
  input.parentNode.insertBefore(wrap,input);
  wrap.appendChild(input);

  const menu=document.createElement('div');
  menu.className='searchable-list-menu';
  menu.setAttribute('role','listbox');
  wrap.appendChild(menu);

  let active=-1;
  const close=()=>{
    menu.classList.remove('open');
    input.setAttribute('aria-expanded','false');
    active=-1;
  };
  const choose=value=>{
    input.value=value;
    close();
    input.dispatchEvent(new Event('input',{bubbles:true}));
    input.dispatchEvent(new Event('change',{bubbles:true}));
    input.focus();
  };
  const draw=(showAll=false)=>{
    const query=showAll?'':input.value.trim().toLowerCase();
    const matches=values.filter(value=>!query||value.toLowerCase().includes(query));
    active=-1;
    menu.innerHTML=matches.length
      ?matches.map(value=>`<button class="searchable-list-option" type="button" role="option" data-value="${escapeHtml(value)}">${escapeHtml(value)}</button>`).join('')
      :'<div class="searchable-list-empty">No matching options</div>';
    menu.classList.add('open');
    input.setAttribute('aria-expanded','true');
    menu.querySelectorAll('.searchable-list-option').forEach(option=>{
      option.addEventListener('mousedown',event=>{
        event.preventDefault();
        choose(option.dataset.value);
      });
    });
  };
  const setActive=index=>{
    const options=[...menu.querySelectorAll('.searchable-list-option')];
    if(!options.length)return;
    active=(index+options.length)%options.length;
    options.forEach((option,i)=>{
      option.classList.toggle('active',i===active);
      option.setAttribute('aria-selected',String(i===active));
    });
    options[active].scrollIntoView({block:'nearest'});
  };

  input.addEventListener('focus',()=>draw(true));
  input.addEventListener('click',()=>draw(true));
  input.addEventListener('input',()=>draw(false));
  input.addEventListener('keydown',event=>{
    if(event.key==='ArrowDown'){
      event.preventDefault();
      if(!menu.classList.contains('open'))draw(true);
      setActive(active+1);
    }else if(event.key==='ArrowUp'){
      event.preventDefault();
      if(!menu.classList.contains('open'))draw(true);
      setActive(active-1);
    }else if(event.key==='Enter'&&active>=0){
      event.preventDefault();
      menu.querySelectorAll('.searchable-list-option')[active]?.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));
    }else if(event.key==='Escape')close();
  });
  document.addEventListener('mousedown',event=>{
    if(!wrap.contains(event.target))close();
  });
}

export function enhanceSearchableLists(root=document){
  installStyles();
  root.querySelectorAll('input[list]:not([data-searchable-list])').forEach(enhanceInput);
}

export function watchSharedUI(root=document.querySelector('#content')){
  document.querySelector('#globalPageHelper')?.remove();
  document.querySelectorAll('[id^="blueprint"],.page-helper').forEach(element=>element.remove());
  enhanceSearchableLists(document);
  if(!root||observer)return;
  observer=new MutationObserver(()=>enhanceSearchableLists(root));
  observer.observe(root,{childList:true,subtree:true});
}
