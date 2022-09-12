<template>
  <div class="home">
    <v-btn-toggle mandatory borderless dense rounded v-model="viewToggle">
      <v-btn
        class="ma-1"
        @click="
          () => {
            onlyEnabled = true
            this.getPlans(true, size, offset)
          }
        "
        >{{ $t('page.plans.viewToggle.active') }}</v-btn
      >
      <v-btn
        class="ma-1"
        @click="
          () => {
            onlyEnabled = false
            this.getPlans(true, size, offset)
          }
        "
        >{{ $t('page.plans.viewToggle.all') }}</v-btn
      >
    </v-btn-toggle>
    <v-container fluid class="ma-0 pa-0">
      <span v-for="(item, i) in raw.entries" :key="i">
        <PlanPanel :item="item" :size="size" :offset="offset" @reload="getPlans"></PlanPanel>
      </span>
    </v-container>
  </div>
</template>

<script type="js">
// @ is an alias to /src
import PlanPanel from '@/components/PlanPanel.vue'
import { singleton as plansService } from '@/utils/webservices/plansService'

export default {
  name: 'Plans',

  components: {
    PlanPanel
  },

  data: () => ({
    interval: null,
    raw: {},
    offset: 0,
    size: 1000,
    viewToggle: 1,
    onlyEnabled: false,
    loading: true
  }),

  watch: {
  },

  computed: {
  },

  methods: {
    async getPlans (showLoadingProgress, size, offset, additionalParams) {
      this.loading = showLoadingProgress
      return plansService.getOrderedPlans(size, offset, additionalParams, this.onlyEnabled).then((response) => {
        this.raw = response
        this.loading = false
      })
    }
  },

  mounted () {
    this.getPlans(true, this.size, this.offset)
    this.interval = setInterval(() => this.getPlans(false, this.size, this.offset), 1000)
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
</style>
