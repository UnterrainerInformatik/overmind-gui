<template>
  <div v-if="app && item">
    <v-row>
      <v-col class="ma-0 mr-1 pa-0">
        <v-text-field readonly dense outlined hide-details="true" class="ma-0 my-2 pa-0" label="Bewegung:" :value="getMotion(app)"></v-text-field>
      </v-col>
      <v-col class="ma-0 pa-0">
        <v-text-field readonly dense outlined hide-details="true" class="ma-0 my-2 pa-0" label="Zeitpunkt:" :value="getTimestamp(app)"></v-text-field>
      </v-col>
    </v-row>
    <v-row>
      <v-col class="ma-0 mr-1 pa-0">
        <v-text-field readonly dense outlined hide-details="true" class="ma-0 my-2 pa-0" label="Helligkeit:" :value="getLuminosity(app)"></v-text-field>
      </v-col>
      <v-col class="ma-0 pa-0">
        <v-text-field readonly dense outlined hide-details="true" class="ma-0 my-2 pa-0" label="Vibration:" :value="getVibration(app)"></v-text-field>
      </v-col>
    </v-row>
  </div>
</template>

<script lang="js">
import { singleton as dateUtils } from '@/utils/dateUtils'
import { SseClient } from '@/utils/sseClient'
import { setPathValue } from '@/utils/overmindUtils'

export default {
  name: 'FloorplanMotionDialog',

  props: {
    item: {},
    app: {}
  },

  components: {
  },

  data: () => ({
    sub: null,
    unwatchSub: null
  }),

  computed: {
  },

  watch: {
  },

  methods: {
    getMotion (app) {
      if (app && app.state && app.state.motions && app.state.motions[0] !== undefined && app.state.motions[0].motion !== undefined) {
        return app.state.motions[0].motion ? 'Ja' : 'Nein'
      }
      return null
    },
    getTimestamp (app) {
      if (app && app.state && app.state.motions && app.state.motions[0] !== undefined && app.state.motions[0].timestamp !== undefined) {
        return dateUtils.dateToShortDateLongTime(new Date(app.state.motions[0].timestamp), this.$i18n.locale)
      }
      return null
    },
    getLuminosity (app) {
      if (app && app.state && app.state.luminosities && app.state.luminosities[0] !== undefined && app.state.luminosities[0].luminosity !== undefined) {
        return app.state.luminosities[0].luminosity
      }
      return null
    },
    getVibration (app) {
      if (app && app.state && app.state.vibrations && app.state.vibrations[0] !== undefined && app.state.vibrations[0].vibration !== undefined) {
        return app.state.vibrations[0].vibration ? 'Ja' : 'Nein'
      }
      return null
    },
    applySubValues () {
      if (!this.sub || !this.sub.values || !this.app) {
        return
      }
      if (!this.app.state) {
        this.$set(this.app, 'state', {})
      }
      const prefix = `${this.app.id}:`
      for (const key of Object.keys(this.sub.values)) {
        if (!key.startsWith(prefix)) {
          continue
        }
        const v = this.sub.values[key]
        if (v === undefined) {
          continue
        }
        const path = key.slice(prefix.length)
        setPathValue(this.app.state, path, v)
      }
    }
  },

  mounted () {
    if (!this.app || !this.app.id) {
      return
    }
    this.sub = SseClient.getInstance().subscribe({
      minInterval: 300,
      selection: { perAppliance: [{ applianceId: this.app.id, paths: ['**'] }] }
    })
    this.unwatchSub = this.$watch(() => this.sub && this.sub.ts, () => this.applySubValues())
  },

  beforeDestroy () {
    if (this.unwatchSub) {
      this.unwatchSub()
      this.unwatchSub = null
    }
    if (this.sub) {
      this.sub.close()
      this.sub = null
    }
  }
}
</script>
