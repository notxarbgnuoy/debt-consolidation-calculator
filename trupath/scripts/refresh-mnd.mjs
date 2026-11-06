import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {parseMnd,MND_SOURCE} from '../server/mnd.js';
const html=process.argv[2]?await readFile(process.argv[2],'utf8'):await (async()=>{const r=await fetch(MND_SOURCE,{signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error(`MND HTTP ${r.status}`);return r.text();})();
const data=parseMnd(html);await mkdir('public/data',{recursive:true});await writeFile('public/data/mnd.json',JSON.stringify(data,null,2)+'\n');console.log(`MND 30-year ${data.rates.fixed30.rate}%, dated ${data.rates.fixed30.observationDate}`);
