// Bounded independent reference audit. Does not modify the calculator engine.
import assert from 'node:assert/strict';
import {defaults} from '../public/assets/state.js';
import {compareScenarios} from '../public/assets/comparison.js';
import {originalLoanEstimate,firstPaymentFromClosing} from '../public/assets/mortgage.js';
import {chartComparison} from '../public/assets/chart-projections.js';
let largestDollarDifference=0;
const close=(a,b,label,tol=.02)=>{largestDollarDifference=Math.max(largestDollarDifference,Math.abs(a-b));assert.ok(Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=tol,`${label}: actual ${a}; expected ${b}`);};
const pmt=(b,rate,n)=>rate===0?b/n:b*(rate/1200)/(1-(1+rate/1200)**(-n));
const round=x=>Math.round((x+Number.EPSILON)*100)/100;
function annualMip(initial,rate,term,upfront){
 const pi=round(pmt(initial,rate,term*12));let balance=initial;const years=[];
 for(let y=0;y<11;y++){let total=0;for(let m=0;m<12;m++){total+=balance;balance=Math.max(0,round(balance+round(round(balance*rate)/1200)-pi));}years.push(round(round(round(total/12*.005)/(1+upfront/100))/12));}return years;
}
function references(s){const f=s.fields,escrow=f.total-f.pi-(f.pmiEnabled?f.mi:0),second=f.secondEnabled?f.secondBalance:0;
 const original={id:'first',balance:f.balance,rate:f.rate,due:f.pi},secondLoan={id:'second',balance:second,rate:f.secondRate,due:f.secondPayment};
 const consumers=s.debts.map((d,i)=>({id:'debt-'+i,balance:d.balance,rate:d.rate,due:d.payment}));
 const out=[{id:'current',loans:[original,secondLoan,...consumers].filter(l=>l.balance>0),housing:escrow,mi:f.pmiEnabled?f.mi:0,miId:'first',cash:0}];
 for(const id of ['refi','heloc']){const selected=s.debts.reduce((v,d)=>v+(d[id]?d.balance:0),0),replace=f[id==='refi'?'secondRefi':'secondHeloc'],base=(id==='refi'?f.balance:0)+(replace?second:0)+selected+(f.additionalCashEnabled?f.cashOut:0)-(id==='refi'?f.cashIn:f.helocCashIn),fee=f[id+'Cost'],pct=id==='refi'?(f.refiProgram==='fha'?f.fhaFeePercent:f.refiProgram==='va'?f.vaFeePercent:f.refiCostPercent):f.helocCostPercent;
 const govt=id==='refi'&&f.refiProgram!=='conventional',amount=govt?(base+fee)*(1+pct/100):(base+fee)/(1-pct/100),rate=f[id+'Rate'];
 const loan={id,balance:amount,rate,due:pmt(amount,rate,(id==='refi'?f.refiTerm:f.helocRepay)*12),draw:id==='heloc'&&f.helocType==='io'?f.helocDraw*12:0,repay:f.helocRepay*12};
 out.push({id,loans:[...(id==='heloc'?[original]:[]),loan,...(!replace?[secondLoan]:[]),...consumers.filter((l,i)=>!s.debts[i][id])].filter(l=>l.balance>0),housing:escrow,mi:id==='heloc'&&f.pmiEnabled?f.mi:0,miId:id==='heloc'?'first':'refi',mip:id==='refi'&&f.refiProgram==='fha'?annualMip(amount,rate,f.refiTerm,pct):null,cash:id==='refi'?f.cashIn:f.helocCashIn});}
 return out;
}
function simulate(s,mode,budget,extra=0){const loans=structuredClone(s.loans);let interest=0,cash=0,payoff=null;const points=[];
 for(let month=1;month<=1200;month++){
  const insured=loans.some(l=>l.id===s.miId&&l.balance>1e-7),mi=insured?(s.mip?.[Math.floor((month-1)/12)]??(s.mip?0:s.mi)):0;
  const dues=loans.map(l=>{if(l.balance<1e-7)return 0;if(l.draw&&month<=l.draw)return l.balance*l.rate/1200;if(l.draw&&l.amort===undefined)l.amort=pmt(l.balance,l.rate,l.repay);const owed=l.balance*(1+l.rate/1200),due=Math.min(owed,l.amort??l.due);return owed-due<.005?owed:due;});
  const minimum=dues.reduce((a,b)=>a+b,0)+s.housing+mi;
  if(mode==='budget'&&minimum>budget+.01&&payoff===null)return {points,gap:month,payoff:null,total:null};
  let paid=dues.reduce((a,b)=>a+b,0);loans.forEach((l,i)=>{const charge=l.balance*l.rate/1200;interest+=charge;l.balance=Math.max(0,l.balance+charge-dues[i]);});
  let available=mode==='budget'?Math.max(0,budget-s.housing-mi-paid):extra;
  const priority=loans.slice().sort((a,b)=>b.rate-a.rate||a.id.localeCompare(b.id));for(const l of priority){const v=Math.min(available,l.balance);l.balance-=v;available-=v;paid+=v;}
  cash+=paid+s.housing+mi;const balance=loans.reduce((v,l)=>v+l.balance,0);points.push({month,balance,interest,cash,minimum});if(payoff===null&&balance<1e-7)payoff=month;if(payoff!==null&&month>=60)break;
 }return {points,gap:null,payoff,total:payoff===null?null:interest};
}
function base(){const s=defaults();s.horizon=5;Object.assign(s.fields,{home:600000,mortgageSource:'statement',statementPiKnown:true,escrowMode:'pi',balance:250000,rate:3,total:1500,pi:1100,refiRateMode:'manual',refiRate:6,refiTerm:30,refiCost:2000,refiCostPercent:0,helocRateMode:'manual',helocRate:8,helocCost:1000,helocCostPercent:0});s.debts=[{name:'Card',balance:10000,rate:18,payment:300,heloc:true,refi:true},{name:'Auto',balance:12000,rate:6,payment:350,heloc:false,refi:true}];return s;}
const cases=[
 ['Mixed debts',()=>{}],
 ['Second mortgage / different selections',s=>Object.assign(s.fields,{secondEnabled:true,secondBalance:30000,secondRate:7,secondPayment:350,secondRefi:false,secondHeloc:true})],
 ['Zero-interest loans',s=>{Object.assign(s.fields,{rate:0,pi:1000,total:1400,helocRate:0,refiRate:0});s.debts.forEach(d=>d.rate=0);}],
 ['Extra cash + financed percentage costs + cash contribution',s=>Object.assign(s.fields,{additionalCashEnabled:true,cashOut:25000,cashIn:3000,helocCashIn:2000,refiCostPercent:1,helocCostPercent:.5})],
 ['Existing PMI; conventional removes it',s=>Object.assign(s.fields,{pmiEnabled:true,mi:75})],
 ['FHA financed UFMIP and annual MIP',s=>Object.assign(s.fields,{refiProgram:'fha',fhaFeePercent:1.75,refiRate:5.5})],
 ['VA financed funding fee',s=>Object.assign(s.fields,{refiProgram:'va',vaFeePercent:3.3,refiRate:5.5})],
 ['Fully amortizing HELOC',s=>Object.assign(s.fields,{helocType:'amortizing',helocRepay:15})],
 ['Below-interest consumer payment',s=>{s.debts[0].rate=24;s.debts[0].payment=50;}],
 ['HELOC transition + future budget shortfall',s=>{Object.assign(s.fields,{balance:0,pi:0,total:400,helocRepay:1,helocDraw:1});s.debts=[{name:'Card',balance:12000,rate:12,payment:125,heloc:true,refi:true}];}]
];
let checks=0;const failures=[];
for(const [name,change] of cases){try{const state=base();change(state);const actual=compareScenarios(state),refs=references(state);assert.ok(!actual.error);const budget=refs[0].loans.reduce((n,l)=>n+Math.min(l.balance*(1+l.rate/1200),l.due),0)+refs[0].housing+refs[0].mi;
 for(let i=0;i<3;i++){const a=actual.scenarios[i],r=refs[i];assert.ok(!a.error,`${name} ${a.id} error`);const balance=r.loans.reduce((n,l)=>n+l.balance,0),interest=r.loans.reduce((n,l)=>n+l.balance*l.rate/1200,0);close(a.balance,balance,'starting balance');close(a.interest,interest,'first interest');close(a.blended,balance?interest*1200/balance:0,'blended rate');
  const customTotal=chartComparison(actual,'custom',0,{mode:'total',totalBudget:4500}).scenarios[i].custom,customExtra=chartComparison(actual,'custom',250,{mode:'extra'}).scenarios[i].custom;
  for(const [mode,projection,refMode,amount,extra] of [['required',a.required,'required',null,0],['budget',a.budget,'budget',budget,0],['total budget',customTotal,'budget',4500,0],['extra',customExtra,'required',null,250]]){const expected=simulate(r,refMode,amount,extra);if(mode==='required')close(a.payment,expected.points[0].minimum,'initial household payment');assert.equal(projection.payoff,expected.payoff,`${name} ${a.id} ${mode} payoff`);assert.equal(projection.fundingGap[0]?.month??null,expected.gap,`${name} ${a.id} ${mode} gap`);if(expected.total!==null)close(projection.totalInterest,expected.total,`${name} ${a.id} ${mode} lifetime interest`,.03);for(const n of [1,12,60,120,121,360]){const e=expected.points[n-1],p=projection.points[n];if(!e)continue;for(const k of ['balance','interest','cash'])close(p[k],e[k],`${name} ${a.id} ${mode} month ${n} ${k}`, .03);close(p.requiredPayment,e.minimum,'minimum household');}checks++;}
 }console.log('PASS '+name);
 }catch(error){failures.push({scenario:name,message:error.message});console.log('REVIEW '+name+': '+error.message);}}
const original=originalLoanEstimate({original:300000,originalRate:6,originalTerm:30,closingDate:'2016-09-15',balanceDate:'2026-10-01'});
close(original.pi,1798.65157545827,'closed-form original loan payment');
close(original.balance,300000*1.005**120-1798.65157545827*(1.005**120-1)/.005,'closed-form original balance');
assert.equal(original.elapsed,120);assert.equal(firstPaymentFromClosing('2026-01-31'),'2026-03-01');assert.equal(firstPaymentFromClosing('2026-12-31'),'2027-02-01');
const fresh=defaults();assert.equal(fresh.strategy,'budget');assert.equal(fresh.horizon,5);assert.equal(fresh.fields.chartMetric,'interest');
console.log('PASS original-loan closed form, date boundaries, and chart defaults');
console.log(JSON.stringify({cases:cases.length,portfolioViews:checks,largestDifference:largestDollarDifference,failures},null,2));
if(failures.length)process.exitCode=1;
