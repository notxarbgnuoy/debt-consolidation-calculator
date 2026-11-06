import {parsePrime,PRIME_SOURCE} from './prime.js';
import {parseMnd,MND_SOURCE} from './mnd.js';
export function createWorker(assets,seed,mndSeed=null){
 const states={prime:{value:seed,checked:0},mnd:{value:mndSeed,checked:0}};
 return {async fetch(request,env,ctx){
  const url=new URL(request.url);
  if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});
  if(url.pathname==='/api/prime'||url.pathname==='/api/mnd'){
   const kind=url.pathname.endsWith('/mnd')?'mnd':'prime',state=states[kind],source=kind==='mnd'?MND_SOURCE:PRIME_SOURCE,parse=kind==='mnd'?parseMnd:parsePrime;
   const observation=data=>kind==='mnd'?data?.rates.fixed30.observationDate:data?.observationDate;
   const key=new Request(url.origin+url.pathname);let cache;
   try{cache=globalThis.caches?.default;const cached=await cache?.match(key);if(cached)return cached;}catch{cache=undefined;}
   let data,fallback=false;
   try{
    if(Date.now()-state.checked<3600000)data=state.value;
    else{
     const r=await fetch(source,{signal:AbortSignal.timeout(10000),headers:{Accept:'text/html'}});
     if(!r.ok)throw Error('Rate source unavailable');
     data=parse(await r.text());
     if(state.value&&observation(data)<observation(state.value))throw Error('Observation older than saved value');
     state.value=data;state.checked=Date.now();
    }
   }catch{data=state.value;fallback=true;}
   if(!data)return Response.json({error:'Rate source unavailable'},{status:503});
   const response=Response.json({...data,fallback},{headers:{'Cache-Control':fallback?'public, max-age=60':'public, max-age=3600','X-Content-Type-Options':'nosniff'}});
   if(cache)try{await cache.put(key,response.clone());}catch{}
   return response;
  }
  const path=url.pathname==='/'?'/index.html':url.pathname,asset=assets[path];
  if(!asset)return new Response('Not found',{status:404});
  const bytes=Uint8Array.from(atob(asset.data),c=>c.charCodeAt(0));
  return new Response(request.method==='HEAD'?null:bytes,{headers:{'Content-Type':asset.type,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'}});
 }};
}
