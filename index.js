const express = require("express");
const OAuthClient = require("intuit-oauth");
const app = express();
app.use(express.json());

const oauthClient = new OAuthClient({
    clientId: "ABrVfe0EpHI7QFpbwwMWdGqgsXSKxNMzC0GPMHNGkhQ7KO9nlM",
    clientSecret: "IUVvoGRrfWiBcu7ZDfvQPeH7IWCitIiiQfd2VhmX",
    environment: "sandbox",
    redirectUri: "https://140f-2405-201-a807-60fe-d5fc-9f92-d754-fb4d.ngrok-free.app/connected",
});

app.get("/connect", (req, res) => {
    const authUrl = oauthClient.authorizeUri({
        scope: [OAuthClient.scopes.Accounting, OAuthClient.scopes.OpenId],
        state: "Init"
    });

    res.redirect(authUrl);
});

app.get("/connected", async (req, res) => {
    const parseRedirect = req.url;

    try {
        const authResponse = await oauthClient.createToken(parseRedirect);
        console.log('Token:', oauthClient.getToken());
        const token = oauthClient.getToken();

        res.send(`
            <html>
                <body>
                    <script>
if (window.opener) {
    window.opener.postMessage(
        { type: "quickbooks-auth", params: ${JSON.stringify(token)} },
window.opener.location.origin
    );
window.close();
} else {
    console.error("Opener window not found");
}
                    </script>
                    <p>Authentication successful. You can close this window.</p>
                </body>
            </html>
        `)
        // res.redirect("/customers");
    }
    catch (e) {
        console.log(e);
        res.status(404).json(e)
        res.status(200).text("Something went wrong");
    }
})

app.get("/customers", async (req, res) => {
    try {
        const realmId = oauthClient.getToken().realmId;

        const response = await oauthClient.makeApiCall({
            url: `https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/query?query=select * from Customer&minorversion=40`,
            method: "GET",
        });

        const customer = response.json.QueryResponse.Customer[1];

        console.log(customer);

        try {
            const postResponse = await fetch('https://chiizu-dev-receivable-service.azurewebsites.net/api/customer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    "id": customer.Id,
                    "name": customer.DisplayName,
                    // "website": null,
                    // "remote_id": null,
                    // "account_number": null,
                    "status": customer.Active ? "active" : "inactive",
                    "contact": {
                        "first_name": customer.GivenName,
                        "last_name": customer.FamilyName,
                        "email": customer.PrimaryEmailAddr?.Address || null,
                        "phone": {
                            "number": customer.PrimaryPhone?.FreeFormNumber || null
                        }
                    },
                    // "billing_address": {
                    //     "line1": customer.BillAddr?.Line1 || null,
                    //     "line2": null,
                    //     "city": customer.BillAddr?.City || null,
                    //     "state": customer.BillAddr?.CountrySubDivisionCode || null,
                    //     "zip_code": customer.BillAddr?.PostalCode || null,
                    // "country": {
                    //     "name": null,
                    //     "alpha2_code": null,
                    //     "alpha3_code": null,
                    //     "dial_code": null
                    // },
                    // "address_type": "Billing"
                    // }
                })

            })
            if (!postResponse.ok) {
                console.log(postResponse)
                // throw new Error('Failed to post customer data');
            }

            const postData = await postResponse.json();
            console.log('Customer data posted successfully:', postData);
        } catch (error) {
            console.error('Error posting customer data:', error);
        }

        res.status(200).json(customer);

    } catch (e) {
        res.status(400).json(e);
    }
});

app.listen(4000, () => console.log("Server running on port 4000"));

