import { google } from "googleapis";

export function getSheetsClient() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return google.sheets({ version: "v4", auth });
}

export function columnToLetter(index: number): string {
  let n = index + 1;
  let s = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

type SheetsClient = ReturnType<typeof getSheetsClient>;

// Reads the whole Settings tab (5 rows) into a plain key/value map.
export async function getSettingsMap(sheets: SheetsClient): Promise<Record<string, string>> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: "Settings!A1:B5",
  });

  const rows = res.data.values ?? [];
  const map: Record<string, string> = {};
  rows.forEach((r) => {
    if (r[0]) map[r[0]] = r[1] ?? "";
  });
  return map;
}

// Recounts how many members have a filled cell in the given event column
// and writes that number into Settings!B3 — so the count is visible
// directly in the sheet without opening the admin dashboard.
export async function updateCheckinCountForEvent(
  sheets: SheetsClient,
  eventName: string
): Promise<number> {
  if (!eventName) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "Settings!B3",
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[0]] },
    });
    return 0;
  }

  const dataRes = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: "Sheet1!A1:ZZ",
  });

  const rows = dataRes.data.values ?? [];
  const header = rows[0] ?? [];
  const colIndex = header.findIndex((h) => h === eventName);

  let count = 0;
  if (colIndex !== -1) {
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][colIndex]) count++;
    }
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: "Settings!B3",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[count]] },
  });

  return count;
}