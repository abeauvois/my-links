#!/usr/bin/env bun

import { Client } from '@notionhq/client';
import { EnvConfig } from './src/infrastructure/config/EnvConfig.js';

async function inspectDatabase() {
    try {
        // Load configuration
        const config = new EnvConfig();
        await config.load();
        const notionToken = config.get('NOTION_INTEGRATION_TOKEN');
        const notionDatabaseId = config.get('NOTION_DATABASE_ID');

        const client = new Client({ auth: notionToken });

        console.log('🔍 Inspecting Notion database schema...\n');
        console.log(`Database ID: ${notionDatabaseId}\n`);

        // Retrieve the database
        const database = await client.databases.retrieve({ database_id: notionDatabaseId });

        console.log('📋 Database Info:');
        if ('title' in database) {
            console.log(`  Name: ${database.title?.[0]?.plain_text || 'Untitled'}`);
        }
        if ('is_inline' in database) {
            console.log(`  Inline: ${database.is_inline}`);
        }
        if ('url' in database) {
            console.log(`  URL: ${database.url}`);
        }
        console.log();

        // Check for data sources
        if ('data_sources' in database && Array.isArray(database.data_sources)) {
            console.log(`📊 Data Sources (${database.data_sources.length}):`);

            for (const ds of database.data_sources) {
                console.log(`\n  Data Source: ${ds.name}`);
                console.log(`  ID: ${ds.id}`);

                // Retrieve the data source to get its properties
                try {
                    // Use fetch directly to access the Notion API with the new API version
                    const response = await fetch(`https://api.notion.com/v1/data-sources/${ds.id}`, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${notionToken}`,
                            'Notion-Version': '2025-09-03',
                            'Content-Type': 'application/json',
                        },
                    });

                    if (!response.ok) {
                        const errorBody = await response.text();
                        console.log(`  Error: ${response.status} - ${response.statusText}`);
                        console.log(`  Details: ${errorBody}`);
                    } else {
                        const dataSource = await response.json();
                        console.log('  Properties:');
                        if (dataSource && typeof dataSource === 'object' && 'properties' in dataSource) {
                            console.log(JSON.stringify(dataSource.properties, null, 4));
                        } else {
                            console.log('  Full data source response:');
                            console.log(JSON.stringify(dataSource, null, 4));
                        }
                    }
                } catch (dsError) {
                    console.log(`  Error retrieving data source: ${dsError instanceof Error ? dsError.message : dsError}`);
                }
            }
        } else {
            console.log('⚠️  No data_sources found in database response');
            console.log('\nFull database response:');
            console.log(JSON.stringify(database, null, 2));
        }

    } catch (error) {
        console.error('\n❌ Failed to inspect database:', error instanceof Error ? error.message : error);
        process.exit(1);
    }
}

inspectDatabase();
