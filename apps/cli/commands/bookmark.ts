import { command } from 'cleye';
import { listCommand } from './list.js';

/**
 * Bookmark command - Manage personal bookmarks
 *
 * Sub-commands:
 *   list    - List bookmarks from API
 *
 * Usage:
 *   cli personal bookmark list
 */
export const bookmarkCommand = command({
    name: 'bookmark',
    commands: [listCommand],
});
