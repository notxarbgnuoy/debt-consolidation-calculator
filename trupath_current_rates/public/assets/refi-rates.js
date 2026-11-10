// User-supplied cash-out LLPA grid, in pricing percentage points.
// Calibration anchor: 780+ / <=60% LTV; every 0.5 pricing points = 0.125 rate points.
export const cashOutLlpa={
 '780plus':[.375,.375,.625,.875,1.375],
 '760-779':[.375,.375,.875,1.25,1.875],
 '740-759':[.375,.375,1,1.625,2.375],
 '720-739':[.375,.5,1.375,2,2.75],
 '700-719':[.375,.5,1.625,2.625,3.25],
 '680-699':[.375,.625,2,2.875,3.75],
 '660-679':[.375,.875,2.75,4,4.75],
 '640-659':[.375,1.375,3.125,4.625,5.125],
 '620-639':[.375,1.375,3.375,4.875,5.125]
};
export const refiCalibration={baseLlpa:.375,priceToRate:.25,baseOffset:0};
export const roundUpEighth=value=>Math.ceil((value-1e-10)*8)/8;
export const roundNearestEighth=value=>Math.round(value*8)/8;
export const governmentFicoAdjustment={'780plus':0,'760-779':0,'740-759':0,'720-739':0,'700-719':.125,'680-699':.125,'660-679':.125,'640-659':.25,'620-639':.375,'619below':1};
export function validMnd(data){return data?.version===1&&data.source==='https://www.mortgagenewsdaily.com/mortgage-rates'&&Number.isFinite(Date.parse(data.checkedAt))&&['fixed30','fixed15','fha30','va30'].every(key=>{const r=data.rates?.[key];return r&&Number.isFinite(r.rate)&&r.rate>0&&r.rate<=30&&/^\d{4}-\d{2}-\d{2}$/.test(r.observationDate);});}
export function refiRateEstimate(data,band,ltv,term,retainedSecond=0,program='conventional'){
 if(!validMnd(data))return {error:'Loading mortgage benchmark. You can enter a rate manually.'};
 const assumedCredit=band==='unknown',key=assumedCredit?'740-759':band;
 if(program==='fha'||program==='va'){
  const benchmark=data.rates[program==='fha'?'fha30':'va30'],adjustment=governmentFicoAdjustment[key];
  if(!benchmark||!Number.isFinite(benchmark.rate)||benchmark.rate<=0||benchmark.rate>30)return {error:`Loading ${program.toUpperCase()} benchmark. You can enter a rate manually.`};
  if(adjustment===undefined)return {error:'Select a credit range or enter a rate manually.'};
  const baseRate=roundNearestEighth(benchmark.rate-.25);
  return {rate:Math.round((baseRate+adjustment)*1000)/1000,baseRate,adjustment,benchmark:benchmark.rate,observationDate:benchmark.observationDate,assumedCredit,program};
 }
 if(program!=='conventional')return {error:'Select a supported loan type or enter a rate manually.'};
 if(!Number.isFinite(ltv)||ltv<0)return {error:'Enter valid home and mortgage amounts, or enter a rate manually.'};
 const pricingLtv=Math.min(ltv,.8),cappedPricing=ltv>.8+1e-10;
 if(retainedSecond>0)return {error:'A second mortgage stays in place. Enter a rate manually for this scenario.'};
 if(!(term>0&&term<=30&&Number.isInteger(term*12)))return {error:'Enter a rate manually for this mortgage term.'};
 const row=cashOutLlpa[key];
 if(!row)return {error:'Enter an example refinance rate manually for this credit range.'};
 const col=[.3,.6,.7,.75,.8].findIndex(limit=>pricingLtv<=limit+1e-10),llpa=row[col],margin=(llpa-refiCalibration.baseLlpa)*refiCalibration.priceToRate+refiCalibration.baseOffset;
 const benchmark=data.rates[term<=15?'fixed15':'fixed30'];
 return {rate:roundUpEighth(benchmark.rate+margin),margin,llpa,benchmark:benchmark.rate,observationDate:benchmark.observationDate,assumedCredit,ltv,pricingLtv,cappedPricing,program};
}
