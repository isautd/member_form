import { randomBytes } from "crypto";
import { google } from "googleapis";
import { NextResponse } from "next/server";

import { rateLimit } from "@/lib/rate-limit";

// Generates a cryptographically random 8-char hex token
// e.g. "a3f8k2qp" — unguessable, stored alongside the member ID
function generateToken(): string {
  return randomBytes(4).toString("hex");
}

// Builds ISA-JD-00001 style ID
// initials = first letter of first + last name (uppercased)
// number   = global row count, zero-padded to 5 digits
function generateMemberId(firstName: string, lastName: string, rowCount: number): string {
  const initials = `${firstName[0] ?? "X"}${lastName[0] ?? "X"}`.toUpperCase();
  const num = String(rowCount).padStart(5, "0");
  return `ISA-${initials}-${num}`;
}

export async function POST(req: Request) {
  try {
    const forwardedFor = req.headers.get("x-forwarded-for");
    const ip = forwardedFor ? forwardedFor.split(",")[0] : "unknown";

    const allowed = rateLimit(ip);
    if (!allowed) {
      return NextResponse.json(
        { success: false, message: "Too many submissions. Please wait a minute." },
        { status: 429 }
      );
    }

    const body = await req.json();

    if (body.website) {
      return NextResponse.json(
        { success: false, message: "Spam detected" },
        { status: 400 }
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
      forceUpdate,
    } = body;

    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // Read all existing rows — used for duplicate check, row count, and forceUpdate
    const allData = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "Sheet1!A:M",
    });

    const rows = allData.data.values ?? [];

    // netId is column D → index 3
    const existingRowIndex = rows.findIndex(
      (row) => row[3]?.toString().toLowerCase().trim() === netId.toLowerCase().trim()
    );

    // ── FORCE UPDATE ─────────────────────────────────────────────────────
    if (forceUpdate) {
      if (existingRowIndex === -1) {
        // Not found — treat as new registration
        const memberId = generateMemberId(firstName, lastName, rows.length + 1);
        const token    = generateToken();

        await sheets.spreadsheets.values.append({
          spreadsheetId: process.env.GOOGLE_SHEET_ID,
          range: "Sheet1!A:M",
          valueInputOption: "USER_ENTERED",
          requestBody: {
            values: [[
              new Date().toLocaleString(),
              firstName, lastName, netId, personalEmail,
              countryCode, whatsappNumber, status, graduationInfo,
              Array.isArray(interests) ? interests.join(", ") : "",
              otherInterest || "",
              memberId,
              token,
            ]],
          },
        });

        return NextResponse.json({ success: true, memberId, token });
      }

      const existingRow = rows[existingRowIndex];
      // Preserve the original member ID and token — never regenerate them
      const memberId = existingRow[11] ?? "";
      const token    = existingRow[12] ?? "";
      const originalTimestamp = existingRow[0] ?? new Date().toLocaleString();

      await sheets.spreadsheets.values.update({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: `Sheet1!A${existingRowIndex + 1}:M${existingRowIndex + 1}`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [[
            originalTimestamp,
            firstName, lastName, netId, personalEmail,
            countryCode, whatsappNumber, status, graduationInfo,
            Array.isArray(interests) ? interests.join(", ") : "",
            otherInterest || "",
            memberId,
            token,
          ]],
        },
      });

      return NextResponse.json({ success: true, memberId, token });
    }

    // ── DUPLICATE CHECK ───────────────────────────────────────────────────
    if (existingRowIndex !== -1) {
      const r = rows[existingRowIndex];
      return NextResponse.json(
        {
          success: false,
          message: "already_registered",
          member: {
            firstName:      r[1]  ?? "",
            lastName:       r[2]  ?? "",
            netId:          r[3]  ?? "",
            personalEmail:  r[4]  ?? "",
            countryCode:    r[5]  ?? "+1",
            whatsappNumber: r[6]  ?? "",
            status:         r[7]  ?? "",
            graduationInfo: r[8]  ?? "",
            interests:      r[9]  ? r[9].split(", ") : [],
            otherInterest:  r[10] ?? "",
            memberId:       r[11] ?? "",
            token:          r[12] ?? "",
          },
        },
        { status: 409 }
      );
    }

    // ── NEW REGISTRATION ──────────────────────────────────────────────────
    // Row count after this insert = rows.length + 1
    const memberId = generateMemberId(firstName, lastName, rows.length + 1);
    const token    = generateToken();

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "Sheet1!A:M",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[
          new Date().toLocaleString(),
          firstName, lastName, netId, personalEmail,
          countryCode, whatsappNumber, status, graduationInfo,
          Array.isArray(interests) ? interests.join(", ") : "",
          otherInterest || "",
          memberId,
          token,
        ]],
      },
    });

    return NextResponse.json({ success: true, memberId, token });
  } catch (error) {
    console.error("SUBMIT ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}