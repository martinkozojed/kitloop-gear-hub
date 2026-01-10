import { supabase } from './supabase';
import { logger } from './logger';

export interface AvailabilityResult {
  available: number;
  total: number;
  quantityAvailable: number;
  isAvailable: boolean;
  overlappingCount: number;
  message: string;
}

/**
 * Check if gear is available for a date range
 *
 * Strategy: Calculate dynamically, don't modify quantity_available
 * available = quantity_available - COUNT(overlapping active reservations)
 *
 * @param gearId - Gear item UUID
 * @param startDate - Start of rental period
 * @param endDate - End of rental period
 * @param excludeReservationId - (Optional) Exclude this reservation when editing
 */
export async function checkAvailability(
  gearId: string,
  startDate: Date,
  endDate: Date,
  excludeReservationId?: string
): Promise<AvailabilityResult> {

  // Validate dates
  if (endDate <= startDate) {
    throw new Error('Konec musí být po začátku');
  }

  // Cannot book in the past (with 1 minute buffer)
  const now = new Date();
  now.setMinutes(now.getMinutes() - 1); // Small buffer for clock skew
  if (startDate < now) {
    throw new Error('Nelze rezervovat v minulosti');
  }

  // 1. Get gear item availability
  const { data: gear, error: gearError } = await supabase
    .from('gear_items')
    .select('quantity_total, quantity_available, name, active')
    .eq('id', gearId)
    .single();

  if (gearError || !gear) {
    logger.error('Gear fetch error', gearError);
    throw new Error('Vybavení nebylo nalezeno');
  }

  // Check if gear is active
  if (!gear.active) {
    return {
      available: 0,
      total: gear.quantity_total || 0,
      quantityAvailable: 0,
      isAvailable: false,
      overlappingCount: 0,
      message: 'Vybavení není aktivní',
    };
  }

  // 2. Get overlapping reservations
  // Two date ranges overlap if: (start1 < end2) AND (end1 > start2)
  const { data: reservations, error: reservationError } = await supabase
    .from('reservations')
    .select('id, start_date, end_date, status')
    .eq('gear_id', gearId)
    .in('status', ['hold', 'confirmed', 'active']) // Only count active/held bookings
    .lt('start_date', endDate.toISOString())
    .gt('end_date', startDate.toISOString());

  if (reservationError) {
    logger.error('Reservation fetch error', reservationError);
    throw new Error('Chyba při kontrole dostupnosti');
  }

  // 3. Count overlapping (exclude current reservation if editing)
  const overlapping = (reservations || []).filter(r =>
    excludeReservationId ? r.id !== excludeReservationId : true
  );

  const overlappingCount = overlapping.length;
  const quantityAvailable = gear.quantity_available || 0;
  const available = Math.max(0, quantityAvailable - overlappingCount);

  // Generate user-friendly message
  let message: string;
  if (available > 0) {
    if (available === quantityAvailable) {
      message = `Volné: ${available} ks`;
    } else {
      message = `Volné: ${available} z ${quantityAvailable} ks`;
    }
  } else {
    if (quantityAvailable === 0) {
      message = 'Vybavení není dostupné';
    } else {
      message = `Obsazeno (${overlappingCount} rezervací)`;
    }
  }

  logger.debug('Availability check:', {
    gear: gear.name,
    quantityAvailable,
    overlappingCount,
    available,
    isAvailable: available > 0
  });

  return {
    available,
    total: gear.quantity_total || 0,
    quantityAvailable,
    isAvailable: available > 0,
    overlappingCount,
    message,
  };
}

/**
 * Check availability for a specific Product Variant (Inventory 2.0)
 */
export async function checkVariantAvailability(
  variantId: string,
  startDate: Date,
  endDate: Date,
  excludeReservationId?: string
): Promise<AvailabilityResult> {
  // Validate dates
  if (endDate <= startDate) {
    throw new Error('Konec musí být po začátku');
  }
  const now = new Date();
  now.setMinutes(now.getMinutes() - 1);
  if (startDate < now) {
    throw new Error('Nelze rezervovat v minulosti');
  }

  // 1. Get Total Assets for this Variant
  // We count existing assets that are not retired or lost.
  const { count: totalAssets, error: assetError } = await supabase
    .from('assets')
    .select('*', { count: 'exact', head: true })
    .eq('variant_id', variantId)
    .not('status', 'in', '("retired","lost")'); // Use Query Filter syntax properly

  if (assetError) {
    logger.error('Asset count error', assetError);
    throw new Error('Chyba při kontrole kapacity varianty');
  }

  const quantityTotal = totalAssets || 0;

  if (quantityTotal === 0) {
    return {
      available: 0,
      total: 0,
      quantityAvailable: 0,
      isAvailable: false,
      overlappingCount: 0,
      message: 'Žádné kusy skladem',
    };
  }

  // 2. Get overlapping reservations for this variant
  const { data: reservations, error: reservationError } = await supabase
    .from('reservations')
    .select('id, start_date, end_date, status')
    .eq('product_variant_id', variantId)
    .in('status', ['hold', 'confirmed', 'active'])
    .lt('start_date', endDate.toISOString())
    .gt('end_date', startDate.toISOString());

  if (reservationError) {
    logger.error('Reservation fetch error', reservationError);
    throw new Error('Chyba při kontrole dostupnosti rezervací');
  }

  // 3. Count overlapping
  const overlapping = (reservations || []).filter(r =>
    excludeReservationId ? r.id !== excludeReservationId : true
  );

  const overlappingCount = overlapping.length;
  // Available = Total Assets - Booked Slots
  const available = Math.max(0, quantityTotal - overlappingCount);

  let message: string;
  if (available > 0) {
    message = `Volné: ${available} z ${quantityTotal} ks`;
  } else {
    message = `Obsazeno (${overlappingCount} rezervací)`;
  }

  return {
    available,
    total: quantityTotal,
    quantityAvailable: quantityTotal, // "quantityAvailable" in legacy context meant total active. 
    isAvailable: available > 0,
    overlappingCount,
    message,
  };
}

/**
 * Calculate number of days between dates (minimum 1)
 * Partial day = 1 full day charge
 */
export function calculateDays(startDate: Date, endDate: Date): number {
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays);
}

/**
 * Calculate total price based on daily rate and duration
 */
export function calculatePrice(
  pricePerDay: number,
  startDate: Date,
  endDate: Date
): number {
  const days = calculateDays(startDate, endDate);
  return Math.round(days * pricePerDay); // Round to avoid floating point issues
}

/**
 * Format price in Czech currency format
 */
export function formatPrice(price: number): string {
  return `${price.toLocaleString('cs-CZ')} Kč`;
}

/**
 * Validate Czech or Slovak phone number
 * Accepts: +420 XXX XXX XXX or +421 XXX XXX XXX
 * Also accepts without spaces
 */
export function validatePhone(phone: string): boolean {
  // Remove all spaces
  const cleaned = phone.replace(/\s/g, '');

  // Check format: +420 or +421 followed by 9 digits
  const phoneRegex = /^(\+420|\+421)\d{9}$/;
  return phoneRegex.test(cleaned);
}

/**
 * Format phone number with spaces
 * Input: +420123456789 → Output: +420 123 456 789
 */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\s/g, '');

  if (!validatePhone(cleaned)) {
    return phone; // Return as-is if invalid
  }

  // Format as +XXX XXX XXX XXX
  const prefix = cleaned.substring(0, 4); // +420 or +421
  const part1 = cleaned.substring(4, 7);
  const part2 = cleaned.substring(7, 10);
  const part3 = cleaned.substring(10, 13);

  return `${prefix} ${part1} ${part2} ${part3}`;
}

/**
 * Format date range for display
 * Example: "15.10.2024 - 18.10.2024"
 */
export function formatDateRange(startDate: Date, endDate: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  };

  const start = startDate.toLocaleDateString('cs-CZ', options);
  const end = endDate.toLocaleDateString('cs-CZ', options);

  return `${start} - ${end}`;
}
