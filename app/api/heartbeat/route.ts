import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import { getSheetsClient, columnToLetter } from "@/lib/sheets";

// POST /api/heartbeat { deviceId }
// Called every ~10s from /scan while it's open. Upserts a row in the
// Heartbeats tab so admin can see how many devices are actively scanning.
export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const session = await verifySession(cookieStore.get("isa_session")?.value);

    if (session?.role !== "admin" && session?.role !== "officer") {
      return NextResponse.json({ success: false }, { status: 403 });
    }

    const { deviceId } = await req.json();
    if (!deviceId) {
      return NextResponse.json({ success: false, message: "Missing deviceId" }, { status: 400 });
    }

    const sheets = getSheetsClient();

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "Heartbeats!A:B",
    });

    const rows = res.data.values ?? [];
    const rowIndex = rows.findIndex((r, i) => i > 0 && r[0] === deviceId);
    const now = Date.now();

    if (rowIndex === -1) {
      await sheets.spreadsheets.values.append({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: "Heartbeats!A:B",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [[deviceId, now]] },
      });
    } else {
      const cell = `Heartbeats!${columnToLetter(1)}${rowIndex + 1}`;
      await sheets.spreadsheets.values.update({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: cell,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [[now]] },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("HEARTBEAT ERROR:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}