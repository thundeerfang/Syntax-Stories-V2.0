/**
 * Client-only Mermaid syntax check (same engine as publish). Use from the write UI before save.
 */
export async function validateMermaidSource(
  source: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const t = source.trim();
  if (!t) return { ok: true };
  try {
    const mermaid = (await import('mermaid')).default;
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'loose',
      theme: typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'default',
    });
    await mermaid.parse(t);
    return { ok: true };
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e);
    // Remove version information from mermaid error messages
    let cleaned = raw.replace(/mermaid\s+v?[\d.]+/gi, 'Mermaid').replace(/\s+Syntax error in textmermaid.*$/i, '');
    const short = cleaned.includes('Parse error')
      ? 'Invalid Mermaid syntax. Put labels with spaces or special characters in double quotes, e.g. B["Supabase API"]. Each arrow line should end with a newline.'
      : cleaned.slice(0, 220);
    return { ok: false, message: short };
  }
}
