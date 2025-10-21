// Gear categories for Czech outdoor rental market
export const GEAR_CATEGORIES = [
  { value: 'ferraty', label: 'Ferraty & Via Ferrata' },
  { value: 'lezeni', label: 'Lezení & Horolezectví' },
  { value: 'zimni', label: 'Zimní výbava' },
  { value: 'skialpinismus', label: 'Skialpinismus' },
  { value: 'camping', label: 'Camping & Bivak' },
  { value: 'vodacke', label: 'Vodácké sporty' },
  { value: 'cyklo', label: 'Cyklistika & Bikepacking' },
  { value: 'other', label: 'Ostatní' },
] as const;

// Item states for inventory management
export const ITEM_STATES = [
  { value: 'available', label: 'Available', color: 'green' },
  { value: 'reserved', label: 'Reserved', color: 'blue' },
  { value: 'maintenance', label: 'Maintenance', color: 'yellow' },
  { value: 'retired', label: 'Retired', color: 'gray' },
] as const;

// Condition levels
export const CONDITIONS = [
  { value: 'new', label: 'New' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
] as const;

// Type exports for TypeScript
export type GearCategory = typeof GEAR_CATEGORIES[number]['value'];
export type ItemState = typeof ITEM_STATES[number]['value'];
export type Condition = typeof CONDITIONS[number]['value'];
