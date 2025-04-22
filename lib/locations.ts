export const LOCATIONS = [
  'Hyderabad',
  'Secunderabad',
  'Madhapur',
  'Gachibowli',
  'Kukatpally',
  'HITEC City',
  'Jubilee Hills',
  'Banjara Hills',
  'Ameerpet',
  'LB Nagar',
  'Dilsukhnagar',
  'Uppal',
  'Miyapur',
  'KPHB',
  'Kondapur'
] as const;

export type Location = typeof LOCATIONS[number];

export function isValidLocation(location: string): location is Location {
  return LOCATIONS.includes(location as Location);
}

export default LOCATIONS; 