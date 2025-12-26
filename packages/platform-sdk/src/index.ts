/**
 * Platform SDK
 * Generic client SDK for interacting with the platform API
 */

// API Client
export { PlatformApiClient } from './PlatformApiClient.js';

// Individual Clients
export {
    BaseClient,
    AuthClient,
    BookmarkClient,
    ConfigClient,
    IngestClient,
    type BaseClientConfig,
    type Bookmark,
} from './clients/index.js';

// Config Providers
export { EnvConfigProvider, ApiConfigProvider } from './config/index.js';

// Workflow
export { IngestWorkflow } from './IngestWorkflow.js';

// Types
export type {
    SignUpData,
    SignInData,
    AuthResponse,
    BookmarkData,
    ConfigResponse,
    ConfigValueResponse,
    ConfigBatchRequest,
    ConfigBatchResponse,
    ConfigKeysResponse,
    // Ingest/Workflow types
    WorkflowPreset,
    IngestFilter,
    IngestOptions,
    WorkflowHookInfo,
    WorkflowExecuteOptions,
    IIngestWorkflow,
    ILogger,
} from './types.js';
