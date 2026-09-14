// Decorative instruments use the original UI's orbit, scale, and glass vocabulary.
// Each is aria-hidden: the adjacent real headings and links carry the content.
export function instrument(kind) {
  const ticks=Array.from({length:40},(_,i)=>`<path d="M${20+i*7} ${i%5?94:87}v${i%5?7:14}"/>`).join('');
  const paths={
    archive:`<path class="instrument-rail" pathLength="1" d="M20 24h90l34 32h154M20 70h280"/><g class="instrument-ticks">${ticks}</g><circle class="instrument-traveler" r="4" cx="144" cy="56"/><path class="instrument-cross" d="M293 15v14m-7-7h14"/>`,
    category:`<g class="instrument-sheets">${[0,1,2].map(i=>`<g style="--layer:${i}"><path d="M${70+i*38} 15l67 13v65l-67-13Z"/><path d="M${80+i*38} 30l46 9m-46 10l46 9m-46 10l30 6"/></g>`).join('')}</g><path class="instrument-rail" pathLength="1" d="M20 107h280"/>`,
    tag:`<g class="instrument-orbits"><ellipse cx="160" cy="58" rx="92" ry="31"/><ellipse cx="160" cy="58" rx="92" ry="31" transform="rotate(45 160 58)"/><ellipse cx="160" cy="58" rx="92" ry="31" transform="rotate(-45 160 58)"/></g><circle class="instrument-core" cx="160" cy="58" r="5"/><circle class="instrument-traveler" cx="252" cy="58" r="4"/><path d="M22 52v12m-6-6h12M292 52v12m-6-6h12"/>`,
  };
  return `<div class="page-instrument instrument-${kind}" aria-hidden="true"><svg viewBox="0 0 320 120" fill="none">${paths[kind]}</svg><div><span>${kind==='archive'?'CHRONOLOGY':kind==='category'?'COLLECTIONS':'CONNECTIONS'}</span><span>SH / INDEX</span></div></div>`;
}
export function profileFrame(){return `<div class="profile-frame" aria-hidden="true"><i></i><i></i><i></i><i></i><span class="profile-scan"></span><svg viewBox="0 0 300 300"><circle cx="150" cy="150" r="137"/><circle cx="150" cy="150" r="148" stroke-dasharray="1 12"/><path d="M150 2v14M150 284v14M2 150h14M284 150h14"/></svg></div>`;}
