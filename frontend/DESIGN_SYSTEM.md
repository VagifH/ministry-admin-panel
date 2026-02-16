# Ministry Admin Panel - Design System

## Overview
This design system is inspired by Microsoft Fluent Design and provides a consistent, professional UI for the Ministry Admin Panel.

## Design Tokens

### Colors

#### Background
- **Primary**: `#fafafa` - Main app background
- **Secondary**: `#ffffff` - Card/panel background
- **Tertiary**: `#f3f2f1` - Hover states, disabled states

#### Text
- **Primary**: `#323130` - Headings, important text
- **Secondary**: `#605e5c` - Body text, labels
- **Muted**: `#8a8886` - Placeholder, disabled text

#### Brand/Accent
- **Primary**: `#0078d4` - Primary actions, links
- **Hover**: `#106ebe` - Hover state for primary
- **Light**: `#deecf9` - Light background for accents

#### Semantic Colors
- **Success**: `#107c10` - Successful operations
- **Warning**: `#ffaa44` - Warnings
- **Error**: `#d13438` - Errors, destructive actions
- **Info**: `#0078d4` - Informational messages

#### Status Colors
- **Draft**: `#8a8886`
- **Submitted**: `#0078d4`
- **Producing**: `#8764b8`
- **Review**: `#ffaa44`
- **Scheduled**: `#107c10`
- **Published**: `#498205`
- **Rejected**: `#d13438`

### Typography

#### Font Family
- **Primary**: `'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, sans-serif`
- **Tailwind class**: `font-fluent`

#### Font Sizes
- **XS**: `12px` - Small labels, captions
- **SM**: `14px` - Form labels, secondary text
- **Base**: `16px` - Body text
- **LG**: `18px` - Subheadings
- **XL**: `20px` - Section headings
- **2XL**: `24px` - Page headings

#### Font Weights
- **Normal**: `400` - Body text
- **Medium**: `500` - Labels
- **Semibold**: `600` - Headings
- **Bold**: `700` - Emphasis

### Spacing Scale

- **XS**: `4px` - Tight spacing
- **SM**: `8px` - Default gap between elements
- **MD**: `12px` - Form field spacing
- **LG**: `16px` - Card padding
- **XL**: `24px` - Section padding
- **2XL**: `32px` - Large section spacing

**Tailwind classes**: `space-ministry-{size}` or direct values `gap-1.5` (6px), `gap-2` (8px)

### Border Radius

- **SM**: `4px` - Badges, small elements
- **MD**: `8px` - Standard (buttons, inputs, cards)
- **LG**: `12px` - Large cards, dialogs

**Tailwind class**: `rounded-ministry` (8px)

### Shadows

- **Card**: `0 1.6px 3.6px 0 rgba(0, 0, 0, 0.132)` - Standard cards
- **Dialog**: `0 6.4px 14.4px 0 rgba(0, 0, 0, 0.132)` - Modals, dialogs
- **SM**: `0 1px 2px 0 rgba(0, 0, 0, 0.05)` - Subtle elevation

**Tailwind classes**: `shadow-ministry-card`, `shadow-ministry-dialog`

## Component Patterns

### Buttons

#### Heights
- **SM**: `32px` (`h-8`)
- **MD**: `36px` (`h-9`) - Default
- **LG**: `40px` (`h-10`)

#### Variants

**Primary**
```jsx
<Button className="bg-ministry-brand-primary hover:bg-ministry-brand-hover text-white h-9 px-4 rounded-ministry">
  Primary Action
</Button>
```

**Secondary (Outline)**
```jsx
<Button className="border border-ministry-border-default hover:bg-ministry-bg-tertiary text-ministry-text-primary h-9 px-4 rounded-ministry">
  Secondary Action
</Button>
```

**Danger**
```jsx
<Button className="bg-ministry-status-error hover:bg-[#a4262c] text-white h-9 px-4 rounded-ministry">
  Delete
</Button>
```

### Inputs

#### Standard Input
```jsx
<Input className="h-9 px-3 border border-ministry-border-default rounded-ministry focus:ring-2 focus:ring-ministry-brand-primary" />
```

#### Height
- **Default**: `36px` (`h-9`)

#### States
- **Default**: `border-ministry-border-default`
- **Focus**: `focus:ring-2 focus:ring-ministry-brand-primary`
- **Error**: `border-ministry-status-error`

### Cards

```jsx
<div className="bg-ministry-bg-secondary rounded-ministry border border-ministry-border-default shadow-ministry-card p-ministry-lg">
  Card content
</div>
```

### Modals/Dialogs

#### Sizes
- **SM**: `480px`
- **MD**: `560px`
- **LG**: `760px` - Default for forms
- **XL**: `960px`

#### Structure
```jsx
<DialogContent className="max-w-[760px] bg-ministry-bg-secondary rounded-ministry p-0">
  <DialogHeader className="px-6 pt-6 pb-4 border-b border-ministry-border-default">
    <DialogTitle>Modal Title</DialogTitle>
  </DialogHeader>
  <div className="px-6 py-4">
    Content
  </div>
  <DialogFooter className="px-6 py-4 border-t border-ministry-border-default flex justify-end gap-2">
    <Button variant="outline">Cancel</Button>
    <Button>Confirm</Button>
  </DialogFooter>
</DialogContent>
```

### Tables

```jsx
<div className="bg-ministry-bg-secondary rounded-ministry border border-ministry-border-default">
  <Table>
    <TableHeader className="border-b border-ministry-border-default">
      <TableRow>
        <TableHead className="text-ministry-text-primary font-semibold">Header</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow className="border-b border-ministry-border-default hover:bg-ministry-bg-tertiary">
        <TableCell className="text-ministry-text-primary">Cell</TableCell>
      </TableRow>
    </TableBody>
  </Table>
</div>
```

### Badges

```jsx
<Badge className="bg-ministry-status-{status} text-white rounded-ministry-sm px-2 py-1 text-xs">
  Status
</Badge>
```

## Layout Patterns

### Sidebar
- **Width**: `224px` (56 × 4)
- **Background**: `ministry-bg-secondary`
- **Border**: `border-r border-ministry-border-default`

### Page Structure
```jsx
<div className="p-8">
  {/* Page Header */}
  <div className="mb-6">
    <h1 className="text-2xl font-semibold text-ministry-text-primary">Page Title</h1>
    <p className="text-sm text-ministry-text-secondary mt-1">Description</p>
  </div>
  
  {/* Content Card */}
  <div className="bg-ministry-bg-secondary rounded-ministry border border-ministry-border-default shadow-ministry-card">
    Content
  </div>
</div>
```

## Icon + Label Spacing

For buttons with icons:
- **Gap**: `6px` (`gap-1.5`)
- Use flexbox: `flex items-center gap-1.5`

```jsx
<Button className="flex items-center gap-1.5">
  <Icon size={16} />
  Label
</Button>
```

## Responsive Breakpoints

- **SM**: `640px`
- **MD**: `768px`
- **LG**: `1024px`
- **XL**: `1280px`

## Transitions

- **Fast**: `150ms` - Hover states
- **Normal**: `250ms` - Default
- **Slow**: `350ms` - Complex animations

**Default easing**: `cubic-bezier(0.4, 0.0, 0.2, 1)`

## Usage Examples

### Import Design Tokens
```javascript
import { designTokens, componentClasses } from '@/styles/designTokens';

// Use in components
const buttonStyle = componentClasses.button.primary;
const primaryColor = designTokens.colors.accent.primary;
```

### Tailwind Classes
```jsx
// Colors
className="bg-ministry-bg-primary text-ministry-text-primary border-ministry-border-default"

// Spacing
className="p-ministry-lg gap-ministry-md"

// Typography
className="text-ministry-base font-medium"

// Status badges
className="bg-ministry-status-draft text-white"
```

## Best Practices

1. **Always use design tokens** instead of hardcoded values
2. **Prefer Tailwind classes** for consistency
3. **Use semantic color names** (e.g., `ministry-status-error` instead of `#d13438`)
4. **Maintain 8px spacing scale** for vertical rhythm
5. **Use 36px (`h-9`) height** for all interactive elements
6. **Border radius is 8px** for most components
7. **Keep modals between 560-760px** width
8. **Use `gap-1.5` (6px)** for icon-label spacing in buttons

## File Structure

```
src/
├── styles/
│   └── designTokens.js       # Design system tokens
├── components/
│   └── ui/                   # Reusable UI components (shadcn)
└── tailwind.config.js        # Tailwind configuration with tokens
```

## Migration Guide

When refactoring existing code:

1. Replace hardcoded colors:
   - `#fafafa` → `ministry-bg-primary`
   - `#0078d4` → `ministry-brand-primary`
   - `#e5e5e5` → `ministry-border-default`

2. Replace hardcoded spacing:
   - `p-4` → `p-ministry-lg` (if 16px)
   - `gap-2` → `gap-ministry-sm` (if 8px)

3. Standardize component heights:
   - All buttons/inputs → `h-9` (36px)

4. Use consistent border radius:
   - `rounded-lg` → `rounded-ministry` (8px)

## Support

For questions or updates to the design system, refer to:
- Design tokens: `/src/styles/designTokens.js`
- Tailwind config: `/tailwind.config.js`
- This documentation: `/DESIGN_SYSTEM.md`
