# CoolStay Design System

## Overview

The **CoolStay Design System** defines the visual language, UI rules, and component standards for the CoolStay web application.  
Its purpose is to ensure **consistency, scalability, accessibility, and backend readiness** across all frontend development.

This design system is intended to be used in a **Next.js + TypeScript + Tailwind CSS + shadcn/ui** environment and is designed to integrate seamlessly with a future **Supabase backend**.

This is not a static UI kit. It is a **living system** that guides how components are built, styled, and connected to data.

---

## Design Philosophy

- **Clarity over cleverness**
- **Server components first**
- **Client components only when interaction is required**
- **No over-engineering**
- **Backend-ready by default**
- **Composable, not monolithic**

If something can be solved with Tailwind utilities or an existing shadcn component, do not reinvent it.

---

## Color System

The primary brand identity uses **shades of blue**, inspired by water, relaxation, and trust.

### Primary Palette

| Token      | Hex       | Usage                            |
| ---------- | --------- | -------------------------------- |
| `blue-900` | `#03045E` | Primary brand, navbar background |
| `blue-800` | `#0077B6` | Primary buttons, active states   |
| `blue-600` | `#00B4D8` | Highlights, links, accents       |
| `blue-300` | `#90E0EF` | Secondary backgrounds            |
| `blue-100` | `#CAF0F8` | Subtle backgrounds, cards        |

### Usage Rules

- **Dark blue (`#03045E`)** is reserved for strong brand anchors (navbar, footer).
- **Mid blues (`#0077B6`, `#00B4D8`)** are used for CTAs and interactive elements.
- **Light blues (`#90E0EF`, `#CAF0F8`)** are used for backgrounds and non-intrusive UI surfaces.
- Avoid introducing new colors unless explicitly approved.

---

## Typography

- Use the default **Next.js + Tailwind font stack** unless otherwise specified.
- Headings should be visually bold but not decorative.
- Text must always meet **WCAG contrast standards** against backgrounds.

---

## Component Standards

### Component Categories

- **Layout Components**

  - Navbar
  - Footer
  - Section wrappers

- **UI Components**

  - Buttons
  - Cards
  - Calendar
  - Modals
  - Popovers

- **Feature Components**
  - Availability Calendar
  - Hero Section
  - CTA Blocks

---

### shadcn/ui Usage

- Use shadcn components as the **base layer**
- Extend styling via Tailwind utilities
- Do not fork or duplicate shadcn components unless necessary

Allowed components include:

- `Button`
- `Card`
- `Popover`
- `Dialog`
- `Calendar`

---

## Component Rules

- Components must be:
  - Typed with TypeScript
  - Reusable
  - Stateless when possible
- No inline mock data inside components
- All data must be passed via props or fetched via the API layer

---

## Backend-Ready Data Design

Even when using mock data, the frontend must behave as if a real backend exists.

### Data Access Rule

All data must go through an API abstraction:
