import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import { getSheetsClient, getSettingsMap } from "@/lib/sheets";

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

    const { newPassword } = await req.json();

    if (!newPassword || newPassword.trim().length < 4) {
      return NextResponse.json(
        { success: false, message: "Password must be at least 4 characters" },
        { status: 400 }
      );
    }

    const sheets = getSheetsClient();
    const settings = await getSettingsMap(sheets);
    const currentVersion = Number(settings["officer_password_version"]) || 0;
    const newVersion = currentVersion + 1;

    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "Settings!A4:B5",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [
          ["officer_password", newPassword.trim()],
          ["officer_password_version", newVersion],
        ],
      },
    });

    // Bumping the version means every currently-logged-in officer session
    // (including a leaked one) fails the version check on its next poll
    // and gets automatically signed out — no redeploy, no laptop needed.
    return NextResponse.json({ success: true, newVersion });
  } catch (error) {
    console.error("RESET OFFICER PASSWORD ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong" },
      { status: 500 }
    );
  }
}