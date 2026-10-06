/* Stable browser entry point. Keep page HTML pointed at app.js; the facade owns runtime loading. */
(function(){
  'use strict';
  const VERSION='20261006-admin-v1';
  const script=document.createElement('script');
  script.src='./app/facade.js?v='+VERSION;
  script.async=false;
  script.onerror=()=>console.error('NET Psychology application facade could not be loaded.');
  document.head.appendChild(script);
})();
