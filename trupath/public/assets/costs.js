// Percentage is charged on the final loan including financed costs.
// L = base + fixed + percentage * L; therefore L = (base + fixed)/(1 - percentage).
export function financedClosingCosts(base,fixed,percent=0){
 if(![base,fixed,percent].every(Number.isFinite)||fixed<0||percent<0||percent>25)return {error:'Closing costs need a nonnegative fixed amount and a percentage from 0% to 25%.'};
 const loanAmount=Math.max(0,(base+fixed)/(1-percent/100));
 return {loanAmount,cost:fixed+loanAmount*percent/100,percent,fixed};
}
