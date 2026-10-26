# Android app and update strategy

## Current stage

This repository is a static, GitHub Pages learning application. This change introduces a reproducible Capacitor Android build and CI artifact. It does not yet publish a signed production APK or silently install native code.

## Build a test APK

1. Open **Actions → Android app build** in GitHub.
2. Run the workflow manually, or push a change matching its path filters.
3. Download the `net-psychology-debug-apk` artifact from a successful run.
4. Install the debug APK on a test Android device. Debug APKs are for testing, not public distribution.

The workflow generates the Android project during CI so generated platform files do not clutter the learning-content repository.

## Update types

- **Website/PWA:** GitHub Pages and the existing service worker continue to deliver website changes. Service-worker updates may activate after a reload, depending on the existing worker lifecycle.
- **Native Android shell:** changes to Capacitor configuration, native plugins, permissions, or native source require a new APK. Distribution of signed updates must use the same signing identity.
- **Native OTA bundles:** do not ship until a compatible OTA provider/runtime is configured, release signatures and compatibility checks are enforced, and rollback is tested. A web URL or GitHub raw file alone is not a secure native OTA updater.

## Release safety requirements

Before enabling native OTA:
1. Pin and audit the chosen Capacitor OTA provider/plugin and its license.
2. Publish immutable, versioned bundles and a signed release manifest.
3. Verify integrity/signature and app compatibility before activation.
4. Stage updates, retain the last known-good bundle, and roll back on boot/runtime failure.
5. Never download or execute arbitrary scripts from an editable branch.
6. Test offline startup, interrupted downloads, stale manifests, migrations, and update failure.
7. Use a protected release workflow and a signed production APK; do not store signing secrets in repository files.

## Important constraints

GitHub Pages is a static host. It does not provide a private update API, user authentication, or secure signing by itself. The OTA design must use immutable release artifacts and cryptographic verification, not trust a mutable branch as the authority for executable code.
