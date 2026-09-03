## Context

See `proposal.md` — Why. The GUI side of this was written in advance:
`frigateService.ts` already declared `box: [number, number, number, number]`,
already read `subLabelScore` and `zones`, and its own comment said the overlay
would start working the day they arrived. So this is not a design of something
new; it is the removal of the workarounds that stood in for the missing fields.

The contract is `ai/draft-live-overlay-for-frontend.md` in
java-overmind-server, authoritative source `openspec/changes/camera-live-overlay`
there — deployed and verified against the live Frigate 0.17.2 on 2026-09-02.

Two properties of that payload shape everything below:

- **Null fields are omitted throughout the API.** An absent key is how "the node
  reported none" is said, so `undefined` is the value to check, and `0` is never
  a stand-in for unknown.
- **`box` is `[x, y, width, height]`, normalised to 0..1, and nothing enforces
  that order.** It is a flat array because the overlay destructures it. A wrong
  order is a silent bug in a picture rather than a type error.

## Goals / Non-Goals

**Goals:**

- The overlay draws again, without the drawing code changing.
- Filtering happens where the events are, so a page of thirty is thirty events
  the page will show.
- The service's comments say what the payload does, so the next reader does not
  rediscover the field order or the absent-vs-zero rule from a wrong picture.

**Non-Goals:**

- Changing how the overlay draws. `VideoStream.vue` and `VideoStreamRtc.vue` are
  read-only here; they already handle a missing face confidence and empty zones.
- Making the box track a moving person (see Risks).
- Showing zone names. The field is forwarded correctly and will stay empty until
  somebody draws a zone in Frigate — no camera on this installation has one.

## Decisions

**Push both filters to the node rather than keep filtering here.**
Both are optional, and nothing would break by keeping the client-side versions;
they are a saving, not a migration. They are worth taking anyway for two
different reasons. `inProgress=true` is about cost: the live page polls one
request per camera every two seconds, so pulling a full list to keep the two
events without an `endTime` is that work done sixty times a minute.
`subLabel=` is about correctness of paging: the widened page size existed only
because a 30-event slice could filter down to nothing while matches sat behind
it, and the filter's `returned` count existed only to tell that case apart.
Both disappear with the filter that needed them.

**Drop `returned` from `FrigateEventsPage` instead of leaving it as a count.**
It answered exactly one question — "did this page filter down to nothing, or is
the server out of events?" — which cannot arise once nothing filters after the
server. Keeping it would leave a field whose two possible readings have merged
and whose caller-side comment no longer describes anything.

**Normalise a missing `subLabelScore` to `null` at the service edge, not at the
overlay.** The overlay already checks for both `null` and `undefined`, so this
changes no picture. It is done because `FrigateTrackedPersonData` declares
`sub_label_score: number | null`, and the wire value arrives through an `any`,
so `undefined` would slip past the type unnoticed and make the declaration a
lie. The alternative — widening the type to include `undefined` — spreads the
absence into every consumer instead of ending it at the one place that reads the
wire.

**Do not compare the returned `subLabel` with the name that was asked for.**
A sub-label can name several recognised faces at once ("alexander, marlene") and
matches a query for either, so equality would throw away exactly the events the
old client-side filter already wrongly dropped. The name goes into the request;
the label that comes back is rendered as the label it is. The page never
compared them, so this is a property to preserve rather than code to write.

**Keep dropping box-less detections.** Unchanged behaviour, but now written into
the spec: an event without a position is still returned by the server and must
not be drawn at a guessed one.

## Risks / Trade-offs

- **The box lags the video.** Frigate derives `box` from the best frame it has
  seen of an object and replaces it only when a better frame arrives, so while a
  person stands still, or moves after their best frame, the box trails —
  sometimes by seconds. → Not a regression: it is the same field the page read
  when it talked to Frigate directly, so the overlay is exactly as accurate as it
  used to be. Written into the service comment so it is not mistaken for a fault
  of the new payload. If it ever bothers anybody, Frigate carries a trajectory
  (`data.path_data`) whose last entry is closer to now; overmind does not forward
  it, and that is a separate change worth doing only then.
- **A wrong `[x, y, width, height]` order is invisible to the compiler.** → The
  order is stated at the field in the service comment, next to the code that
  destructures it, and the overlay is verified against the live picture rather
  than against types.
- **An older overmind would ignore `subLabel=` and answer with every event** —
  the one failure mode that looks like success. → The server carrying these
  filters is already deployed and verified; a name that matches nobody was
  confirmed to answer `{"events":[]}` rather than the full list.
- **Zones stay empty.** → Correct and expected; only a note, so an empty list is
  not read as a bug in this change.

## Migration Plan

None needed. Every server-side addition is an optional field or an optional
parameter, so the two sides do not have to be deployed in step: the page that
runs today keeps running and starts drawing on its next load.
