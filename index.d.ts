import { BackendModule, ReadCallback, ResourceKey, Services } from "i18next";

type AllowedAddOrUpdateHostsFunction = (hostname: string) => boolean;
export interface LocizeBackendOptions {
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
   * can be used to reload resources in a specific
   * interval (useful in server environments)
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
}

type LoadCallback = (error: any, result: any) => void;
export interface RequestResponse {
  status: number;
  data: ResourceKey;
}
export type RequestCallback = (error: any, response: RequestResponse) => void;
export interface CustomRequestOptions {
  url: string,
  method: 'GET' | 'POST'
  body: ResourceKey | undefined,
  headers: {
    [name: string]: string;
  }
}

declare class I18NextLocizeBackend
  implements BackendModule<LocizeBackendOptions>
{
  static type: "backend";
  constructor(
    options?: LocizeBackendOptions,
    callback?: LoadCallback
  );
  constructor(
    services?: Services,
    options?: LocizeBackendOptions,
    callback?: LoadCallback
  );

  init(
    options?: LocizeBackendOptions,
    callback?: LoadCallback
  ): void;
  init(
    services?: Services,
    options?: LocizeBackendOptions,
    callback?: LoadCallback
  ): void;
  init(services?: any, options?: LocizeBackendOptions): void;

  getLanguages(callback: LoadCallback): void;
  getLanguages(): Promise<any>;
  getOptions(callback: LoadCallback): void;
  getOptions(): Promise<any>;
  read(language: string, namespace: string, callback: ReadCallback): void;
  loadUrl(options: any, url: string, callback: ReadCallback): void;
  create(
    languages: string | string[],
    namespace: string,
    key: string,
    fallbackValue: string,
    callback: LoadCallback,
    options: any
  ): void;
  create(
    languages: string[],
    namespace: string,
    key: string,
    fallbackValue: string
  ): void;
  update(
    languages: string | string[],
    namespace: string,
    key: string,
    fallbackValue: string,
    callback: LoadCallback,
    options: any
  ): void;
  write(language: string, namespace: string): void;
  type: "backend";
  options: LocizeBackendOptions;

  /**
   * define a custom request function
   * can be used to support Angular http client
   */
  request?(
    info: CustomRequestOptions,
    callback: RequestCallback
  ): void;
  request?(
    info: CustomRequestOptions,
  ): Promise<RequestResponse>;
}

export default I18NextLocizeBackend;
