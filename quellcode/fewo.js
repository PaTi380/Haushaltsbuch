/* ---------- Ferienwohnung ---------- */
const FWD={gb:2.1,kom:0.12,serv:0.014,steuer:1.5,airNeu:0.155,airAlt:0.03,mwst:0.19,urlProz:0.3,urlFix:5};
const FR=()=>({...FWD,...(S.einst.fewo||{})});
const dAdd=(iso,n)=>{const d=new Date(iso+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
const nightsOf=(a,b)=>Math.round((Date.parse(b+'T00:00:00Z')-Date.parse(a+'T00:00:00Z'))/864e5);
const dDE=iso=>iso?iso.split('-').reverse().join('.'):'';
const PLATS=['Booking.com','Airbnb','Privat'];const PC={'Booking.com':'var(--till)','Airbnb':'var(--pat)','Privat':'var(--gem)'};
const normPlat=p=>{const l=String(p||'').toLowerCase();return l.includes('booking')?'Booking.com':l.includes('airbnb')?'Airbnb':l.includes('privat')?'Privat':String(p||'').trim();};
const STORNO={'Airbnb':7,'Booking.com':5,'Privat':7};
function airEstimate(netto){const R=FR();const alt=netto/(1-R.airAlt*(1+R.mwst)),neu=netto/(1-R.airNeu*(1+R.mwst));const d=x=>Math.abs(x-Math.round(x));return d(neu)<d(alt)?{gesamt:r2(Math.round(neu)),modell:'neu'}:{gesamt:r2(Math.round(alt)),modell:'alt'};}
/* Buchung: {id,p,pRaw,a,ab,erw,sto,gb,H,I,J,K,src,gesamt?} – H/I/J wie Excel-Spalten */
function fwD(b){const R=FR();const p=normPlat(b.p||b.pRaw);const n=nightsOf(b.a,b.ab);const netto=+b.J||0;let brutto=null,est=false,modell=null;
  if(p==='Booking.com'){brutto=b.gesamt>0?+b.gesamt:(+b.H>0?r2((netto+R.kom*b.H)/(1-R.serv)):null);est=false;}
  else if(p==='Airbnb'){if(+b.I>netto+0.5){brutto=+b.I;}else{const e=airEstimate(netto);brutto=e.gesamt;est=true;modell=e.modell;}if(!modell&&brutto)modell=(brutto-netto)/brutto>0.1?'neu':'alt';}
  else brutto=netto;
  const gb=b.stoBez&&!b.gbM?0:(+b.gb||0);const bar=+b.bar||0;const ein=netto+bar;const barM=b.barUrlaub===false?'nein':b.barUrlaub==='voll'?'voll':'teilen';const barU=barM!=='nein';const basis=barM==='teilen'?ein:netto;const spar=b.spO!=null&&b.spO!==''?+b.spO:r2(basis*R.urlProz+R.urlFix);const urlaub=b.uO!=null&&b.uO!==''?+b.uO:r2(basis-spar-gb+(barM==='voll'?bar:0));const ud=p==='Booking.com'?dAdd(b.ab,2):p==='Airbnb'?dAdd(b.a,2):b.a;
  const sto=(b.sto===''||b.sto==null)?STORNO[p]:+b.sto;const frist=dAdd(b.a,-(sto||0));
  return {...b,p,n,nOcc:b.stoBez?0:n,netto,bar,ein,barU,barM,spar,brutto:brutto!=null?r2(brutto):null,geb:brutto!=null?r2(brutto-netto):null,est,modell,gb,urlaub,ud,sto,frist,nonref:sto===0,sicher:sto===0||TODAY>=frist,dac7:p==='Booking.com'?(+b.H||null):p==='Airbnb'?brutto:null};}
function fwListAll(){return Object.entries(S.fewo).filter(([k])=>/^\d{4}$/.test(k)).flatMap(([,v])=>v||[]).filter(b=>b&&b.a).map(fwD).sort((a,b)=>a.a.localeCompare(b.a));}
function fwList(){return fwListAll().filter(b=>!b.storniert);}
function fwAlt(){return (S.fewo.alt||[]).map(x=>({...x,p:normPlat(x.p)}));}
/* Belegung für Home Assistant: nur Anreise, Abreise und Personenzahl – ohne Namen und Beträge (Dokument public/belegung, ohne Anmeldung lesbar) */
let _belPub=null;async function fwPublish(){try{if(!db)return;const von=dAdd(TODAY,-2),bis=dAdd(TODAY,400);
  const b=fwList().filter(x=>!x.stoBez&&x.ab>=von&&x.a<=bis).map(x=>({a:x.a,ab:x.ab,erw:+x.erw||0,ki:+x.ki||0}));const j=JSON.stringify(b);if(j===_belPub)return;
  if(_belPub===null){const d=(await db.doc('public/belegung').get()).data();if(d&&JSON.stringify(d.b||[])===j){_belPub=j;return;}}
  await db.doc('public/belegung').set({stand:new Date().toISOString(),b});_belPub=j;}catch(_){}}
async function fwSaveAll(list){const ids=new Set(list.map(b=>b.id));list=[...list,...fwListAll().filter(b=>b.storniert&&!ids.has(b.id))];const g={};list.forEach(b=>{const y=b.a.slice(0,4);(g[y]??=[]).push(strip(b));});const years=new Set([...Object.keys(S.fewo).filter(k=>/^\d{4}$/.test(k)),...Object.keys(g)]);years.forEach(y=>S.fewo[y]=g[y]||[]);render();for(const y of years)await save('fewo/'+y,{b:g[y]||[]});}
const strip=b=>{const o={};['id','p','pRaw','a','ab','erw','ki','sto','gb','H','I','J','K','src','gesamt','created','bar','notiz','barUrlaub','storniert','stoBez','stornoAm','bm','gbM','spO','uO'].forEach(k=>{if(b[k]!==undefined&&b[k]!==null&&b[k]!=='')o[k]=b[k];});return o;};
function saveUrlaub(mut){const d=structuredClone(S.urlaub);d.e=d.e||[];mut(d);d.e.sort((a,b)=>(a.d||'').localeCompare(b.d||''));S.urlaub=d;render();return save('config/urlaub',d);}

let fwImgs=[],fwYr=String(now.getFullYear());
function fwStornoDefault(force){const el=$('#fw-sto');if(force||el.dataset.auto!=='0'){el.value=STORNO[$('#fw-p').value]??'';el.dataset.auto='1';}}
function fwLabels(){const p=$('#fw-p').value;$('#fw-ges-l').textContent=p==='Booking.com'?'Gesamtpreis der Buchung (€)':'Vom Gast bezahlt, Übernachtungen (€)';$('#fw-ges-w').hidden=p==='Privat';
  $('#fw-bet-l').textContent=p==='Booking.com'?'Kommissionspflichtig (nur falls abweichend)':p==='Airbnb'?'Du erhältst (€)':'Betrag vom Gast (€)';}
function fwFromForm(){const R=FR();const p=$('#fw-p').value,a=$('#fw-a').value,ab=$('#fw-ab').value,erw=+$('#fw-erw').value||0,ki=+$('#fw-ki').value||0,ges=+$('#fw-ges').value||0,bet=+$('#fw-bet').value||0,sto=$('#fw-sto').value;
  if(!a||!ab||nightsOf(a,ab)<=0)return null;const N=nightsOf(a,ab);const gb=r2(R.gb*erw*N);
  if(p==='Booking.com'){if(!(ges>0))return null;const K=bet>0?bet:r2(ges-R.steuer*erw*N);return {p,a,ab,erw,ki,sto:sto===''?5:+sto,gb,H:r2(K),I:0,J:r2(ges-R.kom*K-R.serv*ges),gesamt:ges};}
  if(!(bet>0))return null;
  if(p==='Airbnb')return {p,a,ab,erw,ki,sto:sto===''?7:+sto,gb,H:0,I:ges>0?ges:0,J:bet};
  return {p,a,ab,erw,ki,sto:sto===''?7:+sto,gb,H:0,I:0,J:bet};}
const gaeste=b=>`${b.erw??'?'} Erw.${+b.ki?' + '+b.ki+(+b.ki===1?' Kind':' Kinder'):''}`;
const pct=x=>String(+(x*100).toFixed(1)).replace('.',',');
function zettel(b,edit){const R=FR();const ein=b.ein??b.netto;const alt=!!b.ab&&b.ab<dAdd(TODAY,-14);const ed=edit&&!b.storniert&&b.id&&!alt;
  const V=(f,v,bold,man)=>ed?`<button type="button" class="zed num${bold?' b':''}" data-zf="${f}" data-fid="${b.id}" data-v="${v!=null?num(v):''}" title="Tippen zum Ändern">${eur(v)}${man?' <small class="zman">✎</small>':''}</button>`:(bold?`<b class="num">${eur(v)}</b>`:`<span class="num">${eur(v)}</span>`);
  const feeTxt=b.bm?'von dir eingetragen':b.p==='Booking.com'?`${pct(R.kom)} % Provision + ${pct(R.serv)} % Service`:b.modell==='alt'?`${pct(R.airAlt)} % + ${pct(R.mwst)} % MwSt`:`${pct(R.airNeu)} % + ${pct(R.mwst)} % MwSt`;
  let hint='';if(!b.gbM&&b.gb>0&&b.n>0&&+b.erw>0){const k=Math.round(b.gb/(R.gb*b.n));if(k>0&&k<+b.erw&&Math.abs(k*R.gb*b.n-b.gb)<0.02)hint=`<div class="note zhint">Der Gästebeitrag passt zu <b>${k} Erwachsenen</b>. Ist jemand ein Kind? Dann unten Erwachsene ${k}, Kinder ${(+b.erw-k)+(+b.ki||0)} eintragen.</div>`;}
  return `<div class="zettel"><div class="row"><span>Gäste</span><span>${gaeste(b)}${+b.ki?' <span class="muted">(Gästebeitrag nur für Erwachsene)</span>':''}</span></div>
  ${b.brutto!=null&&b.p!=='Privat'?`<div class="row"><span><b>Brutto</b> ${b.p==='Booking.com'?'(Gesamtpreis)':'(vom Gast bezahlt)'}</span>${V('brutto',b.brutto,true,b.bm)}</div><div class="row sub"><span class="muted">− Gebühren <small>(${feeTxt})</small></span><span class="num muted">${eur(b.geb)}</span></div>`:''}
  <div class="row"><span><b>Auszahlung</b> ${b.p==='Privat'?'vom Gast':'der Plattform'}</span>${V('J',b.netto,true)}</div>
  ${b.bar?`<div class="row"><span><b>zusätzlich bar vor Ort</b></span><b class="num">${eur(b.bar)}</b></div><div class="row"><span>zusammen</span><b class="num">${eur(ein)}</b></div><div class="note">${b.barM==='nein'?'Bargeld bleibt außen vor (nicht aufs Urlaubskonto).':b.barM==='voll'?'Bargeld geht komplett aufs Urlaubskonto, ohne Spartopf-Abzug.':'Bargeld wird wie die Auszahlung aufgeteilt (Spartopf, Urlaubskonto).'}</div>`:''}
  <div class="row"><span>davon Gästebeitrag ${b.stoBez?'(entfällt – keine Übernachtung)':`(${b.erw||0} Erw. × ${b.n} Nächte)`}</span>${V('gb',b.gb,false,b.gbM)}</div>
  <div class="row"><span>davon Spartopf (${Math.round(R.urlProz*100)} % + ${eur(R.urlFix,0)})</span>${V('spar',b.spar,false,b.spO!=null)}</div>
  <div class="row"><span><b>aufs Urlaubskonto</b> am ${dDE(b.ud)}</span>${V('urlaub',b.urlaub,true,b.uO!=null)}</div>
  ${hint}
  <div class="row"><span class="muted">${b.nonref?'Nicht kostenlos stornierbar (0 Tage): <span class="ok">Geld sicher</span>':`Stornofrist ${b.sto} Tage: ${b.sicher?'<span class="ok">vorbei, Geld sicher</span>':'kostenlos stornierbar bis '+dDE(b.frist)}`}</span><span></span></div>
  ${ed?'<div class="note" style="margin:2px 0 0">Beträge antippen, um sie von Hand zu ändern (✎ = von Hand). Feld leeren = wieder automatisch.</div>':''}
  ${edit&&alt&&!b.storniert?'<div class="note" style="margin:2px 0 0">🔒 Abreise liegt mehr als 2 Wochen zurück – diese Buchung ist abgeschlossen.</div>':''}
  ${b.notiz?`<div class="note">📝 ${esc(b.notiz)}</div>`:''}
  ${b.stoBez?`<div class="note">💶 <b>Storniert${b.stornoAm?' am '+dDE(b.stornoAm):''}, Gast zahlt trotzdem</b> (nicht mehr kostenlos stornierbar). Das Geld zählt wie gebucht – Auszahlung, Spartopf, Urlaubskonto, Steuer –, aber ohne Übernachtung: kein Gästebeitrag, nicht in der Belegung. Zahlt die Plattform weniger aus, die Auszahlung oben antippen und ändern.${edit?` <button type="button" class="btn sec sm" data-fwstobez0="${b.id}">Rückgängig</button>`:''}</div>`:''}
  ${edit&&b.storniert?`<div class="note">Diese Buchung ist storniert und zählt nirgends mit. <button type="button" class="btn sec sm" data-fwreakt="${b.id}">Wieder aktivieren</button></div>`:''}
  ${ed?`<form class="form fwedit" data-fid="${b.id}" style="margin-top:10px"><label>Erwachsene<input type="number" min="0" name="erw" value="${b.erw??''}" style="width:70px"></label><label>Kinder<input type="number" min="0" name="ki" value="${b.ki??''}" style="width:60px"></label><label>Abreise<input type="date" name="ab" value="${b.ab}"></label><label>bar vor Ort (€)<input inputmode="decimal" name="bar" value="${b.bar?num(b.bar):''}" style="width:90px"></label><label>Notiz<input name="notiz" value="${esc(b.notiz||'')}" style="width:150px"></label><label>Bargeld<select name="barUrlaub"><option value="teilen" ${b.barM==='teilen'?'selected':''}>wie Auszahlung aufteilen</option><option value="voll" ${b.barM==='voll'?'selected':''}>komplett aufs Urlaubskonto</option><option value="nein" ${b.barM==='nein'?'selected':''}>nicht aufs Urlaubskonto</option></select></label><button class="btn sec sm" type="submit">Ändern</button><button class="btn sec sm" type="button" data-fwstorno="${b.id}" title="Storniert, es kommt kein Geld">Storniert (kostenlos)</button>${b.stoBez?'':`<button class="btn sec sm" type="button" data-fwstobez="${b.id}" title="Storniert, aber nicht mehr kostenlos – das Geld kommt trotzdem">Storniert, Gast zahlt trotzdem</button>`}</form>`:''}</div>`;}
function fwPreview(){fwLabels();{const R=FR();const a=$('#fw-a').value,ab=$('#fw-ab').value,g=+$('#fw-ges').value||0,e=+$('#fw-erw').value||0;const n=a&&ab?nightsOf(a,ab):0;$('#fw-bet').placeholder=$('#fw-p').value==='Booking.com'&&g>0&&n>0?'automatisch: '+num(r2(g-R.steuer*e*n)):'';}const i=fwFromForm();const el=$('#fw-prev');if(!i){el.innerHTML='<span class="muted">Sobald Daten und Beträge drin sind, siehst du hier den Auszahlungs-Zettel.</span>';return null;}const b=fwD(i);el.innerHTML=zettel(b);return i;}
['#fw-p','#fw-a','#fw-ab','#fw-erw','#fw-ges','#fw-bet','#fw-sto'].forEach(s=>$(s).addEventListener('input',fwPreview));
$('#fw-p').addEventListener('change',()=>{fwStornoDefault(false);fwPreview();});$('#fw-sto').addEventListener('input',e=>{e.target.dataset.auto='0';});
$('#fw-reset').onclick=()=>{$('#f-fw').reset();fwStornoDefault(true);$('#fw-msg').textContent='';$$('#f-fw .unsure').forEach(x=>x.classList.remove('unsure'));fwPreview();};
$('#f-fw').onsubmit=async e=>{e.preventDefault();const i=fwPreview();if(!i){$('#fw-msg').textContent='Bitte Anreise, Abreise und Betrag prüfen.';return;}
  const all=fwList();const key=b=>`${b.a}|${b.ab}|${normPlat(b.p)}`;if(all.some(x=>key(x)===key(i))){$('#fw-msg').innerHTML='<b class="neg">Diese Buchung gibt es schon.</b> Nichts gespeichert.';return;}
  const nb={...i,id:'a-'+uid(),src:'app',created:new Date().toISOString()};const d=fwD(nb);
  await fwSaveAll([...all,nb]);
  await saveUrlaub(u=>{u.e.push({d:d.ud,b:d.urlaub,t:d.p,fid:nb.id});});
  $('#f-fw').reset();fwStornoDefault(true);$('#fw-text').value='';fwPreview();
  $('#fw-msg').innerHTML=`<b class="pos">Gespeichert.</b> ${esc(d.p)} ${dDE(d.a)}–${dDE(d.ab)}. Urlaubskonto: ${eur(d.urlaub)} am ${dDE(d.ud)}.`;};
function fwPrompt(){return `Du bekommst eine Nachricht zur Ferienwohnung. Heute ist ${dDE(TODAY)}.
Bestehende Buchungen (Anreise | Abreise | Plattform | Erwachsene | Kinder | Kontonetto | bar extra):
${fwList().filter(b=>b.a>=dAdd(TODAY,-120)).map(b=>`${b.a} | ${b.ab} | ${b.p} | ${b.erw??''} | ${b.ki??''} | ${num(b.netto)} | ${b.bar?num(b.bar):''}`).join('\n')}

Entscheide zuerst: Ist es eine NEUE Buchung oder eine ÄNDERUNG an einer bestehenden Buchung aus der Liste (z. B. mehr Gäste, bar bezahlt, Abreise verschoben, storniert)?
Bei ÄNDERUNG antworte NUR mit JSON: {"art":"aenderung","anreise":"JJJJ-MM-TT aus der Liste","plattform":"wie in der Liste","erwachsene":Zahl|null,"kinder":Zahl|null,"abreise":"JJJJ-MM-TT"|null,"bar":Zahl|null,"storniert":true|false,"storno_bezahlt":true|false,"bar_aufs_urlaubskonto":true|"voll"|false|null,"notiz":"kurze Notiz"}  (storno_bezahlt=true, wenn storniert wurde, das Geld aber trotzdem kommt, weil nicht mehr kostenlos storniert werden konnte – dann storniert=false; bar = Betrag, der zusätzlich bar vor Ort gezahlt wird; bar_aufs_urlaubskonto: true = Bargeld wie die Auszahlung aufteilen (Spartopf, Urlaubskonto); "voll" = Bargeld komplett aufs Urlaubskonto ohne Spartopf-Abzug; false, wenn der Barbetrag NICHT aufs Urlaubskonto soll; nur geänderte Felder, sonst null. Setze jede Anweisung des Textes um, die zu einem dieser Felder passt.)
Bei NEUER Buchung antworte wie folgt, mit "art":"neu".
Du liest EINE Ferienwohnungs-Buchung aus (Screenshots oder kopierter Text) (Booking.com, Airbnb oder privat).
Antworte NUR mit JSON: {"art":"neu","plattform":"Booking.com"|"Airbnb"|"Privat"|"unbekannt","anreise":"JJJJ-MM-TT"|null,"abreise":"JJJJ-MM-TT"|null,"erwachsene":Zahl|null,"kinder":Zahl|null,"gesamtpreis":Zahl|null,"kommissionspflichtig":Zahl|null,"auszahlung":Zahl|null,"gebuehr":Zahl|null,"storniert":true|false,"stornierbar":true|false|null,"unsicher":["feldname"],"hinweis":"ein kurzer Satz"}
Regeln: Booking.com: gesamtpreis = "Gesamtpreis der Buchung"; kommissionspflichtig = "Kommissionspflichtiger Betrag"; gebuehr = "Kommission". Airbnb: gesamtpreis = vom Gast bezahlt für die Nächte (ohne Servicegebühr für Gäste); auszahlung = "Du erhältst"; gebuehr = Servicegebühr für Gastgeber positiv. Privat: auszahlung = Betrag vom Gast.
stornierbar=false bei "nicht stornierbar"/ohne kostenlose Stornierung. erwachsene = nur Erwachsene, kinder = Anzahl Kinder (Kleinkinder/Babys mitzählen). Fehlendes Jahr ergänzen und in unsicher. Zahlen mit Punkt. Nichts erfinden.`;}
async function fwAuslesen(opts,btn,textIn){const msg=$('#fw-shotmsg');btn.disabled=true;msg.textContent='Die KI liest die Buchung … (bis zu einer Minute)';
  try{const r=await sampleFn.json(fwPrompt()+(textIn?'\n\nText:\n"""\n'+textIn.slice(0,6000)+'\n"""':''),{...opts,modelTier:'default'});
    if(r.art==='aenderung'){const a={art:'buchung',anreise:r.anreise,plattform:r.plattform,erwachsene:r.erwachsene,kinder:r.kinder,abreise:r.abreise,bar:r.bar,storniert:!!r.storniert&&!r.storno_bezahlt,stoBez:!!r.storno_bezahlt,notiz:r.notiz,barUrlaub:r.bar_aufs_urlaubskonto};
      msg.innerHTML=`<b>Änderung erkannt:</b> ${qDescribe(a)} <button type="button" class="btn sm" id="fw-chok">Bestätigen</button> <button type="button" class="btn sec sm" id="fw-chno">Verwerfen</button>`;fwPending=a;btn.disabled=false;return;}
    if(r.storniert){msg.innerHTML='<b class="neg">Die Buchung ist storniert.</b> Nichts übernommen.';btn.disabled=false;return;}
    const p=normPlat(r.plattform);if(PLATS.includes(p))$('#fw-p').value=p;fwStornoDefault(true);if(r.stornierbar===false){$('#fw-sto').value=0;$('#fw-sto').dataset.auto='0';}
    if(r.anreise)$('#fw-a').value=r.anreise;if(r.abreise)$('#fw-ab').value=r.abreise;if(r.erwachsene!=null)$('#fw-erw').value=r.erwachsene;$('#fw-ki').value=r.kinder??'';
    $('#fw-ges').value=r.gesamtpreis??'';$('#fw-bet').value=p==='Booking.com'?(r.kommissionspflichtig??''):(r.auszahlung??'');
    $$('#f-fw .unsure').forEach(x=>x.classList.remove('unsure'));const map={anreise:'#fw-a',abreise:'#fw-ab',erwachsene:'#fw-erw',gesamtpreis:'#fw-ges',kommissionspflichtig:'#fw-bet',auszahlung:'#fw-bet'};(r.unsicher||[]).forEach(k=>{const el=map[k]&&$(map[k]);if(el)el.classList.add('unsure');});
    fwPreview();msg.innerHTML=`<b>Ausgelesen.</b> Bitte prüfen und speichern${(r.unsicher||[]).length?' (gelb = unsicher)':''}.${r.hinweis?' '+esc(r.hinweis):''}`;
  }catch(e){msg.textContent=e?.code==='no_key'||e?.code==='api_error'?(e.message||'KI-Zugang fehlt. Einstellungen → KI-Zugang.'):e?.code==='not_granted'?'Auslesen nicht erlaubt. Bitte von Hand eintragen.':e?.code==='rate_limited'?'Gerade zu viele Anfragen, bitte gleich nochmal.':'Das Auslesen hat nicht geklappt. Bitte nochmal oder von Hand eintragen.';}
  btn.disabled=false;}
$('#fw-readtext').onclick=async()=>{const tx=$('#fw-text').value.trim();if(tx.length<8){$('#fw-shotmsg').textContent='Bitte zuerst die Buchung eintragen.';return;}$('#fw-qprev').innerHTML='';
  /* 1. ohne KI erkennen (Änderungen, Urlaubskonto, …) 2. keine neue Buchung => allgemeine KI 3. sonst Buchung auslesen */
  if(qLocal(tx)||(!qIsNewBooking(tx)&&tx.length<250&&!/(booking|airbnb|privat)\b.*\b(bis|erhältst)\b/i.test(tx))){await qRun(tx,$('#fw-shotmsg'),$('#fw-qprev'),$('#fw-readtext'));return;}if(!sampleFn){$('#fw-shotmsg').textContent='Auslesen ist in dieser Ansicht nicht verfügbar.';return;}await fwAuslesen({},$('#fw-readtext'),tx);};

let fwOpen=null,fwAll=false,fwPending=null;
function rFewo(){
  fwLabels();if(!$('#fw-prev').innerHTML)fwPreview();
  const all=fwList();const y=String(now.getFullYear()),py=String(now.getFullYear()-1);
  const by={};[...fwAlt().map(b=>({a:b.a,n:nightsOf(b.a,b.ab),netto:b.net||0})),...all].forEach(b=>{const k=b.a.slice(0,4);const o=by[k]??={n:0,b:0,c:0};o.n+=(b.nOcc??b.n)||0;o.b+=b.netto||0;o.c++;});
  const md=TODAY.slice(5);const td=yy=>all.filter(b=>b.a.startsWith(yy)&&b.a.slice(5)<=md).reduce((a,b)=>a+b.netto,0);
  const offen=all.filter(b=>b.a>=TODAY&&!b.sicher);const cy=by[y]||{n:0,b:0,c:0};
  $('#f-kpis').innerHTML=kpi(`Kontonetto ${y} bis heute`,eur(td(y),0),`Vorjahr gleicher Zeitraum ${eur(td(py),0)}`)+kpi(`Gebucht ${y} gesamt`,eur(cy.b,0),`${cy.n} Nächte · ${cy.c} Buchungen`)+kpi('Noch stornierbar',String(offen.length),offen.length?eur(offen.reduce((a,b)=>a+b.netto,0))+' Kontonetto':'alles sicher');
  const ys=Object.keys(by).sort();barChart($('#c-fw'),ys,ys.map(k=>by[k].b),{c:i=>ys[i]>y?'var(--mute)':'var(--acc)',tip:i=>`<b>${ys[i]}</b><br>${eur(by[ys[i]].b,0)} Kontonetto<br>${by[ys[i]].n} Nächte`});
  const grp={};all.filter(b=>b.a>=`${now.getFullYear()-1}-01-01`&&b.brutto>0&&b.p!=='Privat').forEach(b=>{const k=b.p==='Airbnb'?`Airbnb (${b.modell==='neu'?'neues':'altes'} Modell)`:b.p;const o=grp[k]??={c:0,n:0,g:0,f:0,net:0,p:b.p};o.c++;o.n+=b.nOcc??b.n;o.g+=b.brutto;o.f+=b.geb;o.net+=b.netto;});
  const ge=Object.entries(grp).sort((a,b)=>a[1].f/a[1].g-b[1].f/b[1].g);const mx=Math.max(0.01,...ge.map(([,o])=>o.f/o.g));
  $('#fw-pl').innerHTML=ge.map(([k,o])=>`<div style="margin-bottom:12px"><div class="row" style="border:0;padding:0 0 4px"><span>${esc(k)} <span class="muted">${o.c} Buchungen</span></span><b class="num">${(o.f/o.g*100).toLocaleString('de-DE',{maximumFractionDigits:1})} %</b></div><div class="bar"><span style="width:${o.f/o.g/mx*100}%;background:${PC[o.p]}"></span></div><div class="muted" style="font-size:12px;margin-top:3px">Kontonetto pro Nacht ${eur(o.net/o.n)}</div></div>`).join('')+'<div class="note">Anteil der Gebühren am Brutto, seit letztem Jahr.</div>';
  const sel=$('#fw-yr');const opts=['Alle',...[...new Set(all.map(b=>b.a.slice(0,4)))].sort().reverse()];const shown=opts.includes(fwYr)?fwYr:'Alle';sel.innerHTML=opts.map(k=>`<option ${k===shown?'selected':''}>${k}</option>`).join('');
  const list=fwListAll().filter(b=>shown==='Alle'||b.a.startsWith(shown)).sort((a,b)=>b.a.localeCompare(a.a));
  $('#fw-table').innerHTML=`<thead><tr><th>Anreise</th><th class="r">Nächte</th><th>Gäste</th><th>Plattform</th><th class="r">Kontonetto</th><th class="r">Urlaubskonto</th><th>Storno</th><th></th></tr></thead><tbody>`+list.slice(0,fwAll?1e9:5).map(b=>`<tr class="fwrow${b.storniert?' storno':''}" data-fid="${b.id}"><td>${dDE(b.a)}</td><td class="r">${b.n}</td><td>${(b.erw??'?')+(+b.ki?'+'+b.ki:'')}</td><td>${esc(b.p)}</td><td class="r">${eur(b.netto)}</td><td class="r">${eur(b.urlaub)}</td><td>${b.stoBez?`<span class="pill w" title="storniert, Gast zahlt trotzdem">storniert · bezahlt</span>`:b.storniert?`<span class="pill">storniert${b.stornoAm?' '+dDE(b.stornoAm).slice(0,5):''}</span>`:b.sicher?'<span class="pill g">sicher</span>':`<span class="pill w">bis ${dDE(b.frist).slice(0,5)}</span>`}</td><td class="r">${b.src==='app'?`<button class="btn sec sm" data-fwdel="${b.id}">Entfernen</button>`:''}</td></tr>${fwOpen===b.id?`<tr><td colspan="8">${zettel(b,true)}</td></tr>`:''}`).join('')+'</tbody>';
  $('#fw-more').innerHTML=list.length>5?`<button type="button" class="btn sec sm" id="fw-morebtn">${fwAll?'Weniger anzeigen':'Alle '+list.length+' Buchungen anzeigen'}</button>`:'';
  if($('#st-box')?.open)rSteuer();
  // Urlaubskonto
  const U=S.urlaub;let st=+U.start||0;const rows=(U.e||[]).map(x=>{st+=+x.b||0;return {...x,s:st};});
  $('#u-stand').textContent=eur(st);
  {const byM={};let s0=+U.start||0;(U.e||[]).forEach(x=>{s0+=+x.b||0;byM[(x.d||'').slice(0,7)]=s0;});const ks=Object.keys(byM).filter(Boolean).sort();
   if(ks.length){const ms=[];for(let m=ks[0];m<=ks.at(-1);m=ymAdd(m,1))ms.push(m);let last=+U.start||0;const vals=ms.map(m=>{if(byM[m]!=null)last=byM[m];return r2(last);});
    const cur=CUR;lineChart($('#c-url'),ms,[{n:'Kontostand',c:'var(--acc)',v:ms.map((m,i)=>m<=cur?vals[i]:null)},{n:'geplant',c:'var(--acc)',dash:1,v:ms.map((m,i)=>m>=cur?vals[i]:null)}],{h:200,xl:ymShort,xt:ymName,mark:ms.indexOf(cur),aria:'Verlauf Urlaubskonto'});}}
  if(!$('#u-table').contains(document.activeElement))$('#u-table').innerHTML=`<thead><tr><th>Datum</th><th>Bemerkung</th><th class="r">Betrag</th><th class="r">Stand</th><th></th></tr></thead><tbody>`+rows.map((x,i)=>[x,i]).reverse().slice(0,150).map(([x,i])=>`<tr${x.d>TODAY?' class="off"':''} data-ui="${i}"><td><input type="date" class="ue" data-uf="d" value="${esc(x.d||'')}"></td><td><input class="ue" data-uf="t" value="${esc(x.t||'')}" title="${x.fid?'gehört zu einer Buchung':''}"></td><td class="r"><span class="upm"><button type="button" class="btn sec sm" data-upm="${i}" title="Vorzeichen umdrehen (Einzahlung ↔ Entnahme)" aria-label="Vorzeichen umdrehen">±</button><input class="ue amt ${sign(x.b)}" inputmode="decimal" data-uf="b" value="${num(x.b)}"></span></td><td class="r">${eur(x.s)}</td><td class="r"><button class="btn sec sm" data-udel="${i}" aria-label="Löschen">×</button></td></tr>`).join('')+'</tbody>';
  // Gästebeitrag je Monat
  const gbm={};all.forEach(b=>{const k=b.a.slice(0,7);gbm[k]=(gbm[k]||0)+b.gb;});const gk=Object.keys(gbm).filter(k=>k>=ymAdd(CUR,-12)).sort().reverse();
  $('#gb-table').innerHTML=`<thead><tr><th>Monat</th><th class="r">Gästebeitrag</th></tr></thead><tbody>${gk.map(k=>`<tr><td>${ymName(k)}</td><td class="r">${eur(gbm[k])}</td></tr>`).join('')}</tbody>`;
}
$('#fw-yr').onchange=e=>{fwYr=e.target.value;rFewo();};
$('#fw-table').onclick=async e=>{const t=e.target;if(t.dataset.fwdel){if(!t.dataset.armed){t.dataset.armed=1;t.textContent='Wirklich?';t.classList.add('danger');return;}const id=t.dataset.fwdel;await fwSaveAll(fwList().filter(b=>b.id!==id));await saveUrlaub(u=>{u.e=u.e.filter(x=>x.fid!==id);});return;}
  if(t.closest('.fwedit'))return;const r=t.closest('tr.fwrow');if(r){fwOpen=fwOpen===r.dataset.fid?null:r.dataset.fid;rFewo();}};
$('#f-url').onsubmit=e=>{e.preventDefault();let b=parseNum($('#u-b').value);if(b!=null&&b>0)b=b*(+$('#u-art').value||1);if(b==null||!$('#u-d').value)return;saveUrlaub(u=>{u.e.push({d:$('#u-d').value,b:r2(b),t:$('#u-t').value.trim()});});e.target.reset();};
$('#u-table').addEventListener('change',e=>{const f=e.target.dataset.uf;if(!f)return;const i=+e.target.closest('tr').dataset.ui;let v=e.target.value;if(f==='b'){v=parseNum(v);if(v==null)return;v=r2(v);}saveUrlaub(u=>{if(u.e[i])u.e[i][f]=f==='t'?String(v).trim():v;});});
$('#u-table').onclick=e=>{const pm=e.target.closest('[data-upm]');if(pm){pm.blur();const i=+pm.dataset.upm;saveUrlaub(u=>{if(u.e[i])u.e[i].b=r2(-(+u.e[i].b||0));});return;}const b=e.target.closest('[data-udel]');if(!b)return;if(!b.dataset.armed){b.dataset.armed=1;b.textContent='✓';return;}saveUrlaub(u=>{u.e.splice(+b.dataset.udel,1);});};


$('#st-box').addEventListener('toggle',e=>{if(e.target.open)rSteuer();});

$('#fw-more').addEventListener('click',e=>{if(e.target.id==='fw-morebtn'){fwAll=!fwAll;rFewo();}});

/* Buchung nachträglich ändern */
async function fwUpdate(match,ch){const R=FR();const all=fwListAll();const b=all.find(x=>x.id===match.id)||all.find(x=>!match.id&&!x.storniert&&x.a===match.a&&(!match.p||x.p===normPlat(match.p)));if(!b)return null;
  const old=fwD(b);let list;
  if(ch.storniert){list=all.map(x=>x.id===b.id?{...x,storniert:true,stornoAm:TODAY}:x);}
  else if(ch.reaktivieren||ch.stoBez===false){list=all.map(x=>{if(x.id!==b.id)return x;const y={...x};delete y.storniert;delete y.stornoAm;if(y.stoBez){delete y.stoBez;y.gb=r2(R.gb*(+y.erw||0)*nightsOf(y.a,y.ab));delete y.gbM;}return y;});}
  else if(ch.stoBez){list=all.map(x=>x.id===b.id?{...x,stoBez:true,stornoAm:TODAY,gb:0}:x);}
  else{const nb={...b};if(ch.erw!=null&&ch.erw!=='')nb.erw=+ch.erw;if(ch.ki!=null&&ch.ki!=='')nb.ki=+ch.ki;if(ch.ab)nb.ab=ch.ab;if(ch.bar!==undefined)nb.bar=ch.bar==null||ch.bar===''?0:+ch.bar;if(ch.notiz!==undefined)nb.notiz=ch.notiz;if(ch.brutto!==undefined){const pl=normPlat(nb.p||nb.pRaw);if(ch.brutto==null){if(nb.bm){if(pl==='Booking.com')delete nb.gesamt;else if(pl==='Airbnb')nb.I=0;delete nb.bm;}}else{if(pl==='Booking.com')nb.gesamt=r2(ch.brutto);else if(pl==='Airbnb')nb.I=r2(ch.brutto);nb.bm=true;}}
    if(ch.barUrlaub!=null)nb.barUrlaub=ch.barUrlaub==='voll'?'voll':ch.barUrlaub==='nein'?false:ch.barUrlaub==='teilen'?true:!!ch.barUrlaub;
    if(ch.erw!=null||ch.ab){nb.gb=r2(R.gb*(+nb.erw||0)*nightsOf(nb.a,nb.ab));delete nb.gbM;}
    if(ch.J!==undefined&&ch.J!=null)nb.J=r2(ch.J);
    if(ch.gb!==undefined){if(ch.gb==null){nb.gb=r2(R.gb*(+nb.erw||0)*nightsOf(nb.a,nb.ab));delete nb.gbM;}else{nb.gb=r2(ch.gb);nb.gbM=true;}}
    if(ch.spO!==undefined){if(ch.spO==null)delete nb.spO;else nb.spO=r2(ch.spO);}
    if(ch.uO!==undefined){if(ch.uO==null)delete nb.uO;else nb.uO=r2(ch.uO);}list=all.map(x=>x.id===b.id?nb:x);}
  await fwSaveAll(list);const nw=ch.storniert?null:fwD(list.find(x=>x.id===b.id));
  await saveUrlaub(u=>{const i=u.e.findIndex(x=>x.fid===b.id||(!x.fid&&x.d===old.ud&&Math.abs((+x.b)-old.urlaub)<0.06));
    if(ch.storniert){if(i>=0)u.e.splice(i,1);return;}
    if(i>=0){u.e[i].d=nw.ud;u.e[i].b=nw.urlaub;u.e[i].fid=b.id;}else u.e.push({d:nw.ud,b:nw.urlaub,t:nw.p,fid:b.id});});
  return {old,nw};}
$('#fw-table').addEventListener('submit',async e=>{const fm=e.target.closest('.fwedit');if(!fm)return;e.preventDefault();const d=Object.fromEntries(new FormData(fm));
  await fwUpdate({id:fm.dataset.fid},{erw:d.erw,ki:d.ki,ab:d.ab,bar:parseNum(d.bar),notiz:d.notiz.trim(),barUrlaub:d.barUrlaub||'teilen'});});
$('#fw-table').addEventListener('click',async e=>{const rk=e.target.closest('[data-fwreakt]');if(rk){e.stopPropagation();await fwUpdate({id:rk.dataset.fwreakt},{reaktivieren:true});return;}const sb=e.target.closest('[data-fwstobez]');if(sb){e.stopPropagation();if(!sb.dataset.armed){sb.dataset.armed=1;sb.textContent='Wirklich? Geld kommt trotzdem';sb.classList.add('danger');return;}await fwUpdate({id:sb.dataset.fwstobez},{stoBez:true});return;}
  const sb0=e.target.closest('[data-fwstobez0]');if(sb0){e.stopPropagation();await fwUpdate({id:sb0.dataset.fwstobez0},{stoBez:false});return;}
  const s=e.target.closest('[data-fwstorno]');if(!s)return;e.stopPropagation();if(!s.dataset.armed){s.dataset.armed=1;s.textContent='Wirklich stornieren?';s.classList.add('danger');return;}
  await fwUpdate({id:s.dataset.fwstorno},{storniert:true});},true);

$('#fw-shotmsg').addEventListener('click',async e=>{if(e.target.id==='fw-chno'){fwPending=null;$('#fw-shotmsg').textContent='Verworfen.';return;}
  if(e.target.id!=='fw-chok'||!fwPending)return;e.target.disabled=true;const a=fwPending;fwPending=null;
  const r=await fwUpdate({a:a.anreise,p:a.plattform},{erw:a.erwachsene,ki:a.kinder,ab:a.abreise,bar:a.bar==null?undefined:a.bar,notiz:a.notiz||undefined,storniert:a.storniert,barUrlaub:a.barUrlaub,...(a.stoBez?{stoBez:true}:{})});
  if(r){$('#fw-text').value='';$('#fw-shotmsg').innerHTML=a.storniert?'<b class="pos">Buchung als storniert markiert.</b> Sie bleibt ausgegraut in der Liste, der Urlaubskonto-Eintrag ist entfernt.':`<b class="pos">Gespeichert.</b> Urlaubskonto jetzt ${eur(r.nw.urlaub)} (vorher ${eur(r.old.urlaub)}), Gästebeitrag ${eur(r.nw.gb)}.`;fwOpen=(fwList().find(b=>b.a===a.anreise)||{}).id||null;rFewo();}
  else $('#fw-shotmsg').innerHTML='<b class="neg">Diese Buchung habe ich nicht gefunden.</b> Bitte Anreisedatum prüfen.';});

/* Zettel: Beträge antippen und von Hand ändern */
$('#fw-table').addEventListener('click',e=>{const z=e.target.closest('.zed');if(!z)return;e.stopPropagation();const inp=document.createElement('input');inp.className='zin';inp.inputMode='decimal';inp.value=z.dataset.v;inp.dataset.zf=z.dataset.zf;inp.dataset.fid=z.dataset.fid;inp.dataset.orig=z.dataset.v;z.replaceWith(inp);inp.focus();inp.select();},true);
async function zCommit(inp){if(inp.dataset.done)return;inp.dataset.done=1;const v=inp.value.trim();if(v===inp.dataset.orig){render();return;}const val=v===''?null:parseNum(v);if(v!==''&&val==null){render();return;}
  const f=inp.dataset.zf;const map={brutto:'brutto',J:'J',gb:'gb',spar:'spO',urlaub:'uO'};if(f==='J'&&val==null){render();return;}
  await fwUpdate({id:inp.dataset.fid},{[map[f]]:val});}
$('#fw-table').addEventListener('keydown',e=>{if(!e.target.classList?.contains('zin'))return;if(e.key==='Enter'){e.preventDefault();zCommit(e.target);}if(e.key==='Escape'){e.target.dataset.done=1;render();}});
$('#fw-table').addEventListener('focusout',e=>{if(e.target.classList?.contains('zin'))zCommit(e.target);});
