# Keytrace

Identity verification for ATProto. Link your decentralized identity (DID) to external accounts like GitHub, DNS, and Mastodon with cryptographically signed attestations.

## What is Keytrace?

Keytrace allows Bluesky users to prove ownership of external accounts by:

1. **Creating a claim** - Post a verification token to your GitHub gist, DNS TXT record, or other supported platform
2. **Verification** - Keytrace fetches and validates the proof contains your DID
3. **Attestation** - A cryptographic signature is created and stored in your ATProto repo as a `dev.keytrace.claim` record

Claims are user-owned, portable, and stored directly in your ATProto repository.

## Project Structure

```text
keytrace/
├── apps/
│   └── keytrace.dev/     # Nuxt 3 web application
├── packages/
│   ├── runner/           # Core verification library (@keytrace/runner)
│   └── lexicon/          # ATProto lexicon schemas
```

## Development

```bash
# Install dependencies
yarn install

# Start development server
yarn dev

# Run tests
yarn test

# Type checking
yarn typecheck

# Format code
yarn format
```

## How Verification Works

The runner package implements a recipe-based verification system:

1. **Service Providers** match claim URIs to verification strategies
2. **Recipes** define verification steps as JSON specifications
3. **Verification Steps** are composable actions: `http-get`, `dns-txt`, `css-select`, `json-path`, `regex-match`

Example flow:

```text
User submits gist URL
  → Match URI to GitHub provider
  → Execute recipe: HTTP GET → CSS select → regex match for DID
  → Extract identity metadata (username, avatar)
  → Create attestation signature
  → Write dev.keytrace.claim to user's ATProto repo
```

## ATProto Lexicons

- `dev.keytrace.claim` - Identity claim linking a DID to an external account
- `dev.keytrace.recipe` - Verification recipe specification
- `dev.keytrace.key` - Daily signing key for attestations
- `dev.keytrace.signature` - Cryptographic attestation structure

## License

MIT
