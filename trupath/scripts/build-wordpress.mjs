import {cp,readFile,writeFile,rm,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const dir='wordpress/trupath_current_rates';
await rm(dir+'/public',{recursive:true,force:true});
await cp('public',dir+'/public',{recursive:true});
const app=dir+'/public/assets/app.js';let js=await readFile(app,'utf8');
let replacements=0;
js=js.replace(/\['api\/(prime|mnd)(?:\?[^']*)?','(data\/[^']+)'\]/g,(_,kind,fallback)=>{replacements++;return `[document.querySelector('meta[name="trupath-${kind}-endpoint"]')?.content || 'api/${kind}','${fallback}']`;});
if(replacements!==2)throw Error('Expected both benchmark reader URL lists; update the WordPress packager.');
await writeFile(app,js);await mkdir('releases',{recursive:true});await rm('releases/trupath_current_rates.zip',{force:true});
// zip is only a packaging tool; the installed plugin has no Node/build dependencies.
execFileSync('/usr/bin/zip',['-qr','../releases/trupath_current_rates.zip','trupath_current_rates'],{cwd:'wordpress'});
console.log('Built releases/trupath_current_rates.zip');
