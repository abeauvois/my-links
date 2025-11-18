import { Logger } from "@poppinss/cliui";
import { EnvConfig } from "../config/EnvConfig";
// import { IGmailClient } from "../../domain/ports/IGmailClient";
import { ILogger } from "../../domain/ports/ILogger";
import { Pipeline, WorkflowExecutor } from "../../domain/workflow";

import { FileTimestampRepository } from "../repositories/FileTimestampRepository";
import { GmailClient } from "../adapters/GmailClient";

import { GmailMessageProducer } from "./producers/GmailMessageProducer";
import { GmailParserStage } from "./stages/GmailParserStage";
import { HttpLinksParser } from "../adapters/HttpLinksParser";
import { EmailLinkCollector } from "./consumers/EmailLinkCollector";

// use const workflow = new WorkflowCreator("linksFromGmailToNotion").run()
class WorkflowCreator {
    constructor(
        private useCaseName: string,
        // private readonly gmailClient: IGmailClient,
        private readonly logger: ILogger,
    ) {
        this.useCaseName = useCaseName;
        this.logger = logger;
    }

    async run() {
        const { clientId, clientSecret, refreshToken, filterEmail } = await this.checkGmailClientConfig();

        const gmailClient = new GmailClient(clientId, clientSecret, refreshToken, this.logger);

        const timestampRepository = new FileTimestampRepository('.gmail-last-run');

        switch (this.useCaseName) {
            case "linksFromGmailToNotion":
                const producer = new GmailMessageProducer(gmailClient, timestampRepository, filterEmail)
                // for await (const item of producer.produce()) {
                //     this.logger.info(`Produced message: ${item.rawContent}`);
                // }
                // return producer;
                const stage1 = new GmailParserStage(new HttpLinksParser())
                const stage2 = new HttpLinksParser()
                const pipeline = new Pipeline(stage1)
                const consumer = new EmailLinkCollector(this.logger)
                const workflow = new WorkflowExecutor(producer, pipeline, consumer)
                workflow.execute();

                // const useCase = new UseCase(this.useCaseName, workflow)
                // useCase.execute(...)
                // return this.workflowExecutor;
                break;

            default:
                throw new Error(`Unknown use case: ${this.useCaseName}`);
        }
    }
    async checkGmailClientConfig() {
        const config = new EnvConfig();
        await config.load();
        const clientId = config.get('GMAIL_CLIENT_ID');
        const clientSecret = config.get('GMAIL_CLIENT_SECRET');
        const refreshToken = config.get('GMAIL_REFRESH_TOKEN');
        // Get optional filter email from env
        const filterEmail = config.get('MY_EMAIL_ADDRESS');

        if (!clientId || !clientSecret || !refreshToken) {
            throw new Error('Gmail credentials not found in .env file');
            //         p.log.error('Gmail credentials not found in .env file');
            //         p.note(
            //             `Please add the following to your .env file:

            // GMAIL_CLIENT_ID=your_client_id
            // GMAIL_CLIENT_SECRET=your_client_secret
            // GMAIL_REFRESH_TOKEN=your_refresh_token

            // To get these credentials:
            // 1. Go to Google Cloud Console (https://console.cloud.google.com)
            // 2. Create a project and enable Gmail API
            // 3. Create OAuth 2.0 credentials
            // 4. Generate a refresh token using OAuth playground`,
            //             'Missing Gmail Credentials'
            //         );
            //         p.outro('❌ Configuration incomplete');
        }
        return { clientId, clientSecret, refreshToken, filterEmail };
    }
}

function main() {
    const logger: ILogger = new Logger();
    const workflow = new WorkflowCreator("linksFromGmailToNotion", logger);
    return workflow.run();
}

main()


// export { WorkflowCreator };

