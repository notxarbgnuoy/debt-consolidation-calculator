import {createServer} from 'node:http';
import worker from '../dist/server/index.js';
createServer(async(req,res)=>{try{const response=await worker.fetch(new Request('http://localhost:8084'+req.url,{method:req.method}),{},{});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}catch{res.writeHead(500);res.end('Preview error');}}).listen(8084,'127.0.0.1',()=>console.log('http://localhost:8084'));
