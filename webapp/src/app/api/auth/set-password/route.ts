import { NextResponse } from "next/server";
function retired() { return NextResponse.json({error:"Public accounts are no longer available. Browse Offerly and notifications without signing in."},{status:410}); }
export { retired as GET, retired as POST, retired as PATCH, retired as DELETE };
