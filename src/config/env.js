import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ quiet: true });

function readGithubPrivateKey() {
  if (process.env.GITHUB_PRIVATE_KEY) {
    return process.env.GITHUB_PRIVATE_KEY.replace(/\\n/g, '\n');
  }

  const privateKeyPath = process.env.GITHUB_PRIVATE_KEY_PATH || './private-key.pem';

  if (!fs.existsSync(privateKeyPath)) {
    return null;
  }

  return fs.readFileSync(privateKeyPath, 'utf8');
}

export const config = {
  port: process.env.PORT || 3000,

  github: {
    appId: process.env.GITHUB_APP_ID,
    privateKey: readGithubPrivateKey(),
    webhookSecret: process.env.GITHUB_WEBHOOK_SECRET,
  },
};

if (
  !config.github.appId ||
  !config.github.privateKey ||
  !config.github.webhookSecret
) {
  console.warn('WARNING: GitHub App credentials are not fully configured');
}
