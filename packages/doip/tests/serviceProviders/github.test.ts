import { describe, it, expect } from "vitest";
import github from "../../src/serviceProviders/github.js";

describe("GitHub Service Provider", () => {
  describe("URI matching", () => {
    it.each(github.tests)("should handle $uri correctly", ({ uri, shouldMatch }) => {
      const match = uri.match(github.reUri);
      expect(!!match).toBe(shouldMatch);
    });

    it("should extract username and gist ID", () => {
      const uri = "https://gist.github.com/alice/abc123def456";
      const match = uri.match(github.reUri);
      expect(match).not.toBeNull();
      expect(match![1]).toBe("alice");
      expect(match![2]).toBe("abc123def456");
    });
  });

  describe("processURI", () => {
    it("should return correct profile info", () => {
      const uri = "https://gist.github.com/alice/abc123def456";
      const match = uri.match(github.reUri)!;
      const result = github.processURI(uri, match);

      expect(result.profile.display).toBe("@alice");
      expect(result.profile.uri).toBe("https://github.com/alice");
      expect(result.profile.qrcode).toBe(true);
    });

    it("should return correct proof request", () => {
      const uri = "https://gist.github.com/alice/abc123def456";
      const match = uri.match(github.reUri)!;
      const result = github.processURI(uri, match);

      expect(result.proof.request.uri).toBe("https://api.github.com/gists/abc123def456");
      expect(result.proof.request.fetcher).toBe("http");
      expect(result.proof.request.format).toBe("json");
    });

    it("should have correct proof targets", () => {
      const uri = "https://gist.github.com/alice/abc123def456";
      const match = uri.match(github.reUri)!;
      const result = github.processURI(uri, match);

      expect(result.proof.target.length).toBeGreaterThan(0);
      // Should check files and description
      const paths = result.proof.target.map((t) => t.path.join("."));
      expect(paths).toContain("files.proof.md.content");
      expect(paths).toContain("description");
    });
  });

  describe("getProofText", () => {
    it("should generate correct proof text", () => {
      const did = "did:plc:abc123";
      const proofText = github.getProofText(did);
      expect(proofText).toContain(did);
      expect(proofText).toContain("keytrace");
    });
  });
});
