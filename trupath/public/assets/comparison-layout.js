const IDS=['current','refi','heloc'];
export function visibleScenarioIds(hidden=[]){const visible=IDS.filter(id=>!hidden.includes(id));return visible.length?visible:IDS;}
export function setScenarioVisibility(hidden,id,show){
 if(!IDS.includes(id))return hidden;
 const visible=visibleScenarioIds(hidden),next=show?[...new Set([...visible,id])]:visible.filter(x=>x!==id);
 return next.length?IDS.filter(x=>!next.includes(x)):hidden;
}
// Expand matching rows to the largest natural height; never shrink or truncate content.
export function installComparisonLayout(root){
 let frame=0,lastWidth=-1;
 const schedule=()=>{if(!frame)frame=requestAnimationFrame(sync);};
 function sync(){
  frame=0;
  root.querySelectorAll('[data-sync-height]').forEach(el=>{el.style.minHeight='';});
  const cards=[...root.querySelectorAll(':scope > article:not([hidden])')];
  root.classList.remove('tp-blended-stacked');
  if(cards.some(card=>{const label=card.querySelector('.tp-blended-summary > span:first-child'),value=card.querySelector('.tp-blended-values');return label&&value&&value.getBoundingClientRect().top>label.getBoundingClientRect().top+8;}))root.classList.add('tp-blended-stacked');
  function equal(elements){
   const els=elements.filter(Boolean);if(els.length<2)return;
   const height=Math.ceil(Math.max(...els.map(el=>el.getBoundingClientRect().height)));
   for(const el of els){el.dataset.syncHeight='';el.style.minHeight=height+'px';}
  }
  const rows=selector=>equal(cards.map(card=>card.querySelector(selector)));
  for(const selector of [':scope > h3','.tp-card-sub','.tp-card-amount','.tp-card-label','.tp-difference','.tp-blended-summary > span:first-child','.tp-blended-values','.tp-blended-summary','.tp-breakdown-title'])rows(selector);
  for(let i=0;i<3;i++){
   const groups=cards.map(card=>card.querySelectorAll('.tp-loan-group')[i]).filter(Boolean);
   equal(groups.map(group=>group.querySelector('.tp-group-title')));
   equal(groups.flatMap(group=>[...group.querySelectorAll('.tp-loan-metrics > div > span')]));
   equal(groups.flatMap(group=>[...group.querySelectorAll('.tp-loan-metrics > div > strong')]));
   equal(groups.map(group=>group.querySelector('.tp-mortgage-parts')));
   equal(groups.map(group=>group.querySelector('.tp-phase-slot')));
   equal(groups);
  }
  for(let i=0;i<3;i++){const items=cards.map(card=>card.querySelectorAll('.tp-financing-summary > div')[i]).filter(Boolean);equal(items.map(el=>el.querySelector('dt')));equal(items.map(el=>el.querySelector('dd')));equal(items);}
  rows('.tp-financing-summary');
  for(let i=0;i<6;i++)equal(cards.map(card=>card.querySelectorAll('.tp-interest-detail dl > div')[i]).filter(el=>el?.closest('details')?.open));
  rows('.tp-interest-detail > .tp-micro');rows('.tp-payoff-scope');
  rows('.tp-interest-detail');rows('.tp-card-detail:not(.tp-interest-detail)');
 }
 const observer=typeof ResizeObserver==='function'?new ResizeObserver(entries=>{const width=entries[0].contentRect.width;if(width!==lastWidth){lastWidth=width;schedule();}}):null;
 observer?.observe(root);
 window.addEventListener('resize',schedule);
 root.addEventListener('toggle',schedule,true);
 document.fonts?.ready.then(schedule);
 return schedule;
}
