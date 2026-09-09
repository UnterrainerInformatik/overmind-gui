# Open proposals

Draft primers waiting to be turned into an OpenSpec change (`/opsx:propose`).

As soon as an item is turned into a change (a directory exists under
`openspec/changes/`), **delete its entry here** — do not tick it off, do not
keep it as a done marker. OpenSpec is the record from that point on; this file
stays short and only ever lists work that is still un-proposed.

## Standing open point — the archive has never met a real server

Not a proposal: an acceptance run that no change may carry off into the archive
with it. Every archive shape this GUI uses was checked on 2026-09-07 against the
**source** of `java-overmind-server` (change `event-archive`), never against a
deployed server with a real node behind it. Still to be done, once the routes
are served: save an event, see it marked, find it in the archive view, play it,
and delete it again.

It came out of `archive-save-button` (task 7.4 there) and now covers the archive
view of `kiosk-archive-page` as well. What the server knows about it is in
`java-overmind-server/ai/draft-archive-from-gui.md`; the customer-facing side is
`java-overmind-server/docs/video-capabilities.md`.

---

## B — Aufzeichnungs-Auftrag anlegen (nach der Archiv-Ansicht)

Kein Start/Stop-Knopf am Livebild, sondern ein **Auftrag mit Enddatum**: „Kamera 2 ab
jetzt durchgehend aufzeichnen bis 2026-03-02 14:04:55." Das GUI braucht dafür ein
Formular in der Kameraverwaltung, eine Liste laufender Aufträge mit Restlaufzeit, und
vorzeitiges Beenden.

Dazu die **Kundenwahl der Ablage** — am Standort oder zentral — mit dem Hinweis, der die
Entscheidung tatsächlich trifft: rund 30 GB pro Kameratag, bei zentral dauerhaft über den
Uplink des Standorts.

Die aufgezeichneten Bereiche erscheinen anschließend in der Archiv-Ansicht
(`kind: "recording"`). Die Stream-Wahl (Haupt-/Sub-Stream) ist im Backend zunächst auf
`main` beschränkt — Feld vorsehen, aber nicht anbieten, bis das Backend es meldet.
