export const MND_SOURCE='https://www.mortgagenewsdaily.com/mortgage-rates';
export function parseMnd(html,now=new Date()){
 const plain=s=>s.replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
 for(const table of html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)){
  let active=false,date=null;const rates={};
  for(const row of table[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
   const s=row[1];
   if(/href=["']\/mortgage-rates\/(mnd|freddie-mac|mba)["']/i.test(s)){
    active=/href=["']\/mortgage-rates\/mnd["']/i.test(s);
    const m=plain(s).match(/(?:as of\s+)?(\d{1,2})\/(\d{1,2})\/(\d{2,4})/i);
    if(active&&m){const y=m[3].length===2?'20'+m[3]:m[3];date=`${y}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`;}continue;
   }
   if(!active||!date)continue;
   const product=s.match(/href=["']\/mortgage-rates\/(30-year-fixed|15-year-fixed|30-year-fha|30-year-va)["']/)?.[1];
   const value=s.match(/<td\b[^>]*class=["']rate["'][^>]*>\s*(\d+(?:\.\d+)?)%\s*<\/td>/i)?.[1];
   if(product&&value){const rate=Number(value);if(rate>0&&rate<=30)rates[{'30-year-fixed':'fixed30','15-year-fixed':'fixed15','30-year-fha':'fha30','30-year-va':'va30'}[product]]={rate,observationDate:date};}
  }
  if(rates.fixed30&&rates.fixed15&&rates.fha30&&rates.va30){
   for(const entry of Object.values(rates)){const d=new Date(entry.observationDate+'T00:00:00Z');if(!Number.isFinite(+d)||d.toISOString().slice(0,10)!==entry.observationDate||d>now)throw Error('Invalid MND observation date');}
   return {version:1,rates,source:MND_SOURCE,checkedAt:now.toISOString()};
  }
 }
 throw Error('MND dated mortgage rate table not found');
}
