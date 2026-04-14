---
name: polling-and-debouncing
description: The project-wide pattern for keeping UI fresh (setInterval + Debouncer) and the custom Debouncer class semantics.
---

# Polling and debouncing

The app has **no WebSocket / SSE** layer. Every list view polls the REST API
on a fixed interval, funneling calls through a shared `Debouncer` to avoid
overlapping in-flight requests.

## The boilerplate (copy-pasted into every list view)

```js
data: () => ({
  interval: null,
  raw: {},
  filtered: {},
  loading: true,
  debouncer: new Debouncer()
}),

async getThings (showLoadingProgress) {
  this.loading = showLoadingProgress
  const response = await thingsService.getList()
  // …shape response into this.filtered…
  this.loading = false
},

mounted () {
  this.debouncer.debounce(async () => this.getThings(true))
  this.interval = setInterval(
    () => this.debouncer.debounce(async () => this.getThings(false)),
    5000  // per view: Plans=1000ms, Switches=5000ms, …
  )
},

beforeDestroy () {
  if (this.interval) clearInterval(this.interval)
}
```

The first call passes `true` (show spinner); subsequent polls pass `false`
(silent refresh).

## Debouncer semantics (`src/utils/debouncer.ts`)

Behavior differs from common "lodash debounce":

- **No timeout set** (the view pattern above): calls go through immediately,
  but while a call is in flight, subsequent calls are collapsed into "the
  last one"; when the current call finishes, the queued function runs next.
  This means **it behaves as a no-overlap limiter**, not a time-based debounce.
- **Timeout set**: functions fire at most every `timeout` ms. The first call
  runs immediately (unless `startImmediately: false`). Calls during the timer
  are saved; only the most recent one runs when the timer elapses.

Methods:

- `debounce(func)` — enqueue
- `cancel()` — clear the queued function and the running timer
- `force(func)` — cancel + run immediately
- Optional `enqueueing`/`ending` hooks (called at start/end of a run sequence)

Used by:

- Every list view (no-timeout mode, as above)
- `components/input/Debounced*` input components (timeout mode, to rate-limit
  slider/picker → REST calls)

## Gotchas

- **There is no shared freshness.** Two views polling the same endpoint will
  each make their own request, on their own clock.
- **No exponential backoff** on errors — if the server is down, each view
  hammers at its configured rate until it recovers.
- **Interval is set up only on `mounted`.** If a route is kept alive via
  `<keep-alive>`, the interval won't be torn down on route change. Currently
  no view is kept alive, so this is fine, but watch out if you add it.
- **`Debouncer.timeout` default is `0`**, not null — passing no argument to
  the constructor sets `this.timeout = undefined`, which JS coerces to 0 in
  `setTimeout`. Works by accident.
