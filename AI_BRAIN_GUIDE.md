# AI Brain Guide

This guide describes the optional AI layer for the White Saffron Bills app. The current live app is a static GitHub Pages frontend connected to Supabase. The AI Brain should be added as a backend service or Supabase Edge Function so API keys and privileged database access stay off the browser.

## Recommended Architecture

```text
User browser
  -> GitHub Pages Bills app
  -> Admin-only AI backend API or Supabase Edge Function
  -> Supabase bills table
  -> OpenAI or other AI provider
```

Important rule: do not put `OPENAI_API_KEY`, Gemini keys, service role keys, or database passwords in `index.html` or any public frontend file. Keep them as server environment variables only.

## Admin-Only Visibility

AI Assistant, Smart Dashboard, Predictions, and Anomalies belong inside the admin dashboard only. Staff and white users should keep the normal Bills workflow: add, read, view, edit/delete only within the allowed window, and export if permitted.

Frontend hiding is useful for a clean interface, but it is not security by itself. The backend API or Supabase Edge Function must also reject non-admin requests before reading bills or calling an AI provider.

## Minimal File Structure

```text
Bills/
├── index.html                  # Current live static app
├── README.md                   # App notes
├── AI_BRAIN_GUIDE.md           # This guide
└── ai-brain/                   # Optional future AI service
    ├── frontend-ai/
    │   ├── src/
    │   │   ├── pages/
    │   │   │   ├── AIAssistant.jsx
    │   │   │   ├── SmartDashboard.jsx
    │   │   │   ├── Predictions.jsx
    │   │   │   └── Anomalies.jsx
    │   │   ├── components/
    │   │   │   ├── ChatInterface.jsx
    │   │   │   ├── InsightsCard.jsx
    │   │   │   ├── TrendChart.jsx
    │   │   │   └── AutoSuggest.jsx
    │   │   ├── services/
    │   │   │   └── aiApi.js
    │   │   └── hooks/
    │   │       ├── useAI.js
    │   │       └── useSmartSearch.js
    │   ├── package.json
    │   └── .env.example
    ├── backend-ai/
    │   ├── src/
    │   │   ├── routes/
    │   │   │   ├── aiChat.js
    │   │   │   ├── aiInsights.js
    │   │   │   ├── aiPredict.js
    │   │   │   └── aiAnomalies.js
    │   │   ├── services/
    │   │   │   ├── NLPService.js
    │   │   │   ├── PredictionService.js
    │   │   │   ├── CategorizationAI.js
    │   │   │   ├── AnomalyDetector.js
    │   │   │   └── InsightGenerator.js
    │   │   └── config/
    │   │       └── aiConfig.js
    │   ├── server.js
    │   ├── package.json
    │   └── .env.example
    ├── ai-models/
    │   ├── nlp/
    │   │   └── processor.py
    │   ├── prediction/
    │   │   └── forecast.py
    │   └── requirements.txt
    └── docker-compose.yml
```

## Admin Pages

### 1. AI Assistant

```text
URL: /admin/ai-assistant
Purpose: Natural language questions about bills
Visibility: admin only
```

Example questions:

- Show spending last month.
- What are the top 5 vendors this year?
- Compare this year with last year.
- When did we last pay Gas?
- Which bills are pending?

### 2. Smart Dashboard

```text
URL: /admin/ai-insights
Purpose: AI-generated business insights
Visibility: admin only
```

Examples:

- Food spending is higher than last month.
- A vendor amount is unusually high.
- Pending bills increased this week.
- Duplicate bill numbers may exist.

### 3. Predictions

```text
URL: /admin/predictions
Purpose: Forecast future spending
Visibility: admin only
```

Examples:

- Next month spending forecast.
- Category breakdown prediction.
- Warning if a budget may exceed.
- Suggested payment planning.

### 4. Anomalies

```text
URL: /admin/anomalies
Purpose: Find unusual patterns and possible mistakes
Visibility: admin only
```

Examples:

- Duplicate bills.
- Missing recurring bills.
- Vendor charged much more than usual.
- Unusual category amount.

## Backend API Shape

The admin dashboard should call a backend like this:

```text
POST /api/admin/ai/chat
POST /api/admin/ai/insights
POST /api/admin/ai/predict
POST /api/admin/ai/anomalies
```

The backend should:

1. Verify the Supabase user session.
2. Require the admin role for all AI routes.
3. Query only the bills the admin is allowed to read.
4. Summarize or aggregate bill data before sending it to AI.
5. Send the smallest useful context to the AI provider.
6. Return a clean answer to the frontend.

## Example Backend Service

```js
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function answerBillQuestion({ question, billSummary }) {
  const response = await openai.responses.create({
    model: process.env.OPENAI_MODEL,
    input: [
      {
        role: 'system',
        content: 'You analyze business bills. Answer with clear numbers and short explanations.'
      },
      {
        role: 'user',
        content: JSON.stringify({ question, billSummary })
      }
    ]
  });

  return response.output_text;
}
```

Use `OPENAI_MODEL` as an environment variable so the model can be changed without editing code.

## Environment Variables

### Backend only

```bash
OPENAI_API_KEY=sk-...
OPENAI_MODEL=your_model_here
SUPABASE_URL=https://tmupbruwmwlrmewhoodn.supabase.co
SUPABASE_SERVICE_ROLE_KEY=server_only_key
ALLOWED_ORIGINS=https://naappe.github.io
NODE_ENV=production
PORT=5000
```

### Frontend only

```bash
VITE_AI_API_URL=https://your-ai-backend.example.com
VITE_SUPABASE_URL=https://tmupbruwmwlrmewhoodn.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=public_publishable_key
```

## Hosting Options

### Option 1: Supabase Edge Functions

Best fit if you want to keep this project simple.

```text
Frontend: GitHub Pages
AI backend: Supabase Edge Function
Database: Supabase
AI provider: OpenAI or Gemini
```

Benefits:

- No extra backend host.
- Supabase Auth is close to the data.
- Secrets stay inside Supabase.

### Option 2: Railway or Render Backend

```text
Frontend: GitHub Pages or Vercel
Backend: Railway or Render
Database: Supabase
AI provider: OpenAI or Gemini
```

Benefits:

- Easier for a Node Express API.
- Good if you want more routes and background jobs.

### Option 3: Vercel Frontend + Serverless API

```text
Frontend: Vercel
API routes: Vercel serverless functions
Database: Supabase
AI provider: OpenAI or Gemini
```

Benefits:

- Good if the app later moves from single `index.html` to React or Next.js.

## Data Strategy

Do not send all 2,000+ bills to AI for every question. Use summaries first.

Good summaries:

```text
- total by month
- total by vendor
- total by category
- pending vs paid totals
- duplicate bill numbers
- unusually high bills
- recent bills only
```

Send raw bill rows only when the question truly needs row-level detail.

## Suggested First Build

Start with only one admin endpoint:

```text
POST /api/admin/ai/chat
```

First version features:

- Ask questions about this year.
- Ask top vendors.
- Ask monthly totals.
- Ask pending vs paid.
- Ask duplicate bill numbers.

After that works, add:

```text
/api/admin/ai/insights
/api/admin/ai/anomalies
/api/admin/ai/predict
```

## Deployment Checklist

- Create backend or Supabase Edge Function.
- Add server-only AI provider key.
- Add server-only Supabase service role key if needed.
- Verify user session before reading data.
- Reject non-admin API requests server-side.
- Add CORS for the live frontend domain.
- Add `/api/admin/ai/chat` first.
- Test with a small summary of bills.
- Add AI links inside the admin dashboard only.
- Keep AI links hidden for staff and white users.
- Add insights, anomalies, and predictions later.

## Useful Official References

- OpenAI API quickstart: https://platform.openai.com/docs/quickstart/make-your-first-api-request
- OpenAI API authentication and key safety: https://platform.openai.com/docs/api-reference/authentication
- OpenAI Responses API reference: https://platform.openai.com/docs/api-reference/responses
