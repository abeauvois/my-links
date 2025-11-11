/**
 * Port: Defines interface for analyzing and categorizing links
 */
export interface LinkAnalysis {
    tag: string;
    description: string;
}

export interface ILinkAnalyzer {
    /**
     * Analyzes a URL and generates categorization tag and description
     * @param url The URL to analyze
     * @param additionalContext Optional additional context (e.g., tweet content) to improve analysis
     * @returns Tag and description for the link
     */
    analyze(url: string, additionalContext?: string): Promise<LinkAnalysis>;
}
