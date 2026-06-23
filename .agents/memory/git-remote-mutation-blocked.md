---
name: Git remote mutation blocked for agent
description: Why the agent cannot remove/rename git remotes or edit .git/config, and what to do instead.
---

# Git remote mutation is hard-blocked for the agent

Removing a git remote (`git remote remove`), deleting `.git/refs/**` lock files,
and even editing `.git/config` with the edit tool all fail with:
"Destructive git operations are not allowed in the main agent. Use the
project_tasks skill to propose a new background Project Task..."

**Why:** the platform sandbox guards all writes under `.git/` and all
destructive git subcommands for the main agent. This guard is NOT lifted by
proposing a project task and having it assigned back to the **main agent** —
build-mode execution of an assigned task still runs as "main agent" and is still
blocked. (An isolated task-agent environment is a different story, but `.git/config`
is not part of the merged working tree, so a task agent's remote change would not
propagate back anyway.)

**How to apply:** do NOT attempt to unlink/add/rename GitHub repos or edit
remotes from agent tooling. Unlinking a connected GitHub repo is a user action in
the Replit Git / Version Control pane. Report this as a blocker rather than
retrying. (Force-pushing to an *existing* remote IS possible — see the GitHub PAT
note — it's only remote *config mutation* that's blocked.)
