// Display formatting stays separate from the numeric state used for calculations.
const formatter=new Intl.NumberFormat('en-US',{maximumFractionDigits:2});
export function formatAmount(value){return formatter.format(value);}
export function parseAmount(text,max=100000000){
  const raw=String(text).trim();
  if(raw==='')return 0;
  if(!/^(?:\d+|\d{1,3}(?:,\d{3})+)?(?:\.\d{0,2})?$/.test(raw)||raw==='.')return null;
  const value=Number(raw.replaceAll(',',''));
  return Number.isFinite(value)&&value>=0&&value<=max?value:null;
}
