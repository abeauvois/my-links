#!/usr/bin/env bun

import { Client } from '@notionhq/client';
import { EnvConfig } from './src/infrastructure/config/EnvConfig.js';

async function createDatabase() {
    try {
        // Load configuration
        const config = new EnvConfig();
        await config.load();
        const notionToken = config.get('NOTION_INTEGRATION_TOKEN');

        const client = new Client({ auth: notionToken });

        console.log('📝 Creating Notion database for email links...\n');

        // Create a new database in the parent page
        // Note: You'll need to share a page with your integration first
        const response = await client.databases.create({
            parent: {
                type: 'page_id',
                page_id: '2a8097dba7cf80608e1fcd5e3607c243', // Using the parent block_id from the inspect
            },
            title: [
                {
                    type: 'text',
                    text: {
                        content: 'Email Links Database',
                    },
                },
            ],
            properties: {
                'link': {
                    title: {},
                },
                'tag': {
                    multi_select: {},
                },
                'description': {
                    rich_text: {},
                },
            },
        });

        console.log('✅ Database created successfully!');
        console.log(`Database ID: ${response.id}`);
        console.log(`\nAdd this to your .env file:`);
        console.log(`NOTION_DATABASE_ID=${response.id.replace(/-/g, '')}`);

    } catch (error) {
        console.error('\n❌ Failed to create database:', error);
    }
}

createDatabase();
