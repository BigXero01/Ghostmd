// Single shared demo user — no login required.
// All API routes use this constant instead of extracting a user from a JWT.
export const DEMO_USER_ID = process.env.DEMO_USER_ID ?? 'demo';
