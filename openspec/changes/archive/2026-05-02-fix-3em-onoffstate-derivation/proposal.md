## Why

A 3-phase energy-meter (Shelly 3EM, `type: 'RELAY'` on the backend) has no relay to switch and therefore reports no `state.relays[0].state`. The current `overmindUtils.addOnOffStateTo` forces such an appliance to `onOffState = 'error'` because the `RELAY` branch demands `state.relays[0].state` exists. The Floorplan then renders it as a small red bolt, hides its wattage, and shrinks its hitbox — even though the device is fully online and power data is flowing via SSE.

A second 3EM in the same installation appears to work only by accident: a buggy early-return in the same function (a stray boolean from a `void` method, gated on `iconPos1` being set) silently exits before assigning `'error'`, leaving `onOffState === undefined`, which `isError` treats as not-error. The two 3EMs differ only in whether `iconPos1` happens to be configured.

## What Changes

- In `overmindUtils.addOnOffStateTo`, change the `PLUG` / `RELAY` / `DIMMER` / `BULB_RGB` branch so that when `state.relays[0].state` is absent **but power is being reported**, `onOffState` is derived from the appliance's summed relay power (`> 0` → `'on'`, otherwise `'off'`). Only when neither relay state nor any power reading is available does the branch still fall through to `'error'`.
- Remove the buggy `iconPos1`-gated early-return inside the same branch (`overmindUtils.ts:257-259`). It returns a stray boolean from a `void` method and silently leaves `onOffState` at its previous value, masking real errors and producing incidental "works" / "broken" splits across otherwise identical appliances.
- The staleness gate (`lastTimeOnline` check at `overmindUtils.ts:245-249`) is unchanged. A genuinely unreachable appliance still surfaces as `'error'`.

## Capabilities

### New Capabilities
<!-- None. -->

### Modified Capabilities
- `floorplan-live-updates`: adds normative rules for how `onOffState` is derived for `RELAY`-family appliances that report power but no `relays[0].state`, and forbids the `iconPos1`-gated early-return masking the error path.

## Impact

- **Code touched**: `src/utils/overmindUtils.ts` (`addOnOffStateTo` only — no signature or call-site change). The `iconPos1` fallback inside `getPowerOf` (`overmindUtils.ts:374-376`) and the `iconPos1` reads in `Floorplan.getColor` / `Floorplan.isOn` are untouched — they're a separate, latent overload of the field name and out of scope for this fix.
- **No SSE / transport changes**. Path subscriptions and selection logic stay as-is; `RELAY` already subscribes to `relays[*].power`, `relays[0].state`, and `lastTimeOnline`.
- **No backend changes**. Whether a 3EM record has `iconPos1` populated is no longer load-bearing for whether the avatar renders correctly.
- **No new dependencies, no migrations.**
- **Behavior change**: a `RELAY`-typed appliance that previously rendered as a red bolt purely because it lacked `relays[0].state` will now render as a normal off/on avatar with its wattage. A `RELAY`-typed appliance whose `lastTimeOnline` is stale still renders as a red bolt (unchanged). A `RELAY`-typed appliance that was incidentally "working" because `iconPos1` was set on it but otherwise had no relay state and no power readings will newly render as `'error'` — which is correct, that case was previously masked.
