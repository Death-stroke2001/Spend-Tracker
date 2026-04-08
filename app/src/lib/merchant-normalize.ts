/**
 * Merchant Name Normalizer
 *
 * Cleans up raw merchant strings from bank SMS into human-readable names.
 * Handles abbreviations, ref suffixes, city names, and casing.
 */

// Known abbreviation mappings
const ABBREVIATION_MAP: Record<string, string> = {
  'amzn': 'Amazon',
  'amz': 'Amazon',
  'amazon.in': 'Amazon',
  'amazonpay': 'Amazon Pay',
  'amazon pay': 'Amazon Pay',
  'amazonin': 'Amazon',
  'swgy': 'Swiggy',
  'swiggy': 'Swiggy',
  'fkrt': 'Flipkart',
  'flipkrt': 'Flipkart',
  'flipkart': 'Flipkart',
  'zomato': 'Zomato',
  'zmto': 'Zomato',
  'ola': 'Ola',
  'olacabs': 'Ola',
  'uber': 'Uber',
  'uber bv': 'Uber',
  'ubereats': 'Uber Eats',
  'netflx': 'Netflix',
  'netflix': 'Netflix',
  'spotify': 'Spotify',
  'gpay': 'Google Pay',
  'googlepay': 'Google Pay',
  'phonepe': 'PhonePe',
  'phnepe': 'PhonePe',
  'paytm': 'Paytm',
  'pytm': 'Paytm',
  'myntra': 'Myntra',
  'ajio': 'Ajio',
  'nykaa': 'Nykaa',
  'meesho': 'Meesho',
  'cred': 'CRED',
  'irctc': 'IRCTC',
  'makemytrip': 'MakeMyTrip',
  'mmt': 'MakeMyTrip',
  'goibibo': 'Goibibo',
  'cleartrip': 'Cleartrip',
  'bigbasket': 'BigBasket',
  'blinkit': 'Blinkit',
  'zepto': 'Zepto',
  'dmart': 'DMart',
  'jiomart': 'JioMart',
  'hotstar': 'Hotstar',
  'disneyhotstar': 'Disney+ Hotstar',
  'prime': 'Amazon Prime',
  'youtube': 'YouTube',
  'ytpremium': 'YouTube Premium',
  'apple': 'Apple',
  'hpcl': 'HPCL',
  'bpcl': 'BPCL',
  'iocl': 'IOCL',
  'indianoil': 'Indian Oil',
  'shell': 'Shell',
  'tatapower': 'Tata Power',
  'bescom': 'BESCOM',
  'bses': 'BSES',
  'jio': 'Jio',
  'airtel': 'Airtel',
  'vi': 'Vi',
  'bsnl': 'BSNL',
  'mahanagar gas': 'Mahanagar Gas',
  'apollo': 'Apollo Pharmacy',
  'pharmeasy': 'PharmEasy',
  'netmeds': 'Netmeds',
  '1mg': '1mg',
  'practo': 'Practo',
  'bookmyshow': 'BookMyShow',
  'bms': 'BookMyShow',
  'pvr': 'PVR',
  'inox': 'INOX',
  'dominos': "Domino's",
  'mcdonalds': "McDonald's",
  'mcd': "McDonald's",
  'kfc': 'KFC',
  'starbucks': 'Starbucks',
  'sbux': 'Starbucks',
  'chaayos': 'Chaayos',
  'dunzo': 'Dunzo',
  'udemy': 'Udemy',
  'coursera': 'Coursera',
  'unacademy': 'Unacademy',
  'byjus': "Byju's",
  'cultfit': 'Cult.fit',
  'cult.fit': 'Cult.fit',
  'rapido': 'Rapido',
  'tataneu': 'Tata Neu',
  'croma': 'Croma',
  'reliance': 'Reliance',
  'reliancefresh': 'Reliance Fresh',
  'razorpay': 'Razorpay',
  'dreamplug': 'CRED',
  'tatacliq': 'Tata CLiQ',
  'lenskart': 'Lenskart',
  'pepperfry': 'Pepperfry',
  'urbanclap': 'Urban Company',
  'urbancompany': 'Urban Company',
};

// Suffixes/patterns to strip from merchant names
const STRIP_PATTERNS = [
  /\s*(?:order|txn|ref|trn|upi|imps|neft|rtgs)\s*(?:no\.?|id|#)?\s*[:\s]*[A-Za-z0-9]+$/i,
  /\s*\d{6,}$/,                          // trailing ref numbers
  /\s*[A-Z]{3,}\d{6,}/,                  // alphanumeric refs like UPI12345678
  /\s*@[a-zA-Z]+$/,                      // UPI VPA suffixes like @upi, @ybl
  /\s*(?:pvt|ltd|private|limited|inc|llp|corp)\.?$/i,
  /\s*(?:india|in|mumbai|delhi|bangalore|bengaluru|chennai|hyderabad|pune|kolkata|gurgaon|noida)$/i,
  /\s*\*+\d*$/,                          // trailing asterisks with digits
];

/**
 * Normalize a raw merchant string from SMS into a clean, human-readable name.
 */
export function normalizeMerchant(raw: string): string {
  if (!raw || !raw.trim()) return '';

  let cleaned = raw.trim();

  // Remove surrounding quotes
  cleaned = cleaned.replace(/^["']|["']$/g, '');

  // Apply strip patterns
  for (const pattern of STRIP_PATTERNS) {
    cleaned = cleaned.replace(pattern, '');
  }

  cleaned = cleaned.trim();

  // Try abbreviation lookup (lowercase, no spaces/dots)
  const lookupKey = cleaned.toLowerCase().replace(/[\s.\-_]/g, '');
  if (ABBREVIATION_MAP[lookupKey]) {
    return ABBREVIATION_MAP[lookupKey];
  }

  // Try partial match: check if any abbreviation key is contained in the cleaned text
  const lowerCleaned = cleaned.toLowerCase();
  for (const [key, value] of Object.entries(ABBREVIATION_MAP)) {
    if (lowerCleaned.includes(key) && key.length >= 3) {
      return value;
    }
  }

  // Title case if all uppercase or all lowercase
  if (cleaned === cleaned.toUpperCase() || cleaned === cleaned.toLowerCase()) {
    cleaned = cleaned
      .toLowerCase()
      .replace(/(?:^|\s)\w/g, (c) => c.toUpperCase());
  }

  // Final trim
  return cleaned.trim() || raw.trim();
}
