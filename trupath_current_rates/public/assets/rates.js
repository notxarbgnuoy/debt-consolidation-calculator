export const helocMargins={
 '780plus':[.25,.375,.5,.875,1.625],
 '760-779':[.375,.5,.5,1,1.75],
 '740-759':[.375,.5,.5,1,1.75],
 '720-739':[.5,.625,.875,1.125,1.75],
 '700-719':[.625,.75,1,1.25,2],
 '680-699':[1,1.25,1.5,3.5,5],
 '660-679':[2.5,3.75,5.5,7.5,9],
 '640-659':[3.25,4.75,8,9,10.5],
 '620-639':[4,5.25,8.5,10,11.5]
};
export function validPrime(p){return !!p&&p.version===1&&Number.isFinite(p.rate)&&p.rate>0&&p.rate<=30&&/^\d{4}-\d{2}-\d{2}$/.test(p.observationDate)&&Number.isFinite(Date.parse(p.checkedAt))&&p.source==='https://www.federalreserve.gov/releases/h15/';}
export function helocRateEstimate(prime,band,cltv){
 if(!validPrime(prime))return {error:'Loading Prime. You can enter a rate manually.'};
 if(!Number.isFinite(cltv)||cltv<0)return {error:'Enter valid home and mortgage amounts, or enter a rate manually.'};
 const pricingCltv=Math.min(cltv,.8),cappedPricing=cltv>.8+1e-10;
 const assumedCredit=band==='unknown',key=assumedCredit?'740-759':band,row=helocMargins[key];
 if(!row)return {error:'Enter an example rate manually for this credit range.'};
 const column=[.6,.7,.8,.85,.9].findIndex(limit=>pricingCltv<=limit+1e-10),margin=row[column];
 const extrapolated=(key==='680-699'||key==='660-679')&&column===4||key==='640-659'&&column>=3||key==='620-639'&&column>=2;
 return {rate:Math.round((prime.rate+margin)*1000)/1000,margin,cltv,pricingCltv,cappedPricing,assumedCredit,extrapolated};
}
