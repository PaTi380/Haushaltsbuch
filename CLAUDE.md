# Haushaltsbuch Till & Patrick – Projektwissen für Claude

> **An Claude:** Diese Datei enthält alles, was du brauchst, um an dieser App weiterzuarbeiten, auch ohne den früheren Chatverlauf. Lies sie ganz, bevor du etwas änderst. Antworte Till auf **Deutsch**, kurz und verständlich (er ist kein Programmierer). Wenn GitHub verknüpft ist, lade Änderungen selbst ins Repository `pati380/Haushaltsbuch` hoch (Branch `main`, GitHub Pages veröffentlicht automatisch); sonst liefere die fertigen Dateien (`index.html` bzw. `fewo.html`), die er hochlädt.

## 1. Worum es geht

Haushaltsbuch für den Zwei-Personen-Haushalt **Till** und **Patrick** in Üdersdorf (Eifel). Es ersetzt/ergänzt Tills Excel „Finanzierungspläne“ (.xlsm mit Makros). Die App kann diese Excel inkl. Makros wieder exportieren.

Inhalte: Monatsplanung je Person (Girokonto, Tagesgeld), gemeinsames Haushaltskonto mit Rücklagen, Budgets Essen/Sonstiges, Ferienwohnung (Buchungen, Urlaubskonto, Gästebeitrag), Kredite (Sparda-Hauskredit, ING-Gemeinschaftskredit, Bausparvertrag, Szenario Ablösung durch Tills Mutter), Vermögen (ETF, Gold), Stromkonto, Ausblick bis 2040 mit „Was wäre wenn“, KI-Schnelleingabe.

## 2. Betrieb (wo läuft was)

| Teil | Wo | Zweck |
|---|---|---|
| App | GitHub Pages, Konto **pati380** (Repository laut Einrichtung `haushaltsbuch`) → `https://pati380.github.io/…` | statische Dateien: `index.html`, `config.js`, `vorlage.js`, `manifest.json`, `icon.svg` |
| Daten | Firebase-Projekt **haushaltsbuch-b4f70**, Firestore (europe-west3), Anmeldung mit Google | alle Daten, Echtzeit-Sync zwischen Handy/PC und zwischen Till und Patrick |
| Zugriff | Firestore-Regeln (`2_Firebase/firestore-regeln.txt`) | nur die freigegebenen Google-Adressen dürfen lesen/schreiben |
| KI | Gemini (Google AI Studio, eigener Schlüssel) oder Claude-API; Schlüssel liegt in Firestore `privat/ki` | Schnelleingabe, Buchung auslesen, Fragen/Was-wäre-wenn |
| Live-Daten | Die App holt täglich Goldpreis (gold-api.com + frankfurter EUR-Kurs) → `config/live` | Goldpreis automatisch |

`config.js` enthält die Firebase-Web-Konfiguration (öffentlich, kein Geheimnis). **Nie neu erzeugen/überschreiben**, außer das Firebase-Projekt ändert sich.

Updates einspielen: nur die neue `index.html` im GitHub-Repository hochladen (Add file → Upload files → Commit). Nach ~1 Minute online. Datenbank bleibt unberührt.

Frühere Artifact-Version auf claude.ai (Datenspeicher nur mit Pro) ist abgelöst.

## 3. Quellcode und Build

Ordner `3_Quellcode/`. Kein Framework, kein npm. Alles wird zu **einer** HTML-Datei zusammengesetzt:

```
bash 3_Quellcode/build.sh   → 1_App-fuer-GitHub/index.html  (+ 3_Quellcode/testversion.html)
```

Reihenfolge der Skripte (wichtig, ein gemeinsamer Scope): `core.js views1.js fewo.js views2.js views3.js whatif.js strom.js backup.js export.js mig.js hilfe.js main.js`. `fb.js` steht davor in einem eigenen `<script>` im `<head>` (Firebase-Adapter).

| Datei | Inhalt |
|---|---|
| `style.css`, `extra.css` | Design (Farb-Token in `:root`, hell/dunkel). Neue Regeln unten an `extra.css` anhängen. |
| `body.html` | HTML-Gerüst aller Reiter (`<section id="p-…">`), Intro-Animation (Buch). |
| `core.js` | Zustand `S`, Grundbeträge/Formeln (`gv`, `gn`, `vars`, `compileF`, `entryVal`), Monatsrechnung `calcAll`, fortgeschriebene Monate (`fillVirtual`), eigene Posten (`injectCustom`), Speichern mit Rückgängig (`save`, `savePlan`, `setGrund`), Diagramme (`lineChart`, `barChart`), `kpi`. |
| `views1.js` | Reiter **Übersicht** (`rHeute`: Budgets, Überweisung, Kontostände, FeWo-Gutschrift) und **Monat** (`rMonat`, Festschreiben, Abschließen, Tendenz, echtes Gehalt), **Schnelleingabe** (KI-Prompt + Aktionen). |
| `fewo.js` | Ferienwohnung: Buchungen, Gebühren (Booking/Airbnb), Gästebeitrag, Urlaubskonto, Auszahlungs-Zettel, KI-Auslesen. |
| `views2.js` | **Kredite** (Sparda-Tilgungsplan, ING, Bauspar), **Vermögen**, **Einstellungen** (Grundbeträge in Spalten Till/Patrick/Gemeinsam, neue Posten, Budgets, FeWo-Regeln). |
| `views3.js` | **Ausblick**: Phasen („was sich dauerhaft ändert“), Kontoverlauf-Diagramm, Rücklagen, Ereignisse, Wirkungsdialog `askGrund`/`impact`. |
| `whatif.js` | „Fragen & Was wäre wenn“ (KI + Durchrechnen ohne Speichern). |
| `strom.js` | Stromkonto (Plan/Echt-Verbrauch, Jahre 2027–2040). PV-Modell ist deaktiviert (Karte entfernt). |
| `backup.js` | Sicherung speichern/wiederherstellen (JSON aller Firestore-Dokumente). |
| `export.js` | Excel-Export (.xlsm) auf Basis `vorlage.js` (Base64 der Original-Excel inkl. Makros). |
| `hilfe.js` | Hilfe-Karte ganz unten in den Einstellungen: `HILFE` = Bedienungsanleitung in Abschnitten (Klapp-Liste + Wissen für die KI-Frage). **Bei jeder neuen oder geänderten Funktion hier den passenden Abschnitt aktualisieren.** |
| `mig.js` | Einmalige Datenumstellungen (Flags in `config/einstellungen.mig`). |
| `main.js` | Start, Firestore-Listener, Reiter-Umschaltung, `render()`. |
| `fb.js` | Adapter `window.claude.use('db'|'downloads'|'sample')` auf Firebase/Gemini/Claude-API, Login-Seite, Karte „KI-Zugang“ in den Einstellungen. |
| `mock.js`, `testdaten.js` | Nur für die Testversion (Datenbank im Speicher, Beispieldaten). |

**Stolperfallen**
- `core.js` … `main.js` laufen in einer IIFE. Globale Hilfen zum Testen: `window.__S` (Zustand), `window.__goto('JJJJ-MM')`.
- Grundbetrag-Objekte haben ein Feld **`c`** = Excel-Zelle (z. B. `"D2"`). Eigene Posten nutzen deshalb **`cu`**, nie `c`.
- Eingaben werden nicht neu gezeichnet, solange sie den Fokus haben (`contains(document.activeElement)`); nach Aktionen ggf. `document.activeElement.blur()`.
- Nach jeder Änderung: `bash build.sh` und im Browser (Playwright) testen: keine `pageerror`, Reiter durchklicken, Handy-Breite 390 px ohne horizontales Scrollen.

## 4. Datenmodell (Firestore)

| Pfad | Inhalt |
|---|---|
| `plan/JJJJ-MM` | Monatsplan `{TILL:{C,E,I,K,…}, PATRICK:{…}, HAUS:{G,I}, zu, zuAm, gold, notiz}` |
| `budget/JJJJ-MM` | `{e:[…], s:[…]}` Einkäufe Essen/Sonstiges `{id,b,n,w}` |
| `fewo/JJJJ` | `{b:[Buchung…]}`; `fewo/alt` Altbestand |
| `config/grund` | `{items:[{k,l,g,v,hist?,fmt?,am?,bis?,cu?}]}` Grundbeträge |
| `config/archiv` | Kontostände bis Sep 2026 aus der Excel `{TILL:{ym:[giro,tg,null,gesamt]},PATRICK,HAUS:{ym:[k]},start}` |
| `config/kredit` | `{sparda:{stand,standNach,zins,rate,sonder,szenario},ing:{betrag,zins,rate,sonder,ziel},bauspar:{summe,saldo,stand,monat,zuteilProz,alsSonder}}` |
| `config/urlaub`, `config/strom`, `config/budget`, `config/einstellungen`, `config/steuer`, `config/live` | Urlaubskonto, Stromkonto `{start,m:{ym:{spar,verbrauch,ist,verg}}}`, Budget-Regeln (`dauerauftrag`, `sonstAbzug`), Einstellungen (`fewo`-Regeln, `mig`), Steuer, Live-Gold |
| `privat/ki` | `{anbieter:'gemini'|'claude', key, model}` – **nicht** in der Sicherung |

**Monatsblöcke:** Person: `C` Girokonto-Ausgaben, `E` Girokonto-Eingänge, `I` Tagesgeld-Entnahmen, `K` Tagesgeld-Einzahlungen. Haus: `G` Abbuchungen, `I` Einzahlungen (Anteile Till/Patrick je Hälfte).
Eintrag: `{l, v, f?, fest?, p?, lk?, fix?, gk?, _c?, cm?}`
- `f` Formel wie in Excel, z. B. `='Dashboard (Patrick, Till)'!$C$19`, `=Pausch_Till`, `=IF(DATE(2028,4,1)>=Gemeinschaftskredit_Start,Gemeinschaftskredit,0)`. Variablen in `vars()`.
- `=GIROAUSGLEICH`: automatisch so viel, dass das Girokonto auf 0 endet. Festschreiben (📌) setzt `v`, `fix=Datum` und `snap:{am,giro,tg}` im Personenblock → daraus die **Tendenz** „mehr/weniger ausgegeben als geplant“. ↺ löst.
- `=RESTGEHALT` in `K`: Gehalt − Giroausgleich; fehlt Geld, erscheint „vom Tagesgeld / ans Girokonto“.
- `p`: aus der Pauschale bezahlt → Pauschale schrumpft entsprechend.
- `lk`: verknüpfte Tagesgeld→Giro→Ausgabe-Paare.
- Personenblock kann `gehIst` (echtes Gehalt dieses Monats), `etfIst` (echter Depotwert) haben.
- `Abgleich Kontostand`: Differenz zum echten Kontostand beim Monatsende-Abgleich.

**Abschließen** (je Block Till/Patrick/Haushaltskonto einzeln, `blk.zu`; alle drei → `P.zu`): alle Formeln werden zu festen Werten, `zu:true`, `zuAm`, `gold` (Goldpreis zu dem Zeitpunkt). Abgeschlossene Monate ändern sich nicht mehr durch Grundbeträge/Goldpreis.

**Fortgeschriebene Monate (2033–2040):** existieren nicht in Firestore; `fillVirtual()` kopiert jeweils denselben Monat des Vorjahres (Flag `_virt`), passt `DATE(…)` an, lässt Gemeinschaftskredit nach der letzten ING-Rate weg. Wird so ein Monat geändert, wird er normal gespeichert.

**Eigene Posten** (Einstellungen → „+ Neuer Posten“): Grundbetrag mit `cu:{art:'aus'|'ein', rh:'m'|'j', ab, an?, lg?}` und optional `bis`. `injectCustom()` setzt bei jeder Rechnung Einträge `{gk,_c:1}` ans Ende der passenden Liste (nicht gespeichert; `savePlan` entfernt `_c`). Gemeinsame Posten laufen über `HAUS.G` und erhöhen die Anteile (Variable `J20`). Beim Abschließen werden sie als `{fest:true, cm:1}` fest übernommen. Beispiel: „Rückgabe an Till“ 300 €/Monat bis 01/2027 mit Gegenbuchung „Rückgabe von Patrick“ bei Till.

**Grundbeträge:** `hist:[{ab,v}]` = Änderung ab Monat; `bis` = danach 0; Löschen = überall 0 (offene Monate). Verknüpft: `h_tilgung` ↔ `kredit.sparda.rate`, `ing_rate` ↔ `kredit.ing.rate`, `s_pauschale` → Strom-Anteile.

## 5. Fachliche Regeln (von Till festgelegt)

- Tills Gehalt: netto 2.837,96 € − IGBCE-Beitrag (Grundbetrag `t_igbce`, 41,91 €) = 2.796,05 €. Patricks Gehalt schwankt (Spesen) → pro Monat „echtes Gehalt“ eintragbar, Planung nutzt festes Gehalt.
- Haushaltskonto: Jahres-/Quartalsposten werden monatlich angespart; Wasserabgabe und Grundsteuer gehen per Dauerauftrag (zählen nicht zur Überweisung Haushalt→Giro). Grundsteuer 401,16 €/Jahr in 4 Raten (15.02., 15.05., 15.08., 15.11.). Wasser: Abschlag 2026 = 721,94 € (Feb 181,94 €, sonst 180 €); Grundbetrag steht auf 812,70 € (inkl. Nachzahlung 2025) – Till entscheidet, ob er ihn senkt.
- Essen-Budget = `h_essen`; Sonstiges = `h_s_frei` − 100 € (Kredit-Sparen) bis 04/2027. Ausgleich mit Minusbetrag; mit „Wer“ auch beim Girokonto der Person.
- Ferienwohnung – Bargeld vor Ort (`barUrlaub`): `true`/leer = wie Auszahlung aufteilen (Spartopf + Urlaubskonto), `'voll'` = komplett aufs Urlaubskonto ohne Spartopf-Abzug, `false` = bleibt außen vor.
- „Haus, sonst.“ (Till/Patrick) und „Anteil Till/Patrick“ hängen per Formel an `D_C19`/`D_D19` (Summe aller Haus-Grundbeträge / 2). Okt–Dez 2026 haben aus der Excel einen festen Zuschlag (+63,32 €) in der Formel.
- Ferienwohnung: Gästebeitrag nur für Erwachsene (Kinder zählen bei Gästen mit), Spartopf 30 % + 5 €, Rest aufs Urlaubskonto. Auszahlung Booking 2 Tage nach Abreise, Airbnb 2 Tage nach Anreise.
- Sparda: Zinsbindung bis 03/2053, Sondertilgungen max. 17.250 €/Jahr; „Rate Sondertilgung Haus“ in den Plänen wird als Sondertilgung (Jahresende) gerechnet. Bausparvertrag kann bei Zuteilung als Sondertilgung genutzt werden.
- ING-Gemeinschaftskredit: Rate je zur Hälfte, erste Rate 11/2026, Ende laut Plan 10/2036.
- Barbeträge der Ferienwohnung werden **nicht** aus der Steuer-Übersicht herausgerechnet (bewusste Ablehnung, nicht umbauen).
- Farben: Till blau (`--till`), Patrick orange (`--pat`), gemeinsam grün (`--gem`), Gold/Anlagen goldene Kästen, Sparda blau, ING orange, Bausparen gelb.
- Stil: kurze, verständliche Texte; keine Fachsprache; Beträge deutsch formatiert; alles muss am Handy gut gehen.

## 6. Wenn Till mit einer Änderung kommt

0. **Versionsnummer** in `core.js` (`APPV={nr,datum}`): **nur an einem neuen Tag** hochzählen (z. B. 2.0 → 2.1) und das Datum anpassen. Alle Änderungen am selben Tag bleiben unter derselben Nummer. Die Nummer steht oben in der App und in Einstellungen → App.

1. ZIP entpacken, `3_Quellcode` bearbeiten (nie direkt die gebaute `index.html`).
2. Bei Datenänderungen in bestehenden Dokumenten: einmalige Umstellung in `mig.js` mit neuem Flag, idempotent, abgeschlossene Monate (`zu`) nicht anfassen.
3. `bash build.sh`, testen (Testversion `testversion.html` öffnet ohne Firebase).
4. Till die neue `1_App-fuer-GitHub/index.html` geben (+ Hinweis: vorher „Sicherung speichern“). Idealerweise auch ein aktualisiertes ZIP inkl. dieser Datei (Abschnitt 7 ergänzen).
5. Wenn Till eine Sicherungsdatei (`Haushaltsbuch-Sicherung-….json`) mitschickt: das ist der aktuelle Datenstand (`docs` = Firestore-Dokumente) – daraus kann man z. B. Testdaten machen (`window.__SEED={...docs}` in `testdaten.js`).

## 7. Änderungsverlauf (Kurzfassung)

- 09/2026: Umzug von claude.ai-Artifact auf GitHub Pages + Firebase, KI über Gemini.
- 27.09.2026: Übersicht (statt „Heute“) mit Tendenz, FeWo-Gutschrift-Kachel; Festschreiben deutlich sichtbar; Plan bis 2040; Kredite-Karten + Filter; Vermögen/Strom-Filter; Einstellungen in Spalten mit Gruppen, eigene Posten, Ende/Entfernen; echtes Gehalt je Monat; Stromkonto Plan/Echt; September 2026 als Monat ergänzt; Grundsteuer-Februarrate ergänzt; Goldpreis gilt überall außer in abgeschlossenen Monaten. Gemini weicht bei Überlastung automatisch auf 3.7/3.6/3.5 Flash aus. Excel-Export überspringt eigene Posten bei den Grundbeträgen.
- **Version 2.0 (28.09.2026)** – erste Version nach dem Umzug, die live geht (Zwischenstände 1.5–2.3 waren nur Testversionen). Enthält u. a.: Versionsanzeige (`APPV` in core.js; erst an einem neuen Tag hochzählen, z. B. 2.1); FeWo-Bargeld-Modus (aufteilen/komplett/nicht); Zettel mit Brutto oben, alle Beträge antippbar (`J`, `gb`/`gbM`, `spO`, `uO`, Brutto via `bm`), Buchungen > 14 Tage nach Abreise nur lesbar, Hinweis bei vergessenem Kind; Monatsabschluss je Block (`blk.zu`, alle drei → `P.zu`, Helfer `bzu`); „Haus, sonst.“/Anteile Okt–Dez 2026 an Grundbeträge gekoppelt (+63,315 € Heizöl-Zuschlag); Grundsteuer-Aprilrate aus Excel entfernt; IGBCE als Grundbetrag `t_igbce`; Sicherungs-Erinnerung (`config/sicherung`); Excel-Export bis 2040 (`extendBlocks`, Strom-Tabelle erweitert); Wasser-Abschlag `h_wasser_ab`, ADAC verknüpft.
- **Bescheide (Wasser, Grundsteuer):** `item.bsch={JJJJ:{f,r}}` auf `h_wasser` bzw. `h_grundst`. Ab Februar des Jahres: Raten = f (Feb) / r (Mai, Aug, Nov) über `rateOf()` (Variablen `Wasser_Abschlag`, `Grundsteuer_Rate`, Einträge per `mig.gstrate` umgestellt); Ansparen fürs Folgejahr `annOf()` = Gesamtbetrag laut Bescheid (f + 3 × r), Januar wird in `vjRate()` verrechnet; Ausgleich `bsAusgleich()`: im Vorjahr angespart vs. zu zahlen → im Februar je Hälfte als Zeilen bei Till/Patrick (C) und Haushaltskonto (I) („Nachzahlung … (Anteil)“ bzw. „übrig vom Ansparen …“, negativ), eingesetzt von `injectBescheid()` (nicht gespeichert, wie eigene Posten). Rücklagen-Balken für Wasser/Grundsteuer: Vorjahres-Ansparung Jan–Dez. Eingabe: Einstellungen → Gemeinsam → „📄 Bescheide“ oder Schnelleingabe (art `bescheid`).
- **Neue Jahresbeiträge** (Wohngebäude, Hausrat, Haftpflicht, Abfall, ADAC; `BSJ`): `item.bsch={JJJJ:{j:Jahresbetrag, ab:'JJJJ-MM' Fälligkeit}}`; `gv()` liefert ab `ab` den neuen Betrag (Zahlung + Ansparen danach). Ausgleich `bjAusgleich()` = neuer Betrag − in den 12 Monaten davor Angespartes, je Hälfte im Fälligkeitsmonat (gleiche Zeilen wie oben). Schnelleingabe art `beitrag`.
- Außerdem in 2.0: Monatsauswahl per Kalender (Klick auf den Monatsnamen, `mPick`); Übersicht zeigt „Haus, sonst.“ je Person und die nächste Änderung mit Grund (`hausInfo`, `hsOf`, `jOf` = J-Werte eines Monats); Überweisungsliste zeigt Daueraufträge ausgegraut; Einstellungen: Summe „Haus, sonst.“ in Gemeinsam, keine Anzahlen an Gruppen, Goldpreis unter den Bescheiden (tägliche Aktualisierung über fb.js → `config/live`).

## Textbefehle ohne KI (ab 2.1)
- `views1.js`: `qParse1()` erkennt einzelne Befehle per Regeln (Budget, Urlaubskonto, Tagesgeld, Gehalt, Strom, Sondertilgung, Restschuld, Bescheid, Jahresbeitrag, Giro-Ausgabe, Buchungsänderung). `qLocal()` teilt an `;`/Zeilenumbruch/„und dann“ – nur wenn ALLE Teile erkannt werden, läuft es ohne KI.
- `qRun()` = erst lokal, sonst `qPrompt` an die KI; `qShow()` zeigt die Vorschau (Container `.qprev`, Bestätigen über `data-qok`).
- FeWo-Feld: lokal → allgemeine KI (kurzer Text, keine neue Buchung) → sonst `fwAuslesen`. Übersicht reicht neue Buchungen (`qIsNewBooking`) an den FeWo-Reiter weiter.
- Neue Aktion `urlaub` {datum, betrag (Abheben negativ), grund} → `saveUrlaub`.
- „ich/mein“ = angemeldete Adresse (`window.__me`, gesetzt in fb.js).

## Belegung für Home Assistant (ab 2.2)
- `fewo.js`: `fwPublish()` schreibt `public/belegung` = `{stand, b:[{a,ab,erw,ki}]}` (Buchungen von heute−2 bis heute+400 Tage, ohne stornierte, ohne Namen/Beträge). Schreibt nur bei Änderung.
- `main.js`: wird 3 s nach jedem `fewo`-Snapshot aufgerufen.
- Firestore-Regeln: `match /public/belegung { allow get: if true; }` – einziges Dokument ohne Anmeldung lesbar; schreiben dürfen nur die drei erlaubten Adressen.
- Home Assistant liest das Dokument über die Firestore-REST-Schnittstelle. Pfad und Feldnamen NICHT ändern, sonst bricht die Anbindung.

## Sparda: Werte laut Bank (ab 2.3)
- Die Sparda bucht die Rate am 30. (Februar: Monatsletzter). `spYm(datum)` macht aus einem Kontostand-Datum den Monat der letzten gebuchten Rate. Startwert: `sparda.stand` + `sparda.standAm` (Datum); altes `standNach` nur noch als Ersatz. „Restschuld heute“ = nach der letzten gebuchten Rate (`spHeute()`).
- `config/kredit` → `sparda.bank = [{ym, dat (Stand-Datum), st, rate?, am}]`
- Manuelle Sondertilgungen: `sparda.sonder = [{dat, ym, b}]`, Monat über `spYm(dat)`; liegt `dat` nach `standAm`, aber vor der nächsten Rate, wird sie in der ersten gerechneten Zeile abgezogen; Datum ≤ `standAm` = schon im Kontostand enthalten (wird nicht gerechnet).; Eingabe im Reiter Kredite („Werte laut Sparda“) oder per Textbefehl (Aktion `sparda_bank`).
- `views2.js` `sparda()`: Ist-Werte (ym ≤ heute) werden exakt übernommen; künftige Werte als Korrektur (Bankwert − eigene Rechnung ohne Sondertilgungen), damit Sondertilgungen erhalten bleiben. `rate` gilt ab diesem Monat.

## Storniert, Gast zahlt trotzdem (ab 2.4)
- Buchungsfeld `stoBez:true` (+ `stornoAm`). Anders als `storniert` bleibt die Buchung in `fwList()`: Auszahlung, Spartopf, Urlaubskonto, Steuer und Excel zählen weiter.
- `fwD()`: Gästebeitrag 0 (außer von Hand), `nOcc=0` (keine belegten Nächte in Statistik); `fwPublish()` lässt sie aus der Belegung weg.
- `fwUpdate(...,{stoBez:true|false})`; Knöpfe `data-fwstobez` / `data-fwstobez0` im Zettel; Textbefehl „… storniert, Gast zahlt trotzdem“ bzw. KI-Feld `storno_bezahlt`.
- Sondertilgungs-Rechner (Karte `#k-was`, `rKWas()` in views2.js): rechnet `sparda()`/`ingRows()` mit einer zusätzlichen Sondertilgung (über eine temporär getauschte `S.kredit`-Kopie, `kWithSonder`) und zeigt Zinsersparnis, Fertig-Monat, Rest 03/2053. Speichert nichts. Textbefehl: Aktion `kwas` (Frageform „was bringt / lohnt …“).

## Version 2.5 (26.10.2026)
- Stornofrist 0 Tage = nicht kostenlos stornierbar → `nonref:true`, `sicher:true` sofort (fewo.js `fwD`).
- Monatsabschluss-Check: `closeCheck(sh)` in views1.js, Container `#m-check`; erster Tipp auf „abschließen“ zeigt die Liste, zweiter schließt. `armed` ist blockbezogen (wird beim Blockwechsel zurückgesetzt).
- Automatische Sicherung: `autoBackup(ym)` in backup.js schreibt `sicherung/<JJJJ-MM>` (volle `bkData()`), Index in `config/sicherungen` = `{l:[{id,am,n}]}`, max. 12. Liste + Download unter Einstellungen (`#bk-auto`, `rBkAuto()`), wird in `rEinst()` gerendert. Firestore-Regeln decken `sicherung/*` über `{document=**}` ab.
- `bkAlt()` berücksichtigt auch automatische Sicherungen.
- Sichtbarer Fehlerbalken `showErr()` (main.js) statt stummem Hängen, wenn `render()` oder ein globaler Fehler auftritt.
- Seit Oktober 2026 gibt es eine zweite App „Vulkaneifeloase Verwaltung“ (eigene HTML-Datei, anderer Chat). Sie nutzt DIESELBE Firestore-Datenbank: liest/schreibt `fewo/*` (gleiche Felder, Liste `HB_KEYS` = `strip()`-Liste hier), `config/urlaub`, `config/einstellungen.fewo` (Rechenregeln) und `public/belegung`; ihre eigenen Daten liegen in `fewoverwaltung/*` und `rechnungen/*`. Beim Ändern des Buchungs-Datenmodells (fewo.js `strip`, `fwD`) immer beide Apps anpassen. Sondertilgungen, Kredite, Pläne usw. betreffen nur das Haushaltsbuch.

## Stand der Quellen (26.10.2026, nachmittags)
- Alles liegt im GitHub-Repository `pati380/Haushaltsbuch` (öffentlich): die laufende App im Wurzelverzeichnis (`index.html`, `fewo.html`, `config.js`, `vorlage.js`, `manifest.json`, `icon.svg`), der Quellcode des Haushaltsbuchs in `quellcode/`, der Quellcode des Verwaltungsprogramms in `quellcode-fewo/`, diese Datei und `LIES-MICH-ZUERST.html`.
- Die Quellen in `quellcode/` sind wieder auf dem Stand der gebauten `index.html` (Ferienwohnungs-Umbau, Gutschrift-Karte mit Zurück/Vor, Storno 0 Tage, 2.5-Neuerungen). `bash quellcode/build.sh` baut `index.html` korrekt (schreibt nach `../1_App-fuer-GitHub/index.html` → Ergebnis ins Wurzelverzeichnis kopieren).
- NICHT im Repository (öffentlich!): Firestore-Regeln (`2_Firebase/firestore-regeln.txt`) und Sicherungen (`4_Sicherungen/`, enthalten echte Finanzdaten). Die liegen nur in Tills Komplettpaket-Zip. Nie Finanzdaten, IBAN oder Schlüssel in das Repository legen.
- Arbeitet Till parallel in mehreren Chats: immer zuerst `git pull`, dann an den Quellen ändern, bauen, testen, pushen. Direkte Patches an der gebauten `index.html` vermeiden.

## Verwaltungsprogramm „Vulkaneifeloase Verwaltung“ (`fewo.html`)
- Eigene Seite im selben Repository, gleiche Firebase-Anmeldung und -Datenbank. Quelle: `quellcode-fewo/fewo.src.html` (eine Datei: CSS + HTML + JS); `python3 quellcode-fewo/build.py` baut `out/fewo.html` (ergänzt Firebase-Skripte, `config.js`, Manifest). Ergebnis ins Wurzelverzeichnis kopieren.
- Bereiche: Übersicht (Kennzahlen, nächste Gäste, Aufgabenliste, Kontonetto/Jahr, Plattformkosten, Gästebeitrag je Quartal, Steuer/DAC7), Buchungen (KI-Auslesen, Formular, Buchungsvereinbarung/Kaution/E-Mails auf DE/EN/NL, Sperr-Erinnerung), Kalender (Belegung, Notizen, Feiertage RLP + Koningsdag), Preise (Kanalvergleich, Privatpreis, Zusatzgast, Preistabelle, Jahresauswertung), Rechnungen (fortlaufende Nummern per Transaktion, Storno), Garage, Einstellungen, Konto & Daten (Sicherung, Gästedaten-Bereinigung).
- Daten: Buchungen = Haushaltsbuch-Datensatz in `fewo/JJJJ` (Felder wie `strip()`), Zusatzdaten (Gast, Vertrag, Kaution, Sperre) in `fewoverwaltung/buchungen` (`m.<id>`), Rechnungen `fewoverwaltung/rechnungen` (`r[]`, `next`), Garage `fewoverwaltung/garagen`, Kalender `fewoverwaltung/kalender` (`m.<id>`), Einstellungen `fewoverwaltung/einstellungen`. Rechenregeln (Gästebeitrag, Provision, Spartopf, Airbnb-Gebühr) werden mit `config/einstellungen.fewo` geteilt (`RATE_MAP`). Urlaubskonto `config/urlaub` und `public/belegung` werden beim Speichern einer Buchung aktualisiert (Transaktionen).
- Direktbuchungen zählen erst ab Status „Bestätigt“ fürs Haushaltsbuch; Status „storniert_bezahlt“ bei Direktbuchungen bucht die Stornopauschale (`calc().erhalten`). Stornofrist je Buchung (`stoTage`), 0 = nicht stornierbar.
- Testmodus mit Beispieldaten nur, wenn kein `config.js` geladen ist und die Seite nicht auf github.io läuft; auf der echten Seite erscheint sonst eine Fehlermeldung.
- Tarife: Booking Standard Rate 105 € für 3 Gäste, Belegungsabschläge 10 %/20 %, Non-refundable −10 %, Weekly −8 %, Weekly ohne Storno −15 %, Sauna-Rate 125/118,75/117,50 €, Genius 10 %; Airbnb 98 €/Nacht, Gebühr 15,5 % + MwSt (18,45 %). Gästebeitrag 2,10 € je Erwachsenem/Nacht (unter 18, beruflich, GdB ≥ 50 befreit). Tourismusbeitrag ≈ 2,97 % vom Umsatz (18 % Gewinnsatz × 16,5 % Hebesatz).

## Kontoauszug anonymisieren (2.6, 30.10.2026)
- Quelle `quellcode/anon.js` (in `build.sh` zwischen `strom.js` und `backup.js`), Karte in `body.html` vor „Sicherung“ (Einstellungen), Listener `cfg('anonregeln')` in `main.js`, Stil `.warnrow` in `extra.css`, Hilfe-Abschnitt in `hilfe.js`.
- Liest CSV-Exporte (Sparda, ING u. a.; Spalten werden über die Kopfzeile erkannt, `;`/`,`/Tab, UTF-8 oder Windows-1252, Soll/Haben-Spalte oder Vorzeichen).
- Kategorien `ANON_CATS`, Schlagwörter `ANON_RULES`, erlaubte Firmennamen `ANON_BRANDS`. Von Hand korrigierte Zuordnungen → `config/anonregeln` {wort: kategorie} (nur eigene Datenbank; Wörter, die in vielen Zeilen vorkommen, z. B. eigener Name, werden nicht gelernt).
- **PDF-Kontoauszüge** (seit 30.10.): pdf.js wird bei Bedarf per `import()` von cdn.jsdelivr.net geladen (`ANON_PDFJS`, pdfjs-dist 6.2.108 legacy). `anonPdfPages` baut Zeilen aus Textpositionen, `anonParsePdf` erkennt Buchungen (Zeile beginnt mit Datum + Betrag rechts; Folgezeilen = Verwendungszweck; Kopf-/Fußzeilen über Wiederholung auf mehreren Seiten ausgefiltert). Vorzeichen: `-`/`+`, `S`/`H` oder Soll-/Haben-Spalte aus der Kopfzeile. Jahr aus dem Zeitraum (auch Jahreswechsel). Kontrolle alter + Summe = neuer Kontostand wird angezeigt. Eingescannte PDFs (ohne Text) → Hinweis. Mehrere Dateien gleichzeitig, Dubletten werden entfernt.
- Auswertung `anonAnalyse()`: Einnahmen/Ausgaben, Ausgaben je Kategorie (ohne „Übertrag eigene Konten“), je Monat, größte Ausgaben, wiederkehrende Zahlungen.
- **Konten:** eigene IBAN eines Auszugs (erste IBAN, `anonEnd` → letzte 4 Ziffern) gruppiert die Dateien; Zuordnung Endziffer → Kontoname in `config/anonkonten` (Listener in main.js). Steht in einer Buchung die IBAN eines anderen geladenen Kontos → „Übertrag eigene Konten“. ING-Saldo „… Euro“ wird erkannt.
- **Hauptzweck: Datei für den Claude-Chat.** Konto je IBAN wählbar (`ANON_ACCTS`), Art der Buchung aus allgemeinen Begriffen (`anonArt`). Export (`anonExport`, .txt): Kopf mit Zeitraum, Konten inkl. Kontostand-Kontrolle, Summen je Kategorie, dann CSV `Datum;Konto;Betrag;Art;Kategorie;Haendler`. Auswertung und Buchungsliste im Tool sind eingeklappt.
- Früher: Export nur `Datum;Betrag;Kategorie;Haendler`; vor dem Export Sicherheitsprüfung gegen IBAN, lange Ziffernfolgen und E-Mail. Alles läuft im Browser, nichts wird hochgeladen.
