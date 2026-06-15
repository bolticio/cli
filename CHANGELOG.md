# Changelog

## 1.0.47

### Fixed

- Fixed MCP setup for stdio clients such as Claude so `--header` values are passed to `mcp-remote` as command arguments instead of being written to an ignored `headers` config key.
- Preserved Cursor SSE-style MCP header persistence while keeping stdio client config compatible with `mcp-remote`.

## 1.0.46

### Fixed

- Fixed MCP setup so `--header` values are preserved in generated MCP configuration.
- Ensured Cursor SSE-style MCP entries now save authentication headers correctly.
- Added regression coverage for header persistence in the MCP setup flow.

### Issue

- MCP setup was dropping custom header values, preventing auth headers from being written for Cursor and other MCP client configurations.
