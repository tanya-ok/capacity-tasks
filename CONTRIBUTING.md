# Contributing

Thanks for considering it. Ground rules first, so nobody wastes time.

## Scope

The v1 scope in the README is frozen. Pull requests that respect it are
welcome; PRs that add interop with other plugins, mobile support, network
calls, gamification, or new task formats will be closed as out of scope.
Open an issue before building anything non-trivial.

## Security boundaries (hard)

- No network requests of any kind.
- No `innerHTML` / `outerHTML` / `insertAdjacentHTML`: build DOM via the
  Obsidian `createEl` API only.
- No new runtime dependencies without prior discussion in an issue.
- No telemetry, no analytics, no remote config.

## Workflow

```sh
pnpm install
pnpm run check    # biome lint + format check
pnpm run build    # tsc typecheck + esbuild bundle
```

- Branch from `main`, one focused change per PR.
- CI (check + build) must pass; `main` is protected and review is
  required.
- Commit style: `type: Subject` (feat, fix, docs, chore, refactor, test).

## Review pace

Maintained by one person in their spare time: PRs are triaged weekly at
most. A slow response is not a rejection.
