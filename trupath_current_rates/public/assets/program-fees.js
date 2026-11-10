import {payment} from './mortgage.js?v=43';
// FHA UFMIP / VA funding fee: percentage of the base before the program fee.
export function financedProgramFee(principal,fixed,percent){
 if(![principal,fixed,percent].every(Number.isFinite)||fixed<0||percent<0||percent>25)return {error:'Enter a program fee from 0% to 25% and nonnegative fixed costs.'};
 const baseLoanAmount=Math.max(0,principal+fixed),programFeeAmount=baseLoanAmount*percent/100;
 return {baseLoanAmount,programFeeAmount,loanAmount:baseLoanAmount+programFeeAmount,cost:fixed+programFeeAmount};
}
// HUD ML 2023-05, Appendix 1.0. Regular forward loans; no streamline exceptions.
export function fhaMipTerms(baseLoanAmount,ltv,term){
 if(![baseLoanAmount,ltv,term].every(Number.isFinite)||baseLoanAmount<0||ltv<0||term<=0||term>50)return {error:'Enter valid FHA loan, value and term details.'};
 const high=baseLoanAmount>726200;
 let annualRate;
 if(term>15)annualRate=(high?.7:.5)+(ltv>.95+1e-10?.05:0);
 else annualRate=high?(ltv<=.78+1e-10?.15:ltv<=.9+1e-10?.4:.65):(ltv<=.9+1e-10?.15:.4);
 return {annualRate,durationYears:ltv<=.9+1e-10?Math.min(11,term):term};
}
const cents=n=>Math.round((n+Number.EPSILON)*100)/100;
// First amortization-year MIP: average scheduled balance, exclude financed UFMIP,
// then annual/monthly rounding per HUD's periodic MIP calculation method.
export function firstYearMonthlyMip({loanAmount,interestRate,term,annualRate,upfrontPercent,monthlyPI}){
 if(![loanAmount,interestRate,term,annualRate,upfrontPercent].every(Number.isFinite)||loanAmount<0||interestRate<0||interestRate>40||term<=0||annualRate<0||upfrontPercent<0)return {error:'Enter a valid rate and term to estimate monthly MIP.'};
 if(loanAmount===0)return {monthly:0,annualPremium:0,averageBalance:0};
 const pi=monthlyPI??cents(payment(loanAmount,interestRate,term*12));
 let balance=loanAmount,total=balance;
 for(let i=0;i<11;i++){const interest=cents(cents(balance*interestRate)/1200);balance=Math.max(0,cents(balance+interest-pi));total+=balance;}
 const averageBalance=total/12,annual=cents(cents(averageBalance*annualRate/100)/(1+upfrontPercent/100));
 const monthly=cents(annual/12);
 return {monthly,annualPremium:cents(monthly*12),averageBalance};
}
export function estimateFhaMip(option,home,term,rate,upfrontPercent){
 if(!option||!(home>0))return {error:'Enter home and loan details.'};
 const terms=fhaMipTerms(option.baseLoanAmount,option.baseLoanAmount/home,term);if(terms.error)return terms;
 return {...terms,...firstYearMonthlyMip({loanAmount:option.loanAmount,interestRate:rate,term,annualRate:terms.annualRate,upfrontPercent})};
}
