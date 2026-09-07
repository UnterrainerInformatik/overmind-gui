# Open proposals

Draft primers waiting to be turned into an OpenSpec change (`/opsx:propose`).

As soon as an item is turned into a change (a directory exists under
`openspec/changes/`), **delete its entry here** — do not tick it off, do not
keep it as a done marker. OpenSpec is the record from that point on; this file
stays short and only ever lists work that is still un-proposed.

## A — Archiv-Ansicht (Sichern-Knopf ist proposed)

**Gegenstück:** `java-overmind-server`, `ai/open-proposals.md` → "A — Ereignis-Archiv".
Dort stehen Container, Speicher und die maßgeblichen Routen. **RustFS, S3, Buckets und
Kopierlogik sind hier kein Thema** — das GUI sieht nur overmind-Routen und weiß nicht,
dass es RustFS gibt. Kundensicht auf das Feature:
`java-overmind-server/docs/video-capabilities.md`.

Der Sichern-Knopf und der Knopf zum Aufheben stecken bereits im OpenSpec-Change
`archive-save-button` — samt dem angenommenen Contract und dem Join über
`sourceEventId`. **Hier steht nur noch die Ansicht selbst.**

### Was noch fehlt: die Ansicht unter Personen

Route + Nav-Eintrag neben `kioskPersonenEvents`, Filter nach Kamera / Zeitraum / Person /
Art, Wiedergabe über denselben HLS-Player, Löschen über `ConfirmDialog` mit der
Textvariante aus `archive-save-button`.

Der Bestand ist bewusst event-förmig geschnitten, damit `EventsTimeline.vue` und der
Event-Detail-Dialog aus `KioskPersonenEvents.vue` wiederverwendet werden können statt
einer zweiten Implementierung.

Was diese Ansicht kann, was die Events-Seite nicht kann: **archiv-only Einträge zeigen**.
Ein gesichertes Ereignis, dessen Original abgelaufen ist, fällt aus der Events-Liste
heraus — nur hier kommt es zurück. Dazu später Standbilder
(`POST /cameras/<id>/snapshot?archive=true`) und Alarme.

### Vom Backend anzunehmender Contract

Maßgeblich ist der BE-Primer, Abschnitt A; die Formen, die
`archive-save-button/design.md` schon festhält, gelten unverändert weiter:

- `GET /archive/items?cameraIds=&after=&before=&kind=&label=&subLabel=&limit=`
  → `{ items: [...] }`, je Eintrag `archiveId`, `cameraId`, `cameraName`, `kind`
  (`saved-event` | `screenshot` | `alarm` | `recording`), `sourceEventId`, `label`,
  `subLabel`, `subLabelScore`, `box`, `zones`, `startTime`, `endTime`, `state`
  (`pending` | `ready` | `failed`), `failureReason`, `sizeBytes`, `originExpiresAt`,
  `snapshotUrl` / `thumbnailUrl` / `clipUrl`
- `GET /archive/items/<archiveId>` sowie `…/snapshot.jpg`, `…/thumbnail.jpg`,
  `…/clip.m3u8` (+ Segmente)
- `POST /cameras/<id>/snapshot?archive=true`

Zeiten sind UTC-`LocalDateTime`, fehlende Felder werden weggelassen statt `null`,
Ablehnungen tragen einen `reason`. **`state` beachten** — ein frisch gesicherter Eintrag
ist zunächst `pending` und hat noch keinen abspielbaren Clip; die Liste muss ihn trotzdem
anzeigen und `failed` sichtbar machen.

Die Felder reichen bewusst aus, um ein Ereignis **ohne** Frigate zu rendern — der
Overlay-Code kann unverändert bleiben.

### Offene Punkte

- **Der Contract ist bis heute gegen keinen laufenden Server geprüft.**
  `archive-save-button` ist gebaut und gegen Mocks verifiziert; sobald overmind die
  Archiv-Routen bedient, sind die Formen gegenzuprüfen und ein Verifikationsdatum in
  `src/utils/webservices/archiveService.ts` einzutragen, so wie `frigateService.ts`
  eines trägt. Das war Task 7.4 jenes Changes und ist als einziger offen archiviert
  worden — es steht hier, damit es nicht mit dem Change im Archiv verschwindet.
  Was der Server dafür wissen muss, steht in
  `java-overmind-server/ai/draft-archive-from-gui.md`.
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
