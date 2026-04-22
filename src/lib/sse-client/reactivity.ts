import { ReactivityAdapter } from './types'

export const plainAdapter: ReactivityAdapter = {
  observable: obj => obj,
  set: (obj, key, value) => {
    (obj as Record<string, unknown>)[key] = value
  }
}

export interface Vue2Module {
  observable: <T extends object>(o: T) => T;
  set: <T extends object>(o: T, k: string, v: unknown) => void;
}

export function createVue2Adapter (Vue: Vue2Module): ReactivityAdapter {
  return {
    observable: obj => Vue.observable(obj),
    set: (obj, key, value) => Vue.set(obj, key, value)
  }
}

export interface Vue3Reactivity {
  reactive: <T extends object>(o: T) => T;
}

export function createVue3Adapter (vue: Vue3Reactivity): ReactivityAdapter {
  return {
    observable: obj => vue.reactive(obj),
    set: (obj, key, value) => {
      (obj as Record<string, unknown>)[key] = value
    }
  }
}
