# Infrastructure Factories

This directory contains factory classes for creating infrastructure components like data sources.

## DataSourceFactory

The `DataSourceFactory` provides a centralized, type-safe way to create data source instances based on `SourceAdapter` types.

### Why Use the Factory?

✅ **Centralized Creation** - All data source instantiation logic in one place  
✅ **Type Safety** - Compile-time checking ensures correct source types  
✅ **Dependency Validation** - Runtime validation of required dependencies  
✅ **Easy Testing** - Simple to mock and test  
✅ **Extensibility** - Add new sources by updating one switch statement

### Basic Usage

```typescript
import { DataSourceFactory } from "./infrastructure/factories/DataSourceFactory.js";
import { SourceAdapter } from "./domain/entities/SourceAdapter.js";

// Create a Gmail data source
const gmailSource = DataSourceFactory.create("Gmail", logger, {
  emailClient: gmailClient,
  timestampRepository: timestampRepo,
});

// Create a ZipFile data source
const zipSource = DataSourceFactory.create("ZipFile", logger, {
  zipExtractor: zipExtractor,
});

// Create a Directory data source
const dirSource = DataSourceFactory.create("Directory", logger, {
  directoryReader: directoryReader,
});
```

### Dynamic Source Creation

```typescript
// Runtime source type selection
const sourceType: SourceAdapter = getUserSelectedSource(); // 'Gmail' | 'ZipFile' | 'Directory'

const dataSource = DataSourceFactory.create(
  sourceType,
  logger,
  getDependenciesForSource(sourceType)
);

// Use the data source
const results = await dataSource.ingest(config);
```

### Error Handling

The factory validates dependencies and throws descriptive errors:

```typescript
try {
  // Missing required dependency
  const source = DataSourceFactory.create("Gmail", logger, {});
} catch (error) {
  // Error: Gmail data source requires emailClient and timestampRepository
}

try {
  // Unsupported source type
  const source = DataSourceFactory.create("Outlook", logger, {});
} catch (error) {
  // Error: Unsupported source adapter: Outlook
}
```

### Supported Sources

| Source Type | Required Dependencies                | Description                                    |
| ----------- | ------------------------------------ | ---------------------------------------------- |
| `Gmail`     | `emailClient`, `timestampRepository` | Fetches messages from Gmail API                |
| `ZipFile`   | `zipExtractor`                       | Extracts and processes files from zip archives |
| `Directory` | `directoryReader`                    | Reads and processes files from directories     |

**Unsupported (will throw)**: `Outlook`, `EmlFile`, `NotionDatabase`, `Other`, `None`

### Testing Example

```typescript
import { describe, test, expect } from "bun:test";
import { DataSourceFactory } from "./DataSourceFactory.js";

describe("My Service", () => {
  test("should create correct data source", () => {
    const mockLogger = createMockLogger();
    const mockDeps = {
      zipExtractor: createMockZipExtractor(),
    };

    const dataSource = DataSourceFactory.create(
      "ZipFile",
      mockLogger,
      mockDeps
    );

    expect(dataSource.getSourceType()).toBe("ZipFile");
  });
});
```

### Extending the Factory

To add a new data source type:

1. **Update SourceAdapter type** (if needed):

```typescript
// src/domain/entities/SourceAdapter.ts
export const SOURCE_ADAPTERS = [
  "Gmail",
  "ZipFile",
  "Directory",
  "MyNewSource", // ← Add here
  // ...
] as const;
```

2. **Add dependency interface** (if needed):

```typescript
// src/infrastructure/factories/DataSourceFactory.ts
export interface DataSourceDependencies {
  emailClient?: IEmailClient;
  zipExtractor?: IZipExtractor;
  directoryReader?: IDirectoryReader;
  myNewClient?: IMyNewClient; // ← Add here
}
```

3. **Add case to switch statement**:

```typescript
static create(source: SourceAdapter, logger: ILogger, deps: DataSourceDependencies) {
  switch (source) {
    // ... existing cases ...

    case 'MyNewSource':
      return DataSourceFactory.createMyNewDataSource(logger, deps);

    // ...
  }
}
```

4. **Add private factory method**:

```typescript
private static createMyNewDataSource(
  logger: ILogger,
  dependencies: DataSourceDependencies
): MyNewDataSource {
  const { myNewClient } = dependencies;

  if (!myNewClient) {
    throw new Error('MyNewSource data source requires myNewClient');
  }

  return new MyNewDataSource(myNewClient, logger);
}
```

5. **Write tests** (following TDD):

```typescript
test("should create MyNewDataSource for MyNewSource type", () => {
  const source = DataSourceFactory.create("MyNewSource", logger, {
    myNewClient: mockClient,
  });

  expect(source).toBeInstanceOf(MyNewDataSource);
});
```

### Architecture Notes

The factory follows **hexagonal architecture** principles:

- Located in **Infrastructure layer** (correct placement)
- Creates infrastructure adapters (data sources)
- Uses dependency injection for flexibility
- Returns domain interfaces (`AbstractDataSource`)

### Related Files

- **Type Definition**: `src/domain/entities/SourceAdapter.ts`
- **Abstract Base**: `src/domain/entities/AbstractDataSource.ts`
- **Implementations**:
  - `src/infrastructure/adapters/GmailDataSource.ts`
  - `src/infrastructure/adapters/ZipFileDataSource.ts`
  - `src/infrastructure/adapters/DirectoryDataSource.ts`
- **Tests**: `src/infrastructure/tests/unit/test-data-source-factory.test.ts`

### See Also

- [SOURCE_ADAPTER_MIGRATION.md](../../../docs/SOURCE_ADAPTER_MIGRATION.md) - Details on the SourceAdapter type system
- [TDD.md](../../../TDD.md) - TDD practices used in this project
- [ARCHITECTURE_TESTING.md](../../../ARCHITECTURE_TESTING.md) - Testing hexagonal architecture
