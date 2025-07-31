
# Raseed Backend

An AI-powered assistant backend using **Fastify**, **Google Vertex AI**, and **Google Wallet** APIs. This backend is built with **Fastify**, **TypeScript**, and runs in a lightweight **Docker Alpine** environment.

---

## 🛠 Tech Stack

- **Node.js v20 (Alpine)**
- **Fastify**
- **TypeScript**
- **Google Cloud Vertex AI**
- **Google Vision API**
- **Firebase Admin SDK**
- **Docker**

---

## 📁 Project Structure

```
raseed_backend/
├── src/               # TypeScript source code
├── dist/              # Compiled JavaScript code
├── package.json
├── tsconfig.json
├── Dockerfile
└── .env               # Environment variables (excluded from repo)
```

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/MubbashirAhmed123/raseed-ai-assistant-server.git
cd raseed-ai-assistant-server
```

### 2. Install dependencies

```bash
npm install
```

---

### 3. Google Cloud Authentication

This app uses Google services (Vertex AI, Vision API, Firebase, etc.), so authentication is required.

- Create a [Service Account Key](https://console.cloud.google.com/iam-admin/serviceaccounts)
- Download the JSON key
- Set the environment variable:

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/absolute/path/to/your-key.json"
```

Or use a `.env` file:

```
GOOGLE_APPLICATION_CREDENTIALS=./config/your-key.json
```

> Make sure the `.env` file is included in your `.gitignore`.

---

## 💻 Development

Run the development server with auto-reload:

```bash
npm run dev
```

---

## 🏗️ Build the Project

Compile TypeScript files to JavaScript:

```bash
npm run build
```

---

## 🚢 Run Production Server

Run the compiled production server:

```bash
npm start
```

---

## 🐳 Docker Usage

### Build the Docker Image

```bash
docker build -t raseed-backend .
```

### Run the Docker Container

```bash
docker run -p 3000:3000 \
  -e GOOGLE_APPLICATION_CREDENTIALS=/usr/src/app/config/your-key.json \
  -v /absolute/path/to/your-key.json:/usr/src/app/config/your-key.json \
  raseed-backend
```

> This mounts your service account key into the container and sets the required environment variable.

---

## 📦 Available Scripts

| Script         | Description                         |
|----------------|-------------------------------------|
| `npm run dev`  | Run in development with `nodemon`   |
| `npm run build`| Compile TypeScript to JavaScript    |
| `npm start`    | Start compiled production server     |

---

## 🌐 APIs & SDKs Used

- [`@google-cloud/vertexai`](https://www.npmjs.com/package/@google-cloud/vertexai) - Vertex AI integration
- [`@google-cloud/vision`](https://www.npmjs.com/package/@google-cloud/vision) - Cloud Vision API
- [`@google/genai`](https://www.npmjs.com/package/@google/genai) - Generative AI APIs
- [`firebase`](https://www.npmjs.com/package/firebase) & [`firebase-admin`](https://www.npmjs.com/package/firebase-admin) - Firebase SDKs
- [`googleapis`](https://www.npmjs.com/package/googleapis) - General Google APIs

---

## 🔐 Service Account Permissions

Make sure your service account has the following roles:

- Vertex AI User
- Cloud Vision API User
- Firebase Admin SDK Administrator

Enable the required APIs from the [Google Cloud Console](https://console.cloud.google.com/apis/dashboard).

---


## 🧠 Notes

- Ensure you’ve enabled all required Google Cloud APIs.
- Secure your service account JSON file — never commit it to version control.
- You can use Docker secrets or Google Secret Manager for production credential management.
