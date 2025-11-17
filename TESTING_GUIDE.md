# Testing Guide

## Overview

This guide covers testing strategies, patterns, and best practices for the Email Links Monorepo project. We use **Bun's built-in test runner** and follow **Test-Driven Development (TDD)** principles.

## Table of Contents

- [Test Types](#test-types)
- [Test Organization](#test-organization)
- [Writing Tests](#writing-tests)
- [Running Tests](#running-tests)
- [Testing Patterns](#testing-patterns)
- [Mocking Strategies](#mocking-strategies)
- [Test Fixtures](#test-fixtures)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Test Types

### 1. Unit Tests

**Purpose**: Test individual components in isolation

**Location**: `src/infrastructure/tests/unit/`

**Characteristics**:

- Fast (milliseconds)
- No external dependencies
- Minimal mocking
- Test one thing at a time

**Example**:

```typescript
// src/infrastructure/tests/unit/test-csv-repository.ts

test("should save and retrieve link", async () => {
  const repo = new CsvLinkRepository("./test-output.csv");
  const link = new EmailLink("https://test.com", "Tech", "Test", "test.eml");

  await repo.save(link);
  const found = await repo.findByUrl("https://test.com");

  expect(found).toBeDefined();
  expect(found?.url).toBe("https://test.com");
});
```

**When to use**:

- Testing domain entities
- Testing service logic
- Testing utility functions
- Testing repositories with local I/O

### 2. Integration Tests

**Purpose**: Test interactions with external systems

**Location**: `src/infrastructure/tests/integration/`

**Characteristics**:

- Slower (seconds)
- Uses real external APIs
- Requires credentials
- Tests real integrations

**Example**:

```typescript
// src/infrastructure/tests/integration/notion/test-notion.ts

test("should create page in Notion", async () => {
  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey) {
    console.log("Skipping: NOTION_API_KEY not set");
    return;
  }

  const repo = new NotionLinkRepository(apiKey, databaseId);
  const link = new EmailLink("https://test.com", "Tech", "Article", "test.eml");

  await repo.save(link);
  const found = await repo.findByUrl("https://test.com");

  expect(found).toBeDefined();
});
```

**When to use**:

- Testing Notion API integration
- Testing Twitter API integration
- Testing external HTTP services
- Validating rate limiting

### 3. End-to-End (E2E) Tests

**Purpose**: Test complete workflows from start to finish

**Location**: `src/infrastructure/tests/e2e/`

**Characteristics**:

- Slowest (seconds to minutes)
- No mocking
- Uses real data fixtures
- Tests entire pipeline

**Example**:

```typescript
// src/infrastructure/tests/e2e/test-workflow-single-folder-producer.ts

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
});
```

**When to use**:

- Testing complete user workflows
- Validating pipeline execution
- Testing with real .eml files
- Regression testing

## Test Organization

### Directory Structure

```
src/infrastructure/tests/
├── unit/                           # Fast, isolated tests
│   ├── test-csv-repository.ts     # Repository tests
│   └── test-deduplication.ts      # Domain logic tests
├── integration/                    # External API tests
│   ├── notion/
│   │   ├── README.md              # Setup instructions
│   │   ├── test-notion.ts         # Notion API tests
│   │   └── test-findPageByUrl.ts
│   └── twitter/
│       ├── README.md
│       ├── test-twitter-enrichment.ts
│       └── test-rate-limit-fix.ts
└── e2e/                            # Complete workflow tests
    ├── test-workflow-zip-file-producer.ts
    └── test-workflow-single-folder-producer.ts
```

### File Naming Convention

- **Prefix**: `test-` for all test files
- **Descriptive**: `test-[component-name].ts`
- **Consistent**: Use kebab-case

```
✅ GOOD:
- test-csv-repository.ts
- test-email-extraction.ts
- test-workflow-single-folder-producer.ts

❌ AVOID:
- csvRepository.test.ts
- EmailExtraction.spec.ts
- workflow_test.ts
```

## Writing Tests

### Test Structure

```typescript
/**
 * [Test Type]: [Component Name]
 *
 * Brief description of what's being tested
 */

// ==================== SETUP ====================

const TEST_CSV_PATH = "./test-output.csv";
const testLogger = createTestLogger();

function setupTestData() {
  return [
    new EmailLink("https://example.com/1", "Tech", "Article 1", "email1.eml"),
    new EmailLink(
      "https://example.com/2",
      "Science",
      "Article 2",
      "email2.eml"
    ),
  ];
}

async function cleanupTestFiles() {
  // Cleanup logic
}

// ==================== SUCCESS CASES ====================

test("should handle valid input", async () => {
  // Arrange
  const input = setupTestData();

  // Act
  const result = await processData(input);

  // Assert
  expect(result).toBeDefined();
  expect(result.length).toBe(2);
});

// ==================== ERROR CASES ====================

test("should throw error for invalid input", async () => {
  expect(async () => {
    await processData(null);
  }).toThrow("Invalid input");
});

// ==================== EDGE CASES ====================

test("should handle empty array", async () => {
  const result = await processData([]);
  expect(result).toEqual([]);
});

// ==================== CLEANUP ====================

afterAll(async () => {
  await cleanupTestFiles();
});
```

### Arrange-Act-Assert Pattern

```typescript
test("should deduplicate links by URL", async () => {
  // Arrange (Setup)
  const links = [
    new EmailLink("https://same.com", "A", "First", "email1.eml"),
    new EmailLink("https://same.com", "B", "Second", "email2.eml"),
  ];
  const deduplicator = new DeduplicationStage();

  // Act (Execute)
  const result = await deduplicator.process(links);

  // Assert (Verify)
  expect(result.length).toBe(1);
  expect(result[0].url).toBe("https://same.com");
});
```

### Test Naming

```typescript
// ✅ GOOD: Describes behavior clearly
test("should save link to CSV file");
test("should throw error when URL is invalid");
test("should deduplicate links with same URL");
test("should handle empty input array");

// ❌ AVOID: Vague or implementation-focused
test("save works");
test("test CSV");
test("dedup function");
```

## Running Tests

### Command Reference

```bash
# Unit tests only (fast feedback loop)
bun run test:unit

# Integration tests (requires API credentials)
bun run it

# E2E tests (complete workflows)
bun run test:e2e

# Specific integration test suite
bun run it:notion
bun run it:twitter

# All tests in sequence
bun run test:unit && bun run it && bun run test:e2e
```

### During Development

```bash
# TDD workflow: Run unit tests on file changes
bun run --watch src/infrastructure/tests/unit/test-csv-repository.ts

# Quick validation: Run unit tests
bun run test:unit

# Before commit: Run all tests
bun run test:unit && bun run it && bun run test:e2e
```

### CI/CD Pipeline

```yaml
# Recommended test stages for CI
stages:
  - test:unit # Always run (fast)
  - test:integration # Run on main branch
  - test:e2e # Run before deploy
```

## Testing Patterns

### Pattern 1: Mock External Dependencies (Ports)

```typescript
// Testing application layer with mocked ports

test("should analyze link using external API", async () => {
  // Create mock implementation of ILinkAnalyzer port
  const mockAnalyzer: ILinkAnalyzer = {
    analyze: async (url: string) => ({
      tag: "Technology",
      description: "An article about AI",
    }),
  };

  const service = new LinkAnalysisService(mockAnalyzer);
  const result = await service.analyzeLink("https://example.com");

  expect(result.tag).toBe("Technology");
});
```

### Pattern 2: Use Real Implementations

```typescript
// Testing with real implementations (preferred for infrastructure)

test("should parse email and extract links", async () => {
  const extractor = new HttpLinksExtractor(); // Real implementation
  const emailContent = await readTestEmailFile("test.eml");

  const links = await extractor.extract(emailContent);

  expect(links.length).toBeGreaterThan(0);
  expect(links[0]).toMatch(/^https?:\/\//);
});
```

### Pattern 3: Test Error Handling

```typescript
test("should handle malformed email gracefully", async () => {
  const extractor = new HttpLinksExtractor();
  const malformedEmail = "This is not a valid email";

  // Should not throw, but return empty array
  const links = await extractor.extract(malformedEmail);
  expect(links).toEqual([]);
});

test("should throw error for invalid repository path", async () => {
  expect(() => {
    new CsvLinkRepository("/invalid/path/file.csv");
  }).toThrow("Invalid path");
});
```

### Pattern 4: Test Lifecycle Hooks

```typescript
let testRepo: CsvLinkRepository;
const testFilePath = "./test-temp.csv";

beforeEach(() => {
  // Setup before each test
  testRepo = new CsvLinkRepository(testFilePath);
});

afterEach(async () => {
  // Cleanup after each test
  if (existsSync(testFilePath)) {
    await unlink(testFilePath);
  }
});

test("should save link", async () => {
  const link = new EmailLink("https://test.com", "Tech", "Test", "test.eml");
  await testRepo.save(link);

  const found = await testRepo.findByUrl("https://test.com");
  expect(found).toBeDefined();
});
```

### Pattern 5: Test Async Operations

```typescript
test("should handle concurrent saves", async () => {
  const repo = new CsvLinkRepository("./test.csv");

  const promises = [
    repo.save(new EmailLink("https://a.com", "A", "A", "a.eml")),
    repo.save(new EmailLink("https://b.com", "B", "B", "b.eml")),
    repo.save(new EmailLink("https://c.com", "C", "C", "c.eml")),
  ];

  await Promise.all(promises);

  const allLinks = await repo.findAll();
  expect(allLinks.length).toBe(3);
});
```

## Mocking Strategies

### When to Mock

✅ **DO mock**:

- External APIs (in unit tests)
- Expensive operations
- Non-deterministic behavior (random, time)
- Dependencies that require credentials

❌ **DON'T mock**:

- Domain entities
- Simple utilities
- Infrastructure in E2E tests
- File I/O in repository tests

### Creating Mock Objects

```typescript
// Manual mock (simple and explicit)
const mockAnalyzer: ILinkAnalyzer = {
  analyze: async (url: string) => ({
    tag: "Test",
    description: "Mock analysis",
  }),
};

// Mock with spy functionality
let callCount = 0;
const mockLogger: ILogger = {
  info: (message: string) => {
    callCount++;
    console.log(message);
  },
  error: (message: string) => console.error(message),
  warning: (message: string) => console.warn(message),
  debug: (message: string) => console.log(message),
  await: (message: string) => ({
    start: () => {},
    update: (msg: string) => {},
    stop: () => {},
  }),
};

// After test
expect(callCount).toBeGreaterThan(0);
```

### Test Doubles

```typescript
// Dummy: Passed but never used
const dummyLogger = null;

// Stub: Returns predetermined values
const stubAnalyzer = {
  analyze: async () => ({ tag: "Stub", description: "Stub result" }),
};

// Spy: Records information about calls
class SpyAnalyzer implements ILinkAnalyzer {
  calls: string[] = [];

  async analyze(url: string) {
    this.calls.push(url);
    return { tag: "Tech", description: "Article" };
  }
}

// Mock: Pre-programmed with expectations
class MockAnalyzer implements ILinkAnalyzer {
  expectedUrl: string;

  async analyze(url: string) {
    if (url !== this.expectedUrl) {
      throw new Error(`Expected ${this.expectedUrl}, got ${url}`);
    }
    return { tag: "Tech", description: "Article" };
  }
}
```

## Test Fixtures

### File-based Fixtures

```typescript
// Location: data/fixtures/

// test_mylinks/     - Full email collection for E2E tests
// test_mylinks_2/   - Alternative email set
// test_throwing/    - Emails with error conditions

// Usage in tests:
const testFixturesPath = join(
  process.cwd(),
  "data",
  "fixtures",
  "test_mylinks"
);
const producer = new SingleFolderProducer(testFixturesPath);
```

### Creating Test Data

```typescript
// Factory functions for consistent test data
function createTestEmailLink(overrides?: Partial<EmailLink>): EmailLink {
  return new EmailLink(
    overrides?.url || "https://example.com",
    overrides?.tag || "Technology",
    overrides?.description || "Test article",
    overrides?.sourceFile || "test.eml"
  );
}

// Usage:
const link1 = createTestEmailLink();
const link2 = createTestEmailLink({ url: "https://other.com" });
```

### Fixture Management

```typescript
// Setup fixtures before tests
async function setupTestFixtures(): Promise<string> {
  const tempDir = await mkdtemp(join(tmpdir(), "email-test-"));

  // Copy test files to temp directory
  await copyTestFiles(tempDir);

  return tempDir;
}

// Cleanup after tests
async function cleanupTestFixtures(tempDir: string): Promise<void> {
  await rm(tempDir, { recursive: true, force: true });
}

// Usage:
let testDir: string;

beforeAll(async () => {
  testDir = await setupTestFixtures();
});

afterAll(async () => {
  await cleanupTestFixtures(testDir);
});
```

## Best Practices

### ✅ DO

1. **Write tests first (TDD)**

   ```typescript
   // Before implementation exists
   test("should calculate total", () => {
     expect(calculateTotal([1, 2, 3])).toBe(6);
   });
   ```

2. **Test behavior, not implementation**

   ```typescript
   // ✅ GOOD
   test("should return sorted links", () => {
     const result = sortLinks(unsortedLinks);
     expect(result[0].url).toBeLessThan(result[1].url);
   });

   // ❌ AVOID
   test("should call Array.sort", () => {
     // Testing implementation detail
   });
   ```

3. **Keep tests independent**

   ```typescript
   // Each test should setup its own data
   test("test A", () => {
     const data = setupData();
     // Test A logic
   });

   test("test B", () => {
     const data = setupData(); // Fresh data
     // Test B logic
   });
   ```

4. **Use descriptive test names**

   ```typescript
   test("should throw error when email file is empty");
   test("should deduplicate links ignoring trailing slashes");
   test("should extract Twitter links from tweet embeds");
   ```

5. **Test edge cases**
   ```typescript
   test("should handle empty array", () => {});
   test("should handle null input", () => {});
   test("should handle malformed data", () => {});
   test("should handle very long strings", () => {});
   ```

### ❌ DON'T

1. **Don't test framework code**

   ```typescript
   // ❌ AVOID: Testing Bun's file system
   test("should write to file", async () => {
     await writeFile("test.txt", "content");
     const content = await readFile("test.txt");
     expect(content).toBe("content");
   });
   ```

2. **Don't make tests depend on each other**

   ```typescript
   // ❌ AVOID
   let sharedState: any;

   test("setup data", () => {
     sharedState = createData();
   });

   test("use data", () => {
     processData(sharedState); // Depends on previous test
   });
   ```

3. **Don't test private methods directly**

   ```typescript
   // ❌ AVOID
   test("private method works", () => {
     const obj = new MyClass();
     obj["privateMethod"](); // Reaching into internals
   });

   // ✅ GOOD: Test through public interface
   test("public method uses private logic correctly", () => {
     const obj = new MyClass();
     const result = obj.publicMethod();
     expect(result).toBe(expected);
   });
   ```

4. **Don't make tests too complex**

   ```typescript
   // ❌ AVOID: Too much logic in test
   test("complex test", () => {
     const data = [];
     for (let i = 0; i < 100; i++) {
       if (i % 2 === 0) {
         data.push(createEvenItem(i));
       } else {
         data.push(createOddItem(i));
       }
     }
     // More complex logic...
   });

   // ✅ GOOD: Extract to helper function
   test("simple test", () => {
     const data = createTestDataSet(100);
     const result = process(data);
     expect(result).toBeDefined();
   });
   ```

## Troubleshooting

### Common Issues

#### Test Timeout

```typescript
// Problem: Async test not completing
test("slow operation", async () => {
  await slowOperation(); // Hangs
});

// Solution: Set timeout or investigate
test("slow operation", async () => {
  const result = await Promise.race([
    slowOperation(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timeout")), 5000)
    ),
  ]);
});
```

#### File Cleanup

```typescript
// Problem: Test files persisting
test("saves to file", async () => {
  await repo.save(link);
  // File not cleaned up
});

// Solution: Use afterEach/afterAll
afterEach(async () => {
  await cleanupTestFiles();
});
```

#### Environment Variables

```typescript
// Problem: Integration test needs credentials
test("API call", async () => {
  const api = new ApiClient(process.env.API_KEY); // undefined!
});

// Solution: Check and skip gracefully
test("API call", async () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.log("Skipping: API_KEY not set");
    return;
  }

  const api = new ApiClient(apiKey);
  // Test continues...
});
```

#### Flaky Tests

```typescript
// Problem: Test fails sometimes
test("flaky test", async () => {
  const result = await asyncOperation();
  expect(result).toBe(expected); // Sometimes fails
});

// Solution: Identify race conditions, timing issues
test("stable test", async () => {
  // Ensure operation completes
  await waitForCondition(() => operationComplete);

  const result = await asyncOperation();
  expect(result).toBe(expected);
});
```

### Debugging Tests

```typescript
// Add debug output
test("debug test", async () => {
  const data = setupData();
  console.log("Test data:", JSON.stringify(data, null, 2));

  const result = process(data);
  console.log("Result:", result);

  expect(result).toBeDefined();
});

// Run single test
bun run src/infrastructure/tests/unit/test-csv-repository.ts

// Add verbose logging
const logger = {
  info: (msg: string) => console.log("[INFO]", msg),
  error: (msg: string) => console.error("[ERROR]", msg),
};
```

## Test Coverage Guidelines

### Coverage Goals

- **Domain Layer**: > 90% (high business value)
- **Application Layer**: > 80% (critical workflows)
- **Infrastructure Layer**: > 70% (adapters)

### What to Prioritize

1. **Critical paths**: User workflows, data transformations
2. **Error handling**: Edge cases, validation
3. **Complex logic**: Algorithms, business rules
4. **Public APIs**: Exported functions, classes

### What to De-prioritize

- Trivial getters/setters
- Framework code
- Configuration files
- Type definitions

## Resources

- **TDD Guide**: See `TDD.md` for TDD methodology
- **Architecture**: See `README.md` for system overview
- **AI Prompts**: See `AI_TDD_PROMPTS.md` for AI assistance
- **Architecture Testing**: See `ARCHITECTURE_TESTING.md` for layer-specific testing

---

**Remember**: Good tests are clear, fast, reliable, and valuable. They document behavior and enable confident refactoring.
