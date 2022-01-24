<template>
  <KioskPanel
    v-if="wasteDisposalJson"
    borderColor="secondary"
    bgColor="black"
    min-width="270"
    :renderTitle="false"
  >
    <template>
      <div class="small ma-0 pa-0">
        {{ JSON.stringify(wasteDisposalJson, null, 2) }}
      </div>
    </template>
  </KioskPanel>
</template>

<style lang="scss">
@import 'index.scss';
</style>

<script lang="js">
import KioskPanel from '@/components/KioskPanel.vue'
import { singleton as dateUtils } from '@/utils/dateUtils'
import { singleton as localizedDataService } from '@/utils/webservices/localizedDataService'

export default {
  name: 'KioskWasteDisposalPanel',

  props: {
  },

  components: {
    KioskPanel
  },

  data: () => ({
    dateUtils,
    wasteDisposalJson: null
  }),

  computed: {
  },

  watch: {
  },

  methods: {
    update () {
      localizedDataService.getByIdentifier('wasteDisposalEnns').then((response) => {
        if (response == null) {
          return
        }

        if (this.$i18n.locale === 'de') {
          this.wasteDisposalJson = JSON.parse(response.de)
        } else {
          this.wasteDisposalJson = JSON.parse(response.en)
        }
      })
    }
  },

  mounted () {
    this.update()
    setInterval(() => this.update(), 10000)
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
</style>
