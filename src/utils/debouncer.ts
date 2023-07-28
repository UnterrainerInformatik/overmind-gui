/**
 * This class is a Debouncer allowing you to debounce any function calls happening in short succession.
 * The debouncer has a timeout in milliseconds (default is null) and it ensures that the debounced functions will
 * only be called once every [timeout] time.
 * If timeout is not set, then the debounced functions will be called immediately and the 'timeout' will only be
 * over when the last function call has been executed, either successfully or not.
 * When the first debounce-call happens, that function gets executed immediately and a timer is started.
 * When another debounce happens within [timeout] time of the first one, then that function gets saved and will be
 * executed later on. The function that may have been in this waiting-position before that, will be discarded
 * (that's where de debouncing actually happens).
 * After the timeout has run out, the last saved function will be finally executed, triggering yet another timeout.
 * (If meanwhile another debounce-call happens, the waiting-position won't be vacant any longer and at the end another
 * timeout will be started, and so on, and so forth...)
 * This way you never lose the last function call (because of eventual consistency and stuff).
 */

interface DebouncerOptions extends Partial<Debouncer> {
  startImmediately?: boolean;
  enqueueing?: Function;
  ending?: Function;
}

export class Debouncer {
  private timer: any | null = null
  private timeout = 0
  private lastFunc: Function | null = null
  private startImmediately: boolean | null = true
  private isFunctionRunning: boolean | null = false

  public enqueueing: Function | null = null
  public ending: Function | null = null

  /**
   * Creates another Debouncer with the given timeout in milliseconds.
   * @param timeout the timeout in milliseconds (defaults to null if omitted)
   * @param options an object containing the following: startImmediately... if false, the first function call will not be executed immediately,
   * but only after the first timeout has run out. Only makes sense if you specify a timeout. Defaults to true.
   * staring... a function that gets executed when the first function call of a debounced sequence is executed
   * ending... a function that gets executed when the last function call of a debounced sequence is executed
   * @return the new Debouncer instance
   */
  public constructor (timeout?, options?: DebouncerOptions) {
    this.timeout = timeout
    Object.assign(this, options)
  }

  /**
   * Enqueue a function to be debounced by this instance.
   * @param func the function to debounce
   * @return the instance of this Debouncer to provide a fluent interface
   */
  public async debounce (func: Function) {
    if (this.enqueueing) {
      await this.enqueueing()
    }
    if (this.timer) {
      // Function is currently running. Remember it for cleanup-run.
      // This is the actual debouncing without losing the last function.
      this.lastFunc = func
      return this
    }
    if ((!this.timer && !this.startImmediately)) {
      // This is the first function call when a timeout is specified, but
      // we don't want to start immediately. So we remember it for later and start the timer.
      this.lastFunc = func
      this.setupTimer()
      return this
    }
    this.setupTimer()
    this.isFunctionRunning = true
    await func()
    this.isFunctionRunning = false
    return this
  }

  private setupTimer (value?: number) {
    this.timer = setTimeout(async () => {
      await this.cleanupRun()
    }, value ?? this.timeout)
  }

  private async cleanupRun () {
    if (!this.lastFunc) {
      this.timer = null
      return
    }
    if (this.isFunctionRunning) {
      this.setupTimer(10)
    }
    const func = this.lastFunc
    this.lastFunc = null
    this.timer = null
    await func()
    if (this.lastFunc) {
      // There is another function waiting to be debounced.
      this.setupTimer()
    } else {
      if (this.ending) {
        await this.ending()
      }
    }
  }
}
