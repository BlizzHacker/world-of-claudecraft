# Android upload keystore

`android/keystore.properties` expects a keystore at:
`C:/MoveWeight/cryptic-realm/cryptic-realm-upload.keystore`, alias `cryptic-realm`.

It does NOT exist yet — generate it ONCE on the machine with the Android SDK/JDK
(Android Studio bundles keytool at `<AndroidStudio>/jbr/bin/keytool`). Run from
the repo root:

```
keytool -genkeypair -v ^
  -keystore cryptic-realm-upload.keystore ^
  -alias cryptic-realm ^
  -keyalg RSA -keysize 2048 -validity 10000 ^
  -dname "CN=Cryptic Realm, O=MoveWeight, C=US"
```

It prompts for a store password + key password — pick strong ones and SAVE THEM
in a password manager. **If you lose this keystore or its passwords you can never
update the Play listing again** (you'd have to publish a brand-new app). Back the
.keystore file up off-machine.

Then put the passwords in `android/keystore.properties` (gitignored):
```
storeFile=C:/MoveWeight/cryptic-realm/cryptic-realm-upload.keystore
storePassword=<your store password>
keyAlias=cryptic-realm
keyPassword=<your key password>
```

Build the signed bundle for Play:
```
npm run cap:android      # builds web + cap sync + opens Android Studio
# In Android Studio: Build > Generate Signed Bundle / APK > Android App Bundle
# pick the keystore above -> release -> produces app-release.aab
```
Upload that .aab in Google Play Console (your account; manual, one-time per release).
