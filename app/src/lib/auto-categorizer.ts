/**
 * Auto-Categorizer
 *
 * Maps merchant names to spending categories using built-in rules.
 * Matches by lowercase substring. Falls back to "Miscellaneous".
 */

import type { Category } from '../types';

// Built-in merchant → category name mappings
// Keys are lowercase substrings to match against normalized merchant names
const BUILTIN_MAPPINGS: Record<string, string> = {
  // Food & Dining
  'swiggy': 'Food & Dining',
  'zomato': 'Food & Dining',
  'domino': 'Food & Dining',
  'mcdonald': 'Food & Dining',
  'kfc': 'Food & Dining',
  'starbucks': 'Food & Dining',
  'chaayos': 'Food & Dining',
  'behrouz': 'Food & Dining',
  'box8': 'Food & Dining',
  'eatfit': 'Food & Dining',
  'burger king': 'Food & Dining',
  'subway': 'Food & Dining',
  'pizza hut': 'Food & Dining',
  'haldiram': 'Food & Dining',
  'barbeque nation': 'Food & Dining',
  'chai point': 'Food & Dining',
  'faasos': 'Food & Dining',
  'rebel foods': 'Food & Dining',
  'eatsure': 'Food & Dining',
  'uber eats': 'Food & Dining',
  'magicpin': 'Food & Dining',
  'dineout': 'Food & Dining',

  // Groceries
  'bigbasket': 'Groceries',
  'blinkit': 'Groceries',
  'zepto': 'Groceries',
  'dmart': 'Groceries',
  'jiomart': 'Groceries',
  'reliance fresh': 'Groceries',
  'nature basket': 'Groceries',
  'more supermarket': 'Groceries',
  'spencer': 'Groceries',
  'star bazaar': 'Groceries',
  'easyday': 'Groceries',
  'grofers': 'Groceries',
  'dunzo': 'Groceries',
  'milkbasket': 'Groceries',
  'country delight': 'Groceries',
  'swiggy instamart': 'Groceries',

  // Shopping
  'amazon': 'Shopping',
  'flipkart': 'Shopping',
  'myntra': 'Shopping',
  'ajio': 'Shopping',
  'nykaa': 'Shopping',
  'meesho': 'Shopping',
  'croma': 'Shopping',
  'tata cliq': 'Shopping',
  'tata neu': 'Shopping',
  'lenskart': 'Shopping',
  'pepperfry': 'Shopping',
  'ikea': 'Shopping',
  'decathlon': 'Shopping',
  'reliance digital': 'Shopping',
  'shoppers stop': 'Shopping',
  'lifestyle': 'Shopping',
  'h&m': 'Shopping',
  'zara': 'Shopping',
  'westside': 'Shopping',

  // Transport
  'uber': 'Transport',
  'ola': 'Transport',
  'rapido': 'Transport',
  'metro': 'Transport',
  'irctc': 'Travel',
  'makemytrip': 'Travel',
  'goibibo': 'Travel',
  'cleartrip': 'Travel',
  'yatra': 'Travel',
  'easemytrip': 'Travel',
  'redbus': 'Travel',
  'indigo': 'Travel',
  'spicejet': 'Travel',
  'air india': 'Travel',
  'vistara': 'Travel',
  'oyo': 'Travel',

  // Subscriptions
  'netflix': 'Subscriptions',
  'spotify': 'Subscriptions',
  'hotstar': 'Subscriptions',
  'disney': 'Subscriptions',
  'prime video': 'Subscriptions',
  'amazon prime': 'Subscriptions',
  'youtube': 'Subscriptions',
  'apple': 'Subscriptions',
  'google play': 'Subscriptions',
  'google one': 'Subscriptions',
  'jio cinema': 'Subscriptions',
  'zee5': 'Subscriptions',
  'sony liv': 'Subscriptions',
  'audible': 'Subscriptions',

  // Fuel
  'hpcl': 'Fuel',
  'bpcl': 'Fuel',
  'iocl': 'Fuel',
  'indian oil': 'Fuel',
  'shell': 'Fuel',
  'petrol': 'Fuel',
  'diesel': 'Fuel',
  'fuel': 'Fuel',
  'hp petrol': 'Fuel',

  // Utilities & Bills
  'tata power': 'Utilities & Bills',
  'bescom': 'Utilities & Bills',
  'bses': 'Utilities & Bills',
  'jio': 'Utilities & Bills',
  'airtel': 'Utilities & Bills',
  'vi ': 'Utilities & Bills',
  'bsnl': 'Utilities & Bills',
  'mahanagar gas': 'Utilities & Bills',
  'adani gas': 'Utilities & Bills',
  'indane': 'Utilities & Bills',
  'piped gas': 'Utilities & Bills',
  'broadband': 'Utilities & Bills',
  'electricity': 'Utilities & Bills',
  'water bill': 'Utilities & Bills',

  // Health & Medical
  'apollo': 'Health & Medical',
  'pharmeasy': 'Health & Medical',
  'netmeds': 'Health & Medical',
  '1mg': 'Health & Medical',
  'practo': 'Health & Medical',
  'medplus': 'Health & Medical',
  'hospital': 'Health & Medical',
  'clinic': 'Health & Medical',
  'pharmacy': 'Health & Medical',
  'diagnostic': 'Health & Medical',
  'lab': 'Health & Medical',

  // Entertainment
  'bookmyshow': 'Entertainment',
  'pvr': 'Entertainment',
  'inox': 'Entertainment',
  'cinepolis': 'Entertainment',

  // Education
  'udemy': 'Education',
  'coursera': 'Education',
  'unacademy': 'Education',
  'byju': 'Education',
  'linkedin learning': 'Education',
  'skillshare': 'Education',

  // Fitness
  'cult.fit': 'Fitness',
  'cultfit': 'Fitness',
  'gym': 'Fitness',
  'gold gym': 'Fitness',
  'fitness': 'Fitness',

  // Rent & Housing
  'rent': 'Rent & Housing',
  'nobroker': 'Rent & Housing',
  'housing': 'Rent & Housing',
  'society maintenance': 'Rent & Housing',

  // EMI & Loan
  'emi': 'EMI & Loan',
  'loan': 'EMI & Loan',
  'bajaj finance': 'EMI & Loan',
  'bajaj finserv': 'EMI & Loan',

  // Insurance
  'insurance': 'Health & Medical',
  'lic': 'Health & Medical',
  'policybazaar': 'Health & Medical',

  // Payments / Wallets (these are intermediaries, not categories)
  'cred': 'Utilities & Bills',    // CRED is usually bill pay
  'razorpay': 'Shopping',          // Usually online purchases
};

export interface CategorizationResult {
  categoryId: string;
  categoryName: string;
  confidence: number;
  source: 'builtin' | 'learned' | 'default';
}

/**
 * Auto-categorize a merchant name using built-in mappings.
 *
 * @param merchant - The normalized merchant name
 * @param categories - The user's category list (to resolve name → id)
 * @param learnedMappings - Optional user-trained mappings (Phase 1B)
 */
export function categorize(
  merchant: string,
  categories: Category[],
  learnedMappings: { pattern: string; categoryId: string }[] = [],
): CategorizationResult {
  const lower = merchant.toLowerCase();

  // 1. Check learned mappings first (highest priority)
  for (const mapping of learnedMappings) {
    if (lower.includes(mapping.pattern.toLowerCase())) {
      const cat = categories.find(c => c.id === mapping.categoryId);
      if (cat) {
        return { categoryId: cat.id, categoryName: cat.name, confidence: 0.95, source: 'learned' };
      }
    }
  }

  // 2. Check built-in mappings
  for (const [pattern, categoryName] of Object.entries(BUILTIN_MAPPINGS)) {
    if (lower.includes(pattern)) {
      const cat = categories.find(c => c.name === categoryName && c.type === 'expense');
      if (cat) {
        return { categoryId: cat.id, categoryName: cat.name, confidence: 0.8, source: 'builtin' };
      }
    }
  }

  // 3. Fallback to Miscellaneous
  const misc = categories.find(c => c.name === 'Miscellaneous' && c.type === 'expense')
    || categories.find(c => c.type === 'expense');

  return {
    categoryId: misc?.id || '',
    categoryName: misc?.name || 'Miscellaneous',
    confidence: 0.1,
    source: 'default',
  };
}

/**
 * Categorize an income transaction
 */
export function categorizeIncome(
  merchant: string,
  categories: Category[],
): CategorizationResult {
  const lower = merchant.toLowerCase();

  if (lower.includes('salary') || lower.includes('payroll')) {
    const cat = categories.find(c => c.name === 'Salary' && c.type === 'income');
    if (cat) return { categoryId: cat.id, categoryName: cat.name, confidence: 0.9, source: 'builtin' };
  }

  if (lower.includes('refund') || lower.includes('cashback') || lower.includes('reversed')) {
    const cat = categories.find(c => c.name === 'Reimbursement Received' && c.type === 'income');
    if (cat) return { categoryId: cat.id, categoryName: cat.name, confidence: 0.8, source: 'builtin' };
  }

  if (lower.includes('interest')) {
    const cat = categories.find(c => c.name === 'Interest' && c.type === 'income');
    if (cat) return { categoryId: cat.id, categoryName: cat.name, confidence: 0.8, source: 'builtin' };
  }

  // Default income category
  const defaultIncome = categories.find(c => c.type === 'income');
  return {
    categoryId: defaultIncome?.id || '',
    categoryName: defaultIncome?.name || 'Income',
    confidence: 0.1,
    source: 'default',
  };
}
