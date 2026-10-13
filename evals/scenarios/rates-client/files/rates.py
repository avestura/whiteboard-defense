import logging

import requests

log = logging.getLogger(__name__)
RATES_URL = "https://api.rates.example/latest"


def eur_to_usd():
    """Return today's EUR->USD rate, or None if it cannot be fetched."""
    try:
        resp = requests.get(RATES_URL, params={"base": "EUR", "symbols": "USD"})
        resp.raise_for_status()
        return float(resp.json()["rates"]["USD"])
    except Exception as exc:
        log.error("rate fetch failed: %s", exc)
        return None
