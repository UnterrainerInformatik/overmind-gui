## 1. Panel-Shell vorbereiten

- [x] 1.1 In `src/components/KioskPanel.vue` die innere `v-card` um `:style="bgColorRaw ? { backgroundColor: bgColorRaw + ' !important' } : {}"` erweitern, sodass die bereits deklarierte Prop `bgColorRaw` wirksam wird
- [x] 1.2 Sicherstellen, dass `getBgColor()` unverändert bleibt und Panels ohne `bgColorRaw` (alle bestehenden Aufrufer) exakt dieselbe Darstellung behalten

## 2. Komponente `KioskPlanPanel`

- [x] 2.1 `src/components/KioskPlanPanel.vue` anlegen: `KioskPanel`-Shell mit Prop `item`, Avatar im Titel-Slot und `v-html`-Beschriftung aus `item.description` — Aufbau analog zu `KioskSwitchPanel.vue`
- [x] 2.2 `calculateEnabled()` implementieren: `plansService.isPlanEnabled(item.planId)` aufrufen, Ergebnis in das Datenfeld `active` spiegeln und zurückgeben; als `:isEnabled` an `KioskPanel` übergeben
- [x] 2.3 Fehler aus `isPlanEnabled` abfangen, auf der Konsole protokollieren und `active = false` setzen, damit die Poll-Schleife weiterläuft
- [x] 2.4 Klick-Handler implementieren: `dispatchMultiStateAction({ kind: 'plan-toggle', planId: item.planId })` aus `@/types/multiStateButton` aufrufen, Fehler protokollieren, keine optimistische Zustandsänderung
- [x] 2.5 Fehlende `item.planId` abfangen: keinen Aufruf absetzen, Konfigurationsfehler protokollieren
- [x] 2.6 Doppel-Tap-Schutz über ein `pending`-Flag ergänzen; Rücksetzen in `finally`, damit auch fehlgeschlagene Aufrufe den Knopf wieder freigeben
- [x] 2.7 Farbbindung ergänzen: bei `active` und gesetzten Farben `:borderColorRaw="item.colorActive"` sowie `:bgColorRaw="item.colorActiveBg"` durchreichen, sonst `null` — inaktiv bleibt damit die blaue `off`-Standardfarbe
- [x] 2.8 Avatar-Farbe binden: aktiv `item.colorActive` (falls gesetzt), sonst die Standardklassen `on`/`off` mit `darken-1` wie in `KioskSwitchPanel`
- [x] 2.9 Icon rendern: `item.icon` verwenden, mit `power_settings_new` als Fallback
- [x] 2.10 `.noFocus`-Klasse und `@import 'index.scss'` übernehmen, damit sich das Panel optisch wie die Nachbarpanels verhält

## 3. Sunblocker in der Kiosk-Übersicht

- [x] 3.1 In `src/views/KioskOverview.vue` `KioskPlanPanel` importieren und in `components` registrieren
- [x] 3.2 Konfiguration `sunblocker` im `data()`-Block ergänzen: `planId: 116`, `description: '<b>Sunblocker</b>'`, `icon: 'wb_sunny'`, `colorActive: '#004d40'`, `colorActiveBg: 'rgba(0, 18, 15, 0.9)'`
- [x] 3.3 `<KioskPlanPanel :item="sunblocker"></KioskPlanPanel>` als letztes Panel der zweiten `v-row` einfügen, direkt hinter `<KioskMultiStatePanel :config="shuttersParentsBedroomMulti">`

## 4. Verifikation

- [x] 4.1 Lint/Build durch den Benutzer ausführen lassen und gemeldete Verstöße beheben (TypeScript-Interfaces mit Semikolon, ESLint `member-delimiter-style`)
- [x] 4.2 Im laufenden UI prüfen: Sunblocker-Knopf steht als letzter in der Schalter-Reihe und ist bei ausgeschaltetem Plan 116 blau
- [x] 4.3 Prüfen: Tap schaltet Plan 116 ein, Knopf wird innerhalb von ~500 ms türkis (Rahmen, Avatar, Füllung) — in Hell- und Dunkelmodus
- [x] 4.4 Prüfen: erneuter Tap schaltet Plan 116 aus und der Knopf wird wieder blau
- [x] 4.5 Prüfen: Umschalten von Plan 116 außerhalb der UI (z. B. über die Plans-Ansicht) wird vom Knopf innerhalb eines Poll-Intervalls übernommen
- [x] 4.6 Prüfen: schneller Doppel-Tap löst nur einen Toggle aus und der Plan bleibt im gewünschten Zustand
- [x] 4.7 Prüfen: bestehende Panels (Rollos, TV, URLAUB, MultiState) sehen unverändert aus — Regressionscheck für die `KioskPanel`-Änderung
