// Standalone entrypoint invoked by git as GIT_SEQUENCE_EDITOR / GIT_EDITOR during an
// interactive rebase started by Branchly. It never runs inside the extension host —
// git spawns it as its own process, so it must stay a tiny, dependency-free script.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const target = process.argv[2];
if (!target) {
  process.exit(1);
}

if (target.endsWith('git-rebase-todo')) {
  const todoFile = process.env.BRANCHLY_REBASE_TODO_FILE;
  if (todoFile && existsSync(todoFile)) {
    writeFileSync(target, readFileSync(todoFile, 'utf8'));
  }
} else {
  // GIT_EDITOR invocation: pop the next pre-collected reword/squash message.
  const queueFile = process.env.BRANCHLY_REBASE_MSG_QUEUE;
  if (queueFile && existsSync(queueFile)) {
    const queue: string[] = JSON.parse(readFileSync(queueFile, 'utf8'));
    const message = queue.shift() ?? '';
    writeFileSync(queueFile, JSON.stringify(queue));
    writeFileSync(target, message);
  }
}

process.exit(0);
