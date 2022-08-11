export class ObservableMap<K, V> {
  private map
  private changeTracker = 1

  public get size (): number {
    return this.binding() && this.map.size
  }

  public constructor (map?) {
    if (map) {
      this.map = new Map(map)
      if (map instanceof ObservableMap) {
        this.changeTracker = map.changeTracker
      }
    } else {
      this.map = new Map()
    }
  }

  public getChangeTracker (): number {
    return this.changeTracker
  }

  public setChangeTracker (value: number) {
    this.changeTracker = value
  }

  public set (key: K, value: V): number | ObservableMap<K, V> {
    this.map.set(key, value)
    return this.binding() && this
  }

  public get (key: K): number | V {
    return this.binding() && this.map.get(key)
  }

  public delete (key: K): number | boolean {
    return this.binding() && this.map.delete(key)
  }

  public clear () {
    this.binding() && this.map.clear()
    this.changeTracker = 1
  }

  public forEach (callbackfn: (value: V, key: K, map: Map<K, V>) => void, thisArg?: any): number | void {
    return this.binding() && this.map.forEach(callbackfn, thisArg)
  }

  public entries (): number | IterableIterator<[K, V]> {
    return this.binding() && this.map.entries()
  }

  public has (key: K): number | boolean {
    return this.binding() && this.map.has(key)
  }

  public values (): 0 | IterableIterator<V> {
    return this.binding() && this.map.values()
  }

  public valuesAsArray (): 0 | Array<V> {
    return this.binding() && Array.from(this.map.values())
  }

  public keys (): 0 | IterableIterator<K> {
    return this.binding() && this.map.keys()
  }

  public keysAsArray (): 0 | Array<K> {
    return this.binding() && Array.from(this.map.keys())
  }

  public binding () {
    return this.changeTracker
  }

  public changed () {
    this.changeTracker++
  }
}
