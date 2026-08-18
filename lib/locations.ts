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
    onboarding: [
      { label: "Boundary & operating area", state: "PENDING" },
      { label: "Hazard thresholds", state: "PENDING" },
      { label: "Evidence connectors", state: "PENDING" },
      { label: "Approval workflow", state: "PENDING" },
    ],
  },
];
