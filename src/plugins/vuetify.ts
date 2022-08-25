import Vue from 'vue'
import Vuetify, {
  VApp,
  VAppBar,
  VAppBarTitle,
  VAppBarNavIcon,
  VAvatar,
  VBtn,
  VBtnToggle,
  VCard,
  VCardTitle,
  VCardSubtitle,
  VCardText,
  VCardActions,
  VChip,
  VContainer,
  VDialog,
  VDivider,
  VExpansionPanels,
  VExpansionPanel,
  VExpansionPanelHeader,
  VExpansionPanelContent,
  VHover,
  VIcon,
  VImg,
  VList,
  VListItem,
  VListItemAction,
  VListItemTitle,
  VListItemSubtitle,
  VListItemContent,
  VListItemIcon,
  VListGroup,
  VMain,
  VMenu,
  VNavigationDrawer,
  VRow,
  VCol,
  VSlider,
  VSpacer,
  VSwitch,
  VTextarea,
  VTextField,
  VToolbar,
  VToolbarTitle,
  VToolbarItems,
  VTooltip,
  VCheckbox,
  VSelect,
  VSnackbar
} from 'vuetify/lib'
import { Ripple, Intersect, Touch, Resize, ClickOutside, Mutate, Scroll } from 'vuetify/lib/directives'

import 'vuetify/dist/vuetify.min.css'
import 'material-design-icons-iconfont/dist/material-design-icons.css'
import { preset } from 'vue-cli-plugin-vuetify-preset-basil/preset'

Vue.use(Vuetify, {
  components: {
    VApp, VAppBar, VAppBarTitle, VAppBarNavIcon, VAvatar, VBtn, VBtnToggle, VCard, VCardTitle, VCardSubtitle, VCardText, VCardActions, VChip, VContainer, VDialog, VDivider, VExpansionPanels, VExpansionPanel, VExpansionPanelHeader, VExpansionPanelContent, VHover, VIcon, VImg, VList, VListItem, VListItemAction, VListItemTitle, VListItemSubtitle, VListItemContent, VListItemIcon, VListGroup, VMain, VMenu, VNavigationDrawer, VRow, VTooltip, VCol, VSpacer, VSlider, VSwitch, VTextField, VTextarea, VToolbar, VToolbarTitle, VToolbarItems, VCheckbox, VSelect, VSnackbar
  },
  directives: { Ripple, Intersect, Touch, Resize, ClickOutside, Mutate, Scroll }
})

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
        error: '#7d3939',
        on: '#707000',
        off: '#000065',
        disabled: '#757575'
      },
      light: {
        primary: '#505050',
        accent: '#629988',
        secondary: '#8E8E8E',
        success: '#7BAB7C',
        info: '#7CC5FF',
        warning: '#d99445',
        error: '#ff6b6b',
        on: '#e0e040',
        off: '#536DFE',
        disabled: '#757575'
      }
    }
  }
})
