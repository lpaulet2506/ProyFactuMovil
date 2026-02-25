import express from "express";
import path from "path";
import pkg from "pg";
import dotenv from "dotenv";

const { Pool } = pkg;

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Test connection and log details
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

async function initDb() {
  let client;
  try {
    client = await pool.connect();
    console.log("Connected to PostgreSQL successfully");

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT,
        role TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS issuer_data (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        name TEXT,
        id_number TEXT,
        address TEXT,
        postal_code TEXT,
        city TEXT,
        phone TEXT,
        email TEXT,
        next_invoice_number TEXT,
        next_quote_number TEXT,
        next_receipt_number TEXT,
        logo TEXT
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        invoice_id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        pdf_model TEXT NOT NULL,
        customer_name TEXT,
        id_number TEXT,
        address TEXT,
        postal_code TEXT,
        iva_percentage NUMERIC,
        include_iva_in_quote BOOLEAN,
        total NUMERIC,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        items JSONB,
        issuer JSONB
      );
    `);

    // Ensure admin user exists
    console.log("Checking for admin user...");
    const adminCheck = await client.query("SELECT * FROM users WHERE email = 'admin@factumovil.com'");
    if (adminCheck.rows.length === 0) {
      console.log("Admin user not found, creating...");
      await client.query(`
        INSERT INTO users (id, email, password, role) 
        VALUES ('admin-001', 'admin@factumovil.com', 'admin', 'admin')
      `);
      console.log("Admin user created successfully");
    } else {
      console.log("Admin user already exists");
    }

    console.log("Database schema and seed data verified");
  } catch (err) {
    console.error("Error initializing database:", err);
  } finally {
    if (client) client.release();
  }
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  console.log("Starting server initialization...");
  app.use(express.json({ limit: '50mb' }));

  // Initialize DB in background to not block server start
  initDb().then(() => {
    console.log("Database initialization finished");
  }).catch(err => {
    console.error("Database initialization failed:", err);
  });

  // API Routes
  console.log("Registering API routes...");

  // Users
  app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;
    try {
      const { rows } = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

      if (rows.length > 0) {
        const user = rows[0];
        if (user.password === password) {
          res.json({
            id: user.id,
            email: user.email,
            role: user.role,
            createdAt: user.created_at
          });
        } else {
          res.status(401).json({ error: "Invalid credentials" });
        }
      } else {
        res.status(401).json({ error: "Invalid credentials" });
      }
    } catch (err) {
      console.error("Login error in server:", err);
      res.status(500).json({ error: "Login error" });
    }
  });

  app.get("/api/users", async (req, res) => {
    try {
      const { rows } = await pool.query("SELECT * FROM users ORDER BY created_at DESC");
      res.json(rows.map(r => ({
        id: r.id,
        email: r.email,
        role: r.role,
        createdAt: r.created_at
      })));
    } catch (err) {
      res.status(500).json({ error: "Error fetching users" });
    }
  });

  app.post("/api/users", async (req, res) => {
    const { id, email, password, role, createdAt } = req.body;
    try {
      await pool.query(
        "INSERT INTO users (id, email, password, role, created_at) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO NOTHING",
        [id, email, password, role, createdAt]
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Error creating user" });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    try {
      await pool.query("DELETE FROM users WHERE id = $1", [req.params.id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Error deleting user" });
    }
  });

  app.put("/api/users/:id", async (req, res) => {
    const { email, password } = req.body;
    try {
      if (password) {
        await pool.query("UPDATE users SET email = $1, password = $2 WHERE id = $3", [email, password, req.params.id]);
      } else {
        await pool.query("UPDATE users SET email = $1 WHERE id = $2", [email, req.params.id]);
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Error updating user" });
    }
  });

  // Issuer Data
  app.get("/api/issuer/:userId", async (req, res) => {
    try {
      const { rows } = await pool.query("SELECT * FROM issuer_data WHERE user_id = $1", [req.params.userId]);
      if (rows.length === 0) return res.json(null);
      const r = rows[0];
      res.json({
        name: r.name,
        idNumber: r.id_number,
        address: r.address,
        postalCode: r.postal_code,
        city: r.city,
        phone: r.phone,
        email: r.email,
        nextInvoiceNumber: r.next_invoice_number,
        nextQuoteNumber: r.next_quote_number,
        nextReceiptNumber: r.next_receipt_number,
        logo: r.logo
      });
    } catch (err) {
      res.status(500).json({ error: "Error fetching issuer data" });
    }
  });

  app.post("/api/issuer/:userId", async (req, res) => {
    const { name, idNumber, address, postalCode, city, phone, email, nextInvoiceNumber, nextQuoteNumber, nextReceiptNumber, logo } = req.body;
    console.log(`Saving issuer data for user ${req.params.userId}. Logo length: ${logo?.length || 0}`);
    try {
      const result = await pool.query(
        `INSERT INTO issuer_data (user_id, name, id_number, address, postal_code, city, phone, email, next_invoice_number, next_quote_number, next_receipt_number, logo)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (user_id) DO UPDATE SET
         name = EXCLUDED.name,
         id_number = EXCLUDED.id_number,
         address = EXCLUDED.address,
         postal_code = EXCLUDED.postal_code,
         city = EXCLUDED.city,
         phone = EXCLUDED.phone,
         email = EXCLUDED.email,
         next_invoice_number = EXCLUDED.next_invoice_number,
         next_quote_number = EXCLUDED.next_quote_number,
         next_receipt_number = EXCLUDED.next_receipt_number,
         logo = EXCLUDED.logo`,
        [req.params.userId, name, idNumber, address, postalCode, city, phone, email, nextInvoiceNumber, nextQuoteNumber, nextReceiptNumber, logo]
      );
      console.log("Issuer data saved successfully", result.rowCount);
      res.json({ success: true });
    } catch (err) {
      console.error("Error saving issuer data:", err);
      res.status(500).json({ error: "Error saving issuer data" });
    }
  });

  // Invoices
  app.get("/api/invoices/:userId", async (req, res) => {
    try {
      const { rows } = await pool.query("SELECT * FROM invoices WHERE user_id = $1 ORDER BY created_at DESC", [req.params.userId]);
      res.json(rows.map(r => ({
        invoiceId: r.invoice_id,
        type: r.type,
        pdfModel: r.pdf_model,
        customerName: r.customer_name,
        idNumber: r.id_number,
        address: r.address,
        postalCode: r.postal_code,
        ivaPercentage: Number(r.iva_percentage),
        includeIvaInQuote: r.include_iva_in_quote,
        total: Number(r.total),
        createdAt: r.created_at,
        items: r.items,
        issuer: r.issuer
      })));
    } catch (err) {
      res.status(500).json({ error: "Error fetching invoices" });
    }
  });

  app.post("/api/invoices", async (req, res) => {
    const { invoiceId, userId, type, pdfModel, customerName, idNumber, address, postalCode, ivaPercentage, includeIvaInQuote, total, createdAt, items, issuer } = req.body;
    try {
      await pool.query(
        `INSERT INTO invoices (invoice_id, user_id, type, pdf_model, customer_name, id_number, address, postal_code, iva_percentage, include_iva_in_quote, total, created_at, items, issuer)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [invoiceId, userId, type, pdfModel, customerName, idNumber, address, postalCode, ivaPercentage, includeIvaInQuote, total, createdAt, JSON.stringify(items), JSON.stringify(issuer)]
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Error saving invoice" });
    }
  });

  app.delete("/api/invoices/:id", async (req, res) => {
    try {
      await pool.query("DELETE FROM invoices WHERE invoice_id = $1", [req.params.id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Error deleting invoice" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.use((req, res, next) => {
      if (req.method === "GET") {
        res.sendFile(path.resolve("dist", "index.html"));
      } else {
        next();
      }
    });
  }

  console.log(`Attempting to start server on port ${PORT}...`);
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server successfully running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
