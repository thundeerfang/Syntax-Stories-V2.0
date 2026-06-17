String resolveBlogCodeLanguageHint(String? raw) {
  final t = raw?.trim().toLowerCase();
  if (t == null || t.isEmpty || t == 'auto' || t == 'text') return '';
  const aliases = {
    'ts': 'typescript',
    'js': 'javascript',
    'py': 'python',
    'rs': 'rust',
    'yml': 'yaml',
    'sh': 'bash',
    'html': 'xml',
    'htm': 'xml',
  };
  return aliases[t] ?? t;
}

String inferBlogCodeLanguage(String code, {String? languageHint}) {
  final resolved = resolveBlogCodeLanguageHint(languageHint);
  if (resolved.isNotEmpty) return resolved;

  final t = code.trim();
  if (t.isEmpty) return 'plaintext';
  if (t.startsWith('{') || t.startsWith('[')) return 'json';
  if (RegExp(r'^(import|export|const|let|var|function|class|interface)\s', multiLine: true).hasMatch(t)) {
    if (RegExp(r'\b(React|jsx|tsx)\b').hasMatch(t) || t.contains('</')) return 'tsx';
    return 'typescript';
  }
  if (RegExp(r'^(def |import |from |class |async def )', multiLine: true).hasMatch(t)) return 'python';
  if (RegExp(r'^(fn |use |impl |pub |mod )', multiLine: true).hasMatch(t)) return 'rust';
  if (RegExp(r'^(package |import java\.)', multiLine: true).hasMatch(t)) return 'java';
  if (RegExp(r'^(<!DOCTYPE|<html|<div)', caseSensitive: false).hasMatch(t)) return 'xml';
  if (RegExp(r'^(SELECT|INSERT|UPDATE|DELETE|CREATE)\s', caseSensitive: false).hasMatch(t)) return 'sql';
  if (RegExp(r'^#!\/bin\/(ba)?sh').hasMatch(t) || RegExp(r'^(echo |export |cd )', multiLine: true).hasMatch(t)) {
    return 'bash';
  }
  if (RegExp(r'^(\.|#)\s*\w', multiLine: true).hasMatch(t) && t.contains('{')) return 'css';
  return 'plaintext';
}

String blogCodeTextFromPayload(Map<String, dynamic> payload) {
  final code = payload['code']?.toString();
  if (code != null) return code;
  final text = payload['text']?.toString();
  if (text != null) return text;
  return '';
}

String blogCodeLanguageLabel(String languageId) {
  const labels = {
    'plaintext': 'PLAIN TEXT',
    'typescript': 'TYPESCRIPT',
    'javascript': 'JAVASCRIPT',
    'tsx': 'TSX',
    'jsx': 'JSX',
    'json': 'JSON',
    'python': 'PYTHON',
    'rust': 'RUST',
    'go': 'GO',
    'java': 'JAVA',
    'c': 'C',
    'cpp': 'C++',
    'csharp': 'C#',
    'css': 'CSS',
    'scss': 'SCSS',
    'xml': 'HTML / XML',
    'bash': 'BASH',
    'shell': 'SHELL',
    'sql': 'SQL',
    'yaml': 'YAML',
    'markdown': 'MARKDOWN',
    'php': 'PHP',
    'ruby': 'RUBY',
    'swift': 'SWIFT',
    'kotlin': 'KOTLIN',
    'graphql': 'GRAPHQL',
    'diff': 'DIFF',
  };
  return labels[languageId.toLowerCase()] ?? languageId.toUpperCase();
}

/// Language id for [HighlightView] — mirrors webapp hljs subset.
String blogCodeHighlightLanguage(String languageId) {
  const supported = {
    'typescript',
    'javascript',
    'json',
    'python',
    'rust',
    'go',
    'java',
    'c',
    'cpp',
    'csharp',
    'css',
    'scss',
    'xml',
    'markdown',
    'bash',
    'shell',
    'sql',
    'yaml',
    'php',
    'ruby',
    'swift',
    'kotlin',
    'graphql',
    'diff',
    'plaintext',
  };

  final id = languageId.toLowerCase();
  if (id == 'tsx' || id == 'jsx') return 'javascript';
  if (supported.contains(id)) return id;
  return 'plaintext';
}
