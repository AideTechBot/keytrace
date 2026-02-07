import { describe, it, expect } from "vitest";
import dns from "../../src/serviceProviders/dns.js";

describe("DNS Service Provider", () => {
  describe("URI matching", () => {
    it.each(dns.tests)("should handle $uri correctly", ({ uri, shouldMatch }) => {
      const match = uri.match(dns.reUri);
      expect(!!match).toBe(shouldMatch);
    });

    it("should extract domain", () => {
      const uri = "dns:example.com";
      const match = uri.match(dns.reUri);
      expect(match).not.toBeNull();
      expect(match![1]).toBe("example.com");
    });

    it("should extract subdomain", () => {
      const uri = "dns:sub.example.com";
      const match = uri.match(dns.reUri);
      expect(match).not.toBeNull();
      expect(match![1]).toBe("sub.example.com");
    });
  });

  describe("processURI", () => {
    it("should return correct profile info", () => {
      const uri = "dns:example.com";
      const match = uri.match(dns.reUri)!;
      const result = dns.processURI(uri, match);

      expect(result.profile.display).toBe("example.com");
      expect(result.profile.uri).toBe("https://example.com");
      expect(result.profile.qrcode).toBe(false);
    });

    it("should return correct proof request", () => {
      const uri = "dns:example.com";
      const match = uri.match(dns.reUri)!;
      const result = dns.processURI(uri, match);

      expect(result.proof.request.uri).toBe("example.com");
      expect(result.proof.request.fetcher).toBe("dns");
      expect(result.proof.request.format).toBe("json");
    });
  });

  describe("getProofText", () => {
    it("should generate correct TXT record format", () => {
      const did = "did:plc:abc123";
      const proofText = dns.getProofText(did);
      expect(proofText).toBe("keytrace-verification=did:plc:abc123");
    });
  });
});
