<template>
  <v-dialog :value="value" max-width="420" @input="$emit('input', $event)">
    <v-card class="audio-name-prompt">
      <v-card-title>{{ title }}</v-card-title>
      <v-card-text>
        <v-text-field
          ref="field"
          v-model="name"
          class="audio-name-field"
          :label="$t('page.kiosk.audio.editor.name')"
          :error-messages="rejected ? [$t('page.kiosk.audio.editor.nameRequired')] : []"
          autofocus
          @input="rejected = false"
          @keydown.enter.prevent="confirm"
        ></v-text-field>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn text large class="audio-name-cancel" @click="$emit('input', false)">{{ $t('page.kiosk.audio.editor.cancel') }}</v-btn>
        <v-btn text large color="primary" class="audio-name-ok" @click="confirm">{{ $t('page.kiosk.audio.editor.ok') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="js">
/**
 * Asks for a playlist name, for create and rename (openspec change
 * `kiosk-playlist-editor`). Emits `confirm` with the trimmed name; an empty or
 * whitespace-only name is refused with a hint and the prompt stays open.
 */
export default {
  name: 'AudioNamePrompt',

  props: {
    value: { type: Boolean, default: false },
    title: { type: String, default: '' },
    initial: { type: String, default: '' }
  },

  data: () => ({
    name: '',
    rejected: false
  }),

  watch: {
    value: {
      immediate: true,
      handler (open) {
        if (open) {
          this.name = this.initial
          this.rejected = false
        }
      }
    }
  },

  methods: {
    confirm () {
      const name = this.name.trim()
      if (name === '') {
        this.rejected = true
        return
      }
      this.$emit('confirm', name)
      this.$emit('input', false)
    }
  }
}
</script>
