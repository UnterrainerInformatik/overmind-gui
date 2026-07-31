## Context

Die Schalter-Reihe der Kiosk-Übersicht (`src/views/KioskOverview.vue`, zweite `v-row`) rendert zehn Panels aus drei Bausteinen, die alle auf der Shell `KioskPanel` aufsetzen:

| Baustein | Aktion | Zustandsquelle | Aktiv-Farbe |
|---|---|---|---|
| `KioskSwitchPanel` | Appliance-Event (`eventsService.trigger`) | `item.isEnabled()` → meist `plansService.isPlanEnabled(...)` | nur Standard `on` (gelb) |
| `KioskPlanPanel` | Plan-Toggle | `plansService.isPlanEnabled(item.planId)` | `colorActive` / `colorActiveBg`, sonst Standard |
| `KioskMultiStatePanel` | Dialog → Plan-Toggle | Plan-Status je State | `colorSelectedIcon` |

`KioskPanel` pollt alle 500 ms die injizierte `isEnabled()`-Funktion und leitet daraus die Klassenfarben `on`/`off` ab. Die Props `borderColorRaw`, `bgColorRaw`, `maxWidth` (Default `180px`) und `minWidth` (Default `140px`) sind bereits vorhanden und verdrahtet — diese Change braucht an der Shell selbst nichts zu ändern.

Zwei Panels der Reihe unterscheiden sich funktional von den übrigen: "URLAUB" (`vacation`, Plan 102) und "SUNBLOCKER" (`sunblocker`, Plan 116) schalten einen tagelang bzw. stundenlang laufenden Ausnahmezustand, während die Nachbarn kurze Taster drücken. Farblich ist das heute nur beim Sunblocker sichtbar.

Technische Randbedingung für URLAUB: `KioskSwitchPanel` reicht `item.isEnabled` unverändert an `KioskPanel` durch und kennt den aufgelösten Zustand selbst nicht — `KioskPanel` hält ihn intern und gibt ihn nur über Slot-Props nach unten. `borderColorRaw`/`bgColorRaw` sind aber Props, die von *außen* gesetzt werden müssen. Der Zustand muss also in der Switch-Komponente ankommen, bevor er in die Shell zurückfließen kann.

## Goals / Non-Goals

**Goals:**

- Gleiche Aktiv-Farbsemantik für "URLAUB" und "SUNBLOCKER", konfiguriert über dieselben Feldnamen (`colorActive`, `colorActiveBg`).
- `KioskSwitchPanel` bekommt optionale Aktiv-Farben, ohne dass eines der sieben bestehenden Switch-Panels sich ändert.
- Sunblocker-Beschriftung in Versalien, konsistent zu "URLAUB".
- Eine kleine Hinweiszeile unter der Sunblocker-Beschriftung, sichtbar ausschließlich bei eingeschaltetem Plan, typografisch identisch zu den Label-Zeilen der Multi-State-Knöpfe.
- Der Hinweis bricht auf einem Desktop-/Tablet-Kiosk in zwei Zeilen um.

**Non-Goals:**

- Keine Änderung an `KioskPanel.vue` — die benötigten Props existieren bereits.
- Keine Änderung an `KioskMultiStatePanel` und keine Vereinheitlichung der drei Panel-Bausteine.
- Keine neue Vuetify-Theme-Farbe, kein globaler Farb-Refactor.
- Kein i18n — Kiosk-Beschriftungen bleiben wie alle anderen fest in der View.
- Keine Verhaltensänderung: URLAUB löst weiterhin dasselbe Appliance-Event aus, Sunblocker togglet weiterhin Plan 116.
- Kein Hinweistext an anderen Knöpfen; das Feld wird generisch angelegt, aber nur beim Sunblocker befüllt.

## Decisions

### 1. Aktiv-Farben in `KioskSwitchPanel` über dieselbe Zustands-Spiegelung wie in `KioskPlanPanel`

`KioskSwitchPanel` wickelt `item.isEnabled` in eine eigene Methode, die das Ergebnis zusätzlich in ein lokales Feld `active` schreibt und zurückgibt — exakt das Muster, das `KioskPlanPanel` und `KioskMultiStatePanel` bereits verwenden:

```
async calculateEnabled () {
  if (typeof this.item.isEnabled !== 'function') {
    this.active = false
    return false
  }
  try {
    this.active = !!(await this.item.isEnabled())
  } catch (e) {
    console.error('KioskSwitchPanel: enabled check failed', this.item.applianceId, e)
    this.active = false
  }
  return this.active
}
```

Damit werden `KioskPanel.enabled` und `KioskSwitchPanel.active` im selben Tick aus demselben Wert gesetzt und können nicht auseinanderlaufen. Der Titel-Slot nutzt weiterhin die Slot-Prop `state.enabled`, sodass Avatar und Rahmen garantiert dieselbe Quelle haben.

Zu beachten: Bisher wurde `item.isEnabled` *direkt* durchgereicht, ohne `try/catch`. Ein Panel mit fehlender oder werfender `isEnabled`-Funktion verhält sich nach dieser Change robuster (loggt und gilt als inaktiv) statt eine unbehandelte Promise-Rejection zu erzeugen — eine Verbesserung, die alle sieben bestehenden Switch-Panels mitnehmen, ohne ihre Darstellung zu ändern.

*Alternative verworfen:* `KioskPanel` die Farben selbst zustandsabhängig auflösen lassen (z. B. neue Props `bgColorRawActive`). Das würde die von acht Panels genutzte Shell umbauen und die bereits etablierte Konvention brechen, dass die Farb-Props roh und zustandslos sind. Dieselbe Alternative wurde schon in der Sunblocker-Change verworfen.

*Alternative verworfen:* `vacation` von `KioskSwitchPanel` auf `KioskPlanPanel` umstellen, um die Farbunterstützung geschenkt zu bekommen. Das ändert die Semantik: URLAUB drückt heute den virtuellen Taster `applianceId 183 / switch2 / on.click` und liest Plan 102 nur zur Anzeige. Ein Plan-Toggle auf 102 wäre ein anderer Backend-Vorgang mit potenziell anderen Nebenwirkungen — keine reine Styling-Change.

### 2. Hinweiszeile als eigenes optionales Feld `descriptionActive`, nicht als HTML in `description`

`description` wird per `v-html` gerendert, der Hinweis ließe sich also theoretisch direkt einbauen. Das scheitert aber daran, dass der Text **zustandsabhängig** ist — `description` ist ein statischer String in der Konfiguration. Ein zweites Feld `descriptionActive` hält beides sauber getrennt:

```
<template>
  <div class="plan-panel-content">
    <div class="plan-panel-label"><span v-html="item.description"></span></div>
    <div v-if="active && item.descriptionActive" class="plan-panel-hint text-caption">
      <span v-html="item.descriptionActive"></span>
    </div>
  </div>
</template>
```

Das Feld ist optional; fehlt es, rendert das Panel wie bisher nur die Hauptbeschriftung und die zusätzliche `div`-Verschachtelung bleibt ohne sichtbare Wirkung.

*Alternative verworfen:* Ein Tooltip oder ein Info-Dialog. Auf einem Wandtablet gibt es keinen Hover, und ein Dialog verlangt einen zusätzlichen Tap — der Hinweis würde genau dann nicht gelesen, wenn er gebraucht wird.

### 3. Typografie der Hinweiszeile: `text-caption` mit reduzierter Deckkraft, gespiegelt von `KioskMultiStatePanel`

Der Wunsch war ausdrücklich "wie die Multi-State-Buttons darüber". Deren kleine Zeile ist `text-caption` (12px) mit `opacity: 0.65`, in einem Flex-Column-Container mit `line-height: 1.1`. Dieselben Werte werden für die Hinweiszeile übernommen.

Ein Unterschied bleibt bewusst bestehen: Bei den Multi-State-Knöpfen steht die kleine Zeile **über** der fetten Zustandszeile; hier steht sie **unter** der Hauptbeschriftung. Das entspricht der Anforderung ("eine Zeile darunter") und der Leserichtung — erst was der Knopf ist, dann der Hinweis dazu.

Wichtig: Die Hauptbeschriftung erbt weiterhin `.normal-text` aus `KioskPanel` (18px). Die Hinweiszeile muss ihre eigene Schriftgröße durchsetzen, weil `.normal-text` mit `!important` auf dem umschließenden `div` sitzt — die Regel für `.plan-panel-hint` braucht daher ebenfalls `!important` für `font-size` und `line-height`.

### 4. Panel-Breite pro Instanz konfigurierbar, Sunblocker auf 280px

Der Hinweis ist ~85 Zeichen lang. In der Standardbreite von 180px (nutzbar ~170px) ergäbe das bei 12px-Schrift vier bis fünf Zeilen und würde die gesamte Schalter-Reihe deutlich in die Höhe ziehen, weil Flex-Items auf gleiche Höhe gestreckt werden. Gewünscht ist ein kompakter Umbruch bei möglichst schmalem Panel.

Der rechnerische Startwert war 360px (bei `text-caption`, 12px, Letter-Spacing 0.0333em, rund 545px Lauflänge). Auf dem realen Kiosk-Screen war das zu breit — der Umbruch fiel hinter "Terrasse", sodass nur noch "gehst..." in der zweiten Zeile stand und Breite verschenkt war. Der Wert wurde daher am laufenden Build nachjustiert und liegt bei **`maxWidth: '280px'`**.

`KioskPanel` hat `maxWidth`/`minWidth` bereits als Props; `KioskPlanPanel` reicht sie bisher nur nicht durch. Also: optionale Felder `maxWidth`/`minWidth` am `item`, die an die Shell weitergegeben werden und bei Nichtsetzen auf den Shell-Defaults (`180px` / `140px`) bleiben.

`minWidth` bleibt beim Sunblocker auf dem Standard von 140px. Auf schmalen Mobilgeräten darf das Panel dadurch schrumpfen und der Hinweis in mehr als zwei Zeilen umbrechen — das ist der akzeptierte Kompromiss gegenüber einem horizontalen Überlauf. Die Kiosk-Ansicht läuft auf Tablet, Mobil und PC.

*Alternative verworfen:* Den Hinweistext kürzen, damit er in 180px passt. Der Wortlaut war Teil der Anforderung.

*Alternative verworfen:* Den Hinweis über die volle Reihenbreite unter der Panel-Reihe rendern. Dann verliert er die räumliche Bindung an den Knopf, der ihn ausgelöst hat, und die Reihe springt beim Ein-/Ausschalten in der Höhe genauso.

### 8. Platz der Hinweiszeile bleibt dauerhaft reserviert

Ohne Reservierung springt die gesamte Schalter-Reihe beim Schalten in der Höhe: Die Panels der Reihe werden per Flex auf gleiche Höhe gestreckt, also ist die Reihe immer so hoch wie ihr höchstes Panel. Der aktive Sunblocker überragt die bisher höchsten Panels um wenige Pixel, und beim Ein-/Ausschalten wandert diese Differenz durch die ganze Reihe.

Die Hinweiszeile wird deshalb gerendert, sobald `descriptionActive` gesetzt ist, und im inaktiven Zustand nur per `visibility: hidden` unsichtbar geschaltet. Damit ist die Panel-Höhe zustandsunabhängig und die Reihe steht konstant auf der Aktiv-Höhe.

*Alternative verworfen:* Allen Kiosk-Buttons pauschal ein paar Pixel Höhe zugeben. Das hebt den Sunblocker mit an, die Differenz bleibt bestehen und der Sprung verschwindet nicht. Zudem wäre der Pixelwert an eine konkrete Panel-Breite gebunden und müsste bei jeder Breitenänderung neu ermittelt werden — die Reservierung rechnet sich das selbst aus.

*Alternative verworfen:* Ein `min-height` mit absolutem Wert auf `KioskPanel`. Das funktioniert, verlangt aber, die aktuelle Höhe des höchsten Panels zu kennen, und bricht still, sobald ein Nachbarpanel eine Textzeile mehr bekommt.

### 5. Farbwerte werden nicht zentralisiert

`#004d40` und `rgba(0, 18, 15, 0.9)` stehen nach dieser Change an zwei Stellen in `KioskOverview.vue` (bei `sunblocker` und bei `vacation`). Eine geteilte Konstante wäre möglich, aber der `data()`-Block der View ist durchgehend als flache, literale Konfiguration geschrieben — inklusive der wiederholten `rgba(255, 0, 0, ...)`-Werte in `allStateMulti`. Zwei Literale folgen dieser Hausform; eine eingeführte Konstante wäre der einzige Sonderfall in der Datei.

### 6. Versal-Schreibung im String, nicht per CSS

"SUNBLOCKER" wird direkt als `description: '<b>SUNBLOCKER</b>'` geschrieben statt über `text-transform: uppercase`. So steht im Code, was auf dem Screen steht, und "URLAUB" ist bereits genauso gelöst.

### 7. Umgang mit den Anführungszeichen im Hinweistext

Der Text enthält einfache Anführungszeichen um "Terrassentüre auf". Da die Konfiguration in `KioskOverview.vue` in einfachen Anführungszeichen notiert wird, wird der String in doppelten Anführungszeichen geschrieben — das vermeidet Escapes und bleibt lesbar. Gerendert wird exakt: `Nicht vergessen 'Terrassentüre auf' einzuschalten, falls Du auf die Terrasse gehst...`

## Risks / Trade-offs

- **Die Schalter-Reihe steht dauerhaft auf der Aktiv-Höhe des Sunblockers, auch wenn der Hinweis nicht sichtbar ist** → Bewusst akzeptiert (siehe Decision 8): Der belegte Platz ist bei 280px Breite nur wenige Pixel größer als die bisherige Reihenhöhe, und ein springendes Layout auf einem Wandtablet fällt deutlich stärker auf als eine konstant um wenige Pixel höhere Reihe.
- **Auf schmalen Mobilgeräten bricht der Hinweis in mehr als zwei Zeilen um** → In Kauf genommen; `minWidth` bleibt beim Standard, damit nichts horizontal überläuft. Die Zwei-Zeilen-Zusage gilt für Tablet und PC.
- **Das 360px-Panel verschiebt den Umbruch der Schalter-Reihe** → Der Sunblocker ist das letzte Panel der Reihe; ein früherer Umbruch trifft damit ihn selbst und nicht die Reihenfolge der übrigen Knöpfe. Vor dem Archivieren auf den tatsächlichen Kiosk-Auflösungen prüfen.
- **`KioskSwitchPanel` bekommt eine Verhaltensänderung (`try/catch` um `isEnabled`), die alle sieben bestehenden Panels betrifft** → Die Änderung kann nur von "unbehandelte Rejection" zu "geloggter Fehler, Panel inaktiv" führen; im Erfolgsfall ist das Ergebnis bitgleich. Regressionscheck über alle Panels der Reihe ist in den Tasks vorgesehen.
- **URLAUB und SUNBLOCKER sind farblich nicht mehr voneinander unterscheidbar** → Genau das Ziel: Die Farbe kodiert die *Art* des Zustands, die Beschriftung unterscheidet die beiden Knöpfe. Beide sind zusätzlich über Icon und Text erkennbar.
- **`!important` in der Hinweis-Regel** → Nötig, weil `KioskPanel.normal-text` selbst mit `!important` arbeitet. Die Regel ist auf `.plan-panel-hint` gescoped und trifft kein anderes Panel.
- **Türkis auf dem Kiosk zu dunkel oder zu blass** → Die Werte sind Literale an zwei Stellen einer Datei und ohne strukturelle Änderung nachjustierbar; sie sind aus der bestehenden, im Betrieb bewährten Sunblocker-Konfiguration übernommen.

## Migration Plan

Rein additiv. Kein Datenmodell, keine Backend-Änderung, keine neuen Endpunkte, keine zusätzliche Polling-Last. Alle neuen Konfigurationsfelder (`colorActive`, `colorActiveBg` am Switch-Panel; `descriptionActive`, `maxWidth`, `minWidth` am Plan-Panel) sind optional und bei Nichtsetzen wirkungslos. Rollback = Commit zurücknehmen.

## Open Questions

Keine. Farbwerte (aus der bestehenden Sunblocker-Konfiguration), Wortlaut des Hinweises, Sichtbarkeit (nur bei eingeschaltetem Plan), Typografie (wie Multi-State-Label) und Zielbreite (zwei Zeilen, 360px) sind geklärt.
