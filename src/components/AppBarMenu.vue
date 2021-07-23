<template>
  <v-menu
    offset-y
    v-model="navMenu"
    :close-on-content-click="false"
    transition="slide-y-transition"
    rounded="b-lg t-0"
    z-index="900"
  >
    <template v-slot:activator="{ on: menu, attrs }">
      <v-tooltip
        bottom
        :open-delay="openDelay"
        :disabled="!tooltips"
        z-index="1000"
      >
        <template v-slot:activator="{ on: tooltip }">
          <v-btn
            icon
            v-bind="attrs"
            v-on="{ ...tooltip, ...menu }"
            active-class="v-btn--active"
            :class="$route.path.startsWith('/settings/') ? 'v-btn--active' : ''"
          >
            <v-icon color="white">settings</v-icon>
          </v-btn>
        </template>
        <div v-html="$t('tooltip.mnu.preferences')"></div>
      </v-tooltip>
    </template>

    <v-list>
      <v-list-group sub-group prepend-icon="expand_more" :class="$vuetify.theme.dark ? 'grey--text text--lighten-3' : 'grey--text text--darken-3'">
        <template v-slot:activator>
          <v-list-item-title>{{ $t('mnu.language') }}</v-list-item-title>
          <v-list-item-icon><v-icon>translate</v-icon></v-list-item-icon>
        </template>
        <v-list-item
          dense
          v-for="(lang, i) in Object.keys($i18n.messages)"
          :key="`Lang${i}`"
          @click="
            () => {
              saveLanguageKey(lang)
            }
          "
          active-class="v-list-item--active"
          :class="($i18n.locale === lang ? 'v-list-item--active' : '') + ' ' + ($i18n.locale === lang ? ' primary white--text' : '')"
        >
          <v-list-item-content>
            <v-list-item-title>{{ lang }}</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
      </v-list-group>

      <v-tooltip top :open-delay="openDelay" :disabled="!tooltips">
        <template v-slot:activator="{ on, attrs }">
          <v-list-item v-bind="attrs" v-on="on">
            <v-list-item-action>
              <v-switch v-model="twoWayTooltips" color="secondary"></v-switch>
            </v-list-item-action>
            <v-list-item-title>{{ $t('mnu.help') }}</v-list-item-title>
          </v-list-item>
        </template>
        <div v-html="$t('tooltip.mnu.help')"></div>
      </v-tooltip>

      <v-tooltip top :open-delay="openDelay" :disabled="!tooltips">
        <template v-slot:activator="{ on, attrs }">
          <v-list-item v-bind="attrs" v-on="on">
            <v-list-item-action>
              <v-switch v-model="dark" color="secondary"></v-switch>
            </v-list-item-action>
            <v-list-item-title>{{ $t('mnu.dark') }}</v-list-item-title>
          </v-list-item>
        </template>
        <div v-html="$t('tooltip.mnu.dark')"></div>
      </v-tooltip>

      <v-tooltip top :open-delay="openDelay" :disabled="!tooltips">
        <template v-slot:activator="{ on, attrs }">
          <v-list-item
            to="/settings/about"
            exact
            @click="navMenu = false"
            v-bind="attrs"
            v-on="on"
          >
            <v-list-item-icon>
              <v-icon>info</v-icon>
            </v-list-item-icon>
            <v-list-item-title>{{ $t('pageTitle.about') }}</v-list-item-title>
          </v-list-item>
        </template>
        <div v-html="$t('tooltip.pageTitle.about')"></div>
      </v-tooltip>
    </v-list>
  </v-menu>
</template>

<script lang="js">
import { mapGetters } from 'vuex'

export default {
  name: 'AppBarMenu',

  data: () => ({
    navMenu: false
  }),

  computed: {
    twoWayTooltips: {
      get () {
        return this.$store.state.gui.tooltips.tooltips
      },
      set (value) {
        this.$store.dispatch('gui/tooltips/tooltips', value)
        localStorage.setItem('tooltips', value)
        console.log('Saved tooltips: ' + value)
      }
    },
    dark: {
      get () {
        return this.$vuetify.theme.dark
      },
      set (value) {
        this.$vuetify.theme.dark = value
        localStorage.setItem('darkTheme', this.$vuetify.theme.dark)
        console.log('Saved darkTheme: ' + this.$vuetify.theme.dark)
      }
    },
    ...mapGetters('gui/tooltips', {
      tooltips: 'tooltips',
      openDelay: 'openDelay'
    })
  },

  methods: {
    saveLanguageKey (lang) {
      this.$i18n.locale = lang
      localStorage.setItem('languageKey', lang)
      console.log('Saved languageKey: ' + lang)
    }
  }
}
</script>
