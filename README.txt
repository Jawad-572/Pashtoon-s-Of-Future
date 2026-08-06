PASHTOON'S OF FUTURE — website + PWA package
==============================================

WHAT'S IN THIS FOLDER
----------------------
index.html              -> the Urdu landing page (RTL, QR payment section)
qr-payment.jpg           -> your bank QR code image, referenced by index.html
manifest.json             -> PWA manifest (app name, colors, icon list)
icons/                    -> all 7 icon sizes generated from your uploaded artwork
.well-known/assetlinks.json -> lets the Android app open without a browser bar
                               (must be publicly reachable at
                               https://yourdomain/.well-known/assetlinks.json)

HOW TO DEPLOY
-------------
1. Copy everything in this folder into the root of your GitHub repo
   (the one connected to your Vercel project), preserving the folder
   structure exactly (icons/ and .well-known/ must stay as subfolders).
2. Commit and push. Vercel will auto-redeploy.
3. Confirm these two URLs load correctly after deploy:
   https://pashtoons-of-future.vercel.app/manifest.json
   https://pashtoons-of-future.vercel.app/.well-known/assetlinks.json

HOW TO GENERATE THE NEW APK/AAB
--------------------------------
1. Go to https://www.pwabuilder.com
2. Enter: https://pashtoons-of-future.vercel.app
3. Run the audit (it should now detect the new name, icons, and manifest)
4. Click "Package for Stores" -> Android
5. IMPORTANT: choose "Use existing signing key" and upload the
   signing.keystore file you already have (from your first package),
   with:
     Key store password: h7RxiUgoFM0f
     Key alias: my-key-alias
     Key password: h7RxiUgoFM0f
   This keeps it as an UPDATE to your existing Play Store app instead
   of creating a new listing.
6. Download the new .aab and upload it to Play Console under your
   existing app -> Production (or Internal testing) -> Create new release.

NOTE ON THE ICON
-----------------
The icon includes Amazon, Shopify, and Facebook Marketplace logos.
This is a known trademark risk for Play Store review — you chose to
proceed with it anyway. Keep the mountain/sunrise icon on hand as a
fallback if Google flags the listing.
