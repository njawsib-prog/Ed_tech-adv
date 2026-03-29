import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

/**
 * In-memory storage for mock database tables
 */
interface MockTableData {
  [tableName: string]: any[];
}

interface MockQueryBuilder {
  table: string;
  filters: Array<{ field: string; operator: string; value: any }>;
  selectFields: string | '*';
  limitVal?: number;
  orderBy?: { field: string; ascending: boolean };
  range?: { from: number; to: number };
}

interface MockQueryResult {
  data: any[] | null;
  error: { message: string } | null;
  count: number | null;
}

interface MockSingleResult {
  data: any | null;
  error: { message: string } | null;
}

/**
 * Mock Supabase Client
 * Provides a chainable API similar to the real Supabase client
 * Uses in-memory storage with seed data for development
 */
class MockSupabaseClient {
  private storage: MockTableData;
  
  constructor() {
    this.storage = {};
    this.seedData();
  }
  
  /**
   * Seed the mock database with default data
   */
  private seedData(): void {
    // Create default admin
    const adminPassword = bcrypt.hashSync('admin123', 10);
    this.storage['admins'] = [
      {
        id: uuidv4(),
        email: 'admin@edtech.com',
        password_hash: adminPassword,
        name: 'System Admin',
        role: 'super_admin',
        avatar_url: null,
        is_active: true,
        status: 'ACTIVE',
        last_login: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
    
    // Create default student
    const studentPassword = bcrypt.hashSync('student123', 10);
    this.storage['students'] = [
      {
        id: uuidv4(),
        email: 'student@edtech.com',
        password_hash: studentPassword,
        name: 'Test Student',
        phone: '1234567890',
        course_id: null,
        avatar_url: null,
        is_active: true,
        status: 'ACTIVE',
        last_login: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
    
    // Seed other common tables as empty arrays with sample data
    const tablesWithData: { [key: string]: any[] } = {
      'institutes': [
        {
          id: uuidv4(),
          name: 'Default Institute',
          code: 'DEF',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      'branches': [
        {
          id: uuidv4(),
          name: 'Main Campus',
          location: 'New York, NY',
          contact_number: '+1-555-0100',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      'courses': [
        {
          id: uuidv4(),
          name: 'Computer Science Fundamentals',
          code: 'CS101',
          description: 'Introduction to Computer Science',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      'tests': [
        {
          id: uuidv4(),
          title: 'Programming Basics Quiz',
          description: 'Test your programming knowledge',
          time_limit_mins: 30,
          total_marks: 20,
          passing_marks: 8,
          is_active: true,
          scheduled_at: null,
          type: 'quiz',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      'questions': [
        {
          id: uuidv4(),
          test_id: null, // Will be assigned
          question_text: 'What is 2 + 2?',
          option_a: '3',
          option_b: '4',
          option_c: '5',
          option_d: '6',
          correct_option: 'B',
          order_index: 1,
          marks: 1,
          created_at: new Date().toISOString(),
        },
      ],
      'results': [
        {
          id: uuidv4(),
          student_id: null, // Will be assigned
          test_id: null, // Will be assigned
          score: 15,
          total_marks: 20,
          percentage: 75,
          status: 'passed',
          time_taken_seconds: 1200,
          answers: [],
          submitted_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
      ],
      'study_materials': [
        {
          id: uuidv4(),
          title: 'Introduction to Algorithms',
          description: 'Basic algorithms and data structures',
          type: 'pdf',
          url: '/materials/algorithms.pdf',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      'notifications': [
        {
          id: uuidv4(),
          title: 'Welcome to EdTech Platform',
          message: 'Welcome! Start your learning journey today.',
          type: 'info',
          target_audience: 'all',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: uuidv4(),
          title: 'New Test Available',
          message: 'A new test has been assigned to you.',
          type: 'info',
          target_audience: 'students',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      'notification_reads': [],
      'test_assignments': [],
      'complaints': [],
      'feedback': [],
      'settings': [
        {
          id: uuidv4(),
          key: 'site_title',
          value: 'EdTech Platform',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      'payments': [],
      'attendance': [],
      'activity_log': [],
    };

    // Set up all tables
    const allTables = [
      'institutes', 'branches', 'courses', 'modules', 'subjects', 'tests', 
      'questions', 'test_attempts', 'results', 'study_materials',
      'notifications', 'complaints', 'feedback', 'settings',
      'payments', 'attendance', 'notification_reads', 'test_assignments', 'activity_log'
    ];
    
    allTables.forEach(table => {
      if (!this.storage[table]) {
        this.storage[table] = tablesWithData[table] || [];
      }
    });

    console.log('[SAFE_MODE:DB] Seeded default data:');
    console.log('   - 1 admin user (admin@edtech.com / admin123)');
    console.log('   - 1 student user (student@edtech.com / student123');
    console.log('   - Sample institutes, branches, courses, tests, questions');
    console.log('   - Sample notifications, study materials');
  }
  
  /**
   * Start a query on a table
   */
  from(tableName: string): MockQueryBuilder {
    return {
      table: tableName,
      filters: [],
      selectFields: '*',
    };
  }
  
  /**
   * Select specific fields
   */
  select(fields: string): MockQueryBuilder {
    return {
      table: '',
      filters: [],
      selectFields: fields,
    };
  }
  
  /**
   * Apply filters to query
   */
  private applyFilters(data: any[], filters: Array<{ field: string; operator: string; value: any }>): any[] {
    return data.filter(row => {
      return filters.every(filter => {
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
  }
  
  /**
   * Execute the query builder
   */
  private executeQuery(builder: MockQueryBuilder): MockQueryResult {
    const tableData = this.storage[builder.table] || [];
    
    let result = [...tableData];
    
    // Apply filters
    if (builder.filters.length > 0) {
      result = this.applyFilters(result, builder.filters);
    }
    
    // Apply ordering
    if (builder.orderBy) {
      result.sort((a, b) => {
        const aVal = a[builder.orderBy!.field];
        const bVal = b[builder.orderBy!.field];
        
        if (aVal === bVal) return 0;
        if (aVal === undefined || aVal === null) return 1;
        if (bVal === undefined || bVal === null) return -1;
        
        const comparison = aVal < bVal ? -1 : 1;
        return builder.orderBy!.ascending ? comparison : -comparison;
      });
    }
    
    // Apply pagination
    if (builder.range) {
      result = result.slice(builder.range.from, builder.range.to + 1);
    }
    
    // Apply limit
    if (builder.limitVal !== undefined) {
      result = result.slice(0, builder.limitVal);
    }
    
    console.log(`[SAFE_MODE:DB] Query: ${builder.table} - ${result.length} rows returned`);
    
    return {
      data: result,
      error: null,
      count: result.length,
    };
  }
  
  /**
   * Chainable methods for building queries
   */
  eq(field: string, value: any): MockQueryBuilder {
    return {
      table: '',
      filters: [{ field, operator: 'eq', value }],
      selectFields: '*',
    };
  }
  
  neq(field: string, value: any): MockQueryBuilder {
    return {
      table: '',
      filters: [{ field, operator: 'neq', value }],
      selectFields: '*',
    };
  }
  
  gt(field: string, value: any): MockQueryBuilder {
    return {
      table: '',
      filters: [{ field, operator: 'gt', value }],
      selectFields: '*',
    };
  }
  
  gte(field: string, value: any): MockQueryBuilder {
    return {
      table: '',
      filters: [{ field, operator: 'gte', value }],
      selectFields: '*',
    };
  }
  
  lt(field: string, value: any): MockQueryBuilder {
    return {
      table: '',
      filters: [{ field, operator: 'lt', value }],
      selectFields: '*',
    };
  }
  
  lte(field: string, value: any): MockQueryBuilder {
    return {
      table: '',
      filters: [{ field, operator: 'lte', value }],
      selectFields: '*',
    };
  }
  
  like(field: string, value: any): MockQueryBuilder {
    return {
      table: '',
      filters: [{ field, operator: 'like', value }],
      selectFields: '*',
    };
  }
  
  ilike(field: string, value: any): MockQueryBuilder {
    return {
      table: '',
      filters: [{ field, operator: 'ilike', value }],
      selectFields: '*',
    };
  }
  
  in(field: string, value: any[]): MockQueryBuilder {
    return {
      table: '',
      filters: [{ field, operator: 'in', value }],
      selectFields: '*',
    };
  }
  
  is(field: string, value: any): MockQueryBuilder {
    return {
      table: '',
      filters: [{ field, operator: 'is', value }],
      selectFields: '*',
    };
  }
  
  order(field: string, options?: { ascending: boolean }): MockQueryBuilder {
    return {
      table: '',
      filters: [],
      selectFields: '*',
      orderBy: { field, ascending: options?.ascending ?? true },
    };
  }
  
  range(from: number, to: number): MockQueryBuilder {
    return {
      table: '',
      filters: [],
      selectFields: '*',
      range: { from, to },
    };
  }
  
  limit(count: number): MockQueryBuilder {
    return {
      table: '',
      filters: [],
      selectFields: '*',
      limitVal: count,
    };
  }
  
  /**
   * Execute a built query and return result
   */
  then<TResult1 = MockQueryResult, TResult2 = never>(
    onfulfilled?: ((value: MockQueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    // When a query builder is executed directly (e.g., .from('table').eq(...).then())
    // We need to handle it properly
    return Promise.resolve({
      data: [],
      error: null,
      count: 0,
    } as TResult1);
  }
}

/**
 * Create a chainable mock query builder for a given table.
 *
 * This replaces the old createMockQuery which was one level of nesting too
 * deep (it returned `{ from: fn }` instead of `{ select, eq, insert, … }`),
 * causing every real-Supabase-style chain to throw a TypeError and the
 * login endpoint to return 500 instead of the expected result.
 *
 * It also fixes the inability to chain multiple .eq() calls (the old
 * implementation returned `{ single, then }` after the first .eq(), with no
 * further .eq() method – the admin login uses two: email + is_active).
 */
function createTableQuery(
  tableName: string,
  filters: Array<{ field: string; operator: string; value: any }> = [],
  orderBy?: { field: string; ascending: boolean },
  limitCount?: number
): any {
  const executeSelect = () =>
    executeMockQuery(tableName, filters, orderBy, limitCount);

  const addFilter = (field: string, operator: string, value: any) =>
    createTableQuery(
      tableName,
      [...filters, { field, operator, value }],
      orderBy,
      limitCount
    );

  // Build the update sub-chain (accumulates its own eq filters before execute)
  const buildUpdateChain = (
    updateData: any,
    updateFilters: Array<{ field: string; operator: string; value: any }>
  ): any => {
    const executeUpdate = () => {
      const tableData: any[] = mockStorage[tableName] || [];
      const updated: any[] = [];
      tableData.forEach((row, index) => {
        const matches =
          updateFilters.length === 0 ||
          updateFilters.every((f) => row[f.field] === f.value);
        if (matches) {
          tableData[index] = {
            ...row,
            ...updateData,
            updated_at: new Date().toISOString(),
          };
          updated.push(tableData[index]);
        }
      });
      console.log(
        `[SAFE_MODE:DB] Update: ${tableName} - updated ${updated.length} records`
      );
      return updated;
    };

    return {
      eq: (field: string, value: any) =>
        buildUpdateChain(updateData, [
          ...updateFilters,
          { field, operator: 'eq', value },
        ]),
      select: (_fields?: string) => ({
        single: async () => {
          const updated = executeUpdate();
          return { data: updated[0] ?? null, error: null };
        },
        then: (resolve: any) =>
          Promise.resolve({ data: executeUpdate(), error: null }).then(resolve),
      }),
      then: (resolve: any) =>
        Promise.resolve({ data: executeUpdate(), error: null }).then(resolve),
    };
  };

  // Build the delete sub-chain
  const buildDeleteChain = (
    deleteFilters: Array<{ field: string; operator: string; value: any }>
  ): any => ({
    eq: (field: string, value: any) =>
      buildDeleteChain([
        ...deleteFilters,
        { field, operator: 'eq', value },
      ]),
    then: (resolve: any) => {
      const tableData: any[] = mockStorage[tableName] || [];
      const initialLength = tableData.length;
      mockStorage[tableName] = tableData.filter((row) =>
        deleteFilters.length === 0
          ? false // delete nothing if no filters provided
          : !deleteFilters.every((f) => row[f.field] === f.value)
      );
      console.log(
        `[SAFE_MODE:DB] Delete: ${tableName} - removed ${initialLength - mockStorage[tableName].length} records`
      );
      return Promise.resolve({ data: null, error: null }).then(resolve);
    },
  });

  return {
    // .select() just returns the same builder (field selection is ignored in mock)
    select: (_fields?: string) =>
      createTableQuery(tableName, filters, orderBy, limitCount),

    // Filter methods – each returns a NEW builder with the filter appended
    eq:    (field: string, value: any) => addFilter(field, 'eq',    value),
    neq:   (field: string, value: any) => addFilter(field, 'neq',   value),
    gt:    (field: string, value: any) => addFilter(field, 'gt',    value),
    gte:   (field: string, value: any) => addFilter(field, 'gte',   value),
    lt:    (field: string, value: any) => addFilter(field, 'lt',    value),
    lte:   (field: string, value: any) => addFilter(field, 'lte',   value),
    like:  (field: string, value: any) => addFilter(field, 'like',  value),
    ilike: (field: string, value: any) => addFilter(field, 'ilike', value),
    in:    (field: string, values: any[]) => addFilter(field, 'in', values),
    is:    (field: string, value: any) => addFilter(field, 'is',    value),

    order: (field: string, options?: { ascending: boolean }) =>
      createTableQuery(tableName, filters, {
        field,
        ascending: options?.ascending ?? true,
      }, limitCount),

    limit: (count: number) =>
      createTableQuery(tableName, filters, orderBy, count),

    range: (from: number, to: number) =>
      createTableQuery(tableName, filters, orderBy, to - from + 1),

    // Execute as single-row query
    single: async () => {
      const result = executeSelect();
      if (!result.data || result.data.length === 0) {
        return {
          data: null,
          error: { message: 'No rows found', code: 'PGRST116' },
        };
      }
      return { data: result.data[0], error: null };
    },

    // INSERT – returns a sub-chain with .select().single() / direct await
    insert: (data: any) => {
      const isBatch = Array.isArray(data);
      const records: any[] = isBatch ? data : [data];
      return {
        select: (_fields?: string) => ({
          single: async () => ({
            data: insertMockData(tableName, records[0]),
            error: null,
          }),
          then: (resolve: any) =>
            Promise.resolve({
              data: records.map((r) => insertMockData(tableName, r)),
              error: null,
            }).then(resolve),
        }),
        then: (resolve: any) => {
          const inserted = records.map((r) => insertMockData(tableName, r));
          // Match real Supabase: single-record insert returns one object; batch returns array
          return Promise.resolve({
            data: isBatch ? inserted : inserted[0],
            error: null,
          }).then(resolve);
        },
      };
    },

    // UPDATE – returns a sub-chain with .eq() / .select().single() / direct await
    update: (data: any) => buildUpdateChain(data, []),

    // DELETE – returns a sub-chain with .eq() / direct await
    delete: () => buildDeleteChain([]),

    // Make the builder itself thenable so `await .from('t').select()` works
    then: (resolve: any, reject?: any) =>
      Promise.resolve(executeSelect()).then(resolve, reject),
  };
}

// Global mock storage instance
const mockStorage: MockTableData = {};

// Initialize with seed data
function initializeMockStorage(): void {
  const adminPassword = bcrypt.hashSync('admin123', 10);
  const studentPassword = bcrypt.hashSync('student123', 10);
  
  mockStorage['admins'] = [
    {
      id: uuidv4(),
      email: 'admin@edtech.com',
      password_hash: adminPassword,
      name: 'System Admin',
      role: 'super_admin',
      avatar_url: null,
      is_active: true,
      status: 'ACTIVE',
      last_login: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];
  
  mockStorage['students'] = [
    {
      id: uuidv4(),
      email: 'student@edtech.com',
      password_hash: studentPassword,
      name: 'Test Student',
      phone: '1234567890',
      course_id: null,
      avatar_url: null,
      is_active: true,
      status: 'ACTIVE',
      last_login: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];
  
  // Initialize empty tables
  const tables = [
    'institutes', 'branches', 'courses', 'modules', 'subjects', 'tests', 
    'questions', 'test_attempts', 'results', 'study_materials',
    'notifications', 'complaints', 'feedback', 'settings',
    'payments', 'attendance'
  ];
  
  tables.forEach(table => {
    if (!mockStorage[table]) {
      mockStorage[table] = [];
    }
  });
  
  console.log('[SAFE_MODE:DB] Initialized in-memory database with seed data');
}

// Execute mock query
function executeMockQuery(
  tableName: string, 
  filters: Array<{ field: string; operator: string; value: any }>,
  orderBy?: { field: string; ascending: boolean },
  limit?: number
): MockQueryResult {
  const tableData = mockStorage[tableName] || [];
  let result = [...tableData];
  
  // Apply filters
  result = result.filter(row => {
    return filters.every(filter => {
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
  
  console.log(`[SAFE_MODE:DB] Query: ${tableName} - ${result.length} rows returned`);
  
  return {
    data: result,
    error: null,
    count: result.length,
  };
}

// Get single result
function getMockSingleResult(
  tableName: string, 
  filterField: string, 
  filterValue: any
): any {
  const tableData = mockStorage[tableName] || [];
  const result = tableData.find(row => row[filterField] === filterValue);
  
  console.log(`[SAFE_MODE:DB] Single query: ${tableName} - ${result ? 'found' : 'not found'}`);
  
  return result || null;
}

// Insert mock data
function insertMockData(tableName: string, data: any): any {
  const tableData = mockStorage[tableName] || [];
  
  const newRecord = {
    id: uuidv4(),
    ...data,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  
  tableData.push(newRecord);
  mockStorage[tableName] = tableData;
  
  console.log(`[SAFE_MODE:DB] Insert: ${tableName} - created record ${newRecord.id}`);
  
  return newRecord;
}

// Update mock data
function updateMockData(
  tableName: string, 
  filterField: string, 
  filterValue: any | null,
  data: any
): any[] {
  const tableData = mockStorage[tableName] || [];
  const updated: any[] = [];
  
  tableData.forEach((row, index) => {
    if (!filterField || row[filterField] === filterValue) {
      tableData[index] = {
        ...row,
        ...data,
        updated_at: new Date().toISOString(),
      };
      updated.push(tableData[index]);
    }
  });
  
  console.log(`[SAFE_MODE:DB] Update: ${tableName} - updated ${updated.length} records`);
  
  return updated;
}

// Delete mock data
function deleteMockData(tableName: string, filterField: string, filterValue: any): void {
  const tableData = mockStorage[tableName] || [];
  const initialLength = tableData.length;
  
  mockStorage[tableName] = tableData.filter(row => row[filterField] !== filterValue);
  
  console.log(`[SAFE_MODE:DB] Delete: ${tableName} - removed ${initialLength - mockStorage[tableName].length} records`);
}

// Create the actual mock client export
initializeMockStorage();

export const mockSupabase = {
  from: (tableName: string) => createTableQuery(tableName),
};

export default mockSupabase;