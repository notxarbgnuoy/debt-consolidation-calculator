// Loaded only on pages rendering the calculator shortcode. Never reads calculator inputs.
(()=>{const frames=[...document.querySelectorAll('iframe[data-trupath-calculator]')];
 window.addEventListener('message',event=>{for(const frame of frames){if(event.source!==frame.contentWindow||event.origin!==new URL(frame.src,location.href).origin||event.data?.type!=='trupath:height')continue;const height=event.data.height;if(Number.isInteger(height)&&height>=400&&height<=50000)frame.style.height=height+'px';}});
 for(const frame of frames){const resize=()=>frame.contentWindow.postMessage({type:'trupath:resize-request'},new URL(frame.src,location.href).origin);frame.addEventListener('load',resize);resize();}
})();
