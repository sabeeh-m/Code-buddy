---
name: review-pr
description: Review an open pull request for this project — correctness, tests, security, and convention conformance — then post the findings as a PR comment.
allowed-tools: Bash(gh pr view:*), Bash(gh pr diff:*), Bash(gh pr comment:*), Bash(gh pr list:*), Read, Grep, Glob, Agent
---

Review a pull request for this NestJS project. This is a **solo-maintained project — one developer, no review committee**. Do not invent reviewer personas, specialized subagents, or docs that don't exist here. The only project-defined agent is `architect` (`.claude/agents/architect.md`); everything else in this review, you do yourself.

## Get the PR

- If an argument names a PR number, use it. Otherwise resolve the PR for the current branch: `gh pr view --json number,title,baseRefName,url,state`.
- **Check its state before doing anything else**: `gh pr view <number> --json state --jq .state`. If it is not `OPEN` (e.g. `MERGED`, `CLOSED`), stop immediately and tell the user the PR isn't open — do not review it, do not post a comment, do not proceed to the diff or either pass below. This skill only reviews open PRs.
- Fetch the diff: `gh pr diff <number>`.
- Read `CLAUDE.md` for this project's actual architecture, conventions, and documented known gaps (module layout under `src/modules/<feature>/`, Zod-as-source-of-truth for schemas, the ESM-only-major trap for `@nestjs/bullmq`/`@nestjs/config`, the Bull Board auth/throttle gap, etc.) — ground every finding in what's real here, not generic best practice.

## Two passes

1. **Convention conformance** — dispatch the `architect` agent (Agent tool, `subagent_type: "architect"`) with the PR diff and ask it specifically: does this change follow the module layout, Zod-schema, config-validation, and error-handling/logging conventions this project already has? That's architect's actual specialty — use it for exactly this, and nothing else.
2. **Everything else** — do this yourself, directly, no subagent:
   - **Correctness bugs**: logic errors, race conditions, incorrect error handling, off-by-ones.
   - **Test coverage**: are new code paths actually exercised by a new or updated test, not just added?
   - **Security**: anything touching auth, secrets, user input, or the Docker sandbox execution path (`src/modules/sandbox/`) gets extra scrutiny.
   - Skip style/formatting nitpicks — lint and Prettier already own that; don't waste review comments on it.

## Report

Merge both passes into one summary, most important findings first. Post it as a single top-level comment: `gh pr comment <number> --body "..."`. If there's genuinely nothing worth flagging, still post a short comment saying so — a solo maintainer needs confirmation the review actually ran, not silence.

Never approve or request changes on the PR via `gh pr review` — this repo's branch protection requires your own human approval before merging, and a skill approving its own author's work would be meaningless.
