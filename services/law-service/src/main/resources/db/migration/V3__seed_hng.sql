-- V3: seed minimal HN&G sample data
INSERT INTO laws (code, title, issuing_body, promulgation_date, effective_date, status, field)
VALUES ('52/2014/QH13', 'Luật Hôn nhân và Gia đình', 'Quốc hội', '2014-06-19', '2015-01-01', 'Còn hiệu lực', 'Hôn nhân và gia đình')
ON DUPLICATE KEY UPDATE title=VALUES(title);

SET @law_id := (SELECT id FROM laws WHERE code='52/2014/QH13' LIMIT 1);

-- Điều 8
INSERT INTO law_nodes (law_id, parent_id, level, ordinal_label, heading, content_text, sort_key, path, title, effective_start, effective_end)
VALUES
(@law_id, NULL, 'DIEU', 'Điều 8', 'Điều kiện kết hôn', NULL, '002.008', '/52/2014/QH13/Dieu-8', 'Điều kiện kết hôn', '2015-01-01', '2099-12-31');
SET @d8 := LAST_INSERT_ID();

INSERT INTO law_nodes (law_id, parent_id, level, ordinal_label, content_text, sort_key, path, title, effective_start, effective_end)
VALUES
(@law_id, @d8, 'KHOAN', 'Khoản 1',
 'Nam từ đủ 20 tuổi trở lên, nữ từ đủ 18 tuổi trở lên.',
 '002.008.001', '/52/2014/QH13/Dieu-8/Khoan-1', 'Khoản 1', '2015-01-01', '2099-12-31'),
(@law_id, @d8, 'KHOAN', 'Khoản 2',
 'Việc kết hôn do nam và nữ tự nguyện quyết định.',
 '002.008.002', '/52/2014/QH13/Dieu-8/Khoan-2', 'Khoản 2', '2015-01-01', '2099-12-31');

-- Điều 5
INSERT INTO law_nodes (law_id, parent_id, level, ordinal_label, heading, content_text, sort_key, path, title, effective_start, effective_end)
VALUES
(@law_id, NULL, 'DIEU', 'Điều 5', 'Các hành vi bị cấm', NULL, '002.005', '/52/2014/QH13/Dieu-5', 'Các hành vi bị cấm', '2015-01-01', '2099-12-31');
SET @d5 := LAST_INSERT_ID();

INSERT INTO law_nodes (law_id, parent_id, level, ordinal_label, content_text, sort_key, path, title, effective_start, effective_end)
VALUES
(@law_id, @d5, 'KHOAN', 'Khoản 1',
 'Cấm kết hôn giả tạo, cưỡng ép, lừa dối kết hôn; tảo hôn; người đang có vợ hoặc có chồng mà kết hôn hoặc chung sống như vợ chồng với người khác.',
 '002.005.001', '/52/2014/QH13/Dieu-5/Khoan-1', 'Khoản 1', '2015-01-01', '2099-12-31');

