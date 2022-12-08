<template>
  <v-card v-bind="$attrs" v-on="$listeners">
    <v-card-text :class="'ma-0 pa-0 flip-card' + (showBack ? ' flip' : '')">
      <v-card class="flip-card-inner">
        <v-card-text class="ma-0 pa-0 flip-card-front">
          <slot name="front"></slot>
        </v-card-text>
        <v-card-text class="ma-n3 pa-0 flip-card-back">
          <slot name="back"></slot>
        </v-card-text>
      </v-card>
    </v-card-text>
  </v-card>
</template>

<style lang="scss">
@import 'index.scss';
</style>

<script lang="js">

export default {
  name: 'FlipCard',

  props: {
    data: { default: null }
  },

  components: {
  },

  data: () => ({
    showBack: false
  }),

  computed: {
  },

  watch: {
  },

  methods: {
    flip () {
      this.showBack = !this.showBack
    }
  }
}
</script>

<style lang="scss">
@import 'index.scss';

.flip-card {
  perspective: 1000px;
}

.flip-card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  text-align: center;
  transition: transform 0.6s;
  transform-style: preserve-3d;
  box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.2);
}

.flip .flip-card-inner {
  transform: rotateY(180deg);
}

.flip-card-front,
.flip-card-back {
  position: fixed;
  width: 100%;
  height: 100%;
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
}

.flip-card-back {
  transform: rotateY(180deg);
}
</style>
