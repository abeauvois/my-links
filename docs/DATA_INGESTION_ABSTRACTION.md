# Data Ingestion Abstraction

## Overview

This document describes the OOP-based data ingestion abstraction layer that allows the system to ingest data from multiple sources (Gmail, zip files, Twitter, etc.) in a unified way.

## Architecture

The abstraction uses **Object-Oriented Programming** principles with:

- **Inheritance**: Hierarchical class structure
- **Abstraction**: Abstract base classes define contracts
- **Polymorphism**: Any data source can be used interchangeably
- **Encapsulation**: Each source encapsulates its specific logic

### Class Hierarchy

```
AbstractDataSource<TRaw, TNormalized>
├── StructuredDataSource<TRaw, TNormalized>
│   ├── GmailDataSource
│   ├── TwitterDataSource (future)
│   └── NotionDataSource (future)
└── UnstructuredDataSource<TRaw, TNormalized>
    ├── ZipFileDataSource
    ├── DirectoryDataSource (future)
    └── SingleFileDataSource (future)
```

## Core Components

### 1. AbstractDataSource

**Location**: `src/domain/entities/AbstractDataSource.ts`

The base class for all data sources. Implements the **Template Method Pattern**:

```typescript
abstract class AbstractDataSource<TRaw, TNormalized extends BaseContent> {
  // Template method - defines the workflow
  async ingest(config: IngestionConfig): Promise<TNormalized[]> {
    await this.validateConfig(config);
    const rawData = await this.fetchRaw(config);
    const normalized = await this.normalize(rawData);
    return await this.enrich(normalized);
  }

  // Abstract methods - subclasses must implement
  protected abstract validateConfig(config: IngestionConfig): Promise<void>;
  protected abstract fetchRaw(config: IngestionConfig): Promise<TRaw[]>;
  protected abstract normalize(raw: TRaw[]): Promise<TNormalized[]>;

  // Hook method - optional override
  protected async enrich(items: TNormalized[]): Promise<TNormalized[]> {
    return items;
  }
}
```

**Responsibilities**:

- Define ingestion workflow (validate → fetch → normalize → enrich)
- Provide logging and error handling
- Enforce consistent behavior across all sources

### 2. StructuredDataSource

**Location**: `src/domain/entities/StructuredDataSource.ts`

Base class for API-based data sources (Gmail, Twitter, Notion, etc.).

**Characteristics**:

- Requires authentication credentials
- Works with structured API responses
- Supports filtering and querying
- Handles pagination (future)

**Configuration**: Uses `ApiIngestionConfig`

```typescript
interface ApiIngestionConfig extends IngestionConfig {
  credentials: Record<string, string>; // API credentials
  filters?: Record<string, any>; // Query filters
}
```

### 3. UnstructuredDataSource

**Location**: `src/domain/entities/UnstructuredDataSource.ts`

Base class for file-based data sources (zip files, directories, PDFs, etc.).

**Characteristics**:

- Works with file system paths
- Requires parsing and extraction
- May process multiple files
- Supports recursive scanning

**Configuration**: Uses `FileIngestionConfig`

```typescript
interface FileIngestionConfig extends IngestionConfig {
  path: string; // File or directory path
  recursive?: boolean; // Recursive processing
  filePattern?: string; // File filter (e.g., "*.eml")
}
```

## Concrete Implementations

### GmailDataSource

**Location**: `src/infrastructure/adapters/GmailDataSource.ts`

Fetches Gmail messages and normalizes them to `BaseContent`.

**Usage**:

```typescript
const dataSource = new GmailDataSource(
  gmailClient,
  timestampRepository,
  logger
);

const config: ApiIngestionConfig = {
  credentials: {
    clientId: "xxx",
    clientSecret: "xxx",
    refreshToken: "xxx",
  },
  since: new Date("2025-01-01"),
  filters: {
    email: "sender@example.com",
  },
};

const content = await dataSource.ingest(config);
```

**Features**:

- Validates Gmail credentials (clientId, clientSecret, refreshToken)
- Uses timestamp repository for incremental fetches
- Supports email sender filtering
- Normalizes GmailMessage → BaseContent

### ZipFileDataSource

**Location**: `src/infrastructure/adapters/ZipFileDataSource.ts`

Extracts email files from zip archives and normalizes them.

**Usage**:

```typescript
const dataSource = new ZipFileDataSource(zipExtractor, logger);

const config: FileIngestionConfig = {
  path: "/path/to/emails.zip",
};

const content = await dataSource.ingest(config);
```

**Features**:

- Validates file path exists
- Extracts all files from zip
- Normalizes EmailFile → BaseContent
- Preserves original content

## Configuration Objects

### Base Configuration

```typescript
interface IngestionConfig {
  since?: Date; // Fetch data since this date
  limit?: number; // Max items to fetch
}
```

### API Configuration

```typescript
interface ApiIngestionConfig extends IngestionConfig {
  credentials: Record<string, string>;
  filters?: Record<string, any>;
}
```

### File Configuration

```typescript
interface FileIngestionConfig extends IngestionConfig {
  path: string;
  recursive?: boolean;
  filePattern?: string;
}
```

## Design Patterns Used

### 1. Template Method Pattern

The `ingest()` method in `AbstractDataSource` defines the algorithm skeleton:

```
ingest() {
    1. validateConfig()  ← Subclass implements
    2. fetchRaw()        ← Subclass implements
    3. normalize()       ← Subclass implements
    4. enrich()          ← Optional override
}
```

### 2. Strategy Pattern

Different data sources implement different strategies for fetching and normalizing data, but can be used interchangeably.

### 3. Factory Pattern (Future)

`DataSourceFactory` will create appropriate data sources:

```typescript
class DataSourceFactory {
    create(type: SourceAdapter, deps: Dependencies): AbstractDataSource {
        switch(type) {
            case SourceAdapter.Gmail:
                return new GmailDataSource(...);
            case SourceAdapter.ZipFile:
                return new ZipFileDataSource(...);
            // ...
        }
    }
}
```

## Benefits

### 1. Extensibility

Add new data sources by extending `StructuredDataSource` or `UnstructuredDataSource`:

```typescript
class TwitterDataSource extends StructuredDataSource<Tweet, BaseContent> {
  protected async fetchRaw(config: IngestionConfig): Promise<Tweet[]> {
    // Fetch tweets from Twitter API
  }

  protected async normalize(tweets: Tweet[]): Promise<BaseContent[]> {
    // Convert tweets to BaseContent
  }
}
```

### 2. Testability

Each layer can be tested independently:

- **Unit tests**: Test each data source with mocks
- **Integration tests**: Test with real APIs/files
- **E2E tests**: Test complete workflows

### 3. Consistency

All data sources follow the same workflow:

- Same configuration structure
- Same validation approach
- Same logging format
- Same error handling

### 4. Reusability

Data sources can be reused across different workflows:

- Bookmark extraction workflow
- Analytics workflow
- Export workflow
- Any custom workflow

### 5. Maintainability

Clear separation of concerns:

- Domain layer: Abstract classes and interfaces
- Infrastructure layer: Concrete implementations
- Application layer: Orchestration and use cases

## Integration with Existing Workflow System

The data ingestion abstraction integrates seamlessly with the existing workflow framework:

```typescript
// 1. Create data source
const dataSource = new GmailDataSource(...);

// 2. Create producer from data source
const producer = new GenericDataSourceProducer(dataSource, config);

// 3. Create pipeline (same as before)
const pipeline = new Pipeline()
    .addStage(new ContentAnalyserStage(...))
    .addStage(new DeduplicationStage(...));

// 4. Create consumer
const consumer = new BookmarkCollector(...);

// 5. Execute workflow
const workflow = new WorkflowExecutor(producer, pipeline, consumer);
await workflow.execute();
```

## Future Enhancements

### 1. Additional Data Sources

- **TwitterDataSource**: Fetch tweets and threads
- **NotionDataSource**: Read from Notion databases
- **RSSDataSource**: Parse RSS/Atom feeds
- **SlackDataSource**: Extract messages from Slack
- **DiscordDataSource**: Extract messages from Discord

### 2. Advanced Features

- **Pagination**: Automatic pagination for large datasets
- **Rate Limiting**: Built-in rate limit handling
- **Caching**: Cache fetched data to reduce API calls
- **Batching**: Process data in configurable batches
- **Parallel Processing**: Fetch from multiple sources concurrently
- **Retry Logic**: Automatic retry with exponential backoff

### 3. Configuration Enhancements

- **YAML/JSON Config**: Load configurations from files
- **Environment Variables**: Override config with env vars
- **Validation Schema**: JSON Schema validation for configs
- **Config Presets**: Predefined configurations for common use cases

## Testing Strategy

### Unit Tests

Test each data source in isolation with mocks:

```typescript
describe('GmailDataSource', () => {
    test('should fetch and normalize messages', async () => {
        const mockClient = new MockEmailClient();
        const dataSource = new GmailDataSource(mockClient, ...);
        const results = await dataSource.ingest(config);
        expect(results).toHaveLength(expectedCount);
    });
});
```

**Location**: `src/infrastructure/tests/unit/`

- `test-gmail-data-source.test.ts`
- `test-zipfile-data-source.test.ts`

### Integration Tests

Test with real external services (with caution):

```typescript
describe('GmailDataSource Integration', () => {
    test('should fetch real Gmail messages', async () => {
        // Use real Gmail API credentials
        const dataSource = new GmailDataSource(realGmailClient, ...);
        const results = await dataSource.ingest(config);
        expect(results.length).toBeGreaterThan(0);
    });
});
```

### E2E Tests

Test complete workflows with data sources:

```typescript
describe('End-to-End Bookmark Extraction', () => {
    test('should extract bookmarks from Gmail', async () => {
        const dataSource = new GmailDataSource(...);
        const service = new UnifiedBookmarksWorkflowService(dataSource, ...);
        const bookmarks = await service.processBookmarks(config);
        expect(bookmarks).toBeDefined();
    });
});
```

## Migration Guide

### Migrating Existing Code

**Before** (using dedicated producers):

```typescript
const producer = new GmailMessageProducer(
  gmailClient,
  timestampRepo,
  filterEmail
);
```

**After** (using data source abstraction):

```typescript
const dataSource = new GmailDataSource(gmailClient, timestampRepo, logger);

const producer = new GenericDataSourceProducer(dataSource, config);
```

## Best Practices

### 1. Configuration Management

Always validate configurations:

```typescript
protected async validateConfig(config: IngestionConfig): Promise<void> {
    if (!config.requiredField) {
        throw new Error('requiredField is missing');
    }
}
```

### 2. Error Handling

Use descriptive error messages:

```typescript
throw new Error(`${this.sourceType}: Invalid credentials`);
```

### 3. Logging

Log important steps:

```typescript
this.logger.info(`📥 Fetching data from ${this.sourceType}...`);
this.logger.info(`✅ Fetched ${items.length} items`);
```

### 4. Type Safety

Use strong typing:

```typescript
class MyDataSource extends StructuredDataSource<MyRawType, BaseContent> {
  // TypeScript ensures correct types throughout
}
```

### 5. Testing

Write tests before implementation (TDD):

1. Write failing test
2. Implement minimal code to pass
3. Refactor while keeping tests green

## Summary

The data ingestion abstraction provides a robust, extensible, and maintainable way to handle data from multiple sources. It follows OOP principles, uses proven design patterns, and integrates seamlessly with the existing hexagonal architecture and workflow system.

Key advantages:

- ✅ **Unified interface** for all data sources
- ✅ **Easy to extend** with new sources
- ✅ **Type-safe** with TypeScript
- ✅ **Well-tested** with comprehensive test coverage
- ✅ **Well-documented** with clear examples
- ✅ **Framework-agnostic** can be used in any context
