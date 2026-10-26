/* ---------- Fragen & Was wäre wenn ---------- */
let wiLast=null;
function withChanges(ch,fn){const keep=S.grund,keepK=S.kredit;const items=structuredClone(keep.items);const kr=structuredClone(K());
  ch.forEach(c=>{if(c.art==='grund'){const j=items.find(i=>i.k===c.key);if(!j)return;if(c.ab){j.hist=(j.hist||[]).filter(h=>h.ab!==c.ab);j.hist.push({ab:c.ab,v:+c.wert});}else j.v=+c.wert;}
    if(c.art==='kredit'){const ks=String(c.feld).split('.');let o=kr;ks.slice(0,-1).forEach(k=>{o=o[k]=o[k]||{};});o[ks.at(-1)]=c.wert;}});
  S.grund={items};S.kredit=kr;try{return fn();}finally{S.grund=keep;S.kredit=keepK;calcAll();}}
const wiStart=()=>CUR<planStart()?planStart():CUR;
function wiSnap(){calcAll();const {rows}=phasen();const yms=Object.keys(CALC).filter(m=>m>=wiStart()).sort();
  return {rows,yms,T:yms.map(m=>CALC[m].TILL.giro+CALC[m].TILL.tg),P:yms.map(m=>CALC[m].PATRICK.giro+CALC[m].PATRICK.tg),H:yms.map(m=>CALC[m].HAUS.k)};}
function wiRun(ch){const A=wiSnap();const B=withChanges(ch,wiSnap);const st=wiStart();const first=ch.map(c=>c.ab).filter(Boolean).sort()[0]||st;
  const L=[],W=[];const at=(X,ym,k)=>X.rows.find(r=>r.ym===ym)?.[k].rest;const sg=v=>`${v>0?'+':'−'}${eur(Math.abs(v),0)}`;
  const months=[...new Set(ch.map(c=>c.ab&&c.ab>st?c.ab:st))].sort();
  months.forEach(ym=>{[['t','Till'],['p','Patrick']].forEach(([k,n])=>{const a=at(A,ym,k),b=at(B,ym,k);if(a==null||b==null||Math.abs(a-b)<1)return;L.push(`Ab ${ymName(ym)} hat ${n} jeden Monat <b>${eur(Math.abs(b-a),0)} ${b>a?'mehr':'weniger'}</b> zur Verfügung.`);});});
  const n=A.yms.length-1;[['T','Till'],['P','Patrick']].forEach(([k,nm])=>{const d=B[k][n]-A[k][n];if(Math.abs(d)>=10)L.push(`${nm} hätte Ende ${ymName(A.yms[n])} <b>${eur(B[k][n],0)}</b> auf Giro + Tagesgeld statt ${eur(A[k][n],0)} (${sg(d)}).`);
    const i=B[k].findIndex((v,j)=>B.yms[j]>=first&&v<0);if(i>=0&&!(A[k][i]<0))W.push(`${nm}s Giro + Tagesgeld wären ab ${ymName(B.yms[i])} im Minus. Dann reicht das Geld nicht mehr.`);});
  const hi=B.H.findIndex((v,j)=>B.yms[j]>=first&&v<0);if(hi>=0&&!(A.H[hi]<0))W.push(`Das Haushaltskonto rutscht im ${ymName(B.yms[hi])} ins Minus.`);
  return {A,B,L,W};}
function wiDesc(c){if(c.art==='grund'){const it=S.grund.items.find(i=>i.k===c.key);return `${esc(it?.l||c.key)}: ${eur(gv(c.key,c.ab||CUR))} → ${eur(+c.wert)} ${c.ab?'ab '+ymName(c.ab):'ab sofort'}`;}if(c.art==='kredit'){const f=KFELDER.find(x=>x[0]===c.feld);return `${esc(f?f[1]:c.feld)}: ${fmtK2(c.feld,c.wert)}`;}return esc(JSON.stringify(c));}
function wiContext(){calcAll();const {ph}=phasen();const st=wiStart();
  const phs=ph.map(x=>`${x.von} bis ${x.bis}: Till legt monatlich ${Math.round(x.t.rest)} € zurück (Gehalt ${Math.round(x.t.geh)}; feste Posten: ${Object.entries(x.t.c).map(([l,v])=>`${l.replace(/^\+/,'Eingang ')} ${Math.round(Math.abs(v))}`).join(', ')}), Patrick ${Math.round(x.p.rest)} € (Gehalt ${Math.round(x.p.geh)}; ${Object.entries(x.p.c).map(([l,v])=>`${l.replace(/^\+/,'Eingang ')} ${Math.round(Math.abs(v))}`).join(', ')})${x.warum?.length?'; geändert gegenüber vorher: '+x.warum.join(', '):''}`).join('\n');
  const yEnd=Object.keys(CALC).filter(m=>m>=st&&(m.endsWith('-12')||m===st)).map(m=>`${m}: Till ${Math.round(CALC[m].TILL.giro+CALC[m].TILL.tg)} €, Patrick ${Math.round(CALC[m].PATRICK.giro+CALC[m].PATRICK.tg)} €, Haushaltskonto ${Math.round(CALC[m].HAUS.k)} €`).join('; ');
  const mon=Object.keys(CALC).filter(m=>m>=st).sort().map((m,i,a)=>{const pm=i?a[i-1]:ymAdd(m,-1);const c=CALC[m],p0=CALC[pm];const T=c.TILL.giro+c.TILL.tg,P=c.PATRICK.giro+c.PATRICK.tg;const dT=p0?T-(p0.TILL.giro+p0.TILL.tg):null,dP=p0?P-(p0.PATRICK.giro+p0.PATRICK.tg):null;
    const f=varFlows(m).filter(x=>Math.abs(x.v)>=20).map(x=>`${x.who} ${x.art} „${x.l}“ ${Math.round(x.v)}`);const u=uebrig(m,'TILL'),q=uebrig(m,'PATRICK');const em=[...(u?.einm||[]).map(([l,v])=>`Till einmalig „${l}“ -${Math.round(v)}`),...(q?.einm||[]).map(([l,v])=>`Patrick einmalig „${l}“ -${Math.round(v)}`)];
    return `${m}: Till ${Math.round(T)} €${dT!=null?' ('+(dT>=0?'+':'')+Math.round(dT)+')':''}, Patrick ${Math.round(P)} €${dP!=null?' ('+(dP>=0?'+':'')+Math.round(dP)+')':''}, Haushaltskonto ${Math.round(c.HAUS.k)} €${[...f,...em].length?' | Buchungen: '+[...f,...em].join('; '):''}`;}).join('\n');
  useYm(month);
  const ev=upcoming().map(e=>`${e.ym}: ${e.txt}${e.v!=null?' ('+Math.round(e.v)+' €)':''}`).join('; ');
  let kr='';try{const A=sparda(true);const I=ingRows();kr=`Sparda Restschuld heute ${Math.round(K().sparda.stand)} €, Rate ${K().sparda.rate} €, abbezahlt ${A.at(-1)?.ym}; ING-Gemeinschaftskredit letzte Rate ${I.at(-1)?.ym}; Bausparvertrag Mindestguthaben ${bausparZuteil()?.ym||'?'}.`;}catch(_){}
  return `Heute: ${TODAY}. Plan bis ${PLAN1}.
Monatliche Zeiträume (was jeder regelmäßig zurücklegt = Gehalt + feste Eingänge − feste Ausgaben):
${phs}
Kontostände Giro+Tagesgeld (ohne ETF/Gold) am Jahresende: ${yEnd}\nJeder Monat (Kontostand Giro+Tagesgeld am Monatsende, in Klammern die Veränderung zum Vormonat, dazu nicht-feste Buchungen und Einmalzahlungen der Personen):\n${mon}
Termine der nächsten 12 Monate (Einträge mit „Urlaubskonto“ oder „Haushaltskonto“ betreffen NICHT Giro/Tagesgeld von Till oder Patrick): ${ev}
Kredite: ${kr}`;}
function wiPrompt(tx){return `Du hilfst Till und Patrick bei ihrem Haushaltsplan. Sie stellen entweder eine FRAGE zu ihrem bestehenden Plan (z. B. "Warum habe ich ab Mai 2032 weniger?", "Wann ist der Kredit weg?") oder ein SZENARIO ("Was wäre, wenn ich ab November 2027 nur 2.400 € verdiene?").
${wiContext()}
Grundbeträge (key | Bezeichnung | aktueller Wert): ${S.grund.items.filter(i=>i.fmt!=='date').map(i=>`${i.k} | ${i.l} | ${gv(i.k,CUR)}`).join('; ')}
Kreditfelder (feld | Bezeichnung | Wert): ${KFELDER.map(([f,l])=>`${f} | ${l} | ${f.split('.').reduce((o,x)=>o?.[x],K())??''}`).join('; ')}
Nachricht: <<<${tx.slice(0,1500)}>>>
Antworte NUR mit JSON: {"typ":"frage"|"szenario","antwort":"bei frage: kurze, klare Antwort auf Deutsch in 1–4 Sätzen, mit konkreten Posten und Beträgen aus den Daten; bei szenario leer","aenderungen":[nur bei szenario: {"art":"grund","key":"…","wert":Zahl,"ab":"JJJJ-MM"|null} oder {"art":"kredit","feld":"…","wert":Zahl|true|false|"JJJJ-MM"}],"annahmen":"bei szenario: kurzer Satz, was du angenommen hast","rueckfrage":null|"Frage"}
Erkläre Veränderungen der Kontostände vor allem mit den Buchungen aus der Monatsliste (z. B. Tagesgeld-Entnahmen). Beantworte Fragen nur mit den Daten oben, nichts erfinden; sag ehrlich, wenn die Daten es nicht zeigen. Duze die beiden. Gehälter sind Nettogehälter. Relative Angaben ("100 € weniger") in absolute Werte umrechnen.`;}
async function wiGo(){const tx=$('#wi-text').value.trim();const msg=$('#wi-msg');if(!tx)return;if(!sampleFn){msg.textContent='Die KI ist in dieser Ansicht nicht verfügbar.';return;}
  $('#wi-go').disabled=true;msg.textContent='Die KI schaut sich euren Plan an …';$('#wi-out').innerHTML='';
  try{const r=await sampleFn.json(wiPrompt(tx),{modelTier:'default',cache:false});
    const ch=(r?.aenderungen||[]).filter(c=>c&&((c.art==='grund'&&S.grund.items.some(i=>i.k===c.key))||(c.art==='kredit'&&KFELDER.some(x=>x[0]===c.feld))));
    if(r?.antwort&&!ch.length){msg.textContent='';$('#wi-out').innerHTML=`<div class="wi-a">${esc(r.antwort)}</div>`;}
    else if(!ch.length){msg.innerHTML=r?.rueckfrage?`<b>Rückfrage:</b> ${esc(r.rueckfrage)}`:'Dazu habe ich nichts gefunden. Formulier es gern etwas genauer.';}
    else{msg.textContent='';wiLast=ch;const R=wiRun(ch);
      $('#wi-out').innerHTML=`<div class="wi-ch"><b>Angenommen:</b> ${ch.map(wiDesc).join(' · ')}${r.annahmen?`<br><span class="muted">${esc(r.annahmen)}</span>`:''}</div>${R.L.map(x=>`<div class="imp-l">${x}</div>`).join('')}${R.W.map(x=>`<div class="imp-w">⚠️ ${x}</div>`).join('')}<div id="c-wi" class="chart"></div><div class="leg"><span><i style="background:var(--acc)"></i>Till</span><span><i style="background:var(--pat)"></i>Patrick</span><span class="muted">Giro + Tagesgeld, gestrichelt = wie bisher geplant</span></div>
        <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap"><button class="btn sec" id="wi-save">So übernehmen</button><button class="btn sec" id="wi-clr">Verwerfen</button></div>`;
      lineChart($('#c-wi'),R.B.yms,[{n:'Till (bisher)',c:'var(--acc)',dash:1,w:1.2,v:R.A.T},{n:'Patrick (bisher)',c:'var(--pat)',dash:1,w:1.2,v:R.A.P},{n:'Till',c:'var(--acc)',v:R.B.T},{n:'Patrick',c:'var(--pat)',v:R.B.P}],{h:220,xl:ymShort,xt:ymName,aria:'Was wäre wenn'});}}
  catch(e){console.error(e);msg.textContent=e?.message&&(e.code==='no_key'||e.code==='api_error')?e.message:'Das hat nicht geklappt. Bitte noch einmal versuchen.';}
  $('#wi-go').disabled=false;}
document.addEventListener('click',async e=>{if(e.target.id==='wi-go')wiGo();if(e.target.id==='wi-clr'){$('#wi-out').innerHTML='';wiLast=null;}
  if(e.target.id==='wi-save'&&wiLast){const l=wiLast;wiLast=null;for(const c of l){if(c.art==='grund')await setGrund(c.key,+c.wert,c.ab||null);else await setK(c.feld,c.wert);}$('#wi-out').innerHTML='<div class="imp-l ok">Übernommen. Du findest die Änderungen in den Einstellungen und oben im Ausblick. Rückgängig geht unten rechts.</div>';}});
