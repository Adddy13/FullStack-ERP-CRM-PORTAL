INSERT INTO users (username, password, name, role) VALUES
  ('admin', '$2a$10$hWrMppHyyTHqkSvb7v81.u9XApLTsVo2SOziC4VjQ.FLOTbHhCyz.', 'Admin User', 'Admin'),
  ('sales1', '$2a$10$hWrMppHyyTHqkSvb7v81.u9XApLTsVo2SOziC4VjQ.FLOTbHhCyz.', 'Rahul Sharma', 'Sales'),
  ('warehouse1', '$2a$10$hWrMppHyyTHqkSvb7v81.u9XApLTsVo2SOziC4VjQ.FLOTbHhCyz.', 'Amit Patel', 'Warehouse'),
  ('accounts1', '$2a$10$hWrMppHyyTHqkSvb7v81.u9XApLTsVo2SOziC4VjQ.FLOTbHhCyz.', 'Priya Singh', 'Accounts')
ON CONFLICT (username) DO NOTHING;

INSERT INTO customers (name, mobile, email, business_name, gst_number, customer_type, address, status, follow_up_date, notes, created_by) VALUES
  ('Rajesh Kumar', '9876543210', 'rajesh@rajeshtraders.com', 'Rajesh Traders', '27AAACR5055K1ZG', 'Wholesale', '12, MG Road, Mumbai', 'Active', '2025-02-20', 'Regular bulk buyer', 2),
  ('Sunita Devi', '9123456789', 'sunita@sunitastore.in', 'Sunita General Store', NULL, 'Retail', '45, Station Road, Pune', 'Active', NULL, NULL, 2),
  ('Vikram Mehta', '9988776655', 'vikram@mehtadist.com', 'Mehta Distribution Co', '24AABCM1234L1Z5', 'Distributor', '78, Industrial Area, Ahmedabad', 'Lead', '2025-02-15', 'Interested in bulk deal', 2),
  ('Anita Sharma', '9012345678', NULL, 'Sharma Electronics', '27AADCS5678M1Z3', 'Wholesale', '23, Laxmi Nagar, Delhi', 'Active', NULL, 'Prefers credit terms', 2),
  ('Deepak Joshi', '8765432109', 'deepak@mail.com', NULL, NULL, 'Retail', '56, Hill Road, Nashik', 'Inactive', NULL, 'No orders in 3 months', 2),
  ('Kavita Patil', '9456781230', 'kavita@patilwholesale.com', 'Patil Wholesale Traders', '27AADPP9876N1Z8', 'Wholesale', '90, APMC Market, Mumbai', 'Active', '2025-02-18', 'Big order expected in February', 2)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, sku, category, unit_price, current_stock, min_stock_alert, location) VALUES
  ('Tata Salt (1kg)', 'TS-001', 'Grocery', 22.00, 500, 100, 'Warehouse A'),
  ('Aashirvaad Atta (5kg)', 'AA-005', 'Grocery', 280.00, 150, 50, 'Warehouse A'),
  ('Fortune Sunflower Oil (1L)', 'FSO-001', 'Oil', 145.00, 8, 30, 'Warehouse B'),
  ('Parle-G Biscuit (100g)', 'PG-100', 'Biscuits', 10.00, 2000, 500, 'Warehouse A'),
  ('Maggi Noodles (140g)', 'MG-140', 'Snacks', 14.00, 5, 200, 'Warehouse B'),
  ('Surf Excel (1kg)', 'SE-001', 'Detergent', 195.00, 75, 25, 'Warehouse C')
ON CONFLICT (sku) DO NOTHING;

INSERT INTO follow_ups (customer_id, note, follow_up_date, created_by) VALUES
  (1, 'Discussed upcoming order for February. Needs 200kg salt and 100 packs atta.', '2025-02-20', 2),
  (3, 'First call. Vikram is interested in becoming a distributor. Needs pricing sheet.', '2025-02-15', 2),
  (6, 'Kavita confirmed February order will be around 50k. Need to prepare quote.', '2025-02-18', 2)
ON CONFLICT DO NOTHING;

INSERT INTO stock_movements (product_id, quantity, movement_type, reason, created_by) VALUES
  (1, 200, 'IN', 'Initial purchase from supplier', 3),
  (4, 500, 'IN', 'Initial purchase from supplier', 3)
ON CONFLICT DO NOTHING;
