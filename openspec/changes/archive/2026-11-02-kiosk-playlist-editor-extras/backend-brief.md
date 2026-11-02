# Backend brief for `java-overmind-server`

From GUI change `kiosk-playlist-editor-extras` (design D1). The GUI already sends and listens;
both additions are backwards compatible, so the deploy order does not matter.

## 1. `shuffle` on playMedia

`POST /audio/targets/{targetId}/playMedia`

```json
{ "uri": "library://playlist/7", "shuffle": true }
```

- `shuffle` is optional. The GUI sends it for playlists only (editor play button, queue popup
  playlist tap); radio stations still send `{uri}` alone.
- `true`: turn the target queue's shuffle on, then replace the queue.
  `false`: turn shuffle off, then replace. Missing: leave shuffle as it is.
- Music Assistant commands, in this order:
  1. `player_queues/shuffle` with `queue_id` (the target's queue id) and `shuffle_enabled`
  2. `player_queues/play_media` with `queue_id`, `media: <uri>`, `option: "replace"`
- Answer unchanged (204; 502 with `reason` on an MA failure).

## 2. SSE event `audio-playlist-changed`

Sent on `/sse/appliances` to every connection, like `audio-state`:

```
event: audio-playlist-changed
data: {"playlistId": 7}
```

- `playlistId` is the id as in `GET /audio/playlists`.
- Fired on every change to a playlist, whoever made it: tracks added, removed or moved,
  renamed, created, deleted.
- Sources: MA events `media_item_updated`, `media_item_added`, `media_item_deleted` with
  media type `playlist`, plus the server's own edits through
  `POST|PATCH|DELETE /audio/playlists...`.
- Coalesce per playlist (~500 ms), so a burst of MA events gives one SSE event per playlist.
- A missing `playlistId` is allowed (the GUI then reloads the list and the open playlist).

## What the GUI does with it

- Editor open: reloads the playlist list, plus the open playlist's tracks when the id matches
  (or is missing or unknown). Held back during a drag or a running edit; also reloads after every
  SSE reconnect.
- Without the event: no live update, everything else works. Without `shuffle` support: Jackson
  ignores the field, playlists play in order.
