import {payment,originalLoanEstimate,originalPaymentEstimate} from './mortgage.js?v=43';
import {housingAmounts,inferEscrow,estimatePaymentBreakdown} from './housing.js';
import {equityEstimate} from './equity.js?v=43';
import {helocRateEstimate} from './rates.js?v=43';
import {refiRateEstimate} from './refi-rates.js?v=43';
import {estimateFhaMip,firstYearMonthlyMip} from './program-fees.js?v=43';
import {scheduledDue,insuranceDue,projectScenario} from './projections.js?v=43';
const validRate=r=>Number.isFinite(r)&&r>=0&&r<=100;
export function currentMortgage(f){
 let balance=f.balance,rate=f.mortgageSource==='original'?f.originalRate:f.rate;
 if(f.mortgageSource==='original'&&f.estimateBalance){const e=originalLoanEstimate(f);if(e.error)return e;balance=e.balance;}
 if(!Number.isFinite(balance)||balance<0||!validRate(rate)||rate>40)return {error:'Check the current mortgage balance and rate.'};
 const mi=f.pmiEnabled?f.mi:0,a=housingAmounts(f);
 if(balance===0&&f.total===0)return {balance,rate,pi:0,housing:(a.tax+a.insurance)/12+(f.hoa||0)+(f.other||0),escrow:0,mi:0};
 const inferred=f.mortgageSource==='original'||f.mortgageSource!=='estimate'&&f.escrowMode==='pi';
 let pi;
 if(inferred){const e=inferEscrow(f);if(e.error)return e;pi=e.pi;}
 else{const e=estimatePaymentBreakdown(f);if(!e.consistent)return {error:'Escrow and PMI exceed the total mortgage payment.'};pi=e.principalAndInterest;}
 if(!(pi>=0)||!Number.isFinite(pi))return {error:'Enter a valid principal and interest payment.'};
 let housing=f.total-pi-mi+(f.hoa||0)+(f.other||0);
 if(!inferred&&(f.mortgageSource==='estimate'||f.escrowMode==='itemized'))housing+=(!f.taxEscrowed?a.tax/12:0)+(!f.insuranceEscrowed?a.insurance/12:0);
 if(housing<-.01)return {error:'The mortgage payment, P&I and PMI do not reconcile.'};
 return {balance,rate,pi,housing:Math.max(0,housing),escrow:Math.max(0,f.total-pi-mi),mi};
}
export function loanGroups(loans){
 const groups={first:{balance:0,payment:0,weighted:0,count:0},second:{balance:0,payment:0,weighted:0,count:0},consumer:{balance:0,payment:0,weighted:0,count:0}};
 for(const loan of loans){const key=loan.kind==='mortgage'?'first':loan.kind==='consumer'?'consumer':'second',g=groups[key];g.balance+=loan.balance;g.payment+=scheduledDue({...loan},1);g.weighted+=loan.balance*loan.rate;g.count++;}
 for(const g of Object.values(groups))g.rate=g.balance?g.weighted/g.balance:0;
 return groups;
}
function initialMetrics(s){
 const copies=s.loans.map(l=>({...l}));s.groups=loanGroups(copies);
 s.balance=copies.reduce((sum,l)=>sum+l.balance,0);
 s.interest=copies.reduce((sum,l)=>sum+l.balance*l.rate/1200,0);
 s.blended=s.balance?s.interest*1200/s.balance:0;
 s.breakdown={mortgage:0,second:0,heloc:0,consumer:0};for(const l of copies)s.breakdown[l.kind==='mortgage'?'mortgage':l.kind]+=scheduledDue(l,1);
 s.debtService=copies.reduce((sum,l)=>sum+scheduledDue(l,1),0);
 s.mi=insuranceDue(s,copies,1);s.payment=s.debtService+s.mi+s.housing;
 for(const l of copies)if(l.balance>0&&scheduledDue(l,1)<=l.balance*l.rate/1200+1e-7&&l.structure!=='io')s.warnings.push(`${l.name}: payment does not reduce principal.`);
 return s;
}
function fhaInsurance(f,o,rate){
 const first=estimateFhaMip(o,f.home,f.refiTerm,rate,f.fhaFeePercent);if(first.error)return first;
 const years=[],monthlyPI=Math.round(payment(o.loanAmount,rate,f.refiTerm*12)*100)/100;
 let balance=o.loanAmount;
 const cents=n=>Math.round((n+Number.EPSILON)*100)/100;
 for(let year=0;year<Math.ceil(first.durationYears);year++){
  const p=firstYearMonthlyMip({loanAmount:balance,interestRate:rate,term:f.refiTerm,annualRate:first.annualRate,upfrontPercent:f.fhaFeePercent,monthlyPI});
  if(p.error)return p;years.push(p.monthly);
  for(let month=0;month<12;month++)balance=Math.max(0,cents(balance+cents(cents(balance*rate)/1200)-monthlyPI));
 }
 return {loanId:'refi',years,annualRate:first.annualRate,durationYears:first.durationYears};
}
export function compareScenarios(state,benchmarks={}){
 const f=state.fields,debts=state.debts,mortgage=currentMortgage(f),equity=equityEstimate(f,debts),horizon=Number(state.horizon)*12;
 const definitions=[{id:'current',name:'Current',sub:'Keep existing loans and debts'},{id:'refi',name:'Cash-Out',sub:`${({conventional:'Conventional',fha:'FHA',va:'VA'})[f.refiProgram]||'Conventional'} refinance`},{id:'heloc',name:'HELOC',sub:'Keep the first mortgage'}];
 if(mortgage.error)return {scenarios:definitions.map(s=>({...s,error:mortgage.error})),error:mortgage.error};
 if(!debts.every(d=>[d.balance,d.rate,d.payment].every(Number.isFinite)&&d.balance>=0&&validRate(d.rate)&&d.payment>=0))return {scenarios:definitions.map(s=>({...s,error:'Check debt balances, rates and payments.'})),error:'Check debt inputs.'};
 const first={id:'first',name:'First mortgage',balance:mortgage.balance,rate:mortgage.rate,payment:mortgage.pi,kind:'mortgage'};
 const second={id:'second',name:'Second mortgage',balance:f.secondEnabled?f.secondBalance:0,rate:f.secondRate,payment:f.secondPayment,kind:'second'};
 const consumer=debts.filter(d=>d.balance>0).map((d,i)=>({id:'debt-'+i,name:d.name||'Unnamed account',balance:d.balance,rate:d.rate,payment:d.payment,kind:'consumer',source:d}));
 if(second.balance>0&&(![second.balance,second.rate,second.payment].every(Number.isFinite)||!validRate(second.rate)||second.rate>40||second.payment<0))return {scenarios:definitions.map(s=>({...s,error:'Check the second mortgage.'})),error:'Check the second mortgage.'};
 const originalLoans=[first,...(second.balance>0?[second]:[]),...consumer].filter(l=>l.balance>0);
 const originalMi=mortgage.mi>0?{loanId:'first',monthly:mortgage.mi}:null;
 const current=initialMetrics({...definitions[0],loans:originalLoans,housing:mortgage.housing,escrow:mortgage.escrow,insurance:originalMi,warnings:[],cost:0,cashUpfront:0,additionalCash:0,totalConsolidated:0,consolidated:[],remaining:consumer.map(l=>l.name),included:originalLoans.map(l=>l.name),consumerDebt:consumer.reduce((sum,l)=>sum+l.balance,0),consolidatedBalance:0,unconsolidatedBalance:consumer.reduce((sum,l)=>sum+l.balance,0)});
 const scenarios=[current];
 for(const def of definitions.slice(1)){
  const key=def.id,o=equity.options?.[key];
  if(equity.error){scenarios.push({...def,error:equity.error});continue;}
  const assumed=key==='refi'?refiRateEstimate(benchmarks.mnd,f.creditScoreBand,o.ltv,f.refiTerm,o.retainedSecond,f.refiProgram):helocRateEstimate(benchmarks.prime,f.creditScoreBand,o.cltv);
  const rate=f[key==='refi'?'refiRateMode':'helocRateMode']==='manual'?f[key==='refi'?'refiRate':'helocRate']:assumed.rate;
  if(!validRate(rate)){scenarios.push({...def,error:assumed.error||'Enter a valid example rate.'});continue;}
  const remaining=consumer.filter(l=>!l.source[key]),consolidated=consumer.filter(l=>l.source[key]).map(l=>l.name),warnings=[];
  if(o.replacementPayoff>0)consolidated.unshift('Second mortgage');
  if(o.shortfall>.01)warnings.push(`Above the illustrated ${key==='refi'?'80%':'90%'} borrowing limit; confirm program availability.`);
  if(assumed.cappedPricing&&f[key==='refi'?'refiRateMode':'helocRateMode']!=='manual')warnings.push('Rate uses the 80% pricing bracket.');
  if(f.additionalCashEnabled&&f.cashOut>0)warnings.push('Includes additional cash; compare balances as well as payments.');
  let newLoan,loans,insurance;
  if(key==='refi'){
   if(!(f.refiTerm>0&&f.refiTerm<=50&&Number.isInteger(f.refiTerm*12))){scenarios.push({...def,error:'Enter a mortgage term in whole months, up to 50 years.'});continue;}
   newLoan={id:'refi',name:'New first mortgage',kind:'mortgage',balance:o.loanAmount,rate,payment:payment(o.loanAmount,rate,f.refiTerm*12)};
   loans=[newLoan,...(o.retainedSecond>0?[second]:[]),...remaining];
   if(f.refiProgram==='fha'){insurance=fhaInsurance(f,o,rate);if(insurance.error){scenarios.push({...def,error:insurance.error});continue;}}
   if(f.refiProgram==='va')warnings.push('Funding-fee exemption and program eligibility need lender confirmation.');
  }else{
   if(!['io','amortizing'].includes(f.helocType)||!(f.helocRepay>0&&f.helocRepay<=40&&Number.isInteger(f.helocRepay*12))||!(f.helocDraw>=0&&f.helocDraw<=30&&Number.isInteger(f.helocDraw*12))){scenarios.push({...def,error:'Check the HELOC structure and whole-month draw/repayment terms.'});continue;}
   newLoan={id:'heloc',name:'New HELOC',kind:'heloc',balance:o.loanAmount,rate,payment:payment(o.loanAmount,rate,f.helocRepay*12),structure:f.helocType==='io'?'io':'fixed',drawMonths:f.helocDraw*12,repayMonths:f.helocRepay*12};
   loans=[first,newLoan,...(o.retainedSecond>0?[second]:[]),...remaining];insurance=originalMi;
   warnings.unshift(`HELOCs typically have adjustable rates. This projection assumes the rate stays the same, which is unlikely.${f.helocType==='io'&&f.helocDraw>0?` The first ${f.helocDraw} years are interest only payments, and then principal is added for the remaining ${f.helocRepay} years.`:` Principal and interest payments are modeled over ${f.helocRepay} years.`}`);
   if(o.retainedSecond>0)warnings.push('A retained second mortgage makes this an additional lien; confirm availability.');
  }
  const scenario=initialMetrics({...def,loans:loans.filter(l=>l.balance>0),housing:mortgage.housing,escrow:mortgage.escrow,insurance,warnings,cost:o.cost,cashUpfront:o.contribution,consolidated,remaining:remaining.map(l=>l.name),included:loans.filter(l=>l.balance>0).map(l=>l.name),program:f.refiProgram,newLoan,totalConsolidated:o.selected+o.replacementPayoff,consumerDebt:current.consumerDebt,consolidatedBalance:consumer.filter(l=>l.source[key]).reduce((sum,l)=>sum+l.balance,0),unconsolidatedBalance:remaining.reduce((sum,l)=>sum+l.balance,0),additionalCash:f.additionalCashEnabled?f.cashOut:0});
  scenarios.push(scenario);
 }
 for(const s of scenarios)if(!s.error){
  s.required=projectScenario(s,{horizon});s.budget=projectScenario(s,{horizon,budget:current.payment});
  if(s.id==='heloc'&&s.newLoan.structure==='io'&&s.newLoan.drawMonths>0&&s.newLoan.balance>0){const month=s.newLoan.drawMonths+1;s.helocTransition={month,payment:scheduledDue({...s.newLoan},month),householdPayment:s.required.points.find(p=>p.month===month)?.requiredPayment};}
  if(s.required.negativeAmortization)s.warnings.push('At least one entered payment is below accruing interest.');
 }
 return {scenarios,budget:current.payment,housing:mortgage.housing,horizon,equity,additionalCashSelected:!!f.additionalCashEnabled};
}
// The cash-out fallback affects only the goal cards, never the chart's current-budget view.
export function goalRepayment(comparison,goal){
 const view=goal==='payment'?'required':'budget';
 const financing=comparison.scenarios.filter(s=>s.id!=='current'&&!s.error);
 const fallback=goal!=='payment'&&comparison.additionalCashSelected&&financing.length===2&&financing.every(s=>s.budget?.fundingGap?.length);
 if(!fallback)return {basis:view,projection:s=>s[view]};
 if(goal==='interest')return {basis:'cash-required',projection:s=>s.id==='current'?s.budget:s.required};
 const monthlyBudget=Math.max(comparison.budget,...financing.map(s=>s.payment));
 const projections=new Map(financing.map(s=>[s.id,projectScenario(s,{horizon:comparison.horizon,budget:monthlyBudget})]));
 return {basis:'cash-shared',monthlyBudget,projection:s=>projections.get(s.id)??s.budget};
}
export function strongestScenario(comparison,goal,_strategy='required',plan=goalRepayment(comparison,goal)){
 const values=comparison.scenarios.filter(s=>!s.error&&!(comparison.additionalCashSelected&&s.id==='current')).map(s=>{
  const projection=plan.projection(s);
  return {id:s.id,value:goal==='payment'?s.payment:projection?.feasible?(goal==='interest'?projection.totalInterest:projection.payoff):null};
 }).filter(s=>Number.isFinite(s.value));
 if(!values.length)return [];
 const min=Math.min(...values.map(s=>s.value)),tolerance=goal==='time'?0:.01;
 return values.filter(s=>Math.abs(s.value-min)<=tolerance).map(s=>s.id);
}

// Category changes compare like-for-like recurring payments; first mortgage includes housing/MI.
export function groupDifferences(scenario,current,key){
 if(!scenario?.groups||!current?.groups||scenario.id==='current')return null;
 const g=scenario.groups[key],base=current.groups[key],housing=key==='first';
 const payment=g.payment+(housing?scenario.housing+scenario.mi:0)-base.payment-(housing?current.housing+current.mi:0);
 return {payment,rate:g.balance>0&&base.balance>0?Number((g.rate-base.rate).toFixed(2)):null};
}
