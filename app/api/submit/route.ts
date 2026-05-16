import { google } from "googleapis";
import { NextResponse } from "next/server";

import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    // IP ADDRESS
    const forwardedFor =
      req.headers.get("x-forwarded-for");

    const ip = forwardedFor
      ? forwardedFor.split(",")[0]
      : "unknown";

    // RATE LIMIT
    const allowed = rateLimit(ip);

    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Too many submissions. Please wait a minute.",
        },
        {
          status: 429,
        }
      );
    }

    const body = await req.json();

    // HONEYPOT
    if (body.website) {
      return NextResponse.json(
        {
          success: false,
          message: "Spam detected",
        },
        {
          status: 400,
        }
      );
    }

    const {
      firstName,
      lastName,

      netId,
      personalEmail,

      countryCode,
      whatsappNumber,

      status,
      graduationInfo,

      interests,
      otherInterest,
    } = body;

    // GOOGLE AUTH
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,

      key: process.env.GOOGLE_PRIVATE_KEY?.replace(
        /\\n/g,
        "\n"
      ),

      scopes: [
        "https://www.googleapis.com/auth/spreadsheets",
      ],
    });

    const sheets = google.sheets({
      version: "v4",
      auth,
    });

    // APPEND
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,

      range: "Sheet1!A:K",

      valueInputOption: "USER_ENTERED",

      requestBody: {
        values: [
          [
            new Date().toLocaleString(),

            firstName,
            lastName,

            netId,
            personalEmail,

            countryCode,
            whatsappNumber,

            status,
            graduationInfo,

            Array.isArray(interests)
              ? interests.join(", ")
              : "",

            otherInterest || "",
          ],
        ],
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("SUBMIT ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          "Something went wrong. Please try again.",
      },
      {
        status: 500,
      }
    );
  }
}