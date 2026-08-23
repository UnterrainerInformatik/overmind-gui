## 1. Node row chips

- [x] 1.1 Replace the plain icon+text row markup in the pending, done, and error `<td>` templates with a `v-chip` per node (`outlined`, `color="transparent"`, full column width), keeping the existing status icon and node name, and keeping the existing `clickable-node` click-to-open-dialog behavior on pending/error rows.
- [x] 1.2 Inside each chip, lay out the icon+name on the left and the retry count on the right (`d-flex justify-space-between align-center`), reading `node.attemptCount`.
- [x] 1.3 Omit the retry-count segment when `node.attemptCount` is `null`/`undefined` (mirror the existing guard used in the node-detail dialog) rather than showing a placeholder or `0`.
- [x] 1.4 Add the CSS needed to force `v-chip` to 100% width within its column and to keep the background transparent regardless of theme.

## 2. Scrollable node lists

- [x] 2.1 Wrap each column's node list (pending/done/error) in its own container with a bounded `max-height` (viewport-relative unit) and `overflow-y: auto; overflow-x: hidden; -webkit-overflow-scrolling: touch;`.
- [x] 2.2 Add `::-webkit-scrollbar` styling (width, track, thumb) so the scrollbar is visibly present on the right edge whenever a list overflows, rather than relying on the platform's default (often invisible on touch) scrollbar.
- [x] 2.3 Verify a list with content shorter than the bound shows no scrollbar, matching the "only when needed" requirement.

## 3. Verification

- [x] 3.1 Manually verify on the kiosk tablet (or a touch-emulated viewport) that a migration with a long pending/error list can be scrolled by touch to reach nodes below the fold, and that the scrollbar is visible on the right while scrolling.
- [x] 3.2 Manually verify chip rows render correctly (outlined, transparent, full width, right-aligned count) for pending, done, and error nodes, including a node with no `attemptCount`.
- [x] 3.3 Confirm existing behavior is unchanged: tapping a pending/error chip still opens the node-detail dialog; the retry-all-errors button and per-node retry action still work.
