/* Application facade: keeps the page contract stable while hiding runtime loading details. */
(function(){
  'use strict';
  const VERSION='20261005-facade-v1';
  let started=false;

  function start(){
    if(started) return;
    started=true;
    const script=document.createElement('script');
    script.src='./app/runtime.js?v='+VERSION;
    script.async=false;
    script.onerror=()=>console.error('NET Psychology runtime could not be loaded.');
    document.head.appendChild(script);
  }

  window.NETPsychologyApp={start};
  start();
})();
