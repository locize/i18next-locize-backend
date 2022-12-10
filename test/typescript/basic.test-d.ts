import i18next from 'i18next';
import Backend, { LocizeBackendOptions } from 'i18next-locize-backend';

i18next.use(Backend).init<LocizeBackendOptions>({
  backend: {
    projectId: '1234123424234'
  },
});
