# Vue 3 + Vite

This template should help get you started developing with Vue 3 in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar)

# Fruit Kingdom

## Environment Variables

To run this project, you will need to create a `.env` file in the root directory with the following variables:

```
# RevenueCat Configuration
VITE_REVENUECAT_API_KEY=your_revenuecat_api_key_here

# App Configuration
VITE_APP_NAME=Fruit Kingdom
VITE_APP_VERSION=1.0.0
```

Replace `your_revenuecat_api_key_here` with your actual RevenueCat API key.

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

## Building for Production

```bash
# Build for production
pnpm build

# Deploy to iOS
pnpm deploy:ios

# Deploy to Android
pnpm deploy:android
```
