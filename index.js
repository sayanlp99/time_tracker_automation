const express = require("express");
const bodyParser = require("body-parser");
const { Sequelize, DataTypes } = require("sequelize");
require("dotenv").config();

const app = express();
const PORT = 3000;
const DATABASE_URL = process.env["DATABASE_URL"];
const AUTH_TOKEN = process.env["AUTH_TOKEN"];

const sequelize = new Sequelize(DATABASE_URL);

const EventLog = sequelize.define(
    "EventLog",
    {
        event: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        timestamp: {
            type: DataTypes.STRING,
            allowNull: false,
        },
    },
    {
        tableName: "event_logs",
        timestamps: false,
    },
);

sequelize
    .authenticate()
    .then(() => {
        console.log("Database connected successfully");
    })
    .catch((err) => {
        console.error("Unable to connect to the database:", err);
    });

sequelize
    .sync({ alter: true })
    .then(() => {
        console.log("All models were synchronized successfully.");
    })
    .catch((err) => {
        console.error("Error synchronizing models:", err);
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
        await EventLog.create({
            event: req.body.event,
            timestamp: req.body.timestamp,
        });
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

app.get("/heartbeat", async (req, res) => {
    console.log("Heartbeat received");
    res.status(200).send({
        message: "Heartbeat received",
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
