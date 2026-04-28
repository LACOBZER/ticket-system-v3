/*
 IT Support Ticket System
 Backend mit Node.js + SQL Server
*/

import express from "express";
import cors from "cors";
import sql from "mssql";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 3000;

// Für __dirname bei ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// SQL Server Verbindung
const dbConfig = {
  server: "VSRV-SQL\\SQLEXPRESS",
  database: "TicketDB",
  user: "sa",              // später ggf. ändern
  password: process.env.DB_PASSWORD
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

// Verbindung testen
async function getConnection() {
  try {
    return await sql.connect(dbConfig);
  } catch (err) {
    console.error("SQL-Verbindungsfehler:", err);
    throw err;
  }
}

// Startseite
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Alle Tickets abrufen
app.get("/api/tickets", async (req, res) => {
  try {
    const pool = await getConnection();

    const result = await pool.request().query(`
      SELECT 
        id,
        number,
        participant,
        subject,
        description,
        screenshot,
        status,
        notes,
        created,
        customer,
        priority
      FROM Tickets
      ORDER BY id DESC
    `);

    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: "Tickets konnten nicht geladen werden." });
  }
});

// Neues Ticket erstellen
app.post("/api/tickets", async (req, res) => {
  try {
    const {
      number,
      participant,
      subject,
      description,
      screenshot,
      status,
      notes,
      customer,
      priority
    } = req.body;

    const pool = await getConnection();

    await pool.request()
      .input("number", sql.NVarChar(50), number || "")
      .input("participant", sql.NVarChar(100), participant || "")
      .input("subject", sql.NVarChar(200), subject || "")
      .input("description", sql.NVarChar(sql.MAX), description || "")
      .input("screenshot", sql.NVarChar(sql.MAX), screenshot || null)
      .input("status", sql.NVarChar(50), status || "open")
      .input("notes", sql.NVarChar(sql.MAX), notes || "")
      .input("customer", sql.NVarChar(100), customer || "")
      .input("priority", sql.NVarChar(50), priority || "normal")
      .query(`
        INSERT INTO Tickets 
        (number, participant, subject, description, screenshot, status, notes, created, customer, priority)
        VALUES
        (@number, @participant, @subject, @description, @screenshot, @status, @notes, GETDATE(), @customer, @priority)
      `);

    res.json({ message: "Ticket wurde erstellt." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ticket konnte nicht erstellt werden." });
  }
});

// Ticket-Status ändern
app.put("/api/tickets/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const pool = await getConnection();

    await pool.request()
      .input("id", sql.Int, id)
      .input("status", sql.NVarChar(50), status)
      .query(`
        UPDATE Tickets
        SET status = @status
        WHERE id = @id
      `);

    res.json({ message: "Status wurde aktualisiert." });
  } catch (err) {
    res.status(500).json({ error: "Status konnte nicht geändert werden." });
  }
});

// Ticket löschen
app.delete("/api/tickets/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const pool = await getConnection();

    await pool.request()
      .input("id", sql.Int, id)
      .query(`
        DELETE FROM Tickets
        WHERE id = @id
      `);

    res.json({ message: "Ticket wurde gelöscht." });
  } catch (err) {
    res.status(500).json({ error: "Ticket konnte nicht gelöscht werden." });
  }
});

// Server starten
app.listen(PORT, () => {
  console.log(`Ticket-System läuft auf http://localhost:${PORT}`);
});
