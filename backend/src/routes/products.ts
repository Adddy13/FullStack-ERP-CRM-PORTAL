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

const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  sku: z.string().min(1, "SKU is required"),
  category: z.string().nullable().optional(),
  unit_price: z.number().min(0, "Price must be positive"),
  current_stock: z.number().int().min(0).default(0),
  min_stock_alert: z.number().int().min(0).default(10),
  location: z.string().nullable().optional(),
});

// list products
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const { search, category, low_stock, page = "1", limit = "20" } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    let whereClause = "WHERE 1=1";
    const params: any[] = [];
    let idx = 1;

    if (search) {
      whereClause += ` AND (name ILIKE $${idx} OR sku ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }
    if (category) {
      whereClause += ` AND category = $${idx}`;
      params.push(category);
      idx++;
    }
    if (low_stock === "true") {
      whereClause += ` AND current_stock <= min_stock_alert`;
    }

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM products ${whereClause}`,
      params,
    );
    const dataRes = await pool.query(
      `SELECT * FROM products ${whereClause} ORDER BY name ASC LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, parseInt(limit as string), offset],
    );

    res.json({
      products: dataRes.rows,
      total: parseInt(countRes.rows[0].count),
      page: parseInt(page as string),
      totalPages: Math.ceil(
        parseInt(countRes.rows[0].count) / parseInt(limit as string),
      ),
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// get single product with stock movements
router.get("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const productRes = await pool.query(
      "SELECT * FROM products WHERE id = $1",
      [req.params.id],
    );
    if (productRes.rows.length === 0) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    const movementsRes = await pool.query(
      `SELECT sm.*, u.name as created_by_name, p.name as product_name
       FROM stock_movements sm
       LEFT JOIN users u ON sm.created_by = u.id
       LEFT JOIN products p ON sm.product_id = p.id
       WHERE sm.product_id = $1
       ORDER BY sm.created_at DESC
       LIMIT 50`,
      [req.params.id],
    );

    res.json({ ...productRes.rows[0], movements: movementsRes.rows });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch product" });
  }
});

// create product
router.post(
  "/",
  roleMiddleware("Admin", "Warehouse"),
  async (req: AuthRequest, res: Response) => {
    try {
      const data = productSchema.parse(req.body);
      const result = await pool.query(
        `INSERT INTO products (name, sku, category, unit_price, current_stock, min_stock_alert, location)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [
          data.name,
          data.sku,
          data.category || null,
          data.unit_price,
          data.current_stock,
          data.min_stock_alert,
          data.location || null,
        ],
      );
      res.status(201).json(result.rows[0]);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ error: err.errors[0].message });
        return;
      }
      if (err.code === "23505") {
        res.status(400).json({ error: "SKU already exists" });
        return;
      }
      res.status(500).json({ error: "Failed to create product" });
    }
  },
);

// update product
router.put(
  "/:id",
  roleMiddleware("Admin", "Warehouse"),
  async (req: AuthRequest, res: Response) => {
    try {
      const data = productSchema.parse(req.body);
      const result = await pool.query(
        `UPDATE products SET name=$1, sku=$2, category=$3, unit_price=$4, current_stock=$5,
       min_stock_alert=$6, location=$7, updated_at=NOW() WHERE id=$8 RETURNING *`,
        [
          data.name,
          data.sku,
          data.category || null,
          data.unit_price,
          data.current_stock,
          data.min_stock_alert,
          data.location || null,
          req.params.id,
        ],
      );
      if (result.rows.length === 0) {
        res.status(404).json({ error: "Product not found" });
        return;
      }
      res.json(result.rows[0]);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ error: err.errors[0].message });
        return;
      }
      res.status(500).json({ error: "Failed to update product" });
    }
  },
);

// add stock movement
router.post(
  "/:id/stock-movements",
  roleMiddleware("Admin", "Warehouse"),
  async (req: AuthRequest, res: Response) => {
    try {
      const { quantity, movement_type, reason } = req.body;

      if (!quantity || quantity <= 0) {
        res.status(400).json({ error: "Quantity must be positive" });
        return;
      }
      if (!["IN", "OUT"].includes(movement_type)) {
        res.status(400).json({ error: "Movement type must be IN or OUT" });
        return;
      }

      // check product exists and has enough stock for OUT
      const productRes = await pool.query(
        "SELECT * FROM products WHERE id = $1",
        [req.params.id],
      );
      if (productRes.rows.length === 0) {
        res.status(404).json({ error: "Product not found" });
        return;
      }

      const product = productRes.rows[0];
      if (movement_type === "OUT" && product.current_stock < quantity) {
        res.status(400).json({
          error: `Insufficient stock. Current: ${product.current_stock}, Requested: ${quantity}`,
        });
        return;
      }

      // calculate new stock
      const newStock =
        movement_type === "IN"
          ? product.current_stock + quantity
          : product.current_stock - quantity;

      // update stock
      await pool.query(
        "UPDATE products SET current_stock = $1, updated_at = NOW() WHERE id = $2",
        [newStock, req.params.id],
      );

      // log movement
      const movResult = await pool.query(
        `INSERT INTO stock_movements (product_id, quantity, movement_type, reason, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [req.params.id, quantity, movement_type, reason || null, req.user?.id],
      );

      res.status(201).json({ ...movResult.rows[0], new_stock: newStock });
    } catch (err) {
      res.status(500).json({ error: "Failed to record stock movement" });
    }
  },
);

export default router;
