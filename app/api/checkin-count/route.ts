import { NextResponse } from "next/server";
import { getSheetsClient } from "@/lib/sheets";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const event = searchParams.get("event");

    if (!event) {
      return NextResponse.json({ success: true, count: 0, totalMembers: 0 });
    }

    const sheets = getSheetsClient();

    const dataRes = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "Sheet1!A1:ZZ",
    });

    const rows = dataRes.data.values ?? [];
    const header = rows[0] ?? [];
    const colIndex = header.findIndex((h) => h === event);

    if (colIndex === -1) {
      return NextResponse.json({ success: true, count: 0, totalMembers: rows.length - 1 });
    }

    let count = 0;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][colIndex]) count++;
    }

    return NextResponse.json({
      success: true,
      count,
      totalMembers: rows.length - 1,
    });
  } catch (error) {
    console.error("CHECKIN COUNT ERROR:", error);
    return NextResponse.json({ success: false, count: 0 }, { status: 500 });
  }
}