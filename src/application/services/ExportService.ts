import { EmailLink } from '../../domain/entities/EmailLink';
import { ICsvWriter } from '../../domain/ports/ICsvWriter';
import { ILogger } from '../../domain/ports/ILogger';
import { INotionWriter } from '../../domain/ports/INotionWriter';

/**
 * Service responsible for exporting results to CSV and Notion
 */
export class ExportService {
    constructor(
        private readonly csvWriter: ICsvWriter,
        private readonly notionWriter: INotionWriter,
        private readonly logger: ILogger
    ) { }

    /**
     * Export results to both CSV and Notion
     * @param links Categorized links to export
     * @param outputCsvPath Path for CSV output
     * @param notionDatabaseId Notion database ID
     * @param updatedUrls Optional set of URLs that were updated (for Notion page updates)
     */
    async exportResults(
        links: EmailLink[],
        outputCsvPath: string,
        notionDatabaseId: string,
        updatedUrls?: Set<string>
    ): Promise<void> {
        await this.exportToCsv(links, outputCsvPath);
        await this.exportToNotion(links, notionDatabaseId, updatedUrls);
    }

    /**
     * Export links to CSV file
     */
    private async exportToCsv(links: EmailLink[], path: string): Promise<void> {
        this.logger.info('\n💾 Writing results to CSV...');
        await this.csvWriter.write(links, path);
        this.logger.info(`✅ CSV export complete! Output saved to: ${path}`);
    }

    /**
     * Export links to Notion database
     * Handles partial failures gracefully (CSV export can succeed even if Notion fails)
     */
    private async exportToNotion(
        links: EmailLink[],
        databaseId: string,
        updatedUrls?: Set<string>
    ): Promise<void> {
        this.logger.info('\n📝 Exporting to Notion...');
        try {
            await this.notionWriter.write(links, databaseId);

            // Update enriched entries if provided
            if (updatedUrls && updatedUrls.size > 0) {
                this.logger.info(`🔄 Updating ${updatedUrls.size} enriched pages in Notion...`);
                await this.notionWriter.updatePages(links, databaseId, updatedUrls);
            }

            this.logger.info(`✅ Notion export complete!`);
        } catch (error) {
            this.logger.error(
                `❌ Notion export failed: ${error instanceof Error ? error.message : error}`
            );
            this.logger.info('Note: CSV export was successful. Only Notion export failed.');
        }
    }
}
