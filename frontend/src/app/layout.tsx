import type { Metadata } from 'next';
import { Inter, Poppins } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/context/ToastContext';
import Toast from '@/components/ui/Toast';
import { instituteConfig } from '@/config/institute.config';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const poppins = Poppins({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-poppins' });

export const metadata: Metadata = {
  title: `${instituteConfig.name} - ${instituteConfig.tagline}`,
  description: instituteConfig.tagline,
  openGraph: {
    title: instituteConfig.name,
    description: instituteConfig.tagline,
    type: 'website',
  },
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`}>
      <head>
        <style
          dangerouslySetInnerHTML={{
            __html: `
              :root {
                --color-primary: ${instituteConfig.primaryColor};
                --color-secondary: ${instituteConfig.secondaryColor};
              }
            `,
          }}
        />
      </head>
      <body className="antialiased">
        <ToastProvider>
          {children}
          <Toast />
        </ToastProvider>
      </body>
    </html>
  );
}