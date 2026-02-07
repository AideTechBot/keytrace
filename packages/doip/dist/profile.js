import { AtpAgent } from "@atproto/api";
import { Claim } from "./claim.js";
import { ClaimStatus } from "./types.js";
import { COLLECTION_NSID, PUBLIC_API_URL } from "./constants.js";
/**
 * Represents a user profile with identity claims from ATProto
 */
export class Profile {
  _did;
  _handle;
  _displayName;
  _avatar;
  _claims = [];
  _claimRecords = [];
  constructor(data) {
    this._did = data.did;
    this._handle = data.handle;
    this._displayName = data.displayName;
    this._avatar = data.avatar;
    this._claimRecords = data.claims;
    this._claims = data.claims.map((c) => new Claim(c.uri, data.did));
  }
  get did() {
    return this._did;
  }
  get handle() {
    return this._handle;
  }
  get displayName() {
    return this._displayName;
  }
  get avatar() {
    return this._avatar;
  }
  get claims() {
    return this._claims;
  }
  get claimRecords() {
    return this._claimRecords;
  }
  /**
   * Fetch a profile from ATProto by DID or handle
   */
  static async fetch(didOrHandle, serviceUrl = PUBLIC_API_URL) {
    const agent = new AtpAgent({ service: serviceUrl });
    // Resolve handle to DID if needed
    let did = didOrHandle;
    if (!didOrHandle.startsWith("did:")) {
      const resolved = await agent.resolveHandle({ handle: didOrHandle });
      did = resolved.data.did;
    }
    // Fetch Bluesky profile for display info (optional, may fail)
    let bskyProfile = null;
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
    const claims = [];
    try {
      const records = await agent.com.atproto.repo.listRecords({
        repo: did,
        collection: COLLECTION_NSID,
        limit: 100,
      });
      for (const record of records.data.records) {
        const value = record.value;
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
  async verifyAll(opts) {
    await Promise.all(this._claims.map((claim) => claim.verify(opts)));
  }
  /**
   * Get verification summary
   */
  getSummary() {
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
  getClaimsByStatus() {
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
  toJSON() {
    return {
      did: this._did,
      handle: this._handle,
      displayName: this._displayName,
      avatar: this._avatar,
      claims: this._claimRecords,
    };
  }
}
//# sourceMappingURL=profile.js.map
