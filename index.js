const express = require("express");
const OAuthClient = require("intuit-oauth");
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const oauthClient = new OAuthClient({
    clientId: "ABrVfe0EpHI7QFpbwwMWdGqgsXSKxNMzC0GPMHNGkhQ7KO9nlM",
    clientSecret: "IUVvoGRrfWiBcu7ZDfvQPeH7IWCitIiiQfd2VhmX",
    environment: "sandbox",
    redirectUri: "http://localhost:3000/integrations-connect",
});

app.post("/exchange-code", async (req, res) => {
    const { code, realmId } = req.body;
    console.log(code,realmId);
    if (!code) {
        return res.status(400).json({ success: false, error: "Missing 'code' in request body" });
    }

    // Build the redirect URL as QuickBooks expects
    const redirectUrl = `http://localhost:3000/integrations-connect?code=${encodeURIComponent(code)}${realmId ? `&realmId=${encodeURIComponent(realmId)}` : ''}`;

    try {
        await oauthClient.createToken(redirectUrl);
        const token = oauthClient.getToken();
        if (token && token.access_token) {
            return res.json({ success: true });
        } else {
            return res.json({ success: false });
        }
    } catch (e) {
        console.error(e);
        return res.json({ success: false });
    }
});

app.listen(4000, () => console.log("Server running on port 4000"));

