import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import {
  getSheetsClient,
  getSettingsMap,
  columnToLetter,
  updateCheckinCountForEvent,
} from "@/lib/sheets";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const session = await verifySession(cookieStore.get("isa_session")?.value);

    if (session?.role !== "admin" && session?.role !== "officer") {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 }
      );
    }

    const { memberId, token } = await req.json();

    if (!memberId || !token) {
      return NextResponse.json(
        { success: false, message: "invalid_qr" },
        { status: 400 }
      );
    }

    const sheets = getSheetsClient();
    const settings = await getSettingsMap(sheets);

    const activeEvent = settings["active_event"] || "";
    const scanningEnabled = (settings["scanning_enabled"] || "").toUpperCase() === "TRUE";

    if (!scanningEnabled) {
      return NextResponse.json(
        { success: false, message: "scanning_disabled" },
        { status: 409 }
      );
    }

    if (!activeEvent) {
      return NextResponse.json(
        { success: false, message: "no_active_event" },
        { status: 409 }
      );
    }

    const dataRes = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "Sheet1!A1:ZZ",
    });

    const rows = dataRes.data.values ?? [];
    const header = rows[0] ?? [];
    const eventColIndex = header.findIndex((h) => h === activeEvent);

    if (eventColIndex === -1) {
      return NextResponse.json(
        { success: false, message: "event_column_missing" },
        { status: 409 }
      );
    }

    const rowIndex = rows.findIndex(
      (r, i) =>
        i > 0 &&
        r[11]?.toString().trim() === memberId.trim() &&
        r[12]?.toString().trim() === token.trim()
    );

    if (rowIndex === -1) {
      return NextResponse.json(
        { success: false, message: "invalid_pass" },
        { status: 404 }
      );
    }

    const row = rows[rowIndex];
    const memberName = `${row[1] ?? ""} ${row[2] ?? ""}`.trim();
    const existingValue = row[eventColIndex];

    if (existingValue) {
      return NextResponse.json({
        success: true,
        alreadyCheckedIn: true,
        memberName,
        checkedInAt: existingValue,
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

    // Keep the visible count in the Settings tab in sync
    await updateCheckinCountForEvent(sheets, activeEvent);

    return NextResponse.json({
      success: true,
      alreadyCheckedIn: false,
      memberName,
      checkedInAt: timestamp,
    });
  } catch (error) {
    console.error("CHECKIN ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong" },
      { status: 500 }
    );
  }
}