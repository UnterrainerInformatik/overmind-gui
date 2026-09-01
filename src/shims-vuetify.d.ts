import Vue from 'vue'
import Vuetify from 'vuetify'

// Vuetify 2.5's own augmentation of ComponentOptions (node_modules/vuetify/types/index.d.ts)
// repeats Vue's full type parameter list, which references type aliases that Vue 2.6 declares
// but does not export (DefaultData, DefaultProps, ...). Those names are out of scope there, so
// the augmentation fails to merge and `new Vue({ vuetify })` in main.ts is rejected. Declaring
// the option here — the way vue-router declares `router` — restores it.
declare module 'vue/types/options' {
  interface ComponentOptions<V extends Vue> {
    vuetify?: Vuetify;
  }
}
