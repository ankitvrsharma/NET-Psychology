#!/usr/bin/env python3
"""Run locally once to create a Telegram user session for GitHub Actions."""
import getpass
from telethon.sync import TelegramClient
from telethon.sessions import StringSession
api_id=int(input("Telegram API ID: ").strip())
api_hash=getpass.getpass("Telegram API Hash (hidden): ").strip()
phone=input("Telegram phone number with country code: ").strip()
with TelegramClient(StringSession(),api_id,api_hash) as client:
    client.start(phone=phone)
    print("\nLOGIN SUCCESSFUL. Copy this session string into GitHub secret TELEGRAM_SESSION.")
    print("Never share it in chat or commit it to the repository. Anyone holding it can access your Telegram account.")
    print("\n"+client.session.save())
