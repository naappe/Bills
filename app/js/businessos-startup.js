(()=>{
  const ws=document.getElementById('workspace');
  if(!ws)return;

  ws.innerHTML=`<section class="bos-loading" id="bosStartup" role="status" aria-live="polite">
    <strong>Loading BusinessOS</strong><br>
    <span>Preparing dashboard, purchasing, inventory and supplier data…</span>
  </section>`;

  const started=Date.now();
  const timer=setInterval(()=>{
    const box=document.getElementById('bosStartup');
    if(!box){clearInterval(timer);return;}
    const elapsed=Math.round((Date.now()-started)/1000);
    if(elapsed>=8){
      box.innerHTML=`<strong>BusinessOS is still loading</strong><br><span>Large purchasing history is being retrieved. Please keep this tab open.</span>`;
    }
  },1000);

  window.addEventListener('pageshow',()=>{
    const box=document.getElementById('bosStartup');
    if(box)box.setAttribute('data-ready','waiting');
  });
})();
