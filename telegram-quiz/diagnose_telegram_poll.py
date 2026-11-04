#!/usr/bin/env python3
"""Isolated MTProto poll diagnostic. Temporary scheduled tests are deleted."""
import asyncio, os, random, sys
from datetime import datetime, timedelta, timezone
from telethon import TelegramClient, functions, types, __version__
from telethon.sessions import StringSession
from telethon.tl.alltlobjects import LAYER

MARKER = "NETPSY_MTProto_DIAGNOSTIC_20261104"

def make_poll(suffix, quiz):
    poll = types.Poll(
        id=random.getrandbits(63),
        hash=random.getrandbits(63),
        question=types.TextWithEntities(
            text=f"{MARKER}_{suffix}: temporary test — please ignore",
            entities=[]),
        answers=[
            types.PollAnswer(
                text=types.TextWithEntities(text=label, entities=[]),
                option=os.urandom(8))
            for label in ("Diagnostic option A", "Diagnostic option B")
        ],
        quiz=quiz)
    return types.InputMediaPoll(
        poll=poll,
        correct_answers=[0] if quiz else None,
        solution=None,
        solution_entities=None)

async def cleanup(client, peer):
    history = await client(functions.messages.GetScheduledHistoryRequest(
        peer=peer, hash=0))
    ids = []
    for msg in getattr(history, "messages", []):
        poll = getattr(getattr(msg, "media", None), "poll", None)
        question = getattr(getattr(poll, "question", None), "text", "")
        if MARKER in question:
            ids.append(msg.id)
    if ids:
        await client(functions.messages.DeleteScheduledMessagesRequest(
            peer=peer, id=ids))
    return ids

async def main():
    print(f"Telethon={__version__}; MTProto layer={LAYER}")
    print(f"InputMediaPoll constructor=0x{types.InputMediaPoll.CONSTRUCTOR_ID:08x}")
    client = TelegramClient(
        StringSession(os.environ["TELEGRAM_SESSION"]),
        int(os.environ["TELEGRAM_API_ID"]),
        os.environ["TELEGRAM_API_HASH"])
    await client.connect()
    try:
        if not await client.is_user_authorized():
            raise RuntimeError("Telegram session is not authorised.")
        peer = await client.get_input_entity(os.environ["TELEGRAM_CHAT_ID"])
        stale = await cleanup(client, peer)
        if stale:
            print(f"Removed {len(stale)} stale diagnostic message(s).")
        schedule_at = datetime.now(timezone.utc) + timedelta(minutes=3)
        for suffix, quiz in (("REGULAR", False), ("QUIZ", True)):
            try:
                media = make_poll(suffix, quiz)
                await client(functions.messages.SendMediaRequest(
                    peer=peer, media=media, message="",
                    random_id=random.getrandbits(63),
                    schedule_date=int(schedule_at.timestamp())))
                print(f"ACCEPTED: {suffix} poll request.")
                removed = await cleanup(client, peer)
                print(f"CLEANUP: removed {len(removed)} diagnostic message(s).")
            except Exception as exc:
                print(f"REJECTED: {suffix} poll: {type(exc).__name__}: {exc}")
                try:
                    removed = await cleanup(client, peer)
                    if removed:
                        print(f"CLEANUP: removed {len(removed)} diagnostic message(s).")
                except Exception as cleanup_exc:
                    print(f"CLEANUP WARNING: {type(cleanup_exc).__name__}: {cleanup_exc}")
                if suffix == "REGULAR":
                    print("Quiz test skipped because the regular poll failed.")
                raise
    finally:
        await client.disconnect()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as exc:
        print(f"DIAGNOSTIC FAILED: {exc}", file=sys.stderr)
        raise
