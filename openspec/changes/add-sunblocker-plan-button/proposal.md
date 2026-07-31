## Why

Die Kiosk-Übersicht braucht einen "Sunblocker"-Knopf, der den Beschattungs-Plan (Plan-ID 116) mit einem einzigen Tap ein- und ausschaltet. Heute gibt es dafür keinen passenden Baustein: `KioskSwitchPanel` löst nur ein Appliance-Event aus (Plan-Status dient dort ausschließlich der Einfärbung), und `KioskMultiStatePanel` kann zwar Pläne togglen, verlangt aber den Umweg über einen Auswahldialog — zwei Taps für einen einzelnen An/Aus-Schalter. Zusätzlich soll dieser Knopf sich farblich von den übrigen Override-Knöpfen abheben (türkis statt gelb), damit auf dem Kiosk-Screen sofort erkennbar ist, dass gerade die Beschattung aktiv ist.

## What Changes

- Neue wiederverwendbare Komponente `KioskPlanPanel.vue`: Ein-Tap-Panel, das einen Plan direkt togglet und seinen Zustand aus dem Backend-Plan-Status ableitet (kein optimistisches UI-Update).
- Der Plan-Toggle-Aufruf wird über die vorhandene `dispatchMultiStateAction({ kind: 'plan-toggle', planId })` aus `src/types/multiStateButton.ts` abgesetzt — keine Duplizierung der `applianceId: 20` / `actorPath: 'actor'`-Konstanten.
- `KioskPanel.vue`: die bereits deklarierte, aber unbenutzte Prop `bgColorRaw` wird verdrahtet, sodass ein Panel eine freie Hintergrundfarbe setzen kann (analog zum bestehenden `borderColorRaw`).
- Neue Konfiguration in `KioskOverview.vue`: der "Sunblocker"-Knopf für Plan 116 als letztes Panel der Schalter-Reihe, hinter "Rollos Elternschlafzimmer".
- Farbsemantik des neuen Panels: inaktiv blau (Standard-`off`-Farbe wie alle anderen Kiosk-Panels), aktiv türkis statt der sonst üblichen gelben `on`-Farbe.

## Capabilities

### New Capabilities

- `kiosk-plan-button`: Ein-Tap-Kiosk-Panel, das einen einzelnen Backend-Plan togglet, seinen aktiven Zustand ausschließlich aus dem Plan-Status pollt und optional eine frei konfigurierbare Aktiv-Farbe rendert. Enthält die Sunblocker-Referenzkonfiguration (Plan 116).

### Modified Capabilities

Keine. `multi-state-button` bleibt unverändert — der neue Knopf nutzt lediglich dessen bestehende Dispatch-Hilfsfunktion mit.

## Impact

- **Neu**: `src/components/KioskPlanPanel.vue`
- **Geändert**: `src/components/KioskPanel.vue` (rückwärtskompatible Verdrahtung von `bgColorRaw`; ohne gesetzte Prop bleibt das bisherige Klassen-Verhalten identisch)
- **Geändert**: `src/views/KioskOverview.vue` (neues Panel + Konfiguration)
- **Wiederverwendet, unverändert**: `src/types/multiStateButton.ts`, `src/utils/webservices/plansService.ts`
- **Backend**: keine Änderung — es werden nur die vorhandenen Endpunkte `uinf/plans/execute` und `uinf/plans/{id}` genutzt.
- **Betrieb**: ein zusätzlicher Poll-Zyklus (`isPlanEnabled`, alle 500 ms über die `KioskPanel`-Schleife) pro gerendertem Panel — dieselbe Last wie bei jedem bestehenden Kiosk-Schalter.
- **Kiosk-Modus**: der Knopf erscheint auf allen Geräten (Tablet, Mobil, PC), die die Kiosk-Übersicht anzeigen.
