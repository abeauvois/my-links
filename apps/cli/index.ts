#!/usr/bin/env bun

import { cli } from 'cleye';
import { personalCommand } from './commands/personal.js';

/**
 * CLI Entry Point: Platform CLI
 * Unified CLI instance using Cleye's command pattern
 */

cli({
    name: 'platform-cli',
    version: '0.0.2',

    flags: {
        verbose: {
            type: Boolean,
            description: 'Enable verbose logging',
            alias: 'v',
            default: false,
        },
    },

    commands: [personalCommand],

    help: {
        description: 'Platform CLI for managing personal data',
    },
});
