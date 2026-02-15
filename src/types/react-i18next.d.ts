import 'react-i18next';
import type { TranslationSchema } from '../locales/resources';

declare module 'react-i18next' {
  interface CustomTypeOptions {
    resources: {
      translation: TranslationSchema;
    };
    defaultNS: 'translation';
    returnNull: false;
  }
}

// Override ReactI18NextChildren to fix type incompatibility with Radix UI components
declare module 'react-i18next/TransWithoutContext' {
  export type ReactI18NextChildren = React.ReactNode;
}

declare global {
  namespace React {
    // Extend to ensure compatibility
    type ReactI18NextChildren = React.ReactNode;
  }
}
