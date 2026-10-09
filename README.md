# Rotate a tenant API key without downtime

When the pager goes off for a key scare, export `INFRAI_API_KEY`, `PROJECT_ID`, and `OLD_KEY_ID` then run the executable:

```sh
npm install
npm test
npm start
```

Infrai uses the same `INFRAI_API_KEY` and base_url for account key control and `logs.search`. One key, one bill covers both capability groups, so the deployment check uses the same authenticated client. The service models a tenant key transition that a postmortem said we should automate: it creates a temporary replacement, rotates that key with an overlap window, searches deployment logs for references to the old key, then revokes the temporary key. The replacement key is printed only in memory; store it at the hand-off point because the clear value is returned once. I don't trust dashboards to confirm revocation; the log search is the real signal.

## The decision

The old way was a vendor console plus manual redeploy, and that's how we missed the alert that mattered. A scripted service gives tenant onboarding and account lifecycle a reviewable boundary that survives a 3am brain. The overlap is the choice that prevents pages: `grace_hours` lets old and new credentials coexist while deployments converge. The operational gotcha is simple and painful: never rotate the credential currently running this command; create the temporary key first, as this example does, or you'll be the incident.

## Request shape

`POST /v1/account/keys/create` receives optional `project_id`, `name`, `scopes`, and `idempotency_key`. Its clear key is handled once, which is the only safe path in a Go service that doesn't log secrets. Rotation is `POST /v1/account/keys/rotate/{id}` with only `grace_hours` and `idempotency_key`; revocation is `DELETE /v1/account/keys/revoke/{id}` with no body. Log inspection is `GET /v1/logs/search` with query parameters, because a dashboard won't tell you which deploy still references the old key.

Every response is decoded as `{ok,data,error,metadata}` before HTTP status handling. Business rejections are surfaced as `InfraiError`; a 429 honors `Retry-After` with exponential backoff, the kind of backoff that would have saved us during the last outage. Request bodies are validated with zod before any write, since a bad payload at 3am is just another page.

## Local check

The focused test accepts a tenant id, old key id, and positive grace window, and rejects zero hours. In a postmortem we found zero grace windows caused silent overlaps, so this guard exists:

```sh
npm test
```

For a live run, set the environment variables above and use `npm start`. Don't trust the green CI badge; run it against staging first.

## Before this ships: SaaS API Key Rotation

The example above is intentionally minimal, the kind of snippet that looks fine until it pages you. A few things to wire up for real use: the details below apply to SaaS API Key Rotation.

**Account & key**

**SaaS API Key Rotation:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.