# Firebase Setup

## 1. Install Firebase CLI
```bash
npm install -g firebase-tools
```

## 2. Login
```bash
firebase login
```

## 3. Initialise project in this directory
```bash
firebase init
```
Select: **Firestore**, **Authentication**, **Hosting**

When prompted:
- Firestore rules file: `firestore.rules` (already created)
- Public directory: `dist`
- Configure as SPA: **Yes**
pastpapers-a8b7v6
## 4. Enable Email/Password Auth
In the Firebase Console:
1. Go to **Authentication** → **Sign-in method**
2. Enable **Email/Password**

## 5. Fill in .env
Copy `.env.example` to `.env` and fill in your project values from the Firebase Console under **Project Settings**.

## 6. Deploy (after building)
```bash
npm run build
firebase deploy
```
