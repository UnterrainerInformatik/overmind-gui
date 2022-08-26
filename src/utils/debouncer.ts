/**
 * This class is a Debouncer allowing you to debounce any function calls happening in short succession.
 * The debouncer has a timeout in milliseconds (default is 100ms) and it ensures that the debounced functions will
 * only be called once every [timeout] time.
 * When the first debounce-call happens, that function gets executed immediately and a timer is started.
 * When another debounce happens within [timeout] time of the first one, then that function gets saved and will be
 * executed later on. The function that may have been in this waiting-position before that will be discarded
 * (that's where de debouncing actually happens).
 * After the timeout has run out, the last saved function will be finally executed, triggering yet another timeout.
 * (If meanwhile another debounce-call happens, the waiting-position won't be vacant any longer and at the end another
 * timeout will be started, and so on, and so forth...)
 * This way you never lose the last function call (because of eventual consistency and stuff).
 */
export class Debouncer {
  public timeout = 100
  public whenDebounceCalled: Function | null = null
  public whenEmptyEvent: Function | null = null

  private timer: object | null = null
  private lastFunc: Function | null = null

  /**
   * Creates another Debouncer with the given timeout in milliseconds.
   * @param init the initialization-object
   */
  public constructor (init?: Partial<Debouncer>) {
    Object.assign(this, init)
  }

  /**
   * Enqueue a function to be debounced by this instance.
   * @param func the function to debounce
   */
  public async debounce (func: Function) {
    if (this.whenDebounceCalled) {
      await this.whenDebounceCalled()
    }
    if (this.timer) {
      // Function is currently running. Remember it for cleanup-run.
      // This is the actual debouncing without losing the last function.
      this.lastFunc = func
      return
    }
    this.setupTimer()
    await func()
  }

  private setupTimer () {
    this.timer = setTimeout(async () => {
      await this.cleanupRun()
    }, this.timeout)
  }

  private async cleanupRun () {
    if (!this.lastFunc) {
      this.timer = null
      if (this.whenEmptyEvent) {
        await this.whenEmptyEvent()
      }
      return
    }
    this.setupTimer()
    await this.lastFunc()
    this.lastFunc = null
  }
}
