import { Hono } from 'hono';
import type { HonoEnv } from '../types';

export const ticker = new Hono<HonoEnv>()
    .get('/', async (c) => {
        try {
            // Mock ticker data - in production this would fetch from a real API
            const ticker = {
                symbol: 'BTC/USD',
                lastPrice: 45000,
                bidPrice: 44995,
                askPrice: 45005,
                volume24h: 1234.56,
                high24h: 46000,
                low24h: 44000,
                priceChange24h: 1000,
                priceChangePercent24h: 2.27,
                timestamp: new Date(),
            };

            return c.json(ticker);
        } catch (error) {
            console.error('Failed to fetch ticker: ', error);
            return c.json({ error: 'Failed to fetch ticker' }, 500);
        }
    });
