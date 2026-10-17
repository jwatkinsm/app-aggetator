# Social Media Dashboard

## Overview

Social Media Dashboard is a small Node.js and browser application for viewing social posts and engagement data in one place. It demonstrates JavaScript array methods, asynchronous API requests, recursive traversal of nested post media, and dynamic HTML rendering.

The Overview page shows summary metrics, a post feed, and an Instagram panel. The separate Analytics page summarizes interactions by platform and type, displays the sentiment labels supplied with posts, and ranks the top posts. Both pages refresh live feed data every five seconds.

The analytics describe the posts currently returned by the live feed; they are not historical reports. Without configured social API credentials, live sources return no posts. The Overview summary cards use sample feed data.

## Run locally

### Requirements

- Node.js 18 or newer (the server uses the built-in `fetch` API)
- npm
- Optional access credentials for the social APIs you want to connect

### Install and start

```sh
npm install
npm start
```

Open [http://localhost:8085](http://localhost:8085) in a browser. The Analytics page is available at [http://localhost:8085/analytics.html](http://localhost:8085/analytics.html).


## Social API configuration

Create a `.env` file in the project root and add credentials for the platforms you want to connect. Each platform is optional; leave out credentials for platforms you do not use.

```dotenv
PORT=8085
INSTAGRAM_ACCESS_TOKEN=your_instagram_access_token
INSTAGRAM_ACCOUNT_ID=your_instagram_account_id
FACEBOOK_PAGE_ACCESS_TOKEN=your_facebook_page_access_token
FACEBOOK_PAGE_ID=your_facebook_page_id
LINKEDIN_ACCESS_TOKEN=your_linkedin_access_token
LINKEDIN_ORGANIZATION_ID=your_linkedin_organization_id
```

Use valid tokens with the permissions required by each platform and the configured account. For example, Facebook Page post access may require `pages_read_user_content` or approved Page Public Content Access. API access and available fields depend on the platform, app configuration, and token permissions.

Keep `.env` private. Environment files are ignored by Git; do not commit or share access tokens.

## API routes

| Route | Description |
| --- | --- |
| `GET /api/health` | Returns a basic service health response. |
| `GET /api/feed` | Returns sample posts and overview metrics. |
| `GET /api/social/live` | Fetches posts from configured Instagram, Facebook, and LinkedIn sources and includes source status. |
| `GET /api/feed/live` | Alias for the live social feed route. |
| `GET /api/instagram` | Returns recent Instagram posts for the Instagram panel. |

The server tolerates individual live-source failures so available platforms can still provide posts. Check the source status in `/api/social/live` when a platform is empty or unavailable.

## Development notes

- **Server:** Node.js, Express, and dotenv.
- **Client:** HTML, CSS, and vanilla JavaScript

- **Testing:** run the built-in Node.js test suite with:

## Demonstration video

[https://youtu.be/-cozvob2fHI](https://youtu.be/-cozvob2fHI)

## Useful references

- [Node.js command-line output](https://nodejs.org/en/learn/command-line/output-to-the-command-line-using-nodejs)
- [Express documentation](https://expressjs.com/)
- [MDN: Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array)
- [MDN: Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
- [Meta Graph API documentation](https://developers.facebook.com/docs/graph-api/)
- [Instagram Platform documentation](https://developers.facebook.com/docs/instagram-platform/)
- [LinkedIn API documentation](https://learn.microsoft.com/en-us/linkedin/shared/api-guide/concepts)

# AI Disclousure

I used AI tools as a learning and reference resource during this project. I used them mainly to brainstorm design ideas, clarify syntax questions, review logic, API data retrieiving and point me toward useful documentation when I got stuck.

When I received suggestions, I did not rely on them blindly. I reviewed the ideas carefully, rewrote code in my own style, adjusted variable and method names to match my project, and made sure the final solution fit naturally into my existing structure.

Using AI in this way helped me better understand programming concepts while still making sure I could explain the code, justify my design choices, and demonstrate my understanding during the video walkthrough.

## Future improvements

- add average post vs current post line graph
- Replace sample sentiment labels with a real sentiment analysis source and clearly communicate its confidence.
- add in feeds page to show each apis own column
- Improve API diagnostics so each platform's permission and token errors are easier to troubleshoot.
