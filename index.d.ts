declare namespace I18NextLocizeBackend {
  interface BackendOptions {
    /**
     * your locize projectId
     */
    projectId: string;
    /**
     * your locize apikey (only use this in development) to add / update translations
     */
    apiKey?: string;
    /**
     * the reference (source) language of your project (default "en")
     */
    referenceLanguage?: string;
    /**
     * the version of translations to load
     */
    version?: string;
    /**
     * path where resources get loaded from
     * the returned path will interpolate projectId, version, lng, ns if provided like giving a static path
     */
    loadPath?: string;
    /**
     * use loading from private published files
     */
    private?: boolean;
    /**
     * path where resources get loaded from if using private published translations
     */
    privatePath?: string;
    /**
     * use loading from database
     */
    pull?: boolean;
    /**
     * path where resources get loaded from if loading directly from database
     */
    pullPath?: string;
    /**
     * path to post missing resources
     */
    addPath?: string;
    /**
     * path to post updated resources
     */
    updatePath?: string;
    /**
     * allow cross domain requests
     */
    crossDomain?: boolean;
    /**
     * set JSON as content type
     */
    setContentTypeJSON?: boolean;
    /**
     * threshold to accept languages from locize in to whitelist
     */
    whitelistThreshold?: number;
  }

  type LoadCallback = (error: any, result: string | false) => void;
}

declare class I18NextLocizeBackend {
  constructor(services?: any, options?: I18NextLocizeBackend.BackendOptions);
  init(services?: any, options?: I18NextLocizeBackend.BackendOptions): void;
  getLanguages(callback: I18NextLocizeBackend.LoadCallback): void;
  getOptions(callback: I18NextLocizeBackend.LoadCallback): void;
  read(
    language: string,
    namespace: string,
    callback: I18NextLocizeBackend.LoadCallback
  ): void;
  loadUrl(
    url: string,
    options: any,
    callback: I18NextLocizeBackend.LoadCallback
  ): void;
  create(
    languages: string | string[],
    namespace: string,
    key: string,
    fallbackValue: string,
    callback: I18NextLocizeBackend.LoadCallback,
    options: any
  ): void;
  update(
    languages: string | string[],
    namespace: string,
    key: string,
    fallbackValue: string,
    callback: I18NextLocizeBackend.LoadCallback,
    options: any
  ): void;
  write(language: string, namespace: string): void;
  type: "backend";
  options: I18NextLocizeBackend.BackendOptions;
}

export default I18NextLocizeBackend;
