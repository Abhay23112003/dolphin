import Pusher from "pusher";
import { NextResponse } from "next/server";
import { addMessage, getMessages } from "../../../lib/messages";

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
    const text = body?.text?.toString?.().trim();
    const user = body?.user ? String(body.user) : "anon";

    if (!text) {
      return NextResponse.json({ error: "text required" }, { status: 400 });
    }

    const msg = {
      id: Date.now(),
      user,
      text,
      ts: new Date().toISOString(),
    };

    addMessage(msg);

    await pusher.trigger("workspace-channel", "new-message", msg);

    return NextResponse.json(msg, { status: 201 });
  } catch (err) {
    console.error("POST /api/messages error:", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const messages = getMessages();
    return NextResponse.json(messages);
  } catch (err) {
    console.error("GET /api/messages error:", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
