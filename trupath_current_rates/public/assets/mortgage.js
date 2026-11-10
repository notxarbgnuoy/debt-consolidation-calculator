export function localDate(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
export function payment(principal,annualRate,months){const r=annualRate/1200;return r===0?principal/months:principal*r/(-Math.expm1(-months*Math.log1p(r)));}
function dateParts(s){if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return null;const [y,m,d]=s.split('-').map(Number);const date=new Date(Date.UTC(y,m-1,d));return date.getUTCFullYear()===y&&date.getUTCMonth()===m-1&&date.getUTCDate()===d?{y,m,d}:null;}
// Product assumption: first payment is the first of the month two months after closing.
export function firstPaymentFromClosing(closingDate){const closing=dateParts(closingDate);if(!closing)return null;const first=new Date(Date.UTC(closing.y,closing.m+1,1));return first.getUTCFullYear()<=9999?first.toISOString().slice(0,10):null;}
export function originalLoanEstimate(f){
 const firstPaymentDate=firstPaymentFromClosing(f.closingDate),start=dateParts(firstPaymentDate||''),asOf=dateParts(f.balanceDate);
 if(!start||!asOf)return {error:'Enter a valid closing date and balance date.'};
 if(f.closingDate>f.balanceDate)return {error:'The balance date must be on or after the closing date.'};
 const scheduled=originalPaymentEstimate(f);if(scheduled.error)return scheduled;
 const months=f.originalTerm*12,pi=scheduled.pi;
 let elapsed=Math.max(0,(asOf.y-start.y)*12+asOf.m-start.m+1);
 elapsed=Math.min(months,elapsed);
 let balance=f.original,totalInterest=0;
 for(let i=0;i<elapsed&&balance>0;i++){const interest=balance*f.originalRate/1200;totalInterest+=interest;balance=Math.max(0,balance+interest-pi);}
 return {balance:balance<.0000001?0:balance,pi,elapsed,remaining:months-elapsed,totalInterest,firstPaymentDate};
}

export function originalPaymentEstimate(f){if(!(f.original>0&&f.originalTerm>0&&f.originalTerm<=50&&Number.isInteger(f.originalTerm*12)&&f.originalRate>=0&&f.originalRate<=40))return {error:'Enter the starting loan amount, interest rate, and original term.'};return {pi:payment(f.original,f.originalRate,f.originalTerm*12)};}

// Payment behavior is inferred, never a claim about contractual draw/repayment status.
export function estimateExistingSecond(f){
 if(!f.secondEnabled||!(f.secondBalance>0))return {kind:'none',interest:0};
 const balance=f.secondBalance,rate=f.secondRate,pay=f.secondPayment;
 if(![balance,rate,pay].every(Number.isFinite)||rate<0||pay<0)return {kind:'invalid'};
 const interest=balance*rate/1200,principal=pay-interest;
 if(principal<-.01)return {kind:'negative-amortization',interest,principal};
 if(principal<=.01)return {kind:pay>0?'interest-only-estimate':'no-payment',interest,principal:0};
 const remaining=rate===0?balance/pay:-Math.log1p(-interest/pay)/Math.log1p(rate/1200);
 return {kind:'amortizing-estimate',interest,principal,remaining:Math.ceil(remaining-1e-10)};
}
