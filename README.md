# Veil & Vogue

Veil & Vogue is a full-stack e-commerce web application for modest fashion (hijabs, abayas, accessories, gift hampers, etc.) with a customer storefront, guest/registered checkout, and an admin panel for operations and moderation.

## Languages & Technologies

This project is primarily built with **JavaScript** (ES modules):

- **Frontend:** JavaScript + **JSX** (React), HTML, and CSS via **Tailwind CSS**
- **Backend:** JavaScript (Node.js / Express)
- **Database:** MongoDB with Mongoose
- **Real-time:** Socket.IO (server + client)

### Main stack

**Frontend (`frontend/`)**
- React 18
- Vite
- React Router
- Tailwind CSS
- Axios
- Framer Motion
- React Hot Toast
- Lucide React icons
- Socket.IO Client

**Backend (`backend/`)**
- Node.js
- Express
- MongoDB / Mongoose
- JWT authentication (`jsonwebtoken`)
- bcryptjs (password hashing)
- Multer (file uploads)
- Local file storage for uploads (product image URLs can also be managed directly from admin dashboard)
- Nodemailer (email)
- Socket.IO (real-time notifications/messages/events)
- Validator / custom validation utilities

## Key features (current codebase)

### Customer-facing
- Product browsing, categories, search, product detail pages
- Cart, wishlist, and custom/AI-assisted hamper builder flows
- Guest checkout and registered-user checkout
- Order placement with pricing rules (including shipping/discount logic in app flows)
- Payment options including receipt upload for supported methods
- Order success and order tracking support
- User account/profile management
- Saved addresses in profile and address selection/prefill during checkout (for logged-in users)
- Reviews (guest and logged-in flows supported in app logic)
- Forgot/reset password flow
- Contact/messages and other informational pages (About, FAQ, Shipping, Returns, etc.)

### Admin panel
- Dashboard analytics
- Product management
- Order management and order detail views
- User management
- Message management
- Receipt verification workflow (authorized receipt preview/download)
- Review moderation
- Audit logs

### Security / operational notes
- Auth tokens are handled on the frontend with storage-aware helpers (remember-me/session behavior)
- Receipt file access is intended to be served through authorized endpoints (not direct public receipt access)
- Upload/storage utilities support local storage by default and configurable cloud storage paths (e.g. Cloudinary) depending on environment configuration
- Some APIs support both legacy and paginated response shapes for backward compatibility

## Project structure

```text
.
├── frontend/                 # React + Vite storefront and admin UI
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── utils/
│   │   └── ...
│   ├── .env.example
│   └── package.json
├── backend/                  # Express API, models, routes, controllers, utils
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── utils/
│   ├── uploads/              # Local upload storage (if used)
│   ├── .env.example
│   ├── server.js
│   └── package.json
└── README.md
```

## Prerequisites

- **Node.js** (LTS recommended)
- **npm**
- **MongoDB** (local or hosted Atlas/cluster)
- **SMTP credentials** (for password reset/order emails, if email features are used)
- (Optional) Image hosting URLs for product images (admin can paste image URLs directly in dashboard)

## Environment setup

### 1) Backend environment (`backend/.env`)

Create `backend/.env` from `backend/.env.example` and configure values for your environment.

**Common variables (from `.env.example`):**
- `PORT` (e.g. `5000`)
- `NODE_ENV` (`development` / `production`)
- `MONGO_URI`
- `JWT_SECRET`
- `JWT_EXPIRE` (e.g. `30d`)
- `FRONTEND_URL` (used for CORS/socket/reset links)
- `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM`

**Additional backend variables may be used by the codebase (depending on features/config):**
- `PUBLIC_BASE_URL` or `BACKEND_URL` (public/backend URL resolution for generated links/assets)
- `UPLOAD_PROVIDER` (e.g. `local` or `cloudinary`, depending on implementation)
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (for Cloudinary uploads)

> Check `backend/.env.example` and backend utility/config files for the exact variables required in your setup.

### 2) Frontend environment (`frontend/.env`)

Create `frontend/.env` from `frontend/.env.example` (optional for default local setup).

- `VITE_API_URL` — backend API base URL (default/local example: `http://localhost:5000`)

## Installation

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

> If the project is inside a OneDrive-synced folder, ensure dependencies are fully available locally before running dev/build commands.

## Run the app (development)

### Start backend (Terminal 1)

```bash
cd backend
npm run dev
```

### Start frontend (Terminal 2)

```bash
cd frontend
npm run dev
```

- Frontend (Vite): typically `http://localhost:5173`
- Backend API: typically `http://localhost:5000`

## Build frontend (production)

```bash
cd frontend
npm run build
npm run preview
```

## Scripts

### Backend (`backend/package.json`)
- `npm run dev` — start API with nodemon
- `npm start` — start API with Node
- `npm run seed` — seed script (**use with caution**; do not run blindly on existing data)

### Frontend (`frontend/package.json`)
- `npm run dev` — start Vite dev server
- `npm run build` — production build
- `npm run preview` — preview production build

## Development notes

- **Do not run `backend/seed.js` destructively** on an environment with real data unless you understand its behavior and have backups.
- **Receipt access:** receipt files are intended to be accessed via authorized backend endpoints (admin/customer/guest-token flows), not as publicly exposed static receipt files.
- **Uploads/storage:** product images and receipts may use local storage or cloud storage depending on configuration. Validate environment variables and existing records when switching providers.
- **Guest checkout:** guest checkout/order tracking is supported by design; promotional/account-specific features may apply only to registered users.
- **Remember-me/auth:** frontend auth persistence behavior depends on the remember-me/session implementation and storage availability.
- **Admin features:** admin list pages may use pagination/search/sort/export APIs; runtime verification is recommended after config or data changes.

## Troubleshooting

- **Frontend cannot reach backend:** verify `VITE_API_URL`, backend server status, and CORS/`FRONTEND_URL` config.
- **Auth/session issues:** clear browser storage (local/session) and test login/remember-me again.
- **Uploads/receipts not loading:** check upload provider config, file paths/URLs, and that receipt access uses authorized endpoints.
- **Emails not sending:** verify SMTP/env settings and provider credentials.
- **MongoDB connection errors:** verify `MONGO_URI` and database availability.

## License

No license file is included in this repository. Add one if you plan to distribute or open-source the project.
