
/**
 * Kitloop API service
 * 
 * This file contains methods for communicating with the backend.
 * Currently, these are placeholders that will be replaced with actual
 * API calls once backend integration is complete.
 */

export interface RentalSubmission {
  rentalName: string;
  location: string;
  email: string;
  gearCategory: string;
  availability: string;
  image: File | null;
}

/**
 * Submits a rental listing for approval
 */
export async function submitRental(data: RentalSubmission) {
  // This is a placeholder that simulates an API call
  console.log('Submitting rental data:', data);
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Return a mock successful response
  return {
    success: true,
    message: 'Rental submitted successfully',
    id: `rental-${Math.random().toString(36).substring(2, 10)}`
  };
}

/**
 * Gets featured gear listings
 */
export async function getFeaturedGear() {
  // This is a placeholder that will be replaced with an actual API call
  console.log('Fetching featured gear');
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // Return mock data
  return [
    { id: 1, title: 'Mountain Tent', category: 'Tents' },
    { id: 2, title: 'Hiking Backpack', category: 'Backpacks' },
    { id: 3, title: 'Camp Stove', category: 'Cooking Equipment' },
  ];
}
