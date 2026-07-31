<template>
  <KioskPanel
    :isEnabled="calculateEnabled"
    pa="1"
    @click="togglePlan"
    class="noFocus"
    :borderColorRaw="active && item.colorActive ? item.colorActive : null"
    :bgColorRaw="active && item.colorActiveBg ? item.colorActiveBg : null"
    :maxWidth="item.maxWidth"
    :minWidth="item.minWidth"
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
      <div class="plan-panel-content">
        <div class="plan-panel-label"><span v-html="item.description"></span></div>
        <div
          v-if="item.descriptionActive"
          class="plan-panel-hint text-caption"
          :class="{ 'plan-panel-hint-idle': !active }"
        >
          <span v-html="item.descriptionActive"></span>
        </div>
      </div>
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

.plan-panel-content {
  display: flex;
  flex-direction: column;
  line-height: 1.1;
}

.plan-panel-hint {
  margin-top: 2px;
  opacity: 0.65;
  font-size: 12px !important;
  line-height: 1.1 !important;
}

/* Platz der Hinweiszeile bleibt reserviert, damit die Panel-Hoehe
   und damit die Hoehe der gesamten Schalter-Reihe beim Schalten nicht springt. */
.plan-panel-hint-idle {
  visibility: hidden;
}
</style>
