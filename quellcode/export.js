/* ---------- Excel-Export ---------- */
function loadScript(src,test){return new Promise((res,rej)=>{if(test())return res();const s=document.createElement('script');s.src=src;s.onload=()=>test()?res():rej(new Error('load'));s.onerror=()=>rej(new Error('offline'));document.head.appendChild(s);});}
const xesc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const colIdx=c=>{let n=0;for(const ch of c)n=n*26+ch.charCodeAt(0)-64;return n;};
const serial=iso=>{const[y,m,d]=iso.split('-').map(Number);return Math.round((Date.UTC(y,m-1,d||1)-Date.UTC(1899,11,30))/864e5);};
function parseSheet(x){const a=x.indexOf('<sheetData>')+11,b=x.indexOf('</sheetData>');const body=x.slice(a,b);const rows=new Map();
  const RR=/<row r="(\d+)"([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g;const CR=/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;let m;
  while((m=RR.exec(body))){const cells=new Map();let c;const inner=m[3]||'';CR.lastIndex=0;while((c=CR.exec(inner)))cells.set(c[1],{a:c[2],i:c[3]||''});rows.set(+m[1],{a:m[2].replace(/\s*spans="[^"]*"/,''),cells});}
  return {head:x.slice(0,a),tail:x.slice(b),rows};}
function styleOf(a){const m=/\ss="(\d+)"/.exec(a||'');return m?m[1]:null;}
function setCell(sh,ref,val,styleFallback){const m=/^([A-Z]+)(\d+)$/.exec(ref);const col=m[1],r=+m[2];let row=sh.rows.get(r);if(!row){row={a:'',cells:new Map()};sh.rows.set(r,row);}
  const old=row.cells.get(col);let s=old?styleOf(old.a):null;if(s==null&&styleFallback)s=styleFallback;const sa=s!=null?` s="${s}"`:'';
  if(val==null){row.cells.set(col,{a:sa,i:''});return;}
  if(val.f!=null){row.cells.set(col,{a:sa,i:`<f>${xesc(val.f.replace(/^=/,''))}</f>`});return;}
  if(val.n!=null){row.cells.set(col,{a:sa,i:`<v>${+val.n}</v>`});return;}
  if(val.s!=null){row.cells.set(col,{a:sa+' t="inlineStr"',i:`<is><t xml:space="preserve">${xesc(val.s)}</t></is>`});return;}}
function getStyle(sh,ref){const m=/^([A-Z]+)(\d+)$/.exec(ref);const row=sh.rows.get(+m[2]);const c=row&&row.cells.get(m[1]);return c?styleOf(c.a):null;}
function serSheet(sh){let out='';[...sh.rows.keys()].sort((a,b)=>a-b).forEach(r=>{const row=sh.rows.get(r);const cs=[...row.cells.entries()].sort((a,b)=>colIdx(a[0])-colIdx(b[0])).map(([c,v])=>v.i?`<c r="${c}${r}"${v.a}>${v.i}</c>`:`<c r="${c}${r}"${v.a}/>`).join('');out+=cs?`<row r="${r}"${row.a}>${cs}</row>`:`<row r="${r}"${row.a}/>`;});return sh.head+out+sh.tail;}

/* Monatsblöcke der Vorlage (bis 12/2032) jahresweise bis PLAN1 fortschreiben: letzte 12 Blöcke kopieren, Zeilenbezüge verschieben */
const shiftF=(f,off)=>f.replace(/(^|[^A-Za-z_!$'\]\d])(\$?)([A-Z]{1,3})(\$?)(\d+)(?![\d(A-Za-z_\[])/g,(m,pre,d1,col,d2,row)=>d2?m:pre+d1+col+d2+(+row+off));
function extendBlocks(X,cm,sh){const ks=Object.keys(cm).sort();const last=ks.at(-1);const ly=+last.slice(0,4);const endY=+PLAN1.slice(0,4);if(endY<=ly)return;
  const jan=cm[ly+'-01'],dec=cm[ly+'-12'],prevDec=cm[(ly-1)+'-12'];if(!jan||!dec||!prevDec)return;const stride=dec.h-prevDec.h;const R0=jan.h,R1=dec.t+1;let maxR=0;
  for(let y=ly+1;y<=endY;y++){const off=(y-ly)*stride;
    for(let r=R0;r<=R1;r++){const row=X.rows.get(r);if(!row)continue;const cells=new Map();
      row.cells.forEach((v,c)=>{let i=v.i||'';i=i.replace(/<f>([\s\S]*?)<\/f>/,(m,f)=>'<f>'+shiftF(f,off).replace(/DATE\((\d{4}),/g,(mm,yy)=>'DATE('+(+yy+y-ly)+',')+'</f>');if(c==='A')i=i.replace('<v>'+ly+'</v>','<v>'+y+'</v>');cells.set(c,{a:v.a,i});});
      X.rows.set(r+off,{a:row.a,cells});maxR=Math.max(maxR,r+off);}
    for(let m=1;m<=12;m++){const mm=String(m).padStart(2,'0');const b=cm[ly+'-'+mm];if(!b)continue;const n={...b,h:b.h+off,t:b.t+off,first:b.first+off,last:b.last+off};if(b.etf)n.etf=b.etf+off;cm[y+'-'+mm]=n;}}
  X.head=X.head.replace(/<dimension ref="([A-Z]+\d+):([A-Z]+)\d+"\/>/,(m,a,c)=>`<dimension ref="${a}:${c}${maxR}"/>`);}
async function exportExcel(){
  const msg=$('#x-msg');const btn=$('#x-exp');btn.disabled=true;msg.textContent='Erstelle die Excel …';
  try{
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',()=>!!window.JSZip);
    await loadScript('vorlage.js',()=>!!window.VORLAGE);
  }catch(_){msg.textContent='Zum Erstellen braucht die Seite einmal Internet. Bitte erneut versuchen.';btn.disabled=false;return;}
  try{
    const V=window.VORLAGE;const bin=Uint8Array.from(atob(V.b64),c=>c.charCodeAt(0));const zip=await JSZip.loadAsync(bin);
    const SF=V.sheets;const cache={};const CM=structuredClone(V.cellmap);const get=async n=>{if(cache[n])return cache[n];const f=SF[n]&&zip.file(SF[n]);if(!f)throw new Error('Blatt „'+n+'“ fehlt in der Vorlage');return cache[n]=parseSheet(await f.async('string'));};
    calcAll();
    for(const sh of ['TILL','PATRICK','HAUS'])extendBlocks(await get(sh),CM[sh],sh);
    // Monatsblöcke
    for(const sh of ['TILL','PATRICK','HAUS']){const X=await get(sh);let prevEtf=V.prevEtf[sh];
      for(const [ym,cm] of Object.entries(CM[sh]).sort((a,b)=>a[0].localeCompare(b[0]))){const P=S.plan[ym];const blk=P?.[sh];
        if(blk){const zu=!!(P.zu||blk.zu);useYm(ym);const VY=VARS,VB=baseVars();const differs=e=>{if(!e.f)return false;VARS=VB;const b0=entryVal(e,blk,sh);VARS=VY;const b1=entryVal(e,blk,sh);return Math.abs(b0-b1)>0.004;};
          for(const [g,info] of Object.entries(cm.groups)){const lc=info.label;for(let r=cm.first;r<=cm.last;r++){setCell(X,g+r,null);setCell(X,lc+r,null);}
            (blk[g]||[]).slice(0,15).forEach((e,i)=>{const r=cm.first+i;let val=null;if(e.gk||e._c){setCell(X,g+r,{n:r2(entryVal(e,blk,sh))});if(e.l)setCell(X,lc+r,{s:e.l});return;}if(e.f&&!zu&&(differs(e)||(isPausch(e)&&pauschUsed(blk,sh)>0))){setCell(X,g+r,{n:r2(entryVal(e,blk,sh))});if(e.l)setCell(X,lc+r,{s:e.l});return;}
              if(e.f==='=GIROAUSGLEICH'){setCell(X,g+r,{n:r2(entryVal(e,blk,sh))});if(e.l)setCell(X,lc+r,{s:e.l});return;}
              if(e.f==='=RESTGEHALT'&&!zu)val={f:`=${hasGehIst(blk)?String(r2(gehOf(blk,sh))):sh==='TILL'?'Gehalt_Till':'Gehalt_Patrick'}${giroAus(blk,sh).map(x=>'-E'+(cm.first+x.i)).join('')}`};
              else if(e.f&&!zu&&!/Wasser_Abschlag|Grundsteuer_Rate/.test(e.f))val={f:e.f};else if(e.f&&!zu)val={n:r2(entryVal(e,blk,sh))};else if(e.f)val={n:r2(entryVal(e,blk,sh))};else if(e.v!=null&&e.v!=='')val={n:+e.v};
              setCell(X,g+r,val);if(e.l)setCell(X,lc+r,{s:e.l});});}
          if(cm.etf&&sh!=='HAUS'){const col=sh==='TILL'?'Q':'P';const idx=(blk.C||[]).findIndex(x=>/^etf$/i.test((x.l||'').trim()));
            setCell(X,col+cm.etf,(zu||(blk.etfIst!=null&&blk.etfIst!==''))?{n:r2(CALC[ym]?.[sh]?.etf||0)}:{f:`=${col}${prevEtf}`+(idx>=0?`+C${cm.first+idx}`:'')});}}
        if(cm.etf)prevEtf=cm.etf;}}
    useYm(month);
    // Grundbeträge
    for(const it of S.grund.items){if(it.v==null||it.v==='')continue;if(!it.sh||!it.c||typeof it.c!=='string'||!V.sheets[it.sh])continue;/* eigene Posten haben keine Excel-Zelle */const X=await get(it.sh);
      if(it.fmt==='date')setCell(X,it.c,{n:serial(it.v+'-01')});else if(it.fmt)setCell(X,it.c,{f:it.fmt.replace('{v}',String(+it.v))});else setCell(X,it.c,{n:+it.v});}
    // Strom
    {const X=await get('Strom');const sm=S.strom.m||{};const pf=(ym,f)=>{for(let m=ym,n=0;n<20&&m>='2027-01';m=ymAdd(m,-12),n++){const v=sm[m]?.[f];if(v!=null&&v!=='')return +v;}return null;};
      const st={};'BCEFG'.split('').forEach(c=>st[c]=getStyle(X,c+'41'));let lastR=41;
      for(let ym='2027-01';ym<=PLAN1;ym=ymAdd(ym,1)){const r=5+ymNum(ym)-ymNum('2027-01');const o=sm[ym]||{};lastR=Math.max(lastR,r);
        if(r>41){setCell(X,'B'+r,{n:serial(ym+'-01')},st.B);setCell(X,'G'+r,{f:`=G${r-1}+Tabelle2[[#This Row],[Sparrate]]+Tabelle2[[#This Row],[Vergütung]]-Tabelle2[[#This Row],[Vebrauch]]`},st.G);}
        setCell(X,'C'+r,{n:o.spar!=null&&o.spar!==''?+o.spar:gn('s_pauschale',ym)},st.C);const vb=o.ist!=null&&o.ist!==''?+o.ist:pf(ym,'verbrauch');setCell(X,'E'+r,vb!=null?{n:vb}:null,st.E);const vg=pf(ym,'verg');setCell(X,'F'+r,vg!=null?{n:vg}:null,st.F);}
      X.head=X.head.replace(/<dimension ref="([A-Z]+\d+):([A-Z]+)(\d+)"\/>/,(m,a,c,n)=>`<dimension ref="${a}:${c}${Math.max(+n,lastR)}"/>`);
      for(const tf of zip.file(/^xl\/tables\/table\d+\.xml$/)){const tx=await tf.async('string');if(/name="Tabelle2"/.test(tx))zip.file(tf.name,tx.replace(/ref="B3:G\d+"/g,`ref="B3:G${lastR}"`));}}
    // FeWo
    {const X=await get('FeWo');const L=fwList();const st={};'ABDEFGHIJK'.split('').forEach(c=>st[c]=getStyle(X,c+'5'));
      L.forEach((b,i)=>{const r=5+i;setCell(X,'A'+r,{n:serial(b.a)},st.A);setCell(X,'B'+r,{n:serial(b.ab)},st.B);setCell(X,'D'+r,b.erw!=null&&b.erw!==''?{n:+b.erw}:null,st.D);setCell(X,'E'+r,{n:+b.sto||0},st.E);
        setCell(X,'F'+r,{s:b.pRaw||b.p},st.F);setCell(X,'G'+r,{n:r2(b.gb)},st.G);setCell(X,'H'+r,{n:r2(+b.H||0)},st.H);setCell(X,'I'+r,{n:r2(+b.I||0)},st.I);setCell(X,'J'+r,{n:r2(+b.J+(+b.bar||0))},st.J);setCell(X,'K'+r,b.K?{s:b.K}:null,st.K);});
      for(let r=5+L.length;r<=447;r++)'ABDEFGHIJK'.split('').forEach(c=>{const row=X.rows.get(r);if(row&&row.cells.has(c))setCell(X,c+r,null);});}
    // Urlaubskonto
    {const X=await get('Urlaubskonto');const E=S.urlaub.e||[];const st={A:getStyle(X,'A6'),C:getStyle(X,'C6'),D:getStyle(X,'D6')};setCell(X,'B5',{n:+S.urlaub.start||0});
      E.forEach((x,i)=>{const r=5+i;setCell(X,'A'+r,{n:serial(x.d)},st.A);setCell(X,'C'+r,{n:+x.b},st.C);setCell(X,'D'+r,x.t?{s:x.t}:null,st.D);});
      for(let r=5+E.length;r<=528;r++)['A','C','D'].forEach(c=>{const row=X.rows.get(r);if(row&&row.cells.has(c))setCell(X,c+r,null);});}
    for(const [n,X] of Object.entries(cache))zip.file(SF[n],serSheet(X));
    const xl=await zip.generateAsync({type:'uint8array',compression:'DEFLATE'});
    const outer=new JSZip();outer.file('Finanzierungsplaene.xlsm',xl);const blob=await outer.generateAsync({type:'blob',compression:'DEFLATE'});
    const fn=`Finanzierungsplaene-${TODAY}.zip`;
    if(!dlFn){msg.textContent='Herunterladen ist in dieser Ansicht nicht verfügbar. Öffne die App direkt auf claude.ai.';btn.disabled=false;return;}
    try{await dlFn.save({filename:fn,data:blob});msg.innerHTML=`<b class="pos">Fertig: ${esc(fn)}.</b> ZIP öffnen, darin liegt die Finanzierungsplaene.xlsm. Beim ersten Öffnen rechnet Excel alles neu.`;save('config/export',{am:new Date().toISOString()});}
    catch(e){msg.textContent=e?.code==='declined'?'Download abgebrochen.':'Download hat nicht geklappt: '+(e?.message||e?.code||'');}
  }catch(e){console.error(e);msg.textContent='Beim Erstellen ist ein Fehler aufgetreten: '+(e?.message||e);}
  btn.disabled=false;}
$('#x-exp').onclick=exportExcel;
window.__exportExcel=exportExcel;
