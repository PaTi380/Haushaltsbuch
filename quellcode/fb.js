/* ---------- Eigenständige Version: Firebase + eigener Claude-Zugang ---------- */
(function(){
  const CFG=window.FB_CONFIG||{};const OK=!!(CFG.apiKey&&CFG.projectId&&!/HIER/.test(CFG.apiKey));
  const TODAY_=new Date(Date.now()-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,10);
  let fs=null,auth=null,user=null;const waiters=[];
  const clean=d=>JSON.parse(JSON.stringify(d??null));
  function gate(html){let g=document.getElementById('fbgate');if(!g){g=document.createElement('div');g.id='fbgate';document.body.appendChild(g);}g.innerHTML=html;g.hidden=!html;}
  function loginScreen(msg){gate(`<div class="fbg-c"><div class="fbg-t">Haushaltsbuch</div><div class="fbg-s">Till &amp; Patrick</div>${msg?`<div class="fbg-m">${msg}</div>`:''}<button id="fb-login" class="btn">Mit Google anmelden</button></div>`);
    document.getElementById('fb-login').onclick=async()=>{const p=new firebase.auth.GoogleAuthProvider();p.setCustomParameters({prompt:'select_account'});
      try{await auth.signInWithPopup(p);}catch(e){if(/popup|operation-not-supported/i.test(e.code||''))await auth.signInWithRedirect(p);else loginScreen('Anmeldung hat nicht geklappt: '+(e.message||e.code));}};}
  if(!OK){document.addEventListener('DOMContentLoaded',()=>gate(`<div class="fbg-c"><div class="fbg-t">Einrichtung fehlt</div><div class="fbg-m">In der Datei <b>config.js</b> fehlen noch die Firebase-Angaben. Siehe Anleitung, Schritt 3.</div></div>`));}
  else{
    firebase.initializeApp(CFG);auth=firebase.auth();fs=firebase.firestore();
    try{fs.enablePersistence({synchronizeTabs:true}).catch(()=>{});}catch(_){}
    auth.getRedirectResult().catch(()=>{});
    auth.onAuthStateChanged(u=>{user=u;window.__me=(u&&u.email)||"";if(!u){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>loginScreen()):loginScreen();return;}
      gate('');while(waiters.length)waiters.shift()();setTimeout(liveUpdate,4000);});
  }
  const signedIn=()=>new Promise(r=>{if(user)r();else waiters.push(r);});
  const snap=s=>({id:s.id,data:()=>s.exists?s.data():undefined});
  const db={
    doc:p=>{const r=fs.doc(p);return {onSnapshot:(f,err)=>r.onSnapshot(s=>f(snap(s)),e=>{err&&err({code:e.code==='permission-denied'?'permission_denied':e.code});}),
      set:d=>r.set(clean(d)).catch(e=>{throw {code:e.code==='permission-denied'?'permission_denied':e.code};}),get:async()=>snap(await r.get()),delete:()=>r.delete()};},
    collection:c=>({onSnapshot:(f,err)=>fs.collection(c).onSnapshot(q=>f({docs:q.docs.map(d=>({id:d.id,data:()=>d.data()}))}),e=>{err&&err({code:e.code==='permission-denied'?'permission_denied':e.code});})})
  };
  const downloads={save:async({filename,data})=>{const b=data instanceof Blob?data:new Blob([data]);const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),5000);return 'saved';}};
  /* Claude über eigenen API-Schlüssel (liegt geschützt in Firestore unter privat/ki) */
  async function kiCfg(){const s=await fs.doc('privat/ki').get();return s.exists?s.data():{};}
  async function ask(prompt,opts={}){const c=await kiCfg();if(!c.key)throw {code:'no_key',message:'Kein KI-Zugang eingerichtet (Einstellungen → KI-Zugang).'};
    if(c.anbieter==='gemini'){/* Bei Überlastung (503/429) kurz warten und automatisch auf andere kostenlose Flash-Modelle ausweichen */
      const first=c.model||'gemini-3.8-flash';const list=[first,...['gemini-3.8-flash','gemini-3.7-flash','gemini-3.6-flash','gemini-3.5-flash'].filter(x=>x!==first)];let last=null;
      for(let n=0;n<list.length;n++){const m=list[n];if(n)await new Promise(res=>setTimeout(res,800));
        const r=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(m)+':generateContent',{method:'POST',headers:{'content-type':'application/json','x-goog-api-key':c.key},body:JSON.stringify({contents:[{role:'user',parts:[{text:prompt}]}],generationConfig:{temperature:0.2,maxOutputTokens:8192,...(opts&&opts.json?{responseMimeType:'application/json'}:{})}})});
        let m2='';if(!r.ok){try{m2=(await r.json())?.error?.message||'';}catch(_){}}
        if(r.status===400||r.status===401||r.status===403){if(/key/i.test(m2))throw {code:'no_key',message:'Der Gemini-Schlüssel ist ungültig.'};if(r.status===400)throw {code:'api_error',message:m2||'Fehler 400'};}
        if(r.status===503||r.status===429||r.status===500||r.status===404||r.status===403){last={code:r.status===429?'rate_limited':'api_error',message:'Gemini ist gerade überlastet. Bitte in ein paar Minuten nochmal versuchen.'};continue;}
        if(!r.ok)throw {code:'api_error',message:m2||('Fehler '+r.status)};
        const j=await r.json();const cd=j.candidates?.[0];const tx=(cd?.content?.parts||[]).filter(x=>!x.thought).map(x=>x.text||'').join('');if(!tx.trim()){last={code:'api_error',message:cd?.finishReason==='MAX_TOKENS'?'Die Antwort der KI war zu lang und wurde abgeschnitten. Bitte kürzer fragen.':cd?.finishReason==='SAFETY'?'Gemini hat die Anfrage abgelehnt. Bitte anders formulieren.':'Gemini hat keine Antwort geliefert ('+(cd?.finishReason||j.promptFeedback?.blockReason||'unbekannt')+').'};continue;}return tx;}
      throw last||{code:'api_error',message:'Gemini ist gerade nicht erreichbar.'};}
    const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'content-type':'application/json','x-api-key':c.key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
      body:JSON.stringify({model:c.model||'claude-sonnet-5',max_tokens:2500,messages:[{role:'user',content:prompt}]})});
    if(r.status===429||r.status===529)throw {code:'rate_limited'};if(r.status===401)throw {code:'no_key',message:'Der API-Schlüssel ist ungültig.'};
    if(!r.ok){let m='';try{m=(await r.json())?.error?.message||'';}catch(_){}throw {code:'api_error',message:m||('Fehler '+r.status)};}
    const j=await r.json();return (j.content||[]).filter(x=>x.type==='text').map(x=>x.text).join('');}
  const sample=async(input,opts)=>({text:await ask(typeof input==='string'?input:JSON.stringify(input),opts),truncated:false});
  sample.json=async(input,opts)=>{const t=await ask((typeof input==='string'?input:JSON.stringify(input))+'\n\nAntworte ausschließlich mit gültigem JSON, ohne Erklärung und ohne ```.',{...(opts||{}),json:true});
    const a=t.indexOf('{'),b=t.lastIndexOf('}');if(a<0||b<a)throw {code:'bad_json',message:'Die KI hat unerwartet geantwortet. Bitte noch einmal versuchen.'};try{return JSON.parse(t.slice(a,b+1));}catch(_){try{return JSON.parse(t.slice(a,b+1).replace(/,\s*([}\]])/g,'$1'));}catch(__){throw {code:'bad_json',message:'Die KI-Antwort war unvollständig. Bitte noch einmal versuchen.'};}}};
  sample.limits=async()=>({images:null});
  window.claude={use:async n=>{if(!OK)return null;if(n==='db'){await signedIn();return db;}if(n==='downloads')return downloads;if(n==='sample'){await signedIn();return sample;}return null;}};

  /* Wetter (Open-Meteo) und Goldpreis (gold-api.com + EZB-Kurs) einmal am Tag direkt holen */
  async function liveUpdate(){try{const r=await fs.doc('config/live').get();const L=r.exists?r.data():{};const nx={...L};let ch=false;
    if(!(L.wx?.am>=TODAY_)){try{const w=await (await fetch('https://api.open-meteo.com/v1/forecast?latitude=50.1517&longitude=6.8103&daily=weather_code,temperature_2m_mean,cloud_cover_mean&timezone=Europe%2FBerlin&forecast_days=7')).json();
      const T={0:'sonnig',1:'überwiegend sonnig',2:'teils bewölkt',3:'bedeckt',45:'Nebel',48:'Nebel',51:'Niesel',53:'Niesel',55:'Niesel',61:'Regen',63:'Regen',65:'starker Regen',66:'Eisregen',67:'Eisregen',71:'Schnee',73:'Schnee',75:'starker Schnee',77:'Schnee',80:'Schauer',81:'Schauer',82:'starke Schauer',85:'Schneeschauer',86:'Schneeschauer',95:'Gewitter',96:'Gewitter',99:'Gewitter'};
      const d=w.daily;if(d?.time?.length){nx.wx={am:TODAY_,quelle:'Open-Meteo',tage:d.time.map((t,i)=>({datum:t,wolken:Math.round(d.cloud_cover_mean[i]??50),temp:Math.round((d.temperature_2m_mean[i]??10)*10)/10,text:T[d.weather_code[i]]||''}))};ch=true;}}catch(_){}}
    if(!(L.gold?.am>=TODAY_)){try{const g=await (await fetch('https://api.gold-api.com/price/XAU')).json();const fx=await (await fetch('https://api.frankfurter.dev/v1/latest?from=USD&to=EUR')).json();
      const eur=g?.price*fx?.rates?.EUR;if(eur>1500&&eur<10000){nx.gold={preis:Math.round(eur*100)/100,am:TODAY_,quelle:'gold-api.com / EZB'};ch=true;}}catch(_){}}
    if(ch)await fs.doc('config/live').set(clean(nx));}catch(_){}}

  /* Einstellungen: Claude-Zugang + Abmelden */
  document.addEventListener('DOMContentLoaded',()=>{const host=document.getElementById('app-sect')||document.getElementById('p-einst');if(!host||!OK)return;const c=document.createElement('div');c.className='card';c.id='ki-card';
    const MODELS={claude:[['claude-sonnet-5','Claude Sonnet 5 (empfohlen, ca. 1 Cent je Anfrage)'],['claude-haiku-4-5-20251001','Claude Haiku 4.5 (günstiger)']],gemini:[['gemini-3.8-flash','Gemini 3.8 Flash (empfohlen)'],['gemini-3.7-flash','Gemini 3.7 Flash'],['gemini-3.6-flash','Gemini 3.6 Flash']]};
    c.innerHTML=`<div class="head"><h2>KI-Zugang</h2></div><div class="note" style="margin-top:0">Für „Schnell eintragen“, „Buchung auslesen“ und „Fragen & Was wäre, wenn …?“. Der Schlüssel liegt geschützt in eurer Datenbank (nur ihr zwei könnt ihn lesen), gilt für euch beide und steht nicht in der Sicherungsdatei.</div>
      <form class="form" id="f-ki" style="margin-top:8px" onsubmit="return false"><label>Anbieter<select id="ki-prov"><option value="claude">Claude (Anthropic)</option><option value="gemini">Gemini (Google)</option></select></label><label>Schlüssel<input id="ki-key" type="password" autocomplete="off" style="min-width:220px"></label><label>Modell<select id="ki-model"></select></label><button class="btn" id="ki-save">Speichern</button><button class="btn sec" id="ki-test">Testen</button></form>
      <div class="note" id="ki-help"></div><div class="note" id="ki-msg"></div>
      <div style="margin-top:10px;display:flex;gap:10px;align-items:center;flex-wrap:wrap"><span class="note" id="fb-who" style="margin:0"></span><button class="btn sec sm" id="fb-out">Abmelden</button></div>`;
    host.prepend(c);
    const $i=id=>document.getElementById(id);
    const fillModels=(prov,sel)=>{$i('ki-model').innerHTML=MODELS[prov].map(([v,l])=>`<option value="${v}">${l}</option>`).join('');if(sel&&MODELS[prov].some(x=>x[0]===sel))$i('ki-model').value=sel;
      $i('ki-key').placeholder=prov==='gemini'?'AIza…':'sk-ant-…';
      $i('ki-help').innerHTML=prov==='gemini'?'Schlüssel: <b>aistudio.google.com</b> → mit deinem Google-Konto anmelden → „Get API key“ → „API-Schlüssel erstellen“. Ohne Abrechnung kostenlos – dann darf Google die Anfragen (eure Beträge und Buchungen) zur Verbesserung nutzen. Mit hinterlegter Abrechnung (bezahlt) nicht, und es gibt seltener „überlastet“.':'Schlüssel: <b>console.anthropic.com</b> → Guthaben aufladen (z. B. 5 $) und Monatslimit setzen → „API Keys“ → „Create Key“. Anfragen werden nicht zum Training verwendet.';};
    fillModels('claude');$i('ki-prov').onchange=e=>fillModels(e.target.value);
    signedIn().then(async()=>{$i('fb-who').textContent='Angemeldet als '+(user.email||'');try{const k=await kiCfg();const pv=k.anbieter||'claude';$i('ki-prov').value=pv;fillModels(pv,k.model);if(k.key)$i('ki-key').placeholder='gespeichert (…'+k.key.slice(-4)+')';}catch(_){}});
    document.getElementById('fb-out').onclick=()=>auth.signOut();
    document.getElementById('ki-save').onclick=async()=>{const m=document.getElementById('ki-msg');const key=document.getElementById('ki-key').value.trim();const model=document.getElementById('ki-model').value;
      try{const cur=await kiCfg();const anbieter=document.getElementById('ki-prov').value;await fs.doc('privat/ki').set({anbieter,key:key||(cur.anbieter===anbieter||(!cur.anbieter&&anbieter==='claude')?cur.key:'')||'',model});document.getElementById('ki-key').value='';m.textContent='Gespeichert.';}catch(e){m.textContent='Speichern ging nicht: '+(e.code||e.message);}};
    document.getElementById('ki-test').onclick=async()=>{const m=document.getElementById('ki-msg');m.textContent='Teste …';try{const t=await ask('Antworte nur mit: OK');m.innerHTML=`<b class="pos">Funktioniert.</b> Antwort: ${t.slice(0,40)}`;}catch(e){m.textContent='Hat nicht geklappt: '+(e.message||e.code);}};
  });
})();
