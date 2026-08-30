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
    this.git = simpleGit({
      baseDir: root,
      maxConcurrentProcesses: 1,
      trimmed: false,
      // raw() always merges the *inherited* process.env into any per-call .env() override
      // (see below) so git keeps whatever ambient config the host has set up — e.g. a
      // credential helper or GIT_CONFIG_* injected for an outbound proxy. simple-git's
      // safety plugin otherwise refuses a custom .env() call outright whenever any of these
      // land in it, regardless of value, since it can't tell "inherited" from "attacker
      // supplied". Branchly's own git.raw() callers never accept raw, unsanitized argv from
      // outside the extension, so the actual class of attack these flags guard against (an
      // untrusted caller injecting a credential helper, editor, or config override into a
      // git invocation) doesn't apply here.
      unsafe: {
        allowUnsafeEditor: true,
        allowUnsafeAskPass: true,
        allowUnsafeConfigEnvCount: true,
        allowUnsafeConfigPaths: true,
        allowUnsafeCredentialHelper: true,
      },
    });
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
