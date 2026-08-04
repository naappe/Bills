(()=>{
  'use strict';
  const nativeAdd=window.addEventListener.bind(window);
  const nativeRemove=window.removeEventListener.bind(window);
  let blockedHashHandler=null;

  window.addEventListener=function(type,listener,options){
    if(type==='hashchange'&&!blockedHashHandler){
      blockedHashHandler=listener;
      return;
    }
    return nativeAdd(type,listener,options);
  };

  window.removeEventListener=function(type,listener,options){
    if(type==='hashchange'&&listener===blockedHashHandler){
      blockedHashHandler=null;
      return;
    }
    return nativeRemove(type,listener,options);
  };

  if('scrollRestoration' in history)history.scrollRestoration='manual';

  window.addEventListener('load',()=>{
    window.addEventListener=nativeAdd;
    window.removeEventListener=nativeRemove;
  },{once:true});
})();
