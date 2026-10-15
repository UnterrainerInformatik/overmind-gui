## 1. Fix

- [x] 1.1 In `src/views/KioskOverview.vue`, change the battery cell's `batteryMax` from `10` to `100`

## 2. Verify

- [x] 2.1 Run the linter / build (`npm run lint`, `npm run build`) and make sure both pass
- [x] 2.2 After deploying, check on the kiosk that the battery fill matches the live `battery` value of appliance 177 (for example, at roughly 12 % the tile is mostly empty)
