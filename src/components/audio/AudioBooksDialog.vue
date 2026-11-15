<template>
  <v-dialog
    :value="value"
    max-width="1100"
    :fullscreen="$vuetify.breakpoint.xsOnly"
    scrollable
    @input="$emit('input', $event)"
  >
    <v-card class="audio-books-dialog">
      <v-card-title class="audio-dialog-title audio-books-title">
        <v-btn
          v-if="detail"
          icon
          class="audio-books-back mr-1"
          :aria-label="$t('page.kiosk.audio.books.back')"
          :title="$t('page.kiosk.audio.books.back')"
          @click="detail = null"
        >
          <v-icon>arrow_back</v-icon>
        </v-btn>
        <span class="audio-books-title-text">{{ detail ? detail.item.name : $t('page.kiosk.audio.books.title') }}</span>
        <v-spacer></v-spacer>
        <v-btn icon class="audio-dialog-close" :aria-label="$t('page.kiosk.audio.close')" @click="$emit('input', false)">
          <v-icon>close</v-icon>
        </v-btn>
      </v-card-title>

      <div v-show="!detail" class="audio-books-head">
        <v-tabs
          :value="tabIndex"
          class="audio-books-tabs"
          :color="$vuetify.theme.dark ? '#fff' : 'primary'"
          grow
          show-arrows
          @change="selectTab(TABS[$event])"
        >
          <v-tab v-for="tab in TABS" :key="tab" :class="`audio-books-tab audio-books-tab--${tab}`">{{ $t(TAB_TKEYS[tab]) }}</v-tab>
        </v-tabs>
        <div class="px-4 pt-3 pb-1">
          <v-text-field
            v-model="filter"
            class="audio-books-filter"
            :label="$t('page.kiosk.audio.books.filter')"
            prepend-inner-icon="search"
            clearable
            hide-details
            dense
            outlined
          ></v-text-field>
        </div>
      </div>

      <v-card-text ref="body" class="audio-books-body" :class="{ 'audio-books-body--xs': $vuetify.breakpoint.xsOnly }">
        <AudioBookDetail
          v-if="detail && detail.kind === 'book'"
          :key="`b-${detail.item.id}`"
          :book="detail.item"
          :target="target"
          @changed="scheduleListReload"
        ></AudioBookDetail>
        <AudioPodcastDetail
          v-else-if="detail && detail.kind === 'podcast'"
          :key="`p-${detail.item.id}`"
          :podcast="detail.item"
          :target="target"
          @changed="scheduleListReload"
        ></AudioPodcastDetail>

        <template v-else>
          <v-progress-linear v-if="current.loading && !current.loaded" indeterminate class="audio-books-loading"></v-progress-linear>
          <div v-else-if="current.notAvailable" class="audio-books-message audio-books-not-available">{{ $t('page.kiosk.audio.books.notAvailable') }}</div>
          <div v-else-if="current.failed && !current.loaded" class="audio-books-message audio-books-failed">{{ $t('page.kiosk.audio.loadFailed') }}</div>
          <template v-else-if="current.loaded">
            <div v-if="continueItems.length > 0" class="audio-books-continue">
              <div class="text-overline">{{ $t('page.kiosk.audio.books.continue') }}</div>
              <div class="audio-books-continue-row">
                <AudioCoverTile
                  v-for="entry in continueItems"
                  :key="`c-${entry.uri}`"
                  class="audio-books-continue-tile"
                  :data-uri="entry.uri"
                  :name="entry.name"
                  :author="entry.subtitle"
                  :image-url="entry.imageUrl"
                  :progress="progressOf(entry)"
                  @click="resume(entry)"
                ></AudioCoverTile>
              </div>
            </div>
            <div v-if="current.items.length === 0" class="audio-books-message audio-books-empty">{{ $t('page.kiosk.audio.books.empty') }}</div>
            <div v-else-if="gridItems.length === 0" class="audio-books-message audio-books-no-match">{{ $t('page.kiosk.audio.books.noMatch') }}</div>
            <div v-else class="audio-books-grid">
              <AudioCoverTile
                v-for="item in gridItems"
                :key="`g-${item.uri}`"
                class="audio-books-grid-tile"
                :data-uri="item.uri"
                :name="item.name"
                :author="authorOf(item)"
                :image-url="item.imageUrl"
                :progress="tab === 'podcasts' ? 0 : progressOf(item)"
                :played="tab !== 'podcasts' && item.fullyPlayed"
                @click="open(item)"
              ></AudioCoverTile>
            </div>
          </template>
        </template>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script lang="js">
import { singleton as audioService } from '@/utils/webservices/audioService'
import { audioCommand } from '@/mixins/audioCommand'
import { continueEntries, matchesFilter, progressOf, sortForGrid, RELOAD_DELAY_MS } from '@/utils/audiobooks'
import AudioCoverTile from '@/components/audio/AudioCoverTile.vue'
import AudioBookDetail from '@/components/audio/AudioBookDetail.vue'
import AudioPodcastDetail from '@/components/audio/AudioPodcastDetail.vue'

const TABS = ['adults', 'kids', 'podcasts']
const TAB_TKEYS = {
  adults: 'page.kiosk.audio.books.tabAdults',
  kids: 'page.kiosk.audio.books.tabKids',
  podcasts: 'page.kiosk.audio.books.tabPodcasts'
}
const TAB_STORAGE_KEY = 'kioskAudiobooksTab'

function readStoredTab () {
  try {
    const tab = window.localStorage.getItem(TAB_STORAGE_KEY)
    return TABS.includes(tab) ? tab : 'adults'
  } catch (e) {
    return 'adults'
  }
}

function writeStoredTab (tab) {
  try {
    window.localStorage.setItem(TAB_STORAGE_KEY, tab)
  } catch (e) {
    // blocked storage: the tab is simply not remembered
  }
}

function emptyList () {
  return { items: [], episodes: [], loaded: false, loading: false, failed: false, notAvailable: false }
}

/**
 * The audiobooks and podcasts popup of the kiosk audio bar (openspec change
 * `kiosk-audiobooks`, designs D4-D6): three tabs, each with a "Weiterhören"
 * row, a filter and a cover grid; a tap on the grid opens the book's or
 * podcast's detail in place. Every command goes to the bar's target. Lists
 * are loaded when a tab is first shown after the popup opened; a reload keeps
 * the shown list until the new one arrives.
 */
export default {
  name: 'AudioBooksDialog',

  mixins: [audioCommand],

  components: { AudioCoverTile, AudioBookDetail, AudioPodcastDetail },

  props: {
    value: { type: Boolean, default: false },
    target: { type: Object, default: null }
  },

  data: () => ({
    TABS,
    TAB_TKEYS,
    tab: 'adults',
    filter: '',
    detail: null,
    lists: { adults: emptyList(), kids: emptyList(), podcasts: emptyList() },
    // tabs loaded since the popup last opened
    fresh: {},
    reloadTimer: null
  }),

  computed: {
    tabIndex () {
      return TABS.indexOf(this.tab)
    },
    current () {
      return this.lists[this.tab]
    },
    continueItems () {
      if (this.tab === 'podcasts') {
        return continueEntries(this.current.episodes)
      }
      return continueEntries(this.current.items).map(b => ({ ...b, subtitle: this.authorOf(b) }))
    },
    gridItems () {
      return sortForGrid(this.current.items, this.tab).filter(i => matchesFilter(i, this.filter))
    }
  },

  watch: {
    value: {
      immediate: true,
      handler (open) {
        if (open) {
          this.filter = ''
          this.detail = null
          this.fresh = {}
          this.tab = readStoredTab()
          this.load(this.tab)
        } else {
          this.clearReloadTimer()
        }
      }
    }
  },

  methods: {
    progressOf,
    authorOf (item) {
      return item.authors && item.authors.length > 0 ? item.authors.join(', ') : null
    },
    selectTab (tab) {
      if (!tab || tab === this.tab) {
        return
      }
      this.tab = tab
      this.detail = null
      writeStoredTab(tab)
      if (!this.fresh[tab]) {
        this.load(tab)
      }
      if (this.$refs.body) {
        this.$refs.body.scrollTop = 0
      }
    },
    async load (tab) {
      const list = this.lists[tab]
      this.fresh = { ...this.fresh, [tab]: true }
      list.loading = true
      try {
        if (tab === 'podcasts') {
          const podcasts = await audioService.getPodcasts()
          // The "Weiterhören" row holds episodes; there are only a handful of podcasts.
          const episodeLists = await Promise.all(podcasts.map(p => audioService.getPodcastEpisodes(p.id)
            .then(episodes => episodes.map(e => ({ ...e, subtitle: p.name, imageUrl: e.imageUrl || p.imageUrl })))
            .catch(() => [])))
          list.items = podcasts
          list.episodes = [].concat(...episodeLists)
        } else {
          list.items = await audioService.getAudiobooks(tab)
        }
        list.loaded = true
        list.failed = false
        list.notAvailable = false
      } catch (err) {
        if (audioService.isNotAvailable(err)) {
          list.notAvailable = true
        } else {
          list.failed = true
        }
      } finally {
        list.loading = false
      }
    },
    open (item) {
      this.detail = { kind: this.tab === 'podcasts' ? 'podcast' : 'book', item }
      if (this.$refs.body) {
        this.$refs.body.scrollTop = 0
      }
    },
    /** One tap in the "Weiterhören" row resumes at MA's stored position (D4). */
    async resume (entry) {
      if (!this.target) {
        return
      }
      const targetId = this.target.targetId
      if (await this.runAudioCommand(() => audioService.playItem(targetId, entry.uri))) {
        this.scheduleListReload()
      }
    },
    clearReloadTimer () {
      if (this.reloadTimer !== null) {
        clearTimeout(this.reloadTimer)
        this.reloadTimer = null
      }
    },
    scheduleListReload () {
      this.clearReloadTimer()
      const tab = this.tab
      this.reloadTimer = setTimeout(() => {
        this.reloadTimer = null
        if (this.value) {
          this.load(tab)
        }
      }, RELOAD_DELAY_MS)
    }
  },

  beforeDestroy () {
    this.clearReloadTimer()
  }
}
</script>

<style lang="scss">
.audio-books-title {
  flex-wrap: nowrap;
}

.audio-books-title-text {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.audio-books-dialog .v-card__text.audio-books-body {
  padding: 8px 16px 16px;
  min-height: 200px;
}

.audio-books-message {
  padding: 16px 0;
}

.audio-books-continue {
  margin-bottom: 12px;
}

.audio-books-continue-row {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 6px;
  -webkit-overflow-scrolling: touch;

  .audio-books-continue-tile {
    flex: 0 0 110px;
    width: 110px;
  }
}

.audio-books-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px 10px;
}

.audio-books-body--xs {
  .audio-books-grid {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  }

  .audio-books-continue-row .audio-books-continue-tile {
    flex-basis: 96px;
    width: 96px;
  }
}
</style>
