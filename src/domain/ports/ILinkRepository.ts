import { EmailLink } from '../entities/EmailLink.js';

/**
 * Repository Port: Abstract storage interface for EmailLink entities
 * Enables duplicate detection and persistence across multiple storage backends
 */
export interface ILinkRepository {
    /**
     * Check if a link with the given URL already exists
     * @param url The URL to check
     * @returns true if the link exists, false otherwise
     */
    exists(url: string): Promise<boolean>;

    /**
     * Find a link by its URL
     * @param url The URL to search for
     * @returns The EmailLink if found, null otherwise
     */
    findByUrl(url: string): Promise<EmailLink | null>;

    /**
     * Save a single link
     * @param link The EmailLink to save
     */
    save(link: EmailLink): Promise<void>;

    /**
     * Save multiple links at once
     * @param links Array of EmailLinks to save
     */
    saveMany(links: EmailLink[]): Promise<void>;

    /**
     * Retrieve all stored links
     * @returns Array of all EmailLinks
     */
    findAll(): Promise<EmailLink[]>;

    /**
     * Clear all stored links (useful for testing)
     */
    clear(): Promise<void>;
}
