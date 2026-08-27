# PackSure AI — SIH26034 Prototype

Browser-based packaged commodity compliance scanner prepared for Vercel.

## Deploy to Vercel

1. Create a GitHub repository and upload this folder, or use the Vercel CLI.
2. In Vercel, choose **Add New → Project** and import the repository.
3. Keep the detected framework as **Next.js** and click **Deploy**.

No environment variables are required. OCR runs in the visitor's browser; uploaded package images are not sent to an application server.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.
