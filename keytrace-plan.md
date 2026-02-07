# Project: [NAME TBD] - ATProto Identity Verification

## Overview

A Keybase/Keyoxide-style identity verification system built on ATProto. Users prove ownership of external accounts (GitHub, Mastodon, domains, etc.) by storing cryptographically signed claims in their ATProto repository.

**Key differences from Keyoxide:**

- Uses ATProto DIDs instead of PGP keys (no key generation UX nightmare)
- Claims stored as ATProto records, not PGP notations
- OAuth-based onboarding instead of "paste your fingerprint"
- Data portable with the user's PDS

## Monorepo Structure

```
/
├── packages/
│   ├── doip/                    # Fork of doip.js, adapted for ATProto
│   │   ├── src/
│   │   │   ├── claim.ts         # Claim class (fingerprint → DID)
│   │   │   ├── profile.ts       # Profile fetching from ATProto
│   │   │   ├── serviceProviders/
│   │   │   │   ├── github.ts
│   │   │   │   ├── mastodon.ts
│   │   │   │   ├── dns.ts
│   │   │   │   └── ...          # Keep most from doip.js
│   │   │   ├── fetchers/
│   │   │   │   ├── http.ts
│   │   │   │   ├── dns.ts
│   │   │   │   ├── activitypub.ts
│   │   │   │   └── ...
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── lexicon/                 # Lexicon definitions
│   │   ├── org/
│   │   │   └── [domain]/
│   │   │       └── identity/
│   │   │           └── claim.json
│   │   └── package.json
│   │
│   ├── web/                     # Main website SSR react
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   │   ├── /            # Landing page
│   │   │   │   ├── /[did]       # Profile view (e.g., /did:plc:xxx)
│   │   │   │   ├── /@[handle]   # Profile view by handle
│   │   │   │   ├── /add         # Add new claim wizard
│   │   │   │   ├── /settings    # Manage your claims
│   │   │   │   └── /auth        # OAuth callback
│   │   │   ├── lib/
│   │   │   │   ├── atproto.ts   # ATProto client utilities
│   │   │   │   └── verify.ts    # Client-side verification
│   │   │   └── components/
│   │   ├── package.json
│   │   └── ...
│   │
│   └── proxy/                   # Verification proxy server
│       ├── src/
│       │   ├── routes/
│       │   │   ├── dns.ts       # DNS TXT lookups
│       │   │   ├── http.ts      # Proxied HTTP fetches
│       │   │   └── verify.ts    # Full server-side verification
│       │   └── index.ts
│       ├── package.json
│       └── Dockerfile
│
├── package.json                 # Workspace root
├── pnpm-workspace.yaml
└── turbo.json                   # Or nx.json if preferring Nx
```

## Lexicon Definition

File: `packages/lexicon/org/[domain]/identity/claim.json`

```json
{
  "lexicon": 1,
  "id": "org.[domain].identity.claim",
  "defs": {
    "main": {
      "type": "record",
      "key": "tid",
      "description": "An identity claim linking this DID to an external account",
      "record": {
        "type": "object",
        "required": ["claimUri", "createdAt"],
        "properties": {
          "claimUri": {
            "type": "string",
            "description": "The identity claim URI (e.g., https://github.com/username, dns:example.com)"
          },
          "comment": {
            "type": "string",
            "maxLength": 256,
            "description": "Optional user-provided label for this claim"
          },
          "createdAt": {
            "type": "string",
            "format": "datetime"
          }
        }
      }
    }
  }
}
```

This will need work, but is a fine start

## Core doip.js Changes

### 1. Profile Loading

Replace OpenPGP profile fetching with ATProto:

```typescript
// packages/doip/src/profile.ts

import { Agent } from "@atproto/api";

export interface Profile {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
  claims: string[]; // claim URIs
}

export async function fetchProfile(didOrHandle: string): Promise<Profile> {
  const agent = new Agent({ service: "https://public.api.bsky.app" });

  // Resolve handle to DID if needed
  let did = didOrHandle;
  if (!didOrHandle.startsWith("did:")) {
    const resolved = await agent.resolveHandle({ handle: didOrHandle });
    did = resolved.data.did;
  }

  // Fetch profile metadata from Bluesky (optional, for display)
  const bskyProfile = await agent.getProfile({ actor: did }).catch(() => null);

  // List all claim records
  const records = await agent.com.atproto.repo.listRecords({
    repo: did,
    collection: "org.[domain].identity.claim",
    limit: 100,
  });

  return {
    did,
    handle: bskyProfile?.data.handle ?? did,
    displayName: bskyProfile?.data.displayName,
    avatar: bskyProfile?.data.avatar,
    claims: records.data.records.map((r) => r.value.claimUri),
  };
}
```

### 2. Claim Class Modifications

```typescript
// packages/doip/src/claim.ts

export class Claim {
  private _uri: string;
  private _did: string; // was: _fingerprint
  private _status: ClaimStatus;
  private _matches: ServiceProviderMatch[];

  constructor(uri: string, did: string) {
    this._uri = uri;
    this._did = did;
    // Validate DID format
    if (!did.startsWith("did:")) {
      throw new Error("Invalid DID format");
    }
  }

  // Match against service providers (mostly unchanged)
  match(): void {
    // existing logic to find matching service providers
  }

  // Verify the claim
  async verify(opts?: VerifyOptions): Promise<void> {
    // For each matched service provider:
    // 1. Fetch proof location
    // 2. Look for DID (or handle, or profile URL) in response

    const proofPatterns = this.generateProofPatterns();
    // ... verification logic
  }

  private generateProofPatterns(): string[] {
    // Patterns to search for in proof locations
    return [
      this._did, // did:plc:xxx
      this._did.replace("did:plc:", ""), // just xxx
      `https://[SITE_DOMAIN]/${this._did}`, // profile URL
      `https://[SITE_DOMAIN]/did:plc:${this._did.split(":")[2]}`,
      // Also support handle if we have it
    ];
  }
}
```

### 3. Service Provider Adjustments

Most service providers can stay the same. Main change is what they look for in proofs:

```typescript
// packages/doip/src/serviceProviders/github.ts

export const github: ServiceProvider = {
  name: "GitHub",
  id: "github",

  // Regex to match GitHub profile URLs
  repiUri: /^https:\/\/github\.com\/([^/]+)\/?$/,

  // How to fetch the proof
  proof: {
    request: {
      // Fetch the user's gist or profile README
      uri: "https://api.github.com/users/{username}/gists",
      // or check bio via API
    },
    response: {
      format: "json",
    },
    // Where to look for the proof in the response
    target: [["description"], ["files", "*", "content"]],
  },

  // Generate the claim text user should add
  getProofText(did: string): string {
    return did; // or a URL to their profile
  },
};
```

## Website Routes

### Public Routes

| Route                       | Purpose                                        |
| --------------------------- | ---------------------------------------------- |
| `/`                         | Landing page, explain what this is, search box |
| `/did:plc:xxx`              | View profile by DID                            |
| `/@handle.bsky.social`      | View profile by handle (redirects or resolves) |
| `/verify?claim=...&did=...` | One-off verification check                     |
| `/guide/[service]`          | How to add proof for a specific service        |

### Authenticated Routes

| Route            | Purpose                               |
| ---------------- | ------------------------------------- |
| `/auth/login`    | Start OAuth flow                      |
| `/auth/callback` | OAuth callback                        |
| `/dashboard`     | View your claims, verification status |
| `/add`           | Wizard to add new claim               |
| `/add/[service]` | Service-specific instructions         |
| `/remove/[rkey]` | Delete a claim                        |

## OAuth Scopes Needed

```
atproto
com.atproto.repo.write  # to create/delete claim records
```

Minimal scope - we only need to write to our own lexicon collection.

## Proxy Server Endpoints

```
GET /api/dns?domain=example.com
    → Returns TXT records

GET /api/http?url=https://...&format=json|text
    → Proxied fetch with appropriate headers
    → Allowlist of domains (service provider domains only)

POST /api/verify
    Body: { did: string, claimUri: string }
    → Full server-side verification
    → Returns verification result
```

## Implementation Phases

### Phase 1: Core Library

1. Fork doip.js, convert to TypeScript
2. Remove all OpenPGP/ASP code
3. Implement ATProto profile fetching
4. Update Claim class to use DIDs
5. Test with 3-4 service providers (GitHub, Mastodon, DNS, Bluesky)

### Phase 2: Proxy Server

1. Set up basic Hono/Express server
2. Implement DNS lookup endpoint
3. Implement HTTP proxy endpoint (with domain allowlist)
4. Implement full verification endpoint
5. Add rate limiting, caching

### Phase 3: Website MVP

1. Profile viewing (read-only, no auth)
2. Handle → DID resolution
3. Display claims with verification status
4. Nice UI for verified/unverified/pending states

### Phase 4: Claim Management

1. OAuth implementation
2. Dashboard to view your claims
3. "Add claim" wizard
4. Service-specific guides with copy-paste proof text
5. Delete claim functionality

### Phase 5: Polish

1. Onboarding flow improvements
2. Real-time verification status updates
3. Share/embed profile cards
4. API for third parties

## Tech Stack Recommendations

- **Monorepo**: pnpm workspaces + Turborepo
- **Language**: TypeScript throughout
- **Web framework**: SvelteKit (good DX, SSR, easy deployment) or Astro (if more static)
- **Proxy server**: Hono (lightweight, runs anywhere) or Express
- **ATProto**: `@atproto/api` package
- **Styling**: Tailwind
- **Deployment**: Vercel (web), Fly.io or Railway (proxy)

## Key Decisions Still Needed

1. **Project name / domain** - needed for lexicon NSID
2. **Proof format** - just DID? Profile URL? Both?
3. **Handle display** - show ATProto handle, or let users set custom display?
4. **Caching strategy** - how long to cache verification results?
5. **Rate limits** - for proxy server

## Service Providers to Support (Priority Order)

### P0 (Launch)

- DNS (domain ownership)
- GitHub
- Mastodon/Fediverse (ActivityPub)
- Bluesky (verify you own another bsky account?)

### P1 (Fast follow)

- GitLab
- Codeberg/Forgejo
- Twitter/X (if API still works)
- Reddit
- Hacker News
- Lobsters

### P2 (Nice to have)

- Matrix
- Discord
- Telegram
- Keybase (ironically)
- XMPP
- IRC
- Personal website (HTTP header or meta tag)

## Example User Flow

1. User visits site, clicks "Sign in with Bluesky"
2. OAuth flow, user grants permission
3. Dashboard shows "No claims yet"
4. User clicks "Add GitHub"
5. Site shows: "Add this to your GitHub bio or a public gist:"
   ```
   did:plc:ewvi7nxzyoun6zhxrhs64oiz
   ```
6. User adds it to their GitHub bio
7. User clicks "Verify"
8. Site checks GitHub API, finds DID in bio
9. Site creates claim record in user's ATProto repo
10. Profile page now shows verified GitHub link

## Notes

- The claim record in ATProto is the SOURCE OF TRUTH for "what claims does this user make"
- Verification is done on-demand (not stored) - keeps data fresh
- Users can delete claims anytime by deleting the record
- Third parties can verify claims using just the doip library + a DID
