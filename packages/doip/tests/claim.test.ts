import { describe, it, expect } from "vitest";
import { Claim, ClaimStatus } from "../src/index.js";

describe("Claim", () => {
  describe("constructor", () => {
    it("should accept valid DID", () => {
      const claim = new Claim("https://gist.github.com/alice/abc123def456", "did:plc:test123");
      expect(claim.did).toBe("did:plc:test123");
      expect(claim.uri).toBe("https://gist.github.com/alice/abc123def456");
    });

    it("should accept did:web DIDs", () => {
      const claim = new Claim("dns:example.com", "did:web:example.com");
      expect(claim.did).toBe("did:web:example.com");
    });

    it("should reject invalid DID", () => {
      expect(() => new Claim("https://gist.github.com/alice/abc123", "invalid")).toThrow(
        "Invalid DID format",
      );
    });

    it("should reject empty DID", () => {
      expect(() => new Claim("https://gist.github.com/alice/abc123", "")).toThrow(
        "Invalid DID format",
      );
    });
  });

  describe("match", () => {
    it("should match GitHub gist URI", () => {
      const claim = new Claim("https://gist.github.com/alice/abc123def456", "did:plc:test");
      claim.match();
      expect(claim.status).toBe(ClaimStatus.MATCHED);
      expect(claim.matches).toHaveLength(1);
      expect(claim.matches[0].provider.id).toBe("github");
    });

    it("should match DNS URI", () => {
      const claim = new Claim("dns:example.com", "did:plc:test");
      claim.match();
      expect(claim.status).toBe(ClaimStatus.MATCHED);
      expect(claim.matches).toHaveLength(1);
      expect(claim.matches[0].provider.id).toBe("dns");
    });

    it("should match ActivityPub/Mastodon URI", () => {
      const claim = new Claim("https://mastodon.social/@alice", "did:plc:test");
      claim.match();
      expect(claim.status).toBe(ClaimStatus.MATCHED);
      expect(claim.matches).toHaveLength(1);
      expect(claim.matches[0].provider.id).toBe("activitypub");
    });

    it("should match Bluesky URI", () => {
      const claim = new Claim("https://bsky.app/profile/alice.bsky.social", "did:plc:test");
      claim.match();
      expect(claim.status).toBe(ClaimStatus.MATCHED);
      expect(claim.matches).toHaveLength(1);
      expect(claim.matches[0].provider.id).toBe("bsky");
    });

    it("should fail on unknown URI", () => {
      const claim = new Claim("https://unknown.site/alice", "did:plc:test");
      claim.match();
      expect(claim.status).toBe(ClaimStatus.ERROR);
      expect(claim.errors).toHaveLength(1);
      expect(claim.errors[0]).toContain("No service provider matched");
    });

    it("should handle trailing slashes", () => {
      const claim = new Claim("https://gist.github.com/alice/abc123def456/", "did:plc:test");
      claim.match();
      expect(claim.status).toBe(ClaimStatus.MATCHED);
    });
  });

  describe("isAmbiguous", () => {
    it("should return false for GitHub (unambiguous)", () => {
      const claim = new Claim("https://gist.github.com/alice/abc123def456", "did:plc:test");
      claim.match();
      expect(claim.isAmbiguous()).toBe(false);
    });

    it("should return true for ActivityPub (ambiguous)", () => {
      const claim = new Claim("https://mastodon.social/@alice", "did:plc:test");
      claim.match();
      expect(claim.isAmbiguous()).toBe(true);
    });
  });

  describe("toJSON", () => {
    it("should serialize claim to JSON", () => {
      const claim = new Claim("https://gist.github.com/alice/abc123def456", "did:plc:test123");
      claim.match();

      const json = claim.toJSON();
      expect(json).toEqual({
        uri: "https://gist.github.com/alice/abc123def456",
        did: "did:plc:test123",
        status: ClaimStatus.MATCHED,
        matches: [{ provider: "github", isAmbiguous: false }],
        errors: [],
      });
    });
  });

  describe("fromJSON", () => {
    it("should deserialize claim from JSON", () => {
      const claim = Claim.fromJSON({
        uri: "https://gist.github.com/alice/abc123def456",
        did: "did:plc:test123",
      });
      expect(claim.uri).toBe("https://gist.github.com/alice/abc123def456");
      expect(claim.did).toBe("did:plc:test123");
      expect(claim.status).toBe(ClaimStatus.INIT);
    });
  });
});
