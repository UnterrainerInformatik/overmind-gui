<template>
  <div class="home">
    <v-container fluid class="ma-0 pa-0 d-flex flex-wrap align-start">
      <v-container fluid class="personen-verwaltung-content">
        <div class="text-h5 mb-2">{{ $t('page.kiosk.personenVerwaltung.title') }}</div>

        <v-card outlined class="pa-4 mb-4">
          <div class="text-h6 mb-2 d-flex align-center">
            {{ $t('page.kiosk.personenVerwaltung.createTitle') }}
            <v-btn icon small class="ml-1" @click="imageTipsDialog = true">
              <v-icon small>info_outline</v-icon>
            </v-btn>
          </div>
          <v-text-field
            v-model="newPersonName"
            :label="$t('page.kiosk.personenVerwaltung.createName')"
            dense
            outlined
            hide-details="auto"
            class="mb-2"
          ></v-text-field>
          <v-file-input
            v-model="newPersonFiles"
            :label="$t('page.kiosk.personenVerwaltung.createFiles')"
            accept="image/jpeg,image/png"
            multiple
            small-chips
            show-size
            dense
            outlined
            hide-details="auto"
            class="mb-2"
          ></v-file-input>
          <v-alert v-if="createError" dense outlined type="error" class="mb-2">
            {{ $t('page.kiosk.personenVerwaltung.createError') }}
          </v-alert>
          <v-btn
            color="primary"
            :loading="creating"
            :disabled="!newPersonName || !newPersonFiles.length"
            @click="createPerson"
          >{{ $t('page.kiosk.personenVerwaltung.create') }}</v-btn>
        </v-card>

        <v-card v-if="peopleFetchError" outlined color="error" class="pa-4 mb-4">
          <v-icon left color="white">warning</v-icon>
          {{ $t('page.kiosk.personenVerwaltung.fetchError') }}
        </v-card>
        <v-card v-else-if="!peopleLoading && people.length === 0" outlined class="pa-4 mb-4">
          {{ $t('page.kiosk.personenVerwaltung.empty') }}
        </v-card>

        <v-list v-else outlined class="mb-4">
          <v-list-item
            v-for="person in people"
            :key="person.name"
            :class="{ 'v-list-item--active': person.name === selectedPersonName }"
            @click="selectPerson(person.name)"
          >
            <v-list-item-content>
              <v-list-item-title>{{ person.name }}</v-list-item-title>
            </v-list-item-content>
            <v-list-item-action>
              <v-btn icon @click.stop="requestDeletePerson(person.name)">
                <v-icon color="error">delete</v-icon>
              </v-btn>
            </v-list-item-action>
          </v-list-item>
        </v-list>

        <v-card v-if="deletePersonError" outlined color="error" class="pa-4 mb-4">
          {{ $t('page.kiosk.personenVerwaltung.deletePersonError') }}
        </v-card>

        <template v-if="selectedPersonName">
          <div class="text-h6 mb-2">{{ $t('page.kiosk.personenVerwaltung.referenceImages') }} - {{ selectedPersonName }}</div>

          <v-card v-if="imagesFetchError" outlined color="error" class="pa-4 mb-4">
            {{ $t('page.kiosk.personenVerwaltung.imagesFetchError') }}
          </v-card>
          <v-card v-else-if="!imagesLoading && images.length === 0" outlined class="pa-4 mb-4">
            {{ $t('page.kiosk.personenVerwaltung.imagesEmpty') }}
          </v-card>

          <v-row v-else dense class="mb-4">
            <v-col v-for="image in images" :key="image.id" cols="4" sm="3" md="2">
              <v-card outlined>
                <v-img :src="image.url" aspect-ratio="1" class="grey darken-4"></v-img>
                <v-card-actions class="pa-1">
                  <v-spacer></v-spacer>
                  <v-btn
                    icon
                    :loading="removingImageId === image.id"
                    @click="requestRemoveImage(image)"
                  >
                    <v-icon color="error" small>delete</v-icon>
                  </v-btn>
                </v-card-actions>
              </v-card>
            </v-col>
          </v-row>

          <v-card v-if="removeImageError" outlined color="error" class="pa-4 mb-4">
            {{ $t('page.kiosk.personenVerwaltung.removeImageError') }}
          </v-card>

          <v-card outlined class="pa-4 mb-4">
            <v-file-input
              v-model="uploadFiles"
              :label="$t('page.kiosk.personenVerwaltung.uploadFiles')"
              accept="image/jpeg,image/png"
              multiple
              small-chips
              show-size
              dense
              outlined
              hide-details="auto"
              class="mb-2"
            ></v-file-input>
            <v-alert v-if="uploadError" dense outlined type="error" class="mb-2">
              {{ $t('page.kiosk.personenVerwaltung.uploadError') }}
            </v-alert>
            <v-btn
              color="primary"
              :loading="uploading"
              :disabled="!uploadFiles.length"
              @click="uploadImages"
            >{{ $t('page.kiosk.personenVerwaltung.upload') }}</v-btn>
          </v-card>
        </template>
      </v-container>
    </v-container>

    <KioskLinkPanel
      class="personen-verwaltung-back-btn"
      :text="$t('page.kiosk.linkBack')"
      route="/app/kioskpersonen"
    ></KioskLinkPanel>

    <ConfirmDialog
      ref="confirmDialog"
      :confirmText="$t('page.kiosk.personenVerwaltung.confirm')"
      :cancelText="$t('page.kiosk.personenVerwaltung.cancel')"
    ></ConfirmDialog>

    <v-dialog v-model="imageTipsDialog" max-width="480">
      <v-card>
        <v-card-title>{{ $t('page.kiosk.personenVerwaltung.imageTipsTitle') }}</v-card-title>
        <v-card-text class="image-tips-text">{{ $t('page.kiosk.personenVerwaltung.imageTipsText') }}</v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="imageTipsDialog = false">{{ $t('page.kiosk.personenVerwaltung.imageTipsClose') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script type="js">
import KioskLinkPanel from '@/components/KioskLinkPanel.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { singleton as doubleTakeService } from '@/utils/webservices/doubleTakeService'

export default {
  name: 'kioskPersonenVerwaltung',

  components: {
    KioskLinkPanel,
    ConfirmDialog
  },

  data: () => ({
    people: [],
    peopleLoading: true,
    peopleFetchError: false,

    newPersonName: '',
    newPersonFiles: [],
    creating: false,
    createError: false,

    selectedPersonName: null,
    images: [],
    imagesLoading: false,
    imagesFetchError: false,

    uploadFiles: [],
    uploading: false,
    uploadError: false,

    deletePersonError: false,

    removingImageId: null,
    removeImageError: false,

    imageTipsDialog: false
  }),

  methods: {
    async loadPeople () {
      this.peopleLoading = true
      this.peopleFetchError = false
      try {
        this.people = await doubleTakeService.getPeople()
      } catch (err) {
        this.peopleFetchError = true
      }
      this.peopleLoading = false
    },

    async createPerson () {
      if (!this.newPersonName || !this.newPersonFiles.length) {
        return
      }
      this.creating = true
      this.createError = false
      try {
        await doubleTakeService.createPerson(this.newPersonName, this.newPersonFiles)
        this.newPersonName = ''
        this.newPersonFiles = []
        await this.loadPeople()
      } catch (err) {
        this.createError = true
      }
      this.creating = false
    },

    async selectPerson (name) {
      this.selectedPersonName = name
      this.uploadFiles = []
      this.uploadError = false
      await this.loadImages()
    },

    async loadImages () {
      if (!this.selectedPersonName) {
        return
      }
      this.imagesLoading = true
      this.imagesFetchError = false
      try {
        this.images = await doubleTakeService.getReferenceImages(this.selectedPersonName)
      } catch (err) {
        this.imagesFetchError = true
      }
      this.imagesLoading = false
    },

    async uploadImages () {
      if (!this.selectedPersonName || !this.uploadFiles.length) {
        return
      }
      this.uploading = true
      this.uploadError = false
      try {
        await doubleTakeService.uploadReferenceImages(this.selectedPersonName, this.uploadFiles)
        this.uploadFiles = []
        await this.loadImages()
        await this.loadPeople()
      } catch (err) {
        this.uploadError = true
      }
      this.uploading = false
    },

    requestRemoveImage (image) {
      this.$refs.confirmDialog.open(
        this.$t('page.kiosk.personenVerwaltung.removeImageConfirm'),
        () => this.removeImage(image)
      )
    },

    async removeImage (image) {
      this.removingImageId = image.id
      this.removeImageError = false
      try {
        await doubleTakeService.deleteReferenceImage(this.selectedPersonName, image)
        await this.loadImages()
        await this.loadPeople()
      } catch (err) {
        this.removeImageError = true
      }
      this.removingImageId = null
    },

    requestDeletePerson (name) {
      this.$refs.confirmDialog.open(
        this.$t('page.kiosk.personenVerwaltung.deletePersonConfirm', { name }),
        () => this.deletePerson(name)
      )
    },

    async deletePerson (name) {
      this.deletePersonError = false
      try {
        await doubleTakeService.deletePerson(name)
        this.people = this.people.filter(person => person.name !== name)
        if (this.selectedPersonName === name) {
          this.selectedPersonName = null
          this.images = []
        }
      } catch (err) {
        this.deletePersonError = true
      }
    }
  },

  mounted () {
    // Kiosk mode is already sticky by the time a user reaches this page via
    // the "Personen" button on KioskPersonen, so unlike the primary kiosk
    // dashboards this view does not call kioskMode(true) itself (same
    // rationale as KioskMigrations.vue).
    this.loadPeople()
  }
}
</script>

<style lang="scss">
@import 'index.scss';

.personen-verwaltung-content {
  max-width: none;
  padding: 8px 8px 100px 8px;
}

.personen-verwaltung-back-btn {
  position: fixed;
  left: 8px;
  bottom: 8px;
  z-index: 20;
}

.image-tips-text {
  white-space: pre-line;
}
</style>
