<template>
  <KioskPanel
    class="noFocus kiosk-link-panel"
    borderColor="disabled"
    bgColor="disabled darken-4"
    pa="1"
    :renderTitle="false"
    maxWidth="220px"
    :to="route"
  >
    <template>
      <div class="kiosk-link-panel-row">
        <v-avatar
          color="disabled darken-2"
          size="24"
          class="mr-2"
        >
          <v-icon small>link</v-icon>
        </v-avatar>
        <span class="kiosk-link-panel-text">{{ text }}</span>
      </div>
    </template>
  </KioskPanel>
</template>

<style lang="scss">
@import 'index.scss';
</style>

<script lang="js">
import KioskPanel from '@/components/KioskPanel.vue'

export default {
  name: 'KioskLinkPanel',

  props: {
    text: {},
    route: {}
  },

  components: {
    KioskPanel
  },

  data: () => ({
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

.noFocus:focus::before {
  opacity: 0 !important;
}

// Lower than the tile with its icon above the text, to make room for the
// audio bar - see styles/_kiosk.scss.
.kiosk-link-panel {
  height: var(--kiosk-link-tile-height);
}

.kiosk-link-panel .normal-text {
  height: 100%;
}

.kiosk-link-panel-row {
  display: flex;
  align-items: center;
  height: 100%;
  min-width: 0;
}

.kiosk-link-panel-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
