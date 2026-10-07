/* Stable browser entry point. Loads account persistence before the learner runtime. */
(function(){
'use strict';
const VERSION='1.0.9';
const config=document.createElement('script');
config.src='./supabase-config.js?v='+VERSION;
config.async=false;
config.onload=loadAuth;
config.onerror=loadAuth;
document.head.appendChild(config);
function loadAuth(){
  const auth=document.createElement('script');
  auth.src='./app/supabase-auth.js?v='+VERSION;
  auth.async=false;
  auth.onload=()=>Promise.resolve(window.NETPSY_AUTH?.ready).then(loadRuntime,loadRuntime);
  auth.onerror=loadRuntime;
  document.head.appendChild(auth);
}
function loadRuntime(){
  const runtime=document.createElement('script');
  runtime.src='./app/runtime.js?v='+VERSION;
  runtime.async=false;
  runtime.onerror=()=>console.error('NET Psychology learner runtime could not be loaded.');
  document.head.appendChild(runtime);
}
})();