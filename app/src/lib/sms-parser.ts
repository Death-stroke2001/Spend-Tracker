/**
 * SMS Parser Engine
 *
 * Parses Indian bank SMS messages into structured transaction data.
 * Supports single and bulk parsing.
 */

import {
  identifyBank,
  getFilterReason,
  extractAmount,
  extractType,
  extractAccountHint,
  extractMerchant,
  extractBalance,
  parseSmsDate,
} from './sms-bank-patterns';
import { normalizeMerchant } from './merchant-normalize';

export interface ParsedSms {
  rawText: string;
  amount: number;
  type: 'debit' | 'credit';
  merchant: string;
  bankIdentifier: string;
  accountHint: string;
  date: string;
  balance: number | null;
  isValid: boolean;
  filterReason: string | null;
}

/**
 * Parse a single SMS message into structured transaction data.
 */
export function parseSms(text: string): ParsedSms {
  const trimmed = text.trim();

  // Default result
  const result: ParsedSms = {
    rawText: trimmed,
    amount: 0,
    type: 'debit',
    merchant: '',
    bankIdentifier: 'Unknown',
    accountHint: '',
    date: new Date().toISOString().split('T')[0],
    balance: null,
    isValid: false,
    filterReason: null,
  };

  if (!trimmed) {
    result.filterReason = 'empty';
    return result;
  }

  // Check if this SMS should be filtered
  const filterReason = getFilterReason(trimmed);
  if (filterReason) {
    result.filterReason = filterReason;
    return result;
  }

  // Identify bank
  result.bankIdentifier = identifyBank(trimmed);

  // Extract amount
  result.amount = extractAmount(trimmed);
  if (result.amount <= 0) {
    result.filterReason = 'no_amount';
    return result;
  }

  // Extract type
  result.type = extractType(trimmed);

  // Extract account hint
  result.accountHint = extractAccountHint(trimmed);

  // Extract date
  result.date = parseSmsDate(trimmed);

  // Extract merchant
  const rawMerchant = extractMerchant(trimmed);
  result.merchant = normalizeMerchant(rawMerchant);

  // Extract balance
  result.balance = extractBalance(trimmed);

  // Mark as valid
  result.isValid = true;

  return result;
}

/**
 * Parse multiple SMS messages (separated by blank lines or double newlines).
 * Returns array of parsed results, including filtered ones.
 */
export function parseBulkSms(text: string): ParsedSms[] {
  if (!text.trim()) return [];

  // Split by blank lines (one or more empty lines)
  const messages = text
    .split(/\n\s*\n/)
    .map(m => m.trim())
    .filter(m => m.length > 0);

  // If no blank-line splits found, try single-newline split
  // (each line might be a separate SMS)
  if (messages.length <= 1 && text.includes('\n')) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 10);
    // Only treat as separate SMS if lines look like individual messages
    // (have amount patterns in them)
    const amountPattern = /(?:Rs\.?|INR|₹)\s*[\d,]+/i;
    const linesWithAmounts = lines.filter(l => amountPattern.test(l));
    if (linesWithAmounts.length > 1) {
      return linesWithAmounts.map(parseSms);
    }
  }

  return messages.map(parseSms);
}
