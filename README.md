# Electronics Repair Business Management System

A comprehensive management system for electronics repair businesses with ticketing, inventory management, invoicing, and customer management features.

## Technology Stack

- **Backend**: Express.js with TypeScript
- **Frontend**: Next.js 14 with TypeScript and React
- **Database**: PostgreSQL
- **Containerization**: Docker
- **ORM**: Sequelize

## Features

- **Ticketing System**: Create, assign, track, and manage repair tickets
- **Inventory Management**: Track parts, supplies, and set reorder thresholds
- **Customer Management**: Store customer information and repair history
- **Invoicing**: Generate professional invoices from repair tickets
- **User Management**: Role-based access control (admin, technician, frontdesk)
- **Reporting**: Business analytics and performance reports

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js (for local development outside Docker)
- npm or yarn (for local development outside Docker)

### Setup and Installation

1. Clone the repository:

```bash
git clone https://github.com/berrytechnics/repair-business-manager.git
cd repair-business-manager
```

2. Configure environment variables:

```bash
# Copy example .env files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

3. Start the application with Docker Compose:

```bash
docker-compose up
```

or

```bash
 ./run.sh
```

This will start the PostgreSQL database, backend API, and frontend web application.

1. Access the application:

- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- API Documentation: http://localhost:4000/api-docs

### Default Admin Login

After initialization, you can log in with the default admin account:

- Email: admin@repairmanager.com
- Password: admin123

**Important**: Change the default admin password after the first login!

## Project Structure

```
repair-business-manager/
├── backend/                # Express TypeScript backend
│   ├── src/
│   │   ├── config/         # Configuration files
│   │   ├── controllers/    # Request handlers
│   │   ├── middlewares/    # Express middlewares
│   │   ├── models/         # Database models
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── types/          # TypeScript types and interfaces
│   │   ├── utils/          # Utility functions
│   │   └── app.ts          # Express app
│   ├── Dockerfile          # Backend Docker configuration
│   ├── package.json        # Backend dependencies and scripts
│   ├── tsconfig.json       # TypeScript configuration
│   └── ...
├── frontend/               # Next.js TypeScript frontend
│   ├── src/
│   │   ├── app/            # Next.js App Router
│   │   ├── components/     # Reusable React components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utility functions
│   │   ├── styles/         # CSS and styling files
│   │   └── types/          # TypeScript types and interfaces
│   ├── Dockerfile          # Frontend Docker configuration
│   ├── package.json        # Frontend dependencies and scripts
│   ├── tsconfig.json       # TypeScript configuration
│   └── ...
├── database/
│   ├── init/               # Database initialization scripts
│   └── migrations/         # Database migration files
├── docker-compose.yml      # Docker composition
├── clean.sh                # Cleanup script
├── run.sh                  # Run script
└── README.md               # Project documentation
```

## Development

### Repair Business Manager CLI

This CLI tool helps manage your Electronics Repair Business Management System, handling tasks like running the application, managing Docker, and running database migrations.

#### Installation

From the project root directory:

```bash
# Install dependencies
npm install

# Make the CLI executable
chmod +x cli.js

# Install the CLI globally (optional)
npm install -g .
```

#### Usage

After installation, you can use the CLI in two ways:

##### 1. Using npm scripts

```bash
# Run the application
npm run run

# Clean up Docker resources
npm run cleanup

# Run database migrations
npm run migrate

# Undo the last migration
npm run migrate:undo

# Undo all migrations
npm run migrate:undo:all

# Seed the database
npm run seed

# Undo all seeds
npm run seed:undo

# View logs
npm run logs

# Follow logs
npm run logs:follow

# View only backend logs
npm run logs:backend

# View only database logs
npm run logs:db

# View only frontend logs
npm run logs:web
```

##### 2. Using the command directly (if installed globally)

```bash
# View available commands
repair --help

# Run the application
repair run

# Clean up Docker resources
repair cleanup

# Run database migrations
repair migrate

# Undo the last migration
repair migrate:undo

# Undo all migrations
repair migrate:undo --all

# Seed the database
repair seed

# Undo all seeds
repair seed --undo

# View logs
repair logs

# Follow logs
repair logs --follow

# View only backend logs
repair logs --backend

# View only database logs
repair logs --db

# View only frontend logs
repair logs --web
```

#### Available Commands

- `run` - Build and run the application with Docker
- `cleanup` - Clean up Docker resources
- `migrate` - Run database migrations
- `migrate:undo` - Undo the last database migration
- `seed` - Seed the database with initial data
- `logs` - Show Docker logs

Each command has additional options that can be viewed with the `--help` flag:

```bash
repair <command> --help
```

### Backend Development

```bash
cd backend
npm install
npm run dev
```

### Frontend Development

```bash
cd frontend
npm install
npm run dev
```

### Database Migrations

```bash
cd backend
npx sequelize-cli db:migrate
```

### Adding Seed Data

```bash
cd backend
npx sequelize-cli db:seed:all
```

## API Documentation

The API documentation is available at http://localhost:4000/api-docs when running the application.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
