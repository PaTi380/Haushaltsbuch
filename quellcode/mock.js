// window.claude-Mock mit Seed-Daten
(function(){
const SEED=window.__SEED||{};const store={};Object.entries(SEED).forEach(([k,v])=>store[k]=JSON.parse(JSON.stringify(v)));
const docL={},colL={};
function snapDoc(p){return {data:()=>store[p]?JSON.parse(JSON.stringify(store[p])):undefined,id:p.split('/')[1]};}
function fire(p){(docL[p]||[]).forEach(f=>f(snapDoc(p)));const c=p.split('/')[0];(colL[c]||[]).forEach(f=>f(colSnap(c)));}
function colSnap(c){return {docs:Object.keys(store).filter(k=>k.startsWith(c+'/')).map(k=>snapDoc(k))};}
const db={doc:p=>({onSnapshot:(f)=>{(docL[p]=docL[p]||[]).push(f);setTimeout(()=>f(snapDoc(p)),5);return()=>{};},set:async d=>{store[p]=JSON.parse(JSON.stringify(d));window.__writes=(window.__writes||0)+1;setTimeout(()=>fire(p),1);},get:async()=>snapDoc(p),delete:async()=>{delete store[p];setTimeout(()=>fire(p),1);}}),
 collection:c=>({onSnapshot:(f)=>{(colL[c]=colL[c]||[]).push(f);setTimeout(()=>f(colSnap(c)),5);return()=>{};}})};
const downloads={save:async({filename,data})=>{const buf=data instanceof Blob?await data.arrayBuffer():data;const b64=btoa(String.fromCharCode(...new Uint8Array(buf).slice(0,0)));window.__dl={filename,size:buf.byteLength};if(window.__saveFile){const u=new Uint8Array(buf);let s='';for(let i=0;i<u.length;i+=32768)s+=String.fromCharCode.apply(null,u.subarray(i,i+32768));await window.__saveFile(filename,btoa(s));}return 'saved';}};
const sample=async()=>({text:''});sample.json=async(prompt)=>window.__sampleAnswer?window.__sampleAnswer(prompt):{};sample.limits=async()=>({images:null});
window.__store=store;
window.claude={use:async n=>n==='db'?db:n==='downloads'?downloads:n==='sample'?sample:null};
})();
