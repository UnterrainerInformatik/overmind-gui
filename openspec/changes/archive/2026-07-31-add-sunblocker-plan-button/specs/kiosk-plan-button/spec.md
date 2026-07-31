## ADDED Requirements

### Requirement: Configuration shape

Ein Plan-Panel SHALL über ein `item`-Objekt konfiguriert werden, das eine numerische `planId` enthält. Das Objekt MAY zusätzlich `description` (HTML-Beschriftung), `icon` (Material-Icon-Name), `colorActive` (rohe CSS-Farbe für Rahmen und Avatar im aktiven Zustand) und `colorActiveBg` (rohe CSS-Farbe für die Panel-Füllung im aktiven Zustand) tragen. Fehlt `planId`, MUST das Panel keine Aktion auslösen und den Konfigurationsfehler auf der Konsole melden.

#### Scenario: Minimale Konfiguration
- **WHEN** ein `item` mit ausschließlich `planId: 116` übergeben wird
- **THEN** rendert das Panel fehlerfrei und nutzt die Standard-Farbsemantik sowie das Standard-Icon

#### Scenario: Vollständige Konfiguration
- **WHEN** ein `item` mit `planId`, `description`, `icon`, `colorActive` und `colorActiveBg` übergeben wird
- **THEN** rendert das Panel Beschriftung und Icon aus der Konfiguration und verwendet die konfigurierten Aktiv-Farben

#### Scenario: Fehlende planId
- **WHEN** ein `item` ohne `planId` übergeben wird und der Benutzer das Panel antippt
- **THEN** wird kein Backend-Aufruf abgesetzt und ein Fehler auf der Konsole protokolliert

### Requirement: Active state resolution

Das Panel SHALL seinen aktiven Zustand ausschließlich aus dem Backend-Plan-Status ableiten, indem es `plansService.isPlanEnabled(item.planId)` aufruft. Der Aufruf MUST über den bestehenden `KioskPanel.isEnabled`-Polling-Mechanismus (alle 500 ms) erfolgen. Das Panel MUST das Ergebnis zusätzlich in eigenem Komponenten-State spiegeln, damit die Farb-Props im selben Tick gesetzt werden können. Das Panel MUST das Intervall beim Zerstören der Komponente freigeben.

#### Scenario: Plan ist eingeschaltet
- **WHEN** ein Poll-Tick läuft und `isPlanEnabled` für die konfigurierte `planId` `true` liefert
- **THEN** gilt das Panel als aktiv

#### Scenario: Plan ist ausgeschaltet
- **WHEN** ein Poll-Tick läuft und `isPlanEnabled` für die konfigurierte `planId` `false` liefert
- **THEN** gilt das Panel als inaktiv

#### Scenario: Plan wird vom Backend umgeschaltet
- **WHEN** der Plan ohne Zutun der UI (z. B. durch Cron oder einen anderen Plan) deaktiviert wird
- **THEN** zeigt das Panel spätestens beim nächsten Poll-Tick den inaktiven Zustand

#### Scenario: Panel wird zerstört
- **WHEN** die Ansicht mit dem Panel verlassen wird
- **THEN** laufen keine weiteren Plan-Status-Abfragen für dieses Panel

### Requirement: Toggle on tap

Ein Tap auf das Panel SHALL den konfigurierten Plan umschalten. Der Aufruf MUST über `dispatchMultiStateAction({ kind: 'plan-toggle', planId: item.planId })` aus `src/types/multiStateButton.ts` erfolgen, sodass die Payload-Struktur (`applianceId: 20`, `actorPath: 'actor'`, Command `toggle`) nicht erneut im Code aufgebaut wird.

#### Scenario: Einschalten
- **WHEN** das Panel inaktiv ist und der Benutzer es antippt
- **THEN** wird `plansService.execute` mit `{ applianceId: 20, actorPath: 'actor', commands: [{ name: 'toggle', params: [[<planId>]] }] }` aufgerufen

#### Scenario: Ausschalten
- **WHEN** das Panel aktiv ist und der Benutzer es antippt
- **THEN** wird derselbe Toggle-Aufruf für dieselbe `planId` abgesetzt

### Requirement: No optimistic update

Das Panel MUST seine Darstellung nach einem Tap NICHT sofort umschalten. Farbe, Icon und Beschriftung SHALL sich erst ändern, wenn ein Poll-Tick den neuen Plan-Status geliefert hat.

#### Scenario: Darstellung nach erfolgreichem Tap
- **WHEN** der Benutzer das Panel antippt und der Toggle-Aufruf erfolgreich zurückkehrt
- **THEN** bleibt die Darstellung unverändert, bis der nächste Poll-Tick den neuen Status liefert

#### Scenario: Darstellung nach fehlgeschlagenem Tap
- **WHEN** der Toggle-Aufruf einen Fehler wirft
- **THEN** zeigt das Panel weiterhin den tatsächlichen, gepollten Plan-Status an

### Requirement: Double-tap protection

Solange ein Toggle-Aufruf für das Panel offen ist, MUST das Panel weitere Taps verwerfen und keinen zweiten Aufruf absetzen. Die Sperre MUST auch dann aufgehoben werden, wenn der Aufruf mit einem Fehler endet.

#### Scenario: Zweiter Tap während laufendem Aufruf
- **WHEN** der Benutzer das Panel antippt und vor Rückkehr des Aufrufs erneut antippt
- **THEN** wird genau ein Toggle-Aufruf abgesetzt

#### Scenario: Bedienbarkeit nach Fehler
- **WHEN** ein Toggle-Aufruf mit einem Fehler endet und der Benutzer danach erneut antippt
- **THEN** setzt das Panel einen neuen Toggle-Aufruf ab

### Requirement: Color semantics

Die Panel-Farbe SHALL sich allein aus dem aufgelösten Plan-Status ergeben. Im inaktiven Zustand MUST das Panel die Standard-Kiosk-Farbe `off` (blau) verwenden, identisch zu allen anderen Kiosk-Panels. Im aktiven Zustand MUST das Panel `colorActive` für Rahmen und Avatar sowie `colorActiveBg` als Füllung verwenden, sofern konfiguriert; sind diese Felder nicht gesetzt, MUST es auf die Standard-Kiosk-Farbe `on` (gelb) zurückfallen.

#### Scenario: Inaktiv
- **WHEN** der konfigurierte Plan nicht eingeschaltet ist
- **THEN** rendert das Panel in der blauen `off`-Farbe, unabhängig davon, ob Aktiv-Farben konfiguriert sind

#### Scenario: Aktiv mit konfigurierter Farbe
- **WHEN** der konfigurierte Plan eingeschaltet ist und `colorActive`/`colorActiveBg` gesetzt sind
- **THEN** rendert das Panel Rahmen und Avatar in `colorActive` und die Panel-Füllung in `colorActiveBg`

#### Scenario: Aktiv ohne konfigurierte Farbe
- **WHEN** der konfigurierte Plan eingeschaltet ist und weder `colorActive` noch `colorActiveBg` gesetzt sind
- **THEN** rendert das Panel in der gelben `on`-Standardfarbe

### Requirement: Raw background color support in the panel shell

Die Shell `KioskPanel` SHALL die bereits deklarierte Prop `bgColorRaw` auswerten und die übergebene rohe CSS-Farbe als Hintergrund der inneren Karte setzen — analog zur bestehenden Behandlung von `borderColorRaw`. Ist `bgColorRaw` nicht gesetzt, MUST sich `KioskPanel` exakt wie bisher verhalten und seine Hintergrundklasse über `getBgColor()` bestimmen.

#### Scenario: bgColorRaw gesetzt
- **WHEN** ein Panel `bgColorRaw` mit einem CSS-Farbwert übergibt
- **THEN** wird die innere Karte mit dieser Farbe hinterlegt und die aus `getBgColor()` abgeleitete Klassenfarbe überschrieben

#### Scenario: bgColorRaw nicht gesetzt
- **WHEN** ein bestehendes Panel ohne `bgColorRaw` gerendert wird
- **THEN** ist seine Darstellung identisch zum Verhalten vor dieser Change

### Requirement: Error handling

Schlägt die Plan-Status-Abfrage fehl, MUST das Panel den Fehler protokollieren und als inaktiv gelten, statt die Poll-Schleife abzubrechen. Schlägt der Toggle-Aufruf fehl, MUST das Panel den Fehler protokollieren und bedienbar bleiben.

#### Scenario: Status-Abfrage schlägt fehl
- **WHEN** `isPlanEnabled` für die konfigurierte `planId` einen Fehler wirft
- **THEN** protokolliert das Panel den Fehler, gilt als inaktiv und fragt beim nächsten Tick erneut ab

#### Scenario: Toggle schlägt fehl
- **WHEN** der Toggle-Aufruf einen Fehler wirft
- **THEN** protokolliert das Panel den Fehler und bleibt für weitere Taps bedienbar

### Requirement: Accessibility

Das Panel SHALL ein Touch-Ziel von mindestens 44×44 CSS-Pixeln bieten. Der Zustand MUST zusätzlich zur Farbe über Icon und Beschriftung erkennbar bleiben.

#### Scenario: Mindest-Touchfläche
- **WHEN** das Panel auf einem Kiosk-Screen gerendert wird
- **THEN** misst seine Trefferfläche mindestens 44×44 CSS-Pixel

#### Scenario: Erkennbarkeit ohne Farbe
- **WHEN** das Panel in Graustufen betrachtet wird
- **THEN** bleiben Beschriftung und Icon lesbar und identifizieren den Knopf

### Requirement: Sunblocker reference configuration

Die Change SHALL eine Sunblocker-Instanz in der Kiosk-Übersicht ausliefern: `planId: 116`, Beschriftung "Sunblocker", türkise Aktiv-Farben (`#004d40` für Rahmen und Avatar, `rgba(0, 18, 15, 0.9)` als Füllung). Das Panel MUST als letztes Element der Schalter-Reihe stehen, unmittelbar hinter dem Panel "Rollos Elternschlafzimmer".

#### Scenario: Sunblocker inaktiv
- **WHEN** Plan 116 nicht eingeschaltet ist
- **THEN** zeigt der Sunblocker-Knopf die blaue Standardfarbe wie die benachbarten Knöpfe

#### Scenario: Sunblocker aktiv
- **WHEN** Plan 116 eingeschaltet ist
- **THEN** zeigt der Sunblocker-Knopf türkisen Rahmen, türkisen Avatar und türkise Füllung

#### Scenario: Sunblocker einschalten
- **WHEN** Plan 116 ausgeschaltet ist und der Benutzer den Sunblocker-Knopf antippt
- **THEN** wird Plan 116 getoggelt und der Knopf erscheint nach dem nächsten Poll-Tick türkis

#### Scenario: Sunblocker ausschalten
- **WHEN** Plan 116 eingeschaltet ist und der Benutzer den Sunblocker-Knopf antippt
- **THEN** wird Plan 116 getoggelt und der Knopf erscheint nach dem nächsten Poll-Tick wieder blau

#### Scenario: Position in der Übersicht
- **WHEN** die Kiosk-Übersicht gerendert wird
- **THEN** ist der Sunblocker-Knopf das letzte Panel der Schalter-Reihe, nach "Rollos Elternschlafzimmer"
