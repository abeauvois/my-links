# Trading App Database

## Architecture

This app uses a **shared authentication** model where user authentication tables are managed centrally by `packages/platform-db`.

### Table Ownership

```
packages/platform-db (Source of Truth)
├── user
├── session
├── account
└── verification

apps/web/server/db
└── todos (references user.id)

apps/trading/server/db
└── todos (references user.id)
```

## Migration Strategy

### ✅ Current Setup

1. **Authentication Tables** (`user`, `session`, `account`, `verification`)

   - **Managed by**: `packages/platform-db`
   - **Migration location**: `packages/platform-db/migrations/`
   - **Apply with**: `cd packages/platform-db && drizzle-kit migrate`

2. **App-Specific Tables** (e.g., `todos`)
   - **Managed by**: Each app independently
   - **Migration location**: `apps/{app}/server/db/migrations/`
   - **Apply with**: `cd apps/{app} && bun run db:migrate`

### Schema Files

Apps define auth tables in their schemas for **TypeScript types only**:

```typescript
// apps/trading/server/db/schema.ts

// User table reference - DO NOT MIGRATE
// Managed by packages/platform-db
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  // ... full definition for types
});

// App-specific tables - WILL BE MIGRATED
export const todos = pgTable("todos", {
  userId: text("user_id").references(() => user.id),
  // ...
});
```

### Migration Workflow

When making changes:

1. **Auth table changes**: Edit `packages/platform-db/src/schema.ts`
2. **App table changes**: Edit `apps/{app}/server/db/schema.ts`
3. **Generate migrations**: `bun run db:generate`
4. **Manual editing required**: Remove auth tables from app migrations
5. **Apply migrations**: Platform-db first, then apps

## Deployment Order

**CRITICAL**: Always run migrations in this order:

```bash
# 1. Platform authentication tables (FIRST)
cd packages/platform-db
drizzle-kit migrate

# 2. Web app tables
cd apps/web
bun run db:migrate

# 3. Trading app tables
cd apps/trading
bun run db:migrate
```

## Why This Approach?

### Attempted Alternatives

We explored having apps import auth tables directly from `@platform/db`:

```typescript
// ❌ Doesn't work with Drizzle
export { user } from "@platform/db";
```

**Problem**: Drizzle's `drizzle-kit generate` cannot resolve workspace packages during migration generation. This is a fundamental tooling limitation.

### Current Solution Benefits

✅ **Single source of truth** - Auth tables managed centrally  
✅ **Type safety** - Full TypeScript support in all apps  
✅ **FK validation** - Foreign keys work correctly  
✅ **No duplication** - Auth tables created only once  
✅ **Clear ownership** - Documented in code comments

### Trade-offs

⚠️ **Manual step**: Must edit generated migrations to remove auth tables  
⚠️ **Schema duplication**: Auth table definitions exist in multiple files  
⚠️ **Sync responsibility**: Developer must keep definitions aligned

## Reference

See `MIGRATION_STRATEGY.md` for detailed explanation of approaches tried and lessons learned.
