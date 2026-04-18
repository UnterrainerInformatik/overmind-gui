import store from '@/store'
import { singleton as axiosUtils } from '@/utils/axiosUtils'
import { singleton as overmindUtils } from '@/utils/overmindUtils'
import { singleton as objectUtils } from '@/utils/objectUtils'

interface LocalSubscription {
  handle: string;
  serverSubscriptionId: string | null;
  applianceIds: number[];
  minInterval: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  callback: (appliances: any[]) => void;
}

let handleCounter = 0
function nextHandle (): string {
  handleCounter++
  return 'sse-' + handleCounter
}

export class SseClient {
  private static instanceField: SseClient

  private connectionId: string | null = null
  private eventSource: EventSource | null = null
  private reconnectTimer: any | null = null
  private subscriptions: Map<string, LocalSubscription> = new Map()
  private cache: Map<number, any> = new Map()
  private _connected = false

  public get connected (): boolean {
    return this._connected
  }

  public static getInstance (): SseClient {
    if (!this.instanceField) {
      this.instanceField = new SseClient()
    }
    return this.instanceField
  }

  private buildSseUrl (): string {
    const config = objectUtils.getDeepProperty('uinf', store.getters['rest/config'].servers)
    const endpoint = objectUtils.getDeepProperty('sseAppliances', store.getters['rest/config'].endpoint)
    return `${config.protocol}://${config.address}:${config.port}${endpoint}`
  }

  private ensureConnection (): void {
    if (this.eventSource && this.eventSource.readyState !== EventSource.CLOSED) {
      return
    }
    if (this.reconnectTimer) {
      return
    }
    this.destroyConnection()

    const url = this.buildSseUrl()
    this.eventSource = new EventSource(url)

    this.eventSource.addEventListener('connected', (e: any) => {
      this.onConnected(e)
    })
    this.eventSource.addEventListener('update', (e: any) => {
      this.onUpdate(e)
    })
    this.eventSource.onerror = () => {
      this._connected = false
      this.connectionId = null
      if (this.eventSource && this.eventSource.readyState === EventSource.CLOSED) {
        this.scheduleReconnect()
      }
    }
  }

  private destroyConnection (): void {
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }
  }

  private scheduleReconnect (): void {
    if (this.reconnectTimer) {
      return
    }
    this.destroyConnection()
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      if (this.subscriptions.size > 0) {
        this.ensureConnection()
      }
    }, 3000)
  }

  private onConnected (e: MessageEvent): void {
    const data = JSON.parse(e.data)
    this.connectionId = data.connectionId
    this._connected = true

    this.subscriptions.forEach(sub => {
      this.registerOnServer(sub)
    })
  }

  private onUpdate (e: MessageEvent): void {
    const data = JSON.parse(e.data)
    const entries: any[] = data.entries || []

    for (const entry of entries) {
      overmindUtils.parseState(entry)
      overmindUtils.parseConfig(entry)
      this.cache.set(entry.id, entry)
    }

    const batches: Map<string, any[]> = new Map()
    for (const entry of entries) {
      this.subscriptions.forEach((sub, handle) => {
        if (sub.applianceIds.includes(entry.id)) {
          let batch = batches.get(handle)
          if (!batch) {
            batch = []
            batches.set(handle, batch)
          }
          batch.push(entry)
        }
      })
    }

    batches.forEach((batch, handle) => {
      const sub = this.subscriptions.get(handle)
      if (sub) {
        sub.callback(batch)
      }
    })
  }

  private async registerOnServer (sub: LocalSubscription): Promise<void> {
    if (!this.connectionId) {
      return
    }
    try {
      const response = await axiosUtils.post('uinf', 'sseAppliancesRegister', () => ({
        connectionId: this.connectionId,
        applianceIds: sub.applianceIds,
        minInterval: sub.minInterval
      }))
      sub.serverSubscriptionId = response.subscriptionId
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('SseClient: register failed', err)
    }
  }

  private async deregisterOnServer (sub: LocalSubscription): Promise<void> {
    if (!this.connectionId || !sub.serverSubscriptionId) {
      return
    }
    try {
      await axiosUtils.post('uinf', 'sseAppliancesDeregister', () => ({
        connectionId: this.connectionId,
        subscriptionId: sub.serverSubscriptionId
      }))
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('SseClient: deregister failed', err)
    }
  }

  public subscribe (applianceIds: number[], callback: (appliances: any[]) => void, minInterval = 1000): string {
    const handle = nextHandle()
    const sub: LocalSubscription = {
      handle,
      serverSubscriptionId: null,
      applianceIds,
      minInterval,
      callback
    }
    this.subscriptions.set(handle, sub)
    this.ensureConnection()

    if (this.connectionId) {
      this.registerOnServer(sub)
    }

    return handle
  }

  public unsubscribe (handle: string): void {
    const sub = this.subscriptions.get(handle)
    if (!sub) {
      return
    }
    this.subscriptions.delete(handle)
    this.deregisterOnServer(sub)
  }

  public getLatest (applianceId: number): any | null {
    return this.cache.get(applianceId) || null
  }
}

export const singleton = SseClient.getInstance()
