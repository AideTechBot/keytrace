#!/bin/bash
set -e

VERSION_TYPE=$1

if [[ ! "$VERSION_TYPE" =~ ^(major|minor|patch)$ ]]; then
  echo "Usage: ./scripts/deploy.sh <major|minor|patch>"
  exit 1
fi

echo "==> Bumping $VERSION_TYPE version across packages..."

# Get current version from runner package (source of truth)
CURRENT_VERSION=$(node -p "require('./packages/runner/package.json').version")
echo "    Current version: $CURRENT_VERSION"

# Calculate new version
IFS='.' read -ra VERSION_PARTS <<< "$CURRENT_VERSION"
MAJOR=${VERSION_PARTS[0]}
MINOR=${VERSION_PARTS[1]}
PATCH=${VERSION_PARTS[2]}

case $VERSION_TYPE in
  major)
    MAJOR=$((MAJOR + 1))
    MINOR=0
    PATCH=0
    ;;
  minor)
    MINOR=$((MINOR + 1))
    PATCH=0
    ;;
  patch)
    PATCH=$((PATCH + 1))
    ;;
esac

NEW_VERSION="$MAJOR.$MINOR.$PATCH"
echo "    New version: $NEW_VERSION"

# Update package versions
PACKAGES=("packages/runner" "packages/verify" "packages/lexicon")

for pkg in "${PACKAGES[@]}"; do
  echo "==> Updating $pkg to $NEW_VERSION..."
  cd "$pkg"
  npm version "$NEW_VERSION" --no-git-tag-version
  cd - > /dev/null
done

echo "==> Building all packages..."
yarn build

echo "==> Publishing to npm..."
for pkg in "${PACKAGES[@]}"; do
  echo "    Publishing $pkg..."
  cd "$pkg"
  yarn npm publish --access public
  cd - > /dev/null
done

 echo "==> (Not yet) Deploying lexicons to ATProto via goat..."
# npx @atproto/goat lexicon publish packages/lexicon/lexicons/

echo "==> Creating git tag v$NEW_VERSION..."
git add .
git commit -m "Release v$NEW_VERSION"
git tag "v$NEW_VERSION"

echo ""
echo "Deploy complete! Version $NEW_VERSION published."
echo "Run 'git push && git push --tags' to push to remote."
