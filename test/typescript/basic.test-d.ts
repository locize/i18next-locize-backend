import i18next from 'i18next';
import Backend from 'i18next-locize-backend';

i18next.use(Backend).init({
  backend: {
    projectId: '1234123424234'
  },
});
