import Vue from 'vue'
import store from '@/store'
import { singleton as objectUtils } from '@/utils/objectUtils'
import {
  SseClient as CoreSseClient,
  createVue2Adapter
} from '@/lib/sse-client'
import type { HttpPost } from '@/lib/sse-client'

function serverConfig (): { protocol: string; address: string; port: string } {
  return objectUtils.getDeepProperty('uinf', store.getters['rest/config'].servers)
}

function endpoint (key: string): string {
  return objectUtils.getDeepProperty(key, store.getters['rest/config'].endpoint)
}

function buildUrl (endpointKey: string): string {
  const c = serverConfig()
  return `${c.protocol}://${c.address}:${c.port}${endpoint(endpointKey)}`
}

const httpPost: HttpPost = async (url, body, headers) => {
  const response = await Vue.axios.post(url, body, { headers })
  return { data: response.data }
}

const singletonInstance = new CoreSseClient({
  buildSseUrl: () => buildUrl('sseAppliances'),
  buildRegisterUrl: () => buildUrl('sseTransportsRegister'),
  buildDeregisterUrl: () => buildUrl('sseTransportsDeregister'),
  authHeader: (): Record<string, string> => {
    const token = store.getters['keycloak/token']
    return token ? { Authorization: 'Bearer ' + token } : {}
  },
  httpPost,
  reactivity: createVue2Adapter(Vue)
})

export const SseClient = {
  getInstance (): CoreSseClient {
    return singletonInstance
  }
}

export const singleton = singletonInstance

export type {
  AggregateOp,
  PerApplianceSelection,
  SelectionShape,
  TransportSpec,
  ValueTriple,
  ValuesPayload,
  AggregatePayload,
  TransportUpdate,
  TransportCallback,
  Handle,
  SubscriptionSpec,
  SubscriptionAggregate,
  Subscription,
  HttpPost,
  ReactivityAdapter,
  SseClientConfig
} from '@/lib/sse-client'
