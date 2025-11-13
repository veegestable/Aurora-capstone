# Aurora Assets Organization Guide

## 📁 Directory Structure

Your Aurora app now has two asset directories:

```
Aurora1/
├── public/                 # Static assets (served directly)
│   ├── images/            # Public images
│   ├── icons/             # Favicons, PWA icons
│   └── favicon.ico        # Main favicon
├── src/
│   ├── assets/            # Assets imported in code
│   │   ├── images/        # Component images
│   │   ├── icons/         # SVG icons, graphics
│   │   └── logos/         # Aurora branding
```

## 🎯 **When to Use Each Directory**

### **Use `public/` for:**
- **Favicons** (`favicon.ico`, `apple-touch-icon.png`)
- **PWA Icons** (app icons for mobile)
- **Large images** that don't need optimization
- **Assets referenced in HTML** (`index.html`)
- **Files accessed by URL** directly

**Access in code:**
```tsx
// In JSX
<img src="/images/aurora-hero.png" alt="Aurora" />

// In CSS
background-image: url('/images/background.jpg');
```

### **Use `src/assets/` for:**
- **Component images** used in React components
- **SVG icons** imported as React components
- **Logos** used in multiple components
- **Images needing optimization** by Vite

**Access in code:**
```tsx
// Import and use
import auroraLogo from '../assets/logos/aurora-logo.svg';
import heroImage from '../assets/images/hero.png';

// In JSX
<img src={auroraLogo} alt="Aurora Logo" />
<img src={heroImage} alt="Mental Health" />
```

## 🎨 **Recommended Asset Types for Aurora**

### **Logos (`src/assets/logos/`)**
```
aurora-logo.svg          # Main logo (SVG for scalability)
aurora-logo-dark.svg     # Dark theme version
aurora-logo-light.svg    # Light theme version
aurora-icon.svg          # Icon only (no text)
aurora-wordmark.svg      # Text only logo
```

### **Icons (`src/assets/icons/`)**
```
mood-happy.svg           # Emotion icons
mood-sad.svg
mood-angry.svg
mood-calm.svg
calendar-icon.svg        # Feature icons
notification-icon.svg
user-icon.svg
settings-icon.svg
```

### **Images (`src/assets/images/`)**
```
hero-mental-health.png   # Landing page hero
onboarding-1.png        # Onboarding screens
onboarding-2.png
counselor-avatar.png    # Default avatars
student-avatar.png
mood-calendar-bg.png    # Background images
```

### **Public Icons (`public/icons/`)**
```
favicon.ico             # Browser favicon
apple-touch-icon.png    # iOS home screen
android-chrome-192x192.png  # Android icons
android-chrome-512x512.png
pwa-icon-192.png        # PWA icons
pwa-icon-512.png
```

## 🛠️ **Usage Examples**

### **In Components:**
```tsx
// Header Component
import auroraLogo from '../assets/logos/aurora-logo.svg';
import userIcon from '../assets/icons/user-icon.svg';

export const Header = () => (
  <header>
    <img src={auroraLogo} alt="Aurora Mental Health" className="h-8" />
    <img src={userIcon} alt="Profile" className="h-6 w-6" />
  </header>
);
```

### **In CSS/Tailwind:**
```css
/* For public assets */
.hero-section {
  background-image: url('/images/mental-health-bg.jpg');
}

/* For imported assets (use CSS modules or Tailwind) */
.custom-bg {
  background-image: url('../assets/images/pattern.svg');
}
```

### **Dynamic Imports:**
```tsx
// Lazy load large images
const [heroImage, setHeroImage] = useState('');

useEffect(() => {
  import('../assets/images/hero-large.png').then(module => {
    setHeroImage(module.default);
  });
}, []);
```

## 📱 **Favicon Setup**

Update your `index.html`:
```html
<link rel="icon" type="image/svg+xml" href="/icons/aurora-icon.svg" />
<link rel="icon" type="image/png" href="/icons/favicon.png" />
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
```

## 🎯 **Asset Optimization Tips**

### **Image Formats:**
- **SVG**: Logos, icons, simple graphics
- **PNG**: Screenshots, complex images with transparency
- **JPG**: Photos, complex images without transparency
- **WebP**: Modern format for better compression

### **Size Guidelines:**
- **Logos**: SVG preferred, or PNG at 2x resolution
- **Icons**: 24x24, 32x32, 48x48 pixels
- **Hero Images**: Optimize to < 200KB
- **Favicons**: 16x16, 32x32, 48x48 pixels

## 🚀 **Implementation Checklist**

- [ ] Add Aurora logo variations (light/dark themes)
- [ ] Create emotion icons for mood tracking
- [ ] Add onboarding/hero images
- [ ] Set up favicons and PWA icons
- [ ] Add default user avatars
- [ ] Create mental health themed illustrations
- [ ] Add loading states/placeholder images
- [ ] Optimize all images for web

## 💡 **Pro Tips:**

1. **Use consistent naming**: `aurora-logo-dark.svg` not `logo_dark_version.svg`
2. **Optimize images**: Use tools like TinyPNG or Squoosh
3. **Create 2x versions**: For high-DPI displays
4. **Use SVGs when possible**: Scalable and small file size
5. **Test on mobile**: Ensure images look good on all devices

Your Aurora mental health app will look professional and cohesive with proper asset organization! 🎨