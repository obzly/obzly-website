---
title: First project & API key
description: Create a project, get its ID and API key, and give your team access.
---

<!-- Source: obzly-dev/README.md, obzly-dev/backend/internal/features/users/controllers/user_controller.go, obzly-dev/frontend/src/features/users/ui/UsersComponent.tsx, obzly-dev/frontend/src/features/settings/ui/IdentityAccessComponent.tsx -->

Install Obzly once and use it for all your applications. Everything you send lands in a
**project**, and every project has its own project ID and API keys.

## Create a project

1. Sign in at `http://localhost:4005` (or wherever you installed Obzly).
2. Click **New Project** and copy the generated **project ID**.
3. Create or copy an **API key** for the project. Clients send it in the `X-API-Key` header, and
   Obzly uses it to know which project the data belongs to.
4. [Send data](/docs/getting-started/send-first-logs/): use the **Data Sources** page for a
   generated OTel Collector config, or point any OTLP exporter or SDK straight at Obzly.
5. Watch logs, traces and metrics arrive. Search by text, filter by fields and query specific time
   ranges.

## Organize with projects

Each project is an isolated space. Organize them by microservice, environment, or whatever fits
your team. Besides its own IDs and keys, each project has its own:

- **retention** per signal, and trace and log **sampling**;
- **promoted fields**: up to 12 fields stored as typed columns for fast filters and number ranges
  (see [Promoted fields](/docs/how-to/promoted-fields/));
- **access controls** for the plain HTTP endpoint: whether an API key is required, which domains
  and IPs may send, and rate limits and quotas.

## API keys and usage tracking

Every key shows when it was last used. A dedicated view lists keys that have gone unused for 7 or
more days, so you can clean them up in bulk. Deleting keys, one or many, requires an MFA
confirmation for any user who has MFA enabled.

The **Data Sources** catalog creates a fresh, dedicated API key for each generated Collector
config, so each source can be revoked on its own. See [Data sources](/docs/reference/data-sources/).

## Teams and organizations

- **Members**: add people to a project with a role-based permission.
- **Teams**: group people; a team's role applies to every member.
- **Organizations** hold teams and, with a [control plane](/docs/deploy/multi-site/), span Sites.
- **Audit log**: records who changed what, and when. Admins find it in **Obzly settings → Audit
  logs** and can export it as CSV.

When you invite a new user, they get an email with a sign-up link if
[email is set up](/docs/how-to/alerts/#1-set-up-email) in Obzly settings. The link works once.
Without email, you are shown the invite link to pass on yourself.

The **Users** page shows each user's **Last login** and **Last active** time, or **Never**, so you can
spot accounts nobody uses.

To bring users in from your identity provider instead of inviting them one by one, see
[SSO and SCIM](/docs/how-to/sso-scim/).

## Multi-factor authentication

TOTP MFA (Google Authenticator, Authy, 1Password and similar) is **required for admin accounts** and,
by default, **optional for members**. An admin without MFA is asked to set it up at their next
sign-in and can't skip it. Members turn it on or off from their profile, unless an admin turns on
**Require MFA for everyone** in **Obzly settings → Identity & access** (see
[SSO & SCIM](/docs/how-to/sso-scim/#multi-factor-authentication)).

If someone loses their authenticator, any admin can reset their MFA from the **Users** page
(**Reset MFA**), including another admin's. If no admin can, use the
[command-line reset](/docs/getting-started/quick-install/#reset-mfa-for-a-lost-authenticator).

SSO users signing in through a connector with **Provider enforces MFA** turned on (the default)
skip Obzly's own authenticator step, because the identity provider already required a second
factor.
