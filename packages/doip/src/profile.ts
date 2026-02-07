import { AtpAgent } from "@atproto/api";
import { Claim } from "./claim.js";
import { ClaimStatus } from "./types.js";
import { COLLECTION_NSID, PUBLIC_API_URL } from "./constants.js";
import type { ProfileData, ClaimData, VerifyOptions } from "./types.js";

/**
 * Represents a user profile with identity claims from ATProto
 */
export class Profile {
  private _did: string;
  private _handle: string;
  private _displayName?: string;
  private _avatar?: string;
  private _claims: Claim[] = [];
  private _claimRecords: ClaimData[] = [];

  private constructor(data: ProfileData) {
    this._did = data.did;
    this._handle = data.handle;
    this._displayName = data.displayName;
    this._avatar = data.avatar;
    this._claimRecords = data.claims;
    this._claims = data.claims.map((c) => new Claim(c.uri, data.did));
  }

  get did(): string {
    return this._did;
  }

  get handle(): string {
    return this._handle;
  }

  get displayName(): string | undefined {
    return this._displayName;
  }

  get avatar(): string | undefined {
    return this._avatar;
  }

  get claims(): Claim[] {
    return this._claims;
  }

  get claimRecords(): ClaimData[] {
    return this._claimRecords;
  }

  /**
   * Fetch a profile from ATProto by DID or handle
   */
  static async fetch(didOrHandle: string, serviceUrl = PUBLIC_API_URL): Promise<Profile> {
    const agent = new AtpAgent({ service: serviceUrl });

    // Resolve handle to DID if needed
    let did = didOrHandle;
    if (!didOrHandle.startsWith("did:")) {
      const resolved = await agent.resolveHandle({ handle: didOrHandle });
      did = resolved.data.did;
    }

    // Fetch Bluesky profile for display info (optional, may fail)
    let bskyProfile: { handle: string; displayName?: string; avatar?: string } | null = null;
    try {
      const profileRes = await agent.getProfile({ actor: did });
      bskyProfile = {
        handle: profileRes.data.handle,
        displayName: profileRes.data.displayName,
        avatar: profileRes.data.avatar,
      };
    } catch {
      // Profile fetch is optional - user may not have a Bluesky profile
    }

    // List all claim records from the user's repo
    const claims: ClaimData[] = [];
    try {
      const records = await agent.com.atproto.repo.listRecords({
        repo: did,
        collection: COLLECTION_NSID,
        limit: 100,
      });

      for (const record of records.data.records) {
        const value = record.value as {
          claimUri?: string;
          comment?: string;
          createdAt?: string;
        };
        if (value.claimUri) {
          claims.push({
            uri: value.claimUri,
            did,
            comment: value.comment,
            createdAt: value.createdAt ?? new Date().toISOString(),
            rkey: record.uri.split("/").pop() ?? "",
          });
        }
      }
    } catch {
      // Claim records may not exist yet - that's fine
    }

    return new Profile({
      did,
      handle: bskyProfile?.handle ?? did,
      displayName: bskyProfile?.displayName,
      avatar: bskyProfile?.avatar,
      claims,
    });
  }

  /**
   * Verify all claims in this profile
   */
  async verifyAll(opts?: VerifyOptions): Promise<void> {
    await Promise.all(this._claims.map((claim) => claim.verify(opts)));
  }

  /**
   * Get verification summary
   */
  getSummary(): {
    total: number;
    verified: number;
    failed: number;
    pending: number;
  } {
    return {
      total: this._claims.length,
      verified: this._claims.filter((c) => c.status === ClaimStatus.VERIFIED).length,
      failed: this._claims.filter(
        (c) => c.status === ClaimStatus.FAILED || c.status === ClaimStatus.ERROR,
      ).length,
      pending: this._claims.filter(
        (c) => c.status === ClaimStatus.INIT || c.status === ClaimStatus.MATCHED,
      ).length,
    };
  }

  /**
   * Get claims grouped by status
   */
  getClaimsByStatus(): {
    verified: Claim[];
    failed: Claim[];
    pending: Claim[];
  } {
    return {
      verified: this._claims.filter((c) => c.status === ClaimStatus.VERIFIED),
      failed: this._claims.filter(
        (c) => c.status === ClaimStatus.FAILED || c.status === ClaimStatus.ERROR,
      ),
      pending: this._claims.filter(
        (c) => c.status === ClaimStatus.INIT || c.status === ClaimStatus.MATCHED,
      ),
    };
  }

  toJSON(): ProfileData {
    return {
      did: this._did,
      handle: this._handle,
      displayName: this._displayName,
      avatar: this._avatar,
      claims: this._claimRecords,
    };
  }
}
