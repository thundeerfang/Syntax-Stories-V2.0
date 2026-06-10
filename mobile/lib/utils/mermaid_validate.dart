/// Lightweight Mermaid syntax checks for the mobile write editor (publish guard).
String? validateMermaidSourceHeuristic(String source) {
  final t = source.trim();
  if (t.isEmpty) return null;

  final first = t
      .split('\n')
      .map((line) => line.trim())
      .firstWhere(
        (line) => line.isNotEmpty && !line.startsWith('%%'),
        orElse: () => '',
      );
  if (first.isEmpty) {
    return 'Invalid Mermaid syntax. Add a diagram type such as graph TD.';
  }

  final head = first.toLowerCase().replaceAll(RegExp(r'\s+'), ' ');
  const starters = [
    'graph ',
    'flowchart ',
    'sequencediagram',
    'classdiagram',
    'statediagram-v2',
    'statediagram ',
    'erdiagram',
    'journey',
    'gantt',
    'pie ',
    'gitgraph',
    'mindmap',
    'timeline',
    'quadrantchart',
    'xychart-beta',
    'block-beta',
    'packet-beta',
    'kanban',
  ];
  if (!starters.any(head.startsWith)) {
    return 'Invalid Mermaid syntax. Start with a diagram type such as graph TD or flowchart LR.';
  }

  final openBracket = '['.allMatches(t).length;
  final closeBracket = ']'.allMatches(t).length;
  if (openBracket != closeBracket) {
    return 'Invalid Mermaid syntax. Put labels with spaces in double quotes, e.g. B["Supabase API"].';
  }

  return null;
}

bool mermaidSourceCanPreview(String source, {String? parseError}) {
  return source.trim().isNotEmpty && (parseError == null || parseError.isEmpty);
}
