(function(){
'use strict';
const TABS=[['heute','Übersicht'],['monat','Monat'],['fewo','Urlaubskonto'],['kredite','Kredite'],['vermoegen','Vermögen'],['bald','Ausblick'],['strom','Strom'],['einst','Einstellungen']];
const MN=['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
const MS=['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
const OZ=31.1035;
const $=s=>document.querySelector(s);const $$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const eur=(v,d=2)=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',minimumFractionDigits:d,maximumFractionDigits:d}).format(v||0);
const num=(v,d=2)=>(v==null||v==='')?'':Number(v).toLocaleString('de-DE',{minimumFractionDigits:d,maximumFractionDigits:d});
const parseNum=s=>{if(typeof s==='number')return s;s=String(s??'').trim().replace(/\s|€/g,'');if(!s)return null;if(s.includes(','))s=s.replace(/\./g,'').replace(',','.');const v=Number(s);return isFinite(v)?v:null;};
const r2=x=>Math.round((+x||0)*100)/100;
const now=new Date();const CUR=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
const TODAY=now.toISOString().slice(0,10);
/* Monat aus verschiedenen Schreibweisen: 2026-08, 08.2026, 8/2026, August 2026 → '2026-08'; sonst null */
const YMN=['jan','feb','mär','apr','mai','jun','jul','aug','sep','okt','nov','dez'];
function normYm(v){if(v==null)return null;const s=String(v).trim().toLowerCase().replace('maerz','märz');let m;
  if((m=s.match(/^(\d{4})-(\d{1,2})(-\d{1,2})?$/)))return +m[2]>=1&&+m[2]<=12?`${m[1]}-${m[2].padStart(2,'0')}`:null;
  if((m=s.match(/^(?:\d{1,2}\.)?(\d{1,2})[./ -](\d{4})$/)))return +m[1]>=1&&+m[1]<=12?`${m[2]}-${m[1].padStart(2,'0')}`:null;
  if((m=s.match(/^([a-zä]{3})[a-zä]*\.? ?(\d{4})$/))){const i=YMN.indexOf(m[1]);return i>=0?`${m[2]}-${String(i+1).padStart(2,'0')}`:null;}return null;}
const ymAdd=(ym,n)=>{let[y,m]=String(ym).split('-').map(Number);m+=n;y+=Math.floor((m-1)/12);m=((m-1)%12+12)%12+1;return `${y}-${String(m).padStart(2,'0')}`};
const ymName=ym=>{const[y,m]=ym.split('-');return `${MN[+m-1]} ${y}`};
const ymShort=ym=>{const[y,m]=ym.split('-');return `${MS[+m-1]} ${y.slice(2)}`};
const ymNum=ym=>{const[y,m]=ym.split('-').map(Number);return y*12+m;};
const uid=()=>Math.random().toString(36).slice(2,9);
const APPV={nr:'2.6',datum:'30.10.2026'};/* Nur an einem neuen Tag hochzählen (gleicher Tag = gleiche Nummer) */
const PLAN0='2026-10',PLAN1='2040-12',MIN_M='2026-09';

const S={plan:{},budget:{},fewo:{},grund:{items:[]},archiv:null,urlaub:{start:0,e:[]},strom:{m:{}},kredit:null,bcfg:{essen:350,sonst:[{ab:'2026-01',v:100}],dauerauftrag:['Wasserabgabe','Grundsteuer']},einst:{},steuer:{fw:86,rest:106,afa:0,direkt:0,energie:0},live:{}};
let db=null,tab='heute',month=CUR<PLAN0?PLAN0:CUR,sampleFn=null,dlFn=null;
window.__S=S;

/* ---------- Grundbeträge & Formeln ---------- */
let GYM=null;
const liveGold=()=>{const L=S.live?.gold;if(!L?.preis)return null;const it=S.grund.items.find(i=>i.k==='goldpreis');return (!it?.am||L.am>it.am)?L:null;};
const goldAm=()=>liveGold()?.am||S.grund.items.find(i=>i.k==='goldpreis')?.am||null;
const gv=(k,ym)=>{if(k==='goldpreis'){const L=liveGold();if(L)return +L.preis;}const it=S.grund.items.find(i=>i.k===k);if(!it)return null;const at=ym||GYM;if(at&&it.fmt!=='date'&&((it.bis&&at>it.bis)||(it.cu?.ab&&at<it.cu.ab)))return 0;let v=it.v;if(at)(it.hist||[]).slice().sort((a,b)=>a.ab.localeCompare(b.ab)).forEach(h=>{if(h.ab<=at)v=h.v;});if(at&&it.bsch&&BSJ[k])Object.values(it.bsch).filter(b=>b.ab&&b.ab<=at).sort((a,b)=>a.ab.localeCompare(b.ab)).forEach(b=>{v=b.j;});return v;};
const gn=(k,ym)=>+gv(k,ym)||0;
const VCACHE={};function useYm(ym){GYM=ym;VARS=VCACHE[ym]||(VCACHE[ym]=vars());return VARS;}
function varsReset(){Object.keys(VCACHE).forEach(k=>delete VCACHE[k]);}
function baseVars(){const g=GYM;GYM=null;const v=vars();GYM=g;return v;}
/* Vorjahres-Ansparung (Wasser, Grundsteuer): Ändert sich der Jahresbetrag mitten im Jahr (z. B. neuer Bescheid ab Februar),
   wird das in den Vormonaten bereits Angesparte verrechnet: Rest des Jahresbetrags / verbleibende Monate. Ab Januar wieder Jahresbetrag / 12. */
/* Bescheide (Wasser, Grundsteuer): item.bsch = {JJJJ:{f:Februar-Rate, r:weitere Raten}}.
   Ab Februar des Bescheid-Jahres gilt: Raten wie im Bescheid, Ansparen fürs Folgejahr = Gesamtbetrag laut Bescheid (f + 3 × r). */
const BSN={h_wasser:'Wasser',h_grundst:'Grundsteuer'};
/* Jahresposten mit neuem Beitrag: item.bsch={JJJJ:{j:neuer Jahresbetrag, ab:'JJJJ-MM' Fälligkeit}} */
const BSJ={h_wohngeb:['Wohngebäudeversicherung','Wohngebäude_jährlich'],h_hausrat:['Hausratversicherung','Hausrat_jährlich'],h_haftpfl:['Haftpflichtversicherung','Haftpflicht_jährlich'],h_abfall:['Abfallgebühr','Abfall_jährlich'],h_adac:['ADAC','ADAC_jährlich']};
function bjList(k){const it=S.grund.items.find(i=>i.k===k);return Object.entries(it?.bsch||{}).filter(([,b])=>b.ab).map(([y,b])=>({y:+y,j:+b.j,ab:b.ab})).sort((a,b)=>a.ab.localeCompare(b.ab));}
function bjAusgleich(k,ab,j){let sv=0;for(let i=1;i<=12;i++){const m=ymAdd(ab,-i);const it=S.grund.items.find(x=>x.k===k);const b0=it.bsch;it.bsch=Object.fromEntries(Object.entries(b0||{}).filter(([,b])=>!b.ab||b.ab<ab));sv+=(+gv(k,m)||0)/12;it.bsch=b0;}return {sv:r2(sv),pay:r2(j),d:r2(j-sv)};}
function bjDue(k){const vn=BSJ[k]?.[1];for(let ym=CUR;ym<=ymAdd(CUR,24);ym=ymAdd(ym,1)){if((S.plan[ym]?.HAUS?.G||[]).some(e=>(e.f||'').includes(vn)))return ym;}return ymAdd(CUR,1);}
function bsList(k){const it=S.grund.items.find(i=>i.k===k);return Object.entries(it?.bsch||{}).map(([y,b])=>({y:+y,f:+b.f,r:+b.r,am:b.am})).sort((a,b)=>a.y-b.y);}
function bsFor(k,ym){const y=+ym.slice(0,4),m=+ym.slice(5);return bsList(k).filter(b=>b.y<y||(b.y===y&&m>=2)).at(-1)||null;}
function annOf(k,ym){const b=ym&&bsFor(k,ym);return b?b.f+3*b.r:gn(k,ym);}
function rateOf(k,ym){if(!ym)ym=CUR;const y=+ym.slice(0,4),m=+ym.slice(5);const b=bsList(k).filter(x=>x.y<=y).at(-1);if(b)return b.y===y&&m===2?b.f:b.r;return k==='h_wasser'?gn('h_wasser_ab',ym):gn('h_grundst',ym)/4;}
/* Vorjahres-Ansparung: Ändert sich der Jahresbetrag mitten im Jahr, wird das in den Vormonaten Angesparte verrechnet:
   (Jahresbetrag − angespart) / verbleibende Monate. Ab Januar wieder Jahresbetrag / 12. */
function vjRate(k,ym){if(!ym)return annOf(k,CUR)/12;const y=ym.slice(0,4),mm=+ym.slice(5);const M=j=>y+'-'+String(j).padStart(2,'0');
  let ch=0;for(let m=2;m<=mm;m++)if(Math.abs(annOf(k,M(m))-annOf(k,M(m-1)))>0.005)ch=m;if(!ch)return annOf(k,ym)/12;
  let saved=0;for(let j=1;j<ch;j++)saved+=vjRate(k,M(j));return Math.max(0,(annOf(k,ym)-saved)/(13-ch));}
function bsAusgleich(k,y){const b=bsList(k).find(x=>x.y===y);if(!b)return null;let sv=0;for(let j=1;j<=12;j++)sv+=vjRate(k,(y-1)+'-'+String(j).padStart(2,'0'));const pay=b.f+3*b.r;return {sv:r2(sv),pay:r2(pay),d:r2(pay-sv),b};}
let VJ_LAST=null;
function jOf(ym){const g=GYM;GYM=ym;vars();const J={...VJ_LAST};GYM=g;return J;}
function vars(){
  const J={J5:gn('h_tilgung'),J6:gn('h_wohngeb')/12,J7:gn('h_hausrat')/12,J8:vjRate('h_wasser',GYM),J9:vjRate('h_grundst',GYM),J10:gn('h_abfall')/12,J11:gn('h_risiko'),J12:gn('h_haftpfl')/12,J13:gn('h_rechts'),J14:gn('h_adac')/12,J15:gn('h_internet'),J16:gn('h_gez')*4/12,J17:gn('h_essen'),J18:gn('h_s_frei')+gn('h_s_chatgpt')+gn('h_s_pcloud')+gn('h_s_prime'),J19:0,J20:S.grund.items.filter(i=>i.cu&&i.g==='Haus').reduce((a,i)=>a+(i.cu.rh==='j'?gn(i.k)/12:gn(i.k)),0)};
  const anteil=Object.values(J).reduce((a,b)=>a+b,0)/2;VJ_LAST=J;
  const st=gv('ing_start')||'2026-11';
  return {D_C19:anteil,D_D19:anteil,D_J5:J.J5,D_J11:J.J11,D_J13:J.J13,D_J15:J.J15,D_J17:J.J17,D_J18:J.J18,
    Pausch_Till:gn('t_p_schwimmen')+gn('t_p_restaurant')+gn('t_p_klamotten')+gn('t_p_etf')+gn('t_p_sonst'),
    Versicherungen_Till:gn('t_zahn')+gn('t_lv'),Ioniq6_Rate:gn('t_ioniq'),Tanken_Till:gn('t_tanken'),
    Gemeinschaftskredit:gn('ing_rate')/2,Gemeinschaftskredit_Start:ymNum(st),
    Gehalt_Till:gn('t_gehalt')-igb(),Gehalt_Patrick:gn('p_gehalt'),
    Pausch_Patrick:gn('p_p_schwimmen')+gn('p_p_restaurant')+gn('p_p_klamotten'),Debeka_Patrick:gn('p_debeka'),
    Strom_Anteil_Patrick:gn('p_strom_okt'),Strompauschale_pP:gn('s_pauschale')/2,
    GEZ:J.J16,Grundsteuer_jährlich:gn('h_grundst'),Hausrat_jährlich:gn('h_hausrat'),Wohngebäude_jährlich:gn('h_wohngeb'),Abfall_jährlich:gn('h_abfall'),Haftpflicht_jährlich:gn('h_haftpfl'),ADAC_jährlich:gn('h_adac'),Wasser_Abschlag:rateOf('h_wasser',GYM),Grundsteuer_Rate:rateOf('h_grundst',GYM),
    IF:(c,a,b)=>c?a:b};
}
let VARS=null;
const fcache={};
function compileF(f){
  if(fcache[f]!==undefined)return fcache[f];
  let s=f.slice(1).replace(/'Dashboard \(Patrick, Till\)'!\$([A-Z]+)\$(\d+)/g,(_,c,r)=>`D_${c}${r}`)
    .replace(/DATE\((\d+),(\d+),1\)/g,(_,y,m)=>String(+y*12+ +m));
  s=s.replace(/[A-Za-zÄÖÜäöüß_][\wÄÖÜäöüß]*/g,w=>`V[${JSON.stringify(w)}]`).replace(/V\["IF"\]\(/g,'V.IF(');
  let fn=null;try{fn=new Function('V','return ('+s+');');}catch(_){fn=null;}
  fcache[f]=fn;return fn;
}
function evalF(f){const fn=compileF(f);if(!fn)return NaN;try{const v=fn(VARS);return typeof v==='number'?v:NaN;}catch(_){return NaN;}}
const GIROAUS=/^(giroausgleich|giroanteil|anteil ?2)$/i;
function giroAus(blk,sh){const E=blk.E||[];const l=[];E.forEach((e,i)=>{if(GIROAUS.test((e.l||'').trim()))l.push({i,e,v:entryVal(e,blk,sh)});});if(!l.length&&E[0])l.push({i:0,e:E[0],v:entryVal(E[0],blk,sh)});return l;}
const isLinked=e=>!!e.f&&e.f!=='=RESTGEHALT'&&e.f!=='=GIROAUSGLEICH';

/* ---------- Monatsrechnung ---------- */
const SH=['TILL','PATRICK','HAUS'];const SHN={TILL:'Till',PATRICK:'Patrick',HAUS:'Haushaltskonto'};
const GR={TILL:[['C','Girokonto: Ausgaben'],['E','Girokonto: Eingänge'],['I','Tagesgeld: Entnahmen'],['K','Tagesgeld: Einzahlungen']],PATRICK:[['C','Girokonto: Ausgaben'],['E','Girokonto: Eingänge'],['I','Tagesgeld: Entnahmen'],['K','Tagesgeld: Einzahlungen']],HAUS:[['G','Abbuchungen vom Girokonto'],['I','Einzahlungen']]};
const GOLD=[10,20,31.1035,10,31.1035];
let CALC=null;const GIRO0={};
const hasGehIst=blk=>blk?.gehIst!=null&&blk.gehIst!=='';
function gehOf(blk,sh){const base=sh==='TILL'?VARS.Gehalt_Till:VARS.Gehalt_Patrick;if(!hasGehIst(blk))return base;return sh==='TILL'?+blk.gehIst-igb():+blk.gehIst;}
function igb(){return S.grund.items.some(i=>i.k==='t_igbce')?gn('t_igbce'):41.91;}
function entryVal(e,blk,sh){
  if(e._bv!=null)return +e._bv;
  if(e.gk)return gn(e.gk);
  if(e.f==='=GIROAUSGLEICH'){const g0=GIRO0[GYM+'|'+sh]??CALC?.[GYM]?.[sh]?.giro0??0;const other=x=>x!==e&&x.l!==ABGL&&x.f!=='=GIROAUSGLEICH';
    const c=(blk.C||[]).filter(other).reduce((a,x)=>a+entryVal(x,blk,sh),0),eo=(blk.E||[]).filter(other).reduce((a,x)=>a+entryVal(x,blk,sh),0);return c-eo-g0;}
  if(e.f==='=RESTGEHALT'){const g=gehOf(blk,sh);return g-giroAus(blk,sh).reduce((a,x)=>a+x.v,0);}
  let v0;if(e.f){const v=evalF(e.f);v0=isFinite(v)?v:(+e.v||0);}else v0=+e.v||0;
  if(sh!=='HAUS'&&isPausch(e)&&(blk?.C||[]).includes(e)){const used=pauschUsed(blk,sh);if(used)return Math.max(0,v0-used);}
  return v0;
}
const isPausch=e=>/^pauschale$/i.test((e.l||'').trim());
function pauschUsed(blk,sh){return (blk?.C||[]).filter(x=>x.p&&!isPausch(x)).reduce((a,x)=>a+(+x.v||0),0);}
function pauschBase(e,blk,sh){if(e.f){const v=evalF(e.f);if(isFinite(v))return v;}return +e.v||0;}
function restNeg(blk,sh){const e=(blk?.K||[]).find(x=>x.f==='=RESTGEHALT');if(!e)return 0;const v=entryVal(e,blk,sh);return v<0?-v:0;}
function sumG(blk,g,sh){return (blk?.[g]||[]).reduce((a,e)=>a+entryVal(e,blk,sh),0);}
const bzu=(P,sh)=>!!(P?.zu||P?.[sh]?.zu);const bzuAm=(P,sh)=>P?.[sh]?.zuAm||P?.zuAm||'';
function planStart(){return S.plan['2026-09']?'2026-09':PLAN0;}
/* Monate nach dem letzten echten Plan (bis PLAN1) werden aus demselben Monat des Vorjahres fortgeschrieben, bis jemand sie ändert */
let ING_END=null;
function fillVirtual(){const P=S.plan;Object.keys(P).forEach(k=>{if(P[k]?._virt)delete P[k];});if(!Object.keys(P).length)return;
  try{const g=GYM;GYM=null;ING_END=typeof ingRows==='function'?ingRows().at(-1)?.ym||null:null;GYM=g;}catch(_){ING_END=null;}
  for(let ym=PLAN0;ym<=PLAN1;ym=ymAdd(ym,1)){if(P[ym])continue;const mm=ym.slice(5),y=+ym.slice(0,4);let tpl=null;for(let yy=y-1;yy>=y-10&&!tpl;yy--)tpl=P[yy+'-'+mm];if(!tpl)continue;
    const d=structuredClone(tpl);delete d.zu;delete d.zuAm;
    SH.forEach(sh=>{const b=d[sh];if(!b)return;delete b.snap;delete b.etfIst;delete b.zu;delete b.zuAm;delete b.gold;delete b.gehIst;Object.keys(b).forEach(g=>{if(!Array.isArray(b[g]))return;
      b[g]=b[g].filter(e=>e.l!==ABGL&&!(ING_END&&ym>ING_END&&/^gemeinschaftskredit$/i.test((e.l||'').trim())));
      b[g].forEach(e=>{delete e.fix;delete e.p;if(e.f)e.f=e.f.replace(/DATE\((\d+),(\d+),1\)/g,(_,yy,m)=>`DATE(${y},${m},1)`);else if(g==='E'&&/^giroausgleich$/i.test((e.l||'').trim())){e.f='=GIROAUSGLEICH';e.v=null;}});});});
    d._virt=true;P[ym]=d;}}
/* Eigene Posten aus den Einstellungen (item.c) in die Monate einsetzen; stehen immer am Ende der Liste und werden nicht gespeichert */
function stripCustom(d){SH.forEach(sh=>{const b=d?.[sh];if(!b)return;Object.keys(b).forEach(g=>{if(Array.isArray(b[g]))b[g]=b[g].filter(e=>!e._c);});});return d;}
function injectBescheid(){const P=S.plan;Object.keys(BSJ).forEach(k=>{bjList(k).forEach(b=>{const M=P[b.ab];if(!M||M.zu)return;const a=bjAusgleich(k,b.ab,b.j);if(Math.abs(a.d)<0.01)return;const h=r2(a.d/2),n=BSJ[k][0];
    const lp=a.d>0?`${n}: Nachzahlung (Anteil)`:`${n}: übrig vom Ansparen (Anteil)`;['TILL','PATRICK'].forEach(sh=>{if(M[sh]?.zu)return;const bl=M[sh]=M[sh]||{};(bl.C=bl.C||[]).push({l:lp,_bv:h,_c:1,v:null});});
    if(!M.HAUS?.zu){const hb=M.HAUS=M.HAUS||{};hb.I=hb.I||[];['Till','Patrick'].forEach(w=>hb.I.push({l:a.d>0?`${n}-Nachzahlung von ${w}`:`${n}: übrig vom Ansparen – Anteil ${w}`,_bv:h,_c:1,v:null}));}});});Object.keys(BSN).forEach(k=>{bsList(k).forEach(b=>{const ym=b.y+'-02';const M=P[ym];if(!M||M.zu)return;const a=bsAusgleich(k,b.y);if(!a||Math.abs(a.d)<0.01)return;const h=r2(a.d/2),n=BSN[k],py=b.y-1;
  const lp=a.d>0?`${n}: Nachzahlung ${py} (Anteil)`:`${n}: übrig vom Ansparen ${py} (Anteil)`;
  ['TILL','PATRICK'].forEach(sh=>{if(M[sh]?.zu)return;const bl=M[sh]=M[sh]||{};(bl.C=bl.C||[]).push({l:lp,_bv:h,_c:1,v:null});});
  if(!M.HAUS?.zu){const hb=M.HAUS=M.HAUS||{};hb.I=hb.I||[];['Till','Patrick'].forEach(w=>hb.I.push({l:a.d>0?`${n}-Nachzahlung ${py} von ${w}`:`${n}: übrig vom Ansparen ${py} – Anteil ${w}`,_bv:h,_c:1,v:null}));}});});}
function injectCustom(){const P=S.plan;Object.values(P).forEach(stripCustom);injectBescheid();const its=S.grund.items.filter(i=>i.cu);if(!its.length)return;
  const own=g=>g==='Till'?'TILL':g==='Patrick'?'PATRICK':'HAUS';
  its.forEach(i=>{const c=i.cu;const sh=own(i.g);for(let ym=c.ab<PLAN0?(P['2026-09']?'2026-09':PLAN0):c.ab;ym<=PLAN1&&(!i.bis||ym<=i.bis);ym=ymAdd(ym,1)){const M=P[ym];if(!M||M.zu||M[sh]?.zu)continue;if(c.rh==='j'&&ym.slice(5)!==c.ab.slice(5))continue;
    const b=M[sh]=M[sh]||{};const g=sh==='HAUS'?'G':(c.art==='ein'?'E':'C');(b[g]=b[g]||[]).push({l:i.l,gk:i.k,_c:1,v:null});
    if(sh!=='HAUS'&&c.an&&c.art!=='ein'){const o=own(c.an);if(o!=='HAUS'&&o!==sh&&!M[o]?.zu){const bo=M[o]=M[o]||{};(bo.E=bo.E||[]).push({l:c.lg||`${i.l} (von ${i.g})`,gk:i.k,_c:1,v:null});}}}});}
function calcAll(){
  Object.values(S.plan).forEach(stripCustom);fillVirtual();injectCustom();varsReset();GYM=null;const VBASE=vars();
  const A=S.archiv||{};const P0=planStart();const pm=ymAdd(P0,-1);const sep=k=>(A[k]||{})[pm]||[0,0,0,0];
  const es=A.etfStart?.[pm];const eT=es?.TILL??A.start?.TILL_etf??6800,eP=es?.PATRICK??A.start?.PATRICK_etf??2600;
  const prev={TILL:{giro:sep('TILL')[0]||0,tg:sep('TILL')[1]||0,etf:eT,einz:eT},PATRICK:{giro:sep('PATRICK')[0]||0,tg:sep('PATRICK')[1]||0,etf:eP,einz:eP},HAUS:{k:sep('HAUS')[0]||0}};
  const out={};const GG=GOLD.reduce((a,g)=>a+g,0)/OZ,gpNow=gn('goldpreis');
  for(let ym=P0;ym<=PLAN1;ym=ymAdd(ym,1)){
    const P=S.plan[ym]||{};const o={};const gold=GG*(P.TILL?.zu&&P.TILL.gold>0?+P.TILL.gold:P.zu&&P.gold>0?+P.gold:gpNow);useYm(ym);GIRO0[ym+'|TILL']=prev.TILL.giro;GIRO0[ym+'|PATRICK']=prev.PATRICK.giro;
    ['TILL','PATRICK'].forEach(sh=>{const b=P[sh]||{};const p=prev[sh];
      const c=sumG(b,'C',sh),e=sumG(b,'E',sh),rn=restNeg(b,sh),i=sumG(b,'I',sh)+rn,k=sumG(b,'K',sh)+rn;
      const etfE=(b.C||[]).find(x=>/^etf$/i.test((x.l||'').trim()));const rate=etfE?entryVal(etfE,b,sh):0;const ist=b.etfIst!=null&&b.etfIst!=='';const etf=ist?+b.etfIst:p.etf+rate;const einz=p.einz+rate;
      const r={giro0:p.giro,soll:c,haben:e,giro:(x=>Math.abs(x)<0.005?0:x)(p.giro-c+e),tg0:p.tg,tgS:i,tgH:k,tg:p.tg-i+k,etf,etf0:p.etf,etfRate:rate,etfIst:ist,einz,gold:sh==='TILL'?gold:0};
      r.total=r.giro+r.tg+r.etf+r.gold;o[sh]=r;prev[sh]={giro:r.giro,tg:r.tg,etf,einz};});
    const h=P.HAUS||{};const g=sumG(h,'G','HAUS'),i=sumG(h,'I','HAUS');
    const da=(h.G||[]).filter(e=>isDauer(e.l));const dav=da.reduce((a,e)=>a+entryVal(e,h,'HAUS'),0);
    o.HAUS={k0:prev.HAUS.k,soll:g,haben:i,k:prev.HAUS.k-g+i,ueb:g-dav,dauer:da.map(e=>[e.l,entryVal(e,h,'HAUS')])};
    prev.HAUS={k:o.HAUS.k};out[ym]=o;}
  useYm(month);
  CALC=out;return out;
}
const isDauer=l=>(S.bcfg.dauerauftrag||[]).some(d=>d&&String(l||'').toLowerCase().startsWith(d.toLowerCase()));

/* ---------- Speichern ---------- */
const queues={};const KNOWN={};const UNDO=[];let undoing=false;
function remember(path,data){KNOWN[path]=data===undefined?undefined:JSON.parse(JSON.stringify(data));}
function save(path,data){
  if(!db){flash('err','Nicht gespeichert');return Promise.resolve();}
  if(!undoing){const prev=path in KNOWN?KNOWN[path]:undefined;const t=Date.now();let st=UNDO.at(-1);if(!st||t-st.t>2500){st={t,e:[]};UNDO.push(st);if(UNDO.length>30)UNDO.shift();}
    if(!st.e.some(x=>x.path===path))st.e.push({path,prev});st.t=t;showUndo();}
  remember(path,data);
  const q=(queues[path]||Promise.resolve()).then(()=>db.doc(path).set(data)).then(()=>flash('ok','Gespeichert')).catch(e=>{flash('err',e?.code==='not_granted'||e?.code==='permission_denied'?'Keine Schreibrechte':'Speichern fehlgeschlagen');});
  queues[path]=q;return q;
}
function showUndo(){const b=$('#undo');if(!b)return;b.hidden=!UNDO.length;b.textContent=UNDO.length>1?`↶ Rückgängig (${UNDO.length})`:'↶ Rückgängig';}
async function doUndo(){const st=UNDO.pop();if(!st)return;undoing=true;
  for(const {path,prev} of st.e.slice().reverse()){try{if(prev===undefined){await db.doc(path).delete();}else{await db.doc(path).set(prev);}remember(path,prev);}catch(_){}}
  undoing=false;showUndo();flash('ok','Rückgängig gemacht');}
function savePlan(ym,mut){const d=stripCustom(structuredClone(S.plan[ym]||{}));delete d._virt;mut(d);S.plan[ym]=d;render();return save('plan/'+ym,d);}
function saveBudget(ym,mut){const d=structuredClone(S.budget[ym]||{e:[],s:[]});d.e=d.e||[];d.s=d.s||[];mut(d);S.budget[ym]=d;render();return save('budget/'+ym,d);}
function setGrund(k,v,ab){const items=structuredClone(S.grund.items);const it=items.find(i=>i.k===k);if(!it)return;if(ab){it.hist=(it.hist||[]).filter(h=>h.ab!==ab);it.hist.push({ab,v});it.hist.sort((a,b)=>a.ab.localeCompare(b.ab));}else{const ov=+it.v;it.v=v;it.am=TODAY;if(k==='h_tilgung'&&S.kredit?.sparda&&isFinite(ov)&&isFinite(+v)&&ov!==+v){const d=structuredClone(S.kredit);d.sparda.rate=r2((+d.sparda.rate||0)+(+v-ov));S.kredit=d;save('config/kredit',d);}if(k==='ing_rate'&&S.kredit?.ing){const d=structuredClone(S.kredit);d.ing.rate=+v;S.kredit=d;save('config/kredit',d);}}S.grund={items};render();return save('config/grund',{items});}
let flashT;function flash(k,t){const el=$('#status');el.innerHTML=`<span class="dot ${k}"></span><span>${t}</span>`;clearTimeout(flashT);if(k==='ok')flashT=setTimeout(()=>el.innerHTML='<span class="dot ok"></span><span>Synchronisiert</span>',1800);}
function showMsg(h,ok){const el=$('#msg');el.innerHTML=h+' <button class="btn sec sm" type="button" onclick="this.parentNode.hidden=true">Schließen</button>';el.style.borderLeftColor=ok?'var(--good)':'var(--bad)';el.hidden=false;}

/* ---------- Diagramme ---------- */
const tip=$('#tip');
function showTip(e,h){tip.innerHTML=h;tip.hidden=false;const w=tip.offsetWidth;let x=e.clientX+14;if(x+w>innerWidth-8)x=e.clientX-w-14;tip.style.left=x+'px';tip.style.top=(e.clientY-10)+'px';}
function hideTip(){tip.hidden=true;}
function niceStep(x){const e=Math.pow(10,Math.floor(Math.log10(x||1)));const f=x/e;return(f<=1?1:f<=2?2:f<=5?5:10)*e;}
const fmtK=v=>Math.abs(v)>=1000?(v/1000).toLocaleString('de-DE',{maximumFractionDigits:1})+' k':Math.round(v).toLocaleString('de-DE');
function lineChart(el,labels,series,o={}){
  if(!labels.length){el.innerHTML='<div class="muted">Noch keine Daten.</div>';return;}
  const W=Math.max(300,el.clientWidth||700),H=o.h||240,p={l:52,r:14,t:10,b:24},iw=W-p.l-p.r,ih=H-p.t-p.b;
  const all=series.flatMap(s=>s.v.filter(x=>x!=null));let mn=Math.min(0,...all),mx=Math.max(1,...all);const st=niceStep((mx-mn)/4);mx=Math.ceil(mx/st)*st;mn=Math.floor(mn/st)*st;
  const n=labels.length,X=i=>p.l+(n===1?iw/2:iw*i/(n-1)),Y=v=>p.t+ih*(1-(v-mn)/(mx-mn));
  let g='';for(let v=mn;v<=mx+1e-6;v+=st)g+=`<line x1="${p.l}" x2="${W-p.r}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)" stroke-width="1"/><text x="${p.l-6}" y="${Y(v)+4}" text-anchor="end" font-size="11" fill="var(--mute)">${fmtK(v)}</text>`;
  const ev=Math.max(1,Math.ceil(n/Math.max(2,Math.floor(iw/70))));labels.forEach((l,i)=>{if(i%ev===0)g+=`<text x="${X(i)}" y="${H-5}" text-anchor="middle" font-size="11" fill="var(--mute)">${esc(o.xl?o.xl(l):l)}</text>`});
  if(o.mark!=null&&o.mark>=0)g+=`<line x1="${X(o.mark)}" x2="${X(o.mark)}" y1="${p.t}" y2="${p.t+ih}" stroke="var(--mute)" stroke-width="1" stroke-dasharray="2 3"/><text x="${X(o.mark)+4}" y="${p.t+10}" font-size="11" fill="var(--mute)">heute</text>`;
  series.forEach(s=>{let d='',pen=false;s.v.forEach((v,i)=>{if(v==null){pen=false;return}d+=(pen?'L':'M')+X(i)+','+Y(v);pen=true});g+=`<path d="${d}" fill="none" stroke="${s.c}" stroke-width="${s.w||2}" stroke-linejoin="round" stroke-linecap="round" ${s.dash?'stroke-dasharray="5 4"':''}/>`;});
  g+=`<line class="xh" y1="${p.t}" y2="${p.t+ih}" stroke="var(--mute)" stroke-dasharray="3 3" visibility="hidden"/>`;
  el.innerHTML=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.aria||'Diagramm')}">${g}<rect x="${p.l}" y="${p.t}" width="${iw}" height="${ih}" fill="transparent"/></svg>`;
  const svg=el.firstChild,xh=svg.querySelector('.xh');
  svg.onpointermove=e=>{const r=svg.getBoundingClientRect();const mx_=(e.clientX-r.left)*W/r.width;const i=Math.max(0,Math.min(n-1,Math.round((mx_-p.l)/iw*(n-1))));xh.setAttribute('x1',X(i));xh.setAttribute('x2',X(i));xh.setAttribute('visibility','visible');
    showTip(e,`<b>${esc(o.xt?o.xt(labels[i]):labels[i])}</b><br>`+series.filter((s,j,a)=>s.v[i]!=null&&!s.hideTip&&a.findIndex(t=>t.n===s.n&&t.v[i]!=null)===j).map(s=>`<span style="color:${s.c}">●</span> ${esc(s.n)}: ${eur(s.v[i],0)}`).join('<br>'));};
  svg.onpointerleave=()=>{xh.setAttribute('visibility','hidden');hideTip();};
}
function barChart(el,labels,vals,o={}){
  const W=Math.max(300,el.clientWidth||500),H=o.h||220,p={l:52,r:8,t:12,b:24},iw=W-p.l-p.r,ih=H-p.t-p.b;
  const m0=Math.max(1,...vals),st=niceStep(m0/4),mx=Math.ceil(m0/st)*st,bw=iw/labels.length;let g='';
  for(let v=0;v<=mx+1e-6;v+=st){const y=p.t+ih*(1-v/mx);g+=`<line x1="${p.l}" x2="${W-p.r}" y1="${y}" y2="${y}" stroke="var(--line)"/><text x="${p.l-6}" y="${y+4}" text-anchor="end" font-size="11" fill="var(--mute)">${fmtK(v)}</text>`;}
  labels.forEach((l,i)=>{const h=Math.max(0,ih*vals[i]/mx),w=Math.min(56,bw*.6),x=p.l+bw*i+(bw-w)/2,y=p.t+ih-h,r=Math.min(4,w/2,h);
    g+=`<path d="M${x},${p.t+ih}V${y+r}Q${x},${y} ${x+r},${y}H${x+w-r}Q${x+w},${y} ${x+w},${y+r}V${p.t+ih}Z" fill="${o.c?o.c(i):'var(--acc)'}" data-i="${i}"/><text x="${x+w/2}" y="${H-5}" text-anchor="middle" font-size="11" fill="var(--mute)">${esc(l)}</text>`;});
  el.innerHTML=`<svg viewBox="0 0 ${W} ${H}" role="img">${g}</svg>`;
  el.querySelectorAll('path').forEach(b=>{b.onpointermove=e=>showTip(e,o.tip(+b.dataset.i));b.onpointerleave=hideTip;});
}
const kpi=(l,v,n,cls='')=>`<div class="card kpi"><span class="l">${l}</span><span class="v ${cls}">${v}</span><span class="n">${n||''}</span></div>`;
const sign=v=>v<-0.005?'neg':v>0.005?'pos':'';
