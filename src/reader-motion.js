// Start the archive reveal on a visible, painted page rather than on module load.
export function openReader(layout) {
  const preference=matchMedia('(prefers-reduced-motion: reduce)');
  if(preference.matches||location.hash||performance.getEntriesByType('navigation')[0]?.type==='back_forward')return;
  let cancelled=false;
  const cleanup=new AbortController();
  const finish=()=>{
    cancelled=true;
    layout.classList.remove('reader-opening','reader-preparing');
    cleanup.abort();
  };
  window.addEventListener('pagehide',finish,{signal:cleanup.signal});
  window.addEventListener('hashchange',finish,{signal:cleanup.signal});
  preference.addEventListener('change',finish,{signal:cleanup.signal});

  async function reveal() {
    // Fonts can otherwise stay invisible until after a short animation has ended.
    await document.fonts.ready;
    if(cancelled)return;
    if(document.hidden)await new Promise(resolve=>{
      const visible=()=>{if(!document.hidden){document.removeEventListener('visibilitychange',visible);resolve();}};
      document.addEventListener('visibilitychange',visible);
      cleanup.signal.addEventListener('abort',()=>{document.removeEventListener('visibilitychange',visible);resolve();},{once:true});
    });
    if(cancelled)return;
    layout.classList.add('reader-opening','reader-preparing');
    await new Promise(requestAnimationFrame);
    // Some browsers expose the inbound transition only as pseudo-element animations.
    const transition=document.activeViewTransition;
    const snapshots=document.getAnimations().filter(a=>a.animationName==='page-in'||a.animationName==='page-out');
    await Promise.allSettled([transition?.finished,...snapshots.map(a=>a.finished)]);
    await new Promise(requestAnimationFrame);
    if(cancelled)return;
    layout.classList.remove('reader-preparing');
    const animations=layout.getAnimations({subtree:true}).filter(a=>a.animationName?.startsWith('reader-'));
    // Completion follows the actual animation clock, including pauses/background tabs.
    await Promise.allSettled(animations.map(a=>a.finished));
    finish();
  }
  reveal().catch(finish);
}
