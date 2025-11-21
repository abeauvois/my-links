import { command } from 'cleye';
import { bookmarkCommand } from './bookmark.js';

/**
 * Personal command - Personal data management
 * 
 * Sub-commands:
 *   bookmark  - Manage personal bookmarks
 * 
 * Usage:
 *   cli personal bookmark ingest -f gmail -t csv
 */
export const personalCommand = command({
    name: 'personal',
    commands: [
        bookmarkCommand
    ],
});
