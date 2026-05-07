# SYNTAX-STORIES
-------


**Syntax Stories** is a dynamic blogging platform built exclusively for developers to share their ideas, insights, and innovations. It fosters a collaborative and creative environment for tech enthusiasts while offering a wide array of features designed to enhance user experience.

## Features
-------


### Authentication and Account Management

- **JWT-based Authentication**: Secure login and signup process.
- **OAuth2 Login**: Integration with Google and GitHub for seamless login.
- **Forgot Password**: 
  - Reset password functionality using email verification via NodeMailer.
  - Validates the existence of the email before sending reset instructions.
- **Account Page**:
  - View user details.
  - Display user's blogs, liked blogs, and followed categories.

### Blogging Capabilities
- **Home Page**:
  - Highlights "Blog of the Day" and "Trending Blogs."
  - Displays the latest blogs along with a complete list of all blogs.
- **Create Blog**: Users can write and publish new blogs.
- **Delete Blog**: Allows users to remove their own blogs.

### Search and Filters
- Advanced search functionality with filters:
  - **Category**
  - **Title**
  - **Programming Language** (e.g., Python, Java)

### Trending and Notifications
- **Trending Page**:
  - Highlights the top 3 trending blogs overall.
  - Displays the top 4 trending blogs for each category.
- **Notifications**:
  - Sends updates to users following specific categories when new blogs are posted.

### Category-Specific Features
- View blogs by category, e.g., clicking "Frontend Development" displays all related blogs.

### Additional Pages
- **About Page**: Information about the platform and its developers.

---

## Technology Stack
-------

- **Frontend**: Vite.js (React)
- **Backend**: Node.js with Express.js
- **Database**: MongoDB
- **Authentication**: JWT and OAuth2 (Google, GitHub)
- **Email Service**: NodeMailer for password reset emails.

---


## Libraries and Dependencies
-------


| Library                 | Version      | Description                                                                |
|-------------------------|--------------|----------------------------------------------------------------------------|
| bcrypt                 | ^5.1.1       | For password hashing and validation.                                        |
| body-parser            | ^1.20.3      | Middleware to parse incoming request bodies.                                |
| busboy                 | ^1.6.0       | Parses form data, especially file uploads.                                  |
| cors                   | ^2.8.5       | Enables Cross-Origin Resource Sharing.                                      |
| crypto                 | ^1.0.1       | Provides cryptographic functionalities.                                     |
| dotenv                 | ^16.4.7      | Loads environment variables from `.env` file.                               |
| express                | ^4.21.2      | Web framework for building APIs.                                            |
| express-session        | ^1.18.1      | Session management middleware for Express.                                  |
| joi                    | ^17.13.3     | Schema validation for input and data.                                       |
| jsonwebtoken           | ^9.0.2       | For issuing and verifying JWT tokens.                                       |
| moment                 | ^2.30.1      | Library for date and time manipulation.                                     |
| mongoose               | ^8.9.0       | MongoDB object modeling for Node.js.                                        |
| multer                 | ^1.4.5-lts.1 | Middleware for handling `multipart/form-data`, for file uploads.            |
| nodemailer             | ^6.9.16      | Module for sending emails.                                                  |
| passport               | ^0.7.0       | Middleware for authentication.                                              |
| passport-github2       | ^0.1.12      | Passport strategy for GitHub OAuth authentication.                          |
| passport-google-oauth20| ^2.0.0       | Passport strategy for Google OAuth 2.0 authentication.                      |
| sharp                  | ^0.33.5      | Image processing library.                                                   |

---


## Installation and Setup
-------


1. **Clone the Repository**:
   ```bash
   git clone https://github.com/thundeerfang/SYNTAX-STORIES
2. **Install Dependencies**:
   ```bash
   cd syntax-stories
   npm install
3. **Environment Variables**: Create a .env file in the root directory and configure the following:
   ```env
      PORT=7373
      GOOGLE_CLOUD_COMPUTING=YOUR-GOOGLE-ID-OUTH
      GOOGLE_CLOUD_SECRET=YOUR-GOOGLE-CLOUD-SECRET
      EMAIL_SERVICE=Gmail
      EMAIL_USER=YOUR-GMAIL-ID
      EMAIL_PASS=YOUR-APP-PASS-GMAIL
      GITHUB_CLIENT_ID=YOUR-GIT-CLOUD-ID
      GITHUB_CLOUD_SECRET=YOUR-GIT-CLOUD-SECRET
      RESET_TOKEN_EXPIRY=3600
      JWT_SECRET=YOUR-JWT-SECRET
      MONGO_CONN=YOUR-MONGO-CONN

4. **Navigate to the Directory**:
  ```bash 
  cd syntax-stories
  
  cd frontend
  npm install
  npm run dev
   cd backend 
  npm install
  npm start
```

5. **Access the Application**: Open your browser and navigate to http://localhost:YOUR-PORT.

## Contact
-------

For questions or feedback, feel free to reach out:

*   **Harshit Kushwah**: [GitHub Profile](https://github.com/thundeerfang)Tech Lead and Full-Stack Developer, Syntax Stories Team

## License
This project is licensed under the MIT License.
