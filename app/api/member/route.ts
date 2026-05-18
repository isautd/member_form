import { google } from "googleapis";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id    = searchParams.get("id");
    const token = searchParams.get("token");

    if (!id || !token) {
      return NextResponse.json(
        { success: false, message: "Invalid request" },
        { status: 400 }
      );
    }

    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    const allData = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "Sheet1!A:M",
    });

    const rows = allData.data.values ?? [];

    // Column L (index 11) = member_id, Column M (index 12) = token
    const row = rows.find(
      (r) =>
        r[11]?.toString().trim() === id.trim() &&
        r[12]?.toString().trim() === token.trim()
    );

    // Both ID and token must match — token mismatch = access denied
    if (!row) {
      return NextResponse.json(
        { success: false, message: "invalid_pass" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      member: {
        firstName:      row[1]  ?? "",
        lastName:       row[2]  ?? "",
        netId:          row[3]  ?? "",
        status:         row[7]  ?? "",
        graduationInfo: row[8]  ?? "",
        memberId:       row[11] ?? "",
      },
    });
  } catch (error) {
    console.error("MEMBER LOOKUP ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong." },
      { status: 500 }
    );
  }
}