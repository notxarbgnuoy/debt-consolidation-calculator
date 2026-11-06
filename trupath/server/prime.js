export const PRIME_SOURCE='https://www.federalreserve.gov/releases/h15/';
const clean=s=>s.replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/\s+/g,' ').trim();
export function parsePrime(html,now=new Date()){
 const table=html.match(/<table\b[^>]*id=["']h15table["'][^>]*>([\s\S]*?)<\/table>/i)?.[1];
 if(!table)throw Error('Fed rate table not found');
 const dates=new Map();
 for(const m of table.matchAll(/<th\b([^>]*)>([\s\S]*?)<\/th>/gi)){
  const id=m[1].match(/\bid=["'](col\d+)["']/)?.[1];if(!id)continue;
  const text=clean(m[2]),parts=text.match(/^(\d{4})\s+([A-Za-z]+)\s+(\d{1,2})$/);if(!parts)continue;
  const month=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(parts[2].slice(0,3).toLowerCase());
  if(month<0)continue;
  const date=`${parts[1]}-${String(month+1).padStart(2,'0')}-${parts[3].padStart(2,'0')}`;
  const parsed=new Date(date+'T00:00:00Z');if(parsed.toISOString().slice(0,10)===date&&parsed<=now)dates.set(id,date);
 }
 const row=[...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].find(m=>/^Bank prime loan\b/i.test(clean(m[1].match(/<th\b[^>]*>([\s\S]*?)<\/th>/i)?.[1]||'')))?.[1];
 if(!row)throw Error('Bank prime loan row not found');
 const values=[];
 for(const m of row.matchAll(/<td\b([^>]*)>([\s\S]*?)<\/td>/gi)){
  const col=m[1].match(/\bcol\d+\b/)?.[0],date=dates.get(col),raw=clean(m[2]);
  if(!date||!/^\d+(\.\d+)?$/.test(raw))continue;
  const rate=Number(raw);if(rate>0&&rate<=30)values.push({rate,observationDate:date});
 }
 values.sort((a,b)=>b.observationDate.localeCompare(a.observationDate));
 if(!values.length)throw Error('No valid Prime observation');
 return {version:1,...values[0],source:PRIME_SOURCE,checkedAt:now.toISOString()};
}
