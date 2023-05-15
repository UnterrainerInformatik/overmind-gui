<template>
  <v-btn
    fab
    :max-width="size"
    :max-height="size"
    :width="size"
    :height="size"
    v-if="level != undefined && level != null"
    :class="'ma-0 pa-0 mr-1 ' + overmindUtils.getBatteryColor(Math.round(level))"
    @click="() => {}"
    v-bind="$attrs"
    v-on="$listeners"
  >
    <v-row class="ma-0 pa-0">
      <v-col class="ma-0 pa-0">
        <v-row class="ma-0 pa-0">
          <v-col class="ma-0 pa-0">
            <v-icon size="14">{{ overmindUtils.getBatteryIcon(level) }}</v-icon>
          </v-col>
        </v-row>
        <v-row class="ma-0 pa-0">
          <v-col class="ma-0 mt-n1 pa-0 small">
              {{ level }}
          </v-col>
        </v-row>
      </v-col>
    </v-row>
  </v-btn>
</template>

<style lang="scss">
@import 'index.scss';
</style>

<script lang="js">
import { singleton as overmindUtils } from '@/utils/overmindUtils'

export default {
  name: 'BatteryIndicator',

  props: {
    level: {},
    size: { default: 36 }
  },

  data: () => ({
    overmindUtils
  }),

  computed: {
  },

  watch: {
  },

  methods: {
  }

}
</script>

<style lang="scss">
@import 'index.scss';

.small {
  font-size: 10px;
}
</style>
