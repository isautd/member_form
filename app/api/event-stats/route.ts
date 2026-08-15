import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import { getSheetsClient } from "@/lib/sheets";

const FIXED_COLUMN_COUNT = 13; // columns A–M are fixed member fields

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = await verifySession(cookieStore.get("isa_session")?.value);

    if (session?.role !== "admin") {
      return NextResponse.json({ success: false, stats: [] }, { status: 403 });
    }

    const sheets = getSheetsClient();

    const dataRes = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "Sheet1!A1:ZZ",
    });

    const rows = dataRes.data.values ?? [];
    const header = rows[0] ?? [];
    const eventNames = header.slice(FIXED_COLUMN_COUNT).filter(Boolean);

    const stats = eventNames.map((name) => {
      const colIndex = header.findIndex((h) => h === name);
      let count = 0;
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][colIndex]) count++;
      }
      return { event: name, count };
    });

    stats.sort((a, b) => b.count - a.count);

    return NextResponse.json({ success: true, stats });
  } catch (error) {
    console.error("EVENT STATS ERROR:", error);
    return NextResponse.json({ success: false, stats: [] }, { status: 500 });
  }
}