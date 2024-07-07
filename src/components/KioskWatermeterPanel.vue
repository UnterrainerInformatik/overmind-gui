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
        class="black ma-n3 pa-1"
        min-width="80"
        max-width="80"
        height="140"
      >
        <v-card-text class="pa-1">
          <v-row class="ma-0 mt-0 mb-5 pa-0 align-center">
            <v-col
              class="small ma-0 pa-0 text-center"
              style="font-weight: bold"
            >
              <v-avatar
                class="mt-5 mb-5"
                size="36"
                :color="error ? 'red' : 'blue'"
              >
                <v-icon color="black">water_drop</v-icon>
              </v-avatar>
              {{ value }}m³
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
  font-size: 15px;
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
