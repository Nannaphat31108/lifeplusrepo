"""LINE notification for work handoffs.

Uses the LINE Messaging API (a LINE Official Account's Channel Access
Token), not LINE Notify -- LINE discontinued LINE Notify on 2025-03-31, so
a token for it can no longer be issued. See README for how to create an
Official Account and get a channel access token.

Sent when a work handoff is created -- "someone in another department
needs to know about this now", the same role a Slack/email ping plays
elsewhere. A single system-wide credential (not one per department/user)
is a pragmatic v1: everyone who cares about handoffs adds the same
Official Account as a friend, and the message broadcasts to all of them
(LINE_TARGET_ID unset) or goes to one specific group/room
(LINE_TARGET_ID set, e.g. captured from a webhook event later).

No token configured -> silently skipped, not an error. A send failure
(network error, revoked token, LINE API outage) is logged and swallowed,
never raised -- a notification going out must never be a precondition for
the action that triggered it (creating a work handoff) succeeding.
"""
import logging

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

LINE_PUSH_URL = "https://api.line.me/v2/bot/message/push"
LINE_BROADCAST_URL = "https://api.line.me/v2/bot/message/broadcast"


def send_line_notify(message: str) -> None:
    token = (settings.line_channel_access_token or "").strip()
    if not token:
        return
    target = (settings.line_target_id or "").strip()
    url = LINE_PUSH_URL if target else LINE_BROADCAST_URL
    body = {"messages": [{"type": "text", "text": message[:5000]}]}
    if target:
        body["to"] = target
    try:
        httpx.post(
            url,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            json=body,
            timeout=5.0,
        )
    except Exception as e:
        logger.warning("LINE Messaging API send failed: %s: %s", type(e).__name__, e)
