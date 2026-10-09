# ProDUS Component Structure

## 📁 Organization

```
src/
├── components/          # Reusable components
│   ├── AppHeader.vue    # App header
│   ├── AppButton.vue    # Generic button
│   ├── InfoCard.vue     # Information card
│   ├── MenuButton.vue   # Menu button
│   └── WelcomeBanner.vue # Welcome banner
├── styles/              # Styles and themes
│   ├── theme.ts        # Color, spacing, and other variables
│   └── global.ts       # Global styles
├── composables/         # Reusable logic
│   └── useAuth.ts      # Authentication and user data
├── config/             # Configuration
│   └── roles.ts        # Role definitions
└── views/              # Views/pages
    └── HomeView.vue    # Home page
```

## 🎨 Available Components

### AppHeader
Standard application header.

```vue
<AppHeader 
  title="ProDUS" 
  subtitle="Hours Log"
  user-role="Administrator"
  user-name="John Doe"
  @logout="handleLogout"
/>
```

**Props:**
- `title`: string - Main title
- `subtitle`: string - Subtitle
- `userRole`: string - User role
- `userName`: string - User name
- **Events:** `@logout`

---

### AppButton
Reusable button with variants.

```vue
<AppButton variant="primary" size="md">
  Submit
</AppButton>
```

**Props:**
- `variant`: 'primary' | 'secondary' | 'success' | 'danger' (default: 'primary')
- `size`: 'sm' | 'md' | 'lg' (default: 'md')
- `disabled`: boolean (default: false)

---

### InfoCard
Card for displaying static information.

```vue
<InfoCard 
  label="Logged Hours"
  value="24" 
/>
```

**Props:**
- `label`: string - Label
- `value`: string | number - Value to display

---

### MenuButton
Menu button with an icon and label.

```vue
<MenuButton 
  icon="⏱️" 
  label="Hours Log"
  @click="handleClick"
/>
```

**Props:**
- `icon`: string - Emoji or icon
- `label`: string - Button label
- **Events:** `@click`

---

### WelcomeBanner
Welcome banner with a gradient.

```vue
<WelcomeBanner 
  title="Welcome, John"
  subtitle="Access your administrator tools"
/>
```

**Props:**
- `title`: string - Title
- `subtitle`: string - Subtitle

## 🎨 Color Theme

Defined in `src/styles/theme.ts`:

```typescript
colors = {
  primary: '#0052a3',
  primaryDark: '#003d7a',
  primaryLight: '#0066cc',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  // ... more colors
}
```

## 📐 Spacing

```typescript
spacing = {
  xs: '0.5rem',   // 8px
  sm: '1rem',     // 16px
  md: '1.5rem',   // 24px
  lg: '2rem',     // 32px
  xl: '3rem',     // 48px
}
```

## 🔄 Composables

### useAuth
Handles authentication and user data.

```typescript
const { 
  userRole,      // Current role
  userName,      // User name
  isAuthenticated, // Is authenticated?
  logout,        // Log out
  checkPermission, // Check permission
  checkFeature   // Check feature
} = useAuth()
```

## ✅ Best Practices

1. **Do not duplicate styles**: Use base components instead of repeating styles
2. **Use the theme**: Import colors from `theme.ts` instead of hardcoding them
3. **Small components**: Components should be simple and focused
4. **Well-typed props**: Always use TypeScript for props
5. **Clearly named events**: Follow the Vue convention for event names

## 🚀 Adding a New Component

1. Create the file in `src/components/`
2. Use colors and spacing from `theme.ts`
3. Export it from the main file
4. Import it into the view where you need it
5. Document its props in this file
