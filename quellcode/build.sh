#!/bin/bash
# Baut die App aus den Quelldateien.
#  -> ../1_App-fuer-GitHub/index.html   (echte App, zum Hochladen bei GitHub)
#  -> ./testversion.html                 (Testversion mit testdaten.js, speichert nichts)
set -e
cd "$(dirname "$0")"
OUT=../1_App-fuer-GitHub
JS="core.js views1.js fewo.js views2.js views3.js whatif.js strom.js backup.js export.js mig.js hilfe.js main.js"
{
echo '<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
echo '<meta name="theme-color" content="#0c231b"><meta name="apple-mobile-web-app-capable" content="yes"><link rel="manifest" href="manifest.json"><link rel="icon" href="icon.svg">'
echo '<title>Haushaltsbuch Till & Patrick</title>'
echo '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&display=swap">'
echo '<script src="https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js"></script><script src="https://www.gstatic.com/firebasejs/10.12.5/firebase-auth-compat.js"></script><script src="https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore-compat.js"></script>'
echo '<script src="config.js"></script><script>'; cat fb.js; echo '</script>'
echo '<style>'; cat style.css extra.css; cat <<'CSS'
body{margin:0;padding:0 16px}
#fbgate{position:fixed;inset:0;z-index:60;display:grid;place-items:center;background:radial-gradient(ellipse at 50% 40%,#123126 0,#081a14 75%);color:#e9dcb8}
#fbgate[hidden]{display:none}.fbg-c{text-align:center;padding:24px;max-width:340px}.fbg-t{font-size:26px;letter-spacing:.12em;text-transform:uppercase;color:#f3dc9a}.fbg-s{font-style:italic;letter-spacing:.2em;margin:6px 0 22px;color:#d9bd74}.fbg-m{margin:0 0 16px;font-size:14px;line-height:1.5}
#fbgate .btn{background:#d9bd74;color:#0c231b;border:0;padding:12px 22px;font-size:16px;border-radius:10px;font-weight:600}
CSS
echo '</style></head><body>'
cat body.html
echo '<script>'; cat $JS; echo '</script></body></html>'
} > $OUT/index.html
# Testversion: gleiche App, aber mit Mock-Datenbank (mock.js) und testdaten.js statt Firebase
python3 - <<'PY'
body=open('body.html').read();css=open('style.css').read()+open('extra.css').read()
js=''.join(open(f).read() for f in "core.js views1.js fewo.js views2.js views3.js whatif.js strom.js backup.js export.js mig.js hilfe.js main.js".split())
mock=open('mock.js').read().replace("window.claude={use:async n=>n==='db'?db:n==='downloads'?downloads:n==='sample'?sample:null};","window.__mockdb=db;")
js=js.replace("try{db=await cl?.use?.('db');}catch(_){db=null;}","db=window.__mockdb;")
banner='<div class="banner" style="border-left-color:var(--till);margin-top:14px"><b>Testversion.</b> Nichts wird gespeichert; beim Neuladen ist alles wieder auf dem Ausgangsstand.</div>'
body=body.replace('<nav role="tablist" id="nav"></nav>',banner+'<nav role="tablist" id="nav"></nav>',1)
open('testversion.html','w').write('<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Haushaltsbuch Testversion</title><style>body{margin:0;padding:0 16px}'+css+'</style></head><body>'+body+'<script src="testdaten.js"></script><script>'+mock+'</script><script>'+js+'</script></body></html>')
PY
# Syntax-Prüfung
node -e "const s=require('fs').readFileSync('$OUT/index.html','utf8');const re=/<script>([\s\S]*?)<\/script>/g;let m;while((m=re.exec(s)))new Function(m[1]);console.log('OK: index.html gebaut, Syntax in Ordnung')"
