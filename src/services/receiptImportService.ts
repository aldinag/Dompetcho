import { supabase } from '../lib/supabase';
import { detectParser } from '../parsers';
import { recognizeText } from './ocrService';
import { CreateExpenseInput, createExpense } from './expenseService';
import { Expense, ReceiptScan } from '../types';
import { timestampFromLocal } from '../utils/timestamp';

export async function importReceiptImage(userId: string, imageUri: string): Promise<ReceiptScan> {
  const rawText = await recognizeText(imageUri);
  const parser = detectParser(rawText);
  const parsed = parser?.parse(rawText) ?? null;

  const { data, error } = await supabase
    .from('receipt_scans')
    .insert({
      user_id: userId,
      raw_ocr_text: rawText,
      image_uri: imageUri,
      bank_detected: parser ? parser.bankId : 'unrecognized',
      parsed_amount: parsed?.amount ?? null,
      parsed_date: parsed?.date ? timestampFromLocal(parsed.date, parsed.time) : null,
      parsed_recipient: parsed?.recipientName ?? null,
      parsed_reference_no: parsed?.referenceNo ?? null,
      parsed_note: parsed?.parsedNote ?? null,
      status: 'pending_review',
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function confirmReceiptScan(
  receiptScanId: string,
  expenseInput: CreateExpenseInput,
): Promise<Expense> {
  const expense = await createExpense(expenseInput);
  const { error } = await supabase
    .from('receipt_scans')
    .update({ expense_id: expense.id, status: 'confirmed' })
    .eq('id', receiptScanId);
  if (error) throw error;
  return expense;
}

export async function discardReceiptScan(receiptScanId: string): Promise<void> {
  const { error } = await supabase
    .from('receipt_scans')
    .update({ status: 'discarded' })
    .eq('id', receiptScanId);
  if (error) throw error;
}
