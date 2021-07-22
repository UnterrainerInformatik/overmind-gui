<template>
  <div class="text-center ma-2">
    <v-row justify="center">
      <v-dialog v-model="modalLoadingVisible" persistent max-width="230">
        <v-card primary align="center">
          <v-card-title></v-card-title>
          <v-card-text>
            <v-progress-linear
              color="secondary"
              indeterminate
            ></v-progress-linear>
          </v-card-text>
        </v-card>
      </v-dialog>
    </v-row>
  </div>
</template>

<script lang="js">
import { mapGetters } from 'vuex'

export default {
  name: 'ModalLoading',

  computed: {
    ...mapGetters('gui', {
      modalLoadingVisible: 'modalLoading'
    })
  }
}
</script>
