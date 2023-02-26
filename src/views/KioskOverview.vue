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
                  isNegativeEnabled: true,
                  gradient: {
                    from: [255, 180, 0, 0.7],
                    to: [255, 0, 0, 1]
                  },
                  negativeGradient: {
                    from: [120, 255, 120, 0.7],
                    to: [0, 255, 0, 1]
                  },
                  max: 5000,
                  negativeMax: 5000,
                  icons: ['electric_bolt']
                }
              ],
              [
                {
                  appliances: [
                    {
                      id: 142,
                      indexes: [0]
                    },
                    {
                      id: 177,
                      names: ['dcPower']
                    }
                  ],
                  max: 9500,
                  gradient: {
                    from: [120, 255, 120, 0.3],
                    to: [0, 255, 0, 0.6]
                  },
                  icons: ['solar_power']
                },
                {
                  appliances: [
                    {
                      id: 177,
                      names: ['batteryPower']
                    }
                  ],
                  batteryAppliances: [
                    {
                      id: 177,
                      names: ['battery']
                    }
                  ],
                  isNegativeEnabled: true,
                  max: 5500,
                  gradient: {
                    from: [120, 255, 120, 0.3],
                    to: [0, 255, 0, 0.6]
                  },
                  negativeMax: 5500,
                  negativeGradient: {
                    from: [255, 255, 0, 0.3],
                    to: [255, 255, 0, 0.6]
                  },
                  batteryMax: 10,
                  batteryGradient: {
                    from: [255, 255, 120, 0.6],
                    to: [255, 255, 0, 1]
                  },
                  icons: ['battery_charging_full']
                }
              ],
              [
                {
                  appliances: [
                    {
                      id: 158,
                      indexes: [0]
                    },
                    {
                      id: 159,
                      indexes: [0]
                    },
                    {
                      id: 160,
                      indexes: [0]
                    }
                  ],
                  gradient: {
                    from: [255, 100, 0, 0.3],
                    to: [255, 120, 0, 1]
                  },
                  max: 1500,
                  icons: ['local_laundry_service']
                },
                {
                  appliances: [
                    {
                      id: 156,
                      indexes: [0]
                    },
                    {
                      id: 155,
                      indexes: [0]
                    },
                    {
                      id: 154,
                      indexes: [0]
                    }
                  ],
                  gradient: {
                    from: [255, 100, 0, 0.3],
                    to: [255, 120, 0, 1]
                  },
                  max: 180,
                  icons: ['kitchen']
                },
                {
                  appliances: [
                    {
                      id: 148,
                      indexes: [0, 1, 2]
                    },
                    {
                      id: 54,
                      indexes: [0]
                    },
                    {
                      id: 55,
                      indexes: [0]
                    },
                    {
                      id: 56,
                      indexes: [0]
                    },
                    {
                      id: 38,
                      indexes: [0]
                    }
                  ],
                  gradient: {
                    from: [255, 100, 0, 0.3],
                    to: [255, 120, 0, 1]
                  },
                  max: 4000,
                  icons: ['microwave']
                }
              ],
              [
                {
                  appliances: [
                    {
                      id: 146,
                      indexes: [0, 1, 2]
                    },
                    {
                      id: 162,
                      indexes: [0]
                    },
                    {
                      id: 164,
                      indexes: [0]
                    }
                  ],
                  gradient: {
                    from: [255, 100, 0, 0.3],
                    to: [255, 120, 0, 1]
                  },
                  max: 1500,
                  icons: ['fireplace']
                },
                {
                  appliances: [
                    {
                      id: 161,
                      indexes: [0]
                    },
                    {
                      id: 131,
                      indexes: [0]
                    },
                    {
                      id: 129,
                      indexes: [0]
                    },
                    {
                      id: 173,
                      indexes: [0]
                    },
                    {
                      id: 174,
                      indexes: [0]
                    },
                    {
                      id: 175,
                      indexes: [0]
                    },
                    {
                      id: 176,
                      indexes: [0]
                    }
                  ],
                  gradient: {
                    from: [255, 100, 0, 0.3],
                    to: [255, 120, 0, 1]
                  },
                  max: 400,
                  icons: ['lan']
                },
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
                    },
                    {
                      id: 136,
                      indexes: [0]
                    },
                    {
                      id: 137,
                      indexes: [0]
                    },
                    {
                      id: 138,
                      indexes: [0]
                    },
                    {
                      id: 139,
                      indexes: [0]
                    }
                  ],
                  gradient: {
                    from: [255, 100, 0, 0.3],
                    to: [255, 120, 0, 1]
                  },
                  max: 650,
                  icons: ['lightbulb']
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
        applianceId: 22,
        sensorPath: 'switch1',
        eventPath: 'off.click',
        description: 'Alle weg / da',
        isEnabled: () => {
          return plansService.isPlanEnabled(65)
        }
      }
      this.allAsleepItem = {
        applianceId: 72,
        sensorPath: 'switch1',
        eventPath: 'off.click',
        description: 'Alle schlafen',
        isEnabled: () => {
          return plansService.isPlanEnabled(70)
        }
      }
      this.shuttersGroundFloor = {
        applianceId: 73,
        sensorPath: 'switch2',
        eventPath: 'off.click',
        description: 'Rollos Erdgeschoß runter',
        isEnabled: () => {
          return plansService.isPlanEnabled(64)
        }
      }
      this.shuttersFirstFloor = {
        applianceId: 72,
        sensorPath: 'switch1',
        eventPath: 'on.click',
        description: 'Rollos 1.Stock rauf',
        isEnabled: () => {
          return plansService.isPlanEnabled(86)
        }
      }
      this.tv = {
        applianceId: 73,
        sensorPath: 'switch1',
        eventPath: 'off.click',
        description: 'TV',
        isEnabled: () => {
          return plansService.isPlanEnabled(73)
        }
      }
      this.snuggling = {
        applianceId: 12,
        sensorPath: 'switch1',
        eventPath: 'on.click',
        description: 'Kinderzimmer kuscheln',
        isEnabled: () => {
          return plansService.isPlanEnabled(59)
        }
      }
      this.bioTrash = {
        applianceId: 73,
        sensorPath: 'switch1',
        eventPath: 'on.holdStart',
        description: 'Biomüll auf',
        isEnabled: () => {
          return plansService.isPlanEnabled(71)
        }
      }
      this.patioOpened = {
        applianceId: 71,
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
