## 1. Aktiv-Farben für `KioskSwitchPanel`

- [x] 1.1 In `src/components/KioskSwitchPanel.vue` ein Datenfeld `active: false` ergänzen
- [x] 1.2 Methode `calculateEnabled()` implementieren: `item.isEnabled()` aufrufen, Ergebnis in `active` spiegeln und zurückgeben; fehlende Funktion und geworfene Fehler abfangen, protokollieren und `active = false` setzen
- [x] 1.3 `:isEnabled="item.isEnabled"` durch `:isEnabled="calculateEnabled"` ersetzen, damit die Spiegelung im Poll-Zyklus der Shell läuft
- [x] 1.4 Farbbindung ergänzen: `:borderColorRaw="active && item.colorActive ? item.colorActive : null"` und `:bgColorRaw="active && item.colorActiveBg ? item.colorActiveBg : null"` an `KioskPanel` durchreichen
- [x] 1.5 Avatar-Farbe binden: aktiv `item.colorActive` (falls gesetzt), sonst die bestehenden Klassen `on`/`off` mit `darken-1` — analog zu `KioskPlanPanel.vue`
- [x] 1.6 Prüfen, dass der Titel-Slot weiterhin die Slot-Prop `state.enabled` nutzt und Avatar, Rahmen und Füllung damit aus demselben aufgelösten Zustand stammen
- [x] 1.7 Sicherstellen, dass Switch-Panels ohne `colorActive`/`colorActiveBg` unverändert rendern (Farb-Props bleiben `null`)
- [x] 1.8 Den doppelten `<style lang="scss">`-Block in der Datei nicht vergrößern; keine neuen globalen Regeln einführen

## 2. Hinweiszeile und Breite für `KioskPlanPanel`

- [x] 2.1 In `src/components/KioskPlanPanel.vue` den Default-Slot-Inhalt in einen Flex-Column-Container umbauen: Hauptbeschriftung aus `item.description`, darunter die Hinweiszeile
- [x] 2.2 Hinweiszeile nur rendern, wenn `active && item.descriptionActive` — Inhalt per `v-html`, damit sie sich wie `description` verhält
- [x] 2.3 SCSS ergänzen: Container mit `line-height: 1.1`, Hinweiszeile in `text-caption`-Größe mit reduzierter Deckkraft (`opacity: 0.65`) — Werte gespiegelt von `.multi-state-panel-label` in `KioskMultiStatePanel.vue`
- [x] 2.4 Für die Hinweiszeile `font-size` und `line-height` mit `!important` setzen, da die umschließende `.normal-text`-Regel aus `KioskPanel.vue` 18px mit `!important` vorgibt
- [x] 2.5 `:maxWidth="item.maxWidth"` und `:minWidth="item.minWidth"` an `KioskPanel` durchreichen; bei nicht gesetzten Feldern MUSS die Shell auf ihre Defaults (`180px`/`140px`) zurückfallen
- [x] 2.6 Prüfen, dass ein `item` ohne `descriptionActive`, `maxWidth` und `minWidth` weiterhin exakt wie vor der Change rendert
- [x] 2.7 Hinweiszeile rendern, sobald `descriptionActive` gesetzt ist, und im inaktiven Zustand per `visibility: hidden` ausblenden, damit die Panel-Höhe zustandsunabhängig konstant bleibt und die Schalter-Reihe beim Schalten nicht springt

## 3. Konfiguration in der Kiosk-Übersicht

- [x] 3.1 In `src/views/KioskOverview.vue` die `sunblocker`-Konfiguration auf `description: '<b>SUNBLOCKER</b>'` (Versalien) ändern
- [x] 3.2 `descriptionActive` beim `sunblocker` ergänzen mit dem Wortlaut `Nicht vergessen 'Terrassentüre auf' einzuschalten, falls Du auf die Terrasse gehst...` — den String in doppelten Anführungszeichen notieren, damit die einfachen Anführungszeichen im Text nicht escaped werden müssen
- [x] 3.3 `maxWidth: '280px'` beim `sunblocker` ergänzen (am laufenden Build von 360px heruntergetestet); `minWidth` nicht setzen, damit das Panel auf schmalen Geräten schrumpfen darf
- [x] 3.4 In der `vacation`-Konfiguration (Methode, die `this.vacation` setzt) `colorActive: '#004d40'` und `colorActiveBg: 'rgba(0, 18, 15, 0.9)'` ergänzen
- [x] 3.5 Prüfen, dass `vacation` ansonsten unverändert bleibt: `applianceId: 183`, `sensorPath: 'switch2'`, `eventPath: 'on.click'`, `description: 'URLAUB'`, `isEnabled` über Plan 102

## 4. Verifikation

- [x] 4.1 Lint/Build durch den Benutzer ausführen lassen und gemeldete Verstöße beheben
- [x] 4.2 Prüfen: URLAUB ist bei ausgeschaltetem Plan 102 blau und bei eingeschaltetem Plan 102 türkis (Rahmen, Avatar, Füllung) — in Hell- und Dunkelmodus
- [x] 4.3 Prüfen: URLAUB und SUNBLOCKER zeigen im eingeschalteten Zustand exakt dieselben Farben
- [x] 4.4 Prüfen: Ein Tap auf URLAUB löst weiterhin das Event auf Appliance 183 / `switch2` / `on.click` aus (kein Plan-Toggle)
- [x] 4.5 Prüfen: Der Sunblocker-Knopf trägt die Beschriftung "SUNBLOCKER" in Versalien
- [x] 4.6 Prüfen: Bei eingeschaltetem Plan 116 erscheint die Hinweiszeile unter der Beschriftung, in kleiner Schrift wie die Label-Zeilen der Multi-State-Knöpfe, und wird vollständig angezeigt
- [x] 4.7 Prüfen: Bei ausgeschaltetem Plan 116 ist kein Hinweistext sichtbar, sein Platz bleibt aber reserviert
- [x] 4.8 Prüfen: Hinweiszeile und Aktiv-Farbe wechseln beim selben Poll-Tick, nicht versetzt
- [x] 4.9 Prüfen: Der Hinweistext wird vollständig angezeigt und nicht abgeschnitten
- [x] 4.10 Regressionscheck der übrigen Switch-Panels (TV, Kinderzimmer kuscheln, Biomüll auf, Terrassentüre auf, Rollos EG): unveränderte Farben in beiden Zuständen und unveränderte Aktion
- [x] 4.11 Layoutcheck auf den tatsächlich genutzten Kiosk-Auflösungen (Tablet, Mobil, PC): der Umbruch der Schalter-Reihe durch das 280px-Panel ist akzeptabel und nichts läuft horizontal über
- [x] 4.12 Prüfen: Die Höhe der Schalter-Reihe bleibt beim Ein- und Ausschalten von Plan 116 konstant
