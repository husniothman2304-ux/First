# My personal website

A personal site for **projects, notes, blog posts and photos**, with a frosted-glass design in light and dark mode. It is plain HTML, CSS and JavaScript with no build step.

- **Only you can edit.** You sign in with Google to add, edit, delete and upload. Firebase security rules enforce this on the server, so hiding the buttons is not what keeps others out.
- **Visitors can comment** on any published post, project, note or photo.
- **Visitors can send you private messages.** Only you can read them, in your Inbox.
- **Drafts.** Turn off "Published" to keep something visible only to you.
- **Uploads.** Cover images, photo gallery (several photos at once), and images inside posts. Photos are resized in the browser before upload.
- **Markdown** for writing, with a live preview.

## Try it locally (demo mode)

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

Until Firebase is configured, the site runs in **demo mode**: everything is saved in your own browser only. Click **Owner sign in** at the bottom of the page to try the editor.

## Go live

### 1. Create a Firebase project
1. Go to <https://console.firebase.google.com> and create a project.
2. **Build → Authentication → Get started →** enable the **Google** sign-in provider.
3. **Build → Firestore Database → Create database** (production mode).
4. **Build → Storage → Get started.** New projects need the pay-as-you-go **Blaze** plan to use Storage. It still includes a free monthly allowance, which a personal site normally stays within. Set a budget alert under *Usage and billing* to be safe.
5. **Project settings → General → Your apps → Web (`</>`)**: register an app and copy the `firebaseConfig` values.

### 2. Connect the site
Paste the values into `FIREBASE_CONFIG` in [`assets/js/config.js`](assets/js/config.js).

### 3. Make yourself the owner
1. Open the site and click **Owner sign in**. Sign in with your Google account.
2. A yellow banner shows your **user ID**. Copy it.
3. In **both** [`firestore.rules`](firestore.rules) and [`storage.rules`](storage.rules), replace `REPLACE_WITH_YOUR_UID` with your ID.
4. Publish the rules, either by pasting each file into the **Rules** tab of Firestore and Storage in the Firebase console, or with the CLI:
   ```bash
   npm i -g firebase-tools
   firebase login
   firebase use --add          # pick your project
   firebase deploy --only firestore:rules,storage
   ```
5. Reload the site. You now see **+** (add), **Inbox** and **Sign out** in the top bar.

> Until you replace `REPLACE_WITH_YOUR_UID`, nobody is the owner, so nobody can edit. That is the safe default.

### 4. Publish the website
**GitHub Pages:** *Settings → Pages → Deploy from a branch*, pick your branch and `/ (root)`. Then add your Pages domain (for example `husniothman2304-ux.github.io`) under Firebase **Authentication → Settings → Authorized domains**, or Google sign-in will refuse it.

**Or Firebase Hosting:** `firebase deploy --only hosting`. Its domain is already authorised.

## Using the site
| You want to… | Do this |
| --- | --- |
| Add a project, note or post | **+** in the top bar, or **New …** on a section page |
| Upload photos | **Photos → Upload photos** (pick several at once) |
| Put an image inside a post | **Insert image** above the text box in the editor |
| Edit or delete something | Open it, then **Edit** / **Delete** |
| Hide something for now | Turn off **Published** in the editor (it becomes a draft) |
| Change your name, bio or picture | **Home → Edit profile** |
| Read private messages | **Inbox** icon in the top bar (the red badge counts unread ones) |
| Remove a comment | Trash icon next to the comment (only you see it) |

## How it's organised
```
index.html                 page shell
assets/css/style.css       glass theme (light + dark)
assets/js/config.js        Firebase keys + default profile   ← edit this
assets/js/app.js           pages, editor, comments, inbox
assets/js/ui.js            helpers: modals, toasts, icons, image resizing
assets/js/backend-*.js     Firebase (live) and localStorage (demo) data layers
firestore.rules            who can read/write what           ← put your user ID here
storage.rules              who can upload                    ← and here
```

## Spam
Comments and messages have a hidden "honeypot" field and a short per-browser cooldown, and the rules cap their length. If spam becomes a problem, turn on [Firebase App Check](https://firebase.google.com/docs/app-check) with reCAPTCHA.
