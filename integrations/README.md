# Integrations

An integration is one npm package that adds a service or a feature to an ignitify task: the secrets, the hosts and the settings it needs, and code only when it earns its place.

Add a published integration to a task:

```bash
ignitify integration:add <name> --task <slug>
```

**Drafts** are settings-only skeletons. They are in this repo but not published to npm yet. Each one is upgraded on its own, after it passes the value test and its checklist (`TODO.md` in its folder).

## Chat and messaging

| Integration                              | What it does for a task                                          | Status               |
| :--------------------------------------- | :--------------------------------------------------------------- | :------------------- |
| [`telegram`](telegram)                   | Send Telegram messages from a task                               | ready, not published |
| [`slack`](slack)                         | Post messages and files to Slack channels and people             | draft                |
| [`discord`](discord)                     | Post messages to Discord channels with a bot                     | draft                |
| [`microsoft-teams`](microsoft-teams)     | Post messages to Microsoft Teams channels                        | draft                |
| [`google-chat`](google-chat)             | Post messages to a Google Chat space through an incoming webhook | draft                |
| [`whatsapp-business`](whatsapp-business) | Send WhatsApp messages from a business number (Cloud API)        | draft                |

## Email

| Integration                              | What it does for a task                                                 | Status |
| :--------------------------------------- | :---------------------------------------------------------------------- | :----- |
| [`gmail`](gmail)                         | Send and read email in a Gmail or Google Workspace mailbox              | draft  |
| [`microsoft-outlook`](microsoft-outlook) | Send email and read the mailbox and calendar of a Microsoft 365 account | draft  |
| [`sendgrid`](sendgrid)                   | Send transactional email through SendGrid                               | draft  |
| [`mailgun`](mailgun)                     | Send transactional email through Mailgun                                | draft  |
| [`postmark`](postmark)                   | Send transactional email through Postmark                               | draft  |
| [`resend`](resend)                       | Send transactional email through Resend                                 | draft  |
| [`amazon-ses`](amazon-ses)               | Send email through Amazon Simple Email Service                          | draft  |

## SMS and voice

| Integration        | What it does for a task                       | Status |
| :----------------- | :-------------------------------------------- | :----- |
| [`twilio`](twilio) | Send SMS and start voice calls through Twilio | draft  |
| [`vonage`](vonage) | Send SMS through the Vonage SMS API           | draft  |

## CRM

| Integration                | What it does for a task                                            | Status |
| :------------------------- | :----------------------------------------------------------------- | :----- |
| [`salesforce`](salesforce) | Read and write Salesforce records (leads, contacts, opportunities) | draft  |
| [`hubspot`](hubspot)       | Read and write HubSpot contacts, companies and deals               | draft  |
| [`pipedrive`](pipedrive)   | Read and write Pipedrive deals, people and organizations           | draft  |
| [`zoho-crm`](zoho-crm)     | Read and write Zoho CRM records                                    | draft  |
| [`attio`](attio)           | Read and write Attio records and lists                             | draft  |

## Payments

| Integration        | What it does for a task                                                  | Status |
| :----------------- | :----------------------------------------------------------------------- | :----- |
| [`stripe`](stripe) | Create and read Stripe payments, customers, invoices and subscriptions   | draft  |
| [`paypal`](paypal) | Create orders, capture payments and read transactions in PayPal          | draft  |
| [`square`](square) | Read and create Square payments, orders and customers                    | draft  |
| [`paddle`](paddle) | Read and manage Paddle Billing transactions, customers and subscriptions | draft  |

## Accounting and ERP

| Integration                | What it does for a task                                           | Status |
| :------------------------- | :---------------------------------------------------------------- | :----- |
| [`quickbooks`](quickbooks) | Read and write QuickBooks Online invoices, customers and payments | draft  |
| [`xero`](xero)             | Read and write Xero invoices, contacts and payments               | draft  |
| [`netsuite`](netsuite)     | Read and write NetSuite records through the REST API              | draft  |

## E-commerce

| Integration                                        | What it does for a task                                                      | Status |
| :------------------------------------------------- | :--------------------------------------------------------------------------- | :----- |
| [`shopify`](shopify)                               | Read and update Shopify orders, products and customers through the Admin API | draft  |
| [`woocommerce`](woocommerce)                       | Read and update WooCommerce orders and products                              | draft  |
| [`amazon-selling-partner`](amazon-selling-partner) | Read Amazon seller orders, inventory and reports                             | draft  |

## Marketing and ads

| Integration                | What it does for a task                                             | Status |
| :------------------------- | :------------------------------------------------------------------ | :----- |
| [`mailchimp`](mailchimp)   | Manage Mailchimp audiences and campaigns                            | draft  |
| [`klaviyo`](klaviyo)       | Manage Klaviyo profiles, lists and events                           | draft  |
| [`google-ads`](google-ads) | Read Google Ads campaign reports and manage campaigns               | draft  |
| [`meta-ads`](meta-ads)     | Read Meta (Facebook and Instagram) ad insights and manage campaigns | draft  |

## Product analytics

| Integration                            | What it does for a task                        | Status |
| :------------------------------------- | :--------------------------------------------- | :----- |
| [`google-analytics`](google-analytics) | Run Google Analytics 4 reports and send events | draft  |
| [`mixpanel`](mixpanel)                 | Send events to Mixpanel and query reports      | draft  |
| [`amplitude`](amplitude)               | Send events to Amplitude and export data       | draft  |
| [`segment`](segment)                   | Send track and identify calls to Segment       | draft  |
| [`posthog`](posthog)                   | Send events to PostHog and query insights      | draft  |

## Support and ticketing

| Integration                | What it does for a task                                      | Status |
| :------------------------- | :----------------------------------------------------------- | :----- |
| [`zendesk`](zendesk)       | Create, read and update Zendesk Support tickets              | draft  |
| [`intercom`](intercom)     | Read and reply to Intercom conversations and manage contacts | draft  |
| [`freshdesk`](freshdesk)   | Create, read and update Freshdesk tickets                    | draft  |
| [`servicenow`](servicenow) | Create and read ServiceNow incidents and table records       | draft  |

## Project management

| Integration          | What it does for a task                           | Status |
| :------------------- | :------------------------------------------------ | :----- |
| [`jira`](jira)       | Create, search and update Jira issues             | draft  |
| [`linear`](linear)   | Create and update Linear issues and read projects | draft  |
| [`asana`](asana)     | Create and update Asana tasks and read projects   | draft  |
| [`trello`](trello)   | Create and move Trello cards                      | draft  |
| [`clickup`](clickup) | Create and update ClickUp tasks                   | draft  |
| [`monday`](monday)   | Create and update items on monday.com boards      | draft  |

## Developer tools

| Integration                | What it does for a task                                               | Status |
| :------------------------- | :-------------------------------------------------------------------- | :----- |
| [`github`](github)         | Work with GitHub issues, pull requests, releases and repository files | draft  |
| [`gitlab`](gitlab)         | Work with GitLab issues, merge requests and pipelines                 | draft  |
| [`vercel`](vercel)         | Read Vercel deployments and trigger redeploys                         | draft  |
| [`cloudflare`](cloudflare) | Manage Cloudflare DNS records, cache and Workers                      | draft  |

## Files and storage

| Integration                    | What it does for a task                                          | Status               |
| :----------------------------- | :--------------------------------------------------------------- | :------------------- |
| [`s3-storage`](s3-storage)     | Upload, link and download files in S3-compatible storage         | ready, not published |
| [`google-drive`](google-drive) | List, upload and download files in Google Drive                  | draft                |
| [`dropbox`](dropbox)           | List, upload and download files in Dropbox                       | draft                |
| [`box`](box)                   | List, upload and download files in Box                           | draft                |
| [`onedrive`](onedrive)         | List, upload and download files in OneDrive                      | draft                |
| [`sharepoint`](sharepoint)     | List, upload and download files in SharePoint document libraries | draft                |

## Docs and knowledge

| Integration                      | What it does for a task                    | Status |
| :------------------------------- | :----------------------------------------- | :----- |
| [`notion`](notion)               | Create and read Notion pages and databases | draft  |
| [`confluence`](confluence)       | Create and read Confluence pages           | draft  |
| [`google-docs`](google-docs)     | Create and read Google Docs documents      | draft  |
| [`google-sheets`](google-sheets) | Read and append rows in Google Sheets      | draft  |

## Calendar and scheduling

| Integration                          | What it does for a task                     | Status |
| :----------------------------------- | :------------------------------------------ | :----- |
| [`google-calendar`](google-calendar) | Read and create Google Calendar events      | draft  |
| [`calendly`](calendly)               | Read Calendly scheduled events and invitees | draft  |

## HR and recruiting

| Integration                | What it does for a task                                     | Status |
| :------------------------- | :---------------------------------------------------------- | :----- |
| [`bamboohr`](bamboohr)     | Read BambooHR employees and time off                        | draft  |
| [`workday`](workday)       | Read Workday workers and organizations through the REST API | draft  |
| [`hibob`](hibob)           | Read HiBob people data and time off                         | draft  |
| [`greenhouse`](greenhouse) | Read Greenhouse candidates, jobs and applications           | draft  |
| [`lever`](lever)           | Read Lever opportunities, postings and candidates           | draft  |
| [`ashby`](ashby)           | Read Ashby candidates, jobs and applications                | draft  |

## Identity and access

| Integration                                | What it does for a task                                | Status |
| :----------------------------------------- | :----------------------------------------------------- | :----- |
| [`okta`](okta)                             | Read and manage Okta users and groups                  | draft  |
| [`auth0`](auth0)                           | Read and manage Auth0 users through the Management API | draft  |
| [`microsoft-entra-id`](microsoft-entra-id) | Read and manage Microsoft Entra ID users and groups    | draft  |

## AI and LLM APIs

| Integration                      | What it does for a task                                              | Status |
| :------------------------------- | :------------------------------------------------------------------- | :----- |
| [`openai`](openai)               | Call OpenAI models for text, structured output, images and audio     | draft  |
| [`anthropic`](anthropic)         | Call Claude models for text, tool use and structured output          | draft  |
| [`google-gemini`](google-gemini) | Call Gemini models through the Gemini API                            | draft  |
| [`mistral`](mistral)             | Call Mistral models for chat, embeddings and OCR                     | draft  |
| [`hugging-face`](hugging-face)   | Run models through Hugging Face inference providers and read the Hub | draft  |
| [`replicate`](replicate)         | Run open-source models on Replicate (images, audio, text)            | draft  |
| [`elevenlabs`](elevenlabs)       | Turn text into speech and speech into text with ElevenLabs           | draft  |

## Social media

| Integration                        | What it does for a task                                               | Status |
| :--------------------------------- | :-------------------------------------------------------------------- | :----- |
| [`x-twitter`](x-twitter)           | Post to X and read posts and mentions                                 | draft  |
| [`linkedin`](linkedin)             | Publish posts to a LinkedIn member or organization page               | draft  |
| [`facebook-pages`](facebook-pages) | Publish posts to a Facebook Page and read its insights                | draft  |
| [`instagram`](instagram)           | Publish photos to an Instagram professional account and read insights | draft  |
| [`youtube`](youtube)               | Upload videos and read channel and video statistics on YouTube        | draft  |

## Video and meetings

| Integration        | What it does for a task                                   | Status               |
| :----------------- | :-------------------------------------------------------- | :------------------- |
| [`stream`](stream) | Stream live audio and video (HLS) from a task             | ready, not published |
| [`zoom`](zoom)     | Create Zoom meetings and read recordings and participants | draft                |
| [`mux`](mux)       | Upload and stream video with Mux                          | draft                |

## Maps and location

| Integration                  | What it does for a task                                              | Status |
| :--------------------------- | :------------------------------------------------------------------- | :----- |
| [`google-maps`](google-maps) | Geocode addresses, search places and compute routes with Google Maps | draft  |
| [`mapbox`](mapbox)           | Geocode addresses, compute routes and render static maps with Mapbox | draft  |

## Databases and backends

| Integration              | What it does for a task                                           | Status |
| :----------------------- | :---------------------------------------------------------------- | :----- |
| [`supabase`](supabase)   | Read and write a Supabase database and storage over its HTTP APIs | draft  |
| [`firebase`](firebase)   | Read and write Firestore and send push messages with Firebase     | draft  |
| [`airtable`](airtable)   | Read and write Airtable records                                   | draft  |
| [`snowflake`](snowflake) | Run SQL on Snowflake through the SQL API                          | draft  |
| [`bigquery`](bigquery)   | Run queries and load rows in Google BigQuery                      | draft  |

## Monitoring and alerting

| Integration              | What it does for a task                                    | Status |
| :----------------------- | :--------------------------------------------------------- | :----- |
| [`sentry`](sentry)       | Report task errors to Sentry and read issues               | draft  |
| [`datadog`](datadog)     | Send metrics, events and logs to Datadog and read monitors | draft  |
| [`pagerduty`](pagerduty) | Trigger and resolve PagerDuty incidents                    | draft  |

## Forms and surveys

| Integration                    | What it does for a task           | Status |
| :----------------------------- | :-------------------------------- | :----- |
| [`typeform`](typeform)         | Read Typeform forms and responses | draft  |
| [`google-forms`](google-forms) | Read Google Forms responses       | draft  |

## E-signature

| Integration            | What it does for a task                                                 | Status |
| :--------------------- | :---------------------------------------------------------------------- | :----- |
| [`docusign`](docusign) | Send documents for signature and read envelope status in Docusign       | draft  |
| [`pandadoc`](pandadoc) | Create documents from templates and send them for signature in PandaDoc | draft  |
