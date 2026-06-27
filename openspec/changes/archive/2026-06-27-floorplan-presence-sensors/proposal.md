## Why

Das Haus bekommt mmWave-Präsenzsensoren (Shelly Presence Gen4 und Apollo MTR-1) an den Decken. Wir brauchen sichtbar (a) ob überhaupt jemand im Haus ist (Vorbedingung Alarm) und (b) wo genau sich Personen aktuell aufhalten (Vorbedingung „Licht hinter dem Menschen abdrehen"). Die Anzeige soll konsequent in das bestehende Floorplan-Muster der Kiosk-Views passen — keine neue UI, kein paralleler Renderer.

## What Changes

- `src/components/floorplan/Floorplan.vue` rendert für jede gefundene `OCCUPANCY_SENSOR`-Appliance zusätzlich Live-Punkte je Eintrag in `state.presences[0].objects[]`. Die übrige Floorplan-Logik (Areas, Icons, Dialogs, Filter, SSE-Transport) bleibt unverändert.
- `src/utils/overmindUtils.ts` bekommt einen `OCCUPANCY_SENSOR`-Eintrag in `COMPACT_PATHS` (`['presences[0].presence', 'presences[0].objects']`) und in `DETAIL_PATHS` (`['**']`). Damit wickelt der bereits existierende Transport-Registrar in `Floorplan.vue` die Subscription automatisch ab.
- Neue Datei `src/views/KioskPresence.vue` als 1:1-strukturelle Kopie von `KioskLights.vue` mit `:applianceTypeFilter="['OCCUPANCY_SENSOR']"`, Icon `sensor_occupied` und passenden Farbwerten. Keine Tabs, kein Floor-Selector, kein neues Layout — derselbe `Floorplan`-Component, dieselben Begleit-Panels.
- Neue Route `/app/kioskpresence` und ein NavDrawer-Eintrag, parallel zu den anderen `Kiosk*`-Routen.
- Sensor-Position auf dem Plan kommt — wie bei Lights — aus den vom Backend gelieferten Appliance-Feldern `iconPos` und `imgMapCoords`. Yaw und Plan-Maßstab pro Sensor (notwendig, um Sensor-lokale Meter in Plan-Pixel zu projizieren) werden in einem schlanken Frontend-Map `src/lib/presence/sensorOrientation.ts` gepflegt — bewusst klein und reversibel; Migration in eine künftige Backend-Konfiguration bleibt offen.
- i18n-Eintrag `page.kiosk.presence.title` (DE/EN).

Nicht enthalten (explizit out-of-scope): Alarm-Logik, Lichtsteuerung, Zonen-Konfiguration, Überschneidungs-Deconflict, Schreib-Aktionen auf Sensoren, neuer Floorplan-Component, neuer Layout-Typ, Tabs, Coverage-Kegel-Berechnung (das vom Admin gezeichnete `imgMapCoords`-Polygon übernimmt die Footprint-Visualisierung — gleiche Mechanik wie bei allen anderen Sensoren).

## Capabilities

### New Capabilities
- `presence-floorplan`: Live-Visualisierung von Personen-Targets aus `OCCUPANCY_SENSOR`-Appliances als Punkt-Overlay innerhalb des bestehenden `Floorplan.vue`, samt zugehöriger Kiosk-View `KioskPresence.vue`.

### Modified Capabilities
- (keine — `floorplan-live-updates` und `sse-transport-client` ändern keine Anforderungen; sie absorbieren `OCCUPANCY_SENSOR` nur dadurch, dass `pathsForApplianceType` einen neuen Schlüssel kennt.)

## Impact

- **Code (geändert):**
  - `src/components/floorplan/Floorplan.vue`: zusätzliche Render-Schleife für Presence-Punkte pro Appliance mit `usageType === 'OCCUPANCY_SENSOR'`.
  - `src/utils/overmindUtils.ts`: neuer Eintrag `OCCUPANCY_SENSOR` in `COMPACT_PATHS` und `DETAIL_PATHS`; Typ `ApplianceType` ergänzt um `'OCCUPANCY_SENSOR'`.
  - `src/router/index.ts`: neue Route `/app/kioskpresence`.
  - `src/components/NavDrawer.vue`: neuer Menüeintrag.
  - `src/locales/*/page.json`: `page.kiosk.presence.title`.
- **Code (neu):**
  - `src/views/KioskPresence.vue` (Klon von `KioskLights.vue`).
  - `src/lib/presence/sensorOrientation.ts` (Map `applianceId → { yawDeg, pxPerMeter }`, kann initial leer sein; Default `yawDeg: 0` und ein Default-`pxPerMeter`).
- **APIs/Backend:** keine. Konsumiert ausschließlich existierende Endpunkte und das in `ai/primer/occupancy-sensors.md` (Server-Repo) dokumentierte Status-Schema.
- **Dependencies:** keine neuen npm-Pakete.
- **Risiken:** Yaw und Maßstab pro Sensor stehen frontend-seitig hartkodiert — bei Umbau muss `sensorOrientation.ts` nachgezogen werden. Akzeptabel für die initiale Version.
