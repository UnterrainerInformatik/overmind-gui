<template>
  <KioskPanel borderColor="secondary">
    <template v-slot:title>
      <v-avatar color="transparent" size="42">
        <v-icon>schedule</v-icon>
      </v-avatar>
    </template>
    <template>
      <v-row>
        <v-col>
          {{ dateUtils.dateToDateLong(date, $i18n.locale) }}<br />
        </v-col>
      </v-row>
      <v-row>
        <v-col>
          <span class="text-h4">
            {{ dateUtils.dateToTime(date, $i18n.locale) }}
          </span>
        </v-col>
      </v-row>
    </template>
  </KioskPanel>
</template>

<style lang="scss">
@import 'index.scss';
</style>

<script lang="js">
import KioskPanel from '@/components/KioskPanel.vue'
import { singleton as dateUtils } from '@/utils/dateUtils'

export default {
  name: 'KioskClockPanel',

  props: {
  },

  components: {
    KioskPanel
  },

  data: () => ({
    dateUtils,
    date: new Date()
  }),

  computed: {
  },

  watch: {
  },

  methods: {
    update () {
      this.date = new Date()
    }
  },

  mounted () {
    setInterval(() => this.update(), 1000)
  }
}
</script>

<style lang="scss">
@import 'index.scss';
</style>
