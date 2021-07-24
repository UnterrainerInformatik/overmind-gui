<template>
  <div id="main">
    <v-app>
      <v-navigation-drawer
        v-cloak
        color="secondary"
        app
        v-model="twoWayDrawerVisible"
        clipped
        :permanent="$vuetify.breakpoint.mdAndUp"
        :temporary="!$vuetify.breakpoint.mdAndUp"
      >
        <NavDrawer></NavDrawer>
      </v-navigation-drawer>

      <v-app-bar v-cloak app clipped-left short dense color="primary">
        <v-app-bar-nav-icon
          @click="toggleDrawerVisible"
          class="hidden-md-and-up"
        >
          <v-icon>menu</v-icon>
        </v-app-bar-nav-icon>

        <v-toolbar-title class="ma-0 pa-0">
          <v-container class="ma-0 pa-0">
            <img
              class="ma-0 pa-0 mt-3"
              width="40"
              alt="logo"
              src="@/assets/logo.png"
            /> </v-container
        ></v-toolbar-title>

        <v-spacer></v-spacer>
        <h3 class="nav-drawer-white">
          {{ $route.name !== null ? $t('pageTitle.' + $route.name) : '' }}
        </h3>
        <v-spacer></v-spacer>

        <AppBarMenu></AppBarMenu>
      </v-app-bar>

      <v-main>
        <ModalLoading></ModalLoading>
        <Snackbar></Snackbar>
        <v-container fluid>
          <router-view>Loading...</router-view>
        </v-container>
      </v-main>
    </v-app>
    <input type="hidden" id="hiddenCopyField" />
  </div>
</template>

<script lang="js">
import { mapGetters, mapActions } from 'vuex'
import NavDrawer from '@/components/NavDrawer.vue'
import AppBarMenu from '@/components/AppBarMenu.vue'
import Snackbar from '@/components/Snackbar.vue'
import ModalLoading from '@/components/ModalLoading.vue'

export default {
  name: 'Main',

  components: {
    NavDrawer,
    AppBarMenu,
    ModalLoading,
    Snackbar
  },

  data: () => ({
    windowSize: {
      x: 0,
      y: 0
    },
    localeBackingField: '',
    darkTheme: 'false',
    languageKey: 'de'
  }),

  computed: {
    locale: {
      get () {
        return this.$i18n.locale
      },
      set (value) {
        this.localeBackingField = value
      }
    },
    twoWayDrawerVisible: {
      get () {
        return this.$store.state.gui.drawerVisible
      },
      set (value) {
        this.$store.dispatch('gui/drawerVisible', { value, time: 0 })
      }
    },
    ...mapGetters({
      lastMdAndUp: 'lastMdAndUp'
    }),
    ...mapGetters('gui/tooltips', {
      tooltips: 'tooltips',
      openDelay: 'openDelay'
    })
  },

  methods: {
    goto (destination) {
      if (this.$router.currentRoute.path !== destination) {
        this.$router.push(destination)
      }
    },
    ...mapActions('gui', {
      toggleDrawerVisible: 'toggleDrawerVisible'
    })
  },

  mounted () {
    const lang = localStorage.getItem('languageKey')
    if (lang) {
      console.log('Loaded languageKey: ' + lang)
      this.$i18n.locale = lang
    } else {
      console.log('Setting languageKey default')
      this.$i18n.locale = 'de'
    }

    const theme = localStorage.getItem('darkTheme')
    if (theme) {
      console.log('Loaded darkTheme: ' + theme)
      if (theme === 'false') {
        this.$vuetify.theme.dark = false
      } else {
        this.$vuetify.theme.dark = true
      }
    } else {
      console.log('Setting darkTheme default')
      this.$vuetify.theme.dark = 'false'
    }

    const tool = localStorage.getItem('tooltips')
    if (tool) {
      console.log('Loaded tooltips: ' + tool)
      if (tool === 'false') {
        this.$store.dispatch('gui/tooltips/tooltips', false)
      } else {
        this.$store.dispatch('gui/tooltips/tooltips', true)
      }
    } else {
      console.log('Setting tooltips default')
      this.$store.dispatch('gui/tooltips/tooltips', true)
    }
  }
}
</script>

<style lang="scss" scoped>
@import 'styles/index.scss';

.v-app {
  min-height: 100vh;
  max-height: 100vh;
  height: 100vh;
  border: 1px solid rgba(#000, 0.12);
}

.v-navigation-drawer {
  width: $nav_menu_width;
  max-width: calc(100vw - #{$nav_menu_width});
}

.nav-drawer-white {
  color: white;
}
</style>
