<template>
  <v-dialog v-model="dialogOpen" max-width="400">
    <v-card>
      <v-card-text class="pt-4">{{ message }}</v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn text @click="cancel">{{ cancelText }}</v-btn>
        <v-btn text color="error" @click="confirm">{{ confirmText }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="js">
export default {
  name: 'ConfirmDialog',

  props: {
    confirmText: {},
    cancelText: {}
  },

  data: () => ({
    dialogOpen: false,
    message: '',
    pendingConfirm: null
  }),

  methods: {
    open (message, onConfirm) {
      this.message = message
      this.pendingConfirm = onConfirm
      this.dialogOpen = true
    },
    confirm () {
      this.dialogOpen = false
      const onConfirm = this.pendingConfirm
      this.pendingConfirm = null
      if (onConfirm) {
        onConfirm()
      }
    },
    cancel () {
      this.dialogOpen = false
      this.pendingConfirm = null
    }
  }
}
</script>
