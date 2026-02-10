/**
 * Robustly parse data that might be multi-encoded (JSON string inside JSON string, etc.)
 */
export const isPotentialUrl = (val: string): boolean => {
    if (typeof val !== 'string') return false;
    const s = val.trim().toLowerCase();
    return s.startsWith('data:image/') || s.startsWith('http') || s.startsWith('/') || s.startsWith('blob:');
};

export const robustParse = (val: any, depth = 0): any => {
    // Avoid infinite recursion
    if (depth > 10) return val;

    if (val === null || val === undefined) return null;

    // If it's already an array or object, recurse into its children
    if (Array.isArray(val)) {
        return val.map(item => robustParse(item, depth + 1));
    }

    if (typeof val === 'object') {
        const result: any = {};
        for (const key in val) {
            result[key] = robustParse(val[key], depth + 1);
        }
        return result;
    }

    if (typeof val === 'string') {
        let current = val.trim();
        if (!current) return null;

        // Handle common JSON artifacts
        if (current === 'null' || current === 'undefined') return null;

        // Try direct JSON parse first
        try {
            const parsed = JSON.parse(current);
            // If it parsed successfully and changed the value/type, recurse
            if (parsed !== current) {
                return robustParse(parsed, depth + 1);
            }
        } catch (e) {
            // Not a direct valid JSON, continue to cleaning
        }

        let lastValue = '';
        let iterations = 0;

        // Handle extreme over-encoding and excessive quoting
        while (iterations < 5 && current !== lastValue) {
            iterations++;
            lastValue = current;

            // 1. Remove outer quotes if they exist
            let cleaned = current.replace(/^\"|\"$/g, '').trim();

            // 2. Handle escaped quotes (e.g., \" or \\\")
            // We want to normalize them for a potential JSON.parse
            if (cleaned.includes('\\"')) {
                // If it looks like a JSON structure but with escaped quotes, try to unescape and parse
                const unescaped = cleaned.replace(/\\\"/g, '"');
                if (unescaped.startsWith('[') || unescaped.startsWith('{')) {
                    try {
                        const parsed = JSON.parse(unescaped);
                        return robustParse(parsed, depth + 1);
                    } catch (e) {
                        // If unescaping didn't make it valid JSON, keep the original cleaned version
                    }
                }
            }

            // 3. Try parsing the current cleaned version
            if (cleaned.startsWith('[') || cleaned.startsWith('{')) {
                try {
                    const parsed = JSON.parse(cleaned);
                    return robustParse(parsed, depth + 1);
                } catch (e) {
                    current = cleaned;
                }
            } else {
                current = cleaned;
            }
        }

        // Final fallback: remove common structural noise for raw strings
        // BUT protect URLs and Data URLs from being broken
        if (typeof current === 'string') {
            if (isPotentialUrl(current)) {
                return current;
            }
            return current.replace(/[\[\]"]/g, '').trim();
        }

        return current;
    }

    return val;
};

/**
 * Specifically parse location data into a flat array of strings
 */
export const parseLocations = (locations: any): string[] => {
    const parsed = robustParse(locations);
    if (!parsed) return [];

    const flatten = (val: any): string[] => {
        if (!val) return [];
        if (Array.isArray(val)) return val.flatMap(v => flatten(v));
        if (typeof val === 'string') {
            const trimmed = val.trim();
            if (!trimmed) return [];

            // Handle comma-separated strings inside (but don't split URLs or data URLs)
            if (trimmed.includes(',') && !trimmed.startsWith('data:') && !trimmed.startsWith('http')) {
                return trimmed.split(',').map(s => s.trim()).filter(Boolean);
            }

            // Final cleaning of brackets/quotes only if it's not a complex string
            if (!trimmed.startsWith('data:') && !trimmed.startsWith('http')) {
                const cleaned = trimmed.replace(/[\[\]"]/g, '').trim();
                return cleaned ? [cleaned] : [];
            }

            return [trimmed];
        }
        return [String(val).trim()];
    };

    const results = flatten(parsed);
    // Unique values, remove null/empty
    return Array.from(new Set(results.filter(Boolean)));
};

/**
 * Specifically parse image data into a flat array of strings
 */
export const parseImages = (images: any): string[] => {
    const parsed = robustParse(images);
    if (!parsed) return [];

    const flatten = (val: any): string[] => {
        if (!val) return [];
        if (Array.isArray(val)) return val.flatMap(v => flatten(v));
        if (typeof val === 'string') {
            const trimmed = val.trim();
            if (!trimmed) return [];

            // For images, we definitely don't want to strip brackets/quotes if it's a URL
            // because robustParse might have already handled it.
            // But if it's STILL wrapped in structural noise, clean it.
            if (!trimmed.startsWith('data:') && !trimmed.startsWith('http') && !trimmed.startsWith('/')) {
                const cleaned = trimmed.replace(/[\[\]"]/g, '').trim();
                return cleaned ? [cleaned] : [];
            }

            return [trimmed];
        }
        return [String(val).trim()];
    };

    const results = flatten(parsed);
    // Unique values, remove null/empty
    return Array.from(new Set(results.filter(Boolean)));
};
