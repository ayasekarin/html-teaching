const express = require("express");
const path = require("path");
const fs = require("fs");
const cookieParser = require("cookie-parser");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "html")));

const FILE_PATH = path.join(__dirname, "files", "sample.pdf");

// 1.
app.get("/download/display", (req, res) => {
    res.sendFile(path.join(__dirname, "files", "sample.pdf"));
});

// 2. 
app.get("/download/direct", (req, res) => {
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=example.pdf");
    res.sendFile(FILE_PATH, "example.pdf");
});

// 3. 
app.get("/download/blob", (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (token !== "valid-token") {
        return res.status(401).json({ error: "Unauthorized" });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=blob-download.pdf");
    fs.createReadStream(FILE_PATH).pipe(res);
});

// 4.1. 
app.post("/verify-token", (req, res) => {
    const { token } = req.body;

    if (token === "valid-token") {
        res.cookie("temp_auth", "granted", {
            maxAge: 30000,
            httpOnly: true
        });
        res.status(200).json({ message: "Verified" });
    } else {
        res.status(401).json({ error: "Invalid token" });
    }
});

// 4.2 
app.get("/secure-download", (req, res) => {
    if (req.cookies.temp_auth === "granted") {
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "attachment; filename=secure-download.pdf");
        fs.createReadStream(FILE_PATH).pipe(res);
    } else {
        res.status(403).send("Forbidden: Cookie missing or expired");
    }
});

app.listen(PORT, () => {
    console.log(`サーバー起動: http://localhost:${PORT}`);
});
