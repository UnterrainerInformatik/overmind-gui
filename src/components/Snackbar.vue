<template>
  <div class="text-center ma-2">
    <!--
    <v-btn
      @click="
        enqueue(
          'error',
          'message.error.heading',
          'message.error.communication',
          null,
          'testi test'
        )
      "
      >Open Error Snackbar</v-btn
    >
    <v-btn
      @click="
        enqueue(
          'success',
          'message.error.heading',
          'message.error.communication',
          404,
          'testi test'
        )
      "
      >Open Success Snackbar</v-btn
    >
    -->
    <v-snackbar
      v-model="twoWaySnackbarVisible"
      bottom
      multi-line
      elevation="24"
      transition="slide-y-reverse-transition"
      :color="getSnackbarCurrent.color"
      timeout="8000"
    >
      <span class="title">{{ $t(getSnackbarCurrent.headingTKey) }}</span>
      <span class="title" v-if="getSnackbarCurrent.status != null">
        ({{ getSnackbarCurrent.status }})</span
      >
      <br />
      <span class="subtitle">{{ $t(getSnackbarCurrent.descriptionTKey) }}</span>
      <br />
      <blockquote class="blockquote">
        {{ getSnackbarCurrent.message }}
      </blockquote>
      <template v-slot:action="{ attrs }">
        <v-btn icon fab v-bind="attrs" @click="twoWaySnackbarVisible = false">
          <v-icon>cancel</v-icon>
        </v-btn>
      </template>
    </v-snackbar>
    <!-- DEBUGGING
        <h1>{{ twoWaySnackbarVisible }}</h1>
        <h3>{{ getSnackbarCurrent }}</h3>
        {{ this.$store.state.snackbar.messages.length }}
        -->
  </div>
</template>

<script lang="js">
import { mapGetters } from 'vuex'

export default {
  name: 'Snackbar',

  computed: {
    twoWaySnackbarVisible: {
      get () {
        return this.$store.state.gui.snackbar.visible
      },
      set (value) {
        if (!value) {
          this.$store.dispatch('gui/snackbar/snackbarDequeue')
        }
      }
    },
    ...mapGetters('gui/snackbar', {
      getSnackbarCurrent: 'snackbarCurrent'
    })
  },

  methods: {
    enqueue (color, heading, description, status, message) {
      this.$store.dispatch('gui/snackbar/snackbarEnqueue', {
        color: color,
        headingTKey: heading,
        descriptionTKey: description,
        status: status,
        message: message
      })
    }
  }
}
</script>
