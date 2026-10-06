/* Stable browser entry point. The learner application loads the runtime directly. */
(function(){
  'use strict';
  const VERSION='1.0.4';
  const script=document.createElement('script');
  script.src='./app/runtime.js?v='+VERSION;
  script.async=false;
  script.onerror=()=>console.error('NET Psychology learner runtime could not be loaded.');
  document.head.appendChild(script);
})();
