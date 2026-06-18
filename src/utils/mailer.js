// import nodemailer from "nodemailer";
// import { google } from "googleapis";

// let oauth2Client = null;

// function getOAuthClient() {
//   if (!oauth2Client) {
//     console.log("🔧 [mailer] Creating OAuth2 client (lazy init)");
//     console.log("   GMAIL_CLIENT_ID:", process.env.GMAIL_CLIENT_ID ? "SET" : "MISSING");
//     console.log("   GMAIL_REFRESH_TOKEN:", process.env.GMAIL_REFRESH_TOKEN ? "SET" : "MISSING");

//     oauth2Client = new google.auth.OAuth2(
//       process.env.GMAIL_CLIENT_ID,
//       process.env.GMAIL_CLIENT_SECRET,
//       "https://developers.google.com/oauthplayground"
//     );
//     oauth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
//   }
//   return oauth2Client;
// }

// async function getTransporter() {
//   const client = getOAuthClient();
//   const { token: accessToken } = await client.getAccessToken();
//   console.log("ACCESS TOKEN:", accessToken ? "OK" : "NULL");
//   return nodemailer.createTransport({
//     service: "gmail",
//     auth: {
//       type: "OAuth2",
//       user: process.env.GMAIL_USER,
//       clientId: process.env.GMAIL_CLIENT_ID,
//       clientSecret: process.env.GMAIL_CLIENT_SECRET,
//       refreshToken: process.env.GMAIL_REFRESH_TOKEN,
//       accessToken,
//     },
//   });
//   await transporter.verify();
// console.log("Transport verified");
// }

// export async function sendMail({ to, subject, html }) {
//   const transporter = await getTransporter();
//   const info = await transporter.sendMail({
//     from: `"PM Project Team" <${process.env.GMAIL_USER}>`,
//     to,
//     subject,
//     html,
//   });
//   console.log(`   ↳ Gmail response for ${to}: "${info.response}" | accepted: ${JSON.stringify(info.accepted)} | rejected: ${JSON.stringify(info.rejected)}`);
//   return info;
// }

import nodemailer from "nodemailer";
import { google } from "googleapis";

let oauth2Client = null;

function getOAuthClient() {
  if (!oauth2Client) {
    console.log("🔧 [mailer] Creating OAuth2 client (lazy init)");
    console.log(
      "   GMAIL_CLIENT_ID:",
      process.env.GMAIL_CLIENT_ID ? "SET" : "MISSING"
    );
    console.log(
      "   GMAIL_REFRESH_TOKEN:",
      process.env.GMAIL_REFRESH_TOKEN ? "SET" : "MISSING"
    );
    console.log("   GMAIL_USER:", process.env.GMAIL_USER);

    oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      "https://developers.google.com/oauthplayground"
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GMAIL_REFRESH_TOKEN,
    });
  }

  return oauth2Client;
}

async function getTransporter() {
  const client = getOAuthClient();
  
  // Get a fresh access token using the refresh token
  const { token: accessToken } = await client.getAccessToken();
  
  if (!accessToken) throw new Error("Failed to obtain access token");
  console.log("✅ Access token obtained");

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      type: "OAuth2",
      user: process.env.GMAIL_USER,
      clientId: process.env.GMAIL_CLIENT_ID,
      clientSecret: process.env.GMAIL_CLIENT_SECRET,
      refreshToken: process.env.GMAIL_REFRESH_TOKEN,
      accessToken, // <-- this is the critical missing piece
    },
  });

  await transporter.verify();
  console.log("✅ SMTP VERIFIED");
  return transporter;
}

export async function sendMail({ to, subject, html }) {
  try {
    const transporter = await getTransporter();

    const info = await transporter.sendMail({
      from: `"PM Project Team" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
    });

    console.log("✅ EMAIL SENT");
    console.log("Message ID:", info.messageId);
    console.log("Response:", info.response);
    console.log("Accepted:", info.accepted);
    console.log("Rejected:", info.rejected);

    return info;
  } catch (err) {
    console.error("❌ SEND MAIL FAILED");
    console.error("To:", to);
    console.error("Message:", err.message);
    console.error("Code:", err.code);
    console.error("Response:", err.response);
    console.error("ResponseCode:", err.responseCode);

    throw err;
  }
}