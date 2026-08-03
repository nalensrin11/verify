const express = require("express");
const { execFile } = require("child_process");
require("dotenv").config();

const app = express();

const PORT = Number(process.env.PORT) || 3000;
const AUTO_LOCK = process.env.AUTO_LOCK === "true";
const AUTO_LOCK_DELAY = Number(process.env.AUTO_LOCK_DELAY) || 2000;
const API_KEY = process.env.API_KEY;

app.use(express.json());

/**
 * Protect the API with an API key.
 */
function authenticateApiKey(req, res, next) {
    const providedApiKey = req.header("x-api-key");

    if (!API_KEY) {
        return res.status(500).json({
            success: false,
            message: "API_KEY is not configured.",
        });
    }

    if (providedApiKey !== API_KEY) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized.",
        });
    }

    next();
}

/**
 * Lock the current Ubuntu/Linux user session.
 */
function lockScreen(callback) {
    execFile("loginctl", ["lock-session"], (error, stdout, stderr) => {
        if (error) {
            callback({
                success: false,
                message: "Could not lock the screen.",
                error: stderr || error.message,
            });

            return;
        }

        callback({
            success: true,
            message: "Device screen locked successfully.",
        });
    });
}

/**
 * Health-check API.
 */
app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Device Screen API is running.",
    });
});

/**
 * Manually lock the screen.
 */
app.post("/api/device/lock", authenticateApiKey, (req, res) => {
    lockScreen((result) => {
        res.status(result.success ? 200 : 500).json(result);
    });
});

app.listen(PORT, "127.0.0.1", () => {
    console.log(`Device Screen API: http://127.0.0.1:${PORT}`);

    if (AUTO_LOCK) {
        console.log(`Screen will lock after ${AUTO_LOCK_DELAY} milliseconds.`);

        setTimeout(() => {
            lockScreen((result) => {
                console.log(result.message);

                if (!result.success) {
                    console.error(result.error);
                }
            });
        }, AUTO_LOCK_DELAY);
    }
});