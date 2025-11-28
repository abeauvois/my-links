import {
  pgTable,
  timestamp,
  boolean,
  uuid,
  varchar,
  text,
} from 'drizzle-orm/pg-core';

// User table reference - DO NOT MIGRATE
// This table is managed by apps/web (via packages/platform-db) and must already exist in the database
// The definition here is only for TypeScript types and foreign key references
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified')
    .$defaultFn(() => false)
    .notNull(),
  image: text('image'),
  createdAt: timestamp('created_at')
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  updatedAt: timestamp('updated_at')
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
});

// Trading app specific tables - THESE WILL BE MIGRATED
export const todos = pgTable('todos', {
  id: uuid().primaryKey().defaultRandom(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  title: varchar({ length: 500 }).notNull(),
  subtitle: varchar({ length: 500 }),
  description: varchar({ length: 1000 }),
  completed: boolean().default(false),
  createdAt: timestamp({ withTimezone: true }).defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).defaultNow(),
});
