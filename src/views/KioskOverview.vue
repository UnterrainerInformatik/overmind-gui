<template>
  <div class="home">
    <v-container fluid class="ma-0 pa-0">
      <v-row class="ma-0 pa-0" cols="12">
        <v-col class="ma-0 pa-0 d-flex flex-wrap" cols="12">
          <KioskClockPanel></KioskClockPanel>
          <KioskZamgPanel></KioskZamgPanel>
          <KioskWasteDisposalPanel :organic="false"></KioskWasteDisposalPanel>
          <KioskPowerPanel
            :data="[
              [
                {
                  appliances: [
                    {
                      id: 145,
                      indexes: [0, 1, 2]
                    }
                  ],
                  gradient: {
                    from: [255, 180, 0, 0.7],
                    to: [255, 0, 0, 1]
                  },
                  max: 4000,
                  icons: ['electric_bolt']
                }
              ],
              [
                {
                  appliances: [
                    {
                      id: 142,
                      indexes: [0]
                    }
                  ],
                  max: 800,
                  gradient: {
                    from: [120, 255, 120, 0.3],
                    to: [0, 255, 0, 0.6]
                  },
                  icons: ['solar_power']
                }
              ],
              /*[
                {
                  appliances: [
                    {
                      id: 142,
                      indexes: [0]
                    }
                  ],
                  isBattery: true,
                  max: 800,
                  gradient: {
                    from: [120, 255, 120, 0.3],
                    to: [0, 255, 0, 0.6]
                  },
                  icons: ['battery_charging_full']
                }
              ],*/
              [
                {
                  appliances: [
                    {
                      id: 32,
                      indexes: [0, 1]
                    },
                    {
                      id: 33,
                      indexes: [0, 1]
                    },
                    {
                      id: 40,
                      indexes: [0]
                    },
                    {
                      id: 41,
                      indexes: [0]
                    },
                    {
                      id: 42,
                      indexes: [0]
                    },
                    {
                      id: 43,
                      indexes: [0]
                    },
                    {
                      id: 44,
                      indexes: [0]
                    },
                    {
                      id: 48,
                      indexes: [0]
                    },
                    {
                      id: 58,
                      indexes: [0]
                    },
                    {
                      id: 94,
                      indexes: [0]
                    },
                    {
                      id: 95,
                      indexes: [0]
                    },
                    {
                      id: 96,
                      indexes: [0]
                    },
                    {
                      id: 102,
                      indexes: [0]
                    },
                    {
                      id: 103,
                      indexes: [0]
                    },
                    {
                      id: 106,
                      indexes: [0]
                    },
                    {
                      id: 107,
                      indexes: [0]
                    },
                    {
                      id: 108,
                      indexes: [0]
                    },
                    {
                      id: 116,
                      indexes: [0]
                    },
                    {
                      id: 117,
                      indexes: [0]
                    },
                    {
                      id: 119,
                      indexes: [0]
                    },
                    {
                      id: 140,
                      indexes: [0]
                    }
                  ],
                  gradient: {
                    from: [255, 100, 0, 0.3],
                    to: [255, 120, 0, 1]
                  },
                  max: 650,
                  icons: ['lightbulb']
                },
                {
                  appliances: [
                    {
                      id: 146,
                      indexes: [0, 1, 2]
                    }
                  ],
                  gradient: {
                    from: [255, 100, 0, 0.3],
                    to: [255, 120, 0, 1]
                  },
                  max: 8000,
                  icons: ['local_fire_department']
                }
              ],
              [
                {
                  appliances: [
                    {
                      id: 156,
                      indexes: [0]
                    }
                  ],
                  gradient: {
                    from: [255, 100, 0, 0.3],
                    to: [255, 120, 0, 1]
                  },
                  max: 80,
                  icons: ['kitchen', 'arrow_upward']
                },
                {
                  appliances: [
                    {
                      id: 155,
                      indexes: [0]
                    }
                  ],
                  gradient: {
                    from: [255, 100, 0, 0.3],
                    to: [255, 120, 0, 1]
                  },
                  max: 100,
                  icons: ['kitchen', 'arrow_downward']
                }
              ]
            ]"
          ></KioskPowerPanel>
        </v-col>
      </v-row>
      <v-row class="ma-0 pa-0" cols="12">
        <v-col class="ma-0 pa-0 d-flex flex-wrap" cols="12">
          <KioskSwitchPanel :item="allHereGoneItem"></KioskSwitchPanel>
          <KioskSwitchPanel :item="allAsleepItem"></KioskSwitchPanel>
          <KioskSwitchPanel :item="shuttersFirstFloor"></KioskSwitchPanel>
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
import KioskPowerPanel from '@/components/KioskPowerPanel.vue'
import { singleton as plansService } from '@/utils/webservices/plansService'

export default {
  name: 'kioskOverview',

  components: {
    KioskLinkPanel,
    KioskClockPanel,
    KioskZamgPanel,
    KioskPowerPanel,
    KioskWasteDisposalPanel,
    KioskSwitchPanel
  },

  data: () => ({
    allHereGoneItem: {},
    allAsleepItem: {},
    shuttersGroundFloor: {},
    shuttersFirstFloor: {},
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
      this.shuttersFirstFloor = {
        planId: 72,
        sensorPath: 'switch1',
        eventPath: 'on.click',
        description: 'Rollos 1.Stock rauf',
        isEnabled: () => {
          return plansService.isPlanEnabled(86)
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
