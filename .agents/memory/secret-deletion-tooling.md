---
name: Secret deletion tooling gap
description: deleteEnvVars cannot remove Replit secrets — only the user can, via the Secrets UI.
---

`deleteEnvVars({ keys: [...] })` returns a success payload (e.g.
`{environment:"shared", keys:[...]}`) even for a key that is stored as a
**secret**, but the secret is NOT actually removed — a follow-up
`viewEnvVars({type:"secret", keys:[...]})` still shows it as present.

**Why:** the environment-secrets tooling can view/set/delete *environment
variables*, but secrets are global and "cannot be set or modified directly"
through tooling; deletion of a secret is not supported either. The success
response only reflects clearing a (possibly non-existent) shared env var of
the same name.

**How to apply:** when a task requires removing a secret (e.g. retiring an API
key), do the code/config cleanup yourself, then explicitly ask the user to
delete the secret from the Secrets pane. Don't claim the secret is gone based
on the deleteEnvVars success result — verify with viewEnvVars, and if it
persists, hand the deletion to the user.
