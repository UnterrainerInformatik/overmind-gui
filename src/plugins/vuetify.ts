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
        primary: '#3A3A3A',
        accent: '#294543',
        secondary: '#696969',
        success: '#2b4d2c',
        info: '#244661',
        warning: '#a16f32',
        error: '#7d3939'
      },
      light: {
        primary: '#505050',
        accent: '#629988',
        secondary: '#8E8E8E',
        success: '#7BAB7C',
        info: '#7CC5FF',
        warning: '#d99445',
        error: '#ff6b6b'
      }
    }
  }
})
