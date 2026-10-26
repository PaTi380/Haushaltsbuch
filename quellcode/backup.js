/* ---------- Sicherung ---------- */
function bkData(){const docs={};Object.entries(KNOWN).forEach(([p,d])=>{if(d!==undefined&&d!==null)docs[p]=d;});return {app:'haushaltsbuch-till-patrick',version:1,am:new Date().toISOString(),docs};}
$('#bk-save').onclick=async()=>{const msg=$('#bk-msg');const d=bkData();const n=Object.keys(d.docs).length;if(!n){msg.textContent='Noch keine Daten geladen.';return;}
  const fn=`Haushaltsbuch-Sicherung-${TODAY}.json`;const blob=new Blob([JSON.stringify(d)],{type:'application/json'});
  if(!dlFn){msg.textContent='Herunterladen ist in dieser Ansicht nicht verfügbar. Öffne die App direkt auf claude.ai.';return;}
  try{await dlFn.save({filename:fn,data:blob});msg.innerHTML=`<b class="pos">Gespeichert: ${esc(fn)}</b> (${n} Einträge).`;S.sich={am:new Date().toISOString(),n};save('config/sicherung',S.sich);flash('ok','Sicherung gespeichert');render();}
  catch(e){msg.textContent=e?.code==='declined'?'Download abgebrochen.':'Das hat nicht geklappt: '+(e?.message||e?.code||'');}};
let bkPending=null;
$('#bk-file').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;const msg=$('#bk-msg');
  try{const d=JSON.parse(await f.text());if(d?.app!=='haushaltsbuch-till-patrick'||!d.docs)throw new Error('keine Sicherung dieser App');
    const paths=Object.keys(d.docs).filter(p=>/^(plan|budget|fewo|config)\/[\w.-]+$/.test(p));if(!paths.length)throw new Error('leer');
    bkPending={d,paths};const pl=paths.filter(p=>p.startsWith('plan/')).length;
    $('#bk-conf').innerHTML=`<div class="imp-w" style="margin-top:10px">Sicherung vom <b>${esc(new Date(d.am).toLocaleString('de-DE'))}</b> mit ${paths.length} Einträgen (${pl} Monatspläne). Wiederherstellen <b>überschreibt</b> den aktuellen Stand in der App – für euch beide.<div style="display:flex;gap:8px;margin-top:8px"><button class="btn" id="bk-ok">Jetzt wiederherstellen</button><button class="btn sec" id="bk-no">Abbrechen</button></div></div>`;msg.textContent='';}
  catch(err){msg.textContent='Diese Datei kann ich nicht lesen ('+(err.message||'Fehler')+').';}};
$('#bk-conf').addEventListener('click',async e=>{if(e.target.id==='bk-no'){bkPending=null;$('#bk-conf').innerHTML='';return;}
  if(e.target.id!=='bk-ok'||!bkPending)return;e.target.disabled=true;const {d,paths}=bkPending;bkPending=null;const msg=$('#bk-msg');let ok=0;
  // vorher automatisch den aktuellen Stand merken (Rückgängig)
  for(const p of paths){try{msg.textContent=`Stelle wieder her … ${ok+1}/${paths.length}`;await save(p,d.docs[p]);ok++;}catch(_){}}
  $('#bk-conf').innerHTML='';msg.innerHTML=`<b class="pos">Fertig: ${ok} von ${paths.length} Einträgen wiederhergestellt.</b>`;});

/* ---------- Automatische Sicherung in der Datenbank (beim kompletten Monatsabschluss) ---------- */
async function autoBackup(ym){if(!db)return;try{const d=bkData();const n=Object.keys(d.docs).length;if(!n)return;const id=ym||TODAY.slice(0,7);
    await db.doc('sicherung/'+id).set({...d,monat:id});
    const idx=[...(S.sichAuto||[])].filter(x=>x.id!==id);idx.push({id,am:d.am,n});idx.sort((a,b)=>a.id.localeCompare(b.id));
    while(idx.length>12){const old=idx.shift();try{await db.doc('sicherung/'+old.id).delete();}catch(_){}}
    S.sichAuto=idx;await save('config/sicherungen',{l:idx});flash('ok','Automatische Sicherung abgelegt');render();}catch(e){console.error(e);}}
function rBkAuto(){const el=$('#bk-auto');if(!el)return;const L=[...(S.sichAuto||[])].reverse();
  el.innerHTML=L.length?L.map(x=>`<div class="row"><span>${ymName(x.id)} <small class="muted">abgelegt ${new Date(x.am).toLocaleString('de-DE',{dateStyle:'short',timeStyle:'short'})} · ${x.n} Einträge</small></span><span><button type="button" class="btn sec sm" data-bkauto="${x.id}">Herunterladen</button></span></div>`).join(''):'<div class="muted">Noch keine – kommt mit dem ersten kompletten Monatsabschluss.</div>';}
$('#bk-auto').addEventListener('click',async e=>{const b=e.target.closest('[data-bkauto]');if(!b)return;const msg=$('#bk-msg');if(!dlFn){msg.textContent='Herunterladen ist in dieser Ansicht nicht verfügbar.';return;}b.disabled=true;
  try{const s=await db.doc('sicherung/'+b.dataset.bkauto).get();const d=s.data();if(!d)throw new Error('nicht gefunden');delete d.monat;const fn=`Haushaltsbuch-Sicherung-${b.dataset.bkauto}-auto.json`;await dlFn.save({filename:fn,data:new Blob([JSON.stringify(d)],{type:'application/json'})});msg.innerHTML=`<b class="pos">Gespeichert: ${esc(fn)}</b>`;}
  catch(err){msg.textContent='Das hat nicht geklappt: '+(err?.message||'');}b.disabled=false;});
