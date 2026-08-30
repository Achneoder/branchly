/** Cancels the previous in-flight request for a given key before starting a new one. */
export class AbortRegistry {
  private readonly controllers = new Map<string, AbortController>();

  next(key: string): AbortSignal {
    this.controllers.get(key)?.abort();
    const controller = new AbortController();
    this.controllers.set(key, controller);
    return controller.signal;
  }

  dispose(): void {
    for (const controller of this.controllers.values()) controller.abort();
    this.controllers.clear();
  }
}
