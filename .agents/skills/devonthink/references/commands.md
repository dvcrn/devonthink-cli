# DEVONthink CLI Commands

Discover the live command surface with:

```bash
devonthink tools
devonthink schema <tool>
```

Common top-level commands:

```text
tools
schema <tool>
is_running
get_open_databases
current_database
selected_records
search [query]
lookup_record [lookupType]
list_group_content [uuid]
get_record_properties [uuid]
get_record_content [uuid]
get_record_by_identifier [uuid]
create_record [name]
create_from_url [url]
rename_record [uuid]
move_record [uuid]
delete_record [uuid]
add_tags [uuid]
remove_tags [uuid]
update_record_content [uuid]
set_record_properties [uuid]
classify [recordUuid]
compare [recordUuid]
replicate_record [uuid]
duplicate_record [uuid]
convert_record [uuid]
check_ai_health
ask_ai_about_documents [question]
create_summary_document
get_ai_tool_documentation [toolName]
```

Global flags:

```text
--json
--help
--version
```

Notes:

- Many tools support the first obvious required argument positionally.
- For exact parameter names and validation rules, use `devonthink schema <tool>`.
- Use `--json` when the output will be parsed by another tool or script.
