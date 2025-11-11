#!/usr/bin/env bun

import { Client } from '@notionhq/client';
import { EnvConfig } from './src/infrastructure/config/EnvConfig.js';

async function queryPages() {
    try {
        // Load configuration
        const config = new EnvConfig();
        await config.load();
        const notionToken = config.get('NOTION_INTEGRATION_TOKEN');
        const notionDatabaseId = config.get('NOTION_DATABASE_ID');

        const client = new Client({ auth: notionToken });

        console.log('🔍 Querying Notion database pages...\n');
        console.log(`Database ID: ${notionDatabaseId}\n`);

        // Query the database for pages using fetch
        const response = await fetch(`https://api.notion.com/v1/databases/${notionDatabaseId}/query`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${notionToken}`,
                'Notion-Version': '2022-06-28',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                page_size: 1,
            }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.log(`Error: ${response.status} - ${response.statusText}`);
            console.log(`Details: ${errorBody}`);
            return;
        }

        const data: any = await response.json();
        const results = data.results || [];

        console.log(`📄 Found ${results.length} page(s)\n`);

        if (results.length > 0) {
            const firstPage: any = results[0];
            console.log('First page properties:');
            console.log(JSON.stringify(firstPage.properties, null, 2));
        } else {
            console.log('⚠️  Database is empty - no pages to inspect');
            console.log('\nTo set up the database, you need to:');
            console.log('1. Manually add at least one row to your Notion database');
            console.log('2. The database should have these columns:');
            console.log('   - link (Title property)');
            console.log('   - tag (Multi-select property)');
            console.log('   - description (Text property)');
        }

    } catch (error) {
        console.error('\n❌ Error:', error);
    }
}

queryPages();
