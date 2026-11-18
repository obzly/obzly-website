---
title: Cloud cost and security posture
description: Turn on cost and security posture for a cloud connection, set up the FOCUS export, and use the Cost and Posture tabs, budgets, anomalies and recommendations.
---

<!-- Source: obzly/docs/CLOUD_COST_POSTURE.md, obzly/docs/releases/v1.1.0.md, obzly/docs/releases/v1.2.0.md, obzly/docs/runbooks/upgrade.md, obzly/docs/configuration.md, obzly/deploy/cloud/aws/obzly-readonly-role.yaml, obzly/deploy/cloud/azure/obzly-reader.bicep, obzly/deploy/cloud/azure/obzly-cost-export.bicep, obzly/frontend/src/features/cost, obzly/frontend/src/features/posture, obzly/frontend/src/features/infrastructure/ui/CloudCostStep.tsx, obzly/frontend/src/features/infrastructure/ui/CloudPostureStep.tsx, obzly/frontend/src/features/infrastructure/lib/costChoice.ts, obzly/frontend/src/features/infrastructure/lib/cloudTemplates.ts, obzly/backend/internal/posture/baseline/checks, obzly/backend/internal/features/cloudcost, obzly/backend/internal/features/posture/actions.go -->

The same [cloud connections](/docs/how-to/cloud-connections/) that feed the infrastructure
inventory can also read **cost** and **security posture** for an AWS account or Organization, or an
Azure subscription or management group:

- **Cost:** what each account, service, region, resource and tracked tag spends, by day, month,
  quarter or year, with forecasts, budgets and anomalies.
- **Security posture:** misconfiguration findings against AWS Foundational Security Best Practices
  (FSBP), CIS and the Microsoft cloud security benchmark (MCSB), with history and coverage.
- **Recommendations:** savings from rightsizing, idle resources and commitments, and a ranked plan
  to raise your posture scores.

The **Cost** and **Posture** tabs are on the [control plane](/docs/deploy/multi-site/) and read
every Site you can reach.

:::note[Obzly only reads]
Every permission the templates grant is read-only. Obzly never changes, deletes or buys anything in
your clouds: fixes, rightsizing and commitment purchases are made by your team in the provider's
console or your own tooling. Raw billing line items stay in your bucket or storage account; the
probe sends only daily totals. The baseline posture checks run in the probe, and only findings and
minimal evidence leave it.
:::

## Before you start

- A [cloud connection](/docs/how-to/cloud-connections/), or the permissions to create one: an
  admin on the control plane.
- Probes on v1.1.0 or later. Older probes ignore the cost and posture uses, so those sections stay
  empty.
- If a Site's ingress only admits the control plane apart from the ingest paths, let the probes
  reach `/v1/cloud/cost`, `/v1/cloud/posture` and `/v1/cloud/advice` on the destination Site, next
  to `/v1/metrics`. Probes post there directly, never through the control plane.

## Turn on cost and posture

1. Open **Obzly settings → Cloud connections** and start a **New cloud connection**, or edit an
   existing one.
2. On **Scan types**, tick **Cost and billing**, **Security posture**, or both. The step lists the
   read-only permissions each one adds for that provider. **Infrastructure inventory** is not
   required: a connection with only cost or posture runs no discovery.
3. The wizard adds a **Cost** step and a **Posture** step after **Scope** for what you ticked. See
   [Cost](#cost) and [Security posture](#security-posture) below.
4. On **Run template**, run the generated CloudFormation, Bicep or CLI script. For an existing
   connection this is an update to the same stack or deployment, never a second connection.
5. On **Settings and test**, **Test access** runs one dry check per use and reports **Works**,
   **Needs permission** (naming the missing action) or **Failed** for each of **Inventory**,
   **Cost** and **Posture**. Then save.

The connections list shows each connection's cost source (with "all members" for a billing scope)
and posture source, when each last refreshed, and **Cost every** / **Posture every** under
**Schedule**. A connection with no inventory shows **Waiting for the first refresh** until its
first cost or posture data arrives, and **Late** after three refresh intervals without a report.

## Cost

### Whose bills

The **Cost** step first asks **Whose bills**:

| Choice | When |
| --- | --- |
| **This account only** (or **This subscription only**) | The connection reads its own cost |
| **Every account this payer (management account) pays for** (Azure: **The whole billing scope (management group or billing account)**) | A management account or billing scope: cost is read once here for every member. Run the template in the management account (AWS), or assign the roles at the management group or billing scope (Azure) |
| **Through another connection** | A payer connection already reads this one's cost. Pick it under **Connection that reads this one's cost**. This connection needs no cost permissions of its own |

A member connection shows **Via** and the payer connection's name in the list, and its cost is
never read or counted twice. For example, `contoso-payer` reads every account of the Contoso
Organization, and `contoso-prod` (account `111122223333`) reads its cost through `contoso-payer`.

### Data source

Each connection that reads cost picks one **Data source**. The wizard shows each as a card with
what it costs you in your cloud bill:

| Source | How it works | What it costs |
| --- | --- | --- |
| **Automatic (recommended)** (default) | The billing API gives data within minutes; once the FOCUS export lands, it takes over day by day. If the export stops, the API fills in | Export storage, usually cents a month. On AWS, Cost Explorer calls only until the first export lands |
| **FOCUS export only** | Reads the FOCUS export only. Single resources, effective (amortized) and billed cost. First data can take up to 24 hours; history starts when the export does unless you backfill it | Export storage only, usually cents a month; the export itself is free |
| **Billing API only** | AWS Cost Explorer or the Azure Cost Management query API. Nothing to set up; includes the provider's forecast. By account, service and region only: no single resources | AWS: $0.01 per Cost Explorer call. Azure: free, but throttled per tenant |

For any one connection and day, cost comes from one source, never both, and every figure shows its
source. You can change the source later without losing history.

**Refresh every** sets how often cost is read: 6, 8, 12 (default) or 24 hours. Billing data
changes a few times a day, so refreshing more often mostly adds API calls.

For the AWS billing API the wizard shows a live estimate from **Accounts in scope**: each refresh
makes one call per account plus one forecast. One account refreshed every 12 hours is about 120
calls, or $1.20, a month. The first 90 days take about two more calls per account, once.

Whatever the source, recommendations and the commitment planner read AWS Cost Explorer once a
week: about 75 calls, roughly $3.20 a month, per AWS connection that reads cost. On Azure they are
free.

### Set up the FOCUS export

With **Automatic** or **FOCUS export only**, the wizard asks **Where the FOCUS export lands**. With
**Automatic** you can leave it empty, start with the API and add the export later.

**AWS:** in the payer account, open **Billing and Cost Management → Data Exports → Create**, choose
the FOCUS 1.2 table with AWS columns, delivered daily (overwrite), to an S3 bucket and prefix. Enter
the **Bucket** (for example `contoso-billing`), its **Region** and the **Prefix** (for example
`focus`) in the wizard.

**Azure:** open **Cost Management → Exports → Add**, choose FOCUS cost and usage, daily, to a
storage account, container and directory. Enter the **Storage account**, its resource group (used
only by the template), the **Container** (for example `cost`) and the **Directory** (for example
`focus`).

The generated template then grants read access to that prefix (AWS: `s3:GetObject` under it and
`s3:ListBucket` limited to it) or to that storage account (Azure: **Storage Blob Data Reader**)
only, never to other data. On the first refresh the probe reads up to 13 billing periods of the
export; after that, the current and previous month, and older months only when the provider
rewrites their files. Parquet and CSV (gzipped or not) both work.

To deploy the AWS role yourself with cost and posture, add the uses and the export to the
parameters (see [Deploying the templates](/docs/how-to/cloud-connections/#deploying-the-templates)
for the rest):

```bash
aws cloudformation deploy --stack-name obzly-readonly \
  --template-file obzly-readonly-role.yaml --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides TrustMode=AssumeRole \
    TrustedPrincipalArn=arn:aws:iam::111122223333:role/obzly-probe \
    ExternalId=hl-7f3c9a2e5b8d4c10 \
    Inventory=true Cost=true Posture=true \
    ExportBucket=contoso-billing ExportPrefix=focus
```

For Azure, keep [`obzly-cost-export.bicep`](https://github.com/obzly/obzly/blob/main/deploy/cloud/azure/obzly-cost-export.bicep)
next to `obzly-reader.bicep` (the reader references it even without an export) and add:

```bash
az deployment sub create --name obzly-readonly --location westeurope \
  --template-file obzly-reader.bicep \
  --parameters accessMode=federated resourceGroupName=obzly \
    issuer=https://obzly.harborline.example subject=probe:edge-north \
    inventory=true cost=true posture=true \
    costExportStorageAccount=contosobilling costExportResourceGroup=billing
```

Existing Azure reservations and savings plans also need **Reservations Reader** at
`/providers/Microsoft.Capacity`. A template can't assign it; a Global Administrator (with access
elevated) or a reservation owner runs the command the script prints:

```bash
az role assignment create --assignee-object-id <the identity's principal ID> \
  --assignee-principal-type ServicePrincipal \
  --role "Reservations Reader" --scope /providers/Microsoft.Capacity
```

Until then, that part of **Recommendations** says it needs permission.

### Tracked cost tags

Cost rows keep only the tag keys you track, never all of them. Admins set up to 10 under **Tracked
cost tags** in **Obzly settings → Cloud connections** (for example `team`, `env`, `cost-center`);
the next cost refresh uses them. In AWS, exports only carry tags you activated as cost allocation
tags. Tracked tags appear in the Explorer as **Tag: team** and so on, to group and filter by.

## The Cost tab

**Cost** has five views. Amounts are never added across currencies or converted: each currency is
shown on its own. A period no connection has data for shows **n/a**, never 0. Days the provider
hasn't finalised (the last two) are marked estimated.

### Summary

The first view: the cloud at a glance, cost and posture side by side.

- **Effective** or **Billed** cost, remembered in your browser.
- **Spend:** **Month to date** (against the same days of last month), the month's **Forecast**
  against your whole-account budget, **Open savings** from recommendations, and **Realized
  savings**.
- **Daily spend**, stacked by cloud, with the highest day, anomalies and commitment coverage.
- **Top services** this month, with the change against the same days of last month.
- **Posture by standard**, **Open findings** by severity, and **Next best actions**: the highest
  impact cost recommendations and posture fixes. Each links to the view behind it.

### Overview

- **Month to date**, **Month-end forecast**, **Last month** and **Open anomalies**, per currency
  (pick the currency when there is more than one).
- **Daily cost** over 30 or 90 days, with estimated days and anomalies marked.
- **Top services** and **Top accounts** this month; click one to open it in the Explorer.
- **Data status:** what each connection's cost source last delivered: **Source**, **Days
  covered**, **Final through** and **Delivered**.

### Explorer

- **Range:** **Month to date**, **Last 30 days**, **Last 90 days**, **Last month**, **Last 6
  months** (default), **Last 12 months**, **Year to date**, **Last year** or **Custom**.
- **Daily** (for ranges up to 92 days), **Monthly**, **Quarterly** or **Yearly** periods.
- **Group by** **Provider**, **Account**, **Region**, **Service**, **Resource**, **Charge type** or
  a tracked tag, and **Effective** or **Billed** cost.
- **Filters** on the same dimensions. Each one only offers values that match the other filters.
- A stacked chart and a table with a column per period and a total. Click a bar or row to filter
  to it and go one level deeper; **CSV** downloads the table.

Grouping or filtering by **Resource** needs a FOCUS export: connections on the billing API only
split by account, service and region.

**Saved views** keep the Explorer's range, period, grouping, metric and filters. Use **Save view…**
to name one, and tick **Share with everyone (read-only for them)** to share it. Others can open a
shared view and **Save as…** their own copy. The star makes a view open first. Preset ranges stay
relative ("Last 6 months" moves with time); custom ranges keep their dates. Posture **Trends** has
saved views too.

### Budgets & anomalies

Pick the **Site** and **Project**: budgets and alerts belong to the project the connection
delivers cost to (its destination).

**Budgets:** **New budget** sets a **Monthly amount** in one **Currency** (only cost billed in it
counts), an alert threshold (**Alert when the month is projected to reach (%)**, 80 by default),
optional **Provider**, **Account**, **Region** and **Service** filters, and **Alert channels**. The
table shows **Spent**, **Projected** and the **Budget**. A budget without filters is projected
with the provider's forecast; a filtered one from the last 7 days' average. The budget alerts the
channels, at Medium severity, when the projection reaches the threshold. Without channels it is
shown but sends nothing.

**Anomalies:** a day is flagged, per account and per service, when it is far from the median of
the same weekday over the previous 8 weeks (at least 4 are needed), the change is at least 10 %,
and it is at least 50 in the account's currency. On estimated days only rises count. **Acknowledge**
one with an optional note, or **Reopen** it. **Alert** picks the project's channels for new
anomalies; the same channels get a Low-severity alert when a commitment ends within 60 days.

Channels are the shared notification channels; see [Alerts](/docs/how-to/alerts/).

## Security posture

### Posture source

The **Posture** step picks where findings come from:

| Source | How it works | What it costs |
| --- | --- | --- |
| **Automatic (recommended)** (default) | AWS Security Hub or Microsoft Defender for Cloud where it is on and readable, so you see its full set of controls; the Obzly baseline fills in elsewhere | The native service's charges where it's on; nothing extra elsewhere |
| **Security Hub only** / **Defender for Cloud only** | The provider's own results and scores. Regions or subscriptions without it aren't covered | Security Hub: about $0.001 per security check (less above 100,000 a month), plus the AWS Config rules it uses. Defender: foundational CSPM is free; the Defender CSPM plan is billed per server, storage account, database and serverless resource |
| **Obzly baseline only** | Obzly's own checks, the same across AWS and Azure, with fix steps. A smaller set of controls | No service charge: read-only API calls on each refresh |

The connections list shows these as **Automatic**, **Native only** and **Baseline only**. Each
region (AWS) or subscription (Azure) reads from one source, so a finding is never counted twice.
When editing a connection, the step shows what the last refresh found per scope: native, Obzly
baseline or not covered. **Refresh every** is 4, 6, 12 (default) or 24 hours.

From Security Hub, Obzly reads the FSBP and CIS AWS Foundations Benchmark controls, passed and
failed, so passed controls count toward scores; other enabled standards are left out. From
Defender for Cloud it reads the assessments, mapped to the Microsoft cloud security benchmark. A
subscription with no assessments counts as not enabled.

### Baseline checks

The Obzly baseline starts with 19 checks, each mapped to its standards' controls and with fix
steps for the CLI, infrastructure as code and the console:

| Provider | Check | Severity | Control |
| --- | --- | --- | --- |
| AWS | The root user should have MFA | Critical | IAM.9 |
| AWS | The root user should have no access keys | Critical | IAM.4 |
| AWS | RDS instances should not be publicly accessible | Critical | RDS.2 |
| AWS | A multi-region CloudTrail trail should be logging | High | CloudTrail.1 |
| AWS | EC2 instances should require IMDSv2 | High | EC2.8 |
| AWS | S3 buckets should block public access | High | S3.8 |
| AWS | Security groups should not allow SSH (22) from anywhere | High | EC2.13 |
| AWS | Security groups should not allow RDP (3389) from anywhere | High | EC2.14 |
| AWS | EBS encryption by default should be on in every region | Medium | EC2.7 |
| AWS | The IAM password policy should require 14 or more characters | Medium | IAM.15 |
| AWS | RDS instance storage should be encrypted | Medium | RDS.3 |
| AWS | S3 buckets should have server access logging | Medium | S3.9 |
| Azure | Network security groups should not allow SSH (22) from the internet | High | MCSB NS-1 |
| Azure | Network security groups should not allow RDP (3389) from the internet | High | MCSB NS-1 |
| Azure | Azure SQL servers should disable public network access | High | MCSB NS-2 |
| Azure | Storage accounts should disallow anonymous blob access | High | CIS Azure 3.7 |
| Azure | Key vaults should have soft delete and purge protection | Medium | MCSB DP-8 |
| Azure | Storage accounts should accept secure transfer (HTTPS) only | Medium | MCSB DP-3 |
| Azure | Storage accounts should require TLS 1.2 or later | Medium | MCSB DP-3 |

Most also map to a CIS control. An AWS check uses the FSBP control it stands in for, so a finding
keeps its history when Security Hub is turned on or off in a region. A setting the probe couldn't
read fails the check, with the error as evidence: unknown is never a pass.

### Findings

- A finding is **open** while it fails, **resolved** once a later refresh of its scope succeeds
  without it, and **reopened** if it comes back. A scope that couldn't be read resolves nothing.
- **Suppress** a finding from its drawer with a reason (required) and, optionally, an end date. A
  suppressed finding stays tracked but leaves scores and alerts, and counts again when the
  suppression ends. **Lift suppression** ends it early. Suppressions go into the audit log.
- Each finding keeps its history: when it opened, resolved, reopened and was suppressed, and by
  whom.
- Changing a finding, a recommendation or a budget needs membership of its project.

## The Posture tab

**Posture** has five views:

- **Standards:** open findings by severity, suppressed and resolved counts, and a score per
  standard: controls passed of those evaluated (a control nothing evaluated isn't counted as
  passed; suppressed findings are left out). A badge says where each standard's results come from.
  Click a standard to see its findings.
- **Findings:** **Open**, **Suppressed**, **Resolved** or **All**, a search by title, control or
  resource, and filters by **Severity**, **Standard**, **Provider**, **Account**, **Region**,
  **Source** and **Connection**. A finding's drawer shows the control, its standards, the
  resource, the evidence, **How to fix** (CLI, IaC and Console tabs, ready to copy), suppression
  and history.
- **Recommendations:** see [below](#posture-recommendations).
- **Trends:** the Explorer's ranges and periods (last 90 days, monthly by default), the same
  filters, and saved views. Charts show **Open findings** at the end of each period by severity,
  **New and resolved** within it, and **Standard scores**.
- **Coverage:** per connection, account and region, whether findings come from the native service
  (**Native**), the baseline because native is off or unreadable (**Fallback: baseline**), the
  baseline by choice (**Baseline**), nowhere (**Not covered**), or a scope whose last read failed
  (**Stale**), with the reason. Account-wide controls show as **Account-wide**. **Not native**
  lists only the gaps.

**Alerts** (top right) opens **Alert on new findings**: pick the Site and project the connection
delivers findings to, the minimum severity (**High and critical** by default) and the channels. A
finding alerts once when it opens or reopens; suppressed findings never do.

## Recommendations

Recommendations are read weekly, by the connection that reads cost, after a cost refresh. A part
that can't be read (for example Compute Optimizer before its opt-in) keeps its last good data, and
**Recommendations** says which part and why.

### Cost recommendations

**Cost → Recommendations** shows **Open savings / month**, **Planned / month**, **Realized /
month** and **Commitments to check**, then:

- **Recommendations**, largest savings first, filtered by kind (**Rightsize**, **Idle**,
  **Modernize**, **Storage**), account and status (**To do**, **Done**, **Dismissed**, **All**).
  They come from:
  - AWS Compute Optimizer: EC2 rightsizing, EBS volumes and idle resources. It needs a one-time
    opt-in (free) in your account; until then that part says it isn't enabled;
  - Azure Advisor, cost category;
  - Obzly's own checks: unattached EBS volumes and managed disks, gp2 volumes, and unused Elastic
    IPs and public IP addresses. On Azure they need Reader, so tick Inventory or Posture on the
    connection too. Their saving is worked out from the resource's own cost over the last 30 days,
    so it shows n/a until a FOCUS export has resource-level cost.

  When the provider and an Obzly check flag the same resource for the same thing, the provider's
  recommendation wins.
- On EC2, the drawer adds the Obzly agent's CPU and memory p95 from the instance, since the cloud's
  own metrics have no memory figure. A busy memory marks the recommendation high risk.
- Click a recommendation for its evidence, then **Plan** it (with an owner and due date), mark it
  **Done**, or **Dismiss** it with a reason; **Reopen** undoes either. A recommendation is also
  marked done when the provider stops recommending it. Plans and dismissals go into the audit log.
- **Realized savings** compares the median daily cost 14 days before each change with 14 days
  after, from cost data, measured 16 days after it was done.
- **Existing commitments:** Savings Plans, EC2 and RDS Reserved Instances, and Azure reservations
  and savings plans, with their term, end date and use over the last 30 days. One that nothing used
  is tagged **Unused**; one ending within 60 days is tagged **Ends soon** and alerts on the cost
  anomaly channels.

### Commitment planner

The **Commitment planner** shows the providers' own purchase recommendations for a connection and
commitment type (Compute Savings Plan, EC2 Instance Savings Plan, EC2 or RDS Reserved Instances,
Azure savings plan or reservations):

- **Look back** 7, 30 or 60 days of usage.
- A grid of **1 year** and **3 years** against **No upfront**, **Partial upfront** and **All
  upfront** (AWS) or **Monthly** and **Upfront** (Azure), with the monthly saving and payback for
  each. Combinations the provider doesn't sell show **Not offered**. **Lowest risk** and **Most
  savings** mark the extremes.
- **Rightsize first** (on by default) shrinks each plan by the open rightsizing and idle savings
  on the usage it covers, so the planner and the recommendations never count the same saving
  twice.
- Pick an option to see what to buy, per region and account, and **How to buy** for the console
  steps. Once bought, the commitment appears under **Existing commitments** after the next weekly
  refresh.

### Posture recommendations

**Posture → Recommendations** turns findings into actions:

- **Fix:** the findings one change fixes, such as several findings on one bucket, or one control
  failing on several resources.
- **Guardrail:** a setting that stops findings coming back, offered where findings it would
  prevent are open: S3 Block Public Access for the whole account, IMDSv2 as the default for new
  instances, EBS encryption by default, an Azure Policy that denies SSH and RDP open to the
  internet, and the built-in policy that denies anonymous blob access. A guardrail that is itself a
  control (EBS encryption by default is EC2.7) also closes that finding.
- **Coverage gap:** scopes that aren't covered or fall back to the baseline, such as turning on
  Security Hub in a region or adding the posture permissions.

Actions are ranked with coverage gaps first, then by severity closed per unit of effort. Tick
actions into the plan; **Scores** shows each standard now, with the plan done and with every action
done. An action is **Done** when its findings resolve, and **Accepted risk** when they were
suppressed instead. An action can link to the matching cost recommendation, for example idle,
unencrypted volumes. Dismissing an action needs a reason.

## In Infrastructure

For a cloud resource found by a connection, the [asset drawer](/docs/how-to/infrastructure/#using-the-tab)
shows its **Cost** (effective cost over the last 30 days, from FOCUS exports, with any open cost
recommendations) and its **Posture** (open findings, which open the finding's drawer).

## Permissions

Every permission is read-only. The wizard's templates add only what the ticked uses need.

| Use | AWS | Azure |
| --- | --- | --- |
| Cost: export | `s3:GetObject` and `s3:ListBucket` on the export prefix only, `bcm-data-exports:GetExport` and `ListExports` | **Storage Blob Data Reader** on the export's storage account |
| Cost: billing API, forecasts and recommendations | `ce:GetCostAndUsage`, `GetCostForecast`, `GetDimensionValues`, `GetTags`, `GetSavingsPlansPurchaseRecommendation`, `GetReservationPurchaseRecommendation`, `GetSavingsPlansCoverage`, `GetSavingsPlansUtilizationDetails`, `GetReservationCoverage`, `GetReservationUtilization`; `compute-optimizer:GetEnrollmentStatus`, `GetEC2InstanceRecommendations`, `GetEBSVolumeRecommendations`, `GetIdleRecommendations`; `ec2:DescribeRegions`, `DescribeInstances`, `DescribeVolumes`, `DescribeAddresses` | **Cost Management Reader** (and Billing Reader at billing scope), which also reads Advisor; **Reservations Reader** at the tenant for existing reservations and savings plans (optional); **Reader** for the Obzly checks |
| Posture | The `SecurityAudit` managed policy, plus `securityhub:DescribeHub`, `GetEnabledStandards` and `GetFindings` | **Security Reader**, and **Reader** for the baseline checks |

With the probe's own IAM identity, the wizard writes a policy with exactly the calls instead; see
[Permissions](/docs/how-to/cloud-connections/#permissions).

## MCP

The [MCP server](/docs/how-to/mcp/) has read-only tools for this data, scoped to the caller's
projects: `cost_summary`, `cost_explore`, `cost_anomalies`, `cost_budgets`,
`cost_recommendations`, `posture_scores`, `posture_findings` and `posture_coverage`.
