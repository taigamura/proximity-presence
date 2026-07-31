export const strings = {
  nearby: 'Someone you know is nearby.',
  idle: '',
  sleeping_permission: 'Background location is off. Proximity Presence is sleeping.',
  sleeping_friends: 'Add more friends to start receiving presence signals.',
} as const;

export type StringKey = keyof typeof strings;
