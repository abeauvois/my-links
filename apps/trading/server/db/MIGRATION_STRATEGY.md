# Migration Strategy: Shared User Table

## Problem

The trading app was creating its own `user`, `session`, `account`, and `verification` tables, duplicating the authentication infrastructure already present in the platform app (`apps/web`). This violated the monorepo principle of having a single source of truth for shared data.

## Solutions Explored

### ❌ Attempt 1: Shared Database Package

**Idea**: Create `packages/platform-db` with shared schema, import from both apps

```typescript
// packages/platform-db/src/schema.ts
export const user = pgTable('user', { ... });

// apps/trading/server/db/schema.ts
export { user } from '@platform/db';
```

**Result**: **FAILED** ❌

**Why**: Drizzle's migration generation process (`drizzle-kit generate`) runs outside the TypeScript compilation context and cannot resolve workspace package imports. This is a fundamental limitation of how Drizzle's CLI tool analyzes schemas.

### ❌ Attempt 2: Direct Cross-App Imports

**Idea**: Import user schema directly from platform app

```typescript
export { user } from "../../../web/server/db/schema.js";
```

**Result**: **FAILED** ❌

**Why**: Same issue - Drizzle cannot resolve relative imports across app boundaries during migration generation.

### ✅ Final Solution: Schema Definition + Manual Migration Editing

**Approach**: Keep user table in schema for TypeScript types, but manually remove from migrations

## Implementation

### 1. Schema File (`apps/trading/server/db/schema.ts`)

```typescript
// User table reference - DO NOT MIGRATE
// This table is managed by apps/web and must already exist
// The definition here is only for TypeScript types and FK references
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  // ... matches apps/web/server/db/schema.ts exactly
});

// Trading app tables - WILL BE MIGRATED
export const todos = pgTable("todos", {
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  // ...
});
```

### 2. Migration Workflow

```bash
# 1. Generate migration
cd apps/trading
bun run drizzle-kit generate

# 2. MANUALLY edit migration files:
#    - Remove CREATE TABLE "user" from .sql file
#    - Remove "public.user" from meta/*.json file

# 3. Apply migration
bun run drizzle-kit migrate
```

### 3. What Gets Edited

**Before** (generated):

```sql
CREATE TABLE "user" ( ... );  -- ❌ Remove this
CREATE TABLE "todos" ( ... ); -- ✅ Keep this
ALTER TABLE "todos" ADD CONSTRAINT ... REFERENCES "user" ...; -- ✅ Keep this
```

**After** (manual edit):

```sql
-- Trading app specific tables only
-- The 'user' table is managed by the platform

CREATE TABLE "todos" ( ... ); -- ✅ Kept
ALTER TABLE "todos" ADD CONSTRAINT ... REFERENCES "user" ...; -- ✅ Kept
```

## Why This Works

### Advantages ✅

1. **Full TypeScript support** - Types, autocomplete, validation all work
2. **Foreign key validation** - Schema enforces referential integrity
3. **No runtime dependencies** - Apps don't need to import from each other
4. **Clear ownership** - Comments document which app owns which tables
5. **Works with Drizzle** - No fighting against tool limitations

### Trade-offs ⚠️

1. **Manual step required** - After each `drizzle-kit generate`, must manually edit
2. **Schema duplication** - User table definition exists in multiple places
3. **Sync responsibility** - Developer must ensure user table definitions match

## Alternative: Prisma?

**Q**: Would Prisma 7 solve this differently?

**A**: No. Prisma has the same fundamental limitation:

- Uses `.prisma` DSL files (not TypeScript)
- Supports multi-file schemas with `import`
- **BUT**: Still generates migrations for ALL imported tables together
- No "reference-only" mode exists in either ORM

The manual migration editing approach would be needed with Prisma too.

## Best Practices

### When Adding/Changing Shared Tables

1. Make changes in `apps/web/server/db/schema.ts` (source of truth)
2. Copy changes to `apps/trading/server/db/schema.ts`
3. Run platform migrations first: `cd apps/web && bun run db:migrate`
4. Then run trading migrations: `cd apps/trading && bun run db:migrate`

### Verification Checklist

Before deploying:

- [ ] Platform app migrations run first (creates user table)
- [ ] Both apps use same DATABASE_URL
- [ ] Trading migration only creates app-specific tables
- [ ] Foreign key constraint references existing user table
- [ ] User table definitions match across apps
- [ ] Schema compiles without errors

## Future Considerations

If this pattern repeats across many apps:

1. **Document the process** - Make it a standard workflow
2. **Create validation script** - Check that user definitions match
3. **Automation** - Script to auto-edit migrations after generation
4. **Reconsider architecture** - Maybe separate auth service with API?

## Conclusion

While a shared database package (`@platform/db`) seems ideal, Drizzle's tooling limitations make it impractical. The manual migration editing approach is:

- ✅ **Simple** - Easy to understand and execute
- ✅ **Reliable** - No tool fighting, predictable behavior
- ✅ **Well-documented** - Clear process and reasoning
- ⚠️ **Manual** - Requires discipline but manageable

This is the pragmatic solution until ORMs support "reference-only" table definitions.
