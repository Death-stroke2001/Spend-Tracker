/**
 * Indian Bank SMS Patterns
 *
 * Regex patterns for extracting transaction data from Indian bank SMS alerts.
 * Supports HDFC, ICICI, SBI, Axis, Kotak, Yes Bank, PNB, IndusInd, BOB,
 * IDFC First, and UPI apps (Google Pay, PhonePe, Paytm).
 */

export interface BankPattern {
  bankName: string;
  senderIds: string[];           // e.g. "HDFCBK", "ICICIB"
  keywords: string[];            // keywords that appear in SMS body
}

// Bank identification by sender ID or keywords in body
export const BANK_IDENTIFIERS: BankPattern[] = [
  { bankName: 'HDFC', senderIds: ['HDFCBK', 'HDFCBN', 'HDFCCC'], keywords: ['hdfc bank', 'hdfc card'] },
  { bankName: 'ICICI', senderIds: ['ICICIB', 'ICICIR'], keywords: ['icici bank', 'icici card'] },
  { bankName: 'SBI', senderIds: ['SBIBNK', 'SBIPSG', 'SBIINB'], keywords: ['sbi', 'state bank'] },
  { bankName: 'Axis', senderIds: ['AXISBK', 'AXISBN'], keywords: ['axis bank', 'axis card'] },
  { bankName: 'Kotak', senderIds: ['KOTAKB', 'KOTKBK'], keywords: ['kotak', 'kotak bank'] },
  { bankName: 'Yes Bank', senderIds: ['YESBK', 'YESBNK'], keywords: ['yes bank'] },
  { bankName: 'PNB', senderIds: ['PNBSMS'], keywords: ['pnb', 'punjab national'] },
  { bankName: 'IndusInd', senderIds: ['INDBNK', 'IDFCFB'], keywords: ['indusind'] },
  { bankName: 'BOB', senderIds: ['BOBTXN', 'BABORQ'], keywords: ['bank of baroda', 'bob'] },
  { bankName: 'IDFC First', senderIds: ['IDFCFB', 'IDFCBK'], keywords: ['idfc first', 'idfc bank'] },
  { bankName: 'Google Pay', senderIds: ['GGLPAY'], keywords: ['google pay', 'gpay'] },
  { bankName: 'PhonePe', senderIds: ['PHNEPE'], keywords: ['phonepe'] },
  { bankName: 'Paytm', senderIds: ['PAYTMB', 'PYTM'], keywords: ['paytm'] },
  { bankName: 'CITI', senderIds: ['CITIBN', 'CITIBK'], keywords: ['citibank', 'citi card'] },
  { bankName: 'RBL', senderIds: ['RBLBNK'], keywords: ['rbl bank'] },
];

// Patterns to identify the SMS as a filter-out candidate
export const FILTER_PATTERNS = {
  otp: /\b(otp|one.?time.?password|verification.?code|CVV|PIN)\b/i,
  promo: /\b(offer|cashback|reward|congratulations|eligible|apply now|pre.?approved|limit.?increase|upgrade)\b/i,
  balanceOnly: /^(?!.*(?:debited|credited|spent|received|transferred|paid|withdrawn|deposited)).*(?:balance|bal)\b/i,
  loginAlert: /\b(logged.?in|login|sign.?in|password.?changed)\b/i,
};

// Amount extraction patterns (Indian formats)
// Matches: Rs.450, Rs 450, INR 450.00, Rs.2,340.00, INR 1,00,000
export const AMOUNT_PATTERNS = [
  /(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?)/i,
  /(?:amount|amt)(?:\s+of)?\s*(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
  /([\d,]+(?:\.\d{1,2})?)\s*(?:Rs\.?|INR|₹)/i,
];

// Debit indicators
export const DEBIT_PATTERNS = [
  /\b(?:debited|debit|spent|paid|withdrawn|purchase|charged|txn|transaction)\b/i,
  /\b(?:sent|transferred)\b.*(?:from|via)\b/i,
  /\bdr\b/i,
];

// Credit indicators
export const CREDIT_PATTERNS = [
  /\b(?:credited|credit|received|deposited|refund|cashback|reversed)\b/i,
  /\b(?:sent|transferred)\b.*\bto\b.*(?:your|a\/c)/i,
  /\bcr\b/i,
];

// Account number hint (last 4-6 digits)
export const ACCOUNT_PATTERNS = [
  /(?:a\/c|acct?|account|card|xx|x{2,})\s*(?:no\.?\s*)?[x*]*(\d{4,6})/i,
  /(?:ending|ending\s+with)\s*(\d{4,6})/i,
  /xx(\d{4})/i,
];

// Date extraction patterns (Indian formats)
export const DATE_PATTERNS = [
  // DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY
  /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/,
  // DD-MM-YY or DD/MM/YY
  /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2})\b/,
  // DD-Mon-YYYY or DD-Mon-YY (e.g., 27-Mar-26, 01-Jan-2026)
  /(\d{1,2})[\/\-.]?(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[\/\-.]?(\d{2,4})/i,
  // Mon DD, YYYY
  /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s+(\d{4})/i,
];

// Merchant/Info extraction patterns
export const MERCHANT_PATTERNS = [
  /(?:info[:\s]*|at\s+|to\s+|towards\s+|for\s+|merchant[:\s]*|VPA[:\s]*)([A-Za-z0-9@._\s\-&]+?)(?:\s*(?:on|ref|txn|avl|bal|\.|$))/i,
  /(?:Info:\s*)(.+?)(?:\s*(?:Avl|Bal|Ref|\.|$))/i,
  /(?:at|to|from)\s+([A-Za-z][A-Za-z0-9\s\-&.]+?)(?:\s+(?:on|for|ref|using)\b)/i,
  /(?:VPA|UPI)\s*[:\s]*([a-zA-Z0-9._@\-]+)/i,
];

// Available balance
export const BALANCE_PATTERNS = [
  /(?:avl\.?\s*bal\.?|available\s*balance|bal[:\s])\s*(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
  /(?:balance)\s*(?:is)?\s*(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?)/i,
];

// Reference number
export const REFERENCE_PATTERNS = [
  /(?:ref\.?\s*(?:no\.?)?|txn\s*(?:no\.?)?|reference|UTR)\s*[:\s]*([A-Za-z0-9]+)/i,
];

/**
 * Identify which bank sent the SMS based on sender ID or body keywords
 */
export function identifyBank(text: string): string {
  const upper = text.toUpperCase();
  for (const bank of BANK_IDENTIFIERS) {
    for (const sid of bank.senderIds) {
      if (upper.includes(sid)) return bank.bankName;
    }
  }
  const lower = text.toLowerCase();
  for (const bank of BANK_IDENTIFIERS) {
    for (const kw of bank.keywords) {
      if (lower.includes(kw)) return bank.bankName;
    }
  }
  return 'Unknown';
}

/**
 * Check if SMS should be filtered out (OTP, promo, balance-only, etc.)
 */
export function getFilterReason(text: string): string | null {
  if (FILTER_PATTERNS.otp.test(text)) return 'otp';
  if (FILTER_PATTERNS.loginAlert.test(text)) return 'login_alert';
  // Check promo only if no transaction keywords present
  const hasTransaction = DEBIT_PATTERNS.some(p => p.test(text)) || CREDIT_PATTERNS.some(p => p.test(text));
  if (!hasTransaction && FILTER_PATTERNS.promo.test(text)) return 'promo';
  if (!hasTransaction && FILTER_PATTERNS.balanceOnly.test(text)) return 'balance_only';
  return null;
}

/**
 * Parse the month name abbreviation to a 0-indexed month number
 */
const MONTH_MAP: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/**
 * Parse a date string from SMS into YYYY-MM-DD format.
 * Returns today's date if parsing fails.
 */
export function parseSmsDate(text: string): string {
  const today = new Date();

  for (const pattern of DATE_PATTERNS) {
    const match = text.match(pattern);
    if (!match) continue;

    let day: number, month: number, year: number;

    // DD-Mon-YY or DD-Mon-YYYY
    if (/jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i.test(match[2] || '')) {
      day = parseInt(match[1]);
      month = MONTH_MAP[match[2].toLowerCase().substring(0, 3)] ?? 0;
      year = parseInt(match[3]);
    }
    // Mon DD, YYYY
    else if (/jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i.test(match[1] || '')) {
      month = MONTH_MAP[match[1].toLowerCase().substring(0, 3)] ?? 0;
      day = parseInt(match[2]);
      year = parseInt(match[3]);
    }
    // DD-MM-YYYY or DD-MM-YY
    else {
      day = parseInt(match[1]);
      month = parseInt(match[2]) - 1; // 0-indexed
      year = parseInt(match[3]);
    }

    // Handle 2-digit year
    if (year < 100) {
      year += year < 50 ? 2000 : 1900;
    }

    // Validate
    if (day >= 1 && day <= 31 && month >= 0 && month <= 11 && year >= 2000 && year <= 2100) {
      const d = new Date(year, month, day);
      return d.toISOString().split('T')[0];
    }
  }

  // Fallback: today's date
  return today.toISOString().split('T')[0];
}

/**
 * Extract amount from SMS text, returning 0 if not found
 */
export function extractAmount(text: string): number {
  for (const pattern of AMOUNT_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      // Remove commas from Indian number format (1,00,000.00)
      const cleaned = match[1].replace(/,/g, '');
      const amount = parseFloat(cleaned);
      if (!isNaN(amount) && amount > 0) return amount;
    }
  }
  return 0;
}

/**
 * Determine transaction type from SMS text
 */
export function extractType(text: string): 'debit' | 'credit' {
  const debitScore = DEBIT_PATTERNS.filter(p => p.test(text)).length;
  const creditScore = CREDIT_PATTERNS.filter(p => p.test(text)).length;
  return creditScore > debitScore ? 'credit' : 'debit';
}

/**
 * Extract account hint (last 4+ digits)
 */
export function extractAccountHint(text: string): string {
  for (const pattern of ACCOUNT_PATTERNS) {
    const match = text.match(pattern);
    if (match) return match[1];
  }
  return '';
}

/**
 * Extract raw merchant name from SMS
 */
export function extractMerchant(text: string): string {
  for (const pattern of MERCHANT_PATTERNS) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const merchant = match[1].trim();
      // Filter out obviously bad matches (numbers, too short)
      if (merchant.length >= 2 && !/^\d+$/.test(merchant)) {
        return merchant;
      }
    }
  }
  return '';
}

/**
 * Extract available balance if present
 */
export function extractBalance(text: string): number | null {
  for (const pattern of BALANCE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const cleaned = match[1].replace(/,/g, '');
      const bal = parseFloat(cleaned);
      if (!isNaN(bal)) return bal;
    }
  }
  return null;
}
