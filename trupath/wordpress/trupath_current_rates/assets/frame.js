// The only message sent to WordPress is document height, never financial information.
(()=>{let pending=false,last=0;const send=()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;const height=Math.max(400,Math.ceil(document.querySelector('.tp-main').getBoundingClientRect().height));if(height!==last){last=height;parent.postMessage({type:'trupath:height',height},location.origin);}});};
 new ResizeObserver(send).observe(document.querySelector('.tp-main'));window.addEventListener('load',send);window.addEventListener('message',event=>{if(event.source===parent&&event.origin===location.origin&&event.data?.type==='trupath:resize-request'){last=0;send();}});send();
})();
