# Custom GPT

A powerful platform for creating, managing, and interacting with custom AI assistants built on Remix and Cloudflare Workers.

## Overview

Custom GPT allows organizations to create tailored AI assistants with specific knowledge, capabilities, and personalities. The platform includes user management, team collaboration, and conversation history features.

## Features

- **Custom AI Assistant Creation**: Define instructions, personality, and capabilities
- **Knowledge Base Management**: Upload documents to enhance AI knowledge
- **Team Collaboration**: Invite team members and assign custom GPTs
- **User Authentication**: Secure signup, login, and password management
- **Conversation History**: Track and review past interactions
- **Admin Dashboard**: Manage users, teams, and GPT configurations
- **Responsive Interface**: Built with React and TailwindCSS

## Tech Stack

- **Frontend**: React, TailwindCSS
- **Framework**: Remix
- **Backend/Hosting**: Cloudflare Workers
- **Database**: MongoDB (with Mongoose)
- **Authentication**: JWT, bcrypt
- **Storage**: AWS S3
- **Email**: Nodemailer

## Getting Started

### Prerequisites

- Node.js (v20.0.0 or higher)
- npm or yarn
- Cloudflare account (for deployment)

### Installation

1. Clone the repository
   ```sh
   git clone <repository-url>
   cd custom-gpt
   ```

2. Install dependencies
   ```sh
   npm install
   ```

3. Configure environment variables
   Create a `.env` file with necessary configuration (MongoDB URI, JWT secret, etc.)

### Development

Start the development server:
```sh
npm run dev
```

To run with Wrangler (Cloudflare Workers):
```sh
npm run build
npm start
```

### Type Generation

Generate types for your Cloudflare bindings:
```sh
npm run typegen
```

## Deployment

1. Set up a Cloudflare Workers account if you don't have one
2. Deploy your application:
   ```sh
   npm run deploy
   ```

## Project Structure

- `/app` - Application code
  - `/components` - Reusable UI components
  - `/contexts` - React context providers
  - `/models` - MongoDB schema definitions
  - `/routes` - Application routes and API endpoints
  - `/services` - Service layer for business logic
  - `/utils` - Utility functions

## License

[Your License Here]

## Contributors

[Your Contributors Here]
