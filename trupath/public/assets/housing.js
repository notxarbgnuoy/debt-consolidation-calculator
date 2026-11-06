import {originalPaymentEstimate} from './mortgage.js';
export const insuranceTiers=[{upTo:249999.99,monthly:100},{upTo:399999.99,monthly:120},{upTo:549999.99,monthly:140},{upTo:749999.99,monthly:160},{upTo:Infinity,monthly:180}];
export function insuranceEstimate(price){return price>0?insuranceTiers.find(t=>price<=t.upTo).monthly:0;}
export function housingAmounts(f){return {tax:f.taxMode==='estimate'?f.home*f.taxRate/100:f.tax,insurance:f.insuranceMode==='estimate'?insuranceEstimate(f.home)*12:f.insurance};}
export function estimatePaymentBreakdown(f){const a=housingAmounts(f);const mi=f.pmiEnabled?f.mi:0;const totalMode=f.mortgageSource!=='estimate'&&f.escrowMode==='total';const escrow=totalMode?f.escrowTotal:(f.taxEscrowed?a.tax/12:0)+(f.insuranceEscrowed?a.insurance/12:0);const alreadyIncluded=totalMode&&f.pmiEnabled&&f.pmiInEscrow;const deduction=escrow+(alreadyIncluded?0:mi);return {escrow,mortgageInsurance:mi,principalAndInterest:f.total-deduction,consistent:f.total>=deduction&&(!alreadyIncluded||escrow>=mi)};}

export function inferEscrow(f){
 const original=f.mortgageSource==='original';const scheduled=original?originalPaymentEstimate(f):{pi:f.pi};
 if(scheduled.error)return {error:scheduled.error};
 const combined=f.total-scheduled.pi,mi=f.pmiEnabled?f.mi:0;
 if(!(f.total>0)||combined<-.005||combined-mi<-.005)return {error:'The total payment is too low for this loan payment and PMI. Check the amounts.'};
 return {pi:scheduled.pi,combined:Math.max(0,combined),escrow:Math.max(0,combined-mi),mi,pmiKnown:!!f.pmiEnabled&&f.mi>0};
}
