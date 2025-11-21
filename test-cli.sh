#!/bin/bash
echo "Testing CLI command..."
bun run apps/cli/index.ts personal bookmark ingest -f gmail -t csv
echo "Exit code: $?"
