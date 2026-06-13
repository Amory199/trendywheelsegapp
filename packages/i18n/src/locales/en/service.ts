export default {
  // Repair tab (app/(tabs)/repair.tsx)
  tab: {
    eyebrow: "BOOK REPAIRS IN MINUTES",
    title: "Service",
    new: "New",
    tileRepair: "Repair",
    tileMaintenance: "Maintenance",
    tilePickup: "Pickup & Delivery",
    tileCustomize: "Customization",
    myRepairs: "My repairs",
    emptyTitle: "No repairs yet",
    emptyBody: "Certified mechanics come to you. Track every step in real-time.",
    bookRepair: "Book a repair",
  },

  // Shared repair status labels (repair tab card badges)
  status: {
    submitted: "Requested",
    assigned: "Scheduled",
    inProgress: "In progress",
    completed: "Completed",
  },

  // Repair detail (app/repair/[id].tsx)
  detail: {
    notFound: "Request not found",
    headerTitle: "Repair Request",
    submittedOn: "Submitted",
    progress: "Progress",
    details: "Details",
    category: "Category",
    description: "Description",
    cost: "Cost",
    estimated: "Estimated",
    actual: "Actual",
    currency: "EGP",
    assignedMechanic: "Assigned Mechanic",
    mechanicAssigned: "Mechanic Assigned",
    idPrefix: "ID:",
    pendingAssignment: "Pending assignment — our team will review and assign a mechanic shortly.",
    viewMessages: "View Messages",
    cancelTitle: "Cancel repair?",
    cancelMessage: "Are you sure you want to cancel this repair request?",
    keep: "Keep",
    cancelRepair: "Cancel repair",
    cancelling: "Cancelling…",
    // Status timeline labels (capitalized, distinct from card badges)
    statusSubmitted: "Submitted",
    statusAssigned: "Assigned",
    statusInProgress: "In progress",
    statusCompleted: "Completed",
    statusCancelled: "Cancelled",
    // Priority badge labels
    priorityLow: "LOW",
    priorityMedium: "MEDIUM",
    priorityHigh: "HIGH",
    priorityUrgent: "URGENT",
  },

  // Repair request form (app/repair/request.tsx)
  request: {
    title: "New Repair Request",
    issueCategory: "Issue Category",
    catMechanical: "Mechanical",
    catElectrical: "Electrical",
    catCosmetic: "Cosmetic",
    catOther: "Other",
    describeIssue: "Describe the Issue",
    descriptionPlaceholder: "Describe what's wrong in detail (min 10 characters)…",
    priority: "Priority",
    prioLow: "Low",
    prioMedium: "Medium",
    prioHigh: "High",
    prioUrgent: "Urgent",
    preferredDate: "Preferred Date (optional)",
    pickDate: "Tap to pick a date",
    submit: "Submit Request",
    submissionFailed: "Submission failed. Please try again.",
  },

  // Customization (app/service/customization.tsx)
  customization: {
    headerTitle: "Customization",
    intro: "Make it yours",
    subtitle:
      "Tell us what you have in mind. Paint, wrap, lights, audio — we'll come back with concept options.",
    typeLabel: "Customization type",
    kindPaint: "Paint / wrap",
    kindLights: "Lights",
    kindWrap: "Vinyl wrap",
    kindAudio: "Audio",
    kindOther: "Other",
    budgetLabel: "Budget (EGP, optional)",
    budgetPlaceholder: "e.g. 25000",
    ideaLabel: "Your idea",
    ideaPlaceholder: "What do you have in mind?",
    submit: "Submit request",
    successTitle: "Request received",
    successBody: "We'll send you concept options shortly.",
  },

  // Maintenance (app/service/maintenance.tsx)
  maintenance: {
    headerTitle: "Maintenance",
    intro: "Book a maintenance visit",
    subtitle:
      "Certified mechanics come to you. Pick a service and a date — we'll confirm by tomorrow morning.",
    serviceLabel: "Service",
    typeOil: "Oil change",
    typeBattery: "Battery",
    typeTire: "Tire / wheel",
    typeInspection: "Inspection",
    typeFull: "Full service",
    preferredDate: "Preferred date",
    notesLabel: "Notes (optional)",
    notesPlaceholder: "Anything we should know?",
    submit: "Submit request",
    successTitle: "Request received",
    successBody: "We'll be in touch within 24 hours.",
  },

  // Pickup & delivery (app/service/pickup-delivery.tsx)
  pickup: {
    headerTitle: "Pickup & Delivery",
    intro: "Door-to-door transport",
    subtitle: "Tell us where we're picking up and where it's going. We'll confirm pricing and ETA.",
    pickupAddress: "Pickup address",
    addressPlaceholder: "Street, district, city",
    dropoffAddress: "Drop-off address",
    pickupDate: "Pickup date",
    cargoNotesLabel: "Cargo notes (optional)",
    cargoNotesPlaceholder: "Size, fragility, anything special?",
    submit: "Submit request",
    successTitle: "Request received",
    successBody: "We'll confirm pickup within a few hours.",
  },

  // Shared submit-error alert across service forms
  submitErrorTitle: "Couldn't submit",
  submitErrorFallback: "Try again",
} as const;
