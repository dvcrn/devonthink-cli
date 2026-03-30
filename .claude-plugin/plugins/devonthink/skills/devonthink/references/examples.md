# DEVONthink CLI Examples

## Basic access check

```bash
devonthink is_running
devonthink current_database
```

## List databases and selected records

```bash
devonthink get_open_databases
devonthink selected_records --json
```

## Search using positional arguments

```bash
devonthink search invoice
devonthink search invoice --database-name Test --json
```

## Inspect a record

```bash
devonthink get_record_properties <uuid>
devonthink get_record_content <uuid>
```

## Create and update a note

```bash
devonthink create_record "Draft Note" --type markdown --content "# Draft"
devonthink update_record_content <uuid> --content "# Final"
```

## Organize records

```bash
devonthink move_record <uuid> --destination-group-uuid <group-uuid>
devonthink add_tags <uuid> --tags inbox --tags follow-up
devonthink remove_tags <uuid> --tags inbox
```

## AI workflows

```bash
devonthink check_ai_health
devonthink ask_ai_about_documents "Summarize these notes" --document-uuids <uuid1> --document-uuids <uuid2> --engine Gemini
devonthink create_summary_document --document-uuids <uuid1> --document-uuids <uuid2> --summary-type markdown
```
