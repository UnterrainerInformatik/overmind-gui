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
        primary: '#6B0C37',
        accent: '#9575CD',
        secondary: '#3D2577',
        success: '#429144',
        info: '#16639E',
        warning: '#B56300',
        error: '#C42B2B'
      },
      light: {
        primary: '#893065',
        accent: '#9575CD',
        secondary: '#D1C4E9',
        success: '#81C784',
        info: '#4FC3F7',
        warning: '#FFF176',
        error: '#E57373'
      }
    }
  }
})
