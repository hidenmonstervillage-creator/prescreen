// node scripts/fixtures/make-ctgov-fixture.mjs NCT06380751
// Writes tests/fixtures/<NCT>.study.json (contacts stripped) and <NCT>.criteria.md (verbatim criteria text).
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const nct = process.argv[2];
if (!/^NCT\d{8}$/.test(nct ?? "")) throw new Error("usage: make-ctgov-fixture.mjs NCT########");

const res = await fetch(`https://clinicaltrials.gov/api/v2/studies/${nct}`, { headers: { accept: "application/json" } });
if (!res.ok) throw new Error(`ClinicalTrials.gov answered ${res.status}`);
const study = await res.json();
const p = study.protocolSection;

// Keep only the modules lib/ctgov.ts reads, and no person-level contact details.
const stripped = {
  protocolSection: {
    identificationModule: {
      nctId: p.identificationModule.nctId,
      briefTitle: p.identificationModule.briefTitle,
      officialTitle: p.identificationModule.officialTitle,
    },
    statusModule: { overallStatus: p.statusModule?.overallStatus },
    sponsorCollaboratorsModule: { leadSponsor: { name: p.sponsorCollaboratorsModule?.leadSponsor?.name } },
    conditionsModule: { conditions: p.conditionsModule?.conditions ?? [] },
    designModule: { phases: p.designModule?.phases ?? [], studyType: p.designModule?.studyType },
    eligibilityModule: p.eligibilityModule,
    contactsLocationsModule: {
      locations: (p.contactsLocationsModule?.locations ?? []).map((l) => ({
        facility: l.facility,
        status: l.status,
        city: l.city,
        country: l.country,
      })),
    },
  },
};

const dir = fileURLToPath(new URL("../../tests/fixtures/", import.meta.url));
mkdirSync(dir, { recursive: true });
writeFileSync(`${dir}${nct}.study.json`, JSON.stringify(stripped, null, 2) + "\n", "utf8");
writeFileSync(`${dir}${nct}.criteria.md`, p.eligibilityModule.eligibilityCriteria, "utf8");
console.log(`wrote tests/fixtures/${nct}.study.json and ${nct}.criteria.md`);
