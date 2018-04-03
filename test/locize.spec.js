import XHR from '../src/';

import expected from './languages/test.json';

describe('XHR backend', () => {
  let backend;

  before(() => {
    backend = new XHR({
      getLanguagesPath: 'http://localhost:9876/languages/{{projectId}}.json',
      projectId: 'test'
    });
  });

  describe('#smart init with callback', () => {

    it('should return options and set referenceLng', (done) => {
      const b = new XHR({
        getLanguagesPath: 'http://localhost:9876/languages/{{projectId}}.json',
        projectId: 'test'
      }, function(err, options) {
        expect(options).to.eql({ fallbackLng: 'en', referenceLng: 'en', whitelist: ['en', 'de'], load: 'languageOnly' });
        done();
      });
    });

  });

  describe('#getLanguages', () => {

    it('should return languages', (done) => {
      backend.getLanguages(function(err, data) {
        expect(data).to.eql(expected);
        done();
      });
    });

  });

  describe('#getOptions', () => {

    it('should return possible options', (done) => {
      backend.getOptions(function(err, options) {
        expect(options).to.eql({ fallbackLng: 'en', referenceLng: 'en', whitelist: ['en', 'de'], load: 'languageOnly' });
        done();
      });
    });

  });

});
