const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const { GoogleAuth } = require('google-auth-library');

const app = express();
app.use(bodyParser.json());

// Load Service Account
const SERVICE_ACCOUNT = require('./serviceAccount.json');
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
            android: { priority: 'HIGH', notification: { channel_id: 'high_importance_channel' } },
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
