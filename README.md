# K-State Baseball Analytics

A comprehensive baseball analytics and scouting platform built for K-State Baseball. This application provides detailed insights into player performance, pitching analytics, hitting statistics, and spray charts.

## Features

- **Player Analytics** - View detailed statistics for batters and pitchers
- **Scouting Dashboard** - Advanced scouting tools for player evaluation
- **Game Logs** - Track performance across games and seasons
- **Pitch Analysis** - Visualize pitch locations, velocities, and tendencies
- **Spray Charts** - Analyze hitting patterns and field distribution
- **Strike Zone Visualization** - Interactive strike zone diagrams
- **Role-Based Access** - Admin, scout, and viewer role management

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn/ui (Radix UI)
- **Backend**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Testing**: Vitest

## Getting Started

### Prerequisites

- Node.js v18+ ([install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating))
- npm or bun

### Installation

1. Clone the repository:
```sh
git clone https://github.com/alexophyta/KSU-Baseball-code.git
cd "K-State Baseball Analytics"
```

2. Install dependencies:
```sh
npm install
```

3. Start the development server:
```sh
npm run dev
```

The app will be available at `http://localhost:8080`

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run build:dev` - Build in development mode
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint
- `npm run test` - Run tests once
- `npm run test:watch` - Run tests in watch mode

## Project Structure

```
src/
├── components/       # Reusable React components
├── pages/           # Page components
├── contexts/        # React contexts for state management
├── hooks/           # Custom React hooks
├── lib/             # Utility functions and helpers
├── integrations/    # Third-party integrations (Supabase)
└── test/            # Test files
```

## Environment Variables

The app uses Supabase for backend services. Required environment variables are in `.env`:

- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Your Supabase anon key
- `VITE_SUPABASE_PROJECT_ID` - Your Supabase project ID

## Development

### Local Development Workflow

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make changes and test locally
3. Commit changes: `git commit -m "Add your message"`
4. Push to remote: `git push origin feature/your-feature`
5. Create a Pull Request on GitHub

## Deployment

The application can be deployed to any static hosting service (Vercel, Netlify, etc.) that supports Node.js build environments.

## License

This project is proprietary to K-State Baseball.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
