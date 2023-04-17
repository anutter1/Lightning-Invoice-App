# Lightning-Invoice-App

Simple app made using Express and Node JS.
The app connnects to your LND lightning node and uses your nodes built in api. This app was made to connect to a Tor Lighting node.
To configure you will need your admin.macaroon from your LND node and your Tor onion address. The app should then take an input (sats amount) and generate an invoice and a scannable QR code. When the invoice is paid the app will update to show successful payment.
