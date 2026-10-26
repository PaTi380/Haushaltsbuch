/* ---------- Strom ---------- */
const PV_SHARE=[2.9,4.6,8.2,11.6,13.2,13.2,13.6,12,9,6,3.4,2.3];
const PV_TEMP=[0.1,3.9,5.5,9.3,13.4,19.0,20.0,19.4,14.5,9.8,5.0,3.4];// Jan–Aug 2026 + Dez 2025 aus Tills Wetterdaten, Sep–Nov typische Eifelwerte
const PV_CLEAR=[2.2,3.4,5.0,6.5,7.2,7.5,7.4,6.6,5.3,3.7,2.4,1.8];// kWh je kWp an einem klaren Tag
const PV_DAYS=[31,28,31,30,31,30,31,31,30,31,30,31];const PV_HDD=PV_TEMP.reduce((a,t,i)=>a+Math.max(0,15-t)*PV_DAYS[i],0);
const PVM=['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
const PV_DEF={kwp:13.8,spe:11.2,ertrag:950,waerme:14800,wpAb:'2027-01',preis:30,verg:7.7,tag:45,hh:[920,610,590,510,280,380,460,460,440,525,850,730]};
const pvCfg=()=>({...PV_DEF,...(S.strom.pv||{}),hh:(S.strom.pv?.hh||PV_DEF.hh)});
function pvCalc(c,withWP=true){
  const hdd=PV_TEMP.map((t,i)=>Math.max(0,15-t)*[31,28,31,30,31,30,31,31,30,31,30,31][i]);const hs=hdd.reduce((a,b)=>a+b,0);
  const types=[[1.9,.3],[1.05,.35],[.18,.35]];
  return PV_TEMP.map((t,i)=>{const D=[31,28,31,30,31,30,31,31,30,31,30,31][i];
    const pv=c.kwp*c.ertrag*PV_SHARE[i]/100;const hh=+c.hh[i]||0;
    const qh=c.waerme*.85*hdd[i]/hs,ww=c.waerme*.15/12;const cop=Math.min(4.3,Math.max(2.4,2.9+.08*t));const wp=withWP?qh/cop+ww/2.8:0;
    const L=(hh+wp)/D;let direct=0,bat=0,grid=0,feed=0;
    types.forEach(([f,w])=>{const p=pv/D*f;const d=Math.min(p,L*c.tag/100);const sur=p-d;const night=L-d;const b=Math.min(sur*.92,c.spe*.9,night);direct+=d*w*D;bat+=b*w*D;grid+=(night-b)*w*D;feed+=(sur-b/.92)*w*D;});
    const kost=grid*c.preis/100,ein=feed*c.verg/100,vorher=(hh+wp)*c.preis/100;
    return {m:i,pv,hh,wp,qh,ww,direct,bat,grid,feed,kost,ein,vorher,netto:kost-ein};});}
const n0=v=>Math.round(v).toLocaleString('de-DE');
const pvSum=(R,k)=>R.reduce((a,r)=>a+r[k],0);
let sJahr='2027',sCr='jahr';
function rStrom(){
  // Stromkonto
  const sm=S.strom.m||{};const sk=[];for(let ym='2027-01';ym<=PLAN1;ym=ymAdd(ym,1))sk.push(ym);
  const pa=gn('s_pauschale');let bal=+S.strom.start||0;const ks=[];
  const pf=(ym,f)=>{for(let m=ym,n=0;n<20&&m>='2027-01';m=ymAdd(m,-12),n++){const v=sm[m]?.[f];if(v!=null&&v!=='')return +v;}return null;};
  const vb=(o,ym)=>o.ist!=null?+o.ist:(pf(ym,'verbrauch')||0);
  sk.forEach(ym=>{const o=sm[ym]||{};const sp=o.spar!=null?+o.spar:gn('s_pauschale',ym);bal+=sp+(pf(ym,'verg')||0)-vb(o,ym);ks.push(bal);});
  const yrs=[...new Set(sk.map(m=>m.slice(0,4)))];if(!yrs.includes(sJahr))sJahr=yrs[0];
  $('#s-yr').innerHTML=yrs.map(y=>`<button type="button" data-sy="${y}" aria-pressed="${y===sJahr}">${y}</button>`).join('');
  const dv=(o,ym)=>{const pl=pf(ym,'verbrauch');if(o.ist==null||pl==null)return '';const d=+o.ist-pl;return Math.abs(d)<0.5?'<span class="sdv eq">±0</span>':`<span class="sdv ${d>0?'neg':'pos'}" title="${d>0?'mehr':'weniger'} verbraucht als geplant">${d>0?'+':'−'}${n0(Math.abs(d))} €</span>`;};
  const tb=$('#s-table');const ys=sk.map((m,i)=>[m,i]).filter(([m])=>m.startsWith(sJahr));
  if(!tb.contains(document.activeElement)||tb.dataset.y!==sJahr){tb.dataset.y=sJahr;tb.innerHTML=`<thead><tr><th>Monat</th><th class="r"><span class="hl">Einzahlung</span><span class="hs">Einz.</span></th><th class="r"><span class="hl">Verbrauch geplant</span><span class="hs">Plan</span></th><th class="r"><span class="hl">Verbrauch echt</span><span class="hs">Echt</span></th><th class="r"><span class="hl">Vergütung</span><span class="hs">Verg.</span></th><th class="r"><span class="hl">Kontostand</span><span class="hs">Stand</span></th></tr></thead><tbody>`+ys.map(([ym,i])=>{const o=sm[ym]||{};return `<tr><td>${PVM[+ym.slice(5)-1]}</td><td class="r"><input class="ist sm" inputmode="decimal" data-sm="${ym}:spar" value="${num(o.spar)}" placeholder="${num(gn('s_pauschale',ym))}"></td><td class="r"><input class="ist sm" inputmode="decimal" data-sm="${ym}:verbrauch" value="${num(o.verbrauch)}" placeholder="${num(pf(ym,'verbrauch'))}"></td><td class="r"><span class="sdvw"><span data-dv="${ym}">${dv(o,ym)}</span><input class="ist sm ${o.ist!=null?'set':''}" inputmode="decimal" data-sm="${ym}:ist" value="${num(o.ist)}" placeholder="–"></span></td><td class="r"><input class="ist sm" inputmode="decimal" data-sm="${ym}:verg" value="${num(o.verg)}" placeholder="${num(pf(ym,'verg'))}"></td><td class="r num ${ks[i]<0?'neg':''}" data-ks="${i}">${eur(ks[i],0)}</td></tr>`;}).join('')+'</tbody>';}
  else{ks.forEach((v,i)=>{const c=tb.querySelector(`[data-ks="${i}"]`);if(c){c.textContent=eur(v,0);c.classList.toggle('neg',v<0);}});ys.forEach(([ym])=>{const c=tb.querySelector(`[data-dv="${ym}"]`);if(c)c.innerHTML=dv(sm[ym]||{},ym);});}
  if(document.activeElement!==$('#s-start'))$('#s-start').value=num(S.strom.start||0);
  const yi=ys.map(x=>x[1]);const low=ks.reduce((a,v,i)=>v<a[0]?[v,i]:a,[Infinity,0]);const y1=ys.reduce((a,[ym])=>a+vb(sm[ym]||{},ym)-(pf(ym,'verg')||0),0);
  const isum=ys.reduce((a,[ym])=>{const o=sm[ym]||{};const pl=pf(ym,'verbrauch');if(o.ist!=null&&pl!=null){a.n++;a.d+=+o.ist-pl;}return a;},{n:0,d:0});
  $('#s-kpi').innerHTML=kpi('Kontostand Ende '+sJahr,eur(ks[yi.at(-1)],0),'',sign(ks[yi.at(-1)]))+kpi('tiefster Stand',eur(low[0],0),ymName(sk[low[1]]),low[0]<0?'neg':'')+kpi('Stromkosten '+sJahr+' netto',eur(y1,0),`${eur(y1/12,0)} im Monat, Pauschale ${eur(pa,0)}`)+(isum.n?kpi('Echt vs. geplant '+sJahr,`${isum.d>0?'+':isum.d<0?'−':'±'}${eur(Math.abs(isum.d),0)}`,`${isum.n} Monat${isum.n>1?'e':''} eingetragen · ${isum.d>0?'mehr':'weniger'} verbraucht`,isum.d>0.5?'neg':'pos'):'');
  $('#s-cr').innerHTML=[['jahr','nur '+sJahr],['3','3 Jahre ab '+sJahr],['all','alle Jahre']].map(([x,l])=>`<button type="button" data-sc="${x}" aria-pressed="${x===sCr}">${l}</button>`).join('');
  const ci=sk.map((m,i)=>i).filter(i=>sCr==='all'||(sCr==='jahr'?sk[i].startsWith(sJahr):sk[i]>=sJahr&&sk[i]<String(+sJahr+3)));
  lineChart($('#c-skonto'),ci.map(i=>sk[i]),[{n:'Kontostand',c:'var(--acc)',v:ci.map(i=>ks[i])}],{h:180,xl:ymShort,xt:ymName,aria:'Stromkonto'});
  // PV-Modell (Karte entfernt)
  if(!$('#f-pv'))return;
  const c=pvCfg();const f=$('#f-pv');
  if(!f.contains(document.activeElement)){f.innerHTML=[['kwp','PV-Leistung (kWp)'],['spe','Speicher (kWh)'],['ertrag','Ertrag je kWp und Jahr (kWh)'],['waerme','Wärmebedarf Heizung + Warmwasser (kWh/Jahr)'],['wpAb','Wärmepumpe ab','month'],['preis','Strompreis (ct/kWh)'],['verg','Einspeisevergütung (ct/kWh)'],['tag','Anteil Verbrauch tagsüber (%)']].map(([k,l,t])=>`<label>${l}<input ${t?'type="month"':'inputmode="decimal"'} data-pv="${k}" value="${t?c[k]:num(c[k])}" style="width:${t?140:90}px"></label>`).join('');
    $('#pv-hh').innerHTML=`<div class="note">Haus + E-Auto je Monat (kWh), vorbelegt aus deinen Screenshots:</div><div class="hh">${PVM.map((m,i)=>`<label>${m}<input inputmode="numeric" data-hh="${i}" value="${c.hh[i]}"></label>`).join('')}</div>`;}
  const R=pvCalc(c);const T=k=>pvSum(R,k);
  const verb=T('hh')+T('wp'),eig=T('direct')+T('bat');const jaz=(T('qh')+T('ww'))/Math.max(1,T('wp'));
  const vorher=T('vorher'),nach=T('netto');const ohneWP=pvCalc(c,false);const hhAlt=pvSum(ohneWP,'hh')*c.preis/100;
  $('#pv-kpi').innerHTML=kpi('PV-Ertrag im Jahr',n0(T('pv'))+' kWh',`${num(c.kwp)} kWp`)+kpi('Verbrauch gesamt',n0(verb)+' kWh',`davon Wärmepumpe ${n0(T('wp'))} kWh (JAZ ≈ ${num(Math.round(jaz*10)/10)})`)+kpi('Autarkie',Math.round(eig/verb*100)+' %',`Eigenverbrauch ${Math.round(eig/T('pv')*100)} % vom PV-Strom`)+kpi('Strom netto im Jahr',eur(nach,0),`ohne PV wären es ${eur(vorher,0)}`,sign(-nach));
  lineChart($('#c-pv'),PVM,[{n:'Verbrauch',c:'var(--out)',v:R.map(r=>r.hh+r.wp)},{n:'PV-Ertrag',c:'var(--gold)',v:R.map(r=>r.pv)},{n:'aus dem Netz',c:'var(--mute)',dash:1,v:R.map(r=>r.grid)}],{h:220,aria:'Strom je Monat'});
  $('#pv-leg').innerHTML='<span><i style="background:var(--out)"></i>Verbrauch</span><span><i style="background:var(--gold)"></i>PV-Ertrag</span><span><i style="background:var(--mute)"></i>aus dem Netz</span> <span class="muted">(kWh)</span>';
  $('#pv-table').innerHTML=`<thead><tr><th>Monat</th><th class="r">Verbrauch</th><th class="r">PV</th><th class="r">Netz</th><th class="r">Einspeisung</th><th class="r">Kosten €</th><th class="r">Vergütung €</th></tr></thead><tbody>`+R.map(r=>`<tr><td>${PVM[r.m]}</td><td class="r">${n0(r.hh+r.wp)}</td><td class="r">${n0(r.pv)}</td><td class="r">${n0(r.grid)}</td><td class="r">${n0(r.feed)}</td><td class="r">${n0(r.kost)}</td><td class="r pos">${n0(r.ein)}</td></tr>`).join('')+`<tr class="sum"><td>Jahr</td><td class="r">${n0(verb)}</td><td class="r">${n0(T('pv'))}</td><td class="r">${n0(T('grid'))}</td><td class="r">${n0(T('feed'))}</td><td class="r">${n0(T('kost'))}</td><td class="r pos">${n0(T('ein'))}</td></tr></tbody>`;
  const need=nach/12;const winter=[0,1,11].reduce((a,i)=>a+R[i].netto,0);
  $('#pv-out').innerHTML=`<div class="note" style="margin-top:0">Heute (nur Haus + E-Auto, ohne PV) zahlt ihr bei ${num(c.preis)} ct rund <b>${eur(hhAlt,0)}</b> im Jahr. Mit Wärmepumpe, aber ohne PV wären es ${eur(vorher,0)}; dafür fällt das Heizöl weg. Mit PV und Speicher bleiben nach dieser Schätzung <b>${eur(nach,0)}</b> netto, also rund <b>${eur(need,0)} im Monat</b>. Eure Strompauschale liegt bei ${eur(pa,0)}${pa>=need+15?`; das reicht mit Luft.`:pa>=need?'; das passt knapp.':`; die sollte eher auf ${eur(Math.ceil(need/10)*10,0)} steigen.`} Dezember bis Februar kosten zusammen rund ${eur(winter,0)}, deshalb läuft das Stromkonto im Winter runter und im Sommer wieder hoch.</div>
    <div class="note">Nicht eingerechnet: günstige Stunden eures dynamischen Tarifs (Laden nachts oder mittags bei niedrigen Preisen spart zusätzlich), Grundgebühr und Zählerkosten. Einspeisung: ${num(c.verg)} ct/kWh (Inbetriebnahme 2026, 20 Jahre fest).</div>
    <button class="btn sec" id="pv-apply">Schätzung ins Stromkonto übernehmen (2027–2029)</button> <span class="note" id="pv-msg" style="margin:0"></span>`;
  rWx();
}
$('#p-strom').addEventListener('change',e=>{const i=e.target;
  if(i.id==='s-start'){const d={...S.strom,start:parseNum(i.value)||0};S.strom=d;render();save('config/strom',d);return;}
  if(i.dataset.pv||i.dataset.hh!=null){const c=pvCfg();if(i.dataset.pv)c[i.dataset.pv]=i.type==='month'?i.value:parseNum(i.value);else{c.hh=[...c.hh];c.hh[+i.dataset.hh]=parseNum(i.value)||0;}const d={...S.strom,pv:c};S.strom=d;render();save('config/strom',d);}});
$('#p-strom').addEventListener('click',async e=>{
  if(e.target.id==='pv-apply'){const c=pvCfg();const R=pvCalc(c);const d=structuredClone(S.strom);d.m=d.m||{};
    for(let ym='2027-01';ym<='2029-12';ym=ymAdd(ym,1)){const r=ym>=c.wpAb?R[+ym.slice(5)-1]:pvCalc(c,false)[+ym.slice(5)-1];d.m[ym]={...(d.m[ym]||{}),verbrauch:Math.round(r.kost),verg:Math.round(r.ein)};}
    S.strom=d;render();await save('config/strom',d);$('#pv-msg').textContent='Übernommen. Rückgängig geht unten rechts.';}
  if(e.target.id==='wx-go')wxGo();});
async function wxGo(){const tx=$('#wx-text').value.trim();const msg=$('#wx-msg');if(!tx)return;
  if(!sampleFn){msg.textContent='Die KI ist in dieser Ansicht nicht verfügbar.';return;}
  $('#wx-go').disabled=true;msg.textContent='Die KI liest die Vorhersage …';
  try{const r=await sampleFn.json(`Heute ist ${TODAY}. Hier ist eine Wettervorhersage für Üdersdorf (Eifel). Gib für jeden genannten Tag zurück: datum (JJJJ-MM-TT), wolken (0 = wolkenlos bis 100 = komplett bedeckt, Schätzung aus der Beschreibung), temp (Tagesmittel °C, Schätzung), text (2–4 Wörter).
Vorhersage: """${tx.slice(0,3000)}"""
Antworte NUR mit JSON: {"tage":[{"datum":"","wolken":0,"temp":0,"text":""}]}`,{modelTier:'default',cache:false});
    const t=(r?.tage||[]).filter(x=>x&&x.datum);if(!t.length){msg.textContent='Ich konnte keine Tage erkennen. Kopier am besten die Tagesübersicht mit Datum oder Wochentag.';}
    else{const d={...S.strom,wx:{am:TODAY,tage:t}};S.strom=d;render();await save('config/strom',d);msg.textContent='';$('#wx-text').value='';}}
  catch(e){msg.textContent=e?.message&&(e.code==='no_key'||e.code==='api_error')?e.message:'Das hat nicht geklappt. Bitte noch einmal versuchen.';}
  $('#wx-go').disabled=false;}
function rWx(){const a=S.strom.wx,b=S.live?.wx;const w=(b?.tage?.length&&(!a?.am||b.am>=a.am))?b:a;const out=$('#wx-out');if(!w?.tage?.length){out.innerHTML='';return;}const c=pvCfg();
  const rows=w.tage.map(x=>{const m=+String(x.datum).slice(5,7)-1;const cl=Math.max(0,Math.min(100,+x.wolken||0));const pv=c.kwp*PV_CLEAR[m]*(.15+.85*(1-cl/100));
    const t=+x.temp;const qh=Math.max(0,15-t)*c.waerme*.85/PV_HDD,ww=c.waerme*.15/365;const wp=x.datum>=c.wpAb+'-01'?qh/Math.min(4.3,Math.max(2.4,2.9+.08*t))+ww/2.8:0;const load=(+c.hh[m]||0)/30+wp;return {...x,pv,load,ueb:pv-load};});
  const best=rows.filter(r=>r.ueb>8).map(r=>dDE(r.datum));
  out.innerHTML=`<div class="tw"><table><thead><tr><th>Tag</th><th>Wetter</th><th class="r">PV (kWh)</th><th class="r">Verbrauch</th><th class="r">Überschuss</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${dDE(r.datum)}</td><td>${esc(r.text||'')}</td><td class="r">${n0(r.pv)}</td><td class="r">${n0(r.load)}</td><td class="r ${r.ueb>0?'pos':'neg'}">${r.ueb>0?'+':''}${n0(r.ueb)}</td></tr>`).join('')}</tbody></table></div>
  <div class="note">${best.length?`Gute Tage zum E-Auto laden oder für Waschmaschine und Trockner: <b>${best.join(', ')}</b>. `:'In diesen Tagen bleibt kaum Überschuss; laden lohnt sich eher in günstigen Stunden eures Tarifs. '}Vorhersage vom ${dDE(w.am)}${w.quelle?' ('+esc(w.quelle)+', automatisch)':''}, Werte grob geschätzt.${w.am<TODAY?' Für neue Tage einfach die aktuelle Vorhersage einfügen.':''}</div>`;}
