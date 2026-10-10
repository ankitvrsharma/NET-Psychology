/* Stable browser entry point. Loads account persistence before the learner runtime. */
(function(){
'use strict';
// GitHub Pages is served over HTTPS. Redirect an accidentally opened HTTP copy before app/auth requests run.
if(location.protocol==='http:'&&!['localhost','127.0.0.1'].includes(location.hostname)){location.replace('https://'+location.host+location.pathname+location.search+location.hash);return;}
const VERSION='1.2.3';
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
  auth.onload=()=>{loadRuntime();Promise.resolve(window.NETPSY_AUTH?.ready).catch(()=>{});};
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