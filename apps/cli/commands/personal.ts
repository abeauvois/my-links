import { command, cli } from 'cleye';
import { bookmarkCommand } from './bookmark.js';
import { listCommand } from './list.js';

/**
 * Personal command - Personal data management
 *
 * Sub-commands:
 *   bookmark  - Manage personal bookmarks
 *
 * Usage:
 *   cli personal bookmark list
 */
export const personalCommand = command(
    {
        name: 'personal',
        commands: [bookmarkCommand],
    },
    argv => {
        // Workaround: Cleye seems to have issues with deep nested commands matching.
        // If we land here, it means subcommands were not matched automatically.
        // We manually check for 'bookmark' subcommand and dispatch to a new CLI instance.

        if (argv._[0] === 'bookmark') {
            // If list is the next command, dispatch directly to list
            if (argv._[1] === 'list') {
                // Find where 'bookmark' is in process.argv to slice correctly
                const bookmarkIndex = process.argv.indexOf('bookmark');
                if (bookmarkIndex !== -1) {
                    const args = process.argv.slice(bookmarkIndex + 1); // ['list', ...]

                    cli(
                        {
                            commands: [listCommand],
                        },
                        undefined,
                        args
                    );
                    return;
                }
            }

            // Fallback for just 'bookmark' or other subcommands
            const personalIndex = process.argv.indexOf('personal');
            if (personalIndex !== -1) {
                const args = process.argv.slice(personalIndex + 1); // ['bookmark', ...]
                cli(
                    {
                        commands: [bookmarkCommand],
                    },
                    undefined,
                    args
                );
            }
        }
    }
);
