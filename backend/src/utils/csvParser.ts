/**
 * CSV Parser Utility
 * Handles proper parsing of CSV files including quoted fields and escaped quotes
 */

/**
 * Parse CSV content with proper handling of:
 * - Quoted fields (values containing commas within quotes)
 * - Escaped quotes within quoted fields ("" becomes ")
 * - CRLF and LF line endings
 * - Leading/trailing whitespace trimming
 * 
 * @param content - Raw CSV content as string
 * @returns Array of rows, where each row is an array of field strings
 */
export function parseCSV(content: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote within quotes
        currentField += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      // Row separator
      if (currentField || currentRow.length > 0) {
        currentRow.push(currentField.trim());
      }
      if (currentRow.length > 0 && currentRow.some(field => field !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
      // Skip \r if followed by \n
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
    } else {
      currentField += char;
    }
  }

  // Add last row
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim());
  }
  if (currentRow.length > 0 && currentRow.some(field => field !== '')) {
    rows.push(currentRow);
  }

  return rows;
}

/**
 * Parse a single CSV row into fields
 * Useful for parsing individual rows from a stream
 * 
 * @param row - Single CSV row string
 * @returns Array of field strings
 */
export function parseCSVRow(row: string): string[] {
  const fields: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    const nextChar = row[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      fields.push(currentField.trim());
      currentField = '';
    } else {
      currentField += char;
    }
  }

  fields.push(currentField.trim());
  return fields;
}

/**
 * Convert array of objects to CSV string
 * 
 * @param data - Array of objects to convert
 * @param headers - Optional headers array (defaults to object keys)
 * @returns CSV formatted string
 */
export function objectsToCSV(data: Record<string, any>[], headers?: string[]): string {
  if (data.length === 0) return '';

  const cols = headers || Object.keys(data[0]);
  const escapeField = (field: any): string => {
    const str = String(field ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines: string[] = [cols.join(',')];
  
  for (const row of data) {
    const values = cols.map(col => escapeField(row[col]));
    lines.push(values.join(','));
  }

  return lines.join('\n');
}

/**
 * Validate CSV structure
 * 
 * @param rows - Parsed CSV rows
 * @param expectedColumns - Minimum number of columns expected
 * @returns Object with isValid flag and error message if invalid
 */
export function validateCSVStructure(
  rows: string[][], 
  expectedColumns: number
): { isValid: boolean; error?: string } {
  if (rows.length === 0) {
    return { isValid: false, error: 'CSV file is empty' };
  }

  const headerRow = rows[0];
  if (headerRow.length < expectedColumns) {
    return { 
      isValid: false, 
      error: `Invalid CSV format. Expected at least ${expectedColumns} columns, found ${headerRow.length}` 
    };
  }

  return { isValid: true };
}

export default {
  parseCSV,
  parseCSVRow,
  objectsToCSV,
  validateCSVStructure,
};
