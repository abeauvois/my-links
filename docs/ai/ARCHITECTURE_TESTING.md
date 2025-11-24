# Architecture Testing Guide

## Overview

This guide explains how to test each layer of our **Hexagonal Architecture** (Ports and Adapters pattern) effectively. Each layer has different testing needs and strategies.

## Architecture Overview

```
┌─────────────────────────────────────┐
│  CLI (User Interface)               │  ← Entry point
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  Application (Use Cases)            │  ← Business workflows
│  - Services                          │
│  - Orchestrators                     │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  Domain (Core Business Logic)       │  ← Pure business logic
│  - Entities                          │
│  - Ports (Interfaces)                │
│  - Workflow (Pipeline abstractions) │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  Infrastructure (Adapters)          │  ← External integrations
│  - Repositories                      │
│  - External API clients              │
│  - File system operations            │
└─────────────────────────────────────┘
```

## Testing Strategy by Layer

### Domain Layer

**Characteristics**:

- Pure business logic
- No external dependencies
- No I/O operations
- Framework-agnostic

**Testing Approach**: Unit tests only, no mocking needed

**Test Location**:

- Co-located: `src/domain/entities/[Entity].test.ts` (optional)
- Centralized: `src/infrastructure/tests/unit/test-[entity].ts` (preferred)

#### Testing Domain Entities

```typescript
// src/domain/entities/EmailLink.ts
export class EmailLink {
  constructor(
    public url: string,
    public tag: string,
    public description: string,
    public sourceFile: string
  ) {
    if (!this.isValidUrl(url)) {
      throw new Error(`Invalid URL: ${url}`);
    }
  }

  private isValidUrl(url: string): boolean {
    return url.startsWith("http://") || url.startsWith("https://");
  }

  isTwitterLink(): boolean {
    return this.url.includes("twitter.com") || this.url.includes("x.com");
  }

  normalizeUrl(): string {
    return this.url.replace(/\/$/, ""); // Remove trailing slash
  }
}
```

```typescript
// Test: src/infrastructure/tests/unit/test-email-link.ts
import { EmailLink } from "../../domain/entities/EmailLink.js";
import { expect, test, describe } from "bun:test";

describe("EmailLink Entity", () => {
  describe("Constructor validation", () => {
    test("should create EmailLink with valid URL", () => {
      const link = new EmailLink(
        "https://example.com",
        "Tech",
        "Article",
        "email.eml"
      );

      expect(link.url).toBe("https://example.com");
      expect(link.tag).toBe("Tech");
    });

    test("should reject URL without protocol", () => {
      expect(() => {
        new EmailLink("example.com", "Tech", "Article", "email.eml");
      }).toThrow("Invalid URL");
    });

    test("should accept http URL", () => {
      const link = new EmailLink(
        "http://example.com",
        "Tech",
        "Article",
        "email.eml"
      );
      expect(link.url).toBe("http://example.com");
    });
  });

  describe("Business logic methods", () => {
    test("should identify Twitter links", () => {
      const twitterLink = new EmailLink(
        "https://twitter.com/user/status/123",
        "Social",
        "Tweet",
        "email.eml"
      );
      const xLink = new EmailLink(
        "https://x.com/user/status/123",
        "Social",
        "Tweet",
        "email.eml"
      );
      const regularLink = new EmailLink(
        "https://example.com",
        "Tech",
        "Article",
        "email.eml"
      );

      expect(twitterLink.isTwitterLink()).toBe(true);
      expect(xLink.isTwitterLink()).toBe(true);
      expect(regularLink.isTwitterLink()).toBe(false);
    });

    test("should normalize URL by removing trailing slash", () => {
      const link = new EmailLink(
        "https://example.com/",
        "Tech",
        "Article",
        "email.eml"
      );

      expect(link.normalizeUrl()).toBe("https://example.com");
    });
  });
});
```

**Key Points**:

- ✅ No mocking required
- ✅ Test all validation rules
- ✅ Test all business logic methods
- ✅ Fast execution (milliseconds)
- ✅ Easy to understand and maintain

#### Testing Domain Ports (Interfaces)

Ports are interfaces - you don't test them directly. Instead:

```typescript
// src/domain/ports/ILinkAnalyzer.ts
export interface ILinkAnalyzer {
  analyze(url: string): Promise<{
    tag: string;
    description: string;
  }>;
}
```

**Testing Strategy**: Test implementations (adapters) in Infrastructure layer, and mock ports when testing Application layer.

### Application Layer

**Characteristics**:

- Business workflows and use cases
- Orchestrates domain logic
- Depends only on Domain (ports)
- No direct infrastructure dependencies

**Testing Approach**: Unit tests with mocked ports

**Test Location**: `src/infrastructure/tests/unit/test-[service-name].ts`

#### Testing Application Services

```typescript
// src/application/services/LinkAnalysisService.ts
import { ILinkAnalyzer } from "../../domain/ports/ILinkAnalyzer.js";
import { EmailLink } from "../../domain/entities/EmailLink.js";

export class LinkAnalysisService {
  constructor(private readonly analyzer: ILinkAnalyzer) {}

  async analyzeLink(link: EmailLink): Promise<EmailLink> {
    const analysis = await this.analyzer.analyze(link.url);

    return new EmailLink(
      link.url,
      analysis.tag,
      analysis.description,
      link.sourceFile
    );
  }

  async analyzeMultipleLinks(links: EmailLink[]): Promise<EmailLink[]> {
    const analyzed: EmailLink[] = [];

    for (const link of links) {
      const analyzedLink = await this.analyzeLink(link);
      analyzed.push(analyzedLink);
    }

    return analyzed;
  }
}
```

```typescript
// Test: src/infrastructure/tests/unit/test-link-analysis-service.ts
import { LinkAnalysisService } from "../../application/services/LinkAnalysisService.js";
import { ILinkAnalyzer } from "../../domain/ports/ILinkAnalyzer.js";
import { EmailLink } from "../../domain/entities/EmailLink.js";
import { expect, test, describe } from "bun:test";

describe("LinkAnalysisService", () => {
  test("should analyze single link using analyzer port", async () => {
    // Mock the port
    const mockAnalyzer: ILinkAnalyzer = {
      analyze: async (url: string) => ({
        tag: "Technology",
        description: "An article about AI",
      }),
    };

    const service = new LinkAnalysisService(mockAnalyzer);
    const inputLink = new EmailLink("https://example.com", "", "", "test.eml");

    const result = await service.analyzeLink(inputLink);

    expect(result.url).toBe("https://example.com");
    expect(result.tag).toBe("Technology");
    expect(result.description).toBe("An article about AI");
  });

  test("should analyze multiple links", async () => {
    const mockAnalyzer: ILinkAnalyzer = {
      analyze: async (url: string) => ({
        tag: "Tech",
        description: `Analysis of ${url}`,
      }),
    };

    const service = new LinkAnalysisService(mockAnalyzer);
    const links = [
      new EmailLink("https://example.com/1", "", "", "email1.eml"),
      new EmailLink("https://example.com/2", "", "", "email2.eml"),
    ];

    const results = await service.analyzeMultipleLinks(links);

    expect(results.length).toBe(2);
    expect(results[0].description).toBe("Analysis of https://example.com/1");
    expect(results[1].description).toBe("Analysis of https://example.com/2");
  });

  test("should propagate errors from analyzer", async () => {
    const mockAnalyzer: ILinkAnalyzer = {
      analyze: async (url: string) => {
        throw new Error("API Error");
      },
    };

    const service = new LinkAnalysisService(mockAnalyzer);
    const link = new EmailLink("https://example.com", "", "", "test.eml");

    await expect(service.analyzeLink(link)).rejects.toThrow("API Error");
  });
});
```

**Key Points**:

- ✅ Mock external dependencies (ports)
- ✅ Test business workflow logic
- ✅ Test error propagation
- ✅ No real I/O or API calls
- ✅ Fast and reliable tests

#### Testing Orchestrators

```typescript
// src/application/LinkExtractionOrchestrator.ts (simplified)
export class LinkExtractionOrchestrator {
  constructor(
    private emailExtractor: EmailExtractionService,
    private linkAnalyzer: LinkAnalysisService,
    private exportService: ExportService
  ) {}

  async execute(source: string): Promise<void> {
    // 1. Extract links from emails
    const links = await this.emailExtractor.extractFromSource(source);

    // 2. Analyze links with AI
    const analyzedLinks = await this.linkAnalyzer.analyzeMultipleLinks(links);

    // 3. Export results
    await this.exportService.export(analyzedLinks);
  }
}
```

```typescript
// Test: Mock all services to test orchestration logic
test("should orchestrate complete workflow", async () => {
  const mockExtractor = {
    extractFromSource: async () => [
      new EmailLink("https://test.com", "", "", "test.eml"),
    ],
  };

  const mockAnalyzer = {
    analyzeMultipleLinks: async (links: EmailLink[]) =>
      links.map((l) => new EmailLink(l.url, "Tech", "Analyzed", l.sourceFile)),
  };

  const mockExporter = {
    export: async (links: EmailLink[]) => {
      // Verify export was called
    },
  };

  const orchestrator = new LinkExtractionOrchestrator(
    mockExtractor as any,
    mockAnalyzer as any,
    mockExporter as any
  );

  await orchestrator.execute("test-source");

  // Assert that workflow completed successfully
});
```

### Infrastructure Layer

**Characteristics**:

- Implements domain ports
- Interacts with external systems
- Contains adapters and repositories
- Has real I/O, API calls, file operations

**Testing Approach**:

- Unit tests for logic
- Integration tests for external APIs
- Use real implementations when possible

#### Testing Adapters (Unit Tests)

```typescript
// src/infrastructure/adapters/HttpLinksExtractor.ts
import { ILinksExtractor } from "../../domain/ports/ILinksExtractor.js";

export class HttpLinksExtractor implements ILinksExtractor {
  async extract(emailContent: string): Promise<string[]> {
    const urlRegex = /https?:\/\/[^\s<>"]+/g;
    const matches = emailContent.match(urlRegex);

    if (!matches) {
      return [];
    }

    // Filter and clean URLs
    return matches
      .filter((url) => !url.includes("unsubscribe"))
      .map((url) => url.replace(/[.,;>]+$/, "")); // Remove trailing punctuation
  }
}
```

```typescript
// Test: src/infrastructure/tests/unit/test-http-links-extractor.ts
import { HttpLinksExtractor } from "../../adapters/HttpLinksExtractor.js";
import { expect, test, describe } from "bun:test";

describe("HttpLinksExtractor", () => {
  const extractor = new HttpLinksExtractor();

  test("should extract http and https links", async () => {
    const content = `
      Check out https://example.com for more info.
      Also see http://test.com
    `;

    const links = await extractor.extract(content);

    expect(links).toContain("https://example.com");
    expect(links).toContain("http://test.com");
  });

  test("should filter out unsubscribe links", async () => {
    const content = `
      https://example.com
      https://newsletter.com/unsubscribe
    `;

    const links = await extractor.extract(content);

    expect(links).toContain("https://example.com");
    expect(links).not.toContain("https://newsletter.com/unsubscribe");
  });

  test("should remove trailing punctuation", async () => {
    const content = "Visit https://example.com. or https://test.com;";

    const links = await extractor.extract(content);

    expect(links).toContain("https://example.com");
    expect(links).toContain("https://test.com");
  });

  test("should return empty array when no links found", async () => {
    const content = "No links here";

    const links = await extractor.extract(content);

    expect(links).toEqual([]);
  });
});
```

#### Testing Repositories (Unit Tests with Real I/O)

```typescript
// Test: src/infrastructure/tests/unit/test-csv-repository.ts
import { CsvLinkRepository } from "../../repositories/CsvLinkRepository.js";
import { EmailLink } from "../../../domain/entities/EmailLink.js";
import { unlink, existsSync } from "fs";
import { expect, test, describe, afterAll } from "bun:test";

describe("CsvLinkRepository", () => {
  const TEST_FILE = "./test-links-temp.csv";

  afterAll(async () => {
    // Cleanup test file
    if (existsSync(TEST_FILE)) {
      await unlink(TEST_FILE);
    }
  });

  test("should save and retrieve link", async () => {
    const repo = new CsvLinkRepository(TEST_FILE);
    const link = new EmailLink(
      "https://test.com",
      "Tech",
      "Test Article",
      "test.eml"
    );

    await repo.save(link);
    const found = await repo.findByUrl("https://test.com");

    expect(found).toBeDefined();
    expect(found?.url).toBe("https://test.com");
    expect(found?.tag).toBe("Tech");
  });

  test("should handle CSV special characters", async () => {
    const repo = new CsvLinkRepository(TEST_FILE);
    const link = new EmailLink(
      "https://test.com",
      'Tag, with "commas"',
      "Description with\nnewlines",
      "test.eml"
    );

    await repo.save(link);
    const found = await repo.findByUrl("https://test.com");

    expect(found?.tag).toBe('Tag, with "commas"');
    expect(found?.description).toBe("Description with\nnewlines");
  });
});
```

**Key Points**:

- ✅ Use real file I/O (don't mock fs operations)
- ✅ Test with actual CSV format
- ✅ Clean up test files after tests
- ✅ Test edge cases (special characters, empty files)

#### Testing External APIs (Integration Tests)

```typescript
// Test: src/infrastructure/tests/integration/notion/test-notion.ts
import { NotionLinkRepository } from "../../../repositories/NotionLinkRepository.js";
import { EmailLink } from "../../../../domain/entities/EmailLink.js";
import { expect, test, describe, beforeAll } from "bun:test";

describe("Notion Integration", () => {
  let repo: NotionLinkRepository;

  beforeAll(() => {
    const apiKey = process.env.NOTION_API_KEY;
    const databaseId = process.env.NOTION_DATABASE_ID;

    if (!apiKey || !databaseId) {
      throw new Error("Missing Notion credentials");
    }

    repo = new NotionLinkRepository(apiKey, databaseId);
  });

  test("should create page in Notion database", async () => {
    // Skip if no credentials
    if (!process.env.NOTION_API_KEY) {
      console.log("⏭️  Skipping: NOTION_API_KEY not set");
      return;
    }

    const link = new EmailLink(
      "https://integration-test.com",
      "Integration Test",
      "Testing Notion integration",
      "test.eml"
    );

    await repo.save(link);

    // Verify it was created
    const found = await repo.findByUrl("https://integration-test.com");
    expect(found).toBeDefined();
    expect(found?.tag).toBe("Integration Test");
  });

  test("should update existing page", async () => {
    if (!process.env.NOTION_API_KEY) {
      console.log("⏭️  Skipping: NOTION_API_KEY not set");
      return;
    }

    const url = "https://update-test.com";

    // Create initial page
    await repo.save(
      new EmailLink(url, "Initial", "Initial description", "test.eml")
    );

    // Update with new data
    await repo.save(
      new EmailLink(url, "Updated", "Updated description", "test.eml")
    );

    const found = await repo.findByUrl(url);
    expect(found?.tag).toBe("Updated");
    expect(found?.description).toBe("Updated description");
  });
});
```

**Key Points**:

- ✅ Test with real API
- ⏭️ Skip gracefully if credentials missing
- ✅ Test CRUD operations
- ✅ Clean up test data if possible
- ⚠️ Slower tests (seconds)

### End-to-End Tests

**Purpose**: Test complete workflows with real data

```typescript
// Test: src/infrastructure/tests/e2e/test-workflow-single-folder-producer.ts
import { SingleFolderProducer } from "../../workflow/producers/SingleFolderProducer.js";
import { EmailParserStage } from "../../workflow/stages/EmailParserStage.js";
import { HttpLinksExtractor } from "../../adapters/HttpLinksExtractor.js";
import { EmailLinkCollector } from "../../workflow/consumers/EmailLinkCollector.js";
import { WorkflowExecutor } from "../../../domain/workflow/WorkflowExecutor.js";
import { Pipeline } from "../../../domain/workflow/Pipeline.js";
import { join } from "path";

test("should extract links from real email files end-to-end", async () => {
  // Use real fixtures
  const testFixturesPath = join(
    process.cwd(),
    "data",
    "fixtures",
    "test_mylinks"
  );

  // Real implementations (no mocking)
  const producer = new SingleFolderProducer(testFixturesPath);
  const extractor = new HttpLinksExtractor();
  const stage = new EmailParserStage(extractor);
  const pipeline = new Pipeline(stage);
  const consumer = new EmailLinkCollector(logger);

  const workflow = new WorkflowExecutor(producer, pipeline, consumer);

  // Execute complete workflow
  await workflow.execute({
    onStart: async () => {},
    onError: async () => {},
    onComplete: async (stats) => {
      expect(stats.itemsConsumed).toBeGreaterThan(0);
    },
  });

  // Verify results
  const links = consumer.getEmailLinks();
  expect(links.length).toBeGreaterThan(0);
  expect(links[0].url).toMatch(/^https?:\/\//);

  // Verify known fixtures
  const linkedInLinks = links.filter((l) => l.url.includes("linkedin.com"));
  expect(linkedInLinks.length).toBeGreaterThan(0);
});
```

**Key Points**:

- ✅ No mocking at all
- ✅ Test with real fixtures
- ✅ Verify complete workflow
- ✅ Test realistic scenarios
- ⚠️ Slowest tests

## Testing Dependency Direction

**Rule**: Tests should follow the same dependency direction as code

```
CLI → Application → Domain ← Infrastructure
                      ↑
                   Tests mock ports here
```

### ✅ Correct Dependencies

```typescript
// Application layer test
import { LinkAnalysisService } from "../../application/LinkAnalysisService.js"; // ✅
import { ILinkAnalyzer } from "../../domain/ports/ILinkAnalyzer.js"; // ✅ Mock port
import { EmailLink } from "../../domain/entities/EmailLink.js"; // ✅

// Create mock implementation of domain port
const mockAnalyzer: ILinkAnalyzer = {
  /* ... */
};
```

### ❌ Incorrect Dependencies

```typescript
// Application layer test
import { LinkAnalysisService } from "../../application/LinkAnalysisService.js";
import { AnthropicAnalyzer } from "../../infrastructure/adapters/AnthropicAnalyzer.js"; // ❌ Wrong!

// Using infrastructure class directly
const service = new LinkAnalysisService(new AnthropicAnalyzer(apiKey)); // ❌
```

## Test Organization Matrix

| Layer          | Test Type   | Mocking    | File Location               | Speed     |
| -------------- | ----------- | ---------- | --------------------------- | --------- |
| Domain         | Unit        | None       | `/tests/unit/`              | Very Fast |
| Application    | Unit        | Mock ports | `/tests/unit/`              | Fast      |
| Infrastructure | Unit        | Minimal    | `/tests/unit/`              | Fast      |
| Infrastructure | Integration | Real APIs  | `/tests/integration/[api]/` | Slow      |
| Complete       | E2E         | None       | `/tests/e2e/`               | Very Slow |

## Common Testing Patterns

### Pattern 1: Testing with Workflow Pipeline

```typescript
test("should process items through pipeline", async () => {
  const producer = new TestProducer([item1, item2]);
  const stage = new TestStage();
  const consumer = new TestConsumer();
  const workflow = new WorkflowExecutor(
    producer,
    new Pipeline(stage),
    consumer
  );

  await workflow.execute({
    onStart: async () => {},
    onError: async () => {},
    onComplete: async () => {},
  });

  const results = consumer.getResults();
  expect(results.length).toBe(2);
});
```

### Pattern 2: Testing Error Handling in Layers

```typescript
// Domain: Throw explicit errors
test("domain should validate and throw", () => {
  expect(() => new EmailLink("invalid", "tag", "desc", "file")).toThrow(
    "Invalid URL"
  );
});

// Application: Propagate errors
test("application should propagate domain errors", async () => {
  await expect(service.process("invalid-data")).rejects.toThrow();
});

// Infrastructure: Handle external errors
test("adapter should handle API errors gracefully", async () => {
  // Mock API to throw error
  const result = await adapter.callExternalApi();
  expect(result).toBeNull(); // Graceful fallback
});
```

### Pattern 3: Testing Dependency Injection

```typescript
// Application layer depends on ports
class MyService {
  constructor(
    private repository: IRepository, // Port, not implementation
    private analyzer: IAnalyzer // Port, not implementation
  ) {}
}

// Test with mocks
test("should work with any implementation", () => {
  const mockRepo: IRepository = {
    /* ... */
  };
  const mockAnalyzer: IAnalyzer = {
    /* ... */
  };

  const service = new MyService(mockRepo, mockAnalyzer);
  // Test service logic
});
```

## Best Practices Summary

### Domain Layer

- ✅ Pure unit tests, no mocking
- ✅ Test all validation rules
- ✅ Test all business logic methods
- ✅ Keep tests simple and fast

### Application Layer

- ✅ Mock all ports (interfaces)
- ✅ Test workflow orchestration
- ✅ Test error propagation
- ✅ Don't test infrastructure implementations

### Infrastructure Layer

- ✅ Unit tests for adapters (minimal mocking)
- ✅ Integration tests for external APIs
- ✅ Use real I/O for repositories
- ✅ Skip integration tests if credentials missing

### End-to-End

- ✅ No mocking
- ✅ Real fixtures
- ✅ Complete workflows
- ✅ Run less frequently (CI/CD before deploy)

## Resources

- **TDD Guide**: `TDD.md` - General TDD methodology
- **Testing Guide**: `TESTING_GUIDE.md` - Comprehensive testing patterns
- **AI Prompts**: `AI_TDD_PROMPTS.md` - AI assistance for testing
- **Architecture Rules**: `.clinerules` - Architecture boundaries

---

**Remember**: The architecture drives the testing strategy. Each layer has specific testing needs aligned with its responsibilities.
