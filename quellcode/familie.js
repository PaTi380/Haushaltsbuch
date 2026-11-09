/* ---------- Familiendarlehen: Schritt-für-Schritt-Rechner (Reiter „Familie“) ----------
   Eingaben liegen in S.familie (Firestore config/familie). Rechnet mit den Live-Daten der App:
   Sparda-Tilgungsplan sparda(), ING ingRows(), Bausparvertrag, Tagesgeld/Gold aus CALC.
   Es wird nichts an Plänen oder Krediten verändert. */
const FDEF={erloes:175000,darlehen:155000,geld:'2033-10',geldArt:'kuend',zins:2,rate:1000,rateAb:'abl',sonderKorr:0,bausparAuf:true,ek:30000,ingFirst:true,bankZins:4,pflicht:500,zahlung:1150,
  geb:'1964-04',gehalt:1277,renteBrutto:1018,renteArt:'regel',stop:'',step:0};
const F=()=>({...FDEF,...(S.familie||{})});
const FSTEPS=['Geld','Petra','Tilgung','Eigenkapital','Bank','Rente','Ergebnis'];
const KUEND='2033-10'; // frühester Monat, zu dem die Sparda nach § 489 BGB (10 Jahre nach Vollauszahlung April 2023 + 6 Monate) gekündigt werden kann
const fYmIn=(id,v)=>{const m=normYm(v);return `<input type="month" id="${id}" value="${m||''}" min="2026-01" max="2053-03">`;};
const fNum=(id,v,unit,w=110)=>`<span class="fin"><input inputmode="decimal" id="${id}" value="${num(v,unit==='%'?2:0)}" style="width:${w}px">${unit?`<span>${unit}</span>`:''}</span>`;

/* Rentenbeginn: Regelaltersgrenze 67 (Jahrgang 1964) = Geburtsmonat + 67 Jahre, Rente ab dem Folgemonat.
   Früher (63/64/65) nur mit Abschlag 0,3 % je Monat (max. 14,4 %). */
function fRente(f){const g=normYm(f.geb)||'1964-04';const regel=ymAdd(g,67*12+1);const alter={regel:67,'65':65,'64':64,'63':63}[f.renteArt]??67;const ab=ymAdd(g,alter*12+1);
  const mon=Math.max(0,(67-alter)*12);const absch=Math.min(14.4,mon*0.3);const brutto=(+f.renteBrutto||0)*(1-absch/100);
  return {ab,regel,absch,brutto:r2(brutto),netto:r2(brutto*0.885),mon};}

/* Ablösemonat: Geld vor Oktober 2033 → Kündigung zum frühesten Termin (Okt 2033). Geld später → 6 Monate Kündigungsfrist. */
function fAbl(f){const g=normYm(f.geld)||KUEND;return g<=KUEND?KUEND:ymAdd(g,6);}

/* Tranchen bei früherem Verkauf: erst ING ablösen, dann je Jahr bis 17.250 € Sondertilgung Sparda (abzüglich schon geplanter), Rest zur Ablösung. */
function fTranchen(f,abl){const g=normYm(f.geld)||KUEND;const out=[];if(g>=KUEND)return out;let frei=+f.darlehen||0;
  const ing=ingRows();const ir=ing.find(r=>r.ym===g);const ingRest=ir?ir.st:(ing.length&&g<ing[0].ym?+K().ing.betrag:0);
  if(ingRest>0.5){const b=Math.min(frei,ingRest);out.push({ym:g,b:r2(b),was:'ING-Kredit komplett abgelöst'});frei-=b;}
  const max=+K().sparda.sonderMax||17250;const ps=planSonder();const byY={};ps.forEach(x=>{byY[x.ym.slice(0,4)]=(byY[x.ym.slice(0,4)]||0)+x.b;});
  for(let y=+g.slice(0,4);y<+abl.slice(0,4)&&frei>0.5;y++){const ym=`${y}-12`;if(ym<=g||ym>=abl)continue;const b=Math.min(frei,Math.max(0,max-(byY[y]||0)));if(b>0.5){out.push({ym,b:r2(b),was:'Sondertilgung Sparda (Jahresgrenze '+eur(max,0)+')'});frei-=b;}}
  return out;}

/* Sparda-Verlauf mit Tranchen, ohne das alte „Mutter übernimmt“-Szenario und ohne automatische Bauspar-Sondertilgung */
function fSparda(f,abl,tr){const d=structuredClone(K());d.sparda.szenario={aktiv:false};d.bauspar.alsSonder=false;d.sparda.sonder=[...(d.sparda.sonder||[]),...tr.filter(t=>/Sparda/.test(t.was)).map(t=>({ym:t.ym,b:t.b}))];
  const keep=S.kredit;S.kredit=d;try{return sparda(true);}finally{S.kredit=keep;}}
function fBauspar(abl){const b=K().bauspar;if(!b.summe)return 0;let s=+b.saldo||0,ym=normYm(b.stand)||CUR;let n=0;while(ym<abl&&n<400){ym=ymAdd(ym,1);s+=+b.monat||0;n++;}return r2(s);}
function fEkAuto(abl){const c=CALC?.[abl]||CALC?.[Object.keys(CALC||{}).sort().at(-1)];if(!c)return 0;return r2(Math.max(0,c.TILL.tg)+Math.max(0,c.PATRICK.tg)+(c.TILL.gold||0));}

function fCalc(f){
  const abl=fAbl(f);const geld=normYm(f.geld)||KUEND;const tr=fTranchen(f,abl);const rows=fSparda(f,abl,tr);
  const sumZi=(r,a,b)=>r.filter(x=>x.ym>a&&(!b||x.ym<=b)).reduce((s,x)=>s+x.zi,0);
  const at=rows.find(r=>r.ym===abl);const rest0=at?at.st:(rows.length&&abl<rows[0].ym?+K().sparda.stand:0);
  const sonderBis=rows.filter(r=>r.ym<=abl).reduce((s,r)=>s+r.so,0);
  const sonderOffen=(()=>{if(abl.endsWith('-12'))return 0;let v=0;for(let ym=abl.slice(0,4)+'-01';ym<=abl;ym=ymAdd(ym,1)){useYm(ym);['TILL','PATRICK'].forEach(sh=>{const b=S.plan[ym]?.[sh];(b?.C||[]).forEach(e=>{if(/sonde?r?tilgung/i.test(e.l||''))v+=entryVal(e,b,sh);});});}useYm(month);return r2(v);})();
  const rest=Math.max(0,r2(rest0-sonderOffen-(+f.sonderKorr||0)));
  const bs=f.bausparAuf?fBauspar(abl):0;
  const ingAll=ingRows();const ingTr=tr.find(t=>/ING/.test(t.was));const ir=ingAll.find(r=>r.ym===abl);let ingRest=ingTr?0:(ir?ir.st:(ingAll.length&&abl<ingAll[0].ym?+K().ing.betrag:0));ingRest=r2(ingRest);
  // Geld kommt früher und löst den ING ab: die gesparte ING-Rate (bis zur Ablösung) abzüglich der Zinsen an Petra kommt als Eigenkapital dazu
  const ingFreiMon=ingTr?ingAll.filter(r=>r.ym>ingTr.ym&&r.ym<=abl).length:0;
  const ek=(f.ek==null||f.ek===''?fEkAuto(abl):+f.ek);
  const ekIng=f.ingFirst?Math.min(ek,ingRest):0;const ekSp=ek-ekIng;const ingBleibt=r2(ingRest-ekIng);
  const trSum=tr.reduce((s,t)=>s+t.b,0);const petraAbl=Math.max(0,(+f.darlehen||0)-trSum); // was zur Ablösung noch von Petra kommt
  let bankRest=0,uebrig=0,extraEk=0;
  // Petra: Darlehen (Tranchen + Rest zur Ablösung), Rate ab dem Monat nach der ersten Auszahlung
  const pStart=tr.length?tr[0].ym:abl;let pBal=0;const pRows=[];{let ym=pStart;const z=(+f.zins||0)/100;const rate=+f.rate||0;let n=0;const trs=[...tr,{ym:abl,b:petraAbl}];
    while(n<600){trs.filter(t=>t.ym===ym).forEach(t=>{pBal=r2(pBal+t.b);});if(n>0){const zi=r2(pBal*z/12);const nurZins=f.rateAb!=='sofort'&&ym<=abl;const tg=nurZins?0:Math.min(Math.max(0,rate-zi),pBal);pBal=r2(pBal-tg);pRows.push({ym,zi,tg,st:pBal,nurZins});}
      if(n>0&&ym>=abl&&pBal<=0.005)break;ym=ymAdd(ym,1);n++;}}
  const pZins=pRows.reduce((s,r)=>s+r.zi,0);
  {const vz=pRows.filter(r=>r.nurZins).reduce((a,r)=>a+r.zi,0);extraEk=ingTr?r2(Math.max(0,ingFreiMon*(+K().ing.rate||0)-vz)):0;bankRest=r2(rest-bs-petraAbl-ekSp-extraEk);if(bankRest<0){uebrig=-bankRest;bankRest=0;}}const rateStart=f.rateAb!=='sofort'||!tr.length?ymAdd(abl,1):ymAdd(pStart,1);const vorZins=pRows.filter(r=>r.nurZins).map(r=>r.zi);const pEnde=pRows.at(-1)?.ym;const pOk=(+f.rate||0)>(+f.darlehen||0)*(+f.zins||0)/100/12;
  // Bankrest: Pflichtrate und geplante Zahlung
  const start=ymAdd(abl,1);const bz=+f.bankZins||0;
  const bPf=bankRest>0?annuity(bankRest,bz,start,Math.max(+f.pflicht||0,bankRest*bz/100/12+1),[]):[];
  const bZa=bankRest>0?annuity(bankRest,bz,start,Math.max(+f.zahlung||0,bankRest*bz/100/12+1),[]):[];
  const zi=r=>r.reduce((s,x)=>s+x.zi,0);
  // Vergleich: ohne Petra einfach weiter bei der Sparda (mit allen geplanten Sondertilgungen, Bauspar als Sondertilgung bei Zuteilung falls so eingestellt)
  const ohne=(()=>{const d=structuredClone(K());d.sparda.szenario={aktiv:false};const keep=S.kredit;S.kredit=d;try{return sparda(true);}finally{S.kredit=keep;}})();
  const ohneEnde=ohne.at(-1)?.ym;const ohneZins=sumZi(ohne,abl);
  const mitZins=pZins+zi(bZa);
  const sparZinsBis=sumZi(sparda(true),TODAY.slice(0,7),abl)-sumZi(rows,TODAY.slice(0,7),abl); // Zinsersparnis durch frühe Tranchen bis zur Ablösung
  const rente=fRente(f);const stop=normYm(f.stop)||ymAdd(rente.ab,-1); // letzter Arbeitsmonat
  const lueckeMon=Math.max(0,(+rente.ab.slice(0,4)-+stop.slice(0,4))*12+(+rente.ab.slice(5)-+stop.slice(5))-1);
  const lueckeKosten=r2(Math.max(0,lueckeMon*((+f.gehalt||0)-(ymAdd(stop,1)>=rateStart?(+f.rate||0):0))));
  // Belastung vorher / nachher
  const vorher=(+K().sparda.rate||0)+(+K().ing.rate||0)+(+K().bauspar.monat||0);
  const nachherPf=(+f.rate||0)+(bankRest>0?Math.max(+f.pflicht||0,0):0)+(ingBleibt>0?(+K().ing.rate||0):0);
  const nachherZa=(+f.rate||0)+(bankRest>0?+f.zahlung||0:0)+(ingBleibt>0?(+K().ing.rate||0):0);
  return {abl,geld,tr,trSum,rows,rest0,rest,sonderBis,sonderOffen,bs,ingRest,ingBleibt,ek,ekIng,ekSp,extraEk,ingFreiMon,petraAbl,bankRest,uebrig,pRows,pZins,pEnde,pStart,rateStart,vorZins,pOk,bPf,bZa,bZiPf:zi(bPf),bZiZa:zi(bZa),ohne,ohneEnde,ohneZins,mitZins,sparZinsBis,rente,stop,lueckeMon,lueckeKosten,vorher,nachherPf,nachherZa};}

function fSet(mut){const d={...F()};mut(d);S.familie=d;save('config/familie',d);render();}
const fRow=(l,v,cls='')=>`<div class="row"><span>${l}</span><b class="num ${cls}">${v}</b></div>`;
const fMon=n=>`${n} Monate (${num(n/12,1)} Jahre)`;

function rFamilie(){
  const f=F();const c=fCalc(f);const step=Math.min(FSTEPS.length-1,Math.max(0,+f.step||0));const el=$('#fam');if(!el)return;if(el.contains(document.activeElement))return;
  const nav=`<div class="fsteps">${FSTEPS.map((s,i)=>`<button type="button" data-fstep="${i}" class="${i===step?'on':i<step?'done':''}"><i>${i+1}</i>${s}</button>`).join('')}</div>`;
  const btns=(ok=true)=>`<div class="fnav">${step>0?`<button type="button" class="btn sec" data-fstep="${step-1}">← Zurück</button>`:'<span></span>'}${step<FSTEPS.length-1?`<button type="button" class="btn" data-fstep="${step+1}" ${ok?'':'disabled'}>Weiter →</button>`:`<button type="button" class="btn sec" data-fstep="0">Nochmal von vorn</button>`}</div>`;
  let h='';
  if(step===0){h=`<div class="card"><h2>1 · Wann steht das Geld zur Verfügung?</h2>
    <p class="sub">Das Haus der Oma wird voraussichtlich erst nach ihrem Tod verkauft. Die Sparda kann frühestens zum <b>${ymName(KUEND)}</b> gekündigt werden (10 Jahre nach der Auszahlung im April 2023, 6 Monate Frist, ohne Vorfälligkeitsentschädigung).</p>
    <div class="seg fseg"><button type="button" data-fgeld="kuend" ${f.geldArt==='kuend'?'aria-pressed="true"':''}>Noch unbekannt / passend zur Kündigung (Okt 2033)</button><button type="button" data-fgeld="frueh" ${f.geldArt==='frueh'?'aria-pressed="true"':''}>Früher</button><button type="button" data-fgeld="spaet" ${f.geldArt==='spaet'?'aria-pressed="true"':''}>Später</button></div>
    ${f.geldArt!=='kuend'?`<div class="form" style="margin-top:10px"><label>Monat, in dem das Geld da ist ${fYmIn('f-geld',f.geld)}</label></div>`:''}
    <div class="form" style="margin-top:10px"><label>Petras Anteil am Verkaufserlös (geschätzt) ${fNum('f-erloes',f.erloes,'€')}</label><label>davon als Darlehen an euch ${fNum('f-darlehen',f.darlehen,'€')}</label></div>
    <div class="note">Bei Petra bleiben dann <b>${eur(Math.max(0,(+f.erloes||0)-(+f.darlehen||0)),0)}</b> als eigene Reserve (Notgroschen, Zahnarzt, Auto, Überbrückung bis zur Rente).</div>
    ${c.geld<KUEND?`<div class="mu-box"><b>Geld kommt früher (${ymName(c.geld)}):</b> Eine komplette Ablösung vor ${ymName(KUEND)} kostet Vorfälligkeitsentschädigung (geschätzt 15–20 Tsd. €) – lohnt nicht. Stattdessen in Tranchen: ${c.tr.length?c.tr.map(t=>`${ymName(t.ym)}: ${eur(t.b,0)} (${t.was})`).join('; '):'–'}; der Rest (${eur(c.petraAbl,0)}) zur Ablösung ${ymName(c.abl)}. Zinsersparnis bei der Sparda bis dahin ca. <b>${eur(c.sparZinsBis,0)}</b>; dazu fällt die ING-Rate (${eur(K().ing.rate,0)}) weg – dieses Geld rechnet der Rechner zur Ablösung als zusätzliches Eigenkapital.</div>`:c.geld>KUEND?`<div class="mu-box">Geld erst ${ymName(c.geld)} → Kündigung dann aussprechen, Ablösung nach 6 Monaten Frist im <b>${ymName(c.abl)}</b>. Bis dahin läuft alles weiter wie bisher.</div>`:''}
    </div>`+btns();}
  else if(step===1){h=`<div class="card"><h2>2 · Konditionen für Petra</h2>
    <p class="sub">Petra soll jeden Monat verlässlich ihren Betrag bekommen. Zins zwischen 2 und 2,5 % ist marktnah und glaubwürdig (Sozialamt/Finanzamt); unter 1 % wäre angreifbar als Teil-Schenkung.</p>
    <div class="form"><label>Zins pro Jahr ${fNum('f-zins',f.zins,'%',80)}</label><label>Rate an Petra pro Monat ${fNum('f-rate',f.rate,'€',90)}</label></div>
    ${c.tr.length?`<h3>Wenn das Geld früher kommt</h3><div class="seg fseg"><button type="button" data-frateab="abl" ${f.rateAb!=='sofort'?'aria-pressed="true"':''}>Rate erst ab Ablösung, vorher nur Zinsen</button><button type="button" data-frateab="sofort" ${f.rateAb==='sofort'?'aria-pressed="true"':''}>Rate sofort ab der ersten Tranche</button></div><div class="note">${f.rateAb==='sofort'?'Petra bekommt die volle Rate schon ab '+ymName(ymAdd(c.pStart,1))+' – dafür ist zur Ablösung weniger von ihrem Geld übrig und der Bankrest wird größer.':'Bis zur Ablösung zahlt ihr Petra nur die Zinsen (ca. '+eur(c.vorZins[0]||0,0)+' bis '+eur(c.vorZins.at(-1)||0,0)+' im Monat); die 1.000 € laufen ab '+ymName(c.rateStart)+'. So bleibt Petras ganzes Geld für die Ablösung.'}</div>`:''}
    <div class="mu-box">${fRow('Darlehen gesamt',eur(f.darlehen,0))}${fRow('Zinsen über die Laufzeit',eur(c.pZins,0))}${fRow('Rate läuft',c.pEnde?`${ymName(c.rateStart)} – ${ymName(c.pEnde)} (${fMon(c.pRows.filter(r=>!r.nurZins).length)})`:'–')}${fRow('je Person (Till / Patrick)',eur((+f.rate||0)/2,0)+' / Monat')}
    ${c.pOk?'':'<div class="note neg">⚠️ Die Rate reicht nicht einmal für die Zinsen – bitte Rate erhöhen oder Zins senken.</div>'}</div>
    <div class="note">Ab ${ymName(c.rateStart)} bekommt Petra zusätzlich zu Gehalt bzw. Rente ${eur(f.rate,0)} im Monat. Stirbt Petra vorher, erbt Till die Forderung – sie erlischt dann (Konfusion); für Pflegefall-Fragen siehe Hilfe.</div>
    </div>`+btns(c.pOk);}
  else if(step===2){const bisJ={};c.rows.filter(r=>r.ym<=c.abl&&r.so>0).forEach(r=>{bisJ[r.ym.slice(0,4)]=(bisJ[r.ym.slice(0,4)]||0)+r.so;});
    h=`<div class="card"><h2>3 · Was wurde bis zur Ablösung getilgt?</h2>
    <p class="sub">Die App rechnet mit dem Sparda-Tilgungsplan (Stand ${K().sparda.standAm?dDE(K().sparda.standAm):'–'}: ${eur(K().sparda.stand,0)}, ${num(K().sparda.zins)} %) und allen Sondertilgungen, die in den Monatsplänen und unter Kredite stehen. Was ihr tatsächlich sondertilgt, pflegt ihr dort ein – hier erscheint es automatisch.</p>
    <table class="stab"><tr><th>Jahr</th><th class="num">Sondertilgung laut App</th></tr>${Object.entries(bisJ).map(([y,v])=>`<tr><td>${y}</td><td class="num">${eur(v,0)}</td></tr>`).join('')||'<tr><td colspan="2" class="muted">keine</td></tr>'}<tr><td><b>Summe</b></td><td class="num"><b>${eur(c.sonderBis,0)}</b></td></tr></table>
    <div class="form" style="margin-top:10px"><label>Korrektur: zusätzlich getilgt (+) oder weniger (−) ${fNum('f-sonderKorr',f.sonderKorr,'€')}</label></div>
    <div class="mu-box">${fRow('Restschuld Sparda '+ymName(c.abl)+' laut Plan',eur(c.rest0,0))}${c.sonderOffen?fRow('− im '+c.abl.slice(0,4)+' schon angespartes Sondertilgungsgeld (Jan–'+MS[+c.abl.slice(5)-1]+')','− '+eur(c.sonderOffen,0)):''}${fRow('<b>Restschuld zur Ablösung</b>','<b>'+eur(c.rest,0)+'</b>')}</div>
    <h3>Bausparvertrag</h3>
    <label class="chk"><input type="checkbox" id="f-bausparAuf" ${f.bausparAuf?'checked':''}> Bausparvertrag zur Ablösung auflösen und Guthaben in die Sparda stecken</label>
    <div class="note">Guthaben ${ymName(c.abl)}: ca. <b>${eur(fBauspar(c.abl),0)}</b> (${eur(K().bauspar.saldo,0)} + ${eur(K().bauspar.monat,0)} monatlich). Das Bauspardarlehen braucht ihr dann nicht; die ${eur(K().bauspar.monat,0)} im Monat fallen weg.</div>
    </div>`+btns();}
  else if(step===3){const auto=fEkAuto(c.abl);h=`<div class="card"><h2>4 · Eigenkapital und ING-Kredit</h2>
    <p class="sub">Laut Ausblick hättet ihr im ${ymName(c.abl)} zusammen etwa <b>${eur(auto,0)}</b> (Tagesgeld Till + Patrick + Gold) – der Ausblick rechnet aber ohne Unvorhergesehenes. Vorsichtig geschätzt habt ihr mit 30.000 € gerechnet. Einen Notgroschen (3 Monatsausgaben) solltet ihr behalten.</p>
    <div class="form"><label>Eigenkapital, das ihr einsetzt ${fNum('f-ek',f.ek==null||f.ek===''?auto:f.ek,'€')}</label><button type="button" class="btn sec sm" data-fekauto>Wert aus dem Ausblick nehmen</button></div>
    <label class="chk" style="margin-top:10px"><input type="checkbox" id="f-ingFirst" ${f.ingFirst?'checked':''}> Zuerst den ING-Kredit (${num(K().ing.zins)} %) ablösen – der ist teurer als die Sparda</label>
    <div class="mu-box">${fRow('ING-Rest im '+ymName(c.abl),c.ingRest>0?eur(c.ingRest,0):'schon abbezahlt ✓')}${c.ingRest>0?fRow('davon aus Eigenkapital',eur(c.ekIng,0))+fRow('ING bleibt übrig',c.ingBleibt>0?eur(c.ingBleibt,0)+' (läuft weiter)':'0 € ✓'):''}${fRow('Eigenkapital für die Sparda',eur(c.ekSp,0))}</div>
    </div>`+btns();}
  else if(step===4){h=`<div class="card"><h2>5 · Der Rest bei einer Bank</h2>
    <p class="sub">Was nach Petra, Bausparguthaben und Eigenkapital übrig bleibt, finanziert ihr neu – bei der Sparda mit gesenkter Rate oder (wahrscheinlicher) bei einer anderen Bank mit niedriger Pflichtrate und voller Sondertilgung (z. B. ING).</p>
    <div class="mu-box">${fRow('Restschuld Sparda '+ymName(c.abl),eur(c.rest,0))}${fRow('− Bausparguthaben','− '+eur(c.bs,0))}${fRow('− Darlehen Petra (zur Ablösung)','− '+eur(c.petraAbl,0))}${c.trSum?fRow('− Petra-Tranchen vorher (in Restschuld enthalten)',eur(c.trSum,0),'muted'):''}${fRow('− Eigenkapital','− '+eur(c.ekSp,0))}${c.extraEk?fRow('− gesparte ING-Rate '+c.ingFreiMon+' Monate, abzüglich Zinsen an Petra','− '+eur(c.extraEk,0)):''}${fRow('<b>Rest bei der Bank</b>',`<b>${eur(c.bankRest,0)}</b>`)}${c.uebrig>0?fRow('bleibt sogar übrig',eur(c.uebrig,0),'pos'):''}</div>
    <div class="form" style="margin-top:10px"><label>Zins neuer Kredit ${fNum('f-bankZins',f.bankZins,'%',80)}</label><label>Pflichtrate (Minimum) ${fNum('f-pflicht',f.pflicht,'€',90)}</label><label>was ihr wirklich zahlt (Rate + Sondertilgung) ${fNum('f-zahlung',f.zahlung,'€',90)}</label></div>
    <div class="note">Die Pflichtrate ist das, was ihr in schlechten Monaten mindestens zahlen müsst. Alles darüber ist freiwillig und beschleunigt das Ende. Bisher gehen ${eur(c.vorher,0)} an Sparda, ING und Bausparkasse.</div>
    </div>`+btns();}
  else if(step===5){const r=c.rente;h=`<div class="card"><h2>6 · Petra: Arbeit und Rente</h2>
    <div class="form"><label>Geburtsmonat ${fYmIn('f-geb',f.geb).replace('min="2026-01" max="2053-03"','min="1940-01" max="1980-12"')}</label><label>Gehalt netto heute ${fNum('f-gehalt',f.gehalt,'€',90)}</label><label>Rente brutto laut Rentenauskunft (mit 67) ${fNum('f-renteBrutto',f.renteBrutto,'€',90)}</label></div>
    <h3>Wann in Rente?</h3>
    <div class="seg fseg">${[['regel','mit 67 (ohne Abschlag)'],['65','mit 65'],['64','mit 64'],['63','mit 63']].map(([k,l])=>`<button type="button" data-frente="${k}" ${f.renteArt===k?'aria-pressed="true"':''}>${l}</button>`).join('')}</div>
    <div class="mu-box">${fRow('Rentenbeginn',ymName(r.ab))}${r.absch?fRow('Abschlag dauerhaft','− '+num(r.absch,1)+' %','neg'):''}${fRow('Rente brutto',eur(r.brutto,0))}${fRow('Rente netto (geschätzt, nach KV/PV)',eur(r.netto,0))}${fRow('+ Rate von euch ab '+ymName(c.rateStart),eur(f.rate,0))}${fRow('<b>Petra hat ab '+ymName(c.rateStart>r.ab?c.rateStart:r.ab)+' monatlich</b>',`<b>${eur(r.netto+(+f.rate||0),0)}</b>`)}</div>
    <div class="note">45 Beitragsjahre erreicht Petra laut Rentenauskunft nicht – eine abschlagsfreie Rente vor 67 gibt es deshalb nicht. Frühere Rente nur als „langjährig Versicherte“ ab 63 mit 0,3 % Abschlag je Monat.</div>
    <h3>Früher aufhören zu arbeiten?</h3>
    <div class="form"><label>Letzter Arbeitsmonat (leer = bis zur Rente) ${fYmIn('f-stop',f.stop)}</label></div>
    ${c.lueckeMon?`<div class="mu-box">${fRow('Monate ohne Gehalt und ohne Rente',c.lueckeMon)}${fRow('Überbrückung aus Petras Reserve',eur(c.lueckeKosten,0),c.lueckeKosten>Math.max(0,(+f.erloes||0)-(+f.darlehen||0))?'neg':'')}<div class="note">Gerechnet mit dem heutigen Nettogehalt als Bedarf${c.stop>c.abl?'':''}. Reserve laut Schritt 1: ${eur(Math.max(0,(+f.erloes||0)-(+f.darlehen||0)),0)}.</div></div>`:'<div class="note">Petra arbeitet bis zum Rentenbeginn.</div>'}
    </div>`+btns();}
  else {const r=c.rente;const pf=c.bPf,za=c.bZa;const endeZa=za.at(-1)?.ym,endePf=pf.at(-1)?.ym;const frei=endeZa&&c.pEnde?(endeZa>c.pEnde?endeZa:c.pEnde):(endeZa||c.pEnde);
    const spar=c.ohneZins-c.mitZins;
    h=`<div class="grid">${kpi('Ablösung Sparda',ymName(c.abl),c.geld<KUEND?'mit Tranchen ab '+ymName(c.geld):'Kündigung 6 Monate vorher')}
      ${kpi('Rest bei der Bank',eur(c.bankRest,0),c.bankRest>0?`Pflichtrate ${eur(f.pflicht,0)}, Zins ${num(f.bankZins)} %`:'komplett bankfrei ✓',c.bankRest>0?'':'pos')}
      ${kpi('Bankfrei',endeZa?ymName(endeZa):(c.bankRest>0?'–':ymName(c.abl)),c.bankRest>0?`bei ${eur(f.zahlung,0)} im Monat; mit Pflichtrate ${endePf?ymName(endePf):'–'}`:'')}
      ${kpi('Zinsen gespart',eur(spar,0),`statt ${eur(c.ohneZins,0)} (Sparda bis ${c.ohneEnde?ymName(c.ohneEnde):'–'}) nur ${eur(c.mitZins,0)}`,spar>0?'pos':'neg')}</div>
    <div class="g2" style="margin-top:12px"><div class="card"><h2>So läuft es ab</h2>
      <ol class="flist">${c.tr.map(t=>`<li><b>${ymName(t.ym)}</b> – Petra gibt ${eur(t.b,0)}: ${t.was}.</li>`).join('')}
      <li><b>${ymName(ymAdd(c.abl,-6))}</b> – Sparda-Darlehen kündigen (schriftlich, § 489 BGB, Teilkündigung in Höhe der Ablösesumme).</li>
      <li><b>${ymName(c.abl)}</b> – Ablösung: Restschuld ${eur(c.rest,0)} − Bausparguthaben ${eur(c.bs,0)} − Petra ${eur(c.petraAbl,0)} − Eigenkapital ${eur(c.ekSp,0)}${c.extraEk?` − gesparte ING-Rate ${eur(c.extraEk,0)}`:''}${c.ingRest>0?` (vorher ING mit ${eur(c.ekIng,0)} ablösen)`:''} → <b>${c.bankRest>0?eur(c.bankRest,0)+' neu finanzieren':'nichts mehr offen bei der Bank'}</b>.</li>
      ${c.vorZins.length?`<li><b>${ymName(ymAdd(c.pStart,1))} – ${ymName(c.abl)}</b> – an Petra nur die Zinsen (${eur(c.vorZins[0],0)} bis ${eur(c.vorZins.at(-1),0)} im Monat).</li>`:''}<li><b>ab ${ymName(c.rateStart)}</b> – ${eur(f.rate,0)} monatlich an Petra (${num(f.zins)} %), bis <b>${c.pEnde?ymName(c.pEnde):'–'}</b>; Zinsen gesamt ${eur(c.pZins,0)}.</li>
      ${c.bankRest>0?`<li><b>ab ${ymName(ymAdd(c.abl,1))}</b> – Bankkredit: Pflichtrate ${eur(f.pflicht,0)} (fertig ${endePf?ymName(endePf):'–'}, Zinsen ${eur(c.bZiPf,0)}); mit ${eur(f.zahlung,0)} im Monat fertig <b>${endeZa?ymName(endeZa):'–'}</b> (Zinsen ${eur(c.bZiZa,0)}).</li>`:''}
      ${c.ingBleibt>0?`<li>ING läuft mit ${eur(K().ing.rate,0)} weiter (Rest ${eur(c.ingBleibt,0)}).</li>`:''}
      <li><b>${frei?ymName(frei):'–'}</b> – alles abbezahlt, auch bei Petra.</li></ol></div>
    <div class="card"><h2>Monatliche Belastung</h2>
      ${fRow('heute (Sparda + ING + Bausparen)',eur(c.vorher,0))}${fRow('nach der Ablösung – Pflicht',eur(c.nachherPf,0),'pos')}${fRow('nach der Ablösung – geplant',eur(c.nachherZa,0))}${fRow('davon fest an Petra',eur(f.rate,0))}
      <div class="note">Pflicht = Petra + Mindestrate Bank. Alles darüber ist freiwillig; in einem schlechten Monat könnt ihr auf ${eur(c.nachherPf,0)} runtergehen.</div>
      <h3>Petras Einkommen</h3>
      ${fRow('bis '+ymName(c.stop)+' (Gehalt netto)',eur(f.gehalt,0))}${c.lueckeMon?fRow(`${ymName(ymAdd(c.stop,1))} – ${ymName(ymAdd(r.ab,-1))}: aus der Reserve`,eur(c.lueckeKosten,0)+' gesamt','neg'):''}${fRow('ab '+ymName(r.ab)+' Rente netto'+(r.absch?` (−${num(r.absch,1)} %)`:''),eur(r.netto,0))}${fRow('ab '+ymName(c.rateStart)+' + Rate von euch',eur(f.rate,0))}${fRow('<b>zusammen (Rente + Rate)</b>',`<b>${eur(r.netto+(+f.rate||0),0)}</b>`)}
    </div></div>
    <div class="card" style="margin-top:12px"><h2>Restschuld im Vergleich</h2><div class="legend"><span><i style="background:var(--till)"></i>Sparda ohne Petra</span><span><i style="background:var(--gem)"></i>Bank neu (geplante Zahlung)</span><span><i style="background:var(--pat)"></i>Darlehen Petra</span></div><div id="f-chart" class="chart"></div></div>
    <div class="card" style="margin-top:12px"><h2>Unsere Empfehlung</h2><ul class="flist">
      <li>${c.bankRest>0?`Den Rest von ${eur(c.bankRest,0)} bei einer Bank mit niedriger Pflichtrate (${eur(f.pflicht,0)}) und freier Sondertilgung aufnehmen – so bleibt ihr flexibel und seid ${endeZa?'bis '+ymName(endeZa):''} bankfrei.`:'Ihr braucht keine Bank mehr – nur noch den Vertrag mit Petra.'}</li>
      <li>Vertrag mit Petra schriftlich, ${num(f.zins)} % Zins, ${eur(f.rate,0)} monatlich per Dauerauftrag, keine Grundschuld, Risikolebensversicherung habt ihr schon. Till und Patrick gemeinsam als Darlehensnehmer.</li>
      <li>Bis ${ymName(c.abl)}: ING zuerst tilgen (teuerster Kredit), geplante Sondertilgungen bei der Sparda durchziehen, Notgroschen behalten.</li>
      <li>Petra behält ${eur(Math.max(0,(+f.erloes||0)-(+f.darlehen||0)),0)} Reserve${c.lueckeMon?` – davon ${eur(c.lueckeKosten,0)} für die Zeit ohne Gehalt`:''}.</li>
      <li>Ein Jahr vor der Ablösung: Angebote für den Restkredit einholen und Sparda-Kündigung vorbereiten (6 Monate Frist).</li></ul>
      <div class="note">Alle Zahlen kommen live aus dem Haushaltsbuch (Kredite, Monatspläne, Tagesgeld, Gold). Ändert sich dort etwas, rechnet dieser Reiter automatisch neu. Nichts hier verändert Pläne oder Kredite.</div></div>`+btns();}
  el.innerHTML=nav+h;
  if(step===FSTEPS.length-1){const ch=$('#f-chart');const by={};const put=(k,rows)=>rows.forEach(r=>{(by[r.ym]=by[r.ym]||{})[k]=r.st;});put('o',c.ohne);put('b',c.bZa);put('p',c.pRows);
    const labels=Object.keys(by).filter(ym=>ym>=TODAY.slice(0,7)&&ym.endsWith('-12')).sort();    const fill=(k,rows)=>labels.map(ym=>{const r=by[ym]?.[k];if(r!=null)return r;const first=rows[0]?.ym,last=rows.at(-1)?.ym;if(!first)return null;return ym<first?(k==='o'?null:0):ym>last?0:null;});
    lineChart(ch,labels,[{n:'Sparda ohne Petra',c:'var(--till)',v:fill('o',c.ohne)},{n:'Bank neu',c:'var(--gem)',v:fill('b',c.bZa)},{n:'Darlehen Petra',c:'var(--pat)',v:fill('p',c.pRows)}],{xl:l=>l.slice(0,4),xt:l=>'Ende '+l.slice(0,4)});}
}
/* Eingaben */
document.addEventListener('click',e=>{const el=e.target.closest('#p-familie [data-fstep],#p-familie [data-fgeld],#p-familie [data-frente],#p-familie [data-frateab],#p-familie [data-fekauto]');if(!el)return;el.blur();
  if(el.dataset.fstep!=null){fSet(d=>d.step=+el.dataset.fstep);window.scrollTo({top:0,behavior:'smooth'});}
  else if(el.dataset.fgeld){fSet(d=>{d.geldArt=el.dataset.fgeld;if(d.geldArt==='kuend')d.geld=KUEND;else if(d.geldArt==='frueh'&&!(normYm(d.geld)<KUEND))d.geld='2029-01';else if(d.geldArt==='spaet'&&!(normYm(d.geld)>KUEND))d.geld='2036-01';});}
  else if(el.dataset.frente){fSet(d=>d.renteArt=el.dataset.frente);}
  else if(el.dataset.frateab){fSet(d=>d.rateAb=el.dataset.frateab);}
  else if(el.dataset.fekauto!=null){fSet(d=>d.ek=null);}});
document.addEventListener('change',e=>{const t=e.target;if(!t.closest||!t.closest('#p-familie'))return;const id=(t.id||'').replace(/^f-/,'');if(!id)return;t.blur();
  fSet(d=>{if(t.type==='checkbox')d[id]=t.checked;else if(t.type==='month')d[id]=t.value||'';else{const v=parseNum(t.value);d[id]=v==null?(id==='ek'?null:0):v;}});});
