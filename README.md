# Gather Point
## Swan Hacks 2025 Hackathon Submission

**Gather Point** is a community-driven platform that helps people discover local events, connect with friends, and build meaningful relationships in their area. Built with modern web technologies (and powered by AI?), Gather Point makes it easy to find like-minded individuals and create experiences together.

---

## Features

### Interactive 3D Map
- Explore events and communities on an interactive 3D map powered by Cesium
- Visualize event locations with custom markers for different event categories
- Navigate and discover events happening in your area

### Event Management
- **Create Events**: Organize community events with details like name, description, category, location, and date/time
- **Search & Filter**: 
  - Search events by name across the entire database
  - Filter by categories
  - Filter by date range
- **WIP** **AI-Powered Event Discovery**: Use Google Gemini AI to search the web for volunteer events and community activities in your area
  - Automatically populate event details from AI search results
  - Edit and customize AI-discovered events before adding them to your database

### Social Features
- **Friends System**: 
  - Search for users and send friend requests
- **Real-time Messaging**: 
  - Chat with friends in real-time
- **Privacy Controls**:
  - Public accounts: Anyone can view your profile and message you
  - Private accounts: Only friends can view your profile and message you

---

## Tech Stack

### Frontend
- **Next.js** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Radix UI** - Accessible component library
- **Framer Motion** - Smooth animations
- **Lucide React** - Icon library
- **Shadcn** - Component Library

### Backend & Database
- **Firebase** - Authentication, Firestore database, and storage

### Maps & 3D Visualization
- **Cesium** - 3D globe and map visualization
- **Resium** - React bindings for Cesium

### AI Integration (WIP)
- **Google Gemini API** - AI-powered event search and discovery
- **@google/genai** - Official Gemini SDK

### Additional Tools
- **Nominatim (OpenStreetMap)** - Geocoding and address autocomplete
- **React Day Picker** - Date selection components

---

## Getting Started

### Prerequisites
- Node.js 20 or later
- npm or yarn
- Firebase project with Firestore enabled
- Google Gemini API key (for AI event search)

### Installation

1. **Clone the repository**
  
   `git clone https://github.com/SwanHacks2025/2025-swan-hacks.git`
   `cd 2025-swan-hacks`

2. **Install dependencies**

   `npm install`

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
  
```
   # Firebase Configuration
   NEXT_PUBLIC_GOOGLE_FIREBASE_API_KEY=your_firebase_api_key
   NEXT_PUBLIC_GOOGLE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   NEXT_PUBLIC_GOOGLE_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_GOOGLE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   NEXT_PUBLIC_GOOGLE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_GOOGLE_FIREBASE_APP_ID=your_app_id
   NEXT_PUBLIC_GOOGLE_FIREBASE_MEASUREMENT_ID=your_measurement_id
   
    # Google Maps API (for Cesium)
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key

   # Cesium Ion Token
    NEXT_PUBLIC_CESIUM_ION_TOKEN=your_cesium_token

   # Gemini AI API
    NEXT_PUBLIC_GOOGLE_GEMINI_KEY=your_gemini_api_key
```

   4. **Run the development server**
   `npm run dev`

   5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

---
