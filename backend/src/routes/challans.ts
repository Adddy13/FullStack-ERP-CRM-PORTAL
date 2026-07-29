import { Router, Response } from "express";
import pool from "../config/database";
import {
  AuthRequest,
  authMiddleware,
  roleMiddleware,
} from "../middleware/auth";
import { z } from "zod";

const router = Router();
router.use(authMiddleware);

const challanItemSchema = z.object({
  product_id: z.number().int().positive(),
  product_name: z.string().min(1),
  sku: z.string().min(1),
  unit_price: z.number().min(0),
  quantity: z.number().int().positive(),
});

const challanSchema = z.object({
  customer_id: z.number().int().positive(),
  items: z.array(challanItemSchema).min(1, "At least one item is required"),
  status: z.enum(["Draft", "Confirmed"]).default("Draft"),
});

// generate challan number
function generateChallanNumber(): string {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = (now.getMonth() + 1).toString().padStart(2, "0");
  const d = now.getDate().toString().padStart(2, "0");
  const rand = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `CH-${y}${m}${d}-${rand}`;
}

// list challans
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const { status, customer_id, search, page = "1", limit = "20" } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    let whereClause = "WHERE 1=1";
    const params: any[] = [];
    let idx = 1;

    if (status) {
      whereClause += ` AND sc.status = $${idx}`;
      params.push(status);
      idx++;
    }
    if (customer_id) {
      whereClause += ` AND sc.customer_id = $${idx}`;
      params.push(customer_id);
      idx++;
    }
    if (search) {
      whereClause += ` AND (sc.challan_number ILIKE $${idx} OR c.name ILIKE $${idx} OR c.business_name ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM sales_challans sc LEFT JOIN customers c ON sc.customer_id = c.id ${whereClause}`,
      params,
    );

    const dataRes = await pool.query(
      `SELECT sc.*, c.name as customer_name, c.business_name, u.name as created_by_name
       FROM sales_challans sc
       LEFT JOIN customers c ON sc.customer_id = c.id
       LEFT JOIN users u ON sc.created_by = u.id
       ${whereClause}
       ORDER BY sc.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, parseInt(limit as string), offset],
    );

    res.json({
      challans: dataRes.rows,
      total: parseInt(countRes.rows[0].count),
      page: parseInt(page as string),
      totalPages: Math.ceil(
        parseInt(countRes.rows[0].count) / parseInt(limit as string),
      ),
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch challans" });
  }
});

// get single challan with items
router.get("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const challanRes = await pool.query(
      `SELECT sc.*, c.name as customer_name, c.business_name, c.mobile, c.address, c.gst_number,
              u.name as created_by_name
       FROM sales_challans sc
       LEFT JOIN customers c ON sc.customer_id = c.id
       LEFT JOIN users u ON sc.created_by = u.id
       WHERE sc.id = $1`,
      [req.params.id],
    );

    if (challanRes.rows.length === 0) {
      res.status(404).json({ error: "Challan not found" });
      return;
    }

    const itemsRes = await pool.query(
      "SELECT * FROM challan_items WHERE challan_id = $1",
      [req.params.id],
    );

    res.json({ ...challanRes.rows[0], items: itemsRes.rows });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch challan" });
  }
});

// create challan
router.post(
  "/",
  roleMiddleware("Admin", "Sales"),
  async (req: AuthRequest, res: Response) => {
    const client = await pool.connect();
    try {
      const data = challanSchema.parse(req.body);
      const challanNumber = generateChallanNumber();
      const totalQty = data.items.reduce((sum, item) => sum + item.quantity, 0);

      await client.query("BEGIN");

      // if confirmed, check stock for all items
      if (data.status === "Confirmed") {
        for (const item of data.items) {
          const prodRes = await client.query(
            "SELECT current_stock, name FROM products WHERE id = $1",
            [item.product_id],
          );
          if (prodRes.rows.length === 0) {
            await client.query("ROLLBACK");
            res
              .status(400)
              .json({ error: `Product "${item.product_name}" not found` });
            return;
          }
          if (prodRes.rows[0].current_stock < item.quantity) {
            await client.query("ROLLBACK");
            res.status(400).json({
              error: `Insufficient stock for "${item.product_name}". Available: ${prodRes.rows[0].current_stock}, Required: ${item.quantity}`,
            });
            return;
          }
        }
      }

      // insert challan
      const challanRes = await client.query(
        `INSERT INTO sales_challans (challan_number, customer_id, total_quantity, status, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [challanNumber, data.customer_id, totalQty, data.status, req.user?.id],
      );

      const challanId = challanRes.rows[0].id;

      // insert items and update stock if confirmed
      for (const item of data.items) {
        await client.query(
          `INSERT INTO challan_items (challan_id, product_id, product_name, sku, unit_price, quantity)
         VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            challanId,
            item.product_id,
            item.product_name,
            item.sku,
            item.unit_price,
            item.quantity,
          ],
        );

        if (data.status === "Confirmed") {
          // reduce stock
          await client.query(
            "UPDATE products SET current_stock = current_stock - $1, updated_at = NOW() WHERE id = $2",
            [item.quantity, item.product_id],
          );
          // log movement
          await client.query(
            `INSERT INTO stock_movements (product_id, quantity, movement_type, reason, created_by)
           VALUES ($1, $2, 'OUT', $3, $4)`,
            [
              item.product_id,
              item.quantity,
              `Sales Challan ${challanNumber}`,
              req.user?.id,
            ],
          );
        }
      }

      await client.query("COMMIT");

      // fetch the complete challan
      const itemsRes = await pool.query(
        "SELECT * FROM challan_items WHERE challan_id = $1",
        [challanId],
      );
      res.status(201).json({ ...challanRes.rows[0], items: itemsRes.rows });
    } catch (err: any) {
      await client.query("ROLLBACK");
      if (err instanceof z.ZodError) {
        res.status(400).json({ error: err.errors[0].message });
        return;
      }
      console.error("Challan creation error:", err);
      res.status(500).json({ error: "Failed to create challan" });
    } finally {
      client.release();
    }
  },
);

// update challan status (confirm, cancel)
router.patch(
  "/:id/status",
  roleMiddleware("Admin", "Sales"),
  async (req: AuthRequest, res: Response) => {
    const client = await pool.connect();
    try {
      const { status } = req.body;
      if (!["Confirmed", "Cancelled", "Draft"].includes(status)) {
        res.status(400).json({ error: "Invalid status" });
        return;
      }

      const challanRes = await client.query(
        "SELECT * FROM sales_challans WHERE id = $1",
        [req.params.id],
      );
      if (challanRes.rows.length === 0) {
        res.status(404).json({ error: "Challan not found" });
        return;
      }

      const challan = challanRes.rows[0];

      // only draft can be confirmed, only draft/confirmed can be cancelled
      if (status === "Confirmed" && challan.status !== "Draft") {
        res.status(400).json({ error: "Only draft challans can be confirmed" });
        return;
      }
      if (status === "Cancelled" && challan.status === "Cancelled") {
        res.status(400).json({ error: "Challan already cancelled" });
        return;
      }

      await client.query("BEGIN");

      if (status === "Confirmed") {
        // check stock
        const items = await client.query(
          "SELECT * FROM challan_items WHERE challan_id = $1",
          [req.params.id],
        );
        for (const item of items.rows) {
          const prodRes = await client.query(
            "SELECT current_stock, name FROM products WHERE id = $1",
            [item.product_id],
          );
          if (prodRes.rows[0].current_stock < item.quantity) {
            await client.query("ROLLBACK");
            res.status(400).json({
              error: `Insufficient stock for "${item.product_name}". Available: ${prodRes.rows[0].current_stock}, Required: ${item.quantity}`,
            });
            return;
          }
        }
        // reduce stock
        for (const item of items.rows) {
          await client.query(
            "UPDATE products SET current_stock = current_stock - $1, updated_at = NOW() WHERE id = $2",
            [item.quantity, item.product_id],
          );
          await client.query(
            `INSERT INTO stock_movements (product_id, quantity, movement_type, reason, created_by)
           VALUES ($1, $2, 'OUT', $3, $4)`,
            [
              item.product_id,
              item.quantity,
              `Sales Challan ${challan.challan_number}`,
              req.user?.id,
            ],
          );
        }
      }

      if (status === "Cancelled" && challan.status === "Confirmed") {
        // restore stock
        const items = await client.query(
          "SELECT * FROM challan_items WHERE challan_id = $1",
          [req.params.id],
        );
        for (const item of items.rows) {
          await client.query(
            "UPDATE products SET current_stock = current_stock + $1, updated_at = NOW() WHERE id = $2",
            [item.quantity, item.product_id],
          );
          await client.query(
            `INSERT INTO stock_movements (product_id, quantity, movement_type, reason, created_by)
           VALUES ($1, $2, 'IN', $3, $4)`,
            [
              item.product_id,
              item.quantity,
              `Cancelled Challan ${challan.challan_number} - Stock Restored`,
              req.user?.id,
            ],
          );
        }
      }

      const updateRes = await client.query(
        "UPDATE sales_challans SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
        [status, req.params.id],
      );

      await client.query("COMMIT");
      res.json(updateRes.rows[0]);
    } catch (err: any) {
      await client.query("ROLLBACK");
      res.status(500).json({ error: "Failed to update challan status" });
    } finally {
      client.release();
    }
  },
);

export default router;
