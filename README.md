# @verikit/cli

Scaffolding CLI for [VeriKit](https://verikit.dev). It inspects your existing project, installs
the right `@verikit/*` packages for your stack, and generates the integration boilerplate  so
you don't have to read the docs just to wire it up.

## Usage

Run inside an existing project (Next.js, React, or Vue):

```sh
npx @verikit/cli init
# or
pnpm dlx @verikit/cli init
```

## Commands

### `verikit init`

Detects your package manager, UI framework, and database ORM from `package.json`, then:

- Installs the matching `@verikit/*` packages (and their peer dependencies)
- Generates `verikit/server.ts` and a starter `verikit/resources/example.ts`
- For Next.js App Router projects, generates `app/api/verikit/[...path]/route.ts`
- Adds the `@verikit/theme` import to your global stylesheet, if you opt in

It only prompts for what it can't determine on its own, and it's safe to run more than once 
existing files and imports are left untouched.

Flags:

| Flag             | Effect                                                       |
| ---------------- | -------------------------------------------------------------- |
| `--dry-run`      | Show what would be installed and generated without changing anything |
| `--skip-install` | Generate files without installing dependencies                |

### `verikit install`

Same detection and prompts as `init`, but only installs packages  no files are generated. Useful
if you're managing the integration by hand and just want the dependencies.

Flags:

| Flag        | Effect                                                  |
| ----------- | -------------------------------------------------------- |
| `--dry-run` | Show what would be installed without changing anything |

## Docs

Guides and API reference: [verikit.dev](https://verikit.dev)

## Development

Requires Node.js 24 and pnpm.

```sh
pnpm install
pnpm dev init          # run the CLI against the current directory, via tsx
pnpm verify             # typecheck, lint, build, and run tests at 100% coverage
```

This repo includes the [VeriKit framework](https://github.com/iamceeso/verikit) as a git
submodule under `framework/`, kept as a development-time reference for the real package APIs 
the CLI has no runtime dependency on it.

## Status

Under active development. Commands and flags may change.

## License

MIT  see [LICENSE.md](LICENSE.md).
