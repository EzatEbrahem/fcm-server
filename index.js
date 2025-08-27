require('dotenv').config(); // قراءة environment variables
const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const { GoogleAuth } = require('google-auth-library');

const app = express();
app.use(bodyParser.json());

// Service Account من .env
const SERVICE_ACCOUNT = {
  type: process.env.TYPE,
  project_id: process.env.PROJECT_ID,
  private_key_id: process.env.PRIVATE_KEY_ID,
  private_key: process.env.PRIVATE_KEY.replace(/\\n/g, '\n'), // مهم لتحويل \n لأسطر فعلية
  client_email: process.env.CLIENT_EMAIL,
  client_id: process.env.CLIENT_ID,
  auth_uri: process.env.AUTH_URI,
  token_uri: process.env.TOKEN_URI,
  auth_provider_x509_cert_url: process.env.AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.CLIENT_X509_CERT_URL,
  universe_domain: process.env.UNIVERSE_DOMAIN
};

const PROJECT_ID = SERVICE_ACCOUNT.project_id;

// Google Auth
const auth = new GoogleAuth({
  credentials: SERVICE_ACCOUNT,
  scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
});

// دالة للحصول على Access Token
async function getAccessToken() {
  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  return tokenResponse.token;
}

// API endpoint لإرسال الإشعار
app.post('/send-notification', async (req, res) => {
  const { fcmToken, title, body, payload } = req.body;

  if (!fcmToken || !title || !body) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const accessToken = await getAccessToken();

    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            token: fcmToken,
            notification: { title, body },
            data: payload || {},
            android: {
              priority: 'HIGH',
              notification: { channel_id: 'high_importance_channel' }
            },
          },
        }),
      }
    );

    const result = await response.json();
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
