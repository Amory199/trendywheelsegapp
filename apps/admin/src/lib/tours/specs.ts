import type { TourSpec } from "../tour-runner";

import { registerTour } from "./registry";

// Per-page guided tours for the admin app. Each spec targets stable
// `data-tour="..."` anchors added to the page during Phase 4. Steps are
// scoped to what a first-time staff member would want to know:
// what the page does, where the primary actions are, what the most
// important filters/columns mean.
//
// Authoring rule: keep tour copy short (one or two sentences per step).
// Long step text gets ignored — users skim, they don't read.

const dashboardTour: TourSpec = {
  steps: [
    {
      popover: {
        title: "Welcome to TrendyWheels Admin",
        description:
          "This is your workspace. The sidebar on the left groups everything you can do. Let's take a quick lap.",
      },
    },
    {
      element: '[data-tour="admin:dashboard-stats"]',
      popover: {
        title: "Today's numbers",
        description:
          "Quick read on what needs attention right now. Click any tile to jump to that section.",
      },
    },
    {
      popover: {
        title: "Quick actions",
        description:
          "The buttons in the top-right of each page open the most common create flows for that page. You'll see these everywhere.",
      },
    },
    {
      popover: {
        title: "Help is always there",
        description:
          "Look for the (?) icon next to a page title to replay its tour. Hover (i) icons next to specific controls for one-line tips.",
      },
    },
  ],
};

const customersTour: TourSpec = {
  steps: [
    {
      popover: {
        title: "Customers (CRM)",
        description:
          "Every customer is a profile here. From this page you can view rentals, sales, repairs, tickets, and loyalty per person.",
      },
    },
    {
      element: '[data-tour="customers-search"]',
      popover: {
        title: "Search any field",
        description: "Search by name, email, or phone. Matches show as you type.",
      },
    },
    {
      popover: {
        title: "Click a row to dive in",
        description:
          "A row click opens the customer's full timeline. From there you can update notes, see activity, and trigger actions on their behalf.",
      },
    },
  ],
};

const salesTour: TourSpec = {
  steps: [
    {
      popover: {
        title: "Sales board",
        description:
          "Two kinds of sales live here: vehicles from your fleet listed for sale, and customer-submitted listings (trade-ins).",
      },
    },
    {
      element: '[data-tour="sales-filters"]',
      popover: {
        title: "Filter by status",
        description:
          "Active = currently for sale. Sold = closed. Taken down = paused. The dropdown narrows the table to one slice.",
      },
    },
    {
      element: '[data-tour="sales-create-button"]',
      popover: {
        title: "Create a new sale listing",
        description:
          "Opens the new-listing form. Pick a vehicle from your fleet, set price + photos, hit publish.",
      },
    },
    {
      popover: {
        title: "Click a row to manage",
        description:
          "Row click opens the drawer where you mark sold, update price, or take it down.",
      },
    },
  ],
};

const vehiclesTour: TourSpec = {
  steps: [
    {
      popover: {
        title: "Inventory",
        description:
          "Every vehicle in your fleet lives here — golf carts, scooters, buggies, UTVs, jet skis, hover boards. From this page you set whether each one is for rent, sale, or both.",
      },
    },
    {
      element: '[data-tour="vehicles-add-button"]',
      popover: {
        title: "Add a new vehicle",
        description:
          "Pick the category first (which storefront tab customers will see it under), then fill in name, photos, and pricing. It's bookable the moment you publish.",
      },
    },
    {
      popover: {
        title: "Filter by category",
        description:
          "Use the pill row to scope the table to one category — handy when you want to bulk-update only the scooters or only the jet skis.",
      },
    },
    {
      popover: {
        title: "Click a row to edit",
        description:
          "Row click opens the vehicle detail page where you can adjust pricing, swap photos, or change availability.",
      },
    },
  ],
};

const bookingsTour: TourSpec = {
  steps: [
    {
      popover: {
        title: "Bookings",
        description:
          "Every rental booking — pending, active, completed. From here you approve, reject, mark paid, or refund.",
      },
    },
    {
      popover: {
        title: "Status filter (top right)",
        description:
          "Use the dropdown to focus on what needs action: Pending bookings are waiting for your approval.",
      },
    },
    {
      popover: {
        title: "Click a row to act",
        description:
          "Row click opens a drawer with Approve / Reject / Cancel / Mark paid / Refund buttons. The drawer also shows the full booking history.",
      },
    },
  ],
};

const ticketsTour: TourSpec = {
  steps: [
    {
      popover: {
        title: "Support tickets",
        description:
          "Every customer ticket lands here. The three cards above show open / in-progress / urgent counts at a glance.",
      },
    },
    {
      popover: {
        title: "Priority colors",
        description:
          "Red = urgent. Orange = high. Treat urgent ones first. Click a ticket to reply, assign, or resolve.",
      },
    },
    {
      popover: {
        title: "Knowledge base shortcut",
        description:
          "If a question repeats, link the answer from the Knowledge Base to save time on the next ticket like it.",
      },
    },
  ],
};

const settingsTour: TourSpec = {
  steps: [
    {
      popover: {
        title: "System configuration",
        description:
          "Company-wide settings live here: business info, payment, email templates, API keys. Changes apply to every app immediately.",
      },
    },
    {
      popover: {
        title: "Tabs along the top",
        description:
          "Company / Payment / Templates / API — each is a separate block. Tweaking one doesn't touch the others.",
      },
    },
    {
      popover: {
        title: "Audit-logged",
        description:
          "Every change here is recorded in the audit log. If something breaks, the audit log tells you when and who.",
      },
    },
  ],
};

const maintenanceTour: TourSpec = {
  steps: [
    {
      popover: {
        title: "Maintenance",
        description:
          "Schedule routine work for your fleet — oil changes, brakes, annual service. Tracks who, when, and how much.",
      },
    },
    {
      element: '[data-tour="maintenance-actions"]',
      popover: {
        title: "List or calendar",
        description:
          "List view shows the queue. Calendar view shows the month at a glance — easier to spot conflicts.",
      },
    },
    {
      element: '[data-tour="maintenance-schedule-button"]',
      popover: {
        title: "Schedule new work",
        description: "Pick vehicle + type + date + cost. The mechanic gets a notification.",
      },
    },
  ],
};

const repairsTour: TourSpec = {
  steps: [
    {
      popover: {
        title: "Repair requests",
        description:
          "Customer-submitted repair requests land here. Workflow: Submitted → Assigned → In progress → Completed.",
      },
    },
    {
      popover: {
        title: "Status filter (top right)",
        description: "Filter to one status to focus a queue review.",
      },
    },
    {
      popover: {
        title: "Click a row to manage",
        description:
          "Open the drawer to assign a mechanic, record actual cost, or update the customer with a status note.",
      },
    },
  ],
};

const kbTour: TourSpec = {
  steps: [
    {
      popover: {
        title: "Knowledge base",
        description:
          "Articles published here show up in the customer app's help section. Use it to deflect common questions.",
      },
    },
    {
      element: '[data-tour="kb-search"]',
      popover: {
        title: "Search before writing",
        description: "Check whether a similar article exists before drafting a new one.",
      },
    },
    {
      element: '[data-tour="kb-create-button"]',
      popover: {
        title: "Create an article",
        description:
          "Title + body + category. Markdown supported. Published immediately to the customer app.",
      },
    },
  ],
};

const usersTour: TourSpec = {
  steps: [
    {
      popover: {
        title: "Users (staff + customers)",
        description:
          "Everyone with a TrendyWheels account. Staff have a role (sales / support / inventory / mechanic). Customers don't.",
      },
    },
    {
      element: '[data-tour="users-add-button"]',
      popover: {
        title: "Add a staff member",
        description:
          "Opens the staff form: email + password + role. The new staff can log in to the admin app immediately.",
      },
    },
    {
      popover: {
        title: "Click a row to manage",
        description:
          "From the drawer you can change role, disable / enable the account, or reset their password.",
      },
    },
  ],
};

// Wire all specs into the global registry. The barrel import in
// `global-tour-mounter.tsx` triggers this side-effect once per session.
registerTour("admin:dashboard", dashboardTour);
registerTour("admin:customers", customersTour);
registerTour("admin:sales", salesTour);
registerTour("admin:vehicles", vehiclesTour);
registerTour("admin:bookings", bookingsTour);
registerTour("admin:tickets", ticketsTour);
registerTour("admin:settings", settingsTour);
registerTour("admin:maintenance", maintenanceTour);
registerTour("admin:repairs", repairsTour);
registerTour("admin:kb", kbTour);
registerTour("admin:users", usersTour);
