import simpleGit, { type SimpleGit } from 'simple-git';

export class GitCommandError extends Error {
  constructor(
    message: string,
    readonly stderr: string,
  ) {
    super(message);
    this.name = 'GitCommandError';
  }
}

export class AbortedError extends Error {
  constructor() {
    super('Git command aborted');
    this.name = 'AbortedError';
  }
}

/**
 * Thin wrapper around simple-git for a single repository root.
 * Calls are serialized through a promise chain (git does not like concurrent
 * writers on the same working tree/index). Cancellation is cooperative: an
 * aborted call still runs to completion under the hood (simple-git does not
 * expose the underlying child process to kill), but its result is discarded
 * and queued follow-up calls are skipped, so the caller never acts on stale
 * output and the queue drains quickly once a UI selection changes.
 */
export class GitService {
  private readonly git: SimpleGit;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(readonly root: string) {
    this.git = simpleGit({ baseDir: root, maxConcurrentProcesses: 1, trimmed: false });
  }

  private enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.queue.then(fn, fn);
    this.queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  async raw(args: string[], signal?: AbortSignal, env?: Record<string, string>): Promise<string> {
    return this.enqueue(async () => {
      if (signal?.aborted) throw new AbortedError();
      const instance = env ? this.git.env({ ...process.env, ...env }) : this.git;
      try {
        const result = await instance.raw(args);
        if (signal?.aborted) throw new AbortedError();
        return result;
      } catch (err) {
        if (err instanceof AbortedError) throw err;
        if (signal?.aborted) throw new AbortedError();
        throw new GitCommandError(`git ${args.join(' ')} failed`, extractMessage(err));
      }
    });
  }
}

function extractMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
