import Vue from 'vue'
import store from '@/store'
import { singleton as objectUtils } from '@/utils/objectUtils'

const DEBUG_SSE = false

export type AggregateOp = 'sum' | 'avg'

export interface PerApplianceSelection {
  applianceId: number;
  paths: string[];
}

export type SelectionShape =
  | { applianceIds: number[]; paths: string[] }
  | { perAppliance: PerApplianceSelection[] }

export interface TransportSpec {
  minInterval: number;
  selection: SelectionShape;
  aggregate?: { op: AggregateOp };
}

export interface ValueTriple {
  applianceId: number;
  path: string;
  value: unknown;
}

export interface ValuesPayload {
  values: ValueTriple[];
  ts: string;
}

export interface AggregatePayload {
  aggregate: {
    op: AggregateOp;
    value: number | null;
    sampleCount: number;
    totalCount: number;
  };
  ts: string;
}

export type TransportUpdate = ValuesPayload | AggregatePayload

export type TransportCallback = (payload: TransportUpdate) => void

export interface Handle {
  id: string;
}

interface HandleRecord {
  handle: Handle;
  spec: TransportSpec;
  callback: TransportCallback;
  transportId: string | null;
  initialResolve: ((h: Handle) => void) | null;
  initialReject: ((err: Error) => void) | null;
}

let handleCounter = 0
function nextHandleId (): string {
  handleCounter++
  return 'sse-' + handleCounter
}

export class SseClient {
  private static instanceField: SseClient

  private connectionId: string | null = null
  private eventSource: EventSource | null = null
  private reconnectTimer: any | null = null
  private handles: Map<string, HandleRecord> = new Map()
  private byTransportId: Map<string, HandleRecord> = new Map()
  private pathCache: Map<string, unknown> = new Map()
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

  private buildUrl (endpointKey: string): string {
    const config = objectUtils.getDeepProperty('uinf', store.getters['rest/config'].servers)
    const endpoint = objectUtils.getDeepProperty(endpointKey, store.getters['rest/config'].endpoint)
    return `${config.protocol}://${config.address}:${config.port}${endpoint}`
  }

  private authHeader (): Record<string, string> {
    const token = store.getters['keycloak/token']
    if (!token) {
      return {}
    }
    return { Authorization: 'Bearer ' + token }
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
    if (DEBUG_SSE) {
      // eslint-disable-next-line no-console
      console.debug('[SSE] opening EventSource', { url })
    }
    this.eventSource = new EventSource(url)

    this.eventSource.addEventListener('connected', (e: any) => {
      this.onConnected(e)
    })
    this.eventSource.addEventListener('transport-update', (e: any) => {
      this.onTransportUpdate(e)
    })
    this.eventSource.onmessage = (e: MessageEvent) => {
      if (DEBUG_SSE) {
        // eslint-disable-next-line no-console
        console.debug('[SSE] generic message', { data: e.data, lastEventId: e.lastEventId })
      }
    }
    this.eventSource.onerror = () => {
      if (DEBUG_SSE) {
        // eslint-disable-next-line no-console
        console.debug('[SSE] onerror', { readyState: this.eventSource && this.eventSource.readyState })
      }
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
      if (this.handles.size > 0) {
        this.ensureConnection()
      }
    }, 3000)
  }

  private onConnected (e: MessageEvent): void {
    const data = JSON.parse(e.data)
    this.connectionId = data.connectionId
    this._connected = true
    if (DEBUG_SSE) {
      // eslint-disable-next-line no-console
      console.debug('[SSE] connected', { connectionId: this.connectionId, reregistering: this.handles.size })
    }

    this.byTransportId.clear()
    this.handles.forEach(record => {
      record.transportId = null
      this.registerOnServer(record)
    })
  }

  private onTransportUpdate (e: MessageEvent): void {
    const data = JSON.parse(e.data)
    const transportId: string | undefined = data.transportId
    if (DEBUG_SSE) {
      const knownTransportIds = Array.from(this.byTransportId.keys())
      // eslint-disable-next-line no-console
      console.debug('[SSE] transport-update arrived', {
        transportId,
        matched: transportId ? this.byTransportId.has(transportId) : false,
        valuesCount: Array.isArray(data.values) ? data.values.length : null,
        hasAggregate: data.aggregate !== undefined,
        knownTransportIds
      })
    }
    if (!transportId) {
      return
    }
    const record = this.byTransportId.get(transportId)
    if (!record) {
      return
    }

    const payload: any = { ts: data.ts }
    if (data.values !== undefined) {
      payload.values = data.values
      for (const triple of data.values as ValueTriple[]) {
        this.pathCache.set(`${triple.applianceId}:${triple.path}`, triple.value)
      }
    } else if (data.aggregate !== undefined) {
      payload.aggregate = data.aggregate
    } else {
      return
    }

    record.callback(payload as TransportUpdate)

    if (record.initialResolve) {
      const resolve = record.initialResolve
      record.initialResolve = null
      record.initialReject = null
      resolve(record.handle)
    }
  }

  private async registerOnServer (record: HandleRecord): Promise<void> {
    if (!this.connectionId) {
      return
    }
    const body: any = {
      connectionId: this.connectionId,
      minInterval: record.spec.minInterval,
      selection: record.spec.selection
    }
    if (record.spec.aggregate) {
      body.aggregate = record.spec.aggregate
    }
    try {
      const axiosResponse = await Vue.axios.post(this.buildUrl('sseTransportsRegister'), body, {
        headers: this.authHeader()
      })
      const response = axiosResponse.data
      const transportId: string = response.transportId
      record.transportId = transportId
      this.byTransportId.set(transportId, record)
      if (DEBUG_SSE) {
        // eslint-disable-next-line no-console
        console.debug('[SSE] registered on server', { handleId: record.handle.id, transportId, selection: record.spec.selection })
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('SseClient: registerTransport failed', err)
      if (record.initialReject) {
        const reject = record.initialReject
        record.initialResolve = null
        record.initialReject = null
        reject(err instanceof Error ? err : new Error(String(err)))
      }
    }
  }

  private async deregisterOnServer (record: HandleRecord): Promise<void> {
    if (!this.connectionId || !record.transportId) {
      return
    }
    const transportId = record.transportId
    try {
      await Vue.axios.post(this.buildUrl('sseTransportsDeregister'), {
        connectionId: this.connectionId,
        transportId
      }, {
        headers: this.authHeader()
      })
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('SseClient: deregisterTransport failed', err)
    }
  }

  public async registerTransport (spec: TransportSpec, callback: TransportCallback): Promise<Handle> {
    const handle: Handle = { id: nextHandleId() }
    const record: HandleRecord = {
      handle,
      spec,
      callback,
      transportId: null,
      initialResolve: null,
      initialReject: null
    }
    this.handles.set(handle.id, record)
    this.ensureConnection()

    return new Promise<Handle>((resolve, reject) => {
      record.initialResolve = resolve
      record.initialReject = reject
      if (this.connectionId) {
        this.registerOnServer(record)
      }
    })
  }

  public unregisterTransport (handle: Handle | null | undefined): void {
    if (!handle) {
      return
    }
    const record = this.handles.get(handle.id)
    if (!record) {
      return
    }
    this.handles.delete(handle.id)
    if (record.transportId) {
      this.byTransportId.delete(record.transportId)
    }
    this.deregisterOnServer(record)
  }

  public getLatestPath (applianceId: number, path: string): unknown | null {
    const key = `${applianceId}:${path}`
    return this.pathCache.has(key) ? this.pathCache.get(key) : null
  }
}

export const singleton = SseClient.getInstance()
