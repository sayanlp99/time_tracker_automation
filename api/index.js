const express = require("express");
const bodyParser = require("body-parser");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();
const PORT = 3000;
const DATABASE_URL = process.env["DATABASE_URL"];
const AUTH_TOKEN = process.env["AUTH_TOKEN"];

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
    },
});

pool.connect()
    .then(() => {
        console.log("Database connected successfully");
    })
    .catch((err) => {
        console.error("Unable to connect to the database:", err);
    });

app.use(bodyParser.json());

app.post("/webhook", async (req, res) => {
    console.log("Data received on /webhook:", req.body);

    if (req.body.token !== AUTH_TOKEN) {
        console.error("Invalid token in request");
        return res.status(401).send({
            message: "Unauthorized request",
        });
    }

    try {
        const query = `INSERT INTO event_logs (event, timestamp) VALUES ($1, $2)`;
        const values = [req.body.event, req.body.timestamp];

        await pool.query(query, values);

        res.status(200).send({
            message: "Webhook data received and saved successfully",
        });
    } catch (error) {
        console.error("Error saving data:", error);
        res.status(500).send({
            message: "Error saving webhook data",
        });
    }
});

app.get("/normalize", async (req, res) => {
    console.log("Starting Data Normalization");

    if (req.query.token !== AUTH_TOKEN) {
        console.error("Invalid token in request");
        return res.status(401).send({
            message: "Unauthorized request",
        });
    }

    try {
        const getEntriesExitsQuery = `
            SELECT 
                DATE(timestamp) AS event_date,
                MIN(timestamp) FILTER (WHERE event = 'enter') AS first_entry,
                MAX(timestamp) FILTER (WHERE event = 'exit') AS last_exit
            FROM event_logs
            WHERE timestamp >= NOW()::date - INTERVAL '1 day'
                AND timestamp < NOW()::date
            GROUP BY event_date;
        `;

        const { rows } = await pool.query(getEntriesExitsQuery);

        for (const row of rows) {
            const { event_date, first_entry, last_exit } = row;

            const deleteIntermediateQuery = `
                DELETE FROM event_logs
                WHERE DATE(timestamp) = $1
                AND event IN ('enter', 'exit')
                AND timestamp NOT IN ($2, $3);
            `;

            const deleteValues = [event_date, first_entry, last_exit];

            await pool.query(deleteIntermediateQuery, deleteValues);
        }

        res.status(200).send({
            message: "Data normalized",
        });
    } catch (error) {
        console.error("Error normalizing data");
        res.status(500).send({
            message: "Error normalizing data",
        });
    }
});

app.get("/heartbeat", async (req, res) => {
    console.log("Heartbeat received");
    res.status(200).send({
        message: "Heartbeat received",
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
