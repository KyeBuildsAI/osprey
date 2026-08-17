# Data and Trial Locations

## Goal

Osprey's trial locations are chosen to produce meaningful operational diversity while using high-quality public data. The objective is not simply to pick the most dangerous cities; it is to select environments where different hazards create different reasoning tasks for the agent team.

## Location strategy

Osprey should support a location-agnostic architecture:

```text
Operational area
    ↓
Weather + hazard feeds
    ↓
Geospatial context
    ↓
Infrastructure data
    ↓
Operational procedures
    ↓
Agent reasoning
    ↓
Human decision
```

This allows a new region to be added by changing adapters/data/configuration rather than rewriting the agent system.

## Primary V1: Houston–Galveston, Texas

### Why Houston–Galveston

The region is useful because it can expose Osprey to several operationally different hazards:

- extreme heat;
- tropical storms and hurricanes;
- heavy rainfall and inland flooding;
- coastal/storm-surge risk;
- damaging wind;
- severe thunderstorms/tornado risk.

It is especially strong for the Infrastructure Agent because weather can be combined with elevation, waterways, flood-hazard mapping and critical-asset locations.

### Planned data sources

#### Weather

**Met Office Weather DataHub — Global Spot**
- site-specific global forecast source;
- queried by latitude/longitude;
- useful as one independent forecast stream.

**US National Weather Service (NWS)**
- official US forecasts;
- active watches, warnings and advisories;
- observations and local forecast-office context;
- especially important for official US severe-weather alerting.

The Weather Agent should reconcile evidence rather than treat two feeds as identical sources.

#### Elevation / terrain

**USGS 3D Elevation Program (3DEP)**
- digital elevation models;
- terrain/elevation context;
- potential source for raster DEM / elevation queries.

#### Flood risk

**FEMA National Flood Hazard Layer (NFHL)**
- official flood-hazard mapping;
- used to identify whether assets intersect mapped flood-hazard areas.

#### Coastal context

**NOAA Digital Coast**
- coastal elevation/inundation datasets where useful;
- particularly relevant to Galveston/coastal hazards.

### Example geospatial reasoning

```text
Heavy rainfall / coastal hazard evidence
              ↓
       hazard polygon / area
              ↓
    intersect critical assets
              ↓
       query asset elevation
              ↓
      query FEMA flood zone
              ↓
     proximity to waterways
              ↓
 Infrastructure Agent interprets
              ↓
 Operations Agent proposes response
```

The GIS layer calculates intersections/distances/elevation. The LLM interprets the structured results.

## Stress-test location: Oklahoma City, Oklahoma

### Why Oklahoma City

Oklahoma City provides a contrasting hazard environment centred on rapid severe-convective evolution:

- tornadoes;
- severe thunderstorms;
- hail;
- damaging straight-line winds;
- flash flooding;
- heat.

This region should stress-test:

- rapidly changing warnings;
- uncertainty;
- time-critical escalation;
- conflicting recommendations;
- whether agents overreact to low-confidence signals;
- whether agents update decisions when new official warnings arrive.

### Data sources

The same NWS integration can support this location, while Met Office Global Spot can provide another forecast input. USGS/FEMA geospatial data can be reused where relevant.

## Later location candidates

A UK flood-focused case remains attractive because it would test a different national data ecosystem. Carlisle/Cumbria is one candidate due to flood exposure and Environment Agency hydrology data, but it is intentionally **not part of the initial US build scope**.

London may also be useful later for transport/infrastructure-focused scenarios, but the first releases should prioritise weather diversity and public data quality.

## Live mode

LIVE mode consumes current data.

Rules:

1. No fabricated alert or hazard is inserted into the live feed.
2. All evidence is timestamped.
3. Stale data is visibly marked.
4. Official alerts are distinguished from model/agent interpretations.
5. The Weather Agent must cite which source(s) support a finding.
6. If upstream sources disagree, that conflict should be represented rather than hidden.

## Replay mode

REPLAY mode uses historical incidents for controlled testing.

Potential events can include major hurricanes/floods for Houston–Galveston and historical tornado/severe-weather events around Oklahoma City.

Replay requirements:

- evidence is released according to simulated incident time;
- future information must not leak into earlier steps;
- the same core agent architecture is used as LIVE mode;
- decisions and findings are logged at each checkpoint;
- evaluation can compare behaviour between model/prompt/system versions.

## Map layers

### Base layers
- roads;
- waterways;
- settlements;
- administrative boundaries;
- infrastructure assets.

### Terrain layers
- elevation;
- hillshade;
- optional 3D DEM terrain.

### Weather/hazard layers
- NWS warning polygons;
- storm/hazard geometry where available;
- rainfall/wind overlays where available and useful.

### Flood/coastal layers
- FEMA flood hazard zones;
- low-lying terrain;
- water bodies/bayous;
- NOAA coastal layers where appropriate.

### Osprey layers
- assets identified as exposed;
- agent risk classification;
- proposed operational action areas;
- approved actions.

## Data provenance

Every ingested fact should ideally preserve:

- source/provider;
- endpoint/product;
- retrieval timestamp;
- observation/forecast valid time;
- location/geometry;
- units;
- raw/source identifier when available.

This provenance should follow the evidence into agent findings and the audit trail.

## Authoritative reference links

- Met Office Weather DataHub: https://datahub.metoffice.gov.uk/
- NWS API documentation: https://www.weather.gov/documentation/services-web-api
- NWS API endpoint: https://api.weather.gov/
- USGS 3DEP: https://www.usgs.gov/3d-elevation-program
- FEMA flood-map products: https://www.fema.gov/flood-maps/products-tools
- NOAA Digital Coast: https://coast.noaa.gov/digitalcoast/
- MapLibre GL JS: https://maplibre.org/maplibre-gl-js/docs/
