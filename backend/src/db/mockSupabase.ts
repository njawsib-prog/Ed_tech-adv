import { v4 as uuidv4 } from 'uuid';

/**
 * In-memory storage for mock database tables
 */
interface MockTableData {
  [tableName: string]: any[];
}

interface MockQueryResult {
  data: any[] | null;
  error: { message: string; code?: string } | null;
  count: number | null;
}

// Global mock storage instance
const mockStorage: MockTableData = {};

/**
 * Initialize with seed data based on optimized 12-table schema
 */
function initializeMockStorage(): void {
  const passwordHash = '$2a$12$YQxDSwgObFBcZQzW69mZ0uIc58tmF1.EKlIS4pkX5aVyb9BRaL//.';
  
  // 1. SETTINGS
  mockStorage['settings'] = [
    { id: uuidv4(), key: 'platform_name', value: 'EdTech Platform', category: 'branding' },
    { id: uuidv4(), key: 'primary_color', value: '#2E86C1', category: 'branding' },
  ];

  // 2. BRANCHES
  const branchId = 'bbbbbbbb-0000-0000-0000-000000000001';
  mockStorage['branches'] = [
    {
      id: branchId,
      name: 'Main Campus',
      location: 'New Delhi, India',
      contact_number: '+91-9876543210',
      is_active: true,
      created_at: new Date().toISOString(),
    },
  ];

  // 3. USERS (unified)
  mockStorage['users'] = [
    {
      id: 'cccccccc-0000-0000-0000-000000000001',
      branch_id: branchId,
      name: 'Super Admin',
      email: 'superadmin@edtech.com',
      password_hash: passwordHash,
      role: 'super_admin',
      status: 'ACTIVE',
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: 'cccccccc-0000-0000-0000-000000000002',
      branch_id: branchId,
      name: 'Branch Admin',
      email: 'branchadmin@edtech.com',
      password_hash: passwordHash,
      role: 'branch_admin',
      status: 'ACTIVE',
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: 'cccccccc-0000-0000-0000-000000000003',
      branch_id: branchId,
      name: 'Alice Student',
      email: 'alice@student.com',
      password_hash: passwordHash,
      role: 'student',
      status: 'ACTIVE',
      is_active: true,
      current_streak: 5,
      max_streak: 10,
      last_activity_date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
    },
  ];

  // 4. COURSES
  const courseId = uuidv4();
  mockStorage['courses'] = [
    {
      id: courseId,
      branch_id: branchId,
      name: 'Computer Science 101',
      status: 'active',
      is_active: true,
      price: 99.99,
      modules: [],
      created_at: new Date().toISOString(),
    },
  ];

  // 5. ENROLLMENTS
  mockStorage['enrollments'] = [
    {
      id: uuidv4(),
      student_id: 'cccccccc-0000-0000-0000-000000000003',
      course_id: courseId,
      status: 'active',
      enrolled_at: new Date().toISOString(),
    }
  ];

  // 6. ATTENDANCE
  mockStorage['attendance'] = [];

  // 7. TESTS
  const testId = uuidv4();
  mockStorage['tests'] = [
    {
      id: testId,
      branch_id: branchId,
      course_id: courseId,
      title: 'Programming Basics Quiz',
      type: 'graded',
      total_marks: 20,
      passing_marks: 8,
      time_limit_mins: 30,
      is_active: true,
      created_at: new Date().toISOString(),
    },
  ];

  // 8. QUESTIONS
  mockStorage['questions'] = [
    {
      id: uuidv4(),
      test_id: testId,
      question_text: 'What is 2 + 2?',
      option_a: '3',
      option_b: '4',
      option_c: '5',
      option_d: '6',
      correct_option: 'b',
      order_index: 1,
    },
  ];

  // 9. RESULTS (includes test_assignments)
  mockStorage['results'] = [
    {
      id: uuidv4(),
      student_id: 'cccccccc-0000-0000-0000-000000000003',
      test_id: testId,
      score: 15,
      total_marks: 20,
      percentage: 75,
      status: 'passed',
      assignment_status: 'completed',
      submitted_at: new Date().toISOString(),
    },
  ];

  // 10. PAYMENTS
  mockStorage['payments'] = [];

  // 11. STUDY_MATERIALS
  mockStorage['study_materials'] = [];

  // 12. NOTIFICATIONS
  mockStorage['notifications'] = [];

  console.log('[SAFE_MODE:DB] Initialized in-memory database with optimized 12-table schema');
}

/**
 * Execute mock query
 */
function executeMockQuery(
  tableName: string, 
  filters: Array<{ field: string; operator: string; value: any }>,
  orderBy?: { field: string; ascending: boolean },
  limit?: number
): MockQueryResult {
  // Handle views by mapping them to base tables
  let effectiveTableName = tableName;
  let forcedFilters: Array<{ field: string; operator: string; value: any }> = [];

  if (tableName === 'students') {
    effectiveTableName = 'users';
    forcedFilters.push({ field: 'role', operator: 'eq', value: 'student' });
  } else if (tableName === 'admins') {
    effectiveTableName = 'users';
    // We'll skip complex in-filters for simplicity in mock forced filters
  } else if (tableName === 'test_assignments') {
    // For backward compatibility while I update controllers
    effectiveTableName = 'results';
  }

  const tableData = mockStorage[effectiveTableName] || [];
  let result = [...tableData];
  
  const allFilters = [...forcedFilters, ...filters];

  // Apply filters
  result = result.filter(row => {
    return allFilters.every(filter => {
      const rowValue = row[filter.field];
      
      switch (filter.operator) {
        case 'eq':
          return rowValue === filter.value;
        case 'neq':
          return rowValue !== filter.value;
        case 'gt':
          return rowValue > filter.value;
        case 'gte':
          return rowValue >= filter.value;
        case 'lt':
          return rowValue < filter.value;
        case 'lte':
          return rowValue <= filter.value;
        case 'like':
          return String(rowValue).includes(String(filter.value));
        case 'ilike':
          return String(rowValue).toLowerCase().includes(String(filter.value).toLowerCase());
        case 'in':
          return Array.isArray(filter.value) && filter.value.includes(rowValue);
        case 'is':
          return rowValue === filter.value;
        default:
          return true;
      }
    });
  });
  
  // Apply ordering
  if (orderBy) {
    result.sort((a, b) => {
      const aVal = a[orderBy.field];
      const bVal = b[orderBy.field];
      
      if (aVal === bVal) return 0;
      if (aVal === undefined || aVal === null) return 1;
      if (bVal === undefined || bVal === null) return -1;
      
      const comparison = aVal < bVal ? -1 : 1;
      return orderBy.ascending ? comparison : -comparison;
    });
  }
  
  // Apply limit
  if (limit !== undefined) {
    result = result.slice(0, limit);
  }
  
  return {
    data: result,
    error: null,
    count: result.length,
  };
}

/**
 * Insert mock data
 */
function insertMockData(tableName: string, data: any): any {
  let effectiveTableName = tableName;
  let extraData = {};

  if (tableName === 'students') {
    effectiveTableName = 'users';
    extraData = { role: 'student' };
  } else if (tableName === 'test_assignments') {
    effectiveTableName = 'results';
    extraData = { assignment_status: 'pending' };
  }

  const tableData = mockStorage[effectiveTableName] || [];
  
  const newRecord = {
    id: uuidv4(),
    ...data,
    ...extraData,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  
  tableData.push(newRecord);
  mockStorage[effectiveTableName] = tableData;
  
  console.log(`[SAFE_MODE:DB] Insert: ${tableName} -> ${effectiveTableName} - created record ${newRecord.id}`);
  
  return newRecord;
}

/**
 * Update mock data
 */
function updateMockData(
  tableName: string, 
  filters: Array<{ field: string; operator: string; value: any }>,
  data: any
): any[] {
  let effectiveTableName = tableName;
  if (tableName === 'students') effectiveTableName = 'users';
  else if (tableName === 'test_assignments') effectiveTableName = 'results';

  const tableData = mockStorage[effectiveTableName] || [];
  const updated: any[] = [];
  
  tableData.forEach((row, index) => {
    const matches = filters.every(f => row[f.field] === f.value);
    if (matches) {
      tableData[index] = {
        ...row,
        ...data,
        updated_at: new Date().toISOString(),
      };
      updated.push(tableData[index]);
    }
  });
  
  return updated;
}

/**
 * Delete mock data
 */
function deleteMockData(tableName: string, filters: Array<{ field: string; operator: string; value: any }>): void {
  let effectiveTableName = tableName;
  if (tableName === 'students') effectiveTableName = 'users';
  else if (tableName === 'test_assignments') effectiveTableName = 'results';

  const tableData = mockStorage[effectiveTableName] || [];
  mockStorage[effectiveTableName] = tableData.filter(row => {
    return !filters.every(f => row[f.field] === f.value);
  });
}

function createTableQuery(
  tableName: string,
  filters: Array<{ field: string; operator: string; value: any }> = [],
  orderBy?: { field: string; ascending: boolean },
  limitCount?: number
): any {
  const addFilter = (field: string, operator: string, value: any) =>
    createTableQuery(tableName, [...filters, { field, operator, value }], orderBy, limitCount);

  return {
    select: (_fields?: string) => createTableQuery(tableName, filters, orderBy, limitCount),
    eq: (field: string, value: any) => addFilter(field, 'eq', value),
    neq: (field: string, value: any) => addFilter(field, 'neq', value),
    in: (field: string, values: any[]) => addFilter(field, 'in', values),
    gte: (field: string, value: any) => addFilter(field, 'gte', value),
    lte: (field: string, value: any) => addFilter(field, 'lte', value),
    order: (field: string, options?: { ascending: boolean }) => createTableQuery(tableName, filters, { field, ascending: options?.ascending ?? true }, limitCount),
    limit: (count: number) => createTableQuery(tableName, filters, orderBy, count),
    range: (from: number, to: number) => createTableQuery(tableName, filters, orderBy, to - from + 1),
    
    single: async () => {
      const result = executeMockQuery(tableName, filters, orderBy, limitCount);
      return { data: result.data?.[0] ?? null, error: result.data?.length ? null : { message: 'Not found', code: 'PGRST116' } };
    },
    
    insert: (data: any) => {
      const isBatch = Array.isArray(data);
      const records = isBatch ? data : [data];
      const inserted = records.map(r => insertMockData(tableName, r));
      return {
        select: () => ({
          single: async () => ({ data: inserted[0], error: null }),
          then: (res: any) => Promise.resolve({ data: inserted, error: null }).then(res)
        }),
        then: (res: any) => Promise.resolve({ data: isBatch ? inserted : inserted[0], error: null }).then(res)
      };
    },
    
    update: (data: any) => ({
      eq: (field: string, value: any) => {
        const newFilters = [...filters, { field, operator: 'eq', value }];
        return {
          select: () => ({
            single: async () => {
              const updated = updateMockData(tableName, newFilters, data);
              return { data: updated[0] ?? null, error: null };
            }
          }),
          then: (res: any) => Promise.resolve({ data: updateMockData(tableName, newFilters, data), error: null }).then(res)
        };
      }
    }),
    
    delete: () => ({
      eq: (field: string, value: any) => {
        const newFilters = [...filters, { field, operator: 'eq', value }];
        return {
          then: (res: any) => {
            deleteMockData(tableName, newFilters);
            return Promise.resolve({ data: null, error: null }).then(res);
          }
        };
      }
    }),

    then: (resolve: any, reject?: any) => Promise.resolve(executeMockQuery(tableName, filters, orderBy, limitCount)).then(resolve, reject),
  };
}

initializeMockStorage();

export const mockSupabase = {
  from: (tableName: string) => createTableQuery(tableName),
  rpc: (fn: string, params: any) => {
    console.log(`[SAFE_MODE:DB] RPC Call: ${fn}`, params);
    return Promise.resolve({ data: [], error: null });
  }
};

export default mockSupabase;
