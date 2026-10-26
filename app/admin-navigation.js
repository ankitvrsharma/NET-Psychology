/* Expose the owner workspace to signed-in admins without adding admin links for learners. */
(function(){
'use strict';
function sync(){
  const nav=document.getElementById('site-navigation');
  if(!nav)return;
  const existing=nav.querySelector('[data-admin-site-studio]');
  const auth=window.NETPSY_AUTH;
  if(auth?.isAdmin?.()){
    if(!existing){
      const link=document.createElement('a');
      link.className='nav-link';
      link.href='./site-studio.html';
      link.textContent='Site Studio';
      link.dataset.adminSiteStudio='true';
      nav.appendChild(link);
    }
  }else if(existing){existing.remove();}
}
window.addEventListener('netpsy-auth-ready',sync);
Promise.resolve(window.NETPSY_AUTH?.ready).then(sync).catch(sync);
})();
