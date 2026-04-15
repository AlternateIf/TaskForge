import type { TaskPriority } from '../schemas/task.schema.js';

export const SHORTCUT_SCOPES = ['global', 'board', 'list', 'task-detail', 'overlay'] as const;
export type ShortcutScope = (typeof SHORTCUT_SCOPES)[number];

export const SHORTCUT_DISCOVERY_GROUPS = [
  'navigation',
  'creation',
  'focus',
  'editing',
  'support',
] as const;
export type ShortcutDiscoveryGroup = (typeof SHORTCUT_DISCOVERY_GROUPS)[number];

export interface ShortcutModifierRequirements {
  metaKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
}

interface ShortcutDefinitionBase {
  id: string;
  label: string;
  description: string;
  scope: ShortcutScope;
  discoverabilityGroup: ShortcutDiscoveryGroup;
  modifiers?: ShortcutModifierRequirements;
  allowInInput?: boolean;
  preventDefault?: boolean;
}

export interface SingleKeyShortcutDefinition extends ShortcutDefinitionBase {
  kind: 'single';
  key: string;
  displayKeys: readonly string[];
}

export interface ChordShortcutDefinition extends ShortcutDefinitionBase {
  kind: 'chord';
  chord: readonly [string, string];
  displayKeys: readonly string[];
}

export type ShortcutDefinition = SingleKeyShortcutDefinition | ChordShortcutDefinition;

export const CHORD_TIMEOUT_MS = 500;

export const GLOBAL_SHORTCUT_DEFINITIONS: readonly ShortcutDefinition[] = [
  {
    id: 'global.show-shortcuts-overlay',
    kind: 'single',
    key: '?',
    displayKeys: ['?'],
    label: 'Show shortcuts',
    description: 'Open the keyboard shortcut reference overlay.',
    scope: 'global',
    discoverabilityGroup: 'support',
    modifiers: { shiftKey: true },
    preventDefault: true,
  },
  {
    id: 'global.focus-command-palette-search',
    kind: 'single',
    key: '/',
    displayKeys: ['/'],
    label: 'Focus search',
    description: 'Focus the command palette search input.',
    scope: 'global',
    discoverabilityGroup: 'focus',
    preventDefault: true,
  },
  {
    id: 'global.go-dashboard',
    kind: 'chord',
    chord: ['g', 'd'],
    displayKeys: ['G', 'D'],
    label: 'Go to dashboard',
    description: 'Navigate to the dashboard.',
    scope: 'global',
    discoverabilityGroup: 'navigation',
    preventDefault: true,
  },
  {
    id: 'global.go-projects',
    kind: 'chord',
    chord: ['g', 'p'],
    displayKeys: ['G', 'P'],
    label: 'Go to projects',
    description: 'Navigate to the projects list.',
    scope: 'global',
    discoverabilityGroup: 'navigation',
    preventDefault: true,
  },
  {
    id: 'global.new-project',
    kind: 'single',
    key: 'p',
    displayKeys: ['P'],
    label: 'Create project',
    description: 'Create a new project from any view.',
    scope: 'global',
    discoverabilityGroup: 'creation',
    preventDefault: true,
  },
  {
    id: 'global.escape',
    kind: 'single',
    key: 'escape',
    displayKeys: ['Esc'],
    label: 'Close current layer',
    description: 'Close the closest open layer when available.',
    scope: 'global',
    discoverabilityGroup: 'support',
    allowInInput: true,
    preventDefault: false,
  },
];

export const BOARD_LIST_SHORTCUT_DEFINITIONS: readonly ShortcutDefinition[] = [
  {
    id: 'board-list.new-task',
    kind: 'single',
    key: 'n',
    displayKeys: ['N'],
    label: 'New task',
    description: 'Open create-task dialog in board view.',
    scope: 'board',
    discoverabilityGroup: 'creation',
    preventDefault: true,
  },
  {
    id: 'list.new-task',
    kind: 'single',
    key: 'n',
    displayKeys: ['N'],
    label: 'New task',
    description: 'Open create-task dialog in list view.',
    scope: 'list',
    discoverabilityGroup: 'creation',
    preventDefault: true,
  },
  {
    id: 'board-list.focus-next',
    kind: 'single',
    key: 'j',
    displayKeys: ['J'],
    label: 'Navigate down',
    description: 'Move keyboard focus down to the next visible task.',
    scope: 'board',
    discoverabilityGroup: 'focus',
    preventDefault: true,
  },
  {
    id: 'list.focus-next',
    kind: 'single',
    key: 'j',
    displayKeys: ['J'],
    label: 'Navigate down',
    description: 'Move keyboard focus down to the next visible task.',
    scope: 'list',
    discoverabilityGroup: 'focus',
    preventDefault: true,
  },
  {
    id: 'board-list.focus-previous',
    kind: 'single',
    key: 'k',
    displayKeys: ['K'],
    label: 'Navigate up',
    description: 'Move keyboard focus up to the previous visible task.',
    scope: 'board',
    discoverabilityGroup: 'focus',
    preventDefault: true,
  },
  {
    id: 'list.focus-previous',
    kind: 'single',
    key: 'k',
    displayKeys: ['K'],
    label: 'Navigate up',
    description: 'Move keyboard focus up to the previous visible task.',
    scope: 'list',
    discoverabilityGroup: 'focus',
    preventDefault: true,
  },
  {
    id: 'board-list.open-focused-task',
    kind: 'single',
    key: 'enter',
    displayKeys: ['Enter'],
    label: 'Open focused task',
    description: 'Open details for the currently focused task.',
    scope: 'board',
    discoverabilityGroup: 'navigation',
    preventDefault: true,
  },
  {
    id: 'list.open-focused-task',
    kind: 'single',
    key: 'enter',
    displayKeys: ['Enter'],
    label: 'Open focused task',
    description: 'Open details for the currently focused task.',
    scope: 'list',
    discoverabilityGroup: 'navigation',
    preventDefault: true,
  },
];

export const TASK_DETAIL_SHORTCUT_DEFINITIONS: readonly ShortcutDefinition[] = [
  {
    id: 'task-detail.assign',
    kind: 'single',
    key: 'a',
    displayKeys: ['A'],
    label: 'Assign task',
    description: 'Open assignee controls.',
    scope: 'task-detail',
    discoverabilityGroup: 'editing',
    preventDefault: true,
  },
  {
    id: 'task-detail.labels',
    kind: 'single',
    key: 'l',
    displayKeys: ['L'],
    label: 'Edit labels',
    description: 'Open label controls.',
    scope: 'task-detail',
    discoverabilityGroup: 'editing',
    preventDefault: true,
  },
  {
    id: 'task-detail.status',
    kind: 'single',
    key: 's',
    displayKeys: ['S'],
    label: 'Change status',
    description: 'Open status controls.',
    scope: 'task-detail',
    discoverabilityGroup: 'editing',
    preventDefault: true,
  },
  {
    id: 'task-detail.comment',
    kind: 'single',
    key: 'c',
    displayKeys: ['C'],
    label: 'Focus comment',
    description: 'Focus the comment editor.',
    scope: 'task-detail',
    discoverabilityGroup: 'focus',
    preventDefault: true,
  },
  {
    id: 'task-detail.edit-description',
    kind: 'single',
    key: 'e',
    displayKeys: ['E'],
    label: 'Edit description',
    description: 'Focus the description editor.',
    scope: 'task-detail',
    discoverabilityGroup: 'editing',
    preventDefault: true,
  },
];

export const OVERLAY_SHORTCUT_DEFINITIONS: readonly ShortcutDefinition[] = [
  {
    id: 'overlay.close',
    kind: 'single',
    key: 'escape',
    displayKeys: ['Esc'],
    label: 'Close overlay',
    description: 'Close the shortcut overlay and restore focus.',
    scope: 'overlay',
    discoverabilityGroup: 'support',
    allowInInput: true,
    preventDefault: true,
  },
];

export const SHORTCUT_DEFINITIONS: readonly ShortcutDefinition[] = [
  ...GLOBAL_SHORTCUT_DEFINITIONS,
  ...BOARD_LIST_SHORTCUT_DEFINITIONS,
  ...TASK_DETAIL_SHORTCUT_DEFINITIONS,
  ...OVERLAY_SHORTCUT_DEFINITIONS,
];

export const PRIORITY_KEY_TO_PRIORITY: Readonly<Record<'1' | '2' | '3' | '4' | '5', TaskPriority>> =
  {
    '1': 'critical',
    '2': 'high',
    '3': 'medium',
    '4': 'low',
    '5': 'none',
  };

export const UNMAPPED_PRIORITY_KEYS = ['6', '7', '8', '9'] as const;
