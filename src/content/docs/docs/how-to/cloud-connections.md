---
title: Cloud connections
description: Give a probe group read-only access to AWS accounts and Azure subscriptions so the infrastructure inventory lists what runs there.
---

<!-- Source: obzly-dev/docs/INFRASTRUCTURE.md, obzly-dev/deploy/cloud/aws/obzly-readonly-role.yaml, obzly-dev/deploy/cloud/azure/obzly-reader.bicep, obzly-dev/deploy/cloud/azure/obzly-identity.bicep, obzly-dev/deploy/cloud/README.md, obzly-dev/frontend/src/features/infrastructure/lib/cloudTemplates.ts, obzly-dev/docs/runbooks/upgrade.md -->

A **cloud connection** is **read-only** access to one AWS account (or a whole AWS Organization) or
one Azure subscription (or a management group). A [probe group](/docs/deploy/probe/) uses it to
scan the cloud for resources that run no agent, such as load balancers, databases, buckets,
functions and scaling groups, and the [infrastructure inventory](/docs/how-to/infrastructure/)
lists them next to what your agents report.

Cloud connections live on the [control plane](/docs/deploy/multi-site/). Admins manage them in
**Settings → Cloud connections**; **Infrastructure → Cloud connections** shows the same list
read-only, with a link to Settings for admins.

:::note[Credentials are never stored in Obzly]
The probe gets cloud credentials from its own identity, by assuming a role, or by exchanging a
short-lived token from the control plane. Obzly stores only identifiers: the account or
subscription ID, the role ARN or client ID, and the external ID. Every permission the templates
grant is read-only; nothing lets Obzly change a resource or read the data in buckets, databases or
secrets.
:::

## Before you start

- A [probe group](/docs/deploy/probe/) to run the scans, and a Synthetics
  [destination](/docs/how-to/synthetics/#1-add-a-destination): the Site project the results go to.
- For **federated** access only: the control plane's `PUBLIC_URL` on HTTPS and reachable from AWS
  or Azure, which read `/.well-known/openid-configuration` and `/.well-known/jwks.json` from it. The
  control plane creates its signing key for these tokens on first start.

## The connection wizard

**Settings → Cloud connections → New cloud connection** walks through six steps, with Back and Next.
After the first step, every step shows only the chosen provider's options and templates.

1. **Provider:** AWS or Azure.
2. **Scan types:** **Infrastructure inventory**. The step lists the read-only permissions it needs.
3. **Scope:**
   - AWS: **One AWS account** (account ID), or the **Whole AWS Organization** (Organization ID),
     deployed as a StackSet from the management account;
   - Azure: **One subscription** (subscription ID) or a **Management group**, plus the Microsoft
     Entra tenant ID;
   - and for both: the connection's name, the **probe group that runs the scans**, and where the
     results go (a destination).
4. **Access method** (see [below](#access-methods)).
5. **Run template:** the wizard generates what to run with every value filled in, as a template
   (**CloudFormation** or **Bicep**) or a CLI script (**AWS CLI** or **az CLI**). Copy it or
   download it with its files, run it, then paste the identifier it prints (the **Role ARN** for
   AWS, the **Client ID** for Azure; not needed when the probe uses its own identity) and tick
   **I've run it**.
6. **Settings and test:**
   - regions (AWS; empty means every enabled region) or locations (Azure; empty means all);
   - resource types (none ticked means all);
   - **Full discovery every** 30 minutes to 24 hours (4 hours by default) and **Health scan
     every** 5 minutes to 1 hour (15 minutes by default, never less often than discovery). See
     [Scan schedule](#scan-schedule);
   - **Test access** runs one dry scan on a live member of the probe group and shows the result,
     without sending anything to the Site. So that it answers quickly, it samples the first
     account and up to two regions. Then **Save connection**.

**Test access** reports **Works** (with the number of resources found), **Needs permission** or
**Failed**. After saving, the list shows each connection's status (**Scanning**, **Waiting for the
first discovery**, **Needs permission**, **Late** when no scan has reported for three intervals,
**Failing** or **Disabled**), with its schedule, resource count and last scans. When a call is
denied, the connection shows **Needs permission** with the exact missing action, and the rest is
still scanned. When AWS or Azure throttled calls, the status says how many and how long the probe
waited.

## Access methods

### AWS

| Method | Pick it when | What you run |
| --- | --- | --- |
| **The probe's own IAM identity** | The probe group runs in AWS with an IAM identity: an EC2 instance profile, IRSA, or EKS Pod Identity | A policy for the probe group's own role with exactly the calls discovery makes |
| **A read-only role in the target account** | The probe group has an AWS identity, and the resources are in another account | A read-only role that only the probe group's role can assume, with an **external ID** Obzly generates |
| **Federated through the Obzly control plane** | The probe group runs outside AWS (on premises or in another cloud) and has no AWS identity | A read-only role that trusts the control plane as an OIDC provider |

### Azure

| Method | Pick it when | What you run |
| --- | --- | --- |
| **The probe's managed identity** | The probe group runs on Azure VMs or AKS with a managed identity | Role assignments for that identity's principal (object) ID. Give its client ID too for a user-assigned identity |
| **A user-assigned identity with a federated credential** | The probe group runs on Kubernetes (AKS or EKS) with workload identity | A new identity whose federated credential trusts the probe's Kubernetes service account, with no secret |
| **Federated through the Obzly control plane** | The probe group runs outside Azure | A new identity whose federated credential trusts the control plane's issuer URL |

For workload identity on Kubernetes, annotate the [probe chart's](/docs/deploy/probe/#the-probe-groups-cloud-identity)
service account with `azure.workload.identity/client-id` and label the pods
`azure.workload.identity/use: "true"`. For IRSA, annotate it with `eks.amazonaws.com/role-arn`.

### Federated access

With federated access the control plane is the OIDC issuer. The probe asks it for a short-lived
token for its connection, with the subject `probe:<probe group name>` and the cloud's audience
(`sts.amazonaws.com` for AWS, `api://AzureADTokenExchange` for Azure), and AWS or Azure exchanges it
for temporary credentials. These tokens are signed with a key of their own, so they can't be used
to sign in to a Site.

## Permissions

| Provider | Inventory |
| --- | --- |
| AWS | The `ViewOnlyAccess` managed policy, plus `elasticloadbalancing:DescribeTargetHealth`, `tag:GetResources`, `eks:DescribeCluster` and `ec2:DescribeInstanceStatus` |
| Azure | `Reader` on the subscription or management group |

With the probe's own AWS identity, the wizard writes a policy with exactly the calls discovery
makes instead (CloudFormation can't attach AWS managed policies to an existing role):
`ec2:DescribeRegions`, `ec2:DescribeInstances`, `ec2:DescribeInstanceStatus`, `elasticloadbalancing:DescribeLoadBalancers`,
`elasticloadbalancing:DescribeTargetGroups`, `elasticloadbalancing:DescribeTargetHealth`,
`eks:ListClusters`, `eks:DescribeCluster`, `rds:DescribeDBInstances`,
`autoscaling:DescribeAutoScalingGroups`, `lambda:ListFunctions`, `s3:ListAllMyBuckets` and
`tag:GetResources`.

## Deploying the templates

The wizard fills in these templates for you. Use them directly when you deploy through your own
pipeline: [`deploy/cloud/aws/obzly-readonly-role.yaml`](https://github.com/obzly/obzly/blob/main/deploy/cloud/aws/obzly-readonly-role.yaml)
(CloudFormation), and [`deploy/cloud/azure/obzly-reader.bicep`](https://github.com/obzly/obzly/blob/main/deploy/cloud/azure/obzly-reader.bicep)
with [`obzly-identity.bicep`](https://github.com/obzly/obzly/blob/main/deploy/cloud/azure/obzly-identity.bicep)
beside it (Bicep).

### AWS: one account

A read-only role assumed with an external ID, in the account Obzly discovers:

```bash
aws cloudformation deploy --stack-name obzly-readonly \
  --template-file obzly-readonly-role.yaml --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides TrustMode=AssumeRole \
    TrustedPrincipalArn=arn:aws:iam::111122223333:role/obzly-probe \
    ExternalId=hl-7f3c9a2e5b8d4c10

# The role ARN for the wizard:
aws cloudformation describe-stacks --stack-name obzly-readonly \
  --query "Stacks[0].Outputs[?OutputKey=='RoleArn'].OutputValue" --output text
```

For federated access, trust the control plane instead:

```bash
aws cloudformation deploy --stack-name obzly-readonly \
  --template-file obzly-readonly-role.yaml --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides TrustMode=Federated \
    IssuerHost=obzly.harborline.example ProbeSubject=probe:edge-north
```

The template also creates the account's IAM OIDC provider for the control plane; set
`CreateOidcProvider=false` when the account already has one for that host. `RoleName` defaults to
`obzly-readonly`.

### AWS: a whole Organization

From the management account, deploy the stack there (StackSets skip the management account, and
Obzly lists the accounts with its role), then the same template as a service-managed StackSet to
every account:

```bash
aws cloudformation deploy --stack-name obzly-readonly \
  --template-file obzly-readonly-role.yaml --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides TrustMode=AssumeRole \
    TrustedPrincipalArn=arn:aws:iam::111122223333:role/obzly-probe \
    ExternalId=hl-7f3c9a2e5b8d4c10

aws cloudformation create-stack-set --stack-set-name obzly-readonly \
  --template-body file://obzly-readonly-role.yaml --capabilities CAPABILITY_NAMED_IAM \
  --permission-model SERVICE_MANAGED \
  --auto-deployment Enabled=true,RetainStacksOnAccountRemoval=false \
  --parameters ParameterKey=TrustMode,ParameterValue=AssumeRole \
    ParameterKey=TrustedPrincipalArn,ParameterValue=arn:aws:iam::111122223333:role/obzly-probe \
    ParameterKey=ExternalId,ParameterValue=hl-7f3c9a2e5b8d4c10

ROOT=$(aws organizations list-roots --query "Roots[0].Id" --output text)
aws cloudformation create-stack-instances --stack-set-name obzly-readonly \
  --deployment-targets OrganizationalUnitIds=$ROOT --regions us-east-1
```

### Azure: one subscription

Federated through the control plane, with a new user-assigned identity in the resource group
`obzly`:

```bash
az account set --subscription 00000000-0000-0000-0000-000000000000
az group create --name obzly --location westeurope --output none
az deployment sub create --name obzly-readonly --location westeurope \
  --template-file obzly-reader.bicep \
  --parameters accessMode=federated resourceGroupName=obzly \
    issuer=https://obzly.harborline.example subject=probe:edge-north

# The client ID for the wizard:
az deployment sub show --name obzly-readonly \
  --query properties.outputs.clientId.value --output tsv
```

- **Workload identity:** `accessMode=workload`, with `issuer` set to your cluster's OIDC issuer URL
  and `subject=system:serviceaccount:<namespace>:<service account>`, for example
  `system:serviceaccount:obzly-probe:obzly-probe`.
- **The probe's managed identity:** `accessMode=probe principalId=<object ID>`. No new identity or
  resource group is created, and there is no client ID to paste.
- **A management group:** the wizard generates an az CLI script that assigns `Reader` at the
  management group.

## What is discovered

- **AWS:** EC2 instances, Elastic Load Balancing (v2) load balancers with their target health,
  EKS clusters, RDS databases, Auto Scaling groups and Lambda functions in each selected region,
  and the account's S3 buckets. For an **Organization**, the probe lists the accounts with the management account's role,
  then assumes the role of the same name in each account, up to **200 accounts**, four accounts
  (and four regions in each) at a time. An account without the role is listed in the scan's
  errors, and the others are still scanned.
- **Azure:** one Resource Graph query (paged) over the subscription or management group, for
  virtual machines, scale sets, AKS clusters, load balancers, application gateways, SQL databases,
  PostgreSQL flexible servers, storage accounts and function apps.

## Scan schedule

Each connection runs two kinds of scan, both set in the wizard:

- **Full discovery**, every 4 hours by default (30 minutes to 24 hours), lists everything in scope.
  New resources appear in Infrastructure after the next discovery.
- **Health scan**, every 15 minutes by default (5 minutes to 1 hour), re-reads only what the last
  discovery found, in the accounts, regions and types where it found something:
  - AWS: instance state and status checks, load balancer state and target health, and EKS, RDS
    and Auto Scaling state;
  - Azure: the state of the known resources, plus Resource Health availability.

  Buckets and functions keep what discovery found. A resource that has gone is no longer sent.

A health scan runs straight after each discovery, and only health scans send results to the Site,
so every resource carries its latest health. The probe keeps the latest inventory in its data
directory, so a restarted probe waits for the next discovery instead of starting one.

**Throttling.** AWS and Azure limit calls per account and region, so the probe paces its calls per
endpoint. When a cloud says how long to wait, the probe waits that long (up to 5 minutes) and
retries. The connection's status shows how many calls were throttled.

**Time limits.** A discovery may run for 80 % of its interval and a health scan for 80 % of its
own. A scan that runs out of time still sends what it found and is reported as partial; a partial
discovery keeps the resources the previous one found where it didn't get to. If that keeps
happening, scan less often or narrow the regions and resource types.

## How results merge

Each scan sends its findings to the connection's destination Site project, and the Site's inventory
build merges them with what the agents report:

- An **EC2 instance or Azure VM** joins the host with the same `host_id`. One with no agent is
  listed as a host of its own.
- An **EKS or AKS cluster** joins the cluster with the same `k8s_cluster_name`.
- A **load balancer** shows how many of its registered targets are healthy.
- Everything else is a new asset: load balancer, database, bucket, function or scaling group.

Health comes from the cloud's own state and its health checks: a stopped or deallocated resource
is inactive (blue); a resource the cloud reports as unhealthy (failed status checks, or Azure
Resource Health unavailable) is red, and degraded is amber; an unexpected state is amber; a load
balancer with no healthy targets is red (amber when only some are unhealthy); and a scaling group
below its desired size is amber. A resource that only the cloud reports becomes **not reporting**
after three of its connection's health scans plus 5 minutes: 50 minutes at the default 15-minute
health scan.
