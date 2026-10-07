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
  extraction: { x: 360, y: 679, links: ['entry'] },
  entry: { x: 360, y: 615, links: ['extraction', 'hall_south', 'hall_left_south'] },
  hall_left_south: {x:315,y:570,links:['entry','hall_left_mid']},
  hall_left_mid: {x:315,y:405,links:['hall_left_south','hall_left_north']},
  hall_left_north: {x:390,y:390,links:['hall_left_mid','hall']},
  hall_south: { x: 450, y: 570, links: ['entry', 'hall_east'] },
  hall_east: { x: 510, y: 540, links: ['hall_south', 'hall_north'] },
  hall_north: { x: 510, y: 400, links: ['hall_east', 'hall'] },
  hall: { x: 470, y: 390, links: ['hall_north', 'hall_left_north', 'junction'] },
  junction: { x: 710, y: 390, links: ['hall', 'security', 'vault_door'] },
  security: { x: 710, y: 250, links: ['junction'] },
  vault_door: { x: 710, y: 580, links: ['junction', 'vault_entry'] },
  vault_entry: { x: 710, y: 650, links: ['vault_door','relic'] },
  relic: { x: 675, y: 700, links: ['vault_entry'] },
};
