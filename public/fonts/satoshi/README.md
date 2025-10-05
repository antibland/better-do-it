# Satoshi Font Files

This directory contains the Satoshi font family for the Better Do It application.

## Required Font Files

Place the following Satoshi font files in this directory (`/public/fonts/satoshi/`):

### Primary Files (Variable Fonts - Recommended)

- `Satoshi-Variable.woff2` - Supports weights 300-900
- `Satoshi-VariableItalic.woff2` - Supports weights 300-900 italic

### Essential Fallback Files (WOFF2 format)

- `Satoshi-Regular.woff2`
- `Satoshi-Italic.woff2`
- `Satoshi-Medium.woff2`
- `Satoshi-Bold.woff2`

### Optional Fallback Files (WOFF format - for older browsers)

- `Satoshi-Regular.woff`
- `Satoshi-Medium.woff`
- `Satoshi-Bold.woff`

## Font File Types Explained

### WOFF2 (Web Open Font Format 2)

- **Best choice for modern browsers**
- Excellent compression (30% smaller than WOFF)
- Supported by 95%+ of browsers
- Use for all font weights

### WOFF (Web Open Font Format)

- Good compression and browser support
- Supported by 99%+ of browsers
- Use as fallback for older browsers
- Only needed for critical weights (Regular, Medium, Bold)

### TTF (TrueType Font)

- Universal compatibility
- Larger file size
- Not recommended for web use (use WOFF2 instead)
- Only include if you need maximum compatibility

### EOT (Embedded OpenType)

- **Not recommended** - legacy format for old IE browsers
- Modern browsers don't use this format
- Skip this format entirely

## Directory Structure

```
/public/fonts/satoshi/
├── README.md
├── Satoshi-Light.woff2
├── Satoshi-LightItalic.woff2
├── Satoshi-Regular.woff2
├── Satoshi-Italic.woff2
├── Satoshi-Medium.woff2
├── Satoshi-MediumItalic.woff2
├── Satoshi-Bold.woff2
├── Satoshi-BoldItalic.woff2
├── Satoshi-Black.woff2
├── Satoshi-BlackItalic.woff2
└── Satoshi-Regular.woff (optional fallback)
```

## Implementation Notes

- Fonts are configured in `/lib/fonts.ts` using Next.js `localFont`
- **Path Resolution**: Font paths are relative to where `localFont` is called (`lib/` directory)
- Optimized loading with `display: 'swap'` for better performance
- Comprehensive fallback fonts for graceful degradation
- CSS variables (`--font-satoshi`) for easy integration
- Font feature settings enabled for enhanced typography

## Next.js Best Practice

**Font files should be in `public/fonts/` but referenced with relative paths from the font configuration file:**

- Font config: `/lib/fonts.ts`
- Font files: `/public/fonts/satoshi/`
- Font paths: `../public/fonts/satoshi/filename.woff2` (relative to `lib/`)

## Performance Optimization

- **Variable fonts**: Primary configuration uses variable fonts for optimal performance
- **WOFF2 format**: Use WOFF2 format for all fonts (95%+ browser support)
- **Fallback fonts**: Individual font files provided as fallbacks for older browsers
- **Preload critical fonts**: Critical fonts are automatically preloaded by Next.js
- **Font display swap**: Prevents invisible text during font load

## Testing

After adding the font files:

1. Run `npm run dev` to start the development server
2. Check browser dev tools → Network tab to verify font loading
3. Inspect elements to confirm Satoshi font is applied
4. Test fallback fonts by blocking font requests in dev tools

## Font Weights Available

- **300 (Light)**: For subtle text and captions
- **400 (Regular)**: Default body text
- **500 (Medium)**: Emphasized text and buttons
- **700 (Bold)**: Headings and important text
- **900 (Black)**: Display text and logos

## License

Ensure you have proper licensing for Satoshi font usage in your application.
