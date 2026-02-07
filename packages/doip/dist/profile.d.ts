import { Claim } from "./claim.js";
import type { ProfileData, ClaimData, VerifyOptions } from "./types.js";
/**
 * Represents a user profile with identity claims from ATProto
 */
export declare class Profile {
  private _did;
  private _handle;
  private _displayName?;
  private _avatar?;
  private _claims;
  private _claimRecords;
  private constructor();
  get did(): string;
  get handle(): string;
  get displayName(): string | undefined;
  get avatar(): string | undefined;
  get claims(): Claim[];
  get claimRecords(): ClaimData[];
  /**
   * Fetch a profile from ATProto by DID or handle
   */
  static fetch(didOrHandle: string, serviceUrl?: string): Promise<Profile>;
  /**
   * Verify all claims in this profile
   */
  verifyAll(opts?: VerifyOptions): Promise<void>;
  /**
   * Get verification summary
   */
  getSummary(): {
    total: number;
    verified: number;
    failed: number;
    pending: number;
  };
  /**
   * Get claims grouped by status
   */
  getClaimsByStatus(): {
    verified: Claim[];
    failed: Claim[];
    pending: Claim[];
  };
  toJSON(): ProfileData;
}
//# sourceMappingURL=profile.d.ts.map
