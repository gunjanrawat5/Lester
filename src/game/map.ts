export const MAP_WIDTH = 1100;
export const MAP_HEIGHT = 850;
export const rooms = {
  entrance: { x: 315, y: 640, width: 90, height: 105 },
  gallery: { x: 220, y: 300, width: 315, height: 320 },
  security: { x: 630, y: 100, width: 245, height: 180 },
  vault: { x: 620, y: 620, width: 225, height: 155 },
} as const;
export const perimeter: [number, number][] = [
  [200,280],[290,280],[290,260],[470,260],[470,280],[555,280],
  [555,350],[610,350],[610,80],[895,80],[895,300],[755,300],
  [755,600],[865,600],[865,795],[600,795],[600,600],[665,600],
  [665,430],[555,430],[555,640],[425,640],[425,765],[295,765],
  [295,640],[200,640],
];
export const waypoints = {
  extraction: { x: 360, y: 708, links: ['entry'] },
  entry: { x: 360, y: 615, links: ['extraction', 'hall'] },
  hall: { x: 470, y: 390, links: ['entry', 'junction'] },
  junction: { x: 710, y: 390, links: ['hall', 'security', 'vault_door'] },
  security: { x: 710, y: 250, links: ['junction'] },
  vault_door: { x: 710, y: 610, links: ['junction', 'relic'] },
  relic: { x: 730, y: 692, links: ['vault_door'] },
};
