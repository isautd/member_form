import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import {
  getSheetsClient,
  getSettingsMap,
  columnToLetter,
  updateCheckinCountForEvent,
} from "@/lib/sheets";

// POST /api/undo-checkin { memberId }
// Clears the active event's cell for that member — used to fix an
// accidental double-scan or a manual check-in done by mistake.
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

    const cell = `Sheet1!${columnToLetter(eventColIndex)}${rowIndex + 1}`;

    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: cell,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[""]] },
    });

    await updateCheckinCountForEvent(sheets, activeEvent);

    return NextResponse.json({ success: true, memberName });
  } catch (error) {
    console.error("UNDO CHECKIN ERROR:", error);
    return NextResponse.json({ success: false, message: "Something went wrong" }, { status: 500 });
  }
}