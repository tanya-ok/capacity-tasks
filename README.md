# Capacity Tasks

> Working name, pre-release. The final name will be decided before community
> directory submission.

An Obsidian plugin that shows only the tasks that fit today's energy budget.
It reads a capacity level (1-5) from your daily note and filters tasks by
their declared point cost. Planning by energy, not by wishful thinking.

## How it works

1. Your daily note carries a capacity level in frontmatter:

   ```yaml
   ---
   capacity: 3
   ---
   ```

2. Tasks anywhere in the vault declare a cost inline:

   ```markdown
   - [ ] answer the accountant email [cost::2]
   - [ ] refactor the import script [cost::5]
   ```

3. The Capacity Tasks side panel maps capacity to a point budget
   (default: level 1 = 2 points ... level 5 = 10 points), lists open tasks
   that fit, and draws a comfort line at 70% of the budget. Tasks above
   today's budget are hidden, not struck through: they are for another day,
   not a debt.

## Scope (v1, frozen)

- One canonical format: frontmatter `capacity` in `Daily/YYYY-MM-DD.md`,
  inline `[cost::N]` on task lines. Folder, property name, and field name
  are configurable; the format itself is not.
- Desktop only. Mobile is explicitly unsupported in v1.
- No integration with Tasks, Dataview, Full Calendar, or any other plugin
  in v1. Requests for interop will be closed as out of scope for now.
- No gamification, no streaks, no shame mechanics. Unfinished is not red.

## Support policy

This plugin is maintained by one person in their spare time.

- Issues are triaged weekly at most. There is no SLA.
- No feature commitments. The scope above is intentional.
- Pull requests that respect the scope freeze are welcome.

## Install (manual, pre-release)

```sh
git clone <this repo> 
cd capacity-tasks
pnpm install
pnpm run build
# copy manifest.json + main.js into <vault>/.obsidian/plugins/capacity-tasks/
```

## License

MIT
