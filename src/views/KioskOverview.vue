<template>
  <div class="home">
    <v-container fluid class="ma-0 pa-0">
      <v-row class="ma-0 pa-0" cols="12">
        <v-col class="ma-0 pa-0 d-flex flex-wrap" cols="12">
          <KioskClockPanel></KioskClockPanel>
          <KioskZamgPanel></KioskZamgPanel>
          <KioskWasteDisposalPanel :organic="false"></KioskWasteDisposalPanel>
        </v-col>
      </v-row>
      <v-row class="ma-0 pa-0" cols="12">
        <v-col class="ma-0 pa-0 d-flex flex-wrap" cols="12">
          <KioskSwitchPanel :item="allHereGoneItem"></KioskSwitchPanel>
          <KioskSwitchPanel :item="allAsleepItem"></KioskSwitchPanel>
          <KioskSwitchPanel :item="shuttersGroundFloor"></KioskSwitchPanel>
          <KioskSwitchPanel :item="tv"></KioskSwitchPanel>
          <KioskSwitchPanel :item="snuggling"></KioskSwitchPanel>
          <KioskSwitchPanel :item="bioTrash"></KioskSwitchPanel>
          <KioskSwitchPanel :item="patioOpened"></KioskSwitchPanel>
        </v-col>
      </v-row>
      <v-row class="ma-0 pa-0" cols="12">
        <v-col class="ma-0 pa-0 d-flex flex-wrap" cols="12">
          <KioskLinkPanel
            :text="$t('page.kiosk.linkLights')"
            route="/app/kiosklights"
          ></KioskLinkPanel>
          <KioskLinkPanel
            :text="$t('page.kiosk.linkPlugs')"
            route="/app/kioskplugs"
          ></KioskLinkPanel>
          <KioskLinkPanel
            :text="$t('page.kiosk.linkContact')"
            route="/app/kioskcontact"
          ></KioskLinkPanel>
          <KioskLinkPanel
            :text="$t('page.kiosk.linkMovement')"
            route="/app/kioskmovement"
          ></KioskLinkPanel>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script type="js">
// @ is an alias to /src
import { mapActions } from 'vuex'
import KioskLinkPanel from '@/components/KioskLinkPanel.vue'
import KioskSwitchPanel from '@/components/KioskSwitchPanel.vue'
import KioskClockPanel from '@/components/KioskClockPanel.vue'
import KioskWasteDisposalPanel from '@/components/KioskWasteDisposalPanel.vue'
import KioskZamgPanel from '@/components/KioskZamgPanel.vue'
import { singleton as plansService } from '@/utils/webservices/plansService'

export default {
  name: 'kioskOverview',

  components: {
    KioskLinkPanel,
    KioskClockPanel,
    KioskZamgPanel,
    KioskWasteDisposalPanel,
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
        isEnabled: () => {
          return plansService.isPlanEnabled(65)
        }
      }
      this.allAsleepItem = {
        planId: 72,
        sensorPath: 'switch1',
        eventPath: 'off.click',
        description: 'Alle schlafen',
        isEnabled: () => {
          return plansService.isPlanEnabled(70)
        }
      }
      this.shuttersGroundFloor = {
        planId: 73,
        sensorPath: 'switch2',
        eventPath: 'off.click',
        description: 'Rollos Erdgeschoß runter',
        isEnabled: () => {
          return plansService.isPlanEnabled(64)
        }
      }
      this.tv = {
        planId: 73,
        sensorPath: 'switch1',
        eventPath: 'off.click',
        description: 'TV',
        isEnabled: () => {
          return plansService.isPlanEnabled(73)
        }
      }
      this.snuggling = {
        planId: 12,
        sensorPath: 'switch1',
        eventPath: 'on.click',
        description: 'Kinderzimmer kuscheln',
        isEnabled: () => {
          return plansService.isPlanEnabled(59)
        }
      }
      this.bioTrash = {
        planId: 73,
        sensorPath: 'switch1',
        eventPath: 'on.holdStart',
        description: 'Biomüll auf',
        isEnabled: () => {
          return plansService.isPlanEnabled(71)
        }
      }
      this.patioOpened = {
        planId: 71,
        sensorPath: 'switch1',
        eventPath: 'on.click',
        description: 'Terrassentüre auf',
        isEnabled: () => {
          return plansService.isPlanEnabled(66)
        }
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
