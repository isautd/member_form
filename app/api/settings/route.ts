import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import { getSheetsClient, getSettingsMap, updateCheckinCountForEvent } from "@/lib/sheets";

export async function GET() {
  try {
    const sheets = getSheetsClient();
    const map = await getSettingsMap(sheets);

    return NextResponse.json({
      success: true,
      activeEvent: map["active_event"] || "",
      scanningEnabled: (map["scanning_enabled"] || "").toUpperCase() === "TRUE",
      checkinCount: Number(map["checkin_count"]) || 0,
      officerPasswordVersion: Number(map["officer_password_version"]) || 0,
    });
  } catch (error) {
    console.error("SETTINGS GET ERROR:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const session = await verifySession(cookieStore.get("isa_session")?.value);

    if (session?.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 }
      );
    }

    const { activeEvent, scanningEnabled } = await req.json();
    const sheets = getSheetsClient();

    // Preserve the password fields — this route only ever touches
    // rows 1 and 2, never rows 4/5.
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "Settings!A1:B2",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [
          ["active_event", activeEvent ?? ""],
          ["scanning_enabled", scanningEnabled ? "TRUE" : "FALSE"],
        ],
      },
    });

    // Recompute the count for whichever event is now active
    await updateCheckinCountForEvent(sheets, activeEvent ?? "");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("SETTINGS POST ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong" },
      { status: 500 }
    );
  }
}