# Security policy

## Reporting a vulnerability

Please use GitHub's private vulnerability reporting on this repository
(Security tab -> Report a vulnerability). Do not open a public issue for
security problems.

Response time follows the support policy in the README: reports are read
weekly. Critical issues (anything that could exfiltrate vault content)
take priority over everything else.

## Scope notes

This plugin is local-first by design:

- It makes no network requests and never will. A pull request that adds
  any network call, telemetry, or remote-fetched code will be rejected;
  this is a security boundary, not a preference.
- It reads vault files and writes only its own settings file
  (`data.json`). It never modifies notes.
