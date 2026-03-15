const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const axios = require("axios");
const OpenAI = require("openai");

admin.initializeApp();
const db = admin.firestore();

// Initialize OpenAI
// Note: In production, use secret manager or functions config
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "sk-placeholder-key-for-deployment",
});

/**
 * Scheduled Function: Ingest Global Conflict Data
 * Runs every 30 minutes.
 */
exports.ingestData = onSchedule("every 30 minutes", async (event) => {
  logger.info("Starting data ingestion cycle...");
  
  try {
    // 1. Fetch Raw Data from Multiple Sources
    const [gdeltData, reliefWebData, acledData] = await Promise.all([
      fetchGDELT(),
      fetchReliefWeb(),
      fetchACLED()
    ]);
    
    const allRawEvents = [...gdeltData, ...reliefWebData, ...acledData];
    logger.info(`Fetched ${allRawEvents.length} raw events.`);

    // 2. Process & Deduplicate with OpenAI
    const processedIncidents = await processWithAI(allRawEvents);

    // 3. Store in Firestore
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

/**
 * Trigger: On New Incident Created
 * Checks severity for alerts.
 */
exports.checkAlerts = onDocumentCreated("incidents/{incidentId}", async (event) => {
  const incident = event.data.data();
  if (!incident) return;

  if (incident.severity > 80) {
    logger.warn(`CRITICAL INCIDENT DETECTED: ${incident.id}`);
    
    // Create Alert Document
    await db.collection("alerts").add({
      incidentId: event.params.incidentId,
      triggeredAt: admin.firestore.FieldValue.serverTimestamp(),
      summary: incident.summary,
      level: "CRITICAL",
      country: incident.country
    });

    // Send FCM Notification (Placeholder)
    // await admin.messaging().sendToTopic("alerts", { ... });
  }
});

// --- Helper Functions ---

async function fetchGDELT() {
  try {
    // Using the GDELT GeoJSON API V1
    const response = await axios.get("https://api.gdeltproject.org/api/v1/gkg_geojson?QUERY=ARMEDCONFLICT&TIMESPAN=60");
    
    if (!response.data || !response.data.features) return [];

    return response.data.features.slice(0, 10).map(f => ({
      source: "GDELT",
      rawId: f.properties.url || Math.random().toString(),
      text: f.properties.name,
      lat: f.geometry.coordinates[1],
      lng: f.geometry.coordinates[0],
      timestamp: f.properties.urlpubtimedate || new Date().toISOString(),
      country: f.properties.name || "Unknown"
    }));
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

    // Get today's date in YYYY-MM-DD format
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
      lat: 0, // ReliefWeb requires separate location lookup
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

  // Batch processing (simplified for example)
  // In production, queue these or process in smaller chunks to avoid timeouts
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
        timestamp: admin.firestore.Timestamp.now() // specific firestore timestamp
      });

    } catch (e) {
      logger.error("AI Processing Error", e);
      // Fallback if AI fails
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
