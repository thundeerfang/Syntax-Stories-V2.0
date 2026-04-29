export type NormalizedTaxonomy = {
    category?: string;
    tags?: string[];
    language?: string;
};
export declare function normalizeTaxonomyInput(body: {
    category?: unknown;
    tags?: unknown;
    language?: unknown;
}): NormalizedTaxonomy;
//# sourceMappingURL=postTaxonomy.d.ts.map