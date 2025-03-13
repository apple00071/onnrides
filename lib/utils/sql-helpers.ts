import logger from '@/lib/logger';

/**
 * SQL helper functions for consistent date handling in database queries
 */

/**
 * Generate SQL to convert a timestamp field from UTC to IST timezone
 * @param field The database field name to convert
 * @returns SQL expression that converts the field to IST
 */
export function toISTSql(field: string): string {
  // Using direct interval addition instead of timezone conversion for more reliable results
  return `(${field} + INTERVAL '5 hours 30 minutes')`;
}

/**
 * Generate a SQL SELECT clause that includes both the original and IST-formatted date fields
 * @param dateFields Array of date field names to convert
 * @param tableAlias Optional table alias
 * @returns SQL SELECT clause with formatted date fields
 */
export function selectWithISTDates(dateFields: string[], tableAlias: string = ''): string {
  const prefix = tableAlias ? `${tableAlias}.` : '';
  
  return dateFields
    .map(field => {
      const baseField = prefix + field;
      const fieldName = field.replace(/(_date|_datetime|_time)$/, '');
      return `
        ${baseField},
        ${toISTSql(baseField)} as ist_${fieldName},
        to_char(${toISTSql(baseField)}, 'DD Mon YYYY HH12:MI AM') as formatted_${fieldName}
      `;
    })
    .join(',\n');
}

/**
 * Create a SQL WHERE clause for date range filtering with timezone handling
 * @param field The date field to filter on
 * @param startDate Start date for the range (ISO string or Date)
 * @param endDate End date for the range (ISO string or Date)
 * @returns SQL WHERE clause for date range filtering
 */
export function dateRangeWhereSql(
  field: string,
  startDate: Date | string | null,
  endDate: Date | string | null
): string {
  if (!startDate && !endDate) {
    return '1=1'; // No date filter
  }
  
  const conditions = [];
  
  if (startDate) {
    const start = typeof startDate === 'string' ? startDate : startDate.toISOString();
    conditions.push(`${field} >= '${start}'::timestamp`);
  }
  
  if (endDate) {
    const end = typeof endDate === 'string' ? endDate : endDate.toISOString();
    conditions.push(`${field} <= '${end}'::timestamp`);
  }
  
  return conditions.join(' AND ');
}

/**
 * Create a standardized SQL query for fetching data with proper timezone handling
 * @param baseTable The base table name
 * @param dateFields Array of date fields to convert
 * @param whereClause Additional WHERE conditions
 * @param joins Optional JOIN clauses
 * @param orderBy Optional ORDER BY clause
 * @param limit Optional LIMIT value
 * @param offset Optional OFFSET value
 * @returns Complete SQL query with timezone handling
 */
export function buildTimezoneAwareQuery({
  baseTable,
  dateFields,
  whereClause = '1=1',
  joins = '',
  groupBy = '',
  orderBy = 'created_at DESC',
  limit = 100,
  offset = 0,
}: {
  baseTable: string;
  dateFields: string[];
  whereClause?: string;
  joins?: string;
  groupBy?: string;
  orderBy?: string;
  limit?: number;
  offset?: number;
}): string {
  // Regular fields (excluding date fields that will be handled separately)
  const baseFields = '*';
  
  // Create the date field selections with timezone conversion
  const dateSelections = selectWithISTDates(dateFields);
  
  // Build the complete query
  let query = `
    SELECT 
      ${baseFields},
      ${dateSelections}
    FROM ${baseTable}
    ${joins}
    WHERE ${whereClause}
  `;
  
  if (groupBy) {
    query += `\nGROUP BY ${groupBy}`;
  }
  
  if (orderBy) {
    query += `\nORDER BY ${orderBy}`;
  }
  
  query += `\nLIMIT ${limit} OFFSET ${offset}`;
  
  return query;
}

/**
 * Usage example:
 * 
 * const query = buildTimezoneAwareQuery({
 *   baseTable: 'bookings',
 *   dateFields: ['created_at', 'start_date', 'end_date'],
 *   whereClause: "status = 'active'",
 *   joins: "LEFT JOIN users ON bookings.user_id = users.id",
 *   orderBy: "start_date ASC",
 *   limit: 10,
 *   offset: 0
 * });
 * 
 * const result = await pool.query(query);
 */ 