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
  private timer: object | null = null
  private timeout = 100
  private lastFunc: Function | null = null

  /**
   * Creates another Debouncer with the given timeout in milliseconds.
   * @param timeout the timeout in milliseconds (defaults to 100 if omitted)
   */
  public constructor (timeout?) {
    if (timeout) {
      this.timeout = timeout
    }
  }

  /**
   * Enqueue a function to be debounced by this instance.
   * @param func the function to debounce
   * @return the instance of this Debouncer to provide a fluent interface
   */
  public async debounce (func: Function) {
    if (this.timer) {
      // Function is currently running. Remember it for cleanup-run.
      // This is the actual debouncing without losing the last function.
      this.lastFunc = func
      return this
    }
    this.setupTimer()
    await func()
    return this
  }

  private setupTimer () {
    this.timer = setTimeout(async () => {
      await this.cleanupRun()
    }, this.timeout)
  }

  private async cleanupRun () {
    if (!this.lastFunc) {
      this.timer = null
      return
    }
    this.setupTimer()
    await this.lastFunc()
    this.lastFunc = null
  }
}
