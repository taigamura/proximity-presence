export const strings = {
  nearby: 'Someone you know is nearby.',
  idle: '',
  sleeping_permission: 'Background location is off. Proximity Presence is sleeping.',
  sleeping_friends: 'Add more friends to start receiving presence signals.',

  // Onboarding screen
  onboarding_title: 'Proximity Presence',
  onboarding_body:
    'This app tells you when a friend is roughly nearby — nothing more. ' +
    'No names, no map, no history.\n\n' +
    'To do this, it needs to know your approximate location in the background. ' +
    'Your precise coordinates are never stored or shared — only a coarse area ' +
    '(~1 km cell) is used for matching, then discarded.',
  onboarding_cta: 'Enable background location',
  onboarding_skip: 'Not now',
} as const;

export type StringKey = keyof typeof strings;
