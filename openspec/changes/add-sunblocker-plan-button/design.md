## Context

Die Kiosk-Übersicht (`src/views/KioskOverview.vue`) rendert in der mittleren Reihe eine Sammlung von Bedien-Panels. Es gibt dafür heute zwei Bausteine:

- `KioskSwitchPanel` — ein Tap löst ein Appliance-Event aus (`eventsService.trigger`); der Plan-Status wird nur gelesen, um das Panel einzufärben. Der Knopf *schaltet* also keinen Plan, er drückt einen virtuellen Taster.
- `KioskMultiStatePanel` — kann Pläne direkt togglen (`plan-toggle`), erzwingt aber einen Auswahldialog und damit zwei Taps.

Beide bauen auf der Shell `KioskPanel`, die alle 500 ms eine injizierte `isEnabled()`-Funktion aufruft und daraus Rahmen- und Hintergrundfarbe ableitet (`off` = blau = inaktiv, `on` = gelb = aktiv, definiert in `src/plugins/vuetify.ts`).

Für den Sunblocker fehlt genau die Kombination dazwischen: **ein Tap, ein Plan, an/aus** — plus eine eigene Aktiv-Farbe (türkis), damit dieser Knopf sich von den gelben Rollo-Overrides absetzt.

Randbedingung: Der Plan-Status ist die einzige Wahrheit. Das Backend kann Pläne jederzeit selbst aktivieren oder deaktivieren (Cron, andere Pläne, Automatik), deshalb darf die UI ihren Zustand nicht optimistisch vorwegnehmen.

## Goals / Non-Goals

**Goals:**

- Wiederverwendbare Komponente `KioskPlanPanel` für den Fall "ein Tap togglet genau einen Plan".
- Panel-Zustand kommt ausschließlich aus `plansService.isPlanEnabled(planId)`.
- Frei konfigurierbare Aktiv-Farbe pro Panel-Instanz, ohne dass andere Kiosk-Panels sich ändern.
- Sunblocker-Instanz (Plan 116) als letztes Panel der Schalter-Reihe in der Kiosk-Übersicht.
- Robust gegen Doppel-Taps und gegen fehlschlagende Backend-Aufrufe.

**Non-Goals:**

- Keine Änderung an `KioskMultiStatePanel` oder an bestehenden `KioskSwitchPanel`-Konfigurationen.
- Keine Migration bestehender Knöpfe auf die neue Komponente (kann später einzeln passieren).
- Keine neue Vuetify-Theme-Farbe, kein globaler Farb-Refactor.
- Kein SSE-/Push-basiertes Plan-Status-Update — das bestehende 500-ms-Polling bleibt.
- Keine Bestätigungsabfrage vor dem Schalten (wie bei allen anderen Kiosk-Knöpfen auch nicht).

## Decisions

### 1. Neue Komponente statt zusätzlicher MultiState-Konfiguration

Eine zweistufige `MultiStateButtonConfig` ("AUTO" / "Sunblocker") wäre ohne neuen Code machbar, kostet den Benutzer aber zwei Taps (Panel → Dialogeintrag) für einen simplen An/Aus-Schalter — auf einem Wandtablet spürbar schlechter. `KioskPlanPanel` ist mit ~60 Zeilen die kleinere Lösung am Bedienziel.

*Alternative verworfen:* `KioskSwitchPanel` um einen optionalen `planId`-Modus erweitern. Damit hätte eine Komponente zwei sich ausschließende Aktionsarten und zwei Bedeutungen von `isEnabled` — schlechter les- und testbar als zwei schlanke Komponenten.

### 2. Toggle über `dispatchMultiStateAction`, nicht über einen eigenen `plansService.execute`-Aufruf

`src/types/multiStateButton.ts` kapselt bereits die Magic Constants `applianceId: 20` und `actorPath: 'actor'` sowie die Command-Struktur. `KioskPlanPanel` ruft daher `dispatchMultiStateAction({ kind: 'plan-toggle', planId })` auf. Damit existiert die Payload-Form weiterhin an genau einer Stelle (`PlanPanel.togglePlan` bleibt als eigener Aufrufer bestehen — dessen Zusammenführung ist bewusst nicht Teil dieser Change).

*Alternative verworfen:* Die Payload in `KioskPlanPanel` erneut aufbauen — dritte Kopie derselben Konstanten.

### 3. Zustands-Spiegelung über den `isEnabled`-Callback als Seiteneffekt

`KioskPanel` hält `enabled` intern und reicht es nur über Slot-Props nach unten. Für die Farbwahl braucht `KioskPlanPanel` den Zustand aber schon *als Prop* (`bgColorRaw`/`borderColorRaw` werden von außen gesetzt). Deshalb übernimmt `KioskPlanPanel` das Muster, das `KioskMultiStatePanel` bereits verwendet: Die als `isEnabled` übergebene Methode schreibt das Ergebnis zusätzlich in ein eigenes Datenfeld `active` und gibt es zurück.

```
async calculateEnabled () {
  try {
    this.active = !!(await plansService.isPlanEnabled(this.item.planId))
  } catch (e) {
    console.error('KioskPlanPanel: plan check failed', this.item.planId, e)
    this.active = false
  }
  return this.active
}
```

Beide Zustände (`KioskPanel.enabled` und `KioskPlanPanel.active`) werden im selben Tick aus demselben Wert gesetzt und können nicht auseinanderlaufen.

*Alternative verworfen:* `KioskPanel` so umbauen, dass es die Farben selbst zustandsabhängig auflöst (z. B. `bgColorRawActive`). Das ändert eine von acht Panels genutzte Shell stärker als nötig.

### 4. Türkis über rohe Farbwerte statt über eine neue Theme-Farbe

`KioskPanel` besitzt bereits `borderColorRaw` (verdrahtet, von `KioskMultiStatePanel` genutzt) und `bgColorRaw` (deklariert, aber nie ausgewertet). Diese Change verdrahtet `bgColorRaw` analog:

- Innere `v-card` bekommt `:style="bgColorRaw ? { backgroundColor: bgColorRaw + ' !important' } : {}"`.
- `getBgColor()` bleibt unverändert; der Inline-Style gewinnt gegen die Klasse. Ohne gesetzte Prop verhält sich `KioskPanel` exakt wie bisher — die Änderung ist für alle bestehenden Aufrufer ein No-op.

Konkrete Werte für den Sunblocker: `#00bfa5` für Rahmen und Avatar, `rgba(0, 191, 165, 0.35)` als Hintergrund. Die halbtransparente Füllung liegt über dem Karten-Hintergrund und funktioniert dadurch in Hell- *und* Dunkelmodus, ohne zwei Farbsätze pflegen zu müssen — dasselbe Vorgehen wie bei `colorDialog: 'rgba(255, 0, 0, 0.15)'` in der bestehenden `allStateMulti`-Konfiguration.

*Alternative verworfen:* Eine Theme-Farbe `sunblocker` in `src/plugins/vuetify.ts`. Vuetify-2-Klassenmodifikatoren wie `darken-4`/`lighten-1`, die `getBgColor()` anhängt, müssten dann für die neue Farbe zuverlässig generiert werden — mehr globale Angriffsfläche für genau einen Knopf.

### 5. Farb-Fallback, wenn keine Aktiv-Farbe konfiguriert ist

`colorActive`/`colorActiveBg` sind optional. Fehlen sie, rendert das Panel im normalen `on`/`off`-Schema — `KioskPlanPanel` bleibt damit ein allgemein nutzbarer Plan-Schalter und nicht nur ein Sunblocker-Spezialfall.

### 6. Doppel-Tap-Schutz

Zwischen Tap und sichtbarer Reaktion liegen bis zu 500 ms (Poll-Intervall) plus Backend-Laufzeit. Ohne Schutz löst ein ungeduldiger zweiter Tap einen zweiten Toggle aus und der Plan landet wieder im Ausgangszustand. `KioskPlanPanel` hält deshalb ein `pending`-Flag und verwirft Klicks, solange ein Toggle-Request offen ist. Das Flag wird in `finally` zurückgesetzt, damit auch ein fehlgeschlagener Request den Knopf nicht dauerhaft blockiert.

### 7. Platzierung

Der Sunblocker wird als letztes Element der zweiten `v-row` in `KioskOverview.vue` eingefügt, hinter `<KioskMultiStatePanel :config="shuttersParentsBedroomMulti">`. Die Konfiguration liegt — wie alle anderen dort — inline im `data()`-Block der View.

## Risks / Trade-offs

- **Türkis-Hintergrund ist im Dunkelmodus zu blass oder im Hellmodus zu kräftig** → Der Wert `rgba(0, 191, 165, 0.35)` ist ein einzelnes, an einer Stelle in `KioskOverview.vue` liegendes Literal und kann nach dem ersten Blick aufs Gerät ohne Codeänderung an anderer Stelle nachjustiert werden.
- **Inline-Style mit `!important` überschreibt künftige Panel-Styles** → Der Style wird nur gesetzt, wenn `bgColorRaw` gefüllt ist; alle bestehenden Panels sind nicht betroffen. Dieselbe Technik ist mit `borderColorRaw` bereits im Einsatz.
- **Ein Tap schaltet ohne Rückfrage einen realen Plan** → Bewusst so, konsistent mit allen anderen Kiosk-Knöpfen. Der Doppel-Tap-Schutz verhindert das häufigste Fehlbedienungsmuster.
- **Bis zu 500 ms ohne sichtbares Feedback nach dem Tap** → Akzeptiert, gleiches Verhalten wie bei `KioskMultiStatePanel`. Ein Ladeindikator würde die Panel-Optik gegenüber den Nachbarknöpfen brechen; falls sich das im Betrieb als störend erweist, ist es eine eigene, breiter angelegte Change über alle Kiosk-Panels.
- **`isPlanEnabled` schlägt dauerhaft fehl (Backend weg)** → Panel fällt auf "inaktiv/blau" zurück und loggt; es bleibt bedienbar, zeigt aber einen möglicherweise falschen Zustand. Das entspricht dem Verhalten der bestehenden Panels und wird hier nicht neu gelöst.

## Migration Plan

Rein additiv, kein Datenmodell, keine Backend-Änderung. Rollback = Commit zurücknehmen; die einzige Änderung an geteiltem Code (`KioskPanel.bgColorRaw`) ist für bestehende Aufrufer wirkungslos.

## Open Questions

Keine. Plan-ID (116), Platzierung (letzter Knopf der Schalter-Reihe), Aktiv-Farbe (türkis) und Toggle-Semantik sind geklärt.
