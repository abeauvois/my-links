# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Architecture

This project uses a Hexagonal Architecture (Ports and Adapters) pattern. The codebase is organized as follows:

- `src/domain`: Contains the core business logic and domain models, independent of any external frameworks or libraries.
- `src/application`: Implements the use cases and business workflows, orchestrating the domain logic.
- `src/infrastructure`: Holds the adapters for external services and tools, such as the Bun runtime, Anthropic API for AI-powered analysis, and file system interactions.
- `src/cli`: Provides the command-line interface for the application.

This architecture makes the application highly modular, testable, and easy to extend.

## Common Commands

### Development

- **Run the application**: `bun run start <zip_file> [output_csv]`
- **Run in watch mode**: `bun run dev <zip_file> [output_csv]`
- **Install dependencies**: `bun install`

### Testing

There are currently no dedicated testing scripts.

### Linting

There are currently no dedicated linting scripts.
