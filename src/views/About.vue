<template>
  <div class="about" align="center">
    <v-card
      mx-auto
      max-width="600"
      class="secondary"
      align="left"
      elevation="8"
    >
      <v-card-title>
        <div class="title headline">
          Nexus-Server
        </div>
      </v-card-title>
      <v-card-text>
        <div class="font-weight-light">Connect your game.</div>
      </v-card-text>
      <v-card-text>
        <h4>{{ $t('page.about.version') }}: {{ version }}</h4>
      </v-card-text>
    </v-card>
    <br />
    <div v-if="loading">{{ $t('page.about.loading') }}...</div>
    <div v-else>
      <div v-for="(item, i) in result.versions" :key="i">
        <v-card mx-auto max-width="600" align="left" outlined>
          <v-card-title>
            <div class="title headline font-weight-light">
              {{ $t('page.about.module') }}: {{ item.name }}
            </div>
          </v-card-title>
          <v-card-text>
            <div class="font-weight-light">
              {{ $t('page.about.buildTime') }}: {{ item.buildTime }}
            </div>
          </v-card-text>
          <v-card-text>
            {{ $t('page.about.version') }}: {{ item.pomVersion }}
          </v-card-text>
        </v-card>
        <br />
      </div>
    </div>
    <v-card mx-auto max-width="600" align="left" class="accent">
      <v-card-title>
        <div class="title headline font-weight-light">
          Unterrainer Informatik OG
        </div>
      </v-card-title>
      <v-card-text>
        <div class="font-weight-light">Flurstraße 17, 4470 Enns</div>
      </v-card-text>
      <v-card-text>
        <v-simple-table class="accent">
          <tbody>
            <tr>
              <td>{{ $t('page.about.email') }}</td>
              <td>office@unterrainer.info</td>
            </tr>
            <tr>
              <td>{{ $t('page.about.web') }}</td>
              <td>www.unterrainer.info</td>
            </tr>
          </tbody>
        </v-simple-table>
      </v-card-text>
    </v-card>
  </div>
</template>

<style lang="scss">
@import 'index.scss';
</style>

<script lang="js">
import { mapGetters } from 'vuex'
import { getResponse } from '@/utils/axiosUtils'

export default {
  name: 'About',

  data: () => ({
    result: {},
    loading: false
  }),

  computed: {
    ...mapGetters({
      version: 'version'
    }),
    ...mapGetters('rest', {
      axios: 'axios'
    })
  },

  async mounted () {
    getResponse('uinf', 'application.version', (value) => { this.loading = value }, (response) => { this.result = response })
  }
}
</script>
