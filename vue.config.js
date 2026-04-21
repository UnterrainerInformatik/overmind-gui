module.exports = {
  // disable lint-on-save to avoid ESLint warnings showing during build
  lintOnSave: false,
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
