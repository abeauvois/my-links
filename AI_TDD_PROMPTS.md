# AI TDD Prompts

## Overview

This document provides ready-to-use prompts for working with AI assistants (Cline, GitHub Copilot, ChatGPT, etc.) on this project using Test-Driven Development (TDD) principles.

## Table of Contents

- [General TDD Prompts](#general-tdd-prompts)
- [Layer-Specific Prompts](#layer-specific-prompts)
- [Common Scenarios](#common-scenarios)
- [Debugging & Refactoring](#debugging--refactoring)
- [Code Review](#code-review)

## General TDD Prompts

### Starting a New Feature

```
I need to add [FEATURE NAME] using TDD approach.

Context:
- Project: Email Links Monorepo (Hexagonal Architecture)
- Runtime: Bun (not Node.js)
- Layer: [domain/application/infrastructure]

Requirements:
1. Write failing tests first that define expected behavior
2. Implement minimal code to make tests pass
3. Refactor to improve code quality

Please start by writing the tests. Follow our conventions in TDD.md and .clinerules.
```

### Adding a New Port (Interface)

```
I need to create a new port (interface) for [FUNCTIONALITY] in the domain layer.

Requirements:
1. Define the interface in src/domain/ports/[IPortName].ts
2. Write tests that mock this interface
3. Create an adapter implementation in src/infrastructure/adapters/
4. Write tests for the adapter using TDD

The interface should support:
- [List key operations]

Follow our hexagonal architecture rules - domain should never depend on infrastructure.
```

### Creating a New Use Case

```
I need to implement a new use case: [USE CASE NAME]

Context:
- Input: [describe input]
- Output: [describe output]
- Business logic: [describe what it should do]

Approach using TDD:
1. Write tests in src/infrastructure/tests/unit/
2. Mock external dependencies (ports)
3. Implement in src/application/[UseCaseName].ts
4. Ensure all tests pass

Follow the patterns in our existing use cases and TDD.md guide.
```

## Layer-Specific Prompts

### Domain Layer

#### Adding a Domain Entity

```
I need to create a new domain entity: [EntityName]

Properties:
- [property1]: [type] - [description]
- [property2]: [type] - [description]

Validation rules:
- [rule 1]
- [rule 2]

Using TDD:
1. Write tests first in src/domain/entities/[EntityName].test.ts
2. Test constructor validation
3. Test business logic methods
4. Implement the entity in src/domain/entities/[EntityName].ts

Remember: Domain entities should have NO external dependencies.
```

#### Enhancing Existing Entity

```
I need to add [FEATURE] to the [EntityName] entity.

Current behavior:
[Describe current behavior]

New behavior needed:
[Describe new behavior]

TDD Approach:
1. First, write tests for the new behavior
2. Ensure existing tests still pass
3. Implement the new feature
4. Refactor if needed while keeping tests green

File location: src/domain/entities/[EntityName].ts
```

### Application Layer

#### Creating a Service

```
I need to create a new service: [ServiceName]

Purpose: [What this service does]

Dependencies (ports it needs):
- [IPort1]: [purpose]
- [IPort2]: [purpose]

Operations:
- [method1(params)]: [what it does]
- [method2(params)]: [what it does]

TDD Steps:
1. Write tests in src/infrastructure/tests/unit/test-[service-name].ts
2. Mock the port dependencies
3. Implement in src/application/services/[ServiceName].ts
4. Use constructor injection for all dependencies

Follow dependency injection patterns in our existing services.
```

#### Orchestrating Multiple Services

```
I need to create an orchestrator that coordinates: [list services]

Workflow:
1. [Step 1]
2. [Step 2]
3. [Step 3]

Error handling:
- [How to handle errors in step X]

TDD Approach:
1. Write integration-style tests with mocked services
2. Test each step of the workflow
3. Test error scenarios
4. Implement the orchestrator

Location: src/application/[OrchestratorName].ts
```

### Infrastructure Layer

#### Creating an Adapter

```
I need to create an adapter for [EXTERNAL SERVICE/API].

Port to implement: [IPortName]

External dependency:
- Library: [library name]
- API: [API details]

TDD Strategy:
1. Write unit tests for the adapter logic in src/infrastructure/tests/unit/
2. Mock the external API calls
3. Implement the adapter in src/infrastructure/adapters/[AdapterName].ts
4. Create integration tests in src/infrastructure/tests/integration/ (requires credentials)

The adapter should implement: src/domain/ports/[IPortName].ts
```

#### Creating a Repository

```
I need to create a repository for [DATA SOURCE].

Repository interface: [IRepositoryName]

Operations needed:
- save(entity): Promise<void>
- findById(id): Promise<Entity | null>
- findAll(): Promise<Entity[]>
- [other operations]

Data storage: [CSV/Notion/Database/etc.]

TDD Approach:
1. Define interface in src/domain/ports/[IRepositoryName].ts
2. Write tests in src/infrastructure/tests/unit/test-[repo-name].ts
3. Test with real file I/O (not mocked)
4. Implement in src/infrastructure/repositories/[RepositoryName].ts
5. Ensure proper cleanup in tests

Use existing repositories as reference (CsvLinkRepository, NotionLinkRepository).
```

## Common Scenarios

### Scenario: Adding Twitter Link Enrichment

```
I need to add Twitter/X link enrichment to extract metadata from tweets.

Current flow:
- Links are extracted from emails
- Links are analyzed with AI

New requirement:
- Detect Twitter/X links
- Enrich with tweet metadata (author, text, etc.)
- Handle rate limiting

TDD Approach:
1. Create ITwitterScraper port in src/domain/ports/
2. Write tests for TwitterScraper adapter
3. Implement TwitterScraper in src/infrastructure/adapters/
4. Add integration tests in src/infrastructure/tests/integration/twitter/
5. Wire it into the workflow

Follow existing TwitterScraper patterns in the codebase.
```

### Scenario: Implementing Deduplication

```
I need to implement link deduplication based on URL.

Requirements:
- Remove duplicate URLs
- Keep the first occurrence
- Normalize URLs (trailing slashes, query params)

TDD Steps:
1. Write tests in src/infrastructure/tests/unit/test-deduplication.ts
   - Test exact duplicates
   - Test URL normalization
   - Test edge cases (empty array, no duplicates)
2. Implement DeduplicationStage in src/infrastructure/workflow/stages/
3. Test with the workflow pipeline

Reference: Workflow pattern in src/domain/workflow/
```

### Scenario: Adding CSV Export

```
I need to add CSV export functionality for links.

Format:
- Columns: [url, tag, description, sourceFile]
- Headers: [yes/no]
- Encoding: UTF-8

TDD Approach:
1. Create ICsvWriter port in src/domain/ports/
2. Write tests in src/infrastructure/tests/unit/test-csv-repository.ts
   - Test save single link
   - Test save multiple links
   - Test CSV escaping (commas, quotes, newlines)
   - Test persistence across instances
3. Implement CsvLinkRepository in src/infrastructure/repositories/
4. Test with real file I/O

Handle special characters properly (CSV escaping).
```

### Scenario: Adding Notion Integration

```
I need to integrate with Notion API to save links as database entries.

Notion Setup:
- Database ID: [provided in .env]
- API Key: [provided in .env]
- Properties: Title (url), Tag, Description, Source

TDD Approach:
1. Create ILinkRepository port (if not exists)
2. Write tests in src/infrastructure/tests/integration/notion/
   - Test create page
   - Test find by URL
   - Test update existing page
3. Implement NotionLinkRepository in src/infrastructure/repositories/
4. Handle API rate limiting
5. Skip tests gracefully if credentials not provided

Use @notionhq/client library. Follow existing NotionLinkRepository patterns.
```

## Debugging & Refactoring

### Debugging Failing Test

```
I have a failing test: [test name]

Error message: [paste error]

Test code:
[paste test code]

Please help me:
1. Understand why the test is failing
2. Determine if it's a test issue or implementation issue
3. Fix the root cause
4. Ensure all other tests still pass

Context: [provide any relevant context]
```

### Refactoring with TDD

```
I need to refactor [COMPONENT NAME] to improve [what you want to improve].

Current implementation:
[paste current code or describe it]

Issues:
- [list issues]

Desired improvements:
- [list improvements]

TDD Refactoring Process:
1. First, ensure comprehensive tests exist for current behavior
2. If tests are missing, write them first
3. Refactor the code while keeping tests green
4. Add new tests for edge cases discovered during refactoring

Do not change behavior without explicit instruction.
```

### Adding Tests to Legacy Code

```
I have existing code without tests: [component name]

Code location: [file path]

Please help me:
1. Analyze the existing behavior
2. Write comprehensive tests that cover current functionality
3. Test happy path and error cases
4. Ensure tests pass with existing implementation

Then I can safely refactor with confidence.
```

### Fixing a Bug with TDD

```
I found a bug: [describe the bug]

Expected behavior: [what should happen]
Actual behavior: [what actually happens]

Steps to reproduce:
1. [step 1]
2. [step 2]

TDD Fix Process:
1. Write a failing test that reproduces the bug
2. The test should define the expected behavior
3. Fix the implementation to make the test pass
4. Ensure all other tests still pass
5. Consider if there are related edge cases to test

Location: [file path if known]
```

## Code Review

### Review for TDD Compliance

```
Please review this code for TDD compliance:

[paste code]

Check:
1. Are there corresponding tests?
2. Do tests follow TDD patterns (Arrange-Act-Assert)?
3. Are edge cases covered?
4. Is the code testable (proper dependency injection)?
5. Are there any layer boundary violations?

Refer to:
- TDD.md for TDD patterns
- .clinerules for architecture rules
- TESTING_GUIDE.md for testing standards
```

### Review PR for Testing

```
I'm about to submit a PR with these changes:

Files changed:
- [list files]

New features:
- [list features]

Please review:
1. Do all new features have tests written first (TDD)?
2. Do tests cover success cases, error cases, and edge cases?
3. Are tests well-organized and named?
4. Is test coverage adequate?
5. Are there any missing test scenarios?

Our testing standards are in TESTING_GUIDE.md
```

## Template: Custom Feature

Copy and customize this template for your specific needs:

```
I need to implement [FEATURE NAME]

Context:
- Architecture layer: [domain/application/infrastructure]
- Related components: [list related files/components]
- Dependencies: [list dependencies/ports needed]

Requirements:
[Describe what the feature should do]

Inputs:
- [input 1]: [type and description]
- [input 2]: [type and description]

Outputs:
- [output 1]: [type and description]

Business rules:
- [rule 1]
- [rule 2]

Error handling:
- [error scenario 1]: [how to handle]
- [error scenario 2]: [how to handle]

TDD Approach:
1. Write failing tests that define expected behavior
2. Test success cases
3. Test error cases
4. Test edge cases
5. Implement minimal code to pass tests
6. Refactor while keeping tests green

Please follow:
- Hexagonal architecture principles (.clinerules)
- TDD methodology (TDD.md)
- Testing patterns (TESTING_GUIDE.md)
- Existing code patterns in the project

Start by writing the tests.
```

## Tips for Working with AI

### Be Specific

❌ **Vague**: "Add a feature to handle links"
✅ **Clear**: "Add a feature to deduplicate links by URL, keeping the first occurrence, testing with TDD approach"

### Provide Context

Always include:

- Which architecture layer
- What dependencies/ports are involved
- What the inputs and outputs are
- Any specific constraints (Bun vs Node.js, no external dependencies for domain, etc.)

### Iterate with TDD Cycle

```
Prompt 1: "Write tests for [feature]"
[Review tests]

Prompt 2: "Good, now implement minimal code to make tests pass"
[Review implementation]

Prompt 3: "Tests pass. Now refactor to improve [specific aspect]"
[Review refactored code]
```

### Reference Project Docs

Always mention:

- "Follow our TDD patterns in TDD.md"
- "Respect architecture boundaries in .clinerules"
- "Use testing patterns from TESTING_GUIDE.md"
- "See ARCHITECTURE_TESTING.md for layer-specific testing"

### Ask for Explanations

```
"Please explain:
- Why you chose this testing approach
- How this respects hexagonal architecture
- What edge cases are covered
- How error handling works"
```

## Quick Reference

| Need        | Prompt Template                                                               |
| ----------- | ----------------------------------------------------------------------------- |
| New feature | "Add [feature] with TDD: tests first, then implement, then refactor"          |
| New port    | "Create [IPortName] interface in domain and adapter in infrastructure"        |
| Bug fix     | "Write failing test for [bug], then fix implementation"                       |
| Refactor    | "Ensure tests exist for [component], then refactor while keeping tests green" |
| Code review | "Review [code] for TDD compliance and architecture violations"                |

---

**Remember**: Good prompts lead to good AI assistance. Be specific, provide context, and emphasize TDD approach.
