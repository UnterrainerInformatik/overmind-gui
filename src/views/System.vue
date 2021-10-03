<template>
  <div class="home">
    <v-container fluid class="ma-0 mt-3 pa-0">
      <v-btn
        rounded
        :disabled="disabled"
        :color="color"
        @click.stop="reload()"
        >{{ $t('page.system.reload') }}</v-btn
      >
    </v-container>
  </div>
</template>

<script type="js">
// @ is an alias to /src
import { singleton as overmindUtils } from '@/utils/overmindUtils'
import { singleton as systemService } from '@/utils/webservices/systemService'

export default {
  name: 'Plans',

  components: {
  },

  data: () => ({
    systemService,
    color: 'warning',
    disabled: false
  }),

  watch: {
  },

  computed: {
  },

  methods: {
    reload () {
      this.disabled = true
      systemService.reloadAppliances().then(() => {
        this.blink('success')
        this.disabled = false
      }).catch(() => {
        this.blink('error')
        this.disabled = false
      })
    },
    blink (color) {
      this.color = color
      overmindUtils.setTimeoutChain([
        () => {
          this.color = 'warning'
        },
        () => {
          this.color = color
        },
        () => {
          this.color = 'warning'
        },
        () => {
          this.color = color
        },
        () => {
          this.color = 'warning'
        }
      ], 500)
    }
  }
}
</script>

<style lang="scss">
@import 'index.scss';
</style>
