import { describe, test, expect, beforeEach, mock } from 'bun:test';
import { TradingApiClient } from '../../src/TradingApiClient.js';
import type { ILogger } from '@platform/domain';

describe('TradingApiClient - getTicker', () => {
    let client: TradingApiClient;
    let mockLogger: ILogger;

    beforeEach(() => {
        mockLogger = {
            info: mock(() => { }),
            error: mock(() => { }),
            warn: mock(() => { }),
            debug: mock(() => { }),
        };

        client = new TradingApiClient({
            baseUrl: 'http://localhost:3000',
            logger: mockLogger,
        });
    });

    test('should fetch ticker data from /ticker endpoint', async () => {
        // Arrange: Mock the fetch response
        const mockTickerData = {
            symbol: 'BTC/USD',
            lastPrice: 45000,
            bidPrice: 44995,
            askPrice: 45005,
            volume24h: 1234.56,
            high24h: 46000,
            low24h: 44000,
            priceChange24h: 1000,
            priceChangePercent24h: 2.27,
            timestamp: new Date('2024-01-01T12:00:00Z'),
        };

        global.fetch = mock(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve(mockTickerData),
            } as Response)
        );

        // Act: Call getTicker method
        const result = await client.getTicker();

        // Assert: Verify the result matches expected data
        expect(result).toEqual(mockTickerData);
        expect(mockLogger.info).toHaveBeenCalledWith('Fetching ticker...');
        expect(mockLogger.info).toHaveBeenCalledWith('Ticker fetched successfully');

        // Verify fetch was called with correct endpoint
        expect(global.fetch).toHaveBeenCalledWith(
            'http://localhost:3000/ticker',
            expect.objectContaining({
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            })
        );
    });

    test('should handle fetch errors gracefully', async () => {
        // Arrange: Mock fetch to fail
        global.fetch = mock(() =>
            Promise.resolve({
                ok: false,
                statusText: 'Internal Server Error',
            } as Response)
        );

        // Act & Assert: Expect error to be thrown
        await expect(client.getTicker()).rejects.toThrow('Failed to fetch ticker: Internal Server Error');
        expect(mockLogger.error).toHaveBeenCalledWith(
            'Error fetching ticker: Failed to fetch ticker: Internal Server Error'
        );
    });

    test('should handle network errors', async () => {
        // Arrange: Mock fetch to throw network error
        global.fetch = mock(() => Promise.reject(new Error('Network error')));

        // Act & Assert: Expect error to be thrown
        await expect(client.getTicker()).rejects.toThrow('Network error');
        expect(mockLogger.error).toHaveBeenCalledWith('Error fetching ticker: Network error');
    });
});
