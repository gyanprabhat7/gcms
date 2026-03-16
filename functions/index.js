/* eslint-disable @typescript-eslint/no-require-imports */
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const axios = require("axios");
const OpenAI = require("openai");

admin.initializeApp();
const db = admin.firestore();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "sk-placeholder-key-for-deployment",
});

exports.ingestData = onSchedule("every 30 minutes", async () => {
  logger.info("Starting data ingestion cycle...");
  
  try {
    const [gdeltData, reliefWebData, acledData] = await Promise.all([
      fetchGDELT(),
      fetchReliefWeb(),
      fetchACLED()
    ]);
    
    const allRawEvents = [...gdeltData, ...reliefWebData, ...acledData];
    logger.info(`Fetched ${allRawEvents.length} raw events.`);

    const processedIncidents = await processWithAI(allRawEvents);

    const batch = db.batch();
    
    for (const incident of processedIncidents) {
      const docRef = db.collection("incidents").doc(incident.id);
      batch.set(docRef, incident, { merge: true });
    }
    
    await batch.commit();
    logger.info(`Successfully stored ${processedIncidents.length} incidents.`);
    
  } catch (error) {
    logger.error("Error in ingestion cycle:", error);
  }
});

exports.checkAlerts = onDocumentCreated("incidents/{incidentId}", async (event) => {
  const incident = event.data?.data();
  if (!incident) return;

  if (incident.severity > 80) {
    logger.warn(`CRITICAL INCIDENT DETECTED: ${incident.id}`);
    
    await db.collection("alerts").add({
      incidentId: event.params.incidentId,
      triggeredAt: admin.firestore.FieldValue.serverTimestamp(),
      summary: incident.summary,
      level: "CRITICAL",
      country: incident.country
    });
  }
});

async function fetchGDELT() {
  try {
    const themes = ['ARMEDCONFLICT', 'TERROR', 'PROTEST'];
    const themeRequests = themes.map(theme => 
      axios.get(`https://api.gdeltproject.org/api/v1/gkg_geojson?QUERY=${theme}&TIMESPAN=60`)
        .then(res => res.data.features || [])
        .catch(() => [])
    );

    const results = await Promise.all(themeRequests);
    const allFeatures = results.flat();
    
    if (allFeatures.length === 0) return [];

    const seen = new Set();
    const uniqueIncidents = [];

    for (const f of allFeatures) {
      const url = f.properties.url;
      const text = f.properties.name;
      const key = `${url}-${text}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueIncidents.push({
          source: "GDELT",
          rawId: url || Math.random().toString(),
          text: text,
          lat: f.geometry.coordinates[1],
          lng: f.geometry.coordinates[0],
          timestamp: f.properties.urlpubtimedate || new Date().toISOString(),
          country: f.properties.name || "Unknown"
        });
      }
    }

    return uniqueIncidents.slice(0, 30);
  } catch (e) {
    logger.error("GDELT Fetch Error", e);
    return [];
  }
}

async function fetchACLED() {
  try {
    const email = process.env.ACLED_EMAIL;
    const key = process.env.ACLED_API_KEY;

    if (!email || !key || key === 'your_acled_key') {
      logger.warn("ACLED API credentials not configured. Skipping ACLED fetch.");
      return [];
    }

    const today = new Date().toISOString().split('T')[0];
    
    const response = await axios.get("https://api.acleddata.com/acled/read", {
      params: {
        key: key,
        email: email,
        event_date: today,
        event_date_where: ">=",
        limit: 20
      }
    });

    if (!response.data || !response.data.data) return [];

    return response.data.data.map(event => ({
      source: "ACLED",
      rawId: event.event_id_cnty,
      text: `${event.event_type}: ${event.notes}`,
      lat: parseFloat(event.latitude),
      lng: parseFloat(event.longitude),
      timestamp: event.event_date,
      country: event.country
    }));

  } catch (e) {
    logger.error("ACLED Fetch Error", e);
    return [];
  }
}

async function fetchReliefWeb() {
  try {
    const response = await axios.get("https://api.reliefweb.int/v1/reports?appname=gcms-core&preset=latest&limit=5&query[value]=primary_country");
    
    if (!response.data || !response.data.data) return [];

    return response.data.data.map(d => ({
      source: "ReliefWeb",
      rawId: d.id,
      text: d.fields.title,
      lat: 0,
      lng: 0,
      timestamp: d.fields.date.created,
      country: d.fields.primary_country ? d.fields.primary_country.name : "Unknown"
    }));
  } catch (e) {
    logger.error("ReliefWeb Fetch Error", e);
    return [];
  }
}

async function processWithAI(rawEvents) {
  const processed = [];

  for (const event of rawEvents) {
    try {
      const prompt = `
        Analyze this conflict event: "${event.text}" from ${event.source}.
        Return a JSON object with:
        - summary: concise military style summary
        - severityScore: 1-100 (integer)
        - riskLevel: LOW, MEDIUM, HIGH, CRITICAL
        - tags: array of keywords (e.g., "missile", "civil_unrest")
        - escalationProbability: 0-100 (integer)
      `;

      const completion = await openai.chat.completions.create({
        messages: [{ role: "system", content: "You are a military intelligence analyst." }, { role: "user", content: prompt }],
        model: "gpt-4o-mini",
        response_format: { type: "json_object" }
      });

      const analysis = JSON.parse(completion.choices[0].message.content);

      processed.push({
        id: `inc-${Date.now()}-${Math.floor(Math.random()*1000)}`,
        ...event,
        ...analysis,
        timestamp: admin.firestore.Timestamp.now()
      });

    } catch (e) {
      logger.error("AI Processing Error", e);
      processed.push({
        id: `inc-fallback-${Date.now()}`,
        ...event,
        summary: event.text,
        severityScore: 50,
        riskLevel: "UNKNOWN",
        tags: ["raw"],
        escalationProbability: 0
      });
    }
  }

  return processed;
}