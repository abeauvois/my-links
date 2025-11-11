import { Client } from '@notionhq/client';
import { EmailLink } from '../../domain/entities/EmailLink.js';
import { INotionWriter } from '../../domain/ports/INotionWriter.js';

/**
 * Adapter: Implements Notion database writing using the Notion API
 */
export class NotionDatabaseWriter implements INotionWriter {
    private readonly client: Client;

    constructor(notionToken: string) {
        this.client = new Client({ auth: notionToken });
    }

    async write(links: EmailLink[], databaseId: string): Promise<void> {
        if (links.length === 0) {
            console.log('No links to export to Notion');
            return;
        }

        console.log(`Exporting ${links.length} links to Notion database...`);

        for (let i = 0; i < links.length; i++) {
            const link = links[i];

            try {
                await this.createPage(link, databaseId);
                console.log(`  [${i + 1}/${links.length}] ✓ ${link.url}`);
            } catch (error) {
                console.error(`  [${i + 1}/${links.length}] ✗ Failed to export ${link.url}:`, error instanceof Error ? error.message : error);
            }
        }

        console.log('Notion export complete!');
    }

    private async createPage(link: EmailLink, databaseId: string): Promise<void> {
        await this.client.pages.create({
            parent: { database_id: databaseId },
            properties: {
                // Link property (title) - capital L as in Notion database
                'Link': {
                    title: [
                        {
                            text: {
                                content: link.url,
                            },
                        },
                    ],
                },
                // Tag property (multi_select) - capital T as in Notion database
                'Tag': {
                    multi_select: link.tag ? [{ name: link.tag }] : [],
                },
                // Description property (rich_text) - capital D as in Notion database
                'Description': {
                    rich_text: [
                        {
                            text: {
                                content: link.description || '',
                            },
                        },
                    ],
                },
            },
        });
    }
}
