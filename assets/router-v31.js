(()=>{
'use strict';
const VERSION=57;
const VALID=new Set(['dashboard','bills','new','products','vendors','prices','reports','settings']);
const route=()=>{const view=location.hash.slice(1).trim();return VALID.has(view)?view:'dashboard'};
const updateCurrentRoute=()=>{const current=route();document.querySelectorAll('.nav [data-view]').forEach(link=>{const active=link.dataset.view===current;link.classList.toggle('active',active);if(active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current')})};
const installShell=()=>{const content=document.querySelector('#content');if(content){content.setAttribute('tabindex','-1');content.style.minWidth='0';content.style.maxWidth='100%'}const main=document.querySelector('.main');if(main)main.style.minWidth='0';updateCurrentRoute()};
// Navigation and bill-entry calculations are owned by app-controller and
// pack-unit-pricing. No hashchange, click, input, change, load, or mutation
// observers are registered here.
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installShell,{once:true});else installShell();
window.__WS_ROUTER__={version:VERSION,route,updateCurrentRoute};
})();
