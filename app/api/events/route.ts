import { NextResponse } from "next/server";
import { getSheetsClient } from "@/lib/sheets";

// Columns A–M (index 0–12) are the fixed member fields:
// timestamp, firstName, lastName, netId, personalEmail, countryCode,
// whatsappNumber, status, graduationInfo, interests, otherInterest,
// memberId, token.
// Anything after that (index 13+, column N onward) is treated as an
// event column — just add a new header in the sheet and it appears here.
const FIXED_COLUMN_COUNT = 13;

export async function GET() {
  try {
    const sheets = getSheetsClient();

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "Sheet1!A1:ZZ1",
    });

    const header = res.data.values?.[0] ?? [];
    const events = header.slice(FIXED_COLUMN_COUNT).filter(Boolean);

    return NextResponse.json({ success: true, events });
  } catch (error) {
    console.error("EVENTS GET ERROR:", error);
    return NextResponse.json({ success: false, events: [] }, { status: 500 });
  }
}