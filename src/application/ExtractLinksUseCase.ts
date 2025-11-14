import { EmailLink } from '../domain/entities/EmailLink';
import { ICsvWriter } from '../domain/ports/ICsvWriter';
import { IEmailParser } from '../domain/ports/IEmailParser';
import { ILinkAnalyzer } from '../domain/ports/ILinkAnalyzer';
import { ILogger } from '../domain/ports/ILogger';
import { INotionWriter } from '../domain/ports/INotionWriter';
import { ITweetScraper } from '../domain/ports/ITweetScraper';
import { IZipExtractor } from '../domain/ports/IZipExtractor';

export interface QueuedLink {
    link: EmailLink;
    index: number;
}

/**
 * Application Use Case: Orchestrates the email link extraction process
*/

export class ExtractLinksUseCase {
    private static readonly MAX_WAIT_SECONDS = 15 * 60; // 15 minutes
    private static readonly RATE_LIMIT_BUFFER_MS = 5000; // 5 second buffer
    private static readonly COUNTDOWN_INTERVAL = 10; // Show countdown every 10 seconds
    private readonly LINK_MAX_LENGTH = 80;

    constructor(
        private readonly zipExtractor: IZipExtractor,
        private readonly emailParser: IEmailParser,
        private readonly linkAnalyzer: ILinkAnalyzer,
        private readonly csvWriter: ICsvWriter,
        private readonly notionWriter: INotionWriter,
        private readonly tweetScraper: ITweetScraper,
        private readonly logger: ILogger
    ) { }

    static isTwitterUrl(url: string): boolean {
        return url.includes('twitter.com/') || url.includes('x.com/') || url.includes('t.co/');
    }

    /**
     * Executes the complete link extraction workflow
     * @param zipFilePath Path to the input zip file
     * @param outputCsvPath Path for the output CSV file
     * @param notionDatabaseId Notion database ID for export
     */
    async execute(zipFilePath: string, outputCsvPath: string, notionDatabaseId: string): Promise<void> {
        const emailFiles = await this.extractEmailFiles(zipFilePath);
        const emailLinks = await this.parseEmailLinks(emailFiles);
        const { categorizedLinks, retryQueue } = await this.analyzeLinks(emailLinks);

        // Handle retry queue if needed, otherwise export results
        if (retryQueue.length > 0) {
            await this.handleRetryQueue(retryQueue, categorizedLinks, outputCsvPath, notionDatabaseId);
        } else {
            await this.exportResults(categorizedLinks, outputCsvPath, notionDatabaseId);
        }

        this.logger.info('\n✅ All done!');
    }

    /**
     * Extract email files from zip/directory
     */
    private async extractEmailFiles(zipFilePath: string): Promise<Map<string, string>> {
        this.logger.info('📦 Extracting .eml files from zip...');
        const emailFiles = await this.zipExtractor.extractEmlFiles(zipFilePath);
        this.logger.info(`✅ Found ${emailFiles.size} email files`);
        return emailFiles;
    }

    /**
     * Parse email files and extract links
     */
    private async parseEmailLinks(emailFiles: Map<string, string>): Promise<EmailLink[]> {
        this.logger.info('\n🔍 Parsing emails and extracting links...');
        const emailLinks: EmailLink[] = [];

        for (const [filename, content] of emailFiles.entries()) {
            const links = this.emailParser.extractLinks(content);

            if (links.length > 0) {
                const mainLink = links[0];
                emailLinks.push(new EmailLink(mainLink, '', '', filename));
                this.logger.info(`  📧 ${filename}: ${mainLink}`);
            } else {
                this.logger.warning(`  ⚠️  ${filename}: No links found`);
            }
        }

        this.logger.info(`\n✅ Extracted ${emailLinks.length} links`);
        return emailLinks;
    }

    /**
     * Analyze all links with AI, queue rate-limited Twitter links for retry
     */
    private async analyzeLinks(emailLinks: EmailLink[]): Promise<{
        categorizedLinks: EmailLink[];
        retryQueue: QueuedLink[];
    }> {
        this.logger.info('\n🤖 Analyzing links with AI...');
        const categorizedLinks: EmailLink[] = [];
        const retryQueue: QueuedLink[] = [];

        for (let i = 0; i < emailLinks.length; i++) {
            const link = emailLinks[i];
            const truncatedUrl = truncate(link.url, this.LINK_MAX_LENGTH);
            this.logger.info(`  [${i + 1}/${emailLinks.length}] Analyzing: ${truncatedUrl}`);

            try {
                const { categorized, shouldRetry } = await this.analyzeLink(link);
                categorizedLinks.push(categorized);
                this.logger.info(`    ✓ Tag: ${categorized.tag}`);

                if (shouldRetry) {
                    retryQueue.push({ link, index: categorizedLinks.length - 1 });
                }
            } catch (error) {
                this.logger.error(`    ✗ Error analyzing link: ${error}`);
                categorizedLinks.push(link);
            }
        }

        return { categorizedLinks, retryQueue };

        function truncate(text: string, maxLength: number = 60): string {
            return text.length > maxLength ? text.slice(0, maxLength - 3) + '...' : text;
        }
    }

    /**
     * Analyze a single link with optional tweet content
     */
    private async analyzeLink(link: EmailLink): Promise<{
        categorized: EmailLink;
        shouldRetry: boolean;
    }> {
        const isTwitterUrl = ExtractLinksUseCase.isTwitterUrl(link.url);
        let tweetContent: string | null = null;

        if (isTwitterUrl) {
            this.logger.info(`    🐦 Fetching tweet content...`);
            tweetContent = await this.tweetScraper.fetchTweetContent(link.url);
            if (tweetContent) {
                this.logger.info(`    ✓ Tweet content retrieved`);
            }
        }

        const analysis = await this.linkAnalyzer.analyze(link.url, tweetContent || undefined);
        const categorized = link.withCategorization(analysis.tag, analysis.description);

        // Check if this should be queued for retry
        const shouldRetry = isTwitterUrl &&
            analysis.tag === 'Unknown' &&
            !tweetContent &&
            this.tweetScraper.isRateLimited();

        return { categorized, shouldRetry };
    }

    /**
     * Export results to CSV and Notion
     */
    private async exportResults(
        categorizedLinks: EmailLink[],
        outputCsvPath: string,
        notionDatabaseId: string,
        updatedUrls?: Set<string>
    ): Promise<void> {
        this.logger.info('\n💾 Writing results to CSV...');
        await this.csvWriter.write(categorizedLinks, outputCsvPath);
        this.logger.info(`✅ CSV export complete! Output saved to: ${outputCsvPath}`);

        this.logger.info('\n📝 Exporting to Notion...');
        try {
            await this.notionWriter.write(categorizedLinks, notionDatabaseId);
            this.logger.info(`✅ Notion export complete!`);

            // Update enriched entries if provided
            if (updatedUrls && updatedUrls.size > 0) {
                await this.notionWriter.updatePages(categorizedLinks, notionDatabaseId, updatedUrls);
            }
        } catch (error) {
            this.logger.error(`❌ Notion export failed: ${error instanceof Error ? error.message : error}`);
            this.logger.info('Note: CSV export was successful. Only Notion export failed.');
        }
    }

    /**
     * Handle the retry queue for rate-limited Twitter links
     */
    private async handleRetryQueue(
        retryQueue: QueuedLink[],
        categorizedLinks: EmailLink[],
        outputCsvPath: string,
        notionDatabaseId: string
    ): Promise<void> {
        const waitSeconds = this.getRateLimitWaitTime();

        this.logger.info(`\n⏳ ${retryQueue.length} Twitter links rate-limited. Reset in ${waitSeconds} seconds`);

        if (waitSeconds > ExtractLinksUseCase.MAX_WAIT_SECONDS) {
            this.logger.warning(`⚠️  Wait time exceeds 15 minutes. Skipping retry - links kept as "Unknown"`);
            await this.exportResults(categorizedLinks, outputCsvPath, notionDatabaseId);
            return;
        }

        await this.waitForRateLimitReset();
        const updatedUrls = await this.retryQueuedLinks(retryQueue, categorizedLinks);

        this.logger.info('\n💾 Updating CSV with enriched results...');
        await this.csvWriter.write(categorizedLinks, outputCsvPath);
        this.logger.info(`✅ CSV updated! Output saved to: ${outputCsvPath}`);

        await this.exportResults(categorizedLinks, outputCsvPath, notionDatabaseId, updatedUrls);
    }

    /**
     * Get seconds until rate limit reset
     */
    private getRateLimitWaitTime(): number {
        const resetTime = this.tweetScraper.getRateLimitResetTime();
        return Math.ceil((resetTime - Date.now()) / 1000);
    }

    /**
     * Wait for rate limit reset with countdown
     */
    private async waitForRateLimitReset(): Promise<void> {
        const resetTime = this.tweetScraper.getRateLimitResetTime();
        const endWait = resetTime + ExtractLinksUseCase.RATE_LIMIT_BUFFER_MS;
        const totalWaitSeconds = Math.ceil((endWait - Date.now()) / 1000);

        const spinner = this.logger.await(`Waiting for rate limit reset (${totalWaitSeconds}s)...`);
        spinner.start();

        while (Date.now() < endWait) {
            const remaining = Math.ceil((endWait - Date.now()) / 1000);
            if (remaining > 0 && remaining % ExtractLinksUseCase.COUNTDOWN_INTERVAL === 0) {
                spinner.update(`Waiting for rate limit reset (${remaining}s remaining)`);
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        spinner.stop();

        // Clear the rate limit now that we've waited
        this.tweetScraper.clearRateLimit();

        this.logger.info(`✅ Rate limit reset! Retrying...\n`);
    }

    /**
     * Retry all queued links and return URLs that were successfully enriched
     */
    private async retryQueuedLinks(
        retryQueue: QueuedLink[],
        categorizedLinks: EmailLink[]
    ): Promise<Set<string>> {
        this.logger.info(`🔄 Retrying ${retryQueue.length} rate-limited links...`);
        const updatedUrls = new Set<string>();
        let successCount = 0;

        for (let i = 0; i < retryQueue.length; i++) {
            const { link, index } = retryQueue[i];
            this.logger.info(`  [${i + 1}/${retryQueue.length}] Retrying: ${link.url}`);

            try {
                const enriched = await this.retryLink(link);

                if (enriched) {
                    categorizedLinks[index] = enriched;
                    updatedUrls.add(link.url);
                    successCount++;
                    this.logger.info(`    ✓ Enriched with tag: ${enriched.tag}`);
                } else {
                    this.logger.warning(`    ⚠️  Still unable to fetch tweet content`);
                }
            } catch (error) {
                this.logger.error(`    ✗ Retry failed: ${error}`);
            }
        }

        this.logger.info(`\n✅ Retry complete: ${successCount}/${retryQueue.length} links enriched`);
        return updatedUrls;
    }

    /**
     * Retry a single link by fetching tweet content and re-analyzing
     */
    private async retryLink(link: EmailLink): Promise<EmailLink | null> {
        const tweetContent = await this.tweetScraper.fetchTweetContent(link.url);

        if (!tweetContent) {
            return null;
        }

        this.logger.info(`    ✓ Tweet content retrieved`);
        const analysis = await this.linkAnalyzer.analyze(link.url, tweetContent);
        return link.withCategorization(analysis.tag, analysis.description);
    }
}
