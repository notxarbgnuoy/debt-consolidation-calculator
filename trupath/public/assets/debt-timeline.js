const currency=(n,exact=false)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:exact?2:0,maximumFractionDigits:exact?2:0}).format(n);
const colors={current:'#6e7787',refi:'#b88632',heloc:'#6431f6'};
const time=month=>month===0?'Today':month<12?`Month ${month}`:`${Math.floor(month/12)} yr${month%12?` ${month%12} mo`:''}`;
export function balanceScale(values){
 const finite=values.filter(Number.isFinite),low=Math.max(0,Math.min(...finite,Infinity)),high=Math.max(0,...finite);
 if(!finite.length||high===0)return {min:0,max:1000,step:250};
 const span=Math.max(high-low,high*.05,1),raw=span/5,power=10**Math.floor(Math.log10(raw)),unit=raw/power;
 const step=([1,2,2.5,5,10].find(n=>n>=unit)||10)*power;
 const min=Math.max(0,Math.floor((low-span*.1)/step)*step),max=Math.ceil((high+span*.05)/step)*step;
 return {min,max:Math.max(max,min+step),step};
}
export function timelineSnapshot(scenario,view,month){
 const projection=scenario[view],point=projection?.points[month];
 if(!point||point.month!==month)return null;
 return {balance:point.balance,interest:point.interest,cash:point.cash+(scenario.cashUpfront||0),minimum:month===0?(scenario.payment??projection.points[1]?.requiredPayment??null):point.requiredPayment};
}
const axisLabel=n=>n>=1e6?'$'+Number((n/1e6).toFixed(1))+'m':n>=1000?'$'+Number((n/1000).toFixed(1))+'k':currency(n);
export function installDebtTimeline(panel){
 const $=selector=>panel.querySelector(selector),chart=$('#chart');let latest,frame=0,width=-1,selectedMonth=null,pinned=false,dismiss=()=>{};
 const render=(comparison,view,options)=>{latest={comparison,view,options};draw();};
 const observer=typeof ResizeObserver==='function'?new ResizeObserver(entries=>{const next=entries[0].contentRect.width;if(next!==width){width=next;if(latest&&!frame)frame=requestAnimationFrame(()=>{frame=0;draw();});}}):null;
 observer?.observe(chart);
 document.addEventListener('pointerdown',event=>{if(!panel.contains(event.target))dismiss();});
 document.addEventListener('click',event=>{if(!panel.contains(event.target))dismiss();});
 document.addEventListener('keydown',event=>{if(event.key==='Escape')dismiss();});
 panel.addEventListener('pointerleave',()=>{if(!pinned)dismiss();});
 function draw(){
  const {comparison:c,view,options:{years,extra,totalBudget,paymentMode,metric='balance',visibleIds=['current','refi','heloc']}}=latest,horizon=years*12;
  const custom=view==='custom',total=custom&&paymentMode==='total',included=id=>visibleIds.includes(id);
  $('#strategy-note').textContent=total?`${currency(totalBudget)}/mo for every scenario, including escrow and mortgage insurance. Required payments are covered first; the remainder and freed payments go to the highest-rate remaining debt.`:custom?`Each scenario pays its minimums plus ${currency(extra)}/mo extra. This does not include payment savings versus Current, so total contributions differ. Extra goes to the highest-rate remaining debt; freed minimum payments are not rolled forward.`:view==='budget'?`Selected scenarios keep up to ${currency(c.budget||0)}/mo including housing costs; extra and freed payments go to the highest-rate remaining debt.`:'Required payments, including HELOC principal repayment after its draw period. Freed payments are not redirected.';
  $('#chart-selection-note').hidden=visibleIds.length===3;
  $('#chart-selection-note').textContent='Only selected scenarios are displayed. Use “Show scenarios” above to include more options.';
  for(const [i,s] of c.scenarios.entries())panel.querySelectorAll('.tp-legend>span')[i]?.classList.toggle('tp-timeline-excluded',!included(s.id));
  const gaps=c.scenarios.filter(s=>included(s.id)&&s[view]?.fundingGap?.length).map(s=>{const gap=s[view].fundingGap[0];return `${s.name}: budget is short ${currency(gap.amount)}/mo starting in month ${gap.month}.`;});
  $('#chart-budget-warning').hidden=!gaps.length;$('#chart-budget-warning').textContent=gaps.join(' ');
  const metricKey=metric==='interest'?'interest':'balance',axisName=metricKey==='interest'?'Interest paid':'Total debt';
  const usable=c.scenarios.filter(s=>included(s.id)&&!s.error&&s[view]),scale=balanceScale(usable.flatMap(s=>s[view].points.filter(p=>p.month<=horizon).map(p=>p[metricKey])));
  const w=Math.max(240,Math.round(chart.clientWidth||600)),h=250,left=55,right=w-14,top=16,bottom=210,x=month=>left+(right-left)*month/horizon,y=value=>bottom-(value-scale.min)/(scale.max-scale.min)*(bottom-top);
  let svg=`<svg viewBox="0 0 ${w} ${h}" role="group" aria-label="${axisName} over ${years} years"><title>${axisName} over ${years} years</title><desc>Hover or tap to update the comparison table for a selected month. The vertical axis starts at ${currency(scale.min)}.</desc>`;
  for(let value=scale.min;value<=scale.max+scale.step*.001;value+=scale.step)svg+=`<line x1="${left}" x2="${right}" y1="${y(value)}" y2="${y(value)}" stroke="#e6e9ef" stroke-dasharray="3 4"/><text x="0" y="${y(value)+4}">${axisLabel(value)}</text>`;
  for(let j=0;j<=4;j++)svg+=`<text x="${x(horizon*j/4)}" y="237" text-anchor="middle">${j===0?'Today':Number((years*j/4).toFixed(2))+' yr'}</text>`;
  for(const s of usable){const points=s[view].points.filter(p=>p.month<=horizon);svg+=`<polyline data-line="${s.id}" points="${points.map(p=>`${x(p.month)},${y(p[metricKey])}`).join(' ')}" fill="none" stroke="${colors[s.id]}" stroke-width="2.5" stroke-linejoin="round"/>`;}
  svg+=`<g data-chart-cursor hidden><line data-cursor-line y1="${top}" y2="${bottom}" stroke="#9ca3af" stroke-dasharray="4 3"/>${usable.map(s=>`<circle data-marker="${s.id}" r="4" fill="${colors[s.id]}" stroke="white" stroke-width="1.5"/>`).join('')}</g><rect data-chart-hit x="${left}" y="${top}" width="${right-left}" height="${bottom-top}" fill="transparent" tabindex="0" role="slider" aria-label="Inspect month on debt chart" aria-valuemin="0" aria-valuemax="${horizon}" aria-valuenow="${horizon}" aria-valuetext="${time(horizon)}"/></svg>`;
  chart.innerHTML=`<div class="tp-chart-readout"><strong>${axisName}</strong><span data-selected-time>${time(horizon)}</span><button type="button" data-chart-reset hidden>Reset</button></div>`+svg;
  let selected=-1;const svgEl=chart.querySelector('svg'),hit=chart.querySelector('[data-chart-hit]'),reset=chart.querySelector('[data-chart-reset]');
  const basis=total?currency(totalBudget)+'/mo total budget':custom?'minimums + '+currency(extra)+'/mo extra':view==='budget'?'current budget · highest-rate-first':'required payments';
  function renderTable(month,inspecting){
   const snapshots=c.scenarios.map(s=>included(s.id)?timelineSnapshot(s,view,month):null);
   $('#horizon-stats').innerHTML=`<table class="tp-horizon-table"><caption>${inspecting?time(month):years+'-year comparison'} · ${basis}</caption><thead><tr><th scope="col">Measure</th>${c.scenarios.map(s=>`<th scope="col" class="${included(s.id)?'':'tp-timeline-excluded'}">${s.name}</th>`).join('')}</tr></thead><tbody>${[['Balance left','balance'],['Interest paid','interest'],['Cash paid','cash'],['Min. household /mo','minimum']].map(([label,key])=>`<tr><th scope="row" ${key==='minimum'?'title="Required household payment during the selected month before extra principal"':''}>${label}</th>${c.scenarios.map((s,i)=>`<td class="${included(s.id)?'':'tp-timeline-excluded'}">${!included(s.id)?'—':snapshots[i]&&Number.isFinite(snapshots[i][key])?currency(snapshots[i][key],true):'Unavailable'}</td>`).join('')}</tr>`).join('')}</tbody></table><p class="tp-micro">Cash paid includes loan payments, escrow and other housing costs, PMI/MIP, and cash contributed at closing. These expenses are separate from loan interest. Financed fees are in the balance, not added again as cash upfront.</p>`;
  }
  dismiss=()=>{selectedMonth=null;selected=-1;pinned=false;chart.querySelector('[data-chart-cursor]').setAttribute('hidden','');reset.hidden=true;chart.querySelector('[data-selected-time]').textContent=time(horizon);hit.setAttribute('aria-valuenow',horizon);hit.setAttribute('aria-valuetext',time(horizon));renderTable(horizon,false);};
  function inspect(month){
   month=Math.max(0,Math.min(horizon,month));if(month===selected)return;selected=month;selectedMonth=month;
   hit.setAttribute('aria-valuenow',month);hit.setAttribute('aria-valuetext',time(month));
   chart.querySelector('[data-selected-time]').textContent=time(month);reset.hidden=false;
   chart.querySelector('[data-chart-cursor]').removeAttribute('hidden');
   const line=chart.querySelector('[data-cursor-line]');line.setAttribute('x1',x(month));line.setAttribute('x2',x(month));
   for(const s of usable){const marker=chart.querySelector(`[data-marker="${s.id}"]`),point=timelineSnapshot(s,view,month);marker.style.display=point?'':'none';if(point){marker.setAttribute('cx',x(month));marker.setAttribute('cy',y(point[metricKey]));}}
   renderTable(month,true);
  }
  const fromPointer=event=>{const bounds=svgEl.getBoundingClientRect();inspect(Math.round(((event.clientX-bounds.left)*w/bounds.width-left)/(right-left)*horizon));};
  svgEl.onpointermove=event=>{if(event.pointerType!=='touch'&&!pinned)fromPointer(event);};
  svgEl.onpointerdown=event=>{pinned=true;fromPointer(event);};svgEl.onclick=event=>{pinned=true;fromPointer(event);};
  hit.onkeydown=event=>{const changes={ArrowRight:1,ArrowLeft:-1,ArrowUp:12,ArrowDown:-12};if(event.key in changes){event.preventDefault();pinned=true;inspect((selected<0?horizon:selected)+changes[event.key]);}else if(event.key==='Home'||event.key==='End'){event.preventDefault();pinned=true;inspect(event.key==='Home'?0:horizon);}};
  reset.onclick=dismiss;renderTable(horizon,false);
  if(selectedMonth!==null)inspect(Math.min(selectedMonth,horizon));
 }
 return render;
}
