import { EmailLink } from '../entities/EmailLink.js';

/**
 * Port: Defines interface for writing to Notion databases
 */
export interface INotionWriter {
    /**
     * Writes email links to a Notion database
     * @param links Array of EmailLink entities
     * @param databaseId Notion database ID to write to
     */
    write(links: EmailLink[], databaseId: string): Promise<void>;

    /**
     * Update existing Notion pages for specific URLs
     * @param links All links (with updated data)
     * @param databaseId Notion database ID
     * @param urlsToUpdate Set of URLs that should be updated
     */
    updatePages(links: EmailLink[], databaseId: string, urlsToUpdate: Set<string>): Promise<void>;
}
