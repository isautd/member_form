import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import {
  getSheetsClient,
  getSettingsMap,
  columnToLetter,
  updateCheckinCountForEvent,
} from "@/lib/sheets";

// GET /api/manual-checkin?q=search+term
// Searches name, NetID, and member ID. Returns up to 8 matches along
// with whether each is already checked in for the active event.
export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const session = await verifySession(cookieStore.get("isa_session")?.value);

    if (session?.role !== "admin" && session?.role !== "officer") {
      return NextResponse.json({ success: false, results: [] }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim().toLowerCase();

    if (q.length < 2) {
      return NextResponse.json({ success: true, results: [] });
    }

    const sheets = getSheetsClient();
    const settings = await getSettingsMap(sheets);
    const activeEvent = settings["active_event"] || "";

    const dataRes = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "Sheet1!A1:ZZ",
    });

    const rows = dataRes.data.values ?? [];
    const header = rows[0] ?? [];
    const eventColIndex = header.findIndex((h) => h === activeEvent);

    const results = [];
    for (let i = 1; i < rows.length && results.length < 8; i++) {
      const r = rows[i];
      const fullName = `${r[1] ?? ""} ${r[2] ?? ""}`.toLowerCase();
      const netId = (r[3] ?? "").toLowerCase();
      const memberId = (r[11] ?? "").toLowerCase();

      if (fullName.includes(q) || netId.includes(q) || memberId.includes(q)) {
        results.push({
          memberId: r[11] ?? "",
          name: `${r[1] ?? ""} ${r[2] ?? ""}`.trim(),
          netId: r[3] ?? "",
          alreadyCheckedIn: eventColIndex !== -1 ? Boolean(r[eventColIndex]) : false,
        });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("MANUAL CHECKIN SEARCH ERROR:", error);
    return NextResponse.json({ success: false, results: [] }, { status: 500 });
  }
}

// POST /api/manual-checkin { memberId }
// Checks a member in for the active event without needing their QR —
// used when a phone won't scan, screen is cracked, etc.
export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const session = await verifySession(cookieStore.get("isa_session")?.value);

    if (session?.role !== "admin" && session?.role !== "officer") {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const { memberId } = await req.json();
    if (!memberId) {
      return NextResponse.json({ success: false, message: "Missing memberId" }, { status: 400 });
    }

    const sheets = getSheetsClient();
    const settings = await getSettingsMap(sheets);
    const activeEvent = settings["active_event"] || "";

    if (!activeEvent) {
      return NextResponse.json({ success: false, message: "no_active_event" }, { status: 409 });
    }

    const dataRes = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "Sheet1!A1:ZZ",
    });

    const rows = dataRes.data.values ?? [];
    const header = rows[0] ?? [];
    const eventColIndex = header.findIndex((h) => h === activeEvent);

    if (eventColIndex === -1) {
      return NextResponse.json({ success: false, message: "event_column_missing" }, { status: 409 });
    }

    const rowIndex = rows.findIndex((r, i) => i > 0 && r[11]?.toString().trim() === memberId.trim());

    if (rowIndex === -1) {
      return NextResponse.json({ success: false, message: "invalid_pass" }, { status: 404 });
    }

    const row = rows[rowIndex];
    const memberName = `${row[1] ?? ""} ${row[2] ?? ""}`.trim();

    if (row[eventColIndex]) {
      return NextResponse.json({
        success: true,
        alreadyCheckedIn: true,
        memberName,
      });
    }

    const cell = `Sheet1!${columnToLetter(eventColIndex)}${rowIndex + 1}`;
    const timestamp = new Date().toLocaleString();

    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: cell,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[timestamp]] },
    });

    await updateCheckinCountForEvent(sheets, activeEvent);

    return NextResponse.json({ success: true, alreadyCheckedIn: false, memberName });
  } catch (error) {
    console.error("MANUAL CHECKIN ERROR:", error);
    return NextResponse.json({ success: false, message: "Something went wrong" }, { status: 500 });
  }
}