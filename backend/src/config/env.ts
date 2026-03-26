import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * Critical environment variables that must be present in production.
 * In non-production environments, missing these will trigger SAFE_MODE.
 */
const CRITICAL_VARIABLES = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'JWT_SECRET',
];

/**
 * All required environment variables (critical + optional but commonly needed)
 */
const ALL_VARIABLES = [
  ...CRITICAL_VARIABLES,
  'SUPABASE_ANON_KEY',
  'REDIS_HOST',
  'REDIS_PORT',
  'REDIS_PASSWORD',
  'NODE_ENV',
  'PORT',
  'NEXT_PUBLIC_BASE_URL',
];

/**
 * Check if we're in production environment
 */
function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Validate environment variables and return missing ones
 */
function getMissingVariables(variables: string[]): string[] {
  return variables.filter((name) => !process.env[name] || process.env[name] === '');
}

/**
 * Configuration object containing all environment variables with type safety
 */
export interface AppConfig {
  // Environment
  isProduction: boolean;
  isSafeMode: boolean;
  nodeEnv: string;
  
  // Server
  port: number;
  
  // Supabase
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
  
  // Redis
  redisHost: string | undefined;
  redisPort: number;
  redisPassword: string | undefined;
  
  // JWT
  jwtSecret: string;
  jwtExpiresIn: string;
  
  // Frontend
  frontendUrl: string;
  
  // Feature flags
  enableRegistration: boolean;
  enableEmailNotifications: boolean;
  
  // Email (optional)
  emailFrom: string | undefined;
  smtpHost: string | undefined;
  smtpPort: string | undefined;
  smtpUser: string | undefined;
  smtpPass: string | undefined;
  
  // Logging
  missingVariables: string[];
  safeModeReason: string | null;
}

// Determine if we should enable Safe Mode
const missingCritical = getMissingVariables(CRITICAL_VARIABLES);
const shouldEnableSafeMode = missingCritical.length > 0 && !isProduction();

// Build the configuration object
const config: AppConfig = {
  // Environment
  isProduction: isProduction(),
  isSafeMode: shouldEnableSafeMode,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Server
  port: parseInt(process.env.PORT || '4000', 10),
  
  // Supabase
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  
  // Redis
  redisHost: process.env.REDIS_HOST,
  redisPort: parseInt(process.env.REDIS_PORT || '6379', 10),
  redisPassword: process.env.REDIS_PASSWORD,
  
  // JWT
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-do-not-use-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  
  // Frontend
  frontendUrl: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
  
  // Feature flags
  enableRegistration: process.env.ENABLE_REGISTRATION === 'true',
  enableEmailNotifications: process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true',
  
  // Email (optional)
  emailFrom: process.env.EMAIL_FROM,
  smtpHost: process.env.SMTP_HOST,
  smtpPort: process.env.SMTP_PORT,
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,
  
  // Logging
  missingVariables: missingCritical,
  safeModeReason: shouldEnableSafeMode 
    ? `Missing critical variables: ${missingCritical.join(', ')}` 
    : null,
};

// LOGGING AND VALIDATION
// ======================

function logStartupBanner(): void {
  const banner = `
╔══════════════════════════════════════════════════════════════════════╗
║                    EdTech Backend - Startup Check                     ║
╠══════════════════════════════════════════════════════════════════════╣
║  Environment: ${config.nodeEnv.padEnd(57)}║
║  Safe Mode:  ${config.isSafeMode ? 'ENABLED ⚠️' : 'DISABLED ✓'.padEnd(52)}║
╚══════════════════════════════════════════════════════════════════════╝
`;
  console.log(banner);
  
  if (config.isSafeMode) {
    console.warn('⚠️  WARNING: Running in SAFE MODE with mock services');
    console.warn('⚠️  This is intended for development/preview only');
    console.warn(`⚠️  Missing critical variables: ${config.missingVariables.join(', ')}`);
    console.warn('⚠️  Data will NOT be persisted (in-memory storage)');
    console.warn('⚠️  Do NOT use in production!');
  }
  
  // List all configured variables
  console.log('\n📋 Environment Configuration:');
  console.log(`   - PORT: ${config.port}`);
  console.log(`   - NODE_ENV: ${config.nodeEnv}`);
  console.log(`   - SUPABASE_URL: ${config.supabaseUrl ? '✓ configured' : '✗ missing'}`);
  console.log(`   - SUPABASE_SERVICE_ROLE_KEY: ${config.supabaseServiceRoleKey ? '✓ configured' : '✗ missing'}`);
  console.log(`   - JWT_SECRET: ${config.jwtSecret ? '✓ configured' : '✗ missing'}`);
  console.log(`   - REDIS_HOST: ${config.redisHost || '✗ not configured'}`);
  
  // Show all missing variables if any
  const allMissing = getMissingVariables(ALL_VARIABLES);
  if (allMissing.length > 0) {
    console.log(`\n⚠️  Missing optional variables: ${allMissing.join(', ')}`);
  }
  
  console.log(''); // Empty line
}

// VALIDATION
// ==========

function validateProduction(): void {
  if (!config.isProduction) {
    return; // Skip validation in non-production
  }
  
  const missing = getMissingVariables(CRITICAL_VARIABLES);
  
  if (missing.length > 0) {
    console.error('═══════════════════════════════════════════════════════════════════');
    console.error('                    FATAL ERROR - PRODUCTION MODE');
    console.error('═══════════════════════════════════════════════════════════════════');
    console.error('');
    console.error('The following critical environment variables are missing:');
    console.error('');
    missing.forEach((varName) => {
      console.error(`  ✗ ${varName}`);
    });
    console.error('');
    console.error('In production mode, all critical variables MUST be configured.');
    console.error('Please set these variables in your Railway/Docker environment.');
    console.error('');
    console.error('To fix:');
    console.error('  1. Open your Railway project settings');
    console.error('  2. Add the missing environment variables');
    console.error('  3. Redeploy the application');
    console.error('');
    console.error('═══════════════════════════════════════════════════════════════════');
    console.error('');
    process.exit(1);
  }
}

// Execute validation and logging
validateProduction();
logStartupBanner();

export default config;