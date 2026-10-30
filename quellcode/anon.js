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
  if(cDate<0||cAmt<0)throw new Error('Spalten für Datum und Betrag nicht gefunden. Erwartet wird ein CSV-Export deiner Bank.');
  const toNum=s=>{s=String(s||'').replace(/\s|€|EUR/g,'');if(!s)return null;if(/,\d{1,2}$/.test(s))s=s.replace(/\./g,'').replace(',','.');else if(/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s))s=s.replace(/,/g,'');const v=Number(s);return isFinite(v)?v:null;};
  const toDate=s=>{s=String(s||'').trim();let m=s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);if(m)return `${m[3].length===2?'20'+m[3]:m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);if(m)return m[0];return null;};
  const rows=[];for(let i=hi+1;i<lines.length;i++){const f=split(lines[i],d);if(f.length<3)continue;const dt=toDate(f[cDate]);let amt=toNum(f[cAmt]);if(dt==null||amt==null)continue;
    if(cSH>=0&&/^s/i.test(f[cSH]||''))amt=-Math.abs(amt);else if(cSH>=0&&/^h/i.test(f[cSH]||''))amt=Math.abs(amt);
    const who=cWhos.map(i=>f[i]).filter(Boolean).join(' / ');const txt=cTxt>=0?f[cTxt]:'';const typ=cTyp>=0&&cTyp!==cTxt?f[cTyp]:'';rows.push({d:dt,b:Math.round(amt*100)/100,raw:[who,txt,typ].filter(Boolean).join(' | ')});}
  if(!rows.length)throw new Error('Keine Buchungen erkannt. Ist es ein CSV-Export (nicht PDF)?');
  rows.sort((a,b)=>a.d.localeCompare(b.d));return rows;}
function anonCat(raw,amt){const t=' '+raw.toLowerCase().replace(/\s+/g,' ')+' ';const learned=(S.anonRules||{});for(const k of Object.keys(learned)){if(t.includes(k))return learned[k];}
  for(const [cat,keys] of ANON_RULES){if(keys.some(k=>t.includes(k)))return cat;}
  if(amt>0&&/gutschrift|überweisungsgutschr|ueberweisungsgutschr/.test(t))return 'Sonstiges';return 'Sonstiges';}
function anonBrand(raw){const t=raw.toLowerCase();const hit=ANON_BRANDS.find(b=>t.includes(b.toLowerCase()));return hit||'';}
let anonRows=[];
function anonRender(){const el=$('#an-out');if(!anonRows.length){el.innerHTML='';return;}
  const by={};anonRows.forEach(r=>{by[r.cat]=(by[r.cat]||0)+r.b;});const unk=anonRows.filter(r=>r.cat==='Sonstiges').length;
  const opts=c=>ANON_CATS.map(x=>`<option ${x===c?'selected':''}>${x}</option>`).join('');
  el.innerHTML=`<div class="note">${anonRows.length} Buchungen von ${dDE(anonRows[0].d)} bis ${dDE(anonRows.at(-1).d)} erkannt${unk?`, davon <b>${unk}</b> ohne Kategorie („Sonstiges“) – unten zuordnen, damit die Auswertung etwas taugt`:''}. Die Spalte „Original“ siehst nur du; sie wird <b>nicht</b> exportiert.</div>
  <div class="tw"><table class="stab"><thead><tr><th>Datum</th><th class="r">Betrag</th><th>Kategorie</th><th>Händler</th><th>Original (bleibt hier)</th></tr></thead><tbody>${anonRows.map((r,i)=>`<tr class="${r.cat==='Sonstiges'?'warnrow':''}"><td>${dDE(r.d)}</td><td class="r num ${r.b<0?'neg':'pos'}">${eur(r.b)}</td><td><select data-ani="${i}">${opts(r.cat)}</select></td><td><input data-anb="${i}" value="${esc(r.brand)}" placeholder="–" style="width:110px" title="Nur Firmenname, kein Personenname"></td><td class="muted" style="font-size:11px;max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(r.raw)}">${esc(r.raw)}</td></tr>`).join('')}</tbody></table></div>
  <h3>Summen je Kategorie</h3>${Object.entries(by).sort((a,b)=>a[1]-b[1]).map(([c,v])=>`<div class="row"><span>${esc(c)}</span><b class="num ${v<0?'neg':'pos'}">${eur(v)}</b></div>`).join('')}
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><button type="button" class="btn" id="an-copy">Anonymisierten Text kopieren</button><button type="button" class="btn sec" id="an-dl">Als Datei speichern</button><button type="button" class="btn sec" id="an-clear">Verwerfen</button></div>
  <div class="note" id="an-msg" style="margin-top:6px"></div>`;}
function anonExport(){const L=['Datum;Betrag;Kategorie;Haendler'];anonRows.forEach(r=>L.push(`${r.d};${r.b.toFixed(2)};${r.cat};${(r.brand||'').replace(/[;\n]/g,' ')}`));const out=L.join('\n');
  /* Sicherheitsnetz: nichts exportieren, was wie IBAN, lange Zahl oder E-Mail aussieht */
  if(/[A-Z]{2}\d{2}[A-Z0-9]{10,}|\d{8,}|@/.test(out.replace(/^Datum.*$/m,'')))throw new Error('Im Ergebnis steckt noch etwas, das wie eine Konto- oder Referenznummer aussieht. Bitte die Händler-Spalte prüfen.');return out;}
$('#an-file').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;const msg=$('#an-status');
  try{let txt;const buf=await f.arrayBuffer();try{txt=new TextDecoder('utf-8',{fatal:true}).decode(buf);}catch(_){txt=new TextDecoder('windows-1252').decode(buf);}
    const rows=anonParse(txt);anonRows=rows.map(r=>({...r,cat:anonCat(r.raw,r.b),brand:anonBrand(r.raw)}));msg.textContent='';anonRender();}
  catch(err){msg.textContent='Das klappt so nicht: '+(err.message||err);anonRows=[];anonRender();}};
$('#an-out').addEventListener('change',e=>{const i=e.target.dataset.ani;if(i!=null){const r=anonRows[+i];r.cat=e.target.value;
    /* Zuordnung merken: erstes aussagekräftiges Wort des Originals → Kategorie (nur in eurer Datenbank, nicht im Export) */
    const freq={};anonRows.forEach(x=>{new Set(x.raw.toLowerCase().match(/[a-zäöüß][a-zäöüß.&-]{3,}/g)||[]).forEach(y=>{freq[y]=(freq[y]||0)+1;});});const common=y=>freq[y]>Math.max(2,anonRows.length*0.3);
    const w=(r.raw.toLowerCase().match(/[a-zäöüß][a-zäöüß.&-]{3,}/g)||[]).filter(x=>!common(x)).filter(x=>!['sepa','lastschrift','ueberweisung','überweisung','gutschrift','kartenzahlung','girocard','mandat','mandatsref','glaeubiger','gläubiger','ende-zu-ende','ref.','debitk','kreditk','online','datum','verwendungszweck','gmbh','e.v.','mbh'].includes(x)).sort((a,b)=>b.length-a.length)[0];
    if(w&&r.cat!=='Sonstiges'){const d={...(S.anonRules||{}),[w]:r.cat};S.anonRules=d;save('config/anonregeln',d);anonRows.forEach(x=>{if(x.cat==='Sonstiges'&&(' '+x.raw.toLowerCase()+' ').includes(w))x.cat=r.cat;});}
    anonRender();return;}
  const j=e.target.dataset.anb;if(j!=null){anonRows[+j].brand=e.target.value.trim();}});
$('#an-out').addEventListener('click',async e=>{const msg=$('#an-msg');if(!msg)return;
  if(e.target.id==='an-clear'){anonRows=[];anonRender();return;}
  if(e.target.id==='an-copy'){try{const out=anonExport();await navigator.clipboard.writeText(out);msg.innerHTML='<b class="pos">Kopiert.</b> Jetzt im Chat einfügen – es sind nur Datum, Betrag, Kategorie und ggf. Firmenname enthalten.';}catch(err){msg.textContent=err.message||'Kopieren hat nicht geklappt.';}}
  if(e.target.id==='an-dl'){try{const out=anonExport();const fn=`Kontoauszug-anonym-${anonRows[0].d.slice(0,7)}.csv`;const blob=new Blob(['﻿'+out],{type:'text/csv'});if(dlFn){await dlFn.save({filename:fn,data:blob});}else{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=fn;a.click();}msg.innerHTML=`<b class="pos">Gespeichert: ${esc(fn)}</b>`;}catch(err){msg.textContent=err.message||'Speichern hat nicht geklappt.';}}});

window.__anonExport=()=>anonExport();
