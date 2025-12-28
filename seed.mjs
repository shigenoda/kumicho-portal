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

    // 3. Leader Rotation Logic（ローテロジック）
    console.log("🔄 Seeding leader rotation logic...");
    await connection.query(`
      INSERT IGNORE INTO leader_rotation_logic (version, logic, reason) VALUES
      (1, '{"priority": ["yearsSinceLast", "moveInDate", "householdId"], "excludeConditions": ["exemptionApproved"]}', 'デフォルトロジック')
    `);

    // 4. Events（イベント）
    console.log("📌 Seeding events...");
    await connection.query(`
      INSERT IGNORE INTO events (title, date, description, category) VALUES
      ('河川清掃', '2025-04-20', '春の河川清掃。朝7時集合', 'maintenance'),
      ('定期総会', '2025-05-15', '年度初めの定期総会', 'meeting'),
      ('夏祭り', '2025-07-26', '集合住宅の夏祭り', 'event'),
      ('河川清掃', '2025-10-19', '秋の河川清掃。朝7時集合', 'maintenance'),
      ('年末総会', '2025-12-10', '年度末の総会', 'meeting')
    `);

    // 5. Inventory（備品）
    console.log("📦 Seeding inventory...");
    await connection.query(`
      INSERT IGNORE INTO inventory (name, quantity, location, category, lastAuditDate, notes) VALUES
      ('軍手（白）', 50, '倉庫A-1', 'supplies', '2025-01-15', '河川清掃用'),
      ('ゴミ袋（大）', 100, '倉庫A-2', 'supplies', '2025-01-15', '45L対応'),
      ('熊手', 10, '倉庫B-1', 'tools', '2025-01-15', '竹製'),
      ('スコップ', 8, '倉庫B-1', 'tools', '2025-01-15', 'アルミ製'),
      ('三角コーン', 20, '倉庫C-1', 'safety', '2025-01-15', '赤色'),
      ('懐中電灯', 15, '倉庫C-2', 'safety', '2025-01-15', 'LED式'),
      ('ロープ（50m）', 3, '倉庫D-1', 'tools', '2025-01-15', 'ナイロン製'),
      ('脚立（2m）', 5, '倉庫D-2', 'tools', '2025-01-15', 'アルミ製'),
      ('清掃用ほうき', 12, '倉庫A-3', 'supplies', '2025-01-15', 'プラスチック製'),
      ('消火器', 4, '倉庫E-1', 'safety', '2025-01-15', '10型')
    `);

    // 6. Templates（テンプレ）
    console.log("📄 Seeding templates...");
    await connection.query(`
      INSERT IGNORE INTO templates (title, body, category, createdBy) VALUES
      ('河川清掃実施のお知らせ', '焼津市 集合住宅「グリーンピア」の皆様へ\\n\\n河川清掃を下記の日程で実施いたします。\\n\\n【日時】2025年4月20日（日）午前7時集合\\n【場所】〇〇川 〇〇地点\\n【持ち物】軍手、タオル、飲み物\\n\\nご参加ください。', 'notice', 'admin'),
      ('会費徴収のお願い', '焼津市 集合住宅「グリーンピア」の皆様へ\\n\\n本年度の会費徴収を開始いたします。\\n\\n【金額】月額 5,000円\\n【納期】毎月末日\\n【納入先】組長まで\\n\\nよろしくお願いいたします。', 'notice', 'admin'),
      ('定期総会の開催通知', '焼津市 集合住宅「グリーンピア」の皆様へ\\n\\n定期総会を下記の日程で開催いたします。\\n\\n【日時】2025年5月15日（木）19時00分\\n【場所】集会室\\n【議題】予算承認、役員選出\\n\\nご参加ください。', 'notice', 'admin'),
      ('問い合わせ回答テンプレ', '〇〇様へ\\n\\nいつもお世話になっております。\\n\\nご質問ありがとうございます。\\n\\n【ご質問】\\n〇〇について\\n\\n【回答】\\n〇〇です。\\n\\nご不明な点がございましたら、お気軽にお問い合わせください。', 'response', 'admin')
    `);

    // 7. Rules（ルール）
    console.log("📋 Seeding rules...");
    await connection.query(`
      INSERT IGNORE INTO rules (title, details, status, category, version) VALUES
      ('会費徴収ルール', '月額5,000円を毎月末日までに組長に納入する。\\n\\n【納入方法】\\n- 現金：組長に直接\\n- 銀行振込：指定口座へ\\n\\n【免除条件】\\n- 生活保護受給者\\n- 失業中で収入がない者\\n- 医療費が月額50,000円以上の者', 'decided', 'finance', 1),
      ('ローテーション制度', '組長は毎年交代する。\\n\\n【選定方法】\\n1. 前回担当からの経過年数\\n2. 入居開始が古い\\n3. 住戸ID昇順\\n\\n【条件付き確定】\\n- 在籍していれば確定', 'pending', 'management', 1),
      ('出不足金の扱い', '河川清掃などの行事に不参加の場合、出不足金を徴収する。\\n\\n【金額】\\n- 河川清掃：1,000円/回\\n- 定期総会：500円/回\\n\\n【免除条件】\\n- 病気・怪我\\n- 仕事の都合\\n- 介護・育児', 'pending', 'finance', 1)
    `);

    // 8. FAQ（よくある質問）
    console.log("❓ Seeding FAQ...");
    await connection.query(`
      INSERT IGNORE INTO faq (question, answer, category, relatedLinks) VALUES
      ('会費の納入方法は？', '月額5,000円を毎月末日までに組長に納入してください。現金または銀行振込で対応しています。', 'finance', '["会費徴収ルール"]'),
      ('河川清掃に参加できない場合は？', '事前に組長にご連絡ください。やむを得ない理由がある場合は出不足金の免除対象になる可能性があります。', 'event', '["出不足金の扱い"]'),
      ('ローテーション制度について教えてください', '組長は毎年交代します。選定方法は前回担当からの経過年数、入居開始日、住戸ID昇順で決定されます。', 'management', '["ローテーション制度"]'),
      ('会費の免除申請はどうするのか？', '組長に申請書を提出してください。生活保護受給者、失業中、医療費が月額50,000円以上の方が対象です。', 'finance', '["会費徴収ルール"]'),
      ('倉庫の鍵はどこにあるのか？', '倉庫の鍵は組長が管理しています。使用する際は組長にご連絡ください。', 'facility', '[]')
    `);

    // 9. Posts（年度ログ）
    console.log("📝 Seeding posts...");
    await connection.query(`
      INSERT IGNORE INTO posts (title, body, category, status, year, authorId, authorRole, tags, isHypothesis, publishedAt) VALUES
      ('河川清掃SOP v2 公開', '河川清掃の標準手順書を更新しました。準備→当日→片付けの流れを詳細に記載しています。', 'decision', 'published', 2025, 1, 'admin', '["河川清掃", "SOP"]', 0, NOW()),
      ('会費ルール更新', '会費徴収ルールを改定しました。免除条件を明確化し、申請手続きを簡素化しています。', 'decision', 'published', 2025, 1, 'admin', '["会費", "ルール"]', 0, NOW()),
      ('先9年ローテを確定', '2025年から2033年までの組長ローテーションを確定しました。', 'decision', 'published', 2025, 1, 'admin', '["ローテーション"]', 0, NOW()),
      ('免除条件の条文化について（仮説）', '免除申請の条件をより明確にする必要があります。生活保護、失業、医療費の基準を検討中です。', 'pending', 'published', 2025, 1, 'admin', '["免除", "ルール"]', 1, NOW()),
      ('過去担当履歴の穴（仮説）', '2010年～2015年の組長記録が不完全です。確認が必要です。', 'trouble', 'published', 2025, 1, 'admin', '["ローテーション", "記録"]', 1, NOW())
    `);

    // 10. Changelog（変更履歴）
    console.log("🔄 Seeding changelog...");
    await connection.query(`
      INSERT IGNORE INTO changelog (summary, authorRole, relatedEntityType, relatedEntityId) VALUES
      ('先9年ローテを確定', 'admin', 'leader_schedule', 1),
      ('会費ルール更新', 'admin', 'rule', 1),
      ('河川清掃SOP v2 公開', 'admin', 'post', 1),
      ('免除条件の条文化について（仮説）', 'admin', 'post', 4),
      ('過去担当履歴の穴（仮説）', 'admin', 'post', 5)
    `);

    // 11. Pending Queue（返信待ちキュー）
    console.log("⏳ Seeding pending queue...");
    await connection.query(`
      INSERT IGNORE INTO pending_queue (title, toWhom, status, priority, createdAt) VALUES
      ('河川清掃の実施日程確認', '管理会社', 'pending', 1, NOW()),
      ('会費納入口座の確認', '町内会', 'pending', 2, NOW()),
      ('倉庫の鍵交換について', '管理会社', 'pending', 3, NOW())
    `);

    // 12. Handover Bag Items（引き継ぎ袋チェックリスト）
    console.log("🎒 Seeding handover bag items...");
    await connection.query(`
      INSERT IGNORE INTO handover_bag_items (name, description, location, isChecked) VALUES
      ('組長引き継ぎ手帳', '過去の記録と決定事項をまとめたもの', '倉庫E-1', 1),
      ('倉庫の鍵', '倉庫A、B、C、Dの鍵', '倉庫E-1', 1),
      ('会費徴収記録', '過去3年分の会費徴収記録', '倉庫E-1', 1),
      ('ローテーション表', '過去10年と今後9年のローテーション表', '倉庫E-1', 1),
      ('ルール・決定事項ファイル', 'A4ファイルに綴じたもの', '倉庫E-1', 1)
    `);

    // 13. Secret Notes（秘匿メモ）
    console.log("🔐 Seeding secret notes...");
    await connection.query(`
      INSERT IGNORE INTO secret_notes (title, body) VALUES
      ('103番の事情', '103番は医療費が高いため、会費免除対象。毎年確認が必要。'),
      ('105番の連絡先', '105番は高齢のため、連絡は午前中が良い。'),
      ('過去の問題記録', '2020年に会費未納があった住戸：106番、108番。現在は解決済み。')
    `);

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
