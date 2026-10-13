# Whiteboard brief: share-link service for invoices

- Date: 2026-10-13
- Tier: customer-facing. It exposes customer invoices over public URLs.
- Scope of this brief: the session's changes under `src/share/`

(This is an illustrative example, not output from a real run.)

## The 60-second version

Each invoice can be shared through a link containing a random token. The token is stored hashed; opening the link looks the hash up and returns a read-only PDF. Links expire after 7 days. The decision most worth defending is that the token is the only credential: anyone holding the link sees the invoice, and there is no per-viewer authorization.

## How it works

```
browser --GET /s/<token>--> handler --sha256(token)--> share_links table
                                |                        (hash, invoice_id, expires_at)
                                '--> render PDF --> response
```

`share_links` is a table keyed by token hash, so a database leak does not leak working links. Tokens are 32 random bytes, base64url.

## Decisions

| Decision | Choice | Provenance | Alternative not taken | Why it matters |
|---|---|---|---|---|
| Link credential | Bearer token in URL | [USER] "anyone with the link" | Login-gated viewing | Forwarded links work for anyone |
| Token storage | SHA-256 hash | [INFERRED] existing `api_keys` table does the same | Plaintext | DB leak does not expose links |
| Expiry | 7 days, fixed | [GUESS] no number was given | Configurable per link | Longer-lived links stay valid after a customer relationship ends |
| Revocation | None | [DEFAULT] not mentioned, not built | Delete-row endpoint | A leaked link cannot be cut off early |
| Rate limiting | None | [DEFAULT] | Per-IP limit on `/s/*` | Token guessing is infeasible at 256 bits, but PDF rendering is a cheap DoS target |

## Defaults I relied on

### No revocation (D-SCOPE-02)

- You did not specify: how to cancel a link.
- I chose: nothing; links live until expiry.
- Common alternatives: delete endpoint, "revoke all" per invoice.
- Paste into your next prompt: `Every shareable link must be revocable by its creator.`

### Unbounded PDF rendering (D-NET-01)

- You did not specify: limits on render time or size.
- I chose: library defaults, no timeout.
- Common alternatives: a render timeout, a size cap, a cache.

## Where it fails

- A link posted in a public channel is readable until expiry. No revocation.
- Many requests to one link each trigger a full render. Mitigation: absent.
- Clock skew between app servers can expire a link early or late by the skew amount.

## If someone malicious is involved

- **Link holder**: sees the invoice. Intended.
- **Guesser**: infeasible at 256 bits of entropy.
- **Database reader**: gets hashes only, cannot reconstruct links.
- **Not analyzed**: the PDF renderer's handling of hostile invoice contents (customer-supplied line item text).

## Defend it

1. **Why a bearer token instead of requiring login?**
   You wanted recipients without accounts to open invoices. The tradeoff is that forwarding the link forwards access, which is why expiry exists.
2. **Why hash the token?**
   So a read-only database leak does not hand out working links. The token is high-entropy, so a fast hash is sufficient.
3. **Where does this fail?**
   Leaked links cannot be revoked, and repeated hits each cost a render.
4. **Why 7 days?**
   That was a guess; there is no product rule behind it.

## Not verified

- The PDF renderer with hostile input.
- Behavior under concurrent requests for the same link.
- Time zone handling for `expires_at` (stored as UTC; display not checked).
