/**
 * Trading SDK
 * Client SDK for trading operations, extending platform authentication
 */

// API Client
export { TradingApiClient } from './TradingApiClient.js';

// Re-export domain types for convenience
export type {
    Position,
    Order,
    CreateOrderData,
    MarketTicker,
    MarketTickerResponse,
    AccountBalance,
    Portfolio,
    Trade,
} from '@platform/trading-domain';

// Re-export auth types from platform SDK for convenience
export type {
    SignUpData,
    SignInData,
    AuthResponse,
} from '@platform/sdk';
