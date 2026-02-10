import type { ServiceProvider } from "./types.js";

/**
 * Tangled service provider
 *
 * Users prove ownership of their tangled.org account by creating a
 * keytrace.json file at tangled.org/<username>/keytrace/keytrace.json
 * containing their DID.
 */
const tangled: ServiceProvider = {
  id: "tangled",
  name: "Tangled",
  homepage: "https://tangled.org",

  // Match tangled.org/<username>/keytrace/keytrace.json URLs
  reUri: /^https:\/\/tangled\.org\/([^/]+)\/keytrace\/keytrace\.json$/,

  isAmbiguous: false,

  ui: {
    description: "Link via tangled.org keytrace.json",
    icon: "link",
    inputLabel: "Tangled URL",
    inputPlaceholder: "https://tangled.org/username/keytrace/keytrace.json",
    instructions: [
      "Go to your tangled.org account",
      "Create a `keytrace` directory (if it doesn't exist)",
      "Create a `keytrace.json` file in the keytrace directory",
      "Paste the verification content below into the file",
      "Save the file and paste the full URL below",
    ],
    proofTemplate: '{\n  "keytrace": "{claimId}",\n  "did": "{did}"\n}',
  },

  processURI(uri, match) {
    const [, username] = match;

    return {
      profile: {
        display: `@${username}`,
        uri: `https://tangled.org/${username}`,
      },
      proof: {
        request: {
          uri,
          fetcher: "http",
          format: "json",
        },
        target: [
          // Check keytrace field equals claimId
          {
            path: ["keytrace"],
            relation: "equals",
            format: "text",
          },
          // Check did field equals did
          {
            path: ["did"],
            relation: "contains",
            format: "text",
          },
        ],
      },
    };
  },

  postprocess(data, match) {
    const [, username] = match;

    return {
      subject: username,
      profileUrl: `https://tangled.org/${username}`,
    };
  },

  getProofText(did) {
    return `Verifying my identity on keytrace: ${did}`;
  },

  getProofLocation(match) {
    const [, username] = match;
    return `Create keytrace.json at tangled.org/${username}/keytrace/`;
  },

  tests: [
    { uri: "https://tangled.org/alice/keytrace/keytrace.json", shouldMatch: true },
    { uri: "https://tangled.org/user123/keytrace/keytrace.json", shouldMatch: true },
    { uri: "https://tangled.org/alice", shouldMatch: false },
    { uri: "https://github.com/alice", shouldMatch: false },
  ],
};

export default tangled;
