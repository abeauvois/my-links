# Link Repositories

This directory contains implementations of the `ILinkRepository` interface for storing and retrieving `EmailLink` entities with duplicate detection capabilities.

## Architecture

The Repository pattern provides:

- **Abstraction**: Single interface (`ILinkRepository`) for multiple storage backends
- **Testability**: In-memory implementation for unit tests
- **Flexibility**: Easy to add new storage backends (Notion, CSV, Database, etc.)

## Implementations

### 1. InMemoryLinkRepository

A simple in-memory implementation using a Map. **Ideal for:**

- Unit tests
- Development and prototyping
- Short-lived processes
- Non-persistent duplicate detection

**Example:**

```typescript
import { InMemoryLinkRepository } from "./InMemoryLinkRepository.js";
import { EmailLink } from "../../domain/entities/EmailLink.js";

const repo = new InMemoryLinkRepository();

// Save a link
const link = new EmailLink(
  "https://example.com",
  "Tech",
  "A tech article",
  "email.eml"
);
await repo.save(link);

// Check for duplicates
const exists = await repo.exists("https://example.com"); // true

// Find a link
const found = await repo.findByUrl("https://example.com");

// Get all links
const allLinks = await repo.findAll();

// Clear repository (useful in tests)
await repo.clear();
```

### 2. NotionLinkRepository ✨ NEW

Stores links in a Notion database. **Ideal for:**

- Production use with Notion integration
- Persistent duplicate detection across runs
- Syncing with existing Notion databases
- Team collaboration

**Example:**

```typescript
import { NotionLinkRepository } from "./repositories/NotionLinkRepository.js";
import { EmailLink } from "../../domain/entities/EmailLink.js";

const repo = new NotionLinkRepository(
  process.env.NOTION_TOKEN!,
  process.env.NOTION_DATABASE_ID!
);

// Check if a link exists in Notion
const exists = await repo.exists("https://example.com");

// Find a specific link
const found = await repo.findByUrl("https://example.com");

// Save a new link (or update if exists)
const link = new EmailLink(
  "https://example.com",
  "Tech",
  "A tech article",
  "email.eml"
);
await repo.save(link);

// Get all links from Notion database
const allLinks = await repo.findAll();

// Note: clear() is not implemented (Notion API limitation)
```

**Features:**

- Automatically creates new pages or updates existing ones
- Uses Notion's data sources API for efficient lookups
- Extracts existing tags and descriptions
- Pagination support for large databases

### 3. CsvLinkRepository ✨ NEW

Stores links in a CSV file. **Ideal for:**

- Simple file-based persistence
- Easy inspection and editing (open in Excel/Numbers)
- Backup and version control
- Offline duplicate detection

**Example:**

```typescript
import { CsvLinkRepository } from "./repositories/CsvLinkRepository.js";
import { EmailLink } from "../../domain/entities/EmailLink.js";

const repo = new CsvLinkRepository("./my-links.csv");

// Works like other repositories
const exists = await repo.exists("https://example.com");

// Save to CSV
await repo.save(
  new EmailLink("https://example.com", "Tech", "Article", "email.eml")
);

// Read from CSV
const allLinks = await repo.findAll();

// Clear CSV file
await repo.clear();
```

**Features:**

- Proper CSV escaping (handles commas, quotes, newlines)
- In-memory caching for performance
- Automatic file creation
- Update detection (no duplicates)
- Human-readable format

**CSV Format:**

```csv
URL,Tag,Description,SourceFile
https://example.com,Tech,A tech article,email.eml
"https://example.com/article?param=1,2",Business,"Description with ""quotes""",file.eml
```

## Usage in Workflow

### Option 1: Deduplication Stage (Recommended)

Add the `DeduplicationStage` to your pipeline:

```typescript
import { SingleFolderProducer } from "../workflow/producers/SingleFolderProducer.js";
import { EmailParserStage } from "../workflow/stages/EmailParserStage.js";
import { DeduplicationStage } from "../workflow/stages/DeduplicationStage.js";
import { EmailLinkCollector } from "../workflow/consumers/EmailLinkCollector.js";
import { Pipeline } from "../../domain/workflow/Pipeline.js";
import { WorkflowExecutor } from "../../domain/workflow/WorkflowExecutor.js";
import { InMemoryLinkRepository } from "../repositories/InMemoryLinkRepository.js";

// Setup
const linksExtractor = new EmailLinksExtractor();
const logger = new CliuiLogger();
const repository = new InMemoryLinkRepository();

// Pre-populate repository with existing links (optional)
const existingLinks = await loadExistingLinksFromNotion(); // Your implementation
await repository.saveMany(existingLinks);

// Create workflow with deduplication
const producer = new SingleFolderProducer("/path/to/emails");
const parser = new EmailParserStage(linksExtractor);
const deduplicator = new DeduplicationStage(repository, logger);
const collector = new EmailLinkCollector(logger);

// Chain stages: Parser -> Deduplicator
const pipeline = new Pipeline(parser).pipe(deduplicator);

// Execute
const workflow = new WorkflowExecutor(producer, pipeline, collector);
await workflow.execute({
  onStart: async () => console.log("Starting..."),
  onComplete: async (stats) => {
    console.log(`Processed: ${stats.itemsProduced}`);
    console.log(`Unique: ${stats.itemsConsumed}`);
    console.log(`Duplicates filtered: ${deduplicator.getDuplicateCount()}`);
  },
});

// Get unique links
const uniqueLinks = collector.getEmailLinks();
```

### Option 2: Pre-filter Before Processing

Check against repository before adding to pipeline:

```typescript
const repository = new InMemoryLinkRepository();

// Load existing links from Notion/CSV
const existingLinks = await loadExistingLinks();
await repository.saveMany(existingLinks);

// Process new emails
for (const email of newEmails) {
  const links = await extractLinks(email);

  for (const link of links) {
    if (await repository.exists(link.url)) {
      console.log(`Skipping duplicate: ${link.url}`);
      continue;
    }

    // Process only unique links
    await processLink(link);
    await repository.save(link);
  }
}
```

## Advanced: CompositeRepository

Combine multiple repositories:

```typescript
export class CompositeRepository implements ILinkRepository {
  constructor(private repositories: ILinkRepository[]) {}

  async exists(url: string): Promise<boolean> {
    for (const repo of this.repositories) {
      if (await repo.exists(url)) {
        return true;
      }
    }
    return false;
  }

  // ... implement other methods
}

// Usage: Check against both Notion AND CSV
const composite = new CompositeRepository([
  new NotionLinkRepository(client, dbId),
  new CsvLinkRepository("./existing-links.csv"),
]);
```

## Testing

Comprehensive tests are available:

- **Deduplication Stage**: `src/infrastructure/tests/unit/test-deduplication.ts`
- **CSV Repository**: `src/infrastructure/tests/unit/test-csv-repository.ts`
- **Notion Repository**: Requires live Notion API credentials (see integration tests)

Key testing patterns:

```typescript
// Pre-populate repository for testing
const repo = new InMemoryLinkRepository();
await repo.save(existingLink);

// Test duplicate detection
const stage = new DeduplicationStage(repo, logger);
const results = [];
for await (const result of stage.process(newLink)) {
  results.push(result);
}

// Assert
expect(results).toHaveLength(0); // Duplicate filtered
expect(stage.getDuplicateCount()).toBe(1);
```

## Quick Start Examples

### Example 1: Deduplicate Against CSV File

```typescript
import { CsvLinkRepository } from "../repositories/CsvLinkRepository.js";
import { DeduplicationStage } from "../workflow/stages/DeduplicationStage.js";

// Load existing links from CSV
const repo = new CsvLinkRepository("./existing-links.csv");

// Create deduplication stage
const deduplicator = new DeduplicationStage(repo, logger);

// Add to your pipeline
const pipeline = new Pipeline(emailParser).pipe(deduplicator);
```

### Example 2: Deduplicate Against Notion

```typescript
import { NotionLinkRepository } from "../repositories/NotionLinkRepository.js";
import { DeduplicationStage } from "../workflow/stages/DeduplicationStage.js";

// Connect to Notion database
const repo = new NotionLinkRepository(
  process.env.NOTION_TOKEN!,
  process.env.NOTION_DATABASE_ID!
);

// Create deduplication stage
const deduplicator = new DeduplicationStage(repo, logger);

// Add to your pipeline
const pipeline = new Pipeline(emailParser).pipe(deduplicator);
```

### Example 3: Composite (Check Both CSV and Notion)

```typescript
import { CompositeRepository } from "../repositories/CompositeRepository.js";
import { CsvLinkRepository } from "../repositories/CsvLinkRepository.js";
import { NotionLinkRepository } from "../repositories/NotionLinkRepository.js";

// Combine multiple repositories
const composite = new CompositeRepository([
  new CsvLinkRepository("./backup.csv"),
  new NotionLinkRepository(notionToken, databaseId),
]);

// Will check both sources for duplicates
const deduplicator = new DeduplicationStage(composite, logger);
```

## Benefits

1. **Prevents Duplicate Exports**: Don't re-process links already in Notion/CSV
2. **Cross-Source Deduplication**: Check against multiple sources simultaneously
3. **Testable**: Easy to unit test without external dependencies
4. **Performance**: Skip unnecessary API calls and processing
5. **Auditable**: Track how many duplicates were filtered
6. **Flexible Storage**: Choose between in-memory, CSV, Notion, or custom implementations
7. **Production-Ready**: Both CSV and Notion implementations are fully tested
