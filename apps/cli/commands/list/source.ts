import { command } from 'cleye';
import { gmailCommand } from './gmail.js';

/**
 * Source command - Manage data sources for ingestion
 *
 * Usage:
 *   cli list source gmail [options]
 */
export const sourceCommand = command({
    name: 'source',
    commands: [gmailCommand],
    help: {
        description: 'Manage data sources for ingestion',
    },
});
