// Single-page navigation without document reload, duplicate rendering, or hash scrolling.
const ROUTES=new Set(['inventory','vendors','stock','bills','prices']);

function switchRoute(route){
  const normalized=String(route||'').trim().toLowerCase();
  if(!ROUTES.has(normalized))return;

  const oldURL=location.href;
  const nextURL=`${location.pathname}${location.search}#${normalized}`;

  // Update the address bar without native anchor scrolling or a browser reload.
  history.pushState({route:normalized},'',nextURL);

  // final-app.js owns rendering through its hashchange listener.
  // Dispatch exactly one synthetic event after the URL has been updated.
  window.dispatchEvent(new HashChangeEvent('hashchange',{
    oldURL,
    newURL:location.href
  }));
}

document.addEventListener('click',event=>{
  const button=event.target.closest('button[data-route]');
  if(!button)return;

  event.preventDefault();
  event.stopImmediatePropagation();

  const route=String(button.dataset.route||'').trim().toLowerCase();
  if(location.hash===`#${route}`)return;
  switchRoute(route);
},true);

// Keep browser Back and Forward navigation inside the same mounted application.
window.addEventListener('popstate',()=>{
  const route=(location.hash||'#inventory').slice(1).toLowerCase();
  if(!ROUTES.has(route))return;
  window.dispatchEvent(new HashChangeEvent('hashchange'));
});
