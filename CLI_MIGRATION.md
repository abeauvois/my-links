# CLI Migration to Cleye

## Summary

Successfully migrated the CLI from basic `process.argv` parsing to **Cleye** - a modern, lightweight, and type-safe CLI framework.

## What Changed

### Dependencies Added

- `cleye@2.0.0` - Modern CLI framework (~4KB)

### Files Modified

1. **src/cli/index.ts** - Refactored with Cleye API
2. **package.json** - Added new convenience scripts
3. **README.md** - Updated usage documentation

## New Features

### 1. Built-in Help System

```bash
bun run cli:help
# Automatic flag documentation, examples, and formatting
```

### 2. Version Flag

```bash
bun run cli:version
# Shows: 1.0.0
```

### 3. Verbose Mode (New!)

```bash
bun run cli mylinks.zip --verbose
# or
bun run cli mylinks.zip -v
# Enables detailed logging with stack traces on errors
```

### 4. Better Type Safety

- Cleye provides full TypeScript type inference
- Parameters and flags are strongly typed
- Reduces runtime errors

### 5. Improved Developer Experience

- Cleaner, more declarative API
- Built-in validation
- Consistent error messages
- Auto-generated help documentation

## Benefits Over Previous Implementation

| Feature             | Before (process.argv)    | After (Cleye)             |
| ------------------- | ------------------------ | ------------------------- |
| **Type Safety**     | Manual parsing, no types | Full TypeScript inference |
| **Help System**     | Custom string formatting | Built-in with examples    |
| **Version Flag**    | Not supported            | Built-in                  |
| **Flag Aliases**    | Manual implementation    | Built-in (e.g., -v)       |
| **Validation**      | Manual checks            | Automatic                 |
| **Bundle Size**     | ~0 KB                    | ~4 KB (negligible)        |
| **Maintainability** | High complexity          | Low complexity            |
| **Future Features** | Hard to add              | Easy to extend            |

## Usage Examples

```bash
# Basic usage
bun run cli mylinks.zip

# Custom output
bun run cli mylinks.zip results.csv

# Verbose mode
bun run cli mylinks.zip -v

# Help
bun run cli:help

# Version
bun run cli:version
```

## Why Cleye?

1. **Modern & Lightweight**: Only 4KB, perfect for Bun runtime
2. **TypeScript-First**: Built with TypeScript, for TypeScript
3. **Minimal API**: Simple to learn and use
4. **Well-Maintained**: Active development, good documentation
5. **Perfect Fit**: Matches our hexagonal architecture philosophy

## Alternative Considered

- **Commander.js**: More popular but heavier (~8KB) and older API design
- **Clipanion**: More complex, better for multi-command CLIs
- **Ink**: Too heavy for our needs, React-based

## Migration Effort

- **Time**: ~15 minutes
- **Lines Changed**: ~40 lines
- **Breaking Changes**: None (backward compatible)
- **Tests Required**: Manual smoke testing completed ✅

## Future Possibilities

With Cleye, we can easily add:

- Multiple commands (e.g., `extract`, `analyze`, `export`)
- Interactive prompts
- Progress bars integration
- Configuration file support
- Plugins system

## Migration Date

November 16, 2025
