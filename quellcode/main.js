/* ---------- Tabs & Render ---------- */
const ICO={heute:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
 monat:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
 fewo:'<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/>',
 kredite:'<path d="M3 10l9-6 9 6"/><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18"/>',
 vermoegen:'<ellipse cx="9" cy="7" rx="6" ry="2.5"/><path d="M3 7v4c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5V7"/><path d="M3 11v4c0 1.4 2.7 2.5 6 2.5"/><path d="M15 14l3-3 3 3M18 11v9"/>',
 strom:'<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
 bald:'<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
 einst:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'};
$('#nav').innerHTML=TABS.map(([k,l])=>`<button role="tab" id="t-${k}" aria-controls="p-${k}" data-t="${k}"><svg viewBox="0 0 24 24" aria-hidden="true">${ICO[k]||''}</svg><span>${l}</span></button>`).join('');
function showTab(t){tab=t;$$('#nav button').forEach(b=>b.setAttribute('aria-selected',b.dataset.t===t));$$('section[role=tabpanel]').forEach(s=>s.hidden=s.id!=='p-'+t);}
$('#nav').onclick=e=>{const t=e.target.closest('[data-t]')?.dataset.t;if(!t)return;showTab(t);try{history.replaceState(null,'','#'+t)}catch(_){ }render();};
const h0=(location.hash||'').slice(1);showTab(TABS.some(([k])=>k===h0)?h0:'heute');
const R={heute:rHeute,monat:rMonat,fewo:rFewo,kredite:rKredite,vermoegen:rVerm,bald:rBald,strom:rStrom,einst:rEinst};
let raf;function render(){cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{try{calcAll();R[tab]();if(tab!=='bald')try{rBald();}catch(_){}}catch(err){console.error(err);showErr(err);}try{$$('.tw').forEach(t=>t.classList.toggle('tw-x',t.scrollWidth>t.clientWidth+4&&t.scrollLeft<4));}catch(_){}});}
document.addEventListener('scroll',e=>{const t=e.target;if(t&&t.classList&&t.classList.contains('tw'))t.classList.toggle('tw-x',t.scrollWidth>t.clientWidth+4&&t.scrollLeft<4);},true);
let rt,lastW=innerWidth;addEventListener('resize',()=>{if(Math.abs(innerWidth-lastW)<40)return;/* Handy-Tastatur ändert nur die Höhe */lastW=innerWidth;const a=document.activeElement;if(a&&a.matches('input,textarea,select'))return;clearTimeout(rt);rt=setTimeout(render,150);});
{const t=`Version ${APPV.nr} vom ${APPV.datum}`;$('#appv').textContent=t;$('#appv2').textContent='· '+t;}
$('#today').textContent='Heute: '+now.toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
$('#undo').onclick=doUndo;
render();

/* ---------- Datenbank ---------- */
(async()=>{
  const cl=window.claude;
  cl?.use?.('sample').then(f=>{sampleFn=f;}).catch(()=>{});
  cl?.use?.('downloads').then(f=>{dlFn=f;}).catch(()=>{});
  try{db=await cl?.use?.('db');}catch(_){db=null;}
  if(!db){$('#nodb').hidden=false;flash('err','Offline');return;}
  const onErr=e=>{flash('err',e?.code==='revoked'?'Kein Zugriff':'Verbindung unterbrochen');};
  const editing=()=>document.activeElement&&document.activeElement.matches('input,select,textarea')&&document.activeElement.closest('main');
  const later=()=>{if(editing()){clearTimeout(later.t);later.t=setTimeout(later,700);}else{render();clearTimeout(later.m);later.m=setTimeout(migrate,1500);}};
  const cfg=(p,f)=>db.doc('config/'+p).onSnapshot(s=>{const d=s.data();remember('config/'+p,d);if(d)f(d);later();flash('ok','Synchronisiert');},onErr);
  cfg('grund',d=>S.grund=d);cfg('archiv',d=>S.archiv=d);cfg('urlaub',d=>S.urlaub=d);cfg('strom',d=>S.strom=d);cfg('kredit',d=>S.kredit=d);
  cfg('budget',d=>S.bcfg={...S.bcfg,...d});cfg('einstellungen',d=>S.einst=d);cfg('steuer',d=>S.steuer={...S.steuer,...d});cfg('live',d=>S.live=d);cfg('sicherungen',d=>S.sichAuto=d.l||[]);cfg('anonregeln',d=>S.anonRules=d||{});cfg('anonkonten',d=>S.anonKonten=d||{});cfg('sicherung',d=>S.sich=d);
  db.collection('plan').onSnapshot(q=>{const m={};q.docs.forEach(d=>{m[d.id]=d.data();remember('plan/'+d.id,m[d.id]);});S.plan=m;if(!window.__mset&&m[CUR]&&CUR<PLAN0){month=CUR;}window.__mset=1;later();},onErr);
  db.collection('budget').onSnapshot(q=>{const m={};q.docs.forEach(d=>{m[d.id]=d.data();remember('budget/'+d.id,m[d.id]);});S.budget=m;later();},onErr);
  db.collection('fewo').onSnapshot(q=>{const f={};q.docs.forEach(d=>{const x=d.data();remember('fewo/'+d.id,x);f[d.id]=(x?.b)||[];});S.fewo=f;later();clearTimeout(fwPublish.t);fwPublish.t=setTimeout(fwPublish,3000);},onErr);
})();
$('#app-close').onclick=()=>{document.activeElement?.blur();try{window.close();}catch(_){}setTimeout(()=>{$('#closed').hidden=false;document.body.classList.add('is-closed');},250);};
$('#app-reopen').onclick=()=>{$('#closed').hidden=true;document.body.classList.remove('is-closed');};
window.__goto=ym=>{month=ym;render();};window.__dbg=()=>({ING_END,CALC,fwList,fwListAll,showErr,render});
/* Monatsfelder: Browser ohne Monats-Auswahl zeigen ein Textfeld – dort „08.2026“, „August 2026“ o. ä. erlauben */
$$('input[type=month]').forEach(i=>{if(i.type!=='month'){i.placeholder=i.placeholder||'MM.JJJJ';i.style.minWidth='110px';}});
document.addEventListener('change',e=>{const i=e.target;if(!(i instanceof HTMLInputElement)||i.getAttribute('type')!=='month'||i.type==='month')return;
  if(i.value==='')return;const ym=normYm(i.value);if(!ym){e.stopImmediatePropagation();i.style.outline='2px solid var(--neg,#c33)';i.title='Bitte als Monat eingeben, z. B. 08.2026';return;}i.style.outline='';i.title='';i.value=ym;},true);

/* Sichtbarer Hinweis statt stummem Hängen, wenn beim Aufbau einer Ansicht etwas schiefgeht */
function showErr(err){let el=$('#errbar');if(!el){el=document.createElement('div');el.id='errbar';el.className='note neg';el.style.cssText='position:sticky;top:0;z-index:50;margin:8px 0';document.querySelector('main,#app,body').prepend(el);}
  const t=(err&&(err.message||String(err)))||'unbekannt';el.innerHTML=`⚠️ <b>Diese Ansicht konnte nicht ganz aufgebaut werden.</b> Die Daten sind nicht betroffen. Meldung: <code>${esc(t.slice(0,160))}</code> <button type="button" class="btn sec sm" onclick="location.reload()">Neu laden</button> <button type="button" class="btn sec sm" onclick="this.parentNode.remove()">Ausblenden</button>`;}
window.addEventListener('error',e=>{if(e?.error)showErr(e.error);});
})();
document.addEventListener('input',e=>{const t=e.target;if(t.tagName!=='TEXTAREA')return;t.classList.add('grow');t.style.height='auto';t.style.height=Math.min(t.scrollHeight+2,window.innerHeight*0.5)+'px';});

