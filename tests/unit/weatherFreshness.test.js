const assert = require('assert')
const {
  STALE_AFTER_MS,
  weatherFreshness,
  rainAmount,
  isRaining
} = require('../../src/utils/weatherFreshness.ts')

// Fake clock: every test passes this fixed instant as `nowMs`.
const NOW = Date.parse('2026-11-18T07:00:00Z')
const MIN = 60 * 1000
const iso = (ms) => new Date(ms).toISOString()

test('threshold is 30 minutes', () => {
  assert.strictEqual(STALE_AFTER_MS, 30 * MIN)
})

test('12 minutes old is fresh', () => {
  assert.strictEqual(weatherFreshness(iso(NOW - 12 * MIN), NOW).state, 'fresh')
})

test('exactly 30 minutes old is fresh', () => {
  assert.strictEqual(weatherFreshness(iso(NOW - 30 * MIN), NOW).state, 'fresh')
})

test('30 minutes and 1 second old is stale', () => {
  assert.strictEqual(weatherFreshness(iso(NOW - 30 * MIN - 1000), NOW).state, 'stale')
})

test('31 minutes old is stale', () => {
  assert.strictEqual(weatherFreshness(iso(NOW - 31 * MIN), NOW).state, 'stale')
})

test('future timestamp is fresh', () => {
  assert.strictEqual(weatherFreshness(iso(NOW + 5 * MIN), NOW).state, 'fresh')
})

for (const [label, value] of [
  ['missing', undefined],
  ['null', null],
  ['empty string', ''],
  ['"garbage"', 'garbage'],
  ['a number', NOW - 5 * MIN]
]) {
  test(`${label} is unknown`, () => {
    assert.deepStrictEqual(weatherFreshness(value, NOW), { state: 'unknown', measuredAt: null })
  })
}

test('measuredAt is the parsed instant', () => {
  const f = weatherFreshness('2026-11-18T06:10:00Z', NOW)
  assert.ok(f.measuredAt instanceof Date)
  assert.strictEqual(f.measuredAt.getTime(), Date.parse('2026-11-18T06:10:00Z'))
})

test('rainAmount prefers the hourly sum', () => {
  assert.deepStrictEqual(
    rainAmount({ rain: 0.1, rainUnit: ' mm', rainLastHour: 1.4, rainLastHourUnit: ' mm' }),
    { value: 1.4, unit: ' mm' })
})

test('rainAmount falls back to rain', () => {
  assert.deepStrictEqual(rainAmount({ rain: 0.3, rainUnit: ' mm' }), { value: 0.3, unit: ' mm' })
})

test('rainAmount falls back to rain when the hourly sum is not numeric', () => {
  assert.deepStrictEqual(rainAmount({ rain: 0.3, rainUnit: ' mm', rainLastHour: 'x' }), { value: 0.3, unit: ' mm' })
})

test('rainAmount is null when both are missing', () => {
  assert.strictEqual(rainAmount({}).value, null)
  assert.strictEqual(rainAmount(null).value, null)
})

test('rainAmount unit falls back to rainUnit, then " mm"', () => {
  assert.strictEqual(rainAmount({ rainLastHour: 0.2, rainUnit: ' l' }).unit, ' l')
  assert.strictEqual(rainAmount({ rainLastHour: 0.2 }).unit, ' mm')
  assert.strictEqual(rainAmount({ rain: 0.2 }).unit, ' mm')
})

test('isRaining follows rainDuration', () => {
  assert.strictEqual(isRaining({ rainDuration: 0 }), false)
  assert.strictEqual(isRaining({ rainDuration: 100 }), true)
  assert.strictEqual(isRaining({}), false)
  assert.strictEqual(isRaining(null), false)
})
