import JSZip from 'jszip';
import { IZipExtractor } from '../../domain/ports/IZipExtractor.js';

/**
 * Adapter: Implements zip extraction using JSZip library
 */
export class BunZipExtractor implements IZipExtractor {
    async extractEmlFiles(zipFilePath: string): Promise<Map<string, string>> {
        const file = Bun.file(zipFilePath);

        if (!await file.exists()) {
            throw new Error(`Zip file not found: ${zipFilePath}`);
        }

        const arrayBuffer = await file.arrayBuffer();
        const zip = await JSZip.loadAsync(arrayBuffer);

        const emlFiles = new Map<string, string>();

        for (const [filename, zipEntry] of Object.entries(zip.files)) {
            // Only process .eml files (not directories)
            if (!zipEntry.dir && filename.toLowerCase().endsWith('.eml')) {
                const content = await zipEntry.async('text');
                emlFiles.set(filename, content);
            }
        }

        return emlFiles;
    }
}
