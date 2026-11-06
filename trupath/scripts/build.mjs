import {readFile,writeFile,readdir,mkdir,rm} from 'node:fs/promises';
import path from 'node:path';
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.woff2':'font/woff2','.svg':'image/svg+xml','.png':'image/png'};
const assets={};
async function walk(dir){for(const e of await readdir(dir,{withFileTypes:true})){const file=path.join(dir,e.name);if(e.isDirectory())await walk(file);else{const key='/'+path.relative('public',file).split(path.sep).join('/');assets[key]={type:types[path.extname(file)]||'application/octet-stream',data:(await readFile(file)).toString('base64')};}}}
await walk('public');
const parser=(await readFile('server/prime.js','utf8'))+'\n'+(await readFile('server/mnd.js','utf8')),worker=(await readFile('server/worker.js','utf8')).replace(/^import .*;\n/gm,'');
const seed=JSON.parse(await readFile('public/data/prime.json','utf8'));
const source=parser+'\n'+worker+'\nexport default createWorker('+JSON.stringify(assets)+','+JSON.stringify(seed)+','+(await readFile('public/data/mnd.json','utf8'))+');\n';
await rm('dist',{recursive:true,force:true});await mkdir('dist/server',{recursive:true});await mkdir('dist/.openai',{recursive:true});await writeFile('dist/server/index.js',source);await writeFile('dist/.openai/hosting.json',await readFile('.openai/hosting.json'));
const mod=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));if(typeof mod.default?.fetch!=='function')throw Error('Invalid Worker');
console.log('Built dependency-free calculator and Prime reader');
