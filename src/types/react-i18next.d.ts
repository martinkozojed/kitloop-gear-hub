
import 'react-i18next';
import { ReactNode } from 'react';

declare module 'react-i18next' {
  interface CustomTypeOptions {
    // custom resources type
    resources: {
      translation: typeof import('../locales/en.json');
    };
    // force children to be treated as ReactNode to avoid type conflicts
    reactI18nextChildrenType: ReactNode;
  }
}
