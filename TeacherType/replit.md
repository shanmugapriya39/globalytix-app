# Globalytix

## Overview

A full-stack translation application designed for classroom use, enabling teachers to translate English text into multiple languages with audio support. Built with React frontend and Node.js/Express backend, featuring a modern UI with shadcn/ui components and PostgreSQL database integration via Drizzle ORM. The application supports bidirectional translation - English to student languages and student languages back to English - making it ideal for multilingual classroom environments.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Components**: shadcn/ui component library with Radix UI primitives for accessibility
- **Styling**: Tailwind CSS with CSS variables for theming and dark mode support
- **State Management**: TanStack React Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation via @hookform/resolvers

### Backend Architecture
- **Runtime**: Node.js with TypeScript using ESM modules
- **Framework**: Express.js with custom middleware for request logging
- **Development Setup**: Vite middleware integration for hot reloading in development
- **Error Handling**: Centralized error handling middleware ensuring JSON responses
- **Session Management**: Express sessions with PostgreSQL store via connect-pg-simple

### Data Storage Solutions
- **Primary Database**: PostgreSQL via Neon Database serverless connection
- **ORM**: Drizzle ORM with PostgreSQL dialect for type-safe database operations
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Fallback Storage**: In-memory storage implementation for development/testing

### Authentication and Authorization
- **User Management**: Basic user schema with username/password authentication
- **Schema Validation**: Zod schemas for type-safe user data validation
- **Storage Interface**: Abstracted storage interface allowing multiple implementations

### External Dependencies

#### Cloud Translation Services
- **Azure Translator**: Primary translation service for multi-language support
- **Azure Speech**: Text-to-speech synthesis for audio generation
- **Language Support**: 14 languages including Persian, Spanish, Arabic, Latvian, Russian, French, German, Afrikaans, Dutch, Portuguese, Turkish, Chinese (Simplified), Danish, and Italian

#### Database and Infrastructure
- **Neon Database**: Serverless PostgreSQL database hosting
- **Database Connection**: @neondatabase/serverless for optimized serverless connections

#### Development and Build Tools
- **Vite**: Frontend build tool and development server
- **TypeScript**: Type safety across frontend and backend
- **ESBuild**: Backend bundling for production builds
- **PostCSS**: CSS processing with Tailwind CSS

#### UI and Styling
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library for consistent iconography
- **Google Fonts**: Typography with Inter, DM Sans, and other web fonts

## Recent Changes

### September 6, 2025 - iOS Native App Conversion
- **iOS Native App**: Successfully converted to native iOS app using Capacitor framework
- **App Store Ready**: Configured with Bundle ID `com.globalytix.app` for App Store submission
- **Xcode Cloud CI/CD**: Automated build pipeline with `ci_post_clone.sh` script
- **Native Performance**: Web app wrapped in native container for better iOS integration
- **Build Optimization**: Configured build process to generate iOS-compatible assets

### August 25, 2025 - Enhanced Speech Interface & UX Improvements
- **NEW: Enhanced Speech Interface** (`/speech`) - Kid-friendly live translation with one-message focus
- **One-message focus**: Replaces previous messages instead of creating a log for "live captions" feel
- **Clear state indicators**: Big visual labels (🎙️ "Listening…", ⏳ "Translating…", ✅ "Done")
- **Friendlier language detection**: Shows "🌍 Detected: Spanish (🇪🇸)" with flags and full names
- **Color-coded message bubbles**: Blue for student speech, green for English output
- **Large circular record button**: Changes color when active (red while recording)
- **English TTS playback**: Play button with slow/normal speed controls for classroom use
- **Auto-retry mechanism**: Graceful error handling with automatic retry suggestions
- **Audio trimming**: Removes silence from recordings for snappier translations
- **Streamlined API**: Single call translates to multiple languages with rate-limited TTS
- **ZIP export**: Batch download audio files for lesson planning