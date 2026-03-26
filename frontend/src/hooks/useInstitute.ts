'use client';

import { instituteConfig, InstituteConfig } from '@/config/institute.config';

export function useInstitute(): InstituteConfig {
  return instituteConfig;
}

export default useInstitute;