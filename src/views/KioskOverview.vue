<template>
  <div class="home">
    <v-container fluid class="ma-0 pa-0 d-flex flex-wrap">
      <KioskSwitchPanel :item="allHereGoneItem"></KioskSwitchPanel>
      <KioskSwitchPanel :item="allAsleepItem"></KioskSwitchPanel>
      <KioskSwitchPanel :item="shuttersGroundFloor"></KioskSwitchPanel>
      <KioskSwitchPanel :item="tv"></KioskSwitchPanel>
      <KioskSwitchPanel :item="snuggling"></KioskSwitchPanel>
      <KioskSwitchPanel :item="bioTrash"></KioskSwitchPanel>
      <KioskSwitchPanel :item="patioOpened"></KioskSwitchPanel>
    </v-container>
  </div>
</template>

<script type="js">
// @ is an alias to /src
import { mapActions } from 'vuex'
import KioskSwitchPanel from '@/components/KioskSwitchPanel.vue'

export default {
  name: 'kioskOverview',

  components: {
    KioskSwitchPanel
  },

  data: () => ({
    allHereGoneItem: {},
    allAsleepItem: {},
    shuttersGroundFloor: {},
    tv: {},
    snuggling: {},
    bioTrash: {},
    patioOpened: {}
  }),

  watch: {
  },

  computed: {
  },

  methods: {
    async reload () {
      this.allHereGoneItem = {
        planId: 22,
        sensorPath: 'switch1',
        eventPath: 'off.click',
        description: 'Alle weg / da',
        enabledPlanForActivation: 65
      }
      this.allAsleepItem = {
        planId: 72,
        sensorPath: 'switch1',
        eventPath: 'off.click',
        description: 'Alle schlafen',
        enabledPlanForActivation: 70
      }
      this.shuttersGroundFloor = {
        planId: 73,
        sensorPath: 'switch2',
        eventPath: 'off.click',
        description: 'Rollos Erdgeschoß runter',
        enabledPlanForActivation: 64
      }
      this.tv = {
        planId: 73,
        sensorPath: 'switch1',
        eventPath: 'off.click',
        description: 'TV',
        enabledPlanForActivation: 73
      }
      this.snuggling = {
        planId: 12,
        sensorPath: 'switch1',
        eventPath: 'on.click',
        description: 'Kinderzimmer kuscheln',
        enabledPlanForActivation: 59
      }
      this.bioTrash = {
        planId: 73,
        sensorPath: 'switch1',
        eventPath: 'on.holdStart',
        description: 'Biomüll auf',
        enabledPlanForActivation: 71
      }
      this.patioOpened = {
        planId: 71,
        sensorPath: 'switch1',
        eventPath: 'on.click',
        description: 'Terrassentüre auf',
        enabledPlanForActivation: 66
      }
    },
    ...mapActions('gui', {
      kioskMode: 'kioskMode'
    })
  },

  mounted () {
    this.kioskMode(true)
    this.reload()
  }
}
</script>

<style lang="scss">
@import 'index.scss';
</style>
