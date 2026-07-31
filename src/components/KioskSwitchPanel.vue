<template>
  <KioskPanel
    :isEnabled="calculateEnabled"
    pa="1"
    @click="triggerEvent(item.applianceId, item.sensorPath, item.eventPath)"
    class="noFocus"
    :borderColorRaw="active && item.colorActive ? item.colorActive : null"
    :bgColorRaw="active && item.colorActiveBg ? item.colorActiveBg : null"
  >
    <template v-slot:title="state">
      <v-avatar
        :color="
          state.enabled && item.colorActive
            ? item.colorActive
            : (state.enabled ? 'on ' : 'off ') + ' darken-1'
        "
        size="38"
      >
        <v-icon>power_settings_new</v-icon>
      </v-avatar>
    </template>
    <template>
      <span v-html="item.description"></span>
    </template>
  </KioskPanel>
</template>

<style lang="scss">
@import 'index.scss';
</style>

<script lang="js">
import KioskPanel from '@/components/KioskPanel.vue'
import { singleton as eventsService } from '@/utils/webservices/eventsService'

export default {
  name: 'KioskSwitchPanel',

  props: {
    item: {}
  },

  components: {
    KioskPanel
  },

  data: () => ({
    active: false
  }),

  computed: {
  },

  watch: {
  },

  methods: {
    async calculateEnabled () {
      if (typeof this.item.isEnabled !== 'function') {
        this.active = false
        return false
      }
      try {
        this.active = !!(await this.item.isEnabled())
      } catch (e) {
        console.error('KioskSwitchPanel: enabled check failed', this.item.applianceId, e)
        this.active = false
      }
      return this.active
    },

    async triggerEvent (id, sensorPath, eventPath) {
      console.log('triggerEvent')
      return eventsService.trigger(() => {
        return {
          applianceId: id,
          sensorPath: sensorPath,
          eventPath: eventPath
        }
      })
    }
  }
}
</script>

<style lang="scss">
@import 'index.scss';

.noFocus:focus::before {
  opacity: 0 !important;
}
</style>
