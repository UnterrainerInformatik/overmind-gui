import vuetify from '@/plugins/vuetify'

export default {
  adaptiveColumns: function (array) {
    switch (vuetify.framework.breakpoint.name) {
      case 'xs':
        return array[0]
      case 'sm':
        return array[1]
      case 'md':
        return array[2]
      case 'lg':
        return array[3]
      case 'xl':
        return array[4]
    }
  }
}
