# Link Repositories

This directory contains implementations of the `ILinkRepository` interface for storing and retrieving `EmailLink` entities with duplicate detection capabilities.

## Architecture

The Repository pattern provides:

- **Abstraction**: Single interface (`ILinkRepository`) for multiple storage backends
- **Testability**: In-memory implementation for unit tests
- **Flexibility**: Easy to add new storage backends (Notion, CSV, Database, etc.)

## Implementations

### InMemoryLinkRepository

A simple in-memory implementation using a Map. Ideal for:

- Unit tests
- Development and prototyping
- Short-lived processes

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

## Future Implementations

You can create additional repository implementations:

### NotionLinkRepository (Suggested)

```typescript
export class NotionLinkRepository implements ILinkRepository {
  constructor(private notionClient: Client, private databaseId: string) {}

  async exists(url: string): Promise<boolean> {
    // Use Notion API to check if page with URL exists
    const page = await this.findPageByUrl(url);
    return page !== null;
  }

  // ... implement other methods
}
```

### CsvLinkRepository (Suggested)

```typescript
export class CsvLinkRepository implements ILinkRepository {
  constructor(private filePath: string) {}

  async exists(url: string): Promise<boolean> {
    const links = await this.findAll();
    return links.some((link) => link.url === url);
  }

  // ... implement other methods
}
```

### CompositeRepository (Advanced)

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

See `src/infrastructure/tests/unit/test-deduplication.ts` for comprehensive test examples.

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

## Benefits

1. **Prevents Duplicate Exports**: Don't re-process links already in Notion/CSV
2. **Cross-Source Deduplication**: Check against multiple sources simultaneously
3. **Testable**: Easy to unit test without external dependencies
4. **Performance**: Skip unnecessary API calls and processing
5. **Auditable**: Track how many duplicates were filtered
