## Context

See proposal.md — Why.

Constraints that shape the approach:

- Vue 2 + Vuetify 2, views under `src/views` with a route in `src/router/index.ts`
  and a `KioskLinkPanel` entry on `KioskOverview.vue`. `KioskPersonenVerwaltung.vue`
  is the closest existing page: a kiosk-reachable management screen with a create
  form, a list, per-row delete and a confirmation dialog.
- Server calls go through a service in `src/utils/webservices` with the endpoint
  registered in `src/store/rest.ts`; `frigateService.ts` is the deliberate exception,
  documented in its own header as bypassing `BaseService` because it talks to Frigate
  rather than overmind. This change removes the reason for that exception.
- All user-visible text is translated in `src/locales/de-AT.json` and `en-US.json`.
- The backend contract comes from `camera-registry-and-node-routing` in
  `java-overmind-server`, specifically its `ai/draft-cameras-for-frontend.md`.

## Goals / Non-Goals

**Goals:**

- One page that fully answers "which cameras do we have and are they working".
- Consumers read the camera from the registry, so a new camera needs no deploy.
- The page stays usable when a node is down.

**Non-Goals:**

- Configuring anything inside Frigate beyond the camera's connection (zones, masks,
  retention) — that stays on the node.
- A live preview per camera on the management page; testing is an explicit action,
  and a many-camera overview would use still images rather than one stream per row.
- Reordering by drag and drop; ordering is a numeric field for now.

## Decisions

### One page for cameras and nodes, cameras first

Nodes are a supporting concept — you add one rarely, and only because a camera needs
it. They therefore live in a secondary section (or dialog) on the same page rather
than getting their own route, so the answer to "add a camera" never involves finding
a second screen.

*Alternative considered:* a separate Nodes page. Rejected as one more kiosk link for
something that will hold two or three rows.

### The camera list is the source of truth for both consumer pages

`KioskPersonen.vue` and `KioskPersonenEvents.vue` resolve their camera from the
registry by the page-usage flags instead of holding a name. That keeps "which camera
appears where" an operational setting rather than a code change — the actual point of
the change.

*Alternative considered:* a single "default camera" setting. Rejected — it cannot
express a live page and an events page covering different sets, which is exactly what
several nodes will bring.

### `frigateService.ts` becomes an overmind service

Rather than keeping a Frigate client and pointing it at overmind, the calls move into
a service built on the same `BaseService`/`rest.ts` conventions as the rest, and the
Frigate-specific header comment and hard-coded host go away. The existing
`FrigatePastEvent` / `FrigateTrackedPerson` shapes stay as the mapped result types so
the consumer pages change as little as possible.

*Alternative considered:* keep `frigateService` as a thin adapter over the new
service. Rejected — two layers for one call, and the name would then be misleading.

### The live view keeps go2rtc's component but in the relayable mode

`VideoStreamRtc.vue` embeds go2rtc's own `<go2rtc-video>` element against
`/live/webrtc/api/ws?src=<camera>`. Overmind can only relay that socket in go2rtc's
MSE mode, where the media itself travels over the WebSocket; in WebRTC mode the
socket carries only signalling and the media goes node-to-browser directly, past
overmind, using ICE candidates that expose node addresses. The component therefore
keeps its shape and only its URL changes — to overmind's stream handle — with the
mode pinned to what the server relays.

Nothing is re-encoded on the GUI's account: the person overlay is drawn client-side
onto a canvas above the video, not composited into the stream.

*Consequence for this page:* a live preview per row on the Kameras page would open one
relayed stream per camera. That is why testing is an explicit per-row action and any
many-cameras-at-a-glance view uses still images rather than streams.

### Fetch once per page, do not poll the registry

Camera configuration changes when a person edits it, not continuously. The consumer
pages load the camera list on mount; the management page reloads after each of its own
writes. No polling, no SSE subscription for this.

*Trade-off:* a camera added on one tablet does not appear on another until that page
is reopened. Acceptable for configuration data, and cheaper than another live channel.

### Status is displayed, never gathered on load

The list renders the server's stored last-known status. Testing is a per-row action.
This is what keeps opening the page fast when a node is unreachable, and it matches
the backend requirement that listing performs no live checks.

### Deleting warns about footage, renaming warns harder

Deleting a camera does not delete recordings, and changing a Frigate key orphans the
footage recorded under the old one. Both are stated in the confirmation text rather
than left for the user to discover.

## Risks / Trade-offs

- **The backend is not there yet, so nothing can be verified end to end** → Build
  against `ai/draft-cameras-for-frontend.md`, and keep the consumer-page switch as the
  last task group so the page itself can ship and be reviewed first.
- **Switching the consumer pages is the breaking part** → Keep the existing behaviour
  reachable until the registry answers: if the registry returns exactly one live
  camera, the Personen page looks and behaves as it does today, which is the shape the
  seeded `keller` camera produces.
- **Credentials in a form on a kiosk tablet** → The password is never returned by the
  server and never rendered; the field only ever sends a new value.
- **A long camera list on a kiosk screen** → The list uses the same density and layout
  idiom as `KioskPersonenVerwaltung.vue`, which is already known to work on those
  screens.

## Migration Plan

1. Page, service and endpoints first, read-only against the seeded registry.
2. Create, edit, delete and test on the page.
3. Switch `KioskPersonenEvents.vue` over, then `KioskPersonen.vue` — separately, so a
   problem with one does not take down the other.
4. Remove the camera constants and the Frigate host from the sources last; until then
   they remain as the fallback.

*Rollback:* the consumer pages can be pointed back at the constants without touching
the new page, which is additive.

## Open Questions

- Whether the Kameras page belongs behind the same kiosk entry point as the other
  management screens or somewhere less reachable from a wall tablet — a placement
  question that does not change what is built.
