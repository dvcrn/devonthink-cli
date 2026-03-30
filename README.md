# devonthink-cli

CLI for DEVONthink tools distilled from `mcp-server-devonthink`.

## Install

```bash
npm install
npm run build
```

## Usage

List tools:

```bash
node dist/cli.js tools
node dist/cli.js tools --json
```

Inspect a tool schema:

```bash
node dist/cli.js schema create_record
node dist/cli.js schema create_record --json
```

Run a tool in human-readable mode:

```bash
node dist/cli.js get_open_databases
node dist/cli.js search Alpha --group-uuid <uuid> --database-name Test
node dist/cli.js get_record_content <uuid>
```

Run the same tool in machine-readable mode:

```bash
node dist/cli.js get_open_databases --json
node dist/cli.js search --query Alpha --group-uuid <uuid> --database-name Test --json
```

Every command supports both:

- default text output for humans
- `--json` output for scripts and automation

Many tools also support the first obvious required argument positionally. For example:

```bash
node dist/cli.js search Alpha
node dist/cli.js get_record_content <uuid>
node dist/cli.js rename_record <uuid> --new-name "New title"
```

## Architecture

- `src/devonthink/`: DEVONthink-specific module and tool implementations
- `src/app.ts`: yargs CLI wiring
- `src/output.ts`: human-readable and JSON output formatters

## Safety

When testing, only use the `Test` database.
