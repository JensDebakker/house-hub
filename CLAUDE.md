# House Hub

@AGENTS.md

The content above is the shared, tool-agnostic project context and workflow rules (also
readable by non-Claude coding agents). Everything below is Claude Code-specific: exact
tool names and mechanics for carrying out the rules above in this harness.

Please check @AGENTS.MD aswell!!!

## Claude Code mechanics

- **Check for a sibling session before starting non-trivial work.** Run `ListAgents` early
  — if another session on this repo shows up, say so to your user before diving in.
- **If a file you're mid-edit on keeps changing under you** or comes back with
  inconsistent state (missing imports, half-applied rewrites), stop editing it and use
  `SendMessage` to reach the other session instead of racing it — let the user decide who
  finishes it.
- **Prefer a git worktree over switching branches in the shared checkout.** Use
  `EnterWorktree`/`ExitWorktree`, or the `Agent` tool's `isolation: "worktree"` when
  dispatching a subagent for a feature branch.
- **Scoped subagents for this repo: `backend`, `frontend`, `devops`** (see
  `.claude/agents/`). Prefer dispatching to those over a generic agent when a task is
  clearly confined to one layer — they're pointed at the right directories and stack
  already.
