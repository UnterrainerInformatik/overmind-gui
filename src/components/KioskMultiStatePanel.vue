<template>
  <div class="multi-state-panel-wrapper">
    <v-icon
      class="multi-state-hint-icon"
      :class="{ 'multi-state-hint-icon-override': isOverrideActive }"
      small
    >format_list_bulleted</v-icon>
    <KioskPanel
      :isEnabled="calculateEnabled"
      pa="1"
      @click="openDialog"
      class="noFocus"
    >
      <template v-slot:title>
        <v-avatar
          :color="
            (isOverrideActive ? 'on ' : 'off ') + ' darken-1'
          "
          size="38"
        >
          <v-icon v-if="activeState && activeState.icon">{{ activeState.icon }}</v-icon>
          <v-icon v-else-if="config.icon">{{ config.icon }}</v-icon>
          <v-icon v-else>tune</v-icon>
        </v-avatar>
      </template>
      <template>
        <div class="multi-state-panel-content">
          <div class="multi-state-panel-label text-caption">
            {{ config.label }}
          </div>
          <div class="multi-state-panel-state text-body-1 font-weight-bold">
            {{ activeState ? activeState.label : '' }}
          </div>
        </div>
      </template>
    </KioskPanel>

    <v-dialog v-model="dialogOpen" max-width="320">
      <v-card>
        <v-list class="multi-state-list">
          <v-list-item
            v-for="state in config.states"
            :key="state.id"
            @click="selectState(state)"
            class="multi-state-item"
            :class="state.id === activeStateId ? 'multi-state-item-active' : 'multi-state-item-passive'"
          >
            <v-list-item-icon v-if="state.icon">
              <v-icon>{{ state.icon }}</v-icon>
            </v-list-item-icon>
            <v-list-item-content>
              <v-list-item-title>{{ state.label }}</v-list-item-title>
              <v-list-item-subtitle v-if="state.description">
                {{ state.description }}
              </v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
        </v-list>
      </v-card>
    </v-dialog>
  </div>
</template>

<script lang="js">
import KioskPanel from '@/components/KioskPanel.vue'
import { singleton as plansService } from '@/utils/webservices/plansService'
import { dispatchMultiStateAction } from '@/types/multiStateButton'

export default {
  name: 'KioskMultiStatePanel',

  props: {
    config: {
      type: Object,
      required: true
    }
  },

  components: {
    KioskPanel
  },

  data: () => ({
    activeStateId: null,
    dialogOpen: false
  }),

  computed: {
    activeState () {
      if (!this.config || !Array.isArray(this.config.states)) {
        return null
      }
      const byId = this.config.states.find(s => s.id === this.activeStateId)
      if (byId) return byId
      return this.config.states.find(s => s.id === this.config.defaultStateId) || null
    },
    isOverrideActive () {
      return this.activeStateId != null && this.activeStateId !== this.config.defaultStateId
    }
  },

  methods: {
    async resolveActiveState () {
      if (!this.config || !Array.isArray(this.config.states)) {
        return this.config ? this.config.defaultStateId : null
      }
      for (const state of this.config.states) {
        if (state.id === this.config.defaultStateId) continue
        if (state.planIdForCheckIfOn == null) continue
        try {
          const enabled = await plansService.isPlanEnabled(state.planIdForCheckIfOn)
          if (enabled) {
            return state.id
          }
        } catch (e) {
          console.error('KioskMultiStatePanel: plan check failed', state.planIdForCheckIfOn, e)
        }
      }
      return this.config.defaultStateId
    },

    async calculateEnabled () {
      const resolvedId = await this.resolveActiveState()
      this.activeStateId = resolvedId
      return resolvedId != null && resolvedId !== this.config.defaultStateId
    },

    openDialog () {
      this.dialogOpen = true
    },

    async selectState (newState) {
      if (!newState) return
      if (newState.id === this.activeStateId) {
        this.dialogOpen = false
        return
      }
      const currentState = this.config.states.find(s => s.id === this.activeStateId)
      if (currentState && currentState.offAction) {
        try {
          await dispatchMultiStateAction(currentState.offAction)
        } catch (e) {
          console.error('KioskMultiStatePanel: offAction failed', e)
        }
      }
      if (newState.onAction) {
        try {
          await dispatchMultiStateAction(newState.onAction)
        } catch (e) {
          console.error('KioskMultiStatePanel: onAction failed', e)
        }
      }
      this.dialogOpen = false
    }
  }
}
</script>

<style lang="scss">
@import 'index.scss';

.noFocus:focus::before {
  opacity: 0 !important;
}

.multi-state-panel-wrapper {
  position: relative;
}

.multi-state-hint-icon.v-icon {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 2;
  font-size: 16px !important;
  color: #0d47a1 !important;
  pointer-events: none;
}

.multi-state-hint-icon-override.v-icon {
  color: #b8860b !important;
}

.multi-state-panel-content {
  display: flex;
  flex-direction: column;
  line-height: 1.1;
}

.multi-state-panel-label {
  opacity: 0.65;
}

.multi-state-panel-state {
  margin-top: 2px;
}

.multi-state-list {
  padding-top: 0 !important;
  padding-bottom: 0 !important;
}

.multi-state-item {
  min-height: 80px;
}

.multi-state-item .v-list-item__icon {
  align-self: center;
  margin-top: 0;
  margin-bottom: 0;
}

.multi-state-item-active {
  opacity: 1;
  background-color: rgba(25, 118, 210, 0.22);
}

.multi-state-item-passive {
  opacity: 0.45;
}
</style>
