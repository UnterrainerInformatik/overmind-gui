import { ObservableMap } from './observableMap'

export class DoubleBufferedObservableMap<K, V> {
  public map = new ObservableMap<K, V>()
  public backingMap = new ObservableMap<K, V>()

  public backup (): DoubleBufferedObservableMap<K, V> {
    this.backingMap.clear()
    this.map.forEach((value, key) => {
      this.backingMap.set(key, value)
    })
    this.backingMap.setChangeTracker(this.map.getChangeTracker())
    return this
  }

  public swap (): DoubleBufferedObservableMap<K, V> {
    const temp = this.map
    this.map = this.backingMap
    this.backingMap = temp
    return this
  }

  public get size (): number {
    return this.map.size
  }

  public get (key: K): number | V {
    return this.map.get(key)
  }

  public forEach (callbackfn: (value: V, key: K, map: Map<K, V>) => void, thisArg?: any): number | void {
    return this.map.forEach(callbackfn, thisArg)
  }

  public entries (): number | IterableIterator<[K, V]> {
    return this.map.entries()
  }

  public has (key: K): number | boolean {
    return this.map.has(key)
  }

  public values (): 0 | IterableIterator<V> {
    return this.map.values()
  }

  public valuesAsArray (): 0 | Array<V> {
    return this.map.valuesAsArray()
  }

  public keys (): 0 | IterableIterator<K> {
    return this.map.keys()
  }

  public keysAsArray (): 0 | Array<K> {
    return this.map.keysAsArray()
  }

  public binding () {
    return this.map.binding()
  }

  public changed () {
    this.map.changed()
  }
}
