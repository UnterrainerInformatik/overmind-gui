<template>
  <KioskPanel
    v-if="value"
    borderColor="secondary"
    bgColor="black"
    min-width="90"
    max-width="90"
    :renderTitle="false"
  >
    <template>
      <v-card
        class="black ma-n3 pa-0"
        min-width="80"
        max-width="80"
        height="140"
      >
        <v-card-text class="ma-0 pa-0">
          <v-row class="ma-0 mt-0 mb-5 pa-0 align-center">
            <v-col
              class="middle ma-0 pa-0 text-center"
              style="font-weight: bold"
            >
              <v-card outlined class="ma-0 pa-0" :color="error ? 'red' : 'blue darken-4'">
                <v-card-text class="ma-0 pa-0">
                  <v-card class="ma-0 pa-0" size="36" color="black">
                    <v-card-text>
                      <v-icon :color="error ? 'red' : 'blue darken-4'"
                        >water_drop</v-icon
                      >
                    </v-card-text>
                  </v-card>
                </v-card-text>
              </v-card>
              <br />
              {{ getCubicMeters(value) }} m³<br />
              {{ getLiters(value) }} l
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
    </template>
  </KioskPanel>
</template>

<style lang="scss">
@import 'index.scss';
</style>

<script lang="js">
import KioskPanel from '@/components/KioskPanel.vue'
import { singleton as appliancesService } from '@/utils/webservices/appliancesService'
import { Debouncer } from '@/utils/debouncer'

export default {
  name: 'KioskWatermeterPanel',

  props: {
  },

  components: {
    KioskPanel
  },

  data: () => ({
    interval: null,
    value: null,
    error: false,
    debouncer: new Debouncer()
  }),

  computed: {
  },

  watch: {
  },

  methods: {
    async update () {
      const app = await appliancesService.getById(184)
      const state = JSON.parse(app.state)
      this.value = state.value
      this.error = state.error.toLowerCase() !== 'no error'
    },
    getCubicMeters (cm) {
      return Math.floor(cm)
    },
    getLiters (cm) {
      return ((cm * 1000) % 1000).toFixed(1)
    }
  },

  mounted () {
    this.debouncer.debounce(async () => this.update())
    this.interval = setInterval(() => this.debouncer.debounce(async () => this.update()), 10000)
  },

  beforeDestroy () {
    if (this.interval) {
      clearInterval(this.interval)
    }
  }
}
</script>

<style lang="scss">
@import 'index.scss';

.middle {
  font-size: 18px;
  font-weight: normal;
  line-height: 20px;
}
.small {
  font-size: 10px;
  font-weight: normal;
  line-height: 10px;
}
.bold {
  font-weight: bold;
}
</style>
