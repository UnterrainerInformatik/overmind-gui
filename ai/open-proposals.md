# Open proposals

Draft primers waiting to be turned into an OpenSpec change (`/opsx:propose`).

As soon as an item is turned into a change (a directory exists under
`openspec/changes/`), **delete its entry here** — do not tick it off, do not
keep it as a done marker. OpenSpec is the record from that point on; this file
stays short and only ever lists work that is still un-proposed.

## A — Archiv-Ansicht und Sichern-Knopf

**Gegenstück:** `java-overmind-server`, `ai/open-proposals.md` → "A — Ereignis-Archiv".
Dort stehen Container, Speicher und die maßgeblichen Routen. **RustFS, S3, Buckets und
Kopierlogik sind hier kein Thema** — das GUI sieht nur overmind-Routen und weiß nicht,
dass es RustFS gibt. Kundensicht auf das Feature:
`java-overmind-server/docs/video-capabilities.md`.

### Was das GUI bekommt

Einen zweiten Medienbestand neben den Frigate-Events: gesicherte Ereignisse, Standbilder
und (später) Alarme. Er ist bewusst event-förmig geschnitten, damit `EventsTimeline.vue`
und der Event-Detail-Dialog aus `KioskPersonenEvents.vue` wiederverwendet werden können
statt einer zweiten Implementierung.

### Drei Baustellen

**1. Sichern-Knopf im Event-Detail-Dialog.** `POST …/archive`, Rückmeldung per Snackbar.
Ein bereits gesichertes Ereignis zeigt den Knopf nicht, sondern die Markierung.

**2. Der Knopf zum Aufheben wechselt seinen Text** — das ist kein Detail, sondern der
Punkt:

- Node hält das Original **noch > 1 Tag** → **„Nicht sichern"**. Harmlos, normaler
  Bestätigungsdialog.
- Retention **abgelaufen oder < 1 Tag** → **„Löschen"**. Endgültig, deutlich anders
  formulierter Dialog.

Welcher Fall vorliegt, sagt das Backend über `originExpiresAt` am Archiv-Eintrag (fehlt,
wenn das Original schon weg ist). **Nicht selbst ausrechnen** — die Retention der Anlage
ist im GUI nicht bekannt. Das Feld eignet sich außerdem für eine Anzeige „noch 3 Tage am
Standort".

**3. Neue Ansicht unter Personen.** Route + Nav-Eintrag neben `kioskPersonenEvents`,
Filter nach Kamera / Zeitraum / Person / Art, Wiedergabe über denselben HLS-Player,
Löschen über `ConfirmDialog` mit der Textvariante aus Punkt 2.

### De-dupe und Abspielquelle

Ein gesichertes Ereignis existiert eine Zeit lang **doppelt** — im Archiv und noch in
Frigate. Die Liste ist ein Join beider Quellen über die Frigate-Event-ID, die der
Archiv-Eintrag als `sourceEventId` trägt; der archivierte gewinnt und bekommt die
Markierung. Damit ist auch die alte Frage „woher weiß der Knopf, ob schon gesichert?"
beantwortet — aus der Archivliste selbst, kein Rückfeld an den Frigate-Events nötig.

**Abgespielt wird immer aus dem Archiv, sobald gesichert**, auch solange Frigate seine
Kopie noch hat. Ein Pfad statt zwei, und beim Ablauf der Retention wechselt für den
Anwender nichts.

### Vom Backend anzunehmender Contract

Bis die Backend-Seite steht, gegen diese Formen bauen und die Annahme im Change
festhalten (maßgeblich ist der BE-Primer, Abschnitt A):

- `POST /cameras/<id>/events/<eventId>/archive` → `{ archiveId }`
- `POST /cameras/<id>/snapshot?archive=true`
- `GET /archive/items?cameraIds=&after=&before=&kind=&label=&subLabel=&limit=`
  → `{ items: [...] }`, je Eintrag `archiveId`, `cameraId`, `cameraName`, `kind`
  (`saved-event` | `screenshot` | `alarm` | `recording`), `sourceEventId`, `label`,
  `subLabel`, `subLabelScore`, `box`, `zones`, `startTime`, `endTime`, `state`
  (`pending` | `ready` | `failed`), `failureReason`, `sizeBytes`, `originExpiresAt`,
  `snapshotUrl` / `thumbnailUrl` / `clipUrl`
- `GET /archive/items/<archiveId>` sowie `…/snapshot.jpg`, `…/thumbnail.jpg`,
  `…/clip.m3u8` (+ Segmente)
- `DELETE /archive/items/<archiveId>` → 204

Wie bei den Kamera-Routen: Zeiten sind UTC-`LocalDateTime`, fehlende Felder werden
weggelassen statt `null`, Ablehnungen tragen einen `reason`. **`state` beachten** — ein
frisch gesicherter Eintrag ist zunächst `pending` und hat noch keinen abspielbaren Clip;
die Liste muss ihn trotzdem anzeigen und `failed` sichtbar machen.

Die Felder reichen bewusst aus, um ein Ereignis **ohne** Frigate zu rendern — der
Overlay-Code kann unverändert bleiben.

### Offener Punkt

- Eigene Ansicht oder ein Umschalter „Frigate / Archiv" in der bestehenden
  Events-Ansicht? Verlangt ist eine weitere Ansicht — beim Propose gegenprüfen, wie viel
  Code sich dabei doppelt, und gegebenenfalls die Liste als gemeinsame Komponente ziehen.

---

## B — Aufzeichnungs-Auftrag anlegen (nach A)

Kein Start/Stop-Knopf am Livebild, sondern ein **Auftrag mit Enddatum**: „Kamera 2 ab
jetzt durchgehend aufzeichnen bis 2026-03-02 14:04:55." Das GUI braucht dafür ein
Formular in der Kameraverwaltung, eine Liste laufender Aufträge mit Restlaufzeit, und
vorzeitiges Beenden.

Dazu die **Kundenwahl der Ablage** — am Standort oder zentral — mit dem Hinweis, der die
Entscheidung tatsächlich trifft: rund 30 GB pro Kameratag, bei zentral dauerhaft über den
Uplink des Standorts.

Die aufgezeichneten Bereiche erscheinen anschließend in der Archiv-Ansicht aus A
(`kind: "recording"`). Die Stream-Wahl (Haupt-/Sub-Stream) ist im Backend zunächst auf
`main` beschränkt — Feld vorsehen, aber nicht anbieten, bis das Backend es meldet.

## C — GUI an den echten Kamera-Vertrag nachziehen (dringend, blockiert nichts anderes)

**Gegenstück:** `java-overmind-server`, Änderung `camera-stream-settings-backend`
(Commits `621ecba`, `19bbcba`, deployed). Der maßgebliche Vertrag steht dort in
`ai/primer/endpoints.md` (Abschnitte `/setup/cameras`, `/setup/nodes`,
`POST /setup/nodes/<id>/streamProbe`) und in den JSON-Klassen `CameraJson`,
`NodeJson`, `CameraStreamDefinitionJson`, `StreamProbeResultJson`.

Die GUI-Änderung `camera-stream-settings` (archiviert 2026-09-04) ist gegen einen
angenommenen Vertrag gebaut worden, weil es damals keinen gab. Der Server ist
inzwischen fertig und weicht an vier Stellen ab. Die archivierten Specs bleiben
gültig — es ändert sich nur die Naht in `camerasService`.

### Die vier Brüche

1. **Aufnahme und Erkennung sind flach.** Der Server liefert `recordingEnabled`,
   `recordingMode`, `retentionDays`, `detectWidth`, `detectHeight`, `detectFps`,
   `detectAudioEnabled`, `motionThreshold` direkt auf der Kamera; die GUI liest und
   schreibt `recording{}` / `detect{}`. Folge: die Einstellungen kommen nie zurück,
   der Dialog zeigt dauerhaft „meldet noch nicht", Speichern schreibt ins Leere.
   Das verschachtelte Modell darf bleiben — es ist das bessere für die Komponenten;
   `normalizeCamera` / `toWire` flachen es ab, wie sie es für `subStreamUrl` schon tun.
2. **`recordingMode` ist ein Uppercase-Enum** (`CONTINUOUS` / `EVENTS`), wie die
   übrigen Enums. `lowered()` beim Lesen, Großschreibung beim Schreiben.
3. **`axiosUtils` liest nur `data.message`.** Abgelehnte Schreibzugriffe auf Kameras
   und Nodes antworten jetzt `{"reason": "…"}`. Damit fällt *jede* Begründung im
   Kameras-Dialog auf den generischen Text zurück. Einzeiler, aber der teuerste der vier.
4. **`liveSourceUrl` / `detectSourceUrl` gibt es serverseitig nicht.** Der Server hält
   `sourceUrl` und `subStreamUrl` selbst mit den Rollen `record` / `live` in Schritt.
   Die GUI schickt zwei tote Felder und rechnet beim Lesen mit einem `liveSourceUrl`,
   das nie kommt. Die Ableitung aus den URLs bleibt als Rückfall sinnvoll, weil der
   Server sie für alte Zeilen ebenfalls ableitet.

### Vermeidbare 400er

- `retentionDays` ist Pflicht und muss > 0 sein, sobald `recordingEnabled` gesetzt ist;
  die GUI lässt das Feld leer.
- Ein Stream-Name muss `[a-z0-9_]` und nicht leer sein, Namen müssen eindeutig sein,
  jeder Stream braucht eine `url`, und `roles` darf keinen Stream nennen, den die Kamera
  nicht hat. Die GUI prüft davon bisher nur die Eindeutigkeit.
- `motionThreshold` muss 0–100 sein (der Slider erfüllt das schon).
- Eine geänderte gemessene Größe ohne neueres `probedAt` wird abgelehnt.
  `settableFields` ist serverseitig **immer leer** und bleibt es — der Parameterblock ist
  damit vollständig nur lesbar, und der Mock in der Suite, der `['fps']` behauptet,
  beschreibt einen Fall, den es nicht gibt.

### Was neu dazukommt

- **`probedAt` kommt vom Server.** Die GUI setzt derzeit ihre eigene Browserzeit.
- **Der Node meldet `defaultRetentionDays`.** Damit heißt „nicht gesetzt" nicht mehr
  „unbekannt", sondern „die Vorgabe des Nodes gilt", und die Zahl lässt sich benennen.
  Das beantwortet zugleich die offene Frage aus dem archivierten `design.md`, ob die
  Aufbewahrung pro Kamera oder pro Node gehört: pro Kamera, mit dem Node als Rückfall.
  Das ist der einzige Punkt hier, der eine eigene Anforderung in der Spec verdient.
- **Bisher meldet keine Livequelle eine Bitrate.** Die GB/Tag-Schätzung wird in der
  Praxis fast immer „bitte messen" anzeigen. Das ist kein Fehler, aber die Kundenaussage
  in `video-capabilities.md` sollte es nicht anders versprechen.

### Verifikation

Die Mocks in `~/.local/share/overmind-gui-verify/mocks/cameras.mjs` bilden den
angenommenen Vertrag ab und müssen auf die echten Shapes umgestellt werden — flache
Felder, Uppercase-Enum, `{"reason": …}` als Ablehnung, leeres `settableFields`, fehlende
`bitrateKbps`. Erst danach sagt eine grüne Suite etwas über den echten Server aus.
