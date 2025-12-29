import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function seed() {
  const connection = await pool.getConnection();

  try {
    console.log("🌱 Seeding database...");

    // 1. Households（住戸）
    console.log("📍 Seeding households...");
    await connection.query(`
      INSERT IGNORE INTO households (householdId, moveInDate) VALUES
      ('101', '2015-01-15'),
      ('102', '2016-03-20'),
      ('103', '2014-06-10'),
      ('104', '2017-11-05'),
      ('105', '2013-02-28'),
      ('106', '2018-09-12'),
      ('107', '2019-04-01'),
      ('108', '2020-07-22'),
      ('109', '2021-05-18'),
      ('110', '2022-08-30')
    `);

    // 2. Leader Schedule（先9年ローテ）
    console.log("📅 Seeding leader schedule...");
    await connection.query(`
      INSERT IGNORE INTO leader_schedule (year, primaryHouseholdId, backupHouseholdId, status, reason) VALUES
      (2025, '101', '102', 'confirmed', '前回担当からの経過年数で選定'),
      (2026, '103', '104', 'conditional', '在籍確認待ち'),
      (2027, '105', '106', 'draft', '自動計算待ち'),
      (2028, '107', '108', 'draft', '自動計算待ち'),
      (2029, '109', '110', 'draft', '自動計算待ち'),
      (2030, '101', '103', 'draft', '自動計算待ち'),
      (2031, '102', '104', 'draft', '自動計算待ち'),
      (2032, '105', '106', 'draft', '自動計算待ち'),
      (2033, '107', '108', 'draft', '自動計算待ち')
    `);

    // 3. Leader Rotation Logic（ローテーション計算ロジック）
    console.log("🔄 Seeding leader rotation logic...");
    await connection.query(`
      INSERT IGNORE INTO leader_rotation_logic (year, logic) VALUES
      (2025, 'A: 入居12ヶ月未満は候補外。B: 直近2年以内に組長経験は候補外。C: 免除申請承認は候補外。'),
      (2026, 'A: 入居12ヶ月未満は候補外。B: 直近2年以内に組長経験は候補外。C: 免除申請承認は候補外。')
    `);

    // 4. Exemption Requests（免除申請）
    console.log("🚫 Seeding exemption requests...");
    await connection.query(`
      INSERT IGNORE INTO exemption_requests (householdId, year, reason, status, approvedBy, approvedAt) VALUES
      ('103', 2025, '健康上の理由', 'approved', 1, NOW()),
      ('105', 2026, '仕事の都合', 'pending', NULL, NULL)
    `);

    // 5. Rule Versions（ルール版管理）
    console.log("📜 Seeding rule versions...");
    await connection.query(`
      INSERT IGNORE INTO rule_versions (version, content, createdBy, effectiveDate) VALUES
      (1, '組長業務基本ルール v1', 1, '2024-01-01'),
      (2, '組長業務基本ルール v2（会費納入期限延長）', 1, '2024-06-01')
    `);

    // 6. Pending Queue（返信待ちキュー）
    console.log("⏳ Seeding pending queue...");
    await connection.query(`
      INSERT IGNORE INTO pending_queue (householdId, taskType, dueDate, status, notes) VALUES
      ('102', 'form_response', '2025-04-15 23:59:59', 'pending', '河川清掃出欠未回答'),
      ('104', 'form_response', '2025-04-15 23:59:59', 'pending', '河川清掃出欠未回答')
    `);

    // 7. Handover Bag Items（引き継ぎ袋アイテム）
    console.log("🎁 Seeding handover bag items...");
    await connection.query(`
      INSERT IGNORE INTO handover_bag_items (name, description, location, lastUpdated) VALUES
      ('会費帳', '住戸別の会費納入状況を記録するノート', '組長宅', NOW()),
      ('ルール冊子', '組長業務の基本ルール', '組長宅', NOW()),
      ('連絡網', '全住戸の連絡先一覧', '組長宅', NOW())
    `);

    // 8. Member Top Summary（Member トップ要約）
    console.log("📊 Seeding member top summary...");
    await connection.query(`
      INSERT IGNORE INTO member_top_summary (title, content, displayOrder) VALUES
      ('年度', '2025年度', 1),
      ('組長', '101番 田中太郎', 2),
      ('副組長', '102番 鈴木花子', 3)
    `);

    // 9. Posts（投稿）
    console.log("📝 Seeding posts...");
    await connection.query(`
      INSERT IGNORE INTO posts (title, content, createdBy, createdAt, classification) VALUES
      ('2025年度組長決定', '2025年度の組長が決定しました。101番の田中太郎さんです。', 1, NOW(), 'public'),
      ('河川清掃日程変更', '4月20日の河川清掃は雨天予報のため、4月27日に変更になりました。', 1, NOW(), 'public')
    `);

    // 10. Events（イベント）
    console.log("🗓️ Seeding events...");
    await connection.query(`
      INSERT IGNORE INTO events (title, startDate, endDate, description, createdBy, classification) VALUES
      ('河川清掃', '2025-04-20 08:00:00', '2025-04-20 10:00:00', '焼津川河川敷の清掃活動', 1, 'public'),
      ('定期総会', '2025-05-10 19:00:00', '2025-05-10 21:00:00', '年度の定期総会', 1, 'public')
    `);

    // 11. River Cleaning Runs（河川清掃実績）
    console.log("🌊 Seeding river cleaning runs...");
    await connection.query(`
      INSERT IGNORE INTO river_cleaning_runs (date, attendanceCount, notes) VALUES
      ('2024-10-20', 8, '秋の清掃。天候良好。'),
      ('2024-04-21', 7, '春の清掃。参加者7名。')
    `);

    // 12. Inventory（備品台帳）
    console.log("📦 Seeding inventory...");
    await connection.query(`
      INSERT IGNORE INTO inventory (name, quantity, location, lastChecked, classification) VALUES
      ('折りたたみテーブル', 2, '倉庫', NOW(), 'public'),
      ('椅子', 20, '倉庫', NOW(), 'public'),
      ('掃除用具セット', 3, '倉庫', NOW(), 'public')
    `);

    // 13. Templates（テンプレート）
    console.log("📄 Seeding templates...");
    await connection.query(`
      INSERT IGNORE INTO templates (name, content, category, createdBy) VALUES
      ('会費納入催促メール', 'いつもお世話になっています。会費の納入がまだのようです。お手数ですが、お早めにお願いします。', 'email', 1),
      ('河川清掃案内', '来月の河川清掃は{{date}}に予定しています。ご参加よろしくお願いします。', 'notice', 1),
      ('フォーム回答リマインダー', '住戸 {{householdId}} 様\n\n下記のフォームの回答期限が近づいています。\n\nフォーム: {{formTitle}}\n期限: {{dueDate}}\n\nお早めに回答いただけるようお願いします。', 'email', 1)
    `);

    // 14. Rules（ルール・決定事項）
    console.log("⚖️ Seeding rules...");
    await connection.query(`
      INSERT IGNORE INTO rules (title, content, effectiveDate, createdBy, classification) VALUES
      ('会費納入期限', '毎月末日までに会費を納入してください。', '2024-01-01', 1, 'public'),
      ('河川清掃参加', '年2回の河川清掃への参加は義務です。', '2024-01-01', 1, 'public')
    `);

    // 15. FAQ（よくある質問）
    console.log("❓ Seeding FAQ...");
    await connection.query(`
      INSERT IGNORE INTO faq (question, answer, category, displayOrder) VALUES
      ('会費はいくらですか？', '月額5,000円です。', 'finance', 1),
      ('河川清掃は必須ですか？', 'はい、年2回の参加が義務です。', 'event', 2)
    `);

    // 16. Changelog（年度ログ）
    console.log("📋 Seeding changelog...");
    await connection.query(`
      INSERT IGNORE INTO changelog (title, content, createdAt) VALUES
      ('2024年度組長業務完了', '田中太郎さんの2024年度組長業務が完了しました。', NOW()),
      ('2025年度開始', '2025年度が開始しました。新組長は101番です。', NOW())
    `);

    // 17. Secret Notes（個人情報メモ）
    console.log("🔐 Seeding secret notes...");
    await connection.query(`
      INSERT IGNORE INTO secret_notes (title, body) VALUES
      ('103番の事情', '103番は医療費が高いため、会費免除対象。毎年確認が必要。'),
      ('105番の連絡先', '105番は高齢のため、連絡は午前中が良い。'),
      ('過去の問題記録', '2020年に会費未納があった住戸：106番、108番。現在は解決済み。')
    `);

    // 18. Forms（フォーム）
    console.log("📋 Seeding forms...");
    const formId = 'river-cleaning-attendance-2025';
    await connection.query(`
      INSERT IGNORE INTO forms (id, title, description, dueDate, createdBy, status) VALUES
      (?, '河川清掃出欠', '2025年4月20日（日）の河川清掃への出欠をお知らせください。', '2025-04-15 23:59:59', 1, 'active')
    `, [formId]);

    // 19. Form Questions（質問）
    console.log("❓ Seeding form questions...");
    const questionId = 'river-attendance-q1';
    await connection.query(`
      INSERT IGNORE INTO form_questions (id, formId, questionText, questionType, required, displayOrder) VALUES
      (?, ?, '出席を選択してください', 'radio', true, 1)
    `, [questionId, formId]);

    // 20. Form Choices（選択肢）
    console.log("✓ Seeding form choices...");
    await connection.query(`
      INSERT IGNORE INTO form_choices (id, questionId, choiceText, displayOrder) VALUES
      (?, ?, '出席', 1),
      (?, ?, '欠席', 2),
      (?, ?, '未定', 3)
    `, [
      'choice-attend', questionId,
      'choice-absent', questionId,
      'choice-undecided', questionId
    ]);

    console.log("✅ Seeding completed successfully!");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    throw error;
  } finally {
    await connection.release();
    await pool.end();
  }
}

seed().catch(console.error);
