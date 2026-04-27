## Context

Das overmind-gui rendert Floorplans über genau eine Komponente: `src/components/floorplan/Floorplan.vue` (798 Zeilen). Sie wird von allen `Kiosk*`-Views identisch eingebunden — nur Filter-Props (`applianceTypeFilter`, `classFqnFilter`) und Farben unterscheiden sich (siehe `KioskLights.vue`, `KioskMovement.vue`, `KioskPlugs.vue`, …). Floorplan kennt seine SSE-Subscription selbst und ruft je platzierter Appliance `pathsForApplianceType(app.type, 'compact')` aus `src/utils/overmindUtils.ts` auf, um die zu abonnierenden Pfade zu bestimmen.

Sensor-Positionen kommen heute schon vom Backend in den Appliance-Feldern `iconPos` und `imgMapCoords` (vom Admin im Plan-Editor gezeichnet). Stockwerks-Wechsel handhabt Floorplan über `$store.state.gui.floorplan` — ein einzelnes aktives Plan-Asset zur Zeit. Es gibt heute keine Tabs in den Kiosk-Views; das soll auch hier so bleiben.

mmWave-Präsenzsensoren (Shelly Presence Gen4, Apollo MTR-1) liefern zusätzlich zu einem booleschen `presence`-Flag fortlaufende 2D-Zielkoordinaten in **Sensor-lokalen Metern** (`presences[0].objects[].x/y`). Coverage und Vendor-Unterschiede sind dokumentiert in den Klassen-Javadocs von `…vendors.shelly.appliances.ShellyPresenceG4Appliance` (140°/120°/8 m, still 3 m, 6 Targets, 10 Zonen) und `…vendors.apollo.appliances.ApolloMtr1Appliance` (120°/70°/6 m, still 2 m, 3 Targets, 3 Zonen) sowie in `ai/primer/occupancy-sensors.md` im Server-Repo.

Decken-Höhen sind im Haus fix: Keller 2.20 m, EG 2.50 m, 1. OG 2.50 m. Sie spielen für *diese* Implementierung keine Rolle (kein berechneter Coverage-Kegel — siehe D2), wären aber Eingang einer späteren Erweiterung.

Stakeholder: Hausbesitzer (User). Zielgeräte: Tablet, Mobile, PC (Memory `project_kiosk_mode_devices`).

## Goals / Non-Goals

**Goals:**
- Bestehender `Floorplan`-Component bleibt der einzige Floorplan-Renderer; er bekommt einen zusätzlichen Punkt-Layer für `OCCUPANCY_SENSOR`-Appliances.
- Eine neue Kiosk-View `KioskPresence.vue`, strukturell 1:1 wie `KioskLights.vue`, instanziiert `Floorplan` mit `applianceTypeFilter: ['OCCUPANCY_SENSOR']`.
- Vendor-agnostisch: Shelly G4 und Apollo MTR-1 laufen durch denselben Code-Pfad.
- Kein Tab-/Floor-Selector. Stockwerks-Wechsel funktioniert genauso wie auf den anderen Kiosk-Views.
- Keine neuen npm-Pakete, keine Backend-API-Änderungen.

**Non-Goals:**
- Keine eigene `PresenceFloorplan`-Komponente. Kein eigener Layout-Typ. Keine Tabs.
- Keine Coverage-Kegel-Berechnung. Das vom Admin im Plan-Editor gezeichnete `imgMapCoords`-Polygon dient — wie bei allen anderen Sensoren — als Footprint-Visualisierung.
- Keine Alarm-/Lichtsteuerung, keine Zonen-Verwaltung, keine Schreib-Aktionen.
- Kein 3D-Rendering; Shelly-`z`/`minZ`/`maxZ` werden in dieser Version ignoriert.
- Keine Server-seitige Persistenz von Sensor-Yaw/Maßstab.

## Decisions

### D1 — Erweiterung von `Floorplan.vue` statt neuer Komponente

**Wahl:** Punkt-Layer wird direkt in `Floorplan.vue` ergänzt; aktiv für jede Appliance mit `usageType === 'OCCUPANCY_SENSOR'`.
**Alternative:** Eigene `PresenceFloorplan.vue` parallel.
**Warum:** Userwunsch (Reuse). Vermeidet Duplikat-Render-Pipelines; Punkte sitzen im selben SVG/HTML-Overlay-Container wie Icons und Areas und skalieren automatisch mit `scale`.

### D2 — Footprint = bestehendes `imgMapCoords`-Polygon, kein berechneter Kegel

**Wahl:** Kein Coverage-Kegel-Polygon. Die Sensor-Abdeckung ist das vom Admin im Plan-Editor gezeichnete `imgMapCoords`-Polygon, das Floorplan ohnehin schon rendert.
**Alternative:** Polygon aus `(ceilingHeight, hAngle, vAngle, range)` rechnen.
**Warum:** Konsistent mit allen anderen Sensoren in diesem System. Der berechnete Nominalkegel würde im Realbetrieb wegen Möbel/Wände sowieso vom Admin korrigiert — also genau das, was er beim Zeichnen des Polygons im Plan-Editor schon macht. Kleinere Code-Oberfläche, kein neues Konstanten-Modul, keine Decken-Höhen-Konstanten im Frontend.
**Konsequenz:** `coverage.ts`, `ceilingHeights`, Cone-Math entfallen ersatzlos.

### D3 — Pfad-Subscription über `pathsForApplianceType`

**Wahl:** Neuer Eintrag in `COMPACT_PATHS`:
```ts
OCCUPANCY_SENSOR: ['presences[0].presence', 'presences[0].objects']
```
und `DETAIL_PATHS: { …, OCCUPANCY_SENSOR: ['**'] }`. Den `ApplianceType`-Union-Typ um `'OCCUPANCY_SENSOR'` erweitern.
**Alternative:** Eigener Subscription-Helper nur für Presence.
**Warum:** Floorplan registriert seinen Transport bereits in einem zentralen Loop, der pro Appliance `pathsForApplianceType(app.type, 'compact')` ruft. Mit dem neuen Schlüssel funktioniert die Subscription automatisch — kein Sonderpfad in Floorplan.
**Cadence:** Floorplan setzt aktuell ein globales `minInterval`. Wir ändern es nicht; falls dieses Feature den Punkt zu träge wirken lässt, kann später ein per-Appliance-Override eingeführt werden — out-of-scope. (Der Primer empfiehlt 250 ms; falls Floorplan höher ist, ist das ein vorhandenes Verhalten, keine Regression.)

### D4 — Sensor-Position aus Backend-Feldern, Yaw + Maßstab aus schlankem Frontend-Map

**Wahl:** Position des Sensors auf dem Plan = `iconPos` des Appliance-Records (vom Backend geliefert, von Floorplan ohnehin gelesen). Yaw (Decken-Drehwinkel des Sensors) und `pxPerMeter` (Plan-Maßstab am Sensor-Ort) kommen aus `src/lib/presence/sensorOrientation.ts`:
```ts
export const SENSOR_ORIENTATION: Record<number, { yawDeg: number; pxPerMeter: number }> = {
  // 206: { yawDeg: 0, pxPerMeter: 40 },
}
export const DEFAULT_ORIENTATION = { yawDeg: 0, pxPerMeter: 40 }
```
Fehlt ein Eintrag, wird `DEFAULT_ORIENTATION` verwendet und in der Konsole gewarnt.
**Alternative A:** Backend-Felder ergänzen — out-of-scope dieses Changes.
**Alternative B:** Yaw aus dem `imgMapCoords`-Polygon ableiten (z. B. Hauptachse). Verworfen — fragil bei nicht-rechteckigen Polygonen.
**Warum:** Minimal-invasiv. Datei ist klein, sehr selten anzufassen. Migration in Backend-Config bleibt offen.

### D5 — Punkt-Transformation

**Wahl:** Pro Target `(sx, sy) = (objects[i].x, objects[i].y)` in Metern; Plan-Pixel:
```
dx =  cos(yaw) * sx - sin(yaw) * sy
dy =  sin(yaw) * sx + cos(yaw) * sy   // Plan-Y bei Bedarf negieren, konsistent mit dem Plan-Y der iconPos-Konvention
px =  iconPos[0] + dx * pxPerMeter
py =  iconPos[1] + dy * pxPerMeter
```
Anzeige als kleines absolut positioniertes Icon (z. B. `mdi-circle` oder `record_voice_over`) im selben `:style="position: absolute; top: …; left: …"`-Muster, das Floorplan für Icons nutzt; Position wird mit `* scale` skaliert.
**Begründung:** Reine 2D-Affin-Transformation. Identisch für beide Vendoren — beide liefern Meter, beide haben +y = Sensor-Front, +x = rechts (Primer §Coordinate system). Plan-Y-Spiegelung erfolgt einmalig konsistent zum bestehenden Plan-Koordinatensystem.

### D6 — Reaktive Schreibwege

`presences[0].objects` ist ein Array variabler Länge. Floorplan applizierten `transport-update`s gehen heute über `setPathValue` aus `overmindUtils.ts`, das bereits `Vue.set` für jeden Hop nutzt. Damit ist die Reaktivitätsanforderung (Memory `feedback_vue2_reactive_writes`) ohne Zusatzcode erfüllt.

### D7 — `KioskPresence.vue` als Klon von `KioskLights.vue`

**Wahl:** Strukturell identisch zu `KioskLights.vue`:
- `<Floorplan icon="sensor_occupied" :displayEnhancedDialog="…" :applianceTypeFilter="['OCCUPANCY_SENSOR']" colorOn=… colorOff=… colorError=… colorGrey=… colorTransparent=… />`
- `KioskLinkPanel` zurück zu `/app/kioskoverview`.
- `KioskTogglePanel` zur Steuerung von `displayEnhancedDialog` (parallel zu Lights).
- `mounted` ruft `kioskMode(true)`.
**Begründung:** „Die gleiche Ansicht und Basis wie bei Lights" — wörtlich.

### D8 — Globaler „irgendwer im Haus"-Indikator

**Verschoben:** Out of scope für diesen Change. Der User-Wunsch (Alarm-Vorbedingung) ist mit `presences[0].presence` jeder OCCUPANCY-Appliance datenseitig bereits abrufbar; eine eigene Anzeige würde aber das einheitliche Layout brechen, das D7 fordert. Im Floorplan färbt der Punkt-/Icon-Layer den Sensor-Avatar bereits ON/OFF gemäß bestehender Avatar-Logik (sobald `addOnOffStateTo` einen `OCCUPANCY_SENSOR`-Zweig kennt — siehe Tasks 2.4). Eine separate Haus-weit-Anzeige kann später als eigenständiges Kiosk-Panel ergänzt werden.

## Risks / Trade-offs

- **[Yaw/Maßstab driften]** → Bei Sensor-Umbau muss `sensorOrientation.ts` angepasst werden; sonst landen Punkte am falschen Ort. Mitigation: Default + Console-Warnung bei fehlendem Eintrag, Doku in `KioskPresence.vue`-Header-Kommentar.
- **[`imgMapCoords` ist nicht zwingend „echte" Coverage]** → Das Polygon zeigt, was der Admin gezeichnet hat, nicht den physikalischen Nominalkegel. Akzeptabel und sogar gewünscht — entspricht dem Live-Verhalten aller anderen Sensoren.
- **[Apollo emittiert X/Y getrennt @ ~150 ms]** → Mit dem aktuellen `minInterval` von Floorplan möglicherweise leichtes Flackern. Erst beobachten, dann ggf. nachjustieren — kein Pre-Optimize.
- **[Still-Detection-Ausfall jenseits 2 m / 3 m]** → Person verschwindet vom Radar, Punkt geht weg. Sensor-Mounting-Issue, nicht Frontend; im View-Header-Kommentar dokumentieren.
- **[`numObjects` Shelly vs. Apollo]** → Wenn jemals eine Target-Anzahl angezeigt wird, konsequent `objects.length` nehmen (Primer §Vendor differences matrix). In dieser Version irrelevant — wir rendern `objects` direkt.

## Open Questions

1. Yaw und `pxPerMeter` pro Sensor — User liefert die Werte beim Roll-out. Datei kann mit leerem Map und sinnvollem Default ausgeliefert werden.
2. Soll `addOnOffStateTo` in `overmindUtils.ts` einen `OCCUPANCY_SENSOR`-Zweig bekommen (Avatar-Färbung), oder reicht es, dass nur die Punkte sichtbar werden? **Default-Empfehlung:** ja ergänzen (`onOffState` aus `presences[0].presence`), damit der Sensor-Avatar wie bei Motion ON/OFF färbt.
