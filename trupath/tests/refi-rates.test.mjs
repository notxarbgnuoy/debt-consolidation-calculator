import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseMnd} from '../server/mnd.js';
import {createWorker} from '../server/worker.js';
import {refiRateEstimate,validMnd,roundUpEighth} from '../public/assets/refi-rates.js';
import {defaults,restore} from '../public/assets/state.js';
import {equityEstimate} from '../public/assets/equity.js';
const html=await readFile(new URL('./fixtures/mnd.html',import.meta.url),'utf8');
const data=parseMnd(html,new Date('2026-11-04T00:00:00Z'));
test('MND reader selects dated MND rows, excluding Freddie and MBA',()=>{assert.ok(validMnd(data));assert.equal(data.rates.fixed30.rate,7.3);assert.equal(data.rates.fixed15.rate,6.91);assert.equal(data.rates.fixed30.observationDate,'2026-11-03');assert.throws(()=>parseMnd(html.replaceAll('/mortgage-rates/mnd','/mortgage-rates/other')));assert.throws(()=>parseMnd(html,new Date('2020-01-01')));});
test('calibrated cash-out examples reconcile to borrower quotes before later quote confirmation',()=>{const a=refiRateEstimate(data,'780plus',.6,30),b=refiRateEstimate(data,'740-759',.8,30);assert.equal(a.margin,0);assert.equal(a.rate,7.375);assert.equal(b.margin,.5);assert.equal(b.rate,7.875);assert.equal(roundUpEighth(7.375),7.375);assert.equal(roundUpEighth(7.376),7.5);});
test('LTV bands, term benchmarks and unsupported scenarios remain distinct',()=>{assert.equal(refiRateEstimate(data,'780plus',.60001,30).margin,.0625);assert.equal(refiRateEstimate(data,'780plus',.6,15).rate,7);assert.equal(refiRateEstimate(data,'780plus',.6,20).rate,7.375);assert.equal(refiRateEstimate(data,'740-759',.80001,30).rate,7.875);assert.ok(refiRateEstimate(data,'619below',.6,30).error);assert.ok(refiRateEstimate(data,'780plus',.6,40).error);assert.ok(refiRateEstimate(data,'780plus',.6,30,1000).error);});
test('cash contributions lower each financed loan independently, with stable gross accessible equity',()=>{const s=defaults(),base=equityEstimate(s.fields,s.debts);const r=equityEstimate({...s.fields,helocCashIn:1000,cashIn:2000},s.debts);assert.equal(r.options.heloc.loanAmount,base.options.heloc.loanAmount-1000);assert.equal(r.options.refi.loanAmount,base.options.refi.loanAmount-2000);assert.equal(r.options.heloc.accessible,base.options.heloc.accessible);assert.equal(r.options.heloc.used,base.options.heloc.used-1000);const p=equityEstimate({...s.fields,helocCostPercent:2,helocCashIn:1000},s.debts);assert.ok(Math.abs(p.options.heloc.loanAmount-55000/.98)<1e-7);});
test('cash to close defaults to zero and explicit refinance rate overrides restore',()=>{const s=defaults();assert.equal(s.fields.helocCashIn,0);assert.equal(s.fields.cashIn,0);s.fields.helocCashIn=1000;s.fields.refiRateMode='manual';s.fields.refiRate=8;const r=restore({getItem:()=>JSON.stringify(s)});assert.equal(r.fields.helocCashIn,1000);assert.equal(r.fields.refiRateMode,'manual');assert.equal(r.fields.refiRate,8);delete s.fields.refiRateMode;assert.equal(restore({getItem:()=>JSON.stringify(s)}).fields.refiRateMode,'manual');});
test('hosted MND reader returns live values and falls back safely on outage',async()=>{const original=globalThis.fetch;try{globalThis.fetch=async()=>new Response(html);const live=await (await createWorker({},null,data).fetch(new Request('https://example.com/api/mnd'))).json();assert.equal(live.fallback,false);assert.equal(live.rates.fixed30.rate,7.3);globalThis.fetch=async()=>{throw Error('Offline');};const fallback=await (await createWorker({},null,data).fetch(new Request('https://example.com/api/mnd'))).json();assert.equal(fallback.fallback,true);assert.equal(fallback.rates.fixed30.rate,7.3);}finally{globalThis.fetch=original;}});

test('FHA and VA use their own benchmarks and the requested nearest-eighth/FICO order',()=>{
 assert.equal(data.rates.fha30.rate,6.95);assert.equal(data.rates.va30.rate,6.97);
 const expectations=[['780plus',0],['760-779',0],['740-759',0],['720-739',0],['700-719',.125],['680-699',.125],['660-679',.125],['640-659',.25],['620-639',.375],['619below',1]];
 for(const program of ['fha','va'])for(const [band,adjustment] of expectations){
  const low=refiRateEstimate(data,band,.4,30,0,program),high=refiRateEstimate(data,band,1.1,30,0,program);
  const base=program==='fha'?6.75:6.75;
  assert.equal(low.rate,base+adjustment);assert.equal(high.rate,low.rate);assert.equal(low.adjustment,adjustment);
 }
 const distinct={...data,rates:{...data.rates,va30:{rate:6.6,observationDate:'2026-11-03'}}};
 assert.equal(refiRateEstimate(distinct,'740-759',.8,30,0,'va').rate,6.375);
 assert.equal(refiRateEstimate(distinct,'740-759',.8,30,0,'fha').rate,6.75);
});
test('pricing ceiling preserves actual LTV while excess cash requests and warnings stay intact',()=>{
 const s=defaults(),f={...s.fields,additionalCashEnabled:true,cashOut:300000};
 const e=equityEstimate(f,s.debts),r=refiRateEstimate(data,'740-759',e.options.refi.ltv,30);
 assert.ok(e.options.refi.ltv>1);assert.ok(e.options.refi.shortfall>0);assert.equal(f.cashOut,300000);
 assert.equal(r.pricingLtv,.8);assert.equal(r.ltv,e.options.refi.ltv);assert.equal(r.cappedPricing,true);assert.equal(r.rate,7.875);
});
test('program selection saves and restores without replacing manual rates',()=>{
 const s=defaults();assert.equal(s.fields.refiProgram,'conventional');s.fields.refiProgram='va';s.fields.refiRateMode='manual';s.fields.refiRate=7.125;
 const r=restore({getItem:()=>JSON.stringify(s)});assert.equal(r.fields.refiProgram,'va');assert.equal(r.fields.refiRateMode,'manual');assert.equal(r.fields.refiRate,7.125);
 s.fields.refiProgram='unsupported';assert.equal(restore({getItem:()=>JSON.stringify(s)}).fields.refiProgram,'conventional');
});
