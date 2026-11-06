---
title: SSO & SCIM
description: Set up OIDC single sign-on with group-to-role mapping, TOTP MFA, and SCIM 2.0 provisioning from Okta or Microsoft Entra ID.
---
<!-- Source: obzly-dev/README.md, obzly-dev/ARCHITECTURE.md, obzly-dev/docs/configuration.md, obzly-dev/frontend/src/features/settings/ui/SSOSettingsComponent.tsx, obzly-dev/frontend/src/features/settings/ui/IdentityAccessComponent.tsx, obzly-dev/frontend/src/features/settings/ui/GeneralSettingsComponent.tsx, obzly-dev/backend/internal/features/users/models/user.go, obzly-dev/frontend/src/features/settings/ui/SSOGroupMappingsModal.tsx, obzly-dev/frontend/src/features/organizations/ui/SCIMComponent.tsx, obzly-dev/backend/internal/features/organizations/scim_http.go, obzly-dev/backend/internal/features/organizations/scim_tokens.go -->

Obzly has three identity features that work together:

- **Federated SSO** through any OpenID Connect provider (AWS Cognito, Google Workspace,
  Microsoft Entra ID or any standard OIDC provider), with IdP groups mapped to project roles.
- **TOTP MFA**, required for admins and, by default, optional for members.
- **SCIM 2.0** provisioning of users and groups from Okta or Microsoft Entra ID.

SSO connectors, group mappings, MFA and SCIM tokens are all configured in the UI. The only
sign-in environment variables are for the built-in GitHub and Google buttons (see
[Configuration](/docs/reference/configuration/#sign-in)).

## Set up an SSO connector

You need to be an admin. In **Obzly settings → Identity & access**, go to the **Single Sign-On**
section and choose **Add Connector**.

1. Register an application with your identity provider. Use this redirect URI, which the form
   also shows:

   ```text
   https://obzly.harborline.example/auth/callback
   ```

2. Fill in the connector:

   | Field | Notes |
   | --- | --- |
   | Name | For your reference, for example "Harborline Cognito" |
   | Provider Type | AWS Cognito, Google Workspace, Microsoft Entra ID or Generic OIDC. The type only affects labels and defaults, since all of them use standard OIDC discovery |
   | Issuer URL | Must publish `/.well-known/openid-configuration`. For Cognito: `https://cognito-idp.<region>.amazonaws.com/<pool-id>` |
   | Client ID, Client Secret | From your IdP application. The secret is stored encrypted. Leave it blank when editing to keep the existing one |
   | Scopes | Default `openid email profile` |
   | Groups claim | The ID-token claim listing the user's groups, used for [group mapping](#map-idp-groups-to-roles). Leave blank to manage access by hand |
   | Button Label | The text on the sign-in button, for example "Continue with Cognito" |
   | Require verified email | On by default. See below |
   | Provider enforces MFA | On by default. See [MFA](#multi-factor-authentication) |
   | Enabled | Shows the button on the sign-in page |

3. Save. Obzly runs OIDC discovery against the issuer right away, so a wrong issuer URL fails on
   save rather than at the first sign-in.

Once enabled, a button for the connector appears on the sign-in page. Any number of connectors
can be active, alongside the GitHub and Google buttons.

### Require verified email

An SSO sign-in that isn't already linked to an account is matched to an existing account, or
creates one, by email. With **Require verified email** on, Obzly does that only when the
provider confirms the address with `email_verified` (for Entra ID, the optional `xms_edov`
claim). Users already linked to the provider sign in regardless.

Some providers never send the claim:

- **Microsoft Entra ID** doesn't send `email_verified`, only the optional `xms_edov` claim.
- **AWS Cognito** sends `false` for users created without "Mark email as verified", and the app
  client must be allowed to read that attribute.

Turn the switch off only if you fully control who can register at the provider.

### Who gets an account

New users need an invitation unless **Allow external registrations** is on (in **Obzly
settings → General**). The exception is SSO users in a group that is mapped to access, who get an account
on their first sign-in.

## Map IdP groups to roles

With a **Groups claim** set, use the connector's **Group mappings** button to map a group name to
a project and role:

- **Project roles**: Admin, Member or Viewer on one project. Owner can't be assigned, since
  ownership only changes by explicit transfer.
- **Global Admin (entire instance)**: makes the group's members instance admins. Only the root
  admin can create or delete these mappings.

Common claim names:

| Provider | Groups claim | Group name to enter |
| --- | --- | --- |
| AWS Cognito | `cognito:groups` | The group's name |
| Microsoft Entra ID | `groups` | The group's **Object ID** (a GUID) |

How the sync works:

- Roles are applied on **every SSO sign-in**. When a user is in several mapped groups, the highest
  role wins.
- Only memberships created by the sync are managed. Members added by hand, project owners and
  memberships from another connector are never touched. Changing a synced member's role by hand
  detaches it from the sync.
- A missing groups claim means "no groups", so the user's group-granted access is removed at their
  next sign-in. A wrongly named claim therefore removes synced access (never manual access) until
  you fix it.
- Changes take effect at the user's **next** sign-in, not immediately.
- Deleting the connector keeps the access it granted, as manual memberships.

### Microsoft Entra ID

Add a groups claim under the app registration's **Token configuration**. Entra puts group Object
IDs in the `groups` claim, so enter Object IDs in the mappings.

Users in more than about 200 groups get no `groups` claim. For Entra ID connectors, Obzly then
fetches the user's group IDs from Microsoft Graph using the sign-in's access token. If that
lookup fails, the sync changes nothing for that sign-in rather than removing access.

### On a control plane

A [multi-site](/docs/deploy/multi-site/) control plane has no projects of its own, so its group
mappings point at **Sites**: a Site-wide Admin, Member or Viewer role, or a project role on one of
that Site's projects. Hand-made Site grants are never changed by the sync. Deleting the connector
removes the grants it created.

## Multi-factor authentication

Obzly supports TOTP authenticator apps such as Google Authenticator, Authy and 1Password. The
policy is in **Obzly settings → Identity & access**, which also shows how many admins and users
have MFA set up.

- **Admins must use MFA.** An admin without MFA is asked to set it up at their next sign-in, and
  an already signed-in admin is blocked from everything else until they do. It can't be skipped
  or turned off.
- **Members can choose**, unless **Require MFA for everyone** is on. Members turn MFA on or off
  for themselves on their profile.
- **Require MFA for everyone** (off by default) makes MFA mandatory for every account. Users
  without it set it up at their next sign-in. A change reaches every replica within 15 seconds.
- **Each code works once.** A code that has been accepted can't be replayed, and neither can an
  older one.
- **Sensitive actions ask again.** Deleting API keys and creating MCP tokens ask for a current
  code when you have MFA on.

### SSO and MFA

With **Provider enforces MFA** on (the default), users signing in through that connector are not
asked for an Obzly code, and admins are not asked to set one up, because the identity provider
already required a second factor. Turn it off if your provider doesn't require MFA for everyone
who can sign in through it. Password sign-ins to the same account still need Obzly MFA.

### Reset a lost authenticator

Any admin can reset another user's MFA, including another admin's, in **Users → Reset MFA**. The
user then signs in with their password and sets MFA up again.

If no other admin can do it (typically for the root admin), reset it from the command line:

```bash
docker exec -it obzly ./main --email="admin" --reset-mfa
```

Replace `admin` with the user's email, or with your `ADMIN_EMAIL` for the bootstrap admin. If the
password is lost too, add `--new-password` or run the password reset:

```bash
docker exec -it obzly ./main --email="admin"
```

You are prompted for the new password with input hidden. The MFA reset is written to the audit
log. On a control plane, use its container and login, for example:

```bash
docker exec -it obzly-control-plane ./main --email="superadmin" --reset-mfa
```

:::caution
Avoid `--new-password=...` interactively. A password on the command line is visible to other
processes on the host and stays in shell history. It's meant for scripted use.
:::

## SCIM 2.0 provisioning

SCIM provisions an **organization**: users become its members and sign in with SSO, and groups
become its teams, whose roles you set in Obzly. SCIM runs on a control plane and on standalone
installs. A Site enrolled in a control plane has its organizations, and SCIM, on the control
plane.

### Create a SCIM token

1. Open **Organizations**, select the organization and go to the **SCIM** tab. You need to be an
   organization owner or a global admin, because a token can create accounts.
2. Copy the **Base URL**:

   ```text
   https://obzly.harborline.example/scim/v2
   ```

3. Enter a token name (for example `okta`) and choose **Create token**. The token starts with
   `obzscim_` and is shown once.
4. In your identity provider's SCIM app, set the base URL and send the token as a Bearer token:

   ```text
   Authorization: Bearer obzscim_...
   ```

Revoke a token on the same tab.

### What SCIM supports

| Resource | Endpoints |
| --- | --- |
| Users | `GET`, `POST /Users`, `GET`, `PUT`, `PATCH`, `DELETE /Users/{id}` |
| Groups | `GET`, `POST /Groups`, `GET`, `PUT`, `PATCH`, `DELETE /Groups/{id}` |
| Discovery | `GET /ServiceProviderConfig`, `/ResourceTypes`, `/Schemas` |

- **Users** are the organization's members. `userName` is the sign-in email. SCIM-created
  accounts get no password and sign in with SSO.
- **Groups** are teams. A team's roles (on Sites or projects) are set in Obzly, not by SCIM.
- **Filters**: `attribute eq "value"` on `userName`, `emails.value`, `externalId` and `id` for
  users, and on `displayName`, `externalId` and `id` for groups.
- **PATCH** accepts both Okta's and Entra ID's forms. Unsupported attributes are ignored.

### Deprovisioning

What `active=false` or `DELETE` does depends on who created the account:

- **An account this organization's SCIM created** (and that isn't a global admin) is deactivated
  and its sessions are revoked.
- **Any other account** (added by an owner, or a global admin) only has its membership in the
  organization suspended, so the organization's teams grant it nothing. A suspended owner or
  admin can't manage the organization.

SCIM never joins an existing account by email. Creating a user whose email already has an account
returns `409`. To bring such a user under SCIM, an owner adds them as a member, and the identity
provider then matches them with a `userName` filter.

## Related

- [Multi-site](/docs/deploy/multi-site/) explains central identities and per-Site access.
- [Claude & Cursor over MCP](/docs/how-to/mcp/) covers personal access tokens for AI assistants.
