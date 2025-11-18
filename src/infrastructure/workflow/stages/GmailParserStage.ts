import { IStage } from '../../../domain/workflow/IStage.js';
import { EmailLink } from '../../../domain/entities/EmailLink.js';
import { ILinksExtractor } from '../../../domain/ports/ILinksExtractor.js';
import { GmailMessage } from '../../../domain/entities/GmailMessage.js';

/**
 * Stage: Parses links from email files
 * Transforms EmailFile into EmailLink objects
 */
export class GmailParserStage implements IStage<GmailMessage, EmailLink> {
    constructor(
        private readonly linksExtractor: ILinksExtractor
    ) { }

    async *process(gmailMessage: GmailMessage): AsyncIterable<EmailLink> {
        const links = this.linksExtractor.extractLinks(gmailMessage.rawContent);

        if (links.length > 0) {
            // Currently taking the first link as the main link
            const mainLink = links[0];
            yield new EmailLink(mainLink, '', '', gmailMessage.rawContent);
        }
    }
}
