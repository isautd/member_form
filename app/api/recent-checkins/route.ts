import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import { getSheetsClient, getSettingsMap } from "@/lib/sheets";

// Returns the 10 most recent check-ins for the active event, across
// every officer/admin device — not just the device that's asking.
export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = await verifySession(cookieStore.get("isa_session")?.value);

    if (session?.role !== "admin" && session?.role !== "officer") {
      return NextResponse.json({ success: false, recent: [] }, { status: 403 });
    }

    const sheets = getSheetsClient();
    const settings = await getSettingsMap(sheets);
    const activeEvent = settings["active_event"] || "";

    if (!activeEvent) {
      return NextResponse.json({ success: true, recent: [] });
    }

    const dataRes = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "Sheet1!A1:ZZ",
    });

    const rows = dataRes.data.values ?? [];
    const header = rows[0] ?? [];
    const colIndex = header.findIndex((h) => h === activeEvent);

    if (colIndex === -1) {
      return NextResponse.json({ success: true, recent: [] });
    }

    const entries: { name: string; timestamp: string; sortKey: number }[] = [];

    for (let i = 1; i < rows.length; i++) {
      const cellValue = rows[i][colIndex];
      if (!cellValue) continue;

      const parsed = new Date(cellValue).getTime();
      entries.push({
        name: `${rows[i][1] ?? ""} ${rows[i][2] ?? ""}`.trim(),
        timestamp: cellValue,
        sortKey: Number.isNaN(parsed) ? 0 : parsed,
      });
    }

    entries.sort((a, b) => b.sortKey - a.sortKey);
    const recent = entries.slice(0, 10).map(({ name, timestamp }) => ({ name, timestamp }));

    return NextResponse.json({ success: true, recent });
  } catch (error) {
    console.error("RECENT CHECKINS ERROR:", error);
    return NextResponse.json({ success: false, recent: [] }, { status: 500 });
  }
}