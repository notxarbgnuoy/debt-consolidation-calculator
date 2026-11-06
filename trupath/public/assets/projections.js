import {payment} from './mortgage.js?v=41';
export const MAX_MONTHS=1200;
const EPS=1e-7;
export function scheduledDue(loan,month){
 if(loan.balance<=EPS)return 0;
 const interest=loan.balance*loan.rate/1200;
 if(loan.structure==='io'&&month<=loan.drawMonths)return interest;
 if(loan.structure==='io'&&loan.repaymentPayment===undefined)loan.repaymentPayment=payment(loan.balance,loan.rate,loan.repayMonths);
 const due=Math.min(loan.balance+interest,loan.repaymentPayment??loan.payment);
 // Settle sub-cent floating residuals in the final payment, preserving accounting.
 return loan.balance+interest-due<.005?loan.balance+interest:due;
}
export function insuranceDue(scenario,loans,month){
 if(!scenario.insurance)return 0;
 const loan=loans.find(l=>l.id===scenario.insurance.loanId);if(!loan||loan.balance<=EPS)return 0;
 return scenario.insurance.years?scenario.insurance.years[Math.floor((month-1)/12)]||0:scenario.insurance.monthly;
}
export function projectScenario(scenario,{horizon=120,budget=null,extraPayment=0,maxMonths=MAX_MONTHS}={}){
 if(!Number.isFinite(extraPayment)||extraPayment<0)throw new RangeError('Invalid extra monthly payment');
 const loans=scenario.loans.map(l=>({...l})),loanPayoffs=Object.fromEntries(scenario.loans.map(l=>[l.id,l.balance<=EPS?0:null]));
 let interest=0,cash=0,debtPaid=0,miPaid=0,payoff=loans.some(l=>l.balance>EPS)?null:0,negativeAmortization=false,maxRequired=0;
 const initial=loans.reduce((s,l)=>s+l.balance,0),points=[{month:0,balance:initial,interest:0,cash:0}],fundingGap=[];
 let horizonResult;
 for(let month=1;month<=Math.max(horizon,maxMonths);month++){
  const mi=insuranceDue(scenario,loans,month),dues=loans.map(l=>scheduledDue(l,month));
  const required=dues.reduce((s,v)=>s+v,0)+mi+scenario.housing;
  maxRequired=Math.max(maxRequired,required);
  if(budget!==null&&payoff===null&&required>budget+.01){fundingGap.push({month,amount:required-budget});return {points,loanPayoffs,payoff:null,feasible:false,fundingGap,negativeAmortization,maxRequired,horizon:horizonResult??null,totalInterest:null};}
  let spent=0;
  for(let i=0;i<loans.length;i++){
   const l=loans[i],accrued=l.balance*l.rate/1200;
   interest+=accrued;if(dues[i]<accrued-EPS)negativeAmortization=true;
   l.balance=Math.max(0,l.balance+accrued-dues[i]);spent+=dues[i];
  }
  if(budget!==null||extraPayment>0){
   let extra=budget!==null?Math.max(0,budget-mi-scenario.housing-spent):extraPayment;
   for(const l of [...loans].sort((a,b)=>b.rate-a.rate||a.id.localeCompare(b.id))){const paid=Math.min(extra,l.balance);l.balance-=paid;extra-=paid;spent+=paid;if(extra<=EPS)break;}
  }
  for(const l of loans)if(l.balance<=EPS&&loanPayoffs[l.id]===null)loanPayoffs[l.id]=month;
  debtPaid+=spent;miPaid+=mi;cash+=spent+mi+scenario.housing;
  const balance=loans.reduce((s,l)=>s+l.balance,0);
  if(!Number.isFinite(balance)||balance>1e15)return {points,loanPayoffs,payoff:null,feasible:false,error:'Balances grow beyond the model range.',horizon:horizonResult??null,totalInterest:null};
  if(balance<=EPS&&payoff===null)payoff=month;
  const point={month,balance:balance<EPS?0:balance,interest,cash,debtPaid,insurance:miPaid,requiredPayment:required};points.push(point);
  if(month===horizon)horizonResult={...point,totalCash:cash+(scenario.cashUpfront||0)};
  if(payoff!==null&&month>=horizon)break;
 }
 return {points,loanPayoffs,payoff,feasible:true,fundingGap,negativeAmortization,maxRequired,horizon:horizonResult,totalInterest:payoff===null?null:interest};
}

// Cumulative interest at a common month; an incomplete projection is never extrapolated.
export function cumulativeInterestAt(projection,month){
 if(!projection||!Number.isInteger(month)||month<0)return null;
 const point=projection.points.find(p=>p.month===month);if(point)return point.interest;
 const last=projection.points.at(-1);
 return projection.payoff!==null&&projection.payoff!==undefined&&projection.payoff<=month&&last?last.interest:null;
}
export function repaymentViewForGoal(goal){return goal==='interest'||goal==='time'?'budget':'required';}
export function repaymentProjection(scenario,view){return scenario[view];}
