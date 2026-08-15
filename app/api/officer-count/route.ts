import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import { getSheetsClient } from "@/lib/sheets";

const ACTIVE_WINDOW_MS = 20000; // a device counts as "active" if seen in the last 20s

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = await verifySession(cookieStore.get("isa_session")?.value);

    if (session?.role !== "admin") {
      return NextResponse.json({ success: false, count: 0 }, { status: 403 });
    }

    const sheets = getSheetsClient();
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "Heartbeats!A:B",
    });

    const rows = res.data.values ?? [];
    const now = Date.now();

    let count = 0;
    for (let i = 1; i < rows.length; i++) {
      const lastSeen = Number(rows[i][1]);
      if (!Number.isNaN(lastSeen) && now - lastSeen < ACTIVE_WINDOW_MS) count++;
    }

    return NextResponse.json({ success: true, count });
  } catch (error) {
    console.error("OFFICER COUNT ERROR:", error);
    return NextResponse.json({ success: false, count: 0 }, { status: 500 });
  }
}