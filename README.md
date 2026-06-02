# SocialSphere 🌐

A full-stack social media web app where you can post, chat, message, and video call — built with Node.js, MongoDB, and Socket.IO.

> **Live demo:** https://socialsphere-8cfb.onrender.com

---

## What can you do on SocialSphere?

-  **Create posts** with text, images, and videos
-  **Like and comment** on posts
-  **Follow people** and see their posts in your feed
-  **Search users** by name or bio
-  **Group chat** — a live chatroom anyone logged in can join
-  **Direct messages** — private 1-1 real-time chat
-  **Video calls** — peer-to-peer video calling right in the browser
-  **AI writing assistant** — helps you write better posts using Google Gemini

---

## Tech Stack

| What | Technology |
|---|---|
| Backend | Node.js + Express |
| Database | MongoDB (via Mongoose) |
| Frontend | EJS templates + Bootstrap 5 |
| Real-time | Socket.IO |
| Auth | Sessions + JWT |
| File uploads | Multer (stored locally) |
| AI | Google Gemini 2.0 Flash |
| Video calls | WebRTC (peer-to-peer) |

---


### Step 1 — Download the code

```bash
git clone https://github.com/pandesampoorn-dev/SocialSphere.git
cd SocialSphere
```

---

### Step 2 — Install dependencies

This downloads all the packages the app needs:

```bash
npm install
```

---

### Step 3 — Set up your environment file

The app needs some secret keys and settings. Create a file called `.env` in the project root and paste this in:

```
MONGODB_URI=mongodb://localhost:27017/socialsphere
SESSION_SECRET=pick-any-long-random-string-here
JWT_SECRET=pick-another-long-random-string-here
PORT=3000
```

> **What is a `.env` file?**
> It stores configuration and secrets that your app reads at startup. It is never uploaded to GitHub (already in `.gitignore`), so your secrets stay private.

**If you're using MongoDB Atlas (cloud)** instead of a local MongoDB install, replace `MONGODB_URI` with your Atlas connection string:
```
MONGODB_URI=mongodb+srv://youruser:yourpassword@yourcluster.mongodb.net/socialsphere?retryWrites=true&w=majority
```

**To enable the AI assistant**, add your Gemini API key (free at [aistudio.google.com](https://aistudio.google.com)):
```
GEMINI_API_KEY=your-key-here
GEMINI_MODEL=gemini-2.0-flash
```

---

### Step 4 — Start the app

```bash
npm start
```

Then open your browser and go to:
```
http://localhost:3000
```

You should see the SocialSphere landing page. Register an account and start exploring!

> **Tip:** During development, use `npm run dev` instead of `npm start`. It automatically restarts the server every time you save a file.

---

## Features explained

###  Authentication

- Register with a username, email and password
- Passwords are encrypted before being stored (using bcrypt)
- Login creates a **session** (keeps you logged in) and a **JWT token** (used for the API)
- A "refresh token" system keeps you logged in for 7 days without re-entering your password

###  Posts

- Write a post with a title, body text, and optional tags
- Attach up to **5 photos or videos** per post (JPG, PNG, GIF, WEBP, MP4, WEBM, MOV)
- Max file size: 50 MB per file
- Like, comment, edit, and delete your own posts

###  Follow System

- Follow other users to see their posts in your home feed
- The home feed shows posts from everyone you follow, newest first
- Suggested users are shown on the home page

###  Group Chat

- Click **Chat** in the navbar to join the live group chatroom
- All logged-in users see messages in real time
- Shows who is currently online and typing indicators

###  Direct Messages

- Go to any user's profile and click **Message** to start a DM
- Messages are saved in the database so you can scroll back through history
- New messages appear instantly without refreshing the page
- Shows unread message count in the conversation list

###  Video Calls (WebRTC)

Video calls work **peer-to-peer** — meaning the video and audio go directly between the two browsers. The server only helps the two users find each other (called "signalling").

**How to start a call:**
1. Go to a user's profile or DM chat
2. Click the **Video Call** button
3. Allow browser access to your camera and microphone
4. Click **Start Call**
5. The other person gets a notification popup anywhere on the site
6. They click **Answer** and the call connects

**What happens technically:**
1. Your browser creates an offer (SDP) describing your audio/video capabilities
2. The offer is sent to the other user via Socket.IO
3. They send back an answer
4. Both browsers exchange ICE candidates (network path info)
5. A direct peer-to-peer connection is established
6. Video/audio flows directly — **no media passes through the server**

###  AI Writing Assistant

When creating a post, click **AI Assistant** to open a side panel powered by Google Gemini 2.0 Flash.

Available actions:
- **Continue Writing** — adds more content to what you've written
- **Improve Writing** — fixes grammar and clarity
- **Shorten Post** — makes it more concise
- **Write Intro** — generates an opening paragraph
- **Suggest Titles** — gives you 5 title options
- **Formal / Casual tone** — rewrites your post in a different style
- **Custom instruction** — tell it anything, e.g. "add a conclusion" or "make it funnier"

The response streams in word by word. You can then **Replace**, **Append**, or **Copy** the result.

---

## Project structure

```
SocialSphere/
│
├── app.js                  ← Main entry point. Starts the server.
│
├── .env                    ← Your secret config (you create this)
├── .gitignore              ← Tells git what NOT to upload (includes .env)
├── package.json            ← Lists all dependencies
│
├── models/                 ← Database schemas (what data looks like)
│   ├── User.js             ← Username, password, avatar, followers
│   ├── Post.js             ← Title, body, media, likes, comments
│   └── Message.js          ← DM messages between users
│
├── routes/                 ← URL handlers (what happens when you visit a page)
│   ├── index.js            ← Home feed, follow/unfollow
│   ├── auth.js             ← Login, register, logout
│   ├── posts.js            ← Create, edit, delete, like, comment
│   ├── users.js            ← Profiles, settings, user search
│   ├── dm.js               ← Direct message pages
│   ├── video.js            ← Video call page
│   ├── ai.js               ← AI assistant endpoint
│   └── api.js              ← JSON API (for developers)
│
├── controllers/            ← Real-time Socket.IO logic
│   ├── chatController.js   ← Group chat
│   ├── dmController.js     ← Direct messages
│   └── videoController.js  ← Video call signalling
│
├── middleware/             ← Code that runs before route handlers
│   ├── auth.js             ← Checks if user is logged in
│   └── upload.js           ← Handles file uploads
│
├── views/                  ← HTML templates (what users see)
│   ├── partials/
│   │   ├── header.ejs      ← Top navbar (included on every page)
│   │   └── footer.ejs      ← Scripts (included on every page)
│   ├── index.ejs           ← Home feed
│   ├── guest.ejs           ← Landing page (not logged in)
│   ├── login.ejs
│   ├── register.ejs
│   ├── profile.ejs
│   ├── settings.ejs
│   ├── create-post.ejs     ← Post editor + AI panel
│   ├── edit-post.ejs
│   ├── single-post.ejs
│   ├── search.ejs          ← User search results
│   ├── chat.ejs            ← Group chatroom
│   ├── dm-list.ejs         ← All DM conversations
│   ├── dm-chat.ejs         ← 1-1 chat window
│   ├── video-call.ejs      ← Video call screen
│   └── 404.ejs
│
└── public/                 ← Static files served directly to the browser
    ├── css/style.css
    ├── uploads/            ← Uploaded photos and videos saved here
    └── js/
        ├── main.js
        ├── chat.js         ← Group chat Socket.IO client
        ├── dm.js           ← DM Socket.IO client
        ├── video-call.js   ← WebRTC video call client
        ├── media-preview.js
        └── ai-assistant.js ← AI panel streaming client
```

---

## Deploying to the internet

The easiest free option is **Render** (used for the live demo).

### Step 1 — Push your code to GitHub
```bash
git add .
git commit -m "ready to deploy"
git push
```

### Step 2 — Set up MongoDB Atlas
1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) and create a free account
2. Create a free **M0 cluster**
3. Under **Database Access** — add a user with a username and password
4. Under **Network Access** — click **Add IP Address** → choose **Allow access from anywhere**
5. Click **Connect** → **Drivers** → copy the connection string

### Step 3 — Deploy on Render
1. Go to [render.com](https://render.com) and sign up
2. Click **New +** → **Web Service** → connect your GitHub repo
3. Set these:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Root Directory:** *(leave blank)*
4. Under **Environment Variables**, add:

| Key | Value |
|---|---|
| `MONGODB_URI` | Your Atlas connection string |
| `SESSION_SECRET` | Any long random string |
| `JWT_SECRET` | Any long random string |
| `NODE_ENV` | `production` |
| `GEMINI_API_KEY` | Your Gemini key (optional) |
| `GEMINI_MODEL` | `gemini-2.0-flash` (optional) |

5. Click **Create Web Service** — Render builds and deploys automatically

> **Note:** The free tier on Render "sleeps" after 15 minutes of inactivity. The first visit after sleep takes about 30 seconds to load. This is normal.

---

## Common problems

**"Cannot connect to MongoDB"**
- Make sure MongoDB is running locally, OR your Atlas connection string is correct
- If using Atlas, check that your IP is whitelisted under Network Access

**"Port already in use"**
- Change the `PORT` in your `.env` to something else like `3001`

**"Module not found"**
- Run `npm install` again — a dependency is missing

**Camera/mic not working in video calls**
- Browsers only allow camera access on **HTTPS** or **localhost**
- On a deployed site, make sure you're on `https://`
- Check that you clicked "Allow" when the browser asked for permissions

**AI assistant not responding**
- Make sure `GEMINI_API_KEY` is set in your environment variables
- Check that the key is valid at [aistudio.google.com](https://aistudio.google.com)

---

## REST API

If you want to build something on top of SocialSphere, there's a basic JSON API. First get your token:

```
GET /api/token
```

Then include it in requests as a header:
```
Authorization: Bearer YOUR_TOKEN_HERE
```

| Method | Endpoint | What it does |
|---|---|---|
| GET | `/api/token` | Get your access token |
| GET | `/api/me` | Your profile info |
| GET | `/api/feed` | Your home feed as JSON |
| GET | `/api/posts/:id` | A single post as JSON |
| POST | `/api/posts/:id/like` | Toggle like on a post |
| POST | `/auth/refresh` | Get a new access token |

---

