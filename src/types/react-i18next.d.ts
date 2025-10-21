
import 'react-i18next';
import { ReactNode } from 'react';
import { TranslationSchema } from '../locales/resources';

declare module 'react-i18next' {
  interface CustomTypeOptions {
    // custom resources type
    resources: {
      translation: TranslationSchema;
    };
    // force children to be treated as ReactNode to avoid type conflicts
    reactI18nextChildrenType: ReactNode;
  }
}
