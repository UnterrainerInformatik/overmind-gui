# Open proposals

Draft primers waiting to be turned into an OpenSpec change (`/opsx:propose`).

As soon as an item is turned into a change (a directory exists under
`openspec/changes/`), **delete its entry here** — do not tick it off, do not
keep it as a done marker. OpenSpec is the record from that point on; this file
stays short and only ever lists work that is still un-proposed.

## RustFS-Archiv (Frontend-Anteil)

**Gegenstück:** `java-overmind-server`, `ai/open-proposals.md` → "RustFS — dauerhafter
Medienspeicher (Backend-Anteil)". Dort stehen Container, Speicherplatz und die
maßgeblichen Routen. **Container, S3, Buckets und Kopierlogik sind hier ausdrücklich
kein Thema** — das GUI sieht nur overmind-Routen und weiß nicht, dass es RustFS gibt.

### Was das GUI bekommt

Ein zweiter Medienbestand neben den Frigate-Events: dauerhaft gesicherte Aufnahmen,
Screenshots, Alarm-Events und von Hand gesicherte Events. Er ist bewusst event-förmig
geschnitten, damit die vorhandenen Listen-, Timeline- und Detail-Komponenten
(`EventsTimeline.vue`, der Event-Detail-Dialog aus `KioskPersonenEvents.vue`)
wiederverwendet werden können statt einer zweiten Implementierung.

### Drei Baustellen

1. **Aufnahme-Knopf in der Live-Ansicht** (`KioskCamera.vue` / `KioskCameras.vue`).
   Start/Stop, ein sichtbarer Laufzustand (rot, mitlaufende Dauer), und der Zustand
   muss einen Reload überleben — beim Öffnen der Ansicht laufende Aufnahmen abfragen.
   Fehlerfall: Stopp schlägt fehl → der Knopf darf nicht in "läuft" hängen bleiben.
2. **Zwei Sichern-Aktionen.** Der bestehende Screenshot bekommt die Ablage zusätzlich
   zum Übertragen; der Event-Detail-Dialog bekommt einen neuen "Dauerhaft sichern"-Knopf
   mit Rückmeldung (Snackbar) und einem Hinweis, wenn das Event bereits gesichert ist.
3. **Neue Ansicht unter Personen**: gesicherte Videos und Events durchsehen, "als wären
   sie noch im Frigate". Route + Nav-Eintrag neben `kioskPersonenEvents`, Filter nach
   Kamera / Zeitraum / Art, Wiedergabe über denselben HLS-Player wie die Event-Clips,
   Löschen mit `ConfirmDialog`.

### Vom Backend anzunehmender Contract

Bis die Backend-Seite steht, gegen diese Formen bauen und die Annahme im Change
festhalten (Routen und Payload im BE-Primer, §3):

- `POST /cameras/<id>/recordings` → `{ recordingId, startedAt }`,
  `DELETE /cameras/<id>/recordings/<recordingId>` → `{ archiveId }`,
  `GET /cameras/<id>/recordings` für den Knopfzustand.
- `POST /cameras/<id>/snapshot?archive=true`,
  `POST /cameras/<id>/events/<eventId>/archive` → `{ archiveId }`.
- `GET /archive/items?cameraIds=&after=&before=&kind=&label=&limit=` → `{ items: [...] }`,
  je Eintrag `archiveId`, `cameraId`, `cameraName`, `kind`
  (`recording` | `screenshot` | `alarm` | `saved-event`), `label`, `startTime`,
  `endTime`, `state`, `sizeBytes` und `snapshotUrl` / `thumbnailUrl` / `clipUrl`.
- `GET /archive/items/<archiveId>` sowie `…/snapshot.jpg`, `…/thumbnail.jpg`,
  `…/clip.m3u8` (+ Segmente), `DELETE /archive/items/<archiveId>` → 204.

Wie bei den Kamera-Routen: Zeiten sind UTC-`LocalDateTime`, fehlende Felder werden
weggelassen statt `null`, Ablehnungen tragen einen `reason`. **`state` beachten** —
ein frisch gesicherter Eintrag ist zunächst `pending` und hat noch keinen abspielbaren
Clip; die Liste muss ihn trotzdem anzeigen und `failed` sichtbar machen.

### Offene Punkte

- Eigene Ansicht oder ein Umschalter "Frigate / Archiv" in der bestehenden
  Events-Ansicht? Der Nutzer hat eine weitere Ansicht verlangt — also getrennt, aber
  beim Propose gegenprüfen, wie viel Code sich dabei doppelt.
- Ist ein Event bereits archiviert? Ohne ein Rückfeld an den Frigate-Events kann der
  Sichern-Knopf das nicht wissen — beim Propose vom Backend einfordern oder über
  `sourceEventId` aus der Archivliste selbst auflösen.
