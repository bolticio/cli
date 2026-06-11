# Changelog

## 1.0.46-dev.0.1

### Fixed
- Fixed MCP setup so `--header` values are preserved in generated MCP configuration.
- Ensured Cursor SSE-style MCP entries now save authentication headers correctly.
- Added regression coverage for header persistence in the MCP setup flow.

### Issue
- MCP setup was dropping custom header values, preventing auth headers from being written for Cursor and other MCP client configurations.
