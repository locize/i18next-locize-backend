import { ReadCallback, Services } from "i18next";

declare namespace I18NextLocizeBackend {
  type AllowedAddOrUpdateHostsFunction = (hostname: string) => boolean;
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
    referenceLng?: string;
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
     * Automatic reload from server time
     */
    reloadInterval?: false | number;
    /**
     * hostnames that are allowed to create & update keys
     */
    allowedAddOrUpdateHosts?: string[] | AllowedAddOrUpdateHostsFunction;
    /**
     * threshold to accept languages from locize in to supportedLngs
     */
    translatedPercentageThreshold?: number;
    // temporal backwards compatibility WHITELIST REMOVAL
    /**
     * threshold to accept languages from locize in to supportedLngs
     */
    whitelistThreshold?: number;
    // end temporal backwards compatibility WHITELIST REMOVAL
  }

  type LoadCallback = (error: any, result: any) => void;
}

declare module "i18next" {
  interface PluginOptions {
    backend?: I18NextLocizeBackend.BackendOptions;
  }
}

declare class I18NextLocizeBackend {
  constructor(
    options?: I18NextLocizeBackend.BackendOptions,
    callback?: I18NextLocizeBackend.LoadCallback
  );
  constructor(
    services?: Services,
    options?: I18NextLocizeBackend.BackendOptions,
    callback?: I18NextLocizeBackend.LoadCallback
  );

  init(
    options?: I18NextLocizeBackend.BackendOptions,
    callback?: I18NextLocizeBackend.LoadCallback
  ): void;
  init(
    services?: Services,
    options?: I18NextLocizeBackend.BackendOptions,
    callback?: I18NextLocizeBackend.LoadCallback
  ): void;

  getLanguages(callback: I18NextLocizeBackend.LoadCallback): void;
  getOptions(callback: I18NextLocizeBackend.LoadCallback): void;
  read(language: string, namespace: string, callback: ReadCallback): void;
  loadUrl(url: string, options: any, callback: ReadCallback): void;
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
