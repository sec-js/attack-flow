import * as https from "https";

/**
 * @typedef {Object} AttackObject
 *  An ATT&CK Object.
 * @property {string} id
 *  The object's ATT&CK id.
 * @property {string} name
 *  The object's ATT&CK name.
 * @property {string} type
 *  The object's type.
 * @property {string} description
 *  The object's description.
 * @property {string} url
 *  The object's ATT&CK url.
 * @property {string} stixId
 *  The object's STIX id.
 * @property {boolean} deprecated
 *  True if the ATT&CK object has been deprecated, false otherwise.
 */

/**
 * A map that relates STIX types to ATT&CK types.
 */
const STIX_TO_ATTACK = {
    "campaign": "campaign",
    "course-of-action": "mitigation",
    "intrusion-set": "group",
    "malware": "software",
    "tool": "software",
    "x-mitre-data-source": "data_source",
    "x-mitre-tactic": "tactic",
    "attack-pattern": "technique"
}

/**
 * MITRE's source identifiers.
 */
const MITRE_SOURCES = new Set([
    "mitre-attack",
    "mitre-ics-attack",
    "mitre-mobile-attack"
])

/**
 * Fetches JSON data from a url.
 * @param {string} url
 *  The url.
 * @param {Object} options
 *  The request's options.
 * @returns {Promise<Object>}
 *  A Promise that resolves with the JSON data.
 */
function fetchJson(url, options = {}) {
    return new Promise((resolve, reject) => {
        https.get(url, options, res => {
            let json = "";
            res.on("data", chunk => {
                json += chunk;
            });
            res.on("end", () => {
                try {
                    resolve(JSON.parse(json));
                } catch (err) {
                    reject(err)
                }
            })
        }).on("error", (err) => {
            reject(err);
        });
    })
}

/**
 * Parses an ATT&CK object from a STIX object.
 * @param {Object} obj
 *  The STIX object.
 * @returns {AttackObject}
 *  The parsed ATT&CK object.
 */
function parseStixToAttackObject(obj) {

    // Parse STIX id, name, and type directly
    let parse = {
        stixId: obj.id,
        name: obj.name,
        type: STIX_TO_ATTACK[obj.type],
        description: obj.description,
        external_references: obj.external_references,
        platforms: obj.x_mitre_platforms,
        domains: obj.x_mitre_domains
    }

    // Parse MITRE reference information
    let mitreRef = obj.external_references.find(
        o => MITRE_SOURCES.has(o.source_name)
    );
    if (!mitreRef) {
        throw new Error("Missing MITRE reference information.")
    }
    parse.id = mitreRef.external_id;
    parse.url = mitreRef.url;

    // Parse MITRE shortname
    if (obj.x_mitre_shortname) {
        parse.shortname = obj.x_mitre_shortname;
    }

    // Parse kill-chain phases
    if (obj.kill_chain_phases) {
        parse.tactics = obj.kill_chain_phases.map(o => o.phase_name);
    }

    // Parse deprecation status
    parse.deprecated = (obj.x_mitre_deprecated || obj.revoked) ?? false;

    // Return
    return parse;
}

/**
 * Parses a set of ATT&CK objects from a STIX manifest.
 * @param {Object} data
 *  The STIX manifest.
 * @returns {AttackObject[]}
 *  The parsed ATT&CK objects.
 */
function parseAttackObjectsFromManifest(data) {

    // Parse objects and relationships
    const relationships = new Map();
    let objects = new Map();
    for (let obj of data.objects) {
        if (obj.type === "relationship") {
            if (!relationships.has(obj.source_ref)) {
                relationships.set(obj.source_ref, new Set());
            }
            if (!relationships.has(obj.target_ref)) {
                relationships.set(obj.target_ref, new Set());
            }
            relationships.get(obj.source_ref).add(obj.target_ref);
            relationships.get(obj.target_ref).add(obj.source_ref);
            continue;
        }
        if (!(obj.type in STIX_TO_ATTACK)) {
            continue;
        }
        const parse = parseStixToAttackObject(obj);
        objects.set(parse.stixId, parse);
    }

    // Construct relationships
    for (const [object, relations] of relationships) {
        const source = objects.get(object);
        if (!source) {
            continue;
        }
        for (const relation of relations) {
            const target = objects.get(relation);
            if (!target) {
                continue;
            }
            const type = target.type;
            if (source[`${type}s`] === undefined) {
                source[`${type}s`] = [];
            }
            source[`${type}s`].push(target);
        }
    }

    // Collect tactics
    const tacticsMap = new Map();
    for(const tactic of objects.values()) {
        if(tactic.type !== "tactic") {
            continue;
        }
        tacticsMap.set(tactic.shortname, tactic);
    }

    // Assign tactics and techniques to each other
    for (const technique of objects.values()) {
        if(technique.type !== "technique") {
            continue;
        }
        const tactics = [];
        for(const tacticShortName of technique.tactics ?? []) {
            // Add tactic to technique
            const tactic = tacticsMap.get(tacticShortName); 
            tactics.push(tactic);
            // Add technique to tactic
            if(!tactic.techniques) {
                tactic.techniques = [];
            }
            tactic.techniques.push(technique);
        }
        technique.tactics = tactics;
    }

    // Return catalog
    return [...objects.values()];

}

/**
 * Fetches ATT&CK data from a set of STIX manifests.
 * @param  {...string} urls
 *  A list of STIX manifests specified by url.
 * @returns {Promise<Map<string, AttackObject>>}
 *  A Promise that resolves with the parsed ATT&CK data.
 */
export async function fetchAttackData(...urls) {
    console.log("→ Downloading ATT&CK Data...");

    // Parse objects
    let catalog = new Map();
    for (let url of urls) {
        console.log(` → ${url.length > 70 ? '...' : ''}${url.substring(url.length - 70)}`);
        let objs = parseAttackObjectsFromManifest(await fetchJson(url));
        for (let obj of objs) {
            catalog.set(obj.stixId, obj);
        }
    }
    
    // Categorize catalog
    let types = new Map(
        Object.values(STIX_TO_ATTACK).map(v => [v, []])
    );
    for(let obj of catalog.values()) {
        types.get(obj.type).push(obj);
    }

    // Return
    return types;

}
