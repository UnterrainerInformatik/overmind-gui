import {
  Handle,
  SelectionShape,
  SseClientConfig,
  Subscription,
  SubscriptionAggregate,
  SubscriptionSpec,
  TransportCallback,
  TransportSpec,
  TransportUpdate,
  ValueTriple
} from './types'
import { plainAdapter } from './reactivity'

interface HandleRecord {
  handle: Handle;
  spec: TransportSpec;
  callback: TransportCallback;
  transportId: string | null;
  initialResolve: ((h: Handle) => void) | null;
  initialReject: ((err: Error) => void) | null;
}

interface SubscriptionRecord {
  subscription: Subscription;
  spec: SubscriptionSpec;
  handle: Handle | null;
  transportId: string | null;
  generation: number;
  staleTimer: ReturnType<typeof setTimeout> | null;
  closed: boolean;
  allKeys: string[];
  selectedIds: Set<number>;
}

function selectedIdsForSelection (selection: SelectionShape): Set<number> {
  const ids = new Set<number>()
  if ('perAppliance' in selection) {
    for (const entry of selection.perAppliance) {
      ids.add(entry.applianceId)
    }
  } else {
    for (const id of selection.applianceIds) {
      ids.add(id)
    }
  }
  return ids
}

function flatKeysForSelection (selection: SelectionShape): string[] {
  const keys: string[] = []
  if ('perAppliance' in selection) {
    for (const entry of selection.perAppliance) {
      for (const path of entry.paths) {
        if (path === '**') {
          continue
        }
        keys.push(`${entry.applianceId}:${path}`)
      }
    }
  } else {
    for (const id of selection.applianceIds) {
      for (const path of selection.paths) {
        if (path === '**') {
          continue
        }
        keys.push(`${id}:${path}`)
      }
    }
  }
  return keys
}

let handleCounter = 0
function nextHandleId (): string {
  handleCounter++
  return 'sse-' + handleCounter
}

export class SseClient {
  private readonly config: Required<Pick<SseClientConfig, 'reactivity' | 'reconnectDelayMs' | 'debug'>> & SseClientConfig

  private connectionId: string | null = null
  private eventSource: EventSource | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private handles: Map<string, HandleRecord> = new Map()
  private byTransportId: Map<string, HandleRecord> = new Map()
  private pendingInitialUpdates: Map<string, unknown> = new Map()
  private pathCache: Map<string, unknown> = new Map()
  private subscriptions: Set<SubscriptionRecord> = new Set()
  private _connected = false

  constructor (config: SseClientConfig) {
    this.config = {
      ...config,
      reactivity: config.reactivity ?? plainAdapter,
      reconnectDelayMs: config.reconnectDelayMs ?? 3000,
      debug: config.debug ?? false
    }
  }

  public get connected (): boolean {
    return this._connected
  }

  private authHeader (): Record<string, string> {
    return this.config.authHeader ? this.config.authHeader() : {}
  }

  private ensureConnection (): void {
    if (this.eventSource && this.eventSource.readyState !== EventSource.CLOSED) {
      return
    }
    if (this.reconnectTimer) {
      return
    }
    this.destroyConnection()

    const url = this.config.buildSseUrl()
    if (this.config.debug) {
      // eslint-disable-next-line no-console
      console.debug('[SSE] opening EventSource', { url })
    }
    this.eventSource = new EventSource(url)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.eventSource.addEventListener('connected', (e: any) => {
      this.onConnected(e)
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.eventSource.addEventListener('transport-update', (e: any) => {
      this.onTransportUpdate(e)
    })
    this.eventSource.onmessage = (e: MessageEvent) => {
      if (this.config.debug) {
        // eslint-disable-next-line no-console
        console.debug('[SSE] generic message', { data: e.data, lastEventId: e.lastEventId })
      }
    }
    this.eventSource.onerror = () => {
      if (this.config.debug) {
        // eslint-disable-next-line no-console
        console.debug('[SSE] onerror', { readyState: this.eventSource && this.eventSource.readyState })
      }
      this._connected = false
      this.connectionId = null
      this.markSubscriptionsDisconnected()
      if (this.eventSource && this.eventSource.readyState === EventSource.CLOSED) {
        this.scheduleReconnect()
      }
    }
  }

  private markSubscriptionsDisconnected (): void {
    this.subscriptions.forEach(record => {
      if (record.closed) {
        return
      }
      record.subscription.connected = false
      record.subscription.stale = false
      if (record.staleTimer !== null) {
        clearTimeout(record.staleTimer)
        record.staleTimer = null
      }
    })
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
    }, this.config.reconnectDelayMs)
  }

  private onConnected (e: MessageEvent): void {
    const data = JSON.parse(e.data)
    this.connectionId = data.connectionId
    this._connected = true
    if (this.config.debug) {
      // eslint-disable-next-line no-console
      console.debug('[SSE] connected', { connectionId: this.connectionId, reregistering: this.handles.size })
    }

    this.byTransportId.clear()
    this.handles.forEach(record => {
      record.transportId = null
      this.registerOnServer(record)
    })
  }

  private buildPayloadFromData (data: Record<string, unknown>): TransportUpdate | null {
    const payload: Record<string, unknown> = { ts: data.ts }
    if (data.values !== undefined) {
      payload.values = data.values
      for (const triple of data.values as ValueTriple[]) {
        this.pathCache.set(`${triple.applianceId}:${triple.path}`, triple.value)
      }
    } else if (data.aggregate !== undefined) {
      payload.aggregate = data.aggregate
    } else {
      return null
    }
    return payload as unknown as TransportUpdate
  }

  private dispatchToRecord (record: HandleRecord, payload: TransportUpdate): void {
    record.callback(payload)
    if (record.initialResolve) {
      const resolve = record.initialResolve
      record.initialResolve = null
      record.initialReject = null
      resolve(record.handle)
    }
  }

  private onTransportUpdate (e: MessageEvent): void {
    const data = JSON.parse(e.data)
    const transportId: string | undefined = data.transportId
    if (this.config.debug) {
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
      this.pendingInitialUpdates.set(transportId, data)
      return
    }

    const payload = this.buildPayloadFromData(data)
    if (!payload) {
      return
    }
    this.dispatchToRecord(record, payload)
  }

  private async registerOnServer (record: HandleRecord): Promise<void> {
    if (!this.connectionId) {
      return
    }
    const body: Record<string, unknown> = {
      connectionId: this.connectionId,
      minInterval: record.spec.minInterval,
      selection: record.spec.selection
    }
    if (record.spec.aggregate) {
      body.aggregate = record.spec.aggregate
    }
    try {
      const response = await this.config.httpPost(
        this.config.buildRegisterUrl(),
        body,
        this.authHeader()
      )
      const responseData = response.data as { transportId: string }
      const transportId: string = responseData.transportId
      record.transportId = transportId
      this.byTransportId.set(transportId, record)
      if (this.config.debug) {
        // eslint-disable-next-line no-console
        console.debug('[SSE] registered on server', { handleId: record.handle.id, transportId, selection: record.spec.selection })
      }
      const pending = this.pendingInitialUpdates.get(transportId)
      if (pending !== undefined) {
        this.pendingInitialUpdates.delete(transportId)
        if (this.config.debug) {
          // eslint-disable-next-line no-console
          console.debug('[SSE] replaying buffered initial update', { handleId: record.handle.id, transportId })
        }
        const payload = this.buildPayloadFromData(pending as Record<string, unknown>)
        if (payload) {
          this.dispatchToRecord(record, payload)
        }
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
      await this.config.httpPost(
        this.config.buildDeregisterUrl(),
        { connectionId: this.connectionId, transportId },
        this.authHeader()
      )
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

  private buildSubscriptionShell (spec: SubscriptionSpec): { shell: Subscription; allKeys: string[] } {
    const allKeys = spec.aggregate ? [] : flatKeysForSelection(spec.selection)
    const valuesObj: Record<string, unknown> = {}
    for (const key of allKeys) {
      valuesObj[key] = undefined
    }
    const aggregateObj: SubscriptionAggregate | null = spec.aggregate
      ? { value: null, sampleCount: 0, totalCount: 0 }
      : null
    const shell = this.config.reactivity.observable<Subscription>({
      values: spec.aggregate ? null : valuesObj,
      aggregate: aggregateObj,
      ts: null,
      connected: false,
      stale: false,
      error: null,
      close: () => { /* wired after record construction */ }
    })
    return { shell, allKeys }
  }

  private dispatchToSubscription (record: SubscriptionRecord, payload: TransportUpdate): void {
    if (record.closed) {
      return
    }
    const sub = record.subscription
    if ('values' in payload && sub.values) {
      for (const triple of payload.values) {
        const targetIds = new Set<number>()
        targetIds.add(triple.applianceId)
        if (Array.isArray(triple.representsGroups)) {
          for (const id of triple.representsGroups) {
            targetIds.add(id)
          }
        }
        for (const id of targetIds) {
          if (!record.selectedIds.has(id)) {
            continue
          }
          this.config.reactivity.set(sub.values, `${id}:${triple.path}`, triple.value)
        }
      }
    } else if ('aggregate' in payload && sub.aggregate) {
      sub.aggregate.value = payload.aggregate.value
      sub.aggregate.sampleCount = payload.aggregate.sampleCount
      sub.aggregate.totalCount = payload.aggregate.totalCount
    }
    sub.ts = payload.ts
    sub.stale = false
    if (!sub.connected) {
      sub.connected = true
    }
    if (record.staleTimer !== null) {
      clearTimeout(record.staleTimer)
    }
    record.staleTimer = setTimeout(() => {
      if (!record.closed && record.subscription.connected) {
        record.subscription.stale = true
      }
    }, 2 * record.spec.minInterval)
  }

  private armCloseForSubscription (record: SubscriptionRecord): void {
    if (record.closed) {
      return
    }
    record.closed = true
    record.generation++
    if (record.staleTimer !== null) {
      clearTimeout(record.staleTimer)
      record.staleTimer = null
    }
    if (record.handle !== null) {
      this.unregisterTransport(record.handle)
      record.handle = null
    }
    this.subscriptions.delete(record)
    const sub = record.subscription
    if (sub.values) {
      for (const key of Object.keys(sub.values)) {
        sub.values[key] = undefined
      }
    }
    if (sub.aggregate) {
      sub.aggregate.value = null
      sub.aggregate.sampleCount = 0
      sub.aggregate.totalCount = 0
    }
    sub.connected = false
    sub.stale = false
  }

  public subscribe (spec: SubscriptionSpec): Subscription {
    const { shell, allKeys } = this.buildSubscriptionShell(spec)
    const record: SubscriptionRecord = {
      subscription: shell,
      spec,
      handle: null,
      transportId: null,
      generation: 0,
      staleTimer: null,
      closed: false,
      allKeys,
      selectedIds: selectedIdsForSelection(spec.selection)
    }
    this.subscriptions.add(record)
    shell.close = () => this.armCloseForSubscription(record)

    const gen = record.generation
    const cb: TransportCallback = (payload) => {
      if (record.closed || gen !== record.generation) {
        return
      }
      this.dispatchToSubscription(record, payload)
    }
    this.registerTransport(spec, cb)
      .then(handle => {
        if (record.closed || gen !== record.generation) {
          this.unregisterTransport(handle)
          return
        }
        record.handle = handle
        const handleRecord = this.handles.get(handle.id)
        record.transportId = handleRecord ? handleRecord.transportId : null
      })
      .catch(err => {
        if (!record.closed) {
          record.subscription.error = err instanceof Error ? err : new Error(String(err))
        }
      })
    return shell
  }
}
