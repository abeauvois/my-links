/**
 * Public entrypoint for the shared domain package.
 */

// Entities
export * from './domain/entities/BaseContent'
export * from './domain/entities/Bookmark'
export * from './domain/entities/EmailFile'
export * from './domain/entities/GmailMessage'
export * from './domain/entities/SourceAdapter'

// Core ports commonly needed across apps
export * from './domain/ports/IConfigProvider'
export * from './domain/ports/ILinkRepository'
export * from './domain/ports/ILogger'

// Application Services
export * from './application/services/GetBookmarksByUserIdService'

// Workflows
export * from './application/workflows'
