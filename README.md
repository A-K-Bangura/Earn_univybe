# EduLift Student App

A modern, offline-first educational platform built with React, TypeScript, and Vite. This application provides students with a comprehensive learning experience including course management, gamification, social feed, analytics, and search capabilities.

## Features

### 🎓 Learning Management
- **Course Discovery**: Browse and search courses by level, university, faculty, and department
- **Course Enrollment**: Enroll in courses and track progress
- **Lesson Management**: Complete lessons and track mini-lesson progress
- **Quiz System**: Take quizzes with multiple question types (MCQ, multi-select, short answer, fill-in-the-blank)
- **Progress Tracking**: Real-time progress tracking with visual indicators

### 🎮 Gamification
- **XP System**: Earn XP for completing courses, lessons, and quizzes
- **Streaks**: Maintain daily learning streaks
- **Leaderboards**: Compete on overall, university, faculty, and department leaderboards
- **Achievements**: Unlock achievements and badges
- **XP Deductions**: Thoughtful engagement system (XP deductions for likes, comments, shares)

### 📱 Social Feed
- **Post Types**: Questions, announcements, resources, and discussions
- **Interactions**: Like, comment, and share posts
- **Filtering**: Filter by type, tags, and search
- **Trending Posts**: Discover trending content
- **Comment Moderation**: Student comments require approval before appearing publicly

### 📊 Analytics
- **Dashboard Analytics**: View learning and engagement metrics
- **Course Analytics**: Track progress and performance for specific courses
- **Progress Analytics**: Overall learning progress tracking
- **Insights**: Personalized learning insights and recommendations
- **Reports**: Generate and download performance reports

### 🔍 Search
- **Global Search**: Search across courses, posts, and users
- **Category-Specific Search**: Search within courses or posts
- **Suggestions**: Autocomplete search suggestions
- **Popular Queries**: View popular search queries
- **Recent Queries**: Access recent search history
- **Search Analytics**: Track search patterns and success rates

### 👤 Profile Management
- **Profile Updates**: Update personal information, bio, and interests
- **Avatar Upload**: Upload and update profile pictures
- **Social Links**: Add LinkedIn, Twitter, GitHub, and portfolio links
- **Preferences**: Manage user preferences

### 🔐 Authentication
- **Email/Phone Login**: Login with email or phone number
- **OTP Verification**: Secure OTP-based email verification
- **Onboarding**: Multi-step onboarding process
- **Password Setup**: Set password during onboarding

### 📱 Offline Support
- **Offline-First**: Works offline with IndexedDB storage
- **Auto-Sync**: Automatic synchronization when online
- **Offline Indicator**: Visual indicator for offline status

## Tech Stack

- **Framework**: React 19.1.1
- **Language**: TypeScript 5.9.3
- **Build Tool**: Vite 7.1.7
- **Routing**: React Router v7.1.0
- **State Management**: Zustand 5.0.8
- **Data Fetching**: TanStack React Query 5.59.0
- **HTTP Client**: Axios 1.7.9
- **Styling**: TailwindCSS v4.1.16
- **Offline Storage**: IndexedDB via `idb` 8.0.2
- **PWA**: VitePWA plugin

## Project Structure

```
src/
├── components/       # Reusable UI components
│   ├── common/       # Common components (buttons, modals, etc.)
│   ├── course/       # Course-specific components
│   └── layout/       # Layout components (navigation, shells)
├── hooks/            # Custom React hooks
├── pages/            # Page components
│   └── Auth/         # Authentication pages
├── services/         # API service layer
├── store/            # State management (Zustand)
├── types/            # TypeScript type definitions
└── utils/            # Utility functions
```

## API Integration

All API endpoints follow the standard structure:

### Base URL
The base URL includes `/api/v1`, so all endpoints are relative paths:
- `/student/auth/login` (not `/api/v1/student/auth/login`)

### Response Structure
```typescript
{
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  timestamp?: string;
  request_id?: string;
}
```

### Error Handling
All services check `response.data.success` before returning data. Errors are thrown with descriptive messages from the API.

## Key Services

### Authentication (`src/services/auth.ts`)
- `login()` - Login with email/phone and password
- `sendOtp()` - Send OTP for email verification
- `verifyOtp()` - Verify OTP and complete signup
- `completeOnboarding()` - Complete onboarding process
- `logout()` - Logout user
- `getAuthProfile()` - Get authenticated user profile

### Courses (`src/services/courses.ts`)
- `getCourses()` - Get courses with filters
- `getEnrolledCourses()` - Get enrolled courses
- `getCourseDetail()` - Get course details
- `getCourseProgress()` - Get course progress
- `enrollInCourse()` - Enroll in a course
- `unenrollFromCourse()` - Unenroll from a course
- `updateCourseProgress()` - Update course progress
- `getCourseModules()` - Get course modules

### Dashboard (`src/services/dashboard.ts`)
- `getDashboard()` - Get dashboard data
- `getEnrolledCourses()` - Get enrolled courses
- `getRecommendedCourses()` - Get recommended courses

### Gamification (`src/services/gamification.ts`)
- `getXPHistory()` - Get XP history
- `getStreakHistory()` - Get streak history
- `getBadges()` - Get user badges
- `getAchievements()` - Get user achievements

### Leaderboard (`src/services/leaderboard.ts`)
- `getLeaderboard()` - Get overall leaderboard
- `getUniversityLeaderboard()` - Get university leaderboard
- `getFacultyLeaderboard()` - Get faculty leaderboard
- `getDepartmentLeaderboard()` - Get department leaderboard
- `getAchievementLeaderboard()` - Get achievement leaderboard
- `getUserPosition()` - Get user's position on leaderboard

### Feed (`src/services/feed.ts`)
- `getFeedPosts()` - Get feed posts with filters
- `getTrendingPosts()` - Get trending posts
- `getPostsByTags()` - Get posts by tags
- `getPostDetail()` - Get post details
- `toggleLikePost()` - Like/unlike a post
- `commentOnPost()` - Comment on a post
- `sharePost()` - Share a post

### Analytics (`src/services/analytics.ts`)
- `getAnalyticsDashboard()` - Get analytics dashboard
- `getCourseAnalytics()` - Get course analytics
- `getProgressAnalytics()` - Get progress analytics
- `getInsights()` - Get learning insights
- `getEngagementAnalytics()` - Get engagement analytics
- `generateReport()` - Generate performance report
- `getReports()` - Get reports list
- `downloadReport()` - Download report as PDF

### Search (`src/services/search.ts`)
- `globalSearch()` - Global search across all categories
- `searchCourses()` - Search courses
- `searchPosts()` - Search posts
- `getSearchSuggestions()` - Get search suggestions
- `getPopularQueries()` - Get popular queries
- `getRecentQueries()` - Get recent queries
- `getSearchAnalytics()` - Get search analytics

## XP System

The gamification system awards/deducts XP for various actions:

### XP Awards
- **Course Enrollment**: +10 XP
- **Lesson Completion**: +50 XP
- **Quiz Completion**: +25 XP
- **Course Completion**: +100 XP
- **Streak Milestone (7 days)**: +50 XP
- **Streak Milestone (30 days)**: +200 XP

### XP Deductions
- **Feed Like**: -2 XP
- **Feed Comment**: -5 XP
- **Feed Share**: -3 XP

*Note: XP deductions encourage thoughtful engagement rather than spam.*

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Development

### Code Style
- TypeScript strict mode enabled
- ESLint for code quality
- Prettier for code formatting (if configured)

### State Management
- **Zustand** for global state (UI preferences, theme)
- **React Query** for server state (API data, caching)
- **LocalStorage** for persistence (user data, tokens)

### Offline Support
The app uses IndexedDB for offline storage. Data is automatically synced when the connection is restored.

## API Documentation

See `STUDENT_API_PAYLOADS.md` for complete API documentation.

## License

[Add your license here]

## Contributing

[Add contributing guidelines here]
