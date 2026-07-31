# kiosk-plan-button Specification

## Purpose
TBD - created by archiving change add-sunblocker-plan-button. Update Purpose after archive.
## Requirements
### Requirement: Configuration shape

Ein Plan-Panel SHALL über ein `item`-Objekt konfiguriert werden, das eine numerische `planId` enthält. Das Objekt MAY zusätzlich `description` (HTML-Beschriftung), `descriptionActive` (HTML-Hinweiszeile, nur im aktiven Zustand sichtbar), `icon` (Material-Icon-Name), `colorActive` (rohe CSS-Farbe für Rahmen und Avatar im aktiven Zustand), `colorActiveBg` (rohe CSS-Farbe für die Panel-Füllung im aktiven Zustand), `maxWidth` und `minWidth` (CSS-Breitenangaben für die Panel-Shell) tragen. Fehlt `planId`, MUST das Panel keine Aktion auslösen und den Konfigurationsfehler auf der Konsole melden.

#### Scenario: Minimale Konfiguration
- **WHEN** ein `item` mit ausschließlich `planId: 116` übergeben wird
- **THEN** rendert das Panel fehlerfrei und nutzt die Standard-Farbsemantik, das Standard-Icon und die Standardbreiten

#### Scenario: Vollständige Konfiguration
- **WHEN** ein `item` mit `planId`, `description`, `descriptionActive`, `icon`, `colorActive`, `colorActiveBg` und `maxWidth` übergeben wird
- **THEN** rendert das Panel Beschriftung und Icon aus der Konfiguration, verwendet die konfigurierten Aktiv-Farben und die konfigurierte Breite und zeigt die Hinweiszeile im aktiven Zustand

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

Das Panel MUST seine Darstellung nach einem Tap NICHT sofort umschalten. Farbe, Icon, Beschriftung und die Sichtbarkeit der Hinweiszeile SHALL sich erst ändern, wenn ein Poll-Tick den neuen Plan-Status geliefert hat.

#### Scenario: Darstellung nach erfolgreichem Tap
- **WHEN** der Benutzer das Panel antippt und der Toggle-Aufruf erfolgreich zurückkehrt
- **THEN** bleibt die Darstellung unverändert, bis der nächste Poll-Tick den neuen Status liefert

#### Scenario: Darstellung nach fehlgeschlagenem Tap
- **WHEN** der Toggle-Aufruf einen Fehler wirft
- **THEN** zeigt das Panel weiterhin den tatsächlichen, gepollten Plan-Status an — inklusive der Sichtbarkeit der Hinweiszeile

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

Das Panel SHALL ein Touch-Ziel von mindestens 44×44 CSS-Pixeln bieten. Der Zustand MUST zusätzlich zur Farbe über Icon und Beschriftung erkennbar bleiben. Ist eine Hinweiszeile konfiguriert, MUST sie im aktiven Zustand ohne Interaktion lesbar sein — kein Hover, kein zusätzlicher Tap, kein Abschneiden des Texts.

#### Scenario: Mindest-Touchfläche
- **WHEN** das Panel auf einem Kiosk-Screen gerendert wird
- **THEN** misst seine Trefferfläche mindestens 44×44 CSS-Pixel

#### Scenario: Erkennbarkeit ohne Farbe
- **WHEN** das Panel in Graustufen betrachtet wird
- **THEN** bleiben Beschriftung und Icon lesbar und identifizieren den Knopf

#### Scenario: Hinweis ohne Interaktion lesbar
- **WHEN** ein Panel mit gesetzter `descriptionActive` aktiv ist
- **THEN** ist der vollständige Hinweistext direkt sichtbar, ohne Hover, Tap oder Scrollen

### Requirement: Sunblocker reference configuration

Die Kiosk-Übersicht SHALL eine Sunblocker-Instanz ausliefern: `planId: 116`, Beschriftung "SUNBLOCKER" in Versalien, türkise Aktiv-Farben (`#004d40` für Rahmen und Avatar, `rgba(0, 18, 15, 0.9)` als Füllung) und `maxWidth: '280px'`. Das Panel MUST als letztes Element der Schalter-Reihe stehen, unmittelbar hinter dem Panel "Rollos Elternschlafzimmer".

Im aktiven Zustand MUST das Panel unter der Beschriftung folgende Hinweiszeile zeigen: `Nicht vergessen 'Terrassentüre auf' einzuschalten, falls Du auf die Terrasse gehst...`

#### Scenario: Sunblocker inaktiv
- **WHEN** Plan 116 nicht eingeschaltet ist
- **THEN** zeigt der Sunblocker-Knopf die blaue Standardfarbe wie die benachbarten Knöpfe und keine Hinweiszeile

#### Scenario: Sunblocker aktiv
- **WHEN** Plan 116 eingeschaltet ist
- **THEN** zeigt der Sunblocker-Knopf türkisen Rahmen, türkisen Avatar, türkise Füllung und die Hinweiszeile

#### Scenario: Schalter-Reihe springt nicht
- **WHEN** Plan 116 ein- oder ausgeschaltet wird
- **THEN** bleibt die Höhe der gesamten Schalter-Reihe unverändert, weil der Platz der Hinweiszeile dauerhaft reserviert ist

#### Scenario: Beschriftung in Versalien
- **WHEN** die Kiosk-Übersicht gerendert wird
- **THEN** trägt der Knopf die Beschriftung "SUNBLOCKER" in Versalien, in beiden Zuständen

#### Scenario: Hinweis bleibt kompakt
- **WHEN** der aktive Sunblocker-Knopf auf einem Kiosk-Screen mit voller Panel-Breite (280px) gerendert wird
- **THEN** wird der Hinweistext vollständig unterhalb der Beschriftung angezeigt, ohne Abschneiden

#### Scenario: Sunblocker einschalten
- **WHEN** Plan 116 ausgeschaltet ist und der Benutzer den Sunblocker-Knopf antippt
- **THEN** wird Plan 116 getoggelt und der Knopf erscheint nach dem nächsten Poll-Tick türkis mit Hinweiszeile

#### Scenario: Sunblocker ausschalten
- **WHEN** Plan 116 eingeschaltet ist und der Benutzer den Sunblocker-Knopf antippt
- **THEN** wird Plan 116 getoggelt und der Knopf erscheint nach dem nächsten Poll-Tick wieder blau ohne Hinweiszeile

#### Scenario: Position in der Übersicht
- **WHEN** die Kiosk-Übersicht gerendert wird
- **THEN** ist der Sunblocker-Knopf das letzte Panel der Schalter-Reihe, nach "Rollos Elternschlafzimmer"

#### Scenario: Gleiche Farben wie URLAUB
- **WHEN** Plan 116 und Plan 102 beide eingeschaltet sind
- **THEN** zeigen der SUNBLOCKER- und der URLAUB-Knopf dieselben Rahmen-, Avatar- und Füllfarben

### Requirement: Active-state hint line

Ein Plan-Panel SHALL ein optionales Feld `descriptionActive` unterstützen: eine zusätzliche Textzeile unterhalb der Hauptbeschriftung, die ausschließlich im aktiven Zustand sichtbar ist. Ist das Feld nicht gesetzt, MUST das Panel exakt wie bisher nur die Hauptbeschriftung rendern. Die Zeile MUST wie `description` als HTML gerendert werden.

Ist das Feld gesetzt, MUST der Platz der Zeile auch im inaktiven Zustand reserviert bleiben, sodass die Panel-Höhe zustandsunabhängig konstant ist. Andernfalls würde die gesamte Schalter-Reihe beim Schalten in der Höhe springen, weil ihre Panels auf gleiche Höhe gestreckt werden.

Die Hinweiszeile MUST typografisch den Label-Zeilen der Multi-State-Knöpfe entsprechen: Schriftgrad `text-caption` (12px) mit reduzierter Deckkraft, deutlich kleiner als die 18px-Hauptbeschriftung. Die Zeile MUST unterhalb der Hauptbeschriftung stehen, nicht darüber.

#### Scenario: Hinweis bei aktivem Plan
- **WHEN** der konfigurierte Plan eingeschaltet ist und `descriptionActive` gesetzt ist
- **THEN** rendert das Panel unter der Hauptbeschriftung die Hinweiszeile in kleiner Schrift

#### Scenario: Kein Hinweis bei inaktivem Plan
- **WHEN** der konfigurierte Plan ausgeschaltet ist und `descriptionActive` gesetzt ist
- **THEN** ist ausschließlich die Hauptbeschriftung sichtbar und kein Hinweistext lesbar

#### Scenario: Höhe bleibt beim Schalten stabil
- **WHEN** der konfigurierte Plan eines Panels mit gesetzter `descriptionActive` ein- oder ausgeschaltet wird
- **THEN** bleibt die Höhe des Panels und die der umgebenden Schalter-Reihe unverändert

#### Scenario: Hinweis nicht konfiguriert
- **WHEN** ein `item` ohne `descriptionActive` übergeben wird
- **THEN** rendert das Panel in jedem Zustand nur die Hauptbeschriftung

#### Scenario: Hinweis erscheint und verschwindet mit dem Plan-Status
- **WHEN** der Plan-Status zwischen zwei Poll-Ticks wechselt
- **THEN** erscheint bzw. verschwindet die Hinweiszeile beim selben Tick, an dem auch die Aktiv-Farbe wechselt

#### Scenario: Schriftgröße setzt sich durch
- **WHEN** die Hinweiszeile gerendert wird
- **THEN** ist sie kleiner als die Hauptbeschriftung, obwohl die umschließende `normal-text`-Regel von `KioskPanel` 18px mit `!important` vorgibt

### Requirement: Per-instance panel width

Ein Plan-Panel SHALL optionale Felder `maxWidth` und `minWidth` unterstützen und diese an die Shell `KioskPanel` durchreichen. Sind die Felder nicht gesetzt, MUST das Panel die Standardbreiten der Shell verwenden (`maxWidth` 180px, `minWidth` 140px). Die Breite MUST unabhängig vom Aktiv-Zustand konstant bleiben, damit das Panel beim Schalten nicht seine Breite ändert.

#### Scenario: Breite konfiguriert
- **WHEN** ein `item` mit `maxWidth: '360px'` übergeben wird
- **THEN** rendert das Panel bis zu 360px breit statt der Standard-180px

#### Scenario: Breite nicht konfiguriert
- **WHEN** ein `item` ohne `maxWidth`/`minWidth` übergeben wird
- **THEN** rendert das Panel in den Standardbreiten der Shell, identisch zum Verhalten vor dieser Change

#### Scenario: Breite bleibt beim Schalten stabil
- **WHEN** der konfigurierte Plan ein- oder ausgeschaltet wird
- **THEN** bleibt die Panel-Breite unverändert

#### Scenario: Schmaler Viewport
- **WHEN** das Panel auf einem Gerät gerendert wird, das schmaler als die konfigurierte `maxWidth` ist
- **THEN** schrumpft das Panel bis zur `minWidth`, der Hinweistext bricht in weitere Zeilen um und die Seite läuft nicht horizontal über

### Requirement: Active color semantics for event-triggering switch panels

Ein ereignisauslösendes Kiosk-Schalter-Panel (`KioskSwitchPanel`) SHALL dieselbe Aktiv-Farbsemantik unterstützen wie ein Plan-Panel: optionale `colorActive` (Rahmen und Avatar) und `colorActiveBg` (Füllung), wirksam ausschließlich im aktiven Zustand. Sind die Felder nicht gesetzt, MUST das Panel exakt wie bisher rendern — inaktiv in der Standard-Kiosk-Farbe `off` (blau), aktiv in `on` (gelb).

Das Panel MUST den über `item.isEnabled()` aufgelösten Zustand zusätzlich in eigenem Komponenten-State spiegeln, damit die Farb-Props im selben Tick gesetzt werden können wie der von der Shell gehaltene Zustand. Rahmen, Füllung und Avatar MUST denselben aufgelösten Zustand verwenden und dürfen nicht auseinanderlaufen.

Wirft `item.isEnabled()` einen Fehler oder fehlt die Funktion, MUST das Panel den Fehler protokollieren, als inaktiv gelten und die Poll-Schleife weiterlaufen lassen. Die auslösende Aktion des Panels MUST unverändert bleiben: Ein Tap setzt weiterhin genau das konfigurierte Appliance-Event ab und togglet keinen Plan.

#### Scenario: Aktiv mit konfigurierter Farbe
- **WHEN** ein Switch-Panel mit `colorActive`/`colorActiveBg` konfiguriert ist und sein `isEnabled()` `true` liefert
- **THEN** rendert das Panel Rahmen und Avatar in `colorActive` und die Füllung in `colorActiveBg`

#### Scenario: Inaktiv mit konfigurierter Farbe
- **WHEN** ein Switch-Panel mit `colorActive`/`colorActiveBg` konfiguriert ist und sein `isEnabled()` `false` liefert
- **THEN** rendert das Panel in der blauen `off`-Standardfarbe

#### Scenario: Bestehende Panels ohne Farbkonfiguration
- **WHEN** ein Switch-Panel ohne `colorActive`/`colorActiveBg` gerendert wird
- **THEN** ist seine Darstellung in beiden Zuständen identisch zum Verhalten vor dieser Change

#### Scenario: Rahmen und Avatar bleiben synchron
- **WHEN** ein Poll-Tick den Zustand eines farbkonfigurierten Switch-Panels ändert
- **THEN** wechseln Rahmen, Füllung und Avatar im selben Tick

#### Scenario: Zustandsabfrage schlägt fehl
- **WHEN** `item.isEnabled()` einen Fehler wirft
- **THEN** protokolliert das Panel den Fehler, gilt als inaktiv und fragt beim nächsten Tick erneut ab

#### Scenario: Aktion unverändert
- **WHEN** der Benutzer ein farbkonfiguriertes Switch-Panel antippt
- **THEN** wird genau das konfigurierte Appliance-Event über `eventsService.trigger` ausgelöst

### Requirement: Vacation reference configuration

Die Kiosk-Übersicht SHALL den Knopf "URLAUB" mit denselben Aktiv-Farben ausliefern wie den Sunblocker: `#004d40` für Rahmen und Avatar, `rgba(0, 18, 15, 0.9)` als Füllung. Aktion (Appliance 183, `switch2`, `on.click`), Zustandsquelle (Plan 102), Beschriftung und Position in der Schalter-Reihe MUST unverändert bleiben.

#### Scenario: URLAUB aktiv
- **WHEN** Plan 102 eingeschaltet ist
- **THEN** zeigt der URLAUB-Knopf türkisen Rahmen, türkisen Avatar und türkise Füllung — dieselben Farben wie der aktive SUNBLOCKER-Knopf

#### Scenario: URLAUB inaktiv
- **WHEN** Plan 102 ausgeschaltet ist
- **THEN** zeigt der URLAUB-Knopf die blaue Standardfarbe wie die benachbarten Knöpfe

#### Scenario: Aktion unverändert
- **WHEN** der Benutzer den URLAUB-Knopf antippt
- **THEN** wird wie bisher das Event `on.click` auf `switch2` von Appliance 183 ausgelöst

