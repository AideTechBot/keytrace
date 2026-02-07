export interface DnsFetchResult {
  domain: string;
  records: {
    txt: string[];
  };
}
export interface DnsFetchOptions {
  timeout?: number;
}
/**
 * Fetch DNS TXT records for a domain
 * Note: This only works in Node.js environments
 */
export declare function fetch(
  domain: string,
  options?: DnsFetchOptions,
): Promise<DnsFetchResult | null>;
//# sourceMappingURL=dns.d.ts.map
