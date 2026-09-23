<template>
  <v-dialog
    :value="value"
    max-width="720"
    content-class="events-detail-dialog"
    :fullscreen="$vuetify.breakpoint.xsOnly"
    @input="$emit('input', $event)"
  >
    <v-card v-if="entry" outlined class="events-detail-card">
      <v-card-title>
        <span class="text-truncate">{{ entry.title || entry.subLabel || $t('component.events.unknown') }}</span>
        <v-spacer></v-spacer>
        <v-btn
          icon
          class="events-detail-close"
          :title="$t('component.events.close')"
          :aria-label="$t('component.events.close')"
          @click="close"
        >
          <v-icon>close</v-icon>
        </v-btn>
      </v-card-title>
      <v-card-text>
        <div class="events-detail-time mb-2">{{ subtitle }}</div>
        <v-img
          v-if="showSnapshot"
          contain
          :src="media.snapshotUrl"
          class="events-detail-media mb-2"
          :class="{ 'events-detail-media--solo': mediaSolo }"
        ></v-img>
        <div v-if="media.hasClip">
          <div v-if="clipLoading" class="d-flex justify-center pa-4">
            <v-progress-circular indeterminate color="grey"></v-progress-circular>
          </div>
          <v-card v-if="clipError" outlined color="error" class="pa-4">
            {{ $t('component.events.clipError') }}
          </v-card>
          <video
            v-show="!clipLoading && !clipError"
            ref="clipVideo"
            controls
            class="events-detail-media"
            :class="{ 'events-detail-media--solo': mediaSolo }"
          ></video>
        </div>
        <div
          v-if="note"
          class="events-archive-note mt-2"
          :class="noteTone ? `events-archive-note--${noteTone}` : ''"
        >{{ note }}</div>
      </v-card-text>
      <v-card-actions>
        <slot name="state"></slot>
        <v-spacer></v-spacer>
        <!-- Dismiss first, the actions that change something after it - the
             order ConfirmDialog already uses for its own pair. -->
        <v-btn text class="events-detail-actions-close" @click="close">
          {{ $t('component.events.close') }}
        </v-btn>
        <slot name="actions"></slot>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script type="js">
import Hls from 'hls.js'

/**
 * The detail view of one recording: the still, the clip and whatever the page
 * wants to say and offer about it. Used by the events page for a Frigate event
 * and by the archive page for an archive entry.
 *
 * It deliberately does not know about the archive. *Which* media an entry plays
 * is the calling page's decision - the events page plays the archived copy once
 * it is ready and the source's own otherwise, the archive page plays the
 * entry's own - so `media` arrives resolved and this component has no branch
 * that only one of its two callers ever takes. Everything else about the entry
 * that is worth a sentence arrives the same way: `subtitle`, `note` and the two
 * slots.
 *
 * What it does own is the clip, and that ownership is the point of the
 * component: the hls.js lifecycle here was arrived at by measurement and is
 * exact in ways that are easy to undo by accident - see stopClip(), startClip()
 * and playClipWhenReady().
 */
export default {
  name: 'EventMediaDialog',

  props: {
    /** the open flag, as `v-model` */
    value: {
      type: Boolean,
      default: false
    },
    /** the entry being shown: `{ id, subLabel, title? }` is all this component reads */
    entry: {
      type: Object,
      default: null
    },
    /** what to play: `{ hasClip, clipUrl, snapshotUrl }`, resolved by the page */
    media: {
      type: Object,
      default: () => ({ hasClip: false, clipUrl: '', snapshotUrl: '' })
    },
    /** the line under the title: time, camera and zones as the page words them */
    subtitle: {
      type: String,
      default: ''
    },
    /** what to say under the media, if anything */
    note: {
      type: String,
      default: ''
    },
    /** a modifier for the note, e.g. the archive state it reports */
    noteTone: {
      type: String,
      default: ''
    }
  },

  data: () => ({
    clipLoading: false,
    clipError: false
  }),

  watch: {
    // The two close buttons are not the only way out of the dialog: Escape and
    // a click on the backdrop are handled by v-dialog itself and only write
    // `false` through the v-model. The flag is therefore the one thing every
    // closing path has in common, which is why the clip teardown hangs off it
    // rather than off the click handlers.
    value: 'syncClip',
    // Opening writes the entry and the flag in the same tick, so both watchers
    // fire in one flush and syncClip() runs twice; startClip()'s token is what
    // keeps the second run from leaving the first run's player behind.
    entry: 'syncClip'
  },

  computed: {
    /**
     * A short viewport cannot hold the snapshot and the clip at a usable size, so
     * the still is what gives way - the clip's first frame is essentially the same
     * picture. `$vuetify.breakpoint` is reactive in both dimensions, so rotating or
     * resizing re-evaluates this while the dialog is open, and `v-if` (rather than
     * a CSS media query) also keeps v-img from fetching a snapshot nobody sees.
     * A clip that failed to load keeps the snapshot: dropping it there would leave
     * the dialog with no media at all.
     * An entry with no still at all - an archive copy that is not ready yet -
     * shows none rather than an empty frame; there the note is the content.
     */
    showSnapshot () {
      if (!this.entry || !this.media.snapshotUrl) {
        return false
      }
      const tight = this.$vuetify.breakpoint.xsOnly || this.$vuetify.breakpoint.height < 640
      return !(this.media.hasClip && !this.clipError && tight)
    },

    // Only one media element on screen, so it may claim the whole body height
    // instead of the half-height budget the stacked case has to share.
    mediaSolo () {
      return !(this.showSnapshot && this.media.hasClip)
    }
  },

  methods: {
    close () {
      this.$emit('input', false)
    },

    /**
     * The one place the clip follows the dialog: every open, every change of
     * entry and every close goes through here, so there is no path that starts
     * a clip without tearing the previous one down first.
     */
    syncClip () {
      this.stopClip()
      this.clipLoading = false
      this.clipError = false
      if (this.value && this.entry && this.media.hasClip) {
        this.startClip(this.entry)
      }
    },

    /**
     * The <video> is kept mounted across opens and the dialog's card stays
     * rendered once shown, so a closed dialog is a hidden element that is still
     * playing - which is why closing has to take the clip apart rather than
     * merely stop showing it. Destroying the player is what stops it fetching
     * further segments; detaching the source (rather than assigning '', which
     * resolves to the page URL and fires a real failed request) is what makes
     * the element let go of what it has already buffered.
     */
    stopClip () {
      if (this.hls) {
        this.hls.destroy()
        this.hls = null
      }
      const video = this.$refs.clipVideo
      if (video) {
        video.pause()
        video.removeAttribute('src')
        video.load()
      }
    },

    /**
     * A clip is HLS, and for a measured reason rather than a preference:
     * Frigate answers a Range request on `clip.mp4` with the whole file and no
     * `Accept-Ranges`, so an MP4 clip cannot be seeked at all, while its VOD
     * playlist can. Overmind therefore serves `clip.m3u8` plus its segments
     * under one path prefix, and the segment names in the playlist are
     * relative, so the player fetches them back off overmind on its own.
     *
     * Chrome and Firefox play HLS only through Media Source Extensions, which
     * is what hls.js drives; Safari plays a playlist natively and is handed the
     * URL directly. A browser with neither cannot play this clip at all, and
     * says so rather than sitting on an empty element.
     *
     * @param entry the entry whose clip to play; re-checked once the element is
     *        there, so a close/reopen in between cannot attach this clip to
     *        whatever dialog is on screen by then. The token covers the second
     *        case the re-check cannot see: two syncClip()s for the *same* entry
     *        in one flush, where only the later one may attach a player.
     */
    async startClip (entry) {
      const token = ++this.clipToken
      this.clipLoading = true
      this.clipError = false
      await this.$nextTick()
      const video = this.$refs.clipVideo
      if (!video || !this.entry || this.entry.id !== entry.id || token !== this.clipToken) {
        return
      }
      const clipUrl = this.media.clipUrl
      if (Hls.isSupported()) {
        const hls = new Hls()
        this.hls = hls
        hls.on(Hls.Events.MANIFEST_PARSED, () => this.clipReady())
        hls.on(Hls.Events.ERROR, (kind, data) => {
          // Only a fatal error is one the user has to be told about: the rest
          // is hls.js recovering by itself - a segment it re-requests - and
          // reporting those would put an error over a clip that plays fine.
          if (data.fatal) {
            this.failClip()
          }
        })
        hls.loadSource(clipUrl)
        hls.attachMedia(video)
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = clipUrl
        video.addEventListener('loadedmetadata', () => this.clipReady(), { once: true })
        video.addEventListener('error', () => this.failClip(), { once: true })
      } else {
        this.failClip()
      }
    },

    clipReady () {
      this.clipLoading = false
      this.playClipWhenReady()
    },

    failClip () {
      this.clipError = true
      this.clipLoading = false
    },

    // The dialog opened from a real click, so this still counts as
    // gesture-initiated as far down the promise chain as this - Chrome just
    // blocks it if too much time or too many awaits have passed. Falling
    // back to a muted play() covers that case: the clip starts moving
    // instead of sitting on the first frame waiting for a manual tap.
    // Nothing calls load() here: the player is already attached to the
    // element by now, and re-loading it would throw that attachment away.
    async playClipWhenReady () {
      await this.$nextTick()
      const video = this.$refs.clipVideo
      if (!video) {
        return
      }
      try {
        await video.play()
      } catch (err) {
        video.muted = true
        video.play().catch(() => {
          // Muted playback was refused as well, so there is nothing left to
          // try: the clip stays on its first frame until the user taps it.
        })
      }
    }
  },

  /**
   * The player is an instance property rather than a `data()` field on
   * purpose: Vue would make an object of that size deeply reactive, walking
   * every internal of a running media pipeline for no gain - nothing in the
   * template reads it. The token beside it is counted rather than watched, for
   * the same reason.
   */
  created () {
    this.hls = null
    this.clipToken = 0
  },

  beforeDestroy () {
    // Leaving the page unmounts this component without ever flipping `value`,
    // so the watcher does not run here - a clip playing at that moment has to
    // be stopped through the same teardown.
    this.stopClip()
  }
}
</script>

<style lang="scss">
/* Vuetify's own .v-dialog scrolls its whole content at max-height: 90%, which
   takes the actions row - and with it the close button - out of view. The
   dialog is pinned instead and the card owns the scrolling, so only the body
   between the title and the actions moves. Every override is qualified with
   the Vuetify class it is fighting: those rules carry inflated specificity and
   an unqualified selector would silently lose the cascade. */
.v-dialog.events-detail-dialog {
  overflow: hidden;
}

.v-card.events-detail-card {
  display: flex;
  flex-direction: column;
  max-height: 90vh;

  > .v-card__title,
  > .v-card__actions {
    flex: 0 0 auto;
  }

  > .v-card__text {
    flex: 1 1 auto;
    overflow-y: auto;
  }
}

/* fullscreen has no overlay margin to spare, so the card takes the lot */
.v-dialog--fullscreen .v-card.events-detail-card {
  height: 100%;
  max-height: 100%;
}

/* Height caps in vh rather than an aspect ratio: an aspect ratio derives the
   height from the width, which is exactly what lets a wide, short viewport
   blow the card open vertically.
   The subtracted constant is the card's own chrome - title, actions, card
   paddings and the timestamp line. That cost is in fixed pixels, so on a short
   viewport it eats a much larger share of the height than on a tall one; a
   plain `vh` cap ignores it and lands the body back in a scroll (measured at
   174px on a 1280x600 viewport, rounded up here for slack). The paired cap
   also gives up the 8px margin between the two media elements. */
$events-detail-chrome: 180px;

.events-detail-media {
  width: 100%;
  display: block;
  max-height: calc((90vh - #{$events-detail-chrome} - 8px) / 2);
  object-fit: contain;
}

.events-detail-media--solo {
  max-height: calc(90vh - #{$events-detail-chrome});
}

/* fullscreen spends no height on the overlay margin, so the budget is the
   whole viewport rather than the 90vh the floating card is capped at */
.v-dialog--fullscreen .events-detail-media {
  max-height: calc((100vh - #{$events-detail-chrome} - 8px) / 2);
}

.v-dialog--fullscreen .events-detail-media--solo {
  max-height: calc(100vh - #{$events-detail-chrome});
}

.events-archive-note {
  font-size: 13px;
  opacity: 0.85;
}

.events-archive-note--failed {
  color: var(--v-error-base, #ff5252);
  opacity: 1;
}
</style>
