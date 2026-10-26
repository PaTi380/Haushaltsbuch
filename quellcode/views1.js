const BLN={TILL:'Tills Giro',PATRICK:'Patricks Giro',HAUS:'Haushaltskonto'};
/* ---------- Monatsnavigation ---------- */
function mState(ym){const P=S.plan[ym];if(ym<planStart())return 'vor Planbeginn';if(!P)return 'kein Plan';if(P.zu||SH.every(sh=>P[sh]?.zu))return '🔒 abgeschlossen';{const cz=SH.filter(sh=>P[sh]?.zu).map(sh=>BLN[sh]);if(cz.length)return '🔒 '+cz.join(' + ')+' abgeschlossen';}const fx=['TILL','PATRICK'].filter(sh=>fixInfo(sh,P[sh])?.fixed).length;const base=ym<CUR?'offen (vergangen)':ym===CUR?'laufender Monat':P._virt?'fortgeschrieben':'Planung';return fx===2?'📌 festgeschrieben · '+base:fx===1?'📌 teilweise festgeschrieben · '+base:base;}
function renderMonthBar(){$$('.mtitle').forEach(e=>e.textContent=ymName(month));$$('.mstate').forEach(e=>{const t=mState(month);e.textContent=t;e.classList.toggle('fixed',t.startsWith('📌 fest'));e.classList.toggle('part',t.startsWith('📌 teil'));e.classList.toggle('zu',t.startsWith('🔒'));});const c=$('#m-close');if(c)c.textContent=bzu(S.plan[month],mWho)?`Abschluss aufheben (${BLN[mWho]})`:`${BLN[mWho]} abschließen`;}
document.addEventListener('click',e=>{const t=e.target.closest('.mtitle');const pk=e.target.closest('.mpick');
  if(pk){e.stopPropagation();const yb=e.target.closest('[data-py]');if(yb){pk.dataset.y=+pk.dataset.y+(+yb.dataset.py);pk.outerHTML=mPick(+pk.dataset.y);return;}const mb=e.target.closest('[data-pm]');if(mb&&!mb.disabled){month=mb.dataset.pm;$$('.mpick').forEach(x=>x.remove());render();}return;}
  if(t){const open=t.parentElement.querySelector('.mpick');$$('.mpick').forEach(x=>x.remove());if(!open)t.insertAdjacentHTML('afterend',mPick(+month.slice(0,4)));return;}
  if(!e.target.closest('.mpick'))$$('.mpick').forEach(x=>x.remove());},true);
function mPick(y){const y0=+MIN_M.slice(0,4),y1=+PLAN1.slice(0,4);return `<div class="mpick" data-y="${y}"><div class="mp-h"><button type="button" class="btn sec sm" data-py="-1" ${y<=y0?'disabled':''}>‹</button><b>${y}</b><button type="button" class="btn sec sm" data-py="1" ${y>=y1?'disabled':''}>›</button></div><div class="mp-g">${PVM.map((n,i)=>{const ym=y+'-'+String(i+1).padStart(2,'0');const P=S.plan[ym];return `<button type="button" data-pm="${ym}" class="${ym===month?'on':''}${ym===CUR?' cur':''}${P?.zu?' zu':''}" ${ym<MIN_M||ym>PLAN1?'disabled':''}>${n}${P?.zu?' 🔒':''}</button>`;}).join('')}</div><div class="mp-f"><button type="button" data-pm="${CUR<MIN_M?MIN_M:CUR}" class="btn sec sm">Heute</button></div></div>`;}
document.addEventListener('click',e=>{const b=e.target.closest('[data-mnav]');if(!b)return;const n=ymAdd(month,+b.dataset.mnav);if(n<MIN_M||n>PLAN1)return;month=n;render();});

/* ---------- Budget ---------- */
function essenBudget(ym){const v=gv('h_essen',ym);return v!=null?+v:(+S.bcfg.essen||0);}
function sonstAbzug(ym){const a=S.bcfg.sonstAbzug||{v:100,bis:'2027-04'};return ym<=a.bis?+a.v||0:0;}
function sonstBudget(ym){if(S.grund.items.some(i=>i.k==='h_s_frei'))return gn('h_s_frei',ym)-sonstAbzug(ym);let v=0;(S.bcfg.sonst||[]).slice().sort((a,b)=>a.ab.localeCompare(b.ab)).forEach(x=>{if(x.ab<=ym)v=+x.v;});return v;}
function potHTML(name,total,used,color){const rest=total-used;const pct=total>0?Math.max(0,Math.min(1,rest/total)):0;
  return `<div class="pot"><div class="lbl">${name}</div><div class="col" role="img" aria-label="${name}: noch ${eur(rest)} von ${eur(total)}"><div class="fill" style="height:${pct*100}%;background:${rest<0?'var(--bad)':color}"></div></div><div class="rest ${rest<0?'neg':''}">${eur(rest)}</div><div class="of">übrig von ${eur(total,0)}</div></div>`;}
function rBudget(){
  const B=S.budget[month]||{e:[],s:[]};const ue=(B.e||[]).reduce((a,x)=>a+x.b,0),us=(B.s||[]).reduce((a,x)=>a+x.b,0);
  const te=essenBudget(month),ts=sonstBudget(month);
  $('#b-pots').innerHTML=potHTML('Essen',te,ue,'var(--gem)')+potHTML('Sonstiges',ts,us,'var(--till)');
  $('#b-sub').textContent=ymName(month);
  const rows=[...(B.e||[]).map(x=>({...x,t:'e'})),...(B.s||[]).map(x=>({...x,t:'s'}))].sort((a,b)=>(b.d||'').localeCompare(a.d||''));
  $('#b-list').innerHTML=rows.length?`<table><tbody>${rows.map(x=>`<tr><td>${esc((x.d||'').split('-').reverse().slice(0,2).join('.'))}</td><td>${x.t==='e'?'Essen':'Sonstiges'}${x.n?' · '+esc(x.n):''}${x.w?' <span class="muted">('+esc(x.w)+')</span>':''}</td><td class="r ${x.b<0?'pos':''}">${x.b<0?'+ '+eur(-x.b)+' Ausgleich':eur(x.b)}</td><td class="r"><button class="btn sec sm" data-bdel="${x.t}:${x.id}" aria-label="Löschen">×</button></td></tr>`).join('')}</tbody></table>`:'<div class="muted" style="padding:6px 0">Noch nichts eingetragen.</div>';
}
function addBudget(t,b,n,w,ym){ym=ym||month;const id=uid();const sh=PSH[w];const giro=b<0&&sh&&sh!=='HAUS'&&S.plan[ym];
  const p=saveBudget(ym,d=>{d[t].push({id,b:r2(b),n:n||'',w:w||'',d:TODAY,...(giro?{lk:'b'+id}:{})});});
  if(!giro)return p;return p.then(()=>savePlan(ym,d=>{const blk=d[sh]=d[sh]||{};const L=blk.C=blk.C||[];const ne={l:`Ausgleich ${t==='e'?'Essen':'Sonstiges'}${n&&!/^ausgleich/i.test(n)?' ('+n+')':''}`,v:r2(-b),lk:'b'+id,fest:false};const em=L.findIndex(e=>!e.l&&e.v==null);if(em>=0)L[em]=ne;else L.push(ne);}));}
$('#f-budget').addEventListener('click',e=>{const b=e.target.closest('[data-topf]');if(!b)return;e.preventDefault();const v=parseNum($('#b-betrag').value);if(!v){$('#b-betrag').focus();return;}
  addBudget(b.dataset.topf,v,$('#b-notiz').value.trim(),$('#b-wer').value);$('#b-betrag').value='';$('#b-notiz').value='';});
$('#f-budget').onsubmit=e=>e.preventDefault();
$('#b-list').onclick=e=>{const b=e.target.closest('[data-bdel]');if(!b)return;const[t,id]=b.dataset.bdel.split(':');const x=(S.budget[month]?.[t]||[]).find(x=>x.id===id);saveBudget(month,d=>{d[t]=d[t].filter(x=>x.id!==id);});if(x?.lk&&S.plan[month])savePlan(month,d=>{['TILL','PATRICK'].forEach(sh=>{if(d[sh]?.C)d[sh].C=d[sh].C.filter(e=>e.lk!==x.lk);});});};

/* ---------- Heute ---------- */
function rHeute(){
  renderMonthBar();rBudget();
  const c=CALC[month];
  if(!c){$('#h-ueb').innerHTML='<div class="muted">Der Plan beginnt im Oktober 2026.</div>';$('#h-konten').innerHTML='';return;}
  const H=c.HAUS;
  $('#h-ueb').innerHTML=`<div class="kpi"><span class="v">${eur(H.ueb)}</span><span class="n">im ${ymName(month)} vom Haushaltskonto aufs Girokonto überweisen</span></div>
   <details open style="margin-top:8px"><summary class="muted" style="cursor:pointer">Woraus sich der Betrag zusammensetzt</summary>${(S.plan[month]?.HAUS?.G||[]).filter(e=>!isDauer(e.l)).map(e=>`<div class="row"><span>${esc(e.l)}</span><span class="num">${eur(entryVal(e,S.plan[month].HAUS,'HAUS'))}</span></div>`).join('')}${H.dauer.map(([l,v])=>`<div class="row dauer"><span>${esc(l)} <small>Dauerauftrag, nicht in der Summe</small></span><span class="num">${eur(v)}</span></div>`).join('')}</details>${hausInfo()}`;
  const dl=(v,base)=>{if(base==null)return'';const d=v-base;return Math.abs(d)<0.005?'<small class="dlt ok">✓ wie geplant</small>':`<small class="dlt ${d<0?'neg':'pos'}">${d>0?'+':'−'}${eur(Math.abs(d))} seit Planung</small>`;};
  const snapInfo=sh=>{const sn=S.plan[month]?.[sh]?.snap;if(bzu(S.plan[month],sh))return `<div class="note snapn">🔒 Abgeschlossen am ${dDE(bzuAm(S.plan[month],sh))}.</div>`;return sn?`<div class="note snapn">📌 Geplant am ${dDE(sn.am)}. Daneben siehst du, was sich seitdem geändert hat.</div>`:`<div class="note snapn">Noch nicht festgeschrieben. Nach der Monatsplanung im Reiter Monat beim Giroausgleich auf 📌 tippen, dann siehst du hier jede Abweichung.</div>`;};
  const box=(t,rows,color,sh,extra='')=>`<div class="card" style="border-top:3px solid ${color}"><h2>${t}</h2>${sh?snapInfo(sh):''}${rows.map(([l,v,b,base])=>`<div class="row"><span>${l}</span><span class="rv">${b?`<b class="num ${sign(v)}">${eur(v)}</b>`:`<span class="num ${v<0?'neg':''}">${eur(v)}</span>`}${dl(v,base)}</span></div>`).join('')}${extra}</div>`;
  const SN=sh=>S.plan[month]?.[sh]?.snap||{};
  const inv=(rows,tot)=>`<div class="goldsep">${rows.map(([l,v])=>`<div class="row"><span>${l}</span><span class="num">${eur(v)}</span></div>`).join('')}<div class="note" style="margin:2px 0 0">Anlagen, laufen im Hintergrund</div></div><div class="row" style="margin-top:8px"><span>Gesamt</span><b class="num ${sign(tot)}">${eur(tot)}</b></div>`;
  $('#h-konten').innerHTML=box('Till',[['<span class="kd giro"></span>Girokonto',c.TILL.giro,0,SN('TILL').giro],['<span class="kd tg"></span>Tagesgeld',c.TILL.tg,0,SN('TILL').tg]],'var(--till)','TILL',inv([['ETF',c.TILL.etf],['Gold',c.TILL.gold]],c.TILL.total))
    +box('Patrick',[['<span class="kd giro"></span>Girokonto',c.PATRICK.giro,0,SN('PATRICK').giro],['<span class="kd tg"></span>Tagesgeld',c.PATRICK.tg,0,SN('PATRICK').tg]],'var(--pat)','PATRICK',inv([['ETF',c.PATRICK.etf]],c.PATRICK.total))
    +box('Haushaltskonto',[['Anfang',H.k0],['− Abbuchungen',-H.soll],['+ Einzahlungen',H.haben],['Ende',H.k,1]],'var(--gem)','',`<div class="goldsep"><div class="row"><span>Gemeinsames Golddepot</span><span class="num">${eur(sharedGold().reduce((a,x)=>a+x.w,0))}</span></div><div class="note" style="margin:2px 0 0">separat, nicht auf dem Haushaltskonto</div></div>`);
  try{rFwNext();}catch(err){console.error(err);}
  rBkHint();
}

function bkAlt(){let am=S.sich?.am?S.sich.am.slice(0,10):null;const au=(S.sichAuto||[]).map(x=>(x.am||'').slice(0,10)).sort().at(-1);if(au&&(!am||au>am))am=au;if(!am)return 999;return Math.round((Date.parse(TODAY)-Date.parse(am))/864e5);}
function rBkHint(){const el=$('#h-bk');if(!el)return;const d=bkAlt();if(d<30){el.innerHTML='';return;}
  el.innerHTML=`<div class="bkhint">💾 <div><b>${d>=999?'Noch keine Sicherung gespeichert':'Letzte Sicherung vor '+d+' Tagen'}</b><small>Einmal im Monat sichern, dann bleibt nichts verloren.</small></div><button type="button" class="btn sm" data-bknow="1">Jetzt sichern</button></div>`;}
document.addEventListener('click',e=>{if(e.target.closest('[data-bknow]'))$('#bk-save').click();});
const JLAB={J5:'Tilgung',J6:'Wohngebäudeversicherung',J7:'Hausrat',J8:'Wasser',J9:'Grundsteuer',J10:'Abfall',J11:'Risikolebensversicherung',J12:'Haftpflicht',J13:'Rechtsschutz',J14:'ADAC',J15:'Internet',J16:'GEZ',J17:'Essen',J18:'Sonstiges',J20:'eigene Posten'};
function hsOf(ym){const P=S.plan[ym];const e=(P?.TILL?.C||[]).find(x=>/^haus, sonst/i.test((x.l||'').trim()));if(!e)return null;useYm(ym);const v=entryVal(e,P.TILL,'TILL');return v;}
function hausInfo(){const now=hsOf(month);if(now==null){useYm(month);return '';}let nx=null;for(let ym=ymAdd(month,1);ym<=PLAN1;ym=ymAdd(ym,1)){const v=hsOf(ym);if(v!=null&&Math.abs(v-now)>=0.5){nx=[ym,v];break;}}useYm(month);
  let why='';if(nx){const a=jOf(ymAdd(nx[0],-1)),b=jOf(nx[0]);const ch=Object.keys(JLAB).map(k=>[JLAB[k],((b[k]||0)-(a[k]||0))/2]).filter(([,d])=>Math.abs(d)>=0.01);
    why=ch.length?ch.map(([l,d])=>`${l} ${d>0?'+':'−'}${eur(Math.abs(d))}`).join(', '):(nx[0]==='2027-01'?'Heizöl-Rücklage (bis Dezember 2026) fällt weg':'feste Beträge im Plan ändern sich');}
  useYm(month);
  return `<div class="hsinfo"><div class="row"><span><b>Haus, sonst.</b> je Person im ${ymName(month)}</span><b class="num">${eur(now)}</b></div>${nx?`<div class="note" style="margin:2px 0 0">Nächste Änderung ab <b>${ymName(nx[0])}</b>: ${eur(nx[1])} (${nx[1]>now?'+':'−'}${eur(Math.abs(nx[1]-now))}) · ${why}</div>`:'<div class="note" style="margin:2px 0 0">Keine Änderung bis '+ymName(PLAN1)+' geplant.</div>'}</div>`;}
let fwNOff=0;
function rFwNext(){const el=$('#h-fw');if(!el||typeof fwList!=='function')return;const R=FR();
  const A=fwList().sort((a,b)=>a.ud.localeCompare(b.ud));let i0=A.findIndex(b=>b.ud>=TODAY);if(i0<0)i0=A.length;
  if(!A.length){el.hidden=true;return;}el.hidden=false;const idx=Math.max(0,Math.min(A.length-1,i0+fwNOff));fwNOff=idx-i0;const b=A[idx];const L=A.slice(idx);
  const spar=b.spar;const tage=Math.round((Date.parse(b.ud)-Date.parse(TODAY))/864e5);
  const wann=tage===0?'heute':tage===1?'morgen':tage>1?'in '+tage+' Tagen':tage===-1?'gestern':'vor '+(-tage)+' Tagen';
  const nav=`<span style="display:flex;gap:6px;align-items:center"><button type="button" class="btn sec sm" data-fwn="-1" ${idx<=0?'disabled':''} aria-label="Vorherige Gutschrift">←</button>${fwNOff?'<button type="button" class="btn sec sm" data-fwn="0">Nächste</button>':''}<button type="button" class="btn sec sm" data-fwn="1" ${idx>=A.length-1?'disabled':''} aria-label="Spätere Gutschrift">→</button></span>`;
  el.innerHTML=`<div class="head"><h2>${tage<0?'Frühere Gutschrift':fwNOff>0?'Spätere Gutschrift':'Nächste Gutschrift'} Ferienwohnung</h2>${nav}</div><div class="muted" style="font-size:12px;margin:-4px 0 6px">${wann}${tage<0?' fällig – noch nicht angekommen? Auszahlungen kommen manchmal ein paar Tage später.':''}</div>
  <div class="fwn-top"><div><span class="fwn-d">${dDE(b.ud)}</span><span class="muted">${esc(b.p)} · ${dDE(b.a)}–${dDE(b.ab)} · ${gaeste(b)}</span></div><b class="num fwn-v">${eur(b.netto)}</b></div>
  ${b.bar?`<div class="row"><span>zusätzlich bar vor Ort <small class="muted">${b.barM==='nein'?'(nicht aufs Urlaubskonto)':b.barM==='voll'?'(komplett aufs Urlaubskonto)':'(wird mit aufgeteilt)'}</small></span><span class="num">${eur(b.bar)}</span></div>`:''}
  <div class="fwn-split"><div class="fwn-h">Davon weiterleiten</div>
   <div class="fwn-r u"><span>🏖️ aufs <b>Urlaubskonto</b></span><b class="num">${eur(b.urlaub)}</b></div>
   <div class="fwn-r g"><span>🏛️ <b>Gästebeitrag</b> für die Gemeinde <small class="muted">${b.erw||0} Erw. × ${b.n} Nächte</small></span><b class="num">${eur(b.gb)}</b></div>
   <div class="fwn-r s"><span>🐷 <b>Spartopf</b> <small class="muted">${Math.round(R.urlProz*100)} % + ${eur(R.urlFix,0)}</small></span><b class="num">${eur(spar)}</b></div></div>
  ${b.sicher?'':`<div class="note">Stornierbar bis ${dDE(b.frist)}.</div>`}
  ${L.length>1?`<div class="fwn-more">Danach: ${L.slice(1,4).map(x=>`${dDE(x.ud)} <b class="num">${eur(x.netto,0)}</b> <span class="muted">(${esc(x.p)})</span>`).join(' · ')}</div>`:''}`;}
document.getElementById('h-fw')?.addEventListener('click',e=>{const t=e.target.closest('[data-fwn]');if(!t)return;const v=+t.dataset.fwn;fwNOff=v===0?0:fwNOff+v;rFwNext();});
/* ---------- Monat ---------- */
let mWho='TILL';
$('#m-who').innerHTML=SH.map(s=>`<button type="button" data-w="${s}">${SHN[s]}</button>`).join('');
$('#m-who').onclick=e=>{const b=e.target.closest('[data-w]');if(!b)return;mWho=b.dataset.w;const bt=$('#m-close');if(bt){bt.dataset.armed='';bt.classList.remove('danger');}const ck=$('#m-check');if(ck)ck.hidden=true;render();};
const FEST_P=/^(giroausgleich|haus, sonst|pauschale|ioniq|sparen für auto|autosparen|etf$|versicherung|gemeinschaftskredit|strom anteil|rückgabe|rate sonde|kfz|anhänger|startkapital|svlfg|rest gehalt|debeka)/i;
const ABGL='Abgleich Kontostand';
function isFest(e,sh,g){if(e._c)return true;if(e.fest!=null)return !!e.fest;if((e.l||'')===ABGL)return false;if(e.f)return true;
  if(sh==='HAUS')return g==='G'?!!e.l:/^anteil/i.test(e.l||'');return FEST_P.test((e.l||'').trim());}
const ABG={giro:['C','E'],tg:['I','K'],haus:['G','I']};
function tendHTML(blk,c){const sn=blk.snap;
  if(!sn){const ks=blk.G||blk.I&&!blk.C?['haus']:['giro','tg'];const ds=ks.map(k=>[k,r2(abglVal(blk,k))]);const d=r2(ds.reduce((a,x)=>a+x[1],0));if(ds.some(x=>Math.abs(x[1])>0.004)){const NM={giro:'Girokonto',tg:'Tagesgeld',haus:'Haushaltskonto'};
    return `<div class="tend ${Math.abs(d)<0.5?'eq':d>0?'pos':'neg'}"><small>✅ Ergebnis Monatsende laut echtem Kontostand</small>${Math.abs(d)<0.5?'genau wie geplant':`<b class="num ${d>0?'pos':'neg'}">${eur(Math.abs(d),0)}</b> ${d>0?'mehr':'weniger'} auf den Konten als geplant`}<small>${ds.map(([k,x])=>`${NM[k]} ${x>=0?'+':'−'}${eur(Math.abs(x))}`).join(' · ')}</small></div>`;}}
  if(!sn)return `<div class="tend eq"><small>Nach dem 📌 beim Giroausgleich siehst du hier, ob ihr über oder unter dem Plan liegt.</small></div>`;
  const dg=r2(c.giro-sn.giro),dt=r2(c.tg-sn.tg),d=r2(dg+dt);const fin=['giro','tg'].some(k=>(ABG[k]).some(g=>(blk[g]||[]).some(e=>e.l===ABGL)));
  const head=fin?'Endergebnis mit echtem Kontostand':`Tendenz seit der Planung am ${dDE(sn.am)}`;
  const txt=Math.abs(d)<0.5?'genau wie geplant':d>0?`<b class="num pos">${eur(d,0)}</b> weniger ausgegeben als geplant`:`<b class="num neg">${eur(-d,0)}</b> mehr ausgegeben als geplant`;
  const det=Math.abs(d)<0.5?'':` · Girokonto ${dg>=0?'+':'−'}${eur(Math.abs(dg),0)}, Tagesgeld ${dt>=0?'+':'−'}${eur(Math.abs(dt),0)}`;
  return `<div class="tend ${Math.abs(d)<0.5?'eq':d>0?'pos':'neg'}"><small>${fin?'✅ ':'📈 '}${head}</small>${txt}<small>${d>0.5?'(oder mehr eingenommen) ':''}Girokonto + Tagesgeld, ohne ETF${det}</small></div>`;}
function abglChip(blk,k){const d=r2(abglVal(blk,k));if(Math.abs(d)<0.005)return '';return `<br><b class="num ${d>0?'pos':'neg'}">${d>0?'+':'−'}${eur(Math.abs(d))} ${d>0?'mehr':'weniger'} als geplant</b>`;}
function abglVal(blk,k){const[out,inn]=ABG[k];const f=g=>(blk[g]||[]).filter(e=>e.l===ABGL).reduce((a,e)=>a+(+e.v||0),0);return f(inn)-f(out);}
const UNL=new Set();
function sharedGold(){const p=gn('goldpreis');return [0,1].map(()=>({t:'Barren 10 g',w:10/OZ*p,k:624.65}));}
const GOLDK=[463,1070,1553,624.65,2299.76];const GOLDN=['Barren 10 g','Barren 20 g','Barren 1 oz','Barren 10 g','Barren 1 oz'];
function goldRows(){const p=gn('goldpreis');return GOLD.map((g,i)=>({g,t:GOLDN[i],w:g/OZ*p,k:GOLDK[i]}));}
function goldList(rows){const k=rows.reduce((a,x)=>a+x.k,0),w=rows.reduce((a,x)=>a+x.w,0);
  return rows.map(x=>`<div class="row"><span class="muted">${x.t} <small>(Kauf ${eur(x.k)})</small></span><span class="num muted">${eur(x.w)} <span class="${sign(x.w-x.k)}">${x.w-x.k>=0?'+':''}${eur(x.w-x.k,0)}</span></span></div>`).join('')+`<div class="row"><span>Gold ${w-k>=0?'Gewinn':'Verlust'} gesamt <small class="muted">(Kaufpreis ${eur(k)})</small></span><b class="num ${sign(w-k)}">${w-k>=0?'+':''}${eur(w-k)} (${((w/k-1)*100).toLocaleString('de-DE',{maximumFractionDigits:0})} %)</b></div>`;}
function depotHTML(c,sh){const gain=c.etf-c.einz;let h=`<div class="dep"><div class="row"><span>ETF-Depot ${c.etfIst?'<span class="pill g">echter Wert</span>':'<span class="pill">Plan</span>'}</span><b class="num">${eur(c.etf)}</b></div><div class="row"><span class="muted">eingezahlt insgesamt</span><span class="num muted">${eur(c.einz)}</span></div><div class="row"><span class="muted">${gain>=0?'Gewinn':'Verlust'}</span><span class="num ${sign(gain)}">${gain>=0?'+':''}${eur(gain)}</span></div><div class="row"><span class="muted">Sparrate diesen Monat</span><span class="num muted">${eur(c.etfRate)}</span></div>`;
  if(sh==='TILL'){h+=`<div class="row" style="margin-top:6px"><span>Gold <span class="muted">zu ${eur(gn('goldpreis'))} je Unze${gv('goldpreis')&&goldAm()?' · Stand '+dDE(goldAm())+(liveGold()?' (automatisch)':''):''}</span></span><b class="num">${eur(c.gold)}</b></div>`+goldList(goldRows());}
  return h+'</div>';}
function fixInfo(sh,blk){const E=blk?.E||[];const i=E.findIndex(e=>GIROAUS.test((e.l||'').trim()));if(i<0)return null;const e=E[i];return {i,fixed:e.f!=='=GIROAUSGLEICH',am:e.fix||blk.snap?.am||null};}
function fixBanner(sh,blk){if(!blk)return '';const P=S.plan[month];if(bzu(P,sh))return `<div class="fixb done">🔒 <div><b>${BLN[sh]}: Monat abgeschlossen</b><small>am ${dDE(bzuAm(P,sh))} · alle Beträge sind fest. Aufheben oben mit „Abschluss aufheben“.</small></div>${(S.sich?.am||'').slice(0,10)<bzuAm(P,sh)?'<button type="button" class="btn sm" data-bknow="1">💾 Jetzt sichern</button>':''}</div>`;if(sh==='HAUS')return '';const f=fixInfo(sh,blk);if(!f)return '';
  return f.fixed?`<div class="fixb on">📌 <div><b>Plan festgeschrieben</b><small>${f.am?'am '+dDE(f.am)+' · ':''}Giroausgleich ${eur(entryVal(blk.E[f.i],blk,sh))} ist fix. Abweichungen siehst du unten bei der Tendenz.</small></div><button type="button" class="btn sec sm" data-auto="${f.i}" title="Wieder automatisch rechnen lassen">↺ lösen</button></div>`
   :`<div class="fixb off">✏️ <div><b>Noch in Planung</b><small>Der Giroausgleich rechnet sich noch automatisch. Wenn alles passt und überwiesen ist: festschreiben.</small></div><button type="button" class="btn sm" data-fix="${f.i}">📌 Festschreiben</button></div>`;}
function gehInfo(sh,blk){if(sh==='HAUS'||!blk)return'';useYm(month);const k=sh==='TILL'?'t_gehalt':'p_gehalt';const it=S.grund.items.find(i=>i.k===k);if(!it)return'';
  const g=gehOf(blk,sh);const ist=hasGehIst(blk);const ga=giroAus(blk,sh);const a=ga.reduce((x,y)=>x+y.v,0),b=0;const rest=g-a;const v=gv(k,month);const chg=(it.hist||[]).filter(h=>h.ab<=month).at(-1);
  return `<div class="geh ${rest<0?'neg-b':''}"><div><span class="muted">Gehalt ${ymName(month)}</span> ${sh==='TILL'?`<span class="muted">${eur(ist?+blk.gehIst:v)} − IGBCE-Beitrag ${eur(igb())} =</span> <b>${eur(g)}</b>`:`<b>${eur(g)}</b>`}${ist?` <span class="pill">echtes Gehalt · geplant ${eur(v)}, ${g-(sh==='TILL'?v-igb():v)>=0?'+':'−'}${eur(Math.abs(g-(sh==='TILL'?v-igb():v)))}</span>`:chg?` <span class="pill">seit ${ymName(chg.ab)} geändert, vorher ${eur(it.v)}</span>`:''}<label class="gehist">echtes Gehalt diesen Monat<input inputmode="decimal" data-gehist="1" value="${ist?num(blk.gehIst):''}" placeholder="${num(v)}"></label></div><div class="muted" style="font-size:12px">${rest<0?`Das Girokonto braucht diesen Monat ${eur(a)}: <b>${eur(g)}</b> aus dem Gehalt + <b class="num neg">${eur(-rest)}</b> vom Tagesgeld`:`Aufs Girokonto (Giroausgleich) ${eur(a)} · Rest aufs Tagesgeld <b class="num">${eur(rest)}</b>`}${(()=>{const g0=CALC?.[month]?.[sh]?.giro0||0;return Math.abs(g0)>=0.5&&!ga.some(x=>x.e.f!=='=GIROAUSGLEICH')?`<div class="muted" style="font-size:12px;margin-top:3px">ℹ️ Im Giroausgleich stecken ${g0<0?`${eur(-g0)} zum Ausgleich des Minus aus dem Vormonat`:`${eur(g0)} weniger, weil vom Vormonat noch Guthaben da ist`}.</div>`:'';})()}</div>${(()=>{const man=ga.some(x=>x.e.f!=='=GIROAUSGLEICH');const ge=CALC?.[month]?.[sh]?.giro??0;let h='';if(man)h+=`<div class="muted" style="font-size:12px;margin-top:3px">${ga.some(x=>x.e.fix)?'📌 Giroausgleich festgeschrieben':'✎ Giroausgleich von Hand eingetragen'}${Math.abs(ge)>=0.005?`: das Girokonto endet dadurch bei <b class="num ${ge<0?'neg':''}">${eur(ge)}</b>`:''}. ↺ = wieder automatisch.</div>`;if(rest<0)h+=`<div class="warnc" style="font-size:12px;margin-top:3px">${man?`Du überweist ${eur(-rest)} mehr aufs Girokonto, als Gehalt da ist.`:'Das Gehalt reicht diesen Monat nicht für alle Ausgaben.'} Der fehlende Betrag steht beim Tagesgeld unter Entnahmen.</div>`;return h;})()}</div>`;}
function pauInfo(blk,sh){const pe=(blk.C||[]).find(isPausch);if(!pe)return'';const used=pauschUsed(blk,sh);if(!used)return'<div class="pinfo muted">Tipp: Ausgaben, die aus der Pauschale bezahlt werden (Restaurant, Klamotten …), mit <b>P</b> markieren. Dann werden sie von der Pauschale abgezogen und nicht doppelt gezählt.</div>';
  const base=pauschBase(pe,blk,sh);const rest=base-used;return `<div class="pinfo">Pauschale ${eur(base,0)}: davon ${eur(used)} ausgegeben (P) · ${rest>=0?`noch <b class="pos">${eur(rest)}</b> frei (steht unten bei „Pauschale“)`:`<b class="neg">${eur(-rest)} über der Pauschale</b>`}</div>`;}
function rMonat(){
  renderMonthBar();$$('#m-who button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.w===mWho));$$('#m-who button').forEach(b=>{const sh=b.dataset.w;const f=sh!=='HAUS'?fixInfo(sh,S.plan[month]?.[sh]):null;b.textContent=SHN[sh]+(bzu(S.plan[month],sh)?' 🔒':f?.fixed?' 📌':'');});
  const P=S.plan[month];const el=$('#m-blocks');
  if(!P){el.innerHTML=`<div class="card muted">Für ${ymName(month)} gibt es keinen Plan. Der Plan läuft von Oktober 2026 bis ${ymName(PLAN1)}.</div>`;return;}
  const sh=mWho,blk=P[sh]||{};const c=CALC[month][sh];
  const row=(e,i,g,ov)=>{if(e._c)return `<div class="er fest locked cst"><input value="${esc(e.l)}" readonly tabindex="-1" title="Eigener Posten aus den Einstellungen"><input class="amt fx" value="${num(entryVal(e,blk,sh))}" readonly tabindex="-1"><span class="pin" title="kommt aus den Einstellungen → Grundbeträge; dort ändern oder beenden">⚙️</span><span></span></div>`;const v=ov??entryVal(e,blk,sh);const lk=isLinked(e)||e.f==='=RESTGEHALT'||e.f==='=GIROAUSGLEICH';const fe=isFest(e,sh,g);const ab=e.l===ABGL;const key=`${month}|${sh}|${g}|${i}`;const locked=fe&&!UNL.has(key);const ro=locked?' readonly tabindex="-1"':'';
    return `<div class="er${fe?' fest':''}${locked?' locked':''}${ab?' abgl':''}" data-g="${g}" data-i="${i}"><input value="${esc(e.l)}" data-fld="l" aria-label="Bezeichnung"${ro} title="${e.lk?'gehört zu einer Tagesgeld-Entnahme: Tagesgeld → Girokonto → Ausgabe':''}"${e.lk?' class="lnk"':''}><input class="amt${lk?' fx':''}" inputmode="decimal" value="${num(v)}" data-fld="v" aria-label="Betrag"${ro} title="${e.f==='=GIROAUSGLEICH'?'automatisch: so viel, dass das Girokonto am Monatsende auf 0 steht. Eigener Betrag möglich; Feld leeren = wieder automatisch':lk?'verknüpft mit den Grundbeträgen':''}">${g==='C'&&sh!=='HAUS'&&!fe&&!e.lk&&!ab?`<button type="button" data-pau="${i}" class="ptog${e.p?' on':''}" title="${e.p?'wird von der Pauschale abgezogen – tippen, um es als zusätzliche Ausgabe zu zählen':'aus der Pauschale bezahlt? Tippen, dann wird es von der Pauschale abgezogen statt zusätzlich gezählt'}" aria-pressed="${!!e.p}">P</button>`:g==='E'&&e.f==='=GIROAUSGLEICH'?`<button type="button" data-fix="${i}" class="pin" title="Betrag jetzt festschreiben (z. B. nach der Überweisung). Danach ändert er sich nicht mehr automatisch." aria-label="Giroausgleich festschreiben">📌</button>`:fe?`<button type="button" data-lock="${key}" class="pin" aria-label="${locked?'Schloss öffnen, um zu ändern':'wieder verriegeln'}" title="${locked?'zum Ändern aufschließen':'wieder verriegeln'}">${locked?'🔒':'🔓'}</button>`:'<span></span>'}${g==='E'&&GIROAUS.test((e.l||'').trim())&&e.f!=='=GIROAUSGLEICH'?`<button type="button" data-auto="${i}" title="${e.fix?'festgeschrieben am '+dDE(e.fix)+' – ':''}wieder automatisch rechnen" aria-label="Giroausgleich wieder automatisch">↺</button>`:locked?'<span></span>':'<button type="button" data-del="1" aria-label="Zeile löschen">×</button>'}</div>`;};
  const rn=sh==='HAUS'?0:restNeg(blk,sh);
  const grp=([g,t])=>{let L=(blk[g]||[]).map((e,i)=>[e,i]);if(rn&&g==='K')L=L.filter(([e])=>e.f!=='=RESTGEHALT');let tot=L.reduce((a,[e])=>a+entryVal(e,blk,sh),0);if(rn&&g==='I')tot+=rn;
    const F=L.filter(([e])=>isFest(e,sh,g)),V=L.filter(([e])=>!isFest(e,sh,g));const pe=g==='C'&&sh!=='HAUS'?(blk.C||[]).find(isPausch):null;const pb=pe?pauschBase(pe,blk,sh):0,pu=pe?pauschUsed(blk,sh):0,pov=Math.max(0,pu-pb);const pv=x=>entryVal(x,blk,sh);
    const rnIn=`<div class="er fest locked"><input value="vom Tagesgeld" title="Das Gehalt reicht diesen Monat nicht; der Rest kommt vom Tagesgeld." readonly tabindex="-1"><input class="amt fx" value="${num(rn)}" readonly tabindex="-1"><span class="pin">🔒</span><span></span></div>`;
    const rnRow=rn&&g==='I'?`<div class="er fest locked"><input value="ans Girokonto" readonly tabindex="-1" title="Das Gehalt reicht nicht für den Giroausgleich; dieser Betrag kommt vom Tagesgeld."><input class="amt fx" value="${num(rn)}" readonly tabindex="-1"><span class="pin">🔒</span><span></span></div>`:'';
    const out=(sh==='HAUS'?g==='G':(g==='C'||g==='I'));
    return `<div class="gl ${out?'out':'in'}"><h3><span><i class="flow">${out?'−':'+'}</i>${t.split(': ').pop()}</span><span class="num">${out?'−':'+'} ${eur(tot)}</span></h3>${g==='C'&&sh!=='HAUS'?pauInfo(blk,sh):''}${V.map(([e,i])=>row(e,i,g)).join('')}
      ${L.length<15?`<button type="button" class="btn sec sm" data-add="${g}">+ Zeile</button>`:'<div class="note">15 Zeilen voll.</div>'}
      ${F.length||rnRow?`<div class="festbox"><div class="festh">🔒 Feste Beträge · ${eur(F.reduce((a,[e])=>a+pv(e),0)+(g==='I'?rn:0))}</div>${rnRow}${F.map(([e,i])=>rn&&g==='E'&&GIROAUS.test((e.l||'').trim())?row(e,i,g,entryVal(e,blk,sh)-rn)+rnIn:row(e,i,g)).join('')}</div>`:''}</div>`;};
  const ACC=sh==='HAUS'?[['haus','Haushaltskonto',['G','I'],c.k0,c.k]]:[['giro','Girokonto',['C','E'],c.giro0,c.giro],['tg','Tagesgeld',['I','K'],c.tg0,c.tg]];
  const groups=ACC.map(([k,name,gs,a0,a1])=>`<div class="acct ${k}"><div class="acct-h"><span><span class="kd ${k}"></span>${name}</span><small>Anfang ${eur(a0)} → Ende <b class="num ${a1<0?'neg':''}">${eur(a1)}</b>${abglChip(blk,k)}</small></div><div class="gridg">${GR[sh].filter(([g])=>gs.includes(g)).map(grp).join('')}</div></div>`).join('');
  const bank=(k,calc,label)=>{const has=Math.abs(abglVal(blk,k))>0.004;return `<div class="bankrow"><span><span class="kd ${k}"></span>${label}<small>laut Plan ${eur(calc-abglVal(blk,k))}${has?` · Abgleich ${abglVal(blk,k)>0?'+':''}${eur(abglVal(blk,k))}`:''}</small></span><label>echter Kontostand<input inputmode="decimal" data-abgl="${k}" value="${has?num(calc):''}" placeholder="${num(calc)}"></label></div>`;};
  let sum='';
  if(sh==='HAUS'){sum=`<div class="row"><span>Anfang</span><span class="num">${eur(c.k0)}</span></div><div class="row"><span>− Abbuchungen</span><span class="num">${eur(c.soll)}</span></div><div class="row"><span>+ Einzahlungen</span><span class="num">${eur(c.haben)}</span></div><div class="sumrow"><span>Haushaltskonto Monatsende</span><span class="num ${c.k<0?'neg':''}">${eur(c.k)}</span></div><div class="row"><span>Überweisung aufs Girokonto</span><b class="num">${eur(c.ueb)}</b></div><details class="row goldsep" style="display:block"><summary style="display:flex;justify-content:space-between;cursor:pointer"><span>Gemeinsames Golddepot <span class="muted">▸ aufschlüsseln</span></span><span class="num">${eur(sharedGold().reduce((a,x)=>a+x.w,0))}</span></summary><div class="dep">${goldList(sharedGold())}<div class="note">2 × 10 g, gehört euch beiden je zur Hälfte. Zählt nicht zum Stand des Haushaltskontos.</div></div></details>${blk.notiz?`<div class="note">${esc(blk.notiz)}</div>`:''}`;}
  else sum=`<div class="row"><span><span class="kd giro"></span>Girokonto: Anfang ${eur(c.giro0)} − ${eur(c.soll)} + ${eur(c.haben)}</span><b class="num ${c.giro<0?'neg':''}">${eur(c.giro)}</b></div><div class="row"><span><span class="kd tg"></span>Tagesgeld: Anfang ${eur(c.tg0)} − ${eur(c.tgS)} + ${eur(c.tgH)}</span><b class="num">${eur(c.tg)}</b></div><details class="row goldsep" style="display:block"><summary style="display:flex;justify-content:space-between;cursor:pointer"><span>ETF${sh==='TILL'?' und Gold':''} <span class="muted">▸ aufschlüsseln</span></span><span class="num">${eur(c.etf+c.gold)}</span></summary>${depotHTML(c,sh)}</details><div class="sumrow"><span>Gesamt am Monatsende</span><span class="num">${eur(c.total)}</span></div>`+tendHTML(blk,c);
  const abgl=sh==='HAUS'?bank('haus',c.k,'Haushaltskonto'):bank('giro',c.giro,'Girokonto')+bank('tg',c.tg,'Tagesgeld')+`<div class="bankrow"><span>ETF-Depot (Scalable)<small>${c.etfIst?'echter Depotwert eingetragen':'laut Plan '+eur(c.etf)+' (nur Einzahlungen)'}</small></span><label>Depotwert heute<input inputmode="decimal" data-etf="1" value="${c.etfIst?num(c.etf):''}" placeholder="${num(c.etf)}"></label></div>`;
  el.innerHTML=`<div class="card blk"><h2>${SHN[sh]} · ${ymName(month)}</h2>${fixBanner(sh,blk)}${gehInfo(sh,blk)}${groups}<div class="g2" style="margin-top:14px"><div>${sum}</div><div class="abglbox"><h3 style="margin-top:0">Monatsende: mit dem Konto abgleichen</h3>${abgl}<div class="note">Trag ein, was wirklich auf dem Konto ist. Die App bucht die Differenz als „${ABGL}“, damit der nächste Monat mit dem richtigen Stand startet. Leer lassen = kein Abgleich.</div></div></div></div>`;
}
$('#m-blocks').addEventListener('change',e=>{
  if(e.target.dataset.gehist){const val=parseNum(e.target.value);savePlan(month,d=>{const b=d[mWho]=d[mWho]||{};if(val==null)delete b.gehIst;else b.gehIst=r2(val);});return;}
  if(e.target.dataset.etf){const val=parseNum(e.target.value);savePlan(month,d=>{const b=d[mWho]=d[mWho]||{};if(val==null)delete b.etfIst;else b.etfIst=r2(val);});return;}
  const ak=e.target.dataset.abgl;if(ak){const c=CALC[month][mWho];const calc=ak==='haus'?c.k:ak==='giro'?c.giro:c.tg;const act=parseNum(e.target.value);
    savePlan(month,d=>{const b=d[mWho]=d[mWho]||{};const[out,inn]=ABG[ak];const base=calc-abglVal(b,ak);[out,inn].forEach(g=>{b[g]=(b[g]||[]).filter(x=>x.l!==ABGL);});
      if(act==null)return;const diff=r2(act-base);if(Math.abs(diff)<0.005)return;const g=diff>0?inn:out;b[g].push({l:ABGL,v:Math.abs(diff),fest:false});});return;}
  const r=e.target.closest('.er');if(!r)return;const g=r.dataset.g,i=+r.dataset.i,f=e.target.dataset.fld;
  savePlan(month,d=>{const b=d[mWho]=d[mWho]||{};const e2=b[g][i];if(!e2)return;
    if(f==='l')e2.l=e.target.value.trim();else{const v=parseNum(e.target.value);if(v==null&&/^giroausgleich$/i.test((e2.l||'').trim())&&g==='E'){e2.f='=GIROAUSGLEICH';e2.v=null;return;}delete e2.f;e2.v=v;if(e2.lk)Object.keys(b).forEach(gg=>{if(Array.isArray(b[gg]))b[gg].forEach(x=>{if(x.lk===e2.lk)x.v=v;});});}});});
$('#m-blocks').addEventListener('click',e=>{const pt=e.target.closest('[data-pau]');if(pt){const i=+pt.dataset.pau;savePlan(month,d=>{const x=d[mWho]?.C?.[i];if(x){if(x.p)delete x.p;else x.p=true;}});return;}const fx=e.target.closest('[data-fix]');if(fx){const i=+fx.dataset.fix;const cur=entryVal((S.plan[month]?.[mWho]?.E||[])[i],S.plan[month][mWho],mWho);const cc=CALC[month]?.[mWho];savePlan(month,d=>{const x=d[mWho]?.E?.[i];if(x){delete x.f;x.v=r2(cur);x.fix=TODAY;}if(cc)d[mWho].snap={am:TODAY,giro:r2(cc.giro),tg:r2(cc.tg)};});flash('ok','Giroausgleich festgeschrieben – ab jetzt siehst du Abweichungen in der Übersicht');return;}const au=e.target.closest('[data-auto]');if(au){const i=+au.dataset.auto;savePlan(month,d=>{const x=d[mWho]?.E?.[i];if(x){x.f='=GIROAUSGLEICH';x.v=null;delete x.fix;}if(d[mWho])delete d[mWho].snap;});return;}const a=e.target.closest('[data-add]');if(a){savePlan(month,d=>{const b=d[mWho]=d[mWho]||{};(b[a.dataset.add]=b[a.dataset.add]||[]).push({l:'',v:null});});setTimeout(()=>{const ins=$$(`#m-blocks .er[data-g="${a.dataset.add}"] input[data-fld="l"]`);ins.filter(x=>!x.value).at(-1)?.focus();},60);return;}
  const lk=e.target.closest('[data-lock]');if(lk){const k=lk.dataset.lock;UNL.has(k)?UNL.delete(k):UNL.add(k);rMonat();if(UNL.has(k))setTimeout(()=>$(`#m-blocks [data-lock="${k}"]`)?.closest('.er')?.querySelector('.amt')?.focus(),30);return;}
  const d=e.target.closest('[data-del]');if(d){const r=d.closest('.er');if(!d.dataset.armed){d.dataset.armed=1;d.textContent='✓';d.style.color='var(--bad)';setTimeout(()=>{d.dataset.armed='';d.textContent='×';d.style.color='';},2500);return;}
    savePlan(month,x=>{const blk=x[mWho];const e0=blk[r.dataset.g][+r.dataset.i];if(e0&&e0.lk){Object.keys(blk).forEach(g=>{if(Array.isArray(blk[g]))blk[g]=blk[g].filter(e=>e.lk!==e0.lk);});}else blk[r.dataset.g].splice(+r.dataset.i,1);});}});
/* Checkliste vor dem Monatsabschluss: zeigt, was noch offen ist – abschließen geht trotzdem */
function closeCheck(sh){const P=S.plan[month]||{};const blk=P[sh]||{};const c=CALC[month]?.[sh];const L=[];const ok=(t)=>L.push(['ok',t]),warn=(t)=>L.push(['warn',t]);
  if(sh==='HAUS'){const has=Math.abs(abglVal(blk,'haus'))>0.004||(blk.G||[]).concat(blk.I||[]).some(e=>e.l===ABGL);has?ok('Haushaltskonto mit dem echten Kontostand abgeglichen'):warn('Haushaltskonto noch nicht mit dem echten Kontostand abgeglichen (unten „Monatsende“)');
    const B=S.budget[month]||{e:[],s:[]};const ue=(B.e||[]).reduce((a,x)=>a+x.b,0),us=(B.s||[]).reduce((a,x)=>a+x.b,0);const re=essenBudget(month)-ue,rs=sonstBudget(month)-us;
    re<-0.5?warn(`Essen um ${eur(-re)} überzogen – ausgleichen (Betrag mit Minus) oder so lassen`):ok(`Essen: ${eur(re)} übrig`);rs<-0.5?warn(`Sonstiges um ${eur(-rs)} überzogen – ausgleichen oder so lassen`):ok(`Sonstiges: ${eur(rs)} übrig`);
    if(typeof fwList==='function'){const U=S.urlaub.e||[];const miss=fwList().filter(x=>x.ud&&x.ud.startsWith(month)&&!U.some(u=>u.fid===x.id));miss.length?warn(`${miss.length} Ferienwohnungs-Gutschrift${miss.length>1?'en':''} im Monat ohne Urlaubskonto-Eintrag (${miss.map(x=>dDE(x.ud).slice(0,5)).join(', ')})`):ok('Ferienwohnung: alle Gutschriften des Monats auf dem Urlaubskonto');}}
  else{['giro','tg'].forEach(k=>{const has=ABG[k].some(g=>(blk[g]||[]).some(e=>e.l===ABGL));const nm=k==='giro'?'Girokonto':'Tagesgeld';has?ok(`${nm} mit dem echten Kontostand abgeglichen`):warn(`${nm} noch nicht mit dem echten Kontostand abgeglichen (unten „Monatsende“) – ohne Abgleich startet der nächste Monat mit dem Planwert`);});
    const f=fixInfo(sh,blk);f?.fixed?ok('Giroausgleich festgeschrieben'):warn('Giroausgleich nicht festgeschrieben – beim Abschluss wird der aktuelle Wert eingefroren');
    const g=(blk.C||[]).filter(e=>e.l&&(e.v==null||e.v==='')&&!e.f&&!e._c);if(g.length)warn(`${g.length} Zeile${g.length>1?'n':''} ohne Betrag: ${g.map(e=>e.l).slice(0,3).join(', ')}`);
    if(blk.gehIst==null&&month<=CUR)warn('Echtes Gehalt nicht eingetragen – es gilt das geplante');}
  const d=bkAlt();d>14?warn(d>=999?'Noch nie gesichert – nach dem Abschluss unter Einstellungen → Sicherung speichern (die automatische Sicherung in der Datenbank kommt mit diesem Abschluss dazu)':`Letzte Sicherung vor ${d} Tagen – nach dem Abschluss sichern`):ok('Sicherung ist aktuell');
  const w=L.filter(x=>x[0]==='warn').length;return `<div class="chk"><b>${w?w+' Punkt'+(w>1?'e':'')+' offen':'Alles erledigt'}</b> – abschließen geht trotzdem; die Punkte lassen sich auch danach noch ändern (Abschluss aufheben).<ul>${L.map(([k,t])=>`<li class="${k}">${k==='ok'?'✅':'⚠️'} ${t}</li>`).join('')}</ul></div>`;}
$('#m-close').onclick=()=>{const P=S.plan[month];if(!P)return;const sh=mWho;
  const stripCm=b=>{if(b)Object.keys(b).forEach(g=>{if(Array.isArray(b[g]))b[g]=b[g].filter(e=>!e.cm);});};
  if(bzu(P,sh)){savePlan(month,d=>{if(d.zu){const am=d.zuAm;SH.forEach(x=>{if(x!==sh&&d[x]){d[x].zu=true;d[x].zuAm=d[x].zuAm||am;}});if(d.gold&&d.TILL&&sh!=='TILL')d.TILL.gold=d.TILL.gold||d.gold;delete d.zu;delete d.zuAm;delete d.gold;}
    const b=d[sh];if(b){delete b.zu;delete b.zuAm;delete b.gold;stripCm(b);}});return;}
  const bt=$('#m-close');if(bt.dataset.armed!==sh){bt.dataset.armed=sh;bt.textContent=`${BLN[sh]} wirklich abschließen? Nochmal tippen`;bt.classList.add('danger');const ck=$('#m-check');ck.innerHTML=closeCheck(sh);ck.hidden=false;clearTimeout(bt._t);bt._t=setTimeout(()=>{bt.dataset.armed='';bt.classList.remove('danger');ck.hidden=true;renderMonthBar();},15000);return;}
  bt.dataset.armed='';bt.classList.remove('danger');$('#m-check').hidden=true;
  const CST=[];useYm(month);{const b=P[sh];if(b)Object.keys(b).forEach(g=>{if(Array.isArray(b[g]))b[g].filter(e=>e._c).forEach(e=>CST.push([g,{l:e.l,v:r2(entryVal(e,b,sh)),fest:true,cm:1}]));});}
  savePlan(month,d=>{const b=d[sh]=d[sh]||{};CST.forEach(([g,e])=>{(b[g]=b[g]||[]).push(e);});
    Object.keys(b).forEach(g=>{if(!Array.isArray(b[g]))return;b[g].forEach(e=>{if(e.f){e.v=r2(isPausch(e)?pauschBase(e,b,sh):entryVal(e,b,sh));if(e.f==='=GIROAUSGLEICH')e.fix=TODAY;delete e.f;}});});
    b.zu=true;b.zuAm=TODAY;if(sh==='TILL')b.gold=gn('goldpreis');
    if(SH.every(x=>d[x]?.zu)){d.zu=true;d.zuAm=TODAY;d.gold=d.TILL?.gold||gn('goldpreis');setTimeout(()=>autoBackup(month),1500);}});
  flash('ok',`${BLN[sh]} für ${ymName(month)} abgeschlossen`);};

/* ---------- Schnelleingabe ---------- */
const BER={giro_aus:['C','Girokonto Ausgabe'],giro_ein:['E','Girokonto Eingang'],tg_raus:['I','vom Tagesgeld genommen'],tg_kauf:['I','vom Tagesgeld für einen Kauf (Tagesgeld → Giro → Ausgabe)'],tg_rein:['K','aufs Tagesgeld'],haus_ab:['G','Abbuchung Haushaltskonto'],haus_ein:['I','Einzahlung Haushaltskonto']};
const PSH={Till:'TILL',Patrick:'PATRICK',Haus:'HAUS'};
function qContext(){
  const P=S.plan[month]||{};const lines=[];
  SH.forEach(sh=>{const b=P[sh]||{};GR[sh].forEach(([g,t])=>{(b[g]||[]).forEach(e=>lines.push(`${SHN[sh]} | ${t} | ${e.l} | ${num(entryVal(e,b,sh))}`));});});
  const B=S.budget[month]||{e:[],s:[]};
  return `Monat: ${ymName(month)} (${month}). Heute: ${TODAY}.
Budget Essen ${essenBudget(month)} €, verbraucht ${num((B.e||[]).reduce((a,x)=>a+x.b,0))} €. Budget Sonstiges ${sonstBudget(month)} €, verbraucht ${num((B.s||[]).reduce((a,x)=>a+x.b,0))} €.
Einträge im Plan (Person | Bereich | Bezeichnung | Betrag):
${lines.join('\n')}
Ferienwohnung-Buchungen (Anreise | Abreise | Plattform | Erwachsene | Kinder | Kontonetto | bar extra):
${(typeof fwList==='function'?fwList():[]).filter(b=>b.a>=dAdd(TODAY,-90)).map(b=>`${b.a} | ${b.ab} | ${b.p} | ${b.erw??''} | ${b.ki??''} | ${num(b.netto)} | ${b.bar?num(b.bar):''}`).join('\n')}
Grundbeträge (key | Bezeichnung | Wert):
${S.grund.items.map(i=>`${i.k} | ${i.l} | ${i.v}`).join('\n')}
Kredite (feld | Wert): ${KFELDER.map(([f,l])=>`${f} | ${l} | ${f.split('.').reduce((o,x)=>o?.[x],K())??''}`).join('; ')}
Stromkonto je Monat (monat | Einzahlung | Verbrauch € | Vergütung €): ${Object.entries(S.strom.m||{}).slice(0,14).map(([m,o])=>`${m} | ${o.spar??''} | ${o.verbrauch??''} | ${o.verg??''}`).join('; ')}`;
}
function qPrompt(text){return `Du hilfst Till und Patrick, ihr Haushaltsbuch zu führen. Übersetze ihre Nachricht in Änderungen.
${qContext()}

Nachricht: """${text.slice(0,2000)}"""

Heute: ${new Date().toLocaleDateString('de-DE')}. Aktuell geöffneter Monat: ${month}.
Antworte NUR mit JSON: {"aktionen":[...],"rueckfrage":null|"kurze Frage auf Deutsch"}
Mögliche Aktionen:
1) Einkauf aus den Budgets Essen oder Sonstiges ("Haus, sonst."): {"art":"budget","topf":"essen"|"sonst","betrag":Zahl,"notiz":"wofür","wer":"Till"|"Patrick"|"","monat":"JJJJ-MM"|null}  – Lebensmittel/Einkauf/Supermarkt = essen; Amazon, Drogerie, Baumarkt, Kleinkram fürs Haus = sonst. WICHTIG: "Sonstiges", "sonst.", "Sonstiges-Pauschale", "Haus, sonst." oder "Essen" in der Nachricht meint IMMER diesen Budget-Topf (art budget) – nie einen Eintrag im Monatsplan und keine Rückfrage dazu. monat = der genannte Monat (ohne Jahr: das nächstliegende, also ${month.slice(0,4)}), sonst null.
   Beispiel: "40 euro im Oktober von sonstiges abziehen für Wassermelder" → {"art":"budget","topf":"sonst","betrag":40,"notiz":"Wassermelder","wer":"","monat":"${month.slice(0,4)}-10"}
   Wird Geld in einen Topf zurückgelegt oder eine Überziehung ausgeglichen (z. B. "hat 2,89 überwiesen, um Sonstiges auszugleichen"), dann betrag NEGATIV (-2.89); das erhöht den Rest im Topf.
2) Eintrag im Monatsplan: {"art":"eintrag","person":"Till"|"Patrick"|"Haus","monat":"JJJJ-MM","bereich":"giro_aus"|"giro_ein"|"tg_kauf"|"tg_raus"|"tg_rein"|"haus_ab"|"haus_ein","bezeichnung":"...","betrag":Zahl,"modus":"neu"|"aendern"|"loeschen","pauschale":true|false}
   - pauschale=true bei persönlichen Ausgaben vom Girokonto, die aus der monatlichen Pauschale bezahlt werden (Restaurant, Essen gehen, Klamotten, Schwimmen, Kleinkram für sich) – dann wird es von der Pauschale abgezogen statt zusätzlich gezählt.
   - Geld vom Tagesgeld genommen, um etwas zu kaufen/zu bezahlen (z. B. "20 € vom Tagesgeld für ein Kopfkissen") = tg_kauf, bezeichnung = was gekauft wurde. Nur reine Umbuchung ohne Kauf = tg_raus. Ausgaben vom Girokonto = giro_aus. Gemeinsame Hauskosten = person "Haus", bereich haus_ab.
   - Bei "aendern"/"loeschen" die Bezeichnung genau so schreiben, wie sie im Plan steht.
   - monat: der genannte Monat, sonst ${month}.
3) Dauerhafte Änderung eines Grundbetrags (z. B. "Versicherung kostet ab jetzt 12 €", "mein Gehalt ist ab Februar 2027 2.900 €"): {"art":"grund","key":"key aus der Liste","wert":Zahl,"ab":"JJJJ-MM"|null}  – ab = Monat, ab dem der neue Wert gilt (bei einem Datum wie 2.2.2027 der Monat 2027-02); null = sofort für alle offenen Monate.
Eine Überweisung von einem privaten Konto aufs gemeinsame Konto zum Ausgleich eines Topfs: NUR die budget-Aktion mit negativem Betrag und wer = der Überweisende (die App zieht es dann automatisch bei dessen Girokonto ab; keine zusätzliche eintrag-Aktion).
4) Eine bestehende Ferienwohnungs-Buchung ändern (z. B. mehr Gäste, zusätzlich bar bezahlt, Abreise verschoben, storniert): {"art":"buchung","anreise":"JJJJ-MM-TT","plattform":"Booking.com"|"Airbnb"|"Privat","erwachsene":Zahl|null,"kinder":Zahl|null,"abreise":"JJJJ-MM-TT"|null,"bar":Zahl|null,"storniert":true|false,"storno_bezahlt":true|false,"bar_aufs_urlaubskonto":true|"voll"|false|null,"notiz":"kurze Notiz"}
   - storno_bezahlt=true (und storniert=false), wenn die Gäste storniert haben, das Geld aber trotzdem kommt (nicht mehr kostenlos stornierbar).
   - bar_aufs_urlaubskonto: true = Bargeld wie die Auszahlung aufteilen (Spartopf, Urlaubskonto); "voll" = Bargeld komplett aufs Urlaubskonto ohne Spartopf-Abzug; false, wenn der Barbetrag NICHT aufs Urlaubskonto gerechnet werden soll.
   - anreise und plattform genau aus der Buchungsliste oben. bar = Gesamtbetrag, der zusätzlich bar vor Ort gezahlt wird. Nur Felder füllen, die sich ändern, sonst null.
5) Kreditwerte ändern (z. B. "Sparda-Restschuld um 1 € ändern", "Restschuld Sparda ist jetzt 318.000", "Mutter-Rate 900 €"): {"art":"kredit","feld":"feld aus der Kreditliste","wert":Zahl|null,"um":Zahl|null}  – wert = neuer Wert; um = Änderung um diesen Betrag (+ oder −), wenn nur eine Änderung genannt ist. "um 1 € ändern" ohne Richtung: um=-1 bei Restschuld (sinkt), sonst Rückfrage.
6) Sondertilgung vormerken: {"art":"sondertilgung","kredit":"sparda"|"ing","monat":"JJJJ-MM","betrag":Zahl}
7) Stromkonto: {"art":"strom","monat":"JJJJ-MM","feld":"spar"|"verbrauch"|"ist"|"verg","wert":Zahl}  – spar = Einzahlung aufs Stromkonto, verbrauch = geplante Stromkosten in €, ist = tatsächliche Stromkosten laut Abrechnung, verg = Einspeisevergütung in €.
8) Tatsächliches Gehalt in EINEM Monat (z. B. "Patrick hat im Oktober 2.610 € bekommen", "Gehalt Patrick diesen Monat 2.540") – NICHT dauerhaft, dafür art grund: {"art":"gehalt","person":"Till"|"Patrick","monat":"JJJJ-MM","wert":Zahl|null}  – null = wieder das geplante Gehalt.
9) Neuer Bescheid für Wasser oder Grundsteuer (z. B. "Wasserbescheid 2027: Februar 297 €, danach 280 €"): {"art":"bescheid","posten":"wasser"|"grundsteuer","jahr":JJJJ,"februar":Zahl,"rate":Zahl}  – februar = Betrag am 15.02., rate = Betrag je Rate im Mai, August, November.
10) Neuer Jahresbeitrag für Wohngebäudeversicherung, Hausratversicherung, Haftpflichtversicherung, Abfallgebühr oder ADAC (z. B. "Wohngebäudeversicherung kostet ab April 2027 2.000 €"): {"art":"beitrag","posten":"wohngebaeude"|"hausrat"|"haftpflicht"|"abfall"|"adac","jahresbetrag":Zahl,"faellig":"JJJJ-MM"}  – faellig = Monat der Zahlung; ohne Angabe null.
12) Restschuld der Sparda laut Bank/Tilgungsplan in einem bestimmten Monat (z. B. "Sparda Restschuld Dezember 2027 laut Tilgungsplan 306.000"): {"art":"sparda_bank","monat":"JJJJ-MM","restschuld":Zahl,"rate":Zahl|null}
11) Urlaubskonto (Geld abheben/abrufen/entnehmen oder einzahlen): {"art":"urlaub","datum":"JJJJ-MM-TT","betrag":Zahl,"grund":"wofür"}  – Abheben/Entnahme = NEGATIV, Einzahlung = positiv; datum ohne Angabe = heute (${TODAY}).
Beträge als Zahl mit Punkt. Nichts erfinden. Im Zweifel die wahrscheinlichste Aktion wählen – der Nutzer sieht vor dem Speichern eine Vorschau und bestätigt selbst. Nur wenn Betrag oder Ziel wirklich fehlen, eine rueckfrage stellen und aktionen leer lassen.`;}
let qActs=[];
function qDescribe(a){
  if(a.art==='budget')return (/^\d{4}-\d{2}$/.test(a.monat||'')&&a.monat!==month?ymShort(a.monat)+' · ':'')+(+a.betrag<0?`${a.topf==='essen'?'Essen':'Sonstiges'}: ${eur(-a.betrag)} ausgleichen (kommt wieder dazu)${a.notiz?' ('+esc(a.notiz)+')':''}${a.wer?' · '+esc(a.wer)+(S.plan[month]?' (wird bei '+esc(a.wer)+' im Girokonto abgezogen)':''):''}`:`${a.topf==='essen'?'Essen':'Sonstiges'}: ${eur(a.betrag)} abziehen${a.notiz?' ('+esc(a.notiz)+')':''}${a.wer?' · '+esc(a.wer):''}`);
  if(a.art==='eintrag'){const b=BER[a.bereich];const verb=a.modus==='loeschen'?'löschen':a.modus==='aendern'?'ändern auf':'neu';return `${esc(a.person)} · ${ymShort(a.monat||month)} · ${b?b[1]:esc(a.bereich)}: „${esc(a.bezeichnung)}“ ${verb}${a.modus==='loeschen'?'':' '+eur(a.betrag)}${a.pauschale?' (aus der Pauschale)':''}`;}
  if(a.art==='buchung'){const ch=[];if(a.stoBez||a.storno_bezahlt)ch.push('storniert, Gast zahlt trotzdem (Geld zählt, kein Gästebeitrag, keine Belegung)');else if(a.storniert)ch.push('storniert');if(a.erwachsene!=null)ch.push(a.erwachsene+' Erwachsene');if(a.kinder!=null)ch.push(a.kinder+(+a.kinder===1?' Kind':' Kinder'));if(a.abreise)ch.push('Abreise '+dDE(a.abreise));if(a.bar!=null)ch.push(eur(a.bar)+' bar vor Ort');{const bu=a.barUrlaub??a.bar_aufs_urlaubskonto;if(bu===false)ch.push('Bargeld nicht aufs Urlaubskonto');else if(bu==='voll')ch.push('Bargeld komplett aufs Urlaubskonto');else if(bu===true)ch.push('Bargeld wie Auszahlung aufteilen');}if(a.notiz)ch.push('Notiz: '+esc(a.notiz));return `Buchung ${esc(a.plattform||'')} ab ${dDE(a.anreise)}: ${ch.join(', ')||'keine Änderung'}`;}
  if(a.art==='grund'){const it=S.grund.items.find(i=>i.k===a.key);return `Grundbetrag „${esc(it?.l||a.key)}“: ${it?eur(gv(a.key,a.ab||month))+' → ':''}${eur(a.wert)} ${a.ab?'ab '+ymName(a.ab):'(gilt ab sofort für alle offenen Monate)'}`;}
  if(a.art==='kredit'){const f=KFELDER.find(x=>x[0]===a.feld);const cur=String(a.feld||'').split('.').reduce((o,x)=>o?.[x],K());const nv=kNeu(a);return `${esc(f?f[1]:a.feld)}: ${fmtK2(a.feld,cur)} → <b>${fmtK2(a.feld,nv)}</b>`;}
  if(a.art==='sondertilgung')return `Sondertilgung ${a.kredit==='ing'?'ING':'Sparda'} ${ymName(a.monat)}: ${eur(a.betrag)}`;
  if(a.art==='beitrag'){const k={wohngebaeude:'h_wohngeb',hausrat:'h_hausrat',haftpflicht:'h_haftpfl',abfall:'h_abfall',adac:'h_adac'}[a.posten];return `${k?BSJ[k][0]:esc(a.posten)}: neuer Jahresbeitrag ${eur(+a.jahresbetrag)} ab ${ymName(a.faellig||(k?bjDue(k):CUR))}`;}
  if(a.art==='bescheid')return `${a.posten==='grundsteuer'?'Grundsteuer':'Wasser'}-Bescheid ${a.jahr}: Februar ${eur(+a.februar)}, Mai/Aug/Nov je ${eur(+a.rate)}`;
  if(a.art==='gehalt')return `${esc(a.person)}: echtes Gehalt ${ymName(a.monat)} ${a.wert==null?'zurück auf geplant':eur(+a.wert)}`;
  if(a.art==='strom'){const L={spar:'Einzahlung',verbrauch:'Verbrauch geplant €',ist:'Verbrauch echt €',verg:'Vergütung €'};return `Stromkonto ${ymName(a.monat)}: ${L[a.feld]||esc(a.feld)} ${eur(S.strom.m?.[a.monat]?.[a.feld]??0)} → <b>${eur(a.wert)}</b>`;}
  if(a.art==='sparda_bank')return `Sparda laut Bank: Restschuld ${ymName(a.monat)} ${eur(+a.restschuld)}${a.rate?' · Rate ab dann '+eur(+a.rate):''}`;
  if(a.art==='kwas')return `Nur ausrechnen: ${eur(+a.betrag,0)} Sondertilgung ${a.kredit==='ing'?'ING':'Sparda'} am ${dDE(a.datum)} – öffnet den Rechner im Reiter Kredite (nichts wird gespeichert)`;
  if(a.art==='urlaub')return `Urlaubskonto ${dDE(a.datum||TODAY)}: <b class="num ${+a.betrag<0?'neg':'pos'}">${+a.betrag<0?'−':'+'}${eur(Math.abs(+a.betrag))}</b> ${+a.betrag<0?'abheben':'einzahlen'}${a.grund?' ('+esc(a.grund)+')':''}`;
  return esc(JSON.stringify(a));
}
const KFELDER=[['sparda.stand','Sparda Restschuld (Stand)'],['sparda.standNach','Sparda Stand nach Monat (JJJJ-MM)'],['sparda.rate','Sparda Monatsrate'],['sparda.zins','Sparda Zinssatz %'],['sparda.szenario.aktiv','Szenario Mutter einrechnen (true/false)'],['sparda.szenario.an','Szenario Mutter ab Monat'],['sparda.szenario.betrag','Szenario Mutter Betrag'],['sparda.szenario.rate','Rate an Mutter monatlich'],['bauspar.saldo','Bausparguthaben'],['bauspar.monat','Bausparen monatlich'],['bauspar.summe','Bausparsumme'],['ing.betrag','ING Kreditbetrag'],['ing.zins','ING Zinssatz %']];
function kNeu(a){const cur=String(a.feld||'').split('.').reduce((o,x)=>o?.[x],K());if(a.um!=null&&a.wert==null)return r2((+cur||0)+(+a.um));return a.wert;}
const fmtK2=(f,v)=>v==null||v===''?'–':typeof v==='boolean'?(v?'an':'aus'):/zins/.test(f)?num(v)+' %':/an$|standNach/.test(f)?esc(String(v)):eur(v);
async function qApply(list){let ok=0;const skip=[];
  for(const a of list){
    if(a.art==='budget'){await addBudget(a.topf==='essen'?'e':'s',+a.betrag,a.notiz||(+a.betrag<0?'Ausgleich':''),a.wer,/^\d{4}-\d{2}$/.test(a.monat||'')?a.monat:month);ok++;}
    else if(a.art==='eintrag'){const sh=PSH[a.person];const b=BER[a.bereich];if(!sh||!b){skip.push(qDescribe(a));continue;}const g=(sh==='HAUS')?(a.bereich==='haus_ein'?'I':'G'):b[0];const ym=a.monat||month;
      if(!S.plan[ym]){skip.push(`${qDescribe(a)} – ${ymName(ym)} liegt vor dem Planbeginn (Oktober 2026)`);continue;}ok++;
      await savePlan(ym,d=>{const blk=d[sh]=d[sh]||{};const L=blk[g]=blk[g]||[];const key=String(a.bezeichnung||'').trim().toLowerCase();
        const idx=L.findIndex(e=>(e.l||'').trim().toLowerCase()===key);const idx2=idx>=0?idx:L.findIndex(e=>key&&(e.l||'').toLowerCase().includes(key));
        if(a.modus==='loeschen'){if(idx2>=0)L.splice(idx2,1);return;}
        if(a.modus==='aendern'&&idx2>=0){delete L[idx2].f;L[idx2].v=r2(a.betrag);return;}
        const put=(LL,ne)=>{const em=LL.findIndex(e=>!e.l&&(e.v==null));if(em>=0)LL[em]=ne;else if(LL.length<15)LL.push(ne);};
        if(a.bereich==='tg_kauf'&&sh!=='HAUS'){const lk='k'+uid();const bz=a.bezeichnung;put(L,{l:bz,v:r2(a.betrag),lk});put(blk.E=blk.E||[],{l:'vom Tagesgeld: '+bz,v:r2(a.betrag),lk,fest:false});put(blk.C=blk.C||[],{l:bz,v:r2(a.betrag),lk,fest:false});return;}
        put(L,{l:a.bezeichnung,v:r2(a.betrag),...(a.pauschale&&g==='C'&&sh!=='HAUS'?{p:true}:{})});});}
    else if(a.art==='buchung'){const r=await fwUpdate({a:a.anreise,p:a.plattform},{erw:a.erwachsene,ki:a.kinder,ab:a.abreise,bar:a.bar==null?undefined:a.bar,notiz:a.notiz||undefined,storniert:!!a.storniert&&!(a.stoBez||a.storno_bezahlt),barUrlaub:a.barUrlaub??a.bar_aufs_urlaubskonto,...(a.stoBez||a.storno_bezahlt?{stoBez:true}:{})});if(r)ok++;else skip.push(qDescribe(a)+' – Buchung nicht gefunden');}
    else if(a.art==='grund'){await setGrund(a.key,+a.wert,a.ab||null);ok++;}
    else if(a.art==='kredit'){if(!KFELDER.some(x=>x[0]===a.feld)){skip.push(qDescribe(a));continue;}let v=kNeu(a);if(/aktiv/.test(a.feld))v=!!v;else if(!/an$|standNach/.test(a.feld))v=+v;await setK(a.feld,v);ok++;}
    else if(a.art==='sondertilgung'){const k=a.kredit==='ing'?'ing':'sparda';const l=[...(K()[k].sonder||[]),{ym:a.monat,b:+a.betrag}].sort((x,y)=>x.ym.localeCompare(y.ym));await setK(k+'.sonder',l);ok++;}
    else if(a.art==='beitrag'){const k={wohngebaeude:'h_wohngeb',hausrat:'h_hausrat',haftpflicht:'h_haftpfl',abfall:'h_abfall',adac:'h_adac'}[a.posten];if(!k||a.jahresbetrag==null){skip.push(qDescribe(a));continue;}const ab=a.faellig||bjDue(k);const items=structuredClone(S.grund.items);const it=items.find(i=>i.k===k);it.bsch={...(it.bsch||{}),[ab.slice(0,4)]:{j:r2(+a.jahresbetrag),ab,am:TODAY}};S.grund={items};render();await save('config/grund',{items});ok++;}
    else if(a.art==='bescheid'){const k=a.posten==='grundsteuer'?'h_grundst':'h_wasser';if(!(+a.jahr>2000)||a.februar==null||a.rate==null){skip.push(qDescribe(a));continue;}const items=structuredClone(S.grund.items);const it=items.find(i=>i.k===k);it.bsch={...(it.bsch||{}),[+a.jahr]:{f:r2(+a.februar),r:r2(+a.rate),am:TODAY}};S.grund={items};render();await save('config/grund',{items});ok++;}
    else if(a.art==='gehalt'){const sh=PSH[a.person];if(!sh||sh==='HAUS'||!S.plan[a.monat]){skip.push(qDescribe(a));continue;}await savePlan(a.monat,d=>{const b=d[sh]=d[sh]||{};if(a.wert==null)delete b.gehIst;else b.gehIst=r2(+a.wert);});ok++;}
    else if(a.art==='sparda_bank'){if(!/^\d{4}-\d{2}$/.test(a.monat||'')||a.restschuld==null){skip.push(qDescribe(a));continue;}const l=(K().sparda.bank||[]).filter(x=>x.ym!==a.monat);l.push({ym:a.monat,st:r2(+a.restschuld),...(a.rate?{rate:r2(+a.rate)}:{}),am:TODAY});l.sort((x,y)=>x.ym.localeCompare(y.ym));await setK('sparda.bank',l);ok++;}
    else if(a.art==='kwas'){$('#kw-k').value=a.kredit;$('#kw-b').value=num(+a.betrag);$('#kw-d').value=a.datum;showTab('kredite');try{history.replaceState(null,'','#kredite')}catch(_){}render();setTimeout(()=>{try{rKWas();$('#k-was').scrollIntoView({block:'start'});}catch(_){}},80);ok++;}
    else if(a.art==='urlaub'){if(!(+a.betrag)){skip.push(qDescribe(a));continue;}await saveUrlaub(u=>{u.e.push({d:/^\d{4}-\d{2}-\d{2}$/.test(a.datum||'')?a.datum:TODAY,b:r2(+a.betrag),t:a.grund||(+a.betrag<0?'Entnahme':'Einzahlung')});});ok++;}
    else if(a.art==='strom'){if(!['spar','verbrauch','ist','verg'].includes(a.feld)){skip.push(qDescribe(a));continue;}const d=structuredClone(S.strom);d.m=d.m||{};d.m[a.monat]={...(d.m[a.monat]||{}),[a.feld]:+a.wert};S.strom=d;render();await save('config/strom',d);ok++;}
  }
  return {ok,skip};
}
/* ---------- Befehle ohne KI erkennen (zuerst das Programm, nur im Notfall die KI) ---------- */
const QMN=['januar','februar','märz','april','mai','juni','juli','august','september','oktober','november','dezember'];
const QMRX='(januar|jan|februar|feb|märz|maerz|mär|april|apr|mai|juni|jun|juli|jul|august|aug|september|sept|sep|oktober|okt|november|nov|dezember|dez)\\.?';
const qMi=w=>{w=w.replace('.','').replace('maerz','märz');return QMN.findIndex(m=>m===w||m.startsWith(w)&&w.length>=3);};
const qPn=s=>{s=String(s).trim().replace(/,-$/,'');if(/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s))s=s.replace(/\./g,'');return parseNum(s);};
function qMe(){const m=window.__me||'';return /till/i.test(m)?'Till':/patrick|pati/i.test(m)?'Patrick':'';}
function qPerson(t){return /\bpatrick\b|\bpati\b/.test(t)?'Patrick':/\btill\b/.test(t)?'Till':/\b(ich|mein|meine|meinem|meinen|mir|mich)\b/.test(t)?qMe():'';}
function qYmFor(mi,t){const yy=t.match(/\b(20\d\d)\b/);if(yy)return `${yy[1]}-${String(mi+1).padStart(2,'0')}`;const[y,m]=CUR.split('-').map(Number);let Y=y;if(mi+1-m<-6)Y++;else if(mi+1-m>6)Y--;return `${Y}-${String(mi+1).padStart(2,'0')}`;}
function qMonth(t){if(/nächste[nrm]? monat/.test(t)){const[y,m]=month.split('-').map(Number);return m===12?`${y+1}-01`:`${y}-${String(m+1).padStart(2,'0')}`;}
  if(/(diese[nrm]?|aktuelle[nrm]?) monat/.test(t))return month;if(/letzte[nrm]? monat|vormonat/.test(t)){const[y,m]=month.split('-').map(Number);return m===1?`${y-1}-12`:`${y}-${String(m-1).padStart(2,'0')}`;}
  const r=t.match(new RegExp('(?:^|[^\\d.])(?:\\d{1,2}\\. ?)?'+QMRX+'(?=[\\s,.!?]|$)'));if(r){const mi=qMi(r[1]);if(mi>=0)return qYmFor(mi,t);}return null;}
function qDate(t){if(/\bvorgestern\b/.test(t))return dAdd(TODAY,-2);if(/\bgestern\b/.test(t))return dAdd(TODAY,-1);if(/\bübermorgen\b/.test(t))return dAdd(TODAY,2);if(/\bmorgen\b/.test(t))return dAdd(TODAY,1);if(/\bheute\b/.test(t))return TODAY;
  let r=t.match(/\b(\d{1,2})\.(\d{1,2})\.(\d{2,4})?/);if(r){const y=r[3]?(r[3].length===2?'20'+r[3]:r[3]):qYmFor(+r[2]-1,t).slice(0,4);return `${y}-${r[2].padStart(2,'0')}-${r[1].padStart(2,'0')}`;}
  r=t.match(new RegExp('\\b(\\d{1,2})\\. ?'+QMRX+'(?: (20\\d\\d))?'));if(r){const mi=qMi(r[2]);if(mi>=0){const ym=r[3]?`${r[3]}-${String(mi+1).padStart(2,'0')}`:qYmFor(mi,t);return `${ym}-${r[1].padStart(2,'0')}`;}}return null;}
function qDates(t){const out=[];const re=new RegExp('\\b(\\d{1,2})\\.(\\d{1,2})\\.(\\d{2,4})?|\\b(\\d{1,2})\\. ?'+QMRX,'g');let m;while((m=re.exec(t))){out.push(qDate(m[0]));}return out.filter(Boolean);}
/* Beträge: mit €/Euro bevorzugt, sonst eine einzelne Zahl, die kein Datum/Jahr/keine Anzahl ist */
function qAmts(t,bare){const c=t.replace(new RegExp('\\b\\d{1,2}\\.\\d{1,2}\\.(\\d{2,4})?|\\b\\d{1,2}\\. ?'+QMRX,'g'),' ').replace(/\b20\d\d\b/g,' ');
  const e=[...c.matchAll(/(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)(?:,-)? ?(?:€|euro\b|eur\b)/g)].map(m=>qPn(m[1]));if(e.length||!bare)return e;
  return [...c.matchAll(/(?:^|\s)(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:,\d{1,2})?)(?!\s*(?:erwachsene|kinder|kind|gäste|personen|nächte|%|x\b))(?=[\s,.!?]|$)/g)].map(m=>qPn(m[1]));}
const qAmt=(t,bare)=>{const a=qAmts(t,bare);return a.length===1&&a[0]>0?a[0]:null;};
function qWhy(tx){const m=tx.match(/\b(?:f(?:ü|ue)r|wegen|grund:?|zweck:?)\s+(.+?)\s*[.!]?$/i);if(!m)return '';
  let s=m[1].replace(new RegExp('\\s*\\b(?:am|im|vom|zum|ab)?\\s*(?:\\d{1,2}\\.\\d{1,2}\\.(?:\\d{2,4})?|\\d{1,2}\\. ?'+QMRX+'(?: 20\\d\\d)?|'+QMRX+'(?: 20\\d\\d)?|heute|gestern|vorgestern|morgen|nächste[nrm]? monat|diese[nrm]? monat)\\b','ig'),' ')
    .replace(/\s*\b(abziehen|abgezogen|ausgegeben|gekauft|bezahlt|abheben|abgehoben|abrufen|abgerufen|entnehmen|entnommen|genommen|einzahlen|eingezahlt|buchen|eintragen)\b\s*/ig,' ')
    .replace(/\s*\b(vom|aus dem|von dem|aufs|auf das)\s+(urlaubskonto|tagesgeld|urlaubskasse)\b/ig,' ').replace(/\s+/g,' ').replace(/[\s,.]+$/,'').trim();
  return s?s.charAt(0).toUpperCase()+s.slice(1):'';}
function qParse1(tx){const t=' '+tx.toLowerCase().replace(/\s+/g,' ').replace(/[„“"]/g,'')+' ';
  // 1) Urlaubskonto
  if(/urlaubs?konto|urlaubskasse|urlaubsgeld|urlaubstopf/.test(t)){const b=qAmt(t);if(b==null)return null;
    const minus=/ab(ge)?hoben|abheben|abrufen|abgerufen|entnehm|entnommen|genommen|\braus\b|ausgegeben|bezahlt|runter|\bvom urlaub|aus dem urlaub|von dem urlaub|\babbuch|\babzieh/.test(t),plus=/einzahl|eingezahlt|\bdrauf|aufs urlaub|auf das urlaub|gutschrift|gutgeschrieben|zurückgelegt|zurück ?gezahlt|dazu/.test(t);
    if(minus===plus)return null;return {art:'urlaub',datum:qDate(t)||TODAY,betrag:minus?-b:b,grund:qWhy(tx)};}
  // 2) Sondertilgung (Frage „was bringt …“ → nur Rechner öffnen)
  if(/sondertilgung/.test(t)&&/was bringt|was würde|lohnt|wie viel (spar|bring)|wieviel (spar|bring)|\?/.test(t)){const k=/\bing\b/.test(t)?'ing':'sparda';const b=qAmt(t,true);if(b==null)return null;const d=qDate(t);return {art:'kwas',kredit:k,betrag:b,datum:d||(qMonth(t)?qMonth(t)+'-15':TODAY)};}
  if(/sondertilgung/.test(t)){const k=/\bing\b/.test(t)?'ing':/sparda/.test(t)?'sparda':null;const b=qAmt(t,true);const ym=qMonth(t);if(!k||b==null||!ym)return null;return {art:'sondertilgung',kredit:k,monat:ym,betrag:b};}
  // 3) Restschuld/Kredit
  if(/restschuld|kreditstand/.test(t)&&/sparda/.test(t)&&!/\bum\b/.test(t)){const b=qAmt(t.replace(/(neue |monats)?rate\D{0,12}?\d[\d.,]*( ?(€|euro))?/,' '),true);if(b==null)return null;const ym=qMonth(t)||(qDate(t)||'').slice(0,7)||null;if(ym&&!/jetzt|heute|aktuell/.test(t)){const r=t.match(/rate\D{0,12}?(\d[\d.,]*)/);return {art:'sparda_bank',monat:ym,restschuld:b,rate:r?qPn(r[1].replace(/[.,]$/,'')):null};}return {art:'kredit',feld:'sparda.stand',wert:b,um:null};}
  // 4) Bescheid Wasser/Grundsteuer
  if(/bescheid/.test(t)&&/wasser|grundsteuer/.test(t)){const y=t.match(/\b(20\d\d)\b/);const f=t.match(/februar\D{0,12}?(\d[\d.,]*)/);const r=t.match(/(?:rate|danach|mai|je|dann)\D{0,20}?(\d[\d.,]*)/);if(!y||!f||!r)return null;
    return {art:'bescheid',posten:/grundsteuer/.test(t)?'grundsteuer':'wasser',jahr:+y[1],februar:qPn(f[1].replace(/[.,]$/,'')),rate:qPn(r[1].replace(/[.,]$/,''))};}
  // 5) Jahresbeiträge
  {const P=[['wohngeb','wohngebaeude'],['hausrat','hausrat'],['haftpflicht','haftpflicht'],['abfall','abfall'],['müll','abfall'],['adac','adac']].find(([w])=>t.includes(w));
    if(P&&/kostet|beitrag|teurer|günstiger|jahr/.test(t)){const b=qAmt(t,true);if(b==null)return null;return {art:'beitrag',posten:P[1],jahresbetrag:b,faellig:qMonth(t)};}}
  // 6) Strom
  if(/strom|einspeis/.test(t)&&!/anteil/.test(t)){const b=qAmt(t,true);const ym=qMonth(t)||month;if(b==null)return null;
    const f=/einspeis|vergütung/.test(t)?'verg':/stromkonto|eingezahlt|einzahl|sparen|zurückgelegt/.test(t)?'spar':/geplant|plan|abschlag/.test(t)?'verbrauch':/rechnung|abrechnung|kosten|verbrauch|gekostet|bezahlt/.test(t)?'ist':null;if(!f)return null;
    return {art:'strom',monat:ym,feld:f,wert:b};}
  // 7) Ferienwohnung: bestehende Buchung ändern
  if(/buchung|gäste|gast\b|airbnb|booking|ferienwohnung|fewo/.test(t)&&/storn|bar\b|bar bezahlt|erwachsene|kinder|kind\b|abreise|verläng|früher ab|reisen .* ab/.test(t)&&!/neue buchung/.test(t)){
    const ds=qDates(t);if(!ds.length)return null;const L=fwList().filter(b=>!b.storniert||/reaktiv/.test(t));const d0=ds[0];
    let hit=L.filter(b=>b.a===d0);if(!hit.length)hit=L.filter(b=>b.a<=d0&&d0<b.ab);const pf=/airbnb/.test(t)?'Airbnb':/booking/.test(t)?'Booking.com':/privat/.test(t)?'Privat':null;if(pf)hit=hit.filter(b=>b.p===pf);if(hit.length!==1)return null;const B=hit[0];
    const a={art:'buchung',anreise:B.a,plattform:B.p,erwachsene:null,kinder:null,abreise:null,bar:null,storniert:false,notiz:''};let any=false;
    if(/storn/.test(t)&&!/nicht storn/.test(t)){if(/trotzdem|kostenpflichtig|nicht (mehr )?kostenlos|zahlt|zahlen|geld (kommt|bekommen)|bezahlt|stornogebühr/.test(t)&&!/bar bezahlt|\bbar\b/.test(t))a.stoBez=true;else a.storniert=true;any=true;}
    const er=t.match(/(\d+) erwachsene/);if(er){a.erwachsene=+er[1];any=true;}const ki=t.match(/(\d+|ein|eine|kein|keine) kind(er)?/);if(ki){a.kinder=/^\d/.test(ki[1])?+ki[1]:/^ein/.test(ki[1])?1:0;any=true;}
    if(/abreise|verläng|früher ab|reisen .* ab/.test(t)&&ds[1]){a.abreise=ds[1];any=true;}
    if(/\bbar\b/.test(t)){const b=qAmt(t);if(b==null)return null;a.bar=b;any=true;a.barUrlaub=/nicht aufs urlaub|nicht auf das urlaub/.test(t)?false:/voll|komplett|ganz/.test(t)?'voll':null;}
    return any?a:null;}
  // 8) Gehalt in einem Monat / dauerhaft
  if(/gehalt|lohn|verdient|bekommen/.test(t)&&!/urlaub|tagesgeld|budget|sonstig|essen/.test(t)){const p=qPerson(t);const b=qAmt(t,true);if(!p||b==null)return null;
    if(/\bab\b|dauerhaft|ab jetzt|künftig|in zukunft/.test(t)){const ym=qDate(t)?qDate(t).slice(0,7):qMonth(t);return {art:'grund',key:p==='Till'?'t_gehalt':'p_gehalt',wert:b,ab:ym};}
    return {art:'gehalt',person:p,monat:qMonth(t)||month,wert:b};}
  // 9) Tagesgeld
  if(/tagesgeld/.test(t)){const p=qPerson(t);const b=qAmt(t);if(!p||b==null)return null;const ym=qMonth(t)||(qDate(t)||'').slice(0,7)||month;const w=qWhy(tx).replace(/^(Ein|Eine|Einen|Einem|Den|Die|Das)\s+/i,'').replace(/^./,c=>c.toUpperCase());
    if(/\b(vom|aus dem|von dem|vom meinem|von meinem)\b.*tagesgeld|tagesgeld.*(genommen|entnommen|abgehoben|runter)/.test(t))return {art:'eintrag',person:p,monat:ym,bereich:w?'tg_kauf':'tg_raus',bezeichnung:w||'Umbuchung aufs Girokonto',betrag:b,modus:'neu',pauschale:false};
    if(/(aufs|auf das|ins|in das|zum) tagesgeld|tagesgeld.*(eingezahlt|gespart|zurückgelegt)/.test(t))return {art:'eintrag',person:p,monat:ym,bereich:'tg_rein',bezeichnung:w||'Einzahlung',betrag:b,modus:'neu',pauschale:false};
    return null;}
  // 10) Budget Essen/Sonstiges (auch Ausgleich)
  if(!/restaurant|essen gehen|essen war|pauschale von (till|patrick)/.test(t)){const se=/sonstig|haus,? ?sonst|\bsonst\b/.test(t),es=/\bessen\b|lebensmittel|einkauf|supermarkt|\brewe\b|\baldi\b|\blidl\b|\bedeka\b|\bnetto\b|\bpenny\b|\bkaufland\b/.test(t);
    if(se!==es){const b=qAmt(t,!/\d\s*(€|euro)/.test(t)&&/^\s*(essen|sonstiges?)\s+\d/.test(t));if(b==null)return null;const ausg=/ausgleich|überwies|zurück|aufgefüllt|auffüllen/.test(t);
      let n=qWhy(tx);if(!n){const sh=tx.match(/\b(rewe|aldi|lidl|edeka|netto|penny|kaufland|dm|rossmann|amazon|obi|hornbach|bauhaus|toom)\b/i);if(sh)n=sh[1].charAt(0).toUpperCase()+sh[1].slice(1);}if(n&&/^(essen|sonstiges?|lebensmittel)$/i.test(n))n='';
      return {art:'budget',topf:se?'sonst':'essen',betrag:ausg?-b:b,notiz:n,wer:ausg?qPerson(t):(/\bpatrick\b/.test(t)?'Patrick':/\btill\b/.test(t)?'Till':''),monat:qMonth(t)};}}
  // 11) Ausgabe vom eigenen Girokonto
  if(/ausgegeben|bezahlt|gekauft|gezahlt|kostet|gekostet/.test(t)&&!/haus|gemeinsam/.test(t)){const p=qPerson(t);const b=qAmt(t);const w=qWhy(tx);if(!p||b==null||!w)return null;
    return {art:'eintrag',person:p,monat:qMonth(t)||(qDate(t)||'').slice(0,7)||month,bereich:'giro_aus',bezeichnung:w,betrag:b,modus:'neu',pauschale:/pauschale|restaurant|essen gehen|klamotten|kleidung|friseur|kino|schwimm|café|cafe|bar\b|döner|pizza/.test(t)};}
  return null;}
function qLocal(tx){const parts=tx.split(/\n+|;|\s+und dann\s+|\s+außerdem\s+/i).map(s=>s.trim()).filter(s=>s.length>2);if(!parts.length||parts.length>8)return null;
  const acts=[];for(const p of parts){const a=qParse1(p);if(!a)return null;acts.push(a);}return {aktionen:acts,rueckfrage:null,lokal:true};}
/* Sieht der Text nach einer NEUEN Buchung aus (Einfügen aus Booking/Airbnb oder diktiert)? */
function qIsNewBooking(tx){const t=tx.toLowerCase();if(/neue buchung/.test(t))return true;if(tx.length>250&&/(booking|airbnb|buchungsnummer|gesamtpreis|du erhältst|check-in|anreise)/.test(t))return true;
  return /(booking|airbnb|privat)/.test(t)&&/(\bbis\b|du erhältst|gesamtpreis|kommission|nächte)/.test(t)&&!/storn|bar bezahlt|\bbar\b|hat .* bezahlt/.test(t);}
/* Vorschau mit Bestätigen – gemeinsam für „Schnell eintragen“ und das Feld bei der Ferienwohnung */
function qShow(r,msg,prev){const acts=(r?.aktionen||[]).filter(a=>a&&a.art);prev._acts=acts;prev.classList.add('qprev');
  if(!acts.length){msg.innerHTML=r?.rueckfrage?`<b>Rückfrage:</b> ${esc(r.rueckfrage)}`:'Ich habe daraus keine Änderung erkannt. Formulier es gern etwas genauer.';prev.innerHTML='';return;}
  msg.innerHTML=(r?.rueckfrage?`<b>Hinweis:</b> ${esc(r.rueckfrage)} `:'')+(r.lokal?'<span class="muted">Ohne KI erkannt.</span> ':'')+'Bitte prüfen und bestätigen:';
  prev.innerHTML=acts.map((a,i)=>`<label class="qa"><input type="checkbox" checked data-qi="${i}"><span>${qDescribe(a)}</span></label>`).join('')+`<div style="display:flex;gap:8px;margin-top:8px"><button type="button" class="btn" data-qok="1">Bestätigen</button><button type="button" class="btn sec" data-qno="1">Verwerfen</button></div>`;}
function qErr(e){return e?.code==='no_key'||e?.code==='api_error'?(e.message||'KI-Zugang fehlt. Einstellungen → KI-Zugang.'):e?.code==='not_granted'?'Die KI wurde nicht erlaubt. Trag es im Reiter Monat von Hand ein.':e?.code==='rate_limited'?'Gerade zu viele Anfragen. Bitte gleich noch einmal.':e?.code==='bad_json'?e.message:('Das hat nicht geklappt'+(e?.message?': '+e.message:'.')+' Bitte noch einmal versuchen.');}
async function qRun(tx,msg,prev,btn){const loc=qLocal(tx);if(loc){qShow(loc,msg,prev);return;}
  if(!sampleFn){msg.textContent='Das habe ich ohne KI nicht verstanden, und die KI ist in dieser Ansicht nicht verfügbar.';prev.innerHTML='';return;}
  btn.disabled=true;msg.textContent='Die KI liest deine Nachricht …';
  try{qShow(await sampleFn.json(qPrompt(tx),{modelTier:'default',cache:false}),msg,prev);}catch(e){msg.textContent=qErr(e);}btn.disabled=false;}
document.addEventListener('click',async e=>{const prev=e.target.closest('.qprev');if(!prev)return;const box=prev.closest('.card')||document;const msg=prev.previousElementSibling&&prev.previousElementSibling.matches('.qmsg')?prev.previousElementSibling:(box.querySelector('.qmsg')||prev);
  if(e.target.dataset.qno){prev.innerHTML='';msg.textContent='Verworfen.';return;}
  if(!e.target.dataset.qok)return;const sel=[...prev.querySelectorAll('[data-qi]')].filter(c=>c.checked).map(c=>prev._acts[+c.dataset.qi]);e.target.disabled=true;
  const res=await qApply(sel);prev.innerHTML='';const ta=box.querySelector('textarea');if(ta)ta.value='';msg.innerHTML=`<b class="pos">${res.ok} ${res.ok===1?'Änderung':'Änderungen'} gespeichert.</b>`+(res.skip.length?`<br><span class="warnc">Nicht gespeichert: ${res.skip.join('; ')}</span>`:'');});
$('#q-go').onclick=async()=>{const tx=$('#q-text').value.trim();const msg=$('#q-msg');if(!tx)return;
  // Schnellweg: nur ein Betrag => Essen
  const only=parseNum(tx.replace(/^essen\s*/i,''));if(only!=null&&/^(essen\s*)?[\d.,\s€]+$/i.test(tx)){await addBudget('e',only);$('#q-text').value='';msg.innerHTML=`<b class="pos">${eur(only)} bei Essen abgezogen.</b>`;return;}
  // Neue Ferienwohnungs-Buchung => in den Reiter Ferienwohnung weiterreichen
  if(!qLocal(tx)&&qIsNewBooking(tx)){msg.innerHTML='Neue Buchungen trägst du im <a href="fewo.html">Verwaltungsprogramm</a> ein (Text dort einfügen und „Auslesen“).';return;}
  await qRun(tx,msg,$('#q-prev'),$('#q-go'));};
