import { supabaseAdmin } from '../src/db/supabaseAdmin';
import config from '../src/config/env';
import bcrypt from 'bcryptjs';

async function verifyDatabase() {
  console.log('🚀 Starting Database Verification...');
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`Safe Mode: ${config.SAFE_MODE}`);
  
  const results = {
    connection: false,
    adminsView: false,
    studentsView: false,
    usersTable: false,
    sampleAdmin: false,
    sampleStudent: false,
    passwordVerification: false,
  };

  try {
    // 1. Check connection & admins view
    console.log('\nChecking "admins" view...');
    const { data: admins, error: adminError } = await supabaseAdmin
      .from('admins')
      .select('id')
      .limit(1);
    
    if (adminError) {
      console.error('❌ Error querying "admins" view:', adminError.message);
    } else {
      console.log('✅ "admins" view is accessible');
      results.adminsView = true;
      results.connection = true;
    }

    // 2. Check students view
    console.log('\nChecking "students" view...');
    const { data: students, error: studentError } = await supabaseAdmin
      .from('students')
      .select('id')
      .limit(1);
    
    if (studentError) {
      console.error('❌ Error querying "students" view:', studentError.message);
    } else {
      console.log('✅ "students" view is accessible');
      results.studentsView = true;
    }

    // 2.5 Check users table
    console.log('\nChecking "users" table...');
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id')
      .limit(1);
    
    if (usersError) {
      console.log('ℹ️ "users" table not directly accessible (expected in mock mode if only views are seeded)');
      // In mock mode, if we only seeded views, this might fail, which is okay for mock but not for real db
      if (!config.SAFE_MODE) {
        results.usersTable = false;
      } else {
        results.usersTable = true; // Skip for mock
      }
    } else {
      console.log('✅ "users" table is accessible');
      results.usersTable = true;
    }

    // 3. Check sample admin
    const adminEmail = 'superadmin@edtech.com';
    console.log(`\nChecking for sample admin: ${adminEmail}...`);
    const { data: admin, error: adminSearchError } = await supabaseAdmin
      .from('admins')
      .select('*')
      .eq('email', adminEmail)
      .single();
    
    if (adminSearchError) {
      console.error(`❌ Error finding admin ${adminEmail}:`, adminSearchError.message);
    } else if (admin) {
      console.log(`✅ Admin ${adminEmail} found`);
      results.sampleAdmin = true;
      
      // 4. Verify password hash
      const testPassword = 'Password123!';
      const isValid = await bcrypt.compare(testPassword, admin.password_hash);
      if (isValid) {
        console.log(`✅ Password verification successful for ${adminEmail}`);
        results.passwordVerification = true;
      } else {
        console.error(`❌ Password verification failed for ${adminEmail}`);
      }
    }

    // 5. Check sample student
    const studentEmail = 'alice@student.com';
    console.log(`\nChecking for sample student: ${studentEmail}...`);
    const { data: student, error: studentSearchError } = await supabaseAdmin
      .from('students')
      .select('*')
      .eq('email', studentEmail)
      .single();
    
    if (studentSearchError) {
      console.error(`❌ Error finding student ${studentEmail}:`, studentSearchError.message);
    } else if (student) {
      console.log(`✅ Student ${studentEmail} found`);
      results.sampleStudent = true;
    }

    console.log('\n' + '='.repeat(40));
    console.log('SUMMARY:');
    Object.entries(results).forEach(([key, value]) => {
      console.log(`${value ? '✅' : '❌'} ${key}`);
    });
    console.log('='.repeat(40));

    if (Object.values(results).every(v => v)) {
      console.log('\n🎉 All database checks passed!');
    } else {
      console.log('\n⚠️ Some checks failed. Please review the errors above.');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n💥 Unexpected error during verification:', error);
    process.exit(1);
  }
}

verifyDatabase();
