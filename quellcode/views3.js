/* ---------- Demnächst ---------- */
function upcoming(){
  const ev=[];const add=(ym,typ,txt,v)=>ev.push({ym,typ,txt,v});const start=CUR<planStart()?planStart():ymAdd(CUR,1);const end=ymAdd(CUR,12);
  // vorgemerkte Grundbetrags-Änderungen
  S.grund.items.forEach(it=>(it.hist||[]).forEach(h=>{if(h.ab>=CUR&&h.ab<=end)add(h.ab,'grund',`${it.l}: ${it.fmt==='date'?h.v:eur(gv(it.k,ymAdd(h.ab,-1)))+' → '+eur(h.v)}`);}));
  // Plan: neue, endende und geänderte feste Posten, einmalige größere Zahlungen
  const val=(ym,sh,g)=>{const P=S.plan[ym];const b=P?.[sh];const m={};if(!b)return m;useYm(ym);(b[g]||[]).forEach(e=>{if(!e.l||e.l===ABGL||e.lk||GIROAUS.test(e.l.trim()))return;if(!isFest(e,sh,g))return;m[e.l]=(m[e.l]||0)+(sh!=='HAUS'&&isPausch(e)?pauschBase(e,b,sh):entryVal(e,b,sh));});return m;};
  const who={TILL:'Till',PATRICK:'Patrick',HAUS:'Haushaltskonto'};
  for(let ym=start;ym<=end&&ym<=PLAN1;ym=ymAdd(ym,1)){const pm=ymAdd(ym,-1),nm=ymAdd(ym,1);
    [['TILL','C'],['TILL','E'],['PATRICK','C'],['PATRICK','E'],['HAUS','G']].forEach(([sh,g])=>{const a=val(pm,sh,g),b=val(ym,sh,g),c=val(nm,sh,g);const out=g!=='E';
      if(sh==='HAUS'){Object.keys(b).forEach(l=>{if(/heiz[öo]l/i.test(l))return;if(!(a[l]!=null&&c[l]!=null))add(ym,'einmal',`Haushaltskonto: ${l} fällig`,-b[l]);else if(Math.abs(a[l]-b[l])>=1&&Math.abs(b[l]-c[l])<1)add(ym,'aend',`Haushaltskonto: ${l} ${eur(a[l])} → ${eur(b[l])}`);});return;}
      Object.keys(b).forEach(l=>{if(a[l]==null&&c[l]==null&&b[l]>=50)add(ym,'einmal',`${who[sh]}: ${l}`,out?-b[l]:b[l]);
        else if(a[l]==null&&c[l]!=null&&b[l]>0)add(ym,'neu',`${who[sh]}: ${l} beginnt`,out?-b[l]:b[l]);
        else if(a[l]!=null&&c[l]!=null&&Math.abs(a[l]-b[l])>=1&&Math.abs(b[l]-c[l])<1)add(ym,'aend',`${who[sh]}: ${l} ${eur(a[l])} → ${eur(b[l])}`);});
      Object.keys(a).forEach(l=>{const pp=val(ymAdd(pm,-1),sh,g);if(b[l]==null&&pp[l]!=null&&c[l]==null)add(ym,'ende',`${who[sh]}: ${l} fällt weg`,out?a[l]:-a[l]);});});}
  useYm(month);
  // größere Einzelbuchungen (Tagesgeld-Entnahmen/-Einzahlungen, nicht feste Giro-Posten)
  for(let ym=start;ym<=end&&ym<=PLAN1;ym=ymAdd(ym,1))varFlows(ym).forEach(f=>{if(Math.abs(f.v)>=100)add(ym,'einmal',`${f.who}: ${f.l} (${f.art})`,f.v);});
  useYm(month);
  // Ferienwohnung
  fwList().filter(b=>b.a>=TODAY&&b.a<=dAdd(TODAY,60)).forEach(b=>add(b.a.slice(0,7),'fewo',`${dDE(b.a)}: ${b.p}, ${b.n} Nächte, ${b.erw||'?'} Erw.${+b.ki?' + '+b.ki+(+b.ki===1?' Kind':' Kinder'):''}${b.sicher?'':' · noch stornierbar bis '+dDE(b.frist)}`,b.netto));
  (S.urlaub.e||[]).filter(x=>x.d>TODAY&&+x.b<0&&x.d<=dAdd(TODAY,365)).forEach(x=>add(x.d.slice(0,7),'urlaub',`${dDE(x.d)}: ${x.t||'Urlaubsausgabe'} (Urlaubskonto)`,+x.b));
  // Kredite
  const st=gv('ing_start');if(st&&st>=CUR&&st<=end)add(st,'kredit','Gemeinschaftskredit ING: erste Rate',-gn('ing_rate'));
  try{spardaSonder().filter(x=>x.ym>=CUR&&x.ym<=end).forEach(x=>add(x.ym,'kredit',`Sondertilgung Sparda${x.src==='bauspar'?' aus Bausparvertrag':''}`,-x.b));const bs=bausparZuteil();if(bs&&bs.ym<=end)add(bs.ym,'kredit','Bausparvertrag: Mindestguthaben erreicht');}catch(_){}
  const mu=K().sparda.szenario||{};if(mu.aktiv&&mu.an){const r=muRows();if(mu.an>=CUR&&mu.an<=end)add(mu.an,'kredit',`Szenario: Mutter übernimmt ${eur(+mu.betrag||0,0)} bei der Sparda`);if(r.length){if(r[0].ym<=end&&r[0].ym>=CUR)add(r[0].ym,'kredit','Erste Rate an deine Mutter',-r[0].b);const l=r.at(-1);if(l.ym<=end&&l.ym>=CUR)add(l.ym,'kredit','Letzte Rate an deine Mutter',-l.b);}}
  return ev.sort((a,b)=>a.ym.localeCompare(b.ym));
}
function varFlows(ym){const P=S.plan[ym];const out=[];if(!P)return out;useYm(ym);
  ['TILL','PATRICK'].forEach(sh=>{const b=P[sh]||{};const who=SHN[sh];
    (b.C||[]).forEach(e=>{if(!e.l||e.lk||isFest(e,sh,'C'))return;const v=entryVal(e,b,sh);if(v)out.push({who,l:e.l,v:-v,art:'Giro-Ausgabe'});});
    (b.E||[]).forEach((e,i)=>{if(!e.l||e.lk||GIROAUS.test(e.l.trim())||isFest(e,sh,'E'))return;const v=entryVal(e,b,sh);if(v)out.push({who,l:e.l,v,art:'Giro-Eingang'});});
    (b.I||[]).forEach(e=>{if(!e.l||e.lk)return;const v=entryVal(e,b,sh);if(v)out.push({who,l:e.l,v:-v,art:'vom Tagesgeld genommen'});});
    (b.K||[]).forEach(e=>{if(!e.l||e.lk||e.f==='=RESTGEHALT'||/^rest gehalt/i.test(e.l))return;const v=entryVal(e,b,sh);if(v)out.push({who,l:e.l,v,art:'aufs Tagesgeld'});});});
  return out;}
function muRows(){const mu=K().sparda.szenario||{};const rate=+mu.rate||1000;let rest=+mu.betrag||0;if(!mu.an||rate<=0||rest<=0)return[];const out=[];let ym=ymAdd(mu.an,1);while(rest>0.005&&out.length<600){const b=Math.min(rate,rest);rest=r2(rest-b);out.push({ym,b,rest});ym=ymAdd(ym,1);}return out;}

/* ---------- Ausblick: was bleibt übrig ---------- */
function festMap(ym,sh,g){const b=S.plan[ym]?.[sh];const m={};if(!b)return m;(b[g]||[]).forEach(e=>{if(!e.l||e.l===ABGL||e.lk||!isFest(e,sh,g))return;if(g==='E'&&GIROAUS.test(e.l.trim()))return;m[e.l]=(m[e.l]||0)+(sh!=='HAUS'&&isPausch(e)?pauschBase(e,b,sh):entryVal(e,b,sh));});return m;}
function uebrig(ym,sh){if(!S.plan[ym])return null;useYm(ym);const pm=ymAdd(ym,-1),nm=ymAdd(ym,1);
  const c=festMap(ym,sh,'C'),e=festMap(ym,sh,'E');useYm(pm);const cp=festMap(pm,sh,'C');useYm(nm);const cn=festMap(nm,sh,'C');useYm(ym);
  let aus=0;const einm=[];Object.entries(c).forEach(([l,v])=>{if(cp[l]==null&&cn[l]==null&&S.plan[pm]&&S.plan[nm]&&v>=50)einm.push([l,v]);else aus+=v;});
  const ein=Object.values(e).reduce((a,b)=>a+b,0);const geh=sh==='TILL'?VARS.Gehalt_Till:VARS.Gehalt_Patrick;
  const cf={};Object.entries(c).forEach(([l,v])=>{if(!einm.some(x=>x[0]===l))cf[l]=v;});Object.entries(e).forEach(([l,v])=>{cf['+'+l]=-v;});return {geh,ein,aus,rest:geh+ein-aus,c:cf,einm};}
function phasen(){const st=CUR<planStart()?planStart():CUR;const rows=[];
  for(let ym=st;ym<=PLAN1;ym=ymAdd(ym,1)){const t=uebrig(ym,'TILL'),p=uebrig(ym,'PATRICK');if(!t||!p)continue;rows.push({ym,t,p});}
  useYm(month);const ph=[];rows.forEach(r=>{const l=ph.at(-1);if(l&&Math.abs(l.t.rest-r.t.rest)<20&&Math.abs(l.p.rest-r.p.rest)<20){l.bis=r.ym;return;}ph.push({von:r.ym,bis:r.ym,t:r.t,p:r.p});});
  ph.forEach((x,i)=>{if(!i)return;const pr=ph[i-1];const d=[];[['TILL','t','Till'],['PATRICK','p','Patrick']].forEach(([sh,k,n])=>{const a=pr[k].c,b=x[k].c;new Set([...Object.keys(a),...Object.keys(b)]).forEach(l=>{const dv=(b[l]||0)-(a[l]||0);if(Math.abs(dv)>=5){const lab=l.replace(/^\+/,'');const inc=l[0]==='+';d.push(`${n}: ${lab} ${a[l]==null?(inc?'kommt dazu':'neu'):b[l]==null?'fällt weg':(inc?(dv<0?'+':'−'):(dv>0?'+':''))+eur(inc?Math.abs(dv):dv,0)}`);};});const dg=x[k].geh-pr[k].geh;if(Math.abs(dg)>=1)d.push(`${n}: Gehalt ${dg>0?'+':''}${eur(dg,0)}`);});x.warum=d.slice(0,5);});
  return {rows,ph};}

function einmTxt(x,rows){const out=[];rows.filter(r=>r.ym>=x.von&&r.ym<=x.bis).forEach(r=>{[['t','Till'],['p','Patrick']].forEach(([k,n])=>{const e=r[k].einm;if(!e.length)return;const sum=e.reduce((a,b)=>a+b[1],0);out.push(`<div class="ph-e">⚠️ <b>${n}, ${ymName(r.ym)}:</b> zusätzlich einmalig ${e.map(([l,v])=>esc(l)+' −'+eur(v,0)).join(', ')}. In diesem Monat bleiben ${n} deshalb <b class="${r[k].rest-sum<0?'neg':''}">${eur(r[k].rest-sum,0)}</b>.</div>`);});});return out.join('');}
/* ---------- Rücklagen im Haushaltskonto ---------- */
function ruecklagen(){const from=ymAdd(CUR,-12),to=ymAdd(CUR,24);const pay={};let n=0;
  for(let ym=from;ym<=to;ym=ymAdd(ym,1)){const b=S.plan[ym]?.HAUS;if(!b)continue;n++;useYm(ym);(b.G||[]).forEach(e=>{if(!e.l||e.lk)return;(pay[e.l]??=[]).push({ym,v:entryVal(e,b,'HAUS')});});}
  useYm(month);const out=[];
  const VJ=[[/^wasserabgabe$/i,'h_wasser','Wasser'],[/^grundsteuer$/i,'h_grundst','Grundsteuer']];const y0=+CUR.slice(0,4),mDone=+CUR.slice(5);
  VJ.forEach(([rx,k,name])=>{if(!Object.keys(pay).some(l=>rx.test(l.trim())))return;const ann=annOf(k,y0+'-12');if(!(ann>0))return;let svd=0;for(let j=1;j<=mDone;j++)svd+=vjRate(k,y0+'-'+String(j).padStart(2,'0'));const ms=[...new Set(Object.entries(pay).filter(([l])=>rx.test(l.trim())).flatMap(([,P])=>P.filter(x=>x.ym.startsWith(String(y0+1))).map(x=>PVM[+x.ym.slice(5)-1])))];
    out.push({l:name+' '+(y0+1),due:(y0+1)+'-01',v:ann,vj:1,rate:vjRate(k,CUR),saved:svd,p:Math.min(1,svd/ann),note:`Ansparen im Jahr ${y0} für die Raten ${y0+1}${ms.length?' ('+ms.join(', ')+')':''} · derzeit rund ${eur(vjRate(k,CUR),0)} im Monat · die Raten ${y0} sind aus dem Vorjahr bezahlt`});});
  Object.entries(pay).forEach(([l,P])=>{if(/heiz[öo]l/i.test(l))return;if(VJ.some(([rx])=>rx.test(l.trim())))return;const inYear=P.filter(x=>x.ym>=CUR&&x.ym<ymAdd(CUR,12)).length;if(inYear>=10||inYear===0)return;
    const nx=P.find(x=>x.ym>=CUR);if(!nx||nx.v<=0)return;const i=P.indexOf(nx);const prev=P[i-1],after=P[i+1];
    const gaps={};P.slice(1).forEach((x,j)=>{const g=ymNum(x.ym)-ymNum(P[j].ym);gaps[g]=(gaps[g]||0)+1;});const cyc=+(Object.entries(gaps).sort((a,b)=>b[1]-a[1])[0]?.[0]||12);const since=prev?ymNum(CUR)-ymNum(prev.ym):Math.max(0,cyc-(ymNum(nx.ym)-ymNum(CUR)));
    let rate=nx.v/cyc;let saved=Math.min(nx.v,rate*since);let extra='';
    const jk=Object.keys(BSJ).find(k=>new RegExp('^'+BSJ[k][0].slice(0,6),'i').test(l.trim()));
    if(jk&&cyc===12){let sv=0;for(let m=ymAdd(CUR,-since+1);m<=CUR;m=ymAdd(m,1))sv+=(+gv(jk,m)||0)/12;saved=Math.min(nx.v,sv);rate=(+gv(jk,CUR)||0)/12;const bj=bjList(jk).find(b=>b.ab===nx.ym);if(bj){const a=bjAusgleich(jk,bj.ab,bj.j);if(Math.abs(a.d)>=0.01)extra=` · neuer Beitrag: ${a.d>0?'Nachzahlung':'übrig'} ${eur(Math.abs(a.d))} im ${ymName(nx.ym)} (je ${eur(Math.abs(a.d)/2)})`;}}
    out.push({l,due:nx.ym,v:nx.v,cyc,rate,saved,p:saved/nx.v,extra});});
  return out.sort((a,b)=>a.due.localeCompare(b.due));}
function privJahr(){const out=[];const seen=new Set();
  for(let ym=CUR;ym<ymAdd(CUR,12)&&ym<=PLAN1;ym=ymAdd(ym,1)){['TILL','PATRICK'].forEach(sh=>{const u=uebrig(ym,sh);(u?.einm||[]).forEach(([l,v])=>{const k=sh+l;if(seen.has(k))return;seen.add(k);out.push({who:SHN[sh],l,ym,v});});});}
  useYm(month);return out;}

const EVI={grund:'📌',neu:'➕',ende:'✖️',aend:'↕️',einmal:'💶',fewo:'🏡',urlaub:'✈️',kredit:'🏦'};
let bdShow=6;
let bdSer=new Set(['TILL','PATRICK','HAUS']),bdVal='gt',bdRng='all';
$('#p-bald').addEventListener('click',e=>{const b=e.target.closest('[data-bs],[data-bv],[data-br]');if(!b)return;const d=b.dataset;if(d.bs){bdSer.has(d.bs)?bdSer.delete(d.bs):bdSer.add(d.bs);}if(d.bv)bdVal=d.bv;if(d.br)bdRng=d.br;rBald();});
function rBald(){const ev=upcoming();const by={};ev.forEach(e=>(by[e.ym]??=[]).push(e));
  const bt=$('#t-bald');bt?.querySelector('.badge')?.remove();
  if(tab!=='bald')return;
  $('#bd-list').innerHTML=Object.keys(by).length?Object.entries(by).map(([ym,l])=>`<div class="bd-m"><h3>${ymName(ym)}</h3>${l.map(e=>`<div class="row"><span>${EVI[e.typ]||'•'} ${esc(e.txt)}</span>${e.v!=null?`<span class="num ${e.v<0?'neg':'pos'}">${e.v>0?'+':''}${eur(e.v)}</span>`:''}</div>`).join('')}</div>`).join(''):'<div class="muted">In den nächsten 12 Monaten ändert sich nichts.</div>';
  // Verlauf der Konten
  const {ph}=phasen();const st=CUR<planStart()?planStart():CUR;const ymsAll=Object.keys(CALC).filter(m=>m>=st).sort();
  const yms=bdRng==='all'?ymsAll:ymsAll.slice(0,+bdRng+1);
  const SER=[['TILL','Till','var(--till)'],['PATRICK','Patrick','var(--pat)'],['HAUS','Haushaltskonto','var(--gem)'],['SUM','Zusammen','var(--ink2)']];
  const VAL=[['gt','Giro + Tagesgeld'],['tg','nur Tagesgeld'],['all','inkl. ETF & Gold']];
  const RNG=[['12','1 Jahr'],['36','3 Jahre'],['all','bis '+ymName(PLAN1).split(' ').pop()]];
  const pb=(a,k,on)=>a.map(([x,l])=>`<button type="button" data-${k}="${x}" aria-pressed="${on(x)}">${l}</button>`).join('');
  $('#bd-ser').innerHTML=pb(SER,'bs',x=>bdSer.has(x));$('#bd-val').innerHTML=pb(VAL,'bv',x=>x===bdVal);$('#bd-rng').innerHTML=pb(RNG,'br',x=>x===bdRng);
  const pv=(m,sh)=>{const c=CALC[m]?.[sh];if(!c)return null;if(sh==='HAUS')return c.k+(bdVal==='all'?sharedGold().reduce((a,x)=>a+x.w,0):0);return bdVal==='tg'?c.tg:bdVal==='all'?c.total:c.giro+c.tg;};
  const av=(m,sh)=>sh==='SUM'?['TILL','PATRICK','HAUS'].reduce((a,x)=>a+(pv(m,x)||0),0):pv(m,sh);
  const act=SER.filter(([k])=>bdSer.has(k));
  lineChart($('#c-ueb'),yms,act.map(([k,l,c])=>({n:l,c,dash:k==='HAUS'||k==='SUM'?1:0,v:yms.map(m=>av(m,k))})),{h:240,xl:ymShort,xt:ymName,aria:'Kontostände',mark:yms.indexOf(CUR)});
  $('#bd-leg').innerHTML=act.map(([k,l,c])=>`<span><i style="background:${c}"></i>${l}</span>`).join('')||'<span>Wähle oben mindestens eine Linie.</span>';
  const last=yms.at(-1);
  $('#bd-kpi').innerHTML=act.map(([k,l])=>{const v=yms.map(m=>av(m,k));const lo=v.reduce((a,x,i)=>x<a[0]?[x,i]:a,[Infinity,0]);const d=v.at(-1)-v[0];
    return kpi(l+' · '+ymName(last),eur(v.at(-1),0),`${d>=0?'+':'−'}${eur(Math.abs(d),0)} ggü. ${ymShort(yms[0])} · tiefster Stand ${eur(lo[0],0)} (${ymShort(yms[lo[1]])})`,lo[0]<0?'neg':'');}).join('');
  const yEnd=[...new Set([yms[0],...yms.filter(m=>m.endsWith('-12')),last])].filter(m=>CALC[m]);
  $('#bd-kt').innerHTML=act.length?`<table><thead><tr><th>Ende</th>${act.map(([,l])=>`<th class="r">${l}</th>`).join('')}</tr></thead><tbody>${yEnd.map(m=>`<tr><td>${ymName(m)}</td>${act.map(([k])=>`<td class="r num ${sign(av(m,k))}">${eur(av(m,k),0)}</td>`).join('')}</tr>`).join('')}</tbody></table>`:'';
  const sg=v=>`<b class="${v<0?'neg':'pos'}">${v>0?'+':'−'}${eur(Math.abs(v),0)}</b>`;
  $('#bd-ph').innerHTML=ph.slice(1,1+bdShow).map((x,k)=>{const pr=ph[k];const dT=x.t.rest-pr.t.rest,dP=x.p.rest-pr.p.rest;const parts=[];if(Math.abs(dT)>=1)parts.push(`Till ${sg(dT)}`);if(Math.abs(dP)>=1)parts.push(`Patrick ${sg(dP)}`);
    return `<div class="ph"><div class="ph-z">ab ${ymName(x.von)}</div><div>${parts.join(' · ')} <span class="muted">im Monat</span></div>${x.warum?.length?`<div class="ph-w">weil ${x.warum.map(esc).join(' · ')}</div>`:''}</div>`;}).join('')+(ph.length-1>bdShow?`<button class="btn sec sm" id="bd-more" style="margin-top:8px">Alle ${ph.length-1} Änderungen bis ${ymName(PLAN1)} zeigen</button>`:'')||'<div class="muted">Keine dauerhaften Änderungen geplant.</div>';
  // Rücklagen
  const rl=ruecklagen();
  $('#bd-rl').innerHTML=rl.map(r=>`<div class="rl"><div class="rl-h"><span>${esc(r.l)}</span><span class="num">${eur(r.v)}${r.vj?'':' · '+ymShort(r.due)}</span></div><div class="bar"><i style="width:${Math.round(r.p*100)}%"></i></div><div class="rl-n">${r.p>=0.999?'<span class="ok">voll angespart</span>':`ca. ${eur(r.saved,0)} angespart (${Math.round(r.p*100)} %)`} · ${r.vj?r.note:r.cyc===12?'jährlich':r.cyc===3?'vierteljährlich':r.cyc===6?'halbjährlich':'alle '+r.cyc+' Monate'}${r.vj?'':`, rund ${eur(r.rate,0)} im Monat`}${r.extra||''}</div></div>`).join('')||'<div class="muted">Keine jährlichen oder vierteljährlichen Zahlungen im Plan gefunden.</div>';
  const pj=privJahr();$('#bd-pj').innerHTML=pj.length?`<h3 style="margin-top:14px">Größere Einzelzahlungen vom eigenen Girokonto</h3>`+pj.map(x=>`<div class="row"><span>${esc(x.who)}: ${esc(x.l)} <span class="muted">${ymName(x.ym)}</span></span><span class="num neg">${eur(-x.v)}</span></div>`).join('')+`<div class="note">Diese Zahlungen laufen nicht übers Haushaltskonto. Sie sind oben in „bleibt übrig“ nicht enthalten, damit der Verlauf nicht springt.</div>`:'';
}
document.addEventListener('click',e=>{if(e.target.id==='bd-more'){bdShow=99;rBald();}});

/* ---------- Auswirkungen einer Änderung ---------- */
function metrics(ym){calcAll();const t=uebrig(ym,'TILL'),p=uebrig(ym,'PATRICK');useYm(ym);const anteil=VARS.D_C19;
  const hs=[];for(let m=ym;m<=ymAdd(ym,23)&&m<=PLAN1;m=ymAdd(m,1))if(CALC[m])hs.push([m,CALC[m].HAUS.k]);const low=hs.reduce((a,b)=>b[1]<a[1]?b:a,hs[0]||[ym,0]);
  const e=CALC[PLAN1];const tot=e?e.TILL.total+e.PATRICK.total+e.HAUS.k:0;useYm(month);return {t:t?.rest,p:p?.rest,anteil,low,tot,essen:essenBudget(ym)};}
function impact(k,v,ab){const it=S.grund.items.find(i=>i.k===k);const ym0=ab||(CUR<planStart()?planStart():CUR);const ym=ym0<planStart()?planStart():ym0;
  const A=metrics(ym);const keep=S.grund;const items=structuredClone(keep.items);const j=items.find(i=>i.k===k);
  if(ab){j.hist=(j.hist||[]).filter(h=>h.ab!==ab);j.hist.push({ab,v});}else j.v=v;S.grund={items};let B;try{B=metrics(ym);}finally{S.grund=keep;calcAll();}
  const L=[],W=[];const old=gv(k,ym);const d=v-(+old||0);
  L.push(`<b>${esc(it.l)}</b>: ${eur(old)} → <b>${eur(v)}</b> (${d>=0?'+':''}${eur(d)})${ab?' ab '+ymName(ab):' ab sofort'}`);
  if(Math.abs(B.anteil-A.anteil)>=0.5)L.push(`Jeder zahlt ${d>0?'mehr':'weniger'} aufs Haushaltskonto: ${eur(A.anteil)} → ${eur(B.anteil)} im Monat (${B.anteil>A.anteil?'+':''}${eur(B.anteil-A.anteil)})`);
  if(B.essen!==A.essen)L.push(`Das Essen-Budget im Reiter Übersicht ist dann ${eur(B.essen,0)} statt ${eur(A.essen,0)}.`);
  [['t','Till'],['p','Patrick']].forEach(([x,n])=>{if(A[x]==null)return;const dv=B[x]-A[x];if(Math.abs(dv)>=0.5)L.push(`${n} bleiben im ${ymName(ym)} ${eur(B[x],0)} statt ${eur(A[x],0)} übrig (${dv>0?'+':''}${eur(dv,0)}).`);
    if(B[x]<0)W.push(`${n} gibt dann jeden Monat ${eur(-B[x],0)} mehr aus, als reinkommt.`);else if(B[x]<150&&B[x]<A[x])W.push(`Bei ${n} bleiben nur noch ${eur(B[x],0)} im Monat übrig. Das ist wenig Puffer.`);});
  if(B.low[1]<0&&B.low[1]<A.low[1]-0.5)W.push(`Das Haushaltskonto rutscht im ${ymName(B.low[0])} auf ${eur(B.low[1],0)}.`);
  const dt=B.tot-A.tot;if(Math.abs(dt)>=10)L.push(`Bis ${ymName(PLAN1)} habt ihr zusammen ${dt>0?'rund '+eur(dt,0)+' mehr':'rund '+eur(-dt,0)+' weniger'} auf den Konten.`);
  const LNK={s_pauschale:`Wird automatisch mit angepasst: Strom-Anteil von Till und Patrick in den Monatsplänen (je ${eur(v/2)}) und die Einzahlung im Stromkonto (Reiter Strom).`,h_tilgung:'Wird automatisch mit angepasst: die Sparda-Rate im Reiter Kredite (um denselben Betrag).',ing_rate:'Wird automatisch mit angepasst: ING-Rate im Reiter Kredite und der Gemeinschaftskredit-Anteil (je die Hälfte) in den Monatsplänen.',h_s_frei:'Wird automatisch mit angepasst: das Sonstiges-Budget im Reiter Übersicht.',h_essen:'Wird automatisch mit angepasst: das Essen-Budget im Reiter Übersicht.',t_gehalt:'Wird automatisch mit angepasst: Rest Gehalt bzw. Entnahme vom Tagesgeld in jedem Monat.',p_gehalt:'Wird automatisch mit angepasst: Rest Gehalt bzw. Entnahme vom Tagesgeld in jedem Monat.'};
  if(LNK[k])L.push('🔗 '+LNK[k]);
  if(L.length===1&&!W.length)L.push('Dieser Wert steckt in keinem Monatsplan als Formel, die Monatsrechnung ändert sich dadurch nicht direkt.');
  return {L,W,ym};}
function askGrund(k,v,el,ab){const box=$('#imp');if(!box.hidden&&box.dataset.kv===k+'|'+v)return;box.dataset.kv=k+'|'+v;const it=S.grund.items.find(i=>i.k===k);if(!it)return;let mode=ab?'ab':'sofort';let abm=ab||ymAdd(CUR,1);
  const draw=()=>{const r=impact(k,v,mode==='ab'?abm:null);box.innerHTML=`<div class="imp-c card"><h2>Was passiert, wenn du das änderst?</h2>${r.L.map(x=>`<div class="imp-l">${x}</div>`).join('')}${(()=>{if(!['h_wasser','h_grundst'].includes(k)||mode!=='ab'||abm.slice(5)==='01')return '';const y=abm.slice(0,4),m=+abm.slice(5);let sv=0;for(let j=1;j<m;j++)sv+=vjRate(k,y+'-'+String(j).padStart(2,'0'));const nr=Math.max(0,(v-sv)/(13-m));return `<div class="imp-l">💡 Bis ${ymName(ymAdd(abm,-1))} sind für ${y} schon ${eur(sv)} zurückgelegt. Damit bis Dezember genau ${eur(v)} zusammenkommen, werden ab ${ymName(abm)} <b>${eur(nr)} im Monat</b> angespart. Ab Januar ${+y+1} dann wieder ${eur(v/12)} im Monat.</div>`;})()}${r.W.map(x=>`<div class="imp-w">⚠️ ${x}</div>`).join('')}
    <div class="imp-ab"><label><input type="radio" name="impm" value="sofort" ${mode==='sofort'?'checked':''}> ab sofort (alle offenen Monate)</label><label><input type="radio" name="impm" value="ab" ${mode==='ab'?'checked':''}> erst ab <input type="month" id="imp-m" value="${abm}"></label></div>
    <div style="display:flex;gap:8px;margin-top:10px"><button class="btn" id="imp-ok">Übernehmen</button><button class="btn sec" id="imp-no">Abbrechen</button></div></div>`;box.hidden=false;};
  draw();
  box.onchange=e=>{if(e.target.name==='impm')mode=e.target.value;if(e.target.id==='imp-m'&&e.target.value){abm=e.target.value;mode='ab';}draw();};
  box.onclick=async e=>{if(e.target.id==='imp-no'||e.target===box){box.hidden=true;box.dataset.kv='';render();}if(e.target.id==='imp-ok'){box.hidden=true;box.dataset.kv='';await setGrund(k,v,mode==='ab'?abm:null);flash('ok',mode==='ab'?'Vorgemerkt ab '+ymName(abm):'Geändert');}};}

