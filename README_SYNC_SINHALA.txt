SALIYA ENTERPRISES - TWO DEVICE SYNC

1. Extract ZIP. Upload index.html, app.js, firebase-sync.js, style.css, logo.png, banner.png to GitHub Pages repository root.
2. Both PC and manager phone MUST use the same HTTPS URL: https://ravidud931-tech.github.io/saliya-enterprises/
3. Do NOT open index.html as file:// on either device; local file mode is not shared across devices.
4. Firebase Realtime Database Rules must allow authenticated users to read/write businessData. Anonymous Auth must be enabled.
5. Verify: open same website in two browsers. Add a TEST customer on phone, wait for Firebase Save success, observe customer in PC after realtime sync (or refresh).
6. If status is not Connected, check F12 Console, Network, and Firebase Rules.
7. Firebase data is authoritative. Backup JSON before first deployment if local browser has valuable records.
8. IMPORTANT SECURITY: auth != null with Anonymous Authentication allows anyone with website access to read/change data; this is NOT secure for sensitive business use. Use approved accounts/access controls for production.
9. This package is statically syntax checked, not live tested against your Firebase project.
