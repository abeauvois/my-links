import Anthropic from '@anthropic-ai/sdk';
import { ILinkAnalyzer, LinkAnalysis } from '../../domain/ports/ILinkAnalyzer.js';

/**
 * Adapter: Implements link analysis using Anthropic's Claude API
 */
export class AnthropicAnalyzer implements ILinkAnalyzer {
    private readonly client: Anthropic;
    private readonly model = 'claude-3-5-haiku-20241022'; // Free tier model

    constructor(apiKey: string) {
        this.client = new Anthropic({ apiKey });
    }

    async analyze(url: string): Promise<LinkAnalysis> {
        const prompt = `Analyze this URL and provide:
1. A short categorization tag (2-4 words max, e.g., "AI/Machine Learning", "Climate Change", "Web Development", etc.)
2. A description of what this link is about (200 words maximum)

URL: ${url}

Respond in this exact JSON format:
{
  "tag": "your tag here",
  "description": "your description here"
}`;

        try {
            const message = await this.client.messages.create({
                model: this.model,
                max_tokens: 1024,
                messages: [{
                    role: 'user',
                    content: prompt
                }]
            });

            const content = message.content[0];
            if (content.type !== 'text') {
                throw new Error('Unexpected response type from Claude');
            }

            // Extract JSON from response (handle potential markdown code blocks)
            const text = content.text.trim();
            const jsonMatch = text.match(/\{[\s\S]*\}/);

            if (!jsonMatch) {
                throw new Error('No JSON found in Claude response');
            }

            const result = JSON.parse(jsonMatch[0]);

            // Validate response structure
            if (!result.tag || !result.description) {
                throw new Error('Invalid response structure from Claude');
            }

            // Ensure description is within 200 words
            const words = result.description.split(/\s+/);
            if (words.length > 200) {
                result.description = words.slice(0, 200).join(' ') + '...';
            }

            return {
                tag: result.tag,
                description: result.description
            };
        } catch (error) {
            console.error('Error calling Anthropic API:', error);
            throw new Error(`Failed to analyze URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
