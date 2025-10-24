-- Schema tối thiểu + dữ liệu mẫu Luật HN&G
CREATE TABLE IF NOT EXISTS laws (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  law_code VARCHAR(64),
  title TEXT,
  issuing_body VARCHAR(255),
  promulgation_date DATE,
  effective_date DATE,
  expire_date DATE NULL,
  status VARCHAR(64),
  field VARCHAR(255),
  unified BOOLEAN DEFAULT FALSE,
  unified_source VARCHAR(512),
  source_url VARCHAR(1024),
  fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS law_nodes (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  law_id BIGINT NOT NULL,
  parent_id BIGINT NULL,
  level ENUM('PHAN','CHUONG','MUC','TIEU_MUC','DIEU','KHOAN','DIEM') NOT NULL,
  ordinal_label VARCHAR(64),
  heading TEXT,
  content_html LONGTEXT,
  content_text LONGTEXT,
  sort_key VARCHAR(64),
  effective_start DATE,
  effective_end DATE,
  CONSTRAINT fk_nodes_law FOREIGN KEY (law_id) REFERENCES laws(id),
  CONSTRAINT fk_nodes_parent FOREIGN KEY (parent_id) REFERENCES law_nodes(id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE laws
  ADD UNIQUE KEY uk_laws_code (law_code);

-- Luật HN&G (mẫu)
INSERT INTO laws (law_code, title, issuing_body, promulgation_date, effective_date, status, field)
VALUES ('52/2014/QH13', 'Luật Hôn nhân và Gia đình', 'Quốc hội', '2014-06-19', '2015-01-01', 'Còn hiệu lực', 'Hôn nhân và gia đình')
ON DUPLICATE KEY UPDATE title=VALUES(title);

-- Lấy id của luật vừa chèn
SET @law_id := (SELECT id FROM laws WHERE law_code='52/2014/QH13' LIMIT 1);

-- Điều 8: Điều kiện kết hôn (kèm các Khoản)
INSERT INTO law_nodes (law_id, parent_id, level, ordinal_label, heading, content_text, sort_key, effective_start, effective_end)
VALUES
(@law_id, NULL, 'DIEU', 'Điều 8', 'Điều kiện kết hôn', NULL, '002.008', '2015-01-01', '2099-12-31');

SET @d8 := LAST_INSERT_ID();

) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE law_nodes
  ADD KEY idx_nodes_law (law_id),
  ADD KEY idx_nodes_parent (parent_id),
  ADD KEY idx_nodes_level (level),
  ADD KEY idx_nodes_sort (sort_key);


INSERT INTO law_nodes (law_id, parent_id, level, ordinal_label, content_text, sort_key, effective_start, effective_end)
VALUES
(@law_id, @d8, 'KHOAN', 'Khoản 1',
 'Nam từ đủ 20 tuổi trở lên, nữ từ đủ 18 tuổi trở lên.',
 '002.008.001', '2015-01-01', '2099-12-31'),
(@law_id, @d8, 'KHOAN', 'Khoản 2',
 'Việc kết hôn do nam và nữ tự nguyện quyết định.',
 '002.008.002', '2015-01-01', '2099-12-31'),
(@law_id, @d8, 'KHOAN', 'Khoản 3',
 'Không bị mất năng lực hành vi dân sự.',
 '002.008.003', '2015-01-01', '2099-12-31'),
(@law_id, @d8, 'KHOAN', 'Khoản 4',
 'Việc kết hôn không thuộc một trong các trường hợp cấm kết hôn.',
 '002.008.004', '2015-01-01', '2099-12-31');

-- Điều 5: Các hành vi bị cấm (rút gọn vài khoản điển hình)
INSERT INTO law_nodes (law_id, parent_id, level, ordinal_label, heading, content_text, sort_key, effective_start, effective_end)
VALUES
(@law_id, NULL, 'DIEU', 'Điều 5', 'Các hành vi bị cấm', NULL, '002.005', '2015-01-01', '2099-12-31');

SET @d5 := LAST_INSERT_ID();

INSERT INTO law_nodes (law_id, parent_id, level, ordinal_label, content_text, sort_key, effective_start, effective_end)
VALUES
(@law_id, @d5, 'KHOAN', 'Khoản 1',
 'Cấm kết hôn giả tạo, cưỡng ép, lừa dối kết hôn; tảo hôn; người đang có vợ hoặc có chồng mà kết hôn hoặc chung sống như vợ chồng với người khác.',
 '002.005.001', '2015-01-01', '2099-12-31'),
(@law_id, @d5, 'KHOAN', 'Khoản 2',
 'Cấm kết hôn hoặc chung sống như vợ chồng giữa những người cùng dòng máu về trực hệ; giữa những người có họ trong phạm vi ba đời; giữa cha, mẹ nuôi với con nuôi; giữa người đã từng là cha, mẹ nuôi với con nuôi; giữa cha chồng với con dâu, mẹ vợ với con rể; giữa cha dượng với con riêng của vợ, mẹ kế với con riêng của chồng.',
 '002.005.002', '2015-01-01', '2099-12-31');
