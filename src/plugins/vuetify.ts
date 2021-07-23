import Vue from 'vue'
import Vuetify from 'vuetify'
import 'vuetify/dist/vuetify.min.css'
import 'material-design-icons-iconfont/dist/material-design-icons.css'
import { preset } from 'vue-cli-plugin-vuetify-preset-basil/preset'

Vue.use(Vuetify)

// https://lobotuerto.com/vuetify-color-theme-builder/
export default new Vuetify({
  preset,
  icons: {
    iconfont: 'md'
  },
  rtl: false,
  theme: {
    dark: true,
    themes: {
      dark: {
        primary: '#2A2A2A',
        accent: '#294543',
        secondary: '#535353',
        success: '#2D532E',
        info: '#295476',
        warning: '#785A35',
        error: '#784242'
      },
      light: {
        primary: '#505050',
        accent: '#30403F',
        secondary: '#6E6E6E',
        success: '#7BAB7C',
        info: '#7CC5FF',
        warning: '#FFD39C',
        error: '#FFABAB'
      }
    }
  }
})
