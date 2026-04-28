const MAX_TAGS = 20;
const TAG_SLUG_LEN = 32;
const CATEGORY_SLUG_LEN = 48;
const LANGUAGE_MAX = 12;
function slugifyToken(s, maxLen) {
    return s
        .trim()
        .toLowerCase()
        .replaceAll(/\s+/g, '-')
        .replaceAll(/[^\w-]/g, '')
        .replaceAll(/-+/g, '-')
        .replaceAll(/^-+/g, '')
        .replaceAll(/-+$/g, '')
        .slice(0, maxLen);
}
export function normalizeTaxonomyInput(body) {
    let category;
    if (typeof body.category === 'string' && body.category.trim()) {
        const c = slugifyToken(body.category, CATEGORY_SLUG_LEN);
        if (c)
            category = c;
    }
    let tags;
    if (Array.isArray(body.tags)) {
        const seen = new Set();
        const out = [];
        for (const t of body.tags) {
            if (typeof t !== 'string')
                continue;
            const s = slugifyToken(t, TAG_SLUG_LEN);
            if (!s || seen.has(s))
                continue;
            seen.add(s);
            out.push(s);
            if (out.length >= MAX_TAGS)
                break;
        }
        if (out.length)
            tags = out;
    }
    let language;
    if (typeof body.language === 'string' && body.language.trim()) {
        const l = body.language.trim().toLowerCase().replaceAll(/[^a-z-]/g, '').slice(0, LANGUAGE_MAX);
        if (l)
            language = l;
    }
    return { category, tags, language };
}
//# sourceMappingURL=postTaxonomy.js.map