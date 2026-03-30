# devonthink-cli

CLI for DEVONthink tools distilled from `mcp-server-devonthink`.

It publishes these equivalent binaries:

- `devonthink`
- `dt`
- `dt-cli`

## Install

Install from npm:

```bash
npm install -g devonthink
```

After installation, you can use any equivalent executable:

```bash
devonthink --help
dt --help
dt-cli --help
```

## Agent Installation

For Claude Desktop, add `dvcrn/devonthink-cli` as a marketplace plugin, then install the `devonthink` plugin from that marketplace.

For Claude Code, the equivalent commands are:

```bash
claude plugins marketplace add dvcrn/devonthink-cli
claude plugins install devonthink@dvcrn-devonthink-cli --scope user
```

For `npx skills`, run:

```bash
npx skills add dvcrn/devonthink-cli
```

## Usage

List tools:

```bash
devonthink tools
devonthink tools --json
```

Inspect a tool schema:

```bash
devonthink schema create_record
devonthink schema create_record --json
```

Run a tool in human-readable mode:

```bash
devonthink open_databases
devonthink search Alpha --group-uuid <uuid> --database-name Test
devonthink record_content <uuid>
```

Run the same tool in machine-readable mode:

```bash
devonthink open_databases --json
devonthink search --query Alpha --group-uuid <uuid> --database-name Test --json
```

Every command supports both:

- default text output for humans
- `--json` output for scripts and automation

Many tools also support the first obvious required argument positionally. For example:

```bash
devonthink search Alpha
devonthink record_content <uuid>
devonthink rename_record <uuid> --new-name "New title"
```

## Architecture

- `src/devonthink/`: DEVONthink-specific module and tool implementations
- `src/app.ts`: yargs CLI wiring
- `src/output.ts`: human-readable and JSON output formatters

## Safety

When testing, only use the `Test` database.

## License

GPL-3.0-or-later
