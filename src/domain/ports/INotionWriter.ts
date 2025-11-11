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
}
