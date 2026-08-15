import { NextResponse } from "next/server";
import { signSession } from "@/lib/auth";
import { getSheetsClient, getSettingsMap } from "@/lib/sheets";

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    // Admin credentials stay as env vars — just you, low leak risk,
    // and no need for a phone-based reset flow for your own login.
    if (username === process.env.ADMIN_USER && password === process.env.ADMIN_PASS) {
      const token = await signSession("admin", 0);
      const res = NextResponse.json({ success: true, role: "admin" });
      res.cookies.set("isa_session", token, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 12,
      });
      return res;
    }

    // Officer credentials live in the Settings tab so they can be
    // reset from the admin panel on a phone, no redeploy needed.
    const sheets = getSheetsClient();
    const settings = await getSettingsMap(sheets);

    const officerUsername = process.env.OFFICER_USER; // username stays fixed
    const officerPassword = settings["officer_password"] || "";
    const officerVersion = Number(settings["officer_password_version"]) || 0;

    if (username === officerUsername && password === officerPassword) {
      const token = await signSession("officer", officerVersion);
      const res = NextResponse.json({ success: true, role: "officer" });
      res.cookies.set("isa_session", token, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 12,
      });
      return res;
    }

    return NextResponse.json(
      { success: false, message: "Invalid username or password" },
      { status: 401 }
    );
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong" },
      { status: 500 }
    );
  }
}