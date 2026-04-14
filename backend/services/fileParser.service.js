/**
 * File Parser Service
 * Parses Excel/CSV, Word (.docx), and PDF files to extract people data
 * for bulk import functionality.
 */

/**
 * Parse an uploaded file and extract people records
 * @param {Object} file - Multer file object with path, mimetype, originalname
 * @returns {Array} Array of parsed person records
 */
const parseFile = async (file) => {
  const ext = file.originalname.split('.').pop().toLowerCase();

  if (['xlsx', 'xls', 'csv'].includes(ext)) {
    return parseSpreadsheet(file);
  } else if (ext === 'docx') {
    return parseWord(file);
  } else if (ext === 'pdf') {
    return parsePDF(file);
  } else {
    throw new Error(`Unsupported file format: .${ext}. Supported: xlsx, xls, csv, docx, pdf`);
  }
};

/**
 * Parse Excel/CSV files using SheetJS
 */
const parseSpreadsheet = async (file) => {
  const XLSX = require('xlsx');
  const workbook = XLSX.readFile(file.path);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  return rawData.map((row) => mapRowToRecord(row));
};

/**
 * Parse Word .docx files using mammoth
 */
const parseWord = async (file) => {
  const mammoth = require('mammoth');
  const fs = require('fs');
  const buffer = fs.readFileSync(file.path);
  const result = await mammoth.extractRawText({ buffer });
  const text = result.value;

  return parseTextTable(text);
};

/**
 * Parse PDF files using pdf-parse
 */
const parsePDF = async (file) => {
  const pdfParse = require('pdf-parse');
  const fs = require('fs');
  const buffer = fs.readFileSync(file.path);
  const data = await pdfParse(buffer);

  return parseTextTable(data.text);
};

/**
 * Parse text content (from Word/PDF) into structured records
 * Attempts to detect tabular data from plain text
 */
const parseTextTable = (text) => {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    throw new Error('File does not contain enough data to import. Expected at least a header and one data row.');
  }

  // Try to detect delimiter (tab, comma, pipe)
  const firstLine = lines[0];
  let delimiter = '\t';
  if (firstLine.includes('|')) delimiter = '|';
  else if (firstLine.includes(',')) delimiter = ',';

  const headers = firstLine.split(delimiter).map((h) => h.trim().toLowerCase());
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(delimiter).map((v) => v.trim());
    if (values.length < 2) continue; // Skip malformed lines

    const row = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] || '';
    });

    const record = mapRowToRecord(row);
    if (record.fullName && record.email) {
      records.push(record);
    }
  }

  return records;
};

/**
 * Map a row object to a standard person record
 * Handles case-insensitive header matching
 */
const mapRowToRecord = (row) => {
  const get = (keys) => {
    for (const key of keys) {
      const found = Object.keys(row).find((k) => k.toLowerCase().replace(/[^a-z]/g, '') === key.toLowerCase().replace(/[^a-z]/g, ''));
      if (found && row[found]) return String(row[found]).trim();
    }
    return '';
  };

  const record = {
    fullName: get(['fullname', 'full name', 'name', 'employee name', 'member name']),
    email: get(['email', 'email address', 'emailid', 'e-mail']),
    role: normalizeRole(get(['role', 'position type', 'user role', 'type'])),
    position: get(['position', 'designation', 'title', 'job title']),
    department: get(['department', 'dept', 'team']),
    contactNumber: get(['contact', 'phone', 'contact number', 'mobile', 'phone number']),
  };

  // Collect any extra fields as metadata
  const knownFields = ['fullname', 'full name', 'name', 'employee name', 'member name', 'email', 'email address', 'emailid', 'e-mail', 'role', 'position type', 'user role', 'type', 'position', 'designation', 'title', 'job title', 'department', 'dept', 'team', 'contact', 'phone', 'contact number', 'mobile', 'phone number'];

  const metadata = {};
  Object.keys(row).forEach((key) => {
    const normalizedKey = key.toLowerCase().replace(/[^a-z]/g, '');
    if (!knownFields.some((kf) => kf.replace(/[^a-z]/g, '') === normalizedKey) && row[key]) {
      metadata[key] = row[key];
    }
  });

  if (Object.keys(metadata).length > 0) {
    record.metadata = metadata;
  }

  return record;
};

/**
 * Normalize role string to valid enum value
 */
const normalizeRole = (roleStr) => {
  if (!roleStr) return 'employee';

  const lower = roleStr.toLowerCase().trim();
  if (lower.includes('manager') || lower === 'mgr') return 'manager';
  if (lower.includes('client') || lower.includes('customer')) return 'client';
  if (lower.includes('admin')) return 'company_admin';
  return 'employee';
};

module.exports = { parseFile };
