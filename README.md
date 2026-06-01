# SocialSphere v2

Full-stack social media app built with Node.js, Express, MongoDB, EJS and Socket.IO.

## New Features in v2

- **JWT Authentication** — Access tokens (15 min) + refresh tokens (7 days) in httpOnly cookies
- **Photo & Video Posts** — Up to 5 files per post, stored locally in `public/uploads/`
- **Profile Avatar Upload** — Upload a photo to your profile in Settings
- **1-1 Direct Messages** — Private real-time chat using Socket.IO
- **AI Writing Assistant** — GPT-4o panel in the post editor (optional)

---

## Setup

### 1. Extract & Install

```
cd socialsphere
npm install
```

### 2. Create your .env file

```
copy .env.example .env     (Windows)
cp .env.example .env       (Mac / Linux)
```

Open `.env` and fill in:

```
MONGODB_URI=mongodb://localhost:27017/socialsphere
SESSION_SECRET=any-long-random-string
JWT_SECRET=another-long-random-string
PORT=3000
```

You do NOT need Cloudinary or any external storage service.
Photos and videos are saved to the `public/uploads/` folder on your machine.

### 3. Run

```
npm start          production
npm run dev        development (auto-restart on save)
```

Open http://localhost:3000

---

## Project Structure

```
socialsphere/
├── app.js                    Entry point — Express + Socket.IO
├── .env.example              All config variables
│
├── models/
│   ├── User.js               bcrypt passwords, JWT refresh tokens, avatar, follow lists
│   ├── Post.js               title, body, media[], tags, likes, comments
│   └── Message.js            1-1 DM messages with read status
│
├── routes/
│   ├── auth.js               Register, login, logout, JWT refresh endpoint
│   ├── posts.js              Create/edit/delete posts, media upload, like, comment, search
│   ├── users.js              Profile page, settings, avatar upload
│   ├── index.js              Home feed, follow/unfollow, group chat page
│   ├── dm.js                 DM conversation list + 1-1 chat page
│   ├── ai.js                 AI writing assistant (GPT-4o streaming)
│   └── api.js                JWT-protected REST API
│
├── controllers/
│   ├── chatController.js     Socket.IO group chat logic
│   └── dmController.js       Socket.IO 1-1 DM logic (namespace /dm)
│
├── middleware/
│   ├── auth.js               ensureAuth, ensureGuest, jwtAuth
│   └── upload.js             Multer — local disk storage for posts and avatars
│
├── views/                    14 EJS templates
│   ├── partials/
│   │   ├── header.ejs
│   │   └── footer.ejs
│   ├── guest.ejs             Landing page (not logged in)
│   ├── index.ejs             Home feed
│   ├── login.ejs
│   ├── register.ejs
│   ├── profile.ejs
│   ├── settings.ejs          Bio + avatar upload
│   ├── create-post.ejs       Post editor + media upload + AI panel
│   ├── edit-post.ejs
│   ├── single-post.ejs       Full post + comments + media gallery
│   ├── search.ejs
│   ├── chat.ejs              Group chat room
│   ├── dm-list.ejs           All DM conversations
│   ├── dm-chat.ejs           1-1 chat with a user
│   └── 404.ejs
│
└── public/
    ├── css/style.css
    ├── uploads/              Created automatically on first run
    │   ├── posts/            Post images and videos stored here
    │   └── avatars/          Profile avatars stored here
    └── js/
        ├── main.js
        ├── chat.js           Group chat Socket.IO client
        ├── dm.js             DM Socket.IO client
        ├── media-preview.js  Preview files before posting
        └── ai-assistant.js   AI panel streaming client
```

---

## How JWT Auth Works

1. User logs in → server creates an **access token** (expires in 15 min) and a **refresh token** (7 days)
2. Refresh token is saved to the database AND set as an httpOnly cookie
3. Access token is stored in the session for page rendering
4. When the access token expires, the client calls `POST /auth/refresh` to get a new one automatically
5. On logout, the refresh token is deleted from the database — making it permanently invalid

---

## Media Upload

Photos and videos are stored directly on the server inside `public/uploads/`.

- **Post media** — up to 5 files, 50 MB each. Accepted: JPG, PNG, GIF, WEBP, MP4, WEBM, MOV
- **Avatar** — single image, 5 MB max. Accepted: JPG, PNG, WEBP
- Files are given random names to avoid conflicts
- Old avatar is automatically deleted from disk when a new one is uploaded
- All post media is deleted from disk when the post is deleted

---

## Direct Messages (1-1 Chat)

- Visit any user's profile and click **Message**
- Or go to **Messages** in the top navbar
- Messages are stored in MongoDB and loaded on page open
- New messages arrive instantly via Socket.IO (no refresh needed)
- Typing indicator shows when the other person is typing
- Unread message count shown in the conversation list

---

## REST API

Protected with JWT. Get your token from `GET /api/token` after logging in.

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/token` | Get current access token |
| GET | `/api/me` | Your user profile |
| GET | `/api/feed` | Your personalised feed |
| GET | `/api/posts/:id` | Single post |
| POST | `/api/posts/:id/like` | Toggle like on a post |
| POST | `/auth/refresh` | Refresh expired access token |

---

## AI Writing Assistant (optional)

Add your OpenAI API key to `.env`:
```
OPENAI_API_KEY=sk-...
```

Then click **AI Assistant** in the post editor. Actions available:
- Continue Writing
- Improve Writing  
- Shorten Post
- Write Intro Paragraph
- Suggest 5 Titles
- Rewrite in Formal or Casual tone
- Custom free-form instruction

Responses stream live, token by token. After streaming you can Replace, Append, or Copy.

---

## Deployment

### Render (free hosting)
1. Push your project to GitHub
2. Go to render.com → New Web Service → Connect your repo
3. Build Command: `npm install`
4. Start Command: `node app.js`
5. Add your environment variables in the Render dashboard
6. Note: uploaded files are stored on Render's disk — they reset on each deploy. For production, use Cloudinary or S3 instead.

### Local network (share with friends)
1. Find your local IP: run `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
2. Start the app: `npm start`
3. Friends on the same WiFi open: `http://YOUR_LOCAL_IP:3000`
