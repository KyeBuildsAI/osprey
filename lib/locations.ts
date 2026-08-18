export type LocationReadiness = "LIVE" | "SYNTHETIC";

export type LocationProfile = {
  id: string;
  number: string;
  name: string;
  region: string;
  incidentCode: string;
  readiness: LocationReadiness;
  summary: string;
  hazardProfile: string[];
  evidenceRequirements: string[];
  approvalRole: string;
  operatingBoundary: string;
  assetScope: string;
  sourceAdapters: Array<{ label: string; state: "READY" | "PENDING" }>;
  workflowRoles: string[];
  onboarding: Array<{ label: string; state: "READY" | "PENDING" }>;
};

export const locationProfiles: LocationProfile[] = [
  {
    id: "houston-galveston",
    number: "01",
    name: "Houston–Galveston",
    region: "Texas Gulf Coast",
    incidentCode: "INC-HGX-LIVE",
    readiness: "LIVE",
    summary: "Connected demonstration location with live environmental feeds and representative infrastructure context.",
    hazardProfile: ["Heat", "Flood", "Wind", "Compound"],
    evidenceRequirements: ["NWS weather", "Water levels", "Transport status", "Priority assets"],
    approvalRole: "Houston–Galveston incident commander",
    operatingBoundary: "Houston–Galveston operating area",
    assetScope: "Health, transport and critical community assets",
    sourceAdapters: [
      { label: "Weather & warnings", state: "READY" },
      { label: "Water & flood reference", state: "READY" },
      { label: "Transport & infrastructure", state: "READY" },
    ],
    workflowRoles: ["Weather agent", "Infrastructure agent", "Operations agent", "Communications agent"],
    onboarding: [
      { label: "Boundary & operating area", state: "READY" },
      { label: "Hazard thresholds", state: "READY" },
      { label: "Evidence connectors", state: "READY" },
      { label: "Approval workflow", state: "READY" },
    ],
  },
  {
    id: "location-2",
    number: "02",
    name: "Location 2",
    region: "Location to be confirmed",
    incidentCode: "LOC-02-SCENARIO",
    readiness: "SYNTHETIC",
    summary: "A non-live scenario shell. It is ready to receive its real operating boundary, hazards, assets and source adapters.",
    hazardProfile: ["To configure", "Synthetic scenario"],
    evidenceRequirements: ["Source inventory", "Asset register", "Operating thresholds", "Approval role"],
    approvalRole: "Role to be configured",
    operatingBoundary: "Boundary to be confirmed",
    assetScope: "Critical assets to be confirmed",
    sourceAdapters: [
      { label: "Weather & warnings", state: "PENDING" },
      { label: "Water / hazard evidence", state: "PENDING" },
      { label: "Infrastructure evidence", state: "PENDING" },
    ],
    workflowRoles: ["Hazard assessment", "Asset exposure", "Operations response", "Human approval"],
    onboarding: [
      { label: "Boundary & operating area", state: "PENDING" },
      { label: "Hazard thresholds", state: "PENDING" },
      { label: "Evidence connectors", state: "PENDING" },
      { label: "Approval workflow", state: "PENDING" },
    ],
  },
  {
    id: "location-3",
    number: "03",
    name: "Location 3",
    region: "Location to be confirmed",
    incidentCode: "LOC-03-SCENARIO",
    readiness: "SYNTHETIC",
    summary: "A non-live scenario shell for proving that Osprey can reuse the same governed workflow across a distinct operating location.",
    hazardProfile: ["To configure", "Synthetic scenario"],
    evidenceRequirements: ["Source inventory", "Asset register", "Operating thresholds", "Approval role"],
    approvalRole: "Role to be configured",
    operatingBoundary: "Boundary to be confirmed",
    assetScope: "Critical assets to be confirmed",
    sourceAdapters: [
      { label: "Weather & warnings", state: "PENDING" },
      { label: "Water / hazard evidence", state: "PENDING" },
      { label: "Infrastructure evidence", state: "PENDING" },
    ],
    workflowRoles: ["Hazard assessment", "Asset exposure", "Operations response", "Human approval"],
    onboarding: [
      { label: "Boundary & operating area", state: "PENDING" },
      { label: "Hazard thresholds", state: "PENDING" },
      { label: "Evidence connectors", state: "PENDING" },
      { label: "Approval workflow", state: "PENDING" },
    ],
  },
];
