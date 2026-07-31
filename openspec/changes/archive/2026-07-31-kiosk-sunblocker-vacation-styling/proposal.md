## Why

Auf dem Kiosk-Screen sind "URLAUB" und "Sunblocker" die beiden Knöpfe, die einen länger laufenden Ausnahmezustand des Hauses anzeigen — im Gegensatz zu den übrigen Knöpfen, die einen kurzen Taster drücken. Optisch ist das heute nicht erkennbar: Der Sunblocker leuchtet aktiv türkis, URLAUB dagegen im normalen Gelb wie jeder Rollo-Override. Beide sollen dieselbe Farbsprache bekommen, damit auf einen Blick klar ist, welche Dauerzustände gerade aktiv sind.

Zusätzlich hat der eingeschaltete Sunblocker eine Bedienfalle: Bei aktiver Beschattung fährt die Terrassenmarkise bzw. das Rollo zu, und wer dann auf die Terrasse geht, ohne vorher "Terrassentüre auf" zu aktivieren, sperrt sich unter Umständen aus. Dieser Zusammenhang steht nirgends auf dem Screen — er muss genau dort stehen, wo er relevant wird: am eingeschalteten Sunblocker-Knopf.

## What Changes

- `KioskSwitchPanel` bekommt dieselbe optionale Aktiv-Farbunterstützung, die `KioskPlanPanel` bereits hat: `colorActive` (Rahmen und Avatar) und `colorActiveBg` (Füllung), wirksam nur im aktiven Zustand. Ohne diese Felder bleibt jedes bestehende Switch-Panel unverändert.
- Die `vacation`-Konfiguration ("URLAUB") in `KioskOverview.vue` erhält die Sunblocker-Farben (`#004d40` / `rgba(0, 18, 15, 0.9)`).
- `KioskPlanPanel` bekommt ein optionales zweites Textfeld `descriptionActive`: eine kleine, unauffällige Hinweiszeile unter der Hauptbeschriftung, die ausschließlich im aktiven Zustand gerendert wird. Typografie identisch zu den Label-Zeilen der Multi-State-Knöpfe (`text-caption`, reduzierte Deckkraft).
- Die `sunblocker`-Beschriftung wird von "Sunblocker" auf "SUNBLOCKER" (Versalien) geändert, passend zur bereits versalen Beschriftung "URLAUB".
- Der Sunblocker-Hinweistext lautet: "Nicht vergessen 'Terrassentüre auf' einzuschalten, falls Du auf die Terrasse gehst..."
- Das Sunblocker-Panel wird verbreitert (`maxWidth` 360px statt der Standard-180px), damit der Hinweis in zwei Zeilen umbricht statt in fünf. Dafür wird `maxWidth`/`minWidth` pro Panel-Instanz konfigurierbar.

## Capabilities

### New Capabilities

Keine.

### Modified Capabilities

- `kiosk-plan-button`: Die Requirements "Configuration shape" und "Color semantics" werden erweitert — ein Plan-Panel kann zusätzlich einen nur im aktiven Zustand sichtbaren Hinweistext (`descriptionActive`) sowie eine abweichende Panel-Breite tragen. Die Requirement "Sunblocker reference configuration" wird angepasst: Versal-Beschriftung, Hinweiszeile, breiteres Panel. Neu hinzu kommt die Requirement, dass die Aktiv-Farbsemantik auch für ereignisauslösende Kiosk-Schalter (`KioskSwitchPanel`) verfügbar ist, samt URLAUB-Referenzkonfiguration.

## Impact

- **Geändert**: `src/components/KioskSwitchPanel.vue` — Zustands-Spiegelung in eigenes `active`-Feld plus Durchreichen der Aktiv-Farben; rückwärtskompatibel, Panels ohne Farbfelder rendern exakt wie bisher.
- **Geändert**: `src/components/KioskPlanPanel.vue` — optionale Hinweiszeile, Breiten-Props.
- **Geändert**: `src/views/KioskOverview.vue` — `vacation`- und `sunblocker`-Konfiguration.
- **Unverändert**: `KioskPanel.vue` (die benötigten Props `borderColorRaw`, `bgColorRaw`, `maxWidth`, `minWidth` existieren bereits), `KioskMultiStatePanel.vue`, `plansService`, `eventsService`, `multiStateButton.ts`.
- **Backend**: keine Änderung. Keine neuen Endpunkte, keine zusätzlichen Polls — `KioskSwitchPanel` pollt `isPlanEnabled` bereits heute für die Einfärbung.
- **Layout**: Die Schalter-Reihe enthält ein Panel doppelter Breite. Auf schmalen Geräten (Mobil) rutscht dadurch ggf. ein Panel früher in die nächste Zeile; die Reihe wächst beim Einschalten des Sunblockers um etwa eine Textzeile in der Höhe.
- **Kiosk-Modus**: betrifft Tablet, Mobil und PC gleichermaßen.
- **Sprache**: Beschriftungen sind wie alle Kiosk-Knöpfe fest auf Deutsch in der View hinterlegt; keine i18n-Ressourcen betroffen.
