import express from 'express';
import Parser from 'rss-parser';

const app = express();
const parser = new Parser({
  timeout: 15000,
  headers: { 'User-Agent': 'Serwis-Swiat/3.0 news-reader' }
});
const PORT = process.env.PORT || 3000;

const SOURCES = [
  {name:'PAP', short:'PAP', category:'Polska', url:'https://pap-mediaroom.pl/rss/polityka-i-spoleczenstwo.xml', trust:5},
  {name:'PAP MediaRoom', short:'PAP', category:'Polska', url:'https://pap-mediaroom.pl/rss', trust:5},
  {name:'Reuters – World', short:'Reuters', category:'Świat', url:'https://news.google.com/rss/search?q=when:24h+site:reuters.com/world&ceid=US:en&hl=en-US&gl=US', trust:5},
  {name:'Reuters – Europe', short:'Reuters', category:'Geopolityka', url:'https://news.google.com/rss/search?q=when:24h+site:reuters.com/world/europe&ceid=US:en&hl=en-US&gl=US', trust:5},
  {name:'Reuters – Middle East', short:'Reuters', category:'Geopolityka', url:'https://news.google.com/rss/search?q=when:24h+site:reuters.com/world/middle-east&ceid=US:en&hl=en-US&gl=US', trust:5},
  {name:'AP – World', short:'AP', category:'Świat', url:'https://news.google.com/rss/search?q=when:24h+site:apnews.com/world&ceid=US:en&hl=en-US&gl=US', trust:5},
  {name:'BBC – World', short:'BBC', category:'Świat', url:'https://news.google.com/rss/search?q=when:24h+site:bbc.com/news/world&ceid=US:en&hl=en-US&gl=US', trust:4},
  {name:'MON', short:'MON', category:'Wojsko', url:'https://news.google.com/rss/search?q=when:7d+site:gov.pl/web/obrona-narodowa&ceid=US:en&hl=en-US&gl=US', trust:5},
  {name:'MSZ', short:'MSZ', category:'Dyplomacja', url:'https://news.google.com/rss/search?q=when:7d+site:gov.pl/web/dyplomacja&ceid=US:en&hl=en-US&gl=US', trust:5},
  {name:'NATO', short:'NATO', category:'Wojsko', url:'https://news.google.com/rss/search?q=when:7d+site:nato.int+news&ceid=US:en&hl=en-US&gl=US', trust:5},
  {name:'ISW – Ukraine', short:'ISW', category:'Ukraina', url:'https://news.google.com/rss/search?q=when:24h+site:understandingwar.org&ceid=US:en&hl=en-US&gl=US', trust:5}
];

const urgentRE = /pilne|urgent|attack|atak|war|wojna|missile|rakiet|drone|dron|explosion|eksploz|invasion|inwaz|nato|alarm|strike|uderzen|front|ceasefire|rozejm/i;
const categoryRE = {
  'Polityka': /rząd|sejm|senat|wybory|prezydent|premier|minister|parlament|partia|polityk|koalicj|ustaw/i,
  'Geopolityka': /geopolit|rosj|usa|chiny|iran|izrael|bliski wschód|europ|sankcj|ambasad|relacj|trump|putin/i,
  'Wojsko': /wojsk|militar|arm|nato|rakiet|dron|czołg|myśliw|żołnier|obron|missile|defen[cs]/i,
  'Ukraina': /ukrain|zelensk|zelensky|kijów|kyiv|donbas|front/i
};

function clean(s='') {
  return s.replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&')
    .replace(/\s+/g,' ').trim();
}
function norm(s='') {
  return clean(s).toLowerCase().replace(/[^a-ząćęłńóśźż0-9 ]/gi,' ')
    .replace(/\s+/g,' ').trim();
}
function words(s) { return new Set(norm(s).split(' ').filter(x=>x.length>4)); }
function similarity(a,b) {
  const A=words(a), B=words(b); if(!A.size||!B.size) return 0;
  let n=0; for(const x of A) if(B.has(x)) n++;
  return n/Math.max(A.size,B.size);
}
function classify(title, description, fallback) {
  const text=`${title} ${description}`;
  if (fallback==='Polska' && categoryRE.Polityka.test(text)) return 'Polityka';
  if (categoryRE.Ukraina.test(text)) return 'Ukraina';
  if (categoryRE.Wojsko.test(text)) return 'Wojsko';
  if (categoryRE.Geopolityka.test(text)) return 'Geopolityka';
  if (categoryRE.Polityka.test(text)) return 'Polityka';
  return fallback;
}
function isUrgent(x) { return urgentRE.test(`${x.title} ${x.description}`); }

async function fetchSource(src) {
  try {
    const feed=await parser.parseURL(src.url);
    return (feed.items||[]).slice(0,35).map(i=>{
      const title=clean(i.title||'Bez tytułu');
      const description=clean(i.contentSnippet||i.content||i.summary||'');
      const date=i.isoDate||i.pubDate||new Date().toISOString();
      return {
        id:Buffer.from(`${i.guid||i.link||title}|${src.short}`).toString('base64url'),
        title, link:i.link||i.guid||'#', date, description,
        source:src.short, sourceName:src.name,
        category:classify(title,description,src.category), trust:src.trust
      };
    });
  } catch { return []; }
}

app.use(express.static('public'));
app.get('/api/health',(req,res)=>res.json({ok:true,version:'3.0.0',time:new Date().toISOString()}));
app.get('/api/sources',(req,res)=>res.json(SOURCES.map(({name,short,category,trust})=>({name,short,category,trust}))));
app.get('/api/news',async(req,res)=>{
  const results=(await Promise.all(SOURCES.map(fetchSource))).flat()
    .filter(x=>x.title && x.link);
  results.sort((a,b)=>new Date(b.date)-new Date(a.date));
  const kept=[];
  for (const item of results) {
    const match=kept.find(x=>similarity(x.title,item.title)>0.76);
    if (match) {
      if (!match.sources.includes(item.source)) match.sources.push(item.source);
      if (!match.sourceLinks) match.sourceLinks=[];
      match.sourceLinks.push({source:item.source,link:item.link});
    } else {
      item.sources=[item.source];
      item.sourceLinks=[{source:item.source,link:item.link}];
      kept.push(item);
    }
  }
  const now=Date.now();
  const enriched=kept.map(x=>{
    const ageHours=Math.max(0,(now-new Date(x.date).getTime())/3600000);
    const corroboration=x.sources.length;
    const importance=Math.max(0,Math.min(100, x.trust*12 + corroboration*18 + (isUrgent(x)?24:0) - ageHours*1.5));
    return {...x, corroboration, urgent:isUrgent(x), importance:Math.round(importance)};
  });
  enriched.sort((a,b)=>b.importance-a.importance);
  res.json({updatedAt:new Date().toISOString(),items:enriched.slice(0,120)});
});
app.listen(PORT,()=>console.log(`Serwis Świat 3.0 listening on ${PORT}`));
