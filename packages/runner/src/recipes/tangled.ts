import type { Recipe } from "../types.js";

/**
 * Built-in recipe: Tangled Account verification via keytrace.json.
 *
 * The user creates a keytrace.json file at tangled.org/<username>/keytrace/keytrace.json
 * containing their claim ID and DID, then provides the file URL for verification.
 */
export const tangledRecipe: Recipe = {
  $type: "dev.keytrace.recipe",
  type: "tangled",
  version: 1,
  displayName: "Tangled Account",
  params: [
    {
      key: "tangledUrl",
      label: "Tangled URL",
      type: "url",
      placeholder: "https://tangled.org/username/keytrace/keytrace.json",
      pattern: "^https://tangled\\.org/([^/]+)/keytrace/keytrace\\.json$",
      extractFrom: "^https://tangled\\.org/([^/]+)/",
    },
  ],
  instructions: {
    steps: [
      "Go to your tangled.org account",
      "Create a `keytrace` directory (if it doesn't exist)",
      "Create a `keytrace.json` file in the keytrace directory",
      "Paste the verification content below into the file",
      "Save the file and paste the full URL below",
    ],
    proofTemplate: '{\n  "keytrace": "{claimId}",\n  "did": "{did}"\n}',
    proofLocation: "keytrace.json file on tangled.org",
  },
  verification: {
    steps: [
      {
        action: "http-get",
        url: "{tangledUrl}",
      },
      {
        action: "json-path",
        selector: "$.keytrace",
        expect: "equals:{claimId}",
      },
      {
        action: "json-path",
        selector: "$.did",
        expect: "equals:{did}",
      },
    ],
  },
};
