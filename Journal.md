# Project Journal

## Product Name
Abstract

Abstract is a simple order management app for small business owners.
The goal is to help business owners keep track of their orders, customers, payments, and basic business performance without relying on WhatsApp, notes, or memory.

---

## Product Goal
Help a business owner answer these questions quickly:
- What orders do I have?
- What orders are still being prepared?
- What has been delivered?
- Who has not paid?
- Who are my customers?
- How much have I made?
- What needs my attention?

The product should stay simple and easy to understand.

---

## Current MVP

### Dashboard
- Orders today
- Unpaid orders
- Overdue orders
- Order status overview
- Recent orders
- Quick Add Order

### Orders
- Add order
- Edit order
- Delete order
- Search orders
- Filter orders
- Mark order as paid
- Change order status
  - New
  - Preparing
  - Ready
  - Delivered

### Customers
- Customer list
- Search customers
- Customer details
- Customer order history
- Total spent
- Outstanding balance

### Reports
- Total sales
- Paid amount
- Unpaid amount
- Number of orders
- Orders by status
- Sales/order chart
- Date filters

### Settings
- Business information
- Owner information
- Currency
- Basic order settings
- Data management

---

## Design Direction
The product should feel:
- Simple
- Calm
- Clear
- Practical
- Easy to understand

Use the existing design system.
Do not introduce unnecessary visual styles.

Existing design language:
- Cream/off-white background
- Navy primary color
- Existing typography
- Existing borders
- Existing border radius
- Existing button styles
- Existing input styles
- Existing status colors

The goal is to improve layout and usability without changing the identity of the product.

---

## Navigation
The application has five main sections:
1. Dashboard
2. Orders
3. Customers
4. Reports
5. Settings

The sidebar is collapsible.

Collapsed:
- Icons only

Expanded:
- Icons + labels

Each navigation item must lead to a real interface.
Do not create navigation items that are only decorative.

---

## Data Rules
All sections must use the same underlying data.

For example:
When an order is created:
Order → Dashboard
Order → Customer
Order → Reports

When an order is marked as paid:
- Unpaid count decreases
- Customer outstanding balance updates
- Reports update
- Dashboard updates

When an order status changes:
- The new status appears everywhere

Do not create separate fake data for different pages.
There should be one source of truth.

---

# Development Journal

## 2026-09-11

### What I Built
- Initial order management interface
- Dashboard statistics
- Add order form
- Order search
- All / Unpaid / Paid filters
- Order status sections

### Problem I Found
The first interface looked more like a form than a dashboard.
The content was too narrow and centered, and there was too much empty space.
The order sections were stacked vertically instead of making good use of the available screen.

### Decision
Redesign the layout as a proper dashboard while keeping the existing design system.
The dashboard should focus on:
- Business overview
- Orders
- Unpaid orders
- Overdue orders
- Quick actions

The Add Order form should not dominate the entire dashboard.

---

## Next Task
Build the complete application structure:
- Collapsible sidebar
- Dashboard page
- Orders page
- Customers page
- Reports page
- Settings page

Make sure all pages use the same data.

---

## Future Ideas
These are NOT part of the current MVP.
- WhatsApp order capture
- AI bookkeeping
- Bank connection
- Expense tracking
- Inventory
- Invoicing
- Notifications
- Advanced analytics
- Multiple staff accounts
- Automated customer messages

Do not build these unless explicitly requested.

---

## Important Development Rules
1. Do not change the existing design system unnecessarily.
2. Do not add features just because they are common in other dashboards.
3. Keep the product simple.
4. Reuse existing components.
5. Do not create duplicate data sources.
6. Make every navigation item functional.
7. Check existing code before creating new components.
8. Do not break existing functionality when adding new features.
9. Keep mobile responsiveness in mind.
10. If a feature is not part of the MVP, do not implement it without instruction.

---

## Decisions

### Decision 001 — Dashboard Layout
Date: 2026-09-11
Decision:
Use a wider dashboard layout with a collapsible sidebar instead of the narrow centered layout.
Reason:
The original layout felt like a form rather than a business management dashboard.

---

### Decision 002 — Add Order
Date: 2026-09-11
Decision:
Keep Add Order as a primary action rather than permanently displaying a large form on the dashboard.
Reason:
The dashboard should primarily help the user understand what is happening with their business.

---

### Decision 003 — Connected Data
Date: 2026-09-11
Decision:
Dashboard, Orders, Customers, and Reports must use the same underlying data.
Reason:
Changing an order should automatically update the rest of the application.

---

## Current Status
Dashboard: In progress
Orders: In progress
Customers: Not started
Reports: Not started
Settings: Not started
Sidebar: In progress
Data structure: In progress
Responsive design: Not started

---

## Known Problems
- Dashboard layout needs improvement
- Sidebar needs to become interactive
- Customers interface needs to be created
- Reports interface needs to be created
- Settings interface needs to be created
- Empty states need to be designed
- Responsive behavior needs to be tested

---

## Notes for AI Coding Agents
Before making changes:
1. Read this journal.
2. Inspect the existing code.
3. Understand the current data structure.
4. Reuse existing components where possible.
5. Follow the existing design system.
6. Do not implement features outside the current task.
7. Update this journal after completing a meaningful feature or making an important product decision.

When updating this journal, record:
- What changed
- Why it changed
- Important decisions
- Problems discovered
- What should happen next