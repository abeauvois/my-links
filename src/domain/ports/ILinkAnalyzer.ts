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
     * @returns Tag and description for the link
     */
    analyze(url: string): Promise<LinkAnalysis>;
}
