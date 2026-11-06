import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {parsePrime,PRIME_SOURCE} from '../server/prime.js';
const html=process.argv[2]?await readFile(process.argv[2],'utf8'):await (async()=>{const r=await fetch(PRIME_SOURCE,{signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error(`Fed HTTP ${r.status}`);return r.text();})();
const value=parsePrime(html);await mkdir('public/data',{recursive:true});await writeFile('public/data/prime.json',JSON.stringify(value,null,2)+'\n');console.log(`Prime ${value.rate}% as of ${value.observationDate}`);
