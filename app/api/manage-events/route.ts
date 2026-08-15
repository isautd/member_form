import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import { getSheetsClient, columnToLetter } from "@/lib/sheets";

// POST /api/manage-events
// action: "create" { name }  -> appends a new event column header
// action: "rename" { oldName, newName } -> renames a column header,
//         check-in data underneath is untouched
export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const session = await verifySession(cookieStore.get("isa_session")?.value);

    if (session?.role !== "admin") {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const sheets = getSheetsClient();

    const headerRes = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "Sheet1!A1:ZZ1",
    });
    const header = headerRes.data.values?.[0] ?? [];

    if (body.action === "create") {
      const name = (body.name || "").trim();
      if (!name) {
        return NextResponse.json({ success: false, message: "Event name required" }, { status: 400 });
      }
      if (header.includes(name)) {
        return NextResponse.json({ success: false, message: "An event with that name already exists" }, { status: 409 });
      }

      const nextColIndex = header.length; // next empty column right after the last header
      const cell = `Sheet1!${columnToLetter(nextColIndex)}1`;

      await sheets.spreadsheets.values.update({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: cell,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [[name]] },
      });

      return NextResponse.json({ success: true });
    }

    if (body.action === "rename") {
      const oldName = (body.oldName || "").trim();
      const newName = (body.newName || "").trim();

      if (!oldName || !newName) {
        return NextResponse.json({ success: false, message: "Both names required" }, { status: 400 });
      }

      const colIndex = header.findIndex((h) => h === oldName);
      if (colIndex === -1) {
        return NextResponse.json({ success: false, message: "Event not found" }, { status: 404 });
      }
      if (header.includes(newName)) {
        return NextResponse.json({ success: false, message: "An event with that name already exists" }, { status: 409 });
      }

      const cell = `Sheet1!${columnToLetter(colIndex)}1`;

      await sheets.spreadsheets.values.update({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: cell,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [[newName]] },
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, message: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("MANAGE EVENTS ERROR:", error);
    return NextResponse.json({ success: false, message: "Something went wrong" }, { status: 500 });
  }
}