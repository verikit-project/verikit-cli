# Security Policy

## Supported Versions

VeriKit CLI is pre-1.0 and under active development. Only the latest published version on npm
receives security fixes.

| Version | Supported |
| ------- | --------- |
| latest  | ✅        |
| < latest | ❌       |

## Reporting a Vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Instead, report it privately using one of these channels:

- [GitHub private vulnerability reporting](https://github.com/iamceeso/verikit-cli/security/advisories/new) for this repository, or
- Email [hi@ceeso.dev](mailto:hi@ceeso.dev) with details and, if possible, reproduction steps.

You should get an acknowledgement within a few days. Once a report is confirmed, we'll work on a
fix and coordinate a disclosure timeline with you before any public announcement.

## Scope

`verikit init` and `verikit install` read `package.json` and lockfiles in the current directory,
then run your package manager's own `add`/`install` command and write generated files under your
project root. The CLI does not:

- Execute arbitrary code from the internet  it only invokes your local package manager
  (`npm`/`pnpm`/`yarn`/`bun`) with a fixed, CLI-constructed argument list
- Collect telemetry or send project data anywhere
- Modify files outside the directory it's run in

If you find a case where any of the above doesn't hold, that's a vulnerability  please report it.
