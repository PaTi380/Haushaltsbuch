src=open('fewo.src.html',encoding='utf-8').read()
head=src[:src.index('<div class="app"')]; body=src[src.index('<div class="app"'):]
fb='<script src="https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js"></script><script src="https://www.gstatic.com/firebasejs/10.12.5/firebase-auth-compat.js"></script><script src="https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore-compat.js"></script>\n<script src="config.js"></script>\n'
out='<!doctype html>\n<html lang="de">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<link rel="manifest" href="manifest.json">\n<link rel="icon" href="icon.svg">\n'+fb+head+'</head>\n<body>\n'+body+'\n</body>\n</html>\n'
open('out/fewo.html','w',encoding='utf-8').write(out)
print(len(out))
