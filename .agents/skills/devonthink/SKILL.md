---
name: devonthink
description: Operate the DEVONthink CLI for databases, records, search, tags, and AI workflows. Use when requests mention the `devonthink`, `dt`, or `dt-cli` commands, or the npm package `devonthink`, especially for command construction, schema inspection, JSON output, and record/database operations.
---

# DEVONthink CLI

## Overview

Use this skill to run the DEVONthink CLI safely and produce exact commands for the
current command surface.

Prefer read-only commands first when verifying identifiers or database context.
Use JSON output when the result will be piped to other tools or parsed by code.

Read `references/commands.md` for the supported command surface.
Read `references/examples.md` for concrete examples.

## Runbook

1. Confirm DEVONthink is running with `devonthink is_running`.
2. Confirm the active or target database with `devonthink current_database` or `devonthink get_open_databases`.
3. Resolve record UUIDs with read-only commands before write operations.
4. Prefer `--json` for automation and downstream parsing.
5. Before mutating records, verify the target with `get_record_properties`, `get_record_by_identifier`, `search`, or `lookup_record`.
6. Use `schema <tool>` when you need exact parameter names.

## Installation And Agent Setup

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

## Output Strategy

Use default human-readable output for interactive use.
Use `--json` for automation and downstream parsing.

```bash
devonthink search invoice --json
devonthink get_record_properties <uuid> --json
```

## Positional Arguments

Many tools support the first obvious required argument positionally.

```bash
devonthink search invoice
devonthink get_record_content <uuid>
devonthink get_record_properties <uuid>
devonthink rename_record <uuid> --new-name "Renamed note"
devonthink create_record "New Note" --type markdown --content "Hello"
devonthink create_from_url https://example.com --format markdown
```

## Common Tasks

Use these as canonical examples:

```bash
# verify DEVONthink is running
devonthink is_running

# list open databases
devonthink get_open_databases

# inspect the current database
devonthink current_database

# search for records
devonthink search invoice --database-name Test

# get a record by UUID
devonthink get_record_properties <uuid>

# read record content
devonthink get_record_content <uuid>

# create a note
devonthink create_record "Meeting Notes" --type markdown --content "# Notes" --database-name Test

# update content
devonthink update_record_content <uuid> --content "Updated body"

# rename a record
devonthink rename_record <uuid> --new-name "Renamed note"

# add tags
devonthink add_tags <uuid> --tags work --tags important

# remove tags
devonthink remove_tags <uuid> --tags old-tag
```

## Safety Checks

Before write operations:

1. Confirm the target database with `current_database` or `get_open_databases`.
2. Confirm the target record with `get_record_properties`, `get_record_by_identifier`, `search`, or `lookup_record`.
3. Confirm the destination group before `move_record`, `duplicate_record`, `replicate_record`, or `convert_record`.
4. Prefer UUIDs over names when mutating records.

## Notes

- `devonthink`, `dt`, and `dt-cli` are equivalent and map to the same implementation.
- `schema <tool>` prints the exact JSON schema for a tool.
- `tools` lists the available command surface.
