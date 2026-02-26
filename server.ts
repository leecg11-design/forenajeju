import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";

const db = new Database("announcements.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_popup INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/announcements", (req, res) => {
    const rows = db.prepare("SELECT * FROM announcements ORDER BY created_at DESC").all();
    res.json(rows);
  });

  app.post("/api/admin/login", (req, res) => {
    const { password } = req.body;
    if (password === "0070") {
      res.json({ success: true, token: "admin-token-0070" }); // Simple token for demo
    } else {
      res.status(401).json({ success: false, message: "비밀번호가 틀렸습니다." });
    }
  });

  app.post("/api/announcements", (req, res) => {
    const { title, content, is_popup } = req.body;
    const info = db.prepare("INSERT INTO announcements (title, content, is_popup) VALUES (?, ?, ?)").run(title, content, is_popup ? 1 : 0);
    res.json({ id: info.lastInsertRowid });
  });

  app.put("/api/announcements/:id", (req, res) => {
    const { id } = req.params;
    const { title, content, is_popup } = req.body;
    db.prepare("UPDATE announcements SET title = ?, content = ?, is_popup = ? WHERE id = ?").run(title, content, is_popup ? 1 : 0, id);
    res.json({ success: true });
  });

  app.delete("/api/announcements/:id", (req, res) => {
    const { id } = req.params;
    console.log(`[Server] DELETE request received for ID: ${id}`);
    
    try {
      // Try both numeric and string just to be safe
      const stmt = db.prepare("DELETE FROM announcements WHERE id = ?");
      
      // Try as number first
      let info = stmt.run(Number(id));
      console.log(`[Server] Attempt 1 (Number) result:`, info);
      
      if (info.changes === 0) {
        // Try as string if number didn't work
        info = stmt.run(id);
        console.log(`[Server] Attempt 2 (String) result:`, info);
      }

      if (info.changes > 0) {
        console.log(`[Server] Successfully deleted ID: ${id}`);
        return res.json({ success: true });
      } else {
        console.log(`[Server] No record found for ID: ${id}`);
        return res.status(404).json({ success: false, message: "삭제할 항목을 찾지 못했습니다." });
      }
    } catch (error: any) {
      console.error(`[Server] Database error during delete:`, error);
      return res.status(500).json({ success: true, message: "DB 에러: " + error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
