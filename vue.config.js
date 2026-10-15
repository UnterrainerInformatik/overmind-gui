module.exports = {
  // disable lint-on-save to avoid ESLint warnings showing during build
  lintOnSave: false,
  // no .map files in dist: they are more than half of it and slow the build, the artifact and the image push
  productionSourceMap: false,
  configureWebpack: {
    devServer: {
      open: true
    }
  },
  css: {
    loaderOptions: {
      sass: {
        prependData: `
        @import "@/styles/_colors.scss";
        @import "@/styles/_fonts.scss";
        `
      }
    }
  }
}
