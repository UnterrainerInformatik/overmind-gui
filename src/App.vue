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
              width="200"
              alt="nexus-logo"
              src="@/assets/logo.png"
            /> </v-container
        ></v-toolbar-title>

        <v-spacer></v-spacer>
        <h3 class="nav-drawer-white">
          {{ $route.name !== null ? $t('pageTitle.' + $route.name) : '' }}
        </h3>
        <v-spacer></v-spacer>

        <AppBarMenu></AppBarMenu>

        <v-tooltip
          bottom
          :open-delay="openDelay"
          :disabled="!tooltips"
          z-index="1000"
        >
          <template v-slot:activator="{ on, attrs }">
            <v-btn icon @click="logout()" v-bind="attrs" v-on="on">
              <v-icon color="white">power_settings_new</v-icon>
            </v-btn>
          </template>
          <div v-html="$t('tooltip.mnu.logout')"></div>
        </v-tooltip>
      </v-app-bar>

      <v-main>
        <div>
          userName: {{ userName }}<br />
          darkTheme: {{ darkTheme }}<br />
          languageKey: {{ languageKey }}
        </div>
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
import keycloakUtils from '@/utils/keycloakUtils'
import preferencesUtils from '@/utils/preferencesUtils'

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
    localeBackingField: ''
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
    }),
    ...mapGetters('preferences', {
      darkTheme: 'darkTheme',
      languageKey: 'languageKey'
    }),
    ...mapGetters('keycloak', {
      userName: 'userName'
    })
  },

  methods: {
    logout () {
      keycloakUtils.logout().then(() => {
        window.location.href = 'https://nexus.unterrainer.info'
      })
    },
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
    preferencesUtils.load(this.$store.getters['keycloak/userName']).then(() => {
      this.$i18n.locale = this.$store.getters['preferences/languageKey']
      this.$vuetify.theme.dark = this.$store.getters['preferences/darkTheme']
    })
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
