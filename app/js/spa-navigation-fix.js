// Prevent duplicate renders when switching sections in the unified ERP.
// final-app.js already reacts to hashchange, so navigation clicks should only
// update the hash and let that single handler render the requested view.
document.addEventListener('click',event=>{
  const button=event.target.closest('button[data-route]');
  if(!button)return;

  const route=String(button.dataset.route||'').trim().toLowerCase();
  if(!route)return;

  event.preventDefault();
  event.stopImmediatePropagation();

  const nextHash=`#${route}`;
  if(location.hash===nextHash)return;
  location.hash=nextHash;
},true);
