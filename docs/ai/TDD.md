# Test-Driven Development (TDD) Guide

## Overview

This project follows **Test-Driven Development (TDD)** principles with a focus on the **Red-Green-Refactor** cycle. Our hexagonal architecture makes TDD particularly effective, as domain logic is isolated and highly testable.

## TDD Cycle

```
┌──────────────────────────────────────────────┐
│  1. RED: Write a failing test               │
│     • Define expected behavior               │
│     • Test should fail for the right reason  │
└──────────────┬───────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────┐
│  2. GREEN: Make it pass (simplest way)      │
│     • Write minimal code to pass             │
│     • Don't optimize yet                     │
└──────────────┬───────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────┐
│  3. REFACTOR: Improve the code               │
│     • Clean up implementation                │
│     • Tests should still pass                │
└──────────────┬───────────────────────────────┘
               │
               └─────────► Repeat
```

## Layer-Specific TDD Approaches

### 1. Domain Layer (Pure Logic)

**Philosophy**: Domain entities and logic are the easiest to test. No dependencies, no I/O.

**Example: Adding a new domain entity**

```typescript
// 1. RED: Write the test first
// src/domain/entities/EmailLink.test.ts

test("should create EmailLink with valid URL", () => {
  const link = new EmailLink(
    "https://example.com",
    "Tech",
    "A tech article",
    "email.eml"
  );

  expect(link.url).toBe("https://example.com");
  expect(link.isValid()).toBe(true);
});

test("should reject invalid URL", () => {
  expect(() => {
    new EmailLink("not-a-url", "Tech", "Desc", "email.eml");
  }).toThrow();
});
```

```typescript
// 2. GREEN: Implement minimal code
// src/domain/entities/EmailLink.ts

export class EmailLink {
  constructor(
    public url: string,
    public tag: string,
    public description: string,
    public sourceFile: string
  ) {
    if (!this.isValidUrl(url)) {
      throw new Error("Invalid URL");
    }
  }

  isValid(): boolean {
    return this.isValidUrl(this.url);
  }

  private isValidUrl(url: string): boolean {
    return url.startsWith("http://") || url.startsWith("https://");
  }
}
```

```typescript
// 3. REFACTOR: Improve (extract validation, add URL parsing, etc.)
```

### 2. Application Layer (Use Cases)

**Philosophy**: Test business workflows. Use real domain entities but mock infrastructure ports.

**Example: Testing a use case**

```typescript
// 1. RED: Define the behavior
// src/application/services/LinkAnalysisService.test.ts

test("should analyze link and return metadata", async () => {
  // Mock the analyzer port
  const mockAnalyzer: ILinkAnalyzer = {
    analyze: async (url: string) => ({
      tag: "Technology",
      description: "An article about AI",
    }),
  };

  const service = new LinkAnalysisService(mockAnalyzer);
  const result = await service.analyzeLink("https://ai-article.com");

  expect(result.tag).toBe("Technology");
  expect(result.description).toContain("AI");
});
```

```typescript
// 2. GREEN: Implement
// src/application/services/LinkAnalysisService.ts

export class LinkAnalysisService {
  constructor(private analyzer: ILinkAnalyzer) {}

  async analyzeLink(url: string): Promise<LinkAnalysis> {
    return await this.analyzer.analyze(url);
  }
}
```

### 3. Infrastructure Layer (Adapters & Repositories)

**Philosophy**: Test real implementations with minimal mocking.

#### Unit Tests: Test isolated logic

```typescript
// Testing CSV repository with real file I/O
// src/infrastructure/tests/unit/test-csv-repository.ts

test("should save and retrieve link", async () => {
  const repo = new CsvLinkRepository("./test-output.csv");
  const link = new EmailLink("https://test.com", "Tech", "Test", "test.eml");

  await repo.save(link);
  const found = await repo.findByUrl("https://test.com");

  expect(found).toBeDefined();
  expect(found?.url).toBe("https://test.com");

  // Cleanup
  await cleanupTestFile("./test-output.csv");
});
```

#### Integration Tests: Test with real external services

```typescript
// Testing with real Notion API
// src/infrastructure/tests/integration/notion/test-notion.ts

test("should create page in Notion", async () => {
  const notionApiKey = process.env.NOTION_API_KEY;
  const databaseId = process.env.NOTION_DATABASE_ID;

  if (!notionApiKey) {
    console.log("Skipping: NOTION_API_KEY not set");
    return;
  }

  const repo = new NotionLinkRepository(notionApiKey, databaseId);
  const link = new EmailLink(
    "https://test.com",
    "Tech",
    "Test article",
    "test.eml"
  );

  await repo.save(link);
  const found = await repo.findByUrl("https://test.com");

  expect(found).toBeDefined();
});
```

#### E2E Tests: Test complete workflows

```typescript
// Testing full pipeline with real data
// src/infrastructure/tests/e2e/test-workflow.ts

test("should extract links from real email files", async () => {
  const producer = new SingleFolderProducer("./data/fixtures/test_mylinks");
  const stage = new EmailParserStage(new HttpLinksExtractor());
  const consumer = new EmailLinkCollector(logger);
  const workflow = new WorkflowExecutor(
    producer,
    new Pipeline(stage),
    consumer
  );

  await workflow.execute({
    onStart: async () => {},
    onError: async () => {},
    onComplete: async (stats) => {
      expect(stats.itemsConsumed).toBeGreaterThan(0);
    },
  });

  const links = consumer.getEmailLinks();
  expect(links.length).toBeGreaterThan(0);
  expect(links[0].url).toMatch(/^https?:\/\//);
});
```

## TDD Workflow for Common Scenarios

### Scenario 1: Adding a New Port (Interface)

```typescript
// 1. RED: Define the interface based on needs
// src/domain/ports/IEmailValidator.ts

export interface IEmailValidator {
  isValid(email: string): boolean;
  getDomain(email: string): string;
}

// Write tests for expected behavior (not implementation)
test("validator should identify valid emails", () => {
  const validator = createMockValidator();
  expect(validator.isValid("test@example.com")).toBe(true);
  expect(validator.isValid("invalid")).toBe(false);
});
```

```typescript
// 2. GREEN: Create adapter implementation
// src/infrastructure/adapters/EmailValidator.ts

export class EmailValidator implements IEmailValidator {
  isValid(email: string): boolean {
    return email.includes("@") && email.includes(".");
  }

  getDomain(email: string): string {
    return email.split("@")[1] || "";
  }
}
```

```typescript
// 3. REFACTOR: Use proper regex, handle edge cases
```

### Scenario 2: Adding a New Use Case

```typescript
// 1. RED: Write test describing the use case
test("should deduplicate links by URL", async () => {
  const useCase = new DeduplicateLinksUseCase(mockRepository);
  const links = [
    new EmailLink("https://same.com", "A", "First", "email1.eml"),
    new EmailLink("https://same.com", "B", "Second", "email2.eml"),
    new EmailLink("https://different.com", "C", "Third", "email3.eml"),
  ];

  const deduplicated = await useCase.execute(links);

  expect(deduplicated.length).toBe(2);
  expect(deduplicated.find((l) => l.url === "https://same.com")).toBeDefined();
  expect(
    deduplicated.find((l) => l.url === "https://different.com")
  ).toBeDefined();
});
```

```typescript
// 2. GREEN: Implement use case
export class DeduplicateLinksUseCase {
  async execute(links: EmailLink[]): Promise<EmailLink[]> {
    const seen = new Map<string, EmailLink>();

    for (const link of links) {
      if (!seen.has(link.url)) {
        seen.set(link.url, link);
      }
    }

    return Array.from(seen.values());
  }
}
```

### Scenario 3: Refactoring Existing Code

```typescript
// 1. RED: Write tests for current behavior FIRST
test("existing behavior should be preserved", () => {
  const result = complexFunction(input);
  expect(result).toEqual(expectedOutput);
});

// 2. GREEN: Tests should pass with existing code

// 3. REFACTOR: Improve code structure
// - Extract methods
// - Improve naming
// - Remove duplication
// Tests should still pass!

// 4. Add more specific tests for edge cases
test("should handle edge case X", () => {
  // New test for better coverage
});
```

## Testing Conventions

### File Naming

```
src/
├── domain/
│   └── entities/
│       ├── EmailLink.ts
│       └── EmailLink.test.ts              # Co-located tests (optional)
│
├── infrastructure/
    └── tests/
        ├── unit/
        │   ├── test-csv-repository.ts     # Prefix: test-
        │   └── test-deduplication.ts
        ├── integration/
        │   ├── notion/
        │   │   └── test-notion.ts
        │   └── twitter/
        │       └── test-twitter-enrichment.ts
        └── e2e/
            ├── test-workflow-zip-file-producer.ts
            └── test-workflow-single-folder-producer.ts
```

### Test Organization

```typescript
/**
 * [Test Type]: [Component Name]
 *
 * Brief description of what's being tested
 * List any special setup or requirements
 */

// Setup
const testData = setupTestData();

// Success cases
test("should do X when Y", () => {});

// Error cases
test("should throw error when invalid input", () => {});

// Edge cases
test("should handle empty array", () => {});

// Cleanup
afterAll(() => cleanupTestArtifacts());
```

### Assertion Patterns

```typescript
// ✅ GOOD: Specific assertions
expect(link.url).toBe("https://example.com");
expect(links.length).toBeGreaterThan(0);
expect(result.tag).toContain("Technology");

// ❌ AVOID: Vague assertions
expect(link).toBeTruthy();
expect(result).toBeDefined();
```

## Running Tests

```bash
# Unit tests (fast, no external dependencies)
bun run test:unit

# Integration tests (real APIs, requires credentials)
bun run it

# E2E tests (complete workflows)
bun run test:e2e

# All tests
bun run test:unit && bun run it && bun run test:e2e
```

## Best Practices

### ✅ DO

- **Write tests first** - Define behavior before implementation
- **Test one thing** - Each test should verify a single behavior
- **Use real data** - Prefer real test fixtures over generated data
- **Test error paths** - Don't just test the happy path
- **Keep tests fast** - Unit tests should run in milliseconds
- **Make tests readable** - Tests are documentation

### ❌ DON'T

- **Don't mock everything** - Use real implementations when possible (especially in domain)
- **Don't test implementation details** - Test behavior, not internals
- **Don't skip the refactor step** - Clean code is maintainable code
- **Don't write tests after** - TDD means test-first
- **Don't make tests depend on each other** - Each test should be independent

## TDD with AI Assistants (Cline, Copilot, etc.)

### Prompt Pattern for New Features

```
I need to add [FEATURE] with TDD approach.

1. First, write failing tests that define the expected behavior
2. Then implement minimal code to make tests pass
3. Finally, refactor to improve the code

Architecture context:
- Layer: [domain/application/infrastructure]
- Pattern: [port/adapter/entity/use case]
- Dependencies: [list any dependencies]

Please follow our TDD conventions in TDD.md
```

### Example AI Workflow

```
You: "I need to add email validation to the EmailLink entity using TDD"

AI: [Creates test file with failing tests]

You: "Good, now implement to make tests pass"

AI: [Implements minimal solution]

You: "Now refactor to handle edge cases"

AI: [Refactors with all tests still passing]
```

## Resources

- **Project Tests**: See `src/infrastructure/tests/` for examples
- **Architecture**: See `README.md` for hexagonal architecture overview
- **Conventions**: See `.clinerules` for project-specific rules
- **Testing Guide**: See `TESTING_GUIDE.md` for comprehensive testing info

## Quick Reference

| Layer          | Test Type   | Mocking       | File Location                |
| -------------- | ----------- | ------------- | ---------------------------- |
| Domain         | Unit        | None          | Co-located or `/tests/unit/` |
| Application    | Unit        | Ports only    | `/tests/unit/`               |
| Infrastructure | Unit        | Minimal       | `/tests/unit/`               |
| Infrastructure | Integration | External APIs | `/tests/integration/`        |
| Complete App   | E2E         | None          | `/tests/e2e/`                |

---

**Remember**: TDD is not just about testing. It's about **designing better software** through incremental development and continuous feedback.
