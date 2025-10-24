# Environment Setup Guide

## Production Environment Variables

When deploying DailyGoalMap, make sure to configure the following environment variables:

### Required Variables

- `VITE_PUBLIC_URL`: The public-facing URL of your application
  - Development: `http://localhost:8080`
  - Production: Your production domain (e.g., `https://app.dailygoalmap.com`)
  - Staging: Your staging domain (e.g., `https://staging.dailygoalmap.com`)

This variable is used for:
- Constructing notification URLs that work across different environments
- Ensuring push notifications link to the correct domain
- Maintaining consistent URLs in email notifications and other external communications

### Configuration Steps

1. Development:
   ```env
   VITE_PUBLIC_URL=http://localhost:8080
   ```

2. Production (Vercel/Netlify):
   - Go to your deployment platform's environment variables section
   - Add `VITE_PUBLIC_URL` with your production domain
   - Example: `VITE_PUBLIC_URL=https://app.dailygoalmap.com`

3. Staging/Preview:
   - Set up a separate environment variable configuration
   - Use your staging domain
   - Example: `VITE_PUBLIC_URL=https://staging.dailygoalmap.com`

### Verification

After deployment, verify that:
1. Notification links point to the correct domain
2. Push notifications open the correct URL when clicked
3. Email notifications and shared links use the correct domain

### Common Issues

1. If links point to localhost in production:
   - Check if `VITE_PUBLIC_URL` is properly set in your production environment
   - Verify the environment variable is included in your build

2. If links use wrong protocol (http vs https):
   - Ensure `VITE_PUBLIC_URL` includes the correct protocol
   - Always use https:// for production URLs

### Local Development

When developing locally:
1. Create a `.env.local` file in your project root
2. Add: `VITE_PUBLIC_URL=http://localhost:8080`
3. This file should not be committed to version control