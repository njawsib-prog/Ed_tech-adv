export interface InstituteConfig {
  name: string;
  tagline: string;
  supportEmail: string;
  primaryColor: string;
  secondaryColor: string;
  font: {
    primary: string;
    heading: string;
  };
  logoUrl: string;
  faviconUrl: string;
  features: {
    complaints: boolean;
    feedback: boolean;
    studyMaterial: boolean;
    practiceTests: boolean;
    emailNotifications: boolean;
  };
}

export const instituteConfig: InstituteConfig = {
  name: process.env.NEXT_PUBLIC_INSTITUTE_NAME || 'EdTech Institute',
  tagline: process.env.NEXT_PUBLIC_INSTITUTE_TAGLINE || 'Empowering Education',
  supportEmail: 'support@edtech.edu',
  primaryColor: '#2E86C1',
  secondaryColor: '#1A7A4A',
  font: {
    primary: 'Inter',
    heading: 'Poppins',
  },
  logoUrl: '/brand/logo.svg',
  faviconUrl: '/favicon.ico',
  features: {
    complaints: true,
    feedback: true,
    studyMaterial: true,
    practiceTests: true,
    emailNotifications: false,
  },
};

export default instituteConfig;