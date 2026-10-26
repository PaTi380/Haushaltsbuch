/* ---------- Einmalige Umstellungen ---------- */
const SEP_PLAN={"TILL":{"C":[{"l":"Haus, sonst.","v":1368.21},{"l":"Pauschale","v":300},{"l":"Ioniq 6","v":512.71},{"l":"Ioniq 6 Tanken","v":80},{"l":"Kreditkarte","v":0},{"l":"ETF","v":100},{"l":"Sparen für Auto","v":50},{"l":"Whoop","v":150},{"l":"Strom Anteil Till","v":40},{"l":"Versicherungen","v":112.53}],"E":[{"l":"Giroausgleich","v":2300,"f":"=GIROAUSGLEICH"},{"l":"Rückgabe von Patrick","v":300}],"I":[{"l":"Whoop","v":530}],"K":[{"l":"Rest Gehalt","v":496.05,"f":"=RESTGEHALT"},{"l":"sonstiges","v":0},{"l":"sonstiges","v":null},{"l":"sonstiges","v":null}]},"PATRICK":{"C":[{"l":"Haus, sonst.","v":1368.21},{"l":"Pauschale","v":170},{"l":"Versicherungen","v":215.16},{"l":"Kreditkarte","v":50},{"l":"Strom Anteil Patrick","v":45},{"l":"ETF","v":50},{"l":"Rückgabe an Till","v":300},{"l":"Sparen für Auto","v":50}],"E":[{"l":"Giroausgleich","v":2248,"f":"=GIROAUSGLEICH"}],"I":[],"K":[{"l":"Rest Gehalt","v":300,"f":"=RESTGEHALT"},{"l":"sonstiges","v":null},{"l":"sonstiges","v":null},{"l":"sonstiges","v":null}]},"HAUS":{"G":[{"l":"Tilgung","v":1628},{"l":"Essen","v":350},{"l":"Internet","v":49.9},{"l":"sonstiges","v":235.97},{"l":"Risikolebensversicherung","v":28},{"l":"Rechtsschutzversicherung","v":41.93},{"l":"Heizölgeld","v":1000},{"l":"sonstiges","v":100}],"I":[{"l":"Anteil Patrick","v":1368.22},{"l":"Anteil Till","v":1368.22}],"notiz":"Nach Septemberanteil 1000€ für Öl zur Verfügung"}};
let migRunning=false;
async function migrate(){if(migRunning||!db)return;const M=S.einst?.mig||{};if(M.sep&&M.rueck&&M.pc&&M.gst&&M.hlink&&M.gst2&&M.igbce&&M.wlink&&M.gstrate)return;
  const real=Object.keys(S.plan).filter(k=>!S.plan[k]._virt);if(real.length<12||!S.grund.items.length)return;migRunning=true;
  try{const nm={...M};
    if(!M.sep){if(!S.plan['2026-09']){const d=structuredClone(SEP_PLAN);S.plan['2026-09']=d;await save('plan/2026-09',d);if(CUR==='2026-09')month=CUR;}nm.sep=1;}
    if(!M.rueck){const RX=/^rückgabe (an till|von patrick)$/i;const ms=[];let val=null;
      Object.keys(S.plan).sort().forEach(ym=>{const P=S.plan[ym];if(P._virt||P.zu)return;let hit=false;['TILL','PATRICK'].forEach(sh=>{const b=P[sh];if(!b)return;['C','E'].forEach(g=>{(b[g]||[]).forEach(e=>{if(!e._c&&RX.test((e.l||'').trim())){hit=true;if(sh==='PATRICK'&&g==='C'&&val==null)val=+e.v||0;}});});});if(hit)ms.push(ym);});
      if(ms.length&&!S.grund.items.some(i=>i.k==='c_rueck')){const items=[...S.grund.items,{k:'c_rueck',l:'Rückgabe an Till',g:'Patrick',v:val||300,cu:{art:'aus',rh:'m',ab:ms[0],an:'Till',lg:'Rückgabe von Patrick'},bis:ms.at(-1),am:TODAY}];S.grund={items};await save('config/grund',{items});
        for(const ym of ms)await savePlan(ym,d=>{['TILL','PATRICK'].forEach(sh=>{const b=d[sh];if(!b)return;['C','E'].forEach(g=>{if(b[g])b[g]=b[g].filter(e=>!RX.test((e.l||'').trim()));});});});}
      nm.rueck=1;}
    if(!M.pc){if(S.grund.items.some(i=>i.k==='p_pc')){const items=S.grund.items.filter(i=>i.k!=='p_pc');S.grund={items};await save('config/grund',{items});}nm.pc=1;}
    if(!M.gst){/* Grundsteuer wird 4× im Jahr abgebucht (15.02., 15.05., 15.08., 15.11.); im Februar fehlte sie im Plan */
      for(const ym of Object.keys(S.plan).filter(k=>k.endsWith('-02')&&!S.plan[k]._virt&&!S.plan[k].zu).sort()){const G=S.plan[ym]?.HAUS?.G||[];if(!G.some(e=>/^grundsteuer/i.test((e.l||'').trim())))await savePlan(ym,d=>{const h=d.HAUS=d.HAUS||{};(h.G=h.G||[]).push({l:'Grundsteuer',f:'=Grundsteuer_jährlich/4',v:r2(gn('h_grundst')/4)});});}
      nm.gst=1;}
    if(!M.hlink){/* Okt–Dez 2026 hatten aus der Excel feste Werte bei „Haus, sonst.“ und den Anteilen. Jetzt an die Grundbeträge koppeln (Differenz bleibt als fester Zuschlag), damit z. B. ein höheres Essen-Budget überall mitläuft */
      const F={TILL:"='Dashboard (Patrick, Till)'!$C$19",PATRICK:"='Dashboard (Patrick, Till)'!$D$19"};
      for(const ym of Object.keys(S.plan).filter(k=>!S.plan[k]._virt&&!S.plan[k].zu).sort()){const P=S.plan[ym];useYm(ym);const todo=[];
        [['TILL','C',/^haus, sonst\.?$/i,F.TILL],['PATRICK','C',/^haus, sonst\.?$/i,F.PATRICK],['HAUS','I',/^anteil till$/i,F.TILL],['HAUS','I',/^anteil patrick$/i,F.PATRICK]].forEach(([sh,g,rx,f])=>{(P[sh]?.[g]||[]).forEach((e,i)=>{if(!e.f&&!e._c&&rx.test((e.l||'').trim())&&e.v!=null){const base=evalF(f);if(isFinite(base)){const off=Math.round((+e.v-base)*1000)/1000;todo.push([sh,g,i,Math.abs(off)<0.01?f:f+(off>0?'+':'')+off]);}}});});
        if(todo.length)await savePlan(ym,d=>{todo.forEach(([sh,g,i,f])=>{const e=d[sh]?.[g]?.[i];if(e){e.f=f;}});});}
      useYm(month);nm.hlink=1;}
    if(!M.gst2){/* Die Excel hatte die Grundsteuer im April (Termin 15.04. von 2025). Ab 2026 ist der Termin 15.02. – die Februar-Rate ist ergänzt, also April entfernen */
      for(const ym of Object.keys(S.plan).filter(k=>k.endsWith('-04')&&k>='2027-01'&&!S.plan[k]._virt&&!bzu(S.plan[k],'HAUS')).sort()){const G=S.plan[ym]?.HAUS?.G||[];if(G.some(e=>/^grundsteuer/i.test((e.l||'').trim())&&!e._c))await savePlan(ym,d=>{if(d.HAUS?.G)d.HAUS.G=d.HAUS.G.filter(e=>!/^grundsteuer/i.test((e.l||'').trim()));});}
      nm.gst2=1;}
    if(!M.igbce){if(!S.grund.items.some(i=>i.k==='t_igbce')){const items=[...S.grund.items];const at=items.findIndex(i=>i.k==='t_gehalt');items.splice(at+1,0,{k:'t_igbce',l:'IGBCE-Beitrag',g:'Till',v:41.91,am:TODAY});S.grund={items};await save('config/grund',{items});}nm.igbce=1;}
    if(!M.wlink){/* Wasser-Abschlag als eigener Grundbetrag, Raten + ADAC an Grundbeträge koppeln */
      if(!S.grund.items.some(i=>i.k==='h_wasser_ab')){const items=[...S.grund.items];const at=items.findIndex(i=>i.k==='h_wasser');items.splice(at+1,0,{k:'h_wasser_ab',l:'Wasser-Abschlag',g:'Haus',v:180,am:TODAY});S.grund={items};await save('config/grund',{items});}
      for(const ym of Object.keys(S.plan).filter(k=>!S.plan[k]._virt&&!bzu(S.plan[k],'HAUS')).sort()){const G=S.plan[ym]?.HAUS?.G||[];const todo=[];
        G.forEach((e,i)=>{if(e.f||e._c)return;const l=(e.l||'').trim();if(/^wasserabgabe$/i.test(l)&&Math.abs((+e.v||0)-180)<0.01)todo.push([i,'=Wasser_Abschlag']);else if(/^adac$/i.test(l))todo.push([i,'=ADAC_jährlich']);});
        if(todo.length)await savePlan(ym,d=>{todo.forEach(([i,f])=>{const e=d.HAUS?.G?.[i];if(e)e.f=f;});});}
      nm.wlink=1;}
    if(!M.gstrate){for(const ym of Object.keys(S.plan).filter(k=>!S.plan[k]._virt&&!bzu(S.plan[k],'HAUS')).sort()){const G=S.plan[ym]?.HAUS?.G||[];const todo=[];G.forEach((e,i)=>{if(e.f==='=Grundsteuer_jährlich/4')todo.push(i);});
        if(todo.length)await savePlan(ym,d=>{todo.forEach(i=>{const e=d.HAUS?.G?.[i];if(e)e.f='=Grundsteuer_Rate';});});}
      nm.gstrate=1;}
    S.einst={...S.einst,mig:nm};await save('config/einstellungen',S.einst);render();
  }catch(err){console.error('Umstellung',err);}finally{migRunning=false;}}
