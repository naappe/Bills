import {costPage} from './cost.js?v=5.9.5';

/**
 * Stable Price Intelligence entry point.
 *
 * The existing cost module remains the single source of truth for bill-line
 * parsing, pack normalization, price history, vendor comparisons and MVR cost
 * calculations. This wrapper gives the upgraded module its own route without
 * duplicating business logic or introducing database assumptions.
 */
export function priceIntelligencePage(){
  return costPage();
}

export default priceIntelligencePage;
