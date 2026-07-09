Option 1: Deploy Vercel from GitHub Actions (Recommended)

Step 1: Disable automatic deployments in Vercel

Open your project in Vercel.
Go to Settings → Git.
Disable Auto Deploy (or disconnect the Git integration if needed).

This prevents Vercel from deploying immediately after every push.

Step 2: Install the Vercel CLI locally

npm install -g vercel
Step 3: Get your Vercel credentials

You'll need:

VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID

Get the token
Go to your Vercel account.
Settings → Tokens.
Create a new token.
Get the Project ID & Org ID

Run:

vercel link

or look inside the generated:

.vercel/project.json

Example:

{
  "projectId": "prj_xxxxxxxxx",
  "orgId": "team_xxxxxxxxx"
}



Step 4: Add GitHub Secrets

In your GitHub repository:

Settings → Secrets and variables → Actions

Create these secrets:

VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID

