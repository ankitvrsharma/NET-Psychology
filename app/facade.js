/* Application facade: loads runtime dependencies in a deterministic order, then starts the learner app. */
(function(){
'use strict';
const VERSION='20261005-runtime-modules-v1';
const files=[
  './app/content-audit.js?v='+VERSION,
  './app/data-loader.js?v='+VERSION,
  './app/runtime.js?v='+VERSION
];
let index=0;
function loadNext(){
  if(index>=files.length) return;
  const script=document.createElement('script');
  script.src=files[index++];
  script.async=false;
  script.onload=loadNext;
  script.onerror=()=>console.error('NET Psychology application module could not be loaded:',script.src);
  document.head.appendChild(script);
}
window.NETPsychologyApp={start:loadNext};
loadNext();
})();