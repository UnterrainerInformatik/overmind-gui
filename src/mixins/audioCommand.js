/**
 * Sends one audio command and reports a failure, shared by the kiosk audio bar
 * and its dialogs (openspec change `kiosk-audio-bar`, design.md D8). Commands
 * are fire-and-forget: what they change arrives with the next `audio-state`
 * event, so success is silent and only a failure puts one message on screen,
 * with the server's reason when it sent one.
 */
export const audioCommand = {
  methods: {
    async runAudioCommand (call) {
      try {
        await call()
        return true
      } catch (err) {
        this.$store.dispatch('gui/snackbar/snackbarEnqueue', {
          color: 'error',
          headingTKey: 'message.error.heading',
          descriptionTKey: 'page.kiosk.audio.commandFailed',
          status: null,
          message: (err && err.serverReason) || ''
        })
        return false
      }
    }
  }
}
