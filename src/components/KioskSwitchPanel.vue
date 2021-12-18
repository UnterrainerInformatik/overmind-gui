<template>
  <KioskPanel
    :isEnabled="item.isEnabled"
    @click="triggerEvent(item.planId, item.sensorPath, item.eventPath)"
    class="noFocus"
  >
    <template v-slot:title="state">
      <v-avatar
        :color="
          (state.enabled ? 'on ' : 'off ') +
          ' darken-' +
          (state.hover ? '0' : '1')
        "
        size="42"
      >
        <v-icon>power_settings_new</v-icon>
      </v-avatar>
    </template>
    <template>
      <span class="text-body-1">
        {{ item.description }}
      </span>
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
  }),

  computed: {
  },

  watch: {
  },

  methods: {
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
