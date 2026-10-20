import os
import httpx
from dotenv import load_dotenv

load_dotenv()

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")

_client = None

def get_client() -> httpx.AsyncClient:
    global _client
    if _client is None:
        _client = httpx.AsyncClient(timeout=5.0)
    return _client

async def close_client():
    global _client
    if _client is not None:
        await _client.aclose()
        _client = None

async def send_attendance_notification(parent_telegram_id: str, student_name: str, time_str: str):
    """
    Sends a notification to the parent's Telegram account.
    """
    if not TELEGRAM_BOT_TOKEN or not parent_telegram_id:
        return # Skip gracefully if not configured

    message = f"✅ {student_name} maktabga keldi. Vaqt: {time_str}"
    
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": parent_telegram_id,
        "text": message
    }
    
    client = get_client()
    try:
        response = await client.post(url, json=payload, timeout=5.0)
        response.raise_for_status()
    except Exception as e:
        print(f"Failed to send telegram notification: {e}")

async def send_message(chat_id: str, text: str):
    """
    Sends a generic text message to a Telegram chat.
    """
    if not TELEGRAM_BOT_TOKEN or not chat_id:
        return

    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text
    }
    
    client = get_client()
    try:
        response = await client.post(url, json=payload, timeout=5.0)
        response.raise_for_status()
    except Exception as e:
        print(f"Failed to send telegram notification: {e}")

