import Vue from 'vue'
import App from './App.vue'

import router from './router'

import VueI18n from 'vue-i18n'
import messages from '@/locales/i18n'

import vuetify from '@/plugins/vuetify'
import store from '@/store'

import axios from 'axios'
import VueAxios from 'vue-axios'

import VueGoogleCharts from 'vue-google-charts'

Vue.config.productionTip = false

Vue.use(VueGoogleCharts)
Vue.use(VueI18n)
const i18n = new VueI18n({
  locale: 'en',
  messages
})
Vue.use(VueAxios, axios)

new Vue({
  vuetify,
  i18n,
  store,
  router,
  render: h => h(App)
}).$mount('#app')
