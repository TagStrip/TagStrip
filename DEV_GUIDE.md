# TagStrip Development Guide

## 🔥 Hot-Reload Development Server

### Quick Start

```bash
npm run dev
```

This starts a Vite development server with:
- **Hot Module Reloading (HMR)** - Changes auto-reload in browser
- **Source maps** - Debug with original source code
- **Fast refresh** - See changes instantly without full reload
- **Network access** - Test on mobile while coding on PC

### Accessing the Dev Server

The server displays URLs like:
```
📱 Local:   http://localhost:3000
📱 Network: http://192.168.0.181:3000
```

- **Local URL**: Access from the same machine (PC/laptop)
- **Network URL**: Access from mobile device on same WiFi

### Development Workflow

1. **Start dev server** on your PC:
   ```bash
   npm run dev
   ```

2. **Open on mobile**:
   - Connect mobile to same WiFi as PC
   - Open the Network URL (e.g., `http://192.168.0.181:3000`)
   - Grant camera permissions

3. **Edit code** on your PC:
   - Modify files in `src/` directory
   - Save the file
   - Mobile browser auto-reloads with changes

4. **Test immediately**:
   - Scanner updates with new logic
   - Generator uses new encoding
   - No need to rebuild or refresh manually

### What Gets Hot-Reloaded?

✅ **Auto-reloads on save:**
- `src/core/*.js` - Encoder, decoder, CRC logic
- `src/scanner/*.js` - Scanner pipeline, locator, binarization
- `demo.html` - UI and integration code
- `src/index.js` - Public API

⚠️ **Requires manual refresh:**
- `vite.config.js` - Build configuration
- `package.json` - Dependencies

## Development vs Production Mode

### Development Mode (`npm run dev`)

**Characteristics:**
- Imports from `src/` directly (no build step)
- Hot Module Reloading enabled
- Source maps for debugging
- Fast startup (~100ms)
- Code changes reflect instantly
- Verbose console logging

**Best for:**
- Active development
- Mobile testing while coding
- Debugging scanner issues
- Rapid iteration

**Auto-detected by:**
```javascript
import.meta.env.DEV === true
```

### Production Mode (`npm run demo`)

**Characteristics:**
- Uses compiled `dist/` builds
- Optimized and minified
- Production error handling
- Slower startup (build + serve)
- No hot reloading

**Best for:**
- Final testing
- Performance validation
- Release candidates

## Typical Development Session

### Scenario: Debugging Scanner Logic

1. **Start dev server:**
   ```bash
   npm run dev
   ```

2. **Open on mobile:**
   - Navigate to network URL
   - Start camera
   - Position a printed tag

3. **Edit scanner code:**
   - Open `src/scanner/locator.js` on PC
   - Modify guard detection threshold:
     ```javascript
     // Before
     const threshold = max * 0.5;
     
     // After (test different value)
     const threshold = max * 0.4;
     ```
   - Save file

4. **See results immediately:**
   - Mobile browser auto-reloads
   - Scanner uses new threshold
   - Test if detection improved

5. **Iterate quickly:**
   - Try different values
   - Check console output
   - Fine-tune algorithm

### Scenario: Adding New Feature

1. **Start dev server** and open on mobile

2. **Add feature** to encoder (PC):
   ```javascript
   // src/core/encoder.js
   export function encodeWithChecksum(id, variant) {
     const tag = encode(id, variant);
     const checksum = computeChecksum(tag);
     return tag + checksum;
   }
   ```

3. **Update demo.html** (PC):
   ```javascript
   // Import new function
   const { encodeWithChecksum } = await import('./src/core/encoder.js');
   
   // Use in generator
   const tag = encodeWithChecksum(payload, variant);
   ```

4. **Test on mobile:**
   - Changes auto-reload
   - Generate tag with new feature
   - Verify output

## Advanced Tips

### Mobile Console Access

**Chrome DevTools for Android:**
1. Connect Android via USB
2. Enable USB debugging
3. Open `chrome://inspect` on PC
4. Select mobile browser tab
5. View console, network, etc.

**Safari Web Inspector (iOS):**
1. Enable Web Inspector on iPhone (Settings > Safari > Advanced)
2. Connect iPhone via USB
3. Open Safari on Mac > Develop > [Your iPhone]
4. Select the page
5. Inspector shows console output

### Performance Profiling

The dev server shows timing info:
```
[VITE] page reload demo.html
[VITE] hmr update /src/scanner/locator.js
```

Monitor in browser:
- Network tab - see HMR updates
- Performance tab - profile scanner
- Console - check timing logs

### Testing Different Devices

Run dev server once, access from multiple devices:
- iPhone on `http://192.168.0.181:3000`
- Android on same URL
- iPad on same URL
- All get live updates simultaneously

### Debugging HMR Issues

If hot reload stops working:

1. **Check console** for errors:
   ```
   [vite] error updating module
   ```

2. **Restart dev server**:
   ```bash
   Ctrl+C
   npm run dev
   ```

3. **Hard refresh browser**:
   - Desktop: `Ctrl+Shift+R` or `Cmd+Shift+R`
   - Mobile: Force close browser, reopen

4. **Clear Vite cache**:
   ```bash
   rm -rf node_modules/.vite
   npm run dev
   ```

### Source Maps

Vite includes source maps by default. In browser DevTools:
- Error stack traces show original line numbers
- Set breakpoints in original source
- Step through unminified code

## npm Scripts Comparison

| Script | Mode | Port | HMR | Build | Best For |
|--------|------|------|-----|-------|----------|
| `npm run dev` | Development | 3000 | ✅ Yes | ❌ No | Active coding with mobile testing |
| `npm run demo` | Production | 8080 | ❌ No | ✅ Yes | Final testing before release |
| `npm run serve` | Production | 8080 | ❌ No | Uses existing | Quick production server |

## Common Development Tasks

### Add New CRC Variant

1. Edit `src/core/constants.js`:
   ```javascript
   export const ULTRA_LONG_TAG = {
     TOTAL_BITS: 36,
     CRC_POLYNOMIAL: 0b100101,
     // ...
   };
   ```

2. Save → Auto-reload

3. Test on mobile immediately

### Modify Scanner Threshold

1. Edit `src/scanner/binarize.js`:
   ```javascript
   export function binarizeOtsu(grayscale) {
     // Adjust threshold calculation
     const threshold = findOtsuThreshold(histogram, grayscale.length) * 0.9;
     // ...
   }
   ```

2. Save → Auto-reload

3. Scan tag → See different binarization

### Update UI

1. Edit `demo.html`:
   ```html
   <button id="start-scan-btn" class="btn btn-primary">
     🎥 Start Scanning
   </button>
   ```

2. Save → Auto-reload

3. See new button text

## Troubleshooting

### Port Already in Use

```bash
# Dev server auto-selects next available port
# If 3000 is busy, tries 3001, 3002, etc.
```

Check which port is actually used in the startup logs.

### Mobile Can't Connect

1. **Check WiFi**: Ensure same network
2. **Check firewall**: Allow port 3000
3. **Use IP directly**: Don't use hostname
4. **Try HTTPS**: Some features require secure context

### Changes Not Reflecting

1. **Check file saved**: Ensure Ctrl+S
2. **Check console**: Look for HMR errors
3. **Hard reload**: Force refresh browser
4. **Restart server**: `Ctrl+C` then `npm run dev`

### Camera Not Working on Network URL

Some browsers require HTTPS for camera on network URLs:
- Use `localhost` with port forwarding, or
- Set up HTTPS with self-signed cert, or
- Use Chrome flags for insecure origins

## Best Practices

✅ **Do:**
- Keep dev server running during development
- Test on mobile frequently
- Use browser DevTools for debugging
- Check console output on both PC and mobile
- Save files incrementally for quick feedback

❌ **Don't:**
- Edit `dist/` files (they're overwritten on build)
- Commit `node_modules/` or `dist/` to git
- Run `npm run build` during active development
- Test only on desktop (scanner needs camera)

## Performance Tips

### Fast HMR Updates

- Edit one file at a time
- Avoid large file changes
- Use code splitting for large features

### Mobile Performance

- Use Chrome DevTools remote debugging
- Check frame rates in scanner
- Monitor memory usage
- Test on older devices

## Summary

```bash
# Start development server (hot reload)
npm run dev

# Build and serve production version
npm run demo

# Run tests
npm test

# Build only (without server)
npm run build
```

Happy developing! 🚀📱
