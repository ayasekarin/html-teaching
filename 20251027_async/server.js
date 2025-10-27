const express = require("express");
const path = require("path");
const app = express();
const PORT = 3000;
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// 同期
app.post("/submit-sync", express.urlencoded({ extended: true }), (req, res) => {
  const name = req.body.name || "名無し";
  if (name.toLowerCase() === "error") {
    res.status(400).send(`
      <h2>エラーです</h2>
      <a href="/">← 戻る</a>
    `);
  } else {
    setTimeout(() => {
      res.send(`<h2> 私は ${name}です。</h2><a href="/">戻る</a>`);
    }, 1000);
  }
});

// 非同期
app.post("/submit-async", (req, res) => {
  const name = req.body.name || "";
  if (!name || name.toLowerCase() === "error") {
    return res.status(400).json({
      error: "入力エラー"
    });
  }
  setTimeout(() => {
    res.json({ message: `私は ${name}です。` });
  }, 1000);
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
