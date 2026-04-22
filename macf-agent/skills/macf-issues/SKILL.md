---
name: macf-issues
description: Check pending GitHub issues assigned to this agent. Use this to find work that needs to be done.
allowed-tools: Bash(npx *), Bash(gh *)
---

Run this command and display the result:

```!
npx -y -p @groundnuty/macf macf-plugin-cli issues
```

If there are pending issues, ask which one to work on.
