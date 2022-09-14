<template>
  <KioskPanel
    :isEnabled="getActive"
    @click="toggle()"
    class="noFocus"
  >
    <template v-slot:title="state">
      <v-avatar
        :color="
          (state.enabled ? 'on ' : 'off ') +
          ' darken-1'
        "
        size="42"
      >
        <v-icon v-if="state.enabled">toggle_on</v-icon>
        <v-icon v-if="!state.enabled">toggle_off</v-icon>
      </v-avatar>
    </template>
    <template>
      <span class="text-body-1">
        {{ text }}
      </span>
    </template>
  </KioskPanel>
</template>

<style lang="scss">
@import 'index.scss';
</style>

<script lang="js">
import KioskPanel from '@/components/KioskPanel.vue'

export default {
  name: 'KioskTogglePanel',

  props: {
    text: {}
  },

  components: {
    KioskPanel
  },

  data: () => ({
    active: false
  }),

  computed: {
  },

  watch: {
  },

  methods: {
    async getActive () {
      return this.active
    },
    async toggle () {
      this.active = !this.active
      this.$emit('handle-change', this.active)
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
