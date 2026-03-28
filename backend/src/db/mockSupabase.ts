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
        last_login: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
    
    // Seed other common tables as empty arrays
    const tables = [
      'institutes', 'courses', 'modules', 'subjects', 'tests', 
      'questions', 'test_attempts', 'results', 'study_materials',
      'notifications', 'complaints', 'feedback', 'settings'
    ];
    
    tables.forEach(table => {
      if (!this.storage[table]) {
        this.storage[table] = [];
      }
    });
    
    console.log('[SAFE_MODE:DB] Seeded default data:');
    console.log('   - 1 admin user (admin@edtech.com / admin123)');
    console.log('   - 1 student user (student@edtech.com / student123)');
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
 * Create a mock Supabase query result with .select(), .eq(), etc. chainable API
 */
function createMockQuery(tableName: string, filters: any[] = []): any {
  // This creates an object that can be chained like: .from('table').select().eq('field', 'value')
  const mockClient = new MockSupabaseClient();
  
  // Return a thenable that simulates the query execution
  return {
    from: (table: string) => ({
      select: (fields?: string) => ({
        eq: (field: string, value: any) => ({
          single: () => Promise.resolve({ 
            data: getMockSingleResult(table, field, value), 
            error: null 
          }),
          then: (onFulfilled: any) => {
            const result = executeMockQuery(table, [{ field, operator: 'eq', value }]);
            return onFulfilled(result);
          },
        }),
        neq: (field: string, value: any) => ({
          then: (onFulfilled: any) => {
            const result = executeMockQuery(table, [{ field, operator: 'neq', value }]);
            return onFulfilled(result);
          },
        }),
        in: (field: string, values: any[]) => ({
          then: (onFulfilled: any) => {
            const result = executeMockQuery(table, [{ field, operator: 'in', value: values }]);
            return onFulfilled(result);
          },
        }),
        is: (field: string, value: any) => ({
          then: (onFulfilled: any) => {
            const result = executeMockQuery(table, [{ field, operator: 'is', value }]);
            return onFulfilled(result);
          },
        }),
        order: (field: string, options?: { ascending: boolean }) => ({
          then: (onFulfilled: any) => {
            const result = executeMockQuery(table, [], { field, ascending: options?.ascending ?? true });
            return onFulfilled(result);
          },
        }),
        limit: (count: number) => ({
          then: (onFulfilled: any) => {
            const result = executeMockQuery(table, [], undefined, count);
            return onFulfilled(result);
          },
        }),
        then: (onFulfilled: any) => {
          const result = executeMockQuery(table, []);
          return onFulfilled(result);
        },
      }),
      insert: (data: any) => ({
        select: () => ({
          single: () => Promise.resolve({ 
            data: insertMockData(table, data), 
            error: null 
          }),
          then: (onFulfilled: any) => {
            return onFulfilled({ 
              data: [insertMockData(table, data)], 
              error: null 
            });
          },
        }),
        then: (onFulfilled: any) => {
          return onFulfilled({ 
            data: [insertMockData(table, data)], 
            error: null 
          });
        },
      }),
      update: (data: any) => ({
        eq: (field: string, value: any) => ({
          then: (onFulfilled: any) => {
            const result = updateMockData(table, field, value, data);
            return onFulfilled({ data: result, error: null });
          },
        }),
        then: (onFulfilled: any) => {
          const result = updateMockData(table, '', null, data);
          return onFulfilled({ data: result, error: null });
        },
      }),
      delete: () => ({
        eq: (field: string, value: any) => ({
          then: (onFulfilled: any) => {
            deleteMockData(table, field, value);
            return onFulfilled({ data: null, error: null });
          },
        }),
      }),
      then: (onFulfilled: any) => {
        const result = executeMockQuery(table, []);
        return onFulfilled(result);
      },
    }),
  };
}

// Global mock storage instance
const mockStorage: MockTableData = {};

// Seed test data for development
function seedTestData(): void {
  // Get the student ID from the seeded student
  const student = mockStorage['students']?.[0];
  const studentId = student?.id;

  if (studentId) {
    // Seed courses
    const courseId = uuidv4();
    mockStorage['courses'].push({
      id: courseId,
      name: 'Full Stack Development',
      description: 'Complete web development course',
      duration_months: 6,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Update student with course
    mockStorage['students'][0].course_id = courseId;

    // Seed subjects
    const subjectId = uuidv4();
    mockStorage['subjects'].push({
      id: subjectId,
      name: 'Web Technologies',
      course_id: courseId,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Seed tests
    const testId1 = uuidv4();
    const testId2 = uuidv4();
    mockStorage['tests'].push(
      {
        id: testId1,
        title: 'JavaScript Fundamentals',
        description: 'Test your JavaScript knowledge',
        course_id: courseId,
        subject_id: subjectId,
        total_marks: 100,
        passing_marks: 40,
        time_limit_mins: 30,
        type: 'graded',
        scheduled_at: null,
        is_active: true,
        created_by: mockStorage['admins']?.[0].id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: testId2,
        title: 'React Basics',
        description: 'Introduction to React',
        course_id: courseId,
        subject_id: subjectId,
        total_marks: 50,
        passing_marks: 20,
        time_limit_mins: 45,
        type: 'practice',
        scheduled_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
        is_active: true,
        created_by: mockStorage['admins']?.[0].id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    );

    // Seed questions for test 1
    for (let i = 1; i <= 5; i++) {
      mockStorage['questions'].push({
        id: uuidv4(),
        test_id: testId1,
        question_text: `What is the output of: console.log(${i} + "${i}")?`,
        option_a: `${i}${i}`,
        option_b: `${i} ${i}`,
        option_c: `${i}i`,
        option_d: `NaN`,
        correct_option: 'a',
        order_index: i,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    // Seed questions for test 2
    for (let i = 1; i <= 3; i++) {
      mockStorage['questions'].push({
        id: uuidv4(),
        test_id: testId2,
        question_text: `What does ${i} + ${i} equal in JavaScript?`,
        option_a: `${i * 2}`,
        option_b: `${i}${i}`,
        option_c: `'${i}${i}'`,
        option_d: `${i + i}`,
        correct_option: 'a',
        order_index: i,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    // Seed test assignments
    mockStorage['test_assignments'].push(
      {
        id: uuidv4(),
        test_id: testId1,
        student_id: studentId,
        status: 'pending',
        start_time: null,
        end_time: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: uuidv4(),
        test_id: testId2,
        student_id: studentId,
        status: 'pending',
        start_time: null,
        end_time: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    );

    // Seed results with proper field names (total_marks, percentage, status)
    const resultId = uuidv4();
    const score = 4;
    const total = 5;
    const percentage = (score / total) * 100;
    const status = percentage >= 40 ? 'passed' : 'failed';

    mockStorage['results'].push({
      id: resultId,
      student_id: studentId,
      test_id: testId1,
      score,
      total_marks: total,
      percentage,
      status,
      time_taken_seconds: 1800, // 30 minutes
      submitted_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      started_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 - 1800 * 1000).toISOString(),
      answers: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Seed activity log
    mockStorage['activity_log'].push({
      id: uuidv4(),
      user_id: studentId,
      user_type: 'student',
      action: 'test_completed',
      metadata: { test_id: testId1, score },
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    });

    // Update test assignment to completed
    const assignment = mockStorage['test_assignments'].find(a => a.test_id === testId1 && a.student_id === studentId);
    if (assignment) {
      assignment.status = 'completed';
      assignment.end_time = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
    }

    // Seed study materials
    mockStorage['study_materials'].push(
      {
        id: uuidv4(),
        title: 'JavaScript Cheatsheet',
        description: 'Quick reference for JavaScript syntax',
        type: 'pdf',
        file_url: '/materials/js-cheatsheet.pdf',
        course_id: courseId,
        subject_id: subjectId,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: uuidv4(),
        title: 'React Tutorial',
        description: 'Introduction to React concepts',
        type: 'video',
        file_url: '/materials/react-tutorial.mp4',
        course_id: courseId,
        subject_id: subjectId,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    );

    // Seed material views
    mockStorage['material_views'].push({
      id: uuidv4(),
      student_id: studentId,
      material_id: mockStorage['study_materials']?.[0]?.id,
      viewed_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    });

    // Seed notifications
    const notificationId1 = uuidv4();
    const notificationId2 = uuidv4();
    mockStorage['notifications'].push(
      {
        id: notificationId1,
        title: 'New Test Available',
        message: 'A new test on React Basics has been assigned to you.',
        type: 'info',
        target_audience: 'students',
        action_url: `/tests/${testId2}`,
        is_active: true,
        created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
        updated_at: new Date().toISOString(),
      },
      {
        id: notificationId2,
        title: 'Test Result Available',
        message: 'Your result for JavaScript Fundamentals is now available.',
        type: 'success',
        target_audience: 'students',
        action_url: `/results/${resultId}`,
        is_active: true,
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        updated_at: new Date().toISOString(),
      }
    );

    // Seed notification reads (mark the second notification as read)
    mockStorage['notification_reads'].push({
      id: uuidv4(),
      notification_id: notificationId2,
      student_id: studentId,
      read_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    });

    // Seed complaints
    mockStorage['complaints'].push({
      id: uuidv4(),
      student_id: studentId,
      title: 'Issue with test timer',
      description: 'The timer on the JavaScript test was not counting down properly.',
      category: 'technical',
      priority: 'medium',
      status: 'open',
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
      updated_at: new Date().toISOString(),
    });

    // Seed feedback
    mockStorage['feedback'].push({
      id: uuidv4(),
      institute_id: null,
      student_id: studentId,
      type: 'platform',
      rating: 4,
      subject: 'Great platform!',
      message: 'The learning experience is very good. I especially like the test interface.',
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    });

    // Seed payments
    mockStorage['payments'].push({
      id: uuidv4(),
      student_id: studentId,
      amount: 50000,
      currency: 'INR',
      status: 'completed',
      payment_method: 'online',
      transaction_id: 'TXN' + Date.now(),
      paid_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Seed attendance
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      mockStorage['attendance'].push({
        id: uuidv4(),
        student_id: studentId,
        date: date.toISOString().split('T')[0],
        status: i < 5 ? 'present' : 'absent', // Present for last 5 days
        check_in_time: i < 5 ? '09:00:00' : null,
        check_out_time: i < 5 ? '17:00:00' : null,
        created_at: date.toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  }

  console.log('[SAFE_MODE:DB] Seeded test data for student:', studentId);
}

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
      last_login: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];
  
  // Initialize empty tables
  const tables = [
    'institutes', 'branches', 'courses', 'modules', 'subjects', 'tests',
    'questions', 'test_attempts', 'results', 'study_materials',
    'notifications', 'notification_reads', 'complaints', 'feedback', 'settings',
    'payments', 'attendance', 'activity_log', 'material_views', 'test_assignments'
  ];

  tables.forEach(table => {
    if (!mockStorage[table]) {
      mockStorage[table] = [];
    }
  });

  // Seed additional test data
  seedTestData();

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
  from: (tableName: string) => createMockQuery(tableName),
};

export default mockSupabase;