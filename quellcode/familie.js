/* ---------- Familiendarlehen: Schritt-für-Schritt-Rechner (Reiter „Familie“) ----------
   Eingaben liegen in S.familie (Firestore config/familie). Rechnet mit den Live-Daten der App:
   Sparda-Tilgungsplan sparda(), ING ingRows(), Bausparvertrag, Tagesgeld/Gold aus CALC.
   Es wird nichts an Plänen oder Krediten verändert. */
const FDEF={erloes:175000,darlehen:155000,geld:'2033-10',geldArt:'kuend',zins:2,rate:1000,sonderKorr:0,bausparAuf:true,ek:30000,ingFirst:true,bankZins:4,pflicht:500,zahlung:1150,
  gehalt:1277,renteBrutto:1018,renteArt:'regel',stopArt:'geld',stop:'',anteilTill:50,eigenArt:'sparen',rateVor:null,bedarf:null,step:0};
const PETRA_GEB='1964-04'; // Petras Geburtsmonat (fest)
const F=()=>({...FDEF,...(S.familie||{})});
const FSTEPS=['Geld','Petra','Tilgung','Eigenkapital','Bank','Rente','Ergebnis'];
const KUEND='2033-10'; // frühester Monat, zu dem die Sparda nach § 489 BGB (10 Jahre nach Vollauszahlung April 2023 + 6 Monate) gekündigt werden kann
const fYmIn=(id,v)=>{const m=normYm(v);return `<input type="month" id="${id}" value="${m||''}" min="2026-01" max="2053-03">`;};
const fNum=(id,v,unit,w=110)=>`<span class="fin"><input inputmode="decimal" id="${id}" value="${num(v,unit==='%'?2:0)}" style="width:${w}px">${unit?`<span>${unit}</span>`:''}</span>`;
const fRateVor=f=>f.rateVor==null||f.rateVor===''?(+f.rate||0):+f.rateVor; // Rate bis zum Rentenbeginn
const fBedarf=f=>f.bedarf==null||f.bedarf===''?(+f.gehalt||0):+f.bedarf; // was Petra monatlich braucht
const fMonDiff=(a,b)=>(+b.slice(0,4)-+a.slice(0,4))*12+(+b.slice(5)-+a.slice(5)); // Monate von a bis b

/* Rentenbeginn: Regelaltersgrenze 67 (Jahrgang 1964) = Geburtsmonat + 67 Jahre, Rente ab dem Folgemonat (Mai 2031).
   Früher (63/64/65) nur mit Abschlag 0,3 % je Monat (max. 14,4 %). */
function fRente(f){const g=PETRA_GEB;const regel=ymAdd(g,67*12+1);const alter={regel:67,'66':66,'65':65,'64':64,'63':63}[f.renteArt]??67;const ab=ymAdd(g,alter*12+1);
  const mon=Math.max(0,(67-alter)*12);const absch=Math.min(14.4,mon*0.3);const brutto=(+f.renteBrutto||0)*(1-absch/100);
  return {ab,regel,absch,brutto:r2(brutto),netto:r2(brutto*0.885),mon};}

/* Ablösemonat: Geld vor Oktober 2033 → Kündigung zum frühesten Termin (Okt 2033). Geld später → 6 Monate Kündigungsfrist. */
function fAbl(f){const g=normYm(f.geld)||KUEND;return g<=KUEND?KUEND:ymAdd(g,6);}
const fFrueh=f=>(normYm(f.geld)||KUEND)<KUEND;

/* Tranchen bei früherem Verkauf: erst ING ablösen, dann je Jahr die volle Sondertilgungsgrenze (17.250 €) aus Petras Geld, Rest zur Ablösung.
   Die eigenen geplanten Sondertilgungen („Rate Sondertilgung Haus“) werden in diesen Jahren NICHT an die Sparda überwiesen, sondern gespart
   und zur Ablösung als Eigenkapital eingesetzt (gleiche Wirkung bei der Bank, aber das Geld bleibt bis dahin flexibel). */
function fTranchen(f,abl){const g=normYm(f.geld)||KUEND;const out=[];if(g>=KUEND)return out;let frei=+f.darlehen||0;
  const ing=ingRows();const ir=ing.find(r=>r.ym===g);const ingRest=ir?ir.st:(ing.length&&g<ing[0].ym?+K().ing.betrag:0);
  if(ingRest>0.5){const b=Math.min(frei,ingRest);out.push({ym:g,b:r2(b),was:'ING-Kredit komplett abgelöst'});frei-=b;}
  const max=+K().sparda.sonderMax||17250;
  for(let y=+g.slice(0,4);y<+abl.slice(0,4)&&frei>0.5;y++){const ym=`${y}-12`;if(ym<=g||ym>=abl)continue;const b=Math.min(frei,max);if(b>0.5){out.push({ym,b:r2(b),was:'Sondertilgung Sparda (Jahresgrenze '+eur(max,0)+')'});frei-=b;}}
  return out;}
/* eigene geplante Sondertilgungen (Dezember-Buchungen laut Plan) */
function fEigen(f,abl){const g=normYm(f.geld)||KUEND;const early=g<KUEND;return planSonder().filter(x=>x.ym<=ymAdd(abl,2)).map(x=>({...x,gespart:early&&x.ym.slice(0,4)>=g.slice(0,4)}));}

/* Sparda-Verlauf mit Tranchen, ohne das alte „Mutter übernimmt“-Szenario und ohne automatische Bauspar-Sondertilgung.
   Gesparte eigene Sondertilgungen werden mit negativen Einträgen neutralisiert (sparda() addiert so). */
function fSparda(f,abl,tr,eig){const d=structuredClone(K());d.sparda.szenario={aktiv:false};d.bauspar.alsSonder=false;
  d.sparda.sonder=[...(d.sparda.sonder||[]),...tr.filter(t=>/Sparda/.test(t.was)).map(t=>({ym:t.ym,b:t.b})),...eig.filter(x=>x.gespart).map(x=>({ym:x.ym,b:-x.b}))];
  const keep=S.kredit;S.kredit=d;try{return sparda(true);}finally{S.kredit=keep;}}
function fBauspar(abl){const b=K().bauspar;if(!b.summe)return 0;let s=+b.saldo||0,ym=normYm(b.stand)||CUR;let n=0;while(ym<abl&&n<400){ym=ymAdd(ym,1);s+=+b.monat||0;n++;}return r2(s);}
function fEkAuto(abl){const c=CALC?.[abl]||CALC?.[Object.keys(CALC||{}).sort().at(-1)];if(!c)return 0;return r2(Math.max(0,c.TILL.tg)+Math.max(0,c.PATRICK.tg)+(c.TILL.gold||0));}
/* monatliche Sondertilgungs-Raten laut Plan in einem Zeitraum (einschließlich) */
function fPlanSonder(a,b){let v=0;for(let ym=a;ym<=b;ym=ymAdd(ym,1)){useYm(ym);['TILL','PATRICK'].forEach(sh=>{const bl=S.plan[ym]?.[sh];(bl?.C||[]).forEach(e=>{if(/sonde?r?tilgung/i.test(e.l||''))v+=entryVal(e,bl,sh);});});}useYm(month);return r2(v);}

function fCalc(f){
  const abl=fAbl(f);const geld=normYm(f.geld)||KUEND;const early=geld<KUEND;const tr=fTranchen(f,abl);const eig=fEigen(f,abl);const rows=fSparda(f,abl,tr,eig);
  const sumZi=(r,a,b)=>r.filter(x=>x.ym>a&&(!b||x.ym<=b)).reduce((s,x)=>s+x.zi,0);
  const at=rows.find(r=>r.ym===abl);const rest0=at?at.st:(rows.length&&abl<rows[0].ym?+K().sparda.stand:0);
  // eigene Sondertilgungen: überwiesen (vor dem Verkaufsjahr) bzw. gespart (ab Verkaufsjahr + Jan–Ablösemonat des Ablösejahres)
  const eigUeb=eig.filter(x=>!x.gespart&&x.ym<=abl).reduce((s,x)=>s+x.b,0);
  const eigJahr=abl.endsWith('-12')?0:fPlanSonder(abl.slice(0,4)+'-01',abl); // im Ablösejahr bis zum Ablösemonat angespart
  const eigSpar=r2(eig.filter(x=>x.gespart&&x.ym<abl).reduce((s,x)=>s+x.b,0)+eigJahr);
  const rest=Math.max(0,r2(rest0-(+f.sonderKorr||0)));
  const bs=f.bausparAuf?fBauspar(abl):0;
  const ingAll=ingRows();const ingTr=tr.find(t=>/ING/.test(t.was));const ir=ingAll.find(r=>r.ym===abl);let ingRest=ingTr?0:(ir?ir.st:(ingAll.length&&abl<ingAll[0].ym?+K().ing.betrag:0));ingRest=r2(ingRest);
  const ingFreiMon=ingTr?ingAll.filter(r=>r.ym>ingTr.ym&&r.ym<=abl).length:0; // Monate, in denen die ING-Rate wegfällt
  const ek=(f.ek==null||f.ek===''?fEkAuto(abl):+f.ek);
  const ekIng=f.ingFirst?Math.min(ek,ingRest):0;const ekSp=ek-ekIng;const ingBleibt=r2(ingRest-ekIng);
  const trSum=tr.reduce((s,t)=>s+t.b,0);const petraAbl=Math.max(0,(+f.darlehen||0)-trSum); // was zur Ablösung noch von Petra kommt
  // Petra: Rente, Arbeitsende, Beginn der Rate
  const rente=fRente(f);
  const stop=f.stopArt==='rente'?ymAdd(rente.ab,-1):f.stopArt==='monat'&&normYm(f.stop)?normYm(f.stop):(geld<rente.ab?geld:ymAdd(rente.ab,-1)); // letzter Arbeitsmonat
  const pStart=tr.length?tr[0].ym:abl; // erste Auszahlung des Darlehens
  const rateStart=(x=>x>ymAdd(stop,1)?x:ymAdd(stop,1))(ymAdd(pStart,1)); // Rate läuft, sobald Petra aufhört zu arbeiten (frühestens nach der ersten Auszahlung)
  let pBal=0;const pRows=[];{let ym=pStart;const z=(+f.zins||0)/100;const rateOf=ym=>ym<rente.ab?fRateVor(f):(+f.rate||0);let n=0;const trs=[...tr,{ym:abl,b:petraAbl}];
    while(n<600){trs.filter(t=>t.ym===ym).forEach(t=>{pBal=r2(pBal+t.b);});if(n>0){const zi=r2(pBal*z/12);const nurZins=ym<rateStart;const rate=rateOf(ym);const tg=nurZins?0:Math.min(Math.max(0,rate-zi),pBal);pBal=r2(pBal-tg);pRows.push({ym,zi,tg,st:pBal,nurZins,rate});}
      if(n>0&&ym>=abl&&pBal<=0.005)break;ym=ymAdd(ym,1);n++;}}
  const pZins=pRows.reduce((s,r)=>s+r.zi,0);const vorZins=pRows.filter(r=>r.nurZins).map(r=>r.zi);const pEnde=pRows.at(-1)?.ym;const pOk=Math.min(+f.rate||0,fRateVor(f))>(+f.darlehen||0)*(+f.zins||0)/100/12;
  // bis zur Ablösung an Petra gezahlt (Zinsen + Raten) – das fehlt euch als Eigenkapital; gesparte ING-Rate und gesparte Sondertilgungen kommen dazu
  const vorAbl=r2(pRows.filter(r=>r.ym<=abl).reduce((s,r)=>s+r.zi+r.tg,0));
  const eigSparEk=early&&f.eigenArt==='streichen'?0:eigSpar;const extraEk=eigSparEk; // nur gespartes Sondertilgungsgeld; die wegfallende ING-Rate und die Zahlungen an Petra laufen über den Monat (Karte „Tragbar je Person?“)
  let bankRest=r2(rest-bs-petraAbl-ekSp-extraEk),uebrig=0;if(bankRest<0){uebrig=-bankRest;bankRest=0;}
  // Bankrest: Pflichtrate und geplante Zahlung
  const start=ymAdd(abl,1);const bz=+f.bankZins||0;
  const bPf=bankRest>0?annuity(bankRest,bz,start,Math.max(+f.pflicht||0,bankRest*bz/100/12+1),[]):[];
  const bZa=bankRest>0?annuity(bankRest,bz,start,Math.max(+f.zahlung||0,bankRest*bz/100/12+1),[]):[];
  const zi=r=>r.reduce((s,x)=>s+x.zi,0);
  // Vergleich: ohne Petra einfach weiter bei der Sparda (mit allen geplanten Sondertilgungen)
  const ohne=(()=>{const d=structuredClone(K());d.sparda.szenario={aktiv:false};const keep=S.kredit;S.kredit=d;try{return sparda(true);}finally{S.kredit=keep;}})();
  const ohneEnde=ohne.at(-1)?.ym;const ohneZins=sumZi(ohne,abl);
  const mitZins=pZins+zi(bZa);
  const sparZinsBis=sumZi(ohne,TODAY.slice(0,7),abl)-sumZi(rows,TODAY.slice(0,7),abl); // Zinsersparnis durch frühe Tranchen bis zur Ablösung
  // Petras Lücke: Monate ohne Gehalt und ohne Rente; Bedarf = heutiges Nettogehalt, abzüglich eurer Rate, sobald sie läuft
  const reserve=Math.max(0,(+f.erloes||0)-(+f.darlehen||0));
  const bedarf=fBedarf(f),rateVor=fRateVor(f);let lueckeMon=0,lueckeKosten=0,lueckeOhne=0,lueckeRate=0;for(let ym=ymAdd(stop,1);ym<rente.ab;ym=ymAdd(ym,1)){lueckeMon++;lueckeOhne+=bedarf;const r=ym>=rateStart?rateVor:0;lueckeRate+=Math.min(r,bedarf);lueckeKosten+=Math.max(0,bedarf-r);}
  lueckeKosten=r2(lueckeKosten);lueckeOhne=r2(lueckeOhne);lueckeRate=r2(lueckeRate);
  // Belastung vorher / nachher
  const vorher=fHausAlt()+(+K().ing.rate||0);
  const rateAbl=ymAdd(abl,1)<rente.ab?rateVor:(+f.rate||0); // Petra-Rate im Monat nach der Ablösung
  const nachherPf=rateAbl+(bankRest>0?Math.max(+f.pflicht||0,0):0)+(ingBleibt>0?(+K().ing.rate||0):0);
  const nachherZa=rateAbl+(bankRest>0?+f.zahlung||0:0)+(ingBleibt>0?(+K().ing.rate||0):0);
  const zwischen=early?fHausAlt()+rateVor:0; // Belastung zwischen Verkauf und Ablösung (ING weg, Petra-Rate dazu)
  return {abl,geld,early,tr,trSum,rows,eig,eigUeb,eigSpar,eigJahr,eigSparEk,rest0,rest,bs,ingRest,ingBleibt,ek,ekIng,ekSp,extraEk,ingFreiMon,vorAbl,petraAbl,bankRest,uebrig,pRows,pZins,pEnde,pStart,rateStart,vorZins,pOk,bPf,bZa,bZiPf:zi(bPf),bZiZa:zi(bZa),ohne,ohneEnde,ohneZins,mitZins,sparZinsBis,rente,stop,reserve,bedarf,rateVor,rateAbl,lueckeMon,lueckeKosten,lueckeOhne,lueckeRate,vorher,nachherPf,nachherZa,zwischen};}

/* Je Person und Monat aus dem Plan: Rest Gehalt (geht aufs Tagesgeld), ING-Rate, eigene Sondertilgungs-Rate */
function fPers(ym){useYm(ym);const P=S.plan[ym]||{};const o={};['TILL','PATRICK'].forEach(sh=>{const b=P[sh]||{};const ev=e=>entryVal(e,b,sh);
  const rg=(b.K||[]).find(e=>/RESTGEHALT/i.test(e.f||''))||(b.K||[]).find(e=>/rest ?gehalt/i.test(e.l||''));const rest=rg?ev(rg):(CALC?.[ym]?.[sh]?(CALC[ym][sh].tgH-CALC[ym][sh].tgS):0);
  const sum=re=>(b.C||[]).filter(e=>re.test(e.l||'')).reduce((a,e)=>a+ev(e),0);
  o[sh]={rest:r2(rest),ing:r2(sum(/gemeinschaftskredit/i)),son:r2(sum(/sonde?r?tilgung/i))};});useYm(month);return o;}
/* Tragbarkeit je Person: Durchschnitt je Jahr zwischen rateStart und Ablösung (nur bei frühem Geld) und der erste Monat nach der Ablösung */
function fTragbar(f,c){const antT=Math.max(0,Math.min(100,+f.anteilTill||50))/100;const shareOf=ym=>{const rate=ym<c.rente.ab?c.rateVor:(+f.rate||0);return {TILL:rate*antT,PATRICK:rate*(1-antT)};};const share=shareOf(ymAdd(c.abl,1));const streichen=c.early&&f.eigenArt==='streichen';
  const jahre=[];if(c.early){const byY={};for(let ym=c.rateStart;ym<=c.abl;ym=ymAdd(ym,1)){const y=ym.slice(0,4);const p=fPers(ym);const o=byY[y]=byY[y]||{y,n:0,TILL:{rest:0,ing:0,son:0,sh:0},PATRICK:{rest:0,ing:0,son:0,sh:0}};o.n++;const shm=shareOf(ym);['TILL','PATRICK'].forEach(sh=>{o[sh].rest+=p[sh].rest;o[sh].ing+=p[sh].ing;o[sh].son+=p[sh].son;o[sh].sh+=shm[sh];});}
    Object.values(byY).forEach(o=>{['TILL','PATRICK'].forEach(sh=>{const a=o[sh];a.rest=r2(a.rest/o.n);a.ing=r2(a.ing/o.n);a.son=r2(a.son/o.n);a.sh=r2(a.sh/o.n);a.nach=r2(a.rest+a.ing-a.sh+(streichen?a.son:0));});jahre.push(o);});}
  // nach der Ablösung: ING weg (wenn abgelöst), Sparda-Rate + Bausparen ersetzt durch Bankrate (je Hälfte), Sondertilgung entfällt
  const ym1=ymAdd(c.abl,1);const p=fPers(ym1);const hausAlt=fHausAlt();const nach={};
  [['pf',+f.pflicht||0],['za',+f.zahlung||0]].forEach(([k,bank])=>{nach[k]={};['TILL','PATRICK'].forEach(sh=>{const a=p[sh];nach[k][sh]=r2(a.rest+(c.ingBleibt>0?0:a.ing)+a.son+(hausAlt-(c.bankRest>0?bank:0))/2-share[sh]);});});
  return {share,jahre,nach,p1:p,streichen};}

const fHausAlt=()=>+gv('h_tilgung')||((+K().sparda.rate||0)+(+K().bauspar.monat||0)); // was heute vom Haushaltskonto an Sparda + Bausparkasse geht
/* Vergleich: verschiedene monatliche Zahlungen an die Bank → wann fertig, Zinsen, Gesamtbelastung */
function fBankVgl(f,c){const bz=+f.bankZins||0;const minR=Math.ceil(c.bankRest*bz/100/12+1);const cand=[+f.pflicht||0,700,900,+f.zahlung||0,1150,1500].map(v=>Math.max(v,minR)).filter((v,i,a)=>v>0&&a.indexOf(v)===i).sort((a,b)=>a-b);
  return cand.map(z=>{const rows=c.bankRest>0?annuity(c.bankRest,bz,ymAdd(c.abl,1),z,[]):[];const ende=rows.at(-1)?.ym||null;const zi=rows.reduce((a,r)=>a+r.zi,0);const frei=ende&&c.pEnde?(ende>c.pEnde?ende:c.pEnde):(ende||c.pEnde);return {z,ende,zi,n:rows.length,gesamt:z+(+f.rate||0),frei,akt:z===(+f.zahlung||0),pflicht:z===(+f.pflicht||0)};});}
/* Vergleich sparen vs. streichen (eigene Sondertilgungs-Raten bei frühem Verkauf) */
function fEigenVgl(f){const mk=art=>{const c=fCalc({...f,eigenArt:art});const ende=c.bZa.at(-1)?.ym||null;const mon=c.rateStart<c.abl?fMonDiff(c.rateStart,c.abl)+1:1;return {c,ende,zi:c.bZiZa,luft:r2(c.eigSpar/mon/2)};};
  const a=mk('sparen'),b=mk('streichen');const dm=a.ende&&b.ende?fMonDiff(a.ende,b.ende):0;return {a,b,dm,dzi:r2(b.zi-a.zi),dRest:r2(b.c.bankRest-a.c.bankRest)};}
const fEigenVglHTML=f=>{const v=fEigenVgl(f);return `<table class="stab ftrag" style="margin-top:8px"><tr><th></th><th>sparen</th><th>streichen</th><th>Unterschied</th></tr>
  <tr><td>Luft im Monat je Person</td><td>–</td><td class="pos">+ ${eur(v.b.luft,0)}</td><td>${eur(v.b.luft,0)} mehr</td></tr>
  <tr><td>Rest bei der Bank ${v.a.c.abl.slice(0,4)}</td><td>${eur(v.a.c.bankRest,0)}</td><td>${eur(v.b.c.bankRest,0)}</td><td class="${v.dRest>0?'neg':''}">${v.dRest>0?'+ ':''}${eur(v.dRest,0)}</td></tr>
  <tr><td>Bank fertig (bei ${eur(f.zahlung,0)})</td><td>${v.a.ende?ymName(v.a.ende):'–'}</td><td>${v.b.ende?ymName(v.b.ende):'–'}</td><td class="${v.dm>0?'neg':''}">${v.dm>0?v.dm+' Monate später':v.dm<0?(-v.dm)+' Monate früher':'gleich'}</td></tr>
  <tr><td>Zinsen Bank</td><td>${eur(v.a.zi,0)}</td><td>${eur(v.b.zi,0)}</td><td class="${v.dzi>0?'neg':''}">${v.dzi>0?'+ ':''}${eur(v.dzi,0)}</td></tr></table>
  <div class="note">Streichen heißt: ${eur(v.b.luft,0)} je Person mehr im Monat bis zur Ablösung – dafür ${v.dm>0?v.dm+' Monate länger an die Bank und '+eur(v.dzi,0)+' mehr Zinsen':'kaum Nachteil'}. Kurz: ${v.dzi>0?eur(v.a.c.eigSpar,0)+' mehr Luft bis '+v.a.c.abl.slice(0,4)+' kosten euch später rund '+eur(v.dzi,0)+' Zinsen – das ist der Preis.':'praktisch kostenlos.'}</div>`;};
/* Ampel: Wie günstig ist das gewählte Szenario? 0–100 Punkte aus Bankrest, Zwischenbelastung, Petras Reserve und Zinsersparnis */
function fAmpel(c,f){const lin=(v,gut,schlecht)=>Math.max(0,Math.min(1,(v-schlecht)/(gut-schlecht)));const spar=c.ohneZins-c.mitZins;const g=[];
  const a=lin(c.bankRest,75000,160000),b=c.early?lin(c.zwischen-c.vorher,0,600):1,d=c.lueckeKosten<=c.reserve?1:Math.max(0,1-(c.lueckeKosten-c.reserve)/15000),e=lin(spar,75000,25000);
  const t=fTragbar(f,c);const minNach=Math.min(...t.jahre.flatMap(o=>[o.TILL.nach,o.PATRICK.nach]),t.nach.pf.TILL,t.nach.pf.PATRICK);const tr=lin(minNach,150,-150);
  const score=Math.round(100*(0.3*a+0.15*b+0.15*d+0.15*e+0.25*tr));
  if(tr<0.6)g.push(`einer von euch hätte nur noch ${eur(minNach,0)} im Monat übrig`);
  if(a<0.7)g.push(`Bankrest ${eur(c.bankRest,0)} – ein großer Teil von Petras Geld ist vor der Ablösung schon an sie zurückgeflossen`);
  if(b<0.7)g.push(`${eur(c.zwischen-c.vorher,0)} mehr im Monat bis zur Ablösung`);
  if(d<1)g.push(`Petras Reserve reicht nicht für die Zeit bis zur Rente`);
  if(e<0.7)g.push(`Zinsersparnis nur ${eur(spar,0)}`);
  if(!g.length)g.push(c.early?'Tranchen nutzen die Sondertilgungs-Grenze, Belastung bleibt tragbar':'Petras Geld wirkt komplett bei der Ablösung, Bankrest klein, Belastung sinkt');
  return {score,label:score>=70?'günstig':score>=45?'mittel':'ungünstig',cls:score>=70?'gut':score>=45?'mittel':'schlecht',gruende:g};}
const fAmpelHTML=(c,f,klein)=>{const a=fAmpel(c,f);return `<div class="fampel ${a.cls}"><div class="fampel-h"><span>Wie günstig ist dieses Szenario?</span><b>${a.label}</b></div><div class="fampel-bar"><i style="left:${a.score}%"></i></div>${klein?'':`<div class="note">${a.gruende.join(' · ')}. Faustregel: Je näher der Verkauf an Oktober 2033 liegt und je länger Petra arbeitet, desto besser wirkt ihr Geld – weil es dann ungeschmälert in die Ablösung geht.</div>`}</div>`;};

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
    ${c.geld<KUEND?`<div class="mu-box"><b>Geld kommt früher (${ymName(c.geld)}):</b> Eine komplette Ablösung vor ${ymName(KUEND)} kostet Vorfälligkeitsentschädigung (geschätzt 15–20 Tsd. €) – lohnt nicht. Stattdessen in Tranchen: ${c.tr.length?c.tr.map(t=>`${ymName(t.ym)}: ${eur(t.b,0)} (${t.was})`).join('; '):'–'}; der Rest (${eur(c.petraAbl,0)}) zur Ablösung ${ymName(c.abl)}. Zinsersparnis bei der Sparda bis dahin ca. <b>${eur(c.sparZinsBis,0)}</b>. Die ING-Rate (${eur(K().ing.rate,0)}) fällt weg – das schafft im Monat Luft für Petras Rate (Ergebnis → „Tragbar je Person?“). Eure eigenen geplanten Sondertilgungen überweist ihr ab ${c.geld.slice(0,4)} nicht mehr an die Sparda, sondern spart sie oder streicht sie (Schritt 3).</div>`:c.geld>KUEND?`<div class="mu-box">Geld erst ${ymName(c.geld)} → Kündigung dann aussprechen, Ablösung nach 6 Monaten Frist im <b>${ymName(c.abl)}</b>. Bis dahin läuft alles weiter wie bisher.</div>`:''}
    ${fAmpelHTML(c,f,true)}
    </div>`+btns();}
  else if(step===1){h=`<div class="card"><h2>2 · Konditionen für Petra</h2>
    <p class="sub">Petra soll jeden Monat verlässlich ihren Betrag bekommen. Zins zwischen 2 und 2,5 % ist marktnah und glaubwürdig (Sozialamt/Finanzamt); unter 1 % wäre angreifbar als Teil-Schenkung.</p>
    <div class="form"><label>Zins pro Jahr ${fNum('f-zins',f.zins,'%',80)}</label><label>Rate ab Rentenbeginn (${ymName(c.rente.ab)}) ${fNum('f-rate',f.rate,'€',90)}</label><label>Rate bis zum Rentenbeginn ${fNum('f-rateVor',c.rateVor,'€',90)}</label></div>
    <div class="note">Die Rate darf gestaffelt sein – das steht einfach so im Darlehensvertrag („bis ${ymName(ymAdd(c.rente.ab,-1))} monatlich ${eur(c.rateVor,0)}, danach ${eur(f.rate,0)}“). Ein Notar ist dafür nicht nötig, schriftlich mit beiden Unterschriften reicht. Was Petra bis zur Rente wirklich braucht, legt ihr in Schritt 6 fest; dort siehst du, ob die kleinere Rate plus Reserve reicht.</div>
    <div class="note">Die Rate beginnt, sobald Petra aufhört zu arbeiten (Schritt 6) – frühestens einen Monat nach der ersten Auszahlung: ab <b>${ymName(c.rateStart)}</b>${c.rateStart<c.rente.ab?` mit ${eur(c.rateVor,0)}, ab ${ymName(c.rente.ab)} dann ${eur(f.rate,0)}`:''}.${c.vorZins.length?` Davor (${ymName(ymAdd(c.pStart,1))} – ${ymName(ymAdd(c.rateStart,-1))}) zahlt ihr ihr nur die Zinsen (${eur(c.vorZins[0],0)} bis ${eur(c.vorZins.at(-1),0)} im Monat).`:''}</div>
    <div class="mu-box">${fRow('Darlehen gesamt',eur(f.darlehen,0))}${fRow('Zinsen über die Laufzeit',eur(c.pZins,0))}${fRow('Rate läuft',c.pEnde?`${ymName(c.rateStart)} – ${ymName(c.pEnde)} (${fMon(c.pRows.filter(r=>!r.nurZins).length)})`:'–')}${fRow('je Person (Till / Patrick) bei 50/50',(c.rateVor!==(+f.rate||0)?eur(c.rateVor/2,0)+' → ':'')+eur((+f.rate||0)/2,0)+' / Monat')}
    ${c.pOk?'':'<div class="note neg">⚠️ Die Rate reicht nicht einmal für die Zinsen – bitte Rate erhöhen oder Zins senken.</div>'}</div>
    <div class="note">Stirbt Petra vorher, erbt Till die Forderung – sie erlischt dann (Konfusion); für Pflegefall-Fragen siehe Hilfe.</div>
    </div>`+btns(c.pOk);}
  else if(step===2){const eigL=c.eig.filter(x=>x.ym<=c.abl);
    h=`<div class="card"><h2>3 · Was wurde bis zur Ablösung getilgt?</h2>
    <p class="sub">Die App rechnet mit dem Sparda-Tilgungsplan (Stand ${K().sparda.standAm?dDE(K().sparda.standAm):'–'}: ${eur(K().sparda.stand,0)}, ${num(K().sparda.zins)} %) und allen Sondertilgungen aus den Monatsplänen („Rate Sondertilgung Haus“) und dem Reiter Kredite. Was ihr tatsächlich sondertilgt, pflegt ihr dort ein – hier erscheint es automatisch.</p>
    <table class="stab"><tr><th>Jahr</th><th class="num">eigene Sondertilgung</th><th></th></tr>${eigL.map(x=>`<tr><td>${x.ym.slice(0,4)}</td><td class="num">${eur(x.b,0)}</td><td class="muted">${x.gespart?(f.eigenArt==='streichen'?'gestrichen':'gespart → Eigenkapital'):'an die Sparda'}</td></tr>`).join('')}${c.eigJahr?`<tr><td>${c.abl.slice(0,4)} (Jan–${MS[+c.abl.slice(5)-1]})</td><td class="num">${eur(c.eigJahr,0)}</td><td class="muted">gespart → Eigenkapital</td></tr>`:''}${!eigL.length&&!c.eigJahr?'<tr><td colspan="3" class="muted">keine</td></tr>':''}${c.tr.filter(t=>/Sparda/.test(t.was)).map(t=>`<tr><td>${t.ym.slice(0,4)}</td><td class="num">${eur(t.b,0)}</td><td class="muted">von Petra (Tranche)</td></tr>`).join('')}</table>
    ${c.early?`<div class="note">Kommt Petras Geld früher, füllt es die Sondertilgungs-Grenze der Sparda (${eur(K().sparda.sonderMax||17250,0)} im Jahr) allein aus. Eure eigenen ${eur(c.eigSpar,0)} Sondertilgungs-Raten legt ihr ab ${c.geld.slice(0,4)} aufs Tagesgeld und setzt sie ${ymName(c.abl)} als Eigenkapital ein – gleiche Wirkung, aber das Geld bleibt bis dahin für Notfälle greifbar. </div><div class="seg fseg" style="margin-top:8px"><button type="button" data-feigen="sparen" ${f.eigenArt!=='streichen'?'aria-pressed="true"':''}>sparen → Eigenkapital 2033</button><button type="button" data-feigen="streichen" ${f.eigenArt==='streichen'?'aria-pressed="true"':''}>streichen (mehr Luft im Monat)</button></div><div class="note">${f.eigenArt==='streichen'?'Gestrichen: Die Raten stehen euch monatlich zur Verfügung; der Bankrest '+c.abl.slice(0,4)+' wird um '+eur(c.eigSpar,0)+' größer.':'Gespart: Das Geld geht wie bisher vom Girokonto weg, landet aber auf dem Tagesgeld statt bei der Sparda.'}</div>${fEigenVglHTML(f)}`:''}
    <div class="form" style="margin-top:10px"><label>Korrektur: zusätzlich getilgt (+) oder weniger (−) ${fNum('f-sonderKorr',f.sonderKorr,'€')}</label></div>
    <div class="mu-box">${fRow('Restschuld Sparda '+ymName(c.abl)+' laut Plan',eur(c.rest0,0))}${(+f.sonderKorr)?fRow('Korrektur','− '+eur(f.sonderKorr,0)):''}${fRow('<b>Restschuld zur Ablösung</b>','<b>'+eur(c.rest,0)+'</b>')}${c.eigSpar?fRow('gespartes Sondertilgungsgeld (zählt in Schritt 5 als Eigenkapital)',eur(c.eigSpar,0)):''}</div>
    <h3>Bausparvertrag</h3>
    <label class="chk"><input type="checkbox" id="f-bausparAuf" ${f.bausparAuf?'checked':''}> Bausparvertrag zur Ablösung auflösen und Guthaben in die Sparda stecken</label>
    <div class="note">Guthaben ${ymName(c.abl)}: ca. <b>${eur(fBauspar(c.abl),0)}</b> (${eur(K().bauspar.saldo,0)} + ${eur(K().bauspar.monat,0)} monatlich). Das Bauspardarlehen braucht ihr dann nicht; die ${eur(K().bauspar.monat,0)} im Monat fallen weg.</div>
    </div>`+btns();}
  else if(step===3){const auto=fEkAuto(c.abl);h=`<div class="card"><h2>4 · Eigenkapital und ING-Kredit</h2>
    <p class="sub">Laut Ausblick hättet ihr im ${ymName(c.abl)} zusammen etwa <b>${eur(auto,0)}</b> (Tagesgeld Till + Patrick + Gold) – der Ausblick rechnet aber ohne Unvorhergesehenes. Vorsichtig geschätzt habt ihr mit 30.000 € gerechnet. Einen Notgroschen (3 Monatsausgaben) solltet ihr behalten.${c.early?' Kommt Petras Geld früher, zahlt ihr ihre Rate schon vor der Ablösung – ob dann trotzdem genug übrig bleibt, zeigt im Ergebnis die Karte „Tragbar je Person?“.':''}</p>
    <div class="form"><label>Eigenkapital, das ihr einsetzt ${fNum('f-ek',f.ek==null||f.ek===''?auto:f.ek,'€')}</label><button type="button" class="btn sec sm" data-fekauto>Wert aus dem Ausblick nehmen</button></div>
    <label class="chk" style="margin-top:10px"><input type="checkbox" id="f-ingFirst" ${f.ingFirst?'checked':''}> Zuerst den ING-Kredit (${num(K().ing.zins)} %) ablösen – der ist teurer als die Sparda</label>
    <div class="mu-box">${fRow('ING-Rest im '+ymName(c.abl),c.ingRest>0?eur(c.ingRest,0):'schon abbezahlt ✓')}${c.ingRest>0?fRow('davon aus Eigenkapital',eur(c.ekIng,0))+fRow('ING bleibt übrig',c.ingBleibt>0?eur(c.ingBleibt,0)+' (läuft weiter)':'0 € ✓'):''}${fRow('Eigenkapital für die Sparda',eur(c.ekSp,0))}</div>
    </div>`+btns();}
  else if(step===4){h=`<div class="card"><h2>5 · Der Rest bei einer Bank</h2>
    <p class="sub">Was nach Petra, Bausparguthaben und Eigenkapital übrig bleibt, finanziert ihr neu – bei der Sparda mit gesenkter Rate oder (wahrscheinlicher) bei einer anderen Bank mit niedriger Pflichtrate und voller Sondertilgung (z. B. ING).</p>
    <div class="mu-box">${fRow('Restschuld Sparda '+ymName(c.abl),eur(c.rest,0))}${fRow('− Bausparguthaben','− '+eur(c.bs,0))}${fRow('− Darlehen Petra (zur Ablösung)','− '+eur(c.petraAbl,0))}${c.trSum?fRow('− Petra-Tranchen vorher (in Restschuld enthalten)',eur(c.trSum,0),'muted'):''}${fRow('− Eigenkapital','− '+eur(c.ekSp,0))}${c.extraEk?fRow(c.early?'− gespartes Sondertilgungsgeld (eigene Raten ab '+c.geld.slice(0,4)+')':'− im '+c.abl.slice(0,4)+' angespartes Sondertilgungsgeld (Jan–'+MS[+c.abl.slice(5)-1]+')','− '+eur(c.extraEk,0)):''}${fRow('<b>Rest bei der Bank</b>',`<b>${eur(c.bankRest,0)}</b>`)}${c.uebrig>0?fRow('bleibt sogar übrig',eur(c.uebrig,0),'pos'):''}</div>
    <div class="form" style="margin-top:10px"><label>Zins neuer Kredit ${fNum('f-bankZins',f.bankZins,'%',80)}</label><label>Pflichtrate (Minimum) ${fNum('f-pflicht',f.pflicht,'€',90)}</label><label>was ihr wirklich zahlt (Rate + Sondertilgung) ${fNum('f-zahlung',f.zahlung,'€',90)}</label></div>
    <div class="note">Die Pflichtrate ist das, was ihr in schlechten Monaten mindestens zahlen müsst. Alles darüber ist freiwillig und beschleunigt das Ende. Bisher gehen ${eur(c.vorher,0)} an Sparda, ING und Bausparkasse.</div>
    </div>`+btns();}
  else if(step===5){const r=c.rente;const stopArt=f.stopArt||'geld';h=`<div class="card"><h2>6 · Petra: Arbeit und Rente</h2>
    <p class="sub">Petra ist im April 1964 geboren. Regelaltersrente mit 67 → ab <b>${ymName(r.regel)}</b>. 45 Beitragsjahre erreicht sie laut Rentenauskunft nicht, eine abschlagsfreie Rente vor 67 gibt es deshalb nicht; früher nur ab 63 mit 0,3 % Abschlag je Monat.</p>
    <div class="form"><label>Gehalt netto heute ${fNum('f-gehalt',f.gehalt,'€',90)}</label><label>Rente brutto laut Rentenauskunft (mit 67) ${fNum('f-renteBrutto',f.renteBrutto,'€',90)}</label><label>Was Petra im Monat wirklich braucht ${fNum('f-bedarf',c.bedarf,'€',90)}</label></div>
    <div class="note">Vorgabe = heutiges Netto. Ohne Arbeit fallen Fahrtkosten und Ähnliches weg, vielleicht reichen ihr auch 1.100 €. Mit diesem Betrag rechnet die Lücke unten.</div>
    <h3>Wann in Rente?</h3>
    <div class="seg fseg">${[['regel','mit 67 (ohne Abschlag)'],['66','mit 66 (−3,6 %)'],['65','mit 65 (−7,2 %)'],['64','mit 64 (−10,8 %)'],['63','mit 63 (−14,4 %)']].map(([k,l])=>`<button type="button" data-frente="${k}" ${f.renteArt===k?'aria-pressed="true"':''}>${l}</button>`).join('')}</div>
    <div class="mu-box">${fRow('Rentenbeginn',ymName(r.ab))}${r.absch?fRow('Abschlag dauerhaft','− '+num(r.absch,1)+' %','neg'):''}${fRow('Rente brutto',eur(r.brutto,0))}${fRow('Rente netto (geschätzt, nach KV/PV)',eur(r.netto,0))}</div>
    <h3>Wann hört Petra auf zu arbeiten?</h3>
    <p class="sub">Das ist Petras Bedingung: Ohne euer Darlehen könnte sie mit dem Geld aus dem Hausverkauf sofort aufhören und bis zur Rente davon leben. Das darf sie durch das Darlehen nicht verlieren – deshalb beginnt eure Rate in dem Monat, in dem sie aufhört, und ihre Reserve deckt den Rest.</p>
    <div class="seg fseg"><button type="button" data-fstop="geld" ${stopArt==='geld'?'aria-pressed="true"':''}>sobald das Geld da ist (${ymName(c.geld<r.ab?c.geld:ymAdd(r.ab,-1))})</button><button type="button" data-fstop="rente" ${stopArt==='rente'?'aria-pressed="true"':''}>bis zur Rente</button><button type="button" data-fstop="monat" ${stopArt==='monat'?'aria-pressed="true"':''}>anderer Monat</button></div>
    ${stopArt==='monat'?`<div class="form" style="margin-top:10px"><label>Letzter Arbeitsmonat ${fYmIn('f-stop',f.stop)}</label></div>`:''}
    <div class="mu-box">${fRow('letzter Arbeitsmonat',ymName(c.stop))}${fRow('eure Rate läuft ab',ymName(c.rateStart))}
    ${c.lueckeMon?fRow('Monate ohne Gehalt und ohne Rente',c.lueckeMon)+fRow('Bedarf in dieser Zeit ('+eur(c.bedarf,0)+' / Monat)',eur(c.lueckeOhne,0))+fRow('davon aus eurer Rate ('+eur(c.rateVor,0)+' / Monat ab '+ymName(c.rateStart)+')',eur(c.lueckeRate,0))+fRow('aus Petras Reserve ('+eur(Math.max(0,c.bedarf-c.rateVor),0)+' / Monat)',eur(c.lueckeKosten,0),c.lueckeKosten>c.reserve?'neg':''):fRow('Lücke bis zur Rente','keine – Petra arbeitet bis zum Rentenbeginn')}
    ${fRow('Reserve laut Schritt 1',eur(c.reserve,0))}${c.lueckeKosten>c.reserve?`<div class="note neg">⚠️ Die Reserve reicht nicht: ${eur(c.lueckeKosten-c.reserve,0)} fehlen. Darlehen kleiner machen (Schritt 1) oder die Rate bis zur Rente erhöhen (Schritt 2).</div>`:c.lueckeMon?`<div class="note">Nach der Lücke bleiben Petra noch ${eur(c.reserve-c.lueckeKosten,0)} Reserve.${c.rateVor>=c.bedarf?' Eure Rate deckt ihren Bedarf komplett – die Reserve bleibt unangetastet; ihr könntet die Rate bis zur Rente also auch kleiner wählen (Schritt 2).':''}</div>`:''}</div>
    <div class="mu-box">${fRow('ab '+ymName(r.ab)+': Rente netto + eure Rate',`<b>${eur(r.netto+(+f.rate||0),0)}</b>`)}<div class="note">Zum Vergleich: heute verdient Petra ${eur(f.gehalt,0)} netto. Ohne das Darlehen hätte sie ab der Rente nur ${eur(r.netto,0)} – plus das, was vom Erlös nach der Überbrückung (${eur(c.lueckeOhne,0)}) noch übrig wäre.${c.lueckeMon?` Mit Darlehen hat sie bis zur Rente ${eur(c.rateVor,0)} von euch${c.bedarf>c.rateVor?' + '+eur(c.bedarf-c.rateVor,0)+' aus der Reserve':''} = ${eur(Math.max(c.bedarf,c.rateVor),0)} im Monat.`:''}</div></div>
    </div>`+btns();}
  else {const r=c.rente;const pf=c.bPf,za=c.bZa;const endeZa=za.at(-1)?.ym,endePf=pf.at(-1)?.ym;const frei=endeZa&&c.pEnde?(endeZa>c.pEnde?endeZa:c.pEnde):(endeZa||c.pEnde);
    const spar=c.ohneZins-c.mitZins;
    h=fAmpelHTML(c,f)+`<div class="grid">${kpi('Ablösung Sparda',ymName(c.abl),c.geld<KUEND?'mit Tranchen ab '+ymName(c.geld):'Kündigung 6 Monate vorher')}
      ${kpi('Rest bei der Bank',eur(c.bankRest,0),c.bankRest>0?`Pflichtrate ${eur(f.pflicht,0)}, Zins ${num(f.bankZins)} %`:'komplett bankfrei ✓',c.bankRest>0?'':'pos')}
      ${kpi('Bankfrei',endeZa?ymName(endeZa):(c.bankRest>0?'–':ymName(c.abl)),c.bankRest>0?`bei ${eur(f.zahlung,0)} im Monat; mit Pflichtrate ${endePf?ymName(endePf):'–'}`:'')}
      ${kpi('Zinsen gespart',eur(spar,0),`statt ${eur(c.ohneZins,0)} (Sparda bis ${c.ohneEnde?ymName(c.ohneEnde):'–'}) nur ${eur(c.mitZins,0)}`,spar>0?'pos':'neg')}</div>
    <div class="card" style="margin-top:12px"><h2>Auf einen Blick</h2><ol class="flist fklar">${(()=>{const L=[];
      if(c.tr.length)L.push([c.tr[0].ym,`Petras Geld kommt, erste Tranche (${c.tr[0].was}).`]);
      L.push([c.abl,`Sparda abgelöst${c.bankRest>0?`, ${eur(c.bankRest,0)} laufen bei einer neuen Bank weiter`:', keine Bank mehr'}.`]);
      if(c.stop<ymAdd(c.rente.ab,-1))L.push([ymAdd(c.stop,1),`Petra hört auf zu arbeiten, bekommt ab ${ymName(c.rateStart)} ${eur(c.rateVor,0)} von euch.`]);
      L.push([c.rente.ab,`Petra geht in Rente: ${eur(c.rente.netto,0)} Rente + ${eur(f.rate,0)} von euch = ${eur(c.rente.netto+(+f.rate||0),0)} im Monat.`]);
      if(c.bankRest>0&&endeZa)L.push([endeZa,`Bank abbezahlt (bei ${eur(f.zahlung,0)} im Monat).`]);
      if(c.pEnde)L.push([c.pEnde,`Petra abbezahlt (${eur(f.darlehen,0)} + ${eur(c.pZins,0)} Zinsen).`]);
      if(frei)L.push([frei,`<b>Komplett schuldenfrei.</b> Ohne Petra wärt ihr es erst ${c.ohneEnde?ymName(c.ohneEnde):'–'} gewesen.`]);
      return L.sort((x,y)=>x[0].localeCompare(y[0])).map(([ym,t])=>`<li><b>${ymName(ym)}</b> – ${t}</li>`).join('');})()}</ol></div>
    ${c.bankRest>0?(()=>{const v=fBankVgl(f,c);return `<div class="card" style="margin-top:12px"><h2>Wie viel an die Bank?</h2><p class="sub">Antippen, um die Zahlung an die Bank zu wechseln – Diagramm, Ablauf und Tragbarkeit rechnen sofort mit. Die Pflichtrate bleibt immer ${eur(f.pflicht,0)}; alles darüber ist freiwillig.</p>
      <div class="seg fseg">${v.map(x=>`<button type="button" data-fzahl="${x.z}" ${x.akt?'aria-pressed="true"':''}>${eur(x.z,0)}${x.pflicht?' (Pflicht)':''}</button>`).join('')}</div>
      <table class="stab ftrag" style="margin-top:8px"><tr><th>an die Bank</th><th>+ Petra = gesamt</th><th>Bank fertig</th><th class="num">Zinsen Bank</th><th>schuldenfrei</th></tr>${v.map(x=>`<tr${x.akt?' class="akt"':''}><td>${eur(x.z,0)}${x.pflicht?' (Pflicht)':''}</td><td>${eur(x.gesamt,0)}</td><td>${x.ende?ymName(x.ende):'–'}</td><td class="num">${eur(x.zi,0)}</td><td>${x.frei?ymName(x.frei):'–'}</td></tr>`).join('')}</table>
      <div class="note">„gesamt“ = Zahlung an die Bank + ${eur(f.rate,0)} an Petra. Schuldenfrei = Bank und Petra beide abbezahlt (Petra: ${c.pEnde?ymName(c.pEnde):'–'}). Heute zahlt ihr ${eur(c.vorher,0)}.</div></div>`;})():''}
    <div class="g2" style="margin-top:12px"><div class="card"><h2>So läuft es ab</h2>
      <ol class="flist">${c.tr.map(t=>`<li><b>${ymName(t.ym)}</b> – Petra gibt ${eur(t.b,0)}: ${t.was}.</li>`).join('')}
      <li><b>${ymName(ymAdd(c.abl,-6))}</b> – Sparda-Darlehen kündigen (schriftlich, § 489 BGB, Teilkündigung in Höhe der Ablösesumme).</li>
      <li><b>${ymName(c.abl)}</b> – Ablösung: Restschuld ${eur(c.rest,0)} − Bausparguthaben ${eur(c.bs,0)} − Petra ${eur(c.petraAbl,0)} − Eigenkapital ${eur(c.ekSp,0)}${c.extraEk?` − ${eur(c.extraEk,0)} gespartes Sondertilgungsgeld`:''}${c.ingRest>0?` (vorher ING mit ${eur(c.ekIng,0)} ablösen)`:''} → <b>${c.bankRest>0?eur(c.bankRest,0)+' neu finanzieren':'nichts mehr offen bei der Bank'}</b>.</li>
      ${c.vorZins.length?`<li><b>${ymName(ymAdd(c.pStart,1))} – ${ymName(ymAdd(c.rateStart,-1))}</b> – an Petra nur die Zinsen (${eur(c.vorZins[0],0)} bis ${eur(c.vorZins.at(-1),0)} im Monat).</li>`:''}${c.stop<ymAdd(c.rente.ab,-1)?`<li><b>${ymName(ymAdd(c.stop,1))}</b> – Petra hört auf zu arbeiten${c.lueckeMon?`; bis ${ymName(ymAdd(c.rente.ab,-1))} lebt sie von eurer Rate (${eur(c.rateVor,0)})${c.lueckeKosten?` und ${eur(c.lueckeKosten,0)} aus ihrer Reserve`:''}`:''}.</li>`:''}${c.rateStart<c.rente.ab?`<li><b>${ymName(c.rateStart)} – ${ymName(ymAdd(c.rente.ab,-1))}</b> – ${eur(c.rateVor,0)} monatlich an Petra (${num(f.zins)} %), bis zu ihrer Rente.</li><li><b>ab ${ymName(c.rente.ab)}</b> – ${eur(f.rate,0)} monatlich, bis <b>${c.pEnde?ymName(c.pEnde):'–'}</b>; Zinsen gesamt ${eur(c.pZins,0)}.</li>`:`<li><b>ab ${ymName(c.rateStart)}</b> – ${eur(f.rate,0)} monatlich an Petra (${num(f.zins)} %), bis <b>${c.pEnde?ymName(c.pEnde):'–'}</b>; Zinsen gesamt ${eur(c.pZins,0)}.</li>`}
      ${c.bankRest>0?`<li><b>ab ${ymName(ymAdd(c.abl,1))}</b> – Bankkredit: Pflichtrate ${eur(f.pflicht,0)} (fertig ${endePf?ymName(endePf):'–'}, Zinsen ${eur(c.bZiPf,0)}); mit ${eur(f.zahlung,0)} im Monat fertig <b>${endeZa?ymName(endeZa):'–'}</b> (Zinsen ${eur(c.bZiZa,0)}).</li>`:''}
      ${c.ingBleibt>0?`<li>ING läuft mit ${eur(K().ing.rate,0)} weiter (Rest ${eur(c.ingBleibt,0)}).</li>`:''}
      <li><b>${frei?ymName(frei):'–'}</b> – alles abbezahlt, auch bei Petra.</li></ol></div>
    <div class="card"><h2>Monatliche Belastung</h2>
      ${fRow('heute (Sparda + ING + Bausparen)',eur(c.vorher,0))}${c.early?fRow(ymName(c.rateStart)+' – '+ymName(c.abl)+' (Sparda + Bausparen + Petra '+eur(c.rateVor,0)+(c.rateVor!==(+f.rate||0)&&c.rente.ab<=c.abl?' → '+eur(f.rate,0)+' ab '+ymName(c.rente.ab):'')+', ING weg)',eur(c.zwischen,0),c.zwischen>c.vorher?'neg':'pos')+(c.zwischen>c.vorher?`<div class="note">Das sind ${eur(c.zwischen-c.vorher,0)} mehr als heute. Wird das zu eng, gibt es zwei Stellschrauben: die eigenen Sondertilgungs-Raten (ca. ${eur(c.eigSpar/Math.max(1,fMonDiff(c.rateStart,c.abl)+1),0)} im Monat) nicht sparen, sondern ganz streichen – dann wird der Bankrest ${c.abl.slice(0,4)} um ${eur(c.eigSpar,0)} größer; oder Petra behält mehr vom Erlös für sich (Schritt 1, Darlehen kleiner) und lebt davon bis zur Rente, dann beginnt eure Rate erst später.</div>`:''):''}${fRow('nach der Ablösung – Pflicht',eur(c.nachherPf,0),'pos')}${fRow('nach der Ablösung – geplant',eur(c.nachherZa,0))}${fRow('davon fest an Petra',eur(c.rateAbl,0)+(c.rateAbl!==(+f.rate||0)?` (ab ${ymName(c.rente.ab)}: ${eur(f.rate,0)})`:''))}
      <div class="note">Pflicht = Petra + Mindestrate Bank. Alles darüber ist freiwillig; in einem schlechten Monat könnt ihr auf ${eur(c.nachherPf,0)} runtergehen.</div>
      <h3>Petras Einkommen</h3>
      ${fRow('bis '+ymName(c.stop)+': Gehalt netto',eur(f.gehalt,0))}${c.lueckeMon?fRow(`${ymName(ymAdd(c.stop,1))} – ${ymName(ymAdd(r.ab,-1))}: eure Rate${c.lueckeKosten?' + Reserve':''}`,eur(c.rateVor,0)+(c.lueckeKosten?' + '+eur(c.lueckeKosten/c.lueckeMon,0):''),''):''}${fRow('ab '+ymName(r.ab)+': Rente netto'+(r.absch?` (−${num(r.absch,1)} %)`:'')+' + eure Rate',`<b>${eur(r.netto+(+f.rate||0),0)}</b>`)}${fRow('ab '+ymName(ymAdd(c.pEnde||r.ab,1))+' (Darlehen zurückgezahlt): nur Rente',eur(r.netto,0))}${c.lueckeMon?fRow('Reserve nach der Überbrückung',eur(c.reserve-c.lueckeKosten,0),c.reserve-c.lueckeKosten<0?'neg':''):''}
    </div></div>
    ${(()=>{const t=fTragbar(f,c);const neg=v=>v<0?'neg':v<100?'warn':'pos';const col=sh=>sh==='TILL'?'var(--till)':'var(--pat)';
      const segA=`<div class="seg fseg">${[[50,'50 / 50'],[60,'60 / 40'],[70,'70 / 30']].map(([v,l])=>`<button type="button" data-fanteil="${v}" ${(+f.anteilTill||50)===v?'aria-pressed="true"':''}>${l}</button>`).join('')}</div>`;
      const segE=c.early?`<div class="seg fseg" style="margin-top:6px"><button type="button" data-feigen="sparen" ${f.eigenArt!=='streichen'?'aria-pressed="true"':''}>Sondertilgungs-Raten sparen</button><button type="button" data-feigen="streichen" ${f.eigenArt==='streichen'?'aria-pressed="true"':''}>streichen</button></div>`:'';
      const tbl=c.early?`<h3>Bis zur Ablösung (${ymName(c.rateStart)} – ${ymName(c.abl)})</h3><table class="stab ftrag"><tr><th>Jahr</th><th class="num" style="color:var(--till)">Till heute</th><th class="num" style="color:var(--till)">mit Petra</th><th class="num" style="color:var(--pat)">Patrick heute</th><th class="num" style="color:var(--pat)">mit Petra</th></tr>${t.jahre.map(o=>`<tr><td>${o.y}</td><td class="num">${eur(o.TILL.rest,0)}</td><td class="num ${neg(o.TILL.nach)}">${eur(o.TILL.nach,0)}</td><td class="num">${eur(o.PATRICK.rest,0)}</td><td class="num ${neg(o.PATRICK.nach)}">${eur(o.PATRICK.nach,0)}</td></tr>`).join('')}</table><div class="note">„heute“ = was laut Monatsplan nach allen Ausgaben aufs Tagesgeld geht (Rest Gehalt, Jahresdurchschnitt). „mit Petra“ = davon − Anteil an Petras Rate + wegfallende ING-Rate${t.streichen?' + gestrichene Sondertilgungs-Rate':''}. Patricks Plangehalt ist fest (Spesen und Gehaltserhöhungen stehen nicht im Plan).</div>`:'';
      const n=t.nach;return `<div class="card"><h2>Tragbar je Person?</h2><div class="row"><span>Aufteilung der Petra-Rate (Till / Patrick)</span><b class="num">${eur(t.share.TILL,0)} / ${eur(t.share.PATRICK,0)}</b></div>${segA}${segE}${c.early?fEigenVglHTML(f):''}${tbl}
      <h3>Nach der Ablösung (ab ${ymName(ymAdd(c.abl,1))})</h3><table class="stab ftrag"><tr><th></th><th class="num" style="color:var(--till)">Till</th><th class="num" style="color:var(--pat)">Patrick</th></tr><tr><td>heute laut Plan</td><td class="num">${eur(t.p1.TILL.rest,0)}</td><td class="num">${eur(t.p1.PATRICK.rest,0)}</td></tr><tr><td>mit Petra, Bank-Pflichtrate ${eur(f.pflicht,0)}</td><td class="num ${neg(n.pf.TILL)}">${eur(n.pf.TILL,0)}</td><td class="num ${neg(n.pf.PATRICK)}">${eur(n.pf.PATRICK,0)}</td></tr><tr><td>mit Petra, geplante Zahlung ${eur(f.zahlung,0)}</td><td class="num ${neg(n.za.TILL)}">${eur(n.za.TILL,0)}</td><td class="num ${neg(n.za.PATRICK)}">${eur(n.za.PATRICK,0)}</td></tr></table>
      <div class="note">Nach der Ablösung fallen Sparda-Rate und Bausparen (${eur(fHausAlt(),0)}) weg, dafür kommen Bankrate und Petra; ING und Sondertilgungen entfallen. Rot = Minus, gelb = unter 100 € Puffer. Steigt Patricks Gehalt im Haushaltsbuch, rechnet diese Karte automatisch mit.</div></div>`;})()}
    <div class="card" style="margin-top:12px"><h2>Restschuld im Vergleich</h2><div class="legend"><span><i style="background:var(--till)"></i>Sparda ohne Petra</span><span><i style="background:var(--gem)"></i>Bank neu (geplante Zahlung)</span><span><i style="background:var(--pat)"></i>Darlehen Petra</span></div><div id="f-chart" class="chart"></div></div>
    <div class="card" style="margin-top:12px"><h2>Unsere Empfehlung</h2><ul class="flist">
      <li>${c.bankRest>0?`Den Rest von ${eur(c.bankRest,0)} bei einer Bank mit niedriger Pflichtrate (${eur(f.pflicht,0)}) und freier Sondertilgung aufnehmen – so bleibt ihr flexibel und seid ${endeZa?'bis '+ymName(endeZa):''} bankfrei.`:'Ihr braucht keine Bank mehr – nur noch den Vertrag mit Petra.'}</li>
      <li>Vertrag mit Petra schriftlich, ${num(f.zins)} % Zins, ${c.rateVor!==(+f.rate||0)?`gestaffelt ${eur(c.rateVor,0)} bis ${ymName(ymAdd(c.rente.ab,-1))}, danach ${eur(f.rate,0)}`:eur(f.rate,0)} monatlich per Dauerauftrag, keine Grundschuld, Risikolebensversicherung habt ihr schon. Till und Patrick gemeinsam als Darlehensnehmer.</li>
      <li>Bis ${ymName(c.abl)}: ING zuerst tilgen (teuerster Kredit), ${c.early?'eigene Sondertilgungs-Raten ab '+c.geld.slice(0,4)+' aufs Tagesgeld legen (Petras Tranchen füllen die Sparda-Grenze), ':'geplante Sondertilgungen bei der Sparda durchziehen, '}Notgroschen behalten.</li>
      <li>Petra behält ${eur(c.reserve,0)} Reserve${c.lueckeMon?` – davon ${eur(c.lueckeKosten,0)} für die Zeit ohne Gehalt (${ymName(ymAdd(c.stop,1))} – ${ymName(ymAdd(c.rente.ab,-1))}); eure Rate läuft ab ${ymName(c.rateStart)}${c.rateStart<c.rente.ab?` mit ${eur(c.rateVor,0)}, ab ${ymName(c.rente.ab)} ${eur(f.rate,0)}`:''}`:''}.</li>
      <li>Ein Jahr vor der Ablösung: Angebote für den Restkredit einholen und Sparda-Kündigung vorbereiten (6 Monate Frist).</li></ul>
      <div class="note">Alle Zahlen kommen live aus dem Haushaltsbuch (Kredite, Monatspläne, Tagesgeld, Gold). Ändert sich dort etwas, rechnet dieser Reiter automatisch neu. Nichts hier verändert Pläne oder Kredite.</div></div>`+btns();}
  el.innerHTML=nav+h;
  if(step===FSTEPS.length-1){const ch=$('#f-chart');const by={};const put=(k,rows)=>rows.forEach(r=>{(by[r.ym]=by[r.ym]||{})[k]=r.st;});put('o',c.ohne);put('b',c.bZa);put('p',c.pRows);
    const labels=Object.keys(by).filter(ym=>ym>=TODAY.slice(0,7)&&ym.endsWith('-12')).sort();    const fill=(k,rows)=>labels.map(ym=>{const r=by[ym]?.[k];if(r!=null)return r;const first=rows[0]?.ym,last=rows.at(-1)?.ym;if(!first)return null;return ym<first?(k==='o'?null:0):ym>last?0:null;});
    lineChart(ch,labels,[{n:'Sparda ohne Petra',c:'var(--till)',v:fill('o',c.ohne)},{n:'Bank neu',c:'var(--gem)',v:fill('b',c.bZa)},{n:'Darlehen Petra',c:'var(--pat)',v:fill('p',c.pRows)}],{xl:l=>l.slice(0,4),xt:l=>'Ende '+l.slice(0,4)});}
}
/* Eingaben */
document.addEventListener('click',e=>{const el=e.target.closest('#p-familie [data-fstep],#p-familie [data-fgeld],#p-familie [data-frente],#p-familie [data-fstop],#p-familie [data-fanteil],#p-familie [data-fzahl],#p-familie [data-feigen],#p-familie [data-fekauto]');if(!el)return;el.blur();
  if(el.dataset.fstep!=null){fSet(d=>d.step=+el.dataset.fstep);window.scrollTo({top:0,behavior:'smooth'});}
  else if(el.dataset.fgeld){fSet(d=>{d.geldArt=el.dataset.fgeld;if(d.geldArt==='kuend')d.geld=KUEND;else if(d.geldArt==='frueh'&&!(normYm(d.geld)<KUEND))d.geld='2029-01';else if(d.geldArt==='spaet'&&!(normYm(d.geld)>KUEND))d.geld='2036-01';});}
  else if(el.dataset.frente){fSet(d=>d.renteArt=el.dataset.frente);}
  else if(el.dataset.fzahl){fSet(d=>d.zahlung=+el.dataset.fzahl);}
  else if(el.dataset.fanteil){fSet(d=>d.anteilTill=+el.dataset.fanteil);}
  else if(el.dataset.feigen){fSet(d=>d.eigenArt=el.dataset.feigen);}
  else if(el.dataset.fstop){fSet(d=>{d.stopArt=el.dataset.fstop;if(d.stopArt==='monat'&&!normYm(d.stop))d.stop='2030-12';});}
  else if(el.dataset.fekauto!=null){fSet(d=>d.ek=null);}});
document.addEventListener('change',e=>{const t=e.target;if(!t.closest||!t.closest('#p-familie'))return;const id=(t.id||'').replace(/^f-/,'');if(!id)return;t.blur();
  fSet(d=>{if(t.type==='checkbox')d[id]=t.checked;else if(t.type==='month')d[id]=t.value||'';else{const v=parseNum(t.value);d[id]=v==null?(['ek','rateVor','bedarf'].includes(id)?null:0):v;}});});
