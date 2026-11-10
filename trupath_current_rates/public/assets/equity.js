import {financedProgramFee} from './program-fees.js?v=43';
import {financedClosingCosts} from './costs.js?v=43';
import {originalLoanEstimate,estimateExistingSecond} from './mortgage.js?v=43';
// Product assumptions for this illustration; no approval or pricing decision.
export const equityLimits={refi:0.8,heloc:0.9};
export const creditBands=[['780plus','780+'],...Array.from({length:8},(_,i)=>{const low=760-i*20;return [`${low}-${low+19}`,`${low}–${low+19}`];}),['619below','619 or below'],['unknown','Not sure']];
export function normalizeCreditBand(value){if(creditBands.some(([key])=>key===value))return value;const old=/^(\d{3})-(\d{3})$/.exec(value||'');if(!old)return 'unknown';const low=+old[1],high=+old[2];if(low>high)return 'unknown';if(low>=780&&high<=850)return '780plus';if(low>=300&&high<=619)return '619below';return 'unknown';}
export function equityEstimate(f,debts){
 if(!(f.home>0))return {error:'Enter your home value to see estimated borrowing room.'};
 let first=f.balance;
 if(f.mortgageSource==='original'&&f.estimateBalance){const estimate=originalLoanEstimate(f);if(estimate.error)return {error:'Enter valid original-loan dates and details, or use your actual current balance.'};first=estimate.balance;}
 const mortgages=first+(f.secondEnabled?f.secondBalance:0),cash=f.additionalCashEnabled?f.cashOut:0;
 const options={};
 for(const key of ['refi','heloc']){
  const selected=debts.reduce((sum,d)=>sum+(d[key]?d.balance:0),0),fixed=key==='refi'?f.refiCost:f.helocCost,percent=(key==='refi'?(f.refiProgram==='fha'?(f.fhaFeePercent??1.75):f.refiProgram==='va'?(f.vaFeePercent??3.3):f.refiCostPercent):f.helocCostPercent)||0,contribution=key==='refi'?f.cashIn:(f.helocCashIn||0);
  const secondBalance=f.secondEnabled?f.secondBalance:0;
  const consolidateSecond=f[key==='heloc'?'secondHeloc':'secondRefi']!==false;
  const replacementPayoff=consolidateSecond?secondBalance:0,retainedSecond=secondBalance-replacementPayoff;
  const government=key==='refi'&&['fha','va'].includes(f.refiProgram);
  const financing=(government?financedProgramFee:financedClosingCosts)((key==='refi'?first:0)+replacementPayoff+selected+cash-contribution,fixed,percent);
  if(financing.error)return {error:financing.error};
  const cost=financing.cost,loanAmount=financing.loanAmount;
  const limit=f.home*equityLimits[key],room=limit-mortgages,afterDebts=room-selected-cost+contribution,remaining=afterDebts-cash;
  const accessible=Math.max(0,room),used=Math.max(0,selected+cost+cash-contribution);
  const combinedBalance=(key==='heloc'?first+loanAmount:loanAmount)+retainedSecond;
  options[key]={baseLoanAmount:financing.baseLoanAmount??loanAmount,programFeeAmount:financing.programFeeAmount??0,limit,room,accessible,used,selected,cost,contribution,afterDebts,cash,remaining,replacementPayoff,retainedSecond,retainedSecondPayment:retainedSecond>0?f.secondPayment:0,loanAmount,combinedBalance,ltv:loanAmount/f.home,cltv:combinedBalance/f.home,shortfall:Math.max(0,-remaining)};
 }
 return {home:f.home,mortgages,mortgageRatio:mortgages/f.home,second:estimateExistingSecond(f),options};
}
