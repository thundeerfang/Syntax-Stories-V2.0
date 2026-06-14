/// Squad taxonomy — mirrors `webapp/packages/shared/squadEnums.ts`.
const squadCategoryValues = <String>[
  'languages',
  'web',
  'ai',
  'devops',
  'mobile',
  'game',
  'career',
  'open_source',
  'devrel',
  'devtools',
];

const squadCategoryLabels = <String, String>{
  'languages': 'Languages',
  'web': 'Web',
  'ai': 'AI',
  'devops': 'DevOps',
  'mobile': 'Mobile',
  'game': 'Game',
  'career': 'Career',
  'open_source': 'Open source',
  'devrel': 'DevRel',
  'devtools': 'DevTools',
};

bool isSquadCategory(String raw) => squadCategoryValues.contains(raw);

String squadCategoryLabel(String? category) {
  if (category == null || category.isEmpty) return '';
  return squadCategoryLabels[category] ?? category;
}
