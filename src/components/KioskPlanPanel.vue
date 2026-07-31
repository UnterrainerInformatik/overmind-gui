<template>
  <KioskPanel
    :isEnabled="calculateEnabled"
    pa="1"
    @click="togglePlan"
    class="noFocus"
    :borderColorRaw="active && item.colorActive ? item.colorActive : null"
    :bgColorRaw="active && item.colorActiveBg ? item.colorActiveBg : null"
  >
    <template v-slot:title>
      <v-avatar
        :color="
          active && item.colorActive
            ? item.colorActive
            : (active ? 'on ' : 'off ') + ' darken-1'
        "
        size="38"
      >
        <v-icon v-if="item.icon">{{ item.icon }}</v-icon>
        <v-icon v-else>power_settings_new</v-icon>
      </v-avatar>
    </template>
    <template>
      <span v-html="item.description"></span>
    </template>
  </KioskPanel>
</template>

<script lang="js">
import KioskPanel from '@/components/KioskPanel.vue'
import { singleton as plansService } from '@/utils/webservices/plansService'
import { dispatchMultiStateAction } from '@/types/multiStateButton'

export default {
  name: 'KioskPlanPanel',

  props: {
    item: {
      type: Object,
      required: true
    }
  },

  components: {
    KioskPanel
  },

  data: () => ({
    active: false,
    pending: false
  }),

  computed: {
  },

  watch: {
  },

  methods: {
    async calculateEnabled () {
      if (this.item.planId == null) {
        this.active = false
        return false
      }
      try {
        this.active = !!(await plansService.isPlanEnabled(this.item.planId))
      } catch (e) {
        console.error('KioskPlanPanel: plan check failed', this.item.planId, e)
        this.active = false
      }
      return this.active
    },

    async togglePlan () {
      if (this.item.planId == null) {
        console.error('KioskPlanPanel: missing planId', this.item)
        return
      }
      if (this.pending) {
        return
      }
      this.pending = true
      try {
        await dispatchMultiStateAction({ kind: 'plan-toggle', planId: this.item.planId })
      } catch (e) {
        console.error('KioskPlanPanel: plan toggle failed', this.item.planId, e)
      } finally {
        this.pending = false
      }
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
