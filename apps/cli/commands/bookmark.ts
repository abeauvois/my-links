import { command } from 'cleye';
import { ingestCommand } from './ingest.js';

/**
 * Bookmark command - Manage personal bookmarks
 * 
 * Sub-commands:
 *   ingest  - Fetch bookmarks from various sources
 * 
 * Usage:
 *   cli personal bookmark ingest -f gmail -t csv
 */
export const bookmarkCommand = command({
    name: 'bookmark',
    commands: [
        ingestCommand
    ],
});
