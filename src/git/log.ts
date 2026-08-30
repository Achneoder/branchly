import type { GitService } from './gitService';

export interface RawCommit {
  hash: string;
  parents: string[];
  authorName: string;
  authorEmail: string;
  authorDate: string;
  refs: string[];
  subject: string;
  body: string;
}

export interface LogOptions {
  maxCount?: number;
  skip?: number;
  revisionRange?: string;
  path?: string;
}

const FIELD = '\x1f';
const RECORD = '\x1e';
const FORMAT = ['%H', '%P', '%an', '%ae', '%ad', '%D', '%s', '%b'].join(FIELD) + RECORD;

export function buildLogArgs(opts: LogOptions = {}): string[] {
  const args = ['log', `--pretty=format:${FORMAT}`, '--date=iso-strict', '--decorate=full'];
  if (opts.maxCount) args.push(`--max-count=${opts.maxCount}`);
  if (opts.skip) args.push(`--skip=${opts.skip}`);
  args.push(opts.revisionRange ?? 'HEAD');
  if (opts.path) args.push('--', opts.path);
  return args;
}

export function parseLogOutput(raw: string): RawCommit[] {
  return raw
    .split(RECORD)
    .map((record) => record.trim())
    .filter(Boolean)
    .map((record) => {
      const [hash, parents, authorName, authorEmail, authorDate, refs, subject, ...bodyParts] =
        record.split(FIELD);
      return {
        hash,
        parents: parents ? parents.split(' ').filter(Boolean) : [],
        authorName: authorName ?? '',
        authorEmail: authorEmail ?? '',
        authorDate: authorDate ?? '',
        refs: refs ? refs.split(', ').filter(Boolean) : [],
        subject: subject ?? '',
        body: bodyParts.join(FIELD).trim(),
      };
    });
}

export async function getLog(
  git: GitService,
  opts: LogOptions = {},
  signal?: AbortSignal,
): Promise<RawCommit[]> {
  const raw = await git.raw(buildLogArgs(opts), signal);
  return parseLogOutput(raw);
}
