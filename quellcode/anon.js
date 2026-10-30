/* ---------- Kontoauszug anonymisieren (alles läuft nur im Browser, nichts wird hochgeladen) ---------- */
const ANON_CATS=['Lebensmittel','Drogerie','Restaurant & Lieferdienst','Tanken & Auto','Strom & Energie','Wohnen & Kredit','Versicherung','Online-Einkauf','Abo & Medien','Telefon & Internet','Gesundheit','Freizeit & Reise','Kleidung','Bargeld','Gehalt','Ferienwohnung','Übertrag eigene Konten','Steuern & Gebühren','Spenden & Mitgliedschaft','Kinder & Familie','Sonstiges'];
const ANON_RULES=[
 ['Lebensmittel',['rewe','aldi','lidl','edeka','netto','penny','kaufland','norma','hit ','globus','real,-','bäcker','baecker','metzger','wasgau','tegut','denns','alnatura','nahkauf','markant','getränke','getraenke','trinkgut']],
 ['Drogerie',['dm-drogerie','dm drogerie','dm fil','rossmann','mueller','müller','budni']],
 ['Restaurant & Lieferdienst',['restaurant','pizzeria','pizza','trattoria','ristorante','döner','doener','lieferando','wolt','uber eats','burger','mcdonald','mc donald','kfc','subway','gastst','gasthaus','café','cafe','bistro','imbiss','kebap','sushi','bäckerei cafe','eiscafe','eis ','bar ','brauhaus','vapiano','nordsee','starbucks']],
 ['Versicherung',['versicherung','huk','axa','allianz','debeka','ergo','signal iduna','provinzial','württembergische','wuerttembergische','r+v','hdi','generali','zurich','devk','lvm','vhv','hansemerkur','barmenia','krankenkasse','tk ','aok','barmer','dak','ikk']],
 ['Tanken & Auto',['aral','shell','total','esso','jet ','avia','tankstelle','tank ','agip','orlen','star tank','hem ','hyundai','werkstatt','reifen','atu ','a.t.u','kfz','tüv','tuev','dekra','autohaus','ionity','ewe go','enbw mobility','elli','go-e','wallbox','parkhaus','parken','easypark','paybyphone','adac']],
 ['Strom & Energie',['tibber','e.on','eon ','stadtwerke','energie','strom','gas ','evm','innogy','vattenfall','heizöl','heizoel','pellets','fenecon']],
 ['Wohnen & Kredit',['sparda','darlehen','tilgung','zins','ing-diba','ing diba','baufinanz','bausparkasse','lbs ','schwäbisch hall','wüstenrot','miete','hausgeld','grundsteuer','abwasser','wasserwerk','wasserversorgung','verbandsgemeinde','vg daun','gemeinde','abfall','müllgeb','muellgeb','schornstein','kamin']],
 ['Online-Einkauf',['amazon','amzn','ebay','paypal','otto ','zalando','about you','mediamarkt','saturn','conrad','reichelt','alternate','notebooksbilliger','ikea','obi ','hornbach','bauhaus','toom','hagebau','globus bau','temu','shein','aliexpress','apple.com','google *','klarna']],
 ['Abo & Medien',['netflix','spotify','disney','amazon prime','prime video','dazn','sky ','youtube','apple music','audible','kindle','rundfunk','ard zdf','beitragsservice','gez','zeitung','abo ','patreon','steam','playstation','nintendo','xbox','microsoft','adobe','dropbox','icloud','google one','anthropic','openai','chatgpt','claude']],
 ['Telefon & Internet',['telekom','vodafone','o2 ','telefonica','1&1','1und1','congstar','aldi talk','freenet','mobilcom','drillisch','fraenk','pyur','unitymedia','netcologne']],
 ['Gesundheit',['apotheke','arzt','ärzt','praxis','zahn','physio','optik','fielmann','apollo','klinik','krankenhaus','sanitäts','massage']],
 ['Freizeit & Reise',['kino','cinema','theater','konzert','eventim','ticket','schwimmbad','bad ','fitness','mcfit','clever fit','sport','verein','bahn','db vertrieb','flixbus','lufthansa','eurowings','ryanair','hotel','booking.com','airbnb','ferien','reise','urlaub','camping','museum','zoo','freizeitpark','thermal','sauna']],
 ['Kleidung',['h&m','c&a','zara','primark','deichmann','takko','kik','ernsting','peek','p&c','s.oliver','esprit','tk maxx','jack & jones','engelhorn','breuninger','snipes','foot locker','decathlon','intersport']],
 ['Bargeld',['geldautomat','bargeld','auszahlung','atm','cash','abhebung','ga nr','geldausgabe']],
 ['Gehalt',['gehalt','lohn','bezüge','bezuege','entgelt','vergütung','verguetung','arbeitgeber','salary','sold']],
 ['Ferienwohnung',['booking.com b.v.','booking.com bv','airbnb payments','airbnb pay','fewo','ferienwohnung','gästebeitrag','gaestebeitrag','kurbeitrag','tourist','meldeschein']],
 ['Übertrag eigene Konten',['übertrag','uebertrag','umbuchung','rückgabe','rueckgabe','eigenes konto','tagesgeld','sparen','dauerauftrag','rücklage','ruecklage','scalable','trade republic','depot','etf','sparplan','haushaltskonto','giroausgleich']],
 ['Steuern & Gebühren',['finanzamt','steuer','kontoführung','kontofuehrung','entgelt kontoführung','gebühr','gebuehr','mahn','bußgeld','bussgeld','stadtkasse','kreiskasse','zoll']],
 ['Spenden & Mitgliedschaft',['spende','mitgliedsbeitrag','beitrag','gewerkschaft','igbce','ig bce','verdi','verein ','kirche','caritas','drk','unicef','greenpeace','wwf','nabu']],
 ['Kinder & Familie',['kita','kindergarten','schule','elterngeld','kindergeld','familienkasse','spielzeug','toys']],
];
/* Händler-Namen, die in der Ausgabe stehen dürfen (bekannte Firmen – keine Personen) */
const ANON_BRANDS=['REWE','ALDI','LIDL','EDEKA','Netto','Penny','Kaufland','dm','Rossmann','Amazon','eBay','PayPal','Otto','Zalando','IKEA','OBI','Hornbach','Bauhaus','Toom','Aral','Shell','Total','Esso','JET','Tibber','E.ON','Telekom','Vodafone','o2','1&1','Netflix','Spotify','Disney','Apple','Google','Microsoft','Lieferando','McDonald','Burger King','Subway','Bahn','Flixbus','Booking.com','Airbnb','Sparda','ING','Scalable','HUK','AXA','Allianz','Debeka','ADAC','IGBCE','Finanzamt','Rundfunk','Apotheke','Decathlon','H&M','C&A','Deichmann','Media Markt','Saturn','Tedi','Action','Woolworth','Kik','Takko','Ernsting','Fressnapf','Zoo','Hyundai','Shein','Temu','Klarna','Steam','Anthropic','Fielmann','Apollo','Starbucks','Nordsee','Vapiano','DAZN','Sky'];
function anonParse(text){
  text=text.replace(/^﻿/,'');const lines=text.split(/\r?\n/).filter(l=>l.trim());if(!lines.length)throw new Error('Datei ist leer');
  const delim=(l=>{const c={';':(l.match(/;/g)||[]).length,',':(l.match(/,/g)||[]).length,'\t':(l.match(/\t/g)||[]).length};return Object.entries(c).sort((a,b)=>b[1]-a[1])[0][0];});
  const split=(l,d)=>{const out=[];let cur='',q=false;for(let i=0;i<l.length;i++){const ch=l[i];if(ch==='"'){if(q&&l[i+1]==='"'){cur+='"';i++;}else q=!q;}else if(ch===d&&!q){out.push(cur);cur='';}else cur+=ch;}out.push(cur);return out.map(x=>x.trim());};
  const H=/buchung|datum|valuta|betrag|umsatz|verwendung|empf|auftraggeber/i;
  let hi=lines.findIndex(l=>H.test(l)&&(l.match(/[;,\t]/g)||[]).length>=3);if(hi<0)hi=0;
  const d=delim(lines[hi]);const head=split(lines[hi],d).map(h=>h.toLowerCase());
  const col=(...keys)=>{for(const k of keys){const i=head.findIndex(h=>h.includes(k));if(i>=0)return i;}return -1;};
  const cDate=col('buchungstag','buchungsdatum','buchung','datum','valuta'),cAmt=col('betrag','umsatz'),cSH=col('soll/haben','soll_haben','s/h'),cWhos=head.map((h,i)=>/auftraggeber|empf[äa]nger|zahlungspflicht|beg[üu]nstigter|^name/.test(h)?i:-1).filter(i=>i>=0),cTxt=col('verwendungszweck','buchungstext','vorgang','beschreibung','text'),cTyp=col('umsatzart','buchungsart','vorgang');
  if(cDate<0||cAmt<0)throw new Error('Spalten für Datum und Betrag nicht gefunden. Erwartet wird ein CSV- oder PDF-Kontoauszug deiner Bank.');
  const toNum=s=>{s=String(s||'').replace(/\s|€|EUR/g,'');if(!s)return null;if(/,\d{1,2}$/.test(s))s=s.replace(/\./g,'').replace(',','.');else if(/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s))s=s.replace(/,/g,'');const v=Number(s);return isFinite(v)?v:null;};
  const toDate=s=>{s=String(s||'').trim();let m=s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);if(m)return `${m[3].length===2?'20'+m[3]:m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);if(m)return m[0];return null;};
  const rows=[];for(let i=hi+1;i<lines.length;i++){const f=split(lines[i],d);if(f.length<3)continue;const dt=toDate(f[cDate]);let amt=toNum(f[cAmt]);if(dt==null||amt==null)continue;
    if(cSH>=0&&/^s/i.test(f[cSH]||''))amt=-Math.abs(amt);else if(cSH>=0&&/^h/i.test(f[cSH]||''))amt=Math.abs(amt);
    const who=cWhos.map(i=>f[i]).filter(Boolean).join(' / ');const txt=cTxt>=0?f[cTxt]:'';const typ=cTyp>=0&&cTyp!==cTxt?f[cTyp]:'';rows.push({d:dt,b:Math.round(amt*100)/100,raw:[who,txt,typ].filter(Boolean).join(' | ')});}
  if(!rows.length)throw new Error('Keine Buchungen erkannt. Ist es ein Kontoauszug als CSV oder PDF?');
  rows.sort((a,b)=>a.d.localeCompare(b.d));return rows;}

/* ---------- PDF-Kontoauszüge (Text wird im Browser mit pdf.js ausgelesen, nichts wird hochgeladen) ---------- */
const ANON_PDFJS='https://cdn.jsdelivr.net/npm/pdfjs-dist@6.2.108/legacy/build/';
let anonPdfP=null;
function anonPdfLib(){if(!anonPdfP)anonPdfP=import(ANON_PDFJS+'pdf.min.mjs').then(m=>{const lib=m.default&&m.default.getDocument?m.default:m;lib.GlobalWorkerOptions.workerSrc=ANON_PDFJS+'pdf.worker.min.mjs';return lib;}).catch(e=>{anonPdfP=null;throw new Error('PDF-Leser konnte nicht geladen werden (Internet?).');});return anonPdfP;}
async function anonPdfPages(buf){const lib=await anonPdfLib();let doc;
  try{doc=await lib.getDocument({data:new Uint8Array(buf),isEvalSupported:false}).promise;}catch(e){if(/password/i.test(e&&e.name||'')||/password/i.test(e&&e.message||''))throw new Error('Das PDF ist mit Passwort geschützt. Bitte ohne Passwort herunterladen.');throw new Error('PDF konnte nicht geöffnet werden.');}
  const pages=[];for(let p=1;p<=doc.numPages;p++){const tc=await (await doc.getPage(p)).getTextContent();
    const its=tc.items.filter(i=>i.str&&i.str.trim()).map(i=>({s:i.str.trim(),x:i.transform[4],y:i.transform[5],w:i.width||0,h:Math.abs(i.transform[3])||Math.abs(i.transform[0])||10}));
    its.sort((a,b)=>b.y-a.y||a.x-b.x);const lines=[];
    for(const it of its){const L=lines.find(l=>Math.abs(l.y-it.y)<=Math.max(2,it.h*0.4));if(L)L.it.push(it);else lines.push({y:it.y,h:it.h,it:[it]});}
    lines.forEach(l=>{l.it.sort((a,b)=>a.x-b.x);const c=[];for(const it of l.it){const p=c.at(-1);const gap=p?it.x-(p.x+p.w):99;if(p&&gap<it.h*0.6){p.s+=(gap>it.h*0.12?' ':'')+it.s;p.w=it.x+it.w-p.x;}else c.push({s:it.s,x:it.x,w:it.w});}l.c=c;l.t=c.map(x=>x.s).join('  ');delete l.it;});
    lines.sort((a,b)=>b.y-a.y);pages.push(lines);}
  if(!pages.flat().length)throw new Error('Im PDF steckt kein Text (eingescannt?). Bitte den Auszug als PDF aus dem Online-Banking oder als CSV nehmen.');
  return pages;}
const ANON_AMT=/(?:^|\s)([+-])?\s?(\d{1,3}(?:\.\d{3})+|\d+),(\d{2})(?:\s?(?:EUR|Euro|€))?\s?([+-]|S|H)?$/;
function anonAmt(line){/* Betrag ganz rechts in der Zeile, Vorzeichen davor/dahinter oder S/H; x = rechte Kante (für Soll-/Haben-Spalte) */
  const c=line.c;for(let k=c.length-1;k>=Math.max(0,c.length-3);k--){const t=c.slice(k).map(x=>x.s).join(' ');const m=t.match(ANON_AMT);
    if(m){const v=Number(m[2].replace(/\./g,'')+'.'+m[3]);const sg=m[1]||m[4]||'';const amtCell=[...c.slice(k)].reverse().find(x=>/\d,\d{2}/.test(x.s))||c[k];
      return {v,sign:sg==='-'||sg==='S'?-1:sg==='+'||sg==='H'?1:0,x:amtCell.x+amtCell.w,cut:k,head:c.slice(0,k).map(x=>x.s).join('  ')+' '+c[k].s.replace(ANON_AMT,'').trim()};}}
  return null;}
function anonParsePdf(pages){
  const all=pages.flat().map(l=>l.t).join('\n');
  /* Jahr bestimmen: Zeitraum „01.10.2026 – 31.10.2026“, sonst alle vollen Daten */
  let y0=null,m0=null,y1=null;const per=all.match(/(\d{1,2})\.(\d{1,2})\.(20\d{2})\s*(?:-|–|bis)\s*(\d{1,2})\.(\d{1,2})\.(20\d{2})/);
  if(per){y0=+per[3];m0=+per[2];y1=+per[6];}else{const f=[...all.matchAll(/\b\d{1,2}\.(\d{1,2})\.(20\d{2})\b/g)].map(m=>[+m[2],+m[1]]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]);if(f.length){[y0,m0]=f[0];y1=f.at(-1)[0];}}
  const noYear=y1==null;if(noYear){y1=y0=new Date().getFullYear();m0=1;}
  const toD=(d,m,y)=>{let yy=y?(y.length===2?2000+ +y:+y):(y0!==y1&&+m>=m0?y0:y1);if(+m<1||+m>12||+d<1||+d>31)return null;return `${yy}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;};
  const DRE=/^(\d{1,2})\.(\d{1,2})\.(\d{4}|\d{2}(?!\d))?/;
  const SKIP=/kontostand|saldo|zwischensumme|^summe|übertrag auf|übertrag von|uebertrag auf|uebertrag von|gesamtumsätze|summe der/i;
  const cnt={};const key=t=>t.replace(/\d/g,'#');pages.forEach(ls=>new Set(ls.map(l=>key(l.t))).forEach(k=>cnt[k]=(cnt[k]||0)+1));
  const repeated=t=>pages.length>1&&cnt[key(t)]>=Math.max(2,Math.ceil(pages.length*0.6));
  const rows=[];let old=null,neu=null,colS=null,colH=null,unsure=0;
  for(const lines of pages){let cur=null,lastY=null,cont=0;
    for(const l of lines){const t=l.t.trim();
      const hs=l.c.find(c=>/^(soll|belastung(en)?|ausgang|abgang|lastschriften|ausgänge)$/i.test(c.s)),hh=l.c.find(c=>/^(haben|gutschrift(en)?|eingang|zugang|eingänge)$/i.test(c.s));
      if(hs&&hh){colS=hs.x+hs.w;colH=hh.x+hh.w;cur=null;continue;}
      if(/kontostand|saldo/i.test(t)){const a=anonAmt(l);if(a){const v=a.v*(a.sign||1);if(/neu|end|schluss|aktuell/i.test(t))neu=v;else if(/alt|anfang|bisher|vorher|start|letzt/i.test(t)&&old==null)old=v;}cur=null;continue;}
      const dm=t.match(DRE),a=dm&&!SKIP.test(t)?anonAmt(l):null;
      if(dm&&a){const d=toD(dm[1],dm[2],dm[3]);if(!d){cur=null;continue;}
        let sg=a.sign;if(!sg&&colS!=null&&colH!=null)sg=Math.abs(a.x-colS)<Math.abs(a.x-colH)?-1:1;
        let desc=a.head.replace(/^\s*(\d{1,2}\.\d{1,2}\.(\d{2,4})?\s*){1,2}/,'').trim();
        if(!sg){unsure++;sg=/gutschrift|gehalt|lohn|eingang|zahlungseingang|erstattung|rückzahlung|zins.*haben/i.test(desc)?1:-1;}
        cur={d,b:Math.round(a.v*sg*100)/100,raw:desc};rows.push(cur);lastY=l.y;cont=0;continue;}
      if(!cur)continue;
      if(SKIP.test(t)||/^seite\s*\d|^blatt\s*\d/i.test(t)||repeated(t)||cont>=6||(lastY!=null&&lastY-l.y>Math.max(l.h,9)*2.6)){cur=null;continue;}
      cur.raw+=' | '+t.replace(DRE,'').trim();cont++;lastY=l.y;}}
  if(!rows.length)throw new Error('Im PDF wurden keine Buchungen gefunden. Klappt es mit dem CSV-Export der Bank?');
  rows.sort((a,b)=>a.d.localeCompare(b.d));const sum=rows.reduce((s,r)=>s+r.b,0);
  const check=old!=null&&neu!=null?{old,neu,ok:Math.abs(old+sum-neu)<0.01,diff:Math.round((neu-old-sum)*100)/100}:null;
  return {rows,check,unsure,noYear,end:anonEnd(pages[0].map(l=>l.t).join(' '))};}
const ANON_ACCTS=['Tills Girokonto','Tills Tagesgeld','Patricks Girokonto','Patricks Tagesgeld','Gemeinschaftskonto (Haushalt)','Gemeinsames Tagesgeld','Urlaubskonto','Anderes Konto'];
/* Eigene IBAN eines Auszugs: erste IBAN im Kopf → letzte 4 Ziffern (nur zum Zuordnen, wird nicht exportiert) */
const ANON_IBAN=/\bDE\d{2}(?:\s?\d{4}){4}\s?\d{2}\b/g;
const anonEnd=t=>{const m=String(t||'').match(ANON_IBAN);return m?m[0].replace(/\D/g,'').slice(-4):'';};
function anonArt(raw,b){const t=raw.toLowerCase();
  if(/kartenzahlung|girocard|debitk|kreditk|visa|mastercard|apple pay|google pay/.test(t))return 'Kartenzahlung';
  if(/geldautomat|bargeld|abhebung|geldausgabe|auszahlung ga/.test(t))return 'Bargeld';
  if(/dauerauftrag/.test(t))return 'Dauerauftrag';
  if(/lastschrift|einzug|mandat/.test(t))return 'Lastschrift';
  if(/gehalt|lohn|bezüge|bezuege/.test(t)&&b>0)return 'Gehalt';
  if(/zinsen|zins /.test(t))return 'Zinsen';
  if(/entgelt|gebühr|gebuehr|kontoführ|kontofuehr/.test(t))return 'Gebühr';
  if(/gutschrift|eingang/.test(t)||b>0)return 'Gutschrift';
  if(/überweisung|ueberweisung|online-banking/.test(t))return 'Überweisung';
  return '';}
function anonCat(raw,amt){const t=' '+raw.toLowerCase().replace(/\s+/g,' ')+' ';const learned=(S.anonRules||{});for(const k of Object.keys(learned)){if(t.includes(k))return learned[k];}
  if(amt>0&&/booking\.com|airbnb/.test(t))return 'Ferienwohnung';
  for(const [cat,keys] of ANON_RULES){if(keys.some(k=>t.includes(k)))return cat;}
  if(amt>0&&/gutschrift|überweisungsgutschr|ueberweisungsgutschr/.test(t))return 'Sonstiges';return 'Sonstiges';}
function anonBrand(raw){const t=' '+raw.toLowerCase().replace(/[^a-z0-9äöüß&.+]+/g,' ')+' ';/* nur ganze Wörter, sonst wird z. B. „ING“ in „Leasing“ gefunden */
  const hit=ANON_BRANDS.find(b=>{const k=b.toLowerCase().replace(/[^a-z0-9äöüß&.+]+/g,' ').trim();return new RegExp('(^|\\s)'+k.replace(/[.+&]/g,'\\$&')+'(\\s|$)').test(t)||(k.length>=5&&t.includes(' '+k));});return hit||'';}
let anonRows=[];
function anonAnalyse(){const R=anonRows;const ein=R.filter(r=>r.b>0).reduce((s,r)=>s+r.b,0),aus=R.filter(r=>r.b<0).reduce((s,r)=>s+r.b,0);
  const ohneUe=R.filter(r=>r.cat!=='Übertrag eigene Konten');const byOut={};ohneUe.filter(r=>r.b<0).forEach(r=>{byOut[r.cat]=(byOut[r.cat]||0)-r.b;});const outTot=Object.values(byOut).reduce((s,v)=>s+v,0)||1;
  const months=[...new Set(R.map(r=>r.d.slice(0,7)))].sort();const byM={};R.forEach(r=>{const m=r.d.slice(0,7);const o=byM[m]||(byM[m]={e:0,a:0});if(r.cat==='Übertrag eigene Konten')return;if(r.b>0)o.e+=r.b;else o.a+=r.b;});
  const top=[...ohneUe].filter(r=>r.b<0).sort((x,y)=>x.b-y.b).slice(0,5);
  /* wiederkehrend: gleiche Kategorie + Firma, in mind. 2 Monaten, Betrag ähnlich (±10 %) */
  const grp={};ohneUe.filter(r=>r.b<0).forEach(r=>{const k=r.cat+'|'+(r.brand||'');(grp[k]=grp[k]||[]).push(r);});
  const wied=months.length>1?Object.entries(grp).map(([k,l])=>{const ms=new Set(l.map(r=>r.d.slice(0,7)));const avg=l.reduce((s,r)=>s+r.b,0)/l.length;return {k,n:ms.size,avg,ok:ms.size>=2&&l.every(r=>Math.abs(r.b-avg)<=Math.abs(avg)*0.1+1)};}).filter(x=>x.ok&&x.k.split('|')[1]).sort((x,y)=>x.avg-y.avg):[];
  const bar=v=>`<span style="display:inline-block;height:8px;border-radius:4px;background:var(--neg,#c0392b);opacity:.7;width:${Math.max(2,Math.round(v/outTot*120))}px;vertical-align:middle;margin-right:6px"></span>`;
  return `<h3>Auswertung</h3>
  <div class="row"><span>Einnahmen</span><b class="num pos">${eur(ein)}</b></div><div class="row"><span>Ausgaben</span><b class="num neg">${eur(aus)}</b></div><div class="row"><span>Differenz</span><b class="num ${ein+aus<0?'neg':'pos'}">${eur(ein+aus)}</b></div>
  <h3>Wofür das Geld rausging <span class="muted" style="font-weight:400;font-size:12px">(ohne Überträge auf eigene Konten)</span></h3>${Object.entries(byOut).sort((x,y)=>y[1]-x[1]).map(([c,v])=>`<div class="row"><span>${bar(v)}${esc(c)}</span><b class="num">${eur(v)} <span class="muted" style="font-weight:400">${Math.round(v/outTot*100)} %</span></b></div>`).join('')||'<div class="note">Keine Ausgaben.</div>'}
  ${months.length>1?`<h3>Je Monat <span class="muted" style="font-weight:400;font-size:12px">(ohne Überträge)</span></h3><div class="tw"><table class="stab"><thead><tr><th>Monat</th><th class="r">Ein</th><th class="r">Aus</th><th class="r">Differenz</th></tr></thead><tbody>${months.map(m=>`<tr><td>${m.slice(5)}/${m.slice(0,4)}</td><td class="r num pos">${eur(byM[m].e)}</td><td class="r num neg">${eur(byM[m].a)}</td><td class="r num ${byM[m].e+byM[m].a<0?'neg':'pos'}">${eur(byM[m].e+byM[m].a)}</td></tr>`).join('')}</tbody></table></div>`:''}
  ${top.length?`<h3>Größte Einzelausgaben</h3>${top.map(r=>`<div class="row"><span>${dDE(r.d)} · ${esc(r.cat)}${r.brand?' · '+esc(r.brand):''}</span><b class="num neg">${eur(r.b)}</b></div>`).join('')}`:''}
  ${wied.length?`<h3>Wiederkehrende Zahlungen</h3>${wied.map(x=>`<div class="row"><span>${esc(x.k.split('|')[1])} <span class="muted">(${esc(x.k.split('|')[0])}, in ${x.n} Monaten)</span></span><b class="num neg">≈ ${eur(x.avg)}</b></div>`).join('')}`:''}`;}
function anonRender(){const el=$('#an-out');if(!anonRows.length){el.innerHTML='';return;}
  const unk=anonRows.filter(r=>r.cat==='Sonstiges').length;
  const opts=c=>ANON_CATS.map(x=>`<option ${x===c?'selected':''}>${x}</option>`).join('');
  const files=anonGroups().map(o=>{const bad=o.chk.filter(f=>!f.check.ok);return `<div class="row" style="flex-wrap:wrap;gap:6px"><span style="min-width:0">${o.end?`Konto …${esc(o.end)}`:esc(o.files[0].n)} <span class="muted">(${o.files.length} Auszug${o.files.length>1?'e':''}, ${o.k} Buchungen)</span></span><select data-anacct="${esc(o.key)}"><option value="">– welches Konto? –</option>${ANON_ACCTS.map(a=>`<option ${a===o.acct?'selected':''}>${a}</option>`).join('')}</select></div><div class="note" style="margin-top:0">${o.chk.length?(bad.length?`<b class="neg">Kontostand passt bei ${bad.length} Auszug/Auszügen nicht</b>: ${bad.map(f=>esc(f.n)).join(', ')} – dort fehlt evtl. eine Buchung.`:`<b class="pos">Vollständig</b> – Kontostand passt bei ${o.ok>1?'allen '+o.ok+' Auszügen':'dem Auszug'}.`):'Kontostand im Auszug nicht gefunden – keine Vollständigkeits-Kontrolle möglich.'}</div>`;}).join('');
  el.innerHTML=`<div class="note"><b>${anonRows.length} Buchungen</b> von ${dDE(anonRows[0].d)} bis ${dDE(anonRows.at(-1).d)}. Bitte je Konto angeben, welches es ist (die App merkt sich das). Umbuchungen zwischen diesen Konten werden automatisch als „Übertrag eigene Konten“ markiert.</div>${files}
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><button type="button" class="btn" id="an-dl">Datei für Claude speichern</button><button type="button" class="btn sec" id="an-copy">Text kopieren</button><button type="button" class="btn sec" id="an-clear">Verwerfen</button></div>
  <div class="note" id="an-msg" style="margin-top:6px">Die Datei dann im Claude-Chat hochladen (oder den kopierten Text einfügen) und Fragen stellen. Enthalten sind nur Datum, Konto, Betrag, Art, Kategorie und Firmenname.</div>
  <details ${unk?'open':''} style="margin-top:8px"><summary><b>Buchungen prüfen</b>${unk?` – <span class="neg">${unk} ohne Kategorie</span>, bitte zuordnen (die App merkt es sich)`:''}</summary>
  <div class="tw"><table class="stab"><thead><tr><th>Datum</th><th class="r">Betrag</th><th>Kategorie</th><th>Händler</th><th>Original (bleibt hier)</th></tr></thead><tbody>${anonRows.map((r,i)=>`<tr class="${r.cat==='Sonstiges'?'warnrow':''}"><td>${dDE(r.d)}</td><td class="r num ${r.b<0?'neg':'pos'}">${eur(r.b)}</td><td><select data-ani="${i}">${opts(r.cat)}</select></td><td><input data-anb="${i}" value="${esc(r.brand)}" placeholder="–" style="width:110px" title="Nur Firmenname, kein Personenname"></td><td class="muted" style="font-size:11px;max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(r.raw)}">${esc(r.raw)}</td></tr>`).join('')}</tbody></table></div></details>
  <details style="margin-top:6px"><summary><b>Kurze Auswertung</b></summary>${anonAnalyse()}</details>`;}
function anonAcctName(key){const x=anonInfo.find(i=>i.key===key)||{};if(!x.acct)return x.end?`Konto …${x.end}`:'Konto';const dup=new Set(anonInfo.filter(i=>i.acct===x.acct).map(i=>i.key)).size>1;return dup&&x.end?`${x.acct} (…${x.end})`:x.acct;}
function anonGroups(){const g={};anonInfo.forEach((x,i)=>{const o=g[x.key]||(g[x.key]={key:x.key,end:x.end,files:[],acct:x.acct});o.files.push({...x,i});});return Object.values(g).map(o=>{o.files.sort((a,b)=>(a.d0||'').localeCompare(b.d0||''));const rr=anonRows.filter(r=>anonInfo[r.f].key===o.key);o.k=rr.length;o.sum=rr.reduce((s,r)=>s+r.b,0);o.chk=o.files.filter(f=>f.check);o.ok=o.chk.filter(f=>f.check.ok).length;return o;});}
function anonExport(){const R=anonRows;const d1=R[0].d,d2=R.at(-1).d;const fmt=v=>v.toFixed(2).replace('.',',')+' €';
  const L=['# Kontoauszug (anonymisiert) – aus dem Haushaltsbuch Till & Patrick',`Zeitraum: ${dDE(d1)} bis ${dDE(d2)}, ${R.length} Buchungen`,
    'Hinweis: Namen, IBANs, Verwendungszwecke und Referenzen sind entfernt. Negative Beträge = Ausgaben, positive = Eingänge. Kategorie automatisch bzw. von Hand zugeordnet; „Übertrag eigene Konten“ ist Geld zwischen unseren eigenen Konten (keine echte Ausgabe).','','## Konten'];
  anonGroups().forEach(o=>{const a=o.chk[0],z=o.chk.at(-1);
    L.push(`- ${anonAcctName(o.key)}: ${o.files.length} ${o.files.length>1?'Auszüge':'Auszug'}, ${o.k} Buchungen, Summe ${fmt(o.sum)}${a?`, Kontostand am Anfang ${fmt(a.check.old)}, am Ende ${fmt(z.check.neu)}; Kontostand-Kontrolle: ${o.ok} von ${o.files.length} vollständig`:''}`);});
  const sums={};R.forEach(r=>{const k=r.cat;sums[k]=(sums[k]||0)+r.b;});
  L.push('','## Summen je Kategorie',...Object.entries(sums).sort((x,y)=>x[1]-y[1]).map(([c,v])=>`- ${c}: ${fmt(v)}`));
  L.push('','## Buchungen (CSV)','Datum;Konto;Betrag;Art;Kategorie;Haendler');
  R.forEach(r=>L.push(`${r.d};${anonAcctName(anonInfo[r.f].key)};${r.b.toFixed(2)};${anonArt(r.raw,r.b)};${r.cat};${(r.brand||'').replace(/[;\n]/g,' ')}`));
  const out=L.join('\n');
  /* Sicherheitsnetz: nichts exportieren, was wie IBAN, lange Zahl oder E-Mail aussieht */
  if(/[A-Z]{2}\d{2}[A-Z0-9]{10,}|\d{8,}|@/.test(out))throw new Error('Im Ergebnis steckt noch etwas, das wie eine Konto- oder Referenznummer aussieht. Bitte die Händler-Spalte prüfen.');return out;}
let anonInfo=[];
$('#an-file').onchange=async e=>{const fs=[...e.target.files];e.target.value='';if(!fs.length)return;const msg=$('#an-status');msg.textContent='Wird gelesen …';
  const got=[],info=[],errs=[];
  for(const f of fs){try{const buf=await f.arrayBuffer();const head=new Uint8Array(buf.slice(0,5));const isPdf=/\.pdf$/i.test(f.name)||String.fromCharCode(...head)==='%PDF-';
      if(isPdf){const r=anonParsePdf(await anonPdfPages(buf));got.push(...r.rows.map(x=>({...x,f:info.length})));info.push({n:f.name,k:r.rows.length,check:r.check,unsure:r.unsure,noYear:r.noYear,end:r.end,d0:r.rows[0].d});}
      else{let txt;try{txt=new TextDecoder('utf-8',{fatal:true}).decode(buf);}catch(_){txt=new TextDecoder('windows-1252').decode(buf);}const rows=anonParse(txt);got.push(...rows.map(x=>({...x,f:info.length})));info.push({n:f.name,k:rows.length,end:anonEnd(txt.split(/\r?\n/).slice(0,12).join(' ')),d0:rows[0].d});}}
    catch(err){errs.push(`${f.name}: ${err.message||err}`);}}
  /* doppelte Buchungen (z. B. überlappende Auszüge) nur einmal */
  const seen=new Set(),rows=got.filter(r=>{const k=r.d+'|'+r.b+'|'+r.raw;if(seen.has(k))return false;seen.add(k);return true;}).sort((a,b)=>a.d.localeCompare(b.d));
  anonInfo=info.map((x,i)=>({...x,key:x.end||('d'+i)}));anonInfo.forEach(x=>{x.acct=(x.end&&(S.anonKonten||{})[x.end])||'';});
  const own=new Set(anonInfo.map(x=>x.end).filter(Boolean));
  anonRows=rows.map(r=>{const me=anonInfo[r.f].end;const other=(r.raw.match(ANON_IBAN)||[]).map(i=>i.replace(/\D/g,'').slice(-4)).some(e=>own.has(e)&&e!==me);
    return {...r,cat:other?'Übertrag eigene Konten':anonCat(r.raw,r.b),brand:other?'':anonBrand(r.raw)};});
  msg.textContent=errs.length?(rows.length?'Nicht alles geklappt – ':'Das klappt so nicht: ')+errs.join(' · '):'';anonRender();};
$('#an-out').addEventListener('change',e=>{const i=e.target.dataset.ani;if(i!=null){const r=anonRows[+i];r.cat=e.target.value;
    /* Zuordnung merken: erstes aussagekräftiges Wort des Originals → Kategorie (nur in eurer Datenbank, nicht im Export) */
    const freq={};anonRows.forEach(x=>{new Set(x.raw.toLowerCase().match(/[a-zäöüß][a-zäöüß.&-]{3,}/g)||[]).forEach(y=>{freq[y]=(freq[y]||0)+1;});});const common=y=>freq[y]>Math.max(2,anonRows.length*0.3);
    const w=(r.raw.toLowerCase().match(/[a-zäöüß][a-zäöüß.&-]{3,}/g)||[]).filter(x=>!common(x)).filter(x=>!['sepa','lastschrift','ueberweisung','überweisung','gutschrift','kartenzahlung','girocard','mandat','mandatsref','glaeubiger','gläubiger','ende-zu-ende','ref.','debitk','kreditk','online','datum','verwendungszweck','gmbh','e.v.','mbh'].includes(x)).sort((a,b)=>b.length-a.length)[0];
    if(w&&r.cat!=='Sonstiges'){const d={...(S.anonRules||{}),[w]:r.cat};S.anonRules=d;save('config/anonregeln',d);anonRows.forEach(x=>{if(x.cat==='Sonstiges'&&(' '+x.raw.toLowerCase()+' ').includes(w))x.cat=r.cat;});}
    anonRender();return;}
  const ac=e.target.dataset.anacct;if(ac!=null){const v=e.target.value;anonInfo.forEach(x=>{if(x.key===ac)x.acct=v;});const end=(anonInfo.find(x=>x.key===ac)||{}).end;if(end){const d={...(S.anonKonten||{}),[end]:v};S.anonKonten=d;save('config/anonkonten',d);}return;}
  const j=e.target.dataset.anb;if(j!=null){anonRows[+j].brand=e.target.value.trim();}});
$('#an-out').addEventListener('click',async e=>{const msg=$('#an-msg');if(!msg)return;
  if(e.target.id==='an-clear'){anonRows=[];anonInfo=[];anonRender();return;}
  if(e.target.id==='an-copy'){try{const out=anonExport();await navigator.clipboard.writeText(out);msg.innerHTML='<b class="pos">Kopiert.</b> Jetzt im Claude-Chat einfügen und deine Frage dazuschreiben.';}catch(err){msg.textContent=err.message||'Kopieren hat nicht geklappt.';}}
  if(e.target.id==='an-dl'){try{const out=anonExport();const m1=anonRows[0].d.slice(0,7),m2=anonRows.at(-1).d.slice(0,7);const fn=`Kontoauszug-anonym-${m1}${m2!==m1?'-bis-'+m2:''}.txt`;const blob=new Blob([out],{type:'text/plain;charset=utf-8'});if(dlFn){await dlFn.save({filename:fn,data:blob});}else{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=fn;a.click();}msg.innerHTML=`<b class="pos">Gespeichert: ${esc(fn)}</b> – jetzt im Claude-Chat hochladen und fragen.`;}catch(err){msg.textContent=err.message||'Speichern hat nicht geklappt.';}}});

window.__anonExport=()=>anonExport();
