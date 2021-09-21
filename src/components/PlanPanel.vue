<template>
  <v-card
    dense
    class="ma-2 mx-0 pa-0 flex-grow-1 flex-shrink-1 d-flex flex-column"
  >
    <v-toolbar dense :class="item.enabled ? 'success' : 'secondary darken-1'">
      <v-btn
        :class="
          'ma-0 pa-0 ml-n2 mr-3 success' +
            ($vuetify.theme.dark ? ' lighten-3' : ' darken-3')
        "
        fab
        small
        @click="togglePlan(item.id)"
        ><v-icon>power_settings_new</v-icon></v-btn
      >
      <div
        class="text-caption text-md-subtitle-1 text-lg-subtitle-1 text-xl-subtitle-1"
      >
        {{ item.name }}
      </div>
      <v-spacer></v-spacer>

      <div class="mr-5 hidden-xs-only">
        {{ item.cronDefOn ? item.cronDefOn : '' }}
      </div>

      <div class="pa-0 ma-0 text-caption">
        <v-row align="center">
          <v-col class="ma-0 pa-2">
            <v-row class="ma-0 pa-0">
              <v-col
                class="ma-0 pa-0 text-subtitle-2"
                align="center"
                justify="center"
                >Priorität</v-col
              >
            </v-row>
            <v-row class="ma-0 pa-0">
              <v-col class="ma-0 pa-0" align="center" justify="center">{{
                item.priority
              }}</v-col>
            </v-row>
          </v-col>
        </v-row>
      </div>
    </v-toolbar>
  </v-card>
</template>

<style lang="scss">
@import 'index.scss';
</style>

<script lang="js">
import axiosUtils from '@/utils/axiosUtils'

export default {
  name: 'PlanPanel',

  props: {
    item: {},
    size: {},
    offset: {}
  },

  data: () => ({
  }),

  computed: {
  },

  watch: {
  },

  methods: {
    async togglePlan (id) {
      return axiosUtils.post('uinf', 'execute', () => {
        return {
          applianceId: 20,
          actorPath: 'actor',
          commands: [
            {
              name: 'toggle',
              params: [
                [id]
              ]
            }
          ]
        }
      }).then(() => {
        this.$emit('reload', true, this.size, this.offset)
      })
    }
  }

}
</script>
