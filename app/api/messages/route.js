// app/api/messages/route.js  (only show POST)
import { NextResponse } from "next/server";
import { addMessage, getMessages } from "../../../lib/messages"; // keep as you had
import Pusher from "pusher";

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true,
});

export async function POST(req) {
  try {
    const body = await req.json();
    const text = body?.text || "";
    const user = body?.user ? String(body.user) : "anon";
    const file = body?.file || null; // expect { key, name, size, url }

    if (!text.trim() && !file) {
      return NextResponse.json({ error: "text or file required" }, { status: 400 });
    }

    const msg = {
      id: Date.now(),
      user,
      text,
      file, // store metadata directly
      ts: new Date().toISOString(),
    };

    // save to your messages storage
    addMessage(msg);

    // send small message over pusher (metadata only)
    await pusher.trigger("workspace-channel", "new-message", msg);

    return NextResponse.json(msg, { status: 201 });
  } catch (err) {
    console.error("POST /api/messages error:", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
