import { Router, Response } from "express";
import pool from "../config/database";
import {
  AuthRequest,
  authMiddleware,
  roleMiddleware,
} from "../middleware/auth";
import { z } from "zod";

const router = Router();

// all routes need auth
router.use(authMiddleware);

const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  mobile: z.string().nullable().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  business_name: z.string().nullable().optional(),
  gst_number: z.string().nullable().optional(),
  customer_type: z.enum(["Retail", "Wholesale", "Distributor"]),
  address: z.string().nullable().optional(),
  status: z.enum(["Lead", "Active", "Inactive"]).default("Lead"),
  follow_up_date: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

// get all customers with search and pagination
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const { search, status, type, page = "1", limit = "20" } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    let whereClause = "WHERE 1=1";
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      whereClause += ` AND (c.name ILIKE $${paramIndex} OR c.business_name ILIKE $${paramIndex} OR c.mobile ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    if (status) {
      whereClause += ` AND c.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    if (type) {
      whereClause += ` AND c.customer_type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM customers c ${whereClause}`,
      params,
    );

    const dataResult = await pool.query(
      `SELECT c.*, u.name as created_by_name
       FROM customers c
       LEFT JOIN users u ON c.created_by = u.id
       ${whereClause}
       ORDER BY c.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, parseInt(limit as string), offset],
    );

    res.json({
      customers: dataResult.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page as string),
      totalPages: Math.ceil(
        parseInt(countResult.rows[0].count) / parseInt(limit as string),
      ),
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch customers" });
  }
});

// get single customer with follow-ups
router.get("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const customerResult = await pool.query(
      `SELECT c.*, u.name as created_by_name
       FROM customers c
       LEFT JOIN users u ON c.created_by = u.id
       WHERE c.id = $1`,
      [id],
    );

    if (customerResult.rows.length === 0) {
      res.status(404).json({ error: "Customer not found" });
      return;
    }

    const followUpsResult = await pool.query(
      `SELECT f.*, u.name as created_by_name
       FROM follow_ups f
       LEFT JOIN users u ON f.created_by = u.id
       WHERE f.customer_id = $1
       ORDER BY f.created_at DESC`,
      [id],
    );

    res.json({
      ...customerResult.rows[0],
      follow_ups: followUpsResult.rows,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch customer" });
  }
});

// create customer
router.post(
  "/",
  roleMiddleware("Admin", "Sales"),
  async (req: AuthRequest, res: Response) => {
    try {
      const data = customerSchema.parse(req.body);

      const result = await pool.query(
        `INSERT INTO customers (name, mobile, email, business_name, gst_number, customer_type, address, status, follow_up_date, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
        [
          data.name,
          data.mobile || null,
          data.email || null,
          data.business_name || null,
          data.gst_number || null,
          data.customer_type,
          data.address || null,
          data.status,
          data.follow_up_date || null,
          data.notes || null,
          req.user?.id,
        ],
      );

      res.status(201).json(result.rows[0]);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ error: err.errors[0].message });
        return;
      }
      res.status(500).json({ error: "Failed to create customer" });
    }
  },
);

// update customer
router.put(
  "/:id",
  roleMiddleware("Admin", "Sales"),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const data = customerSchema.parse(req.body);

      const result = await pool.query(
        `UPDATE customers SET name=$1, mobile=$2, email=$3, business_name=$4, gst_number=$5,
       customer_type=$6, address=$7, status=$8, follow_up_date=$9, notes=$10, updated_at=NOW()
       WHERE id=$11 RETURNING *`,
        [
          data.name,
          data.mobile || null,
          data.email || null,
          data.business_name || null,
          data.gst_number || null,
          data.customer_type,
          data.address || null,
          data.status,
          data.follow_up_date || null,
          data.notes || null,
          id,
        ],
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: "Customer not found" });
        return;
      }

      res.json(result.rows[0]);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ error: err.errors[0].message });
        return;
      }
      res.status(500).json({ error: "Failed to update customer" });
    }
  },
);

// add follow-up
router.post(
  "/:id/follow-ups",
  roleMiddleware("Admin", "Sales"),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { note, follow_up_date } = req.body;

      if (!note) {
        res.status(400).json({ error: "Note is required" });
        return;
      }

      // also update the customer's follow_up_date
      await pool.query(
        "UPDATE customers SET follow_up_date = $1, updated_at = NOW() WHERE id = $2",
        [follow_up_date || null, id],
      );

      const result = await pool.query(
        `INSERT INTO follow_ups (customer_id, note, follow_up_date, created_by)
       VALUES ($1, $2, $3, $4) RETURNING *`,
        [id, note, follow_up_date || null, req.user?.id],
      );

      res.status(201).json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to add follow-up" });
    }
  },
);

export default router;
