import enUs from '@/locales/en-US.json'
import deAt from '@/locales/de-AT.json'

function deriveTranslationFrom (defaults, options = {}) {
  return Object.assign({}, defaults, options)
}

const de = deriveTranslationFrom(enUs, deAt)

export default {
  en: enUs,
  de: de
}
