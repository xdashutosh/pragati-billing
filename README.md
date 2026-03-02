# LPW Echur — RA Bill System

Running Account Billing & Contract Management system for LPW Warehousing & Logistic Park, Echur.

**Contractor:** M/s. Conserve Buildcon LLP  
**Client:** M/s. LPW Warehousing Private Limited  
**PMC:** JLL  
**WO No:** LPWWPL/ECHUR/PROJECT/24-25/08 | Date: 21.08.2024  
**Current RA:** 16

---

## Pages

| Page | Description |
|------|-------------|
| **PO Abstract** | Total project scope — all PO line items, free issue deductions, contract value summary |
| **RA Bill Abstract** | Live RA-16 bill summary — net payable computed from all pages |
| **Building Milestones** | Block 1–4 milestone-wise entry (Civil, Fire, Electrical, Plumbing) |
| **Infra Milestones** | Infra, Ext. Electrical, Ext. Fire, Design — % completion entry |
| **Material Deductions** | 12 free issue material line items — this bill deduction entry |
| **Hold & Release** | 15 hold items (11b–11p) — checkbox toggle to release |

---

## Getting Started (Local Development)

### 1. Install dependencies
```bash
npm install
```

### 2. Run development server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

---

## Deploy to Vercel

### Option A — Vercel CLI
```bash
npm install -g vercel
vercel
```

### Option B — GitHub + Vercel Dashboard
1. Push this folder to a GitHub repo
2. Go to [vercel.com](https://vercel.com) → New Project
3. Import the repo — Vercel auto-detects Next.js
4. Click **Deploy**

---

## Project Structure

```
lpw-ra-system/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout + metadata
│   │   ├── page.tsx            # Main app shell + state management
│   │   └── globals.css         # Global styles + shared table classes
│   ├── components/
│   │   ├── Sidebar.tsx         # Navigation sidebar
│   │   ├── KpiCard.tsx         # KPI summary card
│   │   ├── POAbstractPage.tsx  # ★ NEW — Total PO scope page
│   │   ├── AbstractPage.tsx    # RA-16 bill abstract (live computed)
│   │   ├── BuildingPage.tsx    # Building milestones entry
│   │   ├── InfraPage.tsx       # Infra milestones entry
│   │   ├── MaterialsPage.tsx   # Material deductions entry
│   │   └── HoldsPage.tsx       # Hold & release management
│   ├── data/
│   │   └── projectData.ts      # All real data from Excel (typed)
│   └── lib/
│       └── utils.ts            # Number formatting helpers
├── package.json
├── next.config.js
├── tsconfig.json
├── vercel.json
└── README.md
```

---

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Inline styles + global CSS (no external CSS framework dependency)
- **Fonts:** IBM Plex Sans + IBM Plex Mono (Google Fonts)
- **Deploy:** Vercel (zero-config)
